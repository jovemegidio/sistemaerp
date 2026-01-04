const fs = require('fs');
const path = require('path');

// Mapeamento de caracteres corrompidos para corretos
const replacements = {
    // Vogais acentuadas
    'ã': 'ã', 'á': 'á', 'à': 'à', 'â': 'â',
    'Ã': 'Ã', 'Á': 'Á', 'À': 'À', 'Â': 'Â',
    'é': 'é', 'è': 'è', 'ê': 'ê', 'ë': 'ë',
    'É': 'É', 'È': 'È', 'Ê': 'Ê',
    'í': 'í', 'ì': 'ì', 'î': 'î',
    'Í': 'Í', 'Ì': 'Ì', 'Î': 'Î',
    'ó': 'ó', 'ò': 'ò', 'ô': 'ô', 'õ': 'õ',
    'Ó': 'Ó', 'Ò': 'Ò', 'Ô': 'Ô', 'Õ': 'Õ',
    'ú': 'ú', 'ù': 'ù', 'û': 'û', 'ü': 'ü',
    'Ú': 'Ú', 'Ù': 'Ù', 'Û': 'Û', 'Ü': 'Ü',
    'ç': 'ç', 'Ç': 'Ç',
    
    // Padrões específicos encontrados
    '': '', // Remove caractere de substituição
    'configurao': 'configuração',
    'Configurao': 'Configuração',
    'Configuraes': 'Configurações',
    'configuraes': 'configurações',
    'funo': 'função',
    'Funo': 'Função',
    'funes': 'funções',
    'Funes': 'Funções',
    'animao': 'animação',
    'ao': 'ação',
    'Ao': 'Ação',
    'aes': 'ações',
    'Aes': 'Ações',
    'produo': 'produção',
    'Produo': 'Produção',
    'posio': 'posição',
    'Posio': 'Posição',
    'opo': 'opção',
    'Opo': 'Opção',
    'opes': 'opções',
    'Opes': 'Opções',
    'informao': 'informação',
    'Informao': 'Informação',
    'informaes': 'informações',
    'Informaes': 'Informações',
    'navegao': 'navegação',
    'Navegao': 'Navegação',
    'permisso': 'permissão',
    'Permisso': 'Permissão',
    'permisses': 'permissões',
    'Permisses': 'Permissões',
    'expedio': 'expedição',
    'atualizao': 'atualização',
    'Atualizao': 'Atualização',
    'atualizaes': 'atualizações',
    'alterao': 'alteração',
    'alteraes': 'alterações',
    'verso': 'versão',
    'Verso': 'Versão',
    'gesto': 'gestão',
    'Gesto': 'Gestão',
    'sada': 'saída',
    'Sada': 'Saída',
    'histrico': 'histórico',
    'Histrico': 'Histórico',
    'usurio': 'usuário',
    'Usurio': 'Usuário',
    'usurios': 'usuários',
    'Usurios': 'Usuários',
    'no': 'não',
    'No': 'Não',
    'disponvel': 'disponível',
    'Disponvel': 'Disponível',
    'possvel': 'possível',
    'Possvel': 'Possível',
    'visvel': 'visível',
    'Visvel': 'Visível',
    'vlido': 'válido',
    'Vlido': 'Válido',
    'invlido': 'inválido',
    'Invlido': 'Inválido',
    'cdigo': 'código',
    'Cdigo': 'Código',
    'nmero': 'número',
    'Nmero': 'Número',
    'nmeros': 'números',
    'mdulo': 'módulo',
    'Mdulo': 'Módulo',
    'mdulos': 'módulos',
    'Mdulos': 'Módulos',
    'logstica': 'logística',
    'Logstica': 'Logística',
    'oramento': 'orçamento',
    'Oramento': 'Orçamento',
    'oramentos': 'orçamentos',
    'Oramentos': 'Orçamentos',
    'prximo': 'próximo',
    'Prximo': 'Próximo',
    'prxima': 'próxima',
    'Prxima': 'Próxima',
    'ltimo': 'último',
    'ltima': 'última',
    'ltimos': 'últimos',
    'assncrona': 'assíncrona',
    'assncrono': 'assíncrono',
    'padro': 'padrão',
    'Padro': 'Padrão',
    'necessrio': 'necessário',
    'Necessrio': 'Necessário',
    'necessrios': 'necessários',
    'necessria': 'necessária',
    'necessrias': 'necessárias',
    'obrigatrio': 'obrigatório',
    'Obrigatrio': 'Obrigatório',
    'rea': 'área',
    'reas': 'áreas',
    'referncia': 'referência',
    'Referncia': 'Referência',
    'referncias': 'referências',
    'presena': 'presença',
    'Presena': 'Presença',
    'licena': 'licença',
    'Licena': 'Licença',
    'segurana': 'segurança',
    'Segurana': 'Segurança',
    'alm': 'além',
    'tambm': 'também',
    'j': 'já',
    's': 'só',
    'a': 'aí',
    'est': 'está',
    'Est': 'Está',
    'so': 'são',
    'So': 'São',
    'Ol': 'Olá',
    's': 'às',
    '': '', // Remove emoji quebração
    
    // Mais substituições
    'boto': 'botão',
    'Boto': 'Botão',
    'saudao': 'saudação',
    'exceo': 'exceção',
    'ação': 'ação',
    'sesso': 'sessão',
    'Sesso': 'Sessão',
};

// Padrões regex para substituições mais complexas
const regexReplacements = [
    { pattern: /\+\s*/g, replacement: '' }, // Remove emojis quebraçãos
    { pattern: /\/g, replacement: '' }, // Remove caracteres de substituição unicode
];

function fixFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;
        let changes = 0;

        // Aplicar substituições de string
        for (const [search, replace] of Object.entries(replacements)) {
            if (content.includes(search)) {
                content = content.split(search).join(replace);
                changes++;
            }
        }

        // Aplicar substituições regex
        for (const { pattern, replacement } of regexReplacements) {
            if (pattern.test(content)) {
                content = content.replace(pattern, replacement);
                changes++;
            }
        }

        // Se houve mudanças, salvar o arquivo
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Corrigido: ${path.basename(filePath)} (${changes} tipos de correções)`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`❌ Erro em ${filePath}: ${error.message}`);
        return false;
    }
}

function walkDirectory(dir, extensions = ['.html', '.js']) {
    const files = [];
    
    function walk(currentDir) {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // Ignorar pastas específicas
                if (['node_modules', '.git', 'dist', 'build'].includes(item)) {
                    continue;
                }
                walk(fullPath);
            } else if (stat.isFile()) {
                const ext = path.extname(item).toLowerCase();
                if (extensions.includes(ext)) {
                    files.push(fullPath);
                }
            }
        }
    }
    
    walk(dir);
    return files;
}

// Executar
const basePath = __dirname;
console.log('🔧 Iniciando correção de encoding...\n');

const files = walkDirectory(basePath);
console.log(`📁 Encontraçãos ${files.length} arquivos para verificar\n`);

let fixedCount = 0;
for (const file of files) {
    if (fixFile(file)) {
        fixedCount++;
    }
}

console.log('\n========================================');
console.log(`✅ Correção concluída!`);
console.log(`📊 ${fixedCount} arquivos corrigidos de ${files.length} verificaçãos`);
console.log('========================================');
