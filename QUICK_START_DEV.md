# Quick Start: Development

## Start the App

### Option 1: LAN Connection (Recommended for Mobile Testing)
```bash
cd c:\mycode3\app
npm run start
```
- Shows QR code in terminal
- Scan with Expo Go app on physical device/emulator
- Good for testing on real Android phone

### Option 2: Local Localhost
```bash
npm run start:local
```
- Connects via localhost:8081
- Only works on emulator, not physical device

### Option 3: Android Emulator
```bash
npm run android
```
- Auto-launches Android emulator
- Runs the app

### Option 4: iOS Simulator (macOS only)
```bash
npm run ios
```

---

## What You'll See

**On First Launch:**
1. App opens to **Login Screen**
2. Credentials: Use `username: test` and `password: test123` (or create new account)
3. On success: Redirects to **Home Screen**

**Home Screen Features:**
- ✅ List of categories in 2-column grid
- ✅ Pull down to refresh
- ✅ Tap search icon to filter categories
- ✅ Tap + icon to add new category
- ✅ Tap category to view details

**Tab Navigation (Bottom):**
- 📁 **Collections** - All categories and content
- ⏱️ **Queued** - Items marked as "queued"
- ✅ **Done** - Items marked as "done"
- ⚙️ **Settings** - User info and logout

**Settings Screen:**
- Shows username and name
- Logout button (red)

---

## Debugging

### View Logs
Terminal shows all console.log outputs and errors

### Access Expo DevTools
- Press `i` in terminal → Open iOS Simulator
- Press `a` in terminal → Open Android Emulator
- Press `w` in terminal → Open Web
- Press `r` in terminal → Reload app
- Press `p` in terminal → Toggle performance monitor

### Network Debugging
Use React Native Debugger to inspect network requests:
```bash
npm install -g react-native-debugger
react-native-debugger
```

---

## Test Credentials

**Demo Account:**
- Username: `test`
- Password: `test123`

Or create your own:
- Click "Don't have an account? Register"
- Fill in username + password (min 6 chars)
- Click "Create Account"

---

## Common Issues

### Issue: QR Code Not Scanning
- Make sure phone is on same WiFi as PC
- Check that PC firewall allows port 19000-19006
- Try `npm run start:tunnel` instead

### Issue: App Won't Connect
- Check that Metro terminal shows "Ready to accept connections"
- Try restarting: `npm run start` again
- Clear cache: `npm run start -- --clear`

### Issue: Changes Not Hot-Reloading
- Save file and wait 2-3 seconds
- If still not working, manually reload in Expo menu (swipe down + R)

### Issue: Login Fails
- Check that backend API is running: `https://as-wryo.onrender.com`
- Check network tab in React Native Debugger
- Look for errors in terminal

---

## Workflow During Development

1. **Start Metro**: `npm run start`
2. **Scan QR** with phone/emulator
3. **Make code changes** in your editor
4. **Save file** → Auto reloads
5. **Test in app**
6. **Repeat 3-5**

---

## Performance Tips

- **Don't use console.log excessively** - slows down hot reload
- **Memoize components** to prevent unnecessary re-renders
- **Use FlatList** instead of ScrollView for long lists
- **Remove old unused code** before committing

---

## Next Steps

1. ✅ Start the app: `npm run start`
2. ✅ Test login/register
3. ✅ Verify home screen shows categories
4. ✅ Test navigation tabs
5. ✅ Then work on Phase 2: CategoryDetail screen

---

**Ready? Run:**
```bash
cd c:\mycode3\app && npm run start
```
