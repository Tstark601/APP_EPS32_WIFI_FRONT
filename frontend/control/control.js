// control.js
import api from '../api/api.js'; 
// Importar showAlert si se está usando
// import showAlert from '../components/alerts.js'; 

const devicesContainer = document.getElementById("device-controls-container");
const eventsTableBody = document.getElementById("events-table-body");
const totalEventsSpan = document.getElementById("total-events");

// =========================================================
// Mapeo y Estilos de la UI
// =========================================================

/**
 * Obtiene las clases de estilo para el estado actual (simulado).
 * @param {string} deviceType - 'led1', 'led2', o 'motor'.
 * @param {string} status - 'ON', 'OFF', 'Giro Izquierda', 'Giro Derecha', 'Detenido'.
 */
function getStatusStyles(deviceType, status) {
    let style = { dotClass: '', textClass: '', borderClass: '', buttonActiveClass: '', buttonInactiveClass: '' };

    if (deviceType.startsWith('led')) {
        if (status === 'ON') {
            style.dotClass = 'bg-green-500';
            style.textClass = 'text-green-600';
            style.borderClass = 'border-green-300 bg-green-50';
            style.buttonActiveClass = 'bg-green-500 hover:bg-green-600';
            style.buttonInactiveClass = 'bg-red-500 hover:bg-red-600';
        } else { // OFF
            style.dotClass = 'bg-red-500';
            style.textClass = 'text-red-600';
            style.borderClass = 'border-red-300 bg-red-50';
            style.buttonActiveClass = 'bg-red-500 hover:bg-red-600';
            style.buttonInactiveClass = 'bg-green-500 hover:bg-green-600';
        }
    } else if (deviceType === 'motor') {
        if (status.includes('Giro')) {
            style.dotClass = 'bg-primary-blue animate-spin'; // Simula actividad
            style.textClass = 'text-primary-blue';
            style.borderClass = 'border-blue-300 bg-blue-50';
        } else { // Detenido
            style.dotClass = 'bg-gray-500';
            style.textClass = 'text-gray-600';
            style.borderClass = 'border-gray-300 bg-gray-50';
        }
    }
    return style;
}

/**
 * Actualiza visualmente el estado de un dispositivo en la UI.
 * @param {string} deviceId - 'led1', 'led2', 'motor'.
 * @param {string} newStatus - El nuevo estado (ej. 'ON', 'Detenido').
 */
function updateDeviceStatusUI(deviceId, newStatus) {
    const statusDiv = document.getElementById(`status-${deviceId}`);
    const styles = getStatusStyles(deviceId, newStatus);
    
    if (statusDiv) {
        // Actualizar el texto y las clases de la etiqueta de estado
        statusDiv.innerHTML = `
            <span class="w-2 h-2 rounded-full ${styles.dotClass}"></span>
            <span class="text-xs font-medium ${styles.textClass}">${newStatus}</span>
        `;
        statusDiv.className = `flex items-center space-x-2 p-1 px-3 rounded-full border ${styles.borderClass}`;
    }

    // Aquí podrías añadir lógica para deshabilitar botones según el estado
    // ...
}


// =========================================================
// Funcionalidad de la Tabla de Eventos
// =========================================================

/**
 * Muestra los datos del historial en la tabla.
 */
