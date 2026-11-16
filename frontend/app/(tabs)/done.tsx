import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2 } from "lucide-react-native";
import { trpc } from "../../src/lib/trpc";
import { useTheme } from "../../src/contexts/ThemeContext";
import { DARK_IMAGE, LIGHT_IMAGE } from "../../src/lib/constants";
import { ContentCard } from "../../src/components/ContentCard";

export default function DoneScreen() {
  const insets = useSafeAreaInsets();
  const { theme, colors } = useTheme();
  const utils = trpc.useUtils();

  const {
    data: items = [],
    isLoading,
    refetch,
    isRefetching,
  } = trpc.content.listByStatus.useQuery("done");

  const updateStatus = trpc.content.updateStatus.useMutation({
    onSuccess: () => {
      utils.content.listByStatus.invalidate();
    },
  });

  const deleteItem = trpc.content.delete.useMutation({
    onSuccess: () => {
      utils.content.listByStatus.invalidate();
    },
  });

  const bgImage = theme === "dark" ? DARK_IMAGE : LIGHT_IMAGE;

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: bgImage }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={300}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor:
              theme === "dark"
                ? "rgba(10, 10, 10, 0.78)"
                : "rgba(248, 250, 252, 0.78)",
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: 110 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.maxWidthWrapper}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <CheckCircle2 size={24} color={colors.success} style={{ marginRight: 8 }} />
              <Text style={[styles.title, { color: colors.text }]}>Done</Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Completed items ({items.length})
            </Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : null}

          {!isLoading && items.length === 0 && (
            <View style={styles.emptyContainer}>
              <CheckCircle2 size={48} color={colors.textSubtle} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: colors.text }]}>
                No completed items yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Items marked as done will appear here.
              </Text>
            </View>
          )}

          {items.map((item) => (
            <ContentCard
              key={item.id}
              item={item as any}
              onPress={() => {}}
              onUpdateStatus={(newStatus) =>
                updateStatus.mutate({ itemId: item.id, status: newStatus })
              }
              onDelete={() => deleteItem.mutate({ itemId: item.id })}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  maxWidthWrapper: {
    width: "100%",
    maxWidth: 640,
  },
  header: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
    maxWidth: 280,
  },
});
