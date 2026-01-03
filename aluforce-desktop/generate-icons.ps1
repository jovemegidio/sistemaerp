# Script para gerar ícones do aplicativo
# Execute após criar ou atualizar o ícone principal (icon.png)

Write-Host "Gerador de Ícones ALUFORCE Desktop" -ForegroundColor Cyan
Write-Host ""

$iconDir = "src-tauri\icons"

# Verificar se o ícone fonte existe
$sourceIcon = "$iconDir\icon.png"
if (-not (Test-Path $sourceIcon)) {
    Write-Host "AVISO: Ícone fonte não encontrado em $sourceIcon" -ForegroundColor Yellow
    Write-Host "Por favor, crie um arquivo icon.png (1024x1024 pixels) na pasta $iconDir" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Para gerar ícones automaticamente, você pode usar:" -ForegroundColor Gray
    Write-Host "  1. https://tauri.app/v1/guides/features/icons" -ForegroundColor Gray
    Write-Host "  2. npm install -g @aspect-build/make-app-icon" -ForegroundColor Gray
    Write-Host ""
    exit
}

Write-Host "Use o comando 'npm run tauri icon' para gerar os ícones a partir de icon.png" -ForegroundColor Green
Write-Host ""
Write-Host "Ou use uma ferramenta online como:" -ForegroundColor Gray
Write-Host "  - https://www.favicon-generator.org/" -ForegroundColor Gray
Write-Host "  - https://realfavicongenerator.net/" -ForegroundColor Gray
Write-Host ""

# Tentar gerar ícones com Tauri CLI
npm run tauri icon
