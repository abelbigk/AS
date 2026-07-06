# 🚀 Deploy Backend & Connect App

**Goal**: Push backend to GitHub, deploy to production, get custom domain, connect app to it

---

## 🎯 Overview

```
Current Setup (Development):
App ↔ localhost:3000 (backend on your PC)

Production Setup:
App ↔ https://yourdomain.com (deployed backend)
```

---

## 📋 Step-by-Step Setup

### **Step 1: Prepare Backend for GitHub**

**Check current backend structure**:
```bash
cd c:\mycode3
dir
```

Should have:
```
├── index.js (main server file)
├── package.json (dependencies)
├── .env (if you have environment variables)
├── routes/ (if you have them)
└── models/ (if you have them)
```

### **Step 2: Create GitHub Repository**

1. Go to **github.com**
2. Click **"New repository"**
3. Name it: `backend` (or `content-organizer-backend`)
4. Add description: "Backend API for Content Organizer App"
5. Click **"Create repository"**

### **Step 3: Push Backend Code to GitHub**

```bash
# Navigate to backend directory
cd c:\mycode3

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial backend commit"

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/backend.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Replace** `YOUR_USERNAME` with your actual GitHub username

### **Step 4: Deploy Backend to Production**

Choose one deployment platform:

#### **Option A: Heroku (Easiest)**

1. Sign up at **heroku.com**
2. Install Heroku CLI
3. Deploy:
```bash
cd c:\mycode3
heroku login
heroku create your-app-name
git push heroku main
```
4. Get URL: `https://your-app-name.herokuapp.com`

#### **Option B: Vercel (Recommended for Node.js)**

1. Sign up at **vercel.com**
2. Import GitHub repository
3. Deploy automatically
4. Get URL: `https://your-project-name.vercel.app`

#### **Option C: Railway (Simple)**

1. Sign up at **railway.app**
2. Connect GitHub
3. Deploy
4. Get URL: `https://your-railway-app.up.railway.app`

#### **Option D: Render (Free tier available)**

1. Sign up at **render.com**
2. Create new Web Service
3. Connect GitHub
4. Deploy
5. Get URL: `https://your-app-name.onrender.com`

### **Step 5: Update App to Use Deployed Backend**

Edit the .env file:

**File**: `c:\mycode3\mobile-rn\.env`

```env
# Change from:
EXPO_PUBLIC_API_URL=http://localhost:3000

# To:
EXPO_PUBLIC_API_URL=https://your-deployment-url.com
```

**Examples**:
```env
# Heroku
EXPO_PUBLIC_API_URL=https://your-app-name.herokuapp.com

# Vercel
EXPO_PUBLIC_API_URL=https://your-project-name.vercel.app

# Railway
EXPO_PUBLIC_API_URL=https://your-railway-app.up.railway.app

# Custom domain
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
```

### **Step 6: Rebuild App with New Configuration**

```bash
# Terminal 1: Backend still runs locally (for testing)
cd c:\mycode3
npm run dev

# Terminal 2: Metro
cd c:\mycode3\mobile-rn
npm start

# Terminal 3: Run app
cd c:\mycode3\mobile-rn
npx expo run:android
```

**Now app will connect to your deployed backend!**

### **Step 7: Test the Connection**

1. Open app on emulator
2. Should connect to deployed backend
3. Try login → should work if backend is running
4. Check network tab in browser dev tools

---

## 🔍 How the App Finds the Backend

**File**: `c:\mycode3\mobile-rn\src\api/client.ts`

```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
```

**Process**:
1. Looks for `EXPO_PUBLIC_API_URL` in `.env`
2. If found: Uses deployed URL (e.g., `https://your-app.com`)
3. If not found: Falls back to `http://localhost:3000` (localhost)

---

## 📝 .env File Explained

**Location**: `c:\mycode3\mobile-rn/.env`

```env
# This is read on app build time
# Must start with EXPO_PUBLIC_ to be accessible in Expo
EXPO_PUBLIC_API_URL=https://your-backend-url.com

# No quotes needed
# No trailing slash
# Must be https:// in production
```

**Why EXPO_PUBLIC_**:
- Expo only exposes variables starting with `EXPO_PUBLIC_`
- This makes it available in your app code
- Other variables stay secret (not in app bundle)

---

## 🔐 CORS & HTTPS Requirements

### **CORS (Cross-Origin Resource Sharing)**

**Important**: Your backend must allow requests from your app!

**In backend** (add this to Express server):

```javascript
const cors = require('cors');
app.use(cors());
// OR
app.use(cors({
  origin: 'https://your-domain.com'  // Specific origin
}));
```

### **HTTPS Required**

**In Production**: 
- ✅ Use `https://your-backend.com`
- ❌ Don't use `http://` (won't work on some devices)

**In Development**:
- ✅ `http://localhost:3000` (local testing)
- ❌ `http://192.168.x.x` (some devices reject HTTP)

---

## 🔄 Deployment Workflow

### **After Every Backend Change**

