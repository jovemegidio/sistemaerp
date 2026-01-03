@echo off
chcp 65001 >nul
title 💬 Servidor de Chat - ALUFORCE v2.0

cls
echo ╔════════════════════════════════════════════════════════════╗
echo ║          💬 SERVIDOR DE CHAT - ALUFORCE v2.0             ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:: Verificar Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js não encontrado!
    pause
    exit /b 1
)

echo ✅ Node.js instalado
echo.

:: Navegar para pasta do chat
cd chat

:: Verificar dependências
if not exist node_modules (
    echo 📦 Instalando dependências do chat...
    call npm install
    echo.
)

echo 🚀 Iniciando servidor de chat na porta 3002...
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║              ✅ SERVIDOR DE CHAT ATIVO!                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 📍 URL: http://localhost:3002
echo 💬 WebSocket disponível para conexões
echo.
echo ⚠️  Mantenha esta janela aberta enquanto usar o chat
echo 🛑 Pressione Ctrl+C para encerrar
echo.

node server.js

pause
