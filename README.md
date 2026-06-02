# LinguoCare - Corrector Lingüístico Inteligente

Una aplicación web interactiva construida con **React (Vite)** + **Flask (Python)** y un diseño moderno en **HTML5, CSS3 (Glassmorphic) y JavaScript**.

## 🚀 Cómo ejecutar el proyecto

### Requisitos previos
- **Python** con las dependencias: `flask`, `flask-cors`, `language-tool-python`
- **Node.js** (v18+) con npm
- **Java** (requerido por LanguageTool)

### Instalación de dependencias (solo la primera vez)

```bash
# Dependencias de Node.js (frontend)
npm install
```

**Para el backend (Python)**, estás utilizando un entorno virtual de Conda llamado `linguocare`. Para activarlo e instalar las dependencias, sigue estos pasos:

```bash
# 1. Activar el entorno de Conda
conda activate linguocare

# 2. Una vez activado (verás (linguocare) en la terminal), instala las dependencias si aún no lo has hecho:
pip install flask flask-cors language-tool-python google-generativeai python-dotenv
```
### ▶️ Ejecutar todo con UN solo comando

```bash
npm start
```

Esto levanta **backend** (Flask en `http://localhost:5000`) y **frontend** (Vite en `http://localhost:5173`) en paralelo, en la misma terminal con logs identificados por colores.

### Opciones alternativas

| Comando | Qué hace |
|---------|----------|
| `npm start` | ✅ Levanta backend + frontend juntos |
| `npm run dev` | Solo frontend (Vite) |
| `npm run backend` | Solo backend (Flask) |
| `run.bat` | Script Windows CMD (llama a `npm start`) |
| `.\run.ps1` | Script PowerShell (llama a `npm start`) |

---

## 🛠️ Diagnóstico y Solución de Problemas

### Matar todos los servidores activos

Ejecuta este comando para cerrar Flask y Vite de una sola vez:

**PowerShell:**
```powershell
Stop-Process -Name python, node -Force -ErrorAction SilentlyContinue
```

**CMD:**
```cmd
taskkill /F /IM python.exe /IM node.exe
```

Esto termina todos los procesos `python` (Flask) y `node` (Vite) activos en el sistema.

### ⚠️ Error: "Error de conexión con el servidor"

Si al registrar o iniciar sesión aparece ese mensaje, puede deberse a que la base de datos SQLite tiene un esquema desactualizado.

**Solución:** Detener el servidor, eliminar la BD y reiniciar:
```bash
# 1. Detener npm start (Ctrl+C en la terminal)

# 2. Eliminar la base de datos vieja
Remove-Item instance\database.db -Force   # PowerShell
# o en CMD:
del instance\database.db

# 3. Reiniciar (Flask la recreará automáticamente)
npm start
```

---

## 🎨 Características de Diseño Premium
- **Diseño Glassmorphic**: Interfaz elegante con desenfoque de fondo y bordes translúcidos.
- **Efecto de Seguimiento de Luz**: La tarjeta reacciona al movimiento del puntero del mouse para un efecto tridimensional.
- **Micro-animaciones**: Transiciones suaves y elementos flotantes animados en el fondo.
- **Interactividad Dinámica**: Sistema de respuestas interactivas con confeti digital usando `canvas-confetti`.
