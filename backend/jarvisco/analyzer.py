"""analyzer.py - Analizador de Código Python usando AST."""
import ast
import logging
from typing import Dict

logger = logging.getLogger(__name__)


class CodeAnalyzer:
    def __init__(self, source_code: str):
        self.source_code = source_code
        self.imports = []
        self.functions = []
        self.classes = []
        self.complexity = 0
        self.syntax_error = None
        self.tree = None

    def analyze(self):
        try:
            self.tree = ast.parse(self.source_code)
        except SyntaxError as e:
            self.syntax_error = f"{e.__class__.__name__}: {e.msg} (línea {e.lineno})"
            return
        except Exception as e:
            self.syntax_error = f"{e.__class__.__name__}: {str(e)}"
            return

        for node in ast.walk(self.tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    self.imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    self.imports.append(node.module)
            elif isinstance(node, ast.FunctionDef):
                self.functions.append(node.name)
                self.complexity += self._calc_complexity(node)
            elif isinstance(node, ast.ClassDef):
                self.classes.append(node.name)

        total_nodes = sum(1 for _ in ast.walk(self.tree))
        self.complexity += total_nodes // 50

    def _calc_complexity(self, func_node) -> int:
        complexity = 1
        for node in ast.walk(func_node):
            if isinstance(node, (ast.If, ast.For, ast.While, ast.And, ast.Or,
                                 ast.Try, ast.With, ast.ExceptHandler)):
                complexity += 1
        return complexity

    def report(self) -> Dict:
        if self.syntax_error:
            return {
                "success": False,
                "syntax_error": self.syntax_error,
                "imports": [], "functions": [], "classes": [],
                "complexity": None,
                "lines_of_code": len(self.source_code.splitlines()),
            }
        unique_imports = list(set(filter(None, self.imports)))
        return {
            "success": True,
            "syntax_error": None,
            "imports": unique_imports,
            "functions": self.functions,
            "classes": self.classes,
            "complexity": self.complexity,
            "lines_of_code": len(self.source_code.splitlines()),
            "total_imports": len(unique_imports),
            "total_functions": len(self.functions),
            "total_classes": len(self.classes),
        }


def analyze_code(source_code: str) -> Dict:
    analyzer = CodeAnalyzer(source_code)
    analyzer.analyze()
    return analyzer.report()
