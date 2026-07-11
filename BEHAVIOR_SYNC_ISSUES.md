# Behavior Differences: Client vs App

## 🔴 CRITICAL ISSUES

### 1. **AddCategoryScreen is a STUB (NOT IMPLEMENTED)**
**Status**: ⚠️ INCOMPLETE

**Client** (`client/src/pages/Add.tsx`):
```typescript
// Fully implemented
- AddCategoryForm component
- Info banner with instructions
- Beautiful styled layout
- Actually adds categories
```

**App** (`app/src/screens/main/AddCategoryScreen.tsx`):
```typescript
// Just a placeholder
export default function AddCategoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Add Category Screen</Text>
    </View>
  );
}
```

**Action**: Implement AddCategoryScreen with AddCategoryForm equivalent

---

### 2. **CategoryDetailScreen is a STUB (SEVERELY LIMITED)**
**Status**: ⚠️ INCOMPLETE

**Client** (`client/src/pages/CategoryDetail.tsx`):
```typescript
// FULL IMPLEMENTATION (80+ lines)
- Show category details
- Edit category dialog
- Add/edit/delete subcategories
- Add/edit/delete content items
- Drag-and-drop reordering (dnd-kit)
- Batch operations (select multiple items)
- Search within category
- Image proxying for content
- Multiple dialogs and menus
- Fully interactive
```

**App** (`app/src/screens/main/CategoryDetailScreen.tsx`):
```typescript
// MINIMAL STUB (23 lines)
export default function CategoryDetailScreen({ route }: any) {
  const { categoryId } = route.params;
  const { data: category, isLoading } = trpc.categories.getById.useQuery({ categoryId });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{category?.name}</Text>
      <Text style={styles.subtitle}>{category?.description || 'No description'}</Text>
    </View>
  );
}
```

**Missing Features**:
- No subcategories display
- No content items display
- No edit/delete functionality
- No add subcategory
- No add content
- No drag-and-drop
- No image display
- No dialogs or menus

**Action**: Implement full CategoryDetailScreen matching client functionality

---

### 3. **Login Behavior Mismatch**
**Status**: ⚠️ DIFFERENT BEHAVIOR

**Client** (`client/src/pages/Login.tsx`):
```typescript
// On successful login:
onSuccess: (data) => {
  localStorage.setItem("auth_token", data.token);
  toast.success("Welcome back!");
  window.location.href = "/";  // ← FULL PAGE RELOAD
},
```

**App** (`app/src/screens/auth/LoginScreen.tsx`):
```typescript
// On successful login:
onSuccess: async (data) => {
  await setToken(data.token);        // ← Store in AsyncStorage
  setUser(data.user);                // ← Store user immediately
  setError(null);
},

// Registration has AUTO-LOGIN:
registerMutation.onSuccess: () => {
  // ...
  handleLogin();  // ← Auto-login after registration
},
```

**Differences**:
| Aspect | Client | App |
|--------|--------|-----|
| **Storage** | localStorage | AsyncStorage |
| **After Login** | Full page reload | Navigation switch |
| **After Register** | Show login form again | Auto-login immediately |
| **User Data** | Fetched on next render | Stored immediately |

**Issue**: App auto-logs in after registration (user-friendly), but client doesn't. May intentional but inconsistent.

---

### 4. **HomeScreen Search is Incomplete**
**Status**: ⚠️ LIMITED

**Client** (`client/src/pages/Home.tsx`):
```typescript
// Search searches:
- Categories by name AND description
- Subcategories by name AND description
- Content by query (server-side)
// Shows matching items all together
```

**App** (`app/src/screens/main/HomeScreen.tsx`):
```typescript
// Search only searches:
- Categories by name (NO description)
// Only shows categories, not subcategories or content
```

**Missing**: Searching subcategories and content items in app

---

### 5. **CategoryDetail Page is MUCH MORE COMPLEX than App**
**Status**: ⚠️ MASSIVE FEATURE GAP

**Client has** (lines 69-500+ in CategoryDetail.tsx):
- Full edit/delete operations
- Add subcategories inline
- Add content inline with image upload
- Drag-and-drop reordering
- Batch select & operations
- Multiple dialogs
- Image management
- Subcategory operations
- Content item operations

**App has**:
- Just displays name and description

**This is the BIGGEST gap** in the codebase.

---

## 🟡 MEDIUM ISSUES

### 6. **SubcategoryDetailScreen is a STUB**
**Status**: ❌ NOT IMPLEMENTED

**Client** has full `SubcategoryDetail.tsx` 

**App** (`app/src/screens/main/SubcategoryDetailScreen.tsx`):
```typescript
export default function SubcategoryDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Subcategory Detail Screen</Text>
    </View>
  );
}
```

