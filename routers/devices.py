from fastapi import APIRouter, HTTPException, Depends
from typing import Annotated, List
# Importamos Session de sqlmodel y select
from sqlmodel import Session, select
# Importamos get_session para usarlo con Depends()
from core.database import get_session 
from models.devices import Device
from schemas.devices_schema import DeviceCreate, DeviceRead, DeviceUpdate

router = APIRouter(prefix="/devices", tags=["Devices"])

# ===============================================================
# ✅ POST - Crear dispositivo
# ===============================================================
@router.post("/", response_model=DeviceRead)
def create_device(
    data: DeviceCreate, 
    # 🟢 CORRECCIÓN
    session: Session = Depends(get_session)
):
    new_device = Device(**data.dict())
    session.add(new_device)
    session.commit()
    session.refresh(new_device)
    return new_device

# ===============================================================
# ✅ GET - Listar dispositivos
# ===============================================================
@router.get("/", response_model=List[DeviceRead])
def list_devices(
    # 🟢 CORRECCIÓN
    session: Session = Depends(get_session)
):
    return session.exec(select(Device)).all()

# ===============================================================
# ✅ GET - Obtener dispositivo por ID
# ===============================================================
@router.get("/{device_id}", response_model=DeviceRead)
def get_device(
    device_id: int, 
    # 🟢 CORRECCIÓN
    session: Session = Depends(get_session)
):
    device = session.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    return device

# ===============================================================
# ✅ PUT - Actualizar dispositivo
# ===============================================================
@router.put("/{device_id}", response_model=DeviceRead)
def update_device(
    device_id: int, 
    data: DeviceUpdate, 
    # 🟢 CORRECCIÓN
    session: Session = Depends(get_session)
):
    device = session.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    for k, v in data.dict(exclude_unset=True).items():
        setattr(device, k, v)
    session.add(device)
    session.commit()
    session.refresh(device)
    return device

# ===============================================================
# ✅ DELETE - Eliminar dispositivo
# ===============================================================
@router.delete("/{device_id}")
def delete_device(
    device_id: int, 
    # 🟢 CORRECCIÓN
    session: Session = Depends(get_session)
):
    device = session.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    session.delete(device)
    session.commit()
    return {"message": "Dispositivo eliminado correctamente"}