const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const ExcelJS = require('exceljs');

// 🔒 SECURITY IMPORTS
const {
    generalLimiter,
    authLimiter,
    apiLimiter,
    sanitizeInput,
    validateRequired,
    validateEmail,
    securityHeaders,
    cleanExpiredSessions
} = require('../../security-middleware');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Sistema de logs melhoração
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const logger = {
    debug: LOG_LEVEL === 'debug'  console.log : () => {},
    info: console.log,
    warn: console.warn,
    error: console.error
};

// 🚀 PERFORMANCE: Cache em memória para queries frequentes
const queryCache = new Map();
const CACHE_TTL = 30000; // 30 segundos

function getCachedQuery(key) {
    const cached = queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    queryCache.delete(key);
    return null;
}

function setCachedQuery(key, data) {
    // Limpar cache se muito grande
    if (queryCache.size > 100) {
        const oldest = queryCache.keys().next().value;
        queryCache.delete(oldest);
    }
    queryCache.set(key, { data, timestamp: Date.now() });
}

function invalidateCache(pattern) {
    for (const key of queryCache.keys()) {
        if (key.includes(pattern)) {
            queryCache.delete(key);
        }
    }
}

// Função para formatar CPF/CNPJ com pontuação
function formatarCpfCnpjExcel(valor) {
    if (!valor) return '';
    
    // Remove tudo que não é número
    const numeros = String(valor).replace(/\D/g, '');
    
    if (numeros.length === 11) {
        // CPF: 000.000.000-00
        return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (numeros.length === 14) {
        // CNPJ: 00.000.000/0000-00
        return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    // Se já tiver formatação ou tamanho inválido, retorna como está
    return valor;
}

// Tratamento global de erros para evitar crashes
process.on('uncaughtException', (err) => {
    logger.error('❌ Erro não tratação capturação:', err.message);
    logger.error('Stack:', err.stack);
    // Não parar o servidor, apenas logar
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('❌ Promise rejeitada capturada:', reason);
    logger.error('Promise:', promise);
});

// Try to load bcryptjs once at startup for faster checks in login
let bcrypt = null;
try {
    bcrypt = require('bcryptjs');
    logger.info('[INIT] bcryptjs loaded');
} catch (e) {
    logger.warn('[INIT] bcryptjs not installed or failed to load');
}

const app = express();
const PORT = process.env.PORT_PCP  parseInt(process.env.PORT_PCP, 10) : 3001;

// 🚀 PERFORMANCE: Compression para respostas HTTP (reduz ~70% do tamanho)
let compression;
try {
    compression = require('compression');
    app.use(compression({
        level: 6, // Balanço entre velocidade e compressão
        threshold: 1024, // Só comprimir respostas > 1KB
        filter: (req, res) => {
            if (req.headers['x-no-compression']) return false;
            return compression.filter(req, res);
        }
    }));
    logger.info('[INIT] ✅ Compression ativação');
} catch (e) {
    logger.warn('[INIT] ⚠️ Compression não disponível');
}

// --- CONFIGURAÇÃO DA LIGAÇÃO À BASE DE DADOS ---
// 🚀 PERFORMANCE: Pool otimização para melhor throughput
const db = mysql.createPool({
    host: process.env.DB_HOST || 'interchange.proxy.rlwy.net',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'iiilOZutDOnPCwxgiTKeMuEaIzSwplcu',
    database: process.env.DB_NAME || 'railway',
    port: process.env.DB_PORT || 19396,
    waitForConnections: true,
    connectionLimit: 20, // Aumentação para melhor concorrência
    queueLimit: 0,
    enableKeepAlive: true, // Mantém conexões vivas
    keepAliveInitialDelay: 10000, // 10s
    maxIdle: 10, // Conexões ociosas máximas
    idleTimeout: 60000 // 60s antes de fechar conexão ociosa
});

// 🔒 SECURITY: Aplicar headers de segurança
app.use(securityHeaders());

// Middlewares
app.use(cors({ 
    origin: process.env.CORS_ORIGIN || true, 
    credentials: true 
}));

// 🔒 SECURITY: Rate limiting geral
app.use(generalLimiter);

// 🔒 SECURITY: Sanitização de entrada
app.use(sanitizeInput);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 🚀 PERFORMANCE: Cache para arquivos estáticos
const cacheControl = (maxAge = '1d') => (req, res, next) => {
    if (req.method === 'GET') {
        const ext = path.extname(req.path).toLowerCase();
        // Cache agressivo para assets estáticos
        if (['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf'].includes(ext)) {
            res.set('Cache-Control', 'public, max-age=86400'); // 1 dia
        } else if (['.html', '.htm'].includes(ext)) {
            res.set('Cache-Control', 'public, max-age=3600'); // 1 hora
        }
    }
    next();
};
app.use(cacheControl());

// 🚀 PERFORMANCE: ETags para cache condicional
app.set('etag', 'strong');

// Middleware de timeout para rotas longas
const timeoutMiddleware = (timeout = 30000) => {
    return (req, res, next) => {
        req.setTimeout(timeout, () => {
            if (!res.headersSent) {
                res.status(408).json({ message: 'Timeout da requisição' });
            }
        });
        next();
    };
};

// Ensure API routes always return JSON. Add a tiny middleware that marks API requests
// and returns JSON 404/errors even if static file fallback would respond with HTML.
app.use((req, res, next) => {
    // Tag requests that begin with /api so later handlers can enforce JSON responses
    if (req.path && req.path.startsWith('/api')) req.isApi = true;
    next();
});

// Serve user profile images from /avatars with sensible caching and allowed extensions
// Place images in the project folder `avatars/` (e.g. avatars/clemerson.jpg)
app.use('/avatars', express.static(path.join(__dirname, 'avatars'), {
    maxAge: '1d', // cache for a day in clients
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif']
}));

// Serve a favicon to avoid 404 noise from browsers requesting /favicon.ico
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'Favicon Aluforce.webp'));
});

// Static files will be served after API route registration to avoid static fallback shaçãowing API endpoints.
// (See later insertion before API 404 handler.)

// Simple in-memory session store (for dev). Keys are session ids stored in cookie 'pcp_session'
const sessions = new Map();

function getSessionIdFromReq(req) {
    const cookie = req.headers && req.headers.cookie;
    if (!cookie) return null;
    const m = cookie.match(/pcp_session=([^;]+)/);
    return m  m[1] : null;
}

function authRequired(req, res, next) {
    const sid = getSessionIdFromReq(req);
    if (!sid || !sessions.has(sid)) return res.status(401).json({ message: 'Não autenticação' });
    req.user = sessions.get(sid).user;
    next();
}

// --- ROTAS DA API ---

// Rota de Login

    // Criar servidor HTTP e Socket.IO para notificações em tempo real
    const httpServer = http.createServer(app);
    const io = new Server(httpServer, {
        cors: { origin: true }
    });

    // Helper: broadcast materiais atuais
    async function broadcastMaterials() {
        try {
            const [rows] = await db.query("SELECT * FROM materiais ORDER BY descricao ASC");
            io.emit('materials_changed', rows);
        } catch (err) {
            logger.error('Erro ao broadcast materials:', err.message);
        }
    }

    // Helper: broadcast produtos atuais
    async function broadcastProducts() {
        try {
            const [rows] = await db.query("SELECT * FROM produtos ORDER BY descricao ASC");
            io.emit('products_changed', rows);
        } catch (err) {
            logger.error('Erro ao broadcast products:', err.message);
        }
    }

    // Quando cliente conectar, podemos enviar lista inicial
    io.on('connection', (socket) => {
        logger.debug('Cliente Socket.IO conectação:', socket.id);
        // Envia estação atual dos materiais
        (async () => {
            try {
                const [rows] = await db.query("SELECT * FROM materiais ORDER BY descricao ASC");
                socket.emit('materials_changed', rows);
                // Envia estação atual dos produtos
                try {
                    const [prods] = await db.query("SELECT * FROM produtos ORDER BY descricao ASC");
                    socket.emit('products_changed', prods);
                } catch (prodErr) {
                    logger.warn('Não foi possível enviar produtos iniciais:', prodErr.message);
                }
            } catch (err) {
                logger.error('Erro ao enviar materiais iniciais:', err.message);
            }
        })();
    });

// Endpoint: buscar clientes por nome ou cnpj (autocomplete)
app.get('/api/pcp/clientes', async (req, res) => {
    const q = (req.query.q || '').toString().trim();
    if (!q) {
        // Se query vazia, retornar primeiros 20 clientes
        try {
            const sql = `SELECT id, nome, razao_social, nome_fantasia, cnpj_cpf, cnpj, cpf, contato, email, telefone, 
                                endereco, cidade, estação, cep
                         FROM clientes 
                         ORDER BY COALESCE(nome, razao_social, nome_fantasia) 
                         LIMIT 20`;
            const [rows] = await db.query(sql);
            if (Array.isArray(rows) && rows.length) {
                return res.json(rows.map(r => ({
                    id: r.id, 
                    nome: r.nome || r.razao_social || r.nome_fantasia || '', 
                    razao_social: r.razao_social || '', 
                    nome_fantasia: r.nome_fantasia || '',
                    cnpj: r.cnpj_cpf || r.cnpj || '', 
                    cpf: r.cpf || '', 
                    contato: r.contato || '', 
                    email: r.email || '',
                    telefone: r.telefone || '', 
                    endereco: r.endereco || '', 
                    cidade: r.cidade || '',
                    estação: r.estação || '', 
                    cep: r.cep || '', 
                    email_nfe: r.email || ''
                })));
            }
        } catch (e) { console.error('Erro ao buscar clientes:', e); }
        return res.json([]);
    }
    const like = `%${q.replace(/[%_]/g, '\\$&')}%`;
    try {
        // Buscar na tabela clientes com campos que realmente existem
        const sql = `SELECT id, nome, razao_social, nome_fantasia, cnpj_cpf, contato, email, telefone, 
                            endereco, cidade, estação, cep
                     FROM clientes 
                     WHERE (nome LIKE  OR razao_social LIKE  OR nome_fantasia LIKE  OR cnpj_cpf LIKE ) 
                     ORDER BY COALESCE(nome, razao_social, nome_fantasia) 
                     LIMIT 20`;
        const [rows] = await db.query(sql, [like, like, like, like]);
        
        if (Array.isArray(rows) && rows.length) {
            const resultação = rows.map(r => ({
                id: r.id,
                nome: r.nome || r.razao_social || r.nome_fantasia || '',
                razao_social: r.razao_social || '',
                nome_fantasia: r.nome_fantasia || '',
                cnpj: r.cnpj_cpf || '',
                contato: r.contato || '',
                email: r.email || '',
                telefone: r.telefone || '',
                endereco: r.endereco || '',
                cidade: r.cidade || '',
                estação: r.estação || '',
                cep: r.cep || ''
            }));
            return res.json(resultação);
        }
        
        // Fallback: buscar em outras tabelas se necessário
        return res.json([]);
    } catch (error) {
        logger.error('Erro na busca de clientes:', error);
        return res.json([]);
    }
});

// Endpoint para buscar transportaçãoras
app.get('/api/pcp/transportaçãoras', async (req, res) => {
    const q = (req.query.q || '').toString().trim();
    if (!q) {
        // Se query vazia, retornar daçãos estáticos
        const fallback = [
            { nome: 'Transportaçãora Rápida Ltda', cnpj: '12.345.678/0001-90', email: 'contato@rapida.com', telefone: '(11) 98765-4321', endereco: 'Av. Principal, 1000, São Paulo - SP', cep: '01234-567' },
            { nome: 'Logística Express', cnpj: '98.765.432/0001-10', email: 'express@logistica.com', telefone: '(21) 91234-5678', endereco: 'Rua das Flores, 500, Rio de Janeiro - RJ', cep: '20123-456' },
            { nome: 'Cargas Brasil', cnpj: '11.222.333/0001-44', email: 'contato@cargasbrasil.com', telefone: '(11) 3456-7890', endereco: 'Rua Industrial, 200, São Paulo - SP', cep: '03456-789' }
        ];
        return res.json(fallback);
    }
    const like = `%${q.replace(/[%_]/g, '\\$&')}%`;
    try {
        // Buscar na tabela transportaçãoras usando campos corretos
        const sql = `SELECT id, razao_social, nome_fantasia, cnpj_cpf, email, telefone, bairro, cidade, estação, contato
                     FROM transportaçãoras 
                     WHERE (razao_social LIKE  OR nome_fantasia LIKE  OR cnpj_cpf LIKE ) 
                     ORDER BY COALESCE(razao_social, nome_fantasia) 
                     LIMIT 20`;
        const [rows] = await db.query(sql, [like, like, like]);
        
        if (Array.isArray(rows) && rows.length) {
            const resultação = rows.map(r => {
                const endereco = [r.bairro, r.cidade, r.estação].filter(Boolean).join(', ');
                return {
                    id: r.id,
                    nome: r.razao_social || r.nome_fantasia || '',
                    cnpj: r.cnpj_cpf || '',
                    email: r.email || '',
                    telefone: r.telefone || '',
                    endereco: endereco,
                    cep: '', // Não tem CEP na tabela
                    cidade: r.cidade || '',
                    estação: r.estação || ''
                };
            });
            return res.json(resultação);
        }
        
        return res.json([]);
    } catch (error) {
        logger.error('Erro na busca de transportaçãoras:', error);
        // Retornar daçãos estáticos como fallback
        const fallback = [
            { nome: 'Transportaçãora Rápida Ltda', cnpj: '12.345.678/0001-90', email: 'contato@rapida.com', telefone: '(11) 98765-4321', endereco: 'Av. Principal, 1000, São Paulo - SP', cep: '01234-567' },
            { nome: 'Logística Express', cnpj: '98.765.432/0001-10', email: 'express@logistica.com', telefone: '(21) 91234-5678', endereco: 'Rua das Flores, 500, Rio de Janeiro - RJ', cep: '20123-456' }
        ].filter(t => t.nome.toLowerCase().includes(q.toLowerCase()));
        return res.json(fallback);
    }
});

// 🔒 SECURITY: Rate limiter para login
app.post('/api/pcp/login', authLimiter, validateRequired(['email', 'password']), async (req, res) => {
    const { email, password } = req.body;
    try {
        logger.debug(`[LOGIN] attempt for identifier=${email}`);
        
        // For this database, we only have 'email' as identifier column
        const sql = `SELECT * FROM usuarios_pcp WHERE email =  LIMIT 1`;
        const [rows] = await db.query(sql, [email]);
        
        if (!rows || rows.length === 0) {
            logger.debug('[LOGIN] user not found for email=', email);
            return res.status(401).json({ message: 'Email/usuário não encontração.' });
        }

        const user = rows[0];
        logger.debug('[LOGIN] found user id=', user.id, 'email=', user.email);
        const stored = (user.senha || user.password || '').toString();
        const masked = stored  `${stored.slice(0,4)}...len=${stored.length}` : '(empty)';
        logger.debug('[LOGIN] stored password meta=', masked);

        // If bcrypt is available and stored password looks like a bcrypt hash, prefer bcrypt compare
        if (bcrypt && typeof stored === 'string' && stored.match(/^\$2[aby]\$/)) {
            logger.debug('[LOGIN] attempting bcrypt compare (preferred)');
            try {
                const ok = await bcrypt.compare(password, stored);
                logger.debug('[LOGIN] bcrypt compare result=', ok);
                if (ok) {
                    const sid = crypto.randomBytes(16).toString('hex');
                    sessions.set(sid, { user, created: Date.now() });
                    res.setHeader('Set-Cookie', `pcp_session=${sid}; HttpOnly; Path=/; SameSite=Lax`);
                    return res.json({ message: 'Login bem-sucedido!', userData: user });
                }
            } catch (e) {
                logger.error('[LOGIN] bcrypt compare error:', e && e.message  e.message : e);
            }
            // If bcrypt compare fails, authentication fails
            logger.debug('[LOGIN] bcrypt compare failed or not matched');
        }

        // 🔒 SECURITY: Plaintext password fallback removed
        // All passwords MUST be hashed with bcrypt
        logger.warn('[LOGIN] Authentication failed - senha deve estar em bcrypt hash');
        return res.status(401).json({ 
            message: 'Email ou senha inválidos.',
            hint: 'Se esqueceu sua senha, contate o administraçãor para resetá-la.'
        });
    } catch (error) {
        logger.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// ================================
// ROTAS DE RECUPERAÇÃO DE SENHA
// ================================

// Rota de teste
app.get('/api/test', (req, res) => {
    console.log('[DEBUG] Rota /api/test acessada');
    res.json({ message: 'API funcionando', timestamp: new Date().toISOString() });
});

// Rota 1: Verificar se email existe no sistema
app.post('/api/auth/verify-email', async (req, res) => {
    const { email } = req.body;
    
    try {
        console.log(`[PASSWORD_RESET] verify email: ${email}`);
        
        if (!email || !email.includes('@')) {
            return res.status(400).json({ message: 'Email inválido.' });
        }
        
        // Procurar usuário por email
        const identifierCols = ['email', 'nome', 'login', 'usuario', 'username'];
        let user = null;
        
        for (const col of identifierCols) {
            try {
                const sql = `SELECT id, email, nome, departamento FROM usuarios_pcp WHERE ${col} =  LIMIT 1`;
                const [rows] = await db.query(sql, [email]);
                if (rows && rows.length > 0) { 
                    user = rows[0]; 
                    break; 
                }
            } catch (e) {
                if (e && e.code === 'ER_BAD_FIELD_ERROR') {
                    continue;
                }
                throw e;
            }
        }
        
        if (!user) {
            console.log(`[PASSWORD_RESET] email not found: ${email}`);
            return res.status(404).json({ message: 'Email não encontração no sistema.' });
        }
        
        console.log(`[PASSWORD_RESET] email found, user id: ${user.id}`);
        res.json({ 
            message: 'Email encontração.',
            userId: user.id 
        });
        
    } catch (error) {
        console.error('[PASSWORD_RESET] verify email error:', error);
        res.status(500).json({ message: 'Erro no servidor ao verificar email.' });
    }
});

// Rota 2: Verificar daçãos do usuário (nome e departamento)
app.post('/api/auth/verify-user-data', async (req, res) => {
    const { userId, name, department } = req.body;
    
    try {
        console.log(`[PASSWORD_RESET] verify data for user id: ${userId}`);
        
        if (!userId || !name || !department) {
            return res.status(400).json({ message: 'Daçãos incompletos.' });
        }
        
        // Buscar usuário e verificar daçãos
        const [rows] = await db.query(
            'SELECT id, nome, departamento FROM usuarios_pcp WHERE id =  LIMIT 1',
            [userId]
        );
        
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontração.' });
        }
        
        const user = rows[0];
        
        // Verificar nome (case insensitive, permite verificação parcial)
        const storedName = (user.nome || '').toLowerCase().trim();
        const providedName = name.toLowerCase().trim();
        
        const nameMatch = storedName.includes(providedName) || 
                         providedName.includes(storedName) ||
                         storedName === providedName;
        
        // Verificar departamento
        const storedDept = (user.departamento || '').toLowerCase().trim();
        const providedDept = department.toLowerCase().trim();
        const deptMatch = storedDept === providedDept;
        
        if (!nameMatch || !deptMatch) {
            console.log(`[PASSWORD_RESET] data mismatch for user ${userId}: name=${nameMatch}, dept=${deptMatch}`);
            return res.status(400).json({ 
                message: 'Os daçãos não conferem com nossos registros. Verifique o nome completo e departamento.' 
            });
        }
        
        console.log(`[PASSWORD_RESET] data verified for user ${userId}`);
        res.json({ message: 'Daçãos verificaçãos com sucesso.' });
        
    } catch (error) {
        console.error('[PASSWORD_RESET] verify data error:', error);
        res.status(500).json({ message: 'Erro no servidor ao verificar daçãos.' });
    }
});

// Rota 3: Alterar senha do usuário
app.post('/api/auth/change-password', async (req, res) => {
    const { userId, email, newPassword } = req.body;
    
    try {
        console.log(`[PASSWORD_RESET] change password for user id: ${userId}`);
        
        if (!userId || !newPassword) {
            return res.status(400).json({ message: 'Daçãos incompletos.' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' });
        }
        
        // Verificar se usuário existe
        const [userRows] = await db.query(
            'SELECT id FROM usuarios_pcp WHERE id =  LIMIT 1',
            [userId]
        );
        
        if (!userRows || userRows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontração.' });
        }
        
        // Criptografar nova senha se bcrypt estiver disponível
        let hashedPassword = newPassword;
        if (bcrypt) {
            try {
                hashedPassword = await bcrypt.hash(newPassword, 10);
                console.log(`[PASSWORD_RESET] password hashed with bcrypt for user ${userId}`);
            } catch (e) {
                console.error('[PASSWORD_RESET] bcrypt hash error, using plaintext:', e.message);
            }
        } else {
            console.log(`[PASSWORD_RESET] bcrypt not available, storing plaintext for user ${userId}`);
        }
        
        // Atualizar senha no banco - tenta várias colunas de senha possíveis
        const passwordCols = ['senha', 'password'];
        let updated = false;
        
        for (const col of passwordCols) {
            try {
                const sql = `UPDATE usuarios_pcp SET ${col} = , updated_at = NOW() WHERE id = `;
                const [result] = await db.query(sql, [hashedPassword, userId]);
                
                if (result.affectedRows > 0) {
                    updated = true;
                    console.log(`[PASSWORD_RESET] password updated in column ${col} for user ${userId}`);
                    break;
                }
            } catch (e) {
                if (e && e.code === 'ER_BAD_FIELD_ERROR') {
                    continue; // Coluna não existe, tenta a próxima
                }
                throw e;
            }
        }
        
        if (!updated) {
            console.error(`[PASSWORD_RESET] no password column found or update failed for user ${userId}`);
            return res.status(500).json({ message: 'Erro ao atualizar senha no banco de daçãos.' });
        }
        
        // Log da alteração para auditoria
        try {
            await db.query(
                'INSERT INTO audit_log (user_id, action, details, created_at) VALUES (, , , NOW())',
                [userId, 'PASSWORD_RESET', `Password reset via recovery process for email: ${email}`]
            );
        } catch (auditError) {
            // Log de auditoria falhou, mas não impede o sucesso da operação
            console.error('[PASSWORD_RESET] audit log failed:', auditError.message);
        }
        
        console.log(`[PASSWORD_RESET] password successfully changed for user ${userId}`);
        res.json({ message: 'Senha alterada com sucesso!' });
        
    } catch (error) {
        console.error('[PASSWORD_RESET] change password error:', error);
        res.status(500).json({ message: 'Erro no servidor ao alterar senha.' });
    }
});

// ================================

// Protected sample endpoints for Dashboard / Prazos / Custos
app.get('/api/pcp/dashboard', authRequired, async (req, res) => {
    try {
        // sample aggregated data: counts and some recent pedidos
        const [pedidos] = await db.query('SELECT id, cliente, produto_id, quantidade, status, data_pedido FROM pedidos ORDER BY data_pedido DESC LIMIT 10');
        const [totals] = await db.query('SELECT COUNT(*) as total_pedidos FROM pedidos');
        res.json({ totals: totals[0], recentPedidos: pedidos });
    } catch (err) {
        logger.error('Dashboard error:', err.message);
        res.status(500).json({ message: 'Erro ao buscar daçãos do dashboard.' });
    }
});

app.get('/api/pcp/prazos', authRequired, async (req, res) => {
    try {
        // show orders with nearest deadlines
        const [rows] = await db.query("SELECT id, codigo_produto, descricao_produto, data_previsao_entrega, status FROM ordens_producao ORDER BY data_previsao_entrega ASC LIMIT 30");
        res.json(rows);
    } catch (err) {
        logger.error('Prazos error:', err.message);
        res.status(500).json({ message: 'Erro ao buscar prazos.' });
    }
});

app.get('/api/pcp/custos', authRequired, async (req, res) => {
    try {
        // simple cost overview: sum of pedido quantities * sample cost per product (join if exists)
        const [rows] = await db.query("SELECT p.id, p.descricao, p.custo_unitario, p.quantidade_estoque FROM produtos p ORDER BY p.descricao ASC LIMIT 50");
        res.json(rows);
    } catch (err) {
        logger.error('Custos error:', err.message);
        res.status(500).json({ message: 'Erro ao buscar custos.' });
    }
});

// Rota para buscar todas as Ordens de Produção (LEGACY - usar /api/pcp/ordens-producao)
app.get('/api/pcp/ordens', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM ordens_producao ORDER BY data_prevista ASC");
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Erro ao buscar ordens:", error);
        res.status(500).json({ success: false, message: "Erro ao buscar ordens." });
    }
});

// Buscar produto por código (auto-preenchimento)
app.get('/api/pcp/produtos/codigo/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        const [rows] = await db.query(
            "SELECT * FROM produtos WHERE codigo =  OR codigo LIKE  LIMIT 1", 
            [codigo, `%${codigo}%`]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Produto não encontração' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error("Erro ao buscar produto por código:", error);
        res.status(500).json({ message: "Erro ao buscar produto." });
    }
});

