/**
 * SISTEMA DE CONTROLE DE ACESSO - MÓDULO FINANCEIRO ALUFORCE
 * 
 * Integração com o sistema de autenticação do painel de controle
 * Usa o usuário já logação no sistema principal
 */

// =============================================================================
// DEFINIÇÉO DE PERMISSÕES POR USUÁRIO
// =============================================================================

const PERMISSOES_FINANCEIRO = {
    // Administraçãores - Acesso total ao módulo financeiro
    'ti': {
        nome: 'TI',
        perfil: 'admin',
        permissoes: ['*'] // Acesso total
    },
    'douglas': {
        nome: 'Douglas',
        perfil: 'admin',
        permissoes: ['*']
    },
    'andreia': {
        nome: 'Andreia',
        perfil: 'admin',
        permissoes: ['*']
    },

    // Hellen - Apenas Contas a Pagar
    'hellen': {
        nome: 'Hellen',
        perfil: 'contas_pagar',
        permissoes: [
            'dashboard.visualizar',           // Pode ver dashboard
            'contas_pagar.visualizar',        // Ver contas a pagar
            'contas_pagar.criar',             // Criar contas a pagar
            'contas_pagar.editar',            // Editar contas a pagar
            'contas_pagar.excluir',           // Excluir contas a pagar
            'contas_pagar.pagar',             // Realizar pagamentos
            'fornecedores.visualizar',        // Ver fornecedores
            'fornecedores.criar',             // Criar fornecedores
            'fornecedores.editar',            // Editar fornecedores
            'contas_bancarias.visualizar',    // Ver contas bancárias
            'conciliacao.visualizar',         // Ver conciliação bancária
            'anexos.visualizar',              // Ver anexos
            'anexos.upload',                  // Fazer upload de anexos
            'categorias.visualizar',          // Ver categorias
            'centros_custo.visualizar',       // Ver centros de custo
            'parcelamento.visualizar',        // Ver parcelamentos
            'relatórios.contas_pagar'         // Relatórios de contas a pagar
        ]
    },

    // Junior (Eldir) - Apenas Contas a Receber
    'junior': {
        nome: 'Junior (Eldir)',
        perfil: 'contas_receber',
        permissoes: [
            'dashboard.visualizar',           // Pode ver dashboard
            'contas_receber.visualizar',      // Ver contas a receber
            'contas_receber.criar',           // Criar contas a receber
            'contas_receber.editar',          // Editar contas a receber
            'contas_receber.excluir',         // Excluir contas a receber
            'contas_receber.receber',         // Realizar recebimentos
            'clientes.visualizar',            // Ver clientes
            'clientes.criar',                 // Criar clientes
            'clientes.editar',                // Editar clientes
            'contas_bancarias.visualizar',    // Ver contas bancárias
            'conciliacao.visualizar',         // Ver conciliação bancária
            'anexos.visualizar',              // Ver anexos
            'anexos.upload',                  // Fazer upload de anexos
            'categorias.visualizar',          // Ver categorias
            'centros_custo.visualizar',       // Ver centros de custo
            'parcelamento.visualizar',        // Ver parcelamentos
            'relatórios.contas_receber'       // Relatórios de contas a receber
        ]
    },

    // Também permitir com nome "eldir"
    'eldir': {
        nome: 'Junior (Eldir)',
        perfil: 'contas_receber',
        permissoes: [
            'dashboard.visualizar',
            'contas_receber.visualizar',
            'contas_receber.criar',
            'contas_receber.editar',
            'contas_receber.excluir',
            'contas_receber.receber',
            'clientes.visualizar',
            'clientes.criar',
            'clientes.editar',
            'contas_bancarias.visualizar',
            'conciliacao.visualizar',
            'anexos.visualizar',
            'anexos.upload',
            'categorias.visualizar',
            'centros_custo.visualizar',
            'parcelamento.visualizar',
            'relatórios.contas_receber'
        ]
    }
};

// Definição de perfis
const PERFIS = {
    'admin': {
        nome: 'Administraçãor',
        descricao: 'Acesso total ao módulo financeiro',
        cor: '#e74c3c'
    },
    'contas_pagar': {
        nome: 'Contas a Pagar',
        descricao: 'Acesso apenas a contas a pagar e fornecedores',
        cor: '#e67e22'
    },
    'contas_receber': {
        nome: 'Contas a Receber',
        descricao: 'Acesso apenas a contas a receber e clientes',
        cor: '#27ae60'
    }
};

