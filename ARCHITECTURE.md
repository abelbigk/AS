# AS App - Complete Architecture & Rules

## Overview

**AS** is a content organization app (name: "AS") for mobile and web. It allows users to organize saved content (links, ideas, photos, references) into a hierarchical structure: Categories → Subcategories → Content Items.

## Core Data Structure & Visibility Rules

### Hierarchy Levels

```
User
├── Categories (top-level groups)
│   ├── Subcategories (nested groups within a category)
│   │   └── Content Items (actual saved content)
│   └── Content Items (can also be linked directly to category)
└── Uncategorized Content (items not linked to any category/subcategory)
```

### Key Rule: Many-to-Many Linking

- **One Content Item can belong to multiple Categories**
- **One Content Item can belong to multiple Subcategories**
- **Subcategories are scoped to their parent Category** (a subcategory only shows in one category)
- **A Content Item can exist in both a Category AND its Subcategory** (or other categories independently)

---

## Navigation Structure & Back Button Behavior

### Page Hierarchy

#### Home Page (`/`)
- **Displays**: All Categories for current user
- **Actions**: 
  - View category (navigate to CategoryDetail)
  - Create new category
  - Reorder categories (drag-and-drop, saved immediately on drop)
  - Search globally across all content
  - Access Queued, Done, Add, Settings from bottom nav
- **Back Button**: 
  - Mobile: Returns to previous screen or closes app
  - Web: Browser back navigation

#### Category Detail Page (`/category/:id`)
- **Displays**: 
  - Category name, cover image, description
  - All Subcategories within this category
  - All Content Items linked to this category (regardless of subcategory)
  - Filtered content by status if `?status=queued|done` query param exists
- **Actions**:
  - Edit category
  - Delete category (shows confirm dialog)
  - Create new subcategory
  - Create new content in this category
  - Reorder subcategories (drag-and-drop, saved immediately)
  - Reorder content items (drag-and-drop, saved immediately)
  - Search content within category
  - Batch select and remove content from category
  - View/edit/delete content
- **Back Button**: Returns to Home page

#### Subcategory Detail Page (`/subcategory/:id`)
- **Displays**:
  - Subcategory name, cover image, description
  - All Content Items linked to this subcategory
  - Filtered content by status if `?status=queued|done` query param exists
- **Actions**:
  - Edit subcategory
  - Delete subcategory (shows confirm dialog)
  - Create new content in this subcategory
  - Reorder content items (drag-and-drop, saved immediately)
  - Search content within subcategory
  - Batch select and remove content from subcategory
  - View/edit/delete content
- **Back Button**: Returns to parent Category Detail page

#### Queued Page (`/queued`)
- **Displays**: All content items with status = "queued"
- **Actions**:
  - Search queued content
  - Mark as done
  - Edit/view content
- **Back Button**: Returns to Home or previous context

#### Done Page (`/done`)
- **Displays**: All content items with status = "done"
- **Actions**:
  - Search done content
  - Mark as queued/undone
  - Edit/view content
- **Back Button**: Returns to Home or previous context

#### Add Page (`/add`)
- **Displays**: Form to add new content
- **Actions**:
  - Enter heading, description
  - Upload poster image
  - Assign to categories/subcategories
  - Create content
- **Back Button**: Returns to Home or previous context

#### Settings Page (`/settings`)
- **Displays**:
  - Theme selector (light/dark)
  - Uncategorized content (items with no category/subcategory links)
  - Logout
- **Actions**:
  - Change theme
  - View uncategorized content
  - Assign uncategorized content to categories
  - Logout
- **Back Button**: Returns to Home

---

## Content Item Rules

### Content Creation
- **Heading** (required): Title/name of content
- **Description** (optional): Additional details
- **Poster Image** (optional): Cover/thumbnail image, can be cropped
- **Categories** (required on creation, can be empty later): Select one or more
- **Subcategories** (optional): Can only select subcategories from selected categories
- **Media** (optional): Add multiple images/videos as attachments
- **Status** (default: "default"): Can be "default", "queued", or "done"

### Content Linking Rules
- **Adding to multiple categories**: Same content heading can be added to multiple categories without duplication
- **Subcategory selection**: When you select a subcategory, the parent category is automatically deselected (only subcategory link is kept)
- **Removing from categories**: Content can be removed from a single category/subcategory without deleting the entire item
- **Uncategorized state**: If content has no category/subcategory links, it appears in "Uncategorized" on Settings page
- **Deletion**: Content is permanently deleted when explicitly deleted, removing all links and associated media

### Content Status
- **default**: Normal state, shows on category/subcategory pages
- **queued**: Item marked for later review, appears on /queued page
- **done**: Item completed, appears on /done page

