# Import all models to ensure they are registered with Base
from app.models.session import User, InterviewSession, ConversationMessage
from app.database import Base, engine

print("Creating database tables...")
print("Models found:", [table.name for table in Base.metadata.tables.values()])

Base.metadata.create_all(bind=engine)
print("✅ Database tables created successfully!")

# Verify tables were created
from sqlalchemy import inspect
inspector = inspect(engine)
table_names = inspector.get_table_names()
print(f"Tables in database: {table_names}")