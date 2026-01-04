// ================================================
// Sistema de Chat e Suporte com IA
// ================================================

class ChatSupportApp {
  constructor() {
    // Estação do usuário
    this.user = null;
    this.isLoggedIn = false;
    
    // Estação do chat
    this.conversations = [];
    this.currentConversation = null;
    this.isWithAI = true;
    this.transferredToHuman = false;
    
    // Estação dos tickets
    this.tickets = [];
    this.currentTicket = null;
    
    // Gravação de voz
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    
    // Chamada
    this.callTimer = null;
    this.callSeconds = 0;
    this.isMuted = false;
    this.isSpeakerOn = false;
    
    // Socket
    this.socket = null;
    
    // Base de conhecimento da IA - Expandida para uso diário
    this.aiKnowledgeBase = {
      greetings: [
        'Olá! Sou o Bob, seu assistente virtual. Como posso ajudar você hoje',
        'Oi! Eu sou o Bob. Bem-vindo ao suporte! Em que posso ajudar',
        'Olá! Aqui é o Bob. Estou aqui para ajudar. Qual é sua dúvida',
        'Olá! Sou o Bob! Seja bem-vindo! Estou pronto para ajudar você.',
        'Oi! Bob aqui! Como posso tornar seu dia melhor'
      ],
      responses: {
        // Saudações
        'oi': 'Olá! Como posso ajudar você hoje',
        'olá': 'Oi! Seja bem-vindo! Em que posso ajudar',
        'ola': 'Oi! Seja bem-vindo! Em que posso ajudar',
        'bom dia': 'Bom dia! Como posso ajudar você hoje',
        'boa tarde': 'Boa tarde! Em que posso ser útil',
        'boa noite': 'Boa noite! Como posso ajudar',
        'hey': 'Oi! Como posso ajudar você',
        'e aí': 'Olá! Tudo bem Em que posso ajudar',
        'eae': 'Oi! Tudo certo Como posso ajudar',
        
        // Ajuda geral
        'ajuda': 'Claro! Posso ajudar com diversas questões:\n\n• 💳 Pagamentos e cobranças\n• 👤 Sua conta e configurações\n• 🔧 Suporte técnico\n• 📦 Produtos e serviços\n• 📋 Acompanhar pedidos\n\nSobre qual assunto você precisa de ajuda',
        'preciso de ajuda': 'Estou aqui para isso! Me conta qual é sua dúvida ou problema.',
        'me ajuda': 'Claro! Pode me contar o que está acontecendo',
        'socorro': 'Calma, estou aqui! Me explique o que está acontecendo para eu poder ajudar.',
        
        // Sistema
        'sistema': 'Nosso sistema oferece várias funcionalidades. Você pode acessar o menu principal para ver todas as opções. Deseja saber sobre alguma função específica',
        'funciona': 'O sistema funciona de forma simples e intuitiva! Você pode acessar todas as funcionalidades pelo menu principal. Quer saber sobre algum recurso específico',
        'como funciona': 'Fico feliz em explicar! O sistema é bem intuitivo. Qual funcionalidade você gostaria de conhecer melhor',
        'como usar': 'É muito simples! O que você gostaria de fazer Posso te guiar passo a passo.',
        'tutorial': 'Temos vários tutoriais disponíveis na aba Ajuda. Sobre qual recurso você precisa de orientação',
        
        // Comercial
        'contratar': 'Ótimo! Ficamos felizes com seu interesse! 🎉\n\nNossos planos:\n• Básico: R$ 49,90/mês\n• Profissional: R$ 99,90/mês\n• Empresarial: R$ 199,90/mês\n\nDeseja que eu transfira você para um consultor de vendas',
        'preço': 'Nossos planos começam a partir de R$ 49,90/mês. Temos opções para todos os tamanhos de empresa. Quer saber mais detalhes',
        'plano': 'Temos planos flexíveis para atender suas necessidades. Qual é o tamanho da sua empresa ou equipe',
        'desconto': 'Para informações sobre descontos e promoções, posso conectar você com nossa equipe comercial. Deseja falar com um consultor',
        'promoção': 'Temos promoções especiais! Gostaria de falar com nosso time comercial para saber mais',
        'valor': 'O valor depende do plano escolhido. Nossos planos variam de R$ 49,90 a R$ 199,90/mês. Qual seu perfil de uso',
        
        // Conta e assinatura
        'assinatura': 'Sobre sua assinatura, você pode verificar os detalhes na área "Minha Conta". Está tendo algum problema específico com ela',
        'conta': 'Para questões sobre sua conta, posso ajudar com: alteração de daçãos, senha, configurações e muito mais. O que você precisa',
        'senha': 'Para redefinir sua senha:\n1. Clique em "Esqueci minha senha" na tela de login\n2. Digite seu e-mail\n3. Verifique sua caixa de entrada\n4. Clique no link recebido\n\nEstá com dificuldade nesse processo',
        'cancelar': 'Sentimos muito que queira cancelar! 😢 Posso saber o motivo Talvez possamos ajudar a resolver antes do cancelamento.',
        'cancelamento': 'Para processar um cancelamento, preciso conectar você com nossa equipe. Antes, podemos tentar resolver algum problema',
        'alterar': 'Você pode alterar suas informações na área "Minha Conta". Precisa de ajuda para encontrar',
        
        // Pagamento
        'pagamento': 'Para questões de pagamento, aceitamos:\n• 💳 Cartão de crédito\n• 📋 Boleto bancário\n• 📱 PIX\n\nEstá com alguma dificuldade',
        'boleto': 'O boleto é enviação por e-mail e também fica disponível na área do cliente. Não recebeu o seu',
        'cartão': 'Aceitamos as principais bandeiras: Visa, Mastercard, Elo e American Express. Está tendo problemas com o pagamento',
        'pix': 'O PIX é processação instantaneamente! O código fica disponível na área de pagamentos. Precisa de ajuda',
        'fatura': 'Suas faturas ficam disponíveis na área "Financeiro" da sua conta. Está com dúvida sobre alguma cobrança',
        'cobrança': 'Posso verificar suas cobranças. Você está questionando algum valor específico',
        'reembolso': 'Para solicitar reembolso, preciso entender melhor a situação. Pode me contar o que aconteceu',
        'estorno': 'Vou verificar a possibilidade de estorno. Qual foi o problema com a cobrança',
        
        // Problemas
        'problema': 'Entendo que você está com um problema. Pode me descrever com mais detalhes o que está acontecendo',
        'erro': 'Lamento pelo inconveniente! Pode me descrever o erro que está aparecendo',
        'bug': 'Obrigação por reportar! Pode me contar exatamente o que aconteceu e onde você viu o problema',
        'não funciona': 'Vamos resolver isso! O que exatamente não está funcionando',
        'não consigo': 'Entendo sua dificuldade. O que você está tentando fazer',
        'travou': 'Que chato! Vamos resolver. O que você estava fazendo quando travou',
        'lento': 'O sistema está lento Pode ser sua conexão ou podemos ter algum problema. Há quanto tempo está assim',
        
        // Suporte técnico
        'técnico': 'Para suporte técnico, preciso entender melhor a situação. Qual erro ou comportamento inesperação você está observando',
        'suporte': 'Estou aqui para ajudar! Você pode me contar qual é sua dúvida ou problema, e farei o possível para resolver.',
        'suporte tecnico': 'Claro! Me conte o problema técnico que você está enfrentando.',
        
        // Transferência para humano
        'atendente': 'Entendido! Vou transferir você para um de nossos atendentes humanos. Um momento, por favor...',
        'humano': 'Sem problemas! Vou conectar você com um membro da nossa equipe agora mesmo...',
        'pessoa': 'Claro! Vou transferir sua conversa para um atendente humano. Aguarde um momento...',
        'falar com alguem': 'Vou conectar você com nossa equipe de atendimento. Aguarde um momento...',
        'quero falar': 'Claro! Vou transferir você para um atendente. Um momento...',
        'atendimento humano': 'Sem problemas! Transferindo para um especialista...',
        
        // Agradecimentos e despedidas
        'obrigação': 'Por nada! Fico feliz em ajudar. 😊 Há mais alguma coisa que posso fazer por você',
        'obrigada': 'De nada! Foi um prazer ajudar! Precisa de mais alguma coisa',
        'valeu': 'Disponha! 👍 Posso ajudar em algo mais',
        'tchau': 'Até logo! Se precisar de mais alguma coisa, estarei aqui. Tenha um ótimo dia! 👋',
        'até mais': 'Até mais! Volte sempre que precisar. 😊',
        'adeus': 'Até a próxima! Foi um prazer atendê-lo.',
        'flw': 'Falou! Volte quando precisar! 👍',
        
        // Horário de funcionamento
        'horário': 'Nosso atendimento funciona:\n• Segunda a Sexta: 8h às 18h\n• Sábação: 9h às 13h\n• Domingo: Fechação\n\nMas eu (assistente virtual) estou disponível 24h!',
        'funcionamento': 'O atendimento humano funciona em horário comercial, mas eu estou sempre aqui para ajudar!',
        
        // Status
        'status': 'Você pode verificar o status dos seus pedidos e serviços na área "Meus Pedidos" ou "Minha Conta".',
        'pedido': 'Para acompanhar seu pedido, acesse "Meus Pedidos" na sua conta. Precisa do número de acompanhamento',
        'prazo': 'Os prazos variam conforme o serviço. Pode me informar sobre qual pedido ou serviço você tem dúvida',
        'entrega': 'Para verificar o status de entrega, você pode acessar "Meus Pedidos". Está com algum problema de entrega',
        
        // Feedback
        'reclamação': 'Lamento que tenha tido uma experiência ruim. Pode me contar o que aconteceu Quero ajudar a resolver.',
        'elogio': 'Que ótimo receber seu feedback positivo! Vou encaminhar para nossa equipe. Obrigação! 🎉',
        'sugestão': 'Adoramos receber sugestões! Por favor, compartilhe sua ideia que irei encaminhar ao time responsável.',
        
        // Resposta padrão
        'default': 'Entendi sua mensagem! Sou o Bob e estou verificando como posso ajudar melhor. Você poderia dar mais detalhes sobre o que precisa\n\nOu se preferir, digite:\n• "ajuda" - para ver opções\n• "atendente" - para falar com humano'
      },
      transferKeywords: ['atendente', 'humano', 'pessoa', 'falar com alguém', 'falar com alguem', 'suporte humano', 'transferir', 'atendimento humano', 'quero falar']
    };
    
    this.init();
  }
  
