const fs = require('fs');
const path = require('path');

const targetDir = __dirname;
let fixedFiles = 0;
let totalFixes = 0;

function fixTernaryOperators(content) {
    let fixes = 0;
    let result = content;
    
    // Padrão: valor ? 'string' : (ternário sem ?)
    // Inclui comparações como ===, !==, >, <, >=, <=
    const patterns = [
        // word ? 'word' : (ternário com string)
        [/(\w+)  '([^']+)'/g, "$1 ? '$2'"],
        // word ? "word" : (ternário com string aspas duplas)
        [/(\w+)  "([^"]+)"/g, '$1 ? "$2"'],
        // === número ? 'word (comparação)
        [/(===\s*\d+)  '/g, "$1 ? '"],
        // !== número ? 'word
        [/(!==\s*\d+)  '/g, "$1 ? '"],
        // > número ? 'word
        [/(>\s*\d+)  '/g, "$1 ? '"],
        // < número ? 'word
        [/(<\s*\d+)  '/g, "$1 ? '"],
        // >= número ? 'word
        [/(>=\s*\d+)  '/g, "$1 ? '"],
        // <= número ? 'word
        [/(<=\s*\d+)  '/g, "$1 ? '"],
    ];
    
    for (const [regex, replace] of patterns) {
        const matches = result.match(regex);
        if (matches) {
            fixes += matches.length;
            result = result.replace(regex, replace);
        }
    }
    
    // Typos de encoding
    const typoFixes = [
        ['detectado', 'detectado'],
        ['marcado', 'marcado'],
        ['digitado', 'digitado'],
        ['criado', 'criado'],
        ['baseado', 'baseado'],
        ['valorFormatado', 'valorFormatado'],
        ['faturado', 'faturado'],
        ['transmissao', 'transmissao'],
        ['exibirCancelados', 'exibirCancelados'],
        ['exibirDenegados', 'exibirDenegados'],
        ['Cancelados', 'Cancelados'],
        ['Denegados', 'Denegados'],
    ];
    
    for (const [wrong, correct] of typoFixes) {
        if (result.includes(wrong)) {
            result = result.split(wrong).join(correct);
            fixes++;
        }
    }
    
    return { result, fixes };
}

function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const { result, fixes } = fixTernaryOperators(content);
        
        if (fixes > 0) {
            fs.writeFileSync(filePath, result, 'utf8');
            console.log(`Fixed: ${path.relative(targetDir, filePath)}: ${fixes}`);
            fixedFiles++;
            totalFixes += fixes;
        }
    } catch (err) {
        console.error(`Error ${filePath}:`, err.message);
    }
}

function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
                walkDir(fullPath);
            }
            continue;
        }
        
        if (entry.name.endsWith('.js') || entry.name.endsWith('.html')) {
            processFile(fullPath);
        }
    }
}

console.log('Fixing ternary operators in JS and HTML...');
walkDir(targetDir);
console.log(`Done: ${fixedFiles} files, ${totalFixes} fixes`);
