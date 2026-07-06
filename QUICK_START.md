# 🚀 Quick Start Guide - Deploy & Build APK

## ⚠️ IMPORTANT: Authentication Setup First!

Before deploying, you need to set up authentication:

### 1. Run Database Migration
```bash
npx tsx server/migrateAuth.ts
```

### 2. Create Admin User
```bash
npx tsx server/createDefaultAdmin.ts
```

This creates:
- **Username**: `admin`
- **Password**: `admin123`

✅ **Change this password immediately after first login!**

---

## Step 1: Push to GitHub (5 minutes)

### Option A: Private Repository (Recommended for your code)

1. **Create GitHub account** (if you don't have one):
   - Go to https://github.com
   - Sign up for free

2. **Create new PRIVATE repository**:
   - Click "+" in top right → "New repository"
   - Name: `content-organizer`
   - Select **Private** ✅
   - Don't initialize with README
   - Click "Create repository"

3. **Push your code**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/content-organizer.git
   git branch -M main
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` with your GitHub username.

**Note:** Render's free tier works with private repos! ✅ You just need to authorize Render to access your private repositories when connecting.

### Option B: Skip GitHub Entirely
You can deploy to Render without GitHub:
- Upload code via Render's dashboard
- Or use Render's CLI
- See "Alternative Deployment Methods" at the end of this guide

---

## Step 2: Deploy to Render (5 minutes)

1. **Create Render account**:
   - Go to https://render.com
   - Click "Get Started for Free"
   - Sign up with GitHub (easiest)
   - **Authorize Render to access your private repos** ✅
   - No credit card needed!

2. **Create Web Service**:
   - In Render dashboard, click "New +" → "Web Service"
   - You'll see your **private** repositories listed
   - Click "Connect" next to your `content-organizer` repository
   - Render auto-detects settings from `render.yaml`

3. **Configure**:
   - Name: `content-organizer` (or any name)
   - Branch: `main`
   - Build Command: (already set) `npm install && npm run build`
   - Start Command: (already set) `npm start`
   - **Instance Type**: FREE

4. **Add Environment Variables**:
   Click "Advanced" → "Add Environment Variable" and add these from your `.env` file:
   
   ```
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   TURSO_DATABASE_URL=your_turso_url
   TURSO_AUTH_TOKEN=your_turso_token
   R2_ACCOUNT_ID=your_r2_account_id
   R2_ACCESS_KEY_ID=your_r2_access_key
   R2_SECRET_ACCESS_KEY=your_r2_secret_key
   R2_BUCKET=your_bucket_name
   R2_PUBLIC_URL=your_r2_public_url
   ```
   
   ⚠️ **IMPORTANT**: Use a strong, unique `JWT_SECRET` for production!

5. **Deploy**:
   - Click "Create Web Service"
   - Wait 3-5 minutes for build to complete
   - You'll get a URL like: `https://content-organizer-xxxx.onrender.com`
   - **Copy this URL!** You'll need it for the APK

6. **Create Admin User on Production** (IMPORTANT!):
   
   After deployment succeeds, you need to create an admin user on production:
   
   **Option A: SSH into Render and run**:
   ```bash
   node dist/createDefaultAdmin.js
   ```
   
   **Option B: Register from the login page**:
   - Visit your Render URL
   - Click "Don't have an account? Register"
   - First user automatically becomes admin
   
   ⚠️ **Change the default password immediately after first login!**

---

## Step 3: Build Android APK (10 minutes)

1. **Update Capacitor config**:
   Open `capacitor.config.ts` and replace the server section with your Render URL:
   ```typescript
   server: {
     url: 'https://content-organizer-xxxx.onrender.com', // Your Render URL
     cleartext: false
   }
   ```

2. **Rebuild frontend**:
   ```bash
   npm run build
   ```

3. **Sync with Android**:
   ```bash
   npx cap sync android
   ```

4. **Build APK**:
   ```bash
   cd android
   gradlew assembleDebug
   ```
   (For release APK: `gradlew assembleRelease`)

5. **Find your APK**:
   Location: `android/app/build/outputs/apk/debug/app-debug.apk`
   Size: ~8-12 MB ✅

6. **Install on phone**:
   - Transfer APK to your phone
   - Enable "Install from unknown sources" in Settings
   - Open the APK file and install
   - **Login with your admin credentials**

---

## ✅ Done!

Your app is now:
- ✅ Backend hosted on Render (FREE)
- ✅ Secure authentication with username/password
- ✅ JWT tokens with 7-day sessions
- ✅ APK built and ready (~10MB)
- ✅ All media stored in Cloudflare R2
- ✅ Total app size: Well under 50MB!

## Authentication Features:

- ✅ Login page (username/password)
- ✅ Change password in Settings
- ✅ Logout button in Settings
- ✅ 7-day session duration
- ✅ Secure password hashing
- ✅ First user becomes admin automatically

---

## Notes:

**Free Render Limitations:**
- App sleeps after 15 min of inactivity
- First request after sleep takes ~30 seconds to wake up
- Perfect for personal use!

**Want to keep it awake?**
- Upgrade to paid plan ($7/month) for always-on
- Or use a free cron job service to ping it every 14 minutes

---

## Alternative Deployment Methods (Without GitHub):

### Method 1: Direct Git Push to Render
1. In Render dashboard: "New +" → "Web Service"
2. Choose "Deploy from Git repository"
3. Select "Add repository" → "Use existing repository"
4. Follow Render's instructions to push directly

### Method 2: Manual Upload
1. Zip your entire project folder
2. In Render: "New +" → "Static Site" or use Render CLI
3. Upload the zip file
4. Configure build commands manually

### Method 3: Use Alternative Platforms That Don't Require GitHub
- **Vercel**: Supports drag-and-drop deployment
- **Netlify**: Manual upload option available
- **Fly.io**: Deploy with CLI (no GitHub needed)

---

## Troubleshooting:

**"Please login (10001)" Error?**
- Clear app data or localStorage
- Login again
- Check JWT_SECRET is set on Render

**Can't login?**
- Verify admin user was created on production
- Check username/password are correct
- View Render logs for errors

**Build fails on Render?**
- Check environment variables are correct (especially JWT_SECRET)
- View logs in Render dashboard

**APK won't install?**
- Enable "Unknown sources" in Android settings
- Try: Settings → Security → Install unknown apps

**App can't connect to server?**
- Check the URL in `capacitor.config.ts` is correct
- Make sure Render deployment is live (green status)

**Token expired after 7 days?**
- Just login again to get a new token

Need help? Check the logs in Render dashboard or see `AUTHENTICATION.md` for more details!
