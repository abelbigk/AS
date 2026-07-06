# Quick Start Guide - React Native App

## 1-Minute Setup

```bash
# 1. Navigate to the project
cd c:\mycode3\mobile-rn

# 2. Install dependencies (if not already done)
npm install

# 3. Set up environment
copy .env.example .env

# 4. Run the development server
npm start
```

## Running on Android

### Option A: Expo Go App (Fastest)
1. Download Expo Go on your Android phone
2. From terminal: `npm start`
3. Scan the QR code with Expo Go
4. App loads instantly

### Option B: Android Emulator
```bash
npm run android
# or
npm start
# Then press 'a' in terminal
```

### Option C: Physical Device (USB)
```bash
# Enable USB Debugging on phone
npm start
# Press 'a' in terminal (requires correct API URL in .env)
```

## First Time Setup Checklist

- [ ] Backend server is running (`npm run dev` in root)
- [ ] `.env` file created with correct `EXPO_PUBLIC_API_URL`
- [ ] Node modules installed (`npm install`)
- [ ] Android emulator running OR phone connected
- [ ] Can see "Welcome" screen or login prompt

## Testing Features

### 1. Login
```
Default test account (if backend has one):
- Username: testuser
- Password: testpass

Or create new account if registration is enabled
```

### 2. Create Category
- Tap "Home" tab
- Tap floating "+" button
- Enter category name
- Tap "Create"

### 3. View Category Content
- Tap on any category card
- Should see empty or existing content
- Tap "+" to add content items

### 4. Status Screens
- Tap "Queued" tab - shows queued items
- Tap "Done" tab - shows completed items
- Tap back to return

### 5. Settings
- Tap "Settings" tab
- View profile info
- Tap "Logout" to test logout

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't connect to backend | Check `.env` has correct API URL, ensure backend is running |
| Blank white screen | Check console: `npm start --verbose` |
| Module errors | Clear cache: `npm start --clear` |
| Android build fails | `npm install --legacy-peer-deps` |
| Slow performance | Use release build or reduce items in FlatList |

## Common Commands

```bash
# Start development server
npm start

# Run on Android emulator
npm run android

# Clear cache and restart
npm start --clear

# View logs
npm start --verbose

# Install specific package
npm install package-name

# Stop server
Ctrl+C

# Reset project (full clean)
npm run reset-project
```

## Environment Variables

Edit `.env` file:

```bash
# For local backend
EXPO_PUBLIC_API_URL=http://localhost:3000

# For Android emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000

# For physical device (replace with your IP)
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

## File Structure Quick Reference

```
mobile-rn/
├── src/screens/        ← React screens
├── src/store/          ← State management
├── src/api/            ← HTTP client
├── src/navigation/     ← Navigation setup
├── App.tsx             ← Root component
└── package.json        ← Dependencies
```

## Next Steps

1. **Test the app** - Login and navigate
2. **Read SCREENS.md** - Understand each screen
3. **Read SETUP.md** - Detailed setup guide
4. **Check REACT_NATIVE_MIGRATION.md** - Architecture details

## Need Help?

- Check SETUP.md for detailed instructions
- Check SCREENS.md to understand functionality
- Check React Native docs: https://reactnative.dev
- Check Expo docs: https://docs.expo.dev

## Performance Tips

- Use release builds for testing
- Keep backend running on fast connection
- Limit items in lists (pagination coming soon)
- Close other apps for better performance

Good luck! 🚀
