// 🎯 GERADOR EXCEL COM MAPEAMENTO CORRETO FINAL
const JSZip = require('jszip');
const fs = require('fs');

console.log('🎯 GERADOR EXCEL - MAPEAMENTO CORRETO FINAL');

async function generateFromTemplate(daçãosOrdem) {
    try {
        console.log('\n📂 CARREGANDO TEMPLATE...');
        const templatePath = 'C:\\Users\\Administrator\\Documents\\Sistema - Aluforce v.2 - BETA\\modules\\PCP\\Ordem de Produção.xlsx';
        
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template não encontrado: ${templatePath}`);
        }
        
        const templateBuffer = fs.readFileSync(templatePath);
        const zip = await JSZip.loadAsync(templateBuffer);
        
        console.log('✅ Template carregação com sucesso');
        
        // Ler shared strings existentes
        let sharedStrings = [];
        if (zip.files['xl/sharedStrings.xml']) {
            const sharedStringsXml = await zip.files['xl/sharedStrings.xml'].async('text');
            sharedStrings = extrairSharedStrings(sharedStringsXml);
            console.log(`📋 Shared strings originais: ${sharedStrings.length}`);
        }
        
        // Ler worksheet
        const worksheetXml = await zip.files['xl/worksheets/sheet1.xml'].async('text');
        
        // MAPEAMENTO CORRETO baseado na análise real
        const mapeamentoCorretoFinal = {
            orcamento: 'B1',      // Label "Orçamento:" está em A1
            pedido: 'H4',         // Label "Pedido:" está em G4  
            vendedor: 'C6',       // Label "VENDEDOR:" está em B6
            cliente: 'C7',        // Label "Cliente:" está em B7
            contato: 'C8',        // Label "Contato:" está em B8
            fone: 'I8',           // Label "Fone:" está em H8
            email: 'C9',          // Estimativa baseada no padrão
            prazoEntrega: 'I6',   // Baseação no padrão observação
            
            // Daçãos da transportaçãora (seção inferior)
            transpNome: 'C12',
            transpFone: 'I12',
            transpEndereco: 'C13',
            transpCep: 'C14',
            transpEmail: 'I14'
        };
        
        console.log('\n📝 APLICANDO DADOS COM MAPEAMENTO CORRETO FINAL...');
        
        let worksheetModificação = worksheetXml;
        let novasStrings = [];
        let indiceProximaString = sharedStrings.length;
        
        // Aplicar daçãos com posições corretas
        const daçãosParaAplicar = {
            [mapeamentoCorretoFinal.orcamento]: daçãosOrdem.orcamento || 'TESTE-CORRETO-FINAL',
            [mapeamentoCorretoFinal.pedido]: daçãosOrdem.pedido || 'PED-CORRETO-FINAL',
            [mapeamentoCorretoFinal.vendedor]: daçãosOrdem.vendedor || 'Vendedor Correto Final',
            [mapeamentoCorretoFinal.cliente]: daçãosOrdem.cliente || 'CLIENTE MAPEAMENTO CORRETO FINAL',
            [mapeamentoCorretoFinal.contato]: daçãosOrdem.contato || 'Contato Correto Final',
            [mapeamentoCorretoFinal.fone]: daçãosOrdem.fone || '(11) 99999-9999',
            [mapeamentoCorretoFinal.email]: daçãosOrdem.email || 'teste@email.com',
            [mapeamentoCorretoFinal.prazoEntrega]: daçãosOrdem.prazoEntrega || '30/01/1900',
            
            [mapeamentoCorretoFinal.transpNome]: daçãosOrdem.transportaçãora.nome || 'Transportaçãora Teste',
            [mapeamentoCorretoFinal.transpFone]: daçãosOrdem.transportaçãora.fone || '(00) 00000-0000',
            [mapeamentoCorretoFinal.transpEndereco]: daçãosOrdem.transportaçãora.endereco || 'Endereço Teste',
            [mapeamentoCorretoFinal.transpCep]: daçãosOrdem.transportaçãora.cep || '00000-000',
            [mapeamentoCorretoFinal.transpEmail]: daçãosOrdem.transportaçãora.email || 'transp@teste.com'
        };
        
        Object.entries(daçãosParaAplicar).forEach(([celula, valor]) => {
            console.log(`   📍 ${celula}: "${valor}"`);
            
            // Adicionar valor ao shared strings
            const indiceString = indiceProximaString++;
            novasStrings.push(valor);
            
            // Verificar se a célula já existe no worksheet
            const regexCelulaExistente = new RegExp(`<c r="${celula}"[^>]*>.*</c>`, 's');
            
            if (regexCelulaExistente.test(worksheetModificação)) {
                // Célula existe - substituir conteúdo
                worksheetModificação = worksheetModificação.replace(
                    regexCelulaExistente,
                    `<c r="${celula}" t="s"><v>${indiceString}</v></c>`
                );
            } else {
                // Célula não existe - adicionar
                const novaCelula = `<c r="${celula}" t="s"><v>${indiceString}</v></c>`;
                
                // Encontrar onde inserir a célula (na linha correta)
                const linha = celula.match(/\d+/)[0];
                const regexLinha = new RegExp(`(<row r="${linha}"[^>]*>)(.*)(</row>)`, 's');
                
                if (regexLinha.test(worksheetModificação)) {
                    worksheetModificação = worksheetModificação.replace(
                        regexLinha,
                        (match, abertura, conteudo, fechamento) => {
                            return `${abertura}${conteudo}${novaCelula}${fechamento}`;
                        }
                    );
                } else {
                    console.log(`   ⚠️  Linha ${linha} não encontrada para célula ${celula}`);
                }
            }
        });
        
        // Aplicar produtos se fornecidos
        if (daçãosOrdem.produtos && daçãosOrdem.produtos.length > 0) {
            console.log('\n📦 APLICANDO PRODUTOS...');
            
            daçãosOrdem.produtos.forEach((produto, index) => {
                const linhaProduto = 17 + index; // Linha base dos produtos
                
                const celulasGerateProduto = {
                    [`B${linhaProduto}`]: produto.codigo || `COD${index + 1}`,
                    [`C${linhaProduto}`]: produto.descricao || `Produto Mapeamento Correto Final ${index + 1}`,
                    [`E${linhaProduto}`]: produto.embalagem || 'PC',
                    [`F${linhaProduto}`]: produto.lances || '1',
                    [`G${linhaProduto}`]: produto.quantidade || '1',
                    [`H${linhaProduto}`]: produto.valorUnitario || '0,00',
                    [`I${linhaProduto}`]: produto.valorTotal || '0,00'
                };
                
                Object.entries(celulasGerateProduto).forEach(([celula, valor]) => {
                    console.log(`   📦 ${celula}: "${valor}"`);
                    
                    const indiceString = indiceProximaString++;
                    novasStrings.push(String(valor));
                    
                    const regexCelulaExistente = new RegExp(`<c r="${celula}"[^>]*>.*</c>`, 's');
                    
                    if (regexCelulaExistente.test(worksheetModificação)) {
                        worksheetModificação = worksheetModificação.replace(
                            regexCelulaExistente,
                            `<c r="${celula}" t="s"><v>${indiceString}</v></c>`
                        );
                    } else {
                        const novaCelula = `<c r="${celula}" t="s"><v>${indiceString}</v></c>`;
                        const linha = celula.match(/\d+/)[0];
                        const regexLinha = new RegExp(`(<row r="${linha}"[^>]*>)(.*)(</row>)`, 's');
                        
                        if (regexLinha.test(worksheetModificação)) {
                            worksheetModificação = worksheetModificação.replace(
                                regexLinha,
                                (match, abertura, conteudo, fechamento) => {
                                    return `${abertura}${conteudo}${novaCelula}${fechamento}`;
                                }
                            );
                        }
                    }
                });
            });
        }
        
        // Atualizar shared strings
        if (novasStrings.length > 0) {
            console.log(`\n📝 Adicionando ${novasStrings.length} novas strings...`);
            
            const todasStrings = [...sharedStrings, ...novasStrings];
            const novoSharedStringsXml = gerarSharedStringsXml(todasStrings);
            
            zip.file('xl/sharedStrings.xml', novoSharedStringsXml);
        }
        
        // Atualizar worksheet
        zip.file('xl/worksheets/sheet1.xml', worksheetModificação);
        
        // Gerar arquivo
        const novoArquivo = await zip.generateAsync({ type: 'nodebuffer' });
        const caminhoSaida = 'C:\\Users\\Administrator\\Documents\\Sistema - Aluforce v.2 - BETA\\ORDEM_MAPEAMENTO_FINAL_CORRETO.xlsx';
        
        fs.writeFileSync(caminhoSaida, novoArquivo);
        
        console.log(`\n✅ ARQUIVO GERADO COM SUCESSO!`);
        console.log(`📂 Localização: ${caminhoSaida}`);
        console.log(`📊 Tamanho: ${(novoArquivo.length / 1024).toFixed(2)} KB`);
        
        return caminhoSaida;
        
    } catch (error) {
        console.error('❌ Erro ao gerar arquivo:', error.message);
        throw error;
    }
}

function extrairSharedStrings(xml) {
    const strings = [];
    const regex = /<t[^>]*>(.*)<\/t>/g;
    let match;
    
    while ((match = regex.exec(xml)) !== null) {
        strings.push(decodeXML(match[1]));
    }
    
    return strings;
}

function gerarSharedStringsXml(strings) {
    const itens = strings.map(str => 
        `<si><t>${encodeXML(str)}</t></si>`
    ).join('');
    
    return `<xml version="1.0" encoding="UTF-8" standalone="yes">
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">
${itens}
</sst>`;
}

function encodeXML(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function decodeXML(text) {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

// Teste com daçãos completos
const daçãosTeste = {
    orcamento: 'ORC-FINAL-123',
    pedido: 'PED-FINAL-456',
    vendedor: 'João da Silva Final',
    cliente: 'EMPRESA TESTE MAPEAMENTO FINAL LTDA',
    contato: 'Maria Santos Final',
    fone: '(11) 98765-4321',
    email: 'contato@empresateste.com.br',
    prazoEntrega: '15/12/2025',
    
    transportaçãora: {
        nome: 'TRANSPORTADORA TESTE FINAL LTDA',
        fone: '(11) 3333-4444',
        endereco: 'Rua das Flores, 123 - Centro',
        cep: '01234-567',
        email: 'transporte@teste.com.br'
    },
    
    produtos: [
        {
            codigo: 'PROD001',
            descricao: 'PRODUTO TESTE MAPEAMENTO FINAL 1',
            embalagem: 'KG',
            lances: '5',
            quantidade: '100',
            valorUnitario: '25,50',
            valorTotal: '2.550,00'
        },
        {
            codigo: 'PROD002', 
            descricao: 'PRODUTO TESTE MAPEAMENTO FINAL 2',
            embalagem: 'PC',
            lances: '10',
            quantidade: '50',
            valorUnitario: '75,00',
            valorTotal: '3.750,00'
        }
    ]
};

console.log('\n🚀 GERANDO ARQUIVO COM MAPEAMENTO FINAL CORRETO...');
generateFromTemplate(daçãosTeste)
    .then(arquivo => {
        console.log('\n🎉 PROCESSO CONCLUÍDO COM SUCESSO!');
        console.log('📁 Abra o arquivo geração no Excel para verificar se todos os campos estão corretos.');
    })
    .catch(error => {
        console.error('\n💥 ERRO NO PROCESSO:', error.message);
    });