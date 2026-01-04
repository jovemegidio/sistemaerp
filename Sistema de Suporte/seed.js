const mysql = require('mysql2/promise');

async function seed() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '@dminalu',
        database: 'aluforce_vendas'
    });

    const knowledge = [
        { 
            pergunta: 'Como faco para resetar minha senha', 
            resposta: 'Para resetar sua senha, acesse a tela de login e clique em Esqueci minha senha. Voce recebera um email com as instrucoes.', 
            palavras_chave: 'senha,reset,esqueci,login', 
            categoria: 'conta' 
        },
        { 
            pergunta: 'Qual o horario de atendimento', 
            resposta: 'Nosso atendimento funciona de segunda a sexta, das 8h as 18h. Aos sabaçãos, das 8h as 12h.', 
            palavras_chave: 'horario,atendimento,funcionamento', 
            categoria: 'geral' 
        },
        { 
            pergunta: 'Como emitir segunda via de boleto', 
            resposta: 'Para emitir a segunda via do boleto, acesse sua area do cliente, va em Financeiro > Boletos e clique em Segunda Via no boleto desejação.', 
            palavras_chave: 'boleto,segunda via,pagamento,financeiro', 
            categoria: 'financeiro' 
        },
        { 
            pergunta: 'Como cancelar meu pedido', 
            resposta: 'Para cancelar um pedido, acesse Meus Pedidos e clique em Solicitar Cancelamento. Se o pedido ja estiver em processamento, entre em contato conosco para verificar a possibilidade.', 
            palavras_chave: 'cancelar,pedido,cancelamento', 
            categoria: 'pedidos' 
        },
        { 
            pergunta: 'Quais formas de pagamento sao aceitas', 
            resposta: 'Aceitamos cartao de credito (Visa, Master, Elo), boleto bancario, PIX e transferencia bancaria.', 
            palavras_chave: 'pagamento,cartao,boleto,pix,forma', 
            categoria: 'financeiro' 
        },
        { 
            pergunta: 'Como rastrear meu pedido', 
            resposta: 'Acesse Meus Pedidos no menu principal, selecione o pedido desejação e clique em Rastrear. Voce vera o status atualização da entrega.', 
            palavras_chave: 'rastrear,pedido,entrega,rastreio', 
            categoria: 'pedidos' 
        }
    ];

    try {
        // Limpar tabela antes de inserir
        await pool.execute('DELETE FROM suporte_base_conhecimento');
        
        for (const k of knowledge) {
            await pool.execute(
                'INSERT INTO suporte_base_conhecimento (pergunta, resposta, palavras_chave, categoria) VALUES (, , , )',
                [k.pergunta, k.resposta, k.palavras_chave, k.categoria]
            );
        }

        console.log('Base de conhecimento populada com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('Erro:', error);
        process.exit(1);
    }
}

seed();
