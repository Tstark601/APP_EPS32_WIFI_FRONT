from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict
from datetime import datetime
# Importamos get_session para usar la sintaxis Depends()
from core.database import get_session # Importamos get_session
# Importamos Session de sqlmodel para tipar el parámetro
from sqlmodel import Session 
from models.logs import Log

router = APIRouter(prefix="/ws", tags=["WebSocket"])

class WebSocketManager:
    def __init__(self):
        # Diccionario con los WebSockets activos de cada dispositivo
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, device_id: int, websocket: WebSocket):
        """Registrar nueva conexión"""
        await websocket.accept()
        self.active_connections[device_id] = websocket
        print(f"✅ Dispositivo {device_id} conectado")

    def disconnect(self, device_id: int):
        """Eliminar conexión cerrada"""
        if device_id in self.active_connections:
            del self.active_connections[device_id]
            print(f"❌ Dispositivo {device_id} desconectado")

    async def send_action_to_device(self, device_id: int, action_id: int):
        """Enviar una acción específica a un dispositivo"""
        if device_id in self.active_connections:
            websocket = self.active_connections[device_id]
            await websocket.send_json({
                "type": "action_execute",
                "action_id": action_id,
                "timestamp": datetime.now().isoformat()
            })
            print(f"📡 Acción {action_id} enviada al dispositivo {device_id}")
        else:
            print(f"⚠️ Dispositivo {device_id} no conectado, acción en cola.")

    async def broadcast_log(self, message: str):
        """Enviar mensaje a todos los dispositivos conectados"""
        for device_id, ws in self.active_connections.items():
            await ws.send_json({
                "type": "broadcast",
                "message": message,
                "timestamp": datetime.now().isoformat()
            })

# Instancia global del manager
websocket_manager = WebSocketManager()

# ======================================================
# 🔌 WebSocket endpoint
# ======================================================
@router.websocket("/device/{device_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    device_id: int, 
    db: Session = Depends(get_session) 
):
    await websocket_manager.connect(device_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()

            # Cuando el dispositivo responde con estado de una acción
            if data.get("type") == "action_status":
                log = Log(
                    device_id=device_id,
                    action_id=data.get("action_id"),
                    level="INFO",
                    message=f"Acción {data.get('action_id')} ejecutada correctamente.",
                    created_at=datetime.now()
                )
                # Usamos la sesión de DB inyectada
                db.add(log)
                db.commit()
                print(f"🧾 Log registrado para dispositivo {device_id}")

            elif data.get("type") == "status":
                # Nota: La función broadcast_log no necesita la DB, solo el manager
                await websocket_manager.broadcast_log(f"📡 Estado actualizado desde {device_id}: {data}")

    except WebSocketDisconnect:
        websocket_manager.disconnect(device_id)