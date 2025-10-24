# endpoints/logs.py
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlmodel import select, func, or_
from typing import Optional, Dict, List, Any
from core.database import Session, get_session
from core.security import decode_token
from models.logs import Log
from models.devices import Device
from schemas.logs_schema import LogReadPaginated

router = APIRouter(prefix="/logs", tags=["Logs"])

# ===============================================================
# 📜 GET /logs/ → Listar Logs (PROTEGIDA, FILTROS, PAGINACIÓN, CONTEO)
# ===============================================================
@router.get("/", response_model=LogReadPaginated)
def get_logs(
    session: Session = Depends(get_session),
    user=Depends(decode_token),  # 🔒 Protección añadida/mantenida
    id_device: Optional[int] = None,
    # 📝 Filtro de evento por coincidencia parcial (LIKE)
    event_contains: Optional[str] = Query(None, description="Filtrar logs cuyo evento contenga esta cadena."),
    status: Optional[str] = None,
    id_action: Optional[int] = None,
    # 📝 Filtros de Paginación
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
):
    """
    Obtiene logs con filtros, paginación y recuentos por dispositivo, estado y tipo de acción.
    """
    
    # 1. CONSTRUCCIÓN DE LA CONSULTA BASE CON FILTROS
    query = select(Log)

    if id_device:
        query = query.where(Log.id_device == id_device)
    
    if event_contains:
        # Permite buscar parte del texto del evento (ej: 'MOTOR')
        query = query.where(Log.event.ilike(f"%{event_contains}%")) 
        
    if status:
        # Nota: Asumiendo que el campo 'status' existe en el modelo Log
        query = query.where(Log.status == status)
        
    if id_action: 
        # Nota: Asumiendo que el campo 'id_action' existe en el modelo Log
        query = query.where(Log.id_action == id_action)
    
    # 2. EJECUTAR CONSULTA PARA OBTENER TOTAL y DATOS PAGINADOS
    # Utilizamos .subquery() para el conteo total con filtros
    total_query = select(func.count()).select_from(query.subquery())
    total = session.exec(total_query).one()
    
    # Paginación
    offset = (page - 1) * limit
    logs = session.exec(query.offset(offset).limit(limit)).all()

    # Calcular el número total de páginas
    pages = (total // limit) + (1 if total % limit > 0 else 0)

    # 3. CONTEO DE METADATOS
    
    # 3.1. Conteo por Dispositivo (para todos los logs)
    counts_by_device = session.exec(
        select(Device.name, func.count(Log.id))
        .join(Log, Log.id_device == Device.id)
        .group_by(Device.name)
    ).all()

    # 3.2. Conteo por Estado (para todos los logs)
    counts_by_status = session.exec(
        select(Log.status, func.count(Log.id))
        .where(Log.status != None) # Asegurarse de que el status no sea None si es nullable
        .group_by(Log.status)
    ).all()

    # 3.3. Conteo por Tipo de Acción (para las acciones especificadas)
    # Filtramos logs que empiecen con "Acción '" y agrupamos por el contenido después de la comilla.
    # Ejemplo: "Acción 'MOTOR_IZQ' creada..." -> Agrupa por "MOTOR_IZQ"
    action_events = [
        "Acción 'MOTOR_IZQ' creada para dispositivo",
        "Acción 'MOTOR_DER' creada para dispositivo",
        "Acción 'LED_ON' creada para dispositivo",
        "Acción 'LED_OFF' creada para dispositivo",
        "Dispositivo confirmó ejecución de acción 'MOTOR_IZQ'",
        # Puedes añadir más aquí, pero me centraré en el nombre de la acción.
    ]

    # Usaremos una consulta que agrupa basándose en el nombre de la acción dentro del evento.
    # Esto es complejo en SQL, una aproximación más sencilla y robusta es filtrar por LIKE y agrupar por el texto completo.
    
    # Consulta para contar logs cuyo evento comienza con "Acción '"
    counts_by_action_type_raw = session.exec(
        select(
            Log.event, 
            func.count(Log.id)
        )
        .where(
            or_(
                Log.event.ilike("Acción '% creada para dispositivo %"),
                Log.event.ilike("Dispositivo confirmó ejecución de acción '%'")
            )
        )
        .group_by(Log.event)
        # Limitamos la consulta solo a los eventos más comunes para no saturar
        .limit(20) 
    ).all()
    
    # Post-procesamiento para limpiar el nombre del evento y obtener solo la acción
    counts_by_action_type: Dict[str, int] = {}
    
    for event_text, count in counts_by_action_type_raw:
        action_name = ""
        if "Acción '" in event_text:
            # Extrae 'MOTOR_IZQ' de "Acción 'MOTOR_IZQ' creada..."
            try:
                start = event_text.find("Acción '") + len("Acción '")
                end = event_text.find("'", start)
                action_name = event_text[start:end]
            except:
                action_name = event_text # Fallback
        elif "Dispositivo confirmó ejecución de acción '" in event_text:
            # Extrae 'MOTOR_IZQ' de "Dispositivo confirmó ejecución de acción 'MOTOR_IZQ'"
            try:
                start = event_text.find("acción '") + len("acción '")
                end = event_text.find("'", start)
                action_name = f"{event_text[start:end]} (Confirmado)"
            except:
                action_name = event_text # Fallback

        if action_name:
             counts_by_action_type[action_name] = counts_by_action_type.get(action_name, 0) + count
        else:
             counts_by_action_type[event_text] = counts_by_action_type.get(event_text, 0) + count


    # 4. DEVOLVER RESPUESTA PAGINADA
    return LogReadPaginated(
        total=total,
        page=page,
        limit=limit,
        pages=pages,
        data=logs,
        counts_by_device=dict(counts_by_device),
        counts_by_status=dict(counts_by_status),
        # 📝 Nuevo campo de conteo
        counts_by_action_type=counts_by_action_type, 
    )