  // ================================================
  // Inicialização
  // ================================================
  
  init() {
    this.bindEvents();
    this.checkStoredUser();
    this.listenForParentUserData();
  }

  /**
   * Escuta mensagens do parent (iframe embed) com daçãos do usuário
   */
  listenForParentUserData() {
    window.addEventListener('message', (event) => {
      // Aceitar mensagens de qualquer origem para iframe embed
      if (event.data && event.data.type === 'USER_DATA' && event.data.user) {
        const parentUser = event.data.user;
        console.log('📥 Daçãos do usuário recebidos via postMessage:', parentUser);
        
        // Se não está logação, fazer auto-login
        if (!this.isLoggedIn && parentUser.email) {
          this.autoLoginFromParent(parentUser);
        }
      }
    });
  }

  /**
   * Auto-login usando daçãos do sistema principal (parent)
   */
  autoLoginFromParent(parentUser) {
    const name = parentUser.nome || parentUser.firstName || parentUser.name || parentUser.email.split('@')[0];
    const email = parentUser.email;
    
    console.log('🔐 Auto-login do chat com:', name, email);
    
    this.user = {
      id: 'user_' + (parentUser.id || Date.now()),
      username: name,
      email: email,
      createdAt: new Date().toISOString()
    };
    this.isLoggedIn = true;
    localStorage.setItem('chatSupportUser', JSON.stringify(this.user));
    this.showLoggedInState();
    this.connectSocket();
    this.loadUserData();
  }
  
