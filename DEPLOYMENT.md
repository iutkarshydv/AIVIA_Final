# AIVIA - Vercel Deployment Guide

## Pre-Deployment Checklist

### ✅ Prerequisites Completed
- [x] Next.js 14 with App Router
- [x] Serverless architecture ready
- [x] Prisma with Neon adapter configured
- [x] Build command includes `prisma generate`
- [x] Environment variables documented

---

## Step-by-Step Deployment

### 1. Prepare Your Accounts

#### A. Neon Database (Already Set Up)
Your database is ready:
- **Host**: `ep-round-surf-a1b8yd4t-pooler.ap-southeast-1.aws.neon.tech`
- **Database**: `neondb`
- ✅ Connection string is in your `.env` file

#### B. Clerk Authentication
You have Clerk configured:
- Publishable Key: `pk_test_Y2xlYXItdHVuYS0xMC5jbGVyay5hY2NvdW50cy5kZXYk`
- Secret Key: Already in `.env`

**Update Clerk Dashboard:**
1. Go to https://dashboard.clerk.com
2. Navigate to **Domains** section
3. Add your Vercel domain (will be `your-app.vercel.app`)
4. Update **Redirect URLs**:
   - Sign-in redirect: `https://your-app.vercel.app/dashboard`
   - Sign-up redirect: `https://your-app.vercel.app/dashboard`
   - Allowed origins: `https://your-app.vercel.app`

#### C. ElevenLabs API
- API Key: Already in `.env` as `ELEVENLABS_API_KEY`
- No additional configuration needed

#### D. Google Gemini API
- **Required**: Get API key from https://makersuite.google.com/app/apikey
- Add as `GEMINI_API_KEY` in Vercel

---

### 2. Push Code to GitHub

```bash
# Initialize git (if not already)
cd d:\GitHub\AIVIA
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - AIVIA Voice Interview Platform"

# Create GitHub repository (via GitHub website or CLI)
# Then push:
git remote add origin https://github.com/YOUR_USERNAME/aivia.git
git branch -M main
git push -u origin main
```

---

### 3. Deploy to Vercel

#### Option A: Using Vercel Dashboard (Recommended)

1. **Go to Vercel**: https://vercel.com/new

2. **Import Git Repository**:
   - Click "Import Project"
   - Connect your GitHub account
   - Select the `aivia` repository

3. **Configure Project**:
   - Framework: **Next.js** (auto-detected)
   - Root Directory: `./` (leave as is)
   - Build Command: `prisma generate && next build` (already in package.json)
   - Output Directory: `.next` (auto-detected)

4. **Add Environment Variables**:

   Click "Environment Variables" and add these **one by one**:

   ```
   DATABASE_URL
   postgresql://neondb_owner:npg_YJ1U7GjCXprB@ep-round-surf-a1b8yd4t-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

   NEON_DB_URL
   postgresql://neondb_owner:npg_YJ1U7GjCXprB@ep-round-surf-a1b8yd4t-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

   ELEVEN_API_KEY
   d6c1df94093c89168001061d7555aa24d6e68817b5d6fb96ae7da2d31db3dae3

   GEMINI_API_KEY
   YOUR_GEMINI_API_KEY_HERE

   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   pk_test_Y2xlYXItdHVuYS0xMC5jbGVyay5hY2NvdW50cy5kZXYk

   CLERK_SECRET_KEY
   sk_test_STzU49UefbvPH7ebfNjEqzxq7pbcREH1zvToXhhEiI

   WEBHOOK_SECRET
   (Generate a random 32+ character string)

   JWT_SECRET
   (Generate a random 32+ character string)

   NEXT_PUBLIC_APP_URL
   (Leave empty for now - will update after deployment)

   NODE_ENV
   production
   ```

   **Generate secrets** using:
   ```bash
   # PowerShell
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
   ```

5. **Deploy**:
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - You'll get a URL like `https://aivia-xyz123.vercel.app`

