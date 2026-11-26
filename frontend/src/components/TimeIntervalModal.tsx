import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, RotateCcw, Clock, Check } from "lucide-react-native";
import { useTheme } from "../contexts/ThemeContext";

export function formatMinutes12h(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(totalMinutes)));
  const h24 = Math.floor(clamped / 60);
  const m = clamped % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

interface TimeParts {
  hour12: number; // 1..12
  minute: number; // 0..59
  isPm: boolean;
}

function minutesToParts(totalMinutes: number): TimeParts {
  const clamped = Math.max(0, Math.min(1439, Math.round(totalMinutes)));
  const h24 = Math.floor(clamped / 60);
  const minute = clamped % 60;
  return {
    hour12: h24 % 12 === 0 ? 12 : h24 % 12,
    minute,
    isPm: h24 >= 12,
  };
}

function partsToMinutes(parts: TimeParts): number {
  let h24 = parts.hour12 % 12;
  if (parts.isPm) h24 += 12;
  return h24 * 60 + parts.minute;
}

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => i);

export function ScrollWheelPicker({
  items,
  selectedValue,
  onValueChange,
  colors,
  itemHeight = 38,
  width = 58,
  fontSize = 20,
}: {
  items: number[];
  selectedValue: number;
  onValueChange: (val: number) => void;
  colors: any;
  itemHeight?: number;
  width?: number;
  fontSize?: number;
}) {
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const isDraggingRef = useRef(false);

  const selectedIndex = Math.max(0, items.indexOf(selectedValue));

  useEffect(() => {
    if (isDraggingRef.current) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * itemHeight, animated: false });
    }, 20);
    return () => clearTimeout(timer);
  }, [selectedIndex, itemHeight]);

  const commitOffset = (offsetY: number) => {
    const idx = Math.max(0, Math.min(items.length - 1, Math.round(offsetY / itemHeight)));
    const nextVal = items[idx];
    if (nextVal !== undefined && nextVal !== selectedValue) {
      onValueChange(nextVal);
    }
  };

  const handleScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const vy = e.nativeEvent.velocity?.y ?? 0;
    const y = e.nativeEvent.contentOffset.y;
    if (Math.abs(vy) < 0.05) {
      isDraggingRef.current = false;
      commitOffset(y);
    }
  };

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    isDraggingRef.current = false;
    commitOffset(e.nativeEvent.contentOffset.y);
  };

  return (
    <View style={{ width, height: itemHeight * 3, position: "relative", overflow: "hidden" }}>
      {/* Center selection highlight band */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: itemHeight,
          left: 2,
          right: 2,
          height: itemHeight,
          borderRadius: 10,
          backgroundColor: colors.accent + "1A",
          borderWidth: 1,
          borderColor: colors.accent + "45",
        }}
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onScrollBeginDrag={() => {
          isDraggingRef.current = true;
        }}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        contentContainerStyle={{ paddingVertical: itemHeight }}
      >
        {items.map((item, idx) => {
          const isSelected = item === selectedValue;
          return (
            <Pressable
              key={item}
              onPress={() => {
                scrollRef.current?.scrollTo({ y: idx * itemHeight, animated: true });
                if (item !== selectedValue) onValueChange(item);
              }}
              style={{
                height: itemHeight,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: isSelected ? fontSize : fontSize - 4,
                  fontWeight: isSelected ? "800" : "500",
                  color: isSelected ? colors.text : colors.textMuted,
                  opacity: isSelected ? 1 : 0.48,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {item.toString().padStart(2, "0")}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function TimeStepper({
  label,
  minutes,
  disabled = false,
  onChange,
  colors,
}: {
  label: string;
  minutes: number;
  disabled?: boolean;
  onChange: (newMins: number) => void;
  colors: any;
}) {
  const parts = minutesToParts(minutes);

  const setHour12 = (h12: number) => {
    onChange(partsToMinutes({ ...parts, hour12: h12 }));
  };

  const setMinute = (min: number) => {
    onChange(partsToMinutes({ ...parts, minute: min }));
  };

  const togglePeriod = (pm: boolean) => {
    if (parts.isPm === pm) return;
    onChange(partsToMinutes({ ...parts, isPm: pm }));
  };

  return (
    <View
      style={[
        styles.stepperBox,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
      pointerEvents={disabled ? "none" : "auto"}
    >
      <Text style={[styles.stepperLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.stepperRow}>
        {/* Scrollable Hour */}
        <ScrollWheelPicker
          items={HOURS_12}
          selectedValue={parts.hour12}
          onValueChange={setHour12}
          colors={colors}
        />

        <Text style={[styles.colonText, { color: colors.textMuted }]}>:</Text>

        {/* Scrollable Minute */}
        <ScrollWheelPicker
          items={MINUTES_60}
          selectedValue={parts.minute}
          onValueChange={setMinute}
          colors={colors}
        />

        {/* AM / PM */}
        <View style={styles.periodCol}>
          <Pressable
            onPress={() => togglePeriod(false)}
            style={[
              styles.periodBtn,
              !parts.isPm
                ? { backgroundColor: colors.accent, borderColor: colors.accent }
                : { borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.periodText,
                { color: !parts.isPm ? "#FFFFFF" : colors.textMuted },
              ]}
            >
              AM
            </Text>
          </Pressable>
          <Pressable
            onPress={() => togglePeriod(true)}
            style={[
              styles.periodBtn,
              parts.isPm
                ? { backgroundColor: colors.accent, borderColor: colors.accent }
                : { borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.periodText,
                { color: parts.isPm ? "#FFFFFF" : colors.textMuted },
              ]}
            >
              PM
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

interface TimeIntervalModalProps {
  visible: boolean;
  startMinutes: number;
  endMinutes: number | null;
  isToday: boolean;
  onApply: (startMinutes: number, endMinutes: number | null) => void;
  onReset: () => void;
  onClose: () => void;
}

export function TimeIntervalModal({
  visible,
  startMinutes,
  endMinutes,
  isToday,
  onApply,
  onReset,
  onClose,
}: TimeIntervalModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [draftStart, setDraftStart] = useState(startMinutes);
  const [draftEnd, setDraftEnd] = useState<number>(endMinutes ?? 1439);
  const [isUntilNow, setIsUntilNow] = useState<boolean>(endMinutes === null);

  useEffect(() => {
    if (visible) {
      setDraftStart(startMinutes);
      setIsUntilNow(endMinutes === null);
      if (endMinutes !== null) {
        setDraftEnd(endMinutes);
      } else {
        const nairobiNow = new Date(Date.now() + 3 * 3600 * 1000);
        setDraftEnd(nairobiNow.getUTCHours() * 60 + nairobiNow.getUTCMinutes());
      }
    }
  }, [visible, startMinutes, endMinutes]);

  const applyPreset = (s: number, e: number | null) => {
    setDraftStart(s);
    if (e === null) {
      setIsUntilNow(true);
    } else {
      setIsUntilNow(false);
      setDraftEnd(e);
    }
  };

  const applyLastHours = (hours: number) => {
    const nairobiNow = new Date(Date.now() + 3 * 3600 * 1000);
    const nowMins = nairobiNow.getUTCHours() * 60 + nairobiNow.getUTCMinutes();
    setDraftStart(Math.max(0, nowMins - hours * 60));
    setIsUntilNow(true);
  };

  const handleConfirm = () => {
    const finalEnd = isUntilNow ? null : Math.max(draftStart, draftEnd);
    onApply(draftStart, finalEnd);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={[
          styles.backdrop,
          Platform.OS === "web"
            ? ({ backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" } as any)
            : null,
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.bg,
              borderColor: colors.border,
              marginBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Clock size={18} color={colors.accent} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Time Interval
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
            {/* Quick Presets */}
            <Text style={[styles.sectionLabel, { color: colors.textSubtle }]}>
              QUICK PRESETS
            </Text>
            <View style={styles.presetsGrid}>
              <Pressable
                onPress={() => applyPreset(0, null)}
                style={[
                  styles.presetChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.presetText, { color: colors.text }]}>
                  12:00 AM – Now
                </Text>
              </Pressable>
              {isToday && (
                <>
                  <Pressable
                    onPress={() => applyLastHours(1)}
                    style={[
                      styles.presetChip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.presetText, { color: colors.text }]}>
                      Last 1 Hour
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => applyLastHours(3)}
                    style={[
                      styles.presetChip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.presetText, { color: colors.text }]}>
                      Last 3 Hours
                    </Text>
                  </Pressable>
                </>
              )}
              <Pressable
                onPress={() => applyPreset(360, 720)}
                style={[
                  styles.presetChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.presetText, { color: colors.text }]}>
                  Morning (6 AM–12 PM)
                </Text>
              </Pressable>
              <Pressable
                onPress={() => applyPreset(720, 1080)}
                style={[
                  styles.presetChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.presetText, { color: colors.text }]}>
                  Afternoon (12–6 PM)
                </Text>
              </Pressable>
              <Pressable
                onPress={() => applyPreset(1080, 1439)}
                style={[
                  styles.presetChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.presetText, { color: colors.text }]}>
                  Evening (6 PM–12 AM)
                </Text>
              </Pressable>
            </View>

            {/* Start Time */}
            <TimeStepper
              label="FROM"
              minutes={draftStart}
              onChange={(m) => setDraftStart(m)}
              colors={colors}
            />

            {/* End Time Header + "Until Now" toggle */}
            <View style={styles.untilNowRow}>
              <Text style={[styles.sectionLabel, { color: colors.textSubtle, marginBottom: 0 }]}>
                END TIME
              </Text>
              <Pressable
                onPress={() => setIsUntilNow((v) => !v)}
                style={[
                  styles.untilNowBtn,
                  isUntilNow
                    ? { backgroundColor: colors.accent, borderColor: colors.accent }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.untilNowText,
                    { color: isUntilNow ? "#FFFFFF" : colors.text },
                  ]}
                >
                  {isUntilNow ? "✓ Until Now (Current)" : "Until Now (Current)"}
                </Text>
              </Pressable>
            </View>

            <TimeStepper
              label="TO"
              minutes={draftEnd}
              disabled={isUntilNow}
              onChange={(m) => setDraftEnd(m)}
              colors={colors}
            />
          </ScrollView>

          {/* Summary & Action Buttons */}
          <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
            <Pressable
              onPress={handleReset}
              style={[
                styles.resetBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <RotateCcw size={15} color={colors.text} />
              <Text style={[styles.resetText, { color: colors.text }]}>Reset</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              style={[styles.applyBtn, { backgroundColor: colors.accent }]}
            >
              <Check size={16} color="#FFFFFF" />
              <Text style={styles.applyText}>
                Apply ({formatMinutes12h(draftStart)} –{" "}
                {isUntilNow ? "Now" : formatMinutes12h(Math.max(draftStart, draftEnd))})
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Platform.OS === "web" ? "rgba(0,0,0,0.58)" : "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 12,
    fontWeight: "600",
  },
  stepperBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  stepperLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  wheelCol: {
    alignItems: "center",
    minWidth: 52,
  },
  stepIconBtn: {
    padding: 6,
  },
  wheelValue: {
    fontSize: 24,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  colonText: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 2,
  },
  periodCol: {
    marginLeft: 10,
    gap: 6,
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  periodText: {
    fontSize: 12,
    fontWeight: "700",
  },
  untilNowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  untilNowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  untilNowText: {
    fontSize: 12,
    fontWeight: "600",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetText: {
    fontSize: 13,
    fontWeight: "700",
  },
  applyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  applyText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
});
