"""Configuración central de JarvisCO."""
from pathlib import Path

VERSION = "1.0.0-senior"
AUTHOR = "Sergio Alberto Sanchez Echeverria"
PROJECT_NAME = "jarvisco"

JARVISCO_HOME = Path.home() / ".jarvisco"
MODELS_DIR = JARVISCO_HOME / "models"
SESSIONS_DIR = JARVISCO_HOME / "sessions"

for d in [JARVISCO_HOME, MODELS_DIR, SESSIONS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

MODEL_FILENAME = "granite-3b-code-instruct.Q4_K_M.gguf"
MODEL_PATH = MODELS_DIR / MODEL_FILENAME
OLLAMA_MODEL_NAME = "granite3.1-moe"

CONTEXT_SIZE = 4096
MAX_TOKENS = 512
TEMPERATURE = 0.2
INFERENCE_TIMEOUT = 60
SANDBOX_TIMEOUT = 30

SYSTEM_PROMPT = """Eres jarvisco, un asistente de desarrollo senior con acceso total a la terminal.
CAPACIDADES:
1. Puedes ejecutar CUALQUIER comando de Bash disponible en el sistema.
2. Puedes escribir y ejecutar scripts complejos en Python o Bash.
3. Tienes libertad total para analizar, crear y modificar archivos.

REGLAS DE ORO:
- Prioriza siempre la eficiencia: si un comando de Bash es más rápido que un script de Python, úsalo.
- Responde SIEMPRE en formato JSON: {"thought": "Tu razonamiento", "code": "Código si aplica", "command": "Comando real de Bash"}
- El campo "command" debe ser ejecutable directamente por el usuario."""
