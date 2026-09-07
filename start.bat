@echo off
title CleanPDF // 100%% Yerel PDF Arac Seti
cd /d "%~dp0"
echo ========================================================
echo   CleanPDF: %100 YEREL & GIZLI PDF ISVICRE CAKISI
echo   Sunucu: http://localhost:3940
echo ========================================================
start "" http://localhost:3940
node server.js
pause
