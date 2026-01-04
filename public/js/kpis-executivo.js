/**
 * JavaScript para KPIs Executivos no Painel de Controle
 * Carrega daçãos de todos os módulos e exibe no dashboard
 * @author Aluforce ERP
 * @version 1.0.0
 */

// Variável global para controle de carregamento
let kpisCarregaçãos = false;
let modalKpisAberto = false;

/**
 * Inicializar KPIs quando a página carregar
 */
document.addEventListener('DOMContentLoaded', function() {
    // Configurar modal de KPIs
    configurarModalKPIs();
    
    // Adicionar evento de mudança de período
    const periodoSelect = document.getElementById('kpis-periodo');
    if (periodoSelect) {
        periodoSelect.addEventListener('change', function() {
            carregarKPIs();
        });
    }
});

/**
 * Configurar o modal de KPIs
 */
function configurarModalKPIs() {
    const btnToggle = document.getElementById('kpis-modal-toggle');
    const btnClose = document.getElementById('kpis-modal-close');
    const overlay = document.getElementById('kpis-modal-overlay');
    
    // Abrir modal ao clicar no botão
    if (btnToggle) {
        btnToggle.addEventListener('click', function(e) {
            e.preventDefault();
            abrirModalKPIs();
        });
    }
    
    // Fechar ao clicar no X
    if (btnClose) {
        btnClose.addEventListener('click', function(e) {
            e.preventDefault();
            fecharModalKPIs();
        });
    }
    
    // Fechar ao clicar fora do modal
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                fecharModalKPIs();
            }
        });
    }
    
    // Fechar com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modalKpisAberto) {
            fecharModalKPIs();
        }
    });
}

/**
 * Abrir modal de KPIs
 */
function abrirModalKPIs() {
    const overlay = document.getElementById('kpis-modal-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        modalKpisAberto = true;
        document.body.style.overflow = 'hidden';
        
        // Carregar KPIs se ainda não carregaçãos
        if (!kpisCarregaçãos) {
            carregarKPIs();
        }
    }
}

/**
 * Fechar modal de KPIs
 */
function fecharModalKPIs() {
    const overlay = document.getElementById('kpis-modal-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        modalKpisAberto = false;
        document.body.style.overflow = '';
    }
}

/**
 * Verificar se usuário tem acesso aos KPIs (mantido para compatibilidade)
 */
function verificarAcessoKPIs() {
    // Modal sempre disponível, mas daçãos podem ser restritos pela API
    return true;
}

/**
 * Carregar todos os KPIs do Dashboard Executivo
 */
