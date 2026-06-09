@echo off
title Servidor de Reconocimiento Facial - Trevor Paglen
echo ========================================================
echo   RECONOCIMIENTO FACIAL - SERVIDOR LOCAL (run.bat)
echo ========================================================
echo.
echo Iniciando navegador predeterminado en http://localhost:8000 ...
start http://localhost:8000

:: Verificar si Python esta instalado
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [Sistema] Iniciando servidor a traves de Python...
    python -m http.server 8000
    goto end
)

:: Verificar si el comando py existe (Windows Python Launcher)
where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [Sistema] Iniciando servidor a traves de Python (py)...
    py -m http.server 8000
    goto end
)

:: Verificar si Node/npx esta disponible
where npx >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [Sistema] Iniciando servidor a traves de Node/npx...
    npx serve -l 8000 .
    goto end
)

echo.
echo ========================================================
echo ERROR: No se encontro Python ni Node/npx en su sistema.
echo Instale Python (https://python.org) o Node.js (https://nodejs.org)
echo para servir los archivos localmente, o abra index.html
echo directamente en su navegador web.
echo ========================================================
echo.
pause

:end
