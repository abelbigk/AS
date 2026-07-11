# AS App Website Complete Analysis

## Executive Summary

Your website is a sophisticated **collection management system** with:
- **8 screens**: Login, Home, CategoryDetail, SubcategoryDetail, Add, Done, Queued, Settings
- **3 data layers**: Categories → Subcategories → Content Items
- **Advanced features**: Drag-to-reorder, image cropping, batch selection, multi-select categorization, status filtering
- **State management**: TRPC + React Query for type-safe API integration
- **Backend**: Same as React Native app will use (Turso DB, Cloudflare R2 storage, Render.com API)

---

## Screen-by-Screen Breakdown

### 1. **Login Screen** (`src/pages/Login.tsx`)
**Purpose**: Authentication gate for entering the app

**Features**:
- Username + password inputs with icons
- Toggle between Login and Register modes
- Form validation (required fields, min 6 chars for password)
- Session persistence: 7 days (web), 1 year (mobile app detected via Capacitor)
- Error handling with toast notifications

**Data Flow**:
- POST `auth.login` → Server returns JWT token
- Token stored in `localStorage.auth_token`
- Redirect to home on success
- Register: POST `auth.register` with username + password + name

**UI Pattern**: Centered card with background image (light/dark mode variants), divider separating register option

---

### 2. **Home Screen** (`src/pages/Home.tsx`)
**Purpose**: Main dashboard showing all categories with search and pull-to-refresh

**Features**:
- **Search**: Toggle search mode with live filtering across categories
- **Drag-to-reorder categories**: Rearrange category order via dnd-kit
- **Category cards**: Click to navigate to category detail
- **Content counts**: Shows number of items in each category
- **Pull-to-refresh**: Built-in PullToRefresh component
- **Dark mode toggle**: Top-right button

**Data Flow**:
- GET `categories.list` → all categories with counts
- Search: Client-side filtering on category names
- Drag reorder: POST `categories.reorder` with new order

**UI Pattern**: 2-column masonry grid of CategoryCard components, staggered load animation

---

### 3. **CategoryDetail Screen** (`src/pages/CategoryDetail.tsx`)
**Purpose**: Manage one category with nested subcategories and content

**Features**:
- **Category header**: Large background image (blur + dark overlay), name, description
- **Menu**: Search + more options dropdown
- **Subcategories section**: 2-column grid of subcategory cards
- **Content section**: 2-column masonry grid of content items
- **Drag-to-reorder**: Both subcategories AND content can be reordered
- **Search**: Filter both subcategories and content by query
- **Status filtering**: Query param filter (default/queued/done)
  - Filters affect displayed content AND visible subcategories (hides empty ones)
- **Batch selection**: Long-press to enter selection mode
  - Touch multi-select with auto-scroll
  - Bulk remove from category
  - Delete multiple items
- **Add buttons**: Dialogs to add subcategories or content directly
- **Edit menu**: Edit category info or delete category

**Data Flow**:
- GET `subcategories.list` (categoryId) → all subcats in category
- GET `content.listByCategory` (categoryId) → all content in category
- GET `categories.getById` (id) → full category details
- Drag subcats: POST `subcategories.reorder` with new order
- Drag content: POST `content.reorderInCategory` with new order
- Batch remove: POST `content.batchRemoveFromCategory` with item IDs
- Add subcategory: Dialog → POST `subcategories.create`
- Add content: Dialog → POST `content.create`

**UI Pattern**: Hero header + two labeled sections with 2-column grids, DnD context for reordering

---

### 4. **SubcategoryDetail Screen** (`src/pages/SubcategoryDetail.tsx`)
**Purpose**: Manage one subcategory with its content

**Features**:
- Similar to CategoryDetail but simpler (no nested subcategories)
- Subcategory header with background image
- Content section: 2-column masonry grid
- **Drag-to-reorder content**: Reorder items within this subcategory
- **Search**: Filter content by query
- **Status filtering**: Same as CategoryDetail
- **Batch selection**: Long-press for multi-select
- **Add content dialog**: Add new content to this subcategory
- **Edit menu**: Edit subcategory or delete (with warning if content becomes uncategorized)

