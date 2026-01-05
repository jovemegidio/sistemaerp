/**
 * Rotas de API - Módulo Financeiro
 * Controle de Contas a Pagar e Contas a Receber com permissões por usuário
 */

const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-super-dificil-de-adivinhar-@123!';

// Configuração do pool de conexões MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '@dminalu',
    database: process.env.DB_NAME || 'aluforce_vendas',
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// =====================================================
// MIDDLEWARES DE AUTENTICAÇÃO E AUTORIZAÇÃO
// =====================================================

/**
 * Middleware para verificar autenticação via JWT
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || 
                 req.cookies.authToken || 
                 req.cookies.token;
    
    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
}

/**
 * Middleware para controle de acesso ao módulo financeiro
 * - junior@aluforce.ind.br: acesso apenas a CONTAS A RECEBER
 * - hellen@aluforce.ind.br: acesso apenas a CONTAS A PAGAR
 * - andreia, douglas, T.I: acesso TOTAL (admins)
 */
function authorizeFinanceiro(section) {
    return async (req, res, next) => {
        try {
            const userEmail = req.user.email.toLowerCase();
            
            if (!userEmail) {
                return res.status(401).json({ error: 'Usuário não identificação' });
            }

            // Admins têm acesso total
            const adminEmails = [
                'andreia@aluforce.ind.br',
                'andreia.lopes@aluforce.ind.br',
                'douglas@aluforce.ind.br',
                'douglas.moreira@aluforce.ind.br',
                'ti@aluforce.ind.br'
            ];

            const isAdmin = adminEmails.includes(userEmail) || req.user.role === 'admin';

            if (isAdmin) {
                req.userAccess = 'admin';
                return next();
            }

            // Controle de acesso específico por email
            if (section === 'receber') {
                if (userEmail === 'junior@aluforce.ind.br') {
                    req.userAccess = 'receber';
                    return next();
                }
                return res.status(403).json({ 
                    error: 'Acesso negação. Você não tem permissão para acessar Contas a Receber.' 
                });
            }

            if (section === 'pagar') {
                if (userEmail === 'hellen@aluforce.ind.br') {
                    req.userAccess = 'pagar';
                    return next();
                }
                return res.status(403).json({ 
                    error: 'Acesso negação. Você não tem permissão para acessar Contas a Pagar.' 
                });
            }

            // Dashboard: admins veem tudo, júnior vê só receber, hellen vê só pagar
            if (section === 'dashboard') {
                if (userEmail === 'junior@aluforce.ind.br') {
                    req.userAccess = 'receber';
                } else if (userEmail === 'hellen@aluforce.ind.br') {
                    req.userAccess = 'pagar';
                } else {
                    return res.status(403).json({ 
                        error: 'Acesso negação ao módulo financeiro.' 
                    });
                }
                return next();
            }

            return res.status(403).json({ error: 'Acesso negação' });
        } catch (error) {
            console.error('[Financeiro] Erro no middleware de autorização:', error);
            return res.status(500).json({ error: 'Erro ao verificar permissões' });
        }
    };
}

// =====================================================
// ROTAS - DASHBOARD
// =====================================================

/**
 * GET /api/financeiro/dashboard
 * Retorna estatísticas do dashboard baseado nas permissões do usuário
 */
