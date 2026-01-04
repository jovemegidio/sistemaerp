document.addEventListener('DOMContentLoaded', () => {
    // Small HTML escape helper for safely injecting text into innerHTML templates
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // Toast helpers: non-blocking notifications
    const toastContainer = document.getElementById('pcp-toast-container');
    function createToastElement(message, type='info', title=null) {
        const el = document.createElement('div');
        el.className = `pcp-toast ${type}`;
        el.setAttribute('role','status');
        el.innerHTML = `
            <div class="toast-icon">${type === 'success'  '&#10003;' : type === 'error'  '!' : type === 'warning'  '!' : 'i'}</div>
            <div class="toast-body">
                ${title  `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-text">${message}</div>
            </div>
            <button class="toast-close" aria-label="Fechar">×</button>
        `;
        el.querySelector('.toast-close').addEventListener('click', () => { try { el.classList.remove('show'); setTimeout(()=>el.remove(),180); } catch(e){} });
        return el;
    }
    window.showToast = function(message, type='info', timeout=4500, title=null) {
        try {
            if (!toastContainer) return console.info('Toast:', message);
            const t = createToastElement(message, type, title);
            toastContainer.hidden = false;
            toastContainer.appendChild(t);
            // ensure show animation
            setTimeout(()=>t.classList.add('show'), 10);
            if (timeout > 0) setTimeout(()=>{ try { t.classList.remove('show'); setTimeout(()=>t.remove(),180); } catch(e){} }, timeout);
        } catch (e) { console.warn('showToast error', e); }
    };
    window.clearToasts = function() { try { if (!toastContainer) return; toastContainer.querySelectorAll('.pcp-toast').forEach(n=>n.remove()); } catch(e){} };
    // Modal de todos os pedidos faturaçãos (com busca local e abertura para edição)
    const btnVerTodosFaturaçãos = document.getElementById('btn-ver-todos-faturaçãos');
    const modalTodosFaturaçãos = document.getElementById('modal-todos-faturaçãos');
    const closeTodosFaturaçãos = document.getElementById('close-todos-faturaçãos');
    const todosFaturaçãosBody = document.getElementById('todos-faturaçãos-body');
    // create a search input inside the modal header if not present (guard when modal missing)
    let searchTodosInput = null;
    if (modalTodosFaturaçãos) {
        searchTodosInput = document.getElementById('search-todos-faturaçãos');
        if (!searchTodosInput) {
            const header = modalTodosFaturaçãos.querySelector('.modal-header');
            if (header) {
                const input = document.createElement('input');
                input.id = 'search-todos-faturaçãos';
                input.placeholder = 'Buscar por cliente, produto...';
                // prefer CSS classes over inline styles
                input.classList.add('js-input-full');
                header.appendChild(input);
                searchTodosInput = input;
            }
        }
    }

    let allFaturaçãos = [];

    function renderTodosFaturaçãos(list) {
        if (!todosFaturaçãosBody) return; // nothing to render into
        if (!Array.isArray(list) || list.length === 0) {
            todosFaturaçãosBody.innerHTML = '<div class="text-sm text-center pad-24 muted">Nenhum pedido faturação encontração.</div>';
            return;
        }
        todosFaturaçãosBody.innerHTML = list.map(p => `
                <div class="list-row">
                    <div class="list-row-thumb">${p.icon || ''}</div>
                    <div class="list-row-body">
                        <div class="list-row-title">${p.cliente || 'Cliente'}</div>
                        <div class="list-row-sub">${p.quantidade} x ${p.produto_nome || p.produto_id || ''}</div>
                    </div>
                    <div class="list-row-value">${p.value}</div>
                </div>
        `).join('');

        // attach click handlers to open item edit
        todosFaturaçãosBody.querySelectorAll('.faturação-item').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.dataset.id;
                // open item edit modal for the order
                openItemEdit('ordem', Number(id));
            });
        });
    }

    if (btnVerTodosFaturaçãos) btnVerTodosFaturaçãos.addEventListener('click', async () => {
        if (!modalTodosFaturaçãos || !todosFaturaçãosBody) return;
        openAccessibleModal(modalTodosFaturaçãos);
        todosFaturaçãosBody.innerHTML = '<div><span class="pcp-spinner" aria-hidden="true"></span> <span class="muted">Carregando...</span></div>';
        try {
            const resp = await fetch('/api/pcp/pedidos');
            const pedidos = await resp.json();
            allFaturaçãos = (Array.isArray(pedidos)  pedidos.filter(p => p && p.status && p.status.toLowerCase().includes('fatur')) : []);
            renderTodosFaturaçãos(allFaturaçãos);
        } catch (err) {
            todosFaturaçãosBody.innerHTML = '<div class="text-error pad-24">Erro ao carregar pedidos faturaçãos.</div>';
        }
    });

    // search/filter in modal
    if (searchTodosInput) {
        let debounce;
        searchTodosInput.addEventListener('input', (e) => {
            clearTimeout(debounce);
            debounce = setTimeout(() => {
                const q = String(e.target.value || '').toLowerCase().trim();
                if (!q) return renderTodosFaturaçãos(allFaturaçãos);
                const filtered = allFaturaçãos.filter(p => {
                    return (p.cliente || '').toLowerCase().includes(q) || (p.produto_nome || '').toLowerCase().includes(q) || String(p.id).includes(q);
                });
                renderTodosFaturaçãos(filtered);
            }, 200);
        });
    }

    if (closeTodosFaturaçãos) closeTodosFaturaçãos.addEventListener('click', () => { closeAccessibleModal(modalTodosFaturaçãos); });
    if (modalTodosFaturaçãos) modalTodosFaturaçãos.addEventListener('click', (e) => { if (e.target === modalTodosFaturaçãos) closeAccessibleModal(modalTodosFaturaçãos); });
    // Referências aos elementos da UI
    const views = {
        dashboard: document.getElementById('dashboard-view'),
        novaOrdem: document.getElementById('nova-ordem-view'),
    editar: document.getElementById('editar-view'),
        materiais: document.getElementById('materiais-view'),
        ordemCompra: document.getElementById('ordem-compra-view'),
        controleProducao: document.getElementById('controle-producao-view'),
        faturamento: document.getElementById('faturamento-view')
    };

    const navLinks = {
        dashboard: document.getElementById('btn-dashboard'),
        novaOrdem: document.getElementById('btn-nova-ordem'),
        editar: document.getElementById('btn-editar'),
        materiais: document.getElementById('btn-materiais'),
        ordemCompra: document.getElementById('btn-ordem-compra'),
        controleProducao: document.getElementById('btn-controle-producao'),
        faturamento: document.getElementById('btn-faturamento')
    };

    const forms = {
        novaOrdem: document.getElementById('form-nova-ordem'),
        novoMaterial: document.getElementById('form-novo-material'),
        ordemCompra: document.getElementById('form-ordem-compra'),
    };
    
    const containers = {
        materiais: document.getElementById('tabela-materiais-container'),
        ordensCompra: document.getElementById('tabela-ordens-compra-container'),
    materialSelect: document.getElementById('material_compra_select'),
    produtos: document.getElementById('tabela-produtos-container')
    };

    // Use relative API base so same-origin cookies apply; all API fetches should include credentials
    const API_BASE_URL = '/api/pcp';

    // Accessibility helpers: focus trap and accessible open/close for modals
    let __lastFocusedElement = null;
    function trapFocus(modal) {
        if (!modal) return;
        const handler = function(e) {
            if (e.key !== 'Tab') return;
            const focusable = Array.from(modal.querySelectorAll('a[href], button:not([disabled]), input:not([type="hidden"]), textarea, select, [tabindex]:not([tabindex="-1"])')).filter(el => el.offsetParent !== null);
            if (!focusable.length) { e.preventDefault(); return; }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        // store handler for later removal
        modal.__trapHandler = handler;
        modal.addEventListener('keydown', handler);
    }
    function releaseTrap(modal) {
        if (!modal || !modal.__trapHandler) return;
        try { modal.removeEventListener('keydown', modal.__trapHandler); } catch (e) {}
        delete modal.__trapHandler;
    }

    function openAccessibleModal(modal) {
        if (!modal) return;
        __lastFocusedElement = document.activeElement;
        modal.setAttribute('role', modal.getAttribute('role') || 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-hidden', 'false');
    modal.classList.remove('hidden');
        // Focus the modal container first so screen readers announce title/description,
        // then move focus to the first interactive element inside the dialog.
        try { modal.focus(); } catch (e) {}
        setTimeout(() => {
            const focusable = modal.querySelectorAll('a[href], button:not([disabled]), input:not([type="hidden"]), textarea, select, [tabindex]:not([tabindex="-1"])');
            if (focusable && focusable.length) {
                try { focusable[0].focus(); } catch (e) {}
            }
        }, 120);
        trapFocus(modal);
    }

    function closeAccessibleModal(modal) {
        if (!modal) return;
        modal.setAttribute('aria-hidden', 'true');
    modal.classList.add('hidden');
        releaseTrap(modal);
        try { if (__lastFocusedElement && typeof __lastFocusedElement.focus === 'function') __lastFocusedElement.focus(); } catch (e) {}
        __lastFocusedElement = null;
    }

    // Ensure modal-close buttons are explicit type=button for keyboard stability
    document.querySelectorAll('.modal-close').forEach(b => { try { if (!b.hasAttribute('type')) b.setAttribute('type','button'); } catch (e) {} });

    // Lightweight fetch wrapper: ensure credentials are included for API calls so HttpOnly session cookie is sent
    // Also intercept and fix any legacy localhost:3001 URLs
    (function(){
        const _fetch = window.fetch.bind(window);
        window.fetch = (input, init) => {
            try {
                let url = (typeof input === 'string')  input : (input && input.url) || '';
                
                // FIX: Convert any localhost:3001 URLs to relative URLs
                if (typeof url === 'string' && url.includes('localhost:3001')) {
                    url = url.replace(/http:\/\/localhost:3001/g, '');
                    input = url;
                    console.log('🔄 [PCP] URL corrigida de localhost:3001 para relativa:', url);
                }
                
                if (typeof url === 'string' && (url.startsWith('/api/pcp') || url.includes('localhost:3000') || url.includes('/api/pcp/'))) {
                    init = init || {};
                    if (!init.credentials) init.credentials = 'include';
                }
            } catch (e) {
                // ignore
            }
            return _fetch(input, init);
        };
    })();
    let draggedCard = null;

    // Field schemas: friendly labels, input types and validation rules per entity
    const fieldSchemas = {
        produto: {
            codigo: { label: 'Código', type: 'text', required: true, placeholder: 'Código do produto' },
            descricao: { label: 'Descrição', type: 'textarea', required: true, placeholder: 'Descrição do produto' },
            unidade_medida: { label: 'Unidade', type: 'text', placeholder: 'Ex: un, m, kg' },
                quantidade_estoque: { label: 'Quantidade em estoque', type: 'number', min: 0, step: '0.01' },
            custo_unitario: { label: 'Custo unitário', type: 'number', min: 0, step: '0.01' },
            variacao: { label: 'Variação', type: 'text', placeholder: 'Ex: Cor, Tamanho ou SKU' }
        },
        material: {
            codigo_material: { label: 'Código', type: 'text', required: true },
            descricao: { label: 'Descrição', type: 'textarea', required: true },
            unidade_medida: { label: 'Unidade', type: 'text' },
            quantidade_estoque: { label: 'Quantidade em estoque', type: 'number', min: 0, step: '0.01' }
        },
        ordem: {
            codigo_produto: { label: 'Código produto', type: 'text' },
            descricao_produto: { label: 'Descrição', type: 'textarea' },
            quantidade: { label: 'Quantidade', type: 'number', min: 0, step: '1' },
            data_previsao_entrega: { label: 'Previsão entrega', type: 'date' },
            observacoes: { label: 'Observações', type: 'textarea' },
            status: { label: 'Status', type: 'text' }
        }
    };

    // Friendly label and type hints for DB columns not present in schema
    const columnLabelMap = {
        codigo: 'Código', codigo_produto: 'Código', codigo_material: 'Código',
        descricao: 'Descrição', descricao_produto: 'Descrição', descricao_material: 'Descrição',
        unidade_medida: 'Unidade', unidade: 'Unidade',
        quantidade_estoque: 'Quantidade em estoque', quantidade: 'Quantidade', estoque: 'Estoque',
        custo_unitario: 'Custo unitário', custo: 'Custo', variacao: 'Variação', ncm: 'NCM', categoria: 'Categoria'
    };

    const columnTypeHints = {
        codigo: 'text', codigo_produto: 'text', descricao: 'textarea', descricao_produto: 'textarea', unidade_medida: 'text', quantidade_estoque: 'number', custo_unitario: 'number', variacao: 'text'
    };

    // Conexão Socket.IO para atualizações em tempo real
    let socket = null;
    try {
        socket = io(); // vai conectar a http://localhost:3001 automaticamente
        socket.on('connect', () => console.log('Socket conectação:', socket.id));
        socket.on('materials_changed', (materials) => {
            // If view elements exist, check visibility safely before acting
            try {
                const materiaisVisible = views.materiais && !views.materiais.classList.contains('hidden');
                const ordemCompraVisible = views.ordemCompra && !views.ordemCompra.classList.contains('hidden');
                if (materiaisVisible) carregarMateriais();
                if (ordemCompraVisible) carregarMateriaisParaSelect();
                if (materiaisVisible) carregarProdutos();
            } catch (e) { console.warn('materials_changed handler error:', e && e.message  e.message : e); }
        });
        socket.on('products_changed', (products) => {
            try { if (views.materiais && !views.materiais.classList.contains('hidden')) carregarProdutos(); } catch (e) { console.warn('products_changed handler error:', e && e.message  e.message : e); }
        });
    } catch (err) {
        console.warn('Socket.IO não disponível:', err.message);
    }

    // --- LÓGICA DE NAVEGAÇÃO ---
    function showView(viewName) {
    // hide only existing views (use class-based toggles for predictable stacking)
    Object.values(views).forEach(view => { if (view && view.classList) view.classList.add('hidden'); });
        // remove active only on existing nav links
        Object.values(navLinks).forEach(link => { if (link && link.classList) link.classList.remove('active'); });
        
        if (views[viewName]) views[viewName].classList.remove('hidden');
    if (views[viewName] && views[viewName].classList) views[viewName].classList.remove('hidden');
        if (navLinks[viewName] && navLinks[viewName].classList) navLinks[viewName].classList.add('active');

        // Carregar daçãos específicos da view
        if (viewName === 'dashboard') {
            carregarOrdens();
        } else if (viewName === 'materiais') {
            // Verificar se existe a função da nova view de materiais
            if (typeof window.onMateriaisViewShown === 'function') {
                console.log('✅ Chamando onMateriaisViewShown() da nova view');
                window.onMateriaisViewShown();
            } else {
                // Fallback para a função antiga
                console.log('⚠️ Usando carregarMateriais() antiga');
                carregarMateriais();
            }
        } else if (viewName === 'ordemCompra') {
            carregarOrdensDeCompra();
            carregarMateriaisParaSelect();
        }
    }

    Object.keys(navLinks).forEach(key => {
        const linkEl = navLinks[key];
        if (!linkEl) return;
        linkEl.addEventListener('click', (e) => {
            e.preventDefault();
            showView(key);
        });
    });

    // bind edit nav link if present
    const btnEditar = document.getElementById('btn-editar');
    if (btnEditar) btnEditar.addEventListener('click', (e)=>{ e.preventDefault(); showView('editar'); });

    // sample edit button inside editar view
    const sampleEditBtn = document.getElementById('editar-open-sample');
    if (sampleEditBtn) sampleEditBtn.addEventListener('click', (e)=>{
        e.preventDefault();
        // open item edit modal with sample data
        const sample = { id: 9999, descricao: 'Ordem Exemplo', quantidade: 10, status: 'Rascunho', data_previsao_entrega: new Date().toISOString() };
        openItemEdit('ordem', sample);
    });

    // --- LÓGICA DO PAINEL KANBAN ---
    async function carregarOrdens() {
        try {
            const response = await fetch(`${API_BASE_URL}/ordens`);
            if (!response.ok) throw new Error('Falha ao carregar ordens.');
            const ordens = await response.json();
            
            // Limpar colunas
            document.querySelectorAll('.cards-container').forEach(c => c.innerHTML = '');
            
            // Popular colunas
            ordens.forEach(criarCardOrdem);
        } catch (error) {
            console.error(error);
        }
    }

    function criarCardOrdem(ordem) {
        const columnId = `coluna-${ordem.status.toLowerCase().replace(' ', '-')}`;
        const column = document.getElementById(columnId);
        if (!column) return;

        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.draggable = true;
        card.dataset.id = ordem.id;
        card.innerHTML = `
            <div class="card-id">OP-${String(ordem.id).padStart(4, '0')}</div>
            <div class="card-desc">${ordem.descricao_produto}</div>
            <div class="card-footer">
                <span>Qtd: ${ordem.quantidade}</span>
                <span class="date">${new Date(ordem.data_previsao_entrega).toLocaleDateString()}</span>
            </div>
        `;
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        column.querySelector('.cards-container').appendChild(card);
    }
    
    // Funções de Drag & Drop
    function handleDragStart(e) {
        draggedCard = e.target;
        setTimeout(() => e.target.classList.add('dragging'), 0);
    }

    function handleDragEnd(e) {
        draggedCard.classList.remove('dragging');
        draggedCard = null;
    }

    document.querySelectorAll('.kanban-column').forEach(column => {
        column.addEventListener('dragover', e => {
            e.preventDefault();
            column.classList.add('drag-over');
        });
        column.addEventListener('dragleave', e => {
            column.classList.remove('drag-over');
        });
        column.addEventListener('drop', async e => {
            e.preventDefault();
            column.classList.remove('drag-over');
            if (draggedCard) {
                const cardId = draggedCard.dataset.id;
                const newStatus = column.dataset.status;
                try {
                    await fetch(`${API_BASE_URL}/ordens/${cardId}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus })
                    });
                    column.querySelector('.cards-container').appendChild(draggedCard);
                } catch(error) {
                    console.error('Falha ao atualizar status:', error);
                }
            }
        });
    });

    // --- LÓGICA DOS FORMULÁRIOS ---

    // Nova Ordem de Produção
    if (forms.novaOrdem) forms.novaOrdem.addEventListener('submit', async (e) => {
        e.preventDefault();
        const novaOrdem = {
            codigo_produto: document.getElementById('codigo_produto').value,
            descricao_produto: document.getElementById('descricao_produto').value,
            quantidade: document.getElementById('quantidade').value,
            data_previsao_entrega: document.getElementById('data_previsao_entrega').value,
            observacoes: document.getElementById('observacoes').value
        };
        try {
            await fetch(`${API_BASE_URL}/ordens`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novaOrdem)
            });
            forms.novaOrdem.reset();
            showView('dashboard');
        } catch (error) {
            console.error('Erro ao criar ordem:', error);
        }
    });

    // Novo Material
    if (forms.novoMaterial) forms.novoMaterial.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
             codigo_material: document.getElementById('codigo_material_form').value,
             descricao: document.getElementById('descricao_material_form').value,
             unidade_medida: document.getElementById('unidade_medida_form').value,
             quantidade_estoque: parseFloat(document.getElementById('estoque_inicial_form').value) || 0
        };
        const editingId = forms.novoMaterial.dataset.editingId;
        try {
            if (editingId) {
                const resp = await fetch(`${API_BASE_URL}/materiais/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!resp.ok) throw new Error('Falha ao salvar alterações');
                // limpar estação de edição
                delete forms.novoMaterial.dataset.editingId;
                const btnCancelar = document.getElementById('btn-cancelar-edicao');
                if (btnCancelar) btnCancelar.remove();
                forms.novoMaterial.querySelector('button[type="submit"]').textContent = 'Adicionar Material';
                forms.novoMaterial.reset();
            } else {
                await fetch(`${API_BASE_URL}/materiais`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                forms.novoMaterial.reset();
            }
            carregarMateriais(); // Recarrega a tabela
            carregarMateriaisParaSelect();
        } catch(error) {
             console.error('Erro ao criar/atualizar material:', error);
            showToast('Erro ao salvar material. Veja o console para detalhes.', 'error');
        }
    });

    // Nova Ordem de Compra
    if (forms.ordemCompra) forms.ordemCompra.addEventListener('submit', async (e) => {
        e.preventDefault();
        const novaOrdemCompra = {
             material_id: containers.materialSelect.value,
             quantidade: parseFloat(document.getElementById('quantidade_compra').value),
             previsao_entrega: document.getElementById('data_previsao_compra').value
        };
        if (!novaOrdemCompra.material_id) {
            showToast('Por favor, selecione um material.', 'warning');
            return;
        }
        try {
            const resp = await fetch(`${API_BASE_URL}/ordens-compra`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novaOrdemCompra)
            });
            if (!resp.ok) throw new Error('Falha ao criar ordem de compra');
            const body = await resp.json();
            const orderId = body && body.id;
            forms.ordemCompra.reset();
            carregarOrdensDeCompra(); // Recarrega o histórico
            // Open PDF in a new tab if server supports it
            if (orderId) {
                const pdfUrl = `${API_BASE_URL}/ordens-compra/${orderId}/pdf`;
                // open in new tab
                window.open(pdfUrl, '_blank');
            }
        } catch (error) {
            console.error('Erro ao criar ordem de compra:', error);
            showToast('Erro ao gerar ordem de compra. Veja o console.', 'error');
        }
    });


    // --- LÓGICA DE CARREGAMENTO DE DADOS (NOVAS FUNÇÕES) ---
    
    // Carregar e renderizar tabela de materiais
    async function carregarMateriais() {
        try {
            // Verificar se o container existe (compatibilidade com nova view)
            if (!containers.materiais) {
                console.log('⚠️ Container de materiais não encontração - usando nova view de materiais');
                return;
            }
            
            const response = await fetch(`${API_BASE_URL}/materiais`);
            const materiais = await response.json();
            
            let tableHTML = `
                    <table class="estoque-table">
                        <thead>
                            <tr>
                                <th class="w-12pct">Código</th>
                                <th>Descrição</th>
                                <th class="w-12pct text-center">Estoque</th>
                                <th class="w-12pct">Unidade</th>
                                <th class="w-14pct text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${materiais.map(m => `
                                <tr data-id="${m.id}">
                                    <td><strong>${m.codigo_material}</strong></td>
                                    <td>${m.descricao}</td>
                                    <td class="text-center">${Number(m.quantidade_estoque||0).toFixed(2)}</td>
                                    <td>${m.unidade_medida || ''}</td>
                                    <td class="text-center">
                                        <button class="btn-sm btn-editar" data-id="${m.id}">Editar</button>
                                        <button class="btn-sm btn-excluir" data-id="${m.id}">Excluir</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            containers.materiais.innerHTML = `<div class="materiais-area"><div class="estoque-card estoque-section"><h3>Estoque Atual de Fios e Materiais</h3>${tableHTML}</div></div>`;

            // Anexar eventos aos botões recém-criaçãos
            document.querySelectorAll('.btn-sm.btn-editar').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    await carregarMaterialParaEdicao(id);
                });
            });
            document.querySelectorAll('.btn-sm.btn-excluir').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    if (!confirm('Confirma a exclusão deste material')) return;
                    try {
                        const resp = await fetch(`${API_BASE_URL}/materiais/${id}`, { method: 'DELETE' });
                        if (!resp.ok) throw new Error('Falha ao excluir');
                        carregarMateriais();
                        carregarMateriaisParaSelect();
                    } catch (err) {
                        console.error('Erro ao excluir material:', err);
                        showToast('Erro ao excluir material. Veja o console para detalhes.', 'error');
                    }
                });
            });
        } catch (error) {
            console.error('Erro ao carregar materiais:', error);
            if (containers.materiais) {
                containers.materiais.innerHTML = '<p>Não foi possível carregar os materiais.</p>';
            }
        }
        // também carregar produtos cadastraçãos
        carregarProdutos();
    }

    // Carregar e renderizar produtos cadastraçãos
    async function carregarProdutos(page = 1, limit = 10) {
        try {
            // Verificar se o container existe (compatibilidade com nova view)
            if (!containers.produtos) {
                console.log('⚠️ Container de produtos não encontração - usando nova view de materiais');
                return;
            }
            
            const resp = await fetch(`${API_BASE_URL}/produtospage=${page}&limit=${limit}`);
            if (!resp.ok) throw new Error('Falha ao carregar produtos');
            const body = await resp.json();
            const produtos = body.rows || [];
            const total = Number(body.total || 0);
            const columns = Array.isArray(body.columns)  body.columns : [];
            const totalPages = Math.max(1, Math.ceil(total / limit));

            if (!Array.isArray(produtos) || produtos.length === 0) {
                if (containers.produtos) {
                    containers.produtos.innerHTML = '<div class="pad-12 muted">Nenhum produto cadastração.</div>';
                }
                return;
            }
            const startIndex = ((page - 1) * limit) + 1;
            const endIndex = Math.min(total, page * limit);
            const infoLine = `<div class="info-line">Mostrando ${startIndex}–${endIndex} de ${total} produtos</div>`;
            const html = `
                <table class="estoque-table">
                    <thead><tr><th class="w-12pct">Código</th><th>Descrição</th><th class="w-12pct">Unidade</th><th class="w-12pct text-center">Estoque</th><th class="w-18pct">Variações</th><th class="w-12pct">Custo Unit.</th><th class="w-14pct text-center">Ações</th></tr></thead>
                    <tbody>
                        ${produtos.map(p => {
                            const codigo = p.codigo || p.codigo_produto || '';
                            const descricao = p.descricao || p.descricao_produto || '';
                            const unidade = p.unidade_medida || p.unidade || '';
                            const estoqueVal = Number(typeof p.quantidade !== 'undefined'  p.quantidade : (p.estoque || p.quantidade_estoque || 0)).toFixed(2);
                            const variacaoRaw = p.variacao || '';
                            let variacoes = [];
                            try {
                                if (Array.isArray(variacaoRaw)) variacoes = variacaoRaw.map(s=>String(s).trim()).filter(Boolean);
                                else if (typeof variacaoRaw === 'string' && variacaoRaw.trim().startsWith('[')) {
                                    const parsed = JSON.parse(variacaoRaw);
                                    if (Array.isArray(parsed)) variacoes = parsed.map(s=>String(s).trim()).filter(Boolean);
                                    else variacoes = [];
                                } else if (typeof variacaoRaw === 'string') {
                                    variacoes = variacaoRaw.split(/[,;]+/).map(s=>s.trim()).filter(Boolean);
                                }
                            } catch (e) { variacoes = [] }
                            const variacaoHtml = variacoes.length  variacoes.map(v => `<span class="var-badge">${v}</span>`).join(' ') : '';
                            const custo = (typeof p.custo_unitario !== 'undefined'  parseFloat(p.custo_unitario) : (p.custo || 0)) || 0;
                            return `
                            <tr data-id="${p.id}">
                                <td><strong>${codigo}</strong></td>
                                <td>${descricao}</td>
                                <td>${unidade}</td>
                                <td class="text-center"><span class="estoque-number">${estoqueVal}</span></td>
                                <td>${variacaoHtml}</td>
                                <td>R$ ${Number(custo).toFixed(2)}</td>
                                <td class="text-center">
                                    <button class="btn-sm btn-editar-prod" data-id="${p.id}">Editar</button>
                                    <button class="btn-sm btn-excluir-prod" data-id="${p.id}">Excluir</button>
                                </td>
                            </tr>
                        `; }).join('')}
                    </tbody>
                </table>
            `;

            // pagination (from server)
            function buildPagination(currentPage) {
                if (totalPages <= 1) return '';
                let pages = '';
                for (let i = 1; i <= totalPages; i++) pages += `<button class="page-btn${i===currentPage ' active':''}" data-page="${i}">${i}</button>`;
                return `<div class="pagination"><button class="page-btn" data-page="prev" ${page===1 'disabled':''}>Prev</button>${pages}<button class="page-btn" data-page="next" ${page===totalPages 'disabled':''}>Next</button></div>`;
            }

            if (containers.produtos) {
                containers.produtos.innerHTML = `<div class="estoque-card"><h3>Produtos Cadastraçãos</h3>${infoLine}${html}${buildPagination(page)}</div>`;
                containers.produtos.dataset.page = String(page);
                containers.produtos.dataset.limit = String(limit);
                containers.produtos.dataset.total = String(total);
                containers.produtos.dataset.columns = JSON.stringify(columns);
            }

            // Eventos editar/excluir
            document.querySelectorAll('.btn-editar-prod').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    try { handleEditProduct(id); } catch (err) { console.error('Erro ao abrir editor de produto:', err); }
                });
            });

            document.querySelectorAll('.btn-excluir-prod').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    if (!confirm('Confirma exclusão do produto')) return;
                    try {
                        const del = await fetch(`${API_BASE_URL}/produtos/${id}`, { method: 'DELETE' });
                        if (!del || !del.ok) {
                            const b = del  await del.json().catch(()=>null) : null;
                            const m = b && b.message  b.message : 'Falha ao excluir produto';
                            showToast(m, 'error');
                            return;
                        }
                        showToast('Produto excluído', 'success');
                        // reload products, keep current page
                        carregarProdutos();
                    } catch (err) {
                        console.error('Erro ao excluir produto:', err);
                        showToast('Erro ao excluir produto', 'error');
                    }
                });
            });

            // pagination handlers
            if (containers.produtos) {
                const paginationEl = containers.produtos.querySelector('.pagination');
                if (paginationEl) {
                    paginationEl.querySelectorAll('.page-btn').forEach(b => b.addEventListener('click', (ev) => {
                        const target = ev.currentTarget;
                        const action = target.dataset.page;
                        let cur = Number(containers.produtos.dataset.page) || 1;
                        if (action === 'prev') cur = Math.max(1, cur - 1);
                        else if (action === 'next') cur = Math.min(totalPages, cur + 1);
                        else cur = parseInt(action, 10) || 1;
                        carregarProdutos(cur, limit);
                    }));
                }
            }
        } catch (err) {
            console.error('Erro ao carregar produtos:', err);
            if (containers.produtos) {
                containers.produtos.innerHTML = '<p>Não foi possível carregar os produtos.</p>';
            }
        }
    }

    // Carregar um material e preencher o formulário para edição
    async function carregarMaterialParaEdicao(id) {
        try {
            const resp = await fetch(`${API_BASE_URL}/materiais/${id}`);
            if (!resp.ok) throw new Error('Material não encontração');
            const m = await resp.json();
            // Preencher formulário
            document.getElementById('codigo_material_form').value = m.codigo_material || '';
            document.getElementById('descricao_material_form').value = m.descricao || '';
            document.getElementById('unidade_medida_form').value = m.unidade_medida || '';
            document.getElementById('estoque_inicial_form').value = parseFloat(m.quantidade_estoque) || 0;
            // Colocar um atributo no formulário para saber que estamos editando
            forms.novoMaterial.dataset.editingId = m.id;
            // Alterar texto do botão para 'Salvar' e adicionar botão cancelar
            let submitBtn = forms.novoMaterial.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Salvar Alterações';
                if (!document.getElementById('btn-cancelar-edicao')) {
                const btnCancelar = document.createElement('button');
                btnCancelar.type = 'button';
                btnCancelar.id = 'btn-cancelar-edicao';
                btnCancelar.className = 'btn';
                btnCancelar.classList.add('ml-10');
                btnCancelar.textContent = 'Cancelar';
                btnCancelar.addEventListener('click', () => {
                    forms.novoMaterial.reset();
                    delete forms.novoMaterial.dataset.editingId;
                    submitBtn.textContent = 'Adicionar Material';
                    btnCancelar.remove();
                });
                forms.novoMaterial.appendChild(btnCancelar);
            }
            // Mostrar a view de materiais caso não esteja visível
            showView('materiais');
        } catch (err) {
            console.error('Erro ao carregar material para edição:', err);
            showToast('Não foi possível carregar o material para edição.', 'error');
        }
    }

    // Carregar e renderizar histórico de ordens de compra
    async function carregarOrdensDeCompra() {
        try {
            const response = await fetch(`${API_BASE_URL}/ordens-compra`);
            const ordens = await response.json();
            let tableHTML = `
                 <table class="estoque-table">
                    <thead>
                        <tr>
                            <th>Cód. Material</th><th>Descrição</th><th>Qtd.</th><th>Data Pedido</th><th>Previsão Entrega</th><th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ordens.map(o => `
                                        <tr>
                                            <td>${o.codigo_material}</td>
                                            <td>${o.descricao}</td>
                                            <td>${o.quantidade}</td>
                                            <td>${new Date(o.data_pedido).toLocaleDateString()}</td>
                                            <td>${new Date(o.previsao_entrega).toLocaleDateString()}</td>
                                            <td>${o.status}</td>
                                        </tr>
                                    `).join('')}
                    </tbody>
                            </table>
            `;
             containers.ordensCompra.innerHTML = tableHTML;
        } catch (error) {
            console.error('Erro ao carregar ordens de compra:', error);
            containers.ordensCompra.innerHTML = '<p>Não foi possível carregar o histórico.</p>';
        }
    }
    
    // Popular o <select> de materiais no formulário de ordem de compra
    async function carregarMateriaisParaSelect() {
        try {
            const response = await fetch(`${API_BASE_URL}/materiais`);
            const materiais = await response.json();
            containers.materialSelect.innerHTML = '<option value="">-- Selecione um material --</option>';
            materiais.forEach(m => {
                const option = document.createElement('option');
                option.value = m.id;
                option.textContent = `${m.codigo_material} - ${m.descricao}`;
                containers.materialSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar materiais para o select:', error);
        }
    }


    // --- INICIALIZAÇÃO ---
    // NOTE: initial showView call was moved to after the showView override
    // so that dashboard renderers (renderPainelCustos, renderPainelDashboard, etc.)
    // are invoked on first load. See bottom of file where showView is overridden.

    // Product modal helpers (dynamic rendering)
    const productModal = document.getElementById('product-modal');
    const productForm = document.getElementById('product-form');
    const btnNovoProduto = document.getElementById('btn-novo-produto');
    const productFormBody = document.getElementById('product-form-body');

    function renderProductFormFields(values = {}) {
        if (!productFormBody) return;
        productFormBody.innerHTML = '';
        // attempt to use server-provided columns (stored previously) to mirror DB schema
        let cols = [];
        try { cols = JSON.parse(containers.produtos.dataset.columns || '[]'); } catch (e) { cols = []; }
        const schema = fieldSchemas.produto || {};
        // Build a list of keys: prefer server columns, but keep schema order for known fields
        let keys = Array.isArray(cols) && cols.length  cols.slice() : Object.keys(schema);
        // Ensure common product fields are present and in a friendly order
        const preferred = ['codigo','descricao','unidade_medida','quantidade_estoque','custo_unitario'];
        keys = preferred.concat(keys.filter(k => !preferred.includes(k)));
        // render fields, excluding foto_url per your request
        keys.forEach((key) => {
            if (key === 'foto_url' || key === 'id' || key === 'created_at') return; // skip image, id and created_at
            let cfg = schema[key] || {};
            if (!cfg || Object.keys(cfg).length === 0) {
                // fallback to label/type hints
                cfg = {
                    label: columnLabelMap[key] || key,
                    type: columnTypeHints[key] || (key.includes('quantidade') || key.includes('custo')  'number' : 'text')
                };
            }
            const wrapper = document.createElement('div');
            wrapper.className = 'product-form-field';
            const label = document.createElement('label');
            label.htmlFor = `product-${key}`;
            label.innerText = cfg.label || key;
            let input;
            if (key === 'variacao') {
                // create a tag-input UI: visible tag box + input + hidden input with CSV value
                const tagsWrap = document.createElement('div');
                tagsWrap.className = 'variacao-tags-wrap';
                const hidden = document.createElement('input');
                hidden.type = 'hidden';
                hidden.id = `product-${key}`;
                hidden.name = key;
                // visual tags container
                const tagContainer = document.createElement('div');
                tagContainer.className = 'variacao-tags';
                const tagInput = document.createElement('input');
                tagInput.type = 'text';
                tagInput.className = 'tag-input';
                tagInput.placeholder = 'Adicione variações e pressione Enter';

                // helper to render tags array; hidden.value stores JSON string
                function setTagsFromArray(arr) {
                    // enforce limits: max 10 tags, max 60 chars per tag
                    const cleaned = (arr || []).map(s => (s||'').toString().trim()).filter(Boolean).slice(0, 10);
                    tagContainer.innerHTML = '';
                    cleaned.forEach((t) => {
                        if (!t) return;
                        const display = t.length > 60  t.slice(0,57) + '...' : t;
                        const span = document.createElement('span');
                        span.className = 'tag';
                        span.innerText = display;
                        const rem = document.createElement('button'); rem.type = 'button'; rem.className = 'tag-remove'; rem.innerText = '×';
                        rem.addEventListener('click', () => {
                            const cur = getTags();
                            const next = cur.filter(x=> x !== t);
                            setTagsFromArray(next);
                        });
                        span.appendChild(rem);
                        tagContainer.appendChild(span);
                    });
                    // sync hidden value as JSON
                    try { hidden.value = JSON.stringify(cleaned); } catch (e) { hidden.value = '[]'; }
                }

                function getTags() {
                    const v = (hidden.value || '').toString().trim();
                    if (!v) return [];
                    try {
                        const parsed = JSON.parse(v);
                        if (Array.isArray(parsed)) return parsed.map(s=> String(s).trim()).filter(Boolean);
                    } catch (e) {
                        // fallthrough to legacy CSV
                    }
                    return v  v.split(/[,;]+/).map(s => s.trim()).filter(Boolean) : [];
                }

                tagInput.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter' || ev.key === ',') {
                        ev.preventDefault();
                        const val = (tagInput.value || '').trim();
                        if (val) {
                            const cur = getTags();
                            // validate length and count
                            if (cur.length >= 10) { showToast('Máx 10 variações permitidas'); tagInput.value = ''; return; }
                            if (val.length > 60) { showToast('Variação muito longa (máx 60 caracteres)'); return; }
                            cur.push(val);
                            setTagsFromArray(cur);
                            tagInput.value = '';
                        }
                    } else if (ev.key === 'Backspace' && tagInput.value === '') {
                        const cur = getTags();
                        if (cur.length) {
                            cur.pop(); setTagsFromArray(cur);
                        }
                    }
                });

                // init from provided values: accept array, JSON string or legacy CSV
                const rawVal = typeof values[key] !== 'undefined'  values[key] : (values[key] === 0  '0' : values[key] || '');
                if (Array.isArray(rawVal)) {
                    hidden.value = JSON.stringify(rawVal);
                    setTagsFromArray(rawVal);
                } else if (typeof rawVal === 'string' && rawVal.trim().startsWith('[')) {
                    try {
                        const parsed = JSON.parse(rawVal);
                        if (Array.isArray(parsed)) {
                            hidden.value = JSON.stringify(parsed);
                            setTagsFromArray(parsed);
                        } else {
                            hidden.value = JSON.stringify([]);
                            setTagsFromArray([]);
                        }
                    } catch (e) {
                        const parts = (rawVal||'').split(/[,;]+/).map(s=>s.trim()).filter(Boolean);
                        hidden.value = JSON.stringify(parts);
                        setTagsFromArray(parts);
                    }
                } else if (typeof rawVal === 'string' && rawVal.trim().length > 0) {
                    const parts = rawVal.split(/[,;]+/).map(s=>s.trim()).filter(Boolean);
                    hidden.value = JSON.stringify(parts);
                    setTagsFromArray(parts);
                } else {
                    hidden.value = JSON.stringify([]);
                    setTagsFromArray([]);
                }

                tagsWrap.appendChild(tagContainer);
                tagsWrap.appendChild(tagInput);
                tagsWrap.appendChild(hidden);
                input = tagInput; // keep reference for focus/placeholder usage
                // append the tagsWrap instead of a simple input/textarea
                wrapper.appendChild(label);
                wrapper.appendChild(tagsWrap);
                productFormBody.appendChild(wrapper);
                return; // skip the generic input append below
            } else if (cfg.type === 'textarea' || key === 'descricao') {
                input = document.createElement('textarea');
                input.rows = 4;
            } else {
                input = document.createElement('input');
                input.type = cfg.type || (key.includes('quantidade') || key.includes('custo')  'number' : 'text');
                if (cfg.step) input.step = cfg.step;
                if (typeof cfg.min !== 'undefined') input.min = cfg.min;
            }
            input.id = `product-${key}`;
            input.name = key;
            input.placeholder = cfg.placeholder || '';
            if (cfg.required) input.required = true;
            input.value = typeof values[key] !== 'undefined'  values[key] : (values[key] === 0  '0' : values[key] || '');
            wrapper.appendChild(label);
            wrapper.appendChild(input);
            productFormBody.appendChild(wrapper);
        });
        // add computed reaçãonly field for total value (quantidade_estoque * custo_unitario)
        const totalWrap = document.createElement('div');
    totalWrap.classList.add('d-flex','flex-column','gap-6');
        const totalLabel = document.createElement('label'); totalLabel.innerText = 'Valor em Estoque (R$)';
        const totalInput = document.createElement('input'); totalInput.type = 'text'; totalInput.id = 'product-custo-total'; totalInput.readOnly = true; totalInput.classList.add('input-reaçãonly');
        totalWrap.appendChild(totalLabel); totalWrap.appendChild(totalInput);
        productFormBody.appendChild(totalWrap);
    }

    function computeAndSetTotal() {
        const qEl = document.getElementById('product-quantidade_estoque') || document.getElementById('product-quantidade') || document.getElementById('product-quantidadeEstoque');
        const cEl = document.getElementById('product-custo_unitario') || document.getElementById('product-custo') || document.getElementById('product-custoUnitario');
        const totalEl = document.getElementById('product-custo-total');
        const q = parseFloat(qEl  qEl.value : 0) || 0;
        const c = parseFloat(cEl  cEl.value : 0) || 0;
        if (totalEl) totalEl.value = (q * c).toFixed(2);
    }

    // Compute total for order modal (quantidade * valor_unitario)
    function computeAndSetOrderTotal() {
        const qEl = document.getElementById('order-quantidade');
        const uEl = document.getElementById('order-valor_unitario');
        const totalEl = document.getElementById('order-valor_total');
        const q = parseFloat(qEl  qEl.value : 0) || 0;
        const u = parseFloat(uEl  uEl.value : 0) || 0;
        if (totalEl) {
            // keep two decimals, handle NaN gracefully
            totalEl.value = (q * u).toFixed(2);
        }
    }

    // Lightweight toast helper used by tag validation and other UI feedback
    function showToast(message, type = 'success', timeout = 3000) {
        try {
            let container = document.querySelector('.toast-container');
            if (!container) {
                container = document.createElement('div');
                container.className = 'toast-container';
                document.body.appendChild(container);
            }
            const t = document.createElement('div');
            t.className = 'toast ' + (type === 'error'  'error' : 'success');
            t.innerText = message || '';
            container.appendChild(t);
            // fade out after timeout using CSS helper class
            setTimeout(() => {
                t.classList.add('fade-out');
                t.addEventListener('transitionend', () => { try { t.remove(); } catch (e) {} });
            }, timeout);
            // allow click to dismiss
            t.addEventListener('click', () => { try { t.remove(); } catch (e) {} });
        } catch (e) { console.warn('showToast error', e); }
    }

    function openProductModal(product = {}) {
        // Usar o MODAL DRAWER LATERAL (modal-editar-produto)
        console.log('🔵 openProductModal chamação, usando Modal Drawer Lateral');
        
        if (typeof window.abrirModalEditarProduto === 'function') {
            // Abrir modal drawer lateral com ID do produto
            window.abrirModalEditarProduto(product.id || null);
        } else {
            console.error('❌ Função window.abrirModalEditarProduto não encontrada');
            alert('Erro: Modal de edição não está disponível');
        }
        
        /* CÓDIGO ANTIGO REMOVIDO - usava modal rico
        if (typeof abrirModalProdutoRico === 'function') {
            const produtoFormatação = { ... };
            abrirModalProdutoRico(produtoFormatação);
        } else {
            console.warn('Modal rico não disponível, aguardando carregamento...');
            setTimeout(() => openProductModal(product), 500);
        }
        */
    }

    function closeProductModal() { if (productModal) closeAccessibleModal(productModal); }

    if (btnNovoProduto) btnNovoProduto.addEventListener('click', () => openProductModal());

    if (productForm) productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('product-id').value;
    const schema = fieldSchemas.produto || {};
        const payload = {};
    Object.keys(schema).forEach(k => {
            const el = document.getElementById(`product-${k}`);
            if (!el) return;
            if (schema[k].type === 'number') payload[k] = parseFloat(el.value) || 0;
            else payload[k] = (el.value || '').trim();
        });
    // also include variacao if present in form but not in schema keys; ensure array
    const varEl = document.getElementById('product-variacao');
    if (varEl && !Object.prototype.hasOwnProperty.call(payload, 'variacao')) {
        const raw = (varEl.value || '').toString().trim();
        try {
            const parsed = JSON.parse(raw);
            payload.variacao = Array.isArray(parsed)  parsed.map(s=>String(s).trim()).filter(Boolean) : [];
        } catch (e) {
            payload.variacao = raw  raw.split(/[,;]+/).map(s=>s.trim()).filter(Boolean) : [];
        }
    }
        // minimal validation
    if (!payload.codigo || !payload.descricao) { showToast('Preencha código e descrição', 'warning'); return; }
        try {
            let resp;
            if (id) {
                resp = await fetch(`${API_BASE_URL}/produtos/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
            } else {
                resp = await fetch(`${API_BASE_URL}/produtos`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
            }
            if (!resp || !resp.ok) {
                const body = resp  await resp.json().catch(()=>null) : null;
                const msg = (body && body.message)  body.message : 'Erro ao salvar produto';
                showToast(msg, 'error');
                return;
            }
            showToast(id  'Produto atualização com sucesso' : 'Produto criação com sucesso', 'success');
            closeProductModal();
            carregarProdutos();
        } catch (err) {
            console.error('Erro ao salvar produto', err);
            showToast('Erro ao salvar produto', 'error');
        }
    });

    const productCancelBtn = document.getElementById('product-cancel');
    if (productCancelBtn) productCancelBtn.addEventListener('click', () => closeProductModal());

    // --- Ordem Modal (rich quick-create) ---
    const orderModal = document.getElementById('order-modal');
    const orderForm = document.getElementById('order-form');
    const orderCancel = document.getElementById('order-cancel');
    const orderCloseBtn = document.getElementById('order-modal-close');

    function openOrderModal(prefill = {}) {
        try {
            // populate fields safely
            document.getElementById('order-codigo_produto').value = prefill.codigo_produto || '';
            document.getElementById('order-quantidade').value = typeof prefill.quantidade !== 'undefined'  prefill.quantidade : '';
            document.getElementById('order-descricao_produto').value = prefill.descricao_produto || '';
            document.getElementById('order-data_previsao_entrega').value = prefill.data_previsao_entrega || '';
            document.getElementById('order-observacoes').value = prefill.observacoes || '';
        } catch (e) { /* ignore missing elements */ }
        if (orderModal) {
            openAccessibleModal(orderModal);
            // ensure at least one item row exists and focus the first input for faster data entry
            setTimeout(() => {
                try {
                    const firstCode = document.querySelector('#order-items-tbody .item-codigo') || document.querySelector('#order-items-tbody .order-item-codigo');
                    if (firstCode) { firstCode.focus(); return; }
                    const fallback = document.getElementById('order-codigo_produto'); if (fallback) fallback.focus();
                } catch (e) {}
            }, 140);
        }
    }

    function closeOrderModal() { if (orderModal) closeAccessibleModal(orderModal); }

    if (orderCancel) orderCancel.addEventListener('click', (e)=>{ e.preventDefault(); closeOrderModal(); });
    if (orderCloseBtn) orderCloseBtn.addEventListener('click', (e)=>{ e.preventDefault(); closeOrderModal(); });

    if (orderForm) orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            console.log('🚀 [SUBMIT] Iniciando submissão da ordem...');
            
            // Coletar itens da tabela
            const tbody = document.getElementById('order-items-tbody');
            const items = [];
            if (tbody) {
                Array.from(tbody.querySelectorAll('tr')).forEach(row => {
                    const codigo = (row.querySelector('.item-codigo') || row.querySelector('.order-item-codigo')).value || '';
                    const descricao = (row.querySelector('.item-descricao') || row.querySelector('.order-item-produto')).value || '';
                    const quantidade = parseFloat((row.querySelector('.item-quantidade') || row.querySelector('.order-item-qtde')).value) || 0;
                    const valor_unitario = parseFloat((row.querySelector('.item-valor_unitario') || row.querySelector('.order-item-valor-unit')).value) || 0;
                    if (descricao || codigo) {
                        items.push({ codigo, descricao, quantidade, valor_unitario });
                    }
                });
            }
            
            console.log(`📦 [SUBMIT] Coletaçãos ${items.length} itens:`, items);
            
            // ✅ VALIDAÇÃO COMPLETA DE CAMPOS OBRIGATÓRIOS
            const errors = [];
            
            // Limpar erros anteriores
            document.querySelectorAll('.form-error').forEach(el => el.classList.remove('form-error'));
            document.querySelectorAll('.error-message').forEach(el => el.remove());
            
            // 1. VALIDAÇÃO: Pelo menos um produto
            if (items.length === 0) {
                errors.push('Adicione pelo menos um produto à ordem de produção');
                document.getElementById('order-add-item').classList.add('form-error');
            } else {
                // Verificar se produtos têm daçãos válidos
                const itemsValidos = items.filter(item => item.codigo && item.descricao && item.quantidade > 0);
                if (itemsValidos.length === 0) {
                    errors.push('Preencha código, descrição e quantidade para pelo menos um produto');
                }
            }
            
            // 2. VALIDAÇÃO: Cliente & Contato (campos obrigatórios)
            const camposObrigatorios = [
                { id: 'order-cliente', nome: 'Cliente' },
                { id: 'order-contato', nome: 'Contato' },
                { id: 'order-email', nome: 'Email' },
                { id: 'order-telefone', nome: 'Telefone' },
                { id: 'order-data_previsao_entrega', nome: 'Previsão de Entrega' },
                { id: 'order-variacao', nome: 'Variação' },
                { id: 'order-embalagem', nome: 'Embalagem' },
                { id: 'order-lances', nome: 'Lance(s)' }
            ];
            
            camposObrigatorios.forEach(campo => {
                const elemento = document.getElementById(campo.id);
                if (elemento) {
                    const valor = elemento.value.trim();
                    if (!valor) {
                        errors.push(`${campo.nome} é obrigatório`);
                        elemento.classList.add('form-error');
                        
                        // Adicionar mensagem de erro específica
                        const errorMsg = document.createElement('span');
                        errorMsg.className = 'error-message';
                        errorMsg.textContent = `${campo.nome} é obrigatório`;
                        elemento.parentNode.appendChild(errorMsg);
                    }
                }
            });
            
            // 3. VALIDAÇÃO: Email válido
            const emailInput = document.getElementById('order-email');
            if (emailInput && emailInput.value.trim()) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(emailInput.value.trim())) {
                    errors.push('Email deve ter um formato válido');
                    emailInput.classList.add('form-error');
                    
                    const errorMsg = document.createElement('span');
                    errorMsg.className = 'error-message';
                    errorMsg.textContent = 'Email deve ter um formato válido';
                    emailInput.parentNode.appendChild(errorMsg);
                }
            }
            
            // 4. VALIDAÇÃO: Data de previsão não pode ser no passação
            const dataPrevisaoInput = document.getElementById('order-data_previsao_entrega');
            if (dataPrevisaoInput && dataPrevisaoInput.value) {
                const dataPrevisao = new Date(dataPrevisaoInput.value);
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                
                if (dataPrevisao < hoje) {
                    errors.push('Previsão de entrega não pode ser no passação');
                    dataPrevisaoInput.classList.add('form-error');
                    
                    const errorMsg = document.createElement('span');
                    errorMsg.className = 'error-message';
                    errorMsg.textContent = 'Data não pode ser no passação';
                    dataPrevisaoInput.parentNode.appendChild(errorMsg);
                }
            }
            
            // 5. MOSTRAR ERROS SE HOUVER
            if (errors.length > 0) {
                console.warn('❌ [VALIDAÇÃO] Erros encontraçãos:', errors);
                
                // Criar resumo de validação
                const existingSummary = document.querySelector('.validation-summary');
                if (existingSummary) existingSummary.remove();
                
                const validationSummary = document.createElement('div');
                validationSummary.className = 'validation-summary';
                validationSummary.innerHTML = `
                    <h5>⚠️ Corrija os seguintes erros:</h5>
                    <ul>
                        ${errors.map(error => `<li>${error}</li>`).join('')}
                    </ul>
                `;
                
                // Inserir no topo do modal
                const modalBody = document.querySelector('#order-modal .modal-body');
                if (modalBody) {
                    modalBody.insertBefore(validationSummary, modalBody.firstChild);
                    
                    // Scroll para o topo para mostrar os erros
                    modalBody.scrollTop = 0;
                }
                
                showToast(`${errors.length} erro(s) de validação encontração(s)`, 'warning');
                return;
            }
            
            console.log('✅ [VALIDAÇÃO] Todos os campos obrigatórios preenchidos corretamente');
            
            // Verificar se os elementos existem antes de acessar
            const dataPrevisao = document.getElementById('order-data_previsao_entrega');
            const observacoes = document.getElementById('order-observacoes');
            const cliente = document.getElementById('order-cliente');
            const clienteId = document.getElementById('order-cliente_id');
            const contato = document.getElementById('order-contato');
            const email = document.getElementById('order-email');
            const telefone = document.getElementById('order-telefone');
            const frete = document.getElementById('order-frete');
            const vendedor = document.getElementById('order-vendedor');
            const numeroOrcamento = document.getElementById('order-numero_orcamento');
            const revisao = document.getElementById('order-revisao');
            const pedidoReferencia = document.getElementById('order-pedido_referencia');
            const valorTotal = document.getElementById('order-valor_total');
            
            const payload = {
                // Usar daçãos dos itens em vez de campos únicos
                items: items,
                quantidade_total: items.reduce((sum, item) => sum + item.quantidade, 0),
                valor_total: parseFloat(valorTotal.value) || items.reduce((sum, item) => sum + (item.quantidade * item.valor_unitario), 0),
                data_previsao_entrega: dataPrevisao  dataPrevisao.value || null : null,
                observacoes: (observacoes  observacoes.value || '' : '').toString().trim(),
                cliente: (cliente  cliente.value || '' : '').toString().trim(),
                cliente_id: (clienteId  clienteId.value : '') || null,
                contato: (contato  contato.value || '' : '').toString().trim(),
                email: (email  email.value || '' : '').toString().trim(),
                telefone: (telefone  telefone.value || '' : '').toString().trim(),
                frete: (frete  frete.value || '' : '').toString().trim(),
                vendedor: (vendedor  vendedor.value || '' : '').toString().trim(),
                numero_orcamento: (numeroOrcamento  numeroOrcamento.value || '' : '').toString().trim(),
                revisao: (revisao  revisao.value || '' : '').toString().trim(),
                pedido_referencia: (pedidoReferencia  pedidoReferencia.value || '' : '').toString().trim(),
                data_liberacao: document.getElementById('order-data_liberacao').value || null
            };
            // new fields: variacao (array), embalagem, lances (array), transportaçãora (object)
            const rawVariacao = (document.getElementById('order-variacao').value || '').toString().trim();
            payload.variacao = rawVariacao  rawVariacao.split(/[;,]+/).map(s=>s.trim()).filter(Boolean) : [];
            payload.embalagem = (document.getElementById('order-embalagem').value || '').toString().trim();
            const rawLances = (document.getElementById('order-lances').value || '').toString().trim();
            payload.lances = rawLances  rawLances.split(/[;,]+/).map(s=> { const n=parseFloat(s); return Number.isFinite(n) n: s; }).filter(()=>true) : [];
            payload.transportaçãora = {
                nome: (document.getElementById('order-transportaçãora_nome').value || '').toString().trim(),
                fone: (document.getElementById('order-transportaçãora_fone').value || '').toString().trim(),
                cep: (document.getElementById('order-transportaçãora_cep').value || '').toString().trim(),
                endereco: (document.getElementById('order-transportaçãora_endereco').value || '').toString().trim(),
                cpf_cnpj: (document.getElementById('order-transportaçãora_cpf_cnpj').value || '').toString().trim(),
                email_nfe: (document.getElementById('order-transportaçãora_email_nfe').value || '').toString().trim()
            };

            // basic validation for cpf/cnpj (loose: 11 or 14 digits)
            if (payload.transportaçãora.cpf_cnpj) {
                const digits = payload.transportaçãora.cpf_cnpj.replace(/[^0-9]/g,'');
                if (!(digits.length === 11 || digits.length === 14)) { showToast('CPF/CNPJ da transportaçãora inválido', 'warning'); return; }
            }
            
            console.log('✅ [SUBMIT] Validação aprovada, enviando payload:', payload);
            
            // *** NOVA IMPLEMENTAÇÃO: GERAR EXCEL DIRETAMENTE ***
            console.log('🚀 [SUBMIT] Gerando ordem de produção em Excel...');
            showToast('Gerando ordem de produção em Excel...', 'info');
            
            // Enviar como JSON em vez de FormData para compatibilidade
            const resp = await fetch(`${API_BASE_URL}/ordens-producao`, { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            
            console.log('📡 [SUBMIT] Resposta do servidor:', resp.status, resp.statusText);
            
            if (!resp.ok) {
                const body = await resp.text().catch(()=>null);
                const msg = body || 'Erro ao gerar ordem de produção Excel';
                console.error('❌ [SUBMIT] Erro:', msg);
                showToast(msg, 'error');
                return;
            }
            
            // Fazer download do arquivo Excel
            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ordem_producao_${Date.now()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            console.log('✅ [SUBMIT] Excel geração e baixação com sucesso!');
            showToast('Ordem de produção Excel gerada com sucesso!', 'success');
            closeOrderModal();
            // refresh dashboard lists
            try { carregarOrdens(); renderPCPRecentOrders(); } catch (e) {}
        } catch (err) {
            console.error('❌ [SUBMIT] Erro ao criar ordem:', err);
            showToast('Erro ao criar ordem: ' + (err.message || 'Erro desconhecido'), 'error');
        }
    });

    // Order items management (rich modal)
    (function(){
        const addBtn = document.getElementById('order-add-item');
        const tbody = document.getElementById('order-items-tbody');
        const totalInput = document.getElementById('order-valor_total');
        const orderFormRef = document.getElementById('order-form'); // Referência local

        function formatCurrency(n){ return Number(n||0).toFixed(2); }

        function recalcTotals(){
            let sum = 0;
            if (!tbody) return;
            Array.from(tbody.querySelectorAll('tr')).forEach(row => {
                const q = parseFloat((row.querySelector('.item-quantidade') || row.querySelector('.order-item-qtde')).value) || 0;
                const u = parseFloat((row.querySelector('.item-valor_unitario') || row.querySelector('.order-item-valor-unit')).value) || 0;
                const t = q * u;
                const totalCell = row.querySelector('.item-total') || row.querySelector('.order-item-valor-total');
                if (totalCell) {
                    if (totalCell.tagName === 'INPUT') {
                        totalCell.value = formatCurrency(t);
                    } else {
                        totalCell.innerText = formatCurrency(t);
                    }
                }
                sum += t;
            });
            if (totalInput) totalInput.value = formatCurrency(sum);
        }

        function removeRow(e){
            const tr = e.target.closest('tr'); if (!tr) return; tr.remove(); recalcTotals();
        }

        function createRow(item={codigo:'',descricao:'',quantidade:1,valor_unitario:0}){
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input class="item-codigo order-item-codigo" type="text" aria-label="Código do item" value="${escapeHtml(item.codigo||'')}"></td>
                <td><input class="item-descricao order-item-produto" type="text" aria-label="Descrição do item" value="${escapeHtml(item.descricao||'')}"></td>
                <td style="text-align:right"><input class="item-quantidade order-item-qtde" type="number" step="1" aria-label="Quantidade" value="${item.quantidade}" /></td>
                <td style="text-align:right"><input class="item-valor_unitario order-item-valor-unit" type="number" step="0.01" aria-label="Valor unitário" value="${item.valor_unitario}" /></td>
                <td style="text-align:right" class="item-total order-item-valor-total">0.00</td>
                <td style="text-align:center"><button type="button" class="btn btn-sm order-item-remove" aria-label="Remover item">Rem</button></td>
            `;
            // attach listeners
            tr.querySelectorAll('.item-quantidade, .item-valor_unitario, .order-item-qtde, .order-item-valor-unit').forEach(inp=>{
                inp.addEventListener('input', recalcTotals);
            });
            // Allow Enter on last input to add a new row quickly
            const lastInput = tr.querySelector('.item-valor_unitario') || tr.querySelector('.order-item-valor-unit');
            if (lastInput) lastInput.addEventListener('keydown', (ev)=>{
                if (ev.key === 'Enter') {
                    ev.preventDefault(); const next = createRow({}); tbody.appendChild(next); 
                    const firstInput = next.querySelector('.item-codigo') || next.querySelector('.order-item-codigo');
                    if (firstInput) firstInput.focus();
                    recalcTotals();
                }
            });
            tr.querySelector('.order-item-remove').addEventListener('click', removeRow);
            return tr;
        }

        if (addBtn && tbody) addBtn.addEventListener('click', (e)=>{
            const r = createRow({}); tbody.appendChild(r); recalcTotals(); 
            try { 
                const firstInput = r.querySelector('.item-codigo') || r.querySelector('.order-item-codigo');
                if (firstInput) firstInput.focus();
            } catch(e){}
        });

        // When form submits, gather items into a hidden input so backend receives them
        if (orderFormRef) orderFormRef.addEventListener('submit', (ev)=>{
            try {
                const items = [];
                Array.from(tbody.querySelectorAll('tr')).forEach(row=>{
                    const codigo = (row.querySelector('.item-codigo') || row.querySelector('.order-item-codigo')).value || '';
                    const descricao = (row.querySelector('.item-descricao') || row.querySelector('.order-item-produto')).value || '';
                    const quantidade = parseFloat((row.querySelector('.item-quantidade') || row.querySelector('.order-item-qtde')).value) || 0;
                    const valor_unitario = parseFloat((row.querySelector('.item-valor_unitario') || row.querySelector('.order-item-valor-unit')).value) || 0;
                    if (descricao || codigo) items.push({ codigo, descricao, quantidade, valor_unitario });
                });
                // attach as JSON on the form via a hidden input
                let hidden = document.getElementById('order-items-hidden');
                if (!hidden) { hidden = document.createElement('input'); hidden.type='hidden'; hidden.id='order-items-hidden'; hidden.name='items_json'; orderFormRef.appendChild(hidden); }
                hidden.value = JSON.stringify(items);
                
                console.log(`📦 Coletaçãos ${items.length} itens para envio:`, items);
            } catch (e) { 
                console.error('❌ Erro na coleta de itens:', e);
            }
        });

        // Initialize with one empty row for discoverability
        try { if (tbody && tbody.children.length === 0) { tbody.appendChild(createRow({})); recalcTotals(); } } catch(e){}
    })();

    // Debounced product lookup for order modal (shows basic product and stock info)
    (function(){
        let lookupTimer = null;
        const codeEl = document.getElementById('order-codigo_produto');
        const previewEl = document.getElementById('order-product-preview');
        async function doLookup(code) {
            if (!code || !previewEl) { if (previewEl) previewEl.innerText = ''; return; }
            try {
                previewEl.innerHTML = '<span class="pcp-spinner" aria-hidden="true"></span> Consultando produto...';
                const resp = await fetch(`${API_BASE_URL}/produtosq=${encodeURIComponent(code)}&limit=1`);
                if (!resp.ok) { previewEl.innerText = 'Produto não encontração'; return; }
                const body = await resp.json();
                const list = Array.isArray(body)  body : (body.rows || []);
                const prod = list[0];
                if (!prod) { previewEl.innerText = 'Produto não encontração'; return; }
                const estoque = Number(prod.quantidade_estoque || prod.quantidade || prod.estoque || 0).toFixed(2);
                previewEl.innerHTML = `<strong>${escapeHtml(prod.codigo || prod.codigo_produto || prod.descricao || 'Produto')}</strong> — ${escapeHtml(prod.descricao || prod.descricao_produto || '')} <div class="text-sm muted">Estoque: ${estoque}</div>`;
            } catch (err) { if (previewEl) previewEl.innerText = 'Erro ao buscar produto'; }
        }
        if (codeEl) codeEl.addEventListener('input', (ev) => {
            clearTimeout(lookupTimer);
            const v = (ev.target.value || '').toString().trim();
            lookupTimer = setTimeout(() => { doLookup(v); }, 300);
        });
    })();

    // Client autocomplete for order modal: fetch clients and populate datalist
    (function(){
        const clientInput = document.getElementById('order-cliente');
        const clientDatalist = document.getElementById('clientes-list');
        const clientIdHidden = document.getElementById('order-cliente_id');
        const contatoInput = document.getElementById('order-contato');
        const emailInput = document.getElementById('order-email');
        const telefoneInput = document.getElementById('order-telefone');
        
        if (!clientInput || !clientDatalist) return;
        
        let timer = null;
        let clientesCache = []; // Cache dos clientes encontraçãos
        
        clientInput.addEventListener('input', (e)=>{
            clearTimeout(timer);
            clientIdHidden.value = ''; // reset selected id on any new typing
            // Limpar campos de contato quando digitar novo texto
            if (contatoInput) contatoInput.value = '';
            if (emailInput) emailInput.value = '';
            if (telefoneInput) telefoneInput.value = '';
            
            const q = (e.target.value || '').toString().trim();
            if (!q) { 
                clientDatalist.innerHTML = ''; 
                clientesCache = [];
                return; 
            }
            timer = setTimeout(async () => {
                try {
                    const resp = await fetch(`${API_BASE_URL}/clientesq=${encodeURIComponent(q)}`);
                    if (!resp.ok) { 
                        clientDatalist.innerHTML = ''; 
                        clientesCache = [];
                        return; 
                    }
                    const rows = await resp.json();
                    clientesCache = rows; // Armazenar daçãos completos
                    
                    clientDatalist.innerHTML = rows.map(r => {
                        // Criar label mais informativo
                        const nome = r.nome || r.razao_social || '';
                        const cnpj = r.cnpj  ` — ${r.cnpj}` : '';
                        const contato = r.contato  ` (${r.contato})` : '';
                        const label = `${nome}${cnpj}${contato}`;
                        return `<option data-id="${r.id || ''}" data-full='${JSON.stringify(r)}' value="${escapeHtml(label)}"></option>`;
                    }).join('');
                } catch (err) { 
                    clientDatalist.innerHTML = ''; 
                    clientesCache = [];
                }
            }, 250);
        });

        // When user selects an option from datalist, auto-fill contact fields
        clientInput.addEventListener('change', (e) => {
            const val = (e.target.value || '').toString().trim();
            if (!val) { 
                clientIdHidden.value = ''; 
                return; 
            }
            
            // Encontrar cliente pelos daçãos em cache ou pela option
            let clienteSelecionação = null;
            
            // Tentar encontrar pela option
            const opts = Array.from(clientDatalist.querySelectorAll('option'));
            const match = opts.find(o => o.value === val || o.getAttribute('value') === val);
            
            if (match) {
                const id = match.getAttribute('data-id') || '';
                clientIdHidden.value = id;
                
                // Tentar obter daçãos completos
                try {
                    const fullData = match.getAttribute('data-full');
                    if (fullData) {
                        clienteSelecionação = JSON.parse(fullData);
                    }
                } catch (e) {
                    // Fallback: buscar no cache
                    clienteSelecionação = clientesCache.find(c => c.id == id);
                }
                
                // Preencher campos automaticamente
                if (clienteSelecionação) {
                    if (contatoInput && clienteSelecionação.contato) {
                        contatoInput.value = clienteSelecionação.contato;
                    }
                    if (emailInput && clienteSelecionação.email) {
                        emailInput.value = clienteSelecionação.email;
                    }
                    if (telefoneInput && clienteSelecionação.telefone) {
                        telefoneInput.value = clienteSelecionação.telefone;
                    }
                    
                    // Mostrar feedback visual
                    showToast(`Daçãos de ${clienteSelecionação.nome || 'cliente'} preenchidos automaticamente`, 'success', 2000);
                }
            } else {
                clientIdHidden.value = '';
            }
        });
    })();

    // compute total on input changes (delegated)
    document.addEventListener('input', (ev) => {
        try {
            const id = ev.target && ev.target.id;
            if (!id) return;
            if (id === 'product-quantidade_estoque' || id === 'product-quantidade' || id === 'product-quantidade_estoque') computeAndSetTotal();
            if (id === 'product-custo_unitario' || id === 'product-custo' || id === 'product-custo_unitario') computeAndSetTotal();
            if (id === 'order-quantidade' || id === 'order-valor_unitario') computeAndSetOrderTotal();
        } catch (e) { /* ignore */ }
    });

    // Hook into existing edit buttons rendering
    async function handleEditProduct(id) {
      try {
        const res = await fetch(`${API_BASE_URL}/produtos/${id}`);
        if (!res.ok) throw new Error('Produto não encontração');
        const prod = await res.json();
        openProductModal(prod);
    } catch (err) { showToast('Não foi possível obter o produto para edição', 'error'); }
    }

