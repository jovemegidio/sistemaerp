require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const db = require('./database/db');
const aiService = require('./services/aiService');
const ticketRoutes = require('./routes/tickets');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Middleware - CORS configuração para permitir credenciais
app.use(cors({
    origin: function(origin, callback) {
        // Permitir requisições sem origin (como apps mobile ou curl)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true); // Permitir todos por enquanto em dev
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota específica para o widget
app.get('/widget', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'widget', 'index.html'));
});

// Disponibilizar io para as rotas
app.set('io', io);

// Rotas API
app.use('/api/tickets', ticketRoutes);

// Armazenar conexões ativas
const activeConnections = new Map();
const adminSockets = new Set();

// Socket.IO para comunicação em tempo real
io.on('connection', (socket) => {
    console.log('Nova conexão:', socket.id);

    // Cliente se identifica
    socket.on('identify', async (data) => {
        if (data.type === 'admin') {
            adminSockets.add(socket.id);
            socket.join('admins');
            console.log('Admin conectação:', socket.id);
            
            // Enviar lista de tickets ativos
            try {
                const tickets = await db.getActiveTickets();
                socket.emit('tickets_list', tickets);
            } catch (error) {
                console.error('Erro ao buscar tickets:', error);
            }
        } else {
            activeConnections.set(socket.id, {
                name: data.name || 'Visitante',
                email: data.email || '',
                clienteId: data.clienteId || null,
                ticketId: null
            });
            console.log('Cliente conectação:', data.name);
        }
    });

    // Cliente envia mensagem
    socket.on('client_message', async (data) => {
        const connection = activeConnections.get(socket.id);
        if (!connection) return;

        try {
            let ticket;
            
            // Criar ticket se não existir
            if (!connection.ticketId) {
                ticket = await db.createTicket({
                    clientName: connection.name,
                    clientEmail: connection.email,
                    subject: data.message.substring(0, 50),
                    socketId: socket.id,
                    clienteId: connection.clienteId
                });
                connection.ticketId = ticket.id;
                activeConnections.set(socket.id, connection);
                
                // Notificar admins sobre novo ticket
                io.to('admins').emit('new_ticket', ticket);
            } else {
                ticket = await db.getTicketById(connection.ticketId);
            }

            // Salvar mensagem do cliente
            await db.addMessage({
                ticketId: connection.ticketId,
                sender: 'client',
                senderName: connection.name,
                message: data.message
            });

            // Enviar para admins
            io.to('admins').emit('ticket_message', {
                ticketId: connection.ticketId,
                sender: 'client',
                senderName: connection.name,
                message: data.message,
                timestamp: new Date().toISOString()
            });

            // Se o ticket está com IA, processar resposta automática
            if (ticket && ticket.status === 'ai_handling') {
                const aiResponse = await aiService.processMessage(data.message, ticket);
                
                if (aiResponse.transferToHuman) {
                    // Transferir para humano
                    await db.updateTicketStatus(connection.ticketId, 'waiting_human');
                    socket.emit('message', {
                        sender: 'system',
                        message: aiService.getTransferMessage(),
                        timestamp: new Date().toISOString()
                    });
                    io.to('admins').emit('ticket_needs_attention', {
                        ticketId: connection.ticketId,
                        reason: aiResponse.reason
                    });
                    
                    // Atualizar ticket para admins
                    const updatedTicket = await db.getTicketById(connection.ticketId);
                    io.to('admins').emit('ticket_updated', updatedTicket);
                } else {
                    // Resposta da IA
                    await db.addMessage({
                        ticketId: connection.ticketId,
                        sender: 'ai',
                        senderName: 'Assistente Virtual',
                        message: aiResponse.message
                    });
                    
                    socket.emit('message', {
                        sender: 'ai',
                        senderName: 'Assistente Virtual',
                        message: aiResponse.message,
                        timestamp: new Date().toISOString()
                    });

                    io.to('admins').emit('ticket_message', {
                        ticketId: connection.ticketId,
                        sender: 'ai',
                        senderName: 'Assistente Virtual',
                        message: aiResponse.message,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        } catch (error) {
            console.error('Erro ao processar mensagem:', error);
        }
    });

    // Admin assume atendimento
    socket.on('admin_take_ticket', async (data) => {
        try {
            const { ticketId, adminName, adminId } = data;
            await db.assignTicket(ticketId, adminName, adminId);

            const ticket = await db.getTicketById(ticketId);
            if (ticket && ticket.socketId) {
                io.to(ticket.socketId).emit('message', {
                    sender: 'system',
                    message: `${adminName} assumiu seu atendimento. Como posso ajudar`,
                    timestamp: new Date().toISOString()
                });
                io.to(ticket.socketId).emit('agent_connected', { name: adminName });
            }

            io.to('admins').emit('ticket_updated', await db.getTicketById(ticketId));
        } catch (error) {
            console.error('Erro ao assumir ticket:', error);
        }
    });

    // Admin envia mensagem
    socket.on('admin_message', async (data) => {
        try {
            const { ticketId, message, adminName, adminId } = data;
            
            await db.addMessage({
                ticketId,
                sender: 'admin',
                senderName: adminName,
                message,
                senderId: adminId
            });

            const ticket = await db.getTicketById(ticketId);
            if (ticket && ticket.socketId) {
                io.to(ticket.socketId).emit('message', {
                    sender: 'admin',
                    senderName: adminName,
                    message,
                    timestamp: new Date().toISOString()
                });
            }

            io.to('admins').emit('ticket_message', {
                ticketId,
                sender: 'admin',
                senderName: adminName,
                message,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
        }
    });

    // Admin fecha ticket
    socket.on('admin_close_ticket', async (data) => {
        try {
            const { ticketId, resolution } = data;
            await db.closeTicket(ticketId, resolution);

            const ticket = await db.getTicketById(ticketId);
            if (ticket && ticket.socketId) {
                io.to(ticket.socketId).emit('message', {
                    sender: 'system',
                    message: 'Seu atendimento foi encerrado. Obrigação pelo contato! 🙏',
                    timestamp: new Date().toISOString()
                });
                io.to(ticket.socketId).emit('ticket_closed');
            }

            io.to('admins').emit('ticket_updated', await db.getTicketById(ticketId));
        } catch (error) {
            console.error('Erro ao fechar ticket:', error);
        }
    });

    // Admin reabre ticket
    socket.on('admin_reopen_ticket', async (data) => {
        try {
            const { ticketId } = data;
            await db.updateTicketStatus(ticketId, 'waiting_human');
            io.to('admins').emit('ticket_updated', await db.getTicketById(ticketId));
        } catch (error) {
            console.error('Erro ao reabrir ticket:', error);
        }
    });

    // Desconexão
    socket.on('disconnect', async () => {
        if (adminSockets.has(socket.id)) {
            adminSockets.delete(socket.id);
            console.log('Admin desconectação:', socket.id);
        } else {
            const connection = activeConnections.get(socket.id);
            if (connection && connection.ticketId) {
                try {
                    await db.addMessage({
                        ticketId: connection.ticketId,
                        sender: 'system',
                        senderName: 'Sistema',
                        message: 'Cliente desconectou'
                    });
                } catch (error) {
                    console.error('Erro ao registrar desconexão:', error);
                }
                io.to('admins').emit('client_disconnected', { ticketId: connection.ticketId });
            }
            activeConnections.delete(socket.id);
            console.log('Cliente desconectação:', socket.id);
        }
    });
});

// Testar conexão com banco
async function testDatabase() {
    const connected = await db.testConnection();
    if (connected) {
        console.log('✅ Conectação ao MySQL - aluforce_vendas');
    } else {
        console.error('❌ Falha na conexão com MySQL');
    }
}

// Iniciar servidor
const PORT = process.env.PORT || 3003;

// Função para iniciar o servidor
async function startServer() {
    await testDatabase();
    server.listen(PORT, () => {
        console.log(`🚀 Servidor de Suporte rodando na porta ${PORT}`);
        console.log(`📱 Painel Admin: http://localhost:${PORT}/admin`);
        console.log(`💬 Chat Cliente: http://localhost:${PORT}`);
    });
}

// Se executação diretamente, iniciar servidor
if (require.main === module) {
    startServer();
}

// Exportar para uso via require
module.exports = { startServer, app, server, io };
