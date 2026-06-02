$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  LinguoCare - Corrector Linguistico Inteligente" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
try {
    python --version | Out-Null
} catch {
    Write-Host "[ERROR] Python no encontrado. Instala Python y vuelve a intentarlo." -ForegroundColor Red
    Read-Host "Presiona Enter para salir..."
    exit 1
}

# Check Node
try {
    node --version | Out-Null
} catch {
    Write-Host "[ERROR] Node.js no encontrado. Instala Node.js y vuelve a intentarlo." -ForegroundColor Red
    Read-Host "Presiona Enter para salir..."
    exit 1
}

Write-Host "[INFO] Iniciando Backend (Flask) + Frontend (Vite) en paralelo..." -ForegroundColor Yellow
Write-Host "      -> Backend:  http://localhost:5000" -ForegroundColor DarkGray
Write-Host "      -> Frontend: http://localhost:5173" -ForegroundColor DarkGray
Write-Host ""

npm start
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Algo fallo al iniciar. Revisa que las dependencias esten instaladas (npm install)." -ForegroundColor Red
    Read-Host "Presiona Enter para salir..."
}
