const axios = require('axios');
const https = require('https');
const builder = require('xmlbuilder2');
const nfeConfig = require('../../config/nfe.config');
const certificadoService = require('./certificado.service');

/**
 * SERVIÇO DE INTEGRAÇÃO COM SEFAZ
 * Comunicação completa com webservices da SEFAZ
 */

class SefazService {
    
    /**
     * Enviar NFe para autorização
     */
    async autorizarNFe(xmlNFe, uf) {
        try {
            const idLote = this.gerarIdLote();
            const xmlEnvio = this.criarEnvioLote(idLote, [xmlNFe]);
            
            // Assinar XML
            const xmlAssinação = await certificadoService.assinarXML(xmlEnvio, 'infNFe');
            
            // Obter URL do webservice
            const ambiente = nfeConfig.ambiente === 1 ? 'producao' : 'homologacao';
            const autorizaçãor = nfeConfig.autorizaçãores[uf] || 'SVRS';
            const url = nfeConfig.webservices[ambiente][autorizaçãor].autorizacao;
            
            if (!url) {
                throw new Error(`Webservice de autorização não configuração para UF: ${uf}`);
            }
            
            // Criar SOAP envelope
            const soapEnvelope = this.criarSOAPEnvelope('NFeAutorizacao4', xmlAssinação);
            
            // Enviar requisição
            const response = await this.enviarRequisicaoSOAP(url, soapEnvelope);
            
            // Processar resposta
            const resultado = this.processarRespostaAutorizacao(response.data);
            
            // Se processamento assíncrono, consultar recibo
            if (resultado.codigoStatus === '103') {
                const recibo = resultado.numeroRecibo;
                return await this.consultarRecibo(recibo, uf);
            }
            
            return resultado;
        } catch (error) {
            throw new Error(`Erro ao autorizar NFe: ${error.message}`);
        }
    }
    
    /**
     * Consultar recibo de lote
     */
    async consultarRecibo(numeroRecibo, uf) {
        try {
            const xmlConsulta = this.criarConsultaRecibo(numeroRecibo);
            const xmlAssinação = await certificadoService.assinarXML(xmlConsulta);
            
            const ambiente = nfeConfig.ambiente === 1 ? 'producao' : 'homologacao';
            const autorizaçãor = nfeConfig.autorizaçãores[uf] || 'SVRS';
            const url = nfeConfig.webservices[ambiente][autorizaçãor].retAutorizacao;
            
            const soapEnvelope = this.criarSOAPEnvelope('NFeRetAutorizacao4', xmlAssinação);
            const response = await this.enviarRequisicaoSOAP(url, soapEnvelope);
            
            return this.processarRespostaRecibo(response.data);
        } catch (error) {
            throw new Error(`Erro ao consultar recibo: ${error.message}`);
        }
    }
    
    /**
     * Consultar NFe por chave de acesso
     */
    async consultarNFe(chaveAcesso, uf) {
        try {
            const xmlConsulta = this.criarConsultaNFe(chaveAcesso);
            const xmlAssinação = await certificadoService.assinarXML(xmlConsulta);
            
            const ambiente = nfeConfig.ambiente === 1 ? 'producao' : 'homologacao';
            const autorizaçãor = nfeConfig.autorizaçãores[uf] || 'SVRS';
            const url = nfeConfig.webservices[ambiente][autorizaçãor].consulta;
            
            const soapEnvelope = this.criarSOAPEnvelope('NfeConsultaProtocolo4', xmlConsulta);
            const response = await this.enviarRequisicaoSOAP(url, soapEnvelope);
            
            return this.processarRespostaConsulta(response.data);
        } catch (error) {
            throw new Error(`Erro ao consultar NFe: ${error.message}`);
        }
    }
    
    /**
     * Cancelar NFe
     */
    async cancelarNFe(chaveAcesso, numeroProtocolo, justificativa, uf, cnpj) {
        try {
            if (!justificativa || justificativa.length < 15) {
                throw new Error('Justificativa deve ter no mínimo 15 caracteres');
            }
            
            const xmlEvento = this.criarEventoCancelamento({
                chaveAcesso,
                numeroProtocolo,
                justificativa,
                cnpj,
                sequenciaEvento: 1
            });
            
            return await this.enviarEvento(xmlEvento, uf);
        } catch (error) {
            throw new Error(`Erro ao cancelar NFe: ${error.message}`);
        }
    }
    
