/**
 * ALUFORCE - Carregador de CSS Responsivo
 * Carrega automaticamente o CSS responsivo em todas as páginas
 */

(function() {
    // Determinar o caminho base para o CSS
    let basePath = '';
    const pathname = window.location.pathname;
    
    // Detectar se está em um submódulo
    if (pathname.includes('/modules/')) {
        // Calcular quantos níveis acima está o public
        const parts = pathname.split('/');
        const modulesIndex = parts.indexOf('modules');
        if (modulesIndex > -1) {
            const levelsUp = parts.length - modulesIndex - 2;
            basePath = '../'.repeat(levelsUp) + '../../public/';
        }
    } else if (pathname.includes('/public/')) {
        basePath = '';
    }
    
    // Verificar se já existe o CSS responsivo carregado
    const existingLink = document.querySelector('link[href*="responsive.css"]');
    if (existingLink) return;
    
    // Criar e adicionar o link do CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = basePath + 'css/responsive.css?v=2026010401';
    link.id = 'responsive-css';
    
    // Inserir no head
    const head = document.head || document.getElementsByTagName('head')[0];
    head.appendChild(link);
    
    console.log('✅ CSS Responsivo carregado:', link.href);
})();
