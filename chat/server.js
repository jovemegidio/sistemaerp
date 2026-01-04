const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const os = require('os');
const mysql = require('mysql2/promise');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configuração do MySQL
const dbConfig = {
    host: process.env.DB_HOST || 'interchange.proxy.rlwy.net',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'iiilOZutDOnPCwxgiTKeMuEaIzSwplcu',
    database: process.env.DB_NAME || 'railway',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 19396
};

let pool;
async function initDB() {
    pool = await mysql.createPool(dbConfig);
    console.log('✅ Conexão MySQL pool criada para histórico do chat');
}
initDB();

// Servir arquivos estáticos
app.use(express.static('public'));
app.use(express.json());

// Armazenar conversas ativas (em produção, usar banco de daçãos)
const activeChats = new Map();
const chatHistory = new Map();
const waitingUsers = new Set();

// Sistema de IA (URA) - Bob
const bobResponses = {
    greetings: ['olá', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'ola', 'hey', 'oii'],
    help: ['ajuda', 'help', 'socorro', 'preciso de ajuda', 'duvida', 'dúvida'],
    problem: ['problema', 'erro', 'bug', 'não funciona', 'não está funcionando', 'quebração', 'travou', 'lento'],
    nfe: ['nota', 'nfe', 'nf-e', 'fiscal', 'danfe', 'xml'],
    pcp: ['pcp', 'produção', 'producao', 'ordem', 'op'],
    vendas: ['venda', 'orcamento', 'orçamento', 'pedido', 'cliente'],
    support: ['suporte', 'atendente', 'humano', 'pessoa', 'falar com alguém', 'transferir', 'ti'],
    financeiro: ['financeiro', 'conta', 'pagamento', 'recebimento', 'boleto', 'fatura', 'débito', 'crédito'],
    rh: ['rh', 'recursos humanos', 'funcionário', 'folha', 'ponto', 'benefício', 'admissão', 'demissão'],
    compras: ['compras', 'compra', 'fornecedor', 'cotação', 'pedido de compra', 'entrada de mercaçãoria']
};

function getAIResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Saudações - Apresenta opções principais
    if (bobResponses.greetings.some(word => lowerMessage.includes(word))) {
        return {
            text: '👋 Olá! Eu sou o Bob, assistente virtual da ALUFORCE!\n\nComo posso ajudar você hoje\n\n📚 Ajuda - Central de conhecimento\n💬 Falar com Suporte - Contato com TI\n🔧 Problema Técnico - Resolver erros\n📄 Nota Fiscal - Dúvidas sobre NF-e',
            transferToHuman: false
        };
    }
    
    // Ajuda - Direciona para central de ajuda
    if (bobResponses.help.some(word => lowerMessage.includes(word))) {
        return {
            text: '📚 Perfeito! Vou te direcionar para nossa Central de Ajuda onde você encontra tutoriais, guias e respostas para dúvidas comuns.\n\nA página será aberta em uma nova aba. Se não encontrar o que procura, é só voltar aqui e pedir para falar com o suporte! 😊',
            transferToHuman: false,
            openHelp: true
        };
    }
    
    // Falar com Suporte - Notifica TI
    if (bobResponses.support.some(word => lowerMessage.includes(word))) {
        return {
            text: '🎧 Entendi! Vou transferir sua solicitação para nossa equipe de TI.\n\n📧 Email de contato: ti@aluforce.ind.br\n\nUm atendente será notificação e entrará em contato em breve. Você também pode enviar um email diretamente se preferir!',
            transferToHuman: true,
            notifySupport: true
        };
    }
    
    // Problemas técnicos
    if (bobResponses.problem.some(word => lowerMessage.includes(word))) {
        return {
            text: '🔧 Entendo que você está com um problema técnico. Vou te ajudar!\n\nPode me contar:\n• Qual módulo está apresentando o problema (Vendas, PCP, NF-e, etc.)\n• Qual erro aparece na tela\n• O que você estava fazendo quando o erro aconteceu\n\nOu se preferir, posso te conectar diretamente com o suporte técnico.',
            transferToHuman: false
        };
    }
    
    // Nota Fiscal - Opções específicas
    if (bobResponses.nfe.some(word => lowerMessage.includes(word))) {
        return {
            text: '📄 Certo! Vou te ajudar com Nota Fiscal.\n\nEscolha uma opção:\n\n📤 Emitir NF-e - Como emitir uma nota\n🔍 Consultar NF-e - Verificar status\n❌ Cancelar NF-e - Processo de cancelamento\n📥 Baixar XML/DANFE - Download de arquivos\n⚙️ Configurar Certificação - Setup inicial\n\nOu diga qual é sua dúvida específica!',
            transferToHuman: false
        };
    }
    

    // PCP - Ajuda com produção
    if (bobResponses.pcp.some(word => lowerMessage.includes(word))) {
        return {
            text: '🏭 Entendi! Você precisa de ajuda com o PCP.\n\nPosso te ajudar com:\n• Criar Ordem de Produção\n• Acompanhar status de OP\n• Baixar matéria-prima\n• Fechar produção\n• Consultar relatórios\n\nMe diga qual é sua necessidade ou acesse a Central de Ajuda para tutoriais completos!',
            transferToHuman: false
        };
    }

    // Vendas
    if (bobResponses.vendas.some(word => lowerMessage.includes(word))) {
        return {
            text: '💰 Ótimo! Vou te ajudar com Vendas.\n\nPosso te orientar sobre:\n• Criar orçamento\n• Cadastrar cliente\n• Converter orçamento em pedido\n• Consultar histórico\n• Gerar relatórios\n\nQual sua dúvida específica',
            transferToHuman: false
        };
    }

    // Financeiro
    if (bobResponses.financeiro.some(word => lowerMessage.includes(word))) {
        return {
            text: '💳 Precisa de ajuda com o Financeiro\n\nPosso te orientar sobre:\n• Lançar contas a pagar/receber\n• Gerar boletos\n• Baixar pagamentos\n• Fluxo de caixa\n• Relatórios financeiros\n\nQual sua dúvida específica',
            transferToHuman: false
        };
    }

    // RH
    if (bobResponses.rh.some(word => lowerMessage.includes(word))) {
        return {
            text: '👥 RH - Recursos Humanos.\n\nPosso te ajudar com:\n• Cadastro de funcionários\n• Folha de pagamento\n• Controle de ponto\n• Benefícios\n• Admissão/Demissão\n\nQual sua dúvida específica',
            transferToHuman: false
        };
    }

    // Compras
    if (bobResponses.compras.some(word => lowerMessage.includes(word))) {
        return {
            text: '🛒 Compras.\n\nPosso te ajudar com:\n• Criar pedido de compra\n• Cadastro de fornecedores\n• Cotação de preços\n• Entrada de mercaçãorias\n• Relatórios de compras\n\nQual sua dúvida específica',
            transferToHuman: false
        };
    }
    
    // Mensagem padrão - Oferece ajuda
    return {
        text: '🤔 Hmm... Não tenho certeza de como te ajudar com isso.\n\nMas tenho algumas opções:\n\n📚 Ver Central de Ajuda\n💬 Falar com Suporte TI\n🔧 Descrever problema técnico\n\nOu pode reformular sua pergunta que tento entender melhor! 😊',
        transferToHuman: false
    };
}

// API para obter informações do usuário logação
app.get('/api/user-info', (req, res) => {
    const userInfo = os.userInfo();
    const userName = userInfo.username;
    
    // Tentar obter nome completo do Windows (se disponível)
    let fullName = userName;
    
    // Gerar email baseação no usuário (pode ser customização)
    const email = `${userName.toLowerCase()}@empresa.com`;
    
    // Avatar baseação nas iniciais
    const initials = userName.substring(0, 2).toUpperCase();
    
    res.json({
        username: userName,
        fullName: fullName,
        email: email,
        initials: initials,
        avatar: `/api/avatar/${userName}`
    });
});

// Gerar avatar com iniciais
app.get('/api/avatar/:username', (req, res) => {
    const username = req.params.username;
    const initials = username.substring(0, 2).toUpperCase();
    
    // Criar SVG com iniciais
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    const colorIndex = username.charCodeAt(0) % colors.length;
    const color = colors[colorIndex];
    
    const svg = `
        <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="50" fill="${color}"/>
            <text x="50" y="50" text-anchor="middle" dy=".35em" fill="white" font-size="40" font-family="Arial, sans-serif" font-weight="bold">
                ${initials}
            </text>
        </svg>
    `;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
});

