from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.category import CategoryType


class CategoryBase(BaseModel):
    name: str
    icon: str = "wallet"
    color: str = "#2563eb"
    type: CategoryType


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    type: Optional[CategoryType] = None


class CategoryResponse(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    is_system: int = 0
    created_at: datetime
