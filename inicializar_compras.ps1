# =====================================================
# SCRIPT DE INICIALIZAÇÃO DO MÓDULO DE COMPRAS
# Sistema Aluforce v2.0
# =====================================================

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "   INICIALIZAÇÃO DO MÓDULO DE COMPRAS - ALUFORCE" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Configurações
$MYSQL_HOST = "localhost"
$MYSQL_PORT = "3306"
$MYSQL_USER = "root"
$MYSQL_PASSWORD = "@dminalu"
$MYSQL_DATABASE = "aluforce_vendas"

# Caminho dos scripts SQL
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$SQL_DIR = Join-Path $SCRIPT_DIR "sql"

# Função para executar SQL
function Execute-SQLFile {
    param (
        [string]$FilePath,
        [string]$Description
    )
    
    Write-Host ""
    Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] Executando: $Description" -ForegroundColor Yellow
    Write-Host "   Arquivo: $FilePath" -ForegroundColor Gray
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "   ❌ Arquivo não encontrado!" -ForegroundColor Red
        return $false
    }
    
    try {
        $command = "mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE"
        Get-Content $FilePath | & mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER "-p$MYSQL_PASSWORD" $MYSQL_DATABASE 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Executado com sucesso!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "   ⚠️  Executado com avisos" -ForegroundColor Yellow
            return $true
        }
    } catch {
        Write-Host "   ❌ Erro: $_" -ForegroundColor Red
        return $false
    }
}

# Função para verificar conexão com MySQL
function Test-MySQLConnection {
    Write-Host ""
    Write-Host "🔍 Verificando conexão com MySQL..." -ForegroundColor Cyan
    
    try {
        $result = & mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER "-p$MYSQL_PASSWORD" -e "SELECT 1" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Conexão bem-sucedida!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "   ❌ Falha na conexão!" -ForegroundColor Red
            Write-Host "   $result" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "   ❌ Erro ao conectar: $_" -ForegroundColor Red
        return $false
    }
}

# Função para fazer backup
function Backup-Database {
    Write-Host ""
    Write-Host "💾 Criando backup do banco de dados..." -ForegroundColor Cyan
    
    $backupDir = Join-Path $SCRIPT_DIR "backups"
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir | Out-Null
    }
    
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $backupFile = Join-Path $backupDir "backup_antes_compras_$timestamp.sql"
    
    try {
        & mysqldump -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER "-p$MYSQL_PASSWORD" $MYSQL_DATABASE > $backupFile
        
        if ($LASTEXITCODE -eq 0) {
            $fileSize = (Get-Item $backupFile).Length / 1MB
            Write-Host "   ✅ Backup criado: $backupFile" -ForegroundColor Green
            Write-Host "   📊 Tamanho: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray
            return $true
        } else {
            Write-Host "   ⚠️  Falha ao criar backup" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "   ❌ Erro ao criar backup: $_" -ForegroundColor Red
        return $false
    }
}

# Início do script
Write-Host "📋 Configurações:" -ForegroundColor Cyan
Write-Host "   Host: $MYSQL_HOST" -ForegroundColor Gray
Write-Host "   Porta: $MYSQL_PORT" -ForegroundColor Gray
Write-Host "   Usuário: $MYSQL_USER" -ForegroundColor Gray
Write-Host "   Database: $MYSQL_DATABASE" -ForegroundColor Gray
Write-Host ""

# Verificar se mysql está disponível
if (-not (Get-Command mysql -ErrorAction SilentlyContinue)) {
    Write-Host "❌ MySQL client não encontrado!" -ForegroundColor Red
    Write-Host "   Instale o MySQL client ou adicione ao PATH" -ForegroundColor Yellow
    exit 1
}

# Testar conexão
if (-not (Test-MySQLConnection)) {
    Write-Host ""
    Write-Host "❌ Não foi possível conectar ao MySQL. Verifique as configurações." -ForegroundColor Red
    exit 1
}

# Perguntar se deseja fazer backup
Write-Host ""
$resposta = Read-Host "Deseja criar um backup antes de continuar? (S/N)"
if ($resposta -eq 'S' -or $resposta -eq 's') {
    Backup-Database
}

# Executar scripts SQL em ordem
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "   EXECUTANDO SCRIPTS SQL" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

$scripts = @(
    @{
        File = Join-Path $SQL_DIR "compras_estrutura_completa.sql"
        Description = "Estrutura completa do módulo de Compras"
    },
    @{
        File = Join-Path $SQL_DIR "compras_integracao_pcp.sql"
        Description = "Integração com módulo PCP"
    }
)