// =============================================================================
// CLASSE PRINCIPAL DE CONTROLE DE ACESSO
// =============================================================================

class SistemaAutenticacao {
    constructor() {
        this.usuarioAtual = null;
        this.carregarUsuarioLogação();
    }

    /**
     * Carrega usuário logação do painel de controle Aluforce
     */
    carregarUsuarioLogação() {
        // Tenta pegar o usuário do sessionStorage do painel de controle
        let usuarioSistema = null;
        
        // Método 1: SessionStorage do sistema principal
        const sessaoPrincipal = sessionStorage.getItem('usuario_logação') || 
                                sessionStorage.getItem('user') ||
                                sessionStorage.getItem('currentUser');
        
        // Método 2: LocalStorage do sistema principal
        const localPrincipal = localStorage.getItem('usuario_logação') ||
                               localStorage.getItem('user') ||
                               localStorage.getItem('currentUser');

        // Tenta parsear a sessão
        try {
            if (sessaoPrincipal) {
                usuarioSistema = JSON.parse(sessaoPrincipal);
            } else if (localPrincipal) {
                usuarioSistema = JSON.parse(localPrincipal);
            }
        } catch (e) {
            // Se não for JSON, pode ser apenas o nome do usuário
            usuarioSistema = { usuario: sessaoPrincipal || localPrincipal };
        }

        // Se não encontrou usuário, verifica se há variável global
        if (!usuarioSistema && typeof window.usuarioLogação !== 'undefined') {
            usuarioSistema = window.usuarioLogação;
        }

        // Se não encontrou de jeito nenhum, usa um usuário padrão para desenvolvimento
        if (!usuarioSistema) {
            console.warn('⚠️ Usuário não encontrado no sistema principal. Usando modo de desenvolvimento.');
            // TODO: Remover em produção - apenas para desenvolvimento
            usuarioSistema = { usuario: 'ti', nome: 'TI (Dev Mode)' };
        }

        // Normaliza o nome do usuário
        const usuarioNome = (usuarioSistema.usuario || usuarioSistema.nome || usuarioSistema.login || '').toLowerCase().trim();

        // Busca as permissões deste usuário no módulo financeiro
        const permissoesUsuario = PERMISSOES_FINANCEIRO[usuarioNome];

        if (!permissoesUsuario) {
            console.error(`❌ Usuário "${usuarioNome}" não tem permissões configuradas para o módulo financeiro`);
            this.usuarioAtual = null;
            return;
        }

        // Configura o usuário atual com as permissões
        this.usuarioAtual = {
            usuario: usuarioNome,
            nome: permissoesUsuario.nome || usuarioSistema.nome || usuarioNome,
            perfil: permissoesUsuario.perfil,
            permissoes: permissoesUsuario.permissoes,
            sistemaOriginal: usuarioSistema // Mantém dados originais do sistema
        };

        // Log de acesso
        this.registrarLog('acesso_modulo', `Usuário ${this.usuarioAtual.nome} acessou o módulo financeiro`);

        console.log('✅ Usuário carregação:', this.usuarioAtual.nome, '| Perfil:', this.usuarioAtual.perfil);
    }

    /**
     * Recarrega permissões do usuário
     */
    recarregarPermissoes() {
        this.carregarUsuarioLogação();
    }

    /**
     * Logout redireciona para o painel principal
     */
    logout() {
        if (this.usuarioAtual) {
            this.registrarLog('logout', `Usuário ${this.usuarioAtual.nome} saiu do módulo financeiro`);
        }

        // Redireciona para o painel principal ao invés de fazer logout do sistema
        window.location.href = '../index.html'; // ou '/painel' ou a URL do seu painel
    }

    /**
     * Verifica se usuário está autenticação
     */
    estaAutenticação() {
        return this.usuarioAtual !== null;
    }

    /**
     * Obtém usuário atual
     */
    getUsuario() {
        return this.usuarioAtual;
    }

    /**
     * Verifica se usuário é admin
     */
    isAdmin() {
        return this.usuarioAtual && this.usuarioAtual.perfil === 'admin';
    }

