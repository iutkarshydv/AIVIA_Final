# Create the session manager (app/services/session_manager.py)
session_manager_py_content = '''"""
AIVIA MVP Session Manager
Manage interview sessions in the database
"""
import logging
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
import uuid

from app.models.session import InterviewSession, User
from app.database import SessionLocal


class SessionManager:
    """
    Manage interview sessions and database operations.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    async def create_session(
        self,
        db: Session,
        session_id: str,
        target_role: str,
        agent_id: str,
        resume_text: str,
        user_email: Optional[str] = None
    ) -> InterviewSession:
        """
        Create a new interview session in the database.
        """
        try:
            # Create or get user if email provided
            user_id = None
            if user_email:
                user = db.query(User).filter(User.email == user_email).first()
                if not user:
                    user = User(
                        id=str(uuid.uuid4()),
                        email=user_email
                    )
                    db.add(user)
                    db.flush()
                user_id = user.id
            
            # Create interview session
            session = InterviewSession(
                id=session_id,
                user_id=user_id,
                target_role=target_role,
                elevenlabs_agent_id=agent_id,
                resume_text=resume_text,
                status="active",
                started_at=datetime.utcnow()
            )
            
            db.add(session)
            db.commit()
            db.refresh(session)
            
            self.logger.info(f"Created interview session {session_id} for role {target_role}")
            return session
            
        except Exception as e:
            db.rollback()
            self.logger.error(f"Failed to create session {session_id}: {str(e)}")
            raise
    
    async def get_session(self, db: Session, session_id: str) -> Optional[InterviewSession]:
        """
        Get interview session by ID.
        """
        try:
            session = db.query(InterviewSession).filter(
                InterviewSession.id == session_id
            ).first()
            return session
            
        except Exception as e:
            self.logger.error(f"Failed to get session {session_id}: {str(e)}")
            return None
    
    async def complete_session(self, db: Session, session_id: str) -> bool:
        """
        Mark interview session as completed.
        """
        try:
            session = db.query(InterviewSession).filter(
                InterviewSession.id == session_id
            ).first()
            
            if not session:
                self.logger.warning(f"Session {session_id} not found for completion")
                return False
            
            session.status = "completed"
            session.completed_at = datetime.utcnow()
            
            db.commit()
            
            self.logger.info(f"Completed interview session {session_id}")
            return True
            
        except Exception as e:
            db.rollback()
            self.logger.error(f"Failed to complete session {session_id}: {str(e)}")
            return False
    
    async def terminate_session(self, db: Session, session_id: str) -> bool:
        """
        Mark interview session as terminated (error case).
        """
        try:
            session = db.query(InterviewSession).filter(
                InterviewSession.id == session_id
            ).first()
            
            if not session:
                self.logger.warning(f"Session {session_id} not found for termination")
                return False
            
            session.status = "terminated"
            session.completed_at = datetime.utcnow()
            
            db.commit()
            
            self.logger.info(f"Terminated interview session {session_id}")
            return True
            
        except Exception as e:
            db.rollback()
            self.logger.error(f"Failed to terminate session {session_id}: {str(e)}")
            return False
    
    async def get_active_sessions(self, db: Session, limit: int = 100) -> List[InterviewSession]:
        """
        Get list of active interview sessions.
        """
        try:
            sessions = db.query(InterviewSession).filter(
                InterviewSession.status == "active"
            ).order_by(InterviewSession.started_at.desc()).limit(limit).all()
            
            return sessions
            
        except Exception as e:
            self.logger.error(f"Failed to get active sessions: {str(e)}")
            return []
    
    async def get_user_sessions(
        self, 
        db: Session, 
        user_email: str, 
        limit: int = 50
    ) -> List[InterviewSession]:
        """
        Get interview sessions for a specific user.
        """
        try:
            sessions = db.query(InterviewSession).join(User).filter(
                User.email == user_email
            ).order_by(InterviewSession.started_at.desc()).limit(limit).all()
            
            return sessions
            
        except Exception as e:
            self.logger.error(f"Failed to get user sessions for {user_email}: {str(e)}")
            return []
    
    async def cleanup_old_sessions(self, db: Session, days: int = 7) -> int:
        """
        Clean up old completed/terminated sessions.
        """
        try:
            from datetime import timedelta
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            deleted_count = db.query(InterviewSession).filter(
                and_(
                    InterviewSession.status.in_(["completed", "terminated"]),
                    InterviewSession.completed_at < cutoff_date
                )
            ).delete()
            
            db.commit()
            
            self.logger.info(f"Cleaned up {deleted_count} old sessions")
            return deleted_count
            
        except Exception as e:
            db.rollback()
            self.logger.error(f"Failed to cleanup old sessions: {str(e)}")
            return 0
'''

with open('session_manager.py', 'w') as f:
    f.write(session_manager_py_content)

print("✅ Created session_manager.py - Session management service")