---

## Category & Subcategory Rules

### Category Rules
- **Unique per user**: Each user has their own categories
- **Predefined defaults**: On first login, system initializes default categories (Movies, Food, Books, etc.)
- **Cover image**: Optional, can be cropped
- **Description**: Optional
- **Deletion**: Deletes the category, but:
  - If content is linked ONLY to this category, the content is deleted
  - If content is linked to this category AND other categories/subcategories, content remains and link is removed
- **Reordering**: Drag-and-drop reorder saves immediately to server

### Subcategory Rules
- **Scoped to parent category**: Each subcategory belongs to exactly one category
- **Nested grouping**: Provides second level of organization within a category
- **Cover image**: Optional, can be cropped
- **Description**: Optional
- **Independent from other categories**: A subcategory exists only in its parent category
- **Deletion**: Deletes the subcategory, but:
  - If content is linked ONLY to this subcategory, the content is deleted
  - If content is linked to this subcategory AND other categories/subcategories, content remains and link is removed
- **Reordering**: Drag-and-drop reorder saves immediately to server

---

## Visibility & Content Filtering Rules

### Home Page Content
- Shows **categories** only
- No content items visible at this level
- Uncategorized content is NOT shown (hidden until Settings page)

### Category Detail Page
- Shows **all content linked to this category** (directly or through subcategories)
- Shows **all subcategories** in this category
- If `?status=queued` → Filter to show only queued content
- If `?status=done` → Filter to show only done content
- **Search**: Searches heading/description within category

### Subcategory Detail Page
- Shows **only content linked to this subcategory**
- Does NOT show content linked to parent category only
- If `?status=queued` → Filter to show only queued content
- If `?status=done` → Filter to show only done content
- **Search**: Searches heading/description within subcategory

### Uncategorized Content
- Only appears in **Settings page**
- Shows items with no category OR subcategory links
- User can assign these items back to categories/subcategories

---

## Edit Content Dialog Rules

### What Can Be Edited
- **Heading**: Text input
- **Description**: Text area
- **Categories**: Multi-select with checkboxes
- **Subcategories**: Only shows subcategories from selected categories, optional
- **Poster Image**: Can upload new, crop, or remove
- **Media Items** (photos/videos):
  - Can reorder existing media (drag-and-drop)
  - Can delete existing media
  - Can add new media files
  - Video thumbnails auto-generated on preview

### Save Behavior
- **All changes are deferred until Save button is clicked**
- If you make changes and close without saving → all changes discarded, nothing sent to server
- Click Save → all changes (including media reordering) are sent together
- Media reordering shows immediate UI update (optimistic) but only saves to server when Save is clicked
- If you close without saving after reordering media → reorder is discarded

### Media Reordering
- **UI Updates immediately**: When you drag media, grid updates right away
- **Server saves on Save button**: Reorder mutation only sent when user clicks Save
- **Discard on close**: If you close dialog without saving, reorder is lost (no server call made)
- **Same as other changes**: Follows same pattern as editing heading/description

---

## Drag-and-Drop Reordering Rules

### Where Reordering Works
- **Home page**: Reorder categories
- **Category Detail**: Reorder subcategories and content items
- **Subcategory Detail**: Reorder content items
- **Edit Content Dialog**: Reorder media items (attachments)

### Reordering Behavior by Location
- **Categories (Home page)**: Saved immediately on drop
- **Subcategories (Category Detail)**: Saved immediately on drop
- **Content items (Category/Subcategory Detail)**: Saved immediately on drop
- **Media items (Edit Dialog)**: UI updates immediately on drop, saved when Save button clicked

### Technical Details
- Uses `dnd-kit` library for drag-and-drop
- Touch sensors enabled with 200ms activation delay (prevents accidental drags)
- Mouse sensor with 8px activation distance
- Keyboard support enabled
- Visual feedback during drag (cursor changes, visual indicators)

---

## Session & Authentication Rules

### Session Management
- **Mobile app**: 1 year session timeout
- **Web browser**: 7 days session timeout
- **Session storage**: Cookies
- **Logout**: Clears session cookie, returns to login

### User Context
- Each user sees only their own content
- Categories, subcategories, content are all user-specific
- No cross-user data visibility

---

## Media & Upload Rules

### Poster Image (Cover)
- Optional on content items
- Can be cropped before upload
- Stored in Cloudflare R2
- Can be removed by unchecking "Remove Poster" checkbox

### Media Attachments
- Multiple images and/or videos per content item
- Videos show play icon overlay on cards
- Video thumbnail auto-generated (uses frame at 1 second or 10% of duration)
- Each media item has order column for sorting
- Can be deleted individually
- Can be reordered (see Drag-and-Drop rules above)

