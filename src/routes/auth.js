// auth.js - Middleware e rota de autenticação corrigida
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Configuração do Banco de Daçãos e modo de desenvolvimento
const DEV_MOCK = (process.env.DEV_MOCK === '1' || process.env.DEV_MOCK === 'true');

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-super-dificil-de-adivinhar-@123!';

let pool;
if (DEV_MOCK) {
    // Mock simples em memória para testes locais sem MySQL
    console.log('[AUTH] Iniciando em modo DEV_MOCK - banco em memória');
    const mockUsers = [
        { id: 1, nome: 'Funcionário Exemplo', email: 'exemplo@aluforce.ind.br', role: 'user', setor: 'comercial', senha: 'aluvendas01' }
    ];
    pool = {
        // Simula respostas para as queries usadas no fluxo de login
        query: async (sql, params) => {
            const s = (sql || '').toString().toUpperCase();
            if (s.startsWith('SHOW COLUMNS FROM USUARIOS')) {
                // Retorna colunas contendo o campo 'senha' para o detector de campo de senha
                return [[
                    { Field: 'id' }, { Field: 'nome' }, { Field: 'email' }, { Field: 'senha' }
                ]];
            }
            if (s.includes('SELECT * FROM USUARIOS WHERE EMAIL')) {
                const email = params && params[0] ? params[0] : '';
                const rows = mockUsers.filter(u => u.email.toLowerCase() === String(email).toLowerCase());
                return [rows];
            }
            // Comandos de criado/checagem podem ser ignoraçãos no mock
            return [[]];
        }
    };
} else {
    // Pool real usando variáveis de ambiente com defaults
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '@dminalu',
        database: process.env.DB_NAME || 'aluforce_vendas',
        waitForConnections: true,
        connectionLimit: parseInt(process.env.DB_CONN_LIMIT) || 10,
        queueLimit: 0
    });
}

