@echo off
setlocal
title PowerCare.CM - Local Web

cd /d "%~dp0"

set "APP_URL=http://127.0.0.1:3000"
set "LOG_DIR=%~dp0logs"
set "LOG_FILE=%LOG_DIR%\start-cm-web.log"
set "ERROR_LOG=%LOG_DIR%\start-cm-web-error.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo ==================================================
echo          PowerCare.CM - Local Web
echo ==================================================
echo.
echo Web: %APP_URL%
echo Please keep this window open while using the website.
echo.

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  echo Please install Node.js and double-click this file again.
  echo.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$server = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if ($server) { exit 0 } exit 1"
if not errorlevel 1 (
  echo The website is already running. Opening browser...
  start "" "%APP_URL%"
  exit /b 0
)

echo [%date% %time%] Starting PowerCare.CM local web app > "%LOG_FILE%"
type nul > "%ERROR_LOG%"
echo [1/2] Preparing the application...
call npm.cmd run db:generate
if errorlevel 1 (
  echo.
  echo [ERROR] Application preparation failed.
  echo See: %LOG_FILE%
  echo.
  echo [%date% %time%] Prisma generate failed. >> "%LOG_FILE%"
  pause
  exit /b 1
)

echo.
echo [2/2] Starting the website...
echo The browser will open automatically when ready.
echo.

start "PowerCare.CM Browser Opener" /min powershell -NoProfile -ExecutionPolicy Bypass -Command "$url='%APP_URL%'; for ($i = 0; $i -lt 120; $i++) { try { $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3; if ($response.StatusCode -ge 200) { Start-Process $url; exit 0 } } catch {}; Start-Sleep -Seconds 1 }; Add-Content -LiteralPath '%ERROR_LOG%' -Value 'The website did not become ready within 120 seconds.'"

echo [%date% %time%] Next.js dev server starting on %APP_URL% >> "%LOG_FILE%"
call npx.cmd next dev --webpack -H 127.0.0.1 -p 3000 >> "%LOG_FILE%" 2>> "%ERROR_LOG%"

echo.
echo The local website has stopped.
echo If this was unexpected, see:
echo %ERROR_LOG%
echo.
echo Press any key to close.
pause >nul
