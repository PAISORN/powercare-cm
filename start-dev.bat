@echo off
cd /d "%~dp0"
echo Starting PowerCare.CM dev server...
echo.
npm run dev:supabase
pause
