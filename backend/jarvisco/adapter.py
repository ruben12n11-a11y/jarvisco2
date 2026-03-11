"""adapter.py – Evaluador de riesgos sin IA."""
import re
import logging
import subprocess
from enum import Enum
from typing import Tuple

logger = logging.getLogger(__name__)


class RiskLevel(Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class JarvisCOAdapter:
    """Evaluador de riesgos basado en expresiones regulares."""

    def __init__(self):
        self.critical_patterns = [
            r"\bsudo\b", r"\bdd\b", r"\bmkfs\b", r"\bfdisk\b",
            r"\bparted\b", r"\bgrub\b", r"\bbootloader\b",
            r"\bkill\s+-9\b", r"\brm\s+-rf\s+/", r"\brm\s+\*",
            r"\bformat\b", r"\bwipe\b", r"\bshred\b",
            r"\bmount\b", r"\bumount\b",
        ]
        self.high_patterns = [
            r"\brm\b", r"\bmv\b", r"\bchmod\b", r"\bchown\b",
            r"\bsystemctl\b", r"\bservice\b", r"\bkill\b",
            r"\bpkill\b", r"\breboot\b", r"\bshutdown\b",
            r"\bsync\b", r"\bfstab\b", r">\s*/dev/",
        ]
        self.medium_patterns = [
            r"\bmkdir\b", r"\btouch\b", r"\bcp\b", r"\bln\b",
            r"\btar\b", r"\bgzip\b", r"\bzip\b", r"\bunzip\b",
            r"\bsed\s+-i\b", r"\bawk\b", r"\bfind\b.*-exec\b",
            r"\bxargs\b", r">\s*\w+",
        ]
        self.safe_patterns = [
            r"\bls\b", r"\bcat\b", r"\becho\b", r"\bpwd\b",
            r"\bdate\b", r"\bwhoami\b", r"\buname\b", r"\bdf\b",
            r"\bdu\b", r"\bps\b", r"\btop\b", r"\bfree\b",
            r"\bhistory\b", r"\bhead\b", r"\btail\b", r"\bwc\b",
            r"\bsort\b", r"\buniq\b", r"\bgrep\b", r"\bless\b",
        ]

    def evaluate_command(self, command: str) -> Tuple[str, str]:
        cmd = command.lower().strip()
        for pat in self.critical_patterns:
            if re.search(pat, cmd):
                return (RiskLevel.CRITICAL.value, f"Comando CRÍTICO detectado: {pat}")
        for pat in self.high_patterns:
            if re.search(pat, cmd):
                return (RiskLevel.HIGH.value, f"Comando de ALTO RIESGO: {pat}")
        for pat in self.medium_patterns:
            if re.search(pat, cmd):
                return (RiskLevel.MEDIUM.value, f"Comando de RIESGO MEDIO: {pat}")
        return (RiskLevel.LOW.value, "Comando seguro")

    def evaluate_code(self, code: str, language: str = "python") -> Tuple[str, str]:
        code_low = code.lower()
        patterns = {
            "python": [
                r"os\.system\(", r"subprocess\.call\(", r"subprocess\.run\(",
                r"exec\(", r"eval\(", r"__import__\(",
                r'open\(.*["\']w["\']', r"shutil\.rmtree",
                r"os\.remove", r"os\.unlink", r"os\.chmod",
            ],
            "bash": [
                r"rm\s+-rf\s+/", r"dd\s+if=", r"mkfs\b",
                r"\bsudo\b", r">\s*/dev/",
            ],
            "javascript": [
                r"eval\(", r"exec\(", r"child_process",
                r"fs\.unlink", r"fs\.rmdir",
            ],
        }
        for pat in patterns.get(language, []):
            if re.search(pat, code_low):
                return (RiskLevel.CRITICAL.value, f"Código {language} CRÍTICO: {pat}")
        return (RiskLevel.LOW.value, "Código seguro")

    def should_confirm(self, risk_level: str) -> bool:
        return risk_level in [RiskLevel.MEDIUM.value, RiskLevel.HIGH.value, RiskLevel.CRITICAL.value]

    def get_system_info(self) -> dict:
        info = {}
        for key, cmd in [("pwd", ["pwd"]), ("user", ["whoami"]), ("os", ["uname", "-a"])]:
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
                info[key] = result.stdout.strip()
            except Exception as e:
                info[key] = f"Error: {e}"
        return info
