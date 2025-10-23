from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr

# =====================================================
# 🧱 BASE
# =====================================================
class UserBase(BaseModel):
    username: str
    email: EmailStr
    name: Optional[str] = None
    status: bool = True



# =====================================================
# 🆕 CREATE
# =====================================================
class UserCreate(UserBase):
    password: str


# =====================================================
# ✏️ UPDATE
# =====================================================
class UserUpdate(BaseModel):
    username: Optional[str]
    email: Optional[EmailStr]
    name: Optional[str]
    password: Optional[str]
    status: Optional[bool]


# =====================================================
# 📖 READ
# =====================================================
class UserRead(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# =====================================================
# 🔑 LOGIN
# =====================================================
class UserLogin(BaseModel):
    username: str
    password: str


# =====================================================
# 🔒 TOKEN RESPONSE (CORREGIDO)
# =====================================================
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
