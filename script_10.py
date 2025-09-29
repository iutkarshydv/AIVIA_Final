# Create the environment configuration file (.env.example)
env_example_content = '''# AIVIA MVP Environment Configuration
# Copy this file to .env and update values for your environment

# Application Configuration
APP_NAME="AIVIA MVP"
APP_HOST=0.0.0.0
APP_PORT=8000
DEBUG=true
ENVIRONMENT=development
LOG_LEVEL=INFO
SECRET_KEY=your-secret-key-change-in-production

# CORS Origins (comma-separated for string, or JSON array format)
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"]

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_BASE_URL=https://api.elevenlabs.io/

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/aivia_mvp
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=aivia_mvp
DATABASE_USER=username
DATABASE_PASSWORD=password

# File Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_DIR=./uploads
ALLOWED_FILE_TYPES=["pdf", "docx", "doc"]

# Frontend Configuration (if serving React app)
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_WS_BASE_URL=ws://localhost:8000
'''

with open('.env.example', 'w') as f:
    f.write(env_example_content)

print("✅ Created .env.example - Environment configuration template")