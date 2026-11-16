import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  User,
  Shield,
  Moon,
  Sun,
  Lock,
  ChevronRight,
  LogOut,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpc } from "../../src/lib/trpc";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { SETTINGS_DARK_IMAGE, SETTINGS_LIGHT_IMAGE } from "../../src/lib/constants";

// ---------------------------------------------------------------------------
// JWT decode helper (no external lib needed — just base64)
// ---------------------------------------------------------------------------
function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // base64url → base64
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(b64));
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

function formatTimeRemaining(exp: number): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const diff = exp - nowSec;
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

// ---------------------------------------------------------------------------
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, setTheme, colors } = useTheme();
  const { user, logout } = useAuth();

  const [sessionLabel, setSessionLabel] = useState<string>("");
  const [pwExpanded, setPwExpanded] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // Load token and compute session time
  useEffect(() => {
    AsyncStorage.getItem("auth_token").then((token) => {
      if (!token) return;
      const exp = decodeJwtExp(token);
      if (exp !== null) setSessionLabel(formatTimeRemaining(exp));
    });
  }, []);

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      Alert.alert("Success", "Password changed successfully!");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwExpanded(false);
    },
    onError: (err) => {
      Alert.alert("Error", err.message || "Failed to change password.");
    },
  });

  const handleChangePassword = () => {
    if (!currentPw || !newPw || !confirmPw) {
      Alert.alert("Validation", "Please fill in all password fields.");
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert("Validation", "New passwords do not match.");
      return;
    }
    if (newPw.length < 6) {
      Alert.alert("Validation", "New password must be at least 6 characters.");
      return;
    }
    changePassword.mutate({ currentPassword: currentPw, newPassword: newPw });
  };

  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const bgImage =
    theme === "dark" ? SETTINGS_DARK_IMAGE : SETTINGS_LIGHT_IMAGE;
  const overlayColor =
    theme === "dark" ? "rgba(10,10,10,0.55)" : "rgba(255,255,255,0.65)";

  const glassCard = {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  } as const;

  const inputStyle = {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 10,
  } as const;

  const sectionHeader = {
    fontSize: 12,
    fontWeight: "600" as const,
    letterSpacing: 1.2,
    color: colors.textSubtle,
    textTransform: "uppercase" as const,
    marginBottom: 10,
    marginTop: 8,
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <Image
        source={{ uri: bgImage }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: overlayColor,
            ...(Platform.OS === "web"
              ? ({ backdropFilter: "blur(20px)" } as object)
              : {}),
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.wrapper}>
          {/* Page title */}
          <Text style={[styles.pageTitle, { color: colors.text }]}>
            Settings
          </Text>

          {/* ---- User Card ---- */}
          <View style={glassCard}>
            <View style={styles.userRow}>
              {/* Avatar */}
              <View style={styles.avatar}>
                <User size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.username, { color: colors.text }]}>
                  {user?.username ?? "User"}
                </Text>
                {user?.role && (
                  <View style={styles.roleBadge}>
                    <Shield size={12} color="#93C5FD" />
                    <Text style={styles.roleText}>{user.role}</Text>
                  </View>
                )}
              </View>
            </View>
            {sessionLabel ? (
              <Text style={[styles.sessionText, { color: colors.textMuted }]}>
                Session: {sessionLabel}
              </Text>
            ) : null}
          </View>

          {/* ---- APPEARANCE ---- */}
          <Text style={sectionHeader}>Appearance</Text>
          <View style={glassCard}>
            <View style={styles.themeRow}>
              <Pressable
                style={[
                  styles.themeBtn,
                  theme === "dark" && styles.themeBtnActive,
                ]}
                onPress={() => setTheme("dark")}
              >
                <Moon
                  size={16}
                  color={theme === "dark" ? "#000000" : colors.textMuted}
                />
                <Text
                  style={[
                    styles.themeBtnText,
                    { color: theme === "dark" ? "#000000" : colors.textMuted },
                  ]}
                >
                  Dark Mode
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.themeBtn,
                  theme === "light" && styles.themeBtnActive,
                ]}
                onPress={() => setTheme("light")}
              >
                <Sun
                  size={16}
                  color={theme === "light" ? "#000000" : colors.textMuted}
                />
                <Text
                  style={[
                    styles.themeBtnText,
                    { color: theme === "light" ? "#000000" : colors.textMuted },
                  ]}
                >
                  Light Mode
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ---- ACCOUNT ---- */}
          <Text style={sectionHeader}>Account</Text>
          <View style={glassCard}>
            {/* Change Password row */}
            <Pressable
              style={styles.settingsRow}
              onPress={() => setPwExpanded((v) => !v)}
            >
              <Lock size={18} color={colors.text} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                Change Password
              </Text>
              <ChevronRight
                size={18}
                color={colors.textMuted}
                style={{
                  transform: [{ rotate: pwExpanded ? "90deg" : "0deg" }],
                }}
              />
            </Pressable>

            {/* Inline change-password form */}
            {pwExpanded && (
              <View style={{ marginTop: 16 }}>
                <TextInput
                  style={inputStyle}
                  value={currentPw}
                  onChangeText={setCurrentPw}
                  placeholder="Current password"
                  placeholderTextColor={colors.textSubtle}
                  secureTextEntry
                />
                <TextInput
                  style={inputStyle}
                  value={newPw}
                  onChangeText={setNewPw}
                  placeholder="New password"
                  placeholderTextColor={colors.textSubtle}
                  secureTextEntry
                />
                <TextInput
                  style={inputStyle}
                  value={confirmPw}
                  onChangeText={setConfirmPw}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textSubtle}
                  secureTextEntry
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.submitButton,
                    { opacity: pressed || changePassword.isPending ? 0.75 : 1 },
                  ]}
                  onPress={handleChangePassword}
                  disabled={changePassword.isPending}
                >
                  <Text style={styles.submitButtonText}>
                    {changePassword.isPending
                      ? "Changing..."
                      : "Change Password"}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Divider */}
            <View
              style={[
                styles.divider,
                { backgroundColor: colors.border, marginVertical: 16 },
              ]}
            />

            {/* Logout row */}
            <Pressable style={styles.settingsRow} onPress={handleLogout}>
              <LogOut size={18} color="#EF4444" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: "#EF4444" }]}>
                  Log Out
                </Text>
                <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                  Sign out of your account
                </Text>
              </View>
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
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  wrapper: {
    maxWidth: 672,
    width: "100%",
    alignSelf: "center",
  },
  pageTitle: {
    fontSize: 40,
    fontWeight: "700",
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  username: {
    fontSize: 17,
    fontWeight: "600",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  roleText: {
    fontSize: 12,
    color: "#93C5FD",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  sessionText: {
    fontSize: 13,
    marginTop: 2,
  },
  themeRow: {
    flexDirection: "row",
    gap: 10,
  },
  themeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "transparent",
  },
  themeBtnActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  themeBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    width: "100%",
  },
  submitButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  submitButtonText: {
    color: "#000000",
    fontWeight: "700",
    fontSize: 15,
  },
});
