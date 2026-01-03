/**
 * COMPRAS MAIN - Controlador Principal do Módulo de Compras
 * Inicialização e gerenciamento geral
 */

(function() {
    'use strict';

    // Estado global do módulo
    window.ComprasModule = {
        currentSection: 'dashboard',
        userData: null,
        initialized: false
    };

    /**
     * Inicializar módulo
     */
    function init() {
        console.log('🛒 Módulo de Compras inicializado');
        
        // Carregar dados do usuário
        loadUserData();
        
        // Inicializar dashboard
        if (typeof Dashboard !== 'undefined') {
            Dashboard.init();
        }
        
        window.ComprasModule.initialized = true;
    }

    /**
     * Carregar dados do usuário
     */
    function loadUserData() {
        try {
            const userData = localStorage.getItem('userData');
            if (userData) {
                window.ComprasModule.userData = JSON.parse(userData);
            }
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
        }
    }

    /**
     * Funções auxiliares globais
     */
    window.ComprasModule.utils = {
        formatCurrency: function(value) {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(value);
        },

        formatDate: function(date) {
            return new Date(date).toLocaleDateString('pt-BR');
        },

        formatDateTime: function(date) {
            return new Date(date).toLocaleString('pt-BR');
        },

        getStatusBadge: function(status) {
            const badges = {
                'pendente': '<span class="badge badge-warning">Pendente</span>',
                'aprovado': '<span class="badge badge-success">Aprovado</span>',
                'em_transito': '<span class="badge badge-info">Em Trânsito</span>',
                'recebido': '<span class="badge badge-success">Recebido</span>',
                'cancelado': '<span class="badge badge-danger">Cancelado</span>',
                'ativo': '<span class="badge badge-success">Ativo</span>',
                'inativo': '<span class="badge badge-secondary">Inativo</span>'
            };
            return badges[status] || `<span class="badge">${status}</span>`;
        }
    };

    // Placeholder functions para os botões
    window.novoPedido = function() {
        alert('Funcionalidade de Novo Pedido em desenvolvimento');
    };

    window.novaCotacao = function() {
        alert('Funcionalidade de Nova Cotação em desenvolvimento');
    };

    window.novoFornecedor = function() {
        alert('Funcionalidade de Novo Fornecedor em desenvolvimento');
    };

    window.novoMaterial = function() {
        alert('Funcionalidade de Novo Material em desenvolvimento');
    };

    window.novoRecebimento = function() {
        alert('Funcionalidade de Novo Recebimento em desenvolvimento');
    };

    // Inicializar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
