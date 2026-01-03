/**
 * ============================================
 * DASHBOARD PROFISSIONAL DE COMPRAS - ALUFORCE
 * Sistema completo de gestão de compras
 * Versão: 2.0
 * ============================================
 */

class ComprasDashboard {
    constructor() {
        this.charts = {};
        this.data = {
            metricas: {},
            comprasMensais: [],
            categorias: [],
            ordensRecentes: [],
            topFornecedores: []
        };
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando Dashboard de Compras...');
        await this.carregarDados();
        this.renderizarMetricas();
        this.renderizarGraficos();
        this.renderizarTabelaOrdens();
        this.renderizarTabelaFornecedores();
        this.renderizarAlertas();
        this.iniciarAtualizacaoAutomatica();
        console.log('✅ Dashboard carregado com sucesso!');
    }

    async carregarDados() {
        try {
            // Métricas principais
            this.data.metricas = {
                totalCompras: {
                    valor: 487320.00,
                    variacao: 12.3,
                    mes: 'Dezembro 2025'
                },
                ordensCompra: {
                    total: 156,
                    pendentes: 23,
                    aprovadas: 89,
                    entregues: 44
                },
                fornecedoresAtivos: {
                    total: 89,
                    novos: 5,
                    premium: 34
                },
                economiaObtida: {
                    valor: 23580.00,
                    percentual: 4.8
                }
            };

            // Evolução mensal das compras
            this.data.comprasMensais = [
                { mes: 'Jan', valor: 385000, ordens: 142 },
                { mes: 'Fev', valor: 398000, ordens: 148 },
                { mes: 'Mar', valor: 412000, ordens: 151 },
                { mes: 'Abr', valor: 395000, ordens: 145 },
                { mes: 'Mai', valor: 423000, ordens: 154 },
                { mes: 'Jun', valor: 438000, ordens: 159 },
                { mes: 'Jul', valor: 445000, ordens: 162 },
                { mes: 'Ago', valor: 431000, ordens: 157 },
                { mes: 'Set', valor: 449000, ordens: 163 },
                { mes: 'Out', valor: 458000, ordens: 166 },
                { mes: 'Nov', valor: 463000, ordens: 168 },
                { mes: 'Dez', valor: 487320, ordens: 156 }
            ];

            // Categorias de compras
            this.data.categorias = [
                { nome: 'Matéria Prima', valor: 234500.00, percentual: 48.1, cor: '#3b82f6' },
                { nome: 'Componentes', valor: 128900.00, percentual: 26.5, cor: '#8b5cf6' },
                { nome: 'Embalagens', valor: 67800.00, percentual: 13.9, cor: '#10b981' },
                { nome: 'Ferramentas', valor: 35420.00, percentual: 7.3, cor: '#f59e0b' },
                { nome: 'Outros', valor: 20700.00, percentual: 4.2, cor: '#6b7280' }
            ];

            // Ordens recentes
            this.data.ordensRecentes = [
                {
                    id: 'OC-2025-089',
                    fornecedor: 'Fornecedor XYZ Ltda',
                    data: '08/12/2025',
                    valor: 28450.00,
                    prazo: '15/12/2025',
                    status: 'PENDENTE'
                },
                {
                    id: 'OC-2025-088',
                    fornecedor: 'Industrial Bahia Ltd',
                    data: '07/12/2025',
                    valor: 45320.00,
                    prazo: '20/12/2025',
                    status: 'APROVADO'
                },
                {
                    id: 'OC-2025-087',
                    fornecedor: 'Distribuidora Sul',
                    data: '05/12/2025',
                    valor: 18900.00,
                    prazo: '10/12/2025',
                    status: 'ENTREGUE'
                },
                {
                    id: 'OC-2025-086',
                    fornecedor: 'Cabo Alumínio Shop',
                    data: '04/12/2025',
                    valor: 67890.00,
                    prazo: '12/12/2025',
                    status: 'EM TRÂNSITO'
                },
                {
                    id: 'OC-2025-085',
                    fornecedor: 'Metalúrgica Norte',
                    data: '03/12/2025',
                    valor: 52100.00,
                    prazo: '18/12/2025',
                    status: 'APROVADO'
                }
            ];

            // Top fornecedores
            this.data.topFornecedores = [
                {
                    rank: 1,
                    nome: 'Fornecedor XYZ Ltda',
                    compras: 45,
                    valorTotal: 234500.00,
                    performance: 95
                },
                {
                    rank: 2,
                    nome: 'Industrial Bahia Ltd',
                    compras: 38,
                    valorTotal: 198700.00,
                    performance: 92
                },
                {
                    rank: 3,
                    nome: 'Distribuidora Sul',
                    compras: 32,
                    valorTotal: 167800.00,
                    performance: 88
                },
                {
                    rank: 4,
                    nome: 'Cabo Alumínio Shop',
                    compras: 28,
                    valorTotal: 145300.00,
                    performance: 90
                },
                {
                    rank: 5,
                    nome: 'Metalúrgica Norte',
                    compras: 25,
                    valorTotal: 128900.00,
                    performance: 94
                }
            ];

        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
        }
    }

