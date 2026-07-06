import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { authStore } from '../store/auth';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { CategoryDetailScreen } from '../screens/CategoryDetailScreen';
import { SubcategoryListScreen } from '../screens/SubcategoryListScreen';
import { QueuedScreen } from '../screens/QueuedScreen';
import { DoneScreen } from '../screens/DoneScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        animationEnabled: true,
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            opacity: current.progress,
          },
        }),
      }}
    >
      <Stack.Screen
        name="HomeList"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CategoryDetail"
        component={CategoryDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SubcategoryList"
        component={SubcategoryListScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function QueuedStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="QueuedList"
        component={QueuedScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function DoneStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="DoneList"
        component={DoneScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SettingsList"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabelPosition: 'below-icon',
        tabBarIcon: ({ color, size }) => {
          let iconName = 'home';
          
          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Queued') {
            iconName = 'clock';
          } else if (route.name === 'Done') {
            iconName = 'check-circle';
          } else if (route.name === 'Settings') {
            iconName = 'cog';
          }
          
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: '#999',
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Queued"
        component={QueuedStack}
        options={{
          tabBarLabel: 'Queued',
        }}
      />
      <Tab.Screen
        name="Done"
        component={DoneStack}
        options={{
          tabBarLabel: 'Done',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated, isLoading, checkAuth, loadTheme } = authStore();

  useEffect(() => {
    checkAuth();
    loadTheme();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
