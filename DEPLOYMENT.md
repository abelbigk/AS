# Deployment Instructions

## Deploy to Render (FREE)

### 1. Create Render Account
- Go to https://render.com
- Sign up with GitHub (free, no credit card needed)

### 2. Connect Repository
- Push this code to GitHub
- In Render dashboard, click "New +" → "Web Service"
- Connect your GitHub repository

### 3. Configure Service
Render will auto-detect settings from `render.yaml`, but verify:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Environment**: Node

### 4. Add Environment Variables
In Render dashboard, add these from your `.env` file:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_URL`
- `PORT` (set to 3000)
- `NODE_ENV` (set to production)

### 5. Deploy
- Click "Create Web Service"
- Wait 3-5 minutes for build
- Your backend will be live at: `https://your-app-name.onrender.com`

### 6. Build Android APK
After deployment:
1. Update `capacitor.config.ts` with your Render URL
2. Run: `npm run build`
3. Run: `npx cap sync`
4. Run: `cd android && ./gradlew assembleRelease`
5. APK will be in: `android/app/build/outputs/apk/release/`

## Note
- Free tier sleeps after 15 min inactivity
- First request after sleep takes ~30 sec to wake
- Perfect for personal use!
