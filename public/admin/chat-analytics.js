// chat-analytics.js
// Busca daçãos do backend e renderiza gráficos/estatísticas

async function fetchAnalytics() {
    const res = await fetch('/api/chat-analytics');
    return res.json();
}

function renderStats(data) {
    document.getElementById('total-sessions').textContent = data.totalSessions;
    document.getElementById('avg-response-time').textContent = data.avgResponseTime + ' s';
    document.getElementById('user-satisfaction').textContent = data.userSatisfaction + '%';

    const ctx = document.getElementById('messagesByModuleChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.modules,
            datasets: [{
                label: 'Mensagens',
                data: data.messagesByModule,
                backgroundColor: '#0078d7'
            }]
        }
    });
}

fetchAnalytics().then(renderStats);