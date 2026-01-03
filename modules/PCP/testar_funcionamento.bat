@echo off
echo ===============================================
echo TESTE DE FUNCIONAMENTO - AREA PCP ALUFORCE
echo ===============================================
echo.

REM Mover para a pasta do script
cd /d "%~dp0"

echo [1/6] Testando Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ FALHA: Node.js não encontrado
    goto :erro
) else (
    echo ✅ Node.js: OK
)

echo [2/6] Testando npm...
npm --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ FALHA: npm não encontrado
    goto :erro
) else (
    echo ✅ npm: OK
)

echo [3/6] Verificando arquivos necessários...
if not exist "server_pcp.js" (
    echo ❌ FALHA: server_pcp.js não encontrado
    goto :erro
) else (
    echo ✅ server_pcp.js: OK
)

if not exist "node_modules" (
    echo ❌ FALHA: Dependências não instaladas
    goto :erro
) else (
    echo ✅ Dependências: OK
)

echo [4/6] Verificando arquivo .env...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo ✅ .env criado a partir de .env.example
    ) else (
        echo ⚠️ AVISO: .env não encontrado
    )
) else (
    echo ✅ .env: OK
)

echo [5/6] Verificando porta 3001...
netstat -an | findstr ":3001" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ⚠️ Porta 3001 em uso - tentando liberar...
    taskkill /f /im node.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
) else (
    echo ✅ Porta 3001: Livre
)

echo [6/6] Testando inicialização do servidor...
echo.
echo Iniciando servidor em segundo plano...
start /min cmd /c "node server_pcp.js > server_test.log 2>&1"

echo Aguardando 8 segundos para o servidor inicializar...
timeout /t 8 /nobreak >nul

REM Verificar se servidor está rodando
netstat -an | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ Servidor: FUNCIONANDO
    echo.
    echo ===============================================
    echo ✅ TESTE CONCLUÍDO COM SUCESSO!
    echo ===============================================
    echo.
    echo O arquivo iniciar_pcp.bat deve funcionar corretamente.
    echo.
    echo Abrindo a aplicação no navegador...
    start "" "http://localhost:3001"
    echo.
    echo Para parar o servidor, execute: taskkill /f /im node.exe
) else (
    echo ❌ FALHA: Servidor não iniciou
    echo.
    echo Verificando logs...
    if exist "server_test.log" (
        echo --- LOG DO SERVIDOR ---
        type server_test.log
        echo --- FIM DO LOG ---
    )
    goto :erro
)

goto :fim

:erro
echo.
echo ===============================================
echo ❌ TESTE FALHOU
echo ===============================================
echo.
echo O arquivo iniciar_pcp.bat pode não funcionar.
echo Verifique os problemas acima.

:fim
echo.
echo Pressione qualquer tecla para sair...
pause >nul