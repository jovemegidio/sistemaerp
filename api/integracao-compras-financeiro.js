/**
 * API DE INTEGRAÇÃO: COMPRAS → FINANCEIRO
 * Gera contas a pagar automaticamente a partir de pedidos de compra
 * 
 * @author Aluforce ERP
 * @version 1.0.0
 * @date 2025-12-19
 */

const express = require('express');
const router = express.Router();

/**
 * POST /api/integracao/compras-financeiro/gerar-pagar
 * Gera contas a pagar a partir de um pedido de compra recebido
 */
router.post('/gerar-pagar', async (req, res) => {
    const { pedido_id, nota_fiscal, parcelas, condicao_pagamento, observacoes } = req.body;
    
    if (!pedido_id) {
        return res.status(400).json({ 
            success: false, 
            message: 'ID do pedido de compra é obrigatório' 
        });
    }
    
    try {
        const pool = req.app.locals.pool;
        
        // 1. Buscar dados do pedido de compra
        const [pedidos] = await pool.execute(`
            SELECT 
                pc.*,
                f.nome as fornecedor_nome,
                f.cnpj as fornecedor_cnpj,
                f.email as fornecedor_email
            FROM pedidos_compra pc
            LEFT JOIN fornecedores f ON pc.fornecedor_id = f.id
            WHERE pc.id = 
        `, [pedido_id]);
        
        if (pedidos.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Pedido de compra não encontrado' 
            });
        }
        
        const pedido = pedidos[0];
        
        // 2. Verificar se já existe contas geradas para este pedido
        const [existentes] = await pool.execute(`
            SELECT COUNT(*) as total FROM contas_pagar 
            WHERE pedido_origem_id =  AND tipo_origem = 'COMPRA'
        `, [pedido_id]);
        
        if (existentes[0].total > 0) {
            return res.status(409).json({ 
                success: false, 
                message: 'Já existem contas a pagar geradas para este pedido',
                contas_existentes: existentes[0].total
            });
        }
        
        // 3. Calcular parcelas
        const numParcelas = parcelas || 1;
        const valorTotal = parseFloat(pedido.valor_total) || 0;
        const valorParcela = valorTotal / numParcelas;
        const dataBase = new Date();
        
        // Condições de pagamento padrão (dias para vencimento)
        const condicoes = {
            'a_vista': [0],
            '30_dias': [30],
            '30_60': [30, 60],
            '30_60_90': [30, 60, 90],
            '28_56_84': [28, 56, 84],
            'entrada_30_60': [0, 30, 60],
            '7_dias': [7],
            '14_dias': [14],
            '21_28_35': [21, 28, 35]
        };
        
        let diasVencimento = condicoes[condicao_pagamento] || Array.from(
            { length: numParcelas }, 
            (_, i) => (i + 1) * 30
        );
        
        // 4. Gerar cada parcela como conta a pagar
        const contasGeradas = [];
        
        for (let i = 0; i < numParcelas; i++) {
            const dataVencimento = new Date(dataBase);
            dataVencimento.setDate(dataVencimento.getDate() + (diasVencimento[i] || (i + 1) * 30));
            
            const numeroDocumento = nota_fiscal 
                 `NF-${nota_fiscal}-${String(i + 1).padStart(2, '0')}`
                : `CMP-${pedido_id}-${String(i + 1).padStart(2, '0')}`;
            
            const [result] = await pool.execute(`
                INSERT INTO contas_pagar (
                    descricao,
                    valor,
                    data_vencimento,
                    data_emissao,
                    status,
                    fornecedor_id,
                    fornecedor_nome,
                    numero_documento,
                    nota_fiscal,
                    parcela,
                    total_parcelas,
                    pedido_origem_id,
                    tipo_origem,
                    categoria,
                    observacoes,
                    created_at
                ) VALUES (?, ?, ?, ?, , ?, ?, , ?, ?, , ?, ?, , , NOW())
            `, [
                `Compra #${pedido.numero_pedido || pedido_id} - Parcela ${i + 1}/${numParcelas}`,
                valorParcela.toFixed(2),
                dataVencimento.toISOString().split('T')[0],
                dataBase.toISOString().split('T')[0],
                'pendente',
                pedido.fornecedor_id,
                pedido.fornecedor_nome || 'Fornecedor não identificação',
                numeroDocumento,
                nota_fiscal || null,
                i + 1,
                numParcelas,
                pedido_id,
                'COMPRA',
                'Compras',
                observacoes || `Geração automaticamente do pedido de compra #${pedido_id}`
            ]);
            
            contasGeradas.push({
                id: result.insertId,
                numero_documento: numeroDocumento,
                parcela: i + 1,
                valor: valorParcela,
                vencimento: dataVencimento.toISOString().split('T')[0]
            });
        }
        
        // 5. Registrar log de integração
        await registrarLogIntegracao(pool, {
            tipo: 'COMPRAS_FINANCEIRO',
            origem_modulo: 'Compras',
            destino_modulo: 'Financeiro',
            referencia_id: pedido_id,
            acao: 'GERAR_CONTAS_PAGAR',
            detalhes: JSON.stringify({
                pedido_id,
                nota_fiscal,
                valor_total: valorTotal,
                parcelas: numParcelas,
                contas_geradas: contasGeradas.length
            }),
            usuario_id: req.user.id
        });
        
        // 6. Atualizar status do pedido de compra
        await pool.execute(`
            UPDATE pedidos_compra 
            SET financeiro_geração = 1, 
                data_financeiro = NOW() 
            WHERE id = 
        `, [pedido_id]);
        
        res.json({
            success: true,
            message: `${contasGeradas.length} conta(s) a pagar gerada(s) com sucesso`,
            dados: {
                pedido_id,
                nota_fiscal,
                valor_total: valorTotal,
                parcelas: numParcelas,
                contas: contasGeradas
            }
        });
        
    } catch (error) {
        console.error('[Integração Compras→Financeiro] Erro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar contas a pagar',
            error: error.message
        });
    }
});

