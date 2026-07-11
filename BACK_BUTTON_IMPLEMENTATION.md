# 📱 Back Button Implementation Guide

## 🎯 Requirements

The back button should:
1. **Navigate back** through screen history (standard Android behavior)
2. **Close dialogs/modals** instead of navigating when dialog is open
3. **Exit app** when at root screen and no dialogs open
4. **Be responsive** and feel natural

---

## 🏗️ Architecture

```
Back Button Press
  │
  ├─ Is dialog/modal open?
  │  └─ YES → Close dialog/modal
  │
  ├─ Can navigation go back?
  │  └─ YES → Navigate back to previous screen
  │
  └─ Is at root screen?
     └─ YES → Exit app
```

---

## 📋 Implementation Steps

### **Step 1: Setup React Navigation**

```javascript
// navigation/RootNavigator.js
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { useCallback } from 'react';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
        <Stack.Screen name="Edit" component={EditScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### **Step 2: Create Dialog State Manager**

```javascript
// store/dialogStore.js
import { create } from 'zustand';

export const useDialogStore = create((set) => ({
  // Dialog states
  showLoginDialog: false,
  showConfirmDialog: false,
  showFilterDialog: false,
  
  // Actions
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
  
  // Get all open dialogs
  getOpenDialogs: () => {
    const state = useDialogStore.getState();
    return [
      state.showLoginDialog && 'LoginDialog',
      state.showConfirmDialog && 'ConfirmDialog',
      state.showFilterDialog && 'FilterDialog',
    ].filter(Boolean);
  },
  
  // Check if any dialog is open
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

### **Step 3: Back Button Handler Hook**

```javascript
// hooks/useBackButton.js
import { BackHandler } from 'react-native';
import { useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useDialogStore } from '../store/dialogStore';

export function useBackButton(navigation) {
  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        const { hasOpenDialog, closeAllDialogs } = useDialogStore.getState();

        // If any dialog is open, close it
        if (hasOpenDialog()) {
          closeAllDialogs();
          return true;  // Prevent default behavior
        }

        // If can go back, go back
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;  // Prevent default behavior
        }

        // Otherwise, exit app (return false = let OS handle it)
        return false;
      };

      // Subscribe to back button
      const unsubscribe = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );

      // Cleanup
      return () => unsubscribe.remove();
    }, [navigation])
  );
}
```

### **Step 4: Use Hook in Screens**

```javascript
// screens/HomeScreen.js
import { useNavigation } from '@react-navigation/native';
import { useBackButton } from '../hooks/useBackButton';
import { useDialogStore } from '../store/dialogStore';

export function HomeScreen() {
  const navigation = useNavigation();
  const { openDialog, closeDialog, showFilterDialog } = useDialogStore();

  // Setup back button handler
  useBackButton(navigation);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item.id}
      />

      {/* Filter Button */}
      <Button
        title="Filter"
        onPress={() => openDialog('showFilterDialog')}
      />

      {/* Filter Dialog */}
      <Modal
        visible={showFilterDialog}
        transparent={true}
      >
        <FilterDialog
          onClose={() => closeDialog('showFilterDialog')}
          onApply={handleApplyFilter}
        />
      </Modal>
    </View>
  );
}
```

---

## 🎬 Practical Examples

### **Example 1: Login Screen with Dialog**

```javascript
// screens/LoginScreen.js
export function LoginScreen() {
  const navigation = useNavigation();
  const { openDialog, closeDialog, showLoginDialog } = useDialogStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useBackButton(navigation);

  const handleLogin = async () => {
    try {
      await loginUser(email, password);
      navigation.replace('Home');
    } catch (error) {
      openDialog('showLoginDialog');  // Show error dialog
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} />

      {/* Error Dialog */}
      <Modal visible={showLoginDialog} transparent={true}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialog}>
            <Text>Login failed. Please try again.</Text>
            <Button
              title="OK"
              onPress={() => closeDialog('showLoginDialog')}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
```

### **Example 2: List with Confirm Dialog**

```javascript
// screens/ItemsScreen.js
export function ItemsScreen() {
  const navigation = useNavigation();
  const { openDialog, closeDialog, showConfirmDialog } = useDialogStore();
  const [selectedItem, setSelectedItem] = useState(null);

  useBackButton(navigation);

  const handleDelete = (item) => {
    setSelectedItem(item);
    openDialog('showConfirmDialog');
  };

  const confirmDelete = async () => {
    await deleteItem(selectedItem.id);
    closeDialog('showConfirmDialog');
    // Refresh list
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={({ item }) => (
          <ItemRow
            item={item}
            onDelete={() => handleDelete(item)}
          />
        )}
        keyExtractor={item => item.id}
      />

      {/* Confirm Delete Dialog */}
      <Modal visible={showConfirmDialog} transparent={true}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialog}>
            <Text>Delete "{selectedItem?.name}"?</Text>
            <View style={styles.buttonRow}>
              <Button
                title="Cancel"
                onPress={() => closeDialog('showConfirmDialog')}
              />
              <Button
                title="Delete"
                onPress={confirmDelete}
                color="red"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
```

---

## 🧪 Testing Back Button

### **Test Case 1: Navigate Back**
```
1. Start at Home screen
2. Tap a category → goes to Details screen
3. Press back → goes back to Home screen
Expected: ✅ Navigates back
```

### **Test Case 2: Close Dialog with Back**
```
1. At Details screen
2. Tap "Delete" → Shows confirm dialog
3. Press back → Dialog closes, stays on Details screen
4. Press back again → Goes back to Home screen
Expected: ✅ Dialog closes first, then navigates
```

### **Test Case 3: Exit App**
```
1. At Home screen (root)
2. Press back → App exits
Expected: ✅ App closes
```

### **Test Case 4: Multiple Dialogs**
```
1. At Edit screen with filter dialog open
2. Open another dialog on top
3. Press back → Closes top dialog
4. Press back → Closes first dialog
5. Press back → Navigates back
Expected: ✅ Closes all dialogs in reverse order
```

---

## 🔧 Advanced: Multiple Modal Stacks

If you have multiple modal stacks (like bottom sheets), extend the approach:

```javascript
// store/dialogStore.js (extended)
export const useDialogStore = create((set, get) => ({
  // Modal stack (LIFO - Last In First Out)
  modalStack: [],
  
  pushModal: (modalName) => set((state) => ({
    modalStack: [...state.modalStack, modalName]
  })),
  
  popModal: () => set((state) => ({
    modalStack: state.modalStack.slice(0, -1)
  })),
  
  isModalOpen: () => get().modalStack.length > 0,
  
  closeTopModal: () => get().popModal(),
}));
```

```javascript
// hooks/useBackButton.js (extended)
export function useBackButton(navigation) {
  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        const { isModalOpen, closeTopModal } = useDialogStore.getState();

        // If any modal is open, close top one
        if (isModalOpen()) {
          closeTopModal();
          return true;
        }

        // If can go back, go back
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }

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

---

## 📊 Implementation Checklist

- [ ] React Navigation setup
- [ ] Dialog state manager (Zustand) created
- [ ] useBackButton hook created
- [ ] Hook imported in all screens
- [ ] All dialogs connected to state manager
- [ ] Back button tested on real device
- [ ] Multiple dialogs tested
- [ ] Navigation back tested
- [ ] App exit tested
- [ ] No dialogs leak open on navigation

---

## 🎯 Success Criteria

✅ Back button closes any open dialog first  
✅ Back button navigates to previous screen  
✅ Back button exits app when at root  
✅ Back button feels natural and responsive  
✅ Works on all Android devices  

---

## 📚 References

- [React Navigation Docs](https://reactnavigation.org/)
- [BackHandler API](https://reactnative.dev/docs/backhandler)
- [useFocusEffect Hook](https://reactnavigation.org/docs/use-focus-effect/)

---

**Status**: Ready for implementation  
**Priority**: HIGH  
**Complexity**: Medium

