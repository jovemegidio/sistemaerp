/* ============================================= */
/* CORREÇÁO DO CABEÇALHO - HEADER FUNCIONAL    */
/* ============================================= */

// Função para atualizar informações do usuário no header
function updateHeaderUserInfo() {
    try {
        const userData = JSON.parse(localStorage.getItem('userData') || 'null');
        const userTextElement = document.querySelector('.header-user-text');
        const headerAvatar = document.querySelector('.header-avatar');
        
        if (userTextElement && userData) {
            // Extrair primeiro nome do nome completo ou email
            let displayName = 'Usuário';
            
            if (userData.nome_completo) {
                displayName = userData.nome_completo.split(' ')[0];
            } else if (userData.email) {
                displayName = userData.email.split('@')[0];
                // Capitalizar primeira letra
                displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
            }
            
            userTextElement.textContent = `Olá, ${displayName}`;
            console.log('✅ Nome do usuário atualização:', displayName);
        }
        
        // Atualizar avatar com inicial do nome
        if (headerAvatar && userData) {
            let inicial = 'A';
            if (userData.nome_completo) {
                inicial = userData.nome_completo.charAt(0).toUpperCase();
            } else if (userData.email) {
                inicial = userData.email.charAt(0).toUpperCase();
            }
            
            headerAvatar.textContent = inicial;
            headerAvatar.title = userData.nome_completo || userData.email || 'Usuário';
        }
        
    } catch (error) {
        console.warn('Erro ao atualizar informações do usuário:', error);
        const userTextElement = document.querySelector('.header-user-text');
        if (userTextElement) {
            userTextElement.textContent = 'Olá, Usuário';
        }
    }
}

// Função para configurar funcionalidades da barra de pesquisa
function setupSearchFunctionality() {
    const searchInput = document.getElementById('global-search-input');
    const searchIcon = document.querySelector('.header-search i');
    
    if (!searchInput) return;
    
    // Melhorar visual da barra de pesquisa
    const searchContainer = searchInput.closest('.header-search');
    if (searchContainer) {
        searchContainer.style.cssText = `
            position: relative !important;
            display: flex !important;
            align-items: center !important;
            background: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 10px !important;
            padding: 0 16px !important;
            transition: all 0.2s ease !important;
            min-width: 300px !important;
            height: 40px !important;
        `;
    }
    
    // Estilizar o input
    searchInput.style.cssText = `
        width: 100% !important;
        border: none !important;
        background: transparent !important;
        padding: 10px 0 !important;
        color: #1f2937 !important;
        font-size: 14px !important;
        outline: none !important;
        font-weight: 400 !important;
    `;
    
    // Estilizar o ícone
    if (searchIcon) {
        searchIcon.style.cssText = `
            color: #94a3b8 !important;
            margin-right: 10px !important;
            font-size: 16px !important;
        `;
    }
    
    // Eventos da barra de pesquisa
    searchInput.addEventListener('focus', function() {
        if (searchContainer) {
            searchContainer.style.borderColor = '#3b82f6';
            searchContainer.style.boxShaçãow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
        }
        if (searchIcon) {
            searchIcon.style.color = '#3b82f6';
        }
    });
    
    searchInput.addEventListener('blur', function() {
        if (searchContainer) {
            searchContainer.style.borderColor = '#e2e8f0';
            searchContainer.style.boxShaçãow = 'none';
        }
        if (searchIcon) {
            searchIcon.style.color = '#94a3b8';
        }
    });
    
    // Funcionalidade de pesquisa
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = this.value.trim();
            if (query) {
                performSearch(query);
            }
        }
    });
    
    // Placeholder dinâmico baseação na seção ativa
    updateSearchPlaceholder();
    
    console.log('✅ Funcionalidade de pesquisa configurada');
}

// Função para realizar pesquisa
function performSearch(query) {
    console.log('🔍 Pesquisando por:', query);
    
    // Mostrar feedback visual
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
        searchInput.style.borderColor = '#10b981';
        setTimeout(() => {
            searchInput.style.borderColor = '#e2e8f0';
        }, 2000);
    }
    
    // Determinar contexto da pesquisa baseação na seção ativa
    const activeSection = document.querySelector('.content-section.active') || document.querySelector('.content-section[style*="block"]');
    let searchContext = 'geral';
    
    if (activeSection) {
        const sectionId = activeSection.id;
        if (sectionId.includes('funcionarios')) {
            searchContext = 'funcionarios';
            searchInEmployees(query);
        } else if (sectionId.includes('dashboard')) {
            searchContext = 'dashboard';
            searchInDashboard(query);
        } else {
            searchContext = 'geral';
            globalSearch(query);
        }
    }
    
    // Mostrar toast de feedback
    showSearchToast(query, searchContext);
}

