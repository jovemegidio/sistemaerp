/* ================================================= */
/* SCRIPT PARA POPULAR DASHBOARD                     */
/* ================================================= */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Populando dashboard...');
    
    // Função para popular widgets com dados
    function populateDashboard() {
        // Daçãos do dashboard
        const dashboardData = {
            'total-funcionarios': '4',
            'count-aniversariantes': '2',
            'count-avisos': '3',
            'count-relatórios': '12'
        };
        
        // Popular cada widget
        Object.keys(dashboardData).forEach(function(id) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = dashboardData[id];
                element.style.display = 'block';
                element.style.visibility = 'visible';
                console.log('✅ Widget população:', id, dashboardData[id]);
            } else {
                console.warn('⚠️ Widget não encontrado:', id);
            }
        });
        
        // Garantir que todos os widgets sejam visíveis
        document.querySelectorAll('.widget').forEach(function(widget, index) {
            widget.style.display = 'block';
            widget.style.visibility = 'visible';
            widget.style.opacity = '1';
            widget.style.position = 'relative';
            widget.style.zIndex = '10';
            console.log('✅ Widget ' + (index + 1) + ' forçação a aparecer');
        });
        
        // Garantir que o grid seja visível
        const dashboardGrid = document.querySelector('.dashboard-grid');
        if (dashboardGrid) {
            dashboardGrid.style.display = 'grid';
            dashboardGrid.style.visibility = 'visible';
            dashboardGrid.style.opacity = '1';
            console.log('✅ Dashboard grid configuração');
        }
        
        // Forçar visibilidade das seções
        const dashboardSection = document.getElementById('dashboard-home') || document.getElementById('dashboard');
        if (dashboardSection) {
            dashboardSection.style.display = 'block';
            dashboardSection.style.visibility = 'visible';
            dashboardSection.style.opacity = '1';
            dashboardSection.style.background = '#f8fafc';
            dashboardSection.style.minHeight = '100vh';
            console.log('✅ Dashboard section configurada');
        }
    }
    
    // Executar imediatamente
    populateDashboard();
    
    // Executar após delay
    setTimeout(function() {
        populateDashboard();
        console.log('🔄 Dashboard recarregação após delay');
    }, 500);
    
    // Executar quando a janela carregar completamente
    window.addEventListener('load', function() {
        setTimeout(function() {
            populateDashboard();
            console.log('🔄 Dashboard recarregação após window.load');
        }, 1000);
    });
});

// Função global para debug do dashboard
window.debugDashboard = function() {
    console.log('=== 🎯 DEBUG DO DASHBOARD ===');
    
    const dashboard = document.getElementById('dashboard-home') || document.getElementById('dashboard');
    console.log('Dashboard encontrado:', dashboard ? 'SIM' : 'NÁO');
    
    if (dashboard) {
        console.log('Dashboard display:', getComputedStyle(dashboard).display);
        console.log('Dashboard visibility:', getComputedStyle(dashboard).visibility);
        console.log('Dashboard opacity:', getComputedStyle(dashboard).opacity);
    }
    
    const grid = document.querySelector('.dashboard-grid');
    console.log('Grid encontrado:', grid ? 'SIM' : 'NÁO');
    
    if (grid) {
        console.log('Grid display:', getComputedStyle(grid).display);
        console.log('Grid visibility:', getComputedStyle(grid).visibility);
    }
    
    const widgets = document.querySelectorAll('.widget');
    console.log('Total de widgets:', widgets.length);
    
    widgets.forEach(function(widget, index) {
        console.log(`Widget ${index + 1}:`);
        console.log('- Display:', getComputedStyle(widget).display);
        console.log('- Visibility:', getComputedStyle(widget).visibility);
        console.log('- Opacity:', getComputedStyle(widget).opacity);
    });
};

// Função para forçar exibição do dashboard
window.forceDashboard = function() {
    console.log('🔧 Forçando exibição do dashboard...');
    
    // Forçar CSS inline
    const dashboard = document.getElementById('dashboard-home') || document.getElementById('dashboard');
    if (dashboard) {
        dashboard.setAttribute('style', 
            'display: block !important; ' +
            'visibility: visible !important; ' +
            'opacity: 1 !important; ' +
            'background: #f8fafc !important; ' +
            'min-height: 100vh !important; ' +
            'padding: 40px 20px !important;'
        );
    }
    
    const grid = document.querySelector('.dashboard-grid');
    if (grid) {
        grid.setAttribute('style',
            'display: grid !important; ' +
            'visibility: visible !important; ' +
            'opacity: 1 !important; ' +
            'grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)) !important; ' +
            'gap: 30px !important; ' +
            'margin: 40px auto !important; ' +
            'padding: 20px !important;'
        );
    }
    
    document.querySelectorAll('.widget').forEach(function(widget) {
        widget.setAttribute('style',
            'display: block !important; ' +
            'visibility: visible !important; ' +
            'opacity: 1 !important; ' +
            'background: white !important; ' +
            'border: 2px solid #e2e8f0 !important; ' +
            'border-radius: 16px !important; ' +
            'padding: 30px !important; ' +
            'min-height: 180px !important;'
        );
    });
    
    console.log('✅ Dashboard forçação com CSS inline');
};