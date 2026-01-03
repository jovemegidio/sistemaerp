/**
 * API DE INTEGRAÇÃO: VENDAS → FINANCEIRO
 * Gera contas a receber automaticamente a partir de pedidos faturados
 * 
 * @author Aluforce ERP
 * @version 1.0.0
 * @date 2025-12-19
 */

const express = require('express');
const router = express.Router();

/**
 * POST /api/integracao/vendas-financeiro/gerar-receber
 * Gera contas a receber a partir de um pedido de venda faturado
 */
router.post('/gerar-receber', async (req, res) => {
    const { pedido_id, parcelas, condicao_pagamento, observacoes } = req.body;
    
    if (!pedido_id) {
        return res.status(400).json({ 
            success: false, 
            message: 'ID do pedido é obrigatório' 
        });
    }
    
    try {
        const pool = req.app.locals.pool;
        
        // 1. Buscar dados do pedido de venda
        const [pedidos] = await pool.execute(`
            SELECT 
                p.*,
                e.razao_social as cliente_nome,
                e.cnpj as cliente_cnpj,
                e.email as cliente_email
            FROM pedidos p
            LEFT JOIN empresas e ON p.empresa_id = e.id
            WHERE p.id = ?
        `, [pedido_id]);
        
        if (pedidos.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Pedido não encontrado' 
            });
        }
        
        const pedido = pedidos[0];
        
        // 2. Verificar se já existe contas geradas para este pedido
        const [existentes] = await pool.execute(`
            SELECT COUNT(*) as total FROM contas_receber 
            WHERE pedido_origem_id = ? AND tipo_origem = 'VENDA'
        `, [pedido_id]);
        
        if (existentes[0].total > 0) {
            return res.status(409).json({ 
                success: false, 
                message: 'Já existem contas a receber geradas para este pedido',
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
            'entrada_30_60': [0, 30, 60]
        };
        
        let diasVencimento = condicoes[condicao_pagamento] || Array.from(
            { length: numParcelas }, 
            (_, i) => (i + 1) * 30
        );
        
        // 4. Gerar cada parcela como conta a receber
        const contasGeradas = [];
        
        for (let i = 0; i < numParcelas; i++) {
            const dataVencimento = new Date(dataBase);
            dataVencimento.setDate(dataVencimento.getDate() + (diasVencimento[i] || (i + 1) * 30));
            
            const numeroDocumento = `VND-${pedido_id}-${String(i + 1).padStart(2, '0')}`;
            
            const [result] = await pool.execute(`
                INSERT INTO contas_receber (
                    descricao,
                    valor,
                    data_vencimento,
                    data_emissao,
                    status,
                    cliente_id,
                    cliente_nome,
                    numero_documento,
                    parcela,
                    total_parcelas,
                    pedido_origem_id,
                    tipo_origem,
                    categoria,
                    observacoes,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                `Venda #${pedido.numero_pedido || pedido_id} - Parcela ${i + 1}/${numParcelas}`,
                valorParcela.toFixed(2),
                dataVencimento.toISOString().split('T')[0],
                dataBase.toISOString().split('T')[0],
                'pendente',
                pedido.empresa_id || pedido.cliente_id,
                pedido.cliente_nome || 'Cliente não identificado',
                numeroDocumento,
                i + 1,
                numParcelas,
                pedido_id,
                'VENDA',
                'Vendas',
                observacoes || `Gerado automaticamente do pedido de venda #${pedido_id}`
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
            tipo: 'VENDAS_FINANCEIRO',
            origem_modulo: 'Vendas',
            destino_modulo: 'Financeiro',
            referencia_id: pedido_id,
            acao: 'GERAR_CONTAS_RECEBER',
            detalhes: JSON.stringify({
                pedido_id,
                valor_total: valorTotal,
                parcelas: numParcelas,
                contas_geradas: contasGeradas.length
            }),
            usuario_id: req.user?.id
        });
        
        // 6. Atualizar status do pedido
        await pool.execute(`
            UPDATE pedidos 
            SET financeiro_gerado = 1, 
                data_financeiro = NOW() 
            WHERE id = ?
        `, [pedido_id]);
        
        res.json({
            success: true,
            message: `${contasGeradas.length} conta(s) a receber gerada(s) com sucesso`,
            dados: {
                pedido_id,
                valor_total: valorTotal,
                parcelas: numParcelas,
                contas: contasGeradas
            }
        });
        
    } catch (error) {
        console.error('[Integração Vendas→Financeiro] Erro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar contas a receber',
            error: error.message
        });
    }
});

/**
 * POST /api/integracao/vendas-financeiro/cancelar-receber
 * Cancela contas a receber quando pedido é cancelado
 */
router.post('/cancelar-receber', async (req, res) => {
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
            SELECT id, status, valor FROM contas_receber 
            WHERE pedido_origem_id = ? AND tipo_origem = 'VENDA'
        `, [pedido_id]);
        
        if (contas.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Nenhuma conta a receber encontrada para este pedido' 
            });
        }
        
        // Verificar se alguma já foi paga
        const contasPagas = contas.filter(c => c.status === 'pago' || c.status === 'recebido');
        if (contasPagas.length > 0) {
            return res.status(400).json({
                success: false,
                message: `${contasPagas.length} conta(s) já foram pagas e não podem ser canceladas`,
                contas_pagas: contasPagas
            });
        }
        
        // Cancelar todas as contas pendentes
        const [result] = await pool.execute(`
            UPDATE contas_receber 
            SET status = 'cancelado',
                observacoes = CONCAT(IFNULL(observacoes, ''), '\n[CANCELADO] ', ?),
                updated_at = NOW()
            WHERE pedido_origem_id = ? AND tipo_origem = 'VENDA' AND status = 'pendente'
        `, [motivo || 'Pedido cancelado', pedido_id]);
        
        // Registrar log
        await registrarLogIntegracao(pool, {
            tipo: 'VENDAS_FINANCEIRO',
            origem_modulo: 'Vendas',
            destino_modulo: 'Financeiro',
            referencia_id: pedido_id,
            acao: 'CANCELAR_CONTAS_RECEBER',
            detalhes: JSON.stringify({
                pedido_id,
                contas_canceladas: result.affectedRows,
                motivo
            }),
            usuario_id: req.user?.id
        });
        
        res.json({
            success: true,
            message: `${result.affectedRows} conta(s) a receber cancelada(s)`,
            contas_canceladas: result.affectedRows
        });
        
    } catch (error) {
        console.error('[Integração Vendas→Financeiro] Erro ao cancelar:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao cancelar contas a receber',
            error: error.message
        });
    }
});

/**
 * GET /api/integracao/vendas-financeiro/status/:pedido_id
 * Verifica status financeiro de um pedido
 */
router.get('/status/:pedido_id', async (req, res) => {
    const { pedido_id } = req.params;
    
    try {
        const pool = req.app.locals.pool;
        
        const [contas] = await pool.execute(`
            SELECT 
                id, descricao, valor, data_vencimento, status,
                parcela, total_parcelas, numero_documento
            FROM contas_receber 
            WHERE pedido_origem_id = ? AND tipo_origem = 'VENDA'
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
            pago: contas.filter(c => c.status === 'pago' || c.status === 'recebido')
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
        console.error('[Integração Vendas→Financeiro] Erro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao consultar status financeiro',
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
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
