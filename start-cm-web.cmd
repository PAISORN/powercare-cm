@echo off
setlocal

cd /d "%~dp0"

echo Starting Power Plant CM web app...
echo Keep this window open while using the app.
echo.
echo URL: http://127.0.0.1:3000
echo.

start "" /min cmd /c "timeout /t 3 /nobreak >nul && start http://127.0.0.1:3000"

npm.cmd run dev:local -- -H 127.0.0.1 -p 3000

echo.
echo Server stopped. Press any key to close this window.
pause >nul
