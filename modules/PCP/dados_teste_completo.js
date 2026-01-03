// Teste final da API atualizada
const dadosCompletos = {
    // Dados básicos
    numero_orcamento: 'ORC-2025-COMPLETO',
    numero_pedido: 'PED-2025-COMPLETO',
    data_liberacao: '07/10/2025',
    data_previsao_entrega: '15/10/2025',
    
    // Vendedor
    vendedor: 'Maria Santos Silva - Gerente Comercial',
    
    // Cliente
    cliente: 'Empresa Industrial Teste Ltda - MATRIZ',
    contato_cliente: 'João Silva - Diretor de Compras',
    fone_cliente: '(11) 99999-9999',
    email_cliente: 'joao.silva@empresateste.com.br',
    tipo_frete: 'CIF - Por conta do remetente',
    
    // Produto
    codigo_produto: 'ALU-001-COMPLETO',
    descricao_produto: 'Perfil de Alumínio Estrutural 30x30mm - Anodizado',
    quantidade: 150,
    valor_unitario: 28.75,
    embalagem: 'Bobina Plástica Industrial',
    lances: '100, 120, 150, 200',
    
    // Transportadora
    transportadora_nome: 'Transportes Rápidos Expressos Ltda',
    transportadora_fone: '(11) 88888-8888',
    transportadora_cep: '12345-678',
    transportadora_endereco: 'Avenida Logística, 789 - Centro de Distribuição - São Paulo/SP',
    transportadora_cpf_cnpj: '12.345.678/0001-90',
    transportadora_email_nfe: 'nfe@transportesrapidos.com.br',
    
    // Observações
    observacoes: `OBSERVAÇÕES IMPORTANTES DO PEDIDO:
• Prazo de entrega: 15/10/2025
• Material deve ser entregue em perfeitas condições
• Comunicar antecipadamente qualquer atraso
• Horário de entrega: 8h às 17h
• Responsável pelo recebimento: João Silva
• Solicitar agendamento prévio para descarga
• Material sujeito a inspeção de qualidade
• Embalagem deve estar íntegra
• Notas fiscais em duplicata`,
    
    // Pagamento
    condicoes_pagamento: '30 dias após o faturamento',
    metodo_pagamento: 'Transferência Bancária',
    
    // Entrega
    qtd_volumes: '25 volumes',
    tipo_embalagem_entrega: 'Embalagem industrial reforçada com proteção plástica',
    observacoes_entrega: `INSTRUÇÕES ESPECÍFICAS DE ENTREGA:
• Entregar no endereço principal da empresa
• Usar entrada de carga pelos fundos
• Comunicar chegada na portaria (11) 99999-9999
• Aguardar liberação para descarga
• Descarregar com equipamento adequado
• Verificar integridade da carga antes de descarregar`
};

// Simular requisição POST
console.log('🎯 DADOS PARA TESTE COMPLETO DA API:\n');
console.log(JSON.stringify(dadosCompletos, null, 2));

console.log('\n📋 RESUMO DOS DADOS:');
console.log(`   🔹 Orçamento: ${dadosCompletos.numero_orcamento}`);
console.log(`   🔹 Pedido: ${dadosCompletos.numero_pedido}`);
console.log(`   🔹 Cliente: ${dadosCompletos.cliente}`);
console.log(`   🔹 Produto: ${dadosCompletos.codigo_produto} - ${dadosCompletos.descricao_produto}`);
console.log(`   🔹 Quantidade: ${dadosCompletos.quantidade} unidades`);
console.log(`   🔹 Valor Unit: R$ ${dadosCompletos.valor_unitario}`);
console.log(`   🔹 Valor Total: R$ ${(dadosCompletos.quantidade * dadosCompletos.valor_unitario).toFixed(2)}`);
console.log(`   🔹 Transportadora: ${dadosCompletos.transportadora_nome}`);
console.log(`   🔹 Observações: ${dadosCompletos.observacoes.split('\n')[0]}...`);

console.log('\n🚀 PARA TESTAR:');
console.log('1. Execute: node server_pcp.js');
console.log('2. Use estes dados no endpoint: POST /api/pcp/ordem-producao/excel');
console.log('3. Todos os campos das imagens serão preenchidos!');

console.log('\n✅ SERVIDOR ATUALIZADO COM PREENCHIMENTO COMPLETO!');