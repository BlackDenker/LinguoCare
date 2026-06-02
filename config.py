import os
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env
load_dotenv()

class Config:
    # Obtener valores del entorno o usar defaults de seguridad (aunque fallarán sin API key válida)
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    # Construir URL
    GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    
    # Asegurarnos de que existe la clave en producción
    if not GEMINI_API_KEY:
        print("WARNING: GEMINI_API_KEY no se encontró en las variables de entorno.")
