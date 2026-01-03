# 💡 EXEMPLOS DE CÓDIGO - Modal de Produto Enriquecido

## 🎯 Exemplos Práticos de Uso

### 1. Abrir Modal com Dados do Banco

```javascript
// Quando usuário clicar em "Editar" na tabela de produtos
async function editarProduto(produtoId) {
    try {
        // Buscar dados do produto na API
        const response = await fetch(`/api/produtos/${produtoId}`);
        const produto = await response.json();
        
        // Abrir modal com os dados
        window.abrirModalEditarProdutoEnriquecido(produto);
        
    } catch (error) {
        console.error('Erro ao carregar produto:', error);
        alert('Erro ao carregar os dados do produto');
    }
}
```

### 2. Salvar Alterações

```javascript
// Adicionar listener ao formulário
document.getElementById('form-editar-produto').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Coletar dados do formulário
    const formData = new FormData(e.target);
    const produtoId = document.getElementById('edit-produto-id').value;
    
    // Converter para objeto
    const dados = Object.fromEntries(formData);
    
    try {
        // Enviar para API
        const response = await fetch(`/api/produtos/${produtoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });
        
        if (response.ok) {
            // Sucesso
            alert('✅ Produto atualizado com sucesso!');
            window.fecharModalEditarProduto();
            
            // Recarregar lista de produtos
            carregarProdutos();
        } else {
            throw new Error('Erro ao salvar');
        }
        
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        alert('❌ Erro ao salvar o produto. Tente novamente.');
    }
});
```

### 3. Integrar com Tabela de Produtos

```javascript
// Função para renderizar botões de ação na tabela
function renderizarAcoesProduto(produto) {
    return `
        <button 
            onclick="editarProdutoEnriquecido('${produto.id}')" 
            class="btn-editar-prod"
            title="Editar produto">
            <i class="fas fa-edit"></i>
            Editar
        </button>
    `;
}

// Função chamada pelo botão
function editarProdutoEnriquecido(produtoId) {
    // Buscar produto e abrir modal
    fetch(`/api/produtos/${produtoId}`)
        .then(res => res.json())
        .then(produto => {
            window.abrirModalEditarProdutoEnriquecido(produto);
        })
        .catch(err => {
            console.error(err);
            alert('Erro ao carregar produto');
        });
}
```

---

## 🎨 Exemplos de Personalização

### 1. Mudar Cor Primária (Azul → Verde)

```css
/* Edite modal-produto-enriquecido.css */

