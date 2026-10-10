import React, { useEffect, useMemo, useState } from 'react';
import { AppModal } from '../../../components/common/AppModal';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import {
  Activity,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  FileText,
  IndianRupee,
  Lightbulb,
  NotebookPen,
  RotateCcw,
  Search,
  Stethoscope,
  UserRound,
  X,
} from 'lucide-react-native';
import {
  getPatientConsultationsApi,
  PatientConsultation,
} from '../../../api/patientApi';
import { PatientModel } from '../../../types/clinicTypes';
import { showErrorToast } from '../../../utils/toast';

interface Props {
  visible: boolean;
  patient: PatientModel | null;
  token: string | null;
  onClose: () => void;
}

type StatusFilter = 'all' | 'complete' | 'pending' | 'cancelled';
type DateFilter = 'all' | '30-days' | '90-days' | 'this-year';
type FilterMenu = 'status' | 'date' | null;
const PAGE_SIZE = 10;
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'complete', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'cancelled', label: 'Cancelled' },
];
const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'All dates' },
  { value: '30-days', label: 'Last 30 days' },
  { value: '90-days', label: 'Last 90 days' },
  { value: 'this-year', label: 'This year' },
];

const hasData = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value !== 'string') return true;
  return !['', '-', 'null', 'undefined'].includes(value.trim().toLowerCase());
};

function normalizeRows(value: unknown): PatientConsultation[] {
  if (Array.isArray(value)) return value as PatientConsultation[];
  if (value && typeof value === 'object') {
    const data = value as Record<string, unknown>;
    if (Array.isArray(data.consultations))
      return data.consultations as PatientConsultation[];
  }
  return [];
}

function getStatusGroup(status?: string | null): StatusFilter {
  const value = String(status || '')
    .trim()
    .toLowerCase();
  if (['approved', 'completed', 'complete'].includes(value)) return 'complete';
  if (['cancelled', 'canceled', 'rejected'].includes(value)) return 'cancelled';
  return 'pending';
}

function parseDate(value?: string | null) {
  if (!hasData(value)) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function matchesDateFilter(
  value: string | null | undefined,
  filter: DateFilter,
) {
  if (filter === 'all') return true;
  const date = parseDate(value);
  if (!date) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (filter === 'this-year') return date.getFullYear() === today.getFullYear();
  const earliest = new Date(today);
  earliest.setDate(earliest.getDate() - (filter === '30-days' ? 30 : 90));
  earliest.setHours(0, 0, 0, 0);
  return date >= earliest && date <= today;
}

function formatDateTime(dateValue?: string | null, timeValue?: string | null) {
  const date = parseDate(dateValue);
  const dateLabel = date
    ? new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date)
    : hasData(dateValue)
    ? String(dateValue)
    : '';
  let timeLabel = '';
  if (hasData(timeValue)) {
    const [hours, minutes] = String(timeValue).split(':').map(Number);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      timeLabel = new Intl.DateTimeFormat('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(2000, 0, 1, hours, minutes));
    } else timeLabel = String(timeValue);
  }
  return [dateLabel, timeLabel].filter(Boolean).join(' • ');
}

function formatFee(value?: string | number | null) {
  if (!hasData(value)) return null;
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(amount)
    : String(value);
}

function DetailRow({
  label,
  value,
  Icon,
  accent = false,
}: {
  label: string;
  value?: unknown;
  Icon: React.ComponentType<any>;
  accent?: boolean;
}) {
  if (!hasData(value)) return null;
  return (
    <View style={styles.detailRow}>
      <Icon size={15} color={accent ? '#0D9488' : '#0D9488'} />
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, accent && styles.accentValue]}>
          {String(value)}
        </Text>
      </View>
    </View>
  );
}

function ClinicalNote({
  label,
  value,
  Icon,
}: {
  label: string;
  value?: unknown;
  Icon: React.ComponentType<any>;
}) {
  if (!hasData(value)) return null;
  return (
    <View style={styles.noteRow}>
      <View style={styles.noteLabel}>
        <Icon size={14} color="#0D9488" />
        <Text style={styles.noteLabelText}>{label}</Text>
      </View>
      <Text style={styles.noteValue}>{String(value)}</Text>
    </View>
  );
}

