import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sun, Moon, LogOut, User as UserIcon, Shield } from "lucide-react-native";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { SETTINGS_DARK_IMAGE, SETTINGS_LIGHT_IMAGE } from "../../src/lib/constants";
import { GlassCard } from "../../src/components/GlassCard";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, colors, setTheme } = useTheme();
  const { user, logout } = useAuth();

  const bgImage = theme === "dark" ? SETTINGS_DARK_IMAGE : SETTINGS_LIGHT_IMAGE;

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: bgImage }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={300}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor:
              theme === "dark"
                ? "rgba(10, 10, 10, 0.82)"
                : "rgba(248, 250, 252, 0.82)",
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.maxWidthWrapper}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

          {/* User Profile Card */}
          <GlassCard style={styles.card}>
            <View style={styles.userRow}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: colors.surfaceHover },
                ]}
              >
                <UserIcon size={24} color={colors.text} />
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.username, { color: colors.text }]}>
                  {user?.username || "Guest User"}
                </Text>
                <View style={styles.roleRow}>
                  <Shield size={12} color={colors.accent} />
                  <Text style={[styles.roleText, { color: colors.accent }]}>
                    {user?.role || "Member"}
                  </Text>
                </View>
              </View>
            </View>
          </GlassCard>

          {/* Theme Preference */}
          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
            APPEARANCE
          </Text>
          <GlassCard style={styles.card}>
            <View style={styles.themeOptions}>
              <Pressable
                onPress={() => setTheme("dark")}
                style={[
                  styles.themeOptionBtn,
                  theme === "dark" && {
                    backgroundColor: colors.surfaceHover,
                    borderColor: colors.accent,
                  },
                ]}
              >
                <Moon
                  size={20}
                  color={theme === "dark" ? colors.accent : colors.textMuted}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    {
                      color:
                        theme === "dark" ? colors.accent : colors.textMuted,
                      fontWeight: theme === "dark" ? "700" : "500",
                    },
                  ]}
                >
                  Dark Mode
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setTheme("light")}
                style={[
                  styles.themeOptionBtn,
                  theme === "light" && {
                    backgroundColor: colors.surfaceHover,
                    borderColor: colors.accent,
                  },
                ]}
              >
                <Sun
                  size={20}
                  color={theme === "light" ? colors.accent : colors.textMuted}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    {
                      color:
                        theme === "light" ? colors.accent : colors.textMuted,
                      fontWeight: theme === "light" ? "700" : "500",
                    },
                  ]}
                >
                  Light Mode
                </Text>
              </Pressable>
            </View>
          </GlassCard>

          {/* Logout Action */}
          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
            ACCOUNT
          </Text>
          <GlassCard style={styles.card}>
            <Pressable
              onPress={logout}
              style={({ pressed }) => [
                styles.logoutBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <LogOut size={20} color={colors.danger} style={{ marginRight: 10 }} />
              <Text style={[styles.logoutText, { color: colors.danger }]}>
                Log Out
              </Text>
            </Pressable>
          </GlassCard>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  maxWidthWrapper: {
    width: "100%",
    maxWidth: 640,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    padding: 16,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: "700",
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  themeOptions: {
    flexDirection: "row",
    gap: 12,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  themeOptionText: {
    fontSize: 14,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