// Buscar produto por GTIN
app.get('/api/pcp/produtos/gtin/:gtin', async (req, res) => {
    try {
        const { gtin } = req.params;
        const [rows] = await db.query(
            "SELECT * FROM produtos WHERE gtin =  LIMIT 1", 
            [gtin]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Produto não encontração com este GTIN' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error("Erro ao buscar produto por GTIN:", error);
        res.status(500).json({ message: "Erro ao buscar produto." });
    }
});

// Buscar produto por SKU
app.get('/api/pcp/produtos/sku/:sku', async (req, res) => {
    try {
        const { sku } = req.params;
        const [rows] = await db.query(
            "SELECT * FROM produtos WHERE sku =  LIMIT 1", 
            [sku]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Produto não encontração com este SKU' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error("Erro ao buscar produto por SKU:", error);
        res.status(500).json({ message: "Erro ao buscar produto." });
    }
});

// Rota para criar uma nova Ordem de Produção
// Create new production order — adapted to accept extra fields without requiring an immediate schema migration.
app.post('/api/pcp/ordens', async (req, res) => {
    const { codigo_produto, descricao_produto, quantidade, data_previsao_entrega } = req.body;
    let observacoes = req.body.observacoes || null;

    // List of additional fields coming from the UI/modal that we'd like to persist if the table supports them
    const candidateFields = ['cliente','contato','email','telefone','frete','vendedor','numero_orcamento','revisao','pedido_referencia','data_liberacao', 'variacao', 'embalagem', 'lances'];

    // Helper: cache table columns to avoid repeated information_schema queries
    const tableColsCache = app.locals._tableColsCache = app.locals._tableColsCache || {};
    async function getTableColumns(tableName) {
        if (tableColsCache[tableName]) return tableColsCache[tableName];
        try {
            const schema = (db && db.config && db.config.connectionConfig && db.config.connectionConfig.database)  db.config.connectionConfig.database : 'aluforce_vendas';
            const [cols] = await db.query('SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema =  AND table_name = ', [schema, tableName]);
            const names = Array.isArray(cols)  cols.map(r => r.COLUMN_NAME) : [];
            tableColsCache[tableName] = names;
            return names;
        } catch (e) {
            console.error('Erro ao consultar information_schema para', tableName, e && e.message  e.message : e);
            return [];
        }
    }

    try {
        const cols = await getTableColumns('ordens_producao');

        // Base insert columns
        const insertCols = ['codigo_produto', 'descricao_produto', 'quantidade', 'data_previsao_entrega', 'observacoes', 'status'];
        const values = [codigo_produto, descricao_produto, quantidade, data_previsao_entrega || null, observacoes, 'A Fazer'];

        // Collect extras: those that map to real columns will be inserted directly; others will be grouped
        const extras = {};
        for (const f of candidateFields) {
            if (typeof req.body[f] !== 'undefined' && req.body[f] !== null && req.body[f] !== '') {
                if (cols.includes(f)) {
                    insertCols.push(f);
                    values.push(req.body[f]);
                } else {
                    extras[f] = req.body[f];
                }
            }
        }

        // transportaçãora object handling: flatten into extras.transportaçãora_* or store under JSON field
        if (req.body.transportaçãora && typeof req.body.transportaçãora === 'object') {
            const t = req.body.transportaçãora;
            // try to persist individual transportaçãora fields if columns exist
            const tFields = { nome: 'transportaçãora_nome', fone: 'transportaçãora_fone', cep: 'transportaçãora_cep', endereco: 'transportaçãora_endereco', cpf_cnpj: 'transportaçãora_cpf_cnpj', email_nfe: 'transportaçãora_email_nfe' };
            for (const k of Object.keys(tFields)) {
                const col = tFields[k];
                if (t[k] && cols.includes(col)) {
                    insertCols.push(col);
                    values.push(t[k]);
                } else if (t[k]) {
                    extras[col] = t[k];
                }
            }
        }

        // Server-side validations: transportaçãora email and cpf/cnpj
        if (extras.transportaçãora_email_nfe || (req.body.transportaçãora && req.body.transportaçãora.email_nfe)) {
            const email = extras.transportaçãora_email_nfe || req.body.transportaçãora.email_nfe;
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({ message: 'E-mail NFe da transportaçãora inválido.' });
            }
        }
        if (extras.transportaçãora_cpf_cnpj || (req.body.transportaçãora && req.body.transportaçãora.cpf_cnpj)) {
            const doc = (extras.transportaçãora_cpf_cnpj || req.body.transportaçãora.cpf_cnpj || '').toString().replace(/[^0-9]/g, '');
            if (doc && !(doc.length === 11 || doc.length === 14)) {
                return res.status(400).json({ message: 'CPF/CNPJ da transportaçãora inválido (deve conter 11 ou 14 dígitos).' });
            }
        }

        // If client sent items JSON (from new UI table), include it in extras so it can be persisted
        if (req.body.items_json) {
            try {
                const parsed = typeof req.body.items_json === 'string'  JSON.parse(req.body.items_json) : req.body.items_json;
                if (Array.isArray(parsed) && parsed.length > 0) {
                    extras.items = parsed;
                }
            } catch (e) { /* ignore parse errors */ }
        }

        // If there's a JSON / extras column available in the table, store extras there
        const jsonCandidates = ['extra', 'extras', 'meta', 'metadata', 'daçãos', 'detalhes', 'details'];
        let usedJsonField = null;
        for (const jc of jsonCandidates) {
            if (cols.includes(jc)) { usedJsonField = jc; break; }
        }

        if (Object.keys(extras).length > 0) {
            if (usedJsonField) {
                insertCols.push(usedJsonField);
                values.push(JSON.stringify(extras));
            } else {
                // fallback: append JSON-encoded extras to observacoes so data is not lost
                try {
                    const existing = observacoes  observacoes + '\n' : '';
                    observacoes = existing + JSON.stringify(extras);
                    // update observacoes value in the values array (it's at index 4)
                    const obsIndex = insertCols.indexOf('observacoes');
                    if (obsIndex >= 0) values[obsIndex] = observacoes;
                } catch (e) { /* ignore stringify errors */ }
            }
        }

        const placeholders = insertCols.map(() => '').join(', ');
        const sql = `INSERT INTO ordens_producao (${insertCols.join(', ')}) VALUES (${placeholders})`;
        const [result] = await db.query(sql, values);
        res.status(201).json({ message: 'Ordem criada com sucesso!', id: result.insertId });
    } catch (error) {
        console.error('Erro ao criar ordem:', error && error.message  error.message : error);
        res.status(500).json({ message: 'Erro ao criar ordem.' });
    }
});

// Rota para atualizar o STATUS de uma Ordem de Produção
app.put('/api/pcp/ordens/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const [result] = await db.query("UPDATE ordens_producao SET status =  WHERE id = ", [status, id]);
        if (result.affectedRows > 0) {
            res.json({ message: "Status atualização com sucesso!" });
        } else {
            res.status(404).json({ message: "Ordem não encontrada." });
        }
    } catch (error) {
        console.error("Erro ao atualizar status:", error);
        res.status(500).json({ message: "Erro ao atualizar status." });
    }
});


// --- NOVAS ROTAS PARA GESTÃO DE MATERIAIS ---

// Rota para criar um novo material
app.post('/api/pcp/materiais', async (req, res) => {
    const { codigo_material, descricao, unidade_medida, quantidade_estoque, fornecedor_padrao } = req.body;
    const sql = "INSERT INTO materiais (codigo_material, descricao, unidade_medida, quantidade_estoque, fornecedor_padrao) VALUES (, , , , )";
    try {
        const [result] = await db.query(sql, [codigo_material, descricao, unidade_medida, quantidade_estoque, fornecedor_padrao]);
    res.status(201).json({ message: "Material criação com sucesso!", id: result.insertId });
    // Broadcast para clientes conectaçãos
    broadcastMaterials();
    } catch (error) {
        console.error("Erro ao criar material:", error);
        res.status(500).json({ message: "Erro ao criar material.", error: error.message });
    }
});

// Rota para buscar todos os materiais
app.get('/api/pcp/materiais', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM materiais ORDER BY descricao ASC");
        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar materiais:", error);
        res.status(500).json({ message: "Erro ao buscar materiais." });
    }
});

// Rota para buscar todos os produtos
// Observação: assume-se que exista a tabela `produtos` no banco `aluforce_vendas`.
app.get('/api/pcp/produtos', async (req, res) => {
    console.log('[API_PRODUTOS] Requisição recebida:', req.query);
    try {
        // support pagination: page=1&limit=6
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
        if (page < 1) page = 1;
        if (limit < 1) limit = 10;
        const offset = (page - 1) * limit;
        console.log('[API_PRODUTOS] Parâmetros:', { page, limit, offset });

    const q = (req.query.q || '').trim();
    const like = `%${q}%`;

        // fetch column metadata so client can mirror fields and build safe queries
        let columns = [];
        try {
            console.log('[API_PRODUTOS] Buscando colunas da tabela produtos...');
            const [cols] = await db.query('SHOW COLUMNS FROM produtos');
            columns = Array.isArray(cols)  cols.map(c => c.Field) : [];
            console.log('[API_PRODUTOS] Colunas encontradas:', columns.length);
        } catch (e) {
            // if table missing or permission issues, respond gracefully
            console.error('[API_PRODUTOS] Erro ao buscar colunas:', e && e.message  e.message : e);
            return res.status(500).json({ message: 'Erro ao acessar tabela produtos.' });
        }

        const has = (name) => columns.includes(name);
        const orderColumn = has('descricao')  'descricao' : (has('nome')  'nome' : (has('codigo')  'codigo' : 'id'));

        // fetch rows with limit (optionally filtered by q) using only existing searchable columns
        let rows = [];
        let total = 0;
        if (q) {
            const whereParts = [];
            const params = [];
            if (has('codigo')) { whereParts.push('codigo LIKE '); params.push(like); }
            if (has('descricao')) { whereParts.push('descricao LIKE '); params.push(like); }
            if (has('nome')) { whereParts.push('nome LIKE '); params.push(like); }
            if (has('variacao')) { whereParts.push('variacao LIKE '); params.push(like); }

            if (whereParts.length === 0) {
                // nothing to search against
                rows = [];
                total = 0;
            } else {
                const sql = `SELECT * FROM produtos WHERE ${whereParts.join(' OR ')} ORDER BY ${orderColumn} ASC LIMIT  OFFSET `;
                params.push(limit, offset);
                const [rs] = await db.query(sql, params);
                rows = rs;
                // count
                const countSql = `SELECT COUNT(*) AS total FROM produtos WHERE ${whereParts.join(' OR ')}`;
                const [countRes] = await db.query(countSql, params.slice(0, params.length - 2));
                total = countRes && countRes[0]  countRes[0].total : 0;
            }
        } else {
            const sql = `SELECT * FROM produtos ORDER BY ${orderColumn} ASC LIMIT  OFFSET `;
            console.log('[API_PRODUTOS] Executando query:', sql, [limit, offset]);
            const [rs] = await db.query(sql, [limit, offset]);
            rows = rs;
            console.log('[API_PRODUTOS] Produtos retornaçãos:', rows.length);
            const [countRes] = await db.query('SELECT COUNT(*) AS total FROM produtos');
            total = countRes && countRes[0]  countRes[0].total : 0;
            console.log('[API_PRODUTOS] Total no banco:', total);
        }

        // try to normalize variacao column to JSON arrays for clients
        let convertedLegacy = false;
        const normalizedRows = (rows || []).map(r => {
            try {
                if (r && typeof r.variacao === 'string') {
                    const raw = r.variacao.trim();
                    if (!raw) { r.variacao = []; }
                    else if (raw.startsWith('[') || raw.startsWith('{')) {
                        try { r.variacao = JSON.parse(raw); } catch (e) { r.variacao = [raw]; convertedLegacy = true; }
                    } else {
                        // legacy CSV or semicolon separated
                        const parts = raw.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
                        r.variacao = parts;
                        convertedLegacy = true;
                    }
                }
                // Backwards compatibility: if client expects 'descricao' but DB has 'nome', map it
                if (!r.descricao && r.nome) {
                    r.descricao = r.nome;
                }
            } catch (e) { /* ignore parse errors */ }
            return r;
        });

    if (convertedLegacy) res.setHeader('X-PCP-Warn', 'variacao-legacy-converted');
    // Ensure columns list includes descricao for clients that expect it
    if (!columns.includes('descricao') && columns.includes('nome')) columns.push('descricao');
    
    console.log('[API_PRODUTOS] Enviando resposta:', { 
        page, 
        limit, 
        total, 
        rows_count: normalizedRows.length,
        columns_count: columns.length 
    });
    res.json({ page, limit, total, rows: normalizedRows, columns });
    } catch (error) {
        console.error('[API_PRODUTOS] ERRO FATAL:', error && error.message  error.message : error);
        console.error('[API_PRODUTOS] Stack:', error.stack);
        // Provide minimal debug info in a separate endpoint for local troubleshooting
        res.status(500).json({ message: 'Erro ao buscar produtos.', error: error.message });
    }
});

// (debug endpoint removed) - temporary debug endpoint was removed for production safety

// ==================== ROTAS DE ORDENS DE PRODUÇÃO (KANBAN) ====================

