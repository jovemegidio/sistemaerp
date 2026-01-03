# Script para aplicar Chat Omie + Chat Suporte TI em todos os módulos
# ALUFORCE v.2 - Sistema ERP Completo

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  APLICANDO CHAT EM TODOS OS MÓDULOS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Caminhos base
$basePath = "C:\Users\Administrator\Pictures\Sistema - Aluforce v.2 - BETA\Sistema - Aluforce v.2 - BETA"

# Snippet de código para adicionar antes do </head>
$chatSnippet = @"
    <!-- Chat Omie para usuários padrão -->
    <link rel="stylesheet" href="/css/chat-widget.css?v=1765414320">
    <link rel="stylesheet" href="/css/chat-widget-omie-extra.css?v=<?php echo time(); ?>">
    <script src="/js/chat-widget-omie.js?v=<?php echo time(); ?>"></script>
    <!-- Chat de Suporte para TI (ti@aluforce.ind.br) -->
    <script src="/js/chat-support-admin.js?v=<?php echo time(); ?>"></script>
"@

# Lista de arquivos HTML principais dos módulos
$modulosHTML = @(
    # Dashboard Principal
    "$basePath\public\index.html",
    
    # Módulo RH
    "$basePath\modules\RH\public\admin-dashboard.html",
    "$basePath\modules\RH\public\admin-funcionarios.html",
    "$basePath\modules\RH\public\admin-pcp.html",
    "$basePath\modules\RH\public\admin-beneficios.html",
    "$basePath\modules\RH\public\admin-folha-pagamento.html",
    "$basePath\modules\RH\public\admin-ponto.html",
    "$basePath\modules\RH\public\admin-relatorios.html",
    "$basePath\modules\RH\public\area.html",
    "$basePath\modules\RH\public\areaadm.html",
    "$basePath\modules\RH\public\dashboard.html",
    "$basePath\modules\RH\public\dados-pessoais.html",
    
    # Módulo Vendas
    "$basePath\modules\Vendas\public\index.html",
    "$basePath\modules\Vendas\public\index-new.html",
    "$basePath\modules\Vendas\public\index-complete.html",
    
    # Módulo Financeiro
    "$basePath\modules\Financeiro\public\contas_pagar.html",
    "$basePath\modules\Financeiro\public\contas_receber.html",
    "$basePath\modules\Financeiro\public\fluxo_caixa.html",
    "$basePath\modules\Financeiro\public\dashboard.html",
    
    # Módulo PCP
    "$basePath\modules\PCP\public\index.html",
    "$basePath\modules\PCP\public\dashboard.html",
    "$basePath\modules\PCP\public\ordens-producao.html",
    "$basePath\modules\PCP\public\materiais.html",
    "$basePath\modules\PCP\public\planejamento.html",
    
    # Módulo Compras
    "$basePath\modules\Compras\public\index.html",
    "$basePath\modules\Compras\public\dashboard.html",
    "$basePath\modules\Compras\public\pedidos.html",
    "$basePath\modules\Compras\public\fornecedores.html",
    
    # Módulo NFe/Logística
    "$basePath\modules\NFe\public\index.html",
    "$basePath\modules\NFe\public\dashboard.html",
    "$basePath\modules\NFe\public\emitir.html",
    "$basePath\modules\NFe\public\consultar.html",
    
    # Módulo Faturamento
    "$basePath\modules\Faturamento\public\index.html"
)

$totalArquivos = 0
$totalAtualizados = 0
$totalJaAtualizados = 0
$totalErros = 0

foreach ($arquivo in $modulosHTML) {
    if (Test-Path $arquivo) {
        $totalArquivos++
        Write-Host "Processando: " -NoNewline
        Write-Host "$arquivo" -ForegroundColor Yellow
        
        try {
            # Ler conteúdo do arquivo
            $conteudo = Get-Content -Path $arquivo -Raw -Encoding UTF8
            
            # Verificar se já tem o chat de suporte
            if ($conteudo -match "chat-support-admin\.js") {
                Write-Host "  ✓ Já atualizado (chat de suporte encontrado)" -ForegroundColor Green
                $totalJaAtualizados++
            }
            # Verificar se já tem algum chat
            elseif ($conteudo -match "chat-widget") {
                Write-Host "  → Atualizando chat existente..." -ForegroundColor Cyan
                
                # Remover referências antigas de chat
                $conteudo = $conteudo -replace '<link[^>]*chat-widget[^>]*>\s*', ''
                $conteudo = $conteudo -replace '<script[^>]*chat-widget[^>]*></script>\s*', ''
                
                # Adicionar novo snippet antes do </head>
                $conteudo = $conteudo -replace '</head>', "$chatSnippet`r`n</head>"
                
                # Salvar arquivo
                Set-Content -Path $arquivo -Value $conteudo -Encoding UTF8 -NoNewline
                
                Write-Host "  ✓ Atualizado com sucesso!" -ForegroundColor Green
                $totalAtualizados++
            }
            # Arquivo sem chat
            else {
                Write-Host "  → Adicionando chat pela primeira vez..." -ForegroundColor Cyan
                
                # Adicionar snippet antes do </head>
                $conteudo = $conteudo -replace '</head>', "$chatSnippet`r`n</head>"
                
                # Salvar arquivo
                Set-Content -Path $arquivo -Value $conteudo -Encoding UTF8 -NoNewline
                
                Write-Host "  ✓ Chat adicionado com sucesso!" -ForegroundColor Green
                $totalAtualizados++
            }
        }
        catch {
            Write-Host "  ✗ Erro ao processar arquivo: $_" -ForegroundColor Red
            $totalErros++
        }
        
        Write-Host ""
    }
    else {
        Write-Host "Arquivo não encontrado: $arquivo" -ForegroundColor DarkGray
        Write-Host ""
    }
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "           RESUMO DA APLICAÇÃO" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total de arquivos processados: " -NoNewline
Write-Host "$totalArquivos" -ForegroundColor White
Write-Host "Arquivos atualizados: " -NoNewline
Write-Host "$totalAtualizados" -ForegroundColor Green
Write-Host "Já estavam atualizados: " -NoNewline
Write-Host "$totalJaAtualizados" -ForegroundColor Yellow
Write-Host "Erros encontrados: " -NoNewline
Write-Host "$totalErros" -ForegroundColor Red
Write-Host ""

if ($totalAtualizados -gt 0) {
    Write-Host "✓ Chat Omie aplicado em $totalAtualizados módulos!" -ForegroundColor Green
    Write-Host "✓ Chat de Suporte TI configurado para ti@aluforce.ind.br" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANTE:" -ForegroundColor Yellow
    Write-Host "- Usuários normais verão o chat Omie padrão (5 telas)" -ForegroundColor White
    Write-Host "- Usuário TI (ti@aluforce.ind.br) verá a Central de Suporte" -ForegroundColor White
    Write-Host "- Sistema identifica automaticamente pelo email do localStorage" -ForegroundColor White
}

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
