/**
 * API de Workflow de Aprovações
 * Sistema de aprovação para pedidos, compras e pagamentos
 * @author Aluforce ERP
 * @version 1.0.0
 */

const express = require('express');

module.exports = function({ pool, authenticateToken, io }) {
    const router = express.Router();
    router.use(authenticateToken);

    // Tipos de aprovação e seus limites
    const TIPOS_APROVACAO = {
        'pedido_venda': {
            nome: 'Pedido de Venda',
            tabela: 'pedidos',
            campo_valor: 'valor_total',
            campo_status: 'status',
            status_pendente: 'pendente_aprovacao',
            status_aprovado: 'aprovado',
            status_rejeitado: 'rejeitado'
        },
        'pedido_compra': {
            nome: 'Pedido de Compra',
            tabela: 'pedidos_compras',
            campo_valor: 'valor_total',
            campo_status: 'status',
            status_pendente: 'pendente_aprovacao',
            status_aprovado: 'aprovado',
            status_rejeitado: 'rejeitado'
        },
        'pagamento': {
            nome: 'Pagamento',
            tabela: 'contas_pagar',
            campo_valor: 'valor',
            campo_status: 'aprovacao_status',
            status_pendente: 'pendente',
            status_aprovado: 'aprovado',
            status_rejeitado: 'rejeitado'
        },
        'ordem_producao': {
            nome: 'Ordem de Produção',
            tabela: 'ordens_producao',
            campo_valor: 'valor_estimado',
            campo_status: 'aprovacao_status',
            status_pendente: 'pendente',
            status_aprovado: 'aprovado',
            status_rejeitado: 'rejeitado'
        }
    };

    // ==================== CONFIGURAÇÃO DE ALÇADAS ====================
    
    /**
     * GET /alcadas - Listar alçadas de aprovação
     */
    router.get('/alcadas', async (req, res) => {
        try {
            const [alcadas] = await pool.query(`
                SELECT 
                    a.*,
                    u.nome as aprovador_nome,
                    p.nome as perfil_nome
                FROM alcadas_aprovacao a
                LEFT JOIN usuarios u ON a.aprovador_id = u.id
                LEFT JOIN perfis_permissao p ON a.perfil_id = p.id
                WHERE a.ativo = TRUE
                ORDER BY a.tipo, a.valor_minimo
            `);
            
            res.json({ success: true, data: alcadas });
        } catch (error) {
            console.error('[WORKFLOW] Erro ao listar alçadas:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * POST /alcadas - Criar alçada
     */
    router.post('/alcadas', async (req, res) => {
        try {
            const { tipo, valor_minimo, valor_maximo, aprovador_id, perfil_id, descricao } = req.body;
            
            if (!tipo || !TIPOS_APROVACAO[tipo]) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Tipo de aprovação inválido' 
                });
            }
            
            if (!aprovador_id && !perfil_id) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Informe um aprovador ou perfil' 
                });
            }
            
            const [result] = await pool.query(`
                INSERT INTO alcadas_aprovacao (tipo, valor_minimo, valor_maximo, aprovador_id, perfil_id, descricao)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [tipo, valor_minimo || 0, valor_maximo || 999999999, aprovador_id, perfil_id, descricao || '']);
            
            res.status(201).json({ 
                success: true, 
                message: 'Alçada criada',
                data: { id: result.insertId }
            });
        } catch (error) {
            console.error('[WORKFLOW] Erro ao criar alçada:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ==================== SOLICITAÇÕES DE APROVAÇÃO ====================
    
    /**
     * POST /solicitar - Solicitar aprovação
     */
    router.post('/solicitar', async (req, res) => {
        try {
            const { tipo, registro_id, observacao } = req.body;
            
            if (!tipo || !TIPOS_APROVACAO[tipo]) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Tipo de aprovação inválido' 
                });
            }
            
            const config = TIPOS_APROVACAO[tipo];
            
            // Buscar o registro
            const [[registro]] = await pool.query(`
                SELECT * FROM ${config.tabela} WHERE id = ?
            `, [registro_id]);
            
            if (!registro) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Registro não encontrado' 
                });
            }
            
            const valor = registro[config.campo_valor] || 0;
            
            // Buscar aprovador adequado pela alçada
            const [[alcada]] = await pool.query(`
                SELECT * FROM alcadas_aprovacao
                WHERE tipo = ?
                AND ? >= valor_minimo
                AND ? <= valor_maximo
                AND ativo = TRUE
                ORDER BY valor_minimo DESC
                LIMIT 1
            `, [tipo, valor, valor]);
            
            let aprovadorId = null;
            
            if (alcada) {
                if (alcada.aprovador_id) {
                    aprovadorId = alcada.aprovador_id;
                } else if (alcada.perfil_id) {
                    // Buscar um usuário com esse perfil
                    const [[usuario]] = await pool.query(`
                        SELECT id FROM usuarios 
                        WHERE perfil_id = ? AND ativo = TRUE
                        LIMIT 1
                    `, [alcada.perfil_id]);
                    aprovadorId = usuario?.id;
                }
            }
            
            // Se não encontrou aprovador específico, buscar admin
            if (!aprovadorId) {
                const [[admin]] = await pool.query(`
                    SELECT id FROM usuarios WHERE is_admin = 1 AND ativo = TRUE LIMIT 1
                `);
                aprovadorId = admin?.id;
            }
            
            // Criar solicitação
            const [result] = await pool.query(`
                INSERT INTO solicitacoes_aprovacao (
                    tipo, registro_id, valor, solicitante_id, aprovador_id, observacao, status
                ) VALUES (?, ?, ?, ?, ?, ?, 'pendente')
            `, [tipo, registro_id, valor, req.user.id, aprovadorId, observacao || '']);
            
            // Atualizar status do registro
            await pool.query(`
                UPDATE ${config.tabela} SET ${config.campo_status} = ? WHERE id = ?
            `, [config.status_pendente, registro_id]);
            
            // Criar notificação para o aprovador
            if (aprovadorId) {
                await pool.query(`
                    INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, prioridade, entidade_tipo, entidade_id)
                    VALUES (?, ?, ?, 'aviso', ?, 'alta', ?, ?)
                `, [
                    aprovadorId,
                    `Aprovação pendente: ${config.nome}`,
                    `${req.user.nome} solicitou aprovação para ${config.nome} no valor de R$ ${valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
                    tipo.split('_')[0],
                    tipo,
                    registro_id
                ]).catch(() => {});
                
                // Emitir evento Socket.IO
                if (io) {
                    io.to(`user_${aprovadorId}`).emit('nova_aprovacao', {
                        id: result.insertId,
                        tipo,
                        valor,
                        solicitante: req.user.nome
                    });
                }
            }
            
            res.json({ 
                success: true, 
                message: 'Aprovação solicitada',
                data: { 
                    id: result.insertId,
                    aprovador_id: aprovadorId
                }
            });
        } catch (error) {
            console.error('[WORKFLOW] Erro ao solicitar aprovação:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * GET /pendentes - Listar aprovações pendentes (do usuário logado)
     */
    router.get('/pendentes', async (req, res) => {
        try {
            const userId = req.user.id;
            const isAdmin = req.user.is_admin === 1 || req.user.role === 'admin';
            
            let where = "sa.status = 'pendente'";
            const params = [];
            
            if (!isAdmin) {
                where += ' AND sa.aprovador_id = ?';
                params.push(userId);
            }
            
            const [pendentes] = await pool.query(`
                SELECT 
                    sa.*,
                    us.nome as solicitante_nome,
                    ua.nome as aprovador_nome
                FROM solicitacoes_aprovacao sa
                LEFT JOIN usuarios us ON sa.solicitante_id = us.id
                LEFT JOIN usuarios ua ON sa.aprovador_id = ua.id
                WHERE ${where}
                ORDER BY sa.criado_em DESC
            `, params);
            
            // Enriquecer com dados do registro original
            for (const item of pendentes) {
                const config = TIPOS_APROVACAO[item.tipo];
                if (config) {
                    const [[registro]] = await pool.query(`
                        SELECT * FROM ${config.tabela} WHERE id = ?
                    `, [item.registro_id]);
                    item.registro = registro;
                    item.tipo_nome = config.nome;
                }
            }
            
            res.json({ success: true, data: pendentes });
        } catch (error) {
            console.error('[WORKFLOW] Erro ao listar pendentes:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * POST /aprovar/:id - Aprovar solicitação
     */
    router.post('/aprovar/:id', async (req, res) => {
        const conn = await pool.getConnection();
        
        try {
            await conn.beginTransaction();
            
            const { id } = req.params;
            const { observacao } = req.body;
            const userId = req.user.id;
            
            // Buscar solicitação
            const [[solicitacao]] = await conn.query(`
                SELECT * FROM solicitacoes_aprovacao WHERE id = ? AND status = 'pendente'
            `, [id]);
            
            if (!solicitacao) {
                await conn.rollback();
                return res.status(404).json({ 
                    success: false, 
                    message: 'Solicitação não encontrada ou já processada' 
                });
            }
            
            // Verificar se usuário pode aprovar
            const isAdmin = req.user.is_admin === 1 || req.user.role === 'admin';
            if (!isAdmin && solicitacao.aprovador_id !== userId) {
                await conn.rollback();
                return res.status(403).json({ 
                    success: false, 
                    message: 'Você não tem permissão para aprovar esta solicitação' 
                });
            }
            
            const config = TIPOS_APROVACAO[solicitacao.tipo];
            
            // Atualizar solicitação
            await conn.query(`
                UPDATE solicitacoes_aprovacao 
                SET status = 'aprovado', 
                    aprovador_id = ?,
                    observacao_aprovador = ?,
                    aprovado_em = NOW()
                WHERE id = ?
            `, [userId, observacao || '', id]);
            
            // Atualizar registro original
            await conn.query(`
                UPDATE ${config.tabela} SET ${config.campo_status} = ? WHERE id = ?
            `, [config.status_aprovado, solicitacao.registro_id]);
            
            // Notificar solicitante
            await conn.query(`
                INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, entidade_tipo, entidade_id)
                VALUES (?, ?, ?, 'sucesso', ?, ?, ?)
            `, [
                solicitacao.solicitante_id,
                `${config.nome} aprovado`,
                `Sua solicitação de ${config.nome} foi aprovada por ${req.user.nome}`,
                solicitacao.tipo.split('_')[0],
                solicitacao.tipo,
                solicitacao.registro_id
            ]).catch(() => {});
            
            // Log de auditoria
            await conn.query(`
                INSERT INTO logs_auditoria (usuario_id, usuario_nome, acao, modulo, entidade_tipo, entidade_id, descricao)
                VALUES (?, ?, 'APROVAR', 'workflow', ?, ?, ?)
            `, [userId, req.user.nome, solicitacao.tipo, solicitacao.registro_id, 
                `Aprovação de ${config.nome} no valor de R$ ${solicitacao.valor}`]).catch(() => {});
            
            await conn.commit();
            
            res.json({ 
                success: true, 
                message: `${config.nome} aprovado com sucesso` 
            });
        } catch (error) {
            await conn.rollback();
            console.error('[WORKFLOW] Erro ao aprovar:', error);
            res.status(500).json({ success: false, message: error.message });
        } finally {
            conn.release();
        }
    });

    /**
     * POST /rejeitar/:id - Rejeitar solicitação
     */
    router.post('/rejeitar/:id', async (req, res) => {
        const conn = await pool.getConnection();
        
        try {
            await conn.beginTransaction();
            
            const { id } = req.params;
            const { motivo } = req.body;
            const userId = req.user.id;
            
            if (!motivo) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Motivo da rejeição é obrigatório' 
                });
            }
            
            // Buscar solicitação
            const [[solicitacao]] = await conn.query(`
                SELECT * FROM solicitacoes_aprovacao WHERE id = ? AND status = 'pendente'
            `, [id]);
            
            if (!solicitacao) {
                await conn.rollback();
                return res.status(404).json({ 
                    success: false, 
                    message: 'Solicitação não encontrada ou já processada' 
                });
            }
            
            const config = TIPOS_APROVACAO[solicitacao.tipo];
            
            // Atualizar solicitação
            await conn.query(`
                UPDATE solicitacoes_aprovacao 
                SET status = 'rejeitado', 
                    aprovador_id = ?,
                    observacao_aprovador = ?,
                    aprovado_em = NOW()
                WHERE id = ?
            `, [userId, motivo, id]);
            
            // Atualizar registro original
            await conn.query(`
                UPDATE ${config.tabela} SET ${config.campo_status} = ? WHERE id = ?
            `, [config.status_rejeitado, solicitacao.registro_id]);
            
            // Notificar solicitante
            await conn.query(`
                INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, prioridade, entidade_tipo, entidade_id)
                VALUES (?, ?, ?, 'erro', ?, 'alta', ?, ?)
            `, [
                solicitacao.solicitante_id,
                `${config.nome} rejeitado`,
                `Sua solicitação foi rejeitada por ${req.user.nome}. Motivo: ${motivo}`,
                solicitacao.tipo.split('_')[0],
                solicitacao.tipo,
                solicitacao.registro_id
            ]).catch(() => {});
            
            await conn.commit();
            
            res.json({ 
                success: true, 
                message: `${config.nome} rejeitado` 
            });
        } catch (error) {
            await conn.rollback();
            console.error('[WORKFLOW] Erro ao rejeitar:', error);
            res.status(500).json({ success: false, message: error.message });
        } finally {
            conn.release();
        }
    });

    /**
     * GET /historico - Histórico de aprovações
     */
    router.get('/historico', async (req, res) => {
        try {
            const { tipo, status, data_inicio, data_fim, page = 1, limit = 20 } = req.query;
            
            let where = '1=1';
            const params = [];
            
            if (tipo) {
                where += ' AND sa.tipo = ?';
                params.push(tipo);
            }
            
            if (status) {
                where += ' AND sa.status = ?';
                params.push(status);
            }
            
            if (data_inicio) {
                where += ' AND sa.criado_em >= ?';
                params.push(data_inicio);
            }
            
            if (data_fim) {
                where += ' AND sa.criado_em <= ?';
                params.push(data_fim);
            }
            
            const offset = (page - 1) * limit;
            
            const [historico] = await pool.query(`
                SELECT 
                    sa.*,
                    us.nome as solicitante_nome,
                    ua.nome as aprovador_nome
                FROM solicitacoes_aprovacao sa
                LEFT JOIN usuarios us ON sa.solicitante_id = us.id
                LEFT JOIN usuarios ua ON sa.aprovador_id = ua.id
                WHERE ${where}
                ORDER BY sa.criado_em DESC
                LIMIT ? OFFSET ?
            `, [...params, parseInt(limit), offset]);
            
            const [[{ total }]] = await pool.query(`
                SELECT COUNT(*) as total FROM solicitacoes_aprovacao sa WHERE ${where}
            `, params);
            
            res.json({ 
                success: true, 
                data: historico,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('[WORKFLOW] Erro ao buscar histórico:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * GET /tipos - Listar tipos de aprovação disponíveis
     */
    router.get('/tipos', (req, res) => {
        const tipos = Object.entries(TIPOS_APROVACAO).map(([key, value]) => ({
            codigo: key,
            nome: value.nome
        }));
        
        res.json({ success: true, data: tipos });
    });

    return router;
};
