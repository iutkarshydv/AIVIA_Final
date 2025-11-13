"""
Authentication Routes
Handles user registration, login, and session management
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
from datetime import datetime
import uuid
import re

from app.database import get_db
from app.models.session import User, AuthSession
from app.utils.session_manager import session_manager

# Initialize router
router = APIRouter(prefix="/api/auth", tags=["authentication"])


# Request/Response Models
class UserCreate(BaseModel):
    """User registration request model."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=100)


class UserLogin(BaseModel):
    """User login request model."""
    username: str
    password: str


class UserResponse(BaseModel):
    """User response model (excludes sensitive data)."""
    id: uuid.UUID
    email: str
    username: str


class LoginResponse(BaseModel):
    """Login response model."""
    user: UserResponse
    message: str


# Authentication middleware dependency
async def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[Dict[str, Any]]:
    """Dependency to get the current authenticated user."""
    return await session_manager.get_session(db, request)


# Routes
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user."""
    # Check if email already exists
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Validate username format
    if not re.match(r"^[a-zA-Z0-9_-]+$", user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username can only contain letters, numbers, underscores and hyphens"
        )
    
    # Create new user
    new_user = User(
        email=user_data.email,
        username=user_data.username
    )
    new_user.set_password(user_data.password)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return UserResponse(
        id=new_user.id,
        email=new_user.email,
        username=new_user.username
    )


@router.post("/login", response_model=LoginResponse)
async def login_user(
    login_data: UserLogin,
    response: Response,
    request: Request,
    db: Session = Depends(get_db)
):
    """Login a user and create a session."""
    # Find user by username
    user = db.query(User).filter(User.username == login_data.username).first()
    
    # Validate credentials
    if not user or not user.check_password(login_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Check if account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    # Create session
    await session_manager.create_session(db, user, response, request)
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    return LoginResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            username=user.username
        ),
        message="Login successful"
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout_user(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Logout a user and end the session."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    success = await session_manager.end_session(db, request, response)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to log out"
        )
    
    return {"message": "Logout successful"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get information about the currently authenticated user."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    return UserResponse(
        id=uuid.UUID(current_user["user_id"]),
        email=current_user["email"],
        username=current_user["username"]
    )


@router.post("/refresh", status_code=status.HTTP_200_OK)
async def refresh_session(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Refresh the session token expiry."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    success = await session_manager.refresh_session(db, request, response)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh session"
        )
    
    return {"message": "Session refreshed"}