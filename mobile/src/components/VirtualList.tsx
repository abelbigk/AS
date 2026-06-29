import { FlatList, StyleSheet, Text, View, type ListRenderItem } from "react-native";
import { useTheme } from "@/context/ThemeContext";

type Props<T> = {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  ListHeaderComponent?: React.ReactElement | null;
  ListEmptyComponent?: React.ReactElement | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  numColumns?: 1 | 2;
};

export default function VirtualList<T>({
  data,
  renderItem,
  keyExtractor,
  ListHeaderComponent,
  ListEmptyComponent,
  onRefresh,
  refreshing,
  numColumns = 1,
}: Props<T>) {
  const { theme } = useTheme();

  if (numColumns === 2) {
    return (
      <FlatList
        data={data}
        numColumns={2}
        key="two-col"
        columnWrapperStyle={styles.row}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        onRefresh={onRefresh}
        refreshing={refreshing}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.pad}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
      />
    );
  }

  return (
    <FlatList
      data={data}
      key="one-col"
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      onRefresh={onRefresh}
      refreshing={refreshing}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.pad}
      removeClippedSubviews
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={7}
      style={{ backgroundColor: theme.background }}
    />
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingBottom: 100 },
  row: { gap: 12 },
});
