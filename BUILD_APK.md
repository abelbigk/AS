# 📱 Build Android APK - Step by Step

## Prerequisites Check:

Before building, make sure you have:
- ✅ Node.js installed
- ✅ Android Studio installed
- ✅ Java JDK installed (comes with Android Studio)
- ✅ Render backend is deployed and working

## Step 1: Update Capacitor Config ✅ DONE

Your `capacitor.config.ts` is now pointing to:
```
https://as-wryo.onrender.com
```

## Step 2: Build the Web App

Run these commands:

```bash
# Build the frontend
npm run build
```

This creates optimized production files in `dist/public/`

## Step 3: Sync with Android

```bash
# Copy web files to Android project
npx cap sync android
```

This copies your built app + custom icon to the Android folder.

## Step 4: Open in Android Studio

```bash
# Open Android Studio with your project
npx cap open android
```

This launches Android Studio.

## Step 5: Build APK in Android Studio

Once Android Studio opens:

### Method A: Debug APK (Fastest, for testing)
1. In Android Studio, click **Build** menu
2. Select **Build Bundle(s) / APK(s)**
3. Click **Build APK(s)**
4. Wait for build to complete (~2-3 minutes)
5. Click "locate" link in notification
6. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Method B: Release APK (Smaller, optimized)
1. In Android Studio, click **Build** menu
2. Select **Build Bundle(s) / APK(s)**
3. Click **Build APK(s)**
4. Then click **Build** → **Generate Signed Bundle / APK**
5. Select **APK**
6. Follow signing wizard (or skip signing for now)
7. APK location: `android/app/build/outputs/apk/release/app-release.apk`

## Step 6: Install APK on Phone

### Transfer APK to Phone:
1. Connect phone via USB
2. Copy APK file to phone storage
3. Or use: `adb install android/app/build/outputs/apk/debug/app-debug.apk`

### Install on Phone:
1. Open file manager on phone
2. Navigate to the APK file
3. Tap to install
4. If blocked: Settings → Security → Enable "Install from unknown sources"
5. Confirm installation

## Step 7: Test the App

1. Open the app on your phone
2. You should see the login page with your custom icon
3. Login with your credentials
4. Test all features!

## Quick Commands Summary:

```bash
# Full build process
npm run build
npx cap sync android
npx cap open android

# Then in Android Studio: Build → Build APK(s)
```

## Troubleshooting:

### "Build failed" in npm run build
- Check for TypeScript errors: `npm run check`
- Fix any errors and rebuild

### "Cleartext HTTP traffic not permitted"
- Make sure `cleartext: false` in capacitor.config.ts
- Make sure URL uses `https://` not `http://`

### App shows blank screen
- Check if Render backend is running
- Check Network tab in Chrome DevTools (inspect phone)
- Verify URL in capacitor.config.ts is correct

### Can't install APK on phone
- Enable "Install from unknown sources" in phone settings
- Check if APK is corrupted (should be ~10-15MB)

### App doesn't connect to backend
- Check Render URL is correct and accessible
- Test URL in phone browser first: https://as-wryo.onrender.com
- Check if you need to create admin user on production

## Expected APK Size:

- Debug APK: ~12-15 MB ✅
- Release APK: ~10-12 MB ✅
- Well under your 50MB limit! 🎉

## Production Checklist:

Before distributing your APK:
- [ ] Backend deployed and working on Render
- [ ] Admin user created on production database
- [ ] Test login works on production
- [ ] Custom icon showing in app
- [ ] All features tested on phone
- [ ] APK size under 50MB ✅

## Next Steps After APK:

1. Install on your phone
2. Login and test all features
3. If everything works → Share with others!
4. Keep the APK file backed up
5. When you update code:
   - Push to GitHub
   - Render auto-deploys
   - Rebuild APK with new features

---

**You're almost done!** Follow the steps above and you'll have your APK ready! 🚀📱
