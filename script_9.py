# Create exceptions utility (app/utils/exceptions.py)
exceptions_py_content = '''"""
AIVIA MVP Custom Exceptions
Application-specific exception classes
"""


class AIVIAException(Exception):
    """Base exception class for AIVIA application."""
    
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class ElevenLabsError(AIVIAException):
    """Exception for ElevenLabs API related errors."""
    
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(f"ElevenLabs API Error: {message}", status_code)


class AgentCreationError(ElevenLabsError):
    """Exception for agent creation failures."""
    
    def __init__(self, message: str, session_id: str = None):
        session_info = f" (Session: {session_id})" if session_id else ""
        super().__init__(f"Agent creation failed: {message}{session_info}", 502)


class TextExtractionError(AIVIAException):
    """Exception for text extraction failures."""
    
    def __init__(self, message: str):
        super().__init__(f"Text extraction error: {message}", 400)


class SessionError(AIVIAException):
    """Exception for session management errors."""
    
    def __init__(self, message: str, session_id: str = None):
        session_info = f" (Session: {session_id})" if session_id else ""
        super().__init__(f"Session error: {message}{session_info}", 404)


class DatabaseError(AIVIAException):
    """Exception for database operation errors."""
    
    def __init__(self, message: str):
        super().__init__(f"Database error: {message}", 500)


class ValidationError(AIVIAException):
    """Exception for input validation errors."""
    
    def __init__(self, message: str):
        super().__init__(f"Validation error: {message}", 400)


class FileUploadError(AIVIAException):
    """Exception for file upload related errors."""
    
    def __init__(self, message: str):
        super().__init__(f"File upload error: {message}", 400)


class WebSocketError(AIVIAException):
    """Exception for WebSocket related errors."""
    
    def __init__(self, message: str):
        super().__init__(f"WebSocket error: {message}", 500)
'''

with open('exceptions_utils.py', 'w') as f:
    f.write(exceptions_py_content)

print("✅ Created exceptions_utils.py - Custom exceptions")