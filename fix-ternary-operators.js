/**
 * Script para corrigir operadores ternários com ? faltando
 * Padrão incorreto: valor ? algo.algo : fallback
 * Padrão correto: valor ? algo.algo : fallback
 */

const fs = require('fs');
const path = require('path');

const targetDir = __dirname;
let fixedFiles = 0;
let totalFixes = 0;

function fixTernaryOperators(content) {
    let fixes = 0;
    
    // Padrão: palavra espaço-duplo palavra.palavra (ternário sem ?)
    // Exemplo: valor ? algo.propriedade : fallback -> valor ? algo.propriedade : fallback
    const patterns = [
        // word ? word.word (ternário sem ?)
        { regex: /(\w+)  (\w+\.\w+)/g, replace: '$1 ? $2' },
        // word > número  word (comparação seguida de ternário)
        { regex: /(\w+\s*>\s*\d+)  (\w+)/g, replace: '$1 ? $2' },
        // === número  word (comparação seguida de ternário)
        { regex: /(\w+\s*===\s*\d+)  (\w+)/g, replace: '$1 ? $2' },
        // !== undefined ? word (comparação seguida de ternário)
        { regex: /(!==\s*undefined)  (\w+)/g, replace: '$1 ? $2' },
        // === null ? word (comparação seguida de ternário)
        { regex: /(===\s*null)  (\w+)/g, replace: '$1 ? $2' },
    ];
    
    let result = content;
    for (const p of patterns) {
        const matches = result.match(p.regex);
        if (matches) {
            fixes += matches.length;
            result = result.replace(p.regex, p.replace);
        }
    }
    
    // Corrigir typos comuns de encoding
    const typoFixes = [
        ['dados_anteriores', 'dados_anteriores'],
        ['dados_novos', 'dados_novos'],
        ['dados.dados', 'dados.dados'],
        ['descricao', 'descricao'],
        ['inssAcumulado', 'inssAcumulado'],
        ['valor_estimado', 'valor_estimado'],
        ['banco de dados', 'banco de dados'],
        ['Acesso Negado', 'Acesso Negado'],
        ['administradores', 'administradores'],
        ['encontrado', 'encontrado'],
        ['Resultado', 'Resultado'],
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
            console.log(`✅ ${path.relative(targetDir, filePath)}: ${fixes} correções`);
            fixedFiles++;
            totalFixes += fixes;
        }
    } catch (err) {
        console.error(`❌ Erro em ${filePath}:`, err.message);
    }
}

function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Ignorar pastas
        if (entry.isDirectory()) {
            if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
                walkDir(fullPath);
            }
            continue;
        }
        
        // Processar apenas arquivos JS
        if (entry.name.endsWith('.js')) {
            processFile(fullPath);
        }
    }
}

console.log('🔧 Corrigindo operadores ternários faltando ?...\n');
walkDir(targetDir);
console.log(`\n✅ Concluído: ${fixedFiles} arquivos corrigidos, ${totalFixes} correções no total`);
