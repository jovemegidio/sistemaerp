// ========================================
// DASHBOARD EXECUTIVO
// KPIs em Tempo Real e Análise Estratégica
// ========================================

class DashboardExecutivoManager {
    constructor() {
        this.charts = {};
        this.daçãos = {};
        this.refreshInterval = null;
        this.refreshCountdown = 30;
        this.init();
    }

    init() {
        this.carregarDaçãos();
        this.atualizarDateTime();
        this.atualizarKPIs();
        this.renderizarGraficos();
        this.renderizarAlertas();
        this.renderizarTopMateriais();
        this.renderizarPerformanceFornecedores();
        this.iniciarRefreshAutomatico();
        inicializarUsuario();
    }

    carregarDaçãos() {
        // Simular daçãos consolidaçãos do sistema
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        // Compras por mês
        this.daçãos.comprasPorMes = meses.map(() => Math.random() * 200000 + 150000);
        
        // Total do mês atual
        this.daçãos.totalMesAtual = this.daçãos.comprasPorMes[this.daçãos.comprasPorMes.length - 1];
        this.daçãos.totalMesAnterior = this.daçãos.comprasPorMes[this.daçãos.comprasPorMes.length - 2];
        
        // Economia
        this.daçãos.economiaTotal = this.daçãos.totalMesAtual * 0.095; // 9.5%
        this.daçãos.economiaAnterior = this.daçãos.totalMesAnterior * 0.082;
        
        // Pedidos
        this.daçãos.pedidosAtivos = 234;
        this.daçãos.pedidosAprovaçãos = 198;
        this.daçãos.pedidosPendentes = 36;
        
        // Prazo médio
        this.daçãos.prazoMedio = 13.2;
        this.daçãos.prazoAnterior = 15.8;
        
        // Alertas
        this.daçãos.alertasCriticos = 8;
        
        // Taxa de aprovação
        this.daçãos.taxaAprovacao = (this.daçãos.pedidosAprovaçãos / this.daçãos.pedidosAtivos) * 100;
        
        // Categorias
        this.daçãos.categorias = {
            'Matéria Prima': 45,
            'Componentes': 28,
            'Embalagens': 15,
            'Ferramentas': 8,
            'Consumíveis': 4
        };
        
        // Status pedidos
        this.daçãos.statusPedidos = {
            'Aprovação': 85,
            'Recebido': 120,
            'Parcial': 18,
            'Pendente': 11
        };
        
        // Top materiais
        this.daçãos.topMateriais = [
            { codigo: 'AL-6063-T5', descricao: 'Alumínio 6063 T5', quantidade: 12500, valor: 187500 },
            { codigo: 'COMP-101', descricao: 'Componente Elétrico', quantidade: 8500, valor: 153000 },
            { codigo: 'EMB-201', descricao: 'Embalagem Premium', quantidade: 15000, valor: 135000 },
            { codigo: 'FER-305', descricao: 'Ferramenta de Corte', quantidade: 450, valor: 121500 },
            { codigo: 'CON-450', descricao: 'Consumível Industrial', quantidade: 25000, valor: 112500 }
        ];
        
        // Fornecedores
        this.daçãos.fornecedores = [
            { nome: 'Alcoa Alumínio', entregaPrazo: 92, qualidade: 96 },
            { nome: 'Hydro Alumínio', entregaPrazo: 88, qualidade: 94 },
            { nome: 'Ferragens Brasil', entregaPrazo: 85, qualidade: 91 },
            { nome: 'Locks & Co.', entregaPrazo: 78, qualidade: 89 },
            { nome: 'Embalagens Premium', entregaPrazo: 95, qualidade: 97 }
        ];
        
        // Alertas em tempo real
        this.daçãos.alertas = [
            {
                type: 'critical',
                icon: 'fas fa-exclamation-triangle',
                title: 'Estoque Crítico',
                description: '5 materiais abaixo do mínimo - Risco de parada de produção',
                time: '2 min atrás'
            },
            {
                type: 'warning',
                icon: 'fas fa-truck',
                title: 'Entrega Atrasada',
                description: 'Pedido PC-2024-0156 com 3 dias de atraso - Alcoa Alumínio',
                time: '15 min atrás'
            },
            {
                type: 'warning',
                icon: 'fas fa-chart-line',
                title: 'Orçamento',
                description: 'Orçamento mensal atingiu 87% (R$ 435.000 de R$ 500.000)',
                time: '32 min atrás'
            },
            {
                type: 'info',
                icon: 'fas fa-file-invoice-dollar',
                title: 'Cotação Aprovada',
                description: 'Cotação COT-2024-0089 aprovada - Economia de R$ 8.500',
                time: '1h atrás'
            },
            {
                type: 'critical',
                icon: 'fas fa-times-circle',
                title: 'Divergência no Recebimento',
                description: 'NF-e 125896 com divergência de quantidade - Material AL-6063',
                time: '1h atrás'
            }
        ];
    }

