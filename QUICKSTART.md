# 🚀 AIVIA Quick Start Guide

Get your AI voice interview platform running in under 15 minutes!

## Prerequisites Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm 9+ installed (`npm --version`)
- [ ] Git installed (for version control)
- [ ] A code editor (VS Code recommended)

## Step-by-Step Setup

### 1️⃣ Install Dependencies (5 min)

```bash
cd "d:\GitHub\AIVIA Version 2"
npm install
```

☕ **Grab a coffee** - this will take a few minutes

---

### 2️⃣ Create Accounts (5 min)

Open these in separate tabs:

1. **Clerk** → https://clerk.com/sign-up
   - Create application
   - Copy: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`

2. **ElevenLabs** → https://elevenlabs.io/sign-up
   - Go to Profile → API Keys
   - Copy: `ELEVEN_API_KEY`

3. **Google AI Studio** → https://makersuite.google.com/app/apikey
   - Create API key
   - Copy: `GEMINI_API_KEY`

4. **Neon** → https://neon.tech/sign-up
   - Create new project
   - Copy connection string
   - Copy: `DATABASE_URL` and `NEON_DB_URL` (same value)

---

### 3️⃣ Configure Environment (2 min)

```bash
# Copy template
copy .env.example .env

# Open .env in your editor and paste the keys you copied
notepad .env
```

**Minimum required:**
```env
DATABASE_URL="postgresql://..."
NEON_DB_URL="postgresql://..."
ELEVEN_API_KEY="..."
GEMINI_API_KEY="..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
WEBHOOK_SECRET="any_random_string_32chars"
JWT_SECRET="any_random_string_32chars"
```

💡 **Tip**: Generate random secrets in PowerShell:
```powershell
# Generate random 32-character string
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

---

### 4️⃣ Initialize Database (2 min)

```bash
# Generate Prisma client
npm run prisma:generate

# Create database tables
npm run prisma:migrate

# When prompted for migration name, type: init
```

✅ **Success?** You should see: "Your database is now in sync with your schema."

---

### 5️⃣ Start Development Server (1 min)

```bash
npm run dev
```

🎉 **Open**: http://localhost:3000

---

## First Test Run

### Test the Complete Flow

1. **Sign Up**
   - Click "Get Started"
   - Create account with email

2. **Upload Resume**
   - Dashboard → Drop a PDF resume
   - Paste any job description
   - Click "Start Interview"

3. **Allow Microphone**
   - Browser will ask for mic permission
   - Click "Allow"

4. **Start Talking**
   - Wait for agent to greet you
   - Answer the questions naturally
   - Try interrupting the agent (barge-in test)

5. **End Interview**
   - Click "End Interview"
   - View your report with scores

---

## Troubleshooting

### ❌ "Module not found" errors
```bash
npm install
npm run prisma:generate
```

### ❌ Database connection fails
- Check `DATABASE_URL` is correct
- Ensure Neon project is active
- Verify `?sslmode=require` is in connection string

### ❌ Microphone not working
- Use Chrome or Edge (best support)
- Ensure HTTPS or localhost
- Check browser permissions

### ❌ "Invalid API key" errors
- Double-check `.env` file
- Restart dev server: `Ctrl+C` then `npm run dev`
- Verify no quotes around keys in `.env`

### ❌ Prisma errors
```bash
# Regenerate client
npm run prisma:generate

# Reset database (WARNING: deletes data)
npx prisma migrate reset
```

---

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Port 3000 in use | `npx kill-port 3000` then retry |
| Clerk redirect loop | Check URLs in Clerk dashboard match `.env` |
| PDF upload fails | Ensure file < 10MB and valid PDF |
| WebSocket won't connect | Verify ElevenLabs API key and quota |
| Resume summary empty | Check Gemini API key and quota limits |

---

## What to Test

### ✅ Basic Flow
- [ ] Sign up / Sign in works
- [ ] Resume upload accepts PDF
- [ ] Session creates successfully
- [ ] Microphone permission granted
- [ ] Can hear agent voice
- [ ] Agent hears your voice
- [ ] Transcript updates in real-time

### ✅ Advanced Features
- [ ] Barge-in: Interrupt agent while speaking
- [ ] Mute: Toggle microphone on/off
- [ ] Evaluation: Scores display after each answer
- [ ] Report: Full transcript and scores appear

---

## Performance Tips

### Development
- Use Chrome DevTools → Network tab to debug API calls
- Check Console for errors
- Use `npm run prisma:studio` to view database

### Production Prep
- Set `NODE_ENV=production` in Vercel
- Enable Vercel Analytics
- Configure Sentry for error tracking
- Set up monitoring alerts

---

## Next Steps

### After Basic Testing
1. **Customize rubric** → Edit `src/lib/rubric.ts`
2. **Adjust agent prompt** → Modify `AGENT_SYSTEM_PROMPT`
3. **Style UI** → Update Tailwind classes
4. **Add features** → Check TODO comments in code

### Deploy to Production
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Add environment variables in Vercel dashboard
4. Configure custom domain (optional)

---

## Need Help?

### Check Logs
```bash
# View all logs
npm run dev

# Check Prisma queries
npm run prisma:studio
```

### Debug Mode
Add to `.env`:
```env
LOG_LEVEL=debug
```

### Common Commands
```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build

# Database GUI
npm run prisma:studio
```

---

## Success! 🎉

If you can:
1. ✅ Sign up
2. ✅ Upload resume
3. ✅ Start interview
4. ✅ Hear agent
5. ✅ See transcript
6. ✅ View report

**You're ready to go!**

---

## Useful Links

- 📚 Full README: `README.md`
- 📋 Implementation Details: `IMPLEMENTATION_SUMMARY.md`
- 🗺️ Project Plan: `project plan.md`
- 🔧 Prisma Schema: `prisma/schema.prisma`
- 🎨 Tailwind Config: `tailwind.config.js`

---

**Questions?** Check the README or IMPLEMENTATION_SUMMARY for detailed documentation.

**Ready to customize?** All files are heavily commented - start exploring!