/**
 * POST /api/integracao/compras-financeiro/vincular-nfe
 * Vincula uma NF-e de entrada às contas a pagar existentes
 */
router.post('/vincular-nfe', async (req, res) => {
    const { pedido_id, chave_nfe, numero_nfe, data_emissao_nfe, valor_nfe } = req.body;
    
    if (!pedido_id || !chave_nfe) {
        return res.status(400).json({ 
            success: false, 
            message: 'ID do pedido e chave da NF-e são obrigatórios' 
        });
    }
    
    try {
        const pool = req.app.locals.pool;
        
        // Atualizar contas a pagar com dados da NF-e
        const [result] = await pool.execute(`
            UPDATE contas_pagar 
            SET chave_nfe = ,
                nota_fiscal = ,
                data_nfe = ,
                observacoes = CONCAT(IFNULL(observacoes, ''), '\n[NF-e] Vinculada em ', NOW())
            WHERE pedido_origem_id =  AND tipo_origem = 'COMPRA'
        `, [chave_nfe, numero_nfe, data_emissao_nfe, pedido_id]);
        
        // Registrar log
        await registrarLogIntegracao(pool, {
            tipo: 'COMPRAS_FINANCEIRO',
            origem_modulo: 'NFe',
            destino_modulo: 'Financeiro',
            referencia_id: pedido_id,
            acao: 'VINCULAR_NFE',
            detalhes: JSON.stringify({
                pedido_id,
                chave_nfe,
                numero_nfe,
                contas_atualizadas: result.affectedRows
            }),
            usuario_id: req.user.id
        });
        
        res.json({
            success: true,
            message: `NF-e vinculada a ${result.affectedRows} conta(s) a pagar`,
            contas_atualizadas: result.affectedRows
        });
        
    } catch (error) {
        console.error('[Integração Compras→Financeiro] Erro ao vincular NF-e:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao vincular NF-e',
            error: error.message
        });
    }
});

/**
 * POST /api/integracao/compras-financeiro/cancelar-pagar
 * Cancela contas a pagar quando pedido é cancelação
 */
router.post('/cancelar-pagar', async (req, res) => {
    const { pedido_id, motivo } = req.body;
    
    if (!pedido_id) {
        return res.status(400).json({ 
            success: false, 
            message: 'ID do pedido é obrigatório' 
        });
    }
    
    try {
        const pool = req.app.locals.pool;
        
        // Buscar contas vinculadas ao pedido
        const [contas] = await pool.execute(`
            SELECT id, status, valor FROM contas_pagar 
            WHERE pedido_origem_id =  AND tipo_origem = 'COMPRA'
        `, [pedido_id]);
        
        if (contas.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Nenhuma conta a pagar encontrada para este pedido' 
            });
        }
        
        // Verificar se alguma já foi paga
        const contasPagas = contas.filter(c => c.status === 'pago');
        if (contasPagas.length > 0) {
            return res.status(400).json({
                success: false,
                message: `${contasPagas.length} conta(s) já foram pagas e não podem ser canceladas`,
                contas_pagas: contasPagas
            });
        }
        
        // Cancelar todas as contas pendentes
        const [result] = await pool.execute(`
            UPDATE contas_pagar 
            SET status = 'cancelação',
                observacoes = CONCAT(IFNULL(observacoes, ''), '\n[CANCELADO] ', ),
                updated_at = NOW()
            WHERE pedido_origem_id =  AND tipo_origem = 'COMPRA' AND status = 'pendente'
        `, [motivo || 'Pedido cancelação', pedido_id]);
        
        // Registrar log
        await registrarLogIntegracao(pool, {
            tipo: 'COMPRAS_FINANCEIRO',
            origem_modulo: 'Compras',
            destino_modulo: 'Financeiro',
            referencia_id: pedido_id,
            acao: 'CANCELAR_CONTAS_PAGAR',
            detalhes: JSON.stringify({
                pedido_id,
                contas_canceladas: result.affectedRows,
                motivo
            }),
            usuario_id: req.user.id
        });
        
        res.json({
            success: true,
            message: `${result.affectedRows} conta(s) a pagar cancelada(s)`,
            contas_canceladas: result.affectedRows
        });
        
    } catch (error) {
        console.error('[Integração Compras→Financeiro] Erro ao cancelar:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao cancelar contas a pagar',
            error: error.message
        });
    }
});

