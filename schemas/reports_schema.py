# schemas/reports_schema.py
from datetime import datetime
from typing import Optional, Dict, List, Any
from pydantic import BaseModel

# ===============================================================
# 📊 Estadísticas de Acciones
# ===============================================================
class ActionStatsResponse(BaseModel):
    total_actions: int
    action_counts: Dict[str, int]  # {"MOTOR_STOP": 5, "MOTOR_IZQ": 3, ...}
    period: str
    device_id: Optional[int] = None

    class Config:
        from_attributes = True

# ===============================================================
# 📋 Logs Detallados
# ===============================================================
class LogEntry(BaseModel):
    id: int
    timestamp: datetime
    event: str
    action_type: Optional[str]
    event_category: str
    username: str
    device_name: str
    id_device: int
    id_user: int
    id_action: Optional[int]

    class Config:
        from_attributes = True

class LogsReportResponse(BaseModel):
    logs: List[LogEntry]
    total: int
    page: int
    limit: int
    pages: int
    filters: Dict[str, Any]

    class Config:
        from_attributes = True

# ===============================================================
# 📄 Exportación a PDF
# ===============================================================
class LogsExportRequest(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    device_id: Optional[int] = None
    user_id: Optional[int] = None
    action_type: Optional[str] = None
    event_type: Optional[str] = None
    limit: Optional[int] = 1000

    class Config:
        from_attributes = True