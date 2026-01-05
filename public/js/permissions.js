// Sistema de Permissões por Usuário - Aluforce
// Define quais áreas cada usuário pode acessar

const userPermissions = {
    // ============ ADMINISTRAÇÁO / TI ============
    // Douglas, Andreia, TI, RH - Acesso geral a todas as áreas
    'douglas': {
        areas: ['vendas', 'rh', 'pcp', 'financeiro', 'nfe', 'compras', 'ti'],
        rhType: 'areaadm',
        isAdmin: true
    },
    'andreia': {
        areas: ['vendas', 'rh', 'pcp', 'financeiro', 'nfe', 'compras', 'ti'],
        rhType: 'areaadm',
        isAdmin: true
    },
    'ti': {
        areas: ['vendas', 'rh', 'pcp', 'financeiro', 'nfe', 'compras', 'ti'],
        rhType: 'areaadm',
        isAdmin: true
    },
    'antonio': {
        areas: ['vendas', 'rh', 'pcp', 'financeiro', 'nfe', 'compras', 'ti'],
        rhType: 'areaadm',
        isAdmin: true
    },
    'rh': {
        areas: ['vendas', 'rh', 'pcp', 'financeiro', 'nfe', 'compras', 'ti'],
        rhType: 'areaadm',
        isAdmin: true
    },

    // ============ GESTÁO ============
    // Clemerson - RH (area.html), PCP e Vendas
    'clemerson': {
        areas: ['pcp', 'rh', 'vendas'],
        rhType: 'area'
    },

    // Thiago Scarcella - Compras, NF-e, Vendas, PCP, Financeiro, RH (area.html)
    'thiago': {
        areas: ['compras', 'nfe', 'vendas', 'pcp', 'financeiro', 'rh'],
        rhType: 'area'
    },
    'thiagoscarcella': {
        areas: ['compras', 'nfe', 'vendas', 'pcp', 'financeiro', 'rh'],
        rhType: 'area'
    },
    'scarcella': {
        areas: ['compras', 'nfe', 'vendas', 'pcp', 'financeiro', 'rh'],
        rhType: 'area'
    },

    // Guilherme - PCP, RH (area.html), Vendas, Compras
    'guilherme': {
        areas: ['pcp', 'rh', 'vendas', 'compras'],
        rhType: 'area'
    },

    // ============ FINANCEIRO ============
    // Junior e Hellen - Financeiro, RH (area.html), Vendas, NF-e
    'junior': {
        areas: ['financeiro', 'rh', 'vendas', 'nfe'],
        rhType: 'area'
    },
    'hellen': {
        areas: ['financeiro', 'rh', 'vendas', 'nfe'],
        rhType: 'area'
    },

    // ============ EQUIPE COMERCIAL ============
    // Ariel, Thaina, Augusto, Marcia, Fabiano, Fabiola, Renata - RH (area.html) e Vendas
    'ariel': {
        areas: ['rh', 'vendas'],
        rhType: 'area'
    },
    'thaina': {
        areas: ['rh', 'vendas'],
        rhType: 'area'
    },
    'augusto': {
        areas: ['rh', 'vendas'],
        rhType: 'area'
    },
    'marcia': {
        areas: ['rh', 'vendas'],
        rhType: 'area'
    },
    'fabiano': {
        areas: ['rh', 'vendas'],
        rhType: 'area'
    },
    'fabiola': {
        areas: ['rh', 'vendas'],
        rhType: 'area'
    },
    'renata': {
        areas: ['rh', 'vendas'],
        rhType: 'area'
    },

    // Outros membros comerciais (mantidos por compatibilidade)
    'nicolas': {
        areas: ['rh', 'vendas'],
        rhType: 'area'
    },
    'lais': {
        areas: ['rh', 'vendas'],
        rhType: 'area'
    },
    'marcos': {
        areas: ['rh', 'vendas'],
        rhType: 'area'
    },
    'isabela': {
        areas: ['rh', 'vendas'],
        rhType: 'area'
    },
    'nicolasdaniel': {
        areas: ['rh', 'vendas'],
        rhType: 'area'
    }
};

// Função para verificar se o usuário tem acesso a uma área específica
function hasAccess(userName, area) {
    if (!userName) return false;
    
    const userKey = userName.toLowerCase().trim();
    const userPerms = userPermissions[userKey];
    
    if (!userPerms) {
        // Usuários não listaçãos têm acesso apenas ao RH (área básica)
        return area === 'rh';
    }
    
    return userPerms.areas.includes(area.toLowerCase());
}

// Função para obter o tipo de RH que o usuário deve acessar
function getRHType(userName) {
    if (!userName) return 'area';
    
    const userKey = userName.toLowerCase().trim();
    const userPerms = userPermissions[userKey];
    
    return userPerms ? userPerms.rhType : 'area';
}

// Função para obter todas as áreas do usuário
function getUserAreas(userName) {
    if (!userName) return ['rh'];
    
    const userKey = userName.toLowerCase().trim();
    const userPerms = userPermissions[userKey];
    
    return userPerms ? userPerms.areas : ['rh'];
}

// Função para verificar se o usuário é admin
function isAdmin(userName) {
    if (!userName) return false;
    
    const userKey = userName.toLowerCase().trim();
    const userPerms = userPermissions[userKey];
    
    // Verifica se tem a flag isAdmin ou se está na lista de admins
    if (userPerms && userPerms.isAdmin) return true;
    
    const adminUsers = ['douglas', 'andreia', 'ti', 'rh'];
    return adminUsers.includes(userKey);
}

// Mapeamento de áreas para URLs
const areaURLs = {
    'pcp': '/modules/PCP/index.html',
    'vendas': '/modules/Vendas/index.html',
    'financeiro': '/modules/Financeiro/financeiro.html',
    'nfe': '/modules/NFe/nfe.html',
    'compras': '/modules/Compras/compras.html',
    'rh': '/modules/RH/area.html',
    'ti': '/TI/ti.html'
};

// Função para obter URL da área baseada no tipo de RH
function getAreaURL(area, userName) {
    if (area === 'rh') {
        const rhType = getRHType(userName);
        return rhType === 'areaadm' ? 'RH/areaadm.html' : 'RH/area.html';
    }
    
    return areaURLs[area] || '#';
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.UserPermissions = {
        hasAccess,
        getRHType,
        getUserAreas,
        isAdmin,
        getAreaURL,
        userPermissions
    };
}

// Exportar para Node.js se aplicável
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        hasAccess,
        getRHType,
        getUserAreas,
        isAdmin,
        getAreaURL,
        userPermissions
    };
}