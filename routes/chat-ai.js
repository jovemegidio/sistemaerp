// ============================================
// API DE CHAT COM IA
// Processa mensagens do usuário com GPT/Claude
// ============================================

const express = require('express');
const router = express.Router();

// Simulação de IA (substitua por chamada real à OpenAI/Anthropic)
const knowledgeBase = {
    rh: {
        keywords: ['rh', 'recursos humanos', 'férias', 'folha', 'pagamento', 'benefícios', 'ponto'],
        responses: {
            general: 'Posso te ajudar com:\n\n• Consultar Férias\n• Folha de Pagamento\n• Benefícios (VT, VA, Plano)\n• Controle de Ponto\n• Atestaçãos e Documentos',
            ferias: 'Para consultar suas férias, acesse:\nRH > Colaboraçãores > Meu Perfil > Férias',
            folha: 'Sua folha de pagamento está disponível em:\nRH > Colaboraçãores > Holerites',
            beneficios: 'Para consultar benefícios:\nRH > Colaboraçãores > Meus Benefícios'
        }
    },
    compras: {
        keywords: ['compras', 'compra', 'pedido', 'fornecedor', 'cotação'],
        responses: {
            general: 'No módulo de Compras você pode:\n\n• Criar Pedido de Compra\n• Cadastrar Fornecedores\n• Fazer Cotações\n• Acompanhar Status de Pedidos\n• Gerar Relatórios',
            pedido: 'Para criar um pedido:\nCompras > Pedidos > Novo Pedido',
            fornecedor: 'Para cadastrar fornecedor:\nCompras > Fornecedores > Novo'
        }
    },
    vendas: {
        keywords: ['vendas', 'venda', 'orçamento', 'cliente', 'pedido de venda'],
        responses: {
            general: 'Posso ajudar com:\n\n• Criar Orçamentos\n• Cadastrar Clientes\n• Converter em Pedido\n• Consultar Histórico\n• Relatórios de Vendas',
            orcamento: 'Para criar orçamento:\nVendas > Orçamentos > Novo',
            cliente: 'Para cadastrar cliente:\nVendas > Clientes > Novo'
        }
    },
    pcp: {
        keywords: ['pcp', 'produção', 'ordem de produção', 'op', 'matéria prima'],
        responses: {
            general: 'No PCP você pode:\n\n• Criar Ordem de Produção\n• Acompanhar Status de OP\n• Baixar Matéria-Prima\n• Fechar Produção\n• Relatórios',
            op: 'Para criar OP:\nPCP > Ordens de Produção > Nova OP',
            status: 'Para acompanhar:\nPCP > Ordens de Produção > Visualizar'
        }
    },
    financeiro: {
        keywords: ['financeiro', 'financeira', 'pagar', 'receber', 'boleto', 'caixa'],
        responses: {
            general: 'Posso ajudar com:\n\n• Contas a Pagar\n• Contas a Receber\n• Gerar Boletos\n• Fluxo de Caixa\n• Relatórios Financeiros',
            pagar: 'Contas a Pagar:\nFinanceiro > Contas a Pagar',
            receber: 'Contas a Receber:\nFinanceiro > Contas a Receber'
        }
    },
    nfe: {
        keywords: ['nfe', 'nf-e', 'nota fiscal', 'nota', 'xml'],
        responses: {
            general: 'No módulo NFe:\n\n• Emitir NF-e\n• Consultar Status\n• Cancelar Nota\n• Baixar XML\n• Enviar por Email',
            emitir: 'Para emitir:\nNFe > Notas > Emitir Nova',
            consultar: 'Para consultar:\nNFe > Notas > Consultar'
        }
    }
};

/**
 * Processar mensagem com IA
 */