**Action**: Implement full SubcategoryDetailScreen matching client

---

### 7. **QueuedScreen is a STUB**
**Status**: ❌ NOT IMPLEMENTED

**App** (`app/src/screens/main/QueuedScreen.tsx`):
```typescript
export default function QueuedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Queued Screen</Text>
    </View>
  );
}
```

**Action**: Implement full QueuedScreen matching client

---

### 8. **DoneScreen is a STUB**
**Status**: ❌ NOT IMPLEMENTED

**App** (`app/src/screens/main/DoneScreen.tsx`):
```typescript
export default function DoneScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Done Screen</Text>
    </View>
  );
}
```

**Action**: Implement full DoneScreen matching client

---

### 9. **SettingsScreen - Partially Implemented**
**Status**: 🔸 PARTIAL

**Client** (`client/src/pages/Settings.tsx`):
- Need to check full scope

**App** (`app/src/screens/main/SettingsScreen.tsx`):
```typescript
✅ Shows account info (username, name)
✅ Logout button works
❌ May be missing other client features
```

**Verify**: What else does client Settings have?

---

### 9. **Authentication Check on App Start**
**Status**: ⚠️ DIFFERENT APPROACHES

**Client** (`App.tsx`):
```typescript
// Always queries auth.me
const meQuery = trpc.auth.me.useQuery(undefined, {
  retry: false,
  refetchOnWindowFocus: false,
});
```

**App** (`App.tsx`):
```typescript
// Restores token from AsyncStorage on app start
useEffect(() => {
  restoreToken();
}, [restoreToken]);

// Then meQuery only runs if token exists
const meQuery = trpc.auth.me.useQuery(undefined, {
  enabled: !!token,  // ← Only if token
  retry: false,
  staleTime: 1000 * 60 * 5,
});
```

**Difference**: 
- Client always checks (wasteful if no token)
- App only checks if token exists (more efficient)

---

## Summary Table

| Screen | Client Status | App Status | Parity |
|--------|---------------|-----------|--------|
| **Login** | ✅ Full | ✅ Full | 🔸 Different behavior |
| **Home** | ✅ Full search | ⚠️ Limited search | ❌ NO |
| **CategoryDetail** | ✅ COMPLETE | ❌ STUB (only shows name/desc) | ❌ NO |
| **SubcategoryDetail** | ✅ Full | ❌ STUB (placeholder) | ❌ NO |
| **AddCategory** | ✅ Full | ❌ STUB (placeholder) | ❌ NO |
| **Queued** | ✅ Full | ❌ STUB (placeholder) | ❌ NO |
| **Done** | ✅ Full | ❌ STUB (placeholder) | ❌ NO |
| **Settings** | ✅ Full | 🟡 Partial (basic logout) | 🔸 PARTIAL |

---

## Recommended Fix Priority

### 🔴 MUST FIX (Breaking - Core Functionality Missing)
1. **CategoryDetailScreen** (currently just shows title/description)
   - Add subcategories display & management
   - Add content items display & management
   - Add edit/delete functionality
   - Add dialogs for editing
   
2. **AddCategoryScreen** (currently blank placeholder)
   - Implement category form
   - Add submission logic

### 🔴 HIGH PRIORITY (Screens are 100% Stubs)
3. **SubcategoryDetailScreen** (placeholder only)
4. **QueuedScreen** (placeholder only)
5. **DoneScreen** (placeholder only)

### 🟡 MEDIUM PRIORITY (Incomplete Features)
6. **HomeScreen** - Extend search to include subcategories & content (not just categories)
7. **SettingsScreen** - Check what client has and match

### 🔵 NICE TO HAVE (Behavior)
8. Consider auto-login after registration in client (currently app-only)
9. Align query client configurations (retry/cache times)

---

## Files to Fix (Priority Order)

```
CRITICAL CORE FUNCTIONALITY:
1. app/src/screens/main/CategoryDetailScreen.tsx       ← EXPAND (currently 23 lines)
2. app/src/screens/main/AddCategoryScreen.tsx          ← EXPAND (currently 10 lines)

FULL STUBS (IMPLEMENT):
3. app/src/screens/main/SubcategoryDetailScreen.tsx    ← Currently 23-line placeholder
4. app/src/screens/main/QueuedScreen.tsx               ← Currently 23-line placeholder
5. app/src/screens/main/DoneScreen.tsx                 ← Currently 23-line placeholder

IMPROVEMENTS:
6. app/src/screens/main/HomeScreen.tsx                 ← Extend search functionality
7. app/src/screens/main/SettingsScreen.tsx             ← Verify completeness
8. client/src/pages/Settings.tsx                       ← Check what's needed
```
