Param(
  [Parameter(Mandatory=$true)] [string]$Path,
  [Parameter(Mandatory=$true)] [string]$Pfx,
  [Parameter(Mandatory=$true)] [string]$Password,
  [Parameter(Mandatory=$false)] [string]$TimestampServer = "http://timestamp.sectigo.com"
)

# Example:
#  pwsh ./scripts/sign-windows.ps1 -Path dist\bundle\msi\Saforia_0.1.0_x64_en-US.msi -Pfx C:\certs\codesign.pfx -Password (Read-Host -AsSecureString)

Write-Host "Signing $Path with $Pfx"
signtool.exe sign /fd SHA256 /f $Pfx /p $Password /tr $TimestampServer /td SHA256 $Path
Write-Host "Done"

