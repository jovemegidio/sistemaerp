// ===== MÓDULO FINANCEIRO - ALUFORCE =====
// Sistema completo de gestão financeira

// Variáveis Globais
let usuarioAtual = null;
let permissoesFinanceiro = null;
let contasPagar = [];
let contasReceber = [];
let contaSelecionada = null;
let tipoModalAtual = null;

// ===== AUTENTICAÇÉO =====
async function verificarAutenticacao() {
    try {
        console.log('🔍 [Financeiro] Verificando autenticação...');
        const resp = await fetch('/api/me', { credentials: 'include' });
        
        if (!resp.ok) {
            console.warn('⚠️ [Financeiro] Usuário não autenticado, redirecionando...');
            window.location.href = '/';
            return false;
        }
        
        const user = await resp.json();
        usuarioAtual = user;
        window.usuarioAtual = user;
        
        localStorage.setItem('userData', JSON.stringify(user));
        console.log('✅ [Financeiro] Usuário autenticado:', user.nome);
        
        // Atualizar nome do usuário no header
        const userText = document.querySelector('.user-text');
        if (userText) userText.textContent = user.nome;
        
        return true;
    } catch (error) {
        console.error('❌ [Financeiro] Erro na autenticação:', error);
        window.location.href = '/';
        return false;
    }
}

// ===== INICIALIZAÇÉO =====
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Verificar autenticação primeiro
        const autenticado = await verificarAutenticacao();
        if (!autenticado) return;
        
        // Carregar permissões e dados
        await carregarPermissoes();
        await carregarDadosFinanceiros();
        configurarEventListeners();
        inicializarModais();
        
        console.log('✅ [Financeiro] Módulo inicializado com sucesso');
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
    }
});

// ===== PERMISSÕES =====
async function carregarPermissoes() {
    try {
        const response = await fetch('/api/financeiro/permissoes', { credentials: 'include' });
        if (!response.ok) {
            console.warn('⚠️ API de permissões não disponível, usando permissões padrão');
            throw new Error('Erro ao carregar permissões');
        }
        
        permissoesFinanceiro = await response.json();
        window.permissoesFinanceiro = permissoesFinanceiro;
        console.log('✅ Permissões carregadas:', permissoesFinanceiro);
        
        // Ocultar botões sem permissão
        atualizarUIPermissoes();
    } catch (error) {
        console.warn('⚠️ Usando permissões padrão (todas habilitadas)');
        // Permitir acesso total como fallback
        permissoesFinanceiro = {
            contas_pagar: { visualizar: true, criar: true, editar: true, excluir: true },
            contas_receber: { visualizar: true, criar: true, editar: true, excluir: true }
        };
        window.permissoesFinanceiro = permissoesFinanceiro;
        atualizarUIPermissoes();
    }
}

function atualizarUIPermissoes() {
    // Esconder seções sem permissão
    if (!permissoesFinanceiro.contas_pagar?.visualizar) {
        const linkPagar = document.querySelector('[data-section="contas-pagar"]');
        if (linkPagar) linkPagar.closest('li').style.display = 'none';
    }
    
    if (!permissoesFinanceiro.contas_receber?.visualizar) {
        const linkReceber = document.querySelector('[data-section="contas-receber"]');
        if (linkReceber) linkReceber.closest('li').style.display = 'none';
    }
}

// ===== CARREGAR DADOS =====
async function carregarDadosFinanceiros() {
    try {
        console.log('📊 Carregando dados financeiros...');
        
        // Carregar contas a pagar e receber em paralelo
        const promises = [];
        
        if (permissoesFinanceiro?.contas_pagar?.visualizar) {
            promises.push(carregarContasPagar());
        }
        
        if (permissoesFinanceiro?.contas_receber?.visualizar) {
            promises.push(carregarContasReceber());
        }
        
        await Promise.all(promises);
        
        // Atualizar dashboard
        atualizarDashboard();
        
        console.log('✅ Dados financeiros carregados com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar dados financeiros:', error);
        mostrarAlerta('Erro ao carregar dados financeiros', 'error');
    }
}

