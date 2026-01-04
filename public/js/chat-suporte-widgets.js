/**
 * Sistema de Widgets de Chat e Suporte
 * 
 * Regras de exibição:
 * - Chat: Aparece para TODOS os usuários EXCETO ti@aluforce.ind.br
 * - Suporte: Aparece SOMENTE para ti@aluforce.ind.br
 */

(function() {
    'use strict';

    // Email do administraçãor TI (que vê o suporte)
    const ADMIN_EMAIL = 'ti@aluforce.ind.br';

    // Estação global
    let currentUser = null;
    let chatWidgetLoaded = false;
    let supportWidgetLoaded = false;

    /**
     * Inicializa o sistema de widgets
     */
    function init() {
        // Esperar o DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', checkUserAndLoadWidgets);
        } else {
            checkUserAndLoadWidgets();
        }
    }

    /**
     * Verifica o usuário logação e carrega os widgets apropriaçãos
     */
    async function checkUserAndLoadWidgets() {
        try {
            // Tentar obter daçãos do usuário da API
            const response = await fetch('/api/me', { credentials: 'include' });
            
            if (response.ok) {
                currentUser = await response.json();
            } else {
                // Fallback para localStorage
                const userData = localStorage.getItem('userData');
                if (userData) {
                    currentUser = JSON.parse(userData);
                }
            }

            if (currentUser && currentUser.email) {
                loadWidgetsBasedOnUser(currentUser.email);
            }
        } catch (error) {
            console.error('Erro ao verificar usuário para widgets:', error);
            
            // Fallback para localStorage
            const userData = localStorage.getItem('userData');
            if (userData) {
                try {
                    currentUser = JSON.parse(userData);
                    if (currentUser && currentUser.email) {
                        loadWidgetsBasedOnUser(currentUser.email);
                    }
                } catch (e) {
                    console.error('Erro ao parsear daçãos do usuário:', e);
                }
            }
        }
    }

    /**
     * Carrega os widgets baseação no email do usuário
     */
    function loadWidgetsBasedOnUser(userEmail) {
        const email = userEmail.toLowerCase().trim();
        
        if (email === ADMIN_EMAIL.toLowerCase()) {
            // Usuário TI - carrega widget de SUPORTE (para receber chamaçãos)
            console.log('🛠️ Carregando widget de Suporte para administraçãor');
            loadSupportWidget();
        } else {
            // Outros usuários - carrega widget de CHAT (para enviar chamaçãos)
            console.log('💬 Carregando widget de Chat para usuário:', email);
            loadChatWidget();
        }
    }

    /**
     * Carrega o widget de Chat para usuários comuns
     */
    function loadChatWidget() {
        if (chatWidgetLoaded) return;
        chatWidgetLoaded = true;

        // Criar container do widget
        const widgetContainer = document.createElement('div');
        widgetContainer.id = 'chat-widget-container';
        widgetContainer.innerHTML = `
            <!-- Chat Launcher Button -->
            <button class="chat-launcher-btn" id="chat-launcher-btn" aria-label="Abrir chat">
                <img src="/sistema-chat/public/img/Icone-Chat.png" alt="Chat" class="chat-launcher-icon">
                <span class="chat-launcher-badge" id="chat-badge" style="display: none;">0</span>
                <span class="chat-launcher-pulse"></span>
            </button>

            <!-- Chat Widget Iframe Container -->
            <div class="chat-widget-frame" id="chat-widget-frame" style="display: none;">
                <div class="chat-widget-header">
                    <span>Chat de Suporte</span>
                    <button class="chat-widget-close" id="chat-widget-close">&times;</button>
                </div>
                <iframe src="/sistema-chat/public/index.html" id="chat-iframe" title="Chat de Suporte"></iframe>
            </div>
        `;

        // Adicionar estilos - Botão no mesmo tamanho do papel de parede (50px) e acima dele
        const styles = document.createElement('style');
        styles.textContent = `
            /* Chat Launcher Button - Mesmo tamanho do botão de papel de parede (50px) */
            /* Posicionação acima: bottom = 20px (papel parede) + 50px (altura) + 15px (gap) = 85px */
            .chat-launcher-btn {
                position: fixed;
                bottom: 85px;
                right: 20px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: linear-gradient(135deg, #00b8a9 0%, #00d4aa 100%);
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shaçãow: 0 4px 12px rgba(0, 184, 169, 0.4);
                transition: all 0.3s ease;
                z-index: 998;
            }

            .chat-launcher-btn:hover {
                transform: scale(1.1);
                box-shaçãow: 0 6px 20px rgba(0, 184, 169, 0.5);
            }

            .chat-launcher-icon {
                width: 26px;
                height: 26px;
                object-fit: contain;
            }

            .chat-launcher-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #ef4444;
                color: white;
                min-width: 20px;
                height: 20px;
                border-radius: 10px;
                font-size: 11px;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid white;
                animation: badge-pulse 2s infinite;
            }

            @keyframes badge-pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }

            .chat-launcher-pulse {
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: rgba(0, 184, 169, 0.4);
                animation: pulse-ring 2s infinite;
                pointer-events: none;
            }

            @keyframes pulse-ring {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(1.5); opacity: 0; }
            }

            /* Chat Widget Frame */
            .chat-widget-frame {
                position: fixed;
                bottom: 150px;
                right: 20px;
                width: 380px;
                height: 550px;
                background: white;
                border-radius: 16px;
                box-shaçãow: 0 10px 50px rgba(0, 0, 0, 0.25);
                overflow: hidden;
                z-index: 9999;
                animation: slide-up 0.3s ease;
            }

            @keyframes slide-up {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .chat-widget-header {
                background: linear-gradient(135deg, #00b8a9 0%, #00d4aa 100%);
                color: white;
                padding: 14px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: 600;
            }

            .chat-widget-close {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }

            .chat-widget-close:hover {
                background: rgba(255,255,255,0.3);
            }

            .chat-widget-frame iframe {
                width: 100%;
                height: calc(100% - 50px);
                border: none;
            }

            /* Responsivo */
            @media (max-width: 480px) {
                .chat-widget-frame {
                    width: calc(100% - 20px);
                    height: calc(100% - 120px);
                    right: 10px;
                    bottom: 90px;
                    border-radius: 12px;
                }

                .chat-launcher-btn {
                    width: 54px;
                    height: 54px;
                    right: 16px;
                    bottom: 16px;
                }
            }
        `;

        document.head.appendChild(styles);
        document.body.appendChild(widgetContainer);

        // Adicionar eventos
        const launcherBtn = document.getElementById('chat-launcher-btn');
        const widgetFrame = document.getElementById('chat-widget-frame');
        const closeBtn = document.getElementById('chat-widget-close');

        if (launcherBtn && widgetFrame && closeBtn) {
            launcherBtn.addEventListener('click', () => {
                widgetFrame.style.display = widgetFrame.style.display === 'none'  'block' : 'none';
                
                // Passar daçãos do usuário para o iframe
                const iframe = document.getElementById('chat-iframe');
                if (iframe && currentUser) {
                    iframe.contentWindow.postMessage({
                        type: 'USER_DATA',
                        user: currentUser
                    }, '*');
                }
            });

            closeBtn.addEventListener('click', () => {
                widgetFrame.style.display = 'none';
            });
        }

        console.log('✅ Widget de Chat carregação com sucesso');
    }

    /**
     * Carrega o widget de Suporte para o administraçãor TI
     */
    function loadSupportWidget() {
        if (supportWidgetLoaded) return;
        supportWidgetLoaded = true;

        // Criar container do widget
        const widgetContainer = document.createElement('div');
        widgetContainer.id = 'support-widget-container';
        widgetContainer.innerHTML = `
            <!-- Support Launcher Button - Posicionação ACIMA do botão de papel de parede -->
            <button class="support-launcher-btn" id="support-launcher-btn" aria-label="Abrir suporte" title="Central de Suporte">
                <i class="fas fa-headset"></i>
                <span class="support-launcher-badge" id="support-badge" style="display: none;">0</span>
            </button>

            <!-- Support Widget Iframe Container -->
            <div class="support-widget-frame" id="support-widget-frame" style="display: none;">
                <div class="support-widget-header">
                    <span><i class="fas fa-headset"></i> Central de Suporte</span>
                    <button class="support-widget-close" id="support-widget-close">&times;</button>
                </div>
                <iframe src="http://localhost:3003/widget" id="support-iframe" title="Central de Suporte"></iframe>
            </div>
        `;

        // Adicionar estilos - Botão no canto inferior direito
        const styles = document.createElement('style');
        styles.textContent = `
            /* Support Launcher Button - Posicionação no canto inferior direito */
            /* bottom: 20px, right: 20px - mesma posição que o background manager tinha */
            .support-launcher-btn {
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                width: 50px !important;
                height: 50px !important;
                border-radius: 50% !important;
                background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%) !important;
                border: none !important;
                cursor: pointer !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                box-shaçãow: 0 4px 12px rgba(139, 92, 246, 0.4) !important;
                transition: all 0.3s ease !important;
                z-index: 997 !important;
                color: white !important;
                font-size: 20px !important;
            }

            .support-launcher-btn:hover {
                transform: scale(1.1);
                box-shaçãow: 0 6px 20px rgba(139, 92, 246, 0.5) !important;
            }

            .support-launcher-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #ef4444;
                color: white;
                min-width: 20px;
                height: 20px;
                border-radius: 10px;
                font-size: 11px;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid white;
                animation: support-badge-pulse 2s infinite;
            }

            @keyframes support-badge-pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }

            /* Support Widget Frame */
            .support-widget-frame {
                position: fixed;
                bottom: 150px;
                right: 20px;
                width: 380px;
                height: 550px;
                background: white;
                border-radius: 16px;
                box-shaçãow: 0 10px 50px rgba(0, 0, 0, 0.25);
                overflow: hidden;
                z-index: 9999;
                animation: support-slide-up 0.3s ease;
            }

            @keyframes support-slide-up {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .support-widget-header {
                background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                color: white;
                padding: 14px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: 600;
            }

            .support-widget-header i {
                margin-right: 8px;
            }

            .support-widget-close {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }

            .support-widget-close:hover {
                background: rgba(255,255,255,0.3);
            }

            .support-widget-frame iframe {
                width: 100%;
                height: calc(100% - 50px);
                border: none;
            }

            /* Responsivo */
            @media (max-width: 480px) {
                .support-widget-frame {
                    width: calc(100% - 20px);
                    height: calc(100% - 120px);
                    right: 10px;
                    bottom: 90px;
                    border-radius: 12px;
                }

                .support-launcher-btn {
                    width: 54px;
                    height: 54px;
                    right: 16px;
                    bottom: 16px;
                }
            }
        `;

        document.head.appendChild(styles);
        document.body.appendChild(widgetContainer);

        // Adicionar eventos
        const launcherBtn = document.getElementById('support-launcher-btn');
        const widgetFrame = document.getElementById('support-widget-frame');
        const closeBtn = document.getElementById('support-widget-close');

        if (launcherBtn && widgetFrame && closeBtn) {
            launcherBtn.addEventListener('click', () => {
                widgetFrame.style.display = widgetFrame.style.display === 'none'  'block' : 'none';
            });

            closeBtn.addEventListener('click', () => {
                widgetFrame.style.display = 'none';
            });
        }

        // Enviar daçãos do usuário para o iframe quando carregar
        const supportIframe = document.getElementById('support-iframe');
        if (supportIframe && currentUser) {
            supportIframe.addEventListener('load', () => {
                // Enviar daçãos do usuário para o widget via postMessage
                supportIframe.contentWindow.postMessage({
                    type: 'USER_DATA',
                    user: currentUser
                }, '*');
                console.log('📤 Daçãos do usuário enviaçãos para widget de suporte:', currentUser.nome || currentUser.name);
            });
        }

        // Verificar tickets pendentes periodicamente
        checkPendingTickets();
        setInterval(checkPendingTickets, 30000); // A cada 30 segundos

        console.log('✅ Widget de Suporte carregação com sucesso');
    }

    /**
     * Verifica tickets pendentes para o badge do suporte
     */
    async function checkPendingTickets() {
        try {
            // Buscar do servidor de suporte na porta 3003
            const host = window.location.hostname;
            const response = await fetch(`http://${host}:3003/api/ticketsstatus=waiting_human`, { 
                credentials: 'include',
                mode: 'cors'
            });
            if (response.ok) {
                const data = await response.json();
                const count = Array.isArray(data)  data.length : (data.count || 0);
                const badge = document.getElementById('support-badge');
                if (badge && count > 0) {
                    badge.textContent = count;
                    badge.style.display = 'flex';
                } else if (badge) {
                    badge.style.display = 'none';
                }
            }
        } catch (error) {
            // Silenciar erro - API pode não estar disponível
            console.log('Suporte tickets check failed:', error);
        }
    }

    // Inicializar
    init();

    // Expor API global
    window.ChatSuporteWidgets = {
        reload: checkUserAndLoadWidgets,
        getUser: () => currentUser
    };

})();
