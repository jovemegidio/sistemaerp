// ============================================================================
// GESTÉO DE CENTROS DE CUSTO E CATEGORIAS - Sistema Financeiro Aluforce
// ============================================================================

let centrosCusto = [];
let categorias = [];
let tabAtual = 'centros-custo';

// ============================================================================
// INICIALIZAÇÉO
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    // Verificar sistema de autenticação
    if (typeof auth !== 'undefined') {
        // Proteger página - verificar permissão
        if (!auth.protegerPagina(['centros_custo.visualizar', 'categorias.visualizar'])) {
            return;
        }
    }
    
    inicializar();
});

async function inicializar() {
    await carregarCentrosCusto();
    await carregarCategorias();
    renderizarCentrosCusto();
    renderizarCategorias();
}

// ============================================================================
// TABS
// ============================================================================

function trocarTab(tab, evt) {
    tabAtual = tab;

    // Atualizar botões
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (evt && evt.target) {
        evt.target.classList.add('active');
    }

    // Mostrar/esconder conteúdo
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
}

// ============================================================================
// CENTROS DE CUSTO - CARREGAMENTO
// ============================================================================

async function carregarCentrosCusto() {
    try {
        // TODO: Substituir por chamada real à API
        centrosCusto = await buscarCentrosCusto();
    } catch (error) {
        console.error('Erro ao carregar centros de custo:', error);
        mostrarMensagem('Erro ao carregar centros de custo', 'error');
    }
}

async function buscarCentrosCusto() {
    // TODO: Substituir por chamada real à API
    // return await fetch('/api/financeiro/centros-custo').then(r => r.json());

    // Mock data
    return [
        {
            id: 1,
            código: 'ADM001',
            nome: 'Administrativo',
            descricao: 'Despesas administrativas gerais',
            responsavel: 'João Silva',
            status: 'ativo',
            centro_pai_id: null,
            total_despesas: 45000.00,
            total_receitas: 0,
            data_criacao: '2025-01-01'
        },
        {
            id: 2,
            código: 'COM001',
            nome: 'Comercial',
            descricao: 'Departamento comercial e vendas',
            responsavel: 'Maria Santos',
            status: 'ativo',
            centro_pai_id: null,
            total_despesas: 62000.00,
            total_receitas: 180000.00,
            data_criacao: '2025-01-01'
        },
        {
            id: 3,
            código: 'COM002',
            nome: 'Marketing',
            descricao: 'Marketing e publicidade',
            responsavel: 'Carlos Oliveira',
            status: 'ativo',
            centro_pai_id: 2,
            total_despesas: 28000.00,
            total_receitas: 0,
            data_criacao: '2025-01-15'
        },
        {
            id: 4,
            código: 'OPE001',
            nome: 'Operacional',
            descricao: 'Operações e produção',
            responsavel: 'Ana Paula',
            status: 'ativo',
            centro_pai_id: null,
            total_despesas: 95000.00,
            total_receitas: 0,
            data_criacao: '2025-01-01'
        },
        {
            id: 5,
            código: 'FIN001',
            nome: 'Financeiro',
            descricao: 'Departamento financeiro',
            responsavel: 'Pedro Costa',
            status: 'ativo',
            centro_pai_id: 1,
            total_despesas: 18000.00,
            total_receitas: 5000.00,
            data_criacao: '2025-01-10'
        }
    ];
}

// ============================================================================
// CENTROS DE CUSTO - RENDERIZAÇÉO
// ============================================================================

function renderizarCentrosCusto() {
    const lista = document.getElementById('lista-centros-custo');

    if (centrosCusto.length === 0) {
        lista.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999; padding: 40px;">Nenhum centro de custo cadastração</p>';
        return;
    }

    lista.innerHTML = centrosCusto.map(centro => criarCardCentroCusto(centro)).join('');
}

