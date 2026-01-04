// ========================================
// COTAÇÕES MANAGER
// Sistema de Gestão de Cotações
// ========================================

class CotacoesManager {
    constructor() {
        this.cotacoes = [];
        this.cotacoesFiltradas = [];
        this.materiais = [];
        this.fornecedores = [];
        this.cotacaoAtual = null;
        this.paginaAtual = 1;
        this.itensPorPagina = 15;
        this.statusFiltro = 'todos';
        this.init();
    }

    init() {
        this.carregarDependencias();
        this.carregarDaçãos();
        this.atualizarCards();
        this.renderizarTabela();
        inicializarUsuario();
        this.setDataAtual();
    }

    setDataAtual() {
        const hoje = new Date().toISOString().split('T')[0];
        const inputData = document.getElementById('cotacaoData');
        if (inputData) {
            inputData.value = hoje;
        }
    }

    carregarDependencias() {
        // Carregar fornecedores
        this.fornecedores = [
            { id: 1, nome: "Alcoa Alumínio S.A.", email: "compras@alcoa.com.br" },
            { id: 2, nome: "Hydro Alumínio", email: "vendas@hydro.com.br" },
            { id: 3, nome: "CBA - Companhia Brasileira de Alumínio", email: "comercial@cba.com.br" },
            { id: 10, nome: "Ferragens Brasil Ltda.", email: "cotacao@ferragensbrasil.com.br" },
            { id: 11, nome: "Locks & Co.", email: "vendas@locks.com.br" },
            { id: 12, nome: "Premium Ferragens", email: "contato@premiumferragens.com.br" },
            { id: 20, nome: "Embalagens Ltda.", email: "vendas@embalagens.com.br" },
            { id: 21, nome: "Papelão Forte S.A.", email: "comercial@papelaoforte.com.br" },
            { id: 30, nome: "Ferramentas Industriais S.A.", email: "vendas@ferramentasind.com.br" },
            { id: 31, nome: "ToolMaster", email: "contato@toolmaster.com.br" },
            { id: 40, nome: "Química Brasil S.A.", email: "comercial@quimicabrasil.com.br" },
            { id: 41, nome: "Lubrificantes Express", email: "vendas@lubriexpress.com.br" }
        ];

        // Carregar materiais
        this.materiais = [
            { id: 1, codigo: "ALU-001", descricao: "Chapa de Alumínio 1200 H14 - 1,0mm", unidade: "KG" },
            { id: 2, codigo: "ALU-002", descricao: "Perfil de Alumínio 50x30mm Anodização Preto", unidade: "M" },
            { id: 3, codigo: "ALU-003", descricao: "Chapa de Alumínio 3003 H14 - 2,0mm", unidade: "KG" },
            { id: 4, codigo: "ALU-004", descricao: "Tubo de Alumínio Redondo 1\" x 1,5mm", unidade: "M" },
            { id: 6, codigo: "COMP-001", descricao: "Dobradiça para Porta de Alumínio 3\" Cromada", unidade: "UN" },
            { id: 7, codigo: "COMP-002", descricao: "Fechadura Tetra CH40 Cromada", unidade: "UN" },
            { id: 8, codigo: "COMP-003", descricao: "Roldana para Porta de Correr 25mm Nylon", unidade: "UN" },
            { id: 9, codigo: "COMP-004", descricao: "Puxaçãor Reto 30cm Alumínio Escovação", unidade: "UN" },
            { id: 11, codigo: "EMB-001", descricao: "Filme Stretch 50cm x 300m", unidade: "UN" },
            { id: 12, codigo: "EMB-002", descricao: "Caixa de Papelão 50x40x30cm", unidade: "UN" },
            { id: 16, codigo: "FERR-001", descricao: "Disco de Corte para Alumínio 4.1/2\"", unidade: "UN" },
            { id: 17, codigo: "FERR-002", descricao: "Broca para Metal 8mm HSS", unidade: "UN" },
            { id: 21, codigo: "QUIM-001", descricao: "Silicone Acético Transparente 280g", unidade: "UN" },
            { id: 22, codigo: "QUIM-002", descricao: "Graxa Branca Multiuso 500g", unidade: "UN" }
        ];
    }