    /**
     * Carta de Correção Eletrônica (CC-e)
     */
    async cartaCorrecao(chaveAcesso, correcao, uf, cnpj, sequencia = 1) {
        try {
            if (!correcao || correcao.length < 15) {
                throw new Error('Correção deve ter no mínimo 15 caracteres');
            }
            
            const xmlEvento = this.criarEventoCartaCorrecao({
                chaveAcesso,
                correcao,
                cnpj,
                sequenciaEvento: sequencia
            });
            
            return await this.enviarEvento(xmlEvento, uf);
        } catch (error) {
            throw new Error(`Erro ao enviar carta de correção: ${error.message}`);
        }
    }
    
    /**
     * Inutilizar numeração
     */
    async inutilizarNumeracao(dados, uf) {
        try {
            const { ano, cnpj, modelo, serie, numeroInicial, numeroFinal, justificativa } = dados;
            
            if (!justificativa || justificativa.length < 15) {
                throw new Error('Justificativa deve ter no mínimo 15 caracteres');
            }
            
            const xmlInutilizacao = this.criarInutilizacao({
                ano,
                cnpj,
                modelo,
                serie,
                numeroInicial,
                numeroFinal,
                justificativa
            });
            
            const xmlAssinação = await certificadoService.assinarXML(xmlInutilizacao, 'infInut');
            
            const ambiente = nfeConfig.ambiente === 1 ? 'producao' : 'homologacao';
            const autorizaçãor = nfeConfig.autorizaçãores[uf] || 'SVRS';
            const url = nfeConfig.webservices[ambiente][autorizaçãor].inutilizacao;
            
            const soapEnvelope = this.criarSOAPEnvelope('NfeInutilizacao4', xmlAssinação);
            const response = await this.enviarRequisicaoSOAP(url, soapEnvelope);
            
            return this.processarRespostaInutilizacao(response.data);
        } catch (error) {
            throw new Error(`Erro ao inutilizar numeração: ${error.message}`);
        }
    }
    
    /**
     * Consultar status do serviço SEFAZ
     */
    async consultarStatusServico(uf) {
        try {
            const xmlConsulta = this.criarConsultaStatus();
            
            const ambiente = nfeConfig.ambiente === 1 ? 'producao' : 'homologacao';
            const autorizaçãor = nfeConfig.autorizaçãores[uf] || 'SVRS';
            const url = nfeConfig.webservices[ambiente][autorizaçãor].statusServico;
            
            const soapEnvelope = this.criarSOAPEnvelope('NfeStatusServico4', xmlConsulta);
            const response = await this.enviarRequisicaoSOAP(url, soapEnvelope);
            
            return this.processarRespostaStatus(response.data);
        } catch (error) {
            throw new Error(`Erro ao consultar status: ${error.message}`);
        }
    }
    
    /**
     * Enviar evento (genérico)
     */
    async enviarEvento(xmlEvento, uf) {
        try {
            const xmlAssinação = await certificadoService.assinarXML(xmlEvento, 'infEvento');
            
            const xmlEnvio = this.criarEnvioEvento(xmlAssinação);
            
            const ambiente = nfeConfig.ambiente === 1 ? 'producao' : 'homologacao';
            const autorizaçãor = nfeConfig.autorizaçãores[uf] || 'SVRS';
            const url = nfeConfig.webservices[ambiente][autorizaçãor].eventos;
            
            const soapEnvelope = this.criarSOAPEnvelope('RecepcaoEvento4', xmlEnvio);
            const response = await this.enviarRequisicaoSOAP(url, soapEnvelope);
            
            return this.processarRespostaEvento(response.data);
        } catch (error) {
            throw new Error(`Erro ao enviar evento: ${error.message}`);
        }
    }
    
    // ============================================================
    // MÉTODOS AUXILIARES - CRIAÇÃO DE XMLs
    // ============================================================
    
    criarEnvioLote(idLote, xmlsNFe) {
        const root = builder.create({ version: '1.0', encoding: 'UTF-8' })
            .ele('enviNFe', {
                versao: '4.00',
                xmlns: 'http://www.portalfiscal.inf.br/nfe'
            });
        
        root.ele('idLote').txt(idLote);
        root.ele('indSinc').txt('1'); // 1=Síncrono
        
        xmlsNFe.forEach(xml => {
            root.import(builder.create(xml).first());
        });
        
        return root.end({ prettyPrint: true });
    }
    
    criarConsultaRecibo(numeroRecibo) {
        return builder.create({ version: '1.0', encoding: 'UTF-8' })
            .ele('consReciNFe', {
                versao: '4.00',
                xmlns: 'http://www.portalfiscal.inf.br/nfe'
            })
            .ele('tpAmb').txt(nfeConfig.ambiente.toString()).up()
            .ele('nRec').txt(numeroRecibo)
            .end({ prettyPrint: true });
    }
    
