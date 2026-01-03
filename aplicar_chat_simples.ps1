# Script simplificado para aplicar Chat Omie + Chat Suporte TI
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " APLICANDO CHAT EM TODOS OS MODULOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$basePath = "C:\Users\Administrator\Pictures\Sistema - Aluforce v.2 - BETA\Sistema - Aluforce v.2 - BETA"

$chatSnippet = @'
    <!-- Chat Omie para usuarios padrao -->
    <link rel="stylesheet" href="/css/chat-widget.css?v=1765414320">
    <link rel="stylesheet" href="/css/chat-widget-omie-extra.css?v=<?php echo time(); ?>">
    <script src="/js/chat-widget-omie.js?v=<?php echo time(); ?>"></script>
    <!-- Chat de Suporte para TI (ti@aluforce.ind.br) -->
    <script src="/js/chat-support-admin.js?v=<?php echo time(); ?>"></script>
'@

$arquivos = @(
    "$basePath\public\index.html",
    "$basePath\modules\RH\public\admin-dashboard.html",
    "$basePath\modules\RH\public\area.html",
    "$basePath\modules\RH\public\areaadm.html",
    "$basePath\modules\RH\public\dashboard.html",
    "$basePath\modules\Vendas\public\index-new.html",
    "$basePath\modules\Vendas\public\index-complete.html",
    "$basePath\modules\Financeiro\public\contas_receber.html",
    "$basePath\modules\Financeiro\public\fluxo_caixa.html",
    "$basePath\modules\Financeiro\public\dashboard.html"
)

$total = 0
$atualizados = 0

foreach ($arquivo in $arquivos) {
    if (Test-Path $arquivo) {
        $total++
        Write-Host "Processando: $arquivo" -ForegroundColor Yellow
        
        $conteudo = Get-Content -Path $arquivo -Raw -Encoding UTF8
        
        if ($conteudo -match "chat-support-admin\.js") {
            Write-Host "  JA ATUALIZADO" -ForegroundColor Green
        }
        else {
            $conteudo = $conteudo -replace '<link[^>]*chat-widget[^>]*>', ''
            $conteudo = $conteudo -replace '<script[^>]*chat-widget[^>]*></script>', ''
            $conteudo = $conteudo -replace '</head>', "$chatSnippet`n</head>"
            
            Set-Content -Path $arquivo -Value $conteudo -Encoding UTF8 -NoNewline
            
            Write-Host "  ATUALIZADO!" -ForegroundColor Green
            $atualizados++
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total processados: $total" -ForegroundColor White
Write-Host "Atualizados: $atualizados" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
