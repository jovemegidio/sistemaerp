// ===== SISTEMA DE NOTIFICAÇÕES - ALUFORCE FINANCEIRO =====

class SistemaNotificacoes {
    constructor() {
        this.notificacoes = [];
        this.intervaloVerificacao = 60000; // 1 minuto
        this.inicializar();
    }

    async inicializar() {
        await this.carregarNotificacoes();
        this.iniciarVerificacaoAutomatica();
        this.criarWidgetNotificacoes();
    }

    // ===== CARREGAR NOTIFICAÇÕES =====
    async carregarNotificacoes() {
        try {
            // TODO: Substituir por chamada real à API
            // const response = await fetch('/api/financeiro/notificacoes');
            // this.notificacoes = await response.json();
            
            // Mock para desenvolvimento
            this.notificacoes = this.gerarNotificacoesMock();
            this.atualizarBadge();
            
        } catch (error) {
            console.error('❌ Erro ao carregar notificações:', error);
        }
    }

    gerarNotificacoesMock() {
        const hoje = new Date();
        const amanha = new Date(hoje);
        amanha.setDate(hoje.getDate() + 1);
        
        return [
            {
                id: 1,
                tipo: 'VENCIMENTO',
                titulo: 'Conta vencendo amanhã',
                mensagem: 'Energisa - R$ 1.850,75 vence em ' + amanha.toLocaleDateString('pt-BR'),
                icone: 'fa-exclamation-triangle',
                cor: 'warning',
                lida: false,
                link: 'gestão_completa.html',
                data_criacao: new Date()
            },
            {
                id: 2,
                tipo: 'ATRASO',
                titulo: '3 contas atrasadas',
                mensagem: 'Você possui 3 contas em atraso totalizando R$ 12.450,00',
                icone: 'fa-times-circle',
                cor: 'danger',
                lida: false,
                link: 'gestão_completa.html',
                data_criacao: new Date()
            },
            {
                id: 3,
                tipo: 'SALDO_BAIXO',
                titulo: 'Saldo baixo',
                mensagem: 'Conta Banco do Brasil está com saldo de R$ 2.500,00',
                icone: 'fa-wallet',
                cor: 'warning',
                lida: false,
                link: 'contas_bancarias.html',
                data_criacao: new Date()
            }
        ];
    }

    // ===== VERIFICAÇÉO AUTOMÁTICA =====
    async iniciarVerificacaoAutomatica() {
        setInterval(async () => {
            await this.verificarContasVencendo();
            await this.verificarContasAtrasadas();
            await this.verificarSaldoBaixo();
            await this.verificarOrcamentoEstouração();
        }, this.intervaloVerificacao);
    }

    async verificarContasVencendo() {
        // TODO: Implementar verificação real com API
        const hoje = new Date();
        const próximosDias = 7;
        
        // Simular verificação
        console.log('🔍 Verificando contas vencendo nos próximos', próximosDias, 'dias...');
    }

    async verificarContasAtrasadas() {
        // TODO: Implementar verificação real com API
        console.log('🔍 Verificando contas atrasadas...');
    }

    async verificarSaldoBaixo() {
        // TODO: Implementar verificação real com API
        console.log('🔍 Verificando saldos bancários...');
    }

    async verificarOrcamentoEstouração() {
        // TODO: Implementar verificação real com API
        console.log('🔍 Verificando orçamentos...');
    }

    // ===== CRIAR NOTIFICAÇÉO =====
    async criar(tipo, titulo, mensagem, daçãos = {}) {
        const notificação = {
            id: Date.now(),
            tipo: tipo,
            titulo: titulo,
            mensagem: mensagem,
            icone: this.obterIcone(tipo),
            cor: this.obterCor(tipo),
            lida: false,
            link: daçãos.link || null,
            daçãos_extra: daçãos,
            data_criacao: new Date()
        };

        try {
            // TODO: Salvar na API
            // await fetch('/api/financeiro/notificacoes', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(notificação)
            // });

            this.notificacoes.unshift(notificação);
            this.atualizarBadge();
            this.mostrarToast(notificação);

        } catch (error) {
            console.error('❌ Erro ao criar notificação:', error);
        }
    }

    // ===== MARCAR COMO LIDA =====
    async marcarComoLida(id) {
        try {
            // TODO: Atualizar na API
            // await fetch(`/api/financeiro/notificacoes/${id}`, {
            //     method: 'PATCH',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ lida: true })
            // });

            const notificação = this.notificacoes.find(n => n.id === id);
            if (notificação) {
                notificação.lida = true;
                this.atualizarBadge();
            }

        } catch (error) {
            console.error('❌ Erro ao marcar notificação como lida:', error);
        }
    }

