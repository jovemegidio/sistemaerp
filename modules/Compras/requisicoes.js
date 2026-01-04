/**
 * REQUISIÇÕES DE COMPRA - Sistema Completo
 * Workflow de aprovação e gestão de requisições
 */

let requisicoes = [];
let itemReqCounter = 0;
let filtroAtual = 'todos';
let usuarioLogação = { nome: 'Admin', departamento: 'Compras', nivel: 'gerente' };

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    inicializarSistemaRequisicoes();
});

async function inicializarSistemaRequisicoes() {
    console.log('🚀 Inicializando sistema de requisições...');
    
    // Carregar usuário logação
    const userData = localStorage.getItem('usuarioLogação');
    if (userData) {
        const user = JSON.parse(userData);
        usuarioLogação.nome = user.nome || 'Admin';
    }
    
    await carregarRequisicoes();
    document.getElementById('dataRequisicao').valueAsDate = new Date();
    document.getElementById('solicitante').value = usuarioLogação.nome;
    gerarNumeroRequisicao();
    
    console.log('✅ Sistema de requisições inicialização');
}

// ============ GERENCIAMENTO DE DADOS ============

async function carregarRequisicoes() {
    const requisicoesLocal = localStorage.getItem('compras_requisicoes');
    if (requisicoesLocal) {
        requisicoes = JSON.parse(requisicoesLocal);
    } else {
        requisicoes = gerarRequisicoesExemplo();
        salvarRequisicoesLocal();
    }
    
    renderizarTabelaRequisicoes();
    atualizarCards();
}

// ============ MODAL NOVA/EDITAR ============

function abrirModalNovaRequisicao() {
    document.getElementById('requisicaoId').value = '';
    document.getElementById('formRequisicao').reset();
    document.getElementById('modalRequisicaoTitle').textContent = 'Nova Requisição de Compra';
    document.getElementById('dataRequisicao').valueAsDate = new Date();
    document.getElementById('solicitante').value = usuarioLogação.nome;
    document.getElementById('departamento').value = usuarioLogação.departamento;
    gerarNumeroRequisicao();
    limparItensRequisicao();
    adicionarItemRequisicao();
    calcularTotaisRequisicao();
    document.getElementById('modalRequisicao').classList.add('active');
}

function abrirModalEditarRequisicao(requisicaoId) {
    const req = requisicoes.find(r => r.id === requisicaoId);
    if (!req) return;
    
    // Só permite editar se estiver em rascunho ou aguardando aprovação
    if (req.status !== 'rascunho' && req.status !== 'aguardando_aprovacao') {
        alert('Não é possível editar requisições aprovadas ou rejeitadas!');
        return;
    }
    
    document.getElementById('modalRequisicaoTitle').textContent = 'Editar Requisição';
    document.getElementById('requisicaoId').value = req.id;
    document.getElementById('numeroRequisicao').value = req.numero;
    document.getElementById('dataRequisicao').value = req.data;
    document.getElementById('solicitante').value = req.solicitante;
    document.getElementById('departamento').value = req.departamento;
    document.getElementById('prioridade').value = req.prioridade;
    document.getElementById('dataNecessaria').value = req.data_necessaria || '';
    document.getElementById('justificativa').value = req.justificativa;
    
    limparItensRequisicao();
    if (req.itens && req.itens.length > 0) {
        req.itens.forEach(item => adicionarItemRequisicao(item));
    } else {
        adicionarItemRequisicao();
    }
    
    calcularTotaisRequisicao();
    document.getElementById('modalRequisicao').classList.add('active');
}

function fecharModalRequisicao() {
    document.getElementById('modalRequisicao').classList.remove('active');
}

// ============ GERENCIAMENTO DE ITENS ============