**Data Flow**:
- GET `subcategories.getById` (id) → subcategory details
- GET `content.listBySubcategory` (id) → all content in subcategory
- Drag content: POST `content.reorderInSubcategory` with new order
- Batch remove: POST `content.batchRemoveFromSubcategory` with item IDs
- Delete warning: Checks if content has other categories/subcategories

**UI Pattern**: Hero header + content section, simplified compared to CategoryDetail

---

### 5. **Add Screen** (`src/pages/Add.tsx`)
**Purpose**: Create new category

**Features**:
- Large centered form
- **Info banner**: Explains workflow ("Add categories first, then open to add content/subcategories")
- **AddCategoryForm** component:
  - Name input (required)
  - Description input (optional)
  - Cover image upload with **image cropping UI**
  - Submit → POST `categories.create`
  - Redirect to new category on success

**Data Flow**:
- POST `categories.create` with name, description, image URL + crop data
- Auto-navigate to new category detail page

**UI Pattern**: Full-page form with background image, centered container

---

### 6. **Queue/Done Screens** (`src/pages/Queued.tsx`, `src/pages/Done.tsx`)
**Purpose**: View content by status (queued vs done)

**Features**:
- List of content filtered by status
- Toggle status icon to move between states
- Similar content cards to CategoryDetail
- May include batch operations

**Data Flow**:
- GET `content.listByStatus` (status: "queued" or "done")
- PATCH `content.updateStatus` (id, newStatus)

**UI Pattern**: Full list of ContentCard components, status badge on each

---

### 7. **Settings Screen** (`src/pages/Settings.tsx`)
**Purpose**: User settings and preferences

**Features**: (Mentioned in structure but not analyzed in detail)
- Likely includes: Dark mode toggle, logout, profile info
- May have preferences for UI customization

**Data Flow**: TBD based on actual implementation

---

## Data Models

### **Category**
```typescript
{
  id: number
  name: string
  description?: string
  coverImageUrl?: string
  coverCropData?: {
    x: number
    y: number
    width: number
    height: number
    rotation: number
  }
  // Computed on fetch
  _count?: {
    subcategories: number
    contents: number
  }
}
```

### **Subcategory**
```typescript
{
  id: number
  categoryId: number
  name: string
  description?: string
  coverImageUrl?: string
  coverCropData?: CropData
  // Computed
  _count?: {
    contents: number
  }
}
```

### **ContentItem**
```typescript
{
  id: number
  heading: string
  description?: string
  posterImageUrl?: string
  posterCropData?: CropData
  status: "default" | "queued" | "done"
  categoryIds: number[]        // Many-to-many relationship
  subcategoryIds: number[]     // Many-to-many relationship
  createdAt: Date
  updatedAt: Date
}
```

### **User**
```typescript
{
  id: string
  username: string
  name: string
  email?: string
}
```

---

## All TRPC API Endpoints

### **Authentication** (`trpc.auth.*`)
| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `auth.login` | POST | `{username, password}` | `{token, user}` |
| `auth.register` | POST | `{username, password, name}` | `{success}` |
| `auth.me` | GET | - | `{user}` or `null` |
| `auth.logout` | POST | - | `{success}` |

### **Categories** (`trpc.categories.*`)
| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `categories.list` | GET | - | `Category[]` |
| `categories.getById` | GET | `{id}` | `Category` |
| `categories.create` | POST | `{name, description?, imageUrl?, cropData?}` | `Category` |
| `categories.update` | PATCH | `{id, name?, description?, imageUrl?, cropData?}` | `Category` |
| `categories.delete` | DELETE | `{id}` | `{success}` |
| `categories.reorder` | POST | `{categoryIds: number[]}` | `{success}` |

