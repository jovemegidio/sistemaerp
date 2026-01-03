/**
 * PEDIDOS DE COMPRA - Gerenciamento Completo
 * Sistema completo de criação, edição, aprovação e acompanhamento de pedidos
 */

let pedidos = [];
let fornecedores = [];
let produtos = [];
let itemCounter = 0;
let filtroAtual = 'todos';

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    inicializarSistema();
});

async function inicializarSistema() {
    console.log('🚀 Inicializando sistema de pedidos...');
    
    // Carregar dados
    await carregarFornecedores();
    await carregarProdutos();
    await carregarPedidos();
    
    // Configurar data padrão
    document.getElementById('dataPedido').valueAsDate = new Date();
    
    // Gerar número do pedido
    gerarNumeroPedido();
    
    console.log('✅ Sistema inicializado');
}

// ============ GERENCIAMENTO DE DADOS ============

async function carregarPedidos() {
    try {
        // Tentar carregar do backend
        const response = await fetch('/api/compras/pedidos');
        if (response.ok) {
            pedidos = await response.json();
        }
    } catch (error) {
        console.log('Carregando pedidos do localStorage...');
    }
    
    // Fallback: localStorage
    const pedidosLocal = localStorage.getItem('compras_pedidos');
    if (pedidosLocal) {
        pedidos = JSON.parse(pedidosLocal);
    } else {
        // Dados de exemplo
        pedidos = gerarPedidosExemplo();
        salvarPedidosLocal();
    }
    
    renderizarTabelaPedidos();
    atualizarCards();
}

async function carregarFornecedores() {
    try {
        const response = await fetch('/api/compras/fornecedores');
        if (response.ok) {
            fornecedores = await response.json();
        }
    } catch (error) {
        console.log('Carregando fornecedores do localStorage...');
    }
    
    const fornecedoresLocal = localStorage.getItem('compras_fornecedores');
    if (fornecedoresLocal) {
        fornecedores = JSON.parse(fornecedoresLocal);
    } else {
        fornecedores = gerarFornecedoresExemplo();
    }
    
    preencherSelectFornecedores();
}

async function carregarProdutos() {
    try {
        const response = await fetch('/api/produtos');
        if (response.ok) {
            produtos = await response.json();
        }
    } catch (error) {
        console.log('Carregando produtos do localStorage...');
    }
    
    const produtosLocal = localStorage.getItem('produtos');
    if (produtosLocal) {
        produtos = JSON.parse(produtosLocal);
    } else {
        produtos = gerarProdutosExemplo();
    }
}

// ============ MODAL NOVO/EDITAR PEDIDO ============

function abrirModalNovoPedido() {
    document.getElementById('pedidoId').value = '';
    document.getElementById('formPedido').reset();
    document.getElementById('modalPedidoTitle').textContent = 'Novo Pedido de Compra';
    document.getElementById('dataPedido').valueAsDate = new Date();
    gerarNumeroPedido();
    limparItens();
    adicionarItem(); // Adiciona primeira linha
    calcularTotais();
    document.getElementById('modalPedido').classList.add('active');
}

function abrirModalEditarPedido(pedidoId) {
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (!pedido) return;
    
    document.getElementById('modalPedidoTitle').textContent = 'Editar Pedido de Compra';
    document.getElementById('pedidoId').value = pedido.id;
    document.getElementById('numeroPedido').value = pedido.numero_pedido;
    document.getElementById('dataPedido').value = pedido.data_pedido;
    document.getElementById('fornecedorId').value = pedido.fornecedor_id;
    document.getElementById('dataEntregaPrevista').value = pedido.data_entrega_prevista || '';
    document.getElementById('statusPedido').value = pedido.status;
    document.getElementById('condicoesPagamento').value = pedido.condicoes_pagamento || '';
    document.getElementById('observacoes').value = pedido.observacoes || '';
    document.getElementById('desconto').value = pedido.desconto || 0;
    document.getElementById('frete').value = pedido.frete || 0;
    
    limparItens();
    if (pedido.itens && pedido.itens.length > 0) {
        pedido.itens.forEach(item => {
            adicionarItem(item);
        });
    } else {
        adicionarItem();
    }
    
    calcularTotais();
    document.getElementById('modalPedido').classList.add('active');
}

function fecharModalPedido() {
    document.getElementById('modalPedido').classList.remove('active');
}

// ============ GERENCIAMENTO DE ITENS ============

