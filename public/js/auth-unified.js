// auth-unified.js - Sistema de autenticação unificado para todos os módulos ALUFORCE
// Este script deve ser incluído em TODOS os módulos para garantir login único

(function() {
    'use strict';
    
    console.log('🔐 Sistema de Autenticação Unificado ALUFORCE carregado');
    
    // Configurações
    const AUTH_CONFIG = {
        loginUrl: '/login.html',
        apiMeEndpoint: '/api/me',
        dashboardUrl: '/index.html',
        timeout: 3000,
        debug: true
    };
    
    // Função para logs de debug
    function debugLog(message, data = null) {
        if (AUTH_CONFIG.debug) {
            console.log(`[AUTH-UNIFIED] ${message}`, data || '');
        }
    }
    
    // Função para obter cookie por nome
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }
    
    // Função para remover dados de autenticação
    function clearAuthData() {
        debugLog('🧹 Limpando dados de autenticação...');
        
        // Limpar localStorage
        localStorage.removeItem('authToken');
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        
        // Limpar sessionStorage
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('userData');
        
        // Limpar cookies
        document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        
        debugLog('✅ Dados de autenticação limpos');
    }
    
    // Função para verificar se está na página de login
    function isLoginPage() {
        const pathname = window.location.pathname.toLowerCase();
        return pathname.includes('login') || pathname.endsWith('login.html');
    }
    
    // Função para verificar se deve pular verificação
    function shouldSkipAuth() {
        const pathname = window.location.pathname.toLowerCase();
        const search = window.location.search.toLowerCase();
        
        // Pular em páginas de login, testes, módulos específicos ou com parâmetro específico
        return isLoginPage() || 
               pathname.includes('test') || 
               pathname.includes('/modules/vendas') ||
               pathname.includes('/modules/pcp') ||
               pathname.includes('/modules/compras') ||
               pathname.includes('/modules/rh') ||
               search.includes('no-auth=1') ||
               search.includes('skip-auth=1');
    }
    
    // Função para redirecionar para login
    function redirectToLogin(reason = 'Não autenticado') {
        debugLog(`🚪 Redirecionando para login: ${reason}`);
        
        // Preservar URL atual para retorno após login
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
        const loginUrl = `${AUTH_CONFIG.loginUrl}?returnTo=${returnTo}`;
        
        // Pequeno delay para evitar flash de conteúdo
        setTimeout(() => {
            window.location.href = loginUrl;
        }, 150);
    }
    
    // Função para verificar autenticação via API
    async function checkAuthentication() {
        debugLog('🔍 Verificando autenticação...');
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), AUTH_CONFIG.timeout);
            
            const response = await fetch(AUTH_CONFIG.apiMeEndpoint, {
                method: 'GET',
                credentials: 'include', // Importante para incluir cookies
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            debugLog(`📡 Resposta da API: ${response.status}`);
            
            if (response.ok) {
                const userData = await response.json();
                debugLog('✅ Usuário autenticado:', userData.nome || userData.email);
                
                // Salvar dados do usuário para uso dos módulos
                localStorage.setItem('userData', JSON.stringify(userData));
                
                // Disparar evento personalizado para que os módulos saibam que o usuário está autenticado
                window.dispatchEvent(new CustomEvent('authSuccess', { 
                    detail: { user: userData } 
                }));
                
                return userData;
            } else {
                debugLog(`❌ Falha na autenticação: ${response.status}`);
                return null;
            }
            
        } catch (error) {
            debugLog(`🚨 Erro na verificação: ${error.message}`);
            
            // Se for erro de rede/timeout, talvez o servidor esteja indisponível
            if (error.name === 'AbortError') {
                debugLog('⏰ Timeout na verificação de autenticação');
            }
            
            return null;
        }
    }
    
    // Função principal de verificação
    async function verifyAuth() {
        // Pular verificação se necessário
        if (shouldSkipAuth()) {
            debugLog('⏭️ Pulando verificação de autenticação');
            return;
        }
        
        debugLog('🚀 Iniciando verificação de autenticação...');
        
        // Verificar se existe algum token local
        const authToken = getCookie('authToken') || 
                         localStorage.getItem('authToken') || 
                         localStorage.getItem('token');

        if (!authToken) {
            // Se não houver token local, tentar verificar diretamente com o servidor
            debugLog('⚠️ Nenhum token local encontrado — tentando verificação direta no servidor...');
            const serverUser = await checkAuthentication();
            if (!serverUser) {
                debugLog('❌ Nenhum usuário autenticado encontrado no servidor');
                clearAuthData();
                redirectToLogin('Token não encontrado');
                return;
            }
            // Se o servidor retornar usuário, preservar os dados localmente e prosseguir
            localStorage.setItem('userData', JSON.stringify(serverUser));
            debugLog('🎫 Autenticação detectada via servidor sem token local:', serverUser.nome || serverUser.email);
            return;
        }

        debugLog('🎫 Token local encontrado, verificando validade...');

        // Verificar validade do token via API
        const userData = await checkAuthentication();

        if (!userData) {
            debugLog('❌ Token inválido ou expirado');
            clearAuthData();
            redirectToLogin('Token inválido');
            return;
        }

        debugLog('🎉 Autenticação bem-sucedida!');
    }
    
    // Função para inicializar sistema de auth
    function initAuth() {
        debugLog('🔧 Inicializando sistema de autenticação unificado...');
        
        // Verificar autenticação quando DOM estiver pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', verifyAuth);
        } else {
            verifyAuth();
        }
        
        // Verificar periodicamente se ainda está autenticado (a cada 5 minutos)
        setInterval(async () => {
            if (!shouldSkipAuth()) {
                debugLog('🔄 Verificação periódica de autenticação...');
                const userData = await checkAuthentication();
                if (!userData) {
                    debugLog('❌ Sessão expirou durante verificação periódica');
                    clearAuthData();
                    redirectToLogin('Sessão expirada');
                }
            }
        }, 5 * 60 * 1000); // 5 minutos
    }
    
    // Expor funções úteis para os módulos
    window.AluforceAuth = {
        checkAuth: checkAuthentication,
        clearAuth: clearAuthData,
        getCookie: getCookie,
        isAuthenticated: async () => {
            const userData = await checkAuthentication();
            return !!userData;
        },
        getUserData: () => {
            try {
                const userData = localStorage.getItem('userData');
                return userData ? JSON.parse(userData) : null;
            } catch (e) {
                return null;
            }
        }
    };
    
    // Inicializar automaticamente
    initAuth();
    
    debugLog('✅ Sistema de autenticação unificado inicializado');
    
})();