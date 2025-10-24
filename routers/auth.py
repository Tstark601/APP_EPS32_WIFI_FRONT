from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import select, Session
from datetime import datetime, timezone

from core.database import get_session
from models.users import User
from models.tokens import Token as DBToken
from schemas.users_schema import UserCreate, UserRead
from schemas.auth_schema import LoginResponse
from core.websocket_manager import manager
from core.security import hash_password, verify_password, create_access_token

# ------------------- CONFIGURACIÓN DEL ROUTER -------------------
router = APIRouter(prefix="/api/auth", tags=["Auth"])


# ------------------- REGISTRO DE USUARIO -------------------
@router.post("/register", response_model=UserRead)
def register_user(user: UserCreate, session: Session = Depends(get_session)):
    """Registra un nuevo usuario en la base de datos."""
    
    existing_user = session.exec(select(User).where(User.username == user.username)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El usuario ya existe")

    hashed_pw = hash_password(user.password)
    
    new_user = User(
        username=user.username,
        password=hashed_pw,
        email=user.email,
        name=user.name,
        status=user.status
    )
    
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user


# ------------------- LOGIN -------------------
@router.post("/login", response_model=LoginResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    """
    Autentica al usuario y genera un token JWT.
    """
    print(form_data.username)
    # Buscar usuario
    user = session.exec(select(User).where(User.username == form_data.username)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")

    # Validar contraseña
    if not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Contraseña incorrecta")

    # Crear token JWT
    token, expire = create_access_token({
        "username": user.username,
        "name": user.name,
        "email": user.email
    })

    # Guardar token en base de datos
    db_token = DBToken(
        id_user=user.id,
        token=token,
        status_token=True,
        date_token=datetime.now(timezone.utc),
        expiration=expire
    )
    session.add(db_token)
    session.commit()

    # 🔥 CORREGIDO: Siempre enviar al DISPOSITIVO 1 (IoT)
    try:
        await manager.send_to_device(1, {  # ← DISPOSITIVO 1 FIJO
            "type": "login",
            "success": True,
            "token": token,
            "name": user.name,
            "user": {
                "id": user.id,
                "username": user.username,
                "name": user.name,
                "email": user.email
            }
        })
        print(f"✅ Notificación de login enviada al IoT (dispositivo 1)")
    except Exception as e:
        print(f"⚠️ No se pudo notificar al IoT: {e}")
        # Intentar broadcast como fallback
        try:
            await manager.broadcast({
                "type": "login", 
                "success": True,
                "token": token,
                "name": user.name
            })
            print(f"🔥 Broadcast de login enviado como fallback")
        except Exception as e2:
            print(f"❌ Fallback también falló: {e2}")

    # Respuesta al cliente web/app
    return {
        "success": True,
        "message": "Login exitoso",
        "access_token": token,
        "token_type": "bearer",
        "expires_at": expire,
        "user": {
            "id": user.id,
            "username": user.username,
            "name": user.name,
            "email": user.email
        }
    }


# ------------------- LOGOUT -------------------
@router.post("/logout")
def logout(token: str, session: Session = Depends(get_session)):
    """Invalida un token activo."""
    db_token = session.exec(select(DBToken).where(DBToken.token == token, DBToken.status_token == True)).first()
    if not db_token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token no encontrado o ya invalidado")

    db_token.status_token = False
    session.add(db_token)
    session.commit()
    return {"success": True, "message": "Sesión cerrada correctamente"}
