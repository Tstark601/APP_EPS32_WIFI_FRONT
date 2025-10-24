// control.js - Control de dispositivos ESP32
import api from '../api/api.js';
import { requireAuth } from '../auth/auth.js';

const devicesContainer = document.getElementById("device-controls-container");
const eventsTableBody = document.getElementById("events-table-body");
const totalEventsSpan = document.getElementById("total-events");

// =========================================================
// PROTECCIÓN DE RUTA
// =========================================================
if (!requireAuth()) {
    throw new Error('Acceso no autorizado');
}

// =========================================================
// MAPEO Y ESTILOS DE LA UI
// =========================================================

/**
 * Obtiene las clases de estilo para el estado actual.
 * @param {string} deviceType - 'led1', 'led2', o 'motor'.
 * @param {string} status - 'ON', 'OFF', 'Giro Izquierda', 'Giro Derecha', 'Detenido'.
 */
function getStatusStyles(deviceType, status) {
    let style = { 
        dotClass: '', 
        textClass: '', 
        borderClass: '', 
        buttonActiveClass: '', 
        buttonInactiveClass: '' 
    };

    if (deviceType.startsWith('led')) {
        if (status === 'ON') {
            style.dotClass = 'bg-green-500 animate-pulse';
            style.textClass = 'text-green-600';
            style.borderClass = 'border-green-300 bg-green-50';
            style.buttonActiveClass = 'bg-green-500 hover:bg-green-600';
            style.buttonInactiveClass = 'bg-gray-300 hover:bg-gray-400';
        } else { // OFF
            style.dotClass = 'bg-red-500 animate-pulse';
            style.textClass = 'text-red-600';
            style.borderClass = 'border-red-300 bg-red-50';
            style.buttonActiveClass = 'bg-red-500 hover:bg-red-600';
            style.buttonInactiveClass = 'bg-gray-300 hover:bg-gray-400';
        }
    } else if (deviceType === 'motor') {
        if (status.includes('Giro')) {
            style.dotClass = 'bg-blue-500 animate-spin';
            style.textClass = 'text-blue-600';
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
        statusDiv.innerHTML = `
            <span class="w-2 h-2 rounded-full ${styles.dotClass}"></span>
            <span class="text-xs font-medium ${styles.textClass}">${newStatus}</span>
        `;
        statusDiv.className = `flex items-center space-x-2 p-1 px-3 rounded-full border ${styles.borderClass}`;
    }
}

// =========================================================
// FUNCIONALIDAD DE LA TABLA DE EVENTOS
// =========================================================

/**
 * Muestra los datos del historial en la tabla.
 */
function renderEvents(events) {
    eventsTableBody.innerHTML = '';
    
    if (!events || events.length === 0) {
        eventsTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    No hay eventos registrados.
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
                ${event.action || event.valor || 'N/A'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${event.username || event.usuario || 'N/A'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${new Date(event.created_at || event.fecha).toLocaleString('es-CO')}
            </td>
        `;
        eventsTableBody.appendChild(row);
    });

    totalEventsSpan.textContent = events.length;
}

/**
 * Obtiene el historial de eventos del backend.
 */
async function fetchEventsHistory() {
    try {
        eventsTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center space-x-2">
                        <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span class="text-sm text-gray-500">Cargando historial...</span>
                    </div>
                </td>
            </tr>`;

        // Llamada real a la API
        const response = await api.get('/actions', {
            params: { limit: 10, skip: 0 }
        });
        
        renderEvents(response.data);

    } catch (error) {
        console.error("❌ Error al obtener el historial de eventos:", error);
        eventsTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-sm text-red-500 text-center">
                    Error al cargar el historial. ${error.response?.data?.detail || 'Intente más tarde.'}
                </td>
            </tr>`;
    }
}

// =========================================================
// LÓGICA DE CONTROL DE DISPOSITIVOS
// =========================================================

/**
 * Función que maneja el envío de comandos al ESP32 a través del backend.
 * @param {string} deviceId - 'led1', 'led2', o 'motor'.
 * @param {string} action - 'encender', 'apagar', 'girar-izquierda', 'girar-derecha', 'detener'.
 */
async function sendControlCommand(deviceId, action) {
    // Mapeo de dispositivos y acciones
    const deviceMap = {
        'led1': 1,
        'led2': 2,
        'motor': 3
    };

    const actionMap = {
        'encender': 'ON',
        'apagar': 'OFF',
        'girar-izquierda': 'LEFT',
        'girar-derecha': 'RIGHT',
        'detener': 'STOP'
    };

    const deviceIdNum = deviceMap[deviceId];
    const actionValue = actionMap[action];

    if (!deviceIdNum || !actionValue) {
        console.error("❌ Comando o dispositivo no válido:", deviceId, action);
        return;
    }

    console.log(`📤 Enviando comando: ${actionValue} a dispositivo ${deviceIdNum}`);

    // Deshabilitar botones mientras se procesa
    const buttons = document.querySelectorAll(`[data-device="${deviceId}"]`);
    buttons.forEach(btn => btn.disabled = true);

    try {
        // Llamada a la API
        const response = await api.post('/actions', {
            id_device: deviceIdNum,
            action: actionValue,
            value: actionValue === 'ON' ? 1 : actionValue === 'OFF' ? 0 : actionValue
        });

        console.log('✅ Comando enviado exitosamente:', response.data);

        // Actualizar UI según la respuesta
        let newStatus;
        if (deviceId.startsWith('led')) {
            newStatus = action === 'encender' ? 'ON' : 'OFF';
        } else if (deviceId === 'motor') {
            if (action === 'detener') newStatus = 'Detenido';
            else if (action === 'girar-izquierda') newStatus = 'Giro Izquierda';
            else newStatus = 'Giro Derecha';
        }

        updateDeviceStatusUI(deviceId, newStatus);
        
        // Recargar historial
        fetchEventsHistory();

        // Mostrar notificación de éxito
        showNotification('Comando ejecutado correctamente', 'success');

    } catch (error) {
        console.error(`❌ Error al enviar comando a ${deviceId}:`, error);
        
        const errorMsg = error.response?.data?.detail || 'Error de conexión con el dispositivo';
        showNotification(errorMsg, 'error');
        
    } finally {
        // Rehabilitar botones
        buttons.forEach(btn => btn.disabled = false);
    }
}

/**
 * Muestra notificación temporal
 */
function showNotification(message, type = 'info') {
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-6 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
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

/**
 * Obtener estado actual de los dispositivos
 */
async function fetchDeviceStatus() {
    try {
        const response = await api.get('/devices/status');
        
        // Actualizar UI con estados reales
        response.data.forEach(device => {
            if (device.name === 'LED 1') {
                updateDeviceStatusUI('led1', device.status ? 'ON' : 'OFF');
            } else if (device.name === 'LED 2') {
                updateDeviceStatusUI('led2', device.status ? 'ON' : 'OFF');
            } else if (device.name === 'Motor') {
                updateDeviceStatusUI('motor', device.status || 'Detenido');
            }
        });
    } catch (error) {
        console.warn('⚠️ No se pudo obtener el estado de dispositivos:', error);
    }
}

// =========================================================
// INICIALIZACIÓN
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Módulo de Control inicializado');
    
    // Inicializar listeners para los comandos
    initControlListeners();
    
    // Cargar estado de dispositivos
    fetchDeviceStatus();
    
    // Cargar historial de eventos
    fetchEventsHistory();
    
    // Actualizar historial cada 30 segundos
    setInterval(fetchEventsHistory, 30000);
    
    // Crear iconos de Lucide
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
});