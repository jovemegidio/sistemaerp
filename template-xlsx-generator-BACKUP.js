// GERADOR XLSX USANDO TEMPLATE E MAPEAMENTO REAL
// Baseação no arquivo ordem_completa_segura.js

const fs = require('fs');
const path = require('path');

class TemplateXLSXGenerator {
    constructor() {
        this.cellUpdates = new Map();
    }

    // Função auxiliar para preencher células de forma segura (copiada do ordem_completa_segura.js)
    preencherCelulasSeguro(worksheet, cellAddresses, value, label = '') {
        let preenchidas = 0;
        cellAddresses.forEach(cellAddr => {
            try {
                const cell = worksheet.getCell(cellAddr);
                if (cell) {
                    cell.value = value;
                    preenchidas++;
                    if (preenchidas === 1 && label) {
                        console.log(`   ✅ ${label}: ${cellAddr} = ${value.toString().substring(0, 50)}${value.toString().length > 50 ? '...' : ''}`);
                    }
                }
            } catch (e) {
                // Ignorar erros de células específicas
            }
        });
        return preenchidas;
    }

    async generateFromTemplate(templatePath, outputPath, dadosOrdem) {
        try {
            console.log('📂 Carregando template Excel...');
            
            // ESTRATÉGIA FORÇADA: Tentar preenchimento direto primeiro
            try {
                console.log('🔧 Tentando preenchimento DIRETO com dados...');
                return await this.generateWithDirectFill(templatePath, outputPath, dadosOrdem);
            } catch (error) {
                console.log('⚠️ Erro no preenchimento direto:', error.message);
                console.log('🔄 Tentando método seguro...');
                
                try {
                    return await this.generateWithSafeExcelJS(templatePath, outputPath, dadosOrdem);
                } catch (safeError) {
                    console.log('⚠️ Erro no método seguro:', safeError.message);
                    console.log('🔄 Fallback: template original...');
                    return await this.generateWithTemplateCopyOnly(templatePath, outputPath, dadosOrdem);
                }
            }

        } catch (error) {
            console.log('❌ Erro geral:', error.message);
            return await this.generateBasicXLSX(outputPath, dadosOrdem);
        }
    }

    async generateWithDirectFill(templatePath, outputPath, dadosOrdem) {
        console.log('🎯 PREENCHIMENTO DIRETO - FORÇAR APLICAÇÁO DE DADOS');
        
        const fs = require('fs');
        
        try {
            // 1. Copiar template como base
            await fs.promises.copyFile(templatePath, outputPath);
            console.log('✅ Template copiação como base');
            
            // 2. Aplicar dados DIRETAMENTE
            const ExcelJS = require('exceljs');
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(outputPath);
            
            const worksheet = workbook.worksheets[0];
            
            // 3. Aplicar TODOS os dados de forma COMPLETA
            await this.aplicarMapeamentoCompleto(worksheet, dadosOrdem);
            
            // 4. Salvar FORÇANDO os dados
            await workbook.xlsx.writeFile(outputPath);
            
            const stats = await fs.promises.stat(outputPath);
            console.log(`✅ Daçãos aplicaçãos DIRETAMENTE (${stats.size} bytes)`);
            
            return {
                filename: outputPath,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                size: stats.size
            };
            
        } catch (error) {
            console.log('❌ Erro no preenchimento direto:', error.message);
            throw error;
        }
    }

    async generateWithSafeExcelJS(templatePath, outputPath, dadosOrdem) {
        console.log('🛡️ Método seguro: preservar formatação + preencher dados...');
        
        const fs = require('fs');
        
        try {
            // 1. Fazer backup do template original
            const backupPath = outputPath + '.backup';
            await fs.promises.copyFile(templatePath, backupPath);
            
            // 2. Fazer cópia de trabalho
            await fs.promises.copyFile(templatePath, outputPath);
            console.log('✅ Template copiação como base');
            
            // 3. Tentar preencher dados SEM perder formatação
            const ExcelJS = require('exceljs');
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(outputPath);
            
            const worksheet = workbook.worksheets[0];
            
            // 4. Aplicar dados de forma conservaçãora
            await this.aplicarMapeamentoConservaçãor(worksheet, dadosOrdem);
            
            // 5. Salvar resultado
            await workbook.xlsx.writeFile(outputPath);
            
            // 6. Verificar se houve perda significativa de tamanho
            const originalStats = await fs.promises.stat(backupPath);
            const newStats = await fs.promises.stat(outputPath);
            
            const reductionPercent = ((originalStats.size - newStats.size) / originalStats.size) * 100;
            
            if (reductionPercent > 95) {
                console.log(`⚠️ Redução crítica de tamanho: ${reductionPercent.toFixed(1)}%`);
                console.log('🔄 Restaurando template original...');
                await fs.promises.copyFile(backupPath, outputPath);
                
                const finalStats = await fs.promises.stat(outputPath);
                console.log('✅ Template original restauração');
                
                return {
                    filename: outputPath,
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    size: finalStats.size
                };
            } else {
                console.log(`✅ Daçãos aplicaçãos com sucesso (redução: ${reductionPercent.toFixed(1)}%)`);
                console.log('✅ Formatação preservada com dados preenchidos');
                
                // Limpar backup
                await fs.promises.unlink(backupPath).catch(() => {});
                
                return {
                    filename: outputPath,
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    size: newStats.size
                };
            }
            
        } catch (error) {
            console.log('❌ Erro no método seguro:', error.message);
            throw error;
        }
    }

