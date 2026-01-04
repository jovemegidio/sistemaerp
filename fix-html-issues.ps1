$fixed = 0
Get-ChildItem -Path "." -Recurse -Include "*.html" | Where-Object { $_.FullName -notmatch "node_modules" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -and $content.Contains('`n')) {
        # Remove literal `n
        $newContent = $content -replace '``n', ''
        
        # Remove referencias a arquivos que nao existem
        $newContent = $newContent -replace '<link rel="stylesheet" href="css/popup-confirmacao\.css">', ''
        $newContent = $newContent -replace '<link rel="stylesheet" href="/css/popup-confirmacao\.css">', ''
        $newContent = $newContent -replace '<script src="js/popup-confirmacao\.js"></script>', ''
        $newContent = $newContent -replace '<script src="/js/popup-confirmacao\.js"></script>', ''
        $newContent = $newContent -replace '<script src="js/anti-copy-protection\.js"></script>', ''
        $newContent = $newContent -replace '<link rel="stylesheet" href="css/responsive\.css\?v=\d+">', ''
        $newContent = $newContent -replace '<link rel="stylesheet" href="../../public/css/responsive\.css\?v=\d+">', ''
        
        Set-Content $_.FullName -Value $newContent -NoNewline
        $fixed++
        Write-Host "Corrigido: $($_.FullName)"
    }
}
Write-Host "`nTotal corrigido: $fixed arquivos"
