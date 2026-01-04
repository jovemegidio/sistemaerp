/**
 * API de Gerenciamento de Permissões
 * Sistema unificação de controle de acesso
 * @author Aluforce ERP
 * @version 1.0.0
 */

const express = require('express');

module.exports = function({ pool, authenticateToken }) {
    const router = express.Router();

    // Aplicar autenticação em todas as rotas
    router.use(authenticateToken);

    // ==================== MIDDLEWARE DE PERMISSÃO ====================
    
    /**
     * Middleware para verificar permissão específica
     * @param {string} modulo - Nome do módulo (vendas, compras, etc)
     * @param {string} acao - Ação requerida (visualizar, criar, editar, etc)
     */
    const verificarPermissao = (modulo, acao) => {
        return async (req, res, next) => {
            try {
                const userId = req.user.id;
                
                // Admins têm acesso total
                if (req.user.is_admin === 1 || req.user.role === 'admin') {
                    return next();
                }
                
                // Buscar permissões do usuário
                const [rows] = await pool.query(`
                    SELECT 
                        u.is_admin,
                        u.role,
                        u.permissoes_custom,
                        u.areas_bloqueadas,
                        p.permissoes as perfil_permissoes,
                        p.nivel
                    FROM usuarios u
                    LEFT JOIN perfis_permissao p ON u.perfil_id = p.id
                    WHERE u.id = 
                `, [userId]);
                
                if (rows.length === 0) {
                    return res.status(403).json({ 
                        success: false, 
                        message: 'Usuário não encontração' 
                    });
                }
                
                const usuario = rows[0];
                
                // Verificar áreas bloqueadas
                const bloqueadas = usuario.areas_bloqueadas  JSON.parse(usuario.areas_bloqueadas) : [];
                if (bloqueadas.includes(modulo)) {
                    return res.status(403).json({ 
                        success: false, 
                        message: `Acesso ao módulo ${modulo} está bloqueação para seu usuário` 
                    });
                }
                
                // Primeiro verificar permissões customizadas
                const customPermissoes = usuario.permissoes_custom  JSON.parse(usuario.permissoes_custom) : null;
                if (customPermissoes && customPermissoes[modulo]) {
                    if (customPermissoes[modulo].includes(acao)) {
                        return next();
                    }
                }
                
                // Verificar permissões do perfil
                const perfilPermissoes = usuario.perfil_permissoes  JSON.parse(usuario.perfil_permissoes) : {};
                if (perfilPermissoes[modulo] && perfilPermissoes[modulo].includes(acao)) {
                    return next();
                }
                
                // Sem permissão
                return res.status(403).json({ 
                    success: false, 
                    message: `Você não tem permissão para ${acao} em ${modulo}` 
                });
                
            } catch (error) {
                console.error('[PERMISSÕES] Erro ao verificar:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Erro ao verificar permissões' 
                });
            }
        };
    };

    // Exportar middleware para uso em outras rotas
    router.verificarPermissao = verificarPermissao;

    // ==================== ROTAS DE PERFIS ====================
    
    /**
     * GET /perfis - Listar todos os perfis
     */
    router.get('/perfis', async (req, res) => {
        try {
            // Verificar se é admin
            if (req.user.is_admin !== 1 && req.user.role !== 'admin') {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Apenas administraçãores podem gerenciar perfis' 
                });
            }
            
            const [perfis] = await pool.query(`
                SELECT 
                    p.*,
                    COUNT(u.id) as total_usuarios
                FROM perfis_permissao p
                LEFT JOIN usuarios u ON u.perfil_id = p.id
                WHERE p.ativo = TRUE
                GROUP BY p.id
                ORDER BY p.nivel DESC
            `);
            
            res.json({ 
                success: true, 
                data: perfis.map(p => ({
                    ...p,
                    permissoes: JSON.parse(p.permissoes || '{}')
                }))
            });
        } catch (error) {
            console.error('[PERMISSÕES] Erro ao listar perfis:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * GET /perfis/:id - Obter perfil específico
     */
    router.get('/perfis/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            const [[perfil]] = await pool.query(`
                SELECT * FROM perfis_permissao WHERE id = 
            `, [id]);
            
            if (!perfil) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Perfil não encontração' 
                });
            }
            
            res.json({ 
                success: true, 
                data: {
                    ...perfil,
                    permissoes: JSON.parse(perfil.permissoes || '{}')
                }
            });
        } catch (error) {
            console.error('[PERMISSÕES] Erro ao buscar perfil:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * POST /perfis - Criar novo perfil
     */
    router.post('/perfis', async (req, res) => {
        try {
            if (req.user.is_admin !== 1 && req.user.role !== 'admin') {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Apenas administraçãores podem criar perfis' 
                });
            }
            
            const { nome, descricao, nivel, permissoes } = req.body;
            
            if (!nome || !permissoes) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Nome e permissões são obrigatórios' 
                });
            }
            
            const [result] = await pool.query(`
                INSERT INTO perfis_permissao (nome, descricao, nivel, permissoes)
                VALUES (, , , )
            `, [nome, descricao || '', nivel || 0, JSON.stringify(permissoes)]);
            
            res.status(201).json({ 
                success: true, 
                message: 'Perfil criação com sucesso',
                data: { id: result.insertId }
            });
        } catch (error) {
            console.error('[PERMISSÕES] Erro ao criar perfil:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Já existe um perfil com este nome' 
                });
            }
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * PUT /perfis/:id - Atualizar perfil
     */
    router.put('/perfis/:id', async (req, res) => {
        try {
            if (req.user.is_admin !== 1 && req.user.role !== 'admin') {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Apenas administraçãores podem editar perfis' 
                });
            }
            
            const { id } = req.params;
            const { nome, descricao, nivel, permissoes, ativo } = req.body;
            
            // Não permitir editar perfil admin
            const [[perfilAtual]] = await pool.query(`
                SELECT nome FROM perfis_permissao WHERE id = 
            `, [id]);
            
            if (perfilAtual.nome === 'admin' && nome !== 'admin') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Não é possível renomear o perfil de administraçãor' 
                });
            }
            
            await pool.query(`
                UPDATE perfis_permissao 
                SET nome = COALESCE(, nome),
                    descricao = COALESCE(, descricao),
                    nivel = COALESCE(, nivel),
                    permissoes = COALESCE(, permissoes),
                    ativo = COALESCE(, ativo)
                WHERE id = 
            `, [nome, descricao, nivel, permissoes  JSON.stringify(permissoes) : null, ativo, id]);
            
            res.json({ 
                success: true, 
                message: 'Perfil atualização com sucesso' 
            });
        } catch (error) {
            console.error('[PERMISSÕES] Erro ao atualizar perfil:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ==================== ROTAS DE USUÁRIOS/PERMISSÕES ====================
    
    /**
     * GET /usuarios/:id/permissoes - Obter permissões de um usuário
     */
    router.get('/usuarios/:id/permissoes', async (req, res) => {
        try {
            const { id } = req.params;
            
            // Usuário pode ver suas próprias permissões, admin pode ver de qualquer um
            if (req.user.id != id && req.user.is_admin !== 1 && req.user.role !== 'admin') {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Sem permissão para visualizar' 
                });
            }
            
            const [[usuario]] = await pool.query(`
                SELECT 
                    u.id,
                    u.nome,
                    u.email,
                    u.is_admin,
                    u.role,
                    u.perfil_id,
                    p.nome as perfil_nome,
                    p.nivel as perfil_nivel,
                    p.permissoes as perfil_permissoes,
                    u.permissoes_custom,
                    u.areas_bloqueadas
                FROM usuarios u
                LEFT JOIN perfis_permissao p ON u.perfil_id = p.id
                WHERE u.id = 
            `, [id]);
            
            if (!usuario) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Usuário não encontração' 
                });
            }
            
            // Calcular permissões efetivas (perfil + custom)
            const perfilPermissoes = usuario.perfil_permissoes  JSON.parse(usuario.perfil_permissoes) : {};
            const customPermissoes = usuario.permissoes_custom  JSON.parse(usuario.permissoes_custom) : {};
            const bloqueadas = usuario.areas_bloqueadas  JSON.parse(usuario.areas_bloqueadas) : [];
            
            // Merge permissões
            const permissoesEfetivas = { ...perfilPermissoes };
            for (const [modulo, acoes] of Object.entries(customPermissoes)) {
                if (!bloqueadas.includes(modulo)) {
                    permissoesEfetivas[modulo] = [...new Set([
                        ...(permissoesEfetivas[modulo] || []),
                        ...acoes
                    ])];
                }
            }
            
            // Remover módulos bloqueaçãos
            for (const modulo of bloqueadas) {
                delete permissoesEfetivas[modulo];
            }
            
            res.json({ 
                success: true, 
                data: {
                    usuario: {
                        id: usuario.id,
                        nome: usuario.nome,
                        email: usuario.email,
                        is_admin: usuario.is_admin,
                        role: usuario.role
                    },
                    perfil: {
                        id: usuario.perfil_id,
                        nome: usuario.perfil_nome,
                        nivel: usuario.perfil_nivel
                    },
                    permissoes_perfil: perfilPermissoes,
                    permissoes_custom: customPermissoes,
                    areas_bloqueadas: bloqueadas,
                    permissoes_efetivas: permissoesEfetivas
                }
            });
        } catch (error) {
            console.error('[PERMISSÕES] Erro ao buscar permissões:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * PUT /usuarios/:id/perfil - Alterar perfil do usuário
     */
    router.put('/usuarios/:id/perfil', async (req, res) => {
        try {
            if (req.user.is_admin !== 1 && req.user.role !== 'admin') {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Apenas administraçãores podem alterar perfis' 
                });
            }
            
            const { id } = req.params;
            const { perfil_id } = req.body;
            
            // Verificar se perfil existe
            if (perfil_id) {
                const [[perfil]] = await pool.query(`
                    SELECT id FROM perfis_permissao WHERE id =  AND ativo = TRUE
                `, [perfil_id]);
                
                if (!perfil) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Perfil não encontração' 
                    });
                }
            }
            
            await pool.query(`
                UPDATE usuarios SET perfil_id =  WHERE id = 
            `, [perfil_id, id]);
            
            // Log de auditoria
            await pool.query(`
                INSERT INTO logs_auditoria (usuario_id, usuario_nome, acao, modulo, entidade_tipo, entidade_id, descricao)
                VALUES (, , 'ALTERAR_PERFIL', 'sistema', 'usuario', , )
            `, [req.user.id, req.user.nome, id, `Perfil alteração para ID ${perfil_id}`]).catch(() => {});
            
            res.json({ 
                success: true, 
                message: 'Perfil do usuário atualização' 
            });
        } catch (error) {
            console.error('[PERMISSÕES] Erro ao alterar perfil:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * PUT /usuarios/:id/permissoes-custom - Definir permissões customizadas
     */
    router.put('/usuarios/:id/permissoes-custom', async (req, res) => {
        try {
            if (req.user.is_admin !== 1 && req.user.role !== 'admin') {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Apenas administraçãores podem alterar permissões' 
                });
            }
            
            const { id } = req.params;
            const { permissoes_custom, areas_bloqueadas } = req.body;
            
            const updates = [];
            const values = [];
            
            if (permissoes_custom !== undefined) {
                updates.push('permissoes_custom = ');
                values.push(JSON.stringify(permissoes_custom));
            }
            
            if (areas_bloqueadas !== undefined) {
                updates.push('areas_bloqueadas = ');
                values.push(JSON.stringify(areas_bloqueadas));
            }
            
            if (updates.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Nenhuma alteração enviada' 
                });
            }
            
            values.push(id);
            await pool.query(`
                UPDATE usuarios SET ${updates.join(', ')} WHERE id = 
            `, values);
            
            res.json({ 
                success: true, 
                message: 'Permissões customizadas atualizadas' 
            });
        } catch (error) {
            console.error('[PERMISSÕES] Erro ao definir permissões custom:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ==================== ROTAS DE VERIFICAÇÃO ====================
    
    /**
     * GET /verificar/:modulo/:acao - Verificar se usuário tem permissão
     */
    router.get('/verificar/:modulo/:acao', async (req, res) => {
        try {
            const { modulo, acao } = req.params;
            const userId = req.user.id;
            
            // Admins têm acesso total
            if (req.user.is_admin === 1 || req.user.role === 'admin') {
                return res.json({ 
                    success: true, 
                    permitido: true,
                    motivo: 'Usuário administraçãor' 
                });
            }
            
            const [[usuario]] = await pool.query(`
                SELECT 
                    u.permissoes_custom,
                    u.areas_bloqueadas,
                    p.permissoes as perfil_permissoes
                FROM usuarios u
                LEFT JOIN perfis_permissao p ON u.perfil_id = p.id
                WHERE u.id = 
            `, [userId]);
            
            if (!usuario) {
                return res.json({ 
                    success: true, 
                    permitido: false,
                    motivo: 'Usuário não encontração' 
                });
            }
            
            // Verificar áreas bloqueadas
            const bloqueadas = usuario.areas_bloqueadas  JSON.parse(usuario.areas_bloqueadas) : [];
            if (bloqueadas.includes(modulo)) {
                return res.json({ 
                    success: true, 
                    permitido: false,
                    motivo: 'Módulo bloqueação para este usuário' 
                });
            }
            
            // Verificar permissões customizadas
            const customPermissoes = usuario.permissoes_custom  JSON.parse(usuario.permissoes_custom) : {};
            if (customPermissoes[modulo].includes(acao)) {
                return res.json({ 
                    success: true, 
                    permitido: true,
                    motivo: 'Permissão customizada' 
                });
            }
            
            // Verificar permissões do perfil
            const perfilPermissoes = usuario.perfil_permissoes  JSON.parse(usuario.perfil_permissoes) : {};
            if (perfilPermissoes[modulo].includes(acao)) {
                return res.json({ 
                    success: true, 
                    permitido: true,
                    motivo: 'Permissão do perfil' 
                });
            }
            
            return res.json({ 
                success: true, 
                permitido: false,
                motivo: 'Sem permissão para esta ação' 
            });
            
        } catch (error) {
            console.error('[PERMISSÕES] Erro ao verificar:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * GET /minhas-permissoes - Obter permissões do usuário logação
     */
    router.get('/minhas-permissoes', async (req, res) => {
        try {
            const userId = req.user.id;
            
            // Admin tem tudo
            if (req.user.is_admin === 1 || req.user.role === 'admin') {
                return res.json({
                    success: true,
                    is_admin: true,
                    perfil: 'admin',
                    permissoes: {
                        vendas: ['visualizar', 'criar', 'editar', 'excluir', 'aprovar', 'faturar', 'relatorios'],
                        compras: ['visualizar', 'criar', 'editar', 'excluir', 'aprovar', 'relatorios'],
                        financeiro: ['visualizar', 'criar', 'editar', 'excluir', 'pagar', 'receber', 'conciliar', 'relatorios'],
                        pcp: ['visualizar', 'criar', 'editar', 'excluir', 'aprovar', 'finalizar', 'relatorios'],
                        rh: ['visualizar', 'criar', 'editar', 'excluir', 'aprovar', 'relatorios', 'folha'],
                        nfe: ['visualizar', 'criar', 'editar', 'excluir', 'emitir', 'cancelar', 'relatorios'],
                        estoque: ['visualizar', 'criar', 'editar', 'excluir', 'movimentar', 'inventario', 'relatorios'],
                        sistema: ['configurar', 'usuarios', 'backup', 'auditoria']
                    }
                });
            }
            
            const [[usuario]] = await pool.query(`
                SELECT 
                    u.permissoes_custom,
                    u.areas_bloqueadas,
                    p.nome as perfil_nome,
                    p.permissoes as perfil_permissoes
                FROM usuarios u
                LEFT JOIN perfis_permissao p ON u.perfil_id = p.id
                WHERE u.id = 
            `, [userId]);
            
            const perfilPermissoes = usuario.perfil_permissoes  JSON.parse(usuario.perfil_permissoes) : {};
            const customPermissoes = usuario.permissoes_custom  JSON.parse(usuario.permissoes_custom) : {};
            const bloqueadas = usuario.areas_bloqueadas  JSON.parse(usuario.areas_bloqueadas) : [];
            
            // Merge e calcular permissões efetivas
            const permissoesEfetivas = { ...perfilPermissoes };
            for (const [modulo, acoes] of Object.entries(customPermissoes)) {
                permissoesEfetivas[modulo] = [...new Set([
                    ...(permissoesEfetivas[modulo] || []),
                    ...acoes
                ])];
            }
            
            // Remover módulos bloqueaçãos
            for (const modulo of bloqueadas) {
                delete permissoesEfetivas[modulo];
            }
            
            res.json({
                success: true,
                is_admin: false,
                perfil: usuario.perfil_nome || 'sem_perfil',
                permissoes: permissoesEfetivas,
                areas_bloqueadas: bloqueadas
            });
            
        } catch (error) {
            console.error('[PERMISSÕES] Erro ao buscar permissões:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // ==================== CONSTANTES DE MÓDULOS E AÇÕES ====================
    
    /**
     * GET /modulos - Listar módulos e ações disponíveis
     */
    router.get('/modulos', (req, res) => {
        const modulos = {
            vendas: {
                nome: 'Vendas',
                acoes: ['visualizar', 'criar', 'editar', 'excluir', 'aprovar', 'faturar', 'relatorios']
            },
            compras: {
                nome: 'Compras',
                acoes: ['visualizar', 'criar', 'editar', 'excluir', 'aprovar', 'relatorios']
            },
            financeiro: {
                nome: 'Financeiro',
                acoes: ['visualizar', 'criar', 'editar', 'excluir', 'pagar', 'receber', 'conciliar', 'relatorios']
            },
            pcp: {
                nome: 'PCP / Produção',
                acoes: ['visualizar', 'criar', 'editar', 'excluir', 'aprovar', 'finalizar', 'relatorios']
            },
            rh: {
                nome: 'Recursos Humanos',
                acoes: ['visualizar', 'criar', 'editar', 'excluir', 'aprovar', 'relatorios', 'folha', 'visualizar_proprio']
            },
            nfe: {
                nome: 'NF-e / Logística',
                acoes: ['visualizar', 'criar', 'editar', 'excluir', 'emitir', 'cancelar', 'relatorios']
            },
            estoque: {
                nome: 'Estoque',
                acoes: ['visualizar', 'criar', 'editar', 'excluir', 'movimentar', 'inventario', 'relatorios']
            },
            sistema: {
                nome: 'Sistema',
                acoes: ['configurar', 'usuarios', 'backup', 'auditoria']
            }
        };
        
        res.json({ success: true, data: modulos });
    });

    return router;
};
