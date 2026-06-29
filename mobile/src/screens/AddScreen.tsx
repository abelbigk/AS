import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import ScreenContainer from "@/components/ScreenContainer";
import { useTheme } from "@/context/ThemeContext";
import { trpc } from "@/lib/trpc";
import { uploadImageUri } from "@/lib/upload";

export default function AddScreen() {
  const { theme } = useTheme();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const createCategory = trpc.categories.create.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      setName("");
      setDescription("");
      setCoverUri(null);
      Alert.alert("Created", "Category created successfully.");
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert("Missing name", "Enter a category name.");
      return;
    }
    setSaving(true);
    try {
      let coverImageUrl: string | undefined;
      let coverImageKey: string | undefined;
      if (coverUri) {
        const uploaded = await uploadImageUri(coverUri, "content");
        if (!uploaded) throw new Error("Cover upload failed");
        coverImageUrl = uploaded.url;
        coverImageKey = uploaded.key;
      }
      await createCategory.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        coverImageUrl,
        coverImageKey,
      });
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to create category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: theme.text }]}>New Category</Text>
      <Text style={{ color: theme.textMuted, marginBottom: 20 }}>
        Create a space to organize your collections.
      </Text>

      <View style={[styles.tip, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
        <Text style={{ color: theme.text, fontWeight: "700", marginBottom: 4 }}>Tip</Text>
        <Text style={{ color: theme.textMuted, lineHeight: 20 }}>
          Open a category to add subcategories and content there.
        </Text>
      </View>

      <Text style={[styles.label, { color: theme.textMuted }]}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={[styles.input, { color: theme.text, borderColor: theme.surfaceBorder, backgroundColor: theme.surface }]}
        placeholder="Category name"
        placeholderTextColor={theme.textMuted}
      />

      <Text style={[styles.label, { color: theme.textMuted }]}>Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        multiline
        style={[
          styles.input,
          styles.textArea,
          { color: theme.text, borderColor: theme.surfaceBorder, backgroundColor: theme.surface },
        ]}
        placeholder="Optional description"
        placeholderTextColor={theme.textMuted}
      />

      <Pressable
        onPress={pickCover}
        style={[styles.coverBtn, { borderColor: theme.surfaceBorder, backgroundColor: theme.surface }]}
      >
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.coverPreview} contentFit="cover" />
        ) : (
          <Text style={{ color: theme.textMuted }}>Add cover photo (optional)</Text>
        )}
      </Pressable>

      <Pressable
        onPress={submit}
        disabled={saving}
        style={[styles.primaryBtn, { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }]}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>Create category</Text>
        )}
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 34, fontWeight: "800", marginTop: 8 },
  tip: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  coverBtn: {
    borderWidth: 1,
    borderRadius: 14,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 20,
  },
  coverPreview: { width: "100%", height: "100%" },
  primaryBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
