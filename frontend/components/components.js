// components.js - Sidebar y Topbar reutilizables

// =========================================================
// SIDEBAR
// =========================================================
function renderSidebar(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Obtener la ruta actual para marcar el elemento activo
    const currentPath = window.location.pathname;

    container.innerHTML = `
        <div class="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col justify-between">
            <div>
                <!-- Logo y Título -->
                <div class="flex items-center gap-2 p-6 font-bold text-lg">
                    <div class="bg-blue-600 p-2 rounded-lg">
                        <i data-lucide="bar-chart-3" class="w-6 h-6 text-white"></i>
                    </div>
                    <span class="text-gray-900">Motor paso a paso </span>
                </div>

                <!-- Menú de Navegación -->
                <nav class="flex flex-col gap-1 mt-4 px-2">
                    <a href="../dashboard/dashboard.html" 
                       class="nav-link flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100 transition ${currentPath.includes('dashboard') ? 'bg-blue-50 text-blue-600 font-semibold' : ''}">
                        <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
                        <span>Dashboard</span>
                    </a>
                    
                    <a href="../informacion/informacion.html" 
                       class="nav-link flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100 transition ${currentPath.includes('informacion') ? 'bg-blue-50 text-blue-600 font-semibold' : ''}">
                        <i data-lucide="info" class="w-5 h-5"></i>
                        <span>Información</span>
                    </a>
                    
                    <a href="../control/control.html" 
                       class="nav-link flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100 transition ${currentPath.includes('control') ? 'bg-blue-50 text-blue-600 font-semibold' : ''}">
                        <i data-lucide="settings" class="w-5 h-5"></i>
                        <span>Control</span>
                    </a>
                    
                    <a href="../usuarios/usuarios.html" 
                       class="nav-link flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100 transition ${currentPath.includes('usuarios') ? 'bg-blue-50 text-blue-600 font-semibold' : ''}">
                        <i data-lucide="users" class="w-5 h-5"></i>
                        <span>Usuarios</span>
                    </a>
                    
                    <a href="../reportes/reportes.html" 
                       class="nav-link flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100 transition ${currentPath.includes('reportes') ? 'bg-blue-50 text-blue-600 font-semibold' : ''}">
                        <i data-lucide="file-text" class="w-5 h-5"></i>
                        <span>Reportes</span>
                    </a>
                </nav>
            </div>

            <!-- Botón de Cerrar Sesión -->
            <div class="p-4">
                <button id="sidebarLogout" 
                        class="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-lg w-full font-medium hover:bg-indigo-700 transition shadow-md">
                    <i data-lucide="log-out" class="w-5 h-5"></i>
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </div>
    `;

    lucide.createIcons();
}

// =========================================================
// TOPBAR
// =========================================================
function renderTopbar(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Obtener nombre de usuario desde localStorage
    const username = localStorage.getItem('username') || 'Usuario';
    const userFullName = localStorage.getItem('userFullName') || username;

    container.innerHTML = `
        <header class="sticky top-0 z-10 w-full bg-white shadow-sm border-b border-gray-100">
            <div class="flex justify-end items-center h-16 px-6">
                <div class="relative">
                    <button id="userMenuButton"
                        class="flex items-center gap-2 cursor-pointer p-2 rounded-full hover:bg-gray-50 transition focus:outline-none">
                        <div class="flex items-center gap-3">
                            <img src="https://cdn-icons-png.flaticon.com/128/6676/6676016.png" 
                                 alt="User Avatar"
                                 class="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500 ring-offset-2" />
                            <span class="text-gray-800 font-medium text-sm hidden sm:block">${userFullName}</span>
                        </div>
                        <i data-lucide="chevron-down" class="w-4 h-4 text-gray-500"></i>
                    </button>

                    <!-- Dropdown Menu -->
                    <div id="userMenu"
                        class="hidden absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                        <ul class="py-2 text-sm text-gray-700">
                            <li>
                                <a href="#" class="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 transition">
                                    <i data-lucide="user" class="w-4 h-4"></i>
                                    <span>Perfil</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" class="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 transition">
                                    <i data-lucide="settings" class="w-4 h-4"></i>
                                    <span>Configuración</span>
                                </a>
                            </li>
                            <li class="border-t border-gray-100 mt-1 pt-1">
                                <a href="#" id="menuLogout" 
                                   class="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition">
                                    <i data-lucide="log-out" class="w-4 h-4"></i>
                                    <span>Cerrar sesión</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </header>
    `;

    lucide.createIcons();

    // Event Listeners para el menú desplegable
    const userMenuButton = document.getElementById("userMenuButton");
    const userMenu = document.getElementById("userMenu");

    userMenuButton.addEventListener("click", () => {
        userMenu.classList.toggle("hidden");
    });

    // Cerrar menú al hacer clic fuera
    document.addEventListener("click", (e) => {
        if (!userMenuButton.contains(e.target) && !userMenu.contains(e.target)) {
            userMenu.classList.add("hidden");
        }
    });
}

// =========================================================
// LOGOUT MODAL
// =========================================================
function initLogoutModal() {
    const logoutModal = document.getElementById("logoutModal");
    const cancelLogout = document.getElementById("cancelLogout");
    const confirmLogout = document.getElementById("confirmLogout");
    const sidebarLogout = document.getElementById("sidebarLogout");
    const menuLogout = document.getElementById("menuLogout");

    const showModal = () => {
        logoutModal.classList.remove("hidden");
        const modalContent = logoutModal.querySelector("div");
        setTimeout(() => {
            modalContent.classList.remove("scale-95", "opacity-0");
            modalContent.classList.add("scale-100", "opacity-100");
        }, 50);
    };

    const hideModal = () => {
        const modalContent = logoutModal.querySelector("div");
        modalContent.classList.remove("scale-100", "opacity-100");
        modalContent.classList.add("scale-95", "opacity-0");
        setTimeout(() => {
            logoutModal.classList.add("hidden");
        }, 300);
    };

    sidebarLogout?.addEventListener("click", showModal);
    menuLogout?.addEventListener("click", (e) => {
        e.preventDefault();
        showModal();
    });
    cancelLogout?.addEventListener("click", hideModal);
    confirmLogout?.addEventListener("click", () => {
        // Limpiar datos de sesión
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        localStorage.removeItem('userFullName');
        
        // Redirigir al login
        window.location.href = "../login/login.html";
    });
    
    logoutModal?.addEventListener("click", (e) => {
        if (e.target === logoutModal) hideModal();
    });
}

// =========================================================
// INICIALIZADOR GLOBAL
// =========================================================
function initComponents() {
    renderSidebar("sidebar");
    renderTopbar("topbar");
    initLogoutModal();
}

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComponents);
} else {
    initComponents();
}