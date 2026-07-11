# Deployment URLs - Analysis

## Current Deployment Status

### ✅ `content-organizer.onrender.com`
**Status**: **WORKING** ✅
- **What it is**: Original web deployment (the website/client)
- **Response**: Serving HTML/React app (verified)
- **What it loads**: The website built with Vite
- **Port**: 3000
- **Service name in render.yaml**: `content-organizer`

```
Frontend loaded from: https://content-organizer.onrender.com/
HTML found: ✅ Yes (React app)
JavaScript bundles: ✅ Yes
CSS: ✅ Yes
Responsive design: ✅ Yes (mobile-optimized)
```

---

### ⚠️ `as-wryo.onrender.com`
**Status**: **LIKELY INACTIVE / NOT DEPLOYED** ⚠️
- **What it is**: Supposed to be the backend API for React Native app
- **Response**: 503 Service Unavailable
- **Possible reasons**:
  1. **Not deployed yet** - No active service on Render for "as-wryo"
  2. **Service spun down** - Free tier Render spins down after 15 min inactivity
  3. **Different endpoint** - Backend might be at a different URL

---

## The Issue Explained

Your `render.yaml` only defines ONE service:

```yaml
services:
  - type: web
    name: content-organizer
    env: node
    buildCommand: npx pnpm install --frozen-lockfile && npx pnpm run build
    startCommand: npm start
```

**This means**:
- ✅ `content-organizer` backend is deployed and serving both:
  - The website (HTML/React)
  - The API (`/api/trpc`)
  
- ❌ `as-wryo` doesn't exist in your Render config
- ❌ App is trying to connect to a URL that doesn't exist!

---

## How Your Backend Works (Current Setup)

```
┌─────────────────────────────────────────────┐
│  https://content-organizer.onrender.com    │
│                                             │
│  ✅ Serves website (React SPA)              │
│     GET / → Returns HTML/JS/CSS             │
│                                             │
│  ✅ Serves API (tRPC endpoints)             │
│     POST /api/trpc → Handle queries/mutations│
│                                             │
│  ✅ Serves uploads/assets                  │
│     GET /uploads/* → Image files            │
└─────────────────────────────────────────────┘
```

---

## Current Issues

### Problem 1: App Tries to Use Wrong URL
**In `app/src/App.tsx`:**
```typescript
const apiUrl = Constants.expoConfig?.extra?.apiUrl 
  || 'https://as-wryo.onrender.com';  // ← This doesn't exist!
```

**Should be:**
```typescript
const apiUrl = Constants.expoConfig?.extra?.apiUrl 
  || 'https://content-organizer.onrender.com';  // ← Same as website
```

### Problem 2: Website Also Tries Wrong URL (maybe)
**In `client/src/main.tsx`:**
```typescript
return "https://content-organizer.onrender.com/api/trpc";  // ✅ Correct
```

**This is OK** - Website knows about the real backend.

---

## What Should Happen

```
Option A: Single Deployment (Current Setup)
└─ Backend serves everything from: https://content-organizer.onrender.com
   ├─ Website: https://content-organizer.onrender.com/
   ├─ API: https://content-organizer.onrender.com/api/trpc
   └─ Works for: web, iOS, Android

Option B: Separate Deployments (if you wanted)
├─ Backend API: https://as-wryo.onrender.com
│  └─ Only serves: /api/trpc endpoints
├─ Website: https://content-organizer.onrender.com
│  └─ Serves: HTML/JS/CSS (static)
├─ React Native App: connects to as-wryo
└─ Would require: 2 separate Render services
```

---

## Verification Results

| URL | Status | Content | Issue |
|-----|--------|---------|-------|
| `https://content-organizer.onrender.com` | ✅ 200 | HTML (React app) | None - working |
| `https://content-organizer.onrender.com/api/trpc` | ❌ 404 | Not found | Expected (HEAD request) |
| `https://as-wryo.onrender.com` | ❌ 503 | Unavailable | **DOESN'T EXIST** |
| `https://as-wryo.onrender.com/api/trpc` | ❌ 503 | Unavailable | **DOESN'T EXIST** |

---

## What You Need to Fix

### 🔴 CRITICAL: Update React Native App
**File**: `app/src/App.tsx` (line 22)

**Current**:
```typescript
const apiUrl = Constants.expoConfig?.extra?.apiUrl 
  || 'https://as-wryo.onrender.com';
```

**Change to**:
```typescript
const apiUrl = Constants.expoConfig?.extra?.apiUrl 
  || 'https://content-organizer.onrender.com';
```

**Why**: `as-wryo` doesn't exist. Your backend is at `content-organizer`.

---

## After You Fix It

```
✅ Website works: https://content-organizer.onrender.com
✅ React Native app connects to: https://content-organizer.onrender.com
✅ Both use the same backend API
✅ Everything is synchronized
```

---

## Summary

| Item | Status | Next Step |
|------|--------|-----------|
| Website deployed | ✅ YES | No action needed |
| Backend deployed | ✅ YES | No action needed |
| App knows correct URL | ❌ NO | **FIX app/src/App.tsx** |
| as-wryo.onrender.com | ❌ N/A | **Can delete / ignore** |

**Bottom line**: Your website works perfectly at `content-organizer.onrender.com`. Your React Native app just needs to point to the same URL instead of the non-existent `as-wryo` URL.
