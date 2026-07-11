# 📱 AS App - Complete Project Specification

**Status**: Option 2 (React Native) - Performance Optimized  
**Priority**: HIGH  
**Last Updated**: July 8, 2026

---

## 🎯 PROJECT OBJECTIVES

### **Primary Goal**
Build a **high-performance React Native app** (Option 2) called "AS" (Content Organizer) with:
- ✅ 60 FPS smooth scrolling
- ✅ Back button handling (navigate, close dialogs, exit)
- ✅ Fast file browse & download operations
- ✅ Minimal file size
- ✅ All essential native features

### **Why Option 2?**
- True native performance (when optimized)
- Better control over native features
- Unified codebase (web, Android, iOS)
- Can achieve 60 FPS with optimization

### **Why Not Option 1?**
- Web wrapper too limited for native features
- No real back button handling
- Can't access all Android features

---

## 📊 CORE REQUIREMENTS

### **1. PERFORMANCE: 60 FPS** ⚡
**Current**: 30-45 FPS ❌  
**Target**: 60 FPS ✅

#### **Why It Matters**
- User experience depends on smooth scrolling
- 60 FPS feels native and responsive
- Lower FPS feels janky and slow

#### **Optimization Strategies**

**A. List Rendering**
```javascript
// ✅ GOOD - Virtual scrolling (60 FPS)
<FlatList
  data={items}
  renderItem={({ item }) => <ItemComponent item={item} />}
  keyExtractor={item => item.id}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={10}
/>

// ❌ BAD - Renders all items (janky)
<ScrollView>
  {items.map(item => <ItemComponent key={item.id} item={item} />)}
</ScrollView>
```

**B. Component Memoization**
```javascript
// ✅ Only re-renders when props change
const ItemComponent = React.memo(({ item }) => {
  return <Text>{item.name}</Text>;
});
```

**C. Callback Memoization**
```javascript
// ✅ Function stable across renders
const handlePress = useCallback(() => {
  navigation.navigate('Details');
}, [navigation]);
```

**D. Expensive Calculations**
```javascript
// ✅ Cache results
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name));
}, [items]);
```

**E. Native Driver Animations**
```javascript
// ✅ Runs on native thread (60 FPS)
Animated.timing(animatedValue, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true,  // ← KEY!
}).start();

// ❌ Runs on JS thread (blocks rendering)
setInterval(() => setOpacity(prev => prev + 0.01), 16);
```

**F. Avoid Inline Styles**
```javascript
// ✅ Created once
const styles = StyleSheet.create({
  box: { width: 100, height: 100, backgroundColor: 'red' }
});
<View style={styles.box} />

// ❌ Recreated every render
<View style={{ width: 100, height: 100, backgroundColor: 'red' }} />
```

**G. Image Optimization**
```javascript
// ✅ Good practices
<Image
  source={{ uri: 'https://...' }}
  style={{ width: 200, height: 200 }}
  progressiveRenderingEnabled={true}
  cache={'force-cache'}
/>
```

#### **Performance Checklist**
- [ ] Use FlatList for all long lists
- [ ] All list items memoized with React.memo()
- [ ] All callbacks wrapped with useCallback
- [ ] All expensive calculations use useMemo
- [ ] Animations use native driver
- [ ] No inline styles (use StyleSheet)
- [ ] Images compressed and cached
- [ ] Console logs removed
- [ ] No memory leaks
- [ ] Tested 60 FPS on real device

---

### **2. BACK BUTTON HANDLING** 📱

**Requirements**:
1. Back button navigates to previous screen
2. Back button closes dialogs/alerts instead of navigating
3. Back button exits app when at root
4. Should feel natural and responsive

#### **Architecture**

```
Back Button Press
  │
  ├─ Is dialog/modal open?
  │  └─ YES → Close dialog/modal, stay on screen
  │
  ├─ Can navigation go back?
  │  └─ YES → Navigate back to previous screen
  │
  └─ Is at root screen?
     └─ YES → Exit app
```

#### **Implementation**

**Step 1: Dialog State Manager**
```javascript
// store/dialogStore.js
import { create } from 'zustand';

export const useDialogStore = create((set) => ({
  showLoginDialog: false,
  showConfirmDialog: false,
  showFilterDialog: false,
  
  openDialog: (dialogName) => set((state) => ({
    [dialogName]: true
  })),
  
  closeDialog: (dialogName) => set((state) => ({
    [dialogName]: false
  })),
  
  closeAllDialogs: () => set({
    showLoginDialog: false,
    showConfirmDialog: false,
    showFilterDialog: false,
  }),
  
  hasOpenDialog: () => {
    const state = useDialogStore.getState();
    return (
      state.showLoginDialog ||
      state.showConfirmDialog ||
      state.showFilterDialog
    );
  },
}));
```