function adicionarItemRequisicao(itemData = null) {
    itemReqCounter++;
    const tbody = document.getElementById('itensRequisicaoBody');
    const tr = document.createElement('tr');
    tr.id = `itemReq-${itemReqCounter}`;
    
    tr.innerHTML = `
        <td>
            <input type="text" class="itemReq-descricao" 
                   value="${itemData.descricao || ''}" 
                   placeholder="Descrição do item">
        </td>
        <td>
            <input type="number" class="itemReq-quantidade" 
                   value="${itemData.quantidade || 1}" 
                   min="0.01" step="0.01"
                   onchange="calcularItemReqTotal(${itemReqCounter}); calcularTotaisRequisicao()">
        </td>
        <td>
            <select class="itemReq-unidade">
                <option value="UN" ${itemData.unidade === 'UN'  'selected' : ''}>UN</option>
                <option value="KG" ${itemData.unidade === 'KG'  'selected' : ''}>KG</option>
                <option value="M" ${itemData.unidade === 'M'  'selected' : ''}>M</option>
                <option value="L" ${itemData.unidade === 'L'  'selected' : ''}>L</option>
                <option value="CX" ${itemData.unidade === 'CX'  'selected' : ''}>CX</option>
            </select>
        </td>
        <td>
            <input type="number" class="itemReq-valor" 
                   value="${itemData.valor_estimado || 0}" 
                   min="0" step="0.01"
                   placeholder="0.00"
                   onchange="calcularItemReqTotal(${itemReqCounter}); calcularTotaisRequisicao()">
        </td>
        <td>
            <input type="number" class="itemReq-total" 
                   value="${itemData.total_estimação || 0}" 
                   reaçãonly 
                   style="background: #f9fafb; font-weight: 600;">
        </td>
        <td>
            <button type="button" class="btn-remove-item" onclick="removerItemRequisicao(${itemReqCounter})">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(tr);
    
    if (itemData) {
        calcularItemReqTotal(itemReqCounter);
    }
}

function removerItemRequisicao(itemId) {
    const item = document.getElementById(`itemReq-${itemId}`);
    if (item) {
        item.remove();
        calcularTotaisRequisicao();
    }
}

function limparItensRequisicao() {
    document.getElementById('itensRequisicaoBody').innerHTML = '';
    itemReqCounter = 0;
}

function calcularItemReqTotal(itemId) {
    const row = document.getElementById(`itemReq-${itemId}`);
    if (!row) return;
    
    const quantidade = parseFloat(row.querySelector('.itemReq-quantidade').value) || 0;
    const valor = parseFloat(row.querySelector('.itemReq-valor').value) || 0;
    const total = quantidade * valor;
    
    row.querySelector('.itemReq-total').value = total.toFixed(2);
}

function calcularTotaisRequisicao() {
    const rows = document.querySelectorAll('#itensRequisicaoBody tr');
    let total = 0;
    
    rows.forEach(row => {
        const itemTotal = parseFloat(row.querySelector('.itemReq-total').value) || 0;
        total += itemTotal;
    });
    
    document.getElementById('totalRequisicao').textContent = formatarMoeda(total);
}

// ============ SALVAR REQUISIÇÃO ============

function salvarRequisicao(status) {
    const requisicaoId = document.getElementById('requisicaoId').value;
    const justificativa = document.getElementById('justificativa').value.trim();
    
    if (!justificativa) {
        alert('Informe a justificativa da requisição!');
        return;
    }
    
    const itens = coletarItensRequisicao();
    if (itens.length === 0) {
        alert('Adicione pelo menos um item!');
        return;
    }
    
    const total = itens.reduce((sum, item) => sum + item.total_estimação, 0);
    
    const requisicao = {
        id: requisicaoId || Date.now().toString(),
        numero: document.getElementById('numeroRequisicao').value,
        data: document.getElementById('dataRequisicao').value,
        solicitante: document.getElementById('solicitante').value,
        departamento: document.getElementById('departamento').value,
        prioridade: document.getElementById('prioridade').value,
        data_necessaria: document.getElementById('dataNecessaria').value || null,
        justificativa: justificativa,
        status: status,
        valor_estimado: total,
        itens: itens,
        historico_aprovacao: requisicaoId  
            requisicoes.find(r => r.id === requisicaoId).historico_aprovacao || [] : [],
        created_at: requisicaoId  
            requisicoes.find(r => r.id === requisicaoId).created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    if (requisicaoId) {
        const index = requisicoes.findIndex(r => r.id === requisicaoId);
        if (index !== -1) {
            requisicoes[index] = requisicao;
        }
    } else {
        requisicoes.unshift(requisicao);
    }
    
    salvarRequisicoesLocal();
    renderizarTabelaRequisicoes();
    atualizarCards();
    fecharModalRequisicao();
    
    const mensagem = status === 'rascunho'  
        'Requisição salva como rascunho!' : 
        'Requisição enviada para aprovação!';
    mostrarNotificacao(mensagem, 'success');
}

function coletarItensRequisicao() {
    const rows = document.querySelectorAll('#itensRequisicaoBody tr');
    const itens = [];
    
    rows.forEach(row => {
        const descricao = row.querySelector('.itemReq-descricao').value.trim();
        if (!descricao) return;
        
        const quantidade = parseFloat(row.querySelector('.itemReq-quantidade').value) || 0;
        const valor = parseFloat(row.querySelector('.itemReq-valor').value) || 0;
        
        itens.push({
            descricao: descricao,
            quantidade: quantidade,
            unidade: row.querySelector('.itemReq-unidade').value,
            valor_estimado: valor,
            total_estimação: quantidade * valor
        });
    });
    
    return itens;
}

// ============ VISUALIZAR E APROVAR ============

function visualizarRequisicao(requisicaoId) {
    const req = requisicoes.find(r => r.id === requisicaoId);
    if (!req) return;
    
    const content = document.getElementById('detalhesRequisicaoContent');
    const footer = document.getElementById('detalhesRequisicaoFooter');
    
    // Workflow visual
    let workflowHTML = '';
    if (req.status !== 'rascunho') {
        workflowHTML = `
            <div class="workflow-steps">
                <div class="workflow-step completed">
                    <div class="step-circle"><i class="fas fa-file-alt"></i></div>
                    <div class="step-label">Criada</div>
                </div>
                <div class="workflow-step ${req.status === 'aguardando_aprovacao' || req.status === 'aprovada'  'active' : ''}">
                    <div class="step-circle"><i class="fas fa-clock"></i></div>
                    <div class="step-label">Em Aprovação</div>
                </div>
                <div class="workflow-step ${req.status === 'aprovada'  'completed' : ''}">
                    <div class="step-circle"><i class="fas fa-check"></i></div>
                    <div class="step-label">Aprovada</div>
                </div>
                <div class="workflow-step ${req.status === 'convertida'  'completed' : ''}">
                    <div class="step-circle"><i class="fas fa-shopping-cart"></i></div>
                    <div class="step-label">Convertida</div>
                </div>
            </div>
        `;
    }
    
    content.innerHTML = `
        ${workflowHTML}
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
            <div>
                <p style="color: #64748b; font-size: 13px; margin-bottom: 4px;">Número</p>
                <p style="font-weight: 600; font-size: 16px;">${req.numero}</p>
            </div>
            <div>
                <p style="color: #64748b; font-size: 13px; margin-bottom: 4px;">Status</p>
                <span class="badge-status badge-${req.status}">${getStatusLabelReq(req.status)}</span>
            </div>
            <div>
                <p style="color: #64748b; font-size: 13px; margin-bottom: 4px;">Solicitante</p>
                <p style="font-weight: 600;">${req.solicitante}</p>
            </div>
            <div>
                <p style="color: #64748b; font-size: 13px; margin-bottom: 4px;">Departamento</p>
                <p style="font-weight: 600;">${req.departamento}</p>
            </div>
            <div>
                <p style="color: #64748b; font-size: 13px; margin-bottom: 4px;">Data</p>
                <p style="font-weight: 600;">${formatarData(req.data)}</p>
            </div>
            <div>
                <p style="color: #64748b; font-size: 13px; margin-bottom: 4px;">Prioridade</p>
                <span class="priority-badge priority-${req.prioridade}">${req.prioridade.toUpperCase()}</span>
            </div>
        </div>
        
        <div style="margin: 20px 0;">
            <p style="color: #64748b; font-size: 13px; margin-bottom: 8px;">Justificativa</p>
            <p style="background: #f9fafb; padding: 12px; border-radius: 8px;">${req.justificativa}</p>
        </div>
        
        <h4 style="margin: 24px 0 16px;"><i class="fas fa-list"></i> Itens Requisitaçãos</h4>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                    <th style="padding: 12px; text-align: left;">Descrição</th>
                    <th style="padding: 12px; text-align: center;">Qtd</th>
                    <th style="padding: 12px; text-align: center;">Un.</th>
                    <th style="padding: 12px; text-align: right;">Valor Est.</th>
                    <th style="padding: 12px; text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${req.itens.map(item => `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px;">${item.descricao}</td>
                        <td style="padding: 12px; text-align: center;">${item.quantidade}</td>
                        <td style="padding: 12px; text-align: center;">${item.unidade}</td>
                        <td style="padding: 12px; text-align: right;">${formatarMoeda(item.valor_estimado)}</td>
                        <td style="padding: 12px; text-align: right; font-weight: 600;">${formatarMoeda(item.total_estimação)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div style="background: #f9fafb; padding: 16px; border-radius: 12px; margin-top: 16px;">
            <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; color: #8b5cf6;">
                <span>Valor Total Estimação:</span>
                <span>${formatarMoeda(req.valor_estimado)}</span>
            </div>
        </div>
        
        ${req.historico_aprovacao && req.historico_aprovacao.length > 0  `
            <div class="approval-timeline">
                <h4 style="margin-bottom: 16px;"><i class="fas fa-history"></i> Histórico de Aprovação</h4>
                ${req.historico_aprovacao.map(h => `
                    <div class="timeline-item ${h.acao}">
                        <div>
                            <p style="font-weight: 600; margin-bottom: 4px;">${h.aprovaçãor}</p>
                            <p style="font-size: 13px; color: #64748b; margin-bottom: 8px;">${formatarDataHora(h.data)}</p>
                            <p style="font-size: 14px;">
                                <span class="badge-status badge-${h.acao === 'approved'  'aprovação' : 'cancelação'}">
                                    ${h.acao === 'approved'  'Aprovação' : 'Rejeitação'}
                                </span>
                            </p>
                            ${h.observacao  `<p style="margin-top: 8px; font-size: 13px;">${h.observacao}</p>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}
    `;
    
    // Botões do footer
    if (req.status === 'aguardando_aprovacao') {
        footer.innerHTML = `
            <button type="button" class="btn-secondary" onclick="rejeitarRequisicao('${req.id}')">
                <i class="fas fa-times"></i> Rejeitar
            </button>
            <button type="button" class="btn-primary" onclick="aprovarRequisicao('${req.id}')">
                <i class="fas fa-check"></i> Aprovar
            </button>
        `;
    } else if (req.status === 'aprovada') {
        footer.innerHTML = `
            <button type="button" class="btn-secondary" onclick="fecharModalVisualizar()">Fechar</button>
            <button type="button" class="btn-primary" onclick="converterEmPedido('${req.id}')">
                <i class="fas fa-shopping-cart"></i> Converter em Pedido
            </button>
        `;
    } else {
        footer.innerHTML = `
            <button type="button" class="btn-secondary" onclick="fecharModalVisualizar()">Fechar</button>
        `;
    }
    
    document.getElementById('modalVisualizarRequisicao').classList.add('active');
}

function fecharModalVisualizar() {
    document.getElementById('modalVisualizarRequisicao').classList.remove('active');
}

function aprovarRequisicao(requisicaoId) {
    const observacao = prompt('Observações da aprovação (opcional):');
    
    const req = requisicoes.find(r => r.id === requisicaoId);
    if (req) {
        req.status = 'aprovada';
        req.historico_aprovacao = req.historico_aprovacao || [];
        req.historico_aprovacao.push({
            aprovaçãor: usuarioLogação.nome,
            acao: 'approved',
            data: new Date().toISOString(),
            observacao: observacao
        });
        
        salvarRequisicoesLocal();
        renderizarTabelaRequisicoes();
        atualizarCards();
        fecharModalVisualizar();
        mostrarNotificacao('Requisição aprovada com sucesso!', 'success');
    }
}

function rejeitarRequisicao(requisicaoId) {
    const motivo = prompt('Motivo da rejeição:');
    if (!motivo) return;
    
    const req = requisicoes.find(r => r.id === requisicaoId);
    if (req) {
        req.status = 'rejeitada';
        req.historico_aprovacao = req.historico_aprovacao || [];
        req.historico_aprovacao.push({
            aprovaçãor: usuarioLogação.nome,
            acao: 'rejected',
            data: new Date().toISOString(),
            observacao: motivo
        });
        
        salvarRequisicoesLocal();
        renderizarTabelaRequisicoes();
        atualizarCards();
        fecharModalVisualizar();
        mostrarNotificacao('Requisição rejeitada!', 'info');
    }
}

function converterEmPedido(requisicaoId) {
    if (!confirm('Converter esta requisição em pedido de compra')) return;
    
    const req = requisicoes.find(r => r.id === requisicaoId);
    if (req) {
        req.status = 'convertida';
        salvarRequisicoesLocal();
        
        // Salvar daçãos para criar pedido
        localStorage.setItem('nova_pedido_da_requisicao', JSON.stringify(req));
        
        // Redirecionar para página de pedidos
        window.location.href = 'pedidos.htmlfrom=requisicao';
    }
}

function excluirRequisicao(requisicaoId) {
    if (!confirm('Deseja realmente excluir esta requisição')) return;
    
    requisicoes = requisicoes.filter(r => r.id !== requisicaoId);
    salvarRequisicoesLocal();
    renderizarTabelaRequisicoes();
    atualizarCards();
    mostrarNotificacao('Requisição excluída!', 'success');
}

// ============ RENDERIZAÇÃO ============

function renderizarTabelaRequisicoes() {
    const tbody = document.getElementById('requisicoesTableBody');
    
    let requisicoesFiltradas = requisicoes;
    
    if (filtroAtual !== 'todos') {
        requisicoesFiltradas = requisicoes.filter(r => r.status === filtroAtual);
    }
    
    const searchTerm = document.getElementById('searchRequisicao').value.toLowerCase();
    if (searchTerm) {
        requisicoesFiltradas = requisicoesFiltradas.filter(r =>
            r.numero.toLowerCase().includes(searchTerm) ||
            r.solicitante.toLowerCase().includes(searchTerm) ||
            r.departamento.toLowerCase().includes(searchTerm)
        );
    }
    
    if (requisicoesFiltradas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-file-alt" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p>Nenhuma requisição encontrada</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = requisicoesFiltradas.map(req => `
        <tr>
            <td><strong>${req.numero}</strong></td>
            <td>${req.solicitante}</td>
            <td>${req.departamento}</td>
            <td>${formatarData(req.data)}</td>
            <td><span class="priority-badge priority-${req.prioridade}">${req.prioridade}</span></td>
            <td><strong>${formatarMoeda(req.valor_estimado)}</strong></td>
            <td><span class="badge-status badge-${req.status}">${getStatusLabelReq(req.status)}</span></td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-secondary-small" onclick="visualizarRequisicao('${req.id}')" title="Visualizar">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${(req.status === 'rascunho' || req.status === 'aguardando_aprovacao')  `
                    <button class="btn-secondary-small" onclick="abrirModalEditarRequisicao('${req.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    ` : ''}
                    ${req.status === 'rascunho'  `
                    <button class="btn-secondary-small" onclick="excluirRequisicao('${req.id}')" title="Excluir" style="color: #dc2626;">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function atualizarCards() {
    const total = requisicoes.length;
    const aguardando = requisicoes.filter(r => r.status === 'aguardando_aprovacao').length;
    const aprovadas = requisicoes.filter(r => r.status === 'aprovada').length;
    const urgentes = requisicoes.filter(r => r.prioridade === 'urgente' || r.prioridade === 'alta').length;
    
    document.getElementById('totalRequisicoes').textContent = total;
    document.getElementById('requisicoesAguardando').textContent = aguardando;
    document.getElementById('requisicoesAprovadas').textContent = aprovadas;
    document.getElementById('requisicoesUrgentes').textContent = urgentes;
}

// ============ FILTROS ============

function filtrarPorStatus(status) {
    filtroAtual = status;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.filter-btn').classList.add('active');
    renderizarTabelaRequisicoes();
}

function filtrarRequisicoes() {
    renderizarTabelaRequisicoes();
}

// ============ UTILITÁRIOS ============

function gerarNumeroRequisicao() {
    const ano = new Date().getFullYear();
    const numero = (requisicoes.length + 1).toString().padStart(4, '0');
    document.getElementById('numeroRequisicao').value = `REQ-${ano}-${numero}`;
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

function formatarData(data) {
    return data  new Date(data).toLocaleDateString('pt-BR') : '-';
}

function formatarDataHora(data) {
    return data  new Date(data).toLocaleString('pt-BR') : '-';
}

function getStatusLabelReq(status) {
    const labels = {
        'rascunho': 'Rascunho',
        'aguardando_aprovacao': 'Aguardando',
        'aprovada': 'Aprovada',
        'rejeitada': 'Rejeitada',
        'convertida': 'Convertida'
    };
    return labels[status] || status;
}

function salvarRequisicoesLocal() {
    localStorage.setItem('compras_requisicoes', JSON.stringify(requisicoes));
}

function mostrarNotificacao(mensagem, tipo) {
    alert(mensagem);
}

// ============ DADOS DE EXEMPLO ============

function gerarRequisicoesExemplo() {
    return [
        {
            id: '1',
            numero: 'REQ-2025-0001',
            data: '2025-12-10',
            solicitante: 'João Silva',
            departamento: 'Produção',
            prioridade: 'alta',
            data_necessaria: '2025-12-20',
            justificativa: 'Reposição de material para produção',
            status: 'aguardando_aprovacao',
            valor_estimado: 15000,
            itens: [
                { descricao: 'Cabo Triplex 10mm²', quantidade: 500, unidade: 'M', valor_estimado: 25, total_estimação: 12500 },
                { descricao: 'Conectores', quantidade: 100, unidade: 'UN', valor_estimado: 25, total_estimação: 2500 }
            ],
            historico_aprovacao: [],
            created_at: '2025-12-10T10:00:00Z'
        },
        {
            id: '2',
            numero: 'REQ-2025-0002',
            data: '2025-12-09',
            solicitante: 'Maria Santos',
            departamento: 'Manutenção',
            prioridade: 'normal',
            justificativa: 'Ferramentas para manutenção preventiva',
            status: 'aprovada',
            valor_estimado: 8500,
            itens: [
                { descricao: 'Jogo de chaves', quantidade: 5, unidade: 'UN', valor_estimado: 350, total_estimação: 1750 }
            ],
            historico_aprovacao: [
                {
                    aprovaçãor: 'Admin',
                    acao: 'approved',
                    data: '2025-12-09T15:00:00Z',
                    observacao: 'Aprovação conforme orçamento'
                }
            ],
            created_at: '2025-12-09T09:00:00Z'
        }
    ];
}
