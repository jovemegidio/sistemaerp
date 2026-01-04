// =====================================================
// INICIALIZAÇÃO E CORREÇÕES DO MÓDULO PCP
// =====================================================

(function() {
    'use strict';
    
    console.log('🚀 Inicializando correções do módulo PCP...');
    
    // Aguardar DOM estar pronto
    function init() {
        console.log('✅ DOM pronto, aplicando correções...');
        
        // 1. Ocultar modal antigo de produto
        ocultarModalAntigo();
        
        // 2. Inicializar contaçãores
        inicializarContaçãores();
        
        // 3. Verificar carregamento de materiais
        verificarMateriais();
        
        // 4. Adicionar listeners para views
        adicionarListenersViews();
        
        console.log('✅ Correções aplicadas com sucesso!');
    }
    
    // Ocultar modal antigo para usar apenas o modal rico
    function ocultarModalAntigo() {
        const modalAntigo = document.getElementById('modal-editar-produto');
        if (modalAntigo) {
            modalAntigo.style.display = 'none';
            modalAntigo.style.visibility = 'hidden';
            modalAntigo.style.opacity = '0';
            modalAntigo.style.pointerEvents = 'none';
            console.log('✅ Modal antigo ocultação - usando modal rico');
        }
    }
    
    // Inicializar contaçãores manualmente se necessário
    function inicializarContaçãores() {
        // Aguardar script de contaçãores carregar
        let tentativas = 0;
        const maxTentativas = 20;
        
        const verificarContaçãores = setInterval(() => {
            tentativas++;
            
            if (typeof window.atualizarContaçãoresPCP === 'function') {
                console.log('✅ Sistema de contaçãores encontração, atualizando...');
                window.atualizarContaçãoresPCP();
                clearInterval(verificarContaçãores);
            } else if (tentativas >= maxTentativas) {
                console.warn('⚠️ Sistema de contaçãores não encontração após', maxTentativas, 'tentativas');
                console.log('💡 Tentando atualizar contaçãores manualmente...');
                atualizarContaçãoresManual();
                clearInterval(verificarContaçãores);
            }
        }, 200);
    }
    
    // Atualizar contaçãores manualmente se o script não carregar
    async function atualizarContaçãoresManual() {
        try {
            // Atualizar contaçãor de materiais
            const resMateriais = await fetch('/api/pcp/materiais');
            if (resMateriais.ok) {
                const materiais = await resMateriais.json();
                const contaçãorMateriais = document.getElementById('materials-count-display');
                if (contaçãorMateriais) {
                    contaçãorMateriais.textContent = materiais.length;
                    console.log('✅ Contaçãor de materiais atualização:', materiais.length);
                }
            }
            
            // Atualizar contaçãores de produtos
            const resProdutos = await fetch('/api/pcp/produtospage=1&limit=10000');
            if (resProdutos.ok) {
                const data = await resProdutos.json();
                const produtos = data.rows || data;
                
                const contaçãorTotal = document.getElementById('stat-total-produtos-gestao');
                if (contaçãorTotal) {
                    contaçãorTotal.textContent = produtos.length;
                    console.log('✅ Contaçãor de produtos atualização:', produtos.length);
                }
                
                // Calcular produtos com estoque baixo (< 10)
                const produtosBaixo = produtos.filter(p => 
                    p.quantidade_estoque > 0 && p.quantidade_estoque < 10
                ).length;
                
                const contaçãorBaixo = document.getElementById('stat-estoque-baixo-gestao');
                if (contaçãorBaixo) {
                    contaçãorBaixo.textContent = produtosBaixo;
                }
                
                // Produtos críticos (estoque = 0)
                const produtosCriticos = produtos.filter(p => 
                    p.quantidade_estoque === 0 || !p.quantidade_estoque
                ).length;
                
                const contaçãorCritico = document.getElementById('stat-produtos-criticos-gestao');
                if (contaçãorCritico) {
                    contaçãorCritico.textContent = produtosCriticos;
                }
                
                // Produtos OK (estoque >= 10)
                const produtosOk = produtos.filter(p => 
                    p.quantidade_estoque >= 10
                ).length;
                
                const contaçãorOk = document.getElementById('stat-produtos-ok-gestao');
                if (contaçãorOk) {
                    contaçãorOk.textContent = produtosOk;
                }
                
                console.log('✅ Todos os contaçãores de produtos atualizaçãos');
            }
        } catch (error) {
            console.error('❌ Erro ao atualizar contaçãores manualmente:', error);
        }
    }
    
    // Verificar se materiais estão carregando corretamente
    function verificarMateriais() {
        setTimeout(() => {
            const tbody = document.getElementById('materiais-tbody');
            if (tbody) {
                const linhas = tbody.querySelectorAll('tr').length;
                console.log('📊 Linhas na tabela de materiais:', linhas);
                
                if (linhas === 0 || (linhas === 1 && tbody.querySelector('.empty-row'))) {
                    console.log('⚠️ Tabela vazia, tentando carregar materiais...');
                    
                    if (typeof window.onMateriaisViewShown === 'function') {
                        window.onMateriaisViewShown();
                    }
                }
            }
        }, 1000);
    }
    
    // Adicionar listeners para quando views ficam visíveis
    function adicionarListenersViews() {
        // Observar mudanças na view de materiais
        const materiaisView = document.getElementById('materiais-view');
        if (materiaisView) {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const isVisible = !materiaisView.classList.contains('hidden');
                        
                        if (isVisible) {
                            console.log('👁️ View de materiais visível');
                            
                            // Atualizar contaçãores
                            setTimeout(() => {
                                if (typeof window.atualizarContaçãoresPCP === 'function') {
                                    window.atualizarContaçãoresPCP();
                                } else {
                                    atualizarContaçãoresManual();
                                }
                            }, 500);
                        }
                    }
                });
            });
            
            observer.observe(materiaisView, { attributes: true });
            console.log('👀 Observer instalação para view de materiais');
        }
        
        // Observar mudanças na view de produtos
        const produtosView = document.getElementById('gestao-produtos-view');
        if (produtosView) {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const isVisible = !produtosView.classList.contains('hidden');
                        
                        if (isVisible) {
                            console.log('👁️ View de produtos visível');
                            
                            // Atualizar contaçãores
                            setTimeout(() => {
                                if (typeof window.atualizarContaçãoresPCP === 'function') {
                                    window.atualizarContaçãoresPCP();
                                } else {
                                    atualizarContaçãoresManual();
                                }
                            }, 500);
                        }
                    }
                });
            });
            
            observer.observe(produtosView, { attributes: true });
            console.log('👀 Observer instalação para view de produtos');
        }
    }
    
    // Expor função para atualização manual
    window.forcarAtualizacaoContaçãores = atualizarContaçãoresManual;
    
    // Inicializar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    console.log('✅ Script de correções carregação');
    console.log('💡 Use window.forcarAtualizacaoContaçãores() para atualizar contaçãores manualmente');
    
})();
