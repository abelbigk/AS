import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";

export default function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: theme.textMuted }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.sub, { color: theme.textMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 },
  title: { fontSize: 16, fontWeight: "600", textAlign: "center" },
  sub: { fontSize: 13, marginTop: 6, textAlign: "center", opacity: 0.8 },
});
