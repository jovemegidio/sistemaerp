/**
 * API DE NOTIFICAÇÕES UNIFICADAS
 * Centraliza alertas de todos os módulos do ERP
 * 
 * @author Aluforce ERP
 * @version 1.0.0
 * @date 2025-12-19
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/notificacoes
 * Retorna todas as notificações do usuário logação
 */
router.get('/', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        
        // Verificar se o pool está disponível
        if (!pool) {
            console.log('[Notificações] Pool não disponível, retornando lista vazia');
            return res.json({
                success: true,
                total: 0,
                nao_lidas: 0,
                notificacoes: []
            });
        }
        
        const usuario_id = req.user.id || 1;
        const { status, limite = 50 } = req.query;
        
        let sql = `
            SELECT 
                n.*,
                CASE 
                    WHEN n.created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 'agora'
                    WHEN n.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 'hoje'
                    WHEN n.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 'semana'
                    ELSE 'antiga'
                END as tempo_relativo
            FROM notificacoes n
            WHERE n.usuario_id =  OR n.usuario_id IS NULL
        `;
        
        const params = [usuario_id];
        
        if (status === 'nao_lida') {
            sql += ' AND n.lida = 0';
        } else if (status === 'lida') {
            sql += ' AND n.lida = 1';
        }
        
        sql += ' ORDER BY n.created_at DESC LIMIT ';
        params.push(parseInt(limite));
        
        const [notificacoes] = await pool.execute(sql, params);
        
        // Contar não lidas
        const [countResult] = await pool.execute(`
            SELECT COUNT(*) as total FROM notificacoes 
            WHERE (usuario_id =  OR usuario_id IS NULL) AND lida = 0
        `, [usuario_id]);
        
        res.json({
            success: true,
            total: notificacoes.length,
            nao_lidas: countResult[0].total,
            notificacoes
        });
        
    } catch (error) {
        console.error('[Notificações] Erro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar notificações',
            error: error.message
        });
    }
});

/**
 * GET /api/notificacoes/alertas
 * Retorna alertas críticos de todos os módulos (para o dashboard)
 */
