// API Routes for Vendas Module

const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

// Pool de conexão com o banco
let vendasPool = null;

async function getPool() {
    if (!vendasPool) {
        vendasPool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '@dminalu',
            database: process.env.DB_NAME || 'aluforce_vendas',
            waitForConnections: true,
            connectionLimit: 10
        });
    }
    return vendasPool;
}

// Função utilitária para parse seguro de JSON
function safeParseJSON(str, fallback = null) {
    if (!str) return fallback;
    if (typeof str === 'object') return str;
    try {
        return JSON.parse(str);
    } catch (e) {
        return fallback;
    }
}

// Middleware de autenticação real
const authenticateToken = (req, res, next) => {
    // Usa o middleware global se disponível
    if (req.user) {
        return next();
    }
    
    // Verifica se o token está no cookie ou header
    const jwt = require('jsonwebtoken');
    const token = req.cookies.authToken || req.cookies.token || req.headers.authorization.replace('Bearer ', '');
    
    if (!token) {
        console.log('❌ Token não encontrado - cookies:', Object.keys(req.cookies || {}));
        return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aluforce-secret-key-2024');
        req.user = decoded;
        next();
    } catch (error) {
        console.log('❌ Token inválido:', error.message);
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// =================================================================
// DASHBOARD ROUTES
// =================================================================

// GET /api/vendas/dashboard
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        // TODO: Buscar daçãos reais do banco
        const stats = {
            vendasMes: 350000,
            pedidosAtivos: 42,
            clientesAtivos: 128,
            taxaConversao: 68
        };

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar estatísticas'
        });
    }
});

// GET /api/vendas/user-info
router.get('/user-info', authenticateToken, async (req, res) => {
    try {
        // TODO: Buscar informações reais do usuário
        res.json({
            success: true,
            user: {
                name: req.user.name || 'Usuário',
                role: req.user.role || 'Vendedor',
                email: req.user.email || ''
            }
        });
    } catch (error) {
        console.error('Error getting user info:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar informações do usuário'
        });
    }
});

// =================================================================
// PEDIDOS ROUTES
// =================================================================

// GET /api/vendas/pedidos/recentes
router.get('/pedidos/recentes', authenticateToken, async (req, res) => {
    try {
        // TODO: Buscar pedidos recentes do banco
        res.json({
            success: true,
            pedidos: []
        });
    } catch (error) {
        console.error('Error getting recent pedidos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar pedidos recentes'
        });
    }
});

// GET /api/vendas/pedidos
router.get('/pedidos', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        const limit = parseInt(req.query.limit) || 200;
        
        const [pedidos] = await pool.query(`
            SELECT 
                p.id,
                p.id as numero,
                p.valor as valor_total,
                p.descricao,
                p.status,
                p.empresa_id,
                p.vendedor_id,
                p.cliente_id,
                p.created_at as data_pedido,
                p.faturação_em,
                p.frete,
                p.redespacho,
                p.observacao,
                p.prioridade,
                p.data_prevista,
                p.prazo_entrega,
                p.endereco_entrega,
                p.municipio_entrega,
                p.metodo_envio,
                COALESCE(c.nome_fantasia, c.razao_social, c.nome, 'Cliente não informação') as cliente_nome,
                c.email as cliente_email,
                c.telefone as cliente_telefone,
                u.nome as vendedor_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            ORDER BY p.id DESC
            LIMIT 
        `, [limit]);
        
        // Retornar direto o array (o frontend espera array direto)
        res.json(pedidos);
    } catch (error) {
        console.error('Error getting pedidos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar pedidos'
        });
    }
});

// GET /api/vendas/pedidos/:id
router.get('/pedidos/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        
        const [pedidos] = await pool.query(`
            SELECT p.*, 
                   p.valor as valor_total,
                   p.descricao as observacoes,
                   p.created_at as data_criacao,
                   c.nome as cliente_nome, c.email as cliente_email, c.telefone as cliente_telefone,
                   c.cnpj as cliente_cnpj, c.endereco as cliente_endereco,
                   e.nome_fantasia as empresa_nome, e.cnpj as empresa_cnpj,
                   u.nome as vendedor_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN empresas e ON p.empresa_id = e.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            WHERE p.id = 
        `, [id]);
        
        if (pedidos.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        
        // Formatar o pedido para compatibilidade com o frontend
        const pedido = pedidos[0];
        const pedidoFormatação = {
            ...pedido,
            numero: `Pedido Nº ${pedido.id}`,
            cliente: pedido.cliente_nome || '',
            vendedor: pedido.vendedor_nome || '',
            valor: parseFloat(pedido.valor) || 0,
            data: pedido.created_at  new Date(pedido.created_at).toISOString().slice(0, 10) : '',
            frete: parseFloat(pedido.frete) || 0,
            origem: 'Sistema',
            tipo: pedido.prioridade || 'normal',
            produtos: safeParseJSON(pedido.produtos_preview, [])
        };
        
        res.json(pedidoFormatação);
    } catch (error) {
        console.error('Error getting pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar pedido'
        });
    }
});

// POST /api/vendas/pedidos
router.post('/pedidos', authenticateToken, async (req, res) => {
    try {
        const { 
            cliente_id, empresa_id, produtos, valor, descricao, 
            status = 'orcamento', frete = 0, prioridade = 'normal',
            prazo_entrega, endereco_entrega, municipio_entrega, metodo_envio
        } = req.body;
        const vendedor_id = req.user.id;
        const pool = await getPool();
        
        const [result] = await pool.query(`
            INSERT INTO pedidos 
            (cliente_id, empresa_id, vendedor_id, valor, descricao, status, 
             frete, prioridade, produtos_preview, prazo_entrega, endereco_entrega, 
             municipio_entrega, metodo_envio, created_at)
            VALUES (, , , , , , , , , , , , , NOW())
        `, [
            cliente_id, empresa_id, vendedor_id, valor || 0, descricao || '',
            status, frete, prioridade, JSON.stringify(produtos || []),
            prazo_entrega, endereco_entrega, municipio_entrega, metodo_envio
        ]);
        
        res.json({ success: true, id: result.insertId, message: 'Pedido criação com sucesso' });
    } catch (error) {
        console.error('Error creating pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar pedido'
        });
    }
});