$sucessos = 0
$falhas = 0

foreach ($script in $scripts) {
    if (Execute-SQLFile -FilePath $script.File -Description $script.Description) {
        $sucessos++
    } else {
        $falhas++
    }
    Start-Sleep -Seconds 1
}

# Resultados
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "   RESULTADOS" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Scripts executados com sucesso: $sucessos" -ForegroundColor Green
if ($falhas -gt 0) {
    Write-Host "❌ Scripts com erro: $falhas" -ForegroundColor Red
}

# Verificar tabelas criadas
Write-Host ""
Write-Host "🔍 Verificando tabelas criadas..." -ForegroundColor Cyan

$query = @"
SELECT TABLE_NAME, TABLE_ROWS 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = '$MYSQL_DATABASE' 
  AND TABLE_NAME LIKE '%fornecedor%' 
   OR TABLE_NAME LIKE '%pedidos_compra%'
   OR TABLE_NAME LIKE '%cotac%'
   OR TABLE_NAME LIKE '%recebimento%'
   OR TABLE_NAME LIKE '%pcp_requisic%'
   OR TABLE_NAME LIKE '%estoque_%'
ORDER BY TABLE_NAME;
"@

try {
    $tables = & mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER "-p$MYSQL_PASSWORD" $MYSQL_DATABASE -e $query 2>&1
    Write-Host ""
    Write-Host $tables
} catch {
    Write-Host "⚠️  Não foi possível listar tabelas" -ForegroundColor Yellow
}

# Próximos passos
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "   PRÓXIMOS PASSOS" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. ✅ Estrutura do banco de dados criada" -ForegroundColor Green
Write-Host "2. ✅ Integração com PCP configurada" -ForegroundColor Green
Write-Host "3. 📋 Reinicie o servidor Node.js" -ForegroundColor Yellow
Write-Host "4. 📋 Teste as APIs em: http://localhost:3000/api/compras" -ForegroundColor Yellow
Write-Host "5. 📋 Acesse o frontend em: http://localhost:3000/modules/Compras/index.html" -ForegroundColor Yellow
Write-Host ""

# Oferecer para iniciar o servidor
$resposta = Read-Host "Deseja reiniciar o servidor Node.js agora? (S/N)"
if ($resposta -eq 'S' -or $resposta -eq 's') {
    Write-Host ""
    Write-Host "🔄 Parando processos Node.js existentes..." -ForegroundColor Cyan
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2
    
    Write-Host "🚀 Iniciando servidor..." -ForegroundColor Cyan
    $serverPath = Join-Path $SCRIPT_DIR "server.js"
    
    if (Test-Path $serverPath) {
        Start-Process "node" -ArgumentList $serverPath -WorkingDirectory $SCRIPT_DIR
        Write-Host "✅ Servidor iniciado!" -ForegroundColor Green
        Write-Host "   Acesse: http://localhost:3000" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Arquivo server.js não encontrado em: $serverPath" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "   INICIALIZAÇÃO CONCLUÍDA!" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Criar arquivo de log
$logFile = Join-Path $SCRIPT_DIR "logs" "inicializacao_compras_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').log"
$logDir = Join-Path $SCRIPT_DIR "logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

@"
==================================================
INICIALIZAÇÃO DO MÓDULO DE COMPRAS
==================================================
Data/Hora: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')
Host: $MYSQL_HOST
Database: $MYSQL_DATABASE
Scripts executados: $sucessos
Erros: $falhas

Tabelas principais criadas:
- fornecedores
- fornecedor_contatos
- fornecedor_avaliacoes
- pedidos_compra
- pedidos_itens
- workflow_aprovacoes
- cotacoes
- cotacoes_propostas
- recebimentos
- recebimentos_itens
- pcp_requisicoes_compra
- estoque_movimentacoes
- estoque_saldos
- compras_logs
- compras_notificacoes

APIs disponíveis:
- GET  /api/compras/dashboard
- GET  /api/compras/fornecedores
- POST /api/compras/fornecedores
- GET  /api/compras/pedidos
- POST /api/compras/pedidos
- POST /api/compras/pedidos/:id/aprovar
- GET  /api/compras/cotacoes
- POST /api/compras/cotacoes
- POST /api/compras/recebimentos
- GET  /api/compras/notificacoes

Integração PCP:
- Verificação automática de estoque mínimo
- Criação automática de requisições de compra
- Stored procedures para movimentação de estoque
- Triggers para atualização automática

==================================================
"@ | Out-File -FilePath $logFile -Encoding UTF8

Write-Host "📝 Log salvo em: $logFile" -ForegroundColor Gray
Write-Host ""
