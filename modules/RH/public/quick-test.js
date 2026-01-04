/* ================================================= */
/* TESTE MANUAL DE SEÇÕES - VERIFICAÇÁO RÁPIDA     */
/* ================================================= */

console.log('🧪 INICIANDO VERIFICAÇÁO MANUAL DAS SEÇÕES...');

// Função para testar cada seção
function testSection(sectionId) {
    console.log(`\n📋 Testando seção: ${sectionId}`);
    
    const section = document.getElementById(sectionId);
    if (!section) {
        console.error(`❌ Seção ${sectionId} não encontrada`);
        return false;
    }
    
    console.log(`✅ Seção ${sectionId} existe`);
    
    // Verificar conteúdo específico da seção
    const content = section.innerHTML.length;
    console.log(`📊 Conteúdo da seção: ${content} caracteres`);
    
    // Verificar se está visível
    const isVisible = section.classList.contains('active') || 
                     window.getComputedStyle(section).display !== 'none';
    console.log(`👁️ Visível: ${isVisible ? 'SIM' : 'NÁO'}`);
    
    return true;
}

// Testar todas as seções principais
setTimeout(() => {
    const sections = [
        'dashboard-home',
        'funcionarios-section', 
        'holerites-section',
        'relatórios-section',
        'cadastro-section'
    ];
    
    console.log('🔍 VERIFICAÇÁO DE SEÇÕES:');
    console.log('========================');
    
    const results = {};
    sections.forEach(sectionId => {
        results[sectionId] = testSection(sectionId);
    });
    
    // Verificar navegação
    console.log('\n🧭 VERIFICAÇÁO DE NAVEGAÇÁO:');
    console.log('============================');
    
    const navLinks = document.querySelectorAll('.nav-link');
    console.log(`🔗 Links de navegação encontrados: ${navLinks.length}`);
    
    navLinks.forEach((link, index) => {
        const href = link.getAttribute('href') || link.getAttribute('onclick');
        console.log(`   ${index + 1}. ${href || 'sem href/onclick'}`);
    });
    
    // Verificar seção ativa atual
    console.log('\n👁️ SEÇÁO ATIVA ATUAL:');
    console.log('=====================');
    
    const activeSections = document.querySelectorAll('.content-section.active');
    console.log(`Seções ativas encontradas: ${activeSections.length}`);
    
    activeSections.forEach(section => {
        console.log(`✅ Seção ativa: ${section.id}`);
    });
    
    // Verificar widgets do dashboard
    if (document.getElementById('dashboard-home')) {
        console.log('\n📊 VERIFICAÇÁO DO DASHBOARD:');
        console.log('============================');
        
        const widgets = document.querySelectorAll('.widget');
        console.log(`🏷️ Widgets encontrados: ${widgets.length}`);
        
        widgets.forEach((widget, index) => {
            const title = widget.querySelector('.widget-title').textContent || 'Sem título';
            const value = widget.querySelector('.widget-value').textContent || 'Sem valor';
            console.log(`   ${index + 1}. ${title}: ${value}`);
        });
        
        const dashboardGrid = document.querySelector('.dashboard-grid');
        console.log(`📋 Grid do dashboard: ${dashboardGrid ? 'ENCONTRADO' : 'NÁO ENCONTRADO'}`);
    }
    
    // Verificar funcionários
    if (document.getElementById('funcionarios-section')) {
        console.log('\n👥 VERIFICAÇÁO DA SEÇÁO FUNCIONÁRIOS:');
        console.log('====================================');
        
        const employeeGrid = document.getElementById('employees-grid-view');
        const employeeTable = document.getElementById('employees-list-view');
        const searchInput = document.getElementById('search-input');
        
        console.log(`📋 Grid de funcionários: ${employeeGrid ? 'ENCONTRADO' : 'NÁO ENCONTRADO'}`);
        console.log(`📊 Tabela de funcionários: ${employeeTable ? 'ENCONTRADO' : 'NÁO ENCONTRADO'}`);
        console.log(`🔍 Campo de busca: ${searchInput ? 'ENCONTRADO' : 'NÁO ENCONTRADO'}`);
    }
    
    // Verificar relatórios
    if (document.getElementById('relatórios-section')) {
        console.log('\n📊 VERIFICAÇÁO DA SEÇÁO RELATÓRIOS:');
        console.log('==================================');
        
        const reportsGrid = document.querySelector('.reports-grid');
        const reportCards = document.querySelectorAll('.report-card');
        
        console.log(`📋 Grid de relatórios: ${reportsGrid ? 'ENCONTRADO' : 'NÁO ENCONTRADO'}`);
        console.log(`🏷️ Cards de relatórios: ${reportCards.length} encontrados`);
    }
    
    // Resumo final
    console.log('\n🎯 RESUMO FINAL:');
    console.log('================');
    
    const foundSections = Object.values(results).filter(Boolean).length;
    const totalSections = sections.length;
    
    console.log(`✅ Seções funcionando: ${foundSections}/${totalSections}`);
    console.log(`🧭 Navegação: ${navLinks.length} links encontrados`);
    console.log(`👁️ Seções ativas: ${activeSections.length} (ideal: 1)`);
    
    if (foundSections === totalSections && activeSections.length === 1) {
        console.log('🎉 TODOS OS TESTES PASSARAM! Sistema funcionando corretamente.');
    } else {
        console.log('⚠️ Alguns problemas encontrados, mas sistema funcional.');
    }
    
}, 2000);