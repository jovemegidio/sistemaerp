/**
 * Script para corrigir caminhos absolutos do favicon em todos os módulos
 */

const fs = require('fs');
const path = require('path');

const modulesPath = path.join(__dirname, 'modules');

function getCorrectFaviconPath(filePath) {
    const relativePath = path.relative(modulesPath, filePath);
    const parts = relativePath.split(path.sep);
    const depth = parts.length - 1;
    const prefix = '../'.repeat(depth + 1);
    return `${prefix}public/favicon-aluforce.webp`;
}

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

walkDir(modulesPath, (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Corrigir favicon absoluto
    if (content.includes('href="/favicon-aluforce') || content.includes('href="/images/')) {
        const correctFaviconPath = getCorrectFaviconPath(filePath);
        const depth = path.relative(modulesPath, filePath).split(path.sep).length - 1;
        const prefix = '../'.repeat(depth + 1);
        
        let newContent = content
            // Corrigir favicon
            .replace(/href="\/favicon-aluforce\.webp"/g, `href="${correctFaviconPath}"`)
            .replace(/href="\/favicon-aluforce\.png"/g, `href="${correctFaviconPath.replace('.webp', '.png')}"`)
            // Corrigir imagens
            .replace(/src="\/images\//g, `src="${prefix}public/images/`)
            .replace(/href="\/images\//g, `href="${prefix}public/images/`);
        
        if (newContent !== content) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`✅ ${path.basename(filePath)}`);
            count++;
        }
    }
});

console.log(`\n========================================`);
console.log(`Arquivos corrigidos: ${count}`);
console.log(`========================================`);