    criarConsultaNFe(chaveAcesso) {
        return builder.create({ version: '1.0', encoding: 'UTF-8' })
            .ele('consSitNFe', {
                versao: '4.00',
                xmlns: 'http://www.portalfiscal.inf.br/nfe'
            })
            .ele('tpAmb').txt(nfeConfig.ambiente.toString()).up()
            .ele('xServ').txt('CONSULTAR').up()
            .ele('chNFe').txt(chaveAcesso)
            .end({ prettyPrint: true });
    }
    
    criarEventoCancelamento(dados) {
        const { chaveAcesso, numeroProtocolo, justificativa, cnpj, sequenciaEvento } = dados;
        const id = `ID110111${chaveAcesso}${sequenciaEvento.toString().padStart(2, '0')}`;
        
        return builder.create({ version: '1.0', encoding: 'UTF-8' })
            .ele('evento', {
                versao: '1.00',
                xmlns: 'http://www.portalfiscal.inf.br/nfe'
            })
            .ele('infEvento', { Id: id })
            .ele('cOrgao').txt(chaveAcesso.substring(0, 2)).up()
            .ele('tpAmb').txt(nfeConfig.ambiente.toString()).up()
            .ele('CNPJ').txt(cnpj.replace(/\D/g, '')).up()
            .ele('chNFe').txt(chaveAcesso).up()
            .ele('dhEvento').txt(this.formatarDataHoraEvento()).up()
            .ele('tpEvento').txt('110111').up() // Cancelamento
            .ele('nSeqEvento').txt(sequenciaEvento.toString()).up()
            .ele('verEvento').txt('1.00').up()
            .ele('detEvento', { versao: '1.00' })
            .ele('descEvento').txt('Cancelamento').up()
            .ele('nProt').txt(numeroProtocolo).up()
            .ele('xJust').txt(justificativa)
            .end({ prettyPrint: true });
    }
    
    criarEventoCartaCorrecao(dados) {
        const { chaveAcesso, correcao, cnpj, sequenciaEvento } = dados;
        const id = `ID110110${chaveAcesso}${sequenciaEvento.toString().padStart(2, '0')}`;
        
        return builder.create({ version: '1.0', encoding: 'UTF-8' })
            .ele('evento', {
                versao: '1.00',
                xmlns: 'http://www.portalfiscal.inf.br/nfe'
            })
            .ele('infEvento', { Id: id })
            .ele('cOrgao').txt(chaveAcesso.substring(0, 2)).up()
            .ele('tpAmb').txt(nfeConfig.ambiente.toString()).up()
            .ele('CNPJ').txt(cnpj.replace(/\D/g, '')).up()
            .ele('chNFe').txt(chaveAcesso).up()
            .ele('dhEvento').txt(this.formatarDataHoraEvento()).up()
            .ele('tpEvento').txt('110110').up() // Carta de Correção
            .ele('nSeqEvento').txt(sequenciaEvento.toString()).up()
            .ele('verEvento').txt('1.00').up()
            .ele('detEvento', { versao: '1.00' })
            .ele('descEvento').txt('Carta de Correcao').up()
            .ele('xCorrecao').txt(correcao)
            .end({ prettyPrint: true });
    }
    
    criarInutilizacao(dados) {
        const { ano, cnpj, modelo, serie, numeroInicial, numeroFinal, justificativa } = dados;
        const uf = '35'; // SP - deve vir dos dados
        const id = `ID${uf}${ano}${cnpj.replace(/\D/g, '')}${modelo}${serie.toString().padStart(3, '0')}${numeroInicial.toString().padStart(9, '0')}${numeroFinal.toString().padStart(9, '0')}`;
        
        return builder.create({ version: '1.0', encoding: 'UTF-8' })
            .ele('inutNFe', {
                versao: '4.00',
                xmlns: 'http://www.portalfiscal.inf.br/nfe'
            })
            .ele('infInut', { Id: id })
            .ele('tpAmb').txt(nfeConfig.ambiente.toString()).up()
            .ele('xServ').txt('INUTILIZAR').up()
            .ele('cUF').txt(uf).up()
            .ele('ano').txt(ano).up()
            .ele('CNPJ').txt(cnpj.replace(/\D/g, '')).up()
            .ele('mod').txt(modelo).up()
            .ele('serie').txt(serie.toString()).up()
            .ele('nNFIni').txt(numeroInicial.toString()).up()
            .ele('nNFFin').txt(numeroFinal.toString()).up()
            .ele('xJust').txt(justificativa)
            .end({ prettyPrint: true });
    }
    
