from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import asyncio
import shutil
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

from jarvisco.config import (
    JARVISCO_HOME, MODELS_DIR, MODEL_FILENAME, MODEL_PATH,
    OLLAMA_MODEL_NAME, SYSTEM_PROMPT, MAX_TOKENS, SANDBOX_TIMEOUT,
)
from jarvisco.adapter import JarvisCOAdapter, RiskLevel
from jarvisco.analyzer import analyze_code
from jarvisco.llama_engine import LlamaEngine
from jarvisco.sandbox import SandboxExecutor

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="JarvisCO API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Components ---
adapter = JarvisCOAdapter()
sandbox = SandboxExecutor(timeout=SANDBOX_TIMEOUT)
engine: Optional[LlamaEngine] = None


def get_engine() -> LlamaEngine:
    global engine
    if engine is None:
        engine = LlamaEngine(MODEL_PATH, OLLAMA_MODEL_NAME)
    return engine


# --- Pydantic Models ---
class ChatRequest(BaseModel):
    message: str
    use_advanced: bool = False

class ChatResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    message: str
    response: str
    engine: str = ""
    risk_level: Optional[str] = None
    risk_description: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class RiskRequest(BaseModel):
    command: str

class CodeRequest(BaseModel):
    code: str
    language: str = "python"

class ExecuteRequest(BaseModel):
    code: str
    language: str = "python"


# --- REST API Routes ---
@api_router.get("/")
async def root():
    return {"message": "JarvisCO API v1.0", "status": "running"}


@api_router.get("/models/status")
async def get_model_status():
    eng = get_engine()
    status = eng.get_status()
    model_size = 0
    if MODEL_PATH.exists():
        model_size = round(MODEL_PATH.stat().st_size / (1024 * 1024), 1)
    return {
        "primary_model": {
            "name": MODEL_FILENAME,
            "path": str(MODEL_PATH),
            "downloaded": MODEL_PATH.exists(),
            "loaded": eng.loaded,
            "size_mb": model_size,
        },
        "ollama_model": {
            "name": OLLAMA_MODEL_NAME,
            "available": status["ollama_model_available"],
            "installed": status["ollama_installed"],
        },
        "llama_cpp_installed": status["llama_cpp_installed"],
        "load_error": status["load_error"],
        "download_instructions": {
            "primary": f"pip install huggingface-hub && huggingface-cli download ibm-granite/granite-3b-code-instruct-2k-GGUF {MODEL_FILENAME} --local-dir {MODELS_DIR}",
            "ollama_install": "curl -fsSL https://ollama.ai/install.sh | sh",
            "ollama_model": f"ollama pull {OLLAMA_MODEL_NAME}",
            "llama_cpp": "pip install llama-cpp-python",
        },
        "jarvisco_home": str(JARVISCO_HOME),
        "models_dir": str(MODELS_DIR),
    }


