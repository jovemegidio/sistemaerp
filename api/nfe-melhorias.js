/**
 * API de Monitoramento e Melhorias NF-e
 * Dashboard, consultas e reenvio automático
 * @author Aluforce ERP
 * @version 1.0.0
 */

const express = require('express');

module.exports = function({ pool, authenticateToken }) {
    const router = express.Router();
    router.use(authenticateToken);

    // ============================================================
    // DASHBOARD DE NF-e
    // ============================================================

    /**
     * GET /dashboard - Dashboard completo de NF-e
     */
    router.get('/dashboard', async (req, res) => {
        try {
            const { periodo = 'mes' } = req.query;
            
            let filtroData = '';
            switch (periodo) {
                case 'hoje':
                    filtroData = 'AND DATE(n.data_emissao) = CURDATE()';
                    break;
                case 'semana':
                    filtroData = 'AND n.data_emissao >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
                    break;
                case 'mes':
                default:
                    filtroData = 'AND MONTH(n.data_emissao) = MONTH(CURDATE()) AND YEAR(n.data_emissao) = YEAR(CURDATE())';
            }

            // Estatísticas gerais
            const [[stats]] = await pool.query(`
                SELECT 
                    COUNT(*) as total_nfes,
                    SUM(CASE WHEN status = 'autorizada' THEN 1 ELSE 0 END) as autorizadas,
                    SUM(CASE WHEN status = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
                    SUM(CASE WHEN status IN ('pendente', 'processando') THEN 1 ELSE 0 END) as pendentes,
                    SUM(CASE WHEN status = 'rejeitada' THEN 1 ELSE 0 END) as rejeitadas,
                    SUM(CASE WHEN status = 'autorizada' THEN valor_total ELSE 0 END) as valor_autorização,
                    SUM(CASE WHEN status = 'cancelada' THEN valor_total ELSE 0 END) as valor_cancelação
                FROM nfes n
                WHERE 1=1 ${filtroData}
            `);

            // Por tipo de operação
            const [porTipo] = await pool.query(`
                SELECT 
                    tipo_operacao,
                    COUNT(*) as quantidade,
                    SUM(valor_total) as valor_total
                FROM nfes n
                WHERE status = 'autorizada' ${filtroData}
                GROUP BY tipo_operacao
            `);

            // Evolução diária (últimos 30 dias)
            const [evolucao] = await pool.query(`
                SELECT 
                    DATE(data_emissao) as data,
                    COUNT(*) as quantidade,
                    SUM(valor_total) as valor
                FROM nfes
                WHERE data_emissao >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                AND status = 'autorizada'
                GROUP BY DATE(data_emissao)
                ORDER BY data
            `);

            // Últimas rejeições
            const [rejeicoes] = await pool.query(`
                SELECT 
                    n.id,
                    n.numero,
                    n.serie,
                    n.data_emissao,
                    n.valor_total,
                    n.status,
                    n.motivo_rejeicao,
                    n.codigo_retorno,
                    c.razao_social as cliente
                FROM nfes n
                LEFT JOIN clientes c ON n.cliente_id = c.id
                WHERE n.status = 'rejeitada'
                ORDER BY n.data_emissao DESC
                LIMIT 10
            `);

            // CFOP mais utilizaçãos
            const [cfops] = await pool.query(`
                SELECT 
                    ni.cfop,
                    COUNT(*) as quantidade,
                    SUM(ni.valor_total) as valor_total
                FROM nfe_itens ni
                INNER JOIN nfes n ON ni.nfe_id = n.id
                WHERE n.status = 'autorizada' ${filtroData.replace('n.', 'n.')}
                GROUP BY ni.cfop
                ORDER BY quantidade DESC
                LIMIT 10
            `).catch(() => [[]]);

            res.json({
                success: true,
                data: {
                    resumo: {
                        total: stats.total_nfes || 0,
                        autorizadas: stats.autorizadas || 0,
                        canceladas: stats.canceladas || 0,
                        pendentes: stats.pendentes || 0,
                        rejeitadas: stats.rejeitadas || 0,
                        valor_autorização: parseFloat(stats.valor_autorização) || 0,
                        valor_cancelação: parseFloat(stats.valor_cancelação) || 0,
                        taxa_sucesso: stats.total_nfes > 0 
                             ((stats.autorizadas / stats.total_nfes) * 100).toFixed(1) 
                            : 100
                    },
                    por_tipo: porTipo,
                    evolucao_diaria: evolucao,
                    ultimas_rejeicoes: rejeicoes,
                    cfops_utilizaçãos: cfops
                }
            });
        } catch (error) {
            console.error('[NFE] Erro no dashboard:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ============================================================
    // CONSULTA STATUS NA SEFAZ
    // ============================================================

    /**
     * GET /consultar/:id - Consultar status de NF-e na SEFAZ
     */
    router.get('/consultar/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            const [[nfe]] = await pool.query(
                'SELECT * FROM nfes WHERE id = ?',
                [id]
            );

            if (!nfe) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'NF-e não encontrada' 
                });
            }

            if (!nfe.chave_acesso) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'NF-e não possui chave de acesso' 
                });
            }

            // Simular consulta SEFAZ (em produção usar SEFAZService)
            const resultado = {
                chave_acesso: nfe.chave_acesso,
                status_sefaz: nfe.status,
                data_consulta: new Date().toISOString(),
                protocolo: nfe.protocolo_autorizacao,
                ambiente: nfe.ambiente || 'homologacao'
            };

            // Log da consulta
            await pool.query(`
                INSERT INTO logs_nfe (nfe_id, acao, resultado, usuario_id)
                VALUES (?, 'CONSULTA_STATUS', ?, ?)
            `, [id, JSON.stringify(resultado), req.user.id]).catch(() => {});

            res.json({
                success: true,
                data: resultado
            });
        } catch (error) {
            console.error('[NFE] Erro na consulta:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * POST /reenviar/:id - Reenviar NF-e rejeitada
     */
    router.post('/reenviar/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            const [[nfe]] = await pool.query(
                'SELECT * FROM nfes WHERE id = ?',
                [id]
            );

            if (!nfe) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'NF-e não encontrada' 
                });
            }

            if (nfe.status !== 'rejeitada') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Apenas NF-e rejeitadas podem ser reenviadas' 
                });
            }

            // Atualizar status para processando
            await pool.query(
                'UPDATE nfes SET status = , tentativas_envio = tentativas_envio + 1, updated_at = NOW() WHERE id = ?',
                ['processando', id]
            );

            // Em produção: chamar SEFAZService para reenviar
            // const sefazService = new SEFAZService(pool);
            // const resultado = await sefazService.autorizarNFe(nfe.xml_assinação, nfe.uf);

            // Log
            await pool.query(`
                INSERT INTO logs_nfe (nfe_id, acao, resultado, usuario_id)
                VALUES (?, 'REENVIO', 'Solicitação reenvio', )
            `, [id, req.user.id]).catch(() => {});

            res.json({
                success: true,
                message: 'NF-e encaminhada para reenvio',
                data: { nfe_id: id }
            });
        } catch (error) {
            console.error('[NFE] Erro no reenvio:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ============================================================
    // MANIFESTAÇÃO DO DESTINATÁRIO
    // ============================================================

    /**
     * GET /manifestacoes - Listar NF-e para manifestação
     */
    router.get('/manifestacoes', async (req, res) => {
        try {
            const { status = 'pendente', page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;

            const [manifestacoes] = await pool.query(`
                SELECT 
                    m.*,
                    f.razao_social as fornecedor_nome
                FROM nfe_manifestacoes m
                LEFT JOIN fornecedores f ON m.cnpj_emitente = f.cnpj
                WHERE m.status_manifestacao = 
                ORDER BY m.data_emissao DESC
                LIMIT ? OFFSET 
            `, [status, parseInt(limit), offset]);

            const [[{ total }]] = await pool.query(
                'SELECT COUNT(*) as total FROM nfe_manifestacoes WHERE status_manifestacao = ',
                [status]
            );

            res.json({
                success: true,
                data: manifestacoes,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('[NFE] Erro ao listar manifestações:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * POST /manifestar/:id - Realizar manifestação do destinatário
     */
    router.post('/manifestar/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { evento, justificativa } = req.body;

            // Eventos válidos: 210200 (Confirmação), 210210 (Ciência), 
            // 210220 (Desconhecimento), 210240 (Operação não Realizada)
            const eventosValidos = ['210200', '210210', '210220', '210240'];
            
            if (!eventosValidos.includes(evento)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Evento de manifestação inválido' 
                });
            }

            // Operação não realizada requer justificativa
            if (evento === '210240' && (!justificativa || justificativa.length < 15)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Justificativa obrigatória (mínimo 15 caracteres)' 
                });
            }

            // Atualizar manifestação
            await pool.query(`
                UPDATE nfe_manifestacoes 
                SET status_manifestacao = 'processando',
                    evento_manifestacao = ,
                    justificativa = ,
                    data_manifestacao = NOW(),
                    usuario_id = 
                WHERE id = 
            `, [evento, justificativa || null, req.user.id, id]);

            // Em produção: enviar para SEFAZ via EventoService

            res.json({
                success: true,
                message: 'Manifestação registrada',
                data: { id, evento }
            });
        } catch (error) {
            console.error('[NFE] Erro na manifestação:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ============================================================
    // CARTA DE CORREÇÃO
    // ============================================================

    /**
     * POST /carta-correcao/:id - Emitir carta de correção
     */
    router.post('/carta-correcao/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { correcao } = req.body;

            if (!correcao || correcao.length < 15 || correcao.length > 1000) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Correção deve ter entre 15 e 1000 caracteres' 
                });
            }

            const [[nfe]] = await pool.query(
                'SELECT * FROM nfes WHERE id = ?',
                [id]
            );

            if (!nfe) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'NF-e não encontrada' 
                });
            }

            if (nfe.status !== 'autorizada') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Carta de correção só pode ser emitida para NF-e autorizada' 
                });
            }

            // Contar sequência de CCe
            const [[{ seq }]] = await pool.query(
                'SELECT COUNT(*) + 1 as seq FROM nfe_eventos WHERE nfe_id =  AND tipo_evento = "CCe"',
                [id]
            );

            // Registrar evento
            await pool.query(`
                INSERT INTO nfe_eventos (nfe_id, tipo_evento, sequencia, descricao, status, usuario_id)
                VALUES (?, 'CCe', ?, ?, 'pendente', )
            `, [id, seq, correcao, req.user.id]);

            // Em produção: enviar CCe para SEFAZ via EventoService

            res.json({
                success: true,
                message: `Carta de Correção ${seq} registrada`,
                data: { nfe_id: id, sequencia: seq }
            });
        } catch (error) {
            console.error('[NFE] Erro na CCe:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ============================================================
    // INUTILIZAÇÃO DE NUMERAÇÃO
    // ============================================================

    /**
     * POST /inutilizar - Inutilizar faixa de numeração
     */
    router.post('/inutilizar', async (req, res) => {
        try {
            const { serie, numero_inicial, numero_final, justificativa } = req.body;

            if (!serie || !numero_inicial || !numero_final) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Série e números são obrigatórios' 
                });
            }

            if (numero_inicial > numero_final) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Número inicial deve ser menor ou igual ao final' 
                });
            }

            if (!justificativa || justificativa.length < 15) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Justificativa obrigatória (mínimo 15 caracteres)' 
                });
            }

            // Verificar se números já foram utilizaçãos
            const [usaçãos] = await pool.query(`
                SELECT numero FROM nfes 
                WHERE serie =  AND numero BETWEEN ? AND 
            `, [serie, numero_inicial, numero_final]);

            if (usaçãos.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Números já utilizaçãos: ${usaçãos.map(u => u.numero).join(', ')}` 
                });
            }

            // Registrar solicitação de inutilização
            const [result] = await pool.query(`
                INSERT INTO nfe_inutilizacoes (serie, numero_inicial, numero_final, justificativa, status, usuario_id)
                VALUES (?, ?, ?, ?, 'pendente', )
            `, [serie, numero_inicial, numero_final, justificativa, req.user.id]);

            // Em produção: enviar para SEFAZ via InutilizacaoService

            res.json({
                success: true,
                message: 'Solicitação de inutilização registrada',
                data: { 
                    id: result.insertId,
                    serie,
                    faixa: `${numero_inicial} a ${numero_final}`
                }
            });
        } catch (error) {
            console.error('[NFE] Erro na inutilização:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ============================================================
    // RELATÓRIOS DE NF-e
    // ============================================================

    /**
     * GET /relatorio - Relatório de NF-e
     */
    router.get('/relatorio', async (req, res) => {
        try {
            const { 
                inicio, 
                fim, 
                status,
                tipo_operacao,
                cliente_id
            } = req.query;

            let where = 'WHERE 1=1';
            const params = [];

            if (inicio) {
                where += ' AND DATE(n.data_emissao) >= ';
                params.push(inicio);
            }
            if (fim) {
                where += ' AND DATE(n.data_emissao) <= ';
                params.push(fim);
            }
            if (status) {
                where += ' AND n.status = ';
                params.push(status);
            }
            if (tipo_operacao) {
                where += ' AND n.tipo_operacao = ';
                params.push(tipo_operacao);
            }
            if (cliente_id) {
                where += ' AND n.cliente_id = ';
                params.push(cliente_id);
            }

            const [nfes] = await pool.query(`
                SELECT 
                    n.id,
                    n.numero,
                    n.serie,
                    n.chave_acesso,
                    n.data_emissao,
                    n.tipo_operacao,
                    n.natureza_operacao,
                    n.valor_produtos,
                    n.valor_frete,
                    n.valor_icms,
                    n.valor_total,
                    n.status,
                    n.protocolo_autorizacao,
                    c.razao_social as cliente_nome,
                    c.cnpj as cliente_cnpj
                FROM nfes n
                LEFT JOIN clientes c ON n.cliente_id = c.id
                ${where}
                ORDER BY n.data_emissao DESC, n.numero DESC
                LIMIT 500
            `, params);

            // Totalizaçãores
            const [[totais]] = await pool.query(`
                SELECT 
                    COUNT(*) as quantidade,
                    SUM(valor_total) as valor_total,
                    SUM(valor_icms) as icms_total
                FROM nfes n
                ${where}
            `, params);

            res.json({
                success: true,
                data: {
                    nfes,
                    totais: {
                        quantidade: totais.quantidade || 0,
                        valor_total: parseFloat(totais.valor_total) || 0,
                        icms_total: parseFloat(totais.icms_total) || 0
                    }
                }
            });
        } catch (error) {
            console.error('[NFE] Erro no relatório:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * GET /xml/:id - Download do XML
     */
    router.get('/xml/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { tipo = 'autorização' } = req.query;

            const [[nfe]] = await pool.query(
                'SELECT numero, serie, xml_assinação, xml_autorização FROM nfes WHERE id = ?',
                [id]
            );

            if (!nfe) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'NF-e não encontrada' 
                });
            }

            const xml = tipo === 'autorização'  nfe.xml_autorização : nfe.xml_assinação;

            if (!xml) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'XML não disponível' 
                });
            }

            res.setHeader('Content-Type', 'application/xml');
            res.setHeader('Content-Disposition', `attachment; filename="NFe_${nfe.numero}_${nfe.serie}.xml"`);
            res.send(xml);
        } catch (error) {
            console.error('[NFE] Erro ao baixar XML:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ============================================================
    // CONFIGURAÇÕES DE NF-e
    // ============================================================

    /**
     * GET /configuracoes - Obter configurações de NF-e
     */
    router.get('/configuracoes', async (req, res) => {
        try {
            const [configs] = await pool.query(
                'SELECT * FROM configuracoes_nfe ORDER BY id DESC LIMIT 1'
            );

            res.json({
                success: true,
                data: configs[0] || {
                    ambiente: 2, // Homologado
                    serie_nfe: 1,
                    serie_nfce: 1,
                    ultimo_numero_nfe: 0,
                    ultimo_numero_nfce: 0
                }
            });
        } catch (error) {
            console.error('[NFE] Erro ao obter config:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * PUT /configuracoes - Salvar configurações de NF-e
     */
    router.put('/configuracoes', async (req, res) => {
        try {
            const { 
                ambiente,
                serie_nfe,
                serie_nfce,
                csc_id,
                csc_token,
                email_contaçãor
            } = req.body;

            // Verificar se já existe configuração
            const [[existente]] = await pool.query(
                'SELECT id FROM configuracoes_nfe LIMIT 1'
            );

            if (existente) {
                await pool.query(`
                    UPDATE configuracoes_nfe SET 
                        ambiente = ,
                        serie_nfe = ,
                        serie_nfce = ,
                        csc_id = ,
                        csc_token = ,
                        email_contaçãor = ,
                        updated_at = NOW()
                    WHERE id = 
                `, [ambiente, serie_nfe, serie_nfce, csc_id, csc_token, email_contaçãor, existente.id]);
            } else {
                await pool.query(`
                    INSERT INTO configuracoes_nfe (ambiente, serie_nfe, serie_nfce, csc_id, csc_token, email_contaçãor)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [ambiente, serie_nfe, serie_nfce, csc_id, csc_token, email_contaçãor]);
            }

            res.json({
                success: true,
                message: 'Configurações salvas'
            });
        } catch (error) {
            console.error('[NFE] Erro ao salvar config:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    return router;
};
