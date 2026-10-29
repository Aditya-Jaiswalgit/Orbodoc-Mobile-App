import { colors, radii, spacing, typography } from '../../../theme/tokens';
import React, { useEffect, useMemo, useState } from 'react';
import { AppModal } from '../../../components/common/AppModal';
import { Activity, CalendarClock, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronRight as OpenDetails, ClipboardList, Clock3, FileText, Lightbulb, Pill, RotateCcw, Search, SlidersHorizontal, Stethoscope, TestTube2, UserRound, X, } from 'lucide-react-native';
import {
  ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { LiquidBorderScrollView } from '../../../components/common/LiquidBorderScrollView';
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
        <Icon size={13} color={colors.primary} />
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
        <LiquidBorderScrollView
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
        </LiquidBorderScrollView>
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
              <X size={19} color={colors.surface} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              onPress={() => setView('history')}
              style={[styles.tab, view === 'history' && styles.tabActive]}
            >
              <ClipboardList
                size={14}
                color={view === 'history' ? colors.surface : colors.muted}
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
                color={view === 'details' ? colors.surface : colors.muted}
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
                    <Search size={15} color={colors.subtle} />
                    <TextInput
                      value={search}
                      onChangeText={setSearch}
                      placeholder="Search prescriptions..."
                      placeholderTextColor={colors.subtle}
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
                        <ChevronDown size={14} color={colors.muted} />
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
                        <ChevronDown size={14} color={colors.muted} />
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
                        <RotateCcw size={11} color={colors.primary} />
                        <Text style={styles.resetText}>Reset</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.helperRow}>
                      <SlidersHorizontal size={11} color={colors.subtle} />
                      <Text style={styles.helperText}>
                        Filter by status or date
                      </Text>
                    </View>
                  )}
                </View>
              ) : null}
              <LiquidBorderScrollView
                style={styles.historyList}
                contentContainerStyle={styles.historyListContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              >
                {loading ? (
                  <View style={styles.emptyState}>
                    <ActivityIndicator color={colors.primary} size="large" />
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
                      <Pill size={24} color={colors.subtle} />
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
                      <Search size={23} color={colors.subtle} />
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
                      <RotateCcw size={13} color={colors.primary} />
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
                            <FileText size={14} color={colors.primary} />
                            <Text style={styles.rxTitle}>Rx #{row.id}</Text>
                          </View>
                          <Text style={styles.finalBadge}>
                            {formatStatus(status)}
                          </Text>
                        </View>
                        <View style={styles.prescriptionDateRow}>
                          <CalendarDays size={12} color={colors.muted} />
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
                          <OpenDetails size={16} color={colors.input} />
                        </View>
                        {Number(row.medicine_count || 0) > 0 ||
                        Number(row.test_count || 0) > 0 ? (
                          <View style={styles.countsRow}>
                            {Number(row.medicine_count || 0) > 0 ? (
                              <View style={styles.countItem}>
                                <Pill size={11} color={colors.primary} />
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
                          color={page === 1 ? colors.input : colors.muted}
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
                          color={page === totalPages ? colors.input : colors.muted}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}
              </LiquidBorderScrollView>
            </View>
          ) : (
            <LiquidBorderScrollView
              style={styles.detailsPanel}
              contentContainerStyle={styles.detailsContent}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              {detailLoading ? (
                <View style={styles.detailEmpty}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.emptyTitle}>
                    Loading prescription details...
                  </Text>
                </View>
              ) : !detail ? (
                <View style={styles.detailEmpty}>
                  <View style={styles.emptyIcon}>
                    <ClipboardList size={25} color={colors.primary} />
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
                    <ClipboardList size={14} color={colors.primary} />
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
                        <UserRound size={19} color={colors.primary} />
                      </View>
                      <View style={styles.prescriberCopy}>
                        <Text style={styles.eyebrow}>PRESCRIBED BY</Text>
                        <Text style={styles.prescriberName}>
                          {detail.doctor_name || 'Doctor not recorded'}
                        </Text>
                        <View style={styles.prescribedDateRow}>
                          <Clock3 size={11} color={colors.muted} />
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
                        <CalendarClock size={14} color={colors.primary} />
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
                        <Pill size={15} color={colors.primary} />
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
            </LiquidBorderScrollView>
          )}

          <View style={styles.footer}>
            <TouchableOpacity style={styles.footerClose} onPress={onClose}>
              <X size={15} color={colors.surface} />
              <Text style={styles.footerCloseText}>Close</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(15,23,42,0.66)',
  },
  modal: {
    width: '100%',
    maxWidth: 570,
    backgroundColor: colors.background,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 20,
  },
  header: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
    fontFamily: typography.family, color: colors.surface,
    fontSize: typography.size.title,
    fontWeight: typography.weight.extrabold,
    letterSpacing: -0.3,
  },
  patientName: {
    fontFamily: typography.family, color: colors.input,
    fontSize: typography.size.micro,
    fontWeight: typography.weight.semibold,
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
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
  tabText: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.sm, fontWeight: typography.weight.bold },
  tabTextActive: { color: colors.surface },
  tabCount: {
    fontFamily: typography.family, overflow: 'hidden',
    color: colors.muted,
    backgroundColor: colors.secondary,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    paddingHorizontal: spacing.tiny,
    paddingVertical: 3,
    borderRadius: radii.md,
  },
  tabCountActive: {
    color: colors.surface,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  historyPanel: { flex: 1, backgroundColor: colors.surface },
  historyHeading: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderColor: colors.secondary,
  },
  historyTitle: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.sm, fontWeight: typography.weight.extrabold },
  historyHint: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.micro, marginTop: 2 },
  countBadge: {
    fontFamily: typography.family, minWidth: 23,
    height: 23,
    textAlign: 'center',
    textAlignVertical: 'center',
    overflow: 'hidden',
    borderRadius: radii.lg,
    backgroundColor: colors.secondary,
    color: colors.muted,
    fontSize: typography.size.micro,
    fontWeight: typography.weight.bold,
    paddingHorizontal: spacing.tiny,
    paddingTop: 5,
  },
  filters: {
    padding: 11,
    gap: 7,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderColor: colors.border,
    zIndex: 5,
  },
  searchBox: {
    minHeight: 35,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  searchInput: { fontFamily: typography.family, flex: 1, paddingVertical: 5, color: colors.foreground, fontSize: typography.size.xs },
  filterRow: { flexDirection: 'row', gap: 7 },
  filterCell: { position: 'relative', zIndex: 10, flex: 1 },
  filterButton: {
    minHeight: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  filterText: { fontFamily: typography.family, flex: 1, color: colors.foreground, fontSize: typography.size.micro },
  dropdownMenu: {
    position: 'absolute',
    top: 38,
    left: 0,
    width: '100%',
    padding: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    elevation: 9,
    zIndex: 25,
  },
  dropdownMenuRight: { right: 0, left: undefined },
  dropdownOption: {
    minHeight: 31,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: 7,
  },
  dropdownOptionActive: { backgroundColor: '#DDF5F2' },
  dropdownText: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.micro },
  dropdownTextActive: { color: colors.primary, fontWeight: typography.weight.bold },
  helperText: { fontFamily: typography.family, color: colors.subtle, fontSize: typography.size.sm },
  helperRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  filterHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 2,
  },
  resetText: { fontFamily: typography.family, color: colors.primary, fontSize: typography.size.micro, fontWeight: typography.weight.bold },
  historyList: { flex: 1 },
  historyListContent: { padding: 11, gap: spacing.sm, flexGrow: 1 },
  prescriptionCard: {
    padding: spacing.md,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  prescriptionCardActive: {
    borderColor: '#5EEAD4',
    backgroundColor: colors.mint,
  },
  prescriptionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rxTitle: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.sm, fontWeight: typography.weight.extrabold },
  finalBadge: {
    fontFamily: typography.family, overflow: 'hidden',
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: '#ECFDF5',
    color: colors.successDark,
    fontSize: 8,
    fontWeight: typography.weight.extrabold,
    textTransform: 'uppercase',
  },
  prescriptionDate: { fontFamily: typography.family, color: colors.muted, fontSize: 9 },
  diagnosisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingBottom: 2,
  },
  prescriptionDiagnosis: {
    fontFamily: typography.family, flex: 1,
    color: colors.text,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  countsRow: {
    flexDirection: 'row',
    gap: 11,
    marginTop: spacing.sm,
    paddingTop: 7,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  itemCount: { fontFamily: typography.family, color: colors.muted, fontSize: 9 },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  pageInfo: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.micro },
  pageActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  pageButton: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  pageNumber: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.micro, fontWeight: typography.weight.bold },
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
    backgroundColor: colors.secondary,
  },
  emptyTitle: {
    fontFamily: typography.family, marginTop: 11,
    color: colors.foreground,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.extrabold,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: typography.family, marginTop: 5,
    color: colors.muted,
    fontSize: typography.size.micro,
    textAlign: 'center',
    lineHeight: 15,
  },
  clearFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 11,
  },
  clearFiltersText: { fontFamily: typography.family, color: colors.primary, fontSize: typography.size.micro, fontWeight: typography.weight.bold },
  detailsPanel: { flex: 1, backgroundColor: colors.background },
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
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    elevation: 1,
  },
  prescriberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    backgroundColor: colors.mint,
    borderBottomWidth: 1,
    borderColor: colors.secondary,
  },
  doctorIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.mintBorder,
  },
  prescriberCopy: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontFamily: typography.family, color: colors.subtle,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.extrabold,
    letterSpacing: 1,
  },
  prescriberName: {
    fontFamily: typography.family, marginTop: 2,
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.extrabold,
  },
  prescribedDate: {
    fontFamily: typography.family, flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 3,
    color: colors.muted,
    fontSize: 9,
  },
  prescriptionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.tiny,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  metaTag: {
    fontFamily: typography.family, overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.muted,
    fontSize: 8,
    fontWeight: typography.weight.extrabold,
  },
  followUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.mintBorder,
    backgroundColor: colors.surface,
  },
  followUpText: { fontFamily: typography.family, color: colors.muted, fontSize: 9 },
  followUpStrong: { color: colors.text, fontWeight: typography.weight.extrabold },
  clinicalGrid: { padding: spacing.md, gap: spacing.sm },
  adviceCell: {},
  clinicalDetail: {
    minHeight: 66,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
  },
  clinicalValue: {
    fontFamily: typography.family, marginTop: 7,
    color: colors.foreground,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    lineHeight: 16,
  },
  sectionHeader: {
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 11,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.secondary,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.mint,
  },
  testSectionIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: '#F0F9FF',
  },
  sectionTitle: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.extrabold },
  sectionSubtitle: { fontFamily: typography.family, marginTop: 2, color: colors.muted, fontSize: 8 },
  testCount: {
    fontFamily: typography.family, marginLeft: 'auto',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: '#F0F9FF',
    color: '#0284C7',
    fontSize: 9,
    fontWeight: typography.weight.bold,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.secondary,
  },
  itemIndex: {
    fontFamily: typography.family, minWidth: 23,
    height: 23,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    borderRadius: 9,
    backgroundColor: colors.secondary,
    color: colors.muted,
    fontSize: 9,
    fontWeight: typography.weight.extrabold,
    paddingTop: 5,
  },
  testIndex: {
    fontFamily: typography.family, minWidth: 23,
    height: 23,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    borderRadius: 9,
    backgroundColor: '#F0F9FF',
    color: '#0369A1',
    fontSize: 9,
    fontWeight: typography.weight.extrabold,
    paddingTop: 5,
  },
  lineItemBody: { flex: 1, minWidth: 0 },
  lineItemName: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.xs, fontWeight: typography.weight.extrabold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.tiny },
  metaChip: {
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: spacing.tiny,
    paddingVertical: spacing.xs,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  metaLabel: { fontFamily: typography.family, color: colors.subtle, fontSize: 8 },
  metaValue: { fontFamily: typography.family, color: colors.muted, fontSize: 8, fontWeight: typography.weight.bold },
  metaChipEmphasis: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  metaLabelEmphasis: { color: colors.warning },
  metaValueEmphasis: { color: '#92400E' },
  testTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.tiny },
  testCode: { fontFamily: typography.family, marginTop: 2, color: colors.subtle, fontSize: 8 },
  testStatus: {
    fontFamily: typography.family, overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: spacing.xs,
    borderRadius: 9,
    fontSize: 8,
    fontWeight: typography.weight.extrabold,
    textTransform: 'uppercase',
  },
  testStatusComplete: { backgroundColor: '#ECFDF5', color: '#047857' },
  testStatusDefault: { backgroundColor: '#F0F9FF', color: '#0369A1' },
  testDescription: {
    fontFamily: typography.family, marginTop: spacing.tiny,
    padding: 7,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    color: colors.muted,
    fontSize: 9,
    lineHeight: 14,
  },
  emptySection: {
    fontFamily: typography.family, paddingHorizontal: 14,
    paddingVertical: spacing.xl,
    color: colors.muted,
    fontSize: typography.size.micro,
    textAlign: 'center',
  },
  backHistory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.tiny,
    marginTop: 13,
  },
  backHistoryText: { fontFamily: typography.family, color: colors.primary, fontSize: typography.size.micro, fontWeight: typography.weight.bold },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rxTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.tiny },
  prescriptionDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 7,
  },
  prescribedDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 3,
  },
  countItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  footerClose: {
    minWidth: 92,
    minHeight: 37,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.tiny,
    paddingHorizontal: spacing.md,
    borderRadius: 11,
    backgroundColor: '#101827',
  },
  footerCloseText: { fontFamily: typography.family, color: colors.surface, fontSize: typography.size.xs, fontWeight: typography.weight.extrabold },
});
