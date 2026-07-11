# Quick Reference Card - React Native App

## Start Development
```bash
cd c:\mycode3\app && npm run start
```

## Test
```bash
# Scan QR code with Expo Go
# OR
npm run android
```

## Credentials
```
Username: test
Password: test123
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/screens/main/CategoryDetailScreen.tsx` | Main work area (Phase 2) |
| `src/navigation/RootNavigator.tsx` | Navigation setup |
| `src/store/authStore.ts` | Auth state |
| `src/lib/trpc.ts` | TRPC client |
| `app.json` | Expo config |

---

## Common Commands

```bash
npm run start                # Start Metro
npm run android              # Open Android emulator
npm run build:android        # Build debug APK
npm run build:android:prod   # Build release APK
npm install                  # Install dependencies
npm run start -- --clear     # Clear cache + restart
```

---

## Quick APIs

```typescript
// Query
const { data, isLoading } = trpc.categories.list.useQuery();

// Mutation
const mut = trpc.content.create.useMutation();
mut.mutate({ heading: 'New' });

// Navigate
navigation.navigate('category-detail', { categoryId: 123 });

// Auth
const { user, logout } = useAuth();

// Get params
const { categoryId } = route.params;
```

---

## Documentation Order

1. `00_YOU_ARE_HERE_NOW.md` - Current status
2. `WEBSITE_ANALYSIS_COMPLETE.md` - Website structure
3. `START_HERE_PHASE_2.md` - How to build
4. `DEVELOPMENT_CHECKLIST.md` - Reference

---

## Next Milestone

✅ Phase 1 Complete - Foundation ready  
🚧 Phase 2 Next - Build CategoryDetail screen  
⏳ Estimated - 2-3 days

---

## Debugging

```bash
# See logs
npm run start -- --verbose

# React Native Debugger
react-native-debugger

# Clear everything
npm run start -- --clear
rm -r node_modules && npm install
```

---

## Performance Target

- ✅ 60 FPS smooth scroll
- ✅ <2s hot reload
- ✅ <10 MB app bundle (production)

---

## Architecture

```
App
├── RootNavigator (Auth vs Main)
│   ├── LoginScreen (Auth)
│   └── MainTabs
│       ├── HomeStack
│       ├── QueuedStack
│       ├── DoneStack
│       └── SettingsStack
└── TRPC → API → Backend
```

---

## Phase Breakdown

| Phase | Time | Status |
|-------|------|--------|
| 1. Setup | Done ✅ | Foundation complete |
| 2. CategoryDetail | 2-3d | Next |
| 3. Screens | 1-2d | After 2 |
| 4. Native Features | 1d | After 3 |
| 5. Optimization | 1-2d | After 4 |
| 6. Production | 1d | Final |

---

## Test Checklist

- [ ] App starts
- [ ] Login works
- [ ] Categories load
- [ ] Tabs work
- [ ] Logout works
- [ ] No crashes

---

## When Stuck

1. Check Metro terminal for errors
2. Check React Native Debugger network tab
3. Read relevant guide:
   - Navigation → React Navigation docs
   - Gestures → Reanimated docs
   - API → TRPC docs
   - Performance → React Native docs
4. Clear cache: `npm run start -- --clear`

---

## Success = 

- Foundation ✅
- Features 🚧
- Polish 🚧
- Production 🚧

You're at ✅. Ready for 🚧!

---

**Right now:**
```bash
npm run start
```

**Then read:**
`START_HERE_PHASE_2.md`

**Then build:**
CategoryDetail screen

---

Good luck! 🚀
