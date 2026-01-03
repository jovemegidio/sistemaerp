@echo off
title Aluforce ERP
cd /d "C:\Users\Administrator\Pictures\v11.12\Sistema - Aluforce v.2 - BETA"

:: Verificar se Node.js esta em execucao
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Servidor ja esta em execucao...
) else (
    echo Iniciando servidor Aluforce ERP...
    start /B node server.js
    timeout /t 3 /nobreak >nul
)

:: Abrir no navegador
start http://localhost:3000
