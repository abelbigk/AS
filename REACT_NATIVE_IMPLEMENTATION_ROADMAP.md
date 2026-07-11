# React Native Implementation Roadmap

## Phase 1: Project Setup (Foundation)

### Step 1.1: Initialize Expo Project
```bash
cd c:\mycode3\app

# Reset to clean Expo project (remove old files if they exist)
rm -rf node_modules package-lock.json
npx create-expo-app@latest . --template

# Or if already initialized:
npx expo@latest --version
```

### Step 1.2: Install Core Dependencies
```bash
npm install \
  @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack \
  react-native-screens react-native-safe-area-context \
  @react-native-async-storage/async-storage \
  axios zustand \
  @trpc/react-query @tanstack/react-query \
  react-native-image-crop-picker \
  react-native-reanimated react-native-gesture-handler \
  react-native-dotenv \
  sonner
```

### Step 1.3: Create Project Structure
```
app/
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.tsx       # Tab + Stack navigation setup
│   │   └── types.ts                 # Navigation types
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   ├── main/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── CategoryDetailScreen.tsx
│   │   │   ├── SubcategoryDetailScreen.tsx
│   │   │   ├── AddCategoryScreen.tsx
│   │   │   ├── DoneScreen.tsx
│   │   │   ├── QueuedScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   ├── components/
│   │   ├── CategoryCard.tsx
│   │   ├── ContentCard.tsx
│   │   ├── CroppedImage.tsx
│   │   ├── DraggableItem.tsx        # DnD wrapper (Reanimated)
│   │   └── ...other UI components
│   ├── lib/
│   │   ├── trpc.ts                  # TRPC client setup
│   │   ├── api.ts                   # Axios instance
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── useAuth.ts               # Auth hook
│   │   ├── useDragReorder.ts        # DnD logic
│   │   └── useSelection.ts          # Touch selection logic
│   ├── store/
│   │   └── authStore.ts             # Zustand auth store
│   ├── types/
│   │   └── index.ts                 # Data models (copy from website)
│   ├── App.tsx                      # Root component
│   └── index.ts
├── app.json                         # Expo config
├── tsconfig.json
└── package.json
```

### Step 1.4: Configure Expo
**File: `app.json`**
```json
{
  "expo": {
    "name": "AS App",
    "slug": "as-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTabletMode": true
    },
    "android": {
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "react-native-gesture-handler"
    ]
  }
}
```

### Step 1.5: Setup TRPC Client
**File: `src/lib/trpc.ts`**
```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../server/routers';

export const trpc = createTRPCReact<AppRouter>();
```

