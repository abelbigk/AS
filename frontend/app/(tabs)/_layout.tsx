import React from "react";
import { Tabs } from "expo-router";
import { CustomTabBar } from "../../src/components/CustomTabBar";
import { useTheme } from "../../src/contexts/ThemeContext";

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="queued" options={{ title: "Queued" }} />
      <Tabs.Screen name="done" options={{ title: "Done" }} />
      <Tabs.Screen name="add" options={{ title: "New" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
