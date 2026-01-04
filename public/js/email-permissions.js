/**
 * Sistema de Controle de Acesso Baseado em Email
 * Define permissões específicas para cada usuário do sistema
 */

// Função para aplicar permissões aos módulos baseado em emails
function applyModulePermissions(user) {
    if (!user) {
        console.log('⚠️ Nenhum usuário fornecido para applyModulePermissions');
        return;
    }
    
    console.log('🔐 ==========================================');
    console.log('🔐 SISTEMA DE PERMISSÕES POR EMAIL - INICIADO');
    console.log('🔐 ==========================================');
    console.log('🔐 DEBUG - Dados do usuário:', user);
    
    const userEmail = (user.email || '').toLowerCase().trim();
    console.log('📧 Email do usuário:', userEmail);
    
    // Definir permissões por email
    const emailPermissions = {
        // ACESSO TOTAL (TI)
        'ti@aluforce.ind.br': ['compras', 'vendas', 'nfe', 'pcp', 'financeiro', 'rh'],
        'andreia@aluforce.ind.br': ['compras', 'vendas', 'nfe', 'pcp', 'financeiro', 'rh'],
        'douglas@aluforce.ind.br': ['compras', 'vendas', 'nfe', 'pcp', 'financeiro', 'rh'],
        
        // ADMINISTRATIVO
        'clemerson.silva@aluforce.ind.br': ['pcp', 'vendas', 'rh-funcionario'],
        'eldir@aluforce.ind.br': ['financeiro-receber', 'rh-funcionario'],
        'hellen@aluforce.ind.br': ['financeiro-pagar', 'rh-funcionario'],
        'thiago@aluforce.ind.br': ['nfe', 'rh-funcionario'],
        'guilherme@aluforce.ind.br': ['compras', 'rh-funcionario'],
        'marcia@aluforce.ind.br': ['vendas', 'rh-funcionario'],
        'fabiano@aluforce.ind.br': ['vendas', 'rh-funcionario'],
        'fabiola@aluforce.ind.br': ['vendas', 'rh-funcionario'],
        'renata@aluforce.ind.br': ['vendas', 'rh-funcionario'],
        'augusto@aluforce.ind.br': ['vendas', 'rh-funcionario'],
        'isabela@aluforce.ind.br': ['rh-funcionario'],
        'recursos humanos@aluforce.ind.br': ['rh-admin'],
        'recursoshumanos@aluforce.ind.br': ['rh-admin']
    };
    
    // Obter permissões do usuário
    let allowedAreas = emailPermissions[userEmail];
    
    // Se não encontrou permissões específicas, usuário comum tem acesso apenas ao RH funcionário
    if (!allowedAreas) {
        console.log('👤 Usuário comum - acesso apenas RH Funcionário');
        allowedAreas = ['rh-funcionario'];
    }
    
    console.log('✅ Permissões atribuídas:', allowedAreas);
    
    // Mapear módulos e suas permissões necessárias (inclui seletores premium)
    const modulePermissions = {
        '.compras-card': ['compras'],
        '.compras-card-premium': ['compras'],
        '.vendas-card': ['vendas'],
        '.vendas-card-premium': ['vendas'],
        '.nfe-card': ['nfe'],
        '.nfe-card-premium': ['nfe'],
        '.pcp-card': ['pcp'],
        '.pcp-card-premium': ['pcp'],
        '.financeiro-card': ['financeiro', 'financeiro-receber', 'financeiro-pagar'],
        '.financeiro-card-premium': ['financeiro', 'financeiro-receber', 'financeiro-pagar'],
        '.rh-card': ['rh', 'rh-admin', 'rh-funcionario'],
        '.rh-card-premium': ['rh', 'rh-admin', 'rh-funcionario']
    };
    
    // PRIMEIRO: Ocultar TODOS os cards e remover permissões
    console.log('🔒 Ocultando todos os módulos...');
    Object.keys(modulePermissions).forEach(selector => {
        const card = document.querySelector(selector);
        if (card) {
            card.classList.remove('allowed');
            card.style.display = 'none';
            card.style.opacity = '0';
            card.style.pointerEvents = 'none';
            card.style.visibility = 'hidden';
            // Bloquear cliques
            card.addEventListener('click', function(e) {
                if (!this.classList.contains('allowed')) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }, true);
        }
    });
    
    // SEGUNDO: Mostrar apenas os permitidos
    let visibleCount = 0;
    for (const [selector, requiredPermissions] of Object.entries(modulePermissions)) {
        const moduleCard = document.querySelector(selector);
        if (moduleCard) {
            // Verifica se o usuário tem alguma das permissões necessárias
            const hasAccess = requiredPermissions.some(perm => allowedAreas.includes(perm));
            
            const moduleName = selector.replace('.', '').replace('-card', '');
            console.log(`🔍 Módulo ${moduleName}: ${hasAccess ? '✅ PERMITIDO' : '❌ BLOQUEADO'}`);
            
            if (hasAccess) {
                moduleCard.classList.add('allowed');
                moduleCard.style.display = 'flex';
                moduleCard.style.opacity = '1';
                moduleCard.style.pointerEvents = 'auto';
                moduleCard.style.visibility = 'visible';
                visibleCount++;
                
                // Configurar redirecionamento específico para RH
                if (selector === '.rh-card' || selector === '.rh-card-premium') {
                    if (allowedAreas.includes('rh-admin')) {
                        moduleCard.href = '/modules/RH/index.html';
                        console.log('🔗 RH: Redirecionamento para Admin');
                    } else if (allowedAreas.includes('rh-funcionario')) {
                        moduleCard.href = '/RH/funcionario.html';
                        console.log('🔗 RH: Redirecionamento para Funcionário');
                    } else {
                        moduleCard.href = '/modules/RH/index.html';
                    }
                }
                
                // Configurar redirecionamento específico para Financeiro
                if (selector === '.financeiro-card' || selector === '.financeiro-card-premium') {
                    if (allowedAreas.includes('financeiro-receber')) {
                        // Adicionar parâmetro de página inicial
                        moduleCard.href = '/modules/Financeiro/index.html?view=receber';
                        console.log('🔗 Financeiro: Redirecionamento para Contas a Receber');
                    } else if (allowedAreas.includes('financeiro-pagar')) {
                        moduleCard.href = '/modules/Financeiro/index.html?view=pagar';
                        console.log('🔗 Financeiro: Redirecionamento para Contas a Pagar');
                    }
                }
            } else {
                moduleCard.classList.remove('allowed');
                moduleCard.style.display = 'none';
                moduleCard.style.opacity = '0';
                moduleCard.style.pointerEvents = 'none';
                moduleCard.style.visibility = 'hidden';
                // Remover href para prevenir navegação
                if (moduleCard.tagName === 'A') {
                    moduleCard.removeAttribute('href');
                }
            }
        }
    }
    
    console.log(`✅ Total de módulos visíveis: ${visibleCount}/${Object.keys(modulePermissions).length}`);
    
    // Se nenhum módulo ficou visível, mostrar mensagem
    if (visibleCount === 0) {
        console.warn('⚠️ Nenhum módulo disponível para este usuário');
    }
    
    // Controlar visibilidade do botão de configurações
    applyAdminPermissions(userEmail, allowedAreas);
}