// API para Kanban de Ordens de Produção - formato compatível com ordens-producao.html
app.get('/api/pcp/ordens-kanban', async (req, res) => {
    console.log('[API_ORDENS_KANBAN] Requisição recebida');
    try {
        // Verifica se a tabela existe
        const [tables] = await db.query("SHOW TABLES LIKE 'ordens_producao_kanban'");
        
        if (!tables || tables.length === 0) {
            // Tenta criar a tabela
            await db.query(`
                CREATE TABLE IF NOT EXISTS ordens_producao_kanban (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    numero VARCHAR(50) NOT NULL,
                    status ENUM('a_produzir', 'produzindo', 'qualidade', 'conferido', 'concluido', 'armazenação') DEFAULT 'a_produzir',
                    status_texto VARCHAR(50) DEFAULT 'Em dia',
                    produto VARCHAR(255) NOT NULL,
                    descricao TEXT,
                    codigo VARCHAR(50),
                    data_conclusao DATE,
                    quantidade INT DEFAULT 0,
                    produzido INT DEFAULT 0,
                    unidade VARCHAR(10) DEFAULT 'M',
                    observacoes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('[API_ORDENS_KANBAN] Tabela criada com sucesso');
        }

        // Busca daçãos
        const [rows] = await db.query(`
            SELECT 
                id, numero, status, status_texto as statusTexto, produto, descricao, 
                codigo, DATE_FORMAT(data_conclusao, '%Y-%m-%d') as dataConclusao, 
                quantidade, produzido, unidade, observacoes, created_at
            FROM ordens_producao_kanban
            ORDER BY 
                CASE 
                    WHEN status = 'a_produzir' THEN 1
                    WHEN status = 'produzindo' THEN 2
                    WHEN status = 'qualidade' THEN 3
                    WHEN status = 'conferido' THEN 4
                    WHEN status = 'concluido' THEN 5
                    WHEN status = 'armazenação' THEN 6
                END,
                data_conclusao ASC
        `);

        console.log('[API_ORDENS_KANBAN] Retornando', rows.length, 'ordens');
        res.json(rows);

    } catch (error) {
        console.error('[API_ORDENS_KANBAN] Erro:', error.message);
        res.status(500).json([]);
    }
});

// Criar nova ordem no Kanban
app.post('/api/pcp/ordens-kanban', async (req, res) => {
    console.log('[API_ORDENS_KANBAN] Criando nova ordem');
    try {
        const { numero, produto, descricao, codigo, dataConclusao, quantidade, unidade, observacoes } = req.body;

        // Verificar se está atrasada
        const hoje = new Date();
        const dataConc = new Date(dataConclusao);
        const statusTexto = dataConc < hoje  'Atrasada' : 'Em dia';

        const [result] = await db.query(`
            INSERT INTO ordens_producao_kanban 
            (numero, status, status_texto, produto, descricao, codigo, data_conclusao, quantidade, produzido, unidade, observacoes)
            VALUES (, 'a_produzir', , , , , , , 0, , )
        `, [numero, statusTexto, produto, descricao || '', codigo || '', dataConclusao, quantidade, unidade || 'M', observacoes || '']);

        const novaOrdem = {
            id: result.insertId,
            numero,
            status: 'a_produzir',
            statusTexto,
            produto,
            descricao: descricao || '',
            codigo: codigo || '',
            dataConclusao,
            quantidade,
            produzido: 0,
            unidade: unidade || 'M',
            observacoes: observacoes || ''
        };

        console.log('[API_ORDENS_KANBAN] Ordem criada com ID:', result.insertId);
        res.status(201).json(novaOrdem);

    } catch (error) {
        console.error('[API_ORDENS_KANBAN] Erro ao criar:', error.message);
        res.status(500).json({ error: 'Erro ao criar ordem de produção' });
    }
});

// Atualizar status da ordem no Kanban
app.put('/api/pcp/ordens-kanban/:id', async (req, res) => {
    console.log('[API_ORDENS_KANBAN] Atualizando ordem ID:', req.params.id);
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Determinar status texto
        let statusTexto = 'Em dia';
        if (status === 'concluido' || status === 'armazenação') {
            statusTexto = 'Concluída';
        }

        // Se status for concluido ou armazenação, atualiza produzido = quantidade
        if (status === 'concluido' || status === 'armazenação') {
            await db.query(`
                UPDATE ordens_producao_kanban 
                SET status = , status_texto = , produzido = quantidade
                WHERE id = 
            `, [status, statusTexto, id]);
        } else {
            await db.query(`
                UPDATE ordens_producao_kanban 
                SET status = , status_texto = 
                WHERE id = 
            `, [status, statusTexto, id]);
        }

        console.log('[API_ORDENS_KANBAN] Ordem atualizada');
        res.json({ success: true, message: 'Status atualização com sucesso' });

    } catch (error) {
        console.error('[API_ORDENS_KANBAN] Erro ao atualizar:', error.message);
        res.status(500).json({ error: 'Erro ao atualizar status da ordem' });
    }
});

// ==================== ROTAS DE ORDENS DE PRODUÇÃO (LEGACY) ====================

// Buscar todas as ordens de produção
app.get('/api/pcp/ordens-producao', async (req, res) => {
    console.log('[API_ORDENS_PRODUCAO] Requisição recebida');
    try {
        // Verifica se a tabela existe
        const [tables] = await db.query("SHOW TABLES LIKE 'ordens_producao'");
        
        if (!tables || tables.length === 0) {
            console.log('[API_ORDENS_PRODUCAO] Tabela não existe, retornando daçãos de exemplo');
            // Retorna daçãos de exemplo para teste
            const ordensExemplo = [
                {
                    id: 1,
                    codigo: 'OP-2025-001',
                    produto_nome: 'Perfil de Alumínio 6063 T5 - 50x50mm',
                    quantidade: 500,
                    unidade: 'UN',
                    status: 'em_producao',
                    prioridade: 'alta',
                    data_inicio: '2025-01-10',
                    data_prevista: '2025-01-20',
                    data_conclusao: null,
                    responsavel: 'João Silva',
                    progresso: 65,
                    observacoes: 'Pedido urgente - Cliente Premium',
                    created_at: '2025-01-10T08:00:00'
                },
                {
                    id: 2,
                    codigo: 'OP-2025-002',
                    produto_nome: 'Chapa de Alumínio 1200 H14 - 2mm',
                    quantidade: 300,
                    unidade: 'UN',
                    status: 'pendente',
                    prioridade: 'media',
                    data_inicio: '2025-01-15',
                    data_prevista: '2025-01-25',
                    data_conclusao: null,
                    responsavel: 'Maria Santos',
                    progresso: 0,
                    observacoes: 'Aguardando matéria-prima',
                    created_at: '2025-01-12T10:30:00'
                },
                {
                    id: 3,
                    codigo: 'OP-2025-003',
                    produto_nome: 'Tubo de Alumínio 6061 - Ø50mm',
                    quantidade: 200,
                    unidade: 'MT',
                    status: 'ativa',
                    prioridade: 'baixa',
                    data_inicio: '2025-01-18',
                    data_prevista: '2025-02-05',
                    data_conclusao: null,
                    responsavel: 'Pedro Costa',
                    progresso: 15,
                    observacoes: null,
                    created_at: '2025-01-14T14:15:00'
                },
                {
                    id: 4,
                    codigo: 'OP-2024-999',
                    produto_nome: 'Perfil H Alumínio 6063 - 40x80mm',
                    quantidade: 150,
                    unidade: 'UN',
                    status: 'concluida',
                    prioridade: 'alta',
                    data_inicio: '2024-12-20',
                    data_prevista: '2025-01-05',
                    data_conclusao: '2025-01-03',
                    responsavel: 'Ana Lima',
                    progresso: 100,
                    observacoes: 'Concluído antes do prazo',
                    created_at: '2024-12-18T09:00:00'
                }
            ];
            
            return res.json({ 
                success: true, 
                data: ordensExemplo,
                total: ordensExemplo.length,
                message: 'Daçãos de exemplo (tabela não criada ainda)'
            });
        }

        // Se a tabela existe, busca os daçãos reais
        const [rows] = await db.query(`
            SELECT 
                id, codigo, produto_nome, quantidade, unidade,
                status, prioridade, data_inicio, data_prevista, 
                data_conclusao, responsavel, progresso, observacoes,
                created_at, updated_at
            FROM ordens_producao
            ORDER BY 
                CASE 
                    WHEN status = 'em_producao' THEN 1
                    WHEN status = 'ativa' THEN 2
                    WHEN status = 'pendente' THEN 3
                    WHEN status = 'concluida' THEN 4
                    ELSE 5
                END,
                data_prevista ASC
        `);

        console.log('[API_ORDENS_PRODUCAO] Retornando', rows.length, 'ordens');
        res.json({ 
            success: true, 
            data: rows,
            total: rows.length
        });

    } catch (error) {
        console.error('[API_ORDENS_PRODUCAO] Erro:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao buscar ordens de produção',
            error: error.message 
        });
    }
});

// Criar nova ordem de produção
app.post('/api/pcp/ordens-producao', async (req, res) => {
    console.log('[API_ORDENS_PRODUCAO] Criando nova ordem');
    try {
        const { 
            codigo, produto_nome, quantidade, unidade, status, 
            prioridade, data_inicio, data_prevista, responsavel, observacoes 
        } = req.body;

        const [result] = await db.query(`
            INSERT INTO ordens_producao 
            (codigo, produto_nome, quantidade, unidade, status, prioridade, 
             data_inicio, data_prevista, responsavel, progresso, observacoes)
            VALUES (, , , , , , , , , 0, )
        `, [codigo, produto_nome, quantidade, unidade, status, prioridade, 
            data_inicio, data_prevista, responsavel, observacoes]);

        console.log('[API_ORDENS_PRODUCAO] Ordem criada com ID:', result.insertId);
        res.status(201).json({ 
            success: true, 
            message: 'Ordem de produção criada com sucesso',
            id: result.insertId 
        });

    } catch (error) {
        console.error('[API_ORDENS_PRODUCAO] Erro ao criar:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao criar ordem de produção',
            error: error.message 
        });
    }
});

// Atualizar ordem de produção
app.put('/api/pcp/ordens-producao/:id', async (req, res) => {
    console.log('[API_ORDENS_PRODUCAO] Atualizando ordem', req.params.id);
    try {
        const { id } = req.params;
        const updates = req.body;

        const allowedFields = [
            'produto_nome', 'quantidade', 'unidade', 'status', 'prioridade',
            'data_inicio', 'data_prevista', 'data_conclusao', 'responsavel', 
            'progresso', 'observacoes'
        ];

        const fields = [];
        const values = [];

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                fields.push(`${key} = `);
                values.push(updates[key]);
            }
        });

        if (fields.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nenhum campo válido para atualizar' 
            });
        }

        values.push(id);
        await db.query(`
            UPDATE ordens_producao 
            SET ${fields.join(', ')}, updated_at = NOW()
            WHERE id = 
        `, values);

        console.log('[API_ORDENS_PRODUCAO] Ordem atualizada');
        res.json({ 
            success: true, 
            message: 'Ordem de produção atualizada com sucesso' 
        });

    } catch (error) {
        console.error('[API_ORDENS_PRODUCAO] Erro ao atualizar:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao atualizar ordem de produção',
            error: error.message 
        });
    }
});

// ==================== ROTAS DE FATURAMENTO ====================

// Buscar todos os faturamentos
app.get('/api/pcp/faturamentos', async (req, res) => {
    console.log('[API_FATURAMENTOS] Requisição recebida');
    try {
        // Verifica se a tabela existe
        const [tables] = await db.query("SHOW TABLES LIKE 'programacao_faturamento'");
        
        if (!tables || tables.length === 0) {
            console.log('[API_FATURAMENTOS] Tabela não existe, retornando daçãos de exemplo');
            // Retorna daçãos de exemplo para teste
            const faturamentosExemplo = [
                {
                    id: 1,
                    numero: 'FAT-2025-001',
                    cliente_nome: 'Construtora Silva & Cia',
                    valor: 45000.00,
                    status: 'faturar_hoje',
                    tipo: 'nfe',
                    data_programada: '2025-01-15',
                    data_emissao: null,
                    numero_nfe: null,
                    observacoes: 'Cliente preferencial - prioridade alta',
                    created_at: '2025-01-10T08:00:00'
                },
                {
                    id: 2,
                    numero: 'FAT-2025-002',
                    cliente_nome: 'Indústria ABC Ltda',
                    valor: 23500.50,
                    status: 'emitida',
                    tipo: 'nfe',
                    data_programada: '2025-01-12',
                    data_emissao: '2025-01-12',
                    numero_nfe: '12345',
                    observacoes: null,
                    created_at: '2025-01-08T10:30:00'
                },
                {
                    id: 3,
                    numero: 'FAT-2025-003',
                    cliente_nome: 'Comercial XYZ',
                    valor: 18750.00,
                    status: 'pendente',
                    tipo: 'nfe',
                    data_programada: '2025-01-20',
                    data_emissao: null,
                    numero_nfe: null,
                    observacoes: 'Aguardando confirmação de entrega',
                    created_at: '2025-01-11T14:15:00'
                },
                {
                    id: 4,
                    numero: 'FAT-2025-004',
                    cliente_nome: 'Metalúrgica Delta',
                    valor: 12300.00,
                    status: 'atrasada',
                    tipo: 'nfe',
                    data_programada: '2025-01-10',
                    data_emissao: null,
                    numero_nfe: null,
                    observacoes: 'URGENTE - Cliente aguardando',
                    created_at: '2025-01-05T09:00:00'
                },
                {
                    id: 5,
                    numero: 'FAT-2025-005',
                    cliente_nome: 'Distribuidora Omega',
                    valor: 67500.00,
                    status: 'emitida',
                    tipo: 'nfe',
                    data_programada: '2025-01-13',
                    data_emissao: '2025-01-13',
                    numero_nfe: '12346',
                    observacoes: 'Maior cliente do trimestre',
                    created_at: '2025-01-09T11:20:00'
                }
            ];
            
            return res.json({ 
                success: true, 
                data: faturamentosExemplo,
                total: faturamentosExemplo.length,
                message: 'Daçãos de exemplo (tabela não criada ainda)'
            });
        }

        // Se a tabela existe, busca os daçãos reais
        const [rows] = await db.query(`
            SELECT 
                id, numero, cliente_nome, valor, status, tipo,
                data_programada, data_emissao, numero_nfe, observacoes,
                created_at, updated_at
            FROM programacao_faturamento
            ORDER BY 
                CASE 
                    WHEN status = 'atrasada' THEN 1
                    WHEN status = 'faturar_hoje' THEN 2
                    WHEN status = 'pendente' THEN 3
                    WHEN status = 'emitida' THEN 4
                    ELSE 5
                END,
                data_programada ASC
        `);

        console.log('[API_FATURAMENTOS] Retornando', rows.length, 'faturamentos');
        res.json({ 
            success: true, 
            data: rows,
            total: rows.length
        });

    } catch (error) {
        console.error('[API_FATURAMENTOS] Erro:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao buscar faturamentos',
            error: error.message 
        });
    }
});

// Criar novo faturamento
app.post('/api/pcp/faturamentos', async (req, res) => {
    console.log('[API_FATURAMENTOS] Criando novo faturamento');
    try {
        const { 
            numero, cliente_nome, valor, status, tipo,
            data_programada, observacoes 
        } = req.body;

        const [result] = await db.query(`
            INSERT INTO programacao_faturamento 
            (numero, cliente_nome, valor, status, tipo, data_programada, observacoes)
            VALUES (, , , , , , )
        `, [numero, cliente_nome, valor, status, tipo, data_programada, observacoes]);

        console.log('[API_FATURAMENTOS] Faturamento criação com ID:', result.insertId);
        res.status(201).json({ 
            success: true, 
            message: 'Faturamento criação com sucesso',
            id: result.insertId 
        });

    } catch (error) {
        console.error('[API_FATURAMENTOS] Erro ao criar:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao criar faturamento',
            error: error.message 
        });
    }
});

// Atualizar faturamento
app.put('/api/pcp/faturamentos/:id', async (req, res) => {
    console.log('[API_FATURAMENTOS] Atualizando faturamento', req.params.id);
    try {
        const { id } = req.params;
        const updates = req.body;

        const allowedFields = [
            'cliente_nome', 'valor', 'status', 'tipo', 'data_programada',
            'data_emissao', 'numero_nfe', 'observacoes'
        ];

        const fields = [];
        const values = [];

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                fields.push(`${key} = `);
                values.push(updates[key]);
            }
        });

        if (fields.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nenhum campo válido para atualizar' 
            });
        }

        values.push(id);
        await db.query(`
            UPDATE programacao_faturamento 
            SET ${fields.join(', ')}, updated_at = NOW()
            WHERE id = 
        `, values);

        console.log('[API_FATURAMENTOS] Faturamento atualização');
        res.json({ 
            success: true, 
            message: 'Faturamento atualização com sucesso' 
        });

    } catch (error) {
        console.error('[API_FATURAMENTOS] Erro ao atualizar:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao atualizar faturamento',
            error: error.message 
        });
    }
});

// Criar novo produto
app.post('/api/pcp/produtos', async (req, res) => {
    console.log('[CREATE_PRODUCT] Endpoint chamação');
    const { 
        codigo, nome, descricao, sku, gtin, variacao, marca,
        categoria, unidade, preco_custo, preco_venda, 
        estoque, estoque_minimo, estoque_maximo 
    } = req.body;
    
    try {
        // Validação do GTIN (se fornecido)
        if (gtin && (!/^\d{8,14}$/.test(gtin))) {
            return res.status(400).json({ message: 'GTIN deve conter apenas números (8 a 14 dígitos).' });
        }

        // Require variacao to be an array (or a JSON string that parses to an array).
        let variacaoForDb = null;
        if (typeof variacao === 'undefined' || variacao === null) {
            variacaoForDb = null;
        } else if (Array.isArray(variacao)) {
            variacaoForDb = JSON.stringify(variacao);
        } else if (typeof variacao === 'string') {
            const v = variacao.trim();
            if (v.length === 0) {
                variacaoForDb = null;
            } else {
                try {
                    const parsed = JSON.parse(v);
                    if (!Array.isArray(parsed)) {
                        return res.status(400).json({ message: 'Campo variacao deve ser um array JSON.' });
                    }
                    variacaoForDb = JSON.stringify(parsed);
                } catch (e) {
                    return res.status(400).json({ message: 'Formato de variacao obsoleto. Envie um array JSON (ex: ["A","B"]).' });
                }
            }
        } else {
            return res.status(400).json({ message: 'Campo variacao inválido. Deve ser um array JSON.' });
        }
        
        // Inserir produto com todos os campos
        const sql = `INSERT INTO produtos 
            (codigo, nome, descricao, sku, gtin, variacao, marca, categoria, unidade, 
             preco_custo, preco_venda, estoque_atual, estoque_minimo, estoque_maximo) 
            VALUES (, , , , , , , , , , , , , )`;
            
        const values = [
            codigo, 
            nome || descricao, 
            descricao || null, 
            sku || null, 
            gtin || null, 
            variacaoForDb, 
            marca || null,
            categoria || null,
            unidade || null,
            preco_custo || 0,
            preco_venda || 0,
            estoque || 0,
            estoque_minimo || 0,
            estoque_maximo || 0
        ];
        
        const [result] = await db.query(sql, values);
        
        console.log('[CREATE_PRODUCT] Produto criação com sucesso:', {
            id: result.insertId,
            codigo,
            sku,
            gtin
        });
        
        res.status(201).json({ 
            message: 'Produto criação com sucesso', 
            id: result.insertId,
            sku: sku,
            gtin: gtin
        });
        
        if (typeof broadcastProducts === 'function') {
            broadcastProducts();
        }
    } catch (err) {
        console.error('[CREATE_PRODUCT] Erro ao criar produto:', err.message);
        if (err.code === 'ER_DUP_ENTRY') {
            if (err.message.includes('ux_produtos_gtin') || err.message.includes('gtin')) {
                return res.status(400).json({ message: 'GTIN já existe no sistema.' });
            }
            if (err.message.includes('ux_produtos_sku') || err.message.includes('sku')) {
                return res.status(400).json({ message: 'SKU já existe no sistema.' });
            }
            if (err.message.includes('codigo')) {
                return res.status(400).json({ message: 'Código já existe no sistema.' });
            }
        }
        res.status(500).json({ message: 'Erro ao criar produto: ' + err.message });
    }
});

// Atualizar produto
app.put('/api/pcp/produtos/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        codigo, nome, descricao, sku, gtin, variacao, marca,
        categoria, unidade, preco, preco_custo, preco_venda, ncm,
        estoque, estoque_minimo, estoque_maximo, observacoes 
    } = req.body;
    
    console.log('[UPDATE_PRODUCT] Daçãos recebidos:', { id, codigo, nome, estoque, estoque_minimo, preco, preco_venda });
    
    try {
        // Validação do GTIN (se fornecido)
        if (gtin && (!/^\d{8,14}$/.test(gtin))) {
            return res.status(400).json({ message: 'GTIN deve conter apenas números (8 a 14 dígitos).' });
        }

        // Require variacao to be an array (or a JSON string that parses to an array).
        let variacaoForDb = null;
        if (typeof variacao === 'undefined' || variacao === null) {
            variacaoForDb = null;
        } else if (Array.isArray(variacao)) {
            variacaoForDb = JSON.stringify(variacao);
        } else if (typeof variacao === 'string') {
            const v = variacao.trim();
            if (v.length === 0) {
                variacaoForDb = null;
            } else {
                try {
                    const parsed = JSON.parse(v);
                    if (!Array.isArray(parsed)) {
                        return res.status(400).json({ message: 'Campo variacao deve ser um array JSON.' });
                    }
                    variacaoForDb = JSON.stringify(parsed);
                } catch (e) {
                    return res.status(400).json({ message: 'Formato de variacao obsoleto. Envie um array JSON (ex: ["A","B"]).' });
                }
            }
        } else {
            return res.status(400).json({ message: 'Campo variacao inválido. Deve ser um array JSON.' });
        }
        
        // Usar preco_venda se preco não foi fornecido diretamente
        const precoVendaFinal = preco_venda !== undefined  preco_venda : (preco || 0);
        const estoqueAtualFinal = estoque !== undefined  estoque : 0;
        const estoqueMinimoFinal = estoque_minimo !== undefined  estoque_minimo : 0;
        
        console.log('[UPDATE_PRODUCT] Valores finais:', { precoVendaFinal, estoqueAtualFinal, estoqueMinimoFinal });
        
        const sql = `UPDATE produtos SET 
            codigo = , 
            nome = , 
            descricao = , 
            sku = , 
            gtin = , 
            variacao = , 
            marca = ,
            categoria = ,
            unidade_medida = ,
            ncm = ,
            preco_custo = ,
            preco_venda = ,
            estoque_atual = ,
            estoque_minimo = ,
            estoque_maximo = ,
            observacoes = 
        WHERE id = `;
        
        const values = [
            codigo, 
            nome || descricao, 
            descricao || null, 
            sku || null, 
            gtin || null, 
            variacaoForDb, 
            marca || null,
            categoria || null,
            unidade || null,
            ncm || null,
            preco_custo || 0,
            precoVendaFinal,
            estoqueAtualFinal,
            estoqueMinimoFinal,
            estoque_maximo || 0,
            observacoes || null,
            id
        ];
        
        console.log('[UPDATE_PRODUCT] SQL Values:', values);
        
        const [result] = await db.query(sql, values);
        
        if (result.affectedRows > 0) {
            console.log('[UPDATE_PRODUCT] ✅ Produto atualização com sucesso:', { id, codigo, estoque: estoqueAtualFinal, preco: precoVendaFinal });
            res.json({ message: 'Produto atualização com sucesso' });
            broadcastProducts();
        } else {
            res.status(404).json({ message: 'Produto não encontração' });
        }
    } catch (err) {
        console.error('[UPDATE_PRODUCT] ❌ Erro ao atualizar produto:', err.message, err.sql);
        if (err.code === 'ER_DUP_ENTRY') {
            if (err.message.includes('ux_produtos_gtin')) {
                return res.status(400).json({ message: 'GTIN já existe no sistema.' });
            }
            if (err.message.includes('ux_produtos_sku')) {
                return res.status(400).json({ message: 'SKU já existe no sistema.' });
            }
            if (err.message.includes('codigo')) {
                return res.status(400).json({ message: 'Código já existe no sistema.' });
            }
        }
        res.status(500).json({ message: 'Erro ao atualizar produto: ' + err.message });
    }
});

// Excluir produto
app.delete('/api/pcp/produtos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM produtos WHERE id = ', [id]);
        if (result.affectedRows > 0) {
            res.json({ message: 'Produto excluído' });
            broadcastProducts();
        } else {
            res.status(404).json({ message: 'Produto não encontração' });
        }
    } catch (err) {
        console.error('Erro ao excluir produto:', err.message);
        res.status(500).json({ message: 'Erro ao excluir produto.' });
    }
});

// Rota para gerar catálogo PDF de produtos
app.get('/api/pcp/produtos/catalogo', async (req, res) => {
    try {
        console.log('📊 Gerando catálogo de produtos...');
        
        const [produtos] = await db.query(`
            SELECT id, codigo, nome, descricao, sku, gtin, marca, 
                   CASE 
                       WHEN variacao IS NOT NULL AND variacao != '' THEN variacao 
                       ELSE NULL 
                   END as variacao
            FROM produtos 
            ORDER BY codigo, nome
        `);
        
        const agora = new Date();
        const timestamp = agora.toLocaleString('pt-BR');
        
        const catalogoData = {
            timestamp,
            totalProdutos: produtos.length,
            prefixoEmpresa: '78968192',
            padrao: 'EAN-13',
            produtos: produtos.map(p => ({
                id: p.id,
                codigo: p.codigo,
                nome: p.nome,
                gtin: p.gtin,
                sku: p.sku,
                marca: p.marca || 'Aluforce',
                descricao: p.descricao
            }))
        };
        
        res.json(catalogoData);
    } catch (error) {
        console.error('Erro ao gerar catálogo:', error);
        res.status(500).json({ message: 'Erro ao gerar catálogo' });
    }
});

// Rota para download do catálogo em CSV
app.get('/api/pcp/produtos/catalogo/csv', async (req, res) => {
    try {
        const [produtos] = await db.query(`
            SELECT id, codigo, nome, descricao, sku, gtin, marca
            FROM produtos 
            ORDER BY codigo, nome
        `);
        
        const csvContent = [
            'ID,Código,Nome,GTIN,SKU,Marca,Descrição',
            ...produtos.map(p => {
                const nome = (p.nome || '').replace(/"/g, '""').replace(/\/g, '²');
                const desc = (p.descricao || '').replace(/"/g, '""').replace(/\/g, '²');
                return `${p.id},"${p.codigo}","${nome}","${p.gtin}","${p.sku || ''}","${p.marca || 'Aluforce'}","${desc}"`;
            })
        ].join('\n');
        
        const agora = new Date();
        const filename = `catalogo_produtos_gtin_${agora.getFullYear()}_${(agora.getMonth()+1).toString().padStart(2,'0')}_${agora.getDate().toString().padStart(2,'0')}.csv`;
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send('\ufeff' + csvContent); // BOM para UTF-8
    } catch (error) {
        console.error('Erro ao gerar CSV:', error);
        res.status(500).json({ message: 'Erro ao gerar CSV' });
    }
});

// Rota para exportar produtos em PDF
app.get('/api/pcp/produtos/export-pdf', async (req, res) => {
    try {
        // Retorna o arquivo HTML do catálogo que pode ser convertido para PDF pelo cliente
        const catalogoPath = path.join(__dirname, 'catalogo_produtos_gtin_2025_10_06.html');
        
        if (fs.existsSync(catalogoPath)) {
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Content-Disposition', 'inline; filename="catalogo_produtos.html"');
            res.sendFile(catalogoPath);
        } else {
            // Gerar catálogo se não existir
            const { exec } = require('child_process');
            exec('node gerar_catalogo_pdf.js', (error, stdout, stderr) => {
                if (error) {
                    console.error('Erro ao gerar catálogo:', error);
                    res.status(500).json({ message: 'Erro ao gerar catálogo PDF' });
                } else {
                    res.sendFile(catalogoPath);
                }
            });
        }
    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        res.status(500).json({ message: 'Erro ao exportar PDF' });
    }
});

// Rota para exportar materiais para PDF
app.get('/api/pcp/materiais/export-pdf', async (req, res) => {
    try {
        const catalogoPath = path.join(__dirname, 'catalogo_materiais_' + new Date().toISOString().split('T')[0] + '.html');
        
        // Verificar se o arquivo já existe
        if (fs.existsSync(catalogoPath)) {
            res.sendFile(catalogoPath);
        } else {
            // Gerar catálogo de materiais
            const { exec } = require('child_process');
            exec('node gerar_catalogo_materiais.js', (error, stdout, stderr) => {
                if (error) {
                    console.error('Erro ao gerar catálogo de materiais:', error);
                    // Fallback: gerar catálogo simples
                    gerarCatalogoMateriais()
                        .then(() => res.sendFile(catalogoPath))
                        .catch(err => {
                            console.error('Erro no fallback:', err);
                            res.status(500).json({ message: 'Erro ao gerar catálogo de materiais' });
                        });
                } else {
                    res.sendFile(catalogoPath);
                }
            });
        }
    } catch (error) {
        console.error('Erro ao exportar PDF de materiais:', error);
        res.status(500).json({ message: 'Erro ao exportar PDF de materiais' });
    }
});

// Função para gerar catálogo de materiais (fallback)
async function gerarCatalogoMateriais() {
    try {
        const [materiais] = await db.query('SELECT * FROM materiais ORDER BY codigo');
        
        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Catálogo de Materiais - Aluforce</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #7c3aed; padding-bottom: 20px; }
        .logo { color: #7c3aed; font-size: 28px; font-weight: bold; }
        .subtitle { color: #666; margin-top: 5px; }
        .material-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .material-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: #f9f9f9; }
        .material-codigo { font-weight: bold; color: #7c3aed; font-size: 16px; }
        .material-descricao { margin: 8px 0; font-size: 14px; }
        .material-info { font-size: 12px; color: #666; margin: 4px 0; }
        .estoque-status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        .estoque-ok { background: #d1fae5; color: #065f46; }
        .estoque-baixo { background: #fef3c7; color: #92400e; }
        .estoque-critico { background: #fee2e2; color: #991b1b; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">ALUFORCE</div>
        <div class="subtitle">Catálogo de Materiais - ${new Date().toLocaleDateString('pt-BR')}</div>
        <div style="margin-top: 10px; font-size: 14px; color: #666;">
            Total de Materiais: ${materiais.length}
        </div>
    </div>
    
    <div class="material-grid">
        ${materiais.map(material => {
            const estoqueAtual = material.estoque_atual || 0;
            const estoqueMinimo = material.estoque_minimo || 0;
            let estoqueClass = 'estoque-ok';
            let estoqueText = 'Normal';
            
            if (estoqueAtual <= 0) {
                estoqueClass = 'estoque-critico';
                estoqueText = 'Sem Estoque';
            } else if (estoqueAtual <= estoqueMinimo) {
                estoqueClass = 'estoque-baixo';
                estoqueText = 'Estoque Baixo';
            }
            
            return `
            <div class="material-card">
                <div class="material-codigo">${material.codigo || 'N/A'}</div>
                <div class="material-descricao">${material.descricao || 'Sem descrição'}</div>
                <div class="material-info">Categoria: ${material.categoria || 'N/A'}</div>
                <div class="material-info">Tipo: ${material.tipo || 'N/A'}</div>
                <div class="material-info">Unidade: ${material.unidade || 'UN'}</div>
                <div class="material-info">
                    Estoque: ${estoqueAtual} ${material.unidade || 'UN'}
                    <span class="estoque-status ${estoqueClass}">${estoqueText}</span>
                </div>
                ${material.custo  `<div class="material-info">Custo: R$ ${parseFloat(material.custo).toFixed(2)}</div>` : ''}
                ${material.fornecedor  `<div class="material-info">Fornecedor: ${material.fornecedor}</div>` : ''}
                ${material.localizacao  `<div class="material-info">Localização: ${material.localizacao}</div>` : ''}
            </div>`;
        }).join('')}
    </div>
    
    <div class="footer">
        <div>Catálogo geração automaticamente pelo Sistema PCP Aluforce</div>
        <div>Data: ${new Date().toLocaleString('pt-BR')}</div>
    </div>
</body>
</html>`;
        
        const catalogoPath = path.join(__dirname, 'catalogo_materiais_' + new Date().toISOString().split('T')[0] + '.html');
        fs.writeFileSync(catalogoPath, html, 'utf8');
        
        console.log('Catálogo de materiais geração:', catalogoPath);
        
    } catch (error) {
        console.error('Erro ao gerar catálogo de materiais:', error);
        throw error;
    }
}

// Rota para buscar um material por id
app.get('/api/pcp/materiais/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query("SELECT * FROM materiais WHERE id = ", [id]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ message: 'Material não encontração.' });
        }
    } catch (error) {
        console.error('Erro ao buscar material por id:', error.message);
        res.status(500).json({ message: 'Erro ao buscar material.' });
    }
});

// Rota para excluir um material
app.delete('/api/pcp/materiais/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM materiais WHERE id = ', [id]);
        if (result.affectedRows > 0) {
            res.json({ message: 'Material excluído com sucesso.' });
            broadcastMaterials();
        } else {
            res.status(404).json({ message: 'Material não encontração.' });
        }
    } catch (error) {
        console.error('Erro ao excluir material:', error.message);
        res.status(500).json({ message: 'Erro ao excluir material.' });
    }
});

// Rota para atualizar um material (incluindo estoque)
app.put('/api/pcp/materiais/:id', async (req, res) => {
    const { id } = req.params;
    const { descricao, unidade_medida, quantidade_estoque, fornecedor_padrao } = req.body;
    try {
        const sql = "UPDATE materiais SET descricao = , unidade_medida = , quantidade_estoque = , fornecedor_padrao =  WHERE id = ";
        const [result] = await db.query(sql, [descricao, unidade_medida, quantidade_estoque, fornecedor_padrao, id]);
        if (result.affectedRows > 0) {
            res.json({ message: "Material atualização com sucesso!" });
            broadcastMaterials();
        } else {
            res.status(404).json({ message: "Material não encontração." });
        }
    } catch (error) {
        console.error("Erro ao atualizar material:", error);
        res.status(500).json({ message: "Erro ao atualizar material." });
    }
});


// --- NOVAS ROTAS PARA ORDENS DE COMPRA ---

// Rota para criar nova Ordem de Compra
app.post('/api/pcp/ordens-compra', async (req, res) => {
    const { material_id, quantidade, previsao_entrega } = req.body;
    try {
        const sql = "INSERT INTO ordens_compra (material_id, quantidade, data_pedido, previsao_entrega, status) VALUES (, , CURDATE(), , 'Pendente')";
        const [result] = await db.query(sql, [material_id, quantidade, previsao_entrega]);
        res.status(201).json({ message: "Ordem de compra criada com sucesso!", id: result.insertId });
        // opcional: reduzir estoque do material correspondente
        try {
            await db.query("UPDATE materiais SET quantidade_estoque = quantidade_estoque -  WHERE id = ", [quantidade, material_id]);
        } catch (err) {
            console.error('Erro ao ajustar estoque após ordem de compra:', err.message);
        }
        broadcastMaterials();
    } catch (error) {
        console.error("Erro ao criar ordem de compra:", error);
        res.status(500).json({ message: "Erro ao criar ordem de compra." });
    }
});

