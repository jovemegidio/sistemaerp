/**
 * API eSocial Básico
 * Gestão de funcionários, admissões, desligamentos e folha
 * SEM ponto eletrônico conforme solicitação
 * @author Aluforce ERP
 * @version 1.0.0
 */

const express = require('express');

module.exports = function({ pool, authenticateToken }) {
    const router = express.Router();
    router.use(authenticateToken);

    // ============================================================
    // TABELAS E EVENTOS eSocial
    // ============================================================

    // Eventos de Tabelas (S-1xxx)
    const EVENTOS_TABELAS = {
        'S-1000': 'Informações do Empregador',
        'S-1005': 'Tabela de Estabelecimentos',
        'S-1010': 'Tabela de Rubricas',
        'S-1020': 'Tabela de Lotações Tributárias',
        'S-1030': 'Tabela de Cargos',
        'S-1035': 'Tabela de Carreiras Públicas',
        'S-1040': 'Tabela de Funções',
        'S-1050': 'Tabela de Horários',
        'S-1060': 'Tabela de Ambientes de Trabalho',
        'S-1070': 'Tabela de Processos Administrativos/Judiciais',
        'S-1080': 'Tabela de Operadores Portuários'
    };

    // Eventos Não Periódicos (S-2xxx)
    const EVENTOS_NAO_PERIODICOS = {
        'S-2190': 'Registro Preliminar de Trabalhador',
        'S-2200': 'Cadastramento Inicial / Admissão',
        'S-2205': 'Alteração de Dados Cadastrais',
        'S-2206': 'Alteração de Contrato de Trabalho',
        'S-2210': 'Comunicação de Acidente de Trabalho',
        'S-2220': 'Monitoramento da Saúde do Trabalhador',
        'S-2230': 'Afastamento Temporário',
        'S-2240': 'Condições Ambientais do Trabalho',
        'S-2298': 'Reintegração',
        'S-2299': 'Desligamento',
        'S-2300': 'Trabalhador Sem Vínculo - Início',
        'S-2306': 'Trabalhador Sem Vínculo - Alteração',
        'S-2399': 'Trabalhador Sem Vínculo - Término',
        'S-2400': 'Cadastro de Beneficiário',
        'S-2405': 'Alteração de Dados Cadastrais do Beneficiário',
        'S-2410': 'Cadastro de Benefício',
        'S-2416': 'Alteração do Cadastro de Benefício',
        'S-2418': 'Reativação de Benefício',
        'S-2420': 'Cadastro de Benefício - Entes Públicos',
        'S-2500': 'Processo Trabalhista',
        'S-2501': 'Informações de Tributos Decorrentes de Processo Trabalhista'
    };

    // Eventos Periódicos (S-1200 a S-1299)
    const EVENTOS_PERIODICOS = {
        'S-1200': 'Remuneração de Trabalhador Vinculado',
        'S-1202': 'Remuneração de Servidor Vinculado a RPPS',
        'S-1207': 'Benefícios',
        'S-1210': 'Pagamentos de Rendimentos do Trabalho',
        'S-1260': 'Comercialização da Produção Rural PF',
        'S-1270': 'Contratação de Trabalhadores Avulsos',
        'S-1280': 'Informações Complementares aos Eventos Periódicos',
        'S-1298': 'Reabertura dos Eventos Periódicos',
        'S-1299': 'Fechamento dos Eventos Periódicos'
    };

    // ============================================================
    // DASHBOARD eSocial
    // ============================================================

    /**
     * GET /dashboard - Dashboard de eventos eSocial
     */
    router.get('/dashboard', async (req, res) => {
        try {
            // Eventos pendentes
            const [[pendentes]] = await pool.query(`
                SELECT COUNT(*) as total FROM esocial_eventos WHERE status = 'pendente'
            `).catch(() => [[{ total: 0 }]]);

            // Eventos enviados no mês
            const [[enviados]] = await pool.query(`
                SELECT COUNT(*) as total FROM esocial_eventos 
                WHERE status = 'enviado' 
                AND MONTH(data_envio) = MONTH(CURDATE())
            `).catch(() => [[{ total: 0 }]]);

            // Eventos com erro
            const [[erros]] = await pool.query(`
                SELECT COUNT(*) as total FROM esocial_eventos WHERE status = 'erro'
            `).catch(() => [[{ total: 0 }]]);

            // Funcionários ativos
            const [[funcionarios]] = await pool.query(`
                SELECT COUNT(*) as total FROM rh_funcionarios WHERE status = 'ativo'
            `).catch(() => [[{ total: 0 }]]);

            // Próximos vencimentos (admissões a enviar)
            const [proximosEventos] = await pool.query(`
                SELECT 
                    f.id,
                    f.nome,
                    f.data_admissao,
                    'S-2200' as evento,
                    'Admissão pendente de envio' as descricao
                FROM rh_funcionarios f
                LEFT JOIN esocial_eventos e ON e.funcionario_id = f.id AND e.tipo_evento = 'S-2200'
                WHERE f.status = 'ativo' AND e.id IS NULL
                ORDER BY f.data_admissao DESC
                LIMIT 10
            `).catch(() => [[]]);

            res.json({
                success: true,
                data: {
                    resumo: {
                        pendentes: pendentes.total || 0,
                        enviados: enviados.total || 0,
                        erros: erros.total || 0,
                        funcionarios_ativos: funcionarios.total || 0
                    },
                    proximos_eventos: proximosEventos,
                    eventos_disponiveis: {
                        tabelas: Object.keys(EVENTOS_TABELAS).length,
                        nao_periodicos: Object.keys(EVENTOS_NAO_PERIODICOS).length,
                        periodicos: Object.keys(EVENTOS_PERIODICOS).length
                    }
                }
            });
        } catch (error) {
            console.error('[ESOCIAL] Erro no dashboard:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ============================================================
    // GESTÃO DE EVENTOS
    // ============================================================

    /**
     * GET /eventos - Listar eventos eSocial
     */
    router.get('/eventos', async (req, res) => {
        try {
            const { 
                status, 
                tipo_evento, 
                funcionario_id,
                page = 1, 
                limit = 20 
            } = req.query;
            const offset = (page - 1) * limit;

            let where = 'WHERE 1=1';
            const params = [];

            if (status) {
                where += ' AND e.status = ?';
                params.push(status);
            }
            if (tipo_evento) {
                where += ' AND e.tipo_evento = ?';
                params.push(tipo_evento);
            }
            if (funcionario_id) {
                where += ' AND e.funcionario_id = ?';
                params.push(funcionario_id);
            }

            const [eventos] = await pool.query(`
                SELECT 
                    e.*,
                    f.nome as funcionario_nome,
                    f.cpf as funcionario_cpf
                FROM esocial_eventos e
                LEFT JOIN rh_funcionarios f ON e.funcionario_id = f.id
                ${where}
                ORDER BY e.criado_em DESC
                LIMIT ? OFFSET ?
            `, [...params, parseInt(limit), offset]);

            const [[{ total }]] = await pool.query(
                `SELECT COUNT(*) as total FROM esocial_eventos e ${where}`,
                params
            );

            res.json({
                success: true,
                data: eventos,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('[ESOCIAL] Erro ao listar eventos:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * POST /eventos - Criar evento eSocial
     */
    router.post('/eventos', async (req, res) => {
        try {
            const { 
                tipo_evento, 
                funcionario_id, 
                dados_evento,
                periodo_apuracao
            } = req.body;

            if (!tipo_evento) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Tipo de evento obrigatório' 
                });
            }

            // Validar tipo de evento
            const todosEventos = { ...EVENTOS_TABELAS, ...EVENTOS_NAO_PERIODICOS, ...EVENTOS_PERIODICOS };
            if (!todosEventos[tipo_evento]) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Tipo de evento inválido' 
                });
            }

            const [result] = await pool.query(`
                INSERT INTO esocial_eventos (
                    tipo_evento, funcionario_id, periodo_apuracao, 
                    dados_evento, status, usuario_id
                ) VALUES (?, ?, ?, ?, 'pendente', ?)
            `, [
                tipo_evento, 
                funcionario_id || null, 
                periodo_apuracao || null,
                JSON.stringify(dados_evento || {}),
                req.user.id
            ]);

            res.json({
                success: true,
                message: 'Evento criado',
                data: { id: result.insertId, tipo_evento }
            });
        } catch (error) {
            console.error('[ESOCIAL] Erro ao criar evento:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * POST /eventos/:id/enviar - Enviar evento para eSocial
     */
    router.post('/eventos/:id/enviar', async (req, res) => {
        try {
            const { id } = req.params;

            const [[evento]] = await pool.query(
                'SELECT * FROM esocial_eventos WHERE id = ?',
                [id]
            );

            if (!evento) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Evento não encontrado' 
                });
            }

            if (evento.status === 'enviado') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Evento já foi enviado' 
                });
            }

            // Em produção: integrar com webservice eSocial
            // Simulação de envio bem-sucedido
            const protocolo = `ESO${Date.now()}`;

            await pool.query(`
                UPDATE esocial_eventos 
                SET status = 'enviado', 
                    protocolo = ?,
                    data_envio = NOW(),
                    updated_at = NOW()
                WHERE id = ?
            `, [protocolo, id]);

            res.json({
                success: true,
                message: 'Evento enviado com sucesso',
                data: { id, protocolo }
            });
        } catch (error) {
            console.error('[ESOCIAL] Erro ao enviar evento:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ============================================================
    // S-2200 - ADMISSÃO
    // ============================================================

    /**
     * POST /admissao - Gerar evento S-2200 (Admissão)
     */
    router.post('/admissao', async (req, res) => {
        try {
            const { funcionario_id } = req.body;

            const [[funcionario]] = await pool.query(`
                SELECT f.*, c.nome as cargo_nome, d.nome as departamento_nome
                FROM rh_funcionarios f
                LEFT JOIN rh_cargos c ON f.cargo_id = c.id
                LEFT JOIN rh_departamentos d ON f.departamento_id = d.id
                WHERE f.id = ?
            `, [funcionario_id]);

            if (!funcionario) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Funcionário não encontrado' 
                });
            }

            // Verificar se já existe evento de admissão
            const [[existente]] = await pool.query(
                'SELECT id FROM esocial_eventos WHERE funcionario_id = ? AND tipo_evento = "S-2200"',
                [funcionario_id]
            );

            if (existente) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Evento de admissão já existe para este funcionário',
                    evento_id: existente.id
                });
            }

            // Montar dados do evento S-2200
            const dadosEvento = {
                cpfTrab: funcionario.cpf?.replace(/\D/g, ''),
                nmTrab: funcionario.nome,
                sexo: funcionario.sexo || 'M',
                racaCor: funcionario.raca_cor || 1,
                estCiv: funcionario.estado_civil || 1,
                grauInstr: funcionario.grau_instrucao || '01',
                nmSoc: funcionario.nome_social || null,
                dtNascto: funcionario.data_nascimento,
                paisNascto: '105', // Brasil
                paisNac: '105',
                endereco: {
                    tpLograd: funcionario.tipo_logradouro || 'R',
                    dscLograd: funcionario.endereco,
                    nrLograd: funcionario.numero || 'S/N',
                    bairro: funcionario.bairro,
                    cep: funcionario.cep?.replace(/\D/g, ''),
                    codMunic: funcionario.codigo_municipio,
                    uf: funcionario.uf
                },
                vinculo: {
                    matricula: funcionario.matricula || funcionario.id.toString().padStart(6, '0'),
                    tpRegTrab: 1, // CLT
                    tpRegPrev: 1, // RGPS
                    dtAdm: funcionario.data_admissao,
                    tpAdmissao: 1, // Admissão
                    codCateg: funcionario.categoria_trabalhador || '101' // Empregado geral
                },
                cargo: {
                    codCargo: funcionario.cargo_id?.toString().padStart(5, '0'),
                    nmCargo: funcionario.cargo_nome
                },
                remuneracao: {
                    vrSalFx: funcionario.salario || 0,
                    undSalFixo: 5 // Mensal
                }
            };

            // Criar evento
            const [result] = await pool.query(`
                INSERT INTO esocial_eventos (
                    tipo_evento, funcionario_id, dados_evento, status, usuario_id
                ) VALUES ('S-2200', ?, ?, 'pendente', ?)
            `, [funcionario_id, JSON.stringify(dadosEvento), req.user.id]);

            res.json({
                success: true,
                message: 'Evento S-2200 (Admissão) criado',
                data: { 
                    evento_id: result.insertId, 
                    funcionario: funcionario.nome 
                }
            });
        } catch (error) {
            console.error('[ESOCIAL] Erro ao criar admissão:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ============================================================
    // S-2299 - DESLIGAMENTO
    // ============================================================

    /**
     * POST /desligamento - Gerar evento S-2299 (Desligamento)
     */
    router.post('/desligamento', async (req, res) => {
        try {
            const { 
                funcionario_id, 
                data_desligamento,
                motivo_desligamento,
                observacao
            } = req.body;

            if (!funcionario_id || !data_desligamento || !motivo_desligamento) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Funcionário, data e motivo são obrigatórios' 
                });
            }

            const [[funcionario]] = await pool.query(
                'SELECT * FROM rh_funcionarios WHERE id = ?',
                [funcionario_id]
            );

            if (!funcionario) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Funcionário não encontrado' 
                });
            }

            // Códigos de motivo eSocial
            const motivosDesligamento = {
                'demissao_sem_justa_causa': '01',
                'demissao_com_justa_causa': '02',
                'pedido_demissao': '03',
                'termino_contrato': '04',
                'aposentadoria': '05',
                'falecimento': '06',
                'acordo_comum': '33'
            };

            const codigoMotivo = motivosDesligamento[motivo_desligamento] || '01';

            const dadosEvento = {
                cpfTrab: funcionario.cpf?.replace(/\D/g, ''),
                matricula: funcionario.matricula || funcionario.id.toString().padStart(6, '0'),
                dtDeslig: data_desligamento,
                mtvDeslig: codigoMotivo,
                dtProjFimAPI: null, // Data projetada fim aviso prévio
                observacao: observacao
            };

            // Criar evento de desligamento
            const [result] = await pool.query(`
                INSERT INTO esocial_eventos (
                    tipo_evento, funcionario_id, dados_evento, status, usuario_id
                ) VALUES ('S-2299', ?, ?, 'pendente', ?)
            `, [funcionario_id, JSON.stringify(dadosEvento), req.user.id]);

            // Atualizar status do funcionário
            await pool.query(`
                UPDATE rh_funcionarios 
                SET status = 'desligado', 
                    data_desligamento = ?,
                    motivo_desligamento = ?
                WHERE id = ?
            `, [data_desligamento, motivo_desligamento, funcionario_id]);

            res.json({
                success: true,
                message: 'Evento S-2299 (Desligamento) criado',
                data: { 
                    evento_id: result.insertId, 
                    funcionario: funcionario.nome,
                    data_desligamento
                }
            });
        } catch (error) {
            console.error('[ESOCIAL] Erro ao criar desligamento:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ============================================================
    // S-1200 - REMUNERAÇÃO
    // ============================================================

    /**
     * POST /remuneracao - Gerar evento S-1200 (Remuneração)
     */
    router.post('/remuneracao', async (req, res) => {
        try {
            const { periodo_apuracao, funcionarios_ids } = req.body;

            if (!periodo_apuracao) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Período de apuração obrigatório (YYYY-MM)' 
                });
            }

            // Buscar funcionários ativos
            let where = 'WHERE f.status = "ativo"';
            const params = [];

            if (funcionarios_ids && funcionarios_ids.length > 0) {
                where += ` AND f.id IN (${funcionarios_ids.map(() => '?').join(',')})`;
                params.push(...funcionarios_ids);
            }

            const [funcionarios] = await pool.query(`
                SELECT f.*, c.nome as cargo_nome
                FROM rh_funcionarios f
                LEFT JOIN rh_cargos c ON f.cargo_id = c.id
                ${where}
            `, params);

            const eventosGerados = [];

            for (const func of funcionarios) {
                // Verificar se já existe evento para o período
                const [[existente]] = await pool.query(
                    'SELECT id FROM esocial_eventos WHERE funcionario_id = ? AND tipo_evento = "S-1200" AND periodo_apuracao = ?',
                    [func.id, periodo_apuracao]
                );

                if (existente) continue;

                const dadosEvento = {
                    cpfTrab: func.cpf?.replace(/\D/g, ''),
                    perApur: periodo_apuracao,
                    dmDev: [{
                        ideDmDev: '1',
                        codCateg: func.categoria_trabalhador || '101',
                        infoPerApur: {
                            ideEstab: {
                                tpInsc: 1,
                                nrInsc: process.env.CNPJ_EMPRESA?.replace(/\D/g, '')
                            },
                            remunPerApur: [{
                                matricula: func.matricula || func.id.toString().padStart(6, '0'),
                                itensRemun: [{
                                    codRubr: '1000', // Salário
                                    ideTabRubr: 'ALUFORCE',
                                    vrRubr: func.salario || 0
                                }]
                            }]
                        }
                    }]
                };

                const [result] = await pool.query(`
                    INSERT INTO esocial_eventos (
                        tipo_evento, funcionario_id, periodo_apuracao, dados_evento, status, usuario_id
                    ) VALUES ('S-1200', ?, ?, ?, 'pendente', ?)
                `, [func.id, periodo_apuracao, JSON.stringify(dadosEvento), req.user.id]);

                eventosGerados.push({
                    evento_id: result.insertId,
                    funcionario: func.nome
                });
            }

            res.json({
                success: true,
                message: `${eventosGerados.length} evento(s) S-1200 criado(s)`,
                data: eventosGerados
            });
        } catch (error) {
            console.error('[ESOCIAL] Erro ao criar remuneração:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ============================================================
    // TIPOS DE EVENTOS
    // ============================================================

    /**
     * GET /tipos-eventos - Listar tipos de eventos disponíveis
     */
    router.get('/tipos-eventos', (req, res) => {
        res.json({
            success: true,
            data: {
                tabelas: EVENTOS_TABELAS,
                nao_periodicos: EVENTOS_NAO_PERIODICOS,
                periodicos: EVENTOS_PERIODICOS
            }
        });
    });

    // ============================================================
    // RUBRICAS (S-1010)
    // ============================================================

    /**
     * GET /rubricas - Listar rubricas cadastradas
     */
    router.get('/rubricas', async (req, res) => {
        try {
            const [rubricas] = await pool.query(`
                SELECT * FROM esocial_rubricas ORDER BY codigo
            `);

            res.json({ success: true, data: rubricas });
        } catch (error) {
            console.error('[ESOCIAL] Erro ao listar rubricas:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * POST /rubricas - Cadastrar rubrica
     */
    router.post('/rubricas', async (req, res) => {
        try {
            const { 
                codigo, 
                descricao, 
                natureza,
                tipo_rubrica,
                incidencia_previdencia,
                incidencia_irrf,
                incidencia_fgts
            } = req.body;

            if (!codigo || !descricao) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Código e descrição são obrigatórios' 
                });
            }

            const [result] = await pool.query(`
                INSERT INTO esocial_rubricas (
                    codigo, descricao, natureza, tipo_rubrica,
                    incidencia_previdencia, incidencia_irrf, incidencia_fgts
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                codigo, descricao, natureza || '1000', tipo_rubrica || 1,
                incidencia_previdencia || 11, incidencia_irrf || 11, incidencia_fgts || 11
            ]);

            res.json({
                success: true,
                message: 'Rubrica cadastrada',
                data: { id: result.insertId }
            });
        } catch (error) {
            console.error('[ESOCIAL] Erro ao cadastrar rubrica:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    return router;
};