### Step 1.6: Setup Axios Instance
**File: `src/lib/api.ts`**
```typescript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://as-wryo.onrender.com';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach token to all requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Step 1.7: Setup Auth Store
**File: `src/store/authStore.ts`**
```typescript
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  token: string | null;
  user: any | null;
  isLoading: boolean;
  setToken: (token: string) => Promise<void>;
  setUser: (user: any) => void;
  logout: () => Promise<void>;
  restoreToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,
  
  setToken: async (token: string) => {
    await AsyncStorage.setItem('auth_token', token);
    set({ token });
  },
  
  setUser: (user: any) => set({ user }),
  
  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    set({ token: null, user: null });
  },
  
  restoreToken: async () => {
    const token = await AsyncStorage.getItem('auth_token');
    set({ token, isLoading: false });
  },
}));
```

---

## Phase 2: Authentication (Foundation for Protected Screens)

### Step 2.1: Implement Login Screen
**File: `src/screens/auth/LoginScreen.tsx`**
- Username + password inputs
- Register toggle
- Error handling with toast
- On success: store token, navigate to Home
- Session detection (1 year for RN)

### Step 2.2: Create useAuth Hook
**File: `src/hooks/useAuth.ts`**
- Validates token on app launch
- Auto-redirects to login if invalid
- Provides logout function
- Similar to website version but uses AsyncStorage + React Navigation

### Step 2.3: Setup Root Navigator
**File: `src/navigation/RootNavigator.tsx`**
- Conditional rendering: Auth stack vs Main stack
- Auth stack: Login screen only
- Main stack: Tab navigation + modal screens
- Handle deep linking for category/subcategory detail screens

---

## Phase 3: Main Screens (Feature Implementation)

### Step 3.1: Home Screen (Categories List)
**Implement**: `src/screens/main/HomeScreen.tsx`

**Features to Build**:
1. ✅ GET categories list with `trpc.categories.list`
2. ✅ 2-column FlatList layout (similar to web masonry)
3. ✅ CategoryCard component (image + title + count)
4. ✅ Pull-to-refresh (RefreshControl)
5. ✅ Search mode toggle with client-side filtering
6. ✅ Drag-to-reorder categories using:
   - Gesture handlers (PanResponder or react-native-reanimated)
   - POST `categories.reorder` on drop
7. ✅ Navigate to CategoryDetail on card press
8. ✅ Navigate to Add screen via floating action button

**Performance Tips**:
- Use `FlatList` with `maxToRenderPerBatch={6}`, `updateCellsBatchingPeriod={50}`
- Lazy load images with `Image.prefetch()`
- Memoize category cards to prevent re-renders

### Step 3.2: CategoryDetail Screen (Most Complex)
**Implement**: `src/screens/main/CategoryDetailScreen.tsx`

**Features to Build** (in priority order):
1. ✅ GET category with image + details
2. ✅ GET subcategories list (2-column FlatList)
3. ✅ GET content list for category (2-column masonry FlatList)
4. ✅ Hero header (background image with blur + dark overlay)
5. ✅ Search functionality (toggle search input, client-side filter)
6. ✅ Status filter (query param based, client-side filtering)
   - Shows only content matching status
   - Hides subcategories with no matching content
7. ✅ **Drag-to-reorder subcategories**:
   - Use `react-native-reanimated` with `PanGestureHandler`
   - POST `subcategories.reorder` on drop
   - Optimistic update
8. ✅ **Drag-to-reorder content**:
   - Similar to subcategories
   - POST `content.reorderInCategory` on drop
9. ✅ **Long-press selection mode**:
   - Long-press item → enter selection mode
   - Show checkboxes on cards
   - Touch move to auto-select/deselect items
   - Auto-scroll when finger at top/bottom
10. ✅ **Batch operations**:
    - Dropdown menu with: Remove, Delete, Move, etc.
    - POST `batch*` mutations
    - Toast confirmation
11. ✅ Buttons to add subcategories/content (modals)
12. ✅ Edit category via modal
13. ✅ Delete category with confirmation

**Component Breakdown**:
- `SubcategoryList` (FlatList + DnD wrapper)
- `ContentList` (FlatList + DnD wrapper)
- `DraggableSubcategoryCard`
- `DraggableContentCard`
- `SelectionActionBar` (batch operation buttons)

**State Management**:
- Local state: `isSelectMode`, `selectedIds`, `searchQuery`, `statusFilter`
- TRPC queries: `subcategories.list`, `content.listByCategory`
- TRPC mutations: `content.reorderInCategory`, `subcategories.reorder`, batch operations

### Step 3.3: SubcategoryDetail Screen
**Implement**: `src/screens/main/SubcategoryDetailScreen.tsx`

**Features to Build** (subset of CategoryDetail):
- Similar hero header as CategoryDetail
- Content list only (no subcategories)
- Drag-to-reorder content
- Search + status filtering
- Long-press selection
- Batch operations
- Add content modal
- Edit subcategory modal

---

## Phase 4: Supporting Screens

### Step 4.1: Add Category Screen
**Implement**: `src/screens/main/AddCategoryScreen.tsx`

**Form Fields**:
- Name input (required)
- Description input (optional)
- Image upload + crop
- Submit button

**Image Handling**:
- Use `react-native-image-crop-picker`
- Open camera or gallery picker on button press
- Display cropping UI
- Send image + crop data to server

### Step 4.2: Add Content (Modal)
**Implement as modal** in CategoryDetail/SubcategoryDetail screens

**Form Fields**:
- Heading input (required)
- Description input (optional)
- Image upload + crop
- Status selector (default/queued/done)
- Category multi-select
- Subcategory multi-select
- Submit button

### Step 4.3: Done & Queued Screens
**Implement**: `src/screens/main/DoneScreen.tsx`, `src/screens/main/QueuedScreen.tsx`

**Features**:
- List content filtered by status
- Toggle status icon to move between states
- Same ContentCard as CategoryDetail
- Batch operations

### Step 4.4: Settings Screen
**Implement**: `src/screens/main/SettingsScreen.tsx`

**Features** (TBD):
- Dark mode toggle
- User profile info
- Logout button
- App info

---

## Phase 5: Advanced Features

### Step 5.1: Drag-to-Reorder with Reanimated
**Implement**: `src/hooks/useDragReorder.ts` + `src/components/DraggableItem.tsx`

**Using `react-native-reanimated`**:
```typescript
// PanGestureHandler setup
const gesture = Gesture.Pan()
  .onUpdate((e) => {
    // Track drag offset
    animated.offsetY.value = e.translationY;
  })
  .onEnd((e) => {
    // Calculate drop position
    const newIndex = calculateDropIndex(e.translationY);
    // Update order
    updateOrder(newIndex);
    // Reset animation
    animated.offsetY.value = withSpring(0);
  });

