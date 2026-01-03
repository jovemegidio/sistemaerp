@echo off
REM Script para criar apenas o atalho na area de trabalho

cd /d "%~dp0"

echo ====================================
echo Criando atalho Aluforce PCP
echo ====================================

REM Verificar se o icone existe
if not exist "Interativo-Aluforce.webp" (
  echo Aviso: Arquivo de icone 'Interativo-Aluforce.webp' nao encontrado.
  echo O atalho sera criado com icone padrao.
)

REM Verificar se o script bat principal existe
if not exist "iniciar_pcp.bat" (
  echo Erro: Script 'iniciar_pcp.bat' nao encontrado.
  echo Certifique-se de que este script esta na mesma pasta que iniciar_pcp.bat
  pause
  exit /b 1
)

REM Executar o script VBS para criar o atalho
cscript //nologo criar_atalho.vbs

if %ERRORLEVEL% EQU 0 (
  echo.
  echo Atalho criado com sucesso na area de trabalho!
  echo Agora voce pode usar o atalho "Aluforce PCP" para iniciar o sistema.
) else (
  echo.
  echo Erro ao criar o atalho. Verifique as permissoes do sistema.
)

echo.
pause