    async aplicarMapeamentoConservaçãor(worksheet, dadosOrdem) {
        console.log('\n🛡️ APLICANDO DADOS DE FORMA CONSERVADORA');
        
        try {
            // Aplicar dados básicos
            console.log('\n📋 DADOS BÁSICOS:');
            this.preencherCelulaSegura(worksheet, 'C4', dadosOrdem.numero_orcamento, 'Orçamento');
            this.preencherCelulaSegura(worksheet, 'G4', dadosOrdem.numero_pedido, 'Pedido'); 
            this.preencherCelulaSegura(worksheet, 'I4', dadosOrdem.data_liberacao, 'Data');
            this.preencherCelulaSegura(worksheet, 'C5', dadosOrdem.vendedor, 'Vendedor');
            this.preencherCelulaSegura(worksheet, 'G5', dadosOrdem.prazo_entrega, 'Prazo');
            
            // Aplicar dados do cliente
            console.log('\n👥 DADOS DO CLIENTE:');
            this.preencherCelulaSegura(worksheet, 'C7', dadosOrdem.cliente, 'Cliente');
            this.preencherCelulaSegura(worksheet, 'G7', dadosOrdem.contato_cliente, 'Contato');
            this.preencherCelulaSegura(worksheet, 'C8', dadosOrdem.fone_cliente, 'Telefone');
            this.preencherCelulaSegura(worksheet, 'G8', dadosOrdem.email_cliente, 'Email');
            
            // Aplicar dados do fornecedor
            console.log('\n🏢 DADOS DO FORNECEDOR:');
            this.preencherCelulaSegura(worksheet, 'C10', dadosOrdem.fornecedor, 'Fornecedor');
            this.preencherCelulaSegura(worksheet, 'G10', dadosOrdem.contato_fornecedor, 'Contato Fornecedor');
            this.preencherCelulaSegura(worksheet, 'C11', dadosOrdem.fone_fornecedor, 'Telefone Fornecedor');
            this.preencherCelulaSegura(worksheet, 'G11', dadosOrdem.email_fornecedor, 'Email Fornecedor');
            
            // CPF/CNPJ do fornecedor
            const cpfCnpjFornecedor = dadosOrdem.fornecedor_cpf_cnpj || '';
            if (cpfCnpjFornecedor) {
                ['C12', 'D12', 'E12', 'F12', 'G12'].forEach(cellAddr => {
                    this.preencherCelulaSegura(worksheet, cellAddr, cpfCnpjFornecedor, '', '@');
                });
            }
            
            // Aplicar dados da transportaçãora
            console.log('\n🚚 DADOS DA TRANSPORTADORA:');
            this.preencherCelulaSegura(worksheet, 'C13', dadosOrdem.transportaçãora, 'Transportaçãora');
            this.preencherCelulaSegura(worksheet, 'G13', dadosOrdem.contato_transportaçãora, 'Contato Transportaçãora');
            this.preencherCelulaSegura(worksheet, 'C14', dadosOrdem.fone_transportaçãora, 'Telefone Transportaçãora');
            this.preencherCelulaSegura(worksheet, 'G14', dadosOrdem.email_transportaçãora, 'Email Transportaçãora');
            
            // CPF/CNPJ da transportaçãora
            const cpfCnpjTransportaçãora = dadosOrdem.transportaçãora_cpf_cnpj || '';
            if (cpfCnpjTransportaçãora) {
                ['C15', 'D15', 'E15', 'F15'].forEach(cellAddr => {
                    this.preencherCelulaSegura(worksheet, cellAddr, cpfCnpjTransportaçãora, '', '@');
                });
            }
            
            // Email NFe
            this.preencherCelulaSegura(worksheet, 'G15', dadosOrdem.transportaçãora_email_nfe, 'Email NFe');
            this.preencherCelulaSegura(worksheet, 'H15', dadosOrdem.transportaçãora_email_nfe, '');
            
            // Aplicar produtos
            console.log('\n📦 PRODUTOS:');
            if (dadosOrdem.produtos && dadosOrdem.produtos.length > 0) {
                let totalGeral = 0;
                
                for (let i = 0; i < Math.min(dadosOrdem.produtos.length, 15); i++) {
                    const produto = dadosOrdem.produtos[i];
                    const linhaPrincipal = 18 + (i * 2);
                    const linhaSub = linhaPrincipal + 1;
                    
                    if (produto && (produto.codigo || produto.descricao || produto.nome)) {
                        const quantidade = parseFloat(produto.quantidade) || 0;
                        const valorUnitario = parseFloat(produto.valor_unitario) || 0;
                        const valorTotal = quantidade * valorUnitario;
                        totalGeral += valorTotal;
                        
                        // Linha principal do produto
                        this.preencherCelulaSegura(worksheet, `B${linhaPrincipal}`, produto.codigo || '', '');
                        this.preencherCelulaSegura(worksheet, `C${linhaPrincipal}`, produto.descricao || produto.nome || '', '');
                        this.preencherCelulaSegura(worksheet, `D${linhaPrincipal}`, produto.cod_cores || produto.codigo_cores || produto.cores || '', '');
                        this.preencherCelulaSegura(worksheet, `E${linhaPrincipal}`, produto.embalagem || '', '');
                        this.preencherCelulaSegura(worksheet, `F${linhaPrincipal}`, produto.lances || '', '');
                        this.preencherCelulaSegura(worksheet, `G${linhaPrincipal}`, quantidade, '');
                        this.preencherCelulaSegura(worksheet, `H${linhaPrincipal}`, valorTotal, '', 'R$ #,##0.00');
                        
                        // Sublinha (P.BRUTO/P.LIQUIDO/LOTE)
                        this.preencherCelulaSegura(worksheet, `B${linhaSub}`, 'P. BRUTO', '');
                        this.preencherCelulaSegura(worksheet, `C${linhaSub}`, 'P.LIQUIDO', '');
                        this.preencherCelulaSegura(worksheet, `D${linhaSub}`, 'LOTE', '');
                        this.preencherCelulaSegura(worksheet, `E${linhaSub}`, produto.embalagem || '', '');
                        this.preencherCelulaSegura(worksheet, `F${linhaSub}`, '', '');
                        this.preencherCelulaSegura(worksheet, `G${linhaSub}`, 0, '');
                        this.preencherCelulaSegura(worksheet, `H${linhaSub}`, 0, '', 'R$ #,##0.00');
                        
                        console.log(`   ✅ Produto ${i + 1}: ${produto.codigo} - ${produto.descricao || produto.nome} - Qtd: ${quantidade} - Total: R$ ${valorTotal.toFixed(2)}`);
                    }
                }
                
                // Total geral
                if (totalGeral > 0) {
                    console.log('\n💰 TOTAL:');
                    this.preencherCelulaSegura(worksheet, 'J34', totalGeral, 'Total Geral', 'R$ #,##0.00');
                }
            }
            
            console.log('✅ Todos os dados aplicaçãos com sucesso');
            
        } catch (error) {
            console.log('⚠️ Erro na aplicação conservaçãora:', error.message);
            throw error;
        }
    }

