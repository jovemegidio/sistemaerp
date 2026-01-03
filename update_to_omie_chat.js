const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔄 Atualizando para Chat Padrão Omie...\n');

// ============================================================================
// 1. CRIAR CSS DO CHAT OMIE
// ============================================================================
console.log('1️⃣ Criando arquivos do Chat Omie...\n');

const chatOmieCSS = `/* ============================================
   CHAT WIDGET ALUFORCE - PADRÃO OMIE
   Visual verde/branco estilo Omie
   Version: 1.0 Omie Style
   ============================================ */

:root {
    /* Omie Brand Colors */
    --omie-green: #00a859;
    --omie-green-dark: #008a48;
    --omie-green-light: #e6f7f0;
    --omie-blue: #0066cc;
    --omie-gray: #f5f5f5;
    --omie-text: #333333;
    --omie-text-light: #666666;
}

/* Botão Flutuante */
.chat-floating-button {
    position: fixed !important;
    bottom: 24px !important;
    right: 24px !important;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--omie-green);
    border: none;
    box-shadow: 0 4px 12px rgba(0, 168, 89, 0.3);
    cursor: pointer;
    z-index: 9999 !important;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { box-shadow: 0 4px 12px rgba(0, 168, 89, 0.3); }
    50% { box-shadow: 0 4px 20px rgba(0, 168, 89, 0.5); }
}

.chat-floating-button:hover {
    background: var(--omie-green-dark);
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(0, 168, 89, 0.4);
}

.chat-floating-button svg {
    width: 28px;
    height: 28px;
    color: white;
}

/* Badge de Notificação */
.chat-notification-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    background: #ff4444;
    color: white;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    border: 2px solid white;
    animation: bounce 0.5s ease;
}

@keyframes bounce {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
}

/* Container do Chat */
.chat-widget-container {
    position: fixed !important;
    bottom: 100px !important;
    right: 24px !important;
    width: 380px;
    height: 600px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    z-index: 9998 !important;
    display: none;
    flex-direction: column;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.chat-widget-container.active {
    display: flex;
    animation: slideUp 0.3s ease;
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Header do Chat */
.chat-header {
    background: var(--omie-green);
    color: white;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.chat-header-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.chat-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    color: var(--omie-green);
    font-size: 18px;
}

.chat-header-text h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
}

.chat-header-text p {
    margin: 4px 0 0;
    font-size: 12px;
    opacity: 0.9;
}

.chat-close-btn {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    transition: all 0.2s;
}

.chat-close-btn:hover {
    background: rgba(255, 255, 255, 0.2);
}

.chat-close-btn svg {
    width: 20px;
    height: 20px;
}

/* Corpo do Chat */
.chat-body {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    background: var(--omie-gray);
}

.chat-message {
    margin-bottom: 16px;
    display: flex;
    gap: 8px;
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.chat-message.user {
    flex-direction: row-reverse;
}

.chat-message-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--omie-green);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    flex-shrink: 0;
}

.chat-message.user .chat-message-avatar {
    background: var(--omie-blue);
}

.chat-message-content {
    max-width: 70%;
}

.chat-message-bubble {
    background: white;
    padding: 12px 16px;
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    word-wrap: break-word;
}

.chat-message.user .chat-message-bubble {
    background: var(--omie-green);
    color: white;
}

.chat-message-time {
    font-size: 11px;
    color: var(--omie-text-light);
    margin-top: 4px;
    padding: 0 8px;
}

/* Quick Replies */
.chat-quick-replies {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
}

.chat-quick-reply {
    background: white;
    border: 1px solid var(--omie-green);
    color: var(--omie-green);
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
}

.chat-quick-reply:hover {
    background: var(--omie-green);
    color: white;
}

/* Footer do Chat */
.chat-footer {
    padding: 16px;
    background: white;
    border-top: 1px solid #e0e0e0;
}

.chat-input-wrapper {
    display: flex;
    gap: 8px;
    align-items: flex-end;
}

.chat-input {
    flex: 1;
    padding: 12px 16px;
    border: 1px solid #e0e0e0;
    border-radius: 24px;
    font-size: 14px;
    resize: none;
    max-height: 100px;
    font-family: inherit;
}

.chat-input:focus {
    outline: none;
    border-color: var(--omie-green);
}

.chat-send-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--omie-green);
    border: none;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
}

.chat-send-btn:hover {
    background: var(--omie-green-dark);
    transform: scale(1.1);
}

.chat-send-btn svg {
    width: 18px;
    height: 18px;
}

.chat-send-btn:disabled {
    background: #cccccc;
    cursor: not-allowed;
    transform: none;
}

/* Typing Indicator */
.chat-typing {
    display: flex;
    gap: 4px;
    padding: 12px 16px;
    background: white;
    border-radius: 16px;
    width: fit-content;
}

.chat-typing-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--omie-green);
    animation: typing 1.4s infinite;
}

.chat-typing-dot:nth-child(2) { animation-delay: 0.2s; }
.chat-typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.7; }
    30% { transform: translateY(-10px); opacity: 1; }
}

/* Responsivo */
@media (max-width: 768px) {
    .chat-widget-container {
        width: 100%;
        height: 100%;
        bottom: 0 !important;
        right: 0 !important;
        border-radius: 0;
    }
    
    .chat-floating-button {
        bottom: 20px !important;
        right: 20px !important;
    }
}

/* Scrollbar */
.chat-body::-webkit-scrollbar {
    width: 6px;
}

.chat-body::-webkit-scrollbar-track {
    background: transparent;
}

.chat-body::-webkit-scrollbar-thumb {
    background: #cccccc;
    border-radius: 3px;
}

.chat-body::-webkit-scrollbar-thumb:hover {
    background: #999999;
}
`;

