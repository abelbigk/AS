import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Calendar,
  Clock,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react-native";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  addYears,
  subYears,
  setMonth,
  setYear,
} from "date-fns";
import { trpc } from "../lib/trpc";
import { useTheme } from "../contexts/ThemeContext";
import { formatMinutes12h } from "./TimeIntervalModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type DeleteMode = "whole-day" | "time-range" | "multi-date";
type CalendarPickerMode = "days" | "months" | "years";

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: number;
  currentDateStr: string; // YYYY-MM-DD currently viewed
  currentStartMinutes: number;
  currentEndMinutes: number | null;
  onDeleted: () => void;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const EMPTY_DATES: string[] = [];

// ─── Mini time stepper ────────────────────────────────────────────────────────

function TimeRow({
  label,
  minutes,
  onChange,
  colors,
}: {
  label: string;
  minutes: number;
  onChange: (m: number) => void;
  colors: any;
}) {
  const hours = Math.floor(minutes / 60) % 12 || 12;
  const mins = minutes % 60;
  const isAm = Math.floor(minutes / 60) < 12;

  const clamp = (v: number) => Math.max(0, Math.min(1439, v));

  return (
    <View style={tsStyles.row}>
      <Text style={[tsStyles.label, { color: colors.textSubtle }]}>{label}</Text>
      <View style={tsStyles.controls}>
        <View style={tsStyles.stepper}>
          <Pressable
            hitSlop={8}
            onPress={() => onChange(clamp(minutes - 60))}
            style={[tsStyles.stepBtn, { borderColor: colors.border }]}
          >
            <ChevronUp size={14} color={colors.text} />
          </Pressable>
          <Text style={[tsStyles.stepVal, { color: colors.text }]}>
            {String(hours).padStart(2, "0")}
          </Text>
          <Pressable
            hitSlop={8}
            onPress={() => onChange(clamp(minutes + 60))}
            style={[tsStyles.stepBtn, { borderColor: colors.border }]}
          >
            <ChevronDown size={14} color={colors.text} />
          </Pressable>
        </View>
        <Text style={[tsStyles.colon, { color: colors.textMuted }]}>:</Text>
        <View style={tsStyles.stepper}>
          <Pressable
            hitSlop={8}
            onPress={() => onChange(clamp(minutes - 1))}
            style={[tsStyles.stepBtn, { borderColor: colors.border }]}
          >
            <ChevronUp size={14} color={colors.text} />
          </Pressable>
          <Text style={[tsStyles.stepVal, { color: colors.text }]}>
            {String(mins).padStart(2, "0")}
          </Text>
          <Pressable
            hitSlop={8}
            onPress={() => onChange(clamp(minutes + 1))}
            style={[tsStyles.stepBtn, { borderColor: colors.border }]}
          >
            <ChevronDown size={14} color={colors.text} />
          </Pressable>
        </View>
        <Pressable
          onPress={() => onChange(isAm ? minutes + 720 : minutes - 720)}
          style={[tsStyles.amPm, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Text style={[tsStyles.amPmText, { color: colors.accent }]}>
            {isAm ? "AM" : "PM"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const tsStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 6 },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  controls: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepper: { alignItems: "center", gap: 2 },
  stepBtn: { borderRadius: 6, borderWidth: 1, padding: 3, alignItems: "center", justifyContent: "center" },
  stepVal: { fontSize: 15, fontWeight: "700", minWidth: 26, textAlign: "center" },
  colon: { fontSize: 16, fontWeight: "700", marginBottom: 1 },
  amPm: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  amPmText: { fontSize: 12, fontWeight: "700" },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minutesToIso(dateStr: string, minutes: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const h = Math.floor(minutes / 60);
  const min = minutes % 60;
  // Convert local UTC+3 time to UTC ISO
  const utcMs = Date.UTC(y, m - 1, d, h, min, 0, 0) - 3 * 3600 * 1000;
  return new Date(utcMs).toISOString();
}

function safeParseDate(dateStr: string): Date {
  try {
    const parsed = parseISO(dateStr);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  } catch {
    return new Date();
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DeleteRecordsModal({
  visible,
  onClose,
  userId,
  currentDateStr,
  currentStartMinutes,
  currentEndMinutes,
  onDeleted,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<DeleteMode>("whole-day");
  const [singleDate, setSingleDate] = useState<string | null>(currentDateStr);
  const [rangeStart, setRangeStart] = useState(currentStartMinutes);
  const [rangeEnd, setRangeEnd] = useState(currentEndMinutes ?? 1439);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

  // Advanced calendar view state
  const [viewDate, setViewDate] = useState<Date>(() => safeParseDate(currentDateStr));
  const [pickerMode, setPickerMode] = useState<CalendarPickerMode>("days");

  // Confirmation & feedback state (cross-platform, works on web & native)
  const [confirming, setConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const utils = trpc.useUtils();

  const {
    data: availableDates = EMPTY_DATES,
    isLoading: datesLoading,
  } = trpc.tracking.getAvailableDates.useQuery(
    { userId },
    { enabled: visible && !!userId }
  );

  // Build fast lookup sets for dates, months (YYYY-MM), and years that actually have DB records
  const { availableDateSet, availableMonthSet, availableYearSet } = useMemo(() => {
    const dSet = new Set<string>();
    const mSet = new Set<string>();
    const ySet = new Set<number>();
    for (const d of availableDates) {
      dSet.add(d);
      mSet.add(d.slice(0, 7));
      const yr = parseInt(d.slice(0, 4), 10);
      if (!Number.isNaN(yr)) ySet.add(yr);
    }
    return { availableDateSet: dSet, availableMonthSet: mSet, availableYearSet: ySet };
  }, [availableDates]);

  // Reset modal state on open
  useEffect(() => {
    if (visible) {
      setRangeStart(currentStartMinutes);
      setRangeEnd(currentEndMinutes ?? 1439);
      setPickerMode("days");
      setConfirming(false);
      setErrorMsg(null);
      setViewDate(safeParseDate(currentDateStr));
    }
  }, [visible, currentDateStr, currentStartMinutes, currentEndMinutes]);

  // Sync default selection once availableDates loads
  useEffect(() => {
    if (!visible) return;
    if (availableDates.length === 0) {
      setSingleDate((prev) => (prev === null ? prev : null));
      setSelectedDates((prev) => (prev.size === 0 ? prev : new Set()));
      return;
    }
    const defaultDate = availableDateSet.has(currentDateStr)
      ? currentDateStr
      : availableDates[availableDates.length - 1];
    setSingleDate((prev) => (prev && availableDateSet.has(prev) ? prev : defaultDate));
    setSelectedDates((prev) => {
      const filtered = Array.from(prev).filter((d) => availableDateSet.has(d));
      if (filtered.length > 0 && filtered.length === prev.size) return prev;
      if (filtered.length > 0) return new Set(filtered);
      return new Set([defaultDate]);
    });
    setViewDate(safeParseDate(defaultDate));
  }, [visible, availableDates, availableDateSet, currentDateStr]);

  const deleteMutation = trpc.tracking.deleteRecords.useMutation({
    onSuccess: () => {
      utils.tracking.getHistory.invalidate();
      utils.tracking.getAvailableDates.invalidate({ userId });
      setConfirming(false);
      onDeleted();
      onClose();
    },
    onError: (err) => {
      setConfirming(false);
      setErrorMsg(err.message || "Failed to delete records.");
    },
    onSettled: () => setLoading(false),
  });

  // Calendar grid computations
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [viewDate]);

  const currentYear = viewDate.getFullYear();
  const startDecadeYear = Math.floor(currentYear / 12) * 12;
  const decadeYears = useMemo(
    () => Array.from({ length: 12 }, (_, i) => startDecadeYear + i),
    [startDecadeYear]
  );

  const handlePrev = () => {
    if (pickerMode === "days") setViewDate((p) => subMonths(p, 1));
    else if (pickerMode === "months") setViewDate((p) => subYears(p, 1));
    else setViewDate((p) => subYears(p, 12));
  };

  const handleNext = () => {
    if (pickerMode === "days") setViewDate((p) => addMonths(p, 1));
    else if (pickerMode === "months") setViewDate((p) => addYears(p, 1));
    else setViewDate((p) => addYears(p, 12));
  };

  const toggleMultiDate = (dateStr: string) => {
    setConfirming(false);
    setErrorMsg(null);
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  const selectAllInMonth = () => {
    const monthPrefix = format(viewDate, "yyyy-MM");
    setConfirming(false);
    setErrorMsg(null);
    setSelectedDates((prev) => {
      const next = new Set(prev);
      for (const d of availableDates) {
        if (d.startsWith(monthPrefix)) next.add(d);
      }
      return next;
    });
  };

  const clearMultiDates = () => {
    setConfirming(false);
    setErrorMsg(null);
    setSelectedDates(new Set());
  };

  // Compute payload + summary
  const getTargetSummary = useCallback(() => {
    if (mode === "whole-day") {
      if (!singleDate) return null;
      return {
        dates: [singleDate],
        startIso: null,
        endIso: null,
        label: `all records on ${singleDate}`,
      };
    }
    if (mode === "time-range") {
      if (!singleDate) return null;
      if (rangeStart >= rangeEnd) return null;
      return {
        dates: [singleDate],
        startIso: minutesToIso(singleDate, rangeStart),
        endIso: minutesToIso(singleDate, rangeEnd),
        label: `records on ${singleDate} (${formatMinutes12h(rangeStart)} – ${formatMinutes12h(rangeEnd)})`,
      };
    }
    const dates = Array.from(selectedDates).sort();
    if (dates.length === 0) return null;
    return {
      dates,
      startIso: null,
      endIso: null,
      label: `all records for ${dates.length} selected date${dates.length !== 1 ? "s" : ""}`,
    };
  }, [mode, singleDate, rangeStart, rangeEnd, selectedDates]);

  const handleRequestDelete = () => {
    setErrorMsg(null);
    if (mode === "time-range" && rangeStart >= rangeEnd) {
      setErrorMsg("Start time must be earlier than end time.");
      return;
    }
    const target = getTargetSummary();
    if (!target) {
      setErrorMsg("Please select at least one date with data.");
      return;
    }
    setConfirming(true);
  };

  const handleConfirmDelete = () => {
    const target = getTargetSummary();
    if (!target) return;
    setErrorMsg(null);
    setLoading(true);
    deleteMutation.mutate({
      userId,
      dates: target.dates,
      startIso: target.startIso,
      endIso: target.endIso,
    });
  };

  const targetSummary = getTargetSummary();
  const canDelete = availableDates.length > 0 && targetSummary !== null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.bg, paddingBottom: insets.bottom + 12 },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Trash2 size={18} color="#EF4444" />
            <Text style={[styles.title, { color: colors.text }]}>Delete Records</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            {/* Mode Selector */}
            <Text style={[styles.sectionLabel, { color: colors.textSubtle }]}>DELETE MODE</Text>
            <View style={[styles.modeRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              {(
                [
                  { key: "whole-day", icon: Calendar, label: "Whole Day" },
                  { key: "time-range", icon: Clock, label: "Time Range" },
                  { key: "multi-date", icon: Trash2, label: "Multi-Date" },
                ] as { key: DeleteMode; icon: any; label: string }[]
              ).map(({ key, icon: Icon, label }) => {
                const active = mode === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      setMode(key);
                      setConfirming(false);
                      setErrorMsg(null);
                    }}
                    style={[styles.modeBtn, active && { backgroundColor: "#EF4444" }]}
                  >
                    <Icon size={13} color={active ? "#fff" : colors.textMuted} />
                    <Text
                      style={[
                        styles.modeBtnText,
                        { color: active ? "#fff" : colors.textMuted },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Advanced Data-Aware Calendar */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.calTopRow}>
                <Text style={[styles.cardLabel, { color: colors.textSubtle, marginBottom: 0 }]}>
                  {mode === "multi-date"
                    ? `SELECT DATES (${selectedDates.size} selected)`
                    : "SELECT DATE"}
                </Text>
                <Text style={[styles.availCount, { color: colors.textMuted }]}>
                  {datesLoading
                    ? "Loading..."
                    : `${availableDates.length} day${availableDates.length !== 1 ? "s" : ""} with data`}
                </Text>
              </View>

              {datesLoading ? (
                <View style={styles.calLoading}>
                  <ActivityIndicator size="small" color={colors.accent} />
                </View>
              ) : availableDates.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No recorded location dates found for this user.
                </Text>
              ) : (
                <>
                  {/* Calendar Navigation Header */}
                  <View style={styles.calNav}>
                    <Pressable
                      onPress={handlePrev}
                      style={[styles.calNavBtn, { borderColor: colors.border }]}
                      hitSlop={6}
                    >
                      <ChevronLeft size={16} color={colors.text} />
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        setPickerMode((m) =>
                          m === "days" ? "months" : m === "months" ? "years" : "days"
                        )
                      }
                      style={[styles.calModePill, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.calModeText, { color: colors.text }]}>
                        {pickerMode === "days"
                          ? format(viewDate, "MMMM yyyy")
                          : pickerMode === "months"
                          ? String(currentYear)
                          : `${startDecadeYear} – ${startDecadeYear + 11}`}
                      </Text>
                      <ChevronDown size={14} color={colors.textMuted} />
                    </Pressable>

                    <Pressable
                      onPress={handleNext}
                      style={[styles.calNavBtn, { borderColor: colors.border }]}
                      hitSlop={6}
                    >
                      <ChevronRight size={16} color={colors.text} />
                    </Pressable>
                  </View>

                  {/* DAYS GRID */}
                  {pickerMode === "days" && (
                    <>
                      <View style={styles.weekdayRow}>
                        {WEEKDAYS.map((wd) => (
                          <Text
                            key={wd}
                            style={[styles.weekdayText, { color: colors.textSubtle }]}
                          >
                            {wd}
                          </Text>
                        ))}
                      </View>
                      <View style={styles.daysGrid}>
                        {calendarDays.map((day) => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const inMonth = isSameMonth(day, viewDate);
                          const hasData = availableDateSet.has(dateStr);
                          const isSelected =
                            mode === "multi-date"
                              ? selectedDates.has(dateStr)
                              : singleDate === dateStr;

                          return (
                            <Pressable
                              key={dateStr}
                              disabled={!hasData}
                              onPress={() => {
                                if (!hasData) return;
                                if (mode === "multi-date") {
                                  toggleMultiDate(dateStr);
                                } else {
                                  setSingleDate(dateStr);
                                  setConfirming(false);
                                  setErrorMsg(null);
                                }
                              }}
                              style={[
                                styles.dayCell,
                                isSelected && styles.dayCellSelected,
                                !isSelected && hasData && {
                                  backgroundColor: "rgba(239, 68, 68, 0.08)",
                                  borderColor: "rgba(239, 68, 68, 0.3)",
                                  borderWidth: 1,
                                },
                                !hasData && styles.dayCellDisabled,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.dayText,
                                  { color: inMonth ? colors.text : colors.textMuted },
                                  !hasData && { color: colors.textMuted },
                                  isSelected && { color: "#FFFFFF", fontWeight: "700" },
                                ]}
                              >
                                {format(day, "d")}
                              </Text>
                              {hasData && !isSelected && <View style={styles.dataDot} />}
                            </Pressable>
                          );
                        })}
                      </View>

                      {mode === "multi-date" && (
                        <View style={styles.multiActions}>
                          <Pressable
                            onPress={selectAllInMonth}
                            style={[styles.miniBtn, { borderColor: colors.border }]}
                          >
                            <Text style={[styles.miniBtnText, { color: colors.text }]}>
                              Select All in {format(viewDate, "MMM")}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={clearMultiDates}
                            style={[styles.miniBtn, { borderColor: colors.border }]}
                          >
                            <Text style={[styles.miniBtnText, { color: colors.textMuted }]}>
                              Clear
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    </>
                  )}

                  {/* MONTHS GRID (only months with data are selectable) */}
                  {pickerMode === "months" && (
                    <View style={styles.grid3x4}>
                      {MONTH_NAMES.map((mName, idx) => {
                        const ym = `${currentYear}-${String(idx + 1).padStart(2, "0")}`;
                        const hasData = availableMonthSet.has(ym);
                        const isCurrent = viewDate.getMonth() === idx;
                        return (
                          <Pressable
                            key={mName}
                            disabled={!hasData}
                            onPress={() => {
                              setViewDate((p) => setMonth(p, idx));
                              setPickerMode("days");
                            }}
                            style={[
                              styles.gridCell,
                              { borderColor: colors.border },
                              isCurrent && hasData && {
                                borderColor: "#EF4444",
                                backgroundColor: "rgba(239,68,68,0.12)",
                              },
                              !hasData && styles.cellDisabled,
                            ]}
                          >
                            <Text
                              style={[
                                styles.gridCellText,
                                { color: hasData ? colors.text : colors.textMuted },
                              ]}
                            >
                              {mName}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  {/* YEARS GRID (only years with data are selectable) */}
                  {pickerMode === "years" && (
                    <View style={styles.grid3x4}>
                      {decadeYears.map((yr) => {
                        const hasData = availableYearSet.has(yr);
                        const isCurrent = currentYear === yr;
                        return (
                          <Pressable
                            key={yr}
                            disabled={!hasData}
                            onPress={() => {
                              setViewDate((p) => setYear(p, yr));
                              setPickerMode("months");
                            }}
                            style={[
                              styles.gridCell,
                              { borderColor: colors.border },
                              isCurrent && hasData && {
                                borderColor: "#EF4444",
                                backgroundColor: "rgba(239,68,68,0.12)",
                              },
                              !hasData && styles.cellDisabled,
                            ]}
                          >
                            <Text
                              style={[
                                styles.gridCellText,
                                { color: hasData ? colors.text : colors.textMuted },
                              ]}
                            >
                              {yr}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </>
              )}

              {/* Time Range Steppers (when mode === "time-range") */}
              {mode === "time-range" && availableDates.length > 0 && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <Text style={[styles.cardLabel, { color: colors.textSubtle }]}>TIME RANGE</Text>
                  <TimeRow
                    label="FROM"
                    minutes={rangeStart}
                    onChange={(m) => {
                      setRangeStart(m);
                      setConfirming(false);
                    }}
                    colors={colors}
                  />
                  <TimeRow
                    label="TO"
                    minutes={rangeEnd}
                    onChange={(m) => {
                      setRangeEnd(m);
                      setConfirming(false);
                    }}
                    colors={colors}
                  />
                </>
              )}

              {targetSummary && (
                <Text style={[styles.hint, { color: colors.textMuted }]}>
                  Target: {targetSummary.label}.
                </Text>
              )}
            </View>

            {/* Inline Error Banner */}
            {errorMsg && (
              <View style={styles.errorBanner}>
                <AlertTriangle size={15} color="#EF4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* Inline Confirmation Banner (works identically on Web, iOS, Android) */}
            {confirming && targetSummary && (
              <View style={styles.confirmBanner}>
                <AlertTriangle size={16} color="#EF4444" />
                <Text style={[styles.confirmText, { color: colors.text }]}>
                  Permanently delete {targetSummary.label}? This cannot be undone.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            {confirming ? (
              <>
                <Pressable
                  onPress={() => setConfirming(false)}
                  disabled={loading}
                  style={[
                    styles.cancelBtn,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirmDelete}
                  disabled={loading}
                  style={[styles.deleteBtn, loading && { opacity: 0.6 }]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Trash2 size={15} color="#fff" />
                      <Text style={styles.deleteBtnText}>Yes, Delete</Text>
                    </>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={onClose}
                  style={[
                    styles.cancelBtn,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleRequestDelete}
                  disabled={!canDelete || loading}
                  style={[styles.deleteBtn, (!canDelete || loading) && { opacity: 0.45 }]}
                >
                  <Trash2 size={15} color="#fff" />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  modeRow: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
  },
  modeBtnText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  calTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  availCount: {
    fontSize: 11,
    fontWeight: "500",
  },
  calLoading: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 12.5,
    textAlign: "center",
    paddingVertical: 18,
  },
  calNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calModePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  calModeText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  weekdayRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.285%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    marginVertical: 1,
  },
  dayCellSelected: {
    backgroundColor: "#EF4444",
  },
  dayCellDisabled: {
    opacity: 0.22,
  },
  dayText: {
    fontSize: 13,
    fontWeight: "600",
  },
  dataDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#EF4444",
    marginTop: 1,
  },
  multiActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  miniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  miniBtnText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  grid3x4: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 6,
  },
  gridCell: {
    width: "31%",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  gridCellText: {
    fontSize: 13,
    fontWeight: "600",
  },
  cellDisabled: {
    opacity: 0.22,
  },
  divider: {
    height: 1,
    marginVertical: 6,
  },
  hint: {
    fontSize: 11.5,
    marginTop: 4,
    lineHeight: 16,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.35)",
  },
  errorText: {
    flex: 1,
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
  },
  confirmBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  confirmText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 17,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
  deleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#EF4444",
  },
  deleteBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
