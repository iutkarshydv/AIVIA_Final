# AIVIA MVP - AI Mock Interview Platform

**AIVIA** is an AI-powered mock interview platform MVP that leverages ElevenLabs Conversational AI for real-time voice-based interview experiences. This is a production-ready Minimum Viable Product focused on core functionality and immediate deployment.

## 🚀 Features

### Core MVP Features
- **Direct ElevenLabs Integration**: No complex pipelines, direct agent creation
- **6 Job Roles**: SDE, Data Analysis, Full Stack, Backend, Frontend, DevOps  
- **Simple Resume Processing**: Basic text extraction as knowledge base
- **Real-time Voice Interface**: WebSocket-based conversation with animated avatar
- **Immediate Deployment**: No audio caching, minimal complexity

### Technology Stack
- **Frontend**: React/TypeScript with Tailwind CSS and animated ball avatar
- **Backend**: FastAPI with direct ElevenLabs SDK integration  
- **Database**: PostgreSQL for session management
- **Voice AI**: ElevenLabs Conversational AI agents

## 📋 Prerequisites

- Python 3.11+ 
- Node.js 18+ (for frontend development)
- PostgreSQL 15+
- ElevenLabs API key

## 🛠 Quick Start

### 1. Clone Repository
```bash
git clone <repository-url>
cd aivia-mvp
```

### 2. Automated Setup (Recommended)
```bash
chmod +x setup.sh
./setup.sh
```

### 3. Manual Setup

#### Backend Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Environment configuration
cp .env.example .env
# Edit .env file with your configurations
```

#### Database Setup
```bash
# Create database
createdb aivia_mvp

# Initialize tables
python migrate.py init
```

#### Frontend Setup
```bash
cd frontend
npm install
```

### 4. Configuration

Edit `.env` file with your settings:

```bash
# Required: ElevenLabs API key
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Database (update as needed)
DATABASE_URL=postgresql://username:password@localhost:5432/aivia_mvp

# Optional: Adjust other settings
APP_PORT=8000
DEBUG=true
```

### 5. Start Development Servers

#### Backend Server
```bash
# Activate virtual environment
source venv/bin/activate

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Server (Optional)
```bash
cd frontend
npm run dev
```

## 📁 Project Structure

```
aivia-mvp/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI application
│   │   ├── config.py               # Configuration management
│   │   ├── database.py             # Database connection
│   │   ├── models/
│   │   │   └── session.py          # Database models
│   │   ├── services/
│   │   │   ├── elevenlabs_service.py
│   │   │   ├── text_extractor.py
│   │   │   └── session_manager.py
│   │   └── utils/
│   │       ├── logging.py
│   │       └── exceptions.py
│   └── requirements.txt
├── frontend/                       # React frontend (web app)
├── scripts/
│   ├── setup.sh                    # Automated setup
│   └── migrate.py                  # Database migration
├── .env.example                    # Environment template
└── README.md
```

## 🔧 API Endpoints

### Core Interview API

#### Start Interview
```http
POST /api/interview/start
Content-Type: multipart/form-data

{
  "role": "SDE",
  "user_email": "user@example.com"
}
+ resume_file: File (PDF/DOCX)
```

#### Complete Interview  
```http
POST /api/interview/{session_id}/complete
```

#### Get Interview Status
```http
GET /api/interview/{session_id}/status
```

#### Available Roles
```http
GET /api/roles
```

### Health Check
```http
GET /health
```

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Interview Sessions Table
```sql
CREATE TABLE interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_role VARCHAR(100) NOT NULL,
    elevenlabs_agent_id VARCHAR(255) NOT NULL,
    resume_text TEXT,
    status VARCHAR(20) DEFAULT 'active',
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
```

## 🎯 Job Roles Supported

1. **SDE (Software Development Engineer)**
   - Algorithm & system design focused
   - Technical depth and problem-solving

2. **Data Analysis (Data Analyst)**  
   - Analytics & insights focused
   - SQL, visualization, statistical analysis

3. **Full Stack Developer**
   - End-to-end development
   - Frontend/backend integration

4. **Backend Developer**
   - Server-side architecture & APIs
   - Scalability and performance

5. **Frontend Developer**
   - UI/UX & client-side development  
   - Modern frameworks and optimization

