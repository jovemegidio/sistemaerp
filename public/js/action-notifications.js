/**
 * Sistema de Registro de Notificações de Ações
 * ALUFORCE v2.0
 * 
 * Este módulo registra automaticamente todas as ações do usuário
 * (criar, editar, salvar, excluir) na central de notificações.
 */

window.ActionNotifications = (function() {
    
    /**
     * Registra uma ação na central de notificações
     * @param {string} action - Tipo da ação: 'criar', 'editar', 'salvar', 'excluir', 'faturar', etc.
     * @param {string} modulo - Nome do módulo: 'vendas', 'pcp', 'rh', 'financeiro', 'compras'
     * @param {string} item - Descrição do item afetado
     * @param {Object} options - Opções adicionais
     */
    function registrar(action, modulo, item, options = {}) {
        const acaoConfig = {
            'criar': { icon: 'fa-plus-circle', type: 'success', verbo: 'criado' },
            'editar': { icon: 'fa-edit', type: 'info', verbo: 'editado' },
            'salvar': { icon: 'fa-save', type: 'success', verbo: 'salvo' },
            'excluir': { icon: 'fa-trash', type: 'warning', verbo: 'excluído' },
            'faturar': { icon: 'fa-file-invoice-dollar', type: 'success', verbo: 'faturado' },
            'aprovar': { icon: 'fa-check', type: 'success', verbo: 'aprovado' },
            'cancelar': { icon: 'fa-times', type: 'error', verbo: 'cancelado' },
            'atualizar': { icon: 'fa-sync', type: 'info', verbo: 'atualizado' },
            'importar': { icon: 'fa-upload', type: 'success', verbo: 'importado' },
            'exportar': { icon: 'fa-download', type: 'info', verbo: 'exportado' },
            'mover': { icon: 'fa-arrows-alt', type: 'info', verbo: 'movido' },
            'enviar': { icon: 'fa-paper-plane', type: 'success', verbo: 'enviado' },
            'gerar': { icon: 'fa-cog', type: 'success', verbo: 'gerado' },
            'configurar': { icon: 'fa-cog', type: 'info', verbo: 'configurado' }
        };
        
        const moduloConfig = {
            'vendas': { nome: 'Vendas', cor: '#10b981' },
            'pcp': { nome: 'PCP', cor: '#dc2626' },
            'rh': { nome: 'RH', cor: '#3b82f6' },
            'financeiro': { nome: 'Financeiro', cor: '#8b5cf6' },
            'compras': { nome: 'Compras', cor: '#f59e0b' },
            'nfe': { nome: 'NF-e', cor: '#06b6d4' },
            'configuracoes': { nome: 'Configurações', cor: '#64748b' },
            'sistema': { nome: 'Sistema', cor: '#475569' }
        };
        
        const acao = acaoConfig[action] || { icon: 'fa-info-circle', type: 'info', verbo: action };
        const mod = moduloConfig[modulo] || { nome: modulo, cor: '#64748b' };
        
        const notification = {
            title: `${item} ${acao.verbo}`,
            message: options.message || `${item} foi ${acao.verbo} com sucesso.`,
            type: acao.type,
            modulo: mod.nome,
            icone: acao.icon,
            link: options.link || null,
            persistent: options.persistent || false
        };
        
        // Adicionar à central de notificações se disponível
        if (window.NotificationsManager && typeof window.NotificationsManager.addNotification === 'function') {
            window.NotificationsManager.addNotification(notification);
        }
        
        // Também salvar no localStorage para persistência entre módulos
        salvarNoStorage(notification);
        
        // Log no console para debug
        console.log(`📢 [${mod.nome}] ${item} ${acao.verbo}`);
        
        return notification;
    }
    
    /**
     * Salva notificação no localStorage para sincronização entre módulos
     */
    function salvarNoStorage(notification) {
        try {
            const storageKey = 'aluforce_notifications';
            let stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
            
            // Adicionar nova notificação
            stored.unshift({
                ...notification,
                id: Date.now() + Math.random(),
                time: new Date().toISOString(),
                read: false
            });
            
            // Manter apenas as últimas 100 notificações
            if (stored.length > 100) {
                stored = stored.slice(0, 100);
            }
            
            localStorage.setItem(storageKey, JSON.stringify(stored));
        } catch (e) {
            console.warn('Não foi possível salvar notificação no storage:', e);
        }
    }
    
    /**
     * Atalhos para ações comuns
     */
    function criar(modulo, item, options) {
        return registrar('criar', modulo, item, options);
    }
    
    function editar(modulo, item, options) {
        return registrar('editar', modulo, item, options);
    }
    
    function salvar(modulo, item, options) {
        return registrar('salvar', modulo, item, options);
    }
    
    function excluir(modulo, item, options) {
        return registrar('excluir', modulo, item, options);
    }
    
    function faturar(modulo, item, options) {
        return registrar('faturar', modulo, item, options);
    }
    
    // API pública
    return {
        registrar,
        criar,
        editar,
        salvar,
        excluir,
        faturar
    };
})();

// Alias global para facilitar uso
window.registrarAcao = window.ActionNotifications.registrar;
