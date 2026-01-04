/**
 * Dashboard Profissional de NFe & Logística - Aluforce
 * Controle completo de notas fiscais e rastreamento
 */

class NFeDashboard {
    constructor() {
        this.charts = {};
        this.data = {
            metricas: {},
            nfes: [],
            transportaçãoras: []
        };
        this.init();
    }

    async init() {
        await this.carregarDaçãos();
        this.renderizarMetricas();
        this.renderizarGraficos();
        this.renderizarTabelaNFes();
        this.renderizarMapaLogistica();
        this.iniciarAtualizacaoAutomatica();
    }

    async carregarDaçãos() {
        try {
            this.data.metricas = {
                nfesEmitidas: {
                    total: 342,
                    mes: 'Dezembro',
                    variacao: 18.5
                },
                valorTotal: {
                    valor: 1247890.00,
                    variacao: 22.3
                },
                taxaAprovacao: {
                    percentual: 98.2,
                    rejeitadas: 6
                },
                tempoMedioEmissao: {
                    minutos: 3.5,
                    variacao: -12.5
                }
            };

            this.data.statusDistribuicao = [
                { status: 'Autorizada', quantidade: 287, percentual: 83.9, cor: '#10b981' },
                { status: 'Transmitida', quantidade: 42, percentual: 12.3, cor: '#3b82f6' },
                { status: 'Rejeitada', quantidade: 6, percentual: 1.8, cor: '#ef4444' },
                { status: 'Cancelada', quantidade: 7, percentual: 2.0, cor: '#6b7280' }
            ];

            this.data.nfesMensais = [
                { mes: 'Jan', quantidade: 245, valor: 892000 },
                { mes: 'Fev', quantidade: 268, valor: 945000 },
                { mes: 'Mar', quantidade: 289, valor: 1023000 },
                { mes: 'Abr', quantidade: 271, valor: 978000 },
                { mes: 'Mai', quantidade: 302, valor: 1089000 },
                { mes: 'Jun', quantidade: 318, valor: 1145000 },
                { mes: 'Jul', quantidade: 325, valor: 1167000 },
                { mes: 'Ago', quantidade: 312, valor: 1098000 },
                { mes: 'Set', quantidade: 329, valor: 1189000 },
                { mes: 'Out', quantidade: 335, valor: 1212000 },
                { mes: 'Nov', quantidade: 338, valor: 1234000 },
                { mes: 'Dez', quantidade: 342, valor: 1247890 }
            ];

            this.data.nfesRecentes = [
                {
                    número: '000342',
                    serie: '001',
                    cliente: 'CONSTRUTORA ABC LTDA',
                    data: '10/12/2025 14:32',
                    valor: 45678.90,
                    status: 'AUTORIZADA',
                    chave: '35251243818589000195550010003420001234567890'
                },
                {
                    número: '000341',
                    serie: '001',
                    cliente: 'INDÚSTRIA XYZ S/A',
                    data: '10/12/2025 11:15',
                    valor: 32145.50,
                    status: 'TRANSMITIDA',
                    chave: '35251243818589000195550010003410001234567889'
                },
                {
                    número: '000340',
                    serie: '001',
                    cliente: 'COMERCIAL DEF',
                    data: '09/12/2025 16:48',
                    valor: 18920.00,
                    status: 'AUTORIZADA',
                    chave: '35251243818589000195550010003400001234567888'
                },
                {
                    número: '000339',
                    serie: '001',
                    cliente: 'METALÚRGICA GHI',
                    data: '09/12/2025 10:22',
                    valor: 67890.00,
                    status: 'AUTORIZADA',
                    chave: '35251243818589000195550010003390001234567887'
                },
                {
                    número: '000338',
                    serie: '001',
                    cliente: 'DISTRIBUIDORA JKL',
                    data: '08/12/2025 15:05',
                    valor: 23456.80,
                    status: 'CANCELADA',
                    chave: '35251243818589000195550010003380001234567886'
                }
            ];

            this.data.logística = [
                { 
                    nfe: '000342',
                    destino: 'São Paulo - SP',
                    transportaçãora: 'TRANSPORTADORA RÁPIDA',
                    status: 'Em Trânsito',
                    previsao: '15/12/2025',
                    lat: -23.5505,
                    lng: -46.6333
                },
                {
                    nfe: '000341',
                    destino: 'Rio de Janeiro - RJ',
                    transportaçãora: 'LOGÍSTICA EXPRESS',
                    status: 'Coletação',
                    previsao: '14/12/2025',
                    lat: -22.9068,
                    lng: -43.1729
                },
                {
                    nfe: '000340',
                    destino: 'Belo Horizonte - MG',
                    transportaçãora: 'TRANSPORTES MINAS',
                    status: 'Entregue',
                    previsao: '12/12/2025',
                    lat: -19.9167,
                    lng: -43.9345
                }
            ];

        } catch (error) {
            console.error('Erro ao carregar daçãos NFe:', error);
        }
    }

