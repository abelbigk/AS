# 📡 App API Flow - Complete Trace

**Question**: What links/URLs are opened when the app starts?

**Answer**: Here's the complete flow:

---

## 🎯 Startup Flow

```
APP OPENS
  ↓
App.tsx loads (just UI setup)
  ↓
RootNavigator initialized
  ↓
checkAuth() called (async)
  ↓
[API CALL] GET http://localhost:3000/auth/me
  ↓
Check if user already logged in
  ↓
Show LoginScreen (if not logged in) OR
Show HomeScreen (if already logged in)
```

---

## 📊 Detailed API Calls

### **On App Startup**

**1. Check Authentication**
```
GET http://localhost:3000/auth/me
Headers: Authorization: Bearer [token]
Expected: User data or 401 Unauthorized
When: Immediately on app open
Timeout: 30 seconds
```

If token exists in local storage:
- ✅ Sends token with request
- ✅ Backend validates it
- ✅ Returns user data
- ✅ Shows Home screen

If no token or expired:
- ✅ Request fails (401)
- ✅ Shows Login screen
- ✅ Ready for credentials

---

## 🔗 All API Endpoints Used

### **Base URL**
```
http://localhost:3000
```
(Or whatever is in environment: `EXPO_PUBLIC_API_URL`)

### **Authentication Endpoints**

**1. Login**
```
POST /auth/login
Body: { username, password }
Response: { token, user }
When: User taps Login button
```

**2. Register**
```
POST /auth/register
Body: { username, password, name }
Response: { token, user }
When: User registers new account
```

**3. Check Auth Status**
```
GET /auth/me
Headers: Authorization: Bearer [token]
Response: { user details }
When: App starts (if token exists)
```

### **Content Endpoints** (Called by HomeScreen)

**4. Get All Content**
```
GET /api/content
Headers: Authorization: Bearer [token]
Response: [array of content items]
When: HomeScreen loads
```

**5. Get Category Details**
```
GET /api/content/:id
Headers: Authorization: Bearer [token]
Response: { category details and items }
When: User taps a category
```

**6. Get Queued Items**
```
GET /api/queued
Headers: Authorization: Bearer [token]
Response: [array of queued items]
When: Queued tab opened
```

**7. Get Done Items**
```
GET /api/done
Headers: Authorization: Bearer [token]
Response: [array of completed items]
When: Done tab opened
```

---

## 🚀 Complete Startup Sequence

```
TIMELINE: App Startup

T=0ms: App.tsx loads
       └─ Setup: PaperProvider, SafeArea, GestureHandler

T=50ms: RootNavigator renders
       └─ Shows: ActivityIndicator (loading spinner)

T=100ms: useEffect triggers
       └─ Calls: checkAuth() function

T=150ms: Check for stored token
       └─ Looks in: AsyncStorage for 'auth_token'

T=200ms: If token exists
       └─ Makes API call: GET /auth/me

T=500ms: (Network delay - ~300ms)
       └─ Backend responds

T=800ms: Response received
       ├─ Success (200): User data returned
       │  └─ Set: isAuthenticated = true
       │  └─ Show: AppNavigator (Home screen with tabs)
       │
       └─ Failure (401): Token invalid/expired
          └─ Remove: Stored token
          └─ Show: AuthNavigator (Login screen)

T=1000ms: First screen visible to user
```

---

## 💾 Data Storage

### **Local Storage (AsyncStorage)**
```
Key: auth_token
Value: JWT token (long string)
Used for: Persisting login across app restarts
Cleared: When user logs out
```

### **In-Memory Storage (Zustand)**
```
{
  user: { id, username, name, email, role, ... },
  token: "eyJhbGc...",
  isAuthenticated: true/false,
  isLoading: true/false
}
```

---

## 🔐 Authentication Flow Detail

### **First Time Opening App**
```
1. No token in AsyncStorage
   ↓
2. checkAuth() returns immediately
   ↓
3. isLoading = false
   ↓
4. Show LoginScreen
   ↓
5. User enters credentials
   ↓
6. POST /auth/login with username/password
   ↓
7. Backend returns: { token, user }
   ↓
8. Save token to AsyncStorage
   ↓
9. Set isAuthenticated = true
   ↓
10. Show HomeScreen with tabs
```

### **Opening App After Login**
```
1. Token exists in AsyncStorage
   ↓
2. checkAuth() finds token
   ↓
3. GET /auth/me with token in header
   ↓
4. Backend validates token
   ↓
5. Returns user data
   ↓
6. Set isAuthenticated = true
   ↓
7. Show HomeScreen directly
```

---

## 📡 Network Requests

### **What Gets Sent**

Every request includes:
```
Headers:
  Content-Type: application/json
  Authorization: Bearer [token]  (if logged in)

Timeout: 30 seconds
```

### **Backend Receives**
```
Request details:
  - URL: /auth/me
  - Method: GET
  - Authorization header with token
  - Timestamp
  - IP address
```