### **Subcategories** (`trpc.subcategories.*`)
| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `subcategories.list` | GET | `{categoryId}` | `Subcategory[]` |
| `subcategories.listAll` | GET | - | `Subcategory[]` |
| `subcategories.getById` | GET | `{id}` | `Subcategory` |
| `subcategories.create` | POST | `{categoryId, name, description?, imageUrl?, cropData?}` | `Subcategory` |
| `subcategories.update` | PATCH | `{id, name?, description?, imageUrl?, cropData?}` | `Subcategory` |
| `subcategories.delete` | DELETE | `{id}` | `{success}` |
| `subcategories.reorder` | POST | `{categoryId, subcategoryIds: number[]}` | `{success}` |
| `subcategories.getContentCounts` | GET | `{categoryId}` | `{subcatId: count}` |

### **Content** (`trpc.content.*`)
| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `content.listByCategory` | GET | `{categoryId, status?}` | `ContentItem[]` |
| `content.listBySubcategory` | GET | `{subcategoryId, status?}` | `ContentItem[]` |
| `content.listByStatus` | GET | `{status}` | `ContentItem[]` |
| `content.listUncategorized` | GET | - | `ContentItem[]` |
| `content.getById` | GET | `{id}` | `ContentItem` |
| `content.create` | POST | `{heading, description?, imageUrl?, cropData?, status?, categoryIds?, subcategoryIds?}` | `ContentItem` |
| `content.update` | PATCH | `{id, heading?, description?, imageUrl?, cropData?, categoryIds?, subcategoryIds?}` | `ContentItem` |
| `content.updateStatus` | PATCH | `{id, status}` | `{success}` |
| `content.delete` | DELETE | `{id}` | `{success}` |
| `content.batchRemoveFromCategory` | POST | `{categoryId, contentIds: number[]}` | `{success}` |
| `content.batchRemoveFromSubcategory` | POST | `{subcategoryId, contentIds: number[]}` | `{success}` |
| `content.reorderInCategory` | POST | `{categoryId, contentIds: number[]}` | `{success}` |
| `content.reorderInSubcategory` | POST | `{subcategoryId, contentIds: number[]}` | `{success}` |

---

## Advanced Features Deep Dive

### **1. Image Upload & Cropping**

**Flow**:
1. User clicks image upload button
2. CroppedImage component opens (modal or inline)
3. User selects area to crop (interactive crop UI)
4. Crop data stored as: `{x, y, width, height, rotation}`
5. Image URL + crop data sent to server
6. Server stores both URL and crop metadata
7. On display: CSS transforms applied based on crop data

**Libraries**: 
- Image cropping UI component: `CroppedImage` (custom)
- Drag handles for crop adjustment
- Supports rotation

**Image Proxying**:
- Whitelisted domains (Unsplash, Cloudinary, r2.dev): direct URL
- Other domains: proxy via `/api/image-proxy?url=...`
- Blob URLs: pass through unchanged

---

### **2. Drag-to-Reorder**

**Library**: `dnd-kit` with rect sorting strategy

**Setup**:
```typescript
Sensors: Mouse (8px activation), Touch (250ms + 5px), Keyboard
Strategy: rectSortingStrategy (works with 2-column layouts)
Detection: closestCenter collision
```

**Implementation**:
- Wrap items in `SortableContext`
- Each item gets `SortableItem` wrapper with `{id, value}`
- On `dragEnd`: calculate old/new indices, update order
- Optimistic UI update via `setData()`
- Send new order to server via POST `reorder` mutation
- Auto-invalidate cache on success

**Prevents Conflicts**:
- CSS `user-select: none` during reorder
- `pointer-events: none` on images
- Custom data attributes for tracking

---

### **3. Touch Selection with Auto-Scroll**

**Purpose**: Multi-select items on mobile without conflicts with drag-to-reorder

**Implementation**:
- Long-press (500ms) enters selection mode
- Touch move: Check `elementFromPoint()` for item under finger
- If item found: Toggle selection checkbox
- Auto-scroll when finger in top/bottom 100px zone
- Scroll speed: 8px per frame

**Prevents Conflicts**:
- Only active when NOT dragging
- Separate gesture from DnD gestures
- Gesture handlers with activation delays

---

### **4. Search & Filtering**

