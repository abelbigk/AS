import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

// Screens
import LoginScreen from '@/screens/auth/LoginScreen';
import HomeScreen from '@/screens/main/HomeScreen';
import CategoryDetailScreen from '@/screens/main/CategoryDetailScreen';
import SubcategoryDetailScreen from '@/screens/main/SubcategoryDetailScreen';
import AddCategoryScreen from '@/screens/main/AddCategoryScreen';
import DoneScreen from '@/screens/main/DoneScreen';
import QueuedScreen from '@/screens/main/QueuedScreen';
import SettingsScreen from '@/screens/main/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen name="login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        headerTintColor: '#000',
        contentStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen
        name="home"
        component={HomeScreen}
        options={{ title: 'Collections' }}
      />
      <Stack.Screen
        name="category-detail"
        component={CategoryDetailScreen}
        options={{ title: 'Category' }}
      />
      <Stack.Screen
        name="subcategory-detail"
        component={SubcategoryDetailScreen}
        options={{ title: 'Subcategory' }}
      />
      <Stack.Screen
        name="add-category"
        component={AddCategoryScreen}
        options={{ title: 'New Category' }}
      />
    </Stack.Navigator>
  );
}

function QueuedStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTintColor: '#000',
        contentStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen
        name="queued"
        component={QueuedScreen}
        options={{ title: 'Queued' }}
      />
      <Stack.Screen
        name="queued-category-detail"
        component={CategoryDetailScreen}
      />
      <Stack.Screen
        name="queued-subcategory-detail"
        component={SubcategoryDetailScreen}
      />
    </Stack.Navigator>
  );
}

function DoneStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTintColor: '#000',
        contentStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen
        name="done"
        component={DoneScreen}
        options={{ title: 'Done' }}
      />
      <Stack.Screen
        name="done-category-detail"
        component={CategoryDetailScreen}
      />
      <Stack.Screen
        name="done-subcategory-detail"
        component={SubcategoryDetailScreen}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'home-tab') {
            iconName = focused ? 'folder' : 'folder-outline';
          } else if (route.name === 'queued-tab') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'done-tab') {
            iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
          } else if (route.name === 'add-tab') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'settings-tab') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: 4,
        },
      })}
    >
      <Tab.Screen
        name="home-tab"
        component={HomeStack}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="queued-tab"
        component={QueuedStack}
        options={{ title: 'Queued' }}
      />
      <Tab.Screen
        name="done-tab"
        component={DoneStack}
        options={{ title: 'Done' }}
      />
      <Tab.Screen
        name="add-tab"
        component={AddCategoryScreen}
        options={{
          title: 'Add',
        }}
      />
      <Tab.Screen
        name="settings-tab"
        component={SettingsScreen}
        options={{ title: 'Settings', headerShown: true }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const token = useAuthStore((state) => state.token);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {token ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
