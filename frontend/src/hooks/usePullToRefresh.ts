import { useState, useCallback, useRef } from "react";
import { useTheme } from "../contexts/ThemeContext";

/**
 * Synchronous pull-to-refresh state so Android's native SwipeRefreshLayout
 * never flickers/disappears between release and React Query's async isRefetching.
 */
export function usePullToRefresh(refetch: () => Promise<any>) {
  const { colors, theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const inFlightRef = useRef(false);

  const onRefresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      inFlightRef.current = false;
      setRefreshing(false);
    }
  }, [refetch]);

  return {
    refreshing,
    onRefresh,
    refreshControlProps: {
      refreshing,
      onRefresh,
      tintColor: colors.accent,
      colors: [colors.accent],
      progressBackgroundColor: theme === "dark" ? "#1E1E1E" : "#FFFFFF",
    },
  };
}
