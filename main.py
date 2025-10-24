from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path

# Importar routers
from routers import auth, users, devices, actions, logs, reports, health, ws_device
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

# --- Configuración de archivos estáticos ---
# Crear directorio static si no existe
static_dir = "static"
reports_dir = os.path.join(static_dir, "reports")

# Crear directorios necesarios
Path(reports_dir).mkdir(parents=True, exist_ok=True)

print(f"✅ Directorio static: {os.path.abspath(static_dir)}")
print(f"✅ Directorio reports: {os.path.abspath(reports_dir)}")

# Montar archivos estáticos
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# --- Evento de Inicio ---
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
    print("✅ Tablas verificadas.")
    print("✅ Servidor de archivos estáticos configurado")

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
    return {
        "message": "Bienvenido al sistema IoT con FastAPI 🚀",
        "endpoints": {
            "documentación": "/docs",
            "health": "/health",
            "reportes_pdf": "/reports/export-logs-pdf"
        }
    }