// Rota principal - página do colaboraçãor
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota do admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Socket.io - Gerenciamento de conexões em tempo real
io.on('connection', (socket) => {
    console.log('Nova conexão:', socket.id);

    // Usuário (colaboraçãor) entra no chat
    socket.on('user:join', async (userData) => {
        const userId = socket.id;
        const userInfo = {
            id: userId,
            name: userData.name,
            email: userData.email,
            avatar: userData.avatar,
            initials: userData.initials,
            socketId: socket.id,
            startTime: new Date(),
            status: 'ai', // Começa com IA
            withAI: true
        };

        activeChats.set(userId, userInfo);
        chatHistory.set(userId, []);

        // Criar sessão no banco
        let sessionId = null;
        try {
            const [result] = await pool.query(
                'INSERT INTO chat_sessions (user_id, user_name, user_email, started_at, status) VALUES (, , , NOW(), )',
                [userId, userData.name, userData.email, 'active']
            );
            sessionId = result.insertId;
            userInfo.sessionId = sessionId;
        } catch (err) {
            console.error('Erro ao criar sessão do chat:', err.message);
        }

        // Mensagem de boas-vindas do Bob
        const welcomeMessage = {
            id: Date.now(),
            from: 'bob',
            userName: 'Bob',
            text: `👋 Olá ${userData.name}! Eu sou o Bob, assistente virtual da ALUFORCE!\n\nEstou aqui para ajudar com:\n📚 Ajuda - Tutoriais e guias\n💬 Falar com Suporte - Contato direto com TI\n🔧 Problema Técnico - Resolver erros do sistema\n\nComo posso te ajudar hoje 😊`,
            timestamp: new Date()
        };

        chatHistory.get(userId).push(welcomeMessage);

        // Salvar mensagem no banco
        if (sessionId) {
            try {
                await pool.query(
                    'INSERT INTO chat_messages (session_id, sender, message, sent_at) VALUES (, , , NOW())',
                    [sessionId, 'bob', welcomeMessage.text]
                );
            } catch (err) {
                console.error('Erro ao salvar mensagem inicial:', err.message);
            }
        }

        socket.emit('user:joined', { 
            userId, 
            message: 'Conectação com Bob - Assistente Virtual',
            welcomeMessage: welcomeMessage
        });
        
        console.log(`✅ Usuário ${userData.name} entrou no chat com Bob (URA)`);
    });

    // Admin entra no sistema
    socket.on('admin:join', (adminData) => {
        // Verificar se é ti@aluforce.ind.br (admin autorização)
        const isAuthorized = adminData && adminData.email === 'ti@aluforce.ind.br';
        
        if (!isAuthorized) {
            socket.emit('admin:unauthorized', { 
                message: 'Acesso negação. Apenas ti@aluforce.ind.br tem permissão de admin.' 
            });
            console.log(`⛔ Tentativa de acesso admin não autorização: ${adminData.email || 'desconhecido'}`);
            return;
        }

        socket.join('admins');
        
        // Enviar lista de usuários ativos
        const activeUsers = Array.from(activeChats.values());
        socket.emit('admin:active-users', activeUsers);
        
        // Enviar histórico de todas as conversas
        const allHistory = {};
        chatHistory.forEach((messages, userId) => {
            allHistory[userId] = messages;
        });
        socket.emit('admin:all-history', allHistory);
        
        console.log(`✅ Admin autorização conectação: ${adminData.email} (${socket.id})`);
    });

    // Admin aceita atender um usuário
    socket.on('admin:accept-chat', (userId) => {
        const user = activeChats.get(userId);
        if (user) {
            user.status = 'active';
            user.adminId = socket.id;
            waitingUsers.delete(userId);

            // Notificar o usuário
            io.to(user.socketId).emit('admin:accepted', { 
                message: 'Um atendente está com você agora!' 
            });

            // Notificar admin
            socket.emit('admin:chat-accepted', { userId, user });
            
            console.log(`Admin ${socket.id} aceitou chat com ${user.name}`);
        }
    });

    // Enviar mensagem do usuário
    socket.on('user:message', async (data) => {
        const userId = socket.id;
        const user = activeChats.get(userId);
        
        if (user) {
            const message = {
                id: Date.now(),
                from: 'user',
                userName: user.name,
                text: data.message,
                timestamp: new Date()
            };

            // Salvar no histórico
            const history = chatHistory.get(userId) || [];
            history.push(message);
            chatHistory.set(userId, history);

            // Salvar no banco
            if (user.sessionId) {
                try {
                    await pool.query(
                        'INSERT INTO chat_messages (session_id, sender, message, sent_at) VALUES (, , , NOW())',
                        [user.sessionId, 'user', message.text]
                    );
                } catch (err) {
                    console.error('Erro ao salvar mensagem do usuário:', err.message);
                }
            }

            // Enviar para o admin responsável
            if (user.adminId) {
                io.to(user.adminId).emit('admin:receive-message', {
                    userId,
                    message
                });
            }

            // Confirmar para o usuário
            socket.emit('user:message-sent', message);
        }
    });

    // Enviar mensagem do admin
    socket.on('admin:message', async (data) => {
        const { userId, message: messageText } = data;
        const user = activeChats.get(userId);
        
        if (user) {
            const message = {
                id: Date.now(),
                from: 'admin',
                userName: 'Suporte',
                text: messageText,
                timestamp: new Date()
            };

            // Salvar no histórico
            const history = chatHistory.get(userId) || [];
            history.push(message);
            chatHistory.set(userId, history);

            // Salvar no banco
            if (user.sessionId) {
                try {
                    await pool.query(
                        'INSERT INTO chat_messages (session_id, sender, message, sent_at) VALUES (, , , NOW())',
                        [user.sessionId, 'admin', message.text]
                    );
                } catch (err) {
                    console.error('Erro ao salvar mensagem do admin:', err.message);
                }
            }

            // Enviar para o usuário
            io.to(user.socketId).emit('user:receive-message', message);

            // Confirmar para o admin
            socket.emit('admin:message-sent', { userId, message });
        }
    });

    // Usuário ou admin encerra o chat
    socket.on('disconnect', () => {
        // Verificar se é um usuário
        const userId = socket.id;
        const user = activeChats.get(userId);
        
        if (user) {
            // Notificar admin se estava em atendimento
            if (user.adminId) {
                io.to(user.adminId).emit('admin:user-disconnected', userId);
            }
            
            // Remover da lista de espera
            waitingUsers.delete(userId);
            
            // Manter histórico mas remover de chats ativos
            activeChats.delete(userId);
            
            // Notificar todos os admins
            io.to('admins').emit('admin:user-left', userId);
            
            console.log(`Usuário ${user.name} desconectou`);
        }

        console.log('Desconectação:', socket.id);
    });

    // Encerrar chat manualmente
    socket.on('chat:close', (userId) => {
        const user = activeChats.get(userId);
        if (user) {
            // Notificar usuário
            io.to(user.socketId).emit('chat:closed', { 
                message: 'Chat encerração pelo atendente.' 
            });

            // Notificar admin
            if (user.adminId) {
                io.to(user.adminId).emit('admin:chat-closed', userId);
            }

            activeChats.delete(userId);
            waitingUsers.delete(userId);
        }
    });
});

const PORT = process.env.PORT || 3002;

// Função para iniciar o servidor
function startServer() {
    server.listen(PORT, () => {
        console.log(`╔════════════════════════════════════════════════════════════╗`);
        console.log(`║          💬 SERVIDOR DE CHAT - ALUFORCE v2.0             ║`);
        console.log(`╚════════════════════════════════════════════════════════════╝`);
        console.log(``);
        console.log(`✅ Servidor rodando na porta ${PORT}`);
        console.log(`📍 Acesse:`);
        console.log(`   - Interface Colaboraçãores: http://localhost:${PORT}`);
        console.log(`   - Painel Admin: http://localhost:${PORT}/admin`);
        console.log(`   - WebSocket: ws://localhost:${PORT}`);
        console.log(``);
        console.log(`⚠️  Mantenha esta janela aberta para o chat funcionar`);
        console.log(``);
    });
}

// Se executação diretamente, iniciar servidor
if (require.main === module) {
    startServer();
}

// Exportar para uso via require
module.exports = { startServer, app, server, io };
