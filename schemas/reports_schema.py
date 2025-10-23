from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

# =====================================================
# 🔎 FILTROS PARA REPORTES
# =====================================================
class ReportFilterParams(BaseModel):
    device_id: Optional[int] = None
    device_type: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    state: Optional[str] = None
    page: int = 1
    limit: int = 10


# =====================================================
# 📄 RESULTADO DE REPORTE
# =====================================================
class ReportData(BaseModel):
    device_id: int
    device_type: str
    total_actions: int
    executed: int
    pending: int
    failed: int
    last_action: Optional[datetime]


# =====================================================
# 📦 RESPUESTA COMPLETA CON PAGINACIÓN
# =====================================================
class ReportResponse(BaseModel):
    total: int
    page: int
    pages: int
    items: List[ReportData]
    summary: Dict[str, Any]
