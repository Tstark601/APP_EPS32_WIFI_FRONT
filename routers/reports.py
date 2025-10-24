from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import FileResponse
from sqlmodel import select, func, or_
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import os
from pathlib import Path
from core.database import Session, get_session
from core.security import decode_token
from models.logs import Log
from models.actions_devices import ActionDevice
from models.users import User
from models.devices import Device

router = APIRouter(prefix="/reports", tags=["Reports"])

# ===============================================================
# 📊 GET /reports/actions-stats → Estadísticas de acciones
# ===============================================================
@router.get("/actions-stats")
def get_actions_stats(
    session: Session = Depends(get_session),
    user=Depends(decode_token),
    start_date: Optional[datetime] = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    end_date: Optional[datetime] = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    device_id: Optional[int] = Query(None, description="Filtrar por dispositivo")
):
    """
    Obtiene estadísticas de acciones con filtros por fecha y dispositivo.
    """
    # Definir las acciones que queremos contar
    target_actions = ["MOTOR_STOP", "MOTOR_IZQ", "MOTOR_DER", "LED_ON", "LED_OFF"]
    
    # Construir consulta base
    query = select(Log)
    
    # Aplicar filtros
    if start_date:
        query = query.where(Log.timestamp >= start_date)
    if end_date:
        # Añadir 1 día para incluir el día completo
        end_date_with_time = end_date + timedelta(days=1)
        query = query.where(Log.timestamp < end_date_with_time)
    if device_id:
        query = query.where(Log.id_device == device_id)
    
    # Filtrar solo logs de acciones
    action_filters = []
    for action in target_actions:
        action_filters.append(Log.event.ilike(f"Acción '{action}'%"))
        action_filters.append(Log.event.ilike(f"Dispositivo confirmó ejecución de acción '{action}'%"))
    
    query = query.where(or_(*action_filters))
    
    # Obtener todos los logs filtrados
    logs = session.exec(query).all()
    
    # Contar por tipo de acción
    action_counts = {action: 0 for action in target_actions}
    
    for log in logs:
        for action in target_actions:
            if f"'{action}'" in log.event:
                action_counts[action] += 1
                break
    
    # Calcular totales
    total_actions = sum(action_counts.values())
    
    return {
        "total_actions": total_actions,
        "action_counts": action_counts,
        "period": f"{start_date.strftime('%Y-%m-%d') if start_date else 'Inicio'} - {end_date.strftime('%Y-%m-%d') if end_date else 'Actual'}",
        "device_id": device_id
    }

