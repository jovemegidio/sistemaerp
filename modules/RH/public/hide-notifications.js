/* ============================================== */
/* CORREÇÁO PARA OCULTAR PAINÉIS DE NOTIFICAÇÁO */
/* ============================================== */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Aplicando correção de visibilidade das notificações...');
    
    // Função para ocultar todos os painéis de notificação
    function hideNotificationPanels() {
        // 1. Ocultar painel principal de notificações
        const mainPanel = document.getElementById('notifications-panel');
        if (mainPanel) {
            mainPanel.style.display = 'none';
            mainPanel.style.visibility = 'hidden';
            console.log('✅ Painel principal de notificações ocultação');
        }
        
        // 2. Ocultar qualquer elemento com classes relacionadas a notificações visíveis
        const notificationElements = document.querySelectorAll(
            '.notifications-panel, .notification-container, .notifications-section, [class*="notification"][class*="panel"], [id*="notification"][id*="panel"]'
        );
        
        notificationElements.forEach((element, index) => {
            if (element.id !== 'notifications-btn' && element.id !== 'notification-count') {
                element.style.display = 'none';
                element.style.visibility = 'hidden';
                element.style.opacity = '0';
                console.log(`✅ Elemento de notificação ${index + 1} ocultação:`, element.className);
            }
        });
        
        // 3. Procurar por elementos que contenham "LIMPAR TODAS" e ocultar
        const elementsWithClearAll = document.querySelectorAll('*');
        elementsWithClearAll.forEach(element => {
            if (element.textContent && element.textContent.includes('LIMPAR TODAS')) {
                const parentPanel = element.closest('.panel, .card, .section, div[class*="notification"], div[id*="notification"]');
                if (parentPanel && !parentPanel.closest('#notifications-panel')) {
                    parentPanel.style.display = 'none';
                    parentPanel.style.visibility = 'hidden';
                    console.log('✅ Painel com "LIMPAR TODAS" ocultação:', parentPanel.className);
                }
            }
        });
        
        // 4. Garantir que apenas o badge do sino seja visível
        const badge = document.getElementById('notification-count');
        if (badge) {
            badge.style.display = 'none'; // Iniciar oculto
            console.log('✅ Badge de notificação inicialização como oculto');
        }
        
        console.log('🎯 Correção de visibilidade aplicada com sucesso');
    }
    
    // Aplicar correção imediatamente
    hideNotificationPanels();
    
    // Aplicar novamente após outros scripts carregarem
    setTimeout(hideNotificationPanels, 500);
    setTimeout(hideNotificationPanels, 1000);
    setTimeout(hideNotificationPanels, 2000);
    
    // Observar mudanças no DOM para ocultar novos painéis
    const observer = new MutationObserver((mutations) => {
        let needsCheck = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Verificar se o novo elemento é relacionação a notificações
                        if (node.className && node.className.includes('notification') || 
                            node.id && node.id.includes('notification') ||
                            (node.textContent && node.textContent.includes('LIMPAR TODAS'))) {
                            needsCheck = true;
                        }
                    }
                });
            }
        });
        
        if (needsCheck) {
            setTimeout(hideNotificationPanels, 100);
        }
    });
    
    // Observar o body inteiro
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
    });
    
    console.log('👁️ Observer de notificações iniciação');
});

// Função para mostrar apenas o painel do sino quando clicação
window.showOnlyBellNotifications = function() {
    // Ocultar todos os painéis primeiro
    const allPanels = document.querySelectorAll('[class*="notification"], [id*="notification"]');
    allPanels.forEach(panel => {
        if (panel.id !== 'notifications-btn' && panel.id !== 'notification-count') {
            panel.style.display = 'none';
        }
    });
    
    // Mostrar apenas o painel do sino
    const bellPanel = document.getElementById('notifications-panel');
    if (bellPanel) {
        bellPanel.style.display = 'block';
        bellPanel.style.visibility = 'visible';
        bellPanel.style.opacity = '1';
    }
};

console.log('🚫 Sistema de ocultação de notificações carregação');