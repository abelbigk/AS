# Development Checklist & Quick Reference

## ✅ Phase 1: Foundation (COMPLETE)

### Setup
- [x] Expo project initialized
- [x] Dependencies installed (1,252 packages)
- [x] TypeScript configured
- [x] Babel plugins set up
- [x] Android permissions configured

### Navigation
- [x] RootNavigator created
- [x] Tab navigation (Collections, Queued, Done, Settings)
- [x] Stack navigation for each tab
- [x] Back button support
- [x] Deep linking structure

### Authentication
- [x] LoginScreen (login + register)
- [x] Zustand auth store
- [x] Token persistence (AsyncStorage)
- [x] useAuth hook
- [x] Auto-redirect on auth state change
- [x] Logout functionality

### API Integration
- [x] TRPC client configured
- [x] Axios instance with JWT interceptors
- [x] React Query setup
- [x] Cache invalidation patterns
- [x] Error handling

### Data Models
- [x] Category type
- [x] Subcategory type
- [x] ContentItem type
- [x] User type
- [x] CropData type

### Components
- [x] LoginScreen (70% complete)
- [x] HomeScreen (70% complete)
- [x] Settings screen (basic)
- [x] Route params system

### Documentation
- [x] Website analysis complete
- [x] Implementation roadmap
- [x] Complete guide
- [x] Quick start guide
- [x] This checklist

---

## 🚀 Phase 2: Main Features (TO DO)

### CategoryDetail Screen
- [ ] Fetch category + description
- [ ] Fetch subcategories
- [ ] Fetch content items
- [ ] Hero header with image
- [ ] Display subcategories (2-column grid)
- [ ] Display content (2-column masonry)
- [ ] **Drag-to-reorder subcategories** (HIGH PRIORITY)
- [ ] **Drag-to-reorder content** (HIGH PRIORITY)
- [ ] **Long-press selection mode** (HIGH PRIORITY)
- [ ] **Touch multi-select** (HIGH PRIORITY)
- [ ] Search filtering
- [ ] Status filtering
- [ ] Batch remove operations
- [ ] Batch delete operations
- [ ] Add subcategory modal
- [ ] Add content modal
- [ ] Edit category modal
- [ ] Delete category with confirmation

### Related Hooks
- [ ] Create `useDragReorder.ts`
  - [ ] Setup Gesture handler
  - [ ] Reanimated animated values
  - [ ] Drag start/move/end handlers
  - [ ] Optimistic UI update
  - [ ] Mutation on drop
- [ ] Create `useSelection.ts`
  - [ ] Long-press detection
  - [ ] Auto-scroll on edges
  - [ ] Item selection tracking
  - [ ] Batch operation helpers

### Related Components
- [ ] Create `DraggableItem.tsx` (wrapper for Reanimated)
- [ ] Create `ContentCard.tsx` (with selection mode)
- [ ] Create `CategoryCard.tsx` (if needed)
- [ ] Create `SelectionActionBar.tsx` (batch buttons)

---

## ⚡ Phase 3: Remaining Screens (TO DO)

### SubcategoryDetail
- [ ] Similar to CategoryDetail but simpler
- [ ] Content only (no nested subcategories)
- [ ] Drag-to-reorder content
- [ ] Search + filters
- [ ] Selection mode
- [ ] Batch operations

### AddCategory
- [ ] Text inputs (name, description)
- [ ] Image upload button
- [ ] Image cropping UI
- [ ] Submit handling
- [ ] Navigation to new category

### Done Screen
- [ ] Fetch content where status = "done"
- [ ] Display in list
- [ ] Toggle status icon
- [ ] Navigation to category/subcategory

### Queued Screen
- [ ] Fetch content where status = "queued"
- [ ] Display in list
- [ ] Toggle status icon
- [ ] Navigation to category/subcategory

### Settings Screen
- [ ] Display user info
- [ ] Dark mode toggle
- [ ] Preferences
- [ ] About section
- [ ] Logout button

