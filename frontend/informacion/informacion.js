// informacion.js - Página de información del proyecto
import { requireAuth } from '../auth/auth.js';

// =========================================================
// PROTECCIÓN DE RUTA
// =========================================================
if (!requireAuth()) {
    throw new Error('Acceso no autorizado');
}

// =========================================================
// FUNCIONES ESPECÍFICAS DE LA VISTA
// =========================================================

/**
 * Función principal que se ejecuta al cargar el contenido de la página.
 */
function initInformacionPage() {
    console.log('ℹ️ Módulo de Información cargado y listo.');
    
    // Aquí podrías cargar información dinámica si fuera necesario
    // Por ejemplo, información de desarrolladores desde una API
    // fetchDeveloperInfo();
}

/**
 * Animación de entrada para las tarjetas (opcional)
 */
function animateCards() {
    const cards = document.querySelectorAll('.bg-white');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'all 0.5s ease';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 50);
        }, index * 100);
    });
}

// =========================================================
// INICIALIZACIÓN
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    // Inicializamos la lógica de esta página
    initInformacionPage();
    
    // Animación opcional de entrada
    animateCards();

    // Re-creamos los iconos de Lucide
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
});