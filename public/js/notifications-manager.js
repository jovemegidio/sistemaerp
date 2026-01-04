/**
 * Sistema de Gerenciamento de Notificações
 * ALUFORCE v2.0
 */

const NotificationsManager = (function() {
    let notifications = [];
    let unreadCount = 0;
    let currentFilter = 'all';
    let isOpen = false;

    // Elementos DOM
    let panel, overlay, listContainer, badge, tabs;

    /**
     * Inicializa o gerenciaçãor de notificações
     */
    function init() {
        console.log('🔔 Inicializando NotificationsManager...');
        
        // Criar elementos DOM
        createPanel();
        
        // Carregar notificações do localStorage
        loadNotifications();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Atualizar badge
        updateBadge();
        
        // Carregar alertas reais dos módulos
        loadAlertsFromModules();
        
        console.log('✅ NotificationsManager inicialização');
    }

    /**
     * Cria o painel de notificações no DOM
     */
    function createPanel() {
        // Criar overlay
        overlay = document.createElement('div');
        overlay.className = 'notifications-overlay';
        overlay.id = 'notifications-overlay';
        document.body.appendChild(overlay);

        // Criar painel
        panel = document.createElement('div');
        panel.className = 'notifications-panel';
        panel.id = 'notifications-panel';
        
        panel.innerHTML = `
            <div class="notifications-panel-header">
                <h3 class="notifications-panel-title">
                    <i class="fas fa-bell"></i>
                    Notificações
                </h3>
                <button class="notifications-panel-close" aria-label="Fechar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="notifications-tabs">
                <button class="notification-tab active" data-filter="all">
                    Todas
                </button>
                <button class="notification-tab" data-filter="unread">
                    Não lidas
                </button>
                <button class="notification-tab" data-filter="system">
                    Sistema
                </button>
            </div>
            
            <div class="notifications-list" id="notifications-list">
                <!-- Notificações serão inseridas aqui -->
            </div>
            
            <div class="notifications-panel-footer">
                <button class="notifications-footer-btn" id="mark-all-read">
                    <i class="fas fa-check-double"></i>
                    Marcar todas como lidas
                </button>
                <button class="notifications-footer-btn primary" id="clear-all">
                    <i class="fas fa-trash-alt"></i>
                    Limpar tudo
                </button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Guardar referências
        listContainer = document.getElementById('notifications-list');
        tabs = panel.querySelectorAll('.notification-tab');
    }

    /**
     * Configura event listeners
     */
    function setupEventListeners() {
        // Botão de notificações no header
        const notifBtn = document.getElementById('notifications-btn');
        if (notifBtn) {
            notifBtn.addEventListener('click', togglePanel);
        }

        // Botão de fechar
        const closeBtn = panel.querySelector('.notifications-panel-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closePanel);
        }

        // Overlay
        overlay.addEventListener('click', closePanel);

        // Tabs de filtro
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const filter = tab.getAttribute('data-filter');
                setFilter(filter);
            });
        });

        // Marcar todas como lidas
        const markAllBtn = document.getElementById('mark-all-read');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', markAllAsRead);
        }

        // Limpar todas
        const clearAllBtn = document.getElementById('clear-all');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', clearAll);
        }
    }

    /**
     * Adiciona uma nova notificação
     * @param {Object} notification - Daçãos da notificação
     * @param {boolean} syncToServer - Se deve enviar para o servidor (padrão: true)
     */
    function addNotification(notification, syncToServer = true) {
        const newNotif = {
            id: Date.now() + Math.random(),
            title: notification.title || 'Notificação',
            message: notification.message || '',
            type: notification.type || 'info', // info, success, warning, error, system
            time: new Date().toISOString(),
            read: false,
            modulo: notification.modulo || 'sistema',
            link: notification.link || null,
            ...notification
        };

        notifications.unshift(newNotif);
        unreadCount++;
        
        saveNotifications();
        updateBadge();
        renderNotifications();
        
        // Se o painel estiver aberto, animar a nova notificação
        if (isOpen) {
            const firstItem = listContainer.querySelector('.notification-item');
            if (firstItem) {
                firstItem.style.animation = 'slideInRight 0.3s ease-out';
            }
        }

        // Enviar para o servidor se solicitação (para notificações importantes)
        if (syncToServer && notification.persistent) {
            sendToServer(newNotif);
        }

        return newNotif;
    }

    /**
     * Renderiza as notificações na lista
     */
    function renderNotifications() {
        if (!listContainer) return;

        // Filtrar notificações
        let filtered = notifications;
        
        if (currentFilter === 'unread') {
            filtered = notifications.filter(n => !n.read);
        } else if (currentFilter === 'system') {
            filtered = notifications.filter(n => n.type === 'system' || n.modulo === 'sistema');
        }

        // Se não houver notificações
        if (filtered.length === 0) {
            listContainer.innerHTML = `
                <div class="notifications-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>Nenhuma notificação ${currentFilter !== 'all'  'nesta categoria' : 'no momento'}</p>
                </div>
            `;
            return;
        }

        // Renderizar notificações
        listContainer.innerHTML = filtered.map(notif => {
            const iconClass = notif.icone  `fas ${notif.icone}` : getIconForType(notif.type);
            const moduloBadge = notif.modulo && notif.modulo !== 'sistema' 
                 `<span class="notification-module-badge">${notif.modulo}</span>` 
                : '';
            
            return `
            <div class="notification-item ${notif.read  '' : 'unread'}" data-id="${notif.id}" ${notif.link  `data-link="${notif.link}"` : ''}>
                <div class="notification-icon ${notif.type}">
                    <i class="${iconClass}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${escapeHtml(notif.title)}</div>
                    <div class="notification-message">${escapeHtml(notif.message)}</div>
                    <div class="notification-meta">
                        ${moduloBadge}
                        <span class="notification-time">
                            <i class="fas fa-clock"></i>
                            ${formatTime(notif.time)}
                        </span>
                    </div>
                </div>
                ${!notif.read  '<span class="notification-new-badge"></span>' : ''}
            </div>
        `}).join('');

        // Adicionar listeners aos itens
        listContainer.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseFloat(item.getAttribute('data-id'));
                const link = item.getAttribute('data-link');
                markAsRead(id);
                
                // Se tiver link, navegar para ele
                if (link) {
                    closePanel();
                    window.location.href = link;
                }
            });
        });
    }

    /**
     * Retorna o ícone apropriação para cada tipo
     */
    function getIconForType(type) {
        const icons = {
            info: 'fas fa-info-circle',
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-times-circle',
            system: 'fas fa-cog'
        };
        return icons[type] || icons.info;
    }

    /**
     * Formata o tempo relativo
     */
    function formatTime(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'Agora mesmo';
        if (minutes < 60) return `${minutes}m atrás`;
        if (hours < 24) return `${hours}h atrás`;
        if (days < 7) return `${days}d atrás`;
        
        return date.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Escape HTML para prevenir XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Marca uma notificação como lida
     */
    function markAsRead(id) {
        const notif = notifications.find(n => n.id === id);
        if (notif && !notif.read) {
            notif.read = true;
            unreadCount = Math.max(0, unreadCount - 1);
            saveNotifications();
            updateBadge();
            renderNotifications();
        }
    }

    /**
     * Marca todas como lidas
     */
    function markAllAsRead() {
        notifications.forEach(n => n.read = true);
        unreadCount = 0;
        saveNotifications();
        updateBadge();
        renderNotifications();
        showToast('Todas as notificações foram marcadas como lidas', 'success');
    }

    /**
     * Limpa todas as notificações
     */
    async function clearAll() {
        // Verificar se showConfirmModal existe, senão usar fallback
        const confirmFn = typeof window.showConfirmModal === 'function' 
             window.showConfirmModal 
            : async (opts) => confirm(opts.message || 'Deseja continuar');
        
        const confirmed = await confirmFn({
            type: 'danger',
            title: 'Limpar Notificações',
            message: 'Tem certeza que deseja limpar todas as notificações Esta ação não pode ser desfeita.',
            confirmText: 'Limpar Todas',
            cancelText: 'Cancelar'
        });
        
        if (confirmed) {
            notifications = [];
            unreadCount = 0;
            saveNotifications();
            updateBadge();
            renderNotifications();
            showToast('Todas as notificações foram removidas', 'info');
        }
    }

    /**
     * Alterna filtro
     */
    function setFilter(filter) {
        currentFilter = filter;
        
        // Atualizar tabs
        tabs.forEach(tab => {
            if (tab.getAttribute('data-filter') === filter) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        renderNotifications();
    }

    /**
     * Atualiza o badge de contagem
     */
    function updateBadge() {
        badge = document.querySelector('.notification-dot');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99  '99+' : unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    /**
     * Abre o painel
     */
    function openPanel() {
        isOpen = true;
        panel.classList.add('show');
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';
        renderNotifications();
    }

    /**
     * Fecha o painel
     */
    function closePanel() {
        isOpen = false;
        panel.classList.remove('show');
        overlay.classList.remove('show');
        document.body.style.overflow = '';
    }

    /**
     * Alterna o painel
     */
    function togglePanel() {
        if (isOpen) {
            closePanel();
        } else {
            openPanel();
        }
    }

    /**
     * Salva notificações no localStorage
     */
    function saveNotifications() {
        try {
            // Manter apenas as últimas 50 notificações
            const toSave = notifications.slice(0, 50);
            localStorage.setItem('notifications', JSON.stringify(toSave));
            localStorage.setItem('unreadCount', unreadCount.toString());
        } catch (e) {
            console.error('Erro ao salvar notificações:', e);
        }
    }

    /**
     * Carrega notificações do localStorage
     */
    function loadNotifications() {
        try {
            const saved = localStorage.getItem('notifications');
            const savedCount = localStorage.getItem('unreadCount');
            
            if (saved) {
                notifications = JSON.parse(saved);
                
                // Filtrar notificações de demonstração antigas
                const demoTitles = [
                    'Bem-vindo ao ALUFORCE!',
                    'Atualização disponível',
                    'Backup agendação',
                    'Bem-vindo',
                    'Nova atualização'
                ];
                const demoMessages = [
                    'Sistema iniciação com sucesso',
                    'Versão 2.0',
                    'backup automático',
                    'Explore todos os módulos'
                ];
                
                const originalLength = notifications.length;
                notifications = notifications.filter(n => {
                    // Remover por título exato
                    if (demoTitles.includes(n.title)) return false;
                    // Remover por parte da mensagem
                    if (demoMessages.some(msg => n.message && n.message.toLowerCase().includes(msg.toLowerCase()))) return false;
                    return true;
                });
                
                // Se removeu alguma, salvar novamente
                if (notifications.length !== originalLength) {
                    console.log(`🧹 Removidas ${originalLength - notifications.length} notificações de demonstração`);
                    saveNotifications();
                }
            }
            
            if (savedCount) {
                unreadCount = parseInt(savedCount, 10);
            }
            
            // Recalcular contagem de não lidas
            unreadCount = notifications.filter(n => !n.read).length;
            
        } catch (e) {
            console.error('Erro ao carregar notificações:', e);
            notifications = [];
            unreadCount = 0;
        }
        
        // Carregar notificações do servidor também
        loadFromServer();
    }

    /**
     * Carrega notificações do servidor
     */
    async function loadFromServer() {
        try {
            const response = await fetch('/api/notificacoeslimite=20', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.notificacoes) {
                    // Mesclar notificações do servidor com locais (evitar duplicatas)
                    data.notificacoes.forEach(serverNotif => {
                        const exists = notifications.find(n => 
                            n.title === serverNotif.titulo && 
                            n.message === serverNotif.mensagem &&
                            n.time === serverNotif.created_at
                        );
                        
                        if (!exists) {
                            notifications.push({
                                id: serverNotif.id,
                                title: serverNotif.titulo,
                                message: serverNotif.mensagem,
                                type: serverNotif.tipo || 'info',
                                time: serverNotif.created_at,
                                read: serverNotif.lida === 1,
                                modulo: serverNotif.modulo,
                                link: serverNotif.link,
                                fromServer: true
                            });
                        }
                    });
                    
                    // Ordenar por data (mais recentes primeiro)
                    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));
                    
                    // Atualizar contagem
                    unreadCount = notifications.filter(n => !n.read).length;
                    
                    saveNotifications();
                    updateBadge();
                    renderNotifications();
                }
            }
        } catch (e) {
            console.log('Notificações do servidor não disponíveis:', e.message);
        }
    }

    /**
     * Envia notificação para o servidor
     */
    async function sendToServer(notification) {
        try {
            const response = await fetch('/api/notificacoes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    titulo: notification.title,
                    mensagem: notification.message,
                    tipo: notification.type,
                    modulo: notification.modulo || 'sistema',
                    link: notification.link || null,
                    broadcast: notification.broadcast || false
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.id;
            }
        } catch (e) {
            console.log('Erro ao enviar notificação para servidor:', e.message);
        }
        return null;
    }

    /**
     * Carrega alertas reais dos módulos do sistema
     */
    async function loadAlertsFromModules() {
        try {
            const response = await fetch('/api/notificacoes/alertas', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.alertas && data.alertas.length > 0) {
                    // Adicionar alertas como notificações (evitar duplicatas)
                    data.alertas.forEach(alerta => {
                        const alertaKey = `${alerta.modulo}-${alerta.titulo}`;
                        const exists = notifications.find(n => 
                            n.alertaKey === alertaKey
                        );
                        
                        if (!exists) {
                            const newNotif = {
                                id: Date.now() + Math.random(),
                                alertaKey: alertaKey,
                                title: alerta.titulo,
                                message: alerta.mensagem,
                                type: alerta.tipo === 'danger'  'error' : alerta.tipo,
                                time: new Date().toISOString(),
                                read: false,
                                modulo: alerta.modulo,
                                link: alerta.link,
                                icone: alerta.icone,
                                fromAlerts: true
                            };
                            notifications.unshift(newNotif);
                            unreadCount++;
                        }
                    });
                    
                    saveNotifications();
                    updateBadge();
                    renderNotifications();
                }
            }
        } catch (e) {
            console.log('Alertas do servidor não disponíveis:', e.message);
        }
    }

    /**
     * Mostra um toast (reutiliza a função global se existir)
     */
    function showToast(message, type) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * Força a sincronização com o servidor
     */
    function syncWithServer() {
        loadFromServer();
    }

    // API Pública
    return {
        init,
        addNotification,
        openPanel,
        closePanel,
        togglePanel,
        markAsRead,
        markAllAsRead,
        clearAll,
        getUnreadCount: () => unreadCount,
        getAll: () => notifications,
        syncWithServer,
        loadAlertsFromModules,
        sendToServer,
        refresh: () => {
            loadFromServer();
            loadAlertsFromModules();
        }
    };
})();

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NotificationsManager.init());
} else {
    NotificationsManager.init();
}

// Expor globalmente
window.NotificationsManager = NotificationsManager;
