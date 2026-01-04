// server.js - VERSÉO FINAL, ESTÁVEL E COM NOVAS FUNCIONALIDADES
// Load environment variables from .env when present
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server: IOServer } = require('socket.io');
const fs = require('fs');
const os = require('os');
const cookieParser = require('cookie-parser');

// Importar security middleware
const {
    generalLimiter,
    authLimiter,
    apiLimiter,
    sanitizeInput,
    securityHeaders,
    cleanExpiredSessions
} = require('../../security-middleware');
// optional redis (used if REDIS_URL provided)
let Redis = null;
let redisClient = null;
try { Redis = require('ioredis'); } catch (e) { Redis = null; }

const app = express();
// Configuração de portas com fallback
const PORTS_TO_TRY = [3000, 3001, 3002];
let port = process.env.PORT  Number(process.env.PORT) : PORTS_TO_TRY[0];

// Middleware para cookies
app.use(cookieParser());

// Aplicar security middleware
app.use(securityHeaders());
app.use(generalLimiter);
app.use(sanitizeInput);

// Serve static frontend assets (must be before API routes and catch-all)
app.use(express.static(path.join(__dirname, 'public'), { 
    extensions: ['html', 'htm'],
    setHeaders: (res, path) => {
        // Previne cache para arquivos HTML
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// Parse JSON and URL-encoded bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- CONFIGURAÇÕES ---
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-super-dificil-de-adivinhar-@123!';
const DB_CONFIG = {
    host: process.env.DB_HOST || 'interchange.proxy.rlwy.net',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'iiilOZutDOnPCwxgiTKeMuEaIzSwplcu',
    database: process.env.DB_NAME || 'railway',
    port: process.env.DB_PORT  parseInt(process.env.DB_PORT) : 19396,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONN_LIMIT || 10),
    queueLimit: 0
};
// Create DB pool (will attempt connection on start)
let pool = null;
let dbAvailable = false;
try {
    pool = mysql.createPool(DB_CONFIG);
} catch (e) {
    console.warn('mysql.createPool failed', e && e.message  e.message : e);
    pool = null;
}

// Try a quick verification of DB connectivity and set dbAvailable
(async function verifyDb() {
    if (!pool) return;
    try {
        await pool.query('SELECT 1');
        dbAvailable = true;
        console.log('DB connection OK');
        // create audit table if missing early
        await ensureAuditTable().catch(() => {});
    } catch (err) {
        dbAvailable = false;
        console.warn('⚠️ AVISO: Não foi possível conectar ao banco de daçãos.', err && err.message  err.message : err);
    }
})();

// try connect to Redis if REDIS_URL provided
const REDIS_URL = process.env.REDIS_URL || null;
if (Redis && REDIS_URL) {
    try {
        redisClient = new Redis(REDIS_URL);
        redisClient.on('error', (err) => console.warn('Redis error:', err && err.message  err.message : err));
    } catch (e) { redisClient = null; }
}

// --- Simple in-memory cache (TTL) - lightweight fallback when Redis not configured ---
const cacheStore = new Map(); // key -> { ts, ttl, value }
function setCache(key, value, ttlMs = 30 * 1000) {
    try {
        if (redisClient) {
            const payload = JSON.stringify({ v: value });
            const secs = Math.max(1, Math.round(ttlMs / 1000));
            redisClient.set(key, payload, 'EX', secs).catch(() => {});
            return;
        }
        const entry = { ts: Date.now(), ttl: ttlMs, value };
        cacheStore.set(key, entry);
        // schedule removal
        setTimeout(() => { const e = cacheStore.get(key); if (e && e.ts === entry.ts) cacheStore.delete(key); }, ttlMs + 50);
    } catch (e) {}
}
function getCache(key) {
    try {
        if (redisClient) return null; // use async path when Redis in use
        const e = cacheStore.get(key);
        if (!e) return null;
        if (Date.now() - e.ts > e.ttl) { cacheStore.delete(key); return null; }
        return e.value;
    } catch (e) { return null; }
}

async function getCacheAsync(key) {
    try {
        if (redisClient) {
            const raw = await redisClient.get(key);
            if (!raw) return null;
            try { const p = JSON.parse(raw); return p && p.v !== undefined  p.v : p; } catch (e) { return JSON.parse(raw); }
        }
        return getCache(key);
    } catch (e) { return null; }
}
async function delCacheAsync(key) {
    try {
        if (redisClient) return await redisClient.del(key);
        cacheStore.delete(key);
        return 1;
    } catch (e) { return 0; }
}

// --- Audit helper (simple DB-backed audit_logs) ---
async function ensureAuditTable() {
    if (!dbAvailable) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                action VARCHAR(100) NOT NULL,
                resource_type VARCHAR(100) NULL,
                resource_id VARCHAR(100) NULL,
                meta JSON NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
    } catch (e) { console.warn('ensureAuditTable failed', e && e.message  e.message : e); }
}

async function logAudit(userId, action, resourceType = null, resourceId = null, meta = null) {
    try {
        if (!dbAvailable) return;
        await ensureAuditTable();
        await pool.query('INSERT INTO audit_logs (user_id, action, resource_type, resource_id, meta) VALUES (, , , , )', [userId || null, action, resourceType || null, resourceId === undefined || resourceId === null  null : String(resourceId), meta  JSON.stringify(meta) : null]);
    } catch (e) { console.warn('logAudit error', e && e.message  e.message : e); }
}

// --- Background job: compute and cache dashboard aggregates periodically ---
async function computeAndCacheAggregates() {
    try {
        if (!dbAvailable) return;
        const months = 12;
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
        const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;

        const [rows] = await pool.query(
            `SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, COALESCE(SUM(CASE WHEN status = 'faturação' THEN valor ELSE 0 END), 0) AS total
             FROM pedidos
             WHERE created_at >= 
             GROUP BY ym
             ORDER BY ym ASC`,
            [startStr]
        );

        // write/upsert into dashboard_aggregates to make aggregates durable
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS dashboard_aggregates (
                  ym VARCHAR(7) NOT NULL PRIMARY KEY,
                  total DECIMAL(18,2) NOT NULL DEFAULT 0,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
        } catch (e) { /* non-fatal */ }

        const map = new Map();
        for (const r of rows) map.set(r.ym, Number(r.total || 0));
        const labels = [];
        const values = [];
        for (let i = 0; i < months; i++) {
            const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
            const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            labels.push(d.toLocaleString('pt-BR', { month: 'short', year: 'numeric' }));
            const v = map.has(ym)  map.get(ym) : 0;
            values.push(v);
            try { await pool.query('INSERT INTO dashboard_aggregates (ym, total) VALUES (, ) ON DUPLICATE KEY UPDATE total = VALUES(total), created_at = CURRENT_TIMESTAMP', [ym, v]); } catch (e) { /* ignore per-row upsert errors */ }
        }

        setCache('dashboard:monthly', { labels, values }, 60 * 60 * 1000);

        // top vendedores last 30 days
        const periodDays = 30;
        const startTop = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (periodDays - 1));
        const startTopStr = `${startTop.getFullYear()}-${String(startTop.getMonth() + 1).padStart(2, '0')}-${String(startTop.getDate()).padStart(2, '0')}`;
        const [topRows] = await pool.query(
            `SELECT u.id, u.nome, COALESCE(SUM(CASE WHEN p.status = 'faturação' THEN p.valor ELSE 0 END), 0) AS valor
             FROM pedidos p
             JOIN usuarios u ON p.vendedor_id = u.id
             WHERE p.created_at >= 
             GROUP BY u.id, u.nome
             ORDER BY valor DESC
             LIMIT 10`,
            [startTopStr]
        );
        setCache('dashboard:top_vendedores', topRows.map(r => ({ id: r.id, nome: r.nome, valor: Number(r.valor || 0) })), 60 * 60 * 1000);
    } catch (e) {
        console.warn('computeAndCacheAggregates failed', e && e.message  e.message : e);
    }
}

// --- Middleware de autorização Admin ---
const authorizeAdmin = (req, res, next) => {
    if (req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ message: 'Acesso negação. Requer privilégios de administraçãor.' });
};

// --- Funções de sanitização para prevenir XSS e SQL injection ---
function sanitizeString(str) {
    if (!str) return '';
    // Remove caracteres potencialmente perigosos
    return String(str)
        .replace(/[<>]/g, '') // Remove < e >
        .replace(/javascript:/gi, '') // Remove javascript:
        .replace(/on\w+=/gi, '') // Remove handlers inline
        .trim()
        .slice(0, 5000); // Limita tamanho
}

function sanitizeNumber(value, defaultValue = 0) {
    const num = parseFloat(value);
    return isNaN(num)  defaultValue : num;
}

function sanitizeInt(value, defaultValue = 0) {
    const num = parseInt(value, 10);
    return isNaN(num)  defaultValue : num;
}

function sanitizeEmail(email) {
    if (!email) return '';
    const cleaned = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(cleaned)  cleaned : '';
}

function sanitizeCNPJ(cnpj) {
    if (!cnpj) return '';
    return String(cnpj).replace(/\D/g, '').slice(0, 14);
}

function sanitizeBoolean(value) {
    return value === true || value === 'true' || value === '1' || value === 1;
}

// Admin: invalidate cache keys (single key or prefix)
app.post('/api/admin/cache/invalidate', authorizeAdmin, express.json(), async (req, res) => {
    try {
        const { key, prefix } = req.body || {};
        if (!key && !prefix) return res.status(400).json({ message: 'key or prefix required' });
        if (key) {
            await delCacheAsync(key);
            return res.json({ invalidated: [key] });
        }
        const invalidated = [];
        if (redisClient) {
            const stream = redisClient.scanStream({ match: `${prefix}*`, count: 100 });
            for await (const chunk of stream) {
                if (!chunk || chunk.length === 0) continue;
                for (const k of chunk) { await redisClient.del(k); invalidated.push(k); }
            }
        } else {
            for (const k of Array.from(cacheStore.keys())) {
                if (k.startsWith(prefix)) { cacheStore.delete(k); invalidated.push(k); }
            }
        }
        return res.json({ invalidated });
    } catch (e) { return res.status(500).json({ error: 'server_error' }); }
});

// Admin: read audit logs (paged)
app.get('/api/admin/audit-logs', authorizeAdmin, async (req, res) => {
    try {
        if (!dbAvailable) return res.status(503).json({ error: 'db_unavailable' });
        const page = Math.max(1, Number(req.query.page || 1));
        const per = Math.min(200, Math.max(10, Number(req.query.per || 50)));
        const offset = (page - 1) * per;
        await ensureAuditTable();
        const [rows] = await pool.query('SELECT id, user_id, action, resource_type, resource_id, meta, created_at FROM audit_logs ORDER BY created_at DESC LIMIT  OFFSET ', [per, offset]);
        res.json(rows.map(r => ({ id: r.id, user_id: r.user_id, action: r.action, resource_type: r.resource_type, resource_id: r.resource_id, meta: r.meta  JSON.parse(r.meta) : null, created_at: r.created_at })));
    } catch (e) { res.status(500).json({ error: 'server_error' }); }
});

// Admin: trigger recomputation of dashboard aggregates (enqueue job in BullMQ when Redis available)
app.post('/api/admin/compute-aggregates', authorizeAdmin, express.json(), async (req, res) => {
    try {
        // If Redis + bullmq available, enqueue job for worker(s)
        const canQueue = !!(process.env.REDIS_URL || REDIS_URL);
        if (canQueue) {
            let QueueClass = null;
            try { QueueClass = require('bullmq').Queue; } catch (e) { QueueClass = null; }
            if (QueueClass) {
                const connection = { connectionString: process.env.REDIS_URL || REDIS_URL };
                const q = new QueueClass('aggregates', { connection });
                await q.add('compute', { requestedBy: req.user && req.user.id  req.user.id : null }, { removeOnComplete: true, removeOnFail: 100 });
                return res.status(202).json({ enqueued: true });
            }
        }

        // Fallback: run immediately (synchronous)
        if (!dbAvailable) return res.status(503).json({ error: 'db_unavailable' });
        await computeAndCacheAggregates();
        return res.json({ ok: true });
    } catch (e) {
        console.error('compute-aggregates error', e && e.message  e.message : e);
        return res.status(500).json({ error: 'server_error' });
    }
});

