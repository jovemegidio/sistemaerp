// =====================================================
// ORDENS DE COMPRA - JAVASCRIPT
// =====================================================

(function() {
    'use strict';

    let ordensCompra = [];

    // Inicializar quando a view de ordem de compra for carregada
    window.initOrdensCompra = function() {
        console.log('🛒 Iniciando Ordens de Compra...');
        
        // Event listener para botão de nova ordem
        const btnNova = document.getElementById('btn-nova-ordem-compra');
        if (btnNova) {
            btnNova.addEventListener('click', abrirModalNovaOrdemCompra);
        }
        
        // Filtros
        document.querySelectorAll('#ordem-compra-view .filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('#ordem-compra-view .filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const status = this.dataset.status;
                filtrarOrdensCompra(status);
            });
        });

        // Calcular valores automaticamente
        const qtdInput = document.getElementById('compra-quantidade');
        const valorInput = document.getElementById('compra-valor-unitario');
        
        if (qtdInput) qtdInput.addEventListener('input', calcularTotalCompra);
        if (valorInput) valorInput.addEventListener('input', calcularTotalCompra);

        // Carregar materiais no select
        carregarMateriaisCompra();
        
        // Carregar ordens existentes
        loadOrdensCompra();
    };

    async function carregarMateriaisCompra() {
        try {
            const response = await fetch('/api/pcp/materiais');
            if (!response.ok) throw new Error('Erro ao carregar materiais');
            
            const result = await response.json();
            const materiais = result.data || result || [];
            
            const select = document.getElementById('compra-material');
            if (select) {
                select.innerHTML = '<option value="">-- Selecione um material --</option>';
                materiais.forEach(material => {
                    const option = document.createElement('option');
                    option.value = material.id;
                    option.textContent = `${material.codigo} - ${material.nome}`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('❌ Erro ao carregar materiais:', error);
        }
    }

    async function loadOrdensCompra() {
        try {
            console.log('📦 Carregando ordens de compra...');
            const response = await fetch('/api/pcp/ordens-compra');
            if (!response.ok) throw new Error('Erro ao carregar ordens');
            
            const result = await response.json();
            ordensCompra = result.data || result || [];
            console.log('✅ Ordens de compra carregadas:', ordensCompra.length);
            
            renderOrdensCompra();
            updateStatsCompra();
        } catch (error) {
            console.error('❌ Erro ao carregar ordens:', error);
            ordensCompra = [];
            renderOrdensCompra();
            updateStatsCompra();
        }
    }

    function renderOrdensCompra() {
        const container = document.getElementById('tabela-ordens-compra-container');
        if (!container) return;

        if (ordensCompra.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #64748b;">
                    <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="font-size: 16px;">Nenhuma ordem de compra encontrada</p>
                    <button class="btn-primary" onclick="abrirModalNovaOrdemCompra()" style="margin-top: 16px;">
                        <i class="fas fa-plus"></i> Criar Primeira Ordem
                    </button>
                </div>
            `;
            return;
        }

        const html = `
            <table class="production-table">
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Fornecedor</th>
                        <th>Material</th>
                        <th>Quantidade</th>
                        <th>Valor Total</th>
                        <th>Data Pedido</th>
                        <th>Previsão Entrega</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${ordensCompra.map(ordem => `
                        <tr data-id="${ordem.id}">
                            <td><strong>${escapeHtml(ordem.numero || '-')}</strong></td>
                            <td>${escapeHtml(ordem.fornecedor || '-')}</td>
                            <td>${escapeHtml(ordem.material_nome || '-')}</td>
                            <td>${formatNumber(ordem.quantidade)} ${ordem.unidade || 'UN'}</td>
                            <td><strong>R$ ${formatCurrency(ordem.valor_total || 0)}</strong></td>
                            <td>${formatDate(ordem.data_pedido)}</td>
                            <td>${formatDate(ordem.data_entrega_prevista)}</td>
                            <td><span class="status-badge ${ordem.status}">${getStatusLabelCompra(ordem.status)}</span></td>
                            <td>
                                <button class="btn-icon" onclick="visualizarOrdemCompra(${ordem.id})" title="Visualizar">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn-icon" onclick="editarOrdemCompra(${ordem.id})" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon danger" onclick="excluirOrdemCompra(${ordem.id})" title="Excluir">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = html;
    }

    function updateStatsCompra() {
        const pendentes = ordensCompra.filter(o => o.status === 'pendente').length;
        const transito = ordensCompra.filter(o => o.status === 'em_transito').length;
        const atrasadas = ordensCompra.filter(o => {
            if (o.status === 'recebido' || o.status === 'cancelado') return false;
            const hoje = new Date();
            const dataEntrega = new Date(o.data_entrega_prevista);
            return dataEntrega < hoje;
        }).length;
        
        const mesAtual = new Date().getMonth();
        const anoAtual = new Date().getFullYear();
        const valorMes = ordensCompra
            .filter(o => {
                const data = new Date(o.data_pedido);
                return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
            })
            .reduce((sum, o) => sum + (parseFloat(o.valor_total) || 0), 0);

        const elPendentes = document.getElementById('stat-compras-pendentes');
        const elTransito = document.getElementById('stat-compras-transito');
        const elAtrasadas = document.getElementById('stat-compras-atrasadas');
        const elValorMes = document.getElementById('stat-valor-mes');

        if (elPendentes) elPendentes.textContent = pendentes;
        if (elTransito) elTransito.textContent = transito;
        if (elAtrasadas) elAtrasadas.textContent = atrasadas;
        if (elValorMes) elValorMes.textContent = `R$ ${formatCurrency(valorMes)}`;
    }

    function filtrarOrdensCompra(status) {
        if (status === 'all') {
            renderOrdensCompra();
            return;
        }

        const filtered = ordensCompra.filter(o => o.status === status);
        const container = document.getElementById('tabela-ordens-compra-container');
        
        if (!container) return;
        
        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #64748b;">
                    <i class="fas fa-filter" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="font-size: 16px;">Nenhuma ordem com status "${getStatusLabelCompra(status)}"</p>
                </div>
            `;
            return;
        }

        const html = `
            <table class="production-table">
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Fornecedor</th>
                        <th>Material</th>
                        <th>Quantidade</th>
                        <th>Valor Total</th>
                        <th>Data Pedido</th>
                        <th>Previsão Entrega</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(ordem => `
                        <tr data-id="${ordem.id}">
                            <td><strong>${escapeHtml(ordem.numero || '-')}</strong></td>
                            <td>${escapeHtml(ordem.fornecedor || '-')}</td>
                            <td>${escapeHtml(ordem.material_nome || '-')}</td>
                            <td>${formatNumber(ordem.quantidade)} ${ordem.unidade || 'UN'}</td>
                            <td><strong>R$ ${formatCurrency(ordem.valor_total || 0)}</strong></td>
                            <td>${formatDate(ordem.data_pedido)}</td>
                            <td>${formatDate(ordem.data_entrega_prevista)}</td>
                            <td><span class="status-badge ${ordem.status}">${getStatusLabelCompra(ordem.status)}</span></td>
                            <td>
                                <button class="btn-icon" onclick="visualizarOrdemCompra(${ordem.id})" title="Visualizar">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn-icon" onclick="editarOrdemCompra(${ordem.id})" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon danger" onclick="excluirOrdemCompra(${ordem.id})" title="Excluir">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = html;
    }

    function calcularTotalCompra() {
        const quantidade = parseFloat(document.getElementById('compra-quantidade')?.value) || 0;
        const valorUnitario = parseFloat(document.getElementById('compra-valor-unitario')?.value) || 0;
        
        const subtotal = quantidade * valorUnitario;
        const impostos = subtotal * 0.12;
        const total = subtotal + impostos;
        
        const elSubtotal = document.getElementById('compra-subtotal');
        const elImpostos = document.getElementById('compra-impostos');
        const elTotal = document.getElementById('compra-total');

        if (elSubtotal) elSubtotal.textContent = `R$ ${formatCurrency(subtotal)}`;
        if (elImpostos) elImpostos.textContent = `R$ ${formatCurrency(impostos)}`;
        if (elTotal) elTotal.textContent = `R$ ${formatCurrency(total)}`;
    }

    function getStatusLabelCompra(status) {
        const labels = {
            'pendente': '⏳ Pendente',
            'aprovado': '✅ Aprovado',
            'em_transito': '🚚 Em Trânsito',
            'recebido': '📦 Recebido',
            'cancelado': '❌ Cancelado'
        };
        return labels[status] || status;
    }

    // Funções globais
    window.abrirModalNovaOrdemCompra = function() {
        const form = document.getElementById('form-nova-ordem-compra');
        if (form) form.reset();
        
        calcularTotalCompra();
        
        const hoje = new Date().toISOString().split('T')[0];
        const elData = document.getElementById('compra-data-pedido');
        if (elData) elData.value = hoje;
        
        const modal = document.getElementById('modal-nova-ordem-compra');
        if (modal) modal.classList.remove('hidden');
    };

    window.fecharModalNovaOrdemCompra = function() {
        const modal = document.getElementById('modal-nova-ordem-compra');
        if (modal) modal.classList.add('hidden');
    };

    window.salvarNovaOrdemCompra = async function(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const dados = Object.fromEntries(formData);
        
        const quantidade = parseFloat(dados.quantidade) || 0;
        const valorUnitario = parseFloat(dados.valor_unitario) || 0;
        dados.valor_total = quantidade * valorUnitario;
        
        try {
            const response = await fetch('/api/pcp/ordens-compra', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            
            if (!response.ok) throw new Error('Erro ao criar ordem');
            
            console.log('✅ Ordem de compra criada');
            await loadOrdensCompra();
            fecharModalNovaOrdemCompra();
            alert('✅ Ordem de compra criada com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao criar ordem:', error);
            alert('❌ Erro ao criar ordem. Tente novamente.');
        }
    };

    window.visualizarOrdemCompra = function(id) {
        const ordem = ordensCompra.find(o => o.id === id);
        if (!ordem) return;
        
        alert(`📋 Ordem de Compra #${ordem.numero}\n\nFornecedor: ${ordem.fornecedor}\nMaterial: ${ordem.material_nome}\nQuantidade: ${ordem.quantidade} ${ordem.unidade}\nValor Total: R$ ${formatCurrency(ordem.valor_total)}\nStatus: ${getStatusLabelCompra(ordem.status)}`);
    };

    window.editarOrdemCompra = function(id) {
        alert('🚧 Função de edição em desenvolvimento');
    };

    window.excluirOrdemCompra = async function(id) {
        if (!confirm('Tem certeza que deseja excluir esta ordem de compra?')) return;
        
        try {
            const response = await fetch(`/api/pcp/ordens-compra/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Erro ao excluir ordem');
            
            console.log('✅ Ordem excluída');
            await loadOrdensCompra();
            alert('✅ Ordem excluída com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao excluir ordem:', error);
            alert('❌ Erro ao excluir ordem. Tente novamente.');
        }
    };

    // Funções utilitárias (caso não estejam disponíveis globalmente)
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatNumber(num) {
        return parseFloat(num || 0).toFixed(2);
    }

    function formatCurrency(value) {
        return parseFloat(value || 0).toFixed(2).replace('.', ',');
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
    }

})();
