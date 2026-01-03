@echo off
chcp 65001 >nul 2>&1
title Aluforce ERP - Instalador Web
cd /d "%~dp0"

:: Verificar permissoes de administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Solicitando permissoes de administrador...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

:: Executar instalador Web
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Instalador-Web.ps1"