    /**
     * Verifica se usuário tem permissão específica
     */
    temPermissao(permissao) {
        if (!this.usuarioAtual) {
            return false;
        }

        // Admins têm acesso total
        if (this.usuarioAtual.permissoes.includes('*')) {
            return true;
        }

        // Verifica permissão específica
        return this.usuarioAtual.permissoes.includes(permissao);
    }

    /**
     * Verifica se usuário tem qualquer uma das permissões
     */
    temQualquerPermissao(permissoes) {
        return permissoes.some(p => this.temPermissao(p));
    }

    /**
     * Verifica se usuário tem todas as permissões
     */
    temTodasPermissoes(permissoes) {
        return permissoes.every(p => this.temPermissao(p));
    }

    /**
     * Obtém perfil do usuário
     */
    getPerfil() {
        if (!this.usuarioAtual) {
            return null;
        }
        return PERFIS[this.usuarioAtual.perfil];
    }

    /**
     * Atualiza nome de exibição do usuário
     */
    atualizarNomeExibicao(novoNome) {
        if (this.usuarioAtual) {
            this.usuarioAtual.nome = novoNome;
        }
    }

    /**
     * Registra log de auditoria
     */
    registrarLog(tipo, mensagem) {
        const log = {
            timestamp: new Date().toISOString(),
            tipo: tipo,
            usuario: this.usuarioAtual ? this.usuarioAtual.nome : 'Sistema',
            mensagem: mensagem
        };

        // Salvar logs no localStorage (limitação aos últimos 100)
        let logs = JSON.parse(localStorage.getItem('logs_auditoria_financeiro') || '[]');
        logs.unshift(log);
        logs = logs.slice(0, 100); // Manter apenas últimos 100
        localStorage.setItem('logs_auditoria_financeiro', JSON.stringify(logs));

        console.log('[AUDITORIA]', log);
    }

    /**
     * Obtém logs de auditoria
     */
    getLogs(limite = 50) {
        const logs = JSON.parse(localStorage.getItem('logs_auditoria_financeiro') || '[]');
        return logs.slice(0, limite);
    }

    /**
     * Protege página - verifica se usuário tem permissão
     */
    protegerPagina(permissoesRequeridas = []) {
        // Verifica se está autenticação
        if (!this.estaAutenticação()) {
            this.redirecionarParaPainel();
            return false;
        }

        // Se não há permissões específicas, apenas estar autenticação é suficiente
        if (permissoesRequeridas.length === 0) {
            return true;
        }

        // Verifica permissões
        if (!this.temQualquerPermissao(permissoesRequeridas)) {
            this.mostrarAcessoNegação();
            return false;
        }

        return true;
    }

    /**
     * Redireciona para painel de controle principal
     */
    redirecionarParaPainel() {
        alert('⚠️ Você precisa estar logação no sistema para acessar o módulo financeiro.');
        window.location.href = '../index.html'; // ou '/painel' ou a URL do seu painel
    }

