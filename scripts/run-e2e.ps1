$ErrorActionPreference = "Stop"

$env:PLAYWRIGHT_BROWSERS_PATH = ".\pw-browsers"
$portProbe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$portProbe.Start()
$port = ([System.Net.IPEndPoint]$portProbe.LocalEndpoint).Port
$portProbe.Stop()
$url = "http://127.0.0.1:$port"
$runId = "$PID-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())-$([Guid]::NewGuid().ToString('N').Substring(0, 8))"
$env:E2E_BASE_URL = $url
$nextBin = Join-Path (Get-Location) "node_modules\next\dist\bin\next"
$logDir = Join-Path (Join-Path (Get-Location) ".next-e2e") $runId
$resultDir = Join-Path (Join-Path (Get-Location) "test-results") "e2e-$runId"
$stdoutLog = Join-Path $logDir "server.out.log"
$stderrLog = Join-Path $logDir "server.err.log"
$e2eDatabaseName = "e2e-$runId.db"
$e2eDatabase = Join-Path (Join-Path (Get-Location) "prisma") $e2eDatabaseName
$resolvedE2eDatabase = [System.IO.Path]::GetFullPath($e2eDatabase)
$resolvedDatabaseDir = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) "prisma"))

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$workspaceLockPath = Join-Path (Join-Path (Get-Location) ".next-e2e") "workspace.lock"
$workspaceLock = $null
$nextEnvPath = Join-Path (Get-Location) "next-env.d.ts"
$nextEnvExisted = $false
$nextEnvBytes = $null
if (-not $resolvedE2eDatabase.StartsWith($resolvedDatabaseDir, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to reset an E2E database outside $resolvedDatabaseDir"
}
$previousDatabaseUrl = $env:DATABASE_URL
$env:DATABASE_URL = "file:./$e2eDatabaseName"
New-Item -ItemType File -Path $resolvedE2eDatabase -Force | Out-Null
npx.cmd prisma db push --skip-generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npx.cmd prisma db seed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

while (-not $workspaceLock) {
  try { $workspaceLock = [System.IO.File]::Open($workspaceLockPath, 'OpenOrCreate', 'ReadWrite', 'None') }
  catch [System.IO.IOException] { Start-Sleep -Milliseconds 250 }
}
$nextEnvExisted = Test-Path -LiteralPath $nextEnvPath
if ($nextEnvExisted) { $nextEnvBytes = [System.IO.File]::ReadAllBytes($nextEnvPath) }

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
    if ($server.HasExited) { throw "Next dev server exited before readiness (run $runId, port $port)" }
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

  Write-Output "E2E run $runId ready on port $port (PID $($server.Id))"
  npx.cmd playwright test --output $resultDir @args
  $testExitCode = $LASTEXITCODE
}
finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
  }
  if ($null -eq $previousDatabaseUrl) { Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue } else { $env:DATABASE_URL = $previousDatabaseUrl }
  if ($nextEnvExisted) { [System.IO.File]::WriteAllBytes($nextEnvPath, $nextEnvBytes) }
  elseif (Test-Path -LiteralPath $nextEnvPath) { Remove-Item -LiteralPath $nextEnvPath -Force }
  if ($workspaceLock) { $workspaceLock.Dispose() }
  if ($testExitCode -eq 0 -and (Test-Path -LiteralPath $resolvedE2eDatabase)) {
    $removed = $false
    for ($attempt = 0; $attempt -lt 10 -and -not $removed; $attempt++) {
      try { Remove-Item -LiteralPath $resolvedE2eDatabase -Force -ErrorAction Stop; $removed = $true } catch { Start-Sleep -Milliseconds 500 }
    }
    if ($removed) { Write-Output "Successful disposable E2E database removed: $resolvedE2eDatabase" }
    else { Write-Warning "Successful-run database is still locked and could not be removed: $resolvedE2eDatabase" }
  } else {
    Write-Output "Failed-run E2E database retained for evidence: $resolvedE2eDatabase"
  }
}
exit $testExitCode
