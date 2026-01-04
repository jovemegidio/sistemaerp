const builder = require('xmlbuilder2');
const crypto = require('crypto');

/**
 * SERVIÇO DE GERAÇÃO DE XML NFe 4.0
 * Gera XML completo conforme layout SEFAZ 4.0
 */

class XmlNFeService {
    
    /**
     * Gerar XML completo da NFe
     */
    static gerarXML(daçãosNFe) {
        const { emitente, destinatario, itens, totais, transporte, pagamento, informacoesAdicionais } = daçãosNFe;
        
        // Gerar chave de acesso
        const chaveAcesso = this.gerarChaveAcesso(daçãosNFe);
        const idNFe = `NFe${chaveAcesso}`;
        
        // Criar estrutura XML
        const xml = builder.create({ version: '1.0', encoding: 'UTF-8' })
            .ele('nfeProc', {
                versao: '4.00',
                xmlns: 'http://www.portalfiscal.inf.br/nfe'
            })
            .ele('NFe', { xmlns: 'http://www.portalfiscal.inf.br/nfe' })
            .ele('infNFe', { 
                versao: '4.00', 
                Id: idNFe 
            });
        
        // IDE - Identificação
        this.adicionarIDE(xml, daçãosNFe, chaveAcesso);
        
        // Emitente
        this.adicionarEmitente(xml, emitente);
        
        // Destinatário
        this.adicionarDestinatario(xml, destinatario);
        
        // Itens
        itens.forEach((item, index) => {
            this.adicionarItem(xml, item, index + 1, emitente, destinatario);
        });
        
        // Total
        this.adicionarTotal(xml, totais);
        
        // Transporte
        this.adicionarTransporte(xml, transporte);
        
        // Pagamento
        this.adicionarPagamento(xml, pagamento);
        
        // Informações Adicionais
        if (informacoesAdicionais) {
            this.adicionarInformacoesAdicionais(xml, informacoesAdicionais);
        }
        
        const xmlString = xml.end({ prettyPrint: true });
        
        return {
            xml: xmlString,
            chaveAcesso,
            idNFe
        };
    }
    
    /**
     * Adicionar IDE (Identificação)
     */
    static adicionarIDE(xml, daçãos, chaveAcesso) {
        const ide = xml.ele('ide');
        
        ide.ele('cUF').txt(daçãos.codigoUF);
        ide.ele('cNF').txt(daçãos.codigoNumerico || this.gerarCodigoNumerico());
        ide.ele('natOp').txt(daçãos.naturezaOperacao);
        ide.ele('mod').txt(daçãos.modelo || '55');
        ide.ele('serie').txt(daçãos.serie);
        ide.ele('nNF').txt(daçãos.numeroNFe);
        ide.ele('dhEmi').txt(this.formatarDataHora(daçãos.dataEmissao || new Date()));
        ide.ele('dhSaiEnt').txt(this.formatarDataHora(daçãos.dataSaida || new Date()));
        ide.ele('tpNF').txt(daçãos.tipoOperacao); // 0=Entrada, 1=Saída
        ide.ele('idDest').txt(this.identificarDestinatario(daçãos.emitente.uf, daçãos.destinatario.uf));
        ide.ele('cMunFG').txt(daçãos.emitente.codigoMunicipio);
        ide.ele('tpImp').txt('1'); // 1=DANFE Retrato
        ide.ele('tpEmis').txt(daçãos.tipoEmissao || '1'); // 1=Normal
        ide.ele('cDV').txt(chaveAcesso.substring(43));
        ide.ele('tpAmb').txt(daçãos.ambiente || '2'); // 1=Produção, 2=Homologação
        ide.ele('finNFe').txt(daçãos.finalidade || '1'); // 1=Normal
        ide.ele('indFinal').txt(daçãos.consumidorFinal || '1'); // 1=Consumidor Final
        ide.ele('indPres').txt(daçãos.indicaçãorPresenca || '1'); // 1=Presencial
        ide.ele('procEmi').txt('0'); // 0=Aplicativo do contribuinte
        ide.ele('verProc').txt(daçãos.versaoAplicativo || '1.0.0');
        
        return ide.up();
    }
    
