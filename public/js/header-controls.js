/**
 * Controles do Header - Dark Mode, Search, Notifications
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('[Header] Inicializando controles...');
    
    // ========== DARK MODE ==========
    const darkToggle = document.getElementById('darkmode-toggle');
    const headerEl = document.querySelector('.main-header');
    const bodyEl = document.body;
    
    // Aplicar preferência salva
    try { 
        if (localStorage.getItem('darkMode') === '1') {
            if (bodyEl) bodyEl.classList.add('dark-mode');
            if (headerEl) headerEl.classList.add('dark');
            console.log('[Header] Dark mode aplicado');
        }
    } catch(e) {
        console.error('[Header] Erro ao carregar dark mode:', e);
    }
    
    if (darkToggle) {
        darkToggle.addEventListener('click', function() {
            console.log('[Header] Toggle dark mode clicked');
            if (bodyEl) bodyEl.classList.toggle('dark-mode');
            if (headerEl) headerEl.classList.toggle('dark');
            
            try { 
                const isDark = bodyEl && bodyEl.classList.contains('dark-mode');
                localStorage.setItem('darkMode', isDark ? '1' : '0');
                console.log('[Header] Dark mode:', isDark ? 'ON' : 'OFF');
            } catch(e) {
                console.error('[Header] Erro ao salvar dark mode:', e);
            }
        });
        console.log('[Header] ✅ Dark mode toggle configurado');
    } else {
        console.warn('[Header] ⚠️ Botão dark mode não encontrado');
    }

    // ========== SEARCH ==========
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        const headerSearchContainer = document.getElementById('header-search-container');
        const headerSearchInput = document.getElementById('header-search-input');
        const headerSearchResults = document.getElementById('header-search-results');
        let searchOpen = false;

        function openHeaderSearch() {
            if (!headerSearchContainer) return;
            headerSearchContainer.setAttribute('aria-hidden','false');
            headerSearchContainer.classList.add('open');
            if (headerSearchInput) headerSearchInput.focus();
            searchOpen = true;
            console.log('[Header] Busca aberta');
        }

        function closeHeaderSearch() {
            if (!headerSearchContainer) return;
            headerSearchContainer.setAttribute('aria-hidden','true');
            headerSearchContainer.classList.remove('open');
            if (headerSearchInput) headerSearchInput.value = '';
            if (headerSearchResults) headerSearchResults.innerHTML = '';
            searchOpen = false;
            console.log('[Header] Busca fechada');
        }

        searchBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!searchOpen) openHeaderSearch(); else closeHeaderSearch();
        });

        // Fechar ao clicar fora
        document.addEventListener('click', function(e) {
            if (searchOpen && headerSearchContainer && 
                !headerSearchContainer.contains(e.target) && e.target !== searchBtn) {
                closeHeaderSearch();
            }
        });

        // Enter para buscar
        if (headerSearchInput) {
            headerSearchInput.addEventListener('keydown', async function(ev) {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    const q = headerSearchInput.value && headerSearchInput.value.trim();
                    if (!q) return;
                    
                    if (headerSearchResults) {
                        headerSearchResults.innerHTML = '<div class="search-loading">Buscando...</div>';
                    }
                    
                    try {
                        const r = await fetch('/api/financeiro/busca-global?q=' + encodeURIComponent(q), { 
                            credentials: 'include' 
                        });
                        
                        if (!r.ok) throw new Error('Erro na busca');
                        const json = await r.json();
                        
                        if (headerSearchResults) {
                            headerSearchResults.innerHTML = '';
                            (json.resultados || []).slice(0, 10).forEach(item => {
                                const div = document.createElement('div');
                                div.className = 'search-result-item';
                                div.textContent = (item.tipo ? item.tipo + ': ' : '') + 
                                                 (item.nome || item.número || item.valor || JSON.stringify(item));
                                headerSearchResults.appendChild(div);
                            });
                            
                            if ((json.resultados || []).length === 0) {
                                headerSearchResults.innerHTML = '<div class="search-no-results">Nenhum resultado encontrado</div>';
                            }
                        }
                    } catch (error) {
                        console.error('[Header] Erro na busca:', error);
                        if (headerSearchResults) {
                            headerSearchResults.innerHTML = '<div class="search-error">Erro ao buscar</div>';
                        }
                    }
                }
            });
        }
        
        console.log('[Header] ✅ Busca configurada');
    } else {
        console.warn('[Header] ⚠️ Botão de busca não encontrado');
    }

    // ========== NOTIFICATIONS ==========
    const notifBtn = document.getElementById('notifications-btn');
    if (notifBtn) {
        notifBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('[Header] Notificações clicked');
            // Verificar se o NotificationManager existe
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.togglePanel();
            } else {
                console.warn('[Header] NotificationManager não disponível');
            }
        });
        console.log('[Header] ✅ Notificações configuradas');
    } else {
        console.warn('[Header] ⚠️ Botão de notificações não encontrado');
    }

    // ========== PROFILE DROPDOWN ==========
    const profileBtn = document.querySelector('.user-profile-header');
    const profileDropdown = document.getElementById('user-dropdown');
    
    if (profileBtn && profileDropdown) {
        let dropdownOpen = false;
        
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownOpen = !dropdownOpen;
            profileDropdown.classList.toggle('show', dropdownOpen);
            console.log('[Header] Profile dropdown:', dropdownOpen ? 'ABERTO' : 'FECHADO');
        });
        
        // Fechar ao clicar fora
        document.addEventListener('click', function(e) {
            if (dropdownOpen && !profileDropdown.contains(e.target) && !profileBtn.contains(e.target)) {
                dropdownOpen = false;
                profileDropdown.classList.remove('show');
                console.log('[Header] Profile dropdown fechado (click fora)');
            }
        });
        
        console.log('[Header] ✅ Profile dropdown configurado');
    } else {
        console.warn('[Header] ⚠️ Profile dropdown não encontrado');
    }

    // ========== PROFILE MODAL ==========
    const profileOption = document.getElementById('profile-option');
    if (profileOption) {
        profileOption.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('[Header] Abrindo modal de perfil');
            
            // Usar função global do profile-modal.js
            if (typeof window.openProfileModal === 'function') {
                window.openProfileModal();
            } else {
                // Fallback se ainda não carregou
                const profileModal = document.getElementById('profile-modal');
                if (profileModal) {
                    profileModal.setAttribute('aria-hidden', 'false');
                    profileModal.style.display = 'flex';
                }
            }
            
            // Fechar dropdown
            if (profileDropdown) {
                profileDropdown.classList.remove('show');
            }
        });
        console.log('[Header] ✅ Profile modal configurado');
    }

    // ========== LOGOUT ==========
    const logoutOption = document.getElementById('logout-option');
    if (logoutOption) {
        logoutOption.addEventListener('click', async function(e) {
            e.preventDefault();
            console.log('[Header] 🚪 Logout iniciado');
            
            try {
                // Limpar cookie no servidor
                await fetch('/api/logout', { 
                    method: 'POST', 
                    credentials: 'include' 
                });
                console.log('[Header] ✅ Cookie limpo no servidor');
            } catch (error) {
                console.error('[Header] Erro ao fazer logout no servidor:', error);
            }
            
            // Limpar dados locais
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('userData');
            console.log('[Header] ✅ Dados locais limpos');
            
            // Redirecionar para login
            console.log('[Header] ↩️ Redirecionando para login...');
            window.location.href = '/login.html';
        });
        console.log('[Header] ✅ Logout configurado');
    } else {
        console.warn('[Header] ⚠️ Botão de logout não encontrado');
    }

    console.log('[Header] ✅ Todos os controles inicializados');
});