// PUT /api/vendas/pedidos/:id
router.put('/pedidos/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            cliente_id, empresa_id, produtos, valor, descricao, status,
            frete, prioridade, prazo_entrega, endereco_entrega, 
            municipio_entrega, metodo_envio, observacao
        } = req.body;
        const pool = await getPool();
        
        // Construir query dinâmica apenas com campos fornecidos
        const updates = [];
        const params = [];
        
        if (cliente_id !== undefined) { updates.push('cliente_id = '); params.push(cliente_id); }
        if (empresa_id !== undefined) { updates.push('empresa_id = '); params.push(empresa_id); }
        if (valor !== undefined) { updates.push('valor = '); params.push(valor); }
        if (descricao !== undefined) { updates.push('descricao = '); params.push(descricao); }
        if (observacao !== undefined) { updates.push('observacao = '); params.push(observacao); }
        if (status !== undefined) { updates.push('status = '); params.push(status); }
        if (frete !== undefined) { updates.push('frete = '); params.push(frete); }
        if (prioridade !== undefined) { updates.push('prioridade = '); params.push(prioridade); }
        if (prazo_entrega !== undefined) { updates.push('prazo_entrega = '); params.push(prazo_entrega); }
        if (endereco_entrega !== undefined) { updates.push('endereco_entrega = '); params.push(endereco_entrega); }
        if (municipio_entrega !== undefined) { updates.push('municipio_entrega = '); params.push(municipio_entrega); }
        if (metodo_envio !== undefined) { updates.push('metodo_envio = '); params.push(metodo_envio); }
        if (produtos !== undefined) { updates.push('produtos_preview = '); params.push(JSON.stringify(produtos)); }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }
        
        params.push(id);
        await pool.query(`UPDATE pedidos SET ${updates.join(', ')} WHERE id = `, params);
        
        res.json({ success: true, message: 'Pedido atualização com sucesso' });
    } catch (error) {
        console.error('Error updating pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar pedido'
        });
    }
});

// DELETE /api/vendas/pedidos/:id
router.delete('/pedidos/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        // TODO: Cancelar/deletar pedido no banco
        res.json({
            success: true,
            message: 'Pedido cancelação com sucesso'
        });
    } catch (error) {
        console.error('Error deleting pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao cancelar pedido'
        });
    }
});

// POST /api/vendas/pedidos/:id/historico - Registrar histórico de alterações
router.post('/pedidos/:id/historico', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo, descricao, usuario } = req.body;
        const pool = await getPool();
        
        // Verificar se o pedido existe
        const [existing] = await pool.query('SELECT id FROM pedidos WHERE id = ', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        
        // Tentar inserir no log de auditoria
        try {
            await pool.query(`
                INSERT INTO audit_log (tabela, registro_id, acao, dados_novos, usuario_id, created_at)
                VALUES ('pedidos', , , , , NOW())
            `, [id, tipo || 'historico', JSON.stringify({ descricao, usuario }), req.user.id || null]);
        } catch (auditError) {
            // Se a tabela audit_log não existir, apenas logar
            console.log('Histórico registração (audit_log não disponível):', { pedidoId: id, tipo, descricao });
        }
        
        res.json({ 
            success: true, 
            message: 'Histórico registração com sucesso'
        });
    } catch (error) {
        console.error('Error registering historico:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao registrar histórico'
        });
    }
});

// =================================================================
// CLIENTES ROUTES
// =================================================================

// GET /api/vendas/clientes
router.get('/clientes', authenticateToken, async (req, res) => {
    try {
        // TODO: Buscar clientes do banco
        res.json({
            success: true,
            clientes: []
        });
    } catch (error) {
        console.error('Error getting clientes:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar clientes'
        });
    }
});

// GET /api/vendas/clientes/:id
router.get('/clientes/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        // TODO: Buscar cliente específico do banco
        res.json({
            success: true,
            cliente: {}
        });
    } catch (error) {
        console.error('Error getting cliente:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar cliente'
        });
    }
});

// POST /api/vendas/clientes
router.post('/clientes', authenticateToken, async (req, res) => {
    try {
        const clienteData = req.body;
        // TODO: Criar novo cliente no banco
        res.json({
            success: true,
            message: 'Cliente criação com sucesso',
            clienteId: 1
        });
    } catch (error) {
        console.error('Error creating cliente:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar cliente'
        });
    }
});

// PUT /api/vendas/clientes/:id
router.put('/clientes/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const clienteData = req.body;
        // TODO: Atualizar cliente no banco
        res.json({
            success: true,
            message: 'Cliente atualização com sucesso'
        });
    } catch (error) {
        console.error('Error updating cliente:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar cliente'
        });
    }
});

// =================================================================
// PRODUTOS ROUTES
// =================================================================

// GET /api/vendas/produtos/autocomplete/:termo - Buscar produtos para autocomplete
router.get('/produtos/autocomplete/:termo', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        const termo = req.params.termo || '';
        
        if (termo.length < 2) {
            return res.json([]);
        }
        
        const searchTerm = `%${termo}%`;
        
        const [produtos] = await pool.query(`
            SELECT 
                id,
                codigo,
                descricao,
                preco_venda,
                unidade,
                estoque_atual,
                ncm,
                cfop
            FROM produtos 
            WHERE 
                codigo LIKE  OR 
                descricao LIKE  OR 
                sku LIKE 
            ORDER BY descricao ASC
            LIMIT 20
        `, [searchTerm, searchTerm, searchTerm]);
        
        res.json(produtos);
    } catch (error) {
        console.error('Erro no autocomplete de produtos:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

// GET /api/vendas/produtos
router.get('/produtos', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        const { search, limit = 50, offset = 0 } = req.query;
        
        let query = 'SELECT * FROM produtos';
        let params = [];
        
        if (search) {
            query += ' WHERE codigo LIKE  OR descricao LIKE ';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        query += ' ORDER BY descricao ASC LIMIT  OFFSET ';
        params.push(parseInt(limit), parseInt(offset));
        
        const [produtos] = await pool.query(query, params);
        
        res.json({
            success: true,
            produtos: produtos,
            categorias: []
        });
    } catch (error) {
        console.error('Error getting produtos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar produtos'
        });
    }
});

