<p align="center">
  <img src="public/images/Logo Monocromatico - Azul - Aluforce.webp" alt="ALUFORCE ERP" width="200"/>
</p>

<h1 align="center">🏭 ALUFORCE ERP</h1>

<p align="center">
  <strong>Sistema Completo de Gestão Empresarial para Indústria</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/versão-11.12-0066cc?style=for-the-badge" alt="Versão"/>
  <img src="https://img.shields.io/badge/status-Produção-00cc66?style=for-the-badge" alt="Status"/>
  <img src="https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL"/>
</p>

<p align="center">
  <a href="#-sobre">Sobre</a> •
  <a href="#-módulos">Módulos</a> •
  <a href="#-tecnologias">Tecnologias</a> •
  <a href="#-instalação">Instalação</a> •
  <a href="#-screenshots">Screenshots</a> •
  <a href="#-licença">Licença</a>
</p>

---

## 📋 Sobre

O **ALUFORCE ERP** é uma solução empresarial completa e integrada, desenvolvida especialmente para a **indústria de alumínio e metalurgia**. O sistema oferece controle total sobre todas as operações da empresa, desde vendas e compras até produção e financeiro.

### ✨ Destaques

- 🔄 **Integração Total** — Todos os módulos conectados em tempo real
- 📊 **Dashboard Executivo** — KPIs e indicadores de performance
- 🔐 **Segurança Avançada** — Autenticação JWT + controle de permissões
- 📱 **Interface Responsiva** — Funciona em desktop, tablet e mobile
- 🌐 **100% Web** — Acesse de qualquer lugar, sem instalação
- 🤖 **IA Integrada** — Assistente virtual para suporte e consultas

---

## 🚀 Módulos

<table>
<tr>
<td width="50%">

### 🛒 Vendas
- Gestão de pedidos e orçamentos
- Kanban visual de vendas
- Controle de comissões
- Tabelas de preços dinâmicas
- Análise de crédito do cliente

</td>
<td width="50%">

### 📦 Compras
- Requisições e cotações
- Gestão de fornecedores
- Pedidos de compra
- Entrada de notas fiscais
- Controle de materiais

</td>
</tr>
<tr>
<td width="50%">

### 🏭 PCP - Produção
- Ordens de produção
- Programação de faturamento
- Apontamentos de produção
- Controle de materiais
- Relatórios Excel automáticos

</td>
<td width="50%">

### 💰 Financeiro
- Contas a pagar e receber
- Fluxo de caixa
- Conciliação bancária
- DRE e relatórios gerenciais
- Plano de contas

</td>
</tr>
<tr>
<td width="50%">

### 👥 Recursos Humanos
- Cadastro de funcionários
- Cargos e funções
- Folha de pagamento
- Ponto eletrônico
- Gestão de férias e benefícios

</td>
<td width="50%">

### 🧾 NF-e & Logística
- Emissão de NF-e e NFS-e
- Importação de XML
- Configuração de impostos
- Manifestação do destinatário
- Controle de expedição

</td>
</tr>
</table>

---

## 🛠️ Tecnologias

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" alt="Express"/>
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white" alt="MySQL"/>
  <img src="https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socket.io&logoColor=white" alt="Socket.io"/>
  <img src="https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white" alt="JWT"/>
  <img src="https://img.shields.io/badge/Chart.js-FF6384?style=flat-square&logo=chart.js&logoColor=white" alt="Chart.js"/>
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML5"/>
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" alt="CSS3"/>
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript"/>
</p>

### Stack Principal

| Camada | Tecnologia |
|--------|------------|
| **Backend** | Node.js 18+ com Express.js |
| **Banco de Dados** | MySQL 8.0 |
| **Autenticação** | JWT (JSON Web Tokens) |
| **Real-time** | Socket.io |
| **Frontend** | HTML5, CSS3, JavaScript ES6+ |
| **Gráficos** | Chart.js |
| **PDF/Excel** | PDFKit, ExcelJS |
| **Deploy** | Railway (API) + GitHub Pages (Frontend) |

---

## 📥 Instalação

### Pré-requisitos

- **Node.js** 18.x ou superior
- **MySQL** 8.0 ou superior
- **Git**

### Passo a Passo

```bash
# 1. Clone o repositório
git clone https://github.com/jovemegidio/sistemaerp.git
cd sistemaerp

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# 4. Execute as migrações do banco
npm run migrate

# 5. Inicie o servidor
npm start
```

### Variáveis de Ambiente

```env
# Servidor
PORT=3000
NODE_ENV=production

# Banco de Dados
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=aluforce_vendas

# Segurança
JWT_SECRET=sua_chave_secreta_muito_segura
SESSION_SECRET=outra_chave_secreta
```

---

## 🔐 Acesso ao Sistema

### Credenciais Padrão

| Perfil | Usuário | Senha |
|--------|---------|-------|
| Administrador | admin@aluforce.com.br | Aluforce2025! |

> ⚠️ **Importante**: Altere a senha após o primeiro acesso!

### URLs de Acesso

| Ambiente | URL |
|----------|-----|
| **Frontend (GitHub Pages)** | https://jovemegidio.github.io/sistemaerp/ |
| **API (Railway)** | https://sistemaerp-production-a924.up.railway.app |

---

## 📁 Estrutura do Projeto

```
ALUFORCE-V.2/
├── 📂 api/                     # Rotas de API
├── 📂 modules/                 # Módulos do sistema
│   ├── 📂 Vendas/             # Módulo de vendas
│   ├── 📂 Compras/            # Módulo de compras
│   ├── 📂 PCP/                # Produção
│   ├── 📂 Financeiro/         # Financeiro
│   ├── 📂 RH/                 # Recursos Humanos
│   ├── 📂 NFe/                # Notas Fiscais
│   └── 📂 _shared/            # Componentes compartilhados
├── 📂 public/                  # Arquivos estáticos
│   ├── 📂 css/                # Estilos
│   ├── 📂 js/                 # Scripts
│   └── 📂 images/             # Imagens
├── 📂 src/                     # Código fonte
│   ├── 📂 middleware/         # Middlewares
│   ├── 📂 nfe/                # Serviços NF-e
│   └── 📂 routes/             # Rotas
├── 📄 server.js               # Servidor principal
├── 📄 package.json            # Dependências
└── 📄 .env                    # Configurações
```

---

## 📊 Screenshots

<p align="center">
  <img src="docs/screenshots/dashboard.png" alt="Dashboard" width="80%"/>
  <br/>
  <em>Dashboard Executivo com KPIs em tempo real</em>
</p>

---

## 🔧 Scripts Disponíveis

```bash
# Iniciar em produção
npm start

# Iniciar em desenvolvimento (com hot-reload)
npm run dev

# Executar migrações
npm run migrate

# Executar testes
npm test

# Build para produção
npm run build
```

---

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add: nova funcionalidade'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👨‍💻 Autor

<p align="center">
  <strong>ALUFORCE Indústria de Alumínio</strong><br/>
  Desenvolvido com ❤️ para otimizar processos industriais
</p>

<p align="center">
  <a href="https://github.com/jovemegidio/sistemaerp">
    <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
  </a>
</p>

---

<p align="center">
  <sub>© 2024-2026 ALUFORCE ERP. Todos os direitos reservados.</sub>
</p>
