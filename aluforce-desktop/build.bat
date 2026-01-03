@echo off
:: Build ALUFORCE Desktop para Windows
:: Execute como Administrador se necessário

echo ============================================
echo   ALUFORCE Desktop - Build para Windows
echo ============================================
echo.

cd /d "%~dp0"

echo [1/4] Instalando dependências NPM...
call npm install
if %errorlevel% neq 0 (
    echo ERRO: Falha ao instalar dependências NPM
    pause
    exit /b 1
)

echo [2/4] Compilando frontend...
call npm run build
if %errorlevel% neq 0 (
    echo ERRO: Falha na compilação do frontend
    pause
    exit /b 1
)

echo [3/4] Compilando aplicação Tauri...
echo Isso pode levar alguns minutos...
call npm run tauri build
if %errorlevel% neq 0 (
    echo ERRO: Falha na compilação Tauri
    pause
    exit /b 1
)

echo [4/4] Build concluído!
echo.
echo ============================================
echo   Instaladores gerados em:
echo   src-tauri\target\release\bundle
echo ============================================
echo.

dir /s /b src-tauri\target\release\bundle\*.exe 2>nul
dir /s /b src-tauri\target\release\bundle\*.msi 2>nul

echo.
echo Build finalizado com sucesso!
pause
