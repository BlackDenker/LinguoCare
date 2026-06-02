@echo off
title LinguoCare - Corrector Linguistico Inteligente
echo.
echo ============================================================
echo   LinguoCare - Corrector Linguistico Inteligente
echo ============================================================
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no encontrado. Instala Python y vuelve a intentarlo.
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no encontrado. Instala Node.js y vuelve a intentarlo.
    pause
    exit /b 1
)

echo [INFO] Iniciando Backend (Flask) + Frontend (Vite) en paralelo...
echo       -> Backend:  http://localhost:5000
echo       -> Frontend: http://localhost:5173
echo.

npm start
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Algo fallo al iniciar. Revisa que las dependencias esten instaladas (npm install).
    pause
)
