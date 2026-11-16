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
  navigation: any;
}

export function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const { colors, theme } = useTheme();

  return (
    <View style={styles.outerContainer} pointerEvents="box-none">
      <View
        style={[
          styles.pillContainer,
          {
            backgroundColor: colors.pillBg,
            borderColor: colors.glassBorder,
          },
          theme === "light" ? styles.lightShadow : styles.darkShadow,
        ]}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name] || { label: route.name, icon: Home };
          const IconComponent = config.icon;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[
                styles.tabButton,
                isFocused && {
                  backgroundColor: colors.text,
                },
              ]}
            >
              <IconComponent
                size={20}
                color={isFocused ? colors.bg : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? colors.bg : colors.textMuted,
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
    justifyContent: "space-around",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 28,
    borderWidth: 1,
    width: "92%",
    maxWidth: 440,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  tabLabel: {
    fontSize: 12,
  },
  darkShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  lightShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
});
