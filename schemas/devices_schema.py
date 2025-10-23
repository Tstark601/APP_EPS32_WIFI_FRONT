from datetime import datetime
from typing import Optional
from pydantic import BaseModel

# =====================================================
# 🧱 BASE
# =====================================================
class DeviceBase(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    status: Optional[str] = "offline"


# =====================================================
# 🆕 CREATE
# =====================================================
class DeviceCreate(DeviceBase):
    pass


# =====================================================
# ✏️ UPDATE
# =====================================================
class DeviceUpdate(BaseModel):
    name: Optional[str]
    type: Optional[str]
    description: Optional[str]
    status: Optional[str]


# =====================================================
# 📖 READ
# =====================================================
class DeviceRead(DeviceBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
