// reportes.js - Generación de reportes con filtros
import api from '../api/api.js';
import { requireAuth } from '../auth/auth.js';

// =========================================================
// PROTECCIÓN DE RUTA
// =========================================================
if (!requireAuth()) {
    throw new Error('Acceso no autorizado');
}

const reportFilterForm = document.getElementById("report-filter-form");
const reportTableBody = document.getElementById("report-table-body");
const generatePdfBtn = document.getElementById("generatePdfBtn");
const totalEventsSpan = document.getElementById("total-events");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");

// =========================================================
// CONFIGURACIÓN INICIAL DE FECHAS
// =========================================================

/**
 * Establece la fecha máxima de los campos de fecha al día en curso.
 */
function setDateLimits() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const maxDate = `${year}-${month}-${day}`;

    startDateInput.setAttribute('max', maxDate);
    endDateInput.setAttribute('max', maxDate);
    
    // Establecer fecha por defecto (último mes)
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-${String(lastMonth.getDate()).padStart(2, '0')}`;
    
    startDateInput.value = lastMonthStr;
    endDateInput.value = maxDate;
}

// =========================================================
// FUNCIONALIDAD DE LA TABLA (LISTADO DE EVENTOS FILTRADOS)
// =========================================================

/**
 * Muestra los datos de eventos en la tabla de reportes.
 */
function renderEvents(events) {
    reportTableBody.innerHTML = '';
    
    if (!events || events.length === 0) {
        reportTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    No se encontraron eventos con los filtros seleccionados.
                </td>
            </tr>`;
        totalEventsSpan.textContent = '0';
        return;
    }

    events.forEach(event => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${event.device_name || event.dispositivo || 'N/A'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${event.action || event.evento || 'N/A'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${event.username || event.usuario || 'N/A'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${new Date(event.created_at || event.fecha).toLocaleString('es-CO')}
            </td>
        `;
        reportTableBody.appendChild(row);
    });

    totalEventsSpan.textContent = events.length;
}

/**
 * Obtiene los eventos filtrados del backend.
 */
async function fetchFilteredEvents() {
    const perPage = document.getElementById('perPage').value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const eventFilter = document.getElementById('eventFilter').value;
    const deviceFilter = document.getElementById('deviceFilter').value;
    
    // Mostrar loading
    reportTableBody.innerHTML = `
        <tr>
            <td colspan="4" class="px-6 py-4 text-center">
                <div class="flex items-center justify-center space-x-2">
                    <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span class="text-sm text-gray-500">Cargando eventos...</span>
                </div>
            </td>
        </tr>`;
    
    try {
        // Construir parámetros de consulta
        const params = {
            limit: parseInt(perPage),
            skip: 0
        };
        
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        if (eventFilter) params.action = eventFilter.toUpperCase();
        if (deviceFilter) params.device_id = parseInt(deviceFilter);
        
        console.log('📤 Parámetros de búsqueda:', params);
        
        const response = await api.get('/actions', { params });
        renderEvents(response.data);

    } catch (error) {
        console.error("❌ Error al obtener eventos filtrados:", error);
        reportTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-sm text-red-500 text-center">
                    Error al cargar eventos. ${error.response?.data?.detail || 'Intente más tarde.'}
                </td>
            </tr>`;
    }
}

// =========================================================
// FUNCIONALIDAD DE GENERACIÓN DE PDF
// =========================================================

/**
 * Maneja la generación del reporte en PDF.
 */
async function generateReportPDF() {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const eventFilter = document.getElementById('eventFilter').value;
    const deviceFilter = document.getElementById('deviceFilter').value;
    
    if (!startDate || !endDate) {
        showNotification('Por favor seleccione un rango de fechas', 'error');
        return;
    }
    
    // Deshabilitar botón y mostrar loading
    generatePdfBtn.disabled = true;
    const originalText = generatePdfBtn.innerHTML;
    generatePdfBtn.innerHTML = `
        <svg class="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    `;

    try {
        // Construir parámetros
        const params = {
            start_date: startDate,
            end_date: endDate
        };
        
        if (eventFilter) params.action = eventFilter.toUpperCase();
        if (deviceFilter) params.device_id = parseInt(deviceFilter);
        
        console.log('📄 Generando PDF con parámetros:', params);
        
        // Llamada a la API para generar PDF
        const response = await axios.get(
            `${api.defaults.baseURL}/reports/export-logs-pdf`,
            {
                params: params,
                responseType: 'blob',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            }
        );
        
        // Crear URL del blob y descargar
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `reporte_${startDate}_${endDate}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        showNotification('Reporte PDF generado exitosamente', 'success');
        
    } catch (error) {
        console.error("❌ Error al generar el PDF:", error);
        const errorMsg = error.response?.data?.detail || 'Error al generar el reporte';
        showNotification(errorMsg, 'error');
    } finally {
        // Rehabilitar botón
        generatePdfBtn.disabled = false;
        generatePdfBtn.innerHTML = originalText;
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }
}

/**
 * Muestra notificación temporal
 */
function showNotification(message, type = 'info') {
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-6 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in`;
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                ${type === 'success' 
                    ? '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>'
                    : '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>'
                }
            </svg>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// =========================================================
// INICIALIZACIÓN Y EVENT LISTENERS
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 Módulo de Reportes inicializado');
    
    // Configurar límites de fechas
    setDateLimits();
    
    // Cargar eventos iniciales
    fetchFilteredEvents();
    
    // Event listener para generar PDF
    generatePdfBtn.addEventListener('click', generateReportPDF);
    
    // Recargar la tabla al cambiar cualquier filtro
    reportFilterForm.querySelectorAll('select, input[type="date"]').forEach(input => {
        input.addEventListener('change', fetchFilteredEvents);
    });
    
    // Crear iconos de Lucide
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
});