    async marcarTodasComoLidas() {
        try {
            // TODO: Atualizar todas na API
            this.notificacoes.forEach(n => n.lida = true);
            this.atualizarBadge();

        } catch (error) {
            console.error('❌ Erro ao marcar todas como lidas:', error);
        }
    }

    // ===== UI =====
    criarWidgetNotificacoes() {
        const widget = document.createElement('div');
        widget.id = 'notificacoes-widget';
        widget.innerHTML = `
            <button class="notificacoes-btn" onclick="notificacoes.toggle()">
                <i class="fas fa-bell"></i>
                <span class="notificacoes-badge" id="notificacoes-badge">0</span>
            </button>
            
            <div class="notificacoes-panel" id="notificacoes-panel">
                <div class="notificacoes-header">
                    <h3><i class="fas fa-bell"></i> Notificações</h3>
                    <button class="marcar-todas-lidas" onclick="notificacoes.marcarTodasComoLidas()">
                        <i class="fas fa-check-double"></i> Marcar todas como lidas
                    </button>
                </div>
                <div class="notificacoes-lista" id="notificacoes-lista">
                    <!-- Preenchido dinamicamente -->
                </div>
            </div>
        `;
        
        document.body.appendChild(widget);
        this.atualizarLista();
        this.adicionarEstilos();
    }

    toggle() {
        const panel = document.getElementById('notificacoes-panel');
        panel.classList.toggle('show');
        
        if (panel.classList.contains('show')) {
            this.atualizarLista();
        }
    }

    atualizarBadge() {
        const naoLidas = this.notificacoes.filter(n => !n.lida).length;
        const badge = document.getElementById('notificacoes-badge');
        
        if (badge) {
            badge.textContent = naoLidas;
            badge.style.display = naoLidas > 0 ? 'flex' : 'none';
        }
    }

    atualizarLista() {
        const lista = document.getElementById('notificacoes-lista');
        if (!lista) return;

        if (this.notificacoes.length === 0) {
            lista.innerHTML = `
                <div class="notificação-vazia">
                    <i class="fas fa-check-circle"></i>
                    <p>Nenhuma notificação</p>
                </div>
            `;
            return;
        }

        lista.innerHTML = this.notificacoes.map(n => `
            <div class="notificação-item ${n.lida ? 'lida' : ''}" onclick="notificacoes.clicar(${n.id})">
                <div class="notificação-icon ${n.cor}">
                    <i class="fas ${n.icone}"></i>
                </div>
                <div class="notificação-content">
                    <div class="notificação-titulo">${n.titulo}</div>
                    <div class="notificação-mensagem">${n.mensagem}</div>
                    <div class="notificação-data">${this.formatarDataRelativa(n.data_criacao)}</div>
                </div>
                ${!n.lida ? '<div class="notificação-bolinha"></div>' : ''}
            </div>
        `).join('');
    }

    async clicar(id) {
        const notificação = this.notificacoes.find(n => n.id === id);
        if (!notificação) return;

        await this.marcarComoLida(id);
        this.atualizarLista();

        if (notificação.link) {
            window.location.href = notificação.link;
        }
    }