  bindEvents() {
    // Launcher
    const launcher = document.getElementById('chat-launcher');
    if (launcher) {
      launcher.addEventListener('click', () => this.toggleWidget());
    }
    
    const btnCloseHome = document.getElementById('btn-close-home');
    if (btnCloseHome) {
      btnCloseHome.addEventListener('click', () => this.closeWidget());
    }
    
    // Login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }
    
    // Navegação
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });
    
    // Iniciar chat - botões principais
    const btnStartChat = document.getElementById('btn-start-chat');
    if (btnStartChat) {
      btnStartChat.addEventListener('click', () => {
        console.log('btn-start-chat clicked');
        this.startNewChat();
      });
    }
    
    const btnNewConv = document.getElementById('btn-new-conv');
    if (btnNewConv) {
      btnNewConv.addEventListener('click', () => this.startNewChat());
    }
    
    const fabNewMsg = document.getElementById('fab-new-msg');
    if (fabNewMsg) {
      fabNewMsg.addEventListener('click', () => this.startNewChat());
    }
    
    const btnHelpChat = document.getElementById('btn-help-chat');
    if (btnHelpChat) {
      btnHelpChat.addEventListener('click', () => this.startNewChat());
    }
    
    // Chat
    const btnChatBack = document.getElementById('btn-chat-back');
    if (btnChatBack) {
      btnChatBack.addEventListener('click', () => this.goBackFromChat());
    }
    
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.addEventListener('input', () => this.handleInputChange());
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    }
    
    const btnSend = document.getElementById('btn-send');
    if (btnSend) {
      btnSend.addEventListener('click', () => this.sendMessage());
    }
    
    const btnMic = document.getElementById('btn-mic');
    if (btnMic) {
      btnMic.addEventListener('click', () => this.toggleVoiceRecording());
    }
    
    const btnEmoji = document.getElementById('btn-emoji');
    if (btnEmoji) {
      btnEmoji.addEventListener('click', () => this.toggleEmojiPicker());
    }
    
    // Quick topics
    document.querySelectorAll('.topic-chip').forEach(chip => {
      chip.addEventListener('click', () => this.handleQuickTopic(chip.dataset.topic));
    });
    
    // Quick replies
    document.querySelectorAll('.quick-reply-btn').forEach(btn => {
      btn.addEventListener('click', () => this.handleQuickReply(btn.dataset.reply));
    });
    
    // Emojis
    document.querySelectorAll('.emoji-grid span').forEach(emoji => {
      emoji.addEventListener('click', () => this.insertEmoji(emoji.textContent));
    });
    
    // Chamada
    const btnVoiceCall = document.getElementById('btn-voice-call');
    if (btnVoiceCall) {
      btnVoiceCall.addEventListener('click', () => this.startVoiceCall());
    }
    
    const btnChatCall = document.getElementById('btn-chat-call');
    if (btnChatCall) {
      btnChatCall.addEventListener('click', () => this.startVoiceCall());
    }
    
    const btnEndCall = document.getElementById('btn-end-call');
    if (btnEndCall) {
      btnEndCall.addEventListener('click', () => this.endVoiceCall());
    }
    
    const btnMute = document.getElementById('btn-mute');
    if (btnMute) {
      btnMute.addEventListener('click', () => this.toggleMute());
    }
    
    const btnSpeaker = document.getElementById('btn-speaker');
    if (btnSpeaker) {
      btnSpeaker.addEventListener('click', () => this.toggleSpeaker());
    }
    
    // Tickets
    const btnNewTicket = document.getElementById('btn-new-ticket');
    if (btnNewTicket) {
      btnNewTicket.addEventListener('click', () => this.showScreen('screen-new-ticket'));
    }
    
    const btnCreateTicket = document.getElementById('btn-create-ticket');
    if (btnCreateTicket) {
      btnCreateTicket.addEventListener('click', () => this.showScreen('screen-new-ticket'));
    }
    
    const btnTicketBack = document.getElementById('btn-ticket-back');
    if (btnTicketBack) {
      btnTicketBack.addEventListener('click', () => this.goBackFromTicketForm());
    }
    
    const ticketForm = document.getElementById('ticket-form');
    if (ticketForm) {
      ticketForm.addEventListener('submit', (e) => this.handleCreateTicket(e));
    }
    
    const btnTicketDetailBack = document.getElementById('btn-ticket-detail-back');
    if (btnTicketDetailBack) {
      btnTicketDetailBack.addEventListener('click', () => this.goBackFromTicketDetail());
    }
    
    const responseForm = document.getElementById('response-form');
    if (responseForm) {
      responseForm.addEventListener('submit', (e) => this.handleTicketResponse(e));
    }
    
    // Ticket filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => this.filterTickets(btn.dataset.filter));
    });
    
    // Fechar emoji picker ao clicar fora
    document.addEventListener('click', (e) => {
      const picker = document.getElementById('emoji-picker');
      const btn = document.getElementById('btn-emoji');
      if (picker && btn && !picker.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
        picker.classList.add('hidden');
      }
    });
  }
  
  // ================================================
  // Widget
  // ================================================
  
  toggleWidget() {
    const widget = document.getElementById('chat-widget');
    const launcher = document.getElementById('chat-launcher');
    
    if (widget.classList.contains('hidden')) {
      widget.classList.remove('hidden');
      launcher.querySelector('.launcher-icon').innerHTML = '<i class="fas fa-times"></i>';
    } else {
      widget.classList.add('hidden');
      launcher.querySelector('.launcher-icon').innerHTML = '<img src="img/Icone-Chat.png" alt="Chat" class="launcher-img">';
    }
  }
  
  closeWidget() {
    const widget = document.getElementById('chat-widget');
    const launcher = document.getElementById('chat-launcher');
    widget.classList.add('hidden');
    launcher.querySelector('.launcher-icon').innerHTML = '<img src="img/Icone-Chat.png" alt="Chat" class="launcher-img">';
  }
  
  // ================================================
  // Telas
  // ================================================
  
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) {
      screen.classList.add('active');
    }
  }
  
  // ================================================
  // Login/Usuário
  // ================================================
  
  checkStoredUser() {
    // Primeiro verifica se já tem usuário do chat
    const stored = localStorage.getItem('chatSupportUser');
    if (stored) {
      this.user = JSON.parse(stored);
      this.isLoggedIn = true;
      this.showLoggedInState();
      this.connectSocket();
      this.loadUserData();
      return;
    }
    
    // Se não, tenta usar daçãos do sistema principal (userData)
    const mainUserData = localStorage.getItem('userData');
    if (mainUserData) {
      try {
        const parentUser = JSON.parse(mainUserData);
        if (parentUser && parentUser.email) {
          console.log('🔍 Encontração userData do sistema principal, fazendo auto-login...');
          this.autoLoginFromParent(parentUser);
          return;
        }
      } catch (e) {
        console.error('Erro ao parsear userData:', e);
      }
    }
  }
  
  async handleLogin(e) {
    e.preventDefault();
    
    const name = document.getElementById('input-name').value.trim();
    const email = document.getElementById('input-email').value.trim();
    
    if (!name || !email) return;
    
    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, email })
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.user = data.user;
        this.isLoggedIn = true;
        localStorage.setItem('chatSupportUser', JSON.stringify(this.user));
        this.showLoggedInState();
        this.connectSocket();
      }
    } catch (error) {
      console.error('Login error:', error);
      // Fallback - criar usuário local
      this.user = {
        id: 'user_' + Date.now(),
        username: name,
        email: email,
        createdAt: new Date().toISOString()
      };
      this.isLoggedIn = true;
      localStorage.setItem('chatSupportUser', JSON.stringify(this.user));
      this.showLoggedInState();
      this.connectSocket();
    }
  }
  
  showLoggedInState() {
    this.showScreen('screen-home');
    const displayName = document.getElementById('user-display-name');
    if (displayName && this.user) {
      displayName.textContent = this.user.username;
    }
    
    // Avatar com inicial
    const avatar = document.getElementById('user-avatar');
    if (avatar && this.user) {
      const initial = this.user.username.charAt(0).toUpperCase();
      avatar.innerHTML = initial;
    }
  }
  
  async loadUserData() {
    // Primeiro, carregar daçãos locais
    this.loadLocalData();
    
    try {
      // Tentar carregar do servidor
      const convResponse = await fetch(`/api/rooms/user/${this.user.id}`);
      if (convResponse.ok) {
        const convData = await convResponse.json();
        if (convData.rooms && convData.rooms.length > 0) {
          this.conversations = convData.rooms;
          this.saveLocalData();
        }
        this.renderConversations();
      }
      
      // Carregar tickets
      const ticketResponse = await fetch(`/api/tickets/user/${this.user.id}`);
      if (ticketResponse.ok) {
        const ticketData = await ticketResponse.json();
        if (ticketData.tickets && ticketData.tickets.length > 0) {
          this.tickets = ticketData.tickets;
          this.saveLocalData();
        }
        this.renderTickets();
      }
    } catch (error) {
      console.error('Error loading user data from server:', error);
      // Daçãos locais já foram carregaçãos, apenas renderizar
      this.renderConversations();
      this.renderTickets();
    }
  }
  
  loadLocalData() {
    try {
      const conversationsData = localStorage.getItem('chatSupportConversations');
      if (conversationsData) {
        this.conversations = JSON.parse(conversationsData);
      }
      
      const ticketsData = localStorage.getItem('chatSupportTickets');
      if (ticketsData) {
        this.tickets = JSON.parse(ticketsData);
      }
    } catch (error) {
      console.error('Error loading local data:', error);
    }
  }
  
  saveLocalData() {
    try {
      localStorage.setItem('chatSupportConversations', JSON.stringify(this.conversations));
      localStorage.setItem('chatSupportTickets', JSON.stringify(this.tickets));
    } catch (error) {
      console.error('Error saving local data:', error);
    }
  }
  
  // ================================================
  // Socket
  // ================================================
  
  connectSocket() {
    if (typeof io === 'undefined') {
      console.warn('Socket.IO not available');
      return;
    }
    
    // Connect to chat server on port 3002
    const host = window.location.hostname;
    const chatServerUrl = `http://${host}:3002`;
    
    this.socket = io(chatServerUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    this.socket.on('connect', () => {
      console.log('✅ Socket connected to chat server');
      if (this.user) {
        this.socket.emit('user:join', this.user);
      }
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });
    
    this.socket.on('message:received', (message) => {
      if (this.currentConversation && message.roomId === this.currentConversation.id) {
        this.addMessageToUI(message, 'incoming');
      }
    });
    
    this.socket.on('agent:typing', () => {
      this.showTypingIndicator();
    });
    
    this.socket.on('agent:joined', (agent) => {
      this.transferredToHuman = true;
      this.isWithAI = false;
      this.updateAgentInfo(agent);
      this.addSystemMessage(`${agent.name} entrou na conversa`);
    });
  }
  
  // ================================================
  // Tabs
  // ================================================
  
  switchTab(tabName) {
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${tabName}`);
    });
  }
  
  // ================================================
  // Chat
  // ================================================
  
  startNewChat() {
    console.log('Starting new chat...');
    
    // Reset chat state
    this.isWithAI = true;
    this.transferredToHuman = false;
    
    // Criar nova conversa
    const conversation = {
      id: 'conv_' + Date.now(),
      userId: this.user ? this.user.id : 'anonymous',
      messages: [],
      createdAt: new Date().toISOString(),
      lastMessage: '',
      isWithAI: true
    };
    
    this.currentConversation = conversation;
    this.conversations.unshift(conversation);
    
    // Limpar mensagens anteriores
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
    }
    
    // Mostrar tela de chat
    this.showScreen('screen-chat');
    
    // Reset agent info
    this.updateAgentInfo({
      name: 'Bob',
      status: 'Online'
    });
    
    // Enviar mensagem de boas-vindas da IA após delay
    setTimeout(() => {
      const greeting = this.getRandomGreeting();
      this.addMessageToUI({
        content: greeting,
        timestamp: new Date().toISOString()
      }, 'incoming');
      
      // Mostrar quick replies
      const quickReplies = document.getElementById('chat-quick-replies');
      if (quickReplies) {
        quickReplies.classList.remove('hidden');
      }
    }, 500);
    
    // Registrar no servidor se socket disponível
    if (this.socket) {
      this.socket.emit('room:create', {
        userId: this.user ? this.user.id : 'anonymous',
        roomId: conversation.id
      });
    }
    
    // Focus no input
    setTimeout(() => {
      const input = document.getElementById('chat-input');
      if (input) {
        input.focus();
      }
    }, 300);
  }
  
  sendMessage() {
    const input = document.getElementById('chat-input');
    const content = input.value.trim();
    
    if (!content) return;
    
    // Limpar input
    input.value = '';
    
    // Adicionar mensagem do usuário na UI
    const message = {
      id: 'msg_' + Date.now(),
      content: content,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    this.addMessageToUI(message, 'outgoing');
    
    // Esconder quick replies
    const quickReplies = document.getElementById('chat-quick-replies');
    if (quickReplies) {
      quickReplies.classList.add('hidden');
    }
    
    // Atualizar conversa
    if (this.currentConversation) {
      this.currentConversation.messages.push(message);
      this.currentConversation.lastMessage = content;
    }
    
    // Processar resposta
    if (this.isWithAI && !this.transferredToHuman) {
      this.processAIResponse(content);
    } else if (this.socket) {
      // Enviar via socket para atendente humano
      this.socket.emit('message:send', {
        roomId: this.currentConversation.id,
        content: content,
        userId: this.user ? this.user.id : 'anonymous'
      });
    }
    
    // Salvar daçãos localmente
    this.saveLocalData();
    this.renderConversations();
  }
  
  processAIResponse(userMessage) {
    // Mostrar indicaçãor de digitado
    this.showTypingIndicator();
    
    // Verificar se é pedido de transferência
    const shouldTransfer = this.aiKnowledgeBase.transferKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword)
    );
    
    setTimeout(() => {
      this.hideTypingIndicator();
      
      if (shouldTransfer) {
        this.transferToHuman();
      } else {
        const response = this.getAIResponse(userMessage);
        const aiMessage = {
          id: 'msg_ai_' + Date.now(),
          content: response,
          sender: 'ai',
          timestamp: new Date().toISOString()
        };
        
        // Salvar mensagem da IA na conversa
        if (this.currentConversation) {
          this.currentConversation.messages.push(aiMessage);
          this.currentConversation.lastMessage = response;
        }
        
        this.addMessageToUI(aiMessage, 'incoming');
        this.saveLocalData();
        this.renderConversations();
      }
    }, 1000 + Math.random() * 1000);
  }
  
  getAIResponse(message) {
    const lowerMessage = message.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos para matching
      .trim();
    
    // Pontuação de relevância para encontrar a melhor resposta
    let bestMatch = null;
    let bestScore = 0;
    
    for (const [keyword, response] of Object.entries(this.aiKnowledgeBase.responses)) {
      if (keyword === 'default') continue;
      
      const normalizedKeyword = keyword
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      
      // Match exato tem maior peso
      if (lowerMessage === normalizedKeyword) {
        return response;
      }
      
      // Verifica se contém a palavra-chave
      if (lowerMessage.includes(normalizedKeyword)) {
        // Pontuação baseada no tamanho da keyword (quanto maior, mais específica)
        const score = normalizedKeyword.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = response;
        }
      }
    }
    
    if (bestMatch) {
      return bestMatch;
    }
    
    // Verificar palavras similares comuns
    const similarWords = {
      'nao consigo acessar': 'senha',
      'login': 'senha',
      'entrar': 'senha',
      'comprar': 'contratar',
      'adquirir': 'contratar',
      'quanto custa': 'preço',
      'qual o valor': 'preço',
      'nao ta funcionando': 'não funciona',
      'ta travando': 'travou',
      'demora': 'lento',
      'devolver': 'reembolso',
      'dinheiro de volta': 'reembolso'
    };
    
    for (const [phrase, keyword] of Object.entries(similarWords)) {
      if (lowerMessage.includes(phrase)) {
        return this.aiKnowledgeBase.responses[keyword] || this.aiKnowledgeBase.responses.default;
      }
    }
    
    return this.aiKnowledgeBase.responses.default;
  }
  
  getRandomGreeting() {
    const greetings = this.aiKnowledgeBase.greetings;
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  transferToHuman() {
    this.addSystemMessage('Transferindo para um atendente humano...');
    
    // Preparar daçãos para transferência
    const transferData = {
      userId: this.user ? this.user.id : 'anonymous',
      userName: this.user ? this.user.username : 'Visitante',
      userEmail: this.user ? this.user.email : '',
      conversationId: this.currentConversation ? this.currentConversation.id : null,
      messages: this.currentConversation ? this.currentConversation.messages : [],
      reason: 'Solicitação de atendente humano'
    };
    
    // Chamar API do Sistema de Suporte
    const host = window.location.hostname;
    const supportApiUrl = `http://${host}:3003/api/tickets/transfer`;
    
    fetch(supportApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transferData)
    })
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        console.log('✅ Transferência realizada:', result.ticket);
        
        this.transferredToHuman = true;
        this.isWithAI = false;
        
        // Atualizar status da conversa
        if (this.currentConversation) {
          this.currentConversation.transferredToHuman = true;
          this.currentConversation.status = 'aguardando_atendente';
          this.currentConversation.ticketId = result.ticket.id;
          this.currentConversation.protocolo = result.ticket.protocolo;
        }
        
        this.updateAgentInfo({
          name: 'Suporte Aluforce',
          status: 'Aguardando atendente...'
        });
        
        if (this.socket) {
          this.socket.emit('room:transfer', {
            roomId: this.currentConversation.id,
            userId: this.user ? this.user.id : 'anonymous',
            ticketId: result.ticket.id
          });
        }
        
        setTimeout(() => {
          const systemMessage = {
            id: 'msg_system_' + Date.now(),
            content: `✅ Ticket #${result.ticket.protocolo} criado com sucesso!\n\nSeu atendimento foi registração e um de nossos atendentes entrará em contato em breve.\n\nAcompanhe pelo protocolo: ${result.ticket.protocolo}`,
            sender: 'system',
            timestamp: new Date().toISOString()
          };
          
          if (this.currentConversation) {
            this.currentConversation.messages.push(systemMessage);
            this.currentConversation.lastMessage = 'Aguardando atendente...';
          }
          
          this.addMessageToUI(systemMessage, 'system');
          this.saveLocalData();
          this.renderConversations();
        }, 1000);
      } else {
        console.error('❌ Erro na transferência:', result.error);
        this.addSystemMessage('Desculpe, houve um erro ao transferir. Tente novamente.');
      }
    })
    .catch(error => {
      console.error('❌ Erro na transferência:', error);
      
      // Fallback: simular transferência local
      this.transferredToHuman = true;
      this.isWithAI = false;
      
      if (this.currentConversation) {
        this.currentConversation.transferredToHuman = true;
        this.currentConversation.status = 'com_atendente';
      }
      
      this.updateAgentInfo({
        name: 'Atendente',
        status: 'Conectando...'
      });
      
      setTimeout(() => {
        this.updateAgentInfo({
          name: 'Suporte Aluforce',
          status: 'Online'
        });
        
        const agentMessage = {
          id: 'msg_agent_' + Date.now(),
          content: 'Olá! Um de nossos atendentes irá atendê-lo em breve. Por favor, aguarde.',
          sender: 'agent',
          timestamp: new Date().toISOString()
        };
        
        if (this.currentConversation) {
          this.currentConversation.messages.push(agentMessage);
          this.currentConversation.lastMessage = agentMessage.content;
        }
        
        this.addMessageToUI(agentMessage, 'incoming');
        this.saveLocalData();
        this.renderConversations();
      }, 2000);
    });
  }
  }
  
  addMessageToUI(message, type) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    if (type === 'incoming') {
      messageDiv.innerHTML = `
        <div class="msg-avatar">
          <img src="img/Icone-Chat.png" alt="Bot">
        </div>
        <div class="msg-content">
          <div class="msg-bubble">${message.content}</div>
          <span class="msg-time">${time}</span>
        </div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div class="msg-avatar user">
          <i class="fas fa-user"></i>
        </div>
        <div class="msg-content">
          <div class="msg-bubble">${message.content}</div>
          <span class="msg-time">${time}</span>
        </div>
      `;
    }
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
  }
  
  addSystemMessage(text) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'system-message';
    msgDiv.style.cssText = 'text-align: center; padding: 8px; color: var(--gray-500); font-size: 12px;';
    msgDiv.innerHTML = `<span style="background: var(--gray-100); padding: 4px 12px; border-radius: 12px;">${text}</span>`;
    
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  }
  
  showTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.classList.remove('hidden');
    }
    
    const container = document.getElementById('chat-messages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }
  
  hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.classList.add('hidden');
    }
  }
  
  updateAgentInfo(agent) {
    const nameEl = document.getElementById('agent-name');
    const statusEl = document.getElementById('agent-status');
    
    if (nameEl) nameEl.textContent = agent.name;
    if (statusEl) statusEl.textContent = agent.status;
  }
  
  goBackFromChat() {
    this.showScreen('screen-home');
    this.currentConversation = null;
  }
  
  handleInputChange() {
    const input = document.getElementById('chat-input');
    const btnSend = document.getElementById('btn-send');
    const btnMic = document.getElementById('btn-mic');
    
    if (input.value.trim()) {
      btnSend.classList.remove('hidden');
      btnMic.classList.add('hidden');
    } else {
      btnSend.classList.remove('hidden');
      btnMic.classList.add('hidden');
    }
  }
  
  handleQuickTopic(topic) {
    this.startNewChat();
    setTimeout(() => {
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = topic;
        this.sendMessage();
      }
    }, 600);
  }
  
  handleQuickReply(reply) {
    const input = document.getElementById('chat-input');
    if (input) {
      input.value = reply;
      this.sendMessage();
    }
  }
  
  // ================================================
  // Conversations
  // ================================================
  
  renderConversations() {
    const container = document.getElementById('conversations-list');
    const emptyState = document.getElementById('empty-conversations');
    
    if (!container) return;
    
    // Limpar container mantendo empty state
    const items = container.querySelectorAll('.conversation-item');
    items.forEach(item => item.remove());
    
    if (this.conversations.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }
    
    if (emptyState) emptyState.classList.add('hidden');
    
    this.conversations.forEach(conv => {
      const item = document.createElement('div');
      item.className = 'conversation-item';
      item.innerHTML = `
        <div class="conv-avatar">
          <img src="img/Icone-Chat.png" alt="Avatar">
        </div>
        <div class="conv-info">
          <div class="conv-header">
            <span class="conv-name">${conv.isWithAI ? 'Assistente Virtual' : 'Suporte'}</span>
            <span class="conv-time">${this.formatTime(conv.createdAt)}</span>
          </div>
          <p class="conv-last-msg">${conv.lastMessage || 'Nova conversa'}</p>
        </div>
      `;
      
      item.addEventListener('click', () => this.openConversation(conv));
      container.insertBefore(item, emptyState);
    });
  }
  
  openConversation(conv) {
    this.currentConversation = conv;
    this.isWithAI = conv.isWithAI;
    
    // Limpar e carregar mensagens
    const container = document.getElementById('chat-messages');
    if (container) {
      container.innerHTML = '';
      conv.messages.forEach(msg => {
        this.addMessageToUI(msg, msg.sender === 'user'  'outgoing' : 'incoming');
      });
    }
    
    this.showScreen('screen-chat');
  }
  
  formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Agora';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min';
    if (diff < 86400000) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
  
  // ================================================
  // Emoji
  // ================================================
  
  toggleEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    if (picker) {
      picker.classList.toggle('hidden');
    }
  }
  
  insertEmoji(emoji) {
    const input = document.getElementById('chat-input');
    if (input) {
      input.value += emoji;
      input.focus();
    }
    
    const picker = document.getElementById('emoji-picker');
    if (picker) {
      picker.classList.add('hidden');
    }
  }
  
  // ================================================
  // Voice Recording
  // ================================================
  
  async toggleVoiceRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }
  
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (e) => {
        this.audioChunks.push(e.data);
      };
      
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.sendAudioMessage(audioBlob);
      };
      
      this.mediaRecorder.start();
      this.isRecording = true;
      
      const btnMic = document.getElementById('btn-mic');
      if (btnMic) {
        btnMic.classList.add('recording');
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Não foi possível acessar o microfone');
    }
  }
  
  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      const btnMic = document.getElementById('btn-mic');
      if (btnMic) {
        btnMic.classList.remove('recording');
      }
      
      // Parar tracks
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }
  
  sendAudioMessage(audioBlob) {
    // Simular envio de áudio
    this.addMessageToUI({
      content: '🎤 Mensagem de áudio',
      timestamp: new Date().toISOString()
    }, 'outgoing');
  }
  
  // ================================================
  // Voice Call
  // ================================================
  
  startVoiceCall() {
    this.showScreen('screen-call');
    
    const title = document.getElementById('call-title');
    const subtitle = document.getElementById('call-subtitle');
    const timer = document.getElementById('call-timer');
    
    if (title) title.textContent = 'Conectando...';
    if (subtitle) subtitle.textContent = 'Aguarde enquanto conectamos você';
    if (timer) timer.classList.add('hidden');
    
    // Simular conexão
    setTimeout(() => {
      if (title) title.textContent = 'Chamando...';
      if (subtitle) subtitle.textContent = 'Suporte Técnico';
      
      setTimeout(() => {
        if (title) title.textContent = 'Em chamada';
        if (timer) timer.classList.remove('hidden');
        this.startCallTimer();
      }, 2000);
    }, 1500);
  }
  
  startCallTimer() {
    this.callSeconds = 0;
    this.callTimer = setInterval(() => {
      this.callSeconds++;
      const mins = Math.floor(this.callSeconds / 60).toString().padStart(2, '0');
      const secs = (this.callSeconds % 60).toString().padStart(2, '0');
      const timer = document.getElementById('call-timer');
      if (timer) {
        timer.textContent = `${mins}:${secs}`;
      }
    }, 1000);
  }
  
  endVoiceCall() {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
    this.showScreen('screen-home');
  }
  
  toggleMute() {
    this.isMuted = !this.isMuted;
    const btn = document.getElementById('btn-mute');
    if (btn) {
      btn.classList.toggle('active', this.isMuted);
      btn.innerHTML = this.isMuted 
         '<i class="fas fa-microphone-slash"></i>'
        : '<i class="fas fa-microphone"></i>';
    }
  }
  
  toggleSpeaker() {
    this.isSpeakerOn = !this.isSpeakerOn;
    const btn = document.getElementById('btn-speaker');
    if (btn) {
      btn.classList.toggle('active', this.isSpeakerOn);
    }
  }
  
  // ================================================
  // Tickets
  // ================================================
  
  async handleCreateTicket(e) {
    e.preventDefault();
    
    const title = document.getElementById('ticket-title').value.trim();
    const category = document.getElementById('ticket-category').value;
    const priority = document.querySelector('input[name="priority"]:checked').value;
    const description = document.getElementById('ticket-description').value.trim();
    
    if (!title || !category || !description) return;
    
    const ticket = {
      id: 'TKT-' + Date.now().toString().slice(-6),
      title,
      category,
      priority,
      description,
      status: 'open',
      userId: this.user ? this.user.id : 'anonymous',
      createdAt: new Date().toISOString(),
      responses: []
    };
    
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket)
      });
      
      if (response.ok) {
        const data = await response.json();
        this.tickets.unshift(data.ticket || ticket);
      } else {
        this.tickets.unshift(ticket);
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      this.tickets.unshift(ticket);
    }
    
    // Salvar daçãos localmente
    this.saveLocalData();
    
    // Limpar formulário
    document.getElementById('ticket-form').reset();
    
    // Atualizar lista e voltar
    this.renderTickets();
    this.switchTab('tickets');
    this.showScreen('screen-home');
  }
  
  renderTickets() {
    const container = document.getElementById('tickets-list');
    const emptyState = document.getElementById('empty-tickets');
    
    if (!container) return;
    
    // Limpar container mantendo empty state
    const items = container.querySelectorAll('.ticket-item');
    items.forEach(item => item.remove());
    
    if (this.tickets.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }
    
    if (emptyState) emptyState.classList.add('hidden');
    
    this.tickets.forEach(ticket => {
      const item = document.createElement('div');
      item.className = 'ticket-item';
      item.innerHTML = `
        <div class="ticket-icon">
          <i class="fas fa-ticket-alt"></i>
        </div>
        <div class="ticket-info">
          <div class="ticket-header">
            <span class="ticket-number">#${ticket.id}</span>
            <span class="ticket-status ${ticket.status}">${this.getStatusLabel(ticket.status)}</span>
          </div>
          <p class="ticket-subject">${ticket.title}</p>
          <span class="ticket-date">${this.formatTime(ticket.createdAt)}</span>
        </div>
      `;
      
      item.addEventListener('click', () => this.openTicketDetail(ticket));
      container.insertBefore(item, emptyState);
    });
  }
  
  getStatusLabel(status) {
    const labels = {
      'open': 'Aberto',
      'pending': 'Pendente',
      'closed': 'Fechação'
    };
    return labels[status] || status;
  }
  
  filterTickets(filter) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    // Implementar filtro
    // Por simplicidade, apenas re-renderiza
    this.renderTickets();
  }
  
  openTicketDetail(ticket) {
    this.currentTicket = ticket;
    
    document.getElementById('ticket-detail-title').textContent = `Ticket #${ticket.id}`;
    document.getElementById('ticket-detail-status').textContent = this.getStatusLabel(ticket.status);
    document.getElementById('ticket-detail-status').className = `ticket-status-badge ${ticket.status}`;
    document.getElementById('ticket-detail-date').textContent = new Date(ticket.createdAt).toLocaleDateString('pt-BR');
    document.getElementById('ticket-detail-subject').textContent = ticket.title;
    document.getElementById('ticket-detail-description').textContent = ticket.description;
    
    // Renderizar respostas
    const responsesContainer = document.getElementById('ticket-responses');
    responsesContainer.innerHTML = '';
    
    if (ticket.responses && ticket.responses.length > 0) {
      ticket.responses.forEach(resp => {
        const respDiv = document.createElement('div');
        respDiv.className = 'response-item';
        respDiv.innerHTML = `
          <div class="response-header">
            <div class="response-avatar">
              <i class="fas fa-user"></i>
            </div>
            <div class="response-meta">
              <span class="response-name">${resp.author || 'Suporte'}</span>
              <span class="response-date">${this.formatTime(resp.createdAt)}</span>
            </div>
          </div>
          <p class="response-text">${resp.content}</p>
        `;
        responsesContainer.appendChild(respDiv);
      });
    }
    
    this.showScreen('screen-ticket-detail');
  }
  
  handleTicketResponse(e) {
    e.preventDefault();
    
    const input = document.getElementById('response-text');
    const content = input.value.trim();
    
    if (!content || !this.currentTicket) return;
    
    const response = {
      id: 'resp_' + Date.now(),
      content,
      author: this.user ? this.user.username : 'Você',
      createdAt: new Date().toISOString()
    };
    
    if (!this.currentTicket.responses) {
      this.currentTicket.responses = [];
    }
    this.currentTicket.responses.push(response);
    
    // Limpar e re-renderizar
    input.value = '';
    this.openTicketDetail(this.currentTicket);
  }
  
  goBackFromTicketForm() {
    this.switchTab('tickets');
    this.showScreen('screen-home');
  }
  
  goBackFromTicketDetail() {
    this.currentTicket = null;
    this.switchTab('tickets');
    this.showScreen('screen-home');
  }
}

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', () => {
  window.chatApp = new ChatSupportApp();
});