// =================================================================
// KANBAN ROUTES
// =================================================================

// GET /api/vendas/kanban
router.get('/kanban', authenticateToken, async (req, res) => {
    try {
        // TODO: Buscar cards do kanban do banco
        res.json({
            success: true,
            cards: []
        });
    } catch (error) {
        console.error('Error getting kanban:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar kanban'
        });
    }
});

// GET /api/vendas/kanban/pedidos - Listar todos os pedidos para o Kanban
router.get('/kanban/pedidos', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        
        const [pedidos] = await pool.query(`
            SELECT p.id, 
                   p.status, 
                   p.valor,
                   p.descricao as observacoes,
                   p.created_at as data_criacao,
                   p.prioridade as tipo,
                   p.frete,
                   c.nome as cliente_nome,
                   c.cnpj as cliente_cnpj,
                   u.nome as vendedor_nome,
                   e.nome_fantasia as empresa_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            LEFT JOIN empresas e ON p.empresa_id = e.id
            ORDER BY p.created_at DESC
            LIMIT 200
        `);
        
        // Formatar pedidos para o frontend
        const pedidosFormataçãos = pedidos.map(p => ({
            id: p.id,
            numero: `Orçamento Nº ${p.id}`,
            cliente: p.cliente_nome || 'Cliente não informação',
            status: p.status || 'orcamento',
            valor: parseFloat(p.valor) || 0,
            valor_total: parseFloat(p.valor) || 0,
            faturamento: p.observacoes || 'Aguardando',
            origem: 'Omie',
            tipo: p.tipo || 'a vista',
            vendedor_nome: p.vendedor_nome || '',
            data_criacao: p.data_criacao,
            observacoes: p.observacoes || ''
        }));
        
        res.json(pedidosFormataçãos);
    } catch (error) {
        console.error('Error getting kanban pedidos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar pedidos do kanban'
        });
    }
});

// PUT /api/vendas/pedidos/:id/status - Atualizar apenas o status do pedido
router.put('/pedidos/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({ error: 'Status é obrigatório' });
        }
        
        const pool = await getPool();
        
        // Verificar se o pedido existe
        const [existing] = await pool.query('SELECT id, status FROM pedidos WHERE id = ', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        
        const statusAnterior = existing[0].status;
        
        // Atualizar o status
        await pool.query('UPDATE pedidos SET status = , updated_at = NOW() WHERE id = ', [status, id]);
        
        // Registrar no log de auditoria se existir
        try {
            await pool.query(`
                INSERT INTO audit_log (tabela, registro_id, acao, dados_anteriores, dados_novos, usuario_id, created_at)
                VALUES ('pedidos', , 'status_change', , , , NOW())
            `, [id, JSON.stringify({ status: statusAnterior }), JSON.stringify({ status }), req.user.id || null]);
        } catch (auditError) {
            console.log('Audit log não disponível:', auditError.message);
        }
        
        console.log(`✅ Pedido ${id}: status alteração de "${statusAnterior}" para "${status}"`);
        
        res.json({ 
            success: true, 
            message: 'Status atualização com sucesso',
            statusAnterior,
            statusNovo: status
        });
    } catch (error) {
        console.error('Error updating pedido status:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar status do pedido'
        });
    }
});

// POST /api/vendas/kanban/mover
router.post('/kanban/mover', authenticateToken, async (req, res) => {
    try {
        const { cardId, novoStatus } = req.body;
        // TODO: Atualizar posição do card no banco
        res.json({
            success: true,
            message: 'Card movido com sucesso'
        });
    } catch (error) {
        console.error('Error moving kanban card:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao mover card'
        });
    }
});

// =================================================================
// METAS ROUTES
// =================================================================

// GET /api/vendas/metas
router.get('/metas', authenticateToken, async (req, res) => {
    try {
        // TODO: Buscar metas e comissões do banco
        res.json({
            success: true,
            metas: [],
            comissoes: []
        });
    } catch (error) {
        console.error('Error getting metas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar metas'
        });
    }
});

// =================================================================
// IMPOSTOS ROUTES
// =================================================================

