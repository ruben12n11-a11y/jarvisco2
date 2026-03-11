"""llama_engine.py – Motor LLM dual: granite-3b (primario) + Ollama (avanzado)."""
import logging
import subprocess
import shutil
import json
from pathlib import Path
from typing import Dict

logger = logging.getLogger(__name__)

LLAMA_CPP_AVAILABLE = False
Llama = None
try:
    from llama_cpp import Llama as _Llama
    Llama = _Llama
    LLAMA_CPP_AVAILABLE = True
    logger.info("llama-cpp-python disponible")
except ImportError:
    logger.warning("llama-cpp-python no instalado")


class LlamaEngine:
    """Motor dual: granite-3b-code-instruct (primario) + granite3.1-moe via Ollama."""

    def __init__(self, model_path: Path, ollama_model: str = "granite3.1-moe"):
        self.model_path = model_path
        self.ollama_model = ollama_model
        self.llm = None
        self.loaded = False
        self.load_error = None
        self._try_load()

    def _try_load(self):
        if not LLAMA_CPP_AVAILABLE:
            self.load_error = "llama-cpp-python no instalado"
            return
        if not self.model_path.exists():
            self.load_error = f"Modelo no encontrado: {self.model_path}"
            return
        try:
            self.llm = Llama(
                model_path=str(self.model_path),
                n_ctx=4096,
                n_threads=4,
                n_gpu_layers=0,
                verbose=False,
            )
            self.loaded = True
            self.load_error = None
            logger.info(f"Modelo cargado: {self.model_path.name}")
        except Exception as e:
            self.load_error = str(e)
            logger.error(f"Error cargando modelo: {e}")

    def reload(self):
        self.llm = None
        self.loaded = False
        self.load_error = None
        self._try_load()

    def generate(self, prompt: str, system_prompt: str = "",
                 max_tokens: int = 512, use_ollama: bool = False) -> Dict:
        if use_ollama:
            result = self._generate_ollama(prompt, system_prompt, max_tokens)
            if result.get("success"):
                return result
            logger.warning("Ollama falló, usando modelo primario")

        return self._generate_primary(prompt, system_prompt, max_tokens)

    def _generate_primary(self, prompt: str, system_prompt: str = "",
                          max_tokens: int = 512) -> Dict:
        if not self.loaded:
            return {"success": False, "error": self.load_error or "Modelo no cargado", "text": ""}
        full_prompt = f"{system_prompt}\n\nUsuario: {prompt}\nAsistente:" if system_prompt else prompt
        try:
            output = self.llm(
                full_prompt,
                max_tokens=max_tokens,
                temperature=0.2,
                stop=["Usuario:", "</s>", "\n\n\n"],
            )
            text = output["choices"][0]["text"].strip()
            return {"success": True, "text": text, "engine": "granite-3b"}
        except Exception as e:
            return {"success": False, "error": str(e), "text": ""}

    def _generate_ollama(self, prompt: str, system_prompt: str = "",
                         max_tokens: int = 512) -> Dict:
        if not shutil.which("ollama"):
            return {"success": False, "error": "Ollama no instalado"}
        full_prompt = f"{system_prompt}\n\nUsuario: {prompt}\nAsistente:" if system_prompt else prompt
        try:
            result = subprocess.run(
                ["ollama", "run", self.ollama_model, full_prompt],
                capture_output=True, text=True, timeout=60,
            )
            if result.returncode == 0:
                return {"success": True, "text": result.stdout.strip(), "engine": "granite3.1-moe"}
            return {"success": False, "error": result.stderr}
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Ollama timeout (60s)"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def is_ollama_available(self) -> bool:
        if not shutil.which("ollama"):
            return False
        try:
            result = subprocess.run(["ollama", "list"], capture_output=True, text=True, timeout=5)
            return self.ollama_model in result.stdout
        except Exception:
            return False

    def get_status(self) -> Dict:
        return {
            "llama_cpp_installed": LLAMA_CPP_AVAILABLE,
            "model_exists": self.model_path.exists(),
            "model_loaded": self.loaded,
            "load_error": self.load_error,
            "ollama_installed": shutil.which("ollama") is not None,
            "ollama_model_available": self.is_ollama_available(),
        }
