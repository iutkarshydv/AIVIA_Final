# AIVIA Version 2 - AI Voice Interview Platform

Real-time AI-powered voice interview system where candidates stream audio directly to ElevenLabs (STT → Agent with resume/rubric context → streaming TTS), while backend handles session orchestration, resume analysis via Gemini, and transcript/evaluation persistence in NeonDB.

## Features

- **Real-Time Voice Communication**: Sub-second latency with WebSocket streaming
- **AI-Powered Evaluation**: Structured rubric-based scoring with Gemini-powered resume analysis
- **Barge-In Support**: Natural interruptions during conversation
- **No Audio Storage**: Only text transcripts and evaluations are persisted
- **Secure Authentication**: Clerk-based user management
- **Instant Reports**: Comprehensive interview transcripts and evaluation reports

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Serverless on Vercel)
- **Database**: NeonDB (Postgres) with Prisma ORM
- **Authentication**: Clerk
- **AI Services**: 
  - ElevenLabs (STT, TTS, Conversational AI Agents)
  - Google Gemini (Resume summarization)
- **Audio**: Web Audio API, WebSocket

## Prerequisites

- Node.js 18+ and npm 9+
- Accounts for:
  - [Clerk](https://clerk.com) - Authentication
  - [ElevenLabs](https://elevenlabs.io) - Voice AI
  - [Google AI Studio](https://makersuite.google.com) - Gemini API
  - [Neon](https://neon.tech) - PostgreSQL database

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd "d:\GitHub\AIVIA Version 2"
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
copy .env.example .env
```

Required variables:

```env
# Database
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
NEON_DB_URL="postgresql://user:pass@host/db?sslmode=require"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# ElevenLabs
ELEVEN_API_KEY="your_elevenlabs_api_key"
ELEVEN_REALTIME_BASE_URL="https://api.elevenlabs.io/v1"

# Google Gemini
GEMINI_API_KEY="your_gemini_api_key"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
WEBHOOK_SECRET="generate_random_secret_32_chars"
JWT_SECRET="generate_random_secret_32_chars"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view data
npm run prisma:studio
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── session/       # Create interview sessions
│   │   ├── token/         # Generate realtime tokens
│   │   └── webhook/       # ElevenLabs webhooks
│   ├── dashboard/         # Resume upload & session creation
│   ├── interview/[id]/    # Live interview interface
│   ├── report/[id]/       # Post-interview report
│   └── sign-in|sign-up/   # Authentication pages
├── lib/                   # Core libraries
│   ├── db.ts             # Prisma client
│   ├── auth.ts           # Authentication helpers
│   ├── gemini.ts         # Gemini API integration
│   ├── elevenlabs.ts     # ElevenLabs API integration
│   ├── elevenlabs-client.ts  # WebSocket client
│   ├── audio-stream.ts   # Audio capture
│   ├── audio-playback.ts # TTS playback queue
│   ├── vad.ts            # Voice Activity Detection
│   ├── pdf.ts            # PDF parsing
│   └── rubric.ts         # Evaluation rubric
├── types/                # TypeScript definitions
└── middleware.ts         # Clerk auth middleware

prisma/
└── schema.prisma         # Database schema
```

## API Endpoints

### `POST /api/session`
Create interview session with resume and job description.

**Request:**
```typescript
FormData {
  resume: File (PDF)
  jobDescription: string
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "agentId": "agent_id",
  "resumeSummary": { ... }
}
```

### `POST /api/token`
Get ephemeral WebSocket token for realtime connection.

**Request:**
```json
{
  "sessionId": "uuid"
}
```

**Response:**
```json
{
  "realtimeToken": "token",
  "elevenWsUrl": "wss://...",
  "expiresAt": 1234567890,
  "agentId": "agent_id"
}
```

### `GET /api/session/[id]/transcript`
Retrieve full session transcript and evaluations.

**Response:**
```json
{
  "session": { ... },
  "transcripts": [ ... ],
  "evaluations": [ ... ]
}
```

### `POST /api/webhook/elevenlabs`
Webhook for ElevenLabs conversation events (transcripts, evaluations).

## Deployment (Vercel)

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Deploy

```bash
vercel
```

### 3. Set Environment Variables

In Vercel dashboard, add all environment variables from `.env`.

### 4. Configure Webhooks

Set ElevenLabs webhook URL to: `https://your-app.vercel.app/api/webhook/elevenlabs`

## Database Schema

### Key Tables

- **users**: Clerk user mappings
- **sessions**: Interview sessions with agent_id, resume_summary, job_description
- **transcripts**: Utterances with speaker, sequence, text
- **evaluations**: Per-question scores with rubric-based ratings
- **usage_tracking**: Cost tracking for external services

## Development Tips

### Testing Audio Locally

```bash
# Ensure HTTPS or localhost for microphone access
npm run dev
```

### Viewing Database

```bash
npm run prisma:studio
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Troubleshooting

### Microphone Permission Denied
- Ensure you're using HTTPS or localhost
- Check browser permissions for microphone access

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check Neon connection limits
- Run `npm run prisma:generate` after schema changes

### ElevenLabs WebSocket Fails
- Verify API key is valid
- Check token hasn't expired (1 hour TTL)
- Ensure CORS is configured correctly

### Gemini API Errors
- Check API key and quota limits
- Ensure PDF is valid and readable
- Resume text should be < 50,000 characters

## Security Considerations

- API keys are server-side only (never exposed to client)
- Ephemeral tokens with 1-hour expiration
- Webhook signature verification
- No audio files stored on disk
- Clerk authentication on all protected routes

## Cost Estimation

Per interview session (30 minutes):

- ElevenLabs STT: ~$0.30 (30 min @ $0.01/min)
- ElevenLabs TTS: ~$0.50 (~2000 characters)
- Gemini: ~$0.02 (resume summarization)
- **Total: ~$0.82 per session**

## Support

For issues, please check:
- [ElevenLabs Documentation](https://elevenlabs.io/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)

## License

MIT
