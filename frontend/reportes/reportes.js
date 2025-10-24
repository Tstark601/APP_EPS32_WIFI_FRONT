// reportes.js
import api from '../api/api.js'; 

const reportFilterForm = document.getElementById("report-filter-form");
const reportTableBody = document.getElementById("report-table-body");
const generatePdfBtn = document.getElementById("generatePdfBtn");
const totalEventsSpan = document.getElementById("total-events");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");


// =========================================================
// FUNCIONALIDAD DE LA VISTA
// =========================================================

/**
 * Establece la fecha máxima de los campos de fecha al día en curso.
 */
function setDateLimits() {
    // Obtener la fecha actual en formato YYYY-MM-DD
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Mese 0-indexado
    const day = String(today.getDate()).padStart(2, '0');
    const maxDate = `${year}-${month}-${day}`;

    // Aplicar la limitación a los campos de fecha
    startDateInput.setAttribute('max', maxDate);
    endDateInput.setAttribute('max', maxDate);
    
    // Opcional: establecer la fecha por defecto de fin al día actual
    endDateInput.value = maxDate; 
}


// =========================================================
// Funcionalidad de la Tabla (Listado de Eventos Filtrados)
// =========================================================

/**
 * Muestra los datos de eventos en la tabla de reportes.
 */
function renderEvents(events) {
    reportTableBody.innerHTML = ''; // Limpiar
    
    if (!events || events.length === 0) {
        reportTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">No se encontraron eventos con los filtros seleccionados.</td></tr>`;
        totalEventsSpan.textContent = '0';
        return;
    }

    events.forEach(event => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${event.dispositivo}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${event.evento}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${event.usuario}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(event.fecha).toLocaleDateString('es-CO')}</td>
        `;
        reportTableBody.appendChild(row);
    });

    totalEventsSpan.textContent = events.length; // Simulación
}

/**
 * Obtiene los eventos filtrados del backend.
 */
async function fetchFilteredEvents() {
    // ... (El resto de la lógica de recopilación de filtros y la llamada a la API se mantiene igual) ...

    const perPage = document.getElementById('perPage').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const eventFilter = document.getElementById('eventFilter').value;
    const deviceFilter = document.getElementById('deviceFilter').value;
    
    const params = new URLSearchParams();
    params.append('limit', perPage);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (eventFilter) params.append('event', eventFilter);
    if (deviceFilter) params.append('device', deviceFilter);
    
    // MOCK de datos para la demostración
    const MOCK_EVENTS = [
        { id: 1, dispositivo: 'Led 1', evento: 'Apagar', usuario: 'Pepito Alberto Flores', fecha: '2027-03-13' },
        { id: 2, dispositivo: 'Motor', evento: 'Encender', usuario: 'Pepito Alberto Flores', fecha: '2027-03-19' },
        { id: 3, dispositivo: 'Led 2', evento: 'Encender', usuario: 'Pepito Alberto Flores', fecha: '2027-04-25' },
        { id: 4, dispositivo: 'Motor', evento: 'Girar Izquierda', usuario: 'Pepito Alberto Flores', fecha: '2027-05-11' },
    ];
    
    let filteredEvents = MOCK_EVENTS.filter(event => {
        let match = true;
        if (eventFilter && event.evento.toLowerCase() !== eventFilter.toLowerCase()) match = false;
        if (deviceFilter && event.dispositivo.toLowerCase().replace(' ', '') !== deviceFilter) match = false;
        return match;
    });

    try {
        // const response = await api.get(`/events/history?${params.toString()}`); 
        // renderEvents(response.data.results); 

        renderEvents(filteredEvents); 

    } catch (error) {
        console.error("Error al obtener eventos filtrados:", error);
        reportTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-sm text-red-500 text-center">Error al cargar el historial.</td></tr>`;
    }
}

// =========================================================
// Funcionalidad de Generación de PDF
// =========================================================

/**
 * Maneja la generación del reporte en PDF.
 */
async function generateReportPDF() {
    // ... (El resto de la lógica para generar PDF se mantiene igual) ...
    
    const params = new URLSearchParams();
    params.append('start_date', document.getElementById('startDate').value);
    params.append('end_date', document.getElementById('endDate').value);
    params.append('event', document.getElementById('eventFilter').value);
    params.append('device', document.getElementById('deviceFilter').value);
    
    console.log("Parámetros de reporte para PDF:", params.toString());

    try {
        // await api.get(`/reports/generate-pdf?${params.toString()}`, { responseType: 'blob' });
        alert("Generando PDF... (La lógica de descarga del archivo PDF debe implementarse en el backend y frontend)");
        
    } catch (error) {
        console.error("Error al generar el PDF:", error);
        alert("Error al generar el reporte. Verifique la conexión con el servidor.");
    }
}


// =========================================================
// Inicialización y Event Listeners
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    // NUEVA FUNCIÓN AÑADIDA
    setDateLimits(); 
    
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