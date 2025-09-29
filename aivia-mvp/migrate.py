#!/usr/bin/env python3
"""
AIVIA MVP Database Migration Script
Initialize database tables and perform migrations
"""
import sys
import os
import logging
from pathlib import Path

# Add app directory to Python path
app_dir = Path(__file__).parent.parent
sys.path.insert(0, str(app_dir))

from app.database import Base, engine, DatabaseManager
from app.models.session import User, InterviewSession, ConversationMessage
from app.config import settings
from app.utils.logging import setup_logging


def create_tables():
    """Create all database tables."""
    try:
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully")
        return True
    except Exception as e:
        print(f"❌ Error creating database tables: {str(e)}")
        return False


def drop_tables():
    """Drop all database tables (use with caution!)."""
    try:
        print("⚠️  Dropping all database tables...")
        response = input("Are you sure? This will delete all data! (yes/no): ")
        if response.lower() != 'yes':
            print("Operation cancelled")
            return False

        Base.metadata.drop_all(bind=engine)
        print("✅ Database tables dropped successfully")
        return True
    except Exception as e:
        print(f"❌ Error dropping database tables: {str(e)}")
        return False


def reset_database():
    """Reset database by dropping and recreating tables."""
    print("🔄 Resetting database...")
    if drop_tables() and create_tables():
        print("✅ Database reset completed successfully")
        return True
    else:
        print("❌ Database reset failed")
        return False


def check_connection():
    """Check database connection."""
    try:
        import asyncio

        async def test_connection():
            manager = DatabaseManager()
            return await manager.health_check()

        is_connected = asyncio.run(test_connection())

        if is_connected:
            print("✅ Database connection successful")
            return True
        else:
            print("❌ Database connection failed")
            return False
    except Exception as e:
        print(f"❌ Error checking database connection: {str(e)}")
        return False


def main():
    """Main migration script entry point."""
    setup_logging(log_level=settings.log_level)

    if len(sys.argv) < 2:
        print("""
AIVIA MVP Database Migration Tool

Usage:
    python migrate.py <command>

Commands:
    init        - Initialize database (create tables)
    create      - Create all tables
    drop        - Drop all tables (WARNING: deletes all data)
    reset       - Drop and recreate all tables
    check       - Check database connection

Examples:
    python migrate.py init
    python migrate.py check
    python migrate.py reset
        """)
        sys.exit(1)

    command = sys.argv[1].lower()

    print(f"🚀 AIVIA MVP Database Migration")
    print(f"Environment: {settings.environment}")
    print(f"Database: {settings.database_name}")
    print("-" * 50)

    if command == "init" or command == "create":
        success = create_tables()
    elif command == "drop":
        success = drop_tables()
    elif command == "reset":
        success = reset_database()
    elif command == "check":
        success = check_connection()
    else:
        print(f"❌ Unknown command: {command}")
        print("Use 'python migrate.py' to see available commands")
        sys.exit(1)

    if success:
        print("✅ Migration completed successfully")
        sys.exit(0)
    else:
        print("❌ Migration failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
