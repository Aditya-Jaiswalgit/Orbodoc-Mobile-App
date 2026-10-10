import { AppModal } from '../../components/common/AppModal';
import { styles } from './styles/PatientsManagement.styles';
import React, {
  useCallback, useEffect, useMemo, useRef, useState, } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, RefreshControl, Share, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
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
import {
  PatientCardFocusProvider,
  focusedCardOutline,
  usePatientCardFocus,
} from '../../components/common/PatientCardFocusContext';
import { Pagination } from '../../components/common/Pagination';
import { ColumnSelectorModal } from '../../components/common/ColumnSelectorModal';
import { PatientModel } from '../../types/clinicTypes';
import { useAuthContext } from '../../context/AuthContext';
import { fetchPatientsApi } from '../../api/patientApi';
import { showErrorToast } from '../../utils/toast';
import {
  PatientDetailsModal,
  PatientFilterPanel,
  PatientFormModal,
  PatientStatsCards,
} from './patients/PatientManagementComponents';
import { PatientAppointmentModal } from './patients/PatientAppointmentModal';
import { ConsultationHistoryModal } from './patients/ConsultationHistoryModal';
import { PatientPrescriptionModal } from './patients/PatientPrescriptionModal';
import { PatientMedicalHistoryModal } from './patients/PatientMedicalHistoryModal';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { usePatientDirectory } from '../../hooks/usePatientDirectory';
import { usePatientActions } from '../../hooks/usePatientActions';
import {
  calculateAge,
  DEFAULT_PATIENT_COLUMNS,
  formatPatientDate as formatDate,
  PAGE_SIZE_OPTIONS,
  PATIENT_COLUMN_OPTIONS,
  PatientColumn,
  toFilterDate,
} from './patients/patientUtils';

interface Props {
  onOpenDrawer: () => void;
  onNavigateScreen?: (screen: string) => void;
  initialStatus?: string;
}

type PatientStatusFilter = 'all' | 'active' | 'inactive';

