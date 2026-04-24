# Deployment Guide

This guide covers deploying the Recon App frontend to Vercel and backend to various hosting options.

## 📦 Option 1: Vercel (Frontend) + Supabase (Backend)

### Frontend Deployment (Vercel)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/recon-app.git
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to https://vercel.com/new
   - Connect your GitHub account
   - Select this repository
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Click Deploy

3. **Set Environment Variables in Vercel**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Add `VITE_API_URL` = your backend URL (e.g., `https://api.yourapp.com`)

### Backend Deployment (Supabase)

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create a new project (note: username, password, project ref)
   - Copy the PostgreSQL connection string

2. **Update Database Configuration**
   - The backend currently uses SQLite. For Supabase, you need PostgreSQL.
   - Set environment variable: `DATABASE_URL=postgresql://user:password@db.host:5432/postgres`

3. **Deploy Backend**
   - Option A: **Railway.app** (recommended for FastAPI)
     ```bash
     # Install Railway CLI
     npm i -g @railway/cli
     
     # Login
     railway login
     
     # Initialize and deploy
     railway init
     railway up
     ```
   
   - Option B: **Render.com**
     - Go to https://render.com
     - Create new Web Service
     - Connect GitHub repo
     - Environment: `Python 3.9`
     - Build command: `pip install -r backend/requirements.txt`
     - Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
     - Add PostgreSQL database instance
     - Set `DATABASE_URL` environment variable

4. **Update CORS Settings**
   - In `backend/main.py`, update CORS allowed origins with your Vercel domain

---

## 🐳 Option 2: Docker (Both Frontend & Backend)

### Local Testing with Docker Compose

```bash
# Start both services
docker-compose up

# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

### Deployment Options

#### Option A: **Railway.app** (Recommended)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link project
railway login
railway init

# Deploy
railway up
```

#### Option B: **Render.com**
1. Push to GitHub
2. Go to https://render.com/dashboard
3. Create new → Web Service
4. Connect GitHub repo
5. Settings:
   - Name: `recon-app-backend`
   - Environment: `Docker`
   - Build command: (leave empty, uses Dockerfile)
   - Start command: (leave empty, uses CMD from Dockerfile)
   - Add PostgreSQL database
   - Set environment variables:
     - `DATABASE_URL`: from PostgreSQL instance
     - `CORS_ORIGINS`: your frontend URL

#### Option C: **AWS ECS (DigitalOcean, Linode, etc.)**
```bash
# Build and push Docker image
docker build -t recon-app:latest .
docker tag recon-app:latest YOUR_REGISTRY/recon-app:latest
docker push YOUR_REGISTRY/recon-app:latest

# Deploy on your chosen platform
```

---

## 🔧 Environment Variables for Production

| Variable | Example | Notes |
|----------|---------|-------|
| `VITE_API_URL` | `https://api.yourapp.com` | Frontend: where backend is hosted |
| `DATABASE_URL` | `postgresql://...` | Backend: PostgreSQL connection string |
| `CORS_ORIGINS` | `https://yourapp.vercel.app` | Backend: comma-separated allowed origins |
| `ANTHROPIC_API_KEY` | (optional) | For Claude integration |

---

## 🚀 Quick Deployment Checklist

### Frontend (Vercel)
- [ ] Push code to GitHub
- [ ] Connect repository to Vercel
- [ ] Set `VITE_API_URL` environment variable
- [ ] Verify deployment at `yourdomain.vercel.app`

### Backend (Choose One)
- [ ] Create PostgreSQL database (Supabase / Render / Railway)
- [ ] Deploy backend service
- [ ] Set `DATABASE_URL` environment variable
- [ ] Set `CORS_ORIGINS` for your frontend URL
- [ ] Test API health: `GET /health`
- [ ] Test CORS: `OPTIONS /api/accounts`

---

## 🔍 Monitoring & Debugging

### Check Backend Logs
```bash
# Railway
railway logs

# Render
# Via dashboard → Logs tab

# Docker local
docker-compose logs backend
```

### Test API Connectivity
```bash
# From frontend logs, check browser console
# From command line:
curl -v https://your-api.example.com/health

# Test CORS
curl -i -X OPTIONS https://your-api.example.com \
  -H "Origin: https://yourapp.vercel.app"
```

### Database Connection Issues
- Verify `DATABASE_URL` format
- Check database IP whitelist (Supabase/Render)
- Verify credentials in connection string

---

## 📝 Notes

- **SQLite → PostgreSQL Migration**: The app currently uses SQLite. For production, PostgreSQL is recommended (Supabase, Render, Railway all provide managed PostgreSQL).
- **CORS Configuration**: Update the backend's `CORS_ORIGINS` environment variable with your Vercel deployment URL.
- **Database Backups**: Use your hosting platform's built-in backup features.
- **Cost**: 
  - Vercel: Free tier available
  - Railway/Render: Free tier with usage limits
  - Supabase: Free tier available

---

## Support

For issues with specific platforms:
- **Vercel**: https://vercel.com/support
- **Railway**: https://railway.app/docs
- **Render**: https://render.com/docs
- **Supabase**: https://supabase.com/docs
