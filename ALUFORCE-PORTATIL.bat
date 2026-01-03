@echo off
REM ═══════════════════════════════════════════════════════════════════════════════
REM  ALUFORCE ERP - Launcher Simples (Versão Portátil)
REM  Inicia o sistema sem necessidade de instalação
REM ═══════════════════════════════════════════════════════════════════════════════

title ALUFORCE ERP - Iniciando...
color 0A

echo.
echo ═══════════════════════════════════════════════════════════════
echo   ALUFORCE ERP - Sistema de Gestao Empresarial
echo   Versao Portatil - Sem Instalacao
echo ═══════════════════════════════════════════════════════════════
echo.

REM Verificar se o Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERRO] Node.js nao encontrado!
    echo.
    echo Por favor, instale o Node.js 18+ em:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/4] Verificando Node.js...
node --version
echo       OK!
echo.

REM Verificar dependências
if not exist "node_modules" (
    echo [2/4] Primeira execucao - Instalando dependencias...
    echo       Isso pode demorar alguns minutos...
    echo.
    call npm install --legacy-peer-deps
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo.
        echo [ERRO] Falha ao instalar dependencias!
        echo.
        pause
        exit /b 1
    )
) else (
    echo [2/4] Dependencias ja instaladas
    echo       OK!
)
echo.

REM Verificar servidor
if not exist "server.js" (
    color 0C
    echo [ERRO] Arquivo server.js nao encontrado!
    echo.
    pause
    exit /b 1
)

echo [3/4] Iniciando servidor...
echo.

REM Iniciar servidor em background
start /B node server.js > logs\server.log 2>&1

REM Aguardar servidor iniciar
timeout /t 3 /nobreak >nul

echo [4/4] Abrindo aplicacao...
echo.
echo ═══════════════════════════════════════════════════════════════
echo   ALUFORCE ERP Iniciado!
echo   Acesse: http://localhost:3000
echo ═══════════════════════════════════════════════════════════════
echo.
echo Pressione CTRL+C para encerrar o servidor
echo.

REM Abrir no navegador padrão
start http://localhost:3000

REM Manter janela aberta
node server.js
