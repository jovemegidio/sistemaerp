/**
 * FORNECEDORES - Módulo Compras
 */

(function() {
    'use strict';

    let container;
    let fornecedores = [];

    function init() {
        container = document.getElementById('fornecedoresContainer');
        if (container) {
            loadFornecedores();
            render();
        }
    }

    function loadFornecedores() {
        // Mock data
        fornecedores = [
            { id: 1, nome: 'Alum Brasil Ltda', cnpj: '12.345.678/0001-90', telefone: '(11) 3456-7890', email: 'contato@alumbrasil.com.br', cidade: 'São Paulo', estação: 'SP', categoria: 'Matéria-Prima', status: 'ativo', totalCompras: 245800, ultimaCompra: '2025-01-10' },
            { id: 2, nome: 'Metal Line Indústria', cnpj: '23.456.789/0001-01', telefone: '(11) 3567-8901', email: 'vendas@metalline.com.br', cidade: 'Guarulhos', estação: 'SP', categoria: 'Ferragens', status: 'ativo', totalCompras: 189450, ultimaCompra: '2025-01-09' },
            { id: 3, nome: 'Aço Forte Materiais', cnpj: '34.567.890/0001-12', telefone: '(21) 3678-9012', email: 'comercial@acoforte.com.br', cidade: 'Rio de Janeiro', estação: 'RJ', categoria: 'Matéria-Prima', status: 'ativo', totalCompras: 156200, ultimaCompra: '2025-01-08' },
            { id: 4, nome: 'QuímicaBR Produtos', cnpj: '45.678.901/0001-23', telefone: '(41) 3789-0123', email: 'atendimento@quimicabr.com.br', cidade: 'Curitiba', estação: 'PR', categoria: 'Químicos', status: 'ativo', totalCompras: 87650, ultimaCompra: '2025-01-07' },
            { id: 5, nome: 'Embalagens Master', cnpj: '56.789.012/0001-34', telefone: '(19) 3890-1234', email: 'vendas@embalagensmastercom.br', cidade: 'Campinas', estação: 'SP', categoria: 'Embalagens', status: 'ativo', totalCompras: 37550, ultimaCompra: '2025-01-06' }
        ];
    }

    function render() {
        const { formatCurrency, formatDate, getStatusBadge } = window.ComprasModule.utils;

        const totalFornecedores = fornecedores.filter(f => f.status === 'ativo').length;
        const totalCompras = fornecedores.reduce((sum, f) => sum + f.totalCompras, 0);

        container.innerHTML = `
            <div class="stats-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                        <i class="fas fa-truck"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-label">Fornecedores Ativos</div>
                        <div class="stat-value">${totalFornecedores}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-label">Total em Compras</div>
                        <div class="stat-value">${formatCurrency(totalCompras)}</div>
                    </div>
                </div>
            </div>

            <div class="fornecedores-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 24px;">
                ${fornecedores.map(f => `
                    <div class="fornecedor-card">
                        <div class="fornecedor-header">
                            <div class="fornecedor-icon">
                                <i class="fas fa-truck"></i>
                            </div>
                            <div class="fornecedor-info">
                                <h3>${f.nome}</h3>
                                ${getStatusBadge(f.status)}
                            </div>
                        </div>
                        <div class="fornecedor-body">
                            <div class="info-item">
                                <i class="fas fa-id-card"></i>
                                <span>${f.cnpj}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-phone"></i>
                                <span>${f.telefone}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-envelope"></i>
                                <span>${f.email}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${f.cidade} - ${f.estação}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-tag"></i>
                                <span class="badge badge-info">${f.categoria}</span>
                            </div>
                            <div class="info-item">
                                <strong>Total em Compras:</strong>
                                <span class="text-success">${formatCurrency(f.totalCompras)}</span>
                            </div>
                            <div class="info-item">
                                <strong>Última Compra:</strong>
                                <span>${formatDate(f.ultimaCompra)}</span>
                            </div>
                        </div>
                        <div class="fornecedor-footer">
                            <button class="btn-action btn-view" onclick="verFornecedor(${f.id})" title="Visualizar">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            <button class="btn-action btn-edit" onclick="editarFornecedor(${f.id})" title="Editar">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    window.verFornecedor = function(id) {
        alert(`Visualizar fornecedor #${id}`);
    };

    window.editarFornecedor = function(id) {
        alert(`Editar fornecedor #${id}`);
    };

    // Inicializar quando seção estiver ativa
    const observer = new MutationObserver(() => {
        const section = document.getElementById('fornecedores-section');
        if (section && section.classList.contains('active') && !container) {
            init();
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('fornecedores-section');
        if (section) {
            observer.observe(section, { attributes: true, attributeFilter: ['class'] });
            if (section.classList.contains('active')) {
                init();
            }
        }
    });
})();