    renderizarMetricas() {
        const container = document.getElementById('nfe-metricas-dashboard');
        if (!container) return;

        const { nfesEmitidas, valorTotal, taxaAprovacao, tempoMedioEmissao } = this.data.metricas;

        container.innerHTML = `
            <!-- NFes Emitidas -->
            <div class="metric-card nfes-emitidas animate-fade-in">
                <div class="metric-header">
                    <div class="metric-icon-wrapper">
                        <div class="metric-icon">
                            <i class="fas fa-file-invoice"></i>
                        </div>
                    </div>
                    <div class="metric-trend trend-${nfesEmitidas.variacao >= 0  'positive' : 'negative'}">
                        <i class="fas fa-arrow-${nfesEmitidas.variacao >= 0  'up' : 'down'}"></i>
                        <span>${Math.abs(nfesEmitidas.variacao).toFixed(1)}%</span>
                    </div>
                </div>
                <div class="metric-body">
                    <h3 class="metric-title">NFes Emitidas</h3>
                    <p class="metric-value" data-count="${nfesEmitidas.total}">${nfesEmitidas.total}</p>
                    <p class="metric-subtitle">${nfesEmitidas.mes} 2025</p>
                </div>
                <div class="metric-chart">
                    <canvas id="chart-nfes-mini" width="100" height="40"></canvas>
                </div>
            </div>

            <!-- Valor Total -->
            <div class="metric-card valor-total-nfe animate-fade-in" style="animation-delay: 0.1s">
                <div class="metric-header">
                    <div class="metric-icon-wrapper">
                        <div class="metric-icon">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                    </div>
                    <div class="metric-trend trend-${valorTotal.variacao >= 0  'positive' : 'negative'}">
                        <i class="fas fa-arrow-${valorTotal.variacao >= 0  'up' : 'down'}"></i>
                        <span>${Math.abs(valorTotal.variacao).toFixed(1)}%</span>
                    </div>
                </div>
                <div class="metric-body">
                    <h3 class="metric-title">Valor Total</h3>
                    <p class="metric-value">R$ ${this.formatarMoeda(valorTotal.valor)}</p>
                    <p class="metric-subtitle">Em notas autorizadas</p>
                </div>
                <div class="metric-chart">
                    <canvas id="chart-valor-mini" width="100" height="40"></canvas>
                </div>
            </div>

            <!-- Taxa de Aprovação -->
            <div class="metric-card taxa-aprovacao animate-fade-in" style="animation-delay: 0.2s">
                <div class="metric-header">
                    <div class="metric-icon-wrapper">
                        <div class="metric-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                    </div>
                    <div class="metric-badge-error">
                        <i class="fas fa-exclamation-circle"></i>
                        ${taxaAprovacao.rejeitadas} rejeitadas
                    </div>
                </div>
                <div class="metric-body">
                    <h3 class="metric-title">Taxa de Aprovação</h3>
                    <p class="metric-value">${taxaAprovacao.percentual}%</p>
                    <div class="metric-progress">
                        <div class="progress-bar">
                            <div class="progress-fill animate-progress" style="width: 0%" data-width="${taxaAprovacao.percentual}"></div>
                        </div>
                        <span class="progress-label">
                            <i class="fas fa-trophy"></i>
                            Excelente desempenho
                        </span>
                    </div>
                </div>
            </div>

            <!-- Tempo Médio de Emissão -->
            <div class="metric-card tempo-emissao animate-fade-in" style="animation-delay: 0.3s">
                <div class="metric-header">
                    <div class="metric-icon-wrapper">
                        <div class="metric-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                    </div>
                    <div class="metric-trend trend-${tempoMedioEmissao.variacao <= 0  'positive' : 'negative'}">
                        <i class="fas fa-arrow-${tempoMedioEmissao.variacao <= 0  'down' : 'up'}"></i>
                        <span>${Math.abs(tempoMedioEmissao.variacao).toFixed(1)}%</span>
                    </div>
                </div>
                <div class="metric-body">
                    <h3 class="metric-title">Tempo Médio</h3>
                    <p class="metric-value">${tempoMedioEmissao.minutos}<span class="metric-unit">min</span></p>
                    <p class="metric-subtitle">Por emissão</p>
                </div>
                <div class="metric-chart">
                    <canvas id="chart-tempo-mini" width="100" height="40"></canvas>
                </div>
            </div>
        `;

        // Animar progress bar após renderização
        setTimeout(() => {
            const progressFill = container.querySelector('.animate-progress');
            if (progressFill) {
                const targetWidth = progressFill.getAttribute('data-width');
                progressFill.style.width = targetWidth + '%';
            }
        }, 100);

        this.renderizarMiniCharts();
    }

