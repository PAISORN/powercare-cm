@echo off
setlocal

cd /d "%~dp0"

set "APP_URL=http://127.0.0.1:3000"
set "LOG_DIR=%~dp0logs"
set "LOG_FILE=%LOG_DIR%\start-cm-web.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo ==================================================
echo PowerCare.CM Local Web App
echo ==================================================
echo.
echo URL: %APP_URL%
echo Keep this window open while using the web app.
echo Close this window to stop the local server.
echo.

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo Node.js / npm was not found.
  echo Please install Node.js first, then run this file again.
  echo.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$server = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if ($server) { exit 0 } exit 1"
if not errorlevel 1 (
  echo Local web server is already running.
  echo Opening %APP_URL% ...
  start "" "%APP_URL%"
  echo.
  pause
  exit /b 0
)

echo [%date% %time%] Starting PowerCare.CM local web app > "%LOG_FILE%"
echo Preparing database client...
call npm.cmd run db:generate
if errorlevel 1 (
  echo.
  echo Failed to prepare the database client.
  echo Check this log file:
  echo %LOG_FILE%
  echo.
  echo [%date% %time%] Prisma generate failed. >> "%LOG_FILE%"
  pause
  exit /b 1
)

echo.
echo Starting local server...
echo Browser will open automatically when the web app is ready.
echo.

start "PowerCare.CM Browser Opener" /min powershell -NoProfile -ExecutionPolicy Bypass -Command "$url='%APP_URL%'; for ($i = 0; $i -lt 120; $i++) { try { $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3; if ($response.StatusCode -ge 200) { Start-Process $url; exit 0 } } catch {}; Start-Sleep -Seconds 1 }; Start-Process $url"

echo [%date% %time%] Next.js dev server starting on %APP_URL% >> "%LOG_FILE%"
call npx.cmd next dev -H 127.0.0.1 -p 3000

echo.
echo Local server stopped.
echo Press any key to close this window.
pause >nul