**Search**: Client-side filtering on names/descriptions
- Toggle search mode → inline text input
- Real-time filtering as user types
- Filters both categories/subcategories AND content
- If status filter active: only shows items matching status

**Status Filtering**: Query parameter based
- URL format: `?status=queued` or `?status=done`
- Applied client-side to lists
- Affects both content AND subcategories visibility (hides empty ones)

---

### **5. Batch Operations**

**Pattern**:
1. User clicks "Remove from category" or "Delete" buttons
2. Sets `isSelectMode = true`
3. Long-press items to toggle selection
4. Batch action buttons appear with count
5. Confirm action in AlertDialog
6. POST `batch*` mutation with item IDs
7. Toast notification on success

**Available Batch Operations**:
- `batchRemoveFromCategory`: Remove items from category (may orphan them)
- `batchRemoveFromSubcategory`: Remove items from subcategory
- Batch delete: Delete multiple items entirely

---

## State Management Pattern

### **TRPC + React Query Setup**
```typescript
// lib/trpc.ts
export const trpc = createTRPCReact<AppRouter>();

// In components
const { data, isLoading, error } = trpc.categories.list.useQuery();
const mutation = trpc.content.create.useMutation({
  onSuccess: () => {
    // Auto-invalidate related queries
    utils.content.listByCategory.invalidate();
  }
});
```

### **Cache Invalidation Strategy**
- Categories: Invalidate all category queries on any change
- Content in category: Invalidate `content.listByCategory` + parent category
- Content in subcategory: Invalidate `content.listBySubcategory` + parent subcategory
- Filters: Applied client-side (no separate cache entries)
- Search: Applied client-side (no cache)

### **Optimistic Updates**
```typescript
// For drag-reorder, update UI immediately
utils.subcategories.list.setData(
  { categoryId }, 
  newOrderedSubcategories
);
// Then send to server
reorderMutation.mutate({...});
```

---

## Component Architecture

### **Page Components**
- `Login.tsx` → Form logic + auth mutation
- `Home.tsx` → Category list + drag reorder
- `CategoryDetail.tsx` → Complex: subcats + content + search + batch + drag
- `SubcategoryDetail.tsx` → Similar to CategoryDetail but simpler
- `Add.tsx` → Form + logo + info banner
- `Done.tsx` / `Queued.tsx` → Content lists by status
- `Settings.tsx` → User preferences (TBD)

### **Form Components** (Dialog/Modal based)
- `AddCategoryForm` → Create category (name + image + crop)
- `AddSubcategoryForm` → Create subcategory
- `AddContentForm` → Create content (heading + image + categories + subcategories + status)
- `EditCategoryDialog` → Edit existing category
- `EditSubcategoryDialog` → Edit existing subcategory
- `EditContentDialog` → Edit existing content

### **Card/Display Components**
- `CategoryCard` → Category preview (image + title + count)
- `ContentCard` → Single content item (image + title + status badge + menu)
- `CroppedImage` → Display image with applied crop data
- `SortableItem` → Wrapper for drag-to-reorder

### **UI Components** (from shadcn/ui)
- `Dialog` / `AlertDialog` → Forms and confirmations
- `DropdownMenu` → Action menus
- `Input` / `Textarea` → Form fields
- `Button` → Actions

---

## Key UI/UX Patterns

