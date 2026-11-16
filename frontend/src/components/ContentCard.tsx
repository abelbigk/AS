import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { CroppedImage } from "./CroppedImage";
import { useTheme } from "../contexts/ThemeContext";
import { Clock, CheckCircle2, MoreVertical, Trash2 } from "lucide-react-native";

export interface ContentItem {
  id: number;
  userId: number;
  heading: string;
  description?: string | null;
  posterImageUrl?: string | null;
  posterImageKey?: string | null;
  posterCropData?: string | null;
  soundId?: number | null;
  status: "default" | "queued" | "done";
  categoryIds?: number[];
  subcategoryIds?: number[];
}

interface ContentCardProps {
  item: ContentItem;
  onPress: () => void;
  onUpdateStatus?: (status: "default" | "queued" | "done") => void;
  onDelete?: () => void;
}

export function ContentCard({
  item,
  onPress,
  onUpdateStatus,
  onDelete,
}: ContentCardProps) {
  const { colors, theme } = useTheme();

  const isQueued = item.status === "queued";
  const isDone = item.status === "done";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.glassBg,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.container}>
        {item.posterImageUrl ? (
          <View style={styles.thumbnailWrapper}>
            <CroppedImage
              src={item.posterImageUrl}
              cropData={item.posterCropData}
            />
          </View>
        ) : null}

        <View style={styles.content}>
          <Text style={[styles.heading, { color: colors.text }]} numberOfLines={2}>
            {item.heading}
          </Text>

          {item.description ? (
            <Text
              style={[styles.description, { color: colors.textMuted }]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}

          <View style={styles.actionsRow}>
            {onUpdateStatus && (
              <View style={styles.statusButtons}>
                <Pressable
                  onPress={() => onUpdateStatus(isQueued ? "default" : "queued")}
                  style={[
                    styles.actionBtn,
                    isQueued && { backgroundColor: "rgba(59, 130, 246, 0.2)" },
                  ]}
                >
                  <Clock
                    size={16}
                    color={isQueued ? colors.accent : colors.textSubtle}
                  />
                  <Text
                    style={[
                      styles.actionText,
                      { color: isQueued ? colors.accent : colors.textSubtle },
                    ]}
                  >
                    Queued
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => onUpdateStatus(isDone ? "default" : "done")}
                  style={[
                    styles.actionBtn,
                    isDone && { backgroundColor: "rgba(16, 185, 129, 0.2)" },
                  ]}
                >
                  <CheckCircle2
                    size={16}
                    color={isDone ? colors.success : colors.textSubtle}
                  />
                  <Text
                    style={[
                      styles.actionText,
                      { color: isDone ? colors.success : colors.textSubtle },
                    ]}
                  >
                    Done
                  </Text>
                </Pressable>
              </View>
            )}

            {onDelete && (
              <Pressable onPress={onDelete} style={styles.iconBtn}>
                <Trash2 size={16} color={colors.textSubtle} />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  container: {
    flexDirection: "row",
    padding: 12,
  },
  thumbnailWrapper: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    marginRight: 12,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  heading: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  statusButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "500",
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
  },
});
