@echo off
chcp 65001 > nul
title Aluforce Sistema v2.0

cd /d "%~dp0"

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║         ALUFORCE - Sistema de Gestao Empresarial               ║
echo ║                     Aplicativo Desktop                         ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

:: Verificar se electron está instalado
if not exist "node_modules\electron" (
    echo [!] Electron nao encontrado. Instalando...
    echo.
    set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
    call npm install electron --save-dev --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar Electron
        pause
        exit /b 1
    )
)

echo Iniciando Aluforce Sistema...
echo.

:: Iniciar Electron
call npx electron .

if %errorlevel% neq 0 (
    echo.
    echo [!] O aplicativo foi fechado ou ocorreu um erro.
)

echo.
echo Aplicativo encerrado.
timeout /t 3 >nul