### Storage
- Uploaded to Cloudflare R2
- Presigned URLs for browser uploads (with progress tracking)
- Files deleted from R2 when media item is deleted
- Partial uploads rolled back if save operation fails

---

## Search & Filtering Rules

### Global Search (Home page)
- Searches across all categories, subcategories, and content headings
- Results show hierarchical organization

### Category/Subcategory Search
- Only searches within that category/subcategory
- Searches heading and description
- Real-time filtering

### Status Filtering
- Via query parameter: `?status=queued` or `?status=done`
- Shows only content with that status
- Can be combined with category/subcategory views

---

## Theme & Preferences

### Theme Options
- **Light mode**: Light background, dark text
- **Dark mode**: Dark background, light text
- **Default**: Respects system preference on first load
- **Storage**: Saved in user preferences in database

---

## Delete Confirmation Rules

### Content Deletion
- Shows confirm dialog: "Delete content? This cannot be undone."
- Deletes content item and associated media files
- Removes from all categories/subcategories

### Category Deletion
- Shows confirm dialog: "Delete category? Content in this category will be..."
- If content is ONLY in this category → content is also deleted
- If content is in other categories/subcategories → content remains, just link removed

### Subcategory Deletion
- Shows confirm dialog: "Delete subcategory?"
- If content is ONLY in this subcategory → content is also deleted
- If content is in other categories/subcategories → content remains, just link removed

### Media Deletion
- Single click on X icon (no confirm) → media removed immediately
- Can undo if dialog still open (changes not saved)
- Actually deleted when Save is clicked

---

## Loading & Empty States

### Loading States
- Skeleton loaders while fetching data
- Disable buttons while loading

### Empty States
- Category with no content → "No content yet"
- Subcategory with no content → "No content yet"
- Queued page with no queued items → "No queued items"
- Done page with no done items → "No completed items"
- Search with no results → "No results found"
- Uncategorized with no uncategorized content → "All content organized!"

---

## Error Handling

### Network Errors
- Toast notification: "Failed to [action]"
- Automatic retry on some mutations
- User can retry manually

### Validation Errors
- Required fields marked
- Invalid inputs show error messages
- Form submission blocked until valid

### Upload Errors
- If cover upload fails → show error, changes not saved
- If media upload fails → show error, media not added
- Partial uploads cleaned up from R2 on failure

---

## Responsive Design Rules

### Mobile (< 768px)
- Bottom navigation bar (Home, Queued, Done, Add, Settings)
- Full-screen pages
- Drag-to-dismiss dialogs
- Optimized touch targets (min 48px)
- Pull-to-refresh on main pages

### Desktop (≥ 768px)
- Top/side navigation
- Multi-column layouts where appropriate
- Hover states on interactive elements
- Keyboard shortcuts available

---

## Data Consistency Rules

### Optimistic Updates
- UI updates immediately for quick feedback
- Server mutation happens in background
- If server fails, UI reverts to previous state
- Toast shows error message

### Data Invalidation
- After successful mutation, related queries invalidated
- Forces fresh data fetch from server
- Ensures UI shows authoritative server state

### Concurrent Edits
- Last save wins (no conflict resolution)
- If multiple tabs open, latest change persists

---

## Performance Considerations

### Query Caching
- Category list cached
- Content lists cached per category/subcategory
- Invalidated on mutations

### Lazy Loading
- Content items load paginated or scrolled as needed
- Media items load on demand

### Build Optimization
- Vite for fast HMR during development
- Code splitting for production bundles
- Tree-shaking unused code

---

## Accessibility

### Standards
- WCAG 2.1 Level AA compliant (target)
- Semantic HTML
- ARIA labels on interactive elements
- Keyboard navigation support
- Color contrast ratios met

### Mobile Accessibility
- Touch targets minimum 48x48px
- Screen reader support
- Focus indicators visible

---

## Summary of Key Rules

1. **Hierarchy**: Categories → Subcategories → Content
2. **Linking**: Content can link to multiple categories and subcategories
3. **Visibility**: Each page shows appropriate items at its level
4. **Reordering**: Categories/Subcategories/Content save immediately; Media in Edit dialog saves on Save button
5. **Back Button**: Returns to parent/previous context
6. **Deletion**: Removes links only; deletes content only if no other links remain
7. **Edit Dialog**: All changes deferred until Save button clicked
8. **Uncategorized**: Items with no category/subcategory links appear only in Settings
9. **Status**: Content can be default, queued, or done
10. **Search**: Per-page, searches only within that context
