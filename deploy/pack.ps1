<#
  Soguna Adorsho Jubo Somaj - one-click upload + deploy from Windows.

  Usage (from the project folder, in PowerShell):
      .\deploy\pack.ps1 -Server digihealth@YOUR_VPS_IP
  Only build the archive (to upload yourself):
      .\deploy\pack.ps1

  Needs the built-in Windows OpenSSH client (ssh/scp) and tar (Windows 10+).
#>
param(
  [string]$Server = "",
  [string]$RemotePath = "/home/digihealth/soguna",
  [int]$Port = 22
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $env:TEMP "soguna-deploy.tgz"
if (Test-Path $out) { Remove-Item $out -Force }

Write-Host "> Packing code from $root" -ForegroundColor Cyan
$excludes = @(
  "node_modules", ".next", ".next.prev", ".venv", "__pycache__", "*.pyc", "db.sqlite3",
  ".env", ".env.local", ".env.production.local", "tsconfig.tsbuildinfo", "backend/media", "backend/staticfiles", ".runtime", "data"
)
$tarArgs = @("-czf", $out)
foreach ($e in $excludes) { $tarArgs += "--exclude=$e" }
$tarArgs += @("-C", $root, "backend", "frontend", "deploy", "README.md")
& tar @tarArgs
if ($LASTEXITCODE -ne 0) { throw "tar failed" }
$size = [math]::Round((Get-Item $out).Length / 1MB, 1)
Write-Host "  OK $out ($size MB)" -ForegroundColor Green

if (-not $Server) {
  Write-Host ""
  Write-Host "Upload and deploy manually:" -ForegroundColor Yellow
  Write-Host "  scp `"$out`" USER@SERVER:~/soguna-deploy.tgz"
  Write-Host "  ssh -t USER@SERVER 'rm -rf ~/soguna-incoming && mkdir ~/soguna-incoming && tar -xzf ~/soguna-deploy.tgz -C ~/soguna-incoming && rm ~/soguna-deploy.tgz && bash ~/soguna-incoming/deploy/unpack.sh $RemotePath'"
  exit 0
}

Write-Host "> Uploading to $Server" -ForegroundColor Cyan
& scp -P $Port $out "${Server}:~/soguna-deploy.tgz"
if ($LASTEXITCODE -ne 0) { throw "scp failed" }

Write-Host "> Deploying on the server (you may be asked for your sudo password)" -ForegroundColor Cyan
$remote = "set -e; rm -rf ~/soguna-incoming; mkdir ~/soguna-incoming; tar -xzf ~/soguna-deploy.tgz -C ~/soguna-incoming; rm -f ~/soguna-deploy.tgz; find ~/soguna-incoming/deploy -name '*.sh' -exec sed -i 's/\r$//' {} +; bash ~/soguna-incoming/deploy/unpack.sh $RemotePath"
& ssh -t -p $Port $Server $remote
if ($LASTEXITCODE -ne 0) { throw "Deploy failed - see the output above" }
