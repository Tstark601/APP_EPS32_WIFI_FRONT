from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importar routers
from routers import auth, users, devices, actions, logs, reports, health,ws_device

from core.database import create_db_and_tables 


    
# Crear instancia de la app
app = FastAPI(
    title="IoT Control API",
    description="Backend para el sistema IoT con control, reportes y tablero en tiempo real.",
    version="2.0.0"
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Evento de Inicio ACTUALIZADO ---
@app.on_event("startup")
def startup():
    """
    Función que se ejecuta al iniciar la aplicación.
    1. Crea las tablas.
    2. Realiza un 'ping' a la DB para despertar la conexión.
    """
    print("Ejecutando startup hooks...")
    
    # 1. Crea las tablas de la base de datos si no existen.
    create_db_and_tables()
    print("Tablas verificadas.")
# Registrar routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(devices.router)
app.include_router(actions.router)
app.include_router(logs.router)
app.include_router(reports.router)
app.include_router(health.router)
app.include_router(ws_device.router)

# Ruta raíz
@app.get("/")
def root():
    return {"message": "Bienvenido al sistema IoT con FastAPI 🚀"}


