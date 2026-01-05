# Script para corrigir os caminhos do config.js em todos os módulos
# Os caminhos foram adicionados incorretamente com muitos ../

$modulesPath = "c:\Users\egidio\Documents\Sistema - ALUFORCE - V.2\modules"

# Encontrar todos os arquivos HTML nos módulos
$htmlFiles = Get-ChildItem -Path $modulesPath -Filter "*.html" -Recurse

$count = 0

foreach ($file in $htmlFiles) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    
    # Verificar se tem o caminho incorreto
    if ($content -match '\.\.\/[\.\/]*public\/js\/config\.js') {
        # Calcular o nível de profundidade correto
        $relativePath = $file.DirectoryName.Replace($modulesPath, "").TrimStart("\")
        $parts = $relativePath -split "\\"
        $depth = $parts.Count
        
        # Construir o caminho relativo correto
        # modules/MODULO/arquivo.html = 2 níveis (../../public/js/config.js)
        # modules/MODULO/public/arquivo.html = 3 níveis (../../../public/js/config.js)
        # modules/MODULO/public/pages/arquivo.html = 4 níveis (../../../../public/js/config.js)
        
        $prefix = "../" * ($depth + 1)
        $correctPath = "${prefix}public/js/config.js"
        
        # Substituir todos os caminhos incorretos pelo correto
        $newContent = $content -replace '\.\.\/[\.\/]*public\/js\/config\.js', $correctPath
        
        # Salvar o arquivo
        Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8 -NoNewline
        
        Write-Host "✅ Corrigido: $($file.FullName) -> $correctPath" -ForegroundColor Green
        $count++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Arquivos corrigidos: $count" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