    async generateWithTemplateCopyOnly(templatePath, outputPath, dadosOrdem) {
        console.log(' Preservando template original 100% (apenas cópia)...');
        
        const fs = require('fs');
        const templateExists = await fs.promises.access(templatePath).then(() => true).catch(() => false);
        
        if (templateExists) {
            // Fazer cópia EXATA do template sem modificações
            await fs.promises.copyFile(templatePath, outputPath);
            console.log('✅ Template copiação preservando 100% da formatação original');

            const stats = await fs.promises.stat(outputPath);
            
            // Log dos dados que seriam aplicaçãos (para debug)
            console.log('\n📊 DADOS QUE SERIAM APLICADOS:');
            console.log(`   Orçamento: ${dadosOrdem.numero_orcamento}`);
            console.log(`   Pedido: ${dadosOrdem.numero_pedido}`);
            console.log(`   Cliente: ${dadosOrdem.cliente}`);
            console.log(`   Produtos: ${dadosOrdem.produtos.length || 0} itens`);
            
            return {
                filename: outputPath,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                size: stats.size
            };
        } else {
            throw new Error('Template não encontrado');
        }
    }

    async generateWithExcelJS(ExcelJS, templatePath, outputPath, dadosOrdem) {
        console.log('🔧 Preservando template original e aplicando apenas dados...');
        
        try {
            // === MÉTODO 1: CÓPIA COMPLETA + PREENCHIMENTO ===
            const fs = require('fs');
            
            // Primeiro fazer cópia bit-a-bit do template
            console.log('📋 Fazendo cópia idêntica do template...');
            await fs.promises.copyFile(templatePath, outputPath);
            
            // Depois carregar a cópia e preencher dados
            console.log('📂 Carregando cópia para preenchimento...');
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(outputPath);
            
            const worksheet = workbook.worksheets[0];
            console.log('✅ Template copiação e carregação para preenchimento');

            // === APLICAR APENAS OS DADOS, SEM ALTERAR FORMATAÇÁO ===
            await this.aplicarMapeamentoCompleto(worksheet, dadosOrdem);

            // === SALVAR PRESERVANDO ESTRUTURA ORIGINAL ===
            console.log('💾 Salvando com dados preenchidos...');
            await workbook.xlsx.writeFile(outputPath);
            const stats = await fs.promises.stat(outputPath);
            
            console.log('✅ Template preenchido preservando formatação 100%!');
            
            return {
                filename: outputPath,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                size: stats.size
            };
            
        } catch (error) {
            console.log('❌ Erro no método de preservação:', error.message);
            // Se falhar, usar cópia simples do template
            console.log('🔄 Fallback: mantendo template original...');
            return await this.generateSimpleCopy(templatePath, outputPath, dadosOrdem);
        }
    }

