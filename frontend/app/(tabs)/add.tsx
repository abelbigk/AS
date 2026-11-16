import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Plus, ImagePlus, Check } from "lucide-react-native";
import { trpc } from "../../src/lib/trpc";
import { useTheme } from "../../src/contexts/ThemeContext";
import { DARK_IMAGE, LIGHT_IMAGE } from "../../src/lib/constants";
import { GlassCard } from "../../src/components/GlassCard";
import { uploadFile } from "../../src/lib/upload";

export default function AddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, colors } = useTheme();
  const utils = trpc.useUtils();

  const [mode, setMode] = useState<"content" | "category">("content");

  // Content form state
  const [heading, setHeading] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Category form state
  const [categoryName, setCategoryName] = useState("");
  const [categoryDesc, setCategoryDesc] = useState("");

  const { data: categories = [] } = trpc.categories.list.useQuery();

  const createContent = trpc.content.create.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate();
      utils.content.listUncategorized.invalidate();
      Alert.alert("Success", "Content created successfully!");
      setHeading("");
      setDescription("");
      setSelectedCategoryIds([]);
      setMediaUri(null);
      router.push("/");
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  const createCategory = trpc.categories.create.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      Alert.alert("Success", "Category created successfully!");
      setCategoryName("");
      setCategoryDesc("");
      router.push("/");
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
    }
  };

  const toggleCategory = (id: number) => {
    if (selectedCategoryIds.includes(id)) {
      setSelectedCategoryIds(selectedCategoryIds.filter((cid) => cid !== id));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, id]);
    }
  };

  const handleSubmitContent = async () => {
    if (!heading.trim()) {
      Alert.alert("Validation", "Please enter a title/heading");
      return;
    }

    setIsUploading(true);
    let posterUrl: string | undefined = undefined;
    let posterKey: string | undefined = undefined;

    if (mediaUri) {
      const uploadRes = await uploadFile(
        mediaUri,
        `upload_${Date.now()}.jpg`,
        "image/jpeg"
      );
      if (uploadRes) {
        posterUrl = uploadRes.url;
        posterKey = uploadRes.key;
      }
    }

    createContent.mutate({
      heading: heading.trim(),
      description: description.trim() || undefined,
      categoryIds: selectedCategoryIds,
      posterImageUrl: posterUrl,
      posterImageKey: posterKey,
    });

    setIsUploading(false);
  };

  const handleSubmitCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert("Validation", "Please enter category name");
      return;
    }

    createCategory.mutate({
      name: categoryName.trim(),
      description: categoryDesc.trim() || undefined,
    });
  };

  const bgImage = theme === "dark" ? DARK_IMAGE : LIGHT_IMAGE;

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
          <Text style={[styles.title, { color: colors.text }]}>Add New</Text>

          {/* Mode Switcher */}
          <View style={[styles.modeTabs, { backgroundColor: colors.glassBg }]}>
            <Pressable
              onPress={() => setMode("content")}
              style={[
                styles.modeTab,
                mode === "content" && { backgroundColor: colors.text },
              ]}
            >
              <Text
                style={[
                  styles.modeTabText,
                  { color: mode === "content" ? colors.bg : colors.textMuted },
                ]}
              >
                Content Item
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMode("category")}
              style={[
                styles.modeTab,
                mode === "category" && { backgroundColor: colors.text },
              ]}
            >
              <Text
                style={[
                  styles.modeTabText,
                  { color: mode === "category" ? colors.bg : colors.textMuted },
                ]}
              >
                Category
              </Text>
            </Pressable>
          </View>

          {/* Form */}
          {mode === "content" ? (
            <GlassCard style={styles.card}>
              <Text style={[styles.label, { color: colors.text }]}>Title / Heading *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.surfaceHover,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="e.g. Inception Movie Notes"
                placeholderTextColor={colors.textSubtle}
                value={heading}
                onChangeText={setHeading}
              />

              <Text style={[styles.label, { color: colors.text }]}>Description</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    color: colors.text,
                    backgroundColor: colors.surfaceHover,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Optional notes or details..."
                placeholderTextColor={colors.textSubtle}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              {/* Category Picker Chips */}
              <Text style={[styles.label, { color: colors.text }]}>Categories</Text>
              <View style={styles.chipsContainer}>
                {categories.map((cat) => {
                  const isSelected = selectedCategoryIds.includes(cat.id);
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => toggleCategory(cat.id)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected
                            ? colors.accent
                            : colors.surfaceHover,
                          borderColor: isSelected
                            ? colors.accent
                            : colors.border,
                        },
                      ]}
                    >
                      {isSelected && (
                        <Check size={14} color="#FFF" style={{ marginRight: 4 }} />
                      )}
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? "#FFF" : colors.text },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Media Picker */}
              <Text style={[styles.label, { color: colors.text }]}>Attachment / Poster</Text>
              <Pressable
                onPress={pickImage}
                style={[
                  styles.mediaPicker,
                  {
                    borderColor: colors.borderHighlight,
                    backgroundColor: colors.surfaceHover,
                  },
                ]}
              >
                {mediaUri ? (
                  <Image
                    source={{ uri: mediaUri }}
                    style={styles.pickedImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.mediaPickerInner}>
                    <ImagePlus size={28} color={colors.textMuted} />
                    <Text style={[styles.mediaPickerText, { color: colors.textMuted }]}>
                      Tap to select image or video
                    </Text>
                  </View>
                )}
              </Pressable>

              <Pressable
                onPress={handleSubmitContent}
                disabled={isUploading || createContent.isPending}
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.accent },
                  (isUploading || createContent.isPending) && { opacity: 0.6 },
                ]}
              >
                {isUploading || createContent.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Content</Text>
                )}
              </Pressable>
            </GlassCard>
          ) : (
            <GlassCard style={styles.card}>
              <Text style={[styles.label, { color: colors.text }]}>Category Name *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.surfaceHover,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="e.g. Travel Destinations"
                placeholderTextColor={colors.textSubtle}
                value={categoryName}
                onChangeText={setCategoryName}
              />

              <Text style={[styles.label, { color: colors.text }]}>Description</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    color: colors.text,
                    backgroundColor: colors.surfaceHover,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Short description of this category..."
                placeholderTextColor={colors.textSubtle}
                value={categoryDesc}
                onChangeText={setCategoryDesc}
                multiline
                numberOfLines={3}
              />

              <Pressable
                onPress={handleSubmitCategory}
                disabled={createCategory.isPending}
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.accent },
                  createCategory.isPending && { opacity: 0.6 },
                ]}
              >
                {createCategory.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Category</Text>
                )}
              </Pressable>
            </GlassCard>
          )}
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
  modeTabs: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    padding: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  mediaPicker: {
    height: 140,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  mediaPickerInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  mediaPickerText: {
    fontSize: 13,
    marginTop: 8,
  },
  pickedImage: {
    width: "100%",
    height: "100%",
  },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