// --- ROTA DE LOGIN ---
app.post('/api/login', authLimiter, async (req, res, next) => {
    try {
        // aceita { email, password } ou { username, password }
        const emailOrUsername = (req.body.email || req.body.username || '').toString().trim();
        const password = (req.body.password || '').toString();

        if (!emailOrUsername || !password) {
            return res.status(400).json({ message: 'Email/username e senha são obrigatórios.' });
        }

        const [rows] = await pool.query('SELECT * FROM usuarios WHERE email =  LIMIT 1', [emailOrUsername]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const user = rows[0];
        // suporta colunas antigas (senha) e nova (senha_hash)
        const senhaHash = user.senha_hash || user.senha || '';
        if (!senhaHash) {
            return res.status(500).json({ message: 'Conta sem hash de senha configuração.' });
        }

        const isPasswordCorrect = await bcrypt.compare(password, senhaHash);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const userDataForToken = { id: user.id, nome: user.nome, email: user.email, role: user.role, is_admin: user.is_admin };
        const token = jwt.sign(userDataForToken, JWT_SECRET, { expiresIn: '8h' });

        // retorna chaves simples e compatíveis com frontend
        return res.json({ token, user: userDataForToken });
    } catch (error) {
        next(error);
    }
});

// --- ROTAS DA API DE VENDAS (PROTEGIDAS) ---
const apiVendasRouter = express.Router();
// middleware de autenticação JWT
function authenticateToken(req, res, next) {
    try {
        // Verificar token do header Authorization OU do cookie authToken
        const auth = (req.headers && (req.headers.authorization || req.headers.Authorization)) || (req.query && req.query.token) || null;
        let token = typeof auth === 'string' && auth.startsWith('Bearer ')  auth.split(' ')[1] : auth;
        
        // Se não encontrou no header, tentar pegar do cookie
        if (!token && req.cookies) {
            token = req.cookies.authToken || req.cookies.token;
        }
        
        if (!token) {
            console.log(`🔒 Token ausente - Rota: ${req.method} ${req.path}`);
            return res.status(401).json({ message: 'Token ausente.' });
        }
        let decoded = null;
        try { 
            decoded = jwt.verify(token, JWT_SECRET); 
        } catch (err) { 
            console.log(`🔒 Token inválido - Rota: ${req.method} ${req.path} - Erro: ${err.message}`);
            return res.status(401).json({ message: 'Token inválido.' }); 
        }
        req.user = decoded;
        console.log(`✅ Token validação - Usuário: ${decoded.nome || decoded.email} - Rota: ${req.method} ${req.path}`);
        return next();
    } catch (e) { 
        console.log(`❌ Erro no middleware auth - Rota: ${req.method} ${req.path} - Erro: ${e.message}`);
        return res.status(500).json({ message: 'Erro no servidor.' }); 
    }
}

// ========================================
// ROTAS PÚBLICAS (ANTES DO MIDDLEWARE DE AUTH)
// ========================================

// Lista de admins para verificação de permissões
const ADMINS_EMAILS = ['ti@aluforce.ind.br', 'andreia@aluforce.ind.br', 'douglas@aluforce.ind.br'];
const ADMINS_NOMES = ['antonio egidio', 'andreia', 'douglas'];

function verificarSeAdmin(user) {
    if (!user) return false;
    if (user.is_admin === true || user.is_admin === 1) return true;
    if (user.role && user.role.toString().toLowerCase() === 'admin') return true;
    if (user.email && ADMINS_EMAILS.includes(user.email.toLowerCase())) return true;
    if (user.nome) {
        // Normalizar nome removendo acentos para comparação
        const nomeMin = user.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        for (const adminNome of ADMINS_NOMES) {
            if (nomeMin.includes(adminNome)) return true;
        }
    }
    return false;
}

// Rota para Kanban - COM FILTROS e controle de visibilidade por usuário
apiVendasRouter.get('/kanban/pedidos', async (req, res) => {
    try {
        if (!dbAvailable) {
            return res.json([]);
        }
        
        // Tentar identificar usuário logação (opcional)
        let currentUser = null;
        let isAdmin = false;
        // Buscar token do cookie authToken (usação pelo sistema)
        const token = req.cookies.authToken || req.cookies.token;
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                if (decoded && decoded.id) {
                    const [userRows] = await pool.query('SELECT id, nome, email, role, is_admin FROM usuarios WHERE id = ', [decoded.id]);
                    if (userRows.length > 0) {
                        currentUser = userRows[0];
                        isAdmin = verificarSeAdmin(currentUser);
                        console.log(`👤 Kanban: Usuário ${currentUser.nome} | Admin: ${isAdmin}`);
                    }
                }
            } catch (e) { 
                console.log('⚠️ Token inválido no Kanban:', e.message);
                /* Token inválido, continuar como não-logação */ 
            }
        }
        
        // Capturar parâmetros de filtro
        const { 
            dataInclusao, 
            dataPrevisao, 
            dataFaturamento,
            vendedor,
            projeto,
            exibirCancelaçãos,
            exibirDenegaçãos,
            exibirEncerraçãos
        } = req.query;
        
        // Construir condições WHERE dinâmicas
        let whereConditions = [];
        let queryParams = [];
        
        // FILTRO POR USUÁRIO: Vendedores só veem seus próprios pedidos
        if (currentUser && !isAdmin) {
            whereConditions.push('p.vendedor_id = ');
            queryParams.push(currentUser.id);
            console.log(`👤 Filtrando pedidos do vendedor: ${currentUser.nome} (ID: ${currentUser.id})`);
        }
        
        // Filtro de status base (cancelaçãos, denegaçãos, encerraçãos)
        const statusExcluidos = [];
        if (exibirCancelaçãos !== 'true') statusExcluidos.push('cancelação');
        if (exibirDenegaçãos !== 'true') statusExcluidos.push('denegação');
        if (exibirEncerraçãos !== 'true') statusExcluidos.push('encerração', 'arquivação');
        
        if (statusExcluidos.length > 0) {
            whereConditions.push(`p.status NOT IN (${statusExcluidos.map(() => '').join(',')})`);
            queryParams.push(...statusExcluidos);
        }
        
        // Filtro de vendedor (somente se for admin, pois vendedor já está filtração)
        if (isAdmin && vendedor && vendedor !== 'todos') {
            whereConditions.push('p.vendedor_id = ');
            queryParams.push(vendedor);
        }
        
        // Função auxiliar para calcular datas
        const calcularData = (filtro, tipo = 'passação') => {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            switch (filtro) {
                case 'hoje':
                    return hoje;
                case 'ontem':
                    const ontem = new Date(hoje);
                    ontem.setDate(ontem.getDate() - 1);
                    return ontem;
                case 'amanha':
                    const amanha = new Date(hoje);
                    amanha.setDate(amanha.getDate() + 1);
                    return amanha;
                case 'ultimos-3':
                case 'proximos-3':
                    const d3 = new Date(hoje);
                    d3.setDate(d3.getDate() + (tipo === 'futuro'  3 : -3));
                    return d3;
                case 'ultimos-7':
                case 'proximos-7':
                    const d7 = new Date(hoje);
                    d7.setDate(d7.getDate() + (tipo === 'futuro'  7 : -7));
                    return d7;
                case 'ultimos-15':
                case 'proximos-15':
                    const d15 = new Date(hoje);
                    d15.setDate(d15.getDate() + (tipo === 'futuro'  15 : -15));
                    return d15;
                case 'ultimos-30':
                case 'proximos-30':
                    const d30 = new Date(hoje);
                    d30.setDate(d30.getDate() + (tipo === 'futuro'  30 : -30));
                    return d30;
                case 'ultimos-60':
                case 'proximos-60':
                    const d60 = new Date(hoje);
                    d60.setDate(d60.getDate() + (tipo === 'futuro'  60 : -60));
                    return d60;
                case 'ultimos-90':
                case 'proximos-90':
                    const d90 = new Date(hoje);
                    d90.setDate(d90.getDate() + (tipo === 'futuro'  90 : -90));
                    return d90;
                case 'ultimos-120':
                    const d120 = new Date(hoje);
                    d120.setDate(d120.getDate() - 120);
                    return d120;
                case 'ultimo-ano':
                    const dAno = new Date(hoje);
                    dAno.setFullYear(dAno.getFullYear() - 1);
                    return dAno;
                default:
                    return null;
            }
        };
        
        // Filtro de data de inclusão (created_at)
        if (dataInclusao && dataInclusao !== 'tudo') {
            const dataLimite = calcularData(dataInclusao, 'passação');
            if (dataLimite) {
                if (dataInclusao === 'hoje') {
                    whereConditions.push('DATE(p.created_at) = CURDATE()');
                } else if (dataInclusao === 'ontem') {
                    whereConditions.push('DATE(p.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)');
                } else {
                    whereConditions.push('p.created_at >= ');
                    queryParams.push(dataLimite.toISOString().split('T')[0]);
                }
            }
        }
        
        // Filtro de data de previsão (data_previsao ou data_entrega)
        if (dataPrevisao && dataPrevisao !== 'tudo') {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            if (dataPrevisao.startsWith('proximos-')) {
                const dataLimite = calcularData(dataPrevisao, 'futuro');
                if (dataLimite) {
                    whereConditions.push('(p.data_previsao BETWEEN CURDATE() AND  OR p.data_entrega BETWEEN CURDATE() AND )');
                    const dataStr = dataLimite.toISOString().split('T')[0];
                    queryParams.push(dataStr, dataStr);
                }
            } else if (dataPrevisao === 'amanha') {
                whereConditions.push('(DATE(p.data_previsao) = DATE_ADD(CURDATE(), INTERVAL 1 DAY) OR DATE(p.data_entrega) = DATE_ADD(CURDATE(), INTERVAL 1 DAY))');
            } else if (dataPrevisao === 'hoje') {
                whereConditions.push('(DATE(p.data_previsao) = CURDATE() OR DATE(p.data_entrega) = CURDATE())');
            } else {
                const dataLimite = calcularData(dataPrevisao, 'passação');
                if (dataLimite) {
                    whereConditions.push('(p.data_previsao >=  OR p.data_entrega >= )');
                    const dataStr = dataLimite.toISOString().split('T')[0];
                    queryParams.push(dataStr, dataStr);
                }
            }
        }
        
        // Filtro de data de faturamento (para pedidos faturaçãos)
        if (dataFaturamento && dataFaturamento !== 'tudo') {
            const dataLimite = calcularData(dataFaturamento, 'passação');
            if (dataLimite) {
                whereConditions.push('(p.data_faturamento >=  OR (p.status IN ("faturação", "recibo") AND p.updated_at >= ))');
                const dataStr = dataLimite.toISOString().split('T')[0];
                queryParams.push(dataStr, dataStr);
            }
        }
        
        // Montar query final
        const whereClause = whereConditions.length > 0  'WHERE ' + whereConditions.join(' AND ') : '';
        
        const query = `
            SELECT 
                p.id, 
                p.valor, 
                p.status, 
                p.created_at, 
                p.updated_at,
                p.vendedor_id,
                p.descricao,
                p.prioridade,
                p.frete,
                p.data_previsao,
                p.data_entrega,
                p.data_faturamento,
                COALESCE(c.nome, e.nome_fantasia) AS empresa_nome,
                u.nome AS vendedor_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN empresas e ON p.empresa_id = e.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            ${whereClause}
            ORDER BY p.created_at DESC
            LIMIT 500
        `;
        
        console.log('📋 Kanban Query:', query);
        console.log('📋 Kanban Params:', queryParams);
        
        const [rows] = await pool.query(query, queryParams);
        
        // Buscar itens de todos os pedidos de uma vez (mais eficiente)
        const pedidoIds = rows.map(p => p.id);
        let itensMap = {};
        
        if (pedidoIds.length > 0) {
            const [itensRows] = await pool.query(`
                SELECT 
                    pi.pedido_id,
                    pi.codigo,
                    pi.descricao,
                    pi.quantidade,
                    pi.preco_unitario,
                    p.unidade_medida
                FROM pedido_itens pi
                LEFT JOIN produtos p ON pi.produto_id = p.id
                WHERE pi.pedido_id IN (${pedidoIds.map(() => '').join(',')})
                ORDER BY pi.pedido_id, pi.id
            `, pedidoIds);
            
            // Agrupar itens por pedido
            itensRows.forEach(item => {
                if (!itensMap[item.pedido_id]) {
                    itensMap[item.pedido_id] = [];
                }
                itensMap[item.pedido_id].push({
                    codigo: item.codigo,
                    descricao: item.descricao,
                    quantidade: parseFloat(item.quantidade) || 0,
                    preco_unitario: parseFloat(item.preco_unitario) || 0,
                    unidade: item.unidade_medida || 'UN'
                });
            });
        }
        
        // Formatar para o Kanban
        const pedidosFormataçãos = rows.map(p => ({
            id: p.id,
            numero: `Orçamento Nº ${p.id}`,
            cliente: p.empresa_nome || 'Cliente não informação',
            cliente_nome: p.empresa_nome,
            vendedor_nome: p.vendedor_nome || '',
            vendedor_id: p.vendedor_id,
            status: p.status || 'orcamento',
            valor: parseFloat(p.valor) || 0,
            valor_total: parseFloat(p.valor) || 0,
            tipo: p.prioridade || 'a vista',
            faturamento: p.descricao || 'Aguardando',
            observacoes: p.descricao,
            origem: 'Omie',
            data_criacao: p.created_at,
            created_at: p.created_at,
            data_previsao: p.data_previsao,
            data_entrega: p.data_entrega,
            data_faturamento: p.data_faturamento,
            itens: itensMap[p.id] || []
        }));
        
        console.log(`📋 Kanban: ${pedidosFormataçãos.length} pedidos carregaçãos com filtros`);
        res.json(pedidosFormataçãos);
        
    } catch (err) {
        console.error('Erro ao buscar pedidos para Kanban:', err);
        res.status(500).json({ message: 'Erro ao carregar pedidos', error: err.message });
    }
});

// Rota pública para listar vendedores (para filtros do Kanban)
apiVendasRouter.get('/vendedores', async (req, res) => {
    try {
        if (!dbAvailable) {
            return res.json([]);
        }
        
        // Buscar vendedores comerciais ATIVOS do banco (por role, departamento)
        // Vendedores inativos: Thainá, Ariel, Nicolas, Laís
        const [rows] = await pool.query(`
            SELECT id, nome, email, apelido, avatar, foto
            FROM usuarios 
            WHERE (role = 'comercial' OR departamento = 'Comercial')
              AND (ativo = 1 OR ativo IS NULL)
            ORDER BY nome ASC
        `);
        
        // Se não encontrou no banco, retornar lista fixa com IDs simulaçãos
        if (rows.length === 0) {
            console.log('⚠️ Vendedores não encontraçãos no banco, retornando lista fixa');
            return res.json([
                { id: 1, nome: 'Márcia Scarcella', email: 'marcia@aluforce.com.br' },
                { id: 2, nome: 'Augusto Ladeira', email: 'augusto@aluforce.com.br' },
                { id: 3, nome: 'Renata Nascimento', email: 'renata@aluforce.com.br' },
                { id: 4, nome: 'Fabiano Marques', email: 'fabiano@aluforce.com.br' },
                { id: 5, nome: 'Fabíola Souza', email: 'fabiola@aluforce.com.br' }
            ]);
        }
        
        console.log(`👤 Vendedores comerciais ativos: ${rows.length} encontraçãos`);
        res.json(rows);
        
    } catch (err) {
        console.error('Erro ao buscar vendedores:', err);
        // Fallback para lista fixa em caso de erro
        res.json([
            { id: 62, nome: 'Márcia Scarcella', email: 'marcia@aluforce.com.br' },
            { id: 63, nome: 'Augusto Ladeira', email: 'augusto@aluforce.com.br' },
            { id: 2, nome: 'Renata Nascimento', email: 'renata@aluforce.com.br' },
            { id: 65, nome: 'Fabiano Marques', email: 'fabiano@aluforce.com.br' },
            { id: 72, nome: 'Fabíola Souza', email: 'fabiola@aluforce.com.br' }
        ]);
    }
});

// Rota pública para listar itens de um pedido (Kanban)
apiVendasRouter.get('/pedidos/:id/itens', async (req, res, next) => {
    try {
        const { id } = req.params;
        // Garantir que a tabela existe
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS pedido_itens (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    pedido_id INT NOT NULL,
                    codigo VARCHAR(50),
                    descricao VARCHAR(255) NOT NULL,
                    quantidade DECIMAL(10,2) DEFAULT 1,
                    quantidade_parcial DECIMAL(10,2) DEFAULT 0,
                    unidade VARCHAR(10) DEFAULT 'UN',
                    local_estoque VARCHAR(100) DEFAULT 'Principal',
                    preco_unitario DECIMAL(15,2) DEFAULT 0,
                    desconto DECIMAL(15,2) DEFAULT 0,
                    total DECIMAL(15,2) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
                    INDEX idx_pedido_id (pedido_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
        } catch (e) { /* tabela já existe */ }
        
        const [itens] = await pool.query(
            'SELECT * FROM pedido_itens WHERE pedido_id =  ORDER BY id ASC',
            [id]
        );
        res.json(itens);
    } catch (error) {
        if (error && error.code === 'ER_NO_SUCH_TABLE') return res.json([]);
        next(error);
    }
});

// Rota pública para obter histórico do pedido (Kanban)
apiVendasRouter.get('/pedidos/:id/historico', async (req, res, next) => {
    try {
        const { id } = req.params;
        // Garantir que a tabela existe
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS pedido_historico (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    pedido_id INT NOT NULL,
                    user_id INT,
                    user_name VARCHAR(100),
                    action VARCHAR(50) NOT NULL,
                    descricao TEXT,
                    meta JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_pedido (pedido_id),
                    INDEX idx_action (action)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
        } catch (e) { /* tabela já existe */ }
        
        const [rows] = await pool.query(
            'SELECT * FROM pedido_historico WHERE pedido_id =  ORDER BY created_at DESC',
            [id]
        );
        res.json(rows);
    } catch (error) {
        if (error && error.code === 'ER_NO_SUCH_TABLE') return res.json([]);
        next(error);
    }
});

// Rota pública para adicionar entrada ao histórico (Kanban drag&drop)
apiVendasRouter.post('/pedidos/:id/historico', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { tipo, action, descricao, usuario, meta } = req.body;
        
        // Garantir que a tabela existe
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS pedido_historico (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    pedido_id INT NOT NULL,
                    user_id INT,
                    user_name VARCHAR(100),
                    action VARCHAR(50) NOT NULL,
                    descricao TEXT,
                    meta JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_pedido (pedido_id),
                    INDEX idx_action (action)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
        } catch (e) { /* tabela já existe */ }
        
        await pool.query(
            'INSERT INTO pedido_historico (pedido_id, user_id, user_name, action, descricao, meta) VALUES (, , , , , )',
            [id, null, usuario || 'Sistema', tipo || action || 'status', descricao || '', meta  JSON.stringify(meta) : null]
        );
        
        res.status(201).json({ message: 'Histórico registração com sucesso!' });
    } catch (error) {
        next(error);
    }
});

