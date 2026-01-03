@echo off
REM ═══════════════════════════════════════════════════════════════════════════════
REM  ALUFORCE ERP - Launcher Desktop (Electron)
REM  Inicia o sistema em modo aplicativo desktop
REM ═══════════════════════════════════════════════════════════════════════════════

title ALUFORCE ERP - Desktop
color 0B

echo.
echo ═══════════════════════════════════════════════════════════════
echo   ALUFORCE ERP - Modo Desktop
echo   Aplicativo Electron
echo ═══════════════════════════════════════════════════════════════
echo.

REM Verificar Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERRO] Node.js nao encontrado!
    echo Por favor, execute INSTALAR.bat primeiro.
    echo.
    pause
    exit /b 1
)

REM Verificar Electron
if not exist "node_modules\electron" (
    color 0C
    echo [ERRO] Electron nao instalado!
    echo Por favor, execute INSTALAR.bat primeiro.
    echo.
    pause
    exit /b 1
)

echo Iniciando aplicativo desktop...
echo.

REM Iniciar Electron
npx electron .

if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [ERRO] Falha ao iniciar aplicativo!
    echo.
    pause
    exit /b 1
)
