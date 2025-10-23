from fastapi import APIRouter, HTTPException, status, Depends
from typing import Annotated
from sqlmodel import Session, select
from core.database import get_session
from models.users import User
from schemas.users_schema import UserCreate, UserLogin, UserRead, TokenResponse
from core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])

# ✅ POST - Registro de usuario
@router.post("/register", response_model=UserRead)
def register_user(user: UserCreate, session: Session = Depends(get_session)):
    # 1. Verificar si ya existe
    existing_user = session.exec(select(User).where(User.username == user.username)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El usuario ya existe")

    # 2. Hashear contraseña
    hashed_pw = hash_password(user.password)
    
    # 3. Crear nuevo usuario (los campos están correctos aquí)
    new_user = User(
        username=user.username,
        password=hashed_pw,
        email=user.email,       
        name=user.name,         
        status=user.status      
    )
    
    # 4. Guardar y retornar
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user


# ✅ POST - Login y generación de token
@router.post("/login", response_model=TokenResponse) 
def login_user(data: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == data.username)).first()
    
    # Verificar usuario, contraseña y estado
    if not user or not verify_password(data.password, user.password) or not user.status:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas o usuario inactivo")

    # 1. Generar token y obtener fecha de expiración
    # create_access_token devuelve (token_str, expiry_datetime)
    token_str, expiration = create_access_token({"username": user.username, "name": user.name, "email": user.email})
    
    # 2. Retornar los datos completos que coincidan con TokenResponse
    return {
        "access_token": token_str, 
        "token_type": "bearer",    
        "expires_at": expiration 
    }