// Rota de login corrigida (sem campo cargo)
router.post('/login', async (req, res) => {
    console.log('=== DEBUG LOGIN ===');
    console.log('req.body:', req.body);
    console.log('req.headers:', req.headers);
    
    // Validação adicional do req.body
    if (!req.body || typeof req.body !== 'object') {
        console.error('req.body está undefined ou não é um objeto');
        return res.status(400).json({ message: 'Daçãos de login inválidos' });
    }
    
    const { email, password } = req.body;
    try {
        console.log('Login request:', { email });
        if (!email || (!email.endsWith('@aluforce.ind.br') && !email.endsWith('@aluforce.com'))) {
            return res.status(401).json({ message: 'Apenas e-mails @aluforce.ind.br e @aluforce.com são permitidos.' });
        }
        // Corrigido: sem campo cargo
        // Detecta colunas da tabela `usuarios` para escolher o campo de senha
        let cols;
        try {
            const [c] = await pool.query('SHOW COLUMNS FROM usuarios');
            cols = c.map(x => x.Field.toLowerCase());
            console.log('Colunas usuarios detectadas:', cols);
        } catch (err) {
            console.error('Erro ao inspecionar colunas da tabela usuarios:', err.stack || err);
            if (err && err.code === 'ER_NO_SUCH_TABLE') {
                return res.status(500).json({ message: 'Tabela `usuarios` não encontrada no banco de dados. Verifique a configuração do DB.' });
            }
            return res.status(500).json({ message: 'Erro ao verificar esquema de usuários.', error: (err && err.message) ? err.message : String(err) });
        }

        // Seleciona o usuário
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ? ORDER BY id ASC LIMIT 1', [email]);
        if (!rows.length) {
            return res.status(401).json({ message: 'Usuário não encontrado.' });
        }
        const user = rows[0];

        // Possíveis nomes comuns de campos de senha
        const possibleNames = ['senha_hash', 'senha', 'password', 'senha_plain', 'pass', 'passwd', 'password_hash'];
        let hashField = null;
        for (const n of possibleNames) {
            if (cols.includes(n)) { hashField = n; break; }
        }
        if (!hashField) {
            for (const n of possibleNames) {
                if (Object.prototype.hasOwnProperty.call(user, n)) { hashField = n; break; }
            }
        }
        if (!hashField) {
            return res.status(500).json({ message: 'Nenhum campo de senha encontrado na tabela `usuarios`. Verifique o esquema.' });
        }

        // Decide se deve usar bcrypt: se o nome do campo indica hash ou termina com '_hash'
        const useBcrypt = hashField.includes('hash') || hashField.includes('senha_hash') || hashField.includes('password_hash');
        let valid = false;
        try {
            if (useBcrypt) {
                valid = await bcrypt.compare(password, user[hashField]);
            } else {
                valid = password === user[hashField];
            }
        } catch (err) {
            console.error('Erro ao comparar senha:', err.stack || err);
            return res.status(500).json({ message: 'Erro ao verificar credenciais.', error: (err && err.message) ? err.message : String(err) });
        }
        if (!valid) {
            return res.status(401).json({ message: 'Senha incorreta.' });
        }
        // Gera token JWT e coloca em cookie httpOnly
        const token = jwt.sign({ 
            id: user.id, 
            nome: user.nome, 
            email: user.email, 
            role: user.role,
            setor: user.setor || null
        }, JWT_SECRET, { expiresIn: '8h' });
        const cookieOptions = {
            httpOnly: true,
            path: '/'
        };
        
        // Em produção, usar secure e sameSite strict
        if (process.env.NODE_ENV === 'production') {
            cookieOptions.secure = true;
            cookieOptions.sameSite = 'strict';
        } else {
            // Em desenvolvimento (localhost), não usar secure mas permitir sameSite lax
            cookieOptions.sameSite = 'lax';
        }
        // Define cookie com expiração em 8 horas
        const finalCookieOptions = Object.assign({}, cookieOptions, { maxAge: 1000 * 60 * 60 * 8 });
        res.cookie('authToken', token, finalCookieOptions);
        console.log('[AUTH/LOGIN] ✅ Cookie authToken setação para:', user.email);
        console.log('[AUTH/LOGIN] Cookie options:', JSON.stringify(finalCookieOptions));
        console.log('[AUTH/LOGIN] Token (primeiros 30 chars):', token.substring(0, 30) + '...');
        // Se a requisição vem de um navegaçãor (ex: submission de formulário) redirecione para o painel
        // Caso seja uma requisição AJAX/fetch, retorne JSON (comportamento atual)
        const acceptsHtml = typeof req.headers.accept === 'string' && req.headers.accept.indexOf('text/html') !== -1;
        const isAjax = req.xhr || req.get('X-Requested-With') === 'XMLHttpRequest' || (req.headers['content-type'] && req.headers['content-type'].indexOf('application/json') !== -1);
        if (acceptsHtml && !isAjax) {
            // Redireciona para index.html (painel de controle)
            return res.redirect('/index.html');
        }
        // Também retorna dados do usuário para uso imediato no cliente (AJAX)
        // Inclui `redirectTo` (absoluto) para que clientes que usam fetch possam redirecionar a página facilmente.
        const baseUrl = (req.protocol || 'http') + '://' + (req.get('host') || req.headers.host || 'localhost');
        const redirectTo = baseUrl + '/index.html';
        const payload = {
            success: true,
            redirectTo,
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                role: user.role,
                setor: user.setor || null
            }
        };
        // Opcional: retornar token também no JSON quando expressly permitido (útil para testes).
        // Use RETURN_TOKEN=1 em ambientes seguros/development para habilitar explicitamente.
        // Não habilitamos isso automaticamente em DEV_MOCK para evitar hábitos inseguros.
        if (process.env.RETURN_TOKEN === '1') {
            payload.tempToken = token;
            console.log('[AUTH] Returning tempToken in JSON response (RETURN_TOKEN=1)');
        }
        res.json(payload);
    } catch (error) {
        // Log completo no servidor (stack quando disponível)
        console.error('Erro detalhação no login:', error.stack || error);
        // Envia apenas mensagem/texto para o cliente para evitar problemas de serialização
        res.status(500).json({ message: 'Erro inesperado no login', error: (error && error.message) ? error.message : String(error) });
    }
});