    /**
     * Adicionar Emitente
     */
    static adicionarEmitente(xml, emitente) {
        const emit = xml.ele('emit');
        
        emit.ele('CNPJ').txt(emitente.cnpj.replace(/\D/g, ''));
        emit.ele('xNome').txt(emitente.razaoSocial);
        emit.ele('xFant').txt(emitente.nomeFantasia || emitente.razaoSocial);
        
        const enderEmit = emit.ele('enderEmit');
        enderEmit.ele('xLgr').txt(emitente.lograçãouro);
        enderEmit.ele('nro').txt(emitente.numero);
        if (emitente.complemento) enderEmit.ele('xCpl').txt(emitente.complemento);
        enderEmit.ele('xBairro').txt(emitente.bairro);
        enderEmit.ele('cMun').txt(emitente.codigoMunicipio);
        enderEmit.ele('xMun').txt(emitente.municipio);
        enderEmit.ele('UF').txt(emitente.uf);
        enderEmit.ele('CEP').txt(emitente.cep.replace(/\D/g, ''));
        enderEmit.ele('cPais').txt('1058'); // Brasil
        enderEmit.ele('xPais').txt('Brasil');
        if (emitente.telefone) enderEmit.ele('fone').txt(emitente.telefone.replace(/\D/g, ''));
        enderEmit.up();
        
        emit.ele('IE').txt(emitente.ie.replace(/\D/g, ''));
        emit.ele('CRT').txt(emitente.regimeTributario.toString()); // 1=Simples Nacional, 3=Normal
        
        return emit.up();
    }
    
    /**
     * Adicionar Destinatário
     */
    static adicionarDestinatario(xml, destinatario) {
        const dest = xml.ele('dest');
        
        // CPF ou CNPJ
        if (destinatario.cnpj) {
            dest.ele('CNPJ').txt(destinatario.cnpj.replace(/\D/g, ''));
        } else if (destinatario.cpf) {
            dest.ele('CPF').txt(destinatario.cpf.replace(/\D/g, ''));
        }
        
        dest.ele('xNome').txt(destinatario.nome);
        
        const enderDest = dest.ele('enderDest');
        enderDest.ele('xLgr').txt(destinatario.lograçãouro);
        enderDest.ele('nro').txt(destinatario.numero);
        if (destinatario.complemento) enderDest.ele('xCpl').txt(destinatario.complemento);
        enderDest.ele('xBairro').txt(destinatario.bairro);
        enderDest.ele('cMun').txt(destinatario.codigoMunicipio);
        enderDest.ele('xMun').txt(destinatario.municipio);
        enderDest.ele('UF').txt(destinatario.uf);
        enderDest.ele('CEP').txt(destinatario.cep.replace(/\D/g, ''));
        enderDest.ele('cPais').txt('1058');
        enderDest.ele('xPais').txt('Brasil');
        if (destinatario.telefone) enderDest.ele('fone').txt(destinatario.telefone.replace(/\D/g, ''));
        enderDest.up();
        
        dest.ele('indIEDest').txt(destinatario.ie ? '1' : '9'); // 1=Contribuinte, 9=Não Contribuinte
        if (destinatario.ie && destinatario.ie !== 'ISENTO') {
            dest.ele('IE').txt(destinatario.ie.replace(/\D/g, ''));
        }
        
        if (destinatario.email) {
            dest.ele('email').txt(destinatario.email);
        }
        
        return dest.up();
    }
    
