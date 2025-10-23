from datetime import datetime
from typing import Optional
from sqlmodel import Relationship, SQLModel, Field

class Log(SQLModel, table=True):
    __tablename__ = "logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    event: str = Field(max_length=255)
    
    # Claves Foráneas
    id_device: int = Field(foreign_key="devices.id")
    id_user: int = Field(foreign_key="users.id")
    id_action: Optional[int] = Field(default=None, foreign_key="actions_devices.id")

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Relaciones Bidireccionales
    device: "Device" = Relationship(back_populates="logs")
    user: "User" = Relationship(back_populates="logs")
    action_device: Optional["ActionDevice"] = Relationship(back_populates="logs") 

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from models.devices import Device
    from models.users import User
    from models.actions_devices import ActionDevice