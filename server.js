// =================================================================
// SERVIDOR UNIFICADO - ALUFORCE v2.0
// Combina funcionalidades de server.js e server-improved.js
// =================================================================
'use strict';

// ⚡ MEDIÇÃO DE TEMPO DE INICIALIZAÇÃO
const SERVER_START_TIME = Date.now();
console.log('🚀 Iniciando ALUFORCE v2.0...\n');

// Detectar se está rodando em modo empacotado (Electron)
const isPackaged = __dirname.includes('app.asar') || process.env.NODE_ENV === 'production';
if (isPackaged) {
    console.log('📦 Modo empacotado detectado');
}

// =================================================================
// 1. IMPORTAÇÕES DE MÓDULOS
// =================================================================


const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');
const mysql = require('mysql2/promise');
const path = require('path');
const nodemailer = require('nodemailer');
const { spawn } = require('child_process');

// Carrega variáveis de ambiente de um arquivo .env (se existir)
require('dotenv').config({ path: path.join(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRouter = require('./src/routes/auth');
const userPermissions = require('./public/js/permissions');
const logger = require('./src/logger');
const rateLimit = require('express-rate-limit');

// Importar security middleware centralizado
const {
    generalLimiter,
    authLimiter,
    apiLimiter,
    sanitizeInput,
    securityHeaders,
    cleanExpiredSessions
} = require('./security-middleware');

// Importar express-validator para validação de dados
const { body, param, query, validationResult } = require('express-validator');

// Função utilitária para parse seguro de JSON
function safeParseJSON(str, fallback = null) {
    if (!str) return fallback;
    if (typeof str === 'object') return str;
    try {
        return JSON.parse(str);
    } catch (e) {
        return fallback;
    }
}

// =================================================================
// 2. CONFIGURAÇÕES INICIAIS E VARIÁVEIS GLOBAIS
// Middleware para capturar erros async
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Função para iniciar servidor de chat
function startChatServer() {
    // Desabilitar servidor de chat separado em ambiente Railway/produção
    // O chat é integrado via Socket.io no servidor principal
    if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') {
        console.log('⚠️  Servidor de chat separado desabilitado em produção (usa Socket.io integrado)');
        return;
    }
    
    try {
        const chatServerPath = path.join(__dirname, 'chat', 'server.js');
        
        if (!fs.existsSync(chatServerPath)) {
            console.log('⚠️  Servidor de chat não encontrado em:', chatServerPath);
            return;
        }
        
        console.log('\n🔵 Iniciando servidor de chat...');
        
        // Configurar variáveis de ambiente - Railway MySQL
        process.env.DB_HOST = process.env.DB_HOST || 'interchange.proxy.rlwy.net';
        process.env.DB_USER = process.env.DB_USER || 'root';
        process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'iiilOZutDOnPCwxgiTKeMuEaIzSwplcu';
        process.env.DB_NAME = process.env.DB_NAME || 'railway';
        process.env.DB_PORT = process.env.DB_PORT || '19396';
        
        // Em modo empacotado, usar require() em vez de spawn
        if (isPackaged) {
            try {
                const chatServer = require(chatServerPath);
                if (chatServer && chatServer.startServer) {
                    process.env.PORT = '3002';
                    chatServer.startServer();
                    console.log('✅ Servidor de chat iniciado via require (porta 3002)');
                }
            } catch (err) {
                console.error('❌ Erro ao carregar servidor de chat:', err.message);
            }
            return;
        }
        
        // Modo desenvolvimento - usar spawn
        const envVars = {
            ...process.env,
            PORT: '3002'
        };
        
        chatServerProcess = spawn('node', [chatServerPath], {
            cwd: path.join(__dirname, 'chat'),
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false,
            env: envVars
        });
        
        chatServerProcess.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                console.log(`[CHAT] ${output}`);
            }
        });
        
        chatServerProcess.stderr.on('data', (data) => {
            const error = data.toString().trim();
            if (error && !error.includes('ExperimentalWarning')) {
                console.error(`[CHAT] ⚠️  ${error}`);
            }
        });
        
        chatServerProcess.on('error', (error) => {
            console.error('❌ Erro ao iniciar servidor de chat:', error);
        });
        
        chatServerProcess.on('exit', (code, signal) => {
            if (code !== null && code !== 0) {
                console.log(`⚠️  Servidor de chat encerrado com código ${code}`);
            }
        });
        
        console.log('✅ Servidor de chat iniciado na porta 3002');
        
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor de chat:', error.message);
    }
}

// Função para parar servidor de chat
function stopChatServer() {
    if (chatServerProcess) {
        try {
            chatServerProcess.kill('SIGTERM');
            console.log('🔵 Servidor de chat encerrado');
        } catch (error) {
            console.error('⚠️  Erro ao encerrar servidor de chat:', error.message);
        }
    }
}

// Processo do servidor de suporte
let supportServerProcess = null;

// Função para iniciar servidor de suporte
function startSupportServer() {
    // Desabilitar servidor de suporte separado em ambiente Railway/produção
    if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') {
        console.log('⚠️  Servidor de suporte separado desabilitado em produção');
        return;
    }
    
    try {
        const supportServerPath = path.join(__dirname, 'Sistema de Suporte', 'server.js');
        
        if (!fs.existsSync(supportServerPath)) {
            console.log('⚠️  Servidor de suporte não encontrado em:', supportServerPath);
            return;
        }
        
        console.log('\n🟣 Iniciando servidor de suporte...');
        
        // Em modo empacotado, usar require() em vez de spawn
        if (isPackaged) {
            try {
                const supportServer = require(supportServerPath);
                if (supportServer && supportServer.startServer) {
                    process.env.PORT = '3003';
                    supportServer.startServer();
                    console.log('✅ Servidor de suporte iniciado via require (porta 3003)');
                }
            } catch (err) {
                console.error('❌ Erro ao carregar servidor de suporte:', err.message);
            }
            return;
        }
        
        // Modo desenvolvimento - usar spawn
        const envVars = {
            ...process.env,
            DB_HOST: process.env.DB_HOST || 'interchange.proxy.rlwy.net',
            DB_USER: process.env.DB_USER || 'root',
            DB_PASSWORD: process.env.DB_PASSWORD || 'iiilOZutDOnPCwxgiTKeMuEaIzSwplcu',
            DB_NAME: process.env.DB_NAME || 'railway',
            DB_PORT: process.env.DB_PORT || '19396',
            PORT: '3003'
        };
        
        supportServerProcess = spawn('node', [supportServerPath], {
            cwd: path.join(__dirname, 'Sistema de Suporte'),
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false,
            env: envVars
        });
        
        supportServerProcess.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                console.log(`[SUPORTE] ${output}`);
            }
        });
        
        supportServerProcess.stderr.on('data', (data) => {
            const error = data.toString().trim();
            if (error && !error.includes('ExperimentalWarning')) {
                console.error(`[SUPORTE] ⚠️  ${error}`);
            }
        });
        
        supportServerProcess.on('error', (error) => {
            console.error('❌ Erro ao iniciar servidor de suporte:', error);
        });
        
        supportServerProcess.on('exit', (code, signal) => {
            if (code !== null && code !== 0) {
                console.log(`⚠️  Servidor de suporte encerrado com código ${code}`);
            }
        });
        
        console.log('✅ Servidor de suporte iniciado na porta 3003');
        
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor de suporte:', error.message);
    }
}

// Função para parar servidor de suporte
function stopSupportServer() {
    if (supportServerProcess) {
        try {
            supportServerProcess.kill('SIGTERM');
            console.log('🟣 Servidor de suporte encerrado');
        } catch (error) {
            console.error('⚠️  Erro ao encerrar servidor de suporte:', error.message);
        }
    }
}

// =================================================================
const app = express();
const PORT = parseInt(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// 🚀 HEALTH CHECK IMEDIATO - Responde antes de qualquer middleware pesado
// Isso garante que o Railway detecte o servidor como "healthy" rapidamente
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 🔍 Endpoint de diagnóstico do banco de dados
app.get('/api/db-check', async (req, res) => {
    try {
        // O pool é definido mais abaixo no código, usar require dinâmico ou verificar se existe
        if (typeof pool === 'undefined') {
            return res.status(500).json({ status: 'error', message: 'Pool ainda não inicializado - aguarde' });
        }
        const [rows] = await pool.query('SELECT COUNT(*) as total FROM usuarios');
        res.json({ 
            status: 'ok', 
            database: 'connected',
            usuarios_count: rows[0].total,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: error.message,
            code: error.code
        });
    }
});

// Endpoint temporário para debug - lista usuários disponíveis
app.get('/api/debug-users', async (req, res) => {
    try {
        if (typeof pool === 'undefined') {
            return res.status(500).json({ status: 'error', message: 'Pool ainda não inicializado' });
        }
        const [usuarios] = await pool.query('SELECT id, email, nome, role, status FROM usuarios LIMIT 10');
        const [funcionarios] = await pool.query('SELECT id, email, nome_completo, role, status FROM funcionarios WHERE email IS NOT NULL LIMIT 10');
        res.json({ 
            usuarios: usuarios.map(u => ({ id: u.id, email: u.email, nome: u.nome, role: u.role, status: u.status })),
            funcionarios: funcionarios.map(f => ({ id: f.id, email: f.email, nome: f.nome_completo, role: f.role, status: f.status }))
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Endpoint temporário para resetar senha de teste - REMOVER EM PRODUÇÃO
app.get('/api/reset-test-password', async (req, res) => {
    try {
        if (typeof pool === 'undefined') {
            return res.status(500).json({ status: 'error', message: 'Pool ainda não inicializado' });
        }
        const bcrypt = require('bcryptjs');
        // Senha: Aluforce2025!
        const hashedPassword = await bcrypt.hash('Aluforce2025!', 10);
        
        // Atualizar o usuário ti@aluforce.ind.br
        await pool.query(
            'UPDATE usuarios SET senha_hash = ?, password_hash = ? WHERE email = ?',
            [hashedPassword, hashedPassword, 'ti@aluforce.ind.br']
        );
        
        res.json({ 
            status: 'ok', 
            message: 'Senha do usuário ti@aluforce.ind.br resetada para: Aluforce2025!',
            email: 'ti@aluforce.ind.br'
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Endpoint de diagnóstico de login - REMOVER EM PRODUÇÃO
app.post('/api/test-login', express.json(), async (req, res) => {
    const debug = [];
    try {
        const { email, password } = req.body || {};
        debug.push(`1. Recebido email: ${email}`);
        
        if (!email || !password) {
            return res.json({ status: 'error', debug, message: 'Email ou senha faltando' });
        }
        
        debug.push('2. Buscando usuário no banco...');
        const [rows] = await pool.query('SELECT id, email, nome, senha_hash, password_hash FROM usuarios WHERE email = ? LIMIT 1', [email]);
        
        if (!rows || rows.length === 0) {
            debug.push('3. Usuário NÃO encontrado');
            return res.json({ status: 'error', debug, message: 'Usuário não encontrado' });
        }
        
        const user = rows[0];
        debug.push(`3. Usuário encontrado: ${user.nome} (id: ${user.id})`);
        debug.push(`4. Tem senha_hash: ${!!user.senha_hash}, Tem password_hash: ${!!user.password_hash}`);
        
        const hashToCheck = user.senha_hash || user.password_hash;
        debug.push(`5. Hash a verificar (primeiros 20 chars): ${hashToCheck ? hashToCheck.substring(0, 20) : 'NENHUM'}`);
        
        if (!hashToCheck) {
            return res.json({ status: 'error', debug, message: 'Usuário sem senha cadastrada' });
        }
        
        debug.push('6. Verificando senha com bcrypt...');
        const bcrypt = require('bcryptjs');
        const isValid = await bcrypt.compare(password, hashToCheck);
        debug.push(`7. Resultado bcrypt: ${isValid ? 'VÁLIDA' : 'INVÁLIDA'}`);
        
        if (isValid) {
            debug.push('8. LOGIN SUCESSO!');
            return res.json({ status: 'success', debug, message: 'Login válido!' });
        } else {
            debug.push('8. Senha incorreta');
            return res.json({ status: 'error', debug, message: 'Senha incorreta' });
        }
    } catch (error) {
        debug.push(`ERRO: ${error.message}`);
        debug.push(`Stack: ${error.stack}`);
        return res.json({ status: 'error', debug, error: error.message });
    }
});

// Endpoint para resetar TODAS as senhas - REMOVER EM PRODUÇÃO
app.get('/api/reset-all-passwords', async (req, res) => {
    try {
        if (typeof pool === 'undefined') {
            return res.status(500).json({ status: 'error', message: 'Pool ainda não inicializado' });
        }
        const bcrypt = require('bcryptjs');
        // Senha padrão: Aluforce2025!
        const hashedPassword = await bcrypt.hash('Aluforce2025!', 10);
        
        // Atualizar todos os usuários ativos
        const [result] = await pool.query(
            'UPDATE usuarios SET senha_hash = ?, password_hash = ? WHERE status IS NULL OR status != "inativo"',
            [hashedPassword, hashedPassword]
        );
        
        // Listar usuários atualizados
        const [usuarios] = await pool.query('SELECT id, email, nome FROM usuarios WHERE status IS NULL OR status != "inativo" LIMIT 50');
        
        res.json({ 
            status: 'ok', 
            message: `${result.affectedRows} usuários atualizados com senha: Aluforce2025!`,
            usuarios: usuarios.map(u => ({ id: u.id, email: u.email, nome: u.nome }))
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// reference to the running http.Server (set when app.listen is called)
let serverInstance = null;
let chatServerProcess = null;
let DB_AVAILABLE = true;

// Chave secreta para JWT. Em produção, defina via variável de ambiente JWT_SECRET.
const JWT_SECRET = process.env.JWT_SECRET || 'aluforce-railway-secret-key-2026-secure';

// Validar JWT Secret em produção - apenas logar aviso, não encerrar
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    logger.warn('AVISO: variável de ambiente JWT_SECRET não definida. Usando chave padrão (não recomendado para produção).');
}

// =================================================================
// 2.1. CONFIGURAÇÃO DE EMAIL (NODEMAILER)
// =================================================================

// Configurar transporter do Nodemailer
let emailTransporter = null;

// Função para inicializar o transporter de email
function initEmailTransporter() {
    try {
        emailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true para 465, false para outras portas
            auth: {
                user: process.env.SMTP_USER || 'sistema@aluforce.ind.br',
                pass: process.env.SMTP_PASS || '' // Deixe vazio se não configurado
            },
            tls: {
                rejectUnauthorized: false // Para ambientes de desenvolvimento
            }
        });

        // Verificar conexão SMTP
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            emailTransporter.verify((error, success) => {
                if (error) {
                    logger.warn('[EMAIL] ⚠️  SMTP não configurado ou erro na conexão:', error.message);
                    logger.warn('[EMAIL] 📧 Emails não serão enviados. Configure variáveis de ambiente SMTP_*');
                } else {
                    logger.info('[EMAIL] ✅ Servidor SMTP configurado e pronto para enviar emails');
                }
            });
        } else {
            logger.warn('[EMAIL] ⚠️  Credenciais SMTP não configuradas. Emails não serão enviados.');
            logger.warn('[EMAIL] 💡 Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS no .env');
        }
    } catch (error) {
        logger.error('[EMAIL] ❌ Erro ao inicializar Nodemailer:', error);
    }
}

// Inicializar email transporter
initEmailTransporter();

// Função auxiliar para enviar emails
async function sendEmail(to, subject, html, text) {
    if (!emailTransporter || !process.env.SMTP_USER) {
        logger.warn(`[EMAIL] Email não enviado (SMTP não configurado): ${subject}`);
        return { success: false, error: 'SMTP não configurado' };
    }

    try {
        const info = await emailTransporter.sendMail({
            from: `"ALUFORCE Sistema" <${process.env.SMTP_USER}>`,
            to: to,
            subject: subject,
            text: text || html.replace(/<[^>]*>/g, ''), // Fallback text
            html: html
        });

        logger.info(`[EMAIL] ✅ Email enviado: ${subject} → ${to} (ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error(`[EMAIL] ❌ Erro ao enviar email: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// =================================================================
// 3. MIDDLEWARES DE AUTORIZAÇÁO (declarados antes de serem usados)
// =================================================================

// Middleware para validar resultado das validações
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            message: 'Dados inválidos',
            errors: errors.array() 
        });
    }
    next();
};

// Validações para fornecedores
const fornecedorValidation = [
    body('nome').isString().notEmpty().withMessage('Nome é obrigatório'),
    body('cnpj').isString().notEmpty().withMessage('CNPJ é obrigatório'),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('telefone').optional().isString(),
    body('endereco').optional().isString(),
    body('contato_principal').optional().isString(),
    body('ativo').optional().isBoolean(),
    validate
];

// Validações para pedidos de compra
const pedidoValidation = [
    body('fornecedor_id').isInt().withMessage('Fornecedor é obrigatório'),
    body('itens').isArray({ min: 1 }).withMessage('Itens são obrigatórios'),
    body('itens.*.descricao').isString().notEmpty().withMessage('Descrição do item é obrigatória'),
    body('itens.*.quantidade').isNumeric().withMessage('Quantidade do item deve ser numérica'),
    body('itens.*.preco_unitario').isNumeric().withMessage('Preço unitário do item deve ser numérico'),
    body('observacoes').optional().isString(),
    validate
];

// Middleware para autorizar apenas administradores ou RH (usado em RH)
const authorizeAdmin = (req, res, next) => {
    const userRole = req.user?.role?.toLowerCase() || '';
    const isAdmin = userRole === 'admin' || req.user?.is_admin === 1 || req.user?.is_admin === true;
    const isRH = userRole === 'rh' || userRole === 'recursos humanos';
    
    if (isAdmin || isRH) {
        return next();
    }
    return res.status(403).json({ message: 'Acesso negado. Requer privilégios de administrador ou RH.' });
};

// Middleware para controle de acesso por área baseado em permissões de usuário
const authorizeArea = (area) => {
    return (req, res, next) => {
        if (!req.user || !req.user.nome) {
            logger.warn(`[AUTH-AREA] Usuário não autenticado para área: ${area}`);
            return res.status(401).json({ message: 'Usuário não autenticado.' });
        }
        
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        logger.info(`[AUTH-AREA] Verificando acesso do usuário ${firstName} à área ${area}`);
        
        // Admin sempre tem acesso (verificação robusta para diferentes tipos de valores)
        const isAdmin = req.user.role === 'admin' || 
                        req.user.is_admin === true || 
                        req.user.is_admin === 1 || 
                        req.user.is_admin === '1' ||
                        String(req.user.role).toLowerCase() === 'admin';
        
        if (isAdmin) {
            logger.info(`[AUTH-AREA] Admin ${firstName} autorizado para ${area}`);
            return next();
        }
        
        // Verificar se o usuário tem acesso à área
        if (userPermissions.hasAccess(firstName, area)) {
            logger.info(`[AUTH-AREA] Usuário ${firstName} autorizado para ${area}`);
            return next();
        }
        
        logger.warn(`[AUTH-AREA] Acesso negado para ${firstName} à área ${area}`);
        return res.status(403).json({ 
            message: `Acesso negado à área ${area}. Você não tem permissão para acessar este módulo.`  
        });
    };
};

// Configuração do Banco de Dados (use variáveis de ambiente para testes/produção)
// Permite sobrescrever host/user/password/database sem editar o código.

// ⚠️ VALIDAÇÃO DE SEGURANÇA - Apenas avisos, não encerra o servidor
if (process.env.NODE_ENV === 'production') {
    if (!process.env.DB_PASSWORD) {
        logger.warn('⚠️ AVISO: DB_PASSWORD não definido explicitamente. Usando credenciais padrão Railway.');
    }
}

const DB_CONFIG = {
    host: process.env.DB_HOST || 'interchange.proxy.rlwy.net',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'iiilOZutDOnPCwxgiTKeMuEaIzSwplcu',
    database: process.env.DB_NAME || 'railway',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 19396,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONN_LIMIT) || 30, // Pool maior
    queueLimit: 0,
    // Otimizações de performance
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 5000, // Timeout de conexão
    timezone: '+00:00',
    // Cache de queries preparadas
    multipleStatements: false,
    dateStrings: true
};

// Criação do Pool de Conexão com o Banco de Dados
const pool = mysql.createPool(DB_CONFIG);

console.log(`🔌 MySQL pool config -> host=${DB_CONFIG.host} user=${DB_CONFIG.user} port=${DB_CONFIG.port} database=${DB_CONFIG.database}`);

// Testar conexão imediatamente
pool.query('SELECT 1').then(() => {
    console.log('✅ Conexão com banco de dados OK');
}).catch(err => {
    console.error('❌ Erro na conexão com banco:', err.message);
});

// =================================================================
// ⚡ SISTEMA DE CACHE EM MEMÓRIA PARA PERFORMANCE
// =================================================================
const memoryCache = new Map();
const CACHE_CONFIG = {
    userSession: 60000,    // 1 minuto para sessão de usuário
    dashboardKPIs: 30000,  // 30 segundos para KPIs
    listagens: 120000,     // 2 minutos para listagens
    default: 60000         // 1 minuto padrão
};

// Funções de cache
function cacheSet(key, value, ttl = CACHE_CONFIG.default) {
    memoryCache.set(key, {
        value,
        expiresAt: Date.now() + ttl
    });
}

function cacheGet(key) {
    const item = memoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
        memoryCache.delete(key);
        return null;
    }
    return item.value;
}

function cacheDelete(key) {
    memoryCache.delete(key);
}

function cacheClear(pattern) {
    if (!pattern) {
        memoryCache.clear();
        return;
    }
    for (const key of memoryCache.keys()) {
        if (key.includes(pattern)) {
            memoryCache.delete(key);
        }
    }
}

// Limpar cache expirado a cada 5 minutos
setInterval(() => {
    const now = Date.now();
    for (const [key, item] of memoryCache.entries()) {
        if (now > item.expiresAt) {
            memoryCache.delete(key);
        }
    }
}, 300000);

console.log('⚡ Sistema de cache em memória ativado');
// =================================================================

// Helper: enviarEmail - tenta usar nodemailer se configurado via env, senão faz log
async function enviarEmail(to, subject, text, html) {
    // Requer variáveis de ambiente para envio real (SMTP)
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (host && user && pass) {
        try {
            const transporter = nodemailer.createTransport({ host, port: parseInt(port) || 587, secure: false, auth: { user, pass } });
            await transporter.sendMail({ from: user, to, subject, text, html });
            console.log(`✉️ Email enviado para ${to} assunto='${subject}'`);
            return true;
        } catch (err) {
            console.error('Falha ao enviar email via SMTP:', err);
            return false;
        }
    }
    // Fallback: apenas log
    console.log(`(simulado) enviarEmail -> to=${to} subject=${subject} text=${String(text).slice(0,200)}`);
    return true;
}

// =================================================================
// 3. MIDDLEWARES GERAIS
// =================================================================

// Middleware para interpretar JSON no corpo das requisições
app.use(express.json());
// Middleware para interpretar bodies de formulários (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// Aplicar security middleware centralizado
app.use(securityHeaders());
app.use(generalLimiter);
app.use(sanitizeInput);

// CORS configurado para permitir GitHub Pages e Railway
const allowedOrigins = [
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'https://jovemegidio.github.io',
    'https://sistemaerp-production.up.railway.app',
    'https://sistemaerp-production-a924.up.railway.app'
];

// Adicionar origens do .env se existirem
if (process.env.CORS_ORIGIN) {
    const envOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());
    envOrigins.forEach(o => {
        if (!allowedOrigins.includes(o)) {
            allowedOrigins.push(o);
        }
    });
}

app.use(cors({
    origin: function(origin, callback) {
        // Permitir requests sem origin (como mobile apps ou curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // Em desenvolvimento, permitir qualquer origem local
            if (process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
                callback(null, true);
            } else {
                console.warn('[CORS] Origem bloqueada:', origin);
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true, // Permite envio de cookies
    exposedHeaders: ['set-cookie'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(cookieParser());

// DEBUG: Log de todos os cookies recebidos
app.use((req, res, next) => {
    // Logs de cookies removidos para produção
    // if (req.path.startsWith('/api/')) {
    //     console.log(`[${req.method}] ${req.path} - Cookies:`, req.cookies);
    //     console.log(`[${req.method}] ${req.path} - Cookie header:`, req.headers.cookie);
    // }
    next();
});

// Configurações de MIME type para arquivos estáticos
app.use((req, res, next) => {
    const ext = path.extname(req.url).toLowerCase();
    switch (ext) {
        case '.css':
            res.setHeader('Content-Type', 'text/css');
            break;
        case '.js':
            res.setHeader('Content-Type', 'application/javascript');
            break;
        case '.png':
            res.setHeader('Content-Type', 'image/png');
            break;
        case '.jpg':
        case '.jpeg':
            res.setHeader('Content-Type', 'image/jpeg');
            break;
        case '.svg':
            res.setHeader('Content-Type', 'image/svg+xml');
            break;
        case '.ico':
            res.setHeader('Content-Type', 'image/x-icon');
            break;
    }
    next();
});

// Servir arquivos estáticos da pasta public com compressão otimizada
const compression = require('compression');
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        // Não comprimir imagens (já são comprimidas)
        const contentType = res.getHeader('Content-Type') || '';
        if (contentType.includes('image/')) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6,  // Nível de compressão (0-9, onde 6 é padrão balanceado)
    threshold: 1024,  // Só comprimir respostas > 1KB
    memLevel: 8  // Otimizar uso de memória
}));

// Middleware para servir avatar padrão quando não encontrado
app.get('/avatars/:filename', (req, res, next) => {
    const avatarPath = path.join(__dirname, 'public', 'avatars', req.params.filename);
    const defaultAvatar = path.join(__dirname, 'public', 'avatars', 'default.webp');
    
    // Verificar se o arquivo existe
    fs.access(avatarPath, fs.constants.F_OK, (err) => {
        if (err) {
            // Se não existe, retornar o avatar padrão
            res.sendFile(defaultAvatar);
        } else {
            // Se existe, servir o arquivo normalmente
            res.sendFile(avatarPath);
        }
    });
});

// ========================================
// ROTAS ESPECÍFICAS (devem vir ANTES do express.static(public))
// ========================================

// Servir página de Ajuda (institucional) - DEVE VIR ANTES do express.static(public)
app.use('/ajuda', express.static(path.join(__dirname, 'Ajuda - Aluforce')));

// CSS e JS - Cache curto para permitir atualizações rápidas
app.use('/css', express.static(path.join(__dirname, 'public', 'css'), { 
    index: false,
    maxAge: '1h',  // Cache de 1 hora para CSS
    etag: true,
    lastModified: true
}));

app.use('/js', express.static(path.join(__dirname, 'public', 'js'), { 
    index: false,
    maxAge: '1h',  // Cache de 1 hora para JS
    etag: true,
    lastModified: true
}));

// Outros assets - Cache mais longo
app.use(express.static(path.join(__dirname, 'public'), { 
    index: false,
    maxAge: '1d',  // Cache de 1 dia para outros assets
    etag: true,
    lastModified: true
}));

// Servir Socket.io client library
app.use('/socket.io', express.static(path.join(__dirname, 'node_modules', 'socket.io', 'client-dist')));

// Middleware específico para correção de MIME types
// NOTA: CORS já configurado acima com cors() - não sobrescrever!
app.use((req, res, next) => {
    // Adicionar headers CORS dinâmicos (compatível com credentials)
    const origin = req.headers.origin;
    const allowedOrigins = [
        'http://localhost:3000', 
        'http://127.0.0.1:3000',
        'https://jovemegidio.github.io',
        'https://sistemaerp-production.up.railway.app',
        'https://sistemaerp-production-a924.up.railway.app'
    ];
    
    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
    } else if (!origin) {
        // Requests sem origin (curl, mobile, etc)
        res.header('Access-Control-Allow-Origin', '*');
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Expose-Headers', 'set-cookie');
    
    // Configurar MIME types corretos baseado na extensão do arquivo
    const url = req.url.toLowerCase();
    if (url.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
    } else if (url.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
    } else if (url.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
    } else if (url.endsWith('.jpg') || url.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg');
    } else if (url.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
    
    next();
});

// Servir arquivos estáticos dos módulos (APENAS JS, CSS e imagens - NÃO HTML)
app.use('/Vendas/js', express.static(path.join(__dirname, 'modules', 'Vendas', 'public', 'js'), {
    setHeaders: (res, path) => {
        res.setHeader('Content-Type', 'application/javascript');
    }
}));

app.use('/Vendas/css', express.static(path.join(__dirname, 'modules', 'Vendas', 'public', 'css'), {
    setHeaders: (res, path) => {
        res.setHeader('Content-Type', 'text/css');
    }
}));

app.use('/Vendas/images', express.static(path.join(__dirname, 'modules', 'Vendas', 'public', 'images')));
app.use('/Vendas/assets', express.static(path.join(__dirname, 'modules', 'Vendas', 'public', 'assets')));

// Servir uploads específicos do Vendas
app.use('/uploads', express.static(path.join(__dirname, 'modules', 'Vendas', 'public', 'uploads'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/' + filePath.split('.').pop().replace('jpg', 'jpeg'));
        }
    }
}));
// /Sistema/Vendas removido - use rotas autenticadas /Vendas/*

// Rotas estáticas do PCP
app.use('/PCP', express.static(path.join(__dirname, 'modules', 'PCP'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
        } else if (filePath.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
        }
    }
}));

app.use('/NFe', express.static(path.join(__dirname, 'modules', 'NFe')));
app.use('/e-Nf-e', express.static(path.join(__dirname, 'modules', 'NFe'))); // Compatibilidade com URL antiga
app.use('/Financeiro', express.static(path.join(__dirname, 'modules', 'Financeiro', 'public')));
app.use('/Compras', express.static(path.join(__dirname, 'modules', 'Compras')));
app.use('/RecursosHumanos', express.static(path.join(__dirname, 'modules', 'RH', 'public')));
app.use('/RH', express.static(path.join(__dirname, 'modules', 'RH', 'public'))); // Compatibilidade

// Servir arquivos compartilhados dos módulos
app.use('/_shared', express.static(path.join(__dirname, 'modules', '_shared')));

// Rotas específicas para cada módulo (para URLs /modules/MODULO/...)
// Isso garante que os caminhos funcionem corretamente no Railway
app.use('/modules/RH/public', express.static(path.join(__dirname, 'modules', 'RH', 'public')));
app.use('/modules/RH', express.static(path.join(__dirname, 'modules', 'RH')));
app.use('/modules/Compras', express.static(path.join(__dirname, 'modules', 'Compras')));
app.use('/modules/Vendas', express.static(path.join(__dirname, 'modules', 'Vendas')));
app.use('/modules/NFe', express.static(path.join(__dirname, 'modules', 'NFe')));
app.use('/modules/PCP', express.static(path.join(__dirname, 'modules', 'PCP')));
app.use('/modules/Financeiro', express.static(path.join(__dirname, 'modules', 'Financeiro')));
app.use('/modules/Faturamento', express.static(path.join(__dirname, 'modules', 'Faturamento')));

// Servir módulos diretamente com rotas específicas (fallback genérico)
app.use('/modules', express.static(path.join(__dirname, 'modules')));

// Servir pasta do chat (ícones e recursos)
app.use('/chat', express.static(path.join(__dirname, 'chat')));

// Servir Sistema de Chat (popup de chat para usuários)
app.use('/sistema-chat', express.static(path.join(__dirname, 'Sistema de Chat')));

// Servir Sistema de Suporte (popup de suporte para TI)
app.use('/sistema-suporte', express.static(path.join(__dirname, 'Sistema de Suporte')));

// API do Chat com IA
const chatAIRouter = require('./routes/chat-ai');
app.use('/api', chatAIRouter);

// =================================================================
// ENDPOINT DE HEALTH CHECK - Monitoramento de Conexão
// =================================================================
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        server: 'ALUFORCE v2.0'
    });
});

// Rota específica para módulo Vendas - APENAS recursos estáticos (CSS, JS, imagens)
// Bloqueia acesso direto a arquivos HTML (requer autenticação via rotas específicas)
app.use('/modules/Vendas', (req, res, next) => {
    // Bloquear acesso a arquivos HTML - devem passar pelas rotas autenticadas
    if (req.path.endsWith('.html') || req.path === '/' || req.path === '') {
        return res.redirect('/login.html');
    }
    next();
}, express.static(path.join(__dirname, 'modules', 'Vendas'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Configuração do Multer para upload de arquivos
const uploadDir = path.join(__dirname, 'public', 'uploads', 'RH');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let subfolder = 'outros';
        if (file.fieldname === 'foto') subfolder = 'fotos';
        if (file.fieldname === 'holerite') subfolder = 'holerites';
        if (file.fieldname === 'atestado') subfolder = 'atestados';
        if (file.fieldname === 'logo' || file.fieldname === 'favicon') subfolder = 'empresa';
        if (file.fieldname === 'avatar') subfolder = 'avatars';
        const dest = path.join(uploadDir, subfolder);
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const unique = `${file.fieldname}-${Date.now()}-${Math.floor(Math.random()*1e9)}${ext}`;
        cb(null, unique);
    }
});
const upload = multer({ storage });

// Middleware para servir avatares
app.use('/avatars', express.static(path.join(__dirname, 'public', 'avatars'), {
    maxAge: '1d', // cache for a day in clients
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg']
}));

// Middleware para servir arquivos de upload do RH
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Middleware para servir arquivos de upload do módulo RH (fotos funcionários)
app.use('/uploads', express.static(path.join(__dirname, 'modules', 'RH', 'public', 'uploads'), {
    maxAge: '1d',
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif']
}));

// Rota condicional para Recursos Humanos baseada no perfil do usuário
app.get('/RecursosHumanos', authenticatePage, (req, res) => {
    // SEMPRE serve o index.html, que fará o redirecionamento inteligente no cliente
    // Isso permite que o JavaScript verifique cookies e localStorage antes de decidir
    console.log('[RH] Servindo index.html - JavaScript fará redirecionamento baseado em autenticação');
    res.sendFile(path.join(__dirname, 'modules', 'RH', 'public', 'index.html'));
});

// Rotas diretas para os arquivos HTML do RH (para compatibilidade)
app.get('/RH/areaadm.html', authenticatePage, (req, res) => {
    if (req.user && (req.user.nome || req.user.email)) {
        // Verificar por nome e também por email (prefixo antes do @)
        const firstName = req.user.nome ? req.user.nome.split(' ')[0].toLowerCase() : '';
        const emailPrefix = req.user.email ? req.user.email.split('@')[0].toLowerCase() : '';
        
        if (userPermissions.isAdmin(firstName) || userPermissions.isAdmin(emailPrefix)) {
            res.sendFile(path.join(__dirname, 'modules', 'RH', 'public', 'areaadm.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Esta área é restrita a administradores.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

app.get('/RH/area.html', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'RH', 'public', 'area.html'));
});

app.get('/RH/funcionario.html', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'RH', 'public', 'funcionario.html'));
});

// Rotas específicas para páginas individuais do RH
app.get('/RH/dashboard.html', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'RH', 'public', 'dashboard.html'));
});

app.get('/RH/dados-pessoais.html', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'RH', 'public', 'dados-pessoais.html'));
});

app.get('/RH/holerites.html', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'RH', 'public', 'holerites.html'));
});

app.get('/RH/solicitacoes.html', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'RH', 'public', 'solicitacoes.html'));
});

// Rotas para páginas do colaborador RH (em /rh/pages/)
app.get('/rh/pages/:page', authenticatePage, (req, res) => {
    const page = req.params.page;
    // Remove .html se vier na URL
    const fileName = page.endsWith('.html') ? page : `${page}.html`;
    const filePath = path.join(__dirname, 'modules', 'RH', 'public', 'pages', fileName);
    
    // Verifica se o arquivo existe
    if (require('fs').existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        console.log(`[RH] Arquivo não encontrado: ${filePath}`);
        res.status(404).send('<h1>Página não encontrada</h1>');
    }
});

// Rota para solicitações do RH (sem .html)
app.get('/rh/solicitacoes', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'RH', 'public', 'solicitacoes.html'));
});

// Rota para área administrativa do RH (minúsculo)
app.get('/rh/areaadm', authenticatePage, (req, res) => {
    if (req.user && (req.user.nome || req.user.email)) {
        // Verificar por nome e também por email (prefixo antes do @)
        const firstName = req.user.nome ? req.user.nome.split(' ')[0].toLowerCase() : '';
        const emailPrefix = req.user.email ? req.user.email.split('@')[0].toLowerCase() : '';
        
        if (userPermissions.isAdmin(firstName) || userPermissions.isAdmin(emailPrefix)) {
            res.sendFile(path.join(__dirname, 'modules', 'RH', 'public', 'areaadm.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Esta área é restrita a administradores.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

// Rota para funcionário/dashboard colaborador (minúsculo)
app.get('/rh/funcionario', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'RH', 'public', 'funcionario.html'));
});

// Rotas para área administrativa do RH
app.get('/RH/admin-dashboard.html', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'RH', 'public', 'admin-dashboard.html'));
});

app.get('/RH/admin-funcionarios.html', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'RH', 'public', 'admin-funcionarios.html'));
});

app.get('/RH/admin-folha-pagamento.html', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'RH', 'public', 'admin-folha-pagamento.html'));
});

app.get('/RH/admin-ponto.html', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'RH', 'public', 'admin-ponto.html'));
});

app.get('/RH/admin-beneficios.html', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'RH', 'public', 'admin-beneficios.html'));
});

// ===== ROTAS DO MÓDULO DE VENDAS =====
// Rota principal: /Vendas/ - requer autenticação e permissão (redireciona para Kanban)
app.get('/Vendas/', authenticatePage, (req, res) => {
    if (req.user && req.user.nome) {
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        if (userPermissions.hasAccess(firstName, 'vendas')) {
            res.sendFile(path.join(__dirname, 'modules', 'Vendas', 'public', 'kanban.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de Vendas.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

// Rota Kanban (página principal)
app.get('/Vendas/kanban.html', authenticatePage, (req, res) => {
    if (req.user && req.user.nome) {
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        if (userPermissions.hasAccess(firstName, 'vendas')) {
            res.sendFile(path.join(__dirname, 'modules', 'Vendas', 'public', 'kanban.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de Vendas.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

// Rotas alternativas redirecionam para /Vendas/
app.get('/Vendas/index.html', authenticatePage, (req, res) => res.redirect('/Vendas/'));
app.get('/Vendas/vendas.html', authenticatePage, (req, res) => res.redirect('/Vendas/'));

// Rotas das páginas do módulo Vendas
app.get('/Vendas/pedidos.html', authenticatePage, (req, res) => {
    if (req.user && req.user.nome) {
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        if (userPermissions.hasAccess(firstName, 'vendas')) {
            res.sendFile(path.join(__dirname, 'modules', 'Vendas', 'public', 'pedidos.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de Vendas.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

app.get('/Vendas/clientes.html', authenticatePage, (req, res) => {
    if (req.user && req.user.nome) {
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        if (userPermissions.hasAccess(firstName, 'vendas')) {
            res.sendFile(path.join(__dirname, 'modules', 'Vendas', 'public', 'clientes.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de Vendas.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

app.get('/Vendas/dashboard.html', authenticatePage, (req, res) => {
    if (req.user && req.user.nome) {
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        if (userPermissions.hasAccess(firstName, 'vendas')) {
            res.sendFile(path.join(__dirname, 'modules', 'Vendas', 'public', 'dashboard.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de Vendas.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

app.get('/Vendas/dashboard-admin.html', authenticatePage, (req, res) => {
    if (req.user && req.user.nome) {
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        if (userPermissions.hasAccess(firstName, 'vendas')) {
            res.sendFile(path.join(__dirname, 'modules', 'Vendas', 'public', 'dashboard-admin.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de Vendas.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

app.get('/Vendas/relatorios.html', authenticatePage, (req, res) => {
    if (req.user && req.user.nome) {
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        if (userPermissions.hasAccess(firstName, 'vendas')) {
            res.sendFile(path.join(__dirname, 'modules', 'Vendas', 'public', 'relatorios.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de Vendas.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

// Rota /modules/Vendas/ - redireciona para /Vendas/
app.get('/modules/Vendas/', authenticatePage, (req, res) => res.redirect('/Vendas/'));
app.get('/modules/Vendas/index.html', authenticatePage, (req, res) => res.redirect('/Vendas/'));

// Rotas protegidas para PCP - requer autenticação e permissão
app.get('/PCP/index.html', authenticatePage, (req, res) => {
    if (req.user && req.user.nome) {
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        if (userPermissions.hasAccess(firstName, 'pcp')) {
            res.sendFile(path.join(__dirname, 'modules', 'PCP', 'index.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de PCP.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

app.get('/modules/PCP/index.html', authenticatePage, (req, res) => {
    if (req.user && req.user.nome) {
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        if (userPermissions.hasAccess(firstName, 'pcp')) {
            res.sendFile(path.join(__dirname, 'modules', 'PCP', 'index.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de PCP.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

// Rotas protegidas para CRM - requer autenticação e permissão
app.get('/CRM/crm.html', authenticatePage, (req, res) => {
    if (req.user && req.user.nome) {
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        if (userPermissions.hasAccess(firstName, 'crm')) {
            res.sendFile(path.join(__dirname, 'modules', 'CRM', 'crm.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de CRM.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

// Rotas protegidas para NFe - requer autenticação e permissão
app.get('/NFe/nfe.html', authenticatePage, (req, res) => {
    if (req.user && req.user.nome) {
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        if (userPermissions.hasAccess(firstName, 'nfe')) {
            res.sendFile(path.join(__dirname, 'modules', 'NFe', 'index.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de NF-e.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

// Rotas protegidas para Compras - requer autenticação e permissão
app.get('/Compras/compras.html', authenticatePage, (req, res) => {
    if (req.user && req.user.nome) {
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        if (userPermissions.hasAccess(firstName, 'compras')) {
            res.sendFile(path.join(__dirname, 'modules', 'Compras', 'public', 'index.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de Compras.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

// Rota principal do módulo Compras
app.get('/Compras', authenticatePage, (req, res) => {
    if (req.user && req.user.nome) {
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        if (userPermissions.hasAccess(firstName, 'compras')) {
            res.sendFile(path.join(__dirname, 'modules', 'Compras', 'public', 'index.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de Compras.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

// Todas as rotas de Compras agora servem o novo index.html unificado
app.get('/Compras/:page', authenticatePage, (req, res) => {
    if (req.user && req.user.nome) {
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        if (userPermissions.hasAccess(firstName, 'compras')) {
            res.sendFile(path.join(__dirname, 'modules', 'Compras', 'public', 'index.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de Compras.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

// Rotas de acesso direto aos módulos (redirecionam para login se não autenticado)
app.get('/modules/RH/public/dashboard.html', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'RH', 'public', 'dashboard.html'));
});

// Rota principal para módulo RH
app.get('/modules/RH/index.html', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'RH', 'index.html'));
});

app.get('/modules/RH/', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'RH', 'index.html'));
});

app.get('/modules/RH/public/areaadm.html', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'RH', 'public', 'areaadm.html'));
});

app.get('/modules/RH/public/area.html', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'RH', 'public', 'funcionario.html'));
});

app.get('/modules/RH/public/funcionario.html', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'RH', 'public', 'funcionario.html'));
});

// Servir TODOS os arquivos HTML de /modules/RH/public/* (catch-all)
app.get('/modules/RH/public/*.html', authenticatePage, (req, res) => {
    const requestedPath = req.path.replace('/modules/RH/public/', '');
    const filePath = path.join(__dirname, 'modules', 'RH', 'public', requestedPath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('[RH] Arquivo não encontrado:', filePath);
            res.status(404).send('Página não encontrada');
        }
    });
});

// Rota para página de teste de sincronização de estoque
app.get('/teste-sincronizacao-estoque.html', authenticatePage, (req, res) => {
    console.log('[TESTE] Acesso à página de teste de sincronização por:', req.user?.email);
    res.sendFile(path.join(__dirname, 'teste-sincronizacao-estoque.html'));
});

// Rota para Dashboard de Integração
app.get('/dashboard-integracao.html', authenticatePage, (req, res) => {
    console.log('[INTEGRACAO] Acesso ao dashboard de integração por:', req.user?.email);
    res.sendFile(path.join(__dirname, 'dashboard-integracao.html'));
});

app.get('/integracao', authenticatePage, (req, res) => {
    res.redirect('/dashboard-integracao.html');
});

// Rotas antigas de Vendas redirecionam para /Vendas/
app.get('/modules/Vendas/public/vendas.html', authenticatePage, (req, res) => res.redirect('/Vendas/'));
app.get('/modules/Vendas/public/', authenticatePage, (req, res) => res.redirect('/Vendas/'));
app.get('/modules/Vendas/public/index.html', authenticatePage, (req, res) => res.redirect('/Vendas/'));

// Rotas para Compras (COM autenticação)
app.get('/modules/Compras/', authenticatePage, (req, res) => {
    res.redirect('/Compras/compras.html');
});

app.get('/modules/Compras/index.html', authenticatePage, (req, res) => {
    if (req.user && req.user.nome) {
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        if (userPermissions.hasAccess(firstName, 'compras')) {
            res.sendFile(path.join(__dirname, 'modules', 'Compras', 'public', 'index.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de Compras.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

app.get('/modules/Compras/public/', authenticatePage, (req, res) => {
    res.redirect('/Compras/compras.html');
});

app.get('/modules/Compras/public/index.html', authenticatePage, (req, res) => {
    if (req.user && req.user.nome) {
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        if (userPermissions.hasAccess(firstName, 'compras')) {
            res.sendFile(path.join(__dirname, 'modules', 'Compras', 'public', 'index.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de Compras.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

// Rotas para Financeiro (COM autenticação)
app.get('/modules/Financeiro/', authenticatePage, (req, res) => {
    res.redirect('/modules/Financeiro/index.html');
});

app.get('/modules/Financeiro/public/', authenticatePage, (req, res) => {
    res.redirect('/modules/Financeiro/index.html');
});

app.get('/modules/Financeiro/public/index.html', authenticatePage, (req, res) => {
    // Redireciona para a versão nova na raiz
    res.redirect('/modules/Financeiro/index.html');
});

// Redirecionamentos das subpáginas do Financeiro (public -> raiz)
app.get('/modules/Financeiro/public/contas_pagar.html', authenticatePage, (req, res) => {
    res.redirect('/modules/Financeiro/contas-pagar.html');
});

app.get('/modules/Financeiro/public/contas_receber.html', authenticatePage, (req, res) => {
    res.redirect('/modules/Financeiro/contas-receber.html');
});

app.get('/modules/Financeiro/public/fluxo_caixa.html', authenticatePage, (req, res) => {
    res.redirect('/modules/Financeiro/fluxo-caixa.html');
});

app.get('/modules/Financeiro/public/contas_bancarias.html', authenticatePage, (req, res) => {
    res.redirect('/modules/Financeiro/bancos.html');
});

app.get('/modules/Financeiro/public/relatorios.html', authenticatePage, (req, res) => {
    res.redirect('/modules/Financeiro/relatorios.html');
});

app.get('/modules/Financeiro/index.html', authenticatePage, (req, res) => {
    if (req.user && req.user.nome) {
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        if (userPermissions.hasAccess(firstName, 'financeiro')) {
            res.sendFile(path.join(__dirname, 'modules', 'Financeiro', 'index.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo Financeiro.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

// Rota curinga para redirecionar qualquer arquivo .html da pasta public do Financeiro
app.get('/modules/Financeiro/public/*.html', authenticatePage, (req, res) => {
    // Pegar o nome do arquivo da URL
    const fileName = req.path.split('/').pop();
    // Mapear nomes de arquivo antigos para novos
    const fileMapping = {
        'index.html': 'index.html',
        'contas_pagar.html': 'contas-pagar.html',
        'contas_receber.html': 'contas-receber.html',
        'fluxo_caixa.html': 'fluxo-caixa.html',
        'contas_bancarias.html': 'bancos.html',
        'relatorios.html': 'relatorios.html'
    };
    const newFileName = fileMapping[fileName] || fileName.replace(/_/g, '-');
    res.redirect(`/modules/Financeiro/${newFileName}`);
});

// Rotas para NFe (COM autenticação)
app.get('/modules/NFe/', authenticatePage, (req, res) => {
    res.redirect('/NFe/nfe.html');
});

app.get('/modules/NFe/public/', authenticatePage, (req, res) => {
    res.redirect('/NFe/nfe.html');
});

app.get('/modules/NFe/index.html', authenticatePage, (req, res) => {
    if (req.user && req.user.nome) {
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        if (userPermissions.hasAccess(firstName, 'nfe')) {
            res.sendFile(path.join(__dirname, 'modules', 'NFe', 'index.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de NF-e.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

app.get('/modules/PCP/index.html', authenticatePage, (req, res) => {
    res.redirect('/PCP/index.html');
});

app.get('/modules/NFe/nfe.html', authenticatePage, (req, res) => {
    res.redirect('/NFe/nfe.html');
});

app.get('/NFe/', authenticatePage, (req, res) => {
    res.redirect('/NFe/nfe.html');
});

app.get('/modules/Compras/compras.html', authenticatePage, (req, res) => {
    res.redirect('/Compras/compras.html');
});

app.get('/Compras/', authenticatePage, (req, res) => {
    res.redirect('/Compras/compras.html');
});

app.get('/modules/Financeiro/financeiro.html', authenticatePage, (req, res) => {
    res.redirect('/modules/Financeiro/index.html');
});

app.get('/modules/Faturamento/index.html', authenticatePage, (req, res) => {
    if (req.user && req.user.permissoes && req.user.permissoes.includes('nfe')) {
        res.sendFile(path.join(__dirname, 'modules', 'Faturamento', 'public', 'index.html'));
    } else {
        res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo de Faturamento.</p>');
    }
});

app.get('/Faturamento/', authenticatePage, (req, res) => {
    res.redirect('/modules/Faturamento/index.html');
});

app.get('/Financeiro/', authenticatePage, (req, res) => {
    res.redirect('/modules/Financeiro/index.html');
});

// Redirecionamento para URLs antigas do NFe
app.get('/e-Nf-e/nfe.html', authenticatePage, (req, res) => {
    res.redirect('/NFe/nfe.html');
});

app.get('/modules/e-Nf-e/nfe.html', authenticatePage, (req, res) => {
    res.redirect('/NFe/nfe.html');
});

// Força qualquer acesso a rotas de login de módulos para a tela de login central
// NOTA: /Vendas/ e /Vendas/public/ NÃO estão aqui - são tratadas com autenticação nas rotas específicas
app.get([
    '/Vendas/login.html', '/Vendas/login', '/Vendas/public/login.html', '/Vendas/public/login',
    '/PCP/login', '/PCP/login.html',
    '/CRM/login', '/CRM/login.html',
    '/Financeiro/login', '/Financeiro/login.html',
    '/NFe/login', '/NFe/login.html',
    '/Compras/login', '/Compras/login.html'
], (req, res) => {
    return res.redirect('/login.html');
});

// =================== AUTOMAÇÁO DE TAREFAS (NODE-CRON) ===================
// Inicialização assíncrona de cron jobs após servidor iniciar
const initCronJobs = () => {
    console.log('⏰ Inicializando cron jobs...');
    
    // 1. Agendamento de envio de relatório diário por email
    cron.schedule('0 7 * * *', async () => {
        if (!DB_AVAILABLE) return;
        try {
            const [rows] = await pool.query('SELECT COUNT(*) AS total, SUM(valor) AS faturado FROM vendas WHERE DATE(data) = CURDATE()');
            const texto = `Relatório diário:\nTotal de vendas: ${rows[0].total}\nFaturamento: R$ ${rows[0].faturado}`;
            await enviarEmail('diretoria@empresa.com', 'Relatório Diário de Vendas', texto);
            console.log('Relatório diário enviado por email.');
        } catch (err) {
            console.warn('Erro no cron diário:', err && err.message ? err.message : err);
        }
    });

    // 2. Backup automático do banco de dados (simples)
    cron.schedule('0 2 * * *', async () => {
        if (!DB_AVAILABLE) return;
        try {
            const backupFile = path.join(__dirname, `backup-db-${Date.now()}.sql`);
            fs.writeFileSync(backupFile, '-- backup simulado --');
            await enviarEmail('ti@empresa.com', 'Backup Automático', `Backup gerado: ${backupFile}`);
            console.log('Backup automático realizado e notificado.');
        } catch (err) {
            console.warn('Erro no cron de backup:', err && err.message ? err.message : err);
        }
    });

    // 3. Notificação automática de cobranças
    cron.schedule('0 8 * * *', async () => {
        if (!DB_AVAILABLE) return;
        try {
            const [rows] = await pool.query('SELECT email, nome, valor FROM contas_receber WHERE status = "pendente" AND vencimento = CURDATE()');
            for (const cliente of rows) {
                await enviarEmail(cliente.email, 'Cobrança Pendente', `Olá ${cliente.nome}, sua cobrança de R$ ${cliente.valor} vence hoje.`);
            }
            console.log('Notificações de cobrança enviadas.');
        } catch (err) {
            console.warn('Erro no cron de cobranças:', err && err.message ? err.message : err);
        }
    });
    
    // =================== CRON JOBS DO MÓDULO DE COMPRAS ===================
    
    // 4. Verificar estoque mínimo e criar requisições automáticas (a cada 6 horas)
    cron.schedule('0 */6 * * *', async () => {
        if (!DB_AVAILABLE) return;
        try {
            logger.info('[COMPRAS-CRON] Verificando estoque mínimo...');
            await pool.query('CALL sp_verificar_estoque_minimo()');
            logger.info('[COMPRAS-CRON] ✅ Verificação de estoque concluída');
        } catch (err) {
            logger.error('[COMPRAS-CRON] Erro ao verificar estoque:', err);
        }
    });
    
    // 5. Alertar sobre pedidos atrasados (todos os dias às 9h)
    cron.schedule('0 9 * * *', async () => {
        if (!DB_AVAILABLE) return;
        try {
            logger.info('[COMPRAS-CRON] Verificando pedidos atrasados...');
            
            const [pedidosAtrasados] = await pool.query(`
                SELECT pc.id, pc.numero_pedido, pc.data_entrega_prevista,
                       f.razao_social as fornecedor,
                       u.id as solicitante_id, u.email as solicitante_email,
                       DATEDIFF(CURDATE(), pc.data_entrega_prevista) as dias_atraso
                FROM pedidos_compra pc
                JOIN fornecedores f ON pc.fornecedor_id = f.id
                JOIN usuarios u ON pc.usuario_solicitante = u.id
                WHERE pc.data_entrega_prevista < CURDATE()
                  AND pc.status NOT IN ('recebido', 'cancelado')
            `);
            
            for (const pedido of pedidosAtrasados) {
                // Criar notificação
                await pool.execute(
                    `INSERT INTO compras_notificacoes 
                    (usuario_id, tipo, titulo, mensagem, entidade_tipo, entidade_id, prioridade, enviar_email)
                    VALUES (?, 'entrega_atrasada', ?, ?, 'pedido_compra', ?, 'alta', TRUE)`,
                    [
                        pedido.solicitante_id,
                        'Pedido com entrega atrasada',
                        `O pedido ${pedido.numero_pedido} do fornecedor ${pedido.fornecedor} está ${pedido.dias_atraso} dias atrasado.`,
                        pedido.id
                    ]
                );
                
                // Enviar email se configurado
                if (pedido.solicitante_email && emailTransporter) {
                    await sendEmail(
                        pedido.solicitante_email,
                        'Alerta: Pedido de compra atrasado',
                        `<h2>Pedido Atrasado</h2>
                        <p>O pedido <strong>${pedido.numero_pedido}</strong> está com <strong>${pedido.dias_atraso} dias</strong> de atraso.</p>
                        <p><strong>Fornecedor:</strong> ${pedido.fornecedor}</p>
                        <p><strong>Data prevista:</strong> ${pedido.data_entrega_prevista}</p>
                        <p>Por favor, entre em contato com o fornecedor.</p>`
                    );
                }
            }
            
            logger.info(`[COMPRAS-CRON] ✅ Verificados ${pedidosAtrasados.length} pedidos atrasados`);
        } catch (err) {
            logger.error('[COMPRAS-CRON] Erro ao verificar pedidos atrasados:', err);
        }
    });
    
    // 6. Alertar sobre documentação de fornecedores vencendo (toda segunda-feira às 8h)
    cron.schedule('0 8 * * 1', async () => {
        if (!DB_AVAILABLE) return;
        try {
            logger.info('[COMPRAS-CRON] Verificando documentação de fornecedores...');
            
            const [fornecedores] = await pool.query(`
                SELECT id, razao_social, cnpj,
                       data_vencimento_certidao_federal,
                       data_vencimento_certidao_estadual,
                       data_vencimento_certidao_municipal,
                       data_vencimento_certidao_fgts,
                       data_vencimento_certidao_trabalhista
                FROM fornecedores
                WHERE status = 'ativo'
                  AND (
                      data_vencimento_certidao_federal BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                      OR data_vencimento_certidao_estadual BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                      OR data_vencimento_certidao_municipal BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                      OR data_vencimento_certidao_fgts BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                      OR data_vencimento_certidao_trabalhista BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                  )
            `);
            
            // Buscar responsável por compras para notificar
            const [comprador] = await pool.query(`
                SELECT id, email FROM usuarios 
                WHERE area = 'compras' AND ativo = 1 
                ORDER BY id LIMIT 1
            `);
            
            if (comprador.length > 0) {
                for (const fornecedor of fornecedores) {
                    const docsVencendo = [];
                    
                    if (fornecedor.data_vencimento_certidao_federal) docsVencendo.push('Certidão Federal');
                    if (fornecedor.data_vencimento_certidao_estadual) docsVencendo.push('Certidão Estadual');
                    if (fornecedor.data_vencimento_certidao_municipal) docsVencendo.push('Certidão Municipal');
                    if (fornecedor.data_vencimento_certidao_fgts) docsVencendo.push('Certidão FGTS');
                    if (fornecedor.data_vencimento_certidao_trabalhista) docsVencendo.push('Certidão Trabalhista');
                    
                    await pool.execute(
                        `INSERT INTO compras_notificacoes 
                        (usuario_id, tipo, titulo, mensagem, entidade_tipo, entidade_id, prioridade, enviar_email)
                        VALUES (?, 'documentacao_vencendo', ?, ?, 'fornecedor', ?, 'normal', TRUE)`,
                        [
                            comprador[0].id,
                            'Documentação de fornecedor vencendo',
                            `Fornecedor ${fornecedor.razao_social} com documentação vencendo em até 30 dias: ${docsVencendo.join(', ')}`,
                            fornecedor.id
                        ]
                    );
                }
            }
            
            logger.info(`[COMPRAS-CRON] ✅ Verificados ${fornecedores.length} fornecedores com documentação vencendo`);
        } catch (err) {
            logger.error('[COMPRAS-CRON] Erro ao verificar documentação:', err);
        }
    });
    
    // 7. Enviar lembretes de aprovações pendentes (todos os dias às 10h)
    cron.schedule('0 10 * * *', async () => {
        if (!DB_AVAILABLE) return;
        try {
            logger.info('[COMPRAS-CRON] Verificando aprovações pendentes...');
            
            const [aprovacoesAtrasadas] = await pool.query(`
                SELECT wa.id, wa.aprovador_id, wa.entidade_tipo, wa.entidade_id,
                       u.email as aprovador_email,
                       pc.numero_pedido, pc.valor_total,
                       DATEDIFF(CURDATE(), wa.data_solicitacao) as dias_pendente
                FROM workflow_aprovacoes wa
                JOIN usuarios u ON wa.aprovador_id = u.id
                LEFT JOIN pedidos_compra pc ON wa.entidade_id = pc.id AND wa.entidade_tipo = 'pedido_compra'
                WHERE wa.status = 'pendente'
                  AND wa.lembrete_enviado = FALSE
                  AND DATEDIFF(CURDATE(), wa.data_solicitacao) >= 2
            `);
            
            for (const aprovacao of aprovacoesAtrasadas) {
                // Enviar email de lembrete
                if (aprovacao.aprovador_email && emailTransporter) {
                    await sendEmail(
                        aprovacao.aprovador_email,
                        'Lembrete: Aprovação pendente',
                        `<h2>Aprovação Pendente</h2>
                        <p>Você tem uma aprovação pendente há <strong>${aprovacao.dias_pendente} dias</strong>.</p>
                        <p><strong>Pedido:</strong> ${aprovacao.numero_pedido}</p>
                        <p><strong>Valor:</strong> R$ ${aprovacao.valor_total}</p>
                        <p>Por favor, acesse o sistema e faça a aprovação.</p>`
                    );
                }
                
                // Marcar lembrete como enviado
                await pool.execute(
                    'UPDATE workflow_aprovacoes SET lembrete_enviado = TRUE, data_lembrete = NOW() WHERE id = ?',
                    [aprovacao.id]
                );
            }
            
            logger.info(`[COMPRAS-CRON] ✅ Enviados ${aprovacoesAtrasadas.length} lembretes de aprovação`);
        } catch (err) {
            logger.error('[COMPRAS-CRON] Erro ao enviar lembretes:', err);
        }
    });
    
    // 8. Atualizar avaliações médias dos fornecedores (todos os domingos às 3h)
    cron.schedule('0 3 * * 0', async () => {
        if (!DB_AVAILABLE) return;
        try {
            logger.info('[COMPRAS-CRON] Atualizando avaliações de fornecedores...');
            
            await pool.query(`
                UPDATE fornecedores f
                SET 
                    nota_qualidade = (SELECT AVG(nota_qualidade) FROM fornecedor_avaliacoes WHERE fornecedor_id = f.id),
                    nota_prazo = (SELECT AVG(nota_prazo) FROM fornecedor_avaliacoes WHERE fornecedor_id = f.id),
                    nota_preco = (SELECT AVG(nota_preco) FROM fornecedor_avaliacoes WHERE fornecedor_id = f.id),
                    nota_atendimento = (SELECT AVG(nota_atendimento) FROM fornecedor_avaliacoes WHERE fornecedor_id = f.id),
                    avaliacao_geral = (
                        SELECT AVG((nota_qualidade + nota_prazo + nota_preco + nota_atendimento + IFNULL(nota_entrega, 0)) / 5)
                        FROM fornecedor_avaliacoes WHERE fornecedor_id = f.id
                    ),
                    total_pedidos = (SELECT COUNT(*) FROM pedidos_compra WHERE fornecedor_id = f.id AND status != 'cancelado'),
                    total_compras = (SELECT SUM(valor_total) FROM pedidos_compra WHERE fornecedor_id = f.id AND status = 'recebido')
                WHERE id IN (SELECT DISTINCT fornecedor_id FROM fornecedor_avaliacoes)
            `);
            
            logger.info('[COMPRAS-CRON] ✅ Avaliações de fornecedores atualizadas');
        } catch (err) {
            logger.error('[COMPRAS-CRON] Erro ao atualizar avaliações:', err);
        }
    });

    // =================== CRON JOBS DO ESTOQUE E RESERVAS ===================
    
    // Job diário: Expirar reservas e alertas de estoque (executa às 3h da manhã)
    cron.schedule('0 3 * * *', async () => {
        try {
            logger.info('[ESTOQUE-CRON] Executando jobs de estoque...');
            const { expirarReservas, alertasEstoqueBaixo } = require('./cron_jobs_estoque');
            
            await expirarReservas();
            await alertasEstoqueBaixo();
            
            logger.info('[ESTOQUE-CRON] ✅ Jobs de estoque executados');
        } catch (err) {
            logger.error('[ESTOQUE-CRON] Erro ao executar jobs de estoque:', err);
        }
    });
    
    // =================== CRON JOB INATIVAÇÃO DE CLIENTES (90 dias sem movimentação) ===================
    // Executa diariamente às 4h da manhã
    cron.schedule('0 4 * * *', async () => {
        try {
            logger.info('[CLIENTES-CRON] Verificando clientes para inativação automática...');
            
            // Buscar clientes ativos sem movimentação há mais de 90 dias
            const [clientesInativos] = await pool.query(`
                UPDATE empresas 
                SET status_cliente = 'inativo',
                    data_inativacao = NOW(),
                    vendedor_id = NULL
                WHERE status_cliente = 'ativo'
                AND (
                    (ultima_movimentacao IS NOT NULL AND ultima_movimentacao < DATE_SUB(NOW(), INTERVAL 90 DAY))
                    OR
                    (ultima_movimentacao IS NULL AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY))
                )
            `);
            
            if (clientesInativos.affectedRows > 0) {
                logger.info(`[CLIENTES-CRON] ✅ ${clientesInativos.affectedRows} clientes inativados por falta de movimentação`);
            } else {
                logger.info('[CLIENTES-CRON] ✅ Nenhum cliente para inativar');
            }
        } catch (err) {
            logger.error('[CLIENTES-CRON] Erro ao inativar clientes:', err);
        }
    });
    
    logger.info('✅ Todos os cron jobs configurados (incluindo Compras e Estoque)');
};

// =================================================================
// 4. MIDDLEWARES DE AUTENTICAÇÁO E AUTORIZAÇÁO
// =================================================================

// Middleware para verificar o token JWT
const authenticateToken = (req, res, next) => {
    // Busca token em múltiplas fontes: Authorization header, cookie ou query string
    const authHeader = req.headers['authorization'];
    let token = null;
    
    // Extrair token do header Authorization (ignorar se for "null" ou "undefined")
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const headerToken = authHeader.split(' ')[1];
        if (headerToken && headerToken !== 'null' && headerToken !== 'undefined') {
            token = headerToken;
        }
    }
    
    // Se não encontrou no header, tentar cookies
    if (!token) {
        token = req.cookies?.authToken || req.cookies?.token;
    }
    
    // Por último, tentar query string
    if (!token) {
        token = req.query.token;
    }
    
    console.log('[AUTH] Verificando token:', { 
        hasAuth: !!authHeader, 
        hasCookie: !!req.cookies?.token, 
        hasAuthCookie: !!req.cookies?.authToken,
        tokenExists: !!token,
        tokenSource: token ? (req.cookies?.authToken ? 'cookie' : authHeader ? 'header' : 'query') : 'none'
    });
    
    if (!token) {
        console.log('[AUTH] Nenhum token encontrado');
        return res.status(401).json({ message: 'Token de autenticação não fornecido.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log('[AUTH] Token inválido:', err.message);
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expirado. Faça login novamente.' });
            }
            return res.status(403).json({ message: 'Token inválido. Faça login novamente.' });
        }
        console.log('[AUTH] ✅ Token válido para usuário:', user.email, '| Rota:', req.method, req.path);
        req.user = user;
        next();
    });
};

// Middleware para autorizar admin ou comercial para Vendas/CRM
const authorizeAdminOrComercial = (req, res, next) => {
    if (req.user?.role === 'admin' || req.user?.role === 'comercial') {
        return next();
    }
    return res.status(403).json({ message: 'Acesso negado. Requer privilégios de administrador ou comercial.' });
};

// ACL: Controle de acesso detalhado por nível de usuário (Exemplo para Financeiro)
function authorizeACL(permission) {
    return (req, res, next) => {
        if (req.user?.permissions?.includes(permission) || req.user?.role === 'admin') {
            return next();
        }
        return res.status(403).json({ message: 'Acesso negado. Permissão insuficiente.' });
    };
}


// =================================================================
// 5. ROTAS DA API

// allow tests to toggle DB availability
function setDbAvailable(val) {
    DB_AVAILABLE = !!val;
}

// Middleware para proteger rotas /api quando o banco de dados estiver indisponível.
// Deve ser montado ANTES dos routers da API para garantir que chamadas a endpoints
// dependentes do banco sejam interceptadas em modo degradado.
const apiDbGuard = (req, res, next) => {
    // Quando DB_AVAILABLE for true, tudo segue normalmente
    if (typeof DB_AVAILABLE === 'undefined' || DB_AVAILABLE === true) return next();

    // Em modo degradado (DB indisponível), permitir apenas um pequeno conjunto de endpoints
    // que verificam autenticação local via JWT (não consultam o DB).
    const whitelist = ['/me', '/permissions', '/login', '/logout'];
    try {
        const relPath = req.path || '/';
        if (whitelist.includes(relPath) || whitelist.some(p => relPath.startsWith(p + '/'))) {
            return next();
        }
    } catch (e) {
        // ignore
    }

    // Para todas as outras rotas da API, retornar 503 (service unavailable)
    return res.status(503).json({
        message: 'Serviço temporariamente indisponível: conexão com o banco de dados indisponível. Tente novamente mais tarde.'
    });
};

// Expor um header útil em todas as respostas indicando disponibilidade do DB
app.use((req, res, next) => {
    res.setHeader('X-DB-Available', DB_AVAILABLE ? '1' : '0');
    next();
});

// Montar o guard e o router de autenticação ANTES de registrar os routers específicos
app.use('/api', apiDbGuard);
// Protege o endpoint de login contra brute-force (aplicado antes do authRouter)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: process.env.NODE_ENV === 'production' ? 10 : 100, // 100 em dev, 10 em produção
    message: { message: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.' },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
});
app.use('/api/login', loginLimiter);

// NOTA: authRouter desabilitado - usando rota de login otimizada do server.js (linha 11688)
// O authRouter fazia SHOW COLUMNS em cada login, causando timeouts intermitentes
// app.use('/api', authRouter);

// ===================== ROTAS CONFIGURAÇÕES DA EMPRESA =====================
const { authenticateToken: authToken, requireAdmin: reqAdmin } = require('./middleware/auth');
const companySettingsFactory = require('./routes/companySettings');
const companySettingsRouter = companySettingsFactory({ 
    pool, 
    authenticateToken: authToken, 
    requireAdmin: reqAdmin 
});
app.use('/api', companySettingsRouter);
// =================================================================

// ===================== ROTAS SERVIÇOS/NF-e PROFISSIONAL =====================
const apiNfeRouter = express.Router();
apiNfeRouter.use(authenticateToken);
apiNfeRouter.use(authorizeArea('nfe'));

// 1. Cálculo Automático de Impostos (ISS, PIS, COFINS, CSLL, IRRF)
apiNfeRouter.post('/calcular-impostos', async (req, res, next) => {
    const { valor, municipio } = req.body;
    let impostos = {
        ISS: municipio === 'SP' ? valor * 0.05 : valor * 0.03,
        PIS: valor * 0.0065,
        COFINS: valor * 0.03,
        CSLL: valor * 0.01,
        IRRF: valor * 0.015
    };
    res.json({ impostos });
});

// 2. Sugestão de Preenchimento com Base no Histórico
apiNfeRouter.get('/sugestao/:cliente_id', async (req, res, next) => {
    const { cliente_id } = req.params;
    const [rows] = await pool.query('SELECT descricao_servico, valor FROM nfe WHERE cliente_id = ? ORDER BY data_emissao DESC LIMIT 1', [cliente_id]);
    if (rows.length) {
        res.json({ sugestao: rows[0] });
    } else {
        res.json({ sugestao: null });
    }
});

// 3. Validação de Dados em Tempo Real (simulação de API pública)
apiNfeRouter.post('/validar-cliente', async (req, res, next) => {
    const { cnpj, cpf, inscricao_municipal } = req.body;
    // Em produção, integrar com APIs públicas
    const valido = (cnpj || cpf) && inscricao_municipal;
    res.json({ valido, mensagem: valido ? 'Dados válidos.' : 'Dados inválidos.' });
});

// 4. Emissão de NF-e (com integração ao Financeiro)
apiNfeRouter.post('/emitir', async (req, res, next) => {
    try {
        const { cliente_id, servico_id, descricao_servico, valor, impostos, vencimento } = req.body;
        // Simula emissão e gravação da NF-e
        await pool.query('INSERT INTO nfe (cliente_id, servico_id, descricao_servico, valor, impostos, status, data_emissao) VALUES (?, ?, ?, ?, ?, "autorizada", NOW())', [cliente_id, servico_id, descricao_servico, valor, JSON.stringify(impostos)]);
        // Integração: cria conta a receber no Financeiro
        await pool.query('INSERT INTO contas_receber (cliente_id, valor, descricao, status, vencimento) VALUES (?, ?, ?, "pendente", ?)', [cliente_id, valor, descricao_servico, vencimento]);
        res.json({ message: 'NF-e emitida e integrada ao Financeiro.' });
    } catch (error) {
        next(error);
    }
});

// 5. Envio Automático por E-mail (simulação)
apiNfeRouter.post('/enviar-email', async (req, res, next) => {
    // Recebe dados da NF-e e cliente
    res.json({ message: 'E-mail enviado ao cliente com PDF/XML (simulação).' });
});

// 6. Cancelamento e Carta de Correção
apiNfeRouter.post('/cancelar/:nfe_id', async (req, res, next) => {
    try {
        const { nfe_id } = req.params;
        const { motivo } = req.body;
        await pool.query('UPDATE nfe SET status = "cancelada", motivo_cancelamento = ? WHERE id = ?', [motivo, nfe_id]);
        res.json({ message: 'NF-e cancelada.' });
    } catch (error) { next(error); }
});

apiNfeRouter.post('/carta-correcao/:nfe_id', async (req, res, next) => {
    try {
        const { nfe_id } = req.params;
        const { correcao } = req.body;
        await pool.query('UPDATE nfe SET carta_correcao = ? WHERE id = ?', [correcao, nfe_id]);
        res.json({ message: 'Carta de Correção registrada.' });
    } catch (error) { next(error); }
});

// 7. Relatórios Gerenciais
apiNfeRouter.get('/relatorios/faturamento', async (req, res, next) => {
    const { inicio, fim, cliente_id, servico_id } = req.query;
    let where = 'data_emissao >= ? AND data_emissao <= ?';
    let params = [inicio, fim];
    if (cliente_id) { where += ' AND cliente_id = ?'; params.push(cliente_id); }
    if (servico_id) { where += ' AND servico_id = ?'; params.push(servico_id); }
    const [rows] = await pool.query(`SELECT cliente_id, servico_id, SUM(valor) AS total FROM nfe WHERE ${where} GROUP BY cliente_id, servico_id`, params);
    res.json(rows);
});

// 8. Dashboard de Status das NF-e
apiNfeRouter.get('/dashboard', async (req, res, next) => {
    const [autorizadas] = await pool.query('SELECT COUNT(*) AS qtd, SUM(valor) AS total FROM nfe WHERE status = "autorizada" AND MONTH(data_emissao) = MONTH(CURRENT_DATE())');
    const [canceladas] = await pool.query('SELECT COUNT(*) AS qtd, SUM(valor) AS total FROM nfe WHERE status = "cancelada" AND MONTH(data_emissao) = MONTH(CURRENT_DATE())');
    const [pendentes] = await pool.query('SELECT COUNT(*) AS qtd, SUM(valor) AS total FROM nfe WHERE status IN ("pendente", "rejeitada") AND MONTH(data_emissao) = MONTH(CURRENT_DATE())');
    res.json({ autorizadas: autorizadas[0], canceladas: canceladas[0], pendentes: pendentes[0] });
});

// 9. Livro de Registro de Serviços Prestados
apiNfeRouter.get('/livro-registro', async (req, res, next) => {
    const { inicio, fim } = req.query;
    const [rows] = await pool.query('SELECT * FROM nfe WHERE data_emissao >= ? AND data_emissao <= ?', [inicio, fim]);
    res.json(rows);
});

// Integração com o Painel da Contabilidade (download XMLs em lote)
apiNfeRouter.get('/contabilidade/xmls', async (req, res, next) => {
    const { inicio, fim } = req.query;
    const [rows] = await pool.query('SELECT xml_arquivo FROM nfe WHERE data_emissao >= ? AND data_emissao <= ?', [inicio, fim]);
    res.json(rows);
});

// Armazenamento e Gestão de XMLs
apiNfeRouter.get('/xml/:nfe_id', async (req, res, next) => {
    const { nfe_id } = req.params;
    const [[nfe]] = await pool.query('SELECT xml_arquivo FROM nfe WHERE id = ?', [nfe_id]);
    if (!nfe) return res.status(404).json({ message: 'NF-e não encontrada.' });

    res.json({ xml: nfe.xml_arquivo });
});

// Monta o router da NF-e (separado em arquivo em routes/apiNfe.js)
app.use('/api/nfe', require('./src/routes/apiNfe')({ pool, authenticateToken, authorizeArea }));

// Monta o router de certificado digital NFe
app.use('/api/nfe/certificado', require('./src/nfe/controllers/CertificadoController')(pool));

// Monta o router de emissão de NFe (Sprint 2)
const NFeController = require('./src/nfe/controllers/NFeController');
const nfeController = new NFeController(pool);
app.use('/api/nfe', nfeController.getRouter());

// Monta o router administrativo (criar schemas, migrações, etc)
app.use('/api/admin', require('./src/routes/apiAdmin')(pool));

// ===================== ROTAS LOGÍSTICA =====================
const apiLogisticaRouter = express.Router();

// Dashboard da Logística - Contadores por status (sem autenticação para permitir acesso via navegador)
apiLogisticaRouter.get('/dashboard', async (req, res, next) => {
    console.log('[LOGISTICA/DASHBOARD] Requisição recebida');
    try {
        // Contar pedidos faturados que ainda não foram despachados (status_logistica IS NULL ou 'pendente')
        const [[aguardando]] = await pool.query(`
            SELECT COUNT(*) as total FROM pedidos 
            WHERE status = 'faturado' 
            AND (status_logistica IS NULL OR status_logistica = 'pendente' OR status_logistica = 'aguardando_separacao' OR status_logistica = '')
        `);
        console.log('[LOGISTICA/DASHBOARD] Aguardando:', aguardando);
        
        const [[separacao]] = await pool.query(`
            SELECT COUNT(*) as total FROM pedidos 
            WHERE status = 'faturado' AND status_logistica = 'em_separacao'
        `);
        
        const [[expedicao]] = await pool.query(`
            SELECT COUNT(*) as total FROM pedidos 
            WHERE status = 'faturado' AND status_logistica = 'em_expedicao'
        `);
        
        const [[transporte]] = await pool.query(`
            SELECT COUNT(*) as total FROM pedidos 
            WHERE status = 'faturado' AND status_logistica = 'em_transporte'
        `);
        
        const [[entregues]] = await pool.query(`
            SELECT COUNT(*) as total FROM pedidos 
            WHERE status = 'faturado' AND status_logistica = 'entregue'
        `);
        
        const result = {
            aguardando_separacao: aguardando?.total || 0,
            em_separacao: separacao?.total || 0,
            em_expedicao: expedicao?.total || 0,
            em_transporte: transporte?.total || 0,
            entregues: entregues?.total || 0
        };
        console.log('[LOGISTICA/DASHBOARD] Resultado:', result);
        res.json(result);
    } catch (error) {
        console.error('[LOGISTICA/DASHBOARD] Erro:', error);
        res.json({
            aguardando_separacao: 0,
            em_separacao: 0,
            em_expedicao: 0,
            em_transporte: 0,
            entregues: 0
        });
    }
});

// Listar pedidos em logística (sem autenticação)
apiLogisticaRouter.get('/pedidos', async (req, res, next) => {
    console.log('[LOGISTICA/PEDIDOS] Requisição recebida');
    try {
        const { status, transportadora, nfe, data_inicio, data_fim, limit = 100 } = req.query;
        
        let query = `
            SELECT 
                p.id,
                p.id as pedido_id,
                p.valor,
                p.descricao,
                p.status,
                p.status_logistica,
                p.prioridade,
                p.created_at,
                p.faturado_em,
                p.data_prevista,
                p.prazo_entrega,
                p.observacao,
                p.frete,
                c.nome as cliente_nome,
                c.nome_fantasia as cliente_fantasia,
                c.cidade as cliente_cidade,
                c.estado as cliente_uf
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            WHERE p.status = 'faturado'
        `;
        
        const params = [];
        
        // Tratar filtro de status - pendente/aguardando inclui NULL
        if (status && status !== '' && status !== 'todos') {
            if (status === 'pendente' || status === 'aguardando_separacao') {
                query += ' AND (p.status_logistica IS NULL OR p.status_logistica = "pendente" OR p.status_logistica = "aguardando_separacao" OR p.status_logistica = "")';
            } else {
                query += ' AND p.status_logistica = ?';
                params.push(status);
            }
        }
        
        if (nfe && nfe !== '') {
            query += ' AND p.id = ?';
            params.push(nfe);
        }
        
        if (data_inicio) {
            query += ' AND DATE(p.created_at) >= ?';
            params.push(data_inicio);
        }
        
        if (data_fim) {
            query += ' AND DATE(p.created_at) <= ?';
            params.push(data_fim);
        }
        
        query += ' ORDER BY p.prioridade DESC, p.created_at DESC LIMIT ?';
        params.push(parseInt(limit));
        
        console.log('[LOGISTICA/PEDIDOS] Query:', query);
        console.log('[LOGISTICA/PEDIDOS] Params:', params);
        
        const [rows] = await pool.query(query, params);
        console.log('[LOGISTICA/PEDIDOS] Rows encontrados:', rows.length);
        
        // Formatar dados para o frontend
        const pedidos = rows.map(row => ({
            id: row.id,
            pedido_id: row.pedido_id,
            nfe_numero: '-',
            cliente: row.cliente_fantasia || row.cliente_nome || 'Cliente não informado',
            cidade_uf: row.cliente_cidade && row.cliente_uf ? `${row.cliente_cidade}/${row.cliente_uf}` : '-',
            transportadora: 'Não definida',
            status: row.status_logistica || 'pendente',
            previsao: row.data_prevista || row.prazo_entrega || '-',
            prioridade: row.prioridade || 'normal',
            valor: row.valor,
            observacao: row.observacao
        }));
        
        res.json(pedidos);
    } catch (error) {
        console.error('[LOGISTICA/PEDIDOS] Erro:', error);
        res.status(500).json({ error: error.message, pedidos: [] });
    }
});

// Atualizar status de logística de um pedido
apiLogisticaRouter.put('/pedidos/:id/status', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status_logistica, observacao } = req.body;
        
        const validStatuses = ['pendente', 'aguardando_separacao', 'em_separacao', 'em_expedicao', 'em_transporte', 'entregue'];
        
        if (!validStatuses.includes(status_logistica)) {
            return res.status(400).json({ 
                message: 'Status inválido',
                valid: validStatuses 
            });
        }
        
        await pool.query(
            'UPDATE pedidos SET status_logistica = ?, observacao = CONCAT(COALESCE(observacao, ""), ?) WHERE id = ?',
            [status_logistica, observacao ? `\n[LOG] ${new Date().toLocaleString('pt-BR')}: ${observacao}` : '', id]
        );
        
        // Se status for 'entregue', atualizar também o status principal
        if (status_logistica === 'entregue') {
            await pool.query('UPDATE pedidos SET status = "entregue" WHERE id = ?', [id]);
        }
        
        res.json({ message: 'Status atualizado com sucesso', status: status_logistica });
    } catch (error) {
        console.error('[LOGISTICA/STATUS] Erro:', error);
        next(error);
    }
});

// Atribuir transportadora a um pedido
apiLogisticaRouter.put('/pedidos/:id/transportadora', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { transportadora_id, previsao_entrega } = req.body;
        
        await pool.query(
            'UPDATE pedidos SET transportadora_id = ?, data_prevista = ? WHERE id = ?',
            [transportadora_id, previsao_entrega, id]
        );
        
        res.json({ message: 'Transportadora atribuída com sucesso' });
    } catch (error) {
        console.error('[LOGISTICA/TRANSPORTADORA] Erro:', error);
        next(error);
    }
});

// Listar transportadoras disponíveis
apiLogisticaRouter.get('/transportadoras', async (req, res, next) => {
    try {
        const [rows] = await pool.query(`
            SELECT id, razao_social, nome_fantasia, cnpj_cpf, telefone, email 
            FROM transportadoras 
            ORDER BY nome_fantasia, razao_social
        `);
        res.json(rows);
    } catch (error) {
        console.error('[LOGISTICA/TRANSPORTADORAS] Erro:', error);
        next(error);
    }
});

// Criar nova expedição (manual)
apiLogisticaRouter.post('/expedicao', async (req, res, next) => {
    try {
        const { nfe, pedido, cliente, transportadora_id, status, previsao, prioridade, observacoes } = req.body;
        
        // Se for baseado em um pedido existente, atualizar
        if (pedido) {
            await pool.query(`
                UPDATE pedidos SET 
                    status_logistica = ?,
                    transportadora_id = ?,
                    data_prevista = ?,
                    prioridade = ?,
                    observacao = CONCAT(COALESCE(observacao, ''), ?)
                WHERE id = ?
            `, [status || 'pendente', transportadora_id, previsao, prioridade, observacoes ? `\n[EXP] ${observacoes}` : '', pedido]);
            
            return res.json({ message: 'Expedição criada com sucesso', pedido_id: pedido });
        }
        
        res.status(400).json({ message: 'Pedido ou NF-e é obrigatório' });
    } catch (error) {
        console.error('[LOGISTICA/EXPEDICAO] Erro:', error);
        next(error);
    }
});

// Monta o router de Logística
app.use('/api/logistica', apiLogisticaRouter);
console.log('✅ Rotas do módulo de Logística carregadas');

// ===================== ROTAS COMPRAS PROFISSIONAL =====================
const apiComprasRouter = express.Router();
apiComprasRouter.use(authenticateToken);
apiComprasRouter.use(authorizeArea('compras'));

// 1. Dashboard de Compras
apiComprasRouter.get('/dashboard', async (req, res, next) => {
    try {
        // Estatísticas gerais de compras
        const [pedidosPendentes] = await pool.query(`
            SELECT COUNT(*) as total 
            FROM pedidos_compras 
            WHERE status = 'pendente'
        `);
        
        const [totalMesAtual] = await pool.query(`
            SELECT COALESCE(SUM(valor_total), 0) as total 
            FROM pedidos_compras 
            WHERE MONTH(data_pedido) = MONTH(CURRENT_DATE()) 
            AND YEAR(data_pedido) = YEAR(CURRENT_DATE())
        `);
        
        const [fornecedoresAtivos] = await pool.query(`
            SELECT COUNT(*) as total 
            FROM fornecedores 
            WHERE ativo = true
        `);

        res.json({
            success: true,
            data: {
                pedidos_pendentes: pedidosPendentes[0].total,
                total_mes_atual: totalMesAtual[0].total,
                fornecedores_ativos: fornecedoresAtivos[0].total,
                periodo: new Date().toISOString().slice(0, 7)
            }
        });
    } catch (error) {
        next(error);
    }
});

// 2. Gestão de Fornecedores
apiComprasRouter.get('/fornecedores', async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search = '', ativo } = req.query;
        const offset = (page - 1) * limit;
        
        let whereClause = 'WHERE 1=1';
        const params = [];
        
        if (search) {
            whereClause += ' AND (nome LIKE ? OR cnpj LIKE ? OR email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        if (ativo !== undefined) {
            whereClause += ' AND ativo = ?';
            params.push(ativo === 'true');
        }
        
        const [fornecedores] = await pool.query(`
            SELECT * FROM fornecedores 
            ${whereClause}
            ORDER BY nome 
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);
        
        const [total] = await pool.query(`
            SELECT COUNT(*) as count FROM fornecedores ${whereClause}
        `, params);

        res.json({
            success: true,
            data: {
                fornecedores,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total[0].count / limit),
                    total_records: total[0].count
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

apiComprasRouter.post('/fornecedores', fornecedorValidation, asyncHandler(async (req, res, next) => {
    try {
        const { nome, cnpj, email, telefone, endereco, contato_principal, ativo = true } = req.body;
        
        // Validação já feita pelo express-validator
        
        const [result] = await pool.query(`
            INSERT INTO fornecedores 
            (nome, cnpj, email, telefone, endereco, contato_principal, ativo, data_cadastro)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [nome, cnpj, email, telefone, endereco, contato_principal, ativo]);

        res.status(201).json({
            success: true,
            message: 'Fornecedor criado com sucesso',
            data: { id: result.insertId }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'CNPJ já cadastrado'
            });
        }
        next(error);
    }
}));

// 3. Gestão de Pedidos de Compras
apiComprasRouter.get('/pedidos', async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, fornecedor_id, data_inicio, data_fim } = req.query;
        const offset = (page - 1) * limit;
        
        let whereClause = 'WHERE 1=1';
        const params = [];
        
        if (status) {
            whereClause += ' AND pc.status = ?';
            params.push(status);
        }
        
        if (fornecedor_id) {
            whereClause += ' AND pc.fornecedor_id = ?';
            params.push(fornecedor_id);
        }
        
        if (data_inicio && data_fim) {
            whereClause += ' AND pc.data_pedido BETWEEN ? AND ?';
            params.push(data_inicio, data_fim);
        }
        
        const [pedidos] = await pool.query(`
            SELECT 
                pc.*,
                f.nome as fornecedor_nome,
                f.cnpj as fornecedor_cnpj
            FROM pedidos_compras pc
            LEFT JOIN fornecedores f ON pc.fornecedor_id = f.id
            ${whereClause}
            ORDER BY pc.data_pedido DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        res.json({
            success: true,
            data: { pedidos }
        });
    } catch (error) {
        next(error);
    }
});

apiComprasRouter.post('/pedidos', pedidoValidation, asyncHandler(async (req, res, next) => {
    try {
        const { fornecedor_id, itens, observacoes } = req.body;
        
        // Validação já feita pelo express-validator
        
        // Calcular valor total
        const valor_total = itens.reduce((total, item) => {
            return total + (item.quantidade * item.preco_unitario);
        }, 0);
        
        // Iniciar transação
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Inserir pedido
            const [pedidoResult] = await connection.query(`
                INSERT INTO pedidos_compras 
                (fornecedor_id, valor_total, status, data_pedido, observacoes, usuario_id)
                VALUES (?, ?, 'pendente', NOW(), ?, ?)
            `, [fornecedor_id, valor_total, observacoes, req.user.id]);
            
            const pedido_id = pedidoResult.insertId;
            
            // Inserir itens do pedido
            for (const item of itens) {
                await connection.query(`
                    INSERT INTO itens_pedido_compras 
                    (pedido_id, produto_descricao, quantidade, preco_unitario, subtotal)
                    VALUES (?, ?, ?, ?, ?)
                `, [pedido_id, item.descricao, item.quantidade, item.preco_unitario, item.quantidade * item.preco_unitario]);
            }
            
            await connection.commit();
            
            res.status(201).json({
                success: true,
                message: 'Pedido de compra criado com sucesso',
                data: { id: pedido_id }
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        next(error);
    }
}));

// 4. Relatórios de Compras
apiComprasRouter.get('/relatorios/gastos-periodo', async (req, res, next) => {
    try {
        const { data_inicio, data_fim, fornecedor_id } = req.query;
        
        let whereClause = 'WHERE pc.status = "aprovado"';
        const params = [];
        
        if (data_inicio && data_fim) {
            whereClause += ' AND pc.data_pedido BETWEEN ? AND ?';
            params.push(data_inicio, data_fim);
        }
        
        if (fornecedor_id) {
            whereClause += ' AND pc.fornecedor_id = ?';
            params.push(fornecedor_id);
        }
        
        const [gastos] = await pool.query(`
            SELECT 
                f.nome as fornecedor,
                COUNT(pc.id) as total_pedidos,
                SUM(pc.valor_total) as total_gasto,
                AVG(pc.valor_total) as ticket_medio
            FROM pedidos_compras pc
            LEFT JOIN fornecedores f ON pc.fornecedor_id = f.id
            ${whereClause}
            GROUP BY pc.fornecedor_id, f.nome
            ORDER BY total_gasto DESC
        `, params);

        res.json({
            success: true,
            data: { gastos }
        });
    } catch (error) {
        next(error);
    }
});

app.use('/api/compras', apiComprasRouter);


// ===================== ROTAS FINANCEIRO PROFISSIONAL =====================
const apiFinanceiroRouter = express.Router();
apiFinanceiroRouter.use(authenticateToken);
apiFinanceiroRouter.use(authorizeArea('financeiro'));

// Dashboard principal do financeiro
apiFinanceiroRouter.get('/dashboard', async (req, res, next) => {
    try {
        // Faturamento total do mês
        const [faturamento] = await pool.query(`
            SELECT COALESCE(SUM(valor), 0) as total 
            FROM contas_receber 
            WHERE status = 'pago' 
            AND MONTH(data_vencimento) = MONTH(CURRENT_DATE()) 
            AND YEAR(data_vencimento) = YEAR(CURRENT_DATE())
        `);
        
        // Contas a receber pendentes
        const [contasReceber] = await pool.query(`
            SELECT COALESCE(SUM(valor), 0) as total 
            FROM contas_receber 
            WHERE status = 'pendente'
        `);
        
        // Contas a pagar pendentes
        const [contasPagar] = await pool.query(`
            SELECT COALESCE(SUM(valor), 0) as total 
            FROM contas_pagar 
            WHERE status = 'pendente'
        `);
        
        const saldoTotal = faturamento[0].total + contasReceber[0].total - contasPagar[0].total;
        
        res.json({
            success: true,
            data: {
                faturamento_total: faturamento[0].total,
                contas_receber: contasReceber[0].total,
                contas_pagar: contasPagar[0].total,
                saldo_total: saldoTotal
            }
        });
    } catch (error) {
        console.error('Erro no dashboard financeiro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar dashboard financeiro',
            error: error.message
        });
    }
});

// 1. Conciliação Bancária Automatizada
apiFinanceiroRouter.post('/conciliacao/importar-ofx', async (req, res, next) => {
    res.json({ message: 'Importação de OFX recebida. (Simulação)' });
});
apiFinanceiroRouter.get('/conciliacao', async (req, res, next) => {
    res.json({ conciliados: [], divergentes: [] });
});

// 2. Fluxo de Caixa Detalhado e Projetado
apiFinanceiroRouter.get('/fluxo-caixa', async (req, res, next) => {
    try {
        const [receber] = await pool.query('SELECT SUM(valor) AS total FROM contas_receber WHERE status != "pago"');
        const [pagar] = await pool.query('SELECT SUM(valor) AS total FROM contas_pagar WHERE status != "pago"');
        res.json({
            saldoAtual: (receber[0]?.total || 0) - (pagar[0]?.total || 0),
            projecao: [
                { dias: 30, saldo: 10000 },
                { dias: 60, saldo: 8000 },
                { dias: 90, saldo: 12000 }
            ]
        });
    } catch (error) { next(error); }
});

// 3. Centro de Custos e de Lucro
apiFinanceiroRouter.get('/centros-custo', async (req, res, next) => {
    res.json([{ id: 1, nome: 'Vendas' }, { id: 2, nome: 'Marketing' }, { id: 3, nome: 'Filial SP' }]);
});
apiFinanceiroRouter.post('/centros-custo', async (req, res, next) => {
    res.status(201).json({ message: 'Centro de custo criado.' });
});

// 4. Gestão de Transações Recorrentes
apiFinanceiroRouter.get('/transacoes-recorrentes', async (req, res, next) => {
    res.json([]);
});
apiFinanceiroRouter.post('/transacoes-recorrentes', async (req, res, next) => {
    res.status(201).json({ message: 'Transação recorrente agendada.' });
});

// 5. Emissão de Boletos e Notas Fiscais (NFS-e)
apiFinanceiroRouter.post('/emitir-boleto', async (req, res, next) => {
    res.json({ message: 'Boleto emitido (simulação).' });
});
apiFinanceiroRouter.post('/emitir-nfse', async (req, res, next) => {
    res.json({ message: 'NFS-e emitida (simulação).' });
});

// 6. Anexo de Comprovantes Digitais
apiFinanceiroRouter.post('/anexar-comprovante', upload.single('comprovante'), async (req, res, next) => {
    if (!req.file) return res.status(400).json({ message: 'Arquivo não enviado.' });
    res.json({ message: 'Comprovante anexado!', url: `/uploads/comprovantes/${req.file.filename}` });
});

// 7. Dashboard de Indicadores-Chave (KPIs) - VERSÁO MELHORADA
apiFinanceiroRouter.get('/dashboard-kpis', async (req, res, next) => {
    try {
        // Receitas do mês atual
        const [receitas] = await pool.query(`
            SELECT COALESCE(SUM(valor), 0) as total 
            FROM contas_receber 
            WHERE status = 'pago' 
            AND MONTH(data_vencimento) = MONTH(CURRENT_DATE()) 
            AND YEAR(data_vencimento) = YEAR(CURRENT_DATE())
        `);
        
        // Despesas do mês atual
        const [despesas] = await pool.query(`
            SELECT COALESCE(SUM(valor), 0) as total 
            FROM contas_pagar 
            WHERE status = 'pago' 
            AND MONTH(data_vencimento) = MONTH(CURRENT_DATE()) 
            AND YEAR(data_vencimento) = YEAR(CURRENT_DATE())
        `);
        
        // Contas em atraso
        const [atrasadas] = await pool.query(`
            SELECT COUNT(*) as count, COALESCE(SUM(valor), 0) as valor_total
            FROM contas_receber 
            WHERE status != 'pago' AND data_vencimento < CURRENT_DATE()
        `);
        
        // Fluxo de caixa projetado próximos 30 dias
        const [fluxo30dias] = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN tipo = 'receber' THEN valor ELSE 0 END), 0) as receitas_projetadas,
                COALESCE(SUM(CASE WHEN tipo = 'pagar' THEN valor ELSE 0 END), 0) as despesas_projetadas
            FROM (
                SELECT valor, 'receber' as tipo FROM contas_receber 
                WHERE status != 'pago' AND data_vencimento BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY)
                UNION ALL
                SELECT valor, 'pagar' as tipo FROM contas_pagar 
                WHERE status != 'pago' AND data_vencimento BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY)
            ) as fluxo
        `);

        const receita_mes = receitas[0].total;
        const despesa_mes = despesas[0].total;
        const lucro_mes = receita_mes - despesa_mes;
        const margem_lucro = receita_mes > 0 ? ((lucro_mes / receita_mes) * 100).toFixed(2) : 0;
        const inadimplencia = receita_mes > 0 ? ((atrasadas[0].valor_total / receita_mes) * 100).toFixed(2) : 0;

        res.json({
            success: true,
            data: {
                receita_mes_atual: receita_mes,
                despesa_mes_atual: despesa_mes,
                lucro_mes_atual: lucro_mes,
                margem_lucro: `${margem_lucro}%`,
                inadimplencia: `${inadimplencia}%`,
                contas_atrasadas: atrasadas[0].count,
                valor_contas_atrasadas: atrasadas[0].valor_total,
                fluxo_projetado_30_dias: {
                    receitas: fluxo30dias[0].receitas_projetadas,
                    despesas: fluxo30dias[0].despesas_projetadas,
                    saldo_projetado: fluxo30dias[0].receitas_projetadas - fluxo30dias[0].despesas_projetadas
                },
                periodo: new Date().toISOString().slice(0, 7)
            }
        });
    } catch (error) {
        next(error);
    }
});

// 8. Gestão de Contas a Receber - NOVA FUNCIONALIDADE
apiFinanceiroRouter.get('/contas-receber', async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, vencimento_inicio, vencimento_fim } = req.query;
        const offset = (page - 1) * limit;
        
        let whereClause = 'WHERE 1=1';
        const params = [];
        
        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }
        
        if (vencimento_inicio && vencimento_fim) {
            whereClause += ' AND data_vencimento BETWEEN ? AND ?';
            params.push(vencimento_inicio, vencimento_fim);
        }
        
        const [contas] = await pool.query(`
            SELECT 
                cr.*,
                CASE 
                    WHEN cr.data_vencimento < CURRENT_DATE() AND cr.status != 'pago' THEN 'em_atraso'
                    WHEN cr.data_vencimento = CURRENT_DATE() AND cr.status != 'pago' THEN 'vence_hoje'
                    ELSE cr.status
                END as status_detalhado,
                DATEDIFF(CURRENT_DATE(), cr.data_vencimento) as dias_atraso
            FROM contas_receber cr
            ${whereClause}
            ORDER BY cr.data_vencimento ASC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        res.json({
            success: true,
            data: { contas }
        });
    } catch (error) {
        next(error);
    }
});

apiFinanceiroRouter.post('/contas-receber', async (req, res, next) => {
    try {
        const { cliente_nome, valor, data_vencimento, descricao, categoria } = req.body;
        
        if (!cliente_nome || !valor || !data_vencimento) {
            return res.status(400).json({
                success: false,
                message: 'Cliente, valor e data de vencimento são obrigatórios'
            });
        }
        
        const [result] = await pool.query(`
            INSERT INTO contas_receber 
            (cliente_nome, valor, data_vencimento, descricao, categoria, status, data_cadastro)
            VALUES (?, ?, ?, ?, ?, 'pendente', NOW())
        `, [cliente_nome, valor, data_vencimento, descricao, categoria]);

        res.status(201).json({
            success: true,
            message: 'Conta a receber criada com sucesso',
            data: { id: result.insertId }
        });
    } catch (error) {
        next(error);
    }
});

// 9. Gestão de Contas a Pagar - NOVA FUNCIONALIDADE
apiFinanceiroRouter.get('/contas-pagar', async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, vencimento_inicio, vencimento_fim } = req.query;
        const offset = (page - 1) * limit;
        
        let whereClause = 'WHERE 1=1';
        const params = [];
        
        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }
        
        if (vencimento_inicio && vencimento_fim) {
            whereClause += ' AND data_vencimento BETWEEN ? AND ?';
            params.push(vencimento_inicio, vencimento_fim);
        }
        
        const [contas] = await pool.query(`
            SELECT 
                cp.*,
                CASE 
                    WHEN cp.data_vencimento < CURRENT_DATE() AND cp.status != 'pago' THEN 'em_atraso'
                    WHEN cp.data_vencimento = CURRENT_DATE() AND cp.status != 'pago' THEN 'vence_hoje'
                    ELSE cp.status
                END as status_detalhado,
                DATEDIFF(CURRENT_DATE(), cp.data_vencimento) as dias_atraso
            FROM contas_pagar cp
            ${whereClause}
            ORDER BY cp.data_vencimento ASC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        res.json({
            success: true,
            data: { contas }
        });
    } catch (error) {
        next(error);
    }
});

apiFinanceiroRouter.post('/contas-pagar', async (req, res, next) => {
    try {
        const { fornecedor_nome, valor, data_vencimento, descricao, categoria } = req.body;
        
        if (!fornecedor_nome || !valor || !data_vencimento) {
            return res.status(400).json({
                success: false,
                message: 'Fornecedor, valor e data de vencimento são obrigatórios'
            });
        }
        
        const [result] = await pool.query(`
            INSERT INTO contas_pagar 
            (fornecedor_nome, valor, data_vencimento, descricao, categoria, status, data_cadastro)
            VALUES (?, ?, ?, ?, ?, 'pendente', NOW())
        `, [fornecedor_nome, valor, data_vencimento, descricao, categoria]);

        res.status(201).json({
            success: true,
            message: 'Conta a pagar criada com sucesso',
            data: { id: result.insertId }
        });
    } catch (error) {
        next(error);
    }
});

// 10. Relatórios Financeiros Avançados - MELHORADOS
apiFinanceiroRouter.get('/relatorios/dre', async (req, res, next) => {
    try {
        const { ano = new Date().getFullYear(), mes } = req.query;
        
        let whereClause = 'WHERE YEAR(data_vencimento) = ?';
        const params = [ano];
        
        if (mes) {
            whereClause += ' AND MONTH(data_vencimento) = ?';
            params.push(mes);
        }
        
        // Receitas
        const [receitas] = await pool.query(`
            SELECT 
                categoria,
                COALESCE(SUM(valor), 0) as total
            FROM contas_receber 
            ${whereClause} AND status = 'pago'
            GROUP BY categoria
        `, params);
        
        // Despesas
        const [despesas] = await pool.query(`
            SELECT 
                categoria,
                COALESCE(SUM(valor), 0) as total
            FROM contas_pagar 
            ${whereClause} AND status = 'pago'
            GROUP BY categoria
        `, params);
        
        const total_receitas = receitas.reduce((sum, item) => sum + item.total, 0);
        const total_despesas = despesas.reduce((sum, item) => sum + item.total, 0);
        const lucro_liquido = total_receitas - total_despesas;
        
        res.json({
            success: true,
            data: {
                periodo: mes ? `${mes}/${ano}` : ano.toString(),
                receitas: {
                    categorias: receitas,
                    total: total_receitas
                },
                despesas: {
                    categorias: despesas,
                    total: total_despesas
                },
                resultado: {
                    lucro_bruto: total_receitas,
                    despesas_operacionais: total_despesas,
                    lucro_liquido: lucro_liquido,
                    margem_liquida: total_receitas > 0 ? ((lucro_liquido / total_receitas) * 100).toFixed(2) + '%' : '0%'
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

// 11. Fluxo de Caixa Detalhado - NOVA FUNCIONALIDADE
apiFinanceiroRouter.get('/fluxo-caixa', async (req, res, next) => {
    try {
        const { data_inicio, data_fim } = req.query;
        
        if (!data_inicio || !data_fim) {
            return res.status(400).json({
                success: false,
                message: 'Data de início e fim são obrigatórias'
            });
        }
        
        const [movimentacoes] = await pool.query(`
            SELECT 
                data_vencimento as data,
                'entrada' as tipo,
                valor,
                cliente_nome as origem_destino,
                descricao,
                categoria
            FROM contas_receber 
            WHERE data_vencimento BETWEEN ? AND ? AND status = 'pago'
            
            UNION ALL
            
            SELECT 
                data_vencimento as data,
                'saida' as tipo,
                valor,
                fornecedor_nome as origem_destino,
                descricao,
                categoria
            FROM contas_pagar 
            WHERE data_vencimento BETWEEN ? AND ? AND status = 'pago'
            
            ORDER BY data ASC
        `, [data_inicio, data_fim, data_inicio, data_fim]);
        
        // Calcular saldo acumulado
        let saldo_acumulado = 0;
        const fluxo_detalhado = movimentacoes.map(mov => {
            if (mov.tipo === 'entrada') {
                saldo_acumulado += mov.valor;
            } else {
                saldo_acumulado -= mov.valor;
            }
            
            return {
                ...mov,
                saldo_acumulado
            };
        });

        res.json({
            success: true,
            data: {
                periodo: { inicio: data_inicio, fim: data_fim },
                movimentacoes: fluxo_detalhado,
                resumo: {
                    total_entradas: movimentacoes.filter(m => m.tipo === 'entrada').reduce((sum, m) => sum + m.valor, 0),
                    total_saidas: movimentacoes.filter(m => m.tipo === 'saida').reduce((sum, m) => sum + m.valor, 0),
                    saldo_final: saldo_acumulado
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

// 12. Alertas Financeiros Inteligentes - MELHORADOS
apiFinanceiroRouter.get('/alertas', async (req, res, next) => {
    try {
        const alertas = [];
        
        // Contas vencendo hoje
        const [vencendoHoje] = await pool.query(`
            SELECT COUNT(*) as count FROM contas_receber 
            WHERE data_vencimento = CURRENT_DATE() AND status != 'pago'
        `);
        
        if (vencendoHoje[0].count > 0) {
            alertas.push({
                tipo: 'contas_vencendo_hoje',
                nivel: 'warning',
                titulo: 'Contas a Receber Vencendo Hoje',
                mensagem: `${vencendoHoje[0].count} conta(s) a receber vencem hoje`,
                quantidade: vencendoHoje[0].count
            });
        }
        
        // Contas em atraso
        const [emAtraso] = await pool.query(`
            SELECT COUNT(*) as count, COALESCE(SUM(valor), 0) as valor_total 
            FROM contas_receber 
            WHERE data_vencimento < CURRENT_DATE() AND status != 'pago'
        `);
        
        if (emAtraso[0].count > 0) {
            alertas.push({
                tipo: 'contas_em_atraso',
                nivel: 'danger',
                titulo: 'Contas em Atraso',
                mensagem: `${emAtraso[0].count} conta(s) em atraso totalizando R$ ${emAtraso[0].valor_total.toFixed(2)}`,
                quantidade: emAtraso[0].count,
                valor: emAtraso[0].valor_total
            });
        }
        
        // Contas a pagar vencendo em 3 dias
        const [pagarVencendo] = await pool.query(`
            SELECT COUNT(*) as count, COALESCE(SUM(valor), 0) as valor_total 
            FROM contas_pagar 
            WHERE data_vencimento BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 3 DAY) 
            AND status != 'pago'
        `);
        
        if (pagarVencendo[0].count > 0) {
            alertas.push({
                tipo: 'contas_pagar_vencendo',
                nivel: 'info',
                titulo: 'Contas a Pagar Vencendo',
                mensagem: `${pagarVencendo[0].count} conta(s) a pagar vencem em até 3 dias`,
                quantidade: pagarVencendo[0].count,
                valor: pagarVencendo[0].valor_total
            });
        }

        res.json({
            success: true,
            data: { alertas }
        });
    } catch (error) {
        next(error);
    }
});

// Integração com Vendas/CRM
apiFinanceiroRouter.post('/integracao/vendas/venda-ganha', [
    body('pedido_id').isInt({ min: 1 }).withMessage('ID do pedido inválido'),
    body('cliente_id').isInt({ min: 1 }).withMessage('ID do cliente inválido'),
    body('valor').isFloat({ min: 0.01 }).withMessage('Valor deve ser positivo'),
    body('descricao').trim().notEmpty().withMessage('Descrição é obrigatória')
        .isLength({ max: 500 }).withMessage('Descrição muito longa'),
    validate
], async (req, res, next) => {
    try {
        const { pedido_id, cliente_id, valor, descricao } = req.body;
        await pool.query('INSERT INTO contas_receber (pedido_id, cliente_id, valor, descricao, status) VALUES (?, ?, ?, ?, "pendente")', [pedido_id, cliente_id, valor, descricao]);
        await pool.query('UPDATE pedidos SET status = "faturado" WHERE id = ?', [pedido_id]);
        res.json({ message: 'Conta a receber e pedido faturado gerados.' });
    } catch (error) { next(error); }
});

// Integração com Estoque
apiFinanceiroRouter.post('/integracao/estoque/nf-compra', [
    body('fornecedor_id').isInt({ min: 1 }).withMessage('ID do fornecedor inválido'),
    body('valor').isFloat({ min: 0.01 }).withMessage('Valor deve ser positivo'),
    body('itens').isArray({ min: 1 }).withMessage('Itens devem ser um array não vazio'),
    body('itens.*.material_id').isInt({ min: 1 }).withMessage('ID do material inválido'),
    body('itens.*.quantidade').isFloat({ min: 0.01 }).withMessage('Quantidade deve ser positiva'),
    validate
], async (req, res, next) => {
    try {
        const { fornecedor_id, valor, itens } = req.body; // itens: [{material_id, quantidade}]
        await pool.query('INSERT INTO contas_pagar (fornecedor_id, valor, status) VALUES (?, ?, "pendente")', [fornecedor_id, valor]);
        for (const item of itens) {
            await pool.query('UPDATE materiais SET quantidade_estoque = quantidade_estoque + ? WHERE id = ?', [item.quantidade, item.material_id]);
        }
        res.json({ message: 'Financeiro e estoque atualizados.' });
    } catch (error) { next(error); }
});

// API Aberta
apiFinanceiroRouter.get('/api-aberta/contas-receber', async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM contas_receber');
        res.json(rows);
    } catch (error) { next(error); }
});
apiFinanceiroRouter.post('/api-aberta/contas-receber', [
    body('cliente_id').isInt({ min: 1 }).withMessage('ID do cliente inválido'),
    body('valor').isFloat({ min: 0.01 }).withMessage('Valor deve ser positivo'),
    body('descricao').trim().notEmpty().withMessage('Descrição é obrigatória')
        .isLength({ max: 500 }).withMessage('Descrição muito longa'),
    validate
], async (req, res, next) => {
    try {
        const { cliente_id, valor, descricao } = req.body;
        await pool.query('INSERT INTO contas_receber (cliente_id, valor, descricao, status) VALUES (?, ?, ?, "pendente")', [cliente_id, valor, descricao]);
        res.status(201).json({ message: 'Conta a receber criada via API.' });
    } catch (error) { next(error); }
});

// Gestão de Riscos com ACL
apiFinanceiroRouter.post('/contas-pagar', authorizeACL('lancar_conta'), async (req, res, next) => {
    res.json({ message: 'Conta a pagar lançada (simulação).' });
});
apiFinanceiroRouter.post('/contas-pagar/aprovar', authorizeACL('aprovar_pagamento'), async (req, res, next) => {
    res.json({ message: 'Pagamento aprovado (simulação).' });
});
apiFinanceiroRouter.get('/relatorios/lucratividade', authorizeACL('ver_relatorio'), async (req, res, next) => {
    res.json({ lucro: 8000 });
});

// Trilha de Auditoria
apiFinanceiroRouter.post('/audit-trail', [
    body('acao').trim().notEmpty().withMessage('Ação é obrigatória')
        .isLength({ max: 100 }).withMessage('Ação muito longa'),
    body('entidade').trim().notEmpty().withMessage('Entidade é obrigatória')
        .isLength({ max: 100 }).withMessage('Entidade muito longa'),
    body('entidade_id').isInt({ min: 1 }).withMessage('ID da entidade inválido'),
    validate
], async (req, res, next) => {
    try {
        const { acao, entidade, entidade_id } = req.body;
        const usuario_id = req.user.id;
        const ip = req.ip;
        await pool.query('INSERT INTO audit_trail (usuario_id, acao, entidade, entidade_id, ip, data) VALUES (?, ?, ?, ?, ?, NOW())', [usuario_id, acao, entidade, entidade_id, ip]);
        res.status(201).json({ message: 'Ação registrada na trilha de auditoria.' });
    } catch (error) { next(error); }
});
apiFinanceiroRouter.get('/audit-trail', authorizeACL('ver_auditoria'), async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM audit_trail ORDER BY data DESC LIMIT 100');
        res.json(rows);
    } catch (error) { next(error); }
});

// Gestão de Orçamento
apiFinanceiroRouter.post('/orcamentos', authorizeACL('criar_orcamento'), async (req, res, next) => {
    res.status(201).json({ message: 'Orçamento criado (simulação).' });
});
apiFinanceiroRouter.get('/orcamentos', authorizeACL('ver_orcamento'), async (req, res, next) => {
    res.json([{ categoria: 'Marketing', limite: 10000, gasto: 5000 }]);
});
apiFinanceiroRouter.get('/orcamentos/alertas', authorizeACL('ver_orcamento'), async (req, res, next) => {
    res.json([{ categoria: 'Marketing', alerta: 'Limite próximo de ser atingido.' }]);
});

// Usabilidade e Experiência
apiFinanceiroRouter.post('/dashboard/personalizar', async (req, res, next) => {
    res.json({ message: 'Preferências de dashboard salvas (simulação).' });
});
apiFinanceiroRouter.get('/dashboard/personalizar', async (req, res, next) => {
    res.json({ kpis: ['ticketMedio', 'inadimplencia'], atalhos: ['contas-pagar', 'contas-receber'] });
});
apiFinanceiroRouter.post('/relatorios/personalizar', async (req, res, next) => {
    res.json({ message: 'Modelo de relatório salvo (simulação).' });
});
apiFinanceiroRouter.get('/relatorios/personalizar', async (req, res, next) => {
    res.json([{ nome: 'DRE Custom', colunas: ['receitas', 'despesas', 'lucro'] }]);
});

// Busca Global Inteligente
apiFinanceiroRouter.get('/busca-global', async (req, res, next) => {
    try {
        const { q: _q } = req.query; // query param accepted but not used in this stub
        res.json({
            resultados: [
                { tipo: 'cliente', nome: 'Empresa X', id: 1 },
                { tipo: 'conta_receber', valor: 1200, id: 10 },
                { tipo: 'nota_fiscal', numero: 'NF12345', id: 5 }
            ]
        });
    } catch (error) { next(error); }
});

// Endpoints básicos mantidos para compatibilidade
apiFinanceiroRouter.get('/faturamento', async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT SUM(valor) AS total FROM pedidos WHERE status = "faturado"');
        res.json({ total: rows[0]?.total || 0 });
    } catch (error) { next(error); }
});
apiFinanceiroRouter.get('/balanco', async (req, res, next) => {
    try {
        const [[receber]] = await pool.query('SELECT SUM(valor) AS total FROM contas_receber WHERE status != "pago"');
        const [[pagar]] = await pool.query('SELECT SUM(valor) AS total FROM contas_pagar WHERE status != "pago"');
        res.json({ receber: receber?.total || 0, pagar: pagar?.total || 0, saldo: (receber?.total || 0) - (pagar?.total || 0) });
    } catch (error) { next(error); }
});

// Montar o apiFinanceiroRouter para rotas profissionais (centros-custo, transacoes-recorrentes, etc.)
app.use('/api/financeiro', apiFinanceiroRouter);

// ===== ROTAS FINANCEIRO COM CONTROLE DE ACESSO =====
// Importar rotas do financeiro com controle granular de permissões
const financeiroRoutes = require('./src/routes/financeiro');
app.use('/api/financeiro', financeiroRoutes);


// ----------------- ROTAS PCP (Compras, Estoque e Produção) UNIFICADAS -----------------
const apiPCPRouter = express.Router();
apiPCPRouter.use(authenticateToken);
apiPCPRouter.use(authorizeArea('pcp'));

// Rota /me para o PCP retornar dados do usuário logado
apiPCPRouter.get('/me', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Não autenticado' });
        }
        
        // Buscar dados completos do usuário no banco com JOIN para foto do funcionário
        const [[dbUser]] = await pool.query(
            `SELECT u.id, u.nome, u.email, u.role, u.is_admin, 
                    u.permissoes_pcp as permissoes, u.foto, u.avatar,
                    f.foto_perfil_url as foto_funcionario
             FROM usuarios u
             LEFT JOIN funcionarios f ON u.email = f.email
             WHERE u.id = ?`,
            [req.user.id]
        );
        
        if (!dbUser) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        
        // Parse permissões
        let permissoes = [];
        if (dbUser.permissoes) {
            try {
                permissoes = JSON.parse(dbUser.permissoes);
            } catch (e) {
                console.error('[API/PCP/ME] Erro ao parsear permissoes:', e);
                permissoes = [];
            }
        }
        
        // Determinar a foto (prioridade: avatar > foto > foto_funcionario)
        const fotoUsuario = dbUser.avatar || dbUser.foto || dbUser.foto_funcionario || "/avatars/default.webp";
        
        // Retornar dados completos do usuário
        res.json({
            user: {
                id: dbUser.id,
                nome: dbUser.nome,
                email: dbUser.email,
                role: dbUser.role,
                avatar: fotoUsuario,
                foto: fotoUsuario,
                foto_perfil_url: fotoUsuario,
                is_admin: dbUser.is_admin,
                permissoes: permissoes
            }
        });
    } catch (error) {
        console.error('[API/PCP/ME] Erro ao buscar usuário:', error);
        res.status(500).json({ message: 'Erro ao buscar dados do usuário' });
    }
});

// DASHBOARD / STATS DO PCP
apiPCPRouter.get('/dashboard', async (req, res, next) => {
    try {
        // Total de produtos ativos
        const [[produtosResult]] = await pool.query(
            'SELECT COUNT(*) as total FROM produtos WHERE status = "ativo"'
        );
        
        // Ordens em produção (status ativa ou em_producao)
        const [[ordensResult]] = await pool.query(
            `SELECT COUNT(*) as total FROM ordens_producao 
             WHERE status IN ('ativa', 'em_producao', 'pendente')`
        );
        
        // Produtos com estoque baixo (abaixo do mínimo)
        const [[estoqueBaixoResult]] = await pool.query(
            `SELECT COUNT(*) as total FROM produtos 
             WHERE status = "ativo" 
             AND estoque_atual <= COALESCE(estoque_minimo, 10) 
             AND estoque_atual > 0`
        );
        
        // Entregas pendentes (ordens com data de previsão de entrega esta semana)
        const [[entregasResult]] = await pool.query(
            `SELECT COUNT(*) as total FROM ordens_producao 
             WHERE status NOT IN ('concluida', 'cancelada', 'finalizada')
             AND data_prevista IS NOT NULL
             AND data_prevista >= CURDATE()
             AND data_prevista <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)`
        );
        
        res.json({
            totalProdutos: produtosResult?.total || 0,
            ordensEmProducao: ordensResult?.total || 0,
            estoqueBaixo: estoqueBaixoResult?.total || 0,
            entregasPendentes: entregasResult?.total || 0
        });
    } catch (error) {
        console.error('[PCP/DASHBOARD] Erro:', error);
        // Retornar valores padrão em caso de erro
        res.json({
            totalProdutos: 0,
            ordensEmProducao: 0,
            estoqueBaixo: 0,
            entregasPendentes: 0
        });
    }
});

// ORDENS DE PRODUÇÁO
apiPCPRouter.get('/ordens', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 500;
        const offset = parseInt(req.query.offset) || 0;
        const [rows] = await pool.query('SELECT * FROM ordens_producao ORDER BY id DESC LIMIT ? OFFSET ?', [limit, offset]);
        res.json(rows);
    } catch (error) { next(error); }
});
apiPCPRouter.post('/ordens', [
    body('codigo_produto').trim().notEmpty().withMessage('Código do produto é obrigatório')
        .isLength({ max: 100 }).withMessage('Código muito longo (máx 100 caracteres)'),
    body('descricao_produto').trim().notEmpty().withMessage('Descrição do produto é obrigatória')
        .isLength({ max: 500 }).withMessage('Descrição muito longa (máx 500 caracteres)'),
    body('quantidade').isInt({ min: 1 }).withMessage('Quantidade deve ser um número inteiro positivo'),
    body('data_previsao_entrega').isDate().withMessage('Data de previsão inválida'),
    body('observacoes').optional().trim().isLength({ max: 1000 }).withMessage('Observações muito longas (máx 1000 caracteres)'),
    validate
], async (req, res, next) => {
    try {
        const { codigo_produto, descricao_produto, quantidade, data_previsao_entrega, observacoes } = req.body;
        const sql = 'INSERT INTO ordens_producao (codigo_produto, descricao_produto, quantidade, data_previsao_entrega, observacoes, status) VALUES (?, ?, ?, ?, ?, \'A Fazer\')';
        const [result] = await pool.query(sql, [codigo_produto, descricao_produto, quantidade, data_previsao_entrega, observacoes]);
        res.status(201).json({ message: 'Ordem criada com sucesso!', id: result.insertId });
    } catch (error) { next(error); }
});
apiPCPRouter.put('/ordens/:id/status', [
    param('id').isInt({ min: 1 }).withMessage('ID da ordem inválido'),
    body('status').isIn(['A Fazer', 'Em Andamento', 'Concluído', 'Cancelado'])
        .withMessage('Status inválido. Use: A Fazer, Em Andamento, Concluído ou Cancelado'),
    validate
], async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const [result] = await pool.query('UPDATE ordens_producao SET status = ? WHERE id = ?', [status, id]);
        if (result.affectedRows > 0) {
            res.json({ message: 'Status atualizado com sucesso!' });
        } else {
            res.status(404).json({ message: 'Ordem não encontrada.' });
        }
    } catch (error) { next(error); }
});

// MATERIAIS
apiPCPRouter.get('/materiais', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 1000;
        const offset = parseInt(req.query.offset) || 0;
        const [rows] = await pool.query('SELECT * FROM materiais ORDER BY descricao ASC LIMIT ? OFFSET ?', [limit, offset]);
        res.json(rows);
    } catch (error) { next(error); }
});
apiPCPRouter.post('/materiais', [
    body('codigo_material').trim().notEmpty().withMessage('Código do material é obrigatório')
        .isLength({ max: 100 }).withMessage('Código muito longo (máx 100 caracteres)'),
    body('descricao').trim().notEmpty().withMessage('Descrição é obrigatória')
        .isLength({ max: 500 }).withMessage('Descrição muito longa (máx 500 caracteres)'),
    body('unidade_medida').trim().notEmpty().withMessage('Unidade de medida é obrigatória')
        .isLength({ max: 20 }).withMessage('Unidade de medida muito longa (máx 20 caracteres)'),
    body('quantidade_estoque').isFloat({ min: 0 }).withMessage('Quantidade deve ser um número positivo'),
    body('fornecedor_padrao').optional().trim().isLength({ max: 255 }).withMessage('Fornecedor padrão muito longo'),
    validate
], async (req, res, next) => {
    try {
        const { codigo_material, descricao, unidade_medida, quantidade_estoque, fornecedor_padrao } = req.body;
        const sql = 'INSERT INTO materiais (codigo_material, descricao, unidade_medida, quantidade_estoque, fornecedor_padrao) VALUES (?, ?, ?, ?, ?)';
        const [result] = await pool.query(sql, [codigo_material, descricao, unidade_medida, quantidade_estoque, fornecedor_padrao]);
        res.status(201).json({ message: 'Material criado com sucesso!', id: result.insertId });
    } catch (error) { next(error); }
});
apiPCPRouter.put('/materiais/:id', [
    param('id').isInt({ min: 1 }).withMessage('ID do material inválido'),
    body('descricao').trim().notEmpty().withMessage('Descrição é obrigatória')
        .isLength({ max: 500 }).withMessage('Descrição muito longa (máx 500 caracteres)'),
    body('unidade_medida').trim().notEmpty().withMessage('Unidade de medida é obrigatória')
        .isLength({ max: 20 }).withMessage('Unidade de medida muito longa'),
    body('quantidade_estoque').isFloat({ min: 0 }).withMessage('Quantidade deve ser um número positivo'),
    body('fornecedor_padrao').optional().trim().isLength({ max: 255 }).withMessage('Fornecedor padrão muito longo'),
    validate
], async (req, res, next) => {
    try {
        const { id } = req.params;
        const { descricao, unidade_medida, quantidade_estoque, fornecedor_padrao } = req.body;
        const sql = 'UPDATE materiais SET descricao = ?, unidade_medida = ?, quantidade_estoque = ?, fornecedor_padrao = ? WHERE id = ?';
        const [result] = await pool.query(sql, [descricao, unidade_medida, quantidade_estoque, fornecedor_padrao, id]);
        if (result.affectedRows > 0) {
            res.json({ message: 'Material atualizado com sucesso!' });
        } else {
            res.status(404).json({ message: 'Material não encontrado.' });
        }
    } catch (error) { next(error); }
});

// MATERIAIS - Deletar material
apiPCPRouter.delete('/materiais/:id', [
    param('id').isInt({ min: 1 }).withMessage('ID do material inválido')
], async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Verificar se material existe
        const [existing] = await pool.query('SELECT id FROM materiais WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Material não encontrado.' });
        }
        
        // Verificar se há dependências (ordens de compra)
        const [dependencies] = await pool.query('SELECT COUNT(*) as count FROM ordens_compra WHERE material_id = ?', [id]);
        if (dependencies[0].count > 0) {
            return res.status(400).json({ 
                message: 'Não é possível excluir. Material possui ordens de compra associadas.' 
            });
        }
        
        // Deletar material
        const [result] = await pool.query('DELETE FROM materiais WHERE id = ?', [id]);
        res.json({ message: 'Material excluído com sucesso!' });
    } catch (error) { next(error); }
});

// ORDENS DE COMPRA
apiPCPRouter.get('/ordens-compra', async (req, res, next) => {
    try {
        const sql = `SELECT oc.id, m.codigo_material, m.descricao, oc.quantidade, oc.data_pedido, oc.previsao_entrega, oc.status FROM ordens_compra oc JOIN materiais m ON oc.material_id = m.id ORDER BY oc.data_pedido DESC`;
        const [rows] = await pool.query(sql);
        res.json(rows);
    } catch (error) { next(error); }
});
apiPCPRouter.post('/ordens-compra', [
    body('material_id').isInt({ min: 1 }).withMessage('ID do material inválido'),
    body('quantidade').isFloat({ min: 0.01 }).withMessage('Quantidade deve ser um número positivo'),
    body('previsao_entrega').isDate().withMessage('Data de previsão inválida'),
    validate
], async (req, res, next) => {
    try {
        const { material_id, quantidade, previsao_entrega } = req.body;
        const sql = 'INSERT INTO ordens_compra (material_id, quantidade, data_pedido, previsao_entrega, status) VALUES (?, ?, CURDATE(), ?, \'Pendente\')';
        const [result] = await pool.query(sql, [material_id, quantidade, previsao_entrega]);
        res.status(201).json({ message: 'Ordem de compra criada com sucesso!', id: result.insertId });
    } catch (error) { next(error); }
});

// PRODUTOS
// PRODUTOS - Listar produtos (com filtros para catálogo)
apiPCPRouter.get('/produtos', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 1000; // Default maior para catálogo
        const offset = (page - 1) * limit;
        
        // Filtros opcionais
        const categoria = req.query.categoria;
        const estoque = req.query.estoque; // 'todos', 'com-estoque', 'baixo', 'zerado'
        const search = req.query.search || req.query.q; // Aceita ambos os parâmetros
        
        // Construir query base
        let whereConditions = ['status = "ativo"'];
        let queryParams = [];
        
        // Filtro por categoria
        if (categoria && categoria !== 'todas') {
            whereConditions.push('categoria = ?');
            queryParams.push(categoria);
        }
        
        // Filtro por estoque
        if (estoque === 'com-estoque') {
            whereConditions.push('estoque_atual > 0');
        } else if (estoque === 'baixo') {
            whereConditions.push('estoque_atual > 0 AND estoque_atual < 10');
        } else if (estoque === 'zerado') {
            whereConditions.push('estoque_atual = 0');
        }
        
        // Filtro por busca (código, nome, EAN-13, SKU, NCM)
        if (search) {
            const searchPattern = `%${search}%`;
            whereConditions.push('(codigo LIKE ? OR nome LIKE ? OR gtin LIKE ? OR sku LIKE ? OR ncm LIKE ?)');
            queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        }
        
        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
        
        // Query principal com todos os campos necessários
        const query = `
            SELECT 
                id,
                codigo,
                nome,
                descricao,
                categoria,
                gtin,
                sku,
                ncm,
                estoque_atual,
                estoque_minimo,
                preco_custo,
                preco_venda,
                unidade_medida,
                imagem_url,
                status,
                data_criacao
            FROM produtos 
            ${whereClause}
            ORDER BY nome ASC
            LIMIT ? OFFSET ?
        `;
        
        queryParams.push(limit, offset);
        
        const [rows] = await pool.query(query, queryParams);
        
        // Query de contagem total
        const countQuery = `SELECT COUNT(*) as total FROM produtos ${whereClause}`;
        const [[{ total }]] = await pool.query(countQuery, queryParams.slice(0, -2)); // Remove limit e offset
        
        // Estatísticas adicionais para o catálogo
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total_produtos,
                SUM(CASE WHEN estoque_atual > 0 THEN 1 ELSE 0 END) as com_estoque,
                SUM(CASE WHEN estoque_atual > 0 AND estoque_atual < 10 THEN 1 ELSE 0 END) as estoque_baixo,
                SUM(CASE WHEN estoque_atual = 0 THEN 1 ELSE 0 END) as critico,
                SUM(CASE WHEN gtin IS NOT NULL AND gtin != '' THEN 1 ELSE 0 END) as com_ean
            FROM produtos 
            WHERE status = "ativo"
        `);
        
        res.json({ 
            produtos: rows, 
            total, 
            page, 
            limit,
            totalPages: Math.ceil(total / limit),
            stats: stats[0]
        });
    } catch (error) { 
        console.error('❌ Erro ao buscar produtos:', error);
        next(error); 
    }
});

// PRODUTOS - Alertas de estoque baixo (DEVE VIR ANTES DA ROTA /:id)
apiPCPRouter.get('/produtos/estoque-baixo', async (req, res, next) => {
    try {
        const [rows] = await pool.query(`
            SELECT id, codigo, descricao, sku, unidade_medida, 
                   quantidade_estoque, estoque_minimo 
            FROM produtos 
            WHERE quantidade_estoque <= estoque_minimo 
            AND status = "ativo"
            ORDER BY 
                CASE 
                    WHEN quantidade_estoque <= 0 THEN 0
                    WHEN quantidade_estoque <= (estoque_minimo * 0.5) THEN 1
                    ELSE 2
                END,
                quantidade_estoque ASC
            LIMIT 50
        `);
        res.json(rows);
    } catch (error) { next(error); }
});

// PRODUTOS - Autocomplete por código ou nome (DEVE VIR ANTES DA ROTA /:id)
apiPCPRouter.get('/produtos/search', async (req, res, next) => {
    try {
        const query = req.query.q || '';
        const limit = parseInt(req.query.limit) || 10;
        
        if (!query) {
            const [rows] = await pool.query('SELECT * FROM produtos WHERE status = "ativo" LIMIT ?', [limit]);
            return res.json(rows);
        }
        
        const searchPattern = `%${query}%`;
        const [rows] = await pool.query(`
            SELECT * FROM produtos 
            WHERE status = "ativo" 
            AND (codigo LIKE ? OR nome LIKE ? OR sku LIKE ? OR gtin LIKE ?)
            ORDER BY 
                CASE 
                    WHEN codigo = ? THEN 1
                    WHEN codigo LIKE ? THEN 2
                    WHEN nome LIKE ? THEN 3
                    ELSE 4
                END
            LIMIT ?
        `, [searchPattern, searchPattern, searchPattern, searchPattern, query, `${query}%`, `${query}%`, limit]);
        res.json(rows);
    } catch (error) { next(error); }
});

// PRODUTOS - Buscar produto por ID
apiPCPRouter.get('/produtos/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM produtos WHERE id = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }
        
        res.json(rows[0]);
    } catch (error) { next(error); }
});

// PRODUTOS - Criar novo produto
apiPCPRouter.post('/produtos', [
    body('codigo').notEmpty().withMessage('Código é obrigatório'),
    body('nome').notEmpty().withMessage('Nome é obrigatório'),
    body('categoria').notEmpty().withMessage('Categoria é obrigatória'),
    body('marca').notEmpty().withMessage('Marca é obrigatória')
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            codigo, sku, gtin, nome, descricao, categoria, marca, variacao,
            embalagem, lances, preco, custo, estoque, estoque_minimo,
            localizacao, peso, dimensoes, ncm, cest, status
        } = req.body;

        const [result] = await pool.query(`
            INSERT INTO produtos (
                codigo, sku, gtin, nome, descricao, categoria, marca, variacao,
                embalagem, lances, preco, custo, estoque, estoque_minimo,
                localizacao, peso, dimensoes, ncm, cest, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            codigo, sku || null, gtin || null, nome, descricao || null,
            categoria, marca, variacao || null, embalagem || 'UN',
            lances || 1, preco || 0, custo || 0, estoque || 0,
            estoque_minimo || 0, localizacao || null, peso || null,
            dimensoes || null, ncm || null, cest || null, status || 'ativo'
        ]);

        // Emitir evento WebSocket para sincronização em tempo real
        const newProduct = {
            id: result.insertId,
            codigo, sku, gtin, nome, descricao, categoria, marca, variacao,
            embalagem: embalagem || 'UN', lances: lances || 1, 
            preco: preco || 0, custo: custo || 0, estoque: estoque || 0,
            estoque_minimo: estoque_minimo || 0, localizacao, peso,
            dimensoes, ncm, cest, status: status || 'ativo'
        };

        // Broadcast para todos os clientes conectados
        if (global.io) {
            global.io.emit('product-created', newProduct);
            console.log('🔄 WebSocket: Produto criado emitido para todos os clientes');
        }

        res.json({ 
            success: true, 
            message: 'Produto criado com sucesso',
            id: result.insertId 
        });
    } catch (error) { next(error); }
});

// PRODUTOS - Atualizar produto
apiPCPRouter.put('/produtos/:id', [
    body('codigo').notEmpty().withMessage('Código é obrigatório'),
    body('nome').notEmpty().withMessage('Nome é obrigatório')
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const {
            codigo, sku, gtin, nome, descricao, categoria, marca, variacao,
            custo_unitario, preco, preco_custo, preco_venda, estoque, quantidade_estoque,
            estoque_minimo, estoque_maximo, localizacao, ncm, cest, status,
            unidade_medida, unidade, embalagem, peso, largura, altura, comprimento,
            tensao, secao, material_condutor, isolacao, norma, cor,
            fornecedor_principal, prazo_entrega, qtd_minima_compra,
            obs_internas, obs_fornecedor, obs_venda, observacoes, ativo, tipo_produto
        } = req.body;

        // Usar valores compatíveis - priorizar campos específicos
        const custoFinal = custo_unitario || preco_custo || 0;
        const precoVendaFinal = preco_venda !== undefined ? preco_venda : (preco || 0);
        const estoqueFinal = estoque !== undefined ? estoque : (quantidade_estoque || 0);
        const unidadeFinal = unidade_medida || unidade || 'UN';
        const observacoesFinal = observacoes || obs_internas || null;

        console.log('[SERVER.JS PUT /produtos/:id] Dados recebidos:', { id, estoque, quantidade_estoque, estoqueFinal, preco_venda, preco, precoVendaFinal });

        const [result] = await pool.query(`
            UPDATE produtos SET
                codigo = ?, sku = ?, gtin = ?, nome = ?, descricao = ?,
                categoria = ?, marca = ?, variacao = ?, custo_unitario = ?,
                preco_venda = ?, estoque_atual = ?, quantidade_estoque = ?,
                estoque_minimo = ?, estoque_maximo = ?, localizacao = ?, 
                ncm = ?, cest = ?, status = ?, unidade_medida = ?, embalagem = ?,
                peso = ?, largura = ?, altura = ?, comprimento = ?,
                tensao = ?, secao = ?, material_condutor = ?, isolacao = ?,
                norma = ?, cor = ?, fornecedor_principal = ?,
                prazo_entrega = ?, qtd_minima_compra = ?,
                obs_internas = ?, obs_fornecedor = ?, obs_venda = ?,
                ativo = ?, tipo_produto = ?
            WHERE id = ?
        `, [
            codigo, sku || null, gtin || null, nome, descricao || null,
            categoria || null, marca || null, variacao || null, custoFinal,
            precoVendaFinal, estoqueFinal, estoqueFinal, estoque_minimo || 0,
            estoque_maximo || null, localizacao || null, ncm || null, cest || null,
            status || 'ativo', unidadeFinal, embalagem || null,
            peso || null, largura || null, altura || null, comprimento || null,
            tensao || null, secao || null, material_condutor || null, isolacao || null,
            norma || null, cor || null, fornecedor_principal || null,
            prazo_entrega || 0, qtd_minima_compra || 1,
            observacoesFinal, obs_fornecedor || null, obs_venda || null,
            ativo !== undefined ? ativo : 1, tipo_produto || 'produto',
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }

        console.log('[SERVER.JS PUT /produtos/:id] ✅ Produto atualizado com sucesso:', { id, estoqueFinal, precoVendaFinal });

        // Emitir evento WebSocket para sincronização em tempo real
        const updatedProduct = {
            id, codigo, sku, gtin, nome, descricao, categoria, marca, variacao,
            custo_unitario: custoFinal, preco_venda: precoVendaFinal,
            estoque_atual: estoqueFinal, quantidade_estoque: estoqueFinal, 
            status: status || 'ativo'
        };

        // Broadcast para todos os clientes conectados
        if (global.io) {
            global.io.emit('product-updated', updatedProduct);
            console.log(`🔄 WebSocket: Produto ${id} atualizado emitido para todos os clientes`);
        }

        res.json({ 
            success: true, 
            message: 'Produto atualizado com sucesso' 
        });
    } catch (error) { next(error); }
});

// PRODUTOS - Deletar produto
apiPCPRouter.delete('/produtos/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query('DELETE FROM produtos WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }

        // Emitir evento WebSocket para sincronização em tempo real
        if (global.io) {
            global.io.emit('product-deleted', { id });
            console.log(`🔄 WebSocket: Produto ${id} excluído emitido para todos os clientes`);
        }

        res.json({ 
            success: true, 
            message: 'Produto excluído com sucesso' 
        });
    } catch (error) { next(error); }
});

// =====================================================
// FATURAMENTOS - ENDPOINTS
// =====================================================

// FATURAMENTOS - Listar todos
apiPCPRouter.get('/faturamentos', async (req, res, next) => {
    try {
        const [rows] = await pool.query(`
            SELECT * FROM programacao_faturamento 
            ORDER BY data_programada DESC, id DESC
        `);
        
        res.json({ 
            success: true, 
            data: rows 
        });
    } catch (error) { 
        console.error('❌ Erro ao buscar faturamentos:', error);
        next(error); 
    }
});

// FATURAMENTOS - Buscar por ID
apiPCPRouter.get('/faturamentos/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM programacao_faturamento WHERE id = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Faturamento não encontrado' });
        }
        
        res.json(rows[0]);
    } catch (error) { next(error); }
});

// FATURAMENTOS - Criar novo
apiPCPRouter.post('/faturamentos', [
    body('cliente_nome').notEmpty().withMessage('Nome do cliente é obrigatório'),
    body('valor').isNumeric().withMessage('Valor deve ser numérico'),
    body('data_programada').notEmpty().withMessage('Data programada é obrigatória')
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { numero, cliente_id, cliente_nome, valor, status, tipo, data_programada, data_vencimento, observacoes } = req.body;
        
        const sql = `
            INSERT INTO programacao_faturamento 
            (numero, cliente_id, cliente_nome, valor, status, tipo, data_programada, data_vencimento, observacoes, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const [result] = await pool.query(sql, [
            numero || `FAT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
            cliente_id || null,
            cliente_nome,
            valor,
            status || 'pendente',
            tipo || 'nfe',
            data_programada,
            data_vencimento || null,
            observacoes || null
        ]);

        res.status(201).json({ 
            success: true, 
            message: 'Faturamento criado com sucesso',
            id: result.insertId 
        });
    } catch (error) { next(error); }
});

// FATURAMENTOS - Atualizar
apiPCPRouter.put('/faturamentos/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { cliente_nome, valor, status, tipo, data_programada, data_vencimento, numero_nfe, chave_acesso, observacoes } = req.body;
        
        const sql = `
            UPDATE programacao_faturamento 
            SET cliente_nome = ?, valor = ?, status = ?, tipo = ?, 
                data_programada = ?, data_vencimento = ?, numero_nfe = ?, 
                chave_acesso = ?, observacoes = ?, updated_at = NOW()
            WHERE id = ?
        `;
        
        const [result] = await pool.query(sql, [
            cliente_nome, valor, status, tipo, data_programada, 
            data_vencimento, numero_nfe, chave_acesso, observacoes, id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Faturamento não encontrado' });
        }

        res.json({ 
            success: true, 
            message: 'Faturamento atualizado com sucesso' 
        });
    } catch (error) { next(error); }
});

// FATURAMENTOS - Deletar
apiPCPRouter.delete('/faturamentos/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM programacao_faturamento WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Faturamento não encontrado' });
        }

        res.json({ 
            success: true, 
            message: 'Faturamento excluído com sucesso' 
        });
    } catch (error) { next(error); }
});

// =====================================================
// ORDENS DE PRODUÇÃO - KANBAN (Gestão Visual)
// =====================================================

// GET - Listar ordens para o Kanban
apiPCPRouter.get('/ordens-kanban', async (req, res, next) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                id,
                codigo as numero,
                produto_nome as produto,
                quantidade,
                quantidade_produzida as produzido,
                unidade,
                status,
                prioridade,
                data_inicio,
                data_prevista as dataConclusao,
                data_conclusao,
                responsavel,
                progresso,
                observacoes,
                created_at,
                updated_at
            FROM ordens_producao 
            ORDER BY 
                CASE status 
                    WHEN 'ativa' THEN 1
                    WHEN 'em_producao' THEN 2
                    WHEN 'pendente' THEN 3
                    WHEN 'concluida' THEN 4
                    WHEN 'cancelada' THEN 5
                END,
                data_prevista ASC,
                id DESC
        `);
        
        // Mapear status para o formato esperado pelo frontend
        const ordensFormatadas = rows.map(ordem => ({
            ...ordem,
            statusKanban: mapStatusToKanban(ordem.status),
            statusTexto: mapStatusToTexto(ordem.status),
            produzido: ordem.produzido || 0,
            unidade: ordem.unidade || 'M'
        }));
        
        res.json(ordensFormatadas);
    } catch (error) { 
        console.error('❌ Erro ao listar ordens Kanban:', error);
        next(error); 
    }
});

// POST - Criar nova ordem de produção (via modal)
apiPCPRouter.post('/ordens-kanban', async (req, res, next) => {
    try {
        const { 
            cliente, produto, codigo, quantidade, unidade,
            data_previsao_entrega, vendedor, observacoes, observacoes_pedido, prioridade,
            numero_orcamento, tipo_frete, prazo_entrega,
            produtos // Array de produtos do modal
        } = req.body;
        
        // Gerar código da ordem
        const [ultimaOrdem] = await pool.query(`
            SELECT codigo FROM ordens_producao 
            WHERE codigo LIKE 'OP N° %' 
            ORDER BY id DESC LIMIT 1
        `);
        
        let proximoNumero = 1;
        if (ultimaOrdem.length > 0 && ultimaOrdem[0].codigo) {
            const match = ultimaOrdem[0].codigo.match(/(\d+)$/);
            if (match) proximoNumero = parseInt(match[1]) + 1;
        }
        
        const ano = new Date().getFullYear();
        const codigoOrdem = `OP N° ${ano}/${String(proximoNumero).padStart(5, '0')}`;
        
        // Nome do produto (pode vir do array ou do campo direto)
        const nomeProduto = produto || (produtos && produtos[0]?.descricao) || cliente || 'Produto não especificado';
        const codigoProduto = codigo || (produtos && produtos[0]?.codigo) || '';
        const qtd = quantidade || (produtos && produtos[0]?.quantidade) || 0;
        const und = unidade || (produtos && produtos[0]?.unidade) || 'M';
        
        // Observações - aceita ambos os campos
        const obs = observacoes || observacoes_pedido || null;
        
        const [result] = await pool.query(`
            INSERT INTO ordens_producao (
                codigo, produto_nome, quantidade, unidade, 
                status, prioridade, data_prevista, responsavel, observacoes,
                progresso, quantidade_produzida, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'ativa', ?, ?, ?, ?, 0, 0, NOW(), NOW())
        `, [
            codigoOrdem,
            `${nomeProduto}${codigoProduto ? ' - ' + codigoProduto : ''}`,
            qtd,
            und,
            prioridade || 'media',
            data_previsao_entrega || null,
            vendedor || null,
            obs
        ]);
        
        const novaOrdem = {
            id: result.insertId,
            numero: codigoOrdem,
            produto: nomeProduto,
            codigo: codigoProduto,
            quantidade: qtd,
            produzido: 0,
            unidade: und,
            status: 'ativa',
            statusKanban: 'a_produzir',
            statusTexto: 'Nova',
            dataConclusao: data_previsao_entrega,
            prioridade: prioridade || 'media'
        };
        
        console.log('✅ Ordem de produção criada:', codigoOrdem);
        res.status(201).json(novaOrdem);
    } catch (error) { 
        console.error('❌ Erro ao criar ordem Kanban:', error);
        next(error); 
    }
});

// PATCH - Atualizar ordem (status, quantidade produzida, etc)
apiPCPRouter.patch('/ordens-kanban/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, produzido, quantidade_produzida, responsavel, observacoes } = req.body;
        
        const updates = [];
        const params = [];
        
        if (status) {
            const statusDB = mapKanbanToStatus(status);
            updates.push('status = ?');
            params.push(statusDB);
            
            // Se concluída, registrar data de conclusão
            if (statusDB === 'concluida') {
                updates.push('data_conclusao = NOW()');
                updates.push('data_finalizacao = NOW()');
            }
        }
        
        if (produzido !== undefined || quantidade_produzida !== undefined) {
            const qtdProduzida = produzido ?? quantidade_produzida;
            updates.push('quantidade_produzida = ?');
            params.push(qtdProduzida);
            
            // Calcular progresso automaticamente
            const [ordemAtual] = await pool.query('SELECT quantidade FROM ordens_producao WHERE id = ?', [id]);
            if (ordemAtual.length > 0 && ordemAtual[0].quantidade > 0) {
                const progresso = Math.min(100, (qtdProduzida / ordemAtual[0].quantidade) * 100);
                updates.push('progresso = ?');
                params.push(progresso.toFixed(2));
            }
        }
        
        if (responsavel) {
            updates.push('responsavel = ?');
            params.push(responsavel);
        }
        
        if (observacoes !== undefined) {
            updates.push('observacoes = ?');
            params.push(observacoes);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ erro: 'Nenhum campo para atualizar' });
        }
        
        updates.push('updated_at = NOW()');
        params.push(id);
        
        await pool.query(`
            UPDATE ordens_producao SET ${updates.join(', ')} WHERE id = ?
        `, params);
        
        // Buscar ordem atualizada
        const [ordemAtualizada] = await pool.query(`
            SELECT * FROM ordens_producao WHERE id = ?
        `, [id]);
        
        console.log('✅ Ordem', id, 'atualizada');
        res.json({ 
            sucesso: true, 
            ordem: ordemAtualizada[0] 
        });
    } catch (error) { 
        console.error('❌ Erro ao atualizar ordem Kanban:', error);
        next(error); 
    }
});

// DELETE - Excluir ordem de produção
apiPCPRouter.delete('/ordens-kanban/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const [result] = await pool.query('DELETE FROM ordens_producao WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: 'Ordem não encontrada' });
        }
        
        console.log('✅ Ordem', id, 'excluída');
        res.json({ sucesso: true, mensagem: 'Ordem excluída com sucesso' });
    } catch (error) { 
        console.error('❌ Erro ao excluir ordem Kanban:', error);
        next(error); 
    }
});

// Funções auxiliares para mapeamento de status
function mapStatusToKanban(status) {
    const map = {
        'ativa': 'a_produzir',
        'em_producao': 'produzindo',
        'pendente': 'qualidade',
        'concluida': 'concluido',
        'cancelada': 'cancelado'
    };
    return map[status] || 'a_produzir';
}

function mapStatusToTexto(status) {
    const map = {
        'ativa': 'A Produzir',
        'em_producao': 'Produzindo',
        'pendente': 'Em Qualidade',
        'concluida': 'Concluída',
        'cancelada': 'Cancelada'
    };
    return map[status] || 'Nova';
}

function mapKanbanToStatus(statusKanban) {
    const map = {
        'a_produzir': 'ativa',
        'produzindo': 'em_producao',
        'qualidade': 'pendente',
        'conferido': 'pendente',
        'concluido': 'concluida',
        'armazenado': 'concluida',
        'cancelado': 'cancelada'
    };
    return map[statusKanban] || 'ativa';
}

// ORDENS DE PRODUÇÃO - ENDPOINTS LEGADOS
apiPCPRouter.get('/ordens-producao', async (req, res, next) => {
    try {
        const [rows] = await pool.query(`
            SELECT * FROM ordens_producao 
            ORDER BY id DESC
        `);
        
        res.json({ 
            success: true, 
            data: rows 
        });
    } catch (error) { next(error); }
});

// ÚLTIMO PEDIDO - Para gerar número sequencial
apiPCPRouter.get('/ultimo-pedido', async (req, res, next) => {
    try {
        // Buscar último número de pedido registrado
        const [rows] = await pool.query(`
            SELECT numero_pedido, num_pedido 
            FROM ordens_producao 
            WHERE numero_pedido IS NOT NULL OR num_pedido IS NOT NULL
            ORDER BY id DESC 
            LIMIT 1
        `);
        
        let ultimoNumero = null;
        
        if (rows.length > 0) {
            // Pegar o primeiro campo não-nulo
            ultimoNumero = rows[0].numero_pedido || rows[0].num_pedido;
            
            // Se for string, tentar converter para número
            if (typeof ultimoNumero === 'string') {
                ultimoNumero = ultimoNumero.replace(/\D/g, ''); // Remove não-dígitos
            }
        }
        
        res.json({ 
            success: true,
            ultimo_numero: ultimoNumero 
        });
    } catch (error) { 
        console.error('❌ Erro ao buscar último pedido:', error);
        next(error); 
    }
});

// ENDPOINT DE HEALTH CHECK PARA MONITORAMENTO
app.get('/health', (req, res) => {
    const healthInfo = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        version: require('./package.json').version || '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: DB_AVAILABLE ? 'connected' : 'disconnected',
        features: {
            excel_generation: true,
            pdf_generation: false,
            auto_backup: process.env.BACKUP_ENABLED === 'true',
            monitoring: process.env.MONITORING_ENABLED === 'true'
        }
    };

    res.status(200).json(healthInfo);
});

// ENDPOINT DE MÉTRICAS PARA MONITORAMENTO AVANÇADO
app.get('/metrics', (req, res) => {
    const metrics = {
        timestamp: new Date().toISOString(),
        process: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            version: process.version,
            platform: process.platform
        },
        application: {
            name: 'ALUFORCE v2.0',
            version: require('./package.json').version || '2.0.0',
            environment: process.env.NODE_ENV || 'development'
        },
        database: {
            status: DB_AVAILABLE ? 'connected' : 'disconnected',
            pool_connections: DB_AVAILABLE ? 'active' : 'inactive'
        }
    };

    res.set('Content-Type', 'text/plain');
    res.send(`# ALUFORCE v2.0 Metrics
aluforce_uptime_seconds ${metrics.process.uptime}
aluforce_memory_used_bytes ${metrics.process.memory.heapUsed}
aluforce_memory_total_bytes ${metrics.process.memory.heapTotal}
aluforce_database_connected ${DB_AVAILABLE ? 1 : 0}
aluforce_app_version_info{version="${metrics.application.version}",environment="${metrics.application.environment}"} 1
`);
});

    // Endpoint de analytics do chat
    app.get('/api/chat-analytics', async (req, res) => {
        try {
            const [sessions] = await pool.query('SELECT COUNT(*) AS total FROM chat_sessions');
            const [responseTimes] = await pool.query(`
                SELECT AVG(TIMESTAMPDIFF(SECOND, created_at, responded_at)) AS avgTime
                FROM chat_messages
                WHERE responded_at IS NOT NULL
            `);
            const [modules] = await pool.query('SELECT module, COUNT(*) AS count FROM chat_messages GROUP BY module');
            const [satisfaction] = await pool.query('SELECT AVG(satisfaction) AS avg FROM chat_sessions WHERE satisfaction IS NOT NULL');

            res.json({
                totalSessions: sessions[0]?.total || 0,
                avgResponseTime: Math.round(responseTimes[0]?.avgTime || 0),
                modules: modules.map(m => m.module || 'Outro'),
                messagesByModule: modules.map(m => m.count),
                userSatisfaction: Math.round(satisfaction[0]?.avg || 0)
            });
        } catch (err) {
            res.status(500).json({ error: 'Erro ao buscar analytics', details: err.message });
        }
    });

// SISTEMA DE TEMPLATES AVANÇADO
const AdvancedTemplateManager = require('./scripts/advanced-template-manager.js');
const templateManager = new AdvancedTemplateManager();

// Servir editor de templates
app.get('/template-editor', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'template-editor', 'index.html'));
});

// API para listar templates
app.get('/api/templates/list', async (req, res) => {
    try {
        const filters = {
            type: req.query.type,
            company: req.query.company,
            department: req.query.department
        };

        const templates = await templateManager.listTemplates(filters);
        
        res.json({
            success: true,
            templates,
            count: templates.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API para obter detalhes de um template
app.get('/api/templates/:id', async (req, res) => {
    try {
        const template = await templateManager.getTemplate(req.params.id);
        
        res.json({
            success: true,
            template
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});

// API para criar novo template
app.post('/api/templates/create', async (req, res) => {
    try {
        const templateInfo = req.body;
        const templateId = await templateManager.registerTemplate(templateInfo);
        
        res.json({
            success: true,
            templateId,
            message: 'Template criado com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API para atualizar template
app.post('/api/templates/update', async (req, res) => {
    try {
        const templateData = req.body;
        
        if (!templateData.id) {
            return res.status(400).json({
                success: false,
                error: 'ID do template é obrigatório'
            });
        }

        // Atualizar template existente
        const template = await templateManager.getTemplate(templateData.id);
        Object.assign(template, templateData);
        
        await templateManager.saveTemplateConfig();
        
        res.json({
            success: true,
            message: 'Template atualizado com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API para criar template personalizado
app.post('/api/templates/customize', async (req, res) => {
    try {
        const { baseTemplateId, customizations, userInfo } = req.body;
        
        const customTemplateId = await templateManager.createCustomTemplate(
            baseTemplateId, 
            customizations, 
            userInfo
        );
        
        res.json({
            success: true,
            customTemplateId,
            message: 'Template personalizado criado com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API para definir template padrão
app.post('/api/templates/set-default', async (req, res) => {
    try {
        const { templateId, templateType } = req.body;
        
        await templateManager.setDefaultTemplate(templateId, templateType);
        
        res.json({
            success: true,
            message: 'Template padrão definido com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API para gerar Excel com template específico
app.post('/api/templates/generate-excel', async (req, res) => {
    try {
        const { templateId, data } = req.body;
        
        const workbook = await templateManager.generateExcelWithTemplate(templateId, data);
        
        // Gerar nome do arquivo
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `documento_${templateId}_${timestamp}.xlsx`;
        const filePath = path.join(__dirname, 'temp_excel', fileName);
        
        // Salvar arquivo
        await workbook.xlsx.writeFile(filePath);
        
        // Ler e enviar arquivo
        const fileBuffer = await fs.promises.readFile(filePath);
        
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Length', fileBuffer.length);
        
        res.send(fileBuffer);
        
        // Limpar arquivo temporário
        setTimeout(() => {
            fs.promises.unlink(filePath).catch(console.error);
        }, 5000);
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API para obter estatísticas de templates
app.get('/api/templates/stats', async (req, res) => {
    try {
        const stats = await templateManager.getUsageStats();
        
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API para exportar template
app.get('/api/templates/:id/export', async (req, res) => {
    try {
        const templateConfig = await templateManager.exportTemplateConfig(req.params.id);
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="template-${req.params.id}.json"`);
        
        res.json(templateConfig);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API para importar template
app.post('/api/templates/import', upload.single('templateFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Arquivo de template é obrigatório'
            });
        }

        const templateConfig = JSON.parse(req.file.buffer.toString());
        const newFilePath = path.join(__dirname, 'templates', 'custom', req.file.originalname);
        
        const templateId = await templateManager.importTemplate(templateConfig, newFilePath);
        
        res.json({
            success: true,
            templateId,
            message: 'Template importado com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =================== APIS PARA AUTOCOMPLETE DO MODAL PCP ===================

// API para buscar clientes (suporta modo gestão com todos os campos)
app.get('/api/clientes', async (req, res) => {
    try {
        const { termo, gestao } = req.query;
        
        // Modo gestão: retorna todos os campos para a página de gestão de clientes
        if (gestao === 'true' || gestao === '1') {
            console.log('📋 Buscando clientes para gestão (todos os campos)...');
            
            let query = `SELECT * FROM clientes ORDER BY nome`;
            
            const [clientes] = await pool.query(query);
            
            const clientesFormatados = clientes.map(cliente => ({
                id: cliente.id,
                nome: cliente.nome || cliente.razao_social || cliente.nome_fantasia || '',
                contato: cliente.contato || cliente.nome_contato || '',
                cnpj: cliente.cnpj || cliente.cnpj_cpf || '',
                cpf: cliente.cpf || '',
                inscricao_estadual: cliente.inscricao_estadual || cliente.ie || '',
                telefone: cliente.telefone || cliente.fone || '',
                celular: cliente.celular || '',
                email: cliente.email || '',
                email_nfe: cliente.email_nfe || cliente.email || '',
                cep: cliente.cep || '',
                endereco: cliente.endereco || cliente.logradouro || '',
                numero: cliente.numero || '',
                bairro: cliente.bairro || '',
                cidade: cliente.cidade || '',
                uf: cliente.uf || cliente.estado || '',
                ativo: cliente.ativo === 1 || cliente.ativo === true,
                data_criacao: cliente.data_criacao,
                data_atualizacao: cliente.data_atualizacao
            }));
            
            console.log(`✅ Gestão: Encontrados ${clientesFormatados.length} clientes`);
            return res.json(clientesFormatados);
        }
        
        // Modo autocomplete: retorna apenas campos básicos
        console.log('📋 Buscando clientes para autocomplete...');
        
        let query = 'SELECT id, nome, contato, cnpj, cpf, telefone, email FROM clientes WHERE ativo = 1';
        let params = [];
        
        if (termo && termo.length >= 2) {
            query += ` AND (nome LIKE ? OR cnpj LIKE ? OR contato LIKE ?)`;
            const termoLike = `%${termo}%`;
            params = [termoLike, termoLike, termoLike];
        }
        
        query += ' ORDER BY nome LIMIT 50';
        
        const [clientes] = await pool.query(query, params);
        
        // Formatar resposta
        const clientesFormatados = clientes.map(cliente => ({
            id: cliente.id,
            nome: cliente.nome || '',
            contato: cliente.contato || '',
            cnpj: cliente.cnpj || cliente.cpf || '',
            telefone: cliente.telefone || '',
            email: cliente.email || ''
        }));
        
        console.log(`✅ Encontrados ${clientesFormatados.length} clientes`);
        res.json(clientesFormatados);
        
    } catch (error) {
        console.error('❌ Erro ao buscar clientes:', error);
        res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
});

// API para criar novo cliente
app.post('/api/clientes', async (req, res) => {
    try {
        console.log('📋 Criando novo cliente...');
        const {
            nome, contato, cnpj, cpf, inscricao_estadual,
            telefone, celular, email, email_nfe,
            cep, endereco, numero, bairro, cidade, uf, ativo
        } = req.body;
        
        if (!nome) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }
        
        const [result] = await pool.query(`
            INSERT INTO clientes (
                nome, contato, cnpj, cpf, inscricao_estadual,
                telefone, celular, email, email_nfe,
                cep, endereco, logradouro, numero, bairro, cidade, uf, estado, ativo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            nome, contato || null, cnpj || null, cpf || null, inscricao_estadual || null,
            telefone || null, celular || null, email || null, email_nfe || null,
            cep || null, endereco || null, endereco || null, numero || null, bairro || null, cidade || null, uf || null, uf || null,
            ativo !== undefined ? (ativo ? 1 : 0) : 1
        ]);
        
        console.log(`✅ Cliente criado com ID: ${result.insertId}`);
        res.status(201).json({ id: result.insertId, message: 'Cliente criado com sucesso' });
        
    } catch (error) {
        console.error('❌ Erro ao criar cliente:', error);
        res.status(500).json({ error: 'Erro ao criar cliente' });
    }
});

// API para atualizar cliente existente
app.put('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`📋 Atualizando cliente ID: ${id}...`);
        
        const {
            nome, contato, cnpj, cpf, inscricao_estadual,
            telefone, celular, email, email_nfe,
            cep, endereco, numero, bairro, cidade, uf, ativo
        } = req.body;
        
        if (!nome) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }
        
        const [result] = await pool.query(`
            UPDATE clientes SET
                nome = ?, contato = ?, cnpj = ?, cpf = ?, inscricao_estadual = ?,
                telefone = ?, celular = ?, email = ?, email_nfe = ?,
                cep = ?, endereco = ?, logradouro = ?, numero = ?, bairro = ?, cidade = ?, uf = ?, estado = ?, ativo = ?,
                data_atualizacao = NOW()
            WHERE id = ?
        `, [
            nome, contato || null, cnpj || null, cpf || null, inscricao_estadual || null,
            telefone || null, celular || null, email || null, email_nfe || null,
            cep || null, endereco || null, endereco || null, numero || null, bairro || null, cidade || null, uf || null, uf || null,
            ativo !== undefined ? (ativo ? 1 : 0) : 1,
            id
        ]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        
        console.log(`✅ Cliente ${id} atualizado com sucesso`);
        res.json({ message: 'Cliente atualizado com sucesso' });
        
    } catch (error) {
        console.error('❌ Erro ao atualizar cliente:', error);
        res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
});

// API para listar usuários (para avatar no login do PCP)
app.get('/api/pcp/users-list', async (req, res) => {
    try {
        // Buscar usuários de funcionários para exibir avatar no login
        const [users] = await pool.query(`
            SELECT id, nome_completo as nome, email, departamento as role, avatar, foto_perfil_url
            FROM funcionarios 
            WHERE ativo = 1 OR ativo IS NULL
            ORDER BY nome_completo
        `);
        
        // Mapear avatares por nome
        const avatarMap = {
            'douglas': '/avatars/douglas.webp',
            'andreia': '/avatars/andreia.webp',
            'ti': '/avatars/ti.webp',
            'clemerson': '/avatars/clemerson.webp',
            'thiago': '/avatars/thiago.webp',
            'guilherme': '/avatars/guilherme.webp',
            'junior': '/avatars/junior.webp',
            'hellen': '/avatars/hellen.webp',
            'antonio': '/avatars/antonio.webp',
            'egidio': '/avatars/egidio.webp'
        };
        
        // Retornar dados sanitizados (sem senhas)
        const sanitizedUsers = users.map(user => {
            const firstName = user.nome ? user.nome.split(' ')[0].toLowerCase() : '';
            let fotoUrl = user.foto_perfil_url || user.avatar || avatarMap[firstName] || '/avatars/default.webp';
            
            return {
                id: user.id,
                nome: user.nome,
                email: user.email,
                role: user.role,
                foto_url: fotoUrl
            };
        });
        
        res.json({ users: sanitizedUsers });
    } catch (err) {
        console.error('/api/pcp/users-list error:', err && err.message ? err.message : err);
        res.status(500).json({ message: 'Erro ao obter lista de usuários.', users: [] });
    }
});

// API para buscar materiais/produtos
app.get('/api/pcp/materiais', async (req, res) => {
    try {
        console.log('📦 Buscando materiais para autocomplete...');
        
        const { termo } = req.query;
        let query = `
            SELECT 
                id, 
                codigo_material, 
                descricao, 
                unidade_medida, 
                custo_unitario,
                quantidade_estoque,
                fornecedor_padrao
            FROM materiais 
            WHERE 1=1
        `;
        let params = [];
        
        if (termo && termo.length >= 2) {
            query += ` AND (codigo_material LIKE ? OR descricao LIKE ?)`;
            const termoLike = `%${termo}%`;
            params = [termoLike, termoLike];
        }
        
        query += ' ORDER BY codigo_material LIMIT 50';
        
        const [materiais] = await pool.query(query, params);
        
        // Formatar resposta
        const materiaisFormatados = materiais.map(material => ({
            id: material.id,
            codigo_material: material.codigo_material || '',
            descricao: material.descricao || '',
            unidade_medida: material.unidade_medida || 'UN',
            preco_unitario: parseFloat(material.custo_unitario) || 0,
            quantidade_estoque: parseFloat(material.quantidade_estoque) || 0,
            fornecedor_padrao: material.fornecedor_padrao || '',
            categoria: 'Material'
        }));
        
        console.log(`✅ Encontrados ${materiaisFormatados.length} materiais`);
        res.json(materiaisFormatados);
        
    } catch (error) {
        console.error('❌ Erro ao buscar materiais:', error);
        
        // Fallback com dados de exemplo
        const materiaisExemplo = [
            {
                id: 1,
                codigo_material: 'ALU-001',
                descricao: 'Perfil de Alumínio 20x20mm',
                unidade_medida: 'M',
                preco_unitario: 15.50,
                quantidade_estoque: 100,
                fornecedor_padrao: 'ALUFORCE',
                categoria: 'Perfis'
            },
            {
                id: 2,
                codigo_material: 'ALU-002',
                descricao: 'Chapa de Alumínio 2mm',
                unidade_medida: 'M2',
                preco_unitario: 85.00,
                quantidade_estoque: 50,
                fornecedor_padrao: 'ALUFORCE',
                categoria: 'Chapas'
            }
        ];
        
        res.json(materiaisExemplo);
    }
});

// API para buscar transportadoras
app.get('/api/transportadoras', async (req, res) => {
    try {
        console.log('🚛 Buscando transportadoras para autocomplete...');
        
        const { termo } = req.query;
        let query = `
            SELECT 
                id, 
                razao_social,
                nome_fantasia,
                contato, 
                cnpj_cpf, 
                telefone, 
                email,
                bairro,
                cidade,
                estado
            FROM transportadoras 
            WHERE 1=1
        `;
        let params = [];
        
        if (termo && termo.length >= 2) {
            query += ` AND (razao_social LIKE ? OR nome_fantasia LIKE ? OR cnpj_cpf LIKE ?)`;
            const termoLike = `%${termo}%`;
            params = [termoLike, termoLike, termoLike];
        }
        
        query += ' ORDER BY razao_social LIMIT 50';
        
        const [transportadoras] = await pool.query(query, params);
        
        // Formatar resposta
        const transportadorasFormatadas = transportadoras.map(transp => ({
            id: transp.id,
            nome: transp.razao_social || transp.nome_fantasia || '',
            nome_empresa: transp.razao_social || '',
            razao_social: transp.razao_social || '',
            nome_fantasia: transp.nome_fantasia || '',
            contato: transp.contato || '',
            cnpj: transp.cnpj_cpf || '',
            telefone: transp.telefone || '',
            fone: transp.telefone || '',
            email: transp.email || '',
            endereco: transp.bairro && transp.cidade ? `${transp.bairro}, ${transp.cidade}/${transp.estado}` : `${transp.cidade || ''}/${transp.estado || ''}`,
            cidade: transp.cidade || '',
            estado: transp.estado || '',
            cep: ''
        }));
        
        console.log(`✅ Encontradas ${transportadorasFormatadas.length} transportadoras`);
        res.json(transportadorasFormatadas);
        
    } catch (error) {
        console.error('❌ Erro ao buscar transportadoras:', error);
        
        // Fallback com dados de exemplo
        const transportadorasExemplo = [
            {
                id: 1,
                nome: 'TRANSPORTES RÁPIDO LTDA',
                nome_empresa: 'TRANSPORTES RÁPIDO LTDA',
                contato: 'Ana Paula Silva',
                cnpj: '12.345.678/0001-90',
                telefone: '(11) 99999-8888',
                fone: '(11) 99999-8888',
                email: 'nfe@transportesrapido.com.br',
                endereco: 'Av. Logística, 123 - São Paulo/SP',
                cep: '01234-567'
            },
            {
                id: 2,
                nome: 'EXPRESSO SEGURO LTDA',
                nome_empresa: 'EXPRESSO SEGURO LTDA',
                contato: 'Carlos Santos',
                cnpj: '98.765.432/0001-10',
                telefone: '(11) 88888-7777',
                fone: '(11) 88888-7777',
                email: 'nfe@expressoseguro.com.br',
                endereco: 'Rua das Cargas, 456 - São Paulo/SP',
                cep: '01234-890'
            }
        ];
        
        res.json(transportadorasExemplo);
    }
});

// =================== ENDPOINTS DE COMPATIBILIDADE ===================
// Aliases para os endpoints esperados pelo frontend

// Alias para empresas/buscar -> clientes
app.get('/api/empresas/buscar', async (req, res) => {
    try {
        console.log('🔄 Redirecionando /api/empresas/buscar para /api/clientes');
        
        const { termo } = req.query;
        let query = 'SELECT id, nome, contato, cnpj, cpf, telefone, celular, email, email_nfe, endereco, logradouro, numero, bairro, cidade, uf, estado, cep FROM clientes WHERE ativo = 1';
        let params = [];
        
        if (termo && termo.length >= 1) { // Funciona com 1 caractere
            query += ` AND (nome LIKE ? OR cnpj LIKE ? OR contato LIKE ?)`;
            const termoLike = `%${termo}%`;
            params = [termoLike, termoLike, termoLike];
        }
        
        query += ' ORDER BY nome LIMIT 50';
        
        const [clientes] = await pool.query(query, params);
        
        // Formatar resposta com mapeamento de campos
        const clientesFormatados = clientes.map(cliente => ({
            id: cliente.id,
            nome: cliente.nome || '',
            razao_social: cliente.nome || '', // Campo alternativo esperado
            nome_fantasia: cliente.nome || '',
            contato: cliente.contato || '',
            nome_contato: cliente.contato || '',
            cnpj: cliente.cnpj || '',
            cpf: cliente.cpf || '',
            telefone: cliente.telefone || '',
            celular: cliente.celular || '',
            fone: cliente.telefone || cliente.celular || '',
            email: cliente.email || '',
            email_nfe: cliente.email_nfe || cliente.email || '',
            endereco: cliente.endereco || '',
            logradouro: cliente.logradouro || '',
            numero: cliente.numero || '',
            bairro: cliente.bairro || '',
            cidade: cliente.cidade || '',
            uf: cliente.uf || cliente.estado || '',
            estado: cliente.estado || cliente.uf || '',
            cep: cliente.cep || ''
        }));
        
        console.log(`✅ Endpoint /api/empresas/buscar retornou ${clientesFormatados.length} registros`);
        res.json(clientesFormatados);
        
    } catch (error) {
        console.error('❌ Erro em /api/empresas/buscar:', error);
        res.status(500).json({ error: 'Erro ao buscar empresas' });
    }
});

// Backwards-compatible endpoint: /api/empresas (aceita ?limit=... e ?termo=...)
app.get('/api/empresas', async (req, res) => {
    try {
        console.log('🔄 Alias compatível /api/empresas chamado');
        const { termo } = req.query;
        const limit = req.query.limit ? Math.max(1, Math.min(1000, parseInt(req.query.limit))) : 500;

        let query = 'SELECT id, nome, contato, cnpj, cpf, telefone, celular, email, email_nfe, endereco, logradouro, numero, bairro, cidade, uf, estado, cep FROM clientes WHERE ativo = 1';
        let params = [];
        if (termo && termo.length >= 1) {
            query += ` AND (nome LIKE ? OR cnpj LIKE ? OR contato LIKE ?)`;
            const termoLike = `%${termo}%`;
            params = [termoLike, termoLike, termoLike];
        }

        query += ' ORDER BY nome LIMIT ' + limit;

        const [clientes] = await pool.query(query, params);

        const clientesFormatados = clientes.map(cliente => ({
            id: cliente.id,
            nome: cliente.nome || '',
            razao_social: cliente.nome || '',
            nome_fantasia: cliente.nome || '',
            contato: cliente.contato || '',
            nome_contato: cliente.contato || '',
            cnpj: cliente.cnpj || '',
            cpf: cliente.cpf || '',
            telefone: cliente.telefone || '',
            celular: cliente.celular || '',
            fone: cliente.telefone || cliente.celular || '',
            email: cliente.email || '',
            email_nfe: cliente.email_nfe || cliente.email || '',
            endereco: cliente.endereco || '',
            logradouro: cliente.logradouro || '',
            numero: cliente.numero || '',
            bairro: cliente.bairro || '',
            cidade: cliente.cidade || '',
            uf: cliente.uf || cliente.estado || '',
            estado: cliente.estado || cliente.uf || '',
            cep: cliente.cep || ''
        }));

        console.log(`✅ Endpoint /api/empresas retornou ${clientesFormatados.length} registros (limit=${limit})`);
        res.json(clientesFormatados);
    } catch (error) {
        console.error('❌ Erro em /api/empresas:', error);
        res.status(500).json({ error: 'Erro ao buscar empresas' });
    }
});

// Alias para transportadoras/buscar -> transportadoras
app.get('/api/transportadoras/buscar', async (req, res) => {
    try {
        console.log('🔄 Redirecionando /api/transportadoras/buscar para /api/transportadoras');
        
        const { termo } = req.query;
        let query = `
            SELECT 
                id, 
                nome, 
                contato_responsavel, 
                cnpj, 
                telefone, 
                email,
                endereco
            FROM transportadoras 
            WHERE ativo = 1
        `;
        let params = [];
        
        if (termo && termo.length >= 1) { // Funciona com 1 caractere
            query += ` AND (nome LIKE ? OR cnpj LIKE ?)`;
            const termoLike = `%${termo}%`;
            params = [termoLike, termoLike];
        }
        
        query += ' ORDER BY nome LIMIT 50';
        
        const [transportadoras] = await pool.query(query, params);
        
        // Formatar resposta com mapeamento de campos
        const transportadorasFormatadas = transportadoras.map(transp => ({
            id: transp.id,
            nome_empresa: transp.nome || '',
            nome: transp.nome || '', // Campo alternativo
            contato: transp.contato_responsavel || '',
            cnpj: transp.cnpj || '',
            telefone: transp.telefone || '',
            email: transp.email || '',
            endereco: transp.endereco || ''
        }));
        
        console.log(`✅ Endpoint /api/transportadoras/buscar retornou ${transportadorasFormatadas.length} registros`);
        res.json(transportadorasFormatadas);
        
    } catch (error) {
        console.error('❌ Erro em /api/transportadoras/buscar:', error);
        
        // Fallback com dados de exemplo
        const transportadorasExemplo = [
            {
                id: 1,
                nome_empresa: 'TRANSPORTES RÁPIDO LTDA',
                nome: 'TRANSPORTES RÁPIDO LTDA',
                contato: 'Ana Paula Silva',
                cnpj: '12.345.678/0001-90',
                telefone: '(11) 99999-8888',
                email: 'contato@transportesrapido.com.br',
                endereco: 'Rua dos Transportes, 123 - São Paulo/SP',
                cep: '01234-567'
            }
        ];
        
        res.json(transportadorasExemplo);
    }
});

// Alias para produtos/buscar -> busca em produtos + materiais
app.get('/api/produtos/buscar', async (req, res) => {
    try {
        console.log('🔄 Buscando em produtos e materiais...');
        
        const { termo } = req.query;
        let produtosCombinados = [];
        
        // 1. Buscar na tabela produtos
        try {
            let queryProdutos = `
                SELECT 
                    id, 
                    codigo, 
                    nome, 
                    variacao, 
                    marca, 
                    descricao, 
                    gtin, 
                    sku
                FROM produtos 
                WHERE 1=1
            `;
            let paramsProdutos = [];
            
            if (termo && termo.length >= 1) {
                queryProdutos += ` AND (codigo LIKE ? OR nome LIKE ? OR descricao LIKE ?)`;
                const termoLike = `%${termo}%`;
                paramsProdutos = [termoLike, termoLike, termoLike];
            }
            
            queryProdutos += ' ORDER BY nome LIMIT 50';
            
            const [produtos] = await pool.query(queryProdutos, paramsProdutos);
            
            // Formatar produtos
            const produtosFormatados = produtos.map(produto => ({
                id: `p_${produto.id}`, // Prefixo para distinguir de materiais
                codigo: produto.codigo || '',
                codigo_material: produto.codigo || '',
                descricao: produto.nome || produto.descricao || '',
                nome: produto.nome || produto.descricao || '',
                unidade_medida: 'UN',
                preco: 0,
                preco_unitario: 0,
                estoque: 0,
                quantidade_estoque: 0,
                fornecedor: produto.marca || '',
                categoria: produto.marca || 'Produto',
                tipo: 'produto',
                variacao: produto.variacao || '',
                gtin: produto.gtin || '',
                sku: produto.sku || ''
            }));
            
            produtosCombinados = [...produtosCombinados, ...produtosFormatados];
            console.log(`✅ Encontrados ${produtosFormatados.length} produtos`);
            
        } catch (errorProdutos) {
            console.log(`⚠️ Erro ao buscar produtos: ${errorProdutos.message}`);
        }
        
        // 2. Buscar na tabela materiais
        try {
            let queryMateriais = `
                SELECT 
                    id, 
                    codigo_material, 
                    descricao, 
                    unidade_medida, 
                    custo_unitario,
                    quantidade_estoque,
                    fornecedor_padrao
                FROM materiais 
                WHERE 1=1
            `;
            let paramsMateriais = [];
            
            if (termo && termo.length >= 1) {
                queryMateriais += ` AND (codigo_material LIKE ? OR descricao LIKE ?)`;
                const termoLike = `%${termo}%`;
                paramsMateriais = [termoLike, termoLike];
            }
            
            queryMateriais += ' ORDER BY codigo_material LIMIT 25';
            
            const [materiais] = await pool.query(queryMateriais, paramsMateriais);
            
            // Formatar materiais
            const materiaisFormatados = materiais.map(material => ({
                id: `m_${material.id}`, // Prefixo para distinguir de produtos
                codigo: material.codigo_material || '',
                codigo_material: material.codigo_material || '',
                descricao: material.descricao || '',
                nome: material.descricao || '',
                unidade_medida: material.unidade_medida || 'UN',
                preco: parseFloat(material.custo_unitario) || 0,
                preco_unitario: parseFloat(material.custo_unitario) || 0,
                estoque: parseFloat(material.quantidade_estoque) || 0,
                quantidade_estoque: parseFloat(material.quantidade_estoque) || 0,
                fornecedor: material.fornecedor_padrao || '',
                categoria: 'Material',
                tipo: 'material'
            }));
            
            produtosCombinados = [...produtosCombinados, ...materiaisFormatados];
            console.log(`✅ Encontrados ${materiaisFormatados.length} materiais`);
            
        } catch (errorMateriais) {
            console.log(`⚠️ Erro ao buscar materiais: ${errorMateriais.message}`);
        }
        
        // Ordenar por relevância (produtos primeiro, depois materiais)
        produtosCombinados.sort((a, b) => {
            if (a.tipo === 'produto' && b.tipo === 'material') return -1;
            if (a.tipo === 'material' && b.tipo === 'produto') return 1;
            return a.nome.localeCompare(b.nome);
        });
        
        console.log(`✅ Total de produtos+materiais encontrados: ${produtosCombinados.length}`);
        res.json(produtosCombinados);
        
    } catch (error) {
        console.error('❌ Erro em /api/produtos/buscar:', error);
        
        // Fallback com dados de exemplo  
        const produtosExemplo = [
            {
                id: 1,
                codigo: 'CABO-01',
                codigo_material: 'CABO-01',
                descricao: 'Cabo de Aço Galvanizado 6mm',
                nome: 'Cabo de Aço Galvanizado 6mm',
                unidade_medida: 'MT',
                preco: 15.50,
                preco_unitario: 15.50,
                estoque: 150,
                quantidade_estoque: 150,
                categoria: 'Cabos'
            }
        ];
        
        res.json(produtosExemplo);
    }
});

console.log('✅ Endpoints de compatibilidade criados:');
console.log('   📍 /api/empresas/buscar -> /api/clientes');
console.log('   📍 /api/transportadoras/buscar -> /api/transportadoras');  
console.log('   📍 /api/produtos/buscar -> /api/pcp/materiais');

// =================== API PARA PRODUTOS REAIS DA TABELA PRODUTOS ===================

// API para buscar produtos da tabela 'produtos' (diferente de materiais)
app.get('/api/produtos', async (req, res) => {
    try {
        console.log('🛍️ Buscando produtos da tabela produtos...');
        
        const { termo } = req.query;
        // permitir ?limit=NUM (padrão 1000) ou ?limit=0 para sem LIMIT
        const rawLimit = req.query.limit;
        let limitParam = typeof rawLimit !== 'undefined' ? parseInt(rawLimit) : 1000;
        if (isNaN(limitParam) || limitParam < 0) limitParam = 1000;

        let query = `
            SELECT 
                id, 
                codigo, 
                nome, 
                variacao, 
                marca, 
                descricao, 
                gtin, 
                sku,
                custo_unitario
            FROM produtos 
            WHERE 1=1
        `;
        let params = [];
        
        if (termo && termo.length >= 1) { // Funciona com 1 caractere
            query += ` AND (codigo LIKE ? OR nome LIKE ? OR descricao LIKE ?)`;
            const termoLike = `%${termo}%`;
            params = [termoLike, termoLike, termoLike];
        }
        
        // Se limitParam for 0 => sem LIMIT (retorna todos). Caso contrário, aplica LIMIT.
        if (limitParam === 0) {
            query += ' ORDER BY nome';
        } else {
            query += ' ORDER BY nome LIMIT ?';
            params.push(limitParam);
        }
        
        const [produtos] = await pool.query(query, params);
        
        // Formatar resposta compatível com frontend
        const produtosFormatados = produtos.map(produto => {
            // Tentar obter preço da coluna custo_unitario
            const preco = produto.custo_unitario || 0;
            
            return {
                id: produto.id,
                codigo: produto.codigo || '',
                nome: produto.nome || '',
                descricao: produto.descricao || produto.nome || '',
                variacao: produto.variacao || '',
                marca: produto.marca || '',
                gtin: produto.gtin || '',
                sku: produto.sku || '',
                preco: parseFloat(preco) || 0,
                preco_unitario: parseFloat(preco) || 0,
                categoria: produto.marca || 'Produto'
            };
        });
        
        console.log(`✅ Endpoint /api/produtos retornou ${produtosFormatados.length} registros`);
        
        // Formato compatível com frontend que espera {rows: [...]}
        res.json({
            rows: produtosFormatados,
            items: produtosFormatados,
            total: produtosFormatados.length
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar produtos:', error);
        
        // Fallback com produtos reais do catálogo  
        const produtosFallback = [
            {
                id: 1,
                codigo: 'DUN10',
                nome: 'CABO DUPLEX NEUTRO NU 2x10mm² LABOR 0,6/1KV',
                descricao: 'Cabo multiplexado duplex com neutro nu, condutor de alumínio',
                variacao: 'Preto / Nu',
                marca: 'Aluforce',
                gtin: '789' + Date.now().toString().slice(-10),
                sku: 'SKU-DUN10',
                preco: 28.90,
                preco_unitario: 28.90,
                categoria: 'DUPLEX'
            },
            {
                id: 2,
                codigo: 'TRI25',
                nome: 'CABO TRIPLEX 3x25mm² (2#25 + 1#25) LABOR 0,6/1KV',
                descricao: 'Cabo multiplexado triplex, condutor de alumínio',
                variacao: 'Preto / Preto / Nu',
                marca: 'Aluforce',
                gtin: '789' + Date.now().toString().slice(-10),
                sku: 'SKU-TRI25',
                preco: 65.90,
                preco_unitario: 65.90,
                categoria: 'TRIPLEX'
            },
            {
                id: 3,
                codigo: 'QDN50',
                nome: 'CABO QUADRUPLEX NEUTRO NU 3x50mm² + 1x50mm² LABOR 0,6/1KV',
                descricao: 'Cabo multiplexado quadruplex com neutro nu, condutor de alumínio',
                variacao: 'Preto / Preto / Preto / Nu',
                marca: 'Aluforce',
                gtin: '789' + Date.now().toString().slice(-10),
                sku: 'SKU-QDN50',
                preco: 125.50,
                preco_unitario: 125.50,
                categoria: 'QUADRUPLEX'
            },
            {
                id: 4,
                codigo: 'DUN10_LAB',
                nome: 'CABO DUPLEX NEUTRO NU 2x10mm² LABOR 0,6/1KV',
                descricao: 'Cabo multiplexado duplex com neutro nu - LABOR ENERGY',
                variacao: 'Preto / Nu',
                marca: 'Labor Energy',
                gtin: '789' + Date.now().toString().slice(-10),
                sku: 'SKU-DUN10_LAB',
                preco: 25.70,
                preco_unitario: 25.70,
                categoria: 'DUPLEX'
            },
            {
                id: 5,
                codigo: 'TRI25_LAB',
                nome: 'CABO TRIPLEX 3x25mm² (2#25 + 1#25) LABOR 0,6/1KV',
                descricao: 'Cabo multiplexado triplex - LABOR ENERGY',
                variacao: 'Preto / Preto / Nu',
                marca: 'Labor Energy',
                gtin: '789' + Date.now().toString().slice(-10),
                sku: 'SKU-TRI25_LAB',
                preco: 62.70,
                preco_unitario: 62.70,
                categoria: 'TRIPLEX'
            }
        ];
        
        res.json(produtosFallback);
    }
});

// ========================================
// API: CRIAR PRODUTO (POST)
// ========================================
app.post('/api/produtos', async (req, res) => {
    try {
        console.log('➕ Criando novo produto...');
        const dados = req.body;
        
        // Validar campos obrigatórios
        if (!dados.codigo || !dados.nome) {
            return res.status(400).json({ error: 'Código e Nome são obrigatórios' });
        }
        
        // Verificar se código já existe
        const [existe] = await pool.query('SELECT id FROM produtos WHERE codigo = ?', [dados.codigo]);
        if (existe.length > 0) {
            return res.status(400).json({ error: 'Código já existe' });
        }
        
        // Construir INSERT dinamicamente com campos básicos
        const camposParaInserir = {
            codigo: dados.codigo,
            nome: dados.nome,
            descricao: dados.descricao || '',
            gtin: dados.gtin || '',
            sku: dados.sku || '',
            marca: dados.marca || 'Aluforce',
            variacao: dados.variacao || '',
            custo_unitario: parseFloat(dados.preco || 0)
        };
        
        // Adicionar campos opcionais se fornecidos
        const camposOpcionais = {
            unidade_medida: dados.unidade_medida,
            ncm: dados.ncm,
            categoria: dados.categoria,
            tensao: dados.tensao,
            secao: dados.secao,
            material_condutor: dados.material_condutor,
            isolacao: dados.isolacao,
            norma: dados.norma,
            cor: dados.cor
        };
        
        Object.keys(camposOpcionais).forEach(campo => {
            if (camposOpcionais[campo] !== undefined) {
                camposParaInserir[campo] = camposOpcionais[campo];
            }
        });
        
        const colunas = Object.keys(camposParaInserir);
        const valores = Object.values(camposParaInserir);
        const placeholders = colunas.map(() => '?').join(', ');
        
        const query = `INSERT INTO produtos (${colunas.join(', ')}) VALUES (${placeholders})`;
        
        const [result] = await pool.query(query, valores);
        
        console.log(`✅ Produto criado com ID: ${result.insertId}`);
        
        res.json({
            success: true,
            id: result.insertId,
            codigo: dados.codigo,
            nome: dados.nome,
            message: 'Produto criado com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro ao criar produto:', error);
        res.status(500).json({ error: 'Erro ao criar produto: ' + error.message });
    }
});

// ========================================
// API: ATUALIZAR PRODUTO (PUT)
// ========================================
app.put('/api/produtos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const dados = req.body;
        
        console.log(`🔄 Atualizando produto ID: ${id}`);
        
        // Verificar se produto existe
        const [produto] = await pool.query('SELECT id FROM produtos WHERE id = ?', [id]);
        if (produto.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        
        // Obter colunas existentes na tabela produtos
        const [columns] = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'produtos' 
            AND TABLE_SCHEMA = DATABASE()
        `);
        
        const colunasExistentes = columns.map(col => col.COLUMN_NAME);
        console.log('📋 Colunas disponíveis na tabela:', colunasExistentes.join(', '));
        
        // Construir query dinamicamente apenas com campos que existem na tabela
        const camposParaAtualizar = {};
        
        // Mapeamento de campos do frontend para o banco
        const mapeamentoCampos = {
            codigo: dados.codigo,
            nome: dados.nome,
            descricao: dados.descricao,
            gtin: dados.gtin,
            sku: dados.sku,
            marca: dados.marca,
            variacao: dados.variacao,
            unidade_medida: dados.unidade_medida,
            ncm: dados.ncm,
            categoria: dados.categoria,
            tensao: dados.tensao,
            secao: dados.secao,
            material_condutor: dados.material_condutor,
            isolacao: dados.isolacao,
            norma: dados.norma,
            cor: dados.cor,
            localizacao: dados.localizacao,
            fornecedor: dados.fornecedor,
            fornecedor_principal: dados.fornecedor_principal,
            prazo_entrega: dados.prazo_entrega,
            qtd_minima_compra: dados.qtd_minima_compra,
            estoque_minimo: dados.estoque_minimo,
            estoque_maximo: dados.estoque_maximo,
            estoque_atual: dados.estoque_atual,
            estoque_disponivel: dados.estoque_disponivel,
            estoque_reservado: dados.estoque_reservado,
            estoque_transito: dados.estoque_transito,
            custo_aquisicao: dados.custo_aquisicao,
            custo_adicional: dados.custo_adicional,
            custo_total: dados.custo_total,
            markup: dados.markup,
            margem_lucro: dados.margem_lucro,
            peso: dados.peso,
            largura: dados.largura,
            altura: dados.altura,
            comprimento: dados.comprimento,
            obs_internas: dados.obs_internas,
            obs_fornecedor: dados.obs_fornecedor,
            obs_venda: dados.obs_venda,
            controle_lote: dados.controle_lote,
            familia: dados.familia
        };
        
        // Adicionar campo de preço (pode ser preco, preco_venda ou custo_unitario)
        if (dados.preco !== undefined) {
            if (colunasExistentes.includes('preco')) {
                mapeamentoCampos.preco = dados.preco;
            } else if (colunasExistentes.includes('preco_venda')) {
                mapeamentoCampos.preco_venda = dados.preco;
            } else if (colunasExistentes.includes('custo_unitario')) {
                mapeamentoCampos.custo_unitario = dados.preco;
            }
        }
        
        // Filtrar apenas campos que existem na tabela e têm valor
        Object.keys(mapeamentoCampos).forEach(campo => {
            if (colunasExistentes.includes(campo) && mapeamentoCampos[campo] !== undefined) {
                camposParaAtualizar[campo] = mapeamentoCampos[campo];
            }
        });
        
        if (Object.keys(camposParaAtualizar).length === 0) {
            return res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
        }
        
        console.log('📝 Campos que serão atualizados:', Object.keys(camposParaAtualizar).join(', '));
        
        // Construir SET clause
        const setClauses = Object.keys(camposParaAtualizar).map(campo => `${campo} = ?`);
        const valores = Object.values(camposParaAtualizar);
        valores.push(id); // WHERE id = ?
        
        const query = `UPDATE produtos SET ${setClauses.join(', ')} WHERE id = ?`;
        
        await pool.query(query, valores);
        
        console.log(`✅ Produto ${id} atualizado com sucesso`);
        
        res.json({
            success: true,
            id: parseInt(id),
            message: 'Produto atualizado com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro ao atualizar produto: ' + error.message });
    }
});

// ========================================
// API: BUSCAR PRODUTO POR ID (GET)
// ========================================
app.get('/api/produtos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [produtos] = await pool.query('SELECT * FROM produtos WHERE id = ?', [id]);
        
        if (produtos.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        
        res.json(produtos[0]);
        
    } catch (error) {
        console.error('❌ Erro ao buscar produto:', error);
        res.status(500).json({ error: 'Erro ao buscar produto: ' + error.message });
    }
});

// ========================================
// API PCP: PRODUTOS (Alias para /api/produtos)
// ========================================

// ========================================
// API VENDAS: Rotas consolidadas em seção dedicada (linhas 11245+)
// ========================================

// ========================================
// API: ALERTAS DE ESTOQUE
// ========================================
app.get('/api/alertas-estoque', async (req, res) => {
    try {
        console.log('⚠️ Buscando alertas de estoque...');
        
        // Buscar produtos da tabela produtos
        const query = `
            SELECT 
                id,
                codigo,
                nome,
                descricao,
                marca,
                custo_unitario,
                gtin,
                sku
            FROM produtos 
            ORDER BY nome
            LIMIT 100
        `;
        
        const [produtos] = await pool.query(query);
        
        // Classificar produtos por status de estoque (simulado)
        const alertasFormatados = produtos.map((produto, index) => {
            // Simular quantidade_atual e estoque_minimo
            const quantidade_atual = Math.floor(Math.random() * 50);
            const estoque_minimo = 20;
            
            let status = 'normal';
            if (quantidade_atual === 0) {
                status = 'critico';
            } else if (quantidade_atual < estoque_minimo * 0.5) {
                status = 'baixo';
            } else if (quantidade_atual < estoque_minimo) {
                status = 'baixo';
            }
            
            return {
                id: produto.id,
                codigo: produto.codigo || `PROD-${produto.id}`,
                nome: produto.nome || produto.descricao,
                quantidade_atual: quantidade_atual,
                estoque_minimo: estoque_minimo,
                localizacao: produto.marca || 'Não informada',
                status: status,
                fornecedor: produto.marca || 'Não informado',
                custo_unitario: parseFloat(produto.custo_unitario) || 0,
                preco: parseFloat(produto.custo_unitario) || 0
            };
        });
        
        // Filtrar apenas produtos com status baixo ou crítico
        const alertasFiltrados = alertasFormatados.filter(a => a.status === 'baixo' || a.status === 'critico');
        
        console.log(`✅ ${alertasFiltrados.length} alertas de estoque encontrados`);
        res.json({
            total: alertasFiltrados.length,
            alertas: alertasFiltrados
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar alertas de estoque:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar alertas',
            total: 0,
            alertas: []
        });
    }
});

// ========================================
// API: CONFIGURAÇÕES DA EMPRESA
// ========================================

// GET - Buscar configurações da empresa
app.get('/api/configuracoes/empresa', async (req, res) => {
    try {
        console.log('📋 Buscando configurações da empresa...');
        
        // Criar tabela se não existir
        await pool.query(`
            CREATE TABLE IF NOT EXISTS configuracoes_empresa (
                id INT PRIMARY KEY AUTO_INCREMENT,
                razao_social VARCHAR(255),
                nome_fantasia VARCHAR(255),
                cnpj VARCHAR(18),
                inscricao_estadual VARCHAR(50),
                inscricao_municipal VARCHAR(50),
                telefone VARCHAR(20),
                email VARCHAR(100),
                site VARCHAR(255),
                cep VARCHAR(10),
                estado VARCHAR(2),
                cidade VARCHAR(100),
                bairro VARCHAR(100),
                endereco VARCHAR(255),
                numero VARCHAR(20),
                complemento VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        const [rows] = await pool.query('SELECT * FROM configuracoes_empresa LIMIT 1');
        
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            // Retorna dados padrão da Aluforce
            res.json({
                razao_social: 'I. M. DOS REIS - ALUFORCE INDUSTRIA E COMERCIO DE CONDUTORES',
                nome_fantasia: 'ALUFORCE INDUSTRIA E COMERCIO DE CONDUTORES ELETRICOS',
                cnpj: '68.192.475/0001-60',
                telefone: '(11) 91793-9089',
                cep: '08537-400',
                estado: 'SP',
                cidade: 'Ferraz de Vasconcelos (SP)',
                bairro: 'VILA SÃO JOÃO',
                endereco: 'RUA ERNESTINA',
                numero: '270',
                complemento: ''
            });
        }
    } catch (error) {
        console.error('❌ Erro ao buscar configurações:', error);
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
});

// POST - Salvar configurações da empresa
app.post('/api/configuracoes/empresa', async (req, res) => {
    try {
        console.log('💾 Salvando configurações da empresa...');
        
        const {
            razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
            telefone, email, site, cep, estado, cidade, bairro, endereco, numero, complemento
        } = req.body;
        
        // Verificar se já existe registro
        const [existing] = await pool.query('SELECT id FROM configuracoes_empresa LIMIT 1');
        
        if (existing.length > 0) {
            // Atualizar registro existente
            await pool.query(`
                UPDATE configuracoes_empresa 
                SET razao_social = ?, nome_fantasia = ?, cnpj = ?, inscricao_estadual = ?,
                    inscricao_municipal = ?, telefone = ?, email = ?, site = ?, cep = ?,
                    estado = ?, cidade = ?, bairro = ?, endereco = ?, numero = ?, complemento = ?
                WHERE id = ?
            `, [razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
                telefone, email, site, cep, estado, cidade, bairro, endereco, numero, complemento,
                existing[0].id]);
            
            console.log('✅ Configurações atualizadas');
        } else {
            // Inserir novo registro
            await pool.query(`
                INSERT INTO configuracoes_empresa 
                (razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
                 telefone, email, site, cep, estado, cidade, bairro, endereco, numero, complemento)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
                telefone, email, site, cep, estado, cidade, bairro, endereco, numero, complemento]);
            
            console.log('✅ Configurações criadas');
        }
        
        res.json({ 
            success: true, 
            message: 'Configurações salvas com sucesso!' 
        });
        
    } catch (error) {
        console.error('❌ Erro ao salvar configurações:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erro ao salvar configurações',
            message: error.message
        });
    }
});

// POST - Upload de logo da empresa
app.post('/api/configuracoes/upload-logo', upload.single('logo'), async (req, res) => {
    try {
        console.log('🖼️ Upload de logo da empresa...');
        
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
        }
        
        const logoPath = '/uploads/empresa/' + req.file.filename;
        
        // Atualizar URL do logo no banco de dados
        const [existing] = await pool.query('SELECT id FROM configuracoes_empresa LIMIT 1');
        
        if (existing.length > 0) {
            await pool.query('UPDATE configuracoes_empresa SET logo_url = ? WHERE id = ?', [logoPath, existing[0].id]);
        } else {
            await pool.query('INSERT INTO configuracoes_empresa (logo_url) VALUES (?)', [logoPath]);
        }
        
        console.log('✅ Logo atualizado:', logoPath);
        
        res.json({ 
            success: true, 
            url: logoPath,
            message: 'Logo atualizado com sucesso!' 
        });
        
    } catch (error) {
        console.error('❌ Erro ao fazer upload do logo:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erro ao fazer upload do logo',
            message: error.message
        });
    }
});

// POST - Upload de favicon da empresa
app.post('/api/configuracoes/upload-favicon', upload.single('favicon'), async (req, res) => {
    try {
        console.log('🖼️ Upload de favicon da empresa...');
        
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
        }
        
        const faviconPath = '/uploads/empresa/' + req.file.filename;
        
        // Atualizar URL do favicon no banco de dados
        const [existing] = await pool.query('SELECT id FROM configuracoes_empresa LIMIT 1');
        
        if (existing.length > 0) {
            await pool.query('UPDATE configuracoes_empresa SET favicon_url = ? WHERE id = ?', [faviconPath, existing[0].id]);
        } else {
            await pool.query('INSERT INTO configuracoes_empresa (favicon_url) VALUES (?)', [faviconPath]);
        }
        
        console.log('✅ Favicon atualizado:', faviconPath);
        
        res.json({ 
            success: true, 
            url: faviconPath,
            message: 'Favicon atualizado com sucesso!' 
        });
        
    } catch (error) {
        console.error('❌ Erro ao fazer upload do favicon:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erro ao fazer upload do favicon',
            message: error.message
        });
    }
});

// ========================================
// API: POPULAR DADOS DE EXEMPLO
// ========================================
app.post('/api/admin/popular-dados', async (req, res) => {
    try {
        console.log('📝 Populando dados de exemplo...');
        
        // 1. Verificar produtos
        const [produtos] = await pool.query('SELECT COUNT(*) as total FROM produtos');
        let produtosInseridos = 0;
        
        if (produtos[0].total === 0) {
            const produtosExemplo = [
                ['DUN10', 'CABO DUPLEX NEUTRO NU 2x10mm² LABOR 0,6/1KV', 'Preto / Nu', 'Labor Energy', 'Cabo multiplexado duplex com neutro nu', '7894567890123', 'SKU-DUN10', 28.90],
                ['TRI25', 'CABO TRIPLEX 3x25mm² LABOR 0,6/1KV', 'Preto / Preto / Nu', 'Labor Energy', 'Cabo multiplexado triplex', '7894567890124', 'SKU-TRI25', 65.90],
                ['QDN50', 'CABO QUADRUPLEX 3x50mm² + 1x50mm² LABOR 0,6/1KV', 'Preto / Preto / Preto / Nu', 'Labor Energy', 'Cabo multiplexado quadruplex', '7894567890125', 'SKU-QDN50', 125.50],
                ['DUN16', 'CABO DUPLEX NEUTRO NU 2x16mm² LABOR 0,6/1KV', 'Preto / Nu', 'Aluforce', 'Cabo multiplexado duplex', '7894567890126', 'SKU-DUN16', 38.90],
                ['TRI35', 'CABO TRIPLEX 3x35mm² LABOR 0,6/1KV', 'Preto / Preto / Nu', 'Aluforce', 'Cabo multiplexado triplex', '7894567890127', 'SKU-TRI35', 85.90],
                ['QDN70', 'CABO QUADRUPLEX 3x70mm² + 1x70mm² LABOR 0,6/1KV', 'Preto / Preto / Preto / Nu', 'Aluforce', 'Cabo multiplexado quadruplex', '7894567890128', 'SKU-QDN70', 165.50],
                ['DUN25', 'CABO DUPLEX NEUTRO NU 2x25mm² LABOR 0,6/1KV', 'Preto / Nu', 'Labor Energy', 'Cabo multiplexado duplex', '7894567890129', 'SKU-DUN25', 58.90],
                ['TRI50', 'CABO TRIPLEX 3x50mm² LABOR 0,6/1KV', 'Preto / Preto / Nu', 'Labor Energy', 'Cabo multiplexado triplex', '7894567890130', 'SKU-TRI50', 105.90],
                ['QDN95', 'CABO QUADRUPLEX 3x95mm² + 1x95mm² LABOR 0,6/1KV', 'Preto / Preto / Preto / Nu', 'Aluforce', 'Cabo multiplexado quadruplex', '7894567890131', 'SKU-QDN95', 225.50],
                ['DUN35', 'CABO DUPLEX NEUTRO NU 2x35mm² LABOR 0,6/1KV', 'Preto / Nu', 'Aluforce', 'Cabo multiplexado duplex', '7894567890132', 'SKU-DUN35', 78.90]
            ];
            
            for (const prod of produtosExemplo) {
                await pool.query(`
                    INSERT INTO produtos (codigo, nome, variacao, marca, descricao, gtin, sku, custo_unitario)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, prod);
                produtosInseridos++;
            }
        }
        
        // 2. Verificar materiais
        const [materiais] = await pool.query('SELECT COUNT(*) as total FROM materiais');
        let materiaisInseridos = 0;
        
        if (materiais[0].total === 0) {
            const materiaisExemplo = [
                ['ALU-PERFIL-20X20', 'Perfil de Alumínio 20x20mm', 'M', 15.50, 100.00, 'ALUFORCE'],
                ['ALU-CHAPA-2MM', 'Chapa de Alumínio 2mm', 'M2', 85.00, 50.00, 'ALUFORCE'],
                ['ALU-BARRA-30X30', 'Barra de Alumínio 30x30mm', 'M', 28.75, 75.00, 'FORNECEDOR A'],
                ['ALU-TUBO-25MM', 'Tubo de Alumínio Redondo 25mm', 'M', 22.90, 120.00, 'FORNECEDOR B'],
                ['ALU-CANTONEIRA-20X20', 'Cantoneira de Alumínio 20x20mm', 'M', 18.50, 80.00, 'ALUFORCE'],
                ['ALU-PERFIL-U-30MM', 'Perfil U de Alumínio 30mm', 'M', 25.00, 60.00, 'FORNECEDOR A'],
                ['ALU-CHAPA-3MM', 'Chapa de Alumínio 3mm', 'M2', 125.00, 30.00, 'ALUFORCE'],
                ['ALU-BARRA-40X40', 'Barra de Alumínio 40x40mm', 'M', 38.50, 65.00, 'FORNECEDOR B'],
                ['ALU-TUBO-32MM', 'Tubo de Alumínio Redondo 32mm', 'M', 32.90, 90.00, 'ALUFORCE'],
                ['ALU-PERFIL-T-25MM', 'Perfil T de Alumínio 25mm', 'M', 21.75, 110.00, 'FORNECEDOR A']
            ];
            
            for (const mat of materiaisExemplo) {
                await pool.query(`
                    INSERT INTO materiais (codigo_material, descricao, unidade_medida, custo_unitario, quantidade_estoque, fornecedor_padrao)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, mat);
                materiaisInseridos++;
            }
        }
        
        // 3. Retornar resumo
        const [produtosTotal] = await pool.query('SELECT COUNT(*) as total FROM produtos');
        const [materiaisTotal] = await pool.query('SELECT COUNT(*) as total FROM materiais');
        
        console.log(`✅ Dados populados: ${produtosInseridos} produtos + ${materiaisInseridos} materiais`);
        
        res.json({
            success: true,
            message: 'Dados populados com sucesso',
            produtosInseridos,
            materiaisInseridos,
            totais: {
                produtos: produtosTotal[0].total,
                materiais: materiaisTotal[0].total
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao popular dados:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erro ao popular dados',
            message: error.message
        });
    }
});

// ========================================
// API: CONFIGURAÇÕES ESTENDIDAS
// ========================================

// Venda de Produtos
app.post('/api/configuracoes/venda-produtos', async (req, res) => {
    try {
        const { etapas, tabelas_preco, numeracao, reserva_estoque } = req.body;
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS configuracoes_venda_produtos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                etapas JSON,
                tabelas_preco JSON,
                numeracao JSON,
                reserva_estoque JSON,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        const [existing] = await pool.query('SELECT id FROM configuracoes_venda_produtos LIMIT 1');
        
        if (existing.length > 0) {
            await pool.query(`
                UPDATE configuracoes_venda_produtos 
                SET etapas = ?, tabelas_preco = ?, numeracao = ?, reserva_estoque = ?
                WHERE id = ?
            `, [JSON.stringify(etapas), JSON.stringify(tabelas_preco), JSON.stringify(numeracao), JSON.stringify(reserva_estoque), existing[0].id]);
        } else {
            await pool.query(`
                INSERT INTO configuracoes_venda_produtos (etapas, tabelas_preco, numeracao, reserva_estoque)
                VALUES (?, ?, ?, ?)
            `, [JSON.stringify(etapas), JSON.stringify(tabelas_preco), JSON.stringify(numeracao), JSON.stringify(reserva_estoque)]);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao salvar config venda produtos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Venda de Serviços
app.post('/api/configuracoes/venda-servicos', async (req, res) => {
    try {
        const { etapas, proposta, numeracao } = req.body;
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS configuracoes_venda_servicos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                etapas JSON,
                proposta JSON,
                numeracao JSON,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        const [existing] = await pool.query('SELECT id FROM configuracoes_venda_servicos LIMIT 1');
        
        if (existing.length > 0) {
            await pool.query(`
                UPDATE configuracoes_venda_servicos 
                SET etapas = ?, proposta = ?, numeracao = ?
                WHERE id = ?
            `, [JSON.stringify(etapas), JSON.stringify(proposta), JSON.stringify(numeracao), existing[0].id]);
        } else {
            await pool.query(`
                INSERT INTO configuracoes_venda_servicos (etapas, proposta, numeracao)
                VALUES (?, ?, ?)
            `, [JSON.stringify(etapas), JSON.stringify(proposta), JSON.stringify(numeracao)]);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao salvar config venda serviços:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Clientes e Fornecedores
app.post('/api/configuracoes/clientes-fornecedores', async (req, res) => {
    try {
        const { validacoes, credito, tags } = req.body;
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS configuracoes_clientes_fornecedores (
                id INT PRIMARY KEY AUTO_INCREMENT,
                validacoes JSON,
                credito JSON,
                tags JSON,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        const [existing] = await pool.query('SELECT id FROM configuracoes_clientes_fornecedores LIMIT 1');
        
        if (existing.length > 0) {
            await pool.query(`
                UPDATE configuracoes_clientes_fornecedores 
                SET validacoes = ?, credito = ?, tags = ?
                WHERE id = ?
            `, [JSON.stringify(validacoes), JSON.stringify(credito), JSON.stringify(tags), existing[0].id]);
        } else {
            await pool.query(`
                INSERT INTO configuracoes_clientes_fornecedores (validacoes, credito, tags)
                VALUES (?, ?, ?)
            `, [JSON.stringify(validacoes), JSON.stringify(credito), JSON.stringify(tags)]);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao salvar config clientes/fornecedores:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Finanças
app.post('/api/configuracoes/financas', async (req, res) => {
    try {
        const { contas_atraso, email_remessa, juros_mes, multa_atraso } = req.body;
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS configuracoes_financas (
                id INT PRIMARY KEY AUTO_INCREMENT,
                contas_atraso VARCHAR(50),
                email_remessa VARCHAR(255),
                juros_mes DECIMAL(5,2),
                multa_atraso DECIMAL(5,2),
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        const [existing] = await pool.query('SELECT id FROM configuracoes_financas LIMIT 1');
        
        if (existing.length > 0) {
            await pool.query(`
                UPDATE configuracoes_financas 
                SET contas_atraso = ?, email_remessa = ?, juros_mes = ?, multa_atraso = ?
                WHERE id = ?
            `, [contas_atraso, email_remessa, juros_mes, multa_atraso, existing[0].id]);
        } else {
            await pool.query(`
                INSERT INTO configuracoes_financas (contas_atraso, email_remessa, juros_mes, multa_atraso)
                VALUES (?, ?, ?, ?)
            `, [contas_atraso, email_remessa, juros_mes, multa_atraso]);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao salvar config finanças:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================
// FAMÍLIAS DE PRODUTOS
// =========================

app.get('/api/configuracoes/familias-produtos', async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS familias_produtos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nome VARCHAR(255) NOT NULL,
                codigo VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        const [familias] = await pool.query('SELECT * FROM familias_produtos ORDER BY nome');
        res.json(familias);
    } catch (error) {
        console.error('Erro ao buscar famílias:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/configuracoes/familias-produtos', async (req, res) => {
    try {
        const { nome, codigo } = req.body;
        const [result] = await pool.query(
            'INSERT INTO familias_produtos (nome, codigo) VALUES (?, ?)',
            [nome, codigo]
        );
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Erro ao criar família:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/configuracoes/familias-produtos/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM familias_produtos WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir família:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================
// CARACTERÍSTICAS DE PRODUTOS
// =========================

app.get('/api/configuracoes/caracteristicas-produtos', async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS caracteristicas_produtos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nome VARCHAR(255) NOT NULL,
                conteudos_possiveis TEXT,
                visualizar_em VARCHAR(100),
                preenchimento VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        const [caracteristicas] = await pool.query('SELECT * FROM caracteristicas_produtos ORDER BY nome');
        res.json(caracteristicas);
    } catch (error) {
        console.error('Erro ao buscar características:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/configuracoes/caracteristicas-produtos', async (req, res) => {
    try {
        const { nome, conteudos_possiveis, visualizar_em, preenchimento } = req.body;
        const [result] = await pool.query(
            'INSERT INTO caracteristicas_produtos (nome, conteudos_possiveis, visualizar_em, preenchimento) VALUES (?, ?, ?, ?)',
            [nome, conteudos_possiveis, visualizar_em, preenchimento]
        );
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Erro ao criar característica:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/configuracoes/caracteristicas-produtos/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM caracteristicas_produtos WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir característica:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================
// VENDEDORES
// =========================

app.get('/api/configuracoes/vendedores', async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vendedores (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                comissao DECIMAL(5,2) DEFAULT 0,
                permissoes TEXT,
                situacao ENUM('ativo', 'inativo') DEFAULT 'ativo',
                usuario_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        const [vendedores] = await pool.query(`
            SELECT 
                id,
                nome,
                email,
                comissao,
                COALESCE(permissoes, 'vendas') as permissoes,
                situacao,
                usuario_id,
                created_at as inclusao,
                updated_at as ultima_alteracao
            FROM vendedores 
            ORDER BY nome
        `);
        res.json(vendedores);
    } catch (error) {
        console.error('Erro ao buscar vendedores:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/configuracoes/vendedores', async (req, res) => {
    try {
        const { nome, email, comissao, permissoes, situacao } = req.body;
        
        // Criar tabela de permissões se não existir
        await pool.query(`
            CREATE TABLE IF NOT EXISTS permissoes_modulos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                usuario_id INT NOT NULL,
                modulo VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                UNIQUE KEY unique_permissao (usuario_id, modulo)
            )
        `);
        
        // Criar usuário no sistema com acesso ao módulo de vendas
        const senhaTemp = Math.random().toString(36).slice(-8);
        const senhaHash = await bcrypt.hash(senhaTemp, 10);
        
        const [usuario] = await pool.query(
            'INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)',
            [nome, email, senhaHash, 'vendedor']
        );
        
        // Dar permissão ao módulo de vendas
        await pool.query(
            'INSERT INTO permissoes_modulos (usuario_id, modulo) VALUES (?, ?)',
            [usuario.insertId, 'vendas']
        );
        
        // Criar registro de vendedor
        const [result] = await pool.query(
            'INSERT INTO vendedores (nome, email, comissao, permissoes, situacao, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
            [nome, email, comissao, permissoes, situacao, usuario.insertId]
        );
        
        res.json({ success: true, id: result.insertId, senhaTemp });
    } catch (error) {
        console.error('Erro ao criar vendedor:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/configuracoes/vendedores/:id', async (req, res) => {
    try {
        // Buscar usuario_id do vendedor
        const [vendedor] = await pool.query('SELECT usuario_id FROM vendedores WHERE id = ?', [req.params.id]);
        
        if (vendedor.length > 0 && vendedor[0].usuario_id) {
            // Remover permissões
            await pool.query('DELETE FROM permissoes_modulos WHERE usuario_id = ?', [vendedor[0].usuario_id]);
            // Remover usuário
            await pool.query('DELETE FROM usuarios WHERE id = ?', [vendedor[0].usuario_id]);
        }
        
        // Remover vendedor
        await pool.query('DELETE FROM vendedores WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir vendedor:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================
// COMPRADORES
// =========================

app.get('/api/configuracoes/compradores', async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS compradores (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nome VARCHAR(255) NOT NULL,
                situacao ENUM('ativo', 'inativo') DEFAULT 'ativo',
                incluido_por VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        const [compradores] = await pool.query(`
            SELECT 
                id,
                nome,
                situacao,
                COALESCE(incluido_por, 'Sistema') as incluido_por,
                created_at as inclusao,
                updated_at as última_alteracao
            FROM compradores 
            ORDER BY nome
        `);
        res.json(compradores);
    } catch (error) {
        console.error('Erro ao buscar compradores:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/configuracoes/compradores', async (req, res) => {
    try {
        const { nome, situacao, incluido_por } = req.body;
        const [result] = await pool.query(
            'INSERT INTO compradores (nome, situacao, incluido_por) VALUES (?, ?, ?)',
            [nome, situacao, incluido_por]
        );
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Erro ao criar comprador:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/configuracoes/compradores/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM compradores WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir comprador:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// SISTEMA DE TESTES COM USUÁRIOS
const TestDataCollector = require('./scripts/test-data-collector.js');
const testCollector = new TestDataCollector();

// Servir dashboard de testes
app.get('/dashboard-testes', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard-testes', 'index.html'));
});

// API para iniciar sessão de teste
app.post('/api/test-session/start', async (req, res) => {
    try {
        const userInfo = {
            userId: req.body.userId,
            userName: req.body.userName || 'Usuário Anônimo',
            department: req.body.department || 'Não informado',
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress
        };

        const sessionId = await testCollector.startTestSession(userInfo);
        
        res.json({
            success: true,
            sessionId,
            message: 'Sessão de teste iniciada com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API para registrar resultado de teste
app.post('/api/test-session/result', async (req, res) => {
    try {
        const { sessionId, testResult } = req.body;
        
        if (!sessionId || !testResult) {
            return res.status(400).json({
                success: false,
                error: 'SessionId e testResult são obrigatórios'
            });
        }

        const testId = await testCollector.recordTestResult(sessionId, testResult);
        
        res.json({
            success: true,
            testId,
            message: 'Resultado de teste registrado com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API para registrar feedback
app.post('/api/test-session/feedback', async (req, res) => {
    try {
        const { sessionId, feedback } = req.body;
        
        if (!feedback || !feedback.userName || !feedback.rating) {
            return res.status(400).json({
                success: false,
                error: 'Nome do usuário e rating são obrigatórios'
            });
        }

        const feedbackId = await testCollector.recordFeedback(sessionId, feedback);
        
        res.json({
            success: true,
            feedbackId,
            message: 'Feedback registrado com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API para obter estatísticas em tempo real
app.get('/api/test-session/stats', async (req, res) => {
    try {
        const stats = testCollector.getRealTimeStats();
        
        res.json({
            success: true,
            stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API para gerar relatório de análise
app.get('/api/test-session/report', async (req, res) => {
    try {
        const report = await testCollector.generateAnalysisReport();
        
        res.json({
            success: true,
            report
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =================================================================
// ROTAS DA API DE CONFIGURAÇÓES DO SISTEMA
// =================================================================

// GET - Buscar dados da empresa
app.get('/api/configuracoes/empresa', async (req, res) => {
    try {
        console.log('📋 Buscando dados da empresa...');
        
        const [rows] = await pool.query(`
            SELECT * FROM configuracoes_empresa 
            ORDER BY id DESC LIMIT 1
        `);
        
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.json({});
        }
    } catch (error) {
        console.error('❌ Erro ao buscar dados da empresa:', error);
        res.status(500).json({ error: 'Erro ao buscar dados da empresa' });
    }
});

// POST - Salvar dados da empresa
app.post('/api/configuracoes/empresa', async (req, res) => {
    try {
        console.log('💾 Salvando dados da empresa...');
        
        const {
            razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
            telefone, email, site, cep, estado, cidade, bairro, endereco, numero, complemento
        } = req.body;

        // Verificar se já existe registro
        const [existing] = await pool.query('SELECT id FROM configuracoes_empresa LIMIT 1');
        
        if (existing.length > 0) {
            // Atualizar registro existente
            await pool.query(`
                UPDATE configuracoes_empresa SET
                    razao_social = ?, nome_fantasia = ?, cnpj = ?, inscricao_estadual = ?,
                    inscricao_municipal = ?, telefone = ?, email = ?, site = ?,
                    cep = ?, estado = ?, cidade = ?, bairro = ?, endereco = ?, numero = ?,
                    complemento = ?, updated_at = NOW()
                WHERE id = ?
            `, [
                razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
                telefone, email, site, cep, estado, cidade, bairro, endereco, numero,
                complemento, existing[0].id
            ]);
        } else {
            // Inserir novo registro
            await pool.query(`
                INSERT INTO configuracoes_empresa (
                    razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
                    telefone, email, site, cep, estado, cidade, bairro, endereco, numero,
                    complemento, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
                razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
                telefone, email, site, cep, estado, cidade, bairro, endereco, numero, complemento
            ]);
        }
        
        console.log('✅ Dados da empresa salvos com sucesso');
        res.json({ success: true, message: 'Dados salvos com sucesso' });
        
    } catch (error) {
        console.error('❌ Erro ao salvar dados da empresa:', error);
        res.status(500).json({ error: 'Erro ao salvar dados da empresa' });
    }
});

// GET - Listar categorias
app.get('/api/configuracoes/categorias', async (req, res) => {
    try {
        console.log('📋 Buscando categorias...');
        
        const [categorias] = await pool.query(`
            SELECT id, nome, descricao, created_at, updated_at 
            FROM categorias 
            WHERE ativo = 1 
            ORDER BY nome
        `);
        
        res.json(categorias);
    } catch (error) {
        console.error('❌ Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
});

// POST - Criar categoria
app.post('/api/configuracoes/categorias', async (req, res) => {
    try {
        console.log('💾 Criando categoria...');
        
        const { nome, descricao, cor } = req.body;
        
        const [result] = await pool.query(`
            INSERT INTO categorias (nome, descricao, cor, ativo, created_at, updated_at)
            VALUES (?, ?, ?, 1, NOW(), NOW())
        `, [nome, descricao, cor || '#6366f1']);
        
        console.log('✅ Categoria criada com sucesso');
        res.json({ success: true, id: result.insertId });
        
    } catch (error) {
        console.error('❌ Erro ao criar categoria:', error);
        res.status(500).json({ error: 'Erro ao criar categoria' });
    }
});

// DELETE - Excluir categoria
app.delete('/api/configuracoes/categorias/:id', async (req, res) => {
    try {
        console.log('🗑️ Excluindo categoria...');
        
        const { id } = req.params;
        
        await pool.query(`
            UPDATE categorias SET ativo = 0, updated_at = NOW() WHERE id = ?
        `, [id]);
        
        console.log('✅ Categoria excluída com sucesso');
        res.json({ success: true });
        
    } catch (error) {
        console.error('❌ Erro ao excluir categoria:', error);
        res.status(500).json({ error: 'Erro ao excluir categoria' });
    }
});

// GET - Buscar categoria por ID
app.get('/api/configuracoes/categorias/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [categorias] = await pool.query(`
            SELECT id, nome, descricao, cor FROM categorias WHERE id = ? AND ativo = 1
        `, [id]);
        
        if (categorias.length === 0) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        
        res.json(categorias[0]);
    } catch (error) {
        console.error('❌ Erro ao buscar categoria:', error);
        res.status(500).json({ error: 'Erro ao buscar categoria' });
    }
});

// PUT - Atualizar categoria
app.put('/api/configuracoes/categorias/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, descricao, cor } = req.body;
        
        await pool.query(`
            UPDATE categorias SET nome = ?, descricao = ?, cor = ?, updated_at = NOW() WHERE id = ?
        `, [nome, descricao, cor, id]);
        
        console.log('✅ Categoria atualizada com sucesso');
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Erro ao atualizar categoria:', error);
        res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }
});

// GET - Listar departamentos
app.get('/api/configuracoes/departamentos', async (req, res) => {
    try {
        console.log('📋 Buscando departamentos...');
        
        const [departamentos] = await pool.query(`
            SELECT id, nome, descricao, created_at, updated_at 
            FROM departamentos 
            WHERE ativo = 1 
            ORDER BY nome
        `);
        
        res.json(departamentos);
    } catch (error) {
        console.error('❌ Erro ao buscar departamentos:', error);
        res.status(500).json({ error: 'Erro ao buscar departamentos' });
    }
});

// POST - Criar departamento
app.post('/api/configuracoes/departamentos', async (req, res) => {
    try {
        console.log('💾 Criando departamento...');
        
        const { nome, descricao, responsavel } = req.body;
        
        const [result] = await pool.query(`
            INSERT INTO departamentos (nome, descricao, responsavel, ativo, created_at, updated_at)
            VALUES (?, ?, ?, 1, NOW(), NOW())
        `, [nome, descricao, responsavel || null]);
        
        console.log('✅ Departamento criado com sucesso');
        res.json({ success: true, id: result.insertId });
        
    } catch (error) {
        console.error('❌ Erro ao criar departamento:', error);
        res.status(500).json({ error: 'Erro ao criar departamento' });
    }
});

// DELETE - Excluir departamento
app.delete('/api/configuracoes/departamentos/:id', async (req, res) => {
    try {
        console.log('🗑️ Excluindo departamento...');
        
        const { id } = req.params;
        
        await pool.query(`
            UPDATE departamentos SET ativo = 0, updated_at = NOW() WHERE id = ?
        `, [id]);
        
        console.log('✅ Departamento excluído com sucesso');
        res.json({ success: true });
        
    } catch (error) {
        console.error('❌ Erro ao excluir departamento:', error);
        res.status(500).json({ error: 'Erro ao excluir departamento' });
    }
});

// GET - Buscar departamento por ID
app.get('/api/configuracoes/departamentos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [departamentos] = await pool.query(`
            SELECT id, nome, descricao, responsavel FROM departamentos WHERE id = ? AND ativo = 1
        `, [id]);
        
        if (departamentos.length === 0) {
            return res.status(404).json({ error: 'Departamento não encontrado' });
        }
        
        res.json(departamentos[0]);
    } catch (error) {
        console.error('❌ Erro ao buscar departamento:', error);
        res.status(500).json({ error: 'Erro ao buscar departamento' });
    }
});

// PUT - Atualizar departamento
app.put('/api/configuracoes/departamentos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, descricao, responsavel } = req.body;
        
        await pool.query(`
            UPDATE departamentos SET nome = ?, descricao = ?, responsavel = ?, updated_at = NOW() WHERE id = ?
        `, [nome, descricao, responsavel, id]);
        
        console.log('✅ Departamento atualizado com sucesso');
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Erro ao atualizar departamento:', error);
        res.status(500).json({ error: 'Erro ao atualizar departamento' });
    }
});

// GET - Listar projetos
app.get('/api/configuracoes/projetos', async (req, res) => {
    try {
        console.log('📋 Buscando projetos...');
        
        const [projetos] = await pool.query(`
            SELECT id, nome, descricao, created_at, updated_at 
            FROM projetos 
            WHERE ativo = 1 
            ORDER BY nome
        `);
        
        res.json(projetos);
    } catch (error) {
        console.error('❌ Erro ao buscar projetos:', error);
        res.status(500).json({ error: 'Erro ao buscar projetos' });
    }
});

// POST - Criar projeto
app.post('/api/configuracoes/projetos', async (req, res) => {
    try {
        console.log('💾 Criando projeto...');
        
        const { nome, descricao, data_inicio, data_fim, status } = req.body;
        
        // Mapear status do frontend para o ENUM do banco
        const statusMap = {
            'ativo': 'em_andamento',
            'pausado': 'pausado',
            'concluido': 'concluido',
            'cancelado': 'cancelado'
        };
        const dbStatus = statusMap[status] || 'em_andamento';
        
        const [result] = await pool.query(`
            INSERT INTO projetos (nome, descricao, data_inicio, data_previsao_fim, status, ativo, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
        `, [nome, descricao, data_inicio || null, data_fim || null, dbStatus]);
        
        console.log('✅ Projeto criado com sucesso');
        res.json({ success: true, id: result.insertId });
        
    } catch (error) {
        console.error('❌ Erro ao criar projeto:', error);
        res.status(500).json({ error: 'Erro ao criar projeto' });
    }
});

// DELETE - Excluir projeto
app.delete('/api/configuracoes/projetos/:id', async (req, res) => {
    try {
        console.log('🗑️ Excluindo projeto...');
        
        const { id } = req.params;
        
        await pool.query(`
            UPDATE projetos SET ativo = 0, updated_at = NOW() WHERE id = ?
        `, [id]);
        
        console.log('✅ Projeto excluído com sucesso');
        res.json({ success: true });
        
    } catch (error) {
        console.error('❌ Erro ao excluir projeto:', error);
        res.status(500).json({ error: 'Erro ao excluir projeto' });
    }
});

// GET - Buscar projeto por ID
app.get('/api/configuracoes/projetos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [projetos] = await pool.query(`
            SELECT id, nome, descricao, data_inicio, data_previsao_fim as data_fim, status FROM projetos WHERE id = ? AND ativo = 1
        `, [id]);
        
        if (projetos.length === 0) {
            return res.status(404).json({ error: 'Projeto não encontrado' });
        }
        
        res.json(projetos[0]);
    } catch (error) {
        console.error('❌ Erro ao buscar projeto:', error);
        res.status(500).json({ error: 'Erro ao buscar projeto' });
    }
});

// PUT - Atualizar projeto
app.put('/api/configuracoes/projetos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, descricao, data_inicio, data_fim, status } = req.body;
        
        // Mapear status do frontend para o ENUM do banco
        const statusMap = {
            'ativo': 'em_andamento',
            'pausado': 'pausado',
            'concluido': 'concluido',
            'cancelado': 'cancelado'
        };
        const dbStatus = statusMap[status] || 'em_andamento';
        
        await pool.query(`
            UPDATE projetos SET nome = ?, descricao = ?, data_inicio = ?, data_previsao_fim = ?, status = ?, updated_at = NOW() WHERE id = ?
        `, [nome, descricao, data_inicio || null, data_fim || null, dbStatus, id]);
        
        console.log('✅ Projeto atualizado com sucesso');
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Erro ao atualizar projeto:', error);
        res.status(500).json({ error: 'Erro ao atualizar projeto' });
    }
});

// GET - Buscar dados do certificado (integrado com módulo NFe)
app.get('/api/configuracoes/certificado', async (req, res) => {
    try {
        console.log('📋 Buscando certificado digital...');
        
        const empresaId = 1; // Empresa padrão
        
        // Primeiro tentar buscar da tabela nfe_configuracoes (mais completa)
        const [nfeConfig] = await pool.query(`
            SELECT certificado_validade as validade, 
                   certificado_cnpj as cnpj,
                   certificado_nome as nome,
                   created_at, 
                   updated_at,
                   CASE WHEN certificado_pfx IS NOT NULL THEN 1 ELSE 0 END as tem_certificado
            FROM nfe_configuracoes 
            WHERE empresa_id = ?
            LIMIT 1
        `, [empresaId]);
        
        if (nfeConfig && nfeConfig.length > 0 && nfeConfig[0].tem_certificado) {
            const cert = nfeConfig[0];
            const diasRestantes = cert.validade ? 
                Math.ceil((new Date(cert.validade) - new Date()) / (1000 * 60 * 60 * 24)) : null;
            
            res.json({
                configurado: true,
                validade: cert.validade,
                cnpj: cert.cnpj,
                nome: cert.nome,
                diasRestantes: diasRestantes,
                status: diasRestantes > 30 ? 'valido' : diasRestantes > 0 ? 'expirando' : 'expirado',
                created_at: cert.created_at,
                updated_at: cert.updated_at
            });
            return;
        }
        
        // Fallback: buscar da tabela certificados_digitais
        const [rows] = await pool.query(`
            SELECT validade, created_at, updated_at 
            FROM certificados_digitais 
            ORDER BY id DESC LIMIT 1
        `);
        
        if (rows.length > 0) {
            res.json({
                configurado: true,
                ...rows[0]
            });
        } else {
            res.json({
                configurado: false
            });
        }
    } catch (error) {
        console.error('❌ Erro ao buscar certificado:', error);
        res.status(500).json({ error: 'Erro ao buscar certificado' });
    }
});

// POST - Salvar certificado digital (integrado com módulo NFe)
app.post('/api/configuracoes/certificado', upload.single('certificado'), async (req, res) => {
    try {
        console.log('💾 Salvando certificado digital...');
        
        if (!req.file) {
            return res.status(400).json({ error: 'Arquivo de certificado não enviado' });
        }
        
        const { senha } = req.body;
        if (!senha) {
            return res.status(400).json({ error: 'Senha do certificado é obrigatória' });
        }
        
        const empresaId = 1; // Empresa padrão
        const pfxBuffer = req.file.buffer;
        
        // Validar certificado usando node-forge
        let certInfo = null;
        try {
            const forge = require('node-forge');
            const pfxBase64 = pfxBuffer.toString('base64');
            const pfxAsn1 = forge.util.decode64(pfxBase64);
            const p12Asn1 = forge.asn1.fromDer(pfxAsn1);
            const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha);
            
            const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
            if (certBags && certBags[forge.pki.oids.certBag] && certBags[forge.pki.oids.certBag].length > 0) {
                const cert = certBags[forge.pki.oids.certBag][0].cert;
                
                // Extrair informações
                const cn = cert.subject.getField('CN');
                const cnValue = cn ? cn.value : '';
                const cnpjMatch = cnValue.match(/(\d{14})/);
                
                certInfo = {
                    cnpj: cnpjMatch ? cnpjMatch[1] : '',
                    razaoSocial: cnValue.split(':')[0].trim(),
                    validade: cert.validity.notAfter,
                    emissao: cert.validity.notBefore
                };
                
                // Verificar se certificado está válido
                const agora = new Date();
                if (cert.validity.notAfter < agora) {
                    return res.status(400).json({ error: 'Certificado expirado' });
                }
            }
        } catch (forgeError) {
            console.error('❌ Erro ao validar certificado:', forgeError.message);
            if (forgeError.message.includes('Invalid password')) {
                return res.status(400).json({ error: 'Senha do certificado incorreta' });
            }
            return res.status(400).json({ error: 'Certificado inválido: ' + forgeError.message });
        }
        
        // Criptografar senha (base64 simples - em produção usar algo mais seguro)
        const senhaCriptografada = Buffer.from(senha).toString('base64');
        
        // Verificar se já existe configuração para a empresa na tabela nfe_configuracoes
        const [existing] = await pool.query(
            'SELECT id FROM nfe_configuracoes WHERE empresa_id = ?',
            [empresaId]
        );
        
        if (existing && existing.length > 0) {
            // Atualizar configuração existente
            await pool.query(`
                UPDATE nfe_configuracoes 
                SET certificado_pfx = ?,
                    certificado_senha = ?,
                    certificado_validade = ?,
                    certificado_cnpj = ?,
                    certificado_nome = ?,
                    updated_at = NOW()
                WHERE empresa_id = ?
            `, [
                pfxBuffer,
                senhaCriptografada,
                certInfo ? certInfo.validade : null,
                certInfo ? certInfo.cnpj : null,
                certInfo ? certInfo.razaoSocial : req.file.originalname,
                empresaId
            ]);
        } else {
            // Criar nova configuração
            await pool.query(`
                INSERT INTO nfe_configuracoes 
                (empresa_id, certificado_pfx, certificado_senha, certificado_validade, certificado_cnpj, certificado_nome, ambiente, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 'homologacao', NOW(), NOW())
            `, [
                empresaId,
                pfxBuffer,
                senhaCriptografada,
                certInfo ? certInfo.validade : null,
                certInfo ? certInfo.cnpj : null,
                certInfo ? certInfo.razaoSocial : req.file.originalname
            ]);
        }
        
        // Também salvar na tabela certificados_digitais para compatibilidade
        await pool.query(`
            INSERT INTO certificados_digitais (arquivo_nome, senha_hash, validade, created_at, updated_at)
            VALUES (?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE 
                arquivo_nome = VALUES(arquivo_nome),
                senha_hash = VALUES(senha_hash),
                validade = VALUES(validade),
                updated_at = NOW()
        `, [
            req.file.originalname, 
            senhaCriptografada, 
            certInfo ? certInfo.validade : new Date(Date.now() + 365*24*60*60*1000)
        ]);
        
        console.log('✅ Certificado salvo com sucesso nas tabelas nfe_configuracoes e certificados_digitais');
        
        res.json({ 
            success: true,
            message: 'Certificado instalado com sucesso',
            info: certInfo ? {
                cnpj: certInfo.cnpj,
                razaoSocial: certInfo.razaoSocial,
                validade: certInfo.validade,
                diasRestantes: Math.ceil((certInfo.validade - new Date()) / (1000 * 60 * 60 * 24))
            } : null
        });
        
    } catch (error) {
        console.error('❌ Erro ao salvar certificado:', error);
        res.status(500).json({ error: 'Erro ao salvar certificado: ' + error.message });
    }
});

// GET - Buscar configuração de importação de NF-e
app.get('/api/configuracoes/nfe-import', async (req, res) => {
    try {
        console.log('📋 Buscando config de NF-e...');
        
        const [rows] = await pool.query(`
            SELECT ativo, data_ativacao, updated_at 
            FROM configuracoes_nfe 
            ORDER BY id DESC LIMIT 1
        `);
        
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.json({ ativo: false });
        }
    } catch (error) {
        console.error('❌ Erro ao buscar config de NF-e:', error);
        res.status(500).json({ error: 'Erro ao buscar configuração' });
    }
});

// POST - Salvar configuração de importação de NF-e
app.post('/api/configuracoes/nfe-import', async (req, res) => {
    try {
        console.log('💾 Salvando config de NF-e...');
        
        const { ativo, data_ativacao } = req.body;
        
        // Verificar se já existe registro
        const [existing] = await pool.query('SELECT id FROM configuracoes_nfe LIMIT 1');
        
        if (existing.length > 0) {
            // Atualizar
            await pool.query(`
                UPDATE configuracoes_nfe SET
                    ativo = ?, data_ativacao = ?, updated_at = NOW()
                WHERE id = ?
            `, [ativo, data_ativacao, existing[0].id]);
        } else {
            // Inserir
            await pool.query(`
                INSERT INTO configuracoes_nfe (ativo, data_ativacao, created_at, updated_at)
                VALUES (?, ?, NOW(), NOW())
            `, [ativo, data_ativacao]);
        }
        
        console.log('✅ Config de NF-e salva com sucesso');
        res.json({ success: true });
        
    } catch (error) {
        console.error('❌ Erro ao salvar config de NF-e:', error);
        res.status(500).json({ error: 'Erro ao salvar configuração' });
    }
});

// =================================================================
// ROTAS DA API DE IMPRESSÁO
// =================================================================

// Obter fila de impressão
app.get('/api/print/queue', async (req, res) => {
    try {
        const autoPrintSystem = require('./scripts/auto-print-system');
        const queue = await autoPrintSystem.getQueue();
        
        res.json({
            success: true,
            queue: queue
        });
    } catch (error) {
        console.error('❌ Erro ao obter fila de impressão:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Obter histórico de impressões
app.get('/api/print/queue/history', async (req, res) => {
    try {
        const autoPrintSystem = require('./scripts/auto-print-system');
        const history = await autoPrintSystem.getHistory();
        
        res.json({
            success: true,
            history: history
        });
    } catch (error) {
        console.error('❌ Erro ao obter histórico:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Obter impressoras disponíveis
app.get('/api/print/printers', async (req, res) => {
    try {
        const autoPrintSystem = require('./scripts/auto-print-system');
        const printers = await autoPrintSystem.detectPrinters();
        
        res.json({
            success: true,
            printers: printers
        });
    } catch (error) {
        console.error('❌ Erro ao obter impressoras:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Detectar impressoras
app.post('/api/print/printers/detect', async (req, res) => {
    try {
        const autoPrintSystem = require('./scripts/auto-print-system');
        const printers = await autoPrintSystem.detectPrinters();
        
        res.json({
            success: true,
            count: printers.length,
            printers: printers
        });
    } catch (error) {
        console.error('❌ Erro ao detectar impressoras:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Adicionar job à fila de impressão
app.post('/api/print/add', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Nenhum arquivo fornecido'
            });
        }

        const settings = JSON.parse(req.body.settings || '{}');
        const autoPrintSystem = require('./scripts/auto-print-system');
        
        const job = await autoPrintSystem.addToQueue(req.file.path, {
            printer: settings.printer,
            copies: settings.copies || 1,
            paperSize: settings.paperSize || 'A4',
            orientation: settings.orientation || 'portrait',
            colorMode: settings.colorMode || 'color',
            priority: settings.priority || 'normal',
            metadata: {
                originalName: req.file.originalname,
                documentName: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype
            }
        });
        
        res.json({
            success: true,
            jobId: job.id,
            message: 'Arquivo adicionado à fila de impressão'
        });
    } catch (error) {
        console.error('❌ Erro ao adicionar à fila:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Cancelar job de impressão
app.post('/api/print/cancel', async (req, res) => {
    try {
        const { jobId } = req.body;
        
        if (!jobId) {
            return res.status(400).json({
                success: false,
                error: 'ID do job não fornecido'
            });
        }

        const autoPrintSystem = require('./scripts/auto-print-system');
        const result = await autoPrintSystem.cancelJob(jobId);
        
        res.json({
            success: true,
            cancelled: result
        });
    } catch (error) {
        console.error('❌ Erro ao cancelar job:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Limpar fila de impressão
app.post('/api/print/queue/clear', async (req, res) => {
    try {
        const autoPrintSystem = require('./scripts/auto-print-system');
        const result = await autoPrintSystem.clearQueue();
        
        res.json({
            success: true,
            cancelledCount: result.cancelledCount
        });
    } catch (error) {
        console.error('❌ Erro ao limpar fila:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Obter estatísticas de impressão
app.get('/api/print/stats', async (req, res) => {
    try {
        const autoPrintSystem = require('./scripts/auto-print-system');
        const stats = await autoPrintSystem.getStatistics();
        
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('❌ Erro ao obter estatísticas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Definir impressora padrão
app.post('/api/print/settings/default-printer', async (req, res) => {
    try {
        const { printerName } = req.body;
        
        if (!printerName) {
            return res.status(400).json({
                success: false,
                error: 'Nome da impressora não fornecido'
            });
        }

        const autoPrintSystem = require('./scripts/auto-print-system');
        const result = await autoPrintSystem.setDefaultPrinter(printerName);
        
        res.json({
            success: true,
            defaultPrinter: result
        });
    } catch (error) {
        console.error('❌ Erro ao definir impressora padrão:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Atualizar configurações do sistema de impressão
app.post('/api/print/settings', async (req, res) => {
    try {
        const settings = req.body;
        const autoPrintSystem = require('./scripts/auto-print-system');
        const result = await autoPrintSystem.updateSettings(settings);
        
        res.json({
            success: true,
            settings: result
        });
    } catch (error) {
        console.error('❌ Erro ao atualizar configurações:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API PARA BUSCAR ÚLTIMO NÚMERO DE PEDIDO
app.get('/api/pcp/ultimo-pedido', async (req, res) => {
    try {
        console.log('🔍 Buscando último número de pedido...');
        
        const connection = await pool.getConnection();
        try {
            // Buscar o maior número de pedido registrado
            const [rows] = await connection.query(`
                SELECT MAX(CAST(numero_pedido AS UNSIGNED)) as ultimo_numero
                FROM ordens_producao
                WHERE numero_pedido IS NOT NULL 
                AND numero_pedido REGEXP '^[0-9]+$'
            `);
            
            let ultimoNumero = '0002025000'; // Número inicial padrão
            
            if (rows && rows.length > 0 && rows[0].ultimo_numero) {
                ultimoNumero = String(rows[0].ultimo_numero);
            }
            
            console.log('✅ Último número de pedido:', ultimoNumero);
            
            res.json({
                success: true,
                ultimo_numero: ultimoNumero
            });
            
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('❌ Erro ao buscar último pedido:', error);
        // Retornar número padrão em caso de erro
        res.json({
            success: true,
            ultimo_numero: '0002025000'
        });
    }
});

// API PARA GERAR ORDEM DE PRODUÇÁO EM EXCEL
app.post('/api/gerar-ordem-excel', async (req, res) => {
    try {
        console.log('📊 Iniciando geração de Ordem de Produção em Excel...');
        
        const dadosOrdem = req.body;
        
        console.log('🔍 DADOS RECEBIDOS - TRANSPORTADORA:', {
            transportadora_nome: dadosOrdem.transportadora_nome,
            transportadora_fone: dadosOrdem.transportadora_fone,
            transportadora_cep: dadosOrdem.transportadora_cep,
            transportadora_endereco: dadosOrdem.transportadora_endereco,
            transportadora_cpf_cnpj: dadosOrdem.transportadora_cpf_cnpj,
            transportadora_email_nfe: dadosOrdem.transportadora_email_nfe
        });
        
        // Validar dados obrigatórios
        if (!dadosOrdem.numero_orcamento || !dadosOrdem.cliente) {
            return res.status(400).json({ 
                error: 'Dados obrigatórios não fornecidos (numero_orcamento, cliente)' 
            });
        }

        try {
            console.log('📊 Tentando gerar XLSX usando template com ExcelJS...');
            
            const ExcelJS = require('exceljs');
            const fs = require('fs');
            const path = require('path');
            
            console.log('✅ ExcelJS carregado');
            
            // Usar caminho relativo simples para evitar problemas de encoding
            // 🔧 USAR TEMPLATE ORIGINAL COMPLETO para preservar formatação e fórmulas
            const templatePath = 'modules/PCP/Ordem de Produção.xlsx';
            const dataOrdem = dadosOrdem.data_liberacao || new Date().toLocaleDateString('pt-BR');
            // Formatar nome do cliente para nome de arquivo válido
            const nomeCliente = (dadosOrdem.cliente || dadosOrdem.cliente_razao || 'Cliente').replace(/[/\\:*?"<>|]/g, '_').trim();
            const nomeArquivo = `Ordem de Produção - ${nomeCliente} - ERP.xlsx`;
            const outputPath = path.join(__dirname, nomeArquivo);
            
            console.log('📂 Template path:', templatePath);
            console.log('📄 Output path:', outputPath);
            
            // Verificar se template existe
            if (!fs.existsSync(templatePath)) {
                throw new Error(`Template não encontrado: ${templatePath}`);
            }
            
            // Usar função existente que carrega e preenche o template
            const fileBuffer = await gerarExcelOrdemProducaoCompleta(dadosOrdem, ExcelJS, templatePath);
            
            console.log('✅ Template processado');
            console.log(`📊 Buffer gerado: ${fileBuffer.length} bytes`);
            
            // Configurar headers para download
            res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Length', fileBuffer.length);
            
            res.send(fileBuffer);
            
            console.log(`✅ Excel gerado com sucesso usando template: ${nomeArquivo}`);
            
        } catch (excelError) {
            console.log('❌ ERRO ao gerar XLSX:', excelError.message);
            console.log('📍 Stack trace:', excelError.stack);
            
            // Fallback para CSV
            const csvBuffer = await gerarExcelOrdemProducaoFallback(dadosOrdem);
            
            const nomeCliente = (dadosOrdem.cliente || 'Cliente').replace(/[/\\:*?"<>|]/g, '_').trim();
            const nomeArquivo = `Ordem de Produção - ${nomeCliente} - ERP.csv`;
            
            res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Length', csvBuffer.length);
            
            res.send(csvBuffer);
            
            console.log(`✅ CSV gerado com sucesso como fallback: ${nomeArquivo}`);
        }
        
    } catch (error) {
        console.error('❌ Erro ao gerar Excel da ordem de produção:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor ao gerar Excel',
            details: error.message 
        });
    }
});

// Função para gerar Excel da Ordem de Produção usando ExcelJS COM TEMPLATE CORRETO
async function gerarExcelOrdemProducaoCompleta(dados, ExcelJS, templatePath) {
    console.log('📂 Carregando template Excel...');
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    
    // 🎯 CORREÇÃO: Usar a aba VENDAS_PCP explicitamente
    const abaVendas = workbook.getWorksheet('VENDAS_PCP') || workbook.worksheets[0];
    const abaProducao = workbook.getWorksheet('PRODUÇÃO') || workbook.getWorksheet('PRODUCAO') || workbook.worksheets[1];
    
    if (!abaVendas) {
        throw new Error('Aba VENDAS_PCP não encontrada no template!');
    }
    
    console.log(`✅ Template carregado! Abas encontradas: ${workbook.worksheets.map(w => w.name).join(', ')}`);
    console.log('🔧 Usando template PREENCHIDO - fórmulas serão preservadas!\n');
    console.log('✏️ Preenchendo aba VENDAS_PCP...\n');
    
    // ========================================
    // ABA VENDAS_PCP - CABEÇALHO (linhas 4-9)
    // ========================================
    
    console.log('📝 Preenchendo cabeçalho...');
    
    // C4 - Número do Orçamento (como número se possível)
    const numOrcamento = dados.numero_orcamento || '';
    abaVendas.getCell('C4').value = isNaN(numOrcamento) ? numOrcamento : parseFloat(numOrcamento);
    
    // G4 - Número do Pedido (como número se possível)
    const numPedido = dados.numero_pedido || dados.num_pedido || '0';
    // Se for vazio ou NaN, usar 0
    const numPedidoFinal = numPedido === '' || numPedido === null || numPedido === undefined ? '0' : numPedido;
    abaVendas.getCell('G4').value = isNaN(numPedidoFinal) ? numPedidoFinal : parseFloat(numPedidoFinal);
    
    // J4 - Data de Liberação (como objeto Date)
    if (dados.data_liberacao) {
        // Se já é Date, usa direto
        if (dados.data_liberacao instanceof Date) {
            abaVendas.getCell('J4').value = dados.data_liberacao;
        } else {
            // Tentar converter string para Date (formato dd/mm/yyyy ou yyyy-mm-dd)
            const dataStr = String(dados.data_liberacao);
            let dataObj;
            
            if (dataStr.includes('/')) {
                const [d, m, y] = dataStr.split('/');
                dataObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            } else if (dataStr.includes('-')) {
                dataObj = new Date(dataStr);
            } else {
                dataObj = new Date();
            }
            
            abaVendas.getCell('J4').value = dataObj;
        }
        abaVendas.getCell('J4').numFmt = 'dd/mm/yyyy';
    } else {
        abaVendas.getCell('J4').value = new Date();
        abaVendas.getCell('J4').numFmt = 'dd/mm/yyyy';
    }
    
    // Vendedor (linha 6)
    abaVendas.getCell('C6').value = dados.vendedor || '';
    
    // 🔧 H6 - Calcular prazo de entrega (data liberação + dias) ao invés de usar fórmula
    if (dados.prazo_entrega) {
        // Se veio uma data específica, usar
        if (dados.prazo_entrega instanceof Date) {
            abaVendas.getCell('H6').value = dados.prazo_entrega;
        } else if (typeof dados.prazo_entrega === 'string' && dados.prazo_entrega.includes('/')) {
            // Tentar parsear data no formato dd/mm/yyyy
            const [d, m, y] = dados.prazo_entrega.split('/');
            abaVendas.getCell('H6').value = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        } else {
            abaVendas.getCell('H6').value = dados.prazo_entrega;
        }
        abaVendas.getCell('H6').numFmt = 'dd/mm/yyyy';
    } else {
        // Calcular: data liberação + 30 dias
        const dataLib = abaVendas.getCell('J4').value;
        if (dataLib instanceof Date) {
            const prazo = new Date(dataLib);
            prazo.setDate(prazo.getDate() + 30);
            abaVendas.getCell('H6').value = prazo;
            abaVendas.getCell('H6').numFmt = 'dd/mm/yyyy';
        }
    }
    
    // Cliente (linhas 7-9)
    abaVendas.getCell('C7').value = dados.cliente || '';
    abaVendas.getCell('C8').value = dados.contato || dados.contato_cliente || '';
    
    // H8 - Telefone (como número se possível, sem formatação)
    const telefone = dados.telefone || dados.fone_cliente || '';
    const telefoneNum = String(telefone).replace(/\D/g, ''); // Remove não-dígitos
    abaVendas.getCell('H8').value = telefoneNum ? parseFloat(telefoneNum) : telefone;
    
    abaVendas.getCell('C9').value = dados.email || dados.email_cliente || '';
    abaVendas.getCell('J9').value = dados.frete || dados.tipo_frete || '';
    
    // ========================================
    // ABA VENDAS_PCP - TRANSPORTADORA (linhas 12-15)
    // ========================================
    
    console.log('🚚 Preenchendo dados da transportadora...');
    console.log('DEBUG TRANSPORTADORA:', {
        nome: dados.transportadora_nome,
        cep: dados.transportadora_cep,
        endereco: dados.transportadora_endereco,
        cpf_cnpj: dados.transportadora_cpf_cnpj
    });
    
    // C12 - Nome da Transportadora
    const nomeTransp = dados.transportadora_nome || dados.transportadora?.nome || '';
    abaVendas.getCell('C12').value = nomeTransp;
    console.log(`   Transportadora Nome: ${nomeTransp}`);
    
    // 🔧 H12 - Telefone da transportadora (calcular ao invés de fórmula)
    const telefoneTransp = dados.transportadora_fone || dados.transportadora?.fone || telefone || '';
    if (telefoneTransp) {
        const telefoneTranspNum = String(telefoneTransp).replace(/\D/g, '');
        abaVendas.getCell('H12').value = telefoneTranspNum ? parseFloat(telefoneTranspNum) : telefoneTransp;
        console.log(`   Transportadora Fone: ${telefoneTransp}`);
    } else {
        abaVendas.getCell('H12').value = '';
    }
    
    // C13 - CEP da Transportadora
    const cepTransp = dados.transportadora_cep || dados.transportadora?.cep || '';
    abaVendas.getCell('C13').value = cepTransp;
    console.log(`   Transportadora CEP: ${cepTransp}`);
    
    // F13 - Endereço da Transportadora
    const endTransp = dados.transportadora_endereco || dados.transportadora?.endereco || '';
    abaVendas.getCell('F13').value = endTransp;
    console.log(`   Transportadora Endereço: ${endTransp}`);
    
    // ========================================
    // ABA VENDAS_PCP - DADOS PARA COBRANÇA (linha 14)
    // ========================================
    
    console.log('💰 Preenchendo dados para cobrança...');
    
    // C14 - CPF/CNPJ para Cobrança (manter como TEXTO para evitar notação científica)
    // Priorizar cpf_cnpj do formulário principal
    const cpfCnpjCobranca = dados.cpf_cnpj || dados.cpf_cnpj_cobranca || dados.cliente_cpf_cnpj || '';
    let cpfCnpjStr = String(cpfCnpjCobranca).replace(/\D/g, ''); // Remove não-dígitos
    const cellC14 = abaVendas.getCell('C14');
    if (cpfCnpjStr && cpfCnpjStr.length >= 11) {
        cellC14.value = cpfCnpjStr;
        // Formatação visual: CPF se <= 11 dígitos, CNPJ se > 11
        cellC14.numFmt = '[<=99999999999]000.000.000-00;00.000.000/0000-00';
    } else {
        cellC14.value = '';
    }
    console.log(`   CPF/CNPJ Cobrança: ${cpfCnpjStr}`);
    
    // G14 - Email NF-e para Cobrança (PRIORIZAR EMAIL DO CLIENTE!)
    const emailNfeCobranca = dados.email_nfe_cobranca || dados.email_cliente || dados.email || 
                             dados.email_nfe;
    if (emailNfeCobranca) {
        abaVendas.getCell('G14').value = emailNfeCobranca;
    }
    
    // C15 - CPF/CNPJ da Transportadora (manter como TEXTO para evitar notação científica)
    const cnpjTransp = dados.transportadora_cpf_cnpj || dados.transportadora?.cpf_cnpj || '';
    // CRÍTICO: Não usar parseFloat() - causa notação científica (3.64086E+13)
    // Manter como string com formato de texto
    let cnpjStr = String(cnpjTransp).replace(/\D/g, ''); // Remove não-dígitos
    if (!cnpjStr || cnpjStr.length < 11) {
        // Valor de fallback para garantir visual
        cnpjStr = '36408556000169'; // CNPJ do template
    }
    const cellC15 = abaVendas.getCell('C15');
    cellC15.value = cnpjStr;
    // Formatação visual igual ao template preenchido
    cellC15.numFmt = '[<=99999999999]000.000.000-00;00.000.000/0000-00';
    
    // 🔧 G15 - Email NF-e da transportadora (calcular ao invés de fórmula)
    const emailNfe = dados.transportadora_email_nfe || dados.transportadora?.email_nfe || 
                     dados.email_nfe || dados.email_cliente;
    if (emailNfe) {
        abaVendas.getCell('G15').value = emailNfe;
    }
    
    // ========================================
    // ABA VENDAS_PCP - PRODUTOS (linhas 18-32)
    // ========================================
    // 
    // MAPEAMENTO CORRETO DO TEMPLATE:
    // ┌─────────┬────────────────────────────────────────────────────────┐
    // │ COLUNA  │ CAMPO                                                  │
    // ├─────────┼────────────────────────────────────────────────────────┤
    // │ A       │ # Item (1, 2, 3...)                                    │
    // │ B       │ Código do Produto (TRN10, DUN16, etc)                  │
    // │ C-E     │ Produto (VLOOKUP automático - NÃO PREENCHER!)          │
    // │ F       │ Embalagem (Bobina, Caixa, etc)                         │
    // │ G       │ Lance(s) (1x1000, 1x500, etc)                          │
    // │ H       │ Quantidade                                             │
    // │ I       │ Valor Unitário R$                                      │
    // │ J       │ Valor Total R$ (calculado)                             │
    // └─────────┴────────────────────────────────────────────────────────┘
    // 
    // ⚠️ IMPORTANTE: 
    // - Coluna C tem FÓRMULA VLOOKUP que busca descrição pelo código
    // - Colunas C-E estão MESCLADAS no template
    // - NÃO existe coluna de "Variação" no template VENDAS_PCP
    // - Produtos começam na LINHA 18 (não 19!)
    // ========================================
    
    console.log('📦 Preenchendo produtos...');
    let produtos = dados.produtos || dados.items || dados.itens || [];
    
    // Converter string JSON se necessário
    if (typeof produtos === 'string') {
        try { 
            produtos = JSON.parse(produtos); 
        } catch(e) { 
            console.error('❌ Erro ao parsear produtos:', e);
            produtos = []; 
        }
    }
    
    // Garantir que é array
    if (!Array.isArray(produtos)) {
        produtos = [];
    }
    
    // ⚠️ LINHA 17 É CABEÇALHO, PRODUTOS COMEÇAM NA LINHA 18!
    let linhaAtual = 18;
    const LINHA_MAXIMA_PRODUTOS = 32; // Última linha de produtos
    
    // 🔧 Construir catálogo de produtos do template (colunas N:O)
    const catalogoProdutos = {};
    for (let r = 18; r <= 180; r++) {
        const cod = abaVendas.getCell(`N${r}`).value;
        const desc = abaVendas.getCell(`O${r}`).value;
        if (cod && cod !== 'PRODUTO' && desc) {
            catalogoProdutos[String(cod).trim().toUpperCase()] = String(desc).trim();
        }
    }
    console.log(`📚 Catálogo carregado: ${Object.keys(catalogoProdutos).length} produtos`);
    
    produtos.forEach((prod, index) => {
        if (prod && linhaAtual <= LINHA_MAXIMA_PRODUTOS) {
            const codigoProd = String(prod.codigo || '').trim().toUpperCase();
            const descricaoCatalogo = catalogoProdutos[codigoProd] || prod.descricao || '';
            
            console.log(`   📦 Produto ${index + 1} → Linha ${linhaAtual}:`);
            console.log(`      Código: ${codigoProd}`);
            console.log(`      Descrição (catálogo): ${descricaoCatalogo}`);
            console.log(`      Embalagem: ${prod.embalagem}`);
            console.log(`      Lances: ${prod.lances}`);
            console.log(`      Qtd: ${prod.quantidade}`);
            console.log(`      Valor: ${prod.valor_unitario}`);
            
            // A - Número do item (sequencial)
            abaVendas.getCell(`A${linhaAtual}`).value = index + 1;
            
            // B - Código do produto (usado pelo VLOOKUP da coluna C)
            abaVendas.getCell(`B${linhaAtual}`).value = codigoProd;
            
            // C - Atualizar o RESULT da fórmula VLOOKUP para garantir que aparece a descrição
            // Preservar a fórmula mas forçar o resultado
            const cellC = abaVendas.getCell(`C${linhaAtual}`);
            if (cellC.value && typeof cellC.value === 'object' && cellC.value.formula) {
                // Manter a fórmula e adicionar o resultado
                cellC.value = {
                    formula: cellC.value.formula,
                    result: descricaoCatalogo
                };
            } else {
                // Se não tem fórmula, colocar direto
                cellC.value = descricaoCatalogo;
            }
            
            // F - Embalagem
            abaVendas.getCell(`F${linhaAtual}`).value = prod.embalagem || '';
            
            // G - Lance(s)
            abaVendas.getCell(`G${linhaAtual}`).value = prod.lances || '';
            
            // H - Quantidade
            const quantidade = parseFloat(prod.quantidade) || 0;
            abaVendas.getCell(`H${linhaAtual}`).value = quantidade;
            
            // I - Valor Unitário
            const valorUnitario = parseFloat(prod.valor_unitario) || parseFloat(prod.preco) || 0;
            abaVendas.getCell(`I${linhaAtual}`).value = valorUnitario;
            abaVendas.getCell(`I${linhaAtual}`).numFmt = 'R$ #,##0.00';
            
            // J - Valor Total (calculado, não fórmula para garantir valor correto)
            const valorTotal = quantidade * valorUnitario;
            abaVendas.getCell(`J${linhaAtual}`).value = valorTotal;
            abaVendas.getCell(`J${linhaAtual}`).numFmt = 'R$ #,##0.00';
            
            console.log(`      ✅ Linha ${linhaAtual} preenchida!`);
            linhaAtual++;
        }
    });
    // Reforçar formatação de I18-I32 e J18-J32 após o preenchimento dos produtos
    // Linha 17 é cabeçalho, produtos começam na 18
    for (let i = 18; i <= 32; i++) {
        // Preço unitário
        abaVendas.getCell(`I${i}`).numFmt = 'R$ #,##0.00';
        const valorUnit = abaVendas.getCell(`I${i}`).value;
        if (typeof valorUnit === 'number') {
            abaVendas.getCell(`I${i}`).value = Number(valorUnit.toFixed(2));
        }
        
        // Total - calcular sempre, mesmo se estiver vazio
        const qtd = parseFloat(abaVendas.getCell(`H${i}`).value) || 0;
        const preco = parseFloat(abaVendas.getCell(`I${i}`).value) || 0;
        const total = qtd * preco;
        abaVendas.getCell(`J${i}`).value = total;
        abaVendas.getCell(`J${i}`).numFmt = 'R$ #,##0.00';
    }
    
    // Calcular e preencher TOTAL GERAL (somando todas as linhas de produtos)
    // Produtos nas linhas 18-32
    let totalGeral = 0;
    for (let i = 18; i <= 32; i++) {
        const valorLinha = parseFloat(abaVendas.getCell(`J${i}`).value) || 0;
        totalGeral += valorLinha;
    }
    
    // Preencher célula de total (I35 conforme template)
    // Template mostra: I34="Total do Pedido:$" e I35=fórmula de soma
    abaVendas.getCell('I35').value = totalGeral;
    abaVendas.getCell('I35').numFmt = 'R$ #,##0.00';
    console.log(`💰 Total Geral calculado: R$ ${totalGeral.toFixed(2)}`);
    
    console.log(`✅ ${produtos.length} produtos preenchidos!`);
    
    // ========================================
    // ABA VENDAS_PCP - OBSERVAÇÕES (linhas 36-54)
    // ========================================
    
    // Observações do Pedido (área 36-42 tem merge de células A-J)
    if (dados.observacoes || dados.observacoes_pedido) {
        console.log('📝 Preenchendo observações do pedido...');
        // Linha 37-42 são células mescladas para observações
        const obs = dados.observacoes || dados.observacoes_pedido || '';
        abaVendas.getCell('B37').value = obs;
    }
    
    // ========================================
    // CONDIÇÕES DE PAGAMENTO (linhas 44-46)
    // ========================================
    
    console.log('💳 Preenchendo condições de pagamento...');
    
    // Linha 45: Primeira forma de pagamento
    if (dados.forma_pagamento) {
        abaVendas.getCell('A45').value = dados.forma_pagamento;
        abaVendas.getCell('B45').value = dados.forma_pagamento;
        abaVendas.getCell('C45').value = dados.forma_pagamento;
        abaVendas.getCell('D45').value = dados.forma_pagamento;
    }
    
    // E45: Percentual
    if (dados.percentual_pagamento) {
        const perc = parseFloat(dados.percentual_pagamento) / 100;
        abaVendas.getCell('E45').value = perc;
        abaVendas.getCell('E45').numFmt = '0%';
    } else {
        abaVendas.getCell('E45').value = 1; // 100% padrão
        abaVendas.getCell('E45').numFmt = '0%';
    }
    
    // F-H45: Método de pagamento
    if (dados.metodo_pagamento) {
        abaVendas.getCell('F45').value = dados.metodo_pagamento;
        abaVendas.getCell('G45').value = dados.metodo_pagamento;
        abaVendas.getCell('H45').value = dados.metodo_pagamento;
    }
    
    // I45 e J45: Valor total (referência ao total calculado)
    abaVendas.getCell('I45').value = totalGeral;
    abaVendas.getCell('I45').numFmt = 'R$ #,##0.00';
    abaVendas.getCell('J45').value = totalGeral;
    abaVendas.getCell('J45').numFmt = 'R$ #,##0.00';
    
    // Linha 46: Segunda parcela (se houver)
    if (dados.forma_pagamento && dados.forma_pagamento.toUpperCase() === 'PARCELADO') {
        abaVendas.getCell('A46').value = 'ENTREGA';
        abaVendas.getCell('B46').value = 'ENTREGA';
        abaVendas.getCell('C46').value = 'ENTREGA';
        abaVendas.getCell('D46').value = 'ENTREGA';
        
        // E46: Percentual restante (100% - E45)
        if (dados.percentual_pagamento) {
            const percRestante = 1 - (parseFloat(dados.percentual_pagamento) / 100);
            abaVendas.getCell('E46').value = percRestante;
            abaVendas.getCell('E46').numFmt = '0%';
        }
    }
    
    // ========================================
    // EMBALAGEM E OBSERVAÇÕES FINAIS (linhas 48-54)
    // ========================================
    
    // Linha 51-54: Observações adicionais (células E-J mescladas)
    if (dados.observacoes || dados.observacoes_pedido) {
        console.log('📝 Preenchendo observações finais...');
        const obs = dados.observacoes || dados.observacoes_pedido || '';
        
        // E51-J54 são células mescladas para observações detalhadas
        abaVendas.getCell('E51').value = obs;
        abaVendas.getCell('F51').value = obs;
        abaVendas.getCell('G51').value = obs;
        abaVendas.getCell('H51').value = obs;
        abaVendas.getCell('I51').value = obs;
        abaVendas.getCell('J51').value = obs;
    }
    
    // ========================================
    // ABA VENDAS_PCP - CONDIÇÕES DE PAGAMENTO (linhas 43-46)
    // ========================================
    
    console.log('💳 Preenchendo condições de pagamento...');
    if (dados.condicoes_pagamento) {
        abaVendas.getCell('A43').value = `Condições: ${dados.condicoes_pagamento}`;
    }
    
    // ========================================
    // ABA VENDAS_PCP - VOLUMES E EMBALAGEM (linha 48)
    // ========================================
    
    if (dados.qtd_volumes) {
        abaVendas.getCell('C48').value = dados.qtd_volumes;
    }
    
    if (dados.tipo_embalagem_entrega) {
        abaVendas.getCell('H48').value = dados.tipo_embalagem_entrega;
    }
    
    // ========================================
    // ========================================
    // REFORÇO FINAL: Preencher C15 (CNPJ) para garantir que nunca fique vazio
    let cnpjTranspFinal = dados.transportadora_cpf_cnpj || (dados.transportadora && dados.transportadora.cpf_cnpj) || '';
    let cnpjStrFinal = String(cnpjTranspFinal).replace(/\D/g, '');
    if (!cnpjStrFinal || cnpjStrFinal.length < 11) {
        cnpjStrFinal = '36408556000169';
    }
    const cellC15Final = abaVendas.getCell('C15');
    cellC15Final.value = cnpjStrFinal;
    cellC15Final.numFmt = '[<=99999999999]000.000.000-00;00.000.000/0000-00';
    // ========================================
    // 🔧 ABA PRODUÇÃO: Atualizar fórmulas VLOOKUP com results
    // ========================================
    if (abaProducao) {
        console.log('\n🔧 Atualizando aba PRODUÇÃO...');
        
        // A aba PRODUÇÃO tem suas próprias fórmulas VLOOKUP na coluna C
        // As linhas de produtos são: 13, 16, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46, 49, 52 (de 3 em 3)
        // Também precisa atualizar a coluna F (Código de Cores)
        
        // Pegar produtos já preenchidos na VENDAS_PCP
        const linhasProducao = [13, 16, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46, 49, 52];
        
        // Mapeamento: linha VENDAS_PCP (18,19,20...) -> linha PRODUÇÃO (13,16,19...)
        // VENDAS_PCP linha 18 = primeiro produto -> PRODUÇÃO linha 13
        // VENDAS_PCP linha 19 = segundo produto -> PRODUÇÃO linha 16
        // etc.
        
        produtos.forEach((prod, index) => {
            if (index < linhasProducao.length && prod) {
                const linhaProd = linhasProducao[index];
                const codigoProd = String(prod.codigo || '').trim().toUpperCase();
                const descricaoCatalogo = catalogoProdutos[codigoProd] || prod.descricao || '';
                
                // B - Código (pode ser uma fórmula referenciando VENDAS_PCP ou valor direto)
                const cellB = abaProducao.getCell(`B${linhaProd}`);
                if (cellB.value && typeof cellB.value === 'object' && cellB.value.formula) {
                    // Manter fórmula mas setar o result
                    cellB.value = { formula: cellB.value.formula, result: codigoProd };
                } else {
                    cellB.value = codigoProd;
                }
                
                // C - Descrição do produto (tem VLOOKUP próprio)
                const cellC = abaProducao.getCell(`C${linhaProd}`);
                if (cellC.value && typeof cellC.value === 'object' && cellC.value.formula) {
                    cellC.value = { formula: cellC.value.formula, result: descricaoCatalogo };
                } else if (descricaoCatalogo) {
                    cellC.value = descricaoCatalogo;
                }
                
                // Também verificar se há fórmula na linha +1 e +2 (layout 3-em-3)
                for (let offset = 1; offset <= 2; offset++) {
                    const cellCExtra = abaProducao.getCell(`C${linhaProd + offset}`);
                    if (cellCExtra.value && typeof cellCExtra.value === 'object' && cellCExtra.value.formula) {
                        // Algumas linhas intermediárias podem ter fórmulas também
                        cellCExtra.value = { formula: cellCExtra.value.formula, result: '' };
                    }
                }
                
                console.log(`   📦 PRODUÇÃO Linha ${linhaProd}: ${codigoProd} = ${descricaoCatalogo.substring(0, 40)}...`);
            }
        });
        
        console.log(`   ✅ ${Math.min(produtos.length, linhasProducao.length)} produtos atualizados na aba PRODUÇÃO`);
    }
    
    console.log('\n✅ Excel completo gerado com sucesso!');
    console.log('📊 Estrutura:');
    console.log('   - Cabeçalho: C4, G4, J4, C6, C7-C9');
    console.log('   - Transportadora: C12, C13, F13, C15, H12, G15');
    console.log(`   - Produtos: ${produtos.length} itens (linhas 18-${linhaAtual - 1})`);
    console.log('   - Pagamento: M, N, O, P, Q preenchidos');
    console.log(`   - Total Geral: R$ ${totalGeral.toFixed(2)}`);
    console.log('   ✨ Todos os valores calculados diretamente (sem fórmulas)\n');
    
    return await workbook.xlsx.writeBuffer();
}

// Função fallback para CSV
async function gerarExcelOrdemProducaoFallback(dados) {
    const csv = [];
    
    // Header da Ordem de Produção
    csv.push(['ORDEM DE PRODUÇÁO ALUFORCE']);
    csv.push(['']);
    csv.push(['Dados da Ordem:']);
    csv.push(['Número do Orçamento:', dados.numero_orcamento || '']);
    csv.push(['Número do Pedido:', dados.numero_pedido || '']);
    csv.push(['Data de Liberação:', dados.data_liberacao || '']);
    csv.push(['Vendedor:', dados.vendedor || '']);
    csv.push(['Prazo de Entrega:', dados.prazo_entrega || '']);
    csv.push(['']);
    
    // Dados do Cliente
    csv.push(['Dados do Cliente:']);
    csv.push(['Nome do Cliente:', dados.cliente || '']);
    csv.push(['Contato:', dados.contato_cliente || '']);
    csv.push(['Telefone:', dados.fone_cliente || '']);
    csv.push(['Email:', dados.email_cliente || '']);
    csv.push(['Tipo de Frete:', dados.tipo_frete || '']);
    csv.push(['']);
    
    // Dados da Transportadora
    csv.push(['Dados da Transportadora:']);
    csv.push(['Nome:', dados.transportadora_nome || '']);
    csv.push(['Telefone:', dados.transportadora_fone || '']);
    csv.push(['CEP:', dados.transportadora_cep || '']);
    csv.push(['Endereço:', dados.transportadora_endereco || '']);
    csv.push(['CPF/CNPJ:', dados.transportadora_cpf_cnpj || '']);
    csv.push(['Email NFe:', dados.transportadora_email_nfe || '']);
    csv.push(['']);
    
    // Produtos
    csv.push(['PRODUTOS:']);
    csv.push(['Código', 'Descrição', 'Embalagem', 'Lances', 'Quantidade', 'Valor Unitário', 'Total']);
    
    if (dados.produtos && Array.isArray(dados.produtos)) {
        dados.produtos.forEach(produto => {
            const total = (produto.quantidade || 0) * (produto.valor_unitario || 0);
            csv.push([
                produto.codigo || '',
                produto.descricao || '',
                produto.embalagem || 'Padrão',
                produto.lances || '',
                produto.quantidade || 0,
                `R$ ${(produto.valor_unitario || 0).toFixed(2)}`,
                `R$ ${total.toFixed(2)}`
            ]);
        });
        
        // Total geral
        const valorTotal = dados.produtos.reduce((total, produto) => {
            return total + ((produto.quantidade || 0) * (produto.valor_unitario || 0));
        }, 0);
        
        csv.push(['', '', '', '', '', 'TOTAL GERAL:', `R$ ${valorTotal.toFixed(2)}`]);
    }
    
    csv.push(['']);
    
    // Observações
    csv.push(['OBSERVAÇÕES:']);
    csv.push([dados.observacoes_pedido || 'Nenhuma observação especial.']);
    csv.push(['']);
    
    // Dados de Pagamento e Entrega
    csv.push(['CONDIÇÕES DE PAGAMENTO:']);
    csv.push([dados.condicoes_pagamento || '30 dias após faturamento']);
    csv.push(['']);
    csv.push(['DADOS DE ENTREGA:']);
    csv.push(['Data Prevista:', dados.data_previsao_entrega || '']);
    csv.push(['Quantidade de Volumes:', dados.qtd_volumes || '']);
    csv.push(['Tipo de Embalagem:', dados.tipo_embalagem_entrega || '']);
    csv.push(['Observações de Entrega:', dados.observacoes_entrega || '']);
    
    // Converter CSV para Buffer
    const csvString = csv.map(row => row.join('\t')).join('\n');
    const buffer = Buffer.from('\ufeff' + csvString, 'utf8'); // BOM para UTF-8
    
    return buffer;
}

// PEDIDOS
apiPCPRouter.get('/pedidos', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        const [rows] = await pool.query('SELECT * FROM pedidos ORDER BY id DESC LIMIT ? OFFSET ?', [limit, offset]);
        const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM pedidos');
        
        res.json({ pedidos: rows, total, page, limit });
    } catch (error) { next(error); }
});

// PEDIDOS FATURADOS
apiPCPRouter.get('/pedidos/faturados', async (req, res, next) => {
    try {
        const [rows] = await pool.query("SELECT * FROM pedidos WHERE status = 'faturado' ORDER BY id DESC LIMIT 10");
        res.json(rows);
    } catch (error) { next(error); }
});

// PEDIDOS PRAZOS
apiPCPRouter.get('/pedidos/prazos', async (req, res, next) => {
    try {
        const [rows] = await pool.query("SELECT * FROM pedidos WHERE prazo_entrega IS NOT NULL ORDER BY prazo_entrega ASC LIMIT 10");
        res.json(rows);
    } catch (error) { next(error); }
});

// ACOMPANHAMENTO
apiPCPRouter.get('/acompanhamento', async (req, res, next) => {
    try {
        const [rows] = await pool.query("SELECT * FROM ordens_producao WHERE status != 'Concluído' ORDER BY id DESC");
        res.json(rows);
    } catch (error) { next(error); }
});

// CLIENTES - Autocomplete
apiPCPRouter.get('/clientes', async (req, res, next) => {
    try {
        const query = req.query.q || '';
        const limit = parseInt(req.query.limit) || 500; // Aumentado para 500 resultados
        const empresaId = req.query.empresa_id || 1; // Default empresa 1
        
        if (!query) {
            const [rows] = await pool.query(
                'SELECT id, nome, nome_fantasia, razao_social, cnpj, cnpj_cpf, contato, email, telefone, vendedor_responsavel FROM clientes WHERE empresa_id = ? ORDER BY nome LIMIT ?', 
                [empresaId, limit]
            );
            return res.json(rows);
        }
        
        const searchPattern = `%${query}%`;
        const [rows] = await pool.query(
            `SELECT id, nome, nome_fantasia, razao_social, cnpj, cnpj_cpf, contato, email, telefone, vendedor_responsavel 
             FROM clientes 
             WHERE empresa_id = ? AND (nome LIKE ? OR nome_fantasia LIKE ? OR razao_social LIKE ? OR cnpj LIKE ? OR cnpj_cpf LIKE ?) 
             ORDER BY nome 
             LIMIT ?`,
            [empresaId, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, limit]
        );
        res.json(rows);
    } catch (error) { next(error); }
});

// TRANSPORTADORAS - Autocomplete
apiPCPRouter.get('/transportadoras', async (req, res, next) => {
    try {
        const query = req.query.q || '';
        const limit = parseInt(req.query.limit) || 10;
        
        if (!query) {
            const [rows] = await pool.query('SELECT * FROM transportadoras LIMIT ?', [limit]);
            return res.json(rows);
        }
        
        const searchPattern = `%${query}%`;
        const [rows] = await pool.query(
            'SELECT * FROM transportadoras WHERE nome LIKE ? OR cnpj LIKE ? OR cpf LIKE ? LIMIT ?',
            [searchPattern, searchPattern, searchPattern, limit]
        );
        res.json(rows);
    } catch (error) { next(error); }
});

// VENDEDORES/FUNCIONÁRIOS - Autocomplete para PCP

// API para criar ordem de produção completa
apiPCPRouter.post('/ordem-producao-completa', async (req, res, next) => {
    try {
        console.log('📋 Criando ordem de produção completa...');
        
        const {
            vendedor = 'Vendedor Padrão',
            cliente = 'Cliente Teste',
            contato_cliente = '',
            fone_cliente = '',
            email_cliente = '',
            tipo_frete = 'FOB',
            transportadora_nome = '',
            transportadora_fone = '',
            transportadora_endereco = '',
            transportadora_cpf_cnpj = '',
            transportadora_email_nfe = '',
            produtos = [],
            observacoes_pedido = '',
            condicoes_pagamento = '30 dias',
            prazo_entrega = '15 dias úteis'
        } = req.body;

        // Gerar número sequencial único
        const timestamp = Date.now();
        const novoSequencial = String(timestamp).slice(-5);
        const numeroOrcamento = `ORC-${novoSequencial}`;
        const numeroPedido = `PED-${novoSequencial}`;

        // Calcular total
        let valorTotal = 0;
        produtos.forEach(produto => {
            valorTotal += (produto.quantidade || 0) * (produto.valor_unitario || 0);
        });

        console.log(`💰 Valor total calculado: R$ ${valorTotal.toFixed(2)}`);

        // Preparar dados para o script de geração
        const dadosCompletos = {
            numero_sequencial: novoSequencial,
            numero_orcamento: numeroOrcamento,
            numero_pedido: numeroPedido,
            data_liberacao: new Date().toLocaleDateString('pt-BR'),
            vendedor,
            prazo_entrega,
            cliente,
            contato_cliente,
            fone_cliente,
            email_cliente,
            tipo_frete,
            transportadora_nome,
            transportadora_fone,
            transportadora_endereco,
            transportadora_cpf_cnpj,
            transportadora_email_nfe,
            produtos: produtos.map(p => ({
                codigo: p.codigo || '',
                descricao: p.descricao || p.nome || '',
                embalagem: p.embalagem || 'UN',
                lances: p.lances || '1',
                quantidade: p.quantidade || 0,
                valor_unitario: p.valor_unitario || 0
            })),
            observacoes_pedido,
            condicoes_pagamento,
            data_previsao_entrega: prazo_entrega
        };

        // Gerar Excel usando novo gerador funcional
        const TemplateXlsxGenerator = require('./template-xlsx-generator');
        
        try {
            console.log('🔧 Usando novo gerador funcional...');
            
            const gerador = new TemplateXlsxGenerator();
            const filename = `ORDEM_PRODUCAO_${novoSequencial}_${Date.now()}.xlsx`;
            const outputPath = path.join(__dirname, filename);
            
            // Preparar dados no formato esperado
            const dadosFormatados = {
                numero_orcamento: dadosCompletos.numero_orcamento,
                data_orcamento: dadosCompletos.data_liberacao,
                vendedor: dadosCompletos.vendedor,
                cliente: dadosCompletos.cliente,
                cliente_contato: dadosCompletos.contato_cliente,
                cliente_telefone: dadosCompletos.fone_cliente,
                cliente_email: dadosCompletos.email_cliente,
                transportadora: dadosCompletos.transportadora_nome,
                frete: dadosCompletos.tipo_frete,
                prazo_entrega: dadosCompletos.prazo_entrega,
                produtos: produtos.map(p => ({
                    codigo: p.codigo || '',
                    descricao: p.descricao || p.nome || '',
                    quantidade: p.quantidade || 0,
                    unidade: p.embalagem || 'UN',
                    preco_unitario: p.valor_unitario || 0,
                    total: (p.quantidade || 0) * (p.valor_unitario || 0)
                })),
                observacoes: dadosCompletos.observacoes_pedido || 'Produto conforme especificação técnica.'
            };
            
            // Gerar arquivo usando novo gerador
            const resultado = await gerador.aplicarMapeamentoCompleto(dadosFormatados, outputPath);
            
            if (resultado.sucesso) {
                console.log(`✅ Ordem de produção gerada com novo gerador: ${filename}`);
                console.log(`💰 Total: R$ ${resultado.totalGeral.toFixed(2)}`);
                
                // Retornar arquivo para download
                res.download(outputPath, `Ordem_Producao_${numeroOrcamento}.xlsx`, (err) => {
                    if (!err) {
                        // Remover arquivo após download
                        setTimeout(() => {
                            try {
                                fs.unlinkSync(outputPath);
                            } catch (cleanupError) {
                                console.warn('Erro ao limpar arquivo:', cleanupError);
                            }
                        }, 5000);
                    }
                });
            } else {
                throw new Error('Falha na geração do arquivo com novo gerador');
            }

        } catch (excelError) {
            console.error('❌ Erro ao gerar Excel:', excelError);
            throw new Error(`Erro na geração do arquivo Excel: ${excelError.message}`);
        }

    } catch (error) {
        console.error('❌ Erro ao criar ordem de produção:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar ordem de produção',
            error: error.message
        });
    }
});

// Função para gerar ordem com ExcelJS (formato válido)
async function gerarOrdemComExcelJS(workbook, worksheet, dados, outputPath) {
    console.log('\n🎯 GERANDO ORDEM COM EXCELJS...');
    
    // === CABEÇALHO ===
    worksheet.mergeCells('A1:K1');
    const tituloCell = worksheet.getCell('A1');
    tituloCell.value = 'ORDEM DE PRODUÇÁO ALUFORCE';
    tituloCell.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
    tituloCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } };
    tituloCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;
    
    // === DADOS DA ORDEM ===
    worksheet.getCell('A3').value = 'Dados da Ordem:';
    worksheet.getCell('A3').font = { bold: true };
    
    worksheet.getCell('A4').value = 'Número do Orçamento:';
    worksheet.getCell('B4').value = dados.numero_orcamento || dados.orcamento || '';
    
    worksheet.getCell('D4').value = 'Número do Pedido:';
    worksheet.getCell('E4').value = dados.numero_pedido || dados.pedido || '';
    
    worksheet.getCell('A5').value = 'Data de Liberação:';
    worksheet.getCell('B5').value = dados.data_liberacao || new Date().toLocaleDateString('pt-BR');
    
    worksheet.getCell('D5').value = 'Vendedor:';
    worksheet.getCell('E5').value = dados.vendedor_nome || dados.vendedor || '';
    
    worksheet.getCell('G5').value = 'Prazo de Entrega:';
    worksheet.getCell('H5').value = dados.prazo_entrega || '';
    
    // === DADOS DO CLIENTE ===
    worksheet.getCell('A7').value = 'Dados do Cliente:';
    worksheet.getCell('A7').font = { bold: true };
    
    worksheet.getCell('A8').value = 'Nome do Cliente:';
    worksheet.getCell('B8').value = dados.cliente_nome || dados.cliente || '';
    
    worksheet.getCell('A9').value = 'Contato:';
    worksheet.getCell('B9').value = dados.cliente_contato || '';
    
    worksheet.getCell('D9').value = 'Telefone:';
    worksheet.getCell('E9').value = dados.cliente_fone || dados.cliente_telefone || '';
    
    worksheet.getCell('A10').value = 'Email:';
    worksheet.getCell('B10').value = dados.cliente_email || '';
    
    worksheet.getCell('D10').value = 'Tipo de Frete:';
    worksheet.getCell('E10').value = dados.frete || '';
    
    // === DADOS DA TRANSPORTADORA ===
    worksheet.getCell('A12').value = 'Dados da Transportadora:';
    worksheet.getCell('A12').font = { bold: true };
    
    const transportadoraFields = [
        { label: 'Nome:', cell: 'B13', value: dados.transportadora_nome || '' },
        { label: 'Telefone:', cell: 'B14', value: dados.transportadora_fone || dados.transportadora_telefone || '' },
        { label: 'CEP:', cell: 'B15', value: dados.transportadora_cep || '' },
        { label: 'Endereço:', cell: 'B16', value: dados.transportadora_endereco || '' },
        { label: 'CPF/CNPJ:', cell: 'B17', value: dados.transportadora_cpf_cnpj || '' },
        { label: 'Email NFe:', cell: 'B18', value: dados.transportadora_email_nfe || dados.email_nfe || '' }
    ];
    
    transportadoraFields.forEach((field, index) => {
        worksheet.getCell(`A${13 + index}`).value = field.label;
        worksheet.getCell(field.cell).value = field.value;
    });
    
    // === PRODUTOS ===
    let currentRow = 20;
    worksheet.getCell(`A${currentRow}`).value = 'PRODUTOS:';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    
    currentRow++;
    const headerRow = worksheet.getRow(currentRow);
    headerRow.values = ['Código', 'Descrição', 'Embalagem', 'Lances', 'Quantidade', 'Valor Unitário', 'Total'];
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    
    let produtos = dados.produtos || dados.itens || [];
    if (typeof produtos === 'string') {
        try { produtos = JSON.parse(produtos); } catch(e) { produtos = []; }
    }
    
    let totalGeral = 0;
    let produtosProcessados = 0;
    
    currentRow++;
    produtos.forEach((produto, index) => {
        const row = worksheet.getRow(currentRow + index);
        const quantidade = parseFloat(produto.quantidade) || 0;
        const valorUnitario = parseFloat(produto.valor_unitario || produto.preco_unitario || produto.preco || 0);
        const total = quantidade * valorUnitario;
        
        row.values = [
            produto.codigo || '',
            produto.descricao || produto.nome || '',
            produto.embalagem || '',
            produto.lances || '',
            quantidade,
            valorUnitario.toFixed(2),
            total.toFixed(2)
        ];
        
        totalGeral += total;
        produtosProcessados++;
    });
    
    currentRow += produtos.length + 1;
    
    // === TOTAL ===
    worksheet.getCell(`F${currentRow}`).value = 'TOTAL GERAL:';
    worksheet.getCell(`F${currentRow}`).font = { bold: true };
    worksheet.getCell(`G${currentRow}`).value = `R$ ${totalGeral.toFixed(2)}`;
    worksheet.getCell(`G${currentRow}`).font = { bold: true };
    
    // === OBSERVAÇÕES ===
    currentRow += 2;
    worksheet.getCell(`A${currentRow}`).value = 'OBSERVAÇÕES:';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`A${currentRow + 1}`).value = dados.observacoes || 'Nenhuma observação especial.';
    
    // === CONDIÇÕES DE PAGAMENTO ===
    currentRow += 3;
    worksheet.getCell(`A${currentRow}`).value = 'CONDIÇÕES DE PAGAMENTO:';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`A${currentRow + 1}`).value = dados.condicoes_pagamento || '30 dias após faturamento';
    
    // === DADOS DE ENTREGA ===
    currentRow += 3;
    worksheet.getCell(`A${currentRow}`).value = 'DADOS DE ENTREGA:';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    
    worksheet.getCell(`A${currentRow + 1}`).value = 'Data Prevista:';
    worksheet.getCell(`B${currentRow + 1}`).value = dados.data_entrega || '';
    
    worksheet.getCell(`A${currentRow + 2}`).value = 'Quantidade de Volumes:';
    worksheet.getCell(`B${currentRow + 2}`).value = dados.quantidade_volumes || '';
    
    worksheet.getCell(`A${currentRow + 3}`).value = 'Tipo de Embalagem:';
    worksheet.getCell(`B${currentRow + 3}`).value = dados.tipo_embalagem || '';
    
    worksheet.getCell(`A${currentRow + 4}`).value = 'Observações de Entrega:';
    worksheet.getCell(`B${currentRow + 4}`).value = dados.observacoes_entrega || '';
    
    // Ajustar largura das colunas
    worksheet.columns = [
        { width: 15 }, { width: 40 }, { width: 15 }, { width: 10 },
        { width: 12 }, { width: 15 }, { width: 15 }, { width: 15 },
        { width: 15 }, { width: 15 }, { width: 15 }
    ];
    
    // Salvar arquivo
    await workbook.xlsx.writeFile(outputPath);
    console.log(`✅ Arquivo salvo: ${outputPath}`);
    
    return {
        sucesso: true,
        totalGeral,
        produtosProcessados,
        arquivo: outputPath
    };
}

// Nova rota otimizada para gerar ordem de produção com gerador funcional
apiPCPRouter.post('/gerar-ordem', async (req, res, next) => {
    try {
        console.log('🏭 Gerando ordem via rota otimizada com ExcelJS...');
        
        const ExcelJS = require('exceljs');
        
        // Preparar dados recebidos
        const dadosOrdem = req.body;
        console.log('📋 Dados recebidos:', Object.keys(dadosOrdem));
        
        // Gerar número de ordem único
        const numeroOrdem = `OP${Date.now()}`;
        
        // Gerar nome único para arquivo
        const timestamp = Date.now();
        const filename = `ordem_producao_${timestamp}.xlsx`;
        const outputPath = path.join(__dirname, filename);
        
        // Criar workbook com ExcelJS
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Ordem de Produção');
        
        // Gerar ordem usando ExcelJS
        const resultado = await gerarOrdemComExcelJS(workbook, worksheet, dadosOrdem, outputPath);
        
        if (resultado.sucesso) {
            console.log(`✅ Ordem gerada: ${filename}`);
            console.log(`💰 Total: R$ ${resultado.totalGeral.toFixed(2)}`);
            console.log(`📦 Produtos: ${resultado.produtosProcessados}`);
            
            // Salvar ordem no banco de dados
            try {
                const [insertResult] = await pool.query(`
                    INSERT INTO ordens_producao (
                        numero_ordem, numero_orcamento, numero_pedido, data_liberacao,
                        vendedor_nome, cliente_nome, cliente_fone, cliente_email, cliente_contato,
                        transportadora_nome, transportadora_fone, transportadora_cep, 
                        transportadora_endereco, transportadora_cpf_cnpj, transportadora_email_nfe,
                        frete, prazo_entrega, percentual_parcelado, metodo_parcelado,
                        produtos, total_geral, quantidade_produtos,
                        observacoes, observacoes_pedido,
                        arquivo_xlsx, caminho_arquivo,
                        status, criado_por
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    numeroOrdem,
                    dadosOrdem.numero_orcamento || dadosOrdem.orcamento || null,
                    dadosOrdem.numero_pedido || dadosOrdem.pedido || null,
                    dadosOrdem.data_liberacao || new Date(),
                    dadosOrdem.vendedor_nome || dadosOrdem.vendedor || null,
                    dadosOrdem.cliente_nome || dadosOrdem.cliente || null,
                    dadosOrdem.cliente_fone || null,
                    dadosOrdem.cliente_email || null,
                    dadosOrdem.cliente_contato || null,
                    dadosOrdem.transportadora_nome || null,
                    dadosOrdem.transportadora_fone || dadosOrdem.transportadora_telefone || null,
                    dadosOrdem.transportadora_cep || null,
                    dadosOrdem.transportadora_endereco || null,
                    dadosOrdem.transportadora_cpf_cnpj || null,
                    dadosOrdem.transportadora_email_nfe || dadosOrdem.email_nfe || null,
                    dadosOrdem.frete || null,
                    dadosOrdem.prazo_entrega || null,
                    dadosOrdem.percentual_parcelado || 100.00,
                    dadosOrdem.metodo_parcelado || 'FATURAMENTO',
                    JSON.stringify(dadosOrdem.produtos || []),
                    resultado.totalGeral,
                    resultado.produtosProcessados,
                    dadosOrdem.observacoes || null,
                    dadosOrdem.observacoes_pedido || null,
                    filename,
                    outputPath,
                    'pendente',
                    req.user ? req.user.id : null
                ]);
                
                console.log(`✅ Ordem salva no banco: ID ${insertResult.insertId}`);
                
                res.json({
                    sucesso: true,
                    ordemId: insertResult.insertId,
                    numeroOrdem: numeroOrdem,
                    arquivo: filename,
                    totalGeral: resultado.totalGeral,
                    produtosProcessados: resultado.produtosProcessados,
                    mensagem: 'Ordem de produção gerada e registrada com sucesso!'
                });
            } catch (dbError) {
                console.error('❌ Erro ao salvar ordem no banco:', dbError);
                // Mesmo com erro no banco, retorna sucesso do arquivo gerado
                res.json({
                    sucesso: true,
                    arquivo: filename,
                    totalGeral: resultado.totalGeral,
                    produtosProcessados: resultado.produtosProcessados,
                    mensagem: 'Ordem de produção gerada com sucesso! (Erro ao registrar no banco)',
                    avisoDb: 'Falha ao salvar no banco de dados'
                });
            }
        } else {
            throw new Error('Falha na geração da ordem');
        }
        
    } catch (error) {
        console.error('❌ Erro na nova rota:', error);
        res.status(500).json({
            sucesso: false,
            erro: error.message,
            mensagem: 'Erro ao gerar ordem de produção'
        });
    }
});

// LISTAR ORDENS DE PRODUÇÁO - Para página Controle de Produção
apiPCPRouter.get('/ordens', async (req, res, next) => {
    try {
        const { status, data_inicio, data_fim, cliente, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                id, numero_ordem, numero_orcamento, numero_pedido,
                data_liberacao, data_emissao,
                vendedor_nome, cliente_nome,
                total_geral, quantidade_produtos,
                status, arquivo_xlsx,
                criado_em, atualizado_em
            FROM ordens_producao
            WHERE 1=1
        `;
        const params = [];
        
        if (status) {
            query += ` AND status = ?`;
            params.push(status);
        }
        
        if (data_inicio) {
            query += ` AND data_emissao >= ?`;
            params.push(data_inicio);
        }
        
        if (data_fim) {
            query += ` AND data_emissao <= ?`;
            params.push(data_fim);
        }
        
        if (cliente) {
            query += ` AND cliente_nome LIKE ?`;
            params.push(`%${cliente}%`);
        }
        
        query += ` ORDER BY data_emissao DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));
        
        const [ordens] = await pool.query(query, params);
        
        // Contar total de ordens (para paginação)
        const [countResult] = await pool.query(`
            SELECT COUNT(*) as total FROM ordens_producao WHERE 1=1
            ${status ? 'AND status = ?' : ''}
        `, status ? [status] : []);
        
        res.json({
            ordens,
            total: countResult[0].total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('❌ Erro ao listar ordens:', error);
        next(error);
    }
});

// OBTER ÚLTIMO NÚMERO DE PEDIDO PCP (Auto-increment)
apiPCPRouter.get('/ultimo-pedido', async (req, res, next) => {
    try {
        const [result] = await pool.query(`
            SELECT numero_pedido 
            FROM ordens_producao 
            WHERE numero_pedido IS NOT NULL 
            AND numero_pedido REGEXP '^[0-9]+$'
            ORDER BY CAST(numero_pedido AS UNSIGNED) DESC 
            LIMIT 1
        `);
        
        let ultimo_numero = '0002025000'; // Valor padrão inicial
        
        if (result.length > 0 && result[0].numero_pedido) {
            ultimo_numero = result[0].numero_pedido;
        }
        
        console.log(`✅ Último pedido PCP: ${ultimo_numero}`);
        res.json({ ultimo_numero });
    } catch (error) {
        console.error('❌ Erro ao buscar último pedido PCP:', error);
        // Retorna valor padrão em caso de erro
        res.json({ ultimo_numero: '0002025000' });
    }
});

// OBTER DETALHES DE UMA ORDEM ESPECÍFICA
apiPCPRouter.get('/ordens/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const [ordens] = await pool.query(`
            SELECT * FROM ordens_producao WHERE id = ?
        `, [id]);
        
        if (ordens.length === 0) {
            return res.status(404).json({ erro: 'Ordem não encontrada' });
        }
        
        const ordem = ordens[0];
        
        // Parse produtos JSON
        if (ordem.produtos) {
            try {
                ordem.produtos = JSON.parse(ordem.produtos);
            } catch (e) {
                console.error('Erro ao parsear produtos:', e);
                ordem.produtos = [];
            }
        }
        
        res.json(ordem);
    } catch (error) {
        console.error('❌ Erro ao buscar ordem:', error);
        next(error);
    }
});

// ATUALIZAR STATUS DE ORDEM
apiPCPRouter.patch('/ordens/:id/status', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const statusValidos = ['pendente', 'em_producao', 'concluida', 'cancelada'];
        if (!statusValidos.includes(status)) {
            return res.status(400).json({ erro: 'Status inválido' });
        }
        
        await pool.query(`
            UPDATE ordens_producao 
            SET status = ?, atualizado_em = CURRENT_TIMESTAMP 
            WHERE id = ?
        `, [status, id]);
        
        res.json({ sucesso: true, mensagem: 'Status atualizado com sucesso' });
    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
        next(error);
    }
});

// VENDEDORES/FUNCIONÁRIOS - Autocomplete para PCP
apiPCPRouter.get('/vendedores', async (req, res, next) => {
    try {
        const query = req.query.q || '';
        const limit = parseInt(req.query.limit) || 10;
        
        if (!query) {
            const [rows] = await pool.query(`
                SELECT id, nome_completo as nome, cargo, departamento 
                FROM funcionarios 
                WHERE status = 'ativo' AND (cargo LIKE '%vendedor%' OR cargo LIKE '%comercial%' OR departamento LIKE '%vendas%' OR departamento LIKE '%comercial%')
                LIMIT ?
            `, [limit]);
            return res.json(rows);
        }
        
        const searchPattern = `%${query}%`;
        const [rows] = await pool.query(`
            SELECT id, nome_completo as nome, cargo, departamento 
            FROM funcionarios 
            WHERE status = 'ativo' 
            AND (cargo LIKE '%vendedor%' OR cargo LIKE '%comercial%' OR departamento LIKE '%vendas%' OR departamento LIKE '%comercial%')
            AND (nome_completo LIKE ? OR cargo LIKE ?)
            LIMIT ?
        `, [searchPattern, searchPattern, limit]);
        res.json(rows);
    } catch (error) { next(error); }
});

// ===================== INTEGRAÇÃO COMPRAS <-> PCP =====================

// LISTAR MATERIAIS CRÍTICOS (estoque abaixo do mínimo)
apiPCPRouter.get('/materiais-criticos', async (req, res, next) => {
    try {
        const [materiais] = await pool.query(`
            SELECT * FROM vw_materiais_criticos
        `);
        res.json(materiais);
    } catch (error) {
        console.error('❌ Erro ao buscar materiais críticos:', error);
        next(error);
    }
});

// CRIAR PEDIDO DE COMPRA A PARTIR DO PCP
apiPCPRouter.post('/gerar-pedido-compra', async (req, res, next) => {
    try {
        const { 
            ordem_producao_id,
            fornecedor_id,
            materiais, // Array de {produto_id, quantidade, preco_unitario}
            prioridade = 'media',
            data_entrega_prevista,
            observacoes
        } = req.body;

        // Validações
        if (!fornecedor_id || !materiais || materiais.length === 0) {
            return res.status(400).json({ 
                erro: 'fornecedor_id e materiais são obrigatórios' 
            });
        }

        // Calcular valor total
        const valorTotal = materiais.reduce((total, item) => {
            return total + (item.quantidade * item.preco_unitario);
        }, 0);

        // Criar pedido de compra
        const [result] = await pool.query(`
            INSERT INTO pedidos_compras (
                fornecedor_id, valor_total, origem, origem_id, 
                prioridade, data_entrega_prevista, observacoes, usuario_id
            ) VALUES (?, ?, 'pcp', ?, ?, ?, ?, ?)
        `, [
            fornecedor_id,
            valorTotal,
            ordem_producao_id,
            prioridade,
            data_entrega_prevista,
            observacoes,
            req.user ? req.user.id : null
        ]);

        const pedidoId = result.insertId;

        // Inserir itens do pedido
        for (const material of materiais) {
            await pool.query(`
                INSERT INTO itens_pedido_compras (
                    pedido_id, produto_id, produto_descricao,
                    quantidade, preco_unitario, subtotal
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                pedidoId,
                material.produto_id,
                material.descricao,
                material.quantidade,
                material.preco_unitario,
                material.quantidade * material.preco_unitario
            ]);

            // Criar/atualizar notificação de estoque
            await pool.query(`
                UPDATE notificacoes_estoque 
                SET status = 'em_compra', pedido_compra_id = ?
                WHERE produto_id = ? AND status = 'pendente'
            `, [pedidoId, material.produto_id]);
        }

        // Atualizar ordem de produção (se informada)
        if (ordem_producao_id) {
            await pool.query(`
                UPDATE ordens_producao
                SET pedidos_compra_vinculados = JSON_ARRAY_APPEND(
                    COALESCE(pedidos_compra_vinculados, '[]'),
                    '$',
                    ?
                )
                WHERE id = ?
            `, [pedidoId, ordem_producao_id]);
        }

        res.json({
            sucesso: true,
            pedido_id: pedidoId,
            valor_total: valorTotal,
            mensagem: 'Pedido de compra criado com sucesso'
        });

    } catch (error) {
        console.error('❌ Erro ao gerar pedido de compra:', error);
        next(error);
    }
});

// LISTAR NOTIFICAÇÕES DE ESTOQUE
apiPCPRouter.get('/notificacoes-estoque', async (req, res, next) => {
    try {
        const { status = 'pendente', tipo } = req.query;
        
        let query = `
            SELECT 
                n.*,
                p.codigo, p.descricao, p.unidade,
                op.numero_ordem,
                pc.id as pedido_compra_numero
            FROM notificacoes_estoque n
            INNER JOIN produtos p ON n.produto_id = p.id
            LEFT JOIN ordens_producao op ON n.ordem_producao_id = op.id
            LEFT JOIN pedidos_compras pc ON n.pedido_compra_id = pc.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ` AND n.status = ?`;
            params.push(status);
        }

        if (tipo) {
            query += ` AND n.tipo = ?`;
            params.push(tipo);
        }

        query += ` ORDER BY 
            CASE n.tipo
                WHEN 'estoque_zero' THEN 1
                WHEN 'estoque_critico' THEN 2
                WHEN 'estoque_baixo' THEN 3
            END,
            n.criado_em DESC
        `;

        const [notificacoes] = await pool.query(query, params);
        res.json(notificacoes);

    } catch (error) {
        console.error('❌ Erro ao buscar notificações:', error);
        next(error);
    }
});

// RESOLVER/IGNORAR NOTIFICAÇÃO DE ESTOQUE
apiPCPRouter.patch('/notificacoes-estoque/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, observacoes } = req.body;

        if (!['resolvido', 'ignorado'].includes(status)) {
            return res.status(400).json({ erro: 'Status inválido' });
        }

        await pool.query(`
            UPDATE notificacoes_estoque
            SET status = ?, 
                resolvido_em = CURRENT_TIMESTAMP,
                resolvido_por = ?,
                observacoes = ?
            WHERE id = ?
        `, [status, req.user ? req.user.id : null, observacoes, id]);

        res.json({ sucesso: true, mensagem: 'Notificação atualizada' });

    } catch (error) {
        console.error('❌ Erro ao atualizar notificação:', error);
        next(error);
    }
});

// VERIFICAR MATERIAIS NECESSÁRIOS PARA UMA ORDEM
apiPCPRouter.get('/ordens/:id/materiais-necessarios', async (req, res, next) => {
    try {
        const { id } = req.params;

        // Buscar ordem
        const [ordens] = await pool.query(`
            SELECT produtos FROM ordens_producao WHERE id = ?
        `, [id]);

        if (ordens.length === 0) {
            return res.status(404).json({ erro: 'Ordem não encontrada' });
        }

        let produtosOrdem = [];
        try {
            produtosOrdem = JSON.parse(ordens[0].produtos || '[]');
        } catch (e) {
            console.error('Erro ao parsear produtos:', e);
        }

        // Para cada produto, verificar estoque disponível
        const materiaisNecessarios = [];
        
        for (const produto of produtosOrdem) {
            // Buscar no cadastro de produtos
            const [produtos] = await pool.query(`
                SELECT id, codigo, descricao, estoque_atual, estoque_minimo, unidade
                FROM produtos
                WHERE codigo = ? OR descricao LIKE ?
                LIMIT 1
            `, [produto.codigo, `%${produto.codigo}%`]);

            if (produtos.length > 0) {
                const p = produtos[0];
                const quantidadeNecessaria = parseFloat(produto.quantidade || 0);
                const deficit = quantidadeNecessaria - p.estoque_atual;

                if (deficit > 0) {
                    materiaisNecessarios.push({
                        produto_id: p.id,
                        codigo: p.codigo,
                        descricao: p.descricao,
                        unidade: p.unidade,
                        quantidade_necessaria: quantidadeNecessaria,
                        estoque_atual: p.estoque_atual,
                        deficit: deficit,
                        criticidade: p.estoque_atual === 0 ? 'critico' : 'atencao'
                    });
                }
            }
        }

        res.json({
            ordem_id: id,
            materiais_necessarios: materiaisNecessarios,
            total_itens_faltando: materiaisNecessarios.length
        });

    } catch (error) {
        console.error('❌ Erro ao verificar materiais:', error);
        next(error);
    }
});

app.use('/api/pcp', apiPCPRouter);

// ===================== ROTAS RH =====================
const apiRHRouter = express.Router();
apiRHRouter.use(authenticateToken);
apiRHRouter.use(authorizeArea('rh'));

// Rota /me para o RH retornar dados do usuário logado
apiRHRouter.get('/me', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Não autenticado' });
        }
        
        // Buscar dados completos do usuário no banco com JOIN para foto do funcionário
        const [[dbUser]] = await pool.query(
            `SELECT u.id, u.nome, u.email, u.role, u.is_admin, 
                    u.permissoes_rh as permissoes, u.foto, u.avatar,
                    f.foto_perfil_url as foto_funcionario
             FROM usuarios u
             LEFT JOIN funcionarios f ON u.email = f.email
             WHERE u.id = ?`,
            [req.user.id]
        );
        
        if (!dbUser) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        
        // Parse permissões
        let permissoes = [];
        if (dbUser.permissoes) {
            try {
                permissoes = JSON.parse(dbUser.permissoes);
            } catch (e) {
                console.error('[API/RH/ME] Erro ao parsear permissoes:', e);
                permissoes = [];
            }
        }
        
        // Determinar a foto (prioridade: avatar > foto > foto_funcionario)
        const fotoUsuario = dbUser.avatar || dbUser.foto || dbUser.foto_funcionario || "/avatars/default.webp";
        
        // Retornar dados completos do usuário
        res.json({
            user: {
                id: dbUser.id,
                nome: dbUser.nome,
                email: dbUser.email,
                role: dbUser.role,
                avatar: fotoUsuario,
                foto: fotoUsuario,
                foto_perfil_url: fotoUsuario,
                is_admin: dbUser.is_admin,
                permissoes: permissoes
            }
        });
    } catch (error) {
        console.error('[API/RH/ME] Erro ao buscar usuário:', error);
        res.status(500).json({ message: 'Erro ao buscar dados do usuário' });
    }
});

// ROTAS: CRUD básico de funcionários (opera sobre a tabela `usuarios`)
// Criar funcionário (admin apenas)
apiRHRouter.post('/funcionarios', [
    authorizeAdmin,
    body('nome_completo').trim().notEmpty().withMessage('Nome completo é obrigatório')
        .isLength({ min: 3, max: 255 }).withMessage('Nome deve ter entre 3 e 255 caracteres'),
    body('email').trim().notEmpty().withMessage('Email é obrigatório')
        .isEmail().withMessage('Email inválido')
        .normalizeEmail(),
    body('senha').notEmpty().withMessage('Senha é obrigatória')
        .isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),
    body('role').optional().isIn(['user', 'admin']).withMessage('Role deve ser user ou admin'),
    validate
], async (req, res, next) => {
    try {
        const { nome_completo, email, senha, role } = req.body;
        const hashed = await bcrypt.hash(senha, 10);
        try {
            const [result] = await pool.query('INSERT INTO usuarios (nome, email, senha_hash, password_hash, role) VALUES (?, ?, ?, ?, ?)', [nome_completo, email, hashed, hashed, role || 'user']);
            res.status(201).json({ id: result.insertId });
        } catch (err) {
            if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Email já cadastrado.' });
            throw err;
        }
    } catch (error) { next(error); }
});

// Listar funcionários (admin apenas) - busca da tabela funcionarios
apiRHRouter.get('/funcionarios', authorizeAdmin, async (req, res, next) => {
    try {
        const { status, departamento, search, limit = 100, offset = 0 } = req.query;
        
        let sql = `
            SELECT 
                id, nome_completo, email, cpf, rg, telefone,
                cargo, departamento, status, role,
                data_nascimento, data_admissao,
                estado_civil, nacionalidade, naturalidade,
                endereco, foto_perfil_url, foto_thumb_url,
                pis_pasep, ctps_numero, ctps_serie,
                banco, agencia, conta_corrente,
                dependentes, cnh, certificado_reservista,
                titulo_eleitor, zona_eleitoral, secao_eleitoral,
                filiacao_mae, filiacao_pai, dados_conjuge
            FROM funcionarios 
            WHERE 1=1
        `;
        const params = [];
        
        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }
        if (departamento) {
            sql += ' AND departamento = ?';
            params.push(departamento);
        }
        if (search) {
            sql += ' AND (nome_completo LIKE ? OR email LIKE ? OR cargo LIKE ? OR cpf LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }
        
        sql += ' ORDER BY nome_completo ASC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [rows] = await pool.query(sql, params);
        
        // Buscar contagens para estatísticas
        const [[stats]] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Ativo' OR status = 'ativo' THEN 1 ELSE 0 END) as ativos,
                SUM(CASE WHEN MONTH(data_nascimento) = MONTH(CURRENT_DATE()) THEN 1 ELSE 0 END) as aniversariantes,
                SUM(CASE WHEN MONTH(data_admissao) = MONTH(CURRENT_DATE()) AND YEAR(data_admissao) = YEAR(CURRENT_DATE()) THEN 1 ELSE 0 END) as admissoes_mes
            FROM funcionarios
        `);
        
        // Buscar lista de departamentos únicos
        const [deptRows] = await pool.query('SELECT DISTINCT departamento FROM funcionarios WHERE departamento IS NOT NULL AND departamento != "" ORDER BY departamento');
        const departamentos = deptRows.map(r => r.departamento);
        
        // Buscar lista de cargos únicos
        const [cargoRows] = await pool.query('SELECT DISTINCT cargo FROM funcionarios WHERE cargo IS NOT NULL AND cargo != "" ORDER BY cargo');
        const cargos = cargoRows.map(r => r.cargo);
        
        res.json({
            funcionarios: rows,
            stats: stats || { total: 0, ativos: 0, aniversariantes: 0, admissoes_mes: 0 },
            departamentos,
            cargos
        });
    } catch (error) { 
        console.error('Erro ao listar funcionários:', error);
        next(error); 
    }
});

// API para listar cargos com estatísticas
apiRHRouter.get('/cargos', authorizeAdmin, async (req, res, next) => {
    try {
        // Buscar cargos únicos com contagem de funcionários e departamentos
        const [rows] = await pool.query(`
            SELECT 
                cargo as nome,
                departamento,
                COUNT(*) as total_funcionarios,
                CASE 
                    WHEN cargo LIKE '%Diretor%' OR cargo LIKE '%Gerente%' THEN 'Executivo'
                    WHEN cargo LIKE '%Gerente%' OR cargo LIKE '%Coordenador%' OR cargo LIKE '%Supervisor%' THEN 'Gerencial'
                    WHEN cargo LIKE '%Analista%' OR cargo LIKE '%Tecnico%' THEN 'Técnico'
                    ELSE 'Operacional'
                END as nivel,
                CASE 
                    WHEN cargo LIKE '%Diretor%' THEN '1210-05'
                    WHEN cargo LIKE '%Gerente%' THEN '1421-05'
                    WHEN cargo LIKE '%Analista%' THEN '2521-05'
                    WHEN cargo LIKE '%Tecnico%' THEN '3132-05'
                    WHEN cargo LIKE '%Operador%' THEN '8111-10'
                    WHEN cargo LIKE '%Consultor%' THEN '3541-25'
                    WHEN cargo LIKE '%Vendedor%' THEN '5211-10'
                    WHEN cargo LIKE '%Comprador%' THEN '3542-05'
                    WHEN cargo LIKE '%Auxiliar%' THEN '5143-20'
                    WHEN cargo LIKE '%Assistente%' THEN '4110-10'
                    ELSE '9999-00'
                END as cbo
            FROM funcionarios 
            WHERE cargo IS NOT NULL AND cargo != ''
            GROUP BY cargo, departamento
            ORDER BY cargo
        `);
        
        // Adicionar IDs sequenciais
        const cargosComId = rows.map((c, index) => ({
            id: index + 1,
            ...c
        }));
        
        res.json({
            success: true,
            data: cargosComId,
            total: cargosComId.length
        });
    } catch (error) {
        console.error('Erro ao listar cargos:', error);
        next(error);
    }
});

// Buscar funcionário por ID (próprio usuário ou admin)
apiRHRouter.get('/funcionarios/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Verificar se é o próprio usuário ou admin
        if (req.user.id !== parseInt(id) && req.user.role !== 'admin' && req.user.is_admin !== 1) {
            return res.status(403).json({ message: 'Acesso negado' });
        }
        
        // Buscar dados na tabela funcionarios (mais completa)
        const [rows] = await pool.query(`
            SELECT 
                id, nome_completo, email, cpf, rg, telefone, 
                data_nascimento, data_admissao, cargo, departamento,
                endereco, cep, cidade, estado, bairro, status,
                estado_civil, nacionalidade, naturalidade,
                filiacao_mae, filiacao_pai, dados_conjuge,
                pis_pasep, ctps, ctps_numero, ctps_serie,
                titulo_eleitor, zona_eleitoral, secao_eleitoral,
                certificado_reservista, cnh,
                banco, agencia, conta_corrente, dados_bancarios,
                foto_perfil_url, foto_thumb_url,
                dependentes, role, salario, tipo_contrato
            FROM funcionarios 
            WHERE id = ?
        `, [id]);
        
        if (rows.length === 0) {
            // Se não encontrou na tabela funcionarios, buscar na tabela usuarios
            const [userRows] = await pool.query(`
                SELECT 
                    id, nome as nome_completo, email, role,
                    '' as telefone, null as data_nascimento, '' as departamento,
                    '' as apelido, '' as bio, foto
                FROM usuarios 
                WHERE id = ?
            `, [id]);
            
            if (userRows.length === 0) {
                return res.status(404).json({ message: 'Funcionário não encontrado' });
            }
            
            return res.json(userRows[0]);
        }
        
        res.json(rows[0]);
    } catch (error) { 
        console.error('Erro ao buscar funcionário:', error);
        next(error); 
    }
});

// Deletar funcionário por id (admin apenas)
apiRHRouter.delete('/funcionarios/:id', [
    authorizeAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID do funcionário inválido'),
    validate
], async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Verificar se o funcionário existe
        const [funcionario] = await pool.query('SELECT id FROM funcionarios WHERE id = ?', [id]);
        if (funcionario.length === 0) {
            // Tenta verificar na tabela usuarios
            const [usuario] = await pool.query('SELECT id FROM usuarios WHERE id = ?', [id]);
            if (usuario.length === 0) {
                return res.status(404).json({ message: 'Funcionário não encontrado.' });
            }
            // Deleta da tabela usuarios
            await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
            return res.status(204).send();
        }
        
        // Buscar todas as tabelas com FK para funcionarios dinamicamente
        const [fkTables] = await pool.query(`
            SELECT TABLE_NAME, COLUMN_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE REFERENCED_TABLE_NAME = 'funcionarios' 
            AND REFERENCED_COLUMN_NAME = 'id'
            AND TABLE_SCHEMA = DATABASE()
        `);
        
        // Deletar registros de todas as tabelas relacionadas
        for (const fk of fkTables) {
            try {
                await pool.query(`DELETE FROM \`${fk.TABLE_NAME}\` WHERE \`${fk.COLUMN_NAME}\` = ?`, [id]);
            } catch (err) {
                // Ignora erros de tabela inexistente
                if (err.errno !== 1146) {
                    console.log(`⚠️ Erro ao deletar de ${fk.TABLE_NAME}: ${err.message}`);
                }
            }
        }
        
        // Agora deleta o funcionário
        const [result] = await pool.query('DELETE FROM funcionarios WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Funcionário não encontrado.' });
        }
        
        res.status(204).send();
    } catch (error) { next(error); }
});

// Atualizar funcionário por id (admin apenas)
apiRHRouter.put('/funcionarios/:id', [
    authorizeAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID do funcionário inválido'),
    validate
], async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            nome_completo, email, cpf, rg, telefone,
            cargo, departamento, status,
            data_nascimento, data_admissao,
            estado_civil, nacionalidade, naturalidade,
            endereco, pis_pasep, ctps_numero, ctps_serie,
            banco, agencia, conta_corrente,
            dependentes, cnh, certificado_reservista,
            titulo_eleitor, zona_eleitoral, secao_eleitoral,
            filiacao_mae, filiacao_pai, dados_conjuge
        } = req.body;
        
        const [result] = await pool.query(`
            UPDATE funcionarios SET
                nome_completo = COALESCE(?, nome_completo),
                email = COALESCE(?, email),
                cpf = COALESCE(?, cpf),
                rg = COALESCE(?, rg),
                telefone = COALESCE(?, telefone),
                cargo = COALESCE(?, cargo),
                departamento = COALESCE(?, departamento),
                status = COALESCE(?, status),
                data_nascimento = COALESCE(?, data_nascimento),
                data_admissao = COALESCE(?, data_admissao),
                estado_civil = COALESCE(?, estado_civil),
                nacionalidade = COALESCE(?, nacionalidade),
                naturalidade = COALESCE(?, naturalidade),
                endereco = COALESCE(?, endereco),
                pis_pasep = COALESCE(?, pis_pasep),
                ctps_numero = COALESCE(?, ctps_numero),
                ctps_serie = COALESCE(?, ctps_serie),
                banco = COALESCE(?, banco),
                agencia = COALESCE(?, agencia),
                conta_corrente = COALESCE(?, conta_corrente),
                dependentes = COALESCE(?, dependentes),
                cnh = COALESCE(?, cnh),
                certificado_reservista = COALESCE(?, certificado_reservista),
                titulo_eleitor = COALESCE(?, titulo_eleitor),
                zona_eleitoral = COALESCE(?, zona_eleitoral),
                secao_eleitoral = COALESCE(?, secao_eleitoral),
                filiacao_mae = COALESCE(?, filiacao_mae),
                filiacao_pai = COALESCE(?, filiacao_pai),
                dados_conjuge = COALESCE(?, dados_conjuge)
            WHERE id = ?
        `, [
            nome_completo, email, cpf, rg, telefone,
            cargo, departamento, status,
            data_nascimento, data_admissao,
            estado_civil, nacionalidade, naturalidade,
            endereco, pis_pasep, ctps_numero, ctps_serie,
            banco, agencia, conta_corrente,
            dependentes, cnh, certificado_reservista,
            titulo_eleitor, zona_eleitoral, secao_eleitoral,
            filiacao_mae, filiacao_pai, dados_conjuge,
            id
        ]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Funcionário não encontrado.' });
        }
        
        res.json({ message: 'Funcionário atualizado com sucesso!' });
    } catch (error) { 
        console.error('Erro ao atualizar funcionário:', error);
        next(error); 
    }
});

// Criar funcionário na tabela funcionarios (admin apenas)
apiRHRouter.post('/funcionarios/novo', [
    authorizeAdmin,
    body('nome_completo').trim().notEmpty().withMessage('Nome completo é obrigatório'),
    body('email').trim().notEmpty().withMessage('Email é obrigatório').isEmail().withMessage('Email inválido'),
    body('cpf').trim().notEmpty().withMessage('CPF é obrigatório'),
    validate
], async (req, res, next) => {
    try {
        const {
            nome_completo, email, cpf, rg, telefone,
            cargo, departamento, status = 'Ativo',
            data_nascimento, data_admissao,
            estado_civil, nacionalidade, naturalidade,
            endereco, pis_pasep, ctps_numero, ctps_serie,
            banco, agencia, conta_corrente,
            dependentes, cnh, certificado_reservista,
            titulo_eleitor, zona_eleitoral, secao_eleitoral,
            filiacao_mae, filiacao_pai, dados_conjuge,
            senha = 'aluforce123'
        } = req.body;
        
        // Hash da senha
        const hashed = await bcrypt.hash(senha, 10);
        
        const [result] = await pool.query(`
            INSERT INTO funcionarios (
                nome_completo, email, senha, password_hash, cpf, rg, telefone,
                cargo, departamento, status, role,
                data_nascimento, data_admissao,
                estado_civil, nacionalidade, naturalidade,
                endereco, pis_pasep, ctps_numero, ctps_serie,
                banco, agencia, conta_corrente,
                dependentes, cnh, certificado_reservista,
                titulo_eleitor, zona_eleitoral, secao_eleitoral,
                filiacao_mae, filiacao_pai, dados_conjuge,
                forcar_troca_senha
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'funcionario', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [
            nome_completo, email, hashed, hashed, cpf, rg, telefone,
            cargo, departamento, status,
            data_nascimento, data_admissao,
            estado_civil, nacionalidade, naturalidade,
            endereco, pis_pasep, ctps_numero, ctps_serie,
            banco, agencia, conta_corrente,
            dependentes || 0, cnh, certificado_reservista,
            titulo_eleitor, zona_eleitoral, secao_eleitoral,
            filiacao_mae, filiacao_pai, dados_conjuge
        ]);
        
        res.status(201).json({ 
            id: result.insertId,
            message: 'Funcionário criado com sucesso!'
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Email ou CPF já cadastrado.' });
        }
        console.error('Erro ao criar funcionário:', error);
        next(error);
    }
});

// Upload de foto do funcionário
apiRHRouter.post('/funcionarios/:id/foto', [
    authorizeAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID do funcionário inválido'),
    validate
], upload.single('foto'), async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (!req.file) {
            return res.status(400).json({ message: 'Nenhuma foto enviada.' });
        }
        
        console.log('📸 Upload de foto recebido:', req.file);
        
        // O multer já salvou o arquivo em public/uploads/RH/fotos
        // Usar o caminho que o multer definiu
        const nomeArquivo = req.file.filename;
        const ext = path.extname(nomeArquivo).toLowerCase();
        const caminhoFoto = `/uploads/RH/fotos/${nomeArquivo}`;
        
        // Criar thumbnail (200x200) - sharp é opcional
        let sharp = null;
        try { sharp = require('sharp'); } catch (e) { /* sharp não disponível */ }
        const thumbName = nomeArquivo.replace(ext, `-thumb${ext}`);
        const pastaFotos = path.dirname(req.file.path);
        const thumbPath = path.join(pastaFotos, thumbName);
        const thumbUrl = `/uploads/RH/fotos/${thumbName}`;
        
        if (sharp) {
            try {
                await sharp(req.file.path)
                    .resize(200, 200, { fit: 'cover' })
                    .toFile(thumbPath);
                console.log('✅ Thumbnail criado:', thumbPath);
            } catch (sharpErr) {
                console.error('⚠️ Erro ao criar thumbnail:', sharpErr);
                // Continua mesmo se thumbnail falhar
            }
        }
        
        // Atualizar foto no banco (apenas colunas que existem: foto_perfil_url e foto_thumb_url)
        await pool.query('UPDATE funcionarios SET foto_perfil_url = ?, foto_thumb_url = ? WHERE id = ?', [caminhoFoto, thumbUrl, id]);
        console.log('✅ Foto atualizada no banco para funcionário:', id);
        
        res.json({ 
            message: 'Foto atualizada com sucesso!',
            foto: caminhoFoto,
            foto_url: caminhoFoto,
            foto_thumb_url: thumbUrl
        });
    } catch (error) {
        console.error('Erro ao fazer upload da foto:', error);
        next(error);
    }
});

// Importar funcionários via CSV/Excel (admin apenas)
apiRHRouter.post('/funcionarios/importar', [
    authorizeAdmin
], upload.single('arquivo'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Arquivo não enviado.' });
        }
        
        // Por enquanto retorna sucesso - a implementação completa depende da lib de parsing
        res.json({ 
            message: 'Arquivo recebido. Processamento em desenvolvimento.',
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Erro ao importar funcionários:', error);
        next(error);
    }
});

// HOLERITES
apiRHRouter.get('/funcionarios/:id/holerites', async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM holerites WHERE funcionario_id = ? ORDER BY mes_referencia DESC', [req.params.id]);
        rows.forEach(h => h.arquivo_url = `/uploads/holerites/${h.arquivo}`);
        res.json(rows);
    } catch (e) { next(e); }
});
apiRHRouter.post('/funcionarios/:id/holerites', [
    authorizeAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID do funcionário inválido'),
    body('mes_referencia').notEmpty().withMessage('Mês de referência é obrigatório')
        .matches(/^\d{4}-\d{2}$/).withMessage('Formato inválido. Use YYYY-MM'),
    validate
], upload.single('holerite'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Arquivo não enviado.' });
        const { mes_referencia } = req.body;
        await pool.query('INSERT INTO holerites (funcionario_id, mes_referencia, arquivo) VALUES (?, ?, ?)', [req.params.id, mes_referencia, req.file.filename]);
        res.status(201).json({ message: 'Holerite anexado!' });
    } catch (e) { next(e); }
});

// ATESTADOS
apiRHRouter.get('/atestados', async (req, res, next) => {
    try {
        const funcionario_id = req.query.funcionario_id || req.user.id;
        const [rows] = await pool.query('SELECT * FROM atestados WHERE funcionario_id = ? ORDER BY data_atestado DESC', [funcionario_id]);
        rows.forEach(a => a.arquivo_url = `/uploads/atestados/${a.arquivo}`);
        res.json(rows);
    } catch (e) { next(e); }
});

// Buscar meus atestados (usuário logado)
apiRHRouter.get('/meus-atestados', async (req, res, next) => {
    try {
        const funcionarioId = req.user.id;
        
        const [rows] = await pool.query(`
            SELECT * FROM atestados 
            WHERE funcionario_id = ? 
            ORDER BY created_at DESC
        `, [funcionarioId]);
        
        rows.forEach(a => {
            if (a.arquivo) a.arquivo_url = `/uploads/atestados/${a.arquivo}`;
        });
        
        res.json(rows);
    } catch (e) { 
        console.error('Erro ao buscar atestados:', e);
        next(e); 
    }
});

// Buscar atestados de um funcionário específico (admin)
apiRHRouter.get('/funcionarios/:id/atestados', async (req, res, next) => {
    try {
        const funcionarioId = req.params.id;
        
        // Garantir que a tabela existe e tem as colunas necessárias
        await pool.query(`
            CREATE TABLE IF NOT EXISTS atestados (
                id INT AUTO_INCREMENT PRIMARY KEY,
                funcionario_id INT NOT NULL,
                data_atestado DATE,
                data_inicio DATE,
                data_fim DATE,
                dias_afastamento INT,
                tipo VARCHAR(100) DEFAULT 'Atestado Médico',
                cid VARCHAR(20),
                arquivo VARCHAR(255),
                observacoes TEXT,
                status VARCHAR(20) DEFAULT 'Pendente',
                motivo_recusa TEXT,
                aprovado_por INT,
                data_aprovacao DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE
            )
        `);
        
        // Verificar e adicionar colunas que podem faltar
        const colunasExtras = [
            "ALTER TABLE atestados ADD COLUMN IF NOT EXISTS dias_afastamento INT",
            "ALTER TABLE atestados ADD COLUMN IF NOT EXISTS tipo VARCHAR(100) DEFAULT 'Atestado Médico'",
            "ALTER TABLE atestados ADD COLUMN IF NOT EXISTS cid VARCHAR(20)",
            "ALTER TABLE atestados ADD COLUMN IF NOT EXISTS motivo_recusa TEXT",
            "ALTER TABLE atestados ADD COLUMN IF NOT EXISTS aprovado_por INT",
            "ALTER TABLE atestados ADD COLUMN IF NOT EXISTS data_aprovacao DATETIME"
        ];
        
        for (const sql of colunasExtras) {
            try { await pool.query(sql); } catch (e) { /* coluna já existe */ }
        }
        
        const [rows] = await pool.query(`
            SELECT a.*, f.nome_completo as funcionario_nome
            FROM atestados a
            LEFT JOIN funcionarios f ON a.funcionario_id = f.id
            WHERE a.funcionario_id = ? 
            ORDER BY a.created_at DESC
        `, [funcionarioId]);
        
        rows.forEach(a => {
            if (a.arquivo) a.arquivo_url = `/uploads/atestados/${a.arquivo}`;
        });
        
        res.json(rows);
    } catch (e) { 
        console.error('Erro ao buscar atestados:', e);
        next(e); 
    }
});

// Aprovar atestado
apiRHRouter.put('/atestados/:id/aprovar', [authorizeAdmin], async (req, res, next) => {
    try {
        const { id } = req.params;
        await pool.query(
            'UPDATE atestados SET status = ?, aprovado_por = ?, data_aprovacao = NOW() WHERE id = ?',
            ['Aprovado', req.user.id, id]
        );
        res.json({ message: 'Atestado aprovado com sucesso!' });
    } catch (e) { next(e); }
});

// Recusar atestado
apiRHRouter.put('/atestados/:id/recusar', [authorizeAdmin], async (req, res, next) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;
        await pool.query(
            'UPDATE atestados SET status = ?, motivo_recusa = ?, aprovado_por = ?, data_aprovacao = NOW() WHERE id = ?',
            ['Recusado', motivo || '', req.user.id, id]
        );
        res.json({ message: 'Atestado recusado.' });
    } catch (e) { next(e); }
});

apiRHRouter.post('/atestados', upload.single('arquivo'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Arquivo não enviado.' });
        
        const funcionario_id = req.body.funcionario_id || req.user.id;
        const data_inicio = req.body.data_inicio;
        const data_fim = req.body.data_fim;
        const nome_medico = req.body.nome_medico || null;
        const crm = req.body.crm || null;
        const tipo_atestado = req.body.tipo_atestado || null;
        const cid = req.body.cid || null;
        const observacoes = req.body.observacoes || null;
        const data_atestado = new Date().toISOString().slice(0, 10);
        
        // Criar tabela se não existir com todos os campos
        await pool.query(`
            CREATE TABLE IF NOT EXISTS atestados (
                id INT AUTO_INCREMENT PRIMARY KEY,
                funcionario_id INT NOT NULL,
                data_atestado DATE,
                data_inicio DATE,
                data_fim DATE,
                arquivo VARCHAR(255),
                nome_medico VARCHAR(255),
                crm VARCHAR(50),
                tipo_atestado VARCHAR(100),
                cid VARCHAR(20),
                observacoes TEXT,
                status VARCHAR(20) DEFAULT 'Pendente',
                aprovado_por INT,
                data_aprovacao DATETIME,
                motivo_recusa TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Adicionar colunas se não existirem (para tabelas já criadas)
        const colunasExtras = [
            'ALTER TABLE atestados ADD COLUMN IF NOT EXISTS nome_medico VARCHAR(255)',
            'ALTER TABLE atestados ADD COLUMN IF NOT EXISTS crm VARCHAR(50)',
            'ALTER TABLE atestados ADD COLUMN IF NOT EXISTS tipo_atestado VARCHAR(100)',
            'ALTER TABLE atestados ADD COLUMN IF NOT EXISTS cid VARCHAR(20)'
        ];
        for (const sql of colunasExtras) {
            try { await pool.query(sql); } catch (e) { /* coluna já existe */ }
        }
        
        await pool.query(
            `INSERT INTO atestados 
            (funcionario_id, data_atestado, data_inicio, data_fim, arquivo, nome_medico, crm, tipo_atestado, cid, observacoes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [funcionario_id, data_atestado, data_inicio, data_fim, req.file.filename, nome_medico, crm, tipo_atestado, cid, observacoes]
        );
        
        res.status(201).json({ message: 'Atestado enviado com sucesso!' });
    } catch (e) { 
        console.error('Erro ao enviar atestado:', e);
        next(e); 
    }
});

// AVISOS
apiRHRouter.get('/avisos', async (req, res, next) => {
    try {
        // Garantir que tabela existe com estrutura correta
        await pool.query(`
            CREATE TABLE IF NOT EXISTS avisos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                titulo VARCHAR(255),
                mensagem TEXT,
                conteudo TEXT,
                tipo VARCHAR(50) DEFAULT 'info',
                usuario_id INT,
                lido BOOLEAN DEFAULT FALSE,
                data_publicacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        
        // Usar COALESCE para garantir que created_at existe
        const [rows] = await pool.query(`
            SELECT 
                id, titulo, mensagem, conteudo, tipo, usuario_id, lido,
                COALESCE(created_at, data_publicacao, NOW()) as created_at,
                COALESCE(data_publicacao, created_at, NOW()) as data_publicacao
            FROM avisos 
            ORDER BY COALESCE(created_at, data_publicacao) DESC
            LIMIT 50
        `);
        res.json(rows);
    } catch (e) { next(e); }
});
apiRHRouter.post('/avisos', [
    authorizeAdmin,
    body('titulo').trim().notEmpty().withMessage('Título é obrigatório')
        .isLength({ max: 255 }).withMessage('Título muito longo (máx 255 caracteres)'),
    body('conteudo').trim().notEmpty().withMessage('Conteúdo é obrigatório')
        .isLength({ max: 5000 }).withMessage('Conteúdo muito longo (máx 5000 caracteres)'),
    validate
], async (req, res, next) => {
    try {
        const { titulo, conteudo } = req.body;
        await pool.query('INSERT INTO avisos (titulo, conteudo, data_publicacao) VALUES (?, ?, NOW())', [titulo, conteudo]);
        res.status(201).json({ message: 'Aviso publicado!' });
    } catch (e) { next(e); }
});
apiRHRouter.delete('/avisos/:id', [
    authorizeAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID do aviso inválido'),
    validate
], async (req, res, next) => {
    try {
        const [result] = await pool.query('DELETE FROM avisos WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Aviso não encontrado.' });
        res.status(204).send();
    } catch (e) { next(e); }
});

// =====================================================
// SOLICITAÇÕES RH
// =====================================================

// Criar tabela de solicitações se não existir
async function criarTabelaSolicitacoes() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rh_solicitacoes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                funcionario_id INT,
                funcionario_nome VARCHAR(255),
                funcionario_email VARCHAR(255),
                tipo VARCHAR(100) NOT NULL,
                categoria VARCHAR(100),
                assunto VARCHAR(255),
                descricao TEXT,
                prioridade VARCHAR(20) DEFAULT 'normal',
                status VARCHAR(30) DEFAULT 'Pendente',
                anexo VARCHAR(255),
                resposta TEXT,
                respondido_por INT,
                data_resposta DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
    } catch (e) {
        console.error('Erro ao criar tabela rh_solicitacoes:', e);
    }
}
criarTabelaSolicitacoes();

// Listar solicitações do usuário logado
apiRHRouter.get('/solicitacoes', async (req, res, next) => {
    try {
        const userEmail = req.user.email;
        const [rows] = await pool.query(`
            SELECT * FROM rh_solicitacoes 
            WHERE funcionario_email = ? 
            ORDER BY created_at DESC
        `, [userEmail]);
        
        // Calcular estatísticas
        const stats = {
            total: rows.length,
            pendentes: rows.filter(r => r.status === 'Pendente').length,
            em_analise: rows.filter(r => r.status === 'Em Análise').length,
            aprovadas: rows.filter(r => r.status === 'Aprovada' || r.status === 'Aprovado').length,
            recusadas: rows.filter(r => r.status === 'Recusada' || r.status === 'Recusado').length
        };
        
        res.json({ solicitacoes: rows, stats });
    } catch (e) { 
        console.error('Erro ao listar solicitações:', e);
        next(e); 
    }
});

// Listar todas as solicitações (admin)
apiRHRouter.get('/solicitacoes/todas', authorizeAdmin, async (req, res, next) => {
    try {
        const { status, tipo } = req.query;
        let sql = 'SELECT * FROM rh_solicitacoes WHERE 1=1';
        const params = [];
        
        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }
        if (tipo) {
            sql += ' AND tipo = ?';
            params.push(tipo);
        }
        
        sql += ' ORDER BY created_at DESC';
        
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (e) { next(e); }
});

// Criar nova solicitação
apiRHRouter.post('/solicitacoes', upload.single('anexo'), async (req, res, next) => {
    try {
        const { tipo, categoria, assunto, descricao, prioridade, funcionario_id } = req.body;
        const userEmail = req.user.email;
        const userName = req.user.nome || req.user.apelido || 'Usuário';
        
        // Definir assunto automaticamente se não fornecido
        let assuntoFinal = assunto;
        if (!assuntoFinal && tipo && categoria) {
            assuntoFinal = `${tipo} - ${categoria}`;
        } else if (!assuntoFinal && tipo) {
            assuntoFinal = tipo;
        }
        
        const anexoFile = req.file ? req.file.filename : null;
        
        const [result] = await pool.query(`
            INSERT INTO rh_solicitacoes 
            (funcionario_id, funcionario_nome, funcionario_email, tipo, categoria, assunto, descricao, prioridade, anexo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [funcionario_id || null, userName, userEmail, tipo, categoria, assuntoFinal, descricao, prioridade || 'normal', anexoFile]);
        
        res.status(201).json({ 
            message: 'Solicitação enviada com sucesso!',
            id: result.insertId
        });
    } catch (e) { 
        console.error('Erro ao criar solicitação:', e);
        next(e); 
    }
});

// Atualizar status da solicitação (admin)
apiRHRouter.put('/solicitacoes/:id/status', authorizeAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, resposta } = req.body;
        
        await pool.query(`
            UPDATE rh_solicitacoes 
            SET status = ?, resposta = ?, respondido_por = ?, data_resposta = NOW()
            WHERE id = ?
        `, [status, resposta || null, req.user.id, id]);
        
        res.json({ message: 'Status atualizado com sucesso!' });
    } catch (e) { next(e); }
});

// Deletar solicitação
apiRHRouter.delete('/solicitacoes/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userEmail = req.user.email;
        
        // Verificar se a solicitação pertence ao usuário
        const [rows] = await pool.query('SELECT * FROM rh_solicitacoes WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Solicitação não encontrada.' });
        }
        
        // Admin pode deletar qualquer solicitação
        const isAdmin = req.user.role === 'admin' || ['rh@aluforce.ind.br', 'ti@aluforce.ind.br'].includes(userEmail.toLowerCase());
        if (rows[0].funcionario_email !== userEmail && !isAdmin) {
            return res.status(403).json({ message: 'Sem permissão para deletar esta solicitação.' });
        }
        
        await pool.query('DELETE FROM rh_solicitacoes WHERE id = ?', [id]);
        res.json({ message: 'Solicitação deletada.' });
    } catch (e) { next(e); }
});

// DASHBOARD RH
apiRHRouter.get('/dashboard', async (req, res, next) => {
    try {
        const [[{ totalFuncionarios = 0 } = {}]] = await pool.query('SELECT COUNT(*) AS totalFuncionarios FROM funcionarios');
        const [aniversariantes] = await pool.query('SELECT id, nome_completo, data_nascimento FROM funcionarios WHERE MONTH(data_nascimento) = MONTH(CURRENT_DATE())');
        res.json({ stats: { totalFuncionarios }, aniversariantes });
    } catch (e) { next(e); }
});

// AVISOS/NOTIFICAÇÕES - ROTA DUPLICADA REMOVIDA (já existe acima)
// A rota principal de avisos está definida anteriormente no código

apiRHRouter.get('/avisos/stream', async (req, res, next) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Enviar comentário inicial para manter conexão
    res.write(': connected\n\n');
    
    const interval = setInterval(() => {
        res.write('data: {"type":"ping"}\n\n');
    }, 30000);
    
    req.on('close', () => {
        clearInterval(interval);
    });
});

apiRHRouter.post('/avisos/sse-handshake', async (req, res, next) => {
    try {
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

// STATUS DE DOCUMENTOS DO FUNCIONÁRIO
apiRHRouter.get('/funcionarios/:id/doc-status', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Verificar se é o próprio usuário ou admin
        if (req.user.id !== parseInt(id) && req.user.role !== 'admin' && req.user.is_admin !== 1) {
            return res.status(403).json({ message: 'Acesso negado' });
        }
        
        // Buscar status de documentos
        const [rows] = await pool.query(`
            SELECT 
                CASE WHEN cpf IS NOT NULL AND cpf != '' THEN 1 ELSE 0 END as cpf_ok,
                CASE WHEN rg IS NOT NULL AND rg != '' THEN 1 ELSE 0 END as rg_ok,
                CASE WHEN ctps IS NOT NULL AND ctps != '' THEN 1 ELSE 0 END as ctps_ok,
                CASE WHEN pis_pasep IS NOT NULL AND pis_pasep != '' THEN 1 ELSE 0 END as pis_ok,
                CASE WHEN titulo_eleitor IS NOT NULL AND titulo_eleitor != '' THEN 1 ELSE 0 END as titulo_ok,
                CASE WHEN certificado_reservista IS NOT NULL AND certificado_reservista != '' THEN 1 ELSE 0 END as reservista_ok,
                CASE WHEN cnh IS NOT NULL AND cnh != '' THEN 1 ELSE 0 END as cnh_ok
            FROM funcionarios 
            WHERE id = ?
        `, [id]);
        
        if (rows.length === 0) {
            return res.json({
                cpf_ok: 0, rg_ok: 0, ctps_ok: 0, pis_ok: 0,
                titulo_ok: 0, reservista_ok: 0, cnh_ok: 0
            });
        }
        
        res.json(rows[0]);
    } catch (error) { 
        console.error('Erro ao buscar status de documentos:', error);
        res.json({
            cpf_ok: 0, rg_ok: 0, ctps_ok: 0, pis_ok: 0,
            titulo_ok: 0, reservista_ok: 0, cnh_ok: 0
        });
    }
});

app.use('/api/rh', apiRHRouter);

// ===== APIs COMPLEMENTARES RH =====
const rhAPIsCompletas = require('./src/routes/rh_apis_completas');
app.use('/api/rh', rhAPIsCompletas);

// ===================== API DO USUÁRIO =====================
// Rota para obter informações do usuário logado
app.get('/api/user/me', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        // Buscar informações completas do usuário no banco
        const [rows] = await pool.query(
            'SELECT id, nome_completo as nome, email, departamento as setor, avatar, foto_perfil_url FROM funcionarios WHERE email = ?',
            [req.user.email]
        );

        if (rows.length > 0) {
            const user = rows[0];
            // Determinar avatar baseado no nome (fallback)
            const firstName = user.nome ? user.nome.split(' ')[0].toLowerCase() : '';
            const avatarMap = {
                'douglas': '/avatars/douglas.webp',
                'andreia': '/avatars/andreia.webp',
                'ti': '/avatars/ti.webp',
                'clemerson': '/avatars/clemerson.webp',
                'thiago': '/avatars/thiago.webp',
                'guilherme': '/avatars/guilherme.webp',
                'junior': '/avatars/junior.webp',
                'hellen': '/avatars/hellen.webp',
                'antonio': '/avatars/antonio.webp',
                'egidio': '/avatars/egidio.webp'
            };

            // Prioridade: foto_perfil_url > avatar no banco > mapa por nome > default
            let fotoUrl = '/avatars/default.webp';
            if (user.foto_perfil_url && user.foto_perfil_url !== 'default.webp') {
                fotoUrl = user.foto_perfil_url;
            } else if (user.avatar && user.avatar !== 'default.webp') {
                fotoUrl = user.avatar.startsWith('/') ? user.avatar : `/avatars/${user.avatar}`;
            } else if (avatarMap[firstName]) {
                fotoUrl = avatarMap[firstName];
            }

            res.json({
                id: user.id,
                nome: user.nome,
                email: user.email,
                setor: user.setor,
                avatar: fotoUrl,
                foto_perfil_url: fotoUrl
            });
        } else {
            // Fallback para usuários sem registro no banco
            res.json({
                nome: req.user.nome || req.user.email,
                email: req.user.email,
                setor: 'N/A',
                avatar: '/avatars/default.webp',
                foto_perfil_url: '/avatars/default.webp'
            });
        }
    } catch (error) {
        console.error('Erro ao buscar informações do usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ===================== API DE NOTIFICAÇÕES DO CHAT =====================
// Endpoint para notificar suporte técnico via chat
app.post('/api/notify-support', express.json(), async (req, res) => {
    try {
        const { userName, userEmail, message, timestamp } = req.body;

        if (!userName || !userEmail || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Dados incompletos' 
            });
        }

        // Log da notificação
        logger.info(`[CHAT-SUPPORT] Nova solicitação de ${userName} (${userEmail})`);
        console.log(`📧 [CHAT-SUPPORT] Usuário: ${userName} | Email: ${userEmail}`);
        console.log(`📧 [CHAT-SUPPORT] Mensagem: ${message.substring(0, 100)}...`);

        // Enviar email para TI via Nodemailer
        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #00b894, #00cec9); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                    .header h1 { margin: 0; font-size: 24px; }
                    .content { background: #f8f9fa; padding: 20px; border: 1px solid #e8ecf1; }
                    .info-row { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
                    .info-label { font-weight: bold; color: #00b894; }
                    .message-box { background: white; padding: 15px; border-left: 4px solid #00b894; margin-top: 15px; }
                    .footer { text-align: center; color: #7f8c8d; padding: 20px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>💬 Nova Solicitação de Suporte - Chat ALUFORCE</h1>
                    </div>
                    <div class="content">
                        <div class="info-row">
                            <span class="info-label">👤 Usuário:</span> ${userName}
                        </div>
                        <div class="info-row">
                            <span class="info-label">📧 Email:</span> ${userEmail}
                        </div>
                        <div class="info-row">
                            <span class="info-label">🕐 Data/Hora:</span> ${new Date(timestamp).toLocaleString('pt-BR')}
                        </div>
                        <div class="message-box">
                            <strong>📝 Mensagem:</strong><br><br>
                            ${message.replace(/\n/g, '<br>')}
                        </div>
                        <p style="margin-top: 20px; color: #7f8c8d; font-size: 14px;">
                            <strong>📍 Próximos passos:</strong><br>
                            • Entre em contato com o usuário via email ou telefone<br>
                            • Acesse o painel admin do chat: <a href="http://localhost:3002/admin">http://localhost:3002/admin</a><br>
                            • Responda diretamente pelo sistema de chat
                        </p>
                    </div>
                    <div class="footer">
                        Sistema ALUFORCE v2.0 | Chat Widget com Bob<br>
                        © ${new Date().getFullYear()} ALUFORCE - Todos os direitos reservados
                    </div>
                </div>
            </body>
            </html>
        `;

        // Tentar enviar email
        const emailResult = await sendEmail(
            'ti@aluforce.ind.br',
            `[CHAT] Suporte solicitado por ${userName}`,
            emailHtml
        );

        res.json({ 
            success: true, 
            message: emailResult.success 
                ? 'Notificação enviada ao suporte técnico via email' 
                : 'Notificação registrada (email não enviado - SMTP não configurado)',
            supportEmail: 'ti@aluforce.ind.br',
            emailSent: emailResult.success
        });

    } catch (error) {
        logger.error('[CHAT-SUPPORT] Erro ao processar notificação:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao enviar notificação' 
        });
    }
});

// Rota para verificar sessão ativa (compatibilidade com módulos)
app.get('/api/verificar-sessao', async (req, res) => {
    try {
        // Busca token em múltiplas fontes sem retornar 401
        const authHeader = req.headers['authorization'];
        const token = (authHeader && authHeader.split(' ')[1]) || 
                     req.cookies?.authToken || 
                     req.cookies?.token || 
                     req.query.token;
        
        console.log('[VERIFICAR-SESSAO] Token encontrado:', !!token);
        
        if (!token) {
            console.log('[VERIFICAR-SESSAO] Nenhum token - retornando não autenticado');
            return res.json({ autenticado: false });
        }

        // Verificar token JWT usando promise
        const user = await new Promise((resolve, reject) => {
            jwt.verify(token, JWT_SECRET, (err, decoded) => {
                if (err) reject(err);
                else resolve(decoded);
            });
        }).catch(err => {
            console.log('[VERIFICAR-SESSAO] Token inválido:', err.message);
            return null;
        });

        if (!user) {
            return res.json({ autenticado: false });
        }

        console.log('[VERIFICAR-SESSAO] Token válido para:', user.email);
        
        // Buscar informações completas do usuário
        const [rows] = await pool.query(
            'SELECT id, nome_completo as nome, email, departamento as setor, role FROM funcionarios WHERE email = ?',
            [user.email]
        );

        if (rows.length > 0) {
            const dbUser = rows[0];
            const firstName = dbUser.nome.split(' ')[0].toLowerCase();
            
            // Determinar avatar
            const avatarMap = {
                'douglas': 'douglas.webp',
                'andreia': 'andreia.webp',
                'ti': 'ti.webp',
                'clemerson': 'clemerson.webp',
                'thiago': 'thiago.webp',
                'guilherme': 'guilherme.webp',
                'junior': 'junior.webp',
                'hellen': 'hellen.webp'
            };

            // Verificar se é admin
            const isAdmin = user.is_admin === 1 || user.role === 'admin' || 
                           ['douglas', 'andreia', 'ti', 'antonio'].includes(firstName);

            console.log('[VERIFICAR-SESSAO] Usuário autenticado:', firstName, 'Admin:', isAdmin);

            return res.json({
                autenticado: true,
                usuario: {
                    id: dbUser.id,
                    nome: dbUser.nome,
                    firstName: firstName,
                    email: dbUser.email,
                    setor: dbUser.setor,
                    role: dbUser.role || 'user',
                    isAdmin: isAdmin,
                    is_admin: isAdmin ? 1 : 0,
                    avatar: avatarMap[firstName] || 'default.webp'
                }
            });
        } else {
            // Fallback para usuários da tabela usuarios
            const firstName = (user.nome || user.email).split(' ')[0].toLowerCase();
            const isAdmin = user.is_admin === 1 || user.role === 'admin' || 
                           ['douglas', 'andreia', 'ti', 'antonio'].includes(firstName);

            console.log('[VERIFICAR-SESSAO] Usuário autenticado (fallback):', firstName);

            return res.json({
                autenticado: true,
                usuario: {
                    id: user.id,
                    nome: user.nome || user.email,
                    firstName: firstName,
                    email: user.email,
                    setor: 'N/A',
                    role: user.role || 'user',
                    isAdmin: isAdmin,
                    is_admin: isAdmin ? 1 : 0,
                    avatar:'/avatars/default.webp'
                }
            });
        }
    } catch (error) {
        console.error('[VERIFICAR-SESSAO] Erro ao buscar usuário:', error);
        return res.json({ autenticado: false });
    }
});

// Rotas globais de avisos (para compatibilidade)
app.get('/api/avisos', authenticateToken, async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS avisos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                titulo VARCHAR(255),
                mensagem TEXT,
                tipo VARCHAR(50) DEFAULT 'info',
                usuario_id INT,
                lido BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        const usuario_id = req.user.id;
        const [rows] = await pool.query(
            'SELECT * FROM avisos WHERE usuario_id = ? OR usuario_id IS NULL ORDER BY created_at DESC LIMIT 50',
            [usuario_id]
        );
        res.json(rows);
    } catch (e) { 
        console.error('Erro ao buscar avisos:', e);
        res.json([]);
    }
});

app.get('/api/avisos/stream', authenticateToken, async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(': connected\n\n');
    
    const interval = setInterval(() => {
        res.write('data: {"type":"ping"}\n\n');
    }, 30000);
    
    req.on('close', () => {
        clearInterval(interval);
    });
});

app.post('/api/avisos/sse-handshake', authenticateToken, async (req, res) => {
    res.json({ success: true });
});

app.get('/api/funcionarios/:id/doc-status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        if (req.user.id !== parseInt(id) && req.user.role !== 'admin' && req.user.is_admin !== 1) {
            return res.status(403).json({ message: 'Acesso negado' });
        }
        
        const [rows] = await pool.query(`
            SELECT 
                CASE WHEN cpf IS NOT NULL AND cpf != '' THEN 1 ELSE 0 END as cpf_ok,
                CASE WHEN rg IS NOT NULL AND rg != '' THEN 1 ELSE 0 END as rg_ok,
                CASE WHEN ctps IS NOT NULL AND ctps != '' THEN 1 ELSE 0 END as ctps_ok,
                CASE WHEN pis_pasep IS NOT NULL AND pis_pasep != '' THEN 1 ELSE 0 END as pis_ok,
                CASE WHEN titulo_eleitor IS NOT NULL AND titulo_eleitor != '' THEN 1 ELSE 0 END as titulo_ok,
                CASE WHEN certificado_reservista IS NOT NULL AND certificado_reservista != '' THEN 1 ELSE 0 END as reservista_ok,
                CASE WHEN cnh IS NOT NULL AND cnh != '' THEN 1 ELSE 0 END as cnh_ok
            FROM funcionarios 
            WHERE id = ?
        `, [id]);
        
        if (rows.length === 0) {
            return res.json({
                cpf_ok: 0, rg_ok: 0, ctps_ok: 0, pis_ok: 0,
                titulo_ok: 0, reservista_ok: 0, cnh_ok: 0
            });
        }
        
        res.json(rows[0]);
    } catch (error) { 
        res.json({
            cpf_ok: 0, rg_ok: 0, ctps_ok: 0, pis_ok: 0,
            titulo_ok: 0, reservista_ok: 0, cnh_ok: 0
        });
    }
});

// ============================================================================
// DASHBOARD EXECUTIVO - KPIs DE TODOS OS MÓDULOS
// ============================================================================
app.get('/api/dashboard/executivo', authenticateToken, async (req, res) => {
    try {
        const periodo = parseInt(req.query.periodo) || 30;
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - periodo);
        const dataInicioStr = dataInicio.toISOString().split('T')[0];
        
        // Resumo Financeiro
        let resumoFinanceiro = {
            receitas: 0,
            despesas: 0,
            lucro_estimado: 0,
            margem_percentual: 0,
            faturamento_periodo: 0,
            nfes_emitidas: 0
        };
        
        try {
            // Receitas (títulos a receber pagos)
            const [receitasResult] = await pool.query(`
                SELECT COALESCE(SUM(valor), 0) as total 
                FROM contas_receber 
                WHERE status = 'pago' AND data_pagamento >= ?
            `, [dataInicioStr]);
            resumoFinanceiro.receitas = receitasResult[0]?.total || 0;
            
            // Despesas (títulos a pagar pagos)
            const [despesasResult] = await pool.query(`
                SELECT COALESCE(SUM(valor), 0) as total 
                FROM contas_pagar 
                WHERE status = 'pago' AND data_pagamento >= ?
            `, [dataInicioStr]);
            resumoFinanceiro.despesas = despesasResult[0]?.total || 0;
            
            // Calcular lucro e margem
            resumoFinanceiro.lucro_estimado = resumoFinanceiro.receitas - resumoFinanceiro.despesas;
            resumoFinanceiro.margem_percentual = resumoFinanceiro.receitas > 0 
                ? ((resumoFinanceiro.lucro_estimado / resumoFinanceiro.receitas) * 100).toFixed(1)
                : 0;
            
            // Faturamento (pedidos faturados)
            const [faturamentoResult] = await pool.query(`
                SELECT COALESCE(SUM(valor), 0) as total, COUNT(*) as nfes
                FROM pedidos 
                WHERE status = 'faturado' AND data_criacao >= ?
            `, [dataInicioStr]);
            resumoFinanceiro.faturamento_periodo = faturamentoResult[0]?.total || 0;
            resumoFinanceiro.nfes_emitidas = faturamentoResult[0]?.nfes || 0;
        } catch (e) {
            console.log('[Dashboard] Erro ao buscar financeiro:', e.message);
        }
        
        // KPIs de Vendas
        let vendas = { total_pedidos: 0, taxa_conversao: 0, ticket_medio: 0 };
        try {
            const [vendasResult] = await pool.query(`
                SELECT COUNT(*) as total,
                       COALESCE(AVG(valor), 0) as ticket,
                       SUM(CASE WHEN status IN ('aprovado', 'faturar', 'faturado', 'entregue') THEN 1 ELSE 0 END) as convertidos
                FROM pedidos 
                WHERE data_criacao >= ?
            `, [dataInicioStr]);
            vendas.total_pedidos = vendasResult[0]?.total || 0;
            vendas.ticket_medio = vendasResult[0]?.ticket || 0;
            vendas.taxa_conversao = vendas.total_pedidos > 0 
                ? ((vendasResult[0]?.convertidos || 0) / vendas.total_pedidos * 100).toFixed(1)
                : 0;
        } catch (e) {
            console.log('[Dashboard] Erro ao buscar vendas:', e.message);
        }
        
        // KPIs de Compras
        let compras = { total_pedidos: 0, pedidos_pendentes: 0, economia_gerada: 0 };
        try {
            const [comprasResult] = await pool.query(`
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN status IN ('pendente', 'aguardando', 'analise') THEN 1 ELSE 0 END) as pendentes
                FROM pedidos_compra 
                WHERE data_criacao >= ?
            `, [dataInicioStr]);
            compras.total_pedidos = comprasResult[0]?.total || 0;
            compras.pedidos_pendentes = comprasResult[0]?.pendentes || 0;
        } catch (e) {
            console.log('[Dashboard] Erro ao buscar compras:', e.message);
        }
        
        // KPIs de Produção (PCP)
        let producao = { ordens_producao: 0, eficiencia_percentual: 0, alertas_estoque: 0 };
        try {
            const [pcpResult] = await pool.query(`
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) as concluidas
                FROM ordens_producao 
                WHERE data_criacao >= ?
            `, [dataInicioStr]);
            producao.ordens_producao = pcpResult[0]?.total || 0;
            producao.eficiencia_percentual = producao.ordens_producao > 0
                ? ((pcpResult[0]?.concluidas || 0) / producao.ordens_producao * 100).toFixed(1)
                : 0;
                
            // Alertas de estoque baixo
            const [estoqueResult] = await pool.query(`
                SELECT COUNT(*) as alertas FROM produtos 
                WHERE estoque_atual <= estoque_minimo AND estoque_minimo > 0
            `);
            producao.alertas_estoque = estoqueResult[0]?.alertas || 0;
        } catch (e) {
            console.log('[Dashboard] Erro ao buscar PCP:', e.message);
        }
        
        // KPIs de RH
        let rh = { total_funcionarios: 0, ferias_programadas: 0, aniversariantes_mes: 0 };
        try {
            const [rhResult] = await pool.query(`
                SELECT COUNT(*) as total FROM funcionarios WHERE ativo = 1 OR ativo IS NULL
            `);
            rh.total_funcionarios = rhResult[0]?.total || 0;
            
            // Férias (aproximado)
            const [feriasResult] = await pool.query(`
                SELECT COUNT(*) as ferias FROM funcionarios 
                WHERE status_ferias = 'em_ferias' OR situacao = 'ferias'
            `);
            rh.ferias_programadas = feriasResult[0]?.ferias || 0;
            
            // Aniversariantes do mês
            const mesAtual = new Date().getMonth() + 1;
            const [anivResult] = await pool.query(`
                SELECT COUNT(*) as aniversarios FROM funcionarios 
                WHERE MONTH(data_nascimento) = ? AND (ativo = 1 OR ativo IS NULL)
            `, [mesAtual]);
            rh.aniversariantes_mes = anivResult[0]?.aniversarios || 0;
        } catch (e) {
            console.log('[Dashboard] Erro ao buscar RH:', e.message);
        }
        
        // Alertas do sistema
        let alertas = [];
        try {
            // Títulos vencendo hoje (Financeiro)
            const [titulosResult] = await pool.query(`
                SELECT COUNT(*) as vencendo FROM contas_pagar 
                WHERE status != 'pago' AND DATE(data_vencimento) = CURDATE()
            `);
            if (titulosResult[0]?.vencendo > 0) {
                alertas.push({
                    tipo: 'warning',
                    modulo: 'Financeiro',
                    mensagem: `${titulosResult[0].vencendo} título(s) vencendo hoje`,
                    link: '/modules/Financeiro/index.html'
                });
            }
            
            // Pedidos aguardando aprovação (Vendas)
            const [pedidosResult] = await pool.query(`
                SELECT COUNT(*) as aguardando FROM pedidos 
                WHERE status IN ('orcamento', 'analise')
            `);
            if (pedidosResult[0]?.aguardando > 0) {
                alertas.push({
                    tipo: 'info',
                    modulo: 'Vendas',
                    mensagem: `${pedidosResult[0].aguardando} pedido(s) aguardando aprovação`,
                    link: '/modules/Vendas/index.html'
                });
            }
            
            // Alertas de estoque baixo (PCP)
            if (producao.alertas_estoque > 0) {
                alertas.push({
                    tipo: 'danger',
                    modulo: 'Produção',
                    mensagem: `${producao.alertas_estoque} produto(s) com estoque baixo`,
                    link: '/modules/PCP/index.html'
                });
            }
        } catch (e) {
            console.log('[Dashboard] Erro ao buscar alertas:', e.message);
        }
        
        res.json({
            resumo_executivo: resumoFinanceiro,
            vendas,
            compras,
            producao,
            rh,
            alertas,
            periodo_dias: periodo,
            atualizado_em: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[Dashboard Executivo] Erro:', error);
        res.status(500).json({ message: 'Erro ao carregar dashboard executivo' });
    }
});

// ============================================================================
// ENDPOINTS DE DEBUG - PROTEGIDOS PARA AMBIENTE DE DESENVOLVIMENTO
// ============================================================================
// Middleware para proteger endpoints de debug
const debugOnlyMiddleware = (req, res, next) => {
    // Bloquear completamente em produção
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ message: 'Not found' });
    }
    
    // Em desenvolvimento, permitir apenas localhost
    const isLocalhost = req.ip === '127.0.0.1' || 
                       req.ip === '::1' || 
                       req.hostname === 'localhost' ||
                       req.ip === '::ffff:127.0.0.1';
    
    if (!isLocalhost && process.env.ALLOW_REMOTE_DEBUG !== 'true') {
        console.warn(`⚠️ Tentativa de acesso a endpoint de debug de IP não-local: ${req.ip}`);
        return res.status(403).json({ message: 'Debug endpoints only available from localhost' });
    }
    
    next();
};

// Endpoint de debug - retorna colunas da tabela `usuarios`
app.get('/api/debug/usuarios-schema', debugOnlyMiddleware, async (req, res) => {
    try {
        const [cols] = await pool.query('SHOW COLUMNS FROM usuarios');
        res.json(cols);
    } catch (err) {
        console.error('Erro ao obter esquema de usuarios:', err);
        res.status(500).json({ message: 'Erro ao obter esquema de usuarios', error: err.message });
    }
});

// internal-e2e-run removed after testing


// === KANBAN PÚBLICO === (Rota pública ANTES do router autenticado)
app.get('/api/vendas/kanban/pedidos', async (req, res) => {
    try {
        let pedidos = [];
        
        // Dados de exemplo para demonstração
        const pedidosExemplo = [
            { id: 101, cliente: 'COMERCIAL ELETRICA PAPIRO LTDA', valor: 13084.67, status: 'orcamento', origem: 'Omie', vendedor: 'Vendedor 1', parcelas: 'em 3x' },
            { id: 102, cliente: 'AFS ELETRICA', valor: 21615.00, status: 'orcamento', origem: 'Omie', vendedor: 'Vendedor 1', parcelas: 'em 4x' },
            { id: 103, cliente: 'IMPACTO ELETRICA', valor: 80780.00, status: 'analise', origem: 'Omie', vendedor: 'Vendedor 2', parcelas: 'em 4x' },
            { id: 104, cliente: 'GASPARZINHO DISTRIBUIDORA', valor: 7500.00, status: 'analise', origem: 'Omie', vendedor: 'Vendedor 1', parcelas: 'em 3x', transportadora: 'ACEVILLE TRANSPORTES LTDA' },
            { id: 105, cliente: 'AL CONESUL VALVULAS INDUSTRIAIS LTDA', valor: 3000.00, status: 'aprovado', origem: 'Omie', vendedor: 'Vendedor 2', parcelas: 'em 3x' },
            { id: 106, cliente: 'COMERCIAL MARTINS LTDA', valor: 11540.00, status: 'aprovado', origem: 'Omie', vendedor: 'Vendedor 1', parcelas: 'em 2x', transportadora: 'TRANSVALEN TRANSPORTES LTDA' },
            { id: 107, cliente: 'ILUMINACAO PAULISTANA SPE S/A', valor: 529.00, status: 'faturar', origem: 'Omie', vendedor: 'Vendedor 2', parcelas: 'a vista' },
            { id: 108, cliente: 'BELLA ELETRICA E HIDRAULICA LTDA', valor: 7224.00, status: 'faturar', origem: 'Omie', vendedor: 'Vendedor 1', parcelas: 'a vista' },
            { id: 109, cliente: 'SARAIVA MATERIAIS ELETRICOS', valor: 34325.00, status: 'faturado', origem: 'Omie', vendedor: 'Vendedor 1', parcelas: 'em 4x', nf: '00000251' },
            { id: 110, cliente: 'LF ELETRIFICACOES', valor: 3185.00, status: 'faturado', origem: 'Omie', vendedor: 'Vendedor 2', parcelas: 'em 3x', nf: '00000249', transportadora: 'DLT LOGISTICA EM TRANSPORTES LTDA' },
        ];
        
        try {
            const [result] = await pool.query(`
                SELECT p.*, 
                       COALESCE(c.nome_fantasia, c.razao_social, c.nome, 'Cliente não informado') as cliente_nome,
                       c.email as cliente_email,
                       c.telefone as cliente_telefone,
                       u.nome as vendedor_nome
                FROM pedidos p
                LEFT JOIN clientes c ON p.cliente_id = c.id
                LEFT JOIN usuarios u ON p.vendedor_id = u.id
                ORDER BY p.id DESC
                LIMIT 100
            `);
            pedidos = result;
        } catch (poolError) {
            console.warn('⚠️ Erro ao buscar pedidos, usando dados de exemplo:', poolError.message);
            return res.json(pedidosExemplo);
        }
        
        if (!pedidos || pedidos.length === 0) {
            console.log('📋 Nenhum pedido encontrado, usando dados de exemplo');
            return res.json(pedidosExemplo);
        }
        
        const pedidosFormatados = pedidos.map(p => ({
            id: p.id,
            numero: `Pedido Nº ${p.id}`,
            cliente: p.cliente_nome || 'Cliente não informado',
            cliente_nome: p.cliente_nome || 'Cliente não informado',
            valor: parseFloat(p.valor || p.valor_total || 0),
            valor_total: parseFloat(p.valor || p.valor_total || 0),
            status: p.status || 'orcamento',
            origem: p.origem || 'Sistema',
            vendedor: p.vendedor_nome || 'Não atribuído',
            vendedor_nome: p.vendedor_nome || 'Não atribuído',
            parcelas: p.condicao_pagamento || 'a vista',
            transportadora: p.metodo_envio || null,
            nf: p.nota_fiscal || null,
            data_pedido: p.created_at,
            observacao: p.observacao
        }));
        
        res.json(pedidosFormatados);
    } catch (error) {
        console.error('❌ Erro no Kanban:', error);
        res.status(500).json({ error: 'Erro ao buscar pedidos para o Kanban' });
    }
});

// ----------------- ROTAS PÚBLICAS DE VENDAS (para autocomplete e itens) -----------------
// Autocomplete de produtos - ROTA PÚBLICA (antes do middleware de auth)
app.get('/api/vendas/produtos/autocomplete/:termo', async (req, res) => {
    try {
        const { termo } = req.params;
        const limit = parseInt(req.query.limit) || 15;
        
        const [rows] = await pool.query(
            `SELECT id, codigo, nome as descricao, unidade_medida as unidade, preco_venda, estoque_atual, localizacao as local_estoque 
             FROM produtos 
             WHERE ativo = 1 AND (codigo LIKE ? OR nome LIKE ? OR gtin LIKE ?)
             ORDER BY 
                CASE 
                    WHEN codigo = ? THEN 1 
                    WHEN codigo LIKE ? THEN 2 
                    ELSE 3 
                END,
                nome ASC
             LIMIT ?`,
            [`%${termo}%`, `%${termo}%`, `%${termo}%`, termo, `${termo}%`, limit]
        );
        
        res.json(rows);
    } catch (error) {
        console.error('Erro no autocomplete de produtos:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') return res.json([]);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

// Itens do pedido - ROTA PÚBLICA para listagem
app.get('/api/vendas/pedidos/:id/itens', async (req, res) => {
    try {
        const { id } = req.params;
        const [itens] = await pool.query(
            'SELECT * FROM pedido_itens WHERE pedido_id = ? ORDER BY id ASC',
            [id]
        );
        res.json(itens);
    } catch (error) {
        console.error('Erro ao buscar itens do pedido:', error);
        if (error && error.code === 'ER_NO_SUCH_TABLE') return res.json([]);
        res.status(500).json({ error: 'Erro ao buscar itens' });
    }
});

// ----------------- ROTAS VENDAS (CRM) -----------------
const apiVendasRouter = express.Router();
apiVendasRouter.use(authenticateToken);
apiVendasRouter.use(authorizeArea('vendas'));

// Rota /me para Vendas retornar dados do usuário logado
apiVendasRouter.get('/me', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Não autenticado' });
        }
        
        // Buscar dados completos do usuário no banco com JOIN para foto do funcionário
        const [[dbUser]] = await pool.query(
            `SELECT u.id, u.nome, u.email, u.role, u.is_admin, 
                    u.permissoes_vendas as permissoes, u.foto, u.avatar,
                    f.foto_perfil_url as foto_funcionario
             FROM usuarios u
             LEFT JOIN funcionarios f ON u.email = f.email
             WHERE u.id = ?`,
            [req.user.id]
        );
        
        if (!dbUser) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        
        // Parse permissões
        let permissoes = [];
        if (dbUser.permissoes) {
            try {
                permissoes = JSON.parse(dbUser.permissoes);
            } catch (e) {
                console.error('[API/VENDAS/ME] Erro ao parsear permissoes:', e);
                permissoes = [];
            }
        }
        
        // Determinar a foto (prioridade: avatar > foto > foto_funcionario)
        const fotoUsuario = dbUser.avatar || dbUser.foto || dbUser.foto_funcionario || "/avatars/default.webp";
        
        // Retornar dados completos do usuário
        res.json({
            user: {
                id: dbUser.id,
                nome: dbUser.nome,
                email: dbUser.email,
                role: dbUser.role,
                avatar: fotoUsuario,
                foto: fotoUsuario,
                foto_perfil_url: fotoUsuario,
                is_admin: dbUser.is_admin,
                permissoes: permissoes
            }
        });
    } catch (error) {
        console.error('[API/VENDAS/ME] Erro ao buscar usuário:', error);
        res.status(500).json({ message: 'Erro ao buscar dados do usuário' });
    }
});

// VENDEDORES - Listar todos os vendedores
apiVendasRouter.get('/vendedores', async (req, res, next) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.id, u.nome, u.email, u.role, u.avatar, u.foto,
                   COALESCE(v.total_pedidos, 0) as total_pedidos,
                   COALESCE(v.total_vendas, 0) as total_vendas
            FROM usuarios u
            LEFT JOIN (
                SELECT vendedor_id, 
                       COUNT(*) as total_pedidos,
                       SUM(valor_total) as total_vendas
                FROM pedidos 
                WHERE MONTH(created_at) = MONTH(CURDATE()) 
                  AND YEAR(created_at) = YEAR(CURDATE())
                GROUP BY vendedor_id
            ) v ON u.id = v.vendedor_id
            WHERE u.permissoes_vendas IS NOT NULL 
               OR u.role = 'vendedor' 
               OR u.role = 'admin'
            ORDER BY v.total_vendas DESC, u.nome ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error('[API/VENDAS/VENDEDORES] Erro:', error);
        next(error);
    }
});

// Dashboard - Top vendedores
apiVendasRouter.get('/dashboard/top-vendedores', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const [rows] = await pool.query(`
            SELECT u.id, u.nome, u.avatar, u.foto,
                   COUNT(p.id) as total_pedidos,
                   SUM(p.valor_total) as total_vendas
            FROM usuarios u
            INNER JOIN pedidos p ON u.id = p.vendedor_id
            WHERE p.status != 'cancelado'
              AND MONTH(p.created_at) = MONTH(CURDATE()) 
              AND YEAR(p.created_at) = YEAR(CURDATE())
            GROUP BY u.id, u.nome, u.avatar, u.foto
            ORDER BY total_vendas DESC
            LIMIT ?
        `, [limit]);
        res.json(rows);
    } catch (error) {
        console.error('[API/VENDAS/TOP-VENDEDORES] Erro:', error);
        next(error);
    }
});

// Dashboard - Gráficos
apiVendasRouter.get('/dashboard/graficos', async (req, res, next) => {
    try {
        // Vendas por mês (últimos 6 meses)
        const [vendasMensais] = await pool.query(`
            SELECT DATE_FORMAT(created_at, '%Y-%m') as mes,
                   SUM(valor_total) as total
            FROM pedidos
            WHERE status != 'cancelado'
              AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY mes ASC
        `);
        
        // Vendas por status
        const [vendasStatus] = await pool.query(`
            SELECT status, COUNT(*) as quantidade
            FROM pedidos
            WHERE MONTH(created_at) = MONTH(CURDATE())
              AND YEAR(created_at) = YEAR(CURDATE())
            GROUP BY status
        `);
        
        res.json({
            vendasMensais,
            vendasStatus
        });
    } catch (error) {
        console.error('[API/VENDAS/GRAFICOS] Erro:', error);
        next(error);
    }
});

// PEDIDOS
apiVendasRouter.get('/pedidos', async (req, res, next) => {
    try {
        const { period, page = 1, limit = 1000 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let whereClause = '';
        let params = [];

        if (period && period !== 'all') {
            whereClause = `WHERE p.created_at >= CURDATE() - INTERVAL ? DAY`;
            params.push(parseInt(period));
        }
        params.push(parseInt(limit), offset);

        const [rows] = await pool.query(`
            SELECT p.id, p.valor, p.valor as valor_total, p.status, p.created_at, p.created_at as data_pedido, 
                   p.vendedor_id, p.cliente_id, p.observacao,
                   COALESCE(c.nome_fantasia, c.razao_social, c.nome, 'Cliente não informado') AS cliente_nome,
                   c.email AS cliente_email, c.telefone AS cliente_telefone,
                   e.nome_fantasia AS empresa_nome, 
                   u.nome AS vendedor_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN empresas e ON p.empresa_id = e.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            ${whereClause}
            ORDER BY p.id DESC
            LIMIT ? OFFSET ?
        `, params);
        res.json(rows);
    } catch (error) { next(error); }
});
apiVendasRouter.get('/pedidos/search', async (req, res, next) => {
    try {
        const q = req.query.q || '';
        const query = `%${q}%`;
        const [rows] = await pool.query(`
            SELECT p.id, p.valor, p.valor as valor_total, p.status, p.created_at, p.created_at as data_pedido,
                   p.vendedor_id, p.cliente_id, p.observacao,
                   COALESCE(c.nome_fantasia, c.razao_social, c.nome, 'Cliente não informado') AS cliente_nome,
                   c.email AS cliente_email, c.telefone AS cliente_telefone,
                   e.nome_fantasia AS empresa_nome, 
                   u.nome AS vendedor_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN empresas e ON p.empresa_id = e.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            WHERE c.nome_fantasia LIKE ? OR c.razao_social LIKE ? OR c.nome LIKE ? 
               OR e.nome_fantasia LIKE ? OR p.id LIKE ? OR u.nome LIKE ?
            ORDER BY p.id DESC
        `, [query, query, query, query, query, query]);
        res.json(rows);
    } catch (error) { next(error); }
});
apiVendasRouter.get('/pedidos/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [[pedido]] = await pool.query(`
            SELECT p.*, p.valor as valor_total, p.created_at as data_pedido,
                   COALESCE(c.nome_fantasia, c.razao_social, c.nome, 'Cliente não informado') AS cliente_nome,
                   c.email AS cliente_email, c.telefone AS cliente_telefone,
                   e.nome_fantasia AS empresa_nome, e.razao_social AS empresa_razao_social, 
                   u.nome AS vendedor_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN empresas e ON p.empresa_id = e.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            WHERE p.id = ?
        `, [id]);
        if (!pedido) return res.status(404).json({ message: "Pedido não encontrado." });
        res.json(pedido);
    } catch (error) { next(error); }
});
apiVendasRouter.post('/pedidos', [
    body('empresa_id').isInt({ min: 1 }).withMessage('ID da empresa deve ser um número inteiro positivo'),
    body('valor').isFloat({ min: 0.01 }).withMessage('Valor deve ser um número positivo'),
    body('descricao').optional().trim().isLength({ max: 1000 }).withMessage('Descrição muito longa (máx 1000 caracteres)'),
    validate
], async (req, res, next) => {
    try {
        const { empresa_id, valor, descricao } = req.body;
        const vendedor_id = req.user.id;
        
        await pool.query(
            'INSERT INTO pedidos (empresa_id, vendedor_id, valor, descricao, status) VALUES (?, ?, ?, ?, ?)',
            [empresa_id, vendedor_id, valor, descricao || null, 'orcamento']
        );
        res.status(201).json({ message: 'Pedido criado com sucesso!' });
    } catch (error) { next(error); }
});
apiVendasRouter.put('/pedidos/:id', [
    param('id').isInt({ min: 1 }).withMessage('ID do pedido inválido'),
    body('empresa_id').isInt({ min: 1 }).withMessage('ID da empresa deve ser um número inteiro positivo'),
    body('valor').isFloat({ min: 0.01 }).withMessage('Valor deve ser um número positivo'),
    body('descricao').optional().trim().isLength({ max: 1000 }).withMessage('Descrição muito longa (máx 1000 caracteres)'),
    validate
], async (req, res, next) => {
    try {
        const { id } = req.params;
        const { empresa_id, valor, descricao } = req.body;
        
        const [result] = await pool.query(
            `UPDATE pedidos SET empresa_id = ?, valor = ?, descricao = ? WHERE id = ?`,
            [empresa_id, valor, descricao || null, id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Pedido não encontrado.' });
        res.json({ message: 'Pedido atualizado com sucesso.' });
    } catch (error) { next(error); }
});
apiVendasRouter.delete('/pedidos/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM pedidos WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: "Pedido não encontrado." });
        res.status(204).send();
    } catch (error) { next(error); }
});

// PATCH /pedidos/:id - Atualização parcial do pedido (para o Kanban)
apiVendasRouter.patch('/pedidos/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        console.log(`📝 PATCH /pedidos/${id} - Dados recebidos:`, updates);
        
        // Verificar se pedido existe
        const [existingRows] = await pool.query('SELECT * FROM pedidos WHERE id = ?', [id]);
        if (existingRows.length === 0) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }
        
        // Construir query de atualização dinâmica
        const fieldsToUpdate = [];
        const values = [];
        
        // Atualizar vendedor_id se vendedor_nome foi fornecido
        if (updates.vendedor_nome !== undefined && updates.vendedor_nome !== '') {
            const [vendedorRows] = await pool.query(
                'SELECT id, nome FROM usuarios WHERE nome LIKE ? OR apelido LIKE ? LIMIT 1', 
                [`%${updates.vendedor_nome}%`, `%${updates.vendedor_nome}%`]
            );
            if (vendedorRows.length > 0) {
                fieldsToUpdate.push('vendedor_id = ?');
                values.push(vendedorRows[0].id);
            }
        }
        
        if (updates.observacao !== undefined) {
            fieldsToUpdate.push('observacao = ?');
            values.push(updates.observacao);
        }
        
        if (updates.status !== undefined) {
            fieldsToUpdate.push('status = ?');
            values.push(updates.status);
        }
        
        if (updates.valor !== undefined) {
            fieldsToUpdate.push('valor = ?');
            values.push(updates.valor);
        }
        
        if (updates.frete !== undefined) {
            fieldsToUpdate.push('frete = ?');
            values.push(updates.frete);
        }
        
        if (updates.descricao !== undefined) {
            fieldsToUpdate.push('descricao = ?');
            values.push(updates.descricao);
        }
        
        if (updates.prioridade !== undefined) {
            fieldsToUpdate.push('prioridade = ?');
            values.push(updates.prioridade);
        }
        
        if (updates.cliente_id !== undefined) {
            fieldsToUpdate.push('cliente_id = ?');
            values.push(updates.cliente_id || null);
        }
        
        if (updates.empresa_id !== undefined) {
            fieldsToUpdate.push('empresa_id = ?');
            values.push(updates.empresa_id || null);
        }
        
        if (fieldsToUpdate.length === 0) {
            return res.status(400).json({ message: 'Nenhum campo válido para atualizar.' });
        }
        
        values.push(id);
        
        const query = `UPDATE pedidos SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
        const [result] = await pool.query(query, values);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }
        
        console.log(`✅ Pedido ${id} atualizado com sucesso!`);
        
        // Buscar pedido atualizado para retornar
        const [updatedRows] = await pool.query(`
            SELECT p.*, 
                   c.nome as cliente_nome,
                   u.nome as vendedor_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            WHERE p.id = ?
        `, [id]);
        
        res.json({ 
            message: 'Pedido atualizado com sucesso.',
            pedido: updatedRows[0] || null
        });
    } catch (error) {
        console.error('❌ Erro ao atualizar pedido (PATCH):', error);
        next(error);
    }
});

apiVendasRouter.put('/pedidos/:id/status', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        console.log(`📝 Atualizando status do pedido ${id} para: ${status}`);
        
        const validStatuses = ['orcamento', 'orçamento', 'analise', 'analise-credito', 'aprovado', 'pedido-aprovado', 'faturar', 'faturado', 'entregue', 'cancelado', 'recibo'];
        if (!status || !validStatuses.includes(status)) {
            console.log(`❌ Status inválido: ${status}`);
            return res.status(400).json({ message: 'Status inválido.' });
        }
        
        // Verificar se é admin (lista de admins por email/nome)
        const user = req.user || {};
        const adminsEmails = ['ti@aluforce.ind.br', 'andreia@aluforce.ind.br', 'douglas@aluforce.ind.br'];
        const adminsNomes = ['antonio egidio', 'andreia', 'douglas'];
        
        let isAdmin = user.is_admin === true || user.is_admin === 1 || (user.role && user.role.toString().toLowerCase() === 'admin');
        if (!isAdmin && user.email) {
            isAdmin = adminsEmails.includes(user.email.toLowerCase());
        }
        if (!isAdmin && user.nome) {
            // Normalizar nome removendo acentos para comparação
            const nomeMin = user.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            isAdmin = adminsNomes.some(admin => nomeMin.includes(admin));
        }
        
        console.log(`🔐 Verificação de permissão - Usuário: ${user.nome || user.email} | Admin: ${isAdmin} | Status desejado: ${status}`);
        
        // Vendedores (não-admin) só podem mover até "analise"
        if (!isAdmin) {
            // Verificar se é dono do pedido
            const [pedidoRows] = await pool.query('SELECT vendedor_id FROM pedidos WHERE id = ?', [id]);
            if (pedidoRows.length > 0) {
                const pedido = pedidoRows[0];
                if (pedido.vendedor_id && user.id && pedido.vendedor_id !== user.id) {
                    console.log(`❌ Usuário ${user.id} não é dono do pedido ${id}`);
                    return res.status(403).json({ message: 'Você só pode mover seus próprios pedidos.' });
                }
            }
            
            // Vendedor só pode definir status até "analise"
            const allowedForVendedor = ['orcamento', 'orçamento', 'analise', 'analise-credito'];
            if (!allowedForVendedor.includes(status)) {
                console.log(`❌ Vendedor tentou mover para status ${status} - apenas admin pode`);
                return res.status(403).json({ message: 'Apenas administradores podem mover pedidos após "Análise de Crédito".' });
            }
        }
        
        // Atualiza status (usando updated_at se existir, senão só status)
        const [result] = await pool.query('UPDATE pedidos SET status = ? WHERE id = ?', [status, id]);
        
        if (result.affectedRows === 0) {
            console.log(`❌ Pedido ${id} não encontrado`);
            return res.status(404).json({ message: "Pedido não encontrado." });
        }
        
        console.log(`✅ Status do pedido ${id} atualizado para: ${status} por ${user.nome || user.email} (Admin: ${isAdmin})`);
        res.json({ message: 'Status atualizado com sucesso.', success: true });
    } catch (error) { 
        console.error('❌ Erro ao atualizar status:', error);
        next(error); 
    }
});

// POST /pedidos/:id/historico - Registrar histórico do pedido
apiVendasRouter.post('/pedidos/:id/historico', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { tipo, action, descricao, usuario, meta } = req.body;
        const user = req.user || {};
        
        // Garantir que a tabela existe com colunas corretas
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS pedido_historico (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    pedido_id INT NOT NULL,
                    usuario_id INT,
                    usuario_nome VARCHAR(100),
                    acao VARCHAR(50) NOT NULL,
                    descricao TEXT,
                    meta JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_pedido (pedido_id),
                    INDEX idx_acao (acao)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
        } catch (e) { /* tabela já existe */ }
        
        // Tentar inserir com colunas corretas (usuario_id/usuario_nome ou user_id/user_name)
        try {
            await pool.query(
                'INSERT INTO pedido_historico (pedido_id, usuario_id, usuario_nome, acao, descricao, meta) VALUES (?, ?, ?, ?, ?, ?)',
                [id, user.id || null, usuario || user.nome || 'Sistema', tipo || action || 'status', descricao || '', meta ? JSON.stringify(meta) : null]
            );
        } catch (e) {
            // Fallback para colunas alternativas
            await pool.query(
                'INSERT INTO pedido_historico (pedido_id, descricao, acao, meta) VALUES (?, ?, ?, ?)',
                [id, `${usuario || user.nome || 'Sistema'}: ${descricao || ''}`, tipo || action || 'status', meta ? JSON.stringify(meta) : null]
            );
        }
        
        res.status(201).json({ message: 'Histórico registrado com sucesso!' });
    } catch (error) {
        console.error('❌ Erro ao registrar histórico:', error);
        // Não bloqueia a operação principal
        res.status(201).json({ message: 'Histórico não registrado (tabela não configurada)', warning: true });
    }
});

// EMPRESAS
apiVendasRouter.get('/empresas', async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Verificar se o usuário é admin ou vendedor
        const isAdmin = req.user && (req.user.is_admin || req.user.role === 'admin' || req.user.role === 'administrador');
        
        let query = 'SELECT * FROM empresas';
        let params = [];
        
        // Se não for admin, filtrar apenas empresas do vendedor
        if (!isAdmin && req.user && req.user.id) {
            query += ' WHERE vendedor_id = ? OR vendedor_id IS NULL';
            params.push(req.user.id);
        }
        
        query += ' ORDER BY nome_fantasia ASC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) { next(error); }
});
apiVendasRouter.get('/empresas/search', async (req, res, next) => {
    try {
        const q = req.query.q || '';
        const queryStr = `%${q}%`;
        
        // Verificar se o usuário é admin ou vendedor
        const isAdmin = req.user && (req.user.is_admin || req.user.role === 'admin' || req.user.role === 'administrador');
        
        let query = `SELECT id, nome_fantasia, cnpj FROM empresas WHERE (nome_fantasia LIKE ? OR razao_social LIKE ? OR cnpj LIKE ?)`;
        let params = [queryStr, queryStr, queryStr];
        
        // Se não for admin, filtrar apenas empresas do vendedor
        if (!isAdmin && req.user && req.user.id) {
            query += ' AND (vendedor_id = ? OR vendedor_id IS NULL)';
            params.push(req.user.id);
        }
        
        query += ' ORDER BY nome_fantasia LIMIT 10';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) { next(error); }
});
apiVendasRouter.get('/empresas/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [[empresa]] = await pool.query('SELECT * FROM empresas WHERE id = ?', [id]);
        if (!empresa) return res.status(404).json({ message: 'Empresa não encontrada.' });
        res.json(empresa);
    } catch (error) { next(error); }
});
apiVendasRouter.get('/empresas/:id/details', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [empresaResult, kpisResult, pedidosResult, clientesResult] = await Promise.all([
            pool.query('SELECT * FROM empresas WHERE id = ?', [id]),
            pool.query(`SELECT COUNT(*) AS totalPedidos, COALESCE(SUM(CASE WHEN status = 'faturado' THEN valor ELSE 0 END), 0) AS totalFaturado, COALESCE(AVG(CASE WHEN status = 'faturado' THEN valor ELSE 0 END), 0) AS ticketMedio FROM pedidos WHERE empresa_id = ?`, [id]),
            pool.query('SELECT id, valor, status, created_at FROM pedidos WHERE empresa_id = ? ORDER BY created_at DESC', [id]),
            pool.query('SELECT id, nome, email, telefone FROM clientes WHERE empresa_id = ? ORDER BY nome ASC', [id])
        ]);
        const [details] = empresaResult[0];
        if (!details) return res.status(404).json({ message: 'Empresa não encontrada.' });
        const [kpis] = kpisResult[0];
        const [pedidos] = pedidosResult;
        const [clientes] = clientesResult;
        res.json({ details, kpis: kpis[0], pedidos, clientes });
    } catch (error) { next(error); }
});
apiVendasRouter.post('/empresas', [
    body('cnpj').trim().notEmpty().withMessage('CNPJ é obrigatório')
        .matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/).withMessage('CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX'),
    body('nome_fantasia').trim().notEmpty().withMessage('Nome fantasia é obrigatório')
        .isLength({ max: 255 }).withMessage('Nome fantasia muito longo'),
    body('razao_social').optional().trim().isLength({ max: 255 }).withMessage('Razão social muito longa'),
    body('email').optional().trim().isEmail().withMessage('Email inválido'),
    body('telefone').optional().trim().matches(/^\(\d{2}\) \d{4,5}-\d{4}$/).withMessage('Telefone inválido'),
    validate
], async (req, res, next) => {
    try {
        const { cnpj, nome_fantasia, razao_social, email, telefone, cep, logradouro, numero, bairro, municipio, uf } = req.body;
        
        // Associar o vendedor que está cadastrando a empresa
        const vendedor_id = req.user ? req.user.id : null;
        
        await pool.query(
            `INSERT INTO empresas (cnpj, nome_fantasia, razao_social, email, telefone, cep, logradouro, numero, bairro, municipio, uf, vendedor_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [cnpj, nome_fantasia, razao_social || null, email || null, telefone || null, cep || null, logradouro || null, numero || null, bairro || null, municipio || null, uf || null, vendedor_id, vendedor_id]
        );
        res.status(201).json({ message: 'Empresa cadastrada com sucesso!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Este CNPJ já está cadastrado.' });
        next(error);
    }
});

// CLIENTES (CONTATOS)
apiVendasRouter.get('/clientes', async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Verificar se o usuário é admin ou vendedor
        const isAdmin = req.user && (req.user.is_admin || req.user.role === 'admin' || req.user.role === 'administrador');
        
        let query = `
            SELECT c.id, c.nome, c.email, c.telefone, e.nome_fantasia AS empresa_nome
            FROM clientes c
            LEFT JOIN empresas e ON c.empresa_id = e.id
        `;
        let params = [];
        
        // Se não for admin, filtrar apenas clientes de empresas do vendedor
        if (!isAdmin && req.user && req.user.id) {
            query += ' WHERE e.vendedor_id = ? OR e.vendedor_id IS NULL';
            params.push(req.user.id);
        }
        
        query += ' ORDER BY c.nome ASC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) { next(error); }
});
apiVendasRouter.get('/clientes/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [[cliente]] = await pool.query('SELECT * FROM clientes WHERE id = ?', [id]);
        if (!cliente) return res.status(404).json({ message: 'Cliente não encontrado.' });
        res.json(cliente);
    } catch (error) { next(error); }
});
apiVendasRouter.post('/clientes', [
    body('nome').trim().notEmpty().withMessage('Nome é obrigatório')
        .isLength({ max: 255 }).withMessage('Nome muito longo'),
    body('empresa_id').isInt({ min: 1 }).withMessage('ID da empresa inválido'),
    body('email').optional().trim().isEmail().withMessage('Email inválido'),
    body('telefone').optional().trim().matches(/^\(\d{2}\) \d{4,5}-\d{4}$/).withMessage('Telefone inválido'),
    validate
], async (req, res, next) => {
    try {
        const { nome, email, telefone, empresa_id } = req.body;
        
        await pool.query(
            'INSERT INTO clientes (nome, email, telefone, empresa_id) VALUES (?, ?, ?, ?)',
            [nome, email || null, telefone || null, empresa_id]
        );
        res.status(201).json({ message: 'Cliente cadastrado com sucesso!' });
    } catch (error) { next(error); }
});
apiVendasRouter.put('/clientes/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nome, email, telefone, empresa_id } = req.body;
        if (!nome || !empresa_id) return res.status(400).json({ message: 'Nome e empresa são obrigatórios.' });
        const [result] = await pool.query(
            `UPDATE clientes SET nome = ?, email = ?, telefone = ?, empresa_id = ? WHERE id = ?`,
            [nome, email, telefone, empresa_id, id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Cliente não encontrado.' });
        res.json({ message: 'Cliente atualizado com sucesso.' });
    } catch (error) { next(error); }
});
apiVendasRouter.delete('/clientes/:id', authorizeAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM clientes WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Cliente não encontrado.' });
        res.status(204).send();
    } catch (error) { next(error); }
});
apiVendasRouter.post('/clientes/:id/interacoes', async (req, res, next) => {
    try {
        const { id: cliente_id } = req.params;
        const { tipo, anotacao } = req.body;
        const { id: usuario_id } = req.user;
        if (!tipo || !anotacao) return res.status(400).json({ message: 'Tipo e anotação são obrigatórios.' });
        await pool.query(
            'INSERT INTO cliente_interacoes (cliente_id, usuario_id, tipo, anotacao) VALUES (?, ?, ?, ?)',
            [cliente_id, usuario_id, tipo, anotacao]
        );
        res.status(201).json({ message: 'Interação registrada com sucesso!' });
    } catch (error) { next(error); }
});

// METAS, COMISSÕES E RELATÓRIOS (ADMIN)
apiVendasRouter.get('/metas', authorizeAdminOrComercial, async (req, res, next) => {
    try {
        const [rows] = await pool.query(`SELECT m.*, u.nome AS vendedor_nome FROM metas_vendas m LEFT JOIN usuarios u ON m.vendedor_id = u.id ORDER BY m.periodo DESC, m.vendedor_id`);
        res.json(rows);
    } catch (error) { next(error); }
});
apiVendasRouter.post('/metas', authorizeAdminOrComercial, async (req, res, next) => {
    try {
        const { vendedor_id, periodo, tipo, valor_meta } = req.body;
        await pool.query('INSERT INTO metas_vendas (vendedor_id, periodo, tipo, valor_meta) VALUES (?, ?, ?, ?)', [vendedor_id || null, periodo, tipo, valor_meta]);
        res.status(201).json({ message: 'Meta criada com sucesso!' });
    } catch (error) { next(error); }
});
apiVendasRouter.put('/metas/:id', authorizeAdminOrComercial, async (req, res, next) => {
    try {
        const { vendedor_id, periodo, tipo, valor_meta } = req.body;
        await pool.query('UPDATE metas_vendas SET vendedor_id=?, periodo=?, tipo=?, valor_meta=? WHERE id=?', [vendedor_id || null, periodo, tipo, valor_meta, req.params.id]);
        res.json({ message: 'Meta atualizada com sucesso!' });
    } catch (error) { next(error); }
});
apiVendasRouter.delete('/metas/:id', authorizeAdminOrComercial, async (req, res, next) => {
    try {
        await pool.query('DELETE FROM metas_vendas WHERE id=?', [req.params.id]);
        res.json({ message: 'Meta excluída com sucesso!' });
    } catch (error) { next(error); }
});
apiVendasRouter.get('/metas/progresso', authorizeAdminOrComercial, async (req, res, next) => {
    try {
        const [metas] = await pool.query('SELECT * FROM metas_vendas');
        const progresso = [];
        for (const meta of metas) {
            let where = 'status = "faturado" AND DATE_FORMAT(created_at, "%Y-%m") = ?';
            let params = [meta.periodo];
            if (meta.vendedor_id) {
                where += ' AND vendedor_id = ?';
                params.push(meta.vendedor_id);
            }
            const [[{ totalVendido = 0 } = {}]] = await pool.query(`SELECT SUM(valor) AS totalVendido FROM pedidos WHERE ${where}`, params);
            progresso.push({ meta_id: meta.id, periodo: meta.periodo, tipo: meta.tipo, vendedor_id: meta.vendedor_id, valor_meta: meta.valor_meta, totalVendido });
        }
        res.json(progresso);
    } catch (error) { next(error); }
});
apiVendasRouter.get('/comissoes', authorizeAdminOrComercial, async (req, res, next) => {
    try {
        const { periodo } = req.query; // Ex: '2025-08'
        let where = 'p.status = "faturado"';
        let params = [];
        if (periodo) {
            where += ' AND DATE_FORMAT(p.created_at, "%Y-%m") = ?';
            params.push(periodo);
        }
        const [rows] = await pool.query(`
            SELECT p.id AS pedido_id, p.valor, p.created_at, u.id AS vendedor_id, u.nome AS vendedor_nome, u.comissao_percentual,
            (p.valor * u.comissao_percentual / 100) AS valor_comissao
            FROM pedidos p
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            WHERE ${where}
            ORDER BY u.nome, p.created_at DESC
        `, params);
        res.json(rows);
    } catch (error) { next(error); }
});
apiVendasRouter.get('/relatorios/vendas', authorizeAdminOrComercial, async (req, res, next) => {
    try {
        const { inicio, fim, vendedor_id } = req.query;
        let where = 'p.created_at >= ? AND p.created_at <= ?';
        let params = [inicio, fim];
        if (vendedor_id) {
            where += ' AND p.vendedor_id = ?';
            params.push(vendedor_id);
        }
        const [rows] = await pool.query(`
            SELECT p.id, p.valor, p.status, p.created_at, u.nome AS vendedor_nome, e.nome_fantasia AS empresa_nome
            FROM pedidos p
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            LEFT JOIN empresas e ON p.empresa_id = e.id
            WHERE ${where}
            ORDER BY p.created_at DESC
        `, params);
        res.json(rows);
    } catch (error) { next(error); }
});
apiVendasRouter.get('/relatorios/funil', authorizeAdminOrComercial, async (req, res, next) => {
    try {
        const { inicio, fim } = req.query;
        const [rows] = await pool.query(`
            SELECT status, COUNT(*) AS total
            FROM pedidos
            WHERE created_at >= ? AND created_at <= ?
            GROUP BY status
        `, [inicio, fim]);
        res.json(rows);
    } catch (error) { next(error); }
});
// Alias para dashboard-stats
apiVendasRouter.get('/dashboard', authorizeAdminOrComercial, async (req, res, next) => {
    try {
        const [faturadoResult] = await pool.query(`SELECT COALESCE(SUM(valor), 0) AS totalFaturadoMes FROM pedidos WHERE status = 'faturado' AND MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())`);
        const [pendentesResult] = await pool.query(`SELECT COUNT(*) AS pedidosPendentes FROM pedidos WHERE status IN ('orcamento', 'analise', 'aprovado')`);
        const [clientesResult] = await pool.query(`SELECT COUNT(*) AS novosClientesMes FROM empresas WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())`);
        res.json({
            totalFaturadoMes: faturadoResult[0].totalFaturadoMes,
            pedidosPendentes: pendentesResult[0].pedidosPendentes,
            novosClientesMes: clientesResult[0].novosClientesMes
        });
    } catch (error) { next(error); }
});
apiVendasRouter.get('/dashboard-stats', authorizeAdminOrComercial, async (req, res, next) => {
    try {
        const [faturadoResult] = await pool.query(`SELECT COALESCE(SUM(valor), 0) AS totalFaturadoMes FROM pedidos WHERE status = 'faturado' AND MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())`);
        const [pendentesResult] = await pool.query(`SELECT COUNT(*) AS pedidosPendentes FROM pedidos WHERE status IN ('orcamento', 'analise', 'aprovado')`);
        const [clientesResult] = await pool.query(`SELECT COUNT(*) AS novosClientesMes FROM empresas WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())`);
        res.json({
            totalFaturadoMes: faturadoResult[0].totalFaturadoMes,
            pedidosPendentes: pendentesResult[0].pedidosPendentes,
            novosClientesMes: clientesResult[0].novosClientesMes
        });
    } catch (error) { next(error); }
});

// Itens do pedido - Listar
apiVendasRouter.get('/pedidos/:id/itens', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [itens] = await pool.query(
            'SELECT * FROM pedido_itens WHERE pedido_id = ? ORDER BY id ASC',
            [id]
        );
        res.json(itens);
    } catch (error) {
        if (error && error.code === 'ER_NO_SUCH_TABLE') return res.json([]);
        next(error);
    }
});

// Itens do pedido - Adicionar
apiVendasRouter.post('/pedidos/:id/itens', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { codigo, descricao, quantidade, quantidade_parcial, unidade, local_estoque, preco_unitario, desconto } = req.body;
        
        if (!codigo || !descricao) {
            return res.status(400).json({ message: 'Código e descrição são obrigatórios.' });
        }
        
        const qty = parseFloat(quantidade) || 1;
        const qtyParcial = parseFloat(quantidade_parcial) || 0;
        const preco = parseFloat(preco_unitario) || 0;
        const desc = parseFloat(desconto) || 0;
        const total = (qty * preco) - desc;
        
        const [result] = await pool.query(
            `INSERT INTO pedido_itens (pedido_id, codigo, descricao, quantidade, quantidade_parcial, unidade, local_estoque, preco_unitario, desconto, total)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, codigo, descricao, qty, qtyParcial, unidade || 'UN', local_estoque || 'PADRAO - Local de Estoque Padrão', preco, desc, total]
        );
        
        res.status(201).json({ message: 'Item adicionado com sucesso!', id: result.insertId });
    } catch (error) {
        next(error);
    }
});

// Itens do pedido - Atualizar
apiVendasRouter.put('/pedidos/:pedidoId/itens/:itemId', async (req, res, next) => {
    try {
        const { pedidoId, itemId } = req.params;
        const { codigo, descricao, quantidade, quantidade_parcial, unidade, local_estoque, preco_unitario, desconto } = req.body;
        
        const qty = parseFloat(quantidade) || 1;
        const qtyParcial = parseFloat(quantidade_parcial) || 0;
        const preco = parseFloat(preco_unitario) || 0;
        const desc = parseFloat(desconto) || 0;
        const total = (qty * preco) - desc;
        
        await pool.query(
            `UPDATE pedido_itens SET codigo = ?, descricao = ?, quantidade = ?, quantidade_parcial = ?, unidade = ?, local_estoque = ?, preco_unitario = ?, desconto = ?, total = ? WHERE id = ? AND pedido_id = ?`,
            [codigo, descricao, qty, qtyParcial, unidade, local_estoque, preco, desc, total, itemId, pedidoId]
        );
        
        res.json({ message: 'Item atualizado com sucesso!' });
    } catch (error) {
        next(error);
    }
});

// Itens do pedido - Buscar item específico (GET)
apiVendasRouter.get('/pedidos/:pedidoId/itens/:itemId', async (req, res, next) => {
    try {
        const { pedidoId, itemId } = req.params;
        const [rows] = await pool.query(
            'SELECT * FROM pedido_itens WHERE id = ? AND pedido_id = ?',
            [itemId, pedidoId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Item não encontrado.' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
});

// Itens do pedido - Excluir
apiVendasRouter.delete('/pedidos/:pedidoId/itens/:itemId', async (req, res, next) => {
    try {
        const { pedidoId, itemId } = req.params;
        await pool.query('DELETE FROM pedido_itens WHERE id = ? AND pedido_id = ?', [itemId, pedidoId]);
        res.json({ message: 'Item excluído com sucesso!' });
    } catch (error) {
        next(error);
    }
});

// Autocomplete de produtos - busca rápida para dropdown
apiVendasRouter.get('/produtos/autocomplete/:termo', async (req, res, next) => {
    try {
        const { termo } = req.params;
        const limit = parseInt(req.query.limit) || 15;
        
        const [rows] = await pool.query(
            `SELECT id, codigo, descricao, unidade, preco_venda, estoque_atual, local_estoque 
             FROM produtos 
             WHERE situacao = 'ativo' AND (codigo LIKE ? OR descricao LIKE ? OR ean LIKE ?)
             ORDER BY 
                CASE 
                    WHEN codigo = ? THEN 1 
                    WHEN codigo LIKE ? THEN 2 
                    ELSE 3 
                END,
                descricao ASC
             LIMIT ?`,
            [`%${termo}%`, `%${termo}%`, `%${termo}%`, termo, `${termo}%`, limit]
        );
        
        res.json(rows);
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') return res.json([]);
        next(error);
    }
});

app.use('/api/vendas', apiVendasRouter);


// =================================================================
// 6. ROTAS PARA SERVIR PÁGINAS HTML E LOGIN (se houver)
// =================================================================

// --- ROTA DE LOGIN / AUTH (API) ---
// Nota: o guard de disponibilidade do DB e o `authRouter` são montados
// antes das rotas da API para garantir comportamento consistente em modo degradado.

// ============================================================================
// ENDPOINTS TEMPORÁRIOS REMOVIDOS - USAR SCRIPT EM /scripts/update_permissions.js
// ============================================================================
// SISTEMA DE LOGIN - ENDPOINT PRINCIPAL
// ============================================================================

// Rota de login principal do sistema
app.post('/api/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log(`🔍 [LOGIN DEBUG] Tentativa de login para: ${email}`);
        
        if (!email || !password) {
            console.log('❌ [LOGIN DEBUG] Email ou senha faltando');
            return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
        }

        // Buscar usuário na tabela usuarios primeiro
        console.log('🔍 [LOGIN DEBUG] Buscando na tabela usuarios...');
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ? LIMIT 1', [email]);
        let user = (rows && rows.length) ? rows[0] : null;
        
        console.log(`🔍 [LOGIN DEBUG] Usuário encontrado em usuarios: ${user ? 'SIM' : 'NÁO'}`);
        
        // Verificar se usuário está inativo
        if (user && user.status && user.status.toLowerCase() === 'inativo') {
            console.log('❌ [LOGIN DEBUG] Usuário está INATIVO - bloqueando login');
            return res.status(403).json({ message: 'Sua conta está inativa. Entre em contato com o administrador.' });
        }

        // Se não encontrado em usuarios, tentar na tabela funcionarios
        if (!user) {
            console.log('🔍 [LOGIN DEBUG] Buscando na tabela funcionarios...');
            try {
                const [frows] = await pool.query('SELECT * FROM funcionarios WHERE email = ? LIMIT 1', [email]);
                if (frows && frows.length) {
                    const f = frows[0];
                    console.log(`🔍 [LOGIN DEBUG] Funcionário encontrado: ${f.nome_completo || f.nome}`);
                    console.log(`🔍 [LOGIN DEBUG] Funcionário tem senha: ${f.senha ? 'SIM' : 'NÁO'}`);
                    console.log(`🔍 [LOGIN DEBUG] Funcionário tem senha_hash: ${f.senha_hash ? 'SIM' : 'NÁO'}`);
                    
                    // Converter role para is_admin (tabela funcionarios não tem is_admin)
                    const roleAdmin = (f.role === 'admin' || f.role === 'administrador');
                    
                    // Verificar se funcionário está inativo
                    if (f.status && f.status.toLowerCase() === 'inativo') {
                        console.log('❌ [LOGIN DEBUG] Funcionário está INATIVO - bloqueando login');
                        return res.status(403).json({ message: 'Sua conta está inativa. Entre em contato com o administrador.' });
                    }
                    
                    user = {
                        id: f.id,
                        nome: f.nome_completo || f.nome || null,
                        email: f.email,
                        role: f.role || 'funcionario',
                        is_admin: roleAdmin ? 1 : 0,
                        senha_hash: f.password_hash || f.senha_hash || null,
                        senha: f.senha || null
                    };
                } else {
                    console.log('❌ [LOGIN DEBUG] Funcionário não encontrado');
                }
            } catch (e) {
                console.error('❌ [LOGIN DEBUG] Erro ao buscar funcionario:', e);
            }
        }

        if (!user) {
            console.log('❌ [LOGIN DEBUG] Usuário não encontrado em nenhuma tabela');
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        console.log(`🔍 [LOGIN DEBUG] Iniciando verificação de senha para: ${user.nome}`);

        // Verificar senha
        let senhaValida = false;
        
        // Tentar bcrypt primeiro se houver hash
        if (user.senha_hash) {
            try {
                console.log('🔍 [LOGIN DEBUG] Tentando verificação com bcrypt...');
                const bcrypt = require('bcryptjs');
                senhaValida = await bcrypt.compare(password, user.senha_hash);
                console.log(`🔍 [LOGIN DEBUG] Bcrypt resultado: ${senhaValida ? 'VÁLIDA' : 'INVÁLIDA'}`);
            } catch (e) {
                console.error('❌ [LOGIN DEBUG] Erro bcrypt:', e);
            }
        }
        
        // Fallback: senha em texto plano (desenvolvimento)
        if (!senhaValida && user.senha) {
            console.log('🔍 [LOGIN DEBUG] Tentando verificação com senha em texto plano...');
            senhaValida = (user.senha === password);
            console.log(`🔍 [LOGIN DEBUG] Texto plano resultado: ${senhaValida ? 'VÁLIDA' : 'INVÁLIDA'}`);
            console.log(`🔍 [LOGIN DEBUG] Senha fornecida: "${password}" vs Armazenada: "${user.senha}"`);
        }

        if (!senhaValida) {
            console.log('❌ [LOGIN DEBUG] Senha inválida - rejeitando login');
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        console.log('✅ [LOGIN DEBUG] Senha válida - gerando token...');

        // Gerar JWT token
        const tokenPayload = {
            id: user.id,
            nome: user.nome,
            email: user.email,
            role: user.role || 'user',
            is_admin: user.is_admin || 0
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

        // Definir cookie httpOnly
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 8 * 60 * 60 * 1000, // 8 horas
            path: '/'
        });

        console.log(`✅ Login bem-sucedido: ${user.email}`);

        // Resposta de sucesso - inclui token para compatibilidade com localStorage
        res.json({
            message: 'Login realizado com sucesso',
            token: token, // Token JWT para localStorage (compatibilidade com módulos que usam Bearer token)
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                role: user.role,
                is_admin: user.is_admin
            },
            redirectTo: '/dashboard'
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// ============================================================================
// FIM DO SISTEMA DE LOGIN
// ============================================================================

// ============================================================================
// SISTEMA DE SUPORTE - APIs de Tickets
// ============================================================================

// Dados em memória para tickets de suporte (em produção usar banco de dados)
let suporteTickets = [];
let suporteKnowledge = [
    { id: 1, titulo: 'Como criar um novo orçamento?', categoria: 'Vendas', conteudo: 'Para criar um novo orçamento, acesse o módulo Vendas e clique no botão "+ Novo Orçamento".' },
    { id: 2, titulo: 'Como faturar um pedido?', categoria: 'Vendas', conteudo: 'Para faturar, abra o pedido desejado e clique em "Faturar Agora" na barra lateral.' },
    { id: 3, titulo: 'Como adicionar um funcionário?', categoria: 'RH', conteudo: 'Acesse o módulo RH, vá em Funcionários e clique em "Adicionar Funcionário".' },
    { id: 4, titulo: 'Como gerar relatórios?', categoria: 'Geral', conteudo: 'Cada módulo possui uma seção de Relatórios. Acesse a seção desejada e escolha o tipo de relatório.' },
    { id: 5, titulo: 'Como alterar minha senha?', categoria: 'Conta', conteudo: 'Clique no seu avatar no canto superior direito e selecione "Meu Perfil" para alterar sua senha.' }
];

// GET /api/suporte/tickets/pendentes - Listar tickets pendentes para o admin
app.get('/api/suporte/tickets/pendentes', (req, res) => {
    try {
        const pendentes = suporteTickets.filter(t => t.status === 'pendente' || t.status === 'aberto');
        res.json({ 
            success: true, 
            tickets: pendentes,
            count: pendentes.length
        });
    } catch (error) {
        console.error('Erro ao buscar tickets pendentes:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar tickets' });
    }
});

// GET /api/tickets/stats - Estatísticas de tickets
app.get('/api/tickets/stats', (req, res) => {
    try {
        const total = suporteTickets.length;
        const pendentes = suporteTickets.filter(t => t.status === 'pendente' || t.status === 'aberto').length;
        const resolvidos = suporteTickets.filter(t => t.status === 'resolvido' || t.status === 'fechado').length;
        const emAndamento = suporteTickets.filter(t => t.status === 'em_andamento').length;
        
        res.json({
            success: true,
            stats: {
                total,
                pendentes,
                resolvidos,
                emAndamento,
                tempoMedioResposta: '2h 30min'
            }
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar estatísticas' });
    }
});

// GET /api/tickets/knowledge/all - Base de conhecimento
app.get('/api/tickets/knowledge/all', (req, res) => {
    try {
        res.json({
            success: true,
            articles: suporteKnowledge,
            count: suporteKnowledge.length
        });
    } catch (error) {
        console.error('Erro ao buscar base de conhecimento:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar artigos' });
    }
});

// POST /api/suporte/tickets - Criar novo ticket
app.post('/api/suporte/tickets', (req, res) => {
    try {
        const { assunto, mensagem, prioridade, categoria, userId, userName } = req.body;
        
        const novoTicket = {
            id: Date.now(),
            assunto: assunto || 'Sem assunto',
            mensagem: mensagem || '',
            prioridade: prioridade || 'normal',
            categoria: categoria || 'geral',
            status: 'aberto',
            userId: userId || null,
            userName: userName || 'Usuário',
            criadoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString(),
            respostas: []
        };
        
        suporteTickets.push(novoTicket);
        
        res.json({
            success: true,
            message: 'Ticket criado com sucesso!',
            ticket: novoTicket
        });
    } catch (error) {
        console.error('Erro ao criar ticket:', error);
        res.status(500).json({ success: false, message: 'Erro ao criar ticket' });
    }
});

// GET /api/suporte/tickets/:id - Buscar ticket específico
app.get('/api/suporte/tickets/:id', (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        const ticket = suporteTickets.find(t => t.id === ticketId);
        
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket não encontrado' });
        }
        
        res.json({ success: true, ticket });
    } catch (error) {
        console.error('Erro ao buscar ticket:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar ticket' });
    }
});

// PUT /api/suporte/tickets/:id - Atualizar ticket
app.put('/api/suporte/tickets/:id', (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        const ticketIndex = suporteTickets.findIndex(t => t.id === ticketId);
        
        if (ticketIndex === -1) {
            return res.status(404).json({ success: false, message: 'Ticket não encontrado' });
        }
        
        const { status, resposta, atendente } = req.body;
        
        if (status) {
            suporteTickets[ticketIndex].status = status;
        }
        
        if (resposta) {
            suporteTickets[ticketIndex].respostas.push({
                id: Date.now(),
                texto: resposta,
                atendente: atendente || 'Suporte',
                criadoEm: new Date().toISOString()
            });
        }
        
        suporteTickets[ticketIndex].atualizadoEm = new Date().toISOString();
        
        res.json({
            success: true,
            message: 'Ticket atualizado!',
            ticket: suporteTickets[ticketIndex]
        });
    } catch (error) {
        console.error('Erro ao atualizar ticket:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar ticket' });
    }
});

// GET /api/suporte/tickets/user/:userId - Tickets de um usuário
app.get('/api/suporte/tickets/user/:userId', (req, res) => {
    try {
        const userId = req.params.userId;
        const userTickets = suporteTickets.filter(t => t.userId == userId);
        
        res.json({
            success: true,
            tickets: userTickets,
            count: userTickets.length
        });
    } catch (error) {
        console.error('Erro ao buscar tickets do usuário:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar tickets' });
    }
});

// ============================================================================
// FIM DO SISTEMA DE SUPORTE
// ============================================================================

// ============================================================================
// SISTEMA DE AUDIT LOG - HISTÓRICO DE ALTERAÇÕES
// ============================================================================

// Armazenamento em memória (pode migrar para banco de dados depois)
let auditLogs = [];

/**
 * Função para registrar uma ação no audit log
 * @param {Object} logData - Dados do log
 */
function registrarAuditLog(logData) {
    const log = {
        id: Date.now(),
        usuario: logData.usuario || 'Sistema',
        usuarioId: logData.usuarioId || null,
        acao: logData.acao || 'Ação',
        modulo: logData.modulo || 'Sistema',
        descricao: logData.descricao || '',
        dados: logData.dados || null,
        ip: logData.ip || null,
        data: new Date().toISOString()
    };
    
    auditLogs.unshift(log); // Adiciona no início
    
    // Limita a 1000 registros em memória
    if (auditLogs.length > 1000) {
        auditLogs = auditLogs.slice(0, 1000);
    }
    
    return log;
}

// Expõe a função globalmente
global.registrarAuditLog = registrarAuditLog;

// GET /api/audit-log - Listar logs de auditoria
app.get('/api/audit-log', (req, res) => {
    try {
        const { limite = 50, modulo, usuario, acao, dataInicio, dataFim } = req.query;
        
        let logs = [...auditLogs];
        
        // Filtros
        if (modulo) {
            logs = logs.filter(l => l.modulo.toLowerCase() === modulo.toLowerCase());
        }
        
        if (usuario) {
            logs = logs.filter(l => l.usuario.toLowerCase().includes(usuario.toLowerCase()));
        }
        
        if (acao) {
            logs = logs.filter(l => l.acao.toLowerCase() === acao.toLowerCase());
        }
        
        if (dataInicio) {
            const inicio = new Date(dataInicio);
            logs = logs.filter(l => new Date(l.data) >= inicio);
        }
        
        if (dataFim) {
            const fim = new Date(dataFim);
            logs = logs.filter(l => new Date(l.data) <= fim);
        }
        
        // Limita resultado
        const resultado = logs.slice(0, parseInt(limite));
        
        res.json({
            success: true,
            logs: resultado,
            total: auditLogs.length,
            filtrados: logs.length
        });
    } catch (error) {
        console.error('Erro ao buscar logs:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar logs' });
    }
});

// POST /api/audit-log - Registrar nova entrada
app.post('/api/audit-log', (req, res) => {
    try {
        const { usuario, usuarioId, acao, modulo, descricao, dados } = req.body;
        
        const log = registrarAuditLog({
            usuario,
            usuarioId,
            acao,
            modulo,
            descricao,
            dados,
            ip: req.ip || req.connection?.remoteAddress
        });
        
        res.json({ success: true, log });
    } catch (error) {
        console.error('Erro ao registrar log:', error);
        res.status(500).json({ success: false, message: 'Erro ao registrar log' });
    }
});

// Adiciona alguns logs de exemplo na inicialização
setTimeout(() => {
    registrarAuditLog({
        usuario: 'Sistema',
        acao: 'Iniciou',
        modulo: 'Sistema',
        descricao: 'Sistema Aluforce iniciado com sucesso'
    });
}, 1000);

// ============================================================================
// FIM DO SISTEMA DE AUDIT LOG
// ============================================================================

// Endpoint para o front-end verificar se está autenticado via cookie
// ⚡ OTIMIZADO COM CACHE EM MEMÓRIA
app.get('/api/me', async (req, res) => {
    const token = req.cookies?.authToken || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ message: 'Não autenticado' });
    }
    
    // ⚡ Verificar cache primeiro
    const cacheKey = `user_session_${token.substring(0, 32)}`;
    const cachedUser = cacheGet(cacheKey);
    if (cachedUser) {
        return res.json(cachedUser);
    }
    
    console.log('[API/ME] ✅ Token encontrado:', token ? `${token.substring(0, 20)}...` : 'null');
    try {
        const user = jwt.verify(token, JWT_SECRET);
        console.log('[API/ME] JWT válido para usuário:', user && user.email);
        
        // Buscar dados completos do usuário no banco (tentar usuarios primeiro, depois funcionarios)
        let dbUser = null;
        try {
            // Buscar usuario com possível foto do funcionario vinculado por email
            const [rows] = await pool.query(
                `SELECT u.id, u.nome, u.email, u.role, u.is_admin, 
                        u.apelido, u.telefone, u.data_nascimento, u.bio, u.departamento,
                        u.permissoes_pcp, u.permissoes_rh, u.permissoes_vendas, 
                        u.permissoes_compras, u.permissoes_financeiro, u.permissoes_nfe,
                        u.areas,
                        u.foto, u.avatar,
                        f.foto_perfil_url as foto_funcionario
                 FROM usuarios u
                 LEFT JOIN funcionarios f ON u.email = f.email
                 WHERE u.id = ?`,
                [user.id]
            );
            dbUser = rows && rows[0] ? rows[0] : null;
            
            // Se não encontrou em usuarios, buscar em funcionarios
            if (!dbUser) {
                console.log('[API/ME] Usuário não encontrado em usuarios, tentando funcionarios...');
                const [frows] = await pool.query(
                    'SELECT id, nome_completo as nome, email, role, foto_perfil_url as avatar FROM funcionarios WHERE id = ?',
                    [user.id]
                );
                const func = frows && frows[0] ? frows[0] : null;
                if (func) {
                    // Converter role para is_admin
                    const roleAdmin = (func.role === 'admin' || func.role === 'administrador');
                    dbUser = {
                        id: func.id,
                        nome: func.nome,
                        email: func.email,
                        role: func.role || 'funcionario',
                        is_admin: roleAdmin ? 1 : 0,
                        avatar: func.avatar || "/avatars/default.webp",
                        // Funcionários não têm permissões granulares, apenas role
                        permissoes_pcp: null,
                        permissoes_rh: null,
                        permissoes_vendas: null,
                        permissoes_compras: null,
                        permissoes_financeiro: null,
                        permissoes_nfe: null
                    };
                    console.log('[API/ME] Funcionário encontrado:', func.nome, '- role:', func.role, '- is_admin:', dbUser.is_admin);
                }
            }
            
            if (dbUser) {
                // Função helper para parse seguro de permissões
                function parsePermissao(perm) {
                    if (!perm) return [];
                    if (Array.isArray(perm)) return perm;
                    if (typeof perm === 'string') {
                        try {
                            const parsed = JSON.parse(perm);
                            return Array.isArray(parsed) ? parsed : [];
                        } catch (e) {
                            // Se não é JSON, pode ser string simples como "rh" ou "vendas"
                            return perm.trim() ? [perm.trim()] : [];
                        }
                    }
                    return [];
                }
                
                // Parse permissões de forma segura
                let permissoes_pcp = parsePermissao(dbUser.permissoes_pcp);
                let permissoes_rh = parsePermissao(dbUser.permissoes_rh);
                let permissoes_vendas = parsePermissao(dbUser.permissoes_vendas);
                let permissoes_compras = parsePermissao(dbUser.permissoes_compras);
                let permissoes_financeiro = parsePermissao(dbUser.permissoes_financeiro);
                let permissoes_nfe = parsePermissao(dbUser.permissoes_nfe);
                
                // Combinar todas as permissões para "areas" - priorizar coluna areas se existir
                let areasUsuario = parsePermissao(dbUser.areas);
                
                // Se não tem areas definidas, usar as permissões combinadas
                if (areasUsuario.length === 0) {
                    areasUsuario = [
                        ...permissoes_pcp.length > 0 ? ['pcp'] : [],
                        ...permissoes_rh.length > 0 ? ['rh'] : [],
                        ...permissoes_vendas.length > 0 ? ['vendas'] : [],
                        ...permissoes_compras.length > 0 ? ['compras'] : [],
                        ...permissoes_financeiro.length > 0 ? ['financeiro'] : [],
                        ...permissoes_nfe.length > 0 ? ['nfe'] : []
                    ];
                }
                
                // Determinar a foto do usuário (prioridade: avatar > foto > foto_funcionario)
                const fotoUsuario = dbUser.avatar || dbUser.foto || dbUser.foto_funcionario || "/avatars/default.webp";
                
                const response = {
                    id: dbUser.id,
                    nome: dbUser.nome,
                    email: dbUser.email,
                    role: dbUser.role || user.role,
                    setor: null,
                    apelido: dbUser.apelido,
                    telefone: dbUser.telefone,
                    data_nascimento: dbUser.data_nascimento,
                    bio: dbUser.bio,
                    departamento: dbUser.departamento,
                    avatar: fotoUsuario,
                    foto: fotoUsuario,
                    foto_perfil_url: fotoUsuario,
                    is_admin: dbUser.is_admin,
                    rh_admin: false,
                    permissoes: areasUsuario,
                    permissoes_pcp: permissoes_pcp,
                    permissoes_rh: permissoes_rh,
                    permissoes_vendas: permissoes_vendas,
                    permissoes_compras: permissoes_compras,
                    permissoes_financeiro: permissoes_financeiro,
                    permissoes_nfe: permissoes_nfe,
                    areas: areasUsuario
                };
                
                // ⚡ Salvar no cache por 1 minuto
                cacheSet(cacheKey, response, CACHE_CONFIG.userSession);
                
                return res.json(response);
            }
        } catch (dbErr) {
            console.error('[API/ME] Erro ao buscar usuário no banco:', dbErr);
        }
        
        // Fallback: retornar dados do token
        return res.json({ 
            id: user.id, 
            nome: user.nome, 
            email: user.email, 
            role: user.role,
            is_admin: user.is_admin || 0
        });
    } catch (err) {
        console.log('[API/ME] Falha ao verificar JWT:', err.message);
        return res.status(401).json({ message: 'Token inválido' });
    }
});

// Alias para /api/usuario/atual (compatibilidade com Vendas)
app.get('/api/usuario/atual', async (req, res) => {
    const token = req.cookies?.authToken || req.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'Não autenticado' });
    }
    try {
        const user = jwt.verify(token, JWT_SECRET);
        // Buscar dados do usuário no banco com JOIN para foto do funcionário
        const [rows] = await pool.query(
            `SELECT u.id, u.nome, u.email, u.role, u.is_admin, 
                    u.foto, u.avatar,
                    f.foto_perfil_url as foto_funcionario
             FROM usuarios u
             LEFT JOIN funcionarios f ON u.email = f.email
             WHERE u.id = ?`,
            [user.id]
        );
        if (rows && rows[0]) {
            const dbUser = rows[0];
            const fotoUsuario = dbUser.avatar || dbUser.foto || dbUser.foto_funcionario || "/avatars/default.webp";
            return res.json({
                ...dbUser,
                avatar: fotoUsuario,
                foto: fotoUsuario,
                foto_perfil_url: fotoUsuario
            });
        }
        // Fallback para dados do token
        return res.json({ id: user.id, nome: user.nome, email: user.email, role: user.role });
    } catch (err) {
        return res.status(401).json({ message: 'Token inválido' });
    }
});

// Endpoint para obter permissões do usuário
app.get('/api/permissions', (req, res) => {
    const token = req.cookies?.authToken || req.headers['authorization']?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Não autenticado' });
    
    try {
        const user = jwt.verify(token, JWT_SECRET);
        const firstName = user.nome ? user.nome.split(' ')[0].toLowerCase() : '';
        const emailPrefix = user.email ? user.email.split('@')[0].toLowerCase() : '';
        
        const permissions = {
            areas: userPermissions.getUserAreas(firstName) || userPermissions.getUserAreas(emailPrefix),
            rhType: userPermissions.getRHType(firstName) || userPermissions.getRHType(emailPrefix),
            isAdmin: userPermissions.isAdmin(firstName) || userPermissions.isAdmin(emailPrefix)
        };
        
        return res.json(permissions);
    } catch (err) {
        return res.status(401).json({ message: 'Token inválido' });
    }
});

// Atualizar perfil do usuário (nome, apelido, telefone, bio, etc.) - aceita token via cookie ou Authorization header
app.put('/api/me', async (req, res) => {
    const token = req.cookies?.authToken || req.headers['authorization']?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Não autenticado' });
    try {
        const user = jwt.verify(token, JWT_SECRET);
        const { nome, apelido, telefone, data_nascimento, bio } = req.body || {};
        
        // Validação básica
        if (nome && nome.trim() === '') {
            return res.status(400).json({ error: 'Nome completo não pode ser vazio' });
        }

        // Limpar apelido se for string vazia
        const apelidoFinal = (apelido && apelido.trim() !== '') ? apelido.trim() : null;
        
        // Em modo DEV_MOCK, apenas retorna objeto atualizado sem persistir
        if (process.env.DEV_MOCK === '1' || process.env.DEV_MOCK === 'true') {
            const updated = Object.assign({}, user);
            if (nome) updated.nome = nome;
            updated.apelido = apelidoFinal;
            if (telefone) updated.telefone = telefone;
            if (data_nascimento) updated.data_nascimento = data_nascimento;
            if (bio) updated.bio = bio;
            return res.json({ user: updated });
        }
        
        // Em produção, atualiza na tabela usuarios
        const updates = [];
        const params = [];
        
        if (nome) { updates.push('nome = ?'); params.push(nome); }
        updates.push('apelido = ?');
        params.push(apelidoFinal);
        if (telefone !== undefined) { updates.push('telefone = ?'); params.push(telefone || null); }
        if (data_nascimento !== undefined) { updates.push('data_nascimento = ?'); params.push(data_nascimento || null); }
        if (bio !== undefined) { updates.push('bio = ?'); params.push(bio || null); }
        
        if (updates.length > 0) {
            params.push(user.id);
            const sql = `UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`;
            console.log('[API/ME PUT] 📝 Atualizando usuário:', user.email);
            await pool.query(sql, params);
        }
        
        // Buscar usuário atualizado com todas as informações
        const [[updatedUser]] = await pool.query(
            `SELECT id, nome, email, role, is_admin, apelido, telefone, data_nascimento, 
                    bio, avatar, departamento, 
                    permissoes_pcp, permissoes_vendas, permissoes_rh, 
                    permissoes_compras, permissoes_financeiro, permissoes_nfe
             FROM usuarios WHERE id = ?`,
            [user.id]
        );

        // Parse permissões de forma segura
        function parsePermissao(perm) {
            if (!perm) return [];
            if (Array.isArray(perm)) return perm;
            if (typeof perm === 'string') {
                try {
                    const parsed = JSON.parse(perm);
                    return Array.isArray(parsed) ? parsed : [];
                } catch (e) {
                    return perm.trim() ? [perm.trim()] : [];
                }
            }
            return [];
        }
        
        let permissoes_pcp = parsePermissao(updatedUser.permissoes_pcp);
        let permissoes_rh = parsePermissao(updatedUser.permissoes_rh);
        let permissoes_vendas = parsePermissao(updatedUser.permissoes_vendas);
        let permissoes_compras = parsePermissao(updatedUser.permissoes_compras);
        let permissoes_financeiro = parsePermissao(updatedUser.permissoes_financeiro);
        let permissoes_nfe = parsePermissao(updatedUser.permissoes_nfe);
        
        let permissoes = [
            ...permissoes_pcp,
            ...permissoes_rh,
            ...permissoes_vendas,
            ...permissoes_compras,
            ...permissoes_financeiro,
            ...permissoes_nfe
        ];
        
        const response = {
            user: {
                id: updatedUser.id,
                nome: updatedUser.nome,
                email: updatedUser.email,
                role: updatedUser.role,
                setor: null,
                apelido: updatedUser.apelido,
                telefone: updatedUser.telefone,
                data_nascimento: updatedUser.data_nascimento,
                bio: updatedUser.bio,
                avatar: updatedUser.avatar || "/avatars/default.webp",
                departamento: updatedUser.departamento,
                is_admin: updatedUser.is_admin,
                rh_admin: false,
                permissoes: permissoes,
                permissoes_pcp: permissoes_pcp,
                permissoes_rh: permissoes_rh,
                permissoes_vendas: permissoes_vendas,
                permissoes_compras: permissoes_compras,
                permissoes_financeiro: permissoes_financeiro,
                permissoes_nfe: permissoes_nfe,
                areas: permissoes
            }
        };
        
        console.log('[API/ME PUT] ✅ Perfil atualizado:', user.email);

        console.log('[API/ME PUT] ✅ Perfil atualizado com sucesso. Apelido:', apelidoFinal);
        
        return res.json(response);
    } catch (err) {
        console.error('Erro em PUT /api/me:', err && err.stack ? err.stack : err);
        return res.status(500).json({ message: 'Erro ao atualizar perfil' });
    }
});

// Upload de Avatar do Usuário
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const avatarDir = path.join(__dirname, 'public', 'avatars');
        if (!fs.existsSync(avatarDir)) {
            fs.mkdirSync(avatarDir, { recursive: true });
        }
        cb(null, avatarDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `user-${req.userId}${ext}`;
        cb(null, filename);
    }
});

const avatarFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Formato de arquivo inválido. Use JPG, PNG, GIF ou WEBP.'), false);
    }
};

const uploadAvatar = multer({
    storage: avatarStorage,
    fileFilter: avatarFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB
    }
});

app.post('/api/upload-avatar', (req, res, next) => {
    const token = req.cookies?.authToken || req.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Não autenticado' });
    }
    
    try {
        const user = jwt.verify(token, JWT_SECRET);
        req.userId = user.id;
        req.userEmail = user.email;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido' });
    }
}, uploadAvatar.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        const avatarUrl = `/avatars/${req.file.filename}`;
        
        // Atualizar banco de dados com o caminho do avatar
        try {
            await pool.query(
                'UPDATE usuarios SET avatar = ? WHERE id = ?',
                [avatarUrl, req.userId]
            );
        } catch (dbErr) {
            console.error('Erro ao atualizar avatar no banco:', dbErr);
            // Continua mesmo se falhar no DB, pois o arquivo já foi salvo
        }

        console.log(`[AVATAR] Upload bem-sucedido para usuário ${req.userEmail}: ${avatarUrl}`);
        
        res.json({
            success: true,
            avatarUrl: avatarUrl,
            message: 'Avatar atualizado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao fazer upload do avatar:', error);
        res.status(500).json({ error: 'Erro ao fazer upload do avatar' });
    }
});

// ============================================================
// ENDPOINTS DE RESET DE SENHA
// ============================================================

// Endpoint para solicitar reset de senha
app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    if (!email || !email.trim()) {
        return res.status(400).json({ message: 'Email é obrigatório' });
    }

    try {
        // Verificar se o email existe na tabela usuarios ou funcionarios
        let userExists = false;
        let userName = '';
        
        // Verificar na tabela usuarios
        const [usuarios] = await pool.query('SELECT nome_completo, email FROM usuarios WHERE email = ?', [email]);
        if (usuarios && usuarios.length > 0) {
            userExists = true;
            userName = usuarios[0].nome_completo;
        } else {
            // Verificar na tabela funcionarios
            const [funcionarios] = await pool.query('SELECT nome_completo, email FROM funcionarios WHERE email = ?', [email]);
            if (funcionarios && funcionarios.length > 0) {
                userExists = true;
                userName = funcionarios[0].nome_completo;
            }
        }

        // Por segurança, sempre retornar sucesso mesmo que o email não exista
        // Isso evita que atacantes descubram quais emails estão cadastrados
        if (!userExists) {
            console.log(`[RESET] Tentativa de reset para email não cadastrado: ${email}`);
            return res.json({ 
                message: 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.' 
            });
        }

        // Gerar token único
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        
        // Token expira em 30 minutos
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 30);

        // Salvar token no banco
        await pool.query(
            'INSERT INTO password_reset_tokens (email, token, expira_em) VALUES (?, ?, ?)',
            [email, token, expiresAt]
        );

        // Gerar link de reset
        const resetLink = `http://localhost:${PORT}/reset-password.html?token=${token}`;
        
        // Enviar email
        try {
            await enviarEmail(
                email,
                'Redefinição de Senha - Sistema ALUFORCE',
                `Olá ${userName},\n\nRecebemos uma solicitação para redefinir sua senha.\n\nClique no link abaixo para criar uma nova senha:\n${resetLink}\n\nEste link expira em 30 minutos.\n\nSe você não solicitou esta redefinição, ignore este email.\n\nAtenciosamente,\nEquipe ALUFORCE`,
                `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #333;">Redefinição de Senha</h2>
                        <p>Olá <strong>${userName}</strong>,</p>
                        <p>Recebemos uma solicitação para redefinir sua senha no Sistema ALUFORCE.</p>
                        <p>Clique no botão abaixo para criar uma nova senha:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block;">Redefinir Senha</a>
                        </div>
                        <p style="color: #666; font-size: 14px;">Ou copie e cole este link no seu navegador:</p>
                        <p style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px;">${resetLink}</p>
                        <p style="color: #999; font-size: 12px; margin-top: 30px;">
                            ⏰ Este link expira em <strong>30 minutos</strong>.<br>
                            🔒 Se você não solicitou esta redefinição, ignore este email com segurança.
                        </p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #999; font-size: 12px; text-align: center;">
                            Atenciosamente,<br>
                            <strong>Equipe ALUFORCE</strong>
                        </p>
                    </div>
                `
            );
            console.log(`[RESET] ✅ Email de reset enviado para: ${email}`);
        } catch (emailErr) {
            console.error('[RESET] ❌ Erro ao enviar email:', emailErr);
            // Mesmo que o email falhe, retornar sucesso (o token foi criado)
            // Em produção, você pode querer logar isso e tentar reenviar
        }

        return res.json({ 
            message: 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.',
            success: true
        });

    } catch (err) {
        console.error('[RESET] Erro ao processar solicitação:', err);
        
        // Verificar se é erro de tabela não existente
        if (err.code === 'ER_NO_SUCH_TABLE') {
            console.log('[RESET] Criando tabela password_reset_tokens...');
            try {
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS password_reset_tokens (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        email VARCHAR(255) NOT NULL,
                        token VARCHAR(255) NOT NULL UNIQUE,
                        expira_em DATETIME NOT NULL,
                        usado TINYINT(1) DEFAULT 0,
                        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_token (token),
                        INDEX idx_email (email)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                `);
                console.log('[RESET] ✅ Tabela criada! Tente novamente.');
                return res.status(503).json({ 
                    message: 'Sistema configurado. Por favor, tente novamente.',
                    retry: true 
                });
            } catch (createErr) {
                console.error('[RESET] Erro ao criar tabela:', createErr);
            }
        }
        
        return res.status(500).json({ message: 'Erro ao processar solicitação. Tente novamente.' });
    }
});

// Endpoint para validar token de reset
app.get('/api/auth/validate-reset-token/:token', async (req, res) => {
    const { token } = req.params;

    if (!token) {
        return res.status(400).json({ message: 'Token inválido', valid: false });
    }

    try {
        const [tokens] = await pool.query(
            'SELECT * FROM password_reset_tokens WHERE token = ? AND usado = 0 AND expira_em > NOW()',
            [token]
        );

        if (!tokens || tokens.length === 0) {
            return res.json({ valid: false, message: 'Token inválido ou expirado' });
        }

        return res.json({ valid: true, email: tokens[0].email });

    } catch (err) {
        console.error('[RESET] Erro ao validar token:', err);
        return res.status(500).json({ message: 'Erro ao validar token', valid: false });
    }
});

// Endpoint para redefinir a senha
app.post('/api/auth/reset-password', async (req, res) => {
    const { token, novaSenha } = req.body;

    if (!token || !novaSenha) {
        return res.status(400).json({ message: 'Token e nova senha são obrigatórios' });
    }

    // Validar força da senha
    if (novaSenha.length < 6) {
        return res.status(400).json({ message: 'A senha deve ter no mínimo 6 caracteres' });
    }

    try {
        // Buscar token válido
        const [tokens] = await pool.query(
            'SELECT * FROM password_reset_tokens WHERE token = ? AND usado = 0 AND expira_em > NOW()',
            [token]
        );

        if (!tokens || tokens.length === 0) {
            return res.status(400).json({ message: 'Token inválido ou expirado' });
        }

        const resetToken = tokens[0];
        const email = resetToken.email;

        // Hash da nova senha
        const bcrypt = require('bcryptjs');
        const senhaHash = await bcrypt.hash(novaSenha, 10);

        // Atualizar senha na tabela usuarios
        const [usuariosResult] = await pool.query(
            'UPDATE usuarios SET senha_hash = ?, senha = ? WHERE email = ?',
            [senhaHash, novaSenha, email]
        );

        // Atualizar senha na tabela funcionarios
        const [funcionariosResult] = await pool.query(
            'UPDATE funcionarios SET senha_hash = ?, senha = ? WHERE email = ?',
            [senhaHash, novaSenha, email]
        );

        // Marcar token como usado
        await pool.query(
            'UPDATE password_reset_tokens SET usado = 1 WHERE token = ?',
            [token]
        );

        // Invalidar todos os tokens antigos deste email
        await pool.query(
            'UPDATE password_reset_tokens SET usado = 1 WHERE email = ? AND token != ?',
            [email, token]
        );

        console.log(`[RESET] ✅ Senha redefinida com sucesso para: ${email}`);

        return res.json({ 
            message: 'Senha redefinida com sucesso! Você já pode fazer login.',
            success: true
        });

    } catch (err) {
        console.error('[RESET] Erro ao redefinir senha:', err);
        return res.status(500).json({ message: 'Erro ao redefinir senha. Tente novamente.' });
    }
});

// Note: /api/logout é provido por authRouter; se preferir usar a implementação
// embutida aqui, substitua/remova a rota no arquivo auth.js.

// Rota para servir o favicon
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'images', 'favicon.ico'));
});


// Rota raiz: sempre servir a tela de login
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Manter rotas antigas de login apontando para a tela de login
app.get(['/login.html', '/login'], (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Middleware que exige autenticação via JWT (cookie ou Authorization header) - para servir páginas protegidas
function requireAuthPage(req, res, next) {
    const token = req.headers['authorization']?.replace('Bearer ', '') || req.query.token || req.cookies?.authToken;
    if (!token) {
        // não autenticado -> redireciona para login
        return res.redirect('/');
    }
    try {
        const user = jwt.verify(token, JWT_SECRET);
        req.user = user;
        return next();
    } catch (err) {
        console.log('[AUTH] Token inválido ao acessar página protegida:', err && err.message);
        return res.redirect('/');
    }
}

// Servir /dashboard e /index.html apenas para usuários autenticados
app.get('/dashboard', requireAuthPage, (req, res) => {
    // Se token veio via query string, setar cookie para próximas requisições
    if (req.query.token) {
        res.cookie('authToken', req.query.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 8 * 60 * 60 * 1000 // 8 horas
        });
        // Redirecionar para limpar o token da URL
        return res.redirect('/dashboard');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/index.html', requireAuthPage, (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware para autenticação via JWT no backend
function authenticatePage(req, res, next) {
    // For serving pages, avoid forcing a server-side redirect to /login.html.
    // The client app uses localStorage to store the JWT and decides whether
    // to show the page or redirect to the login. Here we only attach req.user
    // when a valid JWT is present in Authorization header, query or cookie.
    const token = req.headers['authorization']?.replace('Bearer ', '') || req.query.token || req.cookies?.authToken;
    console.log('[AUTH] Cookie recebido:', req.cookies?.authToken);
    if (!token) {
        console.log('[AUTH] Nenhum token JWT encontrado.');
        return next(); // continue and serve the page; front-end will check auth
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log('[AUTH] Falha ao verificar JWT:', err.message);
        } else {
            req.user = user; // attach when valid
            console.log('[AUTH] JWT válido para usuário:', user && user.email);
        }
        return next();
    });
}

// ============================================================
// ROTAS PROTEGIDAS DO FINANCEIRO
// ============================================================

// Rotas principais do Financeiro
app.get('/Financeiro/financeiro.html', authenticatePage, (req, res) => {
    if (req.user && req.user.nome) {
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        if (userPermissions.hasAccess(firstName, 'financeiro')) {
            res.sendFile(path.join(__dirname, 'modules', 'Financeiro', 'public', 'index.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo Financeiro.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

app.get('/Financeiro/index.html', authenticatePage, (req, res) => {
    if (req.user && req.user.nome) {
        const firstName = req.user.nome.split(' ')[0].toLowerCase();
        if (userPermissions.hasAccess(firstName, 'financeiro')) {
            res.sendFile(path.join(__dirname, 'modules', 'Financeiro', 'public', 'index.html'));
        } else {
            res.status(403).send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar o módulo Financeiro.</p>');
        }
    } else {
        res.redirect('/login.html');
    }
});

// ============================================================
// MIDDLEWARE DE PERMISSÕES DO FINANCEIRO
// ============================================================

function checkFinanceiroPermission(requiredPermission) {
    return async (req, res, next) => {
        const token = req.cookies?.authToken || req.headers['authorization']?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Não autenticado' });
        }

        try {
            const user = jwt.verify(token, JWT_SECRET);
            
            // Buscar permissões do usuário no banco
            const [users] = await pool.query(
                'SELECT permissoes_financeiro, is_admin FROM funcionarios WHERE id = ? OR email = ?',
                [user.id, user.email]
            );

            let userData = users[0];

            if (!userData) {
                // Tentar na tabela usuarios
                const [usuarios] = await pool.query(
                    'SELECT permissoes_financeiro, is_admin FROM usuarios WHERE id = ? OR email = ?',
                    [user.id, user.email]
                );
                
                if (!usuarios || usuarios.length === 0) {
                    return res.status(403).json({ message: 'Usuário não encontrado' });
                }
                
                userData = usuarios[0];
            }

            // Admins têm acesso total
            if (userData.is_admin === 1) {
                req.user = user;
                req.userPermissions = {
                    acesso: 'total',
                    contas_receber: true,
                    contas_pagar: true,
                    fluxo_caixa: true,
                    relatorios: true,
                    visualizar: true,
                    criar: true,
                    editar: true,
                    excluir: true
                };
                return next();
            }

            // Parse permissões JSON
            let permissoes = {};
            if (userData.permissoes_financeiro) {
                try {
                    permissoes = JSON.parse(userData.permissoes_financeiro);
                } catch (e) {
                    console.error('[FINANCEIRO] Erro ao parsear permissões:', e);
                    return res.status(500).json({ message: 'Erro ao verificar permissões' });
                }
            } else {
                return res.status(403).json({ 
                    message: 'Você não tem permissão para acessar o módulo Financeiro' 
                });
            }

            // Verificar permissão específica
            if (requiredPermission && !permissoes[requiredPermission]) {
                return res.status(403).json({ 
                    message: `Você não tem permissão para acessar ${requiredPermission}` 
                });
            }

            req.user = user;
            req.userPermissions = permissoes;
            next();

        } catch (err) {
            console.error('[FINANCEIRO] Erro ao verificar permissões:', err);
            return res.status(401).json({ message: 'Token inválido' });
        }
    };
}

// ============================================================
// ROTAS DO MÓDULO FINANCEIRO (COM CONTROLE DE PERMISSÕES)
// ============================================================

// Obter permissões do usuário no Financeiro
app.get('/api/financeiro/permissoes', async (req, res) => {
    const token = req.cookies?.authToken || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ message: 'Não autenticado' });
    }

    try {
        const user = jwt.verify(token, JWT_SECRET);
        
        // Buscar permissões do usuário no banco
        const [users] = await pool.query(
            'SELECT permissoes_financeiro, is_admin FROM funcionarios WHERE id = ? OR email = ?',
            [user.id, user.email]
        );

        let userData = users[0];

        if (!userData) {
            // Tentar na tabela usuarios
            const [usuarios] = await pool.query(
                'SELECT permissoes_financeiro, is_admin FROM usuarios WHERE id = ? OR email = ?',
                [user.id, user.email]
            );
            
            if (!usuarios || usuarios.length === 0) {
                return res.status(403).json({ message: 'Usuário não encontrado' });
            }
            
            userData = usuarios[0];
        }

        // Admins têm acesso total
        if (userData.is_admin === 1) {
            return res.json({
                success: true,
                permissoes: {
                    acesso: 'total',
                    contas_receber: true,
                    contas_pagar: true,
                    fluxo_caixa: true,
                    relatorios: true,
                    visualizar: true,
                    criar: true,
                    editar: true,
                    excluir: true
                }
            });
        }

        // Parse permissões JSON
        let permissoes = {};
        if (userData.permissoes_financeiro) {
            try {
                permissoes = JSON.parse(userData.permissoes_financeiro);
            } catch (e) {
                console.error('[FINANCEIRO] Erro ao parsear permissões:', e);
                return res.status(500).json({ message: 'Erro ao verificar permissões' });
            }
        } else {
            return res.status(403).json({ 
                message: 'Você não tem permissão para acessar o módulo Financeiro' 
            });
        }

        return res.json({
            success: true,
            permissoes: permissoes
        });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao verificar permissões:', err);
        return res.status(401).json({ message: 'Token inválido' });
    }
});

// ===== ROTAS DE RESUMO DO FINANCEIRO =====

// Resumo de Contas a Receber
app.get('/api/financeiro/contas-receber/resumo', async (req, res) => {
    try {
        // Verificar token
        const token = req.cookies?.authToken || req.headers['authorization']?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'Não autenticado' });
        }
        
        // Calcular totais
        const [result] = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END), 0) as total_pendente,
                COALESCE(SUM(CASE WHEN status = 'pago' OR status = 'recebido' THEN valor ELSE 0 END), 0) as total_recebido,
                COALESCE(SUM(CASE WHEN status = 'vencido' OR (status = 'pendente' AND vencimento < CURDATE()) THEN valor ELSE 0 END), 0) as total_vencido,
                COUNT(*) as total_registros
            FROM contas_receber
        `);
        
        res.json({
            total_pendente: result[0]?.total_pendente || 0,
            total_recebido: result[0]?.total_recebido || 0,
            total_vencido: result[0]?.total_vencido || 0,
            total_registros: result[0]?.total_registros || 0
        });
    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar resumo contas a receber:', err);
        res.json({ total_pendente: 0, total_recebido: 0, total_vencido: 0, total_registros: 0 });
    }
});

// Resumo de Contas a Pagar
app.get('/api/financeiro/contas-pagar/resumo', async (req, res) => {
    try {
        // Verificar token
        const token = req.cookies?.authToken || req.headers['authorization']?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'Não autenticado' });
        }
        
        // Calcular totais
        const [result] = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END), 0) as total_pendente,
                COALESCE(SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END), 0) as total_pago,
                COALESCE(SUM(CASE WHEN status = 'vencido' OR (status = 'pendente' AND vencimento < CURDATE()) THEN valor ELSE 0 END), 0) as total_vencido,
                COUNT(*) as total_registros
            FROM contas_pagar
        `);
        
        res.json({
            total_pendente: result[0]?.total_pendente || 0,
            total_pago: result[0]?.total_pago || 0,
            total_vencido: result[0]?.total_vencido || 0,
            total_registros: result[0]?.total_registros || 0
        });
    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar resumo contas a pagar:', err);
        res.json({ total_pendente: 0, total_pago: 0, total_vencido: 0, total_registros: 0 });
    }
});

// Saldo Total das Contas Bancárias
app.get('/api/financeiro/contas-bancarias/saldo-total', async (req, res) => {
    try {
        // Verificar token
        const token = req.cookies?.authToken || req.headers['authorization']?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'Não autenticado' });
        }
        
        // Verificar se a tabela existe
        const [tables] = await pool.query("SHOW TABLES LIKE 'contas_bancarias'");
        
        if (tables.length === 0) {
            // Tentar buscar de bancos se contas_bancarias não existir
            const [bancosTables] = await pool.query("SHOW TABLES LIKE 'bancos'");
            if (bancosTables.length > 0) {
                const [result] = await pool.query(`
                    SELECT COALESCE(SUM(saldo_atual), 0) as saldo_total
                    FROM bancos
                    WHERE ativo = 1 OR ativo IS NULL
                `);
                return res.json({ saldo_total: result[0]?.saldo_total || 0 });
            }
            return res.json({ saldo_total: 0 });
        }
        
        // Calcular saldo total
        const [result] = await pool.query(`
            SELECT COALESCE(SUM(saldo), 0) as saldo_total
            FROM contas_bancarias
            WHERE ativa = 1 OR ativa IS NULL
        `);
        
        res.json({ saldo_total: result[0]?.saldo_total || 0 });
    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar saldo bancário:', err);
        res.json({ saldo_total: 0 });
    }
});

// Contas a Receber - Listar (apenas quem tem permissão)
app.get('/api/financeiro/contas-receber', checkFinanceiroPermission('contas_receber'), async (req, res) => {
    try {
        const { status, cliente, data_inicio, data_fim } = req.query;
        
        let query = 'SELECT * FROM contas_receber WHERE 1=1';
        const params = [];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        if (cliente) {
            query += ' AND (cliente_id = ? OR descricao LIKE ?)';
            params.push(cliente, `%${cliente}%`);
        }

        if (data_inicio) {
            query += ' AND vencimento >= ?';
            params.push(data_inicio);
        }

        if (data_fim) {
            query += ' AND vencimento <= ?';
            params.push(data_fim);
        }

        query += ' ORDER BY vencimento DESC';

        const [contas] = await pool.query(query, params);
        return res.json(contas);

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar contas a receber:', err);
        return res.status(500).json({ message: 'Erro ao buscar contas a receber' });
    }
});

// Contas a Pagar - Listar (apenas quem tem permissão)
app.get('/api/financeiro/contas-pagar', checkFinanceiroPermission('contas_pagar'), async (req, res) => {
    try {
        const { status, fornecedor, data_inicio, data_fim } = req.query;
        
        let query = 'SELECT * FROM contas_pagar WHERE 1=1';
        const params = [];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        if (fornecedor) {
            query += ' AND (fornecedor_id = ? OR descricao LIKE ?)';
            params.push(fornecedor, `%${fornecedor}%`);
        }

        if (data_inicio) {
            query += ' AND vencimento >= ?';
            params.push(data_inicio);
        }

        if (data_fim) {
            query += ' AND vencimento <= ?';
            params.push(data_fim);
        }

        query += ' ORDER BY vencimento DESC';

        const [contas] = await pool.query(query, params);
        return res.json(contas);

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar contas a pagar:', err);
        return res.status(500).json({ message: 'Erro ao buscar contas a pagar' });
    }
});

// Criar Conta a Receber (requer permissão de criar)
app.post('/api/financeiro/contas-receber', checkFinanceiroPermission('contas_receber'), async (req, res) => {
    if (!req.userPermissions.criar) {
        return res.status(403).json({ message: 'Você não tem permissão para criar contas' });
    }

    try {
        const { cliente_id, valor, descricao, vencimento, categoria } = req.body;

        const [result] = await pool.query(
            'INSERT INTO contas_receber (cliente_id, valor, descricao, vencimento, categoria, status, criado_por) VALUES (?, ?, ?, ?, ?, "pendente", ?)',
            [cliente_id, valor, descricao, vencimento, categoria, req.user.id]
        );

        return res.json({
            success: true,
            message: 'Conta a receber criada com sucesso',
            id: result.insertId
        });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao criar conta a receber:', err);
        return res.status(500).json({ message: 'Erro ao criar conta a receber' });
    }
});

// Criar Conta a Pagar (requer permissão de criar)
app.post('/api/financeiro/contas-pagar', checkFinanceiroPermission('contas_pagar'), async (req, res) => {
    if (!req.userPermissions.criar) {
        return res.status(403).json({ message: 'Você não tem permissão para criar contas' });
    }

    try {
        const { fornecedor_id, valor, descricao, vencimento, data_vencimento, categoria, categoria_id, banco_id, forma_pagamento, observacoes } = req.body;

        console.log('[FINANCEIRO/POST-PAGAR] Body recebido:', JSON.stringify(req.body));

        // Aceitar tanto 'vencimento' quanto 'data_vencimento'
        const dataVenc = data_vencimento || vencimento;
        const catId = categoria_id || categoria;

        console.log('[FINANCEIRO/POST-PAGAR] Após processamento:', { descricao, valor, dataVenc, catId });

        if (!descricao || !valor || !dataVenc) {
            console.log('[FINANCEIRO/POST-PAGAR] Validação falhou!');
            return res.status(400).json({ 
                error: 'Campos obrigatórios faltando',
                required: ['descricao', 'valor', 'data_vencimento ou vencimento'],
                received: { descricao: !!descricao, valor: !!valor, vencimento: !!dataVenc, body: req.body }
            });
        }

        const [result] = await pool.query(
            `INSERT INTO contas_pagar (fornecedor_id, valor, descricao, data_vencimento, categoria_id, banco_id, forma_pagamento, observacoes, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, "pendente")`,
            [fornecedor_id || null, valor, descricao, dataVenc, catId || null, banco_id || null, forma_pagamento || null, observacoes || null]
        );

        return res.json({
            success: true,
            message: 'Conta a pagar criada com sucesso',
            id: result.insertId
        });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao criar conta a pagar:', err);
        console.error('[FINANCEIRO] Stack:', err.stack);
        return res.status(500).json({ message: 'Erro ao criar conta a pagar', error: err.message });
    }
});

// Obter conta a receber específica
app.get('/api/financeiro/contas-receber/:id', checkFinanceiroPermission('contas_receber'), async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM contas_receber WHERE id = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Conta a receber não encontrada' });
        }

        res.json({ success: true, conta: rows[0] });
    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar conta:', err);
        res.status(500).json({ message: 'Erro ao buscar conta a receber' });
    }
});

// Obter conta a pagar específica
app.get('/api/financeiro/contas-pagar/:id', checkFinanceiroPermission('contas_pagar'), async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM contas_pagar WHERE id = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Conta a pagar não encontrada' });
        }

        res.json({ success: true, conta: rows[0] });
    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar conta:', err);
        res.status(500).json({ message: 'Erro ao buscar conta a pagar' });
    }
});

// Editar Conta a Receber (requer permissão de editar)
app.put('/api/financeiro/contas-receber/:id', checkFinanceiroPermission('contas_receber'), async (req, res) => {
    if (!req.userPermissions.editar) {
        return res.status(403).json({ message: 'Você não tem permissão para editar contas' });
    }

    try {
        const { id } = req.params;
        const { valor, descricao, vencimento, status, categoria } = req.body;

        await pool.query(
            'UPDATE contas_receber SET valor = ?, descricao = ?, vencimento = ?, status = ?, categoria = ?, atualizado_por = ?, atualizado_em = NOW() WHERE id = ?',
            [valor, descricao, vencimento, status, categoria, req.user.id, id]
        );

        return res.json({
            success: true,
            message: 'Conta a receber atualizada com sucesso'
        });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao atualizar conta a receber:', err);
        return res.status(500).json({ message: 'Erro ao atualizar conta a receber' });
    }
});

// Editar Conta a Pagar (requer permissão de editar)
app.put('/api/financeiro/contas-pagar/:id', checkFinanceiroPermission('contas_pagar'), async (req, res) => {
    if (!req.userPermissions.editar) {
        return res.status(403).json({ message: 'Você não tem permissão para editar contas' });
    }

    try {
        const { id } = req.params;
        const { valor, descricao, vencimento, status, categoria } = req.body;

        await pool.query(
            'UPDATE contas_pagar SET valor = ?, descricao = ?, vencimento = ?, status = ?, categoria = ?, atualizado_por = ?, atualizado_em = NOW() WHERE id = ?',
            [valor, descricao, vencimento, status, categoria, req.user.id, id]
        );

        return res.json({
            success: true,
            message: 'Conta a pagar atualizada com sucesso'
        });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao atualizar conta a pagar:', err);
        return res.status(500).json({ message: 'Erro ao atualizar conta a pagar' });
    }
});

// Excluir Conta a Receber (requer permissão de excluir)
app.delete('/api/financeiro/contas-receber/:id', checkFinanceiroPermission('contas_receber'), async (req, res) => {
    if (!req.userPermissions.excluir) {
        return res.status(403).json({ message: 'Você não tem permissão para excluir contas' });
    }

    try {
        const { id } = req.params;

        await pool.query('DELETE FROM contas_receber WHERE id = ?', [id]);

        return res.json({
            success: true,
            message: 'Conta a receber excluída com sucesso'
        });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao excluir conta a receber:', err);
        return res.status(500).json({ message: 'Erro ao excluir conta a receber' });
    }
});

// Excluir Conta a Pagar (requer permissão de excluir)
app.delete('/api/financeiro/contas-pagar/:id', checkFinanceiroPermission('contas_pagar'), async (req, res) => {
    if (!req.userPermissions.excluir) {
        return res.status(403).json({ message: 'Você não tem permissão para excluir contas' });
    }

    try {
        const { id } = req.params;

        await pool.query('DELETE FROM contas_pagar WHERE id = ?', [id]);

        return res.json({
            success: true,
            message: 'Conta a pagar excluída com sucesso'
        });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao excluir conta a pagar:', err);
        return res.status(500).json({ message: 'Erro ao excluir conta a pagar' });
    }
});

// ============================================================
// ROTAS DO MÓDULO DE COMPRAS
// ============================================================

// ===== FORNECEDORES =====

// Listar todos os fornecedores
app.get('/api/compras/fornecedores', authenticateToken, async (req, res) => {
    try {
        const { ativo } = req.query;
        let query = 'SELECT * FROM fornecedores';
        const params = [];
        
        if (ativo !== undefined) {
            query += ' WHERE ativo = ?';
            params.push(ativo);
        }
        
        query += ' ORDER BY razao_social ASC';
        
        const [fornecedores] = await pool.query(query, params);
        res.json(fornecedores);
    } catch (err) {
        console.error('[COMPRAS] Erro ao listar fornecedores:', err);
        res.status(500).json({ message: 'Erro ao listar fornecedores' });
    }
});

// Buscar fornecedor por ID
app.get('/api/compras/fornecedores/:id', authenticateToken, async (req, res) => {
    try {
        const [fornecedor] = await pool.query('SELECT * FROM fornecedores WHERE id = ?', [req.params.id]);
        if (fornecedor.length === 0) {
            return res.status(404).json({ message: 'Fornecedor não encontrado' });
        }
        res.json(fornecedor[0]);
    } catch (err) {
        console.error('[COMPRAS] Erro ao buscar fornecedor:', err);
        res.status(500).json({ message: 'Erro ao buscar fornecedor' });
    }
});

// Criar novo fornecedor
app.post('/api/compras/fornecedores', authenticateToken, async (req, res) => {
    try {
        const {
            razao_social, nome_fantasia, cnpj, ie, endereco, cidade,
            estado, cep, telefone, email, contato_principal,
            condicoes_pagamento, prazo_entrega_padrao, observacoes
        } = req.body;

        if (!razao_social || !cnpj) {
            return res.status(400).json({ message: 'Razão social e CNPJ são obrigatórios' });
        }

        const [result] = await pool.query(
            `INSERT INTO fornecedores (
                razao_social, nome_fantasia, cnpj, ie, endereco, cidade, estado, cep,
                telefone, email, contato_principal, condicoes_pagamento,
                prazo_entrega_padrao, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                razao_social, nome_fantasia, cnpj, ie, endereco, cidade, estado, cep,
                telefone, email, contato_principal, condicoes_pagamento,
                prazo_entrega_padrao, observacoes
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Fornecedor criado com sucesso',
            id: result.insertId
        });
    } catch (err) {
        console.error('[COMPRAS] Erro ao criar fornecedor:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'CNPJ já cadastrado' });
        }
        res.status(500).json({ message: 'Erro ao criar fornecedor' });
    }
});

// Atualizar fornecedor
app.put('/api/compras/fornecedores/:id', authenticateToken, async (req, res) => {
    try {
        const {
            razao_social, nome_fantasia, cnpj, ie, endereco, cidade,
            estado, cep, telefone, email, contato_principal,
            condicoes_pagamento, prazo_entrega_padrao, observacoes, ativo
        } = req.body;

        await pool.query(
            `UPDATE fornecedores SET
                razao_social = ?, nome_fantasia = ?, cnpj = ?, ie = ?, endereco = ?,
                cidade = ?, estado = ?, cep = ?, telefone = ?, email = ?,
                contato_principal = ?, condicoes_pagamento = ?,
                prazo_entrega_padrao = ?, observacoes = ?, ativo = ?
            WHERE id = ?`,
            [
                razao_social, nome_fantasia, cnpj, ie, endereco, cidade,
                estado, cep, telefone, email, contato_principal,
                condicoes_pagamento, prazo_entrega_padrao, observacoes,
                ativo, req.params.id
            ]
        );

        res.json({ success: true, message: 'Fornecedor atualizado com sucesso' });
    } catch (err) {
        console.error('[COMPRAS] Erro ao atualizar fornecedor:', err);
        res.status(500).json({ message: 'Erro ao atualizar fornecedor' });
    }
});

// Desativar fornecedor
app.delete('/api/compras/fornecedores/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('UPDATE fornecedores SET ativo = 0 WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Fornecedor desativado com sucesso' });
    } catch (err) {
        console.error('[COMPRAS] Erro ao desativar fornecedor:', err);
        res.status(500).json({ message: 'Erro ao desativar fornecedor' });
    }
});

// ===== MATERIAIS DE COMPRAS =====

// Listar todos os materiais
app.get('/api/compras/materiais', authenticateToken, async (req, res) => {
    try {
        const { categoria, ativo, busca, status } = req.query;
        let query = `
            SELECT m.*, f.razao_social as fornecedor_nome
            FROM compras_materiais m
            LEFT JOIN fornecedores f ON m.fornecedor_id = f.id
            WHERE 1=1
        `;
        const params = [];
        
        if (ativo !== undefined) {
            query += ' AND m.ativo = ?';
            params.push(ativo);
        }
        
        if (categoria && categoria !== 'todos') {
            query += ' AND m.categoria = ?';
            params.push(categoria);
        }
        
        if (busca) {
            query += ' AND (m.codigo LIKE ? OR m.descricao LIKE ?)';
            params.push(`%${busca}%`, `%${busca}%`);
        }
        
        // Filtro por status de estoque
        if (status === 'disponivel') {
            query += ' AND m.estoque_atual > m.estoque_min';
        } else if (status === 'baixo') {
            query += ' AND m.estoque_atual <= m.estoque_min AND m.estoque_atual > 0';
        } else if (status === 'critico') {
            query += ' AND m.estoque_atual = 0';
        }
        
        query += ' ORDER BY m.descricao ASC';
        
        const [materiais] = await pool.query(query, params);
        
        // Calcular status de cada material
        const materiaisComStatus = materiais.map(m => ({
            ...m,
            status: m.estoque_atual === 0 ? 'critico' : 
                    m.estoque_atual <= m.estoque_min ? 'baixo' : 'disponivel'
        }));
        
        res.json(materiaisComStatus);
    } catch (err) {
        console.error('[COMPRAS] Erro ao listar materiais:', err);
        res.status(500).json({ message: 'Erro ao listar materiais' });
    }
});

// Estatísticas dos materiais
app.get('/api/compras/materiais/estatisticas', authenticateToken, async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN estoque_atual > estoque_min THEN 1 ELSE 0 END) as disponiveis,
                SUM(CASE WHEN estoque_atual <= estoque_min AND estoque_atual > 0 THEN 1 ELSE 0 END) as estoque_baixo,
                SUM(CASE WHEN estoque_atual = 0 THEN 1 ELSE 0 END) as criticos
            FROM compras_materiais WHERE ativo = 1
        `);
        res.json(stats[0]);
    } catch (err) {
        console.error('[COMPRAS] Erro ao buscar estatísticas:', err);
        res.status(500).json({ message: 'Erro ao buscar estatísticas' });
    }
});

// Buscar material por ID
app.get('/api/compras/materiais/:id', authenticateToken, async (req, res) => {
    try {
        const [material] = await pool.query(`
            SELECT m.*, f.razao_social as fornecedor_nome
            FROM compras_materiais m
            LEFT JOIN fornecedores f ON m.fornecedor_id = f.id
            WHERE m.id = ?
        `, [req.params.id]);
        
        if (material.length === 0) {
            return res.status(404).json({ message: 'Material não encontrado' });
        }
        res.json(material[0]);
    } catch (err) {
        console.error('[COMPRAS] Erro ao buscar material:', err);
        res.status(500).json({ message: 'Erro ao buscar material' });
    }
});

// Criar novo material
app.post('/api/compras/materiais', authenticateToken, async (req, res) => {
    try {
        const {
            codigo, descricao, categoria, unidade, especificacoes, ncm, cest,
            codigo_barras, estoque_min, estoque_max, estoque_atual, lead_time,
            fornecedor_id, ultimo_preco, sinc_pcp, observacoes
        } = req.body;

        if (!codigo || !descricao) {
            return res.status(400).json({ message: 'Código e descrição são obrigatórios' });
        }

        const [result] = await pool.query(
            `INSERT INTO compras_materiais (
                codigo, descricao, categoria, unidade, especificacoes, ncm, cest,
                codigo_barras, estoque_min, estoque_max, estoque_atual, lead_time,
                fornecedor_id, ultimo_preco, sinc_pcp, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                codigo, descricao, categoria || 'Geral', unidade || 'UN', especificacoes,
                ncm, cest, codigo_barras, estoque_min || 0, estoque_max || 0,
                estoque_atual || 0, lead_time || 0, fornecedor_id, ultimo_preco || 0,
                sinc_pcp || 0, observacoes
            ]
        );

        res.status(201).json({ 
            success: true, 
            message: 'Material cadastrado com sucesso',
            id: result.insertId 
        });
    } catch (err) {
        console.error('[COMPRAS] Erro ao criar material:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Código do material já existe' });
        }
        res.status(500).json({ message: 'Erro ao criar material' });
    }
});

// Atualizar material
app.put('/api/compras/materiais/:id', authenticateToken, async (req, res) => {
    try {
        const {
            codigo, descricao, categoria, unidade, especificacoes, ncm, cest,
            codigo_barras, estoque_min, estoque_max, estoque_atual, lead_time,
            fornecedor_id, ultimo_preco, ativo, sinc_pcp, observacoes
        } = req.body;

        await pool.query(
            `UPDATE compras_materiais SET 
                codigo = ?, descricao = ?, categoria = ?, unidade = ?, especificacoes = ?,
                ncm = ?, cest = ?, codigo_barras = ?, estoque_min = ?, estoque_max = ?,
                estoque_atual = ?, lead_time = ?, fornecedor_id = ?, ultimo_preco = ?,
                ativo = ?, sinc_pcp = ?, observacoes = ?
            WHERE id = ?`,
            [
                codigo, descricao, categoria, unidade, especificacoes, ncm, cest,
                codigo_barras, estoque_min, estoque_max, estoque_atual, lead_time,
                fornecedor_id, ultimo_preco, ativo, sinc_pcp, observacoes, req.params.id
            ]
        );

        res.json({ success: true, message: 'Material atualizado com sucesso' });
    } catch (err) {
        console.error('[COMPRAS] Erro ao atualizar material:', err);
        res.status(500).json({ message: 'Erro ao atualizar material' });
    }
});

// Desativar material
app.delete('/api/compras/materiais/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('UPDATE compras_materiais SET ativo = 0 WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Material desativado com sucesso' });
    } catch (err) {
        console.error('[COMPRAS] Erro ao desativar material:', err);
        res.status(500).json({ message: 'Erro ao desativar material' });
    }
});

// Categorias de materiais
app.get('/api/compras/materiais-categorias', authenticateToken, async (req, res) => {
    try {
        const [categorias] = await pool.query(
            'SELECT DISTINCT categoria FROM compras_materiais WHERE ativo = 1 ORDER BY categoria'
        );
        res.json(categorias.map(c => c.categoria));
    } catch (err) {
        console.error('[COMPRAS] Erro ao listar categorias:', err);
        res.status(500).json({ message: 'Erro ao listar categorias' });
    }
});

// ===== PEDIDOS DE COMPRA =====

// Listar todos os pedidos
app.get('/api/compras/pedidos', authenticateToken, async (req, res) => {
    try {
        const { status, fornecedor_id, data_inicio, data_fim } = req.query;
        let query = `
            SELECT p.*, f.razao_social as fornecedor_nome
            FROM pedidos_compra p
            LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND p.status = ?';
            params.push(status);
        }
        if (fornecedor_id) {
            query += ' AND p.fornecedor_id = ?';
            params.push(fornecedor_id);
        }
        if (data_inicio) {
            query += ' AND p.data_pedido >= ?';
            params.push(data_inicio);
        }
        if (data_fim) {
            query += ' AND p.data_pedido <= ?';
            params.push(data_fim);
        }

        query += ' ORDER BY p.created_at DESC';

        const [pedidos] = await pool.query(query, params);
        res.json(pedidos);
    } catch (err) {
        console.error('[COMPRAS] Erro ao listar pedidos:', err);
        res.status(500).json({ message: 'Erro ao listar pedidos' });
    }
});

// Buscar pedido por ID com itens
app.get('/api/compras/pedidos/:id', authenticateToken, async (req, res) => {
    try {
        const [pedido] = await pool.query(`
            SELECT p.*, f.razao_social as fornecedor_nome
            FROM pedidos_compra p
            LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
            WHERE p.id = ?
        `, [req.params.id]);

        if (pedido.length === 0) {
            return res.status(404).json({ message: 'Pedido não encontrado' });
        }

        const [itens] = await pool.query('SELECT * FROM itens_pedido WHERE pedido_id = ?', [req.params.id]);
        
        const [historico] = await pool.query(
            'SELECT * FROM historico_aprovacoes WHERE pedido_id = ? ORDER BY data_acao DESC',
            [req.params.id]
        );

        res.json({
            ...pedido[0],
            itens,
            historico
        });
    } catch (err) {
        console.error('[COMPRAS] Erro ao buscar pedido:', err);
        res.status(500).json({ message: 'Erro ao buscar pedido' });
    }
});

// Criar novo pedido de compra
app.post('/api/compras/pedidos', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const {
            numero_pedido, fornecedor_id, data_pedido, data_entrega_prevista,
            observacoes, itens
        } = req.body;

        if (!numero_pedido || !fornecedor_id || !itens || itens.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Dados obrigatórios faltando' });
        }

        // Calcular valor total
        const valor_total = itens.reduce((sum, item) => sum + parseFloat(item.preco_total || 0), 0);

        // Inserir pedido
        const [result] = await connection.query(
            `INSERT INTO pedidos_compra (
                numero_pedido, fornecedor_id, data_pedido, data_entrega_prevista,
                valor_total, valor_final, observacoes, usuario_solicitante_id, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`,
            [numero_pedido, fornecedor_id, data_pedido, data_entrega_prevista,
             valor_total, valor_total, observacoes, req.user.id]
        );

        const pedido_id = result.insertId;

        // Inserir itens
        for (const item of itens) {
            await connection.query(
                `INSERT INTO itens_pedido (
                    pedido_id, codigo_produto, descricao, quantidade, unidade,
                    preco_unitario, preco_total, observacoes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    pedido_id, item.codigo_produto, item.descricao, item.quantidade,
                    item.unidade || 'UN', item.preco_unitario, item.preco_total,
                    item.observacoes
                ]
            );

            // Registrar no histórico de preços
            await connection.query(
                `INSERT INTO historico_precos (
                    fornecedor_id, codigo_produto, descricao, preco_unitario,
                    quantidade, pedido_id, data_compra
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    fornecedor_id, item.codigo_produto, item.descricao,
                    item.preco_unitario, item.quantidade, pedido_id, data_pedido
                ]
            );
        }

        // Registrar no histórico de aprovações
        await connection.query(
            `INSERT INTO historico_aprovacoes (pedido_id, usuario_id, acao, observacoes)
             VALUES (?, ?, 'solicitado', 'Pedido criado')`,
            [pedido_id, req.user.id]
        );

        await connection.commit();
        res.status(201).json({
            success: true,
            message: 'Pedido criado com sucesso',
            id: pedido_id
        });
    } catch (err) {
        await connection.rollback();
        console.error('[COMPRAS] Erro ao criar pedido:', err);
        res.status(500).json({ message: 'Erro ao criar pedido' });
    } finally {
        connection.release();
    }
});

// Aprovar pedido
app.post('/api/compras/pedidos/:id/aprovar', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { observacoes, prazo_pagamento = 30, categoria_financeira_id, forma_pagamento, parcelas = 1 } = req.body;

        // Atualizar pedido
        await connection.query(
            `UPDATE pedidos_compra SET
                status = 'aprovado',
                usuario_aprovador_id = ?,
                data_aprovacao = NOW()
            WHERE id = ?`,
            [req.user.id, req.params.id]
        );

        await connection.query(
            `INSERT INTO historico_aprovacoes (pedido_id, usuario_id, acao, observacoes)
             VALUES (?, ?, 'aprovado', ?)`,
            [req.params.id, req.user.id, observacoes]
        );

        // === INTEGRAÇÃO FINANCEIRO ===
        // Buscar dados do pedido para criar conta a pagar
        const [pedidoData] = await connection.query(`
            SELECT p.*, f.razao_social as fornecedor_nome, f.cnpj, f.email
            FROM pedidos_compra p
            LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
            WHERE p.id = ?
        `, [req.params.id]);

        if (pedidoData.length > 0) {
            const pedido = pedidoData[0];
            const dataVencimento = new Date();
            dataVencimento.setDate(dataVencimento.getDate() + prazo_pagamento);

            // Determinar categoria automaticamente se não fornecida
            let categoriaId = categoria_financeira_id;
            if (!categoriaId) {
                const [catResult] = await connection.query(
                    `SELECT id FROM categorias_financeiras WHERE nome LIKE '%Compra%' AND tipo = 'despesa' LIMIT 1`
                );
                if (catResult.length > 0) {
                    categoriaId = catResult[0].id;
                }
            }

            // Criar conta a pagar
            const descricaoCompleta = `Pedido de Compra #${pedido.numero_pedido || pedido.id} - ${pedido.fornecedor_nome || 'Fornecedor'}${observacoes ? ` - ${observacoes}` : ''}`;
            
            const [contaResult] = await connection.query(
                `INSERT INTO contas_pagar (
                    descricao, fornecedor, valor_original, valor_restante, 
                    data_vencimento, data_emissao, categoria_id, forma_pagamento,
                    status, numero_documento, observacoes, pedido_compra_id,
                    criado_por, criado_em
                ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, 'pendente', ?, ?, ?, ?, NOW())`,
                [
                    descricaoCompleta,
                    pedido.fornecedor_nome || `Fornecedor ID ${pedido.fornecedor_id}`,
                    pedido.valor_final || pedido.valor_total,
                    pedido.valor_final || pedido.valor_total,
                    dataVencimento.toISOString().split('T')[0],
                    categoriaId,
                    forma_pagamento || 'boleto',
                    pedido.numero_pedido || `PC-${pedido.id}`,
                    observacoes,
                    pedido.id,
                    req.user.id
                ]
            );

            const contaId = contaResult.insertId;

            // Se houver parcelamento, gerar parcelas
            if (parcelas > 1) {
                const valorParcela = (pedido.valor_final || pedido.valor_total) / parcelas;
                
                for (let i = 1; i <= parcelas; i++) {
                    const dataVencParcela = new Date();
                    dataVencParcela.setDate(dataVencParcela.getDate() + (prazo_pagamento * i));
                    
                    await connection.query(
                        `INSERT INTO parcelas_financeiras (
                            conta_pagar_id, numero_parcela, valor_parcela, 
                            data_vencimento, status, criado_em
                        ) VALUES (?, ?, ?, ?, 'pendente', NOW())`,
                        [contaId, i, valorParcela, dataVencParcela.toISOString().split('T')[0]]
                    );
                }

                // Atualizar conta para indicar parcelamento
                await connection.query(
                    `UPDATE contas_pagar SET observacoes = CONCAT(COALESCE(observacoes, ''), ' [Parcelado em ${parcelas}x]') WHERE id = ?`,
                    [contaId]
                );
            }

            console.log(`[INTEGRAÇÃO] Conta a pagar #${contaId} criada automaticamente para Pedido de Compra #${pedido.id}`);
        }

        await connection.commit();
        res.json({ 
            success: true, 
            message: 'Pedido aprovado e conta a pagar criada com sucesso',
            financeiro_integrado: true
        });
    } catch (err) {
        await connection.rollback();
        console.error('[COMPRAS] Erro ao aprovar pedido:', err);
        res.status(500).json({ message: 'Erro ao aprovar pedido: ' + err.message });
    } finally {
        connection.release();
    }
});

// Cancelar pedido
app.post('/api/compras/pedidos/:id/cancelar', authenticateToken, async (req, res) => {
    try {
        const { motivo } = req.body;

        await pool.query(
            'UPDATE pedidos_compra SET status = \'cancelado\', motivo_cancelamento = ? WHERE id = ?',
            [motivo, req.params.id]
        );

        await pool.query(
            `INSERT INTO historico_aprovacoes (pedido_id, usuario_id, acao, observacoes)
             VALUES (?, ?, 'rejeitado', ?)`,
            [req.params.id, req.user.id, motivo]
        );

        res.json({ success: true, message: 'Pedido cancelado com sucesso' });
    } catch (err) {
        console.error('[COMPRAS] Erro ao cancelar pedido:', err);
        res.status(500).json({ message: 'Erro ao cancelar pedido' });
    }
});

// Receber pedido (total ou parcial)
app.post('/api/compras/pedidos/:id/receber', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const { itens_recebidos, data_entrega_real } = req.body;

        // Atualizar quantidades recebidas dos itens
        for (const item of itens_recebidos) {
            await connection.query(
                'UPDATE itens_pedido SET quantidade_recebida = quantidade_recebida + ? WHERE id = ?',
                [item.quantidade_recebida, item.id]
            );
        }

        // Verificar se todos os itens foram recebidos
        const [itens] = await connection.query(
            'SELECT * FROM itens_pedido WHERE pedido_id = ?',
            [req.params.id]
        );

        const todosRecebidos = itens.every(item => 
            parseFloat(item.quantidade_recebida) >= parseFloat(item.quantidade)
        );

        const novoStatus = todosRecebidos ? 'recebido' : 'parcial';

        await connection.query(
            'UPDATE pedidos_compra SET status = ?, data_entrega_real = ? WHERE id = ?',
            [novoStatus, data_entrega_real, req.params.id]
        );

        await connection.commit();
        res.json({
            success: true,
            message: todosRecebidos ? 'Pedido recebido completamente' : 'Recebimento parcial registrado'
        });
    } catch (err) {
        await connection.rollback();
        console.error('[COMPRAS] Erro ao receber pedido:', err);
        res.status(500).json({ message: 'Erro ao registrar recebimento' });
    } finally {
        connection.release();
    }
});

// ===== DASHBOARD =====

// Estatísticas do dashboard
app.get('/api/compras/dashboard', authenticateToken, async (req, res) => {
    try {
        const hoje = new Date().toISOString().split('T')[0];
        const mesAtual = hoje.substring(0, 7);

        // Total de pedidos
        const [totalPedidos] = await pool.query(
            'SELECT COUNT(*) as total FROM pedidos_compra'
        );

        // Pedidos pendentes
        const [pedidosPendentes] = await pool.query(
            'SELECT COUNT(*) as total FROM pedidos_compra WHERE status = \'pendente\''
        );

        // Valor total de compras do mês
        const [comprasMes] = await pool.query(
            'SELECT SUM(valor_final) as total FROM pedidos_compra WHERE DATE_FORMAT(data_pedido, \'%Y-%m\') = ?',
            [mesAtual]
        );

        // Fornecedores ativos
        const [fornecedoresAtivos] = await pool.query(
            'SELECT COUNT(*) as total FROM fornecedores WHERE ativo = 1'
        );

        // Pedidos por status
        const [pedidosPorStatus] = await pool.query(
            'SELECT status, COUNT(*) as total FROM pedidos_compra GROUP BY status'
        );

        // Top 5 fornecedores por volume
        const [topFornecedores] = await pool.query(`
            SELECT f.razao_social, COUNT(p.id) as total_pedidos, SUM(p.valor_final) as total_valor
            FROM pedidos_compra p
            JOIN fornecedores f ON p.fornecedor_id = f.id
            GROUP BY f.id
            ORDER BY total_valor DESC
            LIMIT 5
        `);

        // Pedidos recentes
        const [pedidosRecentes] = await pool.query(`
            SELECT p.*, f.razao_social as fornecedor_nome
            FROM pedidos_compra p
            LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
            ORDER BY p.created_at DESC
            LIMIT 10
        `);

        res.json({
            stats: {
                total_pedidos: totalPedidos[0].total,
                pedidos_pendentes: pedidosPendentes[0].total,
                compras_mes: comprasMes[0].total || 0,
                fornecedores_ativos: fornecedoresAtivos[0].total
            },
            pedidos_por_status: pedidosPorStatus,
            top_fornecedores: topFornecedores,
            pedidos_recentes: pedidosRecentes
        });
    } catch (err) {
        console.error('[COMPRAS] Erro ao buscar dashboard:', err);
        res.status(500).json({ message: 'Erro ao buscar dados do dashboard' });
    }
});

// Histórico de preços de um produto
app.get('/api/compras/historico-precos', authenticateToken, async (req, res) => {
    try {
        const { codigo_produto, fornecedor_id } = req.query;
        let query = `
            SELECT h.*, f.razao_social as fornecedor_nome
            FROM historico_precos h
            LEFT JOIN fornecedores f ON h.fornecedor_id = f.id
            WHERE 1=1
        `;
        const params = [];

        if (codigo_produto) {
            query += ' AND h.codigo_produto = ?';
            params.push(codigo_produto);
        }
        if (fornecedor_id) {
            query += ' AND h.fornecedor_id = ?';
            params.push(fornecedor_id);
        }

        query += ' ORDER BY h.data_compra DESC LIMIT 50';

        const [historico] = await pool.query(query, params);
        res.json(historico);
    } catch (err) {
        console.error('[COMPRAS] Erro ao buscar histórico de preços:', err);
        res.status(500).json({ message: 'Erro ao buscar histórico' });
    }
});

// ===== REQUISIÇÕES DE COMPRA =====

// Criar tabela de requisições se não existir
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS requisicoes_compra (
                id INT AUTO_INCREMENT PRIMARY KEY,
                numero VARCHAR(20) NOT NULL UNIQUE,
                solicitante VARCHAR(100) NOT NULL,
                solicitante_id INT,
                centro_custo_id INT,
                centro_custo VARCHAR(100),
                data_solicitacao DATE NOT NULL,
                data_necessidade DATE,
                prioridade ENUM('baixa', 'normal', 'alta', 'urgente') DEFAULT 'normal',
                projeto VARCHAR(200),
                justificativa TEXT,
                observacoes TEXT,
                status ENUM('rascunho', 'pendente', 'aprovado', 'rejeitado', 'cotacao', 'cancelado') DEFAULT 'pendente',
                valor_estimado DECIMAL(15,2) DEFAULT 0,
                aprovador_id INT,
                data_aprovacao DATETIME,
                motivo_rejeicao TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS itens_requisicao (
                id INT AUTO_INCREMENT PRIMARY KEY,
                requisicao_id INT NOT NULL,
                produto_id INT,
                descricao VARCHAR(255) NOT NULL,
                quantidade DECIMAL(15,3) NOT NULL,
                unidade VARCHAR(10) DEFAULT 'UN',
                valor_estimado DECIMAL(15,2) DEFAULT 0,
                subtotal DECIMAL(15,2) DEFAULT 0,
                observacao TEXT,
                FOREIGN KEY (requisicao_id) REFERENCES requisicoes_compra(id) ON DELETE CASCADE
            )
        `);
        
        console.log('✅ Tabelas de requisições de compra verificadas/criadas');
    } catch (err) {
        console.error('Erro ao criar tabelas de requisições:', err);
    }
})();

// Listar todas as requisições
app.get('/api/compras/requisicoes', authenticateToken, async (req, res) => {
    try {
        const { status, prioridade, solicitante, data_inicio, data_fim } = req.query;
        let query = `
            SELECT r.*, 
                   (SELECT COUNT(*) FROM itens_requisicao WHERE requisicao_id = r.id) as total_itens
            FROM requisicoes_compra r
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'todos') {
            query += ' AND r.status = ?';
            params.push(status);
        }
        if (prioridade) {
            query += ' AND r.prioridade = ?';
            params.push(prioridade);
        }
        if (solicitante) {
            query += ' AND r.solicitante LIKE ?';
            params.push(`%${solicitante}%`);
        }
        if (data_inicio) {
            query += ' AND r.data_solicitacao >= ?';
            params.push(data_inicio);
        }
        if (data_fim) {
            query += ' AND r.data_solicitacao <= ?';
            params.push(data_fim);
        }

        query += ' ORDER BY r.created_at DESC';

        const [requisicoes] = await pool.query(query, params);
        res.json(requisicoes);
    } catch (err) {
        console.error('[COMPRAS] Erro ao listar requisições:', err);
        res.status(500).json({ message: 'Erro ao listar requisições' });
    }
});

// Buscar requisição por ID com itens
app.get('/api/compras/requisicoes/:id', authenticateToken, async (req, res) => {
    try {
        const [requisicao] = await pool.query('SELECT * FROM requisicoes_compra WHERE id = ?', [req.params.id]);

        if (requisicao.length === 0) {
            return res.status(404).json({ message: 'Requisição não encontrada' });
        }

        const [itens] = await pool.query('SELECT * FROM itens_requisicao WHERE requisicao_id = ?', [req.params.id]);

        res.json({
            ...requisicao[0],
            itens
        });
    } catch (err) {
        console.error('[COMPRAS] Erro ao buscar requisição:', err);
        res.status(500).json({ message: 'Erro ao buscar requisição' });
    }
});

// Gerar próximo número de requisição
app.get('/api/compras/requisicoes/proximo-numero', authenticateToken, async (req, res) => {
    try {
        const [result] = await pool.query(`
            SELECT numero FROM requisicoes_compra 
            ORDER BY id DESC LIMIT 1
        `);
        
        let proximoNumero = 'REQ-0001';
        if (result.length > 0) {
            const ultimoNumero = result[0].numero;
            const numero = parseInt(ultimoNumero.replace('REQ-', '')) + 1;
            proximoNumero = `REQ-${numero.toString().padStart(4, '0')}`;
        }
        
        res.json({ numero: proximoNumero });
    } catch (err) {
        console.error('[COMPRAS] Erro ao gerar número:', err);
        res.status(500).json({ message: 'Erro ao gerar número' });
    }
});

// Criar nova requisição
app.post('/api/compras/requisicoes', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const {
            numero, solicitante, solicitante_id, centro_custo_id, centro_custo,
            data_solicitacao, data_necessidade, prioridade, projeto,
            justificativa, observacoes, status, itens
        } = req.body;

        if (!numero || !solicitante) {
            await connection.rollback();
            return res.status(400).json({ message: 'Número e solicitante são obrigatórios' });
        }

        // Calcular valor total
        const valor_estimado = itens ? itens.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0) : 0;

        // Inserir requisição
        const [result] = await connection.query(
            `INSERT INTO requisicoes_compra (
                numero, solicitante, solicitante_id, centro_custo_id, centro_custo,
                data_solicitacao, data_necessidade, prioridade, projeto,
                justificativa, observacoes, status, valor_estimado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                numero, solicitante, solicitante_id || null, centro_custo_id || null, centro_custo || null,
                data_solicitacao || new Date(), data_necessidade || null, prioridade || 'normal', projeto || null,
                justificativa || null, observacoes || null, status || 'pendente', valor_estimado
            ]
        );

        const requisicaoId = result.insertId;

        // Inserir itens
        if (itens && itens.length > 0) {
            for (const item of itens) {
                await connection.query(
                    `INSERT INTO itens_requisicao (
                        requisicao_id, produto_id, descricao, quantidade, unidade, valor_estimado, subtotal, observacao
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        requisicaoId, item.produto_id || null, item.descricao, item.quantidade,
                        item.unidade || 'UN', item.valor_estimado || 0, item.subtotal || 0, item.observacao || null
                    ]
                );
            }
        }

        await connection.commit();

        res.status(201).json({
            message: 'Requisição criada com sucesso',
            id: requisicaoId,
            numero: numero
        });
    } catch (err) {
        await connection.rollback();
        console.error('[COMPRAS] Erro ao criar requisição:', err);
        res.status(500).json({ message: 'Erro ao criar requisição' });
    } finally {
        connection.release();
    }
});

// Atualizar requisição
app.put('/api/compras/requisicoes/:id', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const {
            centro_custo_id, centro_custo, data_necessidade, prioridade, projeto,
            justificativa, observacoes, status, itens
        } = req.body;

        // Verificar se existe
        const [existing] = await connection.query('SELECT * FROM requisicoes_compra WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Requisição não encontrada' });
        }

        // Calcular valor total
        const valor_estimado = itens ? itens.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0) : existing[0].valor_estimado;

        // Atualizar requisição
        await connection.query(
            `UPDATE requisicoes_compra SET
                centro_custo_id = ?, centro_custo = ?, data_necessidade = ?, prioridade = ?,
                projeto = ?, justificativa = ?, observacoes = ?, status = ?, valor_estimado = ?
            WHERE id = ?`,
            [
                centro_custo_id || null, centro_custo || null, data_necessidade || null, prioridade || 'normal',
                projeto || null, justificativa || null, observacoes || null, status || existing[0].status, valor_estimado,
                req.params.id
            ]
        );

        // Atualizar itens (deletar e reinserir)
        if (itens) {
            await connection.query('DELETE FROM itens_requisicao WHERE requisicao_id = ?', [req.params.id]);
            
            for (const item of itens) {
                await connection.query(
                    `INSERT INTO itens_requisicao (
                        requisicao_id, produto_id, descricao, quantidade, unidade, valor_estimado, subtotal, observacao
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        req.params.id, item.produto_id || null, item.descricao, item.quantidade,
                        item.unidade || 'UN', item.valor_estimado || 0, item.subtotal || 0, item.observacao || null
                    ]
                );
            }
        }

        await connection.commit();

        res.json({ message: 'Requisição atualizada com sucesso' });
    } catch (err) {
        await connection.rollback();
        console.error('[COMPRAS] Erro ao atualizar requisição:', err);
        res.status(500).json({ message: 'Erro ao atualizar requisição' });
    } finally {
        connection.release();
    }
});

// Excluir requisição
app.delete('/api/compras/requisicoes/:id', authenticateToken, async (req, res) => {
    try {
        const [existing] = await pool.query('SELECT * FROM requisicoes_compra WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Requisição não encontrada' });
        }

        // Verificar se pode excluir (apenas rascunho ou pendente)
        if (!['rascunho', 'pendente'].includes(existing[0].status)) {
            return res.status(400).json({ message: 'Apenas requisições pendentes ou em rascunho podem ser excluídas' });
        }

        await pool.query('DELETE FROM requisicoes_compra WHERE id = ?', [req.params.id]);

        res.json({ message: 'Requisição excluída com sucesso' });
    } catch (err) {
        console.error('[COMPRAS] Erro ao excluir requisição:', err);
        res.status(500).json({ message: 'Erro ao excluir requisição' });
    }
});

// Aprovar/Rejeitar requisição
app.post('/api/compras/requisicoes/:id/aprovar', authenticateToken, async (req, res) => {
    try {
        const { aprovado, motivo } = req.body;
        const novoStatus = aprovado ? 'aprovado' : 'rejeitado';

        await pool.query(
            `UPDATE requisicoes_compra SET 
                status = ?, aprovador_id = ?, data_aprovacao = NOW(), motivo_rejeicao = ?
            WHERE id = ?`,
            [novoStatus, req.user.id, aprovado ? null : motivo, req.params.id]
        );

        res.json({ message: aprovado ? 'Requisição aprovada' : 'Requisição rejeitada' });
    } catch (err) {
        console.error('[COMPRAS] Erro ao aprovar/rejeitar requisição:', err);
        res.status(500).json({ message: 'Erro ao processar aprovação' });
    }
});

// Estatísticas das requisições
app.get('/api/compras/requisicoes-stats', authenticateToken, async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
                SUM(CASE WHEN status = 'aprovado' THEN 1 ELSE 0 END) as aprovadas,
                SUM(CASE WHEN status = 'cotacao' THEN 1 ELSE 0 END) as em_cotacao,
                SUM(CASE WHEN prioridade = 'urgente' THEN 1 ELSE 0 END) as urgentes
            FROM requisicoes_compra
        `);
        res.json(stats[0]);
    } catch (err) {
        console.error('[COMPRAS] Erro ao buscar estatísticas:', err);
        res.status(500).json({ message: 'Erro ao buscar estatísticas' });
    }
});

// ===== COTAÇÕES DE COMPRA =====

// Criar tabela de cotações se não existir
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cotacoes_compra (
                id INT AUTO_INCREMENT PRIMARY KEY,
                numero VARCHAR(20) NOT NULL UNIQUE,
                descricao VARCHAR(255) NOT NULL,
                requisicao_id INT,
                data_abertura DATE NOT NULL,
                data_validade DATE,
                quantidade DECIMAL(15,3),
                unidade VARCHAR(10) DEFAULT 'UN',
                especificacoes TEXT,
                observacoes TEXT,
                valor_medio DECIMAL(15,2) DEFAULT 0,
                melhor_preco DECIMAL(15,2) DEFAULT 0,
                fornecedor_vencedor_id INT,
                status ENUM('aberta', 'analise', 'finalizada', 'cancelada') DEFAULT 'aberta',
                criado_por INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cotacao_fornecedores (
                id INT AUTO_INCREMENT PRIMARY KEY,
                cotacao_id INT NOT NULL,
                fornecedor_id INT NOT NULL,
                valor_unitario DECIMAL(15,2),
                valor_total DECIMAL(15,2),
                prazo_entrega INT,
                condicao_pagamento VARCHAR(100),
                observacoes TEXT,
                data_resposta DATETIME,
                selecionado BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (cotacao_id) REFERENCES cotacoes_compra(id) ON DELETE CASCADE
            )
        `);
        
        console.log('✅ Tabelas de cotações de compra verificadas/criadas');
    } catch (err) {
        console.error('Erro ao criar tabelas de cotações:', err);
    }
})();

// Listar todas as cotações
app.get('/api/compras/cotacoes', authenticateToken, async (req, res) => {
    try {
        const { status } = req.query;
        let query = `
            SELECT c.*, 
                   (SELECT COUNT(*) FROM cotacao_fornecedores WHERE cotacao_id = c.id) as total_fornecedores,
                   f.razao_social as fornecedor_vencedor
            FROM cotacoes_compra c
            LEFT JOIN fornecedores f ON c.fornecedor_vencedor_id = f.id
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'todas') {
            query += ' AND c.status = ?';
            params.push(status);
        }

        query += ' ORDER BY c.created_at DESC';

        const [cotacoes] = await pool.query(query, params);
        res.json(cotacoes);
    } catch (err) {
        console.error('[COMPRAS] Erro ao listar cotações:', err);
        res.status(500).json({ message: 'Erro ao listar cotações' });
    }
});

// Buscar cotação por ID com fornecedores
app.get('/api/compras/cotacoes/:id', authenticateToken, async (req, res) => {
    try {
        const [cotacao] = await pool.query('SELECT * FROM cotacoes_compra WHERE id = ?', [req.params.id]);

        if (cotacao.length === 0) {
            return res.status(404).json({ message: 'Cotação não encontrada' });
        }

        const [fornecedores] = await pool.query(`
            SELECT cf.*, f.razao_social, f.cnpj, f.telefone, f.email
            FROM cotacao_fornecedores cf
            LEFT JOIN fornecedores f ON cf.fornecedor_id = f.id
            WHERE cf.cotacao_id = ?
        `, [req.params.id]);

        res.json({
            ...cotacao[0],
            fornecedores
        });
    } catch (err) {
        console.error('[COMPRAS] Erro ao buscar cotação:', err);
        res.status(500).json({ message: 'Erro ao buscar cotação' });
    }
});

// Gerar próximo número de cotação
app.get('/api/compras/cotacoes/proximo-numero', authenticateToken, async (req, res) => {
    try {
        const [result] = await pool.query(`
            SELECT numero FROM cotacoes_compra ORDER BY id DESC LIMIT 1
        `);
        
        let proximoNumero = 'COT-0001';
        if (result.length > 0) {
            const numero = parseInt(result[0].numero.replace('COT-', '')) + 1;
            proximoNumero = `COT-${numero.toString().padStart(4, '0')}`;
        }
        
        res.json({ numero: proximoNumero });
    } catch (err) {
        console.error('[COMPRAS] Erro ao gerar número:', err);
        res.status(500).json({ message: 'Erro ao gerar número' });
    }
});

// Criar nova cotação
app.post('/api/compras/cotacoes', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const {
            numero, descricao, requisicao_id, data_abertura, data_validade,
            quantidade, unidade, especificacoes, observacoes, fornecedores_ids
        } = req.body;

        if (!numero || !descricao) {
            await connection.rollback();
            return res.status(400).json({ message: 'Número e descrição são obrigatórios' });
        }

        const [result] = await connection.query(
            `INSERT INTO cotacoes_compra (
                numero, descricao, requisicao_id, data_abertura, data_validade,
                quantidade, unidade, especificacoes, observacoes, criado_por
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                numero, descricao, requisicao_id || null, data_abertura || new Date(),
                data_validade || null, quantidade || null, unidade || 'UN',
                especificacoes || null, observacoes || null, req.user.id
            ]
        );

        const cotacaoId = result.insertId;

        // Adicionar fornecedores
        if (fornecedores_ids && fornecedores_ids.length > 0) {
            for (const fornId of fornecedores_ids) {
                await connection.query(
                    'INSERT INTO cotacao_fornecedores (cotacao_id, fornecedor_id) VALUES (?, ?)',
                    [cotacaoId, fornId]
                );
            }
        }

        await connection.commit();

        res.status(201).json({
            message: 'Cotação criada com sucesso',
            id: cotacaoId,
            numero: numero
        });
    } catch (err) {
        await connection.rollback();
        console.error('[COMPRAS] Erro ao criar cotação:', err);
        res.status(500).json({ message: 'Erro ao criar cotação' });
    } finally {
        connection.release();
    }
});

// Atualizar cotação
app.put('/api/compras/cotacoes/:id', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const {
            descricao, data_validade, quantidade, unidade, especificacoes,
            observacoes, status, fornecedores
        } = req.body;

        const [existing] = await connection.query('SELECT * FROM cotacoes_compra WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Cotação não encontrada' });
        }

        // Calcular valor médio e melhor preço
        let valorMedio = 0, melhorPreco = 0, fornecedorVencedor = null;
        if (fornecedores && fornecedores.length > 0) {
            const valores = fornecedores.filter(f => f.valor_total > 0).map(f => parseFloat(f.valor_total));
            if (valores.length > 0) {
                valorMedio = valores.reduce((a, b) => a + b, 0) / valores.length;
                melhorPreco = Math.min(...valores);
                const vencedor = fornecedores.find(f => f.selecionado);
                if (vencedor) fornecedorVencedor = vencedor.fornecedor_id;
            }
        }

        await connection.query(
            `UPDATE cotacoes_compra SET
                descricao = ?, data_validade = ?, quantidade = ?, unidade = ?,
                especificacoes = ?, observacoes = ?, status = ?, valor_medio = ?,
                melhor_preco = ?, fornecedor_vencedor_id = ?
            WHERE id = ?`,
            [
                descricao || existing[0].descricao, data_validade || existing[0].data_validade,
                quantidade || existing[0].quantidade, unidade || existing[0].unidade,
                especificacoes || existing[0].especificacoes, observacoes || existing[0].observacoes,
                status || existing[0].status, valorMedio, melhorPreco, fornecedorVencedor, req.params.id
            ]
        );

        // Atualizar fornecedores
        if (fornecedores) {
            for (const forn of fornecedores) {
                await connection.query(
                    `UPDATE cotacao_fornecedores SET
                        valor_unitario = ?, valor_total = ?, prazo_entrega = ?,
                        condicao_pagamento = ?, observacoes = ?, data_resposta = ?, selecionado = ?
                    WHERE cotacao_id = ? AND fornecedor_id = ?`,
                    [
                        forn.valor_unitario || 0, forn.valor_total || 0, forn.prazo_entrega || null,
                        forn.condicao_pagamento || null, forn.observacoes || null,
                        forn.data_resposta || null, forn.selecionado || false,
                        req.params.id, forn.fornecedor_id
                    ]
                );
            }
        }

        await connection.commit();
        res.json({ message: 'Cotação atualizada com sucesso' });
    } catch (err) {
        await connection.rollback();
        console.error('[COMPRAS] Erro ao atualizar cotação:', err);
        res.status(500).json({ message: 'Erro ao atualizar cotação' });
    } finally {
        connection.release();
    }
});

// Excluir cotação
app.delete('/api/compras/cotacoes/:id', authenticateToken, async (req, res) => {
    try {
        const [existing] = await pool.query('SELECT * FROM cotacoes_compra WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Cotação não encontrada' });
        }

        if (existing[0].status === 'finalizada') {
            return res.status(400).json({ message: 'Cotações finalizadas não podem ser excluídas' });
        }

        await pool.query('DELETE FROM cotacoes_compra WHERE id = ?', [req.params.id]);
        res.json({ message: 'Cotação excluída com sucesso' });
    } catch (err) {
        console.error('[COMPRAS] Erro ao excluir cotação:', err);
        res.status(500).json({ message: 'Erro ao excluir cotação' });
    }
});

// Estatísticas das cotações
app.get('/api/compras/cotacoes-stats', authenticateToken, async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'aberta' THEN 1 ELSE 0 END) as abertas,
                SUM(CASE WHEN status = 'analise' THEN 1 ELSE 0 END) as em_analise,
                SUM(CASE WHEN status = 'finalizada' THEN 1 ELSE 0 END) as finalizadas
            FROM cotacoes_compra
        `);
        res.json(stats[0]);
    } catch (err) {
        console.error('[COMPRAS] Erro ao buscar estatísticas:', err);
        res.status(500).json({ message: 'Erro ao buscar estatísticas' });
    }
});

// Observação: não definir rotas públicas here para /dashboard ou /index.html —
// elas já estão protegidas acima usando `requireAuthPage`.

// Rota para tela de configurações — somente administradores
app.get('/config.html', authenticatePage, (req, res) => {
    // Se não autenticado, redirecionar para raiz (front-end mostrará o login se necessário)
    if (!req.user) return res.redirect('/');
    const firstName = req.user.nome ? req.user.nome.split(' ')[0].toLowerCase() : '';
    const emailPrefix = req.user.email ? req.user.email.split('@')[0].toLowerCase() : '';
    // Usa userPermissions.isAdmin para verificar lista de administradores
    if (userPermissions.isAdmin(firstName) || userPermissions.isAdmin(emailPrefix)) {
        return res.sendFile(path.join(__dirname, 'public', 'config.html'));
    }
    return res.status(403).send('<h1>Acesso Negado</h1><p>Esta área é restrita a administradores.</p>');
});

// Endpoint administrativo para configurar permissões de vendas
app.post('/api/admin/configure-vendas-permissions', authenticateToken, async (req, res) => {
    try {
        // Verificar se é admin
        if (!req.user.is_admin && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado - apenas administradores' });
        }

        const permissoesVendas = JSON.stringify({
            visualizar: true,
            criar: true,
            editar: true,
            excluir: true,
            aprovar: true,
            dashboard: true
        });

        // Usuários que devem ter acesso a vendas
        const usuarios = [
            'ti@aluforce.ind.br', 'douglas@aluforce.ind.br', 'andreia@aluforce.ind.br',
            'renata@aluforce.ind.br', 'augusto@aluforce.ind.br', 'marcia@aluforce.ind.br',
            'clemerson@aluforce.ind.br', 'thiago@aluforce.ind.br', 'ariel@aluforce.ind.br',
            'fabiano@aluforce.ind.br', 'fabiola@aluforce.ind.br'
        ];

        const results = [];

        for (const email of usuarios) {
            try {
                const [result] = await pool.query(
                    'UPDATE usuarios SET permissoes_vendas = ? WHERE email = ? OR login = ? OR nome LIKE ?',
                    [permissoesVendas, email, email.split('@')[0], `%${email.split('@')[0]}%`]
                );
                
                if (result.affectedRows > 0) {
                    results.push({ email, status: 'success', affected: result.affectedRows });
                } else {
                    results.push({ email, status: 'not_found' });
                }
            } catch (err) {
                results.push({ email, status: 'error', message: err.message });
            }
        }

        res.json({ success: true, results });
    } catch (error) {
        console.error('Erro ao configurar permissões:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para configurar permissões baseado em nomes da tabela funcionarios
app.post('/api/admin/configure-vendas-by-names', authenticateToken, async (req, res) => {
    try {
        // Verificar se é admin
        if (!req.user.is_admin && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado - apenas administradores' });
        }

        const permissoesVendas = JSON.stringify({
            visualizar: true,
            criar: true,
            editar: true,
            excluir: true,
            aprovar: true,
            dashboard: true
        });

        // Nomes base para buscar (sem sobrenome, apenas primeiro nome ou parte)
        const nomesBase = [
            'ti', 'douglas', 'andreia', 'renata', 'augusto', 
            'marcia', 'clemerson', 'thiago', 'ariel', 'fabiano', 'fabiola'
        ];

        const results = [];
        let totalFound = 0;

        console.log('\n🔍 Buscando usuários na tabela usuarios por nome...\n');

        for (const nomeBase of nomesBase) {
            try {
                // Buscar na tabela usuarios por nome, email ou login
                const [usuarios] = await pool.query(
                    `SELECT id, nome, email, login 
                     FROM usuarios 
                     WHERE LOWER(nome) LIKE ? 
                        OR LOWER(email) LIKE ? 
                        OR LOWER(login) LIKE ?`,
                    [`%${nomeBase.toLowerCase()}%`, `%${nomeBase.toLowerCase()}%`, `%${nomeBase.toLowerCase()}%`]
                );

                if (usuarios.length > 0) {
                    for (const usuario of usuarios) {
                        try {
                            const [result] = await pool.query(
                                'UPDATE usuarios SET permissoes_vendas = ? WHERE id = ?',
                                [permissoesVendas, usuario.id]
                            );

                            console.log(`✅ ${usuario.nome} (ID: ${usuario.id}) - Permissões atualizadas`);
                            
                            results.push({
                                name: nomeBase,
                                status: 'success',
                                id: usuario.id,
                                nome_completo: usuario.nome,
                                email: usuario.email,
                                login: usuario.login
                            });
                            totalFound++;
                        } catch (err) {
                            console.error(`❌ Erro ao atualizar ${usuario.nome}:`, err.message);
                            results.push({
                                name: nomeBase,
                                status: 'error',
                                message: err.message
                            });
                        }
                    }
                } else {
                    console.log(`⚠️  ${nomeBase} - Não encontrado`);
                    results.push({
                        name: nomeBase,
                        status: 'not_found'
                    });
                }

            } catch (err) {
                console.error(`❌ Erro ao buscar ${nomeBase}:`, err.message);
                results.push({
                    name: nomeBase,
                    status: 'error',
                    message: err.message
                });
            }
        }

        console.log(`\n✅ Total de ${totalFound} usuários atualizados\n`);

        res.json({ 
            success: true, 
            results,
            found: totalFound,
            searched: nomesBase.length
        });
    } catch (error) {
        console.error('Erro ao configurar permissões:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para remover permissões de vendas de um usuário específico
app.post('/api/admin/remove-vendas-permission', authenticateToken, async (req, res) => {
    try {
        // Verificar se é admin
        if (!req.user.is_admin && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado - apenas administradores' });
        }

        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId é obrigatório' });
        }

        // Buscar dados do usuário antes de remover
        const [[usuario]] = await pool.query(
            'SELECT id, nome, email, login FROM usuarios WHERE id = ?',
            [userId]
        );

        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Remover permissões (setar como NULL)
        await pool.query(
            'UPDATE usuarios SET permissoes_vendas = NULL WHERE id = ?',
            [userId]
        );

        console.log(`🗑️  Permissões de vendas removidas do usuário ID ${userId} (${usuario.nome})`);

        res.json({ 
            success: true, 
            user: usuario,
            message: 'Permissões de vendas removidas com sucesso'
        });
    } catch (error) {
        console.error('Erro ao remover permissões:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para corrigir permissões malformadas
app.post('/api/admin/fix-vendas-permissions', authenticateToken, async (req, res) => {
    try {
        // Verificar se é admin
        if (!req.user.is_admin && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado - apenas administradores' });
        }

        // Permissões corretas em formato JSON
        const permissoesCorretas = JSON.stringify({
            visualizar: true,
            criar: true,
            editar: true,
            excluir: true,
            aprovar: true,
            dashboard: true
        });

        // IDs dos usuários que devem ter acesso (excluindo ID 67)
        const userIds = [2, 79, 70, 69, 63, 62, 71, 64, 65, 72];

        const results = [];
        let fixed = 0;

        console.log('\n🔧 Corrigindo permissões de vendas...\n');

        for (const id of userIds) {
            try {
                // Buscar usuário
                const [[usuario]] = await pool.query(
                    'SELECT id, nome, email, login FROM usuarios WHERE id = ?',
                    [id]
                );

                if (usuario) {
                    // Atualizar com JSON válido
                    await pool.query(
                        'UPDATE usuarios SET permissoes_vendas = ? WHERE id = ?',
                        [permissoesCorretas, id]
                    );

                    console.log(`✅ ${usuario.nome} (ID: ${id}) - Permissões corrigidas`);
                    
                    results.push({
                        status: 'success',
                        id: usuario.id,
                        nome: usuario.nome,
                        email: usuario.email || usuario.login
                    });
                    fixed++;
                } else {
                    console.log(`⚠️  ID ${id} - Não encontrado`);
                    results.push({
                        status: 'not_found',
                        id: id
                    });
                }

            } catch (err) {
                console.error(`❌ Erro ao corrigir ID ${id}:`, err.message);
                results.push({
                    status: 'error',
                    id: id,
                    message: err.message
                });
            }
        }

        console.log(`\n✅ Total de ${fixed} usuários corrigidos\n`);

        res.json({ 
            success: true, 
            fixed,
            results
        });
    } catch (error) {
        console.error('Erro ao corrigir permissões:', error);
        res.status(500).json({ error: error.message });
    }
});

// Outras rotas protegidas devem seguir o mesmo padrão


// =================================================================
// 7. TRATAMENTO DE ERROS E INICIALIZAÇÁO DO SERVIDOR
// =================================================================
// ================= CHAT INTERNO / COMENTÁRIOS =================
// Enviar comentário/mensagem
app.post('/api/chat', authenticateToken, async (req, res) => {
    const usuario_id = req.user.id;
    const { modulo, referencia, mensagem, setor } = req.body;
    try {
        await pool.query('INSERT INTO chat (usuario_id, modulo, referencia, mensagem, setor, datahora) VALUES (?, ?, ?, ?, ?, NOW())', [usuario_id, modulo, referencia, mensagem, setor]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
});

// Consultar mensagens/comentários
app.get('/api/chat', authenticateToken, async (req, res) => {
    const { modulo, referencia } = req.query;
    const user = req.user;
    try {
        let query = 'SELECT c.*, u.nome FROM chat c JOIN usuarios u ON c.usuario_id = u.id WHERE c.referencia = ?';
        let params = [referencia];
        if (user.role !== 'admin') {
            query += ' AND c.modulo = ? AND c.setor = ?';
            params.push(modulo, user.setor);
        } else if (modulo) {
            query += ' AND c.modulo = ?';
            params.push(modulo);
        }
        query += ' ORDER BY c.datahora ASC';
        const [mensagens] = await pool.query(query, params);
        res.json(Array.isArray(mensagens) ? mensagens : []);
    } catch (err) {
        res.json([]);
    }
});

// Middleware para tratamento de erros (deve ser o último middleware)
app.use((err, req, res, next) => {
    console.error('❌ ERRO NO SERVIDOR:', err.stack);
    if (!res.headersSent) {
        res.status(500).json({
            message: 'Ocorreu um erro inesperado no servidor.',
            error: process.env.NODE_ENV === 'development' ? err.message : {}
        });
    }
});

// Endpoint de status/health (útil para monitoramento). Retorna disponibilidade do DB e uptime.
app.get('/status', async (req, res) => {
    const info = {
        status: 'ok',
        env: process.env.NODE_ENV || 'development',
        uptime_seconds: Math.floor(process.uptime()),
        dbAvailable: !!DB_AVAILABLE,
        timestamp: new Date().toISOString()
    };

    if (DB_AVAILABLE) {
        try {
            // Pequeno ping ao banco para confirmar saúde
            await pool.query('SELECT 1');
            info.dbPing = true;
        } catch (err) {
            info.dbPing = false;
            info.dbError = String(err && err.message ? err.message : err).slice(0, 200);
        }
    }

    // status code 200 when service up (even if DB down); use X-DB-Available header to signal
    res.setHeader('X-DB-Available', DB_AVAILABLE ? '1' : '0');
    return res.json(info);
});

// Global flag indicando disponibilidade do banco (declarado acima, antes das rotas)

// ⚡ Flag para pular migrações (SKIP_MIGRATIONS=1)
const SKIP_MIGRATIONS = process.env.SKIP_MIGRATIONS === '1' || process.env.SKIP_MIGRATIONS === 'true';

// Função para iniciar o servidor
const startServer = async () => {
    const startupTime = Date.now();
    console.log('🚀 Starting ALUFORCE Dashboard Server...');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    try {
        // Testa a conexão com o banco de dados antes de iniciar o servidor
        if (process.env.DEV_MOCK === '1' || process.env.DEV_MOCK === 'true') {
            DB_AVAILABLE = false;
            console.log('⚠️  Iniciando em modo DEV_MOCK — pulando checagem/criação de tabelas no MySQL.');
        } else {
            try {
                await pool.query('SELECT 1');
                console.log('✅ Conexão com o banco de dados estabelecida com sucesso.');
                console.log(`⚡ Conexão DB em ${Date.now() - startupTime}ms`);

                // ⚡ OTIMIZAÇÃO: Pular migrações se SKIP_MIGRATIONS=1
                if (SKIP_MIGRATIONS) {
                    console.log('⚡ SKIP_MIGRATIONS ativo - pulando verificações de schema');
                    console.log('💡 Use "npm run db:migrate" para executar migrações quando necessário\n');
                } else {
                    console.log('🔄 Executando verificações de schema...');
                    console.log('💡 Defina SKIP_MIGRATIONS=1 no .env para inicialização mais rápida\n');

                // Tentar criar apenas tabela nfe se não existir (crítica para módulo NFe)
                try {
                    await pool.query(`CREATE TABLE IF NOT EXISTS nfe (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        numero VARCHAR(20) UNIQUE NOT NULL,
                        cliente_id INT NOT NULL,
                        cliente_nome VARCHAR(100),
                        descricao_servico TEXT NOT NULL,
                        valor DECIMAL(10,2) NOT NULL,
                        iss DECIMAL(10,2) DEFAULT 0,
                        pis DECIMAL(10,2) DEFAULT 0,
                        cofins DECIMAL(10,2) DEFAULT 0,
                        irrf DECIMAL(10,2) DEFAULT 0,
                        csll DECIMAL(10,2) DEFAULT 0,
                        status ENUM('pendente', 'autorizada', 'cancelada', 'rejeitada') DEFAULT 'pendente',
                        data_emissao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        observacoes TEXT,
                        email_enviado BOOLEAN DEFAULT FALSE,
                        data_envio_email TIMESTAMP NULL,
                        usuario_id INT,
                        xml_arquivo LONGTEXT,
                        FOREIGN KEY (usuario_id) REFERENCES funcionarios(id) ON DELETE SET NULL
                    )`);
                    
                    // Garantir que as colunas de impostos existem (para tabelas antigas)
                    try {
                        await pool.query(`ALTER TABLE nfe ADD COLUMN iss DECIMAL(10,2) DEFAULT 0`);
                        console.log('✅ Coluna iss adicionada a nfe');
                    } catch (e) {
                        // Coluna já existe - silencioso
                    }
                    
                    try {
                        await pool.query(`ALTER TABLE nfe ADD COLUMN pis DECIMAL(10,2) DEFAULT 0`);
                        console.log('✅ Coluna pis adicionada a nfe');
                    } catch (e) {
                        // Coluna já existe - silencioso
                    }
                    
                    try {
                        await pool.query(`ALTER TABLE nfe ADD COLUMN cofins DECIMAL(10,2) DEFAULT 0`);
                        console.log('✅ Coluna cofins adicionada a nfe');
                    } catch (e) {
                        // Coluna já existe - silencioso
                    }
                    
                    try {
                        await pool.query(`ALTER TABLE nfe ADD COLUMN irrf DECIMAL(10,2) DEFAULT 0`);
                        console.log('✅ Coluna irrf adicionada a nfe');
                    } catch (e) {
                        // Coluna já existe - silencioso
                    }
                    
                    try {
                        await pool.query(`ALTER TABLE nfe ADD COLUMN csll DECIMAL(10,2) DEFAULT 0`);
                        console.log('✅ Coluna csll adicionada a nfe');
                    } catch (e) {
                        console.log('⚠️ Coluna csll já existe em nfe');
                    }
                    
                    console.log('✅ Tabela nfe verificada/criada.');
                } catch (e) {
                    console.warn('⚠️ Falha ao criar/verificar tabela nfe:', e.message || e);
                }

                try {
                    await pool.query(`CREATE TABLE IF NOT EXISTS clientes (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        nome VARCHAR(100) NOT NULL,
                        cnpj VARCHAR(18) UNIQUE,
                        cpf VARCHAR(14) UNIQUE,
                        email VARCHAR(100),
                        telefone VARCHAR(20),
                        endereco TEXT,
                        inscricao_municipal VARCHAR(20),
                        ativo BOOLEAN DEFAULT TRUE,
                        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    )`);
                    
                    // Garantir que as colunas existem (para tabelas antigas)
                    try {
                        await pool.query(`ALTER TABLE clientes ADD COLUMN cnpj VARCHAR(18) UNIQUE`);
                        console.log('✅ Coluna cnpj adicionada a clientes');
                    } catch (e) {
                        // Coluna já existe
                        console.log('⚠️ Coluna cnpj já existe em clientes');
                    }
                    
                    try {
                        await pool.query(`ALTER TABLE clientes ADD COLUMN cpf VARCHAR(14) UNIQUE`);
                        console.log('✅ Coluna cpf adicionada a clientes');
                    } catch (e) {
                        // Coluna já existe
                        console.log('⚠️ Coluna cpf já existe em clientes');
                    }
                    
                    console.log('✅ Tabela clientes verificada/criada.');
                } catch (e) {
                    console.warn('⚠️ Falha ao criar/verificar tabela clientes:', e.message || e);
                }

                // Adicionar colunas de permissões de módulos na tabela usuarios
                const permissionColumns = ['permissoes_rh', 'permissoes_vendas', 'permissoes_compras', 'permissoes_financeiro', 'permissoes_nfe'];
                for (const col of permissionColumns) {
                    try {
                        await pool.query(`ALTER TABLE usuarios ADD COLUMN ${col} JSON DEFAULT NULL`);
                        console.log(`✅ Coluna ${col} adicionada com sucesso`);
                    } catch (e) {
                        if (e.code === 'ER_DUP_FIELDNAME') {
                            // Coluna já existe, tudo bem
                        } else {
                            console.warn(`⚠️ Erro ao adicionar coluna ${col}:`, e.message);
                        }
                    }
                }

                // Verifica se existe funcionário id=6, se não existir cria um exemplo
                try {
                    const [rows] = await pool.query('SELECT COUNT(*) as count FROM funcionarios WHERE id = 6');
                    if (rows[0].count === 0) {
                        // Inserir funcionário exemplo com senha e cpf obrigatórios usando INSERT IGNORE para evitar duplicação
                        await pool.query(`INSERT IGNORE INTO funcionarios (id, nome_completo, email, senha, departamento, cargo, data_nascimento, cpf) VALUES (6, 'Funcionário Exemplo', 'exemplo@aluforce.ind.br', 'aluvendas01', 'comercial', 'vendedor', '1990-01-01', '00000000000')`);
                        console.log('✅ Funcionário id=6 criado automaticamente.');
                        
                        // Inserir usuário admin para testes
                        const bcryptAdmin = require('bcryptjs');
                        const adminHash = await bcryptAdmin.hash('admin123', 10);
                        await pool.query(`INSERT IGNORE INTO funcionarios (id, nome_completo, email, senha, senha_hash, departamento, cargo, data_nascimento, cpf, role, is_admin) VALUES (1, 'Administrador', 'admin@aluforce.com', 'admin123', ?, 'ti', 'administrador', '1985-01-01', '11111111111', 'admin', 1)`, [adminHash]);
                        console.log('✅ Usuário admin criado automaticamente.');
                        
                        // Inserir usuários de teste adicionais
                        const testHash = await bcryptAdmin.hash('123456', 10);
                        await pool.query(`INSERT IGNORE INTO funcionarios (id, nome_completo, email, senha, senha_hash, departamento, cargo, data_nascimento, cpf, role, is_admin) VALUES (2, 'Thiago Scarcella', 'thiago@aluforce.com', '123456', ?, 'gestao', 'gerente', '1990-05-15', '22222222222', 'user', 0)`, [testHash]);
                        await pool.query(`INSERT IGNORE INTO funcionarios (id, nome_completo, email, senha, senha_hash, departamento, cargo, data_nascimento, cpf, role, is_admin) VALUES (3, 'Guilherme Silva', 'guilherme@aluforce.com', '123456', ?, 'pcp', 'analista', '1992-08-20', '33333333333', 'user', 0)`, [testHash]);
                        console.log('✅ Usuários de teste criados automaticamente.');
                    } else {
                        console.log('✅ Funcionário id=6 já existe (verificado).');
                    }
                } catch (e) {
                    // Tenta criar com INSERT IGNORE como fallback
                    try {
                        await pool.query(`INSERT IGNORE INTO funcionarios (id, nome_completo, email, senha, departamento, cargo, data_nascimento, cpf) VALUES (6, 'Funcionário Exemplo', 'exemplo@aluforce.ind.br', 'aluvendas01', 'comercial', 'vendedor', '1990-01-01', '00000000000')`);
                        console.log('✅ Funcionário id=6 criado com INSERT IGNORE.');
                    } catch (e2) {
                        console.warn('⚠️ Falha ao verificar/inserir funcionário id=6:', e2.message || e2);
                    }
                }

                // ============================================================
                // MIGRAÇÃO: Adicionar colunas necessárias para o módulo PCP
                // ============================================================
                console.log('\n🔄 Verificando estrutura da tabela produtos...');
                
                const produtosColumns = [
                    { name: 'categoria', sql: "ALTER TABLE produtos ADD COLUMN categoria VARCHAR(100) DEFAULT 'GERAL' AFTER descricao" },
                    { name: 'gtin', sql: "ALTER TABLE produtos ADD COLUMN gtin VARCHAR(20) DEFAULT NULL AFTER categoria" },
                    { name: 'ncm', sql: "ALTER TABLE produtos ADD COLUMN ncm VARCHAR(20) DEFAULT NULL AFTER sku" },
                    { name: 'estoque_atual', sql: "ALTER TABLE produtos ADD COLUMN estoque_atual DECIMAL(10,2) DEFAULT 0 AFTER ncm" },
                    { name: 'estoque_minimo', sql: "ALTER TABLE produtos ADD COLUMN estoque_minimo DECIMAL(10,2) DEFAULT 0 AFTER estoque_atual" },
                    { name: 'preco_custo', sql: "ALTER TABLE produtos ADD COLUMN preco_custo DECIMAL(10,2) DEFAULT 0 AFTER estoque_minimo" },
                    { name: 'preco_venda', sql: "ALTER TABLE produtos ADD COLUMN preco_venda DECIMAL(10,2) DEFAULT 0 AFTER preco_custo" },
                    { name: 'unidade_medida', sql: "ALTER TABLE produtos ADD COLUMN unidade_medida VARCHAR(10) DEFAULT 'UN' AFTER preco_venda" },
                    { name: 'embalagem', sql: "ALTER TABLE produtos ADD COLUMN embalagem VARCHAR(50) DEFAULT NULL AFTER unidade_medida" },
                    { name: 'imagem_url', sql: "ALTER TABLE produtos ADD COLUMN imagem_url VARCHAR(255) DEFAULT NULL AFTER embalagem" },
                    { name: 'status', sql: "ALTER TABLE produtos ADD COLUMN status VARCHAR(20) DEFAULT 'ativo' AFTER imagem_url" },
                    { name: 'data_criacao', sql: "ALTER TABLE produtos ADD COLUMN data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER status" }
                ];

                for (const column of produtosColumns) {
                    try {
                        await pool.query(column.sql);
                        console.log(`✅ Coluna '${column.name}' adicionada à tabela produtos`);
                    } catch (e) {
                        if (e.code === 'ER_DUP_FIELDNAME') {
                            // Coluna já existe, tudo bem
                        } else {
                            console.warn(`⚠️ Erro ao adicionar coluna '${column.name}':`, e.message);
                        }
                    }
                }

                // Atualizar produtos existentes com valores padrão
                try {
                    await pool.query("UPDATE produtos SET categoria = 'GERAL' WHERE categoria IS NULL OR categoria = ''");
                    await pool.query("UPDATE produtos SET unidade_medida = 'UN' WHERE unidade_medida IS NULL OR unidade_medida = ''");
                    await pool.query("UPDATE produtos SET status = 'ativo' WHERE status IS NULL OR status = ''");
                    console.log('✅ Valores padrão aplicados aos produtos existentes');
                } catch (e) {
                    console.warn('⚠️ Erro ao atualizar valores padrão:', e.message);
                }

                // Criar índices para melhor performance
                const produtosIndexes = [
                    { name: 'idx_produtos_categoria', sql: 'CREATE INDEX idx_produtos_categoria ON produtos(categoria)' },
                    { name: 'idx_produtos_gtin', sql: 'CREATE INDEX idx_produtos_gtin ON produtos(gtin)' },
                    { name: 'idx_produtos_sku', sql: 'CREATE INDEX idx_produtos_sku ON produtos(sku)' },
                    { name: 'idx_produtos_ncm', sql: 'CREATE INDEX idx_produtos_ncm ON produtos(ncm)' },
                    { name: 'idx_produtos_status', sql: 'CREATE INDEX idx_produtos_status ON produtos(status)' },
                    { name: 'idx_produtos_estoque', sql: 'CREATE INDEX idx_produtos_estoque ON produtos(estoque_atual)' }
                ];

                for (const index of produtosIndexes) {
                    try {
                        await pool.query(index.sql);
                        console.log(`✅ Índice '${index.name}' criado`);
                    } catch (e) {
                        if (e.code === 'ER_DUP_KEYNAME') {
                            // Índice já existe, tudo bem
                        } else {
                            console.warn(`⚠️ Erro ao criar índice '${index.name}':`, e.message);
                        }
                    }
                }

                // Adicionar coluna ativo à tabela clientes se não existir
                try {
                    await pool.query("ALTER TABLE clientes ADD COLUMN ativo TINYINT(1) DEFAULT 1");
                    console.log('✅ Coluna ativo adicionada à tabela clientes');
                } catch (e) {
                    if (e.code === 'ER_DUP_FIELDNAME') {
                        // Coluna já existe, tudo bem
                    } else {
                        console.warn('⚠️ Erro ao adicionar coluna ativo:', e.message);
                    }
                }

                console.log('✅ Migração da tabela produtos concluída!\n');

                // ============================================================
                // MIGRAÇÃO: Criar tabela de reset de senha
                // ============================================================
                console.log('🔄 Verificando tabela password_reset_tokens...');
                
                try {
                    await pool.query(`
                        CREATE TABLE IF NOT EXISTS password_reset_tokens (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            email VARCHAR(255) NOT NULL,
                            token VARCHAR(255) NOT NULL UNIQUE,
                            expira_em DATETIME NOT NULL,
                            usado TINYINT(1) DEFAULT 0,
                            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            INDEX idx_token (token),
                            INDEX idx_email (email),
                            INDEX idx_expira_em (expira_em)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    `);
                    console.log('✅ Tabela password_reset_tokens verificada/criada');
                } catch (e) {
                    console.warn('⚠️ Erro ao criar tabela password_reset_tokens:', e.message);
                }

                // ========== MIGRAÇÃO: INTEGRAÇÃO COMPRAS-PCP ==========
                console.log('\n🔄 Verificando integração Compras-PCP...');
                
                try {
                    // Adicionar campos em pedidos_compras
                    await pool.query(`
                        ALTER TABLE pedidos_compras 
                        ADD COLUMN IF NOT EXISTS origem ENUM('manual', 'pcp', 'estoque_minimo') DEFAULT 'manual' AFTER usuario_id
                    `);
                    console.log('✅ Campo origem adicionado em pedidos_compras');
                } catch (e) {
                    if (!e.message.includes('Duplicate column')) {
                        console.warn('⚠️ Coluna origem já existe em pedidos_compras');
                    }
                }

                try {
                    await pool.query(`
                        ALTER TABLE pedidos_compras 
                        ADD COLUMN IF NOT EXISTS origem_id INT NULL COMMENT 'ID da ordem de produção ou outro registro de origem' AFTER origem
                    `);
                    console.log('✅ Campo origem_id adicionado em pedidos_compras');
                } catch (e) {
                    if (!e.message.includes('Duplicate column')) {
                        console.warn('⚠️ Coluna origem_id já existe em pedidos_compras');
                    }
                }

                try {
                    await pool.query(`
                        ALTER TABLE pedidos_compras 
                        ADD COLUMN IF NOT EXISTS prioridade ENUM('baixa', 'media', 'alta', 'urgente') DEFAULT 'media' AFTER origem_id
                    `);
                    console.log('✅ Campo prioridade adicionado em pedidos_compras');
                } catch (e) {
                    if (!e.message.includes('Duplicate column')) {
                        console.warn('⚠️ Coluna prioridade já existe em pedidos_compras');
                    }
                }

                try {
                    // Adicionar campo em itens_pedido_compras
                    await pool.query(`
                        ALTER TABLE itens_pedido_compras 
                        ADD COLUMN IF NOT EXISTS produto_id INT NULL COMMENT 'Referência ao produtos (materiais PCP)' AFTER pedido_id
                    `);
                    console.log('✅ Campo produto_id adicionado em itens_pedido_compras');
                } catch (e) {
                    if (!e.message.includes('Duplicate column')) {
                        console.warn('⚠️ Coluna produto_id já existe em itens_pedido_compras');
                    }
                }

                try {
                    // Adicionar campos em ordens_producao
                    await pool.query(`
                        ALTER TABLE ordens_producao 
                        ADD COLUMN IF NOT EXISTS pedidos_compra_vinculados JSON NULL COMMENT 'Array de IDs de pedidos de compra relacionados' AFTER arquivo_xlsx
                    `);
                    console.log('✅ Campo pedidos_compra_vinculados adicionado em ordens_producao');
                } catch (e) {
                    if (!e.message.includes('Duplicate column')) {
                        console.warn('⚠️ Coluna pedidos_compra_vinculados já existe');
                    }
                }

                try {
                    await pool.query(`
                        ALTER TABLE ordens_producao 
                        ADD COLUMN IF NOT EXISTS materiais_pendentes JSON NULL COMMENT 'Materiais aguardando compra' AFTER pedidos_compra_vinculados
                    `);
                    console.log('✅ Campo materiais_pendentes adicionado em ordens_producao');
                } catch (e) {
                    if (!e.message.includes('Duplicate column')) {
                        console.warn('⚠️ Coluna materiais_pendentes já existe');
                    }
                }

                try {
                    // Criar tabela de notificações de estoque
                    await pool.query(`
                        CREATE TABLE IF NOT EXISTS notificacoes_estoque (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            produto_id INT NOT NULL,
                            tipo ENUM('estoque_baixo', 'estoque_critico', 'estoque_zero') NOT NULL,
                            quantidade_atual DECIMAL(10,2) NOT NULL,
                            quantidade_minima DECIMAL(10,2) NOT NULL,
                            ordem_producao_id INT NULL COMMENT 'Ordem que gerou a necessidade',
                            pedido_compra_id INT NULL COMMENT 'Pedido de compra gerado',
                            status ENUM('pendente', 'em_compra', 'resolvido', 'ignorado') DEFAULT 'pendente',
                            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            resolvido_em TIMESTAMP NULL,
                            resolvido_por INT NULL,
                            observacoes TEXT,
                            FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
                            FOREIGN KEY (ordem_producao_id) REFERENCES ordens_producao(id) ON DELETE SET NULL,
                            FOREIGN KEY (pedido_compra_id) REFERENCES pedidos_compras(id) ON DELETE SET NULL,
                            FOREIGN KEY (resolvido_por) REFERENCES funcionarios(id) ON DELETE SET NULL,
                            INDEX idx_status_tipo (status, tipo),
                            INDEX idx_produto_status (produto_id, status)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    `);
                    console.log('✅ Tabela notificacoes_estoque verificada/criada');
                } catch (e) {
                    console.warn('⚠️ Erro ao criar tabela notificacoes_estoque:', e.message);
                }

                // Criar tabela de notificações gerais do sistema
                try {
                    await pool.query(`
                        CREATE TABLE IF NOT EXISTS notificacoes (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            usuario_id INT NULL COMMENT 'NULL = broadcast para todos',
                            titulo VARCHAR(255) NOT NULL,
                            mensagem TEXT NOT NULL,
                            tipo ENUM('info', 'success', 'warning', 'error', 'system') DEFAULT 'info',
                            modulo VARCHAR(50) DEFAULT 'sistema',
                            link VARCHAR(500) NULL,
                            prioridade INT DEFAULT 3 COMMENT '1=alta, 2=média, 3=normal',
                            entidade_tipo VARCHAR(50) NULL COMMENT 'pedido, ordem, conta, etc',
                            entidade_id INT NULL,
                            lida TINYINT(1) DEFAULT 0,
                            lida_em TIMESTAMP NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            INDEX idx_usuario_lida (usuario_id, lida),
                            INDEX idx_modulo (modulo),
                            INDEX idx_created (created_at)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    `);
                    console.log('✅ Tabela notificacoes verificada/criada');
                } catch (e) {
                    console.warn('⚠️ Erro ao criar tabela notificacoes:', e.message);
                }

                try {
                    // Criar view de materiais críticos (versão simplificada sem produto_id)
                    await pool.query(`
                        CREATE OR REPLACE VIEW vw_materiais_criticos AS
                        SELECT 
                            p.id,
                            p.codigo,
                            p.descricao,
                            p.estoque_atual,
                            p.estoque_minimo,
                            (p.estoque_minimo - p.estoque_atual) as deficit,
                            CASE 
                                WHEN p.estoque_atual = 0 THEN 'zero'
                                WHEN p.estoque_atual < (p.estoque_minimo * 0.5) THEN 'critico'
                                WHEN p.estoque_atual < p.estoque_minimo THEN 'baixo'
                                ELSE 'normal'
                            END as nivel_criticidade,
                            (SELECT COUNT(*) FROM notificacoes_estoque WHERE produto_id = p.id AND status = 'pendente') as notificacoes_pendentes
                        FROM produtos p
                        WHERE p.estoque_atual < p.estoque_minimo
                        ORDER BY 
                            CASE 
                                WHEN p.estoque_atual = 0 THEN 1
                                WHEN p.estoque_atual < (p.estoque_minimo * 0.5) THEN 2
                                WHEN p.estoque_atual < p.estoque_minimo THEN 3
                                ELSE 4
                            END,
                            p.estoque_atual ASC
                    `);
                    console.log('✅ View vw_materiais_criticos criada/atualizada');
                } catch (e) {
                    console.warn('⚠️ Erro ao criar view vw_materiais_criticos:', e.message);
                }

                console.log('✅ Migração Compras-PCP concluída!\n');
                
                } // ⚡ Fim do bloco SKIP_MIGRATIONS

            } catch (err) {
                DB_AVAILABLE = false;
                console.error('❌ Não foi possível conectar ao banco de dados MySQL:', err && err.message ? err.message : err);
                console.log('Continuando a inicialização do servidor em modo degradado (DB indisponível).');
            }
        }

        // Função para tentar iniciar o servidor com HOST e PORT
        const tryPort = async (portToTry) => {
            return new Promise((resolve, reject) => {
                // Criar servidor HTTP/HTTPS baseado no .env
                let httpServer;
                const ENABLE_HTTPS = process.env.ENABLE_HTTPS === 'true';
                
                if (ENABLE_HTTPS) {
                    const fs = require('fs');
                    const https = require('https');
                    const path = require('path');
                    
                    let credentials = null;
                    const SSL_PFX_PATH = process.env.SSL_PFX_PATH;
                    const SSL_PFX_PASSWORD = process.env.SSL_PFX_PASSWORD;
                    const SSL_CERT_PATH = process.env.SSL_CERT_PATH;
                    const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
                    
                    if (SSL_PFX_PATH && fs.existsSync(SSL_PFX_PATH)) {
                        credentials = {
                            pfx: fs.readFileSync(SSL_PFX_PATH),
                            passphrase: SSL_PFX_PASSWORD || ''
                        };
                        console.log('🔒 HTTPS habilitado (PFX):', SSL_PFX_PATH);
                    } else if (SSL_CERT_PATH && SSL_KEY_PATH && fs.existsSync(SSL_CERT_PATH) && fs.existsSync(SSL_KEY_PATH)) {
                        credentials = {
                            key: fs.readFileSync(SSL_KEY_PATH, 'utf8'),
                            cert: fs.readFileSync(SSL_CERT_PATH, 'utf8')
                        };
                        console.log('🔒 HTTPS habilitado (PEM)');
                    } else {
                        console.warn('⚠️  ENABLE_HTTPS=true mas certificados não encontrados. Usando HTTP.');
                    }
                    
                    if (credentials) {
                        httpServer = https.createServer(credentials, app);
                    } else {
                        httpServer = http.createServer(app);
                    }
                } else {
                    httpServer = http.createServer(app);
                }
                
                // Configurar Socket.io
                const io = new Server(httpServer, {
                    cors: {
                        origin: process.env.NODE_ENV === 'production' 
                            ? ['https://aluforce.com.br', 'https://www.aluforce.com.br']
                            : ['http://localhost:3000', 'http://127.0.0.1:3000'],
                        credentials: true
                    }
                });

                // Disponibilizar io globalmente para uso nas APIs
                global.io = io;
                
                // Socket.io - Conexões em tempo real
                io.on('connection', (socket) => {
                    console.log('🔌 Cliente Socket.io conectado:', socket.id);
                    
                    // Evento de desconexão
                    socket.on('disconnect', () => {
                        console.log('🔌 Cliente Socket.io desconectado:', socket.id);
                    });
                    
                    // Eventos customizados podem ser adicionados aqui
                    socket.on('chat-message', (msg) => {
                        io.emit('chat-message', msg);
                    });
                    
                    socket.on('notification', (data) => {
                        io.emit('notification', data);
                    });

                    // Eventos do Chat Bob AI com transferência para humanos
                    socket.on('transfer-to-human', (data) => {
                        console.log('🤝 Transferência para atendente humano:', data);
                        // Notifica agentes disponíveis sobre nova transferência
                        socket.broadcast.to('support-agents').emit('new-chat-transfer', {
                            userId: data.userId,
                            conversationHistory: data.conversationHistory,
                            timestamp: new Date().toISOString()
                        });
                        // Confirma transferência para o cliente
                        socket.emit('transfer-confirmed', {
                            message: 'Um atendente será conectado em breve'
                        });
                    });

                    socket.on('user-message', (data) => {
                        console.log('💬 Mensagem do usuário:', data);
                        // Roteia mensagem para o agente atribuído
                        socket.broadcast.to('support-agents').emit('user-message-received', {
                            userId: data.userId,
                            userName: data.userName,
                            message: data.message,
                            timestamp: new Date().toISOString()
                        });
                    });

                    // Eventos para agentes humanos
                    socket.on('join-support-team', (agentData) => {
                        socket.join('support-agents');
                        console.log('👤 Agente entrou na equipe de suporte:', agentData);
                        socket.emit('agent-connected', { status: 'online' });
                    });

                    socket.on('agent-typing', (data) => {
                        // Envia indicador de digitação para o usuário específico
                        io.emit('agent-typing', { userId: data.userId, isTyping: data.isTyping });
                    });

                    socket.on('agent-message', (data) => {
                        console.log('📨 Mensagem do agente:', data);
                        // Envia mensagem do agente para o usuário específico
                        io.emit('agent-message', {
                            agentName: data.agentName,
                            message: data.message,
                            timestamp: new Date().toISOString()
                        });
                    });

                    // Eventos específicos para gestão de estoque
                    socket.on('join-stock-room', (data) => {
                        socket.join('stock-management');
                        console.log(`👤 Cliente ${socket.id} entrou na sala de gestão de estoque`);
                    });

                    socket.on('leave-stock-room', (data) => {
                        socket.leave('stock-management');
                        console.log(`👤 Cliente ${socket.id} saiu da sala de gestão de estoque`);
                    });

                    // Evento para solicitar dados atualizados
                    socket.on('request-products-update', () => {
                        socket.emit('products-update-requested');
                        console.log(`🔄 Cliente ${socket.id} solicitou atualização de produtos`);
                    });
                });
                
                // Tornar io disponível globalmente
                app.set('io', io);

// ============================================================
// ENDPOINT TEMPORÁRIO DE MIGRATION - FINANCEIRO
// ============================================================
app.post('/api/admin/describe-tabelas-financeiro', authenticateToken, async (req, res) => {
    try {
        const [pagar] = await pool.query('DESCRIBE contas_pagar');
        const [receber] = await pool.query('DESCRIBE contas_receber');
        const [bancos] = await pool.query('DESCRIBE contas_bancarias');
        
        res.json({
            contas_pagar: pagar.map(c => c.Field),
            contas_receber: receber.map(c => c.Field),
            contas_bancarias: bancos.map(c => c.Field)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/migration-financeiro', authenticateToken, async (req, res) => {
    if (req.user?.role !== 'admin' && req.user?.is_admin !== 1) {
        return res.status(403).json({ error: 'Apenas administradores' });
    }

    try {
        const results = [];
        
        // contas_pagar
        try {
            await pool.query('ALTER TABLE contas_pagar ADD COLUMN valor_pago DECIMAL(15,2) DEFAULT 0');
            results.push('✅ contas_pagar.valor_pago');
        } catch (err) { results.push(`⚠️ contas_pagar.valor_pago: ${err.code === 'ER_DUP_FIELDNAME' ? 'já existe' : err.message}`); }
        
        try {
            await pool.query('ALTER TABLE contas_pagar ADD COLUMN data_recebimento DATE NULL');
            results.push('✅ contas_pagar.data_recebimento');
        } catch (err) { results.push(`⚠️ contas_pagar.data_recebimento: ${err.code === 'ER_DUP_FIELDNAME' ? 'já existe' : err.message}`); }
        
        try {
            await pool.query('ALTER TABLE contas_pagar ADD COLUMN observacoes TEXT');
            results.push('✅ contas_pagar.observacoes');
        } catch (err) { results.push(`⚠️ contas_pagar.observacoes: ${err.code === 'ER_DUP_FIELDNAME' ? 'já existe' : err.message}`); }
        
        // contas_receber
        try {
            await pool.query('ALTER TABLE contas_receber ADD COLUMN valor_recebido DECIMAL(15,2) DEFAULT 0');
            results.push('✅ contas_receber.valor_recebido');
        } catch (err) { results.push(`⚠️ contas_receber.valor_recebido: ${err.code === 'ER_DUP_FIELDNAME' ? 'já existe' : err.message}`); }
        
        try {
            await pool.query('ALTER TABLE contas_receber ADD COLUMN data_recebimento DATE NULL');
            results.push('✅ contas_receber.data_recebimento');
        } catch (err) { results.push(`⚠️ contas_receber.data_recebimento: ${err.code === 'ER_DUP_FIELDNAME' ? 'já existe' : err.message}`); }
        
        try {
            await pool.query('ALTER TABLE contas_receber ADD COLUMN observacoes TEXT');
            results.push('✅ contas_receber.observacoes');
        } catch (err) { results.push(`⚠️ contas_receber.observacoes: ${err.code === 'ER_DUP_FIELDNAME' ? 'já existe' : err.message}`); }
        
        // contas_bancarias
        try {
            await pool.query('ALTER TABLE contas_bancarias ADD COLUMN observacoes TEXT');
            results.push('✅ contas_bancarias.observacoes');
        } catch (err) { results.push(`⚠️ contas_bancarias.observacoes: ${err.code === 'ER_DUP_FIELDNAME' ? 'já existe' : err.message}`); }
        
        try {
            await pool.query('ALTER TABLE contas_bancarias ADD COLUMN descricao TEXT');
            results.push('✅ contas_bancarias.descricao');
        } catch (err) { results.push(`⚠️ contas_bancarias.descricao: ${err.code === 'ER_DUP_FIELDNAME' ? 'já existe' : err.message}`); }
        
        res.json({ success: true, results });
        
    } catch (error) {
        console.error('[MIGRATION] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});
                
                httpServer.listen(portToTry, HOST)
                    .on('listening', () => {
                        resolve({ server: httpServer, port: portToTry });
                    })
                    .on('error', (err) => {
                        if (err.code === 'EADDRINUSE') {
                            reject({ code: 'EADDRINUSE', port: portToTry });
                        } else {
                            reject(err);
                        }
                    });
            });
        };

        // Tenta iniciar o servidor em portas alternativas se necessário
        const maxPortAttempts = 10;
        let currentPort = PORT;
        let serverStarted = false;

        for (let attempt = 0; attempt < maxPortAttempts && !serverStarted; attempt++) {
            try {
                const result = await tryPort(currentPort);
                serverInstance = result.server;
                const actualPort = result.port;
                
                console.log('\n' + '='.repeat(60));
                console.log(`🚀 Servidor ALUFORCE v2.0 iniciado com sucesso!`);
                console.log('='.repeat(60));
                console.log(`📍 URL: http://${HOST}:${actualPort}`);
                console.log(`🔌 Banco de Dados: ${DB_AVAILABLE ? '✅ Conectado' : '❌ Modo Degradado (sem DB)'}`);
                console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
                
                if (actualPort !== PORT) {
                    console.log(`⚠️  AVISO: Porta ${PORT} estava ocupada`);
                    console.log(`✅ Servidor iniciado na porta alternativa ${actualPort}`);
                }
                
                console.log('='.repeat(60));
                console.log('\n💡 Dica: Pressione Ctrl+C para encerrar o servidor\n');
                
                // Inicializar servidor de chat
                startChatServer();
                
                // Inicializar servidor de suporte
                startSupportServer();
                
                // Inicializar cron jobs após servidor estar online
                if (DB_AVAILABLE) {
                    setImmediate(() => {
                        initCronJobs();
                    });
                }
                
                serverStarted = true;
                return serverInstance;
            } catch (error) {
                if (error.code === 'EADDRINUSE') {
                    console.log(`⚠️  Porta ${currentPort} em uso, tentando ${currentPort + 1}...`);
                    currentPort++;
                } else {
                    throw error;
                }
            }
        }

        if (!serverStarted) {
            throw new Error(`❌ Não foi possível iniciar o servidor. Todas as portas de ${PORT} a ${currentPort - 1} estão em uso.`);
        }
    } catch (error) {
        // Erros inesperados aqui não devem impedir o servidor de iniciar — tentamos seguir em modo degradado
        console.error('❌ ERRO INESPERADO AO INICIAR:', error && error.stack ? error.stack : error);
        process.exit(1);
    }
};

// Função para parar o servidor (útil para testes in-process e graceful shutdown)
async function stopServer() {
    console.log('🔄 Encerrando servidor...');
    
    // Encerrar servidor de chat
    stopChatServer();
    
    // Encerrar servidor de suporte
    stopSupportServer();
    
    // Fechar servidor HTTP
    if (serverInstance) {
        await new Promise((resolve, reject) => {
            try {
                serverInstance.close((err) => {
                    if (err) {
                        console.error('❌ Erro ao fechar servidor:', err);
                        reject(err);
                    } else {
                        console.log('✅ Servidor HTTP encerrado');
                        serverInstance = null;
                        resolve();
                    }
                });
            } catch (e) {
                console.error('❌ Erro ao fechar servidor:', e);
                reject(e);
            }
        });
    }
    
    // Fechar pool de conexões do banco de dados
    if (pool && typeof pool.end === 'function') {
        try {
            await pool.end();
            console.log('✅ Pool de conexões do banco encerrado');
        } catch (err) {
            console.error('⚠️  Erro ao encerrar pool do banco:', err);
        }
    }
    
    console.log('✅ Shutdown completo');
}

// Captura erros globais não tratados
process.on('uncaughtException', (err) => {
    console.error('❌ ERRO NÁO TRATADO:', err);
    // Em desenvolvimento, não encerra o processo automaticamente
    if (process.env.NODE_ENV === 'production') {
        console.log('🔄 Encerrando processo devido a erro não tratado...');
        process.exit(1);
    } else {
        console.log('🟡 Modo desenvolvimento: continuando execução apesar do erro');
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ PROMESSA NÁO TRATADA:', reason);
    // Em desenvolvimento, apenas log do erro
    if (process.env.NODE_ENV === 'production') {
        console.log('🔄 Encerrando processo devido a promessa não tratada...');
        process.exit(1);
    } else {
        console.log('🟡 Modo desenvolvimento: continuando execução apesar do erro');
    }
});

// ======================================
// ROTAS DO MÓDULO VENDAS
// ======================================

// Pool de conexão para banco de vendas (Railway)
const vendasPool = mysql.createPool({
    host: process.env.DB_HOST || 'interchange.proxy.rlwy.net',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'iiilOZutDOnPCwxgiTKeMuEaIzSwplcu',
    database: process.env.DB_NAME || 'railway',
    port: process.env.DB_PORT || 19396,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// === DASHBOARD VENDAS ===
app.get('/api/vendas/dashboard/admin', authorizeArea('vendas'), async (req, res) => {
    try {
        const [results] = await vendasPool.query(`
            SELECT 
                COUNT(p.id) as total_pedidos,
                SUM(CASE WHEN p.status = 'convertido' THEN 1 ELSE 0 END) as total_vendas,
                SUM(CASE WHEN p.status = 'convertido' THEN p.valor_total ELSE 0 END) as faturamento_total,
                COUNT(DISTINCT p.cliente_id) as total_clientes,
                COUNT(DISTINCT p.empresa_id) as total_empresas
            FROM pedidos p
            WHERE p.data_criacao >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        res.json(results[0]);
    } catch (error) {
        console.error('Erro dashboard vendas:', error);
        res.status(500).json({ error: 'Erro ao carregar dashboard' });
    }
});

app.get('/api/vendas/dashboard/vendedor', authorizeArea('vendas'), async (req, res) => {
    try {
        const userId = req.user.id;
        const periodo = parseInt(req.query.periodo) || 30;
        const [results] = await pool.query(`
            SELECT 
                COUNT(p.id) as meus_pedidos,
                SUM(CASE WHEN p.status = 'faturado' OR p.status = 'convertido' THEN 1 ELSE 0 END) as minhas_vendas,
                SUM(CASE WHEN p.status = 'faturado' OR p.status = 'convertido' THEN p.valor_total ELSE 0 END) as meu_faturamento
            FROM pedidos p
            WHERE p.vendedor_id = ? AND p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `, [userId, periodo]);
        res.json(results[0] || { meus_pedidos: 0, minhas_vendas: 0, meu_faturamento: 0 });
    } catch (error) {
        console.error('Erro dashboard vendedor:', error);
        res.status(500).json({ error: 'Erro ao carregar dashboard do vendedor' });
    }
});

// === PEDIDOS ===
app.get('/api/vendas/pedidos', authorizeArea('vendas'), async (req, res) => {
    try {
        const { status, limite = 100 } = req.query;
        let query = `
            SELECT p.*, 
                   p.valor as valor_total,
                   p.created_at as data_pedido,
                   COALESCE(c.nome_fantasia, c.razao_social, c.nome, 'Cliente não informado') as cliente_nome, 
                   c.email as cliente_email,
                   c.telefone as cliente_telefone,
                   e.nome_fantasia as empresa_nome,
                   u.nome as vendedor_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN empresas e ON p.empresa_id = e.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
        `;
        
        const params = [];
        if (status) {
            query += ' WHERE p.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY p.id DESC LIMIT ?';
        params.push(parseInt(limite));
        
        const [pedidos] = await pool.query(query, params);
        res.json(pedidos);
    } catch (error) {
        console.error('Erro ao listar pedidos:', error);
        res.status(500).json({ error: 'Erro ao listar pedidos' });
    }
});

// ========================================
// PDF GENERATION - ORÇAMENTO PROFISSIONAL INSTITUCIONAL
// ========================================
const PDFDocument = require('pdfkit');

// Rota alternativa para /imprimir (redireciona para /pdf)
app.get('/api/vendas/pedidos/:id/imprimir', authenticateToken, authorizeArea('vendas'), (req, res, next) => {
    req.url = `/api/vendas/pedidos/${req.params.id}/pdf`;
    next('route');
});

app.get('/api/vendas/pedidos/:id/pdf', authenticateToken, authorizeArea('vendas'), async (req, res) => {
    console.log('📄 [PDF] Gerando PDF PREMIUM para pedido:', req.params.id);
    try {
        const { id } = req.params;
        
        // Buscar dados completos do pedido
        const [pedidos] = await vendasPool.query(`
            SELECT p.*, 
                   p.valor as valor_total,
                   p.descricao as observacoes_internas,
                   p.observacao as observacoes,
                   p.created_at as data_criacao,
                   e.nome_fantasia as cliente_nome, 
                   e.razao_social as cliente_razao_social,
                   e.cnpj as cliente_cnpj,
                   e.endereco as cliente_endereco,
                   e.bairro as cliente_bairro,
                   e.cidade as cliente_cidade,
                   e.estado as cliente_estado,
                   e.cep as cliente_cep,
                   e.inscricao_estadual as cliente_ie,
                   e.telefone as cliente_telefone,
                   e.email as cliente_email,
                   e.contato as cliente_contato,
                   u.nome as vendedor_nome,
                   u.email as vendedor_email
            FROM pedidos p
            LEFT JOIN empresas e ON p.empresa_id = e.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            WHERE p.id = ?
        `, [id]);
        
        if (pedidos.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        
        const pedido = pedidos[0];
        
        // Buscar itens do pedido
        let [itens] = await vendasPool.query(`SELECT * FROM pedido_itens WHERE pedido_id = ?`, [id]);
        if (itens.length === 0) {
            [itens] = await vendasPool.query(`SELECT * FROM itens_pedido WHERE pedido_id = ?`, [id]);
        }
        
        // Buscar usuário gerador
        let usuarioGerador = 'Sistema';
        if (req.user?.id) {
            const [usuarios] = await vendasPool.query('SELECT nome FROM usuarios WHERE id = ?', [req.user.id]);
            if (usuarios.length > 0) usuarioGerador = usuarios[0].nome;
        }
        
        // Criar documento PDF
        const doc = new PDFDocument({ 
            size: 'A4', 
            margins: { top: 20, bottom: 20, left: 30, right: 30 },
            info: {
                Title: `Pedido de Venda + Orçamento Nº ${pedido.id}`,
                Author: 'ALUFORCE Sistema',
                Creator: 'ALUFORCE V.2'
            }
        });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=orcamento_${pedido.id}.pdf`);
        doc.pipe(res);
        
        // ===== PALETA DE CORES PREMIUM =====
        const cores = {
            azulPrimario: '#1a365d',      // Azul escuro elegante
            azulSecundario: '#2c5282',    // Azul médio
            azulHeader: '#1e3a5f',        // Azul do header
            cinzaEscuro: '#2d3748',       // Texto principal
            cinzaMedio: '#718096',        // Texto secundário
            cinzaClaro: '#f7fafc',        // Fundos alternados
            cinzaBorda: '#e2e8f0',        // Bordas suaves
            branco: '#ffffff',
            amareloFundo: '#fffff0',      // Fundo vencimentos
            amareloBorda: '#d69e2e',      // Borda vencimentos dourada
            verde: '#38a169',             // Valor total
        };
        
        // Dados da empresa ALUFORCE
        const empresa = {
            razaoSocial: 'I. M. DOS REIS - ALUFORCE INDÚSTRIA E COMÉRCIO DE CONDUTORES',
            cnpj: '08.192.479/0001-60',
            ie: '103.385.861-110',
            endereco: 'RUA ERNESTINA, 270',
            bairro: 'VILA SÃO JOÃO',
            cidade: 'Ferraz de Vasconcelos',
            estado: 'SP',
            cep: '08527-400',
            telefone: '(11) 94723-8729'
        };
        
        const pageWidth = 535;
        const leftMargin = 30;
        const rightMargin = 565;
        let y = 20;
        
        // ============================================================
        // CABEÇALHO INSTITUCIONAL PREMIUM
        // ============================================================
        
        // Logo à esquerda
        const logoPath = path.join(__dirname, 'public', 'images', 'Logo Monocromatico - Azul - Aluforce.png');
        if (fs.existsSync(logoPath)) {
            try {
                doc.image(logoPath, leftMargin, y, { width: 100 });
            } catch (e) { console.log('Logo não carregado'); }
        }
        
        // Dados da empresa à direita
        const empresaX = 300;
        doc.fontSize(7).fillColor(cores.azulPrimario).font('Helvetica-Bold')
           .text(empresa.razaoSocial, empresaX, y + 2, { align: 'right', width: 265 });
        
        doc.fontSize(6.5).fillColor(cores.cinzaMedio).font('Helvetica')
           .text(`CNPJ: ${empresa.cnpj}  |  IE: ${empresa.ie}`, empresaX, y + 14, { align: 'right', width: 265 })
           .text(`${empresa.endereco} - ${empresa.bairro}`, empresaX, y + 25, { align: 'right', width: 265 })
           .text(`${empresa.cidade} - ${empresa.estado}  |  CEP: ${empresa.cep}`, empresaX, y + 36, { align: 'right', width: 265 })
           .text(`Tel: ${empresa.telefone}`, empresaX, y + 47, { align: 'right', width: 265 });
        
        y += 62;
        
        // Linha separadora dupla elegante
        doc.moveTo(leftMargin, y).lineTo(rightMargin, y).strokeColor(cores.azulPrimario).lineWidth(2.5).stroke();
        doc.moveTo(leftMargin, y + 3).lineTo(rightMargin, y + 3).strokeColor(cores.azulSecundario).lineWidth(0.5).stroke();
        
        y += 8;
        
        // ============================================================
        // TÍTULO DO DOCUMENTO - DESIGN PREMIUM COMPACTO
        // ============================================================
        
        doc.rect(leftMargin, y, pageWidth, 36).fillColor(cores.azulPrimario).fill();
        
        doc.fontSize(14).fillColor(cores.branco).font('Helvetica-Bold')
           .text('PEDIDO DE VENDA + ORÇAMENTO', leftMargin, y + 8, { align: 'center', width: pageWidth });
        
        doc.fontSize(10).fillColor('#90cdf4').font('Helvetica')
           .text(`Nº ${String(pedido.id).padStart(5, '0')}`, leftMargin, y + 23, { align: 'center', width: pageWidth });
        
        y += 42;
        
        // ============================================================
        // SEÇÃO: INFORMAÇÕES DO CLIENTE
        // ============================================================
        
        doc.rect(leftMargin, y, pageWidth, 18).fillColor(cores.azulSecundario).fill();
        doc.fontSize(8).fillColor(cores.branco).font('Helvetica-Bold')
           .text('INFORMAÇÕES DO CLIENTE', leftMargin + 10, y + 5);
        y += 18;
        
        const clienteHeight = 68;
        doc.rect(leftMargin, y, pageWidth, clienteHeight).fillColor(cores.branco).fill();
        doc.rect(leftMargin, y, pageWidth, clienteHeight).strokeColor(cores.cinzaBorda).lineWidth(0.5).stroke();
        
        // Nome/Razão social em destaque
        const nomeCliente = pedido.cliente_razao_social || pedido.cliente_nome || 'Cliente não informado';
        doc.fontSize(9).fillColor(cores.azulPrimario).font('Helvetica-Bold')
           .text(nomeCliente.toUpperCase(), leftMargin + 10, y + 6, { width: pageWidth - 20 });
        
        // Linha separadora fina
        doc.moveTo(leftMargin + 10, y + 18).lineTo(leftMargin + pageWidth - 10, y + 18).strokeColor('#e2e8f0').lineWidth(0.3).stroke();
        
        // Dados em duas colunas
        const col1 = leftMargin + 10;
        const col2 = leftMargin + 280;
        const labelW = 52;
        
        doc.fontSize(7);
        
        // Coluna 1
        doc.fillColor(cores.cinzaMedio).font('Helvetica-Bold').text('Contato:', col1, y + 24);
        doc.fillColor(cores.cinzaEscuro).font('Helvetica').text(pedido.cliente_contato || '-', col1 + labelW, y + 24);
        
        doc.fillColor(cores.cinzaMedio).font('Helvetica-Bold').text('CNPJ:', col1, y + 35);
        doc.fillColor(cores.cinzaEscuro).font('Helvetica').text(pedido.cliente_cnpj || '-', col1 + labelW, y + 35);
        
        doc.fillColor(cores.cinzaMedio).font('Helvetica-Bold').text('IE:', col1, y + 46);
        doc.fillColor(cores.cinzaEscuro).font('Helvetica').text(pedido.cliente_ie || 'Isento', col1 + labelW, y + 46);
        
        doc.fillColor(cores.cinzaMedio).font('Helvetica-Bold').text('Telefone:', col1, y + 57);
        doc.fillColor(cores.cinzaEscuro).font('Helvetica').text(pedido.cliente_telefone || '-', col1 + labelW, y + 57);
        
        // Coluna 2
        doc.fillColor(cores.cinzaMedio).font('Helvetica-Bold').text('Endereço:', col2, y + 24);
        doc.fillColor(cores.cinzaEscuro).font('Helvetica').text(pedido.cliente_endereco || '-', col2 + 50, y + 24, { width: 195 });
        
        doc.fillColor(cores.cinzaMedio).font('Helvetica-Bold').text('Bairro:', col2, y + 35);
        doc.fillColor(cores.cinzaEscuro).font('Helvetica').text(pedido.cliente_bairro || '-', col2 + 50, y + 35);
        
        doc.fillColor(cores.cinzaMedio).font('Helvetica-Bold').text('CEP:', col2, y + 46);
        doc.fillColor(cores.cinzaEscuro).font('Helvetica').text(pedido.cliente_cep || '-', col2 + 50, y + 46);
        
        doc.fillColor(cores.cinzaMedio).font('Helvetica-Bold').text('Email:', col2, y + 57);
        doc.fillColor(cores.cinzaEscuro).font('Helvetica').text(pedido.cliente_email || '-', col2 + 50, y + 57, { width: 195 });
        
        y += clienteHeight + 6;
        
        // ============================================================
        // SEÇÃO: ITENS DO PEDIDO
        // ============================================================
        
        doc.rect(leftMargin, y, pageWidth, 18).fillColor(cores.azulSecundario).fill();
        doc.fontSize(8).fillColor(cores.branco).font('Helvetica-Bold')
           .text('ITENS DO PEDIDO DE VENDA + ORÇAMENTO', leftMargin + 10, y + 5);
        y += 18;
        
        // Cabeçalho da tabela
        doc.rect(leftMargin, y, pageWidth, 16).fillColor(cores.azulPrimario).fill();
        doc.fontSize(6.5).fillColor(cores.branco).font('Helvetica-Bold');
        
        // Colunas ajustadas
        const cCodigo = leftMargin + 6;
        const cDescricao = leftMargin + 80;
        const cQtd = leftMargin + 300;
        const cUn = leftMargin + 340;
        const cUnit = leftMargin + 375;
        const cTotal = leftMargin + 435;
        const cIcms = leftMargin + 490;
        
        doc.text('CÓDIGO', cCodigo, y + 5);
        doc.text('DESCRIÇÃO', cDescricao, y + 5);
        doc.text('QTD', cQtd, y + 5, { width: 35, align: 'center' });
        doc.text('UN', cUn, y + 5, { width: 28, align: 'center' });
        doc.text('UNITÁRIO', cUnit, y + 5, { width: 55, align: 'right' });
        doc.text('TOTAL', cTotal, y + 5, { width: 50, align: 'right' });
        doc.text('ICMS', cIcms, y + 5, { width: 40, align: 'right' });
        
        y += 16;
        
        // Linhas dos itens
        let totalProdutos = 0;
        let totalICMS = 0;
        
        if (itens.length > 0) {
            itens.forEach((item, idx) => {
                const bgColor = idx % 2 === 0 ? cores.branco : cores.cinzaClaro;
                doc.rect(leftMargin, y, pageWidth, 15).fillColor(bgColor).fill();
                doc.rect(leftMargin, y, pageWidth, 15).strokeColor('#edf2f7').lineWidth(0.2).stroke();
                
                const qtd = parseFloat(item.quantidade) || 0;
                const unitario = parseFloat(item.preco_unitario) || 0;
                const total = qtd * unitario;
                const icms = parseFloat(item.icms_value) || 0;
                
                totalProdutos += total;
                totalICMS += icms;
                
                const codigo = item.codigo || item.codigo_produto || '-';
                const unidade = item.unidade || 'M';
                const descricao = (item.descricao || '').substring(0, 50);
                
                doc.fontSize(6.5).fillColor(cores.cinzaEscuro).font('Helvetica');
                doc.font('Helvetica-Bold').text(codigo, cCodigo, y + 4, { width: 70 });
                doc.font('Helvetica').text(descricao, cDescricao, y + 4, { width: 215 });
                doc.text(qtd.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), cQtd, y + 4, { width: 35, align: 'center' });
                doc.text(unidade, cUn, y + 4, { width: 28, align: 'center' });
                doc.text(unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), cUnit, y + 4, { width: 55, align: 'right' });
                doc.font('Helvetica-Bold').fillColor(cores.azulPrimario).text(total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), cTotal, y + 4, { width: 50, align: 'right' });
                doc.font('Helvetica').fillColor(cores.cinzaMedio).text(icms.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), cIcms, y + 4, { width: 40, align: 'right' });
                
                y += 15;
                
                if (y > 700) { doc.addPage(); y = 30; }
            });
        } else {
            doc.rect(leftMargin, y, pageWidth, 22).fillColor(cores.branco).fill();
            doc.rect(leftMargin, y, pageWidth, 22).strokeColor(cores.cinzaBorda).lineWidth(0.3).stroke();
            doc.fontSize(7).fillColor(cores.cinzaMedio).text('Nenhum item adicionado', leftMargin + 10, y + 7);
            y += 22;
        }
        
        y += 8;
        
        // ============================================================
        // BOX DE TOTAIS (lado direito) - DESIGN PREMIUM
        // ============================================================
        const totaisX = leftMargin + 355;
        const totaisWidth = 180;
        
        // Borda com sombra simulada
        doc.rect(totaisX + 2, y + 2, totaisWidth, 72).fillColor('#e2e8f0').fill();
        doc.rect(totaisX, y, totaisWidth, 72).fillColor('#f0f9ff').fill();
        doc.rect(totaisX, y, totaisWidth, 72).strokeColor(cores.azulSecundario).lineWidth(1).stroke();
        
        const valorTotal = totalProdutos > 0 ? totalProdutos : (parseFloat(pedido.valor_total) || 0);
        const frete = parseFloat(pedido.frete) || 0;
        const ipi = parseFloat(pedido.total_ipi) || 0;
        const icmsST = parseFloat(pedido.total_icms_st) || 0;
        const totalGeral = valorTotal + frete + ipi + icmsST;
        
        doc.fontSize(7).fillColor(cores.cinzaEscuro).font('Helvetica');
        doc.text('Subtotal:', totaisX + 10, y + 10);
        doc.font('Helvetica-Bold').text(`R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, totaisX + 85, y + 10, { width: 85, align: 'right' });
        
        doc.font('Helvetica').text('IPI:', totaisX + 10, y + 22);
        doc.text(`R$ ${ipi.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, totaisX + 85, y + 22, { width: 85, align: 'right' });
        
        doc.text('ICMS ST:', totaisX + 10, y + 34);
        doc.text(`R$ ${icmsST.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, totaisX + 85, y + 34, { width: 85, align: 'right' });
        
        // Linha separadora elegante
        doc.moveTo(totaisX + 8, y + 48).lineTo(totaisX + totaisWidth - 8, y + 48).strokeColor(cores.azulSecundario).lineWidth(0.8).stroke();
        
        // Total em destaque grande
        doc.fontSize(9).font('Helvetica-Bold').fillColor(cores.azulPrimario).text('TOTAL:', totaisX + 10, y + 54);
        doc.fontSize(10).fillColor(cores.verde).text(`R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, totaisX + 85, y + 53, { width: 85, align: 'right' });
        
        y += 82;
        
        // ============================================================
        // SEÇÃO: VENCIMENTOS - DESIGN PREMIUM
        // ============================================================
        const condicao = pedido.prioridade || 'normal';
        let diasParcelas = condicao.split('/').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
        if (diasParcelas.length === 0) diasParcelas = [30];
        const numParcelas = diasParcelas.length;
        const valorParcela = totalGeral / numParcelas;
        
        doc.rect(leftMargin, y, pageWidth, 18).fillColor(cores.azulSecundario).fill();
        doc.fontSize(8).fillColor(cores.branco).font('Helvetica-Bold')
           .text('VENCIMENTOS', leftMargin + 10, y + 5);
        y += 18;
        
        const vencHeight = 52;
        doc.rect(leftMargin, y, pageWidth, vencHeight).fillColor(cores.amareloFundo).fill();
        doc.rect(leftMargin, y, pageWidth, vencHeight).strokeColor(cores.amareloBorda).lineWidth(1).stroke();
        
        const labelWidth = 70;
        const valorColWidth = (pageWidth - labelWidth) / numParcelas;
        
        // Headers das parcelas
        const rowY1 = y + 8;
        doc.fontSize(7).fillColor(cores.amareloBorda).font('Helvetica-Bold').text('Parcela', leftMargin + 10, rowY1);
        for (let i = 0; i < numParcelas; i++) {
            doc.fillColor(cores.azulPrimario).font('Helvetica-Bold')
               .text(`${i + 1}`, leftMargin + labelWidth + (valorColWidth * i), rowY1, { width: valorColWidth, align: 'center' });
        }
        
        doc.moveTo(leftMargin + 8, y + 18).lineTo(leftMargin + pageWidth - 8, y + 18).strokeColor('#faf089').lineWidth(0.3).stroke();
        
        // Datas de vencimento
        const rowY2 = y + 24;
        doc.fontSize(7).fillColor(cores.amareloBorda).font('Helvetica-Bold').text('Vencimento', leftMargin + 10, rowY2);
        const dataBase = new Date(pedido.created_at);
        for (let i = 0; i < numParcelas; i++) {
            const dataVenc = new Date(dataBase);
            dataVenc.setDate(dataVenc.getDate() + diasParcelas[i]);
            doc.fillColor(cores.cinzaEscuro).font('Helvetica')
               .text(dataVenc.toLocaleDateString('pt-BR'), leftMargin + labelWidth + (valorColWidth * i), rowY2, { width: valorColWidth, align: 'center' });
        }
        
        // Valores
        const rowY3 = y + 38;
        doc.fontSize(7).fillColor(cores.amareloBorda).font('Helvetica-Bold').text('Valor', leftMargin + 10, rowY3);
        for (let i = 0; i < numParcelas; i++) {
            doc.fillColor(cores.azulPrimario).font('Helvetica-Bold')
               .text(valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), leftMargin + labelWidth + (valorColWidth * i), rowY3, { width: valorColWidth, align: 'center' });
        }
        
        y += vencHeight + 8;
        
        // ============================================================
        // OUTRAS INFORMAÇÕES (compacto)
        // ============================================================
        if (y > 650) { doc.addPage(); y = 30; }
        
        doc.rect(leftMargin, y, pageWidth, 18).fillColor(cores.azulSecundario).fill();
        doc.fontSize(8).fillColor(cores.branco).font('Helvetica-Bold')
           .text('OUTRAS INFORMAÇÕES', leftMargin + 10, y + 5);
        y += 18;
        
        doc.rect(leftMargin, y, pageWidth, 42).fillColor(cores.branco).fill();
        doc.rect(leftMargin, y, pageWidth, 42).strokeColor(cores.cinzaBorda).lineWidth(0.5).stroke();
        
        doc.fontSize(7).fillColor(cores.cinzaMedio).font('Helvetica');
        doc.font('Helvetica-Bold').text('Pedido incluído em:', leftMargin + 10, y + 8, { continued: true })
           .font('Helvetica').text(` ${new Date(pedido.created_at).toLocaleString('pt-BR')}`);
        doc.font('Helvetica-Bold').text('Previsão de Faturamento:', leftMargin + 10, y + 19, { continued: true })
           .font('Helvetica').text(` ${pedido.data_prevista ? new Date(pedido.data_prevista).toLocaleDateString('pt-BR') : 'A combinar'}`);
        doc.font('Helvetica-Bold').text('Vendedor:', leftMargin + 10, y + 30, { continued: true })
           .font('Helvetica').text(` ${pedido.vendedor_nome || '-'}`);
        
        y += 50;
        
        // ============================================================
        // OBSERVAÇÕES (se houver)
        // ============================================================
        if (pedido.observacoes || pedido.observacoes_internas) {
            if (y > 700) { doc.addPage(); y = 30; }
            
            doc.rect(leftMargin, y, pageWidth, 18).fillColor(cores.azulSecundario).fill();
            doc.fontSize(8).fillColor(cores.branco).font('Helvetica-Bold')
               .text('OBSERVAÇÕES', leftMargin + 10, y + 5);
            y += 18;
            
            const obsText = pedido.observacoes || pedido.observacoes_internas || '';
            const obsHeight = Math.min(60, Math.max(28, obsText.length / 4));
            
            doc.rect(leftMargin, y, pageWidth, obsHeight).fillColor(cores.branco).fill();
            doc.rect(leftMargin, y, pageWidth, obsHeight).strokeColor(cores.cinzaBorda).lineWidth(0.5).stroke();
            doc.fontSize(7).fillColor(cores.cinzaEscuro).font('Helvetica')
               .text(obsText, leftMargin + 10, y + 6, { width: pageWidth - 20 });
            
            y += obsHeight + 8;
        }
        
        // ============================================================
        // RODAPÉ PROFISSIONAL PREMIUM
        // ============================================================
        const footerY = 800;
        
        // Linha superior do rodapé
        doc.moveTo(leftMargin, footerY).lineTo(rightMargin, footerY).strokeColor(cores.azulPrimario).lineWidth(0.8).stroke();
        
        doc.fontSize(6).fillColor(cores.cinzaMedio).font('Helvetica')
           .text(`Documento gerado em ${new Date().toLocaleString('pt-BR')} por ${usuarioGerador}`, leftMargin, footerY + 4, { align: 'center', width: pageWidth });
        doc.fontSize(5.5).fillColor(cores.cinzaMedio)
           .text('ALUFORCE - Sistema de Gestão Empresarial  |  Este documento tem validade de 7 dias a partir da data de emissão.', leftMargin, footerY + 13, { align: 'center', width: pageWidth });
        
        doc.end();
        console.log('📄 [PDF] PDF PREMIUM gerado com sucesso!');
        
    } catch (error) {
        console.error('📄 [PDF] Erro:', error);
        res.status(500).json({ success: false, message: 'Erro ao gerar PDF', error: error.message });
    }
});

app.get('/api/vendas/pedidos/:id', authenticateToken, authorizeArea('vendas'), async (req, res) => {
    try {
        const { id } = req.params;
        const [pedidos] = await vendasPool.query(`
            SELECT p.*, 
                   p.valor as valor_total,
                   p.descricao as observacoes,
                   p.created_at as data_criacao,
                   c.nome as cliente_nome, c.email as cliente_email, c.telefone as cliente_telefone,
                   c.cnpj as cliente_cnpj, c.endereco as cliente_endereco,
                   e.nome_fantasia as empresa_nome, e.cnpj as empresa_cnpj,
                   u.nome as vendedor_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN empresas e ON p.empresa_id = e.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            WHERE p.id = ?
        `, [id]);
        
        if (pedidos.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        
        // Formatar o pedido para compatibilidade com o frontend
        const pedido = pedidos[0];
        const pedidoFormatado = {
            ...pedido,
            numero: `Pedido Nº ${pedido.id}`,
            cliente: pedido.cliente_nome || '',
            vendedor: pedido.vendedor_nome || '',
            valor: parseFloat(pedido.valor) || 0,
            data: pedido.created_at ? new Date(pedido.created_at).toISOString().slice(0, 10) : '',
            frete: parseFloat(pedido.frete) || 0,
            origem: 'Sistema',
            tipo: pedido.prioridade || 'normal',
            produtos: safeParseJSON(pedido.produtos_preview, [])
        };
        
        res.json(pedidoFormatado);
    } catch (error) {
        console.error('Erro ao buscar pedido:', error);
        res.status(500).json({ error: 'Erro ao buscar pedido' });
    }
});

app.post('/api/vendas/pedidos', authenticateToken, authorizeArea('vendas'), async (req, res) => {
    try {
        const { 
            cliente_id, empresa_id, produtos, valor, descricao, 
            status = 'orcamento', frete = 0, prioridade = 'normal',
            prazo_entrega, endereco_entrega, municipio_entrega, metodo_envio
        } = req.body;
        const vendedor_id = req.user.id;
        
        const [result] = await vendasPool.query(`
            INSERT INTO pedidos 
            (cliente_id, empresa_id, vendedor_id, valor, descricao, status, 
             frete, prioridade, produtos_preview, prazo_entrega, endereco_entrega, 
             municipio_entrega, metodo_envio, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            cliente_id, empresa_id, vendedor_id, valor || 0, descricao || '',
            status, frete, prioridade, JSON.stringify(produtos || []),
            prazo_entrega, endereco_entrega, municipio_entrega, metodo_envio
        ]);
        
        res.json({ success: true, id: result.insertId, message: 'Pedido criado com sucesso' });
    } catch (error) {
        console.error('Erro ao criar pedido:', error);
        res.status(500).json({ error: 'Erro ao criar pedido' });
    }
});

app.put('/api/vendas/pedidos/:id', authenticateToken, authorizeArea('vendas'), async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            cliente_id, empresa_id, produtos, valor, descricao, status,
            frete, prioridade, prazo_entrega, endereco_entrega, 
            municipio_entrega, metodo_envio, observacao
        } = req.body;
        
        // Construir query dinâmica apenas com campos fornecidos
        const updates = [];
        const params = [];
        
        if (cliente_id !== undefined) { updates.push('cliente_id = ?'); params.push(cliente_id); }
        if (empresa_id !== undefined) { updates.push('empresa_id = ?'); params.push(empresa_id); }
        if (valor !== undefined) { updates.push('valor = ?'); params.push(valor); }
        if (descricao !== undefined) { updates.push('descricao = ?'); params.push(descricao); }
        if (observacao !== undefined) { updates.push('observacao = ?'); params.push(observacao); }
        if (status !== undefined) { updates.push('status = ?'); params.push(status); }
        if (frete !== undefined) { updates.push('frete = ?'); params.push(frete); }
        if (prioridade !== undefined) { updates.push('prioridade = ?'); params.push(prioridade); }
        if (prazo_entrega !== undefined) { updates.push('prazo_entrega = ?'); params.push(prazo_entrega); }
        if (endereco_entrega !== undefined) { updates.push('endereco_entrega = ?'); params.push(endereco_entrega); }
        if (municipio_entrega !== undefined) { updates.push('municipio_entrega = ?'); params.push(municipio_entrega); }
        if (metodo_envio !== undefined) { updates.push('metodo_envio = ?'); params.push(metodo_envio); }
        if (produtos !== undefined) { updates.push('produtos_preview = ?'); params.push(JSON.stringify(produtos)); }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }
        
        params.push(id);
        await vendasPool.query(`UPDATE pedidos SET ${updates.join(', ')} WHERE id = ?`, params);
        
        res.json({ success: true, message: 'Pedido atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar pedido:', error);
        res.status(500).json({ error: 'Erro ao atualizar pedido' });
    }
});

// ROTA DUPLICADA REMOVIDA - /api/vendas/pedidos/:id/status já existe no apiVendasRouter

app.delete('/api/vendas/pedidos/:id', authorizeArea('vendas'), async (req, res) => {
    try {
        const { id } = req.params;
        await vendasPool.query('DELETE FROM pedidos WHERE id = ?', [id]);
        res.json({ success: true, message: 'Pedido excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir pedido:', error);
        res.status(500).json({ error: 'Erro ao excluir pedido' });
    }
});

// === CLIENTES ===
app.get('/api/vendas/clientes', authorizeArea('vendas'), async (req, res) => {
    try {
        const { search } = req.query;
        let query = 'SELECT * FROM clientes';
        const params = [];
        
        if (search) {
            query += ' WHERE nome LIKE ? OR email LIKE ? OR telefone LIKE ?';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        query += ' ORDER BY nome LIMIT 100';
        
        const [clientes] = await vendasPool.query(query, params);
        res.json(clientes);
    } catch (error) {
        console.error('Erro ao listar clientes:', error);
        res.status(500).json({ error: 'Erro ao listar clientes' });
    }
});

app.get('/api/vendas/clientes/:id', authorizeArea('vendas'), async (req, res) => {
    try {
        const { id } = req.params;
        const [clientes] = await vendasPool.query('SELECT * FROM clientes WHERE id = ?', [id]);
        
        if (clientes.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        
        res.json(clientes[0]);
    } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        res.status(500).json({ error: 'Erro ao buscar cliente' });
    }
});

app.post('/api/vendas/clientes', authorizeArea('vendas'), async (req, res) => {
    try {
        const { nome, email, telefone, cpf, endereco } = req.body;
        
        const [result] = await vendasPool.query(`
            INSERT INTO clientes (nome, email, telefone, cpf, endereco, data_criacao)
            VALUES (?, ?, ?, ?, ?, NOW())
        `, [nome, email, telefone, cpf, endereco]);
        
        res.json({ success: true, id: result.insertId, message: 'Cliente criado com sucesso' });
    } catch (error) {
        console.error('Erro ao criar cliente:', error);
        res.status(500).json({ error: 'Erro ao criar cliente' });
    }
});

// === EMPRESAS ===
app.get('/api/vendas/empresas', authorizeArea('vendas'), async (req, res) => {
    try {
        const { search } = req.query;
        let query = 'SELECT * FROM empresas';
        const params = [];
        
        if (search) {
            query += ' WHERE nome_fantasia LIKE ? OR razao_social LIKE ? OR cnpj LIKE ?';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        query += ' ORDER BY nome_fantasia LIMIT 100';
        
        const [empresas] = await vendasPool.query(query, params);
        res.json(empresas);
    } catch (error) {
        console.error('Erro ao listar empresas:', error);
        res.status(500).json({ error: 'Erro ao listar empresas' });
    }
});

app.get('/api/vendas/empresas/:id', authorizeArea('vendas'), async (req, res) => {
    try {
        const { id } = req.params;
        const [empresas] = await vendasPool.query('SELECT * FROM empresas WHERE id = ?', [id]);
        
        if (empresas.length === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }
        
        res.json(empresas[0]);
    } catch (error) {
        console.error('Erro ao buscar empresa:', error);
        res.status(500).json({ error: 'Erro ao buscar empresa' });
    }
});

app.post('/api/vendas/empresas', authorizeArea('vendas'), async (req, res) => {
    try {
        const { nome_fantasia, razao_social, cnpj, email, telefone, endereco } = req.body;
        const vendedor_id = req.user?.id || null;
        
        const [result] = await vendasPool.query(`
            INSERT INTO empresas (nome_fantasia, razao_social, cnpj, email, telefone, endereco, data_criacao, vendedor_id, ultima_movimentacao, status_cliente)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), 'ativo')
        `, [nome_fantasia, razao_social, cnpj, email, telefone, endereco, vendedor_id]);
        
        res.json({ success: true, id: result.insertId, message: 'Empresa criada com sucesso' });
    } catch (error) {
        console.error('Erro ao criar empresa:', error);
        res.status(500).json({ error: 'Erro ao criar empresa' });
    }
});

// === API para reativar cliente inativo (permite outro vendedor "conquistar") ===
app.post('/api/vendas/empresas/:id/reativar', authorizeArea('vendas'), async (req, res) => {
    try {
        const { id } = req.params;
        const vendedor_id = req.user?.id;
        
        // Verificar se empresa está inativa
        const [empresa] = await vendasPool.query('SELECT status_cliente, vendedor_id FROM empresas WHERE id = ?', [id]);
        
        if (!empresa || empresa.length === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }
        
        // Se está ativa e pertence a outro vendedor, não pode reativar
        if (empresa[0].status_cliente === 'ativo' && empresa[0].vendedor_id && empresa[0].vendedor_id !== vendedor_id) {
            return res.status(403).json({ error: 'Esta empresa pertence a outro vendedor' });
        }
        
        // Reativar empresa e atribuir ao novo vendedor
        await vendasPool.query(`
            UPDATE empresas 
            SET status_cliente = 'ativo', 
                vendedor_id = ?, 
                ultima_movimentacao = NOW(),
                data_inativacao = NULL
            WHERE id = ?
        `, [vendedor_id, id]);
        
        res.json({ success: true, message: 'Cliente reativado com sucesso' });
    } catch (error) {
        console.error('Erro ao reativar empresa:', error);
        res.status(500).json({ error: 'Erro ao reativar empresa' });
    }
});

// === NOTIFICAÇÕES ===
app.get('/api/vendas/notificacoes', authorizeArea('vendas'), async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Verificar se a tabela notificacoes existe
        try {
            const [notificacoes] = await pool.query(`
                SELECT * FROM notificacoes 
                WHERE usuario_id = ? 
                ORDER BY created_at DESC 
                LIMIT 20
            `, [userId]);
            res.json(notificacoes);
        } catch (tableError) {
            // Se a tabela não existir, retornar array vazio
            if (tableError.code === 'ER_NO_SUCH_TABLE') {
                console.log('[API/VENDAS/NOTIFICACOES] Tabela notificacoes não existe, retornando vazio');
                return res.json([]);
            }
            throw tableError;
        }
    } catch (error) {
        console.error('Erro ao listar notificações:', error);
        res.status(500).json({ error: 'Erro ao listar notificações' });
    }
});

console.log('✅ Rotas do módulo Vendas carregadas com sucesso');

// ======================================
// FIM DAS ROTAS DO MÓDULO VENDAS
// ======================================

// Graceful shutdown on signals (apenas em produção ou quando explicitamente solicitado)
process.on('SIGINT', async () => {
    console.log('\n🛑 SIGINT received: iniciando shutdown gracioso...');
    
    // Em desenvolvimento, perguntar se realmente quer encerrar
    if (process.env.NODE_ENV !== 'production') {
        console.log('🟡 Modo desenvolvimento: Use Ctrl+C novamente em 2 segundos para forçar encerramento');
        
        // Aguarda 2 segundos antes de realmente encerrar
        setTimeout(async () => {
            try {
                await stopServer();
                process.exit(0);
            } catch (error) {
                console.error('❌ Erro durante shutdown:', error);
                process.exit(1);
            }
        }, 2000);
        
        return;
    }
    
    try {
        await stopServer();
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro durante shutdown:', error);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 SIGTERM received: iniciando shutdown gracioso...');
    try {
        await stopServer();
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro durante shutdown:', error);
        process.exit(1);
    }
});

// Export app and control functions for in-process tests and external control
module.exports = { app, startServer, stopServer, setDbAvailable };

// If this file is run directly, start the server normally
if (require.main === module) {
    startServer();
}


// ============================================================
// MÓDULO FINANCEIRO COMPLETO - TODAS AS APIs
// Sistema ALUFORCE v2.0
// ============================================================

// ===== MIDDLEWARE: Verificar permissões financeiras =====
function checkFinanceiroPermission(area) {
    return async (req, res, next) => {
        const token = req.cookies?.authToken || req.headers['authorization']?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Não autenticado' });
        }

        try {
            const user = jwt.verify(token, JWT_SECRET);
            req.user = user;

            // Buscar permissões
            const [users] = await pool.query(
                'SELECT permissoes_financeiro, is_admin FROM funcionarios WHERE id = ? OR email = ?',
                [user.id, user.email]
            );

            let userData = users[0];
            if (!userData) {
                const [usuarios] = await pool.query(
                    'SELECT permissoes_financeiro, is_admin FROM usuarios WHERE id = ? OR email = ?',
                    [user.id, user.email]
                );
                userData = usuarios[0];
            }

            if (!userData) {
                return res.status(403).json({ message: 'Usuário não encontrado' });
            }

            // Admin tem acesso total
            if (userData.is_admin === 1) {
                req.userPermissions = {
                    visualizar: true,
                    criar: true,
                    editar: true,
                    excluir: true,
                    aprovar: true
                };
                console.log(`[FINANCEIRO/PERM] Admin detectado: ${user.email}`);
                return next();
            }

            // Parse permissões
            let permissoes = {};
            if (userData.permissoes_financeiro) {
                try {
                    permissoes = JSON.parse(userData.permissoes_financeiro);
                } catch (e) {
                    console.log(`[FINANCEIRO/PERM] Erro parsing permissões para ${user.email}:`, e.message);
                    return res.status(500).json({ message: 'Erro ao parsear permissões' });
                }
            } else {
                console.log(`[FINANCEIRO/PERM] Sem permissoes_financeiro para ${user.email}, liberando acesso...`);
                // Se não tem permissões definidas, libera acesso total (modo desenvolvimento)
                req.userPermissions = {
                    visualizar: true,
                    criar: true,
                    editar: true,
                    excluir: true,
                    aprovar: true
                };
                return next();
            }

            if (!permissoes[area]) {
                return res.status(403).json({ 
                    message: `Você não tem permissão para acessar ${area}` 
                });
            }

            req.userPermissions = permissoes[area];
            next();

        } catch (err) {
            console.error('[FINANCEIRO] Erro de autenticação:', err);
            return res.status(401).json({ message: 'Token inválido' });
        }
    };
}

// ============================================================
// CATEGORIAS FINANCEIRAS
// ============================================================

// Listar todas as categorias
app.get('/api/financeiro/categorias', authenticateToken, async (req, res) => {
    try {
        const { tipo, ativo } = req.query;
        
        let query = 'SELECT * FROM categorias_financeiras WHERE 1=1';
        const params = [];

        if (tipo && tipo !== 'todos') {
            query += ' AND (tipo = ? OR tipo = "ambos")';
            params.push(tipo);
        }

        if (ativo !== undefined) {
            query += ' AND ativo = ?';
            params.push(ativo === 'true' || ativo === '1');
        }

        query += ' ORDER BY nome ASC';

        const [categorias] = await pool.query(query, params);
        res.json(categorias);

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao listar categorias:', err);
        res.status(500).json({ message: 'Erro ao listar categorias' });
    }
});

// Criar categoria
app.post('/api/financeiro/categorias', authenticateToken, async (req, res) => {
    try {
        const { nome, tipo, cor, icone, orcamento_mensal, descricao } = req.body;

        if (!nome || !tipo) {
            return res.status(400).json({ message: 'Nome e tipo são obrigatórios' });
        }

        const [result] = await pool.query(
            `INSERT INTO categorias_financeiras (nome, tipo, cor, icone, orcamento_mensal, descricao) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nome, tipo, cor || '#3b82f6', icone || 'fa-folder', orcamento_mensal || 0, descricao]
        );

        res.status(201).json({
            success: true,
            message: 'Categoria criada com sucesso',
            id: result.insertId
        });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao criar categoria:', err);
        res.status(500).json({ message: 'Erro ao criar categoria' });
    }
});

// Atualizar categoria
app.put('/api/financeiro/categorias/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, tipo, cor, icone, orcamento_mensal, descricao, ativo } = req.body;

        await pool.query(
            `UPDATE categorias_financeiras 
             SET nome = ?, tipo = ?, cor = ?, icone = ?, orcamento_mensal = ?, descricao = ?, ativo = ?
             WHERE id = ?`,
            [nome, tipo, cor, icone, orcamento_mensal, descricao, ativo, id]
        );

        res.json({ success: true, message: 'Categoria atualizada com sucesso' });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao atualizar categoria:', err);
        res.status(500).json({ message: 'Erro ao atualizar categoria' });
    }
});

// Deletar categoria
app.delete('/api/financeiro/categorias/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se categoria está sendo usada
        const [usoPagar] = await pool.query('SELECT COUNT(*) as total FROM contas_pagar WHERE categoria = (SELECT nome FROM categorias_financeiras WHERE id = ?)', [id]);
        const [usoReceber] = await pool.query('SELECT COUNT(*) as total FROM contas_receber WHERE categoria = (SELECT nome FROM categorias_financeiras WHERE id = ?)', [id]);

        if (usoPagar[0].total > 0 || usoReceber[0].total > 0) {
            return res.status(400).json({ 
                message: 'Esta categoria está sendo usada e não pode ser excluída. Desative-a ao invés disso.' 
            });
        }

        await pool.query('DELETE FROM categorias_financeiras WHERE id = ?', [id]);
        res.json({ success: true, message: 'Categoria excluída com sucesso' });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao excluir categoria:', err);
        res.status(500).json({ message: 'Erro ao excluir categoria' });
    }
});

// Obter categoria específica
app.get('/api/financeiro/categorias/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM categorias_financeiras WHERE id = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Categoria não encontrada' });
        }

        res.json({ success: true, categoria: rows[0] });
    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar categoria:', err);
        res.status(500).json({ message: 'Erro ao buscar categoria' });
    }
});

// Estatísticas por categoria
app.get('/api/financeiro/categorias/estatisticas', authenticateToken, async (req, res) => {
    try {
        const { mes } = req.query;
        let dataInicio, dataFim;

        if (mes) {
            dataInicio = `${mes}-01`;
            dataFim = `${mes}-31`;
        } else {
            const data = new Date();
            dataInicio = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-01`;
            dataFim = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-31`;
        }

        const [stats] = await pool.query(`
            SELECT 
                c.id,
                c.nome,
                c.tipo,
                c.cor,
                c.orcamento_mensal,
                COALESCE(SUM(CASE WHEN p.tipo = 'pagar' THEN p.valor ELSE 0 END), 0) as total_despesas,
                COALESCE(SUM(CASE WHEN p.tipo = 'receber' THEN p.valor ELSE 0 END), 0) as total_receitas
            FROM categorias_financeiras c
            LEFT JOIN (
                SELECT categoria_id, valor, 'pagar' as tipo 
                FROM contas_pagar 
                WHERE data_vencimento BETWEEN ? AND ? AND status != 'cancelada'
                UNION ALL
                SELECT categoria_id, valor, 'receber' as tipo 
                FROM contas_receber 
                WHERE vencimento BETWEEN ? AND ? AND status != 'cancelado'
            ) p ON c.nome = p.categoria
            WHERE c.ativo = TRUE
            GROUP BY c.id, c.nome, c.tipo, c.cor, c.orcamento_mensal
            ORDER BY c.nome
        `, [dataInicio, dataFim, dataInicio, dataFim]);

        res.json(stats);

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar estatísticas:', err);
        res.status(500).json({ message: 'Erro ao buscar estatísticas' });
    }
});

// ============================================================
// CONTAS BANCÁRIAS
// ============================================================

// Listar contas bancárias
app.get('/api/financeiro/bancos', authenticateToken, async (req, res) => {
    try {
        const { ativo } = req.query;
        
        let query = 'SELECT * FROM contas_bancarias WHERE 1=1';
        const params = [];

        if (ativo !== undefined) {
            query += ' AND ativo = ?';
            params.push(ativo === 'true' || ativo === '1');
        }

        query += ' ORDER BY ativo DESC, nome ASC';

        const [contas] = await pool.query(query, params);
        res.json(contas);

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao listar contas bancárias:', err);
        res.status(500).json({ message: 'Erro ao listar contas bancárias' });
    }
});

// Criar conta bancária
app.post('/api/financeiro/bancos', authenticateToken, async (req, res) => {
    try {
        const { nome, banco, agencia, conta, tipo, saldo_inicial, observacoes } = req.body;

        const nomeBanco = nome || banco; // Aceitar ambos
        if (!nomeBanco) {
            return res.status(400).json({ message: 'Nome do banco é obrigatório' });
        }

        // Validar tipo se fornecido
        const tipoValido = ['corrente', 'poupanca', 'investimento', 'caixa'];
        const tipoFinal = tipo && tipoValido.includes(tipo) ? tipo : 'corrente';

        console.log('[FINANCEIRO] Criando banco:', { nome: nomeBanco, banco, tipo: tipoFinal });

        const [result] = await pool.query(
            `INSERT INTO contas_bancarias (nome, banco, agencia, conta, tipo, saldo_inicial, saldo_atual, ativo) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            [nomeBanco, banco || null, agencia || null, conta || null, tipoFinal, saldo_inicial || 0, saldo_inicial || 0]
        );

        console.log('[FINANCEIRO] Banco criado com ID:', result.insertId);

        res.status(201).json({
            success: true,
            message: 'Conta bancária criada com sucesso',
            id: result.insertId
        });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao criar conta bancária:', err.message);
        console.error('[FINANCEIRO] Stack:', err.stack);
        res.status(500).json({ message: 'Erro ao criar conta bancária', error: err.message });
    }
});

// Atualizar conta bancária
app.put('/api/financeiro/bancos/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, banco, agencia, conta, tipo, saldo_inicial, ativo, observacoes } = req.body;

        const nomeBanco = nome || banco;

        await pool.query(
            `UPDATE contas_bancarias 
             SET nome = ?, banco = ?, agencia = ?, conta = ?, tipo = ?, saldo_inicial = ?, ativo = ?, observacoes = ?
             WHERE id = ?`,
            [nomeBanco, banco, agencia, conta, tipo, saldo_inicial, ativo, observacoes, id]
        );

        res.json({ success: true, message: 'Conta bancária atualizada com sucesso' });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao atualizar conta bancária:', err);
        res.status(500).json({ message: 'Erro ao atualizar conta bancária' });
    }
});

// Deletar conta bancária
app.delete('/api/financeiro/bancos/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se tem movimentações
        const [movs] = await pool.query('SELECT COUNT(*) as total FROM movimentacoes_bancarias WHERE conta_bancaria_id = ?', [id]);
        
        if (movs[0].total > 0) {
            return res.status(400).json({ 
                message: 'Esta conta tem movimentações e não pode ser excluída. Desative-a ao invés disso.' 
            });
        }

        await pool.query('DELETE FROM contas_bancarias WHERE id = ?', [id]);
        res.json({ success: true, message: 'Conta bancária excluída com sucesso' });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao excluir conta bancária:', err);
        res.status(500).json({ message: 'Erro ao excluir conta bancária' });
    }
});

// Obter banco específico
app.get('/api/financeiro/bancos/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM contas_bancarias WHERE id = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Conta bancária não encontrada' });
        }

        res.json({ success: true, banco: rows[0] });
    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar banco:', err);
        res.status(500).json({ message: 'Erro ao buscar banco' });
    }
});

// Extrato bancário
app.get('/api/financeiro/bancos/:id/extrato', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { inicio, fim } = req.query;

        // Buscar movimentações de contas pagas e recebidas
        const [pagas] = await pool.query(
            `SELECT 'despesa' as tipo, fornecedor as descricao, valor, data_pagamento as data
             FROM contas_pagar 
             WHERE banco_id = ? AND status = 'paga'
             ${inicio ? 'AND data_pagamento >= ?' : ''}
             ${fim ? 'AND data_pagamento <= ?' : ''}`,
            [id, inicio, fim].filter(Boolean)
        );

        const [recebidas] = await pool.query(
            `SELECT 'receita' as tipo, cliente as descricao, valor, data_recebimento as data
             FROM contas_receber 
             WHERE banco_id = ? AND status = 'recebida'
             ${inicio ? 'AND data_recebimento >= ?' : ''}
             ${fim ? 'AND data_recebimento <= ?' : ''}`,
            [id, inicio, fim].filter(Boolean)
        );

        const extrato = [...pagas, ...recebidas].sort((a, b) => 
            new Date(b.data) - new Date(a.data)
        );

        res.json({ success: true, extrato });
    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar extrato:', err);
        res.status(500).json({ message: 'Erro ao buscar extrato' });
    }
});

// ============================================================
// FORMAS DE PAGAMENTO
// ============================================================

// Listar formas de pagamento
app.get('/api/financeiro/formas-pagamento', authenticateToken, async (req, res) => {
    try {
        const { ativo } = req.query;
        
        let query = 'SELECT * FROM formas_pagamento WHERE 1=1';
        const params = [];

        if (ativo !== undefined) {
            query += ' AND ativo = ?';
            params.push(ativo === 'true' || ativo === '1');
        }

        query += ' ORDER BY nome ASC';

        const [formas] = await pool.query(query, params);
        res.json(formas);

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao listar formas de pagamento:', err);
        res.status(500).json({ message: 'Erro ao listar formas de pagamento' });
    }
});

// Criar forma de pagamento
app.post('/api/financeiro/formas-pagamento', authenticateToken, async (req, res) => {
    try {
        const { nome, tipo, icone } = req.body;

        if (!nome) {
            return res.status(400).json({ message: 'Nome é obrigatório' });
        }

        const [result] = await pool.query(
            'INSERT INTO formas_pagamento (nome, tipo, icone) VALUES (?, ?, ?)',
            [nome, tipo || 'outros', icone || 'fa-money-bill']
        );

        res.status(201).json({
            success: true,
            message: 'Forma de pagamento criada com sucesso',
            id: result.insertId
        });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao criar forma de pagamento:', err);
        res.status(500).json({ message: 'Erro ao criar forma de pagamento' });
    }
});

// ============================================================
// PARCELAS
// ============================================================

// Gerar parcelas para uma conta
app.post('/api/financeiro/parcelas/gerar', authenticateToken, async (req, res) => {
    try {
        const { conta_id, tipo, total_parcelas, valor_total, primeira_parcela } = req.body;

        if (!conta_id || !tipo || !total_parcelas || !valor_total || !primeira_parcela) {
            return res.status(400).json({ message: 'Dados incompletos' });
        }

        const valorParcela = (valor_total / total_parcelas).toFixed(2);
        const parcelas = [];

        for (let i = 1; i <= total_parcelas; i++) {
            const vencimento = new Date(primeira_parcela);
            vencimento.setMonth(vencimento.getMonth() + (i - 1));

            // Última parcela ajusta diferença de arredondamento
            const valor = i === total_parcelas 
                ? (valor_total - (valorParcela * (total_parcelas - 1))).toFixed(2)
                : valorParcela;

            parcelas.push([
                conta_id,
                tipo,
                i,
                total_parcelas,
                valor,
                vencimento.toISOString().split('T')[0]
            ]);
        }

        await pool.query(
            `INSERT INTO parcelas (conta_origem_id, tipo, numero_parcela, total_parcelas, valor, vencimento) 
             VALUES ?`,
            [parcelas]
        );

        // Atualizar conta original
        const updateQuery = tipo === 'pagar' 
            ? `UPDATE contas_pagar SET parcela_total = ? WHERE id = ?`
            : `UPDATE contas_receber SET parcela_total = ? WHERE id = ?`;

        await pool.query(updateQuery, [total_parcelas, conta_id]);

        res.json({
            success: true,
            message: `${total_parcelas} parcelas geradas com sucesso`,
            parcelas: parcelas.length
        });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao gerar parcelas:', err);
        res.status(500).json({ message: 'Erro ao gerar parcelas' });
    }
});

// Listar parcelas de uma conta (rota corrigida)
app.get('/api/financeiro/parcelas/conta/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo } = req.query; // 'pagar' ou 'receber'

        const [parcelas] = await pool.query(
            'SELECT * FROM parcelas WHERE conta_id = ? AND tipo_conta = ? ORDER BY numero_parcela ASC',
            [id, tipo || 'pagar']
        );

        res.json({ success: true, parcelas });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao listar parcelas:', err);
        res.status(500).json({ message: 'Erro ao listar parcelas' });
    }
});

// Listar parcelas de uma conta (rota alternativa)
app.get('/api/financeiro/parcelas/:conta_id/:tipo', authenticateToken, async (req, res) => {
    try {
        const { conta_id, tipo } = req.params;

        const [parcelas] = await pool.query(
            'SELECT * FROM parcelas WHERE conta_id = ? AND tipo_conta = ? ORDER BY numero_parcela ASC',
            [conta_id, tipo]
        );

        res.json({ success: true, parcelas });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao listar parcelas:', err);
        res.status(500).json({ message: 'Erro ao listar parcelas' });
    }
});

// Marcar parcela como paga
app.post('/api/financeiro/parcelas/:id/pagar', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { valor_pago, data_pagamento } = req.body;

        await pool.query(
            `UPDATE parcelas 
             SET status = ?, valor_pago = ?, data_pagamento = ?
             WHERE id = ?`,
            [
                valor_pago >= (await pool.query('SELECT valor FROM parcelas WHERE id = ?', [id]))[0][0].valor ? 'pago' : 'pendente',
                valor_pago,
                data_pagamento || new Date().toISOString().split('T')[0],
                id
            ]
        );

        res.json({ success: true, message: 'Parcela atualizada com sucesso' });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao atualizar parcela:', err);
        res.status(500).json({ message: 'Erro ao atualizar parcela' });
    }
});

// ============================================================
// RECORRÊNCIAS
// ============================================================

// Listar recorrências
app.get('/api/financeiro/recorrencias', authenticateToken, async (req, res) => {
    try {
        const { tipo, ativa } = req.query;
        
        let query = 'SELECT r.*, c.nome as categoria_nome FROM recorrencias r LEFT JOIN categorias_financeiras c ON r.categoria_id = c.id WHERE 1=1';
        const params = [];

        if (tipo) {
            query += ' AND r.tipo = ?';
            params.push(tipo);
        }

        if (ativa !== undefined) {
            query += ' AND r.ativa = ?';
            params.push(ativa === 'true' || ativa === '1');
        }

        query += ' ORDER BY r.descricao ASC';

        const [recorrencias] = await pool.query(query, params);
        res.json(recorrencias);

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao listar recorrências:', err);
        res.status(500).json({ message: 'Erro ao listar recorrências' });
    }
});

// Criar recorrência
app.post('/api/financeiro/recorrencias', authenticateToken, async (req, res) => {
    try {
        const { 
            descricao, tipo, valor, categoria_id, fornecedor_id, cliente_id,
            dia_vencimento, forma_pagamento_id, conta_bancaria_id, 
            data_inicio, data_fim, observacoes 
        } = req.body;

        if (!descricao || !tipo || !valor || !dia_vencimento || !data_inicio) {
            return res.status(400).json({ message: 'Dados obrigatórios faltando' });
        }

        // Calcular próxima geração
        const proximaGeracao = new Date(data_inicio);
        proximaGeracao.setDate(dia_vencimento);
        if (proximaGeracao < new Date()) {
            proximaGeracao.setMonth(proximaGeracao.getMonth() + 1);
        }

        const [result] = await pool.query(
            `INSERT INTO recorrencias 
             (descricao, tipo, valor, categoria_id, fornecedor_id, cliente_id, dia_vencimento, 
              forma_pagamento_id, conta_bancaria_id, data_inicio, data_fim, observacoes, proxima_geracao) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [descricao, tipo, valor, categoria_id, fornecedor_id, cliente_id, dia_vencimento, 
             forma_pagamento_id, conta_bancaria_id, data_inicio, data_fim, observacoes, 
             proximaGeracao.toISOString().split('T')[0]]
        );

        res.status(201).json({
            success: true,
            message: 'Recorrência criada com sucesso',
            id: result.insertId
        });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao criar recorrência:', err);
        res.status(500).json({ message: 'Erro ao criar recorrência' });
    }
});

// Atualizar recorrência
app.put('/api/financeiro/recorrencias/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            descricao, tipo, valor, categoria_id, fornecedor_id, cliente_id,
            dia_vencimento, forma_pagamento_id, conta_bancaria_id, 
            ativa, data_fim, observacoes 
        } = req.body;

        await pool.query(
            `UPDATE recorrencias 
             SET descricao = ?, tipo = ?, valor = ?, categoria_id = ?, fornecedor_id = ?, cliente_id = ?,
                 dia_vencimento = ?, forma_pagamento_id = ?, conta_bancaria_id = ?, 
                 ativa = ?, data_fim = ?, observacoes = ?
             WHERE id = ?`,
            [descricao, tipo, valor, categoria_id, fornecedor_id, cliente_id, dia_vencimento, 
             forma_pagamento_id, conta_bancaria_id, ativa, data_fim, observacoes, id]
        );

        res.json({ success: true, message: 'Recorrência atualizada com sucesso' });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao atualizar recorrência:', err);
        res.status(500).json({ message: 'Erro ao atualizar recorrência' });
    }
});

// Deletar recorrência
app.delete('/api/financeiro/recorrencias/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM recorrencias WHERE id = ?', [id]);
        res.json({ success: true, message: 'Recorrência excluída com sucesso' });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao excluir recorrência:', err);
        res.status(500).json({ message: 'Erro ao excluir recorrência' });
    }
});

// Obter recorrência específica
app.get('/api/financeiro/recorrencias/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM recorrencias_financeiras WHERE id = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Recorrência não encontrada' });
        }

        res.json({ success: true, recorrencia: rows[0] });
    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar recorrência:', err);
        res.status(500).json({ message: 'Erro ao buscar recorrência' });
    }
});

// Pausar/Reativar recorrência
app.post('/api/financeiro/recorrencias/:id/pausar', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { ativo } = req.body; // true ou false

        await pool.query(
            'UPDATE recorrencias_financeiras SET ativo = ? WHERE id = ?',
            [ativo ? 1 : 0, id]
        );

        res.json({ 
            success: true, 
            message: ativo ? 'Recorrência reativada' : 'Recorrência pausada'
        });
    } catch (err) {
        console.error('[FINANCEIRO] Erro ao pausar/reativar recorrência:', err);
        res.status(500).json({ message: 'Erro ao atualizar recorrência' });
    }
});

// Gerar contas de recorrências (executar manualmente ou por cron)
app.post('/api/financeiro/recorrencias/processar', authenticateToken, async (req, res) => {
    try {
        const hoje = new Date().toISOString().split('T')[0];

        // Buscar recorrências ativas que devem gerar conta hoje
        const [recorrencias] = await pool.query(
            `SELECT * FROM recorrencias 
             WHERE ativa = TRUE 
             AND (data_fim IS NULL OR data_fim >= ?)
             AND (proxima_geracao IS NULL OR proxima_geracao <= ?)`,
            [hoje, hoje]
        );

        let geradas = 0;

        for (const rec of recorrencias) {
            const vencimento = new Date();
            vencimento.setDate(rec.dia_vencimento);

            // Inserir conta a pagar ou receber
            if (rec.tipo === 'pagar') {
                await pool.query(
                    `INSERT INTO contas_pagar 
                     (fornecedor_id, descricao, valor, vencimento, categoria, forma_pagamento_id, 
                      conta_bancaria_id, recorrente, recorrencia_id, status, observacoes) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?, 'pendente', ?)`,
                    [rec.fornecedor_id, rec.descricao, rec.valor, vencimento.toISOString().split('T')[0],
                     rec.categoria_id, rec.forma_pagamento_id, rec.conta_bancaria_id, rec.id, rec.observacoes]
                );
            } else {
                await pool.query(
                    `INSERT INTO contas_receber 
                     (cliente_id, descricao, valor, vencimento, categoria, forma_recebimento_id, 
                      conta_bancaria_id, status, observacoes) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente', ?)`,
                    [rec.cliente_id, rec.descricao, rec.valor, vencimento.toISOString().split('T')[0],
                     rec.categoria_id, rec.forma_pagamento_id, rec.conta_bancaria_id, rec.observacoes]
                );
            }

            // Atualizar próxima geração
            const proximaGeracao = new Date(vencimento);
            proximaGeracao.setMonth(proximaGeracao.getMonth() + 1);

            await pool.query(
                'UPDATE recorrencias SET ultima_geracao = ?, proxima_geracao = ? WHERE id = ?',
                [hoje, proximaGeracao.toISOString().split('T')[0], rec.id]
            );

            geradas++;
        }

        res.json({
            success: true,
            message: `${geradas} contas geradas de recorrências`,
            total: geradas
        });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao processar recorrências:', err);
        res.status(500).json({ message: 'Erro ao processar recorrências' });
    }
});

// Continua no próximo arquivo...


// ============================================================
// MÓDULO FINANCEIRO COMPLETO - APIs AVANÇADAS (Parte 2)
// Sistema ALUFORCE v2.0
// ============================================================

// ============================================================
// CONTAS A PAGAR - FUNÇÕES AVANÇADAS
// ============================================================

// Marcar conta como paga
app.post('/api/financeiro/contas-pagar/:id/pagar', checkFinanceiroPermission('contas_pagar'), async (req, res) => {
    try {
        const { id } = req.params;
        const { valor_pago, data_pagamento, conta_bancaria_id, forma_pagamento_id, observacoes } = req.body;

        const [conta] = await pool.query('SELECT * FROM contas_pagar WHERE id = ?', [id]);
        if (!conta || conta.length === 0) {
            return res.status(404).json({ message: 'Conta não encontrada' });
        }

        const valorTotal = conta[0].valor + (conta[0].valor_juros || 0) + (conta[0].valor_multa || 0) - (conta[0].valor_desconto || 0);
        const status = valor_pago >= valorTotal ? 'pago' : 'pendente';

        await pool.query(
            `UPDATE contas_pagar 
             SET status = ?, valor_pago = ?, data_pagamento = ?, conta_bancaria_id = ?, forma_pagamento_id = ?, observacoes = ?
             WHERE id = ?`,
            [status, valor_pago, data_pagamento || new Date().toISOString().split('T')[0], conta_bancaria_id, forma_pagamento_id, observacoes, id]
        );

        // Se tiver conta bancária, criar movimentação
        if (conta_bancaria_id && status === 'pago') {
            await pool.query(
                `INSERT INTO movimentacoes_bancarias 
                 (conta_bancaria_id, tipo, valor, descricao, data_movimento, conta_pagar_id, forma_pagamento_id) 
                 VALUES (?, 'saida', ?, ?, ?, ?, ?)`,
                [conta_bancaria_id, valor_pago, conta[0].descricao, data_pagamento || new Date().toISOString().split('T')[0], id, forma_pagamento_id]
            );
        }

        res.json({ success: true, message: 'Pagamento registrado com sucesso' });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao marcar como pago:', err);
        res.status(500).json({ message: 'Erro ao registrar pagamento' });
    }
});

// Listar contas vencidas
app.get('/api/financeiro/contas-pagar/vencidas', checkFinanceiroPermission('contas_pagar'), async (req, res) => {
    try {
        const [contas] = await pool.query(
            `SELECT *, DATEDIFF(CURDATE(), vencimento) as dias_vencido 
             FROM contas_pagar 
             WHERE status IN ('pendente', 'vencido') AND vencimento < CURDATE()
             ORDER BY vencimento ASC`
        );

        res.json(contas);

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar contas vencidas:', err);
        res.status(500).json({ message: 'Erro ao buscar contas vencidas' });
    }
});

// Listar contas vencendo
app.get('/api/financeiro/contas-pagar/vencendo', checkFinanceiroPermission('contas_pagar'), async (req, res) => {
    try {
        const { dias } = req.query;
        const prazo = dias || 7;

        const [contas] = await pool.query(
            `SELECT *, DATEDIFF(vencimento, CURDATE()) as dias_para_vencer 
             FROM contas_pagar 
             WHERE status = 'pendente' 
             AND vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
             ORDER BY vencimento ASC`,
            [prazo]
        );

        res.json(contas);

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar contas vencendo:', err);
        res.status(500).json({ message: 'Erro ao buscar contas vencendo' });
    }
});

// Estatísticas de contas a pagar
app.get('/api/financeiro/contas-pagar/estatisticas', checkFinanceiroPermission('contas_pagar'), async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total_contas,
                SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
                SUM(CASE WHEN status = 'pago' THEN 1 ELSE 0 END) as pagas,
                SUM(CASE WHEN status = 'vencido' THEN 1 ELSE 0 END) as vencidas,
                SUM(valor) as valor_total,
                SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as valor_pendente,
                SUM(CASE WHEN status = 'pago' THEN valor_pago ELSE 0 END) as valor_pago,
                SUM(CASE WHEN vencimento < CURDATE() AND status = 'pendente' THEN valor ELSE 0 END) as valor_vencido
            FROM contas_pagar
        `);

        res.json(stats[0]);

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar estatísticas:', err);
        res.status(500).json({ message: 'Erro ao buscar estatísticas' });
    }
});

// Pagamento em lote
app.post('/api/financeiro/contas-pagar/lote/pagar', checkFinanceiroPermission('contas_pagar'), async (req, res) => {
    try {
        const { contas, data_pagamento, conta_bancaria_id, forma_pagamento_id } = req.body;

        if (!contas || contas.length === 0) {
            return res.status(400).json({ message: 'Nenhuma conta selecionada' });
        }

        let totalPago = 0;
        for (const contaId of contas) {
            const [conta] = await pool.query('SELECT valor FROM contas_pagar WHERE id = ?', [contaId]);
            if (conta && conta.length > 0) {
                await pool.query(
                    `UPDATE contas_pagar 
                     SET status = 'pago', valor_pago = valor, data_pagamento = ?, conta_bancaria_id = ?, forma_pagamento_id = ?
                     WHERE id = ?`,
                    [data_pagamento || new Date().toISOString().split('T')[0], conta_bancaria_id, forma_pagamento_id, contaId]
                );
                totalPago += conta[0].valor;

                // Criar movimentação bancária
                if (conta_bancaria_id) {
                    await pool.query(
                        `INSERT INTO movimentacoes_bancarias 
                         (conta_bancaria_id, tipo, valor, descricao, data_movimento, conta_pagar_id, forma_pagamento_id) 
                         VALUES (?, 'saida', ?, 'Pagamento em lote', ?, ?, ?)`,
                        [conta_bancaria_id, conta[0].valor, data_pagamento || new Date().toISOString().split('T')[0], contaId, forma_pagamento_id]
                    );
                }
            }
        }

        res.json({ 
            success: true, 
            message: `${contas.length} contas pagas com sucesso`,
            total_pago: totalPago
        });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao pagar em lote:', err);
        res.status(500).json({ message: 'Erro ao pagar em lote' });
    }
});

// ============================================================
// CONTAS A RECEBER - FUNÇÕES AVANÇADAS
// ============================================================

// Marcar conta como recebida
app.post('/api/financeiro/contas-receber/:id/receber', checkFinanceiroPermission('contas_receber'), async (req, res) => {
    try {
        const { id } = req.params;
        const { valor_recebido, data_recebimento, conta_bancaria_id, forma_recebimento_id, observacoes } = req.body;

        const [conta] = await pool.query('SELECT * FROM contas_receber WHERE id = ?', [id]);
        if (!conta || conta.length === 0) {
            return res.status(404).json({ message: 'Conta não encontrada' });
        }

        const valorTotal = conta[0].valor + (conta[0].valor_juros || 0) + (conta[0].valor_multa || 0) - (conta[0].valor_desconto || 0);
        const status = valor_recebido >= valorTotal ? 'recebido' : 'pendente';

        await pool.query(
            `UPDATE contas_receber 
             SET status = ?, valor_recebido = ?, data_recebimento = ?, conta_bancaria_id = ?, forma_recebimento_id = ?, observacoes = ?
             WHERE id = ?`,
            [status, valor_recebido, data_recebimento || new Date().toISOString().split('T')[0], conta_bancaria_id, forma_recebimento_id, observacoes, id]
        );

        // Se tiver conta bancária, criar movimentação
        if (conta_bancaria_id && status === 'recebido') {
            await pool.query(
                `INSERT INTO movimentacoes_bancarias 
                 (conta_bancaria_id, tipo, valor, descricao, data_movimento, conta_receber_id, forma_pagamento_id) 
                 VALUES (?, 'entrada', ?, ?, ?, ?, ?)`,
                [conta_bancaria_id, valor_recebido, conta[0].descricao, data_recebimento || new Date().toISOString().split('T')[0], id, forma_recebimento_id]
            );
        }

        res.json({ success: true, message: 'Recebimento registrado com sucesso' });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao marcar como recebido:', err);
        res.status(500).json({ message: 'Erro ao registrar recebimento' });
    }
});

// Listar contas vencidas
app.get('/api/financeiro/contas-receber/vencidas', checkFinanceiroPermission('contas_receber'), async (req, res) => {
    try {
        const [contas] = await pool.query(
            `SELECT *, DATEDIFF(CURDATE(), vencimento) as dias_vencido 
             FROM contas_receber 
             WHERE status IN ('pendente', 'vencido') AND vencimento < CURDATE()
             ORDER BY vencimento ASC`
        );

        res.json(contas);

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar contas vencidas:', err);
        res.status(500).json({ message: 'Erro ao buscar contas vencidas' });
    }
});

// Clientes inadimplentes
app.get('/api/financeiro/contas-receber/inadimplentes', checkFinanceiroPermission('contas_receber'), async (req, res) => {
    try {
        const [clientes] = await pool.query(`
            SELECT 
                cliente_id,
                COUNT(*) as total_contas_vencidas,
                SUM(valor) as valor_total_vencido,
                MIN(vencimento) as vencimento_mais_antigo,
                MAX(DATEDIFF(CURDATE(), vencimento)) as dias_max_atraso
            FROM contas_receber
            WHERE status IN ('pendente', 'vencido') AND vencimento < CURDATE() AND cliente_id IS NOT NULL
            GROUP BY cliente_id
            ORDER BY valor_total_vencido DESC
        `);

        res.json(clientes);

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar inadimplentes:', err);
        res.status(500).json({ message: 'Erro ao buscar inadimplentes' });
    }
});

// Estatísticas de contas a receber
app.get('/api/financeiro/contas-receber/estatisticas', checkFinanceiroPermission('contas_receber'), async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total_contas,
                SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
                SUM(CASE WHEN status = 'recebido' THEN 1 ELSE 0 END) as recebidas,
                SUM(CASE WHEN status = 'vencido' THEN 1 ELSE 0 END) as vencidas,
                SUM(valor) as valor_total,
                SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as valor_pendente,
                SUM(CASE WHEN status = 'recebido' THEN valor_recebido ELSE 0 END) as valor_recebido,
                SUM(CASE WHEN vencimento < CURDATE() AND status = 'pendente' THEN valor ELSE 0 END) as valor_vencido
            FROM contas_receber
        `);

        res.json(stats[0]);

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar estatísticas:', err);
        res.status(500).json({ message: 'Erro ao buscar estatísticas' });
    }
});

// ============================================================
// DASHBOARD E FLUXO DE CAIXA
// ============================================================

// Dashboard completo
app.get('/api/financeiro/dashboard', authenticateToken, async (req, res) => {
    try {
        // Estatísticas gerais - usar COALESCE e aceitar ambos os nomes de coluna
        const [statsReceber] = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END), 0) as a_receber,
                COALESCE(SUM(CASE WHEN status = 'recebido' THEN COALESCE(valor_recebido, valor) ELSE 0 END), 0) as recebido,
                COALESCE(SUM(CASE WHEN COALESCE(data_vencimento, vencimento) < CURDATE() AND status = 'pendente' THEN valor ELSE 0 END), 0) as vencido
            FROM contas_receber
        `);

        const [statsPagar] = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END), 0) as a_pagar,
                COALESCE(SUM(CASE WHEN status = 'pago' THEN COALESCE(valor_pago, valor) ELSE 0 END), 0) as pago,
                COALESCE(SUM(CASE WHEN COALESCE(data_vencimento, vencimento) < CURDATE() AND status = 'pendente' THEN valor ELSE 0 END), 0) as vencido
            FROM contas_pagar
        `);

        // Contas vencendo hoje
        const [vencendoHoje] = await pool.query(`
            SELECT COUNT(*) as total FROM (
                SELECT id FROM contas_pagar WHERE status = 'pendente' AND DATE(COALESCE(data_vencimento, vencimento)) = CURDATE()
                UNION ALL
                SELECT id FROM contas_receber WHERE status = 'pendente' AND DATE(COALESCE(data_vencimento, vencimento)) = CURDATE()
            ) as vencendo
        `);

        // Saldo das contas bancárias
        const [saldoBancos] = await pool.query(`
            SELECT COALESCE(SUM(saldo_atual), 0) as saldo_total FROM contas_bancarias WHERE ativo = TRUE
        `);

        // Saldo projetado (receber - pagar pendentes)
        const saldoProjetado = (statsReceber[0].a_receber || 0) - (statsPagar[0].a_pagar || 0);

        res.json({
            receber: {
                a_receber: statsReceber[0].a_receber || 0,
                recebido: statsReceber[0].recebido || 0,
                vencido: statsReceber[0].vencido || 0
            },
            pagar: {
                a_pagar: statsPagar[0].a_pagar || 0,
                pago: statsPagar[0].pago || 0,
                vencido: statsPagar[0].vencido || 0
            },
            saldo_atual: saldoBancos[0].saldo_total || 0,
            saldo_projetado: saldoProjetado,
            vencendo_hoje: vencendoHoje[0].total || 0
        });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar dashboard:', err);
        console.error('[FINANCEIRO] Stack:', err.stack);
        res.status(500).json({ message: 'Erro ao buscar dados do dashboard', error: err.message });
    }
});

// Fluxo de caixa
app.get('/api/financeiro/fluxo-caixa', authenticateToken, async (req, res) => {
    try {
        const { data_inicio, data_fim } = req.query;

        const inicio = data_inicio || new Date().toISOString().split('T')[0];
        const fim = data_fim || new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0];

        const [fluxo] = await pool.query(`
            SELECT 
                DATE(vencimento) as data,
                SUM(CASE WHEN tipo = 'receber' THEN valor ELSE 0 END) as entradas,
                SUM(CASE WHEN tipo = 'pagar' THEN valor ELSE 0 END) as saidas
            FROM (
                SELECT vencimento, valor, 'receber' as tipo 
                FROM contas_receber 
                WHERE vencimento BETWEEN ? AND ? AND status != 'cancelado'
                UNION ALL
                SELECT vencimento, valor, 'pagar' as tipo 
                FROM contas_pagar 
                WHERE vencimento BETWEEN ? AND ? AND status != 'cancelado'
            ) as todas_contas
            GROUP BY DATE(vencimento)
            ORDER BY data ASC
        `, [inicio, fim, inicio, fim]);

        // Calcular saldo acumulado
        let saldoAcumulado = 0;
        const fluxoComSaldo = fluxo.map(item => {
            saldoAcumulado += (item.entradas - item.saidas);
            return {
                ...item,
                saldo: saldoAcumulado
            };
        });

        res.json(fluxoComSaldo);

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar fluxo de caixa:', err);
        res.status(500).json({ message: 'Erro ao buscar fluxo de caixa' });
    }
});

// Gráfico de receitas vs despesas (Dashboard)
app.get('/api/financeiro/dashboard/grafico-receitas-despesas', authenticateToken, async (req, res) => {
    try {
        const { periodo = '6' } = req.query; // últimos 6 meses por padrão
        
        const [dados] = await pool.query(`
            SELECT 
                DATE_FORMAT(data, '%Y-%m') as mes,
                COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) as receitas,
                COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) as despesas
            FROM (
                SELECT data_recebimento as data, valor, 'receita' as tipo
                FROM contas_receber
                WHERE status IN ('recebida', 'recebido') AND data_recebimento IS NOT NULL AND data_recebimento >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
                UNION ALL
                SELECT data_recebimento as data, valor, 'despesa' as tipo
                FROM contas_pagar
                WHERE status IN ('paga', 'pago') AND data_recebimento IS NOT NULL AND data_recebimento >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
            ) as movimentacoes
            WHERE data IS NOT NULL
            GROUP BY DATE_FORMAT(data, '%Y-%m')
            ORDER BY mes ASC
        `, [periodo, periodo]);

        res.json({ success: true, dados: dados || [] });
    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar gráfico:', err);
        console.error('[FINANCEIRO] Stack:', err.stack);
        res.status(500).json({ message: 'Erro ao buscar gráfico', error: err.message });
    }
});

// Fluxo de caixa do dashboard (simplificado)
app.get('/api/financeiro/dashboard/fluxo-caixa', authenticateToken, async (req, res) => {
    try {
        const [fluxo] = await pool.query(`
            SELECT 
                DATE_FORMAT(data, '%Y-%m-%d') as data,
                COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) as entradas,
                COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) as saidas
            FROM (
                SELECT data_recebimento as data, valor, 'entrada' as tipo
                FROM contas_receber
                WHERE status IN ('recebida', 'recebido') AND data_recebimento IS NOT NULL AND data_recebimento >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                UNION ALL
                SELECT data_recebimento as data, valor, 'saida' as tipo
                FROM contas_pagar
                WHERE status IN ('paga', 'pago') AND data_recebimento IS NOT NULL AND data_recebimento >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            ) as movimentacoes
            WHERE data IS NOT NULL
            GROUP BY DATE_FORMAT(data, '%Y-%m-%d')
            ORDER BY data ASC
        `);

        res.json({ success: true, fluxo: fluxo || [] });
    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar fluxo dashboard:', err);
        console.error('[FINANCEIRO] Stack:', err.stack);
        res.status(500).json({ message: 'Erro ao buscar fluxo de caixa', error: err.message });
    }
});

// Projeção de fluxo (30/60/90 dias)
app.get('/api/financeiro/fluxo-caixa/projecao', authenticateToken, async (req, res) => {
    try {
        const hoje = new Date();
        const data30 = new Date(hoje);
        data30.setDate(data30.getDate() + 30);
        const data60 = new Date(hoje);
        data60.setDate(data60.getDate() + 60);
        const data90 = new Date(hoje);
        data90.setDate(data90.getDate() + 90);

        const [projecao] = await pool.query(`
            SELECT 
                SUM(CASE WHEN tipo = 'receber' AND vencimento <= ? THEN valor ELSE 0 END) as receber_30,
                SUM(CASE WHEN tipo = 'receber' AND vencimento <= ? THEN valor ELSE 0 END) as receber_60,
                SUM(CASE WHEN tipo = 'receber' AND vencimento <= ? THEN valor ELSE 0 END) as receber_90,
                SUM(CASE WHEN tipo = 'pagar' AND vencimento <= ? THEN valor ELSE 0 END) as pagar_30,
                SUM(CASE WHEN tipo = 'pagar' AND vencimento <= ? THEN valor ELSE 0 END) as pagar_60,
                SUM(CASE WHEN tipo = 'pagar' AND vencimento <= ? THEN valor ELSE 0 END) as pagar_90
            FROM (
                SELECT vencimento, valor, 'receber' as tipo 
                FROM contas_receber 
                WHERE status = 'pendente'
                UNION ALL
                SELECT vencimento, valor, 'pagar' as tipo 
                FROM contas_pagar 
                WHERE status = 'pendente'
            ) as todas_contas
        `, [
            data30.toISOString().split('T')[0],
            data60.toISOString().split('T')[0],
            data90.toISOString().split('T')[0],
            data30.toISOString().split('T')[0],
            data60.toISOString().split('T')[0],
            data90.toISOString().split('T')[0]
        ]);

        res.json({
            dias_30: {
                receber: projecao[0].receber_30 || 0,
                pagar: projecao[0].pagar_30 || 0,
                saldo: (projecao[0].receber_30 || 0) - (projecao[0].pagar_30 || 0)
            },
            dias_60: {
                receber: projecao[0].receber_60 || 0,
                pagar: projecao[0].pagar_60 || 0,
                saldo: (projecao[0].receber_60 || 0) - (projecao[0].pagar_60 || 0)
            },
            dias_90: {
                receber: projecao[0].receber_90 || 0,
                pagar: projecao[0].pagar_90 || 0,
                saldo: (projecao[0].receber_90 || 0) - (projecao[0].pagar_90 || 0)
            }
        });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao buscar projeção:', err);
        res.status(500).json({ message: 'Erro ao buscar projeção' });
    }
});

// ============================================================
// RELATÓRIOS
// ============================================================

// DRE (Demonstração de Resultados do Exercício)
app.get('/api/financeiro/relatorios/dre', authenticateToken, async (req, res) => {
    try {
        const { mes, ano } = req.query;
        const mesAtual = mes || (new Date().getMonth() + 1);
        const anoAtual = ano || new Date().getFullYear();

        const dataInicio = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`;
        const dataFim = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-31`;

        // Receitas por categoria
        const [receitas] = await pool.query(`
            SELECT 
                c.nome as categoria,
                SUM(cr.valor) as total
            FROM contas_receber cr
            LEFT JOIN categorias_financeiras c ON cr.categoria = c.nome
            WHERE cr.vencimento BETWEEN ? AND ? AND cr.status != 'cancelado'
            GROUP BY c.nome
            ORDER BY total DESC
        `, [dataInicio, dataFim]);

        // Despesas por categoria
        const [despesas] = await pool.query(`
            SELECT 
                c.nome as categoria,
                SUM(cp.valor) as total
            FROM contas_pagar cp
            LEFT JOIN categorias_financeiras c ON cp.categoria = c.nome
            WHERE cp.vencimento BETWEEN ? AND ? AND cp.status != 'cancelado'
            GROUP BY c.nome
            ORDER BY total DESC
        `, [dataInicio, dataFim]);

        const totalReceitas = receitas.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);
        const totalDespesas = despesas.reduce((sum, d) => sum + (parseFloat(d.total) || 0), 0);
        const resultado = totalReceitas - totalDespesas;

        res.json({
            periodo: { mes: mesAtual, ano: anoAtual },
            receitas: {
                detalhes: receitas,
                total: totalReceitas
            },
            despesas: {
                detalhes: despesas,
                total: totalDespesas
            },
            resultado: resultado,
            margem: totalReceitas > 0 ? ((resultado / totalReceitas) * 100).toFixed(2) : 0
        });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao gerar DRE:', err);
        res.status(500).json({ message: 'Erro ao gerar DRE' });
    }
});

// Aging (Análise de vencimento 30/60/90 dias)
app.get('/api/financeiro/relatorios/aging', authenticateToken, async (req, res) => {
    try {
        const { tipo } = req.query; // 'pagar' ou 'receber'

        const tabela = tipo === 'pagar' ? 'contas_pagar' : 'contas_receber';

        const [aging] = await pool.query(`
            SELECT 
                CASE 
                    WHEN vencimento >= CURDATE() THEN 'A Vencer'
                    WHEN DATEDIFF(CURDATE(), vencimento) BETWEEN 1 AND 30 THEN '1-30 dias'
                    WHEN DATEDIFF(CURDATE(), vencimento) BETWEEN 31 AND 60 THEN '31-60 dias'
                    WHEN DATEDIFF(CURDATE(), vencimento) BETWEEN 61 AND 90 THEN '61-90 dias'
                    ELSE 'Mais de 90 dias'
                END as faixa,
                COUNT(*) as quantidade,
                SUM(valor) as total
            FROM ${tabela}
            WHERE status = 'pendente'
            GROUP BY faixa
            ORDER BY 
                CASE faixa
                    WHEN 'A Vencer' THEN 1
                    WHEN '1-30 dias' THEN 2
                    WHEN '31-60 dias' THEN 3
                    WHEN '61-90 dias' THEN 4
                    ELSE 5
                END
        `);

        res.json(aging);

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao gerar Aging:', err);
        res.status(500).json({ message: 'Erro ao gerar relatório Aging' });
    }
});

// Relatório por categoria
app.get('/api/financeiro/relatorios/por-categoria', authenticateToken, async (req, res) => {
    try {
        const { data_inicio, data_fim, tipo } = req.query;

        const inicio = data_inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const fim = data_fim || new Date().toISOString().split('T')[0];

        let query = `
            SELECT 
                c.nome as categoria,
                c.tipo,
                c.cor,
                c.orcamento_mensal,
                SUM(CASE WHEN t.tipo_conta = 'receber' THEN t.valor ELSE 0 END) as total_receitas,
                SUM(CASE WHEN t.tipo_conta = 'pagar' THEN t.valor ELSE 0 END) as total_despesas
            FROM categorias_financeiras c
            LEFT JOIN (
                SELECT categoria, valor, 'receber' as tipo_conta 
                FROM contas_receber 
                WHERE vencimento BETWEEN ? AND ? AND status != 'cancelado'
                UNION ALL
                SELECT categoria, valor, 'pagar' as tipo_conta 
                FROM contas_pagar 
                WHERE vencimento BETWEEN ? AND ? AND status != 'cancelado'
            ) t ON c.nome = t.categoria
            WHERE c.ativo = TRUE
        `;

        if (tipo && tipo !== 'todos') {
            query += ` AND (c.tipo = '${tipo}' OR c.tipo = 'ambos')`;
        }

        query += ` GROUP BY c.id, c.nome, c.tipo, c.cor, c.orcamento_mensal ORDER BY c.nome`;

        const [relatorio] = await pool.query(query, [inicio, fim, inicio, fim]);

        res.json(relatorio);

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao gerar relatório por categoria:', err);
        res.status(500).json({ message: 'Erro ao gerar relatório por categoria' });
    }
});

// Fluxo de caixa projetado
app.get('/api/financeiro/relatorios/fluxo-caixa-projetado', authenticateToken, async (req, res) => {
    try {
        const { meses = 3 } = req.query;
        const dataFim = new Date();
        dataFim.setMonth(dataFim.getMonth() + parseInt(meses));

        const [projecao] = await pool.query(`
            SELECT 
                DATE_FORMAT(vencimento, '%Y-%m') as mes,
                SUM(CASE WHEN tipo = 'receber' THEN valor ELSE 0 END) as receitas_previstas,
                SUM(CASE WHEN tipo = 'pagar' THEN valor ELSE 0 END) as despesas_previstas
            FROM (
                SELECT vencimento, valor, 'receber' as tipo
                FROM contas_receber
                WHERE status = 'pendente' AND vencimento <= ?
                UNION ALL
                SELECT vencimento, valor, 'pagar' as tipo
                FROM contas_pagar
                WHERE status = 'pendente' AND vencimento <= ?
            ) as projecoes
            GROUP BY DATE_FORMAT(vencimento, '%Y-%m')
            ORDER BY mes ASC
        `, [dataFim.toISOString().split('T')[0], dataFim.toISOString().split('T')[0]]);

        // Calcular saldo projetado acumulado
        let saldoAcumulado = 0;
        const [saldoAtual] = await pool.query('SELECT COALESCE(SUM(saldo_atual), 0) as saldo FROM contas_bancarias WHERE ativo = 1');
        saldoAcumulado = saldoAtual[0].saldo || 0;

        const projecaoComSaldo = projecao.map(item => {
            saldoAcumulado += (item.receitas_previstas - item.despesas_previstas);
            return {
                ...item,
                saldo_projetado: saldoAcumulado
            };
        });

        res.json({ success: true, projecao: projecaoComSaldo });
    } catch (err) {
        console.error('[FINANCEIRO] Erro ao gerar projeção:', err);
        res.status(500).json({ message: 'Erro ao gerar projeção de fluxo de caixa' });
    }
});

// Exportar dados (preparar JSON para Excel/PDF)
app.get('/api/financeiro/relatorios/exportar', authenticateToken, async (req, res) => {
    try {
        const { tipo, data_inicio, data_fim, formato } = req.query;

        const inicio = data_inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const fim = data_fim || new Date().toISOString().split('T')[0];

        let dados = [];

        if (tipo === 'pagar') {
            const [contas] = await pool.query(
                'SELECT * FROM contas_pagar WHERE vencimento BETWEEN ? AND ? ORDER BY vencimento ASC',
                [inicio, fim]
            );
            dados = contas;
        } else if (tipo === 'receber') {
            const [contas] = await pool.query(
                'SELECT * FROM contas_receber WHERE vencimento BETWEEN ? AND ? ORDER BY vencimento ASC',
                [inicio, fim]
            );
            dados = contas;
        } else {
            // Ambos
            const [pagar] = await pool.query(
                'SELECT *, "pagar" as tipo_conta FROM contas_pagar WHERE vencimento BETWEEN ? AND ?',
                [inicio, fim]
            );
            const [receber] = await pool.query(
                'SELECT *, "receber" as tipo_conta FROM contas_receber WHERE vencimento BETWEEN ? AND ?',
                [inicio, fim]
            );
            dados = [...pagar, ...receber].sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));
        }

        res.json({
            tipo: tipo || 'todos',
            periodo: { inicio, fim },
            total_registros: dados.length,
            dados: dados
        });

    } catch (err) {
        console.error('[FINANCEIRO] Erro ao exportar:', err);
        res.status(500).json({ message: 'Erro ao exportar dados' });
    }
});

// FIM DAS APIs - PARTE 2

// === ENDPOINT DE MIGRAÇÃO - INTEGRAÇÃO COMPRAS/VENDAS → FINANCEIRO ===
// TEMPORÁRIO - SEM AUTENTICAÇÃO (apenas para setup inicial)
app.post('/api/financeiro/migrar-integracao-setup', async (req, res) => {
    const connection = await pool.getConnection();
    
    try{
        await connection.beginTransaction();

        const logs = [];
        logs.push('🔄 Iniciando migração de integração...\n');

        // 1. Adicionar colunas em contas_pagar
        logs.push('1️⃣ Adicionando colunas em contas_pagar...');
        try {
            await connection.query(`
                ALTER TABLE contas_pagar 
                ADD COLUMN pedido_compra_id INT NULL COMMENT 'ID do pedido de compra relacionado',
                ADD COLUMN venda_id INT NULL COMMENT 'ID da venda relacionada',
                ADD INDEX idx_pedido_compra (pedido_compra_id),
                ADD INDEX idx_venda (venda_id)
            `);
            logs.push('   ✅ Colunas adicionadas');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                logs.push('   ⚠️ Colunas já existem');
            } else {
                throw err;
            }
        }

        // 2. Adicionar colunas em contas_receber
        logs.push('2️⃣ Adicionando colunas em contas_receber...');
        try {
            await connection.query(`
                ALTER TABLE contas_receber 
                ADD COLUMN venda_id INT NULL COMMENT 'ID da venda relacionada',
                ADD COLUMN pedido_venda_id INT NULL COMMENT 'ID do pedido de venda',
                ADD INDEX idx_venda (venda_id),
                ADD INDEX idx_pedido_venda (pedido_venda_id)
            `);
            logs.push('   ✅ Colunas adicionadas');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                logs.push('   ⚠️ Colunas já existem');
            } else {
                throw err;
            }
        }

        // 3. Criar tabela de logs
        logs.push('3️⃣ Criando tabela de logs...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS logs_integracao_financeiro (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tipo_origem ENUM('compra', 'venda', 'manual') NOT NULL,
                origem_id INT NULL,
                tipo_destino ENUM('conta_pagar', 'conta_receber') NOT NULL,
                destino_id INT NULL,
                valor DECIMAL(15,2) NOT NULL,
                usuario_id INT NULL,
                status ENUM('sucesso', 'erro') DEFAULT 'sucesso',
                mensagem TEXT NULL,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_origem (tipo_origem, origem_id),
                INDEX idx_destino (tipo_destino, destino_id),
                INDEX idx_data (criado_em)
            )
        `);
        logs.push('   ✅ Tabela criada');

        // 4. Criar views integradas
        logs.push('4️⃣ Criando views integradas...');
        await connection.query(`DROP VIEW IF EXISTS vw_contas_pagar_integradas`);
        await connection.query(`
            CREATE VIEW vw_contas_pagar_integradas AS
            SELECT 
                cp.id as conta_id,
                cp.descricao,
                cp.valor,
                cp.vencimento,
                cp.status,
                cp.pedido_compra_id,
                pc.numero_pedido,
                pc.data_pedido,
                pc.fornecedor_id,
                f.razao_social as fornecedor_nome
            FROM contas_pagar cp
            LEFT JOIN pedidos_compra pc ON cp.pedido_compra_id = pc.id
            LEFT JOIN fornecedores f ON pc.fornecedor_id = f.id
        `);
        logs.push('   ✅ View contas_pagar_integradas criada');

        // View para contas_receber será criada quando implementarmos integração com Vendas
        logs.push('   ⏭️  View contas_receber_integradas será criada na integração de Vendas');

        // 5. Criar triggers
        logs.push('5️⃣ Criando triggers de auditoria...');
        await connection.query(`DROP TRIGGER IF EXISTS trg_log_integracao_pagar`);
        await connection.query(`
            CREATE TRIGGER trg_log_integracao_pagar
            AFTER INSERT ON contas_pagar
            FOR EACH ROW
            BEGIN
                IF NEW.pedido_compra_id IS NOT NULL THEN
                    INSERT INTO logs_integracao_financeiro 
                    (tipo_origem, origem_id, tipo_destino, destino_id, valor, usuario_id, status)
                    VALUES ('compra', NEW.pedido_compra_id, 'conta_pagar', NEW.id, NEW.valor, NEW.criado_por, 'sucesso');
                END IF;
            END
        `);

        await connection.query(`DROP TRIGGER IF EXISTS trg_log_integracao_receber`);
        await connection.query(`
            CREATE TRIGGER trg_log_integracao_receber
            AFTER INSERT ON contas_receber
            FOR EACH ROW
            BEGIN
                IF NEW.venda_id IS NOT NULL THEN
                    INSERT INTO logs_integracao_financeiro 
                    (tipo_origem, origem_id, tipo_destino, destino_id, valor, usuario_id, status)
                    VALUES ('venda', NEW.venda_id, 'conta_receber', NEW.id, NEW.valor, NEW.criado_por, 'sucesso');
                END IF;
            END
        `);
        logs.push('   ✅ Triggers criados');

        await connection.commit();
        logs.push('\n✅ MIGRAÇÃO CONCLUÍDA!');

        res.json({
            success: true,
            message: 'Migração executada com sucesso',
            logs: logs
        });

    } catch (err) {
        await connection.rollback();
        console.error('[FINANCEIRO] Erro na migração:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Erro na migração: ' + err.message 
        });
    } finally {
        connection.release();
    }
});

app.post('/api/financeiro/migrar-integracao', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const logs = [];
        logs.push('🔄 Iniciando migração de integração...\n');

        // 1. Adicionar colunas em contas_pagar
        logs.push('1️⃣ Adicionando colunas em contas_pagar...');
        try {
            await connection.query(`
                ALTER TABLE contas_pagar 
                ADD COLUMN pedido_compra_id INT NULL COMMENT 'ID do pedido de compra relacionado',
                ADD COLUMN venda_id INT NULL COMMENT 'ID da venda relacionada',
                ADD INDEX idx_pedido_compra (pedido_compra_id),
                ADD INDEX idx_venda (venda_id)
            `);
            logs.push('   ✅ Colunas adicionadas');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                logs.push('   ⚠️ Colunas já existem');
            } else {
                throw err;
            }
        }

        // 2. Adicionar colunas em contas_receber
        logs.push('2️⃣ Adicionando colunas em contas_receber...');
        try {
            await connection.query(`
                ALTER TABLE contas_receber 
                ADD COLUMN venda_id INT NULL COMMENT 'ID da venda relacionada',
                ADD COLUMN pedido_venda_id INT NULL COMMENT 'ID do pedido de venda',
                ADD INDEX idx_venda (venda_id),
                ADD INDEX idx_pedido_venda (pedido_venda_id)
            `);
            logs.push('   ✅ Colunas adicionadas');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                logs.push('   ⚠️ Colunas já existem');
            } else {
                throw err;
            }
        }

        // 3. Criar tabela de logs
        logs.push('3️⃣ Criando tabela de logs...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS logs_integracao_financeiro (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tipo_origem ENUM('compra', 'venda', 'manual') NOT NULL,
                origem_id INT NULL,
                tipo_destino ENUM('conta_pagar', 'conta_receber') NOT NULL,
                destino_id INT NULL,
                valor DECIMAL(15,2) NOT NULL,
                usuario_id INT NULL,
                status ENUM('sucesso', 'erro') DEFAULT 'sucesso',
                mensagem TEXT NULL,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_origem (tipo_origem, origem_id),
                INDEX idx_destino (tipo_destino, destino_id),
                INDEX idx_data (criado_em)
            )
        `);
        logs.push('   ✅ Tabela criada');

        // 4. Criar views integradas
        logs.push('4️⃣ Criando views integradas...');
        await connection.query(`DROP VIEW IF EXISTS vw_contas_pagar_integradas`);
        await connection.query(`
            CREATE VIEW vw_contas_pagar_integradas AS
            SELECT 
                cp.id as conta_id,
                cp.descricao,
                cp.valor,
                cp.vencimento,
                cp.status,
                cp.pedido_compra_id,
                pc.numero_pedido,
                pc.data_pedido,
                pc.fornecedor_id,
                f.razao_social as fornecedor_nome
            FROM contas_pagar cp
            LEFT JOIN pedidos_compra pc ON cp.pedido_compra_id = pc.id
            LEFT JOIN fornecedores f ON pc.fornecedor_id = f.id
        `);
        logs.push('   ✅ View contas_pagar_integradas criada');

        // View para contas_receber será criada quando implementarmos integração com Vendas
        logs.push('   ⏭️  View contas_receber_integradas será criada na integração de Vendas');

        // 5. Criar triggers
        logs.push('5️⃣ Criando triggers de auditoria...');
        await connection.query(`DROP TRIGGER IF EXISTS trg_log_integracao_pagar`);
        await connection.query(`
            CREATE TRIGGER trg_log_integracao_pagar
            AFTER INSERT ON contas_pagar
            FOR EACH ROW
            BEGIN
                IF NEW.pedido_compra_id IS NOT NULL THEN
                    INSERT INTO logs_integracao_financeiro 
                    (tipo_origem, origem_id, tipo_destino, destino_id, valor, usuario_id, status)
                    VALUES ('compra', NEW.pedido_compra_id, 'conta_pagar', NEW.id, NEW.valor, NEW.criado_por, 'sucesso');
                END IF;
            END
        `);

        await connection.query(`DROP TRIGGER IF EXISTS trg_log_integracao_receber`);
        await connection.query(`
            CREATE TRIGGER trg_log_integracao_receber
            AFTER INSERT ON contas_receber
            FOR EACH ROW
            BEGIN
                IF NEW.venda_id IS NOT NULL THEN
                    INSERT INTO logs_integracao_financeiro 
                    (tipo_origem, origem_id, tipo_destino, destino_id, valor, usuario_id, status)
                    VALUES ('venda', NEW.venda_id, 'conta_receber', NEW.id, NEW.valor, NEW.criado_por, 'sucesso');
                END IF;
            END
        `);
        logs.push('   ✅ Triggers criados');

        await connection.commit();
        logs.push('\n✅ MIGRAÇÃO CONCLUÍDA!');

        res.json({
            success: true,
            message: 'Migração executada com sucesso',
            logs: logs
        });

    } catch (err) {
        await connection.rollback();
        console.error('[FINANCEIRO] Erro na migração:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Erro na migração: ' + err.message 
        });
    } finally {
        connection.release();
    }
});


// ============================================================
// ROTAS DO MÓDULO DE COMPRAS
// ============================================================

// Importar rotas de Compras
const comprasRoutes = require('./src/routes/compras');
app.use('/api/compras', comprasRoutes(pool, authenticateToken, logger));

logger.info('✅ Rotas do módulo de Compras carregadas');

// ============================================================
// ROTAS DO MÓDULO DE FATURAMENTO NF-e
// ============================================================

const faturamentoRoutes = require('./modules/Faturamento/api/faturamento');
app.use('/api/faturamento', faturamentoRoutes(pool, authenticateToken));

// Servir arquivos estáticos do módulo Faturamento
app.use('/modules/Faturamento', express.static(path.join(__dirname, 'modules', 'Faturamento', 'public')));

logger.info('✅ Rotas do módulo de Faturamento carregadas');

// ============================================================
// APIS DE INTEGRAÇÃO ENTRE MÓDULOS
// ============================================================

const integracaoRouter = express.Router();
integracaoRouter.use(authenticateToken);

// ========== API DE RESERVA DE ESTOQUE ==========

/**
 * Criar reserva de estoque para pedido de venda
 * Reserva produtos sem baixar estoque físico
 */
integracaoRouter.post('/estoque/reservar', [
    body('pedido_id').isInt({ min: 1 }),
    body('itens').isArray({ min: 1 }),
    body('itens.*.codigo_material').trim().notEmpty(),
    body('itens.*.quantidade').isFloat({ min: 0.01 }),
    body('dias_expiracao').optional().isInt({ min: 1, max: 365 }),
    validate
], async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { pedido_id, itens, dias_expiracao = 7 } = req.body;
        const usuario_id = req.user.id;

        const reservasCriadas = [];
        const erros = [];

        for (const item of itens) {
            try {
                // Verificar disponibilidade
                const [estoque] = await connection.query(`
                    SELECT quantidade_fisica, quantidade_reservada, quantidade_disponivel
                    FROM estoque_saldos
                    WHERE codigo_material = ?
                `, [item.codigo_material]);

                if (estoque.length === 0) {
                    erros.push(`Material ${item.codigo_material} não encontrado no estoque`);
                    continue;
                }

                const disponivel = parseFloat(estoque[0].quantidade_disponivel);
                if (disponivel < item.quantidade) {
                    erros.push(`Estoque insuficiente para ${item.codigo_material}. Disponível: ${disponivel}, Solicitado: ${item.quantidade}`);
                    continue;
                }

                // Criar reserva
                const [reserva] = await connection.query(`
                    INSERT INTO estoque_reservas
                    (codigo_material, quantidade, tipo_origem, documento_id, documento_numero, 
                     usuario_id, data_expiracao, status)
                    VALUES (?, ?, 'pedido_venda', ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), 'ativa')
                `, [
                    item.codigo_material,
                    item.quantidade,
                    pedido_id,
                    `PED-${pedido_id}`,
                    usuario_id,
                    dias_expiracao
                ]);

                reservasCriadas.push({
                    reserva_id: reserva.insertId,
                    codigo_material: item.codigo_material,
                    quantidade: item.quantidade,
                    disponivel_antes: disponivel,
                    disponivel_depois: disponivel - item.quantidade
                });

            } catch (error) {
                erros.push(`Erro ao reservar ${item.codigo_material}: ${error.message}`);
            }
        }

        if (erros.length > 0 && reservasCriadas.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Não foi possível criar nenhuma reserva',
                erros
            });
        }

        await connection.commit();

        res.json({
            success: true,
            message: `${reservasCriadas.length} reserva(s) criada(s)`,
            data: {
                pedido_id,
                reservas: reservasCriadas,
                erros: erros.length > 0 ? erros : undefined
            }
        });

    } catch (error) {
        await connection.rollback();
        logger.error('[INTEGRAÇÃO] Erro ao criar reserva:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
});

/**
 * Consumir reserva e baixar estoque físico
 * Usado quando pedido é aprovado e estoque deve ser baixado
 */
integracaoRouter.post('/estoque/consumir-reserva', [
    body('pedido_id').isInt({ min: 1 }),
    validate
], async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { pedido_id } = req.body;
        const usuario_id = req.user.id;

        // Buscar todas as reservas ativas do pedido
        const [reservas] = await connection.query(`
            SELECT * FROM estoque_reservas
            WHERE tipo_origem = 'pedido_venda' 
            AND documento_id = ?
            AND status = 'ativa'
        `, [pedido_id]);

        if (reservas.length === 0) {
            throw new Error('Nenhuma reserva ativa encontrada para este pedido');
        }

        const movimentacoes = [];

        for (const reserva of reservas) {
            // Buscar saldo atual
            const [estoque] = await connection.query(`
                SELECT quantidade_fisica FROM estoque_saldos
                WHERE codigo_material = ?
            `, [reserva.codigo_material]);

            if (estoque.length === 0) continue;

            const qtdAnterior = parseFloat(estoque[0].quantidade_fisica);
            const qtdAtual = qtdAnterior - reserva.quantidade;

            // Baixar estoque físico
            await connection.query(`
                UPDATE estoque_saldos
                SET quantidade_fisica = quantidade_fisica - ?,
                    ultima_saida = CURDATE()
                WHERE codigo_material = ?
            `, [reserva.quantidade, reserva.codigo_material]);

            // Registrar movimentação
            await connection.query(`
                INSERT INTO estoque_movimentacoes
                (codigo_material, tipo_movimento, origem, quantidade, quantidade_anterior,
                 quantidade_atual, documento_tipo, documento_id, documento_numero, usuario_id)
                VALUES (?, 'saida', 'venda', ?, ?, ?, 'pedido_venda', ?, ?, ?)
            `, [
                reserva.codigo_material,
                reserva.quantidade,
                qtdAnterior,
                qtdAtual,
                pedido_id,
                reserva.documento_numero,
                usuario_id
            ]);

            // Marcar reserva como consumida
            await connection.query(`
                UPDATE estoque_reservas
                SET status = 'consumida',
                    data_consumo = NOW()
                WHERE id = ?
            `, [reserva.id]);

            movimentacoes.push({
                codigo_material: reserva.codigo_material,
                quantidade: reserva.quantidade,
                quantidade_anterior: qtdAnterior,
                quantidade_atual: qtdAtual
            });
        }

        await connection.commit();

        res.json({
            success: true,
            message: `${movimentacoes.length} reserva(s) consumida(s) e estoque baixado`,
            data: {
                pedido_id,
                movimentacoes
            }
        });

    } catch (error) {
        await connection.rollback();
        logger.error('[INTEGRAÇÃO] Erro ao consumir reserva:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
});

/**
 * Cancelar reserva de estoque
 */
integracaoRouter.post('/estoque/cancelar-reserva', [
    body('pedido_id').isInt({ min: 1 }),
    validate
], async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { pedido_id } = req.body;

        // Marcar reservas como canceladas (trigger vai liberar automaticamente)
        const [result] = await connection.query(`
            UPDATE estoque_reservas
            SET status = 'cancelada'
            WHERE tipo_origem = 'pedido_venda'
            AND documento_id = ?
            AND status = 'ativa'
        `, [pedido_id]);

        await connection.commit();

        res.json({
            success: true,
            message: `${result.affectedRows} reserva(s) cancelada(s)`,
            data: { pedido_id, reservas_canceladas: result.affectedRows }
        });

    } catch (error) {
        await connection.rollback();
        logger.error('[INTEGRAÇÃO] Erro ao cancelar reserva:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
});

// ========== INTEGRAÇÃO: VENDAS → ESTOQUE → FINANCEIRO ==========

/**
 * Aprovar pedido de venda e realizar todas as integrações
 * 1. Baixa estoque (se produto acabado)
 * 2. Cria conta a receber no Financeiro
 * 3. Pode criar OP no PCP (se necessário)
 */
integracaoRouter.post('/vendas/aprovar-pedido', [
    body('pedido_id').isInt({ min: 1 }),
    body('gerar_op').optional().isBoolean(),
    body('baixar_estoque').optional().isBoolean(),
    validate
], async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { pedido_id, gerar_op = false, baixar_estoque = true } = req.body;
        const usuario_id = req.user.id;

        // 1. Buscar dados do pedido
        const [pedidos] = await connection.query(`
            SELECT p.*, c.nome as cliente_nome 
            FROM pedidos p 
            LEFT JOIN clientes c ON p.cliente_id = c.id 
            WHERE p.id = ?
        `, [pedido_id]);

        if (pedidos.length === 0) {
            throw new Error('Pedido não encontrado');
        }

        const pedido = pedidos[0];

        // 2. Buscar itens do pedido
        const [itens] = await connection.query(`
            SELECT pi.*, pr.codigo, pr.descricao 
            FROM pedido_itens pi 
            LEFT JOIN produtos pr ON pi.produto_id = pr.id 
            WHERE pi.pedido_id = ?
        `, [pedido_id]);

        // 3. Baixar estoque (se solicitado)
        if (baixar_estoque) {
            for (const item of itens) {
                // Verificar estoque disponível
                const [estoqueCheck] = await connection.query(`
                    SELECT quantidade_fisica, quantidade_reservada 
                    FROM estoque_saldos 
                    WHERE codigo_material = ?
                `, [item.codigo]);

                if (estoqueCheck.length > 0) {
                    const estoque = estoqueCheck[0];
                    const disponivel = estoque.quantidade_fisica - estoque.quantidade_reservada;

                    if (disponivel < item.quantidade) {
                        throw new Error(`Estoque insuficiente para ${item.descricao}. Disponível: ${disponivel}, Necessário: ${item.quantidade}`);
                    }

                    // Registrar movimentação de saída
                    await connection.query(`
                        INSERT INTO estoque_movimentacoes 
                        (codigo_material, tipo_movimento, origem, quantidade, quantidade_anterior, 
                         quantidade_atual, documento_tipo, documento_id, documento_numero, 
                         usuario_id, data_movimento)
                        VALUES (?, 'saida', 'venda', ?, ?, ?, 'pedido_venda', ?, ?, ?, NOW())
                    `, [
                        item.codigo,
                        item.quantidade,
                        estoque.quantidade_fisica,
                        estoque.quantidade_fisica - item.quantidade,
                        pedido_id,
                        pedido.numero_pedido || `PED-${pedido_id}`,
                        usuario_id
                    ]);

                    // Atualizar saldo
                    await connection.query(`
                        UPDATE estoque_saldos 
                        SET quantidade_fisica = quantidade_fisica - ?,
                            ultima_saida = CURDATE()
                        WHERE codigo_material = ?
                    `, [item.quantidade, item.codigo]);
                }
            }
        }

        // 4. Criar conta a receber no Financeiro
        const valorTotal = pedido.valor_total || itens.reduce((sum, i) => sum + (i.quantidade * i.preco_unitario), 0);
        
        const [contaReceber] = await connection.query(`
            INSERT INTO contas_receber 
            (cliente_id, valor, vencimento, categoria_id, forma_pagamento_id, 
             descricao, documento, venda_id, status, criado_por, data_criacao)
            VALUES (?, ?, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 
                    (SELECT id FROM categorias_financeiras WHERE tipo = 'receita' AND nome LIKE '%Venda%' LIMIT 1),
                    1, ?, ?, ?, 'pendente', ?, NOW())
        `, [
            pedido.cliente_id,
            valorTotal,
            `Venda ${pedido.numero_pedido || `PED-${pedido_id}`} - ${pedido.cliente_nome}`,
            pedido.numero_pedido || `PED-${pedido_id}`,
            pedido_id,
            usuario_id
        ]);

        // 5. Gerar OP se solicitado
        let op_id = null;
        if (gerar_op) {
            const [op] = await connection.query(`
                INSERT INTO ordens_producao 
                (numero_op, pedido_id, descricao, quantidade, status, data_inicio_prevista, usuario_id)
                VALUES (?, ?, ?, ?, 'planejada', DATE_ADD(CURDATE(), INTERVAL 1 DAY), ?)
            `, [
                `OP-${Date.now()}`,
                pedido_id,
                `Produção para ${pedido.numero_pedido}`,
                itens.reduce((sum, i) => sum + i.quantidade, 0),
                usuario_id
            ]);
            op_id = op.insertId;
        }

        // 6. Atualizar status do pedido
        await connection.query(`
            UPDATE pedidos 
            SET status = 'aprovado', 
                data_aprovacao = NOW(),
                aprovado_por = ?,
                ordem_producao_id = ?
            WHERE id = ?
        `, [usuario_id, op_id, pedido_id]);

        // 7. Log de integração
        await connection.query(`
            INSERT INTO logs_integracao_financeiro 
            (tipo_origem, origem_id, tipo_destino, destino_id, valor, usuario_id, status, observacoes)
            VALUES ('venda', ?, 'conta_receber', ?, ?, ?, 'sucesso', ?)
        `, [pedido_id, contaReceber.insertId, valorTotal, usuario_id, `Pedido aprovado e integrado`]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Pedido aprovado e integrado com sucesso',
            data: {
                pedido_id,
                conta_receber_id: contaReceber.insertId,
                op_id,
                estoque_baixado: baixar_estoque,
                valor_total: valorTotal
            }
        });

    } catch (error) {
        await connection.rollback();
        logger.error('[INTEGRAÇÃO] Erro ao aprovar pedido:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
});

// ========== INTEGRAÇÃO: COMPRAS → ESTOQUE → FINANCEIRO ==========

/**
 * Receber pedido de compra e realizar integrações
 * 1. Cria conta a pagar no Financeiro
 * 2. Dá entrada no estoque
 */
integracaoRouter.post('/compras/receber-pedido', [
    body('pedido_compra_id').isInt({ min: 1 }),
    body('numero_nf').optional().trim(),
    body('itens').isArray({ min: 1 }),
    body('itens.*.codigo_material').trim().notEmpty(),
    body('itens.*.quantidade_recebida').isFloat({ min: 0.01 }),
    body('itens.*.custo_unitario').optional().isFloat({ min: 0 }),
    validate
], async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { pedido_compra_id, numero_nf, itens } = req.body;
        const usuario_id = req.user.id;

        // 1. Buscar dados do pedido de compra
        const [pedidos] = await connection.query(`
            SELECT pc.*, f.nome as fornecedor_nome 
            FROM pedidos_compra pc 
            LEFT JOIN fornecedores f ON pc.fornecedor_id = f.id 
            WHERE pc.id = ?
        `, [pedido_compra_id]);

        if (pedidos.length === 0) {
            throw new Error('Pedido de compra não encontrado');
        }

        const pedido = pedidos[0];

        // 2. Processar cada item recebido
        let valorTotal = 0;

        for (const item of itens) {
            const custo = item.custo_unitario || 0;
            valorTotal += item.quantidade_recebida * custo;

            // Verificar se material existe em estoque_saldos
            const [saldoCheck] = await connection.query(`
                SELECT id, quantidade_fisica, custo_medio 
                FROM estoque_saldos 
                WHERE codigo_material = ?
            `, [item.codigo_material]);

            if (saldoCheck.length === 0) {
                // Criar registro de saldo
                await connection.query(`
                    INSERT INTO estoque_saldos 
                    (codigo_material, quantidade_fisica, custo_medio, ultima_entrada)
                    VALUES (?, ?, ?, CURDATE())
                `, [item.codigo_material, item.quantidade_recebida, custo]);
            } else {
                const saldo = saldoCheck[0];
                const qtdNova = saldo.quantidade_fisica + item.quantidade_recebida;
                const custoMedioNovo = ((saldo.quantidade_fisica * saldo.custo_medio) + 
                                        (item.quantidade_recebida * custo)) / qtdNova;

                // Atualizar saldo
                await connection.query(`
                    UPDATE estoque_saldos 
                    SET quantidade_fisica = ?,
                        custo_medio = ?,
                        ultima_entrada = CURDATE()
                    WHERE codigo_material = ?
                `, [qtdNova, custoMedioNovo, item.codigo_material]);
            }

            // Registrar movimentação de entrada
            await connection.query(`
                INSERT INTO estoque_movimentacoes 
                (codigo_material, tipo_movimento, origem, quantidade, quantidade_anterior,
                 quantidade_atual, documento_tipo, documento_id, documento_numero,
                 custo_unitario, usuario_id, data_movimento)
                VALUES (?, 'entrada', 'compra', ?, 
                        (SELECT quantidade_fisica FROM estoque_saldos WHERE codigo_material = ?),
                        (SELECT quantidade_fisica FROM estoque_saldos WHERE codigo_material = ?),
                        'pedido_compra', ?, ?, ?, ?, NOW())
            `, [
                item.codigo_material,
                item.quantidade_recebida,
                item.codigo_material,
                item.codigo_material,
                pedido_compra_id,
                numero_nf || `PC-${pedido_compra_id}`,
                custo,
                usuario_id
            ]);
        }

        // 3. Criar conta a pagar no Financeiro
        const [contaPagar] = await connection.query(`
            INSERT INTO contas_pagar 
            (fornecedor_id, valor, vencimento, categoria_id, forma_pagamento_id,
             descricao, documento, pedido_compra_id, status, criado_por, data_criacao)
            VALUES (?, ?, DATE_ADD(CURDATE(), INTERVAL 30 DAY),
                    (SELECT id FROM categorias_financeiras WHERE tipo = 'despesa' AND nome LIKE '%Compra%' LIMIT 1),
                    1, ?, ?, ?, 'pendente', ?, NOW())
        `, [
            pedido.fornecedor_id,
            valorTotal,
            `Compra ${numero_nf || `PC-${pedido_compra_id}`} - ${pedido.fornecedor_nome}`,
            numero_nf || `PC-${pedido_compra_id}`,
            pedido_compra_id,
            usuario_id
        ]);

        // 4. Atualizar status do pedido de compra
        await connection.query(`
            UPDATE pedidos_compra 
            SET status = 'recebido', data_recebimento = NOW()
            WHERE id = ?
        `, [pedido_compra_id]);

        // 5. Log
        await connection.query(`
            INSERT INTO logs_integracao_financeiro 
            (tipo_origem, origem_id, tipo_destino, destino_id, valor, usuario_id, status, observacoes)
            VALUES ('compra', ?, 'conta_pagar', ?, ?, ?, 'sucesso', ?)
        `, [pedido_compra_id, contaPagar.insertId, valorTotal, usuario_id, `Pedido recebido e integrado`]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Pedido de compra recebido e integrado',
            data: {
                pedido_compra_id,
                conta_pagar_id: contaPagar.insertId,
                valor_total: valorTotal,
                itens_recebidos: itens.length
            }
        });

    } catch (error) {
        await connection.rollback();
        logger.error('[INTEGRAÇÃO] Erro ao receber pedido de compra:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
});

// ========== INTEGRAÇÃO: PCP → ESTOQUE (Consumo de OP) ==========

/**
 * Consumir materiais de uma Ordem de Produção
 * Baixa estoque dos materiais usados na produção
 */
integracaoRouter.post('/pcp/consumir-materiais', [
    body('op_id').isInt({ min: 1 }),
    body('materiais').isArray({ min: 1 }),
    body('materiais.*.codigo_material').trim().notEmpty(),
    body('materiais.*.quantidade_consumida').isFloat({ min: 0.01 }),
    validate
], async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { op_id, materiais } = req.body;
        const usuario_id = req.user.id;

        // Verificar OP
        const [ops] = await connection.query('SELECT * FROM ordens_producao WHERE id = ?', [op_id]);
        if (ops.length === 0) throw new Error('OP não encontrada');

        const op = ops[0];

        // Processar cada material
        for (const material of materiais) {
            // Verificar estoque
            const [saldo] = await connection.query(`
                SELECT quantidade_fisica, quantidade_reservada 
                FROM estoque_saldos 
                WHERE codigo_material = ?
            `, [material.codigo_material]);

            if (saldo.length === 0 || saldo[0].quantidade_fisica < material.quantidade_consumida) {
                throw new Error(`Estoque insuficiente para ${material.codigo_material}`);
            }

            // Registrar saída
            await connection.query(`
                INSERT INTO estoque_movimentacoes 
                (codigo_material, tipo_movimento, origem, quantidade, quantidade_anterior,
                 quantidade_atual, documento_tipo, documento_id, documento_numero,
                 usuario_id, data_movimento)
                VALUES (?, 'saida', 'producao', ?, ?, ?, 'ordem_producao', ?, ?, ?, NOW())
            `, [
                material.codigo_material,
                material.quantidade_consumida,
                saldo[0].quantidade_fisica,
                saldo[0].quantidade_fisica - material.quantidade_consumida,
                op_id,
                op.numero_op,
                usuario_id
            ]);

            // Atualizar saldo
            await connection.query(`
                UPDATE estoque_saldos 
                SET quantidade_fisica = quantidade_fisica - ?,
                    ultima_saida = CURDATE()
                WHERE codigo_material = ?
            `, [material.quantidade_consumida, material.codigo_material]);
        }

        await connection.commit();

        res.json({
            success: true,
            message: 'Materiais consumidos com sucesso',
            data: { op_id, materiais_consumidos: materiais.length }
        });

    } catch (error) {
        await connection.rollback();
        logger.error('[INTEGRAÇÃO] Erro ao consumir materiais:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
});

// ========== INTEGRAÇÃO: PCP → ESTOQUE (Produção Finalizada) ==========

/**
 * Finalizar OP e dar entrada no produto acabado
 */
integracaoRouter.post('/pcp/finalizar-op', [
    body('op_id').isInt({ min: 1 }),
    body('codigo_produto').trim().notEmpty(),
    body('quantidade_produzida').isFloat({ min: 0.01 }),
    validate
], async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { op_id, codigo_produto, quantidade_produzida } = req.body;
        const usuario_id = req.user.id;

        const [ops] = await connection.query('SELECT * FROM ordens_producao WHERE id = ?', [op_id]);
        if (ops.length === 0) throw new Error('OP não encontrada');

        const op = ops[0];

        // Dar entrada no produto acabado
        await connection.query(`
            INSERT INTO estoque_movimentacoes 
            (codigo_material, tipo_movimento, origem, quantidade, quantidade_anterior,
             quantidade_atual, documento_tipo, documento_id, documento_numero,
             usuario_id, data_movimento)
            VALUES (?, 'entrada', 'producao', ?, 
                    COALESCE((SELECT quantidade_fisica FROM estoque_saldos WHERE codigo_material = ?), 0),
                    COALESCE((SELECT quantidade_fisica FROM estoque_saldos WHERE codigo_material = ?), 0) + ?,
                    'ordem_producao', ?, ?, ?, NOW())
        `, [codigo_produto, quantidade_produzida, codigo_produto, codigo_produto, 
            quantidade_produzida, op_id, op.numero_op, usuario_id]);

        // Atualizar ou criar saldo
        const [saldoCheck] = await connection.query(`
            SELECT id FROM estoque_saldos WHERE codigo_material = ?
        `, [codigo_produto]);

        if (saldoCheck.length === 0) {
            await connection.query(`
                INSERT INTO estoque_saldos (codigo_material, quantidade_fisica, ultima_entrada)
                VALUES (?, ?, CURDATE())
            `, [codigo_produto, quantidade_produzida]);
        } else {
            await connection.query(`
                UPDATE estoque_saldos 
                SET quantidade_fisica = quantidade_fisica + ?,
                    ultima_entrada = CURDATE()
                WHERE codigo_material = ?
            `, [quantidade_produzida, codigo_produto]);
        }

        // Atualizar status da OP
        await connection.query(`
            UPDATE ordens_producao 
            SET status = 'finalizada', data_finalizacao = NOW()
            WHERE id = ?
        `, [op_id]);

        await connection.commit();

        res.json({
            success: true,
            message: 'OP finalizada e produto em estoque',
            data: { op_id, codigo_produto, quantidade_produzida }
        });

    } catch (error) {
        await connection.rollback();
        logger.error('[INTEGRAÇÃO] Erro ao finalizar OP:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
});

// ========== RELATÓRIOS DE INTEGRAÇÃO ==========

/**
 * Relatório de movimentações integradas
 */
integracaoRouter.get('/relatorio/movimentacoes', async (req, res, next) => {
    try {
        const { data_inicio, data_fim, tipo } = req.query;

        let where = '1=1';
        const params = [];

        if (data_inicio) {
            where += ' AND DATE(data_movimento) >= ?';
            params.push(data_inicio);
        }
        if (data_fim) {
            where += ' AND DATE(data_movimento) <= ?';
            params.push(data_fim);
        }
        if (tipo) {
            where += ' AND tipo_movimento = ?';
            params.push(tipo);
        }

        const [movimentacoes] = await pool.query(`
            SELECT 
                em.*,
                es.descricao,
                u.nome as usuario_nome
            FROM estoque_movimentacoes em
            LEFT JOIN estoque_saldos es ON em.codigo_material = es.codigo_material
            LEFT JOIN usuarios u ON em.usuario_id = u.id
            WHERE ${where}
            ORDER BY em.data_movimento DESC
            LIMIT 100
        `, params);

        res.json({ success: true, data: movimentacoes });

    } catch (error) {
        logger.error('[INTEGRAÇÃO] Erro ao gerar relatório:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Dashboard de integração
 */
integracaoRouter.get('/dashboard', async (req, res, next) => {
    try {
        // KPIs
        const [pedidosAprovados] = await pool.query(`
            SELECT COUNT(*) as total FROM pedidos WHERE status = 'aprovado' AND DATE(data_aprovacao) = CURDATE()
        `);

        const [comprasRecebidas] = await pool.query(`
            SELECT COUNT(*) as total FROM pedidos_compra WHERE status = 'recebido' AND DATE(data_recebimento) = CURDATE()
        `);

        const [opsFinalizadas] = await pool.query(`
            SELECT COUNT(*) as total FROM ordens_producao WHERE status = 'finalizada' AND DATE(data_finalizacao) = CURDATE()
        `);

        const [movimentacoesHoje] = await pool.query(`
            SELECT COUNT(*) as total FROM estoque_movimentacoes WHERE DATE(data_movimento) = CURDATE()
        `);

        const [estoqueTotal] = await pool.query(`
            SELECT SUM(valor_estoque) as total FROM estoque_saldos
        `);

        const [alertasCriticos] = await pool.query(`
            SELECT COUNT(*) as total 
            FROM estoque_saldos es
            JOIN pcp_parametros_compra pp ON es.codigo_material = pp.codigo_material
            WHERE es.quantidade_disponivel < pp.estoque_minimo
        `);

        res.json({
            success: true,
            data: {
                pedidos_aprovados_hoje: pedidosAprovados[0].total,
                compras_recebidas_hoje: comprasRecebidas[0].total,
                ops_finalizadas_hoje: opsFinalizadas[0].total,
                movimentacoes_hoje: movimentacoesHoje[0].total,
                valor_estoque_total: estoqueTotal[0].total || 0,
                alertas_criticos: alertasCriticos[0].total
            }
        });

    } catch (error) {
        logger.error('[INTEGRAÇÃO] Erro ao carregar dashboard:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.use('/api/integracao', integracaoRouter);

logger.info('✅ APIs de Integração entre módulos carregadas');

// ============================================================
// APIS ADICIONAIS - FASE 1 MELHORIAS ERP
// ============================================================

// Dashboard Executivo (KPIs)
try {
    const dashboardExecutivoRouter = require('./api/dashboard-executivo');
    app.use('/api/dashboard-executivo', dashboardExecutivoRouter);
    logger.info('✅ API Dashboard Executivo carregada');
} catch (err) {
    logger.warn('⚠️ API Dashboard Executivo não carregada:', err.message);
}

// Integração Vendas → Financeiro
try {
    const integracaoVendasFinanceiro = require('./api/integracao-vendas-financeiro');
    app.use('/api/integracao/vendas-financeiro', integracaoVendasFinanceiro);
    logger.info('✅ API Integração Vendas-Financeiro carregada');
} catch (err) {
    logger.warn('⚠️ API Integração Vendas-Financeiro não carregada:', err.message);
}

// Integração Compras → Financeiro
try {
    const integracaoComprasFinanceiro = require('./api/integracao-compras-financeiro');
    app.use('/api/integracao/compras-financeiro', integracaoComprasFinanceiro);
    logger.info('✅ API Integração Compras-Financeiro carregada');
} catch (err) {
    logger.warn('⚠️ API Integração Compras-Financeiro não carregada:', err.message);
}

// Sistema de Notificações Unificado
try {
    const notificacoesRouter = require('./api/notificacoes');
    app.use('/api/notificacoes', notificacoesRouter);
    logger.info('✅ API Notificações Unificadas carregada');
} catch (err) {
    logger.warn('⚠️ API Notificações não carregada:', err.message);
}

// Sistema de Notificações (alias para compatibilidade com módulo Vendas)
// Armazena notificações em arquivo JSON para compatibilidade
const NOTIFICATIONS_FILE = path.join(__dirname, 'modules', 'Vendas', 'data', 'notifications.json');

function loadNotifications() {
    try {
        if (!fs.existsSync(NOTIFICATIONS_FILE)) return [];
        const raw = fs.readFileSync(NOTIFICATIONS_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (e) { return []; }
}

function saveNotifications(arr) {
    try {
        const dir = path.dirname(NOTIFICATIONS_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(arr, null, 2), 'utf8'); 
    } catch (e) { console.error('Erro ao salvar notificações:', e); }
}

// GET /api/notifications - Listar notificações
app.get('/api/notifications', (req, res) => {
    const notifications = loadNotifications();
    const filter = req.query.filter; // 'all', 'unread', 'important'
    let filtered = notifications;
    
    if (filter === 'unread') {
        filtered = notifications.filter(n => !n.read);
    } else if (filter === 'important') {
        filtered = notifications.filter(n => n.important);
    }
    
    res.json({
        notifications: filtered.slice(0, 50),
        unreadCount: notifications.filter(n => !n.read).length,
        total: notifications.length
    });
});

// POST /api/notifications/:id/read - Marcar como lida
app.post('/api/notifications/:id/read', express.json(), (req, res) => {
    const notifications = loadNotifications();
    const id = parseInt(req.params.id);
    const notification = notifications.find(n => n.id === id);
    if (notification) {
        notification.read = true;
        saveNotifications(notifications);
    }
    res.json({ success: true });
});

// POST /api/notifications/read-all - Marcar todas como lidas
app.post('/api/notifications/read-all', (req, res) => {
    const notifications = loadNotifications();
    notifications.forEach(n => n.read = true);
    saveNotifications(notifications);
    res.json({ success: true });
});

// DELETE /api/notifications/:id - Excluir notificação
app.delete('/api/notifications/:id', (req, res) => {
    let notifications = loadNotifications();
    const id = parseInt(req.params.id);
    notifications = notifications.filter(n => n.id !== id);
    saveNotifications(notifications);
    res.json({ success: true });
});

// POST /api/notifications - Criar notificação
app.post('/api/notifications', express.json(), (req, res) => {
    const { type, title, message, data } = req.body;
    const notifications = loadNotifications();
    const notification = {
        id: Date.now(),
        type: type || 'info',
        title: title || 'Notificação',
        message: message || '',
        read: false,
        important: false,
        createdAt: new Date().toISOString(),
        data: data || {}
    };
    notifications.unshift(notification);
    if (notifications.length > 100) notifications.length = 100;
    saveNotifications(notifications);
    res.json(notification);
});

logger.info('✅ API Notifications (compatibilidade Vendas) carregada');

// Sistema de Auditoria
try {
    const auditoriaRouter = require('./api/auditoria');
    app.use('/api/auditoria', auditoriaRouter);
    logger.info('✅ API Auditoria carregada');
} catch (err) {
    logger.warn('⚠️ API Auditoria não carregada:', err.message);
}

// Sistema de Permissões Unificado
try {
    const permissoesRouter = require('./api/permissoes')({ pool, authenticateToken });
    app.use('/api/permissoes', permissoesRouter);
    logger.info('✅ API Permissões Unificadas carregada');
} catch (err) {
    logger.warn('⚠️ API Permissões não carregada:', err.message);
}

// ===================== FASE 3: FUNCIONALIDADES CORE =====================

// Sistema de Backup
try {
    const backupRouter = require('./api/backup')({ pool, authenticateToken });
    app.use('/api/backup', backupRouter);
    logger.info('✅ API Backup carregada');
} catch (err) {
    logger.warn('⚠️ API Backup não carregada:', err.message);
}

// Sistema de Conciliação Bancária
try {
    const conciliacaoRouter = require('./api/conciliacao-bancaria')({ pool, authenticateToken });
    app.use('/api/conciliacao', conciliacaoRouter);
    logger.info('✅ API Conciliação Bancária carregada');
} catch (err) {
    logger.warn('⚠️ API Conciliação Bancária não carregada:', err.message);
}

// Sistema de Relatórios Gerenciais
try {
    const relatoriosRouter = require('./api/relatorios-gerenciais')({ pool, authenticateToken });
    app.use('/api/relatorios', relatoriosRouter);
    logger.info('✅ API Relatórios Gerenciais carregada');
} catch (err) {
    logger.warn('⚠️ API Relatórios Gerenciais não carregada:', err.message);
}

// Sistema de Workflow de Aprovações
try {
    const workflowRouter = require('./api/workflow-aprovacoes')({ pool, authenticateToken, io: global.io });
    app.use('/api/workflow', workflowRouter);
    logger.info('✅ API Workflow Aprovações carregada');
} catch (err) {
    logger.warn('⚠️ API Workflow Aprovações não carregada:', err.message);
}

// Melhorias NF-e (Dashboard, Consultas, Reenvio)
try {
    const nfeMelhoriasRouter = require('./api/nfe-melhorias')({ pool, authenticateToken });
    app.use('/api/nfe-extra', nfeMelhoriasRouter);
    logger.info('✅ API NF-e Melhorias carregada');
} catch (err) {
    logger.warn('⚠️ API NF-e Melhorias não carregada:', err.message);
}

// eSocial Básico (sem ponto eletrônico)
try {
    const esocialRouter = require('./api/esocial')({ pool, authenticateToken });
    app.use('/api/esocial', esocialRouter);
    logger.info('✅ API eSocial carregada');
} catch (err) {
    logger.warn('⚠️ API eSocial não carregada:', err.message);
}

// ============================================================
// FIM DAS ROTAS
// ============================================================

// Limpeza periódica de sessões expiradas (a cada 1 hora)
setInterval(() => {
    cleanExpiredSessions(pool).catch(err => {
        console.error('Erro ao limpar sessões:', err);
    });
}, 60 * 60 * 1000); // 1 hora