    renderizarMiniCharts() {
        const ctxNfes = document.getElementById('chart-nfes-mini');
        if (ctxNfes) {
            const ctx = ctxNfes.getContext('2d');
            this.desenharMiniLinha(ctx, this.data.nfesMensais.slice(-6).map(d => d.quantidade), '#8b5cf6');
        }

        const ctxValor = document.getElementById('chart-valor-mini');
        if (ctxValor) {
            const ctx = ctxValor.getContext('2d');
            this.desenharMiniLinha(ctx, this.data.nfesMensais.slice(-6).map(d => d.valor), '#10b981');
        }

        const ctxTempo = document.getElementById('chart-tempo-mini');
        if (ctxTempo) {
            const ctx = ctxTempo.getContext('2d');
            const valores = [4.2, 4.0, 3.9, 3.7, 3.6, 3.5];
            this.desenharMiniLinha(ctx, valores, '#3b82f6');
        }
    }

    desenharMiniLinha(ctx, daçãos, cor) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        const max = Math.max(...daçãos);
        const min = Math.min(...daçãos);
        const range = max - min || 1;
        const padding = 5;
        
        ctx.clearRect(0, 0, width, height);
        
        // Criar gradiente para área
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, cor + '40');
        gradient.addColorStop(1, cor + '00');
        
        // Desenhar área preenchida
        ctx.beginPath();
        daçãos.forEach((valor, i) => {
            const x = (i / (daçãos.length - 1)) * width;
            const y = padding + ((max - valor) / range) * (height - padding * 2);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Desenhar linha
        ctx.strokeStyle = cor;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shaçãowColor = cor;
        ctx.shaçãowBlur = 4;
        
        ctx.beginPath();
        daçãos.forEach((valor, i) => {
            const x = (i / (daçãos.length - 1)) * width;
            const y = padding + ((max - valor) / range) * (height - padding * 2);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        
        // Desenhar ponto final destacação
        ctx.shaçãowBlur = 0;
        const lastX = width;
        const lastY = padding + ((max - daçãos[daçãos.length - 1]) / range) * (height - padding * 2);
        
        ctx.beginPath();
        ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = cor;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    renderizarGraficos() {
        this.renderizarGraficoNFesMensais();
        this.renderizarGraficoStatusDistribuicao();
    }

    renderizarGraficoNFesMensais() {
        const container = document.getElementById('grafico-nfes-mensais');
        if (!container) return;

        container.innerHTML = `
            <div class="chart-header">
                <h3 class="chart-title">
                    <i class="fas fa-chart-bar"></i>
                    Emissão de NFes
                </h3>
                <div class="chart-actions">
                    <button class="btn-chart active">12 meses</button>
                    <button class="btn-chart">Ano atual</button>
                </div>
            </div>
            <div class="chart-body">
                <canvas id="chart-nfes-principal" width="600" height="300"></canvas>
            </div>
        `;

        const canvas = document.getElementById('chart-nfes-principal');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            this.desenharGraficoBarras(ctx, this.data.nfesMensais);
        }
    }

    desenharGraficoBarras(ctx, daçãos) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        const valores = daçãos.map(d => d.quantidade);
        const max = Math.max(...valores);
        
        ctx.clearRect(0, 0, width, height);
        
        // Grid
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
            
            const valor = max - (max / 5) * i;
            ctx.fillStyle = '#6b7280';
            ctx.font = '11px Inter';
            ctx.textAlign = 'right';
            ctx.fillText(Math.round(valor), padding - 10, y + 4);
        }
        
        // Barras
        const barWidth = chartWidth / daçãos.length * 0.7;
        const barGap = chartWidth / daçãos.length * 0.3;
        
        daçãos.forEach((item, i) => {
            const barHeight = (item.quantidade / max) * chartHeight;
            const x = padding + (chartWidth / daçãos.length) * i + barGap / 2;
            const y = height - padding - barHeight;
            
            // Gradiente
            const gradient = ctx.createLinearGradient(x, y, x, height - padding);
            gradient.addColorStop(0, '#8b5cf6');
            gradient.addColorStop(1, '#7c3aed');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // Labels
            ctx.fillStyle = '#6b7280';
            ctx.font = '11px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(item.mes, x + barWidth / 2, height - padding + 20);
        });
    }

    renderizarGraficoStatusDistribuicao() {
        const container = document.getElementById('grafico-status-distribuicao');
        if (!container) return;

        container.innerHTML = `
            <div class="chart-header">
                <h3 class="chart-title">
                    <i class="fas fa-chart-pie"></i>
                    Distribuição por Status
                </h3>
            </div>
            <div class="chart-body">
                <div class="pie-chart-container">
                    <canvas id="chart-pizza-status" width="180" height="180"></canvas>
                </div>
                <div class="status-legend">
                    ${this.data.statusDistribuicao.map(status => `
                        <div class="status-legend-item">
                            <div class="legend-color" style="background: ${status.cor}"></div>
                            <div class="legend-info">
                                <div class="legend-name">${status.status}</div>
                                <div class="legend-stats">
                                    <span class="legend-count">${status.quantidade} NFes</span>
                                    <span class="legend-percent">${status.percentual}%</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        const canvas = document.getElementById('chart-pizza-status');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            this.desenharPizza(ctx, this.data.statusDistribuicao);
        }
    }

    desenharPizza(ctx, status) {
        const canvas = ctx.canvas;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;
        
        const total = status.reduce((sum, s) => sum + s.quantidade, 0);
        let currentAngle = -Math.PI / 2;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        status.forEach((s) => {
            const sliceAngle = (s.quantidade / total) * 2 * Math.PI;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.lineTo(centerX, centerY);
            ctx.closePath();
            
            ctx.fillStyle = s.cor;
            ctx.fill();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            currentAngle += sliceAngle;
        });
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }

    renderizarTabelaNFes() {
        const container = document.getElementById('tabela-nfes-recentes');
        if (!container) return;

        container.innerHTML = `
            <div class="table-header">
                <h3 class="table-title">
                    <i class="fas fa-list"></i>
                    NFes Recentes
                </h3>
                <button class="btn-primary-small">
                    <i class="fas fa-plus"></i> Nova NFe
                </button>
            </div>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Número</th>
                            <th>Cliente</th>
                            <th>Data/Hora</th>
                            <th>Valor</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.data.nfesRecentes.map(nfe => `
                            <tr>
                                <td>
                                    <div class="nfe-número">
                                        <span class="número-badge">${nfe.número}</span>
                                        <span class="serie-badge">Série ${nfe.serie}</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="cliente-info">
                                        <i class="fas fa-building"></i>
                                        ${nfe.cliente}
                                    </div>
                                </td>
                                <td>
                                    <div class="data-hora">
                                        <i class="far fa-calendar"></i>
                                        ${nfe.data}
                                    </div>
                                </td>
                                <td>
                                    <span class="valor-nfe">R$ ${this.formatarMoeda(nfe.valor)}</span>
                                </td>
                                <td>
                                    <span class="status-badge status-${nfe.status.toLowerCase()}">
                                        ${this.getStatusIcon(nfe.status)} ${nfe.status}
                                    </span>
                                </td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="btn-action" title="Ver NFe" onclick="window.nfeDashboard.visualizarNFeCompleta(${JSON.stringify(nfe).replace(/"/g, '&quot;')})">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn-action" title="Download XML" onclick="window.nfeDashboard.baixarXML('${nfe.chave}')">
                                            <i class="fas fa-download"></i>
                                        </button>
                                        <button class="btn-action" title="Enviar por Email" onclick="window.nfeDashboard.enviarEmail(${JSON.stringify(nfe).replace(/"/g, '&quot;')})">
                                            <i class="fas fa-envelope"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderizarMapaLogistica() {
        const container = document.getElementById('mapa-logística');
        if (!container) return;

        container.innerHTML = `
            <div class="logística-header">
                <h3 class="logística-title">
                    <i class="fas fa-truck"></i>
                    Rastreamento de Entregas
                </h3>
            </div>
            <div class="logística-grid">
                ${this.data.logística.map(item => `
                    <div class="logística-card">
                        <div class="logística-card-header">
                            <span class="nfe-ref">NFe ${item.nfe}</span>
                            <span class="status-entrega status-${item.status.toLowerCase().replace(' ', '-')}">
                                ${item.status}
                            </span>
                        </div>
                        <div class="logística-card-body">
                            <div class="logística-info">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${item.destino}</span>
                            </div>
                            <div class="logística-info">
                                <i class="fas fa-truck"></i>
                                <span>${item.transportaçãora}</span>
                            </div>
                            <div class="logística-info">
                                <i class="far fa-clock"></i>
                                <span>Previsão: ${item.previsao}</span>
                            </div>
                        </div>
                        <div class="logística-card-footer">
                            <button class="btn-track">
                                <i class="fas fa-route"></i> Rastrear
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getStatusIcon(status) {
        const icons = {
            'AUTORIZADA': '<i class="fas fa-check-circle"></i>',
            'TRANSMITIDA': '<i class="fas fa-paper-plane"></i>',
            'CANCELADA': '<i class="fas fa-times-circle"></i>',
            'REJEITADA': '<i class="fas fa-exclamation-circle"></i>'
        };
        return icons[status] || '<i class="fas fa-circle"></i>';
    }

    generateNFeUrl(chave) {
        return `https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspxtipoConsumo=completo&tipoConsulta=completa&chNFe=${chave}`;
    }

    formatarMoeda(valor) {
        return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    iniciarAtualizacaoAutomatica() {
        setInterval(() => {
            this.carregarDaçãos();
        }, 300000);
    }

    // Métodos para ações das NFes
    visualizarNFeCompleta(nfe) {
        if (typeof visualizarNFe === 'function') {
            visualizarNFe(nfe);
        }
    }

    baixarXML(chave) {
        if (typeof baixarNFeXML === 'function') {
            baixarNFeXML(chave);
        }
    }

    enviarEmail(nfe) {
        if (typeof enviarNFeEmail === 'function') {
            enviarNFeEmail(nfe);
        }
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('nfe-metricas-dashboard')) {
        window.nfeDashboard = new NFeDashboard();
    }
    
    // Inicializar daçãos do usuário no header
    initUserHeader();
});

