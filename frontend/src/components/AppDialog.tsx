/**
 * AppDialog — themed confirmation/alert modal that replaces Alert.alert
 * Matches the app's glass-morphism design system.
 *
 * Usage:
 *   const { dialog, confirm, alert } = useAppDialog();
 *   ...
 *   await confirm({ title: "Delete?", message: "...", confirmText: "Delete", destructive: true });
 *   <AppDialogRenderer {...dialog} />
 */

import React, { useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AppDialogConfig {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  /** If true, no cancel button — single "OK" button */
  alertOnly?: boolean;
}

interface DialogState extends AppDialogConfig {
  visible: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppDialog() {
  const [state, setState] = useState<DialogState>({ visible: false, title: "" });

  const show = useCallback((config: AppDialogConfig) => {
    setState({ ...config, visible: true });
  }, []);

  const hide = useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
  }, []);

  /** Show a simple info/error/success toast — single OK button */
  const showAlert = useCallback(
    (title: string, message?: string) => {
      show({ title, message, alertOnly: true });
    },
    [show]
  );

  /** Show a confirmation dialog — returns a Promise<boolean> */
  const showConfirm = useCallback(
    (config: Omit<AppDialogConfig, "alertOnly">) => {
      return new Promise<boolean>((resolve) => {
        show({
          ...config,
          onConfirm: async () => {
            await config.onConfirm?.();
            resolve(true);
          },
          onCancel: () => {
            config.onCancel?.();
            resolve(false);
          },
        });
      });
    },
    [show]
  );

  return { dialogState: state, hide, showAlert, showConfirm };
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

interface AppDialogRendererProps extends DialogState {
  onHide: () => void;
}

export function AppDialogRenderer({
  visible,
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  destructive = false,
  alertOnly = false,
  onConfirm,
  onCancel,
  onHide,
}: AppDialogRendererProps) {
  const { colors } = useTheme();

  const handleConfirm = async () => {
    onHide();
    await onConfirm?.();
  };

  const handleCancel = () => {
    onHide();
    onCancel?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      statusBarTranslucent={Platform.OS === "android"}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: colors.glassBg,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          {/* Message */}
          {!!message && (
            <Text style={[styles.message, { color: colors.textMuted }]}>
              {message}
            </Text>
          )}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Buttons */}
          {alertOnly ? (
            <Pressable
              onPress={handleConfirm}
              style={({ pressed }) => [styles.btn, styles.btnFull, pressed && styles.btnPressed]}
            >
              <Text style={[styles.btnText, { color: colors.accent }]}>
                {confirmText}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.btnRow}>
              <Pressable
                onPress={handleCancel}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnHalf,
                  { borderColor: colors.border },
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={[styles.btnText, { color: colors.textMuted }]}>
                  {cancelText}
                </Text>
              </Pressable>
              <View style={[styles.btnDividerV, { backgroundColor: colors.border }]} />
              <Pressable
                onPress={handleConfirm}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnHalf,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text
                  style={[
                    styles.btnText,
                    styles.btnTextBold,
                    { color: destructive ? colors.danger : colors.accent },
                  ]}
                >
                  {confirmText}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  dialog: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  divider: {
    height: 1,
    width: "100%",
  },
  btnRow: {
    flexDirection: "row",
  },
  btn: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnFull: {
    width: "100%",
  },
  btnHalf: {
    flex: 1,
  },
  btnDividerV: {
    width: 1,
  },
  btnPressed: {
    opacity: 0.6,
  },
  btnText: {
    fontSize: 16,
    fontWeight: "500",
  },
  btnTextBold: {
    fontWeight: "700",
  },
});