6. **Update Environment Variable**:
   - Go to Project Settings → Environment Variables
   - Edit `NEXT_PUBLIC_APP_URL` to your actual URL: `https://aivia-xyz123.vercel.app`
   - Redeploy (Deployments → Latest → ⋯ → Redeploy)

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: aivia
# - Directory: ./
# - Override settings? No

# Add environment variables (you'll be prompted)
# Or use: vercel env add VARIABLE_NAME

# Production deploy
vercel --prod
```

---

### 4. Run Database Migration

After successful deployment:

```bash
# Connect to your Neon database via pgAdmin or psql
# Or use Prisma Studio

# Option 1: Via Prisma CLI (locally)
npx prisma migrate deploy

# Option 2: Via Neon Console
# Run the SQL from: prisma/migrations/20251211151851_aivia/migration.sql
```

**Verify Migration**:
```bash
npx prisma studio
# Check if all tables exist: users, sessions, transcripts, evaluations
```

---

### 5. Post-Deployment Configuration

#### Update Clerk Redirect URLs
1. Go to https://dashboard.clerk.com
2. Navigate to your application
3. **Paths** section:
   - Add domain: `https://your-app.vercel.app`
4. **Session & Authentication**:
   - Allowed redirect URLs: Add your Vercel domain

#### Configure ElevenLabs Webhook
1. Go to ElevenLabs Dashboard
2. Navigate to Webhooks
3. Add webhook URL: `https://your-app.vercel.app/api/webhook/elevenlabs`
4. Copy the signing secret
5. Update `WEBHOOK_SECRET` in Vercel environment variables

---

### 6. Test Your Deployment

#### A. Authentication
1. Visit `https://your-app.vercel.app`
2. Click "Sign Up"
3. Create test account
4. Should redirect to `/dashboard`

#### B. Resume Upload
1. Upload a PDF resume
2. Add job description
3. Click "Start Interview"
4. Should create session and redirect to `/interview/[id]`

#### C. Interview (If ElevenLabs has credits)
1. Grant microphone permissions
2. Click "Start Interview"
3. Speak a test message
4. Verify audio playback

#### D. Trial Flow
1. Logout
2. Visit homepage
3. Click "Try Once"
4. Fill form and click "Start Free Trial Interview"
5. Should show token exhausted error modal

---

## Troubleshooting

### Build Errors

#### "Cannot find module '@prisma/client'"
**Solution**: Prisma generate ran before build
```bash
# Verify package.json has:
"build": "prisma generate && next build"
"postinstall": "prisma generate"
```

#### "Database connection failed"
**Solution**: Check DATABASE_URL format
- Must include `?sslmode=require`
- Use connection pooling URL (ends with `-pooler`)