    /**
     * Adicionar Item
     */
    static adicionarItem(xml, itemCalculação, numero, emitente, destinatario) {
        const det = xml.ele('det', { nItem: numero });
        
        // Produto
        const prod = det.ele('prod');
        prod.ele('cProd').txt(itemCalculação.item.codigo);
        prod.ele('cEAN').txt(itemCalculação.item.ean || 'SEM GTIN');
        prod.ele('xProd').txt(itemCalculação.item.descricao);
        prod.ele('NCM').txt(itemCalculação.item.ncm);
        if (itemCalculação.item.cest) prod.ele('CEST').txt(itemCalculação.item.cest);
        if (itemCalculação.item.cfop) prod.ele('CFOP').txt(itemCalculação.item.cfop);
        prod.ele('uCom').txt(itemCalculação.item.unidade);
        prod.ele('qCom').txt(this.formatarDecimal(itemCalculação.item.quantidade, 4));
        prod.ele('vUnCom').txt(this.formatarDecimal(itemCalculação.item.valorUnitario, 10));
        prod.ele('vProd').txt(this.formatarDecimal(itemCalculação.totais.valorBruto, 2));
        prod.ele('cEANTrib').txt(itemCalculação.item.ean || 'SEM GTIN');
        prod.ele('uTrib').txt(itemCalculação.item.unidade);
        prod.ele('qTrib').txt(this.formatarDecimal(itemCalculação.item.quantidade, 4));
        prod.ele('vUnTrib').txt(this.formatarDecimal(itemCalculação.item.valorUnitario, 10));
        if (itemCalculação.totais.valorFrete > 0) prod.ele('vFrete').txt(this.formatarDecimal(itemCalculação.totais.valorFrete, 2));
        if (itemCalculação.totais.valorSeguro > 0) prod.ele('vSeg').txt(this.formatarDecimal(itemCalculação.totais.valorSeguro, 2));
        if (itemCalculação.totais.valorDesconto > 0) prod.ele('vDesc').txt(this.formatarDecimal(itemCalculação.totais.valorDesconto, 2));
        if (itemCalculação.totais.valorOutros > 0) prod.ele('vOutro').txt(this.formatarDecimal(itemCalculação.totais.valorOutros, 2));
        prod.ele('indTot').txt('1'); // 1=Valor compõe total da NFe
        prod.up();
        
        // Impostos
        const imposto = det.ele('imposto');
        
        // Valor aproximação dos tributos
        if (itemCalculação.totais.valorTotalTributos > 0) {
            imposto.ele('vTotTrib').txt(this.formatarDecimal(itemCalculação.totais.valorTotalTributos, 2));
        }
        
        // ICMS
        this.adicionarICMS(imposto, itemCalculação.icms, emitente);
        
        // IPI
        if (itemCalculação.ipi.valorIPI > 0) {
            this.adicionarIPI(imposto, itemCalculação.ipi);
        }
        
        // PIS
        this.adicionarPIS(imposto, itemCalculação.pis);
        
        // COFINS
        this.adicionarCOFINS(imposto, itemCalculação.cofins);
        
        imposto.up();
        det.up();
        
        return det;
    }
    
    /**
     * Adicionar ICMS
     */
    static adicionarICMS(imposto, icms, emitente) {
        const icmsNode = imposto.ele('ICMS');
        
        if (emitente.regimeTributario === 1) {
            // Simples Nacional
            const icmsSN = icmsNode.ele('ICMSSN' + icms.csosn);
            icmsSN.ele('orig').txt(icms.origem);
            icmsSN.ele('CSOSN').txt(icms.csosn);
            
            if (icms.csosn === '101') {
                icmsSN.ele('pCredSN').txt(this.formatarDecimal(icms.aliquotaCredito, 4));
                icmsSN.ele('vCredICMSSN').txt(this.formatarDecimal(icms.valorCredito, 2));
            }
            
            icmsSN.up();
        } else {
            // Regime Normal
            const icms00 = icmsNode.ele('ICMS' + icms.cst);
            icms00.ele('orig').txt(icms.origem);
            icms00.ele('CST').txt(icms.cst);
            
            if (icms.baseCalculo > 0) {
                icms00.ele('modBC').txt(icms.modalidadeBC.toString());
                icms00.ele('vBC').txt(this.formatarDecimal(icms.baseCalculo, 2));
                icms00.ele('pICMS').txt(this.formatarDecimal(icms.aliquota, 4));
                icms00.ele('vICMS').txt(this.formatarDecimal(icms.valorICMS, 2));
            }
            
            if (icms.valorFCP > 0) {
                icms00.ele('pFCP').txt(this.formatarDecimal(icms.aliquotaFCP, 4));
                icms00.ele('vFCP').txt(this.formatarDecimal(icms.valorFCP, 2));
            }
            
            icms00.up();
        }
        
        return icmsNode.up();
    }
    
