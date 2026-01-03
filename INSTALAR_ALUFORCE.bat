@echo off
chcp 65001 > nul
title Instalador Aluforce Sistema v2.0

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                                                                ║
echo ║         ███████╗██╗     ██╗   ██╗███████╗ ██████╗ ██████╗      ║
echo ║         ██╔══██║██║     ██║   ██║██╔════╝██╔═══██╗██╔══██╗     ║
echo ║         ███████║██║     ██║   ██║█████╗  ██║   ██║██████╔╝     ║
echo ║         ██╔══██║██║     ██║   ██║██╔══╝  ██║   ██║██╔══██╗     ║
echo ║         ██║  ██║███████╗╚██████╔╝██║     ╚██████╔╝██║  ██║     ║
echo ║         ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝      ╚═════╝ ╚═╝  ╚═╝     ║
echo ║                                                                ║
echo ║                   SISTEMA DE GESTAO EMPRESARIAL                ║
echo ║                         Versao 2.0.0                           ║
echo ║                                                                ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo Preparando instalacao...
echo.

:: Verificar se Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo.
    echo Por favor, instale o Node.js primeiro:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js encontrado
for /f "tokens=*" %%i in ('node -v') do echo     Versao: %%i
echo.

:: Verificar npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] npm nao encontrado!
    pause
    exit /b 1
)

echo [OK] npm encontrado
for /f "tokens=*" %%i in ('npm -v') do echo     Versao: %%i
echo.

:: Instalar dependências
echo Instalando dependencias do sistema...
echo Isso pode levar alguns minutos...
echo.

call npm install

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao instalar dependencias!
    pause
    exit /b 1
)

echo.
echo [OK] Dependencias instaladas com sucesso!
echo.

:: Criar atalho na área de trabalho
echo Criando atalho na Area de Trabalho...

set DESKTOP=%USERPROFILE%\Desktop
set SHORTCUT_NAME=Aluforce Sistema.lnk
set TARGET_PATH=%~dp0INICIAR_ALUFORCE.bat

:: Usar PowerShell para criar atalho
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%DESKTOP%\%SHORTCUT_NAME%'); $Shortcut.TargetPath = '%TARGET_PATH%'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.IconLocation = '%~dp0assets\icon.ico'; $Shortcut.Description = 'Aluforce - Sistema de Gestao Empresarial'; $Shortcut.Save()"

echo [OK] Atalho criado na Area de Trabalho
echo.

:: Criar pasta assets se não existir
if not exist "%~dp0assets" mkdir "%~dp0assets"

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                                                                ║
echo ║              INSTALACAO CONCLUIDA COM SUCESSO!                 ║
echo ║                                                                ║
echo ║  Para iniciar o sistema:                                       ║
echo ║  - Use o atalho "Aluforce Sistema" na Area de Trabalho         ║
echo ║  - Ou execute INICIAR_ALUFORCE.bat                             ║
echo ║                                                                ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo Deseja iniciar o sistema agora? (S/N)
set /p INICIAR=

if /i "%INICIAR%"=="S" (
    call "%~dp0INICIAR_ALUFORCE.bat"
)

pause