async function carregarContasPagar() {
    try {
        const response = await fetch('/api/financeiro/contas-pagar', { credentials: 'include' });
        if (!response.ok) {
            if (response.status === 403) {
                console.warn('⚠️ Sem permissão para visualizar contas a pagar');
                contasPagar = [];
                renderizarContasPagar();
                return;
            }
            throw new Error('Erro ao carregar contas a pagar');
        }
        
        contasPagar = await response.json();
        console.log(`📋 ${contasPagar.length} contas a pagar carregadas`);
        
        renderizarContasPagar();
    } catch (error) {
        console.warn('⚠️ Não foi possível carregar contas a pagar:', error.message);
        contasPagar = [];
        renderizarContasPagar();
    }
}

async function carregarContasReceber() {
    try {
        const response = await fetch('/api/financeiro/contas-receber', { credentials: 'include' });
        if (!response.ok) {
            if (response.status === 403) {
                console.warn('⚠️ Sem permissão para visualizar contas a receber');
                contasReceber = [];
                renderizarContasReceber();
                return;
            }
            throw new Error('Erro ao carregar contas a receber');
        }
        
        contasReceber = await response.json();
        console.log(`📋 ${contasReceber.length} contas a receber carregadas`);
        
        renderizarContasReceber();
    } catch (error) {
        console.warn('⚠️ Não foi possível carregar contas a receber:', error.message);
        contasReceber = [];
        renderizarContasReceber();
    }
}

