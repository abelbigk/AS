import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onCancel?: () => void;
};

export default function SearchBar({ value, onChangeText, placeholder, onCancel }: Props) {
  const { theme } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
      {onCancel ? (
        <Pressable onPress={onCancel} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={theme.textMuted} />
        </Pressable>
      ) : (
        <Ionicons name="search" size={18} color={theme.textMuted} style={styles.searchIcon} />
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? "Search..."}
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { color: theme.text }]}
        autoFocus={Boolean(onCancel)}
        returnKeyType="search"
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={theme.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 44,
    marginBottom: 16,
  },
  searchIcon: { marginRight: 8 },
  iconBtn: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, paddingVertical: 8 },
});
