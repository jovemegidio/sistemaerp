/**
 * ============================================
 * INTEGRAÇÃO DAS OTIMIZAÇÕES COM PCP EXISTENTE
 * ============================================
 * 
 * Este arquivo integra as otimizações ao módulo PCP
 * sem modificar o código original (preservando todas as páginas)
 * 
 * Autor: Sistema Aluforce
 * Data: 03/12/2025
 */

(function() {
    'use strict';

    console.log('🔄 Iniciando integração de otimizações PCP...');

    // ============================================
    // 1. INTERCEPTAR E OTIMIZAR showView()
    // ============================================
    if (typeof window.showView === 'function') {
        const originalShowView = window.showView;
        
        window.showView = async function(viewName) {
            console.log(`🔄 Carregando view: ${viewName}`);
            
            // Performance monitoring
            window.pcpPerformance.start(`view-${viewName}`);

            // Lazy loading da view
            await window.pcpViewLoader.loadView(viewName);

            // Executar função original
            const result = originalShowView.call(this, viewName);

            // Log de performance
            const duration = window.pcpPerformance.end(`view-${viewName}`, true);

            if (duration > 500) {
                console.warn(`⚠️ View ${viewName} demorou ${duration.toFixed(0)}ms`);
            }

            return result;
        };

        console.log('✅ showView() otimização');
    }

    // ============================================
    // 2. OTIMIZAR carregarMateriais()
    // ============================================
    if (typeof window.carregarMateriais === 'function') {
        const originalCarregarMateriais = window.carregarMateriais;
        
        window.carregarMateriais = async function() {
            // Verificar cache primeiro
            if (window.pcpCache.has('materiais-loaded')) {
                console.log('✅ Materiais carregaçãos do cache');
                return;
            }

            await window.pcpPerformance.measureAsync('carregarMateriais', async () => {
                await originalCarregarMateriais.call(this);
                window.pcpCache.set('materiais-loaded', true, 2 * 60 * 1000);
            });
        };

        console.log('✅ carregarMateriais() otimização');
    }

    // ============================================
    // 3. OTIMIZAR carregarProdutos()
    // ============================================
    if (typeof window.carregarProdutos === 'function') {
        const originalCarregarProdutos = window.carregarProdutos;
        
        window.carregarProdutos = async function(page = 1, limit = 20) {
            const cacheKey = `produtos-${page}-${limit}`;
            
            // Verificar cache
            if (window.pcpCache.has(cacheKey)) {
                console.log(`✅ Produtos página ${page} do cache`);
                return window.pcpCache.get(cacheKey);
            }

            const result = await window.pcpPerformance.measureAsync(
                `carregarProdutos-p${page}`,
                async () => await originalCarregarProdutos.call(this, page, limit)
            );

            window.pcpCache.set(cacheKey, result, 3 * 60 * 1000);
            return result;
        };

        console.log('✅ carregarProdutos() otimização');
    }

    // ============================================
    // 4. OTIMIZAR BUSCA COM DEBOUNCING
    // ============================================
    function setupSearchOptimization() {
        const searchInputs = document.querySelectorAll('[data-search], input[type="search"], .search-input');
        
        searchInputs.forEach(input => {
            input.addEventListener('input', function(e) {
                const query = e.target.value;
                const endpoint = e.target.dataset.searchEndpoint || '/api/pcp/search';
                
                window.pcpDebouncer.debounce('search', async () => {
                    console.log(`🔍 Buscando: "${query}"`);
                    
                    try {
                        const results = await window.pcpSearchOptimizer.search(query, endpoint);
                        
                        // Disparar evento customização com resultaçãos
                        const event = new CustomEvent('pcp:search:results', {
                            detail: { query, results }
                        });
                        document.dispatchEvent(event);
                        
                    } catch (error) {
                        console.error('❌ Erro na busca:', error);
                    }
                }, 300);
            });
        });

        console.log(`✅ ${searchInputs.length} campos de busca otimizaçãos`);
    }

    // ============================================
    // 5. SUBSTITUIR TOAST NOTIFICATIONS
    // ============================================
    if (typeof window.showToast === 'function') {
        const originalShowToast = window.showToast;
        
        window.showToast = function(message, type = 'info') {
            // Usar novo sistema de notificações
            window.pcpNotifications.show(message, type);
            
            // Manter compatibilidade
            return originalShowToast.call(this, message, type);
        };

        console.log('✅ showToast() otimização');
    }

    // ============================================
    // 6. OTIMIZAR CHARTS COM CLEANUP
    // ============================================
    const chartInstances = new Map();

    function createOptimizedChart(canvasId, config) {
        // Destruir chart anterior se existir
        if (chartInstances.has(canvasId)) {
            const oldChart = chartInstances.get(canvasId);
            oldChart.destroy();
            console.log(`🗑️ Chart ${canvasId} destruído`);
        }

        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`❌ Canvas ${canvasId} não encontrado`);
            return null;
        }

        const chart = new Chart(canvas, config);
        chartInstances.set(canvasId, chart);
        console.log(`✅ Chart ${canvasId} criado`);
        
        return chart;
    }

    // Substituir Chart global se disponível
    if (typeof window.Chart !== 'undefined') {
        window.createOptimizedChart = createOptimizedChart;
        console.log('✅ Criação de charts otimizada');
    }

    // ============================================
    // 7. INVALIDAR CACHE EM MUTAÇÕES
    // ============================================
    function setupCacheInvalidation() {
        // Interceptar requisições de criado/atualização
        const originalFetch = window.fetch;
        
        window.fetch = async function(...args) {
            const response = await originalFetch.apply(this, args);
            
            // Se for POST, PUT, DELETE, invalidar caches relevantes
            const method = args[1].method || 'GET';
            if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
                const url = args[0];
                
                // Determinar qual cache invalidar baseado na URL
                if (url.includes('/materiais')) {
                    window.pcpViewLoader.markViewAsStale('materiais');
                    window.pcpCache.cache.delete('materiais-loaded');
                    console.log('🔄 Cache de materiais invalidação');
                }
                
                if (url.includes('/produtos')) {
                    window.pcpViewLoader.markViewAsStale('gestao-produtos');
                    // Limpar todos os caches de produtos paginaçãos
                    for (const key of window.pcpCache.cache.keys()) {
                        if (key.startsWith('produtos-')) {
                            window.pcpCache.cache.delete(key);
                        }
                    }
                    console.log('🔄 Cache de produtos invalidação');
                }
                
                if (url.includes('/ordens')) {
                    window.pcpViewLoader.markViewAsStale('controle-producao');
                    window.pcpViewLoader.markViewAsStale('ordem-compra');
                    console.log('🔄 Cache de ordens invalidação');
                }
                
                if (url.includes('/pedidos') || url.includes('/faturados')) {
                    window.pcpViewLoader.markViewAsStale('faturamento');
                    console.log('🔄 Cache de faturamento invalidação');
                }
            }
            
            return response;
        };

        console.log('✅ Invalidação automática de cache configurada');
    }

    // ============================================
    // 8. EVENT DELEGATION PARA BOTÕES COMUNS
    // ============================================
    function setupEventDelegation() {
        // Delegação para botões de ação em tabelas
        document.addEventListener('click', function(e) {
            // Botões de editar produto
            if (e.target.closest('[data-action="edit-product"]')) {
                const btn = e.target.closest('[data-action="edit-product"]');
                const productId = btn.dataset.productId;
                
                if (productId && typeof window.openProductModal === 'function') {
                    e.preventDefault();
                    console.log(`✏️ Editando produto ${productId}`);
                    
                    // Buscar produto do cache se possível
                    const cacheKey = `produto-${productId}`;
                    const cached = window.pcpCache.get(cacheKey);
                    
                    if (cached) {
                        window.openProductModal(cached);
                    } else {
                        // Buscar do servidor
                        fetch(`/api/pcp/produtos/${productId}`)
                            .then(r => r.json())
                            .then(product => {
                                window.pcpCache.set(cacheKey, product, 5 * 60 * 1000);
                                window.openProductModal(product);
                            });
                    }
                }
            }

            // Botões de deletar
            if (e.target.closest('[data-action="delete"]')) {
                const btn = e.target.closest('[data-action="delete"]');
                const itemType = btn.dataset.itemType;
                const itemId = btn.dataset.itemId;
                
                if (itemType && itemId) {
                    e.preventDefault();
                    console.log(`🗑️ Deletando ${itemType} ${itemId}`);
                    
                    if (confirm(`Tem certeza que deseja deletar este ${itemType}`)) {
                        // Implementar lógica de deleção
                        handleDelete(itemType, itemId);
                    }
                }
            }
        });

        console.log('✅ Event delegation configuração');
    }

    async function handleDelete(itemType, itemId) {
        try {
            const endpoints = {
                'produto': `/api/pcp/produtos/${itemId}`,
                'material': `/api/pcp/materiais/${itemId}`,
                'ordem': `/api/pcp/ordens/${itemId}`
            };

            const endpoint = endpoints[itemType];
            if (!endpoint) {
                console.error(`❌ Tipo ${itemType} não suportação`);
                return;
            }

            const response = await fetch(endpoint, { method: 'DELETE' });
            
            if (response.ok) {
                window.pcpNotifications.show(`${itemType} deletação com sucesso!`, 'success');
                
                // Recarregar view atual
                const currentView = document.querySelector('.pcp-view.active').id;
                if (currentView && typeof window.showView === 'function') {
                    window.showView(currentView);
                }
            } else {
                throw new Error('Falha ao deletar');
            }
        } catch (error) {
            console.error('❌ Erro ao deletar:', error);
            window.pcpNotifications.show(`Erro ao deletar ${itemType}`, 'error');
        }
    }

    // ============================================
    // 9. MELHORAR LOADING STATES
    // ============================================
    function setupLoadingStates() {
        // Adicionar loading overlay global
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'pcp-loading-overlay';
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 99998;
        `;

        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 60px;
            height: 60px;
            border: 4px solid rgba(255, 255, 255, 0.2);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        `;

        loadingOverlay.appendChild(spinner);
        document.body.appendChild(loadingOverlay);

        // Adicionar animação de spin
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        // Funções para mostrar/ocultar loading
        window.showLoading = function() {
            loadingOverlay.style.display = 'flex';
        };

        window.hideLoading = function() {
            loadingOverlay.style.display = 'none';
        };

        console.log('✅ Loading states configuraçãos');
    }

    // ============================================
    // 10. ATALHOS DE TECLADO
    // ============================================
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Ctrl/Cmd + K: Focar busca
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.querySelector('[data-search], input[type="search"]');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                    console.log('🔍 Busca focada (Ctrl+K)');
                }
            }

            // Ctrl/Cmd + N: Nova ordem
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                if (typeof window.openOrderModal === 'function') {
                    window.openOrderModal();
                    console.log('➕ Modal de nova ordem aberto (Ctrl+N)');
                }
            }

            // Esc: Fechar modal
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active, .modal-backdrop.active');
                if (activeModal && typeof window.closeModal === 'function') {
                    window.closeModal();
                    console.log('❌ Modal fechação (Esc)');
                }
            }
        });

        console.log('✅ Atalhos de teclação configuraçãos');
        console.log('  - Ctrl+K: Focar busca');
        console.log('  - Ctrl+N: Nova ordem');
        console.log('  - Esc: Fechar modal');
    }

    // ============================================
    // 11. INICIALIZAÇÃO
    // ============================================
    function initialize() {
        console.log('🚀 Iniciando configurações de integração...');

        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setupSearchOptimization();
                setupCacheInvalidation();
                setupEventDelegation();
                setupLoadingStates();
                setupKeyboardShortcuts();
                
                console.log('✅ Integração PCP concluída!');
                window.pcpNotifications.show('Otimizações PCP ativadas!', 'success', 3000);
            });
        } else {
            setupSearchOptimization();
            setupCacheInvalidation();
            setupEventDelegation();
            setupLoadingStates();
            setupKeyboardShortcuts();
            
            console.log('✅ Integração PCP concluída!');
            window.pcpNotifications.show('Otimizações PCP ativadas!', 'success', 3000);
        }
    }

    // ============================================
    // 12. EXPORTAR API DE INTEGRAÇÃO
    // ============================================
    window.PCPIntegration = {
        createOptimizedChart,
        setupSearchOptimization,
        setupEventDelegation,
        showLoading: () => document.getElementById('pcp-loading-overlay').style.setProperty('display', 'flex'),
        hideLoading: () => document.getElementById('pcp-loading-overlay').style.setProperty('display', 'none'),
        invalidateCache: (viewName) => {
            window.pcpViewLoader.markViewAsStale(viewName);
            console.log(`🔄 Cache de ${viewName} invalidação manualmente`);
        }
    };

    // Inicializar
    initialize();

})();