function renderEvents(events) {
    eventsTableBody.innerHTML = ''; // Limpiar
    
    if (!events || events.length === 0) {
        eventsTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">No hay eventos registrados.</td></tr>`;
        totalEventsSpan.textContent = '0';
        return;
    }

    events.forEach(event => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${event.dispositivo || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${event.valor || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${event.usuario || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(event.fecha).toLocaleDateString()}</td>
        `;
        eventsTableBody.appendChild(row);
    });

    totalEventsSpan.textContent = events.length; // En un escenario real, sería la cantidad total paginada
}

/**
 * Obtiene el historial de eventos del backend.
 */
async function fetchEventsHistory() {
    // Simulamos la estructura de datos que esperamos de la API
    const MOCK_EVENTS = [
        { id: 1, dispositivo: 'Motor', valor: 'Giro Derecha', usuario: localStorage.getItem('username') || 'Admin', fecha: '2025-10-20T08:00:00Z' },
        { id: 2, dispositivo: 'Led 1', valor: 'ON', usuario: 'System', fecha: '2025-10-20T07:55:00Z' },
        { id: 3, dispositivo: 'Motor', valor: 'Detenido', usuario: 'Admin', fecha: '2025-10-20T07:50:00Z' },
        { id: 4, dispositivo: 'Led 2', valor: 'OFF', usuario: 'Admin', fecha: '2025-10-20T07:45:00Z' },
    ];
    
    try {
        // REEMPLAZAR con la llamada a tu API:
        // const response = await api.get('/events/'); 
        // renderEvents(response.data); 
        
        // Usando MOCK para la demostración
        renderEvents(MOCK_EVENTS); 

    } catch (error) {
        console.error("Error al obtener el historial de eventos:", error);
        eventsTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-sm text-red-500 text-center">Error al cargar el historial.</td></tr>`;
    }
}

// =========================================================
// Lógica de Control de Dispositivos (Interacción con API)
// =========================================================

/**
 * Función que maneja el envío de comandos al ESP32 a través del backend.
 * @param {string} deviceId - 'led1', 'led2', o 'motor'.
 * @param {string} action - 'encender', 'apagar', 'girar-izquierda', 'girar-derecha', 'detener'.
 */
async function sendControlCommand(deviceId, action) {
    // Mapeo de la acción al valor que esperaría el backend/ESP32
    const payloadMap = {
        'led1': { 'encender': { state: 1 }, 'apagar': { state: 0 } },
        'led2': { 'encender': { state: 1 }, 'apagar': { state: 0 } },
        'motor': { 
            'girar-izquierda': { direction: 'LEFT', speed: 100 }, 
            'girar-derecha': { direction: 'RIGHT', speed: 100 }, 
            'detener': { direction: 'STOP' } 
        }
    };
    
    const endpoint = `/control/${deviceId}`; // Ejemplo de endpoint
    const payload = payloadMap[deviceId][action];
    
    if (!payload) {
        console.error("Comando o dispositivo no mapeado:", deviceId, action);
        return;
    }

    console.log(`Enviando comando a ${endpoint}:`, payload);
    
    try {
        // Lógica para deshabilitar botones y mostrar estado de 'Cargando...'
        
        // REEMPLAZAR con la llamada a tu API:
        // const response = await api.post(endpoint, payload);
        
        // Simulación de respuesta exitosa
        await new Promise(resolve => setTimeout(resolve, 500)); 

        let newStatus;
        if (deviceId.startsWith('led')) {
            newStatus = action === 'encender' ? 'ON' : 'OFF';
        } else if (deviceId === 'motor') {
            if (action === 'detener') newStatus = 'Detenido';
            else if (action === 'girar-izquierda') newStatus = 'Giro Izquierda';
            else newStatus = 'Giro Derecha';
        }

        updateDeviceStatusUI(deviceId, newStatus);
        
        // Vuelve a cargar el historial para ver el nuevo evento (si la API lo registra)
        fetchEventsHistory(); 

    } catch (error) {
        console.error(`Error al enviar comando a ${deviceId}:`, error.response ? error.response.data : error.message);
        // showAlert({ title: "Error de Control", message: "Fallo la comunicación con el dispositivo.", type: "error" });
    } finally {
        // Lógica para rehabilitar botones
    }
}


/**
 * Inicializa los Event Listeners para los botones de control.
 */
function initControlListeners() {
    devicesContainer.querySelectorAll('.control-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const device = e.currentTarget.dataset.device;
            const action = e.currentTarget.dataset.action;
            sendControlCommand(device, action);
        });
    });
}


// =========================================================
// Inicialización
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar listeners para los comandos
    initControlListeners();
    
    // Cargar historial de eventos al inicio
    fetchEventsHistory();
    
    // Crear iconos de Lucide
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }