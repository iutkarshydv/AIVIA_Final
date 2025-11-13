#!/usr/bin/env python3

"""
AIVIA MVP Database Configuration
SQLAlchemy setup and database connection management
"""
import logging
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
import asyncio
from typing import Generator

from app.config import settings

logger = logging.getLogger(__name__)

# SQLAlchemy setup for NeonDB
# Optimize for cloud PostgreSQL environment with proper pooling settings
engine = create_engine(
    settings.database_url,
    pool_size=5,  # Adjust based on your NeonDB tier
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,  # Recycle connections every 30 minutes
    pool_pre_ping=True,  # Test connections with a ping before using
    echo=settings.debug,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()
metadata = MetaData()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get database session.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


async def create_tables():
    """
    Create database tables.
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")
        raise


async def check_db_connection():
    """
    Check database connection health.
    """
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        return True
    except Exception as e:
        logger.error(f"Database connection check failed: {str(e)}")
        return False


class DatabaseManager:
    """
    Database management utilities.
    """

    @staticmethod
    async def initialize():
        """Initialize database and create tables."""
        try:
            await create_tables()
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Database initialization failed: {str(e)}")
            raise

    @staticmethod
    async def health_check():
        """Perform database health check."""
        return await check_db_connection()
