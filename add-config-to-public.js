/**
 * Script para adicionar config.js aos arquivos da pasta public que não tem
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
    
    // Se não tem config.js, adicionar
    if (!content.includes('config.js')) {
        const relativePath = path.relative(publicPath, filePath);
        const parts = relativePath.split(path.sep);
        const depth = parts.length - 1;
        const prefix = depth > 0 ? '../'.repeat(depth) : '';
        const configPath = `${prefix}js/config.js`;
        
        // Adicionar após <head>
        if (content.includes('<head>')) {
            const newContent = content.replace(
                '<head>',
                `<head>\n    <!-- Configuração Global -->\n    <script src="${configPath}"></script>`
            );
            
            if (newContent !== content) {
                fs.writeFileSync(filePath, newContent, 'utf8');
                console.log(`✅ ${path.basename(filePath)} → ${configPath}`);
                count++;
            }
        }
    }
});

console.log(`\n========================================`);
console.log(`Arquivos atualizados: ${count}`);
console.log(`========================================`);
