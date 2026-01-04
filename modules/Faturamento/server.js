// Servidor principal do sistema de faturamento
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

// Importar security middleware
const {
    generalLimiter,
    sanitizeInput,
    securityHeaders
} = require('../../security-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(securityHeaders());
app.use(generalLimiter);
app.use(sanitizeInput);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use('/modules/Faturamento/public', express.static(path.join(__dirname, 'public')));

// Rota API de faturamento
const faturamentoRouter = require('./api/faturamento');
app.use('/api/faturamento', faturamentoRouter);

// Rota inicial
app.get('/', (req, res) => {
  res.json({
    message: 'Sistema de Faturamento NFe - ALUFORCE',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      interface: `http://localhost:${PORT}/modules/Faturamento/public/index.html`,
      api: `http://localhost:${PORT}/api/faturamento`,
      docs: `http://localhost:${PORT}/api/faturamento/docs`
    }
  });
});

// Rota de documentação da API
app.get('/api/faturamento/docs', (req, res) => {
  res.json({
    title: 'API de Faturamento NFe',
    version: '1.0.0',
    endpoints: [
      {
        method: 'POST',
        path: '/api/faturamento/gerar-nfe',
        description: 'Gera uma NFe a partir de um pedido'
      },
      {
        method: 'POST',
        path: '/api/faturamento/enviar-sefaz',
        description: 'Envia NFe para autorização da SEFAZ'
      },
      {
        method: 'GET',
        path: '/api/faturamento/danfe/:nfeId',
        description: 'Gera o DANFE (PDF) da NFe'
      },
      {
        method: 'POST',
        path: '/api/faturamento/cancelar',
        description: 'Cancela uma NFe autorizada'
      },
      {
        method: 'POST',
        path: '/api/faturamento/carta-correcao',
        description: 'Envia carta de correção eletrônica'
      },
      {
        method: 'GET',
        path: '/api/faturamento/consultar/:chaveAcesso',
        description: 'Consulta NFe na SEFAZ'
      },
      {
        method: 'GET',
        path: '/api/faturamento/sefaz/status',
        description: 'Verifica status do serviço SEFAZ'
      }
    ]
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('🚀 ========================================');
  console.log('🚀 Sistema de Faturamento NFe - ALUFORCE');
  console.log('🚀 ========================================');
  console.log(`📡 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Interface: http://localhost:${PORT}/modules/Faturamento/public/index.html`);
  console.log(`📊 API: http://localhost:${PORT}/api/faturamento`);
  console.log(`📖 Docs: http://localhost:${PORT}/api/faturamento/docs`);
  console.log('🚀 ========================================');
  console.log(`🔧 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 Banco: ${process.env.DB_NAME}`);
  console.log(`🔐 NFe Ambiente: ${process.env.NFE_AMBIENTE == 1  'PRODUÇÃO ⚠️' : 'HOMOLOGAÇÃO 🧪'}`);
  console.log('🚀 ========================================');
});

module.exports = app;
