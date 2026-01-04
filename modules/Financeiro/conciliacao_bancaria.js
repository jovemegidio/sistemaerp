// ============================================================================
// CONCILIAÇÉO BANCÁRIA - Sistema Financeiro Aluforce
// ============================================================================

// Estação Global
let contaSelecionada = null;
let movimentacoesSistema = [];
let movimentacoesExtrato = [];
let movimentacoesConciliadas = [];
let selecionadasSistema = [];
let selecionadasExtrato = [];

// ============================================================================
// INICIALIZAÇÉO
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    // Verificar sistema de autenticação
    if (typeof auth !== 'undefined') {
        // Proteger página - verificar permissão de conciliação
        if (!auth.protegerPagina(['conciliacao.visualizar'])) {
            return;
        }
    }
    
    inicializar();
});

function inicializar() {
    carregarContas();
    configurarEventos();
    definirPeriodoPadrao();
}

function configurarEventos() {
    // Busca em tempo real
    document.getElementById('search-sistema').addEventListener('input', function(e) {
        buscarMovimentacoes(e.target.value, 'sistema');
    });

    document.getElementById('search-extrato').addEventListener('input', function(e) {
        buscarMovimentacoes(e.target.value, 'extrato');
    });

    // Seleção de conta
    document.getElementById('conta-select').addEventListener('change', function(e) {
        contaSelecionada = e.target.value;
        if (contaSelecionada) {
            carregarMovimentacoes();
        }
    });
}

function definirPeriodoPadrao() {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    document.getElementById('data-inicio').value = formatarDataInput(primeiroDia);
    document.getElementById('data-fim').value = formatarDataInput(hoje);
}

