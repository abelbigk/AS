import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Home, Clock, CheckCircle2, Plus, Settings } from "lucide-react-native";
import { useTheme } from "../contexts/ThemeContext";

const TAB_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ size: number; color: string }> }> = {
  index: { label: "Home", icon: Home },
  queued: { label: "Queued", icon: Clock },
  done: { label: "Done", icon: CheckCircle2 },
  add: { label: "New", icon: Plus },
  settings: { label: "Settings", icon: Settings },
};

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation?: any;
  emitter?: any;
  navigateToTab?: any;
  insets?: any;
}

export function CustomTabBar({
  state,
  descriptors,
  navigation,
  emitter,
  navigateToTab,
}: CustomTabBarProps) {
  const { colors, theme } = useTheme();

  return (
    <View style={styles.outerContainer} pointerEvents="box-none">
      <View
        style={[
          styles.pillContainer,
          {
            backgroundColor:
              theme === "dark"
                ? "rgba(18, 18, 18, 0.78)"
                : "rgba(255, 255, 255, 0.82)",
            borderColor:
              theme === "dark"
                ? "rgba(255, 255, 255, 0.12)"
                : "rgba(0, 0, 0, 0.08)",
          },
          styles.shadow,
        ]}
      >
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name] || { label: route.name, icon: Home };
          const IconComponent = config.icon;

          const onPress = () => {
            if (navigation) {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            } else if (navigateToTab) {
              if (emitter) {
                emitter.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
              }
              navigateToTab(route.key);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[
                styles.tabButton,
                isFocused && {
                  backgroundColor: theme === "dark" ? "#FFFFFF" : "#0F172A",
                },
              ]}
            >
              <IconComponent
                size={20}
                color={
                  isFocused
                    ? theme === "dark"
                      ? "#000000"
                      : "#FFFFFF"
                    : theme === "dark"
                    ? "rgba(255, 255, 255, 0.55)"
                    : "rgba(15, 23, 42, 0.55)"
                }
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused
                      ? theme === "dark"
                        ? "#000000"
                        : "#FFFFFF"
                      : theme === "dark"
                      ? "rgba(255, 255, 255, 0.55)"
                      : "rgba(15, 23, 42, 0.55)",
                    fontWeight: isFocused ? "700" : "500",
                  },
                ]}
              >
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 24 : 16,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  pillContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    width: "92%",
    maxWidth: 672, // matching max-w-2xl
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
      } as any,
    }),
  },
  tabButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 14,
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
});