router.get('/dashboard', authenticateToken, authorizeFinanceiro('dashboard'), async (req, res) => {
    try {
        const userAccess = req.userAccess;
        const today = new Date().toISOString().split('T')[0];

        let result = {
            saldoAtual: 0,
            aReceber: 0,
            aPagar: 0,
            vencendoHoje: 0,
            ultimasTransacoes: []
        };

        // Admins veem tudo
        if (userAccess === 'admin') {
            const [receber] = await pool.execute(
                'SELECT SUM(valor) as total FROM contas_receber WHERE status = "PENDENTE"'
            );
            const [pagar] = await pool.execute(
                'SELECT SUM(valor) as total FROM contas_pagar WHERE status = "PENDENTE"'
            );
            const [vencendoHojeReceber] = await pool.execute(
                'SELECT COUNT(*) as count FROM contas_receber WHERE DATE(vencimento) =  AND status = "PENDENTE"',
                [today]
            );
            const [vencendoHojePagar] = await pool.execute(
                'SELECT COUNT(*) as count FROM contas_pagar WHERE DATE(vencimento) =  AND status = "PENDENTE"',
                [today]
            );

            result.aReceber = receber[0].total || 0;
            result.aPagar = pagar[0].total || 0;
            result.saldoAtual = result.aReceber - result.aPagar;
            result.vencendoHoje = (vencendoHojeReceber[0].count || 0) + (vencendoHojePagar[0].count || 0);

            // Últimas transações (ambas tabelas)
            const [transacoesReceber] = await pool.execute(
                'SELECT "Receber" as tipo, cliente_id as referencia, descricao, valor, vencimento, status FROM contas_receber ORDER BY data_criacao DESC LIMIT 5'
            );
            const [transacoesPagar] = await pool.execute(
                'SELECT "Pagar" as tipo, fornecedor_id as referencia, descricao, valor, vencimento, status FROM contas_pagar ORDER BY data_criacao DESC LIMIT 5'
            );
            result.ultimasTransacoes = [...transacoesReceber, ...transacoesPagar]
                .sort((a, b) => new Date(b.vencimento) - new Date(a.vencimento))
                .slice(0, 10);
        }
        // Júnior vê apenas contas a receber
        else if (userAccess === 'receber') {
            const [receber] = await pool.execute(
                'SELECT SUM(valor) as total FROM contas_receber WHERE status = "PENDENTE"'
            );
            const [vencendoHoje] = await pool.execute(
                'SELECT COUNT(*) as count FROM contas_receber WHERE DATE(vencimento) =  AND status = "PENDENTE"',
                [today]
            );
            const [transacoes] = await pool.execute(
                'SELECT "Receber" as tipo, cliente as referencia, descricao, valor, vencimento, status FROM contas_receber ORDER BY data_criacao DESC LIMIT 10'
            );

            result.aReceber = receber[0].total || 0;
            result.saldoAtual = result.aReceber;
            result.vencendoHoje = vencendoHoje[0].count || 0;
            result.ultimasTransacoes = transacoes;
        }
        // Hellen vê apenas contas a pagar
        else if (userAccess === 'pagar') {
            const [pagar] = await pool.execute(
                'SELECT SUM(valor) as total FROM contas_pagar WHERE status = "PENDENTE"'
            );
            const [vencendoHoje] = await pool.execute(
                'SELECT COUNT(*) as count FROM contas_pagar WHERE DATE(vencimento) =  AND status = "PENDENTE"',
                [today]
            );
            const [transacoes] = await pool.execute(
                'SELECT "Pagar" as tipo, fornecedor as referencia, descricao, valor, vencimento, status FROM contas_pagar ORDER BY data_criacao DESC LIMIT 10'
            );

            result.aPagar = pagar[0].total || 0;
            result.saldoAtual = -result.aPagar;
            result.vencendoHoje = vencendoHoje[0].count || 0;
            result.ultimasTransacoes = transacoes;
        }

        res.json(result);
    } catch (error) {
        console.error('[Financeiro] Erro ao buscar dashboard:', error);
        res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
    }
});

// =====================================================
// ROTAS - CONTAS A RECEBER
// =====================================================

/**
 * GET /api/financeiro/contas-receber
 * Lista todas as contas a receber
 */