    carregarDaçãos() {
        // Gerar 156 cotações de exemplo
        const status = ['Rascunho', 'Enviada', 'Em Análise', 'Aprovada', 'Cancelada'];
        const solicitantes = ['João Silva', 'Maria Santos', 'Carlos Oliveira', 'Ana Costa', 'Pedro Almeida'];

        for (let i = 1; i <= 156; i++) {
            const statusCotacao = status[Math.floor(Math.random() * status.length)];
            const numMateriais = Math.floor(Math.random() * 5) + 2; // 2 a 6 materiais
            const numFornecedores = Math.floor(Math.random() * 4) + 2; // 2 a 5 fornecedores
            const materiaisCotacao = [];
            const fornecedoresSelecionaçãos = [];
            const propostas = [];

            // Selecionar materiais aleatórios
            const materiaisDisponiveis = [...this.materiais];
            for (let j = 0; j < numMateriais; j++) {
                const index = Math.floor(Math.random() * materiaisDisponiveis.length);
                const material = materiaisDisponiveis.splice(index, 1)[0];
                materiaisCotacao.push({
                    materialId: material.id,
                    materialCodigo: material.codigo,
                    materialDescricao: material.descricao,
                    quantidade: Math.floor(Math.random() * 500) + 50,
                    unidade: material.unidade,
                    especificacoes: 'Conforme especificação técnica padrão'
                });
            }

            // Selecionar fornecedores aleatórios
            const fornecedoresDisponiveis = [...this.fornecedores];
            for (let k = 0; k < numFornecedores; k++) {
                const index = Math.floor(Math.random() * fornecedoresDisponiveis.length);
                const fornecedor = fornecedoresDisponiveis.splice(index, 1)[0];
                fornecedoresSelecionaçãos.push(fornecedor.id);

                // Se status não é Rascunho ou Enviada, gerar propostas
                if (statusCotacao !== 'Rascunho' && statusCotacao !== 'Enviada') {
                    const itensPropostos = materiaisCotacao.map(mat => ({
                        materialId: mat.materialId,
                        materialDescricao: mat.materialDescricao,
                        quantidade: mat.quantidade,
                        unidade: mat.unidade,
                        precoUnitario: (Math.random() * 100 + 10).toFixed(2),
                        total: 0
                    }));

                    itensPropostos.forEach(item => {
                        item.total = item.quantidade * parseFloat(item.precoUnitario);
                    });

                    const totalProposta = itensPropostos.reduce((sum, item) => sum + item.total, 0);

                    propostas.push({
                        fornecedorId: fornecedor.id,
                        fornecedorNome: fornecedor.nome,
                        dataRecebimento: this.gerarDataAleatoria(),
                        prazoEntrega: `${Math.floor(Math.random() * 30) + 5} dias`,
                        validade: this.gerarDataFutura(30),
                        itens: itensPropostos,
                        total: totalProposta,
                        observacoes: Math.random() > 0.5  'Proposta conforme solicitação' : ''
                    });
                }
            }

            // Ordenar propostas por valor (menor primeiro)
            propostas.sort((a, b) => a.total - b.total);

            const melhorProposta = propostas.length > 0 ? propostas[0] : null;
            const dataCotacao = this.gerarDataAleatoria();
            const prazoResposta = this.gerarDataFutura(15, dataCotacao);

            this.cotacoes.push({
                id: i,
                numero: `COT-2024-${String(i).padStart(4, '0')}`,
                data: dataCotacao,
                solicitante: solicitantes[Math.floor(Math.random() * solicitantes.length)],
                descricao: `Cotação para ${numMateriais} materiais diversos`,
                prazoResposta: prazoResposta,
                status: statusCotacao,
                materiais: materiaisCotacao,
                fornecedores: fornecedoresSelecionaçãos,
                propostas: propostas,
                melhorProposta: melhorProposta,
                prazoEntrega: `${Math.floor(Math.random() * 30) + 10} dias`,
                formaPagamento: ['Boleto', 'Transferência', 'Não especificação'][Math.floor(Math.random() * 3)],
                localEntrega: 'Matriz - São Paulo/SP',
                observacoes: Math.random() > 0.7  'Cotação urgente' : '',
                pedidoGeração: statusCotacao === 'Aprovada'  `PC-2024-${String(Math.floor(Math.random() * 234) + 1).padStart(4, '0')}` : null
            });
        }

        // Ordenar por número (mais recentes primeiro)
        this.cotacoes.sort((a, b) => b.id - a.id);
        this.cotacoesFiltradas = [...this.cotacoes];
    }

    gerarDataAleatoria() {
        const inicio = new Date(2024, 0, 1);
        const fim = new Date(2024, 11, 10);
        const data = new Date(inicio.getTime() + Math.random() * (fim.getTime() - inicio.getTime()));
        return data.toISOString().split('T')[0];
    }

    gerarDataFutura(dias, dataBase = null) {
        const base = dataBase  new Date(dataBase) : new Date();
        base.setDate(base.getDate() + dias);
        return base.toISOString().split('T')[0];
    }