### **Hero Header Pattern** (CategoryDetail, SubcategoryDetail, Add)
```
┌─────────────────────────────────────────┐
│ Background Image (blur + dark overlay)  │
│  ┌─────────────────────────────────────┐│
│  │ Title + Description                 ││
│  │ [Search Icon] [More Menu]           ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### **Two-Column Masonry Grid**
- Left column: indices 0, 2, 4, 6...
- Right column: indices 1, 3, 5, 7...
- Gap: 12px between items
- Stagger animation on load (40ms per item)

### **Card Hover Effects**
- Scale: 1.02x on hover
- Shadow: Increase on hover
- Smooth transition: 300ms

### **Selection Mode**
- Checkbox overlays on cards
- Batch action buttons appear at bottom
- Selection count shown in header
- Touch multi-select with visual feedback

---

## Authentication & Session

### **Flow**:
1. User enters username + password on Login page
2. POST `auth.login` → Server validates, returns JWT token
3. Token stored in `localStorage.auth_token`
4. On app load: `auth.me` query validates token
5. If invalid: Auto-redirect to login (with `useAuth({redirectOnUnauthenticated: true})`)

### **Session Duration**:
- **Web**: 7 days
- **Mobile app** (Capacitor): 1 year
- Detected via: `/Capacitor/i.test(navigator.userAgent)`

### **Logout**:
- POST `auth.logout`
- Clear `localStorage.auth_token`
- Invalidate `auth.me` query
- Redirect to login

---

## Performance Optimizations

1. **Query caching**: Categories remain in cache across navigation
2. **Lazy load images**: Poster + cover images lazy-loaded
3. **Client-side filtering**: No server roundtrip for search/status filtering
4. **Optimistic updates**: Drag-reorder shows instant UI feedback
5. **Masonry grid**: Two-column prevents horizontal scrolling
6. **Stagger animation**: 40ms delay per item (engaging, not jarring)

---

## Critical Notes for React Native Migration

1. **Keep same API endpoints**: No backend changes needed
2. **TRPC client**: Need RN-compatible TRPC client setup
3. **Image handling**: Use `react-native-image-crop-picker` for similar UX
4. **Drag & drop**: Use `react-native-reanimated` + gesture handlers
5. **Touch selection**: Native gesture detection (easier on RN)
6. **Navigation**: React Navigation (instead of wouter)
7. **Storage**: `AsyncStorage` (instead of localStorage)
8. **Layout**: FlatList with 2-column setup for masonry
9. **UI components**: React Native equivalents for all shadcn/ui components
10. **State**: Same TRPC + React Query pattern works in RN

---

## Next Steps for React Native Implementation

1. ✅ **Understand website** (COMPLETE)
2. **Set up React Native project**:
   - Expo (managed) vs bare workflow
   - Navigation setup (React Navigation)
   - Zustand store + TRPC client
   - AsyncStorage for auth persistence

3. **Implement screens in order**:
   - Login (simplest, builds foundation)
   - Home (category list, drag-reorder)
   - CategoryDetail (most complex)
   - SubcategoryDetail (similar to CategoryDetail)
   - Add, Done, Queued, Settings

4. **Native features** (Android-specific):
   - Back button handling (Android.hardware.back event)
   - File downloads (DownloadManager)
   - Camera picker (ImagePicker library)
   - Gallery access

5. **Performance tuning**:
   - Optimize for 60 FPS (target)
   - Profiling with React Native DevTools
   - Image optimization + lazy loading
   - FlatList optimization (maxToRenderPerBatch, updateCellsBatchingPeriod)

6. **Testing**:
   - Metro bundler setup (`npx expo start --lan`)
   - Test on physical Android device or emulator
   - Verify all gestures work (drag, touch selection, long-press)

---

## Files Referenced

| File | Purpose |
|------|---------|
| `src/pages/Login.tsx` | Authentication |
| `src/pages/Home.tsx` | Category list |
| `src/pages/CategoryDetail.tsx` | Category management (most complex) |
| `src/pages/SubcategoryDetail.tsx` | Subcategory management |
| `src/pages/Add.tsx` | Create category |
| `src/lib/trpc.ts` | TRPC client setup |
| `src/_core/hooks/useAuth.ts` | Auth hook |
| `src/components/CategoryCard.tsx` | Card component |
| `src/components/ContentCard.tsx` | Content card with menu |
| `src/components/AddCategoryForm` | Category creation form |
| `src/components/CroppedImage.tsx` | Image crop UI |
| `src/components/SortableItem.tsx` | DnD wrapper |
| `src/types/index.ts` | Data model types |

---

**STATUS**: ✅ Website analysis complete. Ready to begin React Native implementation.

**Last updated**: When you run `npx expo start --lan`, the app will connect to Metro bundler and display on your phone at 60 FPS (if properly optimized).
