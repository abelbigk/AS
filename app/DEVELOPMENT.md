# Local Development Guide

This guide explains how to develop locally **without breaking the release build**.

## ⚠️ Important: Two Different Modes

The app has **two different purposes**:
1. **Local Development** - For testing changes during development
2. **Release Build** - For creating the final APK

**Never mix the two!** They use different configurations.

---

## 🚀 Option 1: Local Development with Expo CLI (SAFE for development)

This runs your app locally without affecting the release build.

### Prerequisites
```bash
npm install -g eas-cli
```

### Run Locally
```bash
# Start the development server
npm start

# Or with specific transport:
npm run start:local      # localhost only
npm run start:lan        # Local network
npm run start:tunnel     # Tunneling service
```

After running, you'll see:
```
› Metro waiting on exp://...
› Press 's' for Android
› Press 'w' for web
› Press 'q' to quit
```

### Test on Android Device/Emulator
1. Have Android emulator running or device connected
2. Press 's' in the development server terminal
3. App will install and run on your device

### Stop Development
- Press `q` to quit the dev server
- This **does NOT affect your release build**

---

## 📦 Option 2: Build Release APK (Releases the app)

This creates the final production APK for installation.

### Prerequisites
- Android SDK installed
- Gradle 8.7+ installed
- Key signing configured (if doing production release)

### Build APK
```bash
# Build the release APK locally
npm run build:apk-local
```

This will:
1. Bundle your React Native code
2. Compile Android native code
3. Generate: `android/app/build/outputs/apk/release/app-release.apk`

### Install APK on Device
```bash
# Connect your device and run:
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

---

## ✅ Safe Development Workflow

### For Making Changes:
```bash
1. Make code changes in src/
2. Run: npm start
3. Press 's' to reload on Android device
4. Test your changes
5. Press 'q' to stop dev server
```

### To Build for Release:
```bash
1. Verify changes work in local dev
2. Run: npm run build:apk-local
3. Test the APK: adb install -r app-release.apk
4. Once verified, commit changes to git
```

---

## 🔧 Important Files (Do NOT modify carelessly)

- **babel.config.cjs** - Babel transpilation config (MUST be .cjs only)
- **metro.config.cjs** - Metro bundler config (MUST be .cjs only)
- **package.json** - Dependencies and scripts
- **android/** - Native Android code
- **src/App.tsx** - Main app component

### ⚠️ Things That Break Builds:
- Having both `babel.config.js` AND `babel.config.cjs`
- Having both `metro.config.js` AND `metro.config.cjs`
- Deleting required node_modules without running `npm install`
- Modifying Android native code without understanding Gradle

---

## 🐛 Troubleshooting

### Issue: "Multiple configuration files found"
**Solution:** Keep ONLY `.cjs` files:
```bash
rm babel.config.js metro.config.js
```

### Issue: "Cannot find module 'babel-plugin-module-resolver'"
**Solution:**
```bash
npm install --save-dev babel-plugin-module-resolver
```

### Issue: Module resolution errors during bundling
**Solution:** 
```bash
npm install
npm run bundle:android
```

### Issue: Gradle build fails
**Solution:**
```bash
cd android
./gradlew clean
./gradlew assembleRelease
cd ..
```

### Issue: "App is stuck on loading screen"
**Solution:**
- Check that the API endpoint in `App.tsx` is correct
- Verify network connectivity on your device
- Check device logs: `adb logcat`

---

## 📝 API Configuration

The app connects to: `https://as-wryo.onrender.com`

To change this:
1. Edit `src/App.tsx` line 23
2. Change the apiUrl in `Constants.expoConfig?.extra?.apiUrl`
3. Rebuild with `npm run build:apk-local`

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| **Start local dev** | `npm start` |
| **Reload on device** | Press 's' in dev terminal |
| **Stop dev server** | Press 'q' in dev terminal |
| **Build APK** | `npm run build:apk-local` |
| **Install APK** | `adb install -r app-release.apk` |
| **View logs** | `adb logcat` |
| **Clear cache** | `rm -rf .expo node_modules` |
| **Reinstall deps** | `npm install` |

---

## 🚨 CRITICAL: After Making Changes

**ALWAYS TEST BEFORE BUILDING RELEASE:**
1. Run `npm start`
2. Test the feature on your device
3. If good, then: `npm run build:apk-local`
4. Install and test the APK
5. Only then commit to git

This prevents broken releases!
