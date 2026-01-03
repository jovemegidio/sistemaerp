Add-Type -AssemblyName System.Drawing

$size = 1024
$bitmap = New-Object System.Drawing.Bitmap($size, $size)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

# Fundo azul
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(21, 101, 192))
$graphics.FillRectangle($brush, 0, 0, $size, $size)

# Letra A branca
$font = New-Object System.Drawing.Font("Arial", 500, [System.Drawing.FontStyle]::Bold)
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
$graphics.DrawString("A", $font, $whiteBrush, $rect, $sf)

$bitmap.Save("app-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
Write-Host "Icone criado: app-icon.png"