/**
 * GET /api/integracao/compras-financeiro/status/:pedido_id
 * Verifica status financeiro de um pedido de compra
 */
router.get('/status/:pedido_id', async (req, res) => {
    const { pedido_id } = req.params;
    
    try {
        const pool = req.app.locals.pool;
        
        const [contas] = await pool.execute(`
            SELECT 
                id, descricao, valor, data_vencimento, status,
                parcela, total_parcelas, numero_documento, nota_fiscal
            FROM contas_pagar 
            WHERE pedido_origem_id =  AND tipo_origem = 'COMPRA'
            ORDER BY parcela
        `, [pedido_id]);
        
        if (contas.length === 0) {
            return res.json({
                success: true,
                pedido_id,
                status: 'NAO_GERADO',
                message: 'Nenhuma conta financeira gerada para este pedido'
            });
        }
        
        const totais = {
            total: contas.reduce((s, c) => s + parseFloat(c.valor), 0),
            pago: contas.filter(c => c.status === 'pago')
                       .reduce((s, c) => s + parseFloat(c.valor), 0),
            pendente: contas.filter(c => c.status === 'pendente')
                           .reduce((s, c) => s + parseFloat(c.valor), 0),
            vencido: contas.filter(c => c.status === 'pendente' && new Date(c.data_vencimento) < new Date())
                          .reduce((s, c) => s + parseFloat(c.valor), 0)
        };
        
        let status = 'PENDENTE';
        if (totais.pago >= totais.total) status = 'QUITADO';
        else if (totais.pago > 0) status = 'PARCIAL';
        else if (totais.vencido > 0) status = 'VENCIDO';
        
        res.json({
            success: true,
            pedido_id,
            status,
            totais,
            contas
        });
        
    } catch (error) {
        console.error('[Integração Compras→Financeiro] Erro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao consultar status financeiro',
            error: error.message
        });
    }
});

/**
 * GET /api/integracao/compras-financeiro/pendentes
 * Lista pedidos de compra sem financeiro geração
 */
router.get('/pendentes', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        
        const [pedidos] = await pool.execute(`
            SELECT 
                pc.id,
                pc.numero_pedido,
                pc.valor_total,
                pc.status,
                pc.data_criacao,
                f.nome as fornecedor_nome
            FROM pedidos_compra pc
            LEFT JOIN fornecedores f ON pc.fornecedor_id = f.id
            WHERE (pc.financeiro_geração IS NULL OR pc.financeiro_geração = 0)
                AND pc.status IN ('recebido', 'conferido', 'aprovação')
            ORDER BY pc.data_criacao DESC
            LIMIT 50
        `);
        
        res.json({
            success: true,
            total: pedidos.length,
            pedidos
        });
        
    } catch (error) {
        console.error('[Integração Compras→Financeiro] Erro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar pedidos pendentes',
            error: error.message
        });
    }
});

/**
 * Função auxiliar para registrar logs de integração
 */
async function registrarLogIntegracao(pool, dados) {
    try {
        await pool.execute(`
            INSERT INTO logs_integracao (
                tipo, origem_modulo, destino_modulo, 
                referencia_id, acao, detalhes, 
                usuario_id, created_at
            ) VALUES (?, ?, ?, ?, , ?, ?, NOW())
        `, [
            dados.tipo,
            dados.origem_modulo,
            dados.destino_modulo,
            dados.referencia_id,
            dados.acao,
            dados.detalhes,
            dados.usuario_id
        ]);
    } catch (error) {
        console.error('[Log Integração] Erro ao registrar:', error.message);
        // Não propagar erro - log é secundário
    }
}

module.exports = router;
