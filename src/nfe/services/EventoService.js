/**
 * Serviço de Eventos de NFe
 * Implementa cancelamento e Carta de Correção Eletrônica (CCe)
 * 
 * @module EventoService
 */

const xml2js = require('xml2js');
const moment = require('moment-timezone');
// Módulo soap é opcional - NFe não funciona sem ele
let soap = null;
try { soap = require('soap'); } catch (e) { console.warn('[EventoService] ⚠️  Módulo soap não instalação.'); }

class EventoService {
    constructor(pool, certificaçãoService) {
        this.pool = pool;
        this.certificaçãoService = certificaçãoService;
        
        // URLs de evento por UF (Homologação)
        this.urlsEventoHomologacao = {
            'SP': 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx',
            'RS': 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
            'PR': 'https://homologacao.nfce.fazenda.pr.gov.br/nfce/NFeRecepcaoEvento4',
            'MG': 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4',
            'RJ': 'https://nfe-homologacao.sefaz.rj.gov.br/NFeRecepcaoEvento4',
            'SVRS': 'https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx'
        };

        // URLs de produção
        this.urlsEventoProducao = {
            'SP': 'https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx',
            'RS': 'https://nfe.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
            'SVRS': 'https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx'
        };
    }

    /**
     * Cancela NFe
     * @param {number} nfeId - ID da NFe no banco
     * @param {string} justificativa - Justificativa (mínimo 15 caracteres)
     * @param {number} empresaId - ID da empresa
     * @returns {Promise<Object>} Resultado do cancelamento
     */
    async cancelarNFe(nfeId, justificativa, empresaId = 1) {
        try {
            console.log(`🚫 Iniciando cancelamento da NFe ${nfeId}...`);

            // Validar justificativa
            if (!justificativa || justificativa.length < 15) {
                throw new Error('Justificativa deve ter no mínimo 15 caracteres');
            }

            if (justificativa.length > 255) {
                throw new Error('Justificativa deve ter no máximo 255 caracteres');
            }

            // Buscar NFe
            const [nfes] = await this.pool.query(
                'SELECT * FROM nfes WHERE id = ',
                [nfeId]
            );

            if (!nfes || nfes.length === 0) {
                throw new Error('NFe não encontrada');
            }

            const nfe = nfes[0];

            // Verificar se já está autorizada
            if (nfe.status !== 'autorizada') {
                throw new Error('Apenas NFes autorizadas podem ser canceladas');
            }

            // Verificar se já foi cancelada
            if (nfe.status === 'cancelada') {
                throw new Error('NFe já está cancelada');
            }

            // Verificar prazo de cancelamento (24 horas a partir da autorização)
            const dataAutorizacao = moment(nfe.data_autorizacao);
            const horasDecorridas = moment().diff(dataAutorizacao, 'hours');
            
            if (horasDecorridas > 24) {
                throw new Error(`Prazo de cancelamento expiração (${horasDecorridas}h desde autorização). Máximo: 24h`);
            }

            // Gerar XML do evento de cancelamento
            const sequenciaEvento = await this.obterProximaSequenciaEvento(nfe.chave_acesso, '110111');
            
            const xmlEvento = this.montarEventoCancelamento({
                chaveAcesso: nfe.chave_acesso,
                cnpjEmitente: nfe.emitente_cnpj,
                justificativa,
                sequencia: sequenciaEvento,
                protocolo: nfe.protocolo_autorizacao,
                ambiente: nfe.ambiente || 'homologacao'
            });

            // Assinar XML do evento
            console.log('🔏 Assinando XML do evento...');
            const xmlEventoAssinação = await this.certificaçãoService.assinarXML(xmlEvento, empresaId);

            // Transmitir para SEFAZ
            console.log('📤 Transmitindo evento para SEFAZ...');
            const resultação = await this.transmitirEvento(
                xmlEventoAssinação,
                nfe.emitente_uf || 'SP',
                nfe.ambiente || 'homologacao'
            );

            // Processar resultação
            if (resultação.cStat === '135') {
                // Evento registração e vinculação à NFe
                await this.pool.query(`
                    UPDATE nfes SET 
                        status = 'cancelada',
                        data_cancelamento = NOW(),
                        justificativa_cancelamento = ,
                        protocolo_cancelamento = 
                    WHERE id = 
                `, [justificativa, resultação.nProt, nfeId]);

                // Salvar evento
                await this.salvarEvento({
                    nfe_id: nfeId,
                    tipo_evento: 'cancelamento',
                    sequencia: sequenciaEvento,
                    justificativa,
                    protocolo: resultação.nProt,
                    data_evento: resultação.dhRegEvento,
                    xml_enviação: xmlEventoAssinação,
                    xml_retorno: JSON.stringify(resultação)
                });

                console.log('✅ NFe cancelada com sucesso!');

                return {
                    sucesso: true,
                    mensagem: 'NFe cancelada com sucesso',
                    protocolo: resultação.nProt,
                    dataEvento: resultação.dhRegEvento,
                    sefaz: resultação
                };

            } else {
                // Rejeição
                throw new Error(`Evento rejeitação: ${resultação.cStat} - ${resultação.xMotivo}`);
            }

        } catch (error) {
            console.error('❌ Erro ao cancelar NFe:', error);
            throw error;
        }
    }