// Animated style
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: animated.offsetY.value }],
}));
```

### Step 5.2: Touch Selection with Auto-Scroll
**Implement**: `src/hooks/useSelection.ts` + Selection logic in detail screens

**Gesture Detection**:
```typescript
// Long-press to start selection
const longPressGesture = Gesture.LongPress()
  .minDuration(500)
  .onStart(() => {
    setIsSelectMode(true);
    toggleItem(itemId);
  });

// Pan for touch move across items
const panGesture = Gesture.Pan()
  .onUpdate((e) => {
    const element = document.elementFromPoint(e.x, e.y); // RN equivalent?
    const itemId = extractItemId(element);
    if (itemId && !selectedIds.has(itemId)) {
      toggleItem(itemId);
    }
    // Auto-scroll logic
    if (e.y < 100) scrollUp();
    else if (e.y > screenHeight - 100) scrollDown();
  });
```

### Step 5.3: Image Cropping UI
**Implement**: `src/components/ImageCropModal.tsx`

Using `react-native-image-crop-picker`:
- Display selected image
- Crop area selector
- Rotation controls
- Save crop data → return to form

### Step 5.4: Android Back Button Handler
**Implement**: `src/hooks/useAndroidBackButton.ts`

```typescript
import { BackHandler } from 'react-native';
import { useEffect } from 'react';

export function useAndroidBackButton(handler: () => boolean) {
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handler
    );
    return () => subscription.remove();
  }, [handler]);
}

// In CategoryDetail:
useAndroidBackButton(() => {
  if (isSelectMode) {
    setIsSelectMode(false);
    return true; // Prevent default back
  }
  if (searchActive) {
    setSearchActive(false);
    return true;
  }
  return false; // Allow default back (navigate)
});
```

---

## Phase 6: Performance Optimization (Target 60 FPS)

### Step 6.1: Profile with React Native DevTools
```bash
# Start Metro with profiler
npx expo start --lan

# In app: shake device → select "Toggle Profiler"
```

### Step 6.2: Optimize FlatLists
```typescript
<FlatList
  data={items}
  maxToRenderPerBatch={6}
  updateCellsBatchingPeriod={50}
  initialNumToRender={12}
  removeClippedSubviews={true}
  keyExtractor={(item) => item.id.toString()}
  renderItem={({ item }) => <MemoizedCard item={item} />}
/>
```

### Step 6.3: Memoize Components
```typescript
const CategoryCard = React.memo(({ category, onPress }) => (
  // Render
));

// Or use useMemo for expensive computations
const filteredItems = useMemo(
  () => items.filter(item => item.status === statusFilter),
  [items, statusFilter]
);
```

### Step 6.4: Optimize Images
- Lazy load with `Image.prefetch()`
- Use appropriately sized images (not full resolution)
- Cache images locally if possible
- Progressive loading with placeholder

### Step 6.5: Gesture Performance
- Use `react-native-reanimated` for smooth animations (runs on native thread)
- Avoid heavy computations in gesture callbacks
- Debounce/throttle rapid updates

---

## Phase 7: Testing & Debugging

### Step 7.1: Metro Connection Test
```bash
cd c:\mycode3\app

# Start development server with LAN
npx expo start --lan

