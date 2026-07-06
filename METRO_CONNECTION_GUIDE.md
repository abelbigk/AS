# Metro Connection Guide - Fix "Unable to Load Script"

## Problem
The Android emulator can't connect to Metro bundler because it doesn't know where `localhost:8081` is.

## Solutions

### Option 1: Using Android Emulator (Recommended)

If you're using **Android emulator**, it can access your PC via a special IP:

#### Step 1: Get your PC's IP
In Windows PowerShell:
```powershell
ipconfig
```

Look for "IPv4 Address" under your active network adapter. Example: `192.168.1.100`

#### Step 2: Tell Metro to use that IP

In the Metro terminal (where `npm start` is running), press `?` to see commands:
```
Press ?  │ show all commands
```

Then press `j` to change the connection IP, and enter your PC's IPv4 address.

**OR** manually specify it:

Kill current Metro (`Ctrl+C`), then start with:
```bash
npx expo start --localhost
# or 
npx expo start --lan  # This auto-detects your IP
```

#### Step 3: Reload app

In the emulator error screen, tap **RELOAD (R, R)** (press R twice)

---

### Option 2: Using USB Adb Port Forwarding

If on physical device or want to use emulator with USB:

```bash
adb reverse tcp:8081 tcp:8081
```

Then in Metro, press `l` for localhost.

---

### Option 3: Direct Connection

1. Find your PC's local IP: `ipconfig` → IPv4 Address
2. In app error screen, tap **RELOAD (R, R)**
3. When prompted for server IP, enter: `your-pc-ip:8081`

Example: `192.168.1.100:8081`

---

## Checking Metro is Running

Metro should show output like:
```
▀▀  
›Metro: exp://192.168.1.100:8081
› Web: http://localhost:8081
```

If Metro isn't running:
```bash
cd c:\mycode3\mobile-rn
npm start
```

---

## Backend Server

Also make sure your backend is running in another terminal:
```bash
cd c:\mycode3
npm run dev
```

Backend should be on `http://localhost:3000`

---

## Complete Setup

```powershell
# Terminal 1: Backend
cd c:\mycode3
npm run dev

# Terminal 2: Metro/React Native
cd c:\mycode3\mobile-rn
npx expo start --lan

# Terminal 3: Android Studio
# Run the app (Shift+F10 or Run menu)
```

---

## If Still Getting "Unable to Load Script"

1. Check Metro terminal - should show bundles compiling
2. Check emulator can access internet (run browser test)
3. Check firewall isn't blocking port 8081
4. Try `npx expo start --localhost` then use ADB forwarding
5. Check phone/emulator is on same network as PC

---

## Quick Fix

If the app is already installed and showing error:

1. Keep Metro running (`npm start` in `mobile-rn/`)
2. Tap **RELOAD (R, R)** on error screen
3. If still fails, tap **DISMISS** and try again

The app should load once Metro connects!
