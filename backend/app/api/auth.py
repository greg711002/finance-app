import hashlib
import secrets
import time

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from app.models.category import Category, CategoryType
from app.models.user import User
from app.schemas.user import Token, TokenRefresh, UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory store for reset tokens (use Redis/DB in production).
# {token_hash: {"user_id": int, "expires_at": float}}
RESET_TOKENS = {}
RESET_TOKEN_TTL_SECONDS = 3600


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)


def _cleanup_reset_tokens() -> None:
    """Remove expired reset tokens so the in-memory dict never grows forever."""
    now = time.time()
    for h in [h for h, d in RESET_TOKENS.items() if d["expires_at"] <= now]:
        RESET_TOKENS.pop(h, None)


DEFAULT_CATEGORIES = [
    {"name": "Зарплата", "icon": "briefcase", "color": "#10b981", "type": CategoryType.INCOME},
    {"name": "Фриланс", "icon": "laptop", "color": "#6366f1", "type": CategoryType.INCOME},
    {"name": "Инвестиции", "icon": "trending-up", "color": "#8b5cf6", "type": CategoryType.INCOME},
    {"name": "Продукты", "icon": "shopping-cart", "color": "#f59e0b", "type": CategoryType.EXPENSE},
    {"name": "Транспорт", "icon": "car", "color": "#ef4444", "type": CategoryType.EXPENSE},
    {"name": "Жильё", "icon": "home", "color": "#3b82f6", "type": CategoryType.EXPENSE},
    {"name": "Развлечения", "icon": "film", "color": "#ec4899", "type": CategoryType.EXPENSE},
    {"name": "Здоровье", "icon": "heart", "color": "#14b8a6", "type": CategoryType.EXPENSE},
    {"name": "Одежда", "icon": "shirt", "color": "#f97316", "type": CategoryType.EXPENSE},
    {"name": "Образование", "icon": "book", "color": "#06b6d4", "type": CategoryType.EXPENSE},
]


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(
    request: Request,
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    email = user_data.email.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=email,
        password_hash=get_password_hash(user_data.password),
        name=user_data.name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    for cat_data in DEFAULT_CATEGORIES:
        db.add(Category(user_id=user.id, is_system=1, **cat_data))
    await db.commit()

    return user


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    email = form_data.username.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: TokenRefresh,
    db: AsyncSession = Depends(get_db),
):
    payload = decode_token(token_data.refresh_token)

    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    try:
        user_id = int(sub)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return Token(access_token=access_token, refresh_token=refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/password-reset")
@limiter.limit("5/minute")
async def request_password_reset(
    request: Request,
    data: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
):
    _cleanup_reset_tokens()

    email = data.email.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    generic_message = {
        "message": "Если email зарегистрирован, ссылка для сброса пароля будет отправлена"
    }

    if not user:
        # Не раскрываем, существует ли такой email.
        return generic_message

    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    RESET_TOKENS[token_hash] = {
        "user_id": user.id,
        "expires_at": time.time() + RESET_TOKEN_TTL_SECONDS,
    }

    reset_url = f"{settings.RESET_PASSWORD_URL}?token={token}"
    # В проде — отправлять по email; здесь логируем ссылку в консоль приложения.
    # НИКОГДА не возвращать token/reset_url в теле ответа.
    print(f"[password-reset] reset_url for user_id={user.id}: {reset_url}")

    return generic_message


@router.post("/password-reset/confirm")
@limiter.limit("5/minute")
async def confirm_password_reset(
    request: Request,
    data: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db),
):
    _cleanup_reset_tokens()

    token_hash = hashlib.sha256(data.token.encode()).hexdigest()
    token_data = RESET_TOKENS.get(token_hash)

    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недействительный токен",
        )

    if time.time() > token_data["expires_at"]:
        RESET_TOKENS.pop(token_hash, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Токен истёк",
        )

    result = await db.execute(select(User).where(User.id == token_data["user_id"]))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )

    user.password_hash = get_password_hash(data.new_password)
    await db.commit()

    RESET_TOKENS.pop(token_hash, None)

    return {"message": "Пароль успешно изменён"}