    atualizarCards() {
        const total = this.cotacoes.length;
        const emAnalise = this.cotacoes.filter(c => c.status === 'Em Análise').length;
        const aprovadas = this.cotacoes.filter(c => c.status === 'Aprovada').length;
        
        // Calcular economia média
        const cotacoesComPropostas = this.cotacoes.filter(c => c.propostas.length > 1);
        let economiaTotal = 0;
        
        cotacoesComPropostas.forEach(cot => {
            if (cot.propostas.length > 0) {
                const precoMaisAlto = Math.max(...cot.propostas.map(p => p.total));
                const precoMaisBaixo = Math.min(...cot.propostas.map(p => p.total));
                const economia = ((precoMaisAlto - precoMaisBaixo) / precoMaisAlto) * 100;
                economiaTotal += economia;
            }
        });

        const economiaMedia = cotacoesComPropostas.length > 0 
             (economiaTotal / cotacoesComPropostas.length).toFixed(1)
            : 0;

        document.getElementById('totalCotacoes').textContent = total;
        document.getElementById('cotacoesAnalise').textContent = emAnalise;
        document.getElementById('cotacoesAprovadas').textContent = aprovadas;
        document.getElementById('economiaMedia').textContent = `${economiaMedia}%`;
    }

    filtrar() {
        const busca = document.getElementById('searchCotacao').value.toLowerCase();

        this.cotacoesFiltradas = this.cotacoes.filter(cotacao => {
            const matchBusca = !busca || 
                cotacao.numero.toLowerCase().includes(busca) ||
                cotacao.solicitante.toLowerCase().includes(busca) ||
                cotacao.materiais.some(m => 
                    m.materialCodigo.toLowerCase().includes(busca) ||
                    m.materialDescricao.toLowerCase().includes(busca)
                );

            const matchStatus = 
                this.statusFiltro === 'todos' ||
                cotacao.status === this.statusFiltro;

            return matchBusca && matchStatus;
        });

        this.paginaAtual = 1;
        this.renderizarTabela();
    }

    filtrarPorStatus(status) {
        this.statusFiltro = status;
        
        // Atualizar botões ativos
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.closest('.filter-btn').classList.add('active');

        this.filtrar();
    }

