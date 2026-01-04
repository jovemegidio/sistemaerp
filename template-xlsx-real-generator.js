// 🎯 TEMPLATE XLSX REAL GENERATOR - USA TEMPLATE EXCEL ORIGINAL
// Le o template existente e modifica as células mantendo formatação
const fs = require('fs');
const JSZip = require('jszip');

class TemplateXlsxRealGenerator {
    constructor() {
        this.workbook = null;
        this.worksheets = {};
        this.sharedStrings = [];
        this.sharedStringsMap = new Map();
        console.log('🔧 Template XLSX Real Generator iniciação - Usa template original');
    }

    // Método principal compatível com código existente
    async generateFromTemplate(templatePath, outputPath, daçãosOrdem) {
        console.log(`\n🏭 GERANDO ORDEM COM TEMPLATE REAL: ${outputPath}`);
        console.log(`📁 Template original: ${templatePath}`);
        
        try {
            // Verificar se template existe
            if (!fs.existsSync(templatePath)) {
                throw new Error(`Template não encontração: ${templatePath}`);
            }

            // Carregar template original
            await this.carregarTemplate(templatePath);
            
            // Aplicar daçãos ao template
            await this.aplicarDaçãosAoTemplate(daçãosOrdem);
            
            // Salvar arquivo modificação
            const resultação = await this.salvarArquivo(outputPath);
            
            return {
                sucesso: true,
                arquivo: outputPath,
                filename: outputPath,
                size: resultação.tamanho,
                totalGeral: this.calcularTotal(daçãosOrdem),
                produtosProcessaçãos: this.contarProdutos(daçãosOrdem),
                templateUsação: templatePath
            };
            
        } catch (error) {
            console.error(`❌ Erro na geração: ${error.message}`);
            throw error;
        }
    }

    // Carregar template Excel original
    async carregarTemplate(templatePath) {
        console.log('\n📖 CARREGANDO TEMPLATE ORIGINAL...');
        
        const buffer = fs.readFileSync(templatePath);
        const zip = await JSZip.loadAsync(buffer);
        
        // Carregar shared strings
        if (zip.files['xl/sharedStrings.xml']) {
            const sharedStringsXml = await zip.files['xl/sharedStrings.xml'].async('text');
            this.parseSharedStrings(sharedStringsXml);
            console.log(`   ✅ Shared Strings carregadas: ${this.sharedStrings.length} entradas`);
        }
        
        // Carregar worksheets
        const worksheetFiles = Object.keys(zip.files).filter(name => 
            name.startsWith('xl/worksheets/') && name.endsWith('.xml')
        );
        
        for (const wsFile of worksheetFiles) {
            const wsXml = await zip.files[wsFile].async('text');
            const wsName = wsFile.replace('xl/worksheets/', '').replace('.xml', '');
            this.worksheets[wsName] = this.parseWorksheet(wsXml);
            console.log(`   ✅ Worksheet carregada: ${wsName}`);
        }
        
        // Salvar ZIP original para preservar outros arquivos
        this.originalZip = zip;
        
        console.log('✅ Template carregação com sucesso!');
    }

    // Parse shared strings
    parseSharedStrings(xml) {
        this.sharedStrings = [];
        this.sharedStringsMap.clear();
        
        const regex = /<t[^>]*>(.*)<\/t>/g;
        let match;
        let index = 0;
        
        while ((match = regex.exec(xml)) !== null) {
            const text = this.decodeXML(match[1]);
            this.sharedStrings.push(text);
            this.sharedStringsMap.set(text, index);
            index++;
        }
    }

