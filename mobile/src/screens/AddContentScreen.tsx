import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { trpc } from "@/lib/trpc";
import { uploadImageUri } from "@/lib/upload";
import type { RootStackProps } from "@/navigation/types";

export default function AddContentScreen({ navigation, route }: RootStackProps<"AddContent">) {
  const { categoryId, subcategoryId } = route.params;
  const { theme } = useTheme();
  const utils = trpc.useUtils();

  const [heading, setHeading] = useState("");
  const [description, setDescription] = useState("");
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(
    categoryId ? [categoryId] : []
  );
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<number[]>(
    subcategoryId ? [subcategoryId] : []
  );
  const [saving, setSaving] = useState(false);

  const categoriesQuery = trpc.categories.list.useQuery();
  const subsQuery = trpc.subcategories.listAll.useQuery();
  const createContent = trpc.content.create.useMutation();

  const availableSubs = useMemo(
    () =>
      (subsQuery.data ?? []).filter((s) => selectedCategoryIds.includes(s.categoryId)),
    [subsQuery.data, selectedCategoryIds]
  );

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSubcategory = (id: number) => {
    const sub = subsQuery.data?.find((s) => s.id === id);
    setSelectedSubcategoryIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (sub && !prev.includes(id)) {
        setSelectedCategoryIds((cats) => cats.filter((c) => c !== sub.categoryId));
      }
      return next;
    });
  };

  const pickPoster = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setPosterUri(result.assets[0].uri);
    }
  };

  const submit = async () => {
    if (!heading.trim()) {
      Alert.alert("Missing heading", "Enter a title for this content.");
      return;
    }
    setSaving(true);
    try {
      let posterImageUrl: string | undefined;
      let posterImageKey: string | undefined;
      if (posterUri) {
        const uploaded = await uploadImageUri(posterUri, "content");
        if (!uploaded) throw new Error("Poster upload failed");
        posterImageUrl = uploaded.url;
        posterImageKey = uploaded.key;
      }
      await createContent.mutateAsync({
        heading: heading.trim(),
        description: description.trim() || undefined,
        posterImageUrl,
        posterImageKey,
        categoryIds: selectedCategoryIds,
        subcategoryIds: selectedSubcategoryIds,
      });
      await utils.content.invalidate();
      navigation.goBack();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to create content");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: theme.textMuted }}>Cancel</Text>
        </Pressable>
        <Text style={{ color: theme.text, fontWeight: "700", fontSize: 17 }}>Add Content</Text>
        <Pressable onPress={submit} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <Text style={{ color: theme.primary, fontWeight: "700" }}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: theme.textMuted }]}>Heading</Text>
        <TextInput
          value={heading}
          onChangeText={setHeading}
          style={[styles.input, { color: theme.text, borderColor: theme.surfaceBorder, backgroundColor: theme.surface }]}
          placeholder="Title"
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
          placeholder="Optional details"
          placeholderTextColor={theme.textMuted}
        />

        <Pressable
          onPress={pickPoster}
          style={[styles.posterBtn, { borderColor: theme.surfaceBorder, backgroundColor: theme.surface }]}
        >
          {posterUri ? (
            <Image source={{ uri: posterUri }} style={styles.poster} contentFit="cover" />
          ) : (
            <Text style={{ color: theme.textMuted }}>Add poster image</Text>
          )}
        </Pressable>

        <Text style={[styles.label, { color: theme.textMuted }]}>Categories</Text>
        <View style={styles.chips}>
          {(categoriesQuery.data ?? []).map((cat) => {
            const active = selectedCategoryIds.includes(cat.id);
            return (
              <Pressable
                key={cat.id}
                onPress={() => toggleCategory(cat.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primary : theme.surface,
                    borderColor: theme.surfaceBorder,
                  },
                ]}
              >
                <Text style={{ color: active ? "#fff" : theme.text }}>{cat.name}</Text>
              </Pressable>
            );
          })}
        </View>

        {availableSubs.length > 0 ? (
          <>
            <Text style={[styles.label, { color: theme.textMuted }]}>Subcategories</Text>
            <View style={styles.chips}>
              {availableSubs.map((sub) => {
                const active = selectedSubcategoryIds.includes(sub.id);
                return (
                  <Pressable
                    key={sub.id}
                    onPress={() => toggleSubcategory(sub.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? theme.primary : theme.surface,
                        borderColor: theme.surfaceBorder,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? "#fff" : theme.text }}>{sub.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pad: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 8, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  posterBtn: {
    borderWidth: 1,
    borderRadius: 14,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginVertical: 8,
  },
  poster: { width: "100%", height: "100%" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
});
