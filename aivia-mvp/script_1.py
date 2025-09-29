# Create the main FastAPI application (app/main.py)
main_py_content = '''"""
AIVIA MVP - FastAPI Main Application
AI Mock Interview Platform with ElevenLabs Integration
"""
import logging
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import uuid
import asyncio
from datetime import datetime
import os

from app.config import settings
from app.database import get_db
from app.services.elevenlabs_service import ElevenLabsService, AgentCreationResult
from app.services.text_extractor import SimpleTextExtractor, TextExtractionError
from app.services.session_manager import SessionManager
from app.models.session import InterviewSession
from app.utils.logging import setup_logging
from app.utils.exceptions import AIVIAException

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AIVIA MVP API",
    description="AI Mock Interview Platform with ElevenLabs Integration",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
elevenlabs_service = ElevenLabsService(settings.elevenlabs_api_key)
text_extractor = SimpleTextExtractor()
session_manager = SessionManager()

# Pydantic models for API
class InterviewStartRequest(BaseModel):
    role: str  # SDE, Data Analysis, Full Stack, Backend, Frontend, DevOps
    user_email: Optional[EmailStr] = None

class InterviewStartResponse(BaseModel):
    session_id: str
    agent_id: str
    websocket_url: str
    message: str

class RoleInfo(BaseModel):
    id: str
    name: str

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    active_agents: int

# Exception handlers
@app.exception_handler(AIVIAException)
async def aivia_exception_handler(request, exc: AIVIAException):
    logger.error(f"AIVIA Exception: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.message, "type": exc.__class__.__name__}
    )

@app.exception_handler(ValueError)
async def value_error_handler(request, exc: ValueError):
    logger.error(f"Value Error: {str(exc)}")
    return JSONResponse(
        status_code=400,
        content={"error": str(exc), "type": "ValueError"}
    )

# Routes
@app.get("/", response_model=dict)
async def root():
    """Root endpoint with API information."""
    return {
        "message": "AIVIA MVP API",
        "description": "AI Mock Interview Platform with ElevenLabs Integration",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow(),
        active_agents=elevenlabs_service.get_active_agent_count()
    )

@app.get("/api/roles", response_model=List[RoleInfo])
async def get_available_roles():
    """Get list of available job roles for interviews."""
    roles = [
        {"id": "SDE", "name": "Software Development Engineer"},
        {"id": "Data Analysis", "name": "Data Analyst"},
        {"id": "Full Stack", "name": "Full Stack Developer"},
        {"id": "Backend", "name": "Backend Developer"},
        {"id": "Frontend", "name": "Frontend Developer"},
        {"id": "DevOps", "name": "DevOps Engineer"}
    ]
    return roles

@app.post("/api/interview/start", response_model=InterviewStartResponse)
async def start_interview(
    request: InterviewStartRequest,
    resume_file: UploadFile = File(...),
    db=Depends(get_db)
):
    """
    Start a new interview session with direct agent creation.
    """
    try:
        # Validate role
        valid_roles = {"SDE", "Data Analysis", "Full Stack", "Backend", "Frontend", "DevOps"}
        if request.role not in valid_roles:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
            )

        # Validate file type
        if not resume_file.filename.lower().endswith(('.pdf', '.docx', '.doc')):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only PDF and DOCX files are supported."
            )

        # Save uploaded file temporarily
        upload_dir = settings.upload_dir
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, f"{uuid.uuid4()}_{resume_file.filename}")
        
        with open(file_path, "wb") as buffer:
            content = await resume_file.read()
            if len(content) > settings.max_file_size:
                raise HTTPException(
                    status_code=400,
                    detail=f"File too large. Maximum size is {settings.max_file_size} bytes."
                )
            buffer.write(content)

        # Extract text from resume
        try:
            file_ext = os.path.splitext(resume_file.filename)[1]
            resume_text = await text_extractor.extract_text_from_file(file_path, file_ext)
        except TextExtractionError as e:
            raise HTTPException(status_code=400, detail=f"Text extraction failed: {str(e)}")
        finally:
            # Clean up uploaded file
            if os.path.exists(file_path):
                os.remove(file_path)

        # Generate session ID
        session_id = str(uuid.uuid4())

        # Create ElevenLabs agent
        agent_result = await elevenlabs_service.create_interview_agent(
            session_id=session_id,
            role=request.role,
            resume_text=resume_text
        )

        if not agent_result.success:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create interview agent: {agent_result.error_message}"
            )

        # Get WebSocket URL
        websocket_url = await elevenlabs_service.get_websocket_url(agent_result.agent_id)
        if not websocket_url:
            raise HTTPException(status_code=500, detail="Failed to generate WebSocket URL")

        # Save session to database
        session = await session_manager.create_session(
            db=db,
            session_id=session_id,
            user_email=request.user_email,
            target_role=request.role,
            agent_id=agent_result.agent_id,
            resume_text=resume_text
        )

        logger.info(f"Successfully started interview session {session_id} for role {request.role}")

        return InterviewStartResponse(
            session_id=session_id,
            agent_id=agent_result.agent_id,
            websocket_url=websocket_url,
            message=f"Interview session created successfully for {request.role} role"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error starting interview: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/interview/{session_id}/complete")
async def complete_interview(session_id: str, db=Depends(get_db)):
    """
    Complete interview and cleanup resources.
    """
    try:
        # Get session from database
        session = await session_manager.get_session(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Update session status
        await session_manager.complete_session(db, session_id)

        # Delete ElevenLabs agent
        cleanup_success = await elevenlabs_service.delete_agent(session.elevenlabs_agent_id)
        
        if not cleanup_success:
            logger.warning(f"Failed to cleanup agent {session.elevenlabs_agent_id} for session {session_id}")

        logger.info(f"Interview session {session_id} completed successfully")

        return {"message": "Interview completed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing interview {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/interview/{session_id}/status")
async def get_interview_status(session_id: str, db=Depends(get_db)):
    """
    Get current interview session status.
    """
    try:
        session = await session_manager.get_session(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        return {
            "session_id": session.id,
            "role": session.target_role,
            "status": session.status,
            "started_at": session.started_at,
            "completed_at": session.completed_at
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session status {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Application startup tasks."""
    logger.info("AIVIA MVP API starting up...")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Debug mode: {settings.debug}")

@app.on_event("shutdown") 
async def shutdown_event():
    """Application shutdown tasks."""
    logger.info("AIVIA MVP API shutting down...")
    # Cleanup any remaining agents
    active_count = elevenlabs_service.get_active_agent_count()
    if active_count > 0:
        logger.warning(f"Shutting down with {active_count} active agents")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )
'''

with open('main.py', 'w') as f:
    f.write(main_py_content)

print("✅ Created main.py - FastAPI application")