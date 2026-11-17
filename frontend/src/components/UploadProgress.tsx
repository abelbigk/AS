import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { X, Film, Image as ImageIcon } from "lucide-react-native";
import { useUploadMetrics } from "../hooks/useUploadMetrics";
import { useTheme } from "../contexts/ThemeContext";

interface UploadProgressProps {
  pct: number;
  loadedBytes: number;
  totalBytes: number;
  isSubmitting: boolean;
  stage: "idle" | "cover" | "saving_entry" | "media" | "processing";
  fileName?: string;
  onCancel?: () => void;
}

export function UploadProgress({
  pct,
  loadedBytes,
  totalBytes,
  isSubmitting,
  stage,
  fileName = "Media file",
  onCancel,
}: UploadProgressProps) {
  const { colors, theme } = useTheme();
  const { speedStr, etaStr, loadedStr, totalStr } = useUploadMetrics(
    loadedBytes,
    totalBytes,
    isSubmitting
  );

  if (stage === "idle" || !isSubmitting) return null;

  const isProcessing = stage === "processing" || stage === "saving_entry";
  const isVideo = fileName.match(/\.(mp4|mov|avi|mkv|webm)$/i);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor:
            theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor:
                theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
              borderColor: colors.border,
            },
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : isVideo ? (
            <Film size={18} color="#3B82F6" />
          ) : (
            <ImageIcon size={18} color="#3B82F6" />
          )}
        </View>

        <View style={styles.infoCol}>
          <View style={styles.statusRow}>
            <Text style={[styles.statusText, { color: colors.text }]}>
              {isProcessing ? "Processing on server..." : "Uploading to Cloud..."}
            </Text>
            {!isProcessing && <View style={styles.pingDot} />}
          </View>
          <Text numberOfLines={1} style={[styles.fileName, { color: colors.textSubtle }]}>
            {fileName}
          </Text>
        </View>

        {onCancel && !isProcessing && (
          <Pressable onPress={onCancel} hitSlop={8} style={styles.cancelBtn}>
            <X size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarWrapper}>
        <View
          style={[
            styles.progressBarTrack,
            {
              backgroundColor:
                theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
            },
          ]}
        >
          <View
            style={[
              styles.progressBarFill,
              { width: `${isProcessing ? 100 : Math.min(100, Math.max(0, pct))}%` },
            ]}
          />
        </View>

        {/* Real-time stats */}
        <View style={styles.metricsRow}>
          <View style={styles.metricsLeft}>
            <Text style={[styles.pctText, { color: colors.text }]}>{pct}%</Text>
            <Text style={[styles.bullet, { color: colors.textSubtle }]}>•</Text>
            <Text style={[styles.metricText, { color: colors.textMuted }]}>
              {isProcessing ? "Finalizing" : speedStr}
            </Text>
          </View>

          <View style={styles.metricsRight}>
            <Text style={[styles.metricText, { color: colors.textSubtle }]}>
              {isProcessing ? "Almost done" : etaStr}
            </Text>
            <Text style={[styles.bullet, { color: colors.textSubtle }]}>•</Text>
            <Text style={[styles.metricText, { color: colors.textSubtle }]}>
              {loadedStr} of {totalStr}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3B82F6",
  },
  fileName: {
    fontSize: 11,
    marginTop: 2,
  },
  cancelBtn: {
    padding: 4,
  },
  progressBarWrapper: {
    gap: 6,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    width: "100%",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#6366F1",
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  metricsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metricsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  pctText: {
    fontSize: 11,
    fontWeight: "700",
  },
  metricText: {
    fontSize: 10,
  },
  bullet: {
    fontSize: 10,
  },
});