// ========================================
// MIDDLEWARE DE AUTENTICAÇÃO (APLICADO A ROTAS SUBSEQUENTES)
// ========================================
apiVendasRouter.use(authenticateToken);

// Multer em memória para uploads temporários (limitando tamanho por arquivo e count)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// --- ROTAS DE DASHBOARD ---

// Dashboard Admin: métricas completas e avançadas
apiVendasRouter.get('/dashboard/admin', async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Usuário não autenticação.' });
        }
        const user = req.user;
        const isAdmin = user.is_admin === true || user.is_admin === 1 || (user.role && user.role.toString().toLowerCase() === 'admin');
        if (!isAdmin) return res.status(403).json({ message: 'Acesso negação: apenas administraçãores.' });

        const período = req.query.período || '30'; // dias

        // Métricas gerais
        const [metricsRows] = await pool.query(`
            SELECT 
                COUNT(CASE WHEN status = 'faturação' THEN 1 END) as total_faturação,
                SUM(CASE WHEN status = 'faturação' THEN valor ELSE 0 END) as valor_faturação,
                COUNT(CASE WHEN status = 'orçamento' THEN 1 END) as total_orcamentos,
                SUM(CASE WHEN status = 'orçamento' THEN valor ELSE 0 END) as valor_orcamentos,
                COUNT(CASE WHEN status = 'analise' THEN 1 END) as total_analise,
                SUM(CASE WHEN status = 'analise' THEN valor ELSE 0 END) as valor_analise,
                COUNT(CASE WHEN status = 'cancelação' THEN 1 END) as total_cancelação,
                COUNT(*) as total_pedidos,
                AVG(valor) as ticket_medio
            FROM pedidos
            WHERE created_at >= CURDATE() - INTERVAL  DAY
        `, [parseInt(período)]);

        // Top vendedores (faturamento)
        const [topVendedores] = await pool.query(`
            SELECT 
                u.id, u.nome, u.email,
                COUNT(p.id) as total_vendas,
                SUM(CASE WHEN p.status = 'faturação' THEN p.valor ELSE 0 END) as valor_faturação,
                SUM(p.valor) as valor_total
            FROM usuarios u
            LEFT JOIN pedidos p ON u.id = p.vendedor_id AND p.created_at >= CURDATE() - INTERVAL  DAY
            WHERE u.role = 'vendedor' OR u.is_admin = 0
            GROUP BY u.id, u.nome, u.email
            ORDER BY valor_faturação DESC
            LIMIT 10
        `, [parseInt(período)]);

        // Faturamento mensal (últimos 12 meses)
        const [faturamentoMensal] = await pool.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as mes,
                COUNT(CASE WHEN status = 'faturação' THEN 1 END) as qtd_faturação,
                SUM(CASE WHEN status = 'faturação' THEN valor ELSE 0 END) as valor_faturação
            FROM pedidos
            WHERE created_at >= CURDATE() - INTERVAL 12 MONTH
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY mes ASC
        `);

        // Conversão por status
        const [conversao] = await pool.query(`
            SELECT 
                status,
                COUNT(*) as quantidade,
                SUM(valor) as valor_total
            FROM pedidos
            WHERE created_at >= CURDATE() - INTERVAL  DAY
            GROUP BY status
        `, [parseInt(período)]);

        // Pedidos por empresa (top 10)
        const [topEmpresas] = await pool.query(`
            SELECT 
                e.id, e.nome_fantasia, e.cnpj,
                COUNT(p.id) as total_pedidos,
                SUM(CASE WHEN p.status = 'faturação' THEN p.valor ELSE 0 END) as valor_faturação
            FROM empresas e
            LEFT JOIN pedidos p ON e.id = p.empresa_id AND p.created_at >= CURDATE() - INTERVAL  DAY
            GROUP BY e.id, e.nome_fantasia, e.cnpj
            ORDER BY valor_faturação DESC
            LIMIT 10
        `, [parseInt(período)]);

        // Taxa de conversão
        const totalOrcamentos = metricsRows[0].total_orcamentos || 0;
        const totalFaturação = metricsRows[0].total_faturação || 0;
        const taxaConversao = totalOrcamentos > 0  ((totalFaturação / totalOrcamentos) * 100).toFixed(2) : 0;

        res.json({
            período: parseInt(período),
            metricas: metricsRows[0],
            taxaConversao: parseFloat(taxaConversao),
            topVendedores,
            faturamentoMensal,
            conversaoPorStatus: conversao,
            topEmpresas
        });
    } catch (error) {
        next(error);
    }
});

// Dashboard Vendedor: métricas pessoais
apiVendasRouter.get('/dashboard/vendedor', async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Usuário não autenticação.' });
        }
        const user = req.user;
        const vendedorId = user.id;
        const período = req.query.período || '30'; // dias

        // Métricas pessoais do vendedor
        const [metricsRows] = await pool.query(`
            SELECT 
                COUNT(CASE WHEN status = 'faturação' THEN 1 END) as total_faturação,
                SUM(CASE WHEN status = 'faturação' THEN valor ELSE 0 END) as valor_faturação,
                COUNT(CASE WHEN status = 'orçamento' THEN 1 END) as total_orcamentos,
                SUM(CASE WHEN status = 'orçamento' THEN valor ELSE 0 END) as valor_orcamentos,
                COUNT(CASE WHEN status = 'analise' THEN 1 END) as total_analise,
                COUNT(CASE WHEN status = 'cancelação' THEN 1 END) as total_cancelação,
                COUNT(*) as total_pedidos,
                AVG(valor) as ticket_medio
            FROM pedidos
            WHERE vendedor_id =  AND created_at >= CURDATE() - INTERVAL  DAY
        `, [vendedorId, parseInt(período)]);

        // Pipeline do vendedor (valor por status)
        const [pipeline] = await pool.query(`
            SELECT 
                status,
                COUNT(*) as quantidade,
                SUM(valor) as valor_total
            FROM pedidos
            WHERE vendedor_id =  AND created_at >= CURDATE() - INTERVAL  DAY
            GROUP BY status
        `, [vendedorId, parseInt(período)]);

        // Histórico mensal do vendedor (últimos 6 meses)
        const [históricoMensal] = await pool.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as mes,
                COUNT(CASE WHEN status = 'faturação' THEN 1 END) as qtd_faturação,
                SUM(CASE WHEN status = 'faturação' THEN valor ELSE 0 END) as valor_faturação
            FROM pedidos
            WHERE vendedor_id =  AND created_at >= CURDATE() - INTERVAL 6 MONTH
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY mes ASC
        `, [vendedorId]);

        // Meus clientes (empresas com mais pedidos)
        const [meusClientes] = await pool.query(`
            SELECT 
                e.id, e.nome_fantasia,
                COUNT(p.id) as total_pedidos,
                SUM(CASE WHEN p.status = 'faturação' THEN p.valor ELSE 0 END) as valor_faturação,
                MAX(p.created_at) as último_pedido
            FROM empresas e
            INNER JOIN pedidos p ON e.id = p.empresa_id
            WHERE p.vendedor_id =  AND p.created_at >= CURDATE() - INTERVAL  DAY
            GROUP BY e.id, e.nome_fantasia
            ORDER BY valor_faturação DESC
            LIMIT 10
        `, [vendedorId, parseInt(período)]);

        // Taxa de conversão pessoal
        const totalOrcamentos = metricsRows[0].total_orcamentos || 0;
        const totalFaturação = metricsRows[0].total_faturação || 0;
        const taxaConversao = totalOrcamentos > 0  ((totalFaturação / totalOrcamentos) * 100).toFixed(2) : 0;

        // Meta simulada (pode vir de tabela de metas futuramente)
        const metaMensal = 100000; // R$ 100k como exemplo
        const valorFaturação = metricsRows[0].valor_faturação || 0;
        const percentualMeta = ((valorFaturação / metaMensal) * 100).toFixed(2);

        res.json({
            período: parseInt(período),
            metricas: metricsRows[0],
            taxaConversao: parseFloat(taxaConversao),
            meta: {
                valor: metaMensal,
                atingido: valorFaturação,
                percentual: parseFloat(percentualMeta)
            },
            pipeline,
            históricoMensal,
            meusClientes
        });
    } catch (error) {
        next(error);
    }
});

// Notificações do usuário (pedidos atrasaçãos, follow-ups)
apiVendasRouter.get('/notificacoes', async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Usuário não autenticação.' });
        }
        const user = req.user;
        const isAdmin = user.is_admin === true || user.is_admin === 1 || (user.role && user.role.toString().toLowerCase() === 'admin');
        
        let notificacoes = [];

        // Pedidos em análise há mais de 7 dias
        const [pedidosAtrasaçãos] = await pool.query(`
            SELECT 
                p.id, p.valor, p.status, p.created_at,
                e.nome_fantasia as empresa_nome,
                DATEDIFF(CURDATE(), p.created_at) as dias_espera
            FROM pedidos p
            LEFT JOIN empresas e ON p.empresa_id = e.id
            WHERE p.status = 'analise' 
            AND p.created_at < CURDATE() - INTERVAL 7 DAY
            ${!isAdmin  'AND p.vendedor_id = ' : ''}
            ORDER BY p.created_at ASC
            LIMIT 10
        `, !isAdmin  [user.id] : []);

        notificacoes = notificacoes.concat(pedidosAtrasaçãos.map(p => ({
            tipo: 'pedido_atrasação',
            pedido_id: p.id,
            titulo: `Pedido ${p.id} em análise há ${p.dias_espera} dias`,
            mensagem: `Empresa: ${p.empresa_nome} - Valor: R$ ${parseFloat(p.valor).toFixed(2)}`,
            data: p.created_at,
            prioridade: p.dias_espera > 14  'alta' : 'media'
        })));

        // Orçamentos sem follow-up (mais de 3 dias)
        const [orçamentosSemFollowup] = await pool.query(`
            SELECT 
                p.id, p.valor, p.created_at,
                e.nome_fantasia as empresa_nome,
                DATEDIFF(CURDATE(), p.created_at) as dias_orcamento
            FROM pedidos p
            LEFT JOIN empresas e ON p.empresa_id = e.id
            WHERE p.status = 'orçamento'
            AND p.created_at < CURDATE() - INTERVAL 3 DAY
            ${!isAdmin  'AND p.vendedor_id = ' : ''}
            ORDER BY p.created_at ASC
            LIMIT 10
        `, !isAdmin  [user.id] : []);

        notificacoes = notificacoes.concat(orçamentosSemFollowup.map(p => ({
            tipo: 'follow_up',
            pedido_id: p.id,
            titulo: `Orçamento ${p.id} aguardando follow-up`,
            mensagem: `Empresa: ${p.empresa_nome} - ${p.dias_orcamento} dias sem retorno`,
            data: p.created_at,
            prioridade: 'baixa'
        })));

        res.json({
            total: notificacoes.length,
            notificacoes: notificacoes.sort((a, b) => {
                const prioridades = { alta: 3, media: 2, baixa: 1 };
                return (prioridades[b.prioridade] || 0) - (prioridades[a.prioridade] || 0);
            })
        });
    } catch (error) {
        next(error);
    }
});

// --- ROTAS DE PEDIDOS ---

// **ROTA ATUALIZADA** para unificar filtros avançaçãos e de período.
apiVendasRouter.get('/pedidos/filtro-avancação', async (req, res, next) => {
    try {
        const { q, period, data_inicio, data_fim, empresa_id, vendedor_id, valor_min, valor_max } = req.query;
        
        let queryConditions = [];
        let params = [];

        if (q) {
            const searchTerm = `%${q}%`;
            queryConditions.push("(e.nome_fantasia LIKE  OR p.id LIKE  OR u.nome LIKE )");
            params.push(searchTerm, searchTerm, searchTerm);
        }
        if (period && period !== 'all') {
            queryConditions.push("p.created_at >= CURDATE() - INTERVAL  DAY");
            params.push(parseInt(period));
        }
        if (data_inicio) {
            queryConditions.push("p.created_at >= ");
            params.push(data_inicio);
        }
        if (data_fim) {
            queryConditions.push("p.created_at <= ");
            params.push(data_fim);
        }
        if (empresa_id) {
            queryConditions.push("p.empresa_id = ");
            params.push(empresa_id);
        }
        if (vendedor_id) {
            queryConditions.push("p.vendedor_id = ");
            params.push(vendedor_id);
        }
        if (valor_min) {
            queryConditions.push("p.valor >= ");
            params.push(valor_min);
        }
        if (valor_max) {
            queryConditions.push("p.valor <= ");
            params.push(valor_max);
        }

        // se usuário não é admin, restringe resultaçãos aos pedidos atribuídos a ele ou sem vendedor
        const user = req.user || {};
        const isAdmin = user.is_admin === true || user.is_admin === 1 || (user.role && user.role.toString().toLowerCase() === 'admin');
        if (!isAdmin) {
            queryConditions.push('(p.vendedor_id IS NULL OR p.vendedor_id = )');
            params.push(user.id);
        }

        const whereClause = queryConditions.length > 0  `WHERE ${queryConditions.join(' AND ')}` : '';

        const [rows] = await pool.query(`
            SELECT 
                p.id, p.valor, p.status, p.created_at, p.vendedor_id,
                e.nome_fantasia AS empresa_nome,
                u.nome AS vendedor_nome
            FROM pedidos p
            LEFT JOIN empresas e ON p.empresa_id = e.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            ${whereClause}
            ORDER BY p.id DESC
        `, params);
        
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

// Lista de pedidos (paginada) - usada pelo frontend para preencher tabelas/kanban
apiVendasRouter.get('/pedidos', async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page || '1'), 1);
        const limit = Math.max(parseInt(req.query.limit || '50'), 1);
        const offset = (page - 1) * limit;

        const period = req.query.period || null;
        const vendedor_id = req.query.vendedor_id || null;
        const data_inicio = req.query.data_inicio || null;
        const data_fim = req.query.data_fim || null;
        const status = req.query.status || null; // Filtro por status (novo, em_negociacao, faturação, entregue, perdido)

        // Identificar usuário logação (igual ao Kanban - lê do cookie)
        let currentUser = null;
        let isAdmin = false;
        const token = req.cookies.authToken || req.cookies.token || 
                      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') 
                           req.headers.authorization.split(' ')[1] : null);
        
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                if (decoded && decoded.id) {
                    const [userRows] = await pool.query('SELECT id, nome, email, role, is_admin FROM usuarios WHERE id = ', [decoded.id]);
                    if (userRows.length > 0) {
                        currentUser = userRows[0];
                        isAdmin = verificarSeAdmin(currentUser);
                        console.log(`👤 Pedidos: Usuário ${currentUser.nome} | Admin: ${isAdmin}`);
                    }
                }
            } catch (e) { 
                console.log('⚠️ Token inválido em /pedidos:', e.message);
            }
        }
        
        // Fallback para req.user se middleware já preencheu
        if (!currentUser && req.user) {
            currentUser = req.user;
            isAdmin = verificarSeAdmin(currentUser);
        }

        let where = [];
        let params = [];

        // FILTRO POR USUÁRIO: Vendedores só veem seus próprios pedidos (igual ao Kanban)
        if (currentUser && !isAdmin) {
            where.push('p.vendedor_id = ');
            params.push(currentUser.id);
            console.log(`👤 Filtrando pedidos do vendedor: ${currentUser.nome} (ID: ${currentUser.id})`);
        }

        if (period && period !== 'all') {
            where.push('p.created_at >= CURDATE() - INTERVAL  DAY');
            params.push(parseInt(period));
        }
        if (vendedor_id && isAdmin) {
            where.push('p.vendedor_id = ');
            params.push(vendedor_id);
        }
        
        // Filtro por data de início e fim
        if (data_inicio) {
            where.push('DATE(p.created_at) >= ');
            params.push(data_inicio);
        }
        if (data_fim) {
            where.push('DATE(p.created_at) <= ');
            params.push(data_fim);
        }
        
        // Filtro por status (novo, em_negociacao, faturação, entregue, perdido)
        if (status) {
            where.push('p.status = ');
            params.push(status);
        }

        const whereClause = where.length  `WHERE ${where.join(' AND ')}` : '';

        const [rows] = await pool.query(`
            SELECT p.id, p.valor, p.valor as valor_total, p.status, p.created_at, p.created_at as data_pedido, 
                   p.vendedor_id, p.empresa_id, p.cliente_id, p.descricao, p.observacao, p.frete, p.prioridade,
                   p.data_previsao, p.data_entrega, p.data_faturamento,
                   COALESCE(c.nome, e.nome_fantasia, e.razao_social, 'Cliente não informação') AS cliente_nome,
                   e.nome_fantasia AS empresa_nome,
                   u.nome AS vendedor_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN empresas e ON p.empresa_id = e.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            ${whereClause}
            ORDER BY p.id DESC
            LIMIT  OFFSET 
        `, [...params, limit, offset]);

        res.json(rows);
    } catch (error) {
        next(error);
    }
});

