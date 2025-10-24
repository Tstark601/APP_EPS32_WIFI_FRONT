from typing import Optional
from pydantic import BaseModel
from datetime import datetime


# 📦 Crear una acción (crear comando, por ejemplo)
class ActionDeviceCreate(BaseModel):
    id_device: int
    action: str
    description: Optional[str] = None
    created_by: Optional[int] = None


# 📖 Leer una acción registrada (CORREGIDO)
class ActionDeviceRead(BaseModel):
    id: int
    id_device: int
    action: str
    executed: bool  # ✅ Agregar este campo que falta
    created_at: datetime

    class Config:
        from_attributes = True


# ✏️ Actualizar una acción existente (CORREGIDO)
class ActionDeviceUpdate(BaseModel):
    executed: Optional[bool] = None  # ✅ Agregar este campo que falta

    class Config:
        from_attributes = True


# 📊 Esquema de respuesta extendida (por ejemplo, en reportes)
class ActionDeviceReport(BaseModel):
    id_device: int
    total_actions: int
    executed: int
    pending: int
    failed: int

    class Config:
        from_attributes = True
