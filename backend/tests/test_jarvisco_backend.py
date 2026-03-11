"""Backend API tests for JarvisCO

Tests:
- API health check
- Model status endpoint
- Risk evaluation (LOW, MEDIUM, CRITICAL)
- Code analysis (Python with/without syntax errors)
- Chat endpoint (model not loaded scenario)
- Model reload
- Code execution
- System info
- Chat history
"""
import pytest
import requests
import os
import time

# Get backend URL from environment - NO DEFAULT
BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL')
if not BACKEND_URL:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL environment variable not set")

BACKEND_URL = BACKEND_URL.rstrip('/')


class TestAPIHealth:
    """Test API root endpoint"""

    def test_api_root(self):
        """Test GET /api/ returns status message"""
        try:
            response = requests.get(f"{BACKEND_URL}/api/", timeout=10)
            print(f"✓ API root status code: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ API root response: {data}")
            assert "message" in data
            assert "JarvisCO" in data["message"]
            assert "status" in data
            print("✓ API health check passed")
        except Exception as e:
            print(f"✗ API health check failed: {e}")
            raise


class TestModelManagement:
    """Test model status and management endpoints"""

    def test_get_model_status(self):
        """Test GET /api/models/status returns model status with download instructions"""
        try:
            response = requests.get(f"{BACKEND_URL}/api/models/status", timeout=10)
            print(f"✓ Model status code: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Model status keys: {list(data.keys())}")
            
            # Verify structure
            assert "primary_model" in data
            assert "ollama_model" in data
            assert "download_instructions" in data
            assert "llama_cpp_installed" in data
            
            # Verify primary model info
            assert "name" in data["primary_model"]
            assert "downloaded" in data["primary_model"]
            assert "loaded" in data["primary_model"]
            
            # Verify download instructions exist
            assert "primary" in data["download_instructions"]
            assert "llama_cpp" in data["download_instructions"]
            
            print(f"✓ Primary model: {data['primary_model']['name']}")
            print(f"✓ Downloaded: {data['primary_model']['downloaded']}")
            print(f"✓ Loaded: {data['primary_model']['loaded']}")
            print("✓ Model status endpoint passed")
        except Exception as e:
            print(f"✗ Model status test failed: {e}")
            raise

    def test_reload_models(self):
        """Test POST /api/models/reload attempts to reload models"""
        try:
            response = requests.post(f"{BACKEND_URL}/api/models/reload", timeout=10)
            print(f"✓ Reload models status code: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Reload response: {data}")
            assert "success" in data
            assert "loaded" in data
            assert "message" in data
            print("✓ Model reload endpoint passed")
        except Exception as e:
            print(f"✗ Model reload test failed: {e}")
            raise


