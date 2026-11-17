import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Platform,
  useWindowDimensions,
  StyleProp,
  ViewStyle,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";

export interface DropdownItem {
  label: string;
  icon?: React.ComponentType<{ size: number; color: string }>;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

interface DropdownMenuProps {
  trigger: (open: () => void) => React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  contentStyle?: StyleProp<ViewStyle>;
}

export function DropdownMenu({
  trigger,
  items,
  align = "right",
  contentStyle,
}: DropdownMenuProps) {
  const [visible, setVisible] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left?: number; right?: number }>({
    top: 0,
  });
  const triggerRef = useRef<any>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { colors, theme } = useTheme();

  const openMenu = () => {
    if (triggerRef.current && typeof triggerRef.current.measureInWindow === "function") {
      triggerRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        const menuWidth = 195;
        let left: number;
        if (align === "right") {
          left = x + width - menuWidth;
        } else {
          left = x;
        }

        // Clamp horizontally so it is never off-screen
        left = Math.max(12, Math.min(left, windowWidth - menuWidth - 12));

        const approxMenuHeight = items.length * 44 + 16;
        let top = y + height + 6;
        // If opening below overflows the bottom, flip above trigger
        if (top + approxMenuHeight > windowHeight - 12) {
          top = Math.max(12, y - approxMenuHeight - 6);
        }

        setMenuPos({ top, left });
        setVisible(true);
      });
    } else {
      setVisible(true);
    }
  };

  const closeMenu = () => {
    setVisible(false);
  };

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        {trigger(openMenu)}
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.backdrop} onPress={closeMenu}>
          <View
            style={[
              styles.menuCard,
              {
                top: menuPos.top,
                left: menuPos.left,
                right: menuPos.right,
                backgroundColor:
                  theme === "dark"
                    ? "rgba(22, 22, 22, 0.95)"
                    : "rgba(255, 255, 255, 0.95)",
                borderColor:
                  theme === "dark"
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(0, 0, 0, 0.12)",
              },
              contentStyle,
            ]}
          >
            {items.map((item, index) => {
              const Icon = item.icon;
              const textColor = item.destructive
                ? "#EF4444"
                : item.disabled
                ? colors.textSubtle
                : colors.text;

              return (
                <Pressable
                  key={index}
                  disabled={item.disabled}
                  onPress={() => {
                    closeMenu();
                    setTimeout(() => {
                      item.onPress();
                    }, 100);
                  }}
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && !item.disabled && {
                      backgroundColor:
                        theme === "dark"
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(0, 0, 0, 0.05)",
                    },
                    item.disabled && { opacity: 0.4 },
                  ]}
                >
                  {Icon && (
                    <Icon
                      size={16}
                      color={textColor}
                    />
                  )}
                  <Text
                    style={[
                      styles.menuItemText,
                      { color: textColor },
                      item.destructive && { fontWeight: "600" },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "transparent",
  },
  menuCard: {
    position: "absolute",
    minWidth: 190,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px)",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
        zIndex: 9999,
      } as any,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
