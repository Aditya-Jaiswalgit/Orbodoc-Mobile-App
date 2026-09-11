import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react-native';

interface InlineCalendarPickerProps {
  value?: string;
  onSelect: (isoDate: string) => void;
  onClose?: () => void;
  minimumDate?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const parseIsoDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** A single visual calendar used for every appointment-date interaction. */
export const InlineCalendarPicker: React.FC<InlineCalendarPickerProps> = ({
  value,
  onSelect,
  onClose,
  minimumDate,
}) => {
  const initialDate = parseIsoDate(value) || new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  );
  const [showMonths, setShowMonths] = useState(false);
  const [showYears, setShowYears] = useState(false);

  useEffect(() => {
    const selected = parseIsoDate(value);
    if (selected) setVisibleMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [value]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const selectedYear = visibleMonth.getFullYear();
    const start = Math.min(currentYear - 5, selectedYear - 2);
    const end = Math.max(currentYear + 6, selectedYear + 3);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [visibleMonth]);

  const calendarDates = useMemo(() => {
    const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [visibleMonth]);

  const selectDate = (date: Date) => {
    const isoDate = toIsoDate(date);
    if (minimumDate && isoDate < minimumDate) return;
    onSelect(isoDate);
    onClose?.();
  };

  return (
    <View style={styles.card} accessibilityRole="none">
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Previous month"
          style={styles.arrowButton}
          onPress={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}>
          <ChevronLeft color="#64748b" size={17} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.monthControl}
          onPress={() => {
            setShowMonths((visible) => !visible);
            setShowYears(false);
          }}>
          <Text style={styles.controlText}>{MONTHS[visibleMonth.getMonth()]}</Text>
          <ChevronsUpDown color="#94a3b8" size={14} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.yearControl}
          onPress={() => {
            setShowYears((visible) => !visible);
            setShowMonths(false);
          }}>
          <Text style={styles.controlText}>{visibleMonth.getFullYear()}</Text>
          <ChevronsUpDown color="#94a3b8" size={14} />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel="Next month"
          style={styles.arrowButton}
          onPress={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}>
          <ChevronRight color="#64748b" size={17} />
        </TouchableOpacity>
      </View>

      {showMonths && (
        <View style={styles.optionGrid}>
          {MONTHS.map((month, monthIndex) => (
            <TouchableOpacity
              key={month}
              style={[styles.optionChip, monthIndex === visibleMonth.getMonth() && styles.optionChipActive]}
              onPress={() => {
                setVisibleMonth(new Date(visibleMonth.getFullYear(), monthIndex, 1));
                setShowMonths(false);
              }}>
              <Text style={[styles.optionChipText, monthIndex === visibleMonth.getMonth() && styles.optionChipTextActive]}>{month.slice(0, 3)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showYears && (
        <View style={styles.optionGrid}>
          {yearOptions.map((year) => (
            <TouchableOpacity
              key={year}
              style={[styles.yearChip, year === visibleMonth.getFullYear() && styles.optionChipActive]}
              onPress={() => {
                setVisibleMonth(new Date(year, visibleMonth.getMonth(), 1));
                setShowYears(false);
              }}>
              <Text style={[styles.optionChipText, year === visibleMonth.getFullYear() && styles.optionChipTextActive]}>{year}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.weekdayRow}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}
      </View>

      <View style={styles.daysGrid}>
        {calendarDates.map((date) => {
          const isoDate = toIsoDate(date);
          const selected = isoDate === value;
          const outsideMonth = date.getMonth() !== visibleMonth.getMonth();
          const disabled = Boolean(minimumDate && isoDate < minimumDate);
          return (
            <TouchableOpacity
              key={isoDate}
              disabled={disabled}
              style={[styles.dayButton, selected && styles.dayButtonSelected]}
              onPress={() => selectDate(date)}>
              <Text style={[
                styles.dayText,
                outsideMonth && styles.dayTextOutside,
                disabled && styles.dayTextDisabled,
                selected && styles.dayTextSelected,
              ]}>{date.getDate()}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  card: { width: '100%', backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 10, marginTop: 8, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 5, zIndex: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  arrowButton: { width: 25, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: '#edf1f5' },
  monthControl: { flex: 1.2, height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 9, borderRadius: 9, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  yearControl: { flex: 0.85, height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 9, borderRadius: 9, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  controlText: { color: '#334155', fontSize: 12, fontWeight: '600' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10, padding: 7, borderRadius: 10, backgroundColor: '#f8fafc' },
  optionChip: { width: '22.8%', alignItems: 'center', paddingVertical: 6, borderRadius: 7 },
  yearChip: { width: '30.7%', alignItems: 'center', paddingVertical: 6, borderRadius: 7 },
  optionChipActive: { backgroundColor: '#d9f5f2' },
  optionChipText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  optionChipTextActive: { color: '#0f9488', fontWeight: '800' },
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekday: { width: '14.285%', textAlign: 'center', fontSize: 10.5, color: '#94a3b8', fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayButton: { width: '14.285%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  dayButtonSelected: { backgroundColor: '#effcfb', borderWidth: 1.5, borderColor: '#14b8a6' },
  dayText: { fontSize: 11.5, color: '#475569', fontWeight: '500' },
  dayTextOutside: { color: '#cbd5e1' },
  dayTextDisabled: { color: '#dbe4ec' },
  dayTextSelected: { color: '#0f9488', fontWeight: '800' },
});