# On Android device/emulator:
# 1. Scan QR code with Expo Go app
# 2. Or manually enter IP if needed
```

### Step 7.2: Test Navigation
- [ ] Login → Home
- [ ] Home → CategoryDetail
- [ ] CategoryDetail → SubcategoryDetail
- [ ] All screens → Add modal
- [ ] Add → Back to parent

### Step 7.3: Test Drag-to-Reorder
- [ ] Drag subcategory → reorder
- [ ] Drag content → reorder
- [ ] Release → server update
- [ ] Refresh → persisted order

### Step 7.4: Test Touch Selection
- [ ] Long-press item → selection mode enters
- [ ] Tap item → checkbox toggles
- [ ] Swipe across items → multi-select
- [ ] Auto-scroll at edges
- [ ] Press back → selection mode exits

### Step 7.5: Test Search & Filters
- [ ] Toggle search → shows input
- [ ] Type query → filters live
- [ ] Status filter → shows only matching content
- [ ] Clear filters → resets

### Step 7.6: Test Android Features
- [ ] Back button → handles navigation + modals + selection mode
- [ ] File downloads → save to Downloads folder
- [ ] Camera picker → launch camera
- [ ] Gallery picker → select image

### Step 7.7: Monitor Performance
- [ ] Frame rate → target 60 FPS
- [ ] Memory usage → no leaks
- [ ] Bundle size → optimize if > 10 MB

---

## Phase 8: Production Build

### Step 8.1: EAS Build Setup
```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure --platform android
```

### Step 8.2: Build APK
```bash
# Development build (can reload code)
eas build --platform android --profile preview

# Production build (optimized)
eas build --platform android --profile production
```

### Step 8.3: Local Build (Alternative)
```bash
cd android
./gradlew assembleDebug    # Debug APK
./gradlew assembleRelease  # Release APK
```

---

## Estimated Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| 1. Setup | 1 day | Not started |
| 2. Auth | 1 day | Not started |
| 3. Main Screens | 5-7 days | Not started |
| 4. Supporting Screens | 2 days | Not started |
| 5. Advanced Features | 3-4 days | Not started |
| 6. Performance | 2-3 days | Not started |
| 7. Testing | 2 days | Not started |
| 8. Production | 1 day | Not started |
| **Total** | **17-23 days** | On schedule if 1 dev full-time |

---

## Key Decisions Made

1. **Expo Managed Workflow** (vs bare):
   - Pros: Faster setup, easier testing, no native compilation needed locally
   - Cons: Limited native modules (but we don't need many)
   - Decision: Use Expo + EAS for builds

2. **TRPC + React Query** (vs Redux/MobX):
   - Pros: Server-state centric, auto cache invalidation, same as website
   - Cons: Requires understanding of cache management
   - Decision: Keep same pattern as website for consistency

3. **React Navigation** (vs React Router Native):
   - Pros: Industry standard for RN, better platform integration
   - Cons: Different from web Wouter
   - Decision: Use standard navigation in RN

4. **react-native-reanimated** (vs Animated API):
   - Pros: Native thread performance (60 FPS guaranteed)
   - Cons: Steeper learning curve
   - Decision: Use Reanimated for smooth drag/touch gestures

5. **AsyncStorage** (vs secure-store):
   - Pros: Works on all platforms, sufficient for JWT
   - Cons: Not encrypted (but token has short TTL)
   - Decision: Use AsyncStorage for session token

---

## Critical Commands Reference

```bash
# Development
npx expo start --lan

# Testing on specific device
npx expo start --lan --android
npx expo start --lan --ios

# Build
eas build --platform android --profile preview

# Clean build
rm -rf .expo node_modules && npm install

# Debug
npx expo start --localhost

# Logging
npx expo logs
```

---

## Files to Create/Modify

**New files to create**:
- [ ] `src/navigation/RootNavigator.tsx`
- [ ] `src/screens/auth/LoginScreen.tsx`
- [ ] `src/screens/main/HomeScreen.tsx`
- [ ] `src/screens/main/CategoryDetailScreen.tsx`
- [ ] `src/screens/main/SubcategoryDetailScreen.tsx`
- [ ] `src/screens/main/AddCategoryScreen.tsx`
- [ ] `src/screens/main/DoneScreen.tsx`
- [ ] `src/screens/main/QueuedScreen.tsx`
- [ ] `src/screens/main/SettingsScreen.tsx`
- [ ] `src/components/CategoryCard.tsx`
- [ ] `src/components/ContentCard.tsx`
- [ ] `src/components/DraggableItem.tsx`
- [ ] `src/lib/trpc.ts`
- [ ] `src/lib/api.ts`
- [ ] `src/hooks/useAuth.ts`
- [ ] `src/hooks/useDragReorder.ts`
- [ ] `src/hooks/useSelection.ts`
- [ ] `src/store/authStore.ts`

**Files to modify**:
- [ ] `app.json` - Expo config
- [ ] `package.json` - Dependencies
- [ ] `App.tsx` - Root component setup
- [ ] `src/types/index.ts` - Copy from website

---

**READY TO START PHASE 1: PROJECT SETUP**

Next action: Set up the Expo project structure and dependencies.
