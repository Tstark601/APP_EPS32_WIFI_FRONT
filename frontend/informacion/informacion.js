// informacion.js

// Importar la instancia de Axios si fuera necesario para una futura funcionalidad
// import api from '../api/api.js'; 

// ----------------------------------------------------------------
// FUNCIONES ESPECÍFICAS DE LA VISTA
// ----------------------------------------------------------------

/**
 * Función principal que se ejecuta al cargar el contenido de la página.
 * Si hubiera datos dinámicos a cargar (ej. datos de un endpoint /developers), 
 * se harían aquí.
 */
function initInformacionPage() {
    console.log("Módulo de Información cargado y listo.");
    
    // Ejemplo de funcionalidad si tuvieras que cargar la info de los developers dinámicamente:
    // fetchDeveloperInfo(); 
}

// ----------------------------------------------------------------
// INICIALIZACIÓN
// ----------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // Nota: El archivo components.js ya se encarga de renderizar el Sidebar y Topbar
    // y de inicializar el Modal de Logout.
    
    // Inicializamos la lógica de esta página
    initInformacionPage();

    // Re-creamos los iconos de Lucide que se hayan añadido en el HTML
    // (Esto es necesario porque la vista es renderizada antes que components.js)
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
});