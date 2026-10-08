import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronRight as OpenDetails,
  ClipboardList,
  Clock3,
  FileText,
  Lightbulb,
  Pill,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Stethoscope,
  TestTube2,
  UserRound,
  X,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  getPrescriptionByIdApi,
  getPrescriptionsApi,
} from '../../../api/prescriptionApi';
import { PatientModel } from '../../../types/clinicTypes';
import { showErrorToast } from '../../../utils/toast';

type PrescriptionListItem = {
  id: string | number;
  appointment_id?: string | number;
  diagnosis?: string | null;
  symptoms?: string | null;
  advice?: string | null;
  status?: string | null;
  created_at?: string | null;
  doctor_name?: string | null;
  medicine_count?: number;
  test_count?: number;
};
type PrescriptionDetail = PrescriptionListItem & {
  patient_name?: string;
  follow_up_days?: number | null;
  items?: Array<{
    id?: string | number;
    medicine_name?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity?: number;
  }>;
  tests?: Array<{
    id?: string | number;
    test_name?: string;
    test_code?: string | null;
    test_type?: string | null;
    description?: string | null;
    urgency?: string | null;
    status?: string | null;
    sample_type?: string | null;
    expected_at?: string | null;
    price?: number | string | null;
  }>;
};
type DateFilter = 'all' | '30-days' | '90-days' | 'this-year';
type FilterMenu = 'status' | 'date' | null;
type Props = {
  visible: boolean;
  patient: PatientModel | null;
  token: string | null;
  onClose: () => void;
};
const PAGE_SIZE = 10;
const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'All dates' },
  { value: '30-days', label: 'Last 30 days' },
  { value: '90-days', label: 'Last 90 days' },
  { value: 'this-year', label: 'This year' },
];
const hasValue = (value: unknown) =>
  value !== null &&
  value !== undefined &&
  String(value).trim() !== '' &&
  String(value).toLowerCase() !== 'null';
const fallbackStatus = (status?: string | null) =>
  String(status || 'final')
    .trim()
    .toLowerCase() || 'final';

