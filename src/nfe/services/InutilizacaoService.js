/**
 * Serviço de Inutilização de Números de NFe
 * Implementa inutilização de faixa de números não utilizaçãos
 * 
 * @module InutilizacaoService
 */

const xml2js = require('xml2js');
const moment = require('moment-timezone');
// Módulo soap é opcional - NFe não funciona sem ele
let soap = null;
try { soap = require('soap'); } catch (e) { console.warn('[InutilizacaoService] ⚠️  Módulo soap não instalado.'); }

class InutilizacaoService {
    constructor(pool, certificadoService) {
        this.pool = pool;
        this.certificadoService = certificadoService;
        
        // URLs de inutilização por UF (Homologado)
        this.urlsInutilizacaoHomologacao = {
            'SP': 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx',
            'RS': 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx',
            'PR': 'https://homologacao.nfce.fazenda.pr.gov.br/nfce/NFeInutilizacao4',
            'MG': 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeInutilizacao4',
            'SVRS': 'https://nfe-homologacao.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx'
        };

        // URLs de produção
        this.urlsInutilizacaoProducao = {
            'SP': 'https://nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx',
            'RS': 'https://nfe.sefazrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx',
            'SVRS': 'https://nfe.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx'
        };
    }

    /**
     * Inutiliza faixa de números de NFe
     * @param {Object} dados - Daçãos da inutilização
     * @returns {Promise<Object>} Resultado da inutilização
     */
    async inutilizarFaixa(dados) {
        try {
            const {
                ano,
                cnpj,
                uf,
                serie,
                numeroInicial,
                numeroFinal,
                justificativa,
                empresaId = 1,
                ambiente = 'homologacao'
            } = dados;

            console.log(`🚫 Inutilizando faixa ${numeroInicial}-${numeroFinal} série ${serie}...`);

            // Validações
            this.validarDaçãos(dados);

            // Verificar se faixa já foi utilizada
            await this.verificarFaixaUtilizada(serie, numeroInicial, numeroFinal);

            // Gerar XML de inutilização
            const xmlInutilizacao = this.montarXMLInutilizacao({
                ano,
                cnpj,
                uf,
                serie,
                numeroInicial,
                numeroFinal,
                justificativa,
                ambiente
            });

            console.log('🔏 Assinando XML de inutilização...');
            const xmlAssinação = await this.certificadoService.assinarXML(xmlInutilizacao, empresaId);

            console.log('📤 Transmitindo para SEFAZ...');
            const resultado = await this.transmitirInutilizacao(xmlAssinação, uf, ambiente);

            // Processar resultado
            if (resultado.cStat === '102') {
                // Inutilização homologada
                await this.salvarInutilizacao({
                    ano,
                    cnpj,
                    uf,
                    serie,
                    numero_inicial: numeroInicial,
                    numero_final: numeroFinal,
                    justificativa,
                    protocolo: resultado.nProt,
                    data_inutilizacao: resultado.dhRecbto,
                    xml_enviado: xmlAssinação,
                    xml_retorno: JSON.stringify(resultado),
                    ambiente
                });

                console.log('✅ Faixa inutilizada com sucesso!');

                return {
                    sucesso: true,
                    mensagem: 'Faixa inutilizada com sucesso',
                    protocolo: resultado.nProt,
                    dataInutilizacao: resultado.dhRecbto,
                    faixa: `${numeroInicial} a ${numeroFinal}`,
                    serie,
                    sefaz: resultado
                };

            } else {
                // Rejeição
                throw new Error(`Inutilização rejeitada: ${resultado.cStat} - ${resultado.xMotivo}`);
            }

        } catch (error) {
            console.error('❌ Erro ao inutilizar faixa:', error);
            throw error;
        }
    }