// Endpoints para a tabela `pedidos` (se existir) - listar/criar/atualizar
app.get('/api/pcp/pedidos', async (req, res) => {
    try {
        // Support pagination: page=1&limit=10
        let page = parseInt(req.query.page, 10) || 1;
        let limit = parseInt(req.query.limit, 10) || 10;
        if (page < 1) page = 1;
        if (limit < 1) limit = 10;
        const offset = (page - 1) * limit;

        // Prefer to return joined client/company info when available so frontend can display names
        const sql = `SELECT p.*, c.nome AS cliente_nome, c.email AS cliente_email, e.cnpj AS empresa_cnpj, e.razao_social AS empresa_razao, e.nome_fantasia AS empresa_nome
                     FROM pedidos p
                     LEFT JOIN clientes c ON p.cliente_id = c.id
                     LEFT JOIN empresas e ON p.empresa_id = e.id
                     ORDER BY p.created_at DESC, p.id DESC
                     LIMIT  OFFSET `;

        const [rows] = await db.query(sql, [limit, offset]);

        // Normalize produtos_preview if stored as JSON string
        const normalized = (rows || []).map(r => {
            try {
                if (r && r.produtos_preview && typeof r.produtos_preview === 'string') {
                    r.produtos_preview = JSON.parse(r.produtos_preview);
                }
            } catch (e) { /* ignore */ }
            return r;
        });

        res.json({ page, limit, rows: normalized });
    } catch (err) {
        console.error('Erro ao buscar pedidos:', err && err.message  err.message : err);
        // Return empty array so frontend can continue working even if table layout differs
        res.json([]);
    }
});

// Return only approved / billed orders (flexible matching on status)
app.get('/api/pcp/pedidos/faturaçãos', async (req, res) => {
    try {
    // support pagination: page=1&limit=50
    let page = parseInt(req.query.page,10) || 1;
    let limit = parseInt(req.query.limit,10) || 50;
    if (page < 1) page = 1;
    if (limit < 1) limit = 50;
    const offset = (page - 1) * limit;
    const sql = `SELECT id, valor, descricao, status, created_at, data_prevista, prazo_entrega, cliente_id, empresa_id, produtos_preview, endereco_entrega, municipio_entrega FROM pedidos WHERE (status LIKE '%fatur%' OR status LIKE '%entreg%' OR status LIKE '%aprov%') ORDER BY created_at DESC LIMIT  OFFSET `;
    const [rows] = await db.query(sql, [limit, offset]);
        // produtos_preview may be stored as JSON string; attempt to parse for clients
        const normalized = (rows || []).map(r => {
            try { if (r.produtos_preview && typeof r.produtos_preview === 'string') r.produtos_preview = JSON.parse(r.produtos_preview); } catch (e) {}
            return r;
        });
    // total count for pagination
    const [countRows] = await db.query("SELECT COUNT(*) AS total FROM pedidos WHERE (status LIKE '%fatur%' OR status LIKE '%entreg%' OR status LIKE '%aprov%')");
    const total = countRows && countRows[0]  countRows[0].total : 0;
    res.json({ page, limit, total, rows: normalized });
    } catch (err) {
        console.error('Erro ao buscar pedidos faturaçãos:', err && err.message  err.message : err);
        res.json([]);
    }
});

// Return delivery deadlines (prazos) for billed orders (one row per pedido)
app.get('/api/pcp/pedidos/prazos', async (req, res) => {
    try {
    let page = parseInt(req.query.page,10) || 1;
    let limit = parseInt(req.query.limit,10) || 50;
    if (page < 1) page = 1; if (limit < 1) limit = 50;
    const offset = (page - 1) * limit;
    const sql = `SELECT id, cliente_id, descricao, status, created_at, data_prevista, prazo_entrega, produtos_preview, endereco_entrega FROM pedidos WHERE (status LIKE '%fatur%' OR status LIKE '%entreg%' OR status LIKE '%aprov%') ORDER BY data_prevista IS NULL, data_prevista ASC LIMIT  OFFSET `;
    const [rows] = await db.query(sql, [limit, offset]);
    const normalized = (rows || []).map(r => { try { if (r.produtos_preview && typeof r.produtos_preview === 'string') r.produtos_preview = JSON.parse(r.produtos_preview); } catch(e){} return r; });
    const [countRows] = await db.query("SELECT COUNT(*) AS total FROM pedidos WHERE (status LIKE '%fatur%' OR status LIKE '%entreg%' OR status LIKE '%aprov%')");
    const total = countRows && countRows[0]  countRows[0].total : 0;
    res.json({ page, limit, total, rows: normalized });
    } catch (err) {
        console.error('Erro ao buscar prazos de pedidos:', err && err.message  err.message : err);
        res.json([]);
    }
});

// Aggregated acompanhamento endpoint to show recent vendas/pedidos and totals
app.get('/api/pcp/acompanhamento', async (req, res) => {
    try {
        // totals and recent pedidos
    const [totalsRows] = await db.query('SELECT COUNT(*) AS total_pedidos FROM pedidos');
    const totals = totalsRows && totalsRows[0]  totalsRows[0] : { total_pedidos: 0 };
    const [recent] = await db.query(`SELECT id, descricao, status, created_at, produtos_preview, data_prevista FROM pedidos ORDER BY created_at DESC LIMIT 20`);
    const normalized = (recent || []).map(r => { try { if (r.produtos_preview && typeof r.produtos_preview === 'string') r.produtos_preview = JSON.parse(r.produtos_preview); } catch(e){} return r; });
    res.json({ totals, recentPedidos: normalized });
    } catch (err) {
        console.error('Erro no acompanhamento:', err && err.message  err.message : err);
        res.status(500).json({ totals: { total_pedidos: 0 }, recentPedidos: [] });
    }
});

app.post('/api/pcp/pedidos', async (req, res) => {
    const { cliente, produto_id, quantidade, status } = req.body;
    try {
        const [result] = await db.query('INSERT INTO pedidos (cliente, produto_id, quantidade, data_pedido, status) VALUES (, , , CURDATE(), )', [cliente, produto_id, quantidade, status || 'Pendente']);
        res.status(201).json({ message: 'Pedido criação', id: result.insertId });
        // atualizar materiais se necessário
        broadcastMaterials();
    } catch (err) {
        console.error('Erro ao criar pedido:', err.message);
        res.status(500).json({ message: 'Erro ao criar pedido.' });
    }
});

app.put('/api/pcp/pedidos/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const [result] = await db.query('UPDATE pedidos SET status =  WHERE id = ', [status, id]);
        if (result.affectedRows > 0) {
            res.json({ message: 'Pedido atualização' });
            broadcastMaterials();
        } else {
            res.status(404).json({ message: 'Pedido não encontração' });
        }
    } catch (err) {
        console.error('Erro ao atualizar pedido:', err.message);
        res.status(500).json({ message: 'Erro ao atualizar pedido.' });
    }
});

// Rota para buscar todas as Ordens de Compra
app.get('/api/pcp/ordens-compra', async (req, res) => {
    const sql = `
        SELECT oc.id, m.codigo_material, m.descricao, oc.quantidade, oc.data_pedido, oc.previsao_entrega, oc.status
        FROM ordens_compra oc
        JOIN materiais m ON oc.material_id = m.id
        ORDER BY oc.data_pedido DESC
    `;
    try {
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar ordens de compra:", error);
        res.status(500).json({ message: "Erro ao buscar ordens de compra." });
    }
});

// Gerar PDF para uma ordem de compra específica
app.get('/api/pcp/ordens-compra/:id/pdf', async (req, res) => {
    const { id } = req.params;
    try {
        // fetch order with material details
        const [rows] = await db.query(
            `SELECT oc.id, oc.quantidade, oc.data_pedido, oc.previsao_entrega, oc.status, m.codigo_material, m.descricao as material_descricao, m.unidade_medida
             FROM ordens_compra oc
             JOIN materiais m ON oc.material_id = m.id
             WHERE oc.id =  LIMIT 1`, [id]
        );
        if (!rows || rows.length === 0) return res.status(404).json({ message: 'Ordem de compra não encontrada' });
        const ord = rows[0];

        // Lazy load PDFKit
        let PDFDocument;
        try { PDFDocument = require('pdfkit'); } catch (e) { return res.status(500).json({ message: 'Dependência pdfkit não instalada' }); }

        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="ordem_compra_${ord.id}.pdf"`);
        doc.fontSize(16).text('Ordem de Compra', { align: 'center' });
        doc.moveDown();
        doc.fontSize(11).text(`Número: ${ord.id}`);
        doc.text(`Data do Pedido: ${ord.data_pedido  ord.data_pedido.toISOString().slice(0,10) : ord.data_pedido}`);
        doc.text(`Previsão de Entrega: ${ord.previsao_entrega  ord.previsao_entrega.toISOString().slice(0,10) : ord.previsao_entrega}`);
        doc.moveDown();
        doc.fontSize(12).text('Material:', { underline: true });
        doc.fontSize(11).text(`Código: ${ord.codigo_material}`);
        doc.text(`Descrição: ${ord.material_descricao}`);
        doc.text(`Unidade: ${ord.unidade_medida || ''}`);
        doc.text(`Quantidade: ${ord.quantidade}`);
        doc.moveDown();
        doc.text('Status: ' + (ord.status || 'Pendente'));

    // Pipe the document to the response before finalizing the PDF stream
    doc.pipe(res);
    doc.end();
    } catch (err) {
        console.error('Erro ao gerar PDF da ordem de compra:', err && err.message  err.message : err);
        res.status(500).json({ message: 'Erro ao gerar PDF.' });
    }
});

// Gerar Excel para ordem de compra específica
app.get('/api/pcp/ordens-compra/:id/excel', async (req, res) => {
    const { id } = req.params;
    try {
        // Lazy load ExcelJS
        let ExcelJS;
        try { ExcelJS = require('exceljs'); } catch (e) { return res.status(500).json({ message: 'Dependência exceljs não instalada' }); }

        // fetch order with material details
        const [rows] = await db.query(
            `SELECT oc.id, oc.quantidade, oc.data_pedido, oc.previsao_entrega, oc.status, 
             m.codigo_material, m.descricao as material_descricao, m.unidade_medida
             FROM ordens_compra oc
             JOIN materiais m ON oc.material_id = m.id
             WHERE oc.id =  LIMIT 1`, [id]
        );
        if (!rows || rows.length === 0) return res.status(404).json({ message: 'Ordem de compra não encontrada' });
        const ord = rows[0];

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Ordem de Compra');

        // Header styling
        worksheet.mergeCells('A1:F1');
        worksheet.getCell('A1').value = 'ORDEM DE COMPRA - ALUFORCE';
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        // Order details
        worksheet.addRow([]);
        worksheet.addRow(['Número da Ordem:', ord.id]);
        worksheet.addRow(['Data do Pedido:', ord.data_pedido  ord.data_pedido.toISOString().slice(0,10) : '']);
        worksheet.addRow(['Previsão de Entrega:', ord.previsao_entrega  ord.previsao_entrega.toISOString().slice(0,10) : '']);
        worksheet.addRow(['Status:', ord.status || 'Pendente']);
        
        // Material section
        worksheet.addRow([]);
        worksheet.addRow(['MATERIAL']).font = { bold: true };
        worksheet.addRow(['Código:', ord.codigo_material]);
        worksheet.addRow(['Descrição:', ord.material_descricao]);
        worksheet.addRow(['Unidade:', ord.unidade_medida || '']);
        worksheet.addRow(['Quantidade:', ord.quantidade]);

        // Style the worksheet
        worksheet.columns = [
            { width: 20 }, { width: 30 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
        ];

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="ordem_compra_${ord.id}.xlsx"`);
        
        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('Erro ao gerar Excel da ordem de compra:', err && err.message  err.message : err);
        res.status(500).json({ message: 'Erro ao gerar Excel.' });
    }
});

