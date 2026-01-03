const socket = io();

let currentUserId = null;
let activeUsers = new Map();
let chatHistories = new Map();

// Elementos DOM
const userList = document.getElementById('userList');
const welcomeScreen = document.getElementById('welcomeScreen');
const chatArea = document.getElementById('chatArea');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const chatMessages = document.getElementById('chatMessages');
const currentUserName = document.getElementById('currentUserName');
const currentUserEmail = document.getElementById('currentUserEmail');
const closeChatBtn = document.getElementById('closeChatBtn');
const activeCount = document.getElementById('activeCount');
const waitingCount = document.getElementById('waitingCount');

// Conectar como admin
socket.emit('admin:join');

// Receber lista de usuários ativos
socket.on('admin:active-users', (users) => {
    users.forEach(user => {
        activeUsers.set(user.id, user);
    });
    updateUserList();
    updateStats();
});

// Receber histórico de todas as conversas
socket.on('admin:all-history', (allHistory) => {
    Object.keys(allHistory).forEach(userId => {
        chatHistories.set(userId, allHistory[userId]);
    });
});

// Novo usuário conectou
socket.on('admin:new-user', (user) => {
    activeUsers.set(user.id, user);
    chatHistories.set(user.id, []);
    updateUserList();
    updateStats();
    
    // Tocar som de notificação
    playNotificationSound();
});

// Usuário desconectou
socket.on('admin:user-left', (userId) => {
    activeUsers.delete(userId);
    updateUserList();
    updateStats();
    
    if (currentUserId === userId) {
        showWelcomeScreen();
    }
});

// Renderizar lista de usuários
function updateUserList() {
    if (activeUsers.size === 0) {
        userList.innerHTML = `
            <div class="no-users">
                <p>Nenhum usuário conectado</p>
            </div>
        `;
        return;
    }
    
    userList.innerHTML = '';
    
    activeUsers.forEach((user, userId) => {
        const userItem = document.createElement('div');
        userItem.className = `user-item ${user.status}`;
        
        if (userId === currentUserId) {
            userItem.classList.add('active');
        }
        
        const statusText = user.status === 'waiting' ? 'Aguardando' : 'Em aténdimento';
        
        userItem.innerHTML = `
            <div class="user-name">${escapeHtml(user.name)}</div>
            <div class="user-email">${escapeHtml(user.email)}</div>
            <div class="user-status ${user.status}">${statusText}</div>
        `;
        
        userItem.addEventListener('click', () => selectUser(userId));
        userList.appendChild(userItem);
    });
}

// Selecionar usuário para aténder
function selectUser(userId) {
    const user = activeUsers.get(userId);
    if (!user) return;
    
    currentUserId = userId;
    
    // Aceitar o chat se ainda estiver aguardando
    if (user.status === 'waiting') {
        socket.emit('admin:accept-chat', userId);
    }
    
    // Atualizar interface
    currentUserName.textContent = user.name;
    currentUserEmail.textContent = user.email;
    
    welcomeScreen.style.display = 'none';
    chatArea.style.display = 'flex';
    
    // Carregar histórico
    loadChatHistory(userId);
    updateUserList();
    messageInput.focus();
}

// Carregar histórico de mensagens
function loadChatHistory(userId) {
    chatMessages.innerHTML = '';
    
    const history = chatHistories.get(userId) || [];
    history.forEach(message => {
        addMessage(message, message.from);
    });
    
    scrollToBottom();
}

// Chat aceito
socket.on('admin:chat-accepted', (data) => {
    const user = activeUsers.get(data.userId);
    if (user) {
        user.status = 'active';
        updateUserList();
    }
});

// Enviar mensagem
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!currentUserId) return;
    
    const message = messageInput.value.trim();
    
    if (message) {
        socket.emit('admin:message', { 
            userId: currentUserId, 
            message 
        });
        
        messageInput.value = '';
        messageInput.focus();
    }
});

// Mensagem enviada confirmada
socket.on('admin:message-sent', (data) => {
    addMessage(data.message, 'admin');
    
    // Adicionar ao histórico
    const history = chatHistories.get(data.userId) || [];
    history.push(data.message);
    chatHistories.set(data.userId, history);
});

// Receber mensagem do usuário
socket.on('admin:receive-message', (data) => {
    addMessage(data.message, 'user');
    
    // Adicionar ao histórico
    const history = chatHistories.get(data.userId) || [];
    history.push(data.message);
    chatHistories.set(data.userId, history);
    
    // Tocar som se não estiver focado no chat do usuário
    if (currentUserId !== data.userId) {
        playNotificationSound();
    }
});

// Usuário desconectou durante aténdimento
socket.on('admin:user-disconnected', (userId) => {
    if (currentUserId === userId) {
        addSystemMessage('Usuário desconectou');
    }
});

// Encerrar chat
closeChatBtn.addEventListener('click', () => {
    if (currentUserId) {
        socket.emit('chat:close', currentUserId);
        showWelcomeScreen();
        activeUsers.delete(currentUserId);
        updateUserList();
        updateStats();
    }
});

// Chat encerrado
socket.on('admin:chat-closed', (userId) => {
    if (currentUserId === userId) {
        showWelcomeScreen();
    }
    activeUsers.delete(userId);
    updateUserList();
    updateStats();
});

// Adicionar mensagem ao chat
function addMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const time = formatTime(new Date(message.timestamp));
    
    if (type === 'user') {
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-sender">${escapeHtml(message.userName)}</div>
                <div>${escapeHtml(message.text)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-content">
                <div>${escapeHtml(message.text)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
    }
    
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

// Mostrar tela de boas-vindas
function showWelcomeScreen() {
    currentUserId = null;
    welcomeScreen.style.display = 'flex';
    chatArea.style.display = 'none';
    updateUserList();
}

// Atualizar estatísticas
function updateStats() {
    let waiting = 0;
    let active = 0;
    
    activeUsers.forEach(user => {
        if (user.status === 'waiting') {
            waiting++;
        } else {
            active++;
        }
    });
    
    activeCount.textContent = active;
    waitingCount.textContent = waiting;
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

// Som de notificação
function playNotificationSound() {
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
        // Navegador não suporta Web Audio API
    }
}
