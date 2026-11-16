import React, { useState } from "react";
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
import { FolderPlus, Info } from "lucide-react-native";
import { useRouter } from "expo-router";
import { trpc } from "../../src/lib/trpc";
import { useTheme } from "../../src/contexts/ThemeContext";

const ADD_DARK_IMAGE =
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1600&q=80";
const ADD_LIGHT_IMAGE =
  "https://images.unsplash.com/photo-1512314889357-e157c22f938d?w=1600&q=80";

export default function AddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, colors } = useTheme();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const utils = trpc.useUtils();

  const createCategory = trpc.categories.create.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      Alert.alert("Success", "Category created!");
      setName("");
      setDescription("");
      router.push("/");
    },
    onError: (err) => {
      Alert.alert("Error", err.message || "Failed to create category.");
    },
  });

  const bgImage = theme === "dark" ? ADD_DARK_IMAGE : ADD_LIGHT_IMAGE;

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Please enter a category name.");
      return;
    }
    createCategory.mutate({ name: name.trim(), description: description.trim() });
  };

  const overlayColor =
    theme === "dark" ? "rgba(10,10,10,0.55)" : "rgba(255,255,255,0.65)";

  const glassCard = {
    backgroundColor: colors.glassBg,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
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
  } as const;

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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrapper}>
          {/* Header */}
          <View style={styles.headerRow}>
            <FolderPlus size={36} color="#3B82F6" />
            <Text style={[styles.title, { color: colors.text }]}>
              New Category
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Create a beautiful space to organize your collections
          </Text>

          {/* Blue info banner */}
          <View style={styles.infoBanner}>
            <Info size={18} color="#3B82F6" style={{ marginTop: 2 }} />
            <View style={styles.infoBannerContent}>
              <Text style={styles.infoBannerTitle}>
                Tip: Adding items &amp; subcategories
              </Text>
              <Text style={styles.infoBannerText}>
                To add subcategories or content, open the category page you
                created and add them directly. This automatically links them to
                the correct category!
              </Text>
            </View>
          </View>

          {/* Form card */}
          <View style={glassCard}>
            <Text style={[styles.label, { color: colors.text }]}>
              Category Name
            </Text>
            <TextInput
              style={[inputStyle, { marginBottom: 16 }]}
              value={name}
              onChangeText={setName}
              placeholder="Enter category name..."
              placeholderTextColor={colors.textSubtle}
              autoCapitalize="words"
            />

            <Text style={[styles.label, { color: colors.text }]}>
              Description (optional)
            </Text>
            <TextInput
              style={[inputStyle, { height: 100, textAlignVertical: "top" }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your category..."
              placeholderTextColor={colors.textSubtle}
              multiline
              numberOfLines={4}
            />

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                { opacity: pressed || createCategory.isPending ? 0.75 : 1 },
              ]}
              onPress={handleSubmit}
              disabled={createCategory.isPending}
            >
              <Text style={styles.submitButtonText}>
                {createCategory.isPending ? "Creating..." : "Create Category"}
              </Text>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(59,130,246,0.1)",
    borderColor: "rgba(59,130,246,0.2)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    color: "#3B82F6",
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 4,
  },
  infoBannerText: {
    color: "#93C5FD",
    fontSize: 13,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  submitButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonText: {
    color: "#000000",
    fontWeight: "700",
    fontSize: 15,
  },
});