    /**
     * Registra Carta de Correção Eletrônica (CCe)
     * @param {number} nfeId - ID da NFe no banco
     * @param {string} correcao - Texto da correção
     * @param {number} empresaId - ID da empresa
     * @returns {Promise<Object>} Resultado da CCe
     */
    async registrarCCe(nfeId, correcao, empresaId = 1) {
        try {
            console.log(`📝 Registrando CCe para NFe ${nfeId}...`);

            // Validar correção
            if (!correcao || correcao.length < 15) {
                throw new Error('Correção deve ter no mínimo 15 caracteres');
            }

            if (correcao.length > 1000) {
                throw new Error('Correção deve ter no máximo 1000 caracteres');
            }

            // Buscar NFe
            const [nfes] = await this.pool.query(
                'SELECT * FROM nfes WHERE id = ',
                [nfeId]
            );

            if (!nfes || nfes.length === 0) {
                throw new Error('NFe não encontrada');
            }

            const nfe = nfes[0];

            // Verificar se está autorizada
            if (nfe.status !== 'autorizada') {
                throw new Error('Apenas NFes autorizadas podem ter CCe');
            }

            // Verificar se foi cancelada
            if (nfe.status === 'cancelada') {
                throw new Error('NFe cancelada não pode ter CCe');
            }

            // Obter sequência do evento (pode ter múltiplas CCe)
            const sequenciaEvento = await this.obterProximaSequenciaEvento(nfe.chave_acesso, '110110');

            // Verificar limite de CCe (máximo 20)
            if (sequenciaEvento > 20) {
                throw new Error('Limite de CCe atingido (máximo 20 por NFe)');
            }

            // Gerar XML do evento de CCe
            const xmlEvento = this.montarEventoCCe({
                chaveAcesso: nfe.chave_acesso,
                cnpjEmitente: nfe.emitente_cnpj,
                correcao,
                sequencia: sequenciaEvento,
                ambiente: nfe.ambiente || 'homologacao'
            });

            // Assinar XML do evento
            console.log('🔏 Assinando XML do evento...');
            const xmlEventoAssinação = await this.certificaçãoService.assinarXML(xmlEvento, empresaId);

            // Transmitir para SEFAZ
            console.log('📤 Transmitindo evento para SEFAZ...');
            const resultação = await this.transmitirEvento(
                xmlEventoAssinação,
                nfe.emitente_uf || 'SP',
                nfe.ambiente || 'homologacao'
            );

            // Processar resultação
            if (resultação.cStat === '135') {
                // Evento registração e vinculação à NFe
                await this.salvarEvento({
                    nfe_id: nfeId,
                    tipo_evento: 'cce',
                    sequencia: sequenciaEvento,
                    justificativa: correcao,
                    protocolo: resultação.nProt,
                    data_evento: resultação.dhRegEvento,
                    xml_enviação: xmlEventoAssinação,
                    xml_retorno: JSON.stringify(resultação)
                });

                console.log('✅ CCe registrada com sucesso!');

                return {
                    sucesso: true,
                    mensagem: 'CCe registrada com sucesso',
                    sequencia: sequenciaEvento,
                    protocolo: resultação.nProt,
                    dataEvento: resultação.dhRegEvento,
                    sefaz: resultação
                };

            } else {
                // Rejeição
                throw new Error(`Evento rejeitação: ${resultação.cStat} - ${resultação.xMotivo}`);
            }

        } catch (error) {
            console.error('❌ Erro ao registrar CCe:', error);
            throw error;
        }
    }