// Sidebar toggle (hidden by default via body.sidebar-hidden)
const btnToggleMenu = document.getElementById('btn-toggle-menu');
const sidebarOverlay = document.getElementById('sidebar-overlay');
if (btnToggleMenu && sidebarOverlay) {
    function openSidebar() {
        document.body.classList.remove('sidebar-hidden');
        document.body.classList.add('sidebar-expanded');
        sidebarOverlay.classList.add('visible');
        try { btnToggleMenu.setAttribute('aria-expanded', 'true'); } catch (e) {}
    }
    function closeSidebar() {
        document.body.classList.add('sidebar-hidden');
        document.body.classList.remove('sidebar-expanded');
        sidebarOverlay.classList.remove('visible');
        try { btnToggleMenu.setAttribute('aria-expanded', 'false'); } catch (e) {}
    }

    btnToggleMenu.addEventListener('click', ()=>{
        const hidden = document.body.classList.contains('sidebar-hidden');
        if (hidden) openSidebar(); else closeSidebar();
    });

    // keyboard activation: Enter or Space key should toggle the sidebar when button focused
    btnToggleMenu.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            const hidden = document.body.classList.contains('sidebar-hidden');
            if (hidden) openSidebar(); else closeSidebar();
        }
    });

    sidebarOverlay.addEventListener('click', ()=>{ closeSidebar(); try { btnToggleMenu.focus(); } catch(e){} });
}