// Cenários fiscais padrão (fallback quando banco não disponível)
const cenariosFiscaisPadrao = {
    venda_normal: {
        codigo: 'venda_normal',
        nome: 'Venda Normal (Dentro do Estação)',
        icms_aliquota: 18.00,
        icms_reducao_base: 0,
        icms_st_aliquota: 0,
        icms_st_mva: 0,
        ipi_aliquota: 0,
        pis_aliquota: 1.65,
        cofins_aliquota: 7.60,
        iss_aliquota: 0,
        cst_icms: '00',
        cst_ipi: '50',
        cst_pis: '01',
        cst_cofins: '01',
        cfop_dentro_estação: '5102',
        cfop_fora_estação: '6102',
        calcula_icms_st: false,
        destaca_impostos: true
    },
    venda_fora_estação: {
        codigo: 'venda_fora_estação',
        nome: 'Venda Fora do Estação',
        icms_aliquota: 12.00,
        icms_reducao_base: 0,
        icms_st_aliquota: 0,
        icms_st_mva: 0,
        ipi_aliquota: 0,
        pis_aliquota: 1.65,
        cofins_aliquota: 7.60,
        iss_aliquota: 0,
        cst_icms: '00',
        cst_ipi: '50',
        cst_pis: '01',
        cst_cofins: '01',
        cfop_dentro_estação: '5102',
        cfop_fora_estação: '6102',
        calcula_icms_st: false,
        destaca_impostos: true
    },
    venda_zona_franca: {
        codigo: 'venda_zona_franca',
        nome: 'Venda Zona Franca',
        icms_aliquota: 0,
        icms_reducao_base: 0,
        icms_st_aliquota: 0,
        icms_st_mva: 0,
        ipi_aliquota: 0,
        pis_aliquota: 1.65,
        cofins_aliquota: 7.60,
        iss_aliquota: 0,
        cst_icms: '40',
        cst_ipi: '52',
        cst_pis: '01',
        cst_cofins: '01',
        cfop_dentro_estação: '5109',
        cfop_fora_estação: '6109',
        calcula_icms_st: false,
        destaca_impostos: true
    },
    exportacao: {
        codigo: 'exportacao',
        nome: 'Exportação',
        icms_aliquota: 0,
        icms_reducao_base: 0,
        icms_st_aliquota: 0,
        icms_st_mva: 0,
        ipi_aliquota: 0,
        pis_aliquota: 0,
        cofins_aliquota: 0,
        iss_aliquota: 0,
        cst_icms: '41',
        cst_ipi: '52',
        cst_pis: '08',
        cst_cofins: '08',
        cfop_dentro_estação: '7101',
        cfop_fora_estação: '7101',
        calcula_icms_st: false,
        destaca_impostos: false
    },
    simples_nacional: {
        codigo: 'simples_nacional',
        nome: 'Simples Nacional',
        icms_aliquota: 0,
        icms_reducao_base: 0,
        icms_st_aliquota: 0,
        icms_st_mva: 0,
        ipi_aliquota: 0,
        pis_aliquota: 0,
        cofins_aliquota: 0,
        iss_aliquota: 0,
        cst_icms: '102',
        cst_ipi: '53',
        cst_pis: '49',
        cst_cofins: '49',
        cfop_dentro_estação: '5102',
        cfop_fora_estação: '6102',
        calcula_icms_st: false,
        destaca_impostos: false
    },
    industrializacao: {
        codigo: 'industrializacao',
        nome: 'Industrialização (com IPI)',
        icms_aliquota: 18.00,
        icms_reducao_base: 0,
        icms_st_aliquota: 0,
        icms_st_mva: 0,
        ipi_aliquota: 5.00,
        pis_aliquota: 1.65,
        cofins_aliquota: 7.60,
        iss_aliquota: 0,
        cst_icms: '00',
        cst_ipi: '50',
        cst_pis: '01',
        cst_cofins: '01',
        cfop_dentro_estação: '5101',
        cfop_fora_estação: '6101',
        calcula_icms_st: false,
        destaca_impostos: true
    },
    revenda: {
        codigo: 'revenda',
        nome: 'Revenda de Mercaçãorias',
        icms_aliquota: 18.00,
        icms_reducao_base: 0,
        icms_st_aliquota: 0,
        icms_st_mva: 0,
        ipi_aliquota: 0,
        pis_aliquota: 1.65,
        cofins_aliquota: 7.60,
        iss_aliquota: 0,
        cst_icms: '00',
        cst_ipi: '53',
        cst_pis: '01',
        cst_cofins: '01',
        cfop_dentro_estação: '5102',
        cfop_fora_estação: '6102',
        calcula_icms_st: false,
        destaca_impostos: true
    }
};

// GET /api/vendas/impostos/cenarios - Listar todos os cenários fiscais
router.get('/impostos/cenarios', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        
        try {
            const [cenarios] = await pool.query(`
                SELECT * FROM cenarios_fiscais WHERE ativo = 1 ORDER BY nome
            `);
            
            if (cenarios.length > 0) {
                res.json({ success: true, cenarios });
                return;
            }
        } catch (dbError) {
            console.log('Tabela cenarios_fiscais não disponível, usando padrão');
        }
        
        // Retornar cenários padrão
        res.json({ 
            success: true, 
            cenarios: Object.values(cenariosFiscaisPadrao)
        });
    } catch (error) {
        console.error('Error getting cenários fiscais:', error);
        res.status(500).json({ success: false, message: 'Erro ao carregar cenários fiscais' });
    }
});

// GET /api/vendas/impostos/cenarios/:codigo - Obter um cenário específico
router.get('/impostos/cenarios/:codigo', authenticateToken, async (req, res) => {
    try {
        const { codigo } = req.params;
        const pool = await getPool();
        
        try {
            const [cenarios] = await pool.query(`
                SELECT * FROM cenarios_fiscais WHERE codigo =  AND ativo = 1
            `, [codigo]);
            
            if (cenarios.length > 0) {
                res.json({ success: true, cenario: cenarios[0] });
                return;
            }
        } catch (dbError) {
            console.log('Tabela cenarios_fiscais não disponível, usando padrão');
        }
        
        // Retornar cenário padrão
        const cenario = cenariosFiscaisPadrao[codigo];
        if (cenario) {
            res.json({ success: true, cenario });
        } else {
            res.status(404).json({ success: false, message: 'Cenário não encontrado' });
        }
    } catch (error) {
        console.error('Error getting cenário fiscal:', error);
        res.status(500).json({ success: false, message: 'Erro ao carregar cenário fiscal' });
    }
});

