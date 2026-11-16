import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Clock, CheckCircle2, Trash2 } from "lucide-react-native";
import { trpc } from "../lib/trpc";
import { useTheme } from "../contexts/ThemeContext";
import type { ContentItem } from "./ContentCard";

interface ContentDetailModalProps {
  item: ContentItem | null;
  visible: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export function ContentDetailModal({
  item,
  visible,
  onClose,
  onDeleted,
}: ContentDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const utils = trpc.useUtils();

  if (!item) return null;

  const updateStatus = trpc.content.updateStatus.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate();
      utils.content.listBySubcategory.invalidate();
      utils.content.listByStatus.invalidate();
    },
  });

  const deleteItem = trpc.content.delete.useMutation({
    onSuccess: () => {
      utils.content.listByCategory.invalidate();
      utils.content.listBySubcategory.invalidate();
      utils.content.listByStatus.invalidate();
      utils.content.listUncategorized.invalidate();
      onDeleted?.();
      onClose();
    },
  });

  const isQueued = item.status === "queued";
  const isDone = item.status === "done";

  const handleToggleQueue = () => {
    updateStatus.mutate({
      itemId: item.id,
      status: isQueued ? "default" : "queued",
    });
  };

  const handleToggleDone = () => {
    updateStatus.mutate({
      itemId: item.id,
      status: isDone ? "default" : "done",
    });
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Content",
      "Are you sure you want to permanently delete this item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteItem.mutate({ itemId: item.id }),
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: theme === "dark" ? "rgba(18, 18, 18, 0.95)" : "rgba(255, 255, 255, 0.95)",
              borderColor: colors.border,
              paddingTop: insets.top > 0 ? insets.top : 16,
              paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24,
            },
          ]}
        >
          {/* Top Bar with Close button */}
          <View style={styles.topBar}>
            <View style={styles.statusPills}>
              {isQueued && (
                <View style={[styles.statusBadge, { backgroundColor: "rgba(59, 130, 246, 0.2)" }]}>
                  <Clock size={12} color="#3B82F6" />
                  <Text style={[styles.statusBadgeText, { color: "#3B82F6" }]}>Queued</Text>
                </View>
              )}
              {isDone && (
                <View style={[styles.statusBadge, { backgroundColor: "rgba(16, 185, 129, 0.2)" }]}>
                  <CheckCircle2 size={12} color="#10B981" />
                  <Text style={[styles.statusBadgeText, { color: "#10B981" }]}>Done</Text>
                </View>
              )}
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Poster image */}
            {item.posterImageUrl ? (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: item.posterImageUrl }}
                  style={styles.posterImage}
                  contentFit="contain"
                />
              </View>
            ) : null}

            {/* Details */}
            <View style={styles.detailsContainer}>
              <Text style={[styles.heading, { color: colors.text }]}>
                {item.heading}
              </Text>

              {item.description ? (
                <Text style={[styles.description, { color: colors.textMuted }]}>
                  {item.description}
                </Text>
              ) : null}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsRow}>
              <Pressable
                onPress={handleToggleQueue}
                style={[
                  styles.actionButton,
                  isQueued && { backgroundColor: "rgba(59, 130, 246, 0.2)", borderColor: "#3B82F6" },
                  !isQueued && { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Clock size={16} color={isQueued ? "#3B82F6" : colors.textMuted} />
                <Text style={[styles.actionButtonText, { color: isQueued ? "#3B82F6" : colors.text }]}>
                  {isQueued ? "Queued" : "Queue"}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleToggleDone}
                style={[
                  styles.actionButton,
                  isDone && { backgroundColor: "rgba(16, 185, 129, 0.2)", borderColor: "#10B981" },
                  !isDone && { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <CheckCircle2 size={16} color={isDone ? "#10B981" : colors.textMuted} />
                <Text style={[styles.actionButtonText, { color: isDone ? "#10B981" : colors.text }]}>
                  {isDone ? "Completed" : "Done"}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleDelete}
                style={[styles.actionButton, styles.deleteButton, { borderColor: "rgba(239, 68, 68, 0.3)" }]}
              >
                <Trash2 size={16} color="#EF4444" />
                <Text style={[styles.actionButtonText, { color: "#EF4444" }]}>Delete</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 580,
    maxHeight: "90%",
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
      } as any,
    }),
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  statusPills: {
    flexDirection: "row",
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  imageContainer: {
    width: "100%",
    height: 320,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    marginBottom: 16,
  },
  posterImage: {
    width: "100%",
    height: "100%",
  },
  detailsContainer: {
    marginBottom: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 28,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
});
