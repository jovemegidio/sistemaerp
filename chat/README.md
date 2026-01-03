# Sistema de Chat de Suporte

Sistema de chat em tempo real para permitir que colaboradores entrem em contato com o suporte (admin). Desenvolvido com Node.js, Express e Socket.io.

## 📋 Características

- ✅ Chat em tempo real usando WebSocket (Socket.io)
- ✅ Interface para colaboradores
- ✅ Painel administrativo para gerenciar múltiplas conversas
- ✅ Notificações sonoras para novas mensagens
- ✅ Histórico de conversas
- ✅ Indicadores de status (aguardando/em atendimento)
- ✅ Design moderno e responsivo
- ✅ Fácil de configurar e usar

## 🚀 Instalação

### Pré-requisitos

- Node.js (versão 14 ou superior)
- npm (gerenciador de pacotes do Node.js)

### Passos para instalação

1. **Abra o terminal no diretório do projeto**

2. **Instale as dependências:**
```bash
npm install
```

3. **Inicie o servidor:**
```bash
npm start
```

Para desenvolvimento com auto-reload:
```bash
npm run dev
```

4. **Acesse o sistema:**
   - **Colaboradores:** http://localhost:3000
   - **Admin:** http://localhost:3000/admin

## 💻 Como Usar

### Para Colaboradores

1. Acesse `http://localhost:3000`
2. Preencha seu nome e email
3. Clique em "Iniciar Chat"
4. Aguarde um atendente aceitar sua conversa
5. Envie suas mensagens

### Para Administradores (Suporte)

1. Acesse `http://localhost:3000/admin`
2. Visualize a lista de usuários conectados na barra lateral
3. Clique em um usuário para iniciar o atendimento
4. Responda as mensagens em tempo real
5. Encerre o chat quando finalizar o atendimento

## 📁 Estrutura do Projeto

```
Sistema de Chat/
├── server.js                 # Servidor Node.js com Socket.io
├── package.json             # Dependências e scripts
├── README.md                # Documentação
└── public/                  # Arquivos estáticos
    ├── index.html           # Interface do colaborador
    ├── admin.html           # Painel administrativo
    ├── css/
    │   ├── style.css        # Estilos do colaborador
    │   └── admin.css        # Estilos do admin
    └── js/
        ├── user.js          # Lógica do colaborador
        └── admin.js         # Lógica do admin
```

## 🔧 Configuração

### Alterar a Porta

Por padrão, o servidor roda na porta 3000. Para alterar:

1. Abra o arquivo `server.js`
2. Modifique a linha:
```javascript
const PORT = process.env.PORT || 3000;
```

Ou defina a variável de ambiente:
```bash
$env:PORT=8080; npm start
```

## 🌐 Deploy em Produção

### Considerações importantes:

1. **Banco de Dados:** O sistema atual armazena dados em memória. Para produção, integre um banco de dados (MongoDB, PostgreSQL, etc.)

2. **Autenticação:** Adicione autenticação para o painel administrativo

3. **HTTPS:** Use certificado SSL para comunicação segura

4. **Escala:** Configure Redis para múltiplas instâncias do Socket.io

## 🛠️ Tecnologias Utilizadas

- **Backend:**
  - Node.js
  - Express.js
  - Socket.io

- **Frontend:**
  - HTML5
  - CSS3
  - JavaScript (ES6+)
  - Socket.io Client

## 📝 Funcionalidades Futuras

- [ ] Banco de dados para persistência
- [ ] Autenticação de administradores
- [ ] Upload de arquivos
- [ ] Emojis e formatação de texto
- [ ] Notificações desktop
- [ ] Transcrição de conversas
- [ ] Métricas e relatórios
- [ ] Chat por categorias/departamentos

## 🐛 Solução de Problemas

### Erro ao instalar dependências
```bash
# Limpe o cache do npm
npm cache clean --force

# Tente novamente
npm install
```

### Porta já em uso
```bash
# Altere a porta usando variável de ambiente
$env:PORT=4000; npm start
```

### Problemas de conexão Socket.io
- Verifique se o firewall não está bloqueando a porta
- Certifique-se de que não há proxy interferindo

## 📄 Licença

MIT License - Sinta-se livre para usar e modificar este projeto.

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para:
- Reportar bugs
- Sugerir novas funcionalidades
- Melhorar a documentação
- Enviar pull requests

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no repositório do projeto.

---

**Desenvolvido com ❤️ para facilitar a comunicação entre colaboradores e suporte**
