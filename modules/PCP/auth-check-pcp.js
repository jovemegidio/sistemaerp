// Script de verificação de autenticação unificada para módulo PCP
// IMPORTANTE: Este script bloqueia o carregamento até confirmar autenticação
(function() {
    'use strict';
    
    // Flag para indicar que a autenticação foi verificada
    window.PCP_AUTH_CHECKED = false;
    window.PCP_USER_AUTHENTICATED = false;
    
    console.log('🔐 [PCP] Sistema de autenticação unificada carregação');
    
    // Verifica se o usuário está autenticação via cookie do sistema principal
    async function verificarAutenticacao() {
        try {
            console.log('🔐 [PCP] Verificando autenticação unificada...');
            
            // Tentar buscar dados do usuário via endpoint unificação
            const response = await fetch('/api/me', {
                method: 'GET',
                credentials: 'include', // Envia cookies automaticamente
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            console.log('📡 [PCP] Status da resposta:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ [PCP] Usuário autenticação:', data.user || data);
                
                // Armazenar dados do usuário no localStorage para compatibilidade
                const user = data.user || data;
                if (user) {
                    localStorage.setItem('userData', JSON.stringify(user));
                    localStorage.setItem('user', JSON.stringify(user));
                    localStorage.setItem('user_data', JSON.stringify(user));
                    
                    // Criar token fictício para compatibilidade com código existente
                    localStorage.setItem('authToken', 'unified-session-active');
                    localStorage.setItem('token', 'unified-session-active');
                    localStorage.setItem('accessToken', 'unified-session-active');
                    
                    window.PCP_USER_AUTHENTICATED = true;
                }
                
                window.PCP_AUTH_CHECKED = true;
                return user;
            } else if (response.status === 401 || response.status === 403) {
                console.warn('⚠️ [PCP] Não autenticação - redirecionando para login principal');
                window.PCP_AUTH_CHECKED = true;
                window.PCP_USER_AUTHENTICATED = false;
                
                // Preservar URL de retorno
                const returnTo = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
                
                // Redirecionar para o login do dashboard principal
                setTimeout(() => {
                    window.location.href = `/login.htmlreturnTo=${returnTo}`;
                }, 150);
                return null;
            } else {
                console.error('❌ [PCP] Erro ao verificar autenticação:', response.status);
                window.PCP_AUTH_CHECKED = true;
                window.PCP_USER_AUTHENTICATED = false;
                
                // Preservar URL de retorno
                const returnTo = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
                
                setTimeout(() => {
                    window.location.href = `/login.htmlreturnTo=${returnTo}`;
                }, 150);
                return null;
            }
        } catch (error) {
            console.error('❌ [PCP] Erro na verificação de autenticação:', error);
            window.PCP_AUTH_CHECKED = true;
            window.PCP_USER_AUTHENTICATED = false;
            
            // Preservar URL de retorno
            const returnTo = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
            
            // Em caso de erro, redirecionar para login principal
            setTimeout(() => {
                window.location.href = `/login.htmlreturnTo=${returnTo}`;
            }, 150);
            return null;
        }
    }
    
    // Função para atualizar interface com dados do usuário
    function atualizarInterfaceUsuario(user) {
        if (!user) return;
        
        console.log('🎨 [PCP] Atualizando interface do usuário');
        
        // Atualizar nome do usuário
        const userNameElements = document.querySelectorAll('.user-name, #userName, #user-name, .topbar-user-name');
        userNameElements.forEach(el => {
            el.textContent = user.nome || 'Usuário';
        });
        
        // Atualizar email
        const userEmailElements = document.querySelectorAll('.user-email, #userEmail, #user-email');
        userEmailElements.forEach(el => {
            el.textContent = user.email || '';
        });
        
        // Atualizar avatar
        const avatarElements = document.querySelectorAll('.user-avatar, #userAvatar, .topbar-user-avatar img');
        const avatarUrl = user.foto_perfil_url || user.avatar || '/images/default-avatar.svg';
        avatarElements.forEach(img => {
            if (img.tagName === 'IMG') {
                img.src = avatarUrl;
                img.onerror = function() {
                    this.src = '/images/default-avatar.svg';
                };
            }
        });
        
        // Disparar evento personalização para que outros scripts saibam que o usuário está autenticação
        window.dispatchEvent(new CustomEvent('pcpAuthSuccess', { 
            detail: { user: user } 
        }));
    }
    
    // EXECUTAR VERIFICAÇÃO IMEDIATAMENTE
    (async function verificarImediatamente() {
        console.log('⚡ [PCP] Verificação imediata de autenticação...');
        
        // Verificar se está na query string parâmetro para pular autenticação (útil para testes)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('no-auth') === '1' || urlParams.get('skip-auth') === '1') {
            console.log('⏭️ [PCP] Pulando verificação de autenticação (modo teste)');
            window.PCP_AUTH_CHECKED = true;
            window.PCP_USER_AUTHENTICATED = true;
            return;
        }
        
        const user = await verificarAutenticacao();
        
        if (user) {
            console.log('✅ [PCP] Autenticação OK - permitindo carregamento');
            // Aguardar DOM carregar para atualizar interface
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    atualizarInterfaceUsuario(user);
                });
            } else {
                atualizarInterfaceUsuario(user);
            }
        } else {
            console.log('❌ [PCP] Não autenticação - bloqueando carregamento');
            // Se não autenticação, o redirect já foi feito
        }
    })();
    
    // Expor funções globalmente
    window.PCPAuth = {
        verificarAutenticacao,
        atualizarInterfaceUsuario,
        isAuthenticated: () => window.PCP_USER_AUTHENTICATED,
        isChecked: () => window.PCP_AUTH_CHECKED,
        getUserData: () => {
            try {
                const userData = localStorage.getItem('userData');
                return userData ? JSON.parse(userData) : null;
            } catch (e) {
                return null;
            }
        }
    };
    
    console.log('✅ [PCP] Sistema de autenticação unificada inicialização');
})();
