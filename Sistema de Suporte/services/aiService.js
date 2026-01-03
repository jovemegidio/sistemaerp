const db = require('../database/db');

// Palavras-chave que indicam necessidade de atendente humano
const humanTriggers = [
    'falar com atendente',
    'falar com humano',
    'atendente',
    'pessoa real',
    'não entendi',
    'não ajudou',
    'preciso de ajuda urgente',
    'urgente',
    'reclamação',
    'insatisfeito',
    'problema grave',
    'erro no sistema',
    'não funciona',
    'bug',
    'travou',
    'cancelar conta',
    'reembolso',
    'dinheiro de volta',
    'quero falar com alguem',
    'falar com pessoa',
    'suporte humano'
];

// Opções de menu inicial
const menuOptions = [
    { id: 1, text: 'Preciso de ajuda com o uso do sistema', action: 'help_usage' },
    { id: 2, text: 'Quero contratar um serviço', action: 'hire_service' },
    { id: 3, text: 'Tenho dúvidas sobre minha assinatura', action: 'subscription' },
    { id: 4, text: 'Preciso de suporte técnico', action: 'technical_support' }
];

module.exports = {
    processMessage: async (message, ticket) => {
        const messageLower = message.toLowerCase();
        
        // Verificar se precisa transferir para humano
        const needsHuman = humanTriggers.some(trigger => 
            messageLower.includes(trigger)
        );

        if (needsHuman) {
            return {
                transferToHuman: true,
                reason: 'Cliente solicitou atendente ou possui problema complexo',
                message: null
            };
        }

        // Buscar na base de conhecimento
        const knowledge = await db.searchKnowledge(message);
        
        if (knowledge.length > 0) {
            const bestMatch = knowledge[0];
            return {
                transferToHuman: false,
                message: bestMatch.resposta || bestMatch.answer
            };
        }

        // Verificar número de mensagens sem resposta adequada
        const messages = await db.getMessagesByTicket(ticket.id);
        const clientMessages = messages.filter(m => m.sender === 'client');
        
        if (clientMessages.length >= 3) {
            return {
                transferToHuman: true,
                reason: 'IA não conseguiu resolver após múltiplas tentativas',
                message: null
            };
        }

        // Resposta genérica
        const genericResponses = [
            'Entendi sua dúvida. Pode me dar mais detalhes sobre o problema?',
            'Para ajudar melhor, preciso de mais informações. Pode explicar melhor a situação?',
            'Hmm, não encontrei uma resposta específica para isso. Deseja falar com um de nossos atendentes?'
        ];

        return {
            transferToHuman: false,
            message: genericResponses[Math.floor(Math.random() * genericResponses.length)]
        };
    },

    getWelcomeMessage: (clientName) => {
        return `Olá ${clientName}! 👋\nComo podemos ajudar?`;
    },

    getMenuOptions: () => menuOptions,

    getTransferMessage: () => {
        return 'Aguarde um momento, estou transferindo você para um de nossos atendentes.';
    }
};