// ===== RENDERIZAÇÉO =====
function renderizarContasPagar() {
    const container = document.getElementById('contas-pagar-container');
    if (!container) return;
    
    if (contasPagar.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-invoice-dollar"></i>
                <h3>Nenhuma conta a pagar</h3>
                <p>Clique em "Nova Conta a Pagar" para adicionar</p>
            </div>
        `;
        return;
    }
    
    const html = `
        <div class="filters-container">
            <div class="filters-row">
                <div class="filter-field">
                    <label>Status</label>
                    <select class="filter-select" id="filter-status-pagar">
                        <option value="">Todos</option>
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                        <option value="atrasado">Atrasado</option>
                    </select>
                </div>
                <div class="filter-field">
                    <label>Data Início</label>
                    <input type="date" class="filter-input" id="filter-data-inicio-pagar">
                </div>
                <div class="filter-field">
                    <label>Data Fim</label>
                    <input type="date" class="filter-input" id="filter-data-fim-pagar">
                </div>
                <div class="filter-field">
                    <button class="btn-primary" onclick="aplicarFiltrosPagar()">
                        <i class="fas fa-filter"></i> Filtrar
                    </button>
                </div>
            </div>
        </div>
        
        <table class="transactions-table">
            <thead>
                <tr>
                    <th>Descrição</th>
                    <th>Fornecedor</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${contasPagar.map(conta => renderizarLinhaConta(conta, 'pagar')).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

function renderizarContasReceber() {
    const container = document.getElementById('contas-receber-container');
    if (!container) return;
    
    if (contasReceber.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-hand-holding-usd"></i>
                <h3>Nenhuma conta a receber</h3>
                <p>Clique em "Nova Conta a Receber" para adicionar</p>
            </div>
        `;
        return;
    }
    
    const html = `
        <div class="filters-container">
            <div class="filters-row">
                <div class="filter-field">
                    <label>Status</label>
                    <select class="filter-select" id="filter-status-receber">
                        <option value="">Todos</option>
                        <option value="pendente">Pendente</option>
                        <option value="pago">Recebido</option>
                        <option value="atrasado">Atrasado</option>
                    </select>
                </div>
                <div class="filter-field">
                    <label>Data Início</label>
                    <input type="date" class="filter-input" id="filter-data-inicio-receber">
                </div>
                <div class="filter-field">
                    <label>Data Fim</label>
                    <input type="date" class="filter-input" id="filter-data-fim-receber">
                </div>
                <div class="filter-field">
                    <button class="btn-primary" onclick="aplicarFiltrosReceber()">
                        <i class="fas fa-filter"></i> Filtrar
                    </button>
                </div>
            </div>
        </div>
        
        <table class="transactions-table">
            <thead>
                <tr>
                    <th>Descrição</th>
                    <th>Cliente</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${contasReceber.map(conta => renderizarLinhaConta(conta, 'receber')).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

function renderizarLinhaConta(conta, tipo) {
    const vencimento = new Date(conta.vencimento);
    const hoje = new Date();
    const vencido = vencimento < hoje && conta.status !== 'pago';
    
    const statusBadge = conta.status === 'pago' ? 'badge-pago' :
                        vencido ? 'badge-atrasado' : 'badge-pendente';
    
    const statusTexto = conta.status === 'pago' ? 'Pago' :
                        vencido ? 'Atrasado' : 'Pendente';
    
    const podeEditar = tipo === 'pagar' ? 
        permissoesFinanceiro?.contas_pagar?.editar : 
        permissoesFinanceiro?.contas_receber?.editar;
    
    const podeExcluir = tipo === 'pagar' ? 
        permissoesFinanceiro?.contas_pagar?.excluir : 
        permissoesFinanceiro?.contas_receber?.excluir;
    
    return `
        <tr>
            <td><strong>${conta.descrição || '-'}</strong></td>
            <td>${conta.fornecedor || conta.cliente || '-'}</td>
            <td>${formatarData(conta.vencimento)}</td>
            <td class="${tipo === 'pagar' ? 'valor-negativo' : 'valor-positivo'}">
                ${tipo === 'pagar' ? '-' : '+'} ${formatarMoeda(conta.valor)}
            </td>
            <td><span class="badge ${statusBadge}">${statusTexto}</span></td>
            <td>
                ${podeEditar ? `
                    <button class="action-btn" onclick="editarConta(${conta.id}, '${tipo}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                ` : ''}
                ${conta.status !== 'pago' ? `
                    <button class="action-btn" onclick="marcarComoPago(${conta.id}, '${tipo}')" title="Marcar como pago">
                        <i class="fas fa-check-circle"></i>
                    </button>
                ` : ''}
                ${podeExcluir ? `
                    <button class="action-btn delete" onclick="excluirConta(${conta.id}, '${tipo}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </td>
        </tr>
    `;
}

// ===== DASHBOARD =====
function atualizarDashboard() {
    // Calcular totais
    const totalPagar = contasPagar
        .filter(c => c.status !== 'pago')
        .reduce((sum, c) => sum + parseFloat(c.valor || 0), 0);
    
    const totalReceber = contasReceber
        .filter(c => c.status !== 'pago')
        .reduce((sum, c) => sum + parseFloat(c.valor || 0), 0);
    
    const saldoAtual = totalReceber - totalPagar;
    
    // Contar vencimentos de hoje
    const hoje = new Date().toISOString().split('T')[0];
    const vencendoHoje = [
        ...contasPagar.filter(c => c.vencimento === hoje && c.status !== 'pago'),
        ...contasReceber.filter(c => c.vencimento === hoje && c.status !== 'pago')
    ].length;
    
    // Atualizar UI (verificar se elementos existem)
    const saldoAtualEl = document.getElementById('saldo-atual');
    const totalReceberEl = document.getElementById('total-receber');
    const totalPagarEl = document.getElementById('total-pagar');
    const vencendoHojeEl = document.getElementById('vencendo-hoje');
    
    if (saldoAtualEl) saldoAtualEl.textContent = formatarMoeda(saldoAtual);
    if (totalReceberEl) totalReceberEl.textContent = formatarMoeda(totalReceber);
    if (totalPagarEl) totalPagarEl.textContent = formatarMoeda(totalPagar);
    if (vencendoHojeEl) vencendoHojeEl.textContent = vencendoHoje;
    
    // Renderizar movimentações recentes
    renderizarMovimentacoesRecentes();
}

function renderizarMovimentacoesRecentes() {
    const container = document.getElementById('movimentacoes-container');
    if (!container) return;
    
    const todasContas = [
        ...contasPagar.map(c => ({ ...c, tipo: 'pagar' })),
        ...contasReceber.map(c => ({ ...c, tipo: 'receber' }))
    ].sort((a, b) => new Date(b.vencimento) - new Date(a.vencimento))
     .slice(0, 10);
    
    if (todasContas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>Nenhuma movimentação</h3>
                <p>Suas movimentações aparecerão aqui</p>
            </div>
        `;
        return;
    }
    
    const html = `
        <table class="transactions-table">
            <thead>
                <tr>
                    <th>Tipo</th>
                    <th>Descrição</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${todasContas.map(conta => `
                    <tr>
                        <td>
                            <span class="badge ${conta.tipo === 'pagar' ? 'badge-vencido' : 'badge-pago'}">
                                ${conta.tipo === 'pagar' ? 'A Pagar' : 'A Receber'}
                            </span>
                        </td>
                        <td><strong>${conta.descrição || '-'}</strong></td>
                        <td>${formatarData(conta.vencimento)}</td>
                        <td class="${conta.tipo === 'pagar' ? 'valor-negativo' : 'valor-positivo'}">
                            ${conta.tipo === 'pagar' ? '-' : '+'} ${formatarMoeda(conta.valor)}
                        </td>
                        <td><span class="badge ${conta.status === 'pago' ? 'badge-pago' : 'badge-pendente'}">
                            ${conta.status === 'pago' ? 'Pago' : 'Pendente'}
                        </span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// ===== MODAIS =====
function inicializarModais() {
    // Criar modal de conta
    const modalHtml = `
        <div id="modal-conta" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="modal-conta-titulo">Nova Conta</h2>
                    <button class="modal-close" onclick="fecharModal('modal-conta')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="form-conta" onsubmit="salvarConta(event)">
                        <input type="hidden" id="conta-id">
                        <input type="hidden" id="conta-tipo">
                        
                        <div class="form-group">
                            <label>Descrição <span>*</span></label>
                            <input type="text" id="conta-descrição" class="form-input" required>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Valor <span>*</span></label>
                                <input type="number" id="conta-valor" class="form-input" step="0.01" required>
                            </div>
                            <div class="form-group">
                                <label>Vencimento <span>*</span></label>
                                <input type="date" id="conta-vencimento" class="form-input" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label id="label-entidade">Fornecedor</label>
                            <input type="text" id="conta-entidade" class="form-input">
                        </div>
                        
                        <div class="form-group">
                            <label>Categoria</label>
                            <select id="conta-categoria" class="form-select">
                                <option value="">Selecione...</option>
                                <option value="servicos">Serviços</option>
                                <option value="produtos">Produtos</option>
                                <option value="salarios">Salários</option>
                                <option value="impostos">Impostos</option>
                                <option value="aluguel">Aluguel</option>
                                <option value="outros">Outros</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Observações</label>
                            <textarea id="conta-observacoes" class="form-textarea"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="fecharModal('modal-conta')">Cancelar</button>
                    <button type="submit" form="form-conta" class="btn-primary">
                        <i class="fas fa-save"></i> Salvar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function abrirModalNovaConta(tipo) {
    const podeCriar = tipo === 'pagar' ? 
        permissoesFinanceiro?.contas_pagar?.criar : 
        permissoesFinanceiro?.contas_receber?.criar;
    
    if (!podeCriar) {
        mostrarAlerta('Você não tem permissão para criar contas', 'error');
        return;
    }
    
    tipoModalAtual = tipo;
    contaSelecionada = null;
    
    const tituloEl = document.getElementById('modal-conta-titulo');
    const labelEl = document.getElementById('label-entidade');
    const tipoEl = document.getElementById('conta-tipo');
    const formEl = document.getElementById('form-conta');
    const idEl = document.getElementById('conta-id');
    
    if (tituloEl) tituloEl.textContent = tipo === 'pagar' ? 'Nova Conta a Pagar' : 'Nova Conta a Receber';
    if (labelEl) labelEl.textContent = tipo === 'pagar' ? 'Fornecedor' : 'Cliente';
    if (tipoEl) tipoEl.value = tipo;
    if (formEl) formEl.reset();
    if (idEl) idEl.value = '';
    
    abrirModal('modal-conta');
}

function editarConta(id, tipo) {
    const podeEditar = tipo === 'pagar' ? 
        permissoesFinanceiro?.contas_pagar?.editar : 
        permissoesFinanceiro?.contas_receber?.editar;
    
    if (!podeEditar) {
        mostrarAlerta('Você não tem permissão para editar contas', 'error');
        return;
    }
    
    const conta = tipo === 'pagar' ? 
        contasPagar.find(c => c.id === id) : 
        contasReceber.find(c => c.id === id);
    
    if (!conta) return;
    
    tipoModalAtual = tipo;
    contaSelecionada = conta;
    
    const tituloEl = document.getElementById('modal-conta-titulo');
    const labelEl = document.getElementById('label-entidade');
    
    if (tituloEl) tituloEl.textContent = tipo === 'pagar' ? 'Editar Conta a Pagar' : 'Editar Conta a Receber';
    if (labelEl) labelEl.textContent = tipo === 'pagar' ? 'Fornecedor' : 'Cliente';
    
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    
    setVal('conta-id', conta.id);
    setVal('conta-tipo', tipo);
    setVal('conta-descrição', conta.descrição || '');
    setVal('conta-valor', conta.valor || '');
    setVal('conta-vencimento', conta.vencimento || '');
    setVal('conta-entidade', conta.fornecedor || conta.cliente || '');
    setVal('conta-categoria', conta.categoria || '');
    setVal('conta-observacoes', conta.observacoes || '');
    
    abrirModal('modal-conta');
}

async function salvarConta(event) {
    event.preventDefault();
    
    const id = document.getElementById('conta-id').value;
    const tipo = document.getElementById('conta-tipo').value;
    const isEdicao = !!id;
    
    const dados = {
        descrição: document.getElementById('conta-descrição').value,
        valor: parseFloat(document.getElementById('conta-valor').value),
        vencimento: document.getElementById('conta-vencimento').value,
        categoria: document.getElementById('conta-categoria').value,
        observacoes: document.getElementById('conta-observacoes').value
    };
    
    if (tipo === 'pagar') {
        dados.fornecedor_id = document.getElementById('conta-entidade').value;
    } else {
        dados.cliente_id = document.getElementById('conta-entidade').value;
    }
    
    try {
        const url = isEdicao ? 
            `/api/financeiro/contas-${tipo}/${id}` : 
            `/api/financeiro/contas-${tipo}`;
        
        const method = isEdicao ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao salvar conta');
        }
        
        const result = await response.json();
        
        mostrarAlerta(
            isEdicao ? 'Conta atualizada com sucesso!' : 'Conta criada com sucesso!',
            'success'
        );
        
        fecharModal('modal-conta');
        await carregarDadosFinanceiros();
        
    } catch (error) {
        console.error('❌ Erro ao salvar conta:', error);
        mostrarAlerta(error.message, 'error');
    }
}

async function marcarComoPago(id, tipo) {
    if (!confirm('Deseja marcar está conta como paga?')) return;
    
    try {
        const conta = tipo === 'pagar' ? 
            contasPagar.find(c => c.id === id) : 
            contasReceber.find(c => c.id === id);
        
        const response = await fetch(`/api/financeiro/contas-${tipo}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...conta, status: 'pago' })
        });
        
        if (!response.ok) throw new Error('Erro ao atualizar status');
        
        mostrarAlerta('Conta marcada como paga!', 'success');
        await carregarDadosFinanceiros();
        
    } catch (error) {
        console.error('❌ Erro ao marcar como pago:', error);
        mostrarAlerta('Erro ao atualizar status da conta', 'error');
    }
}

async function excluirConta(id, tipo) {
    if (!confirm('Deseja realmente excluir está conta? Está ação não pode ser desfeita.')) return;
    
    const podeExcluir = tipo === 'pagar' ? 
        permissoesFinanceiro?.contas_pagar?.excluir : 
        permissoesFinanceiro?.contas_receber?.excluir;
    
    if (!podeExcluir) {
        mostrarAlerta('Você não tem permissão para excluir contas', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/financeiro/contas-${tipo}/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Erro ao excluir conta');
        
        mostrarAlerta('Conta excluída com sucesso!', 'success');
        await carregarDadosFinanceiros();
        
    } catch (error) {
        console.error('❌ Erro ao excluir conta:', error);
        mostrarAlerta('Erro ao excluir conta', 'error');
    }
}

// ===== FILTROS =====
async function aplicarFiltrosPagar() {
    const status = document.getElementById('filter-status-pagar').value;
    const dataInicio = document.getElementById('filter-data-inicio-pagar').value;
    const dataFim = document.getElementById('filter-data-fim-pagar').value;
    
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (dataInicio) params.append('data_inicio', dataInicio);
    if (dataFim) params.append('data_fim', dataFim);
    
    try {
        const response = await fetch(`/api/financeiro/contas-pagar?${params}`);
        if (!response.ok) throw new Error('Erro ao filtrar');
        
        contasPagar = await response.json();
        renderizarContasPagar();
        atualizarDashboard();
        
    } catch (error) {
        console.error('❌ Erro ao aplicar filtros:', error);
        mostrarAlerta('Erro ao aplicar filtros', 'error');
    }
}

async function aplicarFiltrosReceber() {
    const status = document.getElementById('filter-status-receber').value;
    const dataInicio = document.getElementById('filter-data-inicio-receber').value;
    const dataFim = document.getElementById('filter-data-fim-receber').value;
    
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (dataInicio) params.append('data_inicio', dataInicio);
    if (dataFim) params.append('data_fim', dataFim);
    
    try {
        const response = await fetch(`/api/financeiro/contas-receber?${params}`);
        if (!response.ok) throw new Error('Erro ao filtrar');
        
        contasReceber = await response.json();
        renderizarContasReceber();
        atualizarDashboard();
        
    } catch (error) {
        console.error('❌ Erro ao aplicar filtros:', error);
        mostrarAlerta('Erro ao aplicar filtros', 'error');
    }
}

// ===== UTILIDADES =====
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function mostrarAlerta(mensagem, tipo = 'info') {
    // Remover alertas anteriores
    const alertaAnterior = document.querySelector('.alert');
    if (alertaAnterior) alertaAnterior.remove();
    
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo}`;
    alerta.innerHTML = `
        <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${mensagem}
    `;
    
    const container = document.querySelector('.app-container');
    container.insertBefore(alerta, container.firstChild);
    
    setTimeout(() => alerta.remove(), 5000);
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor || 0);
}

function formatarData(data) {
    if (!data) return '-';
    const d = new Date(data + 'T00:00:00');
    return d.toLocaleDateString('pt-BR');
}

function configurarEventListeners() {
    // Botão de atualizar
    document.getElementById('btn-refresh-header')?.addEventListener('click', async function() {
        this.querySelector('i').classList.add('fa-spin');
        await carregarDadosFinanceiros();
        this.querySelector('i').classList.remove('fa-spin');
    });
    
    // Navegação entre seções
    const navLinks = document.querySelectorAll('.nav-link[data-section]');
    const sections = document.querySelectorAll('.content-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            this.classList.add('active');
            
            const sectionId = this.getAttribute('data-section') + '-section';
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
    
    // Fechar modal ao clicar fora
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-overlay')) {
            fecharModal(e.target.id);
        }
    });
}

// Esconder loader e mostrar conteúdo
window.addEventListener('load', function() {
    const loaderWrapper = document.getElementById('loader-wrapper');
    const containerPrincipal = document.querySelector('.container-principal');
    
    if (loaderWrapper) loaderWrapper.style.display = 'none';
    if (containerPrincipal) containerPrincipal.style.display = 'flex';
});
