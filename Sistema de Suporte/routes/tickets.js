const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Criar ticket via formulário
router.post('/', async (req, res) => {
    try {
        const { name, email, subject, description } = req.body;
        const ticket = await db.createTicket({
            clientName: name,
            clientEmail: email,
            subject: subject,
            socketId: null,
            clienteId: null
        });
        
        // Adicionar a descricao como primeira mensagem
        if (description) {
            await db.addMessage({
                ticketId: ticket.id,
                sender: 'client',
                senderName: name,
                message: description
            });
        }
        
        res.json(ticket);
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// Listar todos os tickets
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        let tickets;
        
        if (status) {
            tickets = await db.getTicketsByStatus(status);
        } else {
            tickets = await db.getAllTickets();
        }
        
        res.json(tickets);
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// Estatísticas
router.get('/stats', async (req, res) => {
    try {
        const stats = await db.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// Buscar ticket por ID
router.get('/:id', async (req, res) => {
    try {
        const ticket = await db.getTicketById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket não encontrado' });
        }
        res.json(ticket);
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// Buscar mensagens de um ticket
router.get('/:id/messages', async (req, res) => {
    try {
        const messages = await db.getMessagesByTicket(req.params.id);
        res.json(messages);
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// Base de conhecimento
router.get('/knowledge/all', async (req, res) => {
    try {
        const knowledge = await db.getAllKnowledge();
        res.json(knowledge);
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/knowledge', async (req, res) => {
    try {
        const { question, answer, keywords, category } = req.body;
        const result = await db.addKnowledge({ question, answer, keywords, category });
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// Artigos de ajuda
router.get('/articles/all', async (req, res) => {
    try {
        const articles = await db.getAllArticles();
        res.json(articles);
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// Buscar clientes
router.get('/clientes/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.json([]);
        }
        const clientes = await db.searchClientes(q);
        res.json(clientes);
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// Buscar usuários/atendentes
router.get('/usuarios/all', async (req, res) => {
    try {
        const usuarios = await db.getUsuarios();
        res.json(usuarios);
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// INTEGRAÇÃO COM SISTEMA DE CHAT
// ==========================================

/**
 * Receber transferência do Sistema de Chat
 * Esta rota é chamada quando o chat com IA decide transferir para humano
 */
router.post('/transfer', async (req, res) => {
    try {
        const { 
            userId, 
            userName, 
            userEmail, 
            conversationId, 
            messages = [], 
            reason = 'Transferência solicitada pelo usuário'
        } = req.body;
        
        // Criar ticket no Sistema de Suporte
        const ticket = await db.createTicket({
            clientName: userName || 'Usuário do Chat',
            clientEmail: userEmail || '',
            subject: `Transferência do Chat: ${reason}`,
            socketId: null,
            clienteId: null
        });
        
        // Adicionar histórico de mensagens do chat
        if (messages.length > 0) {
            // Adicionar mensagem de contexto
            await db.addMessage({
                ticketId: ticket.id,
                sender: 'system',
                senderName: 'Sistema',
                message: `📋 Histórico da conversa do chat (${messages.length} mensagens)`
            });
            
            // Adicionar cada mensagem do histórico
            for (const msg of messages) {
                await db.addMessage({
                    ticketId: ticket.id,
                    sender: msg.sender === 'agent' || msg.sender === 'ai'  'ai' : 'client',
                    senderName: msg.sender === 'agent' || msg.sender === 'ai'  'Bob (IA)' : userName,
                    message: msg.content || msg.message
                });
            }
        }
        
        // Marcar ticket como aguardando atendente humano
        await db.updateTicketStatus(ticket.id, 'waiting_human');
        
        // Notificar atendentes (via Socket.IO se disponível)
        const io = req.app.get('io');
        if (io) {
            io.to('admins').emit('new_ticket', {
                ...ticket,
                status: 'waiting_human',
                fromChat: true,
                reason: reason
            });
            io.to('admins').emit('ticket_needs_attention', {
                ticketId: ticket.id,
                reason: `Transferência do Chat: ${reason}`,
                userName: userName
            });
        }
        
        console.log(`✅ Transferência recebida: Ticket #${ticket.protocolo} criado para ${userName}`);
        
        res.json({ 
            success: true, 
            ticket: {
                id: ticket.id,
                protocolo: ticket.protocolo,
                status: 'waiting_human'
            },
            message: 'Transferência realizada com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro na transferência:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;
