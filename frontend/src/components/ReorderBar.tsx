/**
 * ReorderBar – floating Save Order / Cancel bar shown while reorder mode is active.
 * Matches the old web client style: dark background, white text "Save Order" button.
 */

import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";

interface ReorderBarProps {
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
}

export function ReorderBar({ onSave, onCancel, saving }: ReorderBarProps) {
  const { theme } = useTheme();

  const saveButtonBg = theme === "dark" ? "#FFFFFF" : "#0F172A";
  const saveButtonText = theme === "dark" ? "#0F172A" : "#FFFFFF";
  const cancelBorderColor =
    theme === "dark" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)";
  const cancelTextColor =
    theme === "dark" ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.65)";

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor:
              theme === "dark"
                ? "rgba(20, 20, 24, 0.92)"
                : "rgba(255,255,255,0.92)",
            borderColor:
              theme === "dark"
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.12)",
          },
        ]}
      >
        <Text
          style={[
            styles.hint,
            { color: theme === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)" },
          ]}
        >
          Drag to reorder
        </Text>

        <View style={styles.buttons}>
          {/* Cancel */}
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.cancelBtn,
              { borderColor: cancelBorderColor, opacity: pressed ? 0.7 : 1 },
            ]}
            disabled={saving}
          >
            <Text style={[styles.cancelText, { color: cancelTextColor }]}>
              Cancel
            </Text>
          </Pressable>

          {/* Save Order */}
          <Pressable
            onPress={onSave}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: saveButtonBg, opacity: pressed ? 0.85 : 1 },
            ]}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={saveButtonText} />
            ) : (
              <Text style={[styles.saveText, { color: saveButtonText }]}>
                Save Order
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 999,
    pointerEvents: "box-none" as any,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 1,
    width: "90%",
    maxWidth: 480,
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 10px 32px rgba(0,0,0,0.45)",
      } as any,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 10,
      },
    }),
  },
  hint: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  buttons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "600",
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