const chatOmieJS = `// ============================================
// CHAT WIDGET ALUFORCE - PADRÃO OMIE
// ============================================

class ChatWidgetOmie {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.init();
    }

    init() {
        this.createWidget();
        this.attachEventListeners();
        this.loadWelcomeMessage();
    }

    createWidget() {
        const widget = document.createElement('div');
        widget.innerHTML = \`
            <!-- Botão Flutuante -->
            <button class="chat-floating-button" id="chatFloatingBtn" title="Chat Aluforce">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                <span class="chat-notification-badge" id="chatBadge" style="display: none;">0</span>
            </button>

            <!-- Container do Chat -->
            <div class="chat-widget-container" id="chatWidget">
                <div class="chat-header">
                    <div class="chat-header-info">
                        <div class="chat-avatar">A</div>
                        <div class="chat-header-text">
                            <h3>Suporte Aluforce</h3>
                            <p>Online • Responde em minutos</p>
                        </div>
                    </div>
                    <button class="chat-close-btn" id="chatCloseBtn">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div class="chat-body" id="chatBody">
                    <!-- Mensagens serão inseridas aqui -->
                </div>

                <div class="chat-footer">
                    <div class="chat-input-wrapper">
                        <textarea 
                            class="chat-input" 
                            id="chatInput" 
                            placeholder="Digite sua mensagem..."
                            rows="1"
                        ></textarea>
                        <button class="chat-send-btn" id="chatSendBtn">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        \`;
        document.body.appendChild(widget);
    }

    attachEventListeners() {
        const floatingBtn = document.getElementById('chatFloatingBtn');
        const closeBtn = document.getElementById('chatCloseBtn');
        const sendBtn = document.getElementById('chatSendBtn');
        const input = document.getElementById('chatInput');

        floatingBtn.addEventListener('click', () => this.toggleChat());
        closeBtn.addEventListener('click', () => this.closeChat());
        sendBtn.addEventListener('click', () => this.sendMessage());
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = input.scrollHeight + 'px';
        });
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        const widget = document.getElementById('chatWidget');
        
        if (this.isOpen) {
            widget.classList.add('active');
            document.getElementById('chatInput').focus();
            this.clearBadge();
        } else {
            widget.classList.remove('active');
        }
    }

    closeChat() {
        this.isOpen = false;
        document.getElementById('chatWidget').classList.remove('active');
    }

    loadWelcomeMessage() {
        setTimeout(() => {
            this.addMessage('bot', 'Olá! 👋 Seja bem-vindo ao suporte Aluforce. Como posso ajudar você hoje?');
            
            const quickReplies = [
                'Preciso de ajuda',
                'Falar com vendas',
                'Suporte técnico'
            ];
            
            this.addQuickReplies(quickReplies);
        }, 500);
    }

    sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        this.addMessage('user', message);
        input.value = '';
        input.style.height = 'auto';
        
        // Simular resposta do bot
        setTimeout(() => {
            this.showTyping();
            setTimeout(() => {
                this.hideTyping();
                this.addMessage('bot', 'Obrigado pela sua mensagem! Nossa equipe irá responder em breve.');
            }, 1500);
        }, 500);
    }

    addMessage(type, text) {
        const chatBody = document.getElementById('chatBody');
        const messageDiv = document.createElement('div');
        messageDiv.className = \`chat-message \${type}\`;
        
        const now = new Date();
        const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = \`
            <div class="chat-message-avatar">\${type === 'user' ? 'U' : 'A'}</div>
            <div class="chat-message-content">
                <div class="chat-message-bubble">\${text}</div>
                <div class="chat-message-time">\${time}</div>
            </div>
        \`;
        
        chatBody.appendChild(messageDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
        
        this.messages.push({ type, text, time });
    }

    addQuickReplies(replies) {
        const chatBody = document.getElementById('chatBody');
        const repliesDiv = document.createElement('div');
        repliesDiv.className = 'chat-quick-replies';
        
        replies.forEach(reply => {
            const btn = document.createElement('button');
            btn.className = 'chat-quick-reply';
            btn.textContent = reply;
            btn.onclick = () => {
                this.addMessage('user', reply);
                repliesDiv.remove();
                this.handleQuickReply(reply);
            };
            repliesDiv.appendChild(btn);
        });
        
        chatBody.appendChild(repliesDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    handleQuickReply(reply) {
        setTimeout(() => {
            this.showTyping();
            setTimeout(() => {
                this.hideTyping();
                
                let response = '';
                if (reply.includes('ajuda')) {
                    response = 'Claro! Estou aqui para ajudar. Você pode me contar mais sobre o que precisa?';
                } else if (reply.includes('vendas')) {
                    response = 'Ótimo! Vou te conectar com nossa equipe de vendas. Aguarde um momento.';
                } else if (reply.includes('técnico')) {
                    response = 'Entendi. Qual é o problema técnico que você está enfrentando?';
                }
                
                this.addMessage('bot', response);
            }, 1500);
        }, 500);
    }

    showTyping() {
        const chatBody = document.getElementById('chatBody');
        const typingDiv = document.createElement('div');
        typingDiv.id = 'chatTyping';
        typingDiv.className = 'chat-message bot';
        typingDiv.innerHTML = \`
            <div class="chat-message-avatar">A</div>
            <div class="chat-typing">
                <div class="chat-typing-dot"></div>
                <div class="chat-typing-dot"></div>
                <div class="chat-typing-dot"></div>
            </div>
        \`;
        chatBody.appendChild(typingDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    hideTyping() {
        const typing = document.getElementById('chatTyping');
        if (typing) typing.remove();
    }

    showBadge(count) {
        const badge = document.getElementById('chatBadge');
        if (badge && count > 0) {
            badge.textContent = count;
            badge.style.display = 'flex';
        }
    }

    clearBadge() {
        const badge = document.getElementById('chatBadge');
        if (badge) {
            badge.style.display = 'none';
            badge.textContent = '0';
        }
    }
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ChatWidgetOmie();
    });
} else {
    new ChatWidgetOmie();
}
`;

