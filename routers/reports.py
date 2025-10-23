# ===============================================================
# 📁 endpoints/reports.py
# ===============================================================
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlmodel import select, func
from core.database import Session,get_session
from models.actions_devices import ActionDevice
from models.devices import Device
from schemas.reports_schema import ReportResponse, ReportData
from datetime import datetime
from typing import List, Dict, Any
import math

router = APIRouter(prefix="/reports", tags=["Reports"])

# ===============================================================
# 📊 GET /reports/ → Generar reporte con filtros, resumen y paginación
# ===============================================================
@router.get("/", response_model=ReportResponse)
def generate_report(
    session: Session = Depends(get_session),
    device_id: int | None = Query(None, description="Filtrar por ID de dispositivo"),
    device_type: str | None = Query(None, description="Filtrar por tipo de dispositivo"),
    start_date: datetime | None = Query(None, description="Fecha inicial (YYYY-MM-DD)"),
    end_date: datetime | None = Query(None, description="Fecha final (YYYY-MM-DD)"),
    executed: bool | None = Query(None, description="Filtrar por acciones ejecutadas o no"),
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(10, ge=1, le=100, description="Límite de resultados por página"),
):
    """
    Genera un reporte con filtros de dispositivo, tipo, fechas y estado.
    Incluye resumen general por tipo de dispositivo y paginación.
    """
    # ==============================
    # 🔍 Construcción de la consulta
    # ==============================
    query = select(ActionDevice)

    if device_id:
        query = query.where(ActionDevice.device_id == device_id)
    if executed is not None:
        query = query.where(ActionDevice.executed == executed)
    if start_date and end_date:
        query = query.where(ActionDevice.created_at.between(start_date, end_date))

    # ==============================
    # 📦 Conteo total y paginación
    # ==============================
    total = session.exec(select(func.count()).select_from(query.subquery())).one()
    pages = max(1, math.ceil(total / limit))
    results = session.exec(query.offset((page - 1) * limit).limit(limit)).all()

    if not results:
        raise HTTPException(status_code=404, detail="No se encontraron datos con esos filtros")

    # ==============================
    # 📊 Construcción de items
    # ==============================
    items: List[ReportData] = []
    for r in results:
        device = session.exec(select(Device).where(Device.id == r.device_id)).first()

        items.append(
            ReportData(
                device_id=r.device_id,
                device_name=device.name if device else "Desconocido",
                device_type=device.device_type if device else "N/A",
                total_actions=1,
                executed=1 if r.executed else 0,
                pending=0 if r.executed else 1,
                last_action=r.created_at,
            )
        )

    # ==============================
    # 📈 Resumen global por tipo
    # ==============================
    summary_rows = session.exec(
        select(Device.device_type, func.count(ActionDevice.id))
        .join(Device, Device.id == ActionDevice.device_id)
        .group_by(Device.device_type)
    ).all()

    summary: Dict[str, int] = {row[0]: row[1] for row in summary_rows}

    # ==============================
    # 🧾 Estructura final del reporte
    # ==============================
    return ReportResponse(
        total=total,
        page=page,
        pages=pages,
        items=items,
        summary=summary,
    )
