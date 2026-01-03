/**
 * Sistema de Backup Automático
 * Backup do banco de dados MySQL
 * @author Aluforce ERP
 * @version 1.0.0
 */

const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');
const execPromise = util.promisify(exec);

module.exports = function({ pool, authenticateToken }) {
    const router = express.Router();
    router.use(authenticateToken);

    // Diretório de backups
    const BACKUP_DIR = path.join(__dirname, '../backups');
    const MYSQL_PATH = process.env.MYSQL_BIN_PATH || 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin';

    // Configurações do banco
    const DB_CONFIG = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '@dminalu',
        database: process.env.DB_NAME || 'aluforce_vendas',
        port: process.env.DB_PORT || 3306
    };

    // Criar diretório de backups se não existir
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    /**
     * Verificar se é admin
     */
    const requireAdmin = (req, res, next) => {
        if (req.user.is_admin !== 1 && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Apenas administradores podem gerenciar backups' 
            });
        }
        next();
    };

    /**
     * GET /listar - Listar backups existentes
     */
    router.get('/listar', requireAdmin, async (req, res) => {
        try {
            const files = fs.readdirSync(BACKUP_DIR)
                .filter(f => f.endsWith('.sql') || f.endsWith('.sql.gz'))
                .map(filename => {
                    const filepath = path.join(BACKUP_DIR, filename);
                    const stats = fs.statSync(filepath);
                    return {
                        nome: filename,
                        tamanho: stats.size,
                        tamanho_formatado: formatBytes(stats.size),
                        criado_em: stats.birthtime,
                        modificado_em: stats.mtime
                    };
                })
                .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
            
            res.json({ 
                success: true, 
                data: files,
                diretorio: BACKUP_DIR
            });
        } catch (error) {
            console.error('[BACKUP] Erro ao listar:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * POST /criar - Criar backup manual
     */
    router.post('/criar', requireAdmin, async (req, res) => {
        try {
            const { compactar = false, descricao = '' } = req.body;
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `backup_${DB_CONFIG.database}_${timestamp}.sql`;
            const filepath = path.join(BACKUP_DIR, filename);
            
            // Comando mysqldump
            const mysqldump = path.join(MYSQL_PATH, 'mysqldump.exe');
            const cmd = `"${mysqldump}" -h ${DB_CONFIG.host} -P ${DB_CONFIG.port} -u ${DB_CONFIG.user} -p${DB_CONFIG.password} --single-transaction --routines --triggers --events ${DB_CONFIG.database} > "${filepath}"`;
            
            console.log('[BACKUP] Iniciando backup...');
            
            await execPromise(cmd, { windowsHide: true });
            
            // Verificar se o arquivo foi criado
            if (!fs.existsSync(filepath)) {
                throw new Error('Arquivo de backup não foi criado');
            }
            
            const stats = fs.statSync(filepath);
            
            // Registrar no banco
            await pool.query(`
                INSERT INTO backups_log (arquivo, tamanho, descricao, usuario_id, status)
                VALUES (?, ?, ?, ?, 'sucesso')
            `, [filename, stats.size, descricao, req.user.id]).catch(() => {});
            
            // Log de auditoria
            await pool.query(`
                INSERT INTO logs_auditoria (usuario_id, usuario_nome, acao, modulo, entidade_tipo, descricao)
                VALUES (?, ?, 'BACKUP_CRIAR', 'sistema', 'backup', ?)
            `, [req.user.id, req.user.nome, `Backup criado: ${filename}`]).catch(() => {});
            
            res.json({
                success: true,
                message: 'Backup criado com sucesso',
                data: {
                    arquivo: filename,
                    tamanho: formatBytes(stats.size),
                    caminho: filepath
                }
            });
        } catch (error) {
            console.error('[BACKUP] Erro ao criar:', error);
            
            // Registrar falha
            await pool.query(`
                INSERT INTO backups_log (descricao, usuario_id, status, erro)
                VALUES ('Tentativa de backup manual', ?, 'falha', ?)
            `, [req.user.id, error.message]).catch(() => {});
            
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * GET /download/:arquivo - Download de backup
     */
    router.get('/download/:arquivo', requireAdmin, (req, res) => {
        try {
            const { arquivo } = req.params;
            const filepath = path.join(BACKUP_DIR, arquivo);
            
            // Validar que o arquivo está no diretório de backups (segurança)
            if (!filepath.startsWith(BACKUP_DIR)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Caminho inválido' 
                });
            }
            
            if (!fs.existsSync(filepath)) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Arquivo não encontrado' 
                });
            }
            
            res.download(filepath, arquivo);
        } catch (error) {
            console.error('[BACKUP] Erro ao download:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * DELETE /excluir/:arquivo - Excluir backup
     */
    router.delete('/excluir/:arquivo', requireAdmin, async (req, res) => {
        try {
            const { arquivo } = req.params;
            const filepath = path.join(BACKUP_DIR, arquivo);
            
            // Validar segurança
            if (!filepath.startsWith(BACKUP_DIR)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Caminho inválido' 
                });
            }
            
            if (!fs.existsSync(filepath)) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Arquivo não encontrado' 
                });
            }
            
            fs.unlinkSync(filepath);
            
            // Log de auditoria
            await pool.query(`
                INSERT INTO logs_auditoria (usuario_id, usuario_nome, acao, modulo, entidade_tipo, descricao)
                VALUES (?, ?, 'BACKUP_EXCLUIR', 'sistema', 'backup', ?)
            `, [req.user.id, req.user.nome, `Backup excluído: ${arquivo}`]).catch(() => {});
            
            res.json({ 
                success: true, 
                message: 'Backup excluído' 
            });
        } catch (error) {
            console.error('[BACKUP] Erro ao excluir:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * POST /restaurar/:arquivo - Restaurar backup (CUIDADO!)
     */
    router.post('/restaurar/:arquivo', requireAdmin, async (req, res) => {
        try {
            const { arquivo } = req.params;
            const { confirmar } = req.body;
            
            if (confirmar !== 'RESTAURAR') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Confirmação inválida. Envie { confirmar: "RESTAURAR" }' 
                });
            }
            
            const filepath = path.join(BACKUP_DIR, arquivo);
            
            if (!fs.existsSync(filepath)) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Arquivo não encontrado' 
                });
            }
            
            // Criar backup antes de restaurar
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const backupAntes = `backup_antes_restauracao_${timestamp}.sql`;
            const backupAntesPath = path.join(BACKUP_DIR, backupAntes);
            
            const mysqldump = path.join(MYSQL_PATH, 'mysqldump.exe');
            const mysql = path.join(MYSQL_PATH, 'mysql.exe');
            
            // Backup de segurança
            await execPromise(
                `"${mysqldump}" -h ${DB_CONFIG.host} -P ${DB_CONFIG.port} -u ${DB_CONFIG.user} -p${DB_CONFIG.password} ${DB_CONFIG.database} > "${backupAntesPath}"`,
                { windowsHide: true }
            );
            
            // Restaurar
            await execPromise(
                `"${mysql}" -h ${DB_CONFIG.host} -P ${DB_CONFIG.port} -u ${DB_CONFIG.user} -p${DB_CONFIG.password} ${DB_CONFIG.database} < "${filepath}"`,
                { windowsHide: true }
            );
            
            // Log de auditoria (no novo banco restaurado)
            await pool.query(`
                INSERT INTO logs_auditoria (usuario_id, usuario_nome, acao, modulo, entidade_tipo, descricao)
                VALUES (?, ?, 'BACKUP_RESTAURAR', 'sistema', 'backup', ?)
            `, [req.user.id, req.user.nome, `Banco restaurado de: ${arquivo}. Backup anterior: ${backupAntes}`]).catch(() => {});
            
            res.json({
                success: true,
                message: 'Backup restaurado com sucesso',
                data: {
                    restaurado_de: arquivo,
                    backup_seguranca: backupAntes
                }
            });
        } catch (error) {
            console.error('[BACKUP] Erro ao restaurar:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * GET /configuracao - Obter configuração de backup automático
     */
    router.get('/configuracao', requireAdmin, async (req, res) => {
        try {
            const [[config]] = await pool.query(`
                SELECT * FROM configuracoes_sistema WHERE chave = 'backup_automatico'
            `);
            
            const configuracao = config?.valor ? JSON.parse(config.valor) : {
                ativo: false,
                horario: '03:00',
                dias_semana: [0, 1, 2, 3, 4, 5, 6],
                manter_dias: 30,
                notificar_email: ''
            };
            
            res.json({ success: true, data: configuracao });
        } catch (error) {
            console.error('[BACKUP] Erro ao obter config:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * PUT /configuracao - Salvar configuração de backup automático
     */
    router.put('/configuracao', requireAdmin, async (req, res) => {
        try {
            const { ativo, horario, dias_semana, manter_dias, notificar_email } = req.body;
            
            const configuracao = {
                ativo: ativo || false,
                horario: horario || '03:00',
                dias_semana: dias_semana || [0, 1, 2, 3, 4, 5, 6],
                manter_dias: manter_dias || 30,
                notificar_email: notificar_email || ''
            };
            
            await pool.query(`
                INSERT INTO configuracoes_sistema (chave, valor, atualizado_em)
                VALUES ('backup_automatico', ?, NOW())
                ON DUPLICATE KEY UPDATE valor = ?, atualizado_em = NOW()
            `, [JSON.stringify(configuracao), JSON.stringify(configuracao)]);
            
            res.json({ 
                success: true, 
                message: 'Configuração salva',
                data: configuracao
            });
        } catch (error) {
            console.error('[BACKUP] Erro ao salvar config:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * GET /historico - Histórico de backups
     */
    router.get('/historico', requireAdmin, async (req, res) => {
        try {
            const [historico] = await pool.query(`
                SELECT 
                    bl.*,
                    u.nome as usuario_nome
                FROM backups_log bl
                LEFT JOIN usuarios u ON bl.usuario_id = u.id
                ORDER BY bl.criado_em DESC
                LIMIT 50
            `);
            
            res.json({ success: true, data: historico });
        } catch (error) {
            console.error('[BACKUP] Erro ao buscar histórico:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * POST /limpar-antigos - Limpar backups antigos
     */
    router.post('/limpar-antigos', requireAdmin, async (req, res) => {
        try {
            const { dias = 30 } = req.body;
            const dataLimite = new Date();
            dataLimite.setDate(dataLimite.getDate() - dias);
            
            const files = fs.readdirSync(BACKUP_DIR)
                .filter(f => f.endsWith('.sql') || f.endsWith('.sql.gz'));
            
            let excluidos = 0;
            
            for (const filename of files) {
                const filepath = path.join(BACKUP_DIR, filename);
                const stats = fs.statSync(filepath);
                
                if (stats.birthtime < dataLimite) {
                    fs.unlinkSync(filepath);
                    excluidos++;
                }
            }
            
            res.json({ 
                success: true, 
                message: `${excluidos} backup(s) excluído(s)`,
                data: { excluidos }
            });
        } catch (error) {
            console.error('[BACKUP] Erro ao limpar:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    /**
     * Formatar bytes para exibição
     */
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    return router;
};