class TestRiskEvaluation:
    """Test command risk evaluation endpoint"""

    def test_evaluate_risk_low(self):
        """Test POST /api/evaluate-risk with 'ls -la' returns LOW risk"""
        try:
            response = requests.post(
                f"{BACKEND_URL}/api/evaluate-risk",
                json={"command": "ls -la"},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            print(f"✓ Risk evaluation (ls -la) status code: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Risk response: {data}")
            assert data["risk_level"] == "LOW"
            assert data["command"] == "ls -la"
            assert "description" in data
            assert "requires_confirmation" in data
            print("✓ Low risk evaluation passed")
        except Exception as e:
            print(f"✗ Low risk evaluation failed: {e}")
            raise

    def test_evaluate_risk_critical(self):
        """Test POST /api/evaluate-risk with 'rm -rf /' returns CRITICAL risk"""
        try:
            response = requests.post(
                f"{BACKEND_URL}/api/evaluate-risk",
                json={"command": "rm -rf /"},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            print(f"✓ Risk evaluation (rm -rf /) status code: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Risk response: {data}")
            assert data["risk_level"] == "CRITICAL"
            assert data["command"] == "rm -rf /"
            assert data["requires_confirmation"] == True
            print("✓ Critical risk evaluation passed")
        except Exception as e:
            print(f"✗ Critical risk evaluation failed: {e}")
            raise

    def test_evaluate_risk_medium(self):
        """Test POST /api/evaluate-risk with 'mkdir test' returns MEDIUM risk"""
        try:
            response = requests.post(
                f"{BACKEND_URL}/api/evaluate-risk",
                json={"command": "mkdir test"},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            print(f"✓ Risk evaluation (mkdir test) status code: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Risk response: {data}")
            assert data["risk_level"] == "MEDIUM"
            assert data["command"] == "mkdir test"
            print("✓ Medium risk evaluation passed")
        except Exception as e:
            print(f"✗ Medium risk evaluation failed: {e}")
            raise


class TestCodeAnalysis:
    """Test Python code analysis endpoint"""

    def test_analyze_valid_code(self):
        """Test POST /api/analyze with valid Python code returns analysis with imports/functions/classes"""
        try:
            test_code = """import os
import sys

def hello():
    print('hello')

class MyClass:
    pass
"""
            response = requests.post(
                f"{BACKEND_URL}/api/analyze",
                json={"code": test_code, "language": "python"},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            print(f"✓ Code analysis status code: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Analysis response: {data}")
            assert data["success"] == True
            assert "imports" in data
            assert "functions" in data
            assert "classes" in data
            assert "complexity" in data
            assert "lines_of_code" in data
            
            # Verify detected imports
            assert "os" in data["imports"]
            assert "sys" in data["imports"]
            
            # Verify detected functions
            assert "hello" in data["functions"]
            
            # Verify detected classes
            assert "MyClass" in data["classes"]
            
            print(f"✓ Detected imports: {data['imports']}")
            print(f"✓ Detected functions: {data['functions']}")
            print(f"✓ Detected classes: {data['classes']}")
            print("✓ Valid code analysis passed")
        except Exception as e:
            print(f"✗ Valid code analysis failed: {e}")
            raise

    def test_analyze_syntax_error(self):
        """Test POST /api/analyze with syntax error code returns success:false with syntax_error"""
        try:
            test_code = """def broken(
    print('missing closing parenthesis'
"""
            response = requests.post(
                f"{BACKEND_URL}/api/analyze",
                json={"code": test_code, "language": "python"},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            print(f"✓ Syntax error analysis status code: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Syntax error response: {data}")
            assert data["success"] == False
            assert "syntax_error" in data
            assert data["syntax_error"] is not None
            print(f"✓ Syntax error detected: {data['syntax_error']}")
            print("✓ Syntax error analysis passed")
        except Exception as e:
            print(f"✗ Syntax error analysis failed: {e}")
            raise


class TestChat:
    """Test chat endpoint (model not loaded scenario)"""

    def test_chat_no_model(self):
        """Test POST /api/chat returns response (model not loaded message expected)"""
        try:
            response = requests.post(
                f"{BACKEND_URL}/api/chat",
                json={"message": "Hello JarvisCO", "use_advanced": False},
                headers={"Content-Type": "application/json"},
                timeout=15
            )
            print(f"✓ Chat status code: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Chat response keys: {list(data.keys())}")
            assert "message" in data
            assert "response" in data
            assert "engine" in data
            
            # Since model is not downloaded, expect instructions message
            print(f"✓ Chat response: {data['response'][:100]}...")
            print(f"✓ Engine: {data['engine']}")
            print("✓ Chat endpoint passed (model not loaded as expected)")
        except Exception as e:
            print(f"✗ Chat test failed: {e}")
            raise


class TestCodeExecution:
    """Test code execution endpoint"""

    def test_execute_safe_code(self):
        """Test POST /api/execute-code with safe Python code executes successfully"""
        try:
            test_code = "print('Hello from JarvisCO')"
            response = requests.post(
                f"{BACKEND_URL}/api/execute-code",
                json={"code": test_code, "language": "python"},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            print(f"✓ Code execution status code: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Execution response: {data}")
            assert "success" in data
            assert "stdout" in data
            assert "risk_level" in data
            
            # For safe print statement, should succeed
            print(f"✓ Execution success: {data['success']}")
            print(f"✓ Stdout: {data['stdout']}")
            print("✓ Safe code execution passed")
        except Exception as e:
            print(f"✗ Code execution test failed: {e}")
            raise


class TestSystemInfo:
    """Test system info endpoint"""

    def test_get_system_info(self):
        """Test GET /api/system-info returns system information"""
        try:
            response = requests.get(f"{BACKEND_URL}/api/system-info", timeout=10)
            print(f"✓ System info status code: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ System info: {data}")
            assert "pwd" in data
            assert "user" in data
            assert "os" in data
            assert "jarvisco_home" in data
            print("✓ System info endpoint passed")
        except Exception as e:
            print(f"✗ System info test failed: {e}")
            raise


class TestChatHistory:
    """Test chat history endpoint"""

    def test_get_chat_history(self):
        """Test GET /api/chat/history returns chat history array"""
        try:
            response = requests.get(f"{BACKEND_URL}/api/chat/history", timeout=10)
            print(f"✓ Chat history status code: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Chat history type: {type(data)}")
            assert isinstance(data, list)
            print(f"✓ Chat history items: {len(data)}")
            print("✓ Chat history endpoint passed")
        except Exception as e:
            print(f"✗ Chat history test failed: {e}")
            raise