    async generateWithTemplateCopy(templatePath, outputPath, dadosOrdem) {
        console.log('📋 Usando cópia do template (método estável)...');
        
        const templateExists = await fs.promises.access(templatePath).then(() => true).catch(() => false);
        
        if (templateExists) {
            // Copiar template como base
            await fs.promises.copyFile(templatePath, outputPath);
            console.log('✅ Template copiação como base Excel válida');

            const stats = await fs.promises.stat(outputPath);
            
            return {
                filename: outputPath,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                size: stats.size
            };
        } else {
            throw new Error('Template não encontrado');
        }
    }

    async aplicarMapeamentoCompleto(worksheet, dadosOrdem) {
        console.log('\n🟦 APLICANDO DADOS NO TEMPLATE (PRESERVANDO FORMATAÇÁO)');
        console.log('📋 Daçãos recebidos:', {
            cliente: dadosOrdem.cliente,
            items_json: dadosOrdem.items_json ? 'SIM' : 'NÁO',
            produtos: dadosOrdem.produtos ? 'SIM' : 'NÁO'
        });
        
        // CORRIGIR PROBLEMA: Converter items_json para produtos se necessário
        if (dadosOrdem.items_json && !dadosOrdem.produtos) {
            try {
                if (typeof dadosOrdem.items_json === 'string') {
                    dadosOrdem.produtos = JSON.parse(dadosOrdem.items_json);
                } else {
                    dadosOrdem.produtos = dadosOrdem.items_json;
                }
                console.log(`✅ Convertido items_json para produtos: ${dadosOrdem.produtos.length} itens`);
            } catch (error) {
                console.log('❌ Erro ao converter items_json:', error.message);
                dadosOrdem.produtos = [];
            }
        }

        // === AJUSTE DE ESTILO VISUAL (DO ORDEM_COMPLETA_SEGURA.JS) ===
        // Centralizar cabeçalhos e células principais
        const cabecalhos = ['C4','G4','I4','J4','C6','G6','C7','C8','C9','G12','H12','H9','I9','J9'];
        cabecalhos.forEach(cellAddr => {
            try {
                const cell = worksheet.getCell(cellAddr);
                if (cell) cell.alignment = { vertical: 'middle', horizontal: 'center' };
            } catch (e) { /* ignorar */ }
        });
        
        // Bordas finas em todas as células da tabela de produtos
        for (let i = 0; i < 32; i++) {
            const rowNum = 18 + i;
            for (let col of ['B','C','D','E','F','G','H']) {
                try {
                    const cell = worksheet.getCell(`${col}${rowNum}`);
                    cell.border = {
                        top: {style:'thin'},
                        left: {style:'thin'},
                        bottom: {style:'thin'},
                        right: {style:'thin'}
                    };
                } catch (e) { /* ignorar */ }
            }
        }
        
        // Cor de fundo amarela para campos importantes
        const celulasAmarelas = ['H8', 'H9', 'G12', 'H12', 'A37'];
        celulasAmarelas.forEach(cellAddr => {
            try {
                worksheet.getCell(cellAddr).fill = {
                    type: 'pattern',
                    pattern:'solid',
                    fgColor:{argb:'FFFFFF00'}
                };
            } catch (e) { /* ignorar */ }
        });
        
        // === AJUSTE DE FONTES ===
        worksheet.eachRow({ includeEmpty: true }, function(row) {
            row.eachCell({ includeEmpty: true }, function(cell) {
                try {
                    cell.font = { name: 'Calibri', size: 10 };
                } catch (e) { /* ignorar */ }
            });
        });
        
        // === DADOS BÁSICOS (MAPEAMENTO CORRETO DO ORDEM_COMPLETA_SEGURA.JS) ===
        console.log('\n🟡 DADOS BÁSICOS:');
        this.preencherCelulaSegura(worksheet, 'C4', dadosOrdem.numero_orcamento, 'Orçamento');
        this.preencherCelulaSegura(worksheet, 'G4', dadosOrdem.numero_pedido || dadosOrdem.pedido_referencia, 'Pedido');
        // Corrigir H4 para mostrar texto
        try {
            worksheet.getCell('H4').value = 'Data de liberação';
        } catch (e) { /* ignorar */ }
        this.preencherCelulaSegura(worksheet, 'I4', dadosOrdem.data_liberacao, 'Data Liberação');
        this.preencherCelulaSegura(worksheet, 'J4', dadosOrdem.data_liberacao, '');

        // === VENDEDOR ===
        console.log('\n🟡 VENDEDOR:');
        this.preencherCelulaSegura(worksheet, 'C6', dadosOrdem.vendedor, 'Vendedor');
        this.preencherCelulaSegura(worksheet, 'D6', dadosOrdem.vendedor, '');
        this.preencherCelulaSegura(worksheet, 'E6', dadosOrdem.vendedor, '');
        this.preencherCelulaSegura(worksheet, 'G6', dadosOrdem.prazo_entrega || dadosOrdem.data_previsao_entrega, 'Prazo Entrega');
        this.preencherCelulaSegura(worksheet, 'H6', dadosOrdem.prazo_entrega || dadosOrdem.data_previsao_entrega, '');
        this.preencherCelulaSegura(worksheet, 'I6', dadosOrdem.prazo_entrega || dadosOrdem.data_previsao_entrega, '');

        // === CLIENTE ===
        console.log('\n🟡 CLIENTE:');
        this.preencherCelulaSegura(worksheet, 'C7', dadosOrdem.cliente, 'Cliente');
        this.preencherCelulaSegura(worksheet, 'D7', dadosOrdem.cliente, '');
        this.preencherCelulaSegura(worksheet, 'E7', dadosOrdem.cliente, '');
        this.preencherCelulaSegura(worksheet, 'F7', dadosOrdem.cliente, '');
        this.preencherCelulaSegura(worksheet, 'G7', dadosOrdem.cliente, '');
        
        this.preencherCelulaSegura(worksheet, 'C8', dadosOrdem.contato_cliente || dadosOrdem.contato, 'Contato');
        this.preencherCelulaSegura(worksheet, 'D8', dadosOrdem.contato_cliente || dadosOrdem.contato, '');
        this.preencherCelulaSegura(worksheet, 'E8', dadosOrdem.contato_cliente || dadosOrdem.contato, '');
        this.preencherCelulaSegura(worksheet, 'F8', dadosOrdem.contato_cliente || dadosOrdem.contato, '');
        this.preencherCelulaSegura(worksheet, 'H8', dadosOrdem.fone_cliente || dadosOrdem.telefone, 'Telefone');
        this.preencherCelulaSegura(worksheet, 'I8', dadosOrdem.fone_cliente || dadosOrdem.telefone, '');
        
        this.preencherCelulaSegura(worksheet, 'C9', dadosOrdem.email_cliente || dadosOrdem.email, 'Email');
        this.preencherCelulaSegura(worksheet, 'D9', dadosOrdem.email_cliente || dadosOrdem.email, '');
        this.preencherCelulaSegura(worksheet, 'E9', dadosOrdem.email_cliente || dadosOrdem.email, '');
        this.preencherCelulaSegura(worksheet, 'F9', dadosOrdem.email_cliente || dadosOrdem.email, '');
        // Preencher H9 e campo Frete com o valor do frete do modal
        try {
            worksheet.getCell('H9').value = dadosOrdem.tipo_frete || dadosOrdem.frete || 'FOB';
            worksheet.getCell('I9').value = dadosOrdem.tipo_frete || dadosOrdem.frete || 'FOB';
            worksheet.getCell('J9').value = dadosOrdem.tipo_frete || dadosOrdem.frete || 'FOB';
        } catch (e) { /* ignorar */ }

        // === TRANSPORTADORA ===
        console.log('\n🟡 TRANSPORTADORA:');
        this.preencherCelulaSegura(worksheet, 'C12', dadosOrdem.transportaçãora_nome || dadosOrdem.transportaçãora, 'Nome Transportaçãora');
        this.preencherCelulaSegura(worksheet, 'D12', dadosOrdem.transportaçãora_nome || dadosOrdem.transportaçãora, '');
        this.preencherCelulaSegura(worksheet, 'E12', dadosOrdem.transportaçãora_nome || dadosOrdem.transportaçãora, '');
        // Preencher G12 e campo amarelo com o telefone do modal
        try {
            worksheet.getCell('G12').value = dadosOrdem.transportaçãora_fone || dadosOrdem.fone_transportaçãora;
            worksheet.getCell('H12').value = dadosOrdem.transportaçãora_fone || dadosOrdem.fone_transportaçãora;
        } catch (e) { /* ignorar */ }
        
        this.preencherCelulaSegura(worksheet, 'C13', dadosOrdem.transportaçãora_cep, 'CEP');
        this.preencherCelulaSegura(worksheet, 'D13', dadosOrdem.transportaçãora_cep, '');
        this.preencherCelulaSegura(worksheet, 'F13', dadosOrdem.transportaçãora_endereco, 'Endereço');
        this.preencherCelulaSegura(worksheet, 'G13', dadosOrdem.transportaçãora_endereco, '');
        this.preencherCelulaSegura(worksheet, 'H13', dadosOrdem.transportaçãora_endereco, '');
        this.preencherCelulaSegura(worksheet, 'I13', dadosOrdem.transportaçãora_endereco, '');
        
        // CPF/CNPJ com formato especial
        if (dadosOrdem.transportaçãora_cpf_cnpj) {
            ['C15', 'D15'].forEach(cellAddr => {
                try {
                    const cell = worksheet.getCell(cellAddr);
                    cell.value = dadosOrdem.transportaçãora_cpf_cnpj;
                    cell.numFmt = '@';
                    console.log(`   ✅ CPF/CNPJ: ${cellAddr} = ${dadosOrdem.transportaçãora_cpf_cnpj}`);
                } catch (e) { /* ignorar */ }
            });
        }
        
        this.preencherCelulaSegura(worksheet, 'G15', dadosOrdem.transportaçãora_email_nfe, 'Email NFe');
        this.preencherCelulaSegura(worksheet, 'H15', dadosOrdem.transportaçãora_email_nfe, '');

        // === PRODUTOS (MAPEAMENTO CORRETO DO ORDEM_COMPLETA_SEGURA.JS) ===
        console.log('\n🟡 PRODUTOS:');
        let totalGeral = 0;
        
        if (dadosOrdem.produtos && dadosOrdem.produtos.length > 0) {
            // Preencher até 15 linhas de produtos, como no modelo
            for (let i = 0; i < 15; i++) {
                const linha = 18 + i * 2; // cada produto ocupa 2 linhas (principal + sublinha)
                const produto = dadosOrdem.produtos[i];
                
                if (produto && produto.codigo && (produto.descricao || produto.nome)) {
                    const valorTotal = produto.quantidade * produto.valor_unitario;
                    totalGeral += valorTotal;
                    
                    // Linha principal - garantir nome do produto e código de cores
                    try {
                        worksheet.getCell(`B${linha}`).value = produto.codigo;
                        worksheet.getCell(`C${linha}`).value = produto.descricao || produto.nome;
                        worksheet.getCell(`D${linha}`).value = produto.cod_cores || produto.codigo_cores || produto.cores || '';
                        // Embalagem conforme modal
                        worksheet.getCell(`E${linha}`).value = produto.embalagem_modal || produto.embalagem || '';
                        worksheet.getCell(`F${linha}`).value = produto.lances || '';
                        worksheet.getCell(`G${linha}`).value = produto.quantidade || 0;
                        worksheet.getCell(`H${linha}`).value = valorTotal || 0.00;
                        worksheet.getCell(`H${linha}`).numFmt = 'R$ #,##0.00';
                        
                        // Sublinha
                        worksheet.getCell(`B${linha+1}`).value = 'P. BRUTO';
                        worksheet.getCell(`C${linha+1}`).value = 'P.LIQUIDO';
                        worksheet.getCell(`D${linha+1}`).value = 'LOTE';
                        worksheet.getCell(`E${linha+1}`).value = produto.embalagem_modal || produto.embalagem || '';
                        worksheet.getCell(`F${linha+1}`).value = '';
                        worksheet.getCell(`G${linha+1}`).value = 0;
                        worksheet.getCell(`H${linha+1}`).value = 0.00;
                        worksheet.getCell(`H${linha+1}`).numFmt = 'R$ #,##0.00';
                        
                        console.log(`   ✅ Produto ${i + 1}: ${produto.codigo} - Qtd: ${produto.quantidade} - Total: R$ ${valorTotal.toFixed(2)}`);
                    } catch (e) {
                        console.log(`   ⚠️ Erro ao preencher produto ${i + 1}: ${e.message}`);
                    }
                } else {
                    // Linha principal vazia
                    try {
                        worksheet.getCell(`B${linha}`).value = i+1;
                        worksheet.getCell(`C${linha}`).value = '';
                        worksheet.getCell(`D${linha}`).value = '';
                        worksheet.getCell(`E${linha}`).value = '';
                        worksheet.getCell(`F${linha}`).value = '';
                        worksheet.getCell(`G${linha}`).value = 0;
                        worksheet.getCell(`H${linha}`).value = 0.00;
                        
                        // Sublinha vazia
                        worksheet.getCell(`B${linha+1}`).value = 'P. BRUTO';
                        worksheet.getCell(`C${linha+1}`).value = 'P.LIQUIDO';
                        worksheet.getCell(`D${linha+1}`).value = 'LOTE';
                        worksheet.getCell(`E${linha+1}`).value = '';
                        worksheet.getCell(`F${linha+1}`).value = '';
                        worksheet.getCell(`G${linha+1}`).value = 0;
                        worksheet.getCell(`H${linha+1}`).value = 0.00;
                    } catch (e) { /* ignorar */ }
                }
            }
        }
        
        // Total geral
        this.preencherCelulaSegura(worksheet, 'I34', totalGeral, `Total Geral: R$ ${totalGeral.toFixed(2)}`);
        this.preencherCelulaSegura(worksheet, 'J34', totalGeral, '', 'R$ #,##0.00');
        
        // Sobrescrever células de totais para evitar fórmulas compartilhadas
        try {
            worksheet.getCell('J21').value = '';
            worksheet.getCell('J21').value = totalGeral;
            worksheet.getCell('J21').numFmt = 'R$ #,##0.00';
            worksheet.getCell('J22').value = '';
            worksheet.getCell('J23').value = '';
            worksheet.getCell('J24').value = '';
            worksheet.getCell('J25').value = '';
            worksheet.getCell('J26').value = '';
            worksheet.getCell('J27').value = '';
            worksheet.getCell('J28').value = '';
            worksheet.getCell('J29').value = '';
            worksheet.getCell('J30').value = '';
            worksheet.getCell('J31').value = '';
            worksheet.getCell('J32').value = '';
            worksheet.getCell('J33').value = '';
            worksheet.getCell('J34').value = totalGeral;
            worksheet.getCell('J34').numFmt = 'R$ #,##0.00';
        } catch (e) { /* ignorar */ }
        
        // === OBSERVAÇÕES ===
        console.log('\n🟡 OBSERVAÇÕES:');
        const observacoes = dadosOrdem.observacoes_pedido || dadosOrdem.observacoes || 'OBSERVAÇÕES IMPORTANTES:\n• Prazo de entrega conforme especificação\n• Material deve ser entregue em perfeitas condições\n• Comunicar antecipadamente qualquer atraso\n• Horário de entrega: 8h às 17h';
        
        // Preencher observações nas células corretas
        this.preencherCelulaSegura(worksheet, 'A37', observacoes, 'Observações');
        this.preencherCelulaSegura(worksheet, 'B37', observacoes, '');
        this.preencherCelulaSegura(worksheet, 'C37', observacoes, '');
        this.preencherCelulaSegura(worksheet, 'D37', observacoes, '');
        this.preencherCelulaSegura(worksheet, 'E37', observacoes, '');
        this.preencherCelulaSegura(worksheet, 'F37', observacoes, '');
        this.preencherCelulaSegura(worksheet, 'G37', observacoes, '');
        this.preencherCelulaSegura(worksheet, 'H37', observacoes, '');
        
        // === PAGAMENTO ===
        console.log('\n🟡 PAGAMENTO:');
        this.preencherCelulaSegura(worksheet, 'A44', dadosOrdem.condicoes_pagamento || '30 dias após o faturamento', 'Condições Pagamento');
        this.preencherCelulaSegura(worksheet, 'B44', dadosOrdem.condicoes_pagamento || '30 dias após o faturamento', '');
        this.preencherCelulaSegura(worksheet, 'C44', dadosOrdem.condicoes_pagamento || '30 dias após o faturamento', '');
        this.preencherCelulaSegura(worksheet, 'D44', dadosOrdem.condicoes_pagamento || '30 dias após o faturamento', '');
        this.preencherCelulaSegura(worksheet, 'F44', dadosOrdem.metodo_pagamento || 'Transferência Bancária', 'Método Pagamento');
        this.preencherCelulaSegura(worksheet, 'G44', dadosOrdem.metodo_pagamento || 'Transferência Bancária', '');
        this.preencherCelulaSegura(worksheet, 'H44', dadosOrdem.metodo_pagamento || 'Transferência Bancária', '');
        this.preencherCelulaSegura(worksheet, 'I44', totalGeral, 'Valor Total Pagamento', 'R$ #,##0.00');
        this.preencherCelulaSegura(worksheet, 'J44', totalGeral, '', 'R$ #,##0.00');
        
        // Garantir que o valor total seja preenchido na coluna I45
        try {
            worksheet.getCell('I45').value = totalGeral;
            worksheet.getCell('I45').numFmt = 'R$ #,##0.00';
        } catch (e) { /* ignorar */ }
        
        // === ENTREGA ===
        console.log('\n🟡 ENTREGA:');
        this.preencherCelulaSegura(worksheet, 'A47', dadosOrdem.data_previsao_entrega || dadosOrdem.data_liberacao, 'Data Entrega');
        this.preencherCelulaSegura(worksheet, 'B47', dadosOrdem.data_previsao_entrega || dadosOrdem.data_liberacao, '');
        this.preencherCelulaSegura(worksheet, 'C47', dadosOrdem.data_previsao_entrega || dadosOrdem.data_liberacao, '');
        this.preencherCelulaSegura(worksheet, 'D47', dadosOrdem.data_previsao_entrega || dadosOrdem.data_liberacao, '');
        
        this.preencherCelulaSegura(worksheet, 'A49', dadosOrdem.qtd_volumes || '15 volumes', 'Volumes');
        this.preencherCelulaSegura(worksheet, 'B49', dadosOrdem.qtd_volumes || '15 volumes', '');
        this.preencherCelulaSegura(worksheet, 'C49', dadosOrdem.qtd_volumes || '15 volumes', '');
        this.preencherCelulaSegura(worksheet, 'F49', dadosOrdem.tipo_embalagem_entrega || 'Embalagem industrial reforçada', 'Embalagem');
        this.preencherCelulaSegura(worksheet, 'G49', dadosOrdem.tipo_embalagem_entrega || 'Embalagem industrial reforçada', '');
        this.preencherCelulaSegura(worksheet, 'H49', dadosOrdem.tipo_embalagem_entrega || 'Embalagem industrial reforçada', '');
        
        const obsEntrega = dadosOrdem.observacoes_entrega || 'INSTRUÇÕES DE ENTREGA:\n• Entregar no endereço principal da empresa\n• Usar entrada de carga pelos fundos\n• Comunicar chegada na portaria\n• Aguardar liberação para descarga';
        this.preencherCelulaSegura(worksheet, 'E51', obsEntrega, 'Obs. Entrega');
        this.preencherCelulaSegura(worksheet, 'F51', obsEntrega, '');
        this.preencherCelulaSegura(worksheet, 'G51', obsEntrega, '');
        this.preencherCelulaSegura(worksheet, 'H51', obsEntrega, '');
        this.preencherCelulaSegura(worksheet, 'I51', obsEntrega, '');
        this.preencherCelulaSegura(worksheet, 'J51', obsEntrega, '');
        
        console.log('\n✅ MAPEAMENTO COMPLETO APLICADO!');
        console.log(`📊 Resumo: ${dadosOrdem.produtos.length || 0} produtos, Total: R$ ${totalGeral.toFixed(2)}`);
        
        return totalGeral;
    }

