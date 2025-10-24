// dashboard.js - Dashboard con métricas y gráficos
import api from '../api/api.js';
import { requireAuth } from '../auth/auth.js';

// =========================================================
// PROTECCIÓN DE RUTA
// =========================================================
if (!requireAuth()) {
    throw new Error('Acceso no autorizado');
}

// =========================================================
// 1. CARGA DE INDICADORES (KPIs)
// =========================================================
function updateKPIs(metrics) {
    document.getElementById('metric-status').textContent = metrics.status || 'ON';
    document.getElementById('metric-led-total').textContent = metrics.ledTotalEncendidos || 0;
    document.getElementById('metric-movements').textContent = metrics.movimientosGeneral || '0 / 0';
    document.getElementById('metric-right-turns').textContent = metrics.girosDerecha || 0;
    document.getElementById('metric-left-turns').textContent = metrics.girosIzquierda || 0;
    document.getElementById('metric-stops').textContent = metrics.girosDetenidos || 0;
}

async function fetchMetrics() {
    try {
        const response = await api.get('/logs/summary');
        const data = response.data;
        
        updateKPIs({
            status: data.system_status || 'ON',
            ledTotalEncendidos: data.total_led_on || 0,
            movimientosGeneral: `${data.total_movements || 0} / ${data.total_actions || 0}`,
            girosDerecha: data.right_turns || 0,
            girosIzquierda: data.left_turns || 0,
            girosDetenidos: data.stops || 0
        });
    } catch (error) {
        console.error("❌ Error al obtener métricas:", error);
    }
}

// =========================================================
// 2. GRÁFICO EVENTOS POR DISPOSITIVO (Barra)
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
                backgroundColor: ['#1F2937', '#6366F1'],
                borderRadius: 8,
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

async function fetchEventsByDevice() {
    try {
        const response = await api.get('/logs/events-by-device');
        createEventsByDeviceChart(response.data);
    } catch (error) {
        console.error("❌ Error al obtener eventos por dispositivo:", error);
        // Usar datos de respaldo
        createEventsByDeviceChart({
            total: 0,
            data: [
                { label: 'Led Control', count: 0 },
                { label: 'Motor Paso a Paso', count: 0 }
            ]
        });
    }
}

// =========================================================
// 3. REGISTRO POR USUARIO (Barra de Progreso HTML)
// =========================================================
function renderRegistrationByUser(data) {
    const container = document.getElementById('registrationByUserList');
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">No hay datos disponibles</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="space-y-4">
            ${data.map(item => `
                <div>
                    <div class="flex justify-between text-sm mb-1">
                        <span class="font-medium text-gray-800">${item.user}</span>
                        <span class="text-primary-blue font-semibold">${item.percent}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="h-2 rounded-full bg-primary-blue transition-all duration-300" 
                             style="width: ${item.percent}%"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function fetchRegistrationByUser() {
    try {
        const response = await api.get('/logs/registration-by-user');
        renderRegistrationByUser(response.data);
    } catch (error) {
        console.error("❌ Error al obtener registro por usuario:", error);
        renderRegistrationByUser([]);
    }
}

// =========================================================
// 4 & 5. GRÁFICOS DONUT (Dirección del Motor y LED Encendidos)
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
            cutout: '75%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = data.total || 1;
                            return `${label}: ${value} (${((value / total) * 100).toFixed(1)}%)`;
                        }
                    }
                }
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

async function fetchMotorDirection() {
    try {
        const response = await api.get('/logs/motor-direction');
        createDonutChart('motorDirectionChart', response.data);
        renderLegend('motorDirectionLegend', response.data);
    } catch (error) {
        console.error("❌ Error al obtener dirección del motor:", error);
        const fallbackData = {
            total: 0,
            data: [
                { label: 'Giros Derecha', count: 0, color: '#4F46E5' },
                { label: 'Giros Izquierda', count: 0, color: '#34D399' },
                { label: 'Detenidos', count: 0, color: '#EF4444' }
            ]
        };
        createDonutChart('motorDirectionChart', fallbackData);
        renderLegend('motorDirectionLegend', fallbackData);
    }
}

async function fetchLedsUsage() {
    try {
        const response = await api.get('/logs/leds-usage');
        createDonutChart('ledsOnChart', response.data);
        renderLegend('ledsOnLegend', response.data);
    } catch (error) {
        console.error("❌ Error al obtener uso de LEDs:", error);
        const fallbackData = {
            total: 0,
            data: [
                { label: 'Led 1', count: 0, color: '#EF4444' },
                { label: 'Led 2', count: 0, color: '#10B981' }
            ]
        };
        createDonutChart('ledsOnChart', fallbackData);
        renderLegend('ledsOnLegend', fallbackData);
    }
}

// =========================================================
// 6. GRÁFICO USO DE LED POR HORAS (Línea/Área)
// =========================================================
function createLedUsageByHourChart(data) {
    const ctx = document.getElementById('ledUsageByHourChart').getContext('2d');
    
    const hours = Array.from({ length: 24 }, (_, i) => `${i < 10 ? '0' : ''}${i}:00`);
    const usageData = data || hours.map(() => 0);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [{
                label: 'Eventos por hora',
                data: usageData,
                borderColor: '#4F46E5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: { 
                    grid: { display: false },
                    ticks: { maxRotation: 45, minRotation: 45 }
                },
                y: { beginAtZero: true }
            }
        }
    });
}

async function fetchLedUsageByHour() {
    try {
        const response = await api.get('/logs/usage-by-hour');
        createLedUsageByHourChart(response.data.hourly_usage);
    } catch (error) {
        console.error("❌ Error al obtener uso por horas:", error);
        createLedUsageByHourChart(null);
    }
}

// =========================================================
// INICIALIZACIÓN COMPLETA DEL DASHBOARD
// =========================================================
async function fetchDashboardData() {
    console.log('📊 Cargando datos del dashboard...');
    
    try {
        // Cargar todas las métricas en paralelo
        await Promise.all([
            fetchMetrics(),
            fetchEventsByDevice(),
            fetchRegistrationByUser(),
            fetchMotorDirection(),
            fetchLedsUsage(),
            fetchLedUsageByHour()
        ]);
        
        console.log('✅ Dashboard cargado correctamente');
    } catch (error) {
        console.error('❌ Error al cargar el dashboard:', error);
    }
}

// =========================================================
// INICIO DE LA APLICACIÓN
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 Módulo de Dashboard inicializado');
    
    // Cargar todos los datos
    fetchDashboardData();
    
    // Actualizar datos cada 60 segundos
    setInterval(fetchDashboardData, 60000);
    
    // Crear iconos de Lucide
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
});