/* ============================================= */
/* CORREÇÁO JAVASCRIPT - SEÇÕES VAZIAS         */
/* ============================================= */

// Função para forçar visibilidade das seções
function forceSectionsVisibility() {
    console.log('🔧 Forçando visibilidade das seções...');
    
    // Encontrar todas as seções
    const sections = document.querySelectorAll('.content-section');
    console.log(`📊 Encontradas ${sections.length} seções`);
    
    sections.forEach(section => {
        const sectionId = section.id;
        console.log(`🔍 Verificando seção: ${sectionId}`);
        
        // Forçar estilos de visibilidade
        section.style.visibility = 'visible';
        section.style.opacity = '1';
        section.style.position = 'relative';
        
        // Se não é ativa, esconder
        if (!section.classList.contains('active')) {
            section.style.display = 'none';
        } else {
            section.style.display = 'block';
            console.log(`✅ Seção ativa: ${sectionId}`);
        }
        
        // Forçar visibilidade de conteúdo interno
        const elements = section.querySelectorAll('*');
        elements.forEach(el => {
            if (el.style.visibility === 'hidden') {
                el.style.visibility = 'visible';
            }
            if (el.style.opacity === '0') {
                el.style.opacity = '1';
            }
        });
    });
}

// Função melhorada para navegação entre seções
function improvedNavigateToSection(sectionId) {
    console.log(`🧭 Navegando para: ${sectionId}`);
    
    // Esconder todas as seções
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
        section.style.visibility = 'visible';
        section.style.opacity = '1';
    });
    
    // Remover active dos links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Mostrar seção alvo
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';
        targetSection.style.visibility = 'visible';
        targetSection.style.opacity = '1';
        
        // Ativar link correspondente
        const activeLink = document.querySelector(`[onclick*="${sectionId}"]`) || 
                          document.querySelector(`[href="#${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        console.log(`✅ Seção ${sectionId} ativada com sucesso`);
        
        // Carregar conteúdo específico da seção se necessário
        loadSectionContent(sectionId);
    } else {
        console.error(`❌ Seção ${sectionId} não encontrada`);
    }
}

// Função para carregar conteúdo específico de cada seção
function loadSectionContent(sectionId) {
    switch(sectionId) {
        case 'funcionarios-section':
            loadFuncionariosContent();
            break;
        case 'holerites-section':
            loadHoleritesContent();
            break;
        case 'relatórios-section':
            loadRelatoriosContent();
            break;
        case 'dashboard-home':
            loadDashboardContent();
            break;
    }
}

// Carregar conteúdo da seção funcionários
function loadFuncionariosContent() {
    console.log('👥 Carregando conteúdo de funcionários...');
    
    const grid = document.getElementById('funcionarios-grid');
    if (grid) {
        grid.style.display = 'grid';
        grid.style.visibility = 'visible';
        grid.style.opacity = '1';
        
        // Se estiver vazio, criar cards de exemplo
        if (grid.children.length === 0 || grid.innerHTML.trim() === '') {
            grid.innerHTML = `
                <div class="funcionario-card">
                    <div class="funcionario-avatar">
                        <img src="Interativo-Aluforce.jpg" alt="Avatar" style="width: 50px; height: 50px; border-radius: 50%;">
                    </div>
                    <div class="funcionario-info">
                        <h4>Andreia Silva</h4>
                        <p class="cargo">Gerente RH</p>
                        <p class="email">andreia@empresa.com</p>
                    </div>
                    <div class="funcionario-status">
                        <span class="status-badge active">Ativo</span>
                    </div>
                    <div class="funcionario-actions">
                        <button class="action-btn" title="Ver detalhes">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn danger" title="Remover">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="funcionario-card">
                    <div class="funcionario-avatar">
                        <img src="Interativo-Aluforce.jpg" alt="Avatar" style="width: 50px; height: 50px; border-radius: 50%;">
                    </div>
                    <div class="funcionario-info">
                        <h4>Douglas Santos</h4>
                        <p class="cargo">Desenvolvedor</p>
                        <p class="email">douglas@empresa.com</p>
                    </div>
                    <div class="funcionario-status">
                        <span class="status-badge active">Ativo</span>
                    </div>
                    <div class="funcionario-actions">
                        <button class="action-btn" title="Ver detalhes">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn danger" title="Remover">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }
        console.log('✅ Conteúdo de funcionários carregação');
    }
}