// Salvar arquivos
const cssPath = path.join(__dirname, 'public', 'css', 'chat-omie.css');
const jsPath = path.join(__dirname, 'public', 'js', 'chat-omie.js');

fs.writeFileSync(cssPath, chatOmieCSS, 'utf8');
fs.writeFileSync(jsPath, chatOmieJS, 'utf8');

console.log('   ✅ chat-omie.css criado');
console.log('   ✅ chat-omie.js criado\n');

// ============================================================================
// 2. ATUALIZAR TODOS OS ARQUIVOS HTML
// ============================================================================
console.log('2️⃣ Atualizando todos os módulos e painel de controle...\n');

const newChatCode = `
<!-- Chat Widget Padrão Omie -->
<link rel="stylesheet" href="/css/chat-omie.css?v=20251210">
<script src="/js/chat-omie.js?v=20251210"></script>
`;

// Padrões de chat antigos para remover
const oldChatPatterns = [
    // Chat widget atual
    /<!--\s*Chat Widget[^>]*-->\s*<link[^>]*chat-widget\.css[^>]*>\s*<script[^>]*chat-widget\.js[^>]*><\/script>\s*/gi,
    
    // Chat widget SaaS Premium
    /<!--\s*Chat Widget SaaS Premium\s*-->\s*<link[^>]*chat-widget\.css[^>]*>\s*<script[^>]*chat-widget\.js[^>]*><\/script>\s*/gi,
    
    // Qualquer chat-widget
    /<link[^>]*chat-widget\.css[^>]*>\s*<script[^>]*chat-widget\.js[^>]*><\/script>/gi,
    
    // Chat omie antigo se existir
    /<link[^>]*chat-omie\.css[^>]*>\s*<script[^>]*chat-omie\.js[^>]*><\/script>/gi
];

