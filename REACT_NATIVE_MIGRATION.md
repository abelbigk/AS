# React Native Migration Guide

## Overview

The mobile app has been completely rewritten in React Native using Expo, providing native Android performance while maintaining all functionality from the web version.

## What Changed

### ✅ Same Functionality
- All content organization features
- Category and subcategory management
- Content item CRUD operations
- Status tracking (default/queued/done)
- User authentication
- Settings and profile management

### ✅ Performance Improvements
- Native 60fps scrolling
- Instant touch response
- Native gesture handling
- Better memory management
- No WebView overhead
- Direct Android APIs access

### ❌ Removed (Web-only features)
- OAuth integration (can be added later)
- Image uploads to R2 (coming soon)
- Advanced search (coming soon)
- Drag-and-drop reordering (coming soon)
- Dark/light theme toggle (coming soon)

## Project Structure

```
mobile-rn/
├── src/
│   ├── api/
│   │   └── client.ts          # Axios HTTP client with auth
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── CategoryDetailScreen.tsx
│   │   ├── QueuedScreen.tsx
│   │   ├── DoneScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── store/
│   │   ├── auth.ts            # Auth state (Zustand)
│   │   └── content.ts         # Content state (Zustand)
│   └── navigation/
│       └── RootNavigator.tsx   # React Navigation setup
├── App.tsx                     # Root component
├── app.json                    # Expo configuration
├── package.json                # Dependencies
├── SETUP.md                    # Setup instructions
└── .env.example               # Environment template
```

## Key Technologies

| Aspect | Technology | Why |
|--------|-----------|-----|
| **Framework** | React Native | True native performance |
| **Build** | Expo | Fast development and building |
| **Navigation** | React Navigation | Native navigation patterns |
| **UI** | React Native Paper | Material Design components |
| **State** | Zustand | Simple, lightweight store |
| **Storage** | AsyncStorage | Persistent local data |
| **HTTP** | Axios | Type-safe HTTP requests |
| **Backend** | Same Express tRPC server | No backend changes needed |

## How It Works

### Architecture Flow

```
┌─────────────┐
│ User Phone  │
└──────┬──────┘
       │
       ├─ React Native App
       │   └─ Runs natively on Android
       │       • Native UI (React Native Paper)
       │       • Native gestures
       │       • Native performance
       │
       ├─ Communicates via HTTP (Axios)
       │
└───────────┬────────────────────┐
            │                    │
    ┌───────▼────────┐  ┌────────▼──────┐
    │ Express Server │  │ SQLite DB     │
    │ (port 3000)    │  │ (Turso)       │
    └────────────────┘  └───────────────┘
```

### Authentication Flow

```
1. User enters credentials on Login screen
2. Axios POSTs to /auth/login
3. Backend validates, returns JWT token
4. Token stored in AsyncStorage (encrypted)
5. Token auto-attached to all future requests
6. Navigation updates to show authenticated screens
7. On app restart, token is recovered from storage
```

### Data Flow

```
Screen Component
    ↓
useEffect() → fetchCategories()
    ↓
contentStore.getState().fetchCategories()
    ↓
apiClient.get('/categories')
    ↓
Express Backend
    ↓
Zustand Store (state updated)
    ↓
Component re-renders with new data
```

## Getting Started

### 1. Install Dependencies

```bash
cd mobile-rn
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your backend URL
```

### 3. Run Development Server

```bash
# Make sure main server is running in root:
# npm run dev

# Then in mobile-rn directory:
npm start

# Press 'a' for Android
# Or use Expo Go app to scan QR code
```

### 4. Build for Android

```bash
# Debug APK
eas build -p android --profile preview

# Release APK (requires EAS CLI)
eas build -p android --profile production
```

## Key Files to Understand

### `src/store/auth.ts`
Manages authentication state:
- User login/logout
- Token storage
- Auth validation on app start
- All screens check `isAuthenticated` from here

### `src/store/content.ts`
Manages content state:
- Categories, subcategories, content items
- CRUD operations
- API integration
- Used by all screens to access data

### `src/api/client.ts`
HTTP client configuration:
- Base URL configuration
- Automatic token injection
- Error handling
- Request/response interceptors

### `src/navigation/RootNavigator.tsx`
Navigation structure:
- Conditional auth/app navigator
- Bottom tab bar (Home, Queued, Done, Settings)
- Stack navigators for detail screens

## Connecting to Backend

The app communicates with the same Express backend as the web version. No changes needed to backend.

### API Endpoints Used

```
POST   /auth/login          # Login
POST   /auth/register       # Register
GET    /auth/me            # Current user
GET    /categories         # List categories
POST   /categories         # Create category
PATCH  /categories/:id     # Update category
DELETE /categories/:id     # Delete category

GET    /subcategories      # List subcategories
POST   /subcategories      # Create
PATCH  /subcategories/:id  # Update
DELETE /subcategories/:id  # Delete

GET    /content            # List content items
POST   /content            # Create
PATCH  /content/:id        # Update
DELETE /content/:id        # Delete
```

### Environment Configuration

Set `EXPO_PUBLIC_API_URL` in `.env`:

```bash
# Development
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000

# Or if using Android emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000

# Or localhost (Expo Go on device)
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Common Issues & Solutions

### "Can't connect to backend"
```bash
# Check backend is running
npm run dev  # in root directory

# Update .env with correct IP
# On Android emulator, use 10.0.2.2 instead of localhost
```

### "Module not found" errors
```bash
npm install --legacy-peer-deps
npm start --clear
```

### Slow performance
- Use release build instead of debug
- Reduce number of items in FlatList
- Check backend response times

### Android build issues
```bash
# Clean Android build
cd mobile-rn
rm -rf node_modules/.expo
npm install
```

## Adding New Features

### Adding a New Screen

1. Create file: `src/screens/NewScreen.tsx`
2. Add to navigation: `src/navigation/RootNavigator.tsx`
3. Add navigation option to tab or stack

### Adding State Management

1. Add new store in `src/store/newStore.ts`
2. Use `import { newStore } from '../store/newStore'`
3. Access with `const { data, action } = newStore()`

### Adding API Calls

1. Add endpoint to `src/api/client.ts` or store
2. Call with `apiClient.get/post/patch/delete()`
3. Update Zustand store with response
4. Component subscribes to store updates

## Performance Optimization Tips

### 1. Memoization
```tsx
import { useMemo, useCallback } from 'react';

const memoizedData = useMemo(() => {
  return items.filter(...)
}, [items])
```

### 2. FlatList Optimization
```tsx
<FlatList
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
/>
```

### 3. Image Optimization
```tsx
<Image
  source={{ uri: imageUrl }}
  style={{ width: 100, height: 100 }}
  resizeMode="contain"
/>
```

### 4. Bundle Size
- Lazy load screens with React.lazy()
- Remove unused dependencies
- Use production builds

## Next Steps

1. **Test on real devices** - Install on Android phone via USB
2. **User feedback** - Gather performance feedback
3. **Add missing features** - OAuth, media uploads, etc.
4. **iOS Support** - Add iPhone/iPad compatibility
5. **App stores** - Publish to Google Play Store
6. **Monitoring** - Add crash reporting (Sentry, etc.)

## Support

For issues:
1. Check SETUP.md in mobile-rn folder
2. Review React Native docs: https://reactnative.dev
3. Check Expo docs: https://docs.expo.dev
4. Review React Navigation: https://reactnavigation.org
