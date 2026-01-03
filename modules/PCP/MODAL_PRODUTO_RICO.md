# 🎨 MODAL RICO DE EDIÇÃO DE PRODUTO

## 📋 Visão Geral

Modal profissional e rico em funcionalidades para edição de produtos no módulo PCP, desenvolvido com base no design solicitado pelo usuário.

---

## ✨ Características Principais

### 🎯 Interface Moderna
- **Design Gradient**: Headers e botões com gradientes modernos
- **Abas Organizadas**: 7 abas para organizar informações
- **Responsivo**: Adaptável a desktop, tablet e mobile
- **Acessível**: Suporte a navegação por teclado (ESC para fechar)

### 📑 Abas do Modal

#### 1️⃣ **Informações**
- Identificação (Código, SKU, GTIN)
- Descrição do produto
- Definição do tipo (Simples, Kit, Com Variações)
- Unidade de medida
- Peso e volume

#### 2️⃣ **Estoque**
- Cards informativos (atual, mínimo, máximo, status)
- Controle de estoque
- Controle de lote
- Localização no estoque (corredor, prateleira)

#### 3️⃣ **Custos e Preços**
- Preço de venda
- Custo unitário
- **Cálculo automático de margem de lucro**
- Recomendações fiscais (NCM, ICMS)

#### 4️⃣ **Fornecedores**
- Cadastro de fornecedor principal
- Informações de contato

#### 5️⃣ **Características**
- Características técnicas detalhadas
- Especificações do produto

#### 6️⃣ **Observações**
- Notas gerais
- Recomendações fiscais

#### 7️⃣ **Histórico**
- Histórico de alterações
- Registro de modificações

---

## 🚀 Como Usar

### Abrir Modal
```javascript
// Com dados de produto existente
abrirModalProdutoRico({
    codigo: 'POT70BR',
    sku: 'POT70BR',
    gtin: '7891234567890',
    nome: 'Cabo Potência 70mm',
    descricao: 'Cabo elétrico de potência',
    quantidade_estoque: 150,
    estoque_minimo: 50,
    estoque_maximo: 500,
    preco_venda: 25.90,
    custo_unitario: 15.00
});

// Novo produto (vazio)
abrirModalProdutoRico();
```

### Trocar Abas
```javascript
trocarAbaRico('estoque');  // Vai para aba de estoque
trocarAbaRico('custos');   // Vai para aba de custos
```

### Salvar Produto
```javascript
salvarProdutoRico(); // Valida e salva automaticamente
```

---

## 🎨 Componentes Visuais

### Toggle Switches
```html
<div class="produto-toggle-group">
    <div class="produto-toggle-label">
        <i class="fas fa-cube"></i>
        Produto Simples
    </div>
    <label class="produto-toggle-switch">
        <input type="checkbox" id="rico-simples" checked>
        <span class="produto-toggle-slider"></span>
    </label>
</div>
```

### Cards de Informação
```html
<div class="produto-info-cards">
    <div class="produto-info-card">
        <div class="produto-info-card-icon">
            <i class="fas fa-boxes"></i>
        </div>
        <div class="produto-info-card-value">150</div>
        <div class="produto-info-card-label">Estoque Atual</div>
    </div>
</div>
```

### Status Badges
```html
<span class="produto-status-badge status-success">Ativo</span>
<span class="produto-status-badge status-warning">Baixo Estoque</span>
<span class="produto-status-badge status-danger">Crítico</span>
```

---

## 📦 Arquivos do Sistema

### Estrutura
```
modules/PCP/
├── modal-produto-rico.html      # HTML do modal completo
├── modal-produto-rico.css       # Estilos do modal
├── index.html                   # Integração (carrega modal)
└── MODAL_PRODUTO_RICO.md        # Esta documentação
```

### Integração no index.html
```html
<!-- Link do CSS no <head> -->
<link rel="stylesheet" href="modal-produto-rico.css">

<!-- Script de carregamento antes do </body> -->
<script>
    fetch('modal-produto-rico.html')
        .then(response => response.text())
        .then(html => {
            const div = document.createElement('div');
            div.innerHTML = html;
            document.body.appendChild(div);
        });
</script>
```

---

## 🔧 Funcionalidades JavaScript

### Principais Funções

#### `abrirModalProdutoRico(produto)`
Abre o modal e preenche com dados do produto.

**Parâmetros:**
- `produto` (Object): Dados do produto para edição

**Exemplo:**
```javascript
abrirModalProdutoRico({
    codigo: 'POT70BR',
    nome: 'Cabo Potência 70mm',
    preco_venda: 25.90
});
```

#### `fecharModalProdutoRico()`
Fecha o modal e restaura scroll da página.

#### `trocarAbaRico(nomeAba)`
Alterna entre as abas do modal.

**Abas disponíveis:**
- `info` - Informações
- `estoque` - Estoque
- `custos` - Custos e Preços
- `fornecedores` - Fornecedores
- `caracteristicas` - Características
- `observacoes` - Observações
- `historico` - Histórico

#### `calcularMargemRica()`
Calcula automaticamente a margem de lucro.

**Fórmula:**
```
Margem = ((Preço - Custo) / Preço) × 100
```

#### `salvarProdutoRico()`
Valida e salva o produto via API.

**Endpoint:** `PUT /api/pcp/produtos`

**Validações:**
- Campos obrigatórios preenchidos
- Formato de dados correto
- Valores numéricos válidos

#### `toggleProdutoTipo()`
Garante que apenas um tipo de produto esteja ativo (Simples, Kit ou Com Variações).

