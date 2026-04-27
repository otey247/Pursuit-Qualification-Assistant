import uuid
from datetime import datetime, timezone
from typing import Literal

from pydantic import EmailStr
from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore[assignment]
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore[assignment]


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


# Pursuit Qualification Assistant models


class PursuitAssessment(SQLModel):
    opportunity_name: str = Field(min_length=1, max_length=255)
    relationship_strength: int = Field(
        ge=1,
        le=5,
        description=(
            "How strong is the relationship with the client? "
            "(1=None, 5=Strong advocate)"
        ),
    )
    fit: int = Field(
        ge=1,
        le=5,
        description=(
            "How well does this opportunity fit our capabilities? "
            "(1=Poor fit, 5=Perfect fit)"
        ),
    )
    timing: int = Field(
        ge=1,
        le=5,
        description=(
            "Is the timing right for us to pursue this? (1=Very poor, 5=Ideal timing)"
        ),
    )
    budget_realism: int = Field(
        ge=1,
        le=5,
        description=(
            "Is the budget realistic for the scope? "
            "(1=Severely underfunded, 5=Well-funded)"
        ),
    )
    competitive_position: int = Field(
        ge=1,
        le=5,
        description=(
            "How strong is our competitive position? "
            "(1=Major disadvantage, 5=Clear frontrunner)"
        ),
    )
    delivery_risk: int = Field(
        ge=1,
        le=5,
        description=(
            "How manageable is the delivery risk? (1=Very high risk, 5=Low risk)"
        ),
    )
    differentiators: int = Field(
        ge=1,
        le=5,
        description=(
            "How strong are our differentiators for this opportunity? "
            "(1=None, 5=Unique and compelling)"
        ),
    )
    notes: str | None = Field(default=None, max_length=2000)


class PursuitDimensionScore(SQLModel):
    label: str
    score: int
    max_score: int = 5
    rationale: str


class PursuitRecommendation(SQLModel):
    opportunity_name: str
    recommendation: Literal["Pursue", "Shape", "Walk Away"]
    overall_score: float
    summary: str
    dimensions: list[PursuitDimensionScore]
    actions: list[str]