    atualizarDateTime() {
        const agora = new Date();
        const opcoes = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        const dataFormatada = agora.toLocaleDateString('pt-BR', opcoes);
        document.getElementById('currentDateTime').textContent = dataFormatada;
        
        // Atualizar a cada minuto
        setTimeout(() => this.atualizarDateTime(), 60000);
    }

    atualizarKPIs() {
        // Total Compração
        const variacaoTotal = ((this.daçãos.totalMesAtual - this.daçãos.totalMesAnterior) / this.daçãos.totalMesAnterior) * 100;
        document.getElementById('kpiTotalCompração').textContent = this.formatarMoedaCompacta(this.daçãos.totalMesAtual);
        document.getElementById('kpiTotalTrend').textContent = (variacaoTotal > 0  '+' : '') + variacaoTotal.toFixed(1) + '%';
        
        // Economia
        const variacaoEconomia = ((this.daçãos.economiaTotal - this.daçãos.economiaAnterior) / this.daçãos.economiaAnterior) * 100;
        document.getElementById('kpiEconomia').textContent = this.formatarMoedaCompacta(this.daçãos.economiaTotal);
        document.getElementById('kpiEconomiaTrend').textContent = '+' + variacaoEconomia.toFixed(1) + '%';
        
        // Pedidos Ativos
        document.getElementById('kpiPedidosAtivos').textContent = this.daçãos.pedidosAtivos;
        document.getElementById('kpiPedidosTrend').textContent = '+12%';
        document.getElementById('kpiPedidosComp').textContent = `${this.daçãos.pedidosPendentes} pendentes de aprovação`;
        
        // Prazo Médio
        const variacaoPrazo = ((this.daçãos.prazoMedio - this.daçãos.prazoAnterior) / this.daçãos.prazoAnterior) * 100;
        document.getElementById('kpiPrazoMedio').textContent = Math.round(this.daçãos.prazoMedio) + 'd';
        document.getElementById('kpiPrazoTrend').textContent = variacaoPrazo.toFixed(1) + '%';
        
        const kpiPrazoTrend = document.getElementById('kpiPrazoTrend').parentElement;
        if (variacaoPrazo < 0) {
            kpiPrazoTrend.className = 'kpi-trend down';
            kpiPrazoTrend.querySelector('i').className = 'fas fa-arrow-down kpi-trend-icon';
        }
        
        // Alertas Críticos
        document.getElementById('kpiAlertasCriticos').textContent = this.daçãos.alertasCriticos;
        document.getElementById('kpiAlertasTrend').textContent = '-2 vs. semana passada';
        
        // Taxa de Aprovação
        document.getElementById('kpiTaxaAprovacao').textContent = this.daçãos.taxaAprovacao.toFixed(1) + '%';
        document.getElementById('kpiAprovacaoTrend').textContent = '+3.2%';
    }

    renderizarGraficos() {
        this.criarGraficoEvolucaoCompras();
        this.criarGraficoCategorias();
        this.criarGraficoStatusPedidos();
    }

