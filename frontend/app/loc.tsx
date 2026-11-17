import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Gauge,
  MapPin,
  RefreshCw,
  Navigation,
} from "lucide-react-native";
import { format, subDays, addDays, isToday, parseISO } from "date-fns";
import { trpc } from "../src/lib/trpc";
import { useTheme } from "../src/contexts/ThemeContext";
import { TrackingMap, type LocationPoint } from "../src/components/TrackingMap";

const DEFAULT_BG =
  "https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=80";

export default function LocationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const params = useLocalSearchParams<{ userId: string; username?: string }>();
  const userId = parseInt(params.userId || "0", 10);
  const username = params.username || `User #${userId}`;

  // Date state (defaults to today)
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  const selectedDate = useMemo(() => {
    try {
      return parseISO(selectedDateStr);
    } catch {
      return new Date();
    }
  }, [selectedDateStr]);

  const isCurrentDayToday = selectedDateStr === todayStr;

  // Query location history for selected date (auto-refreshes every 10s if viewing today)
  const {
    data: locations = [],
    isLoading,
    refetch,
    isRefetching,
  } = trpc.tracking.getHistory.useQuery(
    { userId, date: selectedDateStr },
    {
      enabled: !!userId,
      refetchInterval: isCurrentDayToday ? 10000 : false,
    }
  );

  // Date step handlers
  const handlePrevDay = () => {
    const prev = subDays(selectedDate, 1);
    setSelectedDateStr(format(prev, "yyyy-MM-dd"));
  };

  const handleNextDay = () => {
    if (isCurrentDayToday) return;
    const next = addDays(selectedDate, 1);
    setSelectedDateStr(format(next, "yyyy-MM-dd"));
  };

  const handleSetToday = () => {
    setSelectedDateStr(todayStr);
  };

  const handleSetYesterday = () => {
    const yesterday = subDays(new Date(), 1);
    setSelectedDateStr(format(yesterday, "yyyy-MM-dd"));
  };

  // Stats calculation
  const stats = useMemo(() => {
    if (locations.length === 0) return null;
    const firstPoint = locations[0];
    const lastPoint = locations[locations.length - 1];

    const firstTime = format(new Date(firstPoint.timestamp), "hh:mm a");
    const lastTime = format(new Date(lastPoint.timestamp), "hh:mm a");

    let maxSpeed = 0;
    for (const p of locations) {
      if (p.speed && p.speed > maxSpeed) {
        maxSpeed = p.speed;
      }
    }

    return {
      firstTime,
      lastTime,
      count: locations.length,
      maxSpeedKmh: Math.round(maxSpeed * 3.6),
      latestSpeedKmh:
        lastPoint.speed != null ? Math.round(lastPoint.speed * 3.6) : 0,
    };
  }, [locations]);

  return (
    <View style={styles.container}>
      {/* Background blurred poster */}
      <Image
        source={{ uri: DEFAULT_BG }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        blurRadius={Platform.OS !== "web" ? 25 : undefined}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.backdropOverlay,
          {
            backgroundColor:
              theme === "dark"
                ? "rgba(10, 10, 10, 0.7)"
                : "rgba(255, 255, 255, 0.7)",
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 24 : 12),
            paddingBottom: insets.bottom + 60,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => { refetch(); }}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.maxWidthWrapper}>
          {/* Top Bar with Back Button */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={10}
            >
              <ArrowLeft size={18} color={colors.text} />
              <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
            </Pressable>

            <Pressable
              onPress={() => refetch()}
              style={styles.refreshIconBtn}
              hitSlop={10}
            >
              <RefreshCw
                size={16}
                color={colors.textMuted}
                style={isRefetching ? styles.rotating : undefined}
              />
            </Pressable>
          </View>

          {/* User Name & Page Title */}
          <View style={styles.headerTitleRow}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                {username}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Live Route &amp; Location History
              </Text>
            </View>
          </View>

          {/* Date Selector Card */}
          <View
            style={[
              styles.dateCard,
              { backgroundColor: colors.glassBg, borderColor: colors.border },
            ]}
          >
            <View style={styles.dateNavRow}>
              <Pressable
                onPress={handlePrevDay}
                style={styles.dateArrowBtn}
                hitSlop={8}
              >
                <ChevronLeft size={20} color={colors.text} />
              </Pressable>

              <View style={styles.dateCenterInfo}>
                <Calendar size={15} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {isCurrentDayToday
                    ? `Today (${format(selectedDate, "MMM d, yyyy")})`
                    : format(selectedDate, "EEE, MMM d, yyyy")}
                </Text>
              </View>

              <Pressable
                onPress={handleNextDay}
                disabled={isCurrentDayToday}
                style={[
                  styles.dateArrowBtn,
                  isCurrentDayToday && { opacity: 0.3 },
                ]}
                hitSlop={8}
              >
                <ChevronRight size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* Quick date chips */}
            <View style={styles.quickChipsRow}>
              <Pressable
                onPress={handleSetToday}
                style={[
                  styles.quickChip,
                  isCurrentDayToday
                    ? { backgroundColor: colors.accent, borderColor: colors.accent }
                    : { backgroundColor: "rgba(255, 255, 255, 0.06)", borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    { color: isCurrentDayToday ? "#FFFFFF" : colors.textMuted },
                  ]}
                >
                  Today
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSetYesterday}
                style={[
                  styles.quickChip,
                  selectedDateStr === format(subDays(new Date(), 1), "yyyy-MM-dd")
                    ? { backgroundColor: colors.accent, borderColor: colors.accent }
                    : { backgroundColor: "rgba(255, 255, 255, 0.06)", borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    {
                      color:
                        selectedDateStr ===
                        format(subDays(new Date(), 1), "yyyy-MM-dd")
                          ? "#FFFFFF"
                          : colors.textMuted,
                    },
                  ]}
                >
                  Yesterday
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Stats Bar */}
          {stats && (
            <View style={styles.statsRow}>
              <View
                style={[
                  styles.statPill,
                  { backgroundColor: colors.glassBg, borderColor: colors.border },
                ]}
              >
                <Clock size={13} color={colors.accent} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {stats.firstTime} - {stats.lastTime}
                </Text>
              </View>

              <View
                style={[
                  styles.statPill,
                  { backgroundColor: colors.glassBg, borderColor: colors.border },
                ]}
              >
                <Navigation size={13} color="#10B981" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {stats.count} waypoints
                </Text>
              </View>

              {stats.maxSpeedKmh > 0 && (
                <View
                  style={[
                    styles.statPill,
                    { backgroundColor: colors.glassBg, borderColor: colors.border },
                  ]}
                >
                  <Gauge size={13} color="#F59E0B" />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    Top {stats.maxSpeedKmh} km/h
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Interactive Leaflet Map */}
          {isLoading ? (
            <View style={[styles.loadingBox, { borderColor: colors.border }]}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Loading coordinates...
              </Text>
            </View>
          ) : (
            <TrackingMap
              locations={locations as LocationPoint[]}
              username={username}
            />
          )}

          {/* Chronological Coordinates Timeline */}
          {locations.length > 0 && (
            <View style={styles.timelineSection}>
              <Text style={[styles.timelineSectionTitle, { color: colors.textSubtle }]}>
                WAYPOINTS TIMELINE ({locations.length})
              </Text>

              <View style={styles.timelineList}>
                {locations
                  .slice()
                  .reverse()
                  .map((loc, idx) => {
                    const timeStr = format(new Date(loc.timestamp), "hh:mm:ss a");
                    const speedKmh =
                      loc.speed != null ? Math.round(loc.speed * 3.6) : null;

                    return (
                      <View
                        key={loc.id || idx}
                        style={[
                          styles.timelineCard,
                          {
                            backgroundColor: colors.glassBg,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.timelineDot} />
                        <View style={styles.timelineCardBody}>
                          <View style={styles.timelineHeaderRow}>
                            <Text style={[styles.timelineTime, { color: colors.text }]}>
                              {timeStr}
                            </Text>
                            {speedKmh != null && speedKmh > 0 ? (
                              <View style={styles.speedBadge}>
                                <Text style={styles.speedBadgeText}>
                                  {speedKmh} km/h
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <Text
                            style={[styles.timelineCoords, { color: colors.textMuted }]}
                          >
                            {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                            {loc.accuracy ? ` · ±${Math.round(loc.accuracy)}m` : ""}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  backdropOverlay: {
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      } as any,
    }),
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  maxWidthWrapper: {
    width: "100%",
    maxWidth: 672,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 15,
    fontWeight: "600",
  },
  refreshIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  rotating: {
    transform: [{ rotate: "45deg" }],
  },
  headerTitleRow: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  dateCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  dateNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateArrowBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  dateCenterInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: 15,
    fontWeight: "700",
  },
  quickChipsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  loadingBox: {
    width: "100%",
    height: 240,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  timelineSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  timelineSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  timelineList: {
    gap: 8,
  },
  timelineCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
  },
  timelineCardBody: {
    flex: 1,
  },
  timelineHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timelineTime: {
    fontSize: 14,
    fontWeight: "600",
  },
  speedBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  speedBadgeText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "700",
  },
  timelineCoords: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
});
