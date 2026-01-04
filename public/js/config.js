// ============================================
// CONFIGURAÇÃO GLOBAL DO SISTEMA ALUFORCE
// GitHub Pages + Railway API Backend
// ============================================

(function() {
    'use strict';
    
    // Detectar ambiente baseação no hostname
    const hostname = window.location.hostname;
    const isGitHubPages = hostname.includes('github.io');
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isRailway = hostname.includes('railway.app');
    
    // URL da API no Railway
    const RAILWAY_API_URL = 'https://sistemaerp-production-a924.up.railway.app';
    
    // Configurações por ambiente
    const environments = {
        // Produção - GitHub Pages apontando para Railway API
        production: {
            API_BASE_URL: RAILWAY_API_URL,
            WS_URL: RAILWAY_API_URL.replace('https://', 'wss://'),
            ENV: 'production'
        },
        // Railway - API rodando diretamente
        railway: {
            API_BASE_URL: '',  // Mesmo servidor
            WS_URL: '',
            ENV: 'production'
        },
        // Desenvolvimento local
        development: {
            API_BASE_URL: '',  // Usa o mesmo servidor
            WS_URL: `ws://${hostname}:3000`,
            ENV: 'development'
        }
    };
    
    // Selecionar ambiente
    let currentEnv = 'development';
    if (isGitHubPages) {
        currentEnv = 'production';
    } else if (isRailway) {
        currentEnv = 'railway';
    }
    
    const config = environments[currentEnv];
    
    // Exportar configuração global
    window.ALUFORCE_CONFIG = {
        ...config,
        isProduction: isGitHubPages || isRailway,
        isDevelopment: isLocalhost,
        isGitHubPages: isGitHubPages,
        isRailway: isRailway,
        VERSION: '2.1.7',
        APP_NAME: 'ALUFORCE ERP',
        
        // Função helper para construir URLs da API
        apiUrl: function(endpoint) {
            const base = this.API_BASE_URL;
            if (!endpoint) return base;
            if (endpoint.startsWith('/')) {
                return base + endpoint;
            }
            return base + '/' + endpoint;
        },
        
        // Função helper para fetch com autenticação
        fetchApi: async function(endpoint, options = {}) {
            const url = this.apiUrl(endpoint);
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                mode: 'cors'
            };
            
            // Em produção com GitHub Pages, usar token Bearer ao invés de cookies
            if (this.isGitHubPages && token) {
                defaultOptions.headers['Authorization'] = `Bearer ${token}`;
            } else if (!this.isGitHubPages) {
                defaultOptions.credentials = 'include';
            }
            
            const mergedOptions = {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...(options.headers || {})
                }
            };
            
            const response = await fetch(url, mergedOptions);
            return response;
        }
    };
    
    // Sobrescrever fetch global para funcionar com API remota (apenas em GitHub Pages)
    if (isGitHubPages) {
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            // Se a URL começa com /api, redireciona para a API do Railway
            if (typeof url === 'string' && url.startsWith('/api')) {
                url = RAILWAY_API_URL + url;
                
                // Adiciona headers de autenticação
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                options.headers = options.headers || {};
                if (token) {
                    options.headers['Authorization'] = `Bearer ${token}`;
                }
                options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
                options.mode = 'cors';
                
                // Remove credentials para evitar problemas de CORS
                delete options.credentials;
            }
            return originalFetch.call(this, url, options);
        };
        
        console.log('🌐 ALUFORCE rodando em GitHub Pages');
        console.log('📡 API Backend:', RAILWAY_API_URL);
    }
    
    // Log da configuração no console (apenas em desenvolvimento)
    if (config.ENV === 'development') {
        console.log('🔧 ALUFORCE Config:', window.ALUFORCE_CONFIG);
    }
    
})();
