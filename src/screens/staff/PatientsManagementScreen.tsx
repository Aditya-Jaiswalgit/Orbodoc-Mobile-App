import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  CalendarPlus,
  ClipboardList,
  Download,
  Eye,
  FileText,
  History,
  MoreVertical,
  Search,
  Stethoscope,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { PatientCardFocusProvider, focusedCardOutline, usePatientCardFocus } from '../../components/common/PatientCardFocusContext';
import { Pagination } from '../../components/common/Pagination';
import {
  ColumnOption,
  ColumnSelectorModal,
} from '../../components/common/ColumnSelectorModal';
import { PatientModel } from '../../types/clinicTypes';
import { useAuthContext } from '../../context/AuthContext';
import {
  createPatientApi,
  fetchPatientByIdApi,
  fetchPatientsApi,
  getPatientBillingSummaryApi,
  getPatientConsultationsApi,
  PatientBillingSummary,
  PatientConsultation,
  PatientStats,
  updatePatientApi,
} from '../../api/patientApi';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import {
  PatientDetailsModal,
  PatientFilterPanel,
  PatientFormModal,
  PatientFormValues,
  PatientStatsCards,
} from './patients/PatientManagementComponents';
import { PatientAppointmentModal } from './patients/PatientAppointmentModal';
import { ConsultationHistoryModal } from './patients/ConsultationHistoryModal';
import { PatientPrescriptionModal } from './patients/PatientPrescriptionModal';
import { PatientMedicalHistoryModal } from './patients/PatientMedicalHistoryModal';
import { canUseStaffScreen } from '../../navigation/staffAccess';

interface Props {
  onOpenDrawer: () => void;
  onNavigateScreen?: (screen: string) => void;
}

type PatientStatusFilter = 'all' | 'active' | 'inactive';
const PAGE_SIZE_OPTIONS = [10, 20, 50];
type PatientColumn =
  | 'patientCode'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'gender'
  | 'dateOfBirth'
  | 'age'
  | 'bloodGroup'
  | 'address'
  | 'city'
  | 'state'
  | 'emergencyContact'
  | 'emergencyContactName'
  | 'registrationDate'
  | 'status'
  | 'actions';
const PATIENT_COLUMN_OPTIONS: ColumnOption<PatientColumn>[] = [
  { key: 'patientCode', label: 'Patient Code', defaultVisible: true },
  { key: 'fullName', label: 'Full Name', defaultVisible: true },
  { key: 'email', label: 'Email', defaultVisible: false },
  { key: 'phone', label: 'Phone', defaultVisible: true },
  { key: 'gender', label: 'Gender', defaultVisible: true },
  { key: 'dateOfBirth', label: 'Date of Birth', defaultVisible: false },
  { key: 'age', label: 'Age', defaultVisible: false },
  { key: 'bloodGroup', label: 'Blood Group', defaultVisible: true },
  { key: 'address', label: 'Address', defaultVisible: false },
  { key: 'city', label: 'City', defaultVisible: false },
  { key: 'state', label: 'State', defaultVisible: false },
  {
    key: 'emergencyContact',
    label: 'Emergency Contact',
    defaultVisible: false,
  },
  {
    key: 'emergencyContactName',
    label: 'Emergency Contact Name',
    defaultVisible: false,
  },
  { key: 'registrationDate', label: 'Registration Date', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'actions', label: 'Actions', defaultVisible: true },
];
const DEFAULT_PATIENT_COLUMNS = Object.fromEntries(
  PATIENT_COLUMN_OPTIONS.map(column => [
    column.key,
    column.defaultVisible ?? true,
  ]),
) as Record<PatientColumn, boolean>;

const extractPatient = (data: any): PatientModel | null => {
  const patient = data?.patient ?? (Array.isArray(data) ? data[0] : data);
  return patient && typeof patient === 'object'
    ? (patient as PatientModel)
    : null;
};

const calculateAge = (dob: string) => {
  if (!dob) return undefined;
  const date = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  if (
    now.getMonth() < date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())
  )
    age -= 1;
  return age >= 0 ? age : undefined;
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
};

const toFilterDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;

