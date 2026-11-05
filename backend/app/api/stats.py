from datetime import datetime, time, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.category import Category, CategoryType
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.stats import CategoryStats, DashboardStats, PeriodStats

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    # Разбивка по категориям и последние транзакции — за текущий месяц.
    start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

    total_income_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0))
        .join(Category, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == current_user.id,
            Category.type == CategoryType.INCOME,
        )
    )
    total_income = float(total_income_result.scalar() or 0)

    total_expense_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0))
        .join(Category, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == current_user.id,
            Category.type == CategoryType.EXPENSE,
        )
    )
    total_expense = float(total_expense_result.scalar() or 0)

    # Общий баланс считается за всё время (по всем транзакциям с категорией).
    total_balance = total_income - total_expense

    recent_result = await db.execute(
        select(
            Transaction,
            Category.name.label("category_name"),
            Category.color.label("category_color"),
            Category.icon.label("category_icon"),
            Category.type.label("category_type"),
        )
        .outerjoin(Category, Transaction.category_id == Category.id)
        .where(Transaction.user_id == current_user.id)
        .order_by(desc(Transaction.date), desc(Transaction.id))
        .limit(5)
    )
    recent_transactions = []
    for row in recent_result.all():
        t = row[0]
        recent_transactions.append(
            {
                "id": t.id,
                "amount": float(t.amount),
                "description": t.description,
                "date": t.date.isoformat(),
                "category_name": row.category_name,
                "category_color": row.category_color,
                "category_icon": row.category_icon,
                "type": row.category_type.value if row.category_type is not None else None,
            }
        )

    expenses_by_category_result = await db.execute(
        select(
            Category.id,
            Category.name,
            Category.color,
            Category.icon,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_of_month,
            Category.type == CategoryType.EXPENSE,
        )
        .group_by(Category.id, Category.name, Category.color, Category.icon)
        .order_by(desc("total"))
    )
    expenses_by_category = [
        {
            "id": row.id,
            "name": row.name,
            "color": row.color,
            "icon": row.icon,
            "value": float(row.total),
        }
        for row in expenses_by_category_result.all()
    ]

    income_by_category_result = await db.execute(
        select(
            Category.id,
            Category.name,
            Category.color,
            Category.icon,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_of_month,
            Category.type == CategoryType.INCOME,
        )
        .group_by(Category.id, Category.name, Category.color, Category.icon)
        .order_by(desc("total"))
    )
    income_by_category = [
        {
            "id": row.id,
            "name": row.name,
            "color": row.color,
            "icon": row.icon,
            "value": float(row.total),
        }
        for row in income_by_category_result.all()
    ]

    return DashboardStats(
        total_balance=total_balance,
        total_income=total_income,
        total_expense=total_expense,
        recent_transactions=recent_transactions,
        expenses_by_category=expenses_by_category,
        income_by_category=income_by_category,
    )


@router.get("/by-category", response_model=List[CategoryStats])
async def get_stats_by_category(
    period: str = Query("month"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    if period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    elif period == "year":
        start_date = datetime(now.year, 1, 1, tzinfo=timezone.utc)
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Параметр period должен быть 'week', 'month' или 'year'",
        )

    result = await db.execute(
        select(
            Category.id,
            Category.name,
            Category.color,
            Category.icon,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_date,
        )
        .group_by(Category.id, Category.name, Category.color, Category.icon)
        .order_by(desc("total"))
    )

    return [
        CategoryStats(
            category_id=row.id,
            category_name=row.name,
            category_color=row.color,
            category_icon=row.icon,
            total=float(row.total),
            count=row.count,
        )
        for row in result.all()
    ]


@router.get("/by-period", response_model=List[PeriodStats])
async def get_stats_by_period(
    start: str = Query(...),
    end: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        start_date = datetime.strptime(start, "%Y-%m-%d").date()
        end_date = datetime.strptime(end, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Параметры start и end должны быть в формате YYYY-MM-DD",
        )

    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start не может быть позже end",
        )

    start_dt = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
    end_dt = datetime.combine(end_date, time.max, tzinfo=timezone.utc)

    rows = (
        await db.execute(
            select(
                func.date(Transaction.date).label("day"),
                Category.type.label("category_type"),
                func.coalesce(func.sum(Transaction.amount), 0).label("total"),
            )
            .join(Category, Transaction.category_id == Category.id)
            .where(
                Transaction.user_id == current_user.id,
                Transaction.date >= start_dt,
                Transaction.date <= end_dt,
            )
            .group_by(func.date(Transaction.date), Category.type)
        )
    ).all()

    by_day = {}
    for row in rows:
        day = row.day if isinstance(row.day, str) else row.day.isoformat()
        bucket = by_day.setdefault(day, {"income": 0.0, "expense": 0.0})
        if row.category_type == CategoryType.INCOME:
            bucket["income"] += float(row.total)
        elif row.category_type == CategoryType.EXPENSE:
            bucket["expense"] += float(row.total)

    result = []
    day_cursor = start_date
    while day_cursor <= end_date:
        d = day_cursor.isoformat()
        bucket = by_day.get(d, {"income": 0.0, "expense": 0.0})
        result.append(
            PeriodStats(date=d, income=bucket["income"], expense=bucket["expense"])
        )
        day_cursor += timedelta(days=1)

    return result
