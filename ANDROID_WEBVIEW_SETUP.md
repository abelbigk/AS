# Android WebView Setup Guide

This guide explains how to wrap the web app in a native Android WebView for mobile installation.

## Why WebView?

Instead of building a complex native app, we use Android WebView to:
- Wrap the web app in a native shell
- Get native features (back button, file access, downloads)
- Access Android file system
- Allow app installation from Play Store
- Keep the same web codebase

## Architecture

```
┌─────────────────────────────────┐
│   Android Native Layer          │
│  (WebView, Back Button, Files)  │
├─────────────────────────────────┤
│   JavaScript Bridge             │
│  (Communicate web ↔ native)     │
├─────────────────────────────────┤
│   Web App (React + Vite)        │
│  (UI, Logic, API calls)         │
└─────────────────────────────────┘
```

## Required Android Features

### 1. Back Button Handling

The Android back button should:
- ✅ Go back in browser history if dialog not open
- ✅ Close dialog/alert if one is open
- ✅ Exit app if at first page

**Implementation:**
```kotlin
override fun onBackPressed() {
    if (webView.canGoBack()) {
        webView.goBack()
    } else {
        super.onBackPressed()
    }
}
```

### 2. File Downloads

Downloads should go to Android's Downloads folder.

**Implementation:**
```kotlin
webView.setDownloadListener { url, userAgent, contentDisposition, mimetype, contentLength ->
    val request = DownloadManager.Request(Uri.parse(url))
    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename)
    downloadManager.enqueue(request)
}
```

### 3. File Picker

Allow selecting files from device storage.

**Implementation in JavaScript Bridge:**
```kotlin
@JavascriptInterface
fun selectFile(callback: String) {
    val intent = Intent(Intent.ACTION_GET_CONTENT)
    intent.type = "image/*,video/*"
    startActivityForResult(intent, FILE_PICKER_REQUEST_CODE)
}
```

### 4. Gallery Integration

Let users pick photos/videos from gallery.

**Implementation:**
```kotlin
@JavascriptInterface
fun pickFromGallery(callback: String) {
    val intent = Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
    startActivityForResult(intent, GALLERY_REQUEST_CODE)
}
```

### 5. Camera Access

Take photos directly from device camera.

**Implementation:**
```kotlin
@JavascriptInterface
fun takePhoto(callback: String) {
    val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
    startActivityForResult(intent, CAMERA_REQUEST_CODE)
}
```

## JavaScript to Kotlin Communication

The web app communicates with native code via the JavaScript bridge.

**From JavaScript (web app):**
```javascript
import AndroidBridge from './utils/androidBridge';

// Download file
AndroidBridge.downloadFile('https://example.com/file.pdf', 'myfile.pdf');

// Pick from gallery
const uri = await AndroidBridge.pickFromGallery();

// Take photo
const photoUri = await AndroidBridge.takePhoto();

// Show toast
AndroidBridge.showToast('File downloaded successfully');
```

**Native Android receives:**
```kotlin
class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        
        // Enable JavaScript
        webView.settings.javaScriptEnabled = true
        
        // Add JavaScript interface
        webView.addJavascriptInterface(
            JavaScriptInterface(this),
            "Android"
        )
    }
}

class JavaScriptInterface(private val context: Context) {
    @JavascriptInterface
    fun downloadFile(url: String, filename: String) {
        // Handle download to Downloads folder
    }
    
    @JavascriptInterface
    fun pickFromGallery(callback: String) {
        // Open gallery picker
    }
}
```

## Required Permissions (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_MEDIA_LOCATION" />
```

## Back Button Flow

```
User presses back button
    ↓
onBackPressed() called
    ↓
Check if dialog open?
    ├─ YES → Close dialog
    └─ NO  → Check if can go back?
            ├─ YES → webView.goBack()
            └─ NO  → Exit app
```

## Dialog/Alert Handling

When a dialog opens in the web app:
1. JavaScript sends message to native: `{ type: 'DIALOG_OPEN' }`
2. Native layer flags `dialogOpen = true`
3. Back button now closes dialog instead of going back
4. When dialog closes: `{ type: 'DIALOG_CLOSE' }`
5. Back button resumes normal navigation

## File Download Flow

```
User clicks download link
    ↓
setDownloadListener triggered
    ↓
Create DownloadManager.Request
    ↓
Set destination to Downloads folder
    ↓
Show download notification
    ↓
File appears in Downloads app
```

## Implementation Checklist

- [ ] Create MainActivity with WebView
- [ ] Add JavaScript interface bridge
- [ ] Implement back button handling
- [ ] Implement download manager
- [ ] Implement file picker
- [ ] Implement gallery picker
- [ ] Implement camera capture
- [ ] Add required permissions
- [ ] Test all features on device
- [ ] Build release APK
- [ ] Upload to Google Play

## Testing

### Test Back Button
1. Navigate to different pages
2. Press back → should go to previous page
3. At first page, press back → should exit app

### Test Dialog Back
1. Open any dialog/alert
2. Press back → should close dialog
3. Dialog closes → back navigates again

### Test File Download
1. Click download button
2. Check Downloads app
3. File should appear

### Test Gallery/Camera
1. Upload media
2. Select from gallery → should show files
3. Take photo → camera should open
4. Photo captured → should upload

## Troubleshooting

### Files not downloading
- Check WRITE_EXTERNAL_STORAGE permission
- Verify Downloads folder exists
- Check file URL is valid

### Back button not working
- Ensure onBackPressed() is overridden
- Check webView.canGoBack() logic
- Verify dialog state management

### Camera not opening
- Check CAMERA permission granted
- Verify device has camera
- Check Intent is correct

---

**See also:** AndroidBridge.js in src/utils/ for JavaScript API
