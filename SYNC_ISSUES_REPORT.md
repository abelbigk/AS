# Code Sync Issues: Client vs App

## Critical Issues Found

### 🔴 1. **API URL Mismatch (HIGH PRIORITY)**
**Issue**: Different API endpoints
- **Client (Web)**: `https://content-organizer.onrender.com/api/trpc` (in `main.tsx`)
- **App (RN)**: `https://as-wryo.onrender.com/api/trpc` (in `App.tsx`)

**Location**:
- Client: `client/src/main.tsx` lines 45 & 48
- App: `app/src/App.tsx` lines 21-22

**Action**: Unify to one endpoint

---

### 🟡 2. **Authentication Implementation Differences (MEDIUM PRIORITY)**
**Issue**: Different auth storage & state management approaches

| Aspect | Client (Web) | App (RN) |
|--------|------------|---------|
| **Auth Hook** | `client/src/_core/hooks/useAuth.ts` | `app/src/hooks/useAuth.ts` |
| **Storage** | `localStorage` | `AsyncStorage` |
| **State Management** | Query-based (trpc) | Zustand store (`authStore.ts`) |
| **Token Key** | `"auth_token"` | `"auth_token"` |
| **User Cache** | `"manus-runtime-user-info"` (localStorage) | In Zustand store |

**Client Flow**:
- Token: stored in localStorage
- User info: queries from server, also cached in localStorage ("manus-runtime-user-info")
- Logout: clears localStorage & invalidates queries

**App Flow**:
- Token: stored in AsyncStorage via Zustand store
- User info: queries only when token exists (enabled: !!token)
- Logout: clears AsyncStorage & store

**Action**: Consider aligning state management patterns or document intentional differences

---

### 🟡 3. **Route/Screen Name Mismatches (MEDIUM PRIORITY)**
**Issue**: Inconsistent screen naming conventions

| Functionality | Client | App |
|--------------|--------|-----|
| Add functionality | `/add` → `Add.tsx` (page) | `AddCategoryScreen.tsx` (screen) |
| Category detail | `/category/:id` | `CategoryDetailScreen` |
| Subcategory detail | `/subcategory/:id` | `SubcategoryDetailScreen` |
| Done tasks | `/done` → `Done.tsx` | `DoneScreen.tsx` |
| Queued tasks | `/queued` → `Queued.tsx` | `QueuedScreen.tsx` |
| Settings | `/settings` → `Settings.tsx` | `SettingsScreen.tsx` |

**Location**:
- Client: `client/src/App.tsx` lines 73-81
- App: `app/src/navigation/RootNavigator.tsx` (check this file)

**Note**: This is a naming convention difference (pages vs screens), may not be an issue if functionality is identical

---

### 🟡 4. **useAuth Hook Implementation Differences (MEDIUM PRIORITY)**

**Client (`_core/hooks/useAuth.ts`)**:
```typescript
- Always queries auth.me (no conditional)
- Stores user in localStorage
- Supports redirect on unauthenticated
- Returns: { user, loading, error, isAuthenticated, refresh, logout }
```

**App (`hooks/useAuth.ts`)**:
```typescript
- Only queries if token exists (enabled: !!token)
- Relies on Zustand store for token state
- No redirect support
- Returns: { user, isLoading, error, isAuthenticated, logout, refresh }
```

**Issue**: 
- Client always fetches user (inefficient)
- App checks token first (more efficient)
- Inconsistent naming: `loading` vs `isLoading`

**Location**:
- Client: `client/src/_core/hooks/useAuth.ts`
- App: `app/src/hooks/useAuth.ts`

---

### 🟡 5. **Error Handling Differences (MEDIUM PRIORITY)**

**Client (`main.tsx`)**:
- Monitors query & mutation caches for errors
- Checks for UNAUTHORIZED status
- Redirects to login on auth failure
- Logs errors to console

**App (`App.tsx`)**:
- No error event subscription setup
- Error handling happens in individual components

**Issue**: App lacks centralized error handling like client

**Location**:
- Client: `client/src/main.tsx` lines 14-38
- App: `app/src/App.tsx` (missing this logic)

---

### 🟡 6. **Routing Framework Differences (LOWER PRIORITY)**
**Issue**: Different routing libraries

- **Client**: `wouter` (lightweight router)
- **App**: `@react-navigation/native` (React Navigation)

**This is intentional** (web vs native), but be aware when adding routes:
- Web routes: `client/src/App.tsx` Switch/Route components
- Native routes: defined in `app/src/navigation/RootNavigator.tsx`

---

### 🟡 7. **Query Client Configuration Differences (MEDIUM PRIORITY)**

**Client** (`main.tsx`):
```typescript
const queryClient = new QueryClient(); // Uses defaults
```

**App** (`App.tsx`):
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      gcTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});
```

**Issue**: Different cache times & retry strategies could cause inconsistent behavior

---

### 🔴 8. **Missing Screens in App (HIGH PRIORITY)**
**Issue**: App is missing screens that exist in Client

- ✅ Home
- ✅ CategoryDetail
- ✅ SubcategoryDetail
- ✅ Done
- ✅ Queued
- ✅ AddCategory
- ✅ Settings
- ✅ Login
- ❌ **NotFound (404 page)** - Missing in app!

**Location**:
- Client: `client/src/pages/NotFound.tsx`
- App: No equivalent found

---

### 🟡 9. **TRPC Client Configuration (MEDIUM PRIORITY)**

**Client** (`main.tsx`, lines 51-71):
```typescript
- Uses relative URL on web: "/api/trpc"
- Full URL on native: "https://content-organizer.onrender.com/api/trpc"
- Capacitor platform detection
- Includes credentials: "include"
```

**App** (`App.tsx`, lines 24-41):
```typescript
- Uses Constants.expoConfig for URL resolution
- Falls back to "https://as-wryo.onrender.com"
- No conditional URL based on platform
- Direct AsyncStorage token fetch
```

**Issue**:
- App's fallback URL is DIFFERENT from client!
- Client uses "content-organizer.onrender.com"
- App uses "as-wryo.onrender.com"

---

### 🟡 10. **Service Worker Registration (WEB ONLY)**

**Client** (`main.jsx` - note: .jsx not .tsx):
```typescript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
```

**App**: N/A (React Native doesn't need service workers)

**Note**: This is fine for web-specific features.

---

## Summary of Action Items

| Priority | Issue | File(s) | Action |
|----------|-------|---------|--------|
| 🔴 HIGH | API URL mismatch | `main.tsx`, `App.tsx` | **UNIFY ENDPOINTS NOW** |
| 🔴 HIGH | Missing NotFound screen | App navigation | Add 404 screen to app |
| 🟡 MED | Auth implementation diff | `useAuth.ts` (both) | Align state management or document |
| 🟡 MED | Error handling diff | `main.tsx` vs `App.tsx` | Add error subscription to app |
| 🟡 MED | Query client config diff | Both entry points | Align retry & cache settings |
| 🟡 MED | useAuth naming | Both hooks | Standardize `loading` vs `isLoading` |
| 🟡 LOW | Route naming | Both | Document as intentional (web vs native) |

---

## Recommended Fix Order

1. **First**: Fix API URL to use same endpoint (likely to "content-organizer.onrender.com")
2. **Second**: Add NotFound screen to app
3. **Third**: Align error handling in app's App.tsx
4. **Fourth**: Align query client configurations
5. **Fifth**: Consider refactoring useAuth for consistency
