const mysql = require('mysql2/promise');

// Pool de conexões MySQL
// Nota: 'collation' não é suportado pelo mysql2, usar apenas 'charset'
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '@dminalu',
    database: process.env.DB_NAME || 'aluforce_vendas',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
});

// Gerar protocolo único
function gerarProtocolo() {
    const data = new Date();
    const ano = data.getFullYear().toString().slice(-2);
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SUP${ano}${mes}${dia}${random}`;
}

module.exports = {
    // Tickets
    createTicket: async ({ clientName, clientEmail, subject, socketId, clienteId = null }) => {
        const protocolo = gerarProtocolo();
        const [result] = await pool.execute(
            `INSERT INTO suporte_tickets (protocolo, cliente_id, cliente_nome, cliente_email, assunto, socket_id, status)
             VALUES (?, ?, ?, ?, ?, ?, 'ai_handling')`,
            [protocolo, clienteId, clientName, clientEmail || '', subject || '', socketId]
        );
        return {
            id: result.insertId,
            protocolo,
            clientName,
            clientEmail,
            subject,
            status: 'ai_handling',
            createdAt: new Date().toISOString()
        };
    },

    getTicketById: async (id) => {
        const [rows] = await pool.execute(
            `SELECT id, protocolo, cliente_id as clienteId, cliente_nome as clientName, 
                    cliente_email as clientEmail, assunto as subject, categoria as category,
                    status, atendente_id as atendenteId, atendente_nome as assignedTo,
                    socket_id as socketId, prioridade as priority, created_at as createdAt,
                    updated_at as updatedAt, closed_at as closedAt, resolucao as resolution,
                    avaliacao as rating
             FROM suporte_tickets WHERE id = ?`,
            [id]
        );
        return rows[0] || null;
    },

    getActiveTickets: async () => {
        const [rows] = await pool.execute(
            `SELECT id, protocolo, cliente_id as clienteId, cliente_nome as clientName, 
                    cliente_email as clientEmail, assunto as subject, categoria as category,
                    status, atendente_id as atendenteId, atendente_nome as assignedTo,
                    socket_id as socketId, prioridade as priority, created_at as createdAt,
                    updated_at as updatedAt, closed_at as closedAt, resolucao as resolution
             FROM suporte_tickets 
             WHERE status != 'closed' 
             ORDER BY created_at DESC`
        );
        return rows;
    },

    getAllTickets: async () => {
        const [rows] = await pool.execute(
            `SELECT id, protocolo, cliente_id as clienteId, cliente_nome as clientName, 
                    cliente_email as clientEmail, assunto as subject, categoria as category,
                    status, atendente_id as atendenteId, atendente_nome as assignedTo,
                    socket_id as socketId, prioridade as priority, created_at as createdAt,
                    updated_at as updatedAt, closed_at as closedAt, resolucao as resolution
             FROM suporte_tickets 
             ORDER BY created_at DESC`
        );
        return rows;
    },

    getTicketsByStatus: async (status) => {
        const [rows] = await pool.execute(
            `SELECT id, protocolo, cliente_id as clienteId, cliente_nome as clientName, 
                    cliente_email as clientEmail, assunto as subject, categoria as category,
                    status, atendente_id as atendenteId, atendente_nome as assignedTo,
                    socket_id as socketId, prioridade as priority, created_at as createdAt,
                    updated_at as updatedAt, closed_at as closedAt, resolucao as resolution
             FROM suporte_tickets 
             WHERE status = ? 
             ORDER BY created_at DESC`,
            [status]
        );
        return rows;
    },

    updateTicketStatus: async (id, status) => {
        await pool.execute(
            'UPDATE suporte_tickets SET status = ? WHERE id = ?',
            [status, id]
        );
    },

    assignTicket: async (id, adminName, adminId = null) => {
        await pool.execute(
            'UPDATE suporte_tickets SET atendente_nome = ?, atendente_id = ?, status = "human_handling" WHERE id = ?',
            [adminName, adminId, id]
        );
    },

    closeTicket: async (id, resolution) => {
        await pool.execute(
            `UPDATE suporte_tickets 
             SET status = 'closed', resolucao = ?, closed_at = NOW() 
             WHERE id = ?`,
            [resolution, id]
        );
    },

    // Messages
    addMessage: async ({ ticketId, sender, senderName, message, senderId = null }) => {
        const [result] = await pool.execute(
            `INSERT INTO suporte_mensagens (ticket_id, sender_type, sender_name, sender_id, mensagem)
             VALUES (?, ?, ?, ?, ?)`,
            [ticketId, sender, senderName || '', senderId, message]
        );
        return {
            id: result.insertId,
            ticketId,
            sender,
            senderName,
            message,
            createdAt: new Date().toISOString()
        };
    },

    getMessagesByTicket: async (ticketId) => {
        const [rows] = await pool.execute(
            `SELECT id, ticket_id as ticketId, sender_type as sender, sender_name as senderName,
                    sender_id as senderId, mensagem as message, created_at as createdAt
             FROM suporte_mensagens 
             WHERE ticket_id = ? 
             ORDER BY created_at ASC`,
            [ticketId]
        );
        return rows;
    },

    // Knowledge Base
    searchKnowledge: async (query) => {
        const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        if (words.length === 0) return [];

        const [rows] = await pool.execute(
            'SELECT * FROM suporte_base_conhecimento WHERE ativo = 1'
        );

        return rows.filter(item => {
            const keywords = (item.palavras_chave || '').toLowerCase().split(',');
            const questionLower = item.pergunta.toLowerCase();
            
            return words.some(word => 
                keywords.some(kw => kw.trim().includes(word) || word.includes(kw.trim())) ||
                questionLower.includes(word)
            );
        });
    },

    getAllKnowledge: async () => {
        const [rows] = await pool.execute(
            `SELECT id, pergunta as question, resposta as answer, 
                    palavras_chave as keywords, categoria as category, ativo as active
             FROM suporte_base_conhecimento 
             ORDER BY categoria, id`
        );
        return rows;
    },

    addKnowledge: async ({ question, answer, keywords, category }) => {
        const [result] = await pool.execute(
            `INSERT INTO suporte_base_conhecimento (pergunta, resposta, palavras_chave, categoria)
             VALUES (?, ?, ?, ?)`,
            [question, answer, keywords || '', category || 'geral']
        );
        return { lastInsertRowid: result.insertId };
    },

    // Artigos de ajuda
    getAllArticles: async () => {
        const [rows] = await pool.execute(
            `SELECT id, titulo as title, conteudo as content, categoria as category,
                    colecao as collection, visualizacoes as views
             FROM suporte_artigos 
             WHERE ativo = 1 
             ORDER BY colecao, id`
        );
        return rows;
    },

    getArticlesByCollection: async (collection) => {
        const [rows] = await pool.execute(
            `SELECT id, titulo as title, conteudo as content, categoria as category,
                    colecao as collection, visualizacoes as views
             FROM suporte_artigos 
             WHERE ativo = 1 AND colecao = ?
             ORDER BY id`,
            [collection]
        );
        return rows;
    },

    // Buscar clientes (integração com tabela existente)
    searchClientes: async (query) => {
        const [rows] = await pool.execute(
            `SELECT id, nome, email, telefone, cnpj_cpf as documento
             FROM clientes 
             WHERE nome LIKE ? OR email LIKE ? OR cnpj_cpf LIKE ?
             LIMIT 10`,
            [`%${query}%`, `%${query}%`, `%${query}%`]
        );
        return rows;
    },

    getClienteById: async (id) => {
        const [rows] = await pool.execute(
            `SELECT id, nome, email, telefone, cnpj_cpf as documento, endereco, cidade, estado
             FROM clientes WHERE id = ?`,
            [id]
        );
        return rows[0] || null;
    },

    // Buscar usuários/atendentes
    getUsuarios: async () => {
        const [rows] = await pool.execute(
            `SELECT id, nome, email, role, foto, avatar, apelido
             FROM usuarios 
             WHERE role IN ('admin', 'user')
             ORDER BY nome`
        );
        return rows;
    },

    getUsuarioById: async (id) => {
        const [rows] = await pool.execute(
            `SELECT id, nome, email, role, foto, avatar, apelido
             FROM usuarios WHERE id = ?`,
            [id]
        );
        return rows[0] || null;
    },

    // Estatísticas
    getStats: async () => {
        const [[totalResult]] = await pool.execute('SELECT COUNT(*) as count FROM suporte_tickets');
        const [[openResult]] = await pool.execute("SELECT COUNT(*) as count FROM suporte_tickets WHERE status != 'closed'");
        const [[closedTodayResult]] = await pool.execute(
            "SELECT COUNT(*) as count FROM suporte_tickets WHERE status = 'closed' AND DATE(closed_at) = CURDATE()"
        );
        const [[avgResult]] = await pool.execute(
            `SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, closed_at)) as avg_minutes
             FROM suporte_tickets WHERE status = 'closed' AND closed_at IS NOT NULL`
        );

        return {
            total: totalResult.count,
            open: openResult.count,
            closedToday: closedTodayResult.count,
            avgResponseMinutes: Math.round(avgResult.avg_minutes || 0)
        };
    },

    // Histórico de tickets do cliente
    getTicketsByCliente: async (clienteId) => {
        const [rows] = await pool.execute(
            `SELECT id, protocolo, assunto as subject, status, created_at as createdAt, closed_at as closedAt
             FROM suporte_tickets 
             WHERE cliente_id = ?
             ORDER BY created_at DESC`,
            [clienteId]
        );
        return rows;
    },

    // Test connection
    testConnection: async () => {
        try {
            const connection = await pool.getConnection();
            connection.release();
            return true;
        } catch (error) {
            console.error('Erro de conexão com MySQL:', error);
            return false;
        }
    }
};
