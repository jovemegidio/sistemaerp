@echo off
chcp 65001 > nul
title Aluforce Sistema - Iniciando...

cd /d "%~dp0"

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║           ALUFORCE - Sistema de Gestao Empresarial             ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo Iniciando servidor...

:: Verificar se o servidor já está rodando na porta 3000
netstat -ano | findstr ":3000" >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Servidor ja esta rodando na porta 3000
    goto :abrir_chrome
)

:: Iniciar servidor em segundo plano
start /min cmd /c "node server.js"

:: Aguardar servidor iniciar
echo Aguardando servidor inicializar...
timeout /t 3 /nobreak >nul

:abrir_chrome
echo.
echo Abrindo sistema no navegador...
echo.

:: Tentar encontrar Chrome em locais comuns
set BROWSER_PATH=

:: Verificar Chrome padrão
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_PATH=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    set "BROWSER_NAME=Google Chrome"
    goto :encontrou_browser
)

if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_PATH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
    set "BROWSER_NAME=Google Chrome"
    goto :encontrou_browser
)

if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_PATH=%LocalAppData%\Google\Chrome\Application\chrome.exe"
    set "BROWSER_NAME=Google Chrome"
    goto :encontrou_browser
)

:: Verificar Microsoft Edge
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_PATH=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
    set "BROWSER_NAME=Microsoft Edge"
    goto :encontrou_browser
)

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_PATH=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
    set "BROWSER_NAME=Microsoft Edge"
    goto :encontrou_browser
)

:: Se nenhum navegador encontrado, abrir no navegador padrão
echo [AVISO] Chrome/Edge nao encontrado. Abrindo no navegador padrao...
start http://localhost:3000
goto :fim

:encontrou_browser
echo [OK] %BROWSER_NAME% encontrado
echo.

:: Abrir navegador em modo app (sem barras de navegação)
start "" "%BROWSER_PATH%" --app=http://localhost:3000 --start-maximized --disable-extensions --disable-infobars

:fim
echo.
echo Sistema iniciado com sucesso!
echo.
echo Para fechar o sistema, feche esta janela e o navegador.
echo.

:: Manter janela aberta para manter o servidor rodando
:: (O servidor roda em processo separado, então podemos minimizar)
echo Pressione qualquer tecla para minimizar esta janela...
pause >nul

:: Minimizar janela do console
powershell -window minimized -command ""
