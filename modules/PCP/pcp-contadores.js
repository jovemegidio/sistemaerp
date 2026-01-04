/**
 * ============================================
 * SISTEMA DE CONTADORES DO MÓDULO PCP
 * ============================================
 * 
 * Gerencia todos os contaçãores das páginas do PCP:
 * - Contaçãor de materiais
 * - Contaçãor de produtos
 * - Alertas de estoque
 * - Paginação
 * 
 * Autor: Sistema Aluforce
 * Data: 03/12/2025
 */

(function() {
    'use strict';

    console.log('🔢 Inicializando sistema de contaçãores PCP...');

    // ============================================
    // CACHE DE DADOS
    // ============================================
    let daçãosMateriaisCache = null;
    let daçãosProdutosCache = null;
    let ultimaAtualizacao = {
        materiais: 0,
        produtos: 0
    };

    // ============================================
    // FUNÇÃO: ATUALIZAR CONTADOR DE MATERIAIS
    // ============================================
    async function atualizarContaçãorMateriais() {
        try {
            const countDisplay = document.getElementById('materials-count-display');
            if (!countDisplay) {
                console.log('⚠️ Elemento materials-count-display não encontração');
                return;
            }

            // Buscar daçãos da API
            const response = await fetch('/api/pcp/materiais');
            if (!response.ok) {
                console.error('❌ Erro ao buscar materiais:', response.status);
                return;
            }

            const materiais = await response.json();
            const total = Array.isArray(materiais)  materiais.length : 0;

            // Atualizar display
            countDisplay.textContent = total;
            daçãosMateriaisCache = materiais;
            ultimaAtualizacao.materiais = Date.now();

            console.log(`✅ Contaçãor de materiais atualização: ${total}`);

            // Verificar alertas de estoque
            atualizarAlertasEstoqueMateriais(materiais);

        } catch (error) {
            console.error('❌ Erro ao atualizar contaçãor de materiais:', error);
        }
    }

    // ============================================
    // FUNÇÃO: ATUALIZAR ALERTAS DE ESTOQUE (MATERIAIS)
    // ============================================
    function atualizarAlertasEstoqueMateriais(materiais) {
        try {
            const alertasContaçãor = document.getElementById('alertas-contaçãor');
            if (!alertasContaçãor) return;

            let alertasCount = 0;

            materiais.forEach(material => {
                const estoque = parseFloat(material.quantidade_estoque || 0);
                const estoqueMinimo = parseFloat(material.estoque_minimo || 0);

                // Contar materiais abaixo do mínimo
                if (estoque < estoqueMinimo) {
                    alertasCount++;
                }
            });

            // Atualizar display
            alertasContaçãor.textContent = alertasCount;
            
            if (alertasCount > 0) {
                alertasContaçãor.style.display = 'flex';
                console.log(`⚠️ ${alertasCount} alertas de estoque de materiais`);
            } else {
                alertasContaçãor.style.display = 'none';
            }

        } catch (error) {
            console.error('❌ Erro ao atualizar alertas de estoque:', error);
        }
    }

    // ============================================
    // FUNÇÃO: ATUALIZAR CONTADORES DE PRODUTOS (GESTÃO)
    // ============================================
    async function atualizarContaçãoresProdutos() {
        try {
            const statTotal = document.getElementById('stat-total-produtos-gestao');
            const statBaixo = document.getElementById('stat-estoque-baixo-gestao');
            const statCritico = document.getElementById('stat-produtos-criticos-gestao');
            const statOk = document.getElementById('stat-produtos-ok-gestao');

            if (!statTotal) {
                console.log('⚠️ Elementos de estatísticas de produtos não encontraçãos');
                return;
            }

            // Buscar daçãos da API
            const response = await fetch('/api/pcp/produtoslimit=10000');
            if (!response.ok) {
                console.error('❌ Erro ao buscar produtos:', response.status);
                return;
            }

            const data = await response.json();
            // API retorna data.produtos, data.rows, ou array direto
            const produtos = data.produtos || data.rows || (Array.isArray(data)  data : []);

            // Contaçãores
            let totalProdutos = produtos.length;
            let estoqueBaixo = 0;
            let estoqueCritico = 0;
            let estoqueOk = 0;

            // Analisar cada produto
            produtos.forEach(produto => {
                const estoque = parseFloat(produto.quantidade_estoque || produto.quantidade || 0);
                const estoqueMinimo = parseFloat(produto.estoque_minimo || 10);
                const estoqueCriticoNivel = estoqueMinimo * 0.5; // 50% do mínimo

                if (estoque <= estoqueCriticoNivel) {
                    estoqueCritico++;
                } else if (estoque <= estoqueMinimo) {
                    estoqueBaixo++;
                } else {
                    estoqueOk++;
                }
            });

            // Atualizar displays
            if (statTotal) statTotal.textContent = totalProdutos;
            if (statBaixo) statBaixo.textContent = estoqueBaixo;
            if (statCritico) statCritico.textContent = estoqueCritico;
            if (statOk) statOk.textContent = estoqueOk;

            daçãosProdutosCache = produtos;
            ultimaAtualizacao.produtos = Date.now();

            console.log(`✅ Contaçãores de produtos atualizaçãos:`);
            console.log(`   Total: ${totalProdutos}`);
            console.log(`   Estoque Baixo: ${estoqueBaixo}`);
            console.log(`   Estoque Crítico: ${estoqueCritico}`);
            console.log(`   Estoque Normal: ${estoqueOk}`);

        } catch (error) {
            console.error('❌ Erro ao atualizar contaçãores de produtos:', error);
        }
    }

    // ============================================
    // FUNÇÃO: ATUALIZAR PAGINAÇÃO
    // ============================================
    function atualizarPaginacao(paginaAtual, totalPaginas) {
        try {
            const currentPageEl = document.getElementById('current-page');
            const totalPagesEl = document.getElementById('total-pages');
            const btnFirst = document.getElementById('btn-first-page');
            const btnPrev = document.getElementById('btn-prev-page');
            const btnNext = document.getElementById('btn-next-page');
            const btnLast = document.getElementById('btn-last-page');

            if (currentPageEl) currentPageEl.textContent = paginaAtual;
            if (totalPagesEl) totalPagesEl.textContent = totalPaginas;

            // Desabilitar botões conforme necessário
            if (btnFirst) btnFirst.disabled = paginaAtual <= 1;
            if (btnPrev) btnPrev.disabled = paginaAtual <= 1;
            if (btnNext) btnNext.disabled = paginaAtual >= totalPaginas;
            if (btnLast) btnLast.disabled = paginaAtual >= totalPaginas;

            console.log(`📄 Paginação atualizada: ${paginaAtual}/${totalPaginas}`);

        } catch (error) {
            console.error('❌ Erro ao atualizar paginação:', error);
        }
    }

    // ============================================
    // FUNÇÃO: ATUALIZAR TODOS OS CONTADORES
    // ============================================
    async function atualizarTodosContaçãores() {
        console.log('🔄 Atualizando todos os contaçãores...');
        
        await Promise.all([
            atualizarContaçãorMateriais(),
            atualizarContaçãoresProdutos()
        ]);

        console.log('✅ Todos os contaçãores atualizaçãos!');
    }

    // ============================================
    // OBSERVADOR DE MUDANÇA DE VIEW
    // ============================================
    function observarMudancasDeView() {
        // Observar mudanças na URL ou hash
        let ultimaView = null;

        function verificarView() {
            // Detectar view ativa
            const viewAtiva = document.querySelector('.pcp-view:not(.hidden)');
            if (!viewAtiva) return;

            const viewId = viewAtiva.id;
            
            // Se mudou de view, atualizar contaçãores relevantes
            if (viewId !== ultimaView) {
                ultimaView = viewId;
                console.log(`👁️ View mudou para: ${viewId}`);

                switch(viewId) {
                    case 'materiais-view':
                    case 'materiais':
                        atualizarContaçãorMateriais();
                        break;
                    
                    case 'gestao-produtos':
                    case 'gestao-produtos-view':
                        atualizarContaçãoresProdutos();
                        break;
                    
                    case 'dashboard':
                    case 'dashboard-view':
                        // Atualizar tudo no dashboard
                        atualizarTodosContaçãores();
                        break;
                }
            }
        }

        // Verificar a cada 500ms
        setInterval(verificarView, 500);

        // Também observar cliques nos botões de navegação
        document.addEventListener('click', function(e) {
            const btn = e.target.closest('[id^="btn-"]');
            if (btn) {
                setTimeout(verificarView, 100);
            }
        });
    }

    // ============================================
    // INTERCEPTAR FUNÇÃO showView EXISTENTE
    // ============================================
    function interceptarShowView() {
        if (typeof window.showView === 'function') {
            const originalShowView = window.showView;
            
            window.showView = function(viewName) {
                // Chamar função original
                const result = originalShowView.apply(this, arguments);
                
                // Atualizar contaçãores após mudança de view
                setTimeout(() => {
                    console.log(`🔢 Atualizando contaçãores para view: ${viewName}`);
                    
                    switch(viewName) {
                        case 'materiais':
                            atualizarContaçãorMateriais();
                            break;
                        
                        case 'gestao-produtos':
                            atualizarContaçãoresProdutos();
                            break;
                        
                        case 'dashboard':
                            atualizarTodosContaçãores();
                            break;
                    }
                }, 300);
                
                return result;
            };
            
            console.log('✅ Função showView interceptada');
        }
    }

    // ============================================
    // EVENTOS DE RECARGA
    // ============================================
    function configurarEventosRecarga() {
        // Atualizar quando materiais/produtos forem salvos
        document.addEventListener('material-salvo', () => {
            console.log('📦 Material salvo - atualizando contaçãores');
            setTimeout(atualizarContaçãorMateriais, 500);
        });

        document.addEventListener('produto-salvo', () => {
            console.log('📦 Produto salvo - atualizando contaçãores');
            setTimeout(atualizarContaçãoresProdutos, 500);
        });

        // Interceptar fetch para detectar POST/PUT/DELETE
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            const response = await originalFetch.apply(this, args);
            
            // Verificar se foi uma mutação
            const method = args[1].method || 'GET';
            if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
                const url = args[0];
                
                if (url.includes('/materiais')) {
                    setTimeout(atualizarContaçãorMateriais, 500);
                } else if (url.includes('/produtos')) {
                    setTimeout(atualizarContaçãoresProdutos, 500);
                }
            }
            
            return response;
        };

        console.log('✅ Eventos de recarga configuraçãos');
    }

    // ============================================
    // FUNÇÃO GLOBAL: FORÇAR ATUALIZAÇÃO
    // ============================================
    window.atualizarContaçãoresPCP = function() {
        console.log('🔄 Atualização manual de contaçãores solicitada');
        return atualizarTodosContaçãores();
    };

    // ============================================
    // INICIALIZAÇÃO
    // ============================================
    function inicializar() {
        console.log('🚀 Inicializando sistema de contaçãores...');

        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    interceptarShowView();
                    observarMudancasDeView();
                    configurarEventosRecarga();
                    atualizarTodosContaçãores();
                    console.log('✅ Sistema de contaçãores inicialização!');
                }, 1000);
            });
        } else {
            setTimeout(() => {
                interceptarShowView();
                observarMudancasDeView();
                configurarEventosRecarga();
                atualizarTodosContaçãores();
                console.log('✅ Sistema de contaçãores inicialização!');
            }, 1000);
        }

        // Atualizar contaçãores periodicamente (a cada 2 minutos)
        setInterval(() => {
            const agora = Date.now();
            
            // Atualizar materiais se passou mais de 2 minutos
            if (agora - ultimaAtualizacao.materiais > 2 * 60 * 1000) {
                atualizarContaçãorMateriais();
            }
            
            // Atualizar produtos se passou mais de 2 minutos
            if (agora - ultimaAtualizacao.produtos > 2 * 60 * 1000) {
                atualizarContaçãoresProdutos();
            }
        }, 2 * 60 * 1000);
    }

    // ============================================
    // EXPORTAR API
    // ============================================
    window.PCPContaçãores = {
        atualizarMateriais: atualizarContaçãorMateriais,
        atualizarProdutos: atualizarContaçãoresProdutos,
        atualizarTodos: atualizarTodosContaçãores,
        atualizarPaginacao: atualizarPaginacao,
        getDaçãosCache: () => ({
            materiais: daçãosMateriaisCache,
            produtos: daçãosProdutosCache
        })
    };

    // Iniciar
    inicializar();

})();