#### "Clerk publishableKey missing"
**Solution**: Environment variable prefix
- Must be `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- Not `CLERK_PUBLISHABLE_KEY`

### Runtime Errors

#### 500 Error on API Routes
**Check Vercel Logs**:
1. Go to Vercel Dashboard
2. Navigate to Deployments → Latest
3. Click "Functions" tab
4. Check logs for specific route

#### "Prisma Client not generated"
**Solution**: Force regeneration
```bash
# In Vercel project settings
# Add build command override:
npm run build && npx prisma generate
```

#### WebSocket Connection Failed
**Note**: ElevenLabs WebSocket connects directly from browser to ElevenLabs servers, not through Vercel. This should work automatically.

---

## Performance Optimization

### Enable Edge Runtime (Optional)
For faster cold starts, convert API routes to Edge runtime where possible:

```typescript
// src/app/api/token/route.ts
export const runtime = 'edge'; // Instead of 'nodejs'
```

**Note**: Some features require Node.js runtime:
- PDF parsing (`pdf-parse`)
- Prisma with Neon adapter works on Edge

### Database Connection Pooling
Already configured via Neon's `-pooler` endpoint. No action needed.

### CDN Caching
Static assets automatically cached by Vercel CDN.

---

## Monitoring & Analytics

### Vercel Analytics (Built-in)
- **Speed Insights**: Automatic
- **Web Vitals**: Automatic
- **Usage Metrics**: Dashboard → Analytics

### Custom Logging
Logs visible in:
- Vercel Dashboard → Functions → Logs
- Use `console.log()` - automatically captured

### Error Tracking (Optional)
Add Sentry:
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

---

## Cost Estimates

### Vercel (Free Tier)
- ✅ 100GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ⚠️ 100 hours serverless function execution

**Upgrade if**:
- Traffic > 100GB/month → Pro ($20/month)
- Functions > 100h/month → Pro

### Neon (Free Tier)
- ✅ 0.5 GB storage
- ✅ Unlimited compute hours (with sleep)
- ⚠️ Database sleeps after inactivity

**Upgrade if**:
- Storage > 0.5 GB → Launch ($19/month)
- Need always-on → Scale ($69/month)

### ElevenLabs
- Check your plan limits at dashboard.elevenlabs.io
- API costs per character generated

### Clerk (Free Tier)
- ✅ 10,000 monthly active users
- ✅ All authentication features

---

## Domain Setup (Optional)

### Add Custom Domain

1. **Purchase Domain** (e.g., aivia.com from Namecheap, GoDaddy)

2. **Add to Vercel**:
   - Project Settings → Domains
   - Add domain: `aivia.com`
   - Add domain: `www.aivia.com`

3. **Update DNS** (at your registrar):
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   
   Type: A
   Name: @
   Value: 76.76.21.21
   ```

4. **Update Environment Variables**:
   - `NEXT_PUBLIC_APP_URL` → `https://aivia.com`

5. **Update Clerk**:
   - Add production domain in Clerk dashboard

---

## Continuous Deployment

### Automatic Deployments
- Every `git push` to `main` → Auto-deploy to production
- Pull requests → Preview deployments

### Preview Deployments
- Each PR gets unique URL
- Test before merging

### Rollback
- Vercel Dashboard → Deployments
- Click previous deployment → Promote to Production

---

## Security Checklist

- [x] Environment variables in Vercel (not in code)
- [x] `.env` in `.gitignore`
- [x] HTTPS enforced (automatic on Vercel)
- [x] Clerk authentication on protected routes
- [x] Database uses SSL (`sslmode=require`)
- [x] API routes validate auth tokens
- [x] File upload size limits (10MB)
- [x] CORS headers configured
- [ ] Add rate limiting (optional - use Vercel Rate Limiting)
- [ ] Add DDoS protection (automatic on Vercel Pro)

---

## Quick Commands Reference

```bash
# Local development
npm run dev

# Build locally (test before deploy)
npm run build
npm start

# Database management
npx prisma studio
npx prisma migrate dev
npx prisma generate

# Deploy to Vercel
git push origin main  # Auto-deploys

# View logs
vercel logs [deployment-url]

# Redeploy (force)
vercel --prod --force
```

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Neon Docs**: https://neon.tech/docs
- **Clerk Docs**: https://clerk.com/docs
- **ElevenLabs Docs**: https://elevenlabs.io/docs

---

## Success Indicators

✅ **Deployment successful if**:
1. Homepage loads at your Vercel URL
2. Sign up/sign in works
3. Dashboard is accessible after login
4. Can upload resume (check browser console for errors)
5. Trial page shows token error modal

🎉 **You're live!**

---

## Next Steps After Deployment

1. **Share the URL** with test users
2. **Monitor usage** in Vercel Dashboard
3. **Set up custom domain** (optional)
4. **Add error tracking** with Sentry (optional)
5. **Configure CI/CD** tests (optional)
6. **Scale up** services as needed

---

**Estimated Deployment Time**: 15-30 minutes
**Difficulty**: Beginner-friendly
**Cost**: Free (with free tiers)