// POST /api/vendas/impostos/calcular - Calcular impostos para um pedido
router.post('/impostos/calcular', authenticateToken, async (req, res) => {
    try {
        const { 
            cenario_codigo,
            valor_produtos,
            valor_desconto = 0,
            valor_frete = 0,
            valor_seguro = 0,
            outras_despesas = 0,
            itens = [],
            // Sobrescrever alíquotas se fornecidas
            icms_aliquota_custom,
            icms_reducao_custom,
            icms_st_aliquota_custom,
            icms_st_mva_custom,
            ipi_aliquota_custom,
            pis_aliquota_custom,
            cofins_aliquota_custom,
            iss_aliquota_custom
        } = req.body;
        
        // Obter cenário fiscal
        let cenario = cenariosFiscaisPadrao[cenario_codigo] || cenariosFiscaisPadrao.venda_normal;
        
        // Aplicar alíquotas customizadas se fornecidas
        const aliquotas = {
            icms: icms_aliquota_custom !== undefined ? parseFloat(icms_aliquota_custom) : cenario.icms_aliquota,
            icms_reducao: icms_reducao_custom !== undefined ? parseFloat(icms_reducao_custom) : cenario.icms_reducao_base,
            icms_st: icms_st_aliquota_custom !== undefined ? parseFloat(icms_st_aliquota_custom) : cenario.icms_st_aliquota,
            icms_st_mva: icms_st_mva_custom !== undefined ? parseFloat(icms_st_mva_custom) : cenario.icms_st_mva,
            ipi: ipi_aliquota_custom !== undefined ? parseFloat(ipi_aliquota_custom) : cenario.ipi_aliquota,
            pis: pis_aliquota_custom !== undefined ? parseFloat(pis_aliquota_custom) : cenario.pis_aliquota,
            cofins: cofins_aliquota_custom !== undefined ? parseFloat(cofins_aliquota_custom) : cenario.cofins_aliquota,
            iss: iss_aliquota_custom !== undefined ? parseFloat(iss_aliquota_custom) : cenario.iss_aliquota
        };
        
        // Calcular base de cálculo
        const valorProdutos = parseFloat(valor_produtos) || 0;
        const valorDesconto = parseFloat(valor_desconto) || 0;
        const valorFrete = parseFloat(valor_frete) || 0;
        const valorSeguro = parseFloat(valor_seguro) || 0;
        const valorOutras = parseFloat(outras_despesas) || 0;
        
        // Base para cálculo do ICMS (produtos - desconto)
        let baseICMS = valorProdutos - valorDesconto;
        
        // Aplicar redução de base se houver
        if (aliquotas.icms_reducao > 0) {
            baseICMS = baseICMS * (1 - aliquotas.icms_reducao / 100);
        }
        
        // Base para IPI é o valor dos produtos
        const baseIPI = valorProdutos;
        
        // Calcular IPI primeiro (se aplicável)
        const valorIPI = aliquotas.ipi > 0 ? baseIPI * (aliquotas.ipi / 100) : 0;
        
        // Calcular ICMS
        const valorICMS = aliquotas.icms > 0 ? baseICMS * (aliquotas.icms / 100) : 0;
        
        // Calcular ICMS ST (se aplicável)
        let valorICMSST = 0;
        let baseICMSST = 0;
        if (aliquotas.icms_st > 0 && aliquotas.icms_st_mva > 0) {
            // Base ST = (valor produtos + IPI) * (1 + MVA/100)
            baseICMSST = (valorProdutos + valorIPI) * (1 + aliquotas.icms_st_mva / 100);
            // ICMS ST = (Base ST * Alíquota ST) - ICMS próprio
            valorICMSST = (baseICMSST * (aliquotas.icms_st / 100)) - valorICMS;
            if (valorICMSST < 0) valorICMSST = 0;
        }
        
        // Base para PIS e COFINS (produtos - desconto + frete + seguro + outras despesas)
        const basePISCOFINS = valorProdutos - valorDesconto + valorFrete + valorSeguro + valorOutras;
        
        // Calcular PIS e COFINS
        const valorPIS = aliquotas.pis > 0 ? basePISCOFINS * (aliquotas.pis / 100) : 0;
        const valorCOFINS = aliquotas.cofins > 0 ? basePISCOFINS * (aliquotas.cofins / 100) : 0;
        
        // Calcular ISS (para serviços)
        const baseISS = valorProdutos - valorDesconto;
        const valorISS = aliquotas.iss > 0 ? baseISS * (aliquotas.iss / 100) : 0;
        
        // Total de impostos destacaçãos
        const totalImpostos = valorICMS + valorICMSST + valorIPI + valorPIS + valorCOFINS + valorISS;
        
        // Total da NF (produtos + IPI + ICMS ST + frete + seguro + outras - desconto)
        // Nota: PIS, COFINS e ICMS já estão inclusos no preço normalmente
        const totalNF = valorProdutos + valorIPI + valorICMSST + valorFrete + valorSeguro + valorOutras - valorDesconto;
        
        const resultação = {
            cenario: cenario.nome,
            cenario_codigo: cenario.codigo,
            
            // Alíquotas utilizadas
            aliquotas,
            
            // Bases de cálculo
            bases: {
                icms: baseICMS,
                icms_st: baseICMSST,
                ipi: baseIPI,
                pis: basePISCOFINS,
                cofins: basePISCOFINS,
                iss: baseISS
            },
            
            // Valores dos impostos
            valores: {
                icms: valorICMS,
                icms_st: valorICMSST,
                ipi: valorIPI,
                pis: valorPIS,
                cofins: valorCOFINS,
                iss: valorISS
            },
            
            // CSTs
            csts: {
                icms: cenario.cst_icms,
                ipi: cenario.cst_ipi,
                pis: cenario.cst_pis,
                cofins: cenario.cst_cofins
            },
            
            // CFOP
            cfop: {
                dentro_estação: cenario.cfop_dentro_estação,
                fora_estação: cenario.cfop_fora_estação
            },
            
            // Totalizaçãores
            totais: {
                produtos: valorProdutos,
                desconto: valorDesconto,
                frete: valorFrete,
                seguro: valorSeguro,
                outras_despesas: valorOutras,
                impostos: totalImpostos,
                nota_fiscal: totalNF
            },
            
            destaca_impostos: cenario.destaca_impostos
        };
        
        res.json({ success: true, impostos: resultação });
    } catch (error) {
        console.error('Error calculating impostos:', error);
        res.status(500).json({ success: false, message: 'Erro ao calcular impostos' });
    }
});

