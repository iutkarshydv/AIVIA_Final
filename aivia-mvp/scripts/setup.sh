#!/bin/bash

# AIVIA MVP Setup Script
# Automated setup for development environment

set -e  # Exit on any error

echo "🚀 AIVIA MVP Development Environment Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Python 3.11+ is available
check_python() {
    print_step "Checking Python version..."
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed"
        exit 1
    fi

    python_version=$(python3 --version | cut -d" " -f2)
    print_success "Python $python_version found"

    # Check if version is 3.11+
    if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 11) else 1)" 2>/dev/null; then
        print_warning "Python 3.11+ recommended, but continuing with $python_version"
    fi
}

# Check if Node.js is available (for frontend)
check_node() {
    print_step "Checking Node.js version..."
    if ! command -v node &> /dev/null; then
        print_warning "Node.js not found. Frontend development will require Node.js 18+"
        return
    fi

    node_version=$(node --version)
    print_success "Node.js $node_version found"
}

# Check if PostgreSQL is available
check_postgres() {
    print_step "Checking PostgreSQL..."
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL client not found. Database setup may require PostgreSQL"
        return
    fi

    print_success "PostgreSQL client found"
}

# Create virtual environment
create_venv() {
    print_step "Creating Python virtual environment..."

    if [ -d "venv" ]; then
        print_warning "Virtual environment already exists. Skipping creation."
        return
    fi

    python3 -m venv venv
    print_success "Virtual environment created"
}

# Activate virtual environment and install dependencies
install_dependencies() {
    print_step "Installing Python dependencies..."

    # Activate virtual environment
    source venv/bin/activate

    # Upgrade pip
    pip install --upgrade pip

    # Install requirements
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
        print_success "Python dependencies installed"
    else
        print_error "requirements.txt not found"
        exit 1
    fi
}

# Setup environment file
setup_environment() {
    print_step "Setting up environment configuration..."

    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Environment file created from template"
            print_warning "Please edit .env file with your configuration"
        else
            print_error ".env.example not found"
            exit 1
        fi
    else
        print_warning ".env file already exists. Skipping."
    fi
}

# Create necessary directories
create_directories() {
    print_step "Creating necessary directories..."

    mkdir -p uploads
    mkdir -p logs

    print_success "Directories created"
}

# Setup database (optional)
setup_database() {
    print_step "Database setup..."

    read -p "Would you like to initialize the database? (y/n): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Initializing database..."

        # Activate virtual environment
        source venv/bin/activate

        # Run migration script
        python migrate.py init

        if [ $? -eq 0 ]; then
            print_success "Database initialized successfully"
        else
            print_error "Database initialization failed"
            exit 1
        fi
    else
        print_warning "Database initialization skipped"
    fi
}

# Main setup process
main() {
    echo "Starting AIVIA MVP setup process..."
    echo

    # Pre-flight checks
    check_python
    check_node
    check_postgres

    echo

    # Setup steps
    create_venv
    install_dependencies
    setup_environment
    create_directories

    echo

    # Optional database setup
    setup_database

    echo
    echo "🎉 Setup completed!"
    echo
    echo "Next steps:"
    echo "1. Edit .env file with your configuration (especially ELEVENLABS_API_KEY)"
    echo "2. Setup PostgreSQL database if not done already"
    echo "3. Start the development server:"
    echo "   source venv/bin/activate"
    echo "   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    echo
    echo "For frontend development:"
    echo "1. Navigate to frontend directory"
    echo "2. npm install"
    echo "3. npm run dev"
}

# Run main function
main "$@"
