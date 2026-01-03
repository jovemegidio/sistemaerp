# Build ALUFORCE Desktop para Windows
# Execute este script no PowerShell como Administrador

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ALUFORCE Desktop - Build para Windows" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir

# Verificar pré-requisitos
Write-Host "[1/6] Verificando pré-requisitos..." -ForegroundColor Yellow

# Node.js
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "  ERRO: Node.js não encontrado. Instale em https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green

# Rust
$rustVersion = rustc --version 2>$null
if (-not $rustVersion) {
    Write-Host "  ERRO: Rust não encontrado. Instale em https://rustup.rs" -ForegroundColor Red
    exit 1
}
Write-Host "  Rust: $rustVersion" -ForegroundColor Green

# Cargo
$cargoVersion = cargo --version 2>$null
Write-Host "  Cargo: $cargoVersion" -ForegroundColor Green

Write-Host ""
Write-Host "[2/6] Instalando dependências NPM..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERRO: Falha ao instalar dependências NPM" -ForegroundColor Red
    exit 1
}
Write-Host "  Dependências NPM instaladas com sucesso!" -ForegroundColor Green

Write-Host ""
Write-Host "[3/6] Verificando dependências Rust..." -ForegroundColor Yellow
Set-Location src-tauri
cargo check
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERRO: Falha na verificação de dependências Rust" -ForegroundColor Red
    exit 1
}
Set-Location ..
Write-Host "  Dependências Rust OK!" -ForegroundColor Green

Write-Host ""
Write-Host "[4/6] Compilando frontend React..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERRO: Falha na compilação do frontend" -ForegroundColor Red
    exit 1
}
Write-Host "  Frontend compilado com sucesso!" -ForegroundColor Green

Write-Host ""
Write-Host "[5/6] Compilando aplicação Tauri (Release)..." -ForegroundColor Yellow
Write-Host "  Isso pode levar alguns minutos..." -ForegroundColor Gray
npm run tauri build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERRO: Falha na compilação Tauri" -ForegroundColor Red
    exit 1
}
Write-Host "  Aplicação Tauri compilada com sucesso!" -ForegroundColor Green

Write-Host ""
Write-Host "[6/6] Build concluído!" -ForegroundColor Yellow

# Localizar instaladores gerados
$bundleDir = "src-tauri\target\release\bundle"
$nsisDir = "$bundleDir\nsis"
$msiDir = "$bundleDir\msi"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Instaladores gerados:" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

if (Test-Path $nsisDir) {
    $nsisFiles = Get-ChildItem $nsisDir -Filter "*.exe"
    foreach ($file in $nsisFiles) {
        Write-Host "  NSIS: $($file.FullName)" -ForegroundColor Green
    }
}

if (Test-Path $msiDir) {
    $msiFiles = Get-ChildItem $msiDir -Filter "*.msi"
    foreach ($file in $msiFiles) {
        Write-Host "  MSI: $($file.FullName)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Build finalizado com sucesso!" -ForegroundColor Green
Write-Host "Os instaladores estão em: $bundleDir" -ForegroundColor Gray
Write-Host ""
