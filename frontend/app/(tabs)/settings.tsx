import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sun, Moon, LogOut, User as UserIcon, Shield } from "lucide-react-native";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { SETTINGS_DARK_IMAGE, SETTINGS_LIGHT_IMAGE } from "../../src/lib/constants";

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
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.backdropOverlay,
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 32 : 16),
            paddingBottom: 110,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.maxWidthWrapper}>
          <Text style={styles.pageTitle}>Settings</Text>

          {/* User Profile Card */}
          <View style={styles.glassCard}>
            <View style={styles.userRow}>
              <View style={styles.avatar}>
                <UserIcon size={24} color="#FFFFFF" />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.username}>
                  {user?.username || "Guest User"}
                </Text>
                <View style={styles.roleRow}>
                  <Shield size={12} color="rgba(255, 255, 255, 0.7)" />
                  <Text style={styles.roleText}>
                    {user?.role || "Member"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Theme Preference */}
          <Text style={styles.sectionHeading}>APPEARANCE</Text>
          <View style={styles.glassCard}>
            <View style={styles.themeOptions}>
              <Pressable
                onPress={() => setTheme("dark")}
                style={[
                  styles.themeOptionBtn,
                  theme === "dark" && styles.activeThemeBtn,
                ]}
              >
                <Moon
                  size={18}
                  color={theme === "dark" ? "#000000" : "rgba(255, 255, 255, 0.6)"}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    theme === "dark" && styles.activeThemeText,
                  ]}
                >
                  Dark Mode
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setTheme("light")}
                style={[
                  styles.themeOptionBtn,
                  theme === "light" && styles.activeThemeBtn,
                ]}
              >
                <Sun
                  size={18}
                  color={theme === "light" ? "#000000" : "rgba(255, 255, 255, 0.6)"}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    theme === "light" && styles.activeThemeText,
                  ]}
                >
                  Light Mode
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Logout Action */}
          <Text style={styles.sectionHeading}>ACCOUNT</Text>
          <View style={styles.glassCard}>
            <Pressable
              onPress={logout}
              style={({ pressed }) => [
                styles.logoutBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <LogOut size={18} color="#EF4444" style={{ marginRight: 10 }} />
              <Text style={styles.logoutText}>Log Out</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  backdropOverlay: {
    backgroundColor: "rgba(10, 10, 10, 0.65)",
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px)",
      } as any,
    }),
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  maxWidthWrapper: {
    width: "100%",
    maxWidth: 672,
  },
  pageTitle: {
    fontSize: 40,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
    color: "rgba(255, 255, 255, 0.45)",
  },
  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      web: {
        backdropFilter: "blur(16px)",
      } as any,
    }),
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginRight: 14,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
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
    color: "rgba(255, 255, 255, 0.65)",
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
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  activeThemeBtn: {
    backgroundColor: "#FFFFFF",
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.6)",
  },
  activeThemeText: {
    color: "#000000",
    fontWeight: "700",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#EF4444",
  },
});