    renderizarTabela() {
        const tbody = document.getElementById('cotacoesTableBody');
        const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
        const fim = inicio + this.itensPorPagina;
        const cotacoesPagina = this.cotacoesFiltradas.slice(inicio, fim);

        tbody.innerHTML = '';

        cotacoesPagina.forEach(cotacao => {
            const tr = document.createElement('tr');
            
            // Badge de status
            let statusBadge = '';
            switch (cotacao.status) {
                case 'Rascunho':
                    statusBadge = '<span class="badge badge-secondary"><i class="fas fa-edit"></i> Rascunho</span>';
                    break;
                case 'Enviada':
                    statusBadge = '<span class="badge badge-info"><i class="fas fa-paper-plane"></i> Enviada</span>';
                    break;
                case 'Em Análise':
                    statusBadge = '<span class="badge badge-warning"><i class="fas fa-search-dollar"></i> Em Análise</span>';
                    break;
                case 'Aprovada':
                    statusBadge = '<span class="badge badge-success"><i class="fas fa-check"></i> Aprovada</span>';
                    break;
                case 'Cancelada':
                    statusBadge = '<span class="badge badge-danger"><i class="fas fa-times"></i> Cancelada</span>';
                    break;
            }

            // Contagem de materiais e fornecedores
            const numMateriais = cotacao.materiais.length;
            const numFornecedores = cotacao.fornecedores.length;
            const numPropostas = cotacao.propostas.length;

            // Melhor oferta
            const melhorOferta = cotacao.melhorProposta 
                 this.formatarMoeda(cotacao.melhorProposta.total)
                : '-';

            tr.innerHTML = `
                <td><input type="checkbox" class="cotacao-checkbox" data-id="${cotacao.id}"></td>
                <td><strong>${cotacao.numero}</strong></td>
                <td>${this.formatarData(cotacao.data)}</td>
                <td>${cotacao.solicitante}</td>
                <td>
                    <span class="badge badge-info">${numMateriais} ${numMateriais === 1  'material' : 'materiais'}</span>
                </td>
                <td>
                    <span class="badge badge-purple">${numFornecedores} selecionaçãos</span>
                    ${numPropostas > 0  `<br><span class="badge badge-success" style="margin-top: 3px;">${numPropostas} ${numPropostas === 1  'proposta' : 'propostas'}</span>` : ''}
                </td>
                <td><strong>${melhorOferta}</strong></td>
                <td>${statusBadge}</td>
                <td class="table-actions">
                    <button class="btn-icon" onclick="cotacoesManager.visualizar(${cotacao.id})" title="Visualizar">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${cotacao.status === 'Rascunho'  `
                    <button class="btn-icon" onclick="cotacoesManager.editar(${cotacao.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    ` : ''}
                    ${cotacao.status === 'Em Análise' || cotacao.status === 'Enviada'  `
                    <button class="btn-icon btn-success" onclick="cotacoesManager.registrarProposta(${cotacao.id})" title="Registrar Proposta">
                        <i class="fas fa-plus"></i>
                    </button>
                    ` : ''}
                    ${cotacao.propostas.length >= 2  `
                    <button class="btn-icon btn-info" onclick="cotacoesManager.compararPropostas(${cotacao.id})" title="Comparar Propostas">
                        <i class="fas fa-balance-scale"></i>
                    </button>
                    ` : ''}
                    ${cotacao.status === 'Aprovada' && cotacao.pedidoGeração  `
                    <button class="btn-icon btn-primary" onclick="alert('Pedido: ${cotacao.pedidoGeração}')" title="Ver Pedido Geração">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                    ` : ''}
                </td>
            `;

            tbody.appendChild(tr);
        });

        this.atualizarPaginacao();
    }

    atualizarPaginacao() {
        const total = this.cotacoesFiltradas.length;
        const totalPaginas = Math.ceil(total / this.itensPorPagina);
        const inicio = (this.paginaAtual - 1) * this.itensPorPagina + 1;
        const fim = Math.min(inicio + this.itensPorPagina - 1, total);

        document.getElementById('paginacaoInicio').textContent = inicio;
        document.getElementById('paginacaoFim').textContent = fim;
        document.getElementById('paginacaoTotal').textContent = total;

        const controls = document.getElementById('paginationControls');
        controls.innerHTML = '';

        // Botão Anterior
        const btnPrev = document.createElement('button');
        btnPrev.className = 'btn-pagination';
        btnPrev.innerHTML = '<i class="fas fa-chevron-left"></i>';
        btnPrev.disabled = this.paginaAtual === 1;
        btnPrev.onclick = () => {
            if (this.paginaAtual > 1) {
                this.paginaAtual--;
                this.renderizarTabela();
            }
        };
        controls.appendChild(btnPrev);

        // Páginas
        for (let i = 1; i <= totalPaginas; i++) {
            if (
                i === 1 ||
                i === totalPaginas ||
                (i >= this.paginaAtual - 2 && i <= this.paginaAtual + 2)
            ) {
                const btnPage = document.createElement('button');
                btnPage.className = 'btn-pagination' + (i === this.paginaAtual  ' active' : '');
                btnPage.textContent = i;
                btnPage.onclick = () => {
                    this.paginaAtual = i;
                    this.renderizarTabela();
                };
                controls.appendChild(btnPage);
            } else if (
                i === this.paginaAtual - 3 ||
                i === this.paginaAtual + 3
            ) {
                const span = document.createElement('span');
                span.textContent = '...';
                span.style.padding = '0 5px';
                controls.appendChild(span);
            }
        }

        // Botão Próximo
        const btnNext = document.createElement('button');
        btnNext.className = 'btn-pagination';
        btnNext.innerHTML = '<i class="fas fa-chevron-right"></i>';
        btnNext.disabled = this.paginaAtual === totalPaginas;
        btnNext.onclick = () => {
            if (this.paginaAtual < totalPaginas) {
                this.paginaAtual++;
                this.renderizarTabela();
            }
        };
        controls.appendChild(btnNext);
    }

    toggleSelectAll() {
        const checkboxes = document.querySelectorAll('.cotacao-checkbox');
        const selectAll = document.getElementById('selectAll');
        checkboxes.forEach(cb => cb.checked = selectAll.checked);
    }

    abrirModalNova() {
        document.getElementById('modalTitle').textContent = 'Nova Cotação';
        document.getElementById('formCotacao').reset();
        document.getElementById('cotacaoId').value = '';
        
        // Gerar próximo número
        const proximoNumero = this.cotacoes.length + 1;
        document.getElementById('cotacaoNumero').value = `COT-2024-${String(proximoNumero).padStart(4, '0')}`;
        
        this.setDataAtual();
        
        // Definir prazo padrão (15 dias)
        const prazo = new Date();
        prazo.setDate(prazo.getDate() + 15);
        document.getElementById('cotacaoPrazoResposta').value = prazo.toISOString().split('T')[0];
        
        // Limpar materiais
        document.getElementById('materiaisCotacaoBody').innerHTML = '';
        
        // Renderizar checkboxes de fornecedores
        this.renderizarFornecedoresCheckbox();
        
        document.getElementById('modalCotacao').style.display = 'flex';
    }

    renderizarFornecedoresCheckbox() {
        const container = document.getElementById('fornecedoresCheckboxes');
        container.innerHTML = '';

        this.fornecedores.forEach(fornecedor => {
            const div = document.createElement('div');
            div.className = 'checkbox-item';
            div.innerHTML = `
                <label>
                    <input type="checkbox" class="fornecedor-checkbox" value="${fornecedor.id}">
                    ${fornecedor.nome}
                </label>
            `;
            container.appendChild(div);
        });
    }

    adicionarMaterial() {
        const html = `
            <tr>
                <td>
                    <select class="form-control material-select">
                        <option value="">Selecione um material...</option>
                        ${this.materiais.map(m => `<option value="${m.id}" data-unidade="${m.unidade}">${m.codigo} - ${m.descricao}</option>`).join('')}
                    </select>
                </td>
                <td><input type="number" class="form-control material-quantidade" min="1" value="1"></td>
                <td><input type="text" class="form-control material-unidade" reaçãonly></td>
                <td><input type="text" class="form-control material-especificacao" placeholder="Especificações adicionais"></td>
                <td><button type="button" class="btn-icon btn-danger" onclick="cotacoesManager.removerMaterial(this)"><i class="fas fa-trash"></i></button></td>
            </tr>
        `;
        document.getElementById('materiaisCotacaoBody').insertAdjacentHTML('beforeend', html);

        // Adicionar evento onChange ao select
        const tbody = document.getElementById('materiaisCotacaoBody');
        const ultimoSelect = tbody.querySelector('tr:last-child .material-select');
        ultimoSelect.addEventListener('change', function() {
            const option = this.options[this.selectedIndex];
            const tr = this.closest('tr');
            const inputUnidade = tr.querySelector('.material-unidade');
            inputUnidade.value = option.dataset.unidade || '';
        });
    }

    removerMaterial(btn) {
        btn.closest('tr').remove();
    }

    editar(id) {
        const cotacao = this.cotacoes.find(c => c.id === id);
        if (!cotacao || cotacao.status !== 'Rascunho') {
            alert('Apenas cotações em rascunho podem ser editadas!');
            return;
        }

        document.getElementById('modalTitle').textContent = 'Editar Cotação';
        document.getElementById('cotacaoId').value = cotacao.id;
        document.getElementById('cotacaoNumero').value = cotacao.numero;
        document.getElementById('cotacaoData').value = cotacao.data;
        document.getElementById('cotacaoPrazoResposta').value = cotacao.prazoResposta;
        document.getElementById('cotacaoSolicitante').value = cotacao.solicitante;
        document.getElementById('cotacaoDescricao').value = cotacao.descricao || '';
        document.getElementById('cotacaoPrazoEntrega').value = cotacao.prazoEntrega || '';
        document.getElementById('cotacaoFormaPagamento').value = cotacao.formaPagamento || '';
        document.getElementById('cotacaoLocalEntrega').value = cotacao.localEntrega || '';
        document.getElementById('cotacaoObservacoes').value = cotacao.observacoes || '';

        // Carregar materiais
        const tbody = document.getElementById('materiaisCotacaoBody');
        tbody.innerHTML = '';
        
        cotacao.materiais.forEach(mat => {
            const html = `
                <tr>
                    <td>
                        <select class="form-control material-select">
                            ${this.materiais.map(m => `<option value="${m.id}" data-unidade="${m.unidade}" ${m.id === mat.materialId  'selected' : ''}>${m.codigo} - ${m.descricao}</option>`).join('')}
                        </select>
                    </td>
                    <td><input type="number" class="form-control material-quantidade" min="1" value="${mat.quantidade}"></td>
                    <td><input type="text" class="form-control material-unidade" value="${mat.unidade}" reaçãonly></td>
                    <td><input type="text" class="form-control material-especificacao" value="${mat.especificacoes || ''}" placeholder="Especificações adicionais"></td>
                    <td><button type="button" class="btn-icon btn-danger" onclick="cotacoesManager.removerMaterial(this)"><i class="fas fa-trash"></i></button></td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', html);
        });

        // Carregar fornecedores selecionaçãos
        this.renderizarFornecedoresCheckbox();
        cotacao.fornecedores.forEach(fornId => {
            const checkbox = document.querySelector(`.fornecedor-checkbox[value="${fornId}"]`);
            if (checkbox) checkbox.checked = true;
        });

        document.getElementById('modalCotacao').style.display = 'flex';
    }

