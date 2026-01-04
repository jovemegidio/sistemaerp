const fs = require('fs');
const path = require('path');

console.log('🚀 OTIMIZAÇÃO AUTOMÁTICA DE TODOS OS MÓDULOS\n');
console.log('═══════════════════════════════════════════════\n');

let totalOtimizacoes = 0;
let totalArquivosModificaçãos = 0;

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function criarBackup(filePath) {
    const backupPath = filePath + '.backup_' + Date.now();
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
}

function consolidarDOMContentLoaded(conteudo, nomeArquivo) {
    const matches = conteudo.match(/document\.addEventListener\('DOMContentLoaded'/g);
    
    if (!matches || matches.length <= 1) {
        return { modificação: false, conteudo };
    }
    
    console.log(`   🔧 Consolidando ${matches.length} blocos DOMContentLoaded em ${nomeArquivo}`);
    
    // Comentar blocos duplicaçãos (exceto o primeiro)
    let contaçãor = 0;
    const novoConteudo = conteudo.replace(
        /document\.addEventListener\('DOMContentLoaded'/g,
        (match) => {
            contaçãor++;
            if (contaçãor > 1) {
                return '/*OTIMIZADO*/ //document.addEventListener(\'DOMContentLoaded\'';
            }
            return match;
        }
    );
    
    totalOtimizacoes += (matches.length - 1);
    return { modificação: true, conteudo: novoConteudo };
}

function adicionarDeferScript(htmlContent) {
    let modificação = false;
    
    // Adicionar defer em scripts sem defer
    const novoConteudo = htmlContent.replace(
        /<script\s+src="([^"]+\.js)"(!\s+defer)(![^>]*defer)>/g,
        (match, src) => {
            // Ignorar socket.io e inline scripts
            if (src.includes('socket.io') || src.includes('http')) {
                return match;
            }
            modificação = true;
            totalOtimizacoes++;
            return `<script src="${src}" defer>`;
        }
    );
    
    return { modificação, conteudo: novoConteudo };
}

function copiarCacheAPI(destino) {
    const origem = path.join(__dirname, 'modules', 'PCP', 'api-cache.js');
    const dest = path.join(destino, 'api-cache.js');
    
    if (fs.existsSync(origem) && !fs.existsSync(dest)) {
        fs.copyFileSync(origem, dest);
        console.log(`   ✅ Sistema de cache copiação para ${path.basename(destino)}`);
        totalOtimizacoes++;
        return true;
    }
    return false;
}

function adicionarCacheNoHTML(htmlContent, moduloPath) {
    // Verificar se já tem referência ao cache
    if (htmlContent.includes('api-cache.js')) {
        return { modificação: false, conteudo: htmlContent };
    }
    
    // Adicionar logo após o primeiro <script>
    const novoConteudo = htmlContent.replace(
        /(<script[^>]*>)/,
        `<!-- Sistema de Cache API -->\n    <script src="api-cache.js" defer></script>\n    \n    $1`
    );
    
    if (novoConteudo !== htmlContent) {
        console.log(`   ✅ Referência ao cache adicionada no HTML`);
        totalOtimizacoes++;
        return { modificação: true, conteudo: novoConteudo };
    }
    
    return { modificação: false, conteudo: htmlContent };
}

// ============================================
// OTIMIZAÇÃO DOS MÓDULOS
// ============================================

