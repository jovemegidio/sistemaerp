/**
 * Script para corrigir caminhos do config.js em todos os módulos
 * Os caminhos corretos são:
 * - modules/MODULO/*.html → ../../public/js/config.js
 * - modules/MODULO/public/*.html → ../../../public/js/config.js
 * - modules/MODULO/public/pages/*.html → ../../../../public/js/config.js
 * - modules/MODULO/mobile/*.html → ../../../public/js/config.js
 */

const fs = require('fs');
const path = require('path');

const modulesPath = path.join(__dirname, 'modules');

function getCorrectConfigPath(filePath) {
    const relativePath = path.relative(modulesPath, filePath);
    const parts = relativePath.split(path.sep);
    
    // Conta quantos níveis de profundidade (excluindo o nome do arquivo)
    const depth = parts.length - 1;
    
    // +1 para sair de modules
    const prefix = '../'.repeat(depth + 1);
    return `${prefix}public/js/config.js`;
}

function walkDir(dir, callback) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            // Ignorar node_modules
            if (file !== 'node_modules') {
                walkDir(filePath, callback);
            }
        } else if (file.endsWith('.html')) {
            callback(filePath);
        }
    });
}

let count = 0;

walkDir(modulesPath, (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('config.js')) {
        const correctPath = getCorrectConfigPath(filePath);
        
        // Substituir qualquer caminho incorreto para config.js
        const regex = /src="[\.\/]*public\/js\/config\.js"/g;
        const newContent = content.replace(regex, `src="${correctPath}"`);
        
        if (newContent !== content) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`✅ ${path.basename(filePath)} → ${correctPath}`);
            count++;
        }
    }
});

console.log(`\n========================================`);
console.log(`Arquivos corrigidos: ${count}`);
console.log(`========================================`);
