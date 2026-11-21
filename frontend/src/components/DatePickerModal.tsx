import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ChevronDown,
} from "lucide-react-native";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addYears,
  subYears,
  setMonth,
  setYear,
  isAfter,
  startOfDay,
  subDays,
} from "date-fns";
import { useTheme } from "../contexts/ThemeContext";

interface DatePickerModalProps {
  visible: boolean;
  selectedDate: Date;
  onClose: () => void;
  onSelectDate: (dateStr: string) => void;
  maxDate?: Date;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function DatePickerModal({
  visible,
  selectedDate,
  onClose,
  onSelectDate,
  maxDate,
}: DatePickerModalProps) {
  const { colors, theme } = useTheme();

  // Current view date (which month/year is currently being viewed)
  const [viewDate, setViewDate] = useState<Date>(selectedDate);

  // View mode: "days" | "months" | "years"
  const [pickerMode, setPickerMode] = useState<"days" | "months" | "years">("days");

  // Keep viewDate updated when modal opens with a new selectedDate
  React.useEffect(() => {
    if (visible) {
      setViewDate(selectedDate);
      setPickerMode("days");
    }
  }, [visible, selectedDate]);

  const maxDay = useMemo(() => (maxDate ? startOfDay(maxDate) : undefined), [maxDate]);

  // Calendar days grid calculation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [viewDate]);

  // Decade years calculation for "years" mode (12 years displayed)
  const currentYear = viewDate.getFullYear();
  const startDecadeYear = Math.floor(currentYear / 12) * 12;
  const decadeYears = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => startDecadeYear + i);
  }, [startDecadeYear]);

  // Navigation handlers
  const handlePrev = () => {
    if (pickerMode === "days") {
      setViewDate((prev) => subMonths(prev, 1));
    } else if (pickerMode === "months") {
      setViewDate((prev) => subYears(prev, 1));
    } else if (pickerMode === "years") {
      setViewDate((prev) => subYears(prev, 12));
    }
  };

  const handleNext = () => {
    if (pickerMode === "days") {
      setViewDate((prev) => addMonths(prev, 1));
    } else if (pickerMode === "months") {
      setViewDate((prev) => addYears(prev, 1));
    } else if (pickerMode === "years") {
      setViewDate((prev) => addYears(prev, 12));
    }
  };

  const handleSelectDay = (day: Date) => {
    if (maxDay && isAfter(startOfDay(day), maxDay)) return;
    onSelectDate(format(day, "yyyy-MM-dd"));
    onClose();
  };

  const handleSelectMonth = (monthIdx: number) => {
    setViewDate((prev) => setMonth(prev, monthIdx));
    setPickerMode("days");
  };

  const handleSelectYear = (year: number) => {
    setViewDate((prev) => setYear(prev, year));
    setPickerMode("months");
  };

  const handleQuickToday = () => {
    const today = new Date();
    onSelectDate(format(today, "yyyy-MM-dd"));
    onClose();
  };

  const handleQuickYesterday = () => {
    const yesterday = subDays(new Date(), 1);
    onSelectDate(format(yesterday, "yyyy-MM-dd"));
    onClose();
  };

  if (!visible) return null;

  const isLight = theme === "light";
  const modalBg = isLight ? "#FFFFFF" : colors.surface;
  const headerBg = isLight ? "#F8FAFC" : "rgba(255, 255, 255, 0.04)";
  const cellMuted = isLight ? "#94A3B8" : "rgba(255, 255, 255, 0.25)";

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.dialogCard,
            { backgroundColor: modalBg, borderColor: colors.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={[styles.dialogHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleWrap}>
              <CalendarIcon size={18} color={colors.accent} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>Choose Date</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <X size={18} color={colors.text} />
            </Pressable>
          </View>

          {/* Month / Year Navigator Bar */}
          <View style={[styles.navBar, { backgroundColor: headerBg }]}>
            <Pressable onPress={handlePrev} style={styles.navArrowBtn} hitSlop={8}>
              <ChevronLeft size={20} color={colors.text} />
            </Pressable>

            {/* Clickable Month & Year Header */}
            <Pressable
              onPress={() => {
                if (pickerMode === "days") setPickerMode("months");
                else if (pickerMode === "months") setPickerMode("years");
                else setPickerMode("days");
              }}
              style={styles.navTitleBtn}
            >
              <Text style={[styles.navTitleText, { color: colors.text }]}>
                {pickerMode === "years"
                  ? `${startDecadeYear} – ${startDecadeYear + 11}`
                  : pickerMode === "months"
                  ? format(viewDate, "yyyy")
                  : format(viewDate, "MMMM yyyy")}
              </Text>
              <ChevronDown
                size={14}
                color={colors.accent}
                style={{
                  transform: [
                    { rotate: pickerMode === "days" ? "0deg" : "180deg" },
                  ],
                }}
              />
            </Pressable>

            <Pressable onPress={handleNext} style={styles.navArrowBtn} hitSlop={8}>
              <ChevronRight size={20} color={colors.text} />
            </Pressable>
          </View>

          {/* Calendar Body */}
          <View style={styles.pickerBody}>
            {/* 1. DAYS VIEW */}
            {pickerMode === "days" && (
              <View>
                {/* Weekdays Row */}
                <View style={styles.weekdaysRow}>
                  {WEEKDAYS.map((wd) => (
                    <Text key={wd} style={[styles.weekdayText, { color: cellMuted }]}>
                      {wd}
                    </Text>
                  ))}
                </View>

                {/* Days Grid (7 columns) */}
                <View style={styles.daysGrid}>
                  {calendarDays.map((day) => {
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, viewDate);
                    const isTodayDay = isToday(day);
                    const isDisabled = !!maxDay && isAfter(startOfDay(day), maxDay);

                    return (
                      <Pressable
                        key={day.toISOString()}
                        onPress={() => !isDisabled && handleSelectDay(day)}
                        disabled={isDisabled}
                        style={[
                          styles.dayCell,
                          isSelected && [
                            styles.dayCellSelected,
                            { backgroundColor: colors.accent },
                          ],
                          isTodayDay && !isSelected && styles.dayCellToday,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            {
                              color: isSelected
                                ? "#FFFFFF"
                                : !isCurrentMonth
                                ? cellMuted
                                : colors.text,
                              fontWeight: isSelected ? "700" : isTodayDay ? "600" : "400",
                              opacity: isDisabled ? 0.25 : 1,
                            },
                          ]}
                        >
                          {format(day, "d")}
                        </Text>
                        {isTodayDay && !isSelected && (
                          <View
                            style={[
                              styles.todayDot,
                              { backgroundColor: colors.accent },
                            ]}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 2. MONTHS VIEW (12 month chips) */}
            {pickerMode === "months" && (
              <View style={styles.monthGrid}>
                {MONTH_NAMES.map((mName, idx) => {
                  const isCurrentSelectedMonth =
                    viewDate.getMonth() === idx &&
                    viewDate.getFullYear() === selectedDate.getFullYear();

                  return (
                    <Pressable
                      key={mName}
                      onPress={() => handleSelectMonth(idx)}
                      style={[
                        styles.monthCell,
                        isCurrentSelectedMonth
                          ? [styles.monthCellSelected, { backgroundColor: colors.accent }]
                          : { backgroundColor: isLight ? "#F1F5F9" : "rgba(255, 255, 255, 0.05)" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.monthText,
                          {
                            color: isCurrentSelectedMonth ? "#FFFFFF" : colors.text,
                            fontWeight: isCurrentSelectedMonth ? "700" : "500",
                          },
                        ]}
                      >
                        {mName}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* 3. YEARS VIEW (12 years grid) */}
            {pickerMode === "years" && (
              <View style={styles.yearGrid}>
                {decadeYears.map((yr) => {
                  const isCurrentSelectedYear = yr === selectedDate.getFullYear();
                  const isFutureYear = maxDay ? yr > maxDay.getFullYear() : false;

                  return (
                    <Pressable
                      key={yr}
                      onPress={() => !isFutureYear && handleSelectYear(yr)}
                      disabled={isFutureYear}
                      style={[
                        styles.yearCell,
                        isCurrentSelectedYear
                          ? [styles.yearCellSelected, { backgroundColor: colors.accent }]
                          : { backgroundColor: isLight ? "#F1F5F9" : "rgba(255, 255, 255, 0.05)" },
                        isFutureYear && { opacity: 0.25 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.yearText,
                          {
                            color: isCurrentSelectedYear ? "#FFFFFF" : colors.text,
                            fontWeight: isCurrentSelectedYear ? "700" : "500",
                          },
                        ]}
                      >
                        {yr}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Quick Actions Footer */}
          <View style={[styles.dialogFooter, { borderTopColor: colors.border }]}>
            <View style={styles.quickShortcuts}>
              <Pressable
                onPress={handleQuickToday}
                style={[
                  styles.shortcutBtn,
                  { backgroundColor: isLight ? "#F1F5F9" : "rgba(255, 255, 255, 0.07)" },
                ]}
              >
                <Text style={[styles.shortcutBtnText, { color: colors.accent }]}>Today</Text>
              </Pressable>
              <Pressable
                onPress={handleQuickYesterday}
                style={[
                  styles.shortcutBtn,
                  { backgroundColor: isLight ? "#F1F5F9" : "rgba(255, 255, 255, 0.07)" },
                ]}
              >
                <Text style={[styles.shortcutBtnText, { color: colors.textMuted }]}>Yesterday</Text>
              </Pressable>
            </View>

            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  dialogHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  navArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  navTitleText: {
    fontSize: 15,
    fontWeight: "700",
  },
  pickerBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 280,
    justifyContent: "center",
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  weekdayText: {
    width: 38,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
    position: "relative",
  },
  dayCellSelected: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.4)",
  },
  dayText: {
    fontSize: 14,
  },
  todayDot: {
    position: "absolute",
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  // Month view
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 10,
  },
  monthCell: {
    width: "30%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  monthCellSelected: {},
  monthText: {
    fontSize: 14,
  },
  // Year view
  yearGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 10,
  },
  yearCell: {
    width: "30%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  yearCellSelected: {},
  yearText: {
    fontSize: 14,
  },
  dialogFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  quickShortcuts: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shortcutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  shortcutBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
