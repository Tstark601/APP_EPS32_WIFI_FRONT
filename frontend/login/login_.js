// login.js
import api from './api/api.js'; // Asumimos que la carpeta api está en el mismo nivel

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

    if (!username || !password) {
        errorMessageDiv.textContent = "Por favor, complete ambos campos.";
        errorMessageDiv.classList.remove("hidden");
        return;
    }

    // Deshabilitar botón y mostrar carga
    loginBtn.disabled = true;
    loginBtn.textContent = "Cargando...";
    errorMessageDiv.classList.add("hidden");

try {
    // Para FastAPI OAuth2PasswordRequestForm, se recomienda usar FormData
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    // Si tu axios está configurado para manejar FormData, esto funcionará:
    const response = await api.post('/auth/login', formData); 

    // 2. Proceso exitoso (adaptar a la respuesta de tu backend)
    // FastAPI devuelve el token y el tipo directamente:
    const token = response.data.access_token;
    
    // 3. Almacenar datos de sesión (ajustar las claves según la respuesta de tu backend)
    localStorage.setItem('authToken', token);
    
    // 📌 NOTA: Tu backend debe devolver 'user' o hacer una llamada adicional 
    // para obtener el nombre completo. Asumo que el endpoint /login devuelve 
    // al menos el token.
    
    // Redirigir al dashboard
    window.location.href = './dashboard/dashboard.html';}
    catch (error) {
        console.error("Error de autenticación:", error.response ? error.response.data : error.message);
        
        // Mostrar error
        errorMessageDiv.textContent = "Usuario o contraseña incorrectos. Intente de nuevo.";
        errorMessageDiv.classList.remove("hidden");
        
    } finally {
        // Rehabilitar botón
        loginBtn.disabled = false;
        loginBtn.textContent = "Iniciar Sesión";
    }
}

// =========================================================
// Inicialización
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    loginForm.addEventListener('submit', handleLogin);
    
    // Opcional: Revisar si ya existe un token y redirigir automáticamente
    if (localStorage.getItem('authToken')) {
        // Podríamos hacer una llamada de verificación de token aquí.
        // Por simplicidad, redirigimos directamente.
        // window.location.href = './dashboard/dashboard.html';
    }
});