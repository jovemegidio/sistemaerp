// =================================================================
// SERVIDOR OTIMIZADO - ALUFORCE v2.0
// Versão com inicialização rápida e performance otimizada
// =================================================================
'use strict';

const startTime = Date.now();
console.log('🚀 Iniciando ALUFORCE Otimização...\n');

// =================================================================
// 1. IMPORTAÇÕES ESSENCIAIS (apenas o necessário no início)
// =================================================================
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// Lazy loading para módulos pesaçãos
let mysql, bcrypt, jwt, multer, nodemailer, io, cron;
const lazyRequire = (name) => {
    switch(name) {
        case 'mysql': return mysql || (mysql = require('mysql2/promise'));
        case 'bcrypt': return bcrypt || (bcrypt = require('bcryptjs'));
        case 'jwt': return jwt || (jwt = require('jsonwebtoken'));
        case 'multer': return multer || (multer = require('multer'));
        case 'nodemailer': return nodemailer || (nodemailer = require('nodemailer'));
        case 'cron': return cron || (cron = require('node-cron'));
        default: return require(name);
    }
};

// Carregar .env
require('dotenv').config({ path: path.join(__dirname, '.env') });

// =================================================================
// 2. CONFIGURAÇÃO EXPRESS OTIMIZADA
// =================================================================
const app = express();
const PORT = parseInt(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-super-dificil-de-adivinhar-@123!';

let pool = null;
let serverInstance = null;
let DB_AVAILABLE = false;

// =================================================================
// 3. MIDDLEWARES OTIMIZADOS (ordem importa!)
// =================================================================

// Compressão primeiro (maior impacto)
app.use(compression({ 
    level: 6,
    threshold: 1024,  // Só comprimir acima de 1KB
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));

// JSON/URL encoding
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS otimização
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
         ['https://aluforce.com.br', 'https://www.aluforce.com.br']
        : true,
    credentials: true
}));

app.use(cookieParser());

// Cache headers para arquivos estáticos
const staticOptions = {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        // Cache agressivo para assets estáticos
        if (['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.woff', '.woff2'].includes(ext)) {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 dia
        }
        // MIME types
        const mimeTypes = {
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.webp': 'image/webp'
        };
        if (mimeTypes[ext]) {
            res.setHeader('Content-Type', mimeTypes[ext]);
        }
    }
};

// =================================================================
// 4. ROTAS ESTÁTICAS OTIMIZADAS
// =================================================================

// Arquivos públicos principais
app.use(express.static(path.join(__dirname, 'public'), { ...staticOptions, index: false }));

// Módulos (com cache)
app.use('/Vendas', express.static(path.join(__dirname, 'modules', 'Vendas', 'public'), staticOptions));
app.use('/PCP', express.static(path.join(__dirname, 'modules', 'PCP'), staticOptions));
app.use('/NFe', express.static(path.join(__dirname, 'modules', 'NFe'), staticOptions));
app.use('/Financeiro', express.static(path.join(__dirname, 'modules', 'Financeiro', 'public'), staticOptions));
app.use('/Compras', express.static(path.join(__dirname, 'modules', 'Compras'), staticOptions));
app.use('/RH', express.static(path.join(__dirname, 'modules', 'RH', 'public'), staticOptions));
app.use('/RecursosHumanos', express.static(path.join(__dirname, 'modules', 'RH', 'public'), staticOptions));

// Avatares com fallback
app.use('/avatars', express.static(path.join(__dirname, 'public', 'avatars'), {
    ...staticOptions,
    fallthrough: true
}));

// Socket.io client
app.use('/socket.io', express.static(path.join(__dirname, 'node_modules', 'socket.io', 'client-dist'), staticOptions));

// =================================================================
// 5. CONEXÃO COM BANCO (LAZY - apenas quando necessário)
// =================================================================