    /**
     * Adicionar IPI
     */
    static adicionarIPI(imposto, ipi) {
        const ipiNode = imposto.ele('IPI');
        ipiNode.ele('cEnq').txt('999'); // Código de enquadramento
        
        const ipiTrib = ipiNode.ele('IPITrib');
        ipiTrib.ele('CST').txt(ipi.cst);
        ipiTrib.ele('vBC').txt(this.formatarDecimal(ipi.baseCalculo, 2));
        ipiTrib.ele('pIPI').txt(this.formatarDecimal(ipi.aliquota, 4));
        ipiTrib.ele('vIPI').txt(this.formatarDecimal(ipi.valorIPI, 2));
        ipiTrib.up();
        
        return ipiNode.up();
    }
    
    /**
     * Adicionar PIS
     */
    static adicionarPIS(imposto, pis) {
        const pisNode = imposto.ele('PIS');
        
        if (pis.valorPIS > 0) {
            const pisAliq = pisNode.ele('PISAliq');
            pisAliq.ele('CST').txt(pis.cst);
            pisAliq.ele('vBC').txt(this.formatarDecimal(pis.baseCalculo, 2));
            pisAliq.ele('pPIS').txt(this.formatarDecimal(pis.aliquota, 4));
            pisAliq.ele('vPIS').txt(this.formatarDecimal(pis.valorPIS, 2));
            pisAliq.up();
        } else {
            const pisNT = pisNode.ele('PISNT');
            pisNT.ele('CST').txt(pis.cst);
            pisNT.up();
        }
        
        return pisNode.up();
    }
    
    /**
     * Adicionar COFINS
     */
    static adicionarCOFINS(imposto, cofins) {
        const cofinsNode = imposto.ele('COFINS');
        
        if (cofins.valorCOFINS > 0) {
            const cofinsAliq = cofinsNode.ele('COFINSAliq');
            cofinsAliq.ele('CST').txt(cofins.cst);
            cofinsAliq.ele('vBC').txt(this.formatarDecimal(cofins.baseCalculo, 2));
            cofinsAliq.ele('pCOFINS').txt(this.formatarDecimal(cofins.aliquota, 4));
            cofinsAliq.ele('vCOFINS').txt(this.formatarDecimal(cofins.valorCOFINS, 2));
            cofinsAliq.up();
        } else {
            const cofinsNT = cofinsNode.ele('COFINSNT');
            cofinsNT.ele('CST').txt(cofins.cst);
            cofinsNT.up();
        }
        
        return cofinsNode.up();
    }
    
