from typing import Annotated
from fastapi import Depends
from sqlmodel import SQLModel, create_engine, Session
from core.config import settings

# Motor de conexión a la base de datos
engine = create_engine(settings.DATABASE_URL, echo=True)

def create_db_and_tables():
    """Crea todas las tablas definidas en los modelos si no existen."""
    # 👇 IMPORTA TODOS TUS MODELOS AQUÍ
    from models.devices import Device
    from models.actions_devices import ActionDevice
    from models.logs import Log
    from models.users import User
    from models.tokens import Token
    

    SQLModel.metadata.create_all(engine)

def get_session():
    """Generador para obtener la sesión de la base de datos."""
    with Session(engine) as session:
        yield session

