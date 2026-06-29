import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { trpc } from "@/lib/trpc";
import type { RootStackProps } from "@/navigation/types";

export default function EditContentScreen({ navigation, route }: RootStackProps<"EditContent">) {
  const { itemId } = route.params;
  const { theme } = useTheme();
  const utils = trpc.useUtils();

  const itemQuery = trpc.content.getById.useQuery({ itemId });
  const categoriesQuery = trpc.categories.list.useQuery();
  const subsQuery = trpc.subcategories.listAll.useQuery();

  const [heading, setHeading] = useState("");
  const [description, setDescription] = useState("");
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [subcategoryIds, setSubcategoryIds] = useState<number[]>([]);

  useEffect(() => {
    if (itemQuery.data) {
      setHeading(itemQuery.data.heading);
      setDescription(itemQuery.data.description ?? "");
      setCategoryIds(itemQuery.data.categoryIds);
      setSubcategoryIds(itemQuery.data.subcategoryIds);
    }
  }, [itemQuery.data]);

  const updateContent = trpc.content.update.useMutation({
    onSuccess: async () => {
      await utils.content.invalidate();
      navigation.goBack();
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const availableSubs = useMemo(
    () => (subsQuery.data ?? []).filter((s) => categoryIds.includes(s.categoryId)),
    [subsQuery.data, categoryIds]
  );

  const toggleCategory = (id: number) => {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSubcategory = (id: number) => {
    const sub = subsQuery.data?.find((s) => s.id === id);
    setSubcategoryIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (sub && !prev.includes(id)) {
        setCategoryIds((cats) => cats.filter((c) => c !== sub.categoryId));
      }
      return next;
    });
  };

  const submit = () => {
    if (!heading.trim()) {
      Alert.alert("Missing heading", "Enter a title.");
      return;
    }
    updateContent.mutate({
      itemId,
      heading: heading.trim(),
      description: description.trim() || undefined,
      categoryIds,
      subcategoryIds,
    });
  };

  if (itemQuery.isLoading || !itemQuery.data) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background, justifyContent: "center" }]}>
        <ActivityIndicator color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: theme.textMuted }}>Cancel</Text>
        </Pressable>
        <Text style={{ color: theme.text, fontWeight: "700", fontSize: 17 }}>Edit Content</Text>
        <Pressable onPress={submit} disabled={updateContent.isPending}>
          {updateContent.isPending ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <Text style={{ color: theme.primary, fontWeight: "700" }}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: theme.textMuted }]}>Heading</Text>
        <TextInput
          value={heading}
          onChangeText={setHeading}
          style={[styles.input, { color: theme.text, borderColor: theme.surfaceBorder, backgroundColor: theme.surface }]}
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
        />

        <Text style={[styles.label, { color: theme.textMuted }]}>Categories</Text>
        <View style={styles.chips}>
          {(categoriesQuery.data ?? []).map((cat) => {
            const active = categoryIds.includes(cat.id);
            return (
              <Pressable
                key={cat.id}
                onPress={() => toggleCategory(cat.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primary : theme.surface,
                    borderColor: theme.surfaceBorder,
                  },
                ]}
              >
                <Text style={{ color: active ? "#fff" : theme.text }}>{cat.name}</Text>
              </Pressable>
            );
          })}
        </View>

        {availableSubs.length > 0 ? (
          <>
            <Text style={[styles.label, { color: theme.textMuted }]}>Subcategories</Text>
            <View style={styles.chips}>
              {availableSubs.map((sub) => {
                const active = subcategoryIds.includes(sub.id);
                return (
                  <Pressable
                    key={sub.id}
                    onPress={() => toggleSubcategory(sub.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? theme.primary : theme.surface,
                        borderColor: theme.surfaceBorder,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? "#fff" : theme.text }}>{sub.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>
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
  pad: { padding: 16, paddingBottom: 40 },
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
});