/* Altere estas cores */
.info-card-icon.primary {
    background: linear-gradient(135deg, #10b981, #059669); /* Verde */
    color: white;
}

.btn-produto-primary {
    background: linear-gradient(135deg, #10b981, #059669); /* Verde */
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

.btn-produto-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #059669, #047857);
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
}
```

### 2. Adicionar Nova Aba "Histórico"

```html
<!-- 1. Adicione o botão da aba -->
<button class="produto-tab" data-tab="historico" type="button">
    <i class="fas fa-history"></i>
    Histórico
</button>

<!-- 2. Adicione o conteúdo da aba -->
<div class="produto-tab-content" data-content="historico">
    <div class="produto-section">
        <div class="produto-section-header">
            <i class="fas fa-clock"></i>
            <h4>Histórico de Movimentações</h4>
        </div>
        
        <table class="historico-table">
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Quantidade</th>
                    <th>Usuário</th>
                </tr>
            </thead>
            <tbody id="historico-tbody">
                <!-- Dados serão inseridos via JS -->
            </tbody>
        </table>
    </div>
</div>
```

### 3. Adicionar Campo Personalizado

```html
<!-- Adicione dentro de qualquer .produto-section -->
<div class="form-group-produto">
    <label for="edit-ncm">
        <i class="fas fa-file-invoice"></i>
        NCM (Nomenclatura Comum do Mercosul)
    </label>
    <input 
        type="text" 
        id="edit-ncm" 
        name="ncm" 
        maxlength="8"
        pattern="[0-9]{8}"
        class="form-control-produto" 
        placeholder="00000000">
    <small class="form-help-produto">
        <i class="fas fa-info-circle"></i> 
        Código de 8 dígitos
    </small>
</div>
```

---

## 🧮 Exemplos de Cálculos Personalizados

### 1. Adicionar Desconto no Cálculo de Margem

```javascript
// Edite modal-produto-enriquecido.js

function atualizarCardsCusto(produto) {
    const custo = parseFloat(produto.custo_unitario) || 0;
    const preco = parseFloat(produto.preco) || 0;
    const desconto = parseFloat(produto.desconto_percentual) || 0;
    
    // Preço com desconto
    const precoFinal = preco * (1 - desconto / 100);
    
    // Margem considerando desconto
    let margem = 0;
    if (custo > 0 && precoFinal > 0) {
        margem = ((precoFinal - custo) / custo) * 100;
    }
    
    // Atualizar display
    const margemLucro = document.getElementById('margem-lucro-display');
    if (margemLucro) {
        margemLucro.textContent = margem.toFixed(2) + '%';
        
        // Cor baseada na margem
        if (margem < 10) {
            margemLucro.style.color = '#ef4444'; // Vermelho
        } else if (margem < 20) {
            margemLucro.style.color = '#f59e0b'; // Amarelo
        } else {
            margemLucro.style.color = '#10b981'; // Verde
        }
    }
}
```

### 2. Alerta de Estoque Crítico

```javascript
// Adicione esta função em modal-produto-enriquecido.js

function verificarEstoqueCritico(produto) {
    const qtd = parseFloat(produto.quantidade) || 0;
    const min = parseFloat(produto.estoque_minimo) || 0;
    const critico = min * 0.5; // 50% do mínimo
    
    if (qtd <= critico && qtd > 0) {
        // Exibir alerta
        const alerta = `
            <div style="
                background: #fef3c7;
                border: 2px solid #f59e0b;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                gap: 12px;
            ">
                <i class="fas fa-exclamation-triangle" 
                   style="color: #f59e0b; font-size: 24px;"></i>
                <div>
                    <strong style="color: #92400e;">
                        ⚠️ ESTOQUE CRÍTICO!
                    </strong>
                    <p style="margin: 4px 0 0 0; color: #78350f;">
                        A quantidade atual (${qtd}) está abaixo de 50% 
                        do estoque mínimo (${min}). 
                        Recomendamos reposição urgente!
                    </p>
                </div>
            </div>
        `;
        
        // Inserir no início da aba Estoque
        const abaEstoque = document.querySelector('[data-content="estoque"]');
        if (abaEstoque) {
            abaEstoque.insertAdjacentHTML('afterbegin', alerta);
        }
    }
}

// Chamar ao abrir modal
function abrirModal(produto) {
    // ... código existente ...
    
    verificarEstoqueCritico(produto);
}
```

---

## 🔔 Exemplos de Notificações

### 1. Toast de Sucesso ao Salvar

```javascript
function mostrarToast(mensagem, tipo = 'success') {
    const cores = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${cores[tipo]};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10001;
        animation: slideInRight 0.3s ease;
    `;
    toast.textContent = mensagem;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Usar após salvar
document.getElementById('form-editar-produto')
    .addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            // ... código de salvar ...
            
            mostrarToast('✅ Produto atualizado com sucesso!', 'success');
            window.fecharModalEditarProduto();
            
        } catch (error) {
            mostrarToast('❌ Erro ao salvar produto', 'error');
        }
    });
```

---

## 🎭 Exemplos de Validações

### 1. Validar Preço Maior que Custo

```javascript
// Adicione esta validação
document.getElementById('edit-preco').addEventListener('input', (e) => {
    const preco = parseFloat(e.target.value) || 0;
    const custo = parseFloat(document.getElementById('edit-custo').value) || 0;
    
    if (preco < custo && preco > 0) {
        e.target.classList.add('is-invalid');
        
        // Mostrar mensagem
        let msgErro = e.target.nextElementSibling;
        if (!msgErro || !msgErro.classList.contains('erro-validacao')) {
            msgErro = document.createElement('small');
            msgErro.className = 'erro-validacao';
            msgErro.style.color = '#ef4444';
            msgErro.innerHTML = '<i class="fas fa-exclamation-circle"></i> Preço não pode ser menor que o custo!';
            e.target.after(msgErro);
        }
    } else {
        e.target.classList.remove('is-invalid');
        const msgErro = e.target.nextElementSibling;
        if (msgErro && msgErro.classList.contains('erro-validacao')) {
            msgErro.remove();
        }
    }
});
```

### 2. Validar Estoque Mínimo < Máximo

```javascript
function validarEstoques() {
    const minimo = parseFloat(document.getElementById('edit-estoque-minimo').value) || 0;
    const maximo = parseFloat(document.getElementById('edit-estoque-maximo').value) || 0;
    
    if (minimo >= maximo && maximo > 0) {
        alert('⚠️ Estoque mínimo deve ser menor que o máximo!');
        return false;
    }
    
    return true;
}

// Usar no submit
document.getElementById('form-editar-produto')
    .addEventListener('submit', (e) => {
        if (!validarEstoques()) {
            e.preventDefault();
            return;
        }
        
        // ... resto do código ...
    });
```

---

## 📊 Exemplo de Integração com Gráfico

```javascript
// Adicionar gráfico de histórico de preços (Chart.js)
function adicionarGraficoPrecos(historicoPrecos) {
    const canvas = document.createElement('canvas');
    canvas.id = 'grafico-precos';
    canvas.width = 400;
    canvas.height = 200;
    
    // Inserir na aba de Custo
    const abaCusto = document.querySelector('[data-content="custo"]');
    abaCusto.appendChild(canvas);
    
    // Criar gráfico
    new Chart(canvas, {
        type: 'line',
        data: {
            labels: historicoPrecos.map(h => h.data),
            datasets: [{
                label: 'Preço de Venda',
                data: historicoPrecos.map(h => h.preco),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Histórico de Preços'
                }
            }
        }
    });
}
```

---

## 🎯 Dicas de Performance

### 1. Debounce em Cálculos

```javascript
// Evitar calcular a cada tecla digitada
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Usar em campos que disparam cálculos
const calcularComDebounce = debounce(() => {
    const produto = obterDadosFormulario();
    atualizarCardsEstoque(produto);
    atualizarCardsCusto(produto);
}, 300); // 300ms de delay

document.getElementById('edit-quantidade')
    .addEventListener('input', calcularComDebounce);
```

### 2. Lazy Load de Abas

```javascript
// Carregar dados apenas quando aba for clicada
const abas = document.querySelectorAll('.produto-tab');

abas.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        
        // Verificar se já foi carregada
        if (!tab.dataset.carregada) {
            carregarDadosAba(tabName);
            tab.dataset.carregada = 'true';
        }
    });
});

async function carregarDadosAba(aba) {
    if (aba === 'fornecedores') {
        // Buscar fornecedores
        const produtoId = document.getElementById('edit-produto-id').value;
        const fornecedores = await fetch(`/api/produtos/${produtoId}/fornecedores`)
            .then(res => res.json());
        
        popularTabelaFornecedores(fornecedores);
    }
    // ... outras abas
}
```

---

## 🎓 Conclusão

Com estes exemplos, você pode:

✅ Integrar o modal ao seu sistema  
✅ Personalizar cores e campos  
✅ Adicionar validações  
✅ Implementar cálculos  
✅ Exibir notificações  
✅ Melhorar performance  

**Boa sorte!** 🚀

---

_Precisa de mais exemplos? É só pedir! 😊_
