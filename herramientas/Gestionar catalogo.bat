@echo off
chcp 65001 >nul
cd /d "%~dp0.."
title Gestionar catalogo - Centro Optico Santa Fe
echo ================================================
echo   Gestionar catalogo - Centro Optico Santa Fe
echo ================================================
echo.
echo   Se va a abrir el panel en tu navegador.
echo   Dejá esta ventana abierta mientras lo uses.
echo   Para cerrar el panel, cerrá esta ventana.
echo.
node herramientas\panel-catalogo.mjs --datos "C:\COSF\fotos"
echo.
pause
