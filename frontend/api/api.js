// api.js - Configuración central de Axios para FastAPI

/**
 * Configuración de la URL base de la API
 * Cambiar según el entorno (desarrollo/producción)
 */
const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Instancia configurada de Axios
 */
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000, // 10 segundos
    headers: {
        'Content-Type': 'application/json',
    }
});

// =========================================================
// INTERCEPTOR DE PETICIONES (Request)
// =========================================================
api.interceptors.request.use(
    (config) => {
        // Agregar token de autenticación si existe
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Log para debugging (remover en producción)
        console.log(`📤 ${config.method.toUpperCase()} ${config.url}`, config.data);
        
        return config;
    },
    (error) => {
        console.error('❌ Error en la petición:', error);
        return Promise.reject(error);
    }
);

// =========================================================
// INTERCEPTOR DE RESPUESTAS (Response)
// =========================================================
api.interceptors.response.use(
    (response) => {
        // Log para debugging (remover en producción)
        console.log(`📥 ${response.config.method.toUpperCase()} ${response.config.url}`, response.data);
        
        return response;
    },
    (error) => {
        // Manejo centralizado de errores
        if (error.response) {
            // El servidor respondió con un código de estado fuera del rango 2xx
            const status = error.response.status;
            const message = error.response.data?.message || error.response.data?.detail || 'Error en el servidor';
            
            console.error(`❌ Error ${status}:`, message);
            
            switch (status) {
                case 401:
                    // No autorizado - Redirigir al login
                    console.warn('⚠️ Sesión expirada. Redirigiendo al login...');
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('username');
                    localStorage.removeItem('userFullName');
                    window.location.href = '../login/login.html';
                    break;
                    
                case 403:
                    alert('No tienes permisos para realizar esta acción.');
                    break;
                    
                case 404:
                    console.error('Recurso no encontrado');
                    break;
                    
                case 500:
                    alert('Error interno del servidor. Intente más tarde.');
                    break;
                    
                default:
                    console.error('Error no manejado:', error.response.data);
            }
        } else if (error.request) {
            // La petición se hizo pero no hubo respuesta
            console.error('❌ No se recibió respuesta del servidor:', error.request);
            alert('No se pudo conectar con el servidor. Verifique su conexión.');
        } else {
            // Algo pasó al configurar la petición
            console.error('❌ Error al configurar la petición:', error.message);
        }
        
        return Promise.reject(error);
    }
);

// =========================================================
// MÉTODOS AUXILIARES ESPECÍFICOS
// =========================================================

/**
 * Autenticación de usuario (OAuth2PasswordRequestForm compatible)
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña
 * @returns {Promise} Respuesta con token y datos de usuario
 */
api.login = async (username, password) => {
    try {
        // FastAPI OAuth2 requiere FormData, no JSON
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await axios.post(
            `${API_BASE_URL}/auth/login`,
            formData,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        // Guardar token y datos de usuario
        if (response.data.success && response.data.access_token) {
            localStorage.setItem('authToken', response.data.access_token);
            localStorage.setItem('username', response.data.user.username);
            localStorage.setItem('userFullName', response.data.user.name);
            localStorage.setItem('userEmail', response.data.user.email);
            localStorage.setItem('userId', response.data.user.id);
        }
        
        return response;
    } catch (error) {
        throw error;
    }
};

/**
 * Cerrar sesión
 */
api.logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userFullName');
    window.location.href = '../login/login.html';
};

/**
 * Verificar si el usuario está autenticado
 * @returns {boolean} True si hay un token válido
 */
api.isAuthenticated = () => {
    return !!localStorage.getItem('authToken');
};

/**
 * Obtener información del usuario actual
 * @returns {Object} Datos del usuario o null
 */
api.getCurrentUser = () => {
    const username = localStorage.getItem('username');
    const fullName = localStorage.getItem('userFullName');
    
    if (!username) return null;
    
    return {
        username,
        fullName
    };
};

// =========================================================
// ENDPOINTS ESPECÍFICOS DEL PROYECTO
// =========================================================

/**
 * Control de Dispositivos (ESP32)
 */
api.devices = {
    // Controlar LED
    controlLed: (ledId, state) => api.post(`/devices/led/${ledId}`, { state }),
    
    // Controlar Motor
    controlMotor: (action, speed = 100) => api.post('/devices/motor', { action, speed }),
    
    // Obtener estado de dispositivos
    getStatus: () => api.get('/devices/status'),
    
    // Historial de eventos
    getHistory: (params) => api.get('/devices/history', { params })
};

/**
 * Usuarios
 */
api.users = {
    // Listar todos los usuarios
    list: (params) => api.get('/users', { params }),
    
    // Obtener un usuario específico
    get: (userId) => api.get(`/users/${userId}`),
    
    // Crear usuario
    create: (userData) => api.post('/users', userData),
    
    // Actualizar usuario
    update: (userId, userData) => api.patch(`/users/${userId}`, userData),
    
    // Eliminar usuario
    delete: (userId) => api.delete(`/users/${userId}`)
};

/**
 * Dashboard y Métricas
 */
api.dashboard = {
    // Obtener métricas generales
    getMetrics: () => api.get('/dashboard/metrics'),
    
    // Eventos por dispositivo
    getEventsByDevice: () => api.get('/dashboard/events-by-device'),
    
    // Registro por usuario
    getRegistrationByUser: () => api.get('/dashboard/registration-by-user'),
    
    // Dirección del motor
    getMotorDirection: () => api.get('/dashboard/motor-direction'),
    
    // LEDs encendidos
    getLedsUsage: () => api.get('/dashboard/leds-usage'),
    
    // Uso por horas
    getLedUsageByHour: () => api.get('/dashboard/led-usage-by-hour')
};

/**
 * Reportes
 */
api.reports = {
    // Generar reporte con filtros
    generate: (params) => api.get('/reports/generate', { 
        params,
        responseType: 'blob' // Para descargar PDFs
    }),
    
    // Obtener eventos filtrados
    getFilteredEvents: (params) => api.get('/reports/events', { params })
};

// =========================================================
// EXPORTAR LA INSTANCIA
// =========================================================
export default api;