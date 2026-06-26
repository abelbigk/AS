# 🚀 Quick Start Guide - Deploy & Build APK

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
   R2_ACCOUNT_ID=your_value_from_env
   R2_ACCESS_KEY_ID=your_value_from_env
   R2_SECRET_ACCESS_KEY=your_value_from_env
   R2_BUCKET=your_value_from_env
   R2_PUBLIC_URL=your_value_from_env
   ```

5. **Deploy**:
   - Click "Create Web Service"
   - Wait 3-5 minutes for build to complete
   - You'll get a URL like: `https://content-organizer-xxxx.onrender.com`
   - **Copy this URL!** You'll need it for the APK

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

---

## ✅ Done!

Your app is now:
- ✅ Backend hosted on Render (FREE)
- ✅ APK built and ready (~10MB)
- ✅ All media stored in Cloudflare R2
- ✅ Total app size: Well under 50MB!

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

**Build fails on Render?**
- Check environment variables are correct
- View logs in Render dashboard

**APK won't install?**
- Enable "Unknown sources" in Android settings
- Try: Settings → Security → Install unknown apps

**App can't connect to server?**
- Check the URL in `capacitor.config.ts` is correct
- Make sure Render deployment is live (green status)

Need help? Check the logs in Render dashboard!
