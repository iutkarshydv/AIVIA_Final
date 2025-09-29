# Create the database models (app/models/session.py)
session_model_py_content = '''"""
AIVIA MVP Database Models
SQLAlchemy models for users, sessions, and conversations
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class User(Base):
    """User model for basic authentication and session tracking."""
    
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    sessions = relationship("InterviewSession", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"


class InterviewSession(Base):
    """Interview session model."""
    
    __tablename__ = "interview_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    target_role = Column(String(100), nullable=False)  # SDE, Data Analysis, Full Stack, etc.
    elevenlabs_agent_id = Column(String(255), nullable=False)
    resume_text = Column(Text, nullable=True)  # Raw resume text as knowledge base
    status = Column(String(20), default="active", nullable=False)  # active, completed, terminated
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("status IN ('active', 'completed', 'terminated')", name="valid_status"),
    )
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    messages = relationship("ConversationMessage", back_populates="session", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<InterviewSession(id={self.id}, role={self.target_role}, status={self.status})>"


class ConversationMessage(Base):
    """Conversation message model for storing interview dialogue."""
    
    __tablename__ = "conversation_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False)
    speaker = Column(String(20), nullable=False)  # 'interviewer', 'candidate'
    message_text = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("speaker IN ('interviewer', 'candidate')", name="valid_speaker"),
    )
    
    # Relationships
    session = relationship("InterviewSession", back_populates="messages")
    
    def __repr__(self):
        return f"<ConversationMessage(id={self.id}, speaker={self.speaker}, session_id={self.session_id})>"
'''

with open('session_model.py', 'w') as f:
    f.write(session_model_py_content)

print("✅ Created session_model.py - Database models")