# ⚡ React Native Performance Optimization Guide

## 🎯 Goal: Achieve 60 FPS

Current state: 30-45 FPS ❌  
Target: 60 FPS ✅

---

## 📊 Performance Analysis

### **Why React Native is Slow (30-45 FPS)**
1. **Bridge overhead** - JavaScript to Native communication delay
2. **Re-renders** - Unnecessary component re-renders
3. **Large lists** - Rendering all items at once instead of virtualizing
4. **Heavy animations** - JavaScript-driven animations block main thread
5. **Memory leaks** - Listeners not cleaned up properly
6. **Bloated bundle** - Too many dependencies

---

## ✅ Optimization Checklist

### **1. Use FlatList / SectionList for Lists** 🔥
**Problem**: Rendering long lists causes jank
**Solution**: Virtual scrolling

```javascript
// ❌ BAD - Renders all items
<ScrollView>
  {items.map(item => <ItemComponent key={item.id} item={item} />)}
</ScrollView>

// ✅ GOOD - Virtual scrolling
<FlatList
  data={items}
  renderItem={({ item }) => <ItemComponent item={item} />}
  keyExtractor={item => item.id}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={10}
/>
```

### **2. Memoize Components** 🎯
**Problem**: Parent re-renders cause all child re-renders
**Solution**: Use React.memo()

```javascript
// ✅ Memoized component only re-renders if props change
const ItemComponent = React.memo(({ item }) => {
  return <Text>{item.name}</Text>;
});

export default ItemComponent;
```

### **3. Use useCallback for Functions** 🔄
**Problem**: Functions recreated on every render
**Solution**: Memoize callbacks

```javascript
// ✅ Function only changes when dependencies change
const handlePress = useCallback(() => {
  navigation.navigate('Details');
}, [navigation]);
```

### **4. Use useMemo for Expensive Calculations** 💾
**Problem**: Expensive calculations run every render
**Solution**: Cache results

```javascript
// ✅ Expensive calculation cached
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name));
}, [items]);
```

### **5. Use Native Driver for Animations** 🎬
**Problem**: JavaScript-driven animations block main thread
**Solution**: Use native driver

```javascript
// ✅ Animation runs on native thread (60 FPS)
Animated.timing(animatedValue, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true,  // ← KEY!
}).start();
```

### **6. Avoid Inline Styles** 🎨
**Problem**: Inline styles recreated on every render
**Solution**: Use StyleSheet

```javascript
// ❌ BAD - Recreated every render
<View style={{ width: 100, height: 100, backgroundColor: 'red' }} />

// ✅ GOOD - Created once
const styles = StyleSheet.create({
  box: { width: 100, height: 100, backgroundColor: 'red' }
});
<View style={styles.box} />
```

### **7. Optimize Images** 🖼️
**Problem**: Large images cause memory issues
**Solution**: Compress and cache

```javascript
// ✅ Good image optimization
<Image
  source={{ uri: 'https://...' }}
  style={{ width: 200, height: 200 }}
  onLoadStart={() => setLoading(true)}
  onLoadEnd={() => setLoading(false)}
  progressiveRenderingEnabled={true}  // Progressive JPEG loading
  cache={'force-cache'}                // Cache images
/>
```

### **8. Lazy Load Screens** 📱
**Problem**: All screens loaded upfront
**Solution**: Load on demand

```javascript
// ✅ Screens loaded only when navigated to
const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const DetailsScreen = lazy(() => import('./screens/DetailsScreen'));

export default {
  Home: HomeScreen,
  Details: DetailsScreen
};
```

### **9. Profile Performance** 📈
**Tools**:
- React Native Debugger (FPS monitor)
- Android Profiler (CPU, Memory)
- React DevTools Profiler

```bash
# Enable FPS monitor
⚠️ + P in debugger → Show Perf Monitor
```

### **10. Remove Console Logs** 🔇
**Problem**: Console.log in render causes jank
**Solution**: Remove in production

```javascript
// ❌ BAD - Slows down renders
render() {
  console.log('Rendering', this.props);
  return <View />;
}

// ✅ GOOD - No logs in render
render() {
  return <View />;
}
```

---

## 🔧 Configuration Optimization