function adicionarItem(itemData = null) {
    itemCounter++;
    const tbody = document.getElementById('itensTableBody');
    const tr = document.createElement('tr');
    tr.id = `item-${itemCounter}`;
    
    tr.innerHTML = `
        <td>
            <input type="text" class="item-descricao" 
                   value="${itemData?.descricao || ''}" 
                   placeholder="Descrição do item" 
                   onchange="calcularTotais()">
        </td>
        <td>
            <input type="number" class="item-quantidade" 
                   value="${itemData?.quantidade || 1}" 
                   min="0.01" step="0.01"
                   onchange="calcularItemTotal(${itemCounter}); calcularTotais()">
        </td>
        <td>
            <select class="item-unidade">
                <option value="UN" ${itemData?.unidade === 'UN' ? 'selected' : ''}>UN</option>
                <option value="KG" ${itemData?.unidade === 'KG' ? 'selected' : ''}>KG</option>
                <option value="M" ${itemData?.unidade === 'M' ? 'selected' : ''}>M</option>
                <option value="M2" ${itemData?.unidade === 'M2' ? 'selected' : ''}>M²</option>
                <option value="M3" ${itemData?.unidade === 'M3' ? 'selected' : ''}>M³</option>
                <option value="L" ${itemData?.unidade === 'L' ? 'selected' : ''}>L</option>
                <option value="CX" ${itemData?.unidade === 'CX' ? 'selected' : ''}>CX</option>
                <option value="PC" ${itemData?.unidade === 'PC' ? 'selected' : ''}>PC</option>
            </select>
        </td>
        <td>
            <input type="number" class="item-preco" 
                   value="${itemData?.preco_unitario || 0}" 
                   min="0" step="0.01"
                   placeholder="0.00"
                   onchange="calcularItemTotal(${itemCounter}); calcularTotais()">
        </td>
        <td>
            <input type="number" class="item-total" 
                   value="${itemData?.preco_total || 0}" 
                   readonly 
                   style="background: #f9fafb; font-weight: 600;">
        </td>
        <td>
            <button type="button" class="btn-remove-item" onclick="removerItem(${itemCounter})">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(tr);
    
    if (itemData) {
        calcularItemTotal(itemCounter);
    }
}

function removerItem(itemId) {
    const item = document.getElementById(`item-${itemId}`);
    if (item) {
        item.remove();
        calcularTotais();
    }
}

function limparItens() {
    document.getElementById('itensTableBody').innerHTML = '';
    itemCounter = 0;
}

function calcularItemTotal(itemId) {
    const row = document.getElementById(`item-${itemId}`);
    if (!row) return;
    
    const quantidade = parseFloat(row.querySelector('.item-quantidade').value) || 0;
    const preco = parseFloat(row.querySelector('.item-preco').value) || 0;
    const total = quantidade * preco;
    
    row.querySelector('.item-total').value = total.toFixed(2);
}

function calcularTotais() {
    const rows = document.querySelectorAll('#itensTableBody tr');
    let subtotal = 0;
    
    rows.forEach(row => {
        const total = parseFloat(row.querySelector('.item-total').value) || 0;
        subtotal += total;
    });
    
    const desconto = parseFloat(document.getElementById('desconto').value) || 0;
    const frete = parseFloat(document.getElementById('frete').value) || 0;
    
    const valorDesconto = subtotal * (desconto / 100);
    const totalFinal = subtotal - valorDesconto + frete;
    
    document.getElementById('subtotal').textContent = formatarMoeda(subtotal);
    document.getElementById('totalPedido').textContent = formatarMoeda(totalFinal);
}

// ============ SALVAR PEDIDO ============

async function salvarPedido() {
    const pedidoId = document.getElementById('pedidoId').value;
    const fornecedorId = document.getElementById('fornecedorId').value;
    
    if (!fornecedorId) {
        alert('Selecione um fornecedor!');
        return;
    }
    
    const itens = coletarItens();
    if (itens.length === 0) {
        alert('Adicione pelo menos um item ao pedido!');
        return;
    }
    
    const subtotal = itens.reduce((sum, item) => sum + item.preco_total, 0);
    const desconto = parseFloat(document.getElementById('desconto').value) || 0;
    const frete = parseFloat(document.getElementById('frete').value) || 0;
    const valorDesconto = subtotal * (desconto / 100);
    const valorFinal = subtotal - valorDesconto + frete;
    
    const fornecedor = fornecedores.find(f => f.id == fornecedorId);
    
    const pedido = {
        id: pedidoId || Date.now().toString(),
        numero_pedido: document.getElementById('numeroPedido').value,
        fornecedor_id: parseInt(fornecedorId),
        fornecedor_nome: fornecedor?.nome || fornecedor?.razao_social || 'N/A',
        data_pedido: document.getElementById('dataPedido').value,
        data_entrega_prevista: document.getElementById('dataEntregaPrevista').value || null,
        status: document.getElementById('statusPedido').value,
        condicoes_pagamento: document.getElementById('condicoesPagamento').value,
        observacoes: document.getElementById('observacoes').value,
        valor_total: subtotal,
        desconto: desconto,
        frete: frete,
        valor_final: valorFinal,
        itens: itens,
        created_at: pedidoId ? pedidos.find(p => p.id === pedidoId)?.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    try {
        // Tentar salvar no backend
        const response = await fetch('/api/compras/pedidos', {
            method: pedidoId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedido)
        });
        
        if (response.ok) {
            const result = await response.json();
            pedido.id = result.id || pedido.id;
        }
    } catch (error) {
        console.log('Salvando localmente...');
    }
    
    // Salvar localmente
    if (pedidoId) {
        const index = pedidos.findIndex(p => p.id === pedidoId);
        if (index !== -1) {
            pedidos[index] = pedido;
        }
    } else {
        pedidos.unshift(pedido);
    }
    
    salvarPedidosLocal();
    renderizarTabelaPedidos();
    atualizarCards();
    fecharModalPedido();
    
    mostrarNotificacao(pedidoId ? 'Pedido atualizado com sucesso!' : 'Pedido criado com sucesso!', 'success');
}

function coletarItens() {
    const rows = document.querySelectorAll('#itensTableBody tr');
    const itens = [];
    
    rows.forEach(row => {
        const descricao = row.querySelector('.item-descricao').value.trim();
        if (!descricao) return;
        
        const quantidade = parseFloat(row.querySelector('.item-quantidade').value) || 0;
        const preco = parseFloat(row.querySelector('.item-preco').value) || 0;
        
        itens.push({
            descricao: descricao,
            quantidade: quantidade,
            unidade: row.querySelector('.item-unidade').value,
            preco_unitario: preco,
            preco_total: quantidade * preco
        });
    });
    
    return itens;
}

// ============ RENDERIZAÇÃO ============

function renderizarTabelaPedidos() {
    const tbody = document.getElementById('pedidosTableBody');
    
    let pedidosFiltrados = pedidos;
    
    // Filtro por status
    if (filtroAtual !== 'todos') {
        pedidosFiltrados = pedidos.filter(p => p.status === filtroAtual);
    }
    
    // Filtro por busca
    const searchTerm = document.getElementById('searchPedido')?.value?.toLowerCase();
    if (searchTerm) {
        pedidosFiltrados = pedidosFiltrados.filter(p => 
            p.numero_pedido.toLowerCase().includes(searchTerm) ||
            p.fornecedor_nome.toLowerCase().includes(searchTerm)
        );
    }
    
    if (pedidosFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-shopping-cart" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p>Nenhum pedido encontrado</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = pedidosFiltrados.map(pedido => `
        <tr>
            <td><strong>${pedido.numero_pedido}</strong></td>
            <td>${pedido.fornecedor_nome}</td>
            <td>${formatarData(pedido.data_pedido)}</td>
            <td>${pedido.data_entrega_prevista ? formatarData(pedido.data_entrega_prevista) : '-'}</td>
            <td><strong>${formatarMoeda(pedido.valor_final)}</strong></td>
            <td><span class="badge-status badge-${pedido.status}">${getStatusLabel(pedido.status)}</span></td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-secondary-small" onclick="visualizarPedido('${pedido.id}')" title="Visualizar">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-secondary-small" onclick="abrirModalEditarPedido('${pedido.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${pedido.status === 'pendente' ? `
                    <button class="btn-secondary-small" onclick="aprovarPedido('${pedido.id}')" title="Aprovar" style="color: #10b981;">
                        <i class="fas fa-check"></i>
                    </button>
                    ` : ''}
                    <button class="btn-secondary-small" onclick="excluirPedido('${pedido.id}')" title="Excluir" style="color: #dc2626;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function atualizarCards() {
    const total = pedidos.length;
    const pendentes = pedidos.filter(p => p.status === 'pendente').length;
    const aprovados = pedidos.filter(p => p.status === 'aprovado' || p.status === 'recebido').length;
    
    const mesAtual = new Date().getMonth();
    const valorMesAtual = pedidos
        .filter(p => new Date(p.data_pedido).getMonth() === mesAtual)
        .reduce((sum, p) => sum + (p.valor_final || 0), 0);
    
    document.getElementById('totalPedidos').textContent = total;
    document.getElementById('pedidosPendentes').textContent = pendentes;
    document.getElementById('pedidosAprovados').textContent = aprovados;
    document.getElementById('valorTotal').textContent = formatarMoeda(valorMesAtual);
}

// ============ AÇÕES ============

function visualizarPedido(pedidoId) {
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (!pedido) return;
    
    const content = document.getElementById('detalhesContent');
    content.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
            <div>
                <p style="color: #64748b; font-size: 13px; margin-bottom: 4px;">Número do Pedido</p>
                <p style="font-weight: 600; font-size: 16px;">${pedido.numero_pedido}</p>
            </div>
            <div>
                <p style="color: #64748b; font-size: 13px; margin-bottom: 4px;">Status</p>
                <span class="badge-status badge-${pedido.status}">${getStatusLabel(pedido.status)}</span>
            </div>
            <div>
                <p style="color: #64748b; font-size: 13px; margin-bottom: 4px;">Fornecedor</p>
                <p style="font-weight: 600;">${pedido.fornecedor_nome}</p>
            </div>
            <div>
                <p style="color: #64748b; font-size: 13px; margin-bottom: 4px;">Data do Pedido</p>
                <p style="font-weight: 600;">${formatarData(pedido.data_pedido)}</p>
            </div>
            <div>
                <p style="color: #64748b; font-size: 13px; margin-bottom: 4px;">Entrega Prevista</p>
                <p style="font-weight: 600;">${pedido.data_entrega_prevista ? formatarData(pedido.data_entrega_prevista) : '-'}</p>
            </div>
            <div>
                <p style="color: #64748b; font-size: 13px; margin-bottom: 4px;">Condições de Pagamento</p>
                <p style="font-weight: 600;">${pedido.condicoes_pagamento || '-'}</p>
            </div>
        </div>
        
        <h4 style="margin: 24px 0 16px; font-size: 16px;"><i class="fas fa-list"></i> Itens do Pedido</h4>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                    <th style="padding: 12px; text-align: left;">Descrição</th>
                    <th style="padding: 12px; text-align: center;">Qtd</th>
                    <th style="padding: 12px; text-align: center;">Un.</th>
                    <th style="padding: 12px; text-align: right;">Preço Unit.</th>
                    <th style="padding: 12px; text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${pedido.itens.map(item => `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px;">${item.descricao}</td>
                        <td style="padding: 12px; text-align: center;">${item.quantidade}</td>
                        <td style="padding: 12px; text-align: center;">${item.unidade}</td>
                        <td style="padding: 12px; text-align: right;">${formatarMoeda(item.preco_unitario)}</td>
                        <td style="padding: 12px; text-align: right; font-weight: 600;">${formatarMoeda(item.preco_total)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin-top: 20px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span>Subtotal:</span>
                <span style="font-weight: 600;">${formatarMoeda(pedido.valor_total)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span>Desconto (${pedido.desconto}%):</span>
                <span style="font-weight: 600;">- ${formatarMoeda(pedido.valor_total * pedido.desconto / 100)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span>Frete:</span>
                <span style="font-weight: 600;">${formatarMoeda(pedido.frete)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #e5e7eb; margin-top: 8px; font-size: 18px; color: #8b5cf6;">
                <span style="font-weight: 700;">Total:</span>
                <span style="font-weight: 700;">${formatarMoeda(pedido.valor_final)}</span>
            </div>
        </div>
        
        ${pedido.observacoes ? `
            <div style="margin-top: 20px;">
                <p style="color: #64748b; font-size: 13px; margin-bottom: 8px;">Observações</p>
                <p style="background: #f9fafb; padding: 12px; border-radius: 8px;">${pedido.observacoes}</p>
            </div>
        ` : ''}
    `;
    
    document.getElementById('modalVisualizarPedido').classList.add('active');
}

function fecharModalVisualizar() {
    document.getElementById('modalVisualizarPedido').classList.remove('active');
}

function aprovarPedido(pedidoId) {
    if (!confirm('Deseja aprovar este pedido?')) return;
    
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (pedido) {
        pedido.status = 'aprovado';
        pedido.data_aprovacao = new Date().toISOString();
        salvarPedidosLocal();
        renderizarTabelaPedidos();
        atualizarCards();
        mostrarNotificacao('Pedido aprovado com sucesso!', 'success');
    }
}

function excluirPedido(pedidoId) {
    if (!confirm('Deseja realmente excluir este pedido?')) return;
    
    pedidos = pedidos.filter(p => p.id !== pedidoId);
    salvarPedidosLocal();
    renderizarTabelaPedidos();
    atualizarCards();
    mostrarNotificacao('Pedido excluído com sucesso!', 'success');
}

function imprimirPedido() {
    window.print();
}

function exportarPedidos() {
    const csv = gerarCSV(pedidos);
    baixarArquivo(csv, 'pedidos-compra.csv', 'text/csv');
    mostrarNotificacao('Pedidos exportados com sucesso!', 'success');
}

// ============ FILTROS ============

function filtrarPorStatus(status) {
    filtroAtual = status;
    
    // Atualizar botões
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.filter-btn').classList.add('active');
    
    renderizarTabelaPedidos();
}

function filtrarPedidos() {
    renderizarTabelaPedidos();
}

// ============ UTILITÁRIOS ============

function gerarNumeroPedido() {
    const ano = new Date().getFullYear();
    const numero = (pedidos.length + 1).toString().padStart(4, '0');
    document.getElementById('numeroPedido').value = `PC-${ano}-${numero}`;
}

function preencherSelectFornecedores() {
    const select = document.getElementById('fornecedorId');
    select.innerHTML = '<option value="">Selecione...</option>';
    
    fornecedores.forEach(f => {
        const option = document.createElement('option');
        option.value = f.id;
        option.textContent = f.razao_social || f.nome;
        select.appendChild(option);
    });
}

function carregarProdutosFornecedor() {
    // Implementar filtro de produtos por fornecedor se necessário
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor || 0);
}

function formatarData(data) {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
}

function getStatusLabel(status) {
    const labels = {
        'pendente': 'Pendente',
        'aprovado': 'Aprovado',
        'recebido': 'Recebido',
        'parcial': 'Parcial',
        'cancelado': 'Cancelado'
    };
    return labels[status] || status;
}

function salvarPedidosLocal() {
    localStorage.setItem('compras_pedidos', JSON.stringify(pedidos));
}

function mostrarNotificacao(mensagem, tipo) {
    // Implementar sistema de notificações toast
    alert(mensagem);
}

function gerarCSV(data) {
    const headers = ['Número', 'Fornecedor', 'Data', 'Valor', 'Status'];
    const rows = data.map(p => [
        p.numero_pedido,
        p.fornecedor_nome,
        p.data_pedido,
        p.valor_final,
        p.status
    ]);
    
    return [headers, ...rows].map(row => row.join(';')).join('\n');
}

function baixarArquivo(conteudo, nomeArquivo, tipo) {
    const blob = new Blob([conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
}

// ============ DADOS DE EXEMPLO ============

function gerarPedidosExemplo() {
    return [
        {
            id: '1',
            numero_pedido: 'PC-2025-0001',
            fornecedor_id: 1,
            fornecedor_nome: 'Distribuidora Alpha Ltda',
            data_pedido: '2025-12-10',
            data_entrega_prevista: '2025-12-20',
            status: 'aprovado',
            valor_total: 15000,
            desconto: 5,
            frete: 250,
            valor_final: 14500,
            condicoes_pagamento: '30/60 dias',
            observacoes: 'Entrega urgente',
            itens: [
                { descricao: 'Cabo Triplex 10mm²', quantidade: 500, unidade: 'M', preco_unitario: 25, preco_total: 12500 },
                { descricao: 'Conector RJ45', quantidade: 100, unidade: 'UN', preco_unitario: 25, preco_total: 2500 }
            ],
            created_at: '2025-12-10T10:00:00Z'
        },
        {
            id: '2',
            numero_pedido: 'PC-2025-0002',
            fornecedor_id: 2,
            fornecedor_nome: 'Fornecedor Beta S.A.',
            data_pedido: '2025-12-11',
            status: 'pendente',
            valor_total: 8500,
            desconto: 0,
            frete: 150,
            valor_final: 8650,
            itens: [
                { descricao: 'Isolador Polimérico', quantidade: 50, unidade: 'PC', preco_unitario: 170, preco_total: 8500 }
            ],
            created_at: '2025-12-11T14:30:00Z'
        }
    ];
}

function gerarFornecedoresExemplo() {
    return [
        { id: 1, razao_social: 'Distribuidora Alpha Ltda', cnpj: '12.345.678/0001-90' },
        { id: 2, razao_social: 'Fornecedor Beta S.A.', cnpj: '98.765.432/0001-10' },
        { id: 3, razao_social: 'Materiais Gama Ltda', cnpj: '11.222.333/0001-44' }
    ];
}

function gerarProdutosExemplo() {
    return [
        { id: 1, codigo: 'CBT-10', nome: 'Cabo Triplex 10mm²', preco: 25 },
        { id: 2, codigo: 'CONN-RJ45', nome: 'Conector RJ45', preco: 25 },
        { id: 3, codigo: 'ISO-15KV', nome: 'Isolador Polimérico', preco: 170 }
    ];
}
