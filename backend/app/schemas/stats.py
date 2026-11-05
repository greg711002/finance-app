from typing import List

from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_balance: float
    total_income: float
    total_expense: float
    recent_transactions: List[dict] = []
    expenses_by_category: List[dict] = []
    income_by_category: List[dict] = []


class CategoryStats(BaseModel):
    category_id: int
    category_name: str
    category_color: str
    category_icon: str
    total: float
    count: int


class PeriodStats(BaseModel):
    date: str
    income: float
    expense: float
