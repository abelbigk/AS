import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Lock, User, LogIn } from "lucide-react-native";
import { trpc } from "../src/lib/trpc";
import { useAuth } from "../src/contexts/AuthContext";
import { useTheme } from "../src/contexts/ThemeContext";
import { DARK_IMAGE } from "../src/lib/constants";
import { GlassCard } from "../src/components/GlassCard";

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const { colors } = useTheme();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      await setAuth(data.token, data.user as any);
      router.replace("/");
    },
    onError: (err) => {
      Alert.alert("Login Failed", err.message || "Invalid credentials");
    },
  });

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Validation", "Please enter both username and password");
      return;
    }

    loginMutation.mutate({
      username: username.trim(),
      password: password.trim(),
    });
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: DARK_IMAGE }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(10, 10, 10, 0.85)" },
        ]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Text style={styles.appTitle}>AS</Text>
            <Text style={styles.appSubtitle}>Content Organizer</Text>
          </View>

          <GlassCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Sign In</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>
                Username
              </Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: colors.surfaceHover,
                    borderColor: colors.border,
                  },
                ]}
              >
                <User size={18} color={colors.textSubtle} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter your username"
                  placeholderTextColor={colors.textSubtle}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>
                Password
              </Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: colors.surfaceHover,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Lock size={18} color={colors.textSubtle} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textSubtle}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={loginMutation.isPending}
              style={[
                styles.loginBtn,
                { backgroundColor: colors.accent },
                loginMutation.isPending && { opacity: 0.6 },
              ]}
            >
              {loginMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <View style={styles.btnRow}>
                  <LogIn size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.loginBtnText}>Log In</Text>
                </View>
              )}
            </Pressable>
          </GlassCard>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  content: {
    width: "100%",
    maxWidth: 400,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  appTitle: {
    fontSize: 48,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  appSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 4,
  },
  card: {
    padding: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  loginBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