**Step 2: Back Button Hook**
```javascript
// hooks/useBackButton.js
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useDialogStore } from '../store/dialogStore';

export function useBackButton(navigation) {
  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        const { hasOpenDialog, closeAllDialogs } = useDialogStore.getState();

        // If any dialog is open, close it
        if (hasOpenDialog()) {
          closeAllDialogs();
          return true;  // Prevent default
        }

        // If can go back, go back
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }

        // Otherwise, exit app
        return false;
      };

      const unsubscribe = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );

      return () => unsubscribe.remove();
    }, [navigation])
  );
}
```

**Step 3: Use in Screens**
```javascript
// screens/HomeScreen.js
import { useBackButton } from '../hooks/useBackButton';
import { useDialogStore } from '../store/dialogStore';

export function HomeScreen() {
  const navigation = useNavigation();
  const { openDialog, closeDialog, showFilterDialog } = useDialogStore();

  // Setup back button
  useBackButton(navigation);

  return (
    <View>
      <FlatList data={items} renderItem={renderItem} />
      <Button title="Filter" onPress={() => openDialog('showFilterDialog')} />
      
      <Modal visible={showFilterDialog}>
        <FilterDialog onClose={() => closeDialog('showFilterDialog')} />
      </Modal>
    </View>
  );
}
```

#### **Test Cases**
- [ ] Navigate back through screens
- [ ] Close dialog with back button
- [ ] Exit app from root screen
- [ ] Multiple dialogs close in correct order
- [ ] Tested on real Android device

---

### **3. FILE SIZE** 📦

**Target**: Minimal app size

#### **Strategies**

**A. Remove Unnecessary Dependencies**
```json
// package.json - Only essential packages
{
  "dependencies": {
    "react-native": "0.73.0",
    "@react-navigation/native": "^6.1.0",
    "zustand": "^4.4.0",
    "axios": "^1.7.2"
  }
}
```

**B. Use ProGuard/R8 Minification**
```groovy
// android/app/build.gradle
buildTypes {
  release {
    minifyEnabled true
    shrinkResources true
    proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
  }
}
```

**C. Tree-shake Unused Code**
```bash
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output app.bundle --max-workers=4
```

**D. Remove Dev Dependencies**
```json
{
  "devDependencies": {
    "@react-native-debugger/react-native-debugger": "dev-only"
  }
}
```

#### **Size Optimization Checklist**
- [ ] Remove unused dependencies
- [ ] Enable ProGuard minification
- [ ] Remove console logs
- [ ] Tree-shake unused code
- [ ] Release build < 50 MB

---

### **4. BROWSE & DOWNLOAD - FAST** 🚀

**Requirements**:
1. Browse Android file system quickly
2. Download files efficiently
3. Show download progress
4. Save to Downloads folder

#### **Implementation**

**A. File Picker (Browse)**
```javascript
// utils/filePicker.js
import DocumentPicker from 'react-native-document-picker';

export async function pickFile() {
  try {
    const result = await DocumentPicker.pick({
      type: [DocumentPicker.types.allFiles],
    });
    return result;
  } catch (error) {
    console.error('Pick cancelled', error);
  }
}

// screens/UploadScreen.js
const handleBrowse = async () => {
  const file = await pickFile();
  if (file) {
    await uploadFile(file.uri);
  }
};
```

**B. File Download**
```javascript
// utils/fileDownloader.js
import RNFetchBlob from 'rn-fetch-blob';
import { PermissionsAndroid } from 'react-native';

export async function downloadFile(url, filename) {
  try {
    // Request permission
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    );

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error('Permission denied');
    }

    // Download file
    const { dirs } = RNFetchBlob.fs;
    const filePath = `${dirs.DownloadDir}/${filename}`;

    const config = {
      fileCache: true,
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        path: filePath,
        description: `Downloading ${filename}`,
      },
    };

    await RNFetchBlob.config(config).fetch('GET', url);
    return filePath;
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

// screens/ItemScreen.js
const handleDownload = async () => {
  try {
    setDownloading(true);
    await downloadFile(item.fileUrl, item.fileName);
    showToast('File downloaded to Downloads folder');
  } catch (error) {
    showToast('Download failed');
  } finally {
    setDownloading(false);
  }
};
```