// Buttons inside views that open/close the sidebar (e.g., materiais and ordem-compra headers)
document.querySelectorAll('.btn-toggle-sidebar').forEach(b => {
    b.addEventListener('click', (e) => {
        e.preventDefault();
        try {
            // If openSidebar/closeSidebar functions are in scope use them, else toggle existing button
            const hidden = document.body.classList.contains('sidebar-hidden');
            if (typeof openSidebar === 'function' && typeof closeSidebar === 'function') {
                if (hidden) openSidebar(); else closeSidebar();
            } else {
                const primary = document.getElementById('btn-toggle-menu');
                if (primary) primary.click();
            }
        } catch (err) { try { document.getElementById('btn-toggle-menu').click(); } catch(e){} }
    });
});

// Sidebar is fixed/expanded by default; pin control removed per UI decision.
try {
    // Force sidebar hidden on initial page load: menu should only appear when the user toggles it
    document.body.classList.add('sidebar-hidden');
    document.body.classList.remove('sidebar-expanded');
    try { if (btnToggleMenu) btnToggleMenu.setAttribute('aria-expanded', 'false'); } catch (e) {}
    // ensure overlay is not visible
    if (sidebarOverlay) sidebarOverlay.classList.remove('visible');
} catch (e) {}

// Click on brand logo should take user to home/dashboard
const brandLogo = document.querySelector('.brand-logo');
    if (brandLogo) {
    brandLogo.classList.add('clickable');
    brandLogo.addEventListener('click', (e) => {
        e.preventDefault();
        try { showView('dashboard'); } catch (err) { window.location.href = '/'; }
    });
}