### **Package.json Scripts**
```json
{
  "scripts": {
    "dev": "expo start",
    "android": "expo run:android --device",
    "ios": "expo run:ios --device",
    "build": "eas build",
    "profile": "expo start --dev-client"
  }
}
```

### **Babel Config**
```javascript
// babel.config.js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',  // Reanimated (if used)
    ],
  };
};
```

### **Metro Config**
```javascript
// metro.config.js
const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {},
};

module.exports = config;
```

---

## 📦 Bundle Size Optimization

### **Check Bundle Size**
```bash
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output app.bundle --max-workers=4
```

### **Reduce Dependencies**
```bash
# Check for unused dependencies
npm audit
npm prune
```

### **Remove Dev Dependencies from Build**
```javascript
// app.json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "minSdkVersion": 24,
            "enableShrinkResourcesInReleaseBuilds": true
          }
        }
      ]
    ]
  }
}
```

---

## 🎬 Animation Best Practices

### **Good: Native Driver Animations**
```javascript
// ✅ Runs on native thread (60 FPS)
const animValue = useRef(new Animated.Value(0)).current;

Animated.timing(animValue, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true
}).start();

return (
  <Animated.View style={{
    opacity: animValue,
    transform: [{ scale: animValue }]
  }} />
);
```

### **Bad: JavaScript Animations**
```javascript
// ❌ Runs on JS thread (blocks rendering)
const [opacity, setOpacity] = useState(0);

// Don't use setInterval/setTimeout for animations!
setInterval(() => {
  setOpacity(prev => prev + 0.01);
}, 16);
```

---

## 📋 React Navigation Optimization

### **Lazy Load Screens**
```javascript
const Stack = createNativeStackNavigator();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        animationEnabled: false,  // Disable if not needed
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          freezeOnBlur: true,  // Don't re-render when not focused
        }}
      />
    </Stack.Navigator>
  );
}
```

---

## 🧠 State Management Optimization

### **Zustand Best Practices**
```javascript
// ✅ Good: Selector prevents re-renders
const userName = useUserStore(state => state.name);

// ❌ Bad: Entire store triggers re-render
const user = useUserStore();

// ✅ Good: Multiple selectors
const userName = useUserStore(state => state.name);
const userEmail = useUserStore(state => state.email);
```

---

## 📊 Memory Optimization

### **Clean Up Listeners**
```javascript
// ✅ Good: Clean up on unmount
useEffect(() => {
  const unsubscribe = subscription.subscribe(onUpdate);
  
  return () => {
    unsubscribe();  // Clean up
  };
}, []);
```

### **Avoid Memory Leaks**
```javascript
// ❌ Bad: Listener never removed
useEffect(() => {
  eventEmitter.on('update', onUpdate);
  // Missing cleanup!
});

// ✅ Good: Listener removed
useEffect(() => {
  eventEmitter.on('update', onUpdate);
  return () => eventEmitter.off('update', onUpdate);
}, []);
```

---

## 🎯 Debugging Performance Issues

### **Step 1: Identify Bottleneck**
- Use React DevTools Profiler
- Check which components re-render
- Look at render times

### **Step 2: Profile**
- Android Profiler → CPU tab
- Look for spikes
- Identify slow functions

### **Step 3: Fix**
- Memoize components
- Use useMemo/useCallback
- Optimize re-renders

### **Step 4: Verify**
- Measure FPS before/after
- Use Perf Monitor
- Test on real device

---

## ✅ Final Checklist for 60 FPS

- [ ] Using FlatList for long lists
- [ ] Components memoized with React.memo()
- [ ] useCallback for all event handlers
- [ ] useMemo for expensive calculations
- [ ] Animations use native driver
- [ ] No inline styles
- [ ] Images optimized and cached
- [ ] Console logs removed
- [ ] No memory leaks
- [ ] Tested on real device at 60 FPS
- [ ] Bundle size < 50 MB

---

## 📚 Resources

- [React Native Performance](https://reactnative.dev/docs/performance)
- [React Profiler](https://react.dev/reference/react/Profiler)
- [Android Profiler](https://developer.android.com/studio/profile/android-profiler)
- [Reanimated](https://docs.swmansion.com/react-native-reanimated/)

---

**Goal**: 60 FPS smooth scrolling ✅  
**Priority**: CRITICAL  
**Status**: Needs Implementation

