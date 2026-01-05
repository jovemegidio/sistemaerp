/**
 * API de Conciliação Bancária
 * Importação de extratos OFX e conciliação automática
 * @author Aluforce ERP
 * @version 1.0.0
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuração do multer para upload de arquivos OFX
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/ofx');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        cb(null, `extrato_${timestamp}_${file.originalname}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.ofx' || ext === '.ofc') {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos OFX são permitidos'));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = function({ pool, authenticateToken }) {
    const router = express.Router();
    router.use(authenticateToken);

    // ==================== PARSER OFX ====================
    
    /**
     * Parser simples de arquivos OFX
     * @param {string} content - Conteúdo do arquivo OFX
     * @returns {object} - Daçãos parseaçãos
     */
    function parseOFX(content) {
        const result = {
            banco: {},
            conta: {},
            transacoes: []
        };
        
        try {
            // Extrair informações do banco
            const bankIdMatch = content.match(/<BANKID>([^<\r\n]+)/);
            const branchIdMatch = content.match(/<BRANCHID>([^<\r\n]+)/);
            const acctIdMatch = content.match(/<ACCTID>([^<\r\n]+)/);
            const acctTypeMatch = content.match(/<ACCTTYPE>([^<\r\n]+)/);
            
            result.banco.codigo = bankIdMatch ? bankIdMatch[1].trim() : '';
            result.conta.agencia = branchIdMatch ? branchIdMatch[1].trim() : '';
            result.conta.numero = acctIdMatch ? acctIdMatch[1].trim() : '';
            result.conta.tipo = acctTypeMatch ? acctTypeMatch[1].trim() : '';
            
            // Extrair período do extrato
            const dtStartMatch = content.match(/<DTSTART>([^<\r\n]+)/);
            const dtEndMatch = content.match(/<DTEND>([^<\r\n]+)/);
            
            result.periodo = {
                inicio: dtStartMatch  parseOFXDate(dtStartMatch[1]) : null,
                fim: dtEndMatch  parseOFXDate(dtEndMatch[1]) : null
            };
            
            // Extrair saldo
            const balAmtMatch = content.match(/<BALAMT>([^<\r\n]+)/);
            const dtAsOfMatch = content.match(/<DTASOF>([^<\r\n]+)/);
            
            result.saldo = {
                valor: balAmtMatch ? parseFloat(balAmtMatch[1]) : 0,
                data: dtAsOfMatch  parseOFXDate(dtAsOfMatch[1]) : null
            };
            
            // Extrair transações
            const stmtTrnRegex = /<STMTTRN>([\s\S]*)<\/STMTTRN>/gi;
            let match;
            
            while ((match = stmtTrnRegex.exec(content)) !== null) {
                const trn = match[1];
                
                const trnTypeMatch = trn.match(/<TRNTYPE>([^<\r\n]+)/);
                const dtPostedMatch = trn.match(/<DTPOSTED>([^<\r\n]+)/);
                const trnAmtMatch = trn.match(/<TRNAMT>([^<\r\n]+)/);
                const fitIdMatch = trn.match(/<FITID>([^<\r\n]+)/);
                const memoMatch = trn.match(/<MEMO>([^<\r\n]+)/);
                const nameMatch = trn.match(/<NAME>([^<\r\n]+)/);
                const checkNumMatch = trn.match(/<CHECKNUM>([^<\r\n]+)/);
                
                const transacao = {
                    tipo: trnTypeMatch ? trnTypeMatch[1].trim() : '',
                    data: dtPostedMatch  parseOFXDate(dtPostedMatch[1]) : null,
                    valor: trnAmtMatch ? parseFloat(trnAmtMatch[1]) : 0,
                    id_banco: fitIdMatch ? fitIdMatch[1].trim() : '',
                    descricao: memoMatch ? memoMatch[1].trim() : (nameMatch ? nameMatch[1].trim() : ''),
                    documento: checkNumMatch ? checkNumMatch[1].trim() : ''
                };
                
                result.transacoes.push(transacao);
            }
            
        } catch (error) {
            console.error('[OFX] Erro ao parsear:', error);
        }
        
        return result;
    }
    
    /**
     * Converter data OFX para Date
     * Formato OFX: YYYYMMDDHHMMSS ou YYYYMMDD
     */
    function parseOFXDate(dateStr) {
        if (!dateStr) return null;
        
        const clean = dateStr.replace(/\[.*\]/, '').trim();
        
        if (clean.length >= 8) {
            const year = parseInt(clean.substr(0, 4));
            const month = parseInt(clean.substr(4, 2)) - 1;
            const day = parseInt(clean.substr(6, 2));
            const hour = clean.length >= 10 ? parseInt(clean.substr(8, 2)) : 0;
            const min = clean.length >= 12 ? parseInt(clean.substr(10, 2)) : 0;
            const sec = clean.length >= 14 ? parseInt(clean.substr(12, 2)) : 0;
            
            return new Date(year, month, day, hour, min, sec);
        }
        
        return null;
    }

    // ==================== ROTAS ====================
    
    /**
     * GET /contas-bancarias - Listar contas bancárias
     */
    router.get('/contas-bancarias', async (req, res) => {
        try {
            const [contas] = await pool.query(`
                SELECT 
                    cb.*,
                    (SELECT COALESCE(SUM(CASE WHEN tipo = 'credito' THEN valor ELSE -valor END), 0)
                     FROM movimentacoes_bancarias WHERE conta_id = cb.id) as saldo_calculação
                FROM contas_bancarias cb
                WHERE cb.ativo = TRUE
                ORDER BY cb.banco, cb.agencia, cb.conta
            `);
            
            res.json({ success: true, data: contas });
        } catch (error) {
            console.error('[CONCILIAÇÃO] Erro ao listar contas:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * POST /contas-bancarias - Criar conta bancária
     */
    router.post('/contas-bancarias', async (req, res) => {
        try {
            const { banco, agencia, conta, tipo, descricao, saldo_inicial } = req.body;
            
            if (!banco || !conta) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Banco e conta são obrigatórios' 
                });
            }
            
            const [result] = await pool.query(`
                INSERT INTO contas_bancarias (banco, agencia, conta, tipo, descricao, saldo_inicial, saldo_atual)
                VALUES (?, ?, ?, ?, , ?, ?)
            `, [banco, agencia || '', conta, tipo || 'corrente', descricao || '', saldo_inicial || 0, saldo_inicial || 0]);
            
            res.status(201).json({ 
                success: true, 
                message: 'Conta bancária criada',
                data: { id: result.insertId }
            });
        } catch (error) {
            console.error('[CONCILIAÇÃO] Erro ao criar conta:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * POST /importar-ofx - Importar extrato OFX
     */
    router.post('/importar-ofx', upload.single('arquivo'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Arquivo OFX é obrigatório' 
                });
            }
            
            const { conta_id } = req.body;
            
            if (!conta_id) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Conta bancária é obrigatória' 
                });
            }
            
            // Ler e parsear o arquivo
            const content = fs.readFileSync(req.file.path, 'latin1');
            const dados = parseOFX(content);
            
            if (dados.transacoes.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Nenhuma transação encontrada no arquivo' 
                });
            }
            
            // Registrar importação
            const [importacao] = await pool.query(`
                INSERT INTO importacoes_extrato (
                    conta_id, arquivo, banco_codigo, periodo_inicio, periodo_fim,
                    total_transacoes, saldo_final, usuario_id
                ) VALUES (?, ?, ?, ?, , ?, ?, )
            `, [
                conta_id,
                req.file.filename,
                dados.banco.codigo,
                dados.periodo.inicio,
                dados.periodo.fim,
                dados.transacoes.length,
                dados.saldo.valor,
                req.user.id
            ]);
            
            const importacaoId = importacao.insertId;
            
            // Inserir transações
            let inseridas = 0;
            let duplicadas = 0;
            
            for (const trn of dados.transacoes) {
                // Verificar se já existe (pelo ID do banco)
                if (trn.id_banco) {
                    const [[existe]] = await pool.query(`
                        SELECT id FROM transacoes_extrato 
                        WHERE conta_id =  AND id_banco = 
                    `, [conta_id, trn.id_banco]);
                    
                    if (existe) {
                        duplicadas++;
                        continue;
                    }
                }
                
                await pool.query(`
                    INSERT INTO transacoes_extrato (
                        importacao_id, conta_id, tipo, data, valor, 
                        id_banco, descricao, documento, status
                    ) VALUES (?, ?, ?, ?, , ?, ?, , 'pendente')
                `, [
                    importacaoId,
                    conta_id,
                    trn.tipo,
                    trn.data,
                    trn.valor,
                    trn.id_banco,
                    trn.descricao,
                    trn.documento
                ]);
                
                inseridas++;
            }
            
            res.json({
                success: true,
                message: `Extrato importação: ${inseridas} transações novas, ${duplicadas} duplicadas`,
                data: {
                    importacao_id: importacaoId,
                    total_arquivo: dados.transacoes.length,
                    inseridas,
                    duplicadas,
                    periodo: dados.periodo,
                    saldo: dados.saldo
                }
            });
            
        } catch (error) {
            console.error('[CONCILIAÇÃO] Erro ao importar OFX:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * GET /transacoes-pendentes - Listar transações pendentes de conciliação
     */
    router.get('/transacoes-pendentes', async (req, res) => {
        try {
            const { conta_id, data_inicio, data_fim } = req.query;
            
            let where = "te.status = 'pendente'";
            const params = [];
            
            if (conta_id) {
                where += ' AND te.conta_id = ';
                params.push(conta_id);
            }
            
            if (data_inicio) {
                where += ' AND te.data >= ';
                params.push(data_inicio);
            }
            
            if (data_fim) {
                where += ' AND te.data <= ';
                params.push(data_fim);
            }
            
            const [transacoes] = await pool.query(`
                SELECT 
                    te.*,
                    cb.banco,
                    cb.conta as conta_numero
                FROM transacoes_extrato te
                JOIN contas_bancarias cb ON te.conta_id = cb.id
                WHERE ${where}
                ORDER BY te.data DESC, te.id DESC
            `, params);
            
            res.json({ success: true, data: transacoes });
        } catch (error) {
            console.error('[CONCILIAÇÃO] Erro ao listar pendentes:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * GET /sugestoes-conciliacao/:transacao_id - Sugerir conciliações
     */
    router.get('/sugestoes-conciliacao/:transacao_id', async (req, res) => {
        try {
            const { transacao_id } = req.params;
            
            // Buscar transação do extrato
            const [[transacao]] = await pool.query(`
                SELECT * FROM transacoes_extrato WHERE id = 
            `, [transacao_id]);
            
            if (!transacao) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Transação não encontrada' 
                });
            }
            
            const sugestoes = [];
            const valorAbs = Math.abs(transacao.valor);
            const margem = valorAbs * 0.01; // 1% de margem
            
            // Se for crédito, buscar em contas a receber
            if (transacao.valor > 0) {
                const [receber] = await pool.query(`
                    SELECT 
                        cr.id,
                        'contas_receber' as tipo,
                        cr.descricao,
                        cr.valor,
                        cr.data_vencimento,
                        c.nome as cliente
                    FROM contas_receber cr
                    LEFT JOIN clientes c ON cr.cliente_id = c.id
                    WHERE cr.status = 'aberto'
                    AND cr.valor BETWEEN ? AND 
                    ORDER BY ABS(cr.valor - ) ASC
                    LIMIT 5
                `, [valorAbs - margem, valorAbs + margem, valorAbs]);
                
                sugestoes.push(...receber.map(r => ({
                    ...r,
                    similaridade: 100 - Math.abs(r.valor - valorAbs) / valorAbs * 100
                })));
            }
            
            // Se for débito, buscar em contas a pagar
            if (transacao.valor < 0) {
                const [pagar] = await pool.query(`
                    SELECT 
                        cp.id,
                        'contas_pagar' as tipo,
                        cp.descricao,
                        cp.valor,
                        cp.data_vencimento,
                        f.nome as fornecedor
                    FROM contas_pagar cp
                    LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
                    WHERE cp.status = 'aberto'
                    AND cp.valor BETWEEN ? AND 
                    ORDER BY ABS(cp.valor - ) ASC
                    LIMIT 5
                `, [valorAbs - margem, valorAbs + margem, valorAbs]);
                
                sugestoes.push(...pagar.map(p => ({
                    ...p,
                    similaridade: 100 - Math.abs(p.valor - valorAbs) / valorAbs * 100
                })));
            }
            
            res.json({ 
                success: true, 
                data: {
                    transacao,
                    sugestoes: sugestoes.sort((a, b) => b.similaridade - a.similaridade)
                }
            });
        } catch (error) {
            console.error('[CONCILIAÇÃO] Erro ao buscar sugestões:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * POST /conciliar - Conciliar transação com conta
     */
    router.post('/conciliar', async (req, res) => {
        const conn = await pool.getConnection();
        
        try {
            await conn.beginTransaction();
            
            const { transacao_id, tipo_conta, conta_id } = req.body;
            
            // Buscar transação do extrato
            const [[transacao]] = await conn.query(`
                SELECT * FROM transacoes_extrato WHERE id =  AND status = 'pendente'
            `, [transacao_id]);
            
            if (!transacao) {
                await conn.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: 'Transação não encontrada ou já conciliada' 
                });
            }
            
            // Atualizar a conta correspondente
            if (tipo_conta === 'contas_receber') {
                await conn.query(`
                    UPDATE contas_receber 
                    SET status = 'pago', 
                        data_pagamento = ,
                        valor_pago = 
                    WHERE id = 
                `, [transacao.data, Math.abs(transacao.valor), conta_id]);
            } else if (tipo_conta === 'contas_pagar') {
                await conn.query(`
                    UPDATE contas_pagar 
                    SET status = 'pago', 
                        data_pagamento = ,
                        valor_pago = 
                    WHERE id = 
                `, [transacao.data, Math.abs(transacao.valor), conta_id]);
            }
            
            // Atualizar transação como conciliada
            await conn.query(`
                UPDATE transacoes_extrato 
                SET status = 'conciliação',
                    conciliação_com_tipo = ,
                    conciliação_com_id = ,
                    conciliação_por = ,
                    conciliação_em = NOW()
                WHERE id = 
            `, [tipo_conta, conta_id, req.user.id, transacao_id]);
            
            // Atualizar saldo da conta bancária
            await conn.query(`
                UPDATE contas_bancarias 
                SET saldo_atual = saldo_atual + 
                WHERE id = 
            `, [transacao.valor, transacao.conta_id]);
            
            await conn.commit();
            
            res.json({ 
                success: true, 
                message: 'Transação conciliada com sucesso' 
            });
            
        } catch (error) {
            await conn.rollback();
            console.error('[CONCILIAÇÃO] Erro ao conciliar:', error);
            res.status(500).json({ success: false, message: error.message });
        } finally {
            conn.release();
        }
    });

    /**
     * POST /ignorar - Ignorar transação (não conciliar)
     */
    router.post('/ignorar', async (req, res) => {
        try {
            const { transacao_id, motivo } = req.body;
            
            await pool.query(`
                UPDATE transacoes_extrato 
                SET status = 'ignoração',
                    observacao = ,
                    conciliação_por = ,
                    conciliação_em = NOW()
                WHERE id = 
            `, [motivo || 'Ignoração pelo usuário', req.user.id, transacao_id]);
            
            res.json({ 
                success: true, 
                message: 'Transação marcada como ignorada' 
            });
        } catch (error) {
            console.error('[CONCILIAÇÃO] Erro ao ignorar:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * GET /resumo - Resumo da conciliação
     */
    router.get('/resumo', async (req, res) => {
        try {
            const { conta_id } = req.query;
            
            let where = '1=1';
            const params = [];
            
            if (conta_id) {
                where += ' AND te.conta_id = ';
                params.push(conta_id);
            }
            
            const [[resumo]] = await pool.query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN te.status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
                    SUM(CASE WHEN te.status = 'conciliação' THEN 1 ELSE 0 END) as conciliaçãos,
                    SUM(CASE WHEN te.status = 'ignoração' THEN 1 ELSE 0 END) as ignoraçãos,
                    SUM(CASE WHEN te.status = 'pendente' AND te.valor > 0 THEN te.valor ELSE 0 END) as creditos_pendentes,
                    SUM(CASE WHEN te.status = 'pendente' AND te.valor < 0 THEN ABS(te.valor) ELSE 0 END) as debitos_pendentes
                FROM transacoes_extrato te
                WHERE ${where}
            `, params);
            
            res.json({ success: true, data: resumo });
        } catch (error) {
            console.error('[CONCILIAÇÃO] Erro ao gerar resumo:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    return router;
};
