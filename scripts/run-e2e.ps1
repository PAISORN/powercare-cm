$ErrorActionPreference = "Stop"

$env:PLAYWRIGHT_BROWSERS_PATH = ".\pw-browsers"
$port = 3200
$url = "http://127.0.0.1:$port"
$nextBin = Join-Path (Get-Location) "node_modules\next\dist\bin\next"
$logDir = Join-Path (Get-Location) ".next-e2e"
$stdoutLog = Join-Path $logDir "server.out.log"
$stderrLog = Join-Path $logDir "server.err.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$server = Start-Process `
  -FilePath "node" `
  -ArgumentList "`"$nextBin`" dev -H 127.0.0.1 -p $port" `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog `
  -PassThru

try {
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    try {
      Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
      $ready = $true
      break
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  if (-not $ready) {
    Get-Content $stdoutLog -ErrorAction SilentlyContinue
    Get-Content $stderrLog -ErrorAction SilentlyContinue
    throw "Next dev server did not start on $url"
  }

  npx.cmd playwright test
  exit $LASTEXITCODE
}
finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
  }
}
