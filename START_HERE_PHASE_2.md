# 🚀 START HERE: Phase 2 Implementation Guide

## You Are Here

You've completed Phase 1. The React Native app foundation is solid.

**Status**: ✅ Ready to build features  
**Next**: Implement CategoryDetail screen (most complex)  
**Time**: ~2-3 days

---

## Before You Start

### 1. Read These (In Order)
1. ✅ This file
2. `PHASE_1_SETUP_COMPLETE.md` - What was built
3. `REACT_NATIVE_IMPLEMENTATION_ROADMAP.md` - Phase 2 section
4. `REACT_NATIVE_COMPLETE_GUIDE.md` - Code patterns

### 2. Start the Dev Server
```bash
cd c:\mycode3\app
npm run start
```

Keep this terminal open the whole time.

### 3. Test on Phone/Emulator
```bash
# Option A: Scan QR
npm run start

# Option B: Android emulator
npm run android
```

You should see:
- ✅ Login screen
- ✅ Can login (test/test123)
- ✅ Home screen with categories
- ✅ Bottom tabs working
- ✅ Settings + logout working

---

## Phase 2: CategoryDetail Screen

This is the most complex screen. It has:
- Subcategories grid (2-column)
- Content grid (2-column masonry)
- Drag-to-reorder BOTH
- Long-press selection mode
- Touch multi-select with auto-scroll
- Search filtering
- Status filtering
- Batch operations

### Why This Screen?

80% of app logic lives here. Once you build this:
- SubcategoryDetail is easier (same code, simpler)
- Add screen is easy (just a form)
- Done/Queued screens are simple (just lists)
- Android features are straightforward

### Step-by-Step Approach

#### Step 1: Basic Layout (1 hour)
Get CategoryDetail to render and fetch data.

**File**: `src/screens/main/CategoryDetailScreen.tsx`

```typescript
import React from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { trpc } from '@/lib/trpc';

export default function CategoryDetailScreen({ route }: any) {
  const { categoryId } = route.params;

  // Fetch data
  const { data: category, isLoading: catLoading } = trpc.categories.getById.useQuery({
    id: categoryId
  });
  const { data: content = [], isLoading: contentLoading } = trpc.content.listByCategory.useQuery({
    categoryId
  });

  if (catLoading || contentLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Hero Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{category?.name}</Text>
        <Text style={styles.subtitle}>{category?.description}</Text>
      </View>

      {/* Content Grid */}
      <FlatList
        data={content}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.heading}</Text>
          </View>
        )}
        numColumns={2}
        columnWrapperStyle={styles.row}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666' },
  row: { justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 12 },
  card: { flex: 0.48, backgroundColor: '#eee', padding: 12, borderRadius: 8, height: 100 },
});
```

**Test**: 
- Navigate to a category → see title + description + content list

#### Step 2: Add Subcategories Section (1 hour)
Add a grid of subcategories above content.

```typescript
const { data: subcategories = [] } = trpc.subcategories.list.useQuery({
  categoryId
});

// In render:
<View>
  {/* Subcategories Section */}
  <Text style={styles.sectionTitle}>Subcategories</Text>
  <FlatList
    data={subcategories}
    renderItem={({ item }) => (
      <View style={styles.subcatCard}>
        <Text>{item.name}</Text>
      </View>
    )}
    numColumns={2}
    scrollEnabled={false}
    columnWrapperStyle={styles.row}
  />

  {/* Content Section */}
  <Text style={styles.sectionTitle}>Content</Text>
  {/* ... content list ... */}
</View>
```

**Test**: 
- See both subcategories and content

#### Step 3: Add Search & Status Filter (1 hour)
Add filter inputs and apply client-side filtering.

```typescript
const [searchQuery, setSearchQuery] = useState('');
const [statusFilter, setStatusFilter] = useState<'default' | 'queued' | 'done' | null>(null);

// Filter data
const filteredContent = content.filter(item => {
  if (searchQuery && !item.heading.toLowerCase().includes(searchQuery.toLowerCase())) {
    return false;
  }
  if (statusFilter && item.status !== statusFilter) {
    return false;
  }
  return true;
});

// In render:
<View style={styles.filters}>
  <TextInput
    style={styles.searchInput}
    placeholder="Search..."
    value={searchQuery}
    onChangeText={setSearchQuery}
  />
  <TouchableOpacity
    onPress={() => setStatusFilter(
      statusFilter === null ? 'queued' : statusFilter === 'queued' ? 'done' : null
    )}
  >
    <Text>{statusFilter || 'All'}</Text>
  </TouchableOpacity>
</View>
```