    /**
     * Adicionar Total
     */
    static adicionarTotal(xml, totais) {
        const total = xml.ele('total');
        const icmsTot = total.ele('ICMSTot');
        
        icmsTot.ele('vBC').txt(this.formatarDecimal(totais.baseCalculoICMS, 2));
        icmsTot.ele('vICMS').txt(this.formatarDecimal(totais.valorICMS, 2));
        icmsTot.ele('vICMSDeson').txt(this.formatarDecimal(totais.valorICMSDesoneração || 0, 2));
        icmsTot.ele('vFCPUFDest').txt(this.formatarDecimal(totais.valorFCPUFDestino || 0, 2));
        icmsTot.ele('vICMSUFDest').txt(this.formatarDecimal(totais.valorICMSUFDestino || 0, 2));
        icmsTot.ele('vICMSUFRemet').txt(this.formatarDecimal(totais.valorICMSUFRemetente || 0, 2));
        icmsTot.ele('vFCP').txt(this.formatarDecimal(totais.valorFCP || 0, 2));
        icmsTot.ele('vBCST').txt(this.formatarDecimal(totais.baseCalculoST || 0, 2));
        icmsTot.ele('vST').txt(this.formatarDecimal(totais.valorST || 0, 2));
        icmsTot.ele('vFCPST').txt(this.formatarDecimal(totais.valorFCPST || 0, 2));
        icmsTot.ele('vFCPSTRet').txt(this.formatarDecimal(totais.valorFCPSTRetido || 0, 2));
        icmsTot.ele('vProd').txt(this.formatarDecimal(totais.valorProdutos, 2));
        icmsTot.ele('vFrete').txt(this.formatarDecimal(totais.valorFrete || 0, 2));
        icmsTot.ele('vSeg').txt(this.formatarDecimal(totais.valorSeguro || 0, 2));
        icmsTot.ele('vDesc').txt(this.formatarDecimal(totais.valorDesconto || 0, 2));
        icmsTot.ele('vII').txt(this.formatarDecimal(totais.valorII || 0, 2));
        icmsTot.ele('vIPI').txt(this.formatarDecimal(totais.valorIPI || 0, 2));
        icmsTot.ele('vIPIDevol').txt(this.formatarDecimal(totais.valorIPIDevolvido || 0, 2));
        icmsTot.ele('vPIS').txt(this.formatarDecimal(totais.valorPIS, 2));
        icmsTot.ele('vCOFINS').txt(this.formatarDecimal(totais.valorCOFINS, 2));
        icmsTot.ele('vOutro').txt(this.formatarDecimal(totais.valorOutros || 0, 2));
        icmsTot.ele('vNF').txt(this.formatarDecimal(totais.valorTotal, 2));
        icmsTot.ele('vTotTrib').txt(this.formatarDecimal(totais.valorTotalTributos || 0, 2));
        icmsTot.up();
        
        return total.up();
    }
    
    /**
     * Adicionar Transporte
     */
    static adicionarTransporte(xml, transporte) {
        const transp = xml.ele('transp');
        transp.ele('modFrete').txt(transporte.modalidade || '9'); // 9=Sem frete
        
        if (transporte && transporte.transportaçãora) {
            const transporta = transp.ele('transporta');
            if (transporte.transportaçãora.cnpj) {
                transporta.ele('CNPJ').txt(transporte.transportaçãora.cnpj.replace(/\D/g, ''));
            }
            transporta.ele('xNome').txt(transporte.transportaçãora.nome);
            if (transporte.transportaçãora.ie) {
                transporta.ele('IE').txt(transporte.transportaçãora.ie);
            }
            if (transporte.transportaçãora.endereco) {
                transporta.ele('xEnder').txt(transporte.transportaçãora.endereco);
            }
            if (transporte.transportaçãora.municipio) {
                transporta.ele('xMun').txt(transporte.transportaçãora.municipio);
            }
            if (transporte.transportaçãora.uf) {
                transporta.ele('UF').txt(transporte.transportaçãora.uf);
            }
            transporta.up();
        }
        
        return transp.up();
    }
    
    /**
     * Adicionar Pagamento
     */
    static adicionarPagamento(xml, pagamento) {
        const pag = xml.ele('pag');
        
        pagamento.forEach(forma => {
            const detPag = pag.ele('detPag');
            detPag.ele('indPag').txt(forma.indicaçãor || '0'); // 0=À vista, 1=À prazo
            detPag.ele('tPag').txt(forma.forma); // 01=Dinheiro, 03=Cartão, etc
            detPag.ele('vPag').txt(this.formatarDecimal(forma.valor, 2));
            detPag.up();
        });
        
        return pag.up();
    }
    