// Rota para logout (limpa cookie)
router.post('/logout', (req, res) => {
    console.log('[AUTH/LOGOUT] 🚪 Logout requisitação');
    
    // Limpar cookie com as mesmas opções que foi criado
    const cookieOptions = {
        httpOnly: true,
        path: '/'
    };
    
    if (process.env.NODE_ENV === 'production') {
        cookieOptions.secure = true;
        cookieOptions.sameSite = 'strict';
    } else {
        cookieOptions.sameSite = 'lax';
    }
    
    res.clearCookie('authToken', cookieOptions);
    console.log('[AUTH/LOGOUT] ✅ Cookie authToken limpo');
    res.json({ ok: true, message: 'Logout realizado com sucesso' });
});

// ===================== ROTAS DE RECUPERAÇÃO DE SENHA =====================

// Passo 1: Verificar se o email existe no sistema
router.post('/auth/verify-email', async (req, res) => {
    try {
        const { email } = req.body;
        console.log('[AUTH/VERIFY-EMAIL] Verificando email:', email);
        
        if (!email || !email.includes('@')) {
            return res.status(400).json({ message: 'Email inválido.' });
        }
        
        // Verifica se email existe no banco
        const [rows] = await pool.query('SELECT id, nome, email, setor FROM usuarios WHERE email = ? LIMIT 1', [email]);
        
        if (!rows.length) {
            return res.status(404).json({ message: 'Email não encontrado no sistema.' });
        }
        
        const user = rows[0];
        console.log('[AUTH/VERIFY-EMAIL] ✅ Email encontrado, userId:', user.id);
        
        res.json({ 
            success: true, 
            userId: user.id,
            message: 'Email verificação com sucesso.'
        });
    } catch (error) {
        console.error('[AUTH/VERIFY-EMAIL] Erro:', error.stack || error);
        res.status(500).json({ 
            message: 'Erro ao verificar email.', 
            error: error.message 
        });
    }
});

// Passo 2: Verificar dados do usuário (nome e departamento)
router.post('/auth/verify-user-data', async (req, res) => {
    try {
        const { userId, name, department } = req.body;
        console.log('[AUTH/VERIFY-DATA] Verificando dados para userId:', userId);
        
        if (!userId || !name || !department) {
            return res.status(400).json({ message: 'Daçãos incompletos.' });
        }
        
        // Busca usuário no banco
        const [rows] = await pool.query('SELECT id, nome, setor FROM usuarios WHERE id = ? LIMIT 1', [userId]);
        
        if (!rows.length) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        
        const user = rows[0];
        
        // Verifica se nome e setor conferem (case-insensitive)
        const nameMatches = user.nome.toLowerCase().includes(name.toLowerCase()) || 
                           name.toLowerCase().includes(user.nome.toLowerCase());
        const deptMatches = user.setor && user.setor.toLowerCase() === department.toLowerCase();
        
        if (!nameMatches) {
            console.log('[AUTH/VERIFY-DATA] ❌ Nome não confere');
            return res.status(401).json({ message: 'Nome não confere com nossos registros.' });
        }
        
        if (!deptMatches) {
            console.log('[AUTH/VERIFY-DATA] ❌ Departamento não confere');
            return res.status(401).json({ message: 'Departamento não confere com nossos registros.' });
        }
        
        console.log('[AUTH/VERIFY-DATA] ✅ Daçãos verificaçãos com sucesso');
        res.json({ 
            success: true, 
            message: 'Daçãos verificaçãos com sucesso.'
        });
    } catch (error) {
        console.error('[AUTH/VERIFY-DATA] Erro:', error.stack || error);
        res.status(500).json({ 
            message: 'Erro ao verificar dados.', 
            error: error.message 
        });
    }
});