// Sidebar logo (left) should also navigate to dashboard and close sidebar
const sidebarLogo = document.querySelector('.logo-sidebar');
    if (sidebarLogo) {
    sidebarLogo.classList.add('clickable');
    sidebarLogo.addEventListener('click', (e) => {
        e.preventDefault();
        try { showView('dashboard'); } catch (err) { /* ignore */ }
    // close sidebar if open
    document.body.classList.add('sidebar-hidden');
    if (sidebarOverlay) sidebarOverlay.classList.remove('visible');
    });
}

// Also bind by ID for the logos we added in the HTML so handlers remain stable
const brandLogoId = document.getElementById('brand-logo');
if (brandLogoId) {
    brandLogoId.classList.add('clickable');
    brandLogoId.addEventListener('click', (e) => { e.preventDefault(); try { showView('dashboard'); } catch (err) { window.location.href = '/'; } });
}
// sidebar logo removed — no element to bind

// Global: close any modal when its .modal-close button is clicked (use accessible helper)
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
        try {
            const modal = e.currentTarget.closest('.modal');
            if (modal) closeAccessibleModal(modal);
            // also ensure product modal (which is not always a .modal) is closed when relevant close btn used
            const productModalEl = document.getElementById('product-modal');
            if (productModalEl) closeAccessibleModal(productModalEl);
        } catch (err) { /* ignore */ }
    });
});