    /**
     * Mostra mensagem de acesso negação
     */
    mostrarAcessoNegação() {
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: 'Segoe UI', sans-serif;">
                <div style="background: white; padding: 40px; border-radius: 15px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; max-width: 500px;">
                    <i class="fas fa-ban" style="font-size: 80px; color: #e74c3c; margin-bottom: 20px;"></i>
                    <h1 style="color: #2c3e50; margin-bottom: 10px;">Acesso Negado</h1>
                    <p style="color: #7f8c8d; margin-bottom: 30px;">
                        Você não tem permissão para acessar está página.
                    </p>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
                        <strong>Usuário:</strong> ${this.usuarioAtual.nome}<br>
                        <strong>Perfil:</strong> ${this.getPerfil().nome}
                    </div>
                    <button onclick="window.location.href='dashboard.html'" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 30px; border-radius: 25px; cursor: pointer; font-size: 16px; font-weight: 600;">
                        <i class="fas fa-home"></i> Ir para Dashboard
                    </button>
                    <button onclick="auth.logout()" style="background: #95a5a6; color: white; border: none; padding: 12px 30px; border-radius: 25px; cursor: pointer; font-size: 16px; font-weight: 600; margin-left: 10px;">
                        <i class="fas fa-arrow-left"></i> Voltar ao Painel
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Oculta elementos da interface baseado em permissões
     */
    aplicarPermissoesUI() {
        // Elementos que requerem permissões específicas
        document.querySelectorAll('[data-permissao]').forEach(elemento => {
            const permissao = elemento.getAttribute('data-permissao');
            if (!this.temPermissao(permissao)) {
                elemento.style.display = 'none';
            }
        });

        // Elementos que requerem qualquer uma das permissões
        document.querySelectorAll('[data-permissoes-ou]').forEach(elemento => {
            const permissoes = elemento.getAttribute('data-permissoes-ou').split(',');
            if (!this.temQualquerPermissao(permissoes)) {
                elemento.style.display = 'none';
            }
        });

        // Elementos que requerem todas as permissões
        document.querySelectorAll('[data-permissoes-e]').forEach(elemento => {
            const permissoes = elemento.getAttribute('data-permissoes-e').split(',');
            if (!this.temTodasPermissoes(permissoes)) {
                elemento.style.display = 'none';
            }
        });

        // Elementos apenas para admin
        document.querySelectorAll('[data-admin-only]').forEach(elemento => {
            if (!this.isAdmin()) {
                elemento.style.display = 'none';
            }
        });

        // Mostrar informações do usuário logação
        this.mostrarInfoUsuario();
    }

    /**
     * Mostra informações do usuário na interface
     */
    mostrarInfoUsuario() {
        const usuarioInfo = document.getElementById('usuario-logação');
        if (usuarioInfo && this.usuarioAtual) {
            const perfil = this.getPerfil();
            usuarioInfo.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 35px; height: 35px; border-radius: 50%; background: ${perfil.cor}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                        ${this.usuarioAtual.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight: 600; font-size: 14px;">${this.usuarioAtual.nome}</div>
                        <div style="font-size: 11px; color: #7f8c8d;">${perfil.nome}</div>
                    </div>
                    <button onclick="auth.logout()" style="background: #95a5a6; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin-left: 10px;" title="Voltar ao Painel">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                </div>
            `;
        }
    }

    /**
     * Filtra dados baseado em permissões
     */
    filtrarDaçãosPorPermissao(dados, tipoDação) {
        // Admins veem tudo
        if (this.isAdmin()) {
            return dados;
        }

        // Filtros por perfil
        switch (this.usuarioAtual.perfil) {
            case 'contas_pagar':
                // Hellen vê apenas contas a pagar
                if (tipoDação === 'contas') {
                    return dados.filter(item => item.tipo === 'pagar');
                }
                break;

            case 'contas_receber':
                // Junior vê apenas contas a receber
                if (tipoDação === 'contas') {
                    return dados.filter(item => item.tipo === 'receber');
                }
                break;
        }

        return dados;
    }
}

// =============================================================================
// INSTÂNCIA GLOBAL
// =============================================================================

const auth = new SistemaAutenticacao();

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Verifica permissão e executa ação
 */
function executarComPermissao(permissao, acao, mensagemErro = 'Você não tem permissão para está ação') {
    if (auth.temPermissao(permissao)) {
        acao();
    } else {
        alert(mensagemErro);
        auth.registrarLog('acesso_negação', `Tentativa de acesso sem permissão: ${permissao}`);
    }
}

/**
 * Decorator para funções que requerem permissão
 */
function requerPermissao(permissao) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function(...args) {
            if (auth.temPermissao(permissao)) {
                return originalMethod.apply(this, args);
            } else {
                alert('Você não tem permissão para está ação');
                auth.registrarLog('acesso_negação', `Tentativa de execução sem permissão: ${permissao}`);
                return null;
            }
        };
        return descriptor;
    };
}

// =============================================================================
// INICIALIZAÇÉO AUTOMÁTICA
// =============================================================================

// Aplicar permissões quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (auth.estaAutenticação()) {
            auth.aplicarPermissoesUI();
        }
    });
} else {
    if (auth.estaAutenticação()) {
        auth.aplicarPermissoesUI();
    }
}

// Exportar para uso global
window.auth = auth;
window.executarComPermissao = executarComPermissao;
window.requerPermissao = requerPermissao;
window.PERMISSOES_FINANCEIRO = PERMISSOES_FINANCEIRO;
window.PERFIS = PERFIS;

console.log('✅ Sistema de Controle de Acesso Financeiro carregação');