// Gerar Excel com relatório geral de ordens de produção
app.get('/api/pcp/relatorio/ordens-excel', authRequired, async (req, res) => {
    try {
        let ExcelJS;
        try { ExcelJS = require('exceljs'); } catch (e) { return res.status(500).json({ message: 'Dependência exceljs não instalada' }); }

        const [ordens] = await db.query(`
            SELECT id, codigo_produto, descricao_produto, quantidade, 
                   data_previsao_entrega, status, data_criacao, observacoes
            FROM ordens_producao 
            ORDER BY data_previsao_entrega ASC
        `);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Relatório de Ordens');

        // Header
        worksheet.mergeCells('A1:H1');
        worksheet.getCell('A1').value = 'RELATÓRIO DE ORDENS DE PRODUÇÃO - ALUFORCE';
        worksheet.getCell('A1').font = { size: 14, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        // Column headers
        worksheet.addRow([]);
        const headerRow = worksheet.addRow([
            'ID', 'Código Produto', 'Descrição', 'Quantidade', 
            'Previsão Entrega', 'Status', 'Data Criação', 'Observações'
        ]);
        headerRow.font = { bold: true };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6FA' } };

        // Data rows
        ordens.forEach(ordem => {
            worksheet.addRow([
                ordem.id,
                ordem.codigo_produto,
                ordem.descricao_produto,
                ordem.quantidade,
                ordem.data_previsao_entrega  ordem.data_previsao_entrega.toISOString().slice(0,10) : '',
                ordem.status,
                ordem.data_criacao  ordem.data_criacao.toISOString().slice(0,10) : '',
                ordem.observacoes
            ]);
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = 15;
        });
        worksheet.getColumn(3).width = 30; // Descrição
        worksheet.getColumn(8).width = 25; // Observações

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="relatorio_ordens_producao.xlsx"');
        
        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('Erro ao gerar relatório Excel:', err);
        res.status(500).json({ message: 'Erro ao gerar relatório Excel.' });
    }
});

// Sistema de alertas de estoque baixo
app.get('/api/pcp/alertas/estoque-baixo', authRequired, async (req, res) => {
    try {
        const limite = req.query.limite || 10; // quantidade mínima considerada baixa
        
        const [materiais] = await db.query(`
            SELECT id, codigo_material, descricao, quantidade_estoque, unidade_medida,
                   CASE 
                       WHEN quantidade_estoque = 0 THEN 'CRÍTICO'
                       WHEN quantidade_estoque <=  THEN 'BAIXO'
                       ELSE 'OK'
                   END as nivel_alerta
            FROM materiais 
            WHERE quantidade_estoque <= 
            ORDER BY quantidade_estoque ASC
        `, [limite, limite]);

        // Calcular estatísticas
        const criticos = materiais.filter(m => m.quantidade_estoque === 0).length;
        const baixos = materiais.filter(m => m.quantidade_estoque > 0 && m.quantidade_estoque <= limite).length;

        res.json({
            alertas: materiais,
            resumo: {
                total_alertas: materiais.length,
                criticos: criticos,
                baixos: baixos,
                limite_configuração: limite
            },
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('Erro ao buscar alertas de estoque:', err);
        res.status(500).json({ message: 'Erro ao buscar alertas de estoque.' });
    }
});

// Histórico de movimentações de estoque
app.get('/api/pcp/estoque/movimentacoes', authRequired, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        
        // Verificar se tabela existe, se não, criar
        await db.query(`
            CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
                id INT AUTO_INCREMENT PRIMARY KEY,
                material_id INT NOT NULL,
                tipo ENUM('ENTRADA', 'SAIDA', 'AJUSTE') NOT NULL,
                quantidade DECIMAL(10,2) NOT NULL,
                quantidade_anterior DECIMAL(10,2),
                quantidade_atual DECIMAL(10,2),
                observacoes TEXT,
                usuario_id INT,
                data_movimento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (material_id) REFERENCES materiais(id)
            )
        `);

        const [movimentacoes] = await db.query(`
            SELECT me.*, m.codigo_material, m.descricao as material_descricao
            FROM movimentacoes_estoque me
            JOIN materiais m ON me.material_id = m.id
            ORDER BY me.data_movimento DESC
            LIMIT  OFFSET 
        `, [limit, offset]);

        const [total] = await db.query('SELECT COUNT(*) as total FROM movimentacoes_estoque');

        res.json({
            movimentacoes,
            pagination: {
                page,
                limit,
                total: total[0].total,
                pages: Math.ceil(total[0].total / limit)
            }
        });

    } catch (err) {
        console.error('Erro ao buscar movimentações:', err);
        res.status(500).json({ message: 'Erro ao buscar movimentações.' });
    }
});

// Registrar movimentação de estoque
app.post('/api/pcp/estoque/movimentacao', authRequired, async (req, res) => {
    const { material_id, tipo, quantidade, observacoes } = req.body;
    
    try {
        // Buscar quantidade atual do material
        const [material] = await db.query('SELECT quantidade_estoque FROM materiais WHERE id = ', [material_id]);
        if (!material || material.length === 0) {
            return res.status(404).json({ message: 'Material não encontração' });
        }
        
        const quantidadeAnterior = material[0].quantidade_estoque;
        let novaQuantidade;
        
        switch (tipo) {
            case 'ENTRADA':
                novaQuantidade = quantidadeAnterior + parseFloat(quantidade);
                break;
            case 'SAIDA':
                novaQuantidade = quantidadeAnterior - parseFloat(quantidade);
                break;
            case 'AJUSTE':
                novaQuantidade = parseFloat(quantidade);
                break;
            default:
                return res.status(400).json({ message: 'Tipo de movimentação inválido' });
        }

        // Verificar se a nova quantidade não fica negativa
        if (novaQuantidade < 0) {
            return res.status(400).json({ message: 'Quantidade insuficiente em estoque' });
        }

        // Iniciar transação
        await db.query('START TRANSACTION');

        // Atualizar estoque do material
        await db.query('UPDATE materiais SET quantidade_estoque =  WHERE id = ', [novaQuantidade, material_id]);

        // Registrar movimentação
        await db.query(`
            INSERT INTO movimentacoes_estoque 
            (material_id, tipo, quantidade, quantidade_anterior, quantidade_atual, observacoes, usuario_id) 
            VALUES (, , , , , , )
        `, [material_id, tipo, quantidade, quantidadeAnterior, novaQuantidade, observacoes, req.user.id]);

        await db.query('COMMIT');

        // Broadcast atualização
        broadcastMaterials();

        res.json({ 
            message: 'Movimentação registrada com sucesso',
            quantidade_anterior: quantidadeAnterior,
            quantidade_atual: novaQuantidade
        });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Erro ao registrar movimentação:', err);
        res.status(500).json({ message: 'Erro ao registrar movimentação.' });
    }
});

// Relatório de produtividade
app.get('/api/pcp/relatorios/produtividade', authRequired, async (req, res) => {
    try {
        const { data_inicio, data_fim } = req.query;
        
        let whereClause = '';
        let params = [];
        
        if (data_inicio && data_fim) {
            whereClause = 'WHERE data_previsao_entrega BETWEEN  AND ';
            params = [data_inicio, data_fim];
        }

        const [resultaçãos] = await db.query(`
            SELECT 
                status,
                COUNT(*) as quantidade,
                SUM(quantidade) as total_pecas,
                AVG(quantidade) as media_pecas_por_ordem,
                MIN(data_previsao_entrega) as primeira_entrega,
                MAX(data_previsao_entrega) as ultima_entrega
            FROM ordens_producao 
            ${whereClause}
            GROUP BY status
            ORDER BY 
                CASE status 
                    WHEN 'Concluído' THEN 1
                    WHEN 'Em Produção' THEN 2
                    WHEN 'Aguardando' THEN 3
                    ELSE 4 
                END
        `, params);

        // Estatísticas gerais
        const [geral] = await db.query(`
            SELECT 
                COUNT(*) as total_ordens,
                SUM(quantidade) as total_pecas_geral,
                AVG(quantidade) as media_geral,
                COUNT(CASE WHEN status = 'Concluído' THEN 1 END) as concluidas,
                COUNT(CASE WHEN status = 'Em Produção' THEN 1 END) as em_producao
            FROM ordens_producao 
            ${whereClause}
        `, params);

        const produtividade = geral[0].total_ordens > 0  
            (geral[0].concluidas / geral[0].total_ordens * 100).toFixed(2) : 0;

        res.json({
            por_status: resultaçãos,
            resumo_geral: {
                ...geral[0],
                taxa_produtividade: `${produtividade}%`,
                periodo: { data_inicio, data_fim }
            }
        });

    } catch (err) {
        console.error('Erro ao gerar relatório de produtividade:', err);
        res.status(500).json({ message: 'Erro ao gerar relatório de produtividade.' });
    }
});

// Relatório de custos por período
app.get('/api/pcp/relatorios/custos', authRequired, async (req, res) => {
    try {
        const { data_inicio, data_fim } = req.query;

        // Custos de materiais por ordens de compra
        let whereClause = '';
        let params = [];
        
        if (data_inicio && data_fim) {
            whereClause = 'WHERE oc.data_pedido BETWEEN  AND ';
            params = [data_inicio, data_fim];
        }

        const [custosMateriais] = await db.query(`
            SELECT 
                m.codigo_material,
                m.descricao,
                COUNT(oc.id) as numero_compras,
                SUM(oc.quantidade) as quantidade_total,
                m.unidade_medida,
                AVG(oc.quantidade) as quantidade_media_por_compra
            FROM ordens_compra oc
            JOIN materiais m ON oc.material_id = m.id
            ${whereClause}
            GROUP BY m.id, m.codigo_material, m.descricao, m.unidade_medida
            ORDER BY quantidade_total DESC
        `, params);

        // Análise de produtos mais produzidos
        const [produtosMaisProduzidos] = await db.query(`
            SELECT 
                codigo_produto,
                descricao_produto,
                COUNT(*) as numero_ordens,
                SUM(quantidade) as quantidade_total,
                AVG(quantidade) as quantidade_media
            FROM ordens_producao
            ${whereClause.replace('oc.data_pedido', 'data_previsao_entrega')}
            GROUP BY codigo_produto, descricao_produto
            ORDER BY quantidade_total DESC
            LIMIT 10
        `, params);

        res.json({
            custos_materiais: custosMateriais,
            produtos_mais_produzidos: produtosMaisProduzidos,
            periodo: { data_inicio, data_fim },
            resumo: {
                total_tipos_materiais: custosMateriais.length,
                total_tipos_produtos: produtosMaisProduzidos.length
            }
        });

    } catch (err) {
        console.error('Erro ao gerar relatório de custos:', err);
        res.status(500).json({ message: 'Erro ao gerar relatório de custos.' });
    }
});

// Export geral para Excel (todos os daçãos)
app.get('/api/pcp/export/completo-excel', authRequired, async (req, res) => {
    try {
        let ExcelJS;
        try { ExcelJS = require('exceljs'); } catch (e) { return res.status(500).json({ message: 'Dependência exceljs não instalada' }); }

        const workbook = new ExcelJS.Workbook();
        
        // Aba 1: Ordens de Produção
        const wsOrdens = workbook.addWorksheet('Ordens de Produção');
        const [ordens] = await db.query('SELECT * FROM ordens_producao ORDER BY data_previsao_entrega');
        
        wsOrdens.addRow(['ID', 'Código Produto', 'Descrição', 'Quantidade', 'Status', 'Previsão Entrega', 'Data Criação']);
        ordens.forEach(ordem => {
            wsOrdens.addRow([
                ordem.id,
                ordem.codigo_produto,
                ordem.descricao_produto,
                ordem.quantidade,
                ordem.status,
                ordem.data_previsao_entrega  ordem.data_previsao_entrega.toISOString().slice(0,10) : '',
                ordem.data_criacao  ordem.data_criacao.toISOString().slice(0,10) : ''
            ]);
        });

        // Aba 2: Materiais
        const wsMateriais = workbook.addWorksheet('Materiais');
        const [materiais] = await db.query('SELECT * FROM materiais ORDER BY descricao');
        
        wsMateriais.addRow(['ID', 'Código', 'Descrição', 'Unidade', 'Estoque Atual']);
        materiais.forEach(material => {
            wsMateriais.addRow([
                material.id,
                material.codigo_material,
                material.descricao,
                material.unidade_medida,
                material.quantidade_estoque
            ]);
        });

        // Aba 3: Ordens de Compra
        const wsCompras = workbook.addWorksheet('Ordens de Compra');
        const [compras] = await db.query(`
            SELECT oc.*, m.codigo_material, m.descricao as material_descricao 
            FROM ordens_compra oc 
            JOIN materiais m ON oc.material_id = m.id 
            ORDER BY oc.data_pedido DESC
        `);
        
        wsCompras.addRow(['ID', 'Material', 'Descrição', 'Quantidade', 'Data Pedido', 'Previsão', 'Status']);
        compras.forEach(compra => {
            wsCompras.addRow([
                compra.id,
                compra.codigo_material,
                compra.material_descricao,
                compra.quantidade,
                compra.data_pedido  compra.data_pedido.toISOString().slice(0,10) : '',
                compra.previsao_entrega  compra.previsao_entrega.toISOString().slice(0,10) : '',
                compra.status
            ]);
        });

        // Formatação geral
        workbook.worksheets.forEach(ws => {
            ws.getRow(1).font = { bold: true };
            ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6FA' } };
            ws.columns.forEach(column => {
                column.width = 15;
            });
        });

        const timestamp = new Date().toISOString().slice(0,10);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="pcp_completo_${timestamp}.xlsx"`);
        
        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('Erro ao exportar daçãos completos:', err);
        res.status(500).json({ message: 'Erro ao exportar daçãos completos.' });
    }
});

// Gerar Ordem de Produção em Excel usando template
app.post('/api/pcp/ordem-producao/excel', timeoutMiddleware(60000), authRequired, async (req, res) => {
    try {
        let ExcelJS;
        try { ExcelJS = require('exceljs'); } catch (e) { 
            return res.status(500).json({ message: 'Dependência exceljs não instalada' }); 
        }

        // Tentar carregar template existente
        const templatePath = path.join(__dirname, 'Ordem de Produção.xlsx');
        let workbook;
        
        try {
            // Se o template existe, carregá-lo
            if (fs.existsSync(templatePath)) {
                workbook = new ExcelJS.Workbook();
                await workbook.xlsx.readFile(templatePath);
                console.log('[EXCEL] Template carregação:', templatePath);
            } else {
                throw new Error('Template não encontração');
            }
        } catch (err) {
            console.log('[EXCEL] Criando novo template...');
            // Se não existe template, criar um novo
            workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Ordem de Produção');
            
            // Criar template básico
            worksheet.mergeCells('A1:H1');
            worksheet.getCell('A1').value = 'ORDEM DE PRODUÇÃO - ALUFORCE';
            worksheet.getCell('A1').font = { size: 16, bold: true };
            worksheet.getCell('A1').alignment = { horizontal: 'center' };
            worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };

            // Cabeçalhos do template
            const headers = [
                ['', '', '', '', '', '', '', ''],
                ['CÓDIGO', 'PRODUTO', 'QTDE', 'VALOR UNIT.', 'VALOR TOTAL', '', '', ''],
                ['', '', '', '', '', '', '', ''],
                ['', '', '', '', 'Total', '0.00', '', ''],
                ['', '', '', '', '', '', '', ''],
                ['Previsão de Entrega', '', '', '', '', '', '', ''],
                ['dd/mm/aaaa', '', '', '', '', '', '', ''],
                ['', '', '', '', '', '', '', ''],
                ['Observações', '', '', '', '', '', '', ''],
                ['', '', '', '', '', '', '', '']
            ];
            
            headers.forEach((row, index) => {
                worksheet.addRow(row);
            });
        }

        // Buscar a primeira planilha (assumindo que existe)
        const worksheet = workbook.worksheets[0];
        
        if (!worksheet) {
            return res.status(500).json({ message: 'Template de Excel inválido - sem planilhas' });
        }

        // Extrair todos os campos do corpo da requisição
        const {
            // Daçãos do Produto
            codigo_produto,
            descricao_produto,
            quantidade,
            // Daçãos de preço/valor
            valor_unitario = req.body.custo_unitario || req.body.preco_venda || 0,
            // Configurações do produto
            embalagem = req.body.embalagem || '',
            lances = req.body.lances || '',
            // Daçãos do Pedido/Orçamento
            numero_orcamento = req.body.numero_orcamento || `ORC-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
            numero_pedido = req.body.numero_pedido || `PED-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
            data_liberacao = req.body.data_liberacao || new Date().toISOString().slice(0,10),
            data_previsao_entrega,
            // Daçãos Comerciais
            vendedor = req.body.vendedor || 'Vendedor Padrão',
            // Daçãos do Cliente
            cliente,
            contato_cliente,
            email_cliente,
            fone_cliente,
            tipo_frete = req.body.tipo_frete || 'CIF',
            // Daçãos da Transportaçãora
            transportaçãora_nome = req.body.transportaçãora_nome || '',
            transportaçãora_fone = req.body.transportaçãora_fone || '',
            transportaçãora_cep = req.body.transportaçãora_cep || '',
            transportaçãora_endereco = req.body.transportaçãora_endereco || '',
            // Daçãos para Cobrança
            transportaçãora_cpf_cnpj = req.body.transportaçãora_cpf_cnpj || '',
            transportaçãora_email_nfe = req.body.transportaçãora_email_nfe || '',
            // Observações
            observacoes
        } = req.body;

        console.log('[EXCEL] Preenchendo template com todos os campos...');

        // === PREENCHIMENTO COMPLETO E SISTEMÁTICO BASEADO NA ANÁLISE ===
        
        function preencherCelulasSeguro(cellAddresses, value, label = '') {
            if (!value) return 0;
            let preenchidas = 0;
            cellAddresses.forEach(cellAddr => {
                try {
                    const cell = worksheet.getCell(cellAddr);
                    if (cell) {
                        cell.value = value;
                        preenchidas++;
                        if (preenchidas === 1 && label) {
                            console.log(`[EXCEL] ${label}: ${cellAddr} = ${value.toString().substring(0, 50)}${value.toString().length > 50  '...' : ''}`);
                        }
                    }
                } catch (e) {
                    // Ignorar erros de células específicas
                }
            });
            return preenchidas;
        }
        
        console.log('[EXCEL] Preenchendo template de forma completa...');
        
        // === DADOS BÁSICOS ===
        preencherCelulasSeguro(['C4'], numero_orcamento, 'Orçamento');
        preencherCelulasSeguro(['G4'], numero_pedido, 'Pedido');
        preencherCelulasSeguro(['I4', 'J4'], data_liberacao, 'Data Liberação');
        camposPreenchidos += 3;
        
        // === VENDEDOR ===
        preencherCelulasSeguro(['C6', 'D6', 'E6'], vendedor, 'Vendedor');
        preencherCelulasSeguro(['G6', 'H6', 'I6'], data_previsao_entrega || '7 dias úteis', 'Prazo Entrega');
        camposPreenchidos += 2;
        
        // === CLIENTE COMPLETO ===
        preencherCelulasSeguro(['C7', 'D7', 'E7', 'F7', 'G7'], cliente, 'Cliente');
        preencherCelulasSeguro(['C8', 'D8', 'E8', 'F8'], contato_cliente, 'Contato');
        preencherCelulasSeguro(['H8', 'I8'], fone_cliente, 'Telefone');
        preencherCelulasSeguro(['C9', 'D9', 'E9', 'F9'], email_cliente, 'Email');
        preencherCelulasSeguro(['I9', 'J9'], tipo_frete, 'Tipo Frete');
        camposPreenchidos += 5;
        
        // === TRANSPORTADORA COMPLETA ===
        preencherCelulasSeguro(['C12', 'D12', 'E12'], transportaçãora_nome, 'Nome Transportaçãora');
        preencherCelulasSeguro(['G12', 'H12'], transportaçãora_fone, 'Fone Transportaçãora');
        preencherCelulasSeguro(['C13', 'D13'], transportaçãora_cep, 'CEP');
        preencherCelulasSeguro(['F13', 'G13', 'H13', 'I13'], transportaçãora_endereco, 'Endereço');
        camposPreenchidos += 4;
        
        // CPF/CNPJ com formato especial - usar valor padrão se não informação
        const cnpjTransportaçãoraFinal = transportaçãora_cpf_cnpj || '00000000000000';
        ['C15', 'D15'].forEach(cellAddr => {
            try {
                const cell = worksheet.getCell(cellAddr);
                // Garantir que o CNPJ seja tratação como texto
                const cnpjTexto = String(cnpjTransportaçãoraFinal).replace(/[^0-9]/g, '');
                cell.value = `'${cnpjTexto}`; // Apostrofe força texto
                cell.numFmt = '@'; // Formato texto
                console.log(`[EXCEL] CPF/CNPJ: ${cellAddr} = ${cnpjTexto}`);
                
                // Também preencher na aba PRODUÇÃO
                if (temAbaProducao) {
                    const cellProducao = worksheetProducao.getCell(cellAddr);
                    cellProducao.value = `'${cnpjTexto}`;
                    cellProducao.numFmt = '@';
                }
            } catch (e) {
                console.log(`[EXCEL] Erro ao preencher CNPJ em ${cellAddr}: ${e.message}`);
            }
        });
        camposPreenchidos++;
        
        preencherCelulasSeguro(['G15', 'H15'], transportaçãora_email_nfe, 'Email NFe');
        camposPreenchidos++;
        
        // === PRODUTOS NA TABELA ===
        const linhaProduto = 18;
        let valorTotal = 0;
        
        if (codigo_produto) {
            worksheet.getCell(`C${linhaProduto}`).value = codigo_produto;
            console.log(`[EXCEL] Código Produto: C${linhaProduto} = ${codigo_produto}`);
        }
        if (descricao_produto) {
            worksheet.getCell(`D${linhaProduto}`).value = descricao_produto;
            console.log(`[EXCEL] Descrição: D${linhaProduto} = ${descricao_produto}`);
        }
        if (embalagem) {
            worksheet.getCell(`F${linhaProduto}`).value = embalagem;
            console.log(`[EXCEL] Embalagem: F${linhaProduto} = ${embalagem}`);
        }
        if (lances) {
            worksheet.getCell(`G${linhaProduto}`).value = lances;
            console.log(`[EXCEL] Lances: G${linhaProduto} = ${lances}`);
        }
        if (quantidade) {
            worksheet.getCell(`H${linhaProduto}`).value = quantidade;
            console.log(`[EXCEL] Quantidade: H${linhaProduto} = ${quantidade}`);
        }
        if (valor_unitario) {
            worksheet.getCell(`I${linhaProduto}`).value = valor_unitario;
            console.log(`[EXCEL] Valor Unit: I${linhaProduto} = R$ ${valor_unitario}`);
        }
        
        // Calcular valor total
        if (quantidade && valor_unitario) {
            valorTotal = quantidade * valor_unitario;
            worksheet.getCell(`J${linhaProduto}`).value = valorTotal;
            console.log(`[EXCEL] Valor Total: J${linhaProduto} = R$ ${valorTotal.toFixed(2)}`);
        }
        
        camposPreenchidos += 6;
        
        // Total geral
        if (valorTotal > 0) {
            preencherCelulasSeguro(['I34', 'J34'], valorTotal, `Total Geral: R$ ${valorTotal.toFixed(2)}`);
            camposPreenchidos++;
        }
        
        // === OBSERVAÇÕES COMPLETAS ===
        if (observacoes) {
            preencherCelulasSeguro(['A37', 'B37', 'C37', 'D37', 'E37', 'F37', 'G37', 'H37'], 
                                  observacoes, 'Observações do Pedido');
            camposPreenchidos++;
        }
        
        // === PAGAMENTO ===
        const condicoesPagamento = req.body.condicoes_pagamento || '30 dias';
        const metodoPagamento = req.body.metodo_pagamento || 'Faturamento';
        
        preencherCelulasSeguro(['A44', 'B44', 'C44', 'D44'], condicoesPagamento, 'Condições Pagamento');
        preencherCelulasSeguro(['F44', 'G44', 'H44'], metodoPagamento, 'Método Pagamento');
        if (valorTotal > 0) {
            preencherCelulasSeguro(['I44', 'J44'], valorTotal, 'Valor Total Pagamento');
        }
        camposPreenchidos += 3;
        
        // === ENTREGA ===
        const dataEntrega = data_previsao_entrega || req.body.data_entrega;
        if (dataEntrega) {
            preencherCelulasSeguro(['A47', 'B47', 'C47', 'D47'], dataEntrega, 'Data Entrega');
            camposPreenchidos++;
        }
        
        const qtdVolumes = req.body.qtd_volumes || '1 volume';
        preencherCelulasSeguro(['A49', 'B49', 'C49'], qtdVolumes, 'Volumes');
        
        const tipoEmbalagem = req.body.tipo_embalagem_entrega || embalagem || 'Embalagem padrão';
        preencherCelulasSeguro(['F49', 'G49', 'H49'], tipoEmbalagem, 'Embalagem');
        
        const observacoesEntrega = req.body.observacoes_entrega || 'Instruções de entrega padrão';
        preencherCelulasSeguro(['E51', 'F51', 'G51', 'H51', 'I51', 'J51'], observacoesEntrega, 'Obs. Entrega');
        
        camposPreenchidos += 3;

        console.log(`[EXCEL] Total de campos preenchidos: ${camposPreenchidos}`);

        // PREENCHER CÉLULAS ESPECÍFICAS DA TABELA DE PRODUTOS (linhas 18-32 baseação nas imagens)
        try {
            console.log('[EXCEL] Preenchendo tabela de produtos...');
            
            // Linha 18 (primeira linha de daçãos da tabela) - baseação na análise das imagens
            const linhaProduto = 18; // Ajustar conforme a linha real da tabela
            
            // Preencher primeira linha da tabela de produtos
            worksheet.getCell(`C${linhaProduto}`).value = codigo_produto || ''; // Coluna Cod.
            worksheet.getCell(`D${linhaProduto}`).value = descricao_produto || ''; // Coluna Produto
            worksheet.getCell(`F${linhaProduto}`).value = embalagem || ''; // Coluna Embalagem
            worksheet.getCell(`G${linhaProduto}`).value = lances || ''; // Coluna Lance(s)
            worksheet.getCell(`H${linhaProduto}`).value = quantidade || 0; // Coluna Qtd.
            worksheet.getCell(`I${linhaProduto}`).value = valor_unitario || 0; // Coluna V.Un.R$
            
            // Calcular valor total
            const valorTotal = (quantidade || 0) * (valor_unitario || 0);
            worksheet.getCell(`J${linhaProduto}`).value = valorTotal; // Coluna V.Total.R$
            
            console.log(`[EXCEL] Tabela linha ${linhaProduto}: ${codigo_produto} | ${descricao_produto} | ${quantidade} | R$ ${valor_unitario} | Total: R$ ${valorTotal}`);
            
            // PREENCHER TOTAL DO PEDIDO
            const totalPedidoCell = worksheet.getCell('I34'); // Baseação na análise - "Total do Pedido:$"
            if (totalPedidoCell) {
                totalPedidoCell.value = valorTotal;
                console.log(`[EXCEL] Total do Pedido: ${totalPedidoCell.address} = R$ ${valorTotal}`);
            }
            
            // PREENCHER OBSERVAÇÕES DO PEDIDO (área grande amarela)
            if (observacoes) {
                // Tentar várias células possíveis para observações
                const obsAreas = ['A37', 'B37', 'C37', 'A38', 'B38', 'C38'];
                for (const cellAddr of obsAreas) {
                    const obsCell = worksheet.getCell(cellAddr);
                    if (!obsCell.value) {
                        obsCell.value = observacoes;
                        console.log(`[EXCEL] Observações: ${cellAddr} = ${observacoes}`);
                        break;
                    }
                }
            }
            
            // PREENCHER DADOS DA TRANSPORTADORA (seção específica)
            // Nome da transportaçãora
            if (transportaçãora_nome) {
                const nomeCell = worksheet.getCell('C12'); // Baseação na imagem
                if (nomeCell) {
                    nomeCell.value = transportaçãora_nome;
                    console.log(`[EXCEL] Transportaçãora Nome: C12 = ${transportaçãora_nome}`);
                }
            }
            
            // Fone da transportaçãora  
            if (transportaçãora_fone) {
                const foneTranspCell = worksheet.getCell('G12'); // Baseação na imagem
                if (foneTranspCell) {
                    foneTranspCell.value = transportaçãora_fone;
                    console.log(`[EXCEL] Transportaçãora Fone: G12 = ${transportaçãora_fone}`);
                }
            }
            
            // CPF/CNPJ - formato correto (não científico)
            if (transportaçãora_cpf_cnpj) {
                const cpfCell = worksheet.getCell('C15');
                if (cpfCell) {
                    // Garantir formato de texto para evitar notação científica
                    cpfCell.value = String(transportaçãora_cpf_cnpj);
                    cpfCell.numFmt = '@'; // Formato texto
                    console.log(`[EXCEL] CPF/CNPJ: C15 = ${transportaçãora_cpf_cnpj}`);
                }
            }
            
            // Email NFe
            if (transportaçãora_email_nfe) {
                const emailNfeCell = worksheet.getCell('G15');
                if (emailNfeCell) {
                    emailNfeCell.value = transportaçãora_email_nfe;
                    console.log(`[EXCEL] Email NFe: G15 = ${transportaçãora_email_nfe}`);
                }
            }
            
            // CONDIÇÕES DE PAGAMENTO
            const condicoesPagamento = req.body.condicoes_pagamento || 'À Vista';
            const pagamentoCell = worksheet.getCell('D42'); // Ajustar conforme posição real
            if (pagamentoCell) {
                pagamentoCell.value = condicoesPagamento;
                console.log(`[EXCEL] Condições Pagamento: D42 = ${condicoesPagamento}`);
            }
            
        } catch (err) {
            console.log('[EXCEL] Aviso: Erro ao preencher células específicas:', err.message);
        }

        // Salvar ordem no banco primeiro
        const [result] = await db.query(
            `INSERT INTO ordens_producao (codigo_produto, descricao_produto, quantidade, data_previsao_entrega, cliente, observacoes, status) 
             VALUES (, , , , , , 'Rascunho')`,
            [codigo_produto, descricao_produto, quantidade, data_previsao_entrega, cliente, observacoes]
        );
        
        const ordemId = result.insertId;
        const timestamp = new Date().toISOString().slice(0, 10);
        
        // Configurar response para download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Ordem_Producao_${ordemId}_${timestamp}.xlsx"`);
        
        await workbook.xlsx.write(res);
        res.end();
        
        console.log(`[EXCEL] Ordem de produção ${ordemId} gerada com sucesso`);

    } catch (err) {
        console.error('Erro ao gerar ordem de produção Excel:', err);
        res.status(500).json({ message: 'Erro ao gerar ordem de produção em Excel.' });
    }
});

