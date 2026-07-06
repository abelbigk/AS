# ⚡ Quick Deploy Guide - 5 Minutes

**Goal**: Deploy backend, get URL, connect app

---

## 🚀 Super Quick (5 minutes)

### **Step 1: Deploy Backend**

**Using Railway (easiest, free)**:

1. Go to **https://railway.app**
2. Sign up with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Select your backend repo
6. Click **"Deploy"**
7. Wait 2-3 minutes
8. Get URL: `https://your-project.up.railway.app`

### **Step 2: Update App Config**

**Edit file**: `c:\mycode3\mobile-rn\.env`

```env
EXPO_PUBLIC_API_URL=https://your-project.up.railway.app
```

Replace with YOUR Railway URL

### **Step 3: Rebuild App**

```bash
cd c:\mycode3\mobile-rn
npm start
```

Press **R, R** in emulator to reload

### **Done!** ✅

App now connects to deployed backend

---

## 📝 If You Don't Have GitHub Yet

### **Push Backend to GitHub First**

```bash
cd c:\mycode3

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial backend"

# Create repo on github.com manually first!
# Then:
git remote add origin https://github.com/YOUR_USERNAME/backend.git
git branch -M main
git push -u origin main
```

---

## 🎯 Deployment Platform Options

**Pick ONE (all free)**:

| Platform | Time | Difficulty | Link |
|----------|------|-----------|------|
| Railway | 2 min | Super easy | railway.app |
| Render | 3 min | Easy | render.com |
| Vercel | 3 min | Easy | vercel.com |
| Heroku | 5 min | Easy | heroku.com |

---

## 🔗 What URL You Get

After deploying, you'll get URL like:

```
https://your-project-12345.up.railway.app
```

OR

```
https://your-project-name.vercel.app
```

OR

```
https://your-app-name.herokuapp.com
```

---

## 🔧 Environment Variables on Deployment

**If your backend needs .env vars**:

In deployment platform settings:
1. Find "Environment Variables"
2. Add same vars as your local .env
3. Example:
```
DATABASE_URL=mongodb+srv://...
JWT_SECRET=your-secret-key
PORT=3000
```

---

## ✅ Verify Deployment

**Test your backend URL** in browser:

```
https://your-deployment-url.com/auth/me
```

Should show:
- Error (no token) - means backend works ✅
- "Cannot GET" - means backend not deployed ❌
- "Connection refused" - means URL wrong ❌

---

## 🎯 Complete URL List

**After deployment, you'll have**:

```
Backend deployed at:
  https://your-deployment-url.com

App configuration (.env):
  EXPO_PUBLIC_API_URL=https://your-deployment-url.com

API endpoints accessed by app:
  https://your-deployment-url.com/auth/me
  https://your-deployment-url.com/auth/login
  https://your-deployment-url.com/api/content
  https://your-deployment-url.com/api/queued
  https://your-deployment-url.com/api/done
```

---

## 🚨 Common Issues

### **"Connection refused"**
→ Wrong URL in .env
→ Backend not deployed
→ Backend URL not live

**Fix**: Check URL works in browser first

### **"CORS error"**
→ Backend not allowing requests
→ Add `const cors = require('cors'); app.use(cors());`

### **"Invalid token"**
→ JWT secret different between local and deployed
→ Add same JWT_SECRET to deployment env vars

---

## 📚 Full Guide

See: `DEPLOY_BACKEND_SETUP.md` (detailed steps)

---

## 🎉 After Deployment

Your setup will be:

```
GitHub Repo
  ↓
Deployed Backend
  (Heroku/Railway/Vercel)
  ↓
Public URL
  (https://your-backend.com)
  ↓
React Native App
  (connects via .env file)
  ↓
App works with deployed backend!
```

**Status**: Ready to deploy! 🚀

Pick a platform, deploy, get URL, update .env, rebuild app.

**Done in 5 minutes!**
