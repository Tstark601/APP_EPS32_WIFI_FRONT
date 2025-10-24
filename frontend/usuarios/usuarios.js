// usuarios.js - Gestión de usuarios (CRUD completo)
import api from '../api/api.js';
import { requireAuth } from '../auth/auth.js';

// =========================================================
// PROTECCIÓN DE RUTA
// =========================================================
if (!requireAuth()) {
    throw new Error('Acceso no autorizado');
}

const usersTableBody = document.getElementById("users-table-body");
const createUserBtn = document.getElementById("create-user-btn");
const userModal = document.getElementById("userModal");
const userForm = document.getElementById("userForm");
const cancelUserModal = document.getElementById("cancelUserModal");
const modalTitle = document.getElementById("modalTitle");
const submitBtnText = document.getElementById("submitBtnText");
const searchInput = document.getElementById("searchInput");

let isEditMode = false;
let editingUserId = null;
let usersCache = [];

// =========================================================
// FUNCIONES DE LA TABLA (LISTADO)
// =========================================================

/**
 * Muestra los datos de los usuarios en la tabla.
 */
function renderUsers(users) {
    usersTableBody.innerHTML = '';
    usersCache = users;
    
    if (!users || users.length === 0) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    No hay usuarios registrados.
                </td>
            </tr>`;
        return;
    }

    users.forEach(user => {
        const status = user.status === 'active' ? 'Activo' : 'Inactivo';
        const statusClass = user.status === 'active' 
            ? 'bg-green-100 text-green-600 border-green-300' 
            : 'bg-red-100 text-red-600 border-red-300';
        
        const createdDate = new Date(user.created_at).toLocaleDateString('es-CO');
        const lastLogin = user.last_login 
            ? new Date(user.last_login).toLocaleDateString('es-CO') 
            : 'Nunca';

        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <input type="checkbox" class="rounded border-gray-300 text-primary-blue focus:ring-primary-blue">
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${user.name || 'N/A'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${user.email || 'N/A'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-3 py-1 text-xs font-semibold rounded-full border ${statusClass}">
                    ${status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${createdDate}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${lastLogin}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                <div class="flex justify-center space-x-2">
                    <button data-id="${user.id}" data-action="edit" 
                            class="edit-btn p-2 text-primary-blue hover:bg-blue-50 rounded-md transition"
                            title="Editar usuario">
                        <svg data-lucide="edit-3" class="w-4 h-4"></svg>
                    </button>
                    <button data-id="${user.id}" data-action="delete" 
                            class="delete-btn p-2 text-red-600 hover:bg-red-50 rounded-md transition"
                            title="Eliminar usuario">
                        <svg data-lucide="trash-2" class="w-4 h-4"></svg>
                    </button>
                </div>
            </td>
        `;
        usersTableBody.appendChild(row);
    });

    // Añadir listeners después de renderizar
    usersTableBody.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleEditUser(e.currentTarget.dataset.id));
    });
    usersTableBody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleDeleteUser(e.currentTarget.dataset.id));
    });
    
    // Re-crear iconos de Lucide
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

/**
 * Obtiene el listado de usuarios del backend.
 */
async function fetchUsers() {
    try {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center space-x-2">
                        <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span class="text-sm text-gray-500">Cargando usuarios...</span>
                    </div>
                </td>
            </tr>`;

        const response = await api.get('/users');
        renderUsers(response.data);

    } catch (error) {
        console.error("❌ Error al obtener usuarios:", error);
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-sm text-red-500 text-center">
                    Error al cargar usuarios. ${error.response?.data?.detail || 'Intente más tarde.'}
                </td>
            </tr>`;
    }
}

/**
 * Filtra usuarios por búsqueda
 */
function filterUsers(searchTerm) {
    if (!searchTerm) {
        renderUsers(usersCache);
        return;
    }
    
    const filtered = usersCache.filter(user => {
        const term = searchTerm.toLowerCase();
        return (
            user.name?.toLowerCase().includes(term) ||
            user.username?.toLowerCase().includes(term) ||
            user.email?.toLowerCase().includes(term)
        );
    });
    
    renderUsers(filtered);
}

// =========================================================
// FUNCIONALIDAD DEL MODAL (CREACIÓN Y EDICIÓN)
// =========================================================

/** Muestra el modal */
function showModal() {
    userModal.classList.remove("hidden");
    setTimeout(() => {
        userModal.classList.add("opacity-100");
        userModal.querySelector("div").classList.remove("scale-95", "opacity-0");
        userModal.querySelector("div").classList.add("scale-100", "opacity-100");
    }, 10);
}

