// login.js - Autenticación con FastAPI
import api from '../api/api.js';

const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const errorMessageDiv = document.getElementById("errorMessage");

/**
 * Función que maneja el proceso de inicio de sesión.
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    // Validación de campos vacíos
    if (!username || !password) {
        showError("Por favor, complete ambos campos.");
        return;
    }

    // Deshabilitar botón y mostrar carga
    setLoadingState(true);
    hideError();

    try {
        // Crear FormData para OAuth2PasswordRequestForm
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        // 1. Llamada a la API de autenticación
        const response = await axios.post(
            `${api.defaults.baseURL}/auth/login`, 
            formData,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const data = response.data;

        // 2. Validar respuesta exitosa
        if (data.success && data.access_token) {
            // 3. Almacenar datos de sesión
            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('userFullName', data.user.name);
            localStorage.setItem('userEmail', data.user.email);
            localStorage.setItem('userId', data.user.id);

            console.log('✅ Login exitoso:', {
                username: data.user.username,
                name: data.user.name,
                expires_at: data.expires_at
            });

            // 4. Redirigir al dashboard
            window.location.href = '../dashboard/dashboard.html';
        } else {
            showError("Respuesta del servidor inválida.");
        }

    } catch (error) {
        console.error("❌ Error de autenticación:", error);
        
        // Manejo de errores específicos
        if (error.response) {
            // El servidor respondió con un código de error
            const status = error.response.status;
            const detail = error.response.data?.detail || "Error desconocido";
            
            switch (status) {
                case 401:
                    showError("Usuario o contraseña incorrectos.");
                    break;
                case 400:
                    showError("Datos de inicio de sesión inválidos.");
                    break;
                case 500:
                    showError("Error en el servidor. Intente más tarde.");
                    break;
                default:
                    showError(`Error: ${detail}`);
            }
        } else if (error.request) {
            // La petición se hizo pero no hubo respuesta
            showError("No se pudo conectar con el servidor. Verifique su conexión.");
        } else {
            // Error al configurar la petición
            showError("Error al procesar la solicitud.");
        }
        
    } finally {
        // Rehabilitar botón
        setLoadingState(false);
    }
}

/**
 * Muestra un mensaje de error en el formulario
 */
function showError(message) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.classList.remove("hidden");
}

/**
 * Oculta el mensaje de error
 */
function hideError() {
    errorMessageDiv.classList.add("hidden");
}

/**
 * Controla el estado de carga del botón
 */
function setLoadingState(isLoading) {
    if (isLoading) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = `
            <svg class="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        `;
    } else {
        loginBtn.disabled = false;
        loginBtn.textContent = "Iniciar Sesión";
    }
}

/**
 * Verifica si ya hay una sesión activa y redirige
 */
function checkExistingSession() {
    const token = localStorage.getItem('authToken');
    if (token) {
        console.log('⚠️ Sesión activa detectada, redirigiendo...');
        // Opcional: Verificar validez del token con el backend
        // window.location.href = '../dashboard/dashboard.html';
    }
}

// =========================================================
// INICIALIZACIÓN
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    // Verificar sesión existente
    checkExistingSession();
    
    // Agregar event listener al formulario
    loginForm.addEventListener('submit', handleLogin);
    
    // Inicializar iconos de Lucide
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
    
    // Focus automático en el campo de usuario
    usernameInput.focus();
    
    console.log('🔐 Módulo de Login inicializado');
});

// Exportar para uso en otros módulos si es necesario
export { handleLogin, showError, hideError };