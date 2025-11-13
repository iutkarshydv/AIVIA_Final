# How to Test AIVIA MVP with NeonDB and Authentication

This guide will help you test the AIVIA MVP application with the new NeonDB database and authentication features.

## Prerequisites

1. Create a NeonDB account at https://neon.tech/ and set up a new PostgreSQL database
2. Update `.env` file with your NeonDB credentials
3. Install required Python packages: `pip install -r backend/requirements.txt`

## Setting Up NeonDB Schema

Run the schema setup script to create fresh tables in your NeonDB database:

```bash
cd d:\GitHub\AIVIA\aivia-mvp
python scripts/setup_neondb_schema.py --confirm
```

This script will create all necessary tables in your NeonDB database without migrating any data from your local PostgreSQL database.

## Running the Application

Start the backend server:

```bash
cd d:\GitHub\AIVIA\aivia-mvp\backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Start the frontend server:

```bash
cd d:\GitHub\AIVIA\aivia-mvp\frontend
python -m http.server 3000
```

## Testing the Authentication

1. Open your browser at http://localhost:3000
2. Register a new user account
3. Log in with your credentials
4. Test the interview flow with authentication

## API Endpoints

- **Registration**: POST `/api/auth/register`
  - Body: `{ "email": "user@example.com", "username": "username", "password": "password" }`

- **Login**: POST `/api/auth/login`
  - Body: `{ "username": "username", "password": "password" }`

- **Logout**: POST `/api/auth/logout`

- **Get Current User**: GET `/api/auth/me`

## Session Management

Sessions are now stored server-side with the following features:
- In-memory caching for performance
- Database persistence for reliability
- Secure HTTP-only cookies for authentication
- Configurable session expiry (default: 24 hours)

## Security Notes

1. The example `.env` file contains placeholder credentials. Replace them with real values.
2. In production, set `DEBUG=false` and use a strong `SECRET_KEY` and `SESSION_SECRET`.