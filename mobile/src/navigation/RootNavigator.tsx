import { ActivityIndicator, View } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import LoginScreen from "@/screens/LoginScreen";
import CategoryDetailScreen from "@/screens/CategoryDetailScreen";
import SubcategoryDetailScreen from "@/screens/SubcategoryDetailScreen";
import ContentDetailScreen from "@/screens/ContentDetailScreen";
import AddContentScreen from "@/screens/AddContentScreen";
import AddSubcategoryScreen from "@/screens/AddSubcategoryScreen";
import EditContentScreen from "@/screens/EditContentScreen";
import TabNavigator from "./TabNavigator";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { loading, isAuthenticated } = useAuth();
  const { theme, mode } = useTheme();

  const navTheme = {
    ...(mode === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.background,
      card: theme.surface,
      text: theme.text,
      border: theme.surfaceBorder,
      primary: theme.primary,
    },
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
            <Stack.Screen name="SubcategoryDetail" component={SubcategoryDetailScreen} />
            <Stack.Screen
              name="ContentDetail"
              component={ContentDetailScreen}
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen name="AddContent" component={AddContentScreen} options={{ presentation: "modal" }} />
            <Stack.Screen name="AddSubcategory" component={AddSubcategoryScreen} options={{ presentation: "modal" }} />
            <Stack.Screen name="EditContent" component={EditContentScreen} options={{ presentation: "modal" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
