@echo off
:: ====================================================================
:: ALUFORCE v2.0 - SISTEMA COMPLETO
:: Inicialização Rápida de Todos os Servidores
:: ====================================================================

title ALUFORCE v2.0 - Inicializando Sistema...
color 0A

echo.
echo ========================================================================
echo   ALUFORCE v2.0 - SISTEMA INTEGRADO
echo   Iniciando todos os servidores...
echo ========================================================================
echo.

:: Verificar se Node.js está instalado
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Por favor, instale o Node.js em: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js encontrado: 
node --version
echo.

:: Limpar processos Node.js anteriores (opcional)
echo [1/4] Verificando processos anteriores...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo       Pronto.
echo.

:: Iniciar Servidor Principal (porta 3000)
echo [2/4] Iniciando Servidor Principal (porta 3000)...
cd /d "%~dp0"
start "ALUFORCE - Servidor Principal" /MIN cmd /k "node server.js"
timeout /t 3 /nobreak >nul
echo       Servidor Principal: http://localhost:3000
echo.

:: Iniciar Servidor PCP (porta 3001)
echo [3/5] Iniciando Servidor PCP (porta 3001)...
cd /d "%~dp0modules\PCP"
start "ALUFORCE - PCP" /MIN cmd /k "node server_pcp.js"
timeout /t 3 /nobreak >nul
echo       Servidor PCP: http://localhost:3001
echo.

:: Iniciar Servidor de Chat (porta 3002)
echo [4/5] Iniciando Servidor de Chat (porta 3002)...
cd /d "%~dp0chat"
start "ALUFORCE - Chat" /MIN cmd /k "node server.js"
timeout /t 3 /nobreak >nul
echo       Servidor Chat: http://localhost:3002
echo.

:: Verificar se servidores estão rodando
echo [5/5] Verificando servidores...
timeout /t 2 /nobreak >nul

netstat -ano | findstr ":3000" >nul 2>&1
if %errorlevel% equ 0 (
    echo       [OK] Servidor Principal: ATIVO
) else (
    echo       [ERRO] Servidor Principal: FALHOU
)

netstat -ano | findstr ":3001" >nul 2>&1
if %errorlevel% equ 0 (
    echo       [OK] Servidor PCP: ATIVO
) else (
    echo       [ERRO] Servidor PCP: FALHOU
)

netstat -ano | findstr ":3002" >nul 2>&1
if %errorlevel% equ 0 (
    echo       [OK] Servidor Chat: ATIVO
) else (
    echo       [AVISO] Servidor Chat: OPCIONAL
)

echo.
echo ========================================================================
echo   SISTEMA INICIADO COM SUCESSO!
echo ========================================================================
echo.
echo   Acesse o sistema em:
echo   - Sistema Principal: http://localhost:3000
echo   - Modulo PCP:        http://localhost:3000/modules/PCP/index.html
echo   - Modulo Financeiro: http://localhost:3000/modules/Financeiro/financeiro.html
echo   - Chat de Suporte:   Clique no icone verde no canto inferior direito
echo.
echo   Para PARAR o sistema, feche todas as janelas do Node.js
echo   ou execute: PARAR_SISTEMA.bat
echo.
echo ========================================================================

:: Abrir navegador automaticamente
echo.
echo Abrindo sistema no navegador...
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo Pressione qualquer tecla para fechar esta janela...
echo (Os servidores continuarao rodando em background)
pause >nul
