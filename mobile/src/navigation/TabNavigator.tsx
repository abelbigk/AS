import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTheme } from "@/context/ThemeContext";
import AddScreen from "@/screens/AddScreen";
import DoneScreen from "@/screens/DoneScreen";
import HomeScreen from "@/screens/HomeScreen";
import QueuedScreen from "@/screens/QueuedScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import type { TabParamList } from "./types";

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.surfaceBorder,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
            Home: "home",
            Queued: "time",
            Done: "checkmark-circle",
            Add: "add-circle",
            Settings: "settings",
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Queued" component={QueuedScreen} />
      <Tab.Screen name="Done" component={DoneScreen} />
      <Tab.Screen name="Add" component={AddScreen} options={{ title: "New" }} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