### **Backend Responds**
```
Success (200):
{
  "id": 1,
  "username": "user@example.com",
  "name": "John Doe",
  "email": "user@example.com",
  "role": "user",
  "createdAt": "2024-01-01",
  "updatedAt": "2024-01-01"
}

Error (401):
{
  "error": "Invalid or expired token"
}
```

---

## 🎯 Network Diagram

```
EMULATOR
    ↓
App (localhost on emulator)
    ↓
Metro (port 8081)
    ├─ Serves JavaScript code
    └─ Hot reload on save
    
    ↓
API Client (Axios)
    ├─ Base URL: http://localhost:3000
    ├─ Timeout: 30 seconds
    └─ Adds Authorization header
    
    ↓
Backend Server
    ├─ Running: npm run dev
    ├─ Port: 3000
    └─ Database: Connected
    
    ↓ (Response)
    
App receives:
    ├─ User data
    ├─ Token
    └─ Error messages
```

---

## 📊 All Possible API Calls

| Endpoint | Method | Triggers | Returns |
|----------|--------|----------|---------|
| `/auth/me` | GET | App start | User or 401 |
| `/auth/login` | POST | Login button | Token + User |
| `/auth/register` | POST | Register button | Token + User |
| `/api/content` | GET | Home tab open | Content array |
| `/api/content/:id` | GET | Category tap | Category details |
| `/api/queued` | GET | Queued tab open | Queued items |
| `/api/done` | GET | Done tab open | Done items |

---

## 🔍 What's NOT Opening

**These DON'T happen on startup:**
- ❌ Web browser
- ❌ External URLs
- ❌ HTTP requests to other servers
- ❌ Third-party APIs
- ❌ Analytics services (not configured)
- ❌ Crash reporting (not configured)

**Only connections:**
- ✅ Metro bundler (localhost:8081)
- ✅ Backend API (localhost:3000)

---

## 🛠️ Troubleshooting API Issues

### **Issue: "Unable to load script"**
```
Cause: Metro not running
Fix: npm start (in mobile-rn folder)
```

### **Issue: "Connection refused to localhost:3000"**
```
Cause: Backend not running
Fix: npm run dev (in c:\mycode3)
```

### **Issue: Login button does nothing**
```
Causes:
1. Backend not responding
2. Wrong endpoint
3. Credentials wrong
4. Network timeout

Check: Console logs for error details
```

### **Issue: No tabs showing**
```
Cause: Auth check failed
Fix: Login with correct credentials
```

---

## 📝 Code References

### **API Client Setup**
```typescript
// File: src/api/client.ts
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

apiClient.interceptors.request.use((config) => {
  const token = authStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### **Auth Check on Startup**
```typescript
// File: src/navigation/RootNavigator.tsx
export function RootNavigator() {
  const { isAuthenticated, isLoading, checkAuth } = authStore();

  useEffect(() => {
    checkAuth();  // ← Runs on app open
  }, []);

  if (isLoading) {
    return <ActivityIndicator />;  // Loading spinner
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
```

### **Login API Call**
```typescript
// File: src/store/auth.ts
login: async (username: string, password: string) => {
  const response = await apiClient.post('/auth/login', {
    username,
    password,
  });
  // ↓ API URL becomes: http://localhost:3000/auth/login
  
  const { token, user } = response.data;
  await AsyncStorage.setItem('auth_token', token);
  set({ token, user, isAuthenticated: true });
}
```

---

## ✅ Expected Behavior

**When everything is working:**

1. ✅ App opens (3 seconds)
2. ✅ Loading spinner shows
3. ✅ Checks token from storage
4. ✅ Makes API call to `/auth/me`
5. ✅ Backend responds with user data
6. ✅ Spinner disappears
7. ✅ Home screen shows (if logged in)
8. ✅ OR Login screen shows (if not logged in)

---

## 🚀 Starting Full Stack

```bash
# Terminal 1: Backend
cd c:\mycode3
npm run dev
# → Listens on http://localhost:3000

# Terminal 2: Metro
cd c:\mycode3\mobile-rn
npm start
# → Listens on http://localhost:8081

# Terminal 3: Run app
cd c:\mycode3\mobile-rn
npx expo run:android
# → Emulator opens, connects to Metro + Backend
```

All 3 must be running for API calls to work!

---

## 📚 Summary

**What links open:**
- ✅ `http://localhost:3000/auth/me` (on startup)
- ✅ `http://localhost:3000/auth/login` (on login)
- ✅ `http://localhost:3000/api/content` (on home)
- ✅ And more based on user actions

**No external links:**
- ❌ Nothing goes to internet
- ❌ All local (localhost)
- ❌ Private network only

**Required services:**
- ✅ Metro: Serves JS code
- ✅ Backend: Serves data/auth

**Authentication:**
- ✅ Token-based (JWT)
- ✅ Stored locally after login
- ✅ Sent with every request

---

**Status**: Now you know the complete API flow! 👍
