/**
 * ALUFORCE - Dashboard Compras
 * Dashboard profissional para módulo de Compras
 */

function renderDashboard() {
    const container = document.getElementById('dashboard-container');
    
    container.innerHTML = `
        <div class="dashboard-grid">
            <!-- Card: Total de Compras do Mês -->
            <div class="panel" style="background: white; border-radius: 20px; padding: 0; box-shadow: 0 8px 24px rgba(0,0,0,0.08); overflow: hidden; border-top: 5px solid #10b981;">
                <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 24px; border-bottom: 1px solid #6ee7b7;">
                    <h2 style="margin: 0; color: #065f46; font-size: 19px; font-weight: 700; display: flex; align-items: center; gap: 12px;">
                        <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);">
                            <i class="fas fa-shopping-cart" style="font-size: 20px; color: white;"></i>
                        </div>
                        <span>Compras do Mês</span>
                    </h2>
                    <p style="margin: 10px 0 0 56px; color: #047857; font-size: 13px; font-weight: 500;">Total de compras realizadas</p>
                </div>
                <div class="panel-body" style="padding: 28px;">
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <div style="font-size: 42px; font-weight: 800; color: #065f46;" id="total-compras-mes">R$ 0</div>
                        <div style="display: flex; align-items: center; gap: 8px; padding: 12px; background: #ecfdf5; border-radius: 10px; border-left: 4px solid #10b981;">
                            <i class="fas fa-arrow-up" style="color: #10b981; font-size: 16px;"></i>
                            <span style="color: #047857; font-weight: 600; font-size: 14px;">12% vs mês anterior</span>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;">
                            <div style="padding: 12px; background: #f8fafc; border-radius: 8px; text-align: center;">
                                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Pedidos</div>
                                <div style="font-size: 24px; font-weight: 700; color: #334155;" id="pedidos-mes">0</div>
                            </div>
                            <div style="padding: 12px; background: #f8fafc; border-radius: 8px; text-align: center;">
                                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Média</div>
                                <div style="font-size: 24px; font-weight: 700; color: #334155;" id="media-pedido">R$ 0</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Card: Pedidos Pendentes -->
            <div class="panel" style="background: white; border-radius: 20px; padding: 0; box-shadow: 0 8px 24px rgba(0,0,0,0.08); overflow: hidden; border-top: 5px solid #f59e0b;">
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 24px; border-bottom: 1px solid #fcd34d;">
                    <h2 style="margin: 0; color: #78350f; font-size: 19px; font-weight: 700; display: flex; align-items: center; gap: 12px;">
                        <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);">
                            <i class="fas fa-clock" style="font-size: 20px; color: white;"></i>
                        </div>
                        <span>Pedidos Pendentes</span>
                    </h2>
                    <p style="margin: 10px 0 0 56px; color: #92400e; font-size: 13px; font-weight: 500;">Aguardando aprovação/recebimento</p>
                </div>
                <div class="panel-body" style="padding: 28px;">
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px; background: #fff7ed; border-radius: 12px; border-left: 4px solid #f59e0b;">
                            <div>
                                <div style="font-size: 11px; color: #9a3412; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Aprovação</div>
                                <div style="font-size: 28px; font-weight: 700; color: #78350f;" id="pedidos-aprovacao">0</div>
                            </div>
                            <div style="padding: 12px; background: #fef3c7; border-radius: 12px;">
                                <i class="fas fa-hourglass-half" style="font-size: 24px; color: #d97706;"></i>
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #dbeafe; border-radius: 8px;">
                                <span style="color: #1e3a8a; font-weight: 600; font-size: 14px;"><i class="fas fa-truck" style="margin-right: 8px;"></i>Em Trânsito</span>
                                <span style="font-weight: 700; color: #1e3a8a;" id="pedidos-transito">0</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #dcfce7; border-radius: 8px;">
                                <span style="color: #14532d; font-weight: 600; font-size: 14px;"><i class="fas fa-check-circle" style="margin-right: 8px;"></i>Recebidos</span>
                                <span style="font-weight: 700; color: #14532d;" id="pedidos-recebidos">0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Card: Fornecedores Ativos -->
            <div class="panel" style="background: white; border-radius: 20px; padding: 0; box-shadow: 0 8px 24px rgba(0,0,0,0.08); overflow: hidden; border-top: 5px solid #3b82f6;">
                <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 24px; border-bottom: 1px solid #93c5fd;">
                    <h2 style="margin: 0; color: #1e3a8a; font-size: 19px; font-weight: 700; display: flex; align-items: center; gap: 12px;">
                        <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);">
                            <i class="fas fa-truck" style="font-size: 20px; color: white;"></i>
                        </div>
                        <span>Fornecedores</span>
                    </h2>
                    <p style="margin: 10px 0 0 56px; color: #1e40af; font-size: 13px; font-weight: 500;">Base de fornecedores ativos</p>
                </div>
                <div class="panel-body" style="padding: 28px;">
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <div style="font-size: 42px; font-weight: 800; color: #1e3a8a;" id="fornecedores-ativos">0</div>
                        <div style="display: flex; align-items: center; gap: 8px; padding: 12px; background: #f0f9ff; border-radius: 10px; border-left: 4px solid #3b82f6;">
                            <i class="fas fa-plus-circle" style="color: #3b82f6; font-size: 16px;"></i>
                            <span style="color: #1e40af; font-weight: 600; font-size: 14px;">3 novos este mês</span>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;">
                            <div style="padding: 12px; background: #f8fafc; border-radius: 8px; text-align: center;">
                                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Nacionais</div>
                                <div style="font-size: 24px; font-weight: 700; color: #334155;" id="fornecedores-nacionais">0</div>
                            </div>
                            <div style="padding: 12px; background: #f8fafc; border-radius: 8px; text-align: center;">
                                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Import.</div>
                                <div style="font-size: 24px; font-weight: 700; color: #334155;" id="fornecedores-importacao">0</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Card: Materiais em Estoque -->
            <div class="panel" style="background: white; border-radius: 20px; padding: 0; box-shadow: 0 8px 24px rgba(0,0,0,0.08); overflow: hidden; border-top: 5px solid #8b5cf6;">
                <div style="background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); padding: 24px; border-bottom: 1px solid #c4b5fd;">
                    <h2 style="margin: 0; color: #5b21b6; font-size: 19px; font-weight: 700; display: flex; align-items: center; gap: 12px;">
                        <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);">
                            <i class="fas fa-cubes" style="font-size: 20px; color: white;"></i>
                        </div>
                        <span>Materiais</span>
                    </h2>
                    <p style="margin: 10px 0 0 56px; color: #6b21a8; font-size: 13px; font-weight: 500;">Itens gerenciados</p>
                </div>
                <div class="panel-body" style="padding: 28px;">
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <div style="font-size: 42px; font-weight: 800; color: #5b21b6;" id="total-materiais">0</div>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #fef2f2; border-radius: 8px;">
                                <span style="color: #991b1b; font-weight: 600; font-size: 14px;"><i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>Estoque Baixo</span>
                                <span style="font-weight: 700; color: #991b1b;" id="materiais-estoque-baixo">0</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #dcfce7; border-radius: 8px;">
                                <span style="color: #14532d; font-weight: 600; font-size: 14px;"><i class="fas fa-check-circle" style="margin-right: 8px;"></i>Disponível</span>
                                <span style="font-weight: 700; color: #14532d;" id="materiais-disponiveis">0</span>
                            </div>
                        </div>
                        <div style="margin-top: 8px;">
                            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">Valor Total em Estoque</div>
                            <div style="font-size: 20px; font-weight: 700; color: #5b21b6;" id="valor-estoque">R$ 0</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="panel" style="background: white; border-radius: 20px; padding: 0; box-shadow: 0 8px 24px rgba(0,0,0,0.08); overflow: hidden; border-top: 5px solid #10b981; grid-column: span 2;">
                <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 24px; border-bottom: 1px solid #6ee7b7;">
                    <h2 style="margin: 0; color: #065f46; font-size: 19px; font-weight: 700; display: flex; align-items: center; gap: 12px;">
                        <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);">
                            <i class="fas fa-bolt" style="font-size: 20px; color: white;"></i>
                        </div>
                        <span>Ações Rápidas</span>
                    </h2>
                    <p style="margin: 10px 0 0 56px; color: #047857; font-size: 13px; font-weight: 500;">Acesso rápido às principais funcionalidades</p>
                </div>
                <div class="panel-body" style="padding: 28px;">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
                        <button id="btn-novo-pedido-quick" class="btn-modern btn-modern-primary">
                            <span style="width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; background: rgba(255,255,255,0.2);">
                                <i class="fas fa-plus-circle"></i>
                            </span>
                            <div style="text-align: left; flex: 1;">
                                <div style="font-weight: 700; font-size: 15px;">Novo Pedido</div>
                                <div style="font-size: 12px; opacity: 0.9;">Criar pedido de compra</div>
                            </div>
                        </button>
                        <button id="btn-nova-cotacao-quick" class="btn-modern btn-modern-success">
                            <span style="width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; background: rgba(255,255,255,0.2);">
                                <i class="fas fa-file-invoice-dollar"></i>
                            </span>
                            <div style="text-align: left; flex: 1;">
                                <div style="font-weight: 700; font-size: 15px;">Nova Cotação</div>
                                <div style="font-size: 12px; opacity: 0.9;">Solicitar cotação</div>
                            </div>
                        </button>
                        <button id="btn-novo-fornecedor-quick" class="btn-modern btn-modern-secondary">
                            <span style="width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; background: rgba(255,255,255,0.2);">
                                <i class="fas fa-truck"></i>
                            </span>
                            <div style="text-align: left; flex: 1;">
                                <div style="font-weight: 700; font-size: 15px;">Novo Fornecedor</div>
                                <div style="font-size: 12px; opacity: 0.9;">Cadastrar fornecedor</div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Últimas Cotações -->
            <div class="panel" style="background: white; border-radius: 20px; padding: 0; box-shadow: 0 8px 24px rgba(0,0,0,0.08); overflow: hidden; border-top: 5px solid #f59e0b; grid-column: span 2;">
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 24px; border-bottom: 1px solid #fcd34d; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h2 style="margin: 0; color: #78350f; font-size: 19px; font-weight: 700; display: flex; align-items: center; gap: 12px;">
                            <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);">
                                <i class="fas fa-file-invoice-dollar" style="font-size: 20px; color: white;"></i>
                            </div>
                            <span>Últimas Cotações</span>
                        </h2>
                        <p style="margin: 10px 0 0 56px; color: #92400e; font-size: 13px; font-weight: 500;">Cotações mais recentes</p>
                    </div>
                    <button class="btn btn-primary" id="btn-ver-todas-cotacoes" style="padding: 10px 20px; border-radius: 10px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; background: linear-gradient(135deg, #f59e0b, #d97706); color: white;">Ver Todas</button>
                </div>
                <div id="cotacoes-recentes-container" class="panel-body" style="padding: 28px;"></div>
            </div>
        </div>
    `;

    // Carregar dados do dashboard
    loadDashboardData();
    
    // Event listeners para quick actions
    document.getElementById('btn-novo-pedido-quick')?.addEventListener('click', () => {
        document.getElementById('btn-pedidos')?.click();
        setTimeout(() => {
            document.getElementById('btn-novo-pedido')?.click();
        }, 100);
    });
    
    document.getElementById('btn-nova-cotacao-quick')?.addEventListener('click', () => {
        document.getElementById('btn-cotacoes')?.click();
        setTimeout(() => {
            document.getElementById('btn-nova-cotacao')?.click();
        }, 100);
    });
    
    document.getElementById('btn-novo-fornecedor-quick')?.addEventListener('click', () => {
        document.getElementById('btn-fornecedores')?.click();
        setTimeout(() => {
            document.getElementById('btn-novo-fornecedor')?.click();
        }, 100);
    });
}

