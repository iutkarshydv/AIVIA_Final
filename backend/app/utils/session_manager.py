"""
Session Management Utilities
Handles server-side session storage, validation, and in-memory caching
"""
from typing import Dict, Optional, Any, Union
import time
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import Request, Response

from app.models.session import AuthSession, User
from app.config import settings


class SessionCache:
    """Simple in-memory cache for session data with TTL."""
    
    def __init__(self, ttl_seconds=300):  # Default 5 minute cache TTL
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.ttl_seconds = ttl_seconds
    
    def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Get item from cache if it exists and is not expired."""
        if key not in self.cache:
            return None
        
        item = self.cache[key]
        if time.time() > item['expires_at']:
            # Remove expired item
            self.remove(key)
            return None
            
        return item['data']
    
    def set(self, key: str, data: Dict[str, Any], ttl_override: Optional[int] = None) -> None:
        """Add item to cache with expiration time."""
        ttl = ttl_override if ttl_override is not None else self.ttl_seconds
        self.cache[key] = {
            'data': data,
            'expires_at': time.time() + ttl
        }
    
    def remove(self, key: str) -> None:
        """Remove item from cache."""
        if key in self.cache:
            del self.cache[key]
    
    def clear(self) -> None:
        """Clear all cached items."""
        self.cache.clear()


# Initialize session cache
session_cache = SessionCache()


class SessionManager:
    """Server-side session management with database persistence and in-memory caching."""
    
    def __init__(self):
        self.cookie_name = settings.session_cookie_name
        self.session_expiry = settings.session_expiry
    
    async def create_session(
        self, 
        db: Session, 
        user: User, 
        response: Response,
        request: Request
    ) -> AuthSession:
        """Create a new session for the user and set cookie."""
        # Get request info
        user_agent = request.headers.get("user-agent")
        client_host = request.client.host if request.client else None
        
        # Create session in DB
        auth_session = AuthSession.create_for_user(
            user_id=user.id,
            user_agent=user_agent,
            ip_address=client_host
        )
        
        db.add(auth_session)
        db.commit()
        db.refresh(auth_session)
        
        # Set cookie in response
        self._set_session_cookie(response, auth_session.session_token)
        
        # Cache session data
        session_cache.set(
            auth_session.session_token,
            {
                "user_id": str(user.id),
                "username": user.username,
                "email": user.email,
                "is_active": user.is_active,
            }
        )
        
        return auth_session
    
    async def get_session(
        self, 
        db: Session, 
        request: Request
    ) -> Optional[Dict[str, Any]]:
        """Get the current session data from request."""
        session_token = self._get_session_token(request)
        if not session_token:
            return None
        
        # Try to get session from cache first
        cached_data = session_cache.get(session_token)
        if cached_data:
            return cached_data
        
        # If not in cache, get from database
        auth_session = db.query(AuthSession).filter(
            AuthSession.session_token == session_token,
            AuthSession.is_active == True
        ).first()
        
        if not auth_session or auth_session.is_expired:
            # Cleanup expired session
            if auth_session:
                auth_session.is_active = False
                db.commit()
            return None
        
        # Update last accessed time
        auth_session.last_accessed = datetime.utcnow()
        db.commit()
        
        # Get user data
        user = db.query(User).filter(User.id == auth_session.user_id).first()
        if not user or not user.is_active:
            return None
        
        # Create session data dict
        session_data = {
            "user_id": str(user.id),
            "username": user.username,
            "email": user.email,
            "is_active": user.is_active,
        }
        
        # Cache for future requests
        session_cache.set(session_token, session_data)
        
        return session_data
    
    async def end_session(
        self, 
        db: Session, 
        request: Request, 
        response: Response
    ) -> bool:
        """End the current user session."""
        session_token = self._get_session_token(request)
        if not session_token:
            return False
        
        # Remove from cache
        session_cache.remove(session_token)
        
        # Deactivate in database
        auth_session = db.query(AuthSession).filter(
            AuthSession.session_token == session_token
        ).first()
        
        if auth_session:
            auth_session.is_active = False
            db.commit()
        
        # Clear cookie
        response.delete_cookie(
            key=self.cookie_name,
            path="/",
            domain=None,
            secure=True,
            httponly=True,
            samesite="lax"
        )
        
        return True
    
    async def refresh_session(
        self, 
        db: Session, 
        request: Request, 
        response: Response
    ) -> bool:
        """Refresh the expiry time of the current session."""
        session_token = self._get_session_token(request)
        if not session_token:
            return False
        
        auth_session = db.query(AuthSession).filter(
            AuthSession.session_token == session_token,
            AuthSession.is_active == True
        ).first()
        
        if not auth_session or auth_session.is_expired:
            return False
        
        # Update expiry
        auth_session.expires_at = datetime.utcnow() + timedelta(seconds=self.session_expiry)
        auth_session.last_accessed = datetime.utcnow()
        db.commit()
        
        # Refresh cookie
        self._set_session_cookie(response, session_token)
        
        return True
    
    def _set_session_cookie(self, response: Response, session_token: str) -> None:
        """Set the session cookie in the response."""
        response.set_cookie(
            key=self.cookie_name,
            value=session_token,
            max_age=self.session_expiry,
            path="/",
            domain=None,
            secure=True,  # Only send over HTTPS
            httponly=True,  # Not accessible via JavaScript
            samesite="lax"  # Moderate CSRF protection
        )
    
    def _get_session_token(self, request: Request) -> Optional[str]:
        """Extract session token from request cookies."""
        return request.cookies.get(self.cookie_name)


# Singleton instance
session_manager = SessionManager()