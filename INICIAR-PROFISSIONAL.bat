@echo off
REM ═══════════════════════════════════════════════════════════════════════════════
REM  ALUFORCE ERP v2.2.0 - Enterprise Edition
REM  Sistema de Gestao Empresarial Completo
REM  Copyright (c) 2025 ALUFORCE Sistemas Ltda.
REM  Todos os direitos reservados.
REM ═══════════════════════════════════════════════════════════════════════════════

title ALUFORCE ERP - Sistema de Gestao Empresarial
color 0B
mode con: cols=85 lines=30

cls

echo.
echo         ╔═══════════════════════════════════════════════════════════════════╗
echo         ║                                                                   ║
echo         ║              █████╗ ██╗     ██╗   ██╗███████╗ ██████╗ ██████╗ ██╗║
echo         ║             ██╔══██╗██║     ██║   ██║██╔════╝██╔═══██╗██╔══██╗╚═╝║
echo         ║             ███████║██║     ██║   ██║█████╗  ██║   ██║██████╔╝   ║
echo         ║             ██╔══██║██║     ██║   ██║██╔══╝  ██║   ██║██╔══██╗   ║
echo         ║             ██║  ██║███████╗╚██████╔╝██║     ╚██████╔╝██║  ██║██╗║
echo         ║             ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚═╝║
echo         ║                                                                   ║
echo         ║                    SISTEMA DE GESTAO EMPRESARIAL                 ║
echo         ║                         Enterprise Edition                        ║
echo         ║                            Versao 2.2.0                           ║
echo         ║                                                                   ║
echo         ╚═══════════════════════════════════════════════════════════════════╝
echo.
echo         ┌───────────────────────────────────────────────────────────────────┐
echo         │  Modulos: PCP · Vendas · Compras · Faturamento · RH · Financeiro │
echo         └───────────────────────────────────────────────────────────────────┘
echo.
echo         ═══════════════════════════════════════════════════════════════════
echo                          ALUFORCE Sistemas Ltda.
echo                      Copyright (c) 2025 - Todos os direitos reservados
echo                              www.aluforce.com
echo         ═══════════════════════════════════════════════════════════════════
echo.

echo         [INFORMACAO] Preparando ambiente de execucao...
echo.

REM ─────────────────────────────────────────────────────────────────────────────
REM  VERIFICACOES DE SEGURANCA E AMBIENTE
REM ─────────────────────────────────────────────────────────────────────────────

echo         [1/5] Verificando Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo         [ERRO] Node.js nao encontrado!
    echo.
    echo         Node.js 18+ e necessario para executar o ALUFORCE ERP.
    echo         Faca o download em: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VERSION=%%v
echo         [OK] Node.js %NODE_VERSION% detectado
echo.

echo         [2/5] Verificando integridade dos arquivos...
if not exist "server.js" (
    color 0C
    echo         [ERRO] Arquivo server.js nao encontrado!
    echo         Reinstale o ALUFORCE ERP.
    echo.
    pause
    exit /b 1
)

if not exist "package.json" (
    color 0C
    echo         [ERRO] Arquivo package.json nao encontrado!
    echo         Reinstale o ALUFORCE ERP.
    echo.
    pause
    exit /b 1
)
echo         [OK] Arquivos principais verificados
echo.

echo         [3/5] Verificando licenca de uso...
if not exist "LICENSE.txt" (
    echo         [AVISO] Arquivo de licenca nao encontrado
) else (
    echo         [OK] Licenca presente
)
echo.

echo         [4/5] Verificando dependencias...
if not exist "node_modules" (
    echo         [AVISO] Dependencias nao instaladas
    echo         Execute INSTALAR.bat primeiro para configurar o sistema.
    echo.
    choice /C SN /M "Deseja instalar agora? (S/N)"
    if errorlevel 2 (
        echo.
        echo         Instalacao cancelada.
        echo         Execute INSTALAR.bat quando estiver pronto.
        echo.
        pause
        exit /b 0
    )
    
    echo.
    echo         Instalando dependencias... Aguarde...
    call npm install --legacy-peer-deps
    
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo.
        echo         [ERRO] Falha na instalacao de dependencias!
        echo.
        pause
        exit /b 1
    )
)
echo         [OK] Dependencias instaladas
echo.

echo         [5/5] Verificando porta 3000...
netstat -an | findstr ":3000" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo         [AVISO] Porta 3000 em uso - o sistema sera reiniciado
) else (
    echo         [OK] Porta 3000 disponivel
)
echo.

REM ─────────────────────────────────────────────────────────────────────────────
REM  INICIALIZACAO DO SISTEMA
REM ─────────────────────────────────────────────────────────────────────────────

echo         ═══════════════════════════════════════════════════════════════════
echo                              INICIANDO SISTEMA
echo         ═══════════════════════════════════════════════════════════════════
echo.
echo         Ambiente: Producao
echo         Porta: 3000
echo         URL: http://localhost:3000
echo.
echo         ═══════════════════════════════════════════════════════════════════
echo.

REM Criar diretorio de logs se nao existir
if not exist "logs" mkdir logs

REM Marcar data/hora de inicio
echo [%DATE% %TIME%] Sistema iniciado >> logs\aluforce.log

REM Iniciar servidor
echo         Iniciando servidor Node.js...
echo.
echo         ╔═══════════════════════════════════════════════════════════════════╗
echo         ║                                                                   ║
echo         ║                    ALUFORCE ERP ESTA RODANDO                     ║
echo         ║                                                                   ║
echo         ║                 Acesse: http://localhost:3000                     ║
echo         ║                                                                   ║
echo         ║            Pressione CTRL+C para encerrar o sistema              ║
echo         ║                                                                   ║
echo         ╚═══════════════════════════════════════════════════════════════════╝
echo.
echo         Logs em tempo real:
echo         ───────────────────────────────────────────────────────────────────
echo.

REM Abrir navegador após 2 segundos
start /B timeout /t 2 /nobreak >nul && start http://localhost:3000

REM Executar servidor (logs aparecem na tela)
node server.js

REM Se chegar aqui, o servidor foi encerrado
echo.
echo         ═══════════════════════════════════════════════════════════════════
echo                            SISTEMA ENCERRADO
echo         ═══════════════════════════════════════════════════════════════════
echo.
echo         O ALUFORCE ERP foi encerrado com sucesso.
echo.
echo         Para suporte tecnico:
echo         - Email: suporte@aluforce.com
echo         - Telefone: 0800 XXX XXXX
echo         - Site: www.aluforce.com/suporte
echo.
echo         ═══════════════════════════════════════════════════════════════════
echo                      Copyright (c) 2025 ALUFORCE Sistemas
echo         ═══════════════════════════════════════════════════════════════════
echo.

pause
