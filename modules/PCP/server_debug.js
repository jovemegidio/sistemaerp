// Versão simplificada do servidor para debug
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

console.log('🔧 Iniciando servidor de debug...');

const app = express();
const PORT = 3001;

// Middlewares básicos
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Configuração do banco
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aluforce_vendas',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Teste de conexão com banco
console.log('🔗 Testando conexão com banco...');
db.getConnection()
  .then(connection => {
      console.log('✅ Banco conectado com sucesso!');
      connection.release();
  })
  .catch(err => {
      console.error('❌ Erro ao conectar com banco:', err.message);
      process.exit(1);
  });

// Sessões em memória
const sessions = new Map();

function getSessionIdFromReq(req) {
    const cookie = req.headers && req.headers.cookie;
    if (!cookie) return null;
    const m = cookie.match(/pcp_session=([^;]+)/);
    return m ? m[1] : null;
}

function authRequired(req, res, next) {
    const sid = getSessionIdFromReq(req);
    if (!sid || !sessions.has(sid)) return res.status(401).json({ message: 'Não autenticado' });
    req.user = sessions.get(sid).user;
    next();
}

// Rota de teste
app.get('/api/test', (req, res) => {
    console.log('📋 Rota /api/test acessada');
    res.json({ message: 'API funcionando', timestamp: new Date().toISOString() });
});

// Rota de login simplificada
app.post('/api/pcp/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        console.log(`[LOGIN] Tentativa para: ${email}`);
        
        // Buscar usuário
        const sql = `SELECT * FROM usuarios_pcp WHERE email = ? LIMIT 1`;
        const [rows] = await db.query(sql, [email]);
        
        if (!rows || rows.length === 0) {
            console.log('[LOGIN] Usuário não encontrado');
            return res.status(401).json({ message: 'Email/usuário não encontrado.' });
        }

        const user = rows[0];
        console.log(`[LOGIN] Usuário encontrado: ${user.nome} (ID: ${user.id})`);
        
        const stored = (user.senha || '').toString();
        console.log(`[LOGIN] Senha armazenada (tipo): ${stored ? 'Presente' : 'Vazia'}, Hash: ${stored.startsWith('$2a$') ? 'bcrypt' : 'texto'}`);

        // Verificar senha com bcrypt
        if (bcrypt && stored.match(/^\$2[aby]\$/)) {
            console.log('[LOGIN] Usando bcrypt compare...');
            const ok = await bcrypt.compare(password, stored);
            console.log(`[LOGIN] Resultado bcrypt: ${ok}`);
            
            if (ok) {
                const sid = crypto.randomBytes(16).toString('hex');
                sessions.set(sid, { user, created: Date.now() });
                res.setHeader('Set-Cookie', `pcp_session=${sid}; HttpOnly; Path=/; SameSite=Lax`);
                console.log(`[LOGIN] ✅ Login bem-sucedido para ${user.nome}`);
                return res.json({ message: 'Login bem-sucedido!', userData: user });
            }
        }

        // Comparação direta (fallback)
        console.log('[LOGIN] Tentando comparação direta...');
        if (stored === password) {
            const sid = crypto.randomBytes(16).toString('hex');
            sessions.set(sid, { user, created: Date.now() });
            res.setHeader('Set-Cookie', `pcp_session=${sid}; HttpOnly; Path=/; SameSite=Lax`);
            console.log(`[LOGIN] ✅ Login bem-sucedido para ${user.nome} (texto direto)`);
            return res.json({ message: 'Login bem-sucedido!', userData: user });
        }

        console.log('[LOGIN] ❌ Senha inválida');
        return res.status(401).json({ message: 'Email ou senha inválidos.' });
        
    } catch (error) {
        console.error('[LOGIN] ❌ Erro:', error.message);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// Handler de erro global
app.use((err, req, res, next) => {
    console.error('❌ Erro não tratado:', err.message);
    res.status(500).json({ message: 'Erro interno', error: err.message });
});

// Iniciar servidor
console.log('🚀 Iniciando servidor...');

const server = app.listen(PORT, () => {
    console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});

server.on('error', (err) => {
    console.error('❌ Erro do servidor:', err.message);
    if (err.code === 'EADDRINUSE') {
        console.error(`Porta ${PORT} em uso!`);
    }
});

// Capturar erros não tratados
process.on('uncaughtException', (err) => {
    console.error('❌ Exceção não capturada:', err.message);
    console.error(err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Promise rejeitada não tratada:', err.message);
    console.error(err.stack);
    process.exit(1);
});

console.log('🎯 Servidor de debug configurado!');