"""sandbox.py – Ejecución segura de código."""
import subprocess
import time
from dataclasses import dataclass, field


@dataclass
class SandboxResult:
    success: bool = False
    stdout: str = ""
    stderr: str = ""
    exit_code: int = -1
    execution_time: float = 0.0
    error_message: str = ""


class SandboxExecutor:
    def __init__(self, timeout: int = 30):
        self.timeout = timeout

    def execute(self, code: str, language: str = "python") -> SandboxResult:
        cmd_map = {
            "python": ["python3", "-c", code],
            "bash": ["bash", "-c", code],
            "javascript": ["node", "-e", code],
        }
        cmd = cmd_map.get(language)
        if not cmd:
            return SandboxResult(error_message=f"Lenguaje no soportado: {language}")

        start = time.time()
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=self.timeout)
            return SandboxResult(
                success=result.returncode == 0,
                stdout=result.stdout,
                stderr=result.stderr,
                exit_code=result.returncode,
                execution_time=time.time() - start,
            )
        except subprocess.TimeoutExpired:
            return SandboxResult(error_message=f"Timeout ({self.timeout}s)")
        except Exception as e:
            return SandboxResult(error_message=str(e))
