"""
Database Migration Script
Migrates data from local PostgreSQL to NeonDB
"""
import os
import sys
import argparse
import psycopg2
from psycopg2.extras import DictCursor
import logging
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger("neondb-migration")

# Load environment variables
load_dotenv()


def get_connection_params(is_source=True):
    """Get connection parameters for source (local) or target (NeonDB) database."""
    if is_source:
        # Source is the local PostgreSQL
        return {
            "dbname": os.getenv("SOURCE_DB_NAME", "aivia_mvp"),
            "user": os.getenv("SOURCE_DB_USER", "postgres"),
            "password": os.getenv("SOURCE_DB_PASSWORD", "admin"),
            "host": os.getenv("SOURCE_DB_HOST", "localhost"),
            "port": os.getenv("SOURCE_DB_PORT", "5432"),
        }
    else:
        # Target is NeonDB
        # Parse DATABASE_URL or use individual params
        db_url = os.getenv("DATABASE_URL", "")
        if db_url and "postgresql://" in db_url:
            return {"dsn": db_url}
        else:
            return {
                "dbname": os.getenv("DATABASE_NAME", ""),
                "user": os.getenv("DATABASE_USER", ""),
                "password": os.getenv("DATABASE_PASSWORD", ""),
                "host": os.getenv("DATABASE_HOST", ""),
                "port": os.getenv("DATABASE_PORT", "5432"),
                "sslmode": "require"  # NeonDB requires SSL
            }


def connect_db(is_source=True):
    """Connect to PostgreSQL database."""
    params = get_connection_params(is_source)
    
    try:
        logger.info(f"Connecting to {'source' if is_source else 'target'} database...")
        conn = psycopg2.connect(**params)
        conn.autocommit = False
        logger.info(f"Connected to {'source' if is_source else 'target'} database successfully")
        return conn
    except Exception as e:
        logger.error(f"Error connecting to {'source' if is_source else 'target'} database: {e}")
        raise


def get_table_schema(cursor, table_name):
    """Get table schema (columns and types)."""
    cursor.execute(f"""
        SELECT column_name, data_type, character_maximum_length 
        FROM information_schema.columns 
        WHERE table_name = %s
        ORDER BY ordinal_position
    """, (table_name,))
    
    return cursor.fetchall()


def get_tables(cursor):
    """Get all tables in the database."""
    cursor.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
    """)
    
    return [table[0] for table in cursor.fetchall()]


def migrate_table(source_cursor, target_cursor, table_name, batch_size=1000):
    """Migrate data from one table to another."""
    logger.info(f"Migrating table: {table_name}")
    
    # Get column names
    source_cursor.execute(f"""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = %s
        ORDER BY ordinal_position
    """, (table_name,))
    
    columns = [col[0] for col in source_cursor.fetchall()]
    columns_str = ", ".join(columns)
    placeholders = ", ".join(["%s"] * len(columns))
    
    # Count records
    source_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    total_records = source_cursor.fetchone()[0]
    logger.info(f"Found {total_records} records in {table_name}")
    
    # Migrate in batches
    offset = 0
    migrated_count = 0
    
    while offset < total_records:
        source_cursor.execute(f"SELECT {columns_str} FROM {table_name} ORDER BY id LIMIT %s OFFSET %s", 
                             (batch_size, offset))
        records = source_cursor.fetchall()
        
        if not records:
            break
            
        # Insert records into target table
        insert_query = f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders})"
        target_cursor.executemany(insert_query, records)
        
        migrated_count += len(records)
        offset += batch_size
        
        logger.info(f"Migrated {migrated_count}/{total_records} records from {table_name}")
    
    return migrated_count


def migrate_data(args):
    """Migrate data from local PostgreSQL to NeonDB."""
    source_conn = None
    target_conn = None
    
    try:
        source_conn = connect_db(is_source=True)
        target_conn = connect_db(is_source=False)
        
        with source_conn.cursor(cursor_factory=DictCursor) as source_cursor, \
             target_conn.cursor() as target_cursor:
            
            # Get tables to migrate
            tables = get_tables(source_cursor)
            logger.info(f"Found {len(tables)} tables: {', '.join(tables)}")
            
            # Migrate each table
            total_migrated = 0
            for table in tables:
                if args.tables and table not in args.tables:
                    logger.info(f"Skipping table {table} as per command line arguments")
                    continue
                    
                count = migrate_table(source_cursor, target_cursor, table, args.batch_size)
                total_migrated += count
            
            if not args.dry_run:
                # Commit the changes
                target_conn.commit()
                logger.info(f"Migration completed successfully. Total records migrated: {total_migrated}")
            else:
                # Roll back in dry run mode
                target_conn.rollback()
                logger.info(f"Dry run completed. Would have migrated {total_migrated} records")
                
    except Exception as e:
        logger.error(f"Error during migration: {e}")
        if target_conn:
            target_conn.rollback()
        return False
        
    finally:
        # Close connections
        if source_conn:
            source_conn.close()
        if target_conn:
            target_conn.close()
    
    return True


def parse_args():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description="Migrate PostgreSQL data to NeonDB")
    parser.add_argument(
        "--tables",
        nargs="+",
        help="List of tables to migrate (defaults to all tables)"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=1000,
        help="Batch size for migration (default: 1000)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Perform a dry run without committing changes"
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    success = migrate_data(args)
    sys.exit(0 if success else 1)