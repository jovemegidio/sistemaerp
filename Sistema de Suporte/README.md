# Sistema de Suporte com IA

Um sistema completo de chamados (tickets) com atendimento por IA e transferência para atendente humano.

## 🚀 Funcionalidades

### Para Clientes
- Chat em tempo real com assistente virtual (IA)
- Transferência automática para atendente humano quando necessário
- Interface moderna e responsiva

### Para Atendentes (Admin)
- Dashboard com estatísticas em tempo real
- Lista de tickets organizados por status
- Chat em tempo real com clientes
- Assumir, responder e fechar tickets
- Base de conhecimento configurável
- Notificações de novos tickets

## 📋 Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn

## 🔧 Instalação

1. **Instalar dependências:**
```bash
npm install
```

2. **Iniciar o servidor:**
```bash
npm start
```

Ou em modo desenvolvimento (com hot reload):
```bash
npm run dev
```

3. **Acessar o sistema:**
   - **Chat do Cliente:** http://localhost:3000
   - **Painel Admin:** http://localhost:3000/admin

## 🎯 Como Usar

### Como Cliente
1. Acesse http://localhost:3000
2. Digite seu nome e e-mail (opcional)
3. Clique em "Iniciar conversa"
4. Converse com o assistente virtual
5. Se necessário, a IA transferirá para um atendente humano

### Como Atendente
1. Acesse http://localhost:3000/admin
2. Digite seu nome para se identificar
3. Veja os tickets no Dashboard ou na aba Tickets
4. Clique em um ticket para ver a conversa
5. Clique em "Assumir" para atender o cliente
6. Responda e feche o ticket quando resolver

## 🤖 Comportamento da IA

A IA responde automaticamente usando a base de conhecimento. Ela transfere para humano quando:
- Cliente pede explicitamente (ex: "falar com atendente")
- Detecta palavras-chave de urgência ou problemas complexos
- Não consegue resolver após 3 tentativas

### Gatilhos para transferência humana:
- "falar com atendente"
- "urgente"
- "reclamação"
- "não funciona"
- "reembolso"
- Entre outros...

## 📊 Status dos Tickets

| Status | Descrição |
|--------|-----------|
| `ai_handling` | Sendo atendido pela IA |
| `waiting_human` | Aguardando atendente humano |
| `human_handling` | Em atendimento por humano |
| `closed` | Ticket fechado/resolvido |

## 📁 Estrutura do Projeto

```
Sistema de Suporte/
├── server.js              # Servidor principal
├── package.json           # Dependências
├── .env                   # Configurações
├── database/
│   └── db.js             # Banco de dados SQLite
├── services/
│   └── aiService.js      # Serviço de IA
├── routes/
│   └── tickets.js        # Rotas da API
└── public/
    ├── index.html        # Chat do cliente
    └── admin/
        └── index.html    # Painel administrativo
```

## 🔌 API REST

### Tickets
- `GET /api/tickets` - Lista todos os tickets
- `GET /api/tickets?status=waiting_human` - Filtra por status
- `GET /api/tickets/:id` - Detalhes de um ticket
- `GET /api/tickets/:id/messages` - Mensagens de um ticket
- `GET /api/tickets/stats` - Estatísticas

### Base de Conhecimento
- `GET /api/tickets/knowledge/all` - Lista todo conhecimento
- `POST /api/tickets/knowledge` - Adiciona novo conhecimento

## ⚙️ Configuração

Edite o arquivo `.env`:

```env
PORT=3000
AI_ENABLED=true
```

## 🛠️ Tecnologias

- **Backend:** Node.js, Express, Socket.IO
- **Database:** SQLite (better-sqlite3)
- **Frontend:** HTML5, CSS3, JavaScript, Bootstrap 5
- **Comunicação:** WebSocket em tempo real

## 📝 Licença

MIT License
