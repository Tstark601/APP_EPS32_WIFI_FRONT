from pydantic import BaseModel, EmailStr
from datetime import datetime


# ------------------- LOGIN -------------------
class LoginRequest(BaseModel):
    username: str
    password: str


# ------------------- RESPONSE -------------------
class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    username: str
    email: EmailStr
