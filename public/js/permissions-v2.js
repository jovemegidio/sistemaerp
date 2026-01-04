// Sistema de Permissões Automático por Departamento - Aluforce v2.0
// Última atualização: 02/12/2025

// ═══════════════════════════════════════════════════════════════
// MAPEAMENTO DE MÓDULOS POR DEPARTAMENTO
// ═══════════════════════════════════════════════════════════════

const modulosPorDepartamento = {
    // Diretoria - Acesso Total
    'Diretoria': {
        modulos: ['vendas', 'pcp', 'financeiro', 'nfe', 'compras', 'rh'],
        rhType: 'areaadm',
        isAdmin: true
    },
    'Diretoria / Comercial': {
        modulos: ['vendas', 'pcp', 'financeiro', 'nfe', 'compras', 'rh'],
        rhType: 'areaadm',
        isAdmin: true
    },

    // T.I - Acesso Total
    'T.I': {
        modulos: ['vendas', 'pcp', 'financeiro', 'nfe', 'compras', 'rh'],
        rhType: 'areaadm',
        isAdmin: true
    },

    // RH - Acesso Amplo
    'RH': {
        modulos: ['rh', 'vendas', 'financeiro'],
        rhType: 'areaadm',
        isAdmin: false
    },

    // Comercial/Vendas
    'Comercial': {
        modulos: ['vendas', 'rh'],
        rhType: 'area',
        isAdmin: false
    },

    // Financeiro
    'Financeiro': {
        modulos: ['financeiro', 'vendas', 'nfe', 'rh'],
        rhType: 'area',
        isAdmin: false
    },

    // Produção
    'Produção': {
        modulos: ['pcp', 'rh'],
        rhType: 'area',
        isAdmin: false
    },

    // Conservação
    'Conservação': {
        modulos: ['rh'],
        rhType: 'area',
        isAdmin: false
    },

    // Compras (quando implementação)
    'Compras': {
        modulos: ['compras', 'pcp', 'rh'],
        rhType: 'area',
        isAdmin: false
    },

    // Logística (quando implementação)
    'Logística': {
        modulos: ['compras', 'pcp', 'rh', 'vendas'],
        rhType: 'area',
        isAdmin: false
    }
};

// ═══════════════════════════════════════════════════════════════
// FUNÇÕES DE VERIFICAÇÉO DE PERMISSÕES
// ═══════════════════════════════════════════════════════════════

/**
 * Obtém permissões baseadas no departamento do usuário
 * @param {Object} user - Objeto do usuário com departamento
 * @returns {Object} - Objeto com modulos, rhType e isAdmin
 */
function getPermissoesPorDepartamento(user) {
    if (!user) {
        return { modulos: ['rh'], rhType: 'area', isAdmin: false };
    }

    // Verificar se é admin pelo role ou is_admin
    const isAdminRole = user.role === 'admin' || 
                       user.is_admin === 1 || 
                       user.is_admin === true ||
                       user.is_admin === '1';

    // Se for admin, dar acesso total
    if (isAdminRole) {
        return {
            modulos: ['vendas', 'pcp', 'financeiro', 'nfe', 'compras', 'rh'],
            rhType: 'areaadm',
            isAdmin: true
        };
    }

    // Buscar permissões pelo departamento
    const departamento = user.departamento || user.setor || '';
    const permissoes = modulosPorDepartamento[departamento];

    if (permissoes) {
        return permissoes;
    }

    // Permissão padrão para departamentos não mapeaçãos
    console.log(`⚠️ Departamento não mapeação: ${departamento}. Usando permissões padrão.`);
    return {
        modulos: ['rh'],
        rhType: 'area',
        isAdmin: false
    };
}

/**
 * Verifica se o usuário tem acesso a um módulo específico
 * @param {Object} user - Objeto do usuário
 * @param {string} modulo - Nome do módulo (vendas, pcp, financeiro, etc)
 * @returns {boolean}
 */
function hasAccess(user, modulo) {
    if (!user || !modulo) return false;

    const permissoes = getPermissoesPorDepartamento(user);
    return permissoes.modulos.includes(modulo.toLowerCase());
}

