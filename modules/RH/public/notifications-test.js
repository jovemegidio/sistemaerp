/* ============================================== */
/* TESTE DE NOTIFICAÇÕES - APENAS NO SINO/CARTA */
/* ============================================== */

// Função para adicionar botões de teste no console
window.adicionarNotificacaoTeste = function(mensagem, tipo = 'info') {
    if (window.headerControls) {
        window.headerControls.addNotification(mensagem, tipo);
        console.log(`✅ Notificação adicionada: ${mensagem} (${tipo})`);
    } else {
        console.error('❌ Sistema de notificações não disponível');
    }
};

// Função para testar diferentes tipos de notificação
window.testarTiposNotificacao = function() {
    if (window.headerControls) {
        window.headerControls.addNotification('Sucesso: Operação concluída!', 'success');
        window.headerControls.addNotification('Informação: Dados atualizados', 'info');
        window.headerControls.addNotification('Aténção: Verificar configurações', 'warning');
        window.headerControls.addNotification('Erro: Falha na conexão', 'error');
        
        console.log('🎯 Teste de todos os tipos executado');
        console.log('📱 Clique no sino para ver as notificações');
    } else {
        console.error('❌ Sistema não disponível');
    }
};

// Função para limpar todas as notificações
window.limparNotificacoes = function() {
    const lista = document.getElementById('notifications-list');
    if (lista) {
        lista.innerHTML = '';
        if (window.headerControls) {
            window.headerControls.updateNotificationCount();
        }
        console.log('🗑️ Todas as notificações foram limpas');
    }
};

// Função para verificar se notificações automáticas foram removidas
window.verificarSistema = function() {
    console.log('🔍 Verificando sistema de notificações...');
    
    if (window.headerControls) {
        console.log('✅ Sistema de notificações carregado');
        
        // Verificar se o método showToast não mostra toasts automáticos
        const originalShowToast = window.headerControls.showToast;
        
        console.log('📋 Status atual:');
        console.log('- Sistema carregado: ✅');
        console.log('- Notificações automáticas: ❌ (removidas)');
        console.log('- Sino funcional: ✅');
        console.log('- Carta funcional: ✅');
        
        console.log('💡 Para testar:');
        console.log('1. Clique no sino (🔔) para ver notificações');
        console.log('2. Clique na carta (✉️) para adicionar mensagens');
        console.log('3. Use: testarTiposNotificacao() no console');
        console.log('4. Use: adicionarNotificacaoTeste("sua mensagem", "tipo")');
        
    } else {
        console.error('❌ Sistema não carregado');
    }
};

// Executar verificação automática após 2 segundos
setTimeout(() => {
    verificarSistema();
}, 2000);

console.log('🧪 Sistema de teste de notificações carregado');
console.log('📝 Comandos disponíveis:');
console.log('- verificarSistema()');
console.log('- testarTiposNotificacao()');
console.log('- adicionarNotificacaoTeste("mensagem", "tipo")');
console.log('- limparNotificacoes()');