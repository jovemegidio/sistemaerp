/**
 * Inicializador do Botão de Notificações
 * Conecta o botão de notificações ao painel global
 * ALUFORCE v2.0
 */

(function() {
    'use strict';

    /**
     * Inicializa o botão de notificações
     */
    function initNotificationButton() {
        // Aguardar NotificationsManager estar disponível
        if (typeof window.NotificationsManager === 'undefined') {
            console.log('⏳ Aguardando NotificationsManager...');
            setTimeout(initNotificationButton, 100);
            return;
        }

        console.log('🔔 Inicializando botão de notificações...');

        // Encontrar botão de notificações
        const notificationBtns = document.querySelectorAll('#notification-bell, .notification-btn[title="Notificações"]');
        
        if (notificationBtns.length === 0) {
            console.warn('⚠️ Botão de notificações não encontrado');
            return;
        }

        // Adicionar event listener em todos os botões encontrados
        notificationBtns.forEach((btn, index) => {
            // Adicionar ID se não tiver
            if (!btn.id) {
                btn.id = `notifications-btn-${index}`;
            }

            // Remover listeners anteriores
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            // Adicionar novo listener
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Toggle do painel de notificações
                if (typeof window.NotificationsManager !== 'undefined') {
                    window.NotificationsManager.togglePanel();
                }
            });

            // Atualizar badge
            updateNotificationBadge(newBtn);
            
            console.log(`✅ Botão de notificações #${index} configurado`);
        });

        // Atualizar badges periodicamente
        setInterval(() => {
            notificationBtns.forEach(btn => updateNotificationBadge(btn));
        }, 5000);
    }

    /**
     * Atualiza o badge de notificações no botão
     */
    function updateNotificationBadge(btn) {
        if (!btn || typeof window.NotificationsManager === 'undefined') return;

        const unreadCount = window.NotificationsManager.getUnreadCount();
        
        // Procurar ou criar badge
        let badge = btn.querySelector('.notification-badge');
        
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'notification-badge';
            btn.appendChild(badge);
        }

        // Atualizar badge
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'flex';
            btn.classList.add('has-notification');
        } else {
            badge.style.display = 'none';
            btn.classList.remove('has-notification');
        }
    }

    /**
     * Adicionar notificação de nova mensagem do chat
     */
    function addChatNotification(message, count = 1) {
        if (typeof window.NotificationsManager === 'undefined') return;

        window.NotificationsManager.addNotification({
            title: '💬 Nova Mensagem do Chat',
            message: message || `Você tem ${count} nova${count > 1 ? 's' : ''} mensagem${count > 1 ? 'ns' : ''}`,
            type: 'info',
            icon: 'fa-comments',
            time: new Date().toISOString()
        });
    }

    // Inicializar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNotificationButton);
    } else {
        initNotificationButton();
    }

    // Expor funções globalmente
    window.NotificationButton = {
        init: initNotificationButton,
        addChatNotification: addChatNotification,
        updateBadge: updateNotificationBadge
    };

    console.log('✅ NotificationButton module carregado');
})();
