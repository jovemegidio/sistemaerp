// ========================================
// VENDAS - APIs do Módulo
// ========================================

// Kanban - Obter pedidos
app.get('/api/vendas/kanban/pedidos', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const isAdmin = req.user.setor === 'TI' || req.user.cargo === 'Diretor' || req.user.cargo === 'Gerente';

        let query = `
            SELECT 
                p.id,
                p.numero_pedido as id,
                c.nome as cliente,
                u.nome as vendedor,
                p.valor_total as valor,
                DATE_FORMAT(p.data_pedido, '%d/%m/%Y') as data,
                p.prazo_pagamento as prazo,
                p.status
            FROM pedidos_vendas p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            WHERE 1=1
        `;

        // Se não for admin, mostrar apenas seus pedidos
        if (!isAdmin) {
            query += ` AND p.vendedor_id = ?`;
        }

        query += ` ORDER BY p.data_pedido DESC`;

        const pedidos = isAdmin 
            ? await db.query(query)
            : await db.query(query, [userId]);

        res.json({
            success: true,
            pedidos: pedidos || []
        });

    } catch (error) {
        console.error('Erro ao buscar pedidos kanban:', error);
        res.json({ success: false, error: error.message });
    }
});

// Kanban - Atualizar status
app.post('/api/vendas/kanban/atualizar-status', authenticateToken, async (req, res) => {
    try {
        const { pedido_id, status } = req.body;

        await db.query(
            'UPDATE pedidos_vendas SET status = ?, updated_at = NOW() WHERE numero_pedido = ?',
            [status, pedido_id]
        );

        res.json({
            success: true,
            message: 'Status atualizado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.json({ success: false, error: error.message });
    }
});

// Dashboard Vendedor
app.get('/api/vendas/dashboard/vendedor', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const mesAtual = new Date().getMonth() + 1;
        const anoAtual = new Date().getFullYear();

        // Metas
        const metaMensal = await db.query(
            `SELECT meta_valor, realizado_valor, (realizado_valor / meta_valor * 100) as percentual
             FROM metas_vendedores 
             WHERE vendedor_id = ? AND mes = ? AND ano = ?`,
            [userId, mesAtual, anoAtual]
        );

        // Pedidos do vendedor
        const pedidosStats = await db.query(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status IN ('pedido_aprovado', 'faturar', 'faturado', 'recibo') THEN 1 ELSE 0 END) as aprovados,
                SUM(CASE WHEN status = 'analise_credito' THEN 1 ELSE 0 END) as em_analise,
                SUM(CASE WHEN status = 'rejeitado' THEN 1 ELSE 0 END) as rejeitados,
                SUM(valor_total) as valor_total,
                AVG(valor_total) as ticket_medio
             FROM pedidos_vendas
             WHERE vendedor_id = ? AND MONTH(data_pedido) = ? AND YEAR(data_pedido) = ?`,
            [userId, mesAtual, anoAtual]
        );

        // Top produtos vendidos
        const topProdutos = await db.query(
            `SELECT 
                pr.nome,
                SUM(ip.quantidade) as quantidade,
                SUM(ip.valor_total) as valor
             FROM itens_pedido ip
             JOIN pedidos_vendas p ON ip.pedido_id = p.id
             JOIN produtos pr ON ip.produto_id = pr.id
             WHERE p.vendedor_id = ? AND MONTH(p.data_pedido) = ? AND YEAR(p.data_pedido) = ?
             GROUP BY pr.id, pr.nome
             ORDER BY valor DESC
             LIMIT 5`,
            [userId, mesAtual, anoAtual]
        );

        res.json({
            success: true,
            metas: {
                mensal: metaMensal[0] || { meta_valor: 150000, realizado_valor: 0, percentual: 0 }
            },
            pedidos: pedidosStats[0] || {},
            topProdutos: topProdutos || []
        });

    } catch (error) {
        console.error('Erro ao buscar dashboard vendedor:', error);
        res.json({ success: false, error: error.message });
    }
});

// Dashboard Admin
app.get('/api/vendas/dashboard/admin', authenticateToken, async (req, res) => {
    try {
        // Verificar se é admin
        const isAdmin = req.user.setor === 'TI' || req.user.cargo === 'Diretor' || req.user.cargo === 'Gerente';
        
        if (!isAdmin) {
            return res.json({ success: false, error: 'Acesso negado' });
        }

        const mesAtual = new Date().getMonth() + 1;
        const anoAtual = new Date().getFullYear();

        // Resumo geral
        const resumoGeral = await db.query(
            `SELECT 
                SUM(valor_total) as faturamento_total,
                COUNT(*) as pedidos_total,
                AVG(valor_total) as ticket_medio,
                (SUM(CASE WHEN status IN ('pedido_aprovado', 'faturar', 'faturado', 'recibo') THEN 1 ELSE 0 END) / COUNT(*) * 100) as taxa_conversao
             FROM pedidos_vendas
             WHERE MONTH(data_pedido) = ? AND YEAR(data_pedido) = ?`,
            [mesAtual, anoAtual]
        );

        // Ranking de vendedores
        const vendedores = await db.query(
            `SELECT 
                u.nome,
                COUNT(p.id) as pedidos,
                SUM(p.valor_total) as valor,
                m.meta_valor as meta,
                (SUM(p.valor_total) / m.meta_valor * 100) as atingimento
             FROM usuarios u
             LEFT JOIN pedidos_vendas p ON p.vendedor_id = u.id AND MONTH(p.data_pedido) = ? AND YEAR(p.data_pedido) = ?
             LEFT JOIN metas_vendedores m ON m.vendedor_id = u.id AND m.mes = ? AND m.ano = ?
             WHERE u.setor = 'Vendas' OR u.cargo LIKE '%Vendedor%'
             GROUP BY u.id, u.nome, m.meta_valor
             ORDER BY valor DESC`,
            [mesAtual, anoAtual, mesAtual, anoAtual]
        );

        // Faturamento mensal (últimos 12 meses)
        const faturamentoMensal = await db.query(
            `SELECT 
                DATE_FORMAT(data_pedido, '%b') as mes,
                SUM(valor_total) as valor
             FROM pedidos_vendas
             WHERE data_pedido >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
             GROUP BY YEAR(data_pedido), MONTH(data_pedido)
             ORDER BY YEAR(data_pedido), MONTH(data_pedido)`
        );

        res.json({
            success: true,
            resumoGeral: resumoGeral[0] || {},
            vendedores: vendedores || [],
            graficos: {
                faturamento_mensal: faturamentoMensal || []
            }
        });

    } catch (error) {
        console.error('Erro ao buscar dashboard admin:', error);
        res.json({ success: false, error: error.message });
    }
});

// Clientes - CRUD completo
app.get('/api/vendas/clientes', authenticateToken, async (req, res) => {
    try {
        const clientes = await db.query(
            `SELECT id, nome, cnpj, email, telefone, cidade, estado, status, DATE_FORMAT(created_at, '%d/%m/%Y') as cadastro
             FROM clientes
             ORDER BY nome ASC`
        );

        res.json({
            success: true,
            clientes: clientes || []
        });

    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        res.json({ success: false, error: error.message });
    }
});

app.post('/api/vendas/clientes', authenticateToken, async (req, res) => {
    try {
        const { nome, cnpj, email, telefone, endereco, cidade, estado } = req.body;

        const result = await db.query(
            `INSERT INTO clientes (nome, cnpj, email, telefone, endereco, cidade, estado, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'ativo', NOW())`,
            [nome, cnpj, email, telefone, endereco, cidade, estado]
        );

        res.json({
            success: true,
            message: 'Cliente cadastrado com sucesso',
            cliente_id: result.insertId
        });

    } catch (error) {
        console.error('Erro ao cadastrar cliente:', error);
        res.json({ success: false, error: error.message });
    }
});

app.put('/api/vendas/clientes/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, cnpj, email, telefone, endereco, cidade, estado, status } = req.body;

        await db.query(
            `UPDATE clientes 
             SET nome = ?, cnpj = ?, email = ?, telefone = ?, endereco = ?, cidade = ?, estado = ?, status = ?, updated_at = NOW()
             WHERE id = ?`,
            [nome, cnpj, email, telefone, endereco, cidade, estado, status, id]
        );

        res.json({
            success: true,
            message: 'Cliente atualizado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        res.json({ success: false, error: error.message });
    }
});

app.delete('/api/vendas/clientes/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        await db.query('UPDATE clientes SET status = "inativo", updated_at = NOW() WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Cliente inativado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao inativar cliente:', error);
        res.json({ success: false, error: error.message });
    }
});

// Produtos
app.get('/api/vendas/produtos', authenticateToken, async (req, res) => {
    try {
        const produtos = await db.query(
            `SELECT id, codigo, nome, descricao, preco, estoque, unidade, categoria, status
             FROM produtos
             WHERE status = 'ativo'
             ORDER BY nome ASC`
        );

        res.json({
            success: true,
            produtos: produtos || []
        });

    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.json({ success: false, error: error.message });
    }
});

console.log('[VENDAS] APIs do módulo de Vendas carregadas');
