# ============================================================================
# ALUFORCE ERP - Instalador Web v3.0
# Suporte a RAR e ZIP + Campo de senha do banco
# ============================================================================

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$script:InstallPath = "C:\Aluforce"

# Cores do tema
$script:Colors = @{
    Primary = [System.Drawing.Color]::FromArgb(255, 0, 150, 180)
    Secondary = [System.Drawing.Color]::FromArgb(255, 0, 180, 200)
    Dark = [System.Drawing.Color]::FromArgb(255, 20, 60, 100)
    White = [System.Drawing.Color]::White
    Success = [System.Drawing.Color]::FromArgb(255, 40, 180, 100)
    Error = [System.Drawing.Color]::FromArgb(255, 220, 60, 60)
    Text = [System.Drawing.Color]::FromArgb(255, 50, 50, 50)
    TextLight = [System.Drawing.Color]::FromArgb(255, 200, 220, 240)
}

# ============================================================================
# FUNCOES
# ============================================================================

function Find-7Zip {
    $paths = @(
        "C:\Program Files\7-Zip\7z.exe",
        "C:\Program Files (x86)\7-Zip\7z.exe",
        "$env:ProgramFiles\7-Zip\7z.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) { return $p }
    }
    return ""
}

function Find-WinRAR {
    $paths = @(
        "C:\Program Files\WinRAR\WinRAR.exe",
        "C:\Program Files (x86)\WinRAR\WinRAR.exe",
        "C:\Program Files\WinRAR\UnRAR.exe",
        "C:\Program Files (x86)\WinRAR\UnRAR.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) { return $p }
    }
    return ""
}

function Download-FromGoogleDrive {
    param(
        [string]$FileId,
        [string]$OutputPath,
        [System.Windows.Forms.ProgressBar]$Progress,
        [System.Windows.Forms.Label]$StatusLabel
    )
    
    try {
        $StatusLabel.Text = "Conectando ao Google Drive..."
        [System.Windows.Forms.Application]::DoEvents()
        
        $downloadUrl = "https://drive.google.com/uc?export=download&confirm=t&id=$FileId"
        
        $Progress.Value = 10
        $StatusLabel.Text = "Iniciando download..."
        [System.Windows.Forms.Application]::DoEvents()
        
        # Tentar BITS
        $bitsOk = $false
        try {
            Import-Module BitsTransfer -ErrorAction Stop
            
            $StatusLabel.Text = "Baixando arquivo (pode demorar)..."
            [System.Windows.Forms.Application]::DoEvents()
            
            $job = Start-BitsTransfer -Source $downloadUrl -Destination $OutputPath -Asynchronous -Priority High
            
            $timeout = 0
            while (($job.JobState -eq "Transferring" -or $job.JobState -eq "Connecting") -and $timeout -lt 1200) {
                $percentComplete = 10
                if ($job.BytesTotal -gt 0) {
                    $percentComplete = 10 + [int](($job.BytesTransferred / $job.BytesTotal) * 50)
                }
                $Progress.Value = [Math]::Min($percentComplete, 60)
                
                $downloaded = [math]::Round($job.BytesTransferred / 1MB, 2)
                $total = [math]::Round($job.BytesTotal / 1MB, 2)
                if ($total -gt 0) {
                    $StatusLabel.Text = "Baixando: $downloaded MB de $total MB"
                } else {
                    $StatusLabel.Text = "Baixando: $downloaded MB..."
                }
                [System.Windows.Forms.Application]::DoEvents()
                Start-Sleep -Milliseconds 500
                $timeout++
            }
            
            if ($job.JobState -eq "Transferred") {
                Complete-BitsTransfer -BitsJob $job
                $bitsOk = $true
            } else {
                Remove-BitsTransfer -BitsJob $job -ErrorAction SilentlyContinue
            }
        } catch {}
        
        # Fallback WebClient
        if (-not $bitsOk) {
            $StatusLabel.Text = "Baixando via WebClient..."
            [System.Windows.Forms.Application]::DoEvents()
            
            $webClient = New-Object System.Net.WebClient
            $webClient.Headers.Add("User-Agent", "Mozilla/5.0")
            $webClient.DownloadFile($downloadUrl, $OutputPath)
        }
        
        $Progress.Value = 60
        
        # Verificar arquivo
        if (Test-Path $OutputPath) {
            $fileSize = (Get-Item $OutputPath).Length
            
            if ($fileSize -lt 50000) {
                $content = Get-Content $OutputPath -Raw -ErrorAction SilentlyContinue
                if ($content -match "html|DOCTYPE") {
                    return $false
                }
            }
            
            $StatusLabel.Text = "Download OK! ($([math]::Round($fileSize/1MB, 2)) MB)"
            return $true
        }
        
        return $false
    }
    catch {
        $StatusLabel.Text = "Erro: $($_.Exception.Message)"
        return $false
    }
}