function criarCardCentroCusto(centro) {
    const saldoLiquido = centro.total_receitas - centro.total_despesas;

    return `
        <div class="card">
            <div class="card-header">
                <div>
                    <h3 class="card-title">${centro.nome}</h3>
                    ${centro.código ? `<small style="color: #6b7280;">${centro.código}</small>` : ''}
                </div>
                <div class="card-actions">
                    <button class="icon-btn edit" onclick="editarCentroCusto(${centro.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn delete" onclick="excluirCentroCusto(${centro.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>

            <div class="card-info">
                ${centro.descricao ? `<p style="color: #6b7280; font-size: 14px; margin: 0 0 12px 0;">${centro.descricao}</p>` : ''}
                
                <div class="info-row">
                    <span class="info-label">Responsável:</span>
                    <span class="info-value">${centro.responsavel || '-'}</span>
                </div>

                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="badge ${centro.status}">${centro.status === 'ativo' ? 'Ativo' : 'Inativo'}</span>
                </div>

                <div class="info-row">
                    <span class="info-label">Total Despesas:</span>
                    <span class="info-value" style="color: #ef4444;">R$ ${formatarMoeda(centro.total_despesas)}</span>
                </div>

                <div class="info-row">
                    <span class="info-label">Total Receitas:</span>
                    <span class="info-value" style="color: #10b981;">R$ ${formatarMoeda(centro.total_receitas)}</span>
                </div>

                <div class="info-row">
                    <span class="info-label">Saldo Líquido:</span>
                    <span class="info-value" style="color: ${saldoLiquido >= 0 ? '#10b981' : '#ef4444'};">R$ ${formatarMoeda(Math.abs(saldoLiquido))}</span>
                </div>

                ${centro.centro_pai_id ? `
                    <div class="info-row">
                        <span class="info-label">Vinculação a:</span>
                        <span class="info-value">${obterNomeCentro(centro.centro_pai_id)}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// ============================================================================
// CENTROS DE CUSTO - FORMULÁRIO
// ============================================================================

function abrirModalCentro(id = null) {
    document.getElementById('modal-centro-titulo').textContent = id ? 'Editar Centro de Custo' : 'Novo Centro de Custo';
    document.getElementById('form-centro-custo').reset();
    document.getElementById('centro-id').value = '';

    // Carregar lista de centros pai
    const selectPai = document.getElementById('centro-pai');
    selectPai.innerHTML = '<option value="">Nenhum (nível raiz)</option>';
    
    centrosCusto.filter(c => c.id !== id).forEach(centro => {
        selectPai.innerHTML += `<option value="${centro.id}">${centro.nome}</option>`;
    });

    if (id) {
        const centro = centrosCusto.find(c => c.id === id);
        if (centro) {
            document.getElementById('centro-id').value = centro.id;
            document.getElementById('centro-nome').value = centro.nome;
            document.getElementById('centro-código').value = centro.código || '';
            document.getElementById('centro-status').value = centro.status;
            document.getElementById('centro-pai').value = centro.centro_pai_id || '';
            document.getElementById('centro-responsavel').value = centro.responsavel || '';
            document.getElementById('centro-descricao').value = centro.descricao || '';
        }
    }

    mostrarModal('modal-centro-custo');
}

async function salvarCentroCusto(event) {
    event.preventDefault();

    const id = document.getElementById('centro-id').value;
    const dados = {
        nome: document.getElementById('centro-nome').value,
        código: document.getElementById('centro-código').value,
        status: document.getElementById('centro-status').value,
        centro_pai_id: document.getElementById('centro-pai').value || null,
        responsavel: document.getElementById('centro-responsavel').value,
        descricao: document.getElementById('centro-descricao').value
    };

    try {
        if (id) {
            // TODO: Substituir por chamada real à API
            await atualizarCentroCusto(id, dados);
            const index = centrosCusto.findIndex(c => c.id == id);
            if (index !== -1) {
                centrosCusto[index] = { ...centrosCusto[index], ...dados };
            }
            mostrarMensagem('Centro de custo atualizado com sucesso!', 'success');
        } else {
            // TODO: Substituir por chamada real à API
            const novo = await criarCentroCusto(dados);
            centrosCusto.push(novo);
            mostrarMensagem('Centro de custo criado com sucesso!', 'success');
        }

        fecharModal('modal-centro-custo');
        renderizarCentrosCusto();
    } catch (error) {
        console.error('Erro ao salvar:', error);
        mostrarMensagem('Erro ao salvar centro de custo', 'error');
    }
}

async function criarCentroCusto(dados) {
    // TODO: Substituir por chamada real à API
    // return await fetch('/api/financeiro/centros-custo', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(dados)
    // }).then(r => r.json());

    return {
        id: Math.max(...centrosCusto.map(c => c.id)) + 1,
        ...dados,
        total_despesas: 0,
        total_receitas: 0,
        data_criacao: new Date().toISOString()
    };
}

async function atualizarCentroCusto(id, dados) {
    // TODO: Substituir por chamada real à API
    // return await fetch(`/api/financeiro/centros-custo/${id}`, {
    //     method: 'PUT',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(dados)
    // }).then(r => r.json());

    return { success: true };
}

function editarCentroCusto(id) {
    abrirModalCentro(id);
}

async function excluirCentroCusto(id) {
    if (!confirm('Deseja realmente excluir este centro de custo')) return;

    try {
        // TODO: Substituir por chamada real à API
        await deletarCentroCusto(id);
        
        centrosCusto = centrosCusto.filter(c => c.id !== id);
        renderizarCentrosCusto();
        mostrarMensagem('Centro de custo excluído com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao excluir:', error);
        mostrarMensagem('Erro ao excluir centro de custo', 'error');
    }
}

async function deletarCentroCusto(id) {
    // TODO: Substituir por chamada real à API
    // return await fetch(`/api/financeiro/centros-custo/${id}`, { method: 'DELETE' }).then(r => r.json());
    return { success: true };
}

function buscarCentros(termo) {
    const cards = document.querySelectorAll('#lista-centros-custo .card');
    termo = termo.toLowerCase();

    cards.forEach(card => {
        const texto = card.textContent.toLowerCase();
        card.style.display = texto.includes(termo)  'block' : 'none';
    });
}

// ============================================================================
// CATEGORIAS - CARREGAMENTO
// ============================================================================

async function carregarCategorias() {
    try {
        // TODO: Substituir por chamada real à API
        categorias = await buscarCategorias();
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        mostrarMensagem('Erro ao carregar categorias', 'error');
    }
}

async function buscarCategorias() {
    // TODO: Substituir por chamada real à API
    // return await fetch('/api/financeiro/categorias').then(r => r.json());

    // Mock data
    return [
        {
            id: 1,
            nome: 'Vendas',
            tipo: 'receita',
            cor: '#10b981',
            icone: 'fa-shopping-cart',
            descricao: 'Receitas de vendas de produtos e serviços',
            status: 'ativo',
            categoria_pai_id: null,
            total_movimentacoes: 15,
            valor_total: 180000.00
        },
        {
            id: 2,
            nome: 'Vendas Online',
            tipo: 'receita',
            cor: '#3b82f6',
            icone: 'fa-globe',
            descricao: 'Vendas através do e-commerce',
            status: 'ativo',
            categoria_pai_id: 1,
            total_movimentacoes: 8,
            valor_total: 95000.00
        },
        {
            id: 3,
            nome: 'Compras',
            tipo: 'despesa',
            cor: '#ef4444',
            icone: 'fa-cart-shopping',
            descricao: 'Compras de mercaçãorias e matérias-primas',
            status: 'ativo',
            categoria_pai_id: null,
            total_movimentacoes: 12,
            valor_total: 85000.00
        },
        {
            id: 4,
            nome: 'Salários',
            tipo: 'despesa',
            cor: '#f59e0b',
            icone: 'fa-money-bill',
            descricao: 'Pagamentos de salários e encargos',
            status: 'ativo',
            categoria_pai_id: null,
            total_movimentacoes: 20,
            valor_total: 120000.00
        },
        {
            id: 5,
            nome: 'Material de Escritório',
            tipo: 'despesa',
            cor: '#8b5cf6',
            icone: 'fa-pencil',
            descricao: 'Materiais de consumo do escritório',
            status: 'ativo',
            categoria_pai_id: null,
            total_movimentacoes: 5,
            valor_total: 8500.00
        },
        {
            id: 6,
            nome: 'Impostos',
            tipo: 'despesa',
            cor: '#dc2626',
            icone: 'fa-file-invoice-dollar',
            descricao: 'Impostos e taxas governamentais',
            status: 'ativo',
            categoria_pai_id: null,
            total_movimentacoes: 18,
            valor_total: 42000.00
        }
    ];
}

// ============================================================================
// CATEGORIAS - RENDERIZAÇÉO
// ============================================================================

function renderizarCategorias() {
    const lista = document.getElementById('lista-categorias');

    if (categorias.length === 0) {
        lista.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999; padding: 40px;">Nenhuma categoria cadastrada</p>';
        return;
    }

    lista.innerHTML = categorias.map(cat => criarCardCategoria(cat)).join('');
}

function criarCardCategoria(cat) {
    return `
        <div class="card" style="border-left-color: ${cat.cor};">
            <div class="card-header">
                <div>
                    <h3 class="card-title">
                        ${cat.icone ? `<i class="fas ${cat.icone}" style="color: ${cat.cor};"></i>` : ''}
                        ${cat.nome}
                    </h3>
                    <small style="color: #6b7280;">${cat.tipo === 'receita' ? 'Receita' : cat.tipo === 'despesa' ? 'Despesa' : 'Ambos'}</small>
                </div>
                <div class="card-actions">
                    <button class="icon-btn edit" onclick="editarCategoria(${cat.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn delete" onclick="excluirCategoria(${cat.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>

            <div class="card-info">
                ${cat.descricao ? `<p style="color: #6b7280; font-size: 14px; margin: 0 0 12px 0;">${cat.descricao}</p>` : ''}
                
                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="badge ${cat.status}">${cat.status === 'ativo' ? 'Ativo' : 'Inativo'}</span>
                </div>

                <div class="info-row">
                    <span class="info-label">Total de Movimentações:</span>
                    <span class="info-value">${cat.total_movimentacoes || 0}</span>
                </div>

                <div class="info-row">
                    <span class="info-label">Valor Total:</span>
                    <span class="info-value" style="color: ${cat.tipo === 'receita' ? '#10b981' : '#ef4444'};">R$ ${formatarMoeda(cat.valor_total)}</span>
                </div>

                ${cat.categoria_pai_id ? `
                    <div class="info-row">
                        <span class="info-label">Vinculação a:</span>
                        <span class="info-value">${obterNomeCategoria(cat.categoria_pai_id)}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// ============================================================================
// CATEGORIAS - FORMULÁRIO
// ============================================================================

function abrirModalCategoria(id = null) {
    document.getElementById('modal-categoria-titulo').textContent = id ? 'Editar Categoria' : 'Nova Categoria';
    document.getElementById('form-categoria').reset();
    document.getElementById('categoria-id').value = '';

    // Carregar lista de categorias pai
    const selectPai = document.getElementById('categoria-pai');
    selectPai.innerHTML = '<option value="">Nenhuma (nível raiz)</option>';
    
    categorias.filter(c => c.id !== id).forEach(cat => {
        selectPai.innerHTML += `<option value="${cat.id}">${cat.nome}</option>`;
    });

    if (id) {
        const cat = categorias.find(c => c.id === id);
        if (cat) {
            document.getElementById('categoria-id').value = cat.id;
            document.getElementById('categoria-nome').value = cat.nome;
            document.getElementById('categoria-tipo').value = cat.tipo;
            document.getElementById('categoria-status').value = cat.status;
            document.getElementById('categoria-pai').value = cat.categoria_pai_id || '';
            document.getElementById('categoria-cor').value = cat.cor;
            document.getElementById('categoria-icone').value = cat.icone || '';
            document.getElementById('categoria-descricao').value = cat.descricao || '';
        }
    }

    mostrarModal('modal-categoria');
}

async function salvarCategoria(event) {
    event.preventDefault();

    const id = document.getElementById('categoria-id').value;
    const dados = {
        nome: document.getElementById('categoria-nome').value,
        tipo: document.getElementById('categoria-tipo').value,
        status: document.getElementById('categoria-status').value,
        categoria_pai_id: document.getElementById('categoria-pai').value || null,
        cor: document.getElementById('categoria-cor').value,
        icone: document.getElementById('categoria-icone').value,
        descricao: document.getElementById('categoria-descricao').value
    };

    try {
        if (id) {
            // TODO: Substituir por chamada real à API
            await atualizarCategoria(id, dados);
            const index = categorias.findIndex(c => c.id == id);
            if (index !== -1) {
                categorias[index] = { ...categorias[index], ...dados };
            }
            mostrarMensagem('Categoria atualizada com sucesso!', 'success');
        } else {
            // TODO: Substituir por chamada real à API
            const novo = await criarCategoria(dados);
            categorias.push(novo);
            mostrarMensagem('Categoria criada com sucesso!', 'success');
        }

        fecharModal('modal-categoria');
        renderizarCategorias();
    } catch (error) {
        console.error('Erro ao salvar:', error);
        mostrarMensagem('Erro ao salvar categoria', 'error');
    }
}

async function criarCategoria(dados) {
    // TODO: Substituir por chamada real à API
    return {
        id: Math.max(...categorias.map(c => c.id)) + 1,
        ...dados,
        total_movimentacoes: 0,
        valor_total: 0
    };
}

async function atualizarCategoria(id, dados) {
    // TODO: Substituir por chamada real à API
    return { success: true };
}

function editarCategoria(id) {
    abrirModalCategoria(id);
}

async function excluirCategoria(id) {
    if (!confirm('Deseja realmente excluir está categoria')) return;

    try {
        // TODO: Substituir por chamada real à API
        await deletarCategoria(id);
        
        categorias = categorias.filter(c => c.id !== id);
        renderizarCategorias();
        mostrarMensagem('Categoria excluída com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao excluir:', error);
        mostrarMensagem('Erro ao excluir categoria', 'error');
    }
}

async function deletarCategoria(id) {
    // TODO: Substituir por chamada real à API
    return { success: true };
}

function buscarCategorias(termo) {
    const cards = document.querySelectorAll('#lista-categorias .card');
    termo = termo.toLowerCase();

    cards.forEach(card => {
        const texto = card.textContent.toLowerCase();
        card.style.display = texto.includes(termo)  'block' : 'none';
    });
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(valor || 0);
}

function obterNomeCentro(id) {
    const centro = centrosCusto.find(c => c.id == id);
    return centro ? centro.nome : '-';
}

function obterNomeCategoria(id) {
    const cat = categorias.find(c => c.id == id);
    return cat ? cat.nome : '-';
}

function mostrarModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function fecharModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function mostrarMensagem(mensagem, tipo) {
    console.log(`[${tipo.toUpperCase()}] ${mensagem}`);
    
    if (tipo === 'error') {
        alert('❌ ' + mensagem);
    } else if (tipo === 'success') {
        alert('✅ ' + mensagem);
    }
}
