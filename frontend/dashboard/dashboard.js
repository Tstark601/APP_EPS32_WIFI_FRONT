// dashboard.js
import api from '../api/api.js'; 

// =========================================================
// MOCKS DE DATOS (Reemplazar con llamadas a API)
// =========================================================

const MOCK_METRICS = {
    status: 'ON',
    ledTotalEncendidos: 728,
    movimientosGeneral: '64 / 70',
    girosDerecha: 728,
    girosIzquierda: 728,
    girosDetenidos: 64
};

const MOCK_EVENTS_BY_DEVICE = {
    total: 123455,
    data: [
        { label: 'Led Control', count: 700 },
        { label: 'Motor Paso a Paso', count: 300 }
    ]
};

const MOCK_REGISTRATION_BY_USER = [
    { user: 'Jhoan Acosta', count: 67890, percent: 70 },
    { user: 'Rafael Jimenez', count: 123, percent: 30 }
];

const MOCK_MOTOR_DIRECTION = {
    total: 12345,
    data: [
        { label: 'Giros Derecha', count: 35, color: '#4F46E5' }, // primary-blue
        { label: 'Giros Izquierda', count: 59, color: '#34D399' }, // green-400
        { label: 'Detenidos', count: 37, color: '#EF4444' } // red-500
    ]
};

const MOCK_LED_USAGE = {
    total: 12345,
    data: [
        { label: 'Led Encendido Giro derecha', count: 35, color: '#FBBF24' }, // led-yellow
        { label: 'Led Encendido Giro izquierda', count: 59, color: '#FBBF24' },
        { label: 'Led Encendido Detenido', count: 35, color: '#FBBF24' },
        { label: 'Led 1', count: 35, color: '#EF4444' }, // red-500
        { label: 'Led 2', count: 37, color: '#10B981' } // active-green
    ]
};

// =========================================================
// 1. Carga de Indicadores (KPIs)
// =========================================================

function updateKPIs(metrics) {
    document.getElementById('metric-status').textContent = metrics.status;
    document.getElementById('metric-led-total').textContent = metrics.ledTotalEncendidos;
    document.getElementById('metric-movements').textContent = metrics.movimientosGeneral;
    document.getElementById('metric-right-turns').textContent = metrics.girosDerecha;
    document.getElementById('metric-left-turns').textContent = metrics.girosIzquierda;
    document.getElementById('metric-stops').textContent = metrics.girosDetenidos;
}

// =========================================================
// 2. Gráfico Eventos por Dispositivo (Barra)
// =========================================================

function createEventsByDeviceChart(data) {
    document.getElementById('chart1-total').textContent = data.total.toLocaleString();
    const ctx = document.getElementById('eventsByDeviceChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.data.map(d => d.label),
            datasets: [{
                label: 'Eventos',
                data: data.data.map(d => d.count),
                backgroundColor: ['#1F2937', '#6366F1'], // Gris oscuro y motor-blue
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true }
            }
        }
    });
}

// =========================================================
// 3. Registro por Usuario (Barra de Progreso HTML)
// =========================================================

function renderRegistrationByUser(data) {
    const container = document.getElementById('registrationByUserList');
    container.innerHTML = `
        <div class="space-y-4">
            ${data.map(item => `
                <div>
                    <div class="flex justify-between text-sm mb-1">
                        <span class="font-medium text-gray-800">${item.user}</span>
                        <span class="text-primary-blue font-semibold">${item.percent}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="h-2 rounded-full bg-primary-blue" style="width: ${item.percent}%"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// =========================================================
// 4 & 5. Gráficos Donut (Dirección del Motor y LED Encendidos)
// =========================================================

function createDonutChart(elementId, data) {
    const ctx = document.getElementById(elementId).getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.data.map(d => d.label),
            datasets: [{
                data: data.data.map(d => d.count),
                backgroundColor: data.data.map(d => d.color),
                hoverOffset: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '80%', // Crea el efecto donut
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (context) => {
                    const label = context.label || '';
                    const value = context.parsed || 0;
                    return `${label}: ${value} (${((value / data.total) * 100).toFixed(1)}%)`;
                }}}
            }
        }
    });
}

function renderLegend(elementId, data) {
    const container = document.getElementById(elementId);
    container.innerHTML = `
        <p class="text-center text-sm font-semibold mb-3">Total: ${data.total.toLocaleString()}</p>
        <div class="space-y-2">
            ${data.data.map(item => `
                <div class="flex justify-between items-center text-sm text-gray-700">
                    <div class="flex items-center space-x-2">
                        <span class="w-3 h-3 rounded-full" style="background-color: ${item.color};"></span>
                        <span>${item.label}</span>
                    </div>
                    <span class="font-semibold">${item.count}</span>
                </div>
            `).join('')}
        </div>
    `;
}

// =========================================================
// 6. Gráfico Uso de Led Por Horas (Línea/Área)
// =========================================================

function createLedUsageByHourChart() {
    const ctx = document.getElementById('ledUsageByHourChart').getContext('2d');
    
    // Generar datos de uso simulados por hora (24 puntos)
    const hours = Array.from({ length: 24 }, (_, i) => `${i < 10 ? '0' : ''}${i}:00`);
    const usageData = hours.map((_, i) => Math.floor(Math.random() * 500) + 200 + (i * 20));

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [{
                label: 'Uso (minutos)',
                data: usageData,
                borderColor: '#4F46E5', // primary-blue
                backgroundColor: 'rgba(79, 70, 229, 0.2)', // Relleno de área (transparente)
                fill: true, // Rellenar área bajo la línea
                tension: 0.3, // Curva suave
                pointRadius: 0 // Ocultar puntos
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true }
            }
        }
    });
}


// =========================================================
// Inicialización
// =========================================================

async function fetchDashboardData() {
    // Aquí irían las llamadas a la API (Ejemplo: await api.get('/dashboard/metrics');)
    // Usamos los MOCKS para la demostración
    
    updateKPIs(MOCK_METRICS);
    createEventsByDeviceChart(MOCK_EVENTS_BY_DEVICE);
    renderRegistrationByUser(MOCK_REGISTRATION_BY_USER);
    
    // Motor
    createDonutChart('motorDirectionChart', MOCK_MOTOR_DIRECTION);
    renderLegend('motorDirectionLegend', MOCK_MOTOR_DIRECTION);
    
    // LED
    createDonutChart('ledsOnChart', MOCK_LED_USAGE);
    renderLegend('ledsOnLegend', MOCK_LED_USAGE);
    
    // Uso por horas
    createLedUsageByHourChart();
}


document.addEventListener('DOMContentLoaded', () => {
    fetchDashboardData();
    
    // Crear iconos de Lucide
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
});