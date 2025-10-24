from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel

# =====================================================
# 🧱 BASE
# =====================================================
class LogBase(BaseModel):
    id_device: int  # ✅ Corregir: era "id_devices"
    id_user: int
    id_action: Optional[int] = None  # ✅ Ya está bien
    event: str
    status: Optional[str] = None  # ✅ Hacer opcional si no siempre se usa

# =====================================================
# 🆕 CREATE
# =====================================================
class LogCreate(LogBase):
    pass

# =====================================================
# 📖 READ
# =====================================================
class LogRead(LogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
# =====================================================
# 🔎 FILTROS Y PAGINACIÓN
# =====================================================
class LogFilterParams(BaseModel):
    id_devices: Optional[int] = None
    id_action: Optional[int] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    page: int = 1
    limit: int = 10

# =====================================================
# 📊 PAGINACIÓN
# =====================================================
class LogReadPaginated(BaseModel):
    """Esquema para devolver una lista de logs paginada con metadata."""
    total: int
    page: int
    limit: int
    pages: int
    data: List[LogRead]  # Asegúrate de usar LogRead aquí
    counts_by_device: Dict[str, int]
    counts_by_status: Dict[str, int]
    # 📝 Nuevo campo añadido para el recuento de eventos de acción
    counts_by_action_type: Dict[str, int] 
    
    class Config:
        from_attributes = True