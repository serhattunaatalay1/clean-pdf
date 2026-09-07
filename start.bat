@echo off
title CleanPDF
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js not found. Opening directly in browser...
    start "" "index.html"
    exit /b
)

echo Starting CleanPDF on http://localhost:3940 ...
start "" http://localhost:3940
node server.js
if %errorlevel% neq 0 (
    start "" "index.html"
)


