# 📋 AS App - Project Objectives & Requirements

## 🎯 Primary Objective
Build a **high-performance React Native app** (Option 2) called "AS" (Content Organizer) that runs at **60 FPS** with all essential native features.

---

## 📊 Core Requirements

### 1. **Performance: 60 FPS** ⚡
- **Target**: Smooth scrolling at 60 frames per second
- **Why**: React Native felt slow at 30-45 FPS during testing - need optimization
- **Implementation**: 
  - Use FlatList for efficient rendering
  - Memoize components with React.memo()
  - Optimize re-renders
  - Remove unnecessary animations
  - Use native driver for animations
  - Profile with React Native Debugger

### 2. **Back Button Handling** 📱
- **Requirement 1**: Back button goes to previous page in navigation history
- **Requirement 2**: Back button closes dialogs/alerts instead of navigating
- **Requirement 3**: Back button exits app when at root
- **Implementation**:
  - Use React Navigation's back handler
  - Custom dialog state management
  - Hardware back press listener

### 3. **File Size** 📦
- **Target**: Minimal app size
- **Constraints**:
  - Strip unnecessary dependencies
  - Use ProGuard/R8 minification
  - Remove dev dependencies from release build
  - Optimize bundle size
- **Optimization Tips**:
  - Remove unused native modules
  - Use dynamic imports where possible
  - Tree-shake unused code

### 4. **Browse & Download - Fast** 🚀
- **Requirement 1**: Browse files in Android file system quickly
- **Requirement 2**: Download files to Downloads folder efficiently
- **Requirement 3**: Show download progress/notifications
- **Implementation**:
  - Use native file system access
  - Async file operations
  - DownloadManager for large files
  - Progress callbacks

---

## 🏗️ Architecture

### **Technology Stack**
```
Frontend:
- React Native (Expo)
- React Navigation
- Zustand (state management)
- Axios (API client)

Backend:
- URL: https://as-wryo.onrender.com
- Framework: Unknown (infer from responses)

Native Features:
- Back button handling
- File downloads
- Gallery/file picker
- Camera integration

Data:
- Database: Turso (online SQLite)
- File Storage: Cloudflare R2
- Source Control: GitHub
```

### **Project Structure**
```
app/
├── src/
│   ├── screens/          (All app screens)
│   ├── components/       (Reusable components)
│   ├── store/           (Zustand state)
│   ├── api/             (API client)
│   ├── utils/           (Utilities)
│   ├── hooks/           (Custom hooks)
│   └── navigation/      (React Navigation setup)
├── app.json             (Expo config)
├── package.json
└── babel.config.js
```

---

## 📱 Feature List

### **User Management**
- ✅ Login/Register
- ✅ Token storage (AsyncStorage)
- ✅ Auto-login on app start

### **Content Organization**
- ✅ Create categories
- ✅ Manage categories
- ✅ Create subcategories
- ✅ Manage subcategories
- ✅ Browse content in categories

### **Media Management**
- ✅ Upload images
- ✅ Download files to Downloads folder
- ✅ Gallery/file picker
- ✅ Camera integration

### **UI/UX**
- ✅ Dark mode toggle
- ✅ Material Design UI
- ✅ Smooth animations (60 FPS)
- ✅ Mark items as done
- ✅ Pull to refresh

### **Navigation**
- ✅ Back button (goes back in history)
- ✅ Back button closes dialogs
- ✅ Tab navigation
- ✅ Stack navigation

---

## 🔌 Native Features to Implement

### **Back Button**
```
User presses back button
  ├─ If dialog open → Close dialog
  ├─ If can go back → Go to previous screen
  └─ If at root → Exit app
```

### **File Operations**
```
Download Flow:
  1. User taps download link
  2. Show download dialog (optional)
  3. Start DownloadManager
  4. Save to Environment.DIRECTORY_DOWNLOADS
  5. Show notification when done
  6. Optional: Scan media after download

File Browse Flow:
  1. User taps browse/upload button
  2. Open file picker (DocumentPicker)
  3. User selects file
  4. Return file URI to app
  5. Upload to backend
```

---

## 🎨 UI/UX Requirements

- **Color Scheme**: Material Design (light + dark mode)
- **Typography**: Clear, readable fonts
- **Icons**: Material Design icons
- **Animations**: Smooth 60 FPS transitions
- **Loading States**: Spinners, skeleton screens
- **Error States**: Clear error messages
- **Empty States**: Helpful empty state UI

---

## 🔐 Security Requirements

- ✅ JWT token in headers for API calls
- ✅ Token refresh on 401 responses
- ✅ AsyncStorage encryption (optional)
- ✅ HTTPS only (production URLs)
- ✅ No hardcoded credentials

---

## 📊 API Integration

### **Base URL**
`https://as-wryo.onrender.com`

### **Expected Endpoints** (infer from app usage)
```
POST   /auth/login
POST   /auth/register
GET    /categories
POST   /categories
GET    /categories/:id
PUT    /categories/:id
DELETE /categories/:id

GET    /subcategories
POST   /subcategories
GET    /subcategories/:id
PUT    /subcategories/:id
DELETE /subcategories/:id

GET    /items
POST   /items
PUT    /items/:id
DELETE /items/:id

POST   /upload (for media)
```

---

## 🧪 Testing Requirements

- ✅ 60 FPS performance on real device
- ✅ Back button works correctly
- ✅ File download to Downloads folder
- ✅ Gallery/camera integration
- ✅ Dark mode toggle
- ✅ No crashes during normal usage
- ✅ Smooth scrolling in lists

---

## 📈 Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| **FPS** | 60 FPS | 🔴 Not met (30-45 FPS) |
| **App Size** | < 50 MB | 🔴 Not optimized |
| **Back Button** | Works correctly | ⚠️ Partial |
| **File Download** | < 5 seconds | ⚠️ Unknown |
| **File Browse** | < 2 seconds | ⚠️ Unknown |
| **Crashes** | 0 | ⚠️ Unknown |

---

## 🚀 Deployment Target

- **Platform**: Android (focus) + iOS (optional)
- **Min API Level**: 24 (Android 7.0)
- **Target API Level**: 34 (Android 14)
- **Distribution**: Google Play Store

---

## 📝 Notes for Agents

1. **60 FPS is critical** - This was the main reason Option 1 was chosen. If we go back to Option 2, performance optimization is TOP PRIORITY.

2. **Back button is essential** - Users expect standard Android back button behavior.

3. **File operations must be fast** - Users browsing/downloading files should see responsive UI.

4. **File size matters** - Smaller is better for distribution and user experience.

5. **This is a unified codebase** - One React Native app that works on web, Android, and iOS.

6. **Backend is already built** - Focus on frontend optimization and native integration.

---

**Last Updated**: July 8, 2026
**Status**: Ready for development
**Priority**: HIGH

