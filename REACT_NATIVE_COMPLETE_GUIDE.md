# React Native App - Complete Development Guide

## Overview

This is a **unified React Native application** that mirrors your website (built with React + Tailwind). It will run on:
- ✅ Android (native app)
- ✅ iOS (native app ready)
- ✅ Web (via React Native Web)

Using the same backend as your website:
- 🔗 API: `https://as-wryo.onrender.com`
- 🗄️ Database: Turso (SQLite)
- 💾 Storage: Cloudflare R2
- 📝 Types: TypeScript

**Target Performance**: 60 FPS smooth scrolling

---

## Project Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **UI** | React Native | Cross-platform UI components |
| **Navigation** | React Navigation | Tabs + stacks |
| **State** | Zustand | Auth state |
| **API** | TRPC + Axios | Type-safe API calls |
| **Cache** | React Query | Server state + caching |
| **Gestures** | Reanimated + Gesture Handler | Smooth drag/touch |
| **Storage** | AsyncStorage | Token persistence |
| **Build** | Expo | Managed build service |

### Folder Structure

```
app/
├── src/
│   ├── App.tsx                    # Root: TRPC + QueryClient provider
│   ├── types/index.ts             # Data models
│   ├── lib/
│   │   ├── trpc.ts               # TRPC client instance
│   │   ├── api.ts                # Axios with interceptors
│   │   └── utils.ts              # Helper functions
│   ├── store/
│   │   └── authStore.ts          # Zustand: token + user
│   ├── hooks/
│   │   ├── useAuth.ts            # Auth validation + redirect
│   │   ├── useDragReorder.ts     # Drag-to-reorder logic (TODO)
│   │   └── useSelection.ts       # Touch selection logic (TODO)
│   ├── navigation/
│   │   └── RootNavigator.tsx     # Tab + Stack setup
│   └── screens/
│       ├── auth/
│       │   ├── LoginScreen.tsx   # ✅ Login/Register
│       │   └── RegisterScreen.tsx # (Part of Login)
│       └── main/
│           ├── HomeScreen.tsx              # ✅ Categories (70% done)
│           ├── CategoryDetailScreen.tsx    # TODO: Full implementation
│           ├── SubcategoryDetailScreen.tsx # TODO: Full implementation
│           ├── AddCategoryScreen.tsx       # TODO: Form + image crop
│           ├── DoneScreen.tsx              # TODO: Status filter
│           ├── QueuedScreen.tsx            # TODO: Status filter
│           └── SettingsScreen.tsx          # ✅ Basic (needs work)
├── index.tsx                      # Entry point
├── app.json                        # Expo config
├── package.json                   # Dependencies (1252 installed)
├── tsconfig.json                  # TypeScript config
└── babel.config.js                # Babel plugins

```

---

## Data Flow

### Authentication Flow
```
1. User enters username + password → LoginScreen
2. POST /trpc/auth.login
3. Server returns {token, user}
4. Zustand store saves token to AsyncStorage
5. useAuth() hook detects token
6. Navigation switches to MainTabs
7. TRPC queries now include Authorization header
```

### Category List Flow
```
1. HomeScreen mounts
2. useQuery trpc.categories.list
3. Request: GET /trpc?batch=1&input=[{"path":"categories.list"}]
4. Server returns [Category[], ...]
5. React Query caches response
6. Component renders 2-column FlatList
7. Pull-to-refresh calls refetch()
8. Navigation to category detail passes categoryId as param
```

### Category Detail Flow (Complex)
```
1. Route param: {categoryId: number}
2. Query 1: trpc.subcategories.list(categoryId)
3. Query 2: trpc.content.listByCategory(categoryId)
4. Component renders hero header + 2 masonry grids
5. User can:
   - Drag subcategories → POST reorder mutation
   - Drag content → POST reorder mutation
   - Long-press to select multiple items
   - Touch-move across items for batch selection
   - Search to filter items
   - Filter by status (default/queued/done)
```

---

## Current Status

### ✅ Completed (Phase 1)

**Core Setup:**
- [x] Expo project structure
- [x] TypeScript configuration
- [x] Navigation structure (tabs + stacks)
- [x] TRPC client + QueryClient providers
- [x] Zustand auth store
- [x] AsyncStorage token persistence

**Authentication:**
- [x] LoginScreen with login/register toggle
- [x] Form validation
- [x] Token storage
- [x] Auto-redirect based on token
- [x] Logout functionality

**Home Screen:**
- [x] Fetch categories from API
- [x] Display in 2-column grid
- [x] Pull-to-refresh
- [x] Search mode toggle
- [x] Navigation to category detail

**Navigation:**
- [x] Tab navigation (Collections, Queued, Done, Settings)
- [x] Stack navigation within tabs
- [x] Back button
- [x] Deep linking ready

**API Integration:**
- [x] TRPC client connected
- [x] Axios with JWT interceptors
- [x] Error handling

### 🚀 In Progress / TODO (Phases 2-5)

