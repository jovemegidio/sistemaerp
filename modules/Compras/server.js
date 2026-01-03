const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');
require('dotenv').config();

// Importar security middleware
const {
    generalLimiter,
    sanitizeInput,
    securityHeaders
} = require('../../security-middleware');

const app = express();
const PORT = process.env.PORT || 3002;

// Security Middleware
app.use(securityHeaders());
app.use(generalLimiter);
app.use(sanitizeInput);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/css', express.static(path.join(__dirname, '../../css')));
app.use('/js', express.static(path.join(__dirname, '../../js')));

// Rotas de páginas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/pedidos', (req, res) => {
    res.sendFile(path.join(__dirname, 'pedidos.html'));
});

app.get('/requisicoes', (req, res) => {
    res.sendFile(path.join(__dirname, 'requisicoes.html'));
});

app.get('/cotacoes', (req, res) => {
    res.sendFile(path.join(__dirname, 'cotacoes.html'));
});

app.get('/fornecedores', (req, res) => {
    res.sendFile(path.join(__dirname, 'fornecedores-new.html'));
});

app.get('/gestao-estoque', (req, res) => {
    res.sendFile(path.join(__dirname, 'gestao-estoque-new.html'));
});

app.get('/relatorios', (req, res) => {
    res.sendFile(path.join(__dirname, 'relatorios.html'));
});

// ============ API ROUTES ============

// Importar rotas disponíveis
const fornecedoresRoutes = require('./api/fornecedores');

// Usar rotas
app.use('/api/compras/fornecedores', fornecedoresRoutes);

// Dashboard endpoint
app.get('/api/compras/dashboard', (req, res) => {
    // Retornar métricas do dashboard
    res.json({
        total_pedidos: 268,
        pedidos_por_status: [
            { status: 'pendente', quantidade: 45 },
            { status: 'aprovado', quantidade: 123 },
            { status: 'recebido', quantidade: 89 },
            { status: 'cancelado', quantidade: 11 }
        ],
        valor_total_pedidos: 1250890.50,
        requisicoes_pendentes: 12,
        cotacoes_abertas: 8,
        fornecedores_ativos: 67
    });
});

app.post('/api/pedidos', (req, res) => {
    const pedido = req.body;
    console.log('Novo pedido recebido:', pedido);
    
    // Simular salvamento do pedido
    const novoPedido = {
        id: 'PC-' + Date.now().toString().slice(-6),
        ...pedido,
        dataCriacao: new Date().toISOString(),
        status: 'pendente'
    };

    res.json({
        success: true,
        message: 'Pedido criado com sucesso',
        pedido: novoPedido
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Erro:', err);
    res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: err.message 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// Inicializar servidor
async function startServer() {
    try {
        // Inicializar banco de dados
        await initDatabase();
        console.log('✅ Banco de dados inicializado');
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`🚀 Servidor de Compras rodando em http://localhost:${PORT}`);
            console.log(`📊 Dashboard: http://localhost:${PORT}`);
            console.log(`🛒 Pedidos: http://localhost:${PORT}/pedidos`);
            console.log(`📝 Requisições: http://localhost:${PORT}/requisicoes`);
            console.log(`💰 Cotações: http://localhost:${PORT}/cotacoes`);
            console.log(`👥 Fornecedores: http://localhost:${PORT}/fornecedores`);
        });
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;