    /**
     * Valida dados da inutilização
     */
    validarDaçãos(dados) {
        const { ano, cnpj, uf, serie, numeroInicial, numeroFinal, justificativa } = dados;

        if (!ano || ano < 2000 || ano > 2099) {
            throw new Error('Ano inválido (deve estar entre 2000 e 2099)');
        }

        if (!cnpj || cnpj.replace(/\D/g, '').length !== 14) {
            throw new Error('CNPJ inválido (deve conter 14 dígitos)');
        }

        if (!uf || uf.length !== 2) {
            throw new Error('UF inválida');
        }

        if (!serie || serie < 0 || serie > 999) {
            throw new Error('Série inválida (deve estar entre 0 e 999)');
        }

        if (!numeroInicial || numeroInicial < 1 || numeroInicial > 999999999) {
            throw new Error('Número inicial inválido (deve estar entre 1 e 999999999)');
        }

        if (!numeroFinal || numeroFinal < 1 || numeroFinal > 999999999) {
            throw new Error('Número final inválido (deve estar entre 1 e 999999999)');
        }

        if (numeroFinal < numeroInicial) {
            throw new Error('Número final deve ser maior ou igual ao número inicial');
        }

        const tamanhoFaixa = numeroFinal - numeroInicial + 1;
        if (tamanhoFaixa > 10000) {
            throw new Error('Faixa muito grande (máximo 10.000 números por inutilização)');
        }

        if (!justificativa || justificativa.length < 15) {
            throw new Error('Justificativa deve ter no mínimo 15 caracteres');
        }

        if (justificativa.length > 255) {
            throw new Error('Justificativa deve ter no máximo 255 caracteres');
        }
    }

    /**
     * Verifica se números da faixa já foram utilizaçãos
     */
    async verificarFaixaUtilizada(serie, numeroInicial, numeroFinal) {
        const [nfes] = await this.pool.query(`
            SELECT numero FROM nfes
            WHERE serie = 
            AND numero BETWEEN ? AND 
            LIMIT 1
        `, [serie, numeroInicial, numeroFinal]);

        if (nfes && nfes.length > 0) {
            throw new Error(`Número ${nfes[0].numero} da série ${serie} já foi utilização. Não é possível inutilizar.`);
        }

        // Verificar se faixa já foi inutilizada anteriormente
        const [inutilizadas] = await this.pool.query(`
            SELECT * FROM nfe_inutilizacoes
            WHERE serie = 
            AND ((numero_inicial BETWEEN ? AND ) OR (numero_final BETWEEN ? AND ))
            LIMIT 1
        `, [serie, numeroInicial, numeroFinal, numeroInicial, numeroFinal]);

        if (inutilizadas && inutilizadas.length > 0) {
            throw new Error(`Parte da faixa já foi inutilizada anteriormente (${inutilizadas[0].numero_inicial}-${inutilizadas[0].numero_final})`);
        }
    }

    /**
     * Monta XML de inutilização
     */
    montarXMLInutilizacao(dados) {
        const { ano, cnpj, uf, serie, numeroInicial, numeroFinal, justificativa, ambiente } = dados;

        const cUF = this.obterCodigoUF(uf);
        const tpAmb = ambiente === 'producao' ? '1' : '2';
        const xServ = 'INUTILIZAR';
        const mod = '55'; // Modelo NFe
        
        const idInut = `ID${cUF}${ano.toString().substr(-2)}${cnpj.replace(/\D/g, '')}${mod}${serie.toString().padStart(3, '0')}${numeroInicial.toString().padStart(9, '0')}${numeroFinal.toString().padStart(9, '0')}`;

        return `<xml version="1.0" encoding="UTF-8">
<inutNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
    <infInut Id="${idInut}">
        <tpAmb>${tpAmb}</tpAmb>
        <xServ>${xServ}</xServ>
        <cUF>${cUF}</cUF>
        <ano>${ano.toString().substr(-2)}</ano>
        <CNPJ>${cnpj.replace(/\D/g, '')}</CNPJ>
        <mod>${mod}</mod>
        <serie>${serie}</serie>
        <nNFIni>${numeroInicial}</nNFIni>
        <nNFFin>${numeroFinal}</nNFFin>
        <xJust>${this.normalizarTexto(justificativa)}</xJust>
    </infInut>
</inutNFe>`;
    }

