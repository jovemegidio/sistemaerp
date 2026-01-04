/* ================================================= */
/* CORREÇÁO PARA EXIBIÇÁO DE SEÇÕES                 */
/* ================================================= */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando correção de seções...');
    
    // Função para garantir exibição das seções
    function initializeSections() {
        console.log('🔧 Inicializando exibição de seções...');
        
        // Encontrar seção ativa ou definir primeira como ativa
        let activeSection = document.querySelector('.content-section.active');
        
        // Se não encontrou seção ativa, procurar por dashboard
        if (!activeSection) {
            activeSection = document.getElementById('dashboard') || 
                           document.getElementById('dashboard-home') ||
                           document.querySelector('.content-section');
            
            if (activeSection) {
                activeSection.classList.add('active');
                console.log('✅ Seção padrão definida:', activeSection.id);
            }
        }
        
        // Aplicar estilos para todas as seções
        document.querySelectorAll('.content-section').forEach(function(section) {
            if (section.classList.contains('active')) {
                section.style.display = 'block';
                section.style.opacity = '1';
                section.style.visibility = 'visible';
                section.style.position = 'relative';
                section.style.zIndex = '2';
                console.log('✅ Seção ativa exibida:', section.id);
            } else {
                section.style.display = 'none';
            }
        });
        
        // Forçar exibição das áreas principais
        const contentArea = document.querySelector('.content-area');
        if (contentArea) {
            contentArea.style.display = 'block';
            contentArea.style.visibility = 'visible';
            contentArea.style.minHeight = '100vh';
        }
        
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.display = 'block';
            mainContent.style.visibility = 'visible';
            mainContent.style.minHeight = '100vh';
        }
        
        // Verificar se há conteúdo visível
        const visibleSections = document.querySelectorAll('.content-section.active');
        console.log('📊 Seções visíveis:', visibleSections.length);
        
        if (visibleSections.length === 0) {
            console.warn('⚠️ Nenhuma seção visível encontrada!');
        }
    }
    
    // Executar imediatamente
    initializeSections();
    
    // Executar após delay para garantir que DOM esteja completamente carregação
    setTimeout(function() {
        initializeSections();
        console.log('🔄 Seções reforçadas após delay');
    }, 100);
    
    setTimeout(function() {
        initializeSections();
        console.log('🔄 Seções reforçadas após delay longo');
    }, 1000);
    
    // Reexecutar quando outros scripts forem carregaçãos
    window.addEventListener('load', function() {
        setTimeout(function() {
            initializeSections();
            console.log('🔄 Seções reforçadas após window.load');
        }, 500);
    });
});

// Função global para debug
window.debugSections = function() {
    console.log('=== 🔍 DEBUG DAS SEÇÕES ===');
    const allSections = document.querySelectorAll('.content-section');
    console.log('Total de seções encontradas:', allSections.length);
    
    allSections.forEach(function(section, index) {
        console.log(`📄 Seção ${index + 1}:`, section.id);
        console.log('- Classes:', section.className);
        console.log('- Display:', section.style.display || getComputedStyle(section).display);
        console.log('- Visibility:', section.style.visibility || getComputedStyle(section).visibility);
        console.log('- Opacity:', section.style.opacity || getComputedStyle(section).opacity);
        console.log('- Z-index:', section.style.zIndex || getComputedStyle(section).zIndex);
        console.log('---');
    });
    
    const contentArea = document.querySelector('.content-area');
    const mainContent = document.querySelector('.main-content');
    
    console.log('🏠 Content Area:', contentArea ? 'Encontrada' : 'NÁO ENCONTRADA');
    console.log('🏗️ Main Content:', mainContent ? 'Encontrada' : 'NÁO ENCONTRADA');
    
    if (contentArea) {
        console.log('Content Area Display:', getComputedStyle(contentArea).display);
        console.log('Content Area Visibility:', getComputedStyle(contentArea).visibility);
    }
    
    if (mainContent) {
        console.log('Main Content Display:', getComputedStyle(mainContent).display);
        console.log('Main Content Visibility:', getComputedStyle(mainContent).visibility);
    }
};

// Função para forçar exibição
window.forceShowSections = function() {
    console.log('🔧 Forçando exibição de seções...');
    
    const dashboard = document.getElementById('dashboard') || document.getElementById('dashboard-home');
    if (dashboard) {
        dashboard.classList.add('active');
        dashboard.style.display = 'block !important';
        dashboard.style.visibility = 'visible !important';
        dashboard.style.opacity = '1 !important';
        console.log('✅ Dashboard forçação a aparecer');
    }
    
    const contentArea = document.querySelector('.content-area');
    if (contentArea) {
        contentArea.style.display = 'block !important';
        contentArea.style.visibility = 'visible !important';
        contentArea.style.background = '#ffffff';
        console.log('✅ Content Area forçada a aparecer');
    }
};