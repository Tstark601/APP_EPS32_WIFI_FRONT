// register.js - Modal de registro de usuario
import api from '../api/api.js';

const registerModal = document.getElementById("registerModal");
const registerForm = document.getElementById("registerForm");
const fullNameInput = document.getElementById("full_name");
const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm_password");
const createAccountBtn = document.getElementById("createAccountBtn");
const cancelRegisterBtn = document.getElementById("cancelRegisterBtn");
const showRegisterBtn = document.getElementById("showRegisterBtn");
const messageArea = document.getElementById("messageArea");

// =========================================================
// FUNCIONES DEL MODAL
// =========================================================

/**
 * Muestra el modal de registro
 */
function showModal() {
    registerModal.classList.remove("hidden");
    setTimeout(() => {
        registerModal.classList.add("opacity-100");
        registerModal.querySelector(".modal-content").classList.remove("scale-95", "opacity-0");
        registerModal.querySelector(".modal-content").classList.add("scale-100", "opacity-100");
    }, 10);
}

/**
 * Oculta el modal de registro
 */
function hideModal() {
    registerModal.classList.remove("opacity-100");
    registerModal.querySelector(".modal-content").classList.add("scale-95", "opacity-0");
    registerModal.querySelector(".modal-content").classList.remove("scale-100", "opacity-100");
    
    setTimeout(() => {
        registerModal.classList.add("hidden");
        registerForm.reset();
        messageArea.classList.add("hidden");
    }, 300);
}

/**
 * Muestra un mensaje de estado (error o éxito).
 */
function showMessage(type, content) {
    messageArea.textContent = content;
    messageArea.classList.remove("hidden", "bg-red-900", "text-red-300", "bg-green-900", "text-green-300");
    
    if (type === 'error') {
        messageArea.classList.add("bg-red-900", "text-red-300");
    } else if (type === 'success') {
        messageArea.classList.add("bg-green-900", "text-green-300");
    }
}

// =========================================================
// FUNCIÓN DE REGISTRO
// =========================================================

/**
 * Función que maneja el proceso de registro de usuario.
 */
async function handleRegister(event) {
    event.preventDefault();
    
    const fullName = fullNameInput.value.trim();
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    // 1. Validación de campos vacíos
    if (!fullName || !username || !email || !password || !confirmPassword) {
        showMessage('error', "Por favor complete todos los campos.");
        return;
    }

    // 2. Validación de contraseñas
    if (password !== confirmPassword) {
        showMessage('error', "Las contraseñas no coinciden. Por favor, revíselas.");
        return;
    }

    // 3. Validación de longitud de contraseña
    if (password.length < 6) {
        showMessage('error', "La contraseña debe tener al menos 6 caracteres.");
        return;
    }

    // 4. Validación de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('error', "Por favor ingrese un email válido.");
        return;
    }

    // Deshabilitar botón y mostrar loading
    createAccountBtn.disabled = true;
    createAccountBtn.innerHTML = `
        <svg class="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    `;
    messageArea.classList.add("hidden");

    try {
        // Preparar datos para la API
        const userData = {
            name: fullName,
            username: username,
            email: email,
            password: password,
            status: 'active'
        };

        console.log('📤 Registrando usuario:', { username, email });

        // Llamada a la API POST /api/auth/register
        const response = await api.post('/auth/register', userData);
        
        console.log('✅ Usuario registrado exitosamente:', response.data);
        
        // Mostrar mensaje de éxito
        showMessage('success', "Usuario registrado exitosamente. Puede iniciar sesión ahora.");
        
        // Cerrar modal y limpiar formulario después de 2 segundos
        setTimeout(() => {
            hideModal();
            // Opcional: Auto-llenar el username en el login
            document.getElementById("username").value = username;
            document.getElementById("username").focus();
        }, 2000);

    } catch (error) {
        console.error("❌ Error de registro:", error);
        
        let errorDetail = "Ocurrió un error inesperado al registrar.";
        
        if (error.response) {
            const status = error.response.status;
            const detail = error.response.data?.detail || error.response.data?.message;
            
            switch (status) {
                case 400:
                    errorDetail = detail || "El usuario ya existe o los datos son inválidos.";
                    break;
                case 422:
                    errorDetail = "Datos inválidos. Verifique la información ingresada.";
                    break;
                case 500:
                    errorDetail = "Error en el servidor. Intente más tarde.";
                    break;
                default:
                    errorDetail = detail || errorDetail;
            }
        } else if (error.request) {
            errorDetail = "No se pudo conectar con el servidor. Verifique su conexión.";
        }

        showMessage('error', errorDetail);
        
    } finally {
        // Rehabilitar botón
        createAccountBtn.disabled = false;
        createAccountBtn.innerHTML = 'Crear cuenta <span class="ml-2">→</span>';
    }
}

// =========================================================
// INICIALIZACIÓN Y EVENT LISTENERS
// =========================================================

export function initRegisterModal() {
    // Event listener para mostrar modal
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showModal();
        });
    }

    // Event listener para cerrar modal
    if (cancelRegisterBtn) {
        cancelRegisterBtn.addEventListener('click', hideModal);
    }

    // Cerrar modal al hacer clic fuera
    if (registerModal) {
        registerModal.addEventListener('click', (e) => {
            if (e.target === registerModal) {
                hideModal();
            }
        });
    }

    // Event listener para el formulario
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    console.log('📝 Módulo de Registro inicializado');
}

// Auto-inicializar si el DOM está listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRegisterModal);
} else {
    initRegisterModal();
}