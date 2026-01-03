# Autenticação Unificada - Módulo PCP
**Data**: 01/12/2025

## 🎯 Objetivo
Integrar o módulo PCP com o sistema de autenticação centralizado do dashboard principal, alinhando com os outros módulos do sistema (Vendas, RH, Compras, etc.).

## 🔄 Mudanças Implementadas

### 1. Novo Arquivo: `auth-check-pcp.js`
**Localização**: `modules/PCP/auth-check-pcp.js`

Sistema de autenticação unificada que:
- ✅ Verifica autenticação via endpoint `/api/me` (mesmo dos outros módulos)
- ✅ Armazena dados do usuário no localStorage para compatibilidade
- ✅ Redireciona para `/login.html` se não autenticado
- ✅ Preserva URL de retorno (`returnTo`) para redirecionamento após login
- ✅ Atualiza interface com nome, email e avatar do usuário
- ✅ Dispara evento personalizado `pcpAuthSuccess` quando autenticado
- ✅ Suporta modo teste via parâmetro `?no-auth=1` ou `?skip-auth=1`

### 2. Atualização: `index.html`
**Mudanças**:
```html
<!-- ANTES -->
<script src="auth-redirect.js"></script>

<!-- DEPOIS -->
<script src="auth-check-pcp.js"></script>
```

**Ordem de Carregamento dos Scripts**:
1. Socket.io
2. Chart.js
3. **auth-check-pcp.js** (PRIMEIRO - bloqueia até autenticar)
4. Módulos PCP (pcp.js, aplicar-tema-premium.js, etc.)
5. pcp_modern.js (navegação principal)
6. Scripts auxiliares

### 3. Arquivo Antigo: `auth-redirect.js`
**Status**: Mantido para compatibilidade, mas **não é mais usado**

Diferenças:
- `auth-redirect.js`: Verificava via `/api/pcp/me` (endpoint específico)
- `auth-check-pcp.js`: Verifica via `/api/me` (endpoint unificado do sistema)

## 🔗 Integração com Sistema Principal

### Endpoint de Autenticação
- **URL**: `GET /api/me`
- **Localização**: `server.js` (linha 6572)
- **Headers**: `credentials: 'include'` (envia cookies automaticamente)
- **Response**: 
  ```json
  {
    "user": {
      "id": 1,
      "nome": "João Silva",
      "email": "joao@empresa.com",
      "role": "admin",
      "avatar": "/uploads/foto.jpg",
      "permissoes_pcp": true
    }
  }
  ```

### Fluxo de Autenticação
```
1. Usuário acessa /PCP/index.html
   ↓
2. auth-check-pcp.js carrega PRIMEIRO
   ↓
3. Faz request para /api/me com cookies
   ↓
4a. Se 200 OK → Salva dados, carrega módulos PCP
4b. Se 401/403 → Redireciona para /login.html?returnTo=/PCP/index.html
   ↓
5. Após login bem-sucedido → Retorna para /PCP/index.html
   ↓
6. Módulos PCP carregam normalmente
```

## 📦 Dados Armazenados no LocalStorage

Após autenticação bem-sucedida:
```javascript
localStorage.setItem('userData', JSON.stringify(user));
localStorage.setItem('user', JSON.stringify(user));
localStorage.setItem('user_data', JSON.stringify(user));
localStorage.setItem('authToken', 'unified-session-active');
localStorage.setItem('token', 'unified-session-active');
localStorage.setItem('accessToken', 'unified-session-active');
```

**Nota**: Os tokens "fictícios" (`'unified-session-active'`) são para compatibilidade com código legado que verifica `localStorage.getItem('authToken')`.

## 🎨 Atualização de Interface

O script atualiza automaticamente:
- **Nome do usuário**: `.user-name`, `#userName`, `.topbar-user-name`
- **Email**: `.user-email`, `#userEmail`
- **Avatar**: `.user-avatar`, `#userAvatar`, `.topbar-user-avatar img`

## 🔒 Segurança

- ✅ **HttpOnly Cookies**: Token JWT armazenado em cookie HttpOnly no servidor
- ✅ **Sem Token no LocalStorage**: Apenas dados do usuário (não sensíveis)
- ✅ **Verificação Server-Side**: Cada request valida JWT no servidor
- ✅ **CORS Configurado**: `credentials: 'include'` para envio de cookies

## 🧪 Testando

### Teste 1: Login Normal
```
1. Acesse: http://localhost:3000/login.html
2. Faça login com credenciais válidas
3. Acesse: http://localhost:3000/PCP/index.html
4. Console deve mostrar: ✅ [PCP] Usuário autenticado
```

### Teste 2: Acesso Sem Login
```
1. Limpe cookies e localStorage
2. Acesse: http://localhost:3000/PCP/index.html
3. Deve redirecionar para: /login.html?returnTo=/PCP/index.html
```

### Teste 3: Modo Teste (Sem Autenticação)
```
Acesse: http://localhost:3000/PCP/index.html?no-auth=1
Console deve mostrar: ⏭️ [PCP] Pulando verificação de autenticação
```

## 📊 Console Logs

Logs esperados no console do navegador:
```
🔐 [PCP] Sistema de autenticação unificada carregado
⚡ [PCP] Verificação imediata de autenticação...
🔐 [PCP] Verificando autenticação unificada...
📡 [PCP] Status da resposta: 200
✅ [PCP] Usuário autenticado: João Silva
🎨 [PCP] Atualizando interface do usuário
✅ [PCP] Sistema de autenticação unificada inicializado
```

## 🚀 Próximos Passos

1. ✅ Autenticação unificada implementada
2. ⏳ Testar navegação entre páginas
3. ⏳ Validar carregamento de dados
4. ⏳ Testar modais e funcionalidades
5. ⏳ Remover arquivo `auth-redirect.js` se confirmado que não é mais necessário

## 🔗 Arquivos Relacionados

- `modules/PCP/auth-check-pcp.js` - Script de autenticação unificada (NOVO)
- `modules/PCP/index.html` - Página principal (ATUALIZADO)
- `modules/PCP/auth-redirect.js` - Script antigo (NÃO USADO)
- `server.js` - Endpoint `/api/me` (linha 6572)
- `modules/Vendas/public/auth-check.js` - Referência (mesmo padrão)

## 📝 Compatibilidade

Este sistema é compatível com:
- ✅ Módulo de Vendas
- ✅ Módulo de RH
- ✅ Módulo de Compras
- ✅ Módulo Financeiro
- ✅ Módulo NFe
- ✅ Dashboard Principal

Todos usam o mesmo endpoint `/api/me` e o mesmo sistema de cookies HttpOnly.