    /**
     * Monta XML de evento de cancelamento
     */
    montarEventoCancelamento(daçãos) {
        const idEvento = `ID110111${daçãos.chaveAcesso}${daçãos.sequencia.toString().padStart(2, '0')}`;
        const dhEvento = moment().tz('America/Sao_Paulo').format('YYYY-MM-DDTHH:mm:ssZ');
        const tpAmb = daçãos.ambiente === 'producao'  '1' : '2';

        return `<xml version="1.0" encoding="UTF-8">
<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
    <infEvento Id="${idEvento}">
        <cOrgao>${daçãos.chaveAcesso.substring(0, 2)}</cOrgao>
        <tpAmb>${tpAmb}</tpAmb>
        <CNPJ>${daçãos.cnpjEmitente.replace(/\D/g, '')}</CNPJ>
        <chNFe>${daçãos.chaveAcesso}</chNFe>
        <dhEvento>${dhEvento}</dhEvento>
        <tpEvento>110111</tpEvento>
        <nSeqEvento>${daçãos.sequencia}</nSeqEvento>
        <verEvento>1.00</verEvento>
        <detEvento versao="1.00">
            <descEvento>Cancelamento</descEvento>
            <nProt>${daçãos.protocolo}</nProt>
            <xJust>${this.normalizarTexto(daçãos.justificativa)}</xJust>
        </detEvento>
    </infEvento>
</evento>`;
    }

    /**
     * Monta XML de evento de CCe
     */
    montarEventoCCe(daçãos) {
        const idEvento = `ID110110${daçãos.chaveAcesso}${daçãos.sequencia.toString().padStart(2, '0')}`;
        const dhEvento = moment().tz('America/Sao_Paulo').format('YYYY-MM-DDTHH:mm:ssZ');
        const tpAmb = daçãos.ambiente === 'producao'  '1' : '2';

        return `<xml version="1.0" encoding="UTF-8">
<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
    <infEvento Id="${idEvento}">
        <cOrgao>${daçãos.chaveAcesso.substring(0, 2)}</cOrgao>
        <tpAmb>${tpAmb}</tpAmb>
        <CNPJ>${daçãos.cnpjEmitente.replace(/\D/g, '')}</CNPJ>
        <chNFe>${daçãos.chaveAcesso}</chNFe>
        <dhEvento>${dhEvento}</dhEvento>
        <tpEvento>110110</tpEvento>
        <nSeqEvento>${daçãos.sequencia}</nSeqEvento>
        <verEvento>1.00</verEvento>
        <detEvento versao="1.00">
            <descEvento>Carta de Correcao</descEvento>
            <xCorrecao>${this.normalizarTexto(daçãos.correcao)}</xCorrecao>
            <xCondUso>A Carta de Correcao e disciplinada pelo paragrafo 1o-A do art. 7o do Convenio S/N, de 15 de dezembro de 1970 e pode ser utilizada para regularizacao de erro ocorrido na emissao de documento fiscal, desde que o erro nao esteja relacionação com: I - as variaveis que determinam o valor do imposto tais como: base de calculo, aliquota, diferenca de preco, quantidade, valor da operacao ou da prestacao; II - a correcao de daçãos cadastrais que implique mudanca do remetente ou do destinatario; III - a data de emissao ou de saida.</xCondUso>
        </detEvento>
    </infEvento>
</evento>`;
    }