---

## 📱 Phase 4: Native Features (TO DO)

### Image Handling
- [ ] Image picker (gallery)
- [ ] Camera picker
- [ ] Image cropping UI
- [ ] Upload to R2
- [ ] Progress tracking

### Android Features
- [ ] Back button handler
- [ ] File downloads to Downloads folder
- [ ] Download manager integration
- [ ] Permission handling

### File Operations
- [ ] Save photo to gallery
- [ ] Save video to downloads
- [ ] Share functionality
- [ ] File picker for videos

---

## ✨ Phase 5: Optimization & Polish (TO DO)

### Performance
- [ ] Profile with React Native Profiler
- [ ] Optimize FlatList rendering
- [ ] Memoize expensive components
- [ ] Image lazy loading
- [ ] Reanimated gestures smooth at 60 FPS
- [ ] Memory leak detection
- [ ] Bundle size optimization

### Error Handling
- [ ] Error boundaries
- [ ] Network error recovery
- [ ] Timeout handling
- [ ] Invalid data handling
- [ ] Fallback UI for errors

### User Experience
- [ ] Loading indicators
- [ ] Empty states
- [ ] Pull-to-refresh everywhere
- [ ] Smooth animations
- [ ] Toast notifications
- [ ] Loading skeletons

### Testing
- [ ] Manual testing on device
- [ ] Performance testing
- [ ] Navigation flow testing
- [ ] API error scenarios
- [ ] Offline scenarios

---

## 🏗️ Phase 6: Production (TO DO)

### Build
- [ ] Build APK (debug)
- [ ] Build APK (release)
- [ ] Code signing
- [ ] APK size optimization
- [ ] Bundle analysis

### Deployment
- [ ] Upload to Google Play
- [ ] Create Play Store listing
- [ ] Add screenshots
- [ ] Add description
- [ ] Submit for review

### Monitoring
- [ ] Error logging
- [ ] Crash reporting
- [ ] Analytics
- [ ] Performance monitoring

---

## Quick Reference: Common Commands

```bash
# Development
npm run start              # Start Metro (LAN)
npm run start:local        # Start locally
npm run start:tunnel       # Start with tunnel
npm run android            # Open Android emulator
npm run ios                # Open iOS simulator
npm run web                # Open web preview

# Building
npm run build:android      # Build debug APK
npm run build:android:prod # Build release APK
npm run prebuild          # Generate native code

# Maintenance
npm install               # Install dependencies
npm audit fix             # Fix security issues
npm update                # Update packages
npm run start -- --clear  # Clear cache + restart

# Debugging
npm run start -- --verbose # Verbose output
npm run android -- --logbox # Show error overlays
```

---

## Quick Reference: File Locations

| Task | File |
|------|------|
| Add new screen | `src/screens/main/ScreenName.tsx` |
| Add new hook | `src/hooks/useHookName.ts` |
| Add new component | `src/components/ComponentName.tsx` |
| Change navigation | `src/navigation/RootNavigator.tsx` |
| Change auth | `src/store/authStore.ts` |
| Change API config | `src/lib/api.ts` |
| Add types | `src/types/index.ts` |
| Change app config | `app.json` |

---

## Quick Reference: Common Patterns

### Query Data
```typescript
const { data, isLoading, error } = trpc.categories.list.useQuery();
```

### Mutate Data
```typescript
const mutation = trpc.content.create.useMutation({
  onSuccess: () => utils.content.listByCategory.invalidate(),
});
mutation.mutate({ heading: 'New' });
```

### Navigate
```typescript
navigation.navigate('category-detail', { categoryId: 123 });
navigation.goBack();
navigation.replace('home');
```

### Get Route Params
```typescript
const { categoryId } = route.params;
```

### Use Auth
```typescript
const { user, logout } = useAuth();
```

---

