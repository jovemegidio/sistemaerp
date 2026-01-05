/* ================================================= */
/* TESTE AUTOMATIZADO DE SEÇÕES                     */
/* ================================================= */

(function() {
    'use strict';

    // Aguardar o DOM estar pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runTests);
    } else {
        runTests();
    }

    function runTests() {
        console.log('🧪 INICIANDO TESTES DE SEÇÕES...');
        
        setTimeout(() => {
            testSectionStructure();
            testSectionNavigation();
            testSectionContent();
            testSectionIsolation();
            generateReport();
        }, 2000);
    }

    // Teste 1: Estrutura das seções
    function testSectionStructure() {
        console.log('📋 Teste 1: Estrutura das Seções');
        
        const expectedSections = [
            'dashboard-home',
            'funcionarios-section',
            'holerites-section',
            'relatórios-section',
            'cadastro-section'
        ];

        const results = {
            found: [],
            missing: [],
            duplicates: []
        };

        expectedSections.forEach(sectionId => {
            const elements = document.querySelectorAll(`#${sectionId}`);
            if (elements.length === 0) {
                results.missing.push(sectionId);
            } else if (elements.length === 1) {
                results.found.push(sectionId);
            } else {
                results.duplicates.push(sectionId);
            }
        });

        console.log('✅ Seções encontradas:', results.found);
        if (results.missing.length > 0) {
            console.warn('⚠️ Seções faltantes:', results.missing);
        }
        if (results.duplicates.length > 0) {
            console.error('❌ Seções duplicadas:', results.duplicates);
        }

        window.testResults = window.testResults || {};
        window.testResults.structure = results;
    }

    // Teste 2: Navegação entre seções
    function testSectionNavigation() {
        console.log('🧭 Teste 2: Navegação entre Seções');
        
        const navLinks = [
            { selector: '[onclick*="dashboard-home"]', target: 'dashboard-home' },
            { selector: '[onclick*="funcionarios-section"]', target: 'funcionarios-section' },
            { selector: '[onclick*="holerites-section"]', target: 'holerites-section' },
            { selector: '[onclick*="relatórios-section"]', target: 'relatórios-section' }
        ];

        const results = {
            working: [],
            broken: [],
            missing: []
        };

        navLinks.forEach(link => {
            const element = document.querySelector(link.selector);
            if (!element) {
                results.missing.push(link.target);
                return;
            }

            // Simular clique
            try {
                element.click();
                
                setTimeout(() => {
                    const targetSection = document.getElementById(link.target);
                    if (targetSection && targetSection.classList.contains('active')) {
                        results.working.push(link.target);
                        console.log(`✅ Navegação para ${link.target}: OK`);
                    } else {
                        results.broken.push(link.target);
                        console.warn(`⚠️ Navegação para ${link.target}: FALHOU`);
                    }
                }, 100);
            } catch (error) {
                results.broken.push(link.target);
                console.error(`❌ Erro na navegação para ${link.target}:`, error);
            }
        });

        window.testResults.navigation = results;
    }

    // Teste 3: Conteúdo específico de cada seção
    function testSectionContent() {
        console.log('📊 Teste 3: Conteúdo das Seções');
        
        const contentTests = [
            {
                section: 'dashboard-home',
                expectedElements: [
                    '.dashboard-grid',
                    '.widget',
                    '#dashboard-aniversariantes-list',
                    '#dashboard-avisos-list'
                ]
            },
            {
                section: 'funcionarios-section',
                expectedElements: [
                    '#employees-grid-view',
                    '#tabela-funcionarios',
                    '#search-input',
                    '.btn-primary'
                ]
            },
            {
                section: 'holerites-section',
                expectedElements: [
                    '.section-title',
                    '.dashboard-container'
                ]
            },
            {
                section: 'relatórios-section',
                expectedElements: [
                    '.reports-grid',
                    '.report-card'
                ]
            }
        ];

        const results = {};

        contentTests.forEach(test => {
            const section = document.getElementById(test.section);
            if (!section) {
                results[test.section] = { status: 'missing', elements: {} };
                return;
            }

            const elementResults = {};
            test.expectedElements.forEach(selector => {
                const elements = section.querySelectorAll(selector);
                elementResults[selector] = elements.length;
            });

            results[test.section] = {
                status: 'found',
                elements: elementResults
            };

            console.log(`📋 ${test.section}:`, elementResults);
        });

        window.testResults.content = results;
    }

    // Teste 4: Isolamento entre seções
    function testSectionIsolation() {
        console.log('🔒 Teste 4: Isolamento entre Seções');
        
        const sections = document.querySelectorAll('.content-section');
        const activeSections = [];
        const hiddenSections = [];

        sections.forEach(section => {
            const computedStyle = window.getComputedStyle(section);
            const isVisible = section.classList.contains('active') || 
                             computedStyle.display !== 'none';
            
            if (isVisible) {
                activeSections.push(section.id);
            } else {
                hiddenSections.push(section.id);
            }
        });

        const isolationOK = activeSections.length === 1;

        console.log('👁️ Seções visíveis:', activeSections);
        console.log('🙈 Seções ocultas:', hiddenSections);
        console.log(isolationOK ? '✅ Isolamento OK' : '❌ Múltiplas seções visíveis');

        window.testResults.isolation = {
            activeSections,
            hiddenSections,
            isolationOK
        };
    }

    // Gerar relatório final
    function generateReport() {
        console.log('📊 RELATÓRIO FINAL DE TESTES');
        console.log('=====================================');

        const results = window.testResults;
        
        // Estrutura
        console.log('📋 ESTRUTURA:');
        console.log(`   ✅ Seções encontradas: ${results.structure.found.length || 0}`);
        console.log(`   ⚠️ Seções faltantes: ${results.structure.missing.length || 0}`);
        console.log(`   ❌ Seções duplicadas: ${results.structure.duplicates.length || 0}`);

        // Navegação
        console.log('🧭 NAVEGAÇÁO:');
        console.log(`   ✅ Links funcionais: ${results.navigation.working.length || 0}`);
        console.log(`   ❌ Links quebraçãos: ${results.navigation.broken.length || 0}`);
        console.log(`   ⚠️ Links faltantes: ${results.navigation.missing.length || 0}`);

        // Isolamento
        console.log('🔒 ISOLAMENTO:');
        console.log(`   ${results.isolation.isolationOK ? '✅' : '❌'} Apenas uma seção ativa: ${results.isolation.activeSections.length === 1}`);
        console.log(`   👁️ Seção ativa atual: ${results.isolation.activeSections.[0] || 'nenhuma'}`);

        // Conteúdo
        console.log('📊 CONTEÚDO:');
        Object.keys(results.content || {}).forEach(section => {
            const sectionData = results.content[section];
            const elementCount = Object.values(sectionData.elements || {}).reduce((a, b) => a + b, 0);
            console.log(`   📁 ${section}: ${elementCount} elementos encontrados`);
        });

        // Criar resumo visual na página
        createVisualReport();
    }

    // Criar relatório visual na página
    function createVisualReport() {
        const existingReport = document.getElementById('test-report');
        if (existingReport) {
            existingReport.remove();
        }

        const report = document.createElement('div');
        report.id = 'test-report';
        report.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            background: white;
            border: 2px solid #2563eb;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: 'Inter', Arial, sans-serif;
            font-size: 12px;
            max-height: 400px;
            overflow-y: auto;
        `;

        const results = window.testResults;
        
        report.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0; color: #2563eb;">🧪 Relatório de Testes</h3>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 18px; cursor: pointer;">×</button>
            </div>
            
            <div style="margin-bottom: 10px;">
                <strong>📋 Estrutura:</strong><br>
                ✅ Encontradas: ${results.structure.found.length || 0}<br>
                ⚠️ Faltantes: ${results.structure.missing.length || 0}<br>
                ❌ Duplicadas: ${results.structure.duplicates.length || 0}
            </div>
            
            <div style="margin-bottom: 10px;">
                <strong>🧭 Navegação:</strong><br>
                ✅ Funcionais: ${results.navigation.working.length || 0}<br>
                ❌ Quebraçãos: ${results.navigation.broken.length || 0}<br>
                ⚠️ Faltantes: ${results.navigation.missing.length || 0}
            </div>
            
            <div style="margin-bottom: 10px;">
                <strong>🔒 Isolamento:</strong><br>
                ${results.isolation.isolationOK ? '✅' : '❌'} Seção única ativa<br>
                👁️ Ativa: ${results.isolation.activeSections.[0] || 'nenhuma'}
            </div>
            
            <div>
                <strong>📊 Conteúdo:</strong><br>
                ${Object.keys(results.content || {}).map(section => {
                    const sectionData = results.content[section];
                    const elementCount = Object.values(sectionData.elements || {}).reduce((a, b) => a + b, 0);
                    return `📁 ${section}: ${elementCount} elementos`;
                }).join('<br>')}
            </div>
            
            <div style="margin-top: 10px; text-align: center;">
                <small style="color: #6b7280;">Clique nos links do menu para testar navegação</small>
            </div>
        `;

        document.body.appendChild(report);
    }

    // Expor função para teste manual
    window.runSectionTests = runTests;

})();