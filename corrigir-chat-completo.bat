@echo off
chcp 65001 >nul
title Correção Chat Aluforce - Limpar Cache

echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║     CORREÇÃO COMPLETA DO CHAT ALUFORCE - LIMPAR CACHE           ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

echo 📋 Este script irá:
echo    1. Parar o servidor Node.js
echo    2. Atualizar timestamps dos arquivos
echo    3. Reiniciar o servidor
echo    4. Abrir navegador em modo anônimo
echo.
pause

echo.
echo ⏹️  Parando servidor Node.js...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo 🔄 Atualizando timestamps...
node diagnosticar_chat.js

echo.
echo 🗑️  Limpando cache de arquivos temporários...
del /q /s "%TEMP%\*.tmp" 2>nul
del /q /s "%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Cache\*" 2>nul
del /q /s "%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cache\*" 2>nul

echo.
echo 🚀 Iniciando servidor...
start "Aluforce Server" node server.js

echo.
echo ⏳ Aguardando servidor iniciar...
timeout /t 5 /nobreak >nul

echo.
echo 🌐 Abrindo navegador em modo anônimo...
echo.
echo    Escolha seu navegador:
echo    1 - Microsoft Edge (modo InPrivate)
echo    2 - Google Chrome (modo Incognito)
echo    3 - Firefox (modo Privado)
echo    4 - Não abrir navegador
echo.
choice /c 1234 /n /m "Digite o número: "

if errorlevel 4 goto :fim
if errorlevel 3 goto :firefox
if errorlevel 2 goto :chrome
if errorlevel 1 goto :edge

:edge
start msedge.exe -inprivate "http://localhost:3002/teste-chat.html"
goto :fim

:chrome
start chrome.exe --incognito "http://localhost:3002/teste-chat.html"
goto :fim

:firefox
start firefox.exe -private-window "http://localhost:3002/teste-chat.html"
goto :fim

:fim
echo.
echo ✅ CONCLUÍDO!
echo.
echo 📝 INSTRUÇÕES IMPORTANTES:
echo.
echo 1. O navegador abrirá na página de TESTE
echo 2. Verifique se todas as marcações estão ✅
echo 3. Teste o botão flutuante do chat
echo 4. Verifique se as cores estão CIANO (#00c9d7)
echo 5. Verifique se o ÍCONE aparece no botão
echo 6. Verifique se a LOGO aparece no header
echo.
echo Se ainda não funcionar:
echo • Pressione Ctrl + F5 várias vezes
echo • Abra DevTools (F12) → Aba Network
echo • Verifique se /chat/Icone-Chat.png retorna 200
echo.
echo 💡 URL de teste: http://localhost:3002/teste-chat.html
echo 💡 URL principal: http://localhost:3002
echo.
pause
