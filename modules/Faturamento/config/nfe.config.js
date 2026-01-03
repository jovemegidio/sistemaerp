/**
 * CONFIGURAÇÕES NFe - SEFAZ
 * Configurações para integração com SEFAZ e emissão de NF-e
 */

module.exports = {
    // Ambiente (1 = Produção, 2 = Homologação)
    ambiente: process.env.NFE_AMBIENTE || 2,
    
    // Versão do layout NFe
    versao: '4.00',
    
    // Estados suportados
    estados: {
        'AC': { codigo: 12, nome: 'Acre' },
        'AL': { codigo: 27, nome: 'Alagoas' },
        'AM': { codigo: 13, nome: 'Amazonas' },
        'AP': { codigo: 16, nome: 'Amapá' },
        'BA': { codigo: 29, nome: 'Bahia' },
        'CE': { codigo: 23, nome: 'Ceará' },
        'DF': { codigo: 53, nome: 'Distrito Federal' },
        'ES': { codigo: 32, nome: 'Espírito Santo' },
        'GO': { codigo: 52, nome: 'Goiás' },
        'MA': { codigo: 21, nome: 'Maranhão' },
        'MG': { codigo: 31, nome: 'Minas Gerais' },
        'MS': { codigo: 50, nome: 'Mato Grosso do Sul' },
        'MT': { codigo: 51, nome: 'Mato Grosso' },
        'PA': { codigo: 15, nome: 'Pará' },
        'PB': { codigo: 25, nome: 'Paraíba' },
        'PE': { codigo: 26, nome: 'Pernambuco' },
        'PI': { codigo: 22, nome: 'Piauí' },
        'PR': { codigo: 41, nome: 'Paraná' },
        'RJ': { codigo: 33, nome: 'Rio de Janeiro' },
        'RN': { codigo: 24, nome: 'Rio Grande do Norte' },
        'RO': { codigo: 11, nome: 'Rondônia' },
        'RR': { codigo: 14, nome: 'Roraima' },
        'RS': { codigo: 43, nome: 'Rio Grande do Sul' },
        'SC': { codigo: 42, nome: 'Santa Catarina' },
        'SE': { codigo: 28, nome: 'Sergipe' },
        'SP': { codigo: 35, nome: 'São Paulo' },
        'TO': { codigo: 17, nome: 'Tocantins' }
    },
    
    // Webservices SEFAZ por UF (ambiente de homologação)
    webservices: {
        homologacao: {
            'SP': {
                autorizacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
                retAutorizacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx',
                consulta: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx',
                statusServico: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx',
                inutilizacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx',
                eventos: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx'
            },
            'MG': {
                autorizacao: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4',
                retAutorizacao: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4',
                consulta: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4',
                statusServico: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4',
                inutilizacao: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeInutilizacao4',
                eventos: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4'
            },
            'SVRS': { // Estados que usam SEFAZ Virtual RS
                autorizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
                retAutorizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx',
                consulta: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
                statusServico: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
                inutilizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeInutilizacao/NfeInutilizacao4.asmx',
                eventos: 'https://nfe-homologacao.svrs.rs.gov.br/ws/RecepcaoEvento/RecepcaoEvento4.asmx'
            }
        },
        producao: {
            'SP': {
                autorizacao: 'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
                retAutorizacao: 'https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx',
                consulta: 'https://nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx',
                statusServico: 'https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx',
                inutilizacao: 'https://nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx',
                eventos: 'https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx'
            },
            'MG': {
                autorizacao: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4',
                retAutorizacao: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4',
                consulta: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4',
                statusServico: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4',
                inutilizacao: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeInutilizacao4',
                eventos: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4'
            },
            'SVRS': {
                autorizacao: 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
                retAutorizacao: 'https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx',
                consulta: 'https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
                statusServico: 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
                inutilizacao: 'https://nfe.svrs.rs.gov.br/ws/NfeInutilizacao/NfeInutilizacao4.asmx',
                eventos: 'https://nfe.svrs.rs.gov.br/ws/RecepcaoEvento/RecepcaoEvento4.asmx'
            }
        }
    },
    
    // Mapeamento de estados para autorizadores
    autorizadores: {
        'AC': 'SVRS', 'AL': 'SVRS', 'AM': 'AM', 'AP': 'SVRS', 'BA': 'BA',
        'CE': 'CE', 'DF': 'SVRS', 'ES': 'SVRS', 'GO': 'GO', 'MA': 'SVAN',
        'MG': 'MG', 'MS': 'MS', 'MT': 'MT', 'PA': 'SVAN', 'PB': 'SVRS',
        'PE': 'PE', 'PI': 'SVAN', 'PR': 'PR', 'RJ': 'SVRS', 'RN': 'SVRS',
        'RO': 'SVRS', 'RR': 'SVRS', 'RS': 'RS', 'SC': 'SVRS', 'SE': 'SVRS',
        'SP': 'SP', 'TO': 'SVRS'
    },
    
    // Tipos de emissão
    tiposEmissao: {
        NORMAL: 1,
        CONTINGENCIA_FS_IA: 2,
        CONTINGENCIA_SCAN: 3,
        CONTINGENCIA_DPEC: 4,
        CONTINGENCIA_FS_DA: 5,
        CONTINGENCIA_SVC_AN: 6,
        CONTINGENCIA_SVC_RS: 7,
        CONTINGENCIA_OFFLINE: 9
    },
    
    // Modelos de documento
    modelos: {
        NFE: '55',
        NFCE: '65'
    },
    
    // Finalidades
    finalidades: {
        NORMAL: 1,
        COMPLEMENTAR: 2,
        AJUSTE: 3,
        DEVOLUCAO: 4
    },
    
    // Tipos de operação
    tiposOperacao: {
        ENTRADA: 0,
        SAIDA: 1
    },
    
    // Indicador de presença
    indicadoresPresenca: {
        NAO_SE_APLICA: 0,
        PRESENCIAL: 1,
        INTERNET: 2,
        TELEATENDIMENTO: 3,
        ENTREGA_DOMICILIO: 4,
        PRESENCIAL_FORA: 9
    },
    
    // Timeout para requisições SEFAZ (ms)
    timeout: 30000,
    
    // Diretórios de armazenamento
    diretorios: {
        xmls: process.env.NFE_XML_DIR || './storage/nfe/xmls',
        temporarios: process.env.NFE_TEMP_DIR || './storage/nfe/temp',
        backups: process.env.NFE_BACKUP_DIR || './storage/nfe/backups',
        danfes: process.env.NFE_DANFE_DIR || './storage/nfe/danfes',
        certificados: process.env.NFE_CERT_DIR || './storage/nfe/certificados'
    }
};