router.get('/alertas', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const alertas = [];
        
        // FINANCEIRO - Contas vencidas
        try {
            const [contasVencidas] = await pool.execute(`
                SELECT 
                    'pagar' as tipo,
                    COUNT(*) as quantidade,
                    SUM(valor) as valor_total
                FROM contas_pagar 
                WHERE status = 'pendente' 
                    AND data_vencimento < CURDATE()
                UNION ALL
                SELECT 
                    'receber' as tipo,
                    COUNT(*) as quantidade,
                    SUM(valor) as valor_total
                FROM contas_receber 
                WHERE status = 'pendente' 
                    AND data_vencimento < CURDATE()
            `);
            
            contasVencidas.forEach(conta => {
                if (conta.quantidade > 0) {
                    alertas.push({
                        tipo: 'danger',
                        modulo: 'Financeiro',
                        icone: 'fa-exclamation-triangle',
                        titulo: conta.tipo === 'pagar'  'Contas a Pagar Vencidas' : 'Contas a Receber Vencidas',
                        mensagem: `${conta.quantidade} título(s) vencido(s) - R$ ${parseFloat(conta.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
                        link: conta.tipo === 'pagar' 
                             '/modules/Financeiro/contas-pagar.htmlstatus=vencido'
                            : '/modules/Financeiro/contas-receber.htmlstatus=vencido',
                        prioridade: 1
                    });
                }
            });
        } catch (e) {
            console.log('[Alertas] Financeiro não disponível');
        }
        
        // FINANCEIRO - Vencimentos hoje
        try {
            const [vencimentosHoje] = await pool.execute(`
                SELECT 
                    (SELECT COUNT(*) FROM contas_pagar WHERE status = 'pendente' AND data_vencimento = CURDATE()) as pagar,
                    (SELECT COUNT(*) FROM contas_receber WHERE status = 'pendente' AND data_vencimento = CURDATE()) as receber
            `);
            
            const totalHoje = (vencimentosHoje[0].pagar || 0) + (vencimentosHoje[0].receber || 0);
            if (totalHoje > 0) {
                alertas.push({
                    tipo: 'warning',
                    modulo: 'Financeiro',
                    icone: 'fa-calendar-day',
                    titulo: 'Vencimentos Hoje',
                    mensagem: `${totalHoje} título(s) vencendo hoje`,
                    link: '/modules/Financeiro/index.html',
                    prioridade: 2
                });
            }
        } catch (e) {}
        
        // VENDAS - Pedidos em análise
        try {
            const [pedidosAnalise] = await pool.execute(`
                SELECT COUNT(*) as total FROM pedidos 
                WHERE status = 'em_analise' 
                    AND created_at < DATE_SUB(NOW(), INTERVAL 3 DAY)
            `);
            
            if (pedidosAnalise[0].total > 0) {
                alertas.push({
                    tipo: 'warning',
                    modulo: 'Vendas',
                    icone: 'fa-clock',
                    titulo: 'Pedidos Aguardando',
                    mensagem: `${pedidosAnalise[0].total} pedido(s) há mais de 3 dias em análise`,
                    link: '/modules/Vendas/kanban.htmlstatus=em_analise',
                    prioridade: 2
                });
            }
        } catch (e) {}
        
        // PCP - Ordens atrasadas
        try {
            const [ordensAtrasadas] = await pool.execute(`
                SELECT COUNT(*) as total FROM ordens_producao 
                WHERE status NOT IN ('concluido', 'cancelação', 'armazenação')
                    AND data_prevista < CURDATE()
            `);
            
            if (ordensAtrasadas[0].total > 0) {
                alertas.push({
                    tipo: 'danger',
                    modulo: 'PCP',
                    icone: 'fa-industry',
                    titulo: 'Ordens Atrasadas',
                    mensagem: `${ordensAtrasadas[0].total} ordem(ns) de produção atrasada(s)`,
                    link: '/modules/PCP/ordens-producao.html',
                    prioridade: 1
                });
            }
        } catch (e) {}
        
        // PCP - Estoque baixo
        try {
            const [estoqueBaixo] = await pool.execute(`
                SELECT COUNT(*) as total FROM materiais 
                WHERE quantidade_atual <= estoque_minimo 
                    AND ativo = 1
            `);
            
            if (estoqueBaixo[0].total > 0) {
                alertas.push({
                    tipo: 'warning',
                    modulo: 'Estoque',
                    icone: 'fa-box',
                    titulo: 'Estoque Crítico',
                    mensagem: `${estoqueBaixo[0].total} item(ns) abaixo do estoque mínimo`,
                    link: '/modules/PCP/index.htmlalerta=estoque',
                    prioridade: 2
                });
            }
        } catch (e) {}
        
        // COMPRAS - Cotações pendentes
        try {
            const [cotacoesPendentes] = await pool.execute(`
                SELECT COUNT(*) as total FROM cotacoes 
                WHERE status = 'aberta' 
                    AND data_limite < DATE_ADD(CURDATE(), INTERVAL 3 DAY)
            `);
            
            if (cotacoesPendentes[0].total > 0) {
                alertas.push({
                    tipo: 'info',
                    modulo: 'Compras',
                    icone: 'fa-file-alt',
                    titulo: 'Cotações Urgentes',
                    mensagem: `${cotacoesPendentes[0].total} cotação(ões) com prazo próximo`,
                    link: '/modules/Compras/cotacoes.html',
                    prioridade: 3
                });
            }
        } catch (e) {}
        
        // RH - Férias vencendo
        try {
            const [feriasVencendo] = await pool.execute(`
                SELECT COUNT(*) as total FROM funcionarios 
                WHERE data_limite_ferias < DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                    AND data_limite_ferias > CURDATE()
                    AND status = 'ativo'
            `);
            
            if (feriasVencendo[0].total > 0) {
                alertas.push({
                    tipo: 'info',
                    modulo: 'RH',
                    icone: 'fa-umbrella-beach',
                    titulo: 'Férias a Vencer',
                    mensagem: `${feriasVencendo[0].total} funcionário(s) com férias vencendo em 30 dias`,
                    link: '/modules/RH/public/pages/ferias.html',
                    prioridade: 3
                });
            }
        } catch (e) {}

        // Se não houver alertas críticos, adicionar resumo do sistema
        if (alertas.length === 0) {
            // Verificar se há atividade recente no sistema
            try {
                const [atividade] = await pool.execute(`
                    SELECT 
                        (SELECT COUNT(*) FROM pedidos WHERE DATE(created_at) = CURDATE()) as pedidos_hoje,
                        (SELECT COUNT(*) FROM ordens_producao WHERE DATE(created_at) = CURDATE()) as ordens_hoje,
                        (SELECT COUNT(*) FROM contas_pagar WHERE DATE(created_at) = CURDATE()) as contas_pagar_hoje,
                        (SELECT COUNT(*) FROM contas_receber WHERE DATE(created_at) = CURDATE()) as contas_receber_hoje
                `);
                
                const info = atividade[0] || {};
                const totalHoje = (info.pedidos_hoje || 0) + (info.ordens_hoje || 0);
                
                if (totalHoje > 0) {
                    alertas.push({
                        tipo: 'success',
                        modulo: 'Sistema',
                        icone: 'fa-chart-line',
                        titulo: 'Atividade do Dia',
                        mensagem: `${info.pedidos_hoje || 0} pedido(s) e ${info.ordens_hoje || 0} ordem(ns) de produção criaçãos hoje`,
                        link: '/modules/Vendas/index.html',
                        prioridade: 4
                    });
                }
                
                // Adicionar resumo financeiro se houver movimentação
                const totalFinanceiro = (info.contas_pagar_hoje || 0) + (info.contas_receber_hoje || 0);
                if (totalFinanceiro > 0) {
                    alertas.push({
                        tipo: 'info',
                        modulo: 'Financeiro',
                        icone: 'fa-coins',
                        titulo: 'Movimentação Financeira',
                        mensagem: `${totalFinanceiro} lançamento(s) financeiro(s) registração(s) hoje`,
                        link: '/modules/Financeiro/index.html',
                        prioridade: 4
                    });
                }
            } catch (e) {}
            
            // Sempre adicionar status do sistema se não houver outros alertas
            if (alertas.length === 0) {
                alertas.push({
                    tipo: 'success',
                    modulo: 'Sistema',
                    icone: 'fa-check-circle',
                    titulo: 'Sistema Operacional',
                    mensagem: 'Todos os módulos funcionando normalmente. Sem alertas pendentes.',
                    link: null,
                    prioridade: 5
                });
            }
        }
        
        // Ordenar por prioridade
        alertas.sort((a, b) => a.prioridade - b.prioridade);
        
        res.json({
            success: true,
            total: alertas.length,
            alertas
        });
        
    } catch (error) {
        console.error('[Alertas] Erro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar alertas',
            error: error.message
        });
    }
});

/**
 * POST /api/notificacoes
 * Cria uma nova notificação
 */
router.post('/', async (req, res) => {
    const { 
        titulo, 
        mensagem, 
        tipo = 'info', 
        modulo, 
        link, 
        usuario_id,
        broadcast = false 
    } = req.body;
    
    if (!titulo || !mensagem) {
        return res.status(400).json({
            success: false,
            message: 'Título e mensagem são obrigatórios'
        });
    }
    
    try {
        const pool = req.app.locals.pool;
        
        const [result] = await pool.execute(`
            INSERT INTO notificacoes (
                titulo, mensagem, tipo, modulo, 
                link, usuario_id, lida, created_at
            ) VALUES (, , , , , , 0, NOW())
        `, [
            titulo,
            mensagem,
            tipo,
            modulo,
            link,
            broadcast  null : (usuario_id || req.user.id)
        ]);
        
        // Emitir via Socket.IO se disponível
        const io = req.app.locals.io;
        if (io) {
            const notificacao = {
                id: result.insertId,
                titulo,
                mensagem,
                tipo,
                modulo,
                link,
                created_at: new Date().toISOString()
            };
            
            if (broadcast) {
                io.emit('nova-notificacao', notificacao);
            } else if (usuario_id) {
                io.to(`user-${usuario_id}`).emit('nova-notificacao', notificacao);
            }
        }
        
        res.json({
            success: true,
            message: 'Notificação criada com sucesso',
            id: result.insertId
        });
        
    } catch (error) {
        console.error('[Notificações] Erro ao criar:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar notificação',
            error: error.message
        });
    }
});

/**
 * PUT /api/notificacoes/:id/lida
 * Marca uma notificação como lida
 */
router.put('/:id/lida', async (req, res) => {
    const { id } = req.params;
    
    try {
        const pool = req.app.locals.pool;
        
        await pool.execute(`
            UPDATE notificacoes SET lida = 1, lida_em = NOW() WHERE id = 
        `, [id]);
        
        res.json({ success: true, message: 'Notificação marcada como lida' });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao marcar notificação',
            error: error.message
        });
    }
});

/**
 * PUT /api/notificacoes/marcar-todas-lidas
 * Marca todas as notificações do usuário como lidas
 */
router.put('/marcar-todas-lidas', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const usuario_id = req.user.id || 1;
        
        const [result] = await pool.execute(`
            UPDATE notificacoes 
            SET lida = 1, lida_em = NOW() 
            WHERE (usuario_id =  OR usuario_id IS NULL) AND lida = 0
        `, [usuario_id]);
        
        res.json({ 
            success: true, 
            message: `${result.affectedRows} notificação(ões) marcada(s) como lida(s)` 
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao marcar notificações',
            error: error.message
        });
    }
});

/**
 * DELETE /api/notificacoes/:id
 * Remove uma notificação
 */
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const pool = req.app.locals.pool;
        
        await pool.execute(`DELETE FROM notificacoes WHERE id = `, [id]);
        
        res.json({ success: true, message: 'Notificação removida' });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao remover notificação',
            error: error.message
        });
    }
});

/**
 * DELETE /api/notificacoes/limpar-antigas
 * Remove notificações com mais de 30 dias
 */
router.delete('/limpar-antigas', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        
        const [result] = await pool.execute(`
            DELETE FROM notificacoes 
            WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        
        res.json({ 
            success: true, 
            message: `${result.affectedRows} notificação(ões) antiga(s) removida(s)` 
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao limpar notificações',
            error: error.message
        });
    }
});

module.exports = router;
