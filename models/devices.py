from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime

class Device(SQLModel, table=True):
    __tablename__ = "devices"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=50)  # ✅ Longitud máxima
    status: str = Field(default="desconectado")
    direction: Optional[str] = Field(default=None, max_length=15)  
    created_at: datetime = Field(default_factory=datetime.utcnow)  
    updated_at: datetime = Field(default_factory=datetime.utcnow)  

    actions: List["ActionDevice"] = Relationship(back_populates="device")
    logs: List["Log"] = Relationship(back_populates="device")

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from models.actions_devices import ActionDevice
    from models.logs import Log