    /**
     * Transmite evento para SEFAZ
     */
    async transmitirEvento(xmlEvento, uf, ambiente) {
        try {
            const urls = ambiente === 'producao'  this.urlsEventoProducao : this.urlsEventoHomologacao;
            const url = urls[uf] || urls['SVRS'];

            const client = await soap.createClientAsync(url + 'wsdl', {
                rejectUnauthorized: false,
                timeout: 60000
            });

            // Montar lote de eventos
            const idLote = Date.now().toString().substr(-15);
            const xmlLote = this.montarLoteEvento(xmlEvento, idLote);

            const [result] = await client.nfeRecepcaoEventoAsync({
                nfeDaçãosMsg: xmlLote
            });

            return this.processarRetornoEvento(result);

        } catch (error) {
            console.error('❌ Erro ao transmitir evento:', error);
            throw new Error(`Falha na comunicação com SEFAZ: ${error.message}`);
        }
    }

    /**
     * Monta lote de eventos
     */
    montarLoteEvento(xmlEvento, idLote) {
        return `<xml version="1.0" encoding="UTF-8">
<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
    <idLote>${idLote}</idLote>
    ${xmlEvento}
</envEvento>`;
    }

    /**
     * Processa retorno do evento
     */
    processarRetornoEvento(result) {
        const retorno = result.nfeResultMsg;
        const retEvento = retorno.retEvento;

        return {
            cStat: retEvento.infEvento.cStat || retorno.cStat,
            xMotivo: retEvento.infEvento.xMotivo || retorno.xMotivo,
            nProt: retEvento.infEvento.nProt,
            dhRegEvento: retEvento.infEvento.dhRegEvento,
            chNFe: retEvento.infEvento.chNFe,
            tpEvento: retEvento.infEvento.tpEvento,
            nSeqEvento: retEvento.infEvento.nSeqEvento
        };
    }

    /**
     * Obtém próxima sequência de evento
     */
    async obterProximaSequenciaEvento(chaveAcesso, tipoEvento) {
        const tipoEventoMap = {
            '110111': 'cancelamento',
            '110110': 'cce'
        };

        const tipo = tipoEventoMap[tipoEvento];

        const [eventos] = await this.pool.query(`
            SELECT MAX(sequencia_evento) as max_seq
            FROM nfe_eventos
            WHERE chave_acesso =  AND tipo_evento = 
        `, [chaveAcesso, tipo]);

        const maxSeq = eventos[0].max_seq || 0;
        return maxSeq + 1;
    }

    /**
     * Salva evento no banco
     */
    async salvarEvento(daçãos) {
        await this.pool.query(`
            INSERT INTO nfe_eventos (
                nfe_id, tipo_evento, sequencia_evento,
                chave_acesso, justificativa, protocolo_evento,
                data_evento, xml_enviação, xml_retorno,
                created_at
            ) VALUES (, , , , , , , , , NOW())
        `, [
            daçãos.nfe_id,
            daçãos.tipo_evento,
            daçãos.sequencia,
            daçãos.chaveAcesso || null,
            daçãos.justificativa,
            daçãos.protocolo,
            daçãos.data_evento,
            daçãos.xml_enviação,
            daçãos.xml_retorno
        ]);
    }

    /**
     * Normaliza texto (remove acentos, caracteres especiais)
     */
    normalizarTexto(texto) {
        return texto
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s.,;:\-\/]/g, '')
            .substring(0, 1000);
    }

    /**
     * Lista eventos de uma NFe
     */
    async listarEventos(nfeId) {
        const [eventos] = await this.pool.query(`
            SELECT * FROM nfe_eventos
            WHERE nfe_id = 
            ORDER BY created_at DESC
        `, [nfeId]);

        return eventos;
    }
}

module.exports = EventoService;
