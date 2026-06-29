import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { trpc } from "@/lib/trpc";
import type { RootStackProps } from "@/navigation/types";

export default function AddSubcategoryScreen({ navigation, route }: RootStackProps<"AddSubcategory">) {
  const { categoryId } = route.params;
  const { theme } = useTheme();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createSub = trpc.subcategories.create.useMutation({
    onSuccess: () => {
      utils.subcategories.list.invalidate({ categoryId });
      navigation.goBack();
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const submit = () => {
    if (!name.trim()) {
      Alert.alert("Missing name", "Enter a subcategory name.");
      return;
    }
    createSub.mutate({
      categoryId,
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: theme.textMuted }}>Cancel</Text>
        </Pressable>
        <Text style={{ color: theme.text, fontWeight: "700", fontSize: 17 }}>Add Subcategory</Text>
        <Pressable onPress={submit} disabled={createSub.isPending}>
          {createSub.isPending ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <Text style={{ color: theme.primary, fontWeight: "700" }}>Save</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.pad}>
        <Text style={[styles.label, { color: theme.textMuted }]}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={[styles.input, { color: theme.text, borderColor: theme.surfaceBorder, backgroundColor: theme.surface }]}
          placeholder="Subcategory name"
          placeholderTextColor={theme.textMuted}
        />
        <Text style={[styles.label, { color: theme.textMuted }]}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          style={[
            styles.input,
            styles.textArea,
            { color: theme.text, borderColor: theme.surfaceBorder, backgroundColor: theme.surface },
          ]}
          placeholder="Optional"
          placeholderTextColor={theme.textMuted}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pad: { padding: 16 },
  label: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 8, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },
});
