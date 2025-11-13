"""
AIVIA MVP Database Models
SQLAlchemy models for users, sessions, and conversations
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, CheckConstraint, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import uuid
import bcrypt

from app.database import Base
from app.config import settings


class User(Base):
    """User model for authentication and session tracking."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    # Relationships
    sessions = relationship("InterviewSession", back_populates="user", cascade="all, delete-orphan")
    auth_sessions = relationship("AuthSession", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, username={self.username})>"
    
    def set_password(self, password):
        """Hash and set the user password."""
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
    
    def check_password(self, password):
        """Check if provided password matches stored hash."""
        password_bytes = password.encode('utf-8')
        stored_hash = self.password_hash.encode('utf-8')
        return bcrypt.checkpw(password_bytes, stored_hash)


class AuthSession(Base):
    """Authentication session model for server-side session management."""
    
    __tablename__ = "auth_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_token = Column(String(255), nullable=False, unique=True, index=True)
    user_agent = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)  # IPv6 support
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    last_accessed = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="auth_sessions")
    
    # Indexes for quick lookups
    __table_args__ = (
        Index('idx_auth_sessions_token_active', session_token, is_active),
    )
    
    def __repr__(self):
        return f"<AuthSession(id={self.id}, user_id={self.user_id}, active={self.is_active})>"
    
    @property
    def is_expired(self):
        """Check if the session has expired."""
        return datetime.utcnow() > self.expires_at
    
    @classmethod
    def create_for_user(cls, user_id, user_agent=None, ip_address=None):
        """Create a new session for the given user."""
        expiry = datetime.utcnow() + timedelta(seconds=settings.session_expiry)
        session_token = str(uuid.uuid4())
        
        return cls(
            user_id=user_id,
            session_token=session_token,
            user_agent=user_agent,
            ip_address=ip_address,
            expires_at=expiry
        )


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