# ===============================================================
# 📋 GET /reports/action-logs → Logs detallados de acciones
# ===============================================================
# En endpoints/reports.py - actualizar get_action_logs completo
@router.get("/action-logs")
def get_action_logs(
    session: Session = Depends(get_session),
    user=Depends(decode_token),
    action_type: Optional[str] = Query(None, description="Tipo de acción (MOTOR_STOP, MOTOR_IZQ, etc)"),
    start_date: Optional[datetime] = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    end_date: Optional[datetime] = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    device_id: Optional[int] = Query(None, description="Filtrar por dispositivo"),
    user_id: Optional[int] = Query(None, description="Filtrar por usuario"),
    event_type: Optional[str] = Query(None, description="Tipo de evento (creacion, confirmacion, ejecucion)"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Obtiene logs detallados de acciones con filtros avanzados, paginación y hora Colombia.
    """
    # Construir consulta base con joins
    query = select(
        Log,
        User.username,
        Device.name.label("device_name"),
        ActionDevice.action.label("action_name")
    ).join(
        User, Log.id_user == User.id
    ).join(
        Device, Log.id_device == Device.id
    ).outerjoin(
        ActionDevice, Log.id_action == ActionDevice.id
    )
    
    # Aplicar filtros
    if start_date:
        query = query.where(Log.timestamp >= start_date)
    if end_date:
        end_date_with_time = end_date + timedelta(days=1)
        query = query.where(Log.timestamp < end_date_with_time)
    if device_id:
        query = query.where(Log.id_device == device_id)
    if user_id:
        query = query.where(Log.id_user == user_id)
    if action_type:
        query = query.where(Log.event.ilike(f"%'{action_type}'%"))
    if event_type:
        if event_type == "creacion":
            query = query.where(Log.event.ilike("Acción '% creada para dispositivo%"))
        elif event_type == "confirmacion":
            query = query.where(Log.event.ilike("Dispositivo confirmó ejecución de acción%"))
        elif event_type == "ejecucion":
            query = query.where(Log.event.ilike("Acción ejecutada correctamente"))
    
    # Ordenar por fecha descendente
    query = query.order_by(Log.timestamp.desc())
    
    # Paginación
    offset = (page - 1) * limit
    
    # Obtener total
    total_query = select(func.count()).select_from(query.subquery())
    total = session.exec(total_query).one()
    
    # Obtener datos paginados
    results = session.exec(query.offset(offset).limit(limit)).all()
    
    # Procesar resultados CON HORA COLOMBIA
    logs_data = []
    for log, username, device_name, action_name in results:
        # Determinar el tipo de acción desde el evento
        detected_action = None
        action_types = ["MOTOR_STOP", "MOTOR_IZQ", "MOTOR_DER", "LED_ON", "LED_OFF"]
        for action in action_types:
            if f"'{action}'" in log.event:
                detected_action = action
                break
        
        # Determinar tipo de evento
        event_category = "otro"
        if "creada para dispositivo" in log.event:
            event_category = "creacion"
        elif "confirmó ejecución" in log.event:
            event_category = "confirmacion"
        elif "ejecutada correctamente" in log.event:
            event_category = "ejecucion"
        
        # ✅ CONVERTIR A HORA COLOMBIA
        from core.time_utils import format_colombia_time
        colombia_time = format_colombia_time(log.timestamp)
        
      
        logs_data.append({
            "id": log.id,
            "timestamp": log.timestamp,  
            "timestamp_colombia": colombia_time,  
            "event": log.event,
            "action_type": detected_action or action_name,
            "event_category": event_category,
            "username": username,
            "device_name": device_name,
            "id_device": log.id_device,
            "id_user": log.id_user,
            "id_action": log.id_action
        })
    
    # Calcular páginas
    pages = (total // limit) + (1 if total % limit > 0 else 0)
    
    # ✅ INFORMACIÓN DE TIMEZONE
    timezone_info = {
        "database_timezone": "UTC",
        "display_timezone": "Colombia (UTC-5)",
        "note": "Los timestamps se muestran en hora Colombia"
    }
    
    return {
        "logs": logs_data,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
        "timezone_info": timezone_info,  
        "filters": {
            "action_type": action_type,
            "start_date": start_date.strftime('%Y-%m-%d') if start_date else None,
            "end_date": end_date.strftime('%Y-%m-%d') if end_date else None,
            "device_id": device_id,
            "user_id": user_id,
            "event_type": event_type
        }
    }

# ===============================================================
# 📄 POST /reports/export-logs-pdf → Exportar logs a PDF
# ===============================================================
@router.post("/export-logs-pdf")
async def export_logs_to_pdf(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    device_id: Optional[int] = None,
    user_id: Optional[int] = None,
    action_type: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: Optional[int] = 1000,
    session: Session = Depends(get_session),
    user_auth=Depends(decode_token),
):
    """
    Exporta logs de acciones a PDF con hora Colombia.
    """
    try:
        # Obtener el directorio base del proyecto
        BASE_DIR = Path(__file__).parent.parent
        REPORTS_DIR = BASE_DIR / "static" / "reports"
        
        # Crear directorio si no existe
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        
        # Generar nombre de archivo único
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"action_logs_report_{timestamp}.pdf"
        filepath = REPORTS_DIR / filename
        
        # Obtener datos para el PDF
        query = select(
            Log,
            User.username,
            Device.name.label("device_name"),
            ActionDevice.action.label("action_name")
        ).join(
            User, Log.id_user == User.id
        ).join(
            Device, Log.id_device == Device.id
        ).outerjoin(
            ActionDevice, Log.id_action == ActionDevice.id
        )
        
        # Aplicar filtros
        if start_date:
            query = query.where(Log.timestamp >= start_date)
        if end_date:
            end_date_with_time = end_date + timedelta(days=1)
            query = query.where(Log.timestamp < end_date_with_time)
        if device_id:
            query = query.where(Log.id_device == device_id)
        if user_id:
            query = query.where(Log.id_user == user_id)
        if action_type:
            query = query.where(Log.event.ilike(f"%'{action_type}'%"))
        if event_type:
            if event_type == "creacion":
                query = query.where(Log.event.ilike("Acción '% creada para dispositivo%"))
            elif event_type == "confirmacion":
                query = query.where(Log.event.ilike("Dispositivo confirmó ejecución de acción%"))
            elif event_type == "ejecucion":
                query = query.where(Log.event.ilike("Acción ejecutada correctamente"))
        
        # Ordenar por fecha descendente
        query = query.order_by(Log.timestamp.desc())
        
        # ✅ CORREGIR: Asegurar que limit sea integer
        if limit:
            try:
                limit = int(limit)  # Convertir a integer
                if limit > 5000:  # Límite máximo de seguridad
                    limit = 5000
                query = query.limit(limit)
            except (ValueError, TypeError):
                # Si hay error en la conversión, usar valor por defecto
                query = query.limit(1000)
        
        # Ejecutar consulta
        results = session.exec(query).all()
        
        # Procesar datos para el PDF
        pdf_data = []
        for log, username, device_name, action_name in results:
            # Determinar acción desde el evento
            detected_action = None
            action_types = ["MOTOR_STOP", "MOTOR_IZQ", "MOTOR_DER", "LED_ON", "LED_OFF"]
            for action in action_types:
                if f"'{action}'" in log.event:
                    detected_action = action
                    break
            
            pdf_data.append({
                "timestamp": log.timestamp,  # Mantener timestamp original
                "event": log.event,
                "action": detected_action or action_name or "N/A",
                "username": username,
                "device_name": device_name
            })
        
        # ✅ USAR LA FUNCIÓN CORREGIDA
        from core.pdf_generator import generate_logs_pdf
        
        # ✅ PREPARAR FILTROS CORRECTAMENTE
        filters_dict = {
            "start_date": start_date,
            "end_date": end_date,
            "device_id": device_id,
            "user_id": user_id,
            "action_type": action_type,
            "event_type": event_type,
            "limit": limit
        }
        
        success = generate_logs_pdf(pdf_data, str(filepath), filters_dict)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al generar el archivo PDF"
            )
        
        # Verificar que el archivo se creó
        if not filepath.exists():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="El archivo PDF no se pudo crear"
            )
        
        print(f"✅ PDF con hora Colombia generado exitosamente: {filepath}")
        
        return {
            "message": "PDF generado exitosamente",
            "filename": filename,
            "filepath": f"/static/reports/{filename}",
            "file_url": f"/static/reports/{filename}",
            "records_exported": len(pdf_data),
            "generated_at": datetime.now().isoformat(),
            "file_size": f"{filepath.stat().st_size / 1024:.1f} KB",
            "timezone": "Hora Colombia (UTC-5)"
        }
        
    except Exception as e:
        print(f"❌ Error generando PDF: {str(e)}")
        import traceback
        traceback.print_exc()  # ✅ PARA DEBUG DETALLADO
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando PDF: {str(e)}"
        )

# ===============================================================
# 📥 GET /reports/download-pdf/{filename} → Descargar PDF
# ===============================================================
@router.get("/download-pdf/{filename}")
def download_pdf(
    filename: str,
    user=Depends(decode_token),
):
    """
    Descarga un reporte PDF generado previamente.
    """
    try:
        # Obtener ruta absoluta
        BASE_DIR = Path(__file__).parent.parent
        filepath = BASE_DIR / "static" / "reports" / filename
        
        print(f"📥 Buscando archivo: {filepath}")
        
        if not filepath.exists():
            # Listar archivos disponibles para debugging
            reports_dir = BASE_DIR / "static" / "reports"
            available_files = list(reports_dir.glob("*.pdf")) if reports_dir.exists() else []
            
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Archivo no encontrado. Archivos disponibles: {[f.name for f in available_files]}"
            )
        
        return FileResponse(
            path=str(filepath),
            filename=f"reporte_acciones_{filename}",
            media_type='application/pdf'
        )
        
    except Exception as e:
        print(f"❌ Error descargando PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al descargar el archivo: {str(e)}"
        )

# ===============================================================
# 🛠️ Función simple para generar PDF (placeholder)
# ===============================================================
def generate_simple_pdf(data: List[Dict[str, Any]], filename: str, filters: Dict[str, Any]):
    """
    Función simplificada para generar PDF.
    En producción, reemplazar con reportlab o otra librería.
    """
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write("REPORTE DE ACCIONES DEL SISTEMA IoT\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"Generado el: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Total de registros: {len(data)}\n\n")
            
            # Información de filtros
            if filters.get('start_date'):
                f.write(f"Desde: {filters['start_date'].strftime('%Y-%m-%d')}\n")
            if filters.get('end_date'):
                f.write(f"Hasta: {filters['end_date'].strftime('%Y-%m-%d')}\n")
            if filters.get('action_type'):
                f.write(f"Acción: {filters['action_type']}\n")
            if filters.get('device_id'):
                f.write(f"Dispositivo ID: {filters['device_id']}\n")
            if filters.get('user_id'):
                f.write(f"Usuario ID: {filters['user_id']}\n")
            if filters.get('event_type'):
                f.write(f"Tipo de evento: {filters['event_type']}\n")
            
            f.write("\n" + "=" * 50 + "\n\n")
            
            # Datos
            for i, item in enumerate(data, 1):
                f.write(f"{i}. [{item['timestamp']}] {item['action']} - {item['event']}\n")
                f.write(f"    Usuario: {item['username']} | Dispositivo: {item['device_name']}\n")
                f.write("-" * 80 + "\n")
            
            f.write(f"\n--- FIN DEL REPORTE ---\n")
            f.write(f"Total de registros exportados: {len(data)}\n")
        
        print(f"✅ Archivo PDF generado: {filename}")
        return True
        
    except Exception as e:
        print(f"❌ Error en generate_simple_pdf: {str(e)}")
        return False

# ===============================================================
# 📈 GET /reports/dashboard-stats → Estadísticas para dashboard
# ===============================================================
@router.get("/dashboard-stats")
def get_dashboard_stats(
    session: Session = Depends(get_session),
    user=Depends(decode_token),
):
    """
    Obtiene estadísticas generales para el dashboard incluyendo LED_OFF.
    """
    try:
        # Total de logs
        total_logs = session.exec(select(func.count(Log.id))).one()
        
        # Logs de hoy
        today = datetime.now().date()
        logs_today = session.exec(
            select(func.count(Log.id)).where(Log.timestamp >= today)
        ).one()
        
        # Usuarios activos (que han generado logs hoy)
        active_users = session.exec(
            select(func.count(func.distinct(Log.id_user))).where(Log.timestamp >= today)
        ).one()
        
        # Dispositivos activos
        active_devices = session.exec(
            select(func.count(func.distinct(Log.id_device))).where(Log.timestamp >= today)
        ).one()
        
        # ✅ ACCIONES MÁS COMUNES HOY (INCLUYENDO LED_OFF)
        common_actions_query = select(Log.event, func.count(Log.id)).where(
            Log.timestamp >= today,
            or_(
                Log.event.ilike("Acción 'MOTOR_STOP%"),
                Log.event.ilike("Acción 'MOTOR_IZQ%"),
                Log.event.ilike("Acción 'MOTOR_DER%"),
                Log.event.ilike("Acción 'LED_ON%"),
                Log.event.ilike("Acción 'LED_OFF%"),  # ✅ AGREGADO
                Log.event.ilike("Dispositivo confirmó ejecución%")
            )
        ).group_by(Log.event).order_by(func.count(Log.id).desc()).limit(10)
        
        common_actions = session.exec(common_actions_query).all()
        
        # ✅ CONTEO POR TIPO DE ACCIÓN ESPECÍFICO
        action_counts = {}
        action_types = ["MOTOR_STOP", "MOTOR_IZQ", "MOTOR_DER", "LED_ON", "LED_OFF"]
        
        for action in action_types:
            count = session.exec(
                select(func.count(Log.id)).where(
                    Log.timestamp >= today,
                    Log.event.ilike(f"Acción '{action}%")
                )
            ).first()
            action_counts[action] = count or 0
        
        return {
            "total_logs": total_logs,
            "logs_today": logs_today,
            "active_users": active_users,
            "active_devices": active_devices,
            "common_actions_today": dict(common_actions),
            "action_counts_today": action_counts,  # ✅ NUEVO: conteo por acción
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo estadísticas: {str(e)}"
        )
# ===============================================================
# 👤 GET /reports/user-activity → Actividad de usuarios
# ===============================================================
# En endpoints/reports.py - actualizar get_user_activity
@router.get("/user-activity")
def get_user_activity(
    session: Session = Depends(get_session),
    user=Depends(decode_token),
    start_date: Optional[datetime] = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    end_date: Optional[datetime] = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    include_logins: bool = Query(True, description="Incluir conteo de logins"),
    include_actions: bool = Query(True, description="Incluir conteo de acciones")
):
    """
    Obtiene estadísticas de actividad por usuario con hora Colombia.
    """
    try:
        # Consulta base para usuarios
        users_query = select(User)
        users = session.exec(users_query).all()
        
        user_activity = []
        
        for user_obj in users:
            user_stats = {
                "user_id": user_obj.id,
                "username": user_obj.username,
                "name": user_obj.name,
                "email": user_obj.email,
                "total_requests": 0,
                "login_count": 0,
                "actions_created": 0,
                "last_activity": None,
                "last_activity_colombia": None  # ✅ NUEVO: Hora Colombia
            }
            
            # ====================
            # 1. CONTAR LOGINS
            # ====================
            if include_logins:
                login_query = select(func.count(Log.id)).where(
                    Log.id_user == user_obj.id,
                    Log.event.ilike("%inició sesión%")
                )
                
                if start_date:
                    login_query = login_query.where(Log.timestamp >= start_date)
                if end_date:
                    end_date_with_time = end_date + timedelta(days=1)
                    login_query = login_query.where(Log.timestamp < end_date_with_time)
                
                login_count = session.exec(login_query).first()
                user_stats["login_count"] = login_count or 0
            
            # ====================
            # 2. CONTAR ACCIONES CREADAS
            # ====================
            if include_actions:
                actions_query = select(func.count(Log.id)).where(
                    Log.id_user == user_obj.id,
                    or_(
                        Log.event.ilike("Acción '% creada para dispositivo%"),
                        Log.event.ilike("Acción ejecutada correctamente"),
                        Log.event.ilike("Acción marcada como no ejecutada")
                    )
                )
                
                if start_date:
                    actions_query = actions_query.where(Log.timestamp >= start_date)
                if end_date:
                    end_date_with_time = end_date + timedelta(days=1)
                    actions_query = actions_query.where(Log.timestamp < end_date_with_time)
                
                actions_count = session.exec(actions_query).first()
                user_stats["actions_created"] = actions_count or 0
            
            # ====================
            # 3. CONTAR TOTAL DE PETICIONES
            # ====================
            total_query = select(func.count(Log.id)).where(
                Log.id_user == user_obj.id
            )
            
            if start_date:
                total_query = total_query.where(Log.timestamp >= start_date)
            if end_date:
                end_date_with_time = end_date + timedelta(days=1)
                total_query = total_query.where(Log.timestamp < end_date_with_time)
            
            total_requests = session.exec(total_query).first()
            user_stats["total_requests"] = total_requests or 0
            
            # ====================
            # 4. OBTENER ÚLTIMA ACTIVIDAD CON HORA COLOMBIA
            # ====================
            last_activity_query = select(Log.timestamp).where(
                Log.id_user == user_obj.id
            ).order_by(Log.timestamp.desc()).limit(1)
            
            last_activity = session.exec(last_activity_query).first()
            if last_activity:
                user_stats["last_activity"] = last_activity
                # ✅ CONVERTIR A HORA COLOMBIA
                from core.time_utils import format_colombia_time
                user_stats["last_activity_colombia"] = format_colombia_time(last_activity)
            
            user_activity.append(user_stats)
        
        # Ordenar por total de peticiones (descendente)
        user_activity.sort(key=lambda x: x["total_requests"], reverse=True)
        
        # Calcular totales generales
        total_logins = sum(user["login_count"] for user in user_activity)
        total_actions = sum(user["actions_created"] for user in user_activity)
        total_requests = sum(user["total_requests"] for user in user_activity)
        
        return {
            "user_activity": user_activity,
            "summary": {
                "total_users": len(user_activity),
                "total_logins": total_logins,
                "total_actions": total_actions,
                "total_requests": total_requests,
                "period": f"{start_date.strftime('%Y-%m-%d') if start_date else 'Inicio'} - {end_date.strftime('%Y-%m-%d') if end_date else 'Actual'}",
                "timezone": "Hora Colombia (UTC-5)" 
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo actividad de usuarios: {str(e)}"
        )
# ===============================================================
# 📈 GET /reports/login-stats → Estadísticas detalladas de logins
# ===============================================================
@router.get("/login-stats")
def get_login_stats(
    session: Session = Depends(get_session),
    user=Depends(decode_token),
    start_date: Optional[datetime] = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    end_date: Optional[datetime] = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    group_by: str = Query("day", description="Agrupar por: day, week, month")
):
    """
    Obtiene estadísticas detalladas de logins agrupados por período.
    """
    try:
        # Consulta base para logins
        login_query = select(
            Log.timestamp,
            User.username,
            Log.event
        ).join(
            User, Log.id_user == User.id
        ).where(
            Log.event.ilike("%inició sesión%")
        )
        
        # Aplicar filtros de fecha
        if start_date:
            login_query = login_query.where(Log.timestamp >= start_date)
        if end_date:
            end_date_with_time = end_date + timedelta(days=1)
            login_query = login_query.where(Log.timestamp < end_date_with_time)
        
        # Ordenar por fecha
        login_query = login_query.order_by(Log.timestamp.desc())
        
        # Obtener todos los logins
        logins = session.exec(login_query).all()
        
        # Agrupar por período
        login_stats = {}
        
        for timestamp, username, event in logins:
            if group_by == "day":
                key = timestamp.strftime("%Y-%m-%d")
            elif group_by == "week":
                # Lunes como inicio de semana
                year, week, _ = timestamp.isocalendar()
                key = f"{year}-W{week:02d}"
            elif group_by == "month":
                key = timestamp.strftime("%Y-%m")
            else:
                key = timestamp.strftime("%Y-%m-%d")
            
            if key not in login_stats:
                login_stats[key] = {
                    "period": key,
                    "total_logins": 0,
                    "unique_users": set(),
                    "logins_by_user": {}
                }
            
            login_stats[key]["total_logins"] += 1
            login_stats[key]["unique_users"].add(username)
            
            # Contar por usuario
            if username not in login_stats[key]["logins_by_user"]:
                login_stats[key]["logins_by_user"][username] = 0
            login_stats[key]["logins_by_user"][username] += 1
        
        # Convertir sets a listas y preparar respuesta
        formatted_stats = []
        for period, stats in login_stats.items():
            formatted_stats.append({
                "period": period,
                "total_logins": stats["total_logins"],
                "unique_users": len(stats["unique_users"]),
                "users_list": list(stats["unique_users"]),
                "logins_by_user": stats["logins_by_user"]
            })
        
        # Ordenar por período (más reciente primero)
        formatted_stats.sort(key=lambda x: x["period"], reverse=True)
        
        return {
            "login_statistics": formatted_stats,
            "total_periods": len(formatted_stats),
            "group_by": group_by,
            "period": f"{start_date.strftime('%Y-%m-%d') if start_date else 'Inicio'} - {end_date.strftime('%Y-%m-%d') if end_date else 'Actual'}"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo estadísticas de logins: {str(e)}"
        )