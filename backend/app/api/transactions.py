import csv
import io
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.category import Category, CategoryType
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import TransactionCreate, TransactionResponse, TransactionUpdate

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _parse_date_param(value: str) -> datetime:
    """Разбор ISO-даты/дата-времени. Неверный формат -> 422, naive -> UTC."""
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Неверный формат даты (ожидается ISO)",
        )
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


async def _get_owned_category(
    db: AsyncSession, category_id: Optional[int], user_id: int
) -> Optional[Category]:
    """Категория, принадлежащая юзеру либо системная (user_id IS NULL)."""
    if category_id is None:
        return None
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            (Category.user_id == user_id) | (Category.user_id.is_(None)),
        )
    )
    return result.scalar_one_or_none()


def _build_response(t: Transaction, category: Optional[Category]) -> TransactionResponse:
    return TransactionResponse(
        id=t.id,
        user_id=t.user_id,
        amount=t.amount,
        description=t.description,
        date=t.date,
        category_id=t.category_id,
        created_at=t.created_at,
        category_name=category.name if category else None,
        category_color=category.color if category else None,
        category_icon=category.icon if category else None,
        type=category.type.value if category and category.type is not None else None,
    )


def _build_conditions(
    current_user: User,
    start_date: Optional[str],
    end_date: Optional[str],
    category_id: Optional[int],
    transaction_type: Optional[str],
    search: Optional[str],
):
    conditions = [Transaction.user_id == current_user.id]

    if start_date:
        conditions.append(Transaction.date >= _parse_date_param(start_date))
    if end_date:
        conditions.append(Transaction.date <= _parse_date_param(end_date))
    if category_id:
        conditions.append(Transaction.category_id == category_id)
    if search:
        conditions.append(Transaction.description.ilike(f"%{search}%"))
    if transaction_type:
        if transaction_type == "income":
            conditions.append(Category.type == CategoryType.INCOME)
        elif transaction_type == "expense":
            conditions.append(Category.type == CategoryType.EXPENSE)
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Параметр type должен быть 'income' или 'expense'",
            )
    return conditions


@router.get("", response_model=List[TransactionResponse])
async def get_transactions(
    response: Response,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    transaction_type: Optional[str] = Query(None, alias="type"),
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conditions = _build_conditions(
        current_user, start_date, end_date, category_id, transaction_type, search
    )

    total = await db.scalar(
        select(func.count())
        .select_from(Transaction)
        .outerjoin(Category, Transaction.category_id == Category.id)
        .where(*conditions)
    )
    response.headers["X-Total-Count"] = str(total or 0)

    stmt = (
        select(
            Transaction,
            Category.name.label("category_name"),
            Category.color.label("category_color"),
            Category.icon.label("category_icon"),
            Category.type.label("category_type"),
        )
        .outerjoin(Category, Transaction.category_id == Category.id)
        .where(*conditions)
        .order_by(desc(Transaction.date), desc(Transaction.id))
        .offset(offset)
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()

    transactions = []
    for row in rows:
        t = row[0]
        transactions.append(
            TransactionResponse(
                id=t.id,
                user_id=t.user_id,
                amount=t.amount,
                description=t.description,
                date=t.date,
                category_id=t.category_id,
                created_at=t.created_at,
                category_name=row.category_name,
                category_color=row.category_color,
                category_icon=row.category_icon,
                type=row.category_type.value if row.category_type is not None else None,
            )
        )
    return transactions


@router.get("/export")
async def export_transactions(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    transaction_type: Optional[str] = Query(None, alias="type"),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conditions = _build_conditions(
        current_user, start_date, end_date, category_id, transaction_type, search
    )

    stmt = (
        select(
            Transaction,
            Category.name.label("category_name"),
            Category.type.label("category_type"),
        )
        .outerjoin(Category, Transaction.category_id == Category.id)
        .where(*conditions)
        .order_by(desc(Transaction.date), desc(Transaction.id))
    )
    rows = (await db.execute(stmt)).all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["date", "type", "amount", "category", "description"])
    for row in rows:
        t = row[0]
        category_type = row.category_type
        writer.writerow(
            [
                t.date.date().isoformat() if t.date is not None else "",
                category_type.value if category_type is not None else "",
                str(t.amount),
                row.category_name or "",
                t.description or "",
            ]
        )
    content = buf.getvalue()
    buf.close()

    return Response(
        # BOM ﻿ — чтобы Excel корректно распознал UTF-8.
        content=chr(0xFEFF) + content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="transactions.csv"'},
    )


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction_data: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if transaction_data.category_id is not None:
        category = await _get_owned_category(
            db, transaction_data.category_id, current_user.id
        )
        if category is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Категория не найдена или не принадлежит вам",
            )

    transaction = Transaction(
        user_id=current_user.id,
        **transaction_data.model_dump(),
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    category = await _get_owned_category(
        db, transaction.category_id, current_user.id
    )
    return _build_response(transaction, category)


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(
            Transaction,
            Category.name.label("category_name"),
            Category.color.label("category_color"),
            Category.icon.label("category_icon"),
            Category.type.label("category_type"),
        )
        .outerjoin(Category, Transaction.category_id == Category.id)
        .where(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
    )
    row = result.first()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    t = row[0]
    return TransactionResponse(
        id=t.id,
        user_id=t.user_id,
        amount=t.amount,
        description=t.description,
        date=t.date,
        category_id=t.category_id,
        created_at=t.created_at,
        category_name=row.category_name,
        category_color=row.category_color,
        category_icon=row.category_icon,
        type=row.category_type.value if row.category_type is not None else None,
    )


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: int,
    transaction_data: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id, Transaction.user_id == current_user.id
        )
    )
    transaction = result.scalar_one_or_none()

    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    update_data = transaction_data.model_dump(exclude_unset=True)

    if "category_id" in update_data and update_data["category_id"] is not None:
        category = await _get_owned_category(
            db, update_data["category_id"], current_user.id
        )
        if category is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Категория не найдена или не принадлежит вам",
            )

    for field, value in update_data.items():
        setattr(transaction, field, value)

    await db.commit()
    await db.refresh(transaction)

    category = await _get_owned_category(
        db, transaction.category_id, current_user.id
    )
    return _build_response(transaction, category)


@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id, Transaction.user_id == current_user.id
        )
    )
    transaction = result.scalar_one_or_none()

    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    await db.delete(transaction)
    await db.commit()

    return {"message": "Transaction deleted"}