function Extract-Archive {
    param(
        [string]$ArchivePath,
        [string]$DestinationPath,
        [System.Windows.Forms.ProgressBar]$Progress,
        [System.Windows.Forms.Label]$StatusLabel
    )
    
    try {
        $StatusLabel.Text = "Preparando extracao..."
        [System.Windows.Forms.Application]::DoEvents()
        
        # Limpar destino
        if (Test-Path $DestinationPath) {
            Remove-Item $DestinationPath -Recurse -Force -ErrorAction SilentlyContinue
        }
        New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null
        
        $Progress.Value = 70
        
        # Detectar tipo de arquivo
        $extension = [System.IO.Path]::GetExtension($ArchivePath).ToLower()
        $isRar = $false
        
        # Verificar pelos bytes magicos
        $bytes = [System.IO.File]::ReadAllBytes($ArchivePath) | Select-Object -First 10
        if ($bytes[0] -eq 0x52 -and $bytes[1] -eq 0x61 -and $bytes[2] -eq 0x72) {
            $isRar = $true
        }
        
        if ($isRar -or $extension -eq ".rar") {
            $StatusLabel.Text = "Extraindo arquivo RAR..."
            [System.Windows.Forms.Application]::DoEvents()
            
            # Tentar 7-Zip primeiro
            $sevenZip = Find-7Zip
            if ($sevenZip) {
                $StatusLabel.Text = "Extraindo com 7-Zip..."
                [System.Windows.Forms.Application]::DoEvents()
                
                $process = Start-Process -FilePath $sevenZip -ArgumentList "x", "`"$ArchivePath`"", "-o`"$DestinationPath`"", "-y" -NoNewWindow -Wait -PassThru
                
                if ($process.ExitCode -eq 0) {
                    $Progress.Value = 95
                    $StatusLabel.Text = "Extracao concluida!"
                    return $true
                }
            }
            
            # Tentar WinRAR
            $winrar = Find-WinRAR
            if ($winrar) {
                $StatusLabel.Text = "Extraindo com WinRAR..."
                [System.Windows.Forms.Application]::DoEvents()
                
                if ($winrar -match "UnRAR") {
                    $process = Start-Process -FilePath $winrar -ArgumentList "x", "-y", "`"$ArchivePath`"", "`"$DestinationPath\`"" -NoNewWindow -Wait -PassThru
                } else {
                    $process = Start-Process -FilePath $winrar -ArgumentList "x", "-y", "`"$ArchivePath`"", "`"$DestinationPath\`"" -NoNewWindow -Wait -PassThru
                }
                
                if ($process.ExitCode -eq 0) {
                    $Progress.Value = 95
                    $StatusLabel.Text = "Extracao concluida!"
                    return $true
                }
            }
            
            $StatusLabel.Text = "Erro: Instale 7-Zip ou WinRAR para extrair arquivos RAR"
            return $false
            
        } else {
            # ZIP
            $StatusLabel.Text = "Extraindo arquivo ZIP..."
            [System.Windows.Forms.Application]::DoEvents()
            
            try {
                Expand-Archive -Path $ArchivePath -DestinationPath $DestinationPath -Force
                $Progress.Value = 95
                $StatusLabel.Text = "Extracao concluida!"
                return $true
            } catch {
                # Tentar 7-Zip para ZIP
                $sevenZip = Find-7Zip
                if ($sevenZip) {
                    $process = Start-Process -FilePath $sevenZip -ArgumentList "x", "`"$ArchivePath`"", "-o`"$DestinationPath`"", "-y" -NoNewWindow -Wait -PassThru
                    if ($process.ExitCode -eq 0) {
                        $Progress.Value = 95
                        return $true
                    }
                }
                $StatusLabel.Text = "Erro ao extrair: $($_.Exception.Message)"
                return $false
            }
        }
    }
    catch {
        $StatusLabel.Text = "Erro: $($_.Exception.Message)"
        return $false
    }
}

