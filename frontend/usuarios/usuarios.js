// usuarios.js
import api from '../api/api.js'; 
// Asumimos que tienes un showAlert como componente
// import showAlert from '../components/alerts.js'; 

const usersTableBody = document.getElementById("users-table-body");
const createUserBtn = document.getElementById("create-user-btn");
const userModal = document.getElementById("userModal");
const userForm = document.getElementById("userForm");
const cancelUserModal = document.getElementById("cancelUserModal");
const modalTitle = document.getElementById("modalTitle");
const submitBtnText = document.getElementById("submitBtnText");

let isEditMode = false;
let editingUserId = null;

// =========================================================
// Funciones de la Tabla (Listado)
// =========================================================

/**
 * Muestra los datos de los usuarios en la tabla.
 */
function renderUsers(users) {
    usersTableBody.innerHTML = ''; // Limpiar
    
    if (!users || users.length === 0) {
        usersTableBody.innerHTML = `<tr><td colspan="7" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">No hay usuarios registrados.</td></tr>`;
        return;
    }

    users.forEach(user => {
        // Simulación de estados y fechas
        const status = user.is_active ? 'Activo' : 'Inactivo';
        const statusClass = user.is_active ? 'bg-active-green/10 text-active-green border-active-green/30' : 'bg-inactive-red/10 text-inactive-red border-inactive-red/30';
        const createdDate = new Date(user.created_at).toLocaleDateString('es-CO');
        const lastLogin = user.last_login ? new Date(user.last_login).toLocaleDateString('es-CO') : 'Nunca';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <input type="checkbox" class="rounded border-gray-300 text-primary-blue focus:ring-primary-blue">
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.full_name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-3 py-1 text-xs font-semibold rounded-full border ${statusClass}">${status}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${createdDate}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${lastLogin}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                <div class="flex justify-center space-x-2">
                    <button data-id="${user.id}" data-action="edit" 
                            class="edit-btn p-1 text-primary-blue hover:text-indigo-600 rounded-md transition">
                        <svg data-lucide="edit-3" class="w-5 h-5"></svg>
                    </button>
                    <button data-id="${user.id}" data-action="delete" 
                            class="delete-btn p-1 text-inactive-red hover:text-red-600 rounded-md transition">
                        <svg data-lucide="trash-2" class="w-5 h-5"></svg>
                    </button>
                </div>
            </td>
        `;
        usersTableBody.appendChild(row);
    });

    // Añadir listeners para los botones de acción después de renderizar
    usersTableBody.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleEditUser(e.currentTarget.dataset.id));
    });
    usersTableBody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleDeleteUser(e.currentTarget.dataset.id));
    });
}

/**
 * Obtiene el listado de usuarios del backend.
 */
async function fetchUsers() {
    // Datos simulados (MOCK) para la estructura de la tabla
    const MOCK_USERS = [
        { id: 1, full_name: 'Pepito Alberto Flores', username: 'pepitof', email: 'pepito@email.com', is_active: true, created_at: '2024-02-12', last_login: '2024-03-13' },
        { id: 2, full_name: 'Ana María Gómez', username: 'anag', email: 'ana@email.com', is_active: false, created_at: '2024-03-13', last_login: null },
        { id: 3, full_name: 'Carlos Andrés Díaz', username: 'carlitos', email: 'carlos@email.com', is_active: true, created_at: '2024-04-25', last_login: '2024-05-11' },
        // ... más usuarios
    ];
    
    try {
        // REEMPLAZAR con la llamada a tu API:
        // const response = await api.get('/users/'); 
        // renderUsers(response.data); 
        
        // Usando MOCK para la demostración
        renderUsers(MOCK_USERS); 

    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        // showAlert({ title: "Error", message: "Error al cargar la lista de usuarios.", type: "error" });
    }
}

// =========================================================
// Funcionalidad del Modal (Creación y Edición)
// =========================================================

/** Muestra el modal */
function showModal() {
    userModal.classList.remove("hidden");
    setTimeout(() => {
        userModal.classList.add("opacity-100");
        userModal.querySelector("div").classList.remove("scale-95");
        userModal.querySelector("div").classList.add("scale-100");
    }, 10);
}

/** Oculta el modal y resetea el formulario */
function hideModal() {
    userModal.classList.remove("opacity-100");
    userModal.querySelector("div").classList.add("scale-95");
    userModal.querySelector("div").classList.remove("scale-100");
    
    setTimeout(() => {
        userModal.classList.add("hidden");
        userForm.reset();
        // Resetear a modo Creación
        isEditMode = false;
        editingUserId = null;
        modalTitle.textContent = "Creación de usuario";
        submitBtnText.textContent = "Crear cuenta";
        document.getElementById("password").required = true;
        document.getElementById("confirmPassword").required = true;
    }, 300);
}

/** * Maneja la edición de un usuario.
 * @param {string} userId - ID del usuario a editar.
 */
async function handleEditUser(userId) {
    editingUserId = parseInt(userId);
    isEditMode = true;
    
    modalTitle.textContent = "Editar usuario";
    submitBtnText.textContent = "Guardar cambios";
    
    // En modo edición, las contraseñas no siempre son obligatorias
    document.getElementById("password").required = false;
    document.getElementById("confirmPassword").required = false;

    // 1. Obtener datos del usuario específico de la API
    try {
        // REEMPLAZAR con la llamada a tu API para obtener 1 usuario:
        // const response = await api.get(`/users/${userId}`);
        // const user = response.data;
        
        // MOCK de datos para edición:
        const user = { full_name: 'Pepito Alberto Flores', username: 'pepitof', email: 'pepito@email.com' }; 

        // 2. Llenar los campos del formulario
        document.getElementById("fullName").value = user.full_name;
        document.getElementById("username").value = user.username;
        document.getElementById("emailAddress").value = user.email;
        document.getElementById("password").value = ''; // No cargar contraseñas
        document.getElementById("confirmPassword").value = '';

        showModal();
        
    } catch (error) {
        console.error("Error al cargar datos para edición:", error);
        // showAlert...
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

    // Validación básica de contraseñas
    if (!isEditMode && (password !== confirmPassword)) {
        alert("Las contraseñas no coinciden.");
        return;
    }
    
    if (isEditMode && password && password !== confirmPassword) {
        alert("Las nuevas contraseñas no coinciden.");
        return;
    }

    const userData = { full_name: fullName, username: username, email: email };
    
    if (password) {
        userData.password = password;
        // Opcional: añadir campo 'role' si tu API lo requiere
        // userData.role_id = 2; // Ejemplo de rol
    }


    try {
        if (isEditMode) {
            // EDICIÓN (PATCH/PUT)
            await api.patch(`/users/${editingUserId}`, userData);
            alert(`Usuario #${editingUserId} actualizado con éxito.`);
        } else {
            // CREACIÓN (POST)
            const response = await api.post('/users/', userData);
            alert(`Usuario creado con éxito: ${response.data.username}`);
        }
        
        hideModal();
        fetchUsers(); 
        
    } catch (error) {
        console.error("Error en la operación de usuario:", error.response ? error.response.data : error.message);
        alert(`Error al guardar usuario. Revise la consola.`);
    }
}


/**
 * Maneja la eliminación de un usuario.
 * @param {string} userId - ID del usuario a eliminar.
 */
async function handleDeleteUser(userId) {
    if (!confirm(`¿Está seguro de eliminar al usuario #${userId}? Esta acción es irreversible.`)) {
        return;
    }
    
    try {
        await api.delete(`/users/${userId}`);
        alert(`Usuario #${userId} eliminado con éxito.`);
        fetchUsers();
    } catch (error) {
        console.error("Error al eliminar usuario:", error);
        alert("Error al intentar eliminar el usuario.");
    }
}


// =========================================================
// Inicialización y Event Listeners
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    fetchUsers();
    
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
    
    // Event Listeners para el Modal
    createUserBtn.addEventListener('click', showModal);
    cancelUserModal.addEventListener('click', hideModal);
    userModal.addEventListener('click', (e) => {
        if (e.target === userModal) hideModal();
    });
    userForm.addEventListener('submit', handleFormSubmit);

    // Event Listener para el botón de filtros (ejemplo)
    document.getElementById("filterBtn")?.addEventListener('click', () => {
        alert("Filtros y Búsqueda: Funcionalidad a implementar para filtrar la tabla.");
    });
});