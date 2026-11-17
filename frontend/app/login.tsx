import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Lock, User } from "lucide-react-native";
import { trpc } from "../src/lib/trpc";
import { useAuth } from "../src/contexts/AuthContext";
import { DARK_IMAGE } from "../src/lib/constants";
import { AppDialogRenderer, useAppDialog } from "../src/components/AppDialog";

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const { dialogState, hide, showAlert } = useAppDialog();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      await setAuth(data.token, data.user as any);
      router.replace("/");
    },
    onError: (err) => {
      showAlert("Login Failed", err.message || "Invalid credentials");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      showAlert("Success", "Account created! Please sign in.");
      setIsRegistering(false);
      setPassword("");
    },
    onError: (err) => {
      showAlert("Registration Failed", err.message || "Could not register");
    },
  });

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  const handleSubmit = () => {
    if (!username.trim() || !password.trim()) {
      showAlert("Validation", "Please fill in all fields");
      return;
    }

    if (isRegistering) {
      registerMutation.mutate({
        username: username.trim(),
        password,
        name: username.trim(),
      });
    } else {
      loginMutation.mutate({
        username: username.trim(),
        password,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Image with blur overlay */}
      <Image
        source={{ uri: DARK_IMAGE }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.backdropOverlay,
        ]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <View style={styles.content}>
          {/* Header matching original web app */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {isRegistering ? "Create Account" : "Welcome"}
            </Text>
            <Text style={styles.subtitle}>
              {isRegistering ? "Register to get started" : "Sign in to continue"}
            </Text>
          </View>

          {/* Frosted Glass Form Card */}
          <View style={styles.glassCard}>
            {/* Username Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputWrapper}>
                <User size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter username"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>
              {isRegistering && (
                <Text style={styles.hintText}>Minimum 6 characters</Text>
              )}
            </View>

            {/* White Action Button */}
            <Pressable
              onPress={handleSubmit}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && { opacity: 0.9 },
                isLoading && { opacity: 0.6 },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isRegistering ? "Create Account" : "Sign In"}
                </Text>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Toggle Register/Login */}
            <Pressable
              onPress={() => {
                setIsRegistering(!isRegistering);
                setPassword("");
              }}
              disabled={isLoading}
              style={styles.toggleButton}
            >
              <Text style={styles.toggleText}>
                {isRegistering
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Register"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      <AppDialogRenderer {...dialogState} onHide={hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  backdropOverlay: {
    backgroundColor: "rgba(10, 10, 10, 0.55)",
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px)",
      } as any,
    }),
  },
  keyboardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  content: {
    width: "100%",
    maxWidth: 420,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 42,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 32,
    ...Platform.select({
      web: {
        backdropFilter: "blur(16px)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
      } as any,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 8,
      },
    }),
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#FFFFFF",
    height: "100%",
  },
  hintText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.45)",
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: "#FFFFFF",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    ...Platform.select({
      web: {
        cursor: "pointer",
        transition: "all 0.2s ease",
      } as any,
    }),
  },
  submitButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
  },
  toggleButton: {
    alignItems: "center",
    paddingVertical: 4,
  },
  toggleText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "500",
  },
});
