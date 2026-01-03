@echo off
echo ========================================
echo   LIMPAR CACHE COMPLETO - ALUFORCE
echo ========================================
echo.

echo [1/3] Limpando cache do navegador...
echo Por favor, pressione Ctrl+Shift+Delete no seu navegador
echo Ou pressione Ctrl+F5 para recarregar a pagina
echo.

echo [2/3] Verificando arquivos do chat...
if exist "public\css\chat-widget.css" (
    echo ✓ CSS do chat encontrado
) else (
    echo ✗ CSS do chat NAO encontrado
)

if exist "public\js\chat-widget.js" (
    echo ✓ JS do chat encontrado
) else (
    echo ✗ JS do chat NAO encontrado
)
echo.

echo [3/3] Verificando background manager...
if exist "public\js\background-manager.js" (
    echo ✓ Background manager encontrado
) else (
    echo ✗ Background manager NAO encontrado
)

if exist "public\css\backgrounds.css" (
    echo ✓ CSS do background encontrado
) else (
    echo ✗ CSS do background NAO encontrado
)
echo.

echo ========================================
echo Versao atual: 20251206g
echo ========================================
echo.
echo Instrucoes:
echo 1. Abra o navegador
echo 2. Pressione Ctrl+Shift+Delete
echo 3. Marque "Imagens e arquivos em cache"
echo 4. Clique em "Limpar dados"
echo 5. Pressione F5 ou Ctrl+F5 na pagina
echo.

pause
