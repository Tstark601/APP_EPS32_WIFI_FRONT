from fastapi import APIRouter, HTTPException, Depends
from typing import Annotated, List
# Importamos Session de sqlmodel
from sqlmodel import Session, select

from core.database import get_session 
from models.users import User
from schemas.users_schema import UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])

# ===============================================================
# ✅ GET - Listar todos los usuarios
# ===============================================================
@router.get("/", response_model=List[UserRead])
def get_users(
    
    session: Session = Depends(get_session)
):
    return session.exec(select(User)).all()

# ===============================================================
# ✅ GET - Obtener un usuario por ID
# ===============================================================
@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int, 
    
    session: Session = Depends(get_session)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user

# ===============================================================
# ✅ PUT - Actualizar usuario
# ===============================================================
@router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int, 
    data: UserUpdate, 
    
    session: Session = Depends(get_session)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    for k, v in data.dict(exclude_unset=True).items():
        setattr(user, k, v)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

# ===============================================================
# ✅ DELETE - Eliminar usuario
# ===============================================================
@router.delete("/{user_id}")
def delete_user(
    user_id: int, 
    
    session: Session = Depends(get_session)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    session.delete(user)
    session.commit()
    return {"message": "Usuario eliminado correctamente"}