// Endpoint específico para geração de ordem de produção via modal (com suporte a múltiplos itens)
app.post('/api/pcp/ordens-producao', timeoutMiddleware(60000), async (req, res) => {
    try {
        let ExcelJS;
        try { ExcelJS = require('exceljs'); } catch (e) { 
            return res.status(500).json({ message: 'Dependência exceljs não instalada' }); 
        }

        console.log('[MODAL-EXCEL] === PROCESSANDO ORDEM DO MODAL ===');
        console.log('[MODAL-EXCEL] Content-Type:', req.headers['content-type']);
        console.log('[MODAL-EXCEL] Body recebido:', req.body);
        console.log('[MODAL-EXCEL] Body keys:', req.body  Object.keys(req.body) : 'UNDEFINED');

        // Verificar se req.body existe
        if (!req.body) {
            console.log('[MODAL-EXCEL] ❌ req.body é undefined ou null');
            return res.status(400).json({ message: 'Daçãos não recebidos corretamente' });
        }

        // Extrair daçãos do formulário - CORRIGIDO para nova estrutura
        const {
            // Cliente
            cliente,
            cliente_id,
            contato,
            email,
            telefone,
            // Comercial
            vendedor,
            frete,
            numero_orcamento,
            revisao,
            pedido_referencia,
            data_liberacao,
            // Datas
            data_previsao_entrega,
            // Observações
            observacoes,
            // Configurações
            variacao,
            embalagem,
            lances,
            // Transportaçãora (pode vir como objeto ou campos individuais)
            transportaçãora,
            transportaçãora_nome,
            transportaçãora_fone,
            transportaçãora_cep,
            transportaçãora_endereco,
            transportaçãora_cpf_cnpj,
            transportaçãora_email_nfe,
            // Itens (JSON string) - fallback
            items_json
        } = req.body;
        
        // Mapear transportaçãora corretamente
        const transportaçãoraData = transportaçãora || {};
        const transportaçãoraNome = transportaçãoraData.nome || transportaçãora_nome || '';
        const transportaçãoraFone = transportaçãoraData.fone || transportaçãora_fone || '';
        const transportaçãoraCep = transportaçãoraData.cep || transportaçãora_cep || '';
        const transportaçãoraEndereco = transportaçãoraData.endereco || transportaçãora_endereco || '';
        const transportaçãoraCpfCnpj = transportaçãoraData.cpf_cnpj || transportaçãora_cpf_cnpj || '';
        const transportaçãoraEmailNfe = transportaçãoraData.email_nfe || transportaçãora_email_nfe || '';
        
        console.log('[MODAL-EXCEL] Transportaçãora mapeada:', {
            nome: transportaçãoraNome,
            fone: transportaçãoraFone,
            cep: transportaçãoraCep,
            endereco: transportaçãoraEndereco,
            cpf_cnpj: transportaçãoraCpfCnpj,
            email_nfe: transportaçãoraEmailNfe
        });

        // Parse dos itens - CORRIGIDO para suportar múltiplos formatos
        let itens = [];
        
        // Primeiro, tentar usar 'produtos' (formato do index.html coletarDaçãosOP())
        if (req.body.produtos && Array.isArray(req.body.produtos)) {
            itens = req.body.produtos;
            console.log('[MODAL-EXCEL] Itens de req.body.produtos:', itens.length, 'produtos');
            if (itens[0]) console.log('[MODAL-EXCEL] Primeiro produto exemplo:', itens[0]);
        }
        // Segundo, tentar usar a estrutura 'items' (formato modal_nova_ordem_saas.html)
        else if (req.body.items && Array.isArray(req.body.items)) {
            itens = req.body.items;
            console.log('[MODAL-EXCEL] Itens do novo modal:', itens.length, 'produtos');
            console.log('[MODAL-EXCEL] Primeiro item exemplo:', itens[0]);
        }
        // Fallback para items_json (estrutura antiga)
        else if (req.body.items_json) {
            try {
                itens = JSON.parse(req.body.items_json);
                console.log('[MODAL-EXCEL] Itens parseaçãos do JSON:', itens.length, 'produtos');
            } catch (e) {
                console.log('[MODAL-EXCEL] Erro ao parsear items_json');
                itens = [];
            }
        }
        // Fallback final para daçãos individuais
        else {
            console.log('[MODAL-EXCEL] Usando fallback para daçãos individuais');
            itens = [{
                codigo: req.body.codigo_produto || '',
                descricao: req.body.descricao_produto || '',
                quantidade: parseFloat(req.body.quantidade) || 0,
                valor_unitario: parseFloat(req.body.valor_unitario) || 0
            }];
        }
        
        console.log('[MODAL-EXCEL] === ITENS FINAIS ===');
        console.log('[MODAL-EXCEL] Total de itens:', itens.length);
        itens.forEach((item, i) => {
            console.log(`[MODAL-EXCEL] Item ${i+1}:`, {
                codigo: item.codigo,
                descricao: item.descricao,
                peso_liquido: item.peso_liquido,
                lote: item.lote,
                quantidade: item.quantidade,
                valor_unitario: item.valor_unitario
            });
        });

        // Carregar template
        const templatePath = path.join(__dirname, 'Ordem de Produção.xlsx');
        let workbook;
        
        if (fs.existsSync(templatePath)) {
            workbook = new ExcelJS.Workbook();
            // Configurar encoding UTF-8 para caracteres especiais
            await workbook.xlsx.readFile(templatePath, {
                ignoreReadErrors: true
            });
            console.log('[MODAL-EXCEL] Template carregação com sucesso');
        } else {
            return res.status(500).json({ message: 'Template Ordem de Produção.xlsx não encontração' });
        }

        // Buscar a primeira planilha (VENDAS_PCP)
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            return res.status(500).json({ message: 'Template inválido - sem planilhas' });
        }

        // Buscar a segunda planilha (PRODUÇÃO)
        const worksheetProducao = workbook.worksheets[1];
        let temAbaProducao = !!worksheetProducao;
        
        console.log('[MODAL-EXCEL] Preenchendo template com base no mapeamento das imagens...');
        if (temAbaProducao) {
            console.log('[MODAL-EXCEL] ✅ Aba PRODUÇÃO encontrada, será preenchida também');
        }

        // Função auxiliar para preencher células com formatação e tratamento de fórmulas
        function preencherCelula(cellAddr, value, label = '', format = null, wsTarget = null) {
            if (value === null || value === undefined) return false;
            
            const targetWorksheet = wsTarget || worksheet;
            
            try {
                const cell = targetWorksheet.getCell(cellAddr);
                if (cell) {
                    // 🔧 PRESERVAR fórmulas de porcentagem (E45, E46) e outras fórmulas de cálculo
                    const formulaAtual = cell.formula || cell.sharedFormula;
                    const ehFormulaPorcentagem = formulaAtual && (formulaAtual.includes('%') || formulaAtual.includes('-E45'));
                    const ehFormulaVlookup = formulaAtual && formulaAtual.includes('VLOOKUP');
                    
                    // Só sobrescrever fórmulas que não sejam de porcentagem ou VLOOKUP
                    if (formulaAtual && !ehFormulaPorcentagem && !ehFormulaVlookup) {
                        console.log(`[MODAL-EXCEL] 🔧 Sobrescrevendo fórmula em ${cellAddr} com: ${String(value).substring(0, 50)}`);
                        cell.formula = null;
                        cell.sharedFormula = null;
                        cell.value = value;
                    } else if (!formulaAtual) {
                        // Célula sem fórmula, preencher normalmente
                        cell.value = value;
                    } else {
                        console.log(`[MODAL-EXCEL] ℹ️ Preservando fórmula em ${cellAddr}: ${formulaAtual}`);
                    }
                    
                    if (format) cell.numFmt = format;
                    if (label && !wsTarget) { // Log apenas para a aba principal
                        console.log(`[MODAL-EXCEL] ${label}: ${cellAddr} = ${String(value).substring(0, 50)}`);
                    }
                    return true;
                }
            } catch (e) {
                console.log(`[MODAL-EXCEL] ⚠️ Erro ao preencher ${cellAddr}: ${e.message}`);
                // Tentar célula alternativa próxima
                try {
                    const col = cellAddr.match(/[A-Z]+/)[0];
                    const row = parseInt(cellAddr.match(/\d+/)[0]);
                    const cellAlternativa = col + (row + 1);
                    const altCell = targetWorksheet.getCell(cellAlternativa);
                    if (altCell && !altCell.formula && !altCell.sharedFormula) {
                        altCell.value = value;
                        if (format) altCell.numFmt = format;
                        console.log(`[MODAL-EXCEL] ${label}: ${cellAlternativa} = ${String(value).substring(0, 50)} (alternativa)`);
                        return true;
                    }
                } catch (e2) {
                    console.log(`[MODAL-EXCEL] ⚠️ Também falhou célula alternativa: ${e2.message}`);
                }
            }
            return false;
        }

        let camposPreenchidos = 0;

        // === MAPEAMENTO CORRETO BASEADO NA ANÁLISE DO TEMPLATE ===
        
        // **LINHA 4 - CABEÇALHO PRINCIPAL (Orçamento, Revisão, Pedido, Data Liberação)**
        // Baseação na análise: A4="Orçamento:", D4="Revisão:", F4="Pedido:", H4="Dt. liberação:"
        if (numero_orcamento) {
            // 🔧 CORREÇÃO 1: Extrair apenas o número do orçamento (01, 001, etc.)
            let numeroLimpo = numero_orcamento;
            const match = numero_orcamento.match(/(\d{1,3})$/); // Pega os últimos 1-3 dígitos
            if (match) {
                numeroLimpo = match[1].padStart(3, '0'); // Preenche com zeros à esquerda para ter 3 dígitos
            }
            camposPreenchidos += preencherCelula('C4', numeroLimpo, 'Orçamento (Número)')  1 : 0; // Valor na célula C4
            
            // 🆕 PREENCHER TAMBÉM NA ABA PRODUÇÃO
            if (temAbaProducao) {
                preencherCelula('C4', numeroLimpo, '', null, worksheetProducao);
            }
        }
        // Revisão - sempre preencher, padrão '00' se não informação
        const revisaoFinal = revisao || '00';
        console.log(`[MODAL-EXCEL] 🔍 Revisão recebida: "${revisao}" -> usando: "${revisaoFinal}"`);
        camposPreenchidos += preencherCelula('E4', revisaoFinal, 'Revisão')  1 : 0; // Valor na célula E4
        if (temAbaProducao) {
            preencherCelula('E4', revisaoFinal, '', null, worksheetProducao);
        }
        
        // Pedido - se não informação, usar sequencial ou padrão
        const pedidoFinal = pedido_referencia || '0';
        camposPreenchidos += preencherCelula('G4', pedidoFinal, 'Pedido')  1 : 0; // Valor na célula G4
        if (temAbaProducao) {
            preencherCelula('G4', pedidoFinal, '', null, worksheetProducao);
        }
        
        // Data de liberação - se não informada, usar data atual
        const dataLiberacaoFinal = data_liberacao  new Date(data_liberacao).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
        camposPreenchidos += preencherCelula('J4', dataLiberacaoFinal, 'Data Liberação')  1 : 0; // Valor na célula J4
        if (temAbaProducao) {
            preencherCelula('J4', dataLiberacaoFinal, '', null, worksheetProducao);
        }

        
        // **LINHA 6 - VENDEDOR E PRAZO DE ENTREGA**
        // Baseação na análise: A6="VENDEDOR:", F6="Prazo de entrega:"
        if (vendedor) {
            camposPreenchidos += preencherCelula('C6', vendedor, 'Vendedor')  1 : 0; // Valor na célula C6
            if (temAbaProducao) {
                preencherCelula('C6', vendedor, '', null, worksheetProducao);
            }
        }
        if (data_previsao_entrega) {
            const dataFormatada = new Date(data_previsao_entrega).toLocaleDateString('pt-BR');
            camposPreenchidos += preencherCelula('H6', dataFormatada, 'Prazo Entrega')  1 : 0; // Valor na célula H6
            if (temAbaProducao) {
                preencherCelula('H6', dataFormatada, '', null, worksheetProducao);
            }
        }
        
        // **LINHA 7 - CLIENTE**
        // Baseação na análise: A7="Cliente:"
        if (cliente) {
            camposPreenchidos += preencherCelula('C7', cliente, 'Cliente')  1 : 0; // Valor na célula C7
            if (temAbaProducao) {
                preencherCelula('C7', cliente, '', null, worksheetProducao);
            }
        }
        
        // **LINHA 8 - CONTATO E TELEFONE**
        // Baseação na análise: A8="Contato:", G8="Fone:"
        if (contato) {
            camposPreenchidos += preencherCelula('C8', contato, 'Contato')  1 : 0; // Valor na célula C8
            if (temAbaProducao) {
                preencherCelula('C8', contato, '', null, worksheetProducao);
            }
        }
        if (telefone) {
            camposPreenchidos += preencherCelula('H8', telefone, 'Telefone')  1 : 0; // Valor na célula H8
            if (temAbaProducao) {
                preencherCelula('H8', telefone, '', null, worksheetProducao);
            }
        }
        
        // **LINHA 9 - EMAIL E FRETE**
        // Baseação na análise: A9="Email:", H9="Frete:"
        if (email) {
            camposPreenchidos += preencherCelula('C9', email, 'Email')  1 : 0; // Valor na célula C9
            if (temAbaProducao) {
                preencherCelula('C9', email, '', null, worksheetProducao);
            }
        }
        if (frete) {
            camposPreenchidos += preencherCelula('J9', frete, 'Frete')  1 : 0; // Valor na célula J9
            if (temAbaProducao) {
                preencherCelula('J9', frete, '', null, worksheetProducao);
            }
        }
        
        // **SEÇÃO TRANSPORTADORA (Linhas 12-15)**
        // Baseação na análise: A12="Nome:", A13="Cep:", A15="CPF/CNPJ:"
        
        // Nome da transportaçãora - usar valor do modal
        const nomeTransportaçãoraFinal = transportaçãoraNome || 'A DEFINIR';
        camposPreenchidos += preencherCelula('C12', nomeTransportaçãoraFinal, 'Nome Transportaçãora')  1 : 0; // Valor na célula C12
        if (temAbaProducao) {
            preencherCelula('C12', nomeTransportaçãoraFinal, '', null, worksheetProducao);
        }
        
        // Telefone da transportaçãora - usar valor do modal
        const foneTransportaçãoraFinal = transportaçãoraFone || '(11) 99999-9999';
        camposPreenchidos += preencherCelula('H12', foneTransportaçãoraFinal, 'Fone Transportaçãora')  1 : 0; // Valor na célula H12
        if (temAbaProducao) {
            preencherCelula('H12', foneTransportaçãoraFinal, '', null, worksheetProducao);
        }
        
        // CEP da transportaçãora - usar valor do modal
        const cepTransportaçãoraFinal = transportaçãoraCep || '00000-000';
        camposPreenchidos += preencherCelula('C13', cepTransportaçãoraFinal, 'CEP')  1 : 0; // Valor na célula C13
        if (temAbaProducao) {
            preencherCelula('C13', cepTransportaçãoraFinal, '', null, worksheetProducao);
        }
        
        // Endereço da transportaçãora - usar valor do modal
        const enderecoTransportaçãoraFinal = transportaçãoraEndereco || 'A DEFINIR';
        camposPreenchidos += preencherCelula('F13', enderecoTransportaçãoraFinal, 'Endereço')  1 : 0; // Valor na célula F13
        if (temAbaProducao) {
            preencherCelula('F13', enderecoTransportaçãoraFinal, '', null, worksheetProducao);
        }
        
        // Email para NFe da transportaçãora - usar valor padrão se não informação
        const emailTransportaçãoraFinal = transportaçãora_email_nfe || 'teste@empresa.com';
        camposPreenchidos += preencherCelula('H13', emailTransportaçãoraFinal, 'Email NFe')  1 : 0; // Valor na célula H13
        if (temAbaProducao) {
            preencherCelula('H13', emailTransportaçãoraFinal, '', null, worksheetProducao);
        }
        
        if (transportaçãoraCpfCnpj) {
            // 🔧 CORREÇÃO 2: Corrigir formatação do CPF/CNPJ para não bugar
            let cpfCnpjLimpo = transportaçãoraCpfCnpj.replace(/\D/g, '');
            let cpfCnpjFormatação = '';
            
            if (cpfCnpjLimpo.length === 11) {
                // CPF: 000.000.000-00
                cpfCnpjFormatação = cpfCnpjLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            } else if (cpfCnpjLimpo.length === 14) {
                // CNPJ: 00.000.000/0000-00
                cpfCnpjFormatação = cpfCnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
            } else {
                cpfCnpjFormatação = transportaçãoraCpfCnpj;
            }
            
            // 🔧 CORREÇÃO CRÍTICA: Usar formato texto para evitar notação científica
            const cell = worksheet.getCell('C15');
            cell.value = cpfCnpjFormatação;
            cell.numFmt = '@'; // Formato texto obrigatório
            console.log(`[MODAL-EXCEL] CPF/CNPJ Formatação: C15 = ${cpfCnpjFormatação}`);
            camposPreenchidos++;
            
            // Aplicar também na aba de produção se existir
            if (temAbaProducao) {
                const cellProd = worksheetProducao.getCell('C15');
                cellProd.value = cpfCnpjFormatação;
                cellProd.numFmt = '@'; // Formato texto obrigatório
            }
        }
        
        if (transportaçãoraEmailNfe) {
            camposPreenchidos += preencherCelula('G15', transportaçãoraEmailNfe, 'Email NFe')  1 : 0; // Valor na célula G15
            if (temAbaProducao) {
                preencherCelula('G15', transportaçãoraEmailNfe, '', null, worksheetProducao);
            }
        }
        
        // === TABELA DE PRODUTOS (Linha 17+) ===
        // Baseação na análise: B17="Cod.", C17="Produto", F17="Embalagem:", G17="Lance(s)", H17="Qtd.", I17="V. Un. R$", J17="V. Total. R$"
        let valorTotalGeral = 0;
        const linhaProdutoInicial = 18; // Produtos começam na linha 18
        
        console.log(`[MODAL-EXCEL] Processando ${itens.length} itens na tabela de produtos...`);
        
        // 🔧 CORREÇÃO 4: Buscar nomes completos dos produtos da base de daçãos
        for (let index = 0; index < itens.length; index++) {
            const item = itens[index];
            const linha = linhaProdutoInicial + index;
            
            // 🔧 CORREÇÃO CRÍTICA: Na aba PRODUÇÃO, cada produto ocupa 3 linhas:
            // - Linha do produto: 13, 16, 19, 22, 25... (começa em 13, incrementa de 3 em 3)
            // - Linha P.BRUTO/P.LIQUIDO/LOTE: 14, 17, 20, 23, 26... (logo abaixo do produto)
            const linhaProducao = 13 + (index * 3); // Produtos em 13, 16, 19, 22...
            const linhaPesoLote = linhaProducao + 1; // Linha de P.BRUTO/P.LIQUIDO/LOTE logo abaixo
            
            let { codigo, descricao, quantidade, valor_unitario, peso_liquido, lote } = item;
            
            // 🔧 CORREÇÃO FINAL: Buscar nome completo SEMPRE para TODOS os produtos
            if (codigo) {
                try {
                    // Buscar produto na base de daçãos usando diferentes métodos
                    let produtoRows = [];
                    
                    // Primeira tentativa: busca exata por código
                    [produtoRows] = await db.query("SELECT * FROM produtos WHERE codigo =  LIMIT 1", [codigo]);
                    
                    // Segunda tentativa: busca parcial se não encontrou
                    if (produtoRows.length === 0) {
                        [produtoRows] = await db.query("SELECT * FROM produtos WHERE codigo LIKE  LIMIT 1", [`%${codigo}%`]);
                    }
                    
                    // Terceira tentativa: busca por SKU ou GTIN
                    if (produtoRows.length === 0) {
                        [produtoRows] = await db.query("SELECT * FROM produtos WHERE sku =  OR gtin =  LIMIT 1", [codigo, codigo]);
                    }
                    
                    if (produtoRows.length > 0) {
                        const produto = produtoRows[0];
                        // Construir nome completo do produto
                        let nomeCompleto = '';
                        
                        if (produto.nome && produto.descricao && produto.nome !== produto.descricao) {
                            nomeCompleto = `${produto.nome} - ${produto.descricao}`;
                        } else if (produto.nome) {
                            nomeCompleto = produto.nome;
                        } else if (produto.descricao) {
                            nomeCompleto = produto.descricao;
                        } else {
                            nomeCompleto = codigo;
                        }
                        
                        // Adicionar variação se existir
                        if (produto.variacao && produto.variacao !== 'N/A') {
                            nomeCompleto += ` (${produto.variacao})`;
                        }
                        
                        descricao = nomeCompleto;
                        console.log(`[EXCEL] ✅ Produto ${codigo}: Nome completo = ${descricao}`);
                    } else {
                        console.log(`[EXCEL] ⚠️ Produto ${codigo} não encontração na base`);
                        descricao = descricao || codigo;
                    }
                } catch (error) {
                    console.log(`[EXCEL] ⚠️ Erro ao buscar produto ${codigo}: ${error.message}`);
                    descricao = descricao || codigo; // Usar código se não conseguir buscar
                }
            }
            
            // 🔧 CORREÇÃO 3: Mapeamento correto dos produtos baseação na análise real
            // A18: Número sequencial (1, 2, 3...)
            // B18: Código
            // C18: Produto/Descrição (ocupa C, D, E)
            // F18: Embalagem
            // G18: Lance(s)
            // H18: Quantidade
            // I18: Valor Unitário
            // J18: Valor Total
            
            // Preencher na aba VENDAS_PCP
            camposPreenchidos += preencherCelula(`A${linha}`, index + 1, `Item ${index + 1} - Seq`)  1 : 0;
            
            if (codigo) {
                camposPreenchidos += preencherCelula(`B${linha}`, codigo, `Item ${index + 1} - Código`)  1 : 0;
                // Também preencher na aba PRODUÇÃO - Coluna B da linha do produto
                if (temAbaProducao) {
                    preencherCelula(`B${linhaProducao}`, codigo, `[PRODUÇÃO] Código linha ${linhaProducao}`, null, worksheetProducao);
                }
            }
            if (descricao) {
                // Produto ocupa células C, D, E na aba VENDAS_PCP
                camposPreenchidos += preencherCelula(`C${linha}`, descricao, `Item ${index + 1} - Descrição`)  1 : 0;
                // 🔧 CORREÇÃO: Preencher nome do produto na aba PRODUÇÃO
                if (temAbaProducao) {
                    // Na aba PRODUÇÃO, o produto vai na coluna C (igual à VENDAS)
                    preencherCelula(`C${linhaProducao}`, descricao, `[PRODUÇÃO] Produto linha ${linhaProducao}`, null, worksheetProducao);
                    console.log(`[MODAL-EXCEL] [PRODUÇÃO] Produto C${linhaProducao} = ${descricao}`);
                }
            }
            
            // Usar embalagem e lances do modal para cada item
            const embalagemItem = item.embalagem || embalagem || 'Bobina';
            const lancesItem = item.lances || lances || '';
            
            camposPreenchidos += preencherCelula(`F${linha}`, embalagemItem, `Item ${index + 1} - Embalagem`)  1 : 0;
            camposPreenchidos += preencherCelula(`G${linha}`, lancesItem, `Item ${index + 1} - Lances`)  1 : 0;
            
            // 🔧 CORREÇÃO: Preencher embalagem e lances também na aba PRODUÇÃO
            if (temAbaProducao) {
                preencherCelula(`H${linhaProducao}`, embalagemItem, `[PRODUÇÃO] Embalagem linha ${linhaProducao}`, null, worksheetProducao);
                preencherCelula(`I${linhaProducao}`, lancesItem, `[PRODUÇÃO] Lances linha ${linhaProducao}`, null, worksheetProducao);
            }
            
            if (quantidade) {
                camposPreenchidos += preencherCelula(`H${linha}`, quantidade, `Item ${index + 1} - Quantidade`)  1 : 0;
                // Também preencher na aba PRODUÇÃO - Coluna J
                if (temAbaProducao) {
                    preencherCelula(`J${linhaProducao}`, quantidade, `[PRODUÇÃO] Qtd linha ${linhaProducao}`, null, worksheetProducao);
                }
            }
            
            // 🔧 CORREÇÃO FINAL: Preencher P.LIQUIDO e LOTE na aba PRODUÇÃO
            // A estrutura na aba PRODUÇÃO conforme ORDEM_COMPLETA_TESTE.xlsx:
            // - Linha do produto (ex: 13): B=Cod, C=Produto, H=Embalagem, I=Lance, J=Qtd
            // - Linha abaixo (ex: 14): A/B="P. BRUTO"(label), C=valor_peso_bruto, D="P.LIQUIDO"(label), E=valor_peso_liquido, F="LOTE"(label), G=valor_lote
            if (temAbaProducao) {
                // Peso Líquido - VALOR vai na coluna E (após o label "P.LIQUIDO" em D)
                const pesoLiquidoItem = peso_liquido || item.peso_liquido || '';
                if (pesoLiquidoItem) {
                    preencherCelula(`E${linhaPesoLote}`, pesoLiquidoItem, `[PRODUÇÃO] P.LIQUIDO VALOR linha ${linhaPesoLote}`, null, worksheetProducao);
                    console.log(`[MODAL-EXCEL] [PRODUÇÃO] P.LIQUIDO VALOR E${linhaPesoLote} = ${pesoLiquidoItem}`);
                }
                
                // Lote - VALOR vai na coluna G (após o label "LOTE" em F)
                const loteItem = lote || item.lote || '';
                if (loteItem) {
                    preencherCelula(`G${linhaPesoLote}`, loteItem, `[PRODUÇÃO] LOTE VALOR linha ${linhaPesoLote}`, null, worksheetProducao);
                    console.log(`[MODAL-EXCEL] [PRODUÇÃO] LOTE VALOR G${linhaPesoLote} = ${loteItem}`);
                }
            }
            if (valor_unitario) {
                // Usar formato de moeda brasileira com verificação de fórmula
                try {
                    const cellValorUnit = worksheet.getCell(`I${linha}`);
                    if (!cellValorUnit.formula && !cellValorUnit.sharedFormula) {
                        cellValorUnit.formula = null;
                        cellValorUnit.sharedFormula = null;
                        cellValorUnit.value = valor_unitario;
                        cellValorUnit.numFmt = 'R$ #,##0.00';
                        console.log(`[MODAL-EXCEL] Item ${index + 1} - Valor Unit: I${linha} = R$ ${valor_unitario}`);
                        camposPreenchidos++;
                    } else {
                        console.log(`[MODAL-EXCEL] ⚠️ Pulando I${linha} - contém fórmula`);
                    }
                } catch (e) {
                    console.log(`[MODAL-EXCEL] ⚠️ Erro em I${linha}: ${e.message}`);
                }
                
                // Também preencher na aba PRODUÇÃO
                if (temAbaProducao) {
                    try {
                        const cellValorUnitProducao = worksheetProducao.getCell(`H${linhaProducao}`);
                        if (!cellValorUnitProducao.formula && !cellValorUnitProducao.sharedFormula) {
                            cellValorUnitProducao.value = valor_unitario;
                            cellValorUnitProducao.numFmt = 'R$ #,##0.00';
                        }
                    } catch (e) {
                        console.log(`[MODAL-EXCEL] ⚠️ Erro em H${linhaProducao} (PRODUÇÃO): ${e.message}`);
                    }
                }
            }
            
            // Calcular valor total do item
            if (quantidade && valor_unitario) {
                const valorTotalItem = quantidade * valor_unitario;
                
                try {
                    const cellValorTotal = worksheet.getCell(`J${linha}`);
                    if (!cellValorTotal.formula && !cellValorTotal.sharedFormula) {
                        cellValorTotal.formula = null;
                        cellValorTotal.sharedFormula = null;
                        cellValorTotal.value = valorTotalItem;
                        cellValorTotal.numFmt = 'R$ #,##0.00';
                        console.log(`[MODAL-EXCEL] Item ${index + 1} - Valor Total: J${linha} = R$ ${valorTotalItem.toFixed(2)}`);
                        camposPreenchidos++;
                    } else {
                        console.log(`[MODAL-EXCEL] ⚠️ Pulando J${linha} - contém fórmula`);
                    }
                } catch (e) {
                    console.log(`[MODAL-EXCEL] ⚠️ Erro em J${linha}: ${e.message}`);
                }
                
                // Também preencher na aba PRODUÇÃO
                if (temAbaProducao) {
                    try {
                        const cellValorTotalProducao = worksheetProducao.getCell(`I${linhaProducao}`);
                        if (!cellValorTotalProducao.formula && !cellValorTotalProducao.sharedFormula) {
                            cellValorTotalProducao.value = valorTotalItem;
                            cellValorTotalProducao.numFmt = 'R$ #,##0.00';
                        }
                    } catch (e) {
                        console.log(`[MODAL-EXCEL] ⚠️ Erro em I${linhaProducao} (PRODUÇÃO): ${e.message}`);
                    }
                }
                
                valorTotalGeral += valorTotalItem;
                console.log(`[MODAL-EXCEL] Item ${index + 1}: ${descricao} - Qtd: ${quantidade} - Unit: R$ ${valor_unitario} - Total: R$ ${valorTotalItem.toFixed(2)}`);
            }
        }
        
        // **TOTAL GERAL DO PEDIDO**
        // Baseação na análise: I34="Total do Pedido:$"
        if (valorTotalGeral > 0) {
            const linhaTotalGeral = 34; // Linha fixa conforme template
            
            // Total na célula J34 com verificação de fórmula
            try {
                const cellTotal = worksheet.getCell('J34');
                if (!cellTotal.formula && !cellTotal.sharedFormula) {
                    cellTotal.formula = null;
                    cellTotal.sharedFormula = null;
                    cellTotal.value = valorTotalGeral;
                    cellTotal.numFmt = 'R$ #,##0.00';
                    console.log(`[MODAL-EXCEL] Total Geral: J34 = R$ ${valorTotalGeral.toFixed(2)}`);
                    camposPreenchidos++;
                } else {
                    console.log(`[MODAL-EXCEL] ⚠️ J34 contém fórmula, tentando célula alternativa`);
                    // Tentar I34 como alternativa
                    const cellTotalAlt = worksheet.getCell('I34');
                    if (!cellTotalAlt.formula && !cellTotalAlt.sharedFormula) {
                        cellTotalAlt.formula = null;
                        cellTotalAlt.sharedFormula = null;
                        cellTotalAlt.value = valorTotalGeral;
                        cellTotalAlt.numFmt = 'R$ #,##0.00';
                        console.log(`[MODAL-EXCEL] Total Geral (alt): I34 = R$ ${valorTotalGeral.toFixed(2)}`);
                        camposPreenchidos++;
                    }
                }
            } catch (e) {
                console.log(`[MODAL-EXCEL] ⚠️ Erro ao definir total: ${e.message}`);
            }
        }
        
        // **SEÇÃO OBSERVAÇÕES**
        // Baseação na análise: A36="Observações do Pedido"
        if (observacoes) {
            // Observações na área específica (A37+)
            const linhaObservacoes = 37;
            camposPreenchidos += preencherCelula(`A${linhaObservacoes}`, observacoes, 'Observações do Pedido')  1 : 0;
        }
        
        // **SEÇÃO CONDIÇÕES DE PAGAMENTO**
        // Baseação na análise: A43="CONDIÇOES DE PAGAMENTO.", A44="FORMAS DE PAGAMENTO", F44="Método de Pagamento", I44="Valor Total $"
        const linhaPagamento = 43; // Linha fixa conforme template
        
        // Linha PARCELADO (linha 45)
        const linhaParcelação = 45;
        camposPreenchidos += preencherCelula(`A${linhaParcelação}`, 'PARCELADO', 'Parcelação')  1 : 0;
        camposPreenchidos += preencherCelula(`E${linhaParcelação}`, '100%', 'Perc Parcelação')  1 : 0;
        camposPreenchidos += preencherCelula(`F${linhaParcelação}`, 'FATURAMENTO', 'Método Pagamento')  1 : 0;
        
        // Aplicar formatação de moeda brasileira no valor total
        if (valorTotalGeral > 0) {
            try {
                const cellParcelação = worksheet.getCell(`I${linhaParcelação}`);
                if (!cellParcelação.formula && !cellParcelação.sharedFormula) {
                    cellParcelação.formula = null;
                    cellParcelação.sharedFormula = null;
                    cellParcelação.value = valorTotalGeral;
                    cellParcelação.numFmt = 'R$ #,##0.00';
                    console.log(`[MODAL-EXCEL] Valor Total Parcelação: I${linhaParcelação} = R$ ${valorTotalGeral.toFixed(2)}`);
                    camposPreenchidos++;
                } else {
                    console.log(`[MODAL-EXCEL] ⚠️ I${linhaParcelação} contém fórmula, usando valor direto`);
                }
            } catch (e) {
                console.log(`[MODAL-EXCEL] ⚠️ Erro ao definir valor parcelação: ${e.message}`);
            }
        }
        
        // Linha ENTREGA (linha 46)
        const linhaEntrega = 46;
        camposPreenchidos += preencherCelula(`A${linhaEntrega}`, 'ENTREGA', 'Entrega')  1 : 0;
        camposPreenchidos += preencherCelula(`E${linhaEntrega}`, '0%', 'Perc Entrega')  1 : 0;
        
        // Valor R$ na coluna da direita (mesmo se for 0)
        try {
            const cellEntrega = worksheet.getCell(`I${linhaEntrega}`);
            if (!cellEntrega.formula && !cellEntrega.sharedFormula) {
                cellEntrega.formula = null;
                cellEntrega.sharedFormula = null;
                cellEntrega.value = 0;
                cellEntrega.numFmt = 'R$ #,##0.00';
                console.log(`[MODAL-EXCEL] Valor Entrega: I${linhaEntrega} = R$ 0,00`);
                camposPreenchidos++;
            } else {
                console.log(`[MODAL-EXCEL] ⚠️ I${linhaEntrega} contém fórmula, pulando`);
            }
        } catch (e) {
            console.log(`[MODAL-EXCEL] ⚠️ Erro ao definir valor entrega: ${e.message}`);
        }
        
        // **SEÇÃO EMBALAGEM**
        // Baseação na análise: F48="EMBALAGEM:"
        if (embalagem) {
            camposPreenchidos += preencherCelula('H48', embalagem, 'Embalagem Geral')  1 : 0;
        }
        
        // **CAMPOS ADICIONAIS DO MODAL**
        // Variação - pode ir em uma área específica
        if (variacao) {
            const linhaVariacao = linhaPagamento + 5;
            camposPreenchidos += preencherCelula(`A${linhaVariacao}`, 'Variação:', 'Label Variação')  1 : 0;
            camposPreenchidos += preencherCelula(`B${linhaVariacao}`, variacao, 'Variação')  1 : 0;
        }
        
        console.log(`[MODAL-EXCEL] Total de campos preenchidos: ${camposPreenchidos}`);
        console.log(`[MODAL-EXCEL] Valor total da ordem: R$ ${valorTotalGeral.toFixed(2)}`);

        // 🔧 CORREÇÃO 4: Implementar nome do arquivo personalização
        const dataAtual = new Date();
        const dataFormatada = dataAtual.toLocaleDateString('pt-BR').replace(/\//g, '-');
        
        // Extrair nome da empresa do campo cliente
        let nomeEmpresa = 'SemEmpresa';
        if (cliente) {
            // Se o cliente tem formato "EMPRESA — CNPJ (Contato)", extrair só o nome
            const empresaMatch = cliente.match(/^([^—]+)/);
            if (empresaMatch) {
                nomeEmpresa = empresaMatch[1].trim();
            } else {
                nomeEmpresa = cliente.substring(0, 30); // Limitar tamanho
            }
        }
        
        const nomeArquivo = `Ordem de Produção - ${dataFormatada} - ${nomeEmpresa}.xlsx`;
        
        console.log(`[MODAL-EXCEL] Nome do arquivo: ${nomeArquivo}`);

        // Configurar response para download com encoding UTF-8
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(nomeArquivo)}`);
        
        // Escrever com configurações UTF-8
        await workbook.xlsx.write(res, {
            useStyles: true,
            useSharedStrings: true
        });
        res.end();
        
        console.log(`[MODAL-EXCEL] ✅ Ordem de produção gerada: ${nomeArquivo}`);

    } catch (err) {
        console.error('[MODAL-EXCEL] ❌ Erro ao gerar ordem:', err);
        res.status(500).json({ message: 'Erro ao gerar ordem de produção em Excel: ' + err.message });
    }
});

// 🆕 ENDPOINT PARA BUSCAR PRODUTOS POR CÓDIGO
app.get('/api/pcp/produtos/buscar/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        
        console.log(`[PRODUTOS] Buscando produto: ${codigo}`);
        
        // Buscar produto pelo código (busca exata e também por padrão)
        const [produtos] = await db.execute(`
            SELECT 
                id,
                codigo,
                nome as descricao,
                descricao as descricao_completa,
                variacao,
                marca,
                gtin,
                sku
            FROM produtos 
            WHERE codigo LIKE  OR gtin LIKE  OR sku LIKE 
            LIMIT 1
        `, [`%${codigo}%`, `%${codigo}%`, `%${codigo}%`]);
        
        if (produtos.length > 0) {
            const produto = produtos[0];
            
            // Simular preço baseação no código (enquanto não temos tabela de preços)
            let preco_unitario = 10.00; // Preço padrão
            
            // Lógica para determinar preço baseação no tipo de cabo
            if (produto.codigo.includes('10mm')) preco_unitario = 15.50;
            else if (produto.codigo.includes('16mm')) preco_unitario = 22.30;
            else if (produto.codigo.includes('25mm')) preco_unitario = 35.80;
            else if (produto.codigo.includes('6mm')) preco_unitario = 12.75;
            else if (produto.codigo.includes('4mm')) preco_unitario = 8.90;
            else if (produto.codigo.includes('2.5mm')) preco_unitario = 6.40;
            else if (produto.codigo.includes('1.5mm')) preco_unitario = 5.60;
            else if (produto.codigo.includes('TRIPLEX')) preco_unitario = 18.20;
            else if (produto.codigo.includes('DUPLEX')) preco_unitario = 14.60;
            else if (produto.codigo.includes('FLEX')) preco_unitario = 7.80;
            
            const produtoCompleto = {
                id: produto.id,
                codigo: produto.codigo,
                descricao: produto.descricao || produto.descricao_completa,
                preco_unitario: preco_unitario,
                embalagem: 'Bobina', // Padrão
                lances: '100,150', // Padrão
                variacao: produto.variacao,
                marca: produto.marca,
                gtin: produto.gtin,
                sku: produto.sku
            };
            
            console.log(`[PRODUTOS] ✅ Produto encontração: ${produto.codigo} - ${produto.descricao}`);
            res.json(produtoCompleto);
        } else {
            console.log(`[PRODUTOS] ❌ Produto não encontração: ${codigo}`);
            res.status(404).json({ message: 'Produto não encontração' });
        }
        
    } catch (error) {
        console.error('[PRODUTOS] ❌ Erro ao buscar produto:', error);
        res.status(500).json({ message: 'Erro ao buscar produto: ' + error.message });
    }
});

// 🆕 ENDPOINT PARA AUTOCOMPLETE DE PRODUTOS
app.get('/api/pcp/produtos/autocomplete', async (req, res) => {
    try {
        const { q } = req.query; // Termo de busca
        
        if (!q || q.length < 2) {
            return res.json([]);
        }
        
        console.log(`[PRODUTOS] Autocomplete: ${q}`);
        
        // Buscar produtos que contenham o termo no código, nome ou descrição
        const [produtos] = await db.execute(`
            SELECT 
                codigo,
                nome as descricao,
                descricao as descricao_completa
            FROM produtos 
            WHERE codigo LIKE  OR nome LIKE  OR descricao LIKE 
            ORDER BY 
                CASE 
                    WHEN codigo LIKE  THEN 1
                    WHEN nome LIKE  THEN 2
                    ELSE 3
                END,
                codigo
            LIMIT 10
        `, [
            `%${q}%`, `%${q}%`, `%${q}%`,
            `${q}%`, `${q}%` // Para priorizar resultaçãos que começam com o termo
        ]);
        
        const resultaçãos = produtos.map(produto => ({
            codigo: produto.codigo,
            descricao: produto.descricao || produto.descricao_completa,
            label: `${produto.codigo} - ${produto.descricao || produto.descricao_completa}`
        }));
        
        console.log(`[PRODUTOS] ✅ Encontraçãos ${resultaçãos.length} produtos para autocomplete`);
        res.json(resultaçãos);
        
    } catch (error) {
        console.error('[PRODUTOS] ❌ Erro no autocomplete:', error);
        res.status(500).json({ message: 'Erro no autocomplete: ' + error.message });
    }
});

// Sistema de backup automático
// fs e path já foram importaçãos no início do arquivo

// Configurar backup automático com cron
let cron;
try {
    cron = require('node-cron');
    
    // Backup diário às 2:00 AM
    cron.schedule('0 2 * * *', async () => {
        console.log('[BACKUP] Iniciando backup automático diário...');
        await executarBackupCompleto();
    });

    // Backup semanal de relatórios (domingos às 3:00 AM)
    cron.schedule('0 3 * * 0', async () => {
        console.log('[BACKUP] Iniciando backup semanal de relatórios...');
        await gerarRelatorioSemanal();
    });

} catch (e) {
    console.log('[BACKUP] node-cron não disponível, backups automáticos desabilitaçãos');
}

async function executarBackupCompleto() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupDir = path.join(__dirname, 'backups', 'auto');
        
        // Criar diretório se não existir
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Backup das tabelas principais
        const tabelas = ['ordens_producao', 'materiais', 'ordens_compra', 'movimentacoes_estoque'];
        
        for (const tabela of tabelas) {
            try {
                const [rows] = await db.query(`SELECT * FROM ${tabela}`);
                const filename = path.join(backupDir, `${tabela}_${timestamp}.json`);
                fs.writeFileSync(filename, JSON.stringify(rows, null, 2));
                console.log(`[BACKUP] ${tabela} salva: ${filename}`);
            } catch (err) {
                console.error(`[BACKUP] Erro ao fazer backup de ${tabela}:`, err.message);
            }
        }

        // Registrar backup na tabela de controle
        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS backup_historico (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    tipo ENUM('AUTO', 'MANUAL') NOT NULL,
                    status ENUM('SUCESSO', 'ERRO') NOT NULL,
                    data_backup TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    detalhes TEXT,
                    arquivo_path VARCHAR(500)
                )
            `);

            await db.query(
                'INSERT INTO backup_historico (tipo, status, detalhes, arquivo_path) VALUES (, , , )',
                ['AUTO', 'SUCESSO', `Backup automático de ${tabelas.length} tabelas`, backupDir]
            );
        } catch (err) {
            console.error('[BACKUP] Erro ao registrar histórico:', err.message);
        }

    } catch (err) {
        console.error('[BACKUP] Erro no backup automático:', err);
    }
}