export function ConsultationHistoryModal({
  visible,
  patient,
  token,
  onClose,
}: Props) {
  const { height } = useWindowDimensions();
  const [consultations, setConsultations] = useState<PatientConsultation[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [openMenu, setOpenMenu] = useState<FilterMenu>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!visible || !patient?.id || !token) return;
    let cancelled = false;
    setLoading(true);
    setSearch('');
    setStatusFilter('all');
    setDateFilter('all');
    setOpenMenu(null);
    setPage(1);
    getPatientConsultationsApi(patient.id, token)
      .then(response => {
        if (!response.success)
          throw new Error(
            response.message || 'Failed to load consultation history.',
          );
        if (!cancelled) setConsultations(normalizeRows(response.data));
      })
      .catch((error: any) => {
        if (!cancelled) {
          setConsultations([]);
          showErrorToast(
            'Consultation history',
            error?.message || 'Failed to load consultation history.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patient?.id, token, visible]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return consultations.filter(item => {
      const searchable = [
        item.doctor_name,
        item.specialization,
        item.reason,
        item.status,
        item.diagnosis,
        item.symptoms,
        item.advice,
        item.notes,
        item.prescription_id,
        item.appointment_date,
      ]
        .filter(hasData)
        .join(' ')
        .toLowerCase();
      return (
        (!query || searchable.includes(query)) &&
        (statusFilter === 'all' ||
          getStatusGroup(item.status) === statusFilter) &&
        matchesDateFilter(item.appointment_date, dateFilter)
      );
    });
  }, [consultations, dateFilter, search, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleRows = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );
  const hasFilters =
    Boolean(search.trim()) || statusFilter !== 'all' || dateFilter !== 'all';
  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFilter('all');
    setPage(1);
    setOpenMenu(null);
  };

  useEffect(() => {
    setPage(1);
  }, [dateFilter, search, statusFilter]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const renderFilterMenu = (kind: Exclude<FilterMenu, null>) => {
    const options = kind === 'status' ? STATUS_OPTIONS : DATE_OPTIONS;
    const selectedValue = kind === 'status' ? statusFilter : dateFilter;
    return (
      <View style={[styles.filterMenu, kind === 'date' && styles.dateMenu]}>
        {options.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.filterOption,
              selectedValue === option.value && styles.filterOptionSelected,
            ]}
            onPress={() => {
              if (kind === 'status')
                setStatusFilter(option.value as StatusFilter);
              else setDateFilter(option.value as DateFilter);
              setOpenMenu(null);
            }}
          >
            <Text
              style={[
                styles.filterOptionText,
                selectedValue === option.value &&
                  styles.filterOptionTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <AppModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modal,
            {
              height: Math.min(height - 24, 780),
              maxHeight: Math.min(height - 24, 780),
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Stethoscope size={21} color="#FFFFFF" />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Consultation History</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {patient?.full_name || 'Patient'}
                {patient?.patient_code ? ` • ${patient.patient_code}` : ''}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.iconButton}
              accessibilityLabel="Close consultation history"
            >
              <X size={19} color="#64748B" />
            </TouchableOpacity>
          </View>

          {!loading && consultations.length > 0 ? (
            <View style={styles.filters}>
              <View style={styles.searchBox}>
                <Search size={15} color="#718096" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search doctor, reason, diagnosis..."
                  placeholderTextColor="#718096"
                  style={styles.searchInput}
                  returnKeyType="search"
                />
              </View>
              <View style={styles.filterRow}>
                <View style={styles.filterCell}>
                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() =>
                      setOpenMenu(openMenu === 'status' ? null : 'status')
                    }
                  >
                    <Text style={styles.selectText} numberOfLines={1}>
                      {
                        STATUS_OPTIONS.find(
                          option => option.value === statusFilter,
                        )?.label
                      }
                    </Text>
                    <ChevronDown size={15} color="#718096" />
                  </TouchableOpacity>
                  {openMenu === 'status' ? renderFilterMenu('status') : null}
                </View>
                <View style={styles.filterCell}>
                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() =>
                      setOpenMenu(openMenu === 'date' ? null : 'date')
                    }
                  >
                    <Text style={styles.selectText} numberOfLines={1}>
                      {
                        DATE_OPTIONS.find(option => option.value === dateFilter)
                          ?.label
                      }
                    </Text>
                    <ChevronDown size={15} color="#718096" />
                  </TouchableOpacity>
                  {openMenu === 'date' ? renderFilterMenu('date') : null}
                </View>
              </View>
              {hasFilters ? (
                <View style={styles.resultBar}>
                  <Text style={styles.resultText}>
                    {filtered.length} of {consultations.length} consultations
                    match
                  </Text>
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={resetFilters}
                  >
                    <RotateCcw size={12} color="#0D9488" />
                    <Text style={styles.resetText}>Reset</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : null}

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#0D9488" />
                <Text style={styles.emptyTitle}>Loading consultations...</Text>
                <Text style={styles.emptyText}>
                  Fetching visit and consultation history.
                </Text>
              </View>
            ) : consultations.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Stethoscope size={26} color="#0D9488" />
                </View>
                <Text style={styles.emptyTitle}>No consultations yet</Text>
                <Text style={styles.emptyText}>
                  Consultation history will appear here.
                </Text>
              </View>
            ) : filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Search size={25} color="#64748B" />
                </View>
                <Text style={styles.emptyTitle}>No matching consultations</Text>
                <Text style={styles.emptyText}>
                  Try changing your search or filters.
                </Text>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={resetFilters}
                >
                  <RotateCcw size={14} color="#0D9488" />
                  <Text style={styles.clearText}>Clear filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              visibleRows.map((item, index) => {
                const dateTime = formatDateTime(
                  item.appointment_date,
                  item.appointment_time,
                );
                const statusLabel = String(item.status || '').replace(
                  /_/g,
                  ' ',
                );
                const statusGroup = getStatusGroup(item.status);
                return (
                  <View
                    key={`${item.appointment_id}-${index}`}
                    style={styles.consultationCard}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.doctorIcon}>
                        <UserRound size={18} color="#0D9488" />
                      </View>
                      <View style={styles.doctorCopy}>
                        <Text style={styles.doctorName} numberOfLines={1}>
                          {item.doctor_name || 'Doctor'}
                        </Text>
                        {hasData(item.specialization) ? (
                          <Text style={styles.specialization} numberOfLines={1}>
                            {item.specialization}
                          </Text>
                        ) : null}
                        {hasData(item.status) ? (
                          <View
                            style={[
                              styles.statusPill,
                              statusGroup === 'complete'
                                ? styles.completePill
                                : statusGroup === 'cancelled'
                                ? styles.cancelledPill
                                : styles.pendingPill,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                statusGroup === 'complete'
                                  ? styles.completeText
                                  : statusGroup === 'cancelled'
                                  ? styles.cancelledText
                                  : styles.pendingText,
                              ]}
                            >
                              {statusLabel}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.details}>
                      <DetailRow
                        label="Date & Time"
                        value={dateTime}
                        Icon={CalendarDays}
                      />
                      <DetailRow
                        label="Consultation Fee"
                        value={formatFee(item.consultation_fee)}
                        Icon={IndianRupee}
                        accent
                      />
                      <DetailRow
                        label="Reason"
                        value={item.reason}
                        Icon={FileText}
                      />
                      <DetailRow
                        label="Prescription ID"
                        value={item.prescription_id}
                        Icon={ClipboardPlus}
                      />
                      {[
                        {
                          label: 'Symptoms',
                          value: item.symptoms,
                          Icon: Activity,
                        },
                        {
                          label: 'Diagnosis',
                          value: item.diagnosis,
                          Icon: Stethoscope,
                        },
                        {
                          label: 'Advice',
                          value: item.advice,
                          Icon: Lightbulb,
                        },
                        {
                          label: 'Notes',
                          value: item.notes,
                          Icon: NotebookPen,
                        },
                      ].some(note => hasData(note.value)) ? (
                        <View style={styles.clinicalNotes}>
                          <ClinicalNote
                            label="Symptoms"
                            value={item.symptoms}
                            Icon={Activity}
                          />
                          <ClinicalNote
                            label="Diagnosis"
                            value={item.diagnosis}
                            Icon={Stethoscope}
                          />
                          <ClinicalNote
                            label="Advice"
                            value={item.advice}
                            Icon={Lightbulb}
                          />
                          <ClinicalNote
                            label="Notes"
                            value={item.notes}
                            Icon={NotebookPen}
                          />
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.footer}>
            {filtered.length > PAGE_SIZE ? (
              <View style={styles.pagination}>
                <Text style={styles.pageLabel}>
                  Page {page} of {totalPages}
                </Text>
                <View style={styles.pageButtons}>
                  <TouchableOpacity
                    disabled={page <= 1}
                    style={[
                      styles.pageButton,
                      page <= 1 && styles.pageButtonDisabled,
                    ]}
                    onPress={() => setPage(value => Math.max(1, value - 1))}
                  >
                    <ChevronLeft
                      size={17}
                      color={page <= 1 ? '#AAB6C4' : '#334155'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={page >= totalPages}
                    style={[
                      styles.pageButton,
                      page >= totalPages && styles.pageButtonDisabled,
                    ]}
                    onPress={() =>
                      setPage(value => Math.min(totalPages, value + 1))
                    }
                  >
                    <ChevronRight
                      size={17}
                      color={page >= totalPages ? '#AAB6C4' : '#334155'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={16} color="#FFFFFF" />
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  modal: {
    width: '100%',
    maxWidth: 560,
    flex: 1,
    backgroundColor: '#F4F6F7',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DCE5EA',
    elevation: 18,
  },
  header: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#EAF3F2',
    borderBottomWidth: 1,
    borderColor: '#DDE7E8',
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22A99D',
  },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: '#1F2937', fontSize: 17, fontWeight: '800' },
  subtitle: { color: '#718096', fontSize: 11, marginTop: 3 },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: {
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 9,
    gap: 7,
    backgroundColor: '#FAFBFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 5,
  },
  searchBox: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DEE6ED',
    backgroundColor: '#FFFFFF',
  },
  searchInput: { flex: 1, paddingVertical: 6, color: '#334155', fontSize: 12 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterCell: { flex: 1, position: 'relative', zIndex: 10 },
  selectButton: {
    minHeight: 37,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#DEE6ED',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  selectText: { flex: 1, color: '#334155', fontSize: 11 },
  filterMenu: {
    position: 'absolute',
    top: 41,
    left: 0,
    width: '100%',
    padding: 4,
    borderWidth: 1,
    borderColor: '#DDE5EA',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    elevation: 8,
    zIndex: 30,
  },
  dateMenu: { left: undefined, right: 0 },
  filterOption: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: 7,
  },
  filterOptionSelected: { backgroundColor: '#DDF5F2' },
  filterOptionText: { color: '#334155', fontSize: 11 },
  filterOptionTextSelected: { color: '#0D9488', fontWeight: '700' },
  resultBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultText: { color: '#718096', fontSize: 10 },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  resetText: { color: '#0D9488', fontSize: 10, fontWeight: '700' },
  list: { flex: 1 },
  listContent: { padding: 11, gap: 11, flexGrow: 1 },
  consultationCard: {
    overflow: 'hidden',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  cardHeader: {
    minHeight: 103,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 13,
    backgroundColor: '#F0F8F7',
    borderBottomWidth: 1,
    borderColor: '#E7EEEE',
  },
  doctorIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4EAE7',
  },
  doctorCopy: { flex: 1, minWidth: 0 },
  doctorName: { color: '#1F2937', fontSize: 13, fontWeight: '800' },
  specialization: { marginTop: 3, color: '#718096', fontSize: 10 },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 9,
    maxWidth: 105,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: { fontSize: 9, fontWeight: '800', textTransform: 'capitalize' },
  completePill: { backgroundColor: '#D1FAE5' },
  completeText: { color: '#047857' },
  cancelledPill: { backgroundColor: '#FFE4E6' },
  cancelledText: { color: '#BE123C' },
  pendingPill: { backgroundColor: '#FEF3C7' },
  pendingText: { color: '#B45309' },
  details: { padding: 10, gap: 7 },
  detailRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: '#F7F9FA',
  },
  detailCopy: { flex: 1 },
  detailLabel: { color: '#718096', fontSize: 10 },
  detailValue: {
    marginTop: 2,
    color: '#1F2937',
    fontSize: 11,
    fontWeight: '700',
  },
  accentValue: { color: '#0D9488' },
  clinicalNotes: {
    gap: 7,
    marginTop: 2,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E6ECEF',
  },
  noteRow: {
    padding: 9,
    borderWidth: 1,
    borderColor: '#E6ECEF',
    borderRadius: 10,
    backgroundColor: '#FCFDFD',
  },
  noteLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noteLabelText: { color: '#334155', fontSize: 10, fontWeight: '800' },
  noteValue: { marginTop: 5, color: '#64748B', fontSize: 11, lineHeight: 16 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 35,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#DDF5F2',
  },
  emptyTitle: {
    marginTop: 12,
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 5,
    color: '#718096',
    fontSize: 11,
    textAlign: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 9,
  },
  clearText: { color: '#0D9488', fontSize: 11, fontWeight: '700' },
  footer: {
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: 11,
    gap: 8,
    backgroundColor: '#FAFBFC',
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageLabel: { color: '#64748B', fontSize: 10, fontWeight: '600' },
  pageButtons: { flexDirection: 'row', gap: 7 },
  pageButton: {
    width: 30,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE5EA',
    backgroundColor: '#FFFFFF',
  },
  pageButtonDisabled: { opacity: 0.55 },
  closeButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 10,
    backgroundColor: '#22A99D',
  },
  closeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
