// ...existing code...
// ORDEM DE PRODUÇÁO COMPLETA - VERSÁO SEGURA
const ExcelJS = require('exceljs');
const fs = require('fs');

console.log('🎯 CRIANDO ORDEM DE PRODUÇÁO COMPLETA - VERSÁO SEGURA\n');

// Gerar número sequencial de ordem (pode ser incrementação conforme necessidade)
const numero_sequencial = '00001'; // Altere para incrementar conforme novas ordens
const numero_orcamento = 'ORC-' + numero_sequencial;
const numero_pedido = 'PED-' + numero_sequencial;

const frete = 'FOB'; // ou 'CIF', ou valor recebido do modal
// Calcular prazo de entrega: 15 dias após data_liberacao
const dataCompra = new Date('2025-10-07'); // ou use dadosCompletos.data_liberacao
const prazoEntregaDate = new Date(dataCompra.getTime() + 15 * 24 * 60 * 60 * 1000);
const prazo_entrega = prazoEntregaDate.toLocaleDateString('pt-BR');

const dadosCompletos = {
    // Daçãos básicos
    numero_sequencial,
    numero_orcamento,
    numero_pedido,
    data_liberacao: '07/10/2025',
    
    // Vendedor
    vendedor: 'Maria Santos Silva',
    prazo_entrega: '8 dias úteis',
    
    // Cliente
    cliente: 'Empresa Industrial Teste Ltda',
    contato_cliente: 'João Silva - Diretor de Compras',
    fone_cliente: '(11) 99999-9999',
    email_cliente: 'joao.silva@empresateste.com.br',
    tipo_frete: frete,
    
    // Transportaçãora
    transportaçãora_nome: 'Transportes Rápidos Expressos Ltda',
    transportaçãora_fone: '(11) 88888-8888',
    transportaçãora_cep: '12345-678',
    transportaçãora_endereco: 'Avenida Logística, 789 - Centro de Distribuição - São Paulo/SP',
    transportaçãora_cpf_cnpj: '12.345.678/0001-90',
    transportaçãora_email_nfe: 'nfe@transportesrapidos.com.br',
    
    // Produtos
    produtos: [
        {
            codigo: 'ALU-001',
            descricao: 'Perfil de Alumínio Estrutural 30x30mm',
            embalagem: 'Bobina Plástica',
            lances: '100, 120, 150',
            quantidade: 100,
            valor_unitario: 25.50
        },
        {
            codigo: 'ALU-002',
            descricao: 'Perfil de Alumínio Angular 25x25mm',
            embalagem: 'Feixe Amarração',
            lances: '80, 100, 120',
            quantidade: 50,
            valor_unitario: 18.75
        },
        {
            codigo: 'ALU-003',
            descricao: 'Perfil de Alumínio Retangular 20x40mm',
            embalagem: 'Caixa de Papelão',
            lances: '60, 80, 100',
            quantidade: 75,
            valor_unitario: 22.00
        }
    ],
    
    // Observações
    observacoes_pedido: `OBSERVAÇÕES IMPORTANTES:
• Prazo de entrega: 15/10/2025
• Material deve ser entregue em perfeitas condições
• Comunicar antecipadamente qualquer atraso
• Horário de entrega: 8h às 17h
`,
    
    // Pagamento
    condicoes_pagamento: '30 dias após o faturamento',
    metodo_pagamento: 'Transferência Bancária',
    
    // Entrega
    data_previsao_entrega: prazo_entrega,
    qtd_volumes: '15 volumes',
    tipo_embalagem_entrega: 'Embalagem industrial reforçada',
    
    observacoes_entrega: `INSTRUÇÕES DE ENTREGA:
• Entregar no endereço principal da empresa
• Usar entrada de carga pelos fundos
• Comunicar chegada na portaria
• Aguardar liberação para descarga`
};