**Test**:
- Type in search → content filters
- Click status filter → toggles between All/Queued/Done

#### Step 4: Add Selection Mode (2 hours)
Long-press to enter selection mode with checkboxes.

```typescript
const [isSelectMode, setIsSelectMode] = useState(false);
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

const toggleSelect = (id: number) => {
  const newSelected = new Set(selectedIds);
  if (newSelected.has(id)) {
    newSelected.delete(id);
  } else {
    newSelected.add(id);
  }
  setSelectedIds(newSelected);
};

// Content card with long-press and checkbox
const ContentCard = ({ item, selected, isSelectMode }) => (
  <TouchableOpacity
    onLongPress={() => {
      setIsSelectMode(true);
      toggleSelect(item.id);
    }}
    onPress={() => {
      if (isSelectMode) {
        toggleSelect(item.id);
      }
    }}
    style={[styles.card, selected && styles.cardSelected]}
  >
    {isSelectMode && (
      <View style={styles.checkbox}>
        <Text>{selected ? '✓' : '☐'}</Text>
      </View>
    )}
    <Text>{item.heading}</Text>
  </TouchableOpacity>
);
```

**Test**:
- Long-press item → checkboxes appear
- Tap items → they toggle
- Exit mode via back button

#### Step 5: Add Batch Operations (1 hour)
Show batch action buttons when items selected.

```typescript
{isSelectMode && selectedIds.size > 0 && (
  <View style={styles.batchActions}>
    <TouchableOpacity
      style={styles.batchButton}
      onPress={() => {
        // Remove from category
        removeMutation.mutate({
          categoryId,
          contentIds: Array.from(selectedIds)
        });
        setIsSelectMode(false);
        setSelectedIds(new Set());
      }}
    >
      <Text>Remove ({selectedIds.size})</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.batchButton}
      onPress={() => {
        // Delete items
        deleteMutation.mutate({
          contentIds: Array.from(selectedIds)
        });
        setIsSelectMode(false);
        setSelectedIds(new Set());
      }}
    >
      <Text>Delete</Text>
    </TouchableOpacity>
  </View>
)}
```

**Test**:
- Select items → batch buttons appear
- Click button → items removed/deleted

#### Step 6: Add Drag-to-Reorder (3 hours) 🔥
This is the hardest part. Use react-native-reanimated.

Create `src/hooks/useDragReorder.ts`:

```typescript
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export function useDragReorder(items, onReorder) {
  const offsets = items.map(() => useSharedValue(0));

  const gestures = items.map((item, index) =>
    Gesture.Pan()
      .onUpdate(e => {
        offsets[index].value = e.translationY;
      })
      .onEnd(e => {
        // Calculate drop position
        const dropIndex = Math.floor(e.translationY / 80); // 80px per item
        if (dropIndex !== 0 && dropIndex < items.length) {
          // Reorder
          const newItems = [...items];
          const [moved] = newItems.splice(index, 1);
          newItems.splice(index + dropIndex, 0, moved);
          onReorder(newItems);
        }
        offsets[index].value = withSpring(0);
      })
  );

  return { offsets, gestures };
}
```

Use in component:

```typescript
const { offsets, gestures } = useDragReorder(filteredContent, (newOrder) => {
  reorderMutation.mutate({
    categoryId,
    contentIds: newOrder.map(i => i.id)
  });
});

// Render with gesture:
{filteredContent.map((item, index) => (
  <GestureDetector key={item.id} gesture={gestures[index]}>
    <Animated.View style={useAnimatedStyle(() => ({
      transform: [{ translateY: offsets[index].value }]
    }))}>
      <ContentCard item={item} />
    </Animated.View>
  </GestureDetector>
))}
```

**Test**:
- Drag item → see it move
- Release → stays in new position
- Pull data → new order persisted

#### Step 7: Polish & Edge Cases (1-2 hours)
- Add Android back button handler
- Handle loading/error states
- Add empty state
- Prevent conflicts between drag + select
- Add pull-to-refresh

---

## File Checklist for Phase 2

### Create (New Files)
- [ ] `src/hooks/useDragReorder.ts`
- [ ] `src/hooks/useAndroidBackButton.ts`
- [ ] `src/components/ContentCard.tsx`
- [ ] `src/components/DraggableItem.tsx`

