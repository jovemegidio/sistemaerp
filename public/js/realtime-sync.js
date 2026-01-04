/**
 * ⚡ SISTEMA DE SINCRONIZAÇÉO EM TEMPO REAL
 * 
 * Gerencia sincronização entre módulos:
 * - PCP (Produção)
 * - Compras
 * - Estoque
 * - Vendas
 * 
 * Utiliza Socket.io para comunicação bidirectional
 */

class RealtimeSync {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.listeners = new Map();
        this.isConnected = false;
        this.pendingUpdates = [];
    }

    /**
     * Inicializa conexão Socket.io
     */
    init() {
        try {
            // Conectar ao servidor Socket.io
            this.socket = io({
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: this.reconnectDelay,
                timeout: 10000
            });

            this.setupEventHandlers();
            console.log('🔌 Sistema de sincronização em tempo real inicialização');
        } catch (error) {
            console.error('❌ Erro ao inicializar Socket.io:', error);
        }
    }

    /**
     * Configura handlers de eventos Socket.io
     */
    setupEventHandlers() {
        // Conexão estabelecida
        this.socket.on('connect', () => {
            console.log('✅ Socket.io conectação:', this.socket.id);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Entrar na sala de gestão de estoque
            this.joinStockRoom();
            
            // Processar atualizações pendentes
            this.processPendingUpdates();
            
            // Notificar UI
            this.showConnectionStatus(true);
        });

        // Desconexão
        this.socket.on('disconnect', (reason) => {
            console.warn('⚠️ Socket.io desconectação:', reason);
            this.isConnected = false;
            this.showConnectionStatus(false);
        });

        // Erro de conexão
        this.socket.on('connect_error', (error) => {
            console.error('❌ Erro de conexão Socket.io:', error);
            this.reconnectAttempts++;
            
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('❌ Limite de reconexões atingido');
                this.showReconnectError();
            }
        });

        // Reconexão bem-sucedida
        this.socket.on('reconnect', (attemptNumber) => {
            console.log(`✅ Reconectação após ${attemptNumber} tentativas`);
            this.reconnectAttempts = 0;
        });

        // ========== EVENTOS DE PRODUTOS ==========
        
        this.socket.on('product-created', (product) => {
            console.log('📦 Produto criado:', product);
            this.handleProductCreated(product);
        });

        this.socket.on('product-updated', (product) => {
            console.log('📝 Produto atualização:', product);
            this.handleProductUpdated(product);
        });

        this.socket.on('product-deleted', (data) => {
            console.log('🗑️ Produto deletação:', data);
            this.handleProductDeleted(data);
        });

        // ========== EVENTOS DE ESTOQUE ==========
        
        this.socket.on('stock-updated', (data) => {
            console.log('📊 Estoque atualização:', data);
            this.handleStockUpdated(data);
        });

        this.socket.on('stock-alert', (data) => {
            console.log('⚠️ Alerta de estoque:', data);
            this.handleStockAlert(data);
        });

        // ========== EVENTOS DE PEDIDOS ==========
        
        this.socket.on('order-created', (order) => {
            console.log('🛒 Pedido criado:', order);
            this.handleOrderCreated(order);
        });

        this.socket.on('order-updated', (order) => {
            console.log('📋 Pedido atualização:', order);
            this.handleOrderUpdated(order);
        });

        this.socket.on('order-approved', (order) => {
            console.log('✅ Pedido aprovação:', order);
            this.handleOrderApproved(order);
        });

        // ========== EVENTOS DE COMPRAS ==========
        
        this.socket.on('purchase-created', (purchase) => {
            console.log('🛍️ Compra criada:', purchase);
            this.handlePurchaseCreated(purchase);
        });

        this.socket.on('purchase-received', (purchase) => {
            console.log('📦 Compra recebida:', purchase);
            this.handlePurchaseReceived(purchase);
        });
    }

    /**
     * Entrar na sala de gestão de estoque
     */
    joinStockRoom() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('join-stock-room', {
                module: this.getCurrentModule(),
                userId: localStorage.getItem('userId') || 'guest',
                timestamp: new Date().toISOString()
            });
            console.log('👥 Entrou na sala de gestão de estoque');
        }
    }

    /**
     * Sair da sala de gestão de estoque
     */
    leaveStockRoom() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('leave-stock-room', {
                module: this.getCurrentModule(),
                userId: localStorage.getItem('userId') || 'guest'
            });
            console.log('👋 Saiu da sala de gestão de estoque');
        }
    }

    /**
     * Identifica o módulo atual
     */
    getCurrentModule() {
        const path = window.location.pathname;
        if (path.includes('/PCP')) return 'PCP';
        if (path.includes('/Compras')) return 'Compras';
        if (path.includes('/Vendas')) return 'Vendas';
        if (path.includes('/Estoque')) return 'Estoque';
        return 'Unknown';
    }

    // ========== HANDLERS DE PRODUTOS ==========

    handleProductCreated(product) {
        // Notificar UI
        this.showToast(`Novo produto: ${product.nome}`, 'success');
        
        // Emitir evento customização para módulos específicos
        this.triggerListeners('product-created', product);
        
        // Atualizar catálogo se estiver visível
        if (document.getElementById('catalogo-produtos-view') && 
            !document.getElementById('catalogo-produtos-view').classList.contains('hidden')) {
            this.refreshCatalog();
        }
    }

    handleProductUpdated(product) {
        this.showToast(`Produto atualização: ${product.nome}`, 'info');
        this.triggerListeners('product-updated', product);
        
        // Atualizar card do produto se estiver visível
        this.updateProductCard(product);
    }

    handleProductDeleted(data) {
        this.showToast(`Produto removido (ID: ${data.id})`, 'warning');
        this.triggerListeners('product-deleted', data);
        
        // Remover card do produto
        this.removeProductCard(data.id);
    }

    // ========== HANDLERS DE ESTOQUE ==========

    handleStockUpdated(data) {
        console.log('📊 Atualizando estoque:', data);
        this.triggerListeners('stock-updated', data);
        
        // Atualizar badge de estoque
        const productCard = document.querySelector(`[data-product-id="${data.product_id}"]`);
        if (productCard) {
            const stockBadge = productCard.querySelector('.produto-estoque');
            if (stockBadge) {
                stockBadge.textContent = `${data.estoque_atual} ${data.unidade_medida || 'UN'}`;
                
                // Atualizar classe de estoque
                stockBadge.classList.remove('disponivel', 'baixo', 'zeração');
                if (data.estoque_atual === 0) {
                    stockBadge.classList.add('zeração');
                } else if (data.estoque_atual < 10) {
                    stockBadge.classList.add('baixo');
                } else {
                    stockBadge.classList.add('disponivel');
                }
            }
        }
    }

    handleStockAlert(data) {
        // Notificação crítica de estoque baixo
        this.showToast(
            `⚠️ Estoque baixo: ${data.produto_nome} (${data.estoque_atual} ${data.unidade_medida})`,
            'warning',
            10000 // 10 segundos
        );
        
        this.triggerListeners('stock-alert', data);
        
        // Atualizar contaçãor de alertas
        const alertCounter = document.getElementById('alertas-número');
        if (alertCounter) {
            const currentCount = parseInt(alertCounter.textContent) || 0;
            alertCounter.textContent = currentCount + 1;
        }
    }

    // ========== HANDLERS DE PEDIDOS ==========

    handleOrderCreated(order) {
        this.showToast(`Novo pedido: #${order.id}`, 'success');
        this.triggerListeners('order-created', order);
    }

    handleOrderUpdated(order) {
        this.triggerListeners('order-updated', order);
    }

    handleOrderApproved(order) {
        this.showToast(`Pedido #${order.id} aprovação!`, 'success');
        this.triggerListeners('order-approved', order);
        
        // Atualizar estoque se for o módulo PCP
        if (this.getCurrentModule() === 'PCP') {
            this.requestStockUpdate();
        }
    }

    // ========== HANDLERS DE COMPRAS ==========

    handlePurchaseCreated(purchase) {
        this.showToast(`Nova compra: ${purchase.fornecedor}`, 'info');
        this.triggerListeners('purchase-created', purchase);
    }

    handlePurchaseReceived(purchase) {
        this.showToast(`Compra recebida: ${purchase.fornecedor}`, 'success');
        this.triggerListeners('purchase-received', purchase);
        
        // Atualizar estoque
        this.requestStockUpdate();
    }

    // ========== MÉTODOS AUXILIARES ==========

    /**
     * Registrar listener para evento customização
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Remover listener
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Disparar listeners registraçãos
     */
    triggerListeners(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Erro ao executar listener de ${event}:`, error);
                }
            });
        }
    }

    /**
     * Solicitar atualização de estoque
     */
    requestStockUpdate() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('request-stock-update');
        }
    }

    /**
     * Atualizar catálogo
     */
    refreshCatalog() {
        if (typeof carregarCatalogoProdutos === 'function') {
            carregarCatalogoProdutos();
        }
    }

    /**
     * Atualizar card de produto
     */
    updateProductCard(product) {
        const productCard = document.querySelector(`[data-product-id="${product.id}"]`);
        if (productCard) {
            // Atualizar nome
            const nameElement = productCard.querySelector('.produto-nome');
            if (nameElement) nameElement.textContent = product.nome;
            
            // Atualizar preço
            const priceElement = productCard.querySelector('.produto-preco');
            if (priceElement && product.preco) {
                priceElement.textContent = `R$ ${parseFloat(product.preco).toFixed(2)}`;
            }
            
            // Atualizar estoque
            const stockElement = productCard.querySelector('.produto-estoque');
            if (stockElement && product.estoque !== undefined) {
                stockElement.textContent = `${product.estoque} ${product.embalagem || 'UN'}`;
            }
        }
    }

    /**
     * Remover card de produto
     */
    removeProductCard(productId) {
        const productCard = document.querySelector(`[data-product-id="${productId}"]`);
        if (productCard) {
            productCard.style.transition = 'opacity 0.3s ease-out';
            productCard.style.opacity = '0';
            setTimeout(() => productCard.remove(), 300);
        }
    }

    /**
     * Mostrar status de conexão
     */
    showConnectionStatus(connected) {
        const indicator = document.getElementById('realtime-indicator');
        if (indicator) {
            indicator.classList.toggle('connected', connected);
            indicator.classList.toggle('disconnected', !connected);
            indicator.title = connected ? 'Sincronização em tempo real ativa' : 'Desconectação';
        }
    }

    /**
     * Mostrar erro de reconexão
     */
    showReconnectError() {
        this.showToast(
            'Não foi possível estabelecer conexão em tempo real. Recarregue a página.',
            'error',
            0 // Não desaparece
        );
    }

    /**
     * Mostrar toast de notificação
     */
    showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('realtime-toast-container') || this.createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `realtime-toast realtime-toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${this.getToastIcon(type)}"></i>
            <span>${message}</span>
            <button class="realtime-toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(toast);
        
        // Auto-remover
        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.style.opacity = '0';
                    setTimeout(() => toast.remove(), 300);
                }
            }, duration);
        }
    }

    /**
     * Criar container de toasts
     */
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'realtime-toast-container';
        container.className = 'realtime-toast-container';
        document.body.appendChild(container);
        return container;
    }

    /**
     * Ícone do toast baseado no tipo
     */
    getToastIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    /**
     * Processar atualizações pendentes (offline queue)
     */
    processPendingUpdates() {
        if (this.pendingUpdates.length > 0) {
            console.log(`🔄 Processando ${this.pendingUpdates.length} atualizações pendentes`);
            
            this.pendingUpdates.forEach(update => {
                this.socket.emit(update.event, update.data);
            });
            
            this.pendingUpdates = [];
        }
    }

    /**
     * Emitir evento (com queue se offline)
     */
    emit(event, data) {
        if (this.socket && this.socket.connected) {
            this.socket.emit(event, data);
        } else {
            console.warn('⚠️ Socket desconectação, adicionando à fila:', event);
            this.pendingUpdates.push({ event, data });
        }
    }

    /**
     * Destruir conexão
     */
    destroy() {
        this.leaveStockRoom();
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.listeners.clear();
        this.isConnected = false;
        
        console.log('🔌 Sistema de sincronização desconectação');
    }
}

// Instância global
window.realtimeSync = new RealtimeSync();

// Auto-inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.realtimeSync.init();
    });
} else {
    window.realtimeSync.init();
}

// Cleanup ao sair da página
window.addEventListener('beforeunload', () => {
    window.realtimeSync.destroy();
});

console.log('⚡ Sistema de sincronização em tempo real carregação');