apiVendasRouter.get('/pedidos/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM pedidos WHERE id = ', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Pedido não encontração." });
        }
        // Restrição de visualização: usuários não-admin não podem ver pedidos de outro vendedor
        const pedido = rows[0];
        const user = req.user || {};
        const isAdmin = user.is_admin === true || user.is_admin === 1 || (user.role && user.role.toString().toLowerCase() === 'admin');
        if (!isAdmin && pedido.vendedor_id != null && Number(pedido.vendedor_id) !== Number(user.id)) {
            return res.status(403).json({ message: 'Acesso negação: você não tem permissão para visualizar este pedido.' });
        }
        res.json(pedido);
    } catch (error) {
        next(error);
    }
});

// Cria pedido: atribui automaticamente ao usuário logação
apiVendasRouter.post('/pedidos', upload.array('anexos', 8), async (req, res, next) => {
    try {
        // Suporte a JSON e multipart
        const empresa_id = req.body.empresa_id || req.body.empresaId || null;
        const cliente_nome = req.body.cliente_nome || req.body.clienteNome || null;
        const valor = req.body.valor  parseFloat(req.body.valor) : 0;
        const descrição = req.body.descrição || req.body.descricao || null;
        const frete = req.body.frete  parseFloat(req.body.frete) : 0.00;
        const redespacho = req.body.redespacho === '1' || req.body.redespacho === true || req.body.redespacho === 'true';
        const observacao = req.body.observacao || req.body.observacoes || null;
        const status = req.body.status || 'orcamento';
        const condicao_pagamento = req.body.condicao_pagamento || 'À Vista';
        const cenario_fiscal = req.body.cenario_fiscal || null;
        const previsao_faturamento = req.body.previsao_faturamento || null;
        const departamento = req.body.departamento || null;
        const itens = req.body.itens || [];
        
        // Vendedor: usa o informação ou o usuário logação
        const vendedor_id = req.body.vendedor_id || req.body.vendedorId || (req.user  req.user.id : null);
        
        // Validação flexível - aceita empresa_id OU cliente_nome
        if (!empresa_id && !cliente_nome) {
            return res.status(400).json({ message: 'Informe a empresa ou o nome do cliente.' });
        }
        
        // Se não tiver empresa_id mas tiver cliente_nome, buscar ou criar empresa
        let empresaFinalId = empresa_id;
        if (!empresaFinalId && cliente_nome) {
            // Tentar buscar empresa pelo nome
            const [existingEmp] = await pool.query(
                'SELECT id FROM empresas WHERE nome_fantasia =  OR razao_social =  LIMIT 1',
                [cliente_nome, cliente_nome]
            );
            if (existingEmp.length > 0) {
                empresaFinalId = existingEmp[0].id;
            } else {
                // Criar empresa automaticamente
                const [newEmp] = await pool.query(
                    'INSERT INTO empresas (nome_fantasia, razao_social) VALUES (, )',
                    [cliente_nome, cliente_nome]
                );
                empresaFinalId = newEmp.insertId;
            }
        }
        
        // Inserir pedido
        const [result] = await pool.query(
            `INSERT INTO pedidos (empresa_id, vendedor_id, valor, descricao, frete, redespacho, observacao, status, condicao_pagamento, cenario_fiscal, data_previsao, departamento) 
             VALUES (, , , , , , , , , , , )`,
            [empresaFinalId, vendedor_id, valor, descrição, frete || 0.00, redespacho || false, observacao, status, condicao_pagamento, cenario_fiscal, previsao_faturamento, departamento]
        );

        const insertedId = result.insertId;
        
        // Salvar itens do pedido
        if (Array.isArray(itens) && itens.length > 0) {
            await ensurePedidoItensTable();
            for (const item of itens) {
                const total = (parseFloat(item.quantidade) || 1) * (parseFloat(item.preco_unitario) || 0);
                await pool.query(
                    `INSERT INTO pedido_itens (pedido_id, codigo, descricao, quantidade, unidade, local_estoque, preco_unitario, total) 
                     VALUES (, , , , , , , )`,
                    [
                        insertedId,
                        item.codigo || '',
                        item.descricao || '',
                        parseFloat(item.quantidade) || 1,
                        item.unidade || 'UN',
                        item.local_estoque || 'PADRÃO',
                        parseFloat(item.preco_unitario) || 0,
                        total
                    ]
                );
            }
            console.log(`📦 ${itens.length} itens salvos para o pedido ${insertedId}`);
        }
        
        // Se foram enviaçãos arquivos via multipart (req.files), salvá-los
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            const anexosFromFiles = req.files.map(f => ({ name: f.originalname, type: f.mimetype, size: f.size, buffer: f.buffer }));
            await saveAnexos(insertedId, anexosFromFiles);
        } else if (req.body && Array.isArray(req.body.anexos) && req.body.anexos.length > 0) {
            await saveAnexos(insertedId, req.body.anexos);
        }
        
        // Atualizar última movimentação da empresa (para sistema de inativação automática)
        if (empresaFinalId) {
            await pool.query(
                'UPDATE empresas SET ultima_movimentacao = NOW(), status_cliente =  WHERE id = ',
                ['ativo', empresaFinalId]
            );
        }

        console.log(`✅ Pedido ${insertedId} criação por vendedor ${vendedor_id}`);
        
        // Criar notificação de novo pedido
        if (global.createNotification) {
            const valorFormatação = (parseFloat(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            global.createNotification(
                'order',
                'Novo Pedido Recebido',
                `${cliente_nome || 'Cliente'} fez um pedido de ${valorFormatação}`,
                { pedido_id: insertedId, cliente: cliente_nome, valor: valor }
            );
        }
        
        res.status(201).json({ message: 'Pedido criação com sucesso!', id: insertedId, insertId: insertedId });
    } catch (error) {
        console.error('Erro ao criar pedido:', error);
        next(error);
    }
});

// Atualiza pedido: admin pode alterar vendedor_id; vendedores só podem editar seus pedidos
apiVendasRouter.put('/pedidos/:id', upload.array('anexos', 8), async (req, res, next) => {
    try {
    const { id } = req.params;
    // parse básico para multipart compat
    const empresa_id = req.body.empresa_id || req.body.empresaId;
    const valor = req.body.valor  parseFloat(req.body.valor) : null;
    const descrição = req.body.descrição;
    const frete = req.body.frete  parseFloat(req.body.frete) : 0.00;
    const redespacho = req.body.redespacho === '1' || req.body.redespacho === true || req.body.redespacho === 'true';
    const observacao = req.body.observacao;
    const vendedor_id = req.body.vendedor_id || req.body.vendedorId;
        if (!empresa_id || !valor) {
            return res.status(400).json({ message: 'Empresa e valor são obrigatórios.' });
        }

        const [existingRows] = await pool.query('SELECT vendedor_id FROM pedidos WHERE id = ', [id]);
        if (existingRows.length === 0) return res.status(404).json({ message: 'Pedido não encontração.' });
        const existing = existingRows[0];
        const user = req.user || {};
        const isAdmin = user.is_admin === true || user.is_admin === 1 || (user.role && user.role.toString().toLowerCase() === 'admin');
        if (!isAdmin && Number(existing.vendedor_id) !== Number(user.id)) {
            return res.status(403).json({ message: 'Acesso negação: somente o vendedor responsável ou admin podem editar este pedido.' });
        }

        const vendedorParaAtualizar = isAdmin && vendedor_id  vendedor_id : existing.vendedor_id;

        const [result] = await pool.query(
            `UPDATE pedidos SET empresa_id = , valor = , descrição = , frete = , redespacho = , observacao = , vendedor_id =  WHERE id = `,
            [empresa_id, valor, descrição || null, frete || 0.00, redespacho || false, observacao || null, vendedorParaAtualizar, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Pedido não encontração.' });
        }
        // Se foram enviaçãos arquivos via multipart (req.files), salvá-los
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            const anexosFromFiles = req.files.map(f => ({ name: f.originalname, type: f.mimetype, size: f.size, buffer: f.buffer }));
            await saveAnexos(id, anexosFromFiles);
        } else if (req.body && Array.isArray(req.body.anexos) && req.body.anexos.length > 0) {
            await saveAnexos(id, req.body.anexos);
        }

        res.json({ message: 'Pedido atualização com sucesso.' });
    } catch (error) {
        next(error);
    }
});

// Helper: cria tabela de anexos se não existir e salva anexos base64 (conteudo) como BLOB
async function saveAnexos(pedidoId, anexosArray) {
    // cria tabela se necessário
    await pool.query(`
        CREATE TABLE IF NOT EXISTS pedido_anexos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pedido_id INT NOT NULL,
            nome VARCHAR(255),
            tipo VARCHAR(100),
            tamanho BIGINT,
            conteudo LONGBLOB,
            criação_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    for (const a of anexosArray) {
        try {
            let buffer = null;
            if (!a) continue;
            if (a.buffer) {
                buffer = Buffer.isBuffer(a.buffer)  a.buffer : Buffer.from(a.buffer);
            } else if (a.content) {
                buffer = Buffer.from(a.content, 'base64');
            } else if (a.base64) {
                buffer = Buffer.from(a.base64, 'base64');
            }
            if (!buffer) continue;
            const tamanho = a.size || buffer.length;
            await pool.query('INSERT INTO pedido_anexos (pedido_id, nome, tipo, tamanho, conteudo) VALUES (, , , , )', [pedidoId, a.name || null, a.type || null, tamanho, buffer]);
        } catch (err) {
            console.error('Falha ao salvar anexo:', err && err.message  err.message : err);
        }
    }
}

// --- ROTAS DE ANEXOS DE PEDIDOS ---
// Lista metadaçãos dos anexos de um pedido
apiVendasRouter.get('/pedidos/:id/anexos', async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user || {};
        // Busca pedido para checar permissões
        const [pedidoRows] = await pool.query('SELECT id, vendedor_id FROM pedidos WHERE id = ', [id]);
        if (!pedidoRows || pedidoRows.length === 0) return res.status(404).json({ message: 'Pedido não encontração.' });
        const pedido = pedidoRows[0];
        const isAdmin = user.is_admin === true || user.is_admin === 1 || (user.role && user.role.toString().toLowerCase() === 'admin');
        if (!isAdmin && Number(pedido.vendedor_id) !== Number(user.id)) {
            return res.status(403).json({ message: 'Acesso negação: somente o vendedor responsável ou admin podem listar anexos.' });
        }

        // Se a tabela não existir, retorna lista vazia
        try {
            const [rows] = await pool.query('SELECT id, nome, tipo, tamanho, criação_em FROM pedido_anexos WHERE pedido_id =  ORDER BY criação_em DESC', [id]);
            return res.json(rows || []);
        } catch (err) {
            if (err && err.code === 'ER_NO_SUCH_TABLE') return res.json([]);
            throw err;
        }
    } catch (error) {
        next(error);
    }
});

// Faz download/stream de um anexo específico
apiVendasRouter.get('/pedidos/:id/anexos/:anexoId', async (req, res, next) => {
    try {
        const { id, anexoId } = req.params;
        const user = req.user || {};

        // Busca anexo junto com info do pedido para autorização
        const [rows] = await pool.query(
            `SELECT pa.id, pa.nome, pa.tipo, pa.tamanho, pa.conteudo, p.vendedor_id
             FROM pedido_anexos pa
             JOIN pedidos p ON p.id = pa.pedido_id
             WHERE pa.id =  AND pa.pedido_id =  LIMIT 1`,
            [anexoId, id]
        );

        if (!rows || rows.length === 0) return res.status(404).json({ message: 'Anexo não encontração.' });
        const anexo = rows[0];
        const isAdmin = user.is_admin === true || user.is_admin === 1 || (user.role && user.role.toString().toLowerCase() === 'admin');
        if (!isAdmin && Number(anexo.vendedor_id) !== Number(user.id)) {
            return res.status(403).json({ message: 'Acesso negação: somente o vendedor responsável ou admin podem baixar este anexo.' });
        }

        const buffer = anexo.conteudo; // Buffer vindo do MySQL
        const contentType = anexo.tipo || 'application/octet-stream';
        const filename = anexo.nome || `anexo-${anexo.id}`;

    res.setHeader('Content-Type', contentType);
    // Use buffer.length (bytes) for content length
    res.setHeader('Content-Length', buffer  buffer.length : 0);
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
    return res.send(buffer);
    } catch (error) {
        // Se a tabela não existir, responde 404
        if (error && error.code === 'ER_NO_SUCH_TABLE') return res.status(404).json({ message: 'Nenhum anexo encontração.' });
        next(error);
    }
});

// Deleta um anexo (apenas admin ou vendedor responsável)
apiVendasRouter.delete('/pedidos/:id/anexos/:anexoId', async (req, res, next) => {
    try {
        const { id, anexoId } = req.params;
        const user = req.user || {};

        // Verifica se o anexo existe e obtém vendedor do pedido
        const [rows] = await pool.query(
            `SELECT pa.id, p.vendedor_id FROM pedido_anexos pa JOIN pedidos p ON p.id = pa.pedido_id WHERE pa.id =  AND pa.pedido_id =  LIMIT 1`,
            [anexoId, id]
        );
        if (!rows || rows.length === 0) return res.status(404).json({ message: 'Anexo não encontração.' });
        const anexo = rows[0];
        const isAdmin = user.is_admin === true || user.is_admin === 1 || (user.role && user.role.toString().toLowerCase() === 'admin');
        if (!isAdmin && Number(anexo.vendedor_id) !== Number(user.id)) {
            return res.status(403).json({ message: 'Acesso negação: somente o vendedor responsável ou admin podem deletar este anexo.' });
        }

        const [result] = await pool.query('DELETE FROM pedido_anexos WHERE id = ', [anexoId]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Anexo não encontração.' });
        res.status(204).send();
    } catch (error) {
        if (error && error.code === 'ER_NO_SUCH_TABLE') return res.status(404).json({ message: 'Nenhum anexo encontração.' });
        next(error);
    }
});

// Deleta pedido: apenas admin ou vendedor atribuído
apiVendasRouter.delete('/pedidos/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT vendedor_id FROM pedidos WHERE id = ', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Pedido não encontração.' });
        const pedido = rows[0];
        const user = req.user || {};
        const isAdmin = user.is_admin === true || user.is_admin === 1 || (user.role && user.role.toString().toLowerCase() === 'admin');
        if (!isAdmin && Number(pedido.vendedor_id) !== Number(user.id)) {
            return res.status(403).json({ message: 'Acesso negação: somente o vendedor responsável ou admin podem excluir este pedido.' });
        }

        const [result] = await pool.query('DELETE FROM pedidos WHERE id = ', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: "Pedido não encontração." });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

apiVendasRouter.put('/pedidos/:id/status', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        // Status aceitos pelo kanban e pelo sistema
        const validStatuses = [
            'orcamento', 'orçamento', 
            'analise', 'analise-credito', 
            'aprovação', 'pedido-aprovação', 
            'faturar',
            'faturação', 
            'entregue', 
            'cancelação',
            'recibo'
        ];
        if (!status || !validStatuses.includes(status)) {
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
        
        console.log(`🔐 Verificação de permissão - Usuário: ${user.nome || user.email} | Admin: ${isAdmin} | Status desejação: ${status}`);
        
        // Vendedores (não-admin) só podem mover até "analise"
        if (!isAdmin) {
            // Verificar se é dono do pedido
            const [pedidoRows] = await pool.query('SELECT vendedor_id FROM pedidos WHERE id = ', [id]);
            if (pedidoRows.length > 0) {
                const pedido = pedidoRows[0];
                if (pedido.vendedor_id && user.id && pedido.vendedor_id !== user.id) {
                    return res.status(403).json({ message: 'Você só pode mover seus próprios pedidos.' });
                }
            }
            
            // Vendedor só pode definir status até "analise"
            const allowedForVendedor = ['orcamento', 'orçamento', 'analise', 'analise-credito'];
            if (!allowedForVendedor.includes(status)) {
                return res.status(403).json({ message: 'Apenas administraçãores podem mover pedidos após "Análise de Crédito".' });
            }
        }

        const [result] = await pool.query('UPDATE pedidos SET status =  WHERE id = ', [status, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Pedido não encontração." });
        }
        res.json({ message: 'Status atualização com sucesso.' });
    } catch (error) {
        next(error);
    }
});

// PATCH /api/vendas/pedidos/:id - Atualização parcial do pedido (para o Kanban)
apiVendasRouter.patch('/pedidos/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        console.log(`📝 PATCH /pedidos/${id} - Daçãos recebidos:`, updates);
        
        // Verificar se pedido existe
        const [existingRows] = await pool.query('SELECT * FROM pedidos WHERE id = ', [id]);
        if (existingRows.length === 0) {
            return res.status(404).json({ message: 'Pedido não encontração.' });
        }
        
        const existing = existingRows[0];
        const user = req.user || {};
        const isAdmin = user.is_admin === true || user.is_admin === 1 || (user.role && user.role.toString().toLowerCase() === 'admin');
        
        // Verificar permissão
        if (!isAdmin && existing.vendedor_id && Number(existing.vendedor_id) !== Number(user.id)) {
            return res.status(403).json({ message: 'Acesso negação: somente o vendedor responsável ou admin podem editar este pedido.' });
        }
        
        // Construir query de atualização dinâmica
        // Colunas que existem na tabela pedidos: vendedor_id, observacao, status, valor, frete, descricao, prioridade
        const fieldsToUpdate = [];
        const values = [];
        
        // Atualizar vendedor_id se vendedor_nome foi fornecido
        if (updates.vendedor_nome !== undefined && updates.vendedor_nome !== '') {
            // Buscar vendedor_id pelo nome
            const [vendedorRows] = await pool.query(
                'SELECT id, nome FROM usuarios WHERE nome LIKE  OR apelido LIKE  LIMIT 1', 
                [`%${updates.vendedor_nome}%`, `%${updates.vendedor_nome}%`]
            );
            if (vendedorRows.length > 0) {
                fieldsToUpdate.push('vendedor_id = ');
                values.push(vendedorRows[0].id);
                console.log(`✅ Vendedor encontração: "${updates.vendedor_nome}" -> ID ${vendedorRows[0].id} (${vendedorRows[0].nome})`);
            } else {
                console.log(`⚠️ Vendedor não encontração: "${updates.vendedor_nome}"`);
            }
        }
        
        // Observação existe na tabela
        if (updates.observacao !== undefined) {
            fieldsToUpdate.push('observacao = ');
            values.push(updates.observacao);
        }
        
        // Status existe na tabela
        if (updates.status !== undefined) {
            fieldsToUpdate.push('status = ');
            values.push(updates.status);
        }
        
        // Valor existe na tabela
        if (updates.valor !== undefined) {
            fieldsToUpdate.push('valor = ');
            values.push(updates.valor);
        }
        
        // Frete existe na tabela
        if (updates.frete !== undefined) {
            fieldsToUpdate.push('frete = ');
            values.push(updates.frete);
        }
        
        // Descrição existe na tabela
        if (updates.descricao !== undefined) {
            fieldsToUpdate.push('descricao = ');
            values.push(updates.descricao);
        }
        
        // Prioridade existe na tabela
        if (updates.prioridade !== undefined) {
            fieldsToUpdate.push('prioridade = ');
            values.push(updates.prioridade);
        }
        
        // Cliente_id existe na tabela
        if (updates.cliente_id !== undefined) {
            fieldsToUpdate.push('cliente_id = ');
            values.push(updates.cliente_id || null);
            console.log(`✅ Cliente_id atualização para: ${updates.cliente_id}`);
        }
        
        // Empresa_id existe na tabela
        if (updates.empresa_id !== undefined) {
            fieldsToUpdate.push('empresa_id = ');
            values.push(updates.empresa_id || null);
            console.log(`✅ Empresa_id atualização para: ${updates.empresa_id}`);
        }
        
        // parcelas, transportaçãora, nf NÃO existem na tabela - armazenar em observacao ou JSON se necessário
        // Por ora, vamos ignorar essas colunas que não existem
        if (updates.parcelas || updates.transportaçãora || updates.nf) {
            console.log(`⚠️ Campos parcelas/transportaçãora/nf recebidos mas não existem na tabela - salvando em observacao`);
            const extraInfo = [];
            if (updates.parcelas) extraInfo.push(`Parcelas: ${updates.parcelas}`);
            if (updates.transportaçãora) extraInfo.push(`Transportaçãora: ${updates.transportaçãora}`);
            if (updates.nf) extraInfo.push(`NF: ${updates.nf}`);
            
            if (extraInfo.length > 0 && !updates.observacao) {
                // Adicionar aos daçãos existentes da observação
                const obsAtual = existing.observacao || '';
                const novaObs = obsAtual + (obsAtual  '\n---\n' : '') + extraInfo.join(' | ');
                fieldsToUpdate.push('observacao = ');
                values.push(novaObs);
            }
        }
        
        // Se não há campos para atualizar
        if (fieldsToUpdate.length === 0) {
            console.log(`⚠️ Nenhum campo válido para atualizar`);
            return res.status(400).json({ message: 'Nenhum campo válido para atualizar.' });
        }
        
        values.push(id);
        
        const query = `UPDATE pedidos SET ${fieldsToUpdate.join(', ')} WHERE id = `;
        console.log(`📝 Query: ${query}`);
        console.log(`📝 Values:`, values);
        
        const [result] = await pool.query(query, values);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Pedido não encontração.' });
        }
        
        console.log(`✅ Pedido ${id} atualização com sucesso! (${result.affectedRows} linha(s) afetada(s))`);
        
        // Buscar pedido atualização para retornar
        const [updatedRows] = await pool.query(`
            SELECT p.*, 
                   c.nome as cliente_nome,
                   u.nome as vendedor_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            WHERE p.id = 
        `, [id]);
        
        res.json({ 
            message: 'Pedido atualização com sucesso.',
            pedido: updatedRows[0] || null
        });
    } catch (error) {
        console.error('❌ Erro ao atualizar pedido (PATCH):', error);
        next(error);
    }
});

// --- ROTAS DE ITENS DO PEDIDO ---
// Helper: criar tabela de itens se não existir
async function ensurePedidoItensTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS pedido_itens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pedido_id INT NOT NULL,
            codigo VARCHAR(100),
            descricao TEXT,
            quantidade DECIMAL(15,3) DEFAULT 1,
            quantidade_parcial DECIMAL(15,3) DEFAULT 0,
            unidade VARCHAR(20) DEFAULT 'UN',
            local_estoque VARCHAR(255) DEFAULT 'PADRAO - Local de Estoque Padrão',
            preco_unitario DECIMAL(18,2) DEFAULT 0,
            desconto DECIMAL(18,2) DEFAULT 0,
            total DECIMAL(18,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
            INDEX idx_pedido_id (pedido_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
}

// Listar itens de um pedido
apiVendasRouter.get('/pedidos/:id/itens', async (req, res, next) => {
    try {
        await ensurePedidoItensTable();
        const { id } = req.params;
        const [itens] = await pool.query(
            'SELECT * FROM pedido_itens WHERE pedido_id =  ORDER BY id ASC',
            [id]
        );
        res.json(itens);
    } catch (error) {
        if (error && error.code === 'ER_NO_SUCH_TABLE') return res.json([]);
        next(error);
    }
});

// Adicionar item ao pedido
apiVendasRouter.post('/pedidos/:id/itens', async (req, res, next) => {
    try {
        await ensurePedidoItensTable();
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
             VALUES (, , , , , , , , , )`,
            [id, codigo, descricao, qty, qtyParcial, unidade || 'UN', local_estoque || 'PADRAO - Local de Estoque Padrão', preco, desc, total]
        );
        
        // Atualizar valor total do pedido
        await atualizarTotalPedido(id);
        
        await logAudit(req.user.id, 'item_added', 'pedido_itens', result.insertId, { pedido_id: id, codigo });
        
        res.status(201).json({ message: 'Item adicionação com sucesso!', id: result.insertId });
    } catch (error) {
        next(error);
    }
});