// Função para controlar elementos de admin (botão de configurações, etc)
function applyAdminPermissions(userEmail, allowedAreas) {
    // Apenas emails de TI tem acesso a configurações
    const adminEmails = [
        'ti@aluforce.ind.br',
        'andreia@aluforce.ind.br',
        'douglas@aluforce.ind.br'
    ];
    
    const isAdmin = adminEmails.includes(userEmail);
    console.log(`🔧 Controle de Admin: ${isAdmin ? 'PERMITIDO' : 'BLOQUEADO'} para ${userEmail}`);
    
    // Controlar botão de configurações
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        if (isAdmin) {
            settingsBtn.style.display = '';
            settingsBtn.removeAttribute('aria-hidden');
            console.log('✅ Botão de configurações exibido');
        } else {
            settingsBtn.style.display = 'none';
            settingsBtn.setAttribute('aria-hidden', 'true');
            console.log('❌ Botão de configurações ocultado');
        }
    }
    
    // Controlar todas as opções com data-admin-only
    const adminOnlyElements = document.querySelectorAll('[data-admin-only="true"]');
    adminOnlyElements.forEach(element => {
        if (isAdmin) {
            element.style.display = '';
            element.removeAttribute('aria-hidden');
        } else {
            element.style.display = 'none';
            element.setAttribute('aria-hidden', 'true');
            element.style.pointerEvents = 'none';
        }
    });
    
    // Armazenar status de admin globalmente
    window.isUserAdmin = isAdmin;
    
    // Dispatch evento para outros componentes
    window.dispatchEvent(new CustomEvent('admin-permissions-loaded', {
        detail: { isAdmin, userEmail }
    }));
}

// Disponibilizar funções globalmente
window.applyModulePermissions = applyModulePermissions;
window.applyAdminPermissions = applyAdminPermissions;