const getPool = async () => {
    if (pool) return pool;
    
    const mysqlModule = lazyRequire('mysql');
    pool = mysqlModule.createPool({
        host: process.env.DB_HOST || 'interchange.proxy.rlwy.net',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'iiilOZutDOnPCwxgiTKeMuEaIzSwplcu',
        database: process.env.DB_NAME || 'railway',
        port: parseInt(process.env.DB_PORT) || 19396,
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        connectTimeout: 5000
    });
    
    try {
        await pool.query('SELECT 1');
        DB_AVAILABLE = true;
        console.log('✅ Banco de dados conectação');
    } catch (err) {
        console.warn('⚠️  Banco indisponível:', err.message);
        DB_AVAILABLE = false;
    }
    
    return pool;
};

// =================================================================
// 6. MIDDLEWARE DE AUTENTICAÇÃO OTIMIZADO
// =================================================================

const authenticateToken = async (req, res, next) => {
    const token = req.cookies.authToken || req.headers['authorization'].replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ message: 'Não autenticação' });
    }
    
    try {
        const jwtModule = lazyRequire('jwt');
        req.user = jwtModule.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token inválido' });
    }
};

const authenticatePage = async (req, res, next) => {
    const token = req.cookies.authToken;
    
    if (!token) {
        return res.redirect('/login.html');
    }
    
    try {
        const jwtModule = lazyRequire('jwt');
        req.user = jwtModule.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        res.clearCookie('authToken');
        return res.redirect('/login.html');
    }
};

// =================================================================
// 7. ROTAS DE PÁGINAS AUTENTICADAS
// =================================================================

// Login
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/', (req, res) => {
    const token = req.cookies.authToken;
    if (token) {
        return res.redirect('/home.html');
    }
    res.redirect('/login.html');
});

app.get('/home.html', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Vendas
app.get('/Vendas/', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'Vendas', 'public', 'index.html'));
});

app.get('/Vendas/kanban.html', authenticatePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'modules', 'Vendas', 'public', 'kanban.html'));
});

// Health check rápido
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        db: DB_AVAILABLE ? 'connected' : 'disconnected',
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
    });
});

// =================================================================
// 8. APIs CARREGADAS SOB DEMANDA (Lazy Loading)
// =================================================================

// Cache de routers carregaçãos
const loadedRouters = new Map();

const loadRouter = async (name, factory) => {
    if (loadedRouters.has(name)) {
        return loadedRouters.get(name);
    }
    
    try {
        const dbPool = await getPool();
        const router = factory(dbPool);
        loadedRouters.set(name, router);
        console.log(`✅ API ${name} carregada sob demanda`);
        return router;
    } catch (err) {
        console.error(`❌ Erro ao carregar ${name}:`, err.message);
        return null;
    }
};

// API de autenticação (crítica - carregar imediatamente)
const authRouter = require('./src/routes/auth');
app.use('/api/auth', authRouter);

// API de Vendas (sob demanda)
app.use('/api/vendas', async (req, res, next) => {
    const dbPool = await getPool();
    if (!DB_AVAILABLE) {
        return res.status(503).json({ error: 'Banco de dados indisponível' });
    }
    req.pool = dbPool;
    next();
});

// Endpoint de Pedidos otimização
app.get('/api/vendas/pedidos', authenticateToken, async (req, res) => {
    try {
        const dbPool = await getPool();
        const { status, limite = 50 } = req.query;
        
        let query = `
            SELECT p.id, p.valor, p.status, p.created_at, p.cliente_id, p.prioridade,
                   c.nome as cliente_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
        `;
        
        const params = [];
        if (status) {
            query += ' WHERE p.status = ';
            params.push(status);
        }
        
        query += ' ORDER BY p.created_at DESC LIMIT ';
        params.push(parseInt(limite));
        
        const [pedidos] = await dbPool.query(query, params);
        res.json(pedidos);
    } catch (error) {
        console.error('Erro pedidos:', error);
        res.status(500).json({ error: 'Erro ao listar pedidos' });
    }
});