function preencherCelulasSeguro(worksheet, cellAddresses, value, label = '') {
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

async function criarOrdemCompletaSegura() {
    try {
        console.log('📂 Carregando template...');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile('Ordem de Produção.xlsx');
        const worksheet = workbook.worksheets[0];
        
        console.log('✅ Template carregação. Preenchendo de forma segura...\n');

        // === AJUSTE DE ESTILO VISUAL ===
        // Centralizar cabeçalhos e células principais
        const cabecalhos = ['C4','G4','I4','J4','C6','G6','C7','C8','C9','G12','H12','H9','I9','J9'];
        cabecalhos.forEach(cellAddr => {
            const cell = worksheet.getCell(cellAddr);
            if (cell) cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        // Bordas finas em todas as células da tabela de produtos
        for (let i = 0; i < 32; i++) {
            const rowNum = 18 + i;
            for (let col of ['B','C','D','E','F','G','H']) {
                const cell = worksheet.getCell(`${col}${rowNum}`);
                cell.border = {
                    top: {style:'thin'},
                    left: {style:'thin'},
                    bottom: {style:'thin'},
                    right: {style:'thin'}
                };
            }
        }
        // Cor de fundo amarela para telefone, frete, observações
        worksheet.getCell('H8').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FFFFFF00'}
        };
        worksheet.getCell('H9').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FFFFFF00'}
        };
        worksheet.getCell('G12').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FFFFFF00'}
        };
        worksheet.getCell('H12').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FFFFFF00'}
        };
        // Observações (exemplo: A37)
        worksheet.getCell('A37').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FFFFFF00'}
        };
        
        // === AJUSTE DE FONTES ===
        worksheet.eachRow({ includeEmpty: true }, function(row) {
            row.eachCell({ includeEmpty: true }, function(cell) {
                cell.font = { name: 'Calibri', size: 10 };
            });
        });
        // === DADOS BÁSICOS ===
        console.log('🟡 DADOS BÁSICOS:');
    preencherCelulasSeguro(worksheet, ['C4'], dadosCompletos.numero_orcamento, 'Orçamento');
    preencherCelulasSeguro(worksheet, ['G4'], dadosCompletos.numero_pedido, 'Pedido');
    // Corrigir H4 para mostrar texto
    worksheet.getCell('H4').value = 'Data de liberação';
    preencherCelulasSeguro(worksheet, ['I4', 'J4'], dadosCompletos.data_liberacao, 'Data Liberação');
        
        // === VENDEDOR ===
        console.log('\n🟡 VENDEDOR:');
        preencherCelulasSeguro(worksheet, ['C6', 'D6', 'E6'], dadosCompletos.vendedor, 'Vendedor');
        preencherCelulasSeguro(worksheet, ['G6', 'H6', 'I6'], dadosCompletos.prazo_entrega, 'Prazo Entrega');
        
        // === CLIENTE ===
        console.log('\n🟡 CLIENTE:');
        preencherCelulasSeguro(worksheet, ['C7', 'D7', 'E7', 'F7', 'G7'], dadosCompletos.cliente, 'Cliente');
        preencherCelulasSeguro(worksheet, ['C8', 'D8', 'E8', 'F8'], dadosCompletos.contato_cliente, 'Contato');
        preencherCelulasSeguro(worksheet, ['H8', 'I8'], dadosCompletos.fone_cliente, 'Telefone');
        preencherCelulasSeguro(worksheet, ['C9', 'D9', 'E9', 'F9'], dadosCompletos.email_cliente, 'Email');
    // Preencher H9 e campo Frete com o valor do frete do modal
    worksheet.getCell('H9').value = dadosCompletos.tipo_frete;
    worksheet.getCell('I9').value = dadosCompletos.tipo_frete;
    worksheet.getCell('J9').value = dadosCompletos.tipo_frete;
        
        // === TRANSPORTADORA ===
        console.log('\n🟡 TRANSPORTADORA:');
        preencherCelulasSeguro(worksheet, ['C12', 'D12', 'E12'], dadosCompletos.transportaçãora_nome, 'Nome Transportaçãora');
    // Preencher G12 e campo amarelo com o telefone do modal
    worksheet.getCell('G12').value = dadosCompletos.transportaçãora_fone;
    worksheet.getCell('H12').value = dadosCompletos.transportaçãora_fone;
        preencherCelulasSeguro(worksheet, ['C13', 'D13'], dadosCompletos.transportaçãora_cep, 'CEP');
        preencherCelulasSeguro(worksheet, ['F13', 'G13', 'H13', 'I13'], dadosCompletos.transportaçãora_endereco, 'Endereço');
        
        // CPF/CNPJ com formato especial
        ['C15', 'D15'].forEach(cellAddr => {
            try {
                const cell = worksheet.getCell(cellAddr);
                cell.value = dadosCompletos.transportaçãora_cpf_cnpj;
                cell.numFmt = '@';
                console.log(`   ✅ CPF/CNPJ: ${cellAddr} = ${dadosCompletos.transportaçãora_cpf_cnpj}`);
            } catch (e) {}
        });
        
        preencherCelulasSeguro(worksheet, ['G15', 'H15'], dadosCompletos.transportaçãora_email_nfe, 'Email NFe');
        
        // === PRODUTOS ===
        console.log('\n🟡 PRODUTOS:');
        let totalGeral = 0;
        // Preencher até 15 linhas de produtos, como no modelo
        for (let i = 0; i < 15; i++) {
            const linha = 18 + i * 2; // cada produto ocupa 2 linhas (principal + sublinha)
            const produto = dadosCompletos.produtos[i];
            if (produto && produto.codigo && (produto.descricao || produto.nome)) {
                const valorTotal = produto.quantidade * produto.valor_unitario;
                totalGeral += valorTotal;
                // Linha principal - garantir nome do produto e código de cores
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
            } else {
                // Linha principal vazia
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
            }
        }
        // Total geral
        preencherCelulasSeguro(worksheet, ['I34', 'J34'], totalGeral, `Total Geral: R$ ${totalGeral.toFixed(2)}`);
    // Sobrescrever células de totais para evitar fórmulas compartilhadas
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
        
        // === OBSERVAÇÕES ===
        console.log('\n🟡 OBSERVAÇÕES:');
        preencherCelulasSeguro(worksheet, ['A37', 'B37', 'C37', 'D37', 'E37', 'F37', 'G37', 'H37'], 
                              dadosCompletos.observacoes_pedido, 'Observações do Pedido');
        
        // === PAGAMENTO ===
        console.log('\n🟡 PAGAMENTO:');
        preencherCelulasSeguro(worksheet, ['A44', 'B44', 'C44', 'D44'], dadosCompletos.condicoes_pagamento, 'Condições Pagamento');
        preencherCelulasSeguro(worksheet, ['F44', 'G44', 'H44'], dadosCompletos.metodo_pagamento, 'Método Pagamento');
    preencherCelulasSeguro(worksheet, ['I44', 'J44'], totalGeral, 'Valor Total Pagamento');
    // Garantir que o valor total seja preenchido na coluna I45
    worksheet.getCell('I45').value = totalGeral;
    worksheet.getCell('I45').numFmt = 'R$ #,##0.00';
        
        // === ENTREGA ===
        console.log('\n🟡 ENTREGA:');
        preencherCelulasSeguro(worksheet, ['A47', 'B47', 'C47', 'D47'], dadosCompletos.data_previsao_entrega, 'Data Entrega');
        preencherCelulasSeguro(worksheet, ['A49', 'B49', 'C49'], dadosCompletos.qtd_volumes, 'Volumes');
        preencherCelulasSeguro(worksheet, ['F49', 'G49', 'H49'], dadosCompletos.tipo_embalagem_entrega, 'Embalagem');
        preencherCelulasSeguro(worksheet, ['E51', 'F51', 'G51', 'H51', 'I51', 'J51'], 
                              dadosCompletos.observacoes_entrega, 'Obs. Entrega');
        
        // === SALVAR ===
        const filename = `ORDEM_PRODUCAO_COMPLETA_SEGURA_${new Date().toISOString().slice(0,10)}.xlsx`;
        await workbook.xlsx.writeFile(filename);
        
        const stats = fs.statSync(filename);
        
        console.log(`\n🎉 ORDEM DE PRODUÇÁO COMPLETA CRIADA COM SUCESSO!`);
        console.log(`📂 Arquivo: ${filename}`);
        console.log(`📏 Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);
        
        console.log(`\n📊 RESUMO COMPLETO:`);
        console.log(`   📋 Daçãos básicos: ✅ Preenchidos`);
        console.log(`   👤 Vendedor e prazos: ✅ Preenchidos`);
        console.log(`   🏢 Cliente completo: ✅ Preenchidos`);
        console.log(`   🚛 Transportaçãora: ✅ Todos os dados`);
        console.log(`   📦 Produtos: ✅ ${dadosCompletos.produtos.length} itens completos`);
        console.log(`   💰 Total geral: ✅ R$ ${totalGeral.toFixed(2)}`);
        console.log(`   📝 Observações: ✅ Textos completos`);
        console.log(`   💳 Pagamento: ✅ Condições e métodos`);
        console.log(`   🚚 Entrega: ✅ Daçãos completos`);
        
        console.log(`\n✨ AGORA SUA ORDEM ESTÁ VERDADEIRAMENTE COMPLETA!`);
        console.log(`📋 Todas as áreas identificadas na análise foram preenchidas!`);
        
        return filename;
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        throw error;
    }
}

criarOrdemCompletaSegura();