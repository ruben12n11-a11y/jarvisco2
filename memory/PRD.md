# JarvisCO - Copiloto IA Offline

## Descripción
App móvil (Expo/React Native) + Backend (FastAPI) que funciona como copiloto de desarrollo con motor LLM dual offline.

## Arquitectura
- **Motor Primario**: `granite-3b-code-instruct.Q4_K_M.gguf` via `llama-cpp-python` (siempre activo)
- **Motor Avanzado**: `granite3.1-moe` via Ollama (análisis complejos)
- **Fallback**: Si Ollama falla → modelo primario

## Funcionalidades
1. **Terminal Interactiva** - WebSocket con acceso real al shell
2. **Chat con JarvisCO** - Copiloto IA con evaluación de riesgos
3. **Analizador de Código** - Análisis AST de Python (imports, funciones, clases, complejidad)
4. **Evaluador de Riesgos** - Clasifica comandos: LOW/MEDIUM/HIGH/CRITICAL
5. **Gestión de Modelos** - Estado, instrucciones de descarga, recarga

## Flujo de Setup
1. Usuario abre la app → pantalla de Estado muestra instrucciones
2. Va a Terminal → ejecuta comandos para descargar el modelo GGUF
3. Recarga modelos desde la pantalla de Estado
4. JarvisCO funcional 100% offline

## Stack
- Frontend: Expo SDK 54, React Native, TypeScript
- Backend: FastAPI, llama-cpp-python, MongoDB (motor)
- LLM: llama-cpp-python (GGUF) + Ollama

## API Endpoints
- `GET /api/models/status` - Estado de modelos
- `POST /api/chat` - Chat con JarvisCO
- `POST /api/evaluate-risk` - Evaluar riesgo de comando
- `POST /api/analyze` - Analizar código Python
- `POST /api/execute-code` - Ejecutar código en sandbox
- `POST /api/models/reload` - Recargar modelos
- `WS /api/ws/terminal` - Terminal WebSocket

## Autor
Sergio Alberto Sanchez Echeverria