async function loadDashboardData() {
    try {
        // Dados de demonstração - substituir por chamadas API reais
        const mockData = {
            totalComprasMes: 245780.50,
            pedidosMes: 32,
            mediaPedido: 7680.64,
            pedidosAprovacao: 8,
            pedidosTransito: 12,
            pedidosRecebidos: 24,
            fornecedoresAtivos: 45,
            fornecedoresNacionais: 38,
            fornecedoresImportacao: 7,
            totalMateriais: 156,
            materiaisEstoqueBaixo: 12,
            materiaisDisponiveis: 144,
            valorEstoque: 1245678.90
        };

        // Atualizar valores no dashboard
        document.getElementById('total-compras-mes').textContent = 
            `R$ ${mockData.totalComprasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        
        document.getElementById('pedidos-mes').textContent = mockData.pedidosMes;
        
        document.getElementById('media-pedido').textContent = 
            `R$ ${mockData.mediaPedido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        
        document.getElementById('pedidos-aprovacao').textContent = mockData.pedidosAprovacao;
        document.getElementById('pedidos-transito').textContent = mockData.pedidosTransito;
        document.getElementById('pedidos-recebidos').textContent = mockData.pedidosRecebidos;
        
        document.getElementById('fornecedores-ativos').textContent = mockData.fornecedoresAtivos;
        document.getElementById('fornecedores-nacionais').textContent = mockData.fornecedoresNacionais;
        document.getElementById('fornecedores-importacao').textContent = mockData.fornecedoresImportacao;
        
        document.getElementById('total-materiais').textContent = mockData.totalMateriais;
        document.getElementById('materiais-estoque-baixo').textContent = mockData.materiaisEstoqueBaixo;
        document.getElementById('materiais-disponiveis').textContent = mockData.materiaisDisponiveis;
        
        document.getElementById('valor-estoque').textContent = 
            `R$ ${mockData.valorEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

        // Carregar cotações recentes
        loadRecentCotacoes();
        
    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
    }
}

function loadRecentCotacoes() {
    const container = document.getElementById('cotacoes-recentes-container');
    
    // Dados de demonstração
    const cotacoes = [
        { id: 'COT-2025-001', fornecedor: 'Alumínio Brasil LTDA', valor: 15680.00, status: 'Pendente', data: '2025-12-10' },
        { id: 'COT-2025-002', fornecedor: 'MetalPro Indústria', valor: 23450.00, status: 'Aprovada', data: '2025-12-09' },
        { id: 'COT-2025-003', fornecedor: 'Fornecedor XYZ', valor: 8920.00, status: 'Em Análise', data: '2025-12-08' }
    ];
    
    const statusColors = {
        'Pendente': { bg: '#fef3c7', color: '#78350f', icon: 'clock' },
        'Aprovada': { bg: '#dcfce7', color: '#14532d', icon: 'check-circle' },
        'Em Análise': { bg: '#dbeafe', color: '#1e3a8a', icon: 'hourglass-half' }
    };
    
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
            ${cotacoes.map(cot => {
                const status = statusColors[cot.status];
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #f8fafc; border-radius: 12px; border-left: 4px solid ${status.color}; cursor: pointer; transition: all 0.2s;" 
                         onmouseover="this.style.background='#f1f5f9'; this.style.transform='translateX(4px)';"
                         onmouseout="this.style.background='#f8fafc'; this.style.transform='translateX(0)';">
                        <div style="flex: 1;">
                            <div style="font-weight: 700; color: #1e293b; font-size: 15px; margin-bottom: 4px;">${cot.id}</div>
                            <div style="font-size: 13px; color: #64748b;">${cot.fornecedor}</div>
                        </div>
                        <div style="text-align: right; margin: 0 16px;">
                            <div style="font-weight: 700; color: #1e293b; font-size: 16px;">R$ ${cot.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            <div style="font-size: 12px; color: #94a3b8;">${new Date(cot.data).toLocaleDateString('pt-BR')}</div>
                        </div>
                        <div style="padding: 6px 12px; background: ${status.bg}; border-radius: 6px; font-size: 12px; font-weight: 600; color: ${status.color}; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-${status.icon}"></i>
                            ${cot.status}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Inicializar dashboard quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('dashboard-section').classList.contains('active')) {
        renderDashboard();
    }
});