function formatarDataInput(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

// ============================================================================
// CARREGAMENTO DE DADOS
// ============================================================================

async function carregarContas() {
    try {
        // TODO: Substituir por chamada real à API
        const contas = await buscarContasBancarias();
        
        const select = document.getElementById('conta-select');
        select.innerHTML = '<option value="">Selecione uma conta...</option>';
        
        contas.forEach(conta => {
            const option = document.createElement('option');
            option.value = conta.id;
            option.textContent = `${conta.banco} - ${conta.agencia}/${conta.conta} (${formatarMoeda(conta.saldo)})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar contas:', error);
        mostrarMensagem('Erro ao carregar contas bancárias', 'error');
    }
}

async function buscarContasBancarias() {
    // TODO: Substituir por chamada real à API
    // return await fetch('/api/financeiro/contas-bancarias').then(r => r.json());
    
    // Mock data
    return [
        { id: 1, banco: 'Banco do Brasil', agencia: '1234-5', conta: '12345-6', saldo: 45820.50 },
        { id: 2, banco: 'Itaú', agencia: '0123', conta: '98765-4', saldo: 28340.00 },
        { id: 3, banco: 'Nubank', agencia: '0001', conta: '1234567-8', saldo: 12500.75 }
    ];
}

async function carregarMovimentacoes() {
    if (!contaSelecionada) {
        mostrarMensagem('Selecione uma conta bancária', 'warning');
        return;
    }

    const dataInicio = document.getElementById('data-inicio').value;
    const dataFim = document.getElementById('data-fim').value;

    if (!dataInicio || !dataFim) {
        mostrarMensagem('Selecione o período', 'warning');
        return;
    }

    try {
        // Carregar movimentações do sistema
        movimentacoesSistema = await buscarMovimentacoesSistema(contaSelecionada, dataInicio, dataFim);
        
        // Carregar extrato (se já importação)
        movimentacoesExtrato = await buscarExtratoImportação(contaSelecionada, dataInicio, dataFim);

        // Carregar conciliações já realizadas
        movimentacoesConciliadas = await buscarConciliacoes(contaSelecionada, dataInicio, dataFim);

        // Exibir
        renderizarMovimentacoes();
        atualizarEstatisticas();
        mostrarSaldoSistema();
    } catch (error) {
        console.error('Erro ao carregar movimentações:', error);
        mostrarMensagem('Erro ao carregar movimentações', 'error');
    }
}

async function buscarMovimentacoesSistema(contaId, dataInicio, dataFim) {
    // TODO: Substituir por chamada real à API
    // return await fetch(`/api/financeiro/movimentacoesconta=${contaId}&inicio=${dataInicio}&fim=${dataFim}`).then(r => r.json());
    
    // Mock data
    return [
        { id: 1, data: '2025-12-01', descrição: 'Recebimento Cliente ABC Ltda', valor: 5000.00, tipo: 'entrada', categoria: 'Vendas', origem: 'contas_receber' },
        { id: 2, data: '2025-12-03', descrição: 'Pagamento Fornecedor XYZ', valor: -2500.00, tipo: 'saida', categoria: 'Compras', origem: 'contas_pagar' },
        { id: 3, data: '2025-12-05', descrição: 'Pagamento Salários', valor: -8500.00, tipo: 'saida', categoria: 'Folha de Pagamento', origem: 'contas_pagar' },
        { id: 4, data: '2025-12-08', descrição: 'Recebimento Cliente DEF S/A', valor: 12000.00, tipo: 'entrada', categoria: 'Vendas', origem: 'contas_receber' },
        { id: 5, data: '2025-12-10', descrição: 'Pagamento Aluguel', valor: -3500.00, tipo: 'saida', categoria: 'Despesas Fixas', origem: 'contas_pagar' },
        { id: 6, data: '2025-12-10', descrição: 'Recebimento Cliente GHI ME', valor: 7800.00, tipo: 'entrada', categoria: 'Vendas', origem: 'contas_receber' }
    ];
}

async function buscarExtratoImportação(contaId, dataInicio, dataFim) {
    // TODO: Substituir por chamada real à API
    // return await fetch(`/api/financeiro/extratoconta=${contaId}&inicio=${dataInicio}&fim=${dataFim}`).then(r => r.json());
    
    // Mock data - Extrato bancário (algumas movimentações coincidem, outras não)
    return [
        { id: 'E1', data: '2025-12-01', descrição: 'TED RECEBIDA ABC LTDA', valor: 5000.00, tipo: 'entrada' },
        { id: 'E2', data: '2025-12-02', descrição: 'TARIFA BANCARIA', valor: -15.00, tipo: 'saida' },
        { id: 'E3', data: '2025-12-03', descrição: 'PIX ENVIADO XYZ COMERCIO', valor: -2500.00, tipo: 'saida' },
        { id: 'E4', data: '2025-12-05', descrição: 'TED ENVIADA FOLHA PGTO', valor: -8500.00, tipo: 'saida' },
        { id: 'E5', data: '2025-12-08', descrição: 'TED RECEBIDA DEF SA', valor: 12000.00, tipo: 'entrada' },
        { id: 'E6', data: '2025-12-10', descrição: 'DEBITO AUTOMATICO ALUGUEL', valor: -3500.00, tipo: 'saida' },
        { id: 'E7', data: '2025-12-10', descrição: 'PIX RECEBIDO GHI', valor: 7800.00, tipo: 'entrada' },
        { id: 'E8', data: '2025-12-10', descrição: 'IOF OPERACAO', valor: -8.50, tipo: 'saida' }
    ];
}

async function buscarConciliacoes(contaId, dataInicio, dataFim) {
    // TODO: Substituir por chamada real à API
    // return await fetch(`/api/financeiro/conciliacoesconta=${contaId}&inicio=${dataInicio}&fim=${dataFim}`).then(r => r.json());
    
    // Mock data - Algumas já conciliadas
    return [
        { movimentacao_sistema_id: 1, movimentacao_extrato_id: 'E1' },
        { movimentacao_sistema_id: 2, movimentacao_extrato_id: 'E3' }
    ];
}

function mostrarSaldoSistema() {
    const contaSelect = document.getElementById('conta-select');
    const selectedOption = contaSelect.options[contaSelect.selectedIndex];
    
    if (selectedOption && selectedOption.value) {
        const texto = selectedOption.textContent;
        const saldoMatch = texto.match(/R\$\s*([\d.,]+)/);
        
        if (saldoMatch) {
            document.getElementById('saldo-sistema').textContent = `R$ ${saldoMatch[1]}`;
            document.getElementById('saldo-info').style.display = 'block';
        }
    }
}

// ============================================================================
// RENDERIZAÇÉO
// ============================================================================

function renderizarMovimentacoes() {
    renderizarListaSistema();
    renderizarListaExtrato();
}

function renderizarListaSistema() {
    const lista = document.getElementById('lista-sistema');
    lista.innerHTML = '';

    if (movimentacoesSistema.length === 0) {
        lista.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Nenhuma movimentação encontrada</p>';
        return;
    }

    let total = 0;
    movimentacoesSistema.forEach(mov => {
        const conciliada = movimentacoesConciliadas.some(c => c.movimentacao_sistema_id === mov.id);
        const item = criarItemMovimentacao(mov, 'sistema', conciliada);
        lista.appendChild(item);
        total += mov.valor;
    });

    document.getElementById('total-sistema').textContent = formatarMoeda(total);
}

function renderizarListaExtrato() {
    const lista = document.getElementById('lista-extrato');
    lista.innerHTML = '';

    if (movimentacoesExtrato.length === 0) {
        lista.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Nenhum extrato importação</p>';
        return;
    }

    let total = 0;
    movimentacoesExtrato.forEach(mov => {
        const conciliada = movimentacoesConciliadas.some(c => c.movimentacao_extrato_id === mov.id);
        const item = criarItemMovimentacao(mov, 'extrato', conciliada);
        lista.appendChild(item);
        total += mov.valor;
    });

    document.getElementById('total-extrato').textContent = formatarMoeda(total);
}

function criarItemMovimentacao(mov, origem, conciliada) {
    const div = document.createElement('div');
    div.className = `movimentacao-item ${origem} ${conciliada  'conciliada' : ''}`;
    div.dataset.id = mov.id;
    div.dataset.origem = origem;

    const checkbox = !conciliada  `
        <input type="checkbox" class="mov-checkbox" 
               onchange="toggleSelecao('${mov.id}', '${origem}', this.checked)">
    ` : '<i class="fas fa-check-circle" style="color: #10b981; margin-right: 10px;"></i>';

    div.innerHTML = `
        ${checkbox}
        <div style="flex: 1;">
            <div class="mov-header">
                <span class="mov-data">${formatarData(mov.data)}</span>
                <span class="mov-valor ${mov.tipo}">${formatarMoeda(mov.valor)}</span>
            </div>
            <div class="mov-descrição">${mov.descrição}</div>
            ${mov.categoria  `<span class="mov-categoria">${mov.categoria}</span>` : ''}
            ${conciliada  '<span class="mov-categoria" style="background: #10b981; color: white;">✓ Conciliada</span>' : ''}
        </div>
    `;

    return div;
}

// ============================================================================
// SELEÇÉO E FILTROS
// ============================================================================

function toggleSelecao(id, origem, checked) {
    if (origem === 'sistema') {
        if (checked) {
            if (!selecionadasSistema.includes(id)) {
                selecionadasSistema.push(id);
            }
        } else {
            selecionadasSistema = selecionadasSistema.filter(x => x !== id);
        }
    } else {
        if (checked) {
            if (!selecionadasExtrato.includes(id)) {
                selecionadasExtrato.push(id);
            }
        } else {
            selecionadasExtrato = selecionadasExtrato.filter(x => x !== id);
        }
    }

    atualizarEstatisticas();
}

function limparSelecao() {
    selecionadasSistema = [];
    selecionadasExtrato = [];
    
    document.querySelectorAll('.mov-checkbox').forEach(cb => {
        cb.checked = false;
    });

    atualizarEstatisticas();
    mostrarMensagem('Seleção limpa', 'success');
}

function filtrarSistema(tipo, evt) {
    filtrarMovimentacoes('sistema', tipo, evt);
}

function filtrarExtrato(tipo, evt) {
    filtrarMovimentacoes('extrato', tipo, evt);
}

function filtrarMovimentacoes(origem, tipo, evt) {
    const container = origem === 'sistema'  'lista-sistema' : 'lista-extrato';
    const items = document.querySelectorAll(`#${container} .movimentacao-item`);

    // Atualizar botões ativos
    const filtros = document.querySelectorAll(`#${container}`).item(0).previousElementSibling;
    filtros.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
    if (evt && evt.target) {
        evt.target.classList.add('active');
    }

    items.forEach(item => {
        const conciliada = item.classList.contains('conciliada');
        
        let mostrar = false;
        if (tipo === 'todos') mostrar = true;
        else if (tipo === 'pendentes') mostrar = !conciliada;
        else if (tipo === 'conciliadas') mostrar = conciliada;

        item.style.display = mostrar  'flex' : 'none';
    });
}

function buscarMovimentacoes(termo, origem) {
    const container = origem === 'sistema'  'lista-sistema' : 'lista-extrato';
    const items = document.querySelectorAll(`#${container} .movimentacao-item`);

    termo = termo.toLowerCase();

    items.forEach(item => {
        const texto = item.textContent.toLowerCase();
        item.style.display = texto.includes(termo)  'flex' : 'none';
    });
}

// ============================================================================
// CONCILIAÇÉO
// ============================================================================

function conciliarSelecionadas() {
    if (selecionadasSistema.length === 0 && selecionadasExtrato.length === 0) {
        mostrarMensagem('Selecione ao menos uma movimentação', 'warning');
        return;
    }

    // Calcular totais
    let totalSistema = 0;
    selecionadasSistema.forEach(id => {
        const mov = movimentacoesSistema.find(m => m.id == id);
        if (mov) totalSistema += mov.valor;
    });

    let totalExtrato = 0;
    selecionadasExtrato.forEach(id => {
        const mov = movimentacoesExtrato.find(m => m.id == id);
        if (mov) totalExtrato += mov.valor;
    });

    const diferenca = totalSistema - totalExtrato;

    // Preencher modal
    document.getElementById('conciliar-valor-sistema').textContent = formatarMoeda(totalSistema);
    document.getElementById('conciliar-valor-extrato').textContent = formatarMoeda(totalExtrato);
    document.getElementById('conciliar-diferenca').textContent = formatarMoeda(diferenca);
    document.getElementById('conciliar-diferenca').style.color = Math.abs(diferenca) < 0.01  '#10b981' : '#ef4444';

    // Mostrar modal
    mostrarModal('modal-conciliar');
}

async function confirmarConciliacao() {
    const observacoes = document.getElementById('conciliar-obs').value;

    try {
        // TODO: Substituir por chamada real à API
        const resultação = await salvarConciliacao({
            conta_id: contaSelecionada,
            movimentacoes_sistema: selecionadasSistema,
            movimentacoes_extrato: selecionadasExtrato,
            observacoes: observacoes,
            data_conciliacao: new Date().toISOString()
        });

        // Atualizar lista de conciliadas
        selecionadasSistema.forEach(idSistema => {
            selecionadasExtrato.forEach(idExtrato => {
                movimentacoesConciliadas.push({
                    movimentacao_sistema_id: idSistema,
                    movimentacao_extrato_id: idExtrato
                });
            });
        });

        // Limpar seleção
        limparSelecao();

        // Recarregar visualização
        renderizarMovimentacoes();
        atualizarEstatisticas();

        fecharModal('modal-conciliar');
        mostrarMensagem('Conciliação realizada com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao conciliar:', error);
        mostrarMensagem('Erro ao realizar conciliação', 'error');
    }
}

async function salvarConciliacao(daçãos) {
    // TODO: Substituir por chamada real à API
    // return await fetch('/api/financeiro/conciliacoes', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(daçãos)
    // }).then(r => r.json());
    
    console.log('Salvando conciliação:', daçãos);
    return { success: true, id: Math.random() };
}

async function conciliarAutomatica() {
    if (!contaSelecionada) {
        mostrarMensagem('Selecione uma conta', 'warning');
        return;
    }

    mostrarMensagem('Processando conciliação automática...', 'info');

    try {
        let conciliacoesEncontradas = 0;

        // Algoritmo de conciliação automática
        // 1. Buscar por valor e data exatos
        movimentacoesSistema.forEach(movSis => {
            if (movimentacoesConciliadas.some(c => c.movimentacao_sistema_id === movSis.id)) return;

            const movExt = movimentacoesExtrato.find(me => 
                !movimentacoesConciliadas.some(c => c.movimentacao_extrato_id === me.id) &&
                Math.abs(me.valor - movSis.valor) < 0.01 &&
                me.data === movSis.data
            );

            if (movExt) {
                movimentacoesConciliadas.push({
                    movimentacao_sistema_id: movSis.id,
                    movimentacao_extrato_id: movExt.id
                });
                conciliacoesEncontradas++;
            }
        });

        // 2. Buscar por valor igual em +/- 3 dias
        movimentacoesSistema.forEach(movSis => {
            if (movimentacoesConciliadas.some(c => c.movimentacao_sistema_id === movSis.id)) return;

            const dataSis = new Date(movSis.data);
            
            const movExt = movimentacoesExtrato.find(me => {
                if (movimentacoesConciliadas.some(c => c.movimentacao_extrato_id === me.id)) return false;
                
                const dataExt = new Date(me.data);
                const difDias = Math.abs((dataExt - dataSis) / (1000 * 60 * 60 * 24));
                
                return Math.abs(me.valor - movSis.valor) < 0.01 && difDias <= 3;
            });

            if (movExt) {
                movimentacoesConciliadas.push({
                    movimentacao_sistema_id: movSis.id,
                    movimentacao_extrato_id: movExt.id
                });
                conciliacoesEncontradas++;
            }
        });

        // TODO: Salvar conciliações automáticas no servidor
        // await salvarConciliacoesAutomaticas(movimentacoesConciliadas);

        renderizarMovimentacoes();
        atualizarEstatisticas();

        mostrarMensagem(`Conciliação automática concluída! ${conciliacoesEncontradas} movimentações conciliadas.`, 'success');

    } catch (error) {
        console.error('Erro na conciliação automática:', error);
        mostrarMensagem('Erro ao realizar conciliação automática', 'error');
    }
}

// ============================================================================
// IMPORTAÇÉO DE EXTRATO
// ============================================================================

function mostrarModalImportar() {
    mostrarModal('modal-importar');
}

async function processarArquivo(input) {
    const arquivo = input.files[0];
    if (!arquivo) return;

    const extensao = arquivo.name.split('.').pop().toLowerCase();

    mostrarMensagem('Processando arquivo...', 'info');

    try {
        let daçãos;

        if (extensao === 'ofx') {
            daçãos = await processarOFX(arquivo);
        } else if (extensao === 'csv') {
            daçãos = await processarCSV(arquivo);
        } else if (extensao === 'xlsx') {
            daçãos = await processarXLSX(arquivo);
        } else {
            throw new Error('Formato não suportação');
        }

        // TODO: Enviar para API
        await salvarExtratoImportação({
            conta_id: contaSelecionada,
            arquivo: arquivo.name,
            movimentacoes: daçãos,
            data_importacao: new Date().toISOString()
        });

        fecharModal('modal-importar');
        carregarMovimentacoes();
        mostrarMensagem(`${daçãos.length} movimentações importadas com sucesso!`, 'success');

    } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        mostrarMensagem('Erro ao processar arquivo: ' + error.message, 'error');
    }
}

async function processarOFX(arquivo) {
    // TODO: Implementar parser OFX real
    mostrarMensagem('Parser OFX em desenvolvimento', 'warning');
    return [];
}

async function processarCSV(arquivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const texto = e.target.result;
                const linhas = texto.split('\n');
                const daçãos = [];

                // Pular cabeçalho
                for (let i = 1; i < linhas.length; i++) {
                    const linha = linhas[i].trim();
                    if (!linha) continue;

                    const colunas = linha.split(',');
                    if (colunas.length < 3) continue;

                    daçãos.push({
                        data: colunas[0].trim(),
                        descrição: colunas[1].trim(),
                        valor: parseFloat(colunas[2].trim()),
                        tipo: parseFloat(colunas[2].trim()) >= 0  'entrada' : 'saida'
                    });
                }

                resolve(daçãos);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsText(arquivo);
    });
}

async function processarXLSX(arquivo) {
    // TODO: Implementar parser XLSX (necessita biblioteca como SheetJS)
    mostrarMensagem('Parser XLSX em desenvolvimento. Use CSV temporariamente.', 'warning');
    return [];
}

async function salvarExtratoImportação(daçãos) {
    // TODO: Substituir por chamada real à API
    // return await fetch('/api/financeiro/extrato/importar', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(daçãos)
    // }).then(r => r.json());
    
    console.log('Salvando extrato importação:', daçãos);
    
    // Mock: adicionar ao extrato atual
    daçãos.movimentacoes.forEach(mov => {
        movimentacoesExtrato.push({
            id: 'IMP_' + Math.random().toString(36).substr(2, 9),
            ...mov
        });
    });
    
    return { success: true };
}

// ============================================================================
// ESTATÍSTICAS
// ============================================================================

function atualizarEstatisticas() {
    const totalConciliadas = movimentacoesConciliadas.length;
    const totalSistema = movimentacoesSistema.length;
    const totalExtrato = movimentacoesExtrato.length;
    const pendentes = Math.max(totalSistema, totalExtrato) - totalConciliadas;

    // Calcular divergências (movimentações que não têm par)
    const divergentes = Math.abs(totalSistema - totalExtrato);

    // Calcular diferença de valores
    let valorSistema = 0;
    movimentacoesSistema.forEach(m => valorSistema += m.valor);
    
    let valorExtrato = 0;
    movimentacoesExtrato.forEach(m => valorExtrato += m.valor);
    
    const diferenca = valorSistema - valorExtrato;

    document.getElementById('count-conciliadas').textContent = totalConciliadas;
    document.getElementById('count-pendentes').textContent = pendentes;
    document.getElementById('count-divergentes').textContent = divergentes;
    document.getElementById('diferenca-total').textContent = formatarMoeda(diferenca);
    document.getElementById('diferenca-total').style.color = Math.abs(diferenca) < 0.01  '#10b981' : '#ef4444';
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

function formatarData(data) {
    if (!data) return '';
    const d = new Date(data + 'T00:00:00');
    return d.toLocaleDateString('pt-BR');
}

function mostrarModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function fecharModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function mostrarMensagem(mensagem, tipo) {
    // TODO: Integrar com sistema de notificações
    console.log(`[${tipo.toUpperCase()}] ${mensagem}`);
    
    // Temporário: usar alert
    if (tipo === 'error') {
        alert('❌ ' + mensagem);
    } else if (tipo === 'success') {
        alert('✅ ' + mensagem);
    } else if (tipo === 'warning') {
        alert('⚠️ ' + mensagem);
    } else {
        alert('ℹ️ ' + mensagem);
    }
}