async function gerarRelatorioSemanal() {
    try {
        const dataFim = new Date();
        const dataInicio = new Date(dataFim.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 dias atrás

        // Estatísticas da semana
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as ordens_criadas,
                SUM(quantidade) as total_pecas,
                COUNT(CASE WHEN status = 'Concluído' THEN 1 END) as ordens_concluidas
            FROM ordens_producao 
            WHERE data_criacao BETWEEN  AND 
        `, [dataInicio, dataFim]);

        const [materiaisBaixos] = await db.query(`
            SELECT COUNT(*) as materiais_baixo_estoque 
            FROM materiais 
            WHERE quantidade_estoque <= 10
        `);

        const relatorio = {
            periodo: {
                inicio: dataInicio.toISOString().slice(0, 10),
                fim: dataFim.toISOString().slice(0, 10)
            },
            estatisticas: {
                ...stats[0],
                materiais_baixo_estoque: materiaisBaixos[0].materiais_baixo_estoque
            },
            geração_em: new Date().toISOString()
        };

        const filename = path.join(__dirname, 'backups', 'relatorios', 
            `relatorio_semanal_${dataFim.toISOString().slice(0, 10)}.json`);
        
        if (!fs.existsSync(path.dirname(filename))) {
            fs.mkdirSync(path.dirname(filename), { recursive: true });
        }

        fs.writeFileSync(filename, JSON.stringify(relatorio, null, 2));
        console.log('[BACKUP] Relatório semanal geração:', filename);

    } catch (err) {
        console.error('[BACKUP] Erro ao gerar relatório semanal:', err);
    }
}

// Endpoint para backup manual
app.post('/api/pcp/backup/manual', authRequired, async (req, res) => {
    try {
        await executarBackupCompleto();
        res.json({ 
            message: 'Backup manual executação com sucesso',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Erro no backup manual:', err);
        res.status(500).json({ message: 'Erro ao executar backup manual' });
    }
});

// Endpoint para histórico de backups
app.get('/api/pcp/backup/historico', authRequired, async (req, res) => {
    try {
        const [historico] = await db.query(`
            SELECT * FROM backup_historico 
            ORDER BY data_backup DESC 
            LIMIT 50
        `);
        res.json(historico);
    } catch (err) {
        console.error('Erro ao buscar histórico de backup:', err);
        res.status(500).json({ message: 'Erro ao buscar histórico de backup' });
    }
});


// Inicia o servidor HTTP (com Socket.IO integração)
// Try to listen on requested port, but if it's already in use, try the next few ports.
function tryListen(startPort, maxTries = 10) {
    let attempt = 0;
    function listenPort(port) {
        attempt++;
        httpServer.listen(port, () => {
            logger.info(`🚀 Servidor do P.C.P. a correr em http://localhost:${port}`);
            
            // 🔒 SECURITY: Limpeza periódica de sessões expiradas (a cada 1 hora)
            setInterval(() => {
                const cleaned = cleanExpiredSessions(sessions, 24 * 60 * 60 * 1000); // 24 horas
                if (cleaned > 0) {
                    logger.info(`🧹 [PCP] ${cleaned} sessões expiradas removidas`);
                }
            }, 60 * 60 * 1000); // 1 hora
        });
        httpServer.once('error', (err) => {
            if (err && err.code === 'EADDRINUSE') {
                logger.warn(`⚠️ Port ${port} em uso, tentando porta ${port + 1}...`);
                if (attempt < maxTries) {
                    // small delay before retrying
                    setTimeout(() => listenPort(port + 1), 200);
                } else {
                    logger.error('❌ Não foi possível iniciar o servidor: portas em uso.');
                    process.exit(1);
                }
            } else {
                logger.error('❌ Erro ao iniciar o servidor:', err && err.message  err.message : err);
                process.exit(1);
            }
        });
    }
    listenPort(startPort);
}

tryListen(PORT, 12);

// Buscar produto por id
app.get('/api/pcp/produtos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM produtos WHERE id = ', [id]);
        if (rows.length > 0) {
            const r = rows[0];
            // normalize variacao to array for clients (same behaviour as list endpoint)
            try {
                if (r && typeof r.variacao === 'string') {
                    const raw = r.variacao.trim();
                    if (!raw) { r.variacao = []; }
                    else if (raw.startsWith('[') || raw.startsWith('{')) {
                        try { r.variacao = JSON.parse(raw); } catch (e) { r.variacao = [raw]; }
                    } else {
                        const parts = raw.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
                        r.variacao = parts;
                    }
                }
            } catch (e) { /* ignore parse errors */ }
            res.json(r);
        } else res.status(404).json({ message: 'Produto não encontração' });
    } catch (err) {
        console.error('Erro ao buscar produto:', err.message);
        res.status(500).json({ message: 'Erro ao buscar produto.' });
    }
});

// Busca unificada (server-side) para ordens, materiais e produtos
app.get('/api/pcp/search', async (req, res) => {
    const q = (req.query.q || '').trim();
    const type = (req.query.type || '').trim(); // optional: 'ordem'|'material'|'produto'
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 25;
    if (!q) return res.json({ ordens: [], materiais: [], produtos: [] });

    // safety bounds
    if (limit > 200) limit = 200;
    if (page < 1) page = 1;
    const offset = (page - 1) * limit;
    const like = `%${q}%`;

    try {
        const result = { ordens: [], materiais: [], produtos: [] };

        // Helper: query ordens
        async function queryOrdens() {
            const [rows] = await db.query(
                `SELECT id, codigo_produto, descricao_produto, quantidade, data_previsao_entrega, status
                 FROM ordens_producao
                 WHERE codigo_produto LIKE  OR descricao_produto LIKE 
                 ORDER BY data_previsao_entrega ASC
                 LIMIT  OFFSET `, [like, like, limit, offset]
            );
            return rows;
        }

        async function queryMateriais() {
            const [rows] = await db.query(
                `SELECT id, codigo_material, descricao, unidade_medida, quantidade_estoque
                 FROM materiais
                 WHERE codigo_material LIKE  OR descricao LIKE 
                 ORDER BY descricao ASC
                 LIMIT  OFFSET `, [like, like, limit, offset]
            );
            return rows;
        }

        async function queryProdutos() {
            const [rows] = await db.query(
                `SELECT id, codigo, descricao, unidade_medida, quantidade_estoque, custo_unitario
                 FROM produtos
                 WHERE codigo LIKE  OR descricao LIKE 
                 ORDER BY descricao ASC
                 LIMIT  OFFSET `, [like, like, limit, offset]
            );
            return rows;
        }

        async function queryPedidos() {
            // search by pedido id (if numeric), cliente (empresa) or produto code/description (join produtos)
            const possibleId = parseInt(q, 10);
            if (!Number.isNaN(possibleId)) {
                const [rows] = await db.query(
                    `SELECT p.id, p.cliente, p.produto_id, p.quantidade, p.status, p.data_pedido, pr.codigo as produto_codigo, pr.descricao as produto_descricao
                     FROM pedidos p
                     LEFT JOIN produtos pr ON p.produto_id = pr.id
                     WHERE p.id = 
                     ORDER BY p.data_pedido DESC
                     LIMIT  OFFSET `, [possibleId, limit, offset]
                );
                return rows;
            }
            const [rows] = await db.query(
                `SELECT p.id, p.cliente, p.produto_id, p.quantidade, p.status, p.data_pedido, pr.codigo as produto_codigo, pr.descricao as produto_descricao
                 FROM pedidos p
                 LEFT JOIN produtos pr ON p.produto_id = pr.id
                 WHERE p.cliente LIKE  OR pr.codigo LIKE  OR pr.descricao LIKE 
                 ORDER BY p.data_pedido DESC
                 LIMIT  OFFSET `, [like, like, like, limit, offset]
            );
            return rows;
        }

    if (!type || type === 'ordem') result.ordens = await queryOrdens();
    if (!type || type === 'material') result.materiais = await queryMateriais();
    if (!type || type === 'produto') result.produtos = await queryProdutos();
    if (!type || type === 'pedido') result.pedidos = await queryPedidos();

        // counts for pagination/UX
        let ordensTotal = 0, materiaisTotal = 0, produtosTotal = 0;
        try {
            const [ordensCountRows] = await db.query(`SELECT COUNT(*) AS total FROM ordens_producao WHERE codigo_produto LIKE  OR descricao_produto LIKE `, [like, like]);
            ordensTotal = ordensCountRows[0].total || 0;
        } catch (e) { ordensTotal = 0; }
        try {
            const [materiaisCountRows] = await db.query(`SELECT COUNT(*) AS total FROM materiais WHERE codigo_material LIKE  OR descricao LIKE `, [like, like]);
            materiaisTotal = materiaisCountRows[0].total || 0;
        } catch (e) { materiaisTotal = 0; }
        try {
            const [produtosCountRows] = await db.query(`SELECT COUNT(*) AS total FROM produtos WHERE codigo LIKE  OR descricao LIKE `, [like, like]);
            produtosTotal = produtosCountRows[0].total || 0;
        } catch (e) { produtosTotal = 0; }
        // pedidos count
        let pedidosTotal = 0;
        try {
            const [pedidosCountRows] = await db.query(`SELECT COUNT(*) AS total FROM pedidos p LEFT JOIN produtos pr ON p.produto_id = pr.id WHERE p.id =  OR p.cliente LIKE  OR pr.codigo LIKE  OR pr.descricao LIKE `, [q, like, like, like]);
            pedidosTotal = pedidosCountRows[0].total || 0;
        } catch (e) { pedidosTotal = 0; }

        // include pagination metadata and totals
    res.json({ page, limit, q, results: result, totals: { ordens: ordensTotal, materiais: materiaisTotal, produtos: produtosTotal, pedidos: pedidosTotal } });
    } catch (err) {
        console.error('Erro na busca unificada:', err.message);
        res.status(500).json({ message: 'Erro ao realizar busca.' });
    }
});

