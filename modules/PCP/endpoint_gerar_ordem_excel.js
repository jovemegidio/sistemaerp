// =============================================
// ENDPOINT: Gerar Ordem de Produção em Excel
// =============================================
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Função para formatar CPF/CNPJ com pontuação
function formatarCpfCnpjExcel(valor) {
    if (!valor) return '';
    
    // Remove tudo que não é número
    const numeros = String(valor).replace(/\D/g, '');
    
    if (numeros.length === 11) {
        // CPF: 000.000.000-00
        return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (numeros.length === 14) {
        // CNPJ: 00.000.000/0000-00
        return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    // Se já tiver formatação ou tamanho inválido, retorna como está
    return valor;
}

app.post('/api/gerar-ordem-excel', async (req, res) => {
    try {
        const daçãos = req.body;
        logger.info('[GERAR ORDEM EXCEL] Recebendo daçãos:', { num_pedido: daçãos.num_pedido, produtos: daçãos.produtos.length });
        
        // Validações básicas
        if (!daçãos.num_pedido) {
            return res.status(400).json({ message: 'Número do pedido é obrigatório' });
        }
        
        if (!daçãos.produtos || daçãos.produtos.length === 0) {
            return res.status(400).json({ message: 'Adicione pelo menos um produto' });
        }
        
        // Carregar template Excel
        const templatePath = path.join(__dirname, 'Ordem de Produção.xlsx');
        
        if (!fs.existsSync(templatePath)) {
            logger.error('[GERAR ORDEM EXCEL] Template não encontração:', templatePath);
            return res.status(500).json({ message: 'Template Excel não encontração no servidor' });
        }
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const worksheet = workbook.getWorksheet(1);
        
        if (!worksheet) {
            return res.status(500).json({ message: 'Planilha inválida no template' });
        }
        
        // ============================================
        // MAPEAMENTO DOS DADOS NAS CÉLULAS
        // ============================================
        
        // Daçãos Principais (Linha 4)
        worksheet.getCell('C4').value = daçãos.num_orcamento || '';      // Orçamento
        worksheet.getCell('D4').value = daçãos.revisao || '';            // Revisão
        worksheet.getCell('G4').value = daçãos.num_pedido || '';         // Pedido
        
        // Data Liberação (Linha 4, coluna J)
        if (daçãos.data_liberacao) {
            const dataLib = new Date(daçãos.data_liberacao + 'T00:00:00');
            worksheet.getCell('J4').value = dataLib;
            worksheet.getCell('J4').numFmt = 'dd/mm/yyyy';
        }
        
        // Vendedor (Linha 6)
        worksheet.getCell('C6').value = daçãos.vendedor || '';
        worksheet.getCell('D6').value = daçãos.vendedor || '';
        worksheet.getCell('E6').value = daçãos.vendedor || '';
        
        // Prazo de Entrega (Linha 6)
        if (daçãos.prazo_entrega) {
            const dataPrazo = new Date(daçãos.prazo_entrega + 'T00:00:00');
            worksheet.getCell('H6').value = dataPrazo;
            worksheet.getCell('I6').value = dataPrazo;
            worksheet.getCell('J6').value = dataPrazo;
            worksheet.getCell('H6').numFmt = 'dd/mm/yyyy';
            worksheet.getCell('I6').numFmt = 'dd/mm/yyyy';
            worksheet.getCell('J6').numFmt = 'dd/mm/yyyy';
        }
        
        // Cliente (Linha 7)
        worksheet.getCell('C7').value = daçãos.cliente || '';
        worksheet.getCell('D7').value = daçãos.cliente || '';
        worksheet.getCell('E7').value = daçãos.cliente || '';
        worksheet.getCell('F7').value = daçãos.cliente || '';
        worksheet.getCell('G7').value = daçãos.cliente || '';
        worksheet.getCell('H7').value = daçãos.cliente || '';
        worksheet.getCell('I7').value = daçãos.cliente || '';
        worksheet.getCell('J7').value = daçãos.cliente || '';
        
        // Contato (Linha 8)
        worksheet.getCell('C8').value = daçãos.contato_cliente || '';
        worksheet.getCell('D8').value = daçãos.contato_cliente || '';
        worksheet.getCell('E8').value = daçãos.contato_cliente || '';
        worksheet.getCell('F8').value = daçãos.contato_cliente || '';
        
        // Fone Cliente (Linha 8)
        worksheet.getCell('H8').value = daçãos.fone_cliente || '';
        worksheet.getCell('I8').value = daçãos.fone_cliente || '';
        worksheet.getCell('J8').value = daçãos.fone_cliente || '';
        
        // Email Cliente (Linha 9)
        worksheet.getCell('C9').value = daçãos.email_cliente || '';
        worksheet.getCell('D9').value = daçãos.email_cliente || '';
        worksheet.getCell('E9').value = daçãos.email_cliente || '';
        worksheet.getCell('F9').value = daçãos.email_cliente || '';
        worksheet.getCell('G9').value = daçãos.email_cliente || '';
        
        // Tipo de Frete (Linha 9)
        worksheet.getCell('J9').value = daçãos.tipo_frete || '';
        
        // Transportaçãora (Linha 12)
        // Fone Transportaçãora
        worksheet.getCell('H12').value = daçãos.transportaçãora_fone || '';
        worksheet.getCell('I12').value = daçãos.transportaçãora_fone || '';
        worksheet.getCell('J12').value = daçãos.transportaçãora_fone || '';
        
        // CEP (Linha 13)
        worksheet.getCell('C13').value = daçãos.cep || '';
        worksheet.getCell('D13').value = daçãos.cep || '';
        
        // Endereço (Linha 13)
        worksheet.getCell('F13').value = daçãos.endereco || '';
        worksheet.getCell('G13').value = daçãos.endereco || '';
        worksheet.getCell('H13').value = daçãos.endereco || '';
        worksheet.getCell('I13').value = daçãos.endereco || '';
        worksheet.getCell('J13').value = daçãos.endereco || '';
        
        // CPF/CNPJ (Linha 15) - Com formatação
        const cpfCnpjFormatação = formatarCpfCnpjExcel(daçãos.cpf_cnpj || '');
        worksheet.getCell('C15').value = cpfCnpjFormatação;
        worksheet.getCell('D15').value = cpfCnpjFormatação;
        worksheet.getCell('E15').value = cpfCnpjFormatação;
        
        // Email NF-e (Linha 15)
        worksheet.getCell('G15').value = daçãos.email_nfe || '';
        worksheet.getCell('H15').value = daçãos.email_nfe || '';
        worksheet.getCell('I15').value = daçãos.email_nfe || '';
        worksheet.getCell('J15').value = daçãos.email_nfe || '';
        
        // ============================================
        // PRODUTOS (Linhas 18-32)
        // ============================================
        let linhaAtual = 18;
        let totalGeral = 0;
        
        for (const produto of daçãos.produtos) {
            if (linhaAtual > 32) {
                logger.warn('[GERAR ORDEM EXCEL] Limite de produtos (15) atingido');
                break;
            }
            
            // Coluna B: Código
            worksheet.getCell(`B${linhaAtual}`).value = produto.codigo || '';
            
            // Colunas C, D, E: Produto/Descrição (usar descricao ou nome)
            const nomeProduto = produto.descricao || produto.nome || produto.produto || '';
            worksheet.getCell(`C${linhaAtual}`).value = nomeProduto;
            worksheet.getCell(`D${linhaAtual}`).value = nomeProduto;
            worksheet.getCell(`E${linhaAtual}`).value = nomeProduto;
            
            // Coluna F: Embalagem
            worksheet.getCell(`F${linhaAtual}`).value = produto.embalagem || '';
            
            // Coluna G: Lances
            worksheet.getCell(`G${linhaAtual}`).value = produto.lances || '';
            
            // Coluna H: Quantidade
            worksheet.getCell(`H${linhaAtual}`).value = produto.quantidade || 0;
            
            // Coluna I: Valor Unitário
            worksheet.getCell(`I${linhaAtual}`).value = produto.valor_unitario || 0;
            worksheet.getCell(`I${linhaAtual}`).numFmt = 'R$ #,##0.00';
            
            // Coluna J: Valor Total
            worksheet.getCell(`J${linhaAtual}`).value = produto.valor_total || 0;
            worksheet.getCell(`J${linhaAtual}`).numFmt = 'R$ #,##0.00';
            
            totalGeral += produto.valor_total || 0;
            linhaAtual++;
        }
        
        // Total do Pedido (Linhas 34-35)
        worksheet.getCell('I35').value = totalGeral;
        worksheet.getCell('J35').value = totalGeral;
        worksheet.getCell('I35').numFmt = 'R$ #,##0.00';
        worksheet.getCell('J35').numFmt = 'R$ #,##0.00';
        
        // ============================================
        // OBSERVAÇÕES (Linha 36)
        // ============================================
        if (daçãos.observacoes) {
            worksheet.getCell('I36').value = daçãos.observacoes;
            worksheet.getCell('J36').value = daçãos.observacoes;
        }
        
        // ============================================
        // CONDIÇÕES DE PAGAMENTO (Linhas 44-46)
        // ============================================
        
        // Linha 45: Forma de Pagamento
        worksheet.getCell('A45').value = daçãos.forma_pagamento || '';
        worksheet.getCell('B45').value = daçãos.forma_pagamento || '';
        worksheet.getCell('C45').value = daçãos.forma_pagamento || '';
        worksheet.getCell('D45').value = daçãos.forma_pagamento || '';
        
        // Percentual
        worksheet.getCell('E45').value = daçãos.percentual_pagamento || 1;
        
        // Método de Pagamento
        worksheet.getCell('F45').value = daçãos.metodo_pagamento || '';
        worksheet.getCell('G45').value = daçãos.metodo_pagamento || '';
        worksheet.getCell('H45').value = daçãos.metodo_pagamento || '';
        
        // Valor Total do Pagamento
        const valorPagamento = totalGeral * (daçãos.percentual_pagamento || 1);
        worksheet.getCell('I45').value = valorPagamento;
        worksheet.getCell('J45').value = valorPagamento;
        worksheet.getCell('I45').numFmt = 'R$ #,##0.00';
        worksheet.getCell('J45').numFmt = 'R$ #,##0.00';
        
        // ============================================
        // GERAR ARQUIVO E ENVIAR
        // ============================================
        
        const buffer = await workbook.xlsx.writeBuffer();
        const nomeArquivo = `Ordem_Producao_${daçãos.num_pedido}_${Date.now()}.xlsx`;
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
        res.setHeader('Content-Length', buffer.length);
        
        logger.info('[GERAR ORDEM EXCEL] Arquivo geração com sucesso:', nomeArquivo);
        res.send(buffer);
        
    } catch (error) {
        logger.error('[GERAR ORDEM EXCEL] Erro ao gerar arquivo:', error);
        res.status(500).json({ 
            message: 'Erro ao gerar ordem de produção em Excel', 
            error: process.env.NODE_ENV === 'development'  error.message : undefined 
        });
    }
});