// Encontrar todos os arquivos HTML
const patterns = [
    'public/index.html',
    'modules/Compras/**/*.html',
    'modules/Financeiro/**/*.html',
    'modules/NFe/**/*.html',
    'modules/PCP/index.html',
    'modules/RH/public/*.html',
    'modules/Vendas/public/*.html'
];

let filesUpdated = 0;
let filesWithErrors = 0;

patterns.forEach(pattern => {
    const files = glob.sync(pattern, { cwd: __dirname });
    
    files.forEach(file => {
        try {
            const fullPath = path.join(__dirname, file);
            let content = fs.readFileSync(fullPath, 'utf8');
            const originalContent = content;
            
            // Remover todos os chats antigos
            oldChatPatterns.forEach(pattern => {
                content = content.replace(pattern, '');
            });
            
            // Verificar se já tem o novo chat Omie
            const hasNewChat = content.includes('chat-omie.css') && content.includes('chat-omie.js');
            
            if (!hasNewChat) {
                // Adicionar novo chat antes do </body>
                if (content.includes('</body>')) {
                    content = content.replace('</body>', newChatCode + '</body>');
                }
            }
            
            // Salvar se houver mudanças
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('   ✅ ' + file);
                filesUpdated++;
            }
        } catch (error) {
            console.log('   ❌ ' + file + ' - Erro: ' + error.message);
            filesWithErrors++;
        }
    });
});

console.log('\n📊 Resumo:');
console.log('   • Arquivos atualizados: ' + filesUpdated);
console.log('   • Arquivos com erro: ' + filesWithErrors);

console.log('\n✅ Chat Padrão Omie instalado em todos os módulos!');
console.log('\n🎨 Características do Chat Omie:');
console.log('   • Design verde/branco (padrão Omie)');
console.log('   • Botão flutuante com animação pulse');
console.log('   • Interface limpa e profissional');
console.log('   • Quick replies para respostas rápidas');
console.log('   • Indicador de digitação');
console.log('   • Badge de notificações');
console.log('   • Totalmente responsivo');

console.log('\n📋 Próximos passos:');
console.log('1. Reinicie o servidor Node.js');
console.log('2. Limpe o cache do navegador (Ctrl+Shift+Delete)');
console.log('3. Recarregue qualquer página');
console.log('4. Clique no botão verde no canto inferior direito');
