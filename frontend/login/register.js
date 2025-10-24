// ./register.js
import api from '../api/api.js'; // Ajusta la ruta si es necesario

const registerForm = document.getElementById("registerForm");
const fullNameInput = document.getElementById("full_name");
const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm_password");
const createAccountBtn = document.getElementById("createAccountBtn");
const messageArea = document.getElementById("messageArea");
const cancelBtn = document.getElementById("cancelBtn");

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

/**
 * Función que maneja el proceso de registro de usuario.
 */
async function handleRegister(event) {
    event.preventDefault();
    
    const full_name = fullNameInput.value.trim();
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const confirm_password = confirmPasswordInput.value.trim();

    // 1. Validación de Contraseñas
    if (password !== confirm_password) {
        showMessage('error', "Las contraseñas no coinciden. Por favor, revíselas.");
        return;
    }

    // 2. Preparación para la API
    createAccountBtn.disabled = true;
    createAccountBtn.textContent = "Registrando...";
    messageArea.classList.add("hidden");

    try {
        // La API de FastAPI espera un JSON con los datos del nuevo usuario
        const userData = {
            full_name: full_name,
            username: username,
            email: email,
            password: password
        };

        // 3. Llamada a la API POST /api/auth/register
        const response = await api.post('/auth/register', userData);
        
        // 4. Proceso exitoso
        showMessage('success', response.data.message || "Usuario registrado exitosamente. Serás redirigido al login.");
        
        // 5. Redirigir al login después de un breve retraso
        setTimeout(() => {
            window.location.href = './login.html'; 
        }, 3000); 

    } catch (error) {
        console.error("Error de registro:", error.response ? error.response.data : error.message);
        
        let errorDetail = "Ocurrió un error inesperado al registrar.";
        if (error.response && error.response.data && error.response.data.detail) {
            errorDetail = error.response.data.detail;
        }

        // 6. Mostrar error
        showMessage('error', errorDetail);
        
    } finally {
        // Rehabilitar botón
        createAccountBtn.disabled = false;
        createAccountBtn.innerHTML = 'Crear cuenta <span class="ml-2">→</span>';
    }
}

// =========================================================
// Inicialización y Event Listeners
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    registerForm.addEventListener('submit', handleRegister);
    
    // El botón Cancelar redirige al login
    cancelBtn.addEventListener('click', () => {
        window.location.href = './login.html';
    });
});