// Atualizar item do pedido
apiVendasRouter.put('/pedidos/:pedidoId/itens/:itemId', async (req, res, next) => {
    try {
        await ensurePedidoItensTable();
        const { pedidoId, itemId } = req.params;
        const { codigo, descricao, quantidade, quantidade_parcial, unidade, local_estoque, preco_unitario, desconto } = req.body;
        
        const qty = parseFloat(quantidade) || 1;
        const qtyParcial = parseFloat(quantidade_parcial) || 0;
        const preco = parseFloat(preco_unitario) || 0;
        const desc = parseFloat(desconto) || 0;
        const total = (qty * preco) - desc;
        
        const [result] = await pool.query(
            `UPDATE pedido_itens SET codigo = , descricao = , quantidade = , quantidade_parcial = , unidade = , local_estoque = , preco_unitario = , desconto = , total = 
             WHERE id =  AND pedido_id = `,
            [codigo, descricao, qty, qtyParcial, unidade || 'UN', local_estoque || 'PADRAO - Local de Estoque Padrão', preco, desc, total, itemId, pedidoId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Item não encontração.' });
        }
        
        // Atualizar valor total do pedido
        await atualizarTotalPedido(pedidoId);
        
        await logAudit(req.user.id, 'item_updated', 'pedido_itens', itemId, { pedido_id: pedidoId, codigo });
        
        res.json({ message: 'Item atualização com sucesso!' });
    } catch (error) {
        next(error);
    }
});

// Buscar item específico do pedido (GET)
apiVendasRouter.get('/pedidos/:pedidoId/itens/:itemId', async (req, res, next) => {
    try {
        await ensurePedidoItensTable();
        const { pedidoId, itemId } = req.params;
        
        const [rows] = await pool.query(
            'SELECT * FROM pedido_itens WHERE id =  AND pedido_id = ',
            [itemId, pedidoId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Item não encontração.' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
});

// Excluir item do pedido
apiVendasRouter.delete('/pedidos/:pedidoId/itens/:itemId', async (req, res, next) => {
    try {
        await ensurePedidoItensTable();
        const { pedidoId, itemId } = req.params;
        
        const [result] = await pool.query(
            'DELETE FROM pedido_itens WHERE id =  AND pedido_id = ',
            [itemId, pedidoId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Item não encontração.' });
        }
        
        // Atualizar valor total do pedido
        await atualizarTotalPedido(pedidoId);
        
        await logAudit(req.user.id, 'item_deleted', 'pedido_itens', itemId, { pedido_id: pedidoId });
        
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// Helper: atualizar valor total do pedido baseação nos itens
async function atualizarTotalPedido(pedidoId) {
    try {
        const [rows] = await pool.query(
            'SELECT COALESCE(SUM(total), 0) AS total FROM pedido_itens WHERE pedido_id = ',
            [pedidoId]
        );
        const novoTotal = rows[0].total || 0;
        await pool.query('UPDATE pedidos SET valor =  WHERE id = ', [novoTotal, pedidoId]);
    } catch (e) {
        console.warn('Erro ao atualizar total do pedido:', e.message);
    }
}

// --- ROTAS DE HISTÓRICO DO PEDIDO ---
// Helper: criar tabela de histórico específico do pedido
async function ensurePedidoHistoricoTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS pedido_historico (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pedido_id INT NOT NULL,
            user_id INT NULL,
            user_name VARCHAR(255),
            action VARCHAR(100) NOT NULL,
            descricao TEXT,
            meta JSON NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
            INDEX idx_pedido_id (pedido_id),
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
}

// Registrar histórico do pedido
async function registrarHistorico(pedidoId, userId, userName, action, descricao, meta = null) {
    try {
        await ensurePedidoHistoricoTable();
        await pool.query(
            'INSERT INTO pedido_historico (pedido_id, user_id, user_name, action, descricao, meta) VALUES (, , , , , )',
            [pedidoId, userId || null, userName || 'Sistema', action, descricao, meta  JSON.stringify(meta) : null]
        );
    } catch (e) {
        console.warn('Erro ao registrar histórico:', e.message);
    }
}

// Obter histórico do pedido
apiVendasRouter.get('/pedidos/:id/historico', async (req, res, next) => {
    try {
        await ensurePedidoHistoricoTable();
        const { id } = req.params;
        const [rows] = await pool.query(
            'SELECT * FROM pedido_historico WHERE pedido_id =  ORDER BY created_at DESC',
            [id]
        );
        res.json(rows);
    } catch (error) {
        if (error && error.code === 'ER_NO_SUCH_TABLE') return res.json([]);
        next(error);
    }
});

// Adicionar entrada ao histórico manualmente
apiVendasRouter.post('/pedidos/:id/historico', async (req, res, next) => {
    try {
        await ensurePedidoHistoricoTable();
        const { id } = req.params;
        const { action, descricao, meta } = req.body;
        const user = req.user || {};
        
        await pool.query(
            'INSERT INTO pedido_historico (pedido_id, user_id, user_name, action, descricao, meta) VALUES (, , , , , )',
            [id, user.id || null, user.nome || user.name || 'Usuário', action || 'manual', descricao || '', meta  JSON.stringify(meta) : null]
        );
        
        res.status(201).json({ message: 'Histórico registração com sucesso!' });
    } catch (error) {
        next(error);
    }
});

// Faturar pedido e gerar NFe automaticamente
apiVendasRouter.post('/pedidos/:id/faturar', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { gerarNFe = true } = req.body; // Opção para gerar NFe automaticamente
        const user = req.user || {};
        
        // Verificar se pedido existe
        const [pedidoRows] = await pool.query('SELECT * FROM pedidos WHERE id = ', [id]);
        if (pedidoRows.length === 0) {
            return res.status(404).json({ message: 'Pedido não encontração.' });
        }
        
        const pedido = pedidoRows[0];
        
        // Buscar itens do pedido
        const [itensRows] = await pool.query('SELECT * FROM pedido_itens WHERE pedido_id = ', [id]);
        
        // Buscar daçãos do cliente
        const [clienteRows] = await pool.query('SELECT * FROM clientes WHERE id = ', [pedido.cliente_id]);
        const cliente = clienteRows[0] || {};
        
        let novaNf = null;
        let nfeData = null;
        
        // Tentar gerar NFe automaticamente se solicitação
        if (gerarNFe && itensRows.length > 0) {
            try {
                // Preparar daçãos para o módulo NFe
                const nfePayload = {
                    pedido_id: id,
                    cliente: {
                        nome: cliente.nome || pedido.cliente,
                        cpf_cnpj: cliente.cpf_cnpj || cliente.cnpj,
                        email: cliente.email,
                        telefone: cliente.telefone,
                        endereco: cliente.endereco,
                        numero: cliente.numero,
                        complemento: cliente.complemento,
                        bairro: cliente.bairro,
                        cidade: cliente.cidade,
                        uf: cliente.uf,
                        cep: cliente.cep
                    },
                    produtos: itensRows.map(item => ({
                        codigo: item.codigo_produto,
                        descricao: item.descricao || item.produto,
                        ncm: item.ncm || '00000000',
                        quantidade: item.quantidade,
                        valor_unitario: item.valor_unitario,
                        valor_total: (parseFloat(item.quantidade) * parseFloat(item.valor_unitario))
                    })),
                    valor_total: pedido.valor,
                    observacoes: pedido.observacoes || ''
                };
                
                // Fazer requisição para o módulo NFe (porta 3003)
                const axios = require('axios');
                const nfeResponse = await axios.post('http://localhost:3003/api/nfe/gerar', nfePayload, {
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': req.headers.authorization
                    }
                });
                
                if (nfeResponse.data && nfeResponse.data.numero) {
                    novaNf = nfeResponse.data.numero;
                    nfeData = {
                        numero: nfeResponse.data.numero,
                        chave: nfeResponse.data.chave,
                        protocolo: nfeResponse.data.protocolo,
                        danfe_url: nfeResponse.data.danfe_url
                    };
                    
                    console.log(`[VENDAS -> NFe] NFe ${novaNf} gerada automaticamente para pedido ${id}`);
                }
            } catch (nfeError) {
                console.error('[VENDAS -> NFe] Erro ao gerar NFe automaticamente:', nfeError.message);
                // Continua o faturamento mesmo se a NFe falhar
            }
        }
        
        // Se não gerou NFe, usa numeração sequencial tradicional
        if (!novaNf) {
            const [nfRows] = await pool.query('SELECT MAX(CAST(nf_numero AS UNSIGNED)) as ultima_nf FROM pedidos WHERE nf_numero IS NOT NULL');
            const ultimaNf = nfRows[0].ultima_nf || 0;
            novaNf = String(ultimaNf + 1).padStart(8, '0');
        }
        
        // Atualizar pedido
        await pool.query(
            'UPDATE pedidos SET status = , nf_numero = , data_faturamento = NOW(), nfe_chave = , nfe_protocolo =  WHERE id = ',
            ['faturação', novaNf, nfeData.chave || null, nfeData.protocolo || null, id]
        );
        
        // Registrar no histórico
        await registrarHistorico(
            id,
            user.id,
            user.nome || user.name || 'Usuário',
            'faturamento',
            nfeData  `Pedido faturação - NFe ${novaNf} emitida automaticamente` : `Pedido faturação - NF ${novaNf}`,
            { nf_numero: novaNf, valor: pedido.valor, nfe_gerada: !!nfeData }
        );
        
        // Criar notificação de faturamento
        if (global.createNotification) {
            const valorFormatação = (parseFloat(pedido.valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            global.createNotification(
                'payment',
                nfeData  'Pedido Faturação + NFe Gerada' : 'Pedido Faturação',
                `Pedido #${id} - ${nfeData  'NFe' : 'NF'} ${novaNf} - ${valorFormatação}`,
                { pedido_id: id, nf_numero: novaNf, valor: pedido.valor, nfe_data: nfeData }
            );
        }
        
        res.json({ 
            message: nfeData  'Pedido faturação e NFe gerada com sucesso!' : 'Pedido faturação com sucesso!',
            nf_numero: novaNf,
            nfe_gerada: !!nfeData,
            nfe_data: nfeData
        });
    } catch (error) {
        next(error);
    }
});

// --- ROTAS DE EMPRESAS ---
apiVendasRouter.get('/empresas', async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const [rows] = await pool.query('SELECT * FROM empresas ORDER BY nome_fantasia ASC LIMIT  OFFSET ', [parseInt(limit), offset]);
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

apiVendasRouter.get('/empresas/search', async (req, res, next) => {
    try {
        const q = req.query.q || '';
        const query = `%${q}%`;
        const [rows] = await pool.query(
            `SELECT id, nome_fantasia, cnpj FROM empresas 
             WHERE nome_fantasia LIKE  OR razao_social LIKE  OR cnpj LIKE 
             ORDER BY nome_fantasia LIMIT 10`,
            [query, query, query]
        );
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

apiVendasRouter.get('/empresas/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM empresas WHERE id = ', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Empresa não encontrada.' });
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
});

apiVendasRouter.get('/empresas/:id/details', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [empresaResult, kpisResult, pedidosResult, clientesResult] = await Promise.all([
            pool.query('SELECT * FROM empresas WHERE id = ', [id]),
            pool.query(`SELECT 
                COUNT(*) AS totalPedidos, 
                COALESCE(SUM(CASE WHEN status = 'faturação' THEN valor ELSE 0 END), 0) AS totalFaturação, 
                COALESCE(AVG(CASE WHEN status = 'faturação' THEN valor ELSE 0 END), 0) AS ticketMedio 
                FROM pedidos WHERE empresa_id = `, [id]),
            pool.query('SELECT id, valor, status, created_at FROM pedidos WHERE empresa_id =  ORDER BY created_at DESC', [id]),
            pool.query('SELECT id, nome, email, telefone FROM clientes WHERE empresa_id =  ORDER BY nome ASC', [id])
        ]);

        const details = empresaResult[0][0];
        if (!details) return res.status(404).json({ message: 'Empresa não encontrada.' });

        res.json({
            details,
            kpis: kpisResult[0][0] || { totalPedidos: 0, totalFaturação: 0, ticketMedio: 0 },
            pedidos: pedidosResult[0] || [],
            clientes: clientesResult[0] || []
        });
    } catch (error) {
        next(error);
    }
});

apiVendasRouter.post('/empresas', async (req, res, next) => {
    try {
        const { cnpj, nome_fantasia, razao_social, email, email_2, telefone, telefone_2, cep, lograçãouro, número, bairro, municipio, uf } = req.body;
        if (!nome_fantasia || !cnpj) {
            return res.status(400).json({ message: 'Nome fantasia e CNPJ são obrigatórios.' });
        }
        const [result] = await pool.query(
            `INSERT INTO empresas (cnpj, nome_fantasia, razao_social, email, email_2, telefone, telefone_2, cep, lograçãouro, número, bairro, municipio, uf) VALUES (, , , , , , , , , , , , )`,
            [cnpj, nome_fantasia, razao_social || null, email || null, email_2 || null, telefone || null, telefone_2 || null, cep || null, lograçãouro || null, número || null, bairro || null, municipio || null, uf || null]
        );
        res.status(201).json({ message: 'Empresa cadastrada com sucesso!', insertedId: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Este CNPJ já está cadastração.' });
        next(error);
    }
});

apiVendasRouter.put('/empresas/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { cnpj, nome_fantasia, razao_social, email, email_2, telefone, telefone_2, cep, lograçãouro, número, bairro, municipio, uf } = req.body;
        if (!nome_fantasia || !cnpj) {
            return res.status(400).json({ message: 'Nome fantasia e CNPJ são obrigatórios.' });
        }
        const [result] = await pool.query(
            `UPDATE empresas SET cnpj = , nome_fantasia = , razao_social = , email = , email_2 = , telefone = , telefone_2 = , cep = , lograçãouro = , número = , bairro = , municipio = , uf =  WHERE id = `,
            [cnpj, nome_fantasia, razao_social, email, email_2, telefone, telefone_2, cep, lograçãouro, número, bairro, municipio, uf, id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Empresa não encontrada.' });
        res.json({ message: 'Empresa atualizada com sucesso.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Este CNPJ já está cadastração.' });
        next(error);
    }
});

apiVendasRouter.delete('/empresas/:id', authorizeAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM clientes WHERE empresa_id = ', [id]);
        await pool.query('DELETE FROM pedidos WHERE empresa_id = ', [id]);
        const [result] = await pool.query('DELETE FROM empresas WHERE id = ', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Empresa não encontrada.' });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// --- ROTAS DE CLIENTES ---

// Busca unificada de clientes e empresas (para autocomplete)
apiVendasRouter.get('/clientes-empresas/search', async (req, res, next) => {
    try {
        const q = req.query.q || '';
        if (q.length < 1) {
            return res.json([]);
        }
        const query = `%${q}%`;
        
        // Buscar empresas
        const [empresas] = await pool.query(
            `SELECT id, nome_fantasia as nome, razao_social, cnpj, 'empresa' as tipo
             FROM empresas 
             WHERE nome_fantasia LIKE  OR razao_social LIKE  OR cnpj LIKE 
             ORDER BY nome_fantasia
             LIMIT 10`,
            [query, query, query]
        );
        
        // Buscar clientes
        const [clientes] = await pool.query(
            `SELECT c.id, c.nome, c.email, c.telefone, c.cpf, c.empresa_id, 
                    e.nome_fantasia as empresa_nome, 'cliente' as tipo
             FROM clientes c
             LEFT JOIN empresas e ON c.empresa_id = e.id
             WHERE c.nome LIKE  OR c.email LIKE  OR c.cpf LIKE 
             ORDER BY c.nome
             LIMIT 10`,
            [query, query, query]
        );
        
        // Combinar resultaçãos: empresas primeiro, depois clientes
        const resultaçãos = [
            ...empresas.map(e => ({
                id: e.id,
                nome: e.nome_fantasia || e.razao_social || e.nome,
                subtitulo: e.cnpj  `CNPJ: ${e.cnpj}` : '',
                tipo: 'empresa',
                empresa_id: e.id
            })),
            ...clientes.map(c => ({
                id: c.id,
                nome: c.nome,
                subtitulo: c.empresa_nome  `${c.empresa_nome}` : (c.email || ''),
                tipo: 'cliente',
                cliente_id: c.id,
                empresa_id: c.empresa_id
            }))
        ];
        
        res.json(resultaçãos);
    } catch (error) {
        next(error);
    }
});

apiVendasRouter.get('/clientes', async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const [rows] = await pool.query(`
            SELECT c.id, c.nome, c.email, c.telefone, e.nome_fantasia AS empresa_nome
            FROM clientes c
            LEFT JOIN empresas e ON c.empresa_id = e.id
            ORDER BY c.nome ASC
            LIMIT  OFFSET 
        `, [parseInt(limit), offset]);
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

apiVendasRouter.get('/clientes/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Cliente não encontração.' });
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
});

apiVendasRouter.get('/clientes/:id/details', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [clienteResult, interacoesResult, pedidosResult, tagsResult] = await Promise.all([
            pool.query(`SELECT c.*, e.nome_fantasia as empresa_nome FROM clientes c LEFT JOIN empresas e ON c.empresa_id = e.id WHERE c.id = `, [id]),
            pool.query(`SELECT i.tipo, i.anotacao, i.created_at, u.nome as usuario_nome FROM cliente_interacoes i JOIN usuarios u ON i.usuario_id = u.id WHERE i.cliente_id =  ORDER BY i.created_at DESC`, [id]),
            pool.query(`SELECT p.id, p.valor, p.status, p.created_at FROM pedidos p JOIN clientes c ON p.empresa_id = c.empresa_id WHERE c.id =  ORDER BY p.created_at DESC`, [id]),
            pool.query(`SELECT t.id, t.nome, t.cor FROM cliente_tags t JOIN cliente_has_tags cht ON t.id = cht.tag_id WHERE cht.cliente_id = `, [id])
        ]);

        const cliente = clienteResult[0][0];
        if (!cliente) return res.status(404).json({ message: 'Cliente não encontração.' });

        res.json({
            details: cliente,
            interacoes: interacoesResult[0] || [],
            pedidos: pedidosResult[0] || [],
            tags: tagsResult[0] || []
        });
    } catch (error) {
        next(error);
    }
});


apiVendasRouter.post('/clientes', async (req, res, next) => {
    try {
        const { nome, email, email_2, telefone, telefone_2, empresa_id } = req.body;
        if (!nome || !empresa_id) return res.status(400).json({ message: 'Nome e empresa são obrigatórios.' });
        const [result] = await pool.query(
            'INSERT INTO clientes (nome, email, email_2, telefone, telefone_2, empresa_id) VALUES (, , , , , )',
            [nome, email || null, email_2 || null, telefone || null, telefone_2 || null, empresa_id]
        );
        res.status(201).json({ message: 'Cliente cadastração com sucesso!', insertedId: result.insertId });
    } catch (error) {
        next(error);
    }
});

apiVendasRouter.put('/clientes/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nome, email, email_2, telefone, telefone_2, empresa_id } = req.body;
        if (!nome || !empresa_id) return res.status(400).json({ message: 'Nome e empresa são obrigatórios.' });
        const [result] = await pool.query(
            `UPDATE clientes SET nome = , email = , email_2 = , telefone = , telefone_2 = , empresa_id =  WHERE id = `,
            [nome, email, email_2, telefone, telefone_2, empresa_id, id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Cliente não encontração.' });
        res.json({ message: 'Cliente atualização com sucesso.' });
    } catch (error) {
        next(error);
    }
});

apiVendasRouter.delete('/clientes/:id', authorizeAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM clientes WHERE id = ', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Cliente não encontração.' });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

apiVendasRouter.post('/clientes/:id/interacoes', async (req, res, next) => {
    try {
        const { id: cliente_id } = req.params;
        const { tipo, anotacao } = req.body;
        const { id: usuario_id } = req.user;
        if (!tipo || !anotacao) return res.status(400).json({ message: 'Tipo e anotação são obrigatórios.' });
        await pool.query(
            'INSERT INTO cliente_interacoes (cliente_id, usuario_id, tipo, anotacao) VALUES (, , , )',
            [cliente_id, usuario_id, tipo, anotacao]
        );
        res.status(201).json({ message: 'Interação registrada com sucesso!' });
    } catch (error) {
        next(error);
    }
});

apiVendasRouter.post('/clientes/:id/tags', async (req, res, next) => {
    try {
        const { id: cliente_id } = req.params;
        const { tag_id } = req.body;
        await pool.query(
            'INSERT INTO cliente_has_tags (cliente_id, tag_id) VALUES (, )',
            [cliente_id, tag_id]
        );
        res.status(201).json({ message: 'Tag associada com sucesso!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.json({ message: 'Tag já associada.' });
        next(error);
    }
});

apiVendasRouter.get('/tags', async (req, res, next) => {
    try {
        const [tags] = await pool.query('SELECT * FROM cliente_tags ORDER BY nome');
        res.json(tags);
    } catch (error) {
        next(error);
    }
});

// ========================================
// ROTAS DE PRODUTOS
// ========================================

// Garantir tabela de produtos existe
async function ensureProdutosTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS produtos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                codigo VARCHAR(50) NOT NULL UNIQUE,
                descricao VARCHAR(255) NOT NULL,
                ncm VARCHAR(20),
                ean VARCHAR(20),
                categoria VARCHAR(100),
                situacao ENUM('ativo', 'inativo', 'descontinuação') DEFAULT 'ativo',
                unidade VARCHAR(10) DEFAULT 'UN',
                peso_bruto DECIMAL(10,3) DEFAULT 0,
                peso_liquido DECIMAL(10,3) DEFAULT 0,
                preco_custo DECIMAL(15,2) DEFAULT 0,
                preco_venda DECIMAL(15,2) DEFAULT 0,
                estoque_atual INT DEFAULT 0,
                estoque_minimo INT DEFAULT 0,
                local_estoque VARCHAR(100) DEFAULT 'principal',
                observacoes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_codigo (codigo),
                INDEX idx_categoria (categoria),
                INDEX idx_situacao (situacao)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
    } catch (e) { /* tabela já existe */ }
}

// Listar produtos
apiVendasRouter.get('/produtos', async (req, res, next) => {
    try {
        await ensureProdutosTable();
        const { page = 1, limit = 50, categoria, situacao, search } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let whereConditions = [];
        let params = [];
        
        if (categoria) {
            whereConditions.push('categoria = ');
            params.push(categoria);
        }
        if (situacao) {
            whereConditions.push('situacao = ');
            params.push(situacao);
        }
        if (search) {
            whereConditions.push('(codigo LIKE  OR descricao LIKE )');
            params.push(`%${search}%`, `%${search}%`);
        }
        
        const whereClause = whereConditions.length > 0  'WHERE ' + whereConditions.join(' AND ') : '';
        
        const [rows] = await pool.query(
            `SELECT * FROM produtos ${whereClause} ORDER BY descricao ASC LIMIT  OFFSET `,
            [...params, parseInt(limit), offset]
        );
        
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) as total FROM produtos ${whereClause}`,
            params
        );
        
        res.json({ produtos: rows, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') return res.json({ produtos: [], total: 0 });
        next(error);
    }
});

// Autocomplete de produtos - busca rápida para dropdown
apiVendasRouter.get('/produtos/autocomplete/:termo', async (req, res, next) => {
    try {
        await ensureProdutosTable();
        const { termo } = req.params;
        const limit = parseInt(req.query.limit) || 15;
        
        const [rows] = await pool.query(
            `SELECT id, codigo, descricao, unidade, preco_venda, estoque_atual, local_estoque 
             FROM produtos 
             WHERE situacao = 'ativo' AND (codigo LIKE  OR descricao LIKE  OR ean LIKE )
             ORDER BY 
                CASE 
                    WHEN codigo =  THEN 1 
                    WHEN codigo LIKE  THEN 2 
                    ELSE 3 
                END,
                descricao ASC
             LIMIT `,
            [`%${termo}%`, `%${termo}%`, `%${termo}%`, termo, `${termo}%`, limit]
        );
        
        res.json(rows);
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') return res.json([]);
        next(error);
    }
});

// Buscar produto por ID
apiVendasRouter.get('/produtos/:id', async (req, res, next) => {
    try {
        await ensureProdutosTable();
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM produtos WHERE id = ', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Produto não encontração.' });
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
});

// Criar produto
apiVendasRouter.post('/produtos', async (req, res, next) => {
    try {
        await ensureProdutosTable();
        const { 
            codigo, descricao, ncm, ean, categoria, situacao, unidade,
            peso_bruto, peso_liquido, preco_custo, preco_venda,
            estoque_atual, estoque_minimo, local_estoque, observacoes 
        } = req.body;
        
        if (!codigo || !descricao) {
            return res.status(400).json({ message: 'Código e Descrição são obrigatórios.' });
        }
        
        const [result] = await pool.query(
            `INSERT INTO produtos (codigo, descricao, ncm, ean, categoria, situacao, unidade, peso_bruto, peso_liquido, preco_custo, preco_venda, estoque_atual, estoque_minimo, local_estoque, observacoes) 
             VALUES (, , , , , , , , , , , , , , )`,
            [
                sanitizeString(codigo), sanitizeString(descricao), 
                sanitizeString(ncm) || null, sanitizeString(ean) || null,
                sanitizeString(categoria) || null, situacao || 'ativo', unidade || 'UN',
                sanitizeNumber(peso_bruto), sanitizeNumber(peso_liquido),
                sanitizeNumber(preco_custo), sanitizeNumber(preco_venda),
                sanitizeInt(estoque_atual), sanitizeInt(estoque_minimo),
                sanitizeString(local_estoque) || 'principal', sanitizeString(observacoes) || null
            ]
        );
        
        await logAudit(req.user.id, 'create_produto', 'produto', result.insertId, { codigo, descricao });
        
        res.status(201).json({ message: 'Produto cadastração com sucesso!', id: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Já existe um produto com este código.' });
        }
        next(error);
    }
});

// Atualizar produto
apiVendasRouter.put('/produtos/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { 
            codigo, descricao, ncm, ean, categoria, situacao, unidade,
            peso_bruto, peso_liquido, preco_custo, preco_venda,
            estoque_atual, estoque_minimo, local_estoque, observacoes 
        } = req.body;
        
        if (!codigo || !descricao) {
            return res.status(400).json({ message: 'Código e Descrição são obrigatórios.' });
        }
        
        const [result] = await pool.query(
            `UPDATE produtos SET codigo = , descricao = , ncm = , ean = , categoria = , situacao = , unidade = , peso_bruto = , peso_liquido = , preco_custo = , preco_venda = , estoque_atual = , estoque_minimo = , local_estoque = , observacoes =  WHERE id = `,
            [
                sanitizeString(codigo), sanitizeString(descricao), 
                sanitizeString(ncm), sanitizeString(ean),
                sanitizeString(categoria), situacao, unidade,
                sanitizeNumber(peso_bruto), sanitizeNumber(peso_liquido),
                sanitizeNumber(preco_custo), sanitizeNumber(preco_venda),
                sanitizeInt(estoque_atual), sanitizeInt(estoque_minimo),
                sanitizeString(local_estoque), sanitizeString(observacoes), id
            ]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Produto não encontração.' });
        }
        
        await logAudit(req.user.id, 'update_produto', 'produto', id, { codigo, descricao });
        
        res.json({ message: 'Produto atualização com sucesso.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Já existe outro produto com este código.' });
        }
        next(error);
    }
});

// Excluir produto
apiVendasRouter.delete('/produtos/:id', authorizeAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM produtos WHERE id = ', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Produto não encontração.' });
        }
        
        await logAudit(req.user.id, 'delete_produto', 'produto', id, null);
        
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// Buscar produto por código (para autocomplete)
apiVendasRouter.get('/produtos/busca/:codigo', async (req, res, next) => {
    try {
        await ensureProdutosTable();
        const { codigo } = req.params;
        const [rows] = await pool.query(
            'SELECT id, codigo, descricao, preco_venda, unidade, estoque_atual FROM produtos WHERE codigo LIKE  OR descricao LIKE  LIMIT 10',
            [`${codigo}%`, `%${codigo}%`]
        );
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

// **NOVA ROTA** para buscar a lista de vendedores (equipe comercial)
// Rota duplicada removida - usar a rota anterior em /vendedores que já filtra os vendedores corretos

// Rota para retornar daçãos do usuário autenticação (incluindo foto/avatar e permissões)
apiVendasRouter.get('/me', async (req, res, next) => {
    try {
        const userId = req.user && req.user.id;
        if (!userId) return res.status(401).json({ message: 'Usuário não autenticação.' });
        // Evita referenciar coluna 'foto' caso não exista no schema atual
        const [rows] = await pool.query('SELECT id, nome, email, role, is_admin FROM usuarios WHERE id =  LIMIT 1', [userId]);
        if (!rows || rows.length === 0) return res.status(404).json({ message: 'Usuário não encontração.' });
        
        const user = rows[0];
        // Calcular isAdmin usando a função global
        user.isAdmin = verificarSeAdmin(user);
        
        res.json(user);
    } catch (error) {
        next(error);
    }
});

// --- ROTA DE DASHBOARD (ADMIN) ---
// **ATUALIZADA E OTIMIZADA** para aceitar filtros e ser mais performática
apiVendasRouter.get('/dashboard-stats', authorizeAdmin, async (req, res, next) => {
    try {
        const { status } = req.query;
        let whereClause = "WHERE created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')";
        let params = [];

        if (status && status !== 'all') {
            whereClause += " AND status = ";
            params.push(status);
        }

        const query = `
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'faturação' THEN valor ELSE 0 END), 0) AS totalFaturaçãoMes,
                COUNT(CASE WHEN status IN ('orçamento', 'analise', 'aprovação') THEN 1 END) AS pedidosPendentes,
                COUNT(CASE WHEN status = 'orçamento' THEN 1 END) AS orçamentosAberto,
                (SELECT COUNT(*) FROM empresas WHERE created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')) AS novosClientesMes
            FROM pedidos
            ${whereClause}
        `;
        
        const [rows] = await pool.query(query, params);
        
        res.json(rows[0]);

    } catch (error) {
        next(error);
    }
});

// GET: monthly aggregates for last N months (admin only)
apiVendasRouter.get('/dashboard/monthly', authorizeAdmin, async (req, res, next) => {
    try {
        const months = Math.max(parseInt(req.query.months || '12'), 1);
        // compute start date (first day of month N-1 months ago)
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
        const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;

        if (dbAvailable) {
            const [rows] = await pool.query(
                `SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, COALESCE(SUM(CASE WHEN status = 'faturação' THEN valor ELSE 0 END), 0) AS total
                 FROM pedidos
                 WHERE created_at >= 
                 GROUP BY ym
                 ORDER BY ym ASC`,
                 [startStr]
            );

            // convert rows to map for quick lookup
            const map = new Map();
            for (const r of rows) map.set(r.ym, Number(r.total || 0));

            const labels = [];
            const values = [];
            for (let i = 0; i < months; i++) {
                const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
                const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                labels.push(d.toLocaleString('pt-BR', { month: 'short', year: 'numeric' }));
                values.push(map.has(ym)  map.get(ym) : 0);
            }
            return res.json({ labels, values });
        }

        // Dev fallback: mock data
        const mockLabels = [];
        const mockValues = [];
        for (let i = months - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            mockLabels.push(d.toLocaleString('pt-BR', { month: 'short', year: 'numeric' }));
            mockValues.push(Math.floor(Math.random() * 200000) + 20000);
        }
        res.json({ labels: mockLabels, values: mockValues, note: 'mock data (DB unavailable)'});
    } catch (err) { next(err); }
});

// GET: top vendedores by faturamento in period (qualquer usuário autenticação pode ver o ranking)
apiVendasRouter.get('/dashboard/top-vendedores', authenticateToken, async (req, res, next) => {
    try {
        const limit = Math.max(parseInt(req.query.limit || '5'), 1);
        const periodDays = Math.max(parseInt(req.query.period || req.query.days || '30'), 1);
        const dataInicio = req.query.data_inicio;
        const dataFim = req.query.data_fim;
        
        const now = new Date();
        let startStr, endStr;
        
        if (dataInicio && dataFim) {
            startStr = dataInicio;
            endStr = dataFim;
        } else {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (periodDays - 1));
            startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
            endStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        }

        if (dbAvailable) {
            const [rows] = await pool.query(
                `SELECT 
                    u.id, 
                    u.nome, 
                    COUNT(p.id) as vendas,
                    COALESCE(SUM(CASE WHEN p.status = 'faturação' THEN p.valor ELSE 0 END), 0) AS valor
                 FROM pedidos p
                 JOIN usuarios u ON p.vendedor_id = u.id
                 WHERE p.created_at >=  AND p.created_at <= DATE_ADD(, INTERVAL 1 DAY)
                 GROUP BY u.id, u.nome
                 ORDER BY valor DESC
                 LIMIT `,
                 [startStr, endStr, limit]
            );
            return res.json(rows.map(r => ({ 
                id: r.id, 
                nome: r.nome, 
                vendas: Number(r.vendas || 0),
                valor: Number(r.valor || 0) 
            })));
        }

        // Dev fallback mock - Vendedores reais da equipe
        const vendedoresReais = [
            { nome: 'Márcia Scarcella', valor: 48500 },
            { nome: 'Augusto Ladeira', valor: 42300 },
            { nome: 'Renata Nascimento', valor: 32500 },
            { nome: 'Fabiano Marques', valor: 28900 },
            { nome: 'Fabíola Souza', valor: 24700 }
        ];
        const mock = vendedoresReais.slice(0, limit).map((v, i) => ({ 
            id: i + 1, 
            nome: v.nome, 
            vendas: Math.floor(Math.random() * 50) + 10,
            valor: v.valor 
        }));
        res.json(mock);
    } catch (err) { next(err); }
});

// GET: top produtos mais vendidos (baseação nos itens dos pedidos)
apiVendasRouter.get('/dashboard/top-produtos', async (req, res, next) => {
    try {
        const limit = Math.max(parseInt(req.query.limit || '5'), 1);
        const periodDays = Math.max(parseInt(req.query.period || req.query.days || '30'), 1);
        const dataInicio = req.query.data_inicio;
        const dataFim = req.query.data_fim;
        
        const now = new Date();
        let startStr, endStr;
        
        if (dataInicio && dataFim) {
            startStr = dataInicio;
            endStr = dataFim;
        } else {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (periodDays - 1));
            startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
            endStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        }

        if (dbAvailable) {
            // Tentar buscar da tabela pedido_itens com join nos pedidos
            try {
                const [rows] = await pool.query(
                    `SELECT 
                        COALESCE(pi.descricao, pi.codigo, 'Produto') as nome,
                        pi.codigo,
                        SUM(pi.quantidade) as quantidade,
                        SUM(pi.total) as valor
                     FROM pedido_itens pi
                     JOIN pedidos p ON pi.pedido_id = p.id
                     WHERE p.created_at >=  AND p.created_at <= DATE_ADD(, INTERVAL 1 DAY)
                     GROUP BY COALESCE(pi.descricao, pi.codigo)
                     ORDER BY valor DESC
                     LIMIT `,
                    [startStr, endStr, limit]
                );
                
                if (rows && rows.length > 0) {
                    return res.json(rows.map(r => ({
                        nome: r.nome,
                        codigo: r.codigo,
                        quantidade: Number(r.quantidade || 0),
                        valor: Number(r.valor || 0)
                    })));
                }
            } catch (dbErr) {
                console.warn('Erro ao buscar top-produtos de pedido_itens:', dbErr.message);
            }
            
            // Fallback: tentar da tabela pedidos_vendas/itens_pedido
            try {
                const [rows] = await pool.query(
                    `SELECT 
                        COALESCE(ip.descricao, ip.produto_nome, pr.nome, 'Produto') as nome,
                        ip.produto_codigo as codigo,
                        SUM(ip.quantidade) as quantidade,
                        SUM(ip.valor_total) as valor
                     FROM itens_pedido ip
                     LEFT JOIN pedidos_vendas pv ON ip.pedido_id = pv.id
                     LEFT JOIN produtos pr ON ip.produto_id = pr.id
                     WHERE pv.data_pedido >=  AND pv.data_pedido <= DATE_ADD(, INTERVAL 1 DAY)
                     GROUP BY COALESCE(ip.descricao, ip.produto_nome, pr.nome)
                     ORDER BY valor DESC
                     LIMIT `,
                    [startStr, endStr, limit]
                );
                
                if (rows && rows.length > 0) {
                    return res.json(rows.map(r => ({
                        nome: r.nome,
                        codigo: r.codigo,
                        quantidade: Number(r.quantidade || 0),
                        valor: Number(r.valor || 0)
                    })));
                }
            } catch (dbErr2) {
                console.warn('Erro ao buscar top-produtos de itens_pedido:', dbErr2.message);
            }
        }

        // Fallback: retornar array vazio
        res.json([]);
    } catch (err) { next(err); }
});

app.use('/api/vendas', apiVendasRouter);

// ==============================================
// SISTEMA DE NOTIFICAÇÕES
// ==============================================
const NOTIFICATIONS_FILE = path.join(__dirname, 'data', 'notifications.json');

function loadNotifications() {
    try {
        ensureDataDir();
        if (!fs.existsSync(NOTIFICATIONS_FILE)) return [];
        const raw = fs.readFileSync(NOTIFICATIONS_FILE, 'utf8');
        return JSON.parse(raw || '[]');
    } catch (e) { return []; }
}

function saveNotifications(arr) {
    try { 
        ensureDataDir(); 
        fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(arr, null, 2), 'utf8'); 
    } catch(e){}
}

function createNotification(type, title, message, data = {}) {
    const notifications = loadNotifications();
    const notification = {
        id: Date.now(),
        type, // 'order', 'payment', 'stock', 'success', 'warning', 'error', 'info'
        title,
        message,
        data,
        read: false,
        important: type === 'error' || type === 'stock',
        createdAt: new Date().toISOString()
    };
    notifications.unshift(notification);
    // Manter apenas as últimas 100 notificações
    if (notifications.length > 100) notifications.length = 100;
    saveNotifications(notifications);
    
    // Emitir via Socket.IO se disponível
    if (io) {
        io.emit('notification', notification);
    }
    
    return notification;
}

// API de Notificações
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

app.post('/api/notifications/read-all', (req, res) => {
    const notifications = loadNotifications();
    notifications.forEach(n => n.read = true);
    saveNotifications(notifications);
    res.json({ success: true });
});

app.delete('/api/notifications/:id', (req, res) => {
    let notifications = loadNotifications();
    const id = parseInt(req.params.id);
    notifications = notifications.filter(n => n.id !== id);
    saveNotifications(notifications);
    res.json({ success: true });
});

// Rota para criar notificação (uso interno/admin)
app.post('/api/notifications', express.json(), (req, res) => {
    const { type, title, message, data } = req.body;
    const notification = createNotification(type || 'info', title, message, data);
    res.json(notification);
});

// Exportar função para uso interno
global.createNotification = createNotification;

// ==============================================
// ROTA PÚBLICA DE PEDIDOS (PARA PÁGINA GESTÃO)
// ==============================================
app.get('/api/pedidos', async (req, res) => {
    try {
        if (!dbAvailable || !pool) {
            return res.json([]);
        }
        
        const [rows] = await pool.query(`
            SELECT 
                p.id,
                p.id as numero,
                p.valor as valor_total,
                p.status,
                p.created_at as data_pedido,
                p.vendedor_id,
                p.data_previsao,
                e.nome_fantasia AS cliente_nome,
                e.cnpj AS cliente_cnpj,
                u.nome AS vendedor_nome
            FROM pedidos p
            LEFT JOIN empresas e ON p.empresa_id = e.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            ORDER BY p.id DESC
            LIMIT 200
        `);
        
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        res.json([]);
    }
});

// --- SIMPLE CHAT PERSISTENCE & SOCKET.IO (REALTIME) ---
// We'll keep a small file-backed history and expose REST endpoints in case the client
// can't use websockets. The socket.io client is served automatically at /socket.io/socket.io.js

const CHAT_FILE = path.join(__dirname, 'data', 'chat_history.json');
const CHAT_LOG_FILE = path.join(__dirname, 'data', 'chat_events.log');
function ensureDataDir() {
    const dir = path.dirname(CHAT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function loadChatHistory() {
    try {
        ensureDataDir();
        if (!fs.existsSync(CHAT_FILE)) return [];
        const raw = fs.readFileSync(CHAT_FILE, 'utf8');
        return JSON.parse(raw || '[]');
    } catch (e) { return []; }
}
function saveChatHistory(arr) {
    try { ensureDataDir(); fs.writeFileSync(CHAT_FILE, JSON.stringify(arr, null, 2), 'utf8'); } catch(e){}
}

function appendChatLog(obj) {
    try {
        ensureDataDir();
        const entry = Object.assign({ ts: Date.now() }, obj || {});
        fs.appendFileSync(CHAT_LOG_FILE, JSON.stringify(entry) + os.EOL, 'utf8');
    } catch (e) {
        // não bloquear em caso de falha no log
    }
}

// REST endpoints to fetch/post chat messages (fallback)
app.get('/api/chat/history', (req, res) => {
    const h = loadChatHistory();
    appendChatLog({ type: 'rest:history', count: Array.isArray(h)  h.length : 0 });
    res.json(h);
});
app.post('/api/chat/message', express.json(), (req, res) => {
    try {
        const body = req.body || {};
        const history = loadChatHistory();
        const item = { id: Date.now() + Math.floor(Math.random()*999), who: body.who || 'user', text: String(body.text || ''), ts: Date.now() };
        history.push(item);
        saveChatHistory(history);
        appendChatLog({ type: 'rest:message', item });
        // we'll broadcast via socket.io when available (see below)
        try { io && io.emit && io.emit('chat:message', item); } catch(e){}
        res.status(201).json(item);
    } catch (e) { res.status(500).json({ message: 'Erro ao salvar mensagem.' }); }
});

// Marca mensagens como lidas (IDs no body.ids array) e broadcast para clientes
app.post('/api/chat/mark-read', authenticateToken, express.json(), (req, res) => {
    try {
        const ids = Array.isArray(req.body && req.body.ids)  req.body.ids.map(x => String(x)) : [];
        if (ids.length === 0) return res.status(400).json({ message: 'ids array required.' });
        const history = loadChatHistory();
        let changed = 0;
        const now = Date.now();
        const idSet = new Set(ids);
        const updated = history.map(h => {
            if (idSet.has(String(h.id))) {
                changed++;
                return Object.assign({}, h, { read_at: now });
            }
            return h;
        });
        if (changed > 0) saveChatHistory(updated);
        const userId = req.user && req.user.id;
        appendChatLog({ type: 'rest:mark-read', ids, changed, userId });
        try {
            // emit asynchronously to avoid any request/response race and log the emit
            const payload = { ids, ts: now, userId };
            setImmediate(() => {
                try { io && io.emit && io.emit('chat:read', payload); appendChatLog(Object.assign({ type: 'socket:read_emit' }, payload)); } catch(e){}
            });
        } catch(e){}
        res.json({ changed });
    } catch (e) { res.status(500).json({ message: 'Erro ao marcar como lido.' }); }
});

// --- ROTA DE DESENVOLVIMENTO: emitir token para um usuário (APENAS EM AMBIENTE DE DESENVOLVIMENTO)
if (process.env.NODE_ENV === 'development') {
    app.get('/dev/token/:userId', async (req, res, next) => {
        try {
            const userId = req.params.userId;
            if (!userId) return res.status(400).json({ message: 'userId é obrigatório.' });
            if (dbAvailable) {
                const [rows] = await pool.query('SELECT id, nome, email, role, is_admin FROM usuarios WHERE id =  LIMIT 1', [userId]);
                if (!rows || rows.length === 0) return res.status(404).json({ message: 'Usuário não encontração.' });
                const user = rows[0];
                const tokenPayload = { id: user.id, nome: user.nome, email: user.email, role: user.role, is_admin: user.is_admin };
                const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });
                return res.json({ token, user: tokenPayload });
            }

            // Fallback: gerar um token com daçãos simulaçãos para desenvolvimento quando o DB estiver indisponível
            const fallbackUser = {
                id: parseInt(userId) || 1,
                nome: `dev-user-${userId}`,
                email: `dev+${userId}@example.local`,
                role: 'dev',
                is_admin: true
            };
            const token = jwt.sign(fallbackUser, JWT_SECRET, { expiresIn: '8h' });
            return res.json({ token, user: fallbackUser, note: 'DB indisponível — token de desenvolvimento geração (apenas para dev).' });
        } catch (err) {
            next(err);
        }
    });
}

// --- ROTAS ESPECÍFICAS PARA PÁGINAS PÚBLICAS ---
// Suporte a caminhos alternativos comuns
app.get('/Vendas/public/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/Vendas/public/:page', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, 'public', page);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});
app.get('/Vendas/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- ROTA "CATCH-ALL" E MANIPULADOR DE ERROS ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health-check endpoint: quick diagnostics for DB, Redis and static assets
app.get('/health', async (req, res) => {
    const status = { ok: true, checks: {} };
    // DB
    try {
        if (pool) {
            await pool.query('SELECT 1');
            status.checks.db = { connected: true };
        } else {
            status.checks.db = { connected: false, reason: 'no_pool' };
            status.ok = false;
        }
    } catch (e) {
        status.checks.db = { connected: false, reason: e && e.message  e.message : String(e) };
        status.ok = false;
    }

    // Redis
    try {
        if (redisClient) {
            const pong = await redisClient.ping();
            status.checks.redis = { connected: pong === 'PONG' || Boolean(pong) };
            if (!status.checks.redis.connected) status.ok = false;
        } else {
            status.checks.redis = { connected: false, reason: 'redis_not_configured' };
        }
    } catch (e) {
        status.checks.redis = { connected: false, reason: e && e.message  e.message : String(e) };
        status.ok = false;
    }

    // Static asset check (vendas.js)
    try {
        const vendasPath = path.join(__dirname, 'public', 'vendas.js');
        const exists = fs.existsSync(vendasPath);
        status.checks.static = { vendas_js_exists: exists };
        if (!exists) status.ok = false;
    } catch (e) {
        status.checks.static = { vendas_js_exists: false, reason: e && e.message  e.message : String(e) };
        status.ok = false;
    }

    status.time = new Date().toISOString();
    return res.json(status);
});

app.use((err, req, res, next) => {
    console.error('❌ ERRO NO SERVIDOR:', err.stack);
    if (!res.headersSent) {
        res.status(500).json({
            message: 'Ocorreu um erro inesperação no servidor.',
            error: process.env.NODE_ENV === 'development'  err.message : {}
        });
    }
});

// --- INICIALIZAÇÉO DO SERVIDOR ---
const startServer = async () => {
    try {
        await pool.query('SELECT 1');
        dbAvailable = true;
        console.log('✅ Conexão com o banco de daçãos estabelecida com sucesso.');
    } catch (error) {
        dbAvailable = false;
        console.error('⚠️ AVISO: Não foi possível conectar ao banco de daçãos.');
        console.error(error && error.message  error.message : error);
        if (process.env.NODE_ENV !== 'development') {
            console.error('❌ ERRO FATAL: em produção a conexão com o DB é obrigatória. Encerrando.');
            process.exit(1);
        } else {
            console.warn('Continuando em modo de desenvolvimento sem o banco de daçãos. Algumas rotas estarão limitadas.');
        }
    }

    // schedule background aggregation job if DB available
    try {
        if (dbAvailable) {
            // run once immediately
            computeAndCacheAggregates().catch(() => {});
            // then schedule hourly
            setInterval(() => { computeAndCacheAggregates().catch(() => {}); }, 60 * 60 * 1000);
        }
    } catch (e) {}

    // Create HTTP server and attach Socket.IO
    const server = http.createServer(app);

    try {
        io = new IOServer(server, { cors: { origin: '*', methods: ['GET','POST'] } });

    io.on('connection', (socket) => {
            try {
                // Accept token via handshake.auth.token or Authorization header
                const tokenFromAuth = socket.handshake && socket.handshake.auth && socket.handshake.auth.token;
                const authHeader = socket.handshake && socket.handshake.headers && (socket.handshake.headers.authorization || socket.handshake.headers.Authorization);
                const token = tokenFromAuth || (typeof authHeader === 'string'  (authHeader.split(' ')[1] || null) : null);

                if (!token) {
                    socket.emit('chat:error', { message: 'Token ausente. Conexão negada.' });
                    socket.disconnect(true);
                    return;
                }

                let decoded = null;
                try { decoded = jwt.verify(token, JWT_SECRET); } catch (err) {
                    socket.emit('chat:error', { message: 'Token inválido. Autenticação falhou.' });
                    socket.disconnect(true);
                    return;
                }

                socket.user = decoded;
                appendChatLog({ type: 'socket:connect', user: socket.user && (socket.user.id || socket.user.nome) });
                // send full history to the newly connected client
                try { socket.emit('chat:history', loadChatHistory()); } catch (e) { /* ignore */ }

                // receive messages from client
                socket.on('chat:message', (payload) => {
                    try {
                        if (!payload || !payload.text) return;
                        const who = payload.who || (socket.user && (socket.user.nome || socket.user.name)) || 'user';
                        const item = { id: Date.now() + Math.floor(Math.random()*999), who: who, text: String(payload.text || ''), ts: Date.now() };
                        const history = loadChatHistory();
                        history.push(item);
                        saveChatHistory(history);
                        appendChatLog({ type: 'socket:message', from: who, item });
                        // broadcast to all connected clients
                        try { io && io.emit && io.emit('chat:message', item); } catch(e){}
                    } catch (err) {
                        console.error('Erro ao processar chat:message:', err && err.message  err.message : err);
                    }
                });

                socket.on('disconnect', (reason) => {
                    try { appendChatLog({ type: 'socket:disconnect', user: socket.user && (socket.user.id || socket.user.nome), reason }); } catch(e){}
                });

            } catch (err) {
                console.error('Erro no handler de conexao socket:', err && err.message  err.message : err);
                try { socket.disconnect(true); } catch(e){}
            }
        });
    } catch (err) {
        console.error('Falha ao inicializar Socket.IO:', err && err.message  err.message : err);
        io = null;
    }

    server.listen(port, () => {
        console.log(`🚀 Servidor executando em http://localhost:${port}` + (dbAvailable  '' : ' (DB indisponível, modo dev)'));
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️  Porta ${port} já está em uso.`);
            
            // Se temos mais portas para tentar
            const currentIndex = PORTS_TO_TRY.indexOf(port);
            if (currentIndex >= 0 && currentIndex < PORTS_TO_TRY.length - 1) {
                port = PORTS_TO_TRY[currentIndex + 1];
                console.log(`🔄 Tentando porta ${port}...`);
                startServer();
            } else {
                console.error(`❌ Todas as portas (${PORTS_TO_TRY.join(', ')}) estão ocupadas. Finalizando.`);
                process.exit(1);
            }
        } else {
            console.error('❌ Erro ao iniciar servidor:', err);
            process.exit(1);
        }
    });
};

// Limpeza periódica de sessões expiradas (a cada 1 hora)
setInterval(() => {
    cleanExpiredSessions(pool).catch(err => {
        console.error('Erro ao limpar sessões:', err);
    });
}, 60 * 60 * 1000); // 1 hora

// Apenas inicia o servidor quando não estivermos em modo de teste
if (process.env.NODE_ENV !== 'test') {
    startServer();
}

module.exports = { app, pool, startServer };