    visualizar(id) {
        const cotacao = this.cotacoes.find(c => c.id === id);
        if (!cotacao) return;

        alert(`Cotação: ${cotacao.numero}\n\nSolicitante: ${cotacao.solicitante}\nStatus: ${cotacao.status}\nMateriais: ${cotacao.materiais.length}\nFornecedores: ${cotacao.fornecedores.length}\nPropostas: ${cotacao.propostas.length}`);
    }

    registrarProposta(cotacaoId) {
        this.cotacaoAtual = this.cotacoes.find(c => c.id === cotacaoId);
        if (!this.cotacaoAtual) return;

        // Mostrar seleção de fornecedor
        const fornecedoresSemProposta = this.cotacaoAtual.fornecedores.filter(fornId => {
            return !this.cotacaoAtual.propostas.some(p => p.fornecedorId === fornId);
        });

        if (fornecedoresSemProposta.length === 0) {
            alert('Todos os fornecedores já enviaram suas propostas!');
            return;
        }

        const fornecedorId = fornecedoresSemProposta[0]; // Simplificação: pegar primeiro
        const fornecedor = this.fornecedores.find(f => f.id === fornecedorId);

        document.getElementById('propostaFornecedorId').value = fornecedor.id;
        document.getElementById('propostaFornecedorNome').value = fornecedor.nome;
        document.getElementById('propostaDataRecebimento').value = new Date().toISOString().split('T')[0];
        document.getElementById('propostaPrazoEntrega').value = '';
        document.getElementById('propostaValidade').value = this.gerarDataFutura(30);
        document.getElementById('propostaObservacoes').value = '';

        // Renderizar itens
        const tbody = document.getElementById('itensPropostaBody');
        tbody.innerHTML = '';

        this.cotacaoAtual.materiais.forEach(mat => {
            const html = `
                <tr>
                    <td>${mat.materialDescricao}</td>
                    <td>${mat.quantidade} ${mat.unidade}</td>
                    <td><input type="number" class="form-control item-preco" min="0" step="0.01" data-quantidade="${mat.quantidade}" onchange="cotacoesManager.calcularTotalProposta()"></td>
                    <td class="item-total">R$ 0,00</td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', html);
        });

        document.getElementById('modalProposta').style.display = 'flex';
    }

    calcularTotalProposta() {
        const tbody = document.getElementById('itensPropostaBody');
        const rows = tbody.querySelectorAll('tr');
        let total = 0;

        rows.forEach(row => {
            const input = row.querySelector('.item-preco');
            const quantidade = parseFloat(input.dataset.quantidade);
            const preco = parseFloat(input.value) || 0;
            const itemTotal = quantidade * preco;
            
            row.querySelector('.item-total').textContent = this.formatarMoeda(itemTotal);
            total += itemTotal;
        });

        document.getElementById('propostaTotal').textContent = this.formatarMoeda(total);
    }

    salvarProposta() {
        if (!this.cotacaoAtual) return;

        const fornecedorId = parseInt(document.getElementById('propostaFornecedorId').value);
        const fornecedor = this.fornecedores.find(f => f.id === fornecedorId);
        
        const tbody = document.getElementById('itensPropostaBody');
        const rows = tbody.querySelectorAll('tr');
        const itens = [];
        let totalProposta = 0;

        rows.forEach((row, index) => {
            const material = this.cotacaoAtual.materiais[index];
            const preco = parseFloat(row.querySelector('.item-preco').value) || 0;
            const quantidade = material.quantidade;
            const total = quantidade * preco;

            itens.push({
                materialId: material.materialId,
                materialDescricao: material.materialDescricao,
                quantidade: quantidade,
                unidade: material.unidade,
                precoUnitario: preco.toFixed(2),
                total: total
            });

            totalProposta += total;
        });

        const novaProposta = {
            fornecedorId: fornecedorId,
            fornecedorNome: fornecedor.nome,
            dataRecebimento: document.getElementById('propostaDataRecebimento').value,
            prazoEntrega: document.getElementById('propostaPrazoEntrega').value,
            validade: document.getElementById('propostaValidade').value,
            itens: itens,
            total: totalProposta,
            observacoes: document.getElementById('propostaObservacoes').value
        };

        this.cotacaoAtual.propostas.push(novaProposta);
        this.cotacaoAtual.status = 'Em Análise';

        // Atualizar melhor proposta
        this.cotacaoAtual.propostas.sort((a, b) => a.total - b.total);
        this.cotacaoAtual.melhorProposta = this.cotacaoAtual.propostas[0];

        this.fecharModalProposta();
        this.filtrar();
        this.atualizarCards();
        alert('Proposta registrada com sucesso!');
    }

    compararPropostas(id) {
        const cotacao = this.cotacoes.find(c => c.id === id);
        if (!cotacao || cotacao.propostas.length < 2) {
            alert('É necessário ter ao menos 2 propostas para comparar!');
            return;
        }

        document.getElementById('comparacaoNumero').textContent = cotacao.numero;

        let html = `
            <div class="comparacao-header">
                <h4>Informações da Cotação</h4>
                <p><strong>Solicitante:</strong> ${cotacao.solicitante} | <strong>Data:</strong> ${this.formatarData(cotacao.data)}</p>
            </div>

            <div class="comparacao-tabela">
                <table class="data-table comparison-table">
                    <thead>
                        <tr>
                            <th width="30%">Material</th>
                            <th width="10%">Qtd.</th>
                            ${cotacao.propostas.map(p => `<th width="${60/cotacao.propostas.length}%">${p.fornecedorNome}<br><small>${this.formatarData(p.dataRecebimento)}</small></th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${cotacao.materiais.map((mat, idx) => `
                            <tr>
                                <td><strong>${mat.materialCodigo}</strong><br>${mat.materialDescricao}</td>
                                <td>${mat.quantidade} ${mat.unidade}</td>
                                ${cotacao.propostas.map(p => {
                                    const item = p.itens[idx];
                                    const preco = parseFloat(item.precoUnitario);
                                    const precos = cotacao.propostas.map(prop => parseFloat(prop.itens[idx].precoUnitario));
                                    const menorPreco = Math.min(...precos);
                                    const isMelhor = preco === menorPreco;
                                    return `<td class="${isMelhor  'melhor-preco' : ''}">${this.formatarMoeda(preco)}<br><small>Total: ${this.formatarMoeda(item.total)}</small></td>`;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="2"><strong>TOTAL GERAL</strong></td>
                            ${cotacao.propostas.map(p => {
                                const isMelhor = p === cotacao.melhorProposta;
                                return `<td class="${isMelhor  'melhor-total' : ''}"><strong>${this.formatarMoeda(p.total)}</strong></td>`;
                            }).join('')}
                        </tr>
                        <tr>
                            <td colspan="2">Prazo de Entrega</td>
                            ${cotacao.propostas.map(p => `<td>${p.prazoEntrega}</td>`).join('')}
                        </tr>
                        <tr>
                            <td colspan="2">Validade</td>
                            ${cotacao.propostas.map(p => `<td>${this.formatarData(p.validade)}</td>`).join('')}
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div class="comparacao-footer">
                <div class="alert alert-success">
                    <i class="fas fa-trophy"></i> <strong>Melhor Proposta:</strong> ${cotacao.melhorProposta.fornecedorNome} - ${this.formatarMoeda(cotacao.melhorProposta.total)}
                </div>
            </div>
        `;

        document.getElementById('comparacaoConteudo').innerHTML = html;
        document.getElementById('modalComparacao').style.display = 'flex';
    }

    aprovarMelhorProposta() {
        if (confirm('Deseja aprovar a melhor proposta e gerar o pedido de compra')) {
            // Aqui integraria com o módulo de pedidos
            alert('Proposta aprovada! Pedido de compra será geração automaticamente.');
            this.fecharModalComparacao();
        }
    }

    salvarRascunho() {
        this.salvarCotacao('Rascunho');
    }

    enviarCotacao() {
        this.salvarCotacao('Enviada');
    }

    salvarCotacao(status) {
        const solicitante = document.getElementById('cotacaoSolicitante').value;

        if (!solicitante) {
            alert('Preencha o solicitante!');
            return;
        }

        // Validar materiais
        const tbody = document.getElementById('materiaisCotacaoBody');
        const rows = tbody.querySelectorAll('tr');
        
        if (rows.length === 0) {
            alert('Adicione ao menos um material!');
            return;
        }

        const materiais = [];
        let valid = true;

        rows.forEach(row => {
            const materialId = parseInt(row.querySelector('.material-select').value);
            const quantidade = parseFloat(row.querySelector('.material-quantidade').value);

            if (!materialId || !quantidade) {
                valid = false;
                return;
            }

            const material = this.materiais.find(m => m.id === materialId);
            const especificacoes = row.querySelector('.material-especificacao').value;

            materiais.push({
                materialId: materialId,
                materialCodigo: material.codigo,
                materialDescricao: material.descricao,
                quantidade: quantidade,
                unidade: material.unidade,
                especificacoes: especificacoes || 'Conforme especificação técnica padrão'
            });
        });

        if (!valid) {
            alert('Preencha todos os campos dos materiais!');
            return;
        }

        // Validar fornecedores
        const fornecedoresSelecionaçãos = Array.from(document.querySelectorAll('.fornecedor-checkbox:checked')).map(cb => parseInt(cb.value));

        if (fornecedoresSelecionaçãos.length === 0) {
            alert('Selecione ao menos um fornecedor!');
            return;
        }

        const id = document.getElementById('cotacaoId').value;

        const cotacao = {
            numero: document.getElementById('cotacaoNumero').value,
            data: document.getElementById('cotacaoData').value,
            solicitante: solicitante,
            descricao: document.getElementById('cotacaoDescricao').value,
            prazoResposta: document.getElementById('cotacaoPrazoResposta').value,
            status: status,
            materiais: materiais,
            fornecedores: fornecedoresSelecionaçãos,
            propostas: [],
            melhorProposta: null,
            prazoEntrega: document.getElementById('cotacaoPrazoEntrega').value,
            formaPagamento: document.getElementById('cotacaoFormaPagamento').value,
            localEntrega: document.getElementById('cotacaoLocalEntrega').value,
            observacoes: document.getElementById('cotacaoObservacoes').value,
            pedidoGeração: null
        };

        if (id) {
            // Editar
            const index = this.cotacoes.findIndex(c => c.id === parseInt(id));
            if (index > -1) {
                this.cotacoes[index] = { ...this.cotacoes[index], ...cotacao };
                alert(`Cotação ${status === 'Rascunho'  'salva' : 'enviada'} com sucesso!`);
            }
        } else {
            // Nova
            const novoId = Math.max(...this.cotacoes.map(c => c.id)) + 1;
            this.cotacoes.unshift({
                id: novoId,
                ...cotacao
            });
            alert(`Cotação ${status === 'Rascunho'  'salva' : 'enviada'} com sucesso!${status === 'Enviada'  '\n\nE-mails enviaçãos aos fornecedores selecionaçãos.' : ''}`);
        }

        this.fecharModal();
        this.filtrar();
        this.atualizarCards();
    }

    fecharModal() {
        document.getElementById('modalCotacao').style.display = 'none';
    }

    fecharModalComparacao() {
        document.getElementById('modalComparacao').style.display = 'none';
    }

    fecharModalProposta() {
        document.getElementById('modalProposta').style.display = 'none';
    }

    exportar() {
        const headers = ['Número', 'Data', 'Solicitante', 'Status', 'Materiais', 'Fornecedores', 'Propostas', 'Melhor Oferta'];
        const csv = [
            headers.join(';'),
            ...this.cotacoesFiltradas.map(c => [
                c.numero,
                c.data,
                c.solicitante,
                c.status,
                c.materiais.length,
                c.fornecedores.length,
                c.propostas.length,
                c.melhorProposta ? c.melhorProposta.total.toFixed(2) : '0'
            ].join(';'))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `cotacoes_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }

    formatarData(data) {
        if (!data) return '-';
        const [ano, mes, dia] = data.split('-');
        return `${dia}/${mes}/${ano}`;
    }
}

// Funções globais (header)
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    
    const icon = document.querySelector('#btnModoEscuro i');
    icon.className = isDark  'fas fa-sun' : 'fas fa-moon';
}

function toggleView(mode) {
    const btnGrid = document.getElementById('btnViewGrid');
    const btnList = document.getElementById('btnViewList');

    if (mode === 'grid') {
        btnGrid.classList.add('active');
        btnList.classList.remove('active');
    } else {
        btnList.classList.add('active');
        btnGrid.classList.remove('active');
    }
}

function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    menu.style.display = menu.style.display === 'block'  'none' : 'block';
}

function inicializarUsuario() {
    const agora = new Date();
    const hora = agora.getHours();
    let saudacao = 'Olá';
    
    if (hora < 12) saudacao = 'Bom dia';
    else if (hora < 18) saudacao = 'Boa tarde';
    else saudacao = 'Boa noite';

    const userName = localStorage.getItem('userName') || 'Usuário';
    document.getElementById('userGreeting').textContent = `${saudacao}, ${userName}`;
}

// Fechar menu ao clicar fora
document.addEventListener('click', function(event) {
    const userProfile = document.querySelector('.user-profile');
    const userMenu = document.getElementById('userMenu');
    
    if (userProfile && !userProfile.contains(event.target)) {
        userMenu.style.display = 'none';
    }
});

// Inicializar ao carregar
let cotacoesManager;
document.addEventListener('DOMContentLoaded', function() {
    // Carregar modo escuro
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        const icon = document.querySelector('#btnModoEscuro i');
        if (icon) icon.className = 'fas fa-sun';
    }

    cotacoesManager = new CotacoesManager();
});
