@echo off
title KaraokePulse - YouTube Karaoke Studio
echo ========================================================
echo    KaraokePulse - YouTube Karaoke Studio
echo ========================================================
echo.
echo Starting KaraokePulse server on http://localhost:3000 ...
echo.

start "" "http://localhost:3000"
node server.js
pause
