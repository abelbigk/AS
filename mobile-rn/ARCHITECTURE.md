# React Native App Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      ANDROID PHONE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           React Native Application                   │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │         Navigation Layer                       │  │   │
│  │  │  ┌──────────────┐                              │  │   │
│  │  │  │ RootNavigator│                              │  │   │
│  │  │  └──────────────┘                              │  │   │
│  │  │   ├─ Auth Navigator (Login)                    │  │   │
│  │  │   └─ App Navigator (Tabs)                      │  │   │
│  │  │       ├─ Home Stack                            │  │   │
│  │  │       ├─ Queued Stack                          │  │   │
│  │  │       ├─ Done Stack                            │  │   │
│  │  │       └─ Settings Stack                        │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                      ↓                                │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │       Screen Components Layer                  │  │   │
│  │  ├─ LoginScreen                                  │  │   │
│  │  ├─ HomeScreen                                   │  │   │
│  │  ├─ CategoryDetailScreen                         │  │   │
│  │  ├─ QueuedScreen                                 │  │   │
│  │  ├─ DoneScreen                                   │  │   │
│  │  └─ SettingsScreen                               │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                      ↓                                │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │     State Management Layer (Zustand)          │  │   │
│  │  ├─ authStore                                    │  │   │
│  │  │  ├─ user (User object)                        │  │   │
│  │  │  ├─ token (JWT token)                         │  │   │
│  │  │  └─ methods (login, logout, checkAuth)        │  │   │
│  │  │                                                │  │   │
│  │  ├─ contentStore                                 │  │   │
│  │  │  ├─ categories []                             │  │   │
│  │  │  ├─ subcategories []                          │  │   │
│  │  │  ├─ contentItems []                           │  │   │
│  │  │  └─ methods (fetch, create, update, delete)   │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                      ↓                                │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │     AsyncStorage (Persistent Local Storage)   │  │   │
│  │  ├─ auth_token                                   │  │   │
│  │  └─ other cached data                            │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                      ↓                                │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │     HTTP Client (Axios)                       │  │   │
│  │  ├─ baseURL: http://backend:3000                 │  │   │
│  │  ├─ Interceptors                                 │  │   │
│  │  │  ├─ Request: Add auth token                   │  │   │
│  │  │  └─ Response: Handle 401 errors               │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React Native Paper UI Components                   │   │
│  ├─ Material Design                                    │   │
│  ├─ Native Android widgets                             │   │
│  └─ 60fps rendering                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                           ↕ HTTP
┌─────────────────────────────────────────────────────────────┐
│                    EXPRESS BACKEND                          │
│               (server/_core/index.ts)                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           tRPC Router / Express Routes              │   │
│  ├─ /auth/login     → POST                             │   │
│  ├─ /auth/register  → POST                             │   │
│  ├─ /auth/me        → GET                              │   │
│  ├─ /categories     → GET, POST, PATCH, DELETE        │   │
│  ├─ /subcategories  → GET, POST, PATCH, DELETE        │   │
│  └─ /content        → GET, POST, PATCH, DELETE        │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │      Business Logic / Database Layer                │   │
│  │  (server/db.ts, server/routers.ts)                 │   │
│  ├─ Authentication                                     │   │
│  ├─ Authorization                                      │   │
│  ├─ Data validation                                    │   │
│  └─ Drizzle ORM queries                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Turso SQLite Database                       │   │
│  ├─ users table                                        │   │
│  ├─ categories table                                   │   │
│  ├─ subcategories table                                │   │
│  ├─ contentItems table                                 │   │
│  ├─ mediaItems table                                   │   │
│  └─ link tables (many-to-many)                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Example: Loading Categories

```
User Opens App (Home Screen)
│
├─ useEffect() triggered
│
├─ contentStore.fetchCategories() called
│
├─ API Request: GET /categories
│  │
│  ├─ Axios adds Authorization header
│  ├─ Sends request to backend
│  │
│  └─ Backend (server/routers.ts)
│     │
│     ├─ Verify JWT token
│     ├─ Get user ID from token
│     ├─ Query: SELECT * FROM categories WHERE userId = ?
│     │
│     └─ Return [{ id: 1, name: "Work", ... }, ...]
│
├─ Response received
│
├─ Zustand store updated: contentStore.categories = [...]
│
├─ Component subscribes to store
│
└─ FlatList re-renders with categories
```

## State Management Pattern

```
┌──────────────────────────────────────────────────────────┐
│                  Screen Component                        │
│  const { categories, fetchCategories } =                │
│    contentStore();                                       │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ↓ (subscribes to)
┌──────────────────────────────────────────────────────────┐
│                  Zustand Store                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ State:                                             │  │
│  │  categories: Category[]                            │  │
│  │  isLoading: boolean                                │  │
│  │                                                    │  │
│  │ Actions:                                           │  │
│  │  fetchCategories()                                 │  │
│  │  createCategory(data)                              │  │
│  │  updateCategory(id, data)                          │  │
│  │  deleteCategory(id)                                │  │
│  └────────────────────────────────────────────────────┘  │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ↓ (calls)
┌──────────────────────────────────────────────────────────┐
│                  API Client                              │
│  const response = await apiClient.get('/categories');   │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ↓ (HTTP request)
┌──────────────────────────────────────────────────────────┐
│                  Express Backend                         │
│  router.get('/categories', async (req, res) => {        │
│    const cats = await getCategories(req.user.id);       │
│    res.json(cats);                                       │
│  });                                                     │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ↓ (query)
┌──────────────────────────────────────────────────────────┐
│                  SQLite Database                         │
│  SELECT * FROM categories WHERE userId = ?              │
└──────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
┌────────────────┐
│  Login Screen  │
└────────┬────────┘
         │ User enters credentials
         ↓
┌─────────────────────────────────────┐
│ authStore.login(username, password) │
└────────┬────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────────────────┐
│  POST /auth/login                                │
│  {username: "user", password: "pass"}            │
└────────┬───────────────────────────────────────┘
         │
         ├─ Backend validates credentials
         ├─ Verifies bcrypt password hash
         ├─ Generates JWT token
         │
         ↓
┌──────────────────────────────────────┐
│  Response:                           │
│  { token: "eyJ...", user: {...} }    │
└────────┬──────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│ Token stored in AsyncStorage         │
│ authStore.token = token              │
│ authStore.isAuthenticated = true     │
└────────┬──────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│ Navigation updated                   │
│ Show App Navigator (authenticated)   │
└──────────────────────────────────────┘
```

