;@echo off
chcp 65001 >nul 2>&1
title Aluforce ERP
cd /d "%~dp0"

:: ============================================================================
:: ALUFORCE ERP - Iniciador do Sistema
:: Tema: Azul/Ciano (cores oficiais Aluforce)
:: ============================================================================

:: Verificar se Node.js esta rodando
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I "node.exe" >nul
if %errorlevel% equ 0 (
    echo Servidor ja esta rodando...
    goto :open_browser
)

:: Iniciar splash screen com logo real
start "" /b powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Splash-Aluforce.ps1"

:: Aguardar splash aparecer
timeout /t 1 /nobreak >nul

:: Iniciar servidor Node.js em segundo plano
echo Iniciando servidor Aluforce ERP...
start "" /min cmd /c "cd /d "%~dp0" && node server.js"

:: Aguardar servidor iniciar
echo Aguardando servidor...
timeout /t 2 /nobreak >nul

:open_browser
:: Procurar Chrome Portable
set "CHROME_PORTABLE=%~dp0GoogleChromePortable\GoogleChromePortable.exe"
if exist "%CHROME_PORTABLE%" (
    echo Abrindo Chrome Portable...
    start "" "%CHROME_PORTABLE%" --app=http://localhost:3000 --start-maximized
    goto :end
)

:: Procurar Chrome Portable em pasta alternativa
set "CHROME_PORTABLE=%~dp0Chrome\GoogleChromePortable.exe"
if exist "%CHROME_PORTABLE%" (
    echo Abrindo Chrome Portable...
    start "" "%CHROME_PORTABLE%" --app=http://localhost:3000 --start-maximized
    goto :end
)

:: Usar Chrome instalado
set "CHROME_INSTALLED=C:\Program Files\Google\Chrome\Application\chrome.exe"
if exist "%CHROME_INSTALLED%" (
    echo Abrindo Google Chrome...
    start "" "%CHROME_INSTALLED%" --app=http://localhost:3000 --start-maximized
    goto :end
)

:: Fallback para navegador padrao
echo Abrindo navegador padrao...
start http://localhost:3000

:end
exit
