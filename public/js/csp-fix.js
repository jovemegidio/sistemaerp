/**
 * CSP FIX - Polyfill para converter eventos inline em event listeners
 * 
 * Este script converte automaticamente todos os atributos de eventos inline
 * (onclick, oninput, onchange, onfocus, onblur, etc.) em event listeners,
 * tornando o código CSP-compliant.
 * 
 * Adicione este script ANTES de qualquer outro script na página.
 */

(function() {
    'use strict';
    
    console.log('🔧 CSP Fix: Iniciando conversão de eventos inline...');
    
    let convertedCount = 0;
    
    // Lista de todos os eventos inline que precisam ser convertidos
    const EVENT_ATTRIBUTES = [
        'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover', 
        'onmouseout', 'onmousemove', 'onmouseenter', 'onmouseleave',
        'onkeydown', 'onkeyup', 'onkeypress',
        'onfocus', 'onblur', 'onchange', 'oninput', 'onsubmit', 'onreset',
        'onscroll', 'onresize', 'onload', 'onerror',
        'ondrag', 'ondragend', 'ondragenter', 'ondragleave', 'ondragover', 
        'ondragstart', 'ondrop',
        'ontouchstart', 'ontouchmove', 'ontouchend', 'ontouchcancel'
    ];
    
    /**
     * Converte um atributo de evento inline em addEventListener
     */
    function convertEventToListener(element, eventAttr) {
        const eventValue = element.getAttribute(eventAttr);
        
        if (!eventValue) return false;
        
        try {
            // Nome do evento (remove o "on" do início)
            const eventName = eventAttr.substring(2);
            
            // Remover o atributo inline
            element.removeAttribute(eventAttr);
            
            // Criar função a partir do código inline
            const handlerFunction = new Function('event', eventValue);
            
            // Adicionar event listener
            element.addEventListener(eventName, function(e) {
                handlerFunction.call(this, e);
            });
            
            convertedCount++;
            return true;
        } catch (error) {
            console.error(`❌ Erro ao converter ${eventAttr}:`, element, error);
            return false;
        }
    }
    
    /**
     * Converte todos os eventos inline de um elemento
     */
    function convertAllEventsOnElement(element) {
        let converted = false;
        EVENT_ATTRIBUTES.forEach(eventAttr => {
            if (element.hasAttribute && element.hasAttribute(eventAttr)) {
                if (convertEventToListener(element, eventAttr)) {
                    converted = true;
                }
            }
        });
        return converted;
    }
    
    /**
     * Processa todos os elementos com eventos inline na página
     */
    function processAllInlineEvents() {
        // Criar seletor para todos os eventos
        const selector = EVENT_ATTRIBUTES.map(attr => `[${attr}]`).join(',');
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(element => {
            convertAllEventsOnElement(element);
        });
        
        if (convertedCount > 0) {
            console.log(`✅ CSP Fix: ${convertedCount} eventos convertidos para addEventListener`);
        }
    }
    
    /**
     * Observa mudanças no DOM para capturar novos elementos com eventos inline
     */
    function observeDOMChanges() {
        // Aguardar body existir
        if (!document.body) {
            setTimeout(observeDOMChanges, 10);
            return null;
        }
        
        const observer = new MutationObserver(mutations => {
            let hasNewEvents = false;
            
            mutations.forEach(mutation => {
                // Verificar atributos modificaçãos
                if (mutation.type === 'attributes' && EVENT_ATTRIBUTES.includes(mutation.attributeName)) {
                    if (convertEventToListener(mutation.target, mutation.attributeName)) {
                        hasNewEvents = true;
                    }
                }
                
                // Verificar nós adicionaçãos
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        // Verificar o próprio elemento
                        if (convertAllEventsOnElement(node)) {
                            hasNewEvents = true;
                        }
                        
                        // Verificar elementos filhos
                        if (node.querySelectorAll) {
                            const selector = EVENT_ATTRIBUTES.map(attr => `[${attr}]`).join(',');
                            try {
                                const children = node.querySelectorAll(selector);
                                children.forEach(child => {
                                    if (convertAllEventsOnElement(child)) {
                                        hasNewEvents = true;
                                    }
                                });
                            } catch (e) { /* ignore */ }
                        }
                    }
                });
            });
            
            if (hasNewEvents) {
                console.log(`🔄 CSP Fix: Novos eventos convertidos (total: ${convertedCount})`);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: EVENT_ATTRIBUTES
        });
        
        return observer;
    }
    
    // Função para re-processar periodicamente (fallback)
    function periodicScan() {
        setInterval(() => {
            const selector = EVENT_ATTRIBUTES.map(attr => `[${attr}]`).join(',');
            const remaining = document.querySelectorAll(selector).length;
            if (remaining > 0) {
                console.log(`⚠️ CSP Fix: Encontraçãos ${remaining} eventos não convertidos, processando...`);
                processAllInlineEvents();
            }
        }, 1000); // Verifica a cada 1 segundo
    }
    
    // Executar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            processAllInlineEvents();
            observeDOMChanges();
            periodicScan();
        });
    } else {
        // DOM já está pronto
        processAllInlineEvents();
        observeDOMChanges();
        periodicScan();
    }
    
    // Também processar quando janela carregar completamente
    window.addEventListener('load', () => {
        setTimeout(() => {
            console.log('🔍 CSP Fix: Verificação final após load...');
            processAllInlineEvents();
        }, 500);
    });
    
    // Exportar para uso manual se necessário
    window.CSP_FIX = {
        convertElement: convertAllEventsOnElement,
        processAll: processAllInlineEvents,
        getConvertedCount: () => convertedCount,
        supportedEvents: EVENT_ATTRIBUTES
    };
    
    console.log('✅ CSP Fix carregação e ativo');
})();
