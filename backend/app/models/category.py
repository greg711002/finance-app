import enum

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Enum, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class CategoryType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_categories_user_name"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(100), nullable=False)
    icon = Column(String(50), default="wallet")
    color = Column(String(20), default="#2563eb")
    type = Column(Enum(CategoryType), nullable=False)
    is_system = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")
