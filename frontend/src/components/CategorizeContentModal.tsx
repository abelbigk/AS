import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { X, Check, Folder, FolderTree } from "lucide-react-native";
import { trpc } from "../lib/trpc";
import { useTheme } from "../contexts/ThemeContext";
import type { ContentItem } from "./ContentCard";

interface CategorizeContentModalProps {
  content: ContentItem | null;
  visible: boolean;
  onClose: () => void;
}

export function CategorizeContentModal({
  content,
  visible,
  onClose,
}: CategorizeContentModalProps) {
  const { colors, theme } = useTheme();
  const utils = trpc.useUtils();

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set());
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<Set<number>>(new Set());

  const { data: categories = [], isLoading: categoriesLoading } = trpc.categories.list.useQuery(
    undefined,
    { enabled: !!content }
  );

  const { data: allSubcategories = [], isLoading: subcategoriesLoading } =
    trpc.subcategories.listAll.useQuery(undefined, { enabled: !!content });

  const updateContent = trpc.content.update.useMutation({
    onSuccess: () => {
      utils.content.listUncategorized.invalidate();
      utils.content.listByCategory.invalidate();
      utils.content.listBySubcategory.invalidate();
      onClose();
    },
  });

  useEffect(() => {
    if (content) {
      setSelectedCategoryIds(new Set(content.categoryIds || []));
      setSelectedSubcategoryIds(new Set(content.subcategoryIds || []));
    }
  }, [content]);

  const toggleCategory = (catId: number) => {
    const next = new Set(selectedCategoryIds);
    if (next.has(catId)) {
      next.delete(catId);
    } else {
      next.add(catId);
    }
    setSelectedCategoryIds(next);
  };

  const toggleSubcategory = (subId: number) => {
    const next = new Set(selectedSubcategoryIds);
    if (next.has(subId)) {
      next.delete(subId);
    } else {
      next.add(subId);
    }
    setSelectedSubcategoryIds(next);
  };

  const handleSave = () => {
    if (!content) return;
    updateContent.mutate({
      itemId: content.id,
      heading: content.heading,
      description: content.description ?? undefined,
      categoryIds: Array.from(selectedCategoryIds),
      subcategoryIds: Array.from(selectedSubcategoryIds),
    });
  };

  if (!content) return null;

  const isLoading = categoriesLoading || subcategoriesLoading;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.glassBg, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Categorize Content</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
                {content.heading}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
          ) : (
            <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
              {categories.map((cat) => {
                const isCatSelected = selectedCategoryIds.has(cat.id);
                const subsForCat = allSubcategories.filter((s) => s.categoryId === cat.id);

                return (
                  <View key={cat.id} style={styles.categoryBlock}>
                    {/* Category item */}
                    <Pressable
                      onPress={() => toggleCategory(cat.id)}
                      style={[
                        styles.categoryRow,
                        isCatSelected && { backgroundColor: "rgba(59, 130, 246, 0.15)" },
                      ]}
                    >
                      <View style={styles.rowLeft}>
                        <Folder size={18} color={isCatSelected ? "#3B82F6" : colors.textMuted} />
                        <Text
                          style={[
                            styles.categoryName,
                            { color: isCatSelected ? "#3B82F6" : colors.text },
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.checkbox,
                          isCatSelected && { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
                        ]}
                      >
                        {isCatSelected && <Check size={12} color="#FFFFFF" />}
                      </View>
                    </Pressable>

                    {/* Subcategories under this category */}
                    {subsForCat.length > 0 && (
                      <View style={styles.subsContainer}>
                        {subsForCat.map((sub) => {
                          const isSubSelected = selectedSubcategoryIds.has(sub.id);
                          return (
                            <Pressable
                              key={sub.id}
                              onPress={() => toggleSubcategory(sub.id)}
                              style={[
                                styles.subRow,
                                isSubSelected && { backgroundColor: "rgba(59, 130, 246, 0.12)" },
                              ]}
                            >
                              <View style={styles.rowLeft}>
                                <FolderTree
                                  size={14}
                                  color={isSubSelected ? "#3B82F6" : colors.textSubtle}
                                />
                                <Text
                                  style={[
                                    styles.subName,
                                    { color: isSubSelected ? "#3B82F6" : colors.textMuted },
                                  ]}
                                >
                                  {sub.name}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.smallCheckbox,
                                  isSubSelected && {
                                    backgroundColor: "#3B82F6",
                                    borderColor: "#3B82F6",
                                  },
                                ]}
                              >
                                {isSubSelected && <Check size={10} color="#FFFFFF" />}
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          <Pressable
            onPress={handleSave}
            disabled={updateContent.isPending}
            style={styles.saveBtn}
          >
            {updateContent.isPending ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.saveBtnText}>Save Categories</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: "85%",
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px)",
      } as any,
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    maxWidth: 260,
  },
  closeBtn: {
    padding: 6,
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: "center",
  },
  scrollList: {
    marginBottom: 16,
  },
  categoryBlock: {
    marginBottom: 10,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  subsContainer: {
    paddingLeft: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  subName: {
    fontSize: 13,
    fontWeight: "500",
  },
  smallCheckbox: {
    width: 17,
    height: 17,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    backgroundColor: "#FFFFFF",
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "700",
  },
});
