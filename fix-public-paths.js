/**
 * Script para corrigir TODOS os caminhos absolutos na pasta public
 */

const fs = require('fs');
const path = require('path');

const publicPath = path.join(__dirname, 'public');

function walkDir(dir, callback) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules') {
                walkDir(filePath, callback);
            }
        } else if (file.endsWith('.html')) {
            callback(filePath);
        }
    });
}

let count = 0;

walkDir(publicPath, (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Calcular prefixo baseado na profundidade
    const relativePath = path.relative(publicPath, filePath);
    const parts = relativePath.split(path.sep);
    const depth = parts.length - 1;
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    
    // Corrigir caminhos absolutos
    content = content
        // Favicon
        .replace(/href="\/favicon-aluforce\.webp"/g, `href="${prefix}favicon-aluforce.webp"`)
        .replace(/href="\/favicon-aluforce\.png"/g, `href="${prefix}favicon-aluforce.png"`)
        // Images
        .replace(/src="\/images\//g, `src="${prefix}images/`)
        .replace(/href="\/images\//g, `href="${prefix}images/`)
        // CSS
        .replace(/href="\/css\//g, `href="${prefix}css/`)
        // JS
        .replace(/src="\/js\//g, `src="${prefix}js/`)
        // Avatars
        .replace(/src="\/avatars\//g, `src="${prefix}avatars/`);
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${path.basename(filePath)}`);
        count++;
    }
});

console.log(`\n========================================`);
console.log(`Arquivos corrigidos: ${count}`);
console.log(`========================================`);
