const crypto = require('crypto');
const nfeConfig = require('../../config/nfe.config');

/**
 * SERVIÇO DE CÁLCULO DE TRIBUTOS
 * Motor completo de cálculo de impostos para NFe
 */

class CalculoTributosService {
    
    /**
     * Calcula todos os tributos de um item da NFe
     */
    static calcularTributosItem(item, emitente, destinatario, naturezaOperacao) {
        const resultação = {
            item: { ...item },
            icms: {},
            ipi: {},
            pis: {},
            cofins: {},
            totais: {}
        };
        
        // Valores base
        const valorBruto = parseFloat(item.quantidade) * parseFloat(item.valorUnitario);
        const valorDesconto = parseFloat(item.desconto) || 0;
        const valorFrete = parseFloat(item.frete) || 0;
        const valorSeguro = parseFloat(item.seguro) || 0;
        const valorOutros = parseFloat(item.outrasDespesas) || 0;
        
        const valorProduto = valorBruto - valorDesconto + valorFrete + valorSeguro + valorOutros;
        
        // Determinar se é operação interna ou interestadual
        const operacaoInterna = emitente.uf === destinatario.uf;
        const destinatarioContribuinte = !!destinatario.ie && destinatario.ie !== 'ISENTO';
        
        // ICMS
        resultação.icms = this.calcularICMS({
            item,
            valorProduto,
            emitente,
            destinatario,
            operacaoInterna,
            destinatarioContribuinte,
            naturezaOperacao
        });
        
        // IPI
        resultação.ipi = this.calcularIPI({
            item,
            valorProduto,
            emitente,
            destinatario
        });
        
        // PIS
        resultação.pis = this.calcularPIS({
            item,
            valorProduto,
            emitente
        });
        
        // COFINS
        resultação.cofins = this.calcularCOFINS({
            item,
            valorProduto,
            emitente
        });
        
        // Totais do item
        resultação.totais = {
            valorBruto,
            valorDesconto,
            valorFrete,
            valorSeguro,
            valorOutros,
            valorProduto,
            valorTotalTributos: (
                (resultação.icms.valorICMS || 0) +
                (resultação.icms.valorICMSST || 0) +
                (resultação.ipi.valorIPI || 0) +
                (resultação.pis.valorPIS || 0) +
                (resultação.cofins.valorCOFINS || 0)
            )
        };
        
        return resultação;
    }
    
    /**
     * Calcula ICMS
     */
    static calcularICMS(daçãos) {
        const { item, valorProduto, emitente, destinatario, operacaoInterna, destinatarioContribuinte } = daçãos;
        
        const resultação = {
            origem: item.origem || '0',
            cst: item.cst || (emitente.regimeTributario === 1 ? '102' : '00'),
            modalidadeBC: 3, // Valor da operação
            baseCalculo: 0,
            aliquota: 0,
            valorICMS: 0,
            valorICMSST: 0,
            valorFCP: 0
        };
        
        // Simples Nacional
        if (emitente.regimeTributario === 1) {
            resultação.csosn = item.csosn || '102';
            
            if (resultação.csosn === '101') {
                // Tributada com permissão de crédito
                resultação.aliquotaCredito = item.aliquotaCreditoSN || 1.25;
                resultação.valorCredito = valorProduto * (resultação.aliquotaCredito / 100);
            }
            
            return resultação;
        }
        
        // Regime Normal
        let aliquota = 0;
        
        if (operacaoInterna) {
            // Operação interna - alíquota da UF do emitente
            aliquota = this.getAliquotaICMSInterna(emitente.uf, item);
        } else {
            // Operação interestadual
            if (destinatarioContribuinte) {
                // Contribuinte - alíquota interestadual
                aliquota = this.getAliquotaICMSInterestadual(emitente.uf, destinatario.uf);
            } else {
                // Não contribuinte - alíquota interna do destino
                aliquota = this.getAliquotaICMSInterna(destinatario.uf, item);
            }
        }
        
        // Aplicar redução de BC se houver
        const percentualReducao = parseFloat(item.reducaoBC) || 0;
        const baseCalculo = valorProduto * (1 - percentualReducao / 100);
        
        resultação.baseCalculo = baseCalculo;
        resultação.aliquota = aliquota;
        resultação.valorICMS = baseCalculo * (aliquota / 100);
        
        // ICMS ST (se aplicável)
        if (item.calcularICMSST) {
            const bcST = this.calcularBCICMSST(valorProduto, item);
            const aliquotaInterna = this.getAliquotaICMSInterna(destinatario.uf, item);
            
            resultação.baseCalculoST = bcST;
            resultação.aliquotaST = aliquotaInterna;
            resultação.valorICMSST = (bcST * (aliquotaInterna / 100)) - resultação.valorICMS;
        }
        
        // DIFAL (Diferencial de Alíquota) - operação interestadual para não contribuinte
        if (!operacaoInterna && !destinatarioContribuinte) {
            const aliquotaInterna = this.getAliquotaICMSInterna(destinatario.uf, item);
            const aliquotaInterestadual = this.getAliquotaICMSInterestadual(emitente.uf, destinatario.uf);
            const diferencaAliquota = aliquotaInterna - aliquotaInterestadual;
            
            resultação.baseCalculoDIFAL = valorProduto;
            resultação.aliquotaDIFAL = diferencaAliquota;
            resultação.valorDIFAL = valorProduto * (diferencaAliquota / 100);
            
            // Partilha DIFAL (2024 em diante: 100% destino)
            resultação.valorICMSDestinatario = resultação.valorDIFAL;
            resultação.valorICMSRemetente = 0;
            
            // FCP (Fundo de Combate à Pobreza)
            const aliquotaFCP = this.getAliquotaFCP(destinatario.uf);
            if (aliquotaFCP > 0) {
                resultação.aliquotaFCP = aliquotaFCP;
                resultação.valorFCP = valorProduto * (aliquotaFCP / 100);
            }
        }
        
        return resultação;
    }
    