@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    eng = get_engine()
    if not eng.loaded:
        instructions = (
            "⚠️ Modelo no cargado. Descarga desde la Terminal:\n\n"
            f"1. pip install huggingface-hub\n"
            f"2. huggingface-cli download ibm-granite/granite-3b-code-instruct-2k-GGUF "
            f"{MODEL_FILENAME} --local-dir {MODELS_DIR}\n"
            f"3. Recarga el modelo desde la pantalla de Estado"
        )
        if eng.load_error:
            instructions += f"\n\nError actual: {eng.load_error}"
        return ChatResponse(message=request.message, response=instructions, engine="none")

    result = eng.generate(
        prompt=request.message,
        system_prompt=SYSTEM_PROMPT,
        max_tokens=MAX_TOKENS,
        use_ollama=request.use_advanced,
    )

    response_text = result.get("text", result.get("error", "Sin respuesta"))
    risk_level = None
    risk_desc = None
    try:
        parsed = json.loads(response_text)
        if parsed.get("command"):
            risk_level, risk_desc = adapter.evaluate_command(parsed["command"])
    except (json.JSONDecodeError, TypeError):
        pass

    chat_doc = {
        "id": str(uuid.uuid4()),
        "message": request.message,
        "response": response_text,
        "engine": result.get("engine", "unknown"),
        "risk_level": risk_level,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.chat_history.insert_one(chat_doc)

    return ChatResponse(
        message=request.message,
        response=response_text,
        engine=result.get("engine", "unknown"),
        risk_level=risk_level,
        risk_description=risk_desc,
    )


@api_router.post("/evaluate-risk")
async def evaluate_risk(request: RiskRequest):
    level, desc = adapter.evaluate_command(request.command)
    return {
        "command": request.command,
        "risk_level": level,
        "description": desc,
        "requires_confirmation": adapter.should_confirm(level),
    }


@api_router.post("/analyze")
async def analyze(request: CodeRequest):
    return analyze_code(request.code)


@api_router.post("/execute-code")
async def execute_code(request: ExecuteRequest):
    risk_level, risk_desc = adapter.evaluate_code(request.code, request.language)
    if risk_level == RiskLevel.CRITICAL.value:
        return {"success": False, "error": f"Código bloqueado: {risk_desc}", "risk_level": risk_level}
    result = sandbox.execute(request.code, request.language)
    return {
        "success": result.success,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "exit_code": result.exit_code,
        "execution_time": result.execution_time,
        "error": result.error_message,
        "risk_level": risk_level,
    }


@api_router.get("/system-info")
async def system_info():
    info = adapter.get_system_info()
    info["jarvisco_home"] = str(JARVISCO_HOME)
    info["models_dir"] = str(MODELS_DIR)
    return info


@api_router.post("/models/reload")
async def reload_models():
    global engine
    engine = LlamaEngine(MODEL_PATH, OLLAMA_MODEL_NAME)
    return {
        "success": engine.loaded,
        "loaded": engine.loaded,
        "error": engine.load_error,
        "message": "Modelo cargado correctamente" if engine.loaded else f"No se pudo cargar: {engine.load_error}",
    }


@api_router.get("/chat/history")
async def get_chat_history():
    docs = await db.chat_history.find({}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return docs


# --- WebSocket Terminal ---
@app.websocket("/api/ws/terminal")
async def terminal_ws(websocket: WebSocket):
    await websocket.accept()
    cwd = str(Path.home())
    await websocket.send_json({"type": "init", "cwd": cwd})

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            command = msg.get("command", "").strip()

            if not command:
                continue

            # Handle cd
            if command == "cd" or command.startswith("cd "):
                target = command[3:].strip() if len(command) > 2 else ""
                if not target or target == "~":
                    cwd = str(Path.home())
                else:
                    new_path = Path(target) if target.startswith("/") else Path(cwd) / target
                    resolved = new_path.resolve()
                    if resolved.is_dir():
                        cwd = str(resolved)
                    else:
                        await websocket.send_json({
                            "type": "stderr",
                            "data": f"bash: cd: {target}: No existe el directorio\n"
                        })
                await websocket.send_json({"type": "done", "cwd": cwd, "returncode": 0})
                continue

            # Handle clear
            if command == "clear":
                await websocket.send_json({"type": "clear"})
                await websocket.send_json({"type": "done", "cwd": cwd, "returncode": 0})
                continue

            # Execute command
            try:
                process = await asyncio.create_subprocess_shell(
                    command,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=cwd,
                    env={**os.environ, "HOME": str(Path.home()), "TERM": "xterm"},
                )

                async def read_stream(stream, stype):
                    while True:
                        line = await stream.readline()
                        if not line:
                            break
                        await websocket.send_json({
                            "type": stype,
                            "data": line.decode("utf-8", errors="replace"),
                        })

                try:
                    await asyncio.wait_for(
                        asyncio.gather(
                            read_stream(process.stdout, "stdout"),
                            read_stream(process.stderr, "stderr"),
                        ),
                        timeout=120,
                    )
                    returncode = await process.wait()
                except asyncio.TimeoutError:
                    process.kill()
                    await websocket.send_json({"type": "stderr", "data": "⏰ Timeout (120s)\n"})
                    returncode = -1

                await websocket.send_json({"type": "done", "cwd": cwd, "returncode": returncode})

            except Exception as e:
                await websocket.send_json({"type": "stderr", "data": f"Error: {e}\n"})
                await websocket.send_json({"type": "done", "cwd": cwd, "returncode": 1})

    except WebSocketDisconnect:
        logger.info("Terminal WebSocket desconectado")
    except Exception as e:
        logger.error(f"Terminal WS error: {e}")


# --- App setup ---
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
