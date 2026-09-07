@echo off
title CleanPDF // 100%% Yerel PDF Arac Seti
cd /d "%~dp0"

echo ========================================================
echo   CleanPDF: %%100 YEREL ^& GIZLI PDF ISVICRE CAKISI
echo ========================================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [HATA] Node.js sistemde bulunamadi!
    echo CleanPDF'i dogrudan tarayicida aciyorum...
    start "" "index.html"
    pause
    exit /b
)

echo Sunucu baslatiliyor...
start "" http://localhost:3940
node server.js
if %errorlevel% neq 0 (
    echo.
    echo Bir hata olustu. Tarayicida dogrudan aciliyor...
    start "" "index.html"
)
pause