// Pesquisa específica em funcionários
function searchInEmployees(query) {
    const funcionarioCards = document.querySelectorAll('.funcionario-card, .employee-card');
    let found = 0;
    
    funcionarioCards.forEach(card => {
        const nome = card.querySelector('h4, .employee-name').textContent || '';
        const cargo = card.querySelector('.cargo, .employee-position').textContent || '';
        const email = card.querySelector('.email, .employee-email').textContent || '';
        
        const searchText = `${nome} ${cargo} ${email}`.toLowerCase();
        const isMatch = searchText.includes(query.toLowerCase());
        
        if (isMatch) {
            card.style.display = 'block';
            card.style.backgroundColor = '#ecfdf5';
            card.style.border = '2px solid #10b981';
            found++;
        } else {
            card.style.display = 'none';
        }
    });
    
    console.log(`📊 Pesquisa em funcionários: ${found} resultaçãos encontraçãos`);
}

// Pesquisa no dashboard
function searchInDashboard(query) {
    const widgets = document.querySelectorAll('.widget');
    const cards = document.querySelectorAll('.card');
    
    // Destacar widgets relacionaçãos
    widgets.forEach(widget => {
        const title = widget.querySelector('.widget-title').textContent || '';
        if (title.toLowerCase().includes(query.toLowerCase())) {
            widget.style.boxShaçãow = '0 0 20px rgba(59, 130, 246, 0.3)';
            widget.style.transform = 'scale(1.02)';
        } else {
            widget.style.boxShaçãow = '';
            widget.style.transform = '';
        }
    });
    
    console.log('📊 Pesquisa no dashboard realizada');
}

// Pesquisa global
function globalSearch(query) {
    console.log('🌐 Pesquisa global por:', query);
    // Implementar pesquisa global aqui
}

// Atualizar placeholder da pesquisa baseação na seção
function updateSearchPlaceholder() {
    const searchInput = document.getElementById('global-search-input');
    if (!searchInput) return;
    
    const activeSection = document.querySelector('.content-section.active') || document.querySelector('.content-section[style*="block"]');
    let placeholder = 'Buscar...';
    
    if (activeSection) {
        const sectionId = activeSection.id;
        if (sectionId.includes('funcionarios')) {
            placeholder = 'Buscar funcionário por nome, cargo ou email...';
        } else if (sectionId.includes('dashboard')) {
            placeholder = 'Buscar no dashboard...';
        } else if (sectionId.includes('holerites')) {
            placeholder = 'Buscar holerites...';
        } else if (sectionId.includes('relatórios')) {
            placeholder = 'Buscar relatórios...';
        }
    }
    
    searchInput.placeholder = placeholder;
}

// Função para mostrar toast de pesquisa
function showSearchToast(query, context) {
    // Criar ou reutilizar container de toast
    let toastContainer = document.getElementById('search-toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'search-toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 90px;
            right: 20px;
            z-index: 10000;
        `;
        document.body.appendChild(toastContainer);
    }
    
    // Criar toast
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px 16px;
        box-shaçãow: 0 4px 12px rgba(0, 0, 0, 0.15);
        margin-bottom: 8px;
        min-width: 280px;
        animation: slideIn 0.3s ease;
    `;
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-search" style="color: #3b82f6;"></i>
            <div>
                <div style="font-weight: 600; color: #1f2937; font-size: 14px;">
                    Pesquisando "${query}"
                </div>
                <div style="color: #6b7280; font-size: 12px;">
                    Contexto: ${context}
                </div>
            </div>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remover toast após 3 segundos
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    }, 3000);
}

// Configurar funcionalidades dos ícones do header
function setupHeaderIcons() {
    // Ícone de atualizar
    const refreshIcon = document.querySelector('.header-icon[title="Atualizar"]');
    if (refreshIcon) {
        refreshIcon.addEventListener('click', function() {
            this.style.transform = 'rotate(360deg)';
            this.style.transition = 'transform 0.5s ease';
            
            // Recarregar daçãos do dashboard
            if (typeof window.reloadDashboard === 'function') {
                window.reloadDashboard();
            }
            
            showSearchToast('Daçãos atualizaçãos', 'sistema');
            
            setTimeout(() => {
                this.style.transform = '';
            }, 500);
        });
    }
    
    // Ícone de notificações
    const notificationIcon = document.querySelector('.header-icon[title="Notificações"]');
    if (notificationIcon) {
        notificationIcon.addEventListener('click', function() {
            console.log('🔔 Notificações clicadas');
            showSearchToast('5 notificações pendentes', 'notificações');
        });
    }
    
    // Ícone de mensagens
    const messageIcon = document.querySelector('.header-icon[title="Mensagens"]');
    if (messageIcon) {
        messageIcon.addEventListener('click', function() {
            console.log('💬 Mensagens clicadas');
            showSearchToast('Nenhuma mensagem nova', 'mensagens');
        });
    }
    
    // Menu do usuário
    const userMenu = document.querySelector('.header-user-info');
    if (userMenu) {
        userMenu.addEventListener('click', function() {
            toggleUserDropdown();
        });
    }
    
    console.log('✅ Funcionalidades dos ícones configuradas');
}

