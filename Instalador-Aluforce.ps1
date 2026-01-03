# ============================================================================
# ALUFORCE ERP - Instalador Profissional v3.0
# Assistente de Instalacao com Interface Wizard - Tema Azul
# Suporte a download de arquivos do Google Drive
# ============================================================================

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Configuracoes globais
$script:ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $script:ScriptDir) { $script:ScriptDir = Get-Location }

$script:Config = @{
    MySQLPath = ""
    DBHost = "localhost"
    DBUser = "root"
    DBPass = ""
    DBName = "aluforce_vendas"
    DBPort = "3306"
    DumpFile = ""
    NodePath = ""
    ChromePath = ""
    # URLs do Google Drive (configure aqui os IDs dos arquivos)
    DriveFiles = @{
        "sistema" = ""  # ID do arquivo ZIP do sistema
        "database" = "" # ID do arquivo SQL do banco
    }
}

$script:CurrentStep = 0
$script:TotalSteps = 5
$script:Requirements = @{
    MySQL = $false
    MySQLConnection = $false
    Node = $false
    DumpFile = $false
    Chrome = $false
}

# ============================================================================
# CORES DO TEMA ALUFORCE (Azul/Ciano)
# ============================================================================
$script:Colors = @{
    Primary = [System.Drawing.Color]::FromArgb(255, 0, 150, 180)       # Ciano
    Secondary = [System.Drawing.Color]::FromArgb(255, 0, 180, 200)    # Ciano claro
    Dark = [System.Drawing.Color]::FromArgb(255, 20, 60, 100)         # Azul escuro
    Darker = [System.Drawing.Color]::FromArgb(255, 10, 40, 80)        # Azul mais escuro
    Light = [System.Drawing.Color]::FromArgb(255, 240, 250, 255)      # Azul muito claro
    White = [System.Drawing.Color]::White
    Success = [System.Drawing.Color]::FromArgb(255, 40, 180, 100)     # Verde
    Error = [System.Drawing.Color]::FromArgb(255, 220, 60, 60)        # Vermelho
    Warning = [System.Drawing.Color]::FromArgb(255, 255, 180, 0)      # Amarelo
    Text = [System.Drawing.Color]::FromArgb(255, 50, 50, 50)          # Texto escuro
    TextLight = [System.Drawing.Color]::FromArgb(255, 200, 220, 240)  # Texto claro
}

# ============================================================================
# FUNCOES AUXILIARES
# ============================================================================

function Get-EnvConfig {
    $envFile = Join-Path $script:ScriptDir ".env"
    if (Test-Path $envFile) {
        $content = Get-Content $envFile -Raw
        if ($content -match 'DB_HOST\s*=\s*(.+)') { $script:Config.DBHost = $matches[1].Trim() }
        if ($content -match 'DB_USER\s*=\s*(.+)') { $script:Config.DBUser = $matches[1].Trim() }
        if ($content -match 'DB_PASSWORD\s*=\s*(.+)') { $script:Config.DBPass = $matches[1].Trim() }
        if ($content -match 'DB_NAME\s*=\s*(.+)') { $script:Config.DBName = $matches[1].Trim() }
        if ($content -match 'DB_PORT\s*=\s*(.+)') { $script:Config.DBPort = $matches[1].Trim() }
        return $true
    }
    return $false
}

function Find-MySQLPath {
    $paths = @(
        "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe",
        "C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "C:\xampp\mysql\bin\mysql.exe",
        "C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysql.exe",
        "C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) { 
            $script:Config.MySQLPath = $p
            return $p 
        }
    }
    # Tentar via PATH
    try {
        $mysqlCmd = Get-Command mysql -ErrorAction SilentlyContinue
        if ($mysqlCmd) {
            $script:Config.MySQLPath = $mysqlCmd.Source
            return $mysqlCmd.Source
        }
    } catch {}
    return ""
}

function Find-NodePath {
    $paths = @(
        "C:\Program Files\nodejs\node.exe",
        "C:\Program Files (x86)\nodejs\node.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) { 
            $script:Config.NodePath = $p
            return $p 
        }
    }
    try {
        $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
        if ($nodeCmd) {
            $script:Config.NodePath = $nodeCmd.Source
            return $nodeCmd.Source
        }
    } catch {}
    return ""
}

