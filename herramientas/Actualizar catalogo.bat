@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo ================================================
echo   Actualizar catalogo - Centro Optico Santa Fe
echo ================================================
echo.
node herramientas\construir-catalogo.mjs --datos "C:\COSF\fotos"
echo.
pause
