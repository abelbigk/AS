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
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ImagePlus, Check, X } from "lucide-react-native";
import { trpc } from "../../src/lib/trpc";
import { useTheme } from "../../src/contexts/ThemeContext";
import { DARK_IMAGE, LIGHT_IMAGE } from "../../src/lib/constants";
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
  const [mediaName, setMediaName] = useState<string>("");
  const [mediaType, setMediaType] = useState<string>("image/jpeg");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      Alert.alert("Error", err.message || "Failed to create content");
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
      Alert.alert("Error", err.message || "Failed to create category");
    },
  });

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setMediaUri(asset.uri);
        setMediaName(asset.fileName || `upload_${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`);
        setMediaType(asset.mimeType || (asset.type === "video" ? "video/mp4" : "image/jpeg"));
      }
    } catch (e) {
      console.error("Error picking media:", e);
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
      Alert.alert("Validation", "Please enter a heading");
      return;
    }

    setIsSubmitting(true);
    let posterUrl: string | undefined = undefined;
    let posterKey: string | undefined = undefined;

    try {
      if (mediaUri) {
        const uploadRes = await uploadFile(
          mediaUri,
          mediaName || `upload_${Date.now()}.jpg`,
          mediaType
        );
        if (uploadRes) {
          posterUrl = uploadRes.url;
          posterKey = uploadRes.key;
        }
      }

      await createContent.mutateAsync({
        heading: heading.trim(),
        description: description.trim() || undefined,
        categoryIds: selectedCategoryIds,
        posterImageUrl: posterUrl,
        posterImageKey: posterKey,
      });
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save content");
    } finally {
      setIsSubmitting(false);
    }
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
          <Text style={styles.pageTitle}>Create</Text>

          {/* Mode Tabs */}
          <View style={styles.modeTabs}>
            <Pressable
              onPress={() => setMode("content")}
              style={[
                styles.modeTab,
                mode === "content" && styles.activeModeTab,
              ]}
            >
              <Text
                style={[
                  styles.modeTabText,
                  mode === "content" && styles.activeModeTabText,
                ]}
              >
                Content
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMode("category")}
              style={[
                styles.modeTab,
                mode === "category" && styles.activeModeTab,
              ]}
            >
              <Text
                style={[
                  styles.modeTabText,
                  mode === "category" && styles.activeModeTabText,
                ]}
              >
                Category
              </Text>
            </Pressable>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {mode === "content" ? (
              <View>
                <Text style={styles.fieldLabel}>Title / Heading *</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter heading..."
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={heading}
                    onChangeText={setHeading}
                  />
                </View>

                <Text style={styles.fieldLabel}>Description</Text>
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Optional description or notes..."
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Categories selection chips */}
                <Text style={styles.fieldLabel}>Categories</Text>
                <View style={styles.chipsContainer}>
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryIds.includes(cat.id);
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => toggleCategory(cat.id)}
                        style={[
                          styles.chip,
                          isSelected && styles.activeChip,
                        ]}
                      >
                        {isSelected && (
                          <Check size={14} color="#000" style={{ marginRight: 4 }} />
                        )}
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.activeChipText,
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Media Attachment */}
                <Text style={styles.fieldLabel}>Photo or Video</Text>
                <Pressable onPress={pickImage} style={styles.mediaDropzone}>
                  {mediaUri ? (
                    <View style={styles.mediaPreviewContainer}>
                      <Image source={{ uri: mediaUri }} style={styles.mediaPreview} contentFit="cover" />
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          setMediaUri(null);
                        }}
                        style={styles.removeMediaBtn}
                      >
                        <X size={16} color="#FFF" />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.mediaPrompt}>
                      <ImagePlus size={26} color="rgba(255, 255, 255, 0.45)" />
                      <Text style={styles.mediaPromptText}>
                        Tap to select photo or video
                      </Text>
                    </View>
                  )}
                </Pressable>

                {/* Submit button */}
                <Pressable
                  onPress={handleSubmitContent}
                  disabled={isSubmitting || createContent.isPending}
                  style={({ pressed }) => [
                    styles.submitButton,
                    pressed && { opacity: 0.9 },
                    (isSubmitting || createContent.isPending) && { opacity: 0.6 },
                  ]}
                >
                  {isSubmitting || createContent.isPending ? (
                    <ActivityIndicator color="#000000" />
                  ) : (
                    <Text style={styles.submitButtonText}>Save Content</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <View>
                <Text style={styles.fieldLabel}>Category Name *</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter category name..."
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={categoryName}
                    onChangeText={setCategoryName}
                  />
                </View>

                <Text style={styles.fieldLabel}>Description</Text>
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Optional description..."
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={categoryDesc}
                    onChangeText={setCategoryDesc}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Submit Category */}
                <Pressable
                  onPress={handleSubmitCategory}
                  disabled={createCategory.isPending}
                  style={({ pressed }) => [
                    styles.submitButton,
                    pressed && { opacity: 0.9 },
                    createCategory.isPending && { opacity: 0.6 },
                  ]}
                >
                  {createCategory.isPending ? (
                    <ActivityIndicator color="#000000" />
                  ) : (
                    <Text style={styles.submitButtonText}>Create Category</Text>
                  )}
                </Pressable>
              </View>
            )}
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
    backgroundColor: "rgba(10, 10, 10, 0.6)",
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
  modeTabs: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  activeModeTab: {
    backgroundColor: "#FFFFFF",
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
  },
  activeModeTabText: {
    color: "#000000",
  },
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      web: {
        backdropFilter: "blur(16px)",
      } as any,
    }),
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
    marginTop: 14,
  },
  inputWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: "center",
  },
  textAreaWrapper: {
    height: 88,
    paddingVertical: 10,
    justifyContent: "flex-start",
  },
  textInput: {
    fontSize: 15,
    color: "#FFFFFF",
    width: "100%",
  },
  textArea: {
    height: "100%",
    textAlignVertical: "top",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
  },
  activeChip: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  chipText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  activeChipText: {
    color: "#000000",
    fontWeight: "700",
  },
  mediaDropzone: {
    height: 140,
    borderRadius: 14,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1.5,
    borderStyle: "dashed",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  mediaPrompt: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mediaPromptText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
  },
  mediaPreviewContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  mediaPreview: {
    width: "100%",
    height: "100%",
  },
  removeMediaBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButton: {
    backgroundColor: "#FFFFFF",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    ...Platform.select({
      web: {
        cursor: "pointer",
      } as any,
    }),
  },
  submitButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
  },
});
