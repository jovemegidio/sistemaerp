/* ========================================= */
/* INICIALIZAÇÁO DO SISTEMA ADMINISTRATIVO */
/* ========================================= */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Sistema Administrativo Aluforce...');
    
    // Aguardar carregamento completo
    setTimeout(function() {
        // Verificar se headerControls existe
        if (typeof window.headerControls !== 'undefined') {
            console.log('✅ Header Controls carregação');
            
            // Carregar dashboard por padrão
            loadPage('dashboard');
            
            // Sistema carregação (sem notificações automáticas)
            console.log('✅ Sistema Aluforce RH iniciação com sucesso!');
            
        } else {
            console.warn('⚠️ Header Controls não encontrado, tentando novamente...');
            
            // Tentar novamente após 1 segundo
            setTimeout(() => {
                if (typeof window.headerControls !== 'undefined') {
                    loadPage('dashboard');
                    console.log('✅ Header Controls carregação com sucesso');
                } else {
                    console.error('❌ Erro: Header Controls não pôde ser carregação');
                }
            }, 1000);
        }
        
        // Verificar se a função loadPage existe
        if (typeof loadPage === 'function') {
            console.log('✅ Sistema de páginas carregação');
        } else {
            console.error('❌ Erro: Sistema de páginas não encontrado');
        }
        
    }, 500);
});

// Adicionar listener para clicks nos links do menu
document.addEventListener('click', function(e) {
    const link = e.target.closest('.nav-link');
    if (link && !link.classList.contains('logout-link')) {
        e.preventDefault();
        
        // Remover active de todos
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        
        // Adicionar active no clicação
        link.classList.add('active');
    }
});

// Função para demonstrar mensagens (carta)
function showMessagesDemo() {
    if (window.headerControls) {
        window.headerControls.addNotification('Nova mensagem recebida!', 'info');
        window.headerControls.addNotification('Você tem 3 mensagens não lidas', 'warning');
        console.log('💌 Demonstração de mensagens executada');
    } else {
        console.warn('Sistema de mensagens não disponível');
    }
}

// Função para teste rápido do sistema
window.testSystem = function() {
    console.log('🧪 Testando sistema...');
    
    if (window.headerControls) {
        console.log('✅ Teste concluído: Sistema funcionando corretamente');
        console.log('ℹ️ Para testar notificações, clique no sino ou na carta');
    } else {
        console.error('❌ Teste falhou: headerControls não encontrado');
    }
};

console.log('🔧 Sistema de inicialização carregação');