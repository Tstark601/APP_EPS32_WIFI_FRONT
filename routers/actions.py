# ===============================================================
# 📁 endpoints/actions_devices.py
# ===============================================================
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from datetime import datetime
from core.database import Session,get_session
from core.security import decode_token
from core.websocket_manager import websocket_manager as manager
from models.actions_devices import ActionDevice
from models.devices import Device
from models.logs import Log
from schemas.actions_schema import ActionDeviceCreate, ActionDeviceRead, ActionDeviceUpdate

router = APIRouter(prefix="/actions", tags=["Actions Devices"])

# ===============================================================
# 📥 POST /actions/ → Crear nueva acción
# ===============================================================
@router.post("/", response_model=ActionDeviceRead)
async def create_action(
    data: ActionDeviceCreate,
    session: Session = Depends(get_session),
    user=Depends(decode_token),
):
    """Crea una acción para un dispositivo específico."""
    # Validar dispositivo existente
    device = session.exec(select(Device).where(Device.id == data.device_id)).first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")

    # Crear nueva acción
    new_action = ActionDevice(
        device_id=data.device_id,
        action_type=data.action_type,
        executed=False,
        created_at=datetime.utcnow(),
    )
    session.add(new_action)
    session.commit()
    session.refresh(new_action)

    # Enviar al WebSocket
    payload = {
        "event": "new_action",
        "action_id": new_action.id,
        "device_id": new_action.device_id,
        "action_type": new_action.action_type,
        "timestamp": new_action.created_at.isoformat(),
    }
    await manager.broadcast(new_action.device_id, payload)

    # Crear log
    log = Log(
        device_id=data.device_id,
        action_type=data.action_type,
        status="pendiente",
        message=f"Acción '{data.action_type}' enviada al dispositivo '{device.name}'",
        created_at=datetime.utcnow(),
    )
    session.add(log)
    session.commit()

    return new_action

# ===============================================================
# 🔄 PUT /actions/{action_id} → Actualizar estado de acción
# ===============================================================
@router.put("/{action_id}", response_model=ActionDeviceRead)
async def update_action_status(
    action_id: int,
    update: ActionDeviceUpdate,
    session: Session = Depends(get_session),
    user=Depends(decode_token),
):
    """Actualiza el estado (ejecutada o revertida) de una acción."""
    action = session.exec(select(ActionDevice).where(ActionDevice.id == action_id)).first()
    if not action:
        raise HTTPException(status_code=404, detail="Acción no encontrada")

    action.executed = update.executed
    action.updated_at = datetime.utcnow()
    session.add(action)

    log_message = "Acción ejecutada correctamente" if update.executed else "Acción revertida"
    log_status = "ejecutada" if update.executed else "cancelada"

    log = Log(
        device_id=action.device_id,
        action_type=action.action_type,
        status=log_status,
        message=log_message,
        created_at=datetime.utcnow(),
    )
    session.add(log)
    session.commit()
    session.refresh(action)

    # Notificar por WebSocket
    payload = {
        "event": "update_action",
        "action_id": action.id,
        "device_id": action.device_id,
        "status": log_status,
    }
    await manager.broadcast(action.device_id, payload)

    return action

# ===============================================================
# 📜 GET /actions/ → Listar todas las acciones
# ===============================================================
@router.get("/", response_model=list[ActionDeviceRead])
def list_actions(
    session: Session = Depends(get_session),
    user=Depends(decode_token),
    device_id: int | None = None,
    executed: bool | None = None,
    limit: int = 20,
    offset: int = 0,
):
    """Obtiene todas las acciones con filtros opcionales."""
    query = select(ActionDevice)
    if device_id:
        query = query.where(ActionDevice.device_id == device_id)
    if executed is not None:
        query = query.where(ActionDevice.executed == executed)

    results = session.exec(query.offset(offset).limit(limit)).all()
    return results

# ===============================================================
# 🔍 GET /actions/{action_id} → Obtener acción por ID
# ===============================================================
@router.get("/{action_id}", response_model=ActionDeviceRead)
def get_action(
    action_id: int,
    session: Session = Depends(get_session),
    user=Depends(decode_token),
):
    """Obtiene una acción específica por su ID."""
    action = session.exec(select(ActionDevice).where(ActionDevice.id == action_id)).first()
    if not action:
        raise HTTPException(status_code=404, detail="Acción no encontrada")
    return action

# ===============================================================
# 🗑️ DELETE /actions/{action_id} → Eliminar acción
# ===============================================================
@router.delete("/{action_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_action(
    action_id: int,
    session: Session = Depends(get_session),
    user=Depends(decode_token),
):
    """Elimina una acción por su ID."""
    action = session.exec(select(ActionDevice).where(ActionDevice.id == action_id)).first()
    if not action:
        raise HTTPException(status_code=404, detail="Acción no encontrada")

    session.delete(action)
    session.commit()
    return {"message": "Acción eliminada correctamente"}

# ===============================================================
# 📡 POST /actions/device/confirm/{action_id} → Confirmación desde IoT
# ===============================================================
@router.post("/device/confirm/{action_id}")
async def confirm_action_execution(
    action_id: int,
    session: Session = Depends(get_session),
):
    """
    Endpoint llamado por el IoT (ESP32, Arduino, etc.)
    cuando confirma que la acción fue ejecutada físicamente.
    """
    action = session.exec(select(ActionDevice).where(ActionDevice.id == action_id)).first()
    if not action:
        raise HTTPException(status_code=404, detail="Acción no encontrada")

    action.executed = True
    action.updated_at = datetime.utcnow()
    session.add(action)

    log = Log(
        device_id=action.device_id,
        action_type=action.action_type,
        status="ejecutada",
        message=f"El dispositivo confirmó la acción '{action.action_type}' (ID {action.id})",
        created_at=datetime.utcnow(),
    )
    session.add(log)
    session.commit()

    payload = {
        "event": "confirm_action",
        "action_id": action.id,
        "device_id": action.device_id,
        "action_type": action.action_type,
        "status": "ejecutada",
    }
    await manager.broadcast(action.device_id, payload)

    return {"message": "Acción confirmada por el dispositivo", "action_id": action.id}
