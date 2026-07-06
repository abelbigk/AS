# ✅ Deployment Checklist

**Goal**: Deploy backend to GitHub/cloud, connect app to deployed URL

---

## 📋 Pre-Deployment

### **Backend Code**
- [ ] All code works locally (`npm run dev`)
- [ ] All dependencies in `package.json`
- [ ] `.env` file has all required variables
- [ ] Database connectivity verified
- [ ] CORS enabled (`app.use(cors());`)

### **GitHub Setup**
- [ ] GitHub account created
- [ ] GitHub repo created (e.g., `backend`)
- [ ] Repository initialized: `git init`
- [ ] Remote added: `git remote add origin https://github.com/username/backend`

---

## 🚀 Deployment Process

### **Step 1: Push to GitHub**

```bash
cd c:\mycode3

# Check git status
git status

# Add all files
git add .

# Commit
git commit -m "Backend: Ready for deployment"

# Push to GitHub
git push -u origin main
```

**Verify**: Go to github.com/username/backend - see your code? ✅

### **Step 2: Choose Deployment Platform**

Pick ONE (all free):

**RECOMMENDED: Railway**
- Site: railway.app
- Time: 2 minutes
- Easiest setup

**Alternative: Render**
- Site: render.com
- Time: 3 minutes
- Great for Node.js

**Alternative: Vercel**
- Site: vercel.app
- Time: 3 minutes
- Modern platform

**Alternative: Heroku**
- Site: heroku.com
- Time: 5 minutes
- Popular choice

### **Step 3: Deploy Backend**

**Railway (Easy)**:
1. Go to railway.app
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your backend repo
6. Click "Deploy"
7. Wait 2-3 minutes

**After**: Get URL like `https://backend-12345.up.railway.app`

### **Step 4: Set Environment Variables** (if needed)

If your backend uses `.env` variables:

**On deployment platform**:
1. Find "Environment Variables" or "Settings"
2. Add each variable from your local `.env`:
   ```
   JWT_SECRET=your-secret-key
   DATABASE_URL=your-db-url
   NODE_ENV=production
   ```

---

## 🔧 App Configuration

### **Step 5: Update App .env**

**File**: `c:\mycode3\mobile-rn/.env`

```env
# Change from:
EXPO_PUBLIC_API_URL=http://localhost:3000

# To:
EXPO_PUBLIC_API_URL=https://YOUR-DEPLOYMENT-URL
```

**Replace** `YOUR-DEPLOYMENT-URL` with platform URL:
```
# Examples:
EXPO_PUBLIC_API_URL=https://backend-12345.up.railway.app
EXPO_PUBLIC_API_URL=https://my-backend.onrender.com
EXPO_PUBLIC_API_URL=https://backend-api.vercel.app
```

**IMPORTANT**:
- ❌ No trailing slash
- ✅ Use https:// (not http://)
- ✅ No spaces

### **Step 6: Rebuild App**

```bash
# Terminal 1: Backend (optional, for local testing)
cd c:\mycode3
npm run dev

# Terminal 2: Metro
cd c:\mycode3\mobile-rn
npm start

# Terminal 3: Run app
cd c:\mycode3\mobile-rn
npx expo run:android
```

**In emulator**: Press R, R to reload

---

## ✅ Verification

### **Test Deployment URL**

Open browser, visit:
```
https://your-deployment-url.com/auth/me
```

**Expected**: 
- Error message = Backend works ✅
- "Cannot GET" = Backend deployed but endpoint missing ❌
- "Connection refused" = URL wrong or backend down ❌

### **Test App Connection**

1. Open app on emulator
2. Should NOT show "Unable to load script"
3. Should show loading spinner
4. Then login screen
5. Try login with valid credentials
6. Should work! ✅

### **Test All Features**

- [ ] Login works
- [ ] Home tab loads (shows content)
- [ ] Queued tab loads
- [ ] Done tab loads
- [ ] Can navigate between tabs
- [ ] No red error screens

---

## 🔍 Troubleshooting

### **"Unable to load script" Error**

**Cause**: Metro not running

**Fix**:
```bash
cd c:\mycode3\mobile-rn
npm start
```

### **"Connection refused" in App**

**Cause**: Wrong URL in .env

**Fix**:
1. Check .env has correct URL
2. Verify URL works in browser
3. Rebuild app: R, R

### **"CORS error" in Network Tab**

**Cause**: Backend not allowing requests

**Fix** (in backend):
```javascript
const cors = require('cors');
app.use(cors());
```

### **Login Not Working**

**Causes**:
1. Database not on deployment platform
2. Different JWT_SECRET
3. Wrong endpoint names

**Fix**:
1. Ensure database accessible from platform
2. Set same JWT_SECRET on platform .env
3. Verify endpoint URLs

### **App Works Locally But Not After Deployment**

**Causes**:
1. Missing environment variables
2. Database connection string wrong
3. CORS not enabled
4. Port configuration different

**Fix**:
1. Add all .env vars to platform
2. Test database connection
3. Enable CORS in backend
4. Check platform defaults

---

## 📝 After Deployment

### **Making Changes**

```bash
# 1. Edit backend code
# 2. Test locally (npm run dev)
# 3. Commit changes
git add .
git commit -m "Fix: describe change"

# 4. Push to GitHub
git push origin main

# 5. Platform auto-deploys
# Wait 2-3 minutes for deployment

# 6. App uses updated code
# Next time user connects
```

### **Multiple Deployments**

If backend needs updates:

**Dev Setup** (local testing):
```bash
npm run dev
```

**Production Setup** (deployed):
```
# Push → Platform deploys → Live
```

---

## 🎯 Final Checklist

### **Before Deploying**
- [ ] Backend works locally
- [ ] All code committed to git
- [ ] GitHub repo created
- [ ] Code pushed to GitHub

### **During Deployment**
- [ ] Platform account created
- [ ] Repo connected
- [ ] Backend deploying
- [ ] Get deployment URL

### **After Deployment**
- [ ] .env updated in app
- [ ] URL verified in browser
- [ ] App rebuilt (metro running)
- [ ] App connects successfully
- [ ] Login works
- [ ] All tabs work
- [ ] No errors showing

### **Post-Deployment**
- [ ] Save deployment URL
- [ ] Note environment variables
- [ ] Document setup for team
- [ ] Monitor backend health

---

## 📊 Deployment Summary

| Step | Time | Action | Verify |
|------|------|--------|--------|
| 1 | 5 min | Push to GitHub | Code on GitHub |
| 2 | 5 min | Deploy backend | Get deployment URL |
| 3 | 2 min | Update .env | File has new URL |
| 4 | 2 min | Rebuild app | Metro running |
| 5 | 2 min | Test app | Login works |
| **Total** | **16 min** | Complete | **App deployed!** |

---

## 🎉 You Did It!

After completing this checklist:

✅ Backend deployed to cloud  
✅ Public URL available  
✅ App configured to use it  
✅ Everything working together  
✅ Ready for production!

---

## 📚 Reference Documents

- **QUICK_DEPLOY_GUIDE.md** - 5-minute deployment
- **DEPLOY_BACKEND_SETUP.md** - Detailed setup
- **DEPLOYED_BACKEND_EXPLAINED.txt** - How it works

---

**Ready?** Follow the steps above and your backend will be live! 🚀
