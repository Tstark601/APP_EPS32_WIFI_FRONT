# endpoints/logs.py
from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func
from typing import Optional, Dict, Any
from core.database import Session,get_session
from core.security import decode_token
from models.logs import Log
from models.devices import Device
from schemas.logs_schema import LogReadPaginated

router = APIRouter()

@router.get("/", response_model=LogReadPaginated)
def get_logs(
    session: Session = Depends(get_session),
    user=Depends(decode_token),
    id_device: Optional[int] = None,
    event: Optional[str] = None,
    id_action: Optional[int] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, le=100),
):
    query = select(Log)

    if id_device:
        query = query.where(Log.id_device == id_device)
    if event:
        query = query.where(Log.event == event)
    if status:
        query = query.where(Log.status == status)
    if id_action: 
        query = query.where(Log.id_action == id_action)

    total = session.exec(select(func.count()).select_from(query.subquery())).one()
    logs = session.exec(query.offset((page - 1) * limit).limit(limit)).all()

    # Contadores
    counts_by_device = session.exec(
        select(Device.name, func.count(Log.id))
        .join(Log, Log.id_device == Device.id)
        .group_by(Device.name)
    ).all()

    counts_by_status = session.exec(
        select(Log.status, func.count(Log.id)).group_by(Log.status)
    ).all()

    return LogReadPaginated(
        total=total,
        page=page,
        limit=limit,
        pages=(total // limit) + (1 if total % limit > 0 else 0),
        data=logs,
        counts_by_device=dict(counts_by_device),
        counts_by_status=dict(counts_by_status),
    )
