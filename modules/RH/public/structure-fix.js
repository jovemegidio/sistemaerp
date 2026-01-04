/* ================================================= */
/* CORREÇÁO ESTRUTURAL JAVASCRIPT                   */
/* ================================================= */

(function() {
    'use strict';

    // Aguardar DOM completamente carregação
    document.addEventListener('DOMContentLoaded', function() {
        initSectionFixes();
    });

    // Função principal de correções
    function initSectionFixes() {
        console.log('🔧 Iniciando correções estruturais...');

        // Remover seções duplicadas
        removeDuplicateSections();
        
        // Garantir que apenas uma seção esteja ativa
        ensureSingleActiveSection();
        
        // Corrigir navegação
        fixNavigation();
        
        // Corrigir IDs duplicaçãos
        fixDuplicateIds();

        console.log('✅ Correções estruturais aplicadas');
    }

    // Remove seções duplicadas
    function removeDuplicateSections() {
        const sectionIds = {};
        const sectionsToRemove = [];

        document.querySelectorAll('.content-section').forEach(function(section) {
            const id = section.id;
            if (id && sectionIds[id]) {
                // Está é uma seção duplicada
                console.warn('🚨 Seção duplicada encontrada:', id);
                sectionsToRemove.push(section);
            } else if (id) {
                sectionIds[id] = true;
            }
        });

        // Remover seções duplicadas
        sectionsToRemove.forEach(function(section) {
            console.log('🗑️ Removendo seção duplicada:', section.id);
            section.remove();
        });
    }

    // Garantir que apenas uma seção esteja ativa
    function ensureSingleActiveSection() {
        const sections = document.querySelectorAll('.content-section');
        let activeSection = null;
        let activeSections = [];

        // Encontrar seções ativas
        sections.forEach(function(section) {
            if (section.classList.contains('active') || section.style.display === 'block') {
                activeSections.push(section);
            }
        });

        // Se há mais de uma seção ativa, manter apenas a primeira
        if (activeSections.length > 1) {
            console.warn('🚨 Múltiplas seções ativas encontradas, corrigindo...');
            activeSection = activeSections[0];
            
            // Desativar todas as outras
            activeSections.slice(1).forEach(function(section) {
                hideSection(section);
            });
        } else if (activeSections.length === 1) {
            activeSection = activeSections[0];
        }

        // Se não há seção ativa, ativar o dashboard
        if (!activeSection) {
            activeSection = document.getElementById('dashboard-home') || 
                           document.getElementById('dashboard');
            
            if (activeSection) {
                showSection(activeSection);
                console.log('✅ Dashboard definido como seção ativa padrão');
            }
        }

        // Garantir que todas as outras seções estejam ocultas
        sections.forEach(function(section) {
            if (section !== activeSection) {
                hideSection(section);
            }
        });
    }

    // Mostrar uma seção
    function showSection(section) {
        section.classList.add('active');
        section.style.display = 'block';
        section.style.visibility = 'visible';
        section.style.opacity = '1';
    }

    // Ocultar uma seção
    function hideSection(section) {
        section.classList.remove('active');
        section.style.display = 'none';
        section.style.visibility = 'hidden';
        section.style.opacity = '0';
    }

    // Corrigir navegação para evitar conflitos
    function fixNavigation() {
        document.querySelectorAll('.nav-link').forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                // Obter ID da seção target
                const href = link.getAttribute('href');
                const targetId = href ? href.replace('#', '') : null;
                
                if (targetId) {
                    navigateToSection(targetId);
                }
            });
        });
    }

    // Navegar para uma seção específica
    function navigateToSection(sectionId) {
        console.log('🧭 Navegando para seção:', sectionId);

        // Ocultar todas as seções
        document.querySelectorAll('.content-section').forEach(function(section) {
            hideSection(section);
        });

        // Mostrar seção target
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            showSection(targetSection);

            // Atualizar navegação ativa
            document.querySelectorAll('.nav-link').forEach(function(link) {
                link.classList.remove('active');
            });

            const activeLink = document.querySelector(`[href="#${sectionId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }

            // Chamar funções de carregamento específicas se existirem
            if (window.omieLayout && window.omieLayout.loadSectionData) {
                window.omieLayout.loadSectionData(sectionId);
            }

            console.log('✅ Navegação para', sectionId, 'concluída');
        } else {
            console.error('❌ Seção não encontrada:', sectionId);
        }
    }

    // Corrigir IDs duplicaçãos
    function fixDuplicateIds() {
        const ids = {};
        const elementsToFix = [];

        document.querySelectorAll('[id]').forEach(function(element) {
            const id = element.id;
            if (ids[id]) {
                elementsToFix.push(element);
            } else {
                ids[id] = true;
            }
        });

        elementsToFix.forEach(function(element, index) {
            const oldId = element.id;
            const newId = oldId + '_duplicate_' + (index + 1);
            element.id = newId;
            console.warn('🔧 ID duplicação corrigido:', oldId, '→', newId);
        });
    }

    // Expor funções globalmente
    window.structureFix = {
        navigateToSection: navigateToSection,
        showSection: showSection,
        hideSection: hideSection,
        removeDuplicateSections: removeDuplicateSections,
        ensureSingleActiveSection: ensureSingleActiveSection
    };

    // Debug function
    window.debugStructure = function() {
        console.log('=== 🔍 DEBUG ESTRUTURAL ===');
        
        const sections = document.querySelectorAll('.content-section');
        console.log('Total de seções:', sections.length);
        
        const activeSections = document.querySelectorAll('.content-section.active');
        console.log('Seções ativas:', activeSections.length);
        
        sections.forEach(function(section, index) {
            console.log(`Seção ${index + 1}:`, {
                id: section.id,
                active: section.classList.contains('active'),
                display: section.style.display || 'default',
                visibility: section.style.visibility || 'default'
            });
        });

        const duplicateIds = [];
        const ids = {};
        document.querySelectorAll('[id]').forEach(function(element) {
            const id = element.id;
            if (ids[id]) {
                duplicateIds.push(id);
            } else {
                ids[id] = true;
            }
        });

        if (duplicateIds.length > 0) {
            console.warn('IDs duplicaçãos encontrados:', duplicateIds);
        } else {
            console.log('✅ Nenhum ID duplicação encontrado');
        }
    };

})();