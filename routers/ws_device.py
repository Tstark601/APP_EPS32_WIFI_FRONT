from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.websocket_manager import manager
import json

router = APIRouter()

@router.websocket("/ws/device/{device_id}")
async def websocket_endpoint(websocket: WebSocket, device_id: int):
    await manager.connect(websocket)
    
    # 🔥 REGISTRAR CORRECTAMENTE EL DISPOSITIVO
    manager.device_connections[device_id] = websocket
    print(f"✅ Dispositivo {device_id} conectado vía WebSocket")

    try:
        while True:
            data = await websocket.receive_text()
            print(f"📩 Mensaje recibido del dispositivo {device_id}: {data}")
            
            # Procesar mensajes del dispositivo
            try:
                message = json.loads(data)
                message_type = message.get("type")
                
                # Manejar autenticación desde el dispositivo
                if message_type == "auth":
                    token = message.get("token")
                    if token:
                        # Enviar confirmación de autenticación
                        await manager.send_json(websocket, {
                            "type": "auth_response",
                            "success": True,
                            "message": "Autenticado correctamente"
                        })
                        print(f"🔐 Dispositivo {device_id} autenticado")
                        
            except json.JSONDecodeError:
                print("❌ Mensaje no es JSON válido")
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        manager.device_connections.pop(device_id, None)
        print(f"❌ Dispositivo {device_id} desconectado")