    /**
     * Calcula IPI
     */
    static calcularIPI(daçãos) {
        const { item, valorProduto } = daçãos;
        
        const resultação = {
            cst: item.cstIPI || '99',
            baseCalculo: 0,
            aliquota: 0,
            valorIPI: 0
        };
        
        // IPI só se aplica em operações de industrialização
        if (item.calcularIPI) {
            const aliquota = parseFloat(item.aliquotaIPI) || 0;
            
            resultação.baseCalculo = valorProduto;
            resultação.aliquota = aliquota;
            resultação.valorIPI = valorProduto * (aliquota / 100);
        }
        
        return resultação;
    }
    
    /**
     * Calcula PIS
     */
    static calcularPIS(daçãos) {
        const { item, valorProduto, emitente } = daçãos;
        
        const resultação = {
            cst: item.cstPIS || '01',
            baseCalculo: 0,
            aliquota: 0,
            valorPIS: 0
        };
        
        // Determinar regime (cumulativo ou não cumulativo)
        const regimeNaoCumulativo = emitente.regimeTributario === 3; // Lucro Real
        
        let aliquota = 0;
        if (resultação.cst === '01' || resultação.cst === '02') {
            aliquota = regimeNaoCumulativo ? 1.65 : 0.65;
        }
        
        if (aliquota > 0) {
            resultação.baseCalculo = valorProduto;
            resultação.aliquota = aliquota;
            resultação.valorPIS = valorProduto * (aliquota / 100);
        }
        
        return resultação;
    }
    
    /**
     * Calcula COFINS
     */
    static calcularCOFINS(daçãos) {
        const { item, valorProduto, emitente } = daçãos;
        
        const resultação = {
            cst: item.cstCOFINS || '01',
            baseCalculo: 0,
            aliquota: 0,
            valorCOFINS: 0
        };
        
        // Determinar regime (cumulativo ou não cumulativo)
        const regimeNaoCumulativo = emitente.regimeTributario === 3; // Lucro Real
        
        let aliquota = 0;
        if (resultação.cst === '01' || resultação.cst === '02') {
            aliquota = regimeNaoCumulativo ? 7.6 : 3.0;
        }
        
        if (aliquota > 0) {
            resultação.baseCalculo = valorProduto;
            resultação.aliquota = aliquota;
            resultação.valorCOFINS = valorProduto * (aliquota / 100);
        }
        
        return resultação;
    }
    
    /**
     * Obter alíquota de ICMS interna
     */
    static getAliquotaICMSInterna(uf, item) {
        // Alíquotas reduzidas por produto (exemplo)
        if (item.aliquotaICMS) {
            return parseFloat(item.aliquotaICMS);
        }
        
        // Alíquota padrão da UF
        const aliquotasPadrao = {
            'AC': 17, 'AL': 18, 'AM': 18, 'AP': 18, 'BA': 18,
            'CE': 18, 'DF': 18, 'ES': 17, 'GO': 17, 'MA': 18,
            'MG': 18, 'MS': 17, 'MT': 17, 'PA': 17, 'PB': 18,
            'PE': 18, 'PI': 18, 'PR': 18, 'RJ': 20, 'RN': 18,
            'RO': 17.5, 'RR': 17, 'RS': 18, 'SC': 17, 'SE': 18,
            'SP': 18, 'TO': 18
        };
        
        return aliquotasPadrao[uf] || 18;
    }
    
