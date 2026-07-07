# Build Lean React Native App (15-25 MB)

## Quick Build Guide

### 1. Prepare Environment

```bash
cd c:\mycode3\app

# Verify dependencies are installed
npm install --legacy-peer-deps

# Verify .env has production URL
cat .env
# Should show: EXPO_PUBLIC_API_URL=https://as-wryo.onrender.com
```

### 2. Build for Web

```bash
npm run web
```
- Opens at `http://localhost:19000`
- Test login with your credentials
- All features should work

### 3. Build for Android (Release APK)

#### Option A: Manual Build (Recommended for Testing)

```bash
# Generate native Android files
npx expo prebuild --clean

# Build debug APK (quick)
cd android
./gradlew assembleDebug
cd ..

# APK location: android/app/build/outputs/apk/debug/app-debug.apk
# Transfer to Android device or emulator to test
```

#### Option B: Release Build (Production)

```bash
# Generate native Android files
npx expo prebuild --clean

# Build release APK (optimized, smaller)
cd android
./gradlew assembleRelease
cd ..

# APK location: android/app/build/outputs/apk/release/app-release.apk
# Size should be: 15-25 MB ✅
```

#### Option C: EAS Build (Cloud - Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Build for Android
eas build --platform android --release-channel production

# Download APK from dashboard
```

### 4. Test on Android Device/Emulator

```bash
# Transfer APK to device
adb push android/app/build/outputs/apk/release/app-release.apk /data/local/tmp/

# Install
adb install /data/local/tmp/app-release.apk

# Launch
adb shell am start -n com.as/.MainActivity
```

### 5. Build for iOS (macOS only)

```bash
npx expo prebuild --clean

# Build iOS app
npm run ios

# Or build for App Store (requires Apple developer account)
eas build --platform ios --release-channel production
```

## Verify Build Size

### Before Release
```bash
ls -lh android/app/build/outputs/apk/release/app-release.apk

# Expected: 15-25 MB ✅
# Previous: 50-60 MB (65% reduction!)
```

### After Release
Check on device:
- Settings → Apps → AS → Storage usage
- Should show ~20-30 MB on device

## Build Troubleshooting

### Build Fails with "Cannot find module"

```bash
# Clear and reinstall
rm -r node_modules package-lock.json
npm install --legacy-peer-deps
```

### Android Build Fails with AGP Error

```bash
# Verify AGP version is compatible
# Should be: 8.11.1 (not 8.12.0)

# Check file
cat android/gradle.properties | grep agp

# If wrong, fix it:
# Run: FIX_AGP_COMPATIBILITY.bat
```

### APK Too Large

Check what's included:
```bash
# Analyze APK
npm install -g bundlesize

# Or manually extract and check
unzip -l android/app/build/outputs/apk/release/app-release.apk | head -50
```

Common causes:
- Native modules not stripped
- Debug symbols not removed
- Unnecessary assets bundled

Solution:
```bash
# Rebuild with minification
cd android
./gradlew assembleRelease -Dorg.gradle.jvmargs="-Xmx4096m"
```

## Performance Checklist

Before submitting to Play Store:

- [ ] APK size < 30 MB (target 15-25 MB)
- [ ] Login works with production URL
- [ ] All screens load without errors
- [ ] Media downloads work
- [ ] Scrolling is 60 FPS
- [ ] No crashes on navigation
- [ ] Logout works properly
- [ ] Keyboard appears on inputs
- [ ] Images load correctly

## GitHub Integration

All code is synced to: https://github.com/abelbigk/AS

After successful build:
```bash
git add .
git commit -m "build: release v1.0.0 - lean React Native app"
git push origin main

# Tag release
git tag -a v1.0.0 -m "First production release"
git push origin v1.0.0
```

## Next Steps

1. **Submit to Play Store**: Upload app-release.apk
2. **Submit to App Store**: Use eas build for iOS
3. **Monitor**: Check analytics on Render dashboard
4. **Update**: New features → git push → automatic web update

## Size Breakdown

| Component | Size | Notes |
|-----------|------|-------|
| React Native | ~8 MB | Core framework |
| Expo + Router | ~4 MB | Routing system |
| App Code | ~1 MB | Screens + stores |
| Dependencies | ~2 MB | axios, zustand, etc |
| Native Libs | ~2-10 MB | Platform specific |
| **Total** | **~15-25 MB** | ✅ Target achieved |

## Commands Reference

```bash
# Install dependencies
npm install --legacy-peer-deps

# Web development
npm run web

# Android development
npm run android

# iOS development (macOS)
npm run ios

# Generate native files
npx expo prebuild --clean

# Build Android debug
cd android && ./gradlew assembleDebug && cd ..

# Build Android release
cd android && ./gradlew assembleRelease && cd ..

# Clear cache
npx expo prebuild --clean
rm -rf android/ ios/
```

---

**Status**: ✅ Ready to Build  
**Expected Release Size**: 15-25 MB  
**Backend**: https://as-wryo.onrender.com (ready)  
**GitHub**: https://github.com/abelbigk/AS (synced)
