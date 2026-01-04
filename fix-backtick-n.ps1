# Script para remover `n literal de todos os arquivos HTML
$fixed = 0
$files = Get-ChildItem -Path "." -Filter "*.html" -Recurse | Where-Object { $_.FullName -notmatch "node_modules" }

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        if ($content -match [regex]::Escape('`n')) {
            $original = $content
            # Remove `n com espaços antes
            $content = $content -replace '\s*`n', ''
            
            if ($content -ne $original) {
                [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
                Write-Host "Corrigido: $($file.FullName)" -ForegroundColor Green
                $fixed++
            }
        }
    } catch {
        Write-Host "Erro em: $($file.FullName) - $_" -ForegroundColor Red
    }
}

Write-Host "`nTotal de arquivos corrigidos: $fixed" -ForegroundColor Cyan
