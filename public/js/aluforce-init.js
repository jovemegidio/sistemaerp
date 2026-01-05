// ============================================================
// INICIALIZAÇÃO OTIMIZADA DO INDEX.HTML
// Este arquivo substitui os múltiplos DOMContentLoaded
// ============================================================

(function() {
    'use strict';

    // ============================================================
    // 1. CONFIGURAÇÃO INICIAL
    // ============================================================
    
    const CONFIG = {
        cacheEnabled: true,
        cacheTTL: 300000, // 5 minutos
        authCheckInterval: 3600000, // 1 hora
        avatarFormats: ['webp', 'svg', 'jpg', 'png']
    };

    // ============================================================
    // 2. FUNÇÕES DE CACHE
    // ============================================================
    
    function getCachedUser() {
        if (!CONFIG.cacheEnabled) return null;
        
        try {
            const cached = localStorage.getItem('userData');
            const timestamp = localStorage.getItem('userData_timestamp');
            
            if (!cached || !timestamp) return null;
            
            const age = Date.now() - parseInt(timestamp);
            if (age > CONFIG.cacheTTL) {
                localStorage.removeItem('userData');
                localStorage.removeItem('userData_timestamp');
                return null;
            }
            
            return JSON.parse(cached);
        } catch (e) {
            console.warn('Erro ao ler cache:', e);
            return null;
        }
    }

    function setCachedUser(user) {
        try {
            localStorage.setItem('userData', JSON.stringify(user));
            localStorage.setItem('userData_timestamp', Date.now().toString());
        } catch (e) {
            console.warn('Erro ao salvar cache:', e);
        }
    }

    // ============================================================
    // 3. AUTENTICAÇÃO
    // ============================================================
    
    async function checkAuthentication() {
        // Verificar cache primeiro
        const cachedUser = getCachedUser();
        if (cachedUser) {
            console.log('✅ Usando dados do cache');
            return cachedUser;
        }

        // Buscar do servidor
        console.log('⏳ Buscando dados do servidor...');
        try {
            const response = await fetch('/api/me', { 
                credentials: 'include',
                cache: 'no-cache'
            });
            
            if (!response.ok) {
                throw new Error('Não autenticação');
            }
            
            const user = await response.json();
            setCachedUser(user);
            return user;
        } catch (error) {
            console.error('❌ Erro de autenticação:', error);
            // Limpar dados
            localStorage.removeItem('userData');
            localStorage.removeItem('userData_timestamp');
            localStorage.removeItem('authToken');
            sessionStorage.clear();
            // Redirecionar para login
            window.location.href = '/login.html';
            throw error;
        }
    }

    // ============================================================
    // 4. AVATAR
    // ============================================================
    
    function setupAvatar(firstName, email, avatarElement) {
        if (!avatarElement) return;
        
        // Iniciais como fallback
        const initials = firstName ? firstName.substring(0, 1).toUpperCase() : 'U';
        avatarElement.textContent = initials;
        
        // Determinar nome do arquivo
        let avatarFileName = firstName;
        
        if (email) {
            const emailUser = email.split('@')[0].toLowerCase();
            const emailMap = {
                'ti': 'TI',
                'tialuforce': 'TI',
                'antonio': 'Antonio',
                'clemerson': 'Clemerson',
                'isabela': 'Isabela',
                'thaina': 'Thaina',
                'thiago': 'Thiago',
                'nicolas': 'NicolasDaniel',
                'nicolasdaniel': 'NicolasDaniel',
                'admin': 'admin',
                'rh': 'Rh',
                'andreia': 'Andreia',
                'guilherme': 'Guilherme'
            };
            avatarFileName = emailMap[emailUser] || firstName;
        }
        
        // Tentar carregar avatar (otimização)
        tryLoadAvatar(avatarFileName, avatarElement, firstName);
    }

    function tryLoadAvatar(fileName, element, firstName) {
        let formatIndex = 0;
        
        function tryNext() {
            if (formatIndex >= CONFIG.avatarFormats.length) return;
            
            const format = CONFIG.avatarFormats[formatIndex];
            const path = `/avatars/${fileName}.${format}`;
            
            const img = new Image();
            img.onload = () => {
                element.innerHTML = `<img src="${path}" alt="${firstName}" 
                    style="width:100%;height:100%;border-radius:50%;object-fit:cover;" 
                    onerror="this.src='/avatars/default.webp';">`;
            };
            img.onerror = () => {
                formatIndex++;
                tryNext();
            };
            img.src = path;
        }
        
        tryNext();
    }

    // ============================================================
    // 5. UI UPDATE
    // ============================================================
    
    function updateUserUI(user) {
        if (!user) return;
        
        const nome = (user.nome || '').trim();
        const parts = nome.split(/\s+/).filter(Boolean);
        const firstName = parts[0] || 'Admin';
        const displayName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : firstName;
        
        // Atualizar saudação
        const greetingTitle = document.querySelector('.greeting-title');
        if (greetingTitle) {
            greetingTitle.textContent = `Olá, ${firstName}!`;
        }
        
        // Atualizar nome no header
        const userName = document.querySelector('.user-name');
        if (userName) {
            userName.textContent = firstName;
        }
        
        // Atualizar avatar
        const userAvatar = document.querySelector('.user-avatar-header');
        if (userAvatar) {
            setupAvatar(firstName, user.email, userAvatar);
        }
        
        // Atualizar dropdown
        const dropdownName = document.querySelector('.dropdown-user-name');
        const dropdownEmail = document.querySelector('.dropdown-user-email');
        if (dropdownName) dropdownName.textContent = firstName;
        if (dropdownEmail) dropdownEmail.textContent = user.email || '';
        
        // Aplicar permissões
        if (window.UserPermissions) {
            applyUserPermissions(firstName, user);
        }
        
        // Salvar último acesso
        try {
            const agora = new Date();
            user.last_login = agora.toLocaleString('pt-BR');
            setCachedUser(user);
        } catch (e) {
            console.warn('Erro ao salvar último acesso:', e);
        }
    }

    // ============================================================
    // 6. PERMISSÕES
    // ============================================================
    
    function applyUserPermissions(userName, user) {
        console.log('🔐 Aplicando permissões para:', userName);
        
        // Processar cards de módulos
        const cards = document.querySelectorAll('.module-card[data-area]');
        let visibleCount = 0;
        
        if (cards.length === 0) {
            console.warn('⚠️ Nenhum card encontrado! Verificando DOM...');
            return;
        }
        
        // Se não há sistema de permissões ou é admin, mostrar tudo
        if (!window.UserPermissions || user.role === 'admin' || user.is_admin) {
            console.log('✅ Admin detectado - mostrando todos os módulos');
            cards.forEach(card => {
                card.style.display = '';
                visibleCount++;
            });
            console.log(`✅ ${visibleCount}/${cards.length} módulos visíveis`);
            return;
        }
        
        // Aplicar permissões normais
        const userAreas = window.UserPermissions.getUserAreas(userName);
        console.log('📋 Áreas disponíveis:', userAreas);
        
        cards.forEach(card => {
            const area = card.getAttribute('data-area');
            if (!area) {
                card.style.display = '';
                visibleCount++;
                return;
            }
            
            const hasAccess = window.UserPermissions.hasAccess(userName, area);
            
            if (hasAccess) {
                card.style.display = '';
                visibleCount++;
                
                // Configurar URL especial para RH
                if (area === 'rh') {
                    const rhType = window.UserPermissions.getRHType(userName);
                    const rhURL = rhType === 'areaadm' ? '/modules/RH/public/areaadm.html' 
                        : '/modules/RH/public/funcionario.html';
                    card.href = rhURL;
                }
            } else {
                card.style.display = 'none';
            }
        });
        
        console.log(`✅ ${visibleCount}/${cards.length} módulos visíveis`);
    }

    // ============================================================
    // 7. DROPDOWN
    // ============================================================
    
    function initializeUserDropdown() {
        const userProfile = document.getElementById('user-profile');
        const userDropdown = document.getElementById('user-dropdown');
        
        if (!userProfile || !userDropdown) {
            console.warn('⚠️ Elementos do dropdown não encontrados');
            return;
        }
        
        userProfile.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });
        
        document.addEventListener('click', (e) => {
            if (!userProfile.contains(e.target)) {
                userDropdown.classList.remove('show');
            }
        });
        
        console.log('✅ Dropdown inicialização');
    }

    // ============================================================
    // 8. MODAL CONFIG
    // ============================================================
    
    function initConfigModal() {
        const modal = document.getElementById('modal-configuracoes');
        if (!modal) return;
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    if (modal.classList.contains('active')) {
                        if (typeof initConfigSearch === 'function') {
                            initConfigSearch();
                        }
                    }
                }
            });
        });
        
        observer.observe(modal, { attributes: true });
        console.log('✅ Modal config observer inicialização');
    }

    // ============================================================
    // 9. INICIALIZAÇÃO PRINCIPAL
    // ============================================================
    
    async function initialize() {
        console.log('🚀 Inicializando Aluforce Dashboard...');
        
        const perfMonitor = window.AluforcePerformance;
        if (perfMonitor) {
            perfMonitor.start('dashboard-init');
        }
        
        try {
            // 1. Mostrar dashboard IMEDIATAMENTE - REMOVER classe hidden
            const dashboard = document.getElementById('dashboard-area');
            if (dashboard) {
                dashboard.classList.remove('hidden');
                dashboard.style.display = 'flex';
                dashboard.style.visibility = 'visible';
                dashboard.style.opacity = '1';
            }
            
            // 2. Forçar exibição dos cards ANTES de verificar autenticação
            const cards = document.querySelectorAll('.module-card[data-area]');
            console.log(`📦 Forçando exibição de ${cards.length} cards...`);
            cards.forEach(card => {
                card.style.display = 'flex';
                card.style.visibility = 'visible';
                card.style.opacity = '1';
            });
            
            // 3. Verificar autenticação
            const user = await checkAuthentication();
            console.log('✅ Usuário autenticação:', user.nome);
            
            // 4. Atualizar UI
            updateUserUI(user);
            
            // 5. Aplicar permissões (mas não ocultar cards)
            const userName = (user.nome || '').trim().split(/\s+/)[0];
            if (user.role === 'admin' || user.is_admin) {
                console.log('👑 Admin - todos os módulos visíveis');
            } else {
                console.log('👤 Usuário regular:', userName);
                // Aplicar permissões sem ocultar
                if (window.UserPermissions) {
                    applyUserPermissions(userName, user);
                }
            }
            
            // 6. Inicializar componentes
            initializeUserDropdown();
            initConfigModal();
            
            // 7. Lazy load de imagens
            if (window.AluforceLazyLoader) {
                window.AluforceLazyLoader.observeAll();
            }
            
            console.log('✅ Dashboard inicialização com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
        } finally {
            if (perfMonitor) {
                perfMonitor.end('dashboard-init');
            }
        }
    }

    // ============================================================
    // 10. EXECUTAR
    // ============================================================
    
    function safeInitialize() {
        // Verificar se o dashboard existe no DOM
        const dashboard = document.getElementById('dashboard-area');
        if (!dashboard) {
            console.log('⏳ Aguardando DOM carregar...');
            setTimeout(safeInitialize, 50);
            return;
        }
        initialize();
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', safeInitialize);
    } else {
        // Usar setTimeout para garantir que o DOM foi totalmente parseação
        setTimeout(safeInitialize, 10);
    }

    // Exportar funções úteis
    window.AluforceApp = {
        refreshUser: checkAuthentication,
        updateUI: updateUserUI,
        getCachedUser: getCachedUser
    };

    console.log('✅ Aluforce App inicialização');
})();
