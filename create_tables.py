#!/usr/bin/env python3
"""
Database table creation script for AIVIA MVP
Uses SQLAlchemy models to create all necessary tables
"""
import os
import sys
import logging
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("create-tables")

# Add backend directory to path
backend_dir = str(Path(__file__).parent / "backend")
sys.path.insert(0, backend_dir)

# Load environment variables from .env file
load_dotenv()

logger.info(f"Backend directory path: {backend_dir}")
logger.info(f"Python path: {sys.path}")

# Set required environment variables if not in .env
if not os.getenv("ELEVENLABS_API_KEY"):
    os.environ["ELEVENLABS_API_KEY"] = "dummy_key_for_schema_creation"

from backend.app.database import Base, engine
from backend.app.models.session import User, AuthSession, InterviewSession, ConversationMessage

def create_tables():
    """Create all database tables from SQLAlchemy models."""
    try:
        logger.info("Creating database tables...")
        
        # Ensure all models are imported and logged
        model_classes = [User, AuthSession, InterviewSession, ConversationMessage]
        logger.info(f"Models to create: {', '.join(cls.__name__ for cls in model_classes)}")
        
        # Check each table in the models
        for model in model_classes:
            table_name = model.__tablename__
            logger.info(f"Creating table: {table_name}")
            
            # Get column info for logging
            columns = [f"{col.name} ({col.type})" for col in model.__table__.columns]
            logger.info(f"Columns for {table_name}: {', '.join(columns)}")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Error creating database tables: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Create database tables from SQLAlchemy models')
    parser.add_argument('--confirm', action='store_true', help='Confirm table creation')
    
    args = parser.parse_args()
    
    if not args.confirm:
        print("This script will create tables in your NeonDB database defined in .env.")
        print("To confirm and proceed, run with --confirm flag")
        sys.exit(0)
    
    success = create_tables()
    sys.exit(0 if success else 1)