// ============================================
// SISTEMA DE USUÁRIO NO HEADER - NFe
// ============================================

/**
 * Inicializa o header com daçãos do usuário logação
 */
async function initUserHeader() {
    console.log('🔄 Inicializando header do usuário...');
    
    // Tentar carregar daçãos do localStorage primeiro
    let userData = getUserDataFromStorage();
    
    if (!userData) {
        // Se não tiver no localStorage, buscar da API
        userData = await fetchUserData();
    }
    
    if (userData) {
        updateUserHeader(userData);
    } else {
        // Daçãos padrão se não conseguir carregar
        updateUserHeader({
            nome: 'Usuário',
            email: '',
            foto: '/avatars/default.webp',
            cargo: 'Colaboraçãor'
        });
    }
}

/**
 * Busca daçãos do usuário da API
 */
async function fetchUserData() {
    try {
        const response = await fetch('/api/me', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            // Salvar no localStorage para uso futuro
            localStorage.setItem('userData', JSON.stringify(userData));
            return userData;
        }
    } catch (error) {
        console.warn('⚠️ Erro ao buscar daçãos do usuário:', error);
    }
    return null;
}

/**
 * Obtém daçãos do usuário do localStorage
 */
function getUserDataFromStorage() {
    try {
        const userData = localStorage.getItem('userData');
        return userData  JSON.parse(userData) : null;
    } catch (e) {
        return null;
    }
}

