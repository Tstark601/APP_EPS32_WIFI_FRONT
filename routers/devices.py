from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from sqlmodel import Session, select
from core.database import get_session 
from core.security import decode_token 
from models.devices import Device
from schemas.devices_schema import DeviceCreate, DeviceRead, DeviceUpdate, DeviceUpdateIP

router = APIRouter(prefix="/devices", tags=["Devices"])

# ===============================================================
# ✅ POST - Crear dispositivo (PROTEGIDA CON VALIDACIÓN EXTRA)
# ===============================================================
@router.post("/", response_model=DeviceRead, status_code=status.HTTP_201_CREATED)
def create_device(
    data: DeviceCreate, 
    session: Session = Depends(get_session),
    user=Depends(decode_token),
):
    """Crear un nuevo dispositivo con validaciones de seguridad."""
    
    # 🔒 Validar que el nombre no exista
    existing_device = session.exec(
        select(Device).where(Device.name == data.name)
    ).first()
    
    if existing_device:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un dispositivo con ese nombre"
        )
    
    # 🔒 Validar formato de dirección IP si se proporciona
    if data.direction:
        # Validación básica de formato IP
        import re
        ip_pattern = r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$'
        if not re.match(ip_pattern, data.direction):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de dirección IP inválido"
            )
    
    new_device = Device(
        name=data.name,
        status=data.status or "offline",
        direction=data.direction,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    session.add(new_device)
    session.commit()
    session.refresh(new_device)
    
    # 📝 Log de creación (opcional)
    print(f"✅ Dispositivo creado: {new_device.name} por usuario: {user.username}")
    
    return new_device

# ===============================================================
# 📜 GET - Listar dispositivos (PROTEGIDA CON FILTROS SEGUROS)
# ===============================================================
@router.get("/", response_model=List[DeviceRead])
def list_devices(
    session: Session = Depends(get_session),
    user=Depends(decode_token),
    status: Optional[str] = None,
    name: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
):
    """Obtiene una lista de dispositivos con filtros seguros."""
    
    # 🔒 Validar límite máximo
    if limit > 100:
        limit = 100
    
    query = select(Device)
    
    if status:
        # 🔒 Validar valores de status permitidos
        allowed_status = ["online", "offline", "activo", "desconectado", "mantenimiento"]
        if status not in allowed_status:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Status no válido. Valores permitidos: {allowed_status}"
            )
        query = query.where(Device.status == status)
    
    if name:
        # 🔒 Prevenir SQL injection con like seguro
        if len(name) > 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nombre de búsqueda es demasiado largo"
            )
        query = query.where(Device.name.ilike(f"%{name}%"))

    # Aplicar paginación segura
    results = session.exec(query.offset(offset).limit(limit)).all()
    
    # 📝 Log de consulta
    print(f"📋 Usuario {user.username} consultó {len(results)} dispositivos")
    
    return results

# ===============================================================
# 🔍 GET - Obtener dispositivo por ID (PROTEGIDA CON VALIDACIÓN)
# ===============================================================
@router.get("/{device_id}", response_model=DeviceRead)
def get_device(
    device_id: int, 
    session: Session = Depends(get_session),
    user=Depends(decode_token),
):
    """Obtener un dispositivo específico por ID."""
    
    # 🔒 Validar que el ID sea positivo
    if device_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de dispositivo inválido"
        )
    
    device = session.get(Device, device_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispositivo no encontrado"
        )
    
    return device

# ===============================================================
# 🔄 PUT - Actualizar dispositivo (PROTEGIDA CON VALIDACIONES)
# ===============================================================
@router.put("/{device_id}", response_model=DeviceRead)
def update_device(
    device_id: int, 
    data: DeviceUpdate, 
    session: Session = Depends(get_session),
    user=Depends(decode_token),
):
    """Actualizar dispositivo con validaciones de seguridad."""
    
    # 🔒 Validar ID
    if device_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de dispositivo inválido"
        )
    
    device = session.get(Device, device_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispositivo no encontrado"
        )
    
    # 🔒 Validar nombre único si se está actualizando
    if data.name and data.name != device.name:
        existing_device = session.exec(
            select(Device).where(Device.name == data.name)
        ).first()
        if existing_device:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un dispositivo con ese nombre"
            )
    
    # 🔒 Validar dirección IP si se proporciona
    if data.direction:
        import re
        ip_pattern = r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$'
        if not re.match(ip_pattern, data.direction):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de dirección IP inválido"
            )
    
    # Actualizar campos
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(device, key, value)
    
    device.updated_at = datetime.utcnow()
    session.add(device)
    session.commit()
    session.refresh(device)
    
    # 📝 Log de actualización
    print(f"✏️ Dispositivo actualizado: {device.name} por usuario: {user.username}")
    
    return device

# ===============================================================
# 📡 PATCH - Actualizar IP (PROTEGIDA CON VALIDACIONES)
# ===============================================================
@router.patch("/{device_id}/ip", response_model=DeviceRead)
def update_device_ip(
    device_id: int, 
    data: DeviceUpdateIP,
    session: Session = Depends(get_session),
    user=Depends(decode_token),  # 🔒 PROTECCIÓN JWT AGREGADA
):
    """Actualizar solo la dirección IP del dispositivo con validaciones."""
    
    # 🔒 Validar ID
    if device_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de dispositivo inválido"
        )
    
    device = session.get(Device, device_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispositivo no encontrado"
        )
    
    # 🔒 Validar formato de IP
    import re
    ip_pattern = r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$'
    if not re.match(ip_pattern, data.ip_address):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de dirección IP inválido"
        )
    
    # Actualizar IP y estado
    device.direction = data.ip_address
    device.status = "online"
    device.updated_at = datetime.utcnow()
    
    session.add(device)
    session.commit()
    session.refresh(device)
    
    # 📝 Log de actualización de IP
    print(f"🌐 IP actualizada: {device.name} -> {data.ip_address} por usuario: {user.username}")
    
    return device

# ===============================================================
# 🗑️ DELETE - Eliminar dispositivo (PROTEGIDA CON VALIDACIONES)
# ===============================================================
@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(
    device_id: int, 
    session: Session = Depends(get_session),
    user=Depends(decode_token),
):
    """Eliminar dispositivo con validaciones de seguridad."""
    
    # 🔒 Validar ID
    if device_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de dispositivo inválido"
        )
    
    device = session.get(Device, device_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispositivo no encontrado"
        )
    
    # 📝 Log antes de eliminar
    print(f"🗑️ Eliminando dispositivo: {device.name} por usuario: {user.username}")
    
    session.delete(device)
    session.commit()
    
    return