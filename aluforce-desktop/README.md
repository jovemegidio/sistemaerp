# ALUFORCE Desktop

Sistema ERP Desktop completo para gestão empresarial, construído com tecnologias modernas.

![ALUFORCE](https://img.shields.io/badge/ALUFORCE-ERP%20Desktop-blue)
![Tauri](https://img.shields.io/badge/Tauri-2.0-orange)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Rust](https://img.shields.io/badge/Rust-Backend-orange)

## 📋 Índice

- [Sobre](#sobre)
- [Funcionalidades](#funcionalidades)
- [Requisitos](#requisitos)
- [Instalação para Desenvolvimento](#instalação-para-desenvolvimento)
- [Build e Distribuição](#build-e-distribuição)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Tecnologias](#tecnologias)

## 📖 Sobre

ALUFORCE Desktop é um sistema ERP completo para Windows, similar a soluções tradicionais como TOTVS. O sistema oferece gestão integrada de:

- **Vendas**: Clientes, pedidos, produtos e dashboards
- **Compras**: Fornecedores, pedidos de compra
- **Financeiro**: Contas a pagar/receber, bancos, fluxo de caixa
- **PCP**: Ordens de produção, apontamentos
- **RH**: Funcionários, ponto eletrônico, férias
- **NF-e**: Emissão e gestão de notas fiscais

## ✨ Funcionalidades

### Módulos Principais

| Módulo | Funcionalidades |
|--------|-----------------|
| **Vendas** | Cadastro de clientes, gestão de pedidos, catálogo de produtos, dashboard de vendas |
| **Compras** | Cadastro de fornecedores, pedidos de compra, recebimento |
| **Financeiro** | Contas a pagar/receber, contas bancárias, fluxo de caixa, relatórios |
| **PCP** | Ordens de produção, apontamento de horas, controle de produção |
| **RH** | Cadastro de funcionários, controle de ponto, gestão de férias |
| **NF-e** | Emissão de notas fiscais, consulta SEFAZ, importação XML |
| **Configurações** | Dados da empresa, usuários, backup/restore |

### Características Técnicas

- ✅ Aplicação desktop nativa para Windows
- ✅ Interface moderna com Material UI
- ✅ Banco de dados local SQLite (offline-first)
- ✅ Backend em Rust de alta performance
- ✅ Instalador profissional (NSIS)
- ✅ Atalhos no Desktop e Menu Iniciar
- ✅ Instância única (evita múltiplas execuções)
- ✅ Desinstalador incluído

## 💻 Requisitos

### Para Usuários Finais
- Windows 10/11 (64-bit)
- 4GB RAM mínimo
- 500MB espaço em disco

### Para Desenvolvimento
- **Node.js** 18+ ([Download](https://nodejs.org))
- **Rust** 1.70+ ([Download](https://rustup.rs))
- **Visual Studio Build Tools** com "Desktop development with C++"
- **Git** (opcional, para controle de versão)

## 🛠️ Instalação para Desenvolvimento

### 1. Clone ou copie o projeto

```bash
cd "C:\Users\egidio\Documents\Sistema - ALUFORCE - V.2"
cd aluforce-desktop
```

### 2. Instale as dependências

```bash
# Dependências do frontend (Node.js)
npm install

# As dependências do Rust são instaladas automaticamente na primeira build
```

### 3. Execute em modo desenvolvimento

```bash
# Inicia o servidor de desenvolvimento com hot-reload
npm run tauri dev
```

O aplicativo será aberto automaticamente. Alterações no código React são aplicadas instantaneamente.

### Comandos Úteis

```bash
# Apenas frontend (sem Tauri)
npm run dev

# Verificar erros TypeScript
npm run lint

# Build do frontend apenas
npm run build

# Build completo com instalador
npm run tauri build
```

## 📦 Build e Distribuição

### Build Automático

Execute um dos scripts de build:

**PowerShell (recomendado):**
```powershell
.\build.ps1
```

**Prompt de Comando:**
```cmd
build.bat
```

### Build Manual

```bash
# 1. Instalar dependências
npm install

# 2. Build de produção
npm run tauri build
```

### Localização dos Instaladores

Após o build, os instaladores estarão em:

```
src-tauri/target/release/bundle/
├── nsis/
│   └── ALUFORCE Desktop_1.0.0_x64-setup.exe  <- Instalador NSIS
└── msi/
    └── ALUFORCE Desktop_1.0.0_x64.msi        <- Instalador MSI
```

### Opções de Instalador

| Tipo | Formato | Características |
|------|---------|-----------------|
| **NSIS** | .exe | Wizard de instalação, mais flexível |
| **MSI** | .msi | Padrão Windows, deploy corporativo |

## 📁 Estrutura do Projeto

```
aluforce-desktop/
├── src/                          # Frontend React
│   ├── components/               # Componentes reutilizáveis
│   │   ├── common/              # Componentes comuns
│   │   └── layout/              # Layout (Header, Sidebar)
│   ├── modules/                  # Módulos do sistema
│   │   ├── vendas/              # Módulo de Vendas
│   │   ├── compras/             # Módulo de Compras
│   │   ├── financeiro/          # Módulo Financeiro
│   │   ├── pcp/                 # Módulo PCP
│   │   ├── rh/                  # Módulo RH
│   │   └── nfe/                 # Módulo NF-e
│   ├── pages/                    # Páginas principais
│   ├── store/                    # Redux store e slices
│   ├── theme/                    # Tema Material UI
│   ├── App.tsx                   # Componente principal
│   └── main.tsx                  # Ponto de entrada
├── src-tauri/                    # Backend Rust + Configuração Tauri
│   ├── src/
│   │   ├── commands/            # Comandos Tauri (API)
│   │   ├── database/            # SQLite e migrações
│   │   ├── lib.rs               # Biblioteca principal
│   │   └── main.rs              # Ponto de entrada Rust
│   ├── Cargo.toml               # Dependências Rust
│   └── tauri.conf.json          # Configuração Tauri
├── public/                       # Arquivos estáticos
├── package.json                  # Dependências Node.js
├── vite.config.ts               # Configuração Vite
├── tsconfig.json                # Configuração TypeScript
└── README.md                    # Este arquivo
```

## 🔧 Tecnologias

### Frontend
- **React 18** - Biblioteca UI
- **TypeScript 5** - Tipagem estática
- **Material UI 5** - Componentes visuais
- **Redux Toolkit** - Gerenciamento de estado
- **React Router 6** - Navegação
- **Vite** - Build tool

### Backend
- **Tauri 2.0** - Framework desktop
- **Rust** - Linguagem backend
- **SQLite** - Banco de dados local
- **rusqlite** - Driver SQLite para Rust
- **bcrypt** - Criptografia de senhas
- **serde** - Serialização JSON

### Ferramentas de Build
- **NSIS** - Instalador Windows
- **WiX** - Instalador MSI

## 🗄️ Banco de Dados

O banco SQLite é criado automaticamente em:
```
%APPDATA%\com.aluforce.desktop\aluforce.db
```

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `usuarios` | Usuários do sistema |
| `empresa` | Dados da empresa |
| `clientes` | Cadastro de clientes |
| `fornecedores` | Cadastro de fornecedores |
| `produtos` | Catálogo de produtos |
| `pedidos_venda` | Pedidos de venda |
| `itens_pedido_venda` | Itens dos pedidos |
| `pedidos_compra` | Pedidos de compra |
| `contas_pagar` | Contas a pagar |
| `contas_receber` | Contas a receber |
| `contas_bancarias` | Contas bancárias |
| `funcionarios` | Cadastro de funcionários |
| `ordens_producao` | Ordens de produção |
| `notas_fiscais` | Notas fiscais |
| `configuracoes` | Configurações do sistema |

## 👤 Credenciais Padrão

Após a primeira execução, use:

- **Usuário:** `admin`
- **Senha:** `admin123`

⚠️ **IMPORTANTE:** Altere a senha padrão após o primeiro acesso!

## 📝 Licença

Proprietário - ALUFORCE © 2025

---

## 🆘 Suporte

Para suporte técnico ou dúvidas, entre em contato com a equipe de desenvolvimento.