6. **DevOps Engineer**
   - Infrastructure & automation
   - CI/CD, cloud platforms

## 🔄 Interview Flow

1. **User selects job role** from 6 available options
2. **User uploads resume** (PDF/DOCX) with validation
3. **System extracts text** from resume for knowledge base
4. **ElevenLabs agent created** with role-specific prompt + resume
5. **WebSocket connection** established for real-time voice
6. **Voice interview begins** with animated avatar feedback
7. **Interview completion** and resource cleanup

## 🎨 Frontend Features

### Animated Ball Avatar
- **Blue** (Ready state)
- **Orange** (Listening to user) 
- **Green** (AI speaking)
- Smooth scaling and glow effects

### Role Selection Interface
- Professional card-based design
- Role descriptions and focus areas
- Hover effects and transitions

### Resume Upload
- Drag & drop file interface
- File validation and progress
- Error handling and feedback

## ⚙️ Configuration Options

### Environment Variables
```bash
# Application
APP_HOST=0.0.0.0
APP_PORT=8000
DEBUG=true
LOG_LEVEL=INFO

# ElevenLabs
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_BASE_URL=https://api.elevenlabs.io/

# Database  
DATABASE_URL=postgresql://user:pass@host:port/db
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=aivia_mvp

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=./uploads
ALLOWED_FILE_TYPES=["pdf", "docx", "doc"]

# Security
SECRET_KEY=your-secret-key
CORS_ORIGINS=["http://localhost:3000"]
```

## 🧪 Development Tools

### Database Migration
```bash
# Initialize database
python migrate.py init

# Check connection
python migrate.py check

# Reset database (careful!)
python migrate.py reset
```

### Testing
```bash
# Run tests
python -m pytest tests/

# Coverage report
python -m pytest --cov=app tests/
```

### Code Quality
```bash
# Format code
black app/
isort app/

# Lint code  
flake8 app/
```

## 📝 Logging

Comprehensive logging setup with:
- Structured log format
- Multiple log levels (DEBUG, INFO, WARNING, ERROR)
- Console and file output options
- Request/response logging
- Error tracking

## 🚨 Error Handling

Robust error handling with:
- Custom exception classes
- Proper HTTP status codes
- User-friendly error messages
- Comprehensive logging
- Graceful degradation

## 🔒 Security Considerations

- File upload validation and size limits
- Input sanitization and validation
- CORS configuration
- Environment variable protection
- Database connection security

## 📈 Performance Metrics

### Target MVP Metrics
- **Agent Creation Success Rate**: >95%
- **WebSocket Connection Stability**: >98%  
- **Text Extraction Success Rate**: >90%
- **Average Response Time**: <3 seconds
- **System Uptime**: >99%

### User Experience Metrics
- **Interview Completion Rate**: >80%
- **Time to Start Interview**: <2 minutes
- **Technical Issues**: <5% of sessions

## 🚀 Deployment

### Production Environment
```bash
# Environment variables
export ENVIRONMENT=production
export DEBUG=false
export ELEVENLABS_API_KEY=your_production_key

# Database setup
python migrate.py init

# Start production server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker Deployment
```dockerfile
# Dockerfile available for containerized deployment
docker build -t aivia-mvp .
docker run -p 8000:8000 aivia-mvp
```

## 🛠 Troubleshooting

### Common Issues

1. **ElevenLabs API Errors**
   - Check API key validity
   - Verify account limits
   - Check network connectivity

2. **Database Connection Issues**  
   - Verify PostgreSQL is running
   - Check connection string
   - Ensure database exists

3. **File Upload Problems**
   - Check file size limits
   - Verify file type support
   - Ensure upload directory permissions

4. **WebSocket Connection Failures**
   - Check CORS configuration
   - Verify ElevenLabs WebSocket URL
   - Test network connectivity

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review error logs in `logs/` directory
3. Verify environment configuration
4. Test with minimal examples

## 🗺 Roadmap

### Version 2.0 (Future)
- Advanced resume parsing with NLP
- Comprehensive performance evaluation  
- Interview analytics dashboard
- User accounts and history
- Multiple voice options

### Version 3.0 (Future)
- AI-powered feedback generation
- Industry-specific templates
- Job board integrations
- Team collaboration features

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

---

**AIVIA MVP** - Transforming technical interviews with AI-powered conversations.
