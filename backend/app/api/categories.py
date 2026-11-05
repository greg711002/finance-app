from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=List[CategoryResponse])
async def get_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Пользовательские категории + потенциально глобальные (user_id IS NULL) системные.
    result = await db.execute(
        select(Category)
        .where((Category.user_id == current_user.id) | (Category.user_id.is_(None)))
        .order_by(Category.is_system.desc(), Category.name)
    )
    return result.scalars().all()


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dup = await db.execute(
        select(Category).where(
            Category.user_id == current_user.id,
            Category.name == category_data.name,
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Категория с таким именем уже существует",
        )

    category = Category(
        user_id=current_user.id,
        is_system=0,
        **category_data.model_dump(),
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == current_user.id,
            Category.is_system == 0,
        )
    )
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found or cannot be modified",
        )

    update_data = category_data.model_dump(exclude_unset=True)

    if "name" in update_data and update_data["name"] != category.name:
        dup = await db.execute(
            select(Category).where(
                Category.user_id == current_user.id,
                Category.name == update_data["name"],
                Category.id != category.id,
            )
        )
        if dup.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Категория с таким именем уже существует",
            )

    for field, value in update_data.items():
        setattr(category, field, value)

    await db.commit()
    await db.refresh(category)
    return category


@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == current_user.id,
            Category.is_system == 0,
        )
    )
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found or cannot be deleted",
        )

    tx_count = await db.execute(
        select(func.count(Transaction.id)).where(Transaction.category_id == category.id)
    )
    if tx_count.scalar() > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Нельзя удалить категорию, у которой есть транзакции",
        )

    await db.delete(category)
    await db.commit()

    return {"message": "Category deleted"}