---

## 🎯 Validações do Formulário

### Campos Obrigatórios (*)
- Nome do Produto
- Unidade de Medida
- Estoque Mínimo
- Preço Unitário de Venda

### Validações Automáticas
- **GTIN**: 13 dígitos numéricos
- **Preços**: Valores maiores que 0
- **Estoque**: Valores numéricos válidos
- **Nome**: Máximo 255 caracteres
- **Descrição**: Máximo 1000 caracteres

---

## 🎨 Classes CSS Principais

### Container e Layout
```css
.modal-editar-produto-rico     /* Container principal do modal */
.modal-produto-container       /* Container interno */
.modal-produto-header          /* Cabeçalho do modal */
.modal-produto-body            /* Corpo com conteúdo */
.modal-produto-footer          /* Rodapé com ações */
```

### Abas
```css
.modal-produto-tabs            /* Container das abas */
.modal-produto-tab             /* Botão de aba individual */
.modal-produto-tab.active      /* Aba ativa */
.modal-produto-tab-content     /* Conteúdo de cada aba */
```

### Formulários
```css
.produto-form-grid             /* Grid padrão (1 coluna) */
.produto-form-grid-2           /* Grid 2 colunas */
.produto-form-grid-3           /* Grid 3 colunas */
.produto-form-group            /* Grupo de campo */
.produto-form-input            /* Input de texto */
.produto-form-select           /* Select dropdown */
.produto-form-textarea         /* Área de texto */
```

### Componentes
```css
.produto-toggle-switch         /* Toggle switch */
.produto-info-cards            /* Container de cards */
.produto-info-card             /* Card individual */
.produto-status-badge          /* Badge de status */
```

### Botões
```css
.btn-produto                   /* Botão base */
.btn-produto-primary           /* Botão primário (azul) */
.btn-produto-success           /* Botão de sucesso (verde) */
.btn-produto-danger            /* Botão de perigo (vermelho) */
.btn-produto-secondary         /* Botão secundário (cinza) */
```

---

## 📱 Responsividade

### Desktop (> 1024px)
- 3 colunas nos grids
- Modal ocupa 90% da largura (máx 1400px)
- Abas com ícones e texto

### Tablet (768px - 1024px)
- 2 colunas nos grids
- Modal ocupa 95% da largura
- Abas otimizadas

### Mobile (< 768px)
- 1 coluna nos grids
- Modal ocupa 100% da largura
- Abas apenas com ícones
- Botões empilhados verticalmente

---

## ⚡ Otimizações de Performance

### Lazy Loading
- Modal carregado dinamicamente
- Conteúdo renderizado apenas quando necessário

### Cache de Dados
- Dados do produto mantidos em memória
- Evita requisições desnecessárias

### Animações Suaves
- Transições CSS otimizadas
- GPU acceleration em transforms

---

## 🔗 Integração com Sistema Existente

### APIs Utilizadas
```javascript
// Listar produtos
GET /api/pcp/produtos

// Atualizar produto
PUT /api/pcp/produtos

// Deletar produto
DELETE /api/pcp/produtos/:id
```

### Funções do Sistema
- `showToast(mensagem, tipo)` - Notificações
- `pcpNotifications.show()` - Sistema de notificações
- `atualizarContadoresPCP()` - Atualiza contadores após salvar

---

## 🐛 Tratamento de Erros

### Validação de Formulário
```javascript
if (!form.checkValidity()) {
    form.reportValidity();
    return;
}
```

### Erros de API
```javascript
try {
    const response = await fetch('/api/pcp/produtos', {...});
    if (!response.ok) throw new Error('Erro ao salvar');
} catch (error) {
    console.error('Erro:', error);
    showToast('Erro ao salvar produto', 'error');
}
```

---

## ✅ Checklist de Implementação

- [x] Criar estrutura HTML completa
- [x] Desenvolver CSS com gradientes e animações
- [x] Implementar sistema de abas
- [x] Adicionar toggle switches
- [x] Criar cards informativos
- [x] Implementar validações
- [x] Integrar com API
- [x] Adicionar cálculo de margem
- [x] Suporte a responsividade
- [x] Documentação completa
- [ ] Testes com dados reais
- [ ] Implementar exclusão
- [ ] Implementar duplicação
- [ ] Implementar inativação

---

## 🚀 Próximos Passos

1. **Testar com dados reais** - Carregar produtos existentes
2. **Implementar ações do footer** - Excluir, Duplicar, Inativar
3. **Adicionar mais abas** - Histórico de compras, Anexos
4. **Sistema de anexos** - Upload de documentos
5. **Histórico de alterações** - Rastreamento de mudanças
6. **Integração com fornecedores** - CRUD completo

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique esta documentação
2. Analise os logs do console (F12)
3. Teste as funções individuais
4. Revise as validações do formulário

---

## 📝 Changelog

### v1.0.0 - 2025-01-20
- ✅ Versão inicial completa
- ✅ 7 abas funcionais
- ✅ Validações implementadas
- ✅ Design responsivo
- ✅ Integração com API

---

## 🎯 Resumo Técnico

**Arquitetura:**
- HTML: Modular e semântico
- CSS: BEM-like com gradientes
- JavaScript: Vanilla JS com async/await
- API: RESTful endpoints

**Tecnologias:**
- Font Awesome 6.0 para ícones
- CSS Grid e Flexbox para layout
- CSS Custom Properties para temas
- Fetch API para requisições

**Compatibilidade:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

**Desenvolvido com ❤️ para o Sistema Aluforce PCP**
