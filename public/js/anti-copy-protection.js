/**
 * ALUFORCE - Sistema de Proteção Anti-Cópia
 * Protege o código fonte contra inspeção e cópia não autorizada
 * © 2026 ALUFORCE - Todos os direitos reservaçãos
 */

(function() {
    'use strict';
    
    // ============================================
    // CONFIGURAÇÕES
    // ============================================
    const CONFIG = {
        disableRightClick: true,
        disableKeyShortcuts: true,
        disableTextSelection: false, // Deixar false para não atrapalhar uso normal
        disableDevTools: true,
        disableDrag: true,
        showWarnings: true,
        redirectOnDevTools: false,
        blurOnDevTools: true
    };
    
    // Mensagem de aviso
    const WARNING_MESSAGE = '⚠️ ALUFORCE - Acesso não autorização!\n\nEste sistema é protegido por direitos autorais.\nA tentativa de cópia ou engenharia reversa é proibida.';
    
    // ============================================
    // DESABILITAR MENU DE CONTEXTO (BOTÃO DIREITO)
    // ============================================
    if (CONFIG.disableRightClick) {
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (CONFIG.showWarnings) {
                console.clear();
                console.log('%c⛔ ACESSO BLOQUEADO', 'color: red; font-size: 30px; font-weight: bold;');
                console.log('%cEste sistema é protegido. A cópia não autorizada é proibida.', 'color: orange; font-size: 14px;');
            }
            return false;
        }, true);
    }
    
    // ============================================
    // DESABILITAR TECLAS DE ATALHO
    // ============================================
    if (CONFIG.disableKeyShortcuts) {
        document.addEventListener('keydown', function(e) {
            // F12 - DevTools
            if (e.key === 'F12' || e.keyCode === 123) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            
            // Ctrl + Shift + I - Inspecionar
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            
            // Ctrl + Shift + J - Console
            if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            
            // Ctrl + Shift + C - Inspect Element
            if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            
            // Ctrl + U - Ver código fonte
            if (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            
            // Ctrl + S - Salvar página
            if (e.ctrlKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            
            // Ctrl + P - Imprimir (opcional, pode ser útil)
            // if (e.ctrlKey && (e.key === 'P' || e.key === 'p' || e.keyCode === 80)) {
            //     e.preventDefault();
            //     return false;
            // }
            
            // Ctrl + Shift + K - Console (Firefox)
            if (e.ctrlKey && e.shiftKey && (e.key === 'K' || e.key === 'k' || e.keyCode === 75)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            
            // Ctrl + Shift + E - Network (Firefox)
            if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e' || e.keyCode === 69)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            
            // F5 com Ctrl - Hard refresh (permitir F5 normal)
            // Ctrl + F5 ou Ctrl + Shift + R
            if ((e.ctrlKey && e.key === 'F5') || (e.ctrlKey && e.shiftKey && (e.key === 'R' || e.key === 'r'))) {
                // Permitir refresh
            }
            
        }, true);
        
        // Capturar no window também
        window.addEventListener('keydown', function(e) {
            if (e.key === 'F12' || 
                (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c', 'K', 'k'].includes(e.key)) ||
                (e.ctrlKey && ['U', 'u', 'S', 's'].includes(e.key))) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }, true);
    }
    
    // ============================================
    // DESABILITAR SELEÇÃO DE TEXTO
    // ============================================
    if (CONFIG.disableTextSelection) {
        document.addEventListener('selectstart', function(e) {
            // Permitir seleção em inputs e textareas
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return true;
            }
            e.preventDefault();
            return false;
        });
        
        // CSS para desabilitar seleção
        const style = document.createElement('style');
        style.textContent = `
            body {
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }
            input, textarea, [contenteditable="true"] {
                -webkit-user-select: text;
                -moz-user-select: text;
                -ms-user-select: text;
                user-select: text;
            }
        `;
        document.head.appendChild(style);
    }
    
    // ============================================
    // DESABILITAR DRAG (ARRASTAR IMAGENS/ELEMENTOS)
    // ============================================
    if (CONFIG.disableDrag) {
        document.addEventListener('dragstart', function(e) {
            e.preventDefault();
            return false;
        });
    }
    
    // ============================================
    // DETECTAR E REAGIR AO DEVTOOLS
    // ============================================
    if (CONFIG.disableDevTools) {
        let devToolsOpen = false;
        
        // Método 1: Detectar mudança no tamanho da janela (DevTools abre e muda dimensões)
        const threshold = 160;
        
        const checkDevTools = function() {
            const widthThreshold = window.outerWidth - window.innerWidth > threshold;
            const heightThreshold = window.outerHeight - window.innerHeight > threshold;
            
            if (widthThreshold || heightThreshold) {
                if (!devToolsOpen) {
                    devToolsOpen = true;
                    onDevToolsOpen();
                }
            } else {
                if (devToolsOpen) {
                    devToolsOpen = false;
                    onDevToolsClose();
                }
            }
        };
        
        // Método 2: Usar console.log com getter
        const detectDevToolsConsole = function() {
            const element = new Image();
            Object.defineProperty(element, 'id', {
                get: function() {
                    devToolsOpen = true;
                    onDevToolsOpen();
                }
            });
            console.log('%c', element);
        };
        
        // Método 3: debugger statement (descomente se quiser usar - pode ser irritante)
        // setInterval(function() {
        //     debugger;
        // }, 100);
        
        function onDevToolsOpen() {
            console.clear();
            console.log('%c⛔ ATENÇÃO!', 'color: red; font-size: 50px; font-weight: bold; text-shadow: 2px 2px 0 black;');
            console.log('%cEste é um sistema protegido por direitos autorais.', 'color: white; font-size: 18px; background: #dc2626; padding: 10px;');
            console.log('%cA cópia, redistribuição ou engenharia reversa é PROIBIDA.', 'color: white; font-size: 16px; background: #dc2626; padding: 8px;');
            console.log('%c© 2026 ALUFORCE - Cabos de Alumínio', 'color: #60a5fa; font-size: 14px;');
            
            if (CONFIG.blurOnDevTools) {
                document.body.style.filter = 'blur(10px)';
                document.body.style.pointerEvents = 'none';
                
                // Mostrar overlay de aviso
                showProtectionOverlay();
            }
            
            if (CONFIG.redirectOnDevTools) {
                window.location.href = 'about:blank';
            }
        }
        
        function onDevToolsClose() {
            if (CONFIG.blurOnDevTools) {
                document.body.style.filter = '';
                document.body.style.pointerEvents = '';
                hideProtectionOverlay();
            }
        }
        
        // Verificar periodicamente
        setInterval(checkDevTools, 1000);
        setInterval(detectDevToolsConsole, 2000);
        
        // Verificar no resize
        window.addEventListener('resize', checkDevTools);
    }
    
    // ============================================
    // OVERLAY DE PROTEÇÃO
    // ============================================
    function showProtectionOverlay() {
        if (document.getElementById('protection-overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'protection-overlay';
        overlay.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                z-index: 999999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
                font-family: 'Outfit', sans-serif;
            ">
                <div style="text-align: center; max-width: 500px; padding: 40px;">
                    <div style="font-size: 80px; margin-bottom: 20px;">🔒</div>
                    <h1 style="font-size: 28px; margin-bottom: 16px; color: #ef4444;">Acesso Bloqueação</h1>
                    <p style="font-size: 16px; color: #9ca3af; margin-bottom: 24px; line-height: 1.6;">
                        As ferramentas de desenvolvedor foram detectadas.<br>
                        Este sistema é protegido por direitos autorais.
                    </p>
                    <p style="font-size: 14px; color: #6b7280; margin-bottom: 32px;">
                        Feche o DevTools para continuar usando o sistema.
                    </p>
                    <div style="
                        padding: 16px 32px;
                        background: linear-gradient(135deg, #1e40af, #3b82f6);
                        border-radius: 8px;
                        font-weight: 600;
                    ">
                        © 2026 ALUFORCE - Cabos de Alumínio
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    
    function hideProtectionOverlay() {
        const overlay = document.getElementById('protection-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
    
    // ============================================
    // PROTEGER CONTRA VIEW-SOURCE
    // ============================================
    // Não é possível bloquear completamente view-source, mas podemos:
    // 1. Carregar conteúdo via JavaScript
    // 2. Ofuscar código
    
    // Limpar console periodicamente
    if (CONFIG.disableDevTools) {
        setInterval(function() {
            console.clear();
            console.log('%c🔒 ALUFORCE - Sistema Protegido', 'color: #3b82f6; font-size: 12px;');
        }, 5000);
    }
    
    // ============================================
    // BLOQUEAR IFRAMES EXTERNOS
    // ============================================
    if (window.top !== window.self) {
        // O site está em um iframe
        window.top.location = window.self.location;
    }
    
    // ============================================
    // DESABILITAR CÓPIA
    // ============================================
    document.addEventListener('copy', function(e) {
        // Permitir cópia apenas em inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return true;
        }
        e.preventDefault();
        e.clipboardData.setData('text/plain', 'Conteúdo protegido - ALUFORCE © 2026');
        return false;
    });
    
    // ============================================
    // LOG DE INICIALIZAÇÃO
    // ============================================
    console.clear();
    console.log('%c🔒 ALUFORCE', 'color: #3b82f6; font-size: 24px; font-weight: bold;');
    console.log('%cSistema protegido por direitos autorais', 'color: #9ca3af; font-size: 12px;');
    
})();