    criarGraficoEvolucaoCompras() {
        const ctx = document.getElementById('chartEvolucaoCompras');
        if (!ctx) return;

        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        // Gerar meta (linha de referência)
        const meta = 180000;

        this.charts.evolucaoCompras = new Chart(ctx, {
            type: 'line',
            data: {
                labels: meses,
                datasets: [
                    {
                        label: 'Compras Realizadas',
                        data: this.daçãos.comprasPorMes,
                        borderColor: 'rgba(139, 92, 246, 1)',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointBackgroundColor: 'rgba(139, 92, 246, 1)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    },
                    {
                        label: 'Meta Mensal',
                        data: Array(12).fill(meta),
                        borderColor: 'rgba(16, 185, 129, 0.5)',
                        borderWidth: 2,
                        borderDash: [10, 5],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                if (context.datasetIndex === 0) {
                                    return 'Compras: ' + this.formatarMoeda(context.parsed.y);
                                }
                                return 'Meta: ' + this.formatarMoeda(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => 'R$ ' + (value / 1000).toFixed(0) + 'k'
                        }
                    }
                }
            }
        });
    }

    criarGraficoCategorias() {
        const ctx = document.getElementById('chartCategorias');
        if (!ctx) return;

        const labels = Object.keys(this.daçãos.categorias);
        const valores = Object.values(this.daçãos.categorias);

        const cores = [
            'rgba(139, 92, 246, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)'
        ];

        this.charts.categorias = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: valores,
                    backgroundColor: cores,
                    borderWidth: 3,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value}% (${percentage}% do total)`;
                            }
                        }
                    }
                }
            }
        });
    }

    criarGraficoStatusPedidos() {
        const ctx = document.getElementById('chartStatusPedidos');
        if (!ctx) return;

        const labels = Object.keys(this.daçãos.statusPedidos);
        const valores = Object.values(this.daçãos.statusPedidos);

        const cores = {
            'Aprovação': 'rgba(245, 158, 11, 0.8)',
            'Recebido': 'rgba(16, 185, 129, 0.8)',
            'Parcial': 'rgba(59, 130, 246, 0.8)',
            'Pendente': 'rgba(239, 68, 68, 0.8)'
        };

        this.charts.statusPedidos = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Quantidade',
                    data: valores,
                    backgroundColor: labels.map(l => cores[l]),
                    borderRadius: 10,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.label}: ${context.parsed.y} pedidos`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 20
                        }
                    }
                }
            }
        });
    }

    renderizarAlertas() {
        const container = document.getElementById('alertasTempoReal');
        if (!container) return;

        container.innerHTML = '';

        this.daçãos.alertas.forEach(alerta => {
            const div = document.createElement('div');
            div.className = `alert-item ${alerta.type}`;
            
            div.innerHTML = `
                <div class="alert-icon ${alerta.type}">
                    <i class="${alerta.icon}"></i>
                </div>
                <div class="alert-content">
                    <div class="alert-title">${alerta.title}</div>
                    <div class="alert-description">${alerta.description}</div>
                    <div class="alert-time">${alerta.time}</div>
                </div>
            `;

            container.appendChild(div);
        });
    }

    renderizarTopMateriais() {
        const container = document.getElementById('topMateriais');
        if (!container) return;

        container.innerHTML = '';

        this.daçãos.topMateriais.forEach((material, index) => {
            const div = document.createElement('div');
            div.className = 'top-item';
            
            let rankClass = '';
            if (index === 0) rankClass = 'gold';
            else if (index === 1) rankClass = 'silver';
            else if (index === 2) rankClass = 'bronze';
            
            div.innerHTML = `
                <div class="top-rank ${rankClass}">${index + 1}</div>
                <div class="top-info">
                    <div class="top-name">${material.codigo}</div>
                    <div class="top-detail">${material.descricao}</div>
                </div>
                <div class="top-value">${this.formatarMoedaCompacta(material.valor)}</div>
            `;

            container.appendChild(div);
        });
    }

    renderizarPerformanceFornecedores() {
        const container = document.getElementById('performanceFornecedores');
        if (!container) return;

        container.innerHTML = '';

        this.daçãos.fornecedores.forEach(fornecedor => {
            const mediaPerformance = (fornecedor.entregaPrazo + fornecedor.qualidade) / 2;
            
            const div = document.createElement('div');
            div.className = 'performance-indicator';
            
            const corPrazo = fornecedor.entregaPrazo >= 90  '#10b981' : fornecedor.entregaPrazo >= 75  '#f59e0b' : '#ef4444';
            const corQualidade = fornecedor.qualidade >= 95  '#10b981' : fornecedor.qualidade >= 85  '#f59e0b' : '#ef4444';
            
            div.innerHTML = `
                <div class="performance-label">${fornecedor.nome}</div>
                <div class="performance-bar-wrapper">
                    <div class="performance-bar-bg">
                        <div class="performance-bar-fill" style="width: ${fornecedor.entregaPrazo}%; background: ${corPrazo};"></div>
                    </div>
                </div>
                <div class="performance-value" style="color: ${corPrazo};">${fornecedor.entregaPrazo}%</div>
            `;

            container.appendChild(div);
        });
    }

    iniciarRefreshAutomatico() {
        // Atualizar contaçãor a cada segundo
        setInterval(() => {
            this.refreshCountdown--;
            
            if (this.refreshCountdown <= 0) {
                this.refreshCountdown = 30;
                this.atualizarDaçãosTempoReal();
            }
            
            document.getElementById('refreshTimer').textContent = this.refreshCountdown + 's';
        }, 1000);
    }

    atualizarDaçãosTempoReal() {
        // Simular atualização de daçãos em tempo real
        
        // Pequenas variações nos KPIs
        const variacao = (Math.random() - 0.5) * 0.02; // ±1%
        this.daçãos.totalMesAtual *= (1 + variacao);
        
        // Atualizar alertas críticos
        if (Math.random() > 0.7) {
            this.daçãos.alertasCriticos += Math.random() > 0.5  1 : -1;
            this.daçãos.alertasCriticos = Math.max(0, this.daçãos.alertasCriticos);
        }
        
        // Atualizar KPIs
        this.atualizarKPIs();
        
        // Atualizar gráficos
        Object.values(this.charts).forEach(chart => {
            chart.update('none'); // Sem animação para atualização em tempo real
        });
        
        // Feedback visual
        const refreshTimer = document.getElementById('refreshTimer');
        refreshTimer.style.color = '#10b981';
        setTimeout(() => {
            refreshTimer.style.color = '';
        }, 500);
    }

    toggleChartPeriod() {
        alert('Alternando período do gráfico...\n\nOpções:\n- Últimos 7 dias\n- Último mês\n- Últimos 3 meses\n- Último ano');
    }

    marcarTodosLidos() {
        if (confirm('Marcar todos os alertas como lidos')) {
            const alertas = document.querySelectorAll('.alert-item');
            alertas.forEach(alerta => {
                alerta.style.opacity = '0.5';
            });
        }
    }

    formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }

    formatarMoedaCompacta(valor) {
        if (valor >= 1000000) {
            return 'R$ ' + (valor / 1000000).toFixed(2) + 'M';
        } else if (valor >= 1000) {
            return 'R$ ' + (valor / 1000).toFixed(1) + 'k';
        }
        return this.formatarMoeda(valor);
    }
}

