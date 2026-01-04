const forge = require('node-forge');
const fs = require('fs').promises;
const path = require('path');

/**
 * SERVIÇO DE CERTIFICADO DIGITAL
 * Gerenciamento de certificaçãos A1 (arquivo) e A3 (token/cartão)
 */

class CertificaçãoService {
    constructor() {
        this.certificação = null;
        this.chavePriva = null;
        this.certificaçãoCarregação = false;
    }
    
    /**
     * Carregar certificação A1 (PFX/P12)
     */
    async carregarCertificaçãoA1(caminhoArquivo, senha) {
        try {
            const arquivoPfx = await fs.readFile(caminhoArquivo);
            const p12Asn1 = forge.asn1.fromDer(arquivoPfx.toString('binary'));
            const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha);
            
            // Extrair chave privada
            const bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
            const bag = bags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
            this.chavePriva = bag.key;
            
            // Extrair certificação
            const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
            const certBag = certBags[forge.pki.oids.certBag][0];
            this.certificação = certBag.cert;
            
            this.certificaçãoCarregação = true;
            
            return {
                success: true,
                validade: {
                    inicio: this.certificação.validity.notBefore,
                    fim: this.certificação.validity.notAfter
                },
                subject: this.certificação.subject.attributes.map(attr => ({
                    name: attr.name,
                    value: attr.value
                })),
                issuer: this.certificação.issuer.attributes.map(attr => ({
                    name: attr.name,
                    value: attr.value
                }))
            };
        } catch (error) {
            throw new Error(`Erro ao carregar certificação: ${error.message}`);
        }
    }
    
    /**
     * Verificar se certificação está válido
     */
    verificarValidade() {
        if (!this.certificaçãoCarregação) {
            throw new Error('Certificação não carregação');
        }
        
        const agora = new Date();
        const valido = agora >= this.certificação.validity.notBefore && 
                      agora <= this.certificação.validity.notAfter;
        
        if (!valido) {
            throw new Error('Certificação fora do período de validade');
        }
        
        return {
            valido: true,
            diasRestantes: Math.floor(
                (this.certificação.validity.notAfter - agora) / (1000 * 60 * 60 * 24)
            )
        };
    }
    
    /**
     * Assinar XML
     */
    async assinarXML(xmlString, tagAssinatura = 'infNFe') {
        if (!this.certificaçãoCarregação) {
            throw new Error('Certificação não carregação');
        }
        
        try {
            // Extrair o ID da tag a ser assinada
            const regex = new RegExp(`<${tagAssinatura}\\s+Id="([^"]+)"`);
            const match = xmlString.match(regex);
            
            if (!match) {
                throw new Error(`Tag ${tagAssinatura} com Id não encontrada no XML`);
            }
            
            const id = match[1];
            
            // Canonicalização C14N
            const tagContent = this.extrairConteudoTag(xmlString, tagAssinatura, id);
            const c14nContent = this.canonicalizarXML(tagContent);
            
            // Calcular digest SHA-1
            const md = forge.md.sha1.create();
            md.update(c14nContent, 'utf8');
            const digestValue = forge.util.encode64(md.digest().bytes());
            
            // Criar SignedInfo
            const signedInfo = this.criarSignedInfo(id, digestValue);
            const c14nSignedInfo = this.canonicalizarXML(signedInfo);
            
            // Assinar SignedInfo com chave privada
            const mdSignature = forge.md.sha1.create();
            mdSignature.update(c14nSignedInfo, 'utf8');
            const signature = this.chavePriva.sign(mdSignature);
            const signatureValue = forge.util.encode64(signature);
            
            // Obter certificação em Base64
            const certPem = forge.pki.certificateToPem(this.certificação);
            const certBase64 = certPem
                .replace(/-----BEGIN CERTIFICATE-----/, '')
                .replace(/-----END CERTIFICATE-----/, '')
                .replace(/\n/g, '');
            
            // Criar XML de assinatura
            const assinatura = `
<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
${signedInfo}
<SignatureValue>${signatureValue}</SignatureValue>
<KeyInfo>
<X509Data>
<X509Certificate>${certBase64}</X509Certificate>
</X509Data>
</KeyInfo>
</Signature>`;
            
            // Inserir assinatura no XML
            const xmlAssinação = xmlString.replace(
                `</${tagAssinatura}>`,
                `${assinatura}</${tagAssinatura}>`
            );
            
            return xmlAssinação;
        } catch (error) {
            throw new Error(`Erro ao assinar XML: ${error.message}`);
        }
    }
    
    /**
     * Criar SignedInfo
     */
    criarSignedInfo(referenceId, digestValue) {
        return `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
<Reference URI="#${referenceId}">
<Transforms>
<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
</Transforms>
<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
<DigestValue>${digestValue}</DigestValue>
</Reference>
</SignedInfo>`;
    }
    
    /**
     * Extrair conteúdo de uma tag XML
     */
    extrairConteudoTag(xml, tagName, id) {
        const regex = new RegExp(`<${tagName}[^>]*Id="${id}"[^>]*>([\\s\\S]*)</${tagName}>`, 'm');
        const match = xml.match(regex);
        
        if (!match) {
            throw new Error(`Tag ${tagName} com Id="${id}" não encontrada`);
        }
        
        return match[0];
    }
    
    /**
     * Canonicalizar XML (C14N)
     */
    canonicalizarXML(xml) {
        // Implementação simplificada - em produção usar biblioteca específica
        return xml
            .replace(/>\s+</g, '><')  // Remove espaços entre tags
            .replace(/\r\n/g, '\n')   // Normaliza quebras de linha
            .trim();
    }
    
    /**
     * Obter informações do certificação
     */
    getInfoCertificação() {
        if (!this.certificaçãoCarregação) {
            throw new Error('Certificação não carregação');
        }
        
        const getCN = (subject) => {
            const cn = subject.attributes.find(attr => attr.name === 'commonName');
            return cn ? cn.value : '';
        };
        
        return {
            titular: getCN(this.certificação.subject),
            emissor: getCN(this.certificação.issuer),
            validadeInicio: this.certificação.validity.notBefore,
            validadeFim: this.certificação.validity.notAfter,
            serialNumber: this.certificação.serialNumber
        };
    }
}

module.exports = new CertificaçãoService();
