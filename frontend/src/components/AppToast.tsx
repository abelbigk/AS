/**
 * AppToast — themed bottom-of-screen notification that replaces simple Alert.alert calls.
 * Auto-dismisses after a timeout. Matches the app's glass-morphism design.
 *
 * Usage:
 *   const { toastState, showToast } = useAppToast();
 *   showToast("Category created!", "success");
 *   <AppToastRenderer {...toastState} />
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react-native";
import { useTheme } from "../contexts/ThemeContext";

export type ToastType = "success" | "error" | "info";

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppToast() {
  const [toastState, setToastState] = useState<ToastState>({
    visible: false,
    message: "",
    type: "info",
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    if (timer.current) clearTimeout(timer.current);
    setToastState({ visible: true, message, type });
    timer.current = setTimeout(() => {
      setToastState((s) => ({ ...s, visible: false }));
    }, 3000);
  }, []);

  return { toastState, showToast };
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

interface AppToastRendererProps {
  visible: boolean;
  message: string;
  type: ToastType;
}

const ICON_SIZE = 18;

export function AppToastRenderer({ visible, message, type }: AppToastRendererProps) {
  const { colors } = useTheme();
  const [shouldRender, setShouldRender] = useState(visible);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 16, duration: 180, useNativeDriver: true }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible]);

  const iconColor =
    type === "success" ? colors.success : type === "error" ? colors.danger : colors.accent;

  const Icon =
    type === "success" ? CheckCircle : type === "error" ? XCircle : AlertCircle;

  if (!shouldRender) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          backgroundColor: colors.glassBg,
          borderColor: colors.border,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Icon size={ICON_SIZE} color={iconColor} />
      <Text style={[styles.text, { color: colors.text }]}>{message}</Text>
    </Animated.View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 110,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    zIndex: 9999,
    // subtle shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
});
