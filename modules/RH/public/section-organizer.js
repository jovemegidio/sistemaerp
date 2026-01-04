/* ============================================= */
/* ORGANIZADOR DE SEÇÕES - LAYOUT LIMPO        */
/* ============================================= */

// Classe para reorganizar as seções com layout limpo
class SectionOrganizer {
    constructor() {
        this.init();
    }

    init() {
        console.log('🎯 Inicializando organizaçãor de seções...');
        
        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
            return;
        }
        
        setTimeout(() => {
            this.reorganizeFuncionarios();
            this.reorganizeHolerites();
            this.reorganizeRelatorios();
            this.setInitialSection();
        }, 100);
    }

    // Reorganizar seção de funcionários
    reorganizeFuncionarios() {
        console.log('👥 Reorganizando seção de Funcionários...');
        
        const section = document.getElementById('funcionarios-section');
        if (!section) return;

        section.innerHTML = `
            <!-- Header da Seção -->
            <div class="section-header-organized">
                <h1 class="section-title-main">
                    <i class="fas fa-users"></i>
                    Gestão de Funcionários
                </h1>
                <div class="section-actions">
                    <button class="btn-action btn-primary" onclick="adicionarFuncionario()">
                        <i class="fas fa-plus"></i>
                        Novo Funcionário
                    </button>
                    <button class="btn-action btn-success" onclick="importarFuncionarios()">
                        <i class="fas fa-upload"></i>
                        Importar
                    </button>
                </div>
            </div>

            <!-- Toolbar de Ações -->
            <div class="section-toolbar">
                <div class="section-search">
                    <i class="fas fa-search"></i>
                    <input type="text" placeholder="Buscar por nome, cargo ou email..." id="funcionarios-search-input">
                </div>
                <div class="section-actions">
                    <button class="btn-action btn-outline" onclick="exportarFuncionarios()">
                        <i class="fas fa-download"></i>
                        Exportar
                    </button>
                    <button class="btn-action btn-outline" onclick="filtrarFuncionarios()">
                        <i class="fas fa-filter"></i>
                        Filtros
                    </button>
                </div>
            </div>

            <!-- Estatísticas -->
            <div class="stats-row">
                <div class="stat-card blue">
                    <div class="stat-header">
                        <h3 class="stat-title">Total Funcionários</h3>
                        <div class="stat-icon">
                            <i class="fas fa-users"></i>
                        </div>
                    </div>
                    <div class="stat-value" id="total-funcionarios-stat">6</div>
                    <div class="stat-subtitle">Ativos na empresa</div>
                </div>
                <div class="stat-card green">
                    <div class="stat-header">
                        <h3 class="stat-title">Ativos</h3>
                        <div class="stat-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                    </div>
                    <div class="stat-value" id="funcionarios-ativos">6</div>
                    <div class="stat-subtitle">Trabalhando</div>
                </div>
                <div class="stat-card yellow">
                    <div class="stat-header">
                        <h3 class="stat-title">Aniversariantes</h3>
                        <div class="stat-icon">
                            <i class="fas fa-birthday-cake"></i>
                        </div>
                    </div>
                    <div class="stat-value" id="aniversariantes-mes">2</div>
                    <div class="stat-subtitle">Este mês</div>
                </div>
                <div class="stat-card red">
                    <div class="stat-header">
                        <h3 class="stat-title">Admissões</h3>
                        <div class="stat-icon">
                            <i class="fas fa-user-plus"></i>
                        </div>
                    </div>
                    <div class="stat-value" id="admissoes-mes">2</div>
                    <div class="stat-subtitle">Este mês</div>
                </div>
            </div>

            <!-- Grid de Funcionários -->
            <div class="items-grid" id="funcionarios-grid-organized">
                ${this.createFuncionarioCards()}
            </div>

            <!-- Tabela de Funcionários (oculta inicialmente) -->
            <div class="data-table-container" id="funcionarios-table-organized" style="display: none;">
                ${this.createFuncionariosTable()}
            </div>
        `;
    }

    // Reorganizar seção de holerites
    reorganizeHolerites() {
        console.log('💰 Reorganizando seção de Holerites...');
        
        const section = document.getElementById('holerites-section');
        if (!section) return;

        section.innerHTML = `
            <!-- Header da Seção -->
            <div class="section-header-organized">
                <h1 class="section-title-main">
                    <i class="fas fa-money-check-alt"></i>
                    Holerites e Folha de Pagamento
                </h1>
                <div class="section-actions">
                    <button class="btn-action btn-primary" onclick="gerarFolha()">
                        <i class="fas fa-calculator"></i>
                        Gerar Folha
                    </button>
                    <button class="btn-action btn-success" onclick="gerarHolerites()">
                        <i class="fas fa-file-invoice"></i>
                        Gerar Holerites
                    </button>
                </div>
            </div>

            <!-- Toolbar de Ações -->
            <div class="section-toolbar">
                <div class="section-search">
                    <i class="fas fa-calendar"></i>
                    <select id="competencia-select" style="width: 200px; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px;">
                        <option value="2024-09">Setembro 2024</option>
                        <option value="2024-08">Agosto 2024</option>
                        <option value="2024-07">Julho 2024</option>
                    </select>
                </div>
                <div class="section-actions">
                    <button class="btn-action btn-outline" onclick="exportarFolha()">
                        <i class="fas fa-download"></i>
                        Exportar Folha
                    </button>
                    <button class="btn-action btn-outline" onclick="relatórioPagamento()">
                        <i class="fas fa-chart-bar"></i>
                        Relatório
                    </button>
                </div>
            </div>

            <!-- Estatísticas -->
            <div class="stats-row">
                <div class="stat-card blue">
                    <div class="stat-header">
                        <h3 class="stat-title">Holerites Geraçãos</h3>
                        <div class="stat-icon">
                            <i class="fas fa-file-invoice"></i>
                        </div>
                    </div>
                    <div class="stat-value">6</div>
                    <div class="stat-subtitle">Setembro 2024</div>
                </div>
                <div class="stat-card green">
                    <div class="stat-header">
                        <h3 class="stat-title">Total Bruto</h3>
                        <div class="stat-icon">
                            <i class="fas fa-money-bill"></i>
                        </div>
                    </div>
                    <div class="stat-value">R$ 45.670</div>
                    <div class="stat-subtitle">Folha mensal</div>
                </div>
                <div class="stat-card yellow">
                    <div class="stat-header">
                        <h3 class="stat-title">Descontos</h3>
                        <div class="stat-icon">
                            <i class="fas fa-minus-circle"></i>
                        </div>
                    </div>
                    <div class="stat-value">R$ 8.420</div>
                    <div class="stat-subtitle">INSS + IRRF</div>
                </div>
                <div class="stat-card red">
                    <div class="stat-header">
                        <h3 class="stat-title">Líquido</h3>
                        <div class="stat-icon">
                            <i class="fas fa-hand-holding-usd"></i>
                        </div>
                    </div>
                    <div class="stat-value">R$ 37.250</div>
                    <div class="stat-subtitle">A pagar</div>
                </div>
            </div>

            <!-- Lista de Holerites -->
            <div class="items-grid" id="holerites-grid-organized">
                ${this.createHoleriteCards()}
            </div>
        `;
    }

    // Reorganizar seção de relatórios
    reorganizeRelatorios() {
        console.log('📊 Reorganizando seção de Relatórios...');
        
        const section = document.getElementById('relatórios-section');
        if (!section) return;

        section.innerHTML = `
            <!-- Header da Seção -->
            <div class="section-header-organized">
                <h1 class="section-title-main">
                    <i class="fas fa-chart-line"></i>
                    Relatórios e Analytics
                </h1>
                <div class="section-actions">
                    <button class="btn-action btn-primary" onclick="novoRelatorio()">
                        <i class="fas fa-plus"></i>
                        Novo Relatório
                    </button>
                    <button class="btn-action btn-success" onclick="agendarRelatorio()">
                        <i class="fas fa-clock"></i>
                        Agendar
                    </button>
                </div>
            </div>

            <!-- Toolbar de Ações -->
            <div class="section-toolbar">
                <div class="section-search">
                    <i class="fas fa-calendar-alt"></i>
                    <select id="período-relatório" style="width: 200px; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px;">
                        <option value="mes">Este Mês</option>
                        <option value="trimestre">Trimestre</option>
                        <option value="semestre">Semestre</option>
                        <option value="ano">Este Ano</option>
                        <option value="personalização">Personalização</option>
                    </select>
                </div>
                <div class="section-actions">
                    <button class="btn-action btn-outline" onclick="exportarTodosRelatorios()">
                        <i class="fas fa-download"></i>
                        Exportar Todos
                    </button>
                    <button class="btn-action btn-outline" onclick="configurarRelatorios()">
                        <i class="fas fa-cog"></i>
                        Configurações
                    </button>
                </div>
            </div>

            <!-- Estatísticas -->
            <div class="stats-row">
                <div class="stat-card blue">
                    <div class="stat-header">
                        <h3 class="stat-title">Relatórios</h3>
                        <div class="stat-icon">
                            <i class="fas fa-file-alt"></i>
                        </div>
                    </div>
                    <div class="stat-value">12</div>
                    <div class="stat-subtitle">Disponíveis</div>
                </div>
                <div class="stat-card green">
                    <div class="stat-header">
                        <h3 class="stat-title">Geraçãos Hoje</h3>
                        <div class="stat-icon">
                            <i class="fas fa-calendar-day"></i>
                        </div>
                    </div>
                    <div class="stat-value">3</div>
                    <div class="stat-subtitle">Hoje</div>
                </div>
                <div class="stat-card yellow">
                    <div class="stat-header">
                        <h3 class="stat-title">Agendaçãos</h3>
                        <div class="stat-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                    </div>
                    <div class="stat-value">5</div>
                    <div class="stat-subtitle">Automáticos</div>
                </div>
                <div class="stat-card red">
                    <div class="stat-header">
                        <h3 class="stat-title">Downloads</h3>
                        <div class="stat-icon">
                            <i class="fas fa-download"></i>
                        </div>
                    </div>
                    <div class="stat-value">28</div>
                    <div class="stat-subtitle">Este mês</div>
                </div>
            </div>

            <!-- Grid de Relatórios -->
            <div class="items-grid" id="relatórios-grid-organized">
                ${this.createRelatorioCards()}
            </div>
        `;
    }

    // Criar cards de funcionários
    createFuncionarioCards() {
        const funcionarios = [
            { nome: 'Andreia Silva', cargo: 'Gerente RH', email: 'andreia@empresa.com', status: 'active' },
            { nome: 'Douglas Santos', cargo: 'Desenvolvedor', email: 'douglas@empresa.com', status: 'active' },
            { nome: 'Hellen Costa', cargo: 'Designer', email: 'hellen@empresa.com', status: 'active' },
            { nome: 'Junior Oliveira', cargo: 'Analista TI', email: 'junior@empresa.com', status: 'active' },
            { nome: 'RH Assistente', cargo: 'Assistente RH', email: 'rh@empresa.com', status: 'active' },
            { nome: 'TI Suporte', cargo: 'Suporte TI', email: 'ti@empresa.com', status: 'active' }
        ];

        return funcionarios.map(func => `
            <div class="item-card">
                <div class="item-header">
                    <img src="Interativo-Aluforce.jpg" alt="${func.nome}" class="item-avatar">
                    <div class="item-info">
                        <h4>${func.nome}</h4>
                        <p class="cargo">${func.cargo}</p>
                        <p class="email">${func.email}</p>
                    </div>
                </div>
                <div class="item-status">
                    <span class="status-badge ${func.status}">
                        ${func.status === 'active'  'Ativo' : 'Inativo'}
                    </span>
                </div>
                <div class="item-actions">
                    <button class="action-btn view" title="Visualizar" onclick="visualizarFuncionario('${func.email}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" title="Editar" onclick="editarFuncionario('${func.email}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" title="Excluir" onclick="excluirFuncionario('${func.email}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Criar cards de holerites
    createHoleriteCards() {
        const holerites = [
            { funcionario: 'Andreia Silva', competencia: 'Set/2024', bruto: 'R$ 8.500,00', liquido: 'R$ 6.800,00', status: 'active' },
            { funcionario: 'Douglas Santos', competencia: 'Set/2024', bruto: 'R$ 7.200,00', liquido: 'R$ 5.940,00', status: 'active' },
            { funcionario: 'Hellen Costa', competencia: 'Set/2024', bruto: 'R$ 6.800,00', liquido: 'R$ 5.610,00', status: 'active' },
            { funcionario: 'Junior Oliveira', competencia: 'Set/2024', bruto: 'R$ 6.200,00', liquido: 'R$ 5.100,00', status: 'pending' },
            { funcionario: 'RH Assistente', competencia: 'Set/2024', bruto: 'R$ 4.500,00', liquido: 'R$ 3.870,00', status: 'active' },
            { funcionario: 'TI Suporte', competencia: 'Set/2024', bruto: 'R$ 5.200,00', liquido: 'R$ 4.290,00', status: 'active' }
        ];

        return holerites.map(hol => `
            <div class="item-card">
                <div class="item-header">
                    <img src="Interativo-Aluforce.jpg" alt="${hol.funcionario}" class="item-avatar">
                    <div class="item-info">
                        <h4>${hol.funcionario}</h4>
                        <p>Competência: ${hol.competencia}</p>
                        <p>Bruto: ${hol.bruto} | Líquido: ${hol.liquido}</p>
                    </div>
                </div>
                <div class="item-status">
                    <span class="status-badge ${hol.status}">
                        ${hol.status === 'active'  'Processação' : 'Pendente'}
                    </span>
                </div>
                <div class="item-actions">
                    <button class="action-btn view" title="Visualizar Holerite" onclick="visualizarHolerite('${hol.funcionario}')">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                    <button class="action-btn edit" title="Editar" onclick="editarHolerite('${hol.funcionario}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn view" title="Download" onclick="downloadHolerite('${hol.funcionario}')">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Criar cards de relatórios
    createRelatorioCards() {
        const relatórios = [
            { nome: 'Folha de Pagamento', descricao: 'Relatório mensal completo', tipo: 'Financeiro', status: 'active' },
            { nome: 'Funcionários Ativos', descricao: 'Lista de colaboraçãores ativos', tipo: 'RH', status: 'active' },
            { nome: 'Aniversariantes', descricao: 'Colaboraçãores aniversariantes do mês', tipo: 'RH', status: 'active' },
            { nome: 'Férias e Licenças', descricao: 'Controle de ausências', tipo: 'RH', status: 'pending' },
            { nome: 'Custos por Departamento', descricao: 'Análise de custos', tipo: 'Financeiro', status: 'active' },
            { nome: 'Produtividade', descricao: 'Métricas de performance', tipo: 'Gestão', status: 'active' }
        ];

        return relatórios.map(rel => `
            <div class="item-card">
                <div class="item-header">
                    <div class="item-avatar" style="background: #3b82f6; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                        ${rel.tipo.charAt(0)}
                    </div>
                    <div class="item-info">
                        <h4>${rel.nome}</h4>
                        <p>${rel.descricao}</p>
                        <p>Categoria: ${rel.tipo}</p>
                    </div>
                </div>
                <div class="item-status">
                    <span class="status-badge ${rel.status}">
                        ${rel.status === 'active'  'Disponível' : 'Processando'}
                    </span>
                </div>
                <div class="item-actions">
                    <button class="action-btn view" title="Visualizar" onclick="visualizarRelatorio('${rel.nome}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" title="Gerar" onclick="gerarRelatorio('${rel.nome}')">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="action-btn view" title="Download" onclick="downloadRelatorio('${rel.nome}')">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Criar tabela de funcionários
    createFuncionariosTable() {
        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Foto</th>
                        <th>Nome</th>
                        <th>Cargo</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><img src="Interativo-Aluforce.jpg" class="table-avatar" alt="Andreia"></td>
                        <td>Andreia Silva</td>
                        <td>Gerente RH</td>
                        <td>andreia@empresa.com</td>
                        <td><span class="status-badge active">Ativo</span></td>
                        <td>
                            <button class="action-btn view" onclick="visualizarFuncionario('andreia@empresa.com')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit" onclick="editarFuncionario('andreia@empresa.com')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" onclick="excluirFuncionario('andreia@empresa.com')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                    <tr>
                        <td><img src="Interativo-Aluforce.jpg" class="table-avatar" alt="Douglas"></td>
                        <td>Douglas Santos</td>
                        <td>Desenvolvedor</td>
                        <td>douglas@empresa.com</td>
                        <td><span class="status-badge active">Ativo</span></td>
                        <td>
                            <button class="action-btn view" onclick="visualizarFuncionario('douglas@empresa.com')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit" onclick="editarFuncionario('douglas@empresa.com')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" onclick="excluirFuncionario('douglas@empresa.com')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    // Definir seção inicial
    setInitialSection() {
        console.log('🏠 Definindo seção inicial...');
        
        // Esconder todas as seções
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
        
        // Mostrar funcionários como inicial
        const funcionariosSection = document.getElementById('funcionarios-section');
        if (funcionariosSection) {
            funcionariosSection.classList.add('active');
            funcionariosSection.style.display = 'block';
        }
        
        // Atualizar navegação
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const funcionariosLink = document.querySelector('[href="#funcionarios-section"]');
        if (funcionariosLink) {
            funcionariosLink.classList.add('active');
        }
        
        console.log('✅ Seções reorganizadas com sucesso');
    }
}

// Funções globais para as ações (placeholder)
window.adicionarFuncionario = () => alert('🚧 Funcionalidade em desenvolvimento: Adicionar Funcionário');
window.importarFuncionarios = () => alert('🚧 Funcionalidade em desenvolvimento: Importar Funcionários');
window.exportarFuncionarios = () => alert('🚧 Funcionalidade em desenvolvimento: Exportar Funcionários');
window.filtrarFuncionarios = () => alert('🚧 Funcionalidade em desenvolvimento: Filtrar Funcionários');
window.visualizarFuncionario = (email) => alert(`🚧 Visualizar funcionário: ${email}`);
window.editarFuncionario = (email) => alert(`🚧 Editar funcionário: ${email}`);
window.excluirFuncionario = (email) => alert(`🚧 Excluir funcionário: ${email}`);

window.gerarFolha = () => alert('🚧 Funcionalidade em desenvolvimento: Gerar Folha');
window.gerarHolerites = () => alert('🚧 Funcionalidade em desenvolvimento: Gerar Holerites');
window.exportarFolha = () => alert('🚧 Funcionalidade em desenvolvimento: Exportar Folha');
window.relatórioPagamento = () => alert('🚧 Funcionalidade em desenvolvimento: Relatório de Pagamento');
window.visualizarHolerite = (func) => alert(`🚧 Visualizar holerite: ${func}`);
window.editarHolerite = (func) => alert(`🚧 Editar holerite: ${func}`);
window.downloadHolerite = (func) => alert(`🚧 Download holerite: ${func}`);

window.novoRelatorio = () => alert('🚧 Funcionalidade em desenvolvimento: Novo Relatório');
window.agendarRelatorio = () => alert('🚧 Funcionalidade em desenvolvimento: Agendar Relatório');
window.exportarTodosRelatorios = () => alert('🚧 Funcionalidade em desenvolvimento: Exportar Todos');
window.configurarRelatorios = () => alert('🚧 Funcionalidade em desenvolvimento: Configurar Relatórios');
window.visualizarRelatorio = (nome) => alert(`🚧 Visualizar relatório: ${nome}`);
window.gerarRelatorio = (nome) => alert(`🚧 Gerar relatório: ${nome}`);
window.downloadRelatorio = (nome) => alert(`🚧 Download relatório: ${nome}`);

// Inicialização
/*OTIMIZADO*/ //document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.sectionOrganizer = new SectionOrganizer();
    }, 200);
});

console.log('🎯 Section Organizer carregação');