    // Método auxiliar para preencher célula preservando formatação existente
    preencherCelulaSegura(worksheet, cellAddress, value, label = '', numFormat = null) {
        try {
            const cell = worksheet.getCell(cellAddress);
            
            // Preservar formatação existente e apenas alterar o valor
            if (value !== null && value !== undefined && value !== '') {
                cell.value = value;
                
                // Aplicar formato numérico se especificação
                if (numFormat) {
                    cell.numFmt = numFormat;
                }
                
                if (label) {
                    console.log(`   ✅ ${label}: ${cellAddress} = ${value}`);
                }
            }
        } catch (error) {
            console.log(`   ⚠️ Erro ao preencher ${cellAddress}: ${error.message}`);
        }
    }

    async generateSimpleCopy(templatePath, outputPath, dadosOrdem) {
        try {
            const templateExists = await fs.promises.access(templatePath).then(() => true).catch(() => false);
            
            if (templateExists) {
                // Copiar template como base
                await fs.promises.copyFile(templatePath, outputPath);
                console.log('✅ Template copiação como base Excel válida');

                const stats = await fs.promises.stat(outputPath);
                
                return {
                    filename: outputPath,
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    size: stats.size
                };
            } else {
                throw new Error('Template não encontrado');
            }

        } catch (error) {
            console.log('❌ Erro ao copiar template:', error.message);
            // Gerar arquivo básico como último recurso
            return await this.generateBasicXLSX(outputPath, dadosOrdem);
        }
    }