router.get('/contas-receber', authenticateToken, authorizeFinanceiro('receber'), async (req, res) => {
    try {
        const { status, dataInicio, dataFim } = req.query;
        let query = 'SELECT * FROM contas_receber WHERE 1=1';
        const params = [];

        if (status) {
            query += ' AND status = ';
            params.push(status);
        }

        if (dataInicio) {
            query += ' AND vencimento >= ';
            params.push(dataInicio);
        }

        if (dataFim) {
            query += ' AND vencimento <= ';
            params.push(dataFim);
        }

        query += ' ORDER BY vencimento ASC';

        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (error) {
        console.error('[Financeiro] Erro ao listar contas a receber:', error);
        res.status(500).json({ error: 'Erro ao listar contas a receber' });
    }
});

/**
 * GET /api/financeiro/contas-receber/:id
 * Busca uma conta a receber específica
 */
router.get('/contas-receber/:id', authenticateToken, authorizeFinanceiro('receber'), async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.execute('SELECT * FROM contas_receber WHERE id = ', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Conta não encontrada' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('[Financeiro] Erro ao buscar conta a receber:', error);
        res.status(500).json({ error: 'Erro ao buscar conta' });
    }
});

/**
 * POST /api/financeiro/contas-receber
 * Cria uma nova conta a receber
 */
router.post('/contas-receber', authenticateToken, authorizeFinanceiro('receber'), async (req, res) => {
    try {
        const { cliente, descricao, valor, vencimento, tipo } = req.body;

        if (!cliente || !descricao || !valor || !vencimento) {
            return res.status(400).json({ error: 'Campos obrigatórios faltando' });
        }

        const [result] = await pool.execute(
            'INSERT INTO contas_receber (cliente, descricao, valor, vencimento, status, tipo, data_criacao) VALUES (?, ?, ?, ?, "PENDENTE", , NOW())',
            [cliente, descricao, valor, vencimento, tipo || 'VENDA']
        );

        res.status(201).json({ 
            message: 'Conta a receber criada com sucesso',
            id: result.insertId 
        });
    } catch (error) {
        console.error('[Financeiro] Erro ao criar conta a receber:', error);
        res.status(500).json({ error: 'Erro ao criar conta' });
    }
});

/**
 * PUT /api/financeiro/contas-receber/:id
 * Atualiza uma conta a receber
 */
router.put('/contas-receber/:id', authenticateToken, authorizeFinanceiro('receber'), async (req, res) => {
    try {
        const { id } = req.params;
        const { cliente, descricao, valor, vencimento, status, tipo } = req.body;

        const [result] = await pool.execute(
            'UPDATE contas_receber SET cliente = , descricao = , valor = , vencimento = , status = , tipo =  WHERE id = ',
            [cliente, descricao, valor, vencimento, status, tipo, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Conta não encontrada' });
        }

        // Se a conta foi paga, registrar data de pagamento
        if (status === 'PAGO') {
            await pool.execute(
                'UPDATE contas_receber SET data_pagamento = NOW() WHERE id = ',
                [id]
            );
        }

        res.json({ message: 'Conta atualizada com sucesso' });
    } catch (error) {
        console.error('[Financeiro] Erro ao atualizar conta a receber:', error);
        res.status(500).json({ error: 'Erro ao atualizar conta' });
    }
});

/**
 * DELETE /api/financeiro/contas-receber/:id
 * Remove uma conta a receber
 */
router.delete('/contas-receber/:id', authenticateToken, authorizeFinanceiro('receber'), async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.execute('DELETE FROM contas_receber WHERE id = ', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Conta não encontrada' });
        }

        res.json({ message: 'Conta removida com sucesso' });
    } catch (error) {
        console.error('[Financeiro] Erro ao remover conta a receber:', error);
        res.status(500).json({ error: 'Erro ao remover conta' });
    }
});

// =====================================================
// ROTAS - CONTAS A PAGAR
// =====================================================

/**
 * GET /api/financeiro/contas-pagar
 * Lista todas as contas a pagar
 */