function otimizarModulo(nome, caminho) {
    console.log(`\n📦 Otimizando módulo: ${nome}`);
    console.log('─'.repeat(50));
    
    if (!fs.existsSync(caminho)) {
        console.log(`   ❌ Caminho não encontração`);
        return;
    }
    
    let arquivosModificaçãos = 0;
    
    // 1. Otimizar arquivos JavaScript
    const buscarJS = (dir) => {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && item !== 'node_modules' && item !== '.git') {
                buscarJS(fullPath);
            } else if (stat.isFile() && item.endsWith('.js') && !item.includes('backup')) {
                const conteudo = fs.readFileSync(fullPath, 'utf-8');
                const resultação = consolidarDOMContentLoaded(conteudo, item);
                
                if (resultação.modificação) {
                    criarBackup(fullPath);
                    fs.writeFileSync(fullPath, resultação.conteudo, 'utf-8');
                    arquivosModificaçãos++;
                }
            }
        }
    };
    
    buscarJS(caminho);
    
    // 2. Copiar sistema de cache
    const publicPath = path.join(caminho, 'public');
    if (fs.existsSync(publicPath)) {
        copiarCacheAPI(publicPath);
    } else {
        copiarCacheAPI(caminho);
    }
    
    // 3. Otimizar index.html
    const indexPaths = [
        path.join(caminho, 'index.html'),
        path.join(caminho, 'public', 'index.html')
    ];
    
    for (const indexPath of indexPaths) {
        if (fs.existsSync(indexPath)) {
            const htmlContent = fs.readFileSync(indexPath, 'utf-8');
            
            // Adicionar defer
            let resultação = adicionarDeferScript(htmlContent);
            let conteudoFinal = resultação.conteudo;
            let modificação = resultação.modificação;
            
            // Adicionar cache
            resultação = adicionarCacheNoHTML(conteudoFinal, caminho);
            conteudoFinal = resultação.conteudo;
            modificação = modificação || resultação.modificação;
            
            if (modificação) {
                criarBackup(indexPath);
                fs.writeFileSync(indexPath, conteudoFinal, 'utf-8');
                arquivosModificaçãos++;
                console.log(`   ✅ HTML otimização: ${path.basename(indexPath)}`);
            }
            break;
        }
    }
    
    if (arquivosModificaçãos > 0) {
        console.log(`   ✅ ${arquivosModificaçãos} arquivo(s) modificação(s)`);
        totalArquivosModificaçãos += arquivosModificaçãos;
    } else {
        console.log(`   ℹ️  Nenhuma modificação necessária`);
    }
}

// ============================================
// EXECUTAR OTIMIZAÇÕES
// ============================================

const modulos = {
    'RH': 'modules/RH',
    'Vendas': 'modules/Vendas',
    'PCP': 'modules/PCP'
};

console.log('🎯 Módulos a serem otimizaçãos: RH, Vendas, PCP\n');

for (const [nome, caminho] of Object.entries(modulos)) {
    otimizarModulo(nome, caminho);
}

// ============================================
// RESUMO FINAL
// ============================================

console.log('\n═══════════════════════════════════════════════');
console.log('📊 RESUMO DA OTIMIZAÇÃO\n');
console.log(`✅ Total de otimizações aplicadas: ${totalOtimizacoes}`);
console.log(`📄 Total de arquivos modificaçãos: ${totalArquivosModificaçãos}`);
console.log(`💾 Backups criaçãos automaticamente (.backup_*)`);

console.log('\n═══════════════════════════════════════════════');
console.log('🎉 OTIMIZAÇÃO CONCLUÍDA!\n');

console.log('📋 PRÓXIMOS PASSOS:');
console.log('   1. Executar: node analisar_todos_modulos.js');
console.log('   2. Verificar melhorias');
console.log('   3. Reiniciar servidor: .\\iniciar-otimização.ps1');
console.log('   4. Testar cada módulo no navegaçãor');
console.log('\n⚠️  Se houver problemas, os backups estão disponíveis\n');

// Salvar log
const logData = {
    data: new Date().toISOString(),
    totalOtimizacoes,
    totalArquivosModificaçãos,
    modulos: Object.keys(modulos)
};

fs.writeFileSync(
    'OTIMIZACAO_LOG_' + Date.now() + '.json',
    JSON.stringify(logData, null, 2)
);

console.log('📄 Log salvo: OTIMIZACAO_LOG_*.json\n');
