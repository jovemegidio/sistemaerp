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
