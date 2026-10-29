import { colors, radii, spacing, typography } from '../../theme/tokens';
// src/components/common/CustomCalendarPicker.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppModal } from './AppModal';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, TextInput, useWindowDimensions } from 'react-native';
import { LiquidBorderScrollView } from './LiquidBorderScrollView';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, Check, Search } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

interface CustomCalendarPickerProps {
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  label?: string;
  triggerStyle?: any;
  triggerTextStyle?: any;
  iconColor?: string;
  icon?: LucideIcon;
  placeholder?: string;
  formatTriggerDate?: (date: Date) => string;
  onOpen?: () => void;
  fromYear?: number;
  toYear?: number;
  minimumDate?: Date;
  maximumDate?: Date;
  isDateDisabled?: (date: Date) => boolean;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
type MeasurableView = {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void;
};
type ScrollableView = { scrollTo: (options: { y: number; animated?: boolean }) => void };

export const CustomCalendarPicker: React.FC<CustomCalendarPickerProps> = ({
  selectedDate: externalDate,
  onDateChange,
  triggerStyle,
  triggerTextStyle,
  iconColor = colors.primary,
  icon: TriggerIcon = CalendarIcon,
  placeholder = 'Select date',
  formatTriggerDate,
  onOpen,
  fromYear = 2020,
  toYear = 2035,
  minimumDate,
  maximumDate,
  isDateDisabled,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(externalDate || new Date());
  const [viewYear, setViewYear] = useState<number>(currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(currentDate.getMonth());
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const [dropdownType, setDropdownType] = useState<'month' | 'year' | null>(null);
  const [yearSearch, setYearSearch] = useState('');
  const [dropdownAnchor, setDropdownAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const monthSelectorRef = useRef<MeasurableView | null>(null);
  const yearSelectorRef = useRef<MeasurableView | null>(null);
  const dropdownListRef = useRef<ScrollableView | null>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  useEffect(() => {
    if (externalDate) {
      setCurrentDate(externalDate);
      setViewYear(externalDate.getFullYear());
      setViewMonth(externalDate.getMonth());
    }
  }, [externalDate]);

  // Keep the year list bounded to the range required by the caller.
  const yearsList = useMemo(() => {
    const list: number[] = [];
    for (let y = fromYear; y <= toYear; y++) {
      list.push(y);
    }
    return list;
  }, [fromYear, toYear]);
  const filteredYears = useMemo(() => {
    const query = yearSearch.trim();
    return query ? yearsList.filter(year => String(year).includes(query)) : yearsList;
  }, [yearSearch, yearsList]);
  const filteredMonths = useMemo(() => {
    const query = yearSearch.trim().toLowerCase();
    return query ? MONTHS.filter(month => month.toLowerCase().includes(query)) : MONTHS;
  }, [yearSearch]);

  const openDropdown = (type: 'month' | 'year') => {
    const selector = type === 'year' ? yearSelectorRef.current : monthSelectorRef.current;
    selector?.measureInWindow((x, y, width, height) => {
      setDropdownAnchor({ x, y, width, height });
      setYearSearch('');
      setDropdownType(type);
    });
  };

  useEffect(() => {
    if (!dropdownType) return;
    const selectedIndex = dropdownType === 'year'
      ? filteredYears.findIndex(year => year === viewYear)
      : filteredMonths.findIndex(month => MONTHS[viewMonth] === month);
    if (selectedIndex < 0) return;
    const timer = setTimeout(() => {
      dropdownListRef.current?.scrollTo({ y: Math.max(0, selectedIndex * 38 - 38), animated: false });
    }, 60);
    return () => clearTimeout(timer);
  }, [dropdownType, filteredMonths, filteredYears, viewMonth, viewYear]);

  // Format header trigger button string e.g. "Sunday, September 20, 2026"
  const formattedTriggerText = useMemo(() => {
    if (!externalDate) return placeholder;
    if (formatTriggerDate) return formatTriggerDate(externalDate);
    return externalDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [externalDate, formatTriggerDate, placeholder]);

  // Calendar Grid Calculation
  const calendarDays = useMemo(() => {
    const days: { date: Date; isCurrentMonth: boolean; dayNum: number }[] = [];
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    // Previous month trailing days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(viewYear, viewMonth - 1, daysInPrevMonth - i);
      days.push({ date: prevDate, isCurrentMonth: false, dayNum: prevDate.getDate() });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const currDate = new Date(viewYear, viewMonth, d);
      days.push({ date: currDate, isCurrentMonth: true, dayNum: d });
    }

    // Next month leading days (fill up 35 or 42 grid cells)
    const remaining = 35 - days.length;
    const totalCells = remaining >= 0 ? 35 : 42;
    const nextMonthDaysNeeded = totalCells - days.length;

    for (let n = 1; n <= nextMonthDaysNeeded; n++) {
      const nextDate = new Date(viewYear, viewMonth + 1, n);
      days.push({ date: nextDate, isCurrentMonth: false, dayNum: n });
    }

    return days;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (minimumDate && viewYear === fromYear && viewMonth === 0) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (maximumDate && viewYear === toYear && viewMonth === 11) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (dayObj: { date: Date; isCurrentMonth: boolean }) => {
    if ((minimumDate && dayObj.date < minimumDate) || (maximumDate && dayObj.date > maximumDate) || isDateDisabled?.(dayObj.date)) return;
    setCurrentDate(dayObj.date);
    if (onDateChange) {
      onDateChange(dayObj.date);
    }
    setIsOpen(false);
  };

  return (
    <View style={{ zIndex: 50 }}>
      {/* TRIGGER BUTTON (Exact Match to Screenshot 4) */}
      <TouchableOpacity
        style={[styles.triggerBox, triggerStyle]}
        onPress={() => {
          setViewYear(currentDate.getFullYear());
          setViewMonth(currentDate.getMonth());
          if (!isOpen) onOpen?.();
          setIsOpen(!isOpen);
        }}
        activeOpacity={0.8}
      >
        <TriggerIcon color={iconColor} size={16} style={styles.triggerIcon} />
        <Text style={[styles.triggerText, triggerTextStyle]} numberOfLines={1}>{formattedTriggerText}</Text>
      </TouchableOpacity>

      {/* POPUP CALENDAR MODAL / OVERLAY */}
      <AppModal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => { setDropdownType(null); setIsOpen(false); }} />
              <View style={[styles.calendarCard, { width: Math.min(320, screenWidth - 40) }]}>
                {/* CALENDAR HEADER ROW */}
                <View style={styles.calendarHeaderRow}>
                  {/* Prev Month Button */}
                  <TouchableOpacity style={styles.arrowBtn} onPress={handlePrevMonth}>
                    <ChevronLeft color={colors.muted} size={18} />
                  </TouchableOpacity>

                  {/* Month Selector Dropdown Trigger */}
                  <View ref={node => { monthSelectorRef.current = node; }} collapsable={false} style={{ zIndex: 20 }}>
                    <TouchableOpacity
                      style={styles.selectorPill}
                      onPress={() => openDropdown('month')}
                    >
                      <Text style={styles.selectorPillText}>{MONTHS[viewMonth]}</Text>
                      <ChevronDown color={colors.muted} size={14} style={{ marginLeft: spacing.xs }} />
                    </TouchableOpacity>

                  </View>

                  {/* Year Selector Dropdown Trigger */}
                  <View ref={node => { yearSelectorRef.current = node; }} collapsable={false} style={{ zIndex: 20 }}>
                    <TouchableOpacity
                      style={styles.selectorPill}
                      onPress={() => openDropdown('year')}
                    >
                      <Text style={styles.selectorPillText}>{viewYear}</Text>
                      <ChevronDown color={colors.muted} size={14} style={{ marginLeft: spacing.xs }} />
                    </TouchableOpacity>

                  </View>

                  {/* Next Month Button */}
                  <TouchableOpacity style={styles.arrowBtn} onPress={handleNextMonth}>
                    <ChevronRight color={colors.muted} size={18} />
                  </TouchableOpacity>
                </View>

                {/* WEEKDAYS HEADER ROW */}
                <View style={styles.weekdaysRow}>
                  {WEEKDAYS.map((w) => (
                    <Text key={w} style={styles.weekdayText}>
                      {w}
                    </Text>
                  ))}
                </View>

                {/* DAYS GRID */}
                <View style={styles.daysGrid}>
                  {calendarDays.map((item, index) => {
                    const disabled = (minimumDate && item.date < minimumDate) || (maximumDate && item.date > maximumDate) || isDateDisabled?.(item.date);
                    const isSelected =
                      currentDate.getDate() === item.date.getDate() &&
                      currentDate.getMonth() === item.date.getMonth() &&
                      currentDate.getFullYear() === item.date.getFullYear();

                    return (
                      <TouchableOpacity
                        key={index}
                        style={styles.dayCellContainer}
                        onPress={() => handleSelectDay(item)}
                        activeOpacity={0.7}
                        disabled={Boolean(disabled)}
                      >
                        <View
                          style={[
                            styles.dayCell,
                            isSelected && styles.dayCellSelected,
                            disabled && styles.dayCellDisabled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              !item.isCurrentMonth && styles.dayTextOtherMonth,
                              isSelected && styles.dayTextSelected,
                              disabled && styles.dayTextDisabled,
                            ]}
                          >
                            {item.dayNum}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
          </View>
      </AppModal>
      <AppModal
        visible={dropdownType !== null}
        transparent
        animationType="none"
        onRequestClose={() => setDropdownType(null)}
      >
        <View style={styles.dropdownModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDropdownType(null)} />
          <View
            style={[
              styles.dropdownOverlayMenu,
              {
                left: Math.max(8, Math.min(dropdownAnchor.x, screenWidth - Math.min(dropdownType === 'month' ? 208 : 176, screenWidth - 16) - 8)),
                top: Math.min(
                  dropdownAnchor.y + dropdownAnchor.height + 6,
                  Math.max(8, screenHeight - (dropdownType === 'year' ? 320 : 290) - 8),
                ),
                width: Math.min(dropdownType === 'month' ? 208 : 176, screenWidth - 16),
              },
            ]}
          >
            {dropdownType ? (
              <View style={styles.yearSearchWrap}>
                <Search size={15} color={colors.subtle} />
                <TextInput
                  value={yearSearch}
                  onChangeText={setYearSearch}
                  placeholder={`Search ${dropdownType}...`}
                  placeholderTextColor={colors.subtle}
                  keyboardType={dropdownType === 'year' ? 'number-pad' : 'default'}
                  style={styles.yearSearchInput}
                />
              </View>
            ) : null}
            <LiquidBorderScrollView
              ref={node => { dropdownListRef.current = node; }}
              style={[styles.dropdownList, { height: dropdownType === 'year' ? 250 : 240 }]}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              onContentSizeChange={() => {
                const selectedIndex = dropdownType === 'year'
                  ? filteredYears.findIndex(year => year === viewYear)
                  : filteredMonths.findIndex(month => month === MONTHS[viewMonth]);
                if (selectedIndex >= 0) dropdownListRef.current?.scrollTo({ y: Math.max(0, selectedIndex * 38 - 38), animated: false });
              }}
            >
              {(dropdownType === 'year' ? filteredYears : filteredMonths).map(item => {
                const label = String(item);
                const active = dropdownType === 'year' ? Number(item) === viewYear : MONTHS[viewMonth] === label;
                return (
                  <TouchableOpacity
                    key={label}
                    style={[styles.dropdownOptionItem, active && styles.dropdownOptionActive]}
                    onPress={() => {
                      if (dropdownType === 'year') setViewYear(Number(item));
                      else setViewMonth(MONTHS.indexOf(label));
                      setDropdownType(null);
                    }}
                  >
                    {active ? <Check size={15} color={colors.primary} /> : <View style={styles.dropdownCheckSpace} />}
                    <Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </LiquidBorderScrollView>
          </View>
        </View>
      </AppModal>
    </View>
  );
};

const styles = StyleSheet.create({
  triggerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4F1', // Light cyan tint from screenshot 4
    borderWidth: 1,
    borderColor: colors.mintBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  triggerText: {
    fontFamily: typography.family, color: colors.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },

  calendarCard: {
    width: 320,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },

  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  selectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.tiny,
  },
  selectorPillText: {
    fontFamily: typography.family, color: colors.text,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },

  dropdownOverlayMenu: {
    position: 'absolute',
    top: 36,
    left: 0,
    minWidth: 120,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    paddingVertical: spacing.xs,
    zIndex: 99,
  },
  dropdownModalOverlay: { flex: 1 },
  dropdownOptionItem: {
    height: 38,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dropdownCheckSpace: { width: 15 },
  dropdownList: { flexGrow: 0 },
  yearSearchWrap: {
    height: 38,
    marginHorizontal: spacing.tiny,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.tiny,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  yearSearchInput: { fontFamily: typography.family, flex: 1, padding: 0, color: colors.foreground, fontSize: typography.size.sm },
  dropdownOptionActive: {
    backgroundColor: '#E6F4F1',
  },
  dropdownOptionText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    color: colors.foreground,
  },
  dropdownOptionTextActive: {
    color: colors.primary,
    fontWeight: typography.weight.bold,
  },

  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  weekdayText: {
    fontFamily: typography.family, width: 36,
    textAlign: 'center',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.muted,
  },

  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCellContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayCell: {
    width: 32,
    height: 32,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: colors.primary, // Exact teal highlight from screenshot 4
  },
  triggerIcon: { marginRight: spacing.sm },
  dayCellDisabled: { opacity: 0.35 },

  dayText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    color: colors.text,
    fontWeight: typography.weight.medium,
  },
  dayTextOtherMonth: {
    color: colors.input, // Faded gray for prev/next month days
  },
  dayTextSelected: {
    color: colors.surface,
    fontWeight: typography.weight.bold,
  },
  dayTextDisabled: { color: colors.subtle },
});

export default CustomCalendarPicker;
