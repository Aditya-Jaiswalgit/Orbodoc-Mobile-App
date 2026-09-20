// src/components/common/CustomCalendarPicker.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react-native';

interface CustomCalendarPickerProps {
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  label?: string;
  triggerStyle?: any;
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

export const CustomCalendarPicker: React.FC<CustomCalendarPickerProps> = ({
  selectedDate: externalDate,
  onDateChange,
  triggerStyle,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(externalDate || new Date(2026, 8, 20)); // Sep 20, 2026 default
  const [viewYear, setViewYear] = useState<number>(currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(currentDate.getMonth());
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const [showMonthDropdown, setShowMonthDropdown] = useState<boolean>(false);
  const [showYearDropdown, setShowYearDropdown] = useState<boolean>(false);

  // Generate years list (e.g. 2020 - 2030)
  const yearsList = useMemo(() => {
    const list: number[] = [];
    for (let y = 2020; y <= 2035; y++) {
      list.push(y);
    }
    return list;
  }, []);

  // Format header trigger button string e.g. "Sunday, September 20, 2026"
  const formattedTriggerText = useMemo(() => {
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = MONTHS[currentDate.getMonth()];
    const dayNum = currentDate.getDate();
    const year = currentDate.getFullYear();
    return `${dayName}, ${monthName} ${dayNum}, ${year}`;
  }, [currentDate]);

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
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (dayObj: { date: Date; isCurrentMonth: boolean }) => {
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
          setIsOpen(!isOpen);
        }}
        activeOpacity={0.8}
      >
        <CalendarIcon color="#0D9488" size={16} style={{ marginRight: 8 }} />
        <Text style={styles.triggerText}>{formattedTriggerText}</Text>
      </TouchableOpacity>

      {/* POPUP CALENDAR MODAL / OVERLAY */}
      <Modal visible={isOpen} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.calendarCard}>
                {/* CALENDAR HEADER ROW */}
                <View style={styles.calendarHeaderRow}>
                  {/* Prev Month Button */}
                  <TouchableOpacity style={styles.arrowBtn} onPress={handlePrevMonth}>
                    <ChevronLeft color="#64748B" size={18} />
                  </TouchableOpacity>

                  {/* Month Selector Dropdown Trigger */}
                  <View style={{ position: 'relative', zIndex: 20 }}>
                    <TouchableOpacity
                      style={styles.selectorPill}
                      onPress={() => {
                        setShowYearDropdown(false);
                        setShowMonthDropdown(!showMonthDropdown);
                      }}
                    >
                      <Text style={styles.selectorPillText}>{MONTHS[viewMonth]}</Text>
                      <ChevronDown color="#64748B" size={14} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>

                    {showMonthDropdown && (
                      <View style={styles.dropdownOverlayMenu}>
                        <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                          {MONTHS.map((m, idx) => (
                            <TouchableOpacity
                              key={m}
                              style={[
                                styles.dropdownOptionItem,
                                viewMonth === idx && styles.dropdownOptionActive,
                              ]}
                              onPress={() => {
                                setViewMonth(idx);
                                setShowMonthDropdown(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.dropdownOptionText,
                                  viewMonth === idx && styles.dropdownOptionTextActive,
                                ]}
                              >
                                {m}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Year Selector Dropdown Trigger */}
                  <View style={{ position: 'relative', zIndex: 20 }}>
                    <TouchableOpacity
                      style={styles.selectorPill}
                      onPress={() => {
                        setShowMonthDropdown(false);
                        setShowYearDropdown(!showYearDropdown);
                      }}
                    >
                      <Text style={styles.selectorPillText}>{viewYear}</Text>
                      <ChevronDown color="#64748B" size={14} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>

                    {showYearDropdown && (
                      <View style={styles.dropdownOverlayMenu}>
                        <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                          {yearsList.map((y) => (
                            <TouchableOpacity
                              key={y}
                              style={[
                                styles.dropdownOptionItem,
                                viewYear === y && styles.dropdownOptionActive,
                              ]}
                              onPress={() => {
                                setViewYear(y);
                                setShowYearDropdown(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.dropdownOptionText,
                                  viewYear === y && styles.dropdownOptionTextActive,
                                ]}
                              >
                                {y}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Next Month Button */}
                  <TouchableOpacity style={styles.arrowBtn} onPress={handleNextMonth}>
                    <ChevronRight color="#64748B" size={18} />
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
                      >
                        <View
                          style={[
                            styles.dayCell,
                            isSelected && styles.dayCellSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              !item.isCurrentMonth && styles.dayTextOtherMonth,
                              isSelected && styles.dayTextSelected,
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
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  triggerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4F1', // Light cyan tint from screenshot 4
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  triggerText: {
    color: '#0D9488',
    fontSize: 14,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  calendarCard: {
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  selectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectorPillText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },

  dropdownOverlayMenu: {
    position: 'absolute',
    top: 36,
    left: 0,
    minWidth: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    paddingVertical: 4,
    zIndex: 99,
  },
  dropdownOptionItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownOptionActive: {
    backgroundColor: '#E6F4F1',
  },
  dropdownOptionText: {
    fontSize: 13,
    color: '#334155',
  },
  dropdownOptionTextActive: {
    color: '#0D9488',
    fontWeight: '700',
  },

  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekdayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
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
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: '#0D9488', // Exact teal highlight from screenshot 4
  },

  dayText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  dayTextOtherMonth: {
    color: '#CBD5E1', // Faded gray for prev/next month days
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default CustomCalendarPicker;
