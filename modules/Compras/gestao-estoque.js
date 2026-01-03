/**
 * GESTÃO DE ESTOQUE - ALUFORCE
 * Controle completo de entrada e saída de materiais
 */

class EstoqueManager {
    constructor() {
        this.estoque = [];
        this.filtroAtual = 'todos';
        this.init();
    }

    async init() {
        await this.carregarEstoque();
        this.renderizarTabela();
        this.inicializarUsuario();
    }

    async carregarEstoque() {
        // Dados de exemplo
        this.estoque = [
            { id: 'MAT-001', descricao: 'Alumínio 6063 T5', categoria: 'Matéria Prima', unidade: 'KG', qtdAtual: 1500, qtdMinima: 500, qtdMaxima: 3000, localizacao: 'A-01-05', ultimaMov: '2025-12-09', status: 'adequado' },
            { id: 'MAT-002', descricao: 'Perfil U 50mm', categoria: 'Componentes', unidade: 'UN', qtdAtual: 230, qtdMinima: 200, qtdMaxima: 800, localizacao: 'B-02-12', ultimaMov: '2025-12-08', status: 'adequado' },
            { id: 'MAT-003', descricao: 'Caixa Papelão 40x30', categoria: 'Embalagens', unidade: 'UN', qtdAtual: 45, qtdMinima: 100, qtdMaxima: 500, localizacao: 'C-01-08', ultimaMov: '2025-12-07', status: 'baixo' },
            { id: 'MAT-004', descricao: 'Parafuso M6x20', categoria: 'Fixação', unidade: 'UN', qtdAtual: 5000, qtdMinima: 1000, qtdMaxima: 10000, localizacao: 'D-03-15', ultimaMov: '2025-12-09', status: 'adequado' },
            { id: 'MAT-005', descricao: 'Tinta Epóxi Branca', categoria: 'Acabamento', unidade: 'L', qtdAtual: 0, qtdMinima: 20, qtdMaxima: 100, localizacao: 'E-01-03', ultimaMov: '2025-11-30', status: 'falta' },
            { id: 'MAT-006', descricao: 'Lixa Grão 120', categoria: 'Acabamento', unidade: 'UN', qtdAtual: 78, qtdMinima: 50, qtdMaxima: 200, localizacao: 'E-02-06', ultimaMov: '2025-12-06', status: 'adequado' },
            { id: 'MAT-007', descricao: 'Rebite 4mm', categoria: 'Fixação', unidade: 'UN', qtdAtual: 150, qtdMinima: 500, qtdMaxima: 2000, localizacao: 'D-04-10', ultimaMov: '2025-12-05', status: 'baixo' },
            { id: 'MAT-008', descricao: 'Cola Industrial', categoria: 'Químicos', unidade: 'L', qtdAtual: 12, qtdMinima: 10, qtdMaxima: 50, localizacao: 'E-03-02', ultimaMov: '2025-12-08', status: 'adequado' },
            { id: 'MAT-009', descricao: 'Plástico Bolha', categoria: 'Embalagens', unidade: 'M', qtdAtual: 0, qtdMinima: 100, qtdMaxima: 500, localizacao: 'C-02-04', ultimaMov: '2025-11-28', status: 'falta' },
            { id: 'MAT-010', descricao: 'Serra Circular 250mm', categoria: 'Ferramentas', unidade: 'UN', qtdAtual: 3, qtdMinima: 2, qtdMaxima: 10, localizacao: 'F-01-01', ultimaMov: '2025-12-01', status: 'adequado' },
            { id: 'MAT-011', descricao: 'Óleo de Corte', categoria: 'Lubrificantes', unidade: 'L', qtdAtual: 85, qtdMinima: 50, qtdMaxima: 200, localizacao: 'E-04-05', ultimaMov: '2025-12-09', status: 'adequado' },
            { id: 'MAT-012', descricao: 'Borracha Vedação', categoria: 'Componentes', unidade: 'M', qtdAtual: 25, qtdMinima: 30, qtdMaxima: 150, localizacao: 'B-03-07', ultimaMov: '2025-12-04', status: 'baixo' },
            { id: 'MAT-013', descricao: 'Fita Adesiva 48mm', categoria: 'Embalagens', unidade: 'UN', qtdAtual: 120, qtdMinima: 50, qtdMaxima: 300, localizacao: 'C-03-09', ultimaMov: '2025-12-07', status: 'adequado' },
            { id: 'MAT-014', descricao: 'Solda MIG/MAG', categoria: 'Consumíveis', unidade: 'KG', qtdAtual: 45, qtdMinima: 30, qtdMaxima: 150, localizacao: 'G-01-02', ultimaMov: '2025-12-08', status: 'adequado' },
            { id: 'MAT-015', descricao: 'Disco de Corte 7"', categoria: 'Ferramentas', unidade: 'UN', qtdAtual: 8, qtdMinima: 20, qtdMaxima: 100, localizacao: 'F-02-03', ultimaMov: '2025-12-02', status: 'baixo' },
            { id: 'MAT-016', descricao: 'Graxa Industrial', categoria: 'Lubrificantes', unidade: 'KG', qtdAtual: 0, qtdMinima: 15, qtdMaxima: 60, localizacao: 'E-05-01', ultimaMov: '2025-11-25', status: 'falta' },
            { id: 'MAT-017', descricao: 'Eletrodo 3,25mm', categoria: 'Consumíveis', unidade: 'KG', qtdAtual: 67, qtdMinima: 40, qtdMaxima: 180, localizacao: 'G-02-04', ultimaMov: '2025-12-09', status: 'adequado' },
            { id: 'MAT-018', descricao: 'Broca HSS 6mm', categoria: 'Ferramentas', unidade: 'UN', qtdAtual: 15, qtdMinima: 10, qtdMaxima: 50, localizacao: 'F-03-05', ultimaMov: '2025-12-06', status: 'adequado' },
            { id: 'MAT-019', descricao: 'Estopa Industrial', categoria: 'Limpeza', unidade: 'KG', qtdAtual: 32, qtdMinima: 25, qtdMaxima: 100, localizacao: 'H-01-06', ultimaMov: '2025-12-08', status: 'adequado' },
            { id: 'MAT-020', descricao: 'Desengraxante', categoria: 'Químicos', unidade: 'L', qtdAtual: 18, qtdMinima: 20, qtdMaxima: 80, localizacao: 'E-06-03', ultimaMov: '2025-12-05', status: 'baixo' }
        ];
    }