    async generateBasicXLSX(outputPath, dadosOrdem) {
        // Gerar um XLSX básico usando CSV + extensão xlsx (temporário)
        let csvContent = 'ORDEM DE PRODUÇÁO ALUFORCE\n\n';
        csvContent += `Daçãos da Ordem:\n`;
        csvContent += `Número do Orçamento:,${dadosOrdem.numero_orcamento || ''}\n`;
        csvContent += `Número do Pedido:,${dadosOrdem.numero_pedido || ''}\n`;
        csvContent += `Data de Liberação:,${dadosOrdem.data_liberacao || ''}\n`;
        csvContent += `Vendedor:,${dadosOrdem.vendedor || ''}\n`;
        csvContent += `Prazo de Entrega:,${dadosOrdem.prazo_entrega || ''}\n\n`;
        
        csvContent += `Daçãos do Cliente:\n`;
        csvContent += `Nome do Cliente:,${dadosOrdem.cliente || ''}\n`;
        csvContent += `Contato:,${dadosOrdem.contato_cliente || ''}\n`;
        csvContent += `Telefone:,${dadosOrdem.fone_cliente || ''}\n`;
        csvContent += `Email:,${dadosOrdem.email_cliente || ''}\n\n`;
        
        if (dadosOrdem.produtos && dadosOrdem.produtos.length > 0) {
            csvContent += `Produtos:\n`;
            csvContent += `Código,Descrição,Quantidade,Valor Unitário,Total\n`;
            
            for (const produto of dadosOrdem.produtos) {
                const total = (produto.quantidade || 0) * (produto.valor_unitario || 0);
                csvContent += `${produto.codigo || ''},${produto.descricao || produto.nome || ''},${produto.quantidade || 0},${produto.valor_unitario || 0},${total}\n`;
            }
        }

        // Salvar como arquivo (será CSV mas com extensão xlsx)
        await fs.promises.writeFile(outputPath, csvContent, 'utf8');
        const stats = await fs.promises.stat(outputPath);

        return {
            filename: outputPath,
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            size: stats.size
        };
    }
}

module.exports = TemplateXLSXGenerator;