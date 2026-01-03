/**
 * ALUFORCE CHAT WIDGET - ESTILO OMIE COMPLETO
 * Sistema de chat com navegação por abas (Início, Mensagens, Ajuda, Tickets, Notícias)
 * @version 7.0 Omie Complete
 */

(function() {
    'use strict';

    // ===== ESTADO GLOBAL =====
    const state = {
        currentScreen: 'home', // home, messages, help, tickets, notices
        messages: [],
        tickets: [],
        notices: [],
        user: {
            name: localStorage.getItem('chatUserName') || '',
            email: localStorage.getItem('chatUserEmail') || '',
            avatar: localStorage.getItem('chatUserAvatar') || ''
        },
        unreadMessages: 0,
        isTyping: false,
        currentConversation: null,
        // BobAI - Sistema de IA
        bobAI: {
            active: true,
            awaitingSupport: false,
            transferRequests: 0, // Contador de pedidos de atendimento
            conversationContext: []
        }
    };

    // ===== BASE DE CONHECIMENTO =====
    const helpCollections = [
        {
            id: 1,
            title: 'Guia Inicial Omie',
            description: 'Acabei de contratar o Omie. E agora, o que devo fazer? Aqui você encontra uma série de artigos que vão te apoiar nesses primeiros passos com o Omie.',
            articles: 23,
            icon: '📘'
        },
        {
            id: 2,
            title: 'Omie ERP no WhatsApp',
            description: 'Destrave o seu crescimento com o auxílio da integração do Omie ERP com WhatsApp.',
            articles: 8,
            icon: '💬'
        },
        {
            id: 3,
            title: 'Novidades de Produto',
            description: 'Confira todas as novidades e destaques de produto do Omie.',
            articles: 156,
            icon: '🎉'
        },
        {
            id: 4,
            title: 'Compras, Estoque e Produção',
            description: 'Tudo sobre gestão de compras, controle de estoque e processos de produção.',
            articles: 45,
            icon: '📦'
        },
        {
            id: 5,
            title: 'Vendas e CRM',
            description: 'Gestão completa do processo comercial, desde o lead até o pós-venda.',
            articles: 67,
            icon: '💰'
        },
        {
            id: 6,
            title: 'Financeiro',
            description: 'Contas a pagar, contas a receber, fluxo de caixa e conciliação bancária.',
            articles: 89,
            icon: '💵'
        }
    ];

    // ===== BOB AI - BASE DE CONHECIMENTO =====
    const bobAIKnowledge = {
        // Respostas para saudações
        greetings: [
            'Olá! Sou o Bob, assistente virtual da ALUFORCE 🤖',
            'Oi! Eu sou o Bob, sua IA de suporte! Como posso ajudar?',
            'Olá! Bob aqui! Pronto para ajudar você no que precisar! 👋'
        ],
        
        // Base de conhecimento por módulos
        modules: {
            rh: {
                keywords: ['rh', 'recursos humanos', 'funcionario', 'funcionário', 'folha', 'pagamento', 'ponto', 'ferias', 'férias', 'beneficio', 'benefício'],
                responses: [
                    'No módulo RH você pode: ✅ Gerenciar funcionários ✅ Controlar ponto eletrônico ✅ Gerar folha de pagamento ✅ Administrar férias e benefícios. Qual dessas opções você precisa?',
                    'O sistema RH da ALUFORCE permite gestão completa de pessoal. Você quer saber sobre: cadastro de funcionários, controle de ponto, folha de pagamento ou benefícios?'
                ]
            },
            vendas: {
                keywords: ['venda', 'vendas', 'pedido', 'pedidos', 'cliente', 'clientes', 'orcamento', 'orçamento', 'proposta'],
                responses: [
                    'No módulo Vendas você pode: 📊 Criar orçamentos e propostas 📋 Gerenciar pedidos 👥 Administrar clientes 💰 Acompanhar o funil de vendas. O que você precisa fazer?',
                    'O sistema de Vendas permite controle total do processo comercial! Posso te ajudar com: criação de pedidos, cadastro de clientes, geração de orçamentos ou acompanhamento de vendas?'
                ]
            },
            financeiro: {
                keywords: ['financeiro', 'contas', 'pagar', 'receber', 'boleto', 'pagamento', 'cobranca', 'cobrança', 'fluxo', 'caixa'],
                responses: [
                    'No Financeiro você pode: 💳 Gerenciar contas a pagar e receber 💰 Controlar fluxo de caixa 📊 Gerar boletos e cobranças 📈 Acompanhar DRE. Qual sua necessidade?',
                    'O módulo Financeiro oferece gestão completa! Você quer saber sobre: contas a pagar, contas a receber, fluxo de caixa ou relatórios financeiros?'
                ]
            },
            pcp: {
                keywords: ['pcp', 'producao', 'produção', 'ordem', 'op', 'material', 'materiais', 'estoque', 'planejamento'],
                responses: [
                    'No PCP você pode: 🏭 Criar ordens de produção 📦 Controlar materiais e estoque 📋 Planejar produção 📊 Acompanhar status de OPs. O que precisa fazer?',
                    'O sistema PCP permite gestão completa da produção! Posso te ajudar com: ordens de produção, controle de materiais, planejamento ou consulta de estoque?'
                ]
            },
            compras: {
                keywords: ['compra', 'compras', 'fornecedor', 'fornecedores', 'cotacao', 'cotação', 'pedido compra'],
                responses: [
                    'No módulo Compras você pode: 🛒 Criar pedidos de compra 📋 Gerenciar fornecedores 💰 Fazer cotações 📊 Controlar aprovações. Como posso ajudar?',
                    'O sistema de Compras oferece controle total! Você quer saber sobre: pedidos de compra, cadastro de fornecedores, cotações ou aprovações?'
                ]
            },
            nfe: {
                keywords: ['nota', 'nfe', 'nf-e', 'fiscal', 'danfe', 'xml', 'sefaz'],
                responses: [
                    'No módulo NF-e você pode: 📄 Emitir notas fiscais 📋 Consultar notas emitidas ❌ Cancelar NF-e 📥 Importar XML. O que você precisa?',
                    'O sistema de NF-e permite gestão completa de notas fiscais! Posso te ajudar com: emissão, consulta, cancelamento ou importação de XML?'
                ]
            }
        },
        
        // Respostas para problemas comuns
        commonIssues: {
            login: {
                keywords: ['login', 'senha', 'acesso', 'entrar', 'nao consigo', 'não consigo'],
                response: 'Para problemas de login: 1️⃣ Verifique se está usando o email correto 2️⃣ Tente recuperar a senha clicando em "Esqueci minha senha" 3️⃣ Limpe o cache do navegador (Ctrl+Shift+Delete). Se o problema persistir, posso transferir você para o suporte técnico!'
            },
            error: {
                keywords: ['erro', 'error', 'bug', 'problema', 'nao funciona', 'não funciona', 'travou', 'quebrou'],
                response: 'Entendo que você está com um problema! 🔧 Para te ajudar melhor, você pode: 1️⃣ Me descrever o erro em detalhes 2️⃣ Informar qual módulo está usando 3️⃣ Falar se o erro acontece sempre ou só às vezes. Ou se preferir, posso transferir você direto para o suporte técnico!'
            },
            relatorio: {
                keywords: ['relatorio', 'relatório', 'exportar', 'pdf', 'excel', 'imprimir'],
                response: 'Para gerar relatórios: 📊 Acesse o módulo desejado ➡️ Clique em "Relatórios" no menu ➡️ Escolha o tipo de relatório ➡️ Configure os filtros (período, status, etc) ➡️ Clique em "Gerar" ou "Exportar". Posso te ajudar com algum relatório específico?'
            },
            permissao: {
                keywords: ['permissao', 'permissão', 'acesso negado', 'nao tenho acesso', 'não tenho acesso', '403', 'bloqueado'],
                response: 'Parece que você não tem permissão para essa função! 🔐 Entre em contato com o administrador do sistema (TI) para solicitar acesso. Ou posso transferir você para o suporte para verificar suas permissões!'
            }
        },
        
        // Respostas padrão
        fallback: [
            'Hmm, não tenho certeza sobre isso... 🤔 Você pode reformular sua pergunta? Ou se preferir, posso transferir você para um atendente humano!',
            'Desculpe, não entendi muito bem sua dúvida. Pode me explicar de outra forma? Ou prefere falar com o suporte técnico?',
            'Não tenho uma resposta específica para isso no momento. Quer que eu transfira você para o suporte? Eles podem te ajudar melhor!'
        ]
    };

    // ===== BOB AI - FUNÇÃO DE ANÁLISE =====
    function analyzeBobAI(message) {
        const msg = message.toLowerCase().trim();
        
        // 1. Verificar pedidos de atendimento humano
        const supportKeywords = ['atendimento', 'atendente', 'suporte', 'humano', 'pessoa', 'transferir', 'falar com alguem', 'falar com alguém'];
        const hasSupportRequest = supportKeywords.some(keyword => msg.includes(keyword));
        
        if (hasSupportRequest) {
            state.bobAI.transferRequests++;
            
            // Se pediu 3 vezes ou mais, transferir automaticamente
            if (state.bobAI.transferRequests >= 3) {
                return {
                    type: 'transfer',
                    response: '🔄 Entendido! Vou transferir você para o suporte técnico. Um atendente humano irá te ajudar em breve! Por favor, aguarde...',
                    action: 'createTicket'
                };
            } else {
                return {
                    type: 'support_request',
                    response: `Entendo que você quer falar com um atendente! Se eu não conseguir te ajudar, posso transferir você para o suporte. Mas antes, me conte: qual é sua dúvida? (Pedido ${state.bobAI.transferRequests}/3)`,
                    action: 'none'
                };
            }
        }
        
        // 2. Verificar saudações
        const greetings = ['oi', 'olá', 'ola', 'olar', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'opa'];
        if (greetings.some(greeting => msg === greeting || msg.startsWith(greeting))) {
            return {
                type: 'greeting',
                response: bobAIKnowledge.greetings[Math.floor(Math.random() * bobAIKnowledge.greetings.length)],
                action: 'none'
            };
        }
        
        // 3. Verificar módulos específicos
        for (const [module, data] of Object.entries(bobAIKnowledge.modules)) {
            if (data.keywords.some(keyword => msg.includes(keyword))) {
                return {
                    type: 'module',
                    response: data.responses[Math.floor(Math.random() * data.responses.length)],
                    action: 'none'
                };
            }
        }
        
        // 4. Verificar problemas comuns
        for (const [issue, data] of Object.entries(bobAIKnowledge.commonIssues)) {
            if (data.keywords.some(keyword => msg.includes(keyword))) {
                return {
                    type: 'common_issue',
                    response: data.response,
                    action: 'none'
                };
            }
        }
        
        // 5. Fallback - não entendeu
        state.bobAI.transferRequests++;
        
        if (state.bobAI.transferRequests >= 3) {
            return {
                type: 'transfer',
                response: '🔄 Parece que estou tendo dificuldade em te ajudar... Vou transferir você para o suporte técnico! Um atendente humano irá te ajudar em breve.',
                action: 'createTicket'
            };
        }
        
        return {
            type: 'fallback',
            response: bobAIKnowledge.fallback[Math.floor(Math.random() * bobAIKnowledge.fallback.length)],
            action: 'none'
        };
    }

    // ===== CRIAR TICKET DE SUPORTE =====
    function createSupportTicket(userMessage) {
        // Simular criação de ticket para o TI
        const ticketNumber = '#' + Math.floor(Math.random() * 90000000 + 10000000);
        
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        
        const ticketData = {
            numero: ticketNumber,
            usuario: {
                nome: userData.nome || state.user.name || 'Usuário',
                email: userData.email || state.user.email || 'email@example.com',
                departamento: userData.departamento || 'N/A'
            },
            assunto: 'Solicitação de Atendimento via Chat',
            mensagem: userMessage,
            status: 'open',
            prioridade: 'medium',
            criado_em: new Date().toISOString(),
            conversationHistory: state.bobAI.conversationContext
        };
        
        // Aqui você faria um POST para a API: /api/tickets
        console.log('🎫 Ticket criado:', ticketData);
        
        // Simular salvamento
        if (typeof localStorage !== 'undefined') {
            const tickets = JSON.parse(localStorage.getItem('supportTickets') || '[]');
            tickets.push(ticketData);
            localStorage.setItem('supportTickets', JSON.stringify(tickets));
        }
        
        return ticketNumber;
    }

    const sampleMessages = [
        {
            id: 1,
            sender: 'Rodrigo',
            subject: 'Classifique sua conversa',
            preview: 'Rodrigo',
            time: '1w',
            avatar: 'R',
            unread: false
        },
        {
            id: 2,
            sender: 'Omie',
            subject: 'Preciso de ajuda com o uso do Omie',
            preview: 'Omie',
            time: '1w',
            avatar: 'O',
            unread: false
        },
        {
            id: 3,
            sender: 'Everton',
            subject: 'Classifique sua conversa',
            preview: 'Everton',
            time: '1w',
            avatar: 'E',
            unread: true
        },
        {
            id: 4,
            sender: 'Omie',
            subject: 'Simplifique suas finanças com a conta digital do Omie',
            preview: 'Omie',
            time: '1w',
            avatar: 'O',
            unread: false
        }
    ];

    const sampleTickets = [
        {
            id: '#53884412',
            subject: 'Compras, Estoque e Produção',
            description: 'Conclusão de OP',
            status: 'Resolvido',
            time: '1w',
            email: 'ti@aluforce.ind.br'
        }
    ];

    const sampleNotices = [
        {
            id: 1,
            title: 'Na Omie, a segurança vem em primeiro lugar',
            image: '/images/security-notice.jpg',
            type: 'security'
        },
        {
            id: 2,
            title: 'Alerta de segurança!',
            subtitle: 'Oi, está por aí?',
            type: 'alert'
        },
        {
            id: 3,
            title: 'O OMIE AGORA É CERTIFICADO COM A ISO 27001',
            subtitle: 'O mais alto nível em Segurança da Informação',
            image: '/images/iso-certificate.jpg',
            type: 'certificate'
        }
    ];

    // ===== CRIAR HTML =====
    function createHTML() {
        const html = `
        <!-- Chat Widget Container -->
        <div class="chat-widget-container" id="chatWidget">
            <!-- Header -->
            <div class="chat-header-omie">
                <button class="chat-back-btn" id="chatBackBtn" style="display: none;">
                    <i class="fas fa-arrow-left"></i>
                </button>
                
                <div class="chat-header-logo">
                    <img src="/assets/logo.png" alt="Omie" style="height: 28px;">
                </div>
                
                <button class="chat-menu-btn" id="chatMenuBtn">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                
                <button class="chat-close-btn" id="chatCloseBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- Tela Início -->
            <div class="chat-screen chat-screen-home active" id="screenHome">
                <div class="chat-welcome">
                    <h2>Olá Antonio 👋</h2>
                    <p>Como podemos ajudar?</p>
                </div>

                <!-- Mensagem Recente -->
                <div class="chat-card">
                    <div class="chat-card-header">Mensagem recente</div>
                    <div class="chat-card-content">
                        <div class="chat-recent-msg" data-action="openMessages">
                            <div class="chat-user-avatar" style="background: linear-gradient(135deg, #3b82f6, #2563eb);">
                                <span style="color: white; font-weight: bold;">R</span>
                            </div>
                            <div>
                                <div class="chat-recent-title">Classifique sua conversa</div>
                                <div class="chat-recent-subtitle">Rodrigo • 1w</div>
                            </div>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M7 10l5 5 5-5H7z"/>
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- Envie uma mensagem -->
                <div class="chat-card chat-card-action" data-action="newMessage">
                    <div class="chat-card-content">
                        <div class="chat-action-item">
                            <strong>Envie uma mensagem</strong>
                            <p>Normalmente respondemos em alguns minutos</p>
                        </div>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4l-8 8h5v8h6v-8h5l-8-8z"/>
                        </svg>
                    </div>
                </div>

                <!-- Qual é a sua dúvida -->
                <div class="chat-search-box">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"/>
                    </svg>
                    <input type="text" placeholder="Qual é a sua dúvida?" id="searchHelp">
                </div>
            </div>

            <!-- Tela Mensagens -->
            <div class="chat-screen chat-screen-messages" id="screenMessages">
                <div class="chat-screen-header">
                    <h3>Mensagens</h3>
                    <button class="btn-new-message" id="btnNewMessage">
                        <i class="fas fa-plus"></i>
                        Envie uma mensagem
                    </button>
                </div>
                <div class="chat-messages-list" id="messagesList">
                    <!-- Messages will be populated here -->
                </div>
            </div>

            <!-- Tela Ajuda -->
            <div class="chat-screen chat-screen-help" id="screenHelp">
                <div class="chat-screen-header">
                    <h3>Ajuda</h3>
                </div>
                <div class="chat-search-box" style="margin: 16px 20px;">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"/>
                    </svg>
                    <input type="text" placeholder="Qual é a sua dúvida?" id="searchHelpMain">
                </div>
                <div class="chat-collections-header">31 coleções</div>
                <div class="chat-collections-list" id="collectionsList">
                    <!-- Collections will be populated here -->
                </div>
            </div>

            <!-- Tela Tickets -->
            <div class="chat-screen chat-screen-tickets" id="screenTickets">
                <div class="chat-screen-header">
                    <h3>Tickets</h3>
                </div>
                <div class="chat-tickets-list" id="ticketsList">
                    <!-- Tickets will be populated here -->
                </div>
            </div>

            <!-- Tela Notícias -->
            <div class="chat-screen chat-screen-notices" id="screenNotices">
                <div class="chat-screen-header">
                    <h3>Notícias</h3>
                    <div class="notices-from">Mais recentes<br><span style="font-size: 12px; color: #6b7280;">Da equipe Omie</span></div>
                </div>
                <div class="chat-notices-list" id="noticesList">
                    <!-- Notices will be populated here -->
                </div>
            </div>

            <!-- Tela de Conversa Individual -->
            <div class="chat-screen chat-screen-conversation" id="screenConversation" style="display: none;">
                <div class="conversation-header">
                    <div class="conversation-info">
                        <div class="conversation-avatar">O</div>
                        <div>
                            <div class="conversation-title">Omie</div>
                            <div class="conversation-subtitle">A equipe também pode ajudar</div>
                        </div>
                    </div>
                    <button class="conversation-menu-btn">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
                <div class="conversation-messages" id="conversationMessages">
                    <div class="conversation-welcome">
                        <p>Estamos aqui para ajudar! Pergunte-nos qualquer coisa :-)</p>
                    </div>
                    <div class="conversation-message bot">
                        <div class="message-avatar">O</div>
                        <div class="message-content">
                            <div class="message-text">Olá,</div>
                            <div class="message-text">Como podemos te ajudar hoje?</div>
                            <div class="message-time">Omie • AI Agent • Agora</div>
                        </div>
                    </div>
                </div>
                <div class="conversation-quick-replies">
                    <button class="quick-reply-btn">Preciso de ajuda com o uso do Omie</button>
                    <button class="quick-reply-btn">Quero contratar o Omie</button>
                    <button class="quick-reply-btn">Tenho dúvidas sobre minha assinatura atual</button>
                    <button class="quick-reply-btn">Preciso de ajuda com o Oneflow (Sistema Contábil)</button>
                </div>
                <div class="conversation-input">
                    <input type="text" placeholder="Digite sua mensagem..." id="conversationInput">
                    <button class="conversation-send-btn" id="conversationSendBtn">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>

            <!-- Bottom Navigation -->
            <div class="chat-bottom-nav">
                <button class="nav-item active" data-screen="home">
                    <i class="fas fa-home"></i>
                    <span>Início</span>
                </button>
                <button class="nav-item" data-screen="messages">
                    <i class="fas fa-comment-dots"></i>
                    <span>Mensagens</span>
                    <span class="nav-badge" id="messagesBadge" style="display: none;">1</span>
                </button>
                <button class="nav-item" data-screen="help">
                    <i class="fas fa-question-circle"></i>
                    <span>Ajuda</span>
                </button>
                <button class="nav-item" data-screen="tickets">
                    <i class="fas fa-ticket-alt"></i>
                    <span>Tickets</span>
                </button>
                <button class="nav-item" data-screen="notices">
                    <i class="fas fa-bell"></i>
                    <span>Notícias</span>
                </button>
            </div>
        </div>

        <!-- Floating Button -->
        <button class="chat-floating-btn" id="chatFloatingBtn">
            <div class="floating-icon">
                <i class="fas fa-comments"></i>
            </div>
            <div class="floating-pulse"></div>
        </button>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
    }

    // ===== FUNÇÕES DE POPULAÇÃO =====
    function populateMessages() {
        const container = document.getElementById('messagesList');
        if (!container) return;

        container.innerHTML = sampleMessages.map(msg => `
            <div class="message-item ${msg.unread ? 'unread' : ''}" data-message-id="${msg.id}">
                <div class="message-avatar" style="background: ${getAvatarColor(msg.avatar)};">
                    ${msg.avatar}
                </div>
                <div class="message-info">
                    <div class="message-subject">${msg.subject}</div>
                    <div class="message-preview">${msg.sender} • ${msg.time}</div>
                </div>
                ${msg.unread ? '<div class="message-unread-dot"></div>' : ''}
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="color: #9ca3af;">
                    <path d="M7 10l5 5 5-5H7z"/>
                </svg>
            </div>
        `).join('');

        // Add event listeners
        container.querySelectorAll('.message-item').forEach(item => {
            item.addEventListener('click', () => {
                const messageId = item.dataset.messageId;
                openConversation(messageId);
            });
        });
    }

    function populateCollections() {
        const container = document.getElementById('collectionsList');
        if (!container) return;

        container.innerHTML = helpCollections.map(col => `
            <div class="collection-item" data-collection-id="${col.id}">
                <div class="collection-icon">${col.icon}</div>
                <div class="collection-info">
                    <div class="collection-title">${col.title}</div>
                    <div class="collection-description">${col.description}</div>
                    <div class="collection-articles">${col.articles} artigos</div>
                </div>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 10l5 5 5-5H7z"/>
                </svg>
            </div>
        `).join('');
    }

    function populateTickets() {
        const container = document.getElementById('ticketsList');
        if (!container) return;

        if (sampleTickets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-ticket-alt" style="font-size: 48px; color: #cbd5e1; margin-bottom: 16px;"></i>
                    <h3>Nenhum ticket encontrado</h3>
                    <p>Você não possui tickets abertos no momento</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sampleTickets.map(ticket => `
            <div class="ticket-item" data-ticket-id="${ticket.id}">
                <div class="ticket-icon" style="background: #10b981; color: white;">
                    <i class="fas fa-check"></i>
                </div>
                <div class="ticket-info">
                    <div class="ticket-subject">${ticket.subject}</div>
                    <div class="ticket-id">${ticket.id} • ${ticket.status}</div>
                    <div class="ticket-description">${ticket.description}</div>
                    <div class="ticket-meta">
                        <span>Você será avisado aqui e por email</span>
                        <span>${ticket.email}</span>
                    </div>
                </div>
            </div>
            <button class="ticket-action-btn">
                <i class="fas fa-comment-alt"></i>
                Alguma dúvida sobre este ticket?
                <span style="margin-left: auto;">Exibir conversa</span>
            </button>
        `).join('');
    }

    function populateNotices() {
        const container = document.getElementById('noticesList');
        if (!container) return;

        container.innerHTML = sampleNotices.map(notice => `
            <div class="notice-item" data-notice-id="${notice.id}">
                ${notice.image ? `
                    <div class="notice-image" style="background-image: url('${notice.image}'); background-size: cover; background-position: center;">
                        ${notice.type === 'security' ? '<i class="fas fa-shield-alt" style="font-size: 64px; color: white;"></i>' : ''}
                        ${notice.type === 'certificate' ? '<i class="fas fa-certificate" style="font-size: 64px; color: white;"></i>' : ''}
                    </div>
                ` : ''}
                <div class="notice-content">
                    <div class="notice-title">${notice.title}</div>
                    ${notice.subtitle ? `<div class="notice-subtitle">${notice.subtitle}</div>` : ''}
                </div>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 10l5 5 5-5H7z"/>
                </svg>
            </div>
        `).join('');
    }

    function getAvatarColor(initial) {
        const colors = {
            'R': 'linear-gradient(135deg, #3b82f6, #2563eb)',
            'O': 'linear-gradient(135deg, #00c9d7, #00b5c2)',
            'E': 'linear-gradient(135deg, #10b981, #059669)',
            'A': 'linear-gradient(135deg, #f59e0b, #d97706)'
        };
        return colors[initial] || 'linear-gradient(135deg, #6b7280, #4b5563)';
    }

    // ===== NAVEGAÇÃO =====
    function switchScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.chat-screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show selected screen
        const screen = document.getElementById(`screen${screenName.charAt(0).toUpperCase() + screenName.slice(1)}`);
        if (screen) {
            screen.classList.add('active');
        }

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.screen === screenName) {
                item.classList.add('active');
            }
        });

        // Show/hide back button
        const backBtn = document.getElementById('chatBackBtn');
        if (screenName === 'home') {
            backBtn.style.display = 'none';
        } else {
            backBtn.style.display = 'flex';
        }

        state.currentScreen = screenName;
    }

    function openConversation(messageId) {
        const conversationScreen = document.getElementById('screenConversation');
        
        // Hide all screens
        document.querySelectorAll('.chat-screen').forEach(screen => {
            screen.classList.remove('active');
            screen.style.display = 'none';
        });

        // Hide bottom nav
        document.querySelector('.chat-bottom-nav').style.display = 'none';

        // Show conversation screen
        conversationScreen.style.display = 'flex';
        conversationScreen.classList.add('active');

        // Show back button
        document.getElementById('chatBackBtn').style.display = 'flex';

        state.currentConversation = messageId;
    }

    function closeConversation() {
        const conversationScreen = document.getElementById('screenConversation');
        conversationScreen.style.display = 'none';
        conversationScreen.classList.remove('active');

        // Show bottom nav
        document.querySelector('.chat-bottom-nav').style.display = 'flex';

        // Return to messages screen
        switchScreen('messages');

        state.currentConversation = null;
    }

    // ===== EVENT LISTENERS =====
    function attachEvents() {
        // Floating button
        document.getElementById('chatFloatingBtn').addEventListener('click', () => {
            document.getElementById('chatWidget').classList.add('active');
        });

        // Close button
        document.getElementById('chatCloseBtn').addEventListener('click', () => {
            document.getElementById('chatWidget').classList.remove('active');
        });

        // Back button
        document.getElementById('chatBackBtn').addEventListener('click', () => {
            if (state.currentConversation) {
                closeConversation();
            } else {
                switchScreen('home');
            }
        });

        // Bottom navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const screen = item.dataset.screen;
                switchScreen(screen);
            });
        });

        // Home screen actions
        document.querySelectorAll('[data-action="openMessages"]').forEach(el => {
            el.addEventListener('click', () => switchScreen('messages'));
        });

        document.querySelectorAll('[data-action="newMessage"]').forEach(el => {
            el.addEventListener('click', () => {
                switchScreen('messages');
                // Simulate opening new message
                setTimeout(() => openConversation('new'), 300);
            });
        });

        // Conversation input
        const conversationForm = document.getElementById('conversationInput');
        const conversationSendBtn = document.getElementById('conversationSendBtn');
        
        if (conversationSendBtn && conversationForm) {
            conversationSendBtn.addEventListener('click', sendMessage);
            conversationForm.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') sendMessage();
            });
        }

        // Quick replies
        document.querySelectorAll('.quick-reply-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const message = btn.textContent;
                document.getElementById('conversationInput').value = message;
                sendMessage();
            });
        });
    }

    function sendMessage() {
        const input = document.getElementById('conversationInput');
        const message = input.value.trim();
        
        if (!message) return;

        // Adicionar à conversa
        state.bobAI.conversationContext.push({
            role: 'user',
            message: message,
            timestamp: new Date().toISOString()
        });

        // Add user message
        const messagesContainer = document.getElementById('conversationMessages');
        const userMsg = document.createElement('div');
        userMsg.className = 'conversation-message user';
        userMsg.innerHTML = `
            <div class="message-content">
                <div class="message-text">${message}</div>
                <div class="message-time">Você • Agora</div>
            </div>
        `;
        messagesContainer.appendChild(userMsg);

        // Clear input
        input.value = '';

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Mostrar "Bob digitando..."
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'conversation-message bot typing-indicator';
        typingIndicator.id = 'typingIndicator';
        typingIndicator.innerHTML = `
            <div class="message-avatar" style="background: linear-gradient(135deg, #00c9d7, #00b5c2);">B</div>
            <div class="message-content">
                <div class="message-text">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    Bob digitando...
                </div>
            </div>
        `;
        messagesContainer.appendChild(typingIndicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Analisar mensagem com BobAI
        setTimeout(() => {
            // Remover indicador de digitação
            const indicator = document.getElementById('typingIndicator');
            if (indicator) indicator.remove();

            const aiResponse = analyzeBobAI(message);
            
            // Adicionar resposta do Bob
            state.bobAI.conversationContext.push({
                role: 'assistant',
                message: aiResponse.response,
                type: aiResponse.type,
                timestamp: new Date().toISOString()
            });

            const botMsg = document.createElement('div');
            botMsg.className = 'conversation-message bot';
            
            let bobName = 'Bob AI';
            let bobIcon = 'B';
            
            // Se vai transferir, mudar ícone
            if (aiResponse.type === 'transfer') {
                bobName = 'Bob AI → Suporte TI';
                state.bobAI.awaitingSupport = true;
            }
            
            botMsg.innerHTML = `
                <div class="message-avatar" style="background: linear-gradient(135deg, #00c9d7, #00b5c2);">${bobIcon}</div>
                <div class="message-content">
                    <div class="message-text">${aiResponse.response}</div>
                    <div class="message-time">${bobName} • Agora</div>
                </div>
            `;
            messagesContainer.appendChild(botMsg);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            // Executar ação se necessário
            if (aiResponse.action === 'createTicket') {
                setTimeout(() => {
                    const ticketNumber = createSupportTicket(message);
                    
                    const confirmMsg = document.createElement('div');
                    confirmMsg.className = 'conversation-message bot';
                    confirmMsg.innerHTML = `
                        <div class="message-avatar" style="background: linear-gradient(135deg, #ef4444, #dc2626);">🎫</div>
                        <div class="message-content">
                            <div class="message-text">
                                <strong>✅ Ticket criado com sucesso!</strong><br><br>
                                <strong>Número:</strong> ${ticketNumber}<br>
                                <strong>Status:</strong> Aguardando atendimento<br><br>
                                Um membro da equipe de suporte TI irá te atender em breve! 
                                Você será notificado quando houver resposta. 🔔
                            </div>
                            <div class="message-time">Sistema • Agora</div>
                        </div>
                    `;
                    messagesContainer.appendChild(confirmMsg);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    
                    // Resetar contador
                    state.bobAI.transferRequests = 0;
                }, 1500);
            }
        }, 1500); // Simular tempo de "digitação"
    }

    // ===== INICIALIZAÇÃO =====
    function init() {
        createHTML();
        populateMessages();
        populateCollections();
        populateTickets();
        populateNotices();
        attachEvents();

        // Load user data
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData.nome) {
            const firstName = userData.nome.split(' ')[0];
            document.querySelector('.chat-welcome h2').textContent = `Olá ${firstName} 👋`;
        }

        // Update unread badge
        const unreadCount = sampleMessages.filter(m => m.unread).length;
        if (unreadCount > 0) {
            const badge = document.getElementById('messagesBadge');
            badge.textContent = unreadCount;
            badge.style.display = 'flex';
        }

        console.log('✅ Chat Widget Omie inicializado');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
