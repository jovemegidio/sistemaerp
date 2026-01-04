/**
 * APIs REST Completas para Módulo RH
 * Rotas para integração no server.js principal
 */

const express = require('express');
const router = express.Router();

// ============================================================================
// FASE 4 - FOLHA DE PAGAMENTO - APIs REST
// ============================================================================

/**
 * GET /api/rh/folha/listar
 * Lista todas as folhas de pagamento
 */
router.get('/folha/listar', async (req, res) => {
    try {
        const { mes, ano, status } = req.query;
        
        let query = `
            SELECT 
                fp.*,
                (SELECT COUNT(*) FROM rh_holerites WHERE folha_id = fp.id) as total_holerites,
                (SELECT SUM(salario_liquido) FROM rh_holerites WHERE folha_id = fp.id) as total_liquido
            FROM rh_folhas_pagamento fp
            WHERE 1=1
        `;
        
        const params = [];
        
        if (mes) {
            query += ' AND fp.mes = ';
            params.push(mes);
        }
        
        if (ano) {
            query += ' AND fp.ano = ';
            params.push(ano);
        }
        
        if (status) {
            query += ' AND fp.status = ';
            params.push(status);
        }
        
        query += ' ORDER BY fp.ano DESC, fp.mes DESC';
        
        const [folhas] = await pool.query(query, params);
        
        res.json({
            success: true,
            data: folhas
        });
    } catch (error) {
        console.error('❌ Erro ao listar folhas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/rh/folha/processar
 * Processar folha de pagamento do mês
 */
router.post('/folha/processar', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { mes, ano, tipo_folha } = req.body;
        
        if (!mes || !ano) {
            return res.status(400).json({ success: false, error: 'Mês e ano são obrigatórios' });
        }
        
        // Verificar se já existe folha para o período
        const [existing] = await connection.query(
            'SELECT id FROM rh_folhas_pagamento WHERE mes =  AND ano =  AND tipo_folha = ',
            [mes, ano, tipo_folha || 'mensal']
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Folha já existe para este período',
                folha_id: existing[0].id
            });
        }
        
        // Criar folha de pagamento
        const [folhaResult] = await connection.query(
            `INSERT INTO rh_folhas_pagamento 
             (mes, ano, tipo_folha, data_processamento, processação_por, status)
             VALUES (, , , NOW(), , 'processando')`,
            [mes, ano, tipo_folha || 'mensal', req.user.id]
        );
        
        const folhaId = folhaResult.insertId;
        
        // Buscar funcionários ativos
        const [funcionarios] = await connection.query(
            `SELECT 
                f.id, f.nome_completo, f.salario, f.cargo, f.departamento,
                f.data_admissao, jt.carga_horaria_mensal
            FROM funcionarios f
            LEFT JOIN jornada_trabalho jt ON f.jornada_trabalho_id = jt.id
            WHERE f.ativo = 1 AND f.status = 'ativo'`
        );
        
        let totalProcessaçãos = 0;
        let totalErros = 0;
        
        for (const func of funcionarios) {
            try {
                // Buscar proventos adicionais (horas extras, comissões, etc)
                const [proventos] = await connection.query(
                    `SELECT tipo, valor FROM rh_holerite_itens 
                     WHERE funcionario_id =  AND mes =  AND ano =  AND categoria = 'provento'`,
                    [func.id, mes, ano]
                );
                
                // Buscar descontos adicionais
                const [descontos] = await connection.query(
                    `SELECT tipo, valor FROM rh_holerite_itens 
                     WHERE funcionario_id =  AND mes =  AND ano =  AND categoria = 'desconto'`,
                    [func.id, mes, ano]
                );
                
                // Calcular totais
                const salarioBase = parseFloat(func.salario) || 0;
                const totalProventos = proventos.reduce((sum, p) => sum + parseFloat(p.valor), 0);
                const totalDescontos = descontos.reduce((sum, d) => sum + parseFloat(d.valor), 0);
                
                // Calcular INSS
                const baseINSS = salarioBase + totalProventos;
                const inss = calcularINSS(baseINSS);
                
                // Calcular IRRF (base = salário - INSS)
                const baseIRRF = baseINSS - inss.valor;
                const irrf = calcularIRRF(baseIRRF, 0);
                
                // FGTS (8% sobre salário bruto)
                const fgts = Math.round((baseINSS * 0.08) * 100) / 100;
                
                // Salário líquido
                const salarioLiquido = baseINSS - inss.valor - irrf.valor - totalDescontos;
                
                // Inserir holerite
                await connection.query(
                    `INSERT INTO rh_holerites 
                     (folha_id, funcionario_id, mes, ano, salario_base, total_proventos, 
                      total_descontos, inss_valor, irrf_valor, fgts_valor, salario_liquido, status)
                     VALUES (, , , , , , , , , , , 'calculação')`,
                    [folhaId, func.id, mes, ano, salarioBase, totalProventos, 
                     totalDescontos, inss.valor, irrf.valor, fgts, salarioLiquido]
                );
                
                totalProcessaçãos++;
            } catch (error) {
                console.error(`Erro ao processar funcionário ${func.id}:`, error);
                totalErros++;
            }
        }
        
        // Atualizar status da folha
        await connection.query(
            `UPDATE rh_folhas_pagamento 
             SET status = 'processada', 
                 total_funcionarios = ,
                 data_processamento = NOW()
             WHERE id = `,
            [totalProcessaçãos, folhaId]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            folha_id: folhaId,
            total_processaçãos: totalProcessaçãos,
            total_erros: totalErros,
            message: 'Folha processada com sucesso'
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('❌ Erro ao processar folha:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * GET /api/rh/folha/:id/holerites
 * Listar holerites de uma folha
 */
router.get('/folha/:id/holerites', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [holerites] = await pool.query(
            `SELECT 
                h.*,
                f.nome_completo,
                f.cpf,
                f.cargo,
                f.departamento
            FROM rh_holerites h
            JOIN funcionarios f ON h.funcionario_id = f.id
            WHERE h.folha_id = 
            ORDER BY f.nome_completo`,
            [id]
        );
        
        res.json({
            success: true,
            data: holerites
        });
    } catch (error) {
        console.error('❌ Erro ao listar holerites:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/rh/holerite/:id/pdf
 * Gerar holerite em PDF
 */
router.get('/holerite/:id/pdf', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [holerite] = await pool.query(
            `SELECT 
                h.*,
                f.nome_completo,
                f.cpf,
                f.cargo,
                f.departamento,
                f.data_admissao,
                fp.mes,
                fp.ano
            FROM rh_holerites h
            JOIN funcionarios f ON h.funcionario_id = f.id
            JOIN rh_folhas_pagamento fp ON h.folha_id = fp.id
            WHERE h.id = `,
            [id]
        );
        
        if (!holerite.length) {
            return res.status(404).json({ success: false, error: 'Holerite não encontração' });
        }
        
        // Buscar itens detalhaçãos
        const [itens] = await pool.query(
            `SELECT * FROM rh_holerite_itens 
             WHERE funcionario_id =  AND mes =  AND ano = 
             ORDER BY categoria, tipo`,
            [holerite[0].funcionario_id, holerite[0].mes, holerite[0].ano]
        );
        
        res.json({
            success: true,
            data: {
                holerite: holerite[0],
                itens: itens
            },
            message: 'Implementar geração de PDF com PDFKit'
        });
        
    } catch (error) {
        console.error('❌ Erro ao gerar PDF:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// FASE 5 - BENEFÍCIOS - APIs REST
// ============================================================================

/**
 * GET /api/rh/beneficios/tipos
 * Listar tipos de benefícios
 */
router.get('/beneficios/tipos', async (req, res) => {
    try {
        const [tipos] = await pool.query(
            `SELECT * FROM rh_beneficios_tipos 
             WHERE ativo = TRUE 
             ORDER BY categoria, nome`
        );
        
        res.json({
            success: true,
            data: tipos
        });
    } catch (error) {
        console.error('❌ Erro ao listar tipos de benefícios:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/rh/beneficios/tipos
 * Criar tipo de benefício
 */
router.post('/beneficios/tipos', async (req, res) => {
    try {
        const { nome, categoria, descricao, valor_padrao, desconto_funcionario, obrigatorio, fornecedor } = req.body;
        
        const [result] = await pool.query(
            `INSERT INTO rh_beneficios_tipos 
             (nome, categoria, descricao, valor_padrao, desconto_funcionario, obrigatorio, fornecedor)
             VALUES (, , , , , , )`,
            [nome, categoria, descricao, valor_padrao || 0, desconto_funcionario || 0, 
             obrigatorio || false, fornecedor]
        );
        
        res.json({
            success: true,
            id: result.insertId,
            message: 'Tipo de benefício criação com sucesso'
        });
    } catch (error) {
        console.error('❌ Erro ao criar tipo de benefício:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/rh/beneficios/funcionario/:id
 * Listar benefícios de um funcionário
 */
router.get('/beneficios/funcionario/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [beneficios] = await pool.query(
            `SELECT 
                fb.*,
                bt.nome as beneficio_nome,
                bt.categoria,
                bt.fornecedor
            FROM rh_funcionarios_beneficios fb
            JOIN rh_beneficios_tipos bt ON fb.beneficio_tipo_id = bt.id
            WHERE fb.funcionario_id =  AND fb.ativo = TRUE
            ORDER BY bt.categoria, bt.nome`,
            [id]
        );
        
        const totalMensal = beneficios.reduce((sum, b) => sum + parseFloat(b.valor_funcionario || 0), 0);
        
        res.json({
            success: true,
            data: beneficios,
            total_mensal: totalMensal
        });
    } catch (error) {
        console.error('❌ Erro ao listar benefícios:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/rh/beneficios/vincular
 * Vincular benefício a funcionário
 */
router.post('/beneficios/vincular', async (req, res) => {
    try {
        const { funcionario_id, beneficio_tipo_id, valor_empresa, valor_funcionario, inicio_vigencia } = req.body;
        
        const [result] = await pool.query(
            `INSERT INTO rh_funcionarios_beneficios 
             (funcionario_id, beneficio_tipo_id, valor_empresa, valor_funcionario, 
              inicio_vigencia, ativo)
             VALUES (, , , , , TRUE)`,
            [funcionario_id, beneficio_tipo_id, valor_empresa, valor_funcionario || 0, 
             inicio_vigencia || new Date()]
        );
        
        res.json({
            success: true,
            id: result.insertId,
            message: 'Benefício vinculação com sucesso'
        });
    } catch (error) {
        console.error('❌ Erro ao vincular benefício:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/rh/beneficios/:id/cancelar
 * Cancelar benefício de funcionário
 */
router.put('/beneficios/:id/cancelar', async (req, res) => {
    try {
        const { id } = req.params;
        const { fim_vigencia, motivo } = req.body;
        
        await pool.query(
            `UPDATE rh_funcionarios_beneficios 
             SET ativo = FALSE, 
                 fim_vigencia = ,
                 observacoes = 
             WHERE id = `,
            [fim_vigencia || new Date(), motivo, id]
        );
        
        res.json({
            success: true,
            message: 'Benefício cancelação com sucesso'
        });
    } catch (error) {
        console.error('❌ Erro ao cancelar benefício:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// FASE 6 - AVALIAÇÃO DE DESEMPENHO - APIs REST
// ============================================================================

/**
 * GET /api/rh/avaliacoes/periodos
 * Listar períodos de avaliação
 */
router.get('/avaliacoes/periodos', async (req, res) => {
    try {
        const [periodos] = await pool.query(
            `SELECT 
                p.*,
                (SELECT COUNT(*) FROM rh_avaliacoes_desempenho WHERE periodo_id = p.id) as total_avaliacoes
            FROM rh_periodos_avaliacao p
            WHERE p.ativo = TRUE
            ORDER BY p.data_inicio DESC`
        );
        
        res.json({
            success: true,
            data: periodos
        });
    } catch (error) {
        console.error('❌ Erro ao listar períodos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/rh/avaliacoes/criar
 * Criar nova avaliação de desempenho
 */
router.post('/avaliacoes/criar', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { 
            funcionario_id, 
            periodo_id, 
            avaliaçãor_id, 
            competencias,  // Array de {competencia_id, nota, comentario}
            pontos_fortes, 
            pontos_melhorar, 
            plano_acao 
        } = req.body;
        
        // Criar avaliação
        const [avalResult] = await connection.query(
            `INSERT INTO rh_avaliacoes_desempenho 
             (funcionario_id, periodo_id, avaliaçãor_id, pontos_fortes, 
              pontos_melhoria, plano_desenvolvimento, status, data_avaliacao)
             VALUES (, , , , , , 'concluida', NOW())`,
            [funcionario_id, periodo_id, avaliaçãor_id, pontos_fortes, 
             pontos_melhorar, plano_acao]
        );
        
        const avaliacaoId = avalResult.insertId;
        
        // Inserir itens de competências
        let somaNotas = 0;
        for (const comp of competencias) {
            await connection.query(
                `INSERT INTO rh_avaliacao_itens 
                 (avaliacao_id, competencia_id, nota_avaliacao, comentarios)
                 VALUES (, , , )`,
                [avaliacaoId, comp.competencia_id, comp.nota, comp.comentario || null]
            );
            somaNotas += parseFloat(comp.nota);
        }
        
        // Calcular média
        const notaFinal = competencias.length > 0  somaNotas / competencias.length : 0;
        
        await connection.query(
            `UPDATE rh_avaliacoes_desempenho 
             SET nota_final =  
             WHERE id = `,
            [notaFinal, avaliacaoId]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            id: avaliacaoId,
            nota_final: notaFinal,
            message: 'Avaliação criada com sucesso'
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('❌ Erro ao criar avaliação:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * GET /api/rh/avaliacoes/funcionario/:id
 * Histórico de avaliações de um funcionário
 */
router.get('/avaliacoes/funcionario/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [avaliacoes] = await pool.query(
            `SELECT 
                a.*,
                p.nome as periodo_nome,
                av.nome_completo as avaliaçãor_nome
            FROM rh_avaliacoes_desempenho a
            JOIN rh_periodos_avaliacao p ON a.periodo_id = p.id
            JOIN funcionarios av ON a.avaliaçãor_id = av.id
            WHERE a.funcionario_id = 
            ORDER BY a.data_avaliacao DESC`,
            [id]
        );
        
        res.json({
            success: true,
            data: avaliacoes
        });
    } catch (error) {
        console.error('❌ Erro ao listar avaliações:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

function calcularINSS(salario) {
    const faixas = [
        { limite: 1412.00, aliquota: 0.075 },
        { limite: 2666.68, aliquota: 0.09 },
        { limite: 4000.03, aliquota: 0.12 },
        { limite: 7786.02, aliquota: 0.14 }
    ];
    
    let inss = 0;
    let salarioRestante = salario;
    let limiteAnterior = 0;
    
    for (const faixa of faixas) {
        if (salarioRestante <= 0) break;
        
        const baseCalculo = Math.min(salarioRestante, faixa.limite - limiteAnterior);
        inss += baseCalculo * faixa.aliquota;
        
        salarioRestante -= baseCalculo;
        limiteAnterior = faixa.limite;
    }
    
    return { valor: Math.round(inss * 100) / 100 };
}

function calcularIRRF(baseCalculo, dependentes = 0) {
    const deducaoPorDependente = 189.59;
    const baseTributavel = baseCalculo - (dependentes * deducaoPorDependente);
    
    const faixas = [
        { limite: 2259.20, aliquota: 0, parcela: 0 },
        { limite: 2826.65, aliquota: 0.075, parcela: 169.44 },
        { limite: 3751.05, aliquota: 0.15, parcela: 381.44 },
        { limite: 4664.68, aliquota: 0.225, parcela: 662.77 },
        { limite: 999999, aliquota: 0.275, parcela: 896.00 }
    ];
    
    const faixa = faixas.find(f => baseTributavel <= f.limite);
    
    if (!faixa || faixa.aliquota === 0) {
        return { valor: 0 };
    }
    
    const irrf = (baseTributavel * faixa.aliquota) - faixa.parcela;
    
    return { valor: Math.max(0, Math.round(irrf * 100) / 100) };
}

module.exports = router;
