@echo off
title CCTV Algorithmic Gaze Server
echo ========================================================
echo   CCTV ALGORITHMIC GAZE - LOCAL SERVER BOOTSTRAP
echo ========================================================
echo.
echo Launching default browser at http://localhost:8000 ...
start http://localhost:8000

:: Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [System] Starting server via Python...
    python -m http.server 8000
    goto end
)

:: Check if py command exists
where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [System] Starting server via Python (py)...
    py -m http.server 8000
    goto end
)

:: Check if Node/npx is available
where npx >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [System] Starting server via Node/npx...
    npx serve -l 8000 .
    goto end
)

echo.
echo ========================================================
echo ERROR: Neither Python nor Node/npx was found on your PATH.
echo Please install Python (https://python.org) or Node.js (https://nodejs.org)
echo to host the files locally, or open index.html directly in a browser.
echo ========================================================
echo.
pause

:end