router.get('/contas-pagar', authenticateToken, authorizeFinanceiro('pagar'), async (req, res) => {
    try {
        const { status, dataInicio, dataFim } = req.query;
        let query = 'SELECT * FROM contas_pagar WHERE 1=1';
        const params = [];

        if (status) {
            query += ' AND status = ';
            params.push(status);
        }

        if (dataInicio) {
            query += ' AND vencimento >= ';
            params.push(dataInicio);
        }

        if (dataFim) {
            query += ' AND vencimento <= ';
            params.push(dataFim);
        }

        query += ' ORDER BY vencimento ASC';

        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (error) {
        console.error('[Financeiro] Erro ao listar contas a pagar:', error);
        res.status(500).json({ error: 'Erro ao listar contas a pagar' });
    }
});

/**
 * GET /api/financeiro/contas-pagar/:id
 * Busca uma conta a pagar específica
 */
router.get('/contas-pagar/:id', authenticateToken, authorizeFinanceiro('pagar'), async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.execute('SELECT * FROM contas_pagar WHERE id = ', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Conta não encontrada' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('[Financeiro] Erro ao buscar conta a pagar:', error);
        res.status(500).json({ error: 'Erro ao buscar conta' });
    }
});

/**
 * POST /api/financeiro/contas-pagar
 * Cria uma nova conta a pagar
 */
router.post('/contas-pagar', authenticateToken, authorizeFinanceiro('pagar'), async (req, res) => {
    try {
        const { fornecedor_id, fornecedor, descricao, valor, vencimento, data_vencimento, categoria_id, banco_id, forma_pagamento, observacoes } = req.body;

        // Aceitar tanto 'vencimento' quanto 'data_vencimento'
        const dataVenc = data_vencimento || vencimento;

        if (!descricao || !valor || !dataVenc) {
            return res.status(400).json({ 
                error: 'Campos obrigatórios faltando',
                required: ['descricao', 'valor', 'vencimento ou data_vencimento'],
                received: req.body
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO contas_pagar (fornecedor_id, descricao, valor, data_vencimento, categoria_id, banco_id, forma_pagamento, observacoes, status) 
             VALUES (?, ?, ?, ?, , ?, ?, , "pendente")`,
            [fornecedor_id || null, descricao, valor, dataVenc, categoria_id || null, banco_id || null, forma_pagamento || null, observacoes || null]
        );

        res.status(201).json({ 
            message: 'Conta a pagar criada com sucesso',
            id: result.insertId 
        });
    } catch (error) {
        console.error('[Financeiro] Erro ao criar conta a pagar:', error);
        res.status(500).json({ error: 'Erro ao criar conta' });
    }
});

/**
 * PUT /api/financeiro/contas-pagar/:id
 * Atualiza uma conta a pagar
 */
router.put('/contas-pagar/:id', authenticateToken, authorizeFinanceiro('pagar'), async (req, res) => {
    try {
        const { id } = req.params;
        const { fornecedor, descricao, valor, vencimento, status, tipo } = req.body;

        const [result] = await pool.execute(
            'UPDATE contas_pagar SET fornecedor = , descricao = , valor = , vencimento = , status = , tipo =  WHERE id = ',
            [fornecedor, descricao, valor, vencimento, status, tipo, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Conta não encontrada' });
        }

        // Se a conta foi paga, registrar data de pagamento
        if (status === 'PAGO') {
            await pool.execute(
                'UPDATE contas_pagar SET data_pagamento = NOW() WHERE id = ',
                [id]
            );
        }

        res.json({ message: 'Conta atualizada com sucesso' });
    } catch (error) {
        console.error('[Financeiro] Erro ao atualizar conta a pagar:', error);
        res.status(500).json({ error: 'Erro ao atualizar conta' });
    }
});

/**
 * DELETE /api/financeiro/contas-pagar/:id
 * Remove uma conta a pagar
 */
router.delete('/contas-pagar/:id', authenticateToken, authorizeFinanceiro('pagar'), async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.execute('DELETE FROM contas_pagar WHERE id = ', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Conta não encontrada' });
        }

        res.json({ message: 'Conta removida com sucesso' });
    } catch (error) {
        console.error('[Financeiro] Erro ao remover conta a pagar:', error);
        res.status(500).json({ error: 'Erro ao remover conta' });
    }
});

module.exports = router;
