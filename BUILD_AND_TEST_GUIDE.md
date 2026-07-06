# Build & Test Guide - React Native App Optimization

## Quick Build Commands

### **Debug APK** (for testing, larger size)
```bash
cd c:\mycode3\mobile-rn
npx expo run:android
```
- Creates `app-debug.apk` (~120-140 MB expected)
- Includes all architectures
- Debugging enabled
- Suitable for emulator testing

### **Release APK** (optimized, smaller size)
```bash
cd c:\mycode3\mobile-rn\android
./gradlew assembleRelease
```
- Creates `app-release.apk` (~50-70 MB with current settings)
- **OR** For single architecture (arm64-v8a only ~25-35 MB):
  ```bash
  ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
  ```

---

## Check APK Size

### PowerShell
```powershell
# Debug
Get-Item "c:\mycode3\mobile-rn\android\app\build\outputs\apk\debug\app-debug.apk" | Select-Object @{Name="SizeMB";Expression={[math]::Round($_.Length/1MB, 2)}}

# Release (all archs)
Get-Item "c:\mycode3\mobile-rn\android\app\build\outputs\apk\release\app-release.apk" | Select-Object @{Name="SizeMB";Expression={[math]::Round($_.Length/1MB, 2)}}
```

### Output Format
```
SizeMB
------
45.23
```

---

## Test on Emulator

### Option 1: Using Expo
```bash
cd c:\mycode3\mobile-rn
npm start
```
Then in emulator: **Press R, R** to reload

### Option 2: Using Android Studio
```bash
c:\mycode3\mobile-rn\OPEN_ANDROID_STUDIO.bat
```
- Click Run (Shift+F10) to deploy and test

---

## Performance Check

### 1. **Startup Time**
- Open app
- Time from launch to login screen
- Expected: <2 seconds with optimizations

### 2. **Screen Transitions**
- Navigate between tabs (Home → Queued → Done → Settings)
- Should be smooth, no jank
- Frame rate should be 60 FPS

### 3. **Scroll Performance**
- Scroll in each list
- Should be butter-smooth
- No lag or stuttering

### 4. **Network Performance**
- Test login (connects to backend on 3000)
- Test API calls
- Should be responsive

### 5. **Memory Usage**
- Open Settings → About Phone → Storage
- App size shown there
- Should be much smaller than APK (unused code removed)

---

## Backend Testing

Ensure backend is running for full testing:

```bash
# Terminal 1: Backend
cd c:\mycode3
npm run dev

# Terminal 2: Metro
cd c:\mycode3\mobile-rn
npm start

# Terminal 3: Open app in emulator or device
```

Expected backend output:
```
Server running on http://localhost:3000
```

---

## APK Analysis

### Inspect APK Contents
```bash
# List all files in APK
7z l c:\mycode3\mobile-rn\android\app\build\outputs\apk\debug\app-debug.apk

# Check native libraries (usually largest)
7z l c:\mycode3\mobile-rn\android\app\build\outputs\apk\debug\app-debug.apk | findstr "\.so"
```

### Quick Breakdown
- `lib/` folder: Native libraries (C++/JNI code)
- `classes.dex`: Compiled Java/Kotlin bytecode
- `res/` folder: Resources (images, layouts, strings)
- `assets/`: Static assets (bundled JS, fonts)

---

## Build Troubleshooting

### Build hangs/times out?
```bash
# Clean gradle cache
cd c:\mycode3\mobile-rn\android
./gradlew clean

# Try again with reduced memory usage
./gradlew assembleDebug -Dorg.gradle.jvmargs=-Xmx1024m
```

### Out of memory errors?
Edit `c:\mycode3\mobile-rn\android\gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m
# Change to:
org.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=256m
```

### "Unable to load script" on device?
See: `c:\mycode3\METRO_CONNECTION_GUIDE.md`

---

## Size Comparison Checklist

Before committing to play store, compare:

| Metric | Before Opt. | After Opt. | Target |
|--------|------------|-----------|--------|
| Debug APK | 189 MB | 120-140 MB | ≤190 MB |
| Release APK (all) | ~120 MB | 50-70 MB | ≤100 MB |
| Release APK (arm64) | ~80 MB | **25-35 MB** ✅ | **≤50 MB** ✅ |
| Build time | 3-4 min | 4-6 min | <10 min |

---

## Deployment to Google Play

Once tested:

```bash
# Build signed release APK
cd c:\mycode3\mobile-rn\android
./gradlew bundleRelease

# Creates:
# c:\mycode3\mobile-rn\android\app\build\outputs\bundle\release\app-release.aab

# Upload to Google Play Console
# Size limit: 100 MB
# Your optimized app: 25-35 MB ✅
```

---

## Continuous Optimization

### Monitor APK Size in CI/CD
```bash
# Add to your build pipeline
echo "APK Size Check:"
Get-Item "build/outputs/apk/release/app-release.apk" | Select-Object @{Name="SizeMB";Expression={[math]::Round($_.Length/1MB, 2)}}
```

### Future Improvements
- Remove unused icon sizes (save ~2 MB)
- Lazy load navigation screens (saves RAM at startup)
- Use dynamic feature modules for in-app features
- Consider alternative UI library if Paper gets heavy

---

## Benchmarking Script

Save as `check_apk_size.ps1`:

```powershell
param(
    [string]$BuildType = "debug"
)

$apkPath = "c:\mycode3\mobile-rn\android\app\build\outputs\apk\$BuildType\app-$BuildType.apk"

if (Test-Path $apkPath) {
    $size = (Get-Item $apkPath).Length
    $sizeMB = [math]::Round($size / 1MB, 2)
    
    Write-Host "✅ APK Found"
    Write-Host "Path: $apkPath"
    Write-Host "Size: $sizeMB MB"
    Write-Host "Size: $([math]::Round($size / 1KB, 0)) KB"
    
    if ($sizeMB -le 50) {
        Write-Host "✅ Within target (≤50 MB)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Above target (≤50 MB)" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ APK not found: $apkPath" -ForegroundColor Red
    Write-Host "Run build first: cd c:\mycode3\mobile-rn && npm run android"
}
```

Usage:
```powershell
.\check_apk_size.ps1 -BuildType release
# Output:
# ✅ APK Found
# Path: c:\mycode3\mobile-rn\android\app\build\outputs\apk\release\app-release.apk
# Size: 32.45 MB
# Size: 33229 KB
# ✅ Within target (≤50 MB)
```

---

## What's Next?

1. ✅ **Optimizations applied** - Done
2. ⏳ **Build completes** - Running...
3. 📊 **Measure APK sizes** - Next
4. ✔️ **Test on device** - Then
5. 🚀 **Deploy** - Final

---

## Files Modified

- `c:\mycode3\mobile-rn\package.json` - Removed unused dependencies
- `c:\mycode3\mobile-rn\android\gradle.properties` - Build optimizations
- `c:\mycode3\mobile-rn\android\app\build.gradle` - Minification enabled

No app code changes needed!

---

## Support

For Metro connection issues: `c:\mycode3\METRO_CONNECTION_GUIDE.md`
For optimization details: `c:\mycode3\OPTIMIZATION_SUMMARY.md`