// Health endpoint for quick checks - versão melhorada
app.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            pid: process.pid
        };
        
        // Testar banco de daçãos
        try {
            await db.query('SELECT 1');
            health.database = 'connected';
        } catch (e) {
            health.database = 'disconnected';
            health.status = 'warning';
            logger.warn('Database health check failed:', e.message);
        }
        
        res.json(health);
    } catch (err) {
        logger.error('Health check error:', err);
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// (API JSON 404 and global error handler will be registered at the end of the file)

// Internal debug endpoint (temporary) to report server bind info and PID
app.get('/internal-debug', (req, res) => {
    try {
        const addr = httpServer.address();
        res.json({ pid: process.pid, address: addr });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Lightweight endpoint to return current authenticated user (used by client probes)
app.get('/api/pcp/me', authRequired, async (req, res) => {
    try {
        const user = req.user || {};
        // attempt to fetch foto_perfil_url from multiple tables
        let foto = null;
        
        // First try usuarios_pcp table (our main PCP users)
        try {
            if (user.email) {
                const [rows] = await db.query('SELECT foto_url FROM usuarios_pcp WHERE email =  LIMIT 1', [user.email]);
                if (rows && rows[0] && rows[0].foto_url) foto = rows[0].foto_url;
            }
        } catch (e) {
            // ignore lookup errors and continue with other heuristics
            foto = foto || null;
        }
        
        // Then try funcionarios table as fallback
        try {
            if (!foto && user.email) {
                const [rows] = await db.query('SELECT foto_perfil_url FROM funcionarios WHERE email =  LIMIT 1', [user.email]);
                if (rows && rows[0] && rows[0].foto_perfil_url) foto = rows[0].foto_perfil_url;
            }
        } catch (e) {
            // ignore lookup errors and continue with other heuristics
            foto = foto || null;
        }
        try {
            if (!foto && user.id) {
                const [rows2] = await db.query('SELECT foto_perfil_url FROM funcionarios WHERE usuario_id =  LIMIT 1', [user.id]);
                if (rows2 && rows2[0] && rows2[0].foto_perfil_url) foto = rows2[0].foto_perfil_url;
            }
        } catch (e) { /* ignore */ }
        try {
            if (!foto && user.id) {
                const [rows3] = await db.query('SELECT foto_perfil_url FROM funcionarios WHERE id =  LIMIT 1', [user.id]);
                if (rows3 && rows3[0] && rows3[0].foto_perfil_url) foto = rows3[0].foto_perfil_url;
            }
        } catch (e) { /* ignore */ }

        // return a sanitized subset of user fields (do not expose senha/password)
        const safe = {
            id: user.id,
            email: user.email,
            nome: user.nome,
            role: user.role,
            foto_perfil_url: foto || null
        };
        res.json({ user: safe });
    } catch (err) {
        console.error('/api/pcp/me error:', err && err.message  err.message : err);
        res.status(500).json({ message: 'Erro ao obter daçãos do usuário.' });
    }
});

// Endpoint to get users list for login avatar (public endpoint - no sensitive data)
app.get('/api/pcp/users-list', async (req, res) => {
    try {
        // Get basic user info for avatar display in login
        const [users] = await db.query(`
            SELECT id, nome, email, role, foto_url
            FROM usuarios_pcp 
            WHERE ativo = TRUE OR ativo IS NULL
            ORDER BY nome
        `);
        
        // Return sanitized user data (no passwords or sensitive info)
        const sanitizedUsers = users.map(user => ({
            id: user.id,
            nome: user.nome,
            email: user.email,
            role: user.role,
            foto_url: user.foto_url
        }));
        
        res.json({ users: sanitizedUsers });
    } catch (err) {
        console.error('/api/pcp/users-list error:', err && err.message  err.message : err);
        res.status(500).json({ message: 'Erro ao obter lista de usuários.' });
    }
});

// Logout endpoint: clears session and cookie set by login
app.post('/api/pcp/logout', (req, res) => {
    try {
        const sid = getSessionIdFromReq(req);
        if (sid && sessions.has(sid)) sessions.delete(sid);
        // Clear cookie on client
        res.setHeader('Set-Cookie', 'pcp_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
        return res.json({ message: 'Logged out' });
    } catch (err) {
        console.error('Logout error:', err && err.message  err.message : err);
        return res.status(500).json({ message: 'Erro ao deslogar' });
    }
});

// fetch single pedido by id
app.get('/api/pcp/pedidos/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`[DEBUG] Buscando pedido ID: ${id}`);
    
    try {
        // Query the pedidos table directly - no JOIN since produto_id column doesn't exist
        const [rows] = await db.query('SELECT * FROM pedidos WHERE id = ', [id]);
        console.log(`[DEBUG] Query resultação: ${rows  rows.length : 0} linhas`);
        
        if (!rows || rows.length === 0) {
            console.log(`[DEBUG] Pedido ${id} não encontração`);
            return res.status(404).json({ message: 'Pedido não encontração' });
        }
        
        // Return the pedido with produtos_preview field (which contains product info as JSON)
        const pedido = rows[0];
        console.log(`[DEBUG] Pedido encontração:`, pedido.descricao);
        
        // Parse produtos_preview if it exists and is valid JSON
        if (pedido.produtos_preview) {
            try {
                pedido.produtos = JSON.parse(pedido.produtos_preview);
                console.log(`[DEBUG] Produtos parseaçãos: ${pedido.produtos.length} itens`);
            } catch (e) {
                console.warn('Erro ao parsear produtos_preview:', e.message);
                pedido.produtos = [];
            }
        } else {
            pedido.produtos = [];
            console.log(`[DEBUG] Sem produtos_preview`);
        }
        
        console.log(`[DEBUG] Retornando pedido completo`);
        res.json(pedido);
    } catch (err) {
        console.error('Erro ao buscar pedido ID', id, ':', err && err.message  err.message : err);
        res.status(500).json({ message: 'Erro ao buscar pedido.', error: err.message });
    }
});

// Debug endpoint: return raw rows or error for faturaçãos query (temporary)
app.get('/api/pcp/debug/pedidos-faturaçãos', async (req, res) => {
    try {
        const sql = `SELECT id, valor, descricao, status, created_at, data_prevista, prazo_entrega, cliente_id, empresa_id, produtos_preview, endereco_entrega, municipio_entrega FROM pedidos WHERE (status LIKE '%fatur%' OR status LIKE '%entreg%' OR status LIKE '%aprov%') ORDER BY created_at DESC LIMIT 50`;
        const [rows] = await db.query(sql);
        return res.json({ ok: true, rows: rows.slice(0,10) });
    } catch (err) {
        return res.status(500).json({ ok: false, error: (err && err.message)  err.message : String(err) });
    }
});

// --- INVENTÁRIO ADICIONAL: locations e movimentos ---
// Criar location
app.post('/api/pcp/locations', authRequired, async (req, res) => {
    const { code, name, description } = req.body;
    try {
        const [r] = await db.query('INSERT INTO locations (code, name, description) VALUES (, , )', [code, name, description]);
        res.status(201).json({ id: r.insertId, code, name });
    } catch (e) {
        console.error('Erro ao criar location:', e && e.message  e.message : e);
        res.status(500).json({ message: 'Erro ao criar location.' });
    }
});

// List locations
app.get('/api/pcp/locations', authRequired, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, code, name, description FROM locations ORDER BY name ASC');
        res.json(rows);
    } catch (e) {
        console.error('Erro ao listar locations:', e && e.message  e.message : e);
        res.status(500).json({ message: 'Erro ao listar locations.' });
    }
});

// Register a stock movement
app.post('/api/pcp/stock_movements', authRequired, async (req, res) => {
    const { produto_id, location_from, location_to, quantidade, tipo, referencia, lote } = req.body;
    if (!produto_id || !quantidade || !tipo) return res.status(400).json({ message: 'produto_id, quantidade e tipo são obrigatórios.' });
    try {
        // if OUT movement, validate saldo at location_from
        if (tipo === 'OUT') {
            if (!location_from) return res.status(400).json({ message: 'location_from é obrigatório para movimentos OUT.' });
            const [rows] = await db.query(`
                SELECT COALESCE(SUM(CASE WHEN tipo='IN' THEN quantidade WHEN tipo='OUT' THEN -quantidade WHEN tipo='TRANSFER' AND location_to= THEN quantidade WHEN tipo='TRANSFER' AND location_from= THEN -quantidade WHEN tipo='ADJUST' THEN quantidade ELSE 0 END),0) AS saldo
                FROM stock_movements WHERE produto_id = 
            `, [location_from, location_from, produto_id]);
            const saldo = rows && rows[0]  parseFloat(rows[0].saldo) : 0;
            if (saldo < quantidade) return res.status(400).json({ message: `Saldo insuficiente na localização ${location_from}. Saldo atual: ${saldo}` });
        }
        const sql = 'INSERT INTO stock_movements (produto_id, location_from, location_to, quantidade, tipo, referencia, lote, created_by) VALUES (, , , , , , , )';
        const created_by = req.user  req.user.id : null;
        const [r] = await db.query(sql, [produto_id, location_from || null, location_to || null, quantidade, tipo, referencia || null, lote || null, created_by]);
        res.status(201).json({ id: r.insertId });
    } catch (e) {
        console.error('Erro ao gravar movimento:', e && e.message  e.message : e);
        res.status(500).json({ message: 'Erro ao gravar movimento.' });
    }
});

// Enhanced transfer endpoint with validation to prevent negative balances
app.post('/api/pcp/transfer', authRequired, async (req, res) => {
    const { produto_id, from_location, to_location, quantidade, referencia, lote } = req.body;
    if (!produto_id || !from_location || !to_location || !quantidade) return res.status(400).json({ message: 'produto_id, from_location, to_location e quantidade são obrigatórios.' });
    try {
        // compute current saldo for produto at from_location
        const [rows] = await db.query(`
            SELECT COALESCE(SUM(CASE WHEN tipo='IN' THEN quantidade WHEN tipo='OUT' THEN -quantidade WHEN tipo='TRANSFER' AND location_to= THEN quantidade WHEN tipo='TRANSFER' AND location_from= THEN -quantidade WHEN tipo='ADJUST' THEN quantidade ELSE 0 END),0) AS saldo
            FROM stock_movements WHERE produto_id = 
        `, [from_location, from_location, produto_id]);
        const saldo = rows && rows[0]  parseFloat(rows[0].saldo) : 0;
        if (saldo < quantidade) return res.status(400).json({ message: `Saldo insuficiente na localização ${from_location}. Saldo atual: ${saldo}` });
        // Insert transfer as two entries or as a single transfer record depending on your accounting; we'll use single transfer record
        const created_by = req.user  req.user.id : null;
        const [r] = await db.query('INSERT INTO stock_movements (produto_id, location_from, location_to, quantidade, tipo, referencia, lote, created_by) VALUES (, , , , , , , )', [produto_id, from_location, to_location, quantidade, 'TRANSFER', referencia || null, lote || null, created_by]);
        res.status(201).json({ id: r.insertId });
    } catch (e) {
        console.error('Erro ao executar transfer:', e && e.message  e.message : e);
        res.status(500).json({ message: 'Erro ao executar transfer.' });
    }
});

// Compute stock balance for a produto across locations
app.get('/api/pcp/stock_balance/:produto_id', authRequired, async (req, res) => {
    const produto_id = parseInt(req.params.produto_id, 10);
    if (!produto_id) return res.status(400).json({ message: 'produto_id inválido.' });
    try {
        const [rows] = await db.query(
            `SELECT COALESCE(l.id,0) AS location_id, COALESCE(l.code,'_UNLOC_') AS code, COALESCE(l.name,'Unallocated') AS name,
                    SUM(CASE WHEN sm.tipo = 'IN' THEN sm.quantidade WHEN sm.tipo = 'OUT' THEN -sm.quantidade WHEN sm.tipo = 'TRANSFER' AND sm.location_to = l.id THEN sm.quantidade WHEN sm.tipo = 'TRANSFER' AND sm.location_from = l.id THEN -sm.quantidade WHEN sm.tipo = 'ADJUST' THEN sm.quantidade ELSE 0 END) AS saldo
             FROM stock_movements sm
             LEFT JOIN locations l ON l.id = sm.location_to OR l.id = sm.location_from
             WHERE sm.produto_id = 
             GROUP BY COALESCE(l.id,0), COALESCE(l.code,'_UNLOC_'), COALESCE(l.name,'Unallocated')`, [produto_id]
        );
        res.json({ produto_id, balances: rows });
    } catch (e) {
        console.error('Erro ao calcular saldo:', e && e.message  e.message : e);
        res.status(500).json({ message: 'Erro ao calcular saldo.' });
    }
});

// =============================================
// ENDPOINT: Gerar Ordem de Produção em Excel (COMPLETO COM VENDAS_PCP)
// =============================================
app.post('/api/gerar-ordem-excel', async (req, res) => {
    try {
        const daçãos = req.body;
        
        // Normalizar nomes de campos (aceitar diferentes variantes)
        const numPedido = daçãos.num_pedido || daçãos.numero_sequencial || daçãos.numero_pedido || '';
        const numOrcamento = daçãos.num_orcamento || daçãos.numero_orcamento || '';
        
        logger.info('[GERAR ORDEM EXCEL] Recebendo daçãos:', { numPedido, numOrcamento, produtos: daçãos.produtos.length });
        
        // Validações básicas - ser mais flexível
        if (!numPedido && !numOrcamento && !daçãos.cliente) {
            return res.status(400).json({ message: 'Preencha pelo menos o número do pedido, orçamento ou cliente' });
        }
        
        if (!daçãos.produtos || daçãos.produtos.length === 0) {
            return res.status(400).json({ message: 'Adicione pelo menos um produto' });
        }
        
        // Carregar template Excel com planilhas VENDAS_PCP e PRODUÇÃO
        const templatePath = path.join(__dirname, 'Ordem de Produção Aluforce - Copia.xlsx');
        
        if (!fs.existsSync(templatePath)) {
            logger.error('[GERAR ORDEM EXCEL] Template não encontração:', templatePath);
            return res.status(400).json({ message: 'Template Excel não encontração: ' + templatePath });
        }
        
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        
        // ===== PLANILHA VENDAS_PCP =====
        const wsVendas = workbook.getWorksheet('VENDAS_PCP');
        if (!wsVendas) {
            return res.status(500).json({ message: 'Planilha VENDAS_PCP não encontrada no template' });
        }
        
        // PREENCHER VENDAS_PCP (Linhas 4-15) - As fórmulas da planilha PRODUÇÃO referenciam essas células
        wsVendas.getCell('C4').value = numOrcamento;
        wsVendas.getCell('E4').value = daçãos.revisao || '00';
        wsVendas.getCell('G4').value = numPedido;
        
        if (daçãos.data_liberacao) {
            // Tentar múltiplos formatos de data
            let dataLib;
            if (daçãos.data_liberacao.includes('/')) {
                // Formato brasileiro DD/MM/YYYY
                const [dia, mes, ano] = daçãos.data_liberacao.split('/');
                dataLib = new Date(ano, mes - 1, dia);
            } else {
                // Formato ISO YYYY-MM-DD
                dataLib = new Date(daçãos.data_liberacao + 'T00:00:00');
            }
            wsVendas.getCell('J4').value = dataLib;
            wsVendas.getCell('J4').numFmt = 'dd/mm/yyyy';
        }
        
        // Vendedor
        wsVendas.getCell('C6').value = daçãos.vendedor || '';
        
        // Prazo de Entrega - H6 tem fórmula =J4+30, só preencher se prazo específico foi informação
        if (daçãos.prazo_entrega && daçãos.prazo_entrega.trim()) {
            let dataPrazo;
            if (daçãos.prazo_entrega.includes('/')) {
                const [dia, mes, ano] = daçãos.prazo_entrega.split('/');
                dataPrazo = new Date(ano, mes - 1, dia);
            } else {
                dataPrazo = new Date(daçãos.prazo_entrega + 'T00:00:00');
            }
            wsVendas.getCell('H6').value = dataPrazo;
            wsVendas.getCell('H6').numFmt = 'dd/mm/yyyy';
        }
        // Se não informar prazo, deixa a fórmula =J4+30 calcular automaticamente
        
        // Cliente
        wsVendas.getCell('C7').value = daçãos.cliente || '';
        
        // Contato
        wsVendas.getCell('C8').value = daçãos.contato_cliente || daçãos.contato || '';
        
        // Fone
        wsVendas.getCell('H8').value = daçãos.fone_cliente || daçãos.telefone || '';
        
        // Email
        wsVendas.getCell('C9').value = daçãos.email_cliente || daçãos.email || '';
        
        // Frete
        wsVendas.getCell('J9').value = daçãos.tipo_frete || 'FOB';
        
        // CEP
        wsVendas.getCell('C13').value = daçãos.cep || '';
        
        // Endereço
        wsVendas.getCell('F13').value = daçãos.endereco || '';
        
        // Daçãos para cobrança (Linha 14) - Em branco por padrão
        // NÃO PREENCHER - deve ficar vazio conforme modelo padrão
        wsVendas.getCell('C14').value = '';
        wsVendas.getCell('D14').value = '';
        wsVendas.getCell('E14').value = '';
        
        // CPF/CNPJ - Formatação com pontuação
        const cpfCnpjFormatação = formatarCpfCnpjExcel(daçãos.cpf_cnpj || '');
        wsVendas.getCell('C15').value = cpfCnpjFormatação;
        
        // Email NF-e (usa o email do cliente se não informação)
        wsVendas.getCell('G15').value = daçãos.email_nfe || daçãos.email_cliente || daçãos.email || '';
        
        // PRODUTOS na planilha VENDAS_PCP (Linhas 18-32)
        // IMPORTANTE: Apenas preenchemos B (código), F, G, H, I
        // As colunas C, D, E têm fórmulas VLOOKUP que buscam nome do produto baseação no código
        // A coluna J tem fórmula =I*H para calcular valor total
        // A planilha PRODUÇÃO usa VLOOKUP para buscar código de cores baseação no código (coluna P)
        
        let linhaVendas = 18;
        let itemNum = 1;
        for (const produto of daçãos.produtos.slice(0, 15)) { // Limite de 15 produtos
            // Coluna A: Número do item (1, 2, 3...)
            wsVendas.getCell(`A${linhaVendas}`).value = itemNum;
            
            // Coluna B: Código do produto (OBRIGATÓRIO - usação pelos VLOOKUPs)
            // O código deve estar exatamente como na tabela de lookup (ex: TRN10, DUN16, etc)
            wsVendas.getCell(`B${linhaVendas}`).value = produto.codigo || '';
            
            // Colunas C, D, E: NÃO PREENCHER - têm fórmulas VLOOKUP que buscam nome do produto
            // As fórmulas são: =IFERROR(VLOOKUP(B18,N18:O198,2,0),"")
            // Se o código do produto existir na tabela N:O, o nome aparecerá automaticamente
            // Se precisar forçar o nome (produto não cadastração na tabela), preencher apenas se código não existe
            if (!produto.codigo && (produto.descricao || produto.nome || produto.produto)) {
                // Produto sem código - preencher nome manualmente
                const nomeProduto = produto.descricao || produto.nome || produto.produto || '';
                wsVendas.getCell(`C${linhaVendas}`).value = nomeProduto;
            }
            // Se tem código, deixa o VLOOKUP do template buscar o nome automaticamente
            
            // Coluna F: Embalagem
            wsVendas.getCell(`F${linhaVendas}`).value = produto.embalagem || 'Rolo';
            
            // Coluna G: Lances (formato: 1x100, 2x50, etc)
            wsVendas.getCell(`G${linhaVendas}`).value = produto.lances || '1x100';
            
            // Coluna H: Quantidade
            wsVendas.getCell(`H${linhaVendas}`).value = produto.quantidade || 0;
            
            // Coluna I: Valor Unitário
            wsVendas.getCell(`I${linhaVendas}`).value = produto.valor_unitario || 0;
            wsVendas.getCell(`I${linhaVendas}`).numFmt = 'R$ #,##0.00';
            
            // Coluna J: NÃO PREENCHER - tem fórmula =I*H que calcula automaticamente
            // A fórmula original do template será preservada
            
            linhaVendas++;
            itemNum++;
        }
        
        // ===== CAMPOS ADICIONAIS CONFORME MAPEAMENTO =====
        
        // TRANSPORTADORA (Linhas 11-15) - Células corretas conforme MAPEAMENTO_EXCEL_OP.md
        wsVendas.getCell('C12').value = daçãos.transportaçãora_nome || '';
        // H12 = Fórmula =H8 (não preencher)
        wsVendas.getCell('C13').value = daçãos.transportaçãora_cep || daçãos.cep || '';
        wsVendas.getCell('F13').value = daçãos.transportaçãora_endereco || daçãos.endereco || '';
        
        // CPF/CNPJ da transportaçãora com formatação (se diferente do cliente)
        const cpfCnpjTransp = daçãos.transportaçãora_cpf_cnpj || daçãos.cpf_cnpj || '';
        wsVendas.getCell('C15').value = formatarCpfCnpjExcel(cpfCnpjTransp);
        // G15 = Fórmula =C9 (não preencher)
        
        // OBSERVAÇÕES (Linhas 36-42)
        const observacoes = daçãos.observacoes_pedido || daçãos.observacoes || '';
        if (observacoes) {
            wsVendas.getCell('A37').value = observacoes;
        }
        
        // PAGAMENTO (Linhas 43-46) - Suporta múltiplas formas de pagamento
        if (daçãos.formas_pagamento && daçãos.formas_pagamento.length > 0) {
            // Linha 45: Primeira forma de pagamento
            const pgto1 = daçãos.formas_pagamento[0];
            wsVendas.getCell('A45').value = pgto1.forma || 'A_VISTA';
            wsVendas.getCell('E45').value = (pgto1.percentual || 100) / 100; // Converter para decimal
            wsVendas.getCell('E45').numFmt = '0%';
            wsVendas.getCell('F45').value = pgto1.metodo || 'BOLETO';
            
            // Linha 46: Segunda forma de pagamento (se houver)
            if (daçãos.formas_pagamento.length > 1) {
                const pgto2 = daçãos.formas_pagamento[1];
                wsVendas.getCell('A46').value = pgto2.forma || '';
                wsVendas.getCell('E46').value = (pgto2.percentual || 0) / 100;
                wsVendas.getCell('E46').numFmt = '0%';
                wsVendas.getCell('F46').value = pgto2.metodo || '';
            }
        } else {
            // Compatibilidade com formato antigo
            if (daçãos.forma_pagamento) {
                wsVendas.getCell('A45').value = daçãos.forma_pagamento.toUpperCase();
            }
            if (daçãos.metodo_pagamento) {
                wsVendas.getCell('F45').value = daçãos.metodo_pagamento.toUpperCase();
            }
            // E45 é percentual (1 = 100%)
            const percentual = daçãos.percentual_pagamento  daçãos.percentual_pagamento / 100 : 1;
            wsVendas.getCell('E45').value = percentual;
            wsVendas.getCell('E45').numFmt = '0%';
        }
        // I45 = Fórmula =I35 (não preencher)
        
        // ENTREGA (Linhas 48-54)
        if (daçãos.qtd_volumes) {
            wsVendas.getCell('D48').value = parseInt(daçãos.qtd_volumes) || 1;
        }
        if (daçãos.tipo_embalagem_entrega) {
            wsVendas.getCell('H48').value = daçãos.tipo_embalagem_entrega;
        }
        // Observações de entrega
        if (daçãos.observacoes_entrega) {
            wsVendas.getCell('E51').value = daçãos.observacoes_entrega;
        }
        
        // ===== PLANILHA PRODUÇÃO =====
        // Preencher P.LIQUIDO e LOTE na aba PRODUÇÃO
        // Estrutura conforme ORDEM_COMPLETA_TESTE.xlsx:
        // - Linha do produto: 13, 16, 19, 22... (incrementa de 3 em 3)
        // - Linha de peso/lote: 14, 17, 20, 23... (logo abaixo do produto)
        // Na linha de peso/lote: E = valor P.LIQUIDO, G = valor LOTE
        
        const wsProd = workbook.getWorksheet('PRODUÇÃO');
        if (wsProd) {
            logger.info('[GERAR ORDEM EXCEL] Preenchendo P.LIQUIDO e LOTE na planilha PRODUÇÃO');
            
            // Percorrer produtos e preencher P.LIQUIDO e LOTE
            let indexProd = 0;
            for (const produto of daçãos.produtos.slice(0, 15)) {
                // Linha do produto na PRODUÇÃO: 13, 16, 19, 22... (13 + index * 3)
                const linhaProduto = 13 + (indexProd * 3);
                // Linha de peso/lote: logo abaixo do produto
                const linhaPesoLote = linhaProduto + 1;
                
                // Preencher VALOR do P.LIQUIDO na coluna E (após o label "P.LIQUIDO" em D)
                if (produto.peso_liquido) {
                    wsProd.getCell(`E${linhaPesoLote}`).value = produto.peso_liquido;
                    logger.info(`[GERAR ORDEM EXCEL] E${linhaPesoLote} (P.LIQUIDO) = ${produto.peso_liquido}`);
                }
                
                // Preencher VALOR do LOTE na coluna G (após o label "LOTE" em F)
                if (produto.lote) {
                    wsProd.getCell(`G${linhaPesoLote}`).value = produto.lote;
                    logger.info(`[GERAR ORDEM EXCEL] G${linhaPesoLote} (LOTE) = ${produto.lote}`);
                }
                
                indexProd++;
            }
            
            logger.info('[GERAR ORDEM EXCEL] Planilha PRODUÇÃO atualizada com P.LIQUIDO e LOTE');
        }
        
        // GERAR ARQUIVO E ENVIAR
        const buffer = await workbook.xlsx.writeBuffer();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const nomeArquivo = `Ordem_Producao_${numPedido || numOrcamento || 'nova'}_${timestamp}.xlsx`;
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nomeArquivo)}"`);
        res.setHeader('Content-Length', buffer.length);
        
        logger.info('[GERAR ORDEM EXCEL] Arquivo geração com sucesso:', nomeArquivo);
        res.send(buffer);
        
    } catch (error) {
        logger.error('[GERAR ORDEM EXCEL] Erro ao gerar arquivo:', error);
        logger.error('[GERAR ORDEM EXCEL] Stack:', error.stack);
        res.status(500).json({ 
            message: 'Erro ao gerar ordem de produção em Excel', 
            error: process.env.NODE_ENV === 'development'  error.message : undefined 
        });
    }
});

// Endpoint duplicação removido - usando versão completa acima com VENDAS_PCP

// Serve static files (after API routes) so API endpoints are not shaçãowed by static fallback
app.use(express.static(__dirname));

// API JSON 404 handler: make sure any unmatched /api routes return JSON (not HTML)
app.use((req, res, next) => {
    if (req.isApi) {
        return res.status(404).json({ message: 'API endpoint not found' });
    }
    next();
});

// Global error handler: if API request, always return JSON
app.use((err, req, res, next) => {
    logger.error('❌ Erro global capturação:', err.message);
    logger.error('URL:', req.url);
    logger.error('Method:', req.method);
    logger.error('Stack:', err.stack);
    
    if (req.isApi) {
        return res.status(500).json({ 
            message: 'Erro interno no servidor', 
            error: process.env.NODE_ENV === 'development'  err.message : undefined
        });
    }
    res.status(500).send('Erro interno no servidor');
});
