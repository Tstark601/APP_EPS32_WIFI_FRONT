from typing import Optional
from pydantic import BaseModel
from datetime import datetime


# 📦 Crear una acción (crear comando, por ejemplo)
class ActionDeviceCreate(BaseModel):
    device_id: int
    action_name: str
    command: str
    description: Optional[str] = None
    created_by: Optional[int] = None


# 📖 Leer una acción registrada
class ActionDeviceRead(BaseModel):
    id: int
    device_id: int
    action_name: str
    command: str
    description: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True  # ✅ Pydantic v2 compatible


# ✏️ Actualizar una acción existente
class ActionDeviceUpdate(BaseModel):
    action_name: Optional[str] = None
    command: Optional[str] = None
    description: Optional[str] = None
    updated_by: Optional[int] = None

    class Config:
        from_attributes = True


# 📊 Esquema de respuesta extendida (por ejemplo, en reportes)
class ActionDeviceReport(BaseModel):
    device_id: int
    total_actions: int
    executed: int
    pending: int
    failed: int

    class Config:
        from_attributes = True