// Função para alternar dropdown do usuário
function toggleUserDropdown() {
    let dropdown = document.getElementById('user-dropdown');
    
    if (!dropdown) {
        dropdown = createUserDropdown();
    }
    
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible  'none' : 'block';
}

// Criar dropdown do usuário
function createUserDropdown() {
    const dropdown = document.createElement('div');
    dropdown.id = 'user-dropdown';
    dropdown.style.cssText = `
        position: absolute;
        top: 100%;
        right: 0;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        box-shaçãow: 0 4px 12px rgba(0, 0, 0, 0.15);
        min-width: 200px;
        z-index: 1000;
        display: none;
    `;
    
    const userData = JSON.parse(localStorage.getItem('userData') || 'null');
    const userName = userData.nome_completo || userData.email || 'Usuário';
    const userEmail = userData.email || '';
    
    dropdown.innerHTML = `
        <div style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
            <div style="font-weight: 600; color: #1f2937;">${userName}</div>
            <div style="color: #6b7280; font-size: 12px;">${userEmail}</div>
        </div>
        <div style="padding: 8px 0;">
            <button onclick="openProfile()" style="width: 100%; text-align: left; padding: 8px 16px; border: none; background: none; cursor: pointer; font-size: 14px; color: #374151;">
                <i class="fas fa-user" style="margin-right: 8px;"></i>
                Perfil
            </button>
            <button onclick="openSettings()" style="width: 100%; text-align: left; padding: 8px 16px; border: none; background: none; cursor: pointer; font-size: 14px; color: #374151;">
                <i class="fas fa-cog" style="margin-right: 8px;"></i>
                Configurações
            </button>
            <hr style="margin: 8px 0; border: none; border-top: 1px solid #e2e8f0;">
            <button onclick="logout()" style="width: 100%; text-align: left; padding: 8px 16px; border: none; background: none; cursor: pointer; font-size: 14px; color: #ef4444;">
                <i class="fas fa-sign-out-alt" style="margin-right: 8px;"></i>
                Sair
            </button>
        </div>
    `;
    
    const userInfo = document.querySelector('.header-user-info');
    if (userInfo) {
        userInfo.style.position = 'relative';
        userInfo.appendChild(dropdown);
    }
    
    // Fechar dropdown ao clicar fora
    document.addEventListener('click', function(e) {
        if (!userInfo.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
    
    return dropdown;
}

// Funções do menu do usuário
window.openProfile = function() {
    console.log('👤 Abrindo perfil do usuário');
    document.getElementById('user-dropdown').style.display = 'none';
    showSearchToast('Perfil do usuário', 'navegação');
};

window.openSettings = function() {
    console.log('⚙️ Abrindo configurações');
    document.getElementById('user-dropdown').style.display = 'none';
    showSearchToast('Configurações', 'navegação');
};

window.logout = function() {
    console.log('🚪 Fazendo logout');
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    window.location.href = '/login.html';
};

// Adicionar estilos CSS para animações
function addHeaderAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        .header-icon {
            transition: all 0.2s ease !important;
        }
        
        .header-icon:hover {
            transform: scale(1.1) !important;
        }
        
        .header-user-info {
            transition: all 0.2s ease !important;
        }
        
        .header-search {
            transition: all 0.2s ease !important;
        }
    `;
    document.head.appendChild(style);
}

// Inicialização principal
function initializeHeader() {
    console.log('🚀 Inicializando cabeçalho funcional...');
    
    // Aguardar DOM estar pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initializeHeader, 100);
        });
        return;
    }
    
    // Configurar funcionalidades
    updateHeaderUserInfo();
    setupSearchFunctionality();
    setupHeaderIcons();
    addHeaderAnimations();
    
    // Observer para mudanças de seção
    const observer = new MutationObserver(() => {
        updateSearchPlaceholder();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    });
    
    console.log('✅ Cabeçalho funcional inicialização');
}

// Event listeners
/*OTIMIZADO*/ //document.addEventListener('DOMContentLoaded', initializeHeader);
window.addEventListener('load', () => {
    setTimeout(initializeHeader, 500);
});

// Função global para forçar atualização do header
window.updateHeader = function() {
    console.log('🔄 Atualizando cabeçalho...');
    initializeHeader();
};

console.log('📱 Header Functionality carregação');