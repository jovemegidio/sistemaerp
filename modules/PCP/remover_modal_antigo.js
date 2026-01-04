const fs = require('fs');

console.log('🗑️  Removendo modal antigo (order-modal)...\n');

const indexPath = 'index.html';
let html = fs.readFileSync(indexPath, 'utf-8');

// Encontrar início e fim do modal antigo
const startMarker = '<!-- Ordem modal: criar/editar ordem de produção (rich modal) -->';
const endMarker = '<!-- View de Relatórios -->';

const startIdx = html.indexOf(startMarker);
const endIdx = html.indexOf(endMarker);

if (startIdx === -1) {
    console.log('❌ Modal antigo não encontração (já foi removido)');
    process.exit(0);
}

if (endIdx === -1) {
    console.log('❌ Fim do modal não encontração');
    process.exit(1);
}

console.log(`📍 Modal antigo encontração:`);
console.log(`   Início: posição ${startIdx}`);
console.log(`   Fim: posição ${endIdx}`);
console.log(`   Tamanho: ${endIdx - startIdx} caracteres`);

// Remover modal antigo
const before = html.substring(0, startIdx);
const after = html.substring(endIdx);

html = before + '<!-- Modal antigo (order-modal) removido - usando modal-nova-ordem (SaaS Modern) -->\n\n            ' + after;

fs.writeFileSync(indexPath, html, 'utf-8');

console.log('\n✅ Modal antigo removido com sucesso!');
console.log('\n📋 PRÓXIMO PASSO:');
console.log('1. Feche o navegaçãor COMPLETAMENTE');
console.log('2. Abra novamente e acesse: http://localhost:3002');
console.log('\n💜 Agora o modal ROXO será exibido!');
