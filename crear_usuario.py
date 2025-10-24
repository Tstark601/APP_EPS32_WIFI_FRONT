# crear_usuario.py
from sqlmodel import Session, create_engine
from models.users import User
from core.security import hash_password
from core.database import engine

def crear_usuario_admin():
    with Session(engine) as session:
        # Verificar si ya existe
        existing = session.query(User).filter(User.username == "admin").first()
        if existing:
            print("⚠️ El usuario 'admin' ya existe")
            return
        
        # Crear nuevo usuario
        admin = User(
            name="Administrador",
            username="admin",
            email="admin@example.com",
            password=hash_password("admin123"),
            status="active"
        )
        
        session.add(admin)
        session.commit()
        print("✅ Usuario admin creado exitosamente")
        print("   Username: admin")
        print("   Password: admin123")

if __name__ == "__main__":
    crear_usuario_admin()