    /**
     * Adicionar Informações Adicionais
     */
    static adicionarInformacoesAdicionais(xml, info) {
        const infAdic = xml.ele('infAdic');
        
        if (info.fisco) {
            infAdic.ele('infAdFisco').txt(info.fisco);
        }
        
        if (info.complementar) {
            infAdic.ele('infCpl').txt(info.complementar);
        }
        
        return infAdic.up();
    }
    
    /**
     * Gerar chave de acesso da NFe (44 dígitos)
     */
    static gerarChaveAcesso(daçãos) {
        const uf = daçãos.codigoUF.toString().padStart(2, '0');
        const aamm = this.formatarAAMM(daçãos.dataEmissao);
        const cnpj = daçãos.emitente.cnpj.replace(/\D/g, '').padStart(14, '0');
        const mod = (daçãos.modelo || '55').padStart(2, '0');
        const serie = daçãos.serie.toString().padStart(3, '0');
        const numero = daçãos.numeroNFe.toString().padStart(9, '0');
        const tipoEmissao = (daçãos.tipoEmissao || '1').toString();
        const codigoNumerico = (daçãos.codigoNumerico || this.gerarCodigoNumerico()).toString().padStart(8, '0');
        
        const chave43 = uf + aamm + cnpj + mod + serie + numero + tipoEmissao + codigoNumerico;
        const dv = this.calcularDigitoVerificaçãor(chave43);
        
        return chave43 + dv;
    }
    
    /**
     * Calcular dígito verificaçãor da chave de acesso
     */
    static calcularDigitoVerificaçãor(chave43) {
        const multiplicaçãores = [2, 3, 4, 5, 6, 7, 8, 9];
        let soma = 0;
        let multiplicaçãorIndex = 0;
        
        for (let i = chave43.length - 1; i >= 0; i--) {
            soma += parseInt(chave43[i]) * multiplicaçãores[multiplicaçãorIndex];
            multiplicaçãorIndex = (multiplicaçãorIndex + 1) % multiplicaçãores.length;
        }
        
        const resto = soma % 11;
        return resto === 0 || resto === 1 ? 0 : 11 - resto;
    }
    
    /**
     * Gerar código numérico aleatório (8 dígitos)
     */
    static gerarCodigoNumerico() {
        return Math.floor(10000000 + Math.random() * 90000000);
    }
    
    /**
     * Identificar destinatário (1=Operação interna, 2=Interestadual, 3=Exterior)
     */
    static identificarDestinatario(ufEmitente, ufDestinatario) {
        if (!ufDestinatario || ufDestinatario === 'EX') return '3';
        return ufEmitente === ufDestinatario ? '1' : '2';
    }
    
    /**
     * Formatar data/hora para padrão NFe (AAAA-MM-DDTHH:MM:SS-03:00)
     */
    static formatarDataHora(data) {
        const d = new Date(data);
        const offset = -3; // UTC-3 (Brasília)
        const pad = (n) => n.toString().padStart(2, '0');
        
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${offset >= 0 ? '+' : ''}${pad(Math.abs(offset))}:00`;
    }
    
    /**
     * Formatar AAMM (Ano e Mês)
     */
    static formatarAAMM(data) {
        const d = new Date(data);
        const ano = d.getFullYear().toString().substring(2);
        const mes = (d.getMonth() + 1).toString().padStart(2, '0');
        return ano + mes;
    }
    
    /**
     * Formatar decimal para XML
     */
    static formatarDecimal(valor, casas) {
        return parseFloat(valor).toFixed(casas);
    }
}

module.exports = XmlNFeService;