/**
 * Obtém o tipo de RH que o usuário deve acessar
 * @param {Object} user - Objeto do usuário
 * @returns {string} - 'area' ou 'areaadm'
 */
function getRHType(user) {
    const permissoes = getPermissoesPorDepartamento(user);
    return permissoes.rhType;
}

/**
 * Obtém todos os módulos disponíveis para o usuário
 * @param {Object} user - Objeto do usuário
 * @returns {Array} - Array com nomes dos módulos
 */
function getUserModulos(user) {
    const permissoes = getPermissoesPorDepartamento(user);
    return permissoes.modulos;
}

/**
 * Verifica se o usuário é admin
 * @param {Object} user - Objeto do usuário
 * @returns {boolean}
 */
function isAdmin(user) {
    const permissoes = getPermissoesPorDepartamento(user);
    return permissoes.isAdmin;
}

// ═══════════════════════════════════════════════════════════════
// MAPEAMENTO DE URLS
// ═══════════════════════════════════════════════════════════════

const areaURLs = {
    'pcp': '/PCP/index.html',
    'vendas': '/Vendas/vendas.html',
    'financeiro': '/Financeiro/financeiro.html',
    'nfe': '/NFe/nfe.html',
    'compras': '/Compras/compras.html',
    'rh': '/RH/area.html'
};

/**
 * Obtém URL do módulo baseação no tipo de RH do usuário
 * @param {string} modulo - Nome do módulo
 * @param {Object} user - Objeto do usuário
 * @returns {string} - URL do módulo
 */
function getModuloURL(modulo, user) {
    if (modulo === 'rh') {
        const rhType = getRHType(user);
        return rhType === 'areaadm'  '/RH/areaadm.html' : '/RH/area.html';
    }
    
    return areaURLs[modulo] || '#';
}

// ═══════════════════════════════════════════════════════════════
// FUNÇÉO DE APLICAÇÉO DE PERMISSÕES NO DOM
// ═══════════════════════════════════════════════════════════════

/**
 * Aplica permissões aos cards de módulos no dashboard
 * @param {Object} user - Objeto do usuário
 */
function aplicarPermissoesDOM(user) {
    if (!user) {
        console.error('❌ Nenhum usuário fornecido para aplicar permissões');
        return;
    }

    console.log('🔐 Aplicando permissões para:', user.nome || user.email);
    console.log('📍 Departamento:', user.departamento || user.setor || 'N/A');

    const permissoes = getPermissoesPorDepartamento(user);
    console.log('✅ Módulos permitidos:', permissoes.modulos);
    console.log('👤 Tipo RH:', permissoes.rhType);
    console.log('🔒 Admin:', permissoes.isAdmin);

    // Obter todos os cards de módulos
    const moduleCards = document.querySelectorAll('[data-module]');

    moduleCards.forEach(card => {
        const moduleName = card.getAttribute('data-module');
        
        if (permissoes.modulos.includes(moduleName)) {
            // Módulo permitido - mostrar
            card.style.display = '';
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
            console.log(`  ✅ ${moduleName.toUpperCase()}: LIBERADO`);
        } else {
            // Módulo não permitido - ocultar
            card.style.display = 'none';
            console.log(`  ❌ ${moduleName.toUpperCase()}: BLOQUEADO`);
        }
    });

    // Atualizar link do RH baseação no tipo
    const rhCard = document.querySelector('[data-module="rh"]');
    if (rhCard) {
        const rhLink = rhCard.querySelector('a');
        if (rhLink) {
            rhLink.href = getModuloURL('rh', user);
        }
    }

    console.log('═══════════════════════════════════════════════════════════════');
}

// ═══════════════════════════════════════════════════════════════
// EXPORTAÇÉO GLOBAL
// ═══════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
    window.PermissoesAluforce = {
        getPermissoesPorDepartamento,
        hasAccess,
        getRHType,
        getUserModulos,
        isAdmin,
        getModuloURL,
        aplicarPermissoesDOM,
        modulosPorDepartamento
    };
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getPermissoesPorDepartamento,
        hasAccess,
        getRHType,
        getUserModulos,
        isAdmin,
        getModuloURL,
        aplicarPermissoesDOM,
        modulosPorDepartamento
    };
}