function Find-ChromePath {
    $chromePaths = @(
        (Join-Path $script:ScriptDir "GoogleChromePortable\GoogleChromePortable.exe"),
        (Join-Path $script:ScriptDir "Chrome\GoogleChromePortable.exe"),
        "C:\Program Files\Google\Chrome\Application\chrome.exe",
        "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )
    foreach ($p in $chromePaths) {
        if (Test-Path $p) { 
            $script:Config.ChromePath = $p
            return $p 
        }
    }
    return ""
}

function Create-Shortcuts {
    try {
        $WshShell = New-Object -ComObject WScript.Shell
        
        # Caminhos dos atalhos
        $desktopPath = [Environment]::GetFolderPath("Desktop")
        $startMenuPath = Join-Path ([Environment]::GetFolderPath("Programs")) "ALUFORCE"
        
        # Criar pasta no Menu Iniciar
        if (-not (Test-Path $startMenuPath)) {
            New-Item -Path $startMenuPath -ItemType Directory -Force | Out-Null
        }
        
        # Definir icone (usar o icon.ico da pasta assets)
        $iconPath = Join-Path $script:ScriptDir "assets\icon.ico"
        if (-not (Test-Path $iconPath)) {
            $iconPath = Join-Path $script:ScriptDir "public\images\favicon.ico"
        }
        if (-not (Test-Path $iconPath)) {
            $iconPath = Join-Path $script:ScriptDir "public\Favicon.ico"
        }
        
        # Caminho do Electron
        $electronMain = Join-Path $script:ScriptDir "electron\main.js"
        $nodePath = $script:Config.NodePath
        
        # Criar script VBS invisivel para iniciar Electron sem janela CMD
        $launcherVbs = Join-Path $script:ScriptDir "Iniciar-Aluforce.vbs"
        $vbsContent = @"
' ALUFORCE - Launcher Invisivel
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Diretorio do sistema
strDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Verificar se Electron esta instalado
electronExe = strDir & "\node_modules\electron\dist\electron.exe"
electronMain = strDir & "\electron\main.js"

If fso.FileExists(electronExe) Then
    ' Usar Electron compilado
    WshShell.CurrentDirectory = strDir
    WshShell.Run """" & electronExe & """ """ & electronMain & """", 0, False
Else
    ' Usar npx electron
    WshShell.CurrentDirectory = strDir
    WshShell.Run "cmd /c npx electron """ & electronMain & """", 0, False
End If
"@
        Set-Content -Path $launcherVbs -Value $vbsContent -Encoding ASCII
        
        # Criar atalho na Area de Trabalho
        $desktopShortcut = Join-Path $desktopPath "ALUFORCE.lnk"
        $shortcut = $WshShell.CreateShortcut($desktopShortcut)
        $shortcut.TargetPath = "wscript.exe"
        $shortcut.Arguments = "`"$launcherVbs`""
        $shortcut.WorkingDirectory = $script:ScriptDir
        $shortcut.Description = "ALUFORCE - Sistema de Gestao Empresarial"
        $shortcut.WindowStyle = 1  # Normal
        if (Test-Path $iconPath) {
            $shortcut.IconLocation = "$iconPath,0"
        }
        $shortcut.Save()
        
        # Criar atalho no Menu Iniciar
        $startMenuShortcut = Join-Path $startMenuPath "ALUFORCE.lnk"
        $shortcut2 = $WshShell.CreateShortcut($startMenuShortcut)
        $shortcut2.TargetPath = "wscript.exe"
        $shortcut2.Arguments = "`"$launcherVbs`""
        $shortcut2.WorkingDirectory = $script:ScriptDir
        $shortcut2.Description = "ALUFORCE - Sistema de Gestao Empresarial"
        $shortcut2.WindowStyle = 1
        if (Test-Path $iconPath) {
            $shortcut2.IconLocation = "$iconPath,0"
        }
        $shortcut2.Save()
        
        # Criar atalho para Desinstalar
        $uninstallShortcut = Join-Path $startMenuPath "Desinstalar Aluforce.lnk"
        $shortcut3 = $WshShell.CreateShortcut($uninstallShortcut)
        $shortcut3.TargetPath = "powershell.exe"
        $shortcut3.Arguments = "-ExecutionPolicy Bypass -Command `"Remove-Item '$desktopShortcut' -Force -ErrorAction SilentlyContinue; Remove-Item '$startMenuPath' -Recurse -Force -ErrorAction SilentlyContinue; Write-Host 'Atalhos removidos!'; Start-Sleep 2`""
        $shortcut3.Description = "Remover atalhos do Aluforce ERP"
        $shortcut3.Save()
        
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($WshShell) | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Find-DumpFile {
    $dumpPaths = @(
        (Join-Path $script:ScriptDir "database\aluforce_vendas_dump_2025-12-18.sql"),
        (Join-Path $script:ScriptDir "database\aluforce_vendas_dump.sql"),
        (Join-Path $script:ScriptDir "aluforce_vendas_dump.sql"),
        (Join-Path $script:ScriptDir "database\backup.sql")
    )
    foreach ($p in $dumpPaths) {
        if (Test-Path $p) { 
            $script:Config.DumpFile = $p
            return $p 
        }
    }
    # Buscar qualquer .sql na pasta database
    $dbFolder = Join-Path $script:ScriptDir "database"
    if (Test-Path $dbFolder) {
        $sqlFiles = Get-ChildItem $dbFolder -Filter "*.sql" -ErrorAction SilentlyContinue | 
                    Where-Object { $_.Length -gt 1000 } |
                    Sort-Object LastWriteTime -Descending
        if ($sqlFiles.Count -gt 0) { 
            $script:Config.DumpFile = $sqlFiles[0].FullName
            return $sqlFiles[0].FullName 
        }
    }
    return ""
}

function Test-MySQLConnection {
    $mysqlExe = $script:Config.MySQLPath
    $user = $script:Config.DBUser
    $pass = $script:Config.DBPass
    $dbHost = $script:Config.DBHost
    $port = $script:Config.DBPort
    
    if (-not $mysqlExe -or -not (Test-Path $mysqlExe)) { return $false }
    
    try {
        $result = & $mysqlExe -u $user -p"$pass" -h $dbHost -P $port -e "SELECT 1 as test" 2>&1
        $resultStr = $result | Out-String
        return ($resultStr -match "1" -or $LASTEXITCODE -eq 0)
    } catch { 
        return $false 
    }
}

function Test-DatabaseExists {
    $mysqlExe = $script:Config.MySQLPath
    $user = $script:Config.DBUser
    $pass = $script:Config.DBPass
    $dbHost = $script:Config.DBHost
    $port = $script:Config.DBPort
    $dbName = $script:Config.DBName
    
    try {
        $result = & $mysqlExe -u $user -p"$pass" -h $dbHost -P $port -N -s -e "SHOW DATABASES LIKE '$dbName'" 2>&1
        $resultStr = $result | Out-String
        return ($resultStr -match $dbName)
    } catch { 
        return $false 
    }
}

function Get-TableCount {
    $mysqlExe = $script:Config.MySQLPath
    $user = $script:Config.DBUser
    $pass = $script:Config.DBPass
    $dbHost = $script:Config.DBHost
    $port = $script:Config.DBPort
    $dbName = $script:Config.DBName
    
    try {
        $query = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '$dbName'"
        $result = & $mysqlExe -u $user -p"$pass" -h $dbHost -P $port -N -s -e $query 2>&1
        $resultStr = $result | Out-String
        if ($resultStr -match '(\d+)') { 
            return [int]$matches[1] 
        }
        return 0
    } catch { 
        return 0 
    }
}

function Import-Database {
    param([string]$dumpFile)
    
    $mysqlExe = $script:Config.MySQLPath
    $user = $script:Config.DBUser
    $pass = $script:Config.DBPass
    $dbHost = $script:Config.DBHost
    $port = $script:Config.DBPort
    $dbName = $script:Config.DBName
    
    try {
        # Criar banco
        & $mysqlExe -u $user -p"$pass" -h $dbHost -P $port -e "CREATE DATABASE IF NOT EXISTS ``$dbName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" 2>&1 | Out-Null
        
        # Importar dump usando source ou input
        $content = Get-Content $dumpFile -Raw -Encoding UTF8
        $tempFile = Join-Path $env:TEMP "aluforce_import.sql"
        $content | Set-Content $tempFile -Encoding UTF8
        
        $importResult = & $mysqlExe -u $user -p"$pass" -h $dbHost -P $port $dbName -e "source $tempFile" 2>&1
        
        Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
        return $true
    } catch { 
        return $false 
    }
}

function Download-FromGoogleDrive {
    param(
        [string]$FileId,
        [string]$OutputPath,
        [System.Windows.Forms.ProgressBar]$Progress,
        [System.Windows.Forms.Label]$StatusLabel
    )
    
    try {
        $StatusLabel.Text = "Preparando download..."
        [System.Windows.Forms.Application]::DoEvents()
        
        # URL de download direto do Google Drive
        $downloadUrl = "https://drive.google.com/uc?export=download&id=$FileId"
        
        $webClient = New-Object System.Net.WebClient
        
        # Adicionar evento de progresso
        $webClient.add_DownloadProgressChanged({
            param($sender, $e)
            $Progress.Value = $e.ProgressPercentage
            $StatusLabel.Text = "Baixando... $($e.ProgressPercentage)%"
            [System.Windows.Forms.Application]::DoEvents()
        })
        
        $StatusLabel.Text = "Baixando arquivo..."
        [System.Windows.Forms.Application]::DoEvents()
        
        # Download sincrono para arquivos pequenos
        $webClient.DownloadFile($downloadUrl, $OutputPath)
        
        $Progress.Value = 100
        $StatusLabel.Text = "Download concluido!"
        [System.Windows.Forms.Application]::DoEvents()
        
        return $true
    } catch {
        $StatusLabel.Text = "Erro no download: $($_.Exception.Message)"
        return $false
    }
}

# ============================================================================
# INTERFACE WIZARD
# ============================================================================

function Show-InstallerWizard {
    
    # Janela principal
    $form = New-Object System.Windows.Forms.Form
    $form.Text = "Instalacao do ALUFORCE"
    $form.Size = New-Object System.Drawing.Size(750, 520)
    $form.StartPosition = "CenterScreen"
    $form.FormBorderStyle = "FixedDialog"
    $form.MaximizeBox = $false
    $form.BackColor = $script:Colors.White
    $form.Font = New-Object System.Drawing.Font("Segoe UI", 9)

    # ========================================
    # PAINEL LATERAL ESQUERDO (Gradiente Azul)
    # ========================================
    $panelLeft = New-Object System.Windows.Forms.Panel
    $panelLeft.Size = New-Object System.Drawing.Size(200, 520)
    $panelLeft.Location = New-Object System.Drawing.Point(0, 0)
    $form.Controls.Add($panelLeft)
    
    # Desenhar gradiente no painel lateral
    $panelLeft.Add_Paint({
        param($sender, $e)
        $rect = $sender.ClientRectangle
        $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            $rect,
            $script:Colors.Secondary,  # Ciano no topo
            $script:Colors.Dark,       # Azul escuro embaixo
            [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
        )
        $e.Graphics.FillRectangle($brush, $rect)
        $brush.Dispose()
    })

    # Logo real da Aluforce
    $logoPath = Join-Path $script:ScriptDir "public\images\Logo Monocromatico - Branco - Aluforce.png"
    if (-not (Test-Path $logoPath)) {
        $logoPath = Join-Path $script:ScriptDir "modules\RH\public\Logo Monocromatico - Branco - Aluforce.png"
    }
    if (-not (Test-Path $logoPath)) {
        $logoPath = Join-Path $script:ScriptDir "backup_old_images\Logo Monocromatico - Branco - Aluforce copy.png"
    }
    
    if (Test-Path $logoPath) {
        $picLogo = New-Object System.Windows.Forms.PictureBox
        $picLogo.Size = New-Object System.Drawing.Size(150, 150)
        $picLogo.Location = New-Object System.Drawing.Point(25, 50)
        $picLogo.SizeMode = [System.Windows.Forms.PictureBoxSizeMode]::Zoom
        $picLogo.BackColor = [System.Drawing.Color]::Transparent
        try {
            $picLogo.Image = [System.Drawing.Image]::FromFile($logoPath)
        } catch {}
        $panelLeft.Controls.Add($picLogo)
    } else {
        # Fallback: desenhar circulo se logo nao encontrado
        $panelLogo = New-Object System.Windows.Forms.Panel
        $panelLogo.Size = New-Object System.Drawing.Size(80, 80)
        $panelLogo.Location = New-Object System.Drawing.Point(60, 80)
        $panelLogo.BackColor = [System.Drawing.Color]::Transparent
        $panelLeft.Controls.Add($panelLogo)
        
        $panelLogo.Add_Paint({
            param($sender, $e)
            $e.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
            $e.Graphics.FillEllipse([System.Drawing.Brushes]::White, 0, 0, 78, 78)
            $pen = New-Object System.Drawing.Pen($script:Colors.Secondary, 3)
            $e.Graphics.DrawEllipse($pen, 10, 10, 58, 58)
            $pen.Dispose()
        })
    }

    # Logo/Titulo ALUFORCE
    $lblLogo = New-Object System.Windows.Forms.Label
    $lblLogo.Text = "ALUFORCE"
    $lblLogo.Font = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
    $lblLogo.ForeColor = $script:Colors.White
    $lblLogo.BackColor = [System.Drawing.Color]::Transparent
    $lblLogo.AutoSize = $false
    $lblLogo.Size = New-Object System.Drawing.Size(200, 40)
    $lblLogo.Location = New-Object System.Drawing.Point(0, 210)
    $lblLogo.TextAlign = "MiddleCenter"
    $panelLeft.Controls.Add($lblLogo)

    $lblSubtitle = New-Object System.Windows.Forms.Label
    $lblSubtitle.Text = "CABOS DE ALUMINIO"
    $lblSubtitle.Font = New-Object System.Drawing.Font("Segoe UI", 8)
    $lblSubtitle.ForeColor = $script:Colors.TextLight
    $lblSubtitle.BackColor = [System.Drawing.Color]::Transparent
    $lblSubtitle.AutoSize = $false
    $lblSubtitle.Size = New-Object System.Drawing.Size(200, 20)
    $lblSubtitle.Location = New-Object System.Drawing.Point(0, 218)
    $lblSubtitle.TextAlign = "MiddleCenter"
    $panelLeft.Controls.Add($lblSubtitle)

    # Versao
    $lblVersion = New-Object System.Windows.Forms.Label
    $lblVersion.Text = "ERP System v11.12"
    $lblVersion.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $lblVersion.ForeColor = $script:Colors.TextLight
    $lblVersion.BackColor = [System.Drawing.Color]::Transparent
    $lblVersion.AutoSize = $false
    $lblVersion.Size = New-Object System.Drawing.Size(200, 25)
    $lblVersion.Location = New-Object System.Drawing.Point(0, 440)
    $lblVersion.TextAlign = "MiddleCenter"
    $panelLeft.Controls.Add($lblVersion)

    # ========================================
    # PAINEL DE CONTEUDO (Direita)
    # ========================================
    $panelContent = New-Object System.Windows.Forms.Panel
    $panelContent.Size = New-Object System.Drawing.Size(530, 400)
    $panelContent.Location = New-Object System.Drawing.Point(210, 10)
    $panelContent.BackColor = $script:Colors.White
    $form.Controls.Add($panelContent)

    # Titulo da pagina
    $lblTitle = New-Object System.Windows.Forms.Label
    $lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
    $lblTitle.ForeColor = $script:Colors.Dark
    $lblTitle.AutoSize = $false
    $lblTitle.Size = New-Object System.Drawing.Size(500, 45)
    $lblTitle.Location = New-Object System.Drawing.Point(10, 10)
    $panelContent.Controls.Add($lblTitle)

    # Descricao
    $lblDesc = New-Object System.Windows.Forms.Label
    $lblDesc.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $lblDesc.ForeColor = $script:Colors.Text
    $lblDesc.AutoSize = $false
    $lblDesc.Size = New-Object System.Drawing.Size(500, 50)
    $lblDesc.Location = New-Object System.Drawing.Point(10, 55)
    $panelContent.Controls.Add($lblDesc)

    # Area dinamica
    $panelDynamic = New-Object System.Windows.Forms.Panel
    $panelDynamic.Size = New-Object System.Drawing.Size(510, 260)
    $panelDynamic.Location = New-Object System.Drawing.Point(10, 110)
    $panelDynamic.BackColor = $script:Colors.White
    $panelContent.Controls.Add($panelDynamic)

    # Barra de progresso
    $progressBar = New-Object System.Windows.Forms.ProgressBar
    $progressBar.Size = New-Object System.Drawing.Size(510, 10)
    $progressBar.Location = New-Object System.Drawing.Point(10, 380)
    $progressBar.Style = "Continuous"
    $progressBar.Minimum = 0
    $progressBar.Maximum = 100
    $panelContent.Controls.Add($progressBar)

    # ========================================
    # PAINEL DE BOTOES
    # ========================================
    $panelButtons = New-Object System.Windows.Forms.Panel
    $panelButtons.Size = New-Object System.Drawing.Size(530, 55)
    $panelButtons.Location = New-Object System.Drawing.Point(210, 420)
    $panelButtons.BackColor = [System.Drawing.Color]::FromArgb(255, 245, 248, 250)
    $form.Controls.Add($panelButtons)

    # Botao Voltar
    $btnBack = New-Object System.Windows.Forms.Button
    $btnBack.Text = "Voltar"
    $btnBack.Size = New-Object System.Drawing.Size(100, 38)
    $btnBack.Location = New-Object System.Drawing.Point(200, 8)
    $btnBack.FlatStyle = "Flat"
    $btnBack.BackColor = [System.Drawing.Color]::FromArgb(255, 230, 235, 240)
    $btnBack.ForeColor = $script:Colors.Text
    $btnBack.Enabled = $false
    $btnBack.Cursor = [System.Windows.Forms.Cursors]::Hand
    $panelButtons.Controls.Add($btnBack)

    # Botao Avancar
    $btnNext = New-Object System.Windows.Forms.Button
    $btnNext.Text = "Avancar"
    $btnNext.Size = New-Object System.Drawing.Size(100, 38)
    $btnNext.Location = New-Object System.Drawing.Point(310, 8)
    $btnNext.FlatStyle = "Flat"
    $btnNext.BackColor = $script:Colors.Secondary
    $btnNext.ForeColor = $script:Colors.White
    $btnNext.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
    $btnNext.Cursor = [System.Windows.Forms.Cursors]::Hand
    $panelButtons.Controls.Add($btnNext)

    # Botao Cancelar
    $btnCancel = New-Object System.Windows.Forms.Button
    $btnCancel.Text = "Cancelar"
    $btnCancel.Size = New-Object System.Drawing.Size(100, 38)
    $btnCancel.Location = New-Object System.Drawing.Point(420, 8)
    $btnCancel.FlatStyle = "Flat"
    $btnCancel.BackColor = [System.Drawing.Color]::FromArgb(255, 230, 235, 240)
    $btnCancel.ForeColor = $script:Colors.Text
    $btnCancel.Cursor = [System.Windows.Forms.Cursors]::Hand
    $panelButtons.Controls.Add($btnCancel)

    # ========================================
    # FUNCOES DE PAGINAS
    # ========================================
    
    function Clear-DynamicPanel {
        $panelDynamic.Controls.Clear()
    }

    # PAGINA 1: Boas-vindas e Credenciais
    function Show-WelcomePage {
        Clear-DynamicPanel
        $lblTitle.Text = "Bem-vindo ao Assistente de Instalacao"
        $lblDesc.Text = "Configure as credenciais do MySQL e clique em Avancar."
        
        # Carregar config do .env
        Get-EnvConfig | Out-Null
        
        $lblInfo = New-Object System.Windows.Forms.Label
        $lblInfo.Text = "Informe as credenciais do MySQL para continuar:"
        $lblInfo.Font = New-Object System.Drawing.Font("Segoe UI", 10)
        $lblInfo.AutoSize = $true
        $lblInfo.Location = New-Object System.Drawing.Point(10, 10)
        $panelDynamic.Controls.Add($lblInfo)
        
        # Usuario
        $lblUser = New-Object System.Windows.Forms.Label
        $lblUser.Text = "Usuario MySQL:"
        $lblUser.Location = New-Object System.Drawing.Point(10, 50)
        $lblUser.AutoSize = $true
        $panelDynamic.Controls.Add($lblUser)
        
        $script:txtDBUser = New-Object System.Windows.Forms.TextBox
        $script:txtDBUser.Size = New-Object System.Drawing.Size(200, 25)
        $script:txtDBUser.Location = New-Object System.Drawing.Point(140, 47)
        $script:txtDBUser.Text = $script:Config.DBUser
        $panelDynamic.Controls.Add($script:txtDBUser)
        
        # Senha
        $lblPass = New-Object System.Windows.Forms.Label
        $lblPass.Text = "Senha MySQL:"
        $lblPass.Location = New-Object System.Drawing.Point(10, 85)
        $lblPass.AutoSize = $true
        $panelDynamic.Controls.Add($lblPass)
        
        $script:txtDBPass = New-Object System.Windows.Forms.TextBox
        $script:txtDBPass.Size = New-Object System.Drawing.Size(200, 25)
        $script:txtDBPass.Location = New-Object System.Drawing.Point(140, 82)
        $script:txtDBPass.UseSystemPasswordChar = $true
        $script:txtDBPass.Text = $script:Config.DBPass
        $panelDynamic.Controls.Add($script:txtDBPass)
        
        # Host
        $lblHost = New-Object System.Windows.Forms.Label
        $lblHost.Text = "Host:"
        $lblHost.Location = New-Object System.Drawing.Point(10, 120)
        $lblHost.AutoSize = $true
        $panelDynamic.Controls.Add($lblHost)
        
        $script:txtDBHostField = New-Object System.Windows.Forms.TextBox
        $script:txtDBHostField.Size = New-Object System.Drawing.Size(200, 25)
        $script:txtDBHostField.Location = New-Object System.Drawing.Point(140, 117)
        $script:txtDBHostField.Text = $script:Config.DBHost
        $panelDynamic.Controls.Add($script:txtDBHostField)
        
        # Porta
        $lblPort = New-Object System.Windows.Forms.Label
        $lblPort.Text = "Porta:"
        $lblPort.Location = New-Object System.Drawing.Point(360, 120)
        $lblPort.AutoSize = $true
        $panelDynamic.Controls.Add($lblPort)
        
        $script:txtDBPort = New-Object System.Windows.Forms.TextBox
        $script:txtDBPort.Size = New-Object System.Drawing.Size(80, 25)
        $script:txtDBPort.Location = New-Object System.Drawing.Point(410, 117)
        $script:txtDBPort.Text = $script:Config.DBPort
        $panelDynamic.Controls.Add($script:txtDBPort)
        
        # Nome do banco
        $lblName = New-Object System.Windows.Forms.Label
        $lblName.Text = "Nome do Banco:"
        $lblName.Location = New-Object System.Drawing.Point(10, 155)
        $lblName.AutoSize = $true
        $panelDynamic.Controls.Add($lblName)
        
        $script:txtDBName = New-Object System.Windows.Forms.TextBox
        $script:txtDBName.Size = New-Object System.Drawing.Size(200, 25)
        $script:txtDBName.Location = New-Object System.Drawing.Point(140, 152)
        $script:txtDBName.Text = $script:Config.DBName
        $panelDynamic.Controls.Add($script:txtDBName)
        
        # Aviso
        $lblAviso = New-Object System.Windows.Forms.Label
        $lblAviso.Text = "Certifique-se de que o MySQL Server esta instalado e em execucao."
        $lblAviso.Font = New-Object System.Drawing.Font("Segoe UI", 9)
        $lblAviso.ForeColor = [System.Drawing.Color]::Gray
        $lblAviso.Location = New-Object System.Drawing.Point(10, 200)
        $lblAviso.AutoSize = $true
        $panelDynamic.Controls.Add($lblAviso)
        
        $btnBack.Enabled = $false
        $btnNext.Text = "Avancar"
        $btnNext.Enabled = $true
        $progressBar.Value = 0
    }

    # PAGINA 2: Verificacao de Requisitos
    function Show-RequirementsPage {
        Clear-DynamicPanel
        $lblTitle.Text = "Verificando Requisitos"
        $lblDesc.Text = "Aguarde enquanto o assistente verifica os requisitos do sistema."
        
        $btnBack.Enabled = $true
        $btnNext.Enabled = $false
        $btnNext.Text = "Avancar"
        $progressBar.Value = 20
        
        # Carregar configuracoes
        Get-EnvConfig | Out-Null
        
        $yPos = 5
        $allOk = $true
        
        # Funcao para criar linha de status
        function Add-StatusLine {
            param(
                [string]$text, 
                [bool]$ok, 
                [string]$detail = "",
                [bool]$isOptional = $false
            )
            
            $pnl = New-Object System.Windows.Forms.Panel
            $pnl.Size = New-Object System.Drawing.Size(490, 45)
            $pnl.Location = New-Object System.Drawing.Point(5, $script:yPos)
            $pnl.BackColor = if ($ok) { 
                [System.Drawing.Color]::FromArgb(255, 240, 255, 245) 
            } elseif ($isOptional) {
                [System.Drawing.Color]::FromArgb(255, 255, 250, 240)
            } else { 
                [System.Drawing.Color]::FromArgb(255, 255, 245, 245) 
            }
            
            # Icone de status
            $icon = New-Object System.Windows.Forms.Label
            if ($ok) {
                $icon.Text = "[OK]"
                $icon.ForeColor = $script:Colors.Success
            } elseif ($isOptional) {
                $icon.Text = "[--]"
                $icon.ForeColor = $script:Colors.Warning
            } else {
                $icon.Text = "[X]"
                $icon.ForeColor = $script:Colors.Error
            }
            $icon.Font = New-Object System.Drawing.Font("Consolas", 10, [System.Drawing.FontStyle]::Bold)
            $icon.AutoSize = $true
            $icon.Location = New-Object System.Drawing.Point(8, 5)
            $pnl.Controls.Add($icon)
            
            # Texto principal
            $lbl = New-Object System.Windows.Forms.Label
            $lbl.Text = $text
            $lbl.Font = New-Object System.Drawing.Font("Segoe UI", 10)
            $lbl.ForeColor = $script:Colors.Text
            $lbl.AutoSize = $true
            $lbl.Location = New-Object System.Drawing.Point(55, 5)
            $pnl.Controls.Add($lbl)
            
            # Detalhe
            if ($detail -ne "") {
                $lblDetail = New-Object System.Windows.Forms.Label
                $lblDetail.Text = $detail
                $lblDetail.Font = New-Object System.Drawing.Font("Segoe UI", 8)
                $lblDetail.ForeColor = [System.Drawing.Color]::Gray
                $lblDetail.AutoSize = $true
                $lblDetail.Location = New-Object System.Drawing.Point(55, 25)
                $pnl.Controls.Add($lblDetail)
            }
            
            $panelDynamic.Controls.Add($pnl)
            $script:yPos += 48
            
            return $ok -or $isOptional
        }
        
        $script:yPos = $yPos
        [System.Windows.Forms.Application]::DoEvents()
        
        # 1. Verificar MySQL
        $lblTitle.Text = "Verificando Requisitos"
        [System.Windows.Forms.Application]::DoEvents()
        
        $mysqlPath = Find-MySQLPath
        $mysqlOk = $mysqlPath -ne ""
        $mysqlDetail = if ($mysqlOk) { $mysqlPath } else { "MySQL Server nao encontrado no sistema" }
        $script:Requirements.MySQL = $mysqlOk
        if (-not (Add-StatusLine "MySQL Server" $mysqlOk $mysqlDetail)) { $allOk = $false }
        [System.Windows.Forms.Application]::DoEvents()
        
        # 2. Verificar conexao MySQL
        if ($mysqlOk) {
            $connOk = Test-MySQLConnection
            $connDetail = if ($connOk) { 
                "Conectado como $($script:Config.DBUser)@$($script:Config.DBHost)" 
            } else { 
                "Falha na conexao - verifique credenciais no .env" 
            }
            $script:Requirements.MySQLConnection = $connOk
            if (-not (Add-StatusLine "Conexao MySQL" $connOk $connDetail)) { $allOk = $false }
        } else {
            $script:Requirements.MySQLConnection = $false
            Add-StatusLine "Conexao MySQL" $false "Instale o MySQL Server primeiro" | Out-Null
            $allOk = $false
        }
        [System.Windows.Forms.Application]::DoEvents()
        
        # 3. Verificar Node.js
        $nodePath = Find-NodePath
        $nodeOk = $nodePath -ne ""
        $nodeDetail = if ($nodeOk) { $nodePath } else { "Node.js nao encontrado - baixe em nodejs.org" }
        $script:Requirements.Node = $nodeOk
        if (-not (Add-StatusLine "Node.js" $nodeOk $nodeDetail)) { $allOk = $false }
        [System.Windows.Forms.Application]::DoEvents()
        
        # 4. Verificar arquivo dump
        $dumpPath = Find-DumpFile
        $dumpOk = $dumpPath -ne ""
        $dumpDetail = if ($dumpOk) { 
            [System.IO.Path]::GetFileName($dumpPath) 
        } else { 
            "Arquivo SQL do banco nao encontrado" 
        }
        $script:Requirements.DumpFile = $dumpOk
        if (-not (Add-StatusLine "Arquivo de Banco" $dumpOk $dumpDetail)) { $allOk = $false }
        [System.Windows.Forms.Application]::DoEvents()
        
        # 5. Verificar Chrome (opcional)
        $chromePath = Find-ChromePath
        $chromeOk = $chromePath -ne ""
        $chromeDetail = if ($chromeOk) { 
            [System.IO.Path]::GetFileName($chromePath) 
        } else { 
            "Navegador padrao sera usado (opcional)" 
        }
        $script:Requirements.Chrome = $chromeOk
        Add-StatusLine "Navegador Chrome" $chromeOk $chromeDetail $true | Out-Null
        [System.Windows.Forms.Application]::DoEvents()
        
        $progressBar.Value = 40
        
        if ($allOk) {
            $btnNext.Enabled = $true
        } else {
            $lblError = New-Object System.Windows.Forms.Label
            $lblError.Text = "Corrija os problemas indicados antes de continuar."
            $lblError.ForeColor = $script:Colors.Error
            $lblError.Font = New-Object System.Drawing.Font("Segoe UI", 9)
            $lblError.AutoSize = $true
            $lblError.Location = New-Object System.Drawing.Point(10, 240)
            $panelDynamic.Controls.Add($lblError)
        }
    }

    # PAGINA 3: Configuracao do Banco
    function Show-DatabasePage {
        Clear-DynamicPanel
        $lblTitle.Text = "Configuracao do Banco de Dados"
        $lblDesc.Text = "Configure como o banco de dados sera instalado."
        
        $btnBack.Enabled = $true
        $btnNext.Text = "Instalar"
        $btnNext.Enabled = $true
        $progressBar.Value = 50
        
        # Verificar se banco existe
        $dbExists = Test-DatabaseExists
        
        if ($dbExists) {
            $tableCount = Get-TableCount
            
            $lblWarning = New-Object System.Windows.Forms.Label
            $lblWarning.Text = "Banco de dados existente detectado!"
            $lblWarning.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
            $lblWarning.ForeColor = $script:Colors.Warning
            $lblWarning.AutoSize = $true
            $lblWarning.Location = New-Object System.Drawing.Point(10, 10)
            $panelDynamic.Controls.Add($lblWarning)
            
            $lblDbInfo = New-Object System.Windows.Forms.Label
            $lblDbInfo.Text = "O banco '$($script:Config.DBName)' ja existe com $tableCount tabelas."
            $lblDbInfo.Font = New-Object System.Drawing.Font("Segoe UI", 10)
            $lblDbInfo.AutoSize = $true
            $lblDbInfo.Location = New-Object System.Drawing.Point(10, 40)
            $panelDynamic.Controls.Add($lblDbInfo)
            
            $lblQuestion = New-Object System.Windows.Forms.Label
            $lblQuestion.Text = "O que deseja fazer?"
            $lblQuestion.Font = New-Object System.Drawing.Font("Segoe UI", 10)
            $lblQuestion.AutoSize = $true
            $lblQuestion.Location = New-Object System.Drawing.Point(10, 80)
            $panelDynamic.Controls.Add($lblQuestion)
            
            $script:radioKeep = New-Object System.Windows.Forms.RadioButton
            $script:radioKeep.Text = "Manter banco existente (recomendado)"
            $script:radioKeep.Font = New-Object System.Drawing.Font("Segoe UI", 10)
            $script:radioKeep.AutoSize = $true
            $script:radioKeep.Location = New-Object System.Drawing.Point(30, 115)
            $script:radioKeep.Checked = $true
            $script:radioKeep.ForeColor = $script:Colors.Success
            $panelDynamic.Controls.Add($script:radioKeep)
            
            $script:radioReplace = New-Object System.Windows.Forms.RadioButton
            $script:radioReplace.Text = "Substituir banco (TODOS OS DADOS SERAO PERDIDOS!)"
            $script:radioReplace.Font = New-Object System.Drawing.Font("Segoe UI", 10)
            $script:radioReplace.ForeColor = $script:Colors.Error
            $script:radioReplace.AutoSize = $true
            $script:radioReplace.Location = New-Object System.Drawing.Point(30, 145)
            $panelDynamic.Controls.Add($script:radioReplace)
            
        } else {
            $lblInfo = New-Object System.Windows.Forms.Label
            $lblInfo.Text = "O banco de dados '$($script:Config.DBName)' sera criado.`n`nArquivo de importacao:`n$($script:Config.DumpFile)"
            $lblInfo.Font = New-Object System.Drawing.Font("Segoe UI", 10)
            $lblInfo.AutoSize = $false
            $lblInfo.Size = New-Object System.Drawing.Size(480, 120)
            $lblInfo.Location = New-Object System.Drawing.Point(10, 20)
            $panelDynamic.Controls.Add($lblInfo)
            
            $script:radioKeep = $null
            $script:radioReplace = $null
        }
    }

    # PAGINA 4: Instalacao
    function Show-InstallPage {
        Clear-DynamicPanel
        $lblTitle.Text = "Instalando..."
        $lblDesc.Text = "Aguarde enquanto o sistema e instalado."
        
        $btnBack.Enabled = $false
        $btnNext.Enabled = $false
        $btnCancel.Enabled = $false
        $progressBar.Value = 60
        
        $txtLog = New-Object System.Windows.Forms.TextBox
        $txtLog.Multiline = $true
        $txtLog.ReadOnly = $true
        $txtLog.ScrollBars = "Vertical"
        $txtLog.Size = New-Object System.Drawing.Size(490, 220)
        $txtLog.Location = New-Object System.Drawing.Point(5, 5)
        $txtLog.Font = New-Object System.Drawing.Font("Consolas", 9)
        $txtLog.BackColor = [System.Drawing.Color]::FromArgb(255, 250, 252, 255)
        $panelDynamic.Controls.Add($txtLog)
        
        $form.Refresh()
        
        function Add-Log {
            param([string]$msg)
            $txtLog.AppendText("$msg`r`n")
            $txtLog.SelectionStart = $txtLog.Text.Length
            $txtLog.ScrollToCaret()
            [System.Windows.Forms.Application]::DoEvents()
        }
        
        Add-Log "=== Iniciando instalacao do Aluforce ERP ==="
        Add-Log ""
        
        # Verificar se deve importar banco
        $shouldImport = $true
        if ($script:radioKeep -ne $null -and $script:radioKeep.Checked) {
            $shouldImport = $false
            Add-Log "[OK] Mantendo banco de dados existente."
        }
        
        if ($shouldImport -and $script:Config.DumpFile -ne "") {
            Add-Log "[...] Importando banco de dados..."
            Add-Log "     Arquivo: $([System.IO.Path]::GetFileName($script:Config.DumpFile))"
            $progressBar.Value = 70
            [System.Windows.Forms.Application]::DoEvents()
            
            $importOk = Import-Database $script:Config.DumpFile
            
            if ($importOk) {
                $tableCount = Get-TableCount
                Add-Log "[OK] Banco importado com sucesso! ($tableCount tabelas)"
            } else {
                Add-Log "[ERRO] Falha ao importar banco de dados!"
            }
        }
        
        $progressBar.Value = 80
        Add-Log ""
        Add-Log "[...] Verificando dependencias npm..."
        
        # Verificar node_modules
        $nodeModulesPath = Join-Path $script:ScriptDir "node_modules"
        if (-not (Test-Path $nodeModulesPath)) {
            Add-Log "[...] Instalando dependencias npm (pode demorar)..."
            [System.Windows.Forms.Application]::DoEvents()
            
            $npmPath = Join-Path (Split-Path $script:Config.NodePath) "npm.cmd"
            if (Test-Path $npmPath) {
                Push-Location $script:ScriptDir
                try {
                    $npmResult = & $npmPath install 2>&1
                    Add-Log "[OK] Dependencias instaladas."
                } catch {
                    Add-Log "[AVISO] Erro ao instalar dependencias."
                }
                Pop-Location
            }
        } else {
            Add-Log "[OK] Dependencias ja instaladas."
        }
        
        $progressBar.Value = 90
        Add-Log ""
        Add-Log "[...] Criando atalhos..."
        
        # Criar atalhos
        $shortcutsCreated = Create-Shortcuts
        if ($shortcutsCreated) {
            Add-Log "[OK] Atalhos criados na Area de Trabalho e Menu Iniciar."
        } else {
            Add-Log "[AVISO] Nao foi possivel criar atalhos."
        }
        
        $progressBar.Value = 100
        Add-Log ""
        Add-Log "============================================"
        Add-Log "   INSTALACAO CONCLUIDA COM SUCESSO!"
        Add-Log "============================================"
        
        $btnNext.Text = "Concluir"
        $btnNext.Enabled = $true
        $btnCancel.Enabled = $true
        $script:CurrentStep = 4
    }

    # PAGINA 5: Conclusao
    function Show-CompletePage {
        Clear-DynamicPanel
        $lblTitle.Text = "Instalacao Concluida!"
        $lblDesc.Text = "O ALUFORCE foi instalado com sucesso no seu computador."
        
        $btnBack.Enabled = $false
        $btnNext.Text = "Iniciar Sistema"
        $btnCancel.Text = "Fechar"
        
        $lblSuccess = New-Object System.Windows.Forms.Label
        $lblSuccess.Text = "O sistema esta pronto para uso!"
        $lblSuccess.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
        $lblSuccess.ForeColor = $script:Colors.Success
        $lblSuccess.AutoSize = $true
        $lblSuccess.Location = New-Object System.Drawing.Point(10, 20)
        $panelDynamic.Controls.Add($lblSuccess)
        
        $script:chkStartNow = New-Object System.Windows.Forms.CheckBox
        $script:chkStartNow.Text = "Iniciar o ALUFORCE agora"
        $script:chkStartNow.Font = New-Object System.Drawing.Font("Segoe UI", 11)
        $script:chkStartNow.AutoSize = $true
        $script:chkStartNow.Location = New-Object System.Drawing.Point(10, 70)
        $script:chkStartNow.Checked = $true
        $panelDynamic.Controls.Add($script:chkStartNow)
        
        $lblInfo = New-Object System.Windows.Forms.Label
        $lblInfo.Text = "Ao iniciar, o servidor Node.js sera executado e o`nnavegador abrira automaticamente no endereco:`n`n   http://localhost:3000`n`nCredenciais padrao:`n   Usuario: admin`n   Senha: admin123"
        $lblInfo.Font = New-Object System.Drawing.Font("Segoe UI", 10)
        $lblInfo.AutoSize = $false
        $lblInfo.Size = New-Object System.Drawing.Size(480, 160)
        $lblInfo.Location = New-Object System.Drawing.Point(10, 110)
        $panelDynamic.Controls.Add($lblInfo)
    }

    # ========================================
    # NAVEGACAO
    # ========================================
    
    function Save-DBCredentials {
        # Salvar credenciais do formulario na config
        if ($script:txtDBUser) { $script:Config.DBUser = $script:txtDBUser.Text }
        if ($script:txtDBPass) { $script:Config.DBPass = $script:txtDBPass.Text }
        if ($script:txtDBHostField) { $script:Config.DBHost = $script:txtDBHostField.Text }
        if ($script:txtDBPort) { $script:Config.DBPort = $script:txtDBPort.Text }
        if ($script:txtDBName) { $script:Config.DBName = $script:txtDBName.Text }
        
        # Atualizar arquivo .env
        $envFile = Join-Path $script:ScriptDir ".env"
        $envContent = @"
# ALUFORCE - Configuracoes
DB_HOST=$($script:Config.DBHost)
DB_PORT=$($script:Config.DBPort)
DB_USER=$($script:Config.DBUser)
DB_PASSWORD=$($script:Config.DBPass)
DB_NAME=$($script:Config.DBName)
SERVER_PORT=3000
"@
        Set-Content -Path $envFile -Value $envContent -Encoding UTF8 -NoNewline
    }
    
    function Navigate-Next {
        switch ($script:CurrentStep) {
            0 { 
                Save-DBCredentials
                $script:CurrentStep = 1
                Show-RequirementsPage 
            }
            1 { $script:CurrentStep = 2; Show-DatabasePage }
            2 { $script:CurrentStep = 3; Show-InstallPage }
            3 { $script:CurrentStep = 4; Show-CompletePage }
            4 {
                if ($script:chkStartNow.Checked) {
                    Start-AluforceSystem
                }
                $form.Close()
            }
        }
    }

    function Navigate-Back {
        switch ($script:CurrentStep) {
            1 { $script:CurrentStep = 0; Show-WelcomePage }
            2 { $script:CurrentStep = 1; Show-RequirementsPage }
            3 { $script:CurrentStep = 2; Show-DatabasePage }
        }
    }

    function Start-AluforceSystem {
        # Usar o VBS para iniciar via Electron (sem janela CMD)
        $launcherVbs = Join-Path $script:ScriptDir "Iniciar-Aluforce.vbs"
        
        if (Test-Path $launcherVbs) {
            # Usar o launcher VBS que inicia o Electron
            Start-Process -FilePath "wscript.exe" -ArgumentList "`"$launcherVbs`"" -WorkingDirectory $script:ScriptDir
        } else {
            # Fallback: tentar iniciar Electron diretamente via npx
            $electronMain = Join-Path $script:ScriptDir "electron\main.js"
            if (Test-Path $electronMain) {
                Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npx", "electron", "`"$electronMain`"" -WorkingDirectory $script:ScriptDir -WindowStyle Hidden
            } else {
                # Fallback final: abrir no navegador
                $serverJs = Join-Path $script:ScriptDir "server.js"
                if (Test-Path $serverJs) {
                    Start-Process -FilePath $script:Config.NodePath -ArgumentList "`"$serverJs`"" -WorkingDirectory $script:ScriptDir -WindowStyle Hidden
                }
                Start-Sleep -Seconds 3
                Start-Process "http://localhost:3000"
            }
        }
    }

    # Eventos
    $btnNext.Add_Click({ Navigate-Next })
    $btnBack.Add_Click({ Navigate-Back })
    $btnCancel.Add_Click({ $form.Close() })

    # Iniciar
    Show-WelcomePage

    [void]$form.ShowDialog()
}

# ============================================================================
# EXECUCAO PRINCIPAL
# ============================================================================

Show-InstallerWizard
