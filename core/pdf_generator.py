
import os
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from datetime import datetime
from typing import List, Dict, Any
from core.time_utils import format_colombia_time  
# core/pdf_generator.py - función corregida
def generate_logs_pdf(data: List[Dict[str, Any]], filename: str, filters: Dict[str, Any]):
    """
    Genera un PDF profesional con tabla para los logs de acciones en hora Colombia.
    """
    try:
        # Crear documento
        doc = SimpleDocTemplate(filename, pagesize=A4, topMargin=30, bottomMargin=30)
        story = []
        styles = getSampleStyleSheet()
        
        # Estilos personalizados
        title_style = ParagraphStyle(
            'Title',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#2E86AB'),
            spaceAfter=20,
            alignment=1
        )
        
        subtitle_style = ParagraphStyle(
            'Subtitle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.gray,
            alignment=1
        )
        
        # Título principal
        title = Paragraph("REPORTE DE ACCIONES DEL SISTEMA IoT", title_style)
        story.append(title)
        
        # Información del reporte EN HORA COLOMBIA
        from core.time_utils import format_colombia_time
        colombia_now = format_colombia_time(datetime.utcnow(), "%d/%m/%Y %H:%M:%S")
        report_info = [
            f"<b>Fecha de generación:</b> {colombia_now} (Hora Colombia)",
            f"<b>Total de registros:</b> {len(data)}"
        ]
        
        # ✅ CORREGIR: Manejar fechas correctamente
        if filters.get('start_date'):
            try:
                start_col = format_colombia_time(filters['start_date'], "%d/%m/%Y")
                report_info.append(f"<b>Desde:</b> {start_col}")
            except (TypeError, AttributeError):
                # Si hay error con la fecha, omitir
                pass
                
        if filters.get('end_date'):
            try:
                end_col = format_colombia_time(filters['end_date'], "%d/%m/%Y")
                report_info.append(f"<b>Hasta:</b> {end_col}")
            except (TypeError, AttributeError):
                pass
                
        if filters.get('action_type'):
            report_info.append(f"<b>Acción:</b> {filters['action_type']}")
        if filters.get('device_id'):
            report_info.append(f"<b>Dispositivo ID:</b> {filters['device_id']}")
        if filters.get('user_id'):
            report_info.append(f"<b>Usuario ID:</b> {filters['user_id']}")
        if filters.get('event_type'):
            report_info.append(f"<b>Tipo de evento:</b> {filters['event_type']}")
        if filters.get('limit'):
            report_info.append(f"<b>Límite:</b> {filters['limit']}")
            
        info_text = " | ".join(report_info)
        info_para = Paragraph(info_text, subtitle_style)
        story.append(info_para)
        story.append(Spacer(1, 25))
        
        # Tabla de datos si hay registros
        if data:
            # Encabezados de tabla
            table_data = [['Fecha/Hora (Colombia)', 'Acción', 'Evento', 'Usuario', 'Dispositivo']]
            
            # Llenar datos de la tabla CON HORA COLOMBIA
            for item in data:
                try:
                    # ✅ CORREGIR: Manejar diferentes formatos de timestamp
                    if isinstance(item['timestamp'], str):
                        # Si es string, convertir a datetime
                        original_timestamp = datetime.fromisoformat(item['timestamp'].replace('Z', '+00:00'))
                    else:
                        # Si ya es datetime
                        original_timestamp = item['timestamp']
                    
                    colombia_time = format_colombia_time(original_timestamp, "%Y-%m-%d %H:%M:%S")
                    
                    # Acortar evento si es muy largo
                    event = item['event']
                    if len(event) > 60:
                        event = event[:57] + '...'
                    
                    table_data.append([
                        colombia_time,  # ✅ HORA COLOMBIA
                        item['action'] or 'N/A',
                        event,
                        item['username'],
                        item['device_name']
                    ])
                except Exception as e:
                    print(f"⚠️ Error procesando item: {e}")
                    continue  # Saltar este item y continuar
            
            # Crear tabla
            table = Table(table_data, colWidths=[1.5*inch, 1.0*inch, 2.8*inch, 1.0*inch, 1.2*inch])
            table.setStyle(TableStyle([
                # Estilo para encabezados
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E86AB')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                
                # Estilo para filas de datos
                ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8F9FA')]),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            
            story.append(table)
        else:
            # Mensaje cuando no hay datos
            no_data_style = ParagraphStyle(
                'NoData',
                parent=styles['Heading2'],
                fontSize=14,
                textColor=colors.red,
                alignment=1,
                spaceBefore=50
            )
            no_data = Paragraph("No se encontraron registros con los filtros aplicados", no_data_style)
            story.append(no_data)
        
        # Pie de página CON HORA COLOMBIA
        story.append(Spacer(1, 20))
        footer_text = f"Generado por Sistema IoT Control - Hora Colombia - Página 1"
        footer = Paragraph(footer_text, ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, alignment=2))
        story.append(footer)
        
        # Generar PDF
        doc.build(story)
        print(f"✅ PDF generado exitosamente: {filename}")
        return True
        
    except Exception as e:
        print(f"❌ Error generando PDF con ReportLab: {str(e)}")
        import traceback
        traceback.print_exc()  # ✅ DEBUG DETALLADO
        return False