**C. Show Progress**
```javascript
// Async file operations (non-blocking)
const downloadFile = async (url) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.addEventListener('progress', (event) => {
      const percentComplete = (event.loaded / event.total) * 100;
      setProgress(percentComplete);  // Update UI
    });

    xhr.addEventListener('load', () => {
      resolve();
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Download failed'));
    });

    xhr.open('GET', url);
    xhr.send();
  });
};
```

#### **Dependencies**
```bash
npm install react-native-document-picker
npm install rn-fetch-blob
```

#### **File Operations Checklist**
- [ ] File picker opens quickly
- [ ] Downloads non-blocking (async)
- [ ] Progress visible to user
- [ ] Files saved to Downloads folder
- [ ] Error handling implemented
- [ ] Permissions requested correctly

---

## 🏗️ TECHNOLOGY STACK

### **Frontend**
```
React Native 0.73.0
├── React Navigation (navigation)
├── Zustand (state management)
├── Axios (API client)
├── React Native Document Picker (file browse)
├── RN Fetch Blob (file download)
└── Reanimated 2 (animations)
```

### **Backend**
```
Base URL: https://as-wryo.onrender.com
Database: Turso (online SQLite)
File Storage: Cloudflare R2
```

### **Build Tools**
```
Expo CLI (development)
React Native CLI (native builds)
Android Studio (build & test)
Gradle 8.5 (build system)
```

---

## 📱 FEATURE LIST

### **Core Features**
- ✅ Login/Register with JWT
- ✅ Category management (create, edit, delete)
- ✅ Subcategory management (create, edit, delete)
- ✅ Item management (create, edit, delete, mark done)
- ✅ Image upload
- ✅ File download
- ✅ Pull to refresh
- ✅ Dark mode toggle

### **Native Features**
- ✅ Back button navigation
- ✅ File picker/gallery
- ✅ Camera integration
- ✅ File downloads to Downloads folder
- ✅ Notifications

### **UI/UX**
- ✅ Material Design
- ✅ Smooth 60 FPS animations
- ✅ Loading spinners
- ✅ Error messages
- ✅ Empty states

---

## 📋 PROJECT STRUCTURE

```
app/
├── src/
│   ├── screens/              (All app screens)
│   │   ├── LoginScreen.js
│   │   ├── HomeScreen.js
│   │   ├── CategoriesScreen.js
│   │   ├── SubcategoriesScreen.js
│   │   ├── ItemsScreen.js
│   │   ├── UploadScreen.js
│   │   └── SettingsScreen.js
│   │
│   ├── components/           (Reusable components)
│   │   ├── ItemList.js
│   │   ├── CategoryCard.js
│   │   ├── DialogBox.js
│   │   └── LoadingSpinner.js
│   │
│   ├── navigation/           (Navigation setup)
│   │   └── RootNavigator.js
│   │
│   ├── store/                (Zustand state)
│   │   ├── authStore.js
│   │   ├── itemStore.js
│   │   └── dialogStore.js
│   │
│   ├── api/                  (API client)
│   │   └── client.js
│   │
│   ├── utils/                (Utilities)
│   │   ├── filePicker.js
│   │   ├── fileDownloader.js
│   │   └── validators.js
│   │
│   ├── hooks/                (Custom hooks)
│   │   ├── useBackButton.js
│   │   ├── useAuth.js
│   │   └── useItems.js
│   │
│   └── App.js
│
├── android/                  (Native Android code)
│   └── app/build.gradle
│
├── app.json                  (Expo configuration)
├── package.json
├── babel.config.js
├── metro.config.js
└── tsconfig.json
```

---

## 🔌 API ENDPOINTS

**Base URL**: `https://as-wryo.onrender.com`

### **Authentication**
```
POST   /api/auth/login          (email, password)
POST   /api/auth/register       (email, password, name)
POST   /api/auth/refresh        (refreshToken)
POST   /api/auth/logout         ()
```

### **Categories**
```
GET    /api/categories          (get all)
POST   /api/categories          (create)
GET    /api/categories/:id      (get one)
PUT    /api/categories/:id      (update)
DELETE /api/categories/:id      (delete)
```