    /**
     * Transmite inutilização para SEFAZ
     */
    async transmitirInutilizacao(xmlInutilizacao, uf, ambiente) {
        try {
            const urls = ambiente === 'producao' ? this.urlsInutilizacaoProducao : this.urlsInutilizacaoHomologacao;
            const url = urls[uf] || urls['SVRS'];

            const client = await soap.createClientAsync(url + 'wsdl', {
                rejectUnauthorized: false,
                timeout: 60000
            });

            const [result] = await client.nfeInutilizacaoNFAsync({
                nfeDaçãosMsg: xmlInutilizacao
            });

            return this.processarRetornoInutilizacao(result);

        } catch (error) {
            console.error('❌ Erro ao transmitir inutilização:', error);
            throw new Error(`Falha na comunicação com SEFAZ: ${error.message}`);
        }
    }

    /**
     * Processa retorno da inutilização
     */
    processarRetornoInutilizacao(result) {
        const retInut = result.nfeResultMsg.retInutNFe.infInut || result.nfeResultMsg;

        return {
            cStat: retInut.cStat,
            xMotivo: retInut.xMotivo,
            nProt: retInut.nProt,
            dhRecbto: retInut.dhRecbto,
            ano: retInut.ano,
            serie: retInut.serie,
            nNFIni: retInut.nNFIni,
            nNFFin: retInut.nNFFin
        };
    }

    /**
     * Salva inutilização no banco
     */
    async salvarInutilizacao(dados) {
        await this.pool.query(`
            INSERT INTO nfe_inutilizacoes (
                ano, cnpj, uf, serie, numero_inicial, numero_final,
                justificativa, protocolo, data_inutilizacao,
                xml_enviado, xml_retorno, ambiente, created_at
            ) VALUES (?, ?, ?, ?, , ?, ?, , ?, ?, , , NOW())
        `, [
            dados.ano,
            dados.cnpj,
            dados.uf,
            dados.serie,
            dados.numero_inicial,
            dados.numero_final,
            dados.justificativa,
            dados.protocolo,
            dados.data_inutilizacao,
            dados.xml_enviado,
            dados.xml_retorno,
            dados.ambiente
        ]);
    }

    /**
     * Lista inutilizações
     */
    async listarInutilizacoes(filtros = {}) {
        let sql = 'SELECT * FROM nfe_inutilizacoes WHERE 1=1';
        const params = [];

        if (filtros.serie !== undefined) {
            sql += ' AND serie = ';
            params.push(filtros.serie);
        }

        if (filtros.ano) {
            sql += ' AND ano = ';
            params.push(filtros.ano);
        }

        if (filtros.uf) {
            sql += ' AND uf = ';
            params.push(filtros.uf);
        }

        sql += ' ORDER BY created_at DESC LIMIT 100';

        const [inutilizacoes] = await this.pool.query(sql, params);
        return inutilizacoes;
    }

    /**
     * Obtém código IBGE da UF
     */
    obterCodigoUF(uf) {
        const codigos = {
            'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29',
            'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21',
            'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15', 'PB': '25',
            'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24',
            'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35',
            'SE': '28', 'TO': '17'
        };
        return codigos[uf] || '35';
    }

    /**
     * Normaliza texto (remove acentos)
     */
    normalizarTexto(texto) {
        return texto
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s.,;:\-\/]/g, '')
            .substring(0, 255);
    }

    /**
     * Gera sugestão de próxima faixa para inutilização
     */
    async sugerirProximaFaixa(serie, anoAtual) {
        // Buscar último número emitido
        const [ultimaEmitida] = await this.pool.query(`
            SELECT MAX(numero) as ultimo_numero
            FROM nfes
            WHERE serie = 
        `, [serie]);

        // Buscar última inutilização
        const [ultimaInutilizada] = await this.pool.query(`
            SELECT MAX(numero_final) as ultimo_inutilização
            FROM nfe_inutilizacoes
            WHERE serie = 
        `, [serie]);

        const ultimoEmitido = ultimaEmitida[0].ultimo_numero || 0;
        const ultimoInutilização = ultimaInutilizada[0].ultimo_inutilização || 0;

        const proximoNumero = Math.max(ultimoEmitido, ultimoInutilização) + 1;

        return {
            serie,
            ano: anoAtual,
            numeroInicial: proximoNumero,
            sugestaoFinal: proximoNumero + 99 // Sugerir faixa de 100 números
        };
    }
}

module.exports = InutilizacaoService;

