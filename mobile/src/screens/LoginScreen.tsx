import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import ScreenContainer from "@/components/ScreenContainer";

export default function LoginScreen() {
  const { theme } = useTheme();
  const { login, register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Enter username and password.");
      return;
    }
    setLoading(true);
    try {
      if (isRegistering) {
        await register(username.trim(), password);
        Alert.alert("Account created", "You can sign in now.");
        setIsRegistering(false);
        setPassword("");
      } else {
        await login(username.trim(), password);
      }
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll padded>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>AS</Text>
        <Text style={[styles.sub, { color: theme.textMuted }]}>
          Organize saved content into categories
        </Text>
      </View>

      <View style={[styles.form, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
        <Text style={[styles.label, { color: theme.textMuted }]}>Username</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          style={[styles.input, { color: theme.text, borderColor: theme.surfaceBorder }]}
          placeholder="username"
          placeholderTextColor={theme.textMuted}
        />

        <Text style={[styles.label, { color: theme.textMuted }]}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={[styles.input, { color: theme.text, borderColor: theme.surfaceBorder }]}
          placeholder="password"
          placeholderTextColor={theme.textMuted}
        />

        <Pressable
          onPress={submit}
          disabled={loading}
          style={[styles.primaryBtn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>{isRegistering ? "Create account" : "Sign in"}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => setIsRegistering((v) => !v)} style={styles.switchBtn}>
          <Text style={{ color: theme.primary }}>
            {isRegistering ? "Already have an account? Sign in" : "Need an account? Register"}
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 40, marginBottom: 28 },
  title: { fontSize: 42, fontWeight: "800" },
  sub: { fontSize: 15, marginTop: 8 },
  form: { borderRadius: 20, borderWidth: 1, padding: 20 },
  label: { fontSize: 12, fontWeight: "700", marginBottom: 6, textTransform: "uppercase" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  switchBtn: { alignItems: "center", marginTop: 16 },
});
