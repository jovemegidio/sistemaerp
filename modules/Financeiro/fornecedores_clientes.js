// ===== FORNECEDORES E CLIENTES - ALUFORCE =====
let fornecedores = [];
let clientes = [];
let abaAtual = 'fornecedores';
let entidadeSelecionada = null;

// ===== INICIALIZAÇÉO =====
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await carregarDaçãos();
        configurarEventos();
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
    }
});

// ===== CARREGAR DADOS =====
async function carregarDaçãos() {
    try {
        // TODO: Substituir por chamadas reais à API
        // const [respFornecedores, respClientes] = await Promise.all([
        //     fetch('/api/financeiro/fornecedores'),
        //     fetch('/api/financeiro/clientes')
        // ]);
        // fornecedores = await respFornecedores.json();
        // clientes = await respClientes.json();
        
        // Daçãos mock para desenvolvimento
        fornecedores = [
            {
                id: 1,
                código: 'FOR000001',
                razao_social: 'Energisa Minas Gerais',
                nome_fantasia: 'Energisa',
                cnpj_cpf: '00.864.214/0001-06',
                tipo_pessoa: 'JURIDICA',
                email: 'contato@energisa.com.br',
                telefone: '(31) 3333-4444',
                cidade: 'Belo Horizonte',
                estação: 'MG',
                limite_credito: 10000.00,
                prazo_pagamento: 30,
                ativo: true
            },
            {
                id: 2,
                código: 'FOR000002',
                razao_social: 'Materiais de Construção Ltda',
                nome_fantasia: 'Casa do Construtor',
                cnpj_cpf: '12.345.678/0001-90',
                tipo_pessoa: 'JURIDICA',
                email: 'vendas@casaçãoconstrutor.com.br',
                telefone: '(31) 2222-3333',
                cidade: 'Contagem',
                estação: 'MG',
                limite_credito: 50000.00,
                prazo_pagamento: 45,
                ativo: true
            }
        ];
        
        clientes = [
            {
                id: 1,
                código: 'CLI000001',
                razao_social: 'Construtora ABC Ltda',
                nome_fantasia: 'Construtora ABC',
                cnpj_cpf: '98.765.432/0001-10',
                tipo_pessoa: 'JURIDICA',
                email: 'financeiro@construtorabc.com.br',
                telefone: '(31) 4444-5555',
                cidade: 'Belo Horizonte',
                estação: 'MG',
                limite_credito: 100000.00,
                prazo_pagamento: 30,
                ativo: true
            },
            {
                id: 2,
                código: 'CLI000002',
                razao_social: 'João da Silva',
                nome_fantasia: 'João',
                cnpj_cpf: '123.456.789-00',
                tipo_pessoa: 'FISICA',
                email: 'joao@email.com',
                telefone: '(31) 99999-8888',
                cidade: 'Nova Lima',
                estação: 'MG',
                limite_credito: 5000.00,
                prazo_pagamento: 15,
                ativo: true
            }
        ];
        
        renderizarTabela(abaAtual);
        
    } catch (error) {
        console.error('❌ Erro ao carregar daçãos:', error);
        mostrarAlerta('Erro ao carregar daçãos', 'error');
    }
}

