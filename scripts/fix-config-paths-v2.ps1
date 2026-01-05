# Script para corrigir os caminhos do config.js em todos os módulos
# Corrige baseado no caminho correto para cada estrutura

$modulesPath = "c:\Users\egidio\Documents\Sistema - ALUFORCE - V.2\modules"

# Encontrar todos os arquivos HTML nos módulos (excluindo node_modules)
$htmlFiles = Get-ChildItem -Path $modulesPath -Filter "*.html" -Recurse | Where-Object { 
    $_.FullName -notmatch "node_modules"
}

$count = 0

foreach ($file in $htmlFiles) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    
    # Verificar se tem qualquer caminho para config.js
    if ($content -match 'config\.js') {
        # Calcular o caminho relativo baseado na localização do arquivo
        $relativePath = $file.DirectoryName.Replace($modulesPath, "").TrimStart("\")
        $parts = ($relativePath -split "\\") | Where-Object { $_ -ne "" }
        
        # modules/MODULO/arquivo.html = ../../public/js/config.js
        # modules/MODULO/public/arquivo.html = ../../../public/js/config.js
        # modules/MODULO/public/pages/arquivo.html = ../../../../public/js/config.js
        
        $depth = $parts.Count + 1  # +1 para sair de modules
        $prefix = ("../" * $depth)
        $correctPath = "${prefix}public/js/config.js"
        
        # Substituir qualquer caminho config.js pelo correto
        $newContent = $content -replace '<script src="[^"]*config\.js[^"]*"></script>', "<script src=`"$correctPath`"></script>"
        
        if ($newContent -ne $content) {
            # Salvar o arquivo
            Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8 -NoNewline
            Write-Host "✅ $($file.Name) -> $correctPath" -ForegroundColor Green
            $count++
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Arquivos corrigidos: $count" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
