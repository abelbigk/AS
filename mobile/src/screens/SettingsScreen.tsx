import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ContentCard from "@/components/ContentCard";
import EmptyState from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { trpc } from "@/lib/trpc";
import { formatTimeRemaining, getAuthToken } from "@/lib/auth-storage";
import type { TabProps } from "@/navigation/types";
import type { ContentItem } from "@/types";

export default function SettingsScreen({ navigation }: TabProps<"Settings">) {
  const { theme, mode, setMode } = useTheme();
  const { user, logout } = useAuth();
  const [sessionTime, setSessionTime] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const uncategorizedQuery = trpc.content.listUncategorized.useQuery();
  const categoriesQuery = trpc.categories.list.useQuery();
  const subsQuery = trpc.subcategories.listAll.useQuery();
  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      Alert.alert("Success", "Password changed.");
      setShowPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  useEffect(() => {
    const update = async () => {
      const token = await getAuthToken();
      setSessionTime(token ? formatTimeRemaining(token) : null);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  const submitPassword = () => {
    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };

  const renderUncategorized = ({ item }: { item: ContentItem }) => (
    <ContentCard
      item={item}
      categories={categoriesQuery.data}
      subcategories={subsQuery.data}
      onPress={() => navigation.navigate("ContentDetail", { item })}
    />
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={["top"]}>
      <FlatList
        style={styles.flex}
        data={uncategorizedQuery.data ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderUncategorized}
        contentContainerStyle={styles.listPad}
        ListHeaderComponent={
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
            {user ? (
              <Text style={{ color: theme.textMuted, marginBottom: 16 }}>
                Signed in as {user.username}
                {sessionTime ? ` · session ${sessionTime}` : ""}
              </Text>
            ) : null}

            <Text style={[styles.section, { color: theme.textMuted }]}>Theme</Text>
            <View style={styles.themeRow}>
              {(["dark", "light"] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setMode(value)}
                  style={[
                    styles.themeBtn,
                    {
                      backgroundColor: mode === value ? theme.primary : theme.surface,
                      borderColor: theme.surfaceBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name={value === "dark" ? "moon" : "sunny"}
                    size={16}
                    color={mode === value ? "#fff" : theme.text}
                  />
                  <Text style={{ color: mode === value ? "#fff" : theme.text, fontWeight: "600" }}>
                    {value === "dark" ? "Dark" : "Light"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              style={[styles.rowBtn, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
            >
              <Ionicons name="lock-closed-outline" size={18} color={theme.text} />
              <Text style={{ color: theme.text, fontWeight: "600", flex: 1, marginLeft: 10 }}>
                Change password
              </Text>
            </Pressable>

            {showPassword ? (
              <View style={[styles.passwordBox, { borderColor: theme.surfaceBorder, backgroundColor: theme.surface }]}>
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  placeholder="Current password"
                  placeholderTextColor={theme.textMuted}
                  style={[styles.input, { color: theme.text, borderColor: theme.surfaceBorder }]}
                />
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder="New password"
                  placeholderTextColor={theme.textMuted}
                  style={[styles.input, { color: theme.text, borderColor: theme.surfaceBorder }]}
                />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  placeholder="Confirm password"
                  placeholderTextColor={theme.textMuted}
                  style={[styles.input, { color: theme.text, borderColor: theme.surfaceBorder }]}
                />
                <Pressable
                  onPress={submitPassword}
                  style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Save password</Text>
                </Pressable>
              </View>
            ) : null}

            <Pressable
              onPress={() =>
                Alert.alert("Sign out?", undefined, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Sign out", style: "destructive", onPress: logout },
                ])
              }
              style={[styles.rowBtn, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
            >
              <Ionicons name="log-out-outline" size={18} color={theme.danger} />
              <Text style={{ color: theme.danger, fontWeight: "600", flex: 1, marginLeft: 10 }}>
                Sign out
              </Text>
            </Pressable>

            <Text style={[styles.section, { color: theme.textMuted, marginTop: 24 }]}>
              Uncategorized ({uncategorizedQuery.data?.length ?? 0})
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="All content organized!" subtitle="Nothing uncategorized right now." />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listPad: { paddingHorizontal: 16, paddingBottom: 100 },
  title: { fontSize: 34, fontWeight: "800", marginTop: 8 },
  section: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 10 },
  themeRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  themeBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
    flexDirection: "row",
    justifyContent: "center",
  },
  rowBtn: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  passwordBox: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 15,
  },
  saveBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center" },
});
