// Correção para os problemas de carregamento da página

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Iniciando correções de emergência...');
    
    // Garantir que as seções estejam visíveis
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'block';
    });
    
    // Ativar a primeira seção (dashboard) por padrão
    const dashboardSection = document.getElementById('dashboard-section');
    if (dashboardSection) {
        dashboardSection.classList.add('active');
        dashboardSection.style.display = 'block';
    }
    
    // Garantir que o body não tenha display: none
    document.body.style.display = 'block';
    document.body.style.visibility = 'visible';
    
    // Forçar exibição do conteúdo principal
    const main = document.querySelector('main');
    if (main) {
        main.style.display = 'block';
        main.style.visibility = 'visible';
    }
    
    // Corrigir navegação do menu
    setupSidebarNavigation();
    
    // Log para debugging
    console.log('✅ Correções aplicadas');
    console.log('Seções encontradas:', sections.length);
    console.log('Dashboard ativo:', dashboardSection ? 'Sim' : 'Não');
});

function setupSidebarNavigation() {
    const menuItems = document.querySelectorAll('.nav-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const sectionId = this.getAttribute('data-section');
            if (sectionId) {
                showSection(sectionId);
            }
        });
    });
}

function showSection(sectionId) {
    // Esconder todas as seções
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    
    // Mostrar a seção solicitada
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';
    }
    
    // Atualizar menu ativo
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeMenuItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeMenuItem) {
        activeMenuItem.classList.add('active');
    }
}

// Funções de emergência expostas globalmente
window.emergencyFix = {
    showSection,
    forceShowDashboard: () => showSection('dashboard-section'),
    forceShowFuncionarios: () => showSection('funcionarios-section'),
    forceShowHolerites: () => showSection('holerites-section'),
    forceShowRelatorios: () => showSection('relatórios-section')
};