    renderizarMetricas() {
        // Mini gráfico de evolução
        this.criarMiniGraficoCompras();
    }

    criarMiniGraficoCompras() {
        const canvas = document.getElementById('chartComprasTotal');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const ultimos6Meses = this.data.comprasMensais.slice(-6);

        this.charts.miniCompras = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ultimos6Meses.map(m => m.mes),
                datasets: [{
                    data: ultimos6Meses.map(m => m.valor),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: (context) => this.formatarMoeda(context.parsed.y)
                        }
                    }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    }

    renderizarGraficos() {
        this.criarGraficoEvolucao();
        this.criarGraficoCategorias();
    }

    criarGraficoEvolucao() {
        const canvas = document.getElementById('chartEvolucaoCompras');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        this.charts.evolucao = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.data.comprasMensais.map(m => m.mes),
                datasets: [{
                    label: 'Valor de Compras',
                    data: this.data.comprasMensais.map(m => m.valor),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#8b5cf6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(31, 41, 55, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#8b5cf6',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: (context) => `Compras: ${this.formatarMoeda(context.parsed.y)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 12,
                                weight: 600
                            },
                            color: '#6b7280'
                        }
                    },
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: '#f3f4f6',
                            drawBorder: false
                        },
                        ticks: {
                            font: {
                                size: 12
                            },
                            color: '#6b7280',
                            callback: (value) => this.formatarMoedaAbreviada(value)
                        }
                    }
                }
            }
        });
    }

    criarGraficoCategorias() {
        const canvas = document.getElementById('chartCategoriasCompras');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        this.charts.categorias = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: this.data.categorias.map(c => c.nome),
                datasets: [{
                    data: this.data.categorias.map(c => c.valor),
                    backgroundColor: this.data.categorias.map(c => c.cor),
                    borderWidth: 4,
                    borderColor: '#fff',
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(31, 41, 55, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#8b5cf6',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: (context) => {
                                const cat = this.data.categorias[context.dataIndex];
                                return [
                                    `${cat.nome}: ${this.formatarMoeda(cat.valor)}`,
                                    `${cat.percentual}% do total`
                                ];
                            }
                        }
                    }
                }
            }
        });

        this.renderizarLegendaCategorias();
    }

    renderizarLegendaCategorias() {
        const container = document.getElementById('legendaCategories');
        if (!container) return;

        container.innerHTML = this.data.categorias.map(cat => `
            <div class="pie-legend-item">
                <div class="legend-color" style="background: ${cat.cor}"></div>
                <div class="legend-info">
                    <div class="legend-name">${cat.nome}</div>
                    <div class="legend-stats">
                        <span class="legend-value">${this.formatarMoeda(cat.valor)}</span>
                        <span class="legend-percent">${cat.percentual}%</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderizarTabelaOrdens() {
        const tbody = document.getElementById('ordensTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.data.ordensRecentes.map(ordem => `
            <tr>
                <td><span class="ordem-id">${ordem.id}</span></td>
                <td>
                    <div class="fornecedor-info">
                        <i class="fas fa-building"></i>
                        ${ordem.fornecedor}
                    </div>
                </td>
                <td>${ordem.data}</td>
                <td><span class="valor-compra">${this.formatarMoeda(ordem.valor)}</span></td>
                <td>${ordem.prazo}</td>
                <td><span class="status-badge status-${ordem.status.toLowerCase().replace(' ', '-')}">${ordem.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action" title="Ver detalhes" onclick="dashboard.verDetalhesOrdem('${ordem.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action" title="Editar" onclick="dashboard.editarOrdem('${ordem.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderizarTabelaFornecedores() {
        const tbody = document.getElementById('fornecedoresTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.data.topFornecedores.map(forn => `
            <tr>
                <td>
                    <div class="fornecedor-rank">
                        <div class="rank-badge">${forn.rank}</div>
                    </div>
                </td>
                <td><span class="fornecedor-name">${forn.nome}</span></td>
                <td>${forn.compras}</td>
                <td><span class="valor-compra">${this.formatarMoeda(forn.valorTotal)}</span></td>
                <td>
                    <div class="performance-bar">
                        <div class="performance-track">
                            <div class="performance-fill" style="width: ${forn.performance}%"></div>
                        </div>
                        <span class="performance-label">${forn.performance}%</span>
                    </div>
                </td>
            </tr>
        `).join('');

        // Animar barras de performance
        setTimeout(() => {
            document.querySelectorAll('.performance-fill').forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';
                setTimeout(() => bar.style.width = width, 100);
            });
        }, 100);
    }

    renderizarAlertas() {
        const container = document.getElementById('alertsContainer');
        if (!container) return;

        const alertas = [
            {
                tipo: 'info',
                icon: 'fa-info-circle',
                titulo: '23 ordens pendentes de aprovação',
                mensagem: 'Existem ordens de compra aguardando análise e aprovação.'
            },
            {
                tipo: 'warning',
                icon: 'fa-exclamation-triangle',
                titulo: '5 entregas com prazo próximo',
                mensagem: 'Acompanhe as entregas programadas para esta semana.'
            }
        ];

        container.innerHTML = alertas.map(alert => `
            <div class="alert alert-${alert.tipo}">
                <i class="fas ${alert.icon} alert-icon"></i>
                <div class="alert-content">
                    <div class="alert-title">${alert.titulo}</div>
                    <div class="alert-message">${alert.mensagem}</div>
                </div>
            </div>
        `).join('');
    }

    // Ações
    verDetalhesOrdem(ordemId) {
        console.log(`📋 Ver detalhes da ordem: ${ordemId}`);
        // Implementar modal ou navegação para detalhes
        alert(`Visualizando ordem ${ordemId}\n\nEsta funcionalidade será implementada em breve.`);
    }

    editarOrdem(ordemId) {
        console.log(`✏️ Editar ordem: ${ordemId}`);
        // Implementar edição
        alert(`Editando ordem ${ordemId}\n\nEsta funcionalidade será implementada em breve.`);
    }

    async atualizarDados() {
        console.log('🔄 Atualizando dados do dashboard...');
        
        // Simular loading
        const btn = event.target.closest('button');
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
        btn.disabled = true;

        await new Promise(resolve => setTimeout(resolve, 1500));

        await this.carregarDados();
        this.renderizarTabelaOrdens();
        this.renderizarTabelaFornecedores();
        this.renderizarAlertas();

        btn.innerHTML = originalContent;
        btn.disabled = false;
        
        console.log('✅ Dados atualizados!');
    }

    iniciarAtualizacaoAutomatica() {
        // Atualizar dados a cada 5 minutos
        setInterval(() => {
            console.log('🔄 Atualização automática...');
            this.carregarDados();
        }, 300000);
    }

    // Utilitários
    formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }

    formatarMoedaAbreviada(valor) {
        if (valor >= 1000000) {
            return `R$ ${(valor / 1000000).toFixed(1)}M`;
        } else if (valor >= 1000) {
            return `R$ ${(valor / 1000).toFixed(0)}K`;
        }
        return this.formatarMoeda(valor);
    }

    formatarData(data) {
        return new Date(data).toLocaleDateString('pt-BR');
    }

    formatarPercentual(valor) {
        return `${valor.toFixed(1)}%`;
    }
}

// Funções Globais do Header
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    
    const btn = document.getElementById('btnModoEscuro');
    if (btn) {
        btn.querySelector('i').className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function toggleView(mode) {
    const btnGrid = document.getElementById('btnViewGrid');
    const btnList = document.getElementById('btnViewList');
    
    if (mode === 'grid') {
        btnGrid?.classList.add('active');
        btnList?.classList.remove('active');
        // Implementar vista em grade
    } else {
        btnList?.classList.add('active');
        btnGrid?.classList.remove('active');
        // Vista em lista (padrão)
    }
}

function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    menu?.classList.toggle('show');
}

function inicializarUsuario() {
    // Buscar dados do usuário do localStorage
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const usuario = {
        nome: userData.nome || 'Administrador',
        apelido: userData.apelido || null,
        cargo: userData.cargo || 'Gestor de Compras',
        avatar: userData.foto || userData.avatar || null
    };

    const userGreeting = document.getElementById('userGreeting');
    const userRole = document.getElementById('userRole');
    const userAvatar = document.getElementById('userAvatar');

    if (userGreeting) {
        const hora = new Date().getHours();
        let saudacao = 'Bom dia';
        if (hora >= 12 && hora < 18) saudacao = 'Boa tarde';
        else if (hora >= 18 || hora < 5) saudacao = 'Boa noite';
        
        // Usar apelido se disponível, senão primeiro nome
        const primeiroNome = usuario.apelido || (usuario.nome ? usuario.nome.split(' ')[0] : 'Usuário');
        userGreeting.textContent = `${saudacao}, ${primeiroNome}`;
    }

    if (userRole) {
        userRole.textContent = usuario.cargo;
    }

    if (userAvatar && usuario.avatar) {
        userAvatar.innerHTML = `<img src="${usuario.avatar}" alt="${usuario.nome}">`;
    } else if (userAvatar) {
        const iniciais = usuario.nome.split(' ').map(n => n[0]).join('').substring(0, 2);
        userAvatar.innerHTML = `<span>${iniciais}</span>`;
    }
}

// Inicialização quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.dashboard = new ComprasDashboard();
        inicializarUsuario();
        
        // Verificar dark mode salvo
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            const btn = document.getElementById('btnModoEscuro');
            if (btn) btn.querySelector('i').className = 'fas fa-sun';
        }
    });
} else {
    window.dashboard = new ComprasDashboard();
    inicializarUsuario();
    
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('btnModoEscuro');
        if (btn) btn.querySelector('i').className = 'fas fa-sun';
    }
}

// Fechar menu ao clicar fora
document.addEventListener('click', (e) => {
    const userProfile = document.querySelector('.user-profile');
    const userMenu = document.getElementById('userMenu');
    if (userMenu && userProfile && !userProfile.contains(e.target)) {
        userMenu.classList.remove('show');
    }
});
