const express = require('express');
const router = express.Router();
const path = require('path');

// Serviços
const CalculoTributosService = require('../services/calculo-tributos.service');
const XmlNFeService = require('../services/xml-nfe.service');
const certificaçãoService = require('../services/certificação.service');
const sefazService = require('../services/sefaz.service');
const danfeService = require('../services/danfe.service');
const FinanceiroIntegracaoService = require('../services/financeiro-integracao.service');
const VendasEstoqueIntegracaoService = require('../services/vendas-estoque-integracao.service');

/**
 * MÓDULO DE FATURAMENTO NF-e COMPLETO
 * Sistema completo de faturamento com integração NFe, SEFAZ, Financeiro, Vendas e PCP
 */

module.exports = (pool, authenticateToken) => {
    
    // Inicializar serviços de integração
    const financeiroService = new FinanceiroIntegracaoService(pool);
    const vendasEstoqueService = new VendasEstoqueIntegracaoService(pool);

    // ============================================================
    // GERAR NF-e A PARTIR DE PEDIDO (COMPLETO)
    // ============================================================
    
    router.post('/gerar-nfe', authenticateToken, async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const {
                pedido_id,
                gerar_danfe = true,
                enviar_email = false,
                numeroParcelas = 1,
                diaVencimento = 30,
                intervalo = 30,
                autoIntegrarFinanceiro = true,
                autoReservarEstoque = true,
                autoValidarEstoque = true
            } = req.body;
            const usuario_id = req.user.id;

            // Opcional: validar estoque antes de seguir
            if (autoValidarEstoque) {
                const estoqueOk = await vendasEstoqueService.validarEstoqueParaFaturamento(pedido_id);
                if (!estoqueOk.valido) {
                    await connection.rollback();
                    return res.status(400).json({ success: false, message: 'Estoque insuficiente para faturar', ...estoqueOk });
                }
            }

            // 1. Buscar daçãos do pedido
            const [pedidos] = await connection.query(`
                SELECT 
                    p.*,
                    c.nome as cliente_nome,
                    c.cnpj as cliente_cnpj,
                    c.cpf as cliente_cpf,
                    c.endereco as cliente_endereco,
                    c.cidade as cliente_cidade,
                    c.estação as cliente_estação,
                    c.cep as cliente_cep,
                    c.email as cliente_email
                FROM pedidos p
                INNER JOIN clientes c ON p.cliente_id = c.id
                WHERE p.id =  AND p.status = 'aprovação'
            `, [pedido_id]);

            if (pedidos.length === 0) {
                throw new Error('Pedido não encontrado ou não está aprovação');
            }

            const pedido = pedidos[0];

            // 2. Verificar se já existe NF-e para este pedido
            const [nfeExistente] = await connection.query(`
                SELECT id, numero_nfe, status FROM nfe WHERE pedido_id = 
            `, [pedido_id]);

            if (nfeExistente.length > 0) {
                throw new Error(`NF-e já existe para este pedido (Número: ${nfeExistente[0].numero_nfe}, Status: ${nfeExistente[0].status})`);
            }

            // 3. Buscar itens do pedido
            const [itens] = await connection.query(`
                SELECT 
                    pi.*,
                    pr.codigo,
                    pr.descricao,
                    pr.ncm,
                    pr.unidade_medida
                FROM pedido_itens pi
                INNER JOIN produtos pr ON pi.produto_id = pr.id
                WHERE pi.pedido_id = 
            `, [pedido_id]);

            if (itens.length === 0) {
                throw new Error('Pedido sem itens');
            }

            // 4. Gerar número da NF-e (buscar próximo número da série)
            const [ultimaNFe] = await connection.query(`
                SELECT MAX(numero_nfe) as ultimo_numero 
                FROM nfe 
                WHERE serie = 1
            `);

            const proximoNumero = (ultimaNFe[0].ultimo_numero || 0) + 1;

            // 5. Calcular totais
            const valorProdutos = itens.reduce((sum, item) => 
                sum + (parseFloat(item.quantidade) * parseFloat(item.preco_unitario)), 0
            );
            
            const frete = parseFloat(pedido.frete) || 0;
            const desconto = parseFloat(pedido.desconto) || 0;
            const valorTotal = valorProdutos + frete - desconto;

            // Calcular impostos (simplificação - ajustar conforme regime tributário)
            const baseICMS = valorProdutos;
            const valorICMS = baseICMS * 0.18; // 18% ICMS (exemplo)
            const valorIPI = valorProdutos * 0.05; // 5% IPI (exemplo)
            const valorPIS = valorProdutos * 0.0165; // 1,65% PIS
            const valorCOFINS = valorProdutos * 0.076; // 7,6% COFINS

            // 6. Criar registro da NF-e
            const [nfe] = await connection.query(`
                INSERT INTO nfe (
                    pedido_id,
                    numero_nfe,
                    serie,
                    modelo,
                    tipo_emissao,
                    finalidade,
                    natureza_operacao,
                    cliente_id,
                    cliente_nome,
                    cliente_cnpj_cpf,
                    cliente_endereco,
                    cliente_cidade,
                    cliente_estação,
                    cliente_cep,
                    valor_produtos,
                    valor_frete,
                    valor_desconto,
                    base_calculo_icms,
                    valor_icms,
                    valor_ipi,
                    valor_pis,
                    valor_cofins,
                    valor_total,
                    status,
                    data_emissao,
                    usuario_id,
                    created_at
                ) VALUES (
                    , , 1, '55', 1, 1, 'Venda de Produtos',
                    , , , , , , ,
                    , , , , , , , , ,
                    'pendente', NOW(), , NOW()
                )
            `, [
                pedido_id,
                proximoNumero,
                pedido.cliente_id,
                pedido.cliente_nome,
                pedido.cliente_cnpj || pedido.cliente_cpf,
                pedido.cliente_endereco,
                pedido.cliente_cidade,
                pedido.cliente_estação,
                pedido.cliente_cep,
                valorProdutos,
                frete,
                desconto,
                baseICMS,
                valorICMS,
                valorIPI,
                valorPIS,
                valorCOFINS,
                valorTotal,
                usuario_id
            ]);

            const nfe_id = nfe.insertId;

            // 7. Inserir itens da NF-e
            for (const item of itens) {
                await connection.query(`
                    INSERT INTO nfe_itens (
                        nfe_id,
                        produto_id,
                        codigo_produto,
                        descricao,
                        ncm,
                        unidade,
                        quantidade,
                        valor_unitario,
                        valor_total,
                        valor_desconto
                    ) VALUES (, , , , , , , , , )
                `, [
                    nfe_id,
                    item.produto_id,
                    item.codigo,
                    item.descricao,
                    item.ncm || '00000000',
                    item.unidade_medida || 'UN',
                    item.quantidade,
                    item.preco_unitario,
                    item.quantidade * item.preco_unitario,
                    0
                ]);
            }

            // 8. Atualizar pedido com NF-e gerada
            await connection.query(`
                UPDATE pedidos 
                SET nfe_id = , faturação_em = NOW()
                WHERE id = 
            `, [nfe_id, pedido_id]);

            await connection.commit();

            // Integrações pós-emissão
            const integracoes = { financeiro: null, estoque: null, avisos: [] };

            if (autoReservarEstoque && pedido_id) {
                try {
                    integracoes.estoque = await vendasEstoqueService.reservarEstoque(pedido_id, usuario_id);
                } catch (err) {
                    integracoes.avisos.push(`Reserva de estoque não concluída: ${err.message}`);
                }
            }

            if (autoIntegrarFinanceiro) {
                try {
                    integracoes.financeiro = await financeiroService.gerarContasReceber(nfe_id, {
                        numeroParcelas,
                        diaVencimento,
                        intervalo
                    });
                } catch (err) {
                    integracoes.avisos.push(`Integração financeira não concluída: ${err.message}`);
                }
            }

            res.json({
                success: true,
                message: integracoes.avisos.length === 0  'NF-e gerada com sucesso' : 'NF-e gerada com avisos de integração',
                data: {
                    nfe_id,
                    numero_nfe: proximoNumero,
                    serie: 1,
                    valor_total: valorTotal,
                    status: 'pendente',
                    proximos_passos: [
                        'Assinar XML com certificação digital',
                        'Enviar para SEFAZ',
                        'Gerar DANFE em PDF'
                    ],
                    integracoes
                }
            });

        } catch (error) {
            await connection.rollback();
            console.error('[FATURAMENTO] Erro ao gerar NF-e:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        } finally {
            connection.release();
        }
    });

    // ============================================================
    // LISTAR NF-es
    // ============================================================
    
    router.get('/nfes', authenticateToken, async (req, res) => {
        try {
            const { status, data_inicio, data_fim, cliente_id } = req.query;
            
            let query = `
                SELECT 
                    n.*,
                    c.nome as cliente_nome,
                    p.id as pedido_numero,
                    COUNT(ni.id) as total_itens
                FROM nfe n
                LEFT JOIN clientes c ON n.cliente_id = c.id
                LEFT JOIN pedidos p ON n.pedido_id = p.id
                LEFT JOIN nfe_itens ni ON n.id = ni.nfe_id
                WHERE 1=1
            `;
            
            const params = [];
            
            if (status) {
                query += ' AND n.status = ';
                params.push(status);
            }
            
            if (data_inicio) {
                query += ' AND DATE(n.data_emissao) >= ';
                params.push(data_inicio);
            }
            
            if (data_fim) {
                query += ' AND DATE(n.data_emissao) <= ';
                params.push(data_fim);
            }
            
            if (cliente_id) {
                query += ' AND n.cliente_id = ';
                params.push(cliente_id);
            }
            
            query += ' GROUP BY n.id ORDER BY n.data_emissao DESC LIMIT 100';
            
            const [nfes] = await pool.query(query, params);
            
            res.json({
                success: true,
                data: nfes
            });
            
        } catch (error) {
            console.error('[FATURAMENTO] Erro ao listar NF-es:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    });

    // ============================================================
    // DETALHES DA NF-e
    // ============================================================
    
    router.get('/nfes/:id', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            
            const [nfes] = await pool.query(`
                SELECT 
                    n.*,
                    c.nome as cliente_nome,
                    c.email as cliente_email,
                    p.id as pedido_id,
                    p.numero_pedido
                FROM nfe n
                LEFT JOIN clientes c ON n.cliente_id = c.id
                LEFT JOIN pedidos p ON n.pedido_id = p.id
                WHERE n.id = 
            `, [id]);
            
            if (nfes.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'NF-e não encontrada'
                });
            }
            
            const [itens] = await pool.query(`
                SELECT * FROM nfe_itens WHERE nfe_id = 
            `, [id]);
            
            res.json({
                success: true,
                data: {
                    ...nfes[0],
                    itens
                }
            });
            
        } catch (error) {
            console.error('[FATURAMENTO] Erro ao buscar NF-e:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    });

    // ============================================================
    // CANCELAR NF-e
    // ============================================================
    
    router.post('/nfes/:id/cancelar', authenticateToken, async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const { id } = req.params;
            const { motivo } = req.body;
            const usuario_id = req.user.id;

            if (!motivo || motivo.length < 15) {
                throw new Error('Motivo do cancelamento deve ter no mínimo 15 caracteres');
            }

            // Buscar NF-e
            const [nfes] = await connection.query(`
                SELECT * FROM nfe WHERE id = 
            `, [id]);

            if (nfes.length === 0) {
                throw new Error('NF-e não encontrada');
            }

            const nfe = nfes[0];

            if (nfe.status === 'cancelada') {
                throw new Error('NF-e já está cancelada');
            }

            // Atualizar status
            await connection.query(`
                UPDATE nfe 
                SET status = 'cancelada',
                    data_cancelamento = NOW(),
                    motivo_cancelamento = ,
                    cancelação_por = 
                WHERE id = 
            `, [motivo, usuario_id, id]);

            // Reverter faturamento do pedido
            if (nfe.pedido_id) {
                await connection.query(`
                    UPDATE pedidos 
                    SET nfe_id = NULL, faturação_em = NULL
                    WHERE id = 
                `, [nfe.pedido_id]);
            }

            await connection.commit();

            // Integrações pós-cancelamento
            const integracoes = { financeiro: null, estoque: null, avisos: [] };

            try {
                integracoes.financeiro = await financeiroService.estornarNFeCancelada(id);
            } catch (err) {
                integracoes.avisos.push(`Financeiro não estornação: ${err.message}`);
            }

            try {
                integracoes.estoque = await vendasEstoqueService.estornarEstoque(id, usuario_id);
            } catch (err) {
                integracoes.avisos.push(`Estoque não estornação: ${err.message}`);
            }

            res.json({
                success: true,
                message: integracoes.avisos.length === 0  'NF-e cancelada com sucesso' : 'NF-e cancelada com avisos',
                data: { nfe_id: id, status: 'cancelada', integracoes }
            });

        } catch (error) {
            await connection.rollback();
            console.error('[FATURAMENTO] Erro ao cancelar NF-e:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        } finally {
            connection.release();
        }
    });

    // ============================================================
    // ESTATÍSTICAS
    // ============================================================
    
    router.get('/estatisticas', authenticateToken, async (req, res) => {
        try {
            const [stats] = await pool.query(`
                SELECT 
                    COUNT(*) as total_nfes,
                    SUM(CASE WHEN status = 'autorizada' THEN 1 ELSE 0 END) as autorizadas,
                    SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
                    SUM(CASE WHEN status = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
                    SUM(CASE WHEN status = 'autorizada' THEN valor_total ELSE 0 END) as valor_total_faturação,
                    SUM(CASE WHEN status = 'autorizada' AND MONTH(data_emissao) = MONTH(NOW()) THEN valor_total ELSE 0 END) as valor_mes_atual
                FROM nfe
            `);
            
            res.json({
                success: true,
                data: stats[0]
            });
            
        } catch (error) {
            console.error('[FATURAMENTO] Erro ao buscar estatísticas:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    });

    // ============================================================
    // ENVIAR NF-e PARA SEFAZ
    // ============================================================
    
    router.post('/nfes/:id/enviar-sefaz', authenticateToken, async (req, res) => {
        const connection = await pool.getConnection();
        try {
            const { id } = req.params;
            
            // Buscar NFe
            const [nfes] = await connection.query(`SELECT * FROM nfe WHERE id = `, [id]);
            
            if (nfes.length === 0) {
                return res.status(404).json({ success: false, message: 'NFe não encontrada' });
            }
            
            const nfe = nfes[0];
            
            if (nfe.status !== 'pendente') {
                return res.status(400).json({ 
                    success: false, 
                    message: `NFe não pode ser enviada. Status atual: ${nfe.status}` 
                });
            }
            
            // Enviar para SEFAZ
            const resultação = await sefazService.autorizarNFe(nfe.xml_nfe, nfe.emitente_uf);
            
            if (resultação.autorização) {
                await connection.query(`
                    UPDATE nfe 
                    SET status = 'autorizada',
                        numero_protocolo = ,
                        data_autorizacao = NOW(),
                        xml_protocolo = 
                    WHERE id = 
                `, [resultação.numeroProtocolo, resultação.xmlCompleto, id]);
                
                res.json({
                    success: true,
                    message: 'NFe autorizada pela SEFAZ',
                    protocolo: resultação.numeroProtocolo
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'NFe rejeitada pela SEFAZ',
                    codigo: resultação.codigoStatus,
                    motivo: resultação.motivo
                });
            }
            
        } catch (error) {
            console.error('[FATURAMENTO] Erro ao enviar NFe:', error);
            res.status(500).json({ success: false, message: error.message });
        } finally {
            connection.release();
        }
    });

    // ============================================================
    // GERAR E BAIXAR DANFE
    // ============================================================
    
    router.get('/nfes/:id/danfe', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            
            const [nfes] = await pool.query(`SELECT * FROM nfe WHERE id = `, [id]);
            
            if (nfes.length === 0) {
                return res.status(404).json({ success: false, message: 'NFe não encontrada' });
            }
            
            const nfe = nfes[0];
            const caminhoDANFE = path.join(__dirname, '../storage/nfe/danfes', `danfe_${nfe.numero_nfe}.pdf`);
            
            // Gerar DANFE
            await danfeService.gerarDANFE(nfe, caminhoDANFE);
            
            // Enviar arquivo
            res.download(caminhoDANFE, `DANFE_${nfe.numero_nfe}.pdf`);
            
        } catch (error) {
            console.error('[FATURAMENTO] Erro ao gerar DANFE:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ============================================================
    // CARTA DE CORREÇÃO
    // ============================================================
    
    router.post('/nfes/:id/carta-correcao', authenticateToken, async (req, res) => {
        const connection = await pool.getConnection();
        try {
            const { id } = req.params;
            const { correcao } = req.body;
            
            if (!correcao || correcao.length < 15) {
                return res.status(400).json({
                    success: false,
                    message: 'Correção deve ter no mínimo 15 caracteres'
                });
            }
            
            const [nfes] = await connection.query(`SELECT * FROM nfe WHERE id = `, [id]);
            
            if (nfes.length === 0) {
                return res.status(404).json({ success: false, message: 'NFe não encontrada' });
            }
            
            const nfe = nfes[0];
            
            if (nfe.status !== 'autorizada') {
                return res.status(400).json({
                    success: false,
                    message: 'Apenas NFe autorizadas podem ter carta de correção'
                });
            }
            
            // Contar sequência de CC-e
            const [cces] = await connection.query(`
                SELECT COUNT(*) as total FROM nfe_eventos 
                WHERE nfe_id =  AND tipo_evento = '110110'
            `, [id]);
            
            const sequencia = cces[0].total + 1;
            
            // Enviar CC-e
            const resultação = await sefazService.cartaCorrecao(
                nfe.chave_acesso,
                correcao,
                nfe.emitente_uf,
                nfe.emitente_cnpj,
                sequencia
            );
            
            if (resultação.sucesso) {
                await connection.query(`
                    INSERT INTO nfe_eventos (
                        nfe_id, tipo_evento, sequencia, descricao,
                        protocolo, xml_evento, created_at
                    ) VALUES (, '110110', , , , , NOW())
                `, [id, sequencia, correcao, resultação.numeroProtocolo, resultação.xmlCompleto]);
                
                res.json({
                    success: true,
                    message: 'Carta de correção registrada',
                    protocolo: resultação.numeroProtocolo
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'CC-e rejeitada',
                    codigo: resultação.codigoStatus
                });
            }
            
        } catch (error) {
            console.error('[FATURAMENTO] Erro na carta de correção:', error);
            res.status(500).json({ success: false, message: error.message });
        } finally {
            connection.release();
        }
    });

    // ============================================================
    // INUTILIZAR NUMERAÇÃO
    // ============================================================
    
    router.post('/inutilizar-numeracao', authenticateToken, async (req, res) => {
        try {
            const { serie, numeroInicial, numeroFinal, justificativa } = req.body;
            
            const resultação = await sefazService.inutilizarNumeracao({
                ano: new Date().getFullYear().toString().substring(2),
                cnpj: req.user.empresa_cnpj,
                modelo: '55',
                serie,
                numeroInicial,
                numeroFinal,
                justificativa
            }, req.user.empresa_uf);
            
            if (resultação.sucesso) {
                // Registrar inutilização
                await pool.query(`
                    INSERT INTO nfe_inutilizacoes (
                        serie, numero_inicial, numero_final, 
                        justificativa, xml_inutilizacao, created_at
                    ) VALUES (, , , , , NOW())
                `, [serie, numeroInicial, numeroFinal, justificativa, resultação.xmlCompleto]);
                
                res.json({
                    success: true,
                    message: 'Numeração inutilizada'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Inutilização rejeitada'
                });
            }
            
        } catch (error) {
            console.error('[FATURAMENTO] Erro ao inutilizar:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ============================================================
    // CONSULTAR STATUS SEFAZ
    // ============================================================
    
    router.get('/sefaz/status', authenticateToken, async (req, res) => {
        try {
            const resultação = await sefazService.consultarStatusServico(req.user.empresa_uf);
            
            res.json({
                success: true,
                online: resultação.online,
                mensagem: resultação.motivo
            });
            
        } catch (error) {
            console.error('[FATURAMENTO] Erro ao consultar status:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ============================================================
    // INTEGRAÇÃO FINANCEIRO - GERAR CONTAS A RECEBER
    // ============================================================
    
    router.post('/nfes/:id/gerar-financeiro', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            const { numeroParcelas, diaVencimento, intervalo } = req.body;
            
            const resultação = await financeiroService.gerarContasReceber(id, {
                numeroParcelas: numeroParcelas || 1,
                diaVencimento: diaVencimento || 30,
                intervalo: intervalo || 30
            });
            
            res.json({
                success: true,
                message: 'Contas a receber geradas',
                ...resultação
            });
            
        } catch (error) {
            console.error('[FATURAMENTO] Erro ao gerar financeiro:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ============================================================
    // RELATÓRIO DE FATURAMENTO
    // ============================================================
    
    router.get('/relatorios/faturamento', authenticateToken, async (req, res) => {
        try {
            const { data_inicio, data_fim } = req.query;
            
            const [faturamento] = await pool.query(`
                SELECT 
                    DATE(n.data_emissao) as data,
                    COUNT(*) as total_nfes,
                    SUM(n.valor_total) as valor_total,
                    SUM(n.valor_produtos) as valor_produtos,
                    SUM(n.valor_icms) as total_icms,
                    SUM(n.valor_ipi) as total_ipi,
                    SUM(n.valor_pis) as total_pis,
                    SUM(n.valor_cofins) as total_cofins
                FROM nfe n
                WHERE n.status = 'autorizada'
                AND n.data_emissao >= 
                AND n.data_emissao <= 
                GROUP BY DATE(n.data_emissao)
                ORDER BY data DESC
            `, [data_inicio, data_fim]);
            
            res.json({
                success: true,
                data: faturamento
            });
            
        } catch (error) {
            console.error('[FATURAMENTO] Erro no relatório:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ============================================================
    // VALIDAR ESTOQUE ANTES DE FATURAR
    // ============================================================
    
    router.get('/pedidos/:id/validar-estoque', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            
            const resultação = await vendasEstoqueService.validarEstoqueParaFaturamento(id);
            
            res.json({
                success: true,
                ...resultação
            });
            
        } catch (error) {
            console.error('[FATURAMENTO] Erro ao validar estoque:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ============================================================
    // PRODUTOS MAIS FATURADOS
    // ============================================================
    
    router.get('/relatorios/produtos-mais-faturaçãos', authenticateToken, async (req, res) => {
        try {
            const { data_inicio, data_fim, limite } = req.query;
            
            const produtos = await vendasEstoqueService.relatorioProdutosMaisFaturaçãos({
                data_inicio,
                data_fim,
                limite
            });
            
            res.json({
                success: true,
                data: produtos
            });
            
        } catch (error) {
            console.error('[FATURAMENTO] Erro no relatório:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ============================================================
    // CONFIGURAR CERTIFICADO DIGITAL
    // ============================================================
    
    router.post('/configuracao/certificação', authenticateToken, async (req, res) => {
        try {
            const { caminhoArquivo, senha } = req.body;
            
            const resultação = await certificaçãoService.carregarCertificaçãoA1(caminhoArquivo, senha);
            
            res.json({
                success: true,
                message: 'Certificação carregação com sucesso',
                ...resultação
            });
            
        } catch (error) {
            console.error('[FATURAMENTO] Erro ao carregar certificação:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ============================================================
    // VERIFICAR VALIDADE DO CERTIFICADO
    // ============================================================
    
    router.get('/configuracao/certificação/validade', authenticateToken, async (req, res) => {
        try {
            const validade = certificaçãoService.verificarValidade();
            const info = certificaçãoService.getInfoCertificação();
            
            res.json({
                success: true,
                ...validade,
                ...info
            });
            
        } catch (error) {
            console.error('[FATURAMENTO] Erro ao verificar certificação:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    return router;
};
