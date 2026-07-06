# 🔴 Unable to Load Script - QUICK FIX

**Error**: "Unable to load script"  
**Cause**: Metro bundler not running or unreachable  
**Fix Time**: 2 minutes

---

## ⚡ Quick Fix (Do This Now)

### **Step 1: Start Metro Bundler**

Open **new PowerShell window** and run:

```bash
cd c:\mycode3\mobile-rn
npm start
```

✅ Wait for output like:
```
Metro: exp://192.168.x.x:8081
```

**DO NOT CLOSE THIS WINDOW** - Keep Metro running

---

### **Step 2: In Android Emulator - Reload App**

On the error screen in emulator, press: **R, R** (R key twice)

✅ App should reload and connect to Metro

---

### **Step 3: Verify**

You should see:
- Loading spinner (few seconds)
- Login screen appears
- No red error

**✅ Done!** App is now working.

---

## 🔧 If That Didn't Work

### **Option A: Check Metro Output**

In Metro terminal, look for errors:
```
ERROR: Something went wrong
[Error details here]
```

If you see errors, check:
1. Is backend running? (`npm run dev` in c:\mycode3)
2. Port 8081 not blocked by firewall
3. Try: `npm start --reset-cache`

### **Option B: Use Localhost Connection**

In Metro terminal, press: **l** (lowercase L)

Then in emulator, press: **R, R** to reload

---

### **Option C: Use Your PC IP Address**

Get your PC IP:
```powershell
ipconfig
```
Look for IPv4 address (e.g., 192.168.1.100)

In Metro terminal, press: **j**  
Enter your IP: `192.168.1.100`

Then in emulator, press: **R, R** to reload

---

## ✅ Correct Setup

Always need **3 things running**:

1. **Backend** (Terminal 1)
   ```bash
   cd c:\mycode3
   npm run dev
   ```
   ✅ Should show: `Server running on http://localhost:3000`

2. **Metro** (Terminal 2) ← **THIS WAS MISSING**
   ```bash
   cd c:\mycode3\mobile-rn
   npm start
   ```
   ✅ Should show: `Metro: exp://192.168.x.x:8081`

3. **Emulator/Device** (Terminal 3 - just open Android Studio)
   ✅ Run app in emulator

**All 3 running?** App works perfectly ✅

---

## 🎯 Summary

**You got the error because**: Metro bundler wasn't running

**Solution**: Start Metro with `npm start`

**Remember**: Metro must run alongside the app for development

**After first test**: You can build release APK without Metro (different process)

---

## 📚 Full Details

See: `METRO_CONNECTION_GUIDE.md` (comprehensive guide)

---

**Status**: Ready to fix! Follow steps above. 👍
