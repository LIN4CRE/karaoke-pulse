@echo off
title KaraokePulse - YouTube Karaoke Studio
cls
echo ===================================================================
echo     🎤 KARAOKEPULSE — YouTube Karaoke Studio
echo ===================================================================
echo.
echo Checking studio status...

netstat -ano | findstr :3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo Studio is already running! Opening your browser...
    start "" "http://localhost:3000"
    timeout /t 2 >nul
    exit /b
)

echo Starting KaraokePulse Studio...
echo Opening http://localhost:3000 in your browser...
start "" "http://localhost:3000"
node server.js
pause
