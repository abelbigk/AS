# Screen Documentation

## Login Screen (`LoginScreen.tsx`)

### Features
- Username and password input
- Show/hide password toggle
- Form validation
- Loading state during login
- Error alerts

### Navigation
- Navigates to App (home screens) on success

### Data Flow
```
User Input
  ↓
authStore.login(username, password)
  ↓
API: POST /auth/login
  ↓
Token stored in AsyncStorage
  ↓
App automatically navigates to home
```

---

## Home Screen (`HomeScreen.tsx`)

### Features
- Display all user categories
- Pull-to-refresh
- Create new category dialog
- Tap category to view details
- Settings navigation

### Components
- `Appbar.Header` - Top bar with settings button
- `FlatList` - Scrollable list of categories
- `FAB` - Floating action button to create
- `Dialog` - Modal for new category input

### Data Flow
```
useEffect()
  ↓
fetchCategories()
  ↓
API: GET /categories
  ↓
Zustand contentStore.categories updated
  ↓
FlatList re-renders with categories
```

### User Interactions
- **Tap Category Card** → Navigate to CategoryDetail
- **Tap Settings** → Navigate to Settings
- **Tap FAB** → Show create dialog
- **Pull Down** → Refresh categories
- **Enter Name & Create** → POST new category

---

## Category Detail Screen (`CategoryDetailScreen.tsx`)

### Features
- Show category name and description
- Display all content items in category
- Filter by status (queued/done/default)
- Create new content item
- Tap item to view/edit details (coming soon)
- Pull-to-refresh

### Components
- `Appbar` - Back button and category name
- `Card` - Content item cards with heading
- `Chip` - Status badge
- `FAB` - Create new content
- `Dialog` - Content item creation form

### Data Flow
```
useEffect([categoryId])
  ↓
fetchContentByCategory(categoryId)
  ↓
API: GET /content?categoryId=:id
  ↓
Zustand contentStore.contentItems updated
  ↓
FlatList re-renders with items
```

### User Interactions
- **Tap Back** → Return to Home
- **Tap Item Card** → Show detail (not implemented yet)
- **Tap FAB** → Show create dialog
- **Enter Heading/Description & Add** → POST new content
- **Pull Down** → Refresh content list

---

## Queued Screen (`QueuedScreen.tsx`)

### Features
- Show all "queued" status items
- Quick action to mark as done
- Pull-to-refresh
- Item count in header

### Components
- `Appbar` - Header with count
- `Card` - Content item cards
- `Button` - Mark as done action
- `FlatList` - Scrollable list

### Data Flow
```
useEffect()
  ↓
fetchContentByStatus('queued')
  ↓
API: GET /content?status=queued
  ↓
Zustand contentStore.contentItems updated
  ↓
FlatList shows only queued items
```

### User Interactions
- **Tap Mark Done** → PATCH content status to 'done'
- **Pull Down** → Refresh list
- **Pull Down** → Removes item from view

---

## Done Screen (`DoneScreen.tsx`)

### Features
- Show all "done" status items
- Delete action for items
- Pull-to-refresh
- Item count in header

### Components
- `Appbar` - Header with count
- `Card` - Content item cards
- `Button` - Delete action
- `FlatList` - Scrollable list

### Data Flow
```
useEffect()
  ↓
fetchContentByStatus('done')
  ↓
API: GET /content?status=done
  ↓
Zustand contentStore.contentItems updated
  ↓
FlatList shows only done items
```

### User Interactions
- **Tap Delete** → Show confirmation
- **Confirm Delete** → DELETE /content/:id
- **Item removed from list**
- **Pull Down** → Refresh list

---

## Settings Screen (`SettingsScreen.tsx`)

### Features
- Display user profile info
- Show username, email, name, role
- Version information
- Logout button with confirmation

### Components
- `Appbar` - Header
- `List.Item` - Profile information rows
- `Button` - Logout action
- `Divider` - Visual separation
- `ScrollView` - Content scrolling

### Data Flow
```
User data from authStore
  ↓
Display in List Items
```

### User Interactions
- **Tap Logout** → Show confirmation
- **Confirm Logout** → authStore.logout()
- **Token removed from storage**
- **Navigate to Login screen**

---

## Navigation Flow

```
Start App
  ↓
Check AsyncStorage for token
  ├─ Token found?
  │   ├─ YES → App Navigator (Tabs)
  │   └─ NO → Auth Navigator (Login)
  │
App Navigator (Authenticated)
  ├─ Home Tab
  │   ├─ HomeScreen (Categories)
  │   └─ CategoryDetail → Content Items
  │
  ├─ Queued Tab
  │   └─ QueuedScreen
  │
  ├─ Done Tab
  │   └─ DoneScreen
  │
  └─ Settings Tab
      └─ SettingsScreen → Logout → Login
```

---

## State Management

### authStore (Zustand)
```typescript
{
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  
  login(username, password)
  register(username, password, name?)
  logout()
  checkAuth()
}
```

### contentStore (Zustand)
```typescript
{
  categories: Category[]
  subcategories: Subcategory[]
  contentItems: ContentItem[]
  isLoading: boolean
  
  // Category actions
  fetchCategories()
  createCategory(data)
  updateCategory(id, data)
  deleteCategory(id)
  
  // Subcategory actions
  fetchSubcategories(categoryId?)
  createSubcategory(categoryId, data)
  updateSubcategory(id, data)
  deleteSubcategory(id)
  
  // Content actions
  fetchContentByCategory(categoryId)
  fetchContentByStatus(status)
  createContent(data)
  updateContent(id, data)
  deleteContent(id)
}
```

---

## Common Patterns

### Loading State
```tsx
const { isLoading } = contentStore();

<FlatList
  data={items}
  renderItem={...}
  refreshControl={
    <RefreshControl refreshing={isLoading} />
  }
/>
```

### Error Handling
```tsx
try {
  await action();
  Alert.alert('Success', 'Done!');
} catch (error) {
  Alert.alert('Error', error.message);
}
```

### Empty State
```tsx
<FlatList
  ListEmptyComponent={
    <View style={styles.empty}>
      <Text>No items</Text>
    </View>
  }
/>
```

### Modal Dialog
```tsx
<Portal>
  <Dialog visible={visible} onDismiss={() => setVisible(false)}>
    <Dialog.Title>Title</Dialog.Title>
    <Dialog.Content>Content</Dialog.Content>
    <Dialog.Actions>
      <Button>Cancel</Button>
      <Button>Confirm</Button>
    </Dialog.Actions>
  </Dialog>
</Portal>
```

---

## Performance Considerations

### FlatList Best Practices
- Use `keyExtractor` for unique keys
- Set `removeClippedSubviews={true}`
- Use `maxToRenderPerBatch` for large lists
- Implement `onEndReached` for pagination (future)

### Image Optimization
- Always specify width/height
- Use appropriate formats
- Implement lazy loading (future)

### State Updates
- Use Zustand for global state
- Minimize re-renders with selectors
- Memoize expensive computations

---

## Future Enhancements

- [ ] Subcategory screens
- [ ] Content detail screen (view/edit)
- [ ] Image uploads
- [ ] Drag-and-drop reordering
- [ ] Advanced search/filtering
- [ ] Dark mode
- [ ] Notifications
- [ ] Offline sync
- [ ] Share functionality
- [ ] Multiple accounts
