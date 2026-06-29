# AS Mobile (React Native)

Native React Native app for **AS** content organizer. It replaces the old Capacitor WebView client with a true native UI built on **Expo + React Navigation**.

The **backend is unchanged** — same Express + tRPC API, Turso DB, and Cloudflare R2 storage.

## Stack

- Expo SDK 56
- React Native 0.85
- React Navigation (tabs + stack)
- tRPC + React Query
- expo-image (fast image loading)
- expo-secure-store (JWT storage)
- react-native-draggable-flatlist (category reorder)

## Features (parity with web app)

- Login / register / logout / change password
- Home: categories, search, drag reorder
- Category & subcategory detail pages
- Content cards: queue, done, edit, delete
- Add category, subcategory, content (with image upload)
- Queued & Done views
- Settings: theme, uncategorized list, session info

## Setup

1. **Start the API** (from repo root):

```bash
pnpm install
pnpm dev
```

For a physical device, the phone must reach your machine. Set the API URL (see below).

2. **Install mobile deps**:

```bash
cd mobile
npm install
```

3. **Configure API URL** (optional):

```bash
# mobile/.env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

Default production URL: `https://as-wryo.onrender.com`

4. **Run the app**:

```bash
npm start
# then press `a` for Android or scan QR with Expo Go
```

Or from repo root:

```bash
pnpm dev:mobile
```

## Build APK

```bash
cd mobile
npx expo prebuild
cd android
./gradlew assembleDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## Project layout

```
mobile/
  App.tsx                 Root providers + navigation
  src/
    navigation/           Tab + stack navigators
    screens/              All app screens
    components/           Reusable UI
    context/              Auth + theme
    lib/                  tRPC, upload, API helpers
```

## Legacy web client

The `client/` folder is the old React web UI (Vite + Capacitor). The mobile app in `mobile/` is the primary client going forward.