## Component Communication Pattern

```
Parent Component (HomeScreen)
├─ Uses: contentStore
├─ Calls: fetchCategories()
├─ Listens to: categories, isLoading
│
├─ Renders FlatList
│  │
│  └─ renderItem() for each category
│     │
│     └─ Card Component
│        ├─ Displays category info
│        ├─ onPress → navigation.navigate('CategoryDetail', {...})
│        └─ (doesn't need prop passing)
│
└─ FAB (Floating Action Button)
   │
   ├─ onPress → setDialogVisible(true)
   │
   └─ Dialog Component
      ├─ Input field
      ├─ Cancel button
      └─ Create button
         │
         └─ contentStore.createCategory()
            │
            └─ Zustand updates state
               │
               └─ HomeScreen re-renders
```

## Navigation Stack Structure

```
RootNavigator
│
├─ isAuthenticated = false
│  └─ AuthNavigator
│     └─ Stack Navigator
│        └─ LoginScreen
│
└─ isAuthenticated = true
   └─ AppNavigator (Tab Navigator)
      │
      ├─ Home Tab
      │  └─ Stack Navigator
      │     ├─ HomeScreen (Home list)
      │     └─ CategoryDetailScreen (Details)
      │
      ├─ Queued Tab
      │  └─ Stack Navigator
      │     └─ QueuedScreen
      │
      ├─ Done Tab
      │  └─ Stack Navigator
      │     └─ DoneScreen
      │
      └─ Settings Tab
         └─ Stack Navigator
            └─ SettingsScreen
```

## Database Schema (Read-Only from React Native)

```
users
├─ id (Primary Key)
├─ username
├─ password (hashed)
├─ email
├─ name
├─ role (user/admin)
└─ timestamps

categories
├─ id (Primary Key)
├─ userId (Foreign Key → users)
├─ name
├─ description
├─ color
├─ order
└─ timestamps

content items
├─ id (Primary Key)
├─ userId (Foreign Key → users)
├─ heading
├─ description
├─ status (default/queued/done)
├─ posterUrl
└─ timestamps

linking tables
├─ contentCategoryLinks (many-to-many)
├─ contentSubcategoryLinks (many-to-many)
└─ subcategories (one-to-many with categories)
```

## Performance Characteristics

### App Startup
```
Start App
  ↓ (100ms)
Check AsyncStorage for token
  ↓ (50ms)
Validate token with backend
  ↓ (500-1000ms network)
Load authenticated user
  ↓ (50ms)
Render App Navigator
  ↓ (100ms)
Show Home screen
  ├─ Fetch categories
  └─ Display (render ~50ms)
```

### User Interaction
```
User scrolls FlatList
  ├─ Native Android rendering
  ├─ 60fps target
  └─ No JavaScript re-renders needed

User taps category
  ├─ Navigation transition (~300ms)
  ├─ CategoryDetail screen mounts
  ├─ useEffect fires
  ├─ Fetch content (~500-1000ms)
  └─ Display results
```

## Error Handling Flow

```
API Request
  │
  ├─ Success (200-299)
  │  └─ Update Zustand store
  │     └─ Component re-renders
  │
  ├─ Client Error (400-499)
  │  ├─ 401 Unauthorized
  │  │  ├─ Token expired
  │  │  ├─ authStore.logout()
  │  │  └─ Navigate to Login
  │  │
  │  ├─ 400 Bad Request
  │  │  ├─ Validation error
  │  │  ├─ Show Alert
  │  │  └─ User fixes input
  │  │
  │  └─ Other errors
  │     ├─ Show Error Alert
  │     └─ Log for debugging
  │
  └─ Server Error (500-599)
     ├─ Retry logic
     ├─ After 3 retries
     └─ Show error Alert
```

## Key Concepts

### Zustand Store Pattern
```typescript
// Define store with state and actions
const useStore = create((set, get) => ({
  state: initialValue,
  action: async () => {
    const state = get(); // Get current state
    set({ state: newValue }); // Update state
  }
}));

// Use in component
function Component() {
  const { state, action } = useStore();
  
  useEffect(() => {
    action(); // Subscribe and run
  }, []);
  
  // Automatic re-render when state changes
}
```

### React Navigation Pattern
```typescript
// Define navigator
<Stack.Navigator>
  <Stack.Screen name="Home" component={HomeScreen} />
  <Stack.Screen name="Detail" component={DetailScreen} />
</Stack.Navigator>

// Navigate from screen
function Screen({ navigation }) {
  const go = () => {
    navigation.navigate('Detail', { id: 123 });
  };
}

// Receive params
function DetailScreen({ route }) {
  const { id } = route.params;
}
```

This architecture ensures:
- Clean separation of concerns
- Easy to test individual layers
- State centralized in Zustand
- Type-safe with TypeScript
- Scalable for new features
