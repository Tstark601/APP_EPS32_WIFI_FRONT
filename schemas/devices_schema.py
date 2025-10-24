from datetime import datetime
from typing import Optional
from pydantic import BaseModel, validator

# =====================================================
# 🧱 BASE
# =====================================================
class DeviceBase(BaseModel):
    name: str
    status: Optional[str] = "offline"
    direction: Optional[str] = None
    
    @validator('name')
    def validate_name(cls, v):
        if len(v) < 2 or len(v) > 50:
            raise ValueError('El nombre debe tener entre 2 y 50 caracteres')
        return v
    
    @validator('status')
    def validate_status(cls, v):
        if v and v not in ["online", "offline", "activo", "desconectado", "mantenimiento"]:
            raise ValueError('Status no válido')
        return v
    
    @validator('direction')
    def validate_direction(cls, v):
        if v:
            import re
            ip_pattern = r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$'
            if not re.match(ip_pattern, v):
                raise ValueError('Formato de dirección IP inválido')
        return v

# =====================================================
# 🆕 CREATE
# =====================================================
class DeviceCreate(DeviceBase):
    created_by: Optional[int] = None

# =====================================================
# ✏️ UPDATE
# =====================================================
class DeviceUpdate(BaseModel):
    name: Optional[str]
    direction: Optional[str]
    status: Optional[str]
    
    @validator('name')
    def validate_name(cls, v):
        if v and (len(v) < 2 or len(v) > 50):
            raise ValueError('El nombre debe tener entre 2 y 50 caracteres')
        return v

# =====================================================
# 📖 READ
# =====================================================
class DeviceRead(DeviceBase):
    id: int
    created_at: datetime  # ✅ Hacer obligatorio
    updated_at: datetime  # ✅ Hacer obligatorio

    class Config:
        from_attributes = True

# =====================================================
# 🔧 UPDATE IP
# =====================================================
class DeviceUpdateIP(BaseModel):
    ip_address: str
    
    @validator('ip_address')
    def validate_ip_address(cls, v):
        import re
        ip_pattern = r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$'
        if not re.match(ip_pattern, v):
            raise ValueError('Formato de dirección IP inválido')
        return v

    class Config:
        from_attributes = True