// POST /api/vendas/pedidos/:id/impostos - Salvar impostos de um pedido
router.post('/pedidos/:id/impostos', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { impostos, cenario_codigo } = req.body;
        
        const pool = await getPool();
        
        // Verificar se pedido existe
        const [existing] = await pool.query('SELECT id FROM pedidos WHERE id = ', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        
        // Atualizar total_impostos no pedido
        await pool.query(`
            UPDATE pedidos 
            SET total_impostos = , cenario_fiscal_id = (SELECT id FROM cenarios_fiscais WHERE codigo =  LIMIT 1)
            WHERE id = 
        `, [impostos.totais.impostos || 0, cenario_codigo, id]);
        
        // Tentar salvar detalhes na tabela pedidos_impostos
        try {
            await pool.query(`
                INSERT INTO pedidos_impostos (
                    pedido_id, cenario_fiscal_id,
                    base_calculo_icms, base_calculo_icms_st, base_calculo_ipi,
                    base_calculo_pis, base_calculo_cofins, base_calculo_iss,
                    valor_icms, valor_icms_st, valor_ipi, valor_pis, valor_cofins, valor_iss,
                    total_impostos, total_produtos, total_desconto, total_frete,
                    total_seguro, total_outras_despesas, total_nf
                ) VALUES (
                    , (SELECT id FROM cenarios_fiscais WHERE codigo =  LIMIT 1),
                    , , , , , ,
                    , , , , , ,
                    , , , , , , 
                )
                ON DUPLICATE KEY UPDATE
                    cenario_fiscal_id = VALUES(cenario_fiscal_id),
                    base_calculo_icms = VALUES(base_calculo_icms),
                    base_calculo_icms_st = VALUES(base_calculo_icms_st),
                    base_calculo_ipi = VALUES(base_calculo_ipi),
                    base_calculo_pis = VALUES(base_calculo_pis),
                    base_calculo_cofins = VALUES(base_calculo_cofins),
                    base_calculo_iss = VALUES(base_calculo_iss),
                    valor_icms = VALUES(valor_icms),
                    valor_icms_st = VALUES(valor_icms_st),
                    valor_ipi = VALUES(valor_ipi),
                    valor_pis = VALUES(valor_pis),
                    valor_cofins = VALUES(valor_cofins),
                    valor_iss = VALUES(valor_iss),
                    total_impostos = VALUES(total_impostos),
                    total_produtos = VALUES(total_produtos),
                    total_desconto = VALUES(total_desconto),
                    total_frete = VALUES(total_frete),
                    total_seguro = VALUES(total_seguro),
                    total_outras_despesas = VALUES(total_outras_despesas),
                    total_nf = VALUES(total_nf),
                    updated_at = NOW()
            `, [
                id, cenario_codigo,
                impostos.bases.icms || 0, impostos.bases.icms_st || 0, impostos.bases.ipi || 0,
                impostos.bases.pis || 0, impostos.bases.cofins || 0, impostos.bases.iss || 0,
                impostos.valores.icms || 0, impostos.valores.icms_st || 0, impostos.valores.ipi || 0,
                impostos.valores.pis || 0, impostos.valores.cofins || 0, impostos.valores.iss || 0,
                impostos.totais.impostos || 0, impostos.totais.produtos || 0, impostos.totais.desconto || 0,
                impostos.totais.frete || 0, impostos.totais.seguro || 0, impostos.totais.outras_despesas || 0,
                impostos.totais.nota_fiscal || 0
            ]);
        } catch (dbError) {
            console.log('Tabela pedidos_impostos não disponível:', dbError.message);
        }
        
        res.json({ success: true, message: 'Impostos salvos com sucesso' });
    } catch (error) {
        console.error('Error saving impostos:', error);
        res.status(500).json({ success: false, message: 'Erro ao salvar impostos' });
    }
});

// GET /api/vendas/pedidos/:id/impostos - Obter impostos de um pedido
router.get('/pedidos/:id/impostos', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        
        try {
            const [impostos] = await pool.query(`
                SELECT pi.*, cf.codigo as cenario_codigo, cf.nome as cenario_nome
                FROM pedidos_impostos pi
                LEFT JOIN cenarios_fiscais cf ON pi.cenario_fiscal_id = cf.id
                WHERE pi.pedido_id = 
            `, [id]);
            
            if (impostos.length > 0) {
                res.json({ success: true, impostos: impostos[0] });
                return;
            }
        } catch (dbError) {
            console.log('Tabela pedidos_impostos não disponível');
        }
        
        res.json({ success: true, impostos: null });
    } catch (error) {
        console.error('Error getting impostos:', error);
        res.status(500).json({ success: false, message: 'Erro ao carregar impostos' });
    }
});

