import React from "react";
import { View, Text, StyleSheet, Pressable, Platform, Alert } from "react-native";
import { Image } from "expo-image";
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
  categoryName?: string;
  onPress: () => void;
  onUpdateStatus?: (status: "default" | "queued" | "done") => void;
  onDelete?: () => void;
}

export function ContentCard({
  item,
  categoryName,
  onPress,
  onUpdateStatus,
  onDelete,
}: ContentCardProps) {
  const { colors, theme } = useTheme();

  const isQueued = item.status === "queued";
  const isDone = item.status === "done";

  const handleMorePress = (e: any) => {
    e.stopPropagation?.();
    const options: { text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" }[] = [];

    if (onUpdateStatus) {
      options.push({
        text: isQueued ? "Unqueue" : "Queue",
        onPress: () => onUpdateStatus(isQueued ? "default" : "queued"),
      });
      options.push({
        text: isDone ? "Mark Undone" : "Mark Done",
        onPress: () => onUpdateStatus(isDone ? "default" : "done"),
      });
    }

    if (onDelete) {
      options.push({
        text: "Delete",
        style: "destructive",
        onPress: onDelete,
      });
    }

    options.push({ text: "Cancel", style: "cancel" });

    Alert.alert("Options", undefined, options);
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor:
            theme === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(255, 255, 255, 0.75)",
          borderColor:
            theme === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {/* Poster Image Container */}
      {item.posterImageUrl ? (
        <View style={styles.imageWrapper}>
          <CroppedImage
            src={item.posterImageUrl}
            cropData={item.posterCropData}
          />

          {/* Status pill on image */}
          {item.status !== "default" && (
            <View style={styles.statusPill}>
              {isQueued && (
                <View style={[styles.badge, { backgroundColor: "rgba(59, 130, 246, 0.85)" }]}>
                  <Clock size={10} color="#FFFFFF" />
                  <Text style={styles.badgeText}>Queued</Text>
                </View>
              )}
              {isDone && (
                <View style={[styles.badge, { backgroundColor: "rgba(16, 185, 129, 0.85)" }]}>
                  <CheckCircle2 size={10} color="#FFFFFF" />
                  <Text style={styles.badgeText}>Done</Text>
                </View>
              )}
            </View>
          )}

          {/* 3-dot menu button on image */}
          <Pressable
            onPress={handleMorePress}
            style={styles.moreBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreVertical size={14} color="rgba(255, 255, 255, 0.8)" />
          </Pressable>
        </View>
      ) : null}

      {/* Info Container */}
      <View style={styles.content}>
        {categoryName ? (
          <Text style={[styles.categoryTag, { color: colors.textSubtle }]} numberOfLines={1}>
            {categoryName}
          </Text>
        ) : null}

        <Text style={[styles.heading, { color: colors.text }]} numberOfLines={3}>
          {item.heading}
        </Text>

        {item.description ? (
          <Text style={[styles.description, { color: colors.textMuted }]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
    ...Platform.select({
      web: {
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
        cursor: "pointer",
      } as any,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
  imageWrapper: {
    width: "100%",
    height: 140,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    position: "relative",
    overflow: "hidden",
  },
  statusPill: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "600",
  },
  moreBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  content: {
    padding: 10,
    gap: 4,
  },
  categoryTag: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heading: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  description: {
    fontSize: 11,
    lineHeight: 15,
  },
});
