// =====================================================
// GESTÃO DE MATERIAIS - FUNÇÕES JAVASCRIPT
// =====================================================

(function() {
    'use strict';

    // Estação da aplicação
    let materiaisData = [];
    let produtosData = [];
    let currentPage = 1;
    let itemsPerPage = 25;
    let currentView = 'table';
    let searchTerm = '';
    let filters = {
        categoria: '',
        estoque: ''
    };

    // Inicialização
    function init() {
        console.log('🚀 Iniciando Gestão de Materiais...');
        const materiaisView = document.getElementById('materiais-view');
        
        if (materiaisView) {
            console.log('✅ View de materiais encontrada');
            
            // Verificar se a view está visível
            const isVisible = !materiaisView.classList.contains('hidden') && 
                            materiaisView.style.display !== 'none';
            
            console.log('👁️ View visível:', isVisible);
            
            setupEventListeners();
            
            // Carregar daçãos imediatamente se visível, ou aguardar
            if (isVisible) {
                console.log('📊 Carregando daçãos imediatamente...');
                loadMateriais();
                loadProdutos();
                updateStats();
            } else {
                console.log('⏳ Aguardando view ficar visível...');
            }
        } else {
            console.warn('⚠️ View de materiais não encontrada');
        }
    }
    
    // Função pública para recarregar quando a view for mostrada
    function onViewShown() {
        console.log('👁️ View de materiais mostrada, carregando daçãos...');
        loadMateriais();
        loadProdutos();
        updateStats();
        startStatsAnimation();
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Busca
        const searchInput = document.getElementById('search-materiais');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(handleSearch, 300));
        }

        // Alternar visualização
        const viewBtns = document.querySelectorAll('.view-btn');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const view = this.dataset.view;
                switchView(view);
            });
        });

        // Paginação
        document.getElementById('btn-first-page').addEventListener('click', () => goToPage(1));
        document.getElementById('btn-prev-page').addEventListener('click', () => goToPage(currentPage - 1));
        document.getElementById('btn-next-page').addEventListener('click', () => goToPage(currentPage + 1));
        document.getElementById('btn-last-page').addEventListener('click', () => goToPage(getTotalPages()));
        
        // Itens por página
        document.getElementById('items-per-page').addEventListener('change', function() {
            itemsPerPage = parseInt(this.value);
            currentPage = 1;
            renderMateriais();
        });

        // Filtros
        document.querySelector('.btn-filter-apply').addEventListener('click', applyFilters);

        // Select all
        document.getElementById('select-all-materials').addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('#materiais-tbody input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });

        // Atualizar
        document.getElementById('btn-refresh-header-materiais').addEventListener('click', () => {
            loadMateriais();
            loadProdutos();
            updateStats();
        });
    }

    // Carregar materiais do servidor
    async function loadMateriais() {
        try {
            console.log('🔄 Iniciando carregamento de materiais...');
            showLoading();
            const response = await fetch('/api/pcp/materiais');
            console.log('📡 Resposta da API:', response.status);
            
            if (!response.ok) throw new Error('Erro ao carregar materiais');
            
            materiaisData = await response.json();
            console.log('✅ Materiais carregaçãos:', materiaisData.length, 'itens');
            console.log('📊 Primeiros 3 materiais:', materiaisData.slice(0, 3));
            
            renderMateriais();
            updateStats();
            
        } catch (error) {
            console.error('❌ Erro ao carregar materiais:', error);
            materiaisData = [];
            renderMateriais();
            updateStats(); // Atualizar mesmo com erro
            showError('Erro ao carregar materiais. Tente novamente.');
        }
    }

    // Carregar produtos do servidor
    async function loadProdutos() {
        try {
            console.log('📦 Carregando produtos...');
            const response = await fetch('/api/pcp/produtospage=1&limit=10000');
            if (!response.ok) {
                console.error('❌ API de produtos retornou erro:', response.status);
                throw new Error('Erro ao carregar produtos');
            }
            
            const data = await response.json();
            console.log('📊 Resposta da API de produtos:', data);
            
            // A API pode retornar { produtos: [], total: X }, { rows: [], total: X } ou apenas []
            if (data.produtos && Array.isArray(data.produtos)) {
                produtosData = data.produtos;
            } else if (data.rows && Array.isArray(data.rows)) {
                produtosData = data.rows;
            } else if (Array.isArray(data)) {
                produtosData = data;
            } else {
                console.error('❌ Formato de resposta inválido:', data);
                produtosData = [];
            }
            
            console.log('✅ Produtos carregaçãos:', produtosData.length);
            renderProdutos();
            updateStats();
            
        } catch (error) {
            console.error('❌ Erro ao carregar produtos:', error);
            produtosData = [];
            renderProdutos(); // Renderizar mensagem de vazio
            updateStats(); // Atualizar contaçãores mesmo com erro
        }
    }
    
    // Renderizar produtos na tabela
    function renderProdutos() {
        // Tentar encontrar o container em ambas as views (materiais e gestão de produtos)
        const container = document.getElementById('tabela-produtos-container') 
                       || document.getElementById('tabela-produtos-gestao-container');
        if (!container) {
            console.warn('⚠️ Container de produtos não encontração');
            return;
        }
        
        // Garantir que produtosData é um array
        if (!Array.isArray(produtosData)) {
            console.error('❌ produtosData não é um array:', produtosData);
            produtosData = [];
        }
        
        console.log('🎨 Renderizando', produtosData.length, 'produtos');
        
        if (produtosData.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 48px 20px;">
                    <i class="fas fa-box-open" style="font-size: 64px; color: #d1d5db; margin-bottom: 16px;"></i>
                    <p style="color: #6b7280; font-size: 16px; margin: 0;">Nenhum produto cadastração</p>
                </div>
            `;
            console.log('⚠️ Tabela de produtos vazia renderizada');
            return;
        }
        
        const html = `
            <table class="data-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="padding: 16px 20px; text-align: left; background: #f8fafc; border-bottom: 2px solid #e5e7eb;">Código</th>
                        <th style="padding: 16px 20px; text-align: left; background: #f8fafc; border-bottom: 2px solid #e5e7eb;">Descrição</th>
                        <th style="padding: 16px 20px; text-align: left; background: #f8fafc; border-bottom: 2px solid #e5e7eb;">SKU</th>
                        <th style="padding: 16px 20px; text-align: left; background: #f8fafc; border-bottom: 2px solid #e5e7eb;">GTIN</th>
                        <th style="padding: 16px 20px; text-align: center; background: #f8fafc; border-bottom: 2px solid #e5e7eb;">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${produtosData.map(produto => `
                        <tr style="border-bottom: 1px solid #f3f4f6; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                            <td style="padding: 16px 20px; font-size: 14px;"><strong>${escapeHtml(produto.codigo_produto || produto.codigo || '')}</strong></td>
                            <td style="padding: 16px 20px; font-size: 14px;">${escapeHtml(produto.descricao || '')}</td>
                            <td style="padding: 16px 20px; font-size: 14px;">
                                <span style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">
                                    ${escapeHtml(produto.sku || '-')}
                                </span>
                            </td>
                            <td style="padding: 16px 20px; font-size: 14px;">
                                <span style="font-family: 'Courier New', monospace; font-size: 12px; color: #6b7280; background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">
                                    ${escapeHtml(produto.gtin || '-')}
                                </span>
                            </td>
                            <td style="padding: 16px 20px; text-align: center;">
                                <button class="btn-action edit" onclick="window.editarProduto(${produto.id})" style="margin: 0 4px;">
                                    <i class="fas fa-edit"></i>
                                    Editar
                                </button>
                                <button class="btn-action delete" onclick="window.excluirProduto(${produto.id})" style="margin: 0 4px;">
                                    <i class="fas fa-trash"></i>
                                    Excluir
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = html;
        console.log('✅ Produtos renderizaçãos na tabela:', produtosData.length, 'itens');
    }

    // Renderizar materiais
    function renderMateriais() {
        console.log('🎨 Renderizando materiais...');
        const filtered = filterMateriais();
        console.log('   Materiais filtraçãos:', filtered.length);
        
        const paginated = paginateMateriais(filtered);
        console.log('   Materiais na página atual:', paginated.length);
        
        if (currentView === 'table') {
            console.log('   Renderizando em modo tabela');
            renderTableView(paginated);
        } else {
            console.log('   Renderizando em modo grade');
            renderGridView(paginated);
        }
        
        updatePagination(filtered.length);
        updateCountDisplay(filtered.length);
        console.log('✅ Materiais renderizaçãos com sucesso');
    }

    // Filtrar materiais
    function filterMateriais() {
        return materiaisData.filter(material => {
            const matchSearch = searchTerm === '' || 
                material.codigo_material.toLowerCase().includes(searchTerm.toLowerCase()) ||
                material.descricao.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchCategoria = !filters.categoria || material.categoria === filters.categoria;
            
            let matchEstoque = true;
            if (filters.estoque === 'disponivel') {
                matchEstoque = material.quantidade_estoque > 10;
            } else if (filters.estoque === 'baixo') {
                matchEstoque = material.quantidade_estoque > 0 && material.quantidade_estoque <= 10;
            } else if (filters.estoque === 'zeração') {
                matchEstoque = material.quantidade_estoque === 0;
            }
            
            return matchSearch && matchCategoria && matchEstoque;
        });
    }

    // Paginar materiais
    function paginateMateriais(materials) {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return materials.slice(start, end);
    }

    // Renderizar visualização em tabela
    function renderTableView(materials) {
        console.log('📋 Renderizando tabela com', materials.length, 'materiais');
        const tbody = document.getElementById('materiais-tbody');
        
        if (!tbody) {
            console.error('❌ Elemento materiais-tbody não encontração!');
            return;
        }

        if (materials.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="7" class="text-center" style="padding: 48px 20px;">
                        <i class="fas fa-inbox" style="font-size: 48px; color: #d1d5db; margin-bottom: 16px;"></i>
                        <p style="color: #6b7280; font-size: 16px; margin: 0;">Nenhum material encontração</p>
                    </td>
                </tr>
            `;
            console.log('⚠️ Tabela vazia renderizada');
            return;
        }

        tbody.innerHTML = materials.map(material => `
            <tr>
                <td><input type="checkbox" /></td>
                <td><strong>${escapeHtml(material.codigo_material || '')}</strong></td>
                <td>${escapeHtml(material.descricao || '')}</td>
                <td>${escapeHtml(material.unidade_medida || '')}</td>
                <td>
                    <span class="${getStockClass(material.quantidade_estoque)}">
                        ${material.quantidade_estoque || 0}
                    </span>
                </td>
                <td>${escapeHtml(material.fornecedor_padrao || '-')}</td>
                <td class="text-center">
                    <button class="btn-action edit" onclick="window.editarMaterial(${material.id})">
                        <i class="fas fa-edit"></i>
                        Editar
                    </button>
                    <button class="btn-action delete" onclick="window.excluirMaterial(${material.id})">
                        <i class="fas fa-trash"></i>
                        Excluir
                    </button>
                </td>
            </tr>
        `).join('');
        
        console.log('✅ Tabela renderizada com', materials.length, 'linhas');
    }

    // Renderizar visualização em grade
    function renderGridView(materials) {
        const container = document.getElementById('materiais-grid');
        if (!container) return;

        if (materials.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 48px;">
                    <i class="fas fa-inbox" style="font-size: 64px; color: #d1d5db; margin-bottom: 16px;"></i>
                    <p style="color: #6b7280; font-size: 18px; margin: 0;">Nenhum material encontração</p>
                </div>
            `;
            return;
        }

        container.innerHTML = materials.map(material => `
            <div class="material-card-grid">
                <div class="material-card-header">
                    <div class="material-code">${escapeHtml(material.codigo_material || '')}</div>
                    <div class="material-badge">${escapeHtml(material.unidade_medida || '')}</div>
                </div>
                <div class="material-description">${escapeHtml(material.descricao || '')}</div>
                <div class="material-details">
                    <div class="material-detail-item">
                        <span class="detail-label">Estoque:</span>
                        <span class="detail-value ${getStockClass(material.quantidade_estoque)}">
                            ${material.quantidade_estoque || 0}
                        </span>
                    </div>
                    <div class="material-detail-item">
                        <span class="detail-label">Fornecedor:</span>
                        <span class="detail-value">${escapeHtml(material.fornecedor_padrao || '-')}</span>
                    </div>
                </div>
                <div class="material-actions-grid">
                    <button class="btn-action edit" onclick="window.editarMaterial(${material.id})">
                        <i class="fas fa-edit"></i>
                        Editar
                    </button>
                    <button class="btn-action delete" onclick="window.excluirMaterial(${material.id})">
                        <i class="fas fa-trash"></i>
                        Excluir
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Alternar visualização
    function switchView(view) {
        currentView = view;
        
        // Atualizar botões
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Atualizar visualizações
        const tableView = document.getElementById('materials-table-view');
        const gridView = document.getElementById('materials-grid-view');
        
        if (view === 'table') {
            tableView.classList.add('active');
            gridView.classList.remove('active');
        } else {
            tableView.classList.remove('active');
            gridView.classList.add('active');
        }
        
        renderMateriais();
    }

    // Atualizar paginação
    function updatePagination(totalItems) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        document.getElementById('current-page').textContent = currentPage;
        document.getElementById('total-pages').textContent = totalPages;
        
        document.getElementById('btn-first-page').disabled = currentPage === 1;
        document.getElementById('btn-prev-page').disabled = currentPage === 1;
        document.getElementById('btn-next-page').disabled = currentPage === totalPages;
        document.getElementById('btn-last-page').disabled = currentPage === totalPages;
    }

    // Ir para página
    function goToPage(page) {
        const totalPages = getTotalPages();
        if (page < 1 || page > totalPages) return;
        
        currentPage = page;
        renderMateriais();
    }

    // Obter total de páginas
    function getTotalPages() {
        const filtered = filterMateriais();
        return Math.ceil(filtered.length / itemsPerPage);
    }

    // Atualizar contaçãor de exibição
    function updateCountDisplay(count) {
        const display = document.getElementById('materials-count-display');
        if (display) {
            display.textContent = count;
        }
    }

    // Buscar materiais
    function handleSearch(event) {
        searchTerm = event.target.value;
        currentPage = 1;
        renderMateriais();
    }

    // Aplicar filtros
    function applyFilters() {
        filters.categoria = document.getElementById('filter-categoria').value || '';
        filters.estoque = document.getElementById('filter-estoque').value || '';
        currentPage = 1;
        renderMateriais();
    }

    // Atualizar estatísticas
    function updateStats() {
        console.log('📊 Atualizando estatísticas...');
        console.log('   Materiais:', materiaisData.length);
        console.log('   Produtos:', produtosData.length);
        
        const statMateriais = document.getElementById('stat-materiais');
        const statProdutos = document.getElementById('stat-produtos');
        const statAlertas = document.getElementById('stat-alertas');
        
        if (statMateriais) {
            statMateriais.textContent = materiaisData.length;
            console.log('✅ Contaçãor de materiais atualização');
        } else {
            console.warn('⚠️ Elemento stat-materiais não encontração');
        }
        
        if (statProdutos) {
            statProdutos.textContent = produtosData.length;
            console.log('✅ Contaçãor de produtos atualização');
        } else {
            console.warn('⚠️ Elemento stat-produtos não encontração');
        }
        
        // Calcular alertas de estoque baixo
        const lowStock = materiaisData.filter(m => m.quantidade_estoque <= 10 && m.quantidade_estoque > 0).length;
        const outOfStock = materiaisData.filter(m => m.quantidade_estoque === 0).length;
        const totalAlertas = lowStock + outOfStock;
        
        if (statAlertas) {
            statAlertas.textContent = totalAlertas;
            console.log('✅ Contaçãor de alertas atualização:', totalAlertas);
        } else {
            console.warn('⚠️ Elemento stat-alertas não encontração');
        }
        
        console.log('📊 Estatísticas atualizadas:', {
            materiais: materiaisData.length,
            produtos: produtosData.length,
            alertas: totalAlertas
        });
    }

    // Animação dos números das estatísticas
    function startStatsAnimation() {
        const statValues = document.querySelectorAll('.stat-value');
        
        statValues.forEach(stat => {
            const target = parseInt(stat.textContent) || 0;
            animateValue(stat, 0, target, 1000);
        });
    }

    function animateValue(element, start, end, duration) {
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                current = end;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current);
        }, 16);
    }

    // Obter classe CSS baseada no estoque
    function getStockClass(quantity) {
        if (quantity === 0) return 'stock-zero';
        if (quantity <= 10) return 'stock-low';
        return 'stock-ok';
    }

    // Mostrar loading
    function showLoading() {
        const tbody = document.getElementById('materiais-tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="7" class="text-center">
                        <div class="loader"></div>
                        <p style="color: #6b7280; margin-top: 16px;">Carregando materiais...</p>
                    </td>
                </tr>
            `;
        }
    }

    // Mostrar erro
    function showError(message) {
        const tbody = document.getElementById('materiais-tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr class="error-row">
                    <td colspan="7" class="text-center" style="padding: 48px 20px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ef4444; margin-bottom: 16px;"></i>
                        <p style="color: #dc2626; font-size: 16px; margin: 0;">${message}</p>
                    </td>
                </tr>
            `;
        }
        
        // Toast notification
        showToast(message, 'error');
    }
    
    // Mostrar mensagem de sucesso
    function showSuccess(message) {
        showToast(message, 'success');
    }
    
    // Sistema de toast notifications
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const colors = {
            success: { bg: '#10b981', icon: 'fa-check-circle' },
            error: { bg: '#ef4444', icon: 'fa-exclamation-circle' },
            info: { bg: '#3b82f6', icon: 'fa-info-circle' }
        };
        
        const config = colors[type] || colors.info;
        
        toast.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${config.bg};
                color: white;
                padding: 16px 24px;
                border-radius: 8px;
                box-shaçãow: 0 10px 40px rgba(0,0,0,0.3);
                z-index: 99999;
                display: flex;
                align-items: center;
                gap: 12px;
                animation: slideIn 0.3s ease-out;
                min-width: 300px;
            ">
                <i class="fas ${config.icon}" style="font-size: 20px;"></i>
                <span style="flex: 1; font-weight: 600;">${escapeHtml(message)}</span>
                <i class="fas fa-times" style="cursor: pointer; opacity: 0.8;" onclick="this.closest('div').parentElement.remove()"></i>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Auto remover após 5 segundos
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    // Escape HTML para prevenir XSS
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    // Debounce helper
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

    // Exportar funções globais
    window.carregarMateriais = loadMateriais;
    window.carregarProdutos = loadProdutos;
    window.onMateriaisViewShown = onViewShown;
    
    // =====================================================
    // FUNÇÕES DE EDIÇÃO E EXCLUSÃO
    // =====================================================
    
    window.editarMaterial = async function(id) {
        console.log('🔵 editarMaterial (materiais-functions.js) chamação, redirecionando para modal drawer');
        
        // Abrir modal drawer lateral de edição de produto
        if (typeof window.abrirModalEditarProduto === 'function') {
            window.abrirModalEditarProduto(id);
        } else {
            console.error('❌ Função abrirModalEditarProduto não encontrada');
            alert('Erro: Modal de edição não encontração');
        }
        
        // Código antigo removido (usava prompts)
        /*
        const material = materiaisData.find(m => m.id === id);
        if (!material) {
            showError('Material não encontração');
            return;
        }
        
        const descricao = prompt('Nova descrição:', material.descricao || '');
        if (descricao === null) return; // Cancelou
        
        const quantidade = prompt('Nova quantidade:', material.quantidade_estoque || 0);
        if (quantidade === null) return;
        
        try {
            const response = await fetch(`/api/pcp/materiais/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    descricao: descricao.trim(),
                    quantidade_estoque: parseFloat(quantidade) || 0
                })
            });
            
            if (!response.ok) throw new Error('Erro ao atualizar material');
            
            showSuccess('Material atualização com sucesso!');
            loadMateriais(); // Recarregar lista
        } catch (error) {
            console.error('❌ Erro ao atualizar material:', error);
            showError('Erro ao atualizar material');
        }
        */
    };
    
    window.excluirMaterial = async function(id) {
        const material = materiaisData.find(m => m.id === id);
        if (!material) return;
        
        if (!confirm(`Tem certeza que deseja excluir "${material.descricao || 'este material'}"\n\nEsta ação não pode ser desfeita.`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/pcp/materiais/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Erro ao excluir material');
            
            showSuccess('Material excluído com sucesso!');
            loadMateriais(); // Recarregar lista
        } catch (error) {
            console.error('❌ Erro ao excluir material:', error);
            showError('Erro ao excluir material');
        }
    };
    
    window.editarProduto = async function(id) {
        console.log('🔵 Editar produto com modal drawer lateral:', id);
        
        // Abrir modal drawer lateral profissional
        if (typeof window.abrirModalEditarProduto === 'function') {
            window.abrirModalEditarProduto(id);
        } else {
            console.error('❌ Função window.abrirModalEditarProduto não encontrada');
            alert('Erro: Modal de edição não disponível');
        }
        
        /* CÓDIGO ANTIGO REMOVIDO - Modal inline
        Código comentação para manter histórico
        */
    };
    
    // Backup da função antiga para referência
    window.editarProduto_OLD_MATERIALFUNC = async function(id) {
        /* Função antiga - não usar
        const produto = produtosData.find(p => p.id === id);
        if (!produto) {
            showError('Produto não encontração');
            return;
        }
        
        // Criar modal de edição com design moderno e melhoração
        const modalHTML = `
            <div id="modal-edit-produto" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 10000; animation: fadeIn 0.2s ease;">
                <div style="background: white; padding: 0; border-radius: 16px; max-width: 550px; width: 90%; box-shaçãow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: slideUp 0.3s ease; overflow: hidden;">
                    
                    <!-- Header do Modal -->
                    <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 24px 30px; border-bottom: 3px solid #1e40af;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <h2 style="margin: 0; color: white; font-size: 22px; font-weight: 700; display: flex; align-items: center; gap: 12px;">
                                <i class="fas fa-edit" style="font-size: 20px;"></i>
                                <span>Editar Produto</span>
                            </h2>
                            <button type="button" onclick="document.getElementById('modal-edit-produto').remove()" 
                                style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;"
                                onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
                                onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                                <i class="fas fa-times" style="font-size: 16px;"></i>
                            </button>
                        </div>
                        <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 13px;">
                            <i class="fas fa-info-circle"></i> Atualize as informações do produto
                        </p>
                    </div>
                    
                    <!-- Corpo do Modal -->
                    <form id="form-edit-produto" style="padding: 30px;">
                        
                        <!-- Campo Código (reaçãonly) -->
                        <div style="margin-bottom: 20px; position: relative;">
                            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 600; color: #334155; font-size: 14px;">
                                <i class="fas fa-barcode" style="color: #64748b; width: 16px;"></i>
                                <span>Código do Produto</span>
                                <span style="background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">SOMENTE LEITURA</span>
                            </label>
                            <input type="text" id="edit-codigo" value="${escapeHtml(produto.codigo || '')}" reaçãonly 
                                style="width: 100%; padding: 12px 12px 12px 42px; border: 2px solid #cbd5e1; border-radius: 10px; background: #f1f5f9; font-size: 14px; color: #475569; font-weight: 600; box-sizing: border-box;">
                            <i class="fas fa-lock" style="position: absolute; left: 14px; top: 46px; color: #94a3b8; font-size: 14px;"></i>
                        </div>
                        
                        <!-- Campo Nome (obrigatório) -->
                        <div style="margin-bottom: 20px; position: relative;">
                            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 600; color: #334155; font-size: 14px;">
                                <i class="fas fa-tag" style="color: #3b82f6; width: 16px;"></i>
                                <span>Nome do Produto</span>
                                <span style="color: #ef4444; font-size: 16px; line-height: 1;">*</span>
                            </label>
                            <input type="text" id="edit-nome" value="${escapeHtml(produto.nome || '')}" required 
                                style="width: 100%; padding: 12px 12px 12px 42px; border: 2px solid #cbd5e1; border-radius: 10px; font-size: 14px; color: #1e293b; transition: all 0.2s; box-sizing: border-box;"
                                onfocus="this.style.borderColor='#3b82f6'; this.style.boxShaçãow='0 0 0 3px rgba(59,130,246,0.1)'"
                                onblur="this.style.borderColor='#cbd5e1'; this.style.boxShaçãow='none'"
                                oninput="validateField(this)">
                            <i class="fas fa-pencil-alt" style="position: absolute; left: 14px; top: 46px; color: #3b82f6; font-size: 14px;"></i>
                        </div>
                        
                        <!-- Campo Descrição -->
                        <div style="margin-bottom: 20px; position: relative;">
                            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 600; color: #334155; font-size: 14px;">
                                <i class="fas fa-align-left" style="color: #8b5cf6; width: 16px;"></i>
                                <span>Descrição</span>
                                <span style="background: #f3f4f6; color: #6b7280; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;">Opcional</span>
                            </label>
                            <textarea id="edit-descricao" rows="2"
                                style="width: 100%; padding: 12px 12px 12px 42px; border: 2px solid #cbd5e1; border-radius: 10px; font-size: 14px; color: #1e293b; transition: all 0.2s; resize: vertical; font-family: inherit; box-sizing: border-box;"
                                onfocus="this.style.borderColor='#8b5cf6'; this.style.boxShaçãow='0 0 0 3px rgba(139,92,246,0.1)'"
                                onblur="this.style.borderColor='#cbd5e1'; this.style.boxShaçãow='none'"
                                placeholder="Adicione detalhes sobre o produto...">${escapeHtml(produto.descricao || '')}</textarea>
                            <i class="fas fa-file-alt" style="position: absolute; left: 14px; top: 46px; color: #8b5cf6; font-size: 14px;"></i>
                        </div>
                        
                        <!-- Grid de 2 colunas para SKU e GTIN -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                            
                            <!-- Campo SKU -->
                            <div style="position: relative;">
                                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 600; color: #334155; font-size: 14px;">
                                    <i class="fas fa-qrcode" style="color: #10b981; width: 16px;"></i>
                                    <span>SKU</span>
                                </label>
                                <input type="text" id="edit-sku" value="${escapeHtml(produto.sku || '')}" 
                                    style="width: 100%; padding: 12px; border: 2px solid #cbd5e1; border-radius: 10px; font-size: 14px; color: #1e293b; transition: all 0.2s; box-sizing: border-box; text-transform: uppercase;"
                                    onfocus="this.style.borderColor='#10b981'; this.style.boxShaçãow='0 0 0 3px rgba(16,185,129,0.1)'"
                                    onblur="this.style.borderColor='#cbd5e1'; this.style.boxShaçãow='none'"
                                    placeholder="SKU-ROSE">
                            </div>
                            
                            <!-- Campo GTIN -->
                            <div style="position: relative;">
                                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 600; color: #334155; font-size: 14px;">
                                    <i class="fas fa-barcode" style="color: #f59e0b; width: 16px;"></i>
                                    <span>GTIN</span>
                                </label>
                                <input type="text" id="edit-gtin" value="${escapeHtml(produto.gtin || '')}" 
                                    style="width: 100%; padding: 12px; border: 2px solid #cbd5e1; border-radius: 10px; font-size: 14px; color: #1e293b; transition: all 0.2s; box-sizing: border-box;"
                                    onfocus="this.style.borderColor='#f59e0b'; this.style.boxShaçãow='0 0 0 3px rgba(245,158,11,0.1)'"
                                    onblur="this.style.borderColor='#cbd5e1'; this.style.boxShaçãow='none'"
                                    placeholder="7894101247411"
                                    maxlength="14"
                                    oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                            </div>
                        </div>
                        
                        <!-- Linha informativa -->
                        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px;">
                            <p style="margin: 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
                                <i class="fas fa-lightbulb" style="color: #3b82f6; margin-right: 8px;"></i>
                                <strong>Dica:</strong> O SKU e GTIN ajudam na identificação única do produto no estoque.
                            </p>
                        </div>
                        
                        <!-- Botões de Ação -->
                        <div style="display: flex; gap: 12px; margin-top: 28px;">
                            <button type="submit" 
                                style="flex: 1; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; padding: 14px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s; font-size: 15px; box-shaçãow: 0 4px 12px rgba(59,130,246,0.3);"
                                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShaçãow='0 6px 16px rgba(59,130,246,0.4)'"
                                onmouseout="this.style.transform='translateY(0)'; this.style.boxShaçãow='0 4px 12px rgba(59,130,246,0.3)'">
                                <i class="fas fa-save"></i> Salvar Alterações
                            </button>
                            <button type="button" onclick="document.getElementById('modal-edit-produto').remove()" 
                                style="flex: 0.7; background: #f1f5f9; color: #475569; border: 2px solid #cbd5e1; padding: 14px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 15px;"
                                onmouseover="this.style.background='#e2e8f0'; this.style.borderColor='#94a3b8'"
                                onmouseout="this.style.background='#f1f5f9'; this.style.borderColor='#cbd5e1'">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { 
                        opacity: 0; 
                        transform: translateY(30px) scale(0.95); 
                    }
                    to { 
                        opacity: 1; 
                        transform: translateY(0) scale(1); 
                    }
                }
                
                #form-edit-produto input:focus,
                #form-edit-produto textarea:focus {
                    outline: none;
                }
                
                #form-edit-produto input[required]:invalid {
                    border-color: #fca5a5 !important;
                }
                
                #form-edit-produto input[required]:valid {
                    border-color: #86efac !important;
                }
            </style>
            
            <script>
                function validateField(input) {
                    if (input.value.trim() === '') {
                        input.style.borderColor = '#fca5a5';
                    } else {
                        input.style.borderColor = '#86efac';
                    }
                }
            </script>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Submeter formulário
        document.getElementById('form-edit-produto').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const daçãosAtualizaçãos = {
                nome: document.getElementById('edit-nome').value.trim(),
                descricao: document.getElementById('edit-descricao').value.trim(),
                sku: document.getElementById('edit-sku').value.trim(),
                gtin: document.getElementById('edit-gtin').value.trim()
            };
            
            try {
                const response = await fetch(`/api/pcp/produtos/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(daçãosAtualizaçãos)
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Erro ao atualizar produto');
                }
                
                document.getElementById('modal-edit-produto').remove();
                showSuccess('Produto atualização com sucesso!');
                loadProdutos(); // Recarregar lista
            } catch (error) {
                console.error('❌ Erro ao atualizar produto:', error);
                alert('Erro ao atualizar produto: ' + error.message);
            }
        });
        */
    };
    
    window.excluirProduto = async function(id) {
        const produto = produtosData.find(p => p.id === id);
        if (!produto) return;
        
        // Criar modal de confirmação profissional
        const modalHTML = `
            <div id="modal-delete-produto" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 10000; animation: fadeIn 0.2s ease;">
                <div style="background: white; border-radius: 16px; max-width: 500px; width: 90%; box-shaçãow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: slideUp 0.3s ease; overflow: hidden;">
                    
                    <!-- Header de Alerta -->
                    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 24px 30px; border-bottom: 3px solid #b91c1c;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: rgba(255,255,255,0.2); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-exclamation-triangle" style="color: white; font-size: 24px;"></i>
                            </div>
                            <div>
                                <h2 style="margin: 0; color: white; font-size: 20px; font-weight: 700;">
                                    ATENÇÃO!
                                </h2>
                                <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.9); font-size: 13px;">
                                    Esta ação é irreversível
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Corpo do Modal -->
                    <div style="padding: 30px;">
                        <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                            Você está prestes a excluir o produto:
                        </p>
                        
                        <!-- Card do Produto -->
                        <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                <div style="display: flex; align-items: start; gap: 10px;">
                                    <i class="fas fa-barcode" style="color: #64748b; margin-top: 2px; width: 16px;"></i>
                                    <div style="flex: 1;">
                                        <span style="font-size: 12px; color: #64748b; font-weight: 600; display: block; margin-bottom: 2px;">CÓDIGO</span>
                                        <span style="font-size: 15px; color: #1e293b; font-weight: 700;">${escapeHtml(produto.codigo || '-')}</span>
                                    </div>
                                </div>
                                
                                <div style="display: flex; align-items: start; gap: 10px;">
                                    <i class="fas fa-tag" style="color: #3b82f6; margin-top: 2px; width: 16px;"></i>
                                    <div style="flex: 1;">
                                        <span style="font-size: 12px; color: #64748b; font-weight: 600; display: block; margin-bottom: 2px;">NOME</span>
                                        <span style="font-size: 15px; color: #1e293b; font-weight: 700;">${escapeHtml(produto.nome || '-')}</span>
                                    </div>
                                </div>
                                
                                ${produto.descricao  `
                                <div style="display: flex; align-items: start; gap: 10px;">
                                    <i class="fas fa-align-left" style="color: #8b5cf6; margin-top: 2px; width: 16px;"></i>
                                    <div style="flex: 1;">
                                        <span style="font-size: 12px; color: #64748b; font-weight: 600; display: block; margin-bottom: 2px;">DESCRIÇÃO</span>
                                        <span style="font-size: 14px; color: #475569;">${escapeHtml(produto.descricao)}</span>
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <!-- Alerta de Ação Irreversível -->
                        <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 10px; padding: 14px 16px; margin-bottom: 24px;">
                            <div style="display: flex; align-items: start; gap: 12px;">
                                <i class="fas fa-info-circle" style="color: #dc2626; margin-top: 1px; font-size: 16px;"></i>
                                <div style="flex: 1;">
                                    <p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 1.5; font-weight: 600;">
                                        Esta ação é IRREVERSÍVEL!
                                    </p>
                                    <p style="margin: 6px 0 0 0; font-size: 12px; color: #b91c1c; line-height: 1.4;">
                                        O produto será permanentemente removido do sistema e não poderá ser recuperação.
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Pergunta de Confirmação -->
                        <p style="margin: 0 0 24px 0; text-align: center; font-size: 15px; color: #1e293b; font-weight: 600;">
                            Deseja realmente continuar
                        </p>
                        
                        <!-- Botões de Ação -->
                        <div style="display: flex; gap: 12px;">
                            <button type="button" id="btn-cancel-delete"
                                style="flex: 1; background: #f1f5f9; color: #475569; border: 2px solid #cbd5e1; padding: 14px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 15px;"
                                onmouseover="this.style.background='#e2e8f0'; this.style.borderColor='#94a3b8'"
                                onmouseout="this.style.background='#f1f5f9'; this.style.borderColor='#cbd5e1'">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                            <button type="button" id="btn-confirm-delete"
                                style="flex: 1; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; padding: 14px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s; font-size: 15px; box-shaçãow: 0 4px 12px rgba(239,68,68,0.3);"
                                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShaçãow='0 6px 16px rgba(239,68,68,0.4)'"
                                onmouseout="this.style.transform='translateY(0)'; this.style.boxShaçãow='0 4px 12px rgba(239,68,68,0.3)'">
                                <i class="fas fa-trash-alt"></i> Sim, Excluir
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { 
                        opacity: 0; 
                        transform: translateY(30px) scale(0.95); 
                    }
                    to { 
                        opacity: 1; 
                        transform: translateY(0) scale(1); 
                    }
                }
            </style>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Botão Cancelar
        document.getElementById('btn-cancel-delete').addEventListener('click', function() {
            document.getElementById('modal-delete-produto').remove();
        });
        
        // Botão Confirmar Exclusão
        document.getElementById('btn-confirm-delete').addEventListener('click', async function() {
            const btnConfirm = this;
            const btnCancel = document.getElementById('btn-cancel-delete');
            
            // Desabilitar botões durante a requisição
            btnConfirm.disabled = true;
            btnCancel.disabled = true;
            btnConfirm.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';
            btnConfirm.style.opacity = '0.7';
            btnConfirm.style.cursor = 'not-allowed';
            
            try {
                const response = await fetch(`/api/pcp/produtos/${id}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Erro ao excluir produto');
                }
                
                document.getElementById('modal-delete-produto').remove();
                showSuccess('Produto excluído com sucesso!');
                loadProdutos(); // Recarregar lista
            } catch (error) {
                console.error('❌ Erro ao excluir produto:', error);
                showError('Erro ao excluir produto: ' + error.message);
                
                // Reabilitar botões em caso de erro
                btnConfirm.disabled = false;
                btnCancel.disabled = false;
                btnConfirm.innerHTML = '<i class="fas fa-trash-alt"></i> Sim, Excluir';
                btnConfirm.style.opacity = '1';
                btnConfirm.style.cursor = 'pointer';
            }
        });
    };

    // Inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Observer para detectar quando a view de materiais fica visível
    const materiaisView = document.getElementById('materiais-view');
    if (materiaisView) {
        let isObserving = false;
        
        const observer = new MutationObserver(function(mutations) {
            if (isObserving) return; // Prevenir loops
            
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const isVisible = !materiaisView.classList.contains('hidden');
                    
                    if (isVisible && materiaisData.length === 0) {
                        console.log('🔄 View de materiais ficou visível, carregando daçãos...');
                        isObserving = true; // Bloquear reentrada
                        
                        onViewShown();
                        
                        // Liberar após 2 segundos
                        setTimeout(() => {
                            isObserving = false;
                        }, 2000);
                    }
                }
            });
        });
        
        observer.observe(materiaisView, { attributes: true });
        console.log('👀 Observer instalação para detectar mudanças na view');
    }

})();
