# Script para adicionar config.js a todos os módulos
# Isso é necessário para que o GitHub Pages funcione corretamente

$modulesPath = "c:\Users\egidio\Documents\Sistema - ALUFORCE - V.2\modules"

# Encontrar todos os arquivos HTML nos módulos
$htmlFiles = Get-ChildItem -Path $modulesPath -Filter "*.html" -Recurse

$configScript = '    <!-- Configuração Global - DEVE ser carregado PRIMEIRO -->
    <script src="../../public/js/config.js"></script>
    '

$count = 0
$skipped = 0

foreach ($file in $htmlFiles) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    
    # Verificar se já tem config.js
    if ($content -match "config\.js") {
        Write-Host "⏭️  Já tem config.js: $($file.Name)" -ForegroundColor Yellow
        $skipped++
        continue
    }
    
    # Verificar se tem <head>
    if ($content -match "<head>") {
        # Calcular o nível de profundidade para ajustar o caminho
        $relativePath = $file.DirectoryName.Replace($modulesPath, "").TrimStart("\")
        $depth = ($relativePath -split "\\").Count
        
        # Construir o caminho relativo correto
        $prefix = "../" * $depth
        $configPath = "${prefix}../public/js/config.js"
        
        $newConfigScript = "    <!-- Configuração Global - DEVE ser carregado PRIMEIRO -->`n    <script src=`"$configPath`"></script>`n    "
        
        # Inserir após <head>
        $newContent = $content -replace "(<head>)", "`$1`n$newConfigScript"
        
        # Salvar o arquivo
        Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8 -NoNewline
        
        Write-Host "✅ Adicionado config.js: $($file.FullName)" -ForegroundColor Green
        $count++
    } else {
        Write-Host "⚠️  Sem <head>: $($file.Name)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Arquivos modificados: $count" -ForegroundColor Green
Write-Host "Arquivos ignorados (já tinham): $skipped" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
