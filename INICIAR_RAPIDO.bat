@echo off
:: ====================================================================
:: ALUFORCE v2.0 - INICIALIZAÇÃO RÁPIDA (EXPRESS)
:: Inicia sistema sem mensagens e abre navegador direto
:: ====================================================================

:: Fechar processos anteriores
taskkill /F /IM node.exe >nul 2>&1

:: Aguardar 1 segundo
timeout /t 1 /nobreak >nul

:: Iniciar Servidor Principal
cd /d "%~dp0"
start /MIN cmd /c "node server.js"

:: Iniciar Servidor PCP
cd /d "%~dp0modules\PCP"
start /MIN cmd /c "node server_pcp.js"

:: Iniciar Servidor de Chat
cd /d "%~dp0chat"
start /MIN cmd /c "node server.js"

:: Aguardar servidores inicializarem
timeout /t 5 /nobreak >nul

:: Abrir navegador
start http://localhost:3000

:: Fechar esta janela
exit