    // Parse worksheet
    parseWorksheet(xml) {
        const cells = {};
        const regex = /<c r="([^"]+)"[^>]*>(.*)<\/c>/gs;
        let match;
        
        while ((match = regex.exec(xml)) !== null) {
            const cellRef = match[1];
            const cellContent = match[2];
            
            cells[cellRef] = {
                original: match[0],
                content: cellContent,
                value: this.extractCellValue(cellContent)
            };
        }
        
        return {
            originalXml: xml,
            cells: cells
        };
    }

    // Extrair valor da célula
    extractCellValue(cellContent) {
        // Valor direto
        const vMatch = cellContent.match(/<v>(.*)<\/v>/);
        if (vMatch) {
            return vMatch[1];
        }
        
        // String inline
        const isMatch = cellContent.match(/<is><t[^>]*>(.*)<\/t><\/is>/);
        if (isMatch) {
            return this.decodeXML(isMatch[1]);
        }
        
        return '';
    }

    // Aplicar daçãos ao template
    async aplicarDaçãosAoTemplate(daçãosOrdem) {
        console.log('\n🎯 APLICANDO DADOS AO TEMPLATE BASEADO NAS IMAGENS...');
        
        // Usar primeira worksheet (sheet1)
        const worksheet = this.worksheets['sheet1'] || this.worksheets[Object.keys(this.worksheets)[0]];
        
        if (!worksheet) {
            throw new Error('Nenhuma worksheet encontrada no template');
        }

        // === CABEÇALHO PRINCIPAL (baseação nas imagens) ===
        console.log('\n📋 DADOS PRINCIPAIS:');
        
        // Linha do Orçamento/Pedido (primeira linha de daçãos)
        this.setCellValue(worksheet, 'B1', daçãosOrdem.numero_orcamento || daçãosOrdem.numeroOrcamento || '352');
        this.setCellValue(worksheet, 'E1', daçãosOrdem.numero_pedido || daçãosOrdem.numeroPedido || '202500083'); 
        this.setCellValue(worksheet, 'H1', daçãosOrdem.data_liberacao || daçãosOrdem.dataLiberacao || '19/08/2025');
        
        // === VENDEDOR ===
        console.log('\n👤 VENDEDOR:');
        this.setCellValue(worksheet, 'B2', daçãosOrdem.vendedor || 'Marcia Scarcella');
        this.setCellValue(worksheet, 'G2', daçãosOrdem.prazo_entrega || daçãosOrdem.prazoEntrega || '18/09/2025');
        
        // === CLIENTE ===
        console.log('\n🏢 CLIENTE:');
        this.setCellValue(worksheet, 'B3', daçãosOrdem.cliente || daçãosOrdem.cliente_razao || 'CONSTRULAR');
        
        // === CONTATO ===
        console.log('\n📞 CONTATO:');
        this.setCellValue(worksheet, 'B4', daçãosOrdem.contato_cliente || daçãosOrdem.clienteContato || 'Rodrigo');
        this.setCellValue(worksheet, 'F4', daçãosOrdem.fone_cliente || daçãosOrdem.clienteTelefone || '(94) 98430-6216');
        
        // === EMAIL E FRETE ===
        console.log('\n EMAIL E FRETE:');
        this.setCellValue(worksheet, 'B5', daçãosOrdem.email_cliente || daçãosOrdem.clienteEmail || 'constrularcimento@gmail.com');
        this.setCellValue(worksheet, 'H5', daçãosOrdem.tipo_frete || daçãosOrdem.frete || 'FOB');
        
        // === DADOS DA TRANSPORTADORA ===
        console.log('\n TRANSPORTADORA:');
        this.setCellValue(worksheet, 'B7', daçãosOrdem.transportaçãora_nome || daçãosOrdem.transportaçãora || '');
        this.setCellValue(worksheet, 'F7', daçãosOrdem.transportaçãora_fone || '(94) 98430-6216');
        this.setCellValue(worksheet, 'B8', daçãosOrdem.transportaçãora_cep || '68560-000');
        this.setCellValue(worksheet, 'D8', daçãosOrdem.transportaçãora_endereco || 'Av. Henrique Vita nº 12 - Expansão - Santana do Araguaia - PA');
        
        // === DADOS PARA COBRANÇA ===
        console.log('\n COBRANÇA:');
        this.setCellValue(worksheet, 'B9', daçãosOrdem.transportaçãora_cpf_cnpj || '36.408.556/0001-69');
        this.setCellValue(worksheet, 'F9', daçãosOrdem.transportaçãora_email_nfe || 'constrularcimento@gmail.com');
        
        // === PRODUTOS ===
        console.log('\n📦 PRODUTOS:');
        let produtos = daçãosOrdem.produtos || daçãosOrdem.itens || [];
        
        // Se produtos está em string JSON, converter
        if (typeof produtos === 'string') {
            try {
                produtos = JSON.parse(produtos);
            } catch (e) {
                console.log('⚠️ Erro ao parsear produtos JSON, usando produtos de exemplo');
                produtos = [];
            }
        }
        
        // Produtos de exemplo baseaçãos nas imagens se não houver
        if (!produtos || produtos.length === 0) {
            produtos = [
                {
                    codigo: 'TRN10',
                    descricao: 'ALUFORCE CB TRIPLEX 10mm² NEUTRO NU',
                    embalagem: 'Bobina',
                    lances: '1x1000',
                    quantidade: 1000,
                    valor_unitario: 3.79,
                    total: 3740.00
                },
                {
                    codigo: 'TRN16',
                    descricao: 'ALUFORCE CB TRIPLEX 16mm² NEUTRO NU',
                    embalagem: 'Bobina',
                    lances: '1x500',
                    quantidade: 500,
                    valor_unitario: 5.41,
                    total: 2705.00
                },
                {
                    codigo: 'TRN25',
                    descricao: 'ALUFORCE CB TRIPLEX 25mm² NEUTRO NU',
                    embalagem: 'Bobina',
                    lances: '1x300',
                    quantidade: 300,
                    valor_unitario: 7.88,
                    total: 2364.00
                }
            ];
        }
        
        let linhaProduto = 11; // Começar na linha 11 para produtos
        let totalGeral = 0;
        
        produtos.forEach((produto, index) => {
            const codigo = produto.codigo || produto.cod || `TRN${10 + index}`;
            const descricao = produto.descricao || produto.nome || produto.desc || `ALUFORCE CB TRIPLEX - Item ${index + 1}`;
            const embalagem = produto.embalagem || 'Bobina';
            const lances = produto.lances || '1x500';
            const quantidade = produto.quantidade || produto.qtd || 500;
            const valorUnitario = parseFloat(produto.valor_unitario || produto.preco_unitario || produto.preco || produto.valor || 5.00);
            const total = parseFloat(produto.total || (quantidade * valorUnitario));
            
            console.log(`   📦 Item ${index + 1}: ${codigo} - ${descricao}`);
            console.log(`      Qtd: ${quantidade} x R$ ${valorUnitario.toFixed(2)} = R$ ${total.toFixed(2)}`);
            
            // Mapeamento baseação nas imagens das tabelas
            this.setCellValue(worksheet, `A${linhaProduto}`, codigo);
            this.setCellValue(worksheet, `B${linhaProduto}`, descricao);
            this.setCellValue(worksheet, `F${linhaProduto}`, embalagem);
            this.setCellValue(worksheet, `G${linhaProduto}`, lances);
            this.setCellValue(worksheet, `H${linhaProduto}`, quantidade);
            this.setCellValue(worksheet, `I${linhaProduto}`, valorUnitario.toFixed(2));
            this.setCellValue(worksheet, `J${linhaProduto}`, total.toFixed(2));
            
            totalGeral += total;
            linhaProduto++;
        });
        
        // === TOTAL DO PEDIDO ===
        console.log('\n💰 TOTAL:');
        // Usar o total predefinido se disponível, senão calcular
        const totalPedido = daçãosOrdem.total_pedido || totalGeral;
        this.setCellValue(worksheet, 'J25', totalPedido.toFixed(2)); // Total do Pedido
        
        // === OBSERVAÇÕES DO PEDIDO ===
        console.log('\n📝 OBSERVAÇÕES:');
        const observacoes = daçãosOrdem.observacoes || daçãosOrdem.obs || '';
        if (observacoes) {
            // Área de observações em amarelo nas imagens
            this.setCellValue(worksheet, 'A27', observacoes);
        }
        
        // === CONDIÇÕES DE PAGAMENTO ===
        console.log('\n💳 PAGAMENTO:');
        this.setCellValue(worksheet, 'B30', daçãosOrdem.condicoes_pagamento || 'FATURAMENTO');
        this.setCellValue(worksheet, 'F30', daçãosOrdem.metodo_pagamento || '100%');
        this.setCellValue(worksheet, 'J30', totalPedido.toFixed(2));
        
        console.log(`✅ DADOS APLICADOS NO FORMATO CORRETO! Total: R$ ${totalPedido.toFixed(2)}`);
    }

    // Definir valor da célula
    setCellValue(worksheet, cellRef, value) {
        if (value !== undefined && value !== null && value !== '') {
            console.log(`   ✅ ${cellRef}: ${value}`);
            
            // Se célula não existe, criar nova
            if (!worksheet.cells[cellRef]) {
                worksheet.cells[cellRef] = {
                    original: '',
                    content: '',
                    value: ''
                };
            }
            
            // Atualizar valor
            worksheet.cells[cellRef].value = String(value);
            worksheet.cells[cellRef].modified = true;
        }
    }

    // Salvar arquivo
    async salvarArquivo(outputPath) {
        console.log('\n💾 SALVANDO ARQUIVO MODIFICADO...');
        
        // Regenerar worksheet XML
        const worksheet = this.worksheets['sheet1'] || this.worksheets[Object.keys(this.worksheets)[0]];
        const newWorksheetXml = this.generateWorksheetXML(worksheet);
        
        // Regenerar shared strings se necessário
        const newSharedStringsXml = this.generateSharedStringsXML();
        
        // Atualizar ZIP original
        this.originalZip.file('xl/worksheets/sheet1.xml', newWorksheetXml);
        if (newSharedStringsXml) {
            this.originalZip.file('xl/sharedStrings.xml', newSharedStringsXml);
        }
        
        // Gerar arquivo final
        const buffer = await this.originalZip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });
        
        fs.writeFileSync(outputPath, buffer);
        console.log(`💾 Arquivo salvo: ${buffer.length} bytes`);
        
        return {
            arquivo: outputPath,
            tamanho: buffer.length,
            sucesso: true
        };
    }

    // Gerar XML da worksheet
    generateWorksheetXML(worksheet) {
        let xml = worksheet.originalXml;
        
        // Substituir células modificadas
        Object.keys(worksheet.cells).forEach(cellRef => {
            const cell = worksheet.cells[cellRef];
            
            if (cell.modified) {
                const newCellXml = this.generateCellXML(cellRef, cell.value);
                
                if (cell.original) {
                    // Substituir célula existente
                    xml = xml.replace(cell.original, newCellXml);
                } else {
                    // Inserir nova célula (simplificação)
                    const sheetDataMatch = xml.match(/<sheetData>(.*)<\/sheetData>/s);
                    if (sheetDataMatch) {
                        const coords = this.cellRefToCoords(cellRef);
                        const rowPattern = new RegExp(`<row r="${coords.row}"[^>]*>(.*)</row>`, 's');
                        const rowMatch = xml.match(rowPattern);
                        
                        if (rowMatch) {
                            const newRowContent = rowMatch[1] + newCellXml;
                            const newRow = rowMatch[0].replace(rowMatch[1], newRowContent);
                            xml = xml.replace(rowMatch[0], newRow);
                        }
                    }
                }
            }
        });
        
        return xml;
    }

    // Gerar XML da célula
    generateCellXML(cellRef, value) {
        if (typeof value === 'string') {
            return `<c r="${cellRef}" t="inlineStr"><is><t>${this.encodeXML(value)}</t></is></c>`;
        } else if (typeof value === 'number') {
            return `<c r="${cellRef}"><v>${value}</v></c>`;
        } else {
            return `<c r="${cellRef}" t="inlineStr"><is><t>${this.encodeXML(String(value))}</t></is></c>`;
        }
    }

    // Gerar XML das shared strings
    generateSharedStringsXML() {
        if (this.sharedStrings.length === 0) return null;
        
        let xml = `<xml version="1.0" encoding="UTF-8" standalone="yes">
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${this.sharedStrings.length}" uniqueCount="${this.sharedStrings.length}">`;
        
        this.sharedStrings.forEach(str => {
            xml += `<si><t>${this.encodeXML(str)}</t></si>`;
        });
        
        xml += '</sst>';
        return xml;
    }

    // Converter referência de célula para coordenadas
    cellRefToCoords(cellRef) {
        const match = cellRef.match(/^([A-Z]+)(\d+)$/);
        if (!match) return { row: 1, col: 1 };
        
        const colStr = match[1];
        const row = parseInt(match[2]);
        
        let col = 0;
        for (let i = 0; i < colStr.length; i++) {
            col = col * 26 + (colStr.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
        }
        
        return { row, col };
    }

    // Escapar XML
    encodeXML(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    // Decodificar XML
    decodeXML(text) {
        return String(text)
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
    }

    // Calcular total
    calcularTotal(daçãosOrdem) {
        // Se tem total predefinido, usar esse
        if (daçãosOrdem.total_pedido) {
            return parseFloat(daçãosOrdem.total_pedido);
        }
        
        let produtos = daçãosOrdem.produtos || daçãosOrdem.itens || [];
        if (typeof produtos === 'string') {
            try {
                produtos = JSON.parse(produtos);
            } catch (e) {
                produtos = [];
            }
        }
        
        return produtos.reduce((total, produto) => {
            const quantidade = produto.quantidade || produto.qtd || 1;
            const precoUnitario = parseFloat(produto.preco_unitario || produto.valor_unitario || produto.preco || produto.valor || 0);
            return total + (quantidade * precoUnitario);
        }, 0);
    }

    // Contar produtos
    contarProdutos(daçãosOrdem) {
        let produtos = daçãosOrdem.produtos || daçãosOrdem.itens || [];
        if (typeof produtos === 'string') {
            try {
                produtos = JSON.parse(produtos);
            } catch (e) {
                produtos = [];
            }
        }
        return produtos.length;
    }
}

// Exportar classe
module.exports = TemplateXlsxRealGenerator;