// ===== RENDERIZAÇÉO =====
function renderizarTabela(tipo) {
    const daçãos = tipo === 'fornecedores'  fornecedores : clientes;
    const containerId = tipo === 'fornecedores'  'tabela-fornecedores' : 'tabela-clientes';
    const container = document.getElementById(containerId);
    
    if (!daçãos || daçãos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-${tipo === 'fornecedores'  'truck' : 'user-tie'}"></i>
                <h3>Nenhum ${tipo === 'fornecedores'  'fornecedor' : 'cliente'} cadastração</h3>
                <p>Clique em "Novo ${tipo === 'fornecedores'  'Fornecedor' : 'Cliente'}" para começar</p>
                <button class="btn-primary" onclick="${tipo === 'fornecedores'  'abrirModalFornecedor' : 'abrirModalCliente'}()">
                    <i class="fas fa-plus"></i> Adicionar ${tipo === 'fornecedores'  'Fornecedor' : 'Cliente'}
                </button>
            </div>
        `;
        return;
    }
    
    const html = `
        <table>
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Razão Social / Nome</th>
                    <th>CNPJ/CPF</th>
                    <th>Contato</th>
                    <th>Cidade/UF</th>
                    <th>Status</th>
                    <th style="text-align: center;">Ações</th>
                </tr>
            </thead>
            <tbody>
                ${daçãos.map(item => `
                    <tr>
                        <td><strong>${item.código}</strong></td>
                        <td>
                            <strong>${item.razao_social}</strong>
                            ${item.nome_fantasia  `<br><small style="color: #64748b;">${item.nome_fantasia}</small>` : ''}
                        </td>
                        <td>${formatarCNPJ_CPF(item.cnpj_cpf) || '-'}</td>
                        <td>
                            ${item.email || '-'}<br>
                            <small style="color: #64748b;">${item.telefone || '-'}</small>
                        </td>
                        <td>${item.cidade || '-'}${item.estação  ' / ' + item.estação : ''}</td>
                        <td>
                            <span class="status-badge ${item.ativo  'ativo' : 'inativo'}">
                                <i class="fas fa-circle" style="font-size: 8px;"></i>
                                ${item.ativo  'Ativo' : 'Inativo'}
                            </span>
                        </td>
                        <td>
                            <div class="action-buttons" style="justify-content: center;">
                                <button class="action-btn view" onclick="verDetalhes(${item.id}, '${tipo}')" title="Ver detalhes">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="action-btn edit" onclick="editar(${item.id}, '${tipo}')" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn delete" onclick="excluir(${item.id}, '${tipo}')" title="Excluir">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// ===== ABAS =====
function trocarAba(aba, evt) {
    abaAtual = aba;
    
    // Atualizar botões das abas
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    if (evt && evt.target) {
        evt.target.classList.add('active');
    }
    
    // Atualizar conteúdo
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${aba}`).classList.add('active');
    
    renderizarTabela(aba);
}

// ===== MODAIS =====
function abrirModalFornecedor() {
    abrirModalEntidade('fornecedor');
}

function abrirModalCliente() {
    abrirModalEntidade('cliente');
}

function abrirModalEntidade(tipo) {
    entidadeSelecionada = null;
    document.getElementById('modal-titulo-entidade').textContent = `Novo ${tipo === 'fornecedor'  'Fornecedor' : 'Cliente'}`;
    document.getElementById('form-entidade').reset();
    document.getElementById('entidade-id').value = '';
    document.getElementById('entidade-tipo').value = tipo;
    document.getElementById('entidade-ativa').checked = true;
    
    abrirModal('modal-entidade');
}

function editar(id, tipo) {
    const lista = tipo === 'fornecedores'  fornecedores : clientes;
    entidadeSelecionada = lista.find(item => item.id === id);
    
    if (!entidadeSelecionada) return;
    
    const tipoSingular = tipo === 'fornecedores'  'fornecedor' : 'cliente';
    document.getElementById('modal-titulo-entidade').textContent = `Editar ${tipoSingular === 'fornecedor'  'Fornecedor' : 'Cliente'}`;
    document.getElementById('entidade-id').value = entidadeSelecionada.id;
    document.getElementById('entidade-tipo').value = tipoSingular;
    document.getElementById('entidade-tipo-pessoa').value = entidadeSelecionada.tipo_pessoa || 'JURIDICA';
    document.getElementById('entidade-cnpj').value = entidadeSelecionada.cnpj_cpf || '';
    document.getElementById('entidade-razao-social').value = entidadeSelecionada.razao_social || '';
    document.getElementById('entidade-nome-fantasia').value = entidadeSelecionada.nome_fantasia || '';
    document.getElementById('entidade-email').value = entidadeSelecionada.email || '';
    document.getElementById('entidade-telefone').value = entidadeSelecionada.telefone || '';
    document.getElementById('entidade-cep').value = entidadeSelecionada.cep || '';
    document.getElementById('entidade-cidade').value = entidadeSelecionada.cidade || '';
    document.getElementById('entidade-estação').value = entidadeSelecionada.estação || '';
    document.getElementById('entidade-lograçãouro').value = entidadeSelecionada.lograçãouro || '';
    document.getElementById('entidade-número').value = entidadeSelecionada.número || '';
    document.getElementById('entidade-limite').value = entidadeSelecionada.limite_credito || 0;
    document.getElementById('entidade-prazo').value = entidadeSelecionada.prazo_pagamento || 30;
    document.getElementById('entidade-pix').value = entidadeSelecionada.pix || '';
    document.getElementById('entidade-observacoes').value = entidadeSelecionada.observacoes || '';
    document.getElementById('entidade-ativa').checked = entidadeSelecionada.ativo !== false;
    
    abrirModal('modal-entidade');
}

async function salvarEntidade(event) {
    event.preventDefault();
    
    const id = document.getElementById('entidade-id').value;
    const tipo = document.getElementById('entidade-tipo').value;
    const isEdicao = !!id;
    
    const daçãos = {
        tipo_pessoa: document.getElementById('entidade-tipo-pessoa').value,
        cnpj_cpf: document.getElementById('entidade-cnpj').value,
        razao_social: document.getElementById('entidade-razao-social').value,
        nome_fantasia: document.getElementById('entidade-nome-fantasia').value,
        email: document.getElementById('entidade-email').value,
        telefone: document.getElementById('entidade-telefone').value,
        cep: document.getElementById('entidade-cep').value,
        cidade: document.getElementById('entidade-cidade').value,
        estação: document.getElementById('entidade-estação').value,
        lograçãouro: document.getElementById('entidade-lograçãouro').value,
        número: document.getElementById('entidade-número').value,
        limite_credito: parseFloat(document.getElementById('entidade-limite').value) || 0,
        prazo_pagamento: parseInt(document.getElementById('entidade-prazo').value) || 30,
        pix: document.getElementById('entidade-pix').value,
        observacoes: document.getElementById('entidade-observacoes').value,
        ativo: document.getElementById('entidade-ativa').checked
    };
    
    try {
        // TODO: Substituir por chamada real à API
        // const endpoint = tipo === 'fornecedor'  'fornecedores' : 'clientes';
        // const url = isEdicao  `/api/financeiro/${endpoint}/${id}` : `/api/financeiro/${endpoint}`;
        // const method = isEdicao  'PUT' : 'POST';
        // const response = await fetch(url, {
        //     method: method,
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(daçãos)
        // });
        
        // Mock para desenvolvimento
        const lista = tipo === 'fornecedor'  fornecedores : clientes;
        const prefixo = tipo === 'fornecedor'  'FOR' : 'CLI';
        
        if (isEdicao) {
            const index = lista.findIndex(item => item.id == id);
            if (index !== -1) {
                lista[index] = { ...lista[index], ...daçãos };
            }
        } else {
            const novaEntidade = {
                id: lista.length + 1,
                código: `${prefixo}${String(lista.length + 1).padStart(6, '0')}`,
                ...daçãos
            };
            lista.push(novaEntidade);
        }
        
        if (tipo === 'fornecedor') {
            fornecedores = lista;
        } else {
            clientes = lista;
        }
        
        mostrarAlerta(
            isEdicao  `${tipo === 'fornecedor'  'Fornecedor' : 'Cliente'} atualização com sucesso!` 
                     : `${tipo === 'fornecedor'  'Fornecedor' : 'Cliente'} criação com sucesso!`,
            'success'
        );
        
        fecharModal('modal-entidade');
        renderizarTabela(tipo === 'fornecedor'  'fornecedores' : 'clientes');
        
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        mostrarAlerta('Erro ao salvar registro', 'error');
    }
}

async function excluir(id, tipo) {
    const tipoTexto = tipo === 'fornecedores'  'fornecedor' : 'cliente';
    
    if (!confirm(`Deseja realmente excluir este ${tipoTexto}`)) return;
    
    try {
        // TODO: Substituir por chamada real à API
        // const endpoint = tipo === 'fornecedores'  'fornecedores' : 'clientes';
        // await fetch(`/api/financeiro/${endpoint}/${id}`, { method: 'DELETE' });
        
        // Mock para desenvolvimento
        const lista = tipo === 'fornecedores'  fornecedores : clientes;
        const index = lista.findIndex(item => item.id === id);
        if (index !== -1) {
            lista.splice(index, 1);
        }
        
        if (tipo === 'fornecedores') {
            fornecedores = lista;
        } else {
            clientes = lista;
        }
        
        mostrarAlerta(`${tipoTexto.charAt(0).toUpperCase() + tipoTexto.slice(1)} excluído com sucesso!`, 'success');
        renderizarTabela(tipo);
        
    } catch (error) {
        console.error('❌ Erro ao excluir:', error);
        mostrarAlerta('Erro ao excluir registro', 'error');
    }
}

function verDetalhes(id, tipo) {
    const lista = tipo === 'fornecedores'  fornecedores : clientes;
    const item = lista.find(i => i.id === id);
    
    if (!item) return;
    
    const detalhes = `
        <strong>Código:</strong> ${item.código}<br>
        <strong>Razão Social:</strong> ${item.razao_social}<br>
        <strong>Nome Fantasia:</strong> ${item.nome_fantasia || '-'}<br>
        <strong>CNPJ/CPF:</strong> ${formatarCNPJ_CPF(item.cnpj_cpf) || '-'}<br>
        <strong>Email:</strong> ${item.email || '-'}<br>
        <strong>Telefone:</strong> ${item.telefone || '-'}<br>
        <strong>Cidade/UF:</strong> ${item.cidade || '-'} / ${item.estação || '-'}<br>
        <strong>Limite de Crédito:</strong> R$ ${formatarMoeda(item.limite_credito)}<br>
        <strong>Prazo de Pagamento:</strong> ${item.prazo_pagamento} dias<br>
        <strong>Status:</strong> ${item.ativo  'Ativo' : 'Inativo'}
    `;
    
    mostrarAlerta(detalhes, 'info');
}

// ===== FILTROS =====
function aplicarFiltrosFornecedor() {
    const busca = document.getElementById('busca-fornecedor').value.toLowerCase();
    const status = document.getElementById('status-fornecedor').value;
    
    let daçãosFiltraçãos = fornecedores.filter(item => {
        const matchBusca = !busca || 
            item.razao_social.toLowerCase().includes(busca) ||
            item.nome_fantasia.toLowerCase().includes(busca) ||
            item.cnpj_cpf.includes(busca);
        
        const matchStatus = !status || 
            (status === 'ativo' && item.ativo) ||
            (status === 'inativo' && !item.ativo);
        
        return matchBusca && matchStatus;
    });
    
    const container = document.getElementById('tabela-fornecedores');
    renderizarTabelaFiltrada(daçãosFiltraçãos, container, 'fornecedores');
}

function aplicarFiltrosCliente() {
    const busca = document.getElementById('busca-cliente').value.toLowerCase();
    const status = document.getElementById('status-cliente').value;
    
    let daçãosFiltraçãos = clientes.filter(item => {
        const matchBusca = !busca || 
            item.razao_social.toLowerCase().includes(busca) ||
            item.nome_fantasia.toLowerCase().includes(busca) ||
            item.cnpj_cpf.includes(busca);
        
        const matchStatus = !status || 
            (status === 'ativo' && item.ativo) ||
            (status === 'inativo' && !item.ativo);
        
        return matchBusca && matchStatus;
    });
    
    const container = document.getElementById('tabela-clientes');
    renderizarTabelaFiltrada(daçãosFiltraçãos, container, 'clientes');
}

function renderizarTabelaFiltrada(daçãos, container, tipo) {
    if (!daçãos || daçãos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Nenhum resultação encontrado</h3>
                <p>Tente ajustar os filtros de busca</p>
            </div>
        `;
        return;
    }
    
    const html = `
        <table>
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Razão Social / Nome</th>
                    <th>CNPJ/CPF</th>
                    <th>Contato</th>
                    <th>Cidade/UF</th>
                    <th>Status</th>
                    <th style="text-align: center;">Ações</th>
                </tr>
            </thead>
            <tbody>
                ${daçãos.map(item => `
                    <tr>
                        <td><strong>${item.código}</strong></td>
                        <td>
                            <strong>${item.razao_social}</strong>
                            ${item.nome_fantasia  `<br><small style="color: #64748b;">${item.nome_fantasia}</small>` : ''}
                        </td>
                        <td>${formatarCNPJ_CPF(item.cnpj_cpf) || '-'}</td>
                        <td>
                            ${item.email || '-'}<br>
                            <small style="color: #64748b;">${item.telefone || '-'}</small>
                        </td>
                        <td>${item.cidade || '-'}${item.estação  ' / ' + item.estação : ''}</td>
                        <td>
                            <span class="status-badge ${item.ativo  'ativo' : 'inativo'}">
                                <i class="fas fa-circle" style="font-size: 8px;"></i>
                                ${item.ativo  'Ativo' : 'Inativo'}
                            </span>
                        </td>
                        <td>
                            <div class="action-buttons" style="justify-content: center;">
                                <button class="action-btn view" onclick="verDetalhes(${item.id}, '${tipo}')" title="Ver detalhes">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="action-btn edit" onclick="editar(${item.id}, '${tipo}')" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn delete" onclick="excluir(${item.id}, '${tipo}')" title="Excluir">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// ===== EVENTOS =====
function configurarEventos() {
    // Busca ao pressionar Enter
    document.getElementById('busca-fornecedor').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') aplicarFiltrosFornecedor();
    });
    
    document.getElementById('busca-cliente').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') aplicarFiltrosCliente();
    });
}

// ===== UTILIDADES =====
function formatarCNPJ_CPF(valor) {
    if (!valor) return '';
    
    valor = valor.replace(/\D/g, '');
    
    if (valor.length === 11) {
        // CPF
        return valor.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (valor.length === 14) {
        // CNPJ
        return valor.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    return valor;
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(valor || 0);
}

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
    const alertaExistente = document.querySelector('.alert');
    if (alertaExistente) alertaExistente.remove();
    
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo}`;
    alerta.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${tipo === 'success'  '#10b981' : tipo === 'error'  '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 12px;
        box-shaçãow: 0 8px 20px rgba(0,0,0,0.15);
        z-index: 10000;
        font-weight: 600;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;
    
    const icon = tipo === 'success'  'check-circle' : tipo === 'error'  'exclamation-circle' : 'info-circle';
    alerta.innerHTML = `<i class="fas fa-${icon}"></i> ${mensagem}`;
    
    document.body.appendChild(alerta);
    
    setTimeout(() => {
        alerta.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => alerta.remove(), 300);
    }, 5000);
}