// Global: press ESC to close any open modal (keyboard accessibility)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
        try {
            document.querySelectorAll('.modal').forEach(m => { if (m) closeAccessibleModal(m); });
            const pm = document.getElementById('product-modal');
            if (pm) closeAccessibleModal(pm);
            // hide sidebar overlay too
            if (sidebarOverlay) sidebarOverlay.classList.remove('visible');
            document.body.classList.add('sidebar-hidden');
        } catch (err) { /* ignore */ }
    }
});

// New product button opens product modal (ensure it always opens the existing modal)
const novoProdutoBtn = document.getElementById('btn-novo-produto');
if (novoProdutoBtn) novoProdutoBtn.addEventListener('click', (e)=> { e.preventDefault(); openProductModal(); });

// Also ensure any element with class .btn-novo-produto will open modal (compatibility)
document.querySelectorAll('.btn-novo-produto').forEach(el => el.addEventListener('click', (e)=> { e.preventDefault(); openProductModal(); }));

// close product modal when clicking outside is handled by the primary product modal handlers above

// initial state: ensure sidebar overlay hidden
if (sidebarOverlay) sidebarOverlay.classList.remove('visible');
    
    // --- Busca principal (inline + modal) ---
    const mainSearch = document.getElementById('main-search');
    const searchInline = document.getElementById('search-inline-results');
    const searchModal = document.getElementById('search-results-modal');
    const searchResultsBody = document.getElementById('search-results-body');
    const searchModalClose = document.getElementById('search-modal-close');
    let searchDebounce = null;
    if (mainSearch) {
        // Ensure dropdown is rendered at document.body level so it won't be clipped by ancestor stacking contexts
        function positionSearchDropdown() {
            try {
                if (!searchInline || !mainSearch) return;
                // append to body if not already
                if (!document.body.contains(searchInline)) document.body.appendChild(searchInline);
                const rect = mainSearch.getBoundingClientRect();
                // place just below the input, keep same width
                const top = Math.max(rect.bottom + window.scrollY + 6, 6);
                const left = rect.left + window.scrollX;
                searchInline.style.position = 'absolute';
                searchInline.style.left = left + 'px';
                searchInline.style.top = top + 'px';
                searchInline.style.width = rect.width + 'px';
                searchInline.style.zIndex = 30000;
                searchInline.style.pointerEvents = 'auto';
            } catch (e) { /* ignore positioning errors */ }
        }

        // reposition on scroll/resize while dropdown visible
        let _repositionHandler = () => { if (searchInline && searchInline.classList && searchInline.classList.contains('visible')) positionSearchDropdown(); };
        window.addEventListener('resize', _repositionHandler);
        window.addEventListener('scroll', _repositionHandler, true);
        // click outside hides the dropdown
        document.addEventListener('click', (ev) => {
            try {
                if (!searchInline) return;
                if (!searchInline.classList.contains('visible')) return;
                if (ev.target === mainSearch) return; // clicking the input keeps it
                if (!searchInline.contains(ev.target)) searchInline.classList.remove('visible');
            } catch (e) {}
        });
        mainSearch.addEventListener('input', (e) => {
            clearTimeout(searchDebounce);
            const q = String(e.target.value || '').trim();
            if (!q) { if (searchInline) searchInline.classList.remove('visible'); return; }
            searchDebounce = setTimeout(async () => {
                try {
                    // call unified search, but also ensure products are available quickly
                    // If query is purely numeric or starts with # treat as pedido lookup
                    let searchResp = {};
                    let prodsResp = { rows: [] };
                    if (/^#\d+$/.test(q)) {
                        // try lookup pedido by id
                        const id = q.replace('#','');
                        try { const r = await fetch(`${API_BASE_URL}/pedidos/${encodeURIComponent(id)}`); if (r && r.ok) { const pd = await r.json(); searchResp = { results: { pedidos: pd  [pd] : [] } }; } } catch(e){}
                    }
                    // Parallel fallback searches for general query
                    const [sResp, pResp] = await Promise.all([
                        fetch(`${API_BASE_URL}/searchq=${encodeURIComponent(q)}&limit=20`).then(r=>r.ok r.json(): {}).catch(()=>({})),
                        fetch(`${API_BASE_URL}/produtospage=1&limit=20&q=${encodeURIComponent(q)}`).then(r=>r.ok r.json(): { rows: [] }).catch(()=>({ rows: [] }))
                    ]);
                    // merge results (if searchResp empty prefer sResp)
                    searchResp = Object.keys(searchResp).length  searchResp : (sResp || {});
                    prodsResp = pResp || { rows: [] };
                    const data = searchResp || {};
                    const results = data.results || {};
                    const ordens = results.ordens || [];
                    const materias = results.materiais || [];
                    const produtos = results.produtos || [];
                    const pedidos = results.pedidos || [];
                    // merge quick product fetch (rows) into produtos list, preferring DB search
                    const prodRows = (prodsResp && prodsResp.rows)  prodsResp.rows : [];
                    // convert prodRows to the same shape if necessary and merge
                    const mergedProdutos = [...prodRows, ...produtos].slice(0, 20);
                    const items = [];
                    ordens.forEach(o => items.push({ type: 'Ordem', title: o.codigo_produto || o.descricao_produto || ('OP-'+o.id), subtitle: o.cliente || '', meta: `OP-${o.id} • ${o.status || ''}`, id: o.id }));
                    materias.forEach(m => items.push({ type: 'Material', title: m.codigo_material, subtitle: m.descricao, meta: `Estoque: ${Number(m.quantidade_estoque||0).toFixed(2)}`, id: m.id }));
                    mergedProdutos.forEach(p => items.push({ type: 'Produto', title: p.codigo || p.descricao, subtitle: p.descricao, meta: `Est: ${Number(p.quantidade_estoque||p.quantidade||0).toFixed(2)}`, id: p.id }));
                    // Include pedidos in inline results (search by empresa, pedido id, product code/name)
                    pedidos.forEach(pd => items.push({ type: 'Pedido', title: `Pedido #${pd.id}`, subtitle: pd.cliente || '', meta: `${pd.produto_codigo||pd.produto_descricao||''} • Qtd:${pd.quantidade||0}`, id: pd.id }));
                    if (items.length === 0) {
                        if (searchInline) { searchInline.innerHTML = '<div class="pad-12 text-sm muted">Nenhum resultação encontração</div>'; searchInline.classList.add('visible'); }
                        return;
                    }
                    if (searchInline) {
                        searchInline.innerHTML = items.slice(0,8).map(it => `<div class="search-item" data-type="${it.type}" data-id="${it.id}"><div class="meta"><strong>${it.title}</strong><div class="text-sm muted">${it.subtitle}</div></div><div><button data-type="${it.type}" data-id="${it.id}" class="btn-sm open-result">Abrir</button></div></div>`).join('');
                        searchInline.classList.add('visible');
                        // attach handlers: click on the row opens directly if possible
                        searchInline.querySelectorAll('.search-item').forEach(row => {
                            row.addEventListener('click', (ev) => {
                                const type = row.dataset.type;
                                const id = row.dataset.id;
                                if (!type || !id) return;
                                // If it's a Pedido or Ordem open the pedido editor directly
                                if (type.toLowerCase() === 'pedido' || type.toLowerCase() === 'ordem') {
                                    // open pedido details
                                    try { document.getElementById('search-inline-results').classList.remove('visible'); openPedidoQuickView(id); } catch(e) { openSearchModal(q, type.toLowerCase()); }
                                } else if (type.toLowerCase() === 'material') {
                                    // open materials view and focus the item
                                    try { showView('materiais'); setTimeout(()=> highlightMaterialRow(id), 150); } catch(e) { openSearchModal(q, 'material'); }
                                } else {
                                    // fallback to modal with full results
                                    openSearchModal(q, type.toLowerCase());
                                }
                            });
                        });
                        // attach button handlers for explicit open
                        searchInline.querySelectorAll('.open-result').forEach(b => b.addEventListener('click', (ev) => {
                            ev.stopPropagation();
                            const type = ev.currentTarget.dataset.type;
                            const id = ev.currentTarget.dataset.id;
                            openSearchModal(q, type.toLowerCase());
                        }));
                    }
                } catch (err) {
                    console.error('Search error:', err);
                }
            }, 300);
        });
    }

    function renderSearchModalContent(q, data) {
        if (!searchResultsBody) return;
    const ordens = data.results.ordens || [];
        const materias = data.results.materiais || [];
        const produtos = data.results.produtos || [];
    const pedidos = data.results.pedidos || [];
        let html = `<div class="pad-8 muted">Resultaçãos para <strong>"${q}"</strong></div>`;
        if (ordens.length) {
            html += '<h4>Ordens</h4>' + ordens.map(o=>`<div class="list-row pad-8"><div><strong>OP-${o.id} ${o.codigo_produto||''}</strong> — ${o.descricao_produto||''}</div><div class="text-sm muted">${o.status||''} • ${new Date(o.data_previsao_entrega||o.data_pedido||Date.now()).toLocaleDateString()}</div></div>`).join('');
        }
        if (materias.length) {
            html += '<h4>Materiais</h4>' + materias.map(m=>`<div class="list-row pad-8"><div><strong>${m.codigo_material}</strong> — ${m.descricao}</div><div class="text-sm muted">Estoque: ${m.quantidade_estoque || 0}</div></div>`).join('');
        }
        if (pedidos.length) {
            html += '<h4>Pedidos</h4>' + pedidos.map(p=>`<div class="list-row pad-8"><div><strong>Pedido #${p.id}</strong> — ${p.cliente || ''}</div><div class="text-sm muted">Produto: ${p.produto_codigo || p.produto_descricao || ''} • Qtd: ${p.quantidade || 0}</div><div class="mt-6"><button class="btn-sm open-pedido" data-id="${p.id}">Abrir pedido</button></div></div>`).join('');
        }
        if (produtos.length) {
            html += '<h4>Produtos</h4>' + produtos.map(p=>`<div class="list-row pad-8"><div><strong>${p.codigo||p.descricao}</strong> — ${p.descricao||''}</div><div class="text-sm muted">Est: ${p.quantidade_estoque || 0}</div></div>`).join('');
        }
    if (!ordens.length && !materias.length && !produtos.length) html += '<div class="pad-12 muted">Nenhum resultação encontração</div>';
        searchResultsBody.innerHTML = html;
        // attach handlers for opening pedido
        setTimeout(() => {
            const buttons = document.querySelectorAll('.open-pedido');
            buttons.forEach(b => {
                b.addEventListener('click', async (ev) => {
                    const id = ev.currentTarget.dataset.id;
                    try {
                        const resp = await fetch(`${API_BASE_URL}/pedidos/${id}`);
                        if (!resp.ok) throw new Error('Pedido não encontração');
                        const pedido = await resp.json();
                        // show in item-edit-modal
                        const editModal = document.getElementById('item-edit-modal');
                        const editTitle = document.getElementById('item-edit-title');
                        const editBody = document.getElementById('item-edit-body');
                        if (editTitle) editTitle.innerText = `Pedido #${pedido.id}`;
                        if (editBody) editBody.innerHTML = `<div><strong>Cliente:</strong> ${pedido.cliente || ''}</div><div><strong>Produto:</strong> ${pedido.produto_id || ''}</div><div><strong>Quantidade:</strong> ${pedido.quantidade || ''}</div><div><strong>Status:</strong> ${pedido.status || ''}</div>`;
                        if (editModal) openAccessibleModal(editModal);
                    } catch (err) { showToast('Erro ao carregar pedido.', 'error'); }
                });
            });
        }, 80);
    }

    async function openSearchModal(q, type) {
        try {
            const resp = await fetch(`${API_BASE_URL}/searchq=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}&limit=100`);
            const data = await resp.json();
            renderSearchModalContent(q, data);
        if (searchModal) openAccessibleModal(searchModal);
        } catch (err) { console.error('openSearchModal error', err); }
    }
    if (searchModalClose) searchModalClose.addEventListener('click', ()=> { if (searchModal) closeAccessibleModal(searchModal); });

    // Helper: open pedido quick view (used by inline search click)
    async function openPedidoQuickView(id) {
        try {
            const resp = await fetch(`${API_BASE_URL}/pedidos/${encodeURIComponent(id)}`);
            if (!resp.ok) throw new Error('Pedido não encontração');
            const pedido = await resp.json();
            const editModal = document.getElementById('item-edit-modal');
            const editTitle = document.getElementById('item-edit-title');
            const editBody = document.getElementById('item-edit-body');
            if (editTitle) editTitle.innerText = `Pedido #${pedido.id}`;
            if (editBody) editBody.innerHTML = `<pre class="pre-wrap">${JSON.stringify(pedido,null,2)}</pre>`;
            if (editModal) openAccessibleModal(editModal);
        } catch (err) { showToast('Erro ao abrir pedido.', 'error'); console.error(err); }
    }

    // Helper: highlight a material row after navigating to materials view
    function highlightMaterialRow(id) {
        try {
            const container = document.getElementById('tabela-materiais-container');
            if (!container) return;
            const row = container.querySelector(`tr[data-id="${id}"]`);
            if (!row) return;
            row.scrollIntoView({ block: 'center', behavior: 'smooth' });
            row.style.transition = 'box-shaçãow 0.4s ease, transform 0.3s ease';
            row.style.boxShaçãow = '0 8px 30px rgba(11,37,69,0.12)';
            row.style.transform = 'scale(1.01)';
            setTimeout(() => { row.style.boxShaçãow = ''; row.style.transform = ''; }, 900);
        } catch (e) { /* ignore */ }
    }

    // safe: close modal when clicking on backdrop for searchModal and itemEditModal
    try {
        if (searchModal) searchModal.addEventListener('click', (e) => { if (e.target === searchModal) closeAccessibleModal(searchModal); });
    } catch (e) {}
    try {
        const itemEditModalEl = document.getElementById('item-edit-modal');
        if (itemEditModalEl) itemEditModalEl.addEventListener('click', (e) => { if (e.target === itemEditModalEl) closeAccessibleModal(itemEditModalEl); });
    } catch (e) {}