// ========================================
// PDF GENERATION - ORÇAMENTO / PEDIDO
// ========================================
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// GET /api/vendas/pedidos/:id/pdf - Gerar PDF do orçamento/pedido
router.get('/pedidos/:id/pdf', authenticateToken, async (req, res) => {
    console.log('📄 Gerando PDF para pedido:', req.params.id, '| Usuário:', req.user.id || 'N/A');
    try {
        const { id } = req.params;
        const pool = await getPool();
        
        // Buscar configurações da empresa (daçãos do modal de configurações)
        const [configEmpresa] = await pool.query('SELECT * FROM configuracoes_empresa LIMIT 1');
        const empresaConfig = configEmpresa[0] || {};
        
        // Buscar daçãos completos do pedido
        const [pedidos] = await pool.query(`
            SELECT p.*, 
                   p.valor as valor_total,
                   p.descricao as observacoes_internas,
                   p.observacao as observacoes,
                   p.created_at as data_criacao,
                   c.nome as cliente_nome, 
                   c.razao_social as cliente_razao_social,
                   c.nome_fantasia as cliente_nome_fantasia,
                   c.email as cliente_email, 
                   c.telefone as cliente_telefone,
                   c.cnpj_cpf as cliente_cnpj, 
                   c.endereco as cliente_endereco,
                   c.bairro as cliente_bairro,
                   c.cidade as cliente_cidade,
                   c.estação as cliente_estação,
                   c.cep as cliente_cep,
                   c.inscricao_estadual as cliente_ie,
                   e.nome_fantasia as empresa_nome, 
                   e.razao_social as empresa_razao_social,
                   e.cnpj as empresa_cnpj,
                   e.endereco as empresa_endereco,
                   e.cidade as empresa_cidade,
                   e.estação as empresa_estação,
                   e.telefone as empresa_telefone,
                   e.email as empresa_email,
                   u.nome as vendedor_nome,
                   u.email as vendedor_email
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN empresas e ON p.empresa_id = e.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            WHERE p.id = 
        `, [id]);
        
        if (pedidos.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        
        const pedido = pedidos[0];
        
        // Buscar itens do pedido
        const [itens] = await pool.query(`
            SELECT * FROM itens_pedido WHERE pedido_id = 
        `, [id]);
        
        // Buscar daçãos do usuário que está gerando o PDF
        let usuarioGeraçãor = 'Sistema';
        if (req.user && req.user.id) {
            const [usuarios] = await pool.query('SELECT nome FROM usuarios WHERE id = ', [req.user.id]);
            if (usuarios.length > 0) {
                usuarioGeraçãor = usuarios[0].nome;
            }
        }
        
        // Criar documento PDF
        const doc = new PDFDocument({ 
            size: 'A4', 
            margin: 40,
            info: {
                Title: `Orçamento Nº ${pedido.id}`,
                Author: 'ALUFORCE Sistema',
                Subject: 'Orçamento/Pedido',
                Creator: 'ALUFORCE V.2'
            }
        });
        
        // Configurar response para PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=orcamento_${pedido.id}.pdf`);
        
        doc.pipe(res);
        
        // Cores do tema ALUFORCE
        const corPrimaria = '#f97316'; // Laranja
        const corSecundaria = '#1e293b'; // Azul escuro
        const corTexto = '#333333';
        const corClara = '#f8fafc';
        
        // ========================================
        // CABEÇALHO
        // ========================================
        
        // Logo (se existir)
        const logoPath = path.join(__dirname, '..', '..', '..', 'public', 'images', 'Logo Monocromatico - Azul - Aluforce.png');
        if (fs.existsSync(logoPath)) {
            try {
                doc.image(logoPath, 40, 30, { width: 120 });
            } catch (e) {
                console.log('Erro ao carregar logo:', e.message);
            }
        }
        
        // Daçãos da empresa (lação direito) - Priorizar daçãos das configurações
        const empresaNome = empresaConfig.razao_social || pedido.empresa_razao_social || pedido.empresa_nome || 'ALUFORCE INDÚSTRIA';
        const empresaCnpj = empresaConfig.cnpj || pedido.empresa_cnpj || '00.000.000/0001-00';
        const empresaEndereco = empresaConfig.endereco  `${empresaConfig.endereco}, ${empresaConfig.numero || ''}` : (pedido.empresa_endereco || '');
        const empresaCidade = empresaConfig.cidade || pedido.empresa_cidade || '';
        const empresaEstação = empresaConfig.estação || pedido.empresa_estação || '';
        const empresaTelefone = empresaConfig.telefone || pedido.empresa_telefone || '';
        const empresaEmail = empresaConfig.email || pedido.empresa_email || '';
        
        doc.fontSize(10)
           .fillColor(corSecundaria)
           .text(empresaNome, 350, 35, { align: 'right' })
           .fontSize(8)
           .fillColor('#666')
           .text(`CNPJ: ${empresaCnpj}`, 350, 50, { align: 'right' })
           .text(empresaEndereco, 350, 62, { align: 'right' })
           .text(`${empresaCidade} - ${empresaEstação}`, 350, 74, { align: 'right' })
           .text(`Tel: ${empresaTelefone} | ${empresaEmail}`, 350, 86, { align: 'right' });
        
        // Linha divisória
        doc.moveTo(40, 110).lineTo(555, 110).strokeColor(corPrimaria).lineWidth(2).stroke();
        
        // ========================================
        // TÍTULO DO DOCUMENTO
        // ========================================
        doc.fontSize(18)
           .fillColor(corPrimaria)
           .text(`ORÇAMENTO Nº ${String(pedido.id).padStart(6, '0')}`, 40, 125, { align: 'center' });
        
        doc.fontSize(9)
           .fillColor('#666')
           .text(`Data de Emissão: ${new Date(pedido.created_at).toLocaleDateString('pt-BR')}`, 40, 148, { align: 'center' });
        
        // ========================================
        // DADOS DO CLIENTE
        // ========================================
        let yPos = 175;
        
        // Caixa do cliente
        doc.rect(40, yPos, 515, 80).fillColor(corClara).fill();
        doc.rect(40, yPos, 515, 80).strokeColor('#e2e8f0').lineWidth(1).stroke();
        
        doc.fontSize(10)
           .fillColor(corPrimaria)
           .font('Helvetica-Bold')
           .text('DADOS DO CLIENTE', 50, yPos + 10);
        
        doc.font('Helvetica')
           .fontSize(9)
           .fillColor(corTexto);
        
        // Coluna esquerda
        doc.text(`Cliente: ${pedido.cliente_razao_social || pedido.cliente_nome || 'Não informação'}`, 50, yPos + 28);
        doc.text(`CNPJ/CPF: ${pedido.cliente_cnpj || 'Não informação'}`, 50, yPos + 42);
        doc.text(`I.E.: ${pedido.cliente_ie || 'Isento'}`, 50, yPos + 56);
        
        // Coluna direita
        doc.text(`Endereço: ${pedido.cliente_endereco || ''}, ${pedido.cliente_bairro || ''}`, 280, yPos + 28);
        doc.text(`Cidade: ${pedido.cliente_cidade || ''} - ${pedido.cliente_estação || ''}`, 280, yPos + 42);
        doc.text(`CEP: ${pedido.cliente_cep || ''} | Tel: ${pedido.cliente_telefone || ''}`, 280, yPos + 56);
        
        // ========================================
        // DADOS DO PEDIDO
        // ========================================
        yPos = 265;
        
        doc.rect(40, yPos, 255, 50).fillColor(corClara).fill();
        doc.rect(40, yPos, 255, 50).strokeColor('#e2e8f0').lineWidth(1).stroke();
        
        doc.rect(300, yPos, 255, 50).fillColor(corClara).fill();
        doc.rect(300, yPos, 255, 50).strokeColor('#e2e8f0').lineWidth(1).stroke();
        
        doc.fontSize(9)
           .fillColor(corPrimaria)
           .font('Helvetica-Bold')
           .text('VENDEDOR', 50, yPos + 8)
           .text('CONDIÇÃO DE PAGAMENTO', 310, yPos + 8);
        
        doc.font('Helvetica')
           .fillColor(corTexto)
           .text(pedido.vendedor_nome || 'Não informação', 50, yPos + 25)
           .text(pedido.vendedor_email || '', 50, yPos + 38);
        
        // Número de parcelas
        const parcelas = pedido.prioridade || 'A combinar';
        doc.text(parcelas, 310, yPos + 25);
        
        // ========================================
        // TABELA DE ITENS
        // ========================================
        yPos = 330;
        
        doc.fontSize(10)
           .fillColor(corPrimaria)
           .font('Helvetica-Bold')
           .text('ITENS DO ORÇAMENTO', 40, yPos);
        
        yPos += 20;
        
        // Cabeçalho da tabela
        doc.rect(40, yPos, 515, 22).fillColor(corSecundaria).fill();
        doc.fontSize(8)
           .fillColor('#fff')
           .font('Helvetica-Bold')
           .text('CÓDIGO', 45, yPos + 7)
           .text('DESCRIÇÃO', 105, yPos + 7)
           .text('QTD', 320, yPos + 7)
           .text('UN', 365, yPos + 7)
           .text('VLR. UNIT.', 400, yPos + 7)
           .text('VLR. TOTAL', 480, yPos + 7);
        
        yPos += 22;
        
        // Linhas da tabela
        let totalItens = 0;
        doc.font('Helvetica').fillColor(corTexto);
        
        if (itens.length > 0) {
            itens.forEach((item, idx) => {
                const bgColor = idx % 2 === 0  '#fff' : corClara;
                doc.rect(40, yPos, 515, 20).fillColor(bgColor).fill();
                doc.rect(40, yPos, 515, 20).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
                
                const valorUnit = parseFloat(item.preco_unitario) || 0;
                const quantidade = parseFloat(item.quantidade) || 0;
                const valorTotal = parseFloat(item.preco_total) || (valorUnit * quantidade);
                totalItens += valorTotal;
                
                doc.fontSize(8)
                   .fillColor(corTexto)
                   .text(item.codigo_produto || '-', 45, yPos + 6, { width: 55 })
                   .text((item.descricao || '').substring(0, 45), 105, yPos + 6, { width: 210 })
                   .text(quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 320, yPos + 6)
                   .text(item.unidade || 'UN', 365, yPos + 6)
                   .text(valorUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 400, yPos + 6)
                   .text(valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 480, yPos + 6);
                
                yPos += 20;
                
                // Nova página se necessário
                if (yPos > 700) {
                    doc.addPage();
                    yPos = 40;
                }
            });
        } else {
            // Sem itens
            doc.rect(40, yPos, 515, 30).fillColor('#fff').fill();
            doc.rect(40, yPos, 515, 30).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
            doc.fontSize(9)
               .fillColor('#888')
               .text('Nenhum item adicionação ao orçamento', 45, yPos + 10);
            yPos += 30;
        }
        
        // ========================================
        // TOTAIS
        // ========================================
        yPos += 10;
        
        const valorPedido = parseFloat(pedido.valor_total) || totalItens || 0;
        const frete = parseFloat(pedido.frete) || 0;
        const desconto = parseFloat(pedido.desconto) || 0;
        const totalFinal = valorPedido + frete - desconto;
        
        // Caixa de totais
        doc.rect(350, yPos, 205, 70).fillColor(corClara).fill();
        doc.rect(350, yPos, 205, 70).strokeColor('#e2e8f0').lineWidth(1).stroke();
        
        doc.fontSize(9)
           .fillColor(corTexto)
           .text('Subtotal:', 360, yPos + 10)
           .text(valorPedido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 480, yPos + 10, { align: 'right', width: 70 });
        
        doc.text('Frete:', 360, yPos + 25)
           .text(frete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 480, yPos + 25, { align: 'right', width: 70 });
        
        if (desconto > 0) {
            doc.text('Desconto:', 360, yPos + 40)
               .text(`- ${desconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 480, yPos + 40, { align: 'right', width: 70 });
        }
        
        doc.moveTo(360, yPos + 52).lineTo(545, yPos + 52).strokeColor('#ccc').lineWidth(0.5).stroke();
        
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor(corPrimaria)
           .text('TOTAL:', 360, yPos + 55)
           .text(totalFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 480, yPos + 55, { align: 'right', width: 70 });
        
        // ========================================
        // OBSERVAÇÕES
        // ========================================
        yPos += 90;
        
        if (yPos > 650) {
            doc.addPage();
            yPos = 40;
        }
        
        if (pedido.observacoes || pedido.observacoes_internas) {
            doc.fontSize(10)
               .fillColor(corPrimaria)
               .font('Helvetica-Bold')
               .text('OBSERVAÇÕES', 40, yPos);
            
            yPos += 15;
            
            doc.rect(40, yPos, 515, 60).fillColor('#fff').fill();
            doc.rect(40, yPos, 515, 60).strokeColor('#e2e8f0').lineWidth(1).stroke();
            
            doc.fontSize(9)
               .font('Helvetica')
               .fillColor(corTexto)
               .text(pedido.observacoes || pedido.observacoes_internas || '', 50, yPos + 10, { 
                   width: 495, 
                   height: 50,
                   ellipsis: true 
               });
            
            yPos += 70;
        }
        
        // ========================================
        // RODAPÉ
        // ========================================
        
        // Linha final
        doc.moveTo(40, 750).lineTo(555, 750).strokeColor('#e2e8f0').lineWidth(1).stroke();
        
        doc.fontSize(8)
           .fillColor('#888')
           .font('Helvetica')
           .text(`Documento geração em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} por ${usuarioGeraçãor}`, 40, 758, { align: 'center' })
           .text('Este orçamento tem validade de 7 dias a partir da data de emissão.', 40, 770, { align: 'center' })
           .text('ALUFORCE Sistema de Gestão Empresarial v2.1', 40, 782, { align: 'center' });
        
        // Finalizar documento
        doc.end();
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao gerar PDF',
            error: error.message 
        });
    }
});

module.exports = router;
