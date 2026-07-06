# React Native App Size Optimization - Plan

## Current Status
- **Debug APK Size**: 189.43 MB (target: ≤50MB)
- **Bloat**: ~139 MB over target
- **Priority**: Critical

## Startup Flow
1. App.tsx loads with providers (GestureHandler, SafeArea, PaperProvider)
2. RootNavigator checks auth via checkAuth()
3. Shows ActivityIndicator while loading
4. Displays LoginScreen or AppNavigator (4 tabs) based on auth state
5. Minimal startup overhead - issue is native bundle size

## Root Causes of Large APK Size
1. **Multiple architectures**: armeabi-v7a, arm64-v8a, x86, x86_64 (debug builds all)
2. **No minification enabled**: Release builds need R8/ProGuard
3. **Unused Expo modules**: Loaded but not used in app
4. **Hermes enabled but not optimized**
5. **Debug symbols included**: Not stripped from debug APK
6. **All dependencies bundled**: No tree-shaking for unused code

## Optimization Strategy

### Phase 1: Build Configuration (Immediate - High Impact)
- Enable minification (R8) for release builds
- Enable resource shrinking
- Add ProGuard configuration
- Disable unnecessary Expo modules in gradle.properties

### Phase 2: Dependency Pruning (Medium Impact)
- Remove react-native-worklets (0.10.0) - not used
- Review expo modules - disable unused ones
- Keep React Native Paper (Material Design UI is core)
- Keep Reanimated (needed for smooth animations)

### Phase 3: Architecture Optimization (High Impact - Release Only)
- For release: Build single architecture (arm64-v8a) first
- Debug builds can keep all architectures (only for testing)
- Saves ~50-60% of native code

### Phase 4: Bundle Optimization
- Enable code splitting where possible
- Lazy load screens where feasible
- Remove console logs from production

## Expected Results
- **Debug APK** (all archs): 50-60 MB (down from 189 MB)
- **Release APK** (arm64-v8a only): 25-35 MB

## Implementation Steps
1. Update gradle.properties to disable unnecessary modules
2. Update build.gradle to enable minification
3. Create release build ProGuard rules
4. Test release build
5. Measure APK size after each change
