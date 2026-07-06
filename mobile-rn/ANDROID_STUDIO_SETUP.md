# Android Studio Setup Guide

## ✅ What Was Generated

The Expo prebuild has created a complete Android native project in the `android/` folder that's ready to open in Android Studio.

## 📂 Opening in Android Studio

### Option 1: From Android Studio (Recommended)

1. **Open Android Studio**
2. Click **"Open"** → **"Open an Existing Android Studio Project"**
3. Navigate to: `C:\mycode3\mobile-rn\android\`
4. Click **Open**
5. Wait for Gradle sync to complete

### Option 2: From Command Line

```bash
cd c:\mycode3\mobile-rn\android
# Then open with Android Studio command:
studio .
```

### Option 3: File Explorer

1. Open: `C:\mycode3\mobile-rn\android\`
2. Double-click the folder
3. Android Studio should recognize it and ask to open

## 🔄 Gradle Sync

When you open the project, Android Studio will:

1. **Detect** that this is an Android Gradle project
2. **Ask** to sync Gradle files
3. **Download** dependencies (Java, Gradle, Android SDK)
4. **Index** the project

This may take 5-10 minutes on first load.

### If Gradle Sync Fails

Try these steps:

```bash
# 1. Go to android folder
cd c:\mycode3\mobile-rn\android

# 2. Clean gradle
./gradlew clean

# 3. Sync gradle
./gradlew build

# 4. Try opening again in Android Studio
```

## 📱 Running the App

### 1. Set Up Android Virtual Device (AVD)

In Android Studio:
1. Click **Tools** → **Device Manager**
2. Click **Create Virtual Device**
3. Choose device (e.g., Pixel 5)
4. Choose API level (e.g., Android 12)
5. Click **Create**

### 2. Start the AVD

1. In Device Manager, click the **Play** button on your device
2. Wait for emulator to fully boot (may take 1-2 minutes)

### 3. Run the App from Android Studio

1. In Android Studio, click **Run** → **Run 'app'**
2. Or press **Shift + F10**
3. Select your emulator
4. Click **OK**

The app should build and deploy to the emulator.

### 4. Or Run from Terminal

```bash
cd c:\mycode3\mobile-rn

# Make sure emulator is running, then:
npm run android
```

## 🛠️ Project Structure

```
android/
├── app/                    ← Main app module
│   ├── src/
│   │   ├── main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── java/com/contentorganizer/
│   │   │   └── res/          ← Drawables, layouts
│   │   └── debug/
│   └── build.gradle
├── gradle/                 ← Gradle configuration
├── build.gradle           ← Project build config
├── settings.gradle        ← Module settings
└── gradlew               ← Gradle wrapper
```

## 📋 Checklist

Before running, ensure:

- [ ] Android Studio installed
- [ ] Android SDK installed (API 21+)
- [ ] Java SDK installed (11 or higher)
- [ ] Emulator created or device connected
- [ ] `npm install` completed in `mobile-rn/`
- [ ] Project opens without errors
- [ ] Gradle sync completes

## 🔧 Common Issues

### Gradle Sync Fails

```bash
# Clear gradle cache
cd c:\mycode3\mobile-rn\android
del /s .gradle
./gradlew clean build
```

### Build Fails

```bash
# Update gradle wrapper
./gradlew wrapper --gradle-version latest

# Or rebuild
./gradlew clean build
```

### Emulator Won't Start

1. Open Android Studio → Tools → Device Manager
2. Check device configuration
3. Try creating a new device
4. Or connect physical device via USB

### App Crashes on Launch

1. Check LogCat for errors
2. Verify backend is running: `npm run dev` in root
3. Check `.env` configuration
4. Check backend URL in code

## 📱 Testing on Physical Device

### Prerequisites

- Android phone with USB debugging enabled
- USB cable

### Steps

1. Connect phone to computer
2. Enable **Developer Options** on phone
3. Enable **USB Debugging**
4. In Android Studio: **Run** → **Select Device**
5. Choose your phone
6. Click **OK**

## 🚀 Next Steps

1. Open project in Android Studio
2. Wait for Gradle sync
3. Create/start AVD (emulator)
4. Click **Run** → **Run 'app'**
5. App should build and deploy

## 📞 Help

If you encounter issues:

1. Check **Logcat** for error messages
2. Check **Build** console output
3. Verify SDK versions match app requirements
4. Try **File** → **Invalidate Caches** → **Restart**

## ✅ Success

You'll know it's working when:
- ✅ Project opens in Android Studio
- ✅ Gradle sync completes without errors
- ✅ No red error icons in project tree
- ✅ App builds and runs on emulator/device
- ✅ You see the login screen on your device

---

**Project:** Content Organizer React Native  
**Platform:** Android  
**Build System:** Gradle  
**SDK Level:** API 21+ (Android 5.0+)