// Passo 3: Alterar senha (com hash bcrypt para segurança)
router.post('/auth/change-password', async (req, res) => {
    try {
        const { userId, email, newPassword } = req.body;
        console.log('[AUTH/CHANGE-PASSWORD] Alterando senha para userId:', userId);
        
        if (!userId || !newPassword) {
            return res.status(400).json({ message: 'Daçãos incompletos.' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' });
        }
        
        // Verifica se usuário existe
        const [rows] = await pool.query('SELECT id FROM usuarios WHERE id = ? LIMIT 1', [userId]);
        
        if (!rows.length) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        
        // Gera hash bcrypt da nova senha (salt rounds = 10)
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        console.log('[AUTH/CHANGE-PASSWORD] Hash geração com sucesso');
        
        // Detecta qual campo usar para senha
        const [cols] = await pool.query('SHOW COLUMNS FROM usuarios');
        const colNames = cols.map(x => x.Field.toLowerCase());
        
        let passwordField = 'senha_hash'; // padrão
        if (colNames.includes('senha_hash')) {
            passwordField = 'senha_hash';
        } else if (colNames.includes('senha')) {
            passwordField = 'senha';
        } else if (colNames.includes('password')) {
            passwordField = 'password';
        }
        
        // Atualiza senha no banco com hash bcrypt
        await pool.query(`UPDATE usuarios SET ${passwordField} =  WHERE id = `, [hashedPassword, userId]);
        
        console.log('[AUTH/CHANGE-PASSWORD] ✅ Senha alterada com sucesso no banco');
        
        res.json({ 
            success: true, 
            message: 'Senha alterada com sucesso!'
        });
    } catch (error) {
        console.error('[AUTH/CHANGE-PASSWORD] Erro:', error.stack || error);
        res.status(500).json({ 
            message: 'Erro ao alterar senha.', 
            error: error.message 
        });
    }
});

// ===================== FUNCIONALIDADE "LEMBRAR-ME" =====================

// Cria tabela de refresh tokens se não existir
async function ensureRefreshTokensTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token VARCHAR(512) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                INDEX idx_user_id (user_id),
                INDEX idx_token (token),
                FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[AUTH] ✅ Tabela refresh_tokens verificada/criada');
    } catch (error) {
        console.error('[AUTH] ⚠️ Erro ao criar tabela refresh_tokens:', error.message);
    }
}

// Garante que a tabela existe ao inicializar
if (!DEV_MOCK) {
    ensureRefreshTokensTable();
}

// Limpa tokens expiraçãos (executa a cada 1 hora)
setInterval(async () => {
    if (!DEV_MOCK) {
        try {
            const [result] = await pool.query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
            if (result.affectedRows > 0) {
                console.log(`[AUTH/CLEANUP] 🗑️ ${result.affectedRows} tokens expiraçãos removidos`);
            }
        } catch (error) {
            console.error('[AUTH/CLEANUP] Erro ao limpar tokens:', error.message);
        }
    }
}, 60 * 60 * 1000); // 1 hora

// Criar refresh token para "Lembrar-me"
router.post('/auth/create-remember-token', async (req, res) => {
    try {
        const { userId, email } = req.body;
        console.log('[AUTH/REMEMBER-TOKEN] Criando token para userId:', userId);
        
        if (!userId || !email) {
            return res.status(400).json({ message: 'Daçãos incompletos.' });
        }
        
        // Verifica se usuário existe
        const [rows] = await pool.query('SELECT id, nome, email, role, setor FROM usuarios WHERE id =  AND email = ? LIMIT 1', [userId, email]);
        
        if (!rows.length) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        
        const user = rows[0];
        
        // Gera token seguro (30 dias de validade)
        const crypto = require('crypto');
        const rememberToken = crypto.randomBytes(64).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias
        
        // Salva token no banco
        await pool.query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, )',
            [userId, rememberToken, expiresAt]
        );
        
        console.log('[AUTH/REMEMBER-TOKEN] ✅ Token criado e salvo no banco');
        
        // Define cookie httpOnly com o token
        const cookieOptions = {
            httpOnly: true,
            path: '/',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dias
        };
        
        if (process.env.NODE_ENV === 'production') {
            cookieOptions.secure = true;
            cookieOptions.sameSite = 'strict';
        } else {
            cookieOptions.sameSite = 'lax';
        }
        
        res.cookie('rememberToken', rememberToken, cookieOptions);
        
        res.json({ 
            success: true, 
            message: 'Token de lembrar-me criado com sucesso.'
        });
    } catch (error) {
        console.error('[AUTH/REMEMBER-TOKEN] Erro:', error.stack || error);
        res.status(500).json({ 
            message: 'Erro ao criar token de lembrar-me.', 
            error: error.message 
        });
    }
});

