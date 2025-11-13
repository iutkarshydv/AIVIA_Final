"""
NeonDB Schema Setup Script
Creates tables in NeonDB without migrating data from local PostgreSQL
"""
import os
import sys
import logging
import argparse
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger("neondb-schema-setup")

# Load environment variables
load_dotenv()

def get_neondb_connection_string():
    """Get connection string for NeonDB database."""
    # First priority: Use DATABASE_URL if available
    db_url = os.getenv("DATABASE_URL", "")
    
    if db_url and "postgresql://" in db_url:
        return db_url
    
    # Second priority: Construct from individual parameters
    dbname = os.getenv("DATABASE_NAME", "")
    user = os.getenv("DATABASE_USER", "")
    password = os.getenv("DATABASE_PASSWORD", "")
    host = os.getenv("DATABASE_HOST", "")
    port = os.getenv("DATABASE_PORT", "5432")
    
    # Construct connection string
    return f"postgresql://{user}:{password}@{host}:{port}/{dbname}?sslmode=require"

def get_neondb_engine():
    """Get SQLAlchemy engine for NeonDB database."""
    connection_string = get_neondb_connection_string()
    
    try:
        logger.info("Creating SQLAlchemy engine for NeonDB...")
        engine = create_engine(
            connection_string,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10
        )
        logger.info("SQLAlchemy engine created successfully")
        return engine
    except Exception as e:
        logger.error(f"Error creating SQLAlchemy engine: {e}")
        raise

# These functions have been integrated into the setup_schema function

def setup_schema():
    """Set up the database schema using SQLAlchemy."""
    engine = get_neondb_engine()
    
    try:
        # Execute SQL statements for each table
        with engine.begin() as conn:
            # Check if users table exists and has the required columns
            try:
                logger.info("Checking if users table exists...")
                
                # Check if table exists
                table_check = conn.execute(text("""
                    SELECT EXISTS (
                       SELECT FROM information_schema.tables 
                       WHERE table_schema = 'public'
                       AND table_name = 'users'
                    );
                """))
                
                table_exists = False
                for row in table_check:
                    table_exists = row[0]
                    break
                
                logger.info(f"Users table exists: {table_exists}")
                
                if table_exists:
                    # Get columns if table exists
                    result = conn.execute(text("""
                        SELECT column_name FROM information_schema.columns 
                        WHERE table_name = 'users' AND table_schema = 'public'
                    """))
                    
                    existing_columns = [row[0] for row in result]
                    logger.info(f"Existing columns in users table: {existing_columns}")
                    
                    if 'username' not in existing_columns:
                        # If table exists but doesn't have username, drop it
                        logger.info("Users table exists but is missing 'username' column. Dropping and recreating...")
                        conn.execute(text("DROP TABLE IF EXISTS auth_sessions CASCADE"))
                        conn.execute(text("DROP TABLE IF EXISTS conversation_messages CASCADE"))
                        conn.execute(text("DROP TABLE IF EXISTS interview_sessions CASCADE"))
                        conn.execute(text("DROP TABLE IF EXISTS users CASCADE"))
                else:
                    logger.info("Users table doesn't exist, will create from scratch")
            except Exception as e:
                logger.warning(f"Error checking users table: {e}")
                logger.info("Will attempt to create tables from scratch")
                
            # Create users table
            logger.info("Creating users table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    username VARCHAR(100) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP
                )
            """))
            
            # Create indexes for users table after confirming table exists
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)"))
            
            # Create auth_sessions table
            logger.info("Creating auth_sessions table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS auth_sessions (
                    id UUID PRIMARY KEY,
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    session_token VARCHAR(255) UNIQUE NOT NULL,
                    user_agent VARCHAR(255),
                    ip_address VARCHAR(45),
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    last_accessed TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            # Create indexes for auth_sessions table
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_active ON auth_sessions (session_token, is_active)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions (user_id)"))
            
            # Create interview_sessions table
            logger.info("Creating interview_sessions table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS interview_sessions (
                    id UUID PRIMARY KEY,
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    target_role VARCHAR(100) NOT NULL,
                    elevenlabs_agent_id VARCHAR(255) NOT NULL,
                    resume_text TEXT,
                    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated')),
                    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP
                )
            """))
            
            # Create indexes for interview_sessions table
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions (user_id)"))
            
            # Create conversation_messages table
            logger.info("Creating conversation_messages table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS conversation_messages (
                    id UUID PRIMARY KEY,
                    session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
                    speaker VARCHAR(20) NOT NULL CHECK (speaker IN ('interviewer', 'candidate')),
                    message_text TEXT,
                    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            # Create indexes for conversation_messages table
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_id ON conversation_messages (session_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_timestamp ON conversation_messages (session_id, timestamp)"))
            
        logger.info("Schema setup completed successfully")
        
    except SQLAlchemyError as e:
        logger.error(f"Error setting up schema: {e}")
        raise

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Set up NeonDB schema without data migration')
    parser.add_argument('--confirm', action='store_true', help='Confirm schema setup')
    
    args = parser.parse_args()
    
    if not args.confirm:
        print("This script will create tables in your NeonDB database.")
        print("To confirm and proceed, run with --confirm flag")
        sys.exit(0)
        
    try:
        setup_schema()
        print("Schema setup completed successfully")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)