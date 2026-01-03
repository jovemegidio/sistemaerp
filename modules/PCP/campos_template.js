// Baseado no template "Ordem de Produção.xlsx" já analisado

const CAMPOS_TEMPLATE = {
    // CABEÇALHO
    ORCAMENTO: 'C4',
    PEDIDO: 'G4', 
    DATA_LIBERACAO: 'J4',
    
    // VENDEDOR
    VENDEDOR: 'C6:E6', // Células mescladas
    
    // CLIENTE
    CLIENTE: 'C7:J7', // Células mescladas
    CONTATO_CLIENTE: 'C8:E8',
    EMAIL_CLIENTE: 'G8:J8',
    FONE_CLIENTE: 'C9:E9',
    CPF_CNPJ: 'G9:J9',
    
    // ENDEREÇO
    ENDERECO: 'C10:J10',
    CEP: 'C11:E11',
    EMAIL_NFE: 'G11:J11',
    
    // TRANSPORTADORA  
    NOME_TRANSPORTADORA: 'C12:J12',
    CNPJ_TRANSPORTADORA: 'C13:E13',
    EMAIL_TRANSPORTADORA: 'G13:J13',
    FONE_TRANSPORTADORA: 'C14:E14',
    ENDERECO_TRANSPORTADORA: 'G14:J14',
    CEP_TRANSPORTADORA: 'C15:E15',
    TIPO_FRETE: 'G15',
    
    // PRODUTOS (linhas 18-32)
    PRODUTOS_INICIO: 18,
    PRODUTOS_FIM: 32,
    COLUNAS_PRODUTOS: {
        CODIGO: 'B',
        PRODUTO: 'C',
        EMBALAGEM: 'D', 
        LANCES: 'E',
        QTDE: 'F',
        VALOR_UNIT: 'H',
        TOTAL: 'J'
    },
    
    // TOTAIS
    TOTAL_ITENS: 'I35',
    TOTAL_GERAL: 'J35',
    
    // CONDIÇÕES DE PAGAMENTO
    PRAZO_ENTREGA: 'D44',
    CONDICOES_PAGAMENTO: 'D45',
    OBSERVACOES: 'D46'
};

// VENDEDORES DO TEMPLATE
const VENDEDORES = [
    'Renata Alves',
    'Augusto Ladeira',
    'Paulo Silva',
    'Maria Santos',
    'Carlos Mendes'
];

console.log('📋 CAMPOS DO TEMPLATE:');
console.log(JSON.stringify(CAMPOS_TEMPLATE, null, 2));

console.log('\n👥 VENDEDORES:');
VENDEDORES.forEach((v, i) => console.log(`${i + 1}. ${v}`));

console.log('\n✅ TRANSPORTADORA - CAMPOS NECESSÁRIOS:');
console.log('1. Nome da Transportadora');
console.log('2. CNPJ');
console.log('3. Email');
console.log('4. Telefone');
console.log('5. Endereço Completo');
console.log('6. CEP');
console.log('7. Tipo de Frete (CIF/FOB)');