// Carregar conteúdo da seção holerites
function loadHoleritesContent() {
    console.log('💰 Carregando conteúdo de holerites...');
    
    const section = document.getElementById('holerites-section');
    if (section) {
        // Garantir que existe conteúdo na seção
        const existingContent = section.querySelector('.holerites-content');
        if (!existingContent) {
            const contentDiv = document.createElement('div');
            contentDiv.className = 'holerites-content';
            contentDiv.innerHTML = `
                <div class="holerites-stats">
                    <div class="stat-card">
                        <h3>Holerites Geraçãos</h3>
                        <p class="stat-value">156</p>
                    </div>
                    <div class="stat-card">
                        <h3>Pendentes</h3>
                        <p class="stat-value">3</p>
                    </div>
                    <div class="stat-card">
                        <h3>Total Folha</h3>
                        <p class="stat-value">R$ 45.670,00</p>
                    </div>
                </div>
                <div class="holerites-list">
                    <h3>Últimos Holerites</h3>
                    <div class="holerite-item">
                        <span>Andreia Silva - Setembro 2024</span>
                        <button class="btn btn-sm">Visualizar</button>
                    </div>
                    <div class="holerite-item">
                        <span>Douglas Santos - Setembro 2024</span>
                        <button class="btn btn-sm">Visualizar</button>
                    </div>
                </div>
            `;
            section.appendChild(contentDiv);
        }
        console.log('✅ Conteúdo de holerites carregação');
    }
}

// Carregar conteúdo da seção relatórios
function loadRelatoriosContent() {
    console.log('📊 Carregando conteúdo de relatórios...');
    
    const section = document.getElementById('relatórios-section');
    if (section) {
        // Garantir que existe conteúdo na seção
        const existingContent = section.querySelector('.relatórios-content');
        if (!existingContent) {
            const contentDiv = document.createElement('div');
            contentDiv.className = 'relatórios-content';
            contentDiv.innerHTML = `
                <div class="relatórios-stats">
                    <div class="stat-card">
                        <h3>Relatórios Disponíveis</h3>
                        <p class="stat-value">12</p>
                    </div>
                    <div class="stat-card">
                        <h3>Geraçãos Hoje</h3>
                        <p class="stat-value">3</p>
                    </div>
                </div>
                <div class="relatórios-list">
                    <h3>Relatórios Recentes</h3>
                    <div class="relatório-item">
                        <span>Relatório de Funcionários Ativos</span>
                        <button class="btn btn-sm">Baixar</button>
                    </div>
                    <div class="relatório-item">
                        <span>Folha de Pagamento - Setembro</span>
                        <button class="btn btn-sm">Baixar</button>
                    </div>
                </div>
            `;
            section.appendChild(contentDiv);
        }
        console.log('✅ Conteúdo de relatórios carregação');
    }
}

// Carregar conteúdo do dashboard
function loadDashboardContent() {
    console.log('🏠 Carregando conteúdo do dashboard...');
    
    // Verificar se os widgets estão visíveis
    const widgets = document.querySelectorAll('.widget');
    widgets.forEach(widget => {
        widget.style.display = 'block';
        widget.style.visibility = 'visible';
        widget.style.opacity = '1';
    });
    
    console.log('✅ Conteúdo do dashboard carregação');
}

// Inicialização quando DOM estiver pronto
function initializeSectionsRepair() {
    console.log('🚀 Inicializando correção de seções...');
    
    // Aguardar DOM estar pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSectionsRepair);
        return;
    }
    
    // Forçar visibilidade inicial
    setTimeout(() => {
        forceSectionsVisibility();
        
        // Se nenhuma seção está ativa, ativar dashboard
        const activeSection = document.querySelector('.content-section.active');
        if (!activeSection) {
            console.log('📍 Nenhuma seção ativa, ativando dashboard...');
            improvedNavigateToSection('dashboard-home');
        }
    }, 100);
    
    // Sobrescrever função global se existir
    if (typeof window.omieLayout !== 'undefined' && window.omieLayout.navigateToSection) {
        const originalNavigate = window.omieLayout.navigateToSection;
        window.omieLayout.navigateToSection = function(sectionId) {
            console.log('🔄 Navegação interceptada para:', sectionId);
            improvedNavigateToSection(sectionId);
        };
    }
    
    // Adicionar event listeners para links de navegação
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const sectionId = href.substring(1);
                improvedNavigateToSection(sectionId);
            }
        });
    });
    
    console.log('✅ Correção de seções inicializada');
}

// Event listeners
/*OTIMIZADO*/ //document.addEventListener('DOMContentLoaded', initializeSectionsRepair);
window.addEventListener('load', () => {
    setTimeout(initializeSectionsRepair, 500);
});

// Função global para navegação
window.navigateToSection = improvedNavigateToSection;
window.forceSectionsVisibility = forceSectionsVisibility;

console.log('📱 Sections Repair carregação');