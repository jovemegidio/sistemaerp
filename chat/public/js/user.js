const socket = io();

let userId = null;
let userName = null;
let userEmail = null;
let isConnected = false;
let isWidgetOpen = false;

// Elementos DOM
const chatButton = document.getElementById('chatButton');
const chatWidget = document.getElementById('chatWidget');
const loginForm = document.getElementById('loginForm');
const chatContainer = document.getElementById('chatContainer');
const userForm = document.getElementById('userForm');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const chatMessages = document.getElementById('chatMessages');
const statusIndicator = document.getElementById('statusIndicator');
const minimizeChat = document.getElementById('minimizeChat');
const notificationBadge = document.getElementById('notificationBadge');

// Abrir/Fechar widget
chatButton.addEventListener('click', () => {
    isWidgetOpen = !isWidgetOpen;
    
    if (isWidgetOpen) {
        chatWidget.classList.add('open');
        chatButton.classList.add('active');
        notificationBadge.classList.remove('show');
    } else {
        chatWidget.classList.remove('open');
        chatButton.classList.remove('active');
    }
});

// Minimizar chat
minimizeChat.addEventListener('click', () => {
    isWidgetOpen = false;
    chatWidget.classList.remove('open');
    chatButton.classList.remove('active');
});

// Enviar dados do usuário e entrar no chat
userForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    userName = document.getElementById('userName').value.trim();
    userEmail = document.getElementById('userEmail').value.trim();
    
    if (userName && userEmail) {
        socket.emit('user:join', { name: userName, email: userEmail });
        
        loginForm.style.display = 'none';
        chatContainer.style.display = 'flex';
    }
});

// Usuário conectação com sucesso
socket.on('user:joined', (data) => {
    userId = data.userId;
    isConnected = true;
    addSystemMessage(data.message);
});

// Admin aceitou o chat
socket.on('admin:accepted', (data) => {
    statusIndicator.textContent = 'Aténdente conectação';
    statusIndicator.className = 'status-indicator active';
    
    messageInput.disabled = false;
    sendButton.disabled = false;
    
    addSystemMessage(data.message);
    messageInput.focus();
});

// Enviar mensagem
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    
    if (message && isConnected) {
        socket.emit('user:message', { message });
        messageInput.value = '';
        messageInput.focus();
    }
});

// Mensagem enviada confirmada
socket.on('user:message-sent', (message) => {
    addMessage(message, 'user');
});

// Receber mensagem do admin
socket.on('user:receive-message', (message) => {
    addMessage(message, 'admin');
    
    // Mostrar badge de notificação se widget fechação
    if (!isWidgetOpen) {
        notificationBadge.classList.add('show');
        notificationBadge.textContent = '1';
    }
    
    // Tocar som de notificação (opcional)
    playNotificationSound();
});

// Chat encerrado
socket.on('chat:closed', (data) => {
    addSystemMessage(data.message);
    messageInput.disabled = true;
    sendButton.disabled = true;
    statusIndicator.textContent = 'Chat encerrado';
    statusIndicator.className = 'status-indicator';
});

// Adicionar mensagem ao chat
function addMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const time = formatTime(new Date(message.timestamp));
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <div>${escapeHtml(message.text)}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Adicionar mensagem do sistema
function addSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system';
    
    messageDiv.innerHTML = `
        <div class="message-content">${escapeHtml(text)}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Rolar para o final do chat
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Formatar hora
function formatTime(date) {
    return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Escapar HTML para evitar XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Som de notificação (opcional)
function playNotificationSound() {
    // Criar um beep simples usando Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        // Navegaçãor não suporta Web Audio API
    }
}

// Detectar desconexão
socket.on('disconnect', () => {
    isConnected = false;
    addSystemMessage('Conexão perdida. Tentando reconectar...');
    messageInput.disabled = true;
    sendButton.disabled = true;
});

// Reconectação
socket.on('connect', () => {
    if (userId && userName) {
        // Tentar reconectar
        socket.emit('user:join', { name: userName, email: userEmail });
    }
});
