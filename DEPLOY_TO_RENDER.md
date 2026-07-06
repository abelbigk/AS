# 🚀 Deploy to Render (Quick Start)

Your code is now on GitHub: https://github.com/abelbigk/AS

## Step 1: Update Render Deployment

1. Go to **https://render.com**
2. Go to your existing service: `https://as-wryo.onrender.com`
3. Click **Settings** → **Source**
4. Verify it's connected to: `https://github.com/abelbigk/AS`
5. If not, reconnect the repository

## Step 2: Redeploy Backend

1. In Render dashboard, click your service
2. Click **Manual Deploy** → **Deploy latest commit**
3. Wait 2-3 minutes for deployment

**Status**: Check the Render deploy logs

## Step 3: Test Backend

```bash
# Open in browser or test with curl
https://as-wryo.onrender.com/auth/me

# Should respond with 401 (unauthorized) - that's correct!
# It means backend is running
```

## Step 4: Update & Test React Native App

1. **Update app .env** - Already done ✅
   - File: `c:\mycode3\mobile-rn\.env`
   - Value: `EXPO_PUBLIC_API_URL=https://as-wryo.onrender.com`

2. **Start Metro bundler**:
   ```bash
   cd c:\mycode3\mobile-rn
   npm start
   ```

3. **Rebuild app** on emulator:
   - Press `a` in Metro terminal (Android)
   - Wait for build to complete

4. **Test login** - App should now connect to your live backend at `https://as-wryo.onrender.com`

## What Happened

✅ **GitHub**: All code (backend + React Native app) pushed
✅ **Render**: Connected to GitHub, auto-deploys on push
✅ **App Config**: Updated to use deployed backend URL
✅ **Next**: Manual deploy trigger or auto-deploy on next push

## To Deploy Future Changes

1. Make changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Feature: describe change"
   git push origin main
   ```
3. Render auto-deploys (watch the dashboard)
4. Rebuild React Native app with Metro for latest changes

---

**Backend URL**: https://as-wryo.onrender.com
**GitHub Repo**: https://github.com/abelbigk/AS
**App Config File**: `mobile-rn/.env`