const PatientsManagementContent: React.FC<Props> = ({
  onOpenDrawer,
  onNavigateScreen,
}) => {
  const { focusedCard, focusCard } = usePatientCardFocus();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const {
    token,
    activeClinicId,
    role,
    permissionsMap = {},
  } = useAuthContext();
  const canAddPatient = canUseStaffScreen(role, permissionsMap, 'patients', 'add');
  const canEditPatient = canUseStaffScreen(role, permissionsMap, 'patients', 'edit');
  const canBookAppointment = canUseStaffScreen(role, permissionsMap, 'appointments', 'add');
  const canViewPrescriptions = canUseStaffScreen(role, permissionsMap, 'prescriptions', 'view');
  const canManagePatientActions = canUseStaffScreen(role, permissionsMap, 'patients', 'view') || canEditPatient || canBookAppointment || canViewPrescriptions ||
    canUseStaffScreen(role, permissionsMap, 'prescriptions', 'add') ||
    canUseStaffScreen(role, permissionsMap, 'prescriptions', 'edit');
  const [patients, setPatients] = useState<PatientModel[]>([]);
  const [stats, setStats] = useState<PatientStats>({
    total_patients: 0,
    active_patients: 0,
    inactive_patients: 0,
    today_visits: 0,
    new_this_week: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PatientStatusFilter>('all');
  const [genderFilter, setGenderFilter] = useState('All');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [formVisible, setFormVisible] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientModel | null>(
    null,
  );
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientModel | null>(
    null,
  );
  const [billingSummary, setBillingSummary] =
    useState<PatientBillingSummary | null>(null);
  const [consultations, setConsultations] = useState<PatientConsultation[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [bookingVisible, setBookingVisible] = useState(false);
  const [consultationPatient, setConsultationPatient] = useState<PatientModel | null>(null);
  const [prescriptionPatient, setPrescriptionPatient] = useState<PatientModel | null>(null);
  const [medicalHistoryPatient, setMedicalHistoryPatient] = useState<PatientModel | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<
    Record<PatientColumn, boolean>
  >(DEFAULT_PATIENT_COLUMNS);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [actionMenu, setActionMenu] = useState<{
    patient: PatientModel;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const requestSequence = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadPatients = useCallback(
    async (showRefresh = false) => {
      if (!token) {
        setPatients([]);
        setLoading(false);
        return;
      }
      const requestId = ++requestSequence.current;
      showRefresh ? setRefreshing(true) : setLoading(true);
      try {
        const response = await fetchPatientsApi(
          {
            clinic_id: activeClinicId || undefined,
            page: currentPage,
            limit: pageSize,
            search: debouncedSearch || undefined,
            is_active:
              statusFilter === 'all'
                ? undefined
                : statusFilter === 'active'
                ? 1
                : 0,
          },
          token,
        );
        if (requestId !== requestSequence.current) return;
        if (!response.success || !response.data)
          throw new Error(response.message || 'Unable to fetch patients.');
        const rows = Array.isArray(response.data.data)
          ? response.data.data
          : [];
        setPatients(rows);
        setTotalItems(Number(response.data.total) || rows.length);
      } catch (error: any) {
        if (requestId === requestSequence.current)
          showErrorToast(
            'Patients',
            error?.message || 'Unable to load patient records.',
          );
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [
      activeClinicId,
      currentPage,
      debouncedSearch,
      pageSize,
      statusFilter,
      token,
    ],
  );

  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetchPatientsApi(
        { clinic_id: activeClinicId || undefined, page: 1, limit: 1 },
        token,
      );
      if (!response.success || !response.data?.stats) return;
      setStats(response.data.stats);
    } catch {
      // Keep the last successfully loaded clinic snapshot if stats are temporarily unavailable.
    }
  }, [activeClinicId, token]);

  const handleExportPatients = useCallback(async () => {
    if (!token) return;
    setExporting(true);
    try {
      const allRows: PatientModel[] = [];
      let total = Number.MAX_SAFE_INTEGER;
      let page = 1;
      while (allRows.length < total && page <= 1000) {
        const response = await fetchPatientsApi(
          {
            clinic_id: activeClinicId || undefined,
            page,
            limit: 100,
            search: debouncedSearch || undefined,
            is_active:
              statusFilter === 'all'
                ? undefined
                : statusFilter === 'active'
                ? 1
                : 0,
          },
          token,
        );
        if (!response.success || !response.data)
          throw new Error(response.message || 'Could not export patients.');
        const pageRows = Array.isArray(response.data.data)
          ? response.data.data
          : [];
        if (page === 1) total = Number(response.data.total) || pageRows.length;
        allRows.push(...pageRows);
        if (pageRows.length === 0) break;
        page += 1;
      }

      const rows = allRows.filter(patient => {
        const genderMatches =
          genderFilter === 'All' ||
          String(patient.gender || '').toLowerCase() ===
            genderFilter.toLowerCase();
        const bloodMatches =
          bloodGroupFilter === 'All' ||
          String(patient.blood_group || '').toUpperCase() ===
            bloodGroupFilter.toUpperCase();
        const registered = String(
          patient.registered_at || patient.created_at || '',
        ).slice(0, 10);
        return (
          genderMatches &&
          bloodMatches &&
          (!dateFrom || registered >= dateFrom) &&
          (!dateTo || registered <= dateTo)
        );
      });
      if (!rows.length) {
        showErrorToast('Export', 'No patients match the current filters.');
        return;
      }
      const columns: {
        label: string;
        value: (patient: PatientModel) => unknown;
      }[] = [
        {
          label: 'Patient Code',
          value: patient => patient.patient_code || `PT-${patient.id}`,
        },
        { label: 'Full Name', value: patient => patient.full_name },
        { label: 'Email', value: patient => patient.email },
        { label: 'Phone', value: patient => patient.phone },
        { label: 'Gender', value: patient => patient.gender },
        { label: 'Date of Birth', value: patient => patient.date_of_birth },
        {
          label: 'Age',
          value: patient =>
            patient.age ?? calculateAge(patient.date_of_birth || ''),
        },
        { label: 'Blood Group', value: patient => patient.blood_group },
        { label: 'Address', value: patient => patient.address },
        { label: 'City', value: patient => patient.city },
        { label: 'State', value: patient => patient.state },
        {
          label: 'Emergency Contact',
          value: patient => patient.emergency_contact,
        },
        {
          label: 'Emergency Contact Name',
          value: patient => patient.emergency_contact_name,
        },
        {
          label: 'Registration Date',
          value: patient => patient.registered_at || patient.created_at,
        },
        {
          label: 'Status',
          value: patient =>
            Number(patient.is_active ?? 1) === 1 ? 'Active' : 'Inactive',
        },
      ];
      const csvCell = (value: unknown) => {
        let text = String(value ?? '')
          .replace(/[\r\n]+/g, ' ')
          .trim();
        if (/^[=+@-]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
      };
      const csv = [
        columns.map(column => csvCell(column.label)).join(','),
        ...rows.map(patient =>
          columns.map(column => csvCell(column.value(patient))).join(','),
        ),
      ].join('\n');
      await Share.share({ title: 'Patients Export.csv', message: csv });
    } catch (error: any) {
      showErrorToast(
        'Export failed',
        error?.message || 'Could not export patient records.',
      );
    } finally {
      setExporting(false);
    }
  }, [
    activeClinicId,
    bloodGroupFilter,
    dateFrom,
    dateTo,
    debouncedSearch,
    genderFilter,
    statusFilter,
    token,
  ]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const visiblePatients = useMemo(
    () =>
      patients.filter(patient => {
        const genderMatches =
          genderFilter === 'All' ||
          String(patient.gender || '').toLowerCase() ===
            genderFilter.toLowerCase();
        const bloodMatches =
          bloodGroupFilter === 'All' ||
          String(patient.blood_group || '').toUpperCase() ===
            bloodGroupFilter.toUpperCase();
        const registrationDate = String(
          patient.registered_at || patient.created_at || '',
        ).slice(0, 10);
        const fromMatches = !dateFrom || registrationDate >= dateFrom;
        const toMatches = !dateTo || registrationDate <= dateTo;
        return genderMatches && bloodMatches && fromMatches && toMatches;
      }),
    [bloodGroupFilter, dateFrom, dateTo, genderFilter, patients],
  );

  const openPatientDetails = useCallback(
    async (patient: PatientModel) => {
      setDetailsVisible(true);
      setDetailsLoading(true);
      setSelectedPatient(patient);
      setBillingSummary(null);
      setConsultations([]);
      if (!token) {
        setDetailsLoading(false);
        return;
      }
      try {
        const [detailsResponse, summaryResponse, consultationsResponse] =
          await Promise.all([
            fetchPatientByIdApi(patient.id, token),
            getPatientBillingSummaryApi(patient.id, token).catch(() => null),
            getPatientConsultationsApi(patient.id, token).catch(() => null),
          ]);
        if (!detailsResponse.success)
          throw new Error(
            detailsResponse.message || 'Could not load full patient profile.',
          );
        setSelectedPatient(extractPatient(detailsResponse.data) ?? patient);
        const rawSummary: any = summaryResponse?.data;
        setBillingSummary(rawSummary?.summary ?? rawSummary ?? null);
        const rawConsultations: any = consultationsResponse?.data;
        const consultationRows =
          rawConsultations?.consultations ?? rawConsultations;
        setConsultations(
          Array.isArray(consultationRows) ? consultationRows : [],
        );
      } catch (error: any) {
        showErrorToast(
          'Patient profile',
          error?.message || 'Could not load patient profile.',
        );
      } finally {
        setDetailsLoading(false);
      }
    },
    [token],
  );

  const openEditForm = useCallback(async () => {
    if (!canEditPatient) return;
    if (!selectedPatient || !token) return;
    try {
      const response = await fetchPatientByIdApi(selectedPatient.id, token);
      if (!response.success)
        throw new Error(response.message || 'Could not load patient details.');
      setEditingPatient(extractPatient(response.data) ?? selectedPatient);
    } catch {
      setEditingPatient(selectedPatient);
    }
    setDetailsVisible(false);
    setFormVisible(true);
  }, [canEditPatient, selectedPatient, token]);

  const savePatient = useCallback(
    async (values: PatientFormValues) => {
      if (editingPatient ? !canEditPatient : !canAddPatient) {
        showErrorToast('Permission denied', 'You do not have permission to save patient details.');
        return;
      }
      if (!token) {
        showErrorToast(
          'Sign in required',
          'Please sign in again to save patient details.',
        );
        return;
      }
      setSaving(true);
      const payload: Partial<PatientModel> & { clinic_id?: number | string } = {
        ...values,
        full_name: values.full_name.trim(),
        gender: values.gender || 'other',
        phone: values.phone.trim(),
        email: values.email.trim() || undefined,
        clinic_id: editingPatient ? undefined : activeClinicId || undefined,
        date_of_birth: values.date_of_birth.trim() || undefined,
        age: calculateAge(values.date_of_birth),
        blood_group: values.blood_group.trim() || undefined,
        address: values.address.trim() || undefined,
        city: values.city.trim() || undefined,
        state: values.state.trim() || undefined,
        emergency_contact: values.emergency_contact.trim() || undefined,
        emergency_contact_name:
          values.emergency_contact_name.trim() || undefined,
        emergency_relation: values.emergency_relation.trim() || undefined,
        allergies: values.allergies.trim() || undefined,
        medical_history: values.medical_history.trim() || undefined,
      };
      try {
        const response = editingPatient
          ? await updatePatientApi(editingPatient.id, payload, token)
          : await createPatientApi(payload, token);
        if (!response.success)
          throw new Error(response.message || 'Could not save patient.');
        showSuccessToast(
          editingPatient ? 'Patient updated' : 'Patient registered',
          editingPatient
            ? 'Patient details have been updated.'
            : 'Patient has been registered successfully.',
        );
        setFormVisible(false);
        setEditingPatient(null);
        await Promise.all([loadPatients(), loadStats()]);
      } catch (error: any) {
        showErrorToast(
          editingPatient ? 'Update failed' : 'Registration failed',
          error?.message || 'Could not save patient.',
        );
      } finally {
        setSaving(false);
      }
    },
    [activeClinicId, canAddPatient, canEditPatient, editingPatient, loadPatients, loadStats, token],
  );

  const togglePatientStatus = useCallback(
    (patient = selectedPatient) => {
      if (!canEditPatient) return;
      if (!patient || !token) return;
      const isActive = Number(patient.is_active ?? 1) === 1;
      const nextValue = isActive ? 0 : 1;
      Alert.alert(
        `${isActive ? 'Deactivate' : 'Activate'} Patient`,
        `${isActive ? 'Deactivate' : 'Activate'} ${patient.full_name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: isActive ? 'Deactivate' : 'Activate',
            style: isActive ? 'destructive' : 'default',
            onPress: async () => {
              try {
                const response = await updatePatientApi(
                  patient.id,
                  { is_active: nextValue },
                  token,
                );
                if (!response.success)
                  throw new Error(
                    response.message || 'Could not update patient status.',
                  );
                showSuccessToast(
                  'Status updated',
                  `${patient.full_name} is now ${
                    nextValue ? 'active' : 'inactive'
                  }.`,
                );
                setSelectedPatient(previous =>
                  previous?.id === patient.id
                    ? { ...previous, is_active: nextValue }
                    : previous,
                );
                await Promise.all([loadPatients(), loadStats()]);
              } catch (error: any) {
                showErrorToast(
                  'Status update failed',
                  error?.message || 'Could not update patient status.',
                );
              }
            },
          },
        ],
      );
    },
    [canEditPatient, loadPatients, loadStats, selectedPatient, token],
  );

  const handleNavigate = (screen: string) => {
    setDetailsVisible(false);
    onNavigateScreen?.(screen);
  };

  const handleStatSelect = useCallback(
    (selection: 'total' | 'active' | 'inactive' | 'today' | 'week') => {
      setCurrentPage(1);
      setGenderFilter('All');
      setBloodGroupFilter('All');
      setSearchQuery('');
      setDebouncedSearch('');

      if (selection === 'active' || selection === 'inactive') {
        setStatusFilter(selection);
        setDateFrom('');
        setDateTo('');
        return;
      }

      setStatusFilter('all');
      if (selection === 'today') {
        const today = toFilterDate(new Date());
        setDateFrom(today);
        setDateTo(today);
        return;
      }
      if (selection === 'week') {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
        setDateFrom(toFilterDate(monday));
        setDateTo(toFilterDate(today));
        return;
      }
      setDateFrom('');
      setDateTo('');
    },
    [],
  );

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.bannerRow}>
        <View style={styles.bannerTitleBlock}>
          <View style={styles.iconBox}>
            <Users size={24} color="#0D9488" />
          </View>
          <View style={styles.bannerTitleCopy}>
            <Text style={styles.bannerTitle}>Patient Management</Text>
            <Text style={styles.bannerSubtitle}>
              Manage patient records and medical history
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.patientHeaderActions}>
        {canAddPatient ? <TouchableOpacity
          style={[styles.addButton, focusedCard === 'add-patient' && focusedCardOutline]}
          onPress={() => {
            focusCard('add-patient');
            setEditingPatient(null);
            setFormVisible(true);
          }}
        >
          <UserPlus size={16} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Patient</Text>
        </TouchableOpacity> : null}
        <TouchableOpacity
          style={[styles.exportButton, focusedCard === 'export' && focusedCardOutline]}
          onPress={() => { focusCard('export'); handleExportPatients(); }}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#0F172A" />
          ) : (
            <Download size={16} color="#0F172A" />
          )}
          <Text style={styles.exportButtonText}>
            {exporting ? 'Exporting' : 'Export'}
          </Text>
        </TouchableOpacity>
      </View>

      <PatientStatsCards
        total={Number(stats.total_patients) || 0}
        active={Number(stats.active_patients) || 0}
        inactive={Number(stats.inactive_patients) || 0}
        today={Number(stats.today_visits) || 0}
        thisWeek={Number(stats.new_this_week) || 0}
        onSelect={handleStatSelect}
      />

      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionTitleCopy}>
          <Text style={styles.sectionTitle}>Patient Directory</Text>
          <Text style={styles.sectionSubtitle}>
            {totalItems.toLocaleString()} patients in this clinic
          </Text>
        </View>
      </View>
      <View style={[styles.searchCard, focusedCard === 'search' && focusedCardOutline]}>
        <Search size={18} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, phone or patient ID"
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => focusCard('search')}
          returnKeyType="search"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={17} color="#64748B" />
          </TouchableOpacity>
        ) : null}
      </View>
      <PatientFilterPanel
        status={statusFilter}
        gender={genderFilter}
        bloodGroup={bloodGroupFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onOpenColumns={() => { focusCard('filters'); setShowColumnSelector(true); }}
        onStatusChange={value => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}
        onGenderChange={setGenderFilter}
        onBloodGroupChange={setBloodGroupFilter}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onClearFilters={() => {
          setStatusFilter('all');
          setGenderFilter('All');
          setBloodGroupFilter('All');
          setDateFrom('');
          setDateTo('');
          setSearchQuery('');
          setCurrentPage(1);
        }}
      />
      <View style={styles.resultsHeading}>
        <View style={styles.resultsTitleRow}>
          <Users size={17} color="#1E293B" />
          <Text style={styles.resultsTitle}>
            Patients ({visiblePatients.length})
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Patient Management" />
      <FlatList
        data={visiblePatients}
        keyExtractor={patient => String(patient.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadPatients(true)}
            colors={['#0D9488']}
            tintColor="#0D9488"
          />
        }
        renderItem={({ item }) => (
          <PatientListCard
            patient={item}
            onPress={() => openPatientDetails(item)}
            visibleColumns={visibleColumns}
            canEdit={canEditPatient}
            canManageActions={canManagePatientActions}
            onToggleStatus={() => togglePatientStatus(item)}
            onOpenActions={ref => {
              focusCard(`patient-${item.id}`);
              ref.measureInWindow(
                (x: number, y: number, width: number, height: number) =>
                  setActionMenu({ patient: item, x, y, width, height }),
              );
            }}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#0D9488" />
              <Text style={styles.emptyTitle}>Loading patients…</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Users size={23} color="#0D9488" />
              </View>
              <Text style={styles.emptyTitle}>No patients found</Text>
              <Text style={styles.emptySubtitle}>
                {debouncedSearch
                  ? 'Try another name, phone number or ID.'
                  : 'Add a patient to get your clinic directory started.'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          totalItems > 0 ? (
            <View style={styles.paginationWrap}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setCurrentPage}
                onPageSizeChange={size => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </View>
          ) : (
            <View style={styles.footerSpacer} />
          )
        }
      />

      <PatientFormModal
        visible={formVisible}
        patient={editingPatient}
        saving={saving}
        onClose={() => {
          if (!saving) {
            setFormVisible(false);
            setEditingPatient(null);
          }
        }}
        onSubmit={values => savePatient(values)}
      />
      <PatientDetailsModal
        visible={detailsVisible}
        patient={selectedPatient}
        summary={billingSummary}
        consultations={consultations}
        loading={detailsLoading}
        onClose={() => setDetailsVisible(false)}
        canEdit={canEditPatient}
        canChangeStatus={canEditPatient}
        canBookAppointment={canBookAppointment}
        canOpenAppointments={canUseStaffScreen(role, permissionsMap, 'appointments', 'view')}
        canOpenPrescriptions={canViewPrescriptions}
        canOpenLabs={canUseStaffScreen(role, permissionsMap, 'lab_reports', 'view')}
        canOpenBilling={canUseStaffScreen(role, permissionsMap, 'treatment_billing', 'view')}
        onEdit={() => openEditForm()}
        onToggleStatus={() => togglePatientStatus(selectedPatient)}
        onBookAppointment={() => {
          setDetailsVisible(false);
          setBookingVisible(true);
        }}
        onOpenAppointments={() => handleNavigate('appointments')}
        onOpenPrescriptions={() => {
          setDetailsVisible(false);
          if (selectedPatient) setPrescriptionPatient(selectedPatient);
        }}
        onOpenLabs={() => handleNavigate('lab_reports')}
        onOpenBilling={() => handleNavigate('treatment_billing')}
      />
      <PatientAppointmentModal
        visible={bookingVisible}
        patient={selectedPatient}
        clinicId={activeClinicId}
        token={token}
        onClose={() => setBookingVisible(false)}
        onBooked={() => {
          setBookingVisible(false);
          setDetailsVisible(false);
          void Promise.all([loadPatients(), loadStats()]);
        }}
      />
      <ConsultationHistoryModal
        visible={Boolean(consultationPatient)}
        patient={consultationPatient}
        token={token}
        onClose={() => setConsultationPatient(null)}
      />
      <PatientPrescriptionModal
        visible={Boolean(prescriptionPatient)}
        patient={prescriptionPatient}
        token={token}
        onClose={() => setPrescriptionPatient(null)}
      />
      <PatientMedicalHistoryModal
        visible={Boolean(medicalHistoryPatient)}
        patient={medicalHistoryPatient}
        token={token}
        onClose={() => setMedicalHistoryPatient(null)}
      />
      <ColumnSelectorModal
        visible={showColumnSelector}
        onClose={() => setShowColumnSelector(false)}
        columns={PATIENT_COLUMN_OPTIONS}
        visibleColumns={visibleColumns}
        onToggleColumn={key =>
          setVisibleColumns(previous => ({
            ...previous,
            [key]: !previous[key],
          }))
        }
        onReset={() => setVisibleColumns(DEFAULT_PATIENT_COLUMNS)}
        title="Show/Hide Columns"
        subtitle="Choose which patient details appear in the list"
      />
      <Modal
        visible={Boolean(actionMenu)}
        transparent
        animationType="fade"
        onRequestClose={() => setActionMenu(null)}
      >
        <View style={styles.actionOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setActionMenu(null)}
          />
          {actionMenu ? (
            <View
              style={[
                styles.actionMenu,
                {
                  top:
                    actionMenu.y + actionMenu.height + 250 > windowHeight
                      ? Math.max(8, actionMenu.y - 245)
                      : actionMenu.y + actionMenu.height + 5,
                  left: Math.min(
                    windowWidth - 198,
                    Math.max(8, actionMenu.x + actionMenu.width - 190),
                  ),
                },
              ]}
            >
              <Text style={styles.actionMenuTitle}>Actions</Text>
              <PatientAction
                icon={Eye}
                label="View Details"
                highlighted
                onPress={() => {
                  const patient = actionMenu.patient;
                  setActionMenu(null);
                  openPatientDetails(patient);
                }}
              />
              {canEditPatient ? <PatientAction
                icon={ClipboardList}
                label="Edit Patient"
                onPress={() => {
                  const patient = actionMenu.patient;
                  setActionMenu(null);
                  setEditingPatient(patient);
                  setFormVisible(true);
                }}
              /> : null}
              {canBookAppointment ? <PatientAction
                icon={CalendarPlus}
                label="Book Appointment"
                onPress={() => {
                  const patient = actionMenu.patient;
                  setActionMenu(null);
                  setSelectedPatient(patient);
                  setBookingVisible(true);
                }}
              /> : null}
              <PatientAction
                icon={Stethoscope}
                label="Consultation"
                onPress={() => {
                  const patient = actionMenu.patient;
                  setActionMenu(null);
                  setConsultationPatient(patient);
                }}
              />
              <PatientAction
                icon={FileText}
                label="Prescription"
                onPress={() => {
                  const patient = actionMenu.patient;
                  setActionMenu(null);
                  setPrescriptionPatient(patient);
                }}
              />
              <PatientAction
                icon={History}
                label="Medical History"
                onPress={() => {
                  const patient = actionMenu.patient;
                  setActionMenu(null);
                  setMedicalHistoryPatient(patient);
                }}
              />
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
};

function PatientListCard({
  patient,
  onPress,
  visibleColumns,
  canEdit = false,
  canManageActions = false,
  onOpenActions,
  onToggleStatus,
}: {
  patient: PatientModel;
  onPress: () => void;
  visibleColumns: Record<PatientColumn, boolean>;
  canEdit?: boolean;
  canManageActions?: boolean;
  onOpenActions: (ref: any) => void;
  onToggleStatus: () => void;
}) {
  const { focusedCard, focusCard } = usePatientCardFocus();
  const cardFocusId = `patient-${patient.id}`;
  const actionsRef = useRef<any>(null);
  const active = Number(patient.is_active ?? 1) === 1;
  const rows: { key: PatientColumn; label: string; value: string }[] = [
    { key: 'email', label: 'Email', value: patient.email || '—' },
    { key: 'phone', label: 'Phone', value: patient.phone || '—' },
    { key: 'gender', label: 'Gender', value: patient.gender || '—' },
    {
      key: 'dateOfBirth',
      label: 'Date of Birth',
      value: formatDate(patient.date_of_birth),
    },
    {
      key: 'age',
      label: 'Age',
      value: String(
        patient.age ?? calculateAge(patient.date_of_birth || '') ?? '—',
      ),
    },
    {
      key: 'bloodGroup',
      label: 'Blood Group',
      value: patient.blood_group || '—',
    },
    { key: 'address', label: 'Address', value: patient.address || '—' },
    { key: 'city', label: 'City', value: patient.city || '—' },
    { key: 'state', label: 'State', value: patient.state || '—' },
    {
      key: 'emergencyContact',
      label: 'Emergency Contact',
      value: patient.emergency_contact || '—',
    },
    {
      key: 'emergencyContactName',
      label: 'Emergency Contact Name',
      value: patient.emergency_contact_name || '—',
    },
    {
      key: 'registrationDate',
      label: 'Registration Date',
      value: formatDate(patient.registered_at || patient.created_at),
    },
    { key: 'status', label: 'Status', value: active ? 'Active' : 'Inactive' },
  ];
  return (
    <View style={[styles.patientCard, focusedCard === cardFocusId && focusedCardOutline]}>
      <View style={styles.patientNameRow}>
        <TouchableOpacity
          style={styles.patientIdentity}
          onPress={() => { focusCard(cardFocusId); onPress(); }}
          activeOpacity={0.7}
        >
          {visibleColumns.fullName && (
            <Text style={styles.patientName} numberOfLines={1}>
              {patient.full_name}
            </Text>
          )}
          {visibleColumns.patientCode && (
            <Text style={styles.patientMeta}>
              {patient.patient_code ||
                `PT-${String(patient.id).padStart(5, '0')}`}
            </Text>
          )}
        </TouchableOpacity>
        {visibleColumns.actions && canManageActions && (
          <TouchableOpacity
            ref={actionsRef}
            style={styles.moreButton}
            onPress={() =>
              actionsRef.current && onOpenActions(actionsRef.current)
            }
            accessibilityLabel={`Actions for ${patient.full_name}`}
          >
            <MoreVertical size={17} color="#0F172A" />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.patientDetails}>
        {rows
          .filter(row => visibleColumns[row.key])
          .map(row => (
            <View key={row.key} style={styles.patientDetailRow}>
              <Text style={styles.patientDetailLabel}>{row.label}</Text>
              {row.key === 'status' && canEdit ? (
                <Switch
                  value={active}
                  onValueChange={() => { focusCard(cardFocusId); onToggleStatus(); }}
                  trackColor={{ false: '#CBD5E1', true: '#059669' }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel={`${active ? 'Deactivate' : 'Activate'} ${
                    patient.full_name
                  }`}
                />
              ) : (
                <Text style={styles.patientDetailValue} numberOfLines={1}>
                  {row.value}
                </Text>
              )}
            </View>
          ))}
      </View>
    </View>
  );
}
function PatientAction({
  icon: Icon,
  label,
  onPress,
  highlighted = false,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  onPress: () => void;
  highlighted?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.actionMenuItem,
        highlighted && styles.actionMenuItemHighlighted,
      ]}
    >
      <Icon size={15} color={highlighted ? '#0D9488' : '#334155'} />
      <Text
        style={[
          styles.actionMenuText,
          highlighted && styles.actionMenuTextHighlighted,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    padding: 14,
    paddingBottom: 28,
    gap: 10,
  },
  listHeader: { gap: 10, marginBottom: 3 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  bannerTitleBlock: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitleCopy: { flex: 1, minWidth: 0, marginLeft: 12 },
  bannerTitle: { color: '#0F172A', fontSize: 20, fontWeight: '800' },
  bannerSubtitle: { color: '#64748B', fontSize: 13, marginTop: 2 },
  patientHeaderActions: { flexDirection: 'row', gap: 8 },
  addButton: {
    flex: 1,
    minHeight: 39,
    paddingHorizontal: 11,
    borderRadius: 9,
    backgroundColor: '#26A69A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  exportButton: {
    flex: 1,
    minHeight: 39,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 9,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  exportButtonText: { color: '#1E293B', fontSize: 12, fontWeight: '600' },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 1,
  },
  sectionTitleCopy: { flex: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
  sectionSubtitle: { marginTop: 2, fontSize: 11, color: '#64748B' },
  searchCard: {
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 12, color: '#0F172A' },
  resultsHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 43,
    marginTop: 1,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  resultsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultsTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  patientCard: {
    padding: 11,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  patientInfo: { minWidth: 0, gap: 6 },
  patientNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  patientIdentity: { flex: 1, minWidth: 0, gap: 3 },
  patientName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  moreButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  patientDetails: { gap: 6, marginTop: 8 },
  patientDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  patientDetailLabel: { color: '#718096', fontSize: 10 },
  patientDetailValue: {
    color: '#253247',
    fontSize: 10,
    flexShrink: 1,
    textAlign: 'right',
  },
  activeStatus: { backgroundColor: '#DCFCE7' },
  inactiveStatus: { backgroundColor: '#F1F5F9' },
  activeStatusText: { color: '#15803D' },
  inactiveStatusText: { color: '#64748B' },
  patientMeta: { fontSize: 10, color: '#64748B' },
  actionOverlay: { flex: 1 },
  actionMenu: {
    position: 'absolute',
    width: 190,
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE4EC',
    elevation: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  actionMenuTitle: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  actionMenuItem: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    borderRadius: 7,
  },
  actionMenuItemHighlighted: { backgroundColor: '#DDF5F2' },
  actionMenuText: { color: '#334155', fontSize: 11 },
  actionMenuTextHighlighted: { color: '#0D9488' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 42,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#E6F4F1',
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#334155' },
  emptySubtitle: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
  },
  paginationWrap: {
    marginTop: 5,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 6,
  },
  footerSpacer: { height: 36 },
});

export const PatientsManagementScreen: React.FC<Props> = props => (
  <PatientCardFocusProvider>
    <PatientsManagementContent {...props} />
  </PatientCardFocusProvider>
);

export default PatientsManagementScreen;