// Load current user and update greeting in the topbar
async function setCurrentUserUI(user) {
    if (!user) return;
    try {
        const avatarNameEl = document.querySelector('.avatar-name');
        const avatarSubEl = document.querySelector('.avatar-sub');
        const avatarCircle = document.querySelector('.avatar-circle');
        
        // Usar apelido se disponível, senão primeiro nome
        let nome = (user.apelido || user.nome || user.email || '').toString();
        if (nome && nome.includes('@')) nome = nome.split('@')[0];
        const first = (nome || '').split(/\s+/)[0] || nome || '';
        const capitalized = first  (first.charAt(0).toUpperCase() + first.slice(1)) : '';
        
        // Saudação dinâmica baseada na hora
        const hour = new Date().getHours();
        let greeting = 'Bom dia';
        if (hour >= 12 && hour < 18) greeting = 'Boa tarde';
        else if (hour >= 18 || hour < 5) greeting = 'Boa noite';
        
        if (avatarNameEl) avatarNameEl.innerText = capitalized  `${greeting}, ${capitalized}` : greeting;
        // subtitle pode mostrar cargo ou departamento
        if (avatarSubEl) avatarSubEl.innerText = user.cargo || user.departamento || 'Sistema PCP';
        // render profile photo if available, otherwise initials
        if (avatarCircle) {
            avatarCircle.innerHTML = '';
            // Prefer explicit URL from backend; otherwise try predictable local avatar paths.
            (async () => {
                const fotoUrl = (user.foto_perfil_url || user.foto_url || null);
                const candidates = [];
                if (fotoUrl) candidates.push(fotoUrl);
                // try various candidate filenames (case variations and png)
                const safeName = (first || 'user').toString();
                candidates.push(`/avatars/${safeName}.webp`);
                candidates.push(`/avatars/${safeName}.webp`);
                // also try lowercase and capitalized versions to be robust
                candidates.push(`/avatars/${safeName.toLowerCase()}.webp`);
                candidates.push(`/avatars/${safeName.charAt(0).toUpperCase() + safeName.slice(1)}.webp`);

                // helper to attempt loading an image URL via Image() to avoid HEAD issues
                function tryLoadImage(url, timeout = 3000) {
                    return new Promise((resolve) => {
                        if (!url) return resolve(false);
                        const img = new Image();
                        let done = false;
                        const id = setTimeout(() => { if (!done) { done = true; img.onload = img.onerror = null; resolve(false); } }, timeout);
                        img.onload = () => { if (!done) { done = true; clearTimeout(id); resolve(true); } };
                        img.onerror = () => { if (!done) { done = true; clearTimeout(id); resolve(false); } };
                        img.src = url;
                    });
                }

                let chosen = null;
                for (const c of candidates) {
                    try {
                        // try to load; first one that resolves true is used
                        // prefer same-origin simple load so express.static serves it
                        // if fotoUrl is absolute it will also work
                        // note: tryLoadImage uses onerror fallback
                        // eslint-disable-next-line no-await-in-loop
                        const ok = await tryLoadImage(c);
                        if (ok) { chosen = c; break; }
                    } catch (e) { /* ignore and continue */ }
                }

                if (chosen) {
                    const imgEl = document.createElement('img');
                    imgEl.src = chosen;
                    imgEl.alt = (capitalized  capitalized + "'s avatar" : 'Avatar');
                    imgEl.title = capitalized || '';
                    imgEl.classList.add('avatar-img');
                    avatarCircle.appendChild(imgEl);
                } else {
                    const initials = (first || '').slice(0,2).toUpperCase();
                    const span = document.createElement('span');
                    span.className = 'avatar-initials';
                    span.innerText = initials || '';
                    avatarCircle.appendChild(span);
                }
            })();
        }
    } catch (e) { console.warn('setCurrentUserUI error', e); }
}

async function loadCurrentUser(retries = 3, delayMs = 500) {
    try {
        const res = await fetch('/api/pcp/me');
        if (!res.ok) {
            if (retries > 0) {
                await new Promise(r => setTimeout(r, delayMs));
                return loadCurrentUser(retries - 1, delayMs);
            }
            return null;
        }
        const data = await res.json().catch(()=>null);
        const user = data && data.user  data.user : null;
        if (user) setCurrentUserUI(user);
        return user;
    } catch (err) {
        if (retries > 0) {
            await new Promise(r => setTimeout(r, delayMs));
            return loadCurrentUser(retries - 1, delayMs);
        }
        return null;
    }
}

// Try to load user immediately (non-blocking)
loadCurrentUser();

    // Logout handler (sidebar)
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const resp = await fetch(`${API_BASE_URL}/logout`, { method: 'POST' });
                if (resp && resp.ok) {
                    // redirect to login page or root
                    window.location.href = '/login';
                    return;
                }
            } catch (err) {
                console.error('Logout error', err);
            }
            showToast('Não foi possível sair. Tente novamente.', 'error');
        });
    }

    // --- Painéis do dashboard: renderers ---
const panelCustos = document.getElementById('panel-custos') || document.getElementById('painel-custos');
const panelDashboard = document.getElementById('panel-dashboard') || document.getElementById('painel-dashboard');
const panelPedidos = document.getElementById('panel-pedidos') || document.getElementById('painel-pedidos');
const panelPrazos = document.getElementById('panel-prazos') || document.getElementById('painel-prazos');

async function renderPainelCustos() {
    try {
        console.log('🔍 Renderizando painel de custos...');
        if (!panelCustos) {
            console.warn('⚠️ Elemento panel-custos/painel-custos não encontração');
            return;
        }
        const resp = await fetch(`${API_BASE_URL}/produtos`);
        const prods = await resp.json();
        let totalCusto = 0;
        prods.forEach(p => { const qtd = parseFloat(p.quantidade_estoque || 0); const custo = parseFloat(p.custo_unitario || 0); totalCusto += (qtd * custo); });
    // create a small summary and a horizontal bar chart of top 5 cost contributors
    const top = prods.slice().sort((a,b)=> (parseFloat(b.quantidade_estoque||0)*parseFloat(b.custo_unitario||0)) - (parseFloat(a.quantidade_estoque||0)*parseFloat(a.custo_unitario||0))).slice(0,5);
    const labels = top.map(p=>p.descricao.slice(0,20) || p.codigo || '');
    const dataVals = top.map(p=> (parseFloat(p.quantidade_estoque||0)*parseFloat(p.custo_unitario||0)).toFixed(2));
    if (!panelCustos) {
        console.warn('⚠️ Elemento painel-custos não encontração');
        return;
    }
    panelCustos.innerHTML = `<div class="w-100"><div class="text-center"><h3 class="mt-0">Custo total em estoque</h3><div class="fw-700 kpi-number">R$ ${totalCusto.toFixed(2)}</div></div><div class="mt-8"><canvas id="chart-custos" class="chart-small" ></canvas></div></div>`;
    // draw chart
    const chartEl = document.getElementById('chart-custos');
    if (chartEl && chartEl.getContext) {
        const ctx = chartEl.getContext('2d');
        new Chart(ctx, { type: 'bar', data: { labels, datasets:[{ label:'R$ por produto', data: dataVals, backgroundColor: '#0b2545' }] }, options: { indexAxis: 'y', plugins:{legend:{display:false}}, scales:{x:{ticks:{callback: v=> 'R$ '+v}}} } });
    }
    } catch (err) { 
        if (panelCustos) {
            panelCustos.innerHTML = '<div>Erro ao calcular custos</div>';
        }
        console.error('Erro ao renderizar painel de custos:', err);
    }
}

async function renderPainelDashboard() {
    try {
        const [prodsRaw, matsRaw, ordsRaw] = await Promise.all([
            fetch(`${API_BASE_URL}/produtos`).then(r=>r.ok r.json(): null).catch(()=>null),
            fetch(`${API_BASE_URL}/materiais`).then(r=>r.ok r.json(): null).catch(()=>null),
            fetch(`${API_BASE_URL}/ordens`).then(r=>r.ok r.json(): null).catch(()=>null)
        ]);
        const prods = normalizeListResponse(prodsRaw);
        const mats = normalizeListResponse(matsRaw);
        const ords = normalizeListResponse(ordsRaw);
        const totalProds = prods.count || 0;
        const totalMats = mats.count || 0;
        const ordItems = ords.items && ords.items.length  ords.items : [];
        const ordensAFazer = ordItems.filter(isOrderActive).length;

        if (!panelDashboard) return;
        panelDashboard.innerHTML = `
            <div class="d-flex kpi-row w-100 align-center justify-around">
                <div class="text-center"><div class="fw-700">Produtos</div><div class="kpi-number">${totalProds}</div></div>
                <div class="text-center"><div class="fw-700">Materiais</div><div class="kpi-number">${totalMats}</div></div>
                <div class="text-center"><div class="fw-700">Ordens A Fazer <span title="Contagem de ordens não finalizadas" class="muted small-note">ℹ️</span></div><div class="kpi-number">${ordensAFazer}</div></div>
            </div>
            <div class="text-center mt-8"><canvas id="chart-kpis" class="chart-small" ></canvas></div>`;

        const kpisEl = document.getElementById('chart-kpis');
        if (kpisEl && kpisEl.getContext) {
            try {
                const ctx = kpisEl.getContext('2d');
                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Produtos', 'Materiais', 'Ordens AFazer'],
                        datasets: [{ data: [totalProds, totalMats, ordensAFazer], backgroundColor: ['#0b2545', '#3b82f6', '#eab308'] }]
                    },
                    options: { plugins: { legend: { position: 'bottom' } } }
                });
            } catch (chartErr) {
                console.warn('Erro ao desenhar chart-kpis:', chartErr && chartErr.message  chartErr.message : chartErr);
            }
        }
    } catch (err) {
        console.error('renderPainelDashboard error:', err);
        if (panelDashboard) panelDashboard.innerHTML = '<div>Erro ao carregar dashboard</div>';
    }
}