const PatientsManagementContent: React.FC<Props> = ({
  onOpenDrawer,
  onNavigateScreen,
  initialStatus,
}) => {
  const { focusedCard, focusCard } = usePatientCardFocus();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { token, activeClinicId, role, permissionsMap = {} } = useAuthContext();
  const canViewPatients = canUseStaffScreen(
    role,
    permissionsMap,
    'patients',
    'view',
  );
  const canAddPatient = canUseStaffScreen(
    role,
    permissionsMap,
    'patients',
    'add',
  );
  const canEditPatient = canUseStaffScreen(
    role,
    permissionsMap,
    'patients',
    'edit',
  );
  const canExportPatients =
    canViewPatients &&
    canUseStaffScreen(role, permissionsMap, 'patients', 'execute');
  const canBookAppointment = canUseStaffScreen(
    role,
    permissionsMap,
    'appointments',
    'add',
  );
  const canViewPrescriptions = canUseStaffScreen(
    role,
    permissionsMap,
    'prescriptions',
    'view',
  );
  const canManagePatientActions =
    canViewPatients ||
    canEditPatient ||
    canBookAppointment ||
    canViewPrescriptions;
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PatientStatusFilter>(() =>
    initialStatus === 'active' || initialStatus === 'inactive' ? initialStatus : 'all',
  );
  const [genderFilter, setGenderFilter] = useState('All');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [bookingVisible, setBookingVisible] = useState(false);
  const [consultationPatient, setConsultationPatient] =
    useState<PatientModel | null>(null);
  const [prescriptionPatient, setPrescriptionPatient] =
    useState<PatientModel | null>(null);
  const [medicalHistoryPatient, setMedicalHistoryPatient] =
    useState<PatientModel | null>(null);
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
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    patients,
    stats,
    total: totalItems,
    loading,
    refreshing,
    error: patientLoadError,
    refresh: loadPatients,
    refreshStats: loadStats,
  } = usePatientDirectory({
    token,
    clinicId: activeClinicId,
    canView: canViewPatients,
    page: currentPage,
    pageSize,
    search: debouncedSearch,
    status: statusFilter,
  });
  useEffect(() => {
    if (patientLoadError) showErrorToast('Patients', patientLoadError);
  }, [patientLoadError]);
  const {
    billingSummary,
    consultations,
    detailsLoading,
    detailsVisible,
    editPatient,
    editingPatient,
    formVisible,
    openCreateForm,
    openEditForm,
    openPatientDetails,
    savePatient,
    saving,
    selectedPatient,
    setDetailsVisible,
    setEditingPatient,
    setFormVisible,
    setSelectedPatient,
    togglePatientStatus,
  } = usePatientActions({
    token,
    clinicId: activeClinicId,
    canView: canViewPatients,
    canAdd: canAddPatient,
    canEdit: canEditPatient,
    loadPatients,
    loadStats,
  });

  const handleExportPatients = useCallback(async () => {
    if (!canExportPatients) {
      showErrorToast(
        'Permission denied',
        'You do not have permission to export patient records.',
      );
      return;
    }
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
    canExportPatients,
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
        {canAddPatient ? (
          <TouchableOpacity
            style={[
              styles.addButton,
              focusedCard === 'add-patient' && focusedCardOutline,
            ]}
            onPress={() => {
              focusCard('add-patient');
              openCreateForm();
            }}
          >
            <UserPlus size={16} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Patient</Text>
          </TouchableOpacity>
        ) : null}
        {canExportPatients ? (
          <TouchableOpacity
            style={[
              styles.exportButton,
              focusedCard === 'export' && focusedCardOutline,
            ]}
            onPress={() => {
              focusCard('export');
              handleExportPatients();
            }}
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
        ) : null}
      </View>

      {canViewPatients ? (
        <PatientStatsCards
          total={Number(stats.total_patients) || 0}
          active={Number(stats.active_patients) || 0}
          inactive={Number(stats.inactive_patients) || 0}
          today={Number(stats.today_visits) || 0}
          thisWeek={Number(stats.new_this_week) || 0}
          onSelect={handleStatSelect}
        />
      ) : null}

      {canViewPatients ? (
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionTitleCopy}>
            <Text style={styles.sectionTitle}>Patient Directory</Text>
            <Text style={styles.sectionSubtitle}>
              {totalItems.toLocaleString()} patients in this clinic
            </Text>
          </View>
        </View>
      ) : null}
      {canViewPatients ? (
        <View
          style={[
            styles.searchCard,
            focusedCard === 'search' && focusedCardOutline,
          ]}
        >
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
      ) : null}
      {canViewPatients ? (
        <>
          <PatientFilterPanel
            status={statusFilter}
            gender={genderFilter}
            bloodGroup={bloodGroupFilter}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onOpenColumns={() => {
              focusCard('filters');
              setShowColumnSelector(true);
            }}
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
        </>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Patient Management" />
      {!canViewPatients ? (
        <View style={styles.noViewContent}>
          {listHeader}
          <View style={styles.permissionState}>
            <Text style={styles.emptyTitle}>Patient list access required</Text>
            <Text style={styles.emptySubtitle}>
              Your role does not have permission to view patient records.
            </Text>
          </View>
        </View>
      ) : (
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
      )}

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
        canOpenAppointments={canUseStaffScreen(
          role,
          permissionsMap,
          'appointments',
          'view',
        )}
        canOpenPrescriptions={canViewPrescriptions}
        canOpenLabs={canUseStaffScreen(
          role,
          permissionsMap,
          'lab_reports',
          'view',
        )}
        canOpenBilling={canUseStaffScreen(
          role,
          permissionsMap,
          'treatment_billing',
          'view',
        )}
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
          Promise.all([loadPatients(), loadStats()]);
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
        canExport={canExportPatients}
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
      <AppModal
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
              {canViewPatients ? (
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
              ) : null}
              {canEditPatient ? (
                <PatientAction
                  icon={ClipboardList}
                  label="Edit Patient"
                  onPress={() => {
                    const patient = actionMenu.patient;
                    setActionMenu(null);
                    editPatient(patient);
                  }}
                />
              ) : null}
              {canBookAppointment ? (
                <PatientAction
                  icon={CalendarPlus}
                  label="Book Appointment"
                  onPress={() => {
                    const patient = actionMenu.patient;
                    setActionMenu(null);
                    setSelectedPatient(patient);
                    setBookingVisible(true);
                  }}
                />
              ) : null}
              {canViewPatients ? (
                <PatientAction
                  icon={Stethoscope}
                  label="Consultation"
                  onPress={() => {
                    const patient = actionMenu.patient;
                    setActionMenu(null);
                    setConsultationPatient(patient);
                  }}
                />
              ) : null}
              {canViewPrescriptions ? (
                <PatientAction
                  icon={FileText}
                  label="Prescription"
                  onPress={() => {
                    const patient = actionMenu.patient;
                    setActionMenu(null);
                    setPrescriptionPatient(patient);
                  }}
                />
              ) : null}
              {canViewPatients ? (
                <PatientAction
                  icon={History}
                  label="Medical History"
                  onPress={() => {
                    const patient = actionMenu.patient;
                    setActionMenu(null);
                    setMedicalHistoryPatient(patient);
                  }}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      </AppModal>
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
    <View
      style={[
        styles.patientCard,
        focusedCard === cardFocusId && focusedCardOutline,
      ]}
    >
      <View style={styles.patientNameRow}>
        <TouchableOpacity
          style={styles.patientIdentity}
          onPress={() => {
            focusCard(cardFocusId);
            onPress();
          }}
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
                  onValueChange={() => {
                    focusCard(cardFocusId);
                    onToggleStatus();
                  }}
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

export const PatientsManagementScreen: React.FC<Props> = props => (
  <PatientCardFocusProvider>
    <PatientsManagementContent {...props} />
  </PatientCardFocusProvider>
);

export default PatientsManagementScreen;