## Estimated Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Setup | 1 day | ✅ Complete |
| Phase 2: CategoryDetail | 2-3 days | 🚧 Next |
| Phase 3: Remaining Screens | 1-2 days | 🚧 After Phase 2 |
| Phase 4: Native Features | 1 day | 🚧 After Phase 3 |
| Phase 5: Optimization | 1-2 days | 🚧 After Phase 4 |
| Phase 6: Production | 1 day | 🚧 Final |
| **Total** | **7-10 days** | Ready to start! |

*Assumes full-time dedicated development*

---

## Testing Checklist

### Authentication
- [ ] Can login
- [ ] Can register
- [ ] Token persists after app close
- [ ] Can logout
- [ ] Redirects to login when token invalid

### Navigation
- [ ] Tabs work
- [ ] Stack navigation works
- [ ] Back button works
- [ ] Params pass correctly
- [ ] No navigation loops

### API
- [ ] Categories load
- [ ] No network errors
- [ ] Correct data displayed
- [ ] Search filters work
- [ ] Mutations succeed

### Performance
- [ ] App starts in <5s
- [ ] Scroll is smooth (60 FPS)
- [ ] No lag on gestures
- [ ] Memory usage stable
- [ ] Battery drain acceptable

### Android
- [ ] Back button works
- [ ] Photos downloaded
- [ ] Camera works
- [ ] Gallery picker works
- [ ] Permissions work

---

## Debugging Checklist

When something breaks:

1. **Check Metro terminal** for errors
2. **Check device logs** with `npm run start -- --verbose`
3. **Check network** with React Native Debugger
4. **Check component props** by logging
5. **Check API response** in Network tab
6. **Clear cache**: `npm run start -- --clear`
7. **Reinstall packages**: `rm -r node_modules && npm install`

---

## Hotkeys During Development

**On your phone:**
- Shake phone → Expo menu
- Press menu button (Android) → Expo menu

**In Expo menu:**
- Reload → Reload app
- Clear cache → Reset everything
- Dev settings → More options

---

## Important Reminders

1. **Always commit before big changes**
   ```bash
   git add .
   git commit -m "WIP: feature name"
   ```

2. **Keep Metro running in background**
   - Open terminal dedicated for it
   - Never close it mid-development

3. **Test on real device** before building
   - Emulator ≠ Real device performance
   - Touch gestures feel different

4. **Document as you build**
   - Comments for complex logic
   - Type annotations everywhere
   - README for setup

5. **Watch memory usage**
   - FlatList should virtualize
   - Images should lazy load
   - Avoid large inline objects

---

## When Stuck

1. **Search the docs** in `REACT_NATIVE_COMPLETE_GUIDE.md`
2. **Check React Navigation docs** - navigation issues
3. **Check Reanimated docs** - gesture issues
4. **Check TRPC docs** - API issues
5. **Check React Query docs** - caching issues

---

## Success Indicators

### Phase 2 Complete When:
- [ ] CategoryDetail loads and displays data
- [ ] Drag-to-reorder works smoothly
- [ ] Touch selection works
- [ ] App runs at 60 FPS on real device

### Phase 3 Complete When:
- [ ] All 8 screens implemented
- [ ] All navigation works
- [ ] No crashes on any screen

### Phase 5 Complete When:
- [ ] App consistently 60 FPS
- [ ] No memory leaks
- [ ] Handles all error cases gracefully
- [ ] UX is polished

### Phase 6 Complete When:
- [ ] APK built successfully
- [ ] Uploaded to Play Store
- [ ] Submitted for review
- [ ] Approved and live! 🎉

---

## Contact Points for Help

| Issue | Resource |
|-------|----------|
| Navigation | React Navigation Docs |
| Gestures | Reanimated Docs |
| Performance | React Native Docs |
| API | TRPC Docs |
| Caching | React Query Docs |
| Build | Expo Docs |
| TypeScript | TypeScript Docs |

---

**Last Updated**: Now  
**Status**: Ready to start Phase 2  
**Next Step**: Implement CategoryDetail screen