router.post('/chat', async (req, res) => {
    try {
        const { message, history, context } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Mensagem não fornecida' });
        }
        
        const msg = message.toLowerCase();
        const userName = context.userName || 'Usuário';
        
        // Detectar módulo
        let detectedModule = null;
        let response = '';
        let options = null;
        let suggestTransfer = false;
        
        // Análise de intenção
        for (const [module, data] of Object.entries(knowledgeBase)) {
            if (data.keywords.some(keyword => msg.includes(keyword))) {
                detectedModule = module;
                break;
            }
        }
        
        if (detectedModule) {
            const moduleData = knowledgeBase[detectedModule];
            
            // Resposta específica ou geral
            let foundSpecific = false;
            for (const [key, value] of Object.entries(moduleData.responses)) {
                if (key !== 'general' && msg.includes(key)) {
                    response = value;
                    foundSpecific = true;
                    break;
                }
            }
            
            if (!foundSpecific) {
                response = moduleData.responses.general;
                
                // Adicionar opções baseadas no módulo
                options = getModuleOptions(detectedModule);
            }
            
        } else if (msg.includes('ajuda') || msg.includes('help') || msg.includes('como')) {
            response = `Olá ${userName}! 👋\n\nSou o assistente virtual do sistema Aluforce.\n\nPosso te ajudar com:`;
            options = [
                { label: '👥 RH - Recursos Humanos', value: 'rh' },
                { label: '🛒 Compras', value: 'compras' },
                { label: '💰 Vendas', value: 'vendas' },
                { label: '🏭 PCP - Produção', value: 'pcp' },
                { label: '💳 Financeiro', value: 'financeiro' },
                { label: '📄 NFe - Nota Fiscal', value: 'nfe' },
                { label: '👤 Falar com Atendente', value: 'transferir_humano' }
            ];
            
        } else if (msg.includes('obrigad') || msg.includes('valeu') || msg.includes('ok')) {
            response = 'Fico feliz em ajudar! 😊\n\nPrecisa de mais alguma coisa';
            options = [
                { label: '✅ Sim, tenho outra dúvida', value: 'ajuda' },
                { label: '❌ Não, obrigação', value: 'fim' }
            ];
            
        } else {
            // Não entendeu - sugerir transferência
            response = `Desculpe, não consegui entender completamente sua solicitação. 🤔\n\nVocê pode:\n\n1️⃣ Reformular sua pergunta\n2️⃣ Escolher um módulo específico\n3️⃣ Falar com um atendente humano`;
            
            options = [
                { label: '📋 Ver todos os módulos', value: 'ajuda' },
                { label: '👤 Falar com atendente', value: 'transferir_humano' }
            ];
            
            suggestTransfer = history && history.length > 6; // Após 3 trocas de mensagens
        }
        
        // Retornar resposta
        res.json({
            response,
            options,
            suggestTransfer,
            detectedModule,
            timestamp: Date.now()
        });
        
    } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        res.status(500).json({ 
            error: 'Erro ao processar mensagem',
            response: 'Desculpe, ocorreu um erro. Por favor, tente novamente.',
            suggestTransfer: true
        });
    }
});

/**
 * Obter opções do módulo
 */
function getModuleOptions(module) {
    const options = {
        rh: [
            { label: '📅 Consultar Férias', value: 'ferias' },
            { label: '💰 Folha de Pagamento', value: 'folha' },
            { label: '🎫 Benefícios', value: 'beneficios' },
            { label: '⏰ Controle de Ponto', value: 'ponto' }
        ],
        compras: [
            { label: '📝 Criar Pedido', value: 'criar_pedido' },
            { label: '🏢 Cadastrar Fornecedor', value: 'cadastrar_fornecedor' },
            { label: '💵 Fazer Cotação', value: 'cotacao' }
        ],
        vendas: [
            { label: '📄 Criar Orçamento', value: 'criar_orcamento' },
            { label: '👤 Cadastrar Cliente', value: 'cadastrar_cliente' },
            { label: '📜 Histórico', value: 'historico' }
        ],
        pcp: [
            { label: '📋 Criar OP', value: 'criar_op' },
            { label: '📊 Status de OP', value: 'status_op' },
            { label: '📦 Baixar Matéria-Prima', value: 'baixar_mp' }
        ],
        financeiro: [
            { label: '💸 Contas a Pagar', value: 'contas_pagar' },
            { label: '💰 Contas a Receber', value: 'contas_receber' },
            { label: '🧾 Gerar Boletos', value: 'boletos' }
        ],
        nfe: [
            { label: '📝 Emitir NF-e', value: 'emitir_nfe' },
            { label: '🔍 Consultar Status', value: 'consultar_nfe' },
            { label: '❌ Cancelar Nota', value: 'cancelar_nfe' }
        ]
    };
    
    return options[module] || [];
}

/**
 * Endpoint para conexão com OpenAI (exemplo)
 */
router.post('/chat/openai', async (req, res) => {
    try {
        // Aqui você adicionaria a integração real com OpenAI
        // const { Configuration, OpenAIApi } = require('openai');
        // const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
        // const openai = new OpenAIApi(configuration);
        
        const { message, history } = req.body;
        
        // Exemplo de chamada (descomente quando tiver a chave da API)
        /*
        const completion = await openai.createChatCompletion({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "Você é um assistente virtual do sistema ERP Aluforce. Ajude usuários com dúvidas sobre RH, Compras, Vendas, PCP, Financeiro e NFe."
                },
                ...history,
                { role: "user", content: message }
            ],
            temperature: 0.7,
            max_tokens: 500
        });
        
        res.json({
            response: completion.data.choices[0].message.content,
            timestamp: Date.now()
        });
        */
        
        res.status(501).json({ 
            error: 'OpenAI integration not configured',
            message: 'Configure OPENAI_API_KEY environment variable'
        });
        
    } catch (error) {
        console.error('Erro OpenAI:', error);
        res.status(500).json({ error: 'Erro ao processar com OpenAI' });
    }
});

module.exports = router;