    criarConsultaStatus() {
        return builder.create({ version: '1.0', encoding: 'UTF-8' })
            .ele('consStatServ', {
                versao: '4.00',
                xmlns: 'http://www.portalfiscal.inf.br/nfe'
            })
            .ele('tpAmb').txt(nfeConfig.ambiente.toString()).up()
            .ele('cUF').txt('35').up() // SP
            .ele('xServ').txt('STATUS')
            .end({ prettyPrint: true });
    }
    
    criarEnvioEvento(xmlEvento) {
        return builder.create({ version: '1.0', encoding: 'UTF-8' })
            .ele('envEvento', {
                versao: '1.00',
                xmlns: 'http://www.portalfiscal.inf.br/nfe'
            })
            .ele('idLote').txt(this.gerarIdLote()).up()
            .import(builder.create(xmlEvento).first())
            .end({ prettyPrint: true });
    }
    
    criarSOAPEnvelope(metodo, xmlDaçãos) {
        return `<xml version="1.0" encoding="utf-8">
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
<soap12:Body>
<nfeDaçãosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/${metodo}">
${xmlDaçãos}
</nfeDaçãosMsg>
</soap12:Body>
</soap12:Envelope>`;
    }
    
    // ============================================================
    // MÉTODOS AUXILIARES - COMUNICAÇÃO E PROCESSAMENTO
    // ============================================================
    
    async enviarRequisicaoSOAP(url, soapEnvelope) {
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false, // Em produção, configurar certificados SSL
            cert: certificadoService.certificado,
            key: certificadoService.chavePriva
        });
        
        return await axios.post(url, soapEnvelope, {
            headers: {
                'Content-Type': 'application/soap+xml; charset=utf-8'
            },
            httpsAgent,
            timeout: nfeConfig.timeout
        });
    }
    
    processarRespostaAutorizacao(xml) {
        // Parse simplificação - em produção usar biblioteca XML
        const statusMatch = xml.match(/<cStat>(\d+)<\/cStat>/);
        const motivoMatch = xml.match(/<xMotivo>(.*)<\/xMotivo>/);
        const reciboMatch = xml.match(/<nRec>(.*)<\/nRec>/);
        
        return {
            codigoStatus: statusMatch ? statusMatch[1] : null,
            motivo: motivoMatch ? motivoMatch[1] : null,
            numeroRecibo: reciboMatch ? reciboMatch[1] : null,
            xmlCompleto: xml
        };
    }
    
    processarRespostaRecibo(xml) {
        const statusMatch = xml.match(/<cStat>(\d+)<\/cStat>/);
        const protocoloMatch = xml.match(/<nProt>(.*)<\/nProt>/);
        const chaveMatch = xml.match(/<chNFe>(.*)<\/chNFe>/);
        
        return {
            codigoStatus: statusMatch ? statusMatch[1] : null,
            numeroProtocolo: protocoloMatch ? protocoloMatch[1] : null,
            chaveAcesso: chaveMatch ? chaveMatch[1] : null,
            autorização: statusMatch && statusMatch[1] === '100',
            xmlCompleto: xml
        };
    }
    
    processarRespostaConsulta(xml) {
        return this.processarRespostaRecibo(xml);
    }
    
    processarRespostaEvento(xml) {
        const statusMatch = xml.match(/<cStat>(\d+)<\/cStat>/);
        const protocoloMatch = xml.match(/<nProt>(.*)<\/nProt>/);
        
        return {
            codigoStatus: statusMatch ? statusMatch[1] : null,
            numeroProtocolo: protocoloMatch ? protocoloMatch[1] : null,
            sucesso: statusMatch && (statusMatch[1] === '135' || statusMatch[1] === '136'),
            xmlCompleto: xml
        };
    }
    
    processarRespostaInutilizacao(xml) {
        const statusMatch = xml.match(/<cStat>(\d+)<\/cStat>/);
        
        return {
            codigoStatus: statusMatch ? statusMatch[1] : null,
            sucesso: statusMatch && statusMatch[1] === '102',
            xmlCompleto: xml
        };
    }
    
    processarRespostaStatus(xml) {
        const statusMatch = xml.match(/<cStat>(\d+)<\/cStat>/);
        const motivoMatch = xml.match(/<xMotivo>(.*)<\/xMotivo>/);
        
        return {
            codigoStatus: statusMatch ? statusMatch[1] : null,
            motivo: motivoMatch ? motivoMatch[1] : null,
            online: statusMatch && statusMatch[1] === '107',
            xmlCompleto: xml
        };
    }
    
    gerarIdLote() {
        return Math.floor(100000000000000 + Math.random() * 900000000000000).toString();
    }
    
    formatarDataHoraEvento() {
        const d = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}-03:00`;
    }
}

module.exports = new SefazService();