/**
 * Atualiza o header com daçãos do usuário
 */
function updateUserHeader(userData) {
    // Atualizar nome do usuário
    const userTextElements = document.querySelectorAll('.user-text');
    userTextElements.forEach(el => {
        // Usar primeiro nome para saudação
        const primeiroNome = userData.nome  userData.nome.split(' ')[0] : 'Usuário';
        el.textContent = primeiroNome;
    });
    
    // Atualizar avatar do usuário
    const avatarImages = document.querySelectorAll('.avatar-circle img, .user-avatar');
    avatarImages.forEach(img => {
        const fotoUrl = userData.foto || userData.avatar || '/avatars/default.webp';
        img.src = fotoUrl;
        img.alt = userData.nome || 'Usuário';
        img.onerror = function() {
            this.onerror = null;
            this.src = '/avatars/default.webp';
        };
    });
    
    // Atualizar nome/role no dropdown (se existir)
    const userNameDropdown = document.querySelector('.user-name');
    const userRoleDropdown = document.querySelector('.user-role');
    
    if (userNameDropdown) {
        userNameDropdown.textContent = userData.nome || 'Usuário';
    }
    
    if (userRoleDropdown) {
        userRoleDropdown.textContent = userData.cargo || userData.role || 'Colaboraçãor';
    }
    
    console.log('✅ Header atualização com daçãos do usuário:', userData.nome);
}

/**
 * Toggle do menu do usuário
 */
function toggleUserMenu() {
    const dropdown = document.getElementById('user-menu-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Fechar dropdown ao clicar fora
document.addEventListener('click', function(e) {
    if (!e.target.closest('.user-menu')) {
        const dropdown = document.getElementById('user-menu-dropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }
});

// Escutar evento de autenticação bem-sucedida (do auth-unified.js)
window.addEventListener('authSuccess', function(e) {
    if (e.detail && e.detail.user) {
        updateUserHeader(e.detail.user);
    }
});