let pedidosFilter = 'all'; // 'all' | 'pendente' | 'faturação'
async function renderPainelPedidos() {
    try {
        // On the dashboard we want to show approved/invoiced orders by default
        pedidosFilter = 'faturação';
        const resp = await fetch(`${API_BASE_URL}/pedidos`);
        if (!resp.ok) { panelPedidos.innerHTML = '<div>Nenhum pedido encontração</div>'; return; }
        const pedidos = await resp.json();
        if (!Array.isArray(pedidos) || pedidos.length === 0) { panelPedidos.innerHTML = '<div>Nenhum pedido encontração</div>'; return; }

        // filter controls - use CSS utility classes instead of inline styles
    const controls = document.createElement('div'); controls.classList.add('controls-row');
        ['all','pendente','faturação'].forEach(k=>{
            const btn = document.createElement('button'); btn.className = 'btn btn-filter'; btn.innerText = k === 'all'  'Todos' : (k === 'pendente'  'Pendentes' : 'Faturaçãos');
            if (k === pedidosFilter) { btn.classList.add('active'); }
            btn.addEventListener('click', ()=>{ pedidosFilter = k; renderPainelPedidos(); });
            controls.appendChild(btn);
        });

        // list
        const list = pedidos.filter(p=>{
            if (pedidosFilter === 'all') return true;
            if (pedidosFilter === 'pendente') return !p.status || p.status.toLowerCase().includes('pend');
            return p.status && p.status.toLowerCase().includes('fatur');
        });

        // If there are no results for the selected filter, show the empty card
        if (!Array.isArray(list) || list.length === 0) {
            renderEmptyPedidosCard(panelPedidos, 'Pedidos Faturaçãos');
            return;
        }

        const rowsHtml = list.slice(0,6).map(p=>{
            const cliente = p.cliente || 'Cliente';
            const produto = p.produto_nome || p.produto_id || '';
            const status = p.status || 'Pendente';
            const buttonHtml = status.toLowerCase().includes('fatur')  '<span class="text-success">FATURADO</span>' : ('<button class="btn" data-id="' + p.id + '" data-action="faturar">Marcar Faturação</button>');
            return `<div class="list-row"><div class="flex-1"><strong>${cliente}</strong> — ${p.quantidade} x ${produto}<div class="text-sm muted">${new Date(p.data_pedido).toLocaleDateString()} • ${status}</div></div><div class="ml-12">${buttonHtml}</div></div>`;
        }).join('');

    if (!panelPedidos) return;
    panelPedidos.innerHTML = '';
        panelPedidos.appendChild(controls);
    const content = document.createElement('div'); content.innerHTML = rowsHtml + `<div class="mt-8"><canvas id="chart-pedidos" class="chart-small"></canvas></div>`;
        panelPedidos.appendChild(content);

        // attach faturar handlers
        content.querySelectorAll('button[data-action="faturar"]').forEach(b=>{
            b.addEventListener('click', async (e)=>{
                const id = e.currentTarget.dataset.id;
                if (!confirm('Marcar este pedido como faturação')) return;
                try {
                    const upd = await fetch(`${API_BASE_URL}/pedidos/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status: 'Faturação' }) });
                    if (!upd.ok) throw new Error('Falha');
                    renderPainelPedidos();
                } catch (err) { showToast('Erro ao atualizar pedido', 'error'); }
            });
        });

        // chart: recent quantities
        const recent = list.slice(0,6);
        const labels = recent.map(p=>p.cliente || 'Cliente');
        const dataVals = recent.map(p=> parseFloat(p.quantidade) || 0);
        const pedidosChartEl = document.getElementById('chart-pedidos');
        if (pedidosChartEl && pedidosChartEl.getContext) {
            const ctx = pedidosChartEl.getContext('2d');
            new Chart(ctx, { type:'bar', data:{ labels, datasets:[{ label:'Qtd', data: dataVals, backgroundColor:'#0b2545' }] }, options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} } });
        }

    } catch (err) { panelPedidos.innerHTML = '<div>Erro ao carregar pedidos</div>'; }
}

// helper to render an empty styled card matching the design
function renderEmptyPedidosCard(targetEl, title='Pedidos Faturaçãos') {
    targetEl.innerHTML = `<div class="empty-card">
        <h3 class="mt-0">${title}</h3>
        <div class="muted">Nenhum pedido faturação no momento.</div>
    </div>`;
}

async function renderPainelPrazos() {
    try {
        const resp = await fetch(`${API_BASE_URL}/ordens`);
        const ords = await resp.json();
        if (!panelPrazos) return;
        if (!Array.isArray(ords) || ords.length === 0) { panelPrazos.innerHTML = '<div>Sem ordens</div>'; return; }
    const proximas = ords.sort((a,b)=> new Date(a.data_previsao_entrega) - new Date(b.data_previsao_entrega)).slice(0,6);
    const labels = proximas.map(o=> `OP-${String(o.id).padStart(3,'0')}`);
    const dates = proximas.map(o=> new Date(o.data_previsao_entrega).toLocaleDateString());
    const rows = proximas.map(o=>`<div class="list-row"><div class="flex-1"><strong>OP-${String(o.id).padStart(4,'0')}</strong> — ${o.descricao_produto || ''}<div class="text-sm muted">Previsão: ${new Date(o.data_previsao_entrega).toLocaleDateString()} — Status: ${o.status || ''}</div></div></div>`).join('');
    panelPrazos.innerHTML = `<div class="w-100">${rows}<div class="mt-8"><canvas id="chart-prazos" class="chart-small"></canvas></div></div>`;
    const prazosChartEl = document.getElementById('chart-prazos');
    if (prazosChartEl && prazosChartEl.getContext) {
        const ctx = prazosChartEl.getContext('2d');
        new Chart(ctx, { type:'line', data:{ labels: dates, datasets:[{ label:'Ordens', data: dates.map((_,i)=>i+1), fill:false, borderColor:'#0b2545' }] }, options:{plugins:{legend:{display:false}}, scales:{y:{display:false}} } });
    }
    } catch (err) { panelPrazos.innerHTML = '<div>Erro ao carregar prazos</div>'; }
}

// New: render Pedidos Faturaçãos panel
async function renderPainelFaturaçãos() {
    try {
        const resp = await fetch(`${API_BASE_URL}/pedidos/faturaçãos`);
        if (!resp.ok) throw new Error('Falha ao carregar pedidos faturaçãos');
        const faturaçãos = await resp.json();
        const panel = document.getElementById('panel-pedidos');
        if (!panel) return;
        if (!Array.isArray(faturaçãos) || faturaçãos.length === 0) {
            panel.innerHTML = '<div class="pad-12 muted">Nenhum pedido faturação encontração.</div>';
            return;
        }
        // render table
        const rows = faturaçãos.slice(0,8).map(p => {
            const cliente = p.cliente || '';
            const prod = p.produto_descricao || p.produto_codigo || '';
            const data = p.data_pedido  new Date(p.data_pedido).toLocaleDateString() : (p.previsao_entrega  new Date(p.previsao_entrega).toLocaleDateString() : '');
            const status = p.status || '';
            return `<div class="list-row"><div class="flex-1"><strong>${cliente}</strong><div class="text-sm muted">${prod} • ${data}</div></div><div class="text-right"><div class="text-success">${status}</div></div></div>`;
        }).join('');
    panel.innerHTML = rows + `<div class="mt-8 text-right"><button id="btn-ver-todos-faturaçãos" class="btn">Ver todos</button></div>`;
        // rebind the button if present
        const btn = document.getElementById('btn-open-todos-faturaçãos');
        if (btn) btn.addEventListener('click', () => openTodosFaturaçãosModal());
    } catch (err) {
        console.error('Erro ao renderizar faturaçãos:', err);
    }
}

// Modal controller: list all faturaçãos with pagination
async function openTodosFaturaçãosModal(page = 1, limit = 20) {
    const modal = document.getElementById('modal-todos-faturaçãos-list');
    const body = document.getElementById('todos-faturaçãos-list-body');
    const pagEl = document.getElementById('todos-faturaçãos-pagination');
    if (!modal || !body) return;
    openAccessibleModal(modal);
    body.innerHTML = '<div class="pad-12 muted"><span class="pcp-spinner" aria-hidden="true"></span> Carregando...</div>';
    try {
        const resp = await fetch(`${API_BASE_URL}/pedidos/faturaçãospage=${page}&limit=${limit}`);
        if (!resp.ok) throw new Error('Falha');
        const data = await resp.json();
        const rows = data.rows || [];
        const total = Number(data.total || 0);
    if (!rows.length) { body.innerHTML = '<div class="muted">Nenhum pedido encontração.</div>'; return; }
        body.innerHTML = rows.map(p=>{
            const dt = p.created_at  new Date(p.created_at).toLocaleString() : (p.data_prevista new Date(p.data_prevista).toLocaleString(): '');
            const produtos = (p.produtos_preview && Array.isArray(p.produtos_preview))  p.produtos_preview.map(x=>`${x.codigo} x${x.quantidade}`).join(', ') : '';
            return `<div class="faturação-item list-row" data-id="${p.id}"><div class="flex-1"><strong>#${p.id} ${p.descricao||''}</strong><div class="text-sm muted">${p.cliente_id 'Cliente ID: '+p.cliente_id : ''} ${produtos}</div></div><div class="list-row-right"><div class="text-success fw-700">${p.status||''}</div><div class="muted small-note">${dt}</div><div class="mt-6"><button class="btn-sm abrir-pedido" data-id="${p.id}">Abrir</button></div></div></div>`;
        }).join('');
        // pagination
        const totalPages = Math.max(1, Math.ceil(total / limit));
        let pagesHtml = '';
        for (let i=1;i<=totalPages;i++) pagesHtml += `<button class="page-btn${i===page ' active':''}" data-page="${i}">${i}</button>`;
    pagEl.innerHTML = `<div class="pagination-row"><button class="page-prev" ${page<=1 'disabled':''} data-page="${page-1}">Prev</button>${pagesHtml}<button class="page-next" ${page>=totalPages 'disabled':''} data-page="${page+1}">Next</button></div>`;
        // attach pagination handlers
        pagEl.querySelectorAll('.page-btn, .page-prev, .page-next').forEach(b => b.addEventListener('click', (ev)=>{
            const p = Number(ev.currentTarget.dataset.page) || 1; openTodosFaturaçãosModal(p, limit);
        }));
        // attach open handlers
        body.querySelectorAll('.abrir-pedido').forEach(b => b.addEventListener('click', async (ev)=>{
            const id = ev.currentTarget.dataset.id;
            try {
                const r = await fetch(`${API_BASE_URL}/pedidos/${id}`);
                if (!r.ok) throw new Error('not found');
                const pedido = await r.json();
                // show details in item-edit-modal
                const editModal = document.getElementById('item-edit-modal');
                const editTitle = document.getElementById('item-edit-title');
                const editBody = document.getElementById('item-edit-body');
                if (editTitle) editTitle.innerText = `Pedido #${pedido.id}`;
                if (editBody) editBody.innerHTML = `<pre class="pre-wrap">${JSON.stringify(pedido,null,2)}</pre>`;
                if (editModal) openAccessibleModal(editModal);
            } catch (err) { showToast('Erro ao abrir pedido', 'error'); }
        }));
    } catch (err) {
        console.error('Erro ao carregar lista completa de faturaçãos', err);
        body.innerHTML = '<div class="text-error">Erro ao carregar.</div>';
    }
}

// close modal handler
const closeTodosFaturaçãosList = document.getElementById('close-todos-faturaçãos-list');
if (closeTodosFaturaçãosList) closeTodosFaturaçãosList.addEventListener('click', ()=>{ const m=document.getElementById('modal-todos-faturaçãos-list'); if (m) closeAccessibleModal(m); });
// Prazos modal: similar to faturaçãos
async function openTodosPrazosModal(page = 1, limit = 20) {
    const modal = document.getElementById('modal-todos-prazos-list');
    const body = document.getElementById('todos-prazos-list-body');
    const pagEl = document.getElementById('todos-prazos-pagination');
    if (!modal || !body) return;
    openAccessibleModal(modal);
    body.innerHTML = '<div>Carregando...</div>';
    try {
        const resp = await fetch(`${API_BASE_URL}/pedidos/prazospage=${page}&limit=${limit}`);
        if (!resp.ok) throw new Error('Falha');
        const data = await resp.json();
        const rows = data.rows || [];
        const total = Number(data.total || 0);
    if (!rows.length) { body.innerHTML = '<div class="muted">Nenhum prazo encontração.</div>'; return; }
        body.innerHTML = rows.map(p=>{
            const dt = p.data_prevista  new Date(p.data_prevista).toLocaleString() : (p.prazo_entrega `${p.prazo_entrega} dias`:'');
            const produtos = (p.produtos_preview && Array.isArray(p.produtos_preview))  p.produtos_preview.map(x=>`${x.codigo} x${x.quantidade}`).join(', ') : '';
            return `<div class="list-row"><div class="flex-1"><strong>#${p.id} ${p.descricao||''}</strong><div class="text-sm muted">${produtos}</div></div><div class="list-row-right"><div class="fw-700">${dt}</div></div></div>`;
        }).join('');
        // pagination
        const totalPages = Math.max(1, Math.ceil(total / limit));
        let pagesHtml = '';
        for (let i=1;i<=totalPages;i++) pagesHtml += `<button class="page-btn${i===page ' active':''}" data-page="${i}">${i}</button>`;
    pagEl.innerHTML = `<div class="pagination-row"><button class="page-prev" ${page<=1 'disabled':''} data-page="${page-1}">Prev</button>${pagesHtml}<button class="page-next" ${page>=totalPages 'disabled':''} data-page="${page+1}">Next</button></div>`;
        pagEl.querySelectorAll('.page-btn, .page-prev, .page-next').forEach(b => b.addEventListener('click', (ev)=>{ const p=Number(ev.currentTarget.dataset.page)||1; openTodosPrazosModal(p, limit); }));
    } catch (err) {
        console.error('Erro ao carregar prazos', err);
    body.innerHTML = '<div class="text-error">Erro ao carregar.</div>';
    }
}

const btnOpenPrazos = document.getElementById('btn-open-todos-prazos');
if (btnOpenPrazos) btnOpenPrazos.addEventListener('click', ()=> openTodosPrazosModal());
const closeTodosPrazosList = document.getElementById('close-todos-prazos-list');
if (closeTodosPrazosList) closeTodosPrazosList.addEventListener('click', ()=>{ const m=document.getElementById('modal-todos-prazos-list'); if (m) closeAccessibleModal(m); });

// New: render Prazos panel (deadline list for faturaçãos)
async function renderPainelPrazosLista() {
    try {
        const resp = await fetch(`${API_BASE_URL}/pedidos/prazos`);
        if (!resp.ok) throw new Error('Falha ao carregar prazos');
        const prazos = await resp.json();
        const panel = document.getElementById('panel-prazos');
        if (!panel) return;
        if (!Array.isArray(prazos) || prazos.length === 0) { panel.innerHTML = '<div class="muted pad-12">Nenhum prazo registração.</div>'; return; }
        const rows = prazos.slice(0,10).map(p => {
            const prod = p.produto_descricao || p.produto_codigo || '';
            const previsao = p.previsao_entrega  new Date(p.previsao_entrega).toLocaleDateString() : 'Sem data';
            const cliente = p.cliente || '';
            return `<div class="list-row"><div class="flex-1"><strong>${prod}</strong><div class="text-sm muted">${cliente}</div></div><div class="list-row-right"><div class="fw-700">${previsao}</div></div></div>`;
        }).join('');
        panel.innerHTML = rows;
    } catch (err) { console.error('Erro ao carregar prazos:', err); }
}

// New: render acompanhamento panel
async function renderPainelAcompanhamento() {
    try {
        const resp = await fetch(`${API_BASE_URL}/acompanhamento`);
        if (!resp.ok) throw new Error('Falha no acompanhamento');
        const body = await resp.json();
        const panel = document.getElementById('panel-dashboard');
        if (!panel) return;
        const totals = body.totals || { total_pedidos: 0 };
        const recent = Array.isArray(body.recentPedidos)  body.recentPedidos : [];
    const head = `<div class="d-flex kpi-row justify-around"><div class="text-center"><div class="text-sm muted">Pedidos</div><div class="fw-700 kpi-number">${totals.total_pedidos||0}</div></div><div class="text-center"><div class="text-sm muted">Recentes</div><div class="fw-700 kpi-number">${recent.length}</div></div></div>`;
    const list = recent.slice(0,6).map(r => `<div class="list-row"><div class="flex-1"><strong>${r.cliente||''}</strong><div class="text-sm muted">${r.produto_descricao||r.produto_codigo||''} • ${r.quantidade||0}</div></div></div>`).join('');
    panel.innerHTML = head + `<div class="mt-8">${list}</div>`;
    } catch (err) { console.error('Erro ao renderizar acompanhamento:', err); }
}

// override showView to refresh panels when dashboard visible
const _showView = showView;
showView = (viewName) => {
    _showView(viewName);
    if (viewName === 'dashboard') {
    renderPainelCustos(); renderPainelDashboard(); renderPainelFaturaçãos(); renderPainelPrazosLista(); renderPainelAcompanhamento();
    // New PCP widgets
    // DESABILITADO: renderPCPQuickActions() - causa abertura automática do modal
    try { renderPCPKPIs(); } catch (e) {}
    try { renderPCPRecentOrders(); } catch (e) {}
    try { renderPCPLowStock(); } catch (e) {}
    }
};

// Quick actions agora funcionam via onclick no HTML (não precisa mais configurar aqui)

// Ensure dashboard is shown on initial page load (after override so renderers execute)
try { showView('dashboard'); } catch (e) { /* ignore */ }

// --- New PCP dashboard widget renderers ---
// store Chart.js instances to avoid duplicates
const pcpKPICharts = {};

// Helper: normalize API list responses to an array and provide a numeric count when available
function normalizeListResponse(resp) {
    if (!resp) return { items: [], count: 0 };
    if (Array.isArray(resp)) return { items: resp, count: resp.length };
    // common paginated shapes
    if (Array.isArray(resp.rows)) return { items: resp.rows, count: (typeof resp.total === 'number'  resp.total : resp.rows.length) };
    if (Array.isArray(resp.data)) return { items: resp.data, count: (typeof resp.total === 'number'  resp.total : resp.data.length) };
    // sometimes API returns { items: [...] }
    if (Array.isArray(resp.items)) return { items: resp.items, count: (typeof resp.total === 'number'  resp.total : resp.items.length) };
    // fallback: try to detect numeric totals
    if (typeof resp.total === 'number') return { items: [], count: resp.total };
    if (typeof resp.count === 'number') return { items: [], count: resp.count };
    return { items: [], count: 0 };
}

// Ensure Chart.js is available: if not, try to load it dynamically from CDN and await readiness
function ensureChartLoaded(timeout = 3000) {
    return new Promise((resolve, reject) => {
        if (window.Chart) return resolve(true);
        // try to find existing script tag first
        const existing = Array.from(document.getElementsByTagName('script')).find(s => s.src && s.src.includes('chart.js'));
        if (existing) {
            // wait briefly for it
            const start = Date.now();
            (function waitForChart() {
                if (window.Chart) return resolve(true);
                if (Date.now() - start > timeout) return reject(new Error('Chart load timeout'));
                setTimeout(waitForChart, 100);
            })();
            return;
        }
        // inject CDN script
        const src = 'https://cdn.jsdelivr.net/npm/chart.js';
        const s = document.createElement('script'); s.src = src; s.async = true; s.defer = true;
        s.onload = () => { if (window.Chart) resolve(true); else reject(new Error('Chart did not initialize')) };
        s.onerror = () => reject(new Error('Failed to load Chart.js'));
        document.head.appendChild(s);
        // fallback timeout
        setTimeout(() => { if (window.Chart) resolve(true); else reject(new Error('Chart load timeout')); }, timeout + 200);
    });
}

// Heurística para determinar se uma ordem está ativa (não finalizada/faturada)
function isOrderActive(o) {
    if (!o) return false;
    const status = (o.status || o.estação || o.st || '').toString().toLowerCase();
    if (!status) return true; // sem status conhecido -> considerar ativa
    const completedTerms = ['fatur', 'conclu', 'finaliz', 'entreg', 'cancel', 'fechação'];
    for (const t of completedTerms) if (status.includes(t)) return false;
    return true;
}

// Quick Actions agora usam onclick direto no HTML
// Esta função foi desabilitada para evitar conflitos
function renderPCPQuickActions() {
    console.log('ℹ️ [pcp.js] renderPCPQuickActions() desabilitada - usando onclick do HTML');
    return;
}

async function refreshPCPDashboard() {
    const kpis = document.getElementById('pcp-kpis');
    const recent = document.getElementById('pcp-recent-orders');
    const low = document.getElementById('pcp-low-stock');
    const quick = document.getElementById('pcp-quick-actions');
    // show small loaders
    const loader = '<div class="pad-12 muted"><span class="pcp-spinner" aria-hidden="true"></span> <span class="muted">Carregando...</span></div>';
    if (kpis) kpis.innerHTML = loader;
    if (recent) recent.innerHTML = loader;
    if (low) low.innerHTML = loader;
    if (quick) {
        // disable refresh during load
        const btn = quick.querySelector('#pcp-refresh');
        if (btn) btn.disabled = true;
    }
    // run in parallel
    await Promise.allSettled([renderPCPKPIs(), renderPCPRecentOrders(), renderPCPLowStock()]);
    if (quick) {
        const btn = quick.querySelector('#pcp-refresh');
        if (btn) btn.disabled = false;
    }
}

async function renderPCPKPIs() {
    const el = document.getElementById('pcp-kpis');
    if (!el) return;
    try {
        const [prodsResRaw, matResRaw, ordResRaw] = await Promise.all([
            fetch(`${API_BASE_URL}/produtos`).then(r=>r.ok r.json(): null).catch(()=>null),
            fetch(`${API_BASE_URL}/materiais`).then(r=>r.ok r.json(): null).catch(()=>null),
            fetch(`${API_BASE_URL}/ordens`).then(r=>r.ok r.json(): null).catch(()=>null)
        ]);
        const prodsRes = normalizeListResponse(prodsResRaw);
        const matRes = normalizeListResponse(matResRaw);
        const ordRes = normalizeListResponse(ordResRaw);
        const totalProds = prodsRes.count || 0;
        const totalMats = matRes.count || 0;
        // determine active orders (not faturação / concluido) by heuristic
        const ordItems = ordRes.items.length  ordRes.items : [];
        const ordensAFazer = ordItems.filter(o=> {
            const st = (o && (o.status || o.estação || '')).toString().toLowerCase();
            if (!st) return true; // unknown status treated as active
            // treat as completed if contains fatur or conclu
            if (st.includes('fatur') || st.includes('conclu') || st.includes('finaliz') || st.includes('entreg')) return false;
            return true;
        }).length;
        // Build KPI with a small sparkline for orders trend
        el.innerHTML = `
            <div class="pcp-kpi-card"><div class="kpi-label">Produtos</div><div class="kpi-value">${totalProds}</div></div>
            <div class="pcp-kpi-card"><div class="kpi-label">Materiais</div><div class="kpi-value">${totalMats}</div></div>
            <div class="pcp-kpi-card"><div class="kpi-label">Ordens A Fazer <span title="Contagem de ordens não finalizadas" class="muted small-note">ℹ️</span></div><div class="kpi-value">${ordensAFazer}</div><canvas id="pcp-kpis-ordens-spark" width="160" height="40" aria-hidden="true" class="mt-6"></canvas></div>
        `;

        // Prepare sparkline data from ordRes by counting orders per day (last 7 days)
        try {
            const ordersArray = ordRes.items && ordRes.items.length  ordRes.items : [];
            const days = 7;
            const labels = [];
            const counts = [];
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date(); d.setDate(d.getDate() - i);
                const key = d.toISOString().slice(0,10);
                labels.push(key.slice(5)); // MM-DD
                counts.push(0);
            }
            ordersArray.forEach(o => {
                const dateField = o.data_pedido || o.data_previsao_entrega || o.created_at || o.data || o.data_pedido_at;
                const date = dateField  new Date(dateField) : null;
                if (!date || isNaN(date)) return;
                const key = date.toISOString().slice(0,10);
                const idx = labels.findIndex(lbl => key.slice(5) === lbl);
                if (idx >= 0) counts[idx] = counts[idx] + 1;
            });

            // destroy previous chart if exists
            if (pcpKPICharts.ordens) { try { pcpKPICharts.ordens.destroy(); } catch(e){} }
            // ensure Chart.js loaded (non-blocking, fallback handled later)
            try { await ensureChartLoaded(2500); } catch(e) { console.warn('Chart.js not available, will fallback to bar', e); }
            const canvasEl = document.getElementById('pcp-kpis-ordens-spark');
            if (canvasEl && window.Chart && typeof canvasEl.getContext === 'function') {
                try {
                    const ctx = canvasEl.getContext('2d');
                    pcpKPICharts.ordens = new Chart(ctx, {
                        type: 'line',
                        data: { labels, datasets: [{ data: counts, borderColor: getComputedStyle(document.documentElement).getPropertyValue('--cor-secundaria') || '#2563eb', backgroundColor: 'rgba(37,99,235,0.08)', fill: true, tension: 0.35, pointRadius: 0 }]},
                        options: { responsive: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } }, elements: { line: { borderWidth: 2 } }, maintainAspectRatio: false }
                    });
                } catch (chartErr) {
                    console.warn('KPI sparkline creation failed, falling back to bar', chartErr);
                    // fallback: simple progress bar showing total orders
                    const wrapper = canvasEl.parentElement || el;
                    if (wrapper) {
                        const total = counts.reduce((s,n)=>s+n,0) || 0;
                        const barHtml = `<div class="kpi-spark-fallback"><div class="kpi-spark-bar"><div class="kpi-spark-fill" style="width:${Math.min(100, total)}%"></div></div></div>`;
                        try { wrapper.insertAdjacentHTML('beforeend', barHtml); } catch(e){}
                    }
                }
            } else {
                // no canvas or Chart, render fallback bar
                const wrapper = canvasEl  canvasEl.parentElement : el;
                if (wrapper) {
                    const total = counts.reduce((s,n)=>s+n,0) || 0;
                    const barHtml = `<div class="kpi-spark-fallback"><div class="kpi-spark-bar"><div class="kpi-spark-fill" style="width:${Math.min(100, total)}%"></div></div></div>`;
                    try { wrapper.insertAdjacentHTML('beforeend', barHtml); } catch(e){}
                }
            }
        } catch (chartErr) { console.warn('KPI sparkline error', chartErr); }
    } catch (err) { console.warn('renderPCPKPIs error', err); }
}

async function renderPCPRecentOrders(limit = 6) {
    const el = document.getElementById('pcp-recent-orders');
    if (!el) return;
    try {
        // Fetch recent sales orders (pedidos) so dashboard shows sales activity (cliente - produtos • status)
        const resp = await fetch(`${API_BASE_URL}/pedidospage=1&limit=${limit}`);
        if (!resp.ok) {
            // fallback: try non-paginated endpoint
            const fallbackResp = await fetch(`${API_BASE_URL}/pedidos`);
            if (!fallbackResp.ok) { el.innerHTML = '<div class="muted">Nenhum pedido encontração</div>'; return; }
            const fallbackData = await fallbackResp.json();
            var pedidos = Array.isArray(fallbackData)  fallbackData : (fallbackData.rows || []);
        } else {
            const data = await resp.json().catch(()=>({}));
            var pedidos = Array.isArray(data)  data : (data.rows || []);
        }

        // If still empty, show a friendly message
        if (!pedidos || pedidos.length === 0) {
            el.innerHTML = '<div class="muted">Nenhum pedido cadastração recentemente.</div>';
            return;
        }

        // Render each pedido: prefer empresa name, then cliente — Produtos (limit names) • Status
        const rows = pedidos.slice(0, limit).map(p => {
            // Prefer company display name when available (better UX for B2B orders)
            const cliente = (p.empresa_razao && p.empresa_razao.toString().trim())
                 p.empresa_razao
                : (p.empresa_nome && p.empresa_nome.toString().trim())
                     p.empresa_nome
                    : (p.cliente_nome && p.cliente_nome.toString().trim())
                         p.cliente_nome
                        : (p.cliente_razao && p.cliente_razao.toString().trim())
                             p.cliente_razao
                            : (p.cliente && p.cliente.toString().trim())
                                 p.cliente
                                : (p.cliente_id  `Cliente ${p.cliente_id}` : 'Cliente');

            // try several shapes for product info; ensure produtos_preview is parsed if stored as JSON string
            let produtosText = '';
            try {
                if (p && p.produtos_preview && typeof p.produtos_preview === 'string') {
                    try { p.produtos_preview = JSON.parse(p.produtos_preview); } catch (e) { /* keep as string */ }
                }
            } catch (e) { /* ignore */ }

            if (Array.isArray(p.produtos_preview) && p.produtos_preview.length) {
                produtosText = p.produtos_preview.map(x => (x && (x.produto_descricao || x.descricao || x.codigo || x.nome || x.produto_codigo)) || '').filter(Boolean).slice(0,2).join(', ');
                if (p.produtos_preview.length > 2) produtosText += '…';
            } else if (p.produto_descricao || p.produto_nome || p.produto_codigo || p.produto_id) {
                produtosText = (p.produto_descricao || p.produto_nome || p.produto_codigo || String(p.produto_id || '')).toString();
            } else if (p.descricao || p.produtos) {
                produtosText = (p.descricao || (Array.isArray(p.produtos)  p.produtos.join(', ') : '')).toString();
            }
            const status = p.status || p.estação || '';
            const dateStr = p.data_pedido  new Date(p.data_pedido).toLocaleDateString() : (p.created_at  new Date(p.created_at).toLocaleDateString() : '');
            return `<div class="list-row"><div class="flex-1"><strong>${escapeHtml(cliente)}</strong> — ${escapeHtml(produtosText)}<div class="text-sm muted">${dateStr}${dateStr  ' • ' : ''}${escapeHtml(status)}</div></div></div>`;
        }).join('');
        el.innerHTML = rows;
    } catch (err) { console.error('renderPCPRecentOrders error', err); el.innerHTML = '<div class="text-error">Erro ao carregar ordens</div>'; }
}

async function renderPCPLowStock(threshold = 5) {
    const el = document.getElementById('pcp-low-stock');
    if (!el) return;
    try {
        const resp = await fetch(`${API_BASE_URL}/materiais`);
    if (!resp.ok) { el.innerHTML = '<div class="muted">Não foi possível carregar materiais</div>'; return; }
        const materiais = await resp.json();
        if (!Array.isArray(materiais) || materiais.length === 0) {
            // fallback fictitious materials
            materiais = [
                { id: 'M-100', codigo_material: 'M-100', descricao: 'Cabo Alumínio 2mm', quantidade_estoque: 3.5 },
                { id: 'M-101', codigo_material: 'M-101', descricao: 'Terminal 4mm', quantidade_estoque: 12 }
            ];
        }
        const low = materiais.filter(m => (Number(m.quantidade_estoque) || 0) <= threshold).slice(0,8);
    if (!low.length) { el.innerHTML = '<div class="muted">Nenhum material com estoque baixo</div>'; return; }
    el.innerHTML = low.map(m => `<div class="list-row"><div class="flex-1"><strong>${m.codigo_material || m.id}</strong><div class="text-sm muted">${m.descricao || ''}</div></div><div class="list-row-right"><div class="text-error fw-700">${Number(m.quantidade_estoque||0).toFixed(2)}</div></div></div>`).join('');
    } catch (err) { console.error('renderPCPLowStock error', err); el.innerHTML = '<div class="text-error">Erro ao carregar materiais</div>'; }
}

// Defensive hardening: ensure all modals and overlays start hidden even if other scripts fail.
(function ensureModalsHidden() {
    try {
        document.querySelectorAll('.modal').forEach(m => {
            try {
                if (!m.classList.contains('hidden')) m.classList.add('hidden');
                m.setAttribute('aria-hidden', 'true');
            } catch (e) {}
        });
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        if (sidebarOverlay) sidebarOverlay.classList.remove('visible');
        // hide inline search dropdown defensively
        const searchInline = document.getElementById('search-inline-results');
        if (searchInline) searchInline.classList.remove('visible');
    } catch (e) { /* silent */ }
})();

// --- Materiais modal handlers: open modal, render inside modal, and hook edit/delete to modal-based flows
const btnOpenMateriaisModal = document.getElementById('btn-open-materiais-modal');
const materiaisModal = document.getElementById('materiais-modal');
const materiaisModalBody = document.getElementById('materiais-modal-body');
const materiaisModalList = document.getElementById('materiais-modal-list');
const materiaisModalClose = document.getElementById('materiais-modal-close');
const materiaisNewBtn = document.getElementById('materiais-new');

async function renderMateriaisModalList() {
    if (!materiaisModalList) return;
    materiaisModalList.innerHTML = '<div class="pad-12 muted"><span class="pcp-spinner" aria-hidden="true"></span> Carregando...</div>';
    try {
        const resp = await fetch(`${API_BASE_URL}/materiais`);
        if (!resp.ok) throw new Error('Falha ao carregar materiais');
        const mats = await resp.json();
        if (!Array.isArray(mats) || mats.length === 0) {
            materiaisModalList.innerHTML = '<div class="pad-12 muted">Nenhum material cadastração.</div>';
            return;
        }
        materiaisModalList.innerHTML = mats.map(m => `
            <div class="list-row" data-id="${m.id}" role="listitem" aria-label="Material ${m.codigo_material || m.descricao || m.id}">
                <div class="flex-1"><strong>${m.codigo_material || ''}</strong> — ${m.descricao || ''}<div class="text-sm muted">Un: ${m.unidade_medida || ''} • Estoque: ${Number(m.quantidade_estoque||0).toFixed(2)}</div></div>
                <div class="list-row-right" role="group" aria-label="Ações do material">
                    <button class="btn-sm btn-edit-material" data-id="${m.id}" aria-label="Editar material ${m.codigo_material || m.descricao || m.id}">Editar</button>
                    <button class="btn-sm btn-delete-material" data-id="${m.id}" aria-label="Excluir material ${m.codigo_material || m.descricao || m.id}">Excluir</button>
                </div>
            </div>
        `).join('');

        // attach handlers
    materiaisModalList.querySelectorAll('.btn-edit-material').forEach(b => {
            b.addEventListener('click', async (ev) => {
                const id = ev.currentTarget.dataset.id;
                try {
                    // load material into the existing inline form editor to reuse save flow
                    await carregarMaterialParaEdicao(id);
                    // open generic item-edit-modal with prefilled content for read-only view, then open material view
                    const editModal = document.getElementById('item-edit-modal');
                    const editTitle = document.getElementById('item-edit-title');
                    const editBody = document.getElementById('item-edit-body');
                    if (editTitle) editTitle.innerText = 'Editar Material';
                    if (editBody) {
                        // create a small form mirroring the novoMaterial form
                        const m = document.querySelector(`#tabela-materiais-container table tbody tr[data-id="${id}"]`);
                        // reuse the novoMaterial form fields by cloning
                        const cloneForm = document.createElement('div');
                        cloneForm.innerHTML = document.getElementById('form-novo-material')  document.getElementById('form-novo-material').outerHTML : '';
                        editBody.innerHTML = cloneForm.innerHTML;
                        // transfer values from the existing inline form (which was populated by carregarMaterialParaEdicao)
                        setTimeout(() => {
                            try {
                                const src = document.getElementById('form-novo-material');
                                const dst = document.querySelector('#item-edit-body form') || document.querySelector('#item-edit-body');
                                if (src && dst) {
                                    // move inputs values
                                    ['codigo_material_form','descricao_material_form','unidade_medida_form','estoque_inicial_form'].forEach(idf => {
                                        const s = document.getElementById(idf);
                                        const d = dst.querySelector(`#${idf}`);
                                        if (s && d) d.value = s.value;
                                    });
                                    // attach save handler to item-save button
                                    const saveBtn = document.getElementById('item-save');
                                    if (saveBtn) {
                                        saveBtn.onclick = async (e) => {
                                            e.preventDefault();
                                            // collect values
                                            const payload = {
                                                codigo_material: (dst.querySelector('#codigo_material_form') || { value: '' }).value,
                                                descricao: (dst.querySelector('#descricao_material_form') || { value: '' }).value,
                                                unidade_medida: (dst.querySelector('#unidade_medida_form') || { value: '' }).value,
                                                quantidade_estoque: parseFloat((dst.querySelector('#estoque_inicial_form') || { value: 0 }).value) || 0
                                            };
                                            try {
                                                const editForm = document.getElementById('form-novo-material');
                                                const editingId = editForm && editForm.dataset && editForm.dataset.editingId  editForm.dataset.editingId : null;
                                                if (!editingId) {
                                                    // create new material
                                                    const r = await fetch(`${API_BASE_URL}/materiais`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
                                                    if (!r.ok) throw new Error('Falha ao criar');
                                                } else {
                                                    const r = await fetch(`${API_BASE_URL}/materiais/${editingId}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
                                                    if (!r.ok) throw new Error('Falha ao salvar');
                                                }
                                                // refresh modal list and inline table
                                                await carregarMateriais();
                                                await carregarMateriaisParaSelect();
                                                await renderMateriaisModalList();
                                                closeAccessibleModal(document.getElementById('item-edit-modal'));
                                            } catch (err) { showToast('Erro ao salvar material. Veja o console.', 'error'); console.error(err); }
                                        };
                                    }
                                }
                            } catch (err) { console.warn('Erro ao inicializar editor dentro do modal', err); }
                        }, 80);
                    }
                    openAccessibleModal(document.getElementById('item-edit-modal'));
                } catch (err) { console.error('Erro ao abrir editor do material', err); showToast('Não foi possível abrir editor.', 'error'); }
            });
        });

    materiaisModalList.querySelectorAll('.btn-delete-material').forEach(b => {
            b.addEventListener('click', async (ev) => {
                const id = ev.currentTarget.dataset.id;
                if (!confirm('Confirma exclusão deste material')) return;
                try {
                    const r = await fetch(`${API_BASE_URL}/materiais/${id}`, { method: 'DELETE' });
                    if (!r.ok) throw new Error('Falha ao excluir');
                    await carregarMateriais();
                    await carregarMateriaisParaSelect();
                    await renderMateriaisModalList();
                } catch (err) { console.error('Erro ao excluir material', err); showToast('Erro ao excluir.', 'error'); }
            });
        });
    } catch (err) {
        materiaisModalList.innerHTML = '<div class="pad-12 text-error">Erro ao carregar materiais.</div>';
    }
}

if (btnOpenMateriaisModal) btnOpenMateriaisModal.addEventListener('click', async (e) => { e.preventDefault(); if (!materiaisModal) return; openAccessibleModal(materiaisModal); await renderMateriaisModalList(); });
if (materiaisModalClose) materiaisModalClose.addEventListener('click', () => { const m = document.getElementById('materiais-modal'); if (m) closeAccessibleModal(m); });
if (materiaisNewBtn) materiaisNewBtn.addEventListener('click', (e) => { e.preventDefault(); // open empty novo material flow
    // clear inline novo material form and set editing state to empty, then open item-edit-modal using same flow
    if (forms.novoMaterial) {
        forms.novoMaterial.reset();
        delete forms.novoMaterial.dataset.editingId;
        forms.novoMaterial.querySelector('button[type="submit"]').textContent = 'Adicionar Material';
    }
    const editModal = document.getElementById('item-edit-modal');
    const editTitle = document.getElementById('item-edit-title');
    const editBody = document.getElementById('item-edit-body');
    if (editTitle) editTitle.innerText = 'Novo Material';
    if (editBody) editBody.innerHTML = document.getElementById('form-novo-material')  document.getElementById('form-novo-material').outerHTML : '<div>Formulário indisponível.</div>';
    // attach save to item-save
    const saveBtn = document.getElementById('item-save');
    if (saveBtn) {
        saveBtn.onclick = async (ev) => {
            ev.preventDefault();
            try {
                const body = document.getElementById('item-edit-body');
                const codigo = body.querySelector('#codigo_material_form')  body.querySelector('#codigo_material_form').value : '';
                const descricao = body.querySelector('#descricao_material_form')  body.querySelector('#descricao_material_form').value : '';
                const unidade = body.querySelector('#unidade_medida_form')  body.querySelector('#unidade_medida_form').value : '';
                const estoque = parseFloat(body.querySelector('#estoque_inicial_form')  body.querySelector('#estoque_inicial_form').value : 0) || 0;
                const payload = { codigo_material: codigo, descricao, unidade_medida: unidade, quantidade_estoque: estoque };
                const r = await fetch(`${API_BASE_URL}/materiais`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
                if (!r.ok) throw new Error('Falha');
                await carregarMateriais(); await carregarMateriaisParaSelect(); await renderMateriaisModalList(); closeAccessibleModal(document.getElementById('item-edit-modal'));
            } catch (err) { console.error('Erro ao criar material', err); showToast('Erro ao criar material.', 'error'); }
        };
    }
    openAccessibleModal(document.getElementById('item-edit-modal'));
});

});