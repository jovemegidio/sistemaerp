@echo off
:: ====================================================================
:: ALUFORCE v2.0 - INSTALAÇÃO DE DEPENDÊNCIAS
:: Instala todas as bibliotecas necessárias
:: ====================================================================

title ALUFORCE v2.0 - Instalando Dependencias...
color 0B

echo.
echo ========================================================================
echo   ALUFORCE v2.0 - INSTALACAO DE DEPENDENCIAS
echo   Instalando bibliotecas Node.js necessarias...
echo ========================================================================
echo.

:: Verificar Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo.
    echo Por favor, instale o Node.js:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js encontrado: 
node --version
echo.

:: Instalar dependências do servidor principal
echo [1/2] Instalando dependencias do SERVIDOR PRINCIPAL...
cd /d "%~dp0"

if exist package.json (
    echo       Executando: npm install
    call npm install
    echo.
    echo       [OK] Dependencias do Servidor Principal instaladas!
) else (
    echo       [AVISO] package.json nao encontrado. Pulando...
)

echo.

:: Instalar dependências do módulo PCP
echo [2/2] Instalando dependencias do MODULO PCP...
cd /d "%~dp0modules\PCP"

if exist package.json (
    echo       Executando: npm install
    call npm install
    echo.
    echo       [OK] Dependencias do Modulo PCP instaladas!
) else (
    echo       Criando package.json para PCP...
    (
        echo {
        echo   "name": "aluforce-pcp",
        echo   "version": "2.0.0",
        echo   "description": "Modulo PCP - Planejamento e Controle de Producao",
        echo   "main": "server_pcp.js",
        echo   "dependencies": {
        echo     "express": "^4.18.2",
        echo     "mysql2": "^3.6.0",
        echo     "cors": "^2.8.5",
        echo     "dotenv": "^16.3.1",
        echo     "exceljs": "^4.3.0",
        echo     "winston": "^3.11.0"
        echo   }
        echo }
    ) > package.json
    
    echo       Executando: npm install
    call npm install
    echo.
    echo       [OK] Dependencias do Modulo PCP instaladas!
)

echo.
echo ========================================================================
echo   INSTALACAO CONCLUIDA!
echo ========================================================================
echo.
echo   Todas as dependencias foram instaladas com sucesso.
echo   Agora voce pode iniciar o sistema com: INICIAR_SISTEMA.bat
echo.
echo ========================================================================
echo.
pause
