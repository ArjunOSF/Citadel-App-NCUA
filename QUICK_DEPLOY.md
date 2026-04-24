# Quick Deployment Guide - Osfin Account Reconciliation

## 📋 Prerequisites
- GitHub account: https://github.com
- Vercel account: https://vercel.com
- Supabase account: https://supabase.com
- Railway account: https://railway.app

---

## 🚀 Step 1: Push to GitHub

```bash
cd /Users/user/Downloads/recon-app\ citadel

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Osfin Account Reconciliation"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/osfin-recon.git

# Push
git branch -M main
git push -u origin main
```

---

## 🌐 Step 2: Deploy Frontend to Vercel

1. **Go to https://vercel.com/new**
2. **Click "Import Project"**
3. **Paste your GitHub repo URL**
4. **Select Framework: `Other` (Vite)**
5. **Build Settings:**
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. **Environment Variables:**
   - Add `VITE_API_URL` → `https://your-backend-domain.com` (we'll set this after deploying backend)
7. **Click Deploy**

Your frontend will be at: `https://your-project.vercel.app`

---

## 🗄️ Step 3: Set Up Supabase Database

1. **Go to https://supabase.com**
2. **Create a new project:**
   - Name: `osfin-recon`
   - Password: (save this!)
   - Region: Choose closest to you
3. **In Supabase Dashboard:**
   - Go to **Settings → Database**
   - Copy the `Connection Strings → URI` (PostgreSQL)
4. **Copy the connection string, it looks like:**
   ```
   postgresql://postgres:PASSWORD@db.REGION.supabase.co:5432/postgres
   ```

---

## 🚀 Step 4: Deploy Backend to Railway

### Option A: Railway CLI (Recommended - Fastest)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize in your project
cd /Users/user/Downloads/recon-app\ citadel
railway init

# When prompted:
# - Project name: osfin-recon-backend
# - Service name: backend
# - Generate a new project: Yes

# Deploy
railway up
```

### Option B: Railway Dashboard (Manual)

1. **Go to https://railway.app/dashboard**
2. **Create new project**
3. **Click "Deploy from GitHub"**
4. **Select your GitHub repo**
5. **Configure:**
   - Start command: `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - Environment variables:
     - `DATABASE_URL`: (paste from Supabase step 3)
     - `CORS_ORIGINS`: `https://your-project.vercel.app`
6. **Deploy**

Your backend URL will be something like: `https://your-service.railway.app`

---

## 🔗 Step 5: Connect Everything

### Update Vercel Environment Variables

1. **Go to Vercel Dashboard → Your Project → Settings → Environment Variables**
2. **Add/Update:**
   - `VITE_API_URL`: `https://your-backend-railway-url.railway.app`
3. **Redeploy** on Vercel (it should auto-trigger, or manually trigger)

### Update Railway Backend Environment Variables

1. **Go to Railway Dashboard → Your Backend Service**
2. **Click "Variables"**
3. **Add/Update:**
   - `DATABASE_URL`: `postgresql://...` (from Supabase)
   - `CORS_ORIGINS`: `https://your-project.vercel.app`

---

## 📱 Step 6: Test Everything

1. **Visit your Vercel frontend:** `https://your-project.vercel.app`
2. **You should see the Osfin login page**
3. **Try logging in with:**
   - Username: `admin`
   - Password: `admin123`

---

## 🔍 Troubleshooting

### Frontend not connecting to backend?
- Check `VITE_API_URL` in Vercel → Settings → Environment Variables
- Check browser console (F12) for CORS errors
- Verify backend `CORS_ORIGINS` includes your Vercel domain

### Backend won't start?
- Check `DATABASE_URL` is correct
- Verify Supabase database is accessible
- Check Railway logs: `railway logs -f`

### Database connection issues?
- Test connection: `psql <DATABASE_URL>`
- Check Supabase dashboard for active connections
- Verify IP whitelist (if using managed database)

---

## 📊 Monitoring & Logs

### Vercel Logs
- Dashboard → Deployments → Select deployment → Logs

### Railway Logs
```bash
railway logs -f  # Follow logs in real-time
```

### Supabase Logs
- Dashboard → Logs → Select service

---

## 💰 Cost Summary (Free Tier)

| Service | Free Tier | Cost |
|---------|-----------|------|
| **Vercel** | 100GB bandwidth, unlimited deployments | Free |
| **Railway** | $5 free credit/month | Pay-as-you-go after |
| **Supabase** | 500MB database, 1GB bandwidth | Free |

---

## ✅ Checklist

- [ ] Project pushed to GitHub
- [ ] Frontend deployed to Vercel
- [ ] Supabase project created with PostgreSQL
- [ ] Backend deployed to Railway
- [ ] Environment variables configured
- [ ] Frontend connects to backend
- [ ] Can log in and use the app
- [ ] Database persists data

---

## Next Steps

1. **Custom Domain:** Add your domain to Vercel & Railway
2. **SSL Certificate:** Automatic with Vercel & Railway
3. **Backups:** Enable Supabase backups
4. **Monitoring:** Set up alerts in Railway