### **Subcategories**
```
GET    /api/subcategories       (get all for category)
POST   /api/subcategories       (create)
GET    /api/subcategories/:id   (get one)
PUT    /api/subcategories/:id   (update)
DELETE /api/subcategories/:id   (delete)
```

### **Items**
```
GET    /api/items               (get all)
POST   /api/items               (create)
GET    /api/items/:id           (get one)
PUT    /api/items/:id           (update)
DELETE /api/items/:id           (delete)
PUT    /api/items/:id/toggle    (mark done/undone)
```

### **Media**
```
POST   /api/upload              (upload file)
GET    /api/media/:id           (download file)
DELETE /api/media/:id           (delete file)
```

---

## 🧪 TESTING & SUCCESS CRITERIA

### **Performance Testing**
```
Test: 60 FPS Scrolling
1. Open list with 100+ items
2. Scroll through list
3. Check FPS monitor (should be consistent 60)
Expected: ✅ Smooth 60 FPS
```

### **Back Button Testing**
```
Test 1: Navigate Back
1. Home → Details → Settings
2. Press back
Expected: ✅ Goes Settings → Details → Home

Test 2: Close Dialog
1. At Details, open dialog
2. Press back
Expected: ✅ Dialog closes, stays at Details

Test 3: Exit App
1. At Home (root)
2. Press back
Expected: ✅ App exits
```

### **File Operations Testing**
```
Test 1: Browse Files
1. Tap "Browse"
2. Check time to open
Expected: ✅ < 2 seconds

Test 2: Download File
1. Tap "Download"
2. Check file in Downloads folder
Expected: ✅ < 5 seconds, appears in Downloads

Test 3: Upload File
1. Browse and select file
2. Tap "Upload"
3. Check in app
Expected: ✅ File appears in app
```

### **Success Metrics**
| Metric | Target | Status |
|--------|--------|--------|
| FPS | 60 | ❌ Need optimization |
| Back Button | Works | ❌ Need implementation |
| File Browse | < 2s | ❌ Need testing |
| File Download | < 5s | ❌ Need testing |
| App Size | < 50 MB | ❌ Need optimization |
| Crashes | 0 | ❌ Need testing |

---

## 🚀 DEVELOPMENT ROADMAP

### **Phase 1: Setup (Week 1)**
- [ ] Initialize React Native project
- [ ] Setup Expo CLI
- [ ] Setup Android build environment
- [ ] Create project structure

### **Phase 2: Performance (Week 2)**
- [ ] Implement FlatList with optimization
- [ ] Add component memoization
- [ ] Setup animations with native driver
- [ ] Profile and test 60 FPS

### **Phase 3: Back Button (Week 2)**
- [ ] Create dialog state manager
- [ ] Implement back button hook
- [ ] Test on all screens
- [ ] Test on real device

### **Phase 4: File Operations (Week 3)**
- [ ] Implement file picker
- [ ] Implement file downloader
- [ ] Add progress tracking
- [ ] Test on real device

### **Phase 5: Testing & Release (Week 4)**
- [ ] Full testing on real devices
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Release to Play Store

---

## 📝 IMPORTANT NOTES

1. **60 FPS is critical** - This was the main reason Option 1 was initially considered. Performance optimization must be prioritized.

2. **Back button is essential** - Users expect standard Android back button behavior. Dialogs must close properly.

3. **File operations must be fast** - Users expect responsive UI while browsing/downloading files.

4. **This is a unified codebase** - One React Native app that works on web, Android, and iOS.

5. **Backend is already built** - Focus on frontend optimization and native integration.

6. **Use real device for testing** - Emulator performance is different. Always test on real Android device.

---

## 📚 Useful Commands

```bash
# Development
npm install
npm start

# Android testing
npm run android
adb logcat                      # View logs

# Build release
eas build -p android --release

# Performance profiling
npx react-native-debugger       # Open debugger
                                # ⚠️ + P → Show Perf Monitor

# Check bundle size
npx react-native bundle --platform android --dev false \
  --entry-file index.js --bundle-output app.bundle

# Clean build
npm run android -- --reset-cache
```

---

## ✅ FINAL CHECKLIST

- [ ] Read this entire document
- [ ] Understand all requirements
- [ ] Understand performance optimization strategies
- [ ] Understand back button implementation
- [ ] Understand file operations approach
- [ ] Ready to start development
- [ ] Questions? Ask before starting

---

**Document Status**: Complete & Ready  
**Last Updated**: July 8, 2026  
**Version**: 1.0  

**For any clarifications, refer back to this document.**

