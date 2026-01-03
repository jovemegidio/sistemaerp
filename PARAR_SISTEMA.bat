@echo off
:: ====================================================================
:: ALUFORCE v2.0 - PARAR SISTEMA
:: Encerrar todos os servidores Node.js
:: ====================================================================

title ALUFORCE v2.0 - Encerrando Sistema...
color 0C

echo.
echo ========================================================================
echo   ALUFORCE v2.0 - ENCERRAMENTO
echo   Parando todos os servidores...
echo ========================================================================
echo.

echo [1/2] Listando processos Node.js ativos...
tasklist | findstr node.exe
echo.

echo [2/2] Encerrando todos os processos Node.js...
taskkill /F /IM node.exe >nul 2>&1

if %errorlevel% equ 0 (
    echo.
    echo [OK] Todos os servidores foram encerrados com sucesso!
) else (
    echo.
    echo [AVISO] Nenhum servidor estava rodando.
)

echo.
echo ========================================================================
echo   SISTEMA ENCERRADO
echo ========================================================================
echo.
pause
