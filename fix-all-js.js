const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Diretórios para escanear
const dirs = ['api', 'src', 'routes', 'config', 'modules'];

// Padrões de correção
const patterns = [
    // Ternários sem ? antes de valor
    [/(\w+)\s{2}0\s*:/g, '$1 ? 0 :'],
    [/(\w+)\s{2}1\s*:/g, '$1 ? 1 :'],
    [/(\w+)\s{2}null\s*:/g, '$1 ? null :'],
    [/(\w+)\s{2}true\s*:/g, '$1 ? true :'],
    [/(\w+)\s{2}false\s*:/g, '$1 ? false :'],
    [/(\w+)\s{2}'':/g, "$1 ? '':"],
    [/(\w+)\s{2}"":/g, '$1 ? "":'],
    [/(\w+)\s{2}\[\]:/g, '$1 ? []:'],
    [/(\w+)\s{2}\{\}:/g, '$1 ? {}:'],
    [/(\w+)\s{2}parseFloat/g, '$1 ? parseFloat'],
    [/(\w+)\s{2}parseInt/g, '$1 ? parseInt'],
    [/(\w+)\s{2}Number\(/g, '$1 ? Number('],
    [/(\w+)\s{2}String\(/g, '$1 ? String('],
    [/(\w+)\s{2}new\s/g, '$1 ? new '],
    [/(\w+)\s{2}\(/g, '$1 ? ('],
    [/(\w+)\s{2}\[/g, '$1 ? ['],
    [/(\w+)\s{2}\{/g, '$1 ? {'],
    [/(\w+)\s{2}`/g, '$1 ? `'],
    [/(\w+)\s{2}'/g, "$1 ? '"],
    [/(\w+)\s{2}"/g, '$1 ? "'],
    [/(\w+)\s{2}([a-zA-Z_]\w*)\[/g, '$1 ? $2['],
    [/(\w+)\s{2}([a-zA-Z_]\w*)\.(\w+)/g, '$1 ? $2.$3'],
    
    // Encoding fixes
    [/estimação/g, 'estimado'],
    [/enviação/g, 'enviado'],
    [/instalação/g, 'instalado'],
    [/carregação/g, 'carregado'],
    [/selecionação/g, 'selecionado'],
    [/atualização([^a])/g, 'atualizado$1'],
    [/certificação([^o])/g, 'certificado$1'],
    [/informação([^o])/g, 'informado$1'],
    [/transportaçãora/g, 'transportadora'],
    [/Atrasação/g, 'Atrasado'],
    [/logação/g, 'logado'],
    [/registraçãos/g, 'registrados'],
    [/atestaçãos/g, 'atestados'],
    
    // SQL placeholders
    [/WHERE id = '\s*,/g, "WHERE id = ?',"],
    [/AND status = '\s*}/g, "AND status = ?'}"],
    [/SET status = '\s*,/g, "SET status = ?',"],
];

function fixFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let fixes = 0;
        
        patterns.forEach(([pattern, replacement]) => {
            const matches = content.match(pattern);
            if (matches) {
                fixes += matches.length;
                content = content.replace(pattern, replacement);
            }
        });
        
        if (fixes > 0) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ ${filePath}: ${fixes} correções`);
        }
        
        return fixes;
    } catch (e) {
        console.log(`❌ Erro lendo ${filePath}: ${e.message}`);
        return 0;
    }
}

function checkSyntax(filePath) {
    try {
        execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function scanDir(dir) {
    const baseDir = path.join(__dirname, dir);
    if (!fs.existsSync(baseDir)) return;
    
    const files = fs.readdirSync(baseDir, { withFileTypes: true, recursive: true });
    
    files.forEach(file => {
        if (file.isFile() && file.name.endsWith('.js')) {
            const fullPath = path.join(file.parentPath || file.path || baseDir, file.name);
            if (!checkSyntax(fullPath)) {
                fixFile(fullPath);
            }
        }
    });
}

console.log('=== Corrigindo arquivos com erros de sintaxe ===\n');

let totalFixes = 0;

// Primeira passada
dirs.forEach(dir => scanDir(dir));

// Segunda passada para verificar
console.log('\n=== Verificando arquivos ===');
let stillBroken = [];

dirs.forEach(dir => {
    const baseDir = path.join(__dirname, dir);
    if (!fs.existsSync(baseDir)) return;
    
    try {
        const walkDir = (currentDir) => {
            const items = fs.readdirSync(currentDir, { withFileTypes: true });
            items.forEach(item => {
                const fullPath = path.join(currentDir, item.name);
                if (item.isDirectory() && !item.name.includes('node_modules')) {
                    walkDir(fullPath);
                } else if (item.isFile() && item.name.endsWith('.js')) {
                    if (!checkSyntax(fullPath)) {
                        stillBroken.push(fullPath);
                    }
                }
            });
        };
        walkDir(baseDir);
    } catch (e) {
        console.log(`Erro escaneando ${dir}: ${e.message}`);
    }
});

if (stillBroken.length > 0) {
    console.log('\n❌ Arquivos ainda com erro:');
    stillBroken.forEach(f => console.log(`  - ${f}`));
} else {
    console.log('\n✅ Todos os arquivos estão OK!');
}