    mostrarToast(notificação) {
        const toast = document.createElement('div');
        toast.className = `notificação-toast ${notificação.cor}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${notificação.icone}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-titulo">${notificação.titulo}</div>
                <div class="toast-mensagem">${notificação.mensagem}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    // ===== UTILIDADES =====
    obterIcone(tipo) {
        const icones = {
            'VENCIMENTO': 'fa-exclamation-triangle',
            'ATRASO': 'fa-times-circle',
            'SALDO_BAIXO': 'fa-wallet',
            'ORCAMENTO': 'fa-chart-pie',
            'SUCESSO': 'fa-check-circle',
            'INFO': 'fa-info-circle'
        };
        return icones[tipo] || 'fa-bell';
    }

    obterCor(tipo) {
        const cores = {
            'VENCIMENTO': 'warning',
            'ATRASO': 'danger',
            'SALDO_BAIXO': 'warning',
            'ORCAMENTO': 'danger',
            'SUCESSO': 'success',
            'INFO': 'info'
        };
        return cores[tipo] || 'info';
    }

    formatarDataRelativa(data) {
        const agora = new Date();
        const dataNotificacao = new Date(data);
        const diffMs = agora - dataNotificacao;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHoras = Math.floor(diffMs / 3600000);
        const diffDias = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `Há ${diffMins} min`;
        if (diffHoras < 24) return `Há ${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
        if (diffDias < 7) return `Há ${diffDias} dia${diffDias > 1 ? 's' : ''}`;
        
        return dataNotificacao.toLocaleDateString('pt-BR');
    }

    adicionarEstilos() {
        const style = document.createElement('style');
        style.textContent = `
            #notificacoes-widget {
                position: fixed;
                top: 20px;
                right: 80px;
                z-index: 9998;
            }

            .notificacoes-btn {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: white;
                border: none;
                box-shaçãow: 0 4px 12px rgba(0,0,0,0.15);
                cursor: pointer;
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }

            .notificacoes-btn:hover {
                transform: scale(1.1);
                box-shaçãow: 0 6px 16px rgba(0,0,0,0.2);
            }

            .notificacoes-btn i {
                font-size: 20px;
                color: #374151;
            }

            .notificacoes-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                background: #ef4444;
                color: white;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                font-size: 11px;
                font-weight: 700;
                display: none;
                align-items: center;
                justify-content: center;
                border: 2px solid white;
            }

            .notificacoes-panel {
                position: absolute;
                top: 60px;
                right: 0;
                width: 400px;
                max-height: 600px;
                background: white;
                border-radius: 16px;
                box-shaçãow: 0 8px 24px rgba(0,0,0,0.2);
                display: none;
                flex-direction: column;
                overflow: hidden;
            }

            .notificacoes-panel.show {
                display: flex;
            }

            .notificacoes-header {
                padding: 20px 24px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .notificacoes-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 700;
                color: #1f2937;
            }

            .marcar-todas-lidas {
                background: none;
                border: none;
                color: #3b82f6;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                padding: 6px 12px;
                border-radius: 6px;
                transition: all 0.2s;
            }

            .marcar-todas-lidas:hover {
                background: #dbeafe;
            }

            .notificacoes-lista {
                overflow-y: auto;
                max-height: 500px;
            }

            .notificação-item {
                padding: 16px 24px;
                border-bottom: 1px solid #f3f4f6;
                display: flex;
                gap: 12px;
                cursor: pointer;
                transition: all 0.2s;
                position: relative;
            }

            .notificação-item:hover {
                background: #f9fafb;
            }

            .notificação-item.lida {
                opacity: 0.6;
            }

            .notificação-icon {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .notificação-icon.warning {
                background: #fef3c7;
                color: #d97706;
            }

            .notificação-icon.danger {
                background: #fee2e2;
                color: #dc2626;
            }

            .notificação-icon.success {
                background: #d1fae5;
                color: #059669;
            }

            .notificação-icon.info {
                background: #dbeafe;
                color: #2563eb;
            }

            .notificação-content {
                flex: 1;
            }

            .notificação-titulo {
                font-size: 14px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 4px;
            }

            .notificação-mensagem {
                font-size: 13px;
                color: #64748b;
                margin-bottom: 6px;
            }

            .notificação-data {
                font-size: 11px;
                color: #94a3b8;
            }

            .notificação-bolinha {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #3b82f6;
                position: absolute;
                right: 20px;
                top: 50%;
                transform: translateY(-50%);
            }

            .notificação-vazia {
                text-align: center;
                padding: 60px 20px;
                color: #94a3b8;
            }

            .notificação-vazia i {
                font-size: 48px;
                margin-bottom: 16px;
                color: #cbd5e1;
            }

            .notificação-toast {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 400px;
                background: white;
                border-radius: 12px;
                padding: 16px 20px;
                box-shaçãow: 0 8px 24px rgba(0,0,0,0.2);
                display: flex;
                gap: 12px;
                align-items: flex-start;
                transform: translateX(500px);
                transition: transform 0.3s ease;
                z-index: 10000;
                border-left: 4px solid;
            }

            .notificação-toast.show {
                transform: translateX(0);
            }

            .notificação-toast.warning {
                border-left-color: #f59e0b;
            }

            .notificação-toast.danger {
                border-left-color: #ef4444;
            }

            .notificação-toast.success {
                border-left-color: #10b981;
            }

            .notificação-toast.info {
                border-left-color: #3b82f6;
            }

            .toast-icon {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
            }

            .notificação-toast.warning .toast-icon {
                background: #fef3c7;
                color: #d97706;
            }

            .notificação-toast.danger .toast-icon {
                background: #fee2e2;
                color: #dc2626;
            }

            .notificação-toast.success .toast-icon {
                background: #d1fae5;
                color: #059669;
            }

            .notificação-toast.info .toast-icon {
                background: #dbeafe;
                color: #2563eb;
            }

            .toast-content {
                flex: 1;
            }

            .toast-titulo {
                font-size: 14px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 4px;
            }

            .toast-mensagem {
                font-size: 13px;
                color: #64748b;
            }

            .toast-close {
                background: none;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                font-size: 16px;
                padding: 4px;
            }

            .toast-close:hover {
                color: #374151;
            }
        `;
        document.head.appendChild(style);
    }
}

// Inicializar sistema de notificações globalmente
let notificacoes;
document.addEventListener('DOMContentLoaded', function() {
    notificacoes = new SistemaNotificacoes();
});