**Phase 2: CategoryDetail (Most Complex)**
- [ ] Fetch subcategories
- [ ] Fetch content by category
- [ ] 2-column masonry layout for both
- [ ] Hero header with background image
- [ ] Drag-to-reorder subcategories (using Reanimated)
- [ ] Drag-to-reorder content
- [ ] Long-press for selection mode
- [ ] Touch multi-select with auto-scroll
- [ ] Search functionality
- [ ] Status filtering
- [ ] Batch operations (remove, delete)
- [ ] Add subcategory modal
- [ ] Add content modal
- [ ] Edit category modal

**Phase 3: Remaining Screens**
- [ ] SubcategoryDetailScreen (similar to CategoryDetail)
- [ ] AddCategoryScreen (form + image crop)
- [ ] DoneScreen (content by status)
- [ ] QueuedScreen (content by status)
- [ ] SettingsScreen (more features)

**Phase 4: Advanced Features**
- [ ] Image upload + cropping UI
- [ ] Camera picker integration
- [ ] Gallery picker integration
- [ ] File download to Android Downloads
- [ ] Android back button handler

**Phase 5: Polish & Performance**
- [ ] 60 FPS optimization
- [ ] Image lazy loading
- [ ] Memory leak prevention
- [ ] Gesture smoothness
- [ ] Error boundary
- [ ] Loading states
- [ ] Empty states

---

## How to Implement a Screen

### Template: Category Detail Screen

```typescript
import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { trpc } from '@/lib/trpc';
import { useAndroidBackButton } from '@/hooks/useAndroidBackButton';

export default function CategoryDetailScreen({ route, navigation }: any) {
  const { categoryId } = route.params;
  const { width } = useWindowDimensions();
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'default' | 'queued' | 'done' | null>(null);

  // Queries
  const { data: category, isLoading: catLoading } = trpc.categories.getById.useQuery({ id: categoryId });
  const { data: subcategories = [] } = trpc.subcategories.list.useQuery({ categoryId });
  const { data: contentItems = [], refetch } = trpc.content.listByCategory.useQuery({
    categoryId,
    status: statusFilter || undefined,
  });

  // Filter by search
  const filteredContent = contentItems.filter(item =>
    item.heading.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle drag reorder
  const reorderMutation = trpc.content.reorderInCategory.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate();
    },
  });

  // Handle drag end
  const handleDragEnd = (oldIndex: number, newIndex: number) => {
    const newOrder = [...filteredContent];
    const [moved] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, moved);

    // Optimistic update
    utils.content.listByCategory.setData({ categoryId }, newOrder);

    // Send to server
    reorderMutation.mutate({
      categoryId,
      contentIds: newOrder.map(i => i.id),
    });
  };

  // Android back button
  useAndroidBackButton(() => {
    if (isSelectMode) {
      setIsSelectMode(false);
      return true; // Prevent default back
    }
    return false; // Allow default navigation back
  });

  if (catLoading) {
    return <ActivityIndicator />;
  }

  return (
    <View style={styles.container}>
      {/* Hero Header */}
      <View style={styles.heroHeader}>
        <Text style={styles.title}>{category?.name}</Text>
      </View>

      {/* Search + Filter */}
      <View style={styles.toolbar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          onPress={() =>
            setStatusFilter(
              statusFilter === null ? 'queued' : statusFilter === 'queued' ? 'done' : null
            )
          }
        >
          <Text>{statusFilter || 'All'}</Text>
        </TouchableOpacity>
      </View>

      {/* Content Grid */}
      <FlatList
        key={isSelectMode ? 'select-mode' : 'normal-mode'}
        data={filteredContent}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <ContentCard
            item={item}
            selected={selectedIds.has(item.id)}
            isSelectMode={isSelectMode}
            onToggleSelect={() => {
              const newSelected = new Set(selectedIds);
              if (newSelected.has(item.id)) {
                newSelected.delete(item.id);
              } else {
                newSelected.add(item.id);
              }
              setSelectedIds(newSelected);
            }}
          />
        )}
        numColumns={2}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  heroHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 24, fontWeight: 'bold' },
  toolbar: { flexDirection: 'row', padding: 12 },
  searchInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8 },
});
```

---

## Key Hooks & Utilities

### `useAuth()`
Authentication validation and logout

```typescript
const { user, isLoading, isAuthenticated, logout } = useAuth({
  redirectOnUnauthenticated: true,
});
```

### `useAndroidBackButton()` (TODO)
Handle Android back button

```typescript
useAndroidBackButton(() => {
  if (somethingOpen) {
    closeSomething();
    return true; // Prevent default
  }
  return false; // Allow default navigation
});
```

### `useDragReorder()` (TODO)
Drag-to-reorder logic with Reanimated

```typescript
const { animated, gesture, handleDragEnd } = useDragReorder({
  items,
  onReorder: (newOrder) => {
    mutation.mutate({ ids: newOrder.map(i => i.id) });
  },
});
```

### `useSelection()` (TODO)
Touch selection with auto-scroll

```typescript
const { selectedIds, handleLongPress, handleTouchMove } = useSelection({
  items,
  onSelectionChange: (ids) => setSelected(ids),
});
```

