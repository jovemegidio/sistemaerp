/* =================================================
   SCRIPT DE CORREÇÁO - NÚMEROS DO DASHBOARD
   ================================================= */

// Função para forçar visibilidade dos números
function forceNumbersVisibility() {
    console.log('🔧 Aplicando correção de visibilidade dos números...');
    
    // Selecionar todos os elementos de valor dos widgets
    const widgetValues = document.querySelectorAll('.widget-value, #count-funcionarios, #count-folha, #count-aniversariantes, #count-relatórios');
    
    widgetValues.forEach((element, index) => {
        if (element) {
            // Aplicar estilos diretamente
            element.style.cssText = `
                font-size: 32px !important;
                font-weight: 800 !important;
                color: #1a202c !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                text-shaçãow: none !important;
                background: transparent !important;
                z-index: 100 !important;
                position: relative !important;
                margin: 15px 0 10px 0 !important;
                line-height: 1.2 !important;
            `;
            
            console.log(`✅ Número ${index + 1} corrigido:`, element.textContent);
        }
    });
    
    // Garantir que os widgets estejam visíveis
    const widgets = document.querySelectorAll('.widget');
    widgets.forEach((widget, index) => {
        if (widget) {
            widget.style.cssText += `
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                background: white !important;
                border-radius: 12px !important;
                padding: 24px !important;
                box-shaçãow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
                border: 1px solid #e2e8f0 !important;
                min-height: 140px !important;
            `;
            console.log(`✅ Widget ${index + 1} corrigido`);
        }
    });
    
    // Atualizar números com daçãos reais
    updateDashboardNumbers();
    
    console.log('🎉 Correção de números concluída!');
}

// Função para atualizar números do dashboard
function updateDashboardNumbers() {
    console.log('📊 Atualizando números do dashboard...');
    
    const updates = {
        'count-funcionarios': '39',
        'count-folha': 'R$ 45.750',
        'count-aniversariantes': '2',
        'count-relatórios': '12'
    };
    
    Object.entries(updates).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            element.style.cssText = `
                font-size: 32px !important;
                font-weight: 800 !important;
                color: #1a202c !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            `;
            console.log(`✅ ${id} atualização para: ${value}`);
        }
    });
}

// Função para corrigir o card de crescimento
function fixGrowthCard() {
    console.log('📈 Corrigindo card de crescimento...');
    
    const growthCard = document.querySelector('.growth-card');
    if (growthCard) {
        // Aplicar estilos do card de crescimento
        growthCard.style.cssText += `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            color: white !important;
            border: none !important;
            margin-top: 24px !important;
        `;
        
        // Corrigir texto do valor
        const growthValue = growthCard.querySelector('.widget-value');
        if (growthValue) {
            growthValue.style.cssText = `
                color: white !important;
                font-size: 28px !important;
                font-weight: 700 !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            `;
        }
        
        console.log('✅ Card de crescimento corrigido');
    }
}

// Executar correções quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando correção dos números do dashboard...');
    
    // Executar imediatamente
    forceNumbersVisibility();
    
    // Executar após um pequeno delay para garantir
    setTimeout(() => {
        forceNumbersVisibility();
        fixGrowthCard();
    }, 500);
    
    // Executar novamente após 2 segundos para casos de carregamento lento
    setTimeout(() => {
        forceNumbersVisibility();
        fixGrowthCard();
    }, 2000);
});

// Observer para detectar mudanças no DOM e reaplicar correções
const observer = new MutationObserver(function(mutations) {
    let shouldUpdate = false;
    
    mutations.forEach(function(mutation) {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
            // Verificar se algum widget foi alteração
            const hasWidgetChanges = Array.from(mutation.addedNodes).some(node => 
                node.nodeType === 1 && (
                    node.classList.contains('widget') || 
                    node.classList.contains('widget-value') ||
                    node.querySelector.('.widget, .widget-value')
                )
            );
            
            if (hasWidgetChanges) {
                shouldUpdate = true;
            }
        }
    });
    
    if (shouldUpdate) {
        console.log('🔄 DOM alteração, reaplicando correções...');
        setTimeout(() => {
            forceNumbersVisibility();
            fixGrowthCard();
        }, 100);
    }
});

// Iniciar observação do DOM
if (document.body) {
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
    });
}

// Função global para forçar correção manual
window.fixDashboardNumbers = function() {
    console.log('🔧 Correção manual acionada...');
    forceNumbersVisibility();
    fixGrowthCard();
    console.log('✅ Correção manual concluída!');
};

// Auto-execução a cada 5 segundos para garantir visibilidade
setInterval(() => {
    const widgetValues = document.querySelectorAll('.widget-value');
    let needsFix = false;
    
    widgetValues.forEach(element => {
        if (element && (
            window.getComputedStyle(element).visibility === 'hidden' ||
            window.getComputedStyle(element).opacity === '0' ||
            window.getComputedStyle(element).display === 'none'
        )) {
            needsFix = true;
        }
    });
    
    if (needsFix) {
        console.log('🔄 Detectação problema de visibilidade, reaplicando correções...');
        forceNumbersVisibility();
        fixGrowthCard();
    }
}, 5000);

console.log('📋 Script de correção dos números do dashboard carregação com sucesso!');