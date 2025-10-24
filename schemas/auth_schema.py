from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class UserData(BaseModel):
    id: int
    username: str
    name: str
    email: str


class LoginResponse(BaseModel):
    success: bool
    message: str
    access_token: str
    token_type: str
    expires_at: datetime
    user: UserData

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str
    password: str