---

## Common Patterns

### Data Fetching
```typescript
// Simple query
const { data, isLoading, error } = trpc.categories.list.useQuery();

// Query with params
const { data } = trpc.content.listByCategory.useQuery({
  categoryId,
  status: 'queued',
});

// Query disabled until condition is true
const { data } = trpc.subcategories.list.useQuery(
  { categoryId },
  { enabled: !!categoryId }
);
```

### Mutations
```typescript
const mutation = trpc.content.create.useMutation({
  onSuccess: () => {
    // Invalidate cache to refetch
    utils.content.listByCategory.invalidate();
    // Or set data directly
    utils.content.listByCategory.setData({ categoryId }, newData);
  },
  onError: (error) => {
    console.error('Failed:', error.message);
    showToast(error.message);
  },
});

mutation.mutate({ heading: 'New item', categoryIds: [1, 2] });
```

### Loading States
```typescript
{isLoading ? (
  <ActivityIndicator size="large" color="#007AFF" />
) : (
  <FlatList data={items} {...props} />
)}
```

### Navigation
```typescript
// Navigate to screen with params
navigation.navigate('category-detail', { categoryId: 123 });

// Go back
navigation.goBack();

// Replace current screen
navigation.replace('home');
```

---

## Performance Optimization Guide

### 1. Memoize Components
```typescript
const CategoryCard = React.memo(({ category, onPress }) => {
  return <TouchableOpacity onPress={onPress}>...</TouchableOpacity>;
});
```

### 2. Use useMemo for Expensive Computations
```typescript
const filteredItems = useMemo(() => {
  return items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
}, [items, searchQuery]);
```

### 3. Optimize FlatList
```typescript
<FlatList
  data={items}
  maxToRenderPerBatch={6}              // Render 6 items at a time
  updateCellsBatchingPeriod={50}       // Every 50ms
  initialNumToRender={12}              // Initial render count
  removeClippedSubviews={true}         // Remove off-screen items
  keyExtractor={item => item.id.toString()}
  renderItem={({ item }) => <MemoizedCard item={item} />}
/>
```

### 4. Lazy Load Images
```typescript
import { Image } from 'react-native';

Image.prefetch(imageUrl); // Prefetch in background
```

### 5. Use Reanimated for Smooth Gestures
```typescript
// Runs on native thread, not JS thread
// So doesn't block UI
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: offset.value }],
}));
```

---

## Debugging Tips

### See all API calls
Use React Native Debugger to inspect network tab

### Enable React Query DevTools
```typescript
// In App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools/native';

<QueryClientProvider client={queryClient}>
  <ReactQueryDevtools initialIsOpen={false} />
  {/* App content */}
</QueryClientProvider>
```

### Log component renders
```typescript
useEffect(() => {
  console.log('CategoryDetail mounted with categoryId:', categoryId);
  return () => console.log('CategoryDetail unmounted');
}, [categoryId]);
```

### Monitor Performance
- Press `i` in Metro terminal for iOS
- Press `a` for Android
- Then toggle performance monitor (Cmd+D on iOS, Ctrl+M on Android)

---

## Building for Production

### Option 1: EAS Build (Recommended)
```bash
npm run build:android
npm run build:android:prod
```

### Option 2: Local Build
```bash
cd android
./gradlew assembleDebug    # Debug APK
./gradlew assembleRelease  # Release APK (requires keystore)
```

---

## Testing Checklist

- [ ] Login/Register works
- [ ] Token persists after app close
- [ ] Categories load on home screen
- [ ] Tap category navigates to detail
- [ ] Pull-to-refresh works
- [ ] Search filters categories
- [ ] Tab navigation works
- [ ] Settings screen shows user info
- [ ] Logout clears token + redirects
- [ ] Back button works on all screens
- [ ] No console errors
- [ ] 60 FPS on smooth scroll

---

## Next Steps

1. **Start development**:
   ```bash
   cd c:\mycode3\app
   npm run start
   ```

2. **Test on phone/emulator**:
   - Scan QR code with Expo Go
   - Test login → home screen → categories

3. **Implement CategoryDetail** (most complex screen):
   - Subcategories grid
   - Content grid
   - Drag reorder
   - Search + filter
   - Selection mode
   - Batch operations

4. **Complete remaining screens**

5. **Optimize performance** to 60 FPS

6. **Build and deploy** to Google Play

---

## Resources

- [React Native Docs](https://reactnative.dev)
- [Expo Docs](https://docs.expo.dev)
- [React Navigation Docs](https://reactnavigation.org)
- [TRPC Docs](https://trpc.io)
- [Reanimated Docs](https://docs.swmansion.com/react-native-reanimated/)
- [Gesture Handler Docs](https://docs.swmansion.com/react-native-gesture-handler/)

---

**Status**: Phase 1 ✅ Complete, Ready for Phase 2

**Commands**:
```bash
npm run start              # Start dev server
npm run android           # Test on Android
npm run build:android     # Build APK
npm install              # Install dependencies
```

---

Good luck! 🚀