// Validar refresh token e fazer login automático
router.post('/auth/validate-remember-token', async (req, res) => {
    try {
        const rememberToken = req.cookies.rememberToken;
        console.log('[AUTH/VALIDATE-REMEMBER] Validando token...');
        
        if (!rememberToken) {
            return res.status(401).json({ message: 'Token não encontrado.' });
        }
        
        // Busca token no banco
        const [rows] = await pool.query(`
            SELECT rt.*, u.id, u.nome, u.email, u.role, u.setor 
            FROM refresh_tokens rt
            JOIN usuarios u ON rt.user_id = u.id
            WHERE rt.token = ? AND rt.expires_at > NOW()
            LIMIT 1
        `, [rememberToken]);
        
        if (!rows.length) {
            // Token inválido ou expirado - limpa cookie
            res.clearCookie('rememberToken');
            return res.status(401).json({ message: 'Token inválido ou expiração.' });
        }
        
        const tokenData = rows[0];
        const user = {
            id: tokenData.id,
            nome: tokenData.nome,
            email: tokenData.email,
            role: tokenData.role,
            setor: tokenData.setor
        };
        
        console.log('[AUTH/VALIDATE-REMEMBER] ✅ Token válido para:', user.email);
        
        // Gera novo authToken JWT
        const authToken = jwt.sign(user, JWT_SECRET, { expiresIn: '8h' });
        
        // Define cookie authToken
        const cookieOptions = {
            httpOnly: true,
            path: '/',
            maxAge: 8 * 60 * 60 * 1000 // 8 horas
        };
        
        if (process.env.NODE_ENV === 'production') {
            cookieOptions.secure = true;
            cookieOptions.sameSite = 'strict';
        } else {
            cookieOptions.sameSite = 'lax';
        }
        
        res.cookie('authToken', authToken, cookieOptions);
        
        res.json({ 
            success: true, 
            user: user,
            message: 'Login automático realização com sucesso.'
        });
    } catch (error) {
        console.error('[AUTH/VALIDATE-REMEMBER] Erro:', error.stack || error);
        res.status(500).json({ 
            message: 'Erro ao validar token de lembrar-me.', 
            error: error.message 
        });
    }
});

// Remover token de lembrar-me (ao desmarcar checkbox)
router.post('/auth/remove-remember-token', async (req, res) => {
    try {
        const rememberToken = req.cookies.rememberToken;
        console.log('[AUTH/REMOVE-REMEMBER] Removendo token...');
        
        if (!rememberToken) {
            return res.json({ success: true, message: 'Nenhum token para remover.' });
        }
        
        // Remove token do banco
        await pool.query('DELETE FROM refresh_tokens WHERE token = ', [rememberToken]);
        
        // Limpa cookie
        res.clearCookie('rememberToken');
        
        console.log('[AUTH/REMOVE-REMEMBER] ✅ Token removido');
        
        res.json({ 
            success: true, 
            message: 'Token de lembrar-me removido com sucesso.'
        });
    } catch (error) {
        console.error('[AUTH/REMOVE-REMEMBER] Erro:', error.stack || error);
        res.status(500).json({ 
            message: 'Erro ao remover token de lembrar-me.', 
            error: error.message 
        });
    }
});

module.exports = router;
