/* ================================================= */
/* CORREÇÁO AVANÇADA DE SEÇÕES E NAVEGAÇÁO         */
/* ================================================= */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Iniciando correções avançadas de página...');
    
    // Aguardar o layout principal carregar
    setTimeout(function() {
        initPageFixes();
    }, 500);
});

function initPageFixes() {
    console.log('🚀 Aplicando correções de página...');
    
    // 1. Corrigir seções duplicadas
    fixDuplicatedSections();
    
    // 2. Corrigir IDs duplicaçãos  
    fixDuplicatedIds();
    
    // 3. Garantir separado correta de conteúdo
    ensureContentSeparation();
    
    // 4. Corrigir navegação
    fixNavigation();
    
    // 5. Corrigir widgets que aparecem em múltiplas seções
    fixDuplicatedWidgets();
    
    console.log('✅ Correções de página concluídas');
}

// Função 1: Corrigir seções duplicadas
function fixDuplicatedSections() {
    const sectionMap = new Map();
    const sectionsToRemove = [];
    
    document.querySelectorAll('.content-section').forEach(function(section) {
        const id = section.id;
        if (id) {
            if (sectionMap.has(id)) {
                console.warn('⚠️ Seção duplicada encontrada:', id);
                sectionsToRemove.push(section);
            } else {
                sectionMap.set(id, section);
            }
        }
    });
    
    // Remover seções duplicadas
    sectionsToRemove.forEach(function(section) {
        console.log('🗑️ Removendo seção duplicada:', section.id);
        section.remove();
    });
    
    console.log(`✅ ${sectionsToRemove.length} seções duplicadas removidas`);
}

// Função 2: Corrigir IDs duplicaçãos
function fixDuplicatedIds() {
    const idMap = new Map();
    const elementsToFix = [];
    
    document.querySelectorAll('[id]').forEach(function(element) {
        const id = element.id;
        if (idMap.has(id)) {
            elementsToFix.push({ element, originalId: id });
        } else {
            idMap.set(id, element);
        }
    });
    
    // Corrigir IDs duplicaçãos
    elementsToFix.forEach(function(item, index) {
        const newId = item.originalId + '_fixed_' + (index + 1);
        item.element.id = newId;
        console.log('🔧 ID duplicação corrigido:', item.originalId, '→', newId);
    });
    
    console.log(`✅ ${elementsToFix.length} IDs duplicaçãos corrigidos`);
}

// Função 3: Garantir separado correta de conteúdo
function ensureContentSeparation() {
    const sections = document.querySelectorAll('.content-section');
    let activeSection = null;
    
    // Encontrar seção atualmente ativa
    sections.forEach(function(section) {
        if (section.classList.contains('active') || 
            getComputedStyle(section).display !== 'none') {
            
            if (activeSection) {
                // Múltiplas seções ativas - ocultar a atual
                hideSection(section);
                console.warn('⚠️ Seção extra oculta:', section.id);
            } else {
                activeSection = section;
            }
        }
    });
    
    // Se não há seção ativa, ativar dashboard
    if (!activeSection) {
        activeSection = document.getElementById('dashboard-home') || 
                       document.getElementById('dashboard');
        
        if (activeSection) {
            showSection(activeSection);
            console.log('✅ Dashboard ativação como padrão');
        }
    }
    
    // Garantir que todas as outras seções estejam ocultas
    sections.forEach(function(section) {
        if (section !== activeSection) {
            hideSection(section);
        }
    });
    
    console.log('✅ Separação de conteúdo garantida');
}

// Função 4: Corrigir navegação
function fixNavigation() {
    // Remover event listeners antigos e adicionar novos
    document.querySelectorAll('.nav-link').forEach(function(link) {
        // Clonar para remover listeners antigos
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        
        // Adicionar novo listener
        newLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const href = newLink.getAttribute('href');
            const onclick = newLink.getAttribute('onclick');
            
            let targetId = null;
            
            if (href && href.startsWith('#')) {
                targetId = href.substring(1);
            } else if (onclick && onclick.includes("'")) {
                const match = onclick.match(/'([^']+)'/);
                if (match) targetId = match[1];
            }
            
            if (targetId) {
                navigateToSection(targetId);
            }
        });
    });
    
    console.log('✅ Navegação corrigida');
}

