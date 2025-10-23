from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship
from pydantic import EmailStr as Email

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    username: str = Field(unique=True)
    password: str
    email: Email = Field(unique=True)
    status: bool = Field(default=True)
    deleted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_connection: Optional[datetime] = None

    tokens: List["Token"] = Relationship(back_populates="user")
    logs: List["Log"] = Relationship(back_populates="user")

if TYPE_CHECKING:
    from models.tokens import Token
    from models.logs import Log