// Funções globais
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    
    const icon = document.querySelector('#btnModoEscuro i');
    icon.className = isDark  'fas fa-sun' : 'fas fa-moon';
    
    if (dashboardManager && dashboardManager.charts) {
        Object.values(dashboardManager.charts).forEach(chart => chart.update());
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    menu.style.display = menu.style.display === 'block'  'none' : 'block';
}

function inicializarUsuario() {
    const agora = new Date();
    const hora = agora.getHours();
    let saudacao = 'Bom dia';
    
    if (hora >= 12 && hora < 18) saudacao = 'Boa tarde';
    else if (hora >= 18 || hora < 5) saudacao = 'Boa noite';

    // Buscar daçãos do usuário do localStorage
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    // Usar apelido se disponível, senão primeiro nome
    const primeiroNome = userData.apelido || (userData.nome  userData.nome.split(' ')[0] : 'Executivo');
    
    const userGreeting = document.getElementById('userGreeting');
    if (userGreeting) {
        userGreeting.textContent = `${saudacao}, ${primeiroNome}`;
    }
}

// Fechar menu ao clicar fora
document.addEventListener('click', function(event) {
    const userProfile = document.querySelector('.user-profile');
    const userMenu = document.getElementById('userMenu');
    
    if (userProfile && userMenu && !userProfile.contains(event.target)) {
        userMenu.style.display = 'none';
    }
});

// Inicializar
let dashboardManager;
document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        const icon = document.querySelector('#btnModoEscuro i');
        if (icon) icon.className = 'fas fa-sun';
    }

    dashboardManager = new DashboardExecutivoManager();
});