app.get('/api/vendas/pedidos/:id', authenticateToken, async (req, res) => {
    try {
        const dbPool = await getPool();
        const [pedidos] = await dbPool.query(`
            SELECT p.*, c.nome as cliente_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            WHERE p.id = 
        `, [req.params.id]);
        
        if (pedidos.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        res.json(pedidos[0]);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar pedido' });
    }
});

// Clientes
app.get('/api/vendas/clientes', authenticateToken, async (req, res) => {
    try {
        const dbPool = await getPool();
        const { search, limite = 50 } = req.query;
        
        let query = 'SELECT id, nome, email, telefone FROM clientes';
        const params = [];
        
        if (search) {
            query += ' WHERE nome LIKE ? OR email LIKE ';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        query += ' ORDER BY nome LIMIT ';
        params.push(parseInt(limite));
        
        const [clientes] = await dbPool.query(query, params);
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar clientes' });
    }
});

// Empresas
app.get('/api/vendas/empresas', authenticateToken, async (req, res) => {
    try {
        const dbPool = await getPool();
        const { search, limite = 50 } = req.query;
        
        let query = 'SELECT id, nome_fantasia, cnpj, email FROM empresas';
        const params = [];
        
        if (search) {
            query += ' WHERE nome_fantasia LIKE ? OR cnpj LIKE ';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        query += ' ORDER BY nome_fantasia LIMIT ';
        params.push(parseInt(limite));
        
        const [empresas] = await dbPool.query(query, params);
        res.json(empresas);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar empresas' });
    }
});

// Produtos
app.get('/api/produtos', authenticateToken, async (req, res) => {
    try {
        const dbPool = await getPool();
        const { search, limite = 100 } = req.query;
        
        let query = 'SELECT id, codigo, descricao, preco_venda, estoque_atual FROM produtos';
        const params = [];
        
        if (search) {
            query += ' WHERE descricao LIKE ? OR codigo LIKE ';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        query += ' LIMIT ';
        params.push(parseInt(limite));
        
        const [produtos] = await dbPool.query(query, params);
        res.json(produtos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar produtos' });
    }
});

// =================================================================
// 9. INICIALIZAÇÃO RÁPIDA
// =================================================================

const startServer = async () => {
    return new Promise((resolve, reject) => {
        const httpServer = http.createServer(app);
        
        httpServer.listen(PORT, HOST)
            .on('listening', () => {
                serverInstance = httpServer;
                
                const elapsed = Date.now() - startTime;
                console.log('\n' + '═'.repeat(50));
                console.log('🚀 ALUFORCE v2.0 - Servidor Otimização');
                console.log('═'.repeat(50));
                console.log(`📍 URL: http://${HOST}:${PORT}`);
                console.log(`⚡ Tempo de inicialização: ${elapsed}ms`);
                console.log(`💾 Memória: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
                console.log('═'.repeat(50));
                console.log('\n💡 Banco e APIs serão conectaçãos sob demanda\n');
                
                // Conectar banco em background (não bloqueia)
                setImmediate(async () => {
                    await getPool();
                    console.log(`⚡ Banco conectação em ${Date.now() - startTime}ms total`);
                });
                
                resolve(httpServer);
            })
            .on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.error(`❌ Porta ${PORT} em uso`);
                }
                reject(err);
            });
    });
};

// =================================================================
// 10. GRACEFUL SHUTDOWN
// =================================================================

const stopServer = async () => {
    console.log('\n🛑 Encerrando servidor...');
    
    if (serverInstance) {
        serverInstance.close();
    }
    
    if (pool) {
        await pool.end();
    }
    
    console.log('✅ Servidor encerrado');
};

process.on('SIGINT', async () => {
    await stopServer();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await stopServer();
    process.exit(0);
});

// Tratamento de erros não capturaçãos
process.on('uncaughtException', (err) => {
    console.error('❌ Erro não tratação:', err.message);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Promise rejeitada:', reason);
});

// =================================================================
// 11. INICIAR
// =================================================================

if (require.main === module) {
    startServer().catch(err => {
        console.error('❌ Falha ao iniciar:', err);
        process.exit(1);
    });
}

module.exports = { app, startServer, stopServer, getPool };