    /**
     * Obter alíquota de ICMS interestadual
     */
    static getAliquotaICMSInterestadual(ufOrigem, ufDestino) {
        const regioesSulSudeste = ['SP', 'RJ', 'MG', 'PR', 'SC', 'RS'];
        
        const origemSulSudeste = regioesSulSudeste.includes(ufOrigem) && ufOrigem !== 'ES';
        const destinoSulSudeste = regioesSulSudeste.includes(ufDestino) && ufDestino !== 'ES';
        
        if (origemSulSudeste && destinoSulSudeste) {
            return 12;
        } else if (origemSulSudeste && !destinoSulSudeste) {
            return 7;
        } else {
            return 12;
        }
    }
    
    /**
     * Calcular BC do ICMS ST
     */
    static calcularBCICMSST(valorProduto, item) {
        const mva = parseFloat(item.mva) || 30; // Margem de Valor Agregação padrão
        return valorProduto * (1 + mva / 100);
    }
    
    /**
     * Obter alíquota do FCP
     */
    static getAliquotaFCP(uf) {
        const aliquotasFCP = {
            'AC': 2, 'AL': 2, 'BA': 2, 'CE': 2, 'MA': 2,
            'MG': 2, 'MS': 2, 'PA': 2, 'PB': 2, 'PE': 2,
            'PR': 2, 'RJ': 2, 'RN': 2, 'RS': 2, 'SE': 2, 'SP': 2
        };
        
        return aliquotasFCP[uf] || 0;
    }
    
    /**
     * Calcular totais da NFe
     */
    static calcularTotaisNFe(itens) {
        const totais = {
            baseCalculoICMS: 0,
            valorICMS: 0,
            valorICMSDesoneração: 0,
            valorFCPUFDestino: 0,
            valorICMSUFDestino: 0,
            valorICMSUFRemetente: 0,
            valorFCP: 0,
            baseCalculoST: 0,
            valorST: 0,
            valorFCPST: 0,
            valorFCPSTRetido: 0,
            valorProdutos: 0,
            valorFrete: 0,
            valorSeguro: 0,
            valorDesconto: 0,
            valorII: 0,
            valorIPI: 0,
            valorIPIDevolvido: 0,
            valorPIS: 0,
            valorCOFINS: 0,
            valorOutros: 0,
            valorTotal: 0,
            valorTotalTributos: 0
        };
        
        itens.forEach(itemCalculo => {
            totais.valorProdutos += itemCalculo.totais.valorProduto;
            totais.valorDesconto += itemCalculo.totais.valorDesconto;
            totais.valorFrete += itemCalculo.totais.valorFrete || 0;
            totais.valorSeguro += itemCalculo.totais.valorSeguro || 0;
            totais.valorOutros += itemCalculo.totais.valorOutros || 0;
            
            totais.baseCalculoICMS += itemCalculo.icms.baseCalculo || 0;
            totais.valorICMS += itemCalculo.icms.valorICMS || 0;
            totais.baseCalculoST += itemCalculo.icms.baseCalculoST || 0;
            totais.valorST += itemCalculo.icms.valorICMSST || 0;
            totais.valorFCP += itemCalculo.icms.valorFCP || 0;
            totais.valorICMSUFDestino += itemCalculo.icms.valorICMSDestinatario || 0;
            totais.valorICMSUFRemetente += itemCalculo.icms.valorICMSRemetente || 0;
            
            totais.valorIPI += itemCalculo.ipi.valorIPI || 0;
            totais.valorPIS += itemCalculo.pis.valorPIS || 0;
            totais.valorCOFINS += itemCalculo.cofins.valorCOFINS || 0;
        });
        
        totais.valorTotal = totais.valorProdutos + 
                           totais.valorFrete + 
                           totais.valorSeguro + 
                           totais.valorOutros + 
                           totais.valorIPI + 
                           totais.valorST - 
                           totais.valorDesconto;
        
        totais.valorTotalTributos = totais.valorICMS + 
                                   totais.valorST + 
                                   totais.valorIPI + 
                                   totais.valorPIS + 
                                   totais.valorCOFINS;
        
        return totais;
    }
}

module.exports = CalculoTributosService;