/** Oculta el modal y resetea el formulario */
function hideModal() {
    userModal.classList.remove("opacity-100");
    userModal.querySelector("div").classList.add("scale-95", "opacity-0");
    userModal.querySelector("div").classList.remove("scale-100", "opacity-100");
    
    setTimeout(() => {
        userModal.classList.add("hidden");
        userForm.reset();
        isEditMode = false;
        editingUserId = null;
        modalTitle.textContent = "Creación de usuario";
        submitBtnText.textContent = "Crear cuenta";
        document.getElementById("password").required = true;
        document.getElementById("confirmPassword").required = true;
    }, 300);
}

/**
 * Maneja la edición de un usuario.
 * @param {string} userId - ID del usuario a editar.
 */
async function handleEditUser(userId) {
    editingUserId = parseInt(userId);
    isEditMode = true;
    
    modalTitle.textContent = "Editar usuario";
    submitBtnText.textContent = "Guardar cambios";
    
    document.getElementById("password").required = false;
    document.getElementById("confirmPassword").required = false;

    try {
        const response = await api.get(`/users/${userId}`);
        const user = response.data;

        document.getElementById("fullName").value = user.name || '';
        document.getElementById("username").value = user.username || '';
        document.getElementById("emailAddress").value = user.email || '';
        document.getElementById("password").value = '';
        document.getElementById("confirmPassword").value = '';

        showModal();
        
    } catch (error) {
        console.error("❌ Error al cargar datos para edición:", error);
        alert('Error al cargar los datos del usuario.');
    }
}

/**
 * Maneja el envío del formulario (Crear o Editar).
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const fullName = document.getElementById("fullName").value.trim();
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("emailAddress").value.trim();
    const password = document.getElementById("password").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    // Validación de contraseñas
    if (!isEditMode && (password !== confirmPassword)) {
        alert("Las contraseñas no coinciden.");
        return;
    }
    
    if (isEditMode && password && password !== confirmPassword) {
        alert("Las nuevas contraseñas no coinciden.");
        return;
    }

    const userData = { 
        name: fullName, 
        username: username, 
        email: email,
        status: 'active'
    };
    
    if (password) {
        userData.password = password;
    }

    // Deshabilitar botón de submit
    const submitBtn = userForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg class="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>`;

    try {
        if (isEditMode) {
            // EDICIÓN (PATCH)
            await api.patch(`/users/${editingUserId}`, userData);
            showNotification(`Usuario actualizado con éxito`, 'success');
        } else {
            // CREACIÓN (POST)
            const response = await api.post('/users', userData);
            showNotification(`Usuario ${response.data.username} creado con éxito`, 'success');
        }
        
        hideModal();
        fetchUsers();
        
    } catch (error) {
        console.error("❌ Error en la operación de usuario:", error);
        const errorMsg = error.response?.data?.detail || 'Error al guardar usuario';
        showNotification(errorMsg, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
            <span id="submitBtnText">${isEditMode ? 'Guardar cambios' : 'Crear cuenta'}</span>
            <svg data-lucide="arrow-right" class="w-5 h-5 ml-2"></svg>`;
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }
}

/**
 * Maneja la eliminación de un usuario.
 * @param {string} userId - ID del usuario a eliminar.
 */
async function handleDeleteUser(userId) {
    const user = usersCache.find(u => u.id === parseInt(userId));
    const userName = user ? user.name || user.username : `Usuario #${userId}`;
    
    if (!confirm(`¿Está seguro de eliminar a ${userName}?\nEsta acción es irreversible.`)) {
        return;
    }
    
    try {
        await api.delete(`/users/${userId}`);
        showNotification(`Usuario eliminado con éxito`, 'success');
        fetchUsers();
    } catch (error) {
        console.error("❌ Error al eliminar usuario:", error);
        const errorMsg = error.response?.data?.detail || 'Error al eliminar usuario';
        showNotification(errorMsg, 'error');
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
    console.log('👥 Módulo de Usuarios inicializado');
    
    // Cargar usuarios al inicio
    fetchUsers();
    
    // Event Listeners para el Modal
    createUserBtn.addEventListener('click', showModal);
    cancelUserModal.addEventListener('click', hideModal);
    userModal.addEventListener('click', (e) => {
        if (e.target === userModal) hideModal();
    });
    userForm.addEventListener('submit', handleFormSubmit);

    // Event Listener para búsqueda
    searchInput.addEventListener('input', (e) => {
        filterUsers(e.target.value);
    });

    // Event Listener para el botón de filtros
    document.getElementById("filterBtn")?.addEventListener('click', () => {
        alert("Filtros avanzados: Funcionalidad a implementar");
    });
    
    // Crear iconos de Lucide
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
});