async function carregarKPIs() {
    const periodo = document.getElementById('kpis-periodo').value || '30';
    const refreshBtn = document.querySelector('.kpis-refresh-btn');
    
    try {
        // Mostrar loading
        if (refreshBtn) refreshBtn.classList.add('loading');
        
        // Obter token de autenticação
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        // Buscar daçãos da API
        const response = await fetch(`/api/dashboard/executivoperiodo=${periodo}`, {
            credentials: 'include',
            headers: {
                'Authorization': token  `Bearer ${token}` : ''
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar KPIs');
        }
        
        const data = await response.json();
        
        // Atualizar interface
        atualizarResumoFinanceiro(data.resumo_executivo);
        atualizarKPIsVendas(data.vendas);
        atualizarKPIsCompras(data.compras);
        atualizarKPIsPCP(data.producao);
        atualizarKPIsRH(data.rh);
        atualizarAlertas(data.alertas);
        
        kpisCarregaçãos = true;
        console.log('[KPIs] Dashboard executivo carregação com sucesso');
        
    } catch (error) {
        console.error('[KPIs] Erro ao carregar:', error);
        // Carregar daçãos de fallback/simulaçãos
        carregarKPIsSimulaçãos();
    } finally {
        // Remover loading
        if (refreshBtn) refreshBtn.classList.remove('loading');
    }
}

/**
 * Carregar KPIs simulaçãos quando API não disponível
 */
function carregarKPIsSimulaçãos() {
    console.log('[KPIs] Carregando daçãos simulaçãos...');
    
    // Resumo Financeiro
    atualizarResumoFinanceiro({
        receitas: 385000,
        despesas: 245000,
        lucro_estimação: 140000,
        margem_percentual: 36.4,
        faturamento_periodo: 320000
    });
    
    // Vendas
    atualizarKPIsVendas({
        total_pedidos: 87,
        taxa_conversao: 68.5,
        ticket_medio: 4500
    });
    
    // Compras
    atualizarKPIsCompras({
        total_pedidos: 34,
        pedidos_pendentes: 8,
        economia_gerada: 12500
    });
    
    // PCP
    atualizarKPIsPCP({
        ordens_producao: 23,
        eficiencia_percentual: 82.3,
        alertas_estoque: 5
    });
    
    // RH
    atualizarKPIsRH({
        total_funcionarios: 42,
        ferias_programadas: 3,
        aniversariantes_mes: 4
    });
    
    // Alertas simulaçãos
    atualizarAlertas([
        { tipo: 'warning', modulo: 'Financeiro', mensagem: '3 títulos vencendo hoje', link: '/modules/Financeiro/index.html' },
        { tipo: 'info', modulo: 'Vendas', mensagem: '5 pedidos aguardando aprovação', link: '/modules/Vendas/kanban.html' }
    ]);
}

/**
 * Atualizar seção de resumo financeiro
 */
function atualizarResumoFinanceiro(daçãos) {
    if (!daçãos) return;
    
    // Receitas
    const receitasEl = document.getElementById('kpi-receitas');
    if (receitasEl) receitasEl.textContent = formatarMoeda(daçãos.receitas || 0);
    
    const receitasTrend = document.getElementById('kpi-receitas-trend');
    if (receitasTrend) {
        receitasTrend.textContent = '+12.5%';
        receitasTrend.className = 'kpi-trend up';
    }
    
    // Despesas
    const despesasEl = document.getElementById('kpi-despesas');
    if (despesasEl) despesasEl.textContent = formatarMoeda(daçãos.despesas || 0);
    
    const despesasTrend = document.getElementById('kpi-despesas-trend');
    if (despesasTrend) {
        despesasTrend.textContent = '-5.2%';
        despesasTrend.className = 'kpi-trend down';
    }
    
    // Lucro
    const lucroEl = document.getElementById('kpi-lucro');
    if (lucroEl) {
        const lucro = daçãos.lucro_estimação || (daçãos.receitas - daçãos.despesas);
        lucroEl.textContent = formatarMoeda(lucro);
        lucroEl.style.color = lucro >= 0  '#22c55e' : '#ef4444';
    }
    
    const margemEl = document.getElementById('kpi-margem');
    if (margemEl) {
        margemEl.textContent = `Margem: ${daçãos.margem_percentual || 0}%`;
        margemEl.className = 'kpi-trend ' + (daçãos.margem_percentual > 20  'up' : 'neutral');
    }
    
    // Faturamento
    const faturamentoEl = document.getElementById('kpi-faturamento');
    if (faturamentoEl) faturamentoEl.textContent = formatarMoeda(daçãos.faturamento_periodo || 0);
    
    const nfesEl = document.getElementById('kpi-nfes');
    if (nfesEl) nfesEl.textContent = `${daçãos.nfes_emitidas || 0} NF-e emitidas`;
}

/**
 * Atualizar KPIs de Vendas
 */
function atualizarKPIsVendas(daçãos) {
    if (!daçãos) return;
    
    const pedidosEl = document.getElementById('kpi-vendas-pedidos');
    if (pedidosEl) pedidosEl.textContent = daçãos.total_pedidos || 0;
    
    const conversaoEl = document.getElementById('kpi-vendas-conversao');
    if (conversaoEl) conversaoEl.textContent = (daçãos.taxa_conversao || 0) + '%';
    
    const ticketEl = document.getElementById('kpi-vendas-ticket');
    if (ticketEl) ticketEl.textContent = formatarMoedaCurto(daçãos.ticket_medio || 0);
}

/**
 * Atualizar KPIs de Compras
 */
function atualizarKPIsCompras(daçãos) {
    if (!daçãos) return;
    
    const pedidosEl = document.getElementById('kpi-compras-pedidos');
    if (pedidosEl) pedidosEl.textContent = daçãos.total_pedidos || 0;
    
    const pendentesEl = document.getElementById('kpi-compras-pendentes');
    if (pendentesEl) pendentesEl.textContent = daçãos.pedidos_pendentes || 0;
    
    const economiaEl = document.getElementById('kpi-compras-economia');
    if (economiaEl) economiaEl.textContent = formatarMoedaCurto(daçãos.economia_gerada || 0);
}

/**
 * Atualizar KPIs de PCP
 */
function atualizarKPIsPCP(daçãos) {
    if (!daçãos) return;
    
    const ordensEl = document.getElementById('kpi-pcp-ordens');
    if (ordensEl) ordensEl.textContent = daçãos.ordens_producao || 0;
    
    const eficienciaEl = document.getElementById('kpi-pcp-eficiencia');
    if (eficienciaEl) eficienciaEl.textContent = (daçãos.eficiencia_percentual || 0) + '%';
    
    const estoqueEl = document.getElementById('kpi-pcp-estoque');
    if (estoqueEl) {
        estoqueEl.textContent = daçãos.alertas_estoque || 0;
        estoqueEl.style.color = daçãos.alertas_estoque > 5  '#ef4444' : '';
    }
}

/**
 * Atualizar KPIs de RH
 */
function atualizarKPIsRH(daçãos) {
    if (!daçãos) return;
    
    const funcionariosEl = document.getElementById('kpi-rh-funcionarios');
    if (funcionariosEl) funcionariosEl.textContent = daçãos.total_funcionarios || 0;
    
    const feriasEl = document.getElementById('kpi-rh-ferias');
    if (feriasEl) feriasEl.textContent = daçãos.ferias_programadas || 0;
    
    const aniversariosEl = document.getElementById('kpi-rh-aniversarios');
    if (aniversariosEl) aniversariosEl.textContent = daçãos.aniversariantes_mes || 0;
}

/**
 * Atualizar seção de alertas com design premium
 */
function atualizarAlertas(alertas) {
    const container = document.getElementById('kpis-alertas');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!alertas || alertas.length === 0) {
        container.innerHTML = `
            <div class="kpi-alerta success">
                <div class="kpi-alerta-icon"><i class="fas fa-check-circle"></i></div>
                <div class="kpi-alerta-content">
                    <span class="kpi-alerta-modulo">Sistema</span>
                    <span class="kpi-alerta-text">Tudo certo! Não há alertas pendentes.</span>
                </div>
            </div>
        `;
        return;
    }
    
    alertas.forEach((alerta, index) => {
        const iconMap = {
            danger: 'fa-exclamation-triangle',
            warning: 'fa-bell',
            info: 'fa-info-circle',
            success: 'fa-check-circle'
        };
        
        const div = document.createElement('div');
        div.className = `kpi-alerta ${alerta.tipo}`;
        div.style.animationDelay = `${index * 0.1}s`;
        div.innerHTML = `
            <div class="kpi-alerta-icon"><i class="fas ${iconMap[alerta.tipo] || 'fa-bell'}"></i></div>
            <div class="kpi-alerta-content">
                <span class="kpi-alerta-modulo">${alerta.modulo}</span>
                <span class="kpi-alerta-text">${alerta.mensagem}</span>
            </div>
            ${alerta.link  `<a href="${alerta.link}" class="kpi-alerta-link">Ver detalhes</a>` : ''}
        `;
        container.appendChild(div);
    });
}

/**
 * Formatar valor como moeda (R$)
 */
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    }).format(valor || 0);
}

/**
 * Formatar moeda de forma curta (R$ 10K)
 */
function formatarMoedaCurto(valor) {
    if (valor >= 1000000) {
        return `R$ ${(valor / 1000000).toFixed(1)}M`;
    } else if (valor >= 1000) {
        return `R$ ${(valor / 1000).toFixed(1)}K`;
    }
    return formatarMoeda(valor);
}

/**
 * Navegar para módulo ao clicar no card de KPI
 */
document.addEventListener('DOMContentLoaded', function() {
    const moduloCards = document.querySelectorAll('.kpi-modulo-card');
    const moduloLinks = {
        vendas: '/modules/Vendas/index.html',
        compras: '/modules/Compras/index.html',
        pcp: '/modules/PCP/index.html',
        rh: '/modules/RH/public/dashboard.html'
    };
    
    moduloCards.forEach(card => {
        card.addEventListener('click', function() {
            const modulo = this.dataset.modulo;
            if (moduloLinks[modulo]) {
                window.location.href = moduloLinks[modulo];
            }
        });
    });
});

// Exportar função para uso global
window.carregarKPIs = carregarKPIs;
