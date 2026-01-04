/**
 * Controller de Certificação Digital
 * Gerencia requisições HTTP relacionadas a certificaçãos
 * 
 * @module CertificaçãoController
 */

const express = require('express');
const multer = require('multer');
const CertificaçãoService = require('../services/CertificaçãoService');

// Configurar upload de arquivos
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/x-pkcs12' || file.originalname.endsWith('.pfx')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos .pfx são permitidos'));
        }
    }
});

function createCertificaçãoController(pool) {
    const router = express.Router();
    const certificaçãoService = new CertificaçãoService(pool);

    /**
     * POST /api/nfe/certificação/upload
     * Upload de certificação digital A1
     */
    router.post('/upload', upload.single('certificação'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Nenhum arquivo enviação'
                });
            }

            const { senha } = req.body;
            if (!senha) {
                return res.status(400).json({
                    success: false,
                    error: 'Senha do certificação é obrigatória'
                });
            }

            const empresaId = req.user.empresa_id || 1;
            const pfxBuffer = req.file.buffer;

            const result = await certificaçãoService.uploadCertificação(pfxBuffer, senha, empresaId);

            res.json(result);

        } catch (error) {
            console.error('❌ Erro no upload do certificação:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/nfe/certificação/status
     * Obter status do certificação configuração
     */
    router.get('/status', async (req, res) => {
        try {
            const empresaId = req.user.empresa_id || 1;
            const status = await certificaçãoService.getStatus(empresaId);

            res.json(status);

        } catch (error) {
            console.error('❌ Erro ao obter status do certificação:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/nfe/certificação
     * Remove certificação configuração
     */
    router.delete('/', async (req, res) => {
        try {
            const empresaId = req.user.empresa_id || 1;
            const result = await certificaçãoService.removerCertificação(empresaId);

            res.json(result);

        } catch (error) {
            console.error('❌ Erro ao remover certificação:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/nfe/certificação/testar
     * Testa certificação sem salvar
     */
    router.post('/testar', upload.single('certificação'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Nenhum arquivo enviação'
                });
            }

            const { senha } = req.body;
            if (!senha) {
                return res.status(400).json({
                    success: false,
                    error: 'Senha do certificação é obrigatória'
                });
            }

            const pfxBuffer = req.file.buffer;

            // Apenas validar, sem salvar
            const certData = await certificaçãoService.validarCertificação(pfxBuffer, senha);
            const info = certificaçãoService.extrairInformacoes(certData);

            const hoje = new Date();
            const diasRestantes = Math.ceil((info.validade - hoje) / (1000 * 60 * 60 * 24));

            res.json({
                success: true,
                message: 'Certificação válido',
                info: {
                    cnpj: info.cnpj,
                    razaoSocial: info.razaoSocial,
                    validade: info.validade,
                    emissao: info.emissao,
                    diasRestantes: diasRestantes,
                    emissor: info.emissor,
                    status: diasRestantes > 30 ? 'valido' : diasRestantes > 0 ? 'expirando' : 'expiração'
                }
            });

        } catch (error) {
            console.error('❌ Erro ao testar certificação:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
}

module.exports = createCertificaçãoController;