```bash
# 1. Test locally
cd c:\mycode3
npm run dev
# → Test in Postman or app

# 2. Commit changes
git add .
git commit -m "Fix: describe your change"

# 3. Push to GitHub
git push origin main

# 4. Deployment platform auto-deploys (most platforms)
# → Your backend updates automatically

# 5. App automatically uses new code
# → No rebuild needed if no code changes
```

---

## 🛠️ Troubleshooting Deployment

### **Issue: App shows "Connection refused"**

**Cause**: Backend URL wrong or backend not responding

**Fix**:
1. Check `.env` has correct URL
2. Test URL in browser: `https://your-backend.com/auth/me`
3. Should get error (no token) or user data (if logged in)
4. If error: Backend not working

### **Issue: Deployed backend is slow**

**Cause**: Cold start (serverless) or overloaded

**Solution**:
- Keep-alive: Add periodic ping
- Or: Use always-on hosting (Heroku hobby tier, etc)

### **Issue: CORS errors**

**Cause**: Backend not allowing your app's requests

**Fix**: Add CORS to backend:
```javascript
app.use(cors());
```

### **Issue: Login works locally but not on deployed**

**Cause**: Backend database not migrated

**Fix**: 
- Ensure database is on deployed server
- Or: Use cloud database (MongoDB Atlas, etc)

### **Issue: Tokens not working**

**Cause**: Different JWT secret on deployed backend

**Fix**: Set same JWT_SECRET on both:
```bash
# Local .env
JWT_SECRET=your-secret-key

# Deployed .env (on Heroku/Vercel)
JWT_SECRET=your-secret-key
```

---

## 📊 Deployment Options Comparison

| Platform | Easiest | Price | Supports Node | Auto-Deploy | Link |
|----------|---------|-------|---------------|-------------|------|
| **Heroku** | ⭐⭐⭐ | Free → $7/mo | ✅ | ✅ | heroku.com |
| **Vercel** | ⭐⭐⭐⭐ | Free | ✅ | ✅ | vercel.com |
| **Railway** | ⭐⭐⭐ | Free → $5/mo | ✅ | ✅ | railway.app |
| **Render** | ⭐⭐⭐⭐ | Free | ✅ | ✅ | render.com |
| **Replit** | ⭐⭐⭐⭐⭐ | Free | ✅ | ✅ | replit.com |

**Recommendation**: **Render** or **Railway** (easiest + free tier)

---

## 🌐 Custom Domain Setup

### **After Deploying on Heroku/Vercel**

1. Buy domain on **namecheap.com** or **godaddy.com**
2. Go to domain settings
3. Add CNAME record pointing to deployment
4. Set in app `.env`:
```env
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## ✅ Complete Checklist

### **Before Deployment**
- [ ] Backend code works locally
- [ ] All dependencies in package.json
- [ ] .env file created with EXPO_PUBLIC_API_URL
- [ ] CORS enabled in backend
- [ ] Database working (local or cloud)

### **GitHub**
- [ ] GitHub account created
- [ ] Repository created
- [ ] Code pushed to GitHub

### **Deployment**
- [ ] Platform account created (Heroku/Vercel/etc)
- [ ] Backend deployed
- [ ] Get deployment URL
- [ ] Test deployment URL in browser

### **App Update**
- [ ] .env file updated with deployment URL
- [ ] Metro running (`npm start`)
- [ ] App rebuilt/reloaded
- [ ] App connects to deployed backend
- [ ] Login works with deployed backend

### **Verification**
- [ ] App shows no "Connection refused" errors
- [ ] Login successful with deployed backend
- [ ] Can fetch content from deployed backend
- [ ] All features work with deployed backend

---

## 📝 Example Setup

**Example**: Deploying on Render

```bash
# 1. Create GitHub repo
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/user/backend
git push -u origin main

# 2. Go to render.com
# Click "New +" → "Web Service"
# Connect GitHub repo
# Deploy

# 3. Get URL: https://my-backend-12345.onrender.com

# 4. Update .env in app
# EXPO_PUBLIC_API_URL=https://my-backend-12345.onrender.com

# 5. Rebuild app
# npm start (in mobile-rn)

# 6. Test
# App now connects to deployed backend!
```

---

## 🔗 Resource Links

- Heroku Deployment: https://devcenter.heroku.com/articles/nodejs
- Vercel Deployment: https://vercel.com/docs/deployment
- Railway Deployment: https://docs.railway.app/deploy/nodejs
- Render Deployment: https://render.com/docs/nodejs-deploy
- CORS Guide: https://enable-cors.org/
- Express CORS: https://expressjs.com/en/resources/middleware/cors.html

---

## 🎯 Summary

1. **Push code to GitHub** - git push
2. **Deploy backend** - Use Vercel/Railway/etc
3. **Get deployment URL** - Copy from platform
4. **Update .env** - Set EXPO_PUBLIC_API_URL
5. **Rebuild app** - npm start
6. **Test** - App connects to deployed backend

**Result**: App now works with your production backend! 🚀

---

**Status**: Ready to deploy! Follow the steps above.
