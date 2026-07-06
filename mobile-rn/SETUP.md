# React Native Content Organizer App

A high-performance mobile version of the Content Organizer app built with React Native, Expo, and React Native Paper.

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Android Studio (for Android development)
- Expo Go app (optional, for quick testing)

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env and set your API URL
# EXPO_PUBLIC_API_URL=http://your-backend-url:3000
```

3. **For Android Development:**
   - Install Java Development Kit (JDK 17+)
   - Install Android SDK
   - Create an AVD (Android Virtual Device) in Android Studio
   - Or connect a physical Android device with USB debugging enabled

## Development

### Using Expo Go (Fastest)
```bash
npm start
# Scan QR code with Expo Go app on your phone
```

### Android Emulator
```bash
npm run android
# or
expo start --android
```

### Android Device (USB)
```bash
npm start
# Press 'a' to open on connected device
```

### Development Server
The app runs on the same Node backend as the web version. Make sure your backend is running:
```bash
cd ..
npm run dev  # from root project directory
```

## Building for Production

### APK Build (Debug)
```bash
eas build -p android --profile preview
```

### APK Build (Release)
```bash
eas build -p android --profile production
```

Note: Requires EAS CLI setup: `npm install -g eas-cli`

## Project Structure

```
src/
├── api/           # API client and HTTP config
├── screens/       # React Native screen components
├── navigation/    # React Navigation setup
├── store/         # Zustand state management
└── types/         # TypeScript type definitions
```

## Features Implemented

- ✅ User authentication (login/register)
- ✅ Category management
- ✅ Content organization
- ✅ Status tracking (default/queued/done)
- ✅ Material Design UI (React Native Paper)
- ✅ Bottom tab navigation
- ✅ Pull-to-refresh
- ✅ Smooth animations
- ✅ Native performance

## Architecture

### State Management
- **Zustand** for global state (auth, content)
- Persistent storage using AsyncStorage
- HTTP caching with axios interceptors

### Navigation
- **React Navigation** for tab-based navigation
- Native stack navigator for screen hierarchy
- Proper back button handling

### UI Framework
- **React Native Paper** for Material Design components
- Supports light/dark themes
- Native-optimized controls

### API Integration
- Connected to existing Express backend via REST API
- tRPC compatible endpoints
- Automatic token management

## Known Limitations

- Android-only for now (iOS support can be added)
- Some advanced features (media uploads, complex filtering) coming soon
- Requires backend server to be running

## Troubleshooting

**"Module not found" errors:**
```bash
npm install
# If persists, clear cache:
npm start -- --clear
```

**Android build fails:**
- Ensure JAVA_HOME is set correctly
- Run: `android update sdk --no-ui --all`
- Check Android SDK version compatibility

**Can't connect to backend:**
- Verify EXPO_PUBLIC_API_URL in .env
- Ensure backend is running (npm run dev)
- Check firewall settings

**Performance issues:**
- Use release build instead of debug
- Reduce number of items rendered at once
- Enable Hermes engine in production

## Performance Improvements

This React Native version provides:
- Native 60fps scrolling
- Faster startup time
- Direct native API access
- Better memory management
- Native gesture handling
- Device-level optimizations

## Next Steps

1. Complete all screen implementations
2. Add media upload functionality
3. Implement offline sync
4. Add push notifications
5. iOS support
6. App Store distribution