### Modify (Existing Files)
- [ ] `src/screens/main/CategoryDetailScreen.tsx` - main implementation
- [ ] `src/navigation/RootNavigator.tsx` - if needed for params
- [ ] `src/App.tsx` - if need additional providers

---

## Testing Strategy

### Test Step-by-Step
1. ✅ Basic render works
2. ✅ Data fetches correctly
3. ✅ Search filters work
4. ✅ Status filter works
5. ✅ Selection mode works
6. ✅ Batch ops work
7. ✅ Drag reorder works
8. ✅ 60 FPS on real device

**Don't try to do everything at once.**

### Run After Each Step
```bash
# Make changes
# Save file
# Check phone (hot reload)
# If works, commit:
git add .
git commit -m "Phase 2: Step X - description"
```

---

## Common Gotchas

### 1. Drag Gesture Conflicts with FlatList
**Solution**: Use `scrollEnabled={false}` on non-scrolling lists

### 2. Selection Checkbox Overlays Not Showing
**Solution**: Render checkbox with `position: 'absolute'` and higher `zIndex`

### 3. Reanimated Offsets Keep Accumulating
**Solution**: Reset to 0 with `withSpring(0)` on gesture end

### 4. Batch Operations Fail
**Solution**: Ensure mutation includes all required params

### 5. App Crashes on Drag Start
**Solution**: Install gesture-handler in babel.config.js (already done)

---

## Code Review Checklist

Before committing each step:
- [ ] TypeScript has no errors
- [ ] No console warnings
- [ ] Code is readable (not too complex)
- [ ] Comments where needed
- [ ] Similar code extracted to helpers
- [ ] Tested on real device

---

## Performance Tips for Phase 2

1. **Memoize components**:
   ```typescript
   const ContentCard = React.memo(({ item }) => ...)
   ```

2. **Use useMemo for expensive filters**:
   ```typescript
   const filtered = useMemo(() => 
     items.filter(i => i.status === statusFilter), 
     [items, statusFilter]
   );
   ```

3. **Optimize FlatList**:
   ```typescript
   maxToRenderPerBatch={6}
   updateCellsBatchingPeriod={50}
   initialNumToRender={12}
   removeClippedSubviews={true}
   ```

4. **Lazy load images** (when you add them)

---

## Debugging Phase 2

### Metro Shows Error
```
Error: Cannot find module 'react-native-reanimated/plugin'
```
Solution: Already configured in babel.config.js

### Drag Not Working
Check:
- [ ] GestureDetector wrapping component?
- [ ] Gesture handler plugin in babel?
- [ ] Reanimated installed?

### Selection Mode Won't Exit
Add Android back button handler:
```typescript
useAndroidBackButton(() => {
  if (isSelectMode) {
    setIsSelectMode(false);
    return true;
  }
  return false;
});
```

---

## Success Criteria for Phase 2

✅ **Phase 2 Complete When:**
- All 8 features implemented (layout, search, filter, select, batch, drag)
- No crashes on real device
- Smooth 60 FPS on scroll
- Data persists after drag
- Selection mode works
- All console warnings fixed

---

## Estimated Timeline

```
Total Phase 2: 2-3 days

Day 1:
  - Step 1: Basic layout (1h)
  - Step 2: Add subcategories (1h)
  - Step 3: Search + filter (1h)
  - Test: everything working (1h)

Day 2:
  - Step 4: Selection mode (2h)
  - Step 5: Batch operations (1h)
  - Test: no crashes (1h)

Day 3:
  - Step 6: Drag-to-reorder (3h)
  - Step 7: Polish + fixes (2h)
  - Performance tuning (1h)
  - Final testing (1h)
```

---

## Next Steps After Phase 2

Once CategoryDetail is done:
1. SubcategoryDetail (copy + simplify CategoryDetail)
2. AddCategory form with image crop
3. Done/Queued screens (copy Done screen 2x)
4. Settings screen improvements

All much easier after mastering CategoryDetail!

---

## Ready?

```bash
cd c:\mycode3\app
npm run start
```

Scan the QR code, test the app, then start building CategoryDetail!

You got this! 💪

---

**Status**: Ready to begin Phase 2  
**Difficulty**: Medium-High  
**Estimated Duration**: 2-3 days  
**Key Skills Needed**: React Native, Gesture Handling, Reanimated