function Update-EnvFile {
    param(
        [string]$InstallPath,
        [string]$DBPassword
    )
    
    # Procurar .env na pasta instalada
    $envFiles = Get-ChildItem $InstallPath -Filter ".env" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    
    if ($envFiles) {
        $envPath = $envFiles.FullName
        $content = Get-Content $envPath -Raw
        
        # Atualizar senha
        if ($content -match 'DB_PASSWORD\s*=') {
            $content = $content -replace 'DB_PASSWORD\s*=.*', "DB_PASSWORD=$DBPassword"
        } else {
            $content += "`nDB_PASSWORD=$DBPassword"
        }
        
        $content | Set-Content $envPath -Encoding UTF8
        return $true
    }
    
    # Se nao encontrou, procurar .env.example e criar .env
    $envExample = Get-ChildItem $InstallPath -Filter ".env.example" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($envExample) {
        $envPath = Join-Path $envExample.DirectoryName ".env"
        $content = Get-Content $envExample.FullName -Raw
        $content = $content -replace 'DB_PASSWORD\s*=.*', "DB_PASSWORD=$DBPassword"
        $content | Set-Content $envPath -Encoding UTF8
        return $true
    }
    
    return $false
}

# ============================================================================
# INTERFACE
# ============================================================================

function Show-WebInstaller {
    
    $form = New-Object System.Windows.Forms.Form
    $form.Text = "Aluforce ERP - Instalador Web"
    $form.Size = New-Object System.Drawing.Size(650, 620)
    $form.StartPosition = "CenterScreen"
    $form.FormBorderStyle = "FixedDialog"
    $form.MaximizeBox = $false
    $form.BackColor = $script:Colors.White
    $form.Font = New-Object System.Drawing.Font("Segoe UI", 9)

    # Header
    $panelHeader = New-Object System.Windows.Forms.Panel
    $panelHeader.Size = New-Object System.Drawing.Size(650, 100)
    $panelHeader.Location = New-Object System.Drawing.Point(0, 0)
    $form.Controls.Add($panelHeader)
    
    $panelHeader.Add_Paint({
        param($sender, $e)
        $rect = $sender.ClientRectangle
        $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            $rect, $script:Colors.Secondary, $script:Colors.Dark,
            [System.Drawing.Drawing2D.LinearGradientMode]::Horizontal
        )
        $e.Graphics.FillRectangle($brush, $rect)
        $brush.Dispose()
    })

    # Logo
    $logoPath = Join-Path $script:ScriptDir "images\Logo Monocromatico - Branco - Aluforce.png"
    if (-not (Test-Path $logoPath)) {
        $logoPath = Get-ChildItem "c:\Users\Administrator\Pictures\v11.12\Sistema - Aluforce v.2 - BETA" -Filter "*Branco*Aluforce*.png" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($logoPath) { $logoPath = $logoPath.FullName }
    }
    
    if ($logoPath -and (Test-Path $logoPath)) {
        $picLogo = New-Object System.Windows.Forms.PictureBox
        $picLogo.Size = New-Object System.Drawing.Size(70, 70)
        $picLogo.Location = New-Object System.Drawing.Point(20, 15)
        $picLogo.SizeMode = "Zoom"
        $picLogo.BackColor = [System.Drawing.Color]::Transparent
        $picLogo.Image = [System.Drawing.Image]::FromFile($logoPath)
        $panelHeader.Controls.Add($picLogo)
    }

    $lblTitle = New-Object System.Windows.Forms.Label
    $lblTitle.Text = "ALUFORCE ERP"
    $lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 22, [System.Drawing.FontStyle]::Bold)
    $lblTitle.ForeColor = $script:Colors.White
    $lblTitle.BackColor = [System.Drawing.Color]::Transparent
    $lblTitle.AutoSize = $true
    $lblTitle.Location = New-Object System.Drawing.Point(100, 20)
    $panelHeader.Controls.Add($lblTitle)

    $lblSubtitle = New-Object System.Windows.Forms.Label
    $lblSubtitle.Text = "Instalador Web - Download e Configuracao"
    $lblSubtitle.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $lblSubtitle.ForeColor = $script:Colors.TextLight
    $lblSubtitle.BackColor = [System.Drawing.Color]::Transparent
    $lblSubtitle.AutoSize = $true
    $lblSubtitle.Location = New-Object System.Drawing.Point(102, 55)
    $panelHeader.Controls.Add($lblSubtitle)

    # Painel Download
    $panelDownload = New-Object System.Windows.Forms.GroupBox
    $panelDownload.Text = "Download do Sistema"
    $panelDownload.Size = New-Object System.Drawing.Size(610, 120)
    $panelDownload.Location = New-Object System.Drawing.Point(20, 115)
    $form.Controls.Add($panelDownload)

    $lblFileId = New-Object System.Windows.Forms.Label
    $lblFileId.Text = "ID do arquivo no Google Drive:"
    $lblFileId.Location = New-Object System.Drawing.Point(15, 28)
    $lblFileId.AutoSize = $true
    $panelDownload.Controls.Add($lblFileId)

    $txtFileId = New-Object System.Windows.Forms.TextBox
    $txtFileId.Size = New-Object System.Drawing.Size(450, 25)
    $txtFileId.Location = New-Object System.Drawing.Point(15, 48)
    $txtFileId.Text = "1rCi8SdOiq2dCzjNexSSqTLHl1cwd0PPX"
    $txtFileId.Font = New-Object System.Drawing.Font("Consolas", 10)
    $panelDownload.Controls.Add($txtFileId)

    $lblInstallPath = New-Object System.Windows.Forms.Label
    $lblInstallPath.Text = "Pasta de instalacao:"
    $lblInstallPath.Location = New-Object System.Drawing.Point(15, 78)
    $lblInstallPath.AutoSize = $true
    $panelDownload.Controls.Add($lblInstallPath)

    $txtInstallPath = New-Object System.Windows.Forms.TextBox
    $txtInstallPath.Size = New-Object System.Drawing.Size(450, 25)
    $txtInstallPath.Location = New-Object System.Drawing.Point(180, 75)
    $txtInstallPath.Text = $script:InstallPath
    $panelDownload.Controls.Add($txtInstallPath)

    $btnBrowse = New-Object System.Windows.Forms.Button
    $btnBrowse.Text = "..."
    $btnBrowse.Size = New-Object System.Drawing.Size(40, 25)
    $btnBrowse.Location = New-Object System.Drawing.Point(555, 75)
    $btnBrowse.Add_Click({
        $folder = New-Object System.Windows.Forms.FolderBrowserDialog
        if ($folder.ShowDialog() -eq "OK") { $txtInstallPath.Text = $folder.SelectedPath }
    })
    $panelDownload.Controls.Add($btnBrowse)

    # Painel Banco de Dados
    $panelDB = New-Object System.Windows.Forms.GroupBox
    $panelDB.Text = "Configuracao do Banco de Dados"
    $panelDB.Size = New-Object System.Drawing.Size(610, 130)
    $panelDB.Location = New-Object System.Drawing.Point(20, 245)
    $form.Controls.Add($panelDB)

    $lblDBUser = New-Object System.Windows.Forms.Label
    $lblDBUser.Text = "Usuario MySQL:"
    $lblDBUser.Location = New-Object System.Drawing.Point(15, 30)
    $lblDBUser.AutoSize = $true
    $panelDB.Controls.Add($lblDBUser)

    $txtDBUser = New-Object System.Windows.Forms.TextBox
    $txtDBUser.Size = New-Object System.Drawing.Size(200, 25)
    $txtDBUser.Location = New-Object System.Drawing.Point(130, 27)
    $txtDBUser.Text = "root"
    $panelDB.Controls.Add($txtDBUser)

    $lblDBPass = New-Object System.Windows.Forms.Label
    $lblDBPass.Text = "Senha MySQL:"
    $lblDBPass.Location = New-Object System.Drawing.Point(15, 60)
    $lblDBPass.AutoSize = $true
    $panelDB.Controls.Add($lblDBPass)

    $txtDBPass = New-Object System.Windows.Forms.TextBox
    $txtDBPass.Size = New-Object System.Drawing.Size(200, 25)
    $txtDBPass.Location = New-Object System.Drawing.Point(130, 57)
    $txtDBPass.UseSystemPasswordChar = $true
    $txtDBPass.Text = ""
    $panelDB.Controls.Add($txtDBPass)

    $lblDBName = New-Object System.Windows.Forms.Label
    $lblDBName.Text = "Nome do Banco:"
    $lblDBName.Location = New-Object System.Drawing.Point(350, 30)
    $lblDBName.AutoSize = $true
    $panelDB.Controls.Add($lblDBName)

    $txtDBName = New-Object System.Windows.Forms.TextBox
    $txtDBName.Size = New-Object System.Drawing.Size(200, 25)
    $txtDBName.Location = New-Object System.Drawing.Point(460, 27)
    $txtDBName.Text = "aluforce_vendas"
    $panelDB.Controls.Add($txtDBName)

    $lblDBHost = New-Object System.Windows.Forms.Label
    $lblDBHost.Text = "Host:"
    $lblDBHost.Location = New-Object System.Drawing.Point(350, 60)
    $lblDBHost.AutoSize = $true
    $panelDB.Controls.Add($lblDBHost)

    $txtDBHost = New-Object System.Windows.Forms.TextBox
    $txtDBHost.Size = New-Object System.Drawing.Size(200, 25)
    $txtDBHost.Location = New-Object System.Drawing.Point(460, 57)
    $txtDBHost.Text = "localhost"
    $panelDB.Controls.Add($txtDBHost)

    $chkUpdateEnv = New-Object System.Windows.Forms.CheckBox
    $chkUpdateEnv.Text = "Atualizar arquivo .env com essas configuracoes"
    $chkUpdateEnv.Location = New-Object System.Drawing.Point(15, 95)
    $chkUpdateEnv.AutoSize = $true
    $chkUpdateEnv.Checked = $true
    $panelDB.Controls.Add($chkUpdateEnv)

    # Painel Progresso
    $panelProgress = New-Object System.Windows.Forms.GroupBox
    $panelProgress.Text = "Progresso"
    $panelProgress.Size = New-Object System.Drawing.Size(610, 130)
    $panelProgress.Location = New-Object System.Drawing.Point(20, 385)
    $form.Controls.Add($panelProgress)

    $progressBar = New-Object System.Windows.Forms.ProgressBar
    $progressBar.Size = New-Object System.Drawing.Size(580, 25)
    $progressBar.Location = New-Object System.Drawing.Point(15, 30)
    $panelProgress.Controls.Add($progressBar)

    $lblStatus = New-Object System.Windows.Forms.Label
    $lblStatus.Text = "Pronto. Preencha os campos e clique em Instalar."
    $lblStatus.AutoSize = $false
    $lblStatus.Size = New-Object System.Drawing.Size(580, 70)
    $lblStatus.Location = New-Object System.Drawing.Point(15, 60)
    $panelProgress.Controls.Add($lblStatus)

    # Botoes
    $btnInstall = New-Object System.Windows.Forms.Button
    $btnInstall.Text = "Instalar"
    $btnInstall.Size = New-Object System.Drawing.Size(130, 40)
    $btnInstall.Location = New-Object System.Drawing.Point(370, 525)
    $btnInstall.FlatStyle = "Flat"
    $btnInstall.BackColor = $script:Colors.Secondary
    $btnInstall.ForeColor = $script:Colors.White
    $btnInstall.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $form.Controls.Add($btnInstall)

    $btnCancel = New-Object System.Windows.Forms.Button
    $btnCancel.Text = "Cancelar"
    $btnCancel.Size = New-Object System.Drawing.Size(100, 40)
    $btnCancel.Location = New-Object System.Drawing.Point(510, 525)
    $btnCancel.FlatStyle = "Flat"
    $btnCancel.Add_Click({ $form.Close() })
    $form.Controls.Add($btnCancel)

    # Evento Instalar
    $btnInstall.Add_Click({
        $fileId = $txtFileId.Text.Trim()
        $installPath = $txtInstallPath.Text.Trim()
        $dbPass = $txtDBPass.Text
        
        if ([string]::IsNullOrEmpty($fileId)) {
            [System.Windows.Forms.MessageBox]::Show("Insira o ID do arquivo.", "Atencao", "OK", "Warning")
            return
        }
        
        if ([string]::IsNullOrEmpty($dbPass)) {
            $result = [System.Windows.Forms.MessageBox]::Show(
                "Voce nao informou a senha do MySQL.`nDeseja continuar assim mesmo?",
                "Atencao", "YesNo", "Warning"
            )
            if ($result -eq "No") { return }
        }
        
        # Verificar 7-Zip ou WinRAR
        $sevenZip = Find-7Zip
        $winrar = Find-WinRAR
        if (-not $sevenZip -and -not $winrar) {
            $result = [System.Windows.Forms.MessageBox]::Show(
                "7-Zip ou WinRAR nao encontrado!`n`nArquivos RAR precisam de um desses programas.`n`nDeseja continuar mesmo assim?",
                "Aviso", "YesNo", "Warning"
            )
            if ($result -eq "No") { return }
        }
        
        $btnInstall.Enabled = $false
        $progressBar.Value = 0
        
        # Temp
        $tempPath = Join-Path $env:TEMP "AluforceInstall_$(Get-Random)"
        New-Item -ItemType Directory -Path $tempPath -Force | Out-Null
        $archivePath = Join-Path $tempPath "sistema.rar"
        
        # Download
        $downloadOk = Download-FromGoogleDrive $fileId $archivePath $progressBar $lblStatus
        
        if ($downloadOk) {
            # Extrair
            $extractOk = Extract-Archive $archivePath $installPath $progressBar $lblStatus
            
            if ($extractOk) {
                # Atualizar .env
                if ($chkUpdateEnv.Checked) {
                    $lblStatus.Text = "Atualizando configuracoes..."
                    [System.Windows.Forms.Application]::DoEvents()
                    
                    $envUpdated = Update-EnvFile $installPath $dbPass
                    if ($envUpdated) {
                        $lblStatus.Text = "Arquivo .env atualizado!"
                    }
                }
                
                $progressBar.Value = 100
                
                # Atalho
                $desktopPath = [System.Environment]::GetFolderPath("Desktop")
                $batFile = Get-ChildItem $installPath -Filter "*.bat" -Recurse -ErrorAction SilentlyContinue | 
                           Where-Object { $_.Name -match "Aluforce|INICIAR|START" } | Select-Object -First 1
                
                if ($batFile) {
                    $shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut("$desktopPath\Aluforce ERP.lnk")
                    $shortcut.TargetPath = $batFile.FullName
                    $shortcut.WorkingDirectory = $batFile.DirectoryName
                    $shortcut.Save()
                }
                
                Remove-Item $tempPath -Recurse -Force -ErrorAction SilentlyContinue
                
                $lblStatus.Text = "INSTALACAO CONCLUIDA!"
                
                [System.Windows.Forms.MessageBox]::Show(
                    "Instalacao concluida com sucesso!`n`nInstalado em: $installPath`n`nExecute INSTALAR.bat para configurar o banco de dados.",
                    "Sucesso", "OK", "Information"
                )
            }
        } else {
            $lblStatus.Text = "Falha no download. Baixe manualmente:`nhttps://drive.google.com/file/d/$fileId/view"
            
            [System.Windows.Forms.MessageBox]::Show(
                "Download automatico falhou.`n`nBaixe o arquivo manualmente e extraia.",
                "Aviso", "OK", "Warning"
            )
        }
        
        $btnInstall.Enabled = $true
    })

    [void]$form.ShowDialog()
}

# Executar
Show-WebInstaller
