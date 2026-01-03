/**
 * Dashboard Profissional de Compras - Aluforce
 * Gestão completa de compras com métricas e análises
 */

class ComprasDashboard {
    constructor() {
        this.charts = {};
        this.data = {
            metricas: {},
            compras: [],
            fornecedores: [],
            materiais: []
        };
        this.init();
    }

    async init() {
        await this.carregarDados();
        this.renderizarMetricas();
        this.renderizarGraficos();
        this.renderizarTabelaCompras();
        this.renderizarFornecedores();
        this.iniciarAtualizacaoAutomatica();
    }

    async carregarDados() {
        try {
            this.data.metricas = {
                totalCompras: {
                    valor: 487320.00,
                    variacao: 12.3,
                    mes: 'Dezembro'
                },
                ordemCompra: {
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

            this.data.categorias = [
                { nome: 'Matéria Prima', valor: 234500, percentual: 48.1, cor: '#3b82f6' },
                { nome: 'Componentes', valor: 128900, percentual: 26.5, cor: '#8b5cf6' },
                { nome: 'Embalagens', valor: 67800, percentual: 13.9, cor: '#10b981' },
                { nome: 'Ferramentas', valor: 35420, percentual: 7.3, cor: '#f59e0b' },
                { nome: 'Outros', valor: 20700, percentual: 4.2, cor: '#6b7280' }
            ];

            this.data.ordensRecentes = [
                { 
                    id: 'OC-2025-089',
                    fornecedor: 'Fornecedor XYZ Ltda',
                    data: '08/12/2025',
                    valor: 28450.00,
                    status: 'PENDENTE',
                    prazo: '15/12/2025'
                },
                {
                    id: 'OC-2025-088',
                    fornecedor: 'Industrial Bahia Ltd',
                    data: '07/12/2025',
                    valor: 45320.00,
                    status: 'APROVADO',
                    prazo: '20/12/2025'
                },
                {
                    id: 'OC-2025-087',
                    fornecedor: 'Distribuidora Sul',
                    data: '05/12/2025',
                    valor: 18900.00,
                    status: 'ENTREGUE',
                    prazo: '10/12/2025'
                },
                {
                    id: 'OC-2025-086',
                    fornecedor: 'Cabo Aluminio Shop',
                    data: '04/12/2025',
                    valor: 67890.00,
                    status: 'EM TRÂNSITO',
                    prazo: '12/12/2025'
                },
                {
                    id: 'OC-2025-085',
                    fornecedor: 'Metalúrgica Norte',
                    data: '03/12/2025',
                    valor: 52100.00,
                    status: 'APROVADO',
                    prazo: '18/12/2025'
                }
            ];

            this.data.topFornecedores = [
                { nome: 'Fornecedor XYZ Ltda', compras: 45, valor: 234500, performance: 95 },
                { nome: 'Industrial Bahia Ltd', compras: 38, valor: 198700, performance: 92 },
                { nome: 'Distribuidora Sul', compras: 32, valor: 167800, performance: 88 },
                { nome: 'Cabo Aluminio Shop', compras: 28, valor: 145300, performance: 90 },
                { nome: 'Metalúrgica Norte', compras: 25, valor: 128900, performance: 94 }
            ];

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        }
    }

    renderizarMetricas() {
        const container = document.getElementById('compras-metricas-dashboard');
        if (!container) return;

        const { totalCompras, ordemCompra, fornecedoresAtivos, economiaObtida } = this.data.metricas;

        container.innerHTML = `
            <!-- Total de Compras -->
            <div class="metric-card compras-total">
                <div class="metric-header">
                    <div class="metric-icon">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="metric-trend ${totalCompras.variacao >= 0 ? 'positive' : 'negative'}">
                        <i class="fas fa-arrow-${totalCompras.variacao >= 0 ? 'up' : 'down'}"></i>
                        ${Math.abs(totalCompras.variacao).toFixed(1)}%
                    </div>
                </div>
                <div class="metric-body">
                    <h3 class="metric-title">Total de Compras</h3>
                    <p class="metric-value">R$ ${this.formatarMoeda(totalCompras.valor)}</p>
                    <p class="metric-subtitle">${totalCompras.mes} 2025</p>
                </div>
                <canvas id="chart-compras-mini" width="100" height="40"></canvas>
            </div>

            <!-- Ordens de Compra -->
            <div class="metric-card ordens">
                <div class="metric-header">
                    <div class="metric-icon">
                        <i class="fas fa-file-invoice"></i>
                    </div>
                    <div class="metric-badge">${ordemCompra.pendentes} pendentes</div>
                </div>
                <div class="metric-body">
                    <h3 class="metric-title">Ordens de Compra</h3>
                    <p class="metric-value">${ordemCompra.total}</p>
                    <div class="metric-stats">
                        <div class="stat-item">
                            <span class="stat-label">Aprovadas</span>
                            <span class="stat-value">${ordemCompra.aprovadas}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Entregues</span>
                            <span class="stat-value">${ordemCompra.entregues}</span>
                        </div>
                    </div>
                </div>
                <div class="metric-mini-chart">
                    <canvas id="chart-ordens-status" width="100" height="50"></canvas>
                </div>
            </div>

            <!-- Fornecedores Ativos -->
            <div class="metric-card fornecedores">
                <div class="metric-header">
                    <div class="metric-icon">
                        <i class="fas fa-truck"></i>
                    </div>
                    <div class="metric-badge">+${fornecedoresAtivos.novos} novos</div>
                </div>
                <div class="metric-body">
                    <h3 class="metric-title">Fornecedores Ativos</h3>
                    <p class="metric-value">${fornecedoresAtivos.total}</p>
                    <div class="metric-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(fornecedoresAtivos.premium / fornecedoresAtivos.total * 100)}%"></div>
                        </div>
                        <span class="progress-label">${fornecedoresAtivos.premium} fornecedores premium</span>
                    </div>
                </div>
            </div>

            <!-- Economia Obtida -->
            <div class="metric-card economia">
                <div class="metric-header">
                    <div class="metric-icon">
                        <i class="fas fa-piggy-bank"></i>
                    </div>
                    <div class="metric-trend positive">
                        <i class="fas fa-arrow-down"></i>
                        ${economiaObtida.percentual}%
                    </div>
                </div>
                <div class="metric-body">
                    <h3 class="metric-title">Economia Obtida</h3>
                    <p class="metric-value">R$ ${this.formatarMoeda(economiaObtida.valor)}</p>
                    <p class="metric-subtitle">Comparado ao orçamento</p>
                </div>
                <canvas id="chart-economia-mini" width="100" height="40"></canvas>
            </div>
        `;

        this.renderizarMiniCharts();
    }

    renderizarMiniCharts() {
        // Mini gráfico de compras
        const ctxCompras = document.getElementById('chart-compras-mini');
        if (ctxCompras) {
            const ctx = ctxCompras.getContext('2d');
            this.desenharMiniLinha(ctx, this.data.comprasMensais.slice(-6).map(d => d.valor), '#8b5cf6');
        }

        // Mini gráfico de status de ordens
        const ctxOrdens = document.getElementById('chart-ordens-status');
        if (ctxOrdens) {
            const ctx = ctxOrdens.getContext('2d');
            const dados = [
                this.data.metricas.ordemCompra.pendentes,
                this.data.metricas.ordemCompra.aprovadas,
                this.data.metricas.ordemCompra.entregues
            ];
            this.desenharMiniBarras(ctx, dados, ['#f59e0b', '#3b82f6', '#10b981']);
        }

        // Mini gráfico de economia
        const ctxEcon = document.getElementById('chart-economia-mini');
        if (ctxEcon) {
            const ctx = ctxEcon.getContext('2d');
            const valores = [18500, 19200, 20100, 21500, 22800, 23580];
            this.desenharMiniLinha(ctx, valores, '#10b981');
        }
    }

    desenharMiniLinha(ctx, dados, cor) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        const max = Math.max(...dados);
        const min = Math.min(...dados);
        const range = max - min || 1;
        
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = cor;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        dados.forEach((valor, i) => {
            const x = (i / (dados.length - 1)) * width;
            const y = height - ((valor - min) / range) * height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = cor;
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    desenharMiniBarras(ctx, dados, cores) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        const barWidth = width / dados.length;
        const max = Math.max(...dados);
        
        ctx.clearRect(0, 0, width, height);
        
        dados.forEach((valor, i) => {
            const barHeight = (valor / max) * height;
            const x = i * barWidth;
            const y = height - barHeight;
            
            ctx.fillStyle = cores[i];
            ctx.fillRect(x, y, barWidth * 0.8, barHeight);
        });
    }

    renderizarGraficos() {
        this.renderizarGraficoComprasMensais();
        this.renderizarGraficoCategorias();
    }

    renderizarGraficoComprasMensais() {
        const container = document.getElementById('grafico-compras-mensais');
        if (!container) return;

        container.innerHTML = `
            <div class="chart-header">
                <h3 class="chart-title">
                    <i class="fas fa-chart-area"></i>
                    Evolução das Compras
                </h3>
                <div class="chart-actions">
                    <button class="btn-chart active">12 meses</button>
                    <button class="btn-chart">Ano atual</button>
                </div>
            </div>
            <div class="chart-body">
                <canvas id="chart-compras-principal" width="600" height="300"></canvas>
            </div>
        `;

        const canvas = document.getElementById('chart-compras-principal');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            this.desenharGraficoArea(ctx, this.data.comprasMensais);
        }
    }

    desenharGraficoArea(ctx, dados) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        const valores = dados.map(d => d.valor);
        const max = Math.max(...valores);
        const min = Math.min(...valores) * 0.9;
        const range = max - min;
        
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
            
            const valor = max - (range / 5) * i;
            ctx.fillStyle = '#6b7280';
            ctx.font = '11px Inter';
            ctx.textAlign = 'right';
            ctx.fillText('R$ ' + (valor / 1000).toFixed(0) + 'k', padding - 10, y + 4);
        }
        
        // Gradient
        const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
        
        // Área
        ctx.beginPath();
        dados.forEach((item, i) => {
            const x = padding + (chartWidth / (dados.length - 1)) * i;
            const y = height - padding - ((item.valor - min) / range) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.lineTo(width - padding, height - padding);
        ctx.lineTo(padding, height - padding);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Linha
        ctx.beginPath();
        dados.forEach((item, i) => {
            const x = padding + (chartWidth / (dados.length - 1)) * i;
            const y = height - padding - ((item.valor - min) / range) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Pontos
        dados.forEach((item, i) => {
            const x = padding + (chartWidth / (dados.length - 1)) * i;
            const y = height - padding - ((item.valor - min) / range) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#8b5cf6';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.fillStyle = '#6b7280';
            ctx.font = '11px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(item.mes, x, height - padding + 20);
        });
    }

    renderizarGraficoCategorias() {
        const container = document.getElementById('grafico-categorias');
        if (!container) return;

        const total = this.data.categorias.reduce((sum, cat) => sum + cat.valor, 0);

        container.innerHTML = `
            <div class="chart-header">
                <h3 class="chart-title">
                    <i class="fas fa-chart-pie"></i>
                    Compras por Categoria
                </h3>
            </div>
            <div class="chart-body">
                <div class="pie-chart-container">
                    <canvas id="chart-pizza-categorias" width="200" height="200"></canvas>
                </div>
                <div class="pie-legend">
                    ${this.data.categorias.map(cat => `
                        <div class="pie-legend-item">
                            <div class="legend-color" style="background: ${cat.cor}"></div>
                            <div class="legend-info">
                                <div class="legend-name">${cat.nome}</div>
                                <div class="legend-stats">
                                    <span class="legend-value">R$ ${this.formatarMoeda(cat.valor)}</span>
                                    <span class="legend-percent">${cat.percentual}%</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        const canvas = document.getElementById('chart-pizza-categorias');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            this.desenharPizza(ctx, this.data.categorias);
        }
    }

    desenharPizza(ctx, categorias) {
        const canvas = ctx.canvas;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;
        
        const total = categorias.reduce((sum, cat) => sum + cat.valor, 0);
        let currentAngle = -Math.PI / 2;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        categorias.forEach((cat) => {
            const sliceAngle = (cat.valor / total) * 2 * Math.PI;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.lineTo(centerX, centerY);
            ctx.closePath();
            
            ctx.fillStyle = cat.cor;
            ctx.fill();
            
            // Borda branca
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            currentAngle += sliceAngle;
        });
        
        // Círculo interno
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }

    renderizarTabelaCompras() {
        const container = document.getElementById('tabela-compras-recentes');
        if (!container) return;

        container.innerHTML = `
            <div class="table-header">
                <h3 class="table-title">
                    <i class="fas fa-list"></i>
                    Ordens de Compra Recentes
                </h3>
                <button class="btn-primary-small">
                    <i class="fas fa-plus"></i> Nova Ordem
                </button>
            </div>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Ordem</th>
                            <th>Fornecedor</th>
                            <th>Data</th>
                            <th>Valor</th>
                            <th>Prazo</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.data.ordensRecentes.map(ordem => `
                            <tr>
                                <td>
                                    <span class="ordem-id">${ordem.id}</span>
                                </td>
                                <td>
                                    <div class="fornecedor-info">
                                        <i class="fas fa-building"></i>
                                        ${ordem.fornecedor}
                                    </div>
                                </td>
                                <td>${ordem.data}</td>
                                <td>
                                    <span class="valor-compra">R$ ${this.formatarMoeda(ordem.valor)}</span>
                                </td>
                                <td>${ordem.prazo}</td>
                                <td>
                                    <span class="status-badge status-${ordem.status.toLowerCase().replace(' ', '-')}">
                                        ${ordem.status}
                                    </span>
                                </td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="btn-action" title="Ver detalhes">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn-action" title="Editar">
                                            <i class="fas fa-edit"></i>
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

    renderizarFornecedores() {
        const container = document.getElementById('tabela-top-fornecedores');
        if (!container) return;

        container.innerHTML = `
            <div class="table-header">
                <h3 class="table-title">
                    <i class="fas fa-star"></i>
                    Top 5 Fornecedores
                </h3>
            </div>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fornecedor</th>
                            <th>Compras</th>
                            <th>Valor Total</th>
                            <th>Performance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.data.topFornecedores.map((forn, index) => `
                            <tr>
                                <td>
                                    <div class="fornecedor-rank">
                                        <div class="rank-badge">${index + 1}</div>
                                        <div class="fornecedor-name">${forn.nome}</div>
                                    </div>
                                </td>
                                <td>
                                    <span class="badge badge-info">${forn.compras}</span>
                                </td>
                                <td>
                                    <span class="valor-destaque">R$ ${this.formatarMoeda(forn.valor)}</span>
                                </td>
                                <td>
                                    <div class="performance-bar">
                                        <div class="performance-fill" style="width: ${forn.performance}%; background: ${this.getPerformanceColor(forn.performance)}"></div>
                                        <span class="performance-label">${forn.performance}%</span>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    getPerformanceColor(performance) {
        if (performance >= 95) return '#10b981';
        if (performance >= 90) return '#3b82f6';
        if (performance >= 85) return '#f59e0b';
        return '#ef4444';
    }

    formatarMoeda(valor) {
        return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    iniciarAtualizacaoAutomatica() {
        setInterval(() => {
            this.carregarDados();
        }, 300000);
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('compras-metricas-dashboard')) {
        window.comprasDashboard = new ComprasDashboard();
    }
});