    renderizarTabela() {
        const tbody = document.getElementById('estoqueTableBody');
        if (!tbody) return;

        const estoqueFiltrado = this.filtrarEstoquePorStatus();

        tbody.innerHTML = estoqueFiltrado.map(item => `
            <tr>
                <td><span class="codigo-item">${item.id}</span></td>
                <td><strong>${item.descricao}</strong></td>
                <td><span class="badge badge-${this.getCategoriaColor(item.categoria)}">${item.categoria}</span></td>
                <td>${item.unidade}</td>
                <td><strong>${item.qtdAtual}</strong></td>
                <td>${item.qtdMinima}</td>
                <td>${item.qtdMaxima}</td>
                <td>${item.localizacao}</td>
                <td>${this.formatarData(item.ultimaMov)}</td>
                <td><span class="status-badge status-${item.status}">${this.getStatusLabel(item.status)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action" title="Movimentar" onclick="estoqueManager.movimentar('${item.id}')">
                            <i class="fas fa-exchange-alt"></i>
                        </button>
                        <button class="btn-action" title="Histórico" onclick="estoqueManager.verHistorico('${item.id}')">
                            <i class="fas fa-history"></i>
                        </button>
                        <button class="btn-action" title="Editar" onclick="estoqueManager.editar('${item.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getCategoriaColor(categoria) {
        const cores = {
            'Matéria Prima': 'blue',
            'Componentes': 'purple',
            'Embalagens': 'green',
            'Fixação': 'orange',
            'Acabamento': 'red',
            'Ferramentas': 'orange',
            'Químicos': 'red',
            'Lubrificantes': 'blue',
            'Consumíveis': 'purple',
            'Limpeza': 'green'
        };
        return cores[categoria] || 'gray';
    }

    getStatusLabel(status) {
        const labels = {
            'adequado': 'Adequado',
            'baixo': 'Estoque Baixo',
            'falta': 'Em Falta'
        };
        return labels[status] || status;
    }

    filtrarEstoquePorStatus() {
        if (this.filtroAtual === 'todos') {
            return this.estoque;
        }
        return this.estoque.filter(item => item.status === this.filtroAtual);
    }

    movimentar(id) {
        alert(`Registrar movimentação para item ${id}\n\nFuncionalidade em desenvolvimento.`);
    }

    verHistorico(id) {
        const item = this.estoque.find(e => e.id === id);
        if (item) {
            alert(`Histórico de Movimentações\n\nItem: ${item.descricao}\nCódigo: ${item.id}\n\nFuncionalidade em desenvolvimento.`);
        }
    }

    editar(id) {
        alert(`Editar item ${id}\n\nFuncionalidade em desenvolvimento.`);
    }

    formatarData(data) {
        return new Date(data).toLocaleDateString('pt-BR');
    }

    inicializarUsuario() {
        const usuario = JSON.parse(localStorage.getItem('usuarioLogado')) || {
            nome: 'Administrador',
            cargo: 'Administrador',
            avatar: null
        };

        const userGreeting = document.getElementById('userGreeting');
        const userRole = document.getElementById('userRole');
        const userAvatar = document.getElementById('userAvatar');

        if (userGreeting) {
            const hora = new Date().getHours();
            let saudacao = 'Olá';
            if (hora < 12) saudacao = 'Bom dia';
            else if (hora < 18) saudacao = 'Boa tarde';
            else saudacao = 'Boa noite';
            
            userGreeting.textContent = `${saudacao}, ${usuario.nome.split(' ')[0]}`;
        }

        if (userRole) userRole.textContent = usuario.cargo;
        if (userAvatar && usuario.avatar) {
            userAvatar.innerHTML = `<img src="${usuario.avatar}" alt="${usuario.nome}">`;
        }
    }
}

// Funções globais
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    const btn = document.getElementById('btnModoEscuro');
    btn.querySelector('i').className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

function toggleView(mode) {
    const btnGrid = document.getElementById('btnViewGrid');
    const btnList = document.getElementById('btnViewList');
    
    if (mode === 'grid') {
        btnGrid.classList.add('active');
        btnList.classList.remove('active');
    } else {
        btnList.classList.add('active');
        btnGrid.classList.remove('active');
    }
}

function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    menu.classList.toggle('show');
}

function filterByStatus(status) {
    estoqueManager.filtroAtual = status;
    estoqueManager.renderizarTabela();
    
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.filter-btn').classList.add('active');
}

function filtrarEstoque() {
    const searchTerm = document.getElementById('searchEstoque').value.toLowerCase();
    const rows = document.querySelectorAll('#estoqueTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function openMovimentacaoModal() {
    alert('Abrir modal de movimentação\n\nFuncionalidade em desenvolvimento.');
}

function exportarEstoque() {
    alert('Exportar estoque\n\nFuncionalidade em desenvolvimento.');
}

function imprimirEstoque() {
    window.print();
}

// Inicializar
let estoqueManager;
document.addEventListener('DOMContentLoaded', () => {
    estoqueManager = new EstoqueManager();
    
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('btnModoEscuro');
        if (btn) btn.querySelector('i').className = 'fas fa-sun';
    }
});

document.addEventListener('click', (e) => {
    const userProfile = document.querySelector('.user-profile');
    const userMenu = document.getElementById('userMenu');
    if (userMenu && !userProfile.contains(e.target)) {
        userMenu.classList.remove('show');
    }
});