// Função 5: Corrigir widgets duplicaçãos
function fixDuplicatedWidgets() {
    const widgetClasses = ['.widget', '.card', '.dashboard-widget'];
    const processedWidgets = new Set();
    
    widgetClasses.forEach(function(className) {
        document.querySelectorAll(className).forEach(function(widget) {
            const content = widget.textContent.trim();
            const identifier = className + '_' + content.substring(0, 50);
            
            // Se já processamos um widget idêntico, remover este
            if (content && processedWidgets.has(identifier)) {
                // Verificar se está em uma seção inativa
                const parentSection = widget.closest('.content-section');
                if (parentSection && !parentSection.classList.contains('active')) {
                    console.log('🔧 Widget duplicação removido:', identifier);
                    widget.remove();
                }
            } else if (content) {
                processedWidgets.add(identifier);
            }
        });
    });
    
    console.log('✅ Widgets duplicaçãos corrigidos');
}

// Função para mostrar seção
function showSection(section) {
    section.classList.add('active');
    section.style.display = 'block';
    section.style.visibility = 'visible';
    section.style.opacity = '1';
    section.style.position = 'relative';
    section.style.zIndex = '10';
}

// Função para ocultar seção
function hideSection(section) {
    section.classList.remove('active');
    section.style.display = 'none';
    section.style.visibility = 'hidden';
    section.style.opacity = '0';
    section.style.zIndex = '1';
}

// Função de navegação melhorada
function navigateToSection(sectionId) {
    console.log('🧭 Navegando para:', sectionId);
    
    // Ocultar todas as seções
    document.querySelectorAll('.content-section').forEach(function(section) {
        hideSection(section);
    });
    
    // Mostrar seção alvo
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        showSection(targetSection);
        
        // Atualizar links de navegação
        document.querySelectorAll('.nav-link').forEach(function(link) {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[href="#${sectionId}"]`) ||
                          document.querySelector(`[onclick*="${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // Carregar dados da seção se necessário
        loadSectionData(sectionId);
        
        // Scroll para o topo
        setTimeout(function() {
            targetSection.scrollTop = 0;
        }, 100);
        
        console.log('✅ Navegação concluída para:', sectionId);
    } else {
        console.error('❌ Seção não encontrada:', sectionId);
    }
}

// Carregar dados específicos da seção
function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'dashboard-home':
        case 'dashboard':
            if (window.carregarDashboard) window.carregarDashboard();
            if (window.populateDashboard) window.populateDashboard();
            break;
            
        case 'funcionarios-section':
            if (window.carregarFuncionarios) window.carregarFuncionarios();
            break;
            
        case 'holerites-section':
            if (window.carregarHolerites) window.carregarHolerites();
            break;
            
        case 'relatórios-section':
            if (window.carregarRelatorios) window.carregarRelatorios();
            break;
    }
}

// Expor funções globalmente
window.pageFixManager = {
    navigateToSection: navigateToSection,
    showSection: showSection,
    hideSection: hideSection,
    fixDuplicatedSections: fixDuplicatedSections,
    ensureContentSeparation: ensureContentSeparation
};

// Função de debug
window.debugPageStructure = function() {
    console.log('=== 🔍 DEBUG ESTRUTURA DA PÁGINA ===');
    
    console.log('Seções encontradas:');
    document.querySelectorAll('.content-section').forEach(function(section, index) {
        console.log(`${index + 1}. ${section.id}:`, {
            active: section.classList.contains('active'),
            display: getComputedStyle(section).display,
            visibility: getComputedStyle(section).visibility,
            opacity: getComputedStyle(section).opacity
        });
    });
    
    console.log('Links de navegação:');
    document.querySelectorAll('.nav-link').forEach(function(link, index) {
        console.log(`${index + 1}.`, {
            href: link.getAttribute('href'),
            onclick: link.getAttribute('onclick'),
            active: link.classList.contains('active')
        });
    });
    
    console.log('IDs duplicaçãos:');
    const ids = {};
    const duplicates = [];
    document.querySelectorAll('[id]').forEach(function(element) {
        const id = element.id;
        if (ids[id]) {
            duplicates.push(id);
        } else {
            ids[id] = true;
        }
    });
    
    if (duplicates.length > 0) {
        console.warn('⚠️ IDs duplicaçãos:', duplicates);
    } else {
        console.log('✅ Nenhum ID duplicação');
    }
};