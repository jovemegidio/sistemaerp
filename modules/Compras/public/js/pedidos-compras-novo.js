/**
 * PEDIDOS DE COMPRA - Módulo Compras
 */

(function() {
    'use strict';

    let container;
    let pedidos = [];

    function init() {
        container = document.getElementById('pedidosContainer');
        if (container) {
            loadPedidos();
            render();
        }
    }

    function loadPedidos() {
        // Mock data
        pedidos = [
            { id: 1, numero: 'PC-001', fornecedor: 'Alum Brasil Ltda', valor: 128350.00, data: '2025-01-05', prazo: '2025-01-20', status: 'pendente', itens: 15 },
            { id: 2, numero: 'PC-002', fornecedor: 'Metal Line Indústria', valor: 89450.50, data: '2025-01-06', prazo: '2025-01-18', status: 'aprovação', itens: 8 },
            { id: 3, numero: 'PC-003', fornecedor: 'Aço Forte Materiais', valor: 56200.00, data: '2025-01-07', prazo: '2025-01-22', status: 'em_transito', itens: 12 },
            { id: 4, numero: 'PC-004', fornecedor: 'QuímicaBR Produtos', valor: 43780.25, data: '2025-01-08', prazo: '2025-01-19', status: 'recebido', itens: 6 },
            { id: 5, numero: 'PC-005', fornecedor: 'Embalagens Master', valor: 23450.00, data: '2025-01-09', prazo: '2025-01-25', status: 'pendente', itens: 20 },
            { id: 6, numero: 'PC-006', fornecedor: 'Ferragens Brasil', valor: 67890.75, data: '2025-01-10', prazo: '2025-01-28', status: 'aprovação', itens: 10 }
        ];
    }

    function render() {
        const { formatCurrency, formatDate, getStatusBadge } = window.ComprasModule.utils;

        const totalPedidos = pedidos.length;
        const valorTotal = pedidos.reduce((sum, p) => sum + p.valor, 0);

        container.innerHTML = `
            <div class="stats-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-label">Total de Pedidos</div>
                        <div class="stat-value">${totalPedidos}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-label">Valor Total</div>
                        <div class="stat-value">${formatCurrency(valorTotal)}</div>
                    </div>
                </div>
            </div>

            <div class="table-container">
                <table class="modern-table">
                    <thead>
                        <tr>
                            <th>Pedido</th>
                            <th>Fornecedor</th>
                            <th>Itens</th>
                            <th>Valor</th>
                            <th>Data</th>
                            <th>Prazo</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pedidos.map(p => `
                            <tr>
                                <td><strong>${p.numero}</strong></td>
                                <td>${p.fornecedor}</td>
                                <td>${p.itens}</td>
                                <td>${formatCurrency(p.valor)}</td>
                                <td>${formatDate(p.data)}</td>
                                <td>${formatDate(p.prazo)}</td>
                                <td>${getStatusBadge(p.status)}</td>
                                <td>
                                    <button class="btn-action btn-view" onclick="verPedido(${p.id})" title="Visualizar">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn-action btn-edit" onclick="editarPedido(${p.id})" title="Editar">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    window.verPedido = function(id) {
        alert(`Visualizar pedido #${id}`);
    };

    window.editarPedido = function(id) {
        alert(`Editar pedido #${id}`);
    };

    // Inicializar quando seção estiver ativa
    const observer = new MutationObserver(() => {
        const section = document.getElementById('pedidos-section');
        if (section && section.classList.contains('active') && !container) {
            init();
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('pedidos-section');
        if (section) {
            observer.observe(section, { attributes: true, attributeFilter: ['class'] });
            if (section.classList.contains('active')) {
                init();
            }
        }
    });
})();
