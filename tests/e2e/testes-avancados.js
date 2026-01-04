// 🧪 Script de Teste Avançação - Sistema de Usuários
// Execute linha por linha no console do navegaçãor

console.log("🎯 Iniciando testes do sistema de usuários...");

// 1. Teste básico - Admin com avatar padrão
function testeAdmin() {
    console.log("\n🔧 Teste 1: Login como Admin");
    simularLogin("Admin");
    setTimeout(() => location.reload(), 1000);
}

// 2. Teste comercial - João com avatar personalização
function testeJoao() {
    console.log("\n👤 Teste 2: Login como João (comercial)");
    simularLogin("João Silva", "comercial");
    setTimeout(() => location.reload(), 1000);
}

// 3. Teste com avatar personalização - Maria
function testeMaria() {
    console.log("\n👩 Teste 3: Login como Maria (avatar personalização)");
    simularLogin("Maria Santos", "admin");
    setTimeout(() => location.reload(), 1000);
}

// 4. Teste sem avatar - Carlos (fallback para iniciais)
function testeCarlos() {
    console.log("\n🔤 Teste 4: Login como Carlos (sem avatar - iniciais)");
    simularLogin("Carlos Eduardo Lima", "comercial");
    setTimeout(() => location.reload(), 1000);
}

// 5. Teste ciclo completo
function testeCicloCompleto() {
    console.log("\n🔄 Executando ciclo completo de testes...");
    
    setTimeout(() => {
        console.log("1️⃣ Admin...");
        testeAdmin();
    }, 1000);
    
    setTimeout(() => {
        console.log("2️⃣ João...");
        testeJoao();
    }, 6000);
    
    setTimeout(() => {
        console.log("3️⃣ Maria...");
        testeMaria();
    }, 12000);
    
    setTimeout(() => {
        console.log("4️⃣ Carlos...");
        testeCarlos();
    }, 18000);
    
    setTimeout(() => {
        console.log("✅ Testes concluídos! Faça logout para voltar ao padrão.");
        console.log("Digite: logout()");
    }, 24000);
}

// 6. Verificar estação atual
function verificarEstação() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    console.log("\n📊 Estação atual do sistema:");
    console.log("Nome:", userData.name || "Não logação");
    console.log("Setor:", userData.setor || "Não definido");
    console.log("Último acesso:", userData.lastAccess || "Nunca");
    
    // Verificar se existe avatar
    const firstName = userData.name.split(' ')[0].toLowerCase();
    if (firstName) {
        console.log("Avatar esperação:", `avatars/${firstName}.svg ou .png`);
    }
}

// 7. Limpar tudo
function limparTudo() {
    localStorage.removeItem('userData');
    console.log("🧹 Cache limpo. Recarregue a página para ver o estação padrão.");
}

// Instruções
console.log(`
🎯 Comandos disponíveis:

// Testes individuais:
testeAdmin()       // Admin com avatar SVG
testeJoao()        // Comercial com avatar personalização  
testeMaria()       // Admin com avatar SVG personalização
testeCarlos()      // Comercial sem avatar (iniciais)

// Teste automático:
testeCicloCompleto()  // Executa todos os testes em sequência

// Utilitários:
verificarEstação()     // Ver usuário atual
limparTudo()         // Limpar cache
logout()             // Fazer logout

🎨 Observe como:
- O nome muda no header
- A saudação personaliza
- Os módulos aparecem/somem conforme o setor
- O avatar carrega automaticamente
- As iniciais aparecem quando não há avatar
`);

// Auto-verificar estação atual
verificarEstação();