function normalizeRows(data: any): PrescriptionListItem[] {
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.prescriptions)) return data.prescriptions;
  return [];
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function matchesDate(value: string | null | undefined, filter: DateFilter) {
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

function formatStatus(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function formatDate(value?: string | null) {
  const parsed = parseDate(value);
  if (!parsed) return value || 'Date not recorded';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(parsed);
}

function formatCompactDate(value?: string | null) {
  const parsed = parseDate(value);
  return parsed
    ? new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(parsed)
    : value || '-';
}

function MetaChip({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value?: unknown;
  emphasis?: boolean;
}) {
  if (!hasValue(value)) return null;
  return (
    <View style={[styles.metaChip, emphasis && styles.metaChipEmphasis]}>
      <Text style={[styles.metaLabel, emphasis && styles.metaLabelEmphasis]}>
        {label}:
      </Text>
      <Text style={[styles.metaValue, emphasis && styles.metaValueEmphasis]}>
        {String(value)}
      </Text>
    </View>
  );
}

function ClinicalDetail({
  title,
  value,
  Icon,
}: {
  title: string;
  value?: string | null;
  Icon: React.ComponentType<any>;
}) {
  return (
    <View style={styles.clinicalDetail}>
      <View style={styles.eyebrowRow}>
        <Icon size={13} color="#0D9488" />
        <Text style={styles.eyebrow}>{title}</Text>
      </View>
      <Text style={styles.clinicalValue}>{value || 'Not recorded'}</Text>
    </View>
  );
}

export function PatientPrescriptionModal({
  visible,
  patient,
  token,
  onClose,
}: Props) {
  const { height } = useWindowDimensions();
  const [prescriptions, setPrescriptions] = useState<PrescriptionListItem[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PrescriptionDetail | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [menu, setMenu] = useState<FilterMenu>(null);
  const [view, setView] = useState<'history' | 'details'>('history');
  const [page, setPage] = useState(1);
  const [requestError, setRequestError] = useState('');

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(prescriptions.map(row => fallbackStatus(row.status))),
      ).sort(),
    [prescriptions],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return prescriptions.filter(row => {
      const searchable = [
        row.id,
        row.doctor_name,
        row.diagnosis,
        row.symptoms,
        row.advice,
        fallbackStatus(row.status),
        row.created_at,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return (
        (!query || searchable.includes(query)) &&
        (statusFilter === 'all' ||
          fallbackStatus(row.status) === statusFilter) &&
        matchesDate(row.created_at, dateFilter)
      );
    });
  }, [dateFilter, prescriptions, search, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );
  const hasFilters =
    Boolean(search.trim()) || statusFilter !== 'all' || dateFilter !== 'all';

  useEffect(() => {
    if (!visible || !patient?.id || !token) return;
    let cancelled = false;
    setLoading(true);
    setRequestError('');
    setPrescriptions([]);
    setSelectedId(null);
    setDetail(null);
    setSearch('');
    setStatusFilter('all');
    setDateFilter('all');
    setMenu(null);
    setView('history');
    setPage(1);
    getPrescriptionsApi(token, { patient_id: patient.id, limit: 100 })
      .then(response => {
        if (!response.success)
          throw new Error(response.message || 'Failed to load prescriptions.');
        if (!cancelled) setPrescriptions(normalizeRows(response.data));
      })
      .catch((error: any) => {
        if (!cancelled) {
          setRequestError(error?.message || 'Failed to load prescriptions.');
          showErrorToast(
            'Prescriptions',
            error?.message || 'Failed to load prescriptions.',
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

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateFilter]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  useEffect(() => {
    if (selectedId && !filtered.some(row => String(row.id) === selectedId)) {
      setSelectedId(null);
      setDetail(null);
      setView('history');
    }
  }, [filtered, selectedId]);

  const selectPrescription = async (id: string | number) => {
    if (!token) return;
    setSelectedId(String(id));
    setDetail(null);
    setView('details');
    setDetailLoading(true);
    setRequestError('');
    try {
      const response = await getPrescriptionByIdApi(token, Number(id));
      if (!response.success)
        throw new Error(
          response.message || 'Failed to load prescription details.',
        );
      const data: any = response.data;
      setDetail(data?.prescription || data || null);
    } catch (error: any) {
      setView('history');
      setRequestError(error?.message || 'Failed to load prescription details.');
      showErrorToast(
        'Prescription details',
        error?.message || 'Failed to load prescription details.',
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFilter('all');
    setPage(1);
    setMenu(null);
  };
  const statusLabel = (status: string) =>
    status === 'all' ? 'All Status' : formatStatus(status);

  const renderPicker = (kind: Exclude<FilterMenu, null>) => {
    const options =
      kind === 'status'
        ? [
            { value: 'all', label: 'All Status' },
            ...statusOptions.map(value => ({
              value,
              label: formatStatus(value),
            })),
          ]
        : DATE_OPTIONS;
    const selectedValue = kind === 'status' ? statusFilter : dateFilter;
    return (
      <View
        style={[
          styles.dropdownMenu,
          kind === 'date' && styles.dropdownMenuRight,
        ]}
      >
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: 180 }}
        >
          {options.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.dropdownOption,
                selectedValue === option.value && styles.dropdownOptionActive,
              ]}
              onPress={() => {
                kind === 'status'
                  ? setStatusFilter(option.value)
                  : setDateFilter(option.value as DateFilter);
                setMenu(null);
              }}
            >
              <Text
                style={[
                  styles.dropdownText,
                  selectedValue === option.value && styles.dropdownTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={[styles.modal, { height: Math.min(height - 24, 820) }]}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Pill size={22} color="#07111F" />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Prescriptions</Text>
              <Text style={styles.patientName} numberOfLines={1}>
                {patient?.full_name || 'Patient'}
                {patient?.patient_code ? ` · ${patient.patient_code}` : ''}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Close prescriptions"
              onPress={onClose}
              style={styles.closeIcon}
            >
              <X size={19} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              onPress={() => setView('history')}
              style={[styles.tab, view === 'history' && styles.tabActive]}
            >
              <ClipboardList
                size={14}
                color={view === 'history' ? '#FFFFFF' : '#64748B'}
              />
              <Text
                style={[
                  styles.tabText,
                  view === 'history' && styles.tabTextActive,
                ]}
              >
                History
              </Text>
              <Text
                style={[
                  styles.tabCount,
                  view === 'history' && styles.tabCountActive,
                ]}
              >
                {filtered.length}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setView('details')}
              style={[styles.tab, view === 'details' && styles.tabActive]}
            >
              <FileText
                size={14}
                color={view === 'details' ? '#FFFFFF' : '#64748B'}
              />
              <Text
                style={[
                  styles.tabText,
                  view === 'details' && styles.tabTextActive,
                ]}
              >
                Details
              </Text>
            </TouchableOpacity>
          </View>

          {view === 'history' ? (
            <View style={styles.historyPanel}>
              <View style={styles.historyHeading}>
                <View>
                  <Text style={styles.historyTitle}>Prescription history</Text>
                  <Text style={styles.historyHint}>
                    Select a record to view details
                  </Text>
                </View>
                <Text style={styles.countBadge}>{filtered.length}</Text>
              </View>
              {!loading && prescriptions.length > 0 ? (
                <View style={styles.filters}>
                  <View style={styles.searchBox}>
                    <Search size={15} color="#94A3B8" />
                    <TextInput
                      value={search}
                      onChangeText={setSearch}
                      placeholder="Search prescriptions..."
                      placeholderTextColor="#94A3B8"
                      style={styles.searchInput}
                      returnKeyType="search"
                    />
                  </View>
                  <View style={styles.filterRow}>
                    <View style={styles.filterCell}>
                      <TouchableOpacity
                        style={styles.filterButton}
                        onPress={() =>
                          setMenu(menu === 'status' ? null : 'status')
                        }
                      >
                        <Text style={styles.filterText} numberOfLines={1}>
                          {statusLabel(statusFilter)}
                        </Text>
                        <ChevronDown size={14} color="#64748B" />
                      </TouchableOpacity>
                      {menu === 'status' ? renderPicker('status') : null}
                    </View>
                    <View style={styles.filterCell}>
                      <TouchableOpacity
                        style={styles.filterButton}
                        onPress={() => setMenu(menu === 'date' ? null : 'date')}
                      >
                        <Text style={styles.filterText} numberOfLines={1}>
                          {
                            DATE_OPTIONS.find(
                              option => option.value === dateFilter,
                            )?.label
                          }
                        </Text>
                        <ChevronDown size={14} color="#64748B" />
                      </TouchableOpacity>
                      {menu === 'date' ? renderPicker('date') : null}
                    </View>
                  </View>
                  {hasFilters ? (
                    <View style={styles.filterHintRow}>
                      <Text style={styles.helperText}>
                        {filtered.length} of {prescriptions.length} match
                      </Text>
                      <TouchableOpacity
                        style={styles.resetAction}
                        onPress={resetFilters}
                      >
                        <RotateCcw size={11} color="#0D9488" />
                        <Text style={styles.resetText}>Reset</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.helperRow}>
                      <SlidersHorizontal size={11} color="#94A3B8" />
                      <Text style={styles.helperText}>
                        Filter by status or date
                      </Text>
                    </View>
                  )}
                </View>
              ) : null}
              <ScrollView
                style={styles.historyList}
                contentContainerStyle={styles.historyListContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              >
                {loading ? (
                  <View style={styles.emptyState}>
                    <ActivityIndicator color="#0D9488" size="large" />
                    <Text style={styles.emptyTitle}>
                      Loading prescriptions...
                    </Text>
                    <Text style={styles.emptyHint}>
                      Fetching patient prescription history.
                    </Text>
                  </View>
                ) : requestError && prescriptions.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>
                      Unable to load prescriptions
                    </Text>
                    <Text style={styles.emptyHint}>{requestError}</Text>
                  </View>
                ) : prescriptions.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                      <Pill size={24} color="#94A3B8" />
                    </View>
                    <Text style={styles.emptyTitle}>
                      No prescriptions found
                    </Text>
                    <Text style={styles.emptyHint}>
                      New prescriptions will appear here.
                    </Text>
                  </View>
                ) : filtered.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                      <Search size={23} color="#94A3B8" />
                    </View>
                    <Text style={styles.emptyTitle}>
                      No matching prescriptions
                    </Text>
                    <Text style={styles.emptyHint}>
                      Try changing your search or filters.
                    </Text>
                    <TouchableOpacity
                      style={styles.clearFilters}
                      onPress={resetFilters}
                    >
                      <RotateCcw size={13} color="#0D9488" />
                      <Text style={styles.clearFiltersText}>Clear filters</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  pageRows.map(row => {
                    const status = fallbackStatus(row.status);
                    return (
                      <TouchableOpacity
                        key={String(row.id)}
                        onPress={() => void selectPrescription(row.id)}
                        style={[
                          styles.prescriptionCard,
                          selectedId === String(row.id) &&
                            styles.prescriptionCardActive,
                        ]}
                      >
                        <View style={styles.prescriptionTop}>
                          <View style={styles.rxTitleRow}>
                            <FileText size={14} color="#0D9488" />
                            <Text style={styles.rxTitle}>Rx #{row.id}</Text>
                          </View>
                          <Text style={styles.finalBadge}>
                            {formatStatus(status)}
                          </Text>
                        </View>
                        <View style={styles.prescriptionDateRow}>
                          <CalendarDays size={12} color="#64748B" />
                          <Text style={styles.prescriptionDate}>
                            {formatDate(row.created_at)}
                          </Text>
                        </View>
                        <View style={styles.diagnosisRow}>
                          <Text
                            style={styles.prescriptionDiagnosis}
                            numberOfLines={1}
                          >
                            {row.diagnosis || row.symptoms || 'No diagnosis'}
                          </Text>
                          <OpenDetails size={16} color="#CBD5E1" />
                        </View>
                        {Number(row.medicine_count || 0) > 0 ||
                        Number(row.test_count || 0) > 0 ? (
                          <View style={styles.countsRow}>
                            {Number(row.medicine_count || 0) > 0 ? (
                              <View style={styles.countItem}>
                                <Pill size={11} color="#0D9488" />
                                <Text style={styles.itemCount}>
                                  {Number(row.medicine_count)} medicines
                                </Text>
                              </View>
                            ) : null}
                            {Number(row.test_count || 0) > 0 ? (
                              <View style={styles.countItem}>
                                <TestTube2 size={11} color="#0284C7" />
                                <Text style={styles.itemCount}>
                                  {Number(row.test_count)} tests
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })
                )}
                {filtered.length > PAGE_SIZE ? (
                  <View style={styles.pagination}>
                    <Text style={styles.pageInfo}>
                      {(page - 1) * PAGE_SIZE + 1}–
                      {Math.min(page * PAGE_SIZE, filtered.length)} of{' '}
                      {filtered.length}
                    </Text>
                    <View style={styles.pageActions}>
                      <TouchableOpacity
                        disabled={page === 1}
                        style={styles.pageButton}
                        onPress={() => setPage(value => Math.max(1, value - 1))}
                      >
                        <ChevronLeft
                          size={15}
                          color={page === 1 ? '#CBD5E1' : '#475569'}
                        />
                      </TouchableOpacity>
                      <Text style={styles.pageNumber}>
                        {page}/{totalPages}
                      </Text>
                      <TouchableOpacity
                        disabled={page === totalPages}
                        style={styles.pageButton}
                        onPress={() =>
                          setPage(value => Math.min(totalPages, value + 1))
                        }
                      >
                        <ChevronRight
                          size={15}
                          color={page === totalPages ? '#CBD5E1' : '#475569'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          ) : (
            <ScrollView
              style={styles.detailsPanel}
              contentContainerStyle={styles.detailsContent}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              {detailLoading ? (
                <View style={styles.detailEmpty}>
                  <ActivityIndicator size="large" color="#0D9488" />
                  <Text style={styles.emptyTitle}>
                    Loading prescription details...
                  </Text>
                </View>
              ) : !detail ? (
                <View style={styles.detailEmpty}>
                  <View style={styles.emptyIcon}>
                    <ClipboardList size={25} color="#0D9488" />
                  </View>
                  <Text style={styles.emptyTitle}>Select a prescription</Text>
                  <Text style={styles.emptyHint}>
                    Choose a record to view its clinical notes, medicines, and
                    lab tests.
                  </Text>
                  <TouchableOpacity
                    style={styles.backHistory}
                    onPress={() => setView('history')}
                  >
                    <ClipboardList size={14} color="#0D9488" />
                    <Text style={styles.backHistoryText}>
                      Prescription history
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.detailCard}>
                    <View style={styles.prescriberHeader}>
                      <View style={styles.doctorIcon}>
                        <UserRound size={19} color="#0D9488" />
                      </View>
                      <View style={styles.prescriberCopy}>
                        <Text style={styles.eyebrow}>PRESCRIBED BY</Text>
                        <Text style={styles.prescriberName}>
                          {detail.doctor_name || 'Doctor not recorded'}
                        </Text>
                        <View style={styles.prescribedDateRow}>
                          <Clock3 size={11} color="#64748B" />
                          <Text style={styles.prescribedDate}>
                            {formatDate(detail.created_at)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.prescriptionMeta}>
                      <Text style={styles.metaTag}>RX #{detail.id}</Text>
                      <Text style={styles.finalBadge}>
                        {formatStatus(fallbackStatus(detail.status))}
                      </Text>
                      <View style={styles.followUp}>
                        <CalendarClock size={14} color="#0D9488" />
                        <Text style={styles.followUpText}>
                          Follow-up:{' '}
                          <Text style={styles.followUpStrong}>
                            {detail.follow_up_days != null
                              ? `${detail.follow_up_days} days`
                              : 'Not specified'}
                          </Text>
                        </Text>
                      </View>
                    </View>
                    <View style={styles.clinicalGrid}>
                      <ClinicalDetail
                        title="Diagnosis"
                        value={detail.diagnosis}
                        Icon={Stethoscope}
                      />
                      <ClinicalDetail
                        title="Symptoms"
                        value={detail.symptoms}
                        Icon={Activity}
                      />
                      <View style={styles.adviceCell}>
                        <ClinicalDetail
                          title="Clinical advice"
                          value={detail.advice}
                          Icon={Lightbulb}
                        />
                      </View>
                    </View>
                  </View>
                  <View style={styles.detailCard}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionIcon}>
                        <Pill size={15} color="#0D9488" />
                      </View>
                      <View>
                        <Text style={styles.sectionTitle}>
                          Prescribed medicines
                        </Text>
                        <Text style={styles.sectionSubtitle}>
                          Dosage, frequency and duration
                        </Text>
                      </View>
                      <Text style={styles.countBadge}>
                        {detail.items?.length || 0}
                      </Text>
                    </View>
                    {detail.items?.length ? (
                      detail.items.map((item, index) => (
                        <View
                          key={String(item.id || item.medicine_name || index)}
                          style={styles.lineItem}
                        >
                          <Text style={styles.itemIndex}>{index + 1}</Text>
                          <View style={styles.lineItemBody}>
                            <Text style={styles.lineItemName}>
                              {item.medicine_name || '-'}
                            </Text>
                            <View style={styles.chips}>
                              {<MetaChip label="Dosage" value={item.dosage} />}
                              <MetaChip
                                label="Frequency"
                                value={item.frequency}
                              />
                              <MetaChip
                                label="Duration"
                                value={item.duration}
                              />
                            </View>
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptySection}>
                        No medicines recorded.
                      </Text>
                    )}
                  </View>
                  <View style={styles.detailCard}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.testSectionIcon}>
                        <TestTube2 size={15} color="#0284C7" />
                      </View>
                      <View>
                        <Text style={styles.sectionTitle}>
                          Prescribed lab tests
                        </Text>
                        <Text style={styles.sectionSubtitle}>
                          Test details, priority and sample
                        </Text>
                      </View>
                      <Text style={styles.testCount}>
                        {detail.tests?.length || 0}
                      </Text>
                    </View>
                    {detail.tests?.length ? (
                      detail.tests.map((test, index) => (
                        <View
                          key={String(test.id || `${test.test_name}-${index}`)}
                          style={styles.lineItem}
                        >
                          <Text style={styles.testIndex}>{index + 1}</Text>
                          <View style={styles.lineItemBody}>
                            <View style={styles.testTitleRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.lineItemName}>
                                  {test.test_name || 'Unnamed test'}
                                </Text>
                                {test.test_code ? (
                                  <Text style={styles.testCode}>
                                    Code: {test.test_code}
                                  </Text>
                                ) : null}
                              </View>
                              <Text
                                style={[
                                  styles.testStatus,
                                  String(
                                    test.status || 'ordered',
                                  ).toLowerCase() === 'completed'
                                    ? styles.testStatusComplete
                                    : styles.testStatusDefault,
                                ]}
                              >
                                {formatStatus(test.status || 'ordered')}
                              </Text>
                            </View>
                            <View style={styles.chips}>
                              <MetaChip label="Type" value={test.test_type} />
                              <MetaChip
                                label="Priority"
                                value={formatStatus(test.urgency || 'routine')}
                                emphasis={['urgent', 'stat', 'high'].includes(
                                  String(test.urgency || '').toLowerCase(),
                                )}
                              />
                              <MetaChip
                                label="Sample"
                                value={test.sample_type}
                              />
                              {test.expected_at ? (
                                <MetaChip
                                  label="Expected"
                                  value={formatCompactDate(test.expected_at)}
                                />
                              ) : null}
                            </View>
                            {test.description ? (
                              <Text style={styles.testDescription}>
                                {test.description}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptySection}>
                        No lab tests prescribed.
                      </Text>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          )}

          <View style={styles.footer}>
            <TouchableOpacity style={styles.footerClose} onPress={onClose}>
              <X size={15} color="#FFFFFF" />
              <Text style={styles.footerCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(15,23,42,0.66)',
  },
  modal: {
    width: '100%',
    maxWidth: 570,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 20,
  },
  header: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    paddingRight: 58,
    backgroundColor: '#071522',
    borderBottomWidth: 1,
    borderColor: '#143044',
  },
  headerIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2DD4BF',
  },
  headerCopy: { flex: 1, minWidth: 0 },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  patientName: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
  closeIcon: {
    position: 'absolute',
    right: 12,
    top: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  tabs: {
    flexDirection: 'row',
    gap: 3,
    padding: 5,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    minHeight: 37,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 11,
  },
  tabActive: { backgroundColor: '#101827' },
  tabText: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#FFFFFF' },
  tabCount: {
    overflow: 'hidden',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tabCountActive: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  historyPanel: { flex: 1, backgroundColor: '#FFFFFF' },
  historyHeading: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  historyTitle: { color: '#0F172A', fontSize: 12, fontWeight: '800' },
  historyHint: { color: '#64748B', fontSize: 10, marginTop: 2 },
  countBadge: {
    minWidth: 23,
    height: 23,
    textAlign: 'center',
    textAlignVertical: 'center',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingTop: 5,
  },
  filters: {
    padding: 11,
    gap: 7,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 5,
  },
  searchBox: {
    minHeight: 35,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  searchInput: { flex: 1, paddingVertical: 5, color: '#334155', fontSize: 11 },
  filterRow: { flexDirection: 'row', gap: 7 },
  filterCell: { position: 'relative', zIndex: 10, flex: 1 },
  filterButton: {
    minHeight: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  filterText: { flex: 1, color: '#334155', fontSize: 10 },
  dropdownMenu: {
    position: 'absolute',
    top: 38,
    left: 0,
    width: '100%',
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    elevation: 9,
    zIndex: 25,
  },
  dropdownMenuRight: { right: 0, left: undefined },
  dropdownOption: {
    minHeight: 31,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 7,
  },
  dropdownOptionActive: { backgroundColor: '#DDF5F2' },
  dropdownText: { color: '#334155', fontSize: 10 },
  dropdownTextActive: { color: '#0D9488', fontWeight: '700' },
  helperText: { color: '#94A3B8', fontSize: 9 },
  helperRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  filterHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  resetText: { color: '#0D9488', fontSize: 10, fontWeight: '700' },
  historyList: { flex: 1 },
  historyListContent: { padding: 11, gap: 8, flexGrow: 1 },
  prescriptionCard: {
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  prescriptionCardActive: {
    borderColor: '#5EEAD4',
    backgroundColor: '#F0FDFA',
  },
  prescriptionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rxTitle: { color: '#0F172A', fontSize: 12, fontWeight: '800' },
  finalBadge: {
    overflow: 'hidden',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ECFDF5',
    color: '#059669',
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  prescriptionDate: { color: '#64748B', fontSize: 9 },
  diagnosisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
    paddingBottom: 2,
  },
  prescriptionDiagnosis: {
    flex: 1,
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '600',
  },
  countsRow: {
    flexDirection: 'row',
    gap: 11,
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemCount: { color: '#64748B', fontSize: 9 },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  pageInfo: { color: '#64748B', fontSize: 10 },
  pageActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  pageButton: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  pageNumber: { color: '#475569', fontSize: 10, fontWeight: '700' },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 26,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
  },
  emptyTitle: {
    marginTop: 11,
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyHint: {
    marginTop: 5,
    color: '#64748B',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 15,
  },
  clearFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 11,
  },
  clearFiltersText: { color: '#0D9488', fontSize: 10, fontWeight: '700' },
  detailsPanel: { flex: 1, backgroundColor: '#F8FAFC' },
  detailsContent: { padding: 11, gap: 10, flexGrow: 1 },
  detailEmpty: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
  },
  detailCard: {
    overflow: 'hidden',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
  prescriberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#F0FDFA',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  doctorIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  prescriberCopy: { flex: 1, minWidth: 0 },
  eyebrow: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  prescriberName: {
    marginTop: 2,
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  prescribedDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    color: '#64748B',
    fontSize: 9,
  },
  prescriptionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  metaTag: {
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    color: '#475569',
    fontSize: 8,
    fontWeight: '800',
  },
  followUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    backgroundColor: '#FFFFFF',
  },
  followUpText: { color: '#475569', fontSize: 9 },
  followUpStrong: { color: '#0F172A', fontWeight: '800' },
  clinicalGrid: { padding: 12, gap: 8 },
  adviceCell: {},
  clinicalDetail: {
    minHeight: 66,
    padding: 11,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  clinicalValue: {
    marginTop: 7,
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  sectionHeader: {
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F0FDFA',
  },
  testSectionIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
  },
  sectionTitle: { color: '#0F172A', fontSize: 11, fontWeight: '800' },
  sectionSubtitle: { marginTop: 2, color: '#64748B', fontSize: 8 },
  testCount: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    color: '#0284C7',
    fontSize: 9,
    fontWeight: '700',
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  itemIndex: {
    minWidth: 23,
    height: 23,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    borderRadius: 9,
    backgroundColor: '#F1F5F9',
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    paddingTop: 5,
  },
  testIndex: {
    minWidth: 23,
    height: 23,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    borderRadius: 9,
    backgroundColor: '#F0F9FF',
    color: '#0369A1',
    fontSize: 9,
    fontWeight: '800',
    paddingTop: 5,
  },
  lineItemBody: { flex: 1, minWidth: 0 },
  lineItemName: { color: '#0F172A', fontSize: 11, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  metaChip: {
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  metaLabel: { color: '#94A3B8', fontSize: 8 },
  metaValue: { color: '#64748B', fontSize: 8, fontWeight: '700' },
  metaChipEmphasis: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  metaLabelEmphasis: { color: '#D97706' },
  metaValueEmphasis: { color: '#92400E' },
  testTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  testCode: { marginTop: 2, color: '#94A3B8', fontSize: 8 },
  testStatus: {
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 9,
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  testStatusComplete: { backgroundColor: '#ECFDF5', color: '#047857' },
  testStatusDefault: { backgroundColor: '#F0F9FF', color: '#0369A1' },
  testDescription: {
    marginTop: 6,
    padding: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    color: '#64748B',
    fontSize: 9,
    lineHeight: 14,
  },
  emptySection: {
    paddingHorizontal: 14,
    paddingVertical: 20,
    color: '#64748B',
    fontSize: 10,
    textAlign: 'center',
  },
  backHistory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 13,
  },
  backHistoryText: { color: '#0D9488', fontSize: 10, fontWeight: '700' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rxTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prescriptionDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 7,
  },
  prescribedDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  countItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  footerClose: {
    minWidth: 92,
    minHeight: 37,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: '#101827',
  },
  footerCloseText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
});
