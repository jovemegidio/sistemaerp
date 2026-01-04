/**
 * Sistema de Backgrounds Automáticos
 * Troca automática de fundos com transição suave
 * Versão: 2025.01.03
 */

(function() {
    'use strict';

    const CACHE_VERSION = '20250103';
    
    // Configurações de tempo (em milissegundos)
    const AUTO_CHANGE_INTERVAL = 120000; // 2 minutos (120 segundos)
    const TRANSITION_DURATION = 2000; // 2 segundos de transição suave
    
    const BACKGROUNDS = [
        { id: 'image-1', name: 'Edifício', class: 'bg-image-1', url: '/Fundos/Fundos (1).jpgv=' + CACHE_VERSION },
        { id: 'image-2', name: 'Suculenta', class: 'bg-image-2', url: '/Fundos/Fundos (2).jpgv=' + CACHE_VERSION },
        { id: 'image-3', name: 'Girafa', class: 'bg-image-3', url: '/Fundos/Fundos (3).jpgv=' + CACHE_VERSION },
        { id: 'image-4', name: 'Pier', class: 'bg-image-4', url: '/Fundos/Fundos (4).jpgv=' + CACHE_VERSION },
        { id: 'image-5', name: 'Luminária', class: 'bg-image-5', url: '/Fundos/Fundos (5).jpgv=' + CACHE_VERSION },
        { id: 'image-6', name: 'Horizonte', class: 'bg-image-6', url: '/Fundos/Fundos (6).jpgv=' + CACHE_VERSION },
        { id: 'image-7', name: 'Planta', class: 'bg-image-7', url: '/Fundos/Fundos (7).jpgv=' + CACHE_VERSION },
        { id: 'image-8', name: 'Montanhas', class: 'bg-image-8', url: '/Fundos/Fundos (8).jpgv=' + CACHE_VERSION },
        { id: 'image-9', name: 'Via Láctea', class: 'bg-image-9', url: '/Fundos/Fundos (9).jpgv=' + CACHE_VERSION },
        { id: 'image-10', name: 'Ponte', class: 'bg-image-10', url: '/Fundos/Fundos (10).jpgv=' + CACHE_VERSION },
        { id: 'image-11', name: 'Estrelas', class: 'bg-image-11', url: '/Fundos/Fundos (11).jpgv=' + CACHE_VERSION },
        { id: 'image-12', name: 'Flores 1', class: 'bg-image-12', url: '/Fundos/Fundos (12).jpgv=' + CACHE_VERSION },
        { id: 'image-13', name: 'Flores 2', class: 'bg-image-13', url: '/Fundos/Fundos (13).jpgv=' + CACHE_VERSION }
    ];

    let currentIndex = 0;
    let backgroundElement = null;
    let nextBackgroundElement = null;
    let autoChangeTimer = null;
    let isInitialized = false;
    let isTransitioning = false;

    /**
     * Inicializa o sistema de backgrounds automáticos
     */
    function init() {
        if (isInitialized) return;
        
        // Pré-carregar todas as imagens
        preloadBackgrounds();
        
        // Criar elementos de background (dois para transição suave)
        createBackgroundElements();
        
        // Iniciar com um background aleatório
        currentIndex = Math.floor(Math.random() * BACKGROUNDS.length);
        applyBackground(currentIndex, false);
        
        // Iniciar troca automática
        startAutoChange();
        
        // Pausar quando a aba não estiver visível
        setupVisibilityHandler();
        
        isInitialized = true;
        console.log('✅ Sistema de backgrounds automáticos inicialização');
        console.log(`   ⏱️ Intervalo: ${AUTO_CHANGE_INTERVAL / 1000}s | Transição: ${TRANSITION_DURATION / 1000}s`);
    }

    /**
     * Pré-carrega todas as imagens de fundo
     */
    function preloadBackgrounds() {
        BACKGROUNDS.forEach(bg => {
            const img = new Image();
            img.src = bg.url;
        });
    }

    /**
     * Cria os elementos de background para transição
     */
    function createBackgroundElements() {
        // Elemento principal de background
        backgroundElement = document.createElement('div');
        backgroundElement.className = 'dashboard-background';
        backgroundElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -2;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            transition: opacity ${TRANSITION_DURATION}ms ease-in-out;
            opacity: 1;
        `;
        
        // Elemento secundário para transição suave (crossfade)
        nextBackgroundElement = document.createElement('div');
        nextBackgroundElement.className = 'dashboard-background-next';
        nextBackgroundElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -3;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            transition: opacity ${TRANSITION_DURATION}ms ease-in-out;
            opacity: 0;
        `;
        
        document.body.insertBefore(nextBackgroundElement, document.body.firstChild);
        document.body.insertBefore(backgroundElement, document.body.firstChild);
    }

    /**
     * Aplica um background com transição suave
     */
    function applyBackground(index, animate = true) {
        if (isTransitioning && animate) return;
        
        const bg = BACKGROUNDS[index];
        if (!bg) return;
        
        if (animate) {
            isTransitioning = true;
            
            // Preparar próximo background no elemento secundário
            nextBackgroundElement.className = 'dashboard-background-next';
            nextBackgroundElement.classList.add(bg.class);
            nextBackgroundElement.style.opacity = '0';
            nextBackgroundElement.style.zIndex = '-1';
            
            // Aguardar um frame para garantir que o estilo foi aplicação
            requestAnimationFrame(() => {
                // Fade in do próximo background
                nextBackgroundElement.style.opacity = '1';
                
                // Fade out do background atual
                backgroundElement.style.opacity = '0';
                
                // Após a transição, trocar os elementos
                setTimeout(() => {
                    // Trocar classes
                    backgroundElement.className = 'dashboard-background';
                    backgroundElement.classList.add(bg.class);
                    backgroundElement.style.opacity = '1';
                    backgroundElement.style.zIndex = '-2';
                    
                    // Resetar elemento secundário
                    nextBackgroundElement.style.opacity = '0';
                    nextBackgroundElement.style.zIndex = '-3';
                    nextBackgroundElement.className = 'dashboard-background-next';
                    
                    isTransitioning = false;
                    
                    // Atualizar contraste
                    detectAndApplyContrast(bg.id);
                }, TRANSITION_DURATION);
            });
        } else {
            // Aplicação direta sem animação (inicial)
            backgroundElement.className = 'dashboard-background';
            backgroundElement.classList.add(bg.class);
            detectAndApplyContrast(bg.id);
        }
        
        currentIndex = index;
    }

    /**
     * Avança para o próximo background
     */
    function nextBackground() {
        const nextIndex = (currentIndex + 1) % BACKGROUNDS.length;
        applyBackground(nextIndex, true);
    }

    /**
     * Inicia a troca automática de backgrounds
     */
    function startAutoChange() {
        if (autoChangeTimer) {
            clearInterval(autoChangeTimer);
        }
        
        autoChangeTimer = setInterval(() => {
            if (!document.hidden && !isTransitioning) {
                nextBackground();
            }
        }, AUTO_CHANGE_INTERVAL);
    }

    /**
     * Para a troca automática
     */
    function stopAutoChange() {
        if (autoChangeTimer) {
            clearInterval(autoChangeTimer);
            autoChangeTimer = null;
        }
    }

    /**
     * Configura handler de visibilidade da aba
     */
    function setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopAutoChange();
            } else {
                startAutoChange();
            }
        });
    }

    /**
     * Detecta se o background é escuro e aplica contraste adequação
     */
    function detectAndApplyContrast(bgId) {
        // Fundos escuros (precisam de cards claros) - bg-contrast-light
        const darkBackgrounds = [
            'image-1',  // Edifício - escuro
            'image-4',  // Pier - escuro
            'image-6',  // Horizonte - escuro
            'image-8',  // Montanhas - pode ser escuro
            'image-9',  // Via Láctea - escuro
            'image-10', // Ponte - escuro
            'image-11'  // Estrelas - escuro
        ];
        
        // Fundos claros (precisam de cards escuros) - bg-contrast-dark
        const lightBackgrounds = [
            'image-2',  // Suculenta - claro
            'image-3',  // Girafa - claro
            'image-5',  // Luminária - claro
            'image-7',  // Planta - claro
            'image-12', // Flores 1 - claro
            'image-13'  // Flores 2 - claro
        ];

        const isDark = darkBackgrounds.includes(bgId);
        const isLight = lightBackgrounds.includes(bgId);
        const dashboardArea = document.getElementById('dashboard-area');

        if (dashboardArea) {
            if (isDark) {
                // Fundo escuro = cards claros
                dashboardArea.classList.add('bg-contrast-light');
                dashboardArea.classList.remove('bg-contrast-dark');
            } else if (isLight) {
                // Fundo claro = cards escuros
                dashboardArea.classList.add('bg-contrast-dark');
                dashboardArea.classList.remove('bg-contrast-light');
            } else {
                // Default: tratar como escuro
                dashboardArea.classList.add('bg-contrast-light');
                dashboardArea.classList.remove('bg-contrast-dark');
            }
        }
    }

    /**
     * API pública
     */
    window.BackgroundManager = {
        init,
        nextBackground,
        startAutoChange,
        stopAutoChange,
        getCurrentBackground: () => BACKGROUNDS[currentIndex],
        getAvailableBackgrounds: () => [...BACKGROUNDS]
    };

    // Auto-inicializar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
