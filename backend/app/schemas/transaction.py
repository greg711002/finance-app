from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TransactionBase(BaseModel):
    amount: Decimal = Field(..., gt=0)
    description: Optional[str] = None
    date: datetime
    category_id: Optional[int] = None


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0)
    description: Optional[str] = None
    date: Optional[datetime] = None
    category_id: Optional[int] = None


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    amount: Decimal
    description: Optional[str] = None
    date: datetime
    category_id: Optional[int] = None
    created_at: datetime
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    category_icon: Optional[str] = None
    type: Optional[str] = None


class TransactionFilter(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    category_id: Optional[int] = None
    type: Optional[str] = None
    search: Optional[str] = None
    limit: int = Field(50, ge=1, le=100)
    offset: int = Field(0, ge=0)
