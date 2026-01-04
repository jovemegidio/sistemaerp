const fs = require('fs');
const path = require('path');

console.log('🔄 Integrando novo modal no index.html...\n');

// Ler arquivos
const indexPath = path.join(__dirname, 'index.html');
const modalPath = path.join(__dirname, 'modal_nova_ordem_saas.html');

let indexContent = fs.readFileSync(indexPath, 'utf8');
const modalContent = fs.readFileSync(modalPath, 'utf8');

// Encontrar início e fim do modal antigo
const inicioModal = indexContent.indexOf('<!-- MODAL: NOVA ORDEM DE PRODUÇÃO (REDESENHADO) -->');
const fimModal = indexContent.indexOf('<!-- MODAL: VISUALIZAR ORDEM');

if (inicioModal === -1 || fimModal === -1) {
    console.error('❌ Não foi possível localizar o modal antigo!');
    process.exit(1);
}

// Substituir
const antes = indexContent.substring(0, inicioModal);
const depois = indexContent.substring(fimModal);

const novoConteudo = antes + modalContent + '\n\n            ' + depois;

// Salvar
fs.writeFileSync(indexPath, novoConteudo, 'utf8');

console.log('✅ Modal integração com sucesso!');
console.log(`   Linha inicial: ${inicioModal}`);
console.log(`   Tamanho do novo modal: ${modalContent.length} caracteres`);
console.log('   Arquivo: index.html\n');
