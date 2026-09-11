import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import {
  ActivityPulseIcon,
  CalendarIcon,
  ChevronDownIcon,
  ColumnsIcon,
  EditPenIcon,
  FilterResetIcon,
  MedicalHistoryIcon,
  MoreVerticalIcon,
  PatientUserIcon,
  PrescriptionIcon,
  SearchInputIcon,
  StethoscopeIcon,
  UserPlusIcon,
  UsersIcon,
  ViewDetailsIcon,
} from '../../components/common/CustomIcons';
import { usePatients } from '../../hooks/usePatients';
import { PatientModel } from '../../types/clinicTypes';
import { useAuthContext } from '../../context/AuthContext';
import { bookAppointmentApi } from '../../api/appointmentApi';
import { ColumnsModal, ColumnItem } from '../../components/common/ColumnsModal';
import { InlineCalendarPicker } from '../../components/common/InlineCalendarPicker';
import { useOutsideTapDismiss } from '../../components/common/useOutsideTapDismiss';
import {
  CalendarDays,
  ContactRound,
  Droplets,
  Eye,
  FileText,
  FlaskConical,
  HeartPulse,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SquarePen,
  Stethoscope,
  UserRound,
  UserRoundPlus,
  X,
} from 'lucide-react-native';

export const PATIENT_COLUMNS: ColumnItem[] = [
  { id: 'patient_code', label: 'Patient Code' },
  { id: 'full_name', label: 'Full Name' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'gender', label: 'Gender' },
  { id: 'dob', label: 'Date of Birth' },
  { id: 'age', label: 'Age' },
  { id: 'blood_group', label: 'Blood Group' },
  { id: 'address', label: 'Address' },
  { id: 'city', label: 'City' },
  { id: 'state', label: 'State' },
  { id: 'emergency_contact', label: 'Emergency Contact' },
  { id: 'emergency_name', label: 'Emergency Contact Name' },
  { id: 'registered_on', label: 'Registration Date' },
  { id: 'status', label: 'Status' },
  { id: 'actions', label: 'Actions', isDividerBefore: true },
];

export const DEFAULT_PATIENT_COLUMNS: string[] = [
  'patient_code',
  'full_name',
  'phone',
  'gender',
  'blood_group',
  'registered_on',
  'status',
  'actions',
];

const formatDateLong = (dateStr?: string): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
};

const formatDateShort = (dateStr?: string): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
};

const formatDisplayDate = formatDateLong;

const calculateAge = (dobStr?: string): string => {
  if (!dobStr) return '';
  try {
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return '';
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
    return calculatedAge > 0 ? `${calculatedAge} yrs` : '';
  } catch (e) {
    return '';
  }
};

const calculateAgeFromDob = calculateAge;

interface PatientsScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
  onToggleTabBar?: (hide: boolean) => void;
}

export const PatientsScreen: React.FC<PatientsScreenProps> = ({
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
  onToggleTabBar,
}) => {
  const {
    patients,
    stats,
    loading,
    refreshPatients,
    updatePatient,
    addPatient,
    deletePatient,
    togglePatientStatus,
    fetchPatientDetails,
    fetchPatientConsultations,
    fetchPatientMedicalHistory,
    fetchPatientPrescriptions,
    fetchPrescriptionDetails,
  } = usePatients();

  const handleToggleStatus = async (patient: PatientModel) => {
    const currentIsActive = patient.is_active !== false;
    try {
      await togglePatientStatus(patient.id, currentIsActive);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update patient status');
    }
  };

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<string>('All Genders');
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>('All Blood Groups');
  const [statusFilter, setStatusFilter] = useState<string>('All Status');
  const [registrationDateFilter, setRegistrationDateFilter] = useState<string>('');
  const [showRegistrationCalendar, setShowRegistrationCalendar] = useState<boolean>(false);
  const [activePanel, setActivePanel] = useState<'filters' | 'patients' | 'total' | 'active' | 'inactive' | 'today' | 'week' | null>(null);

  const [selectedPatient, setSelectedPatient] = useState<PatientModel | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);

  const { token, user, permissions } = useAuthContext();
  const normalizedRole = String(user?.role || user?.roleName || user?.role_name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const patientPermissions = Object.entries(permissions || {}).find(([name]) =>
    String(name).trim().toLowerCase().replace(/[\s-]+/g, '_') === 'patients',
  )?.[1] || {};
  const hasPatientPermission = (action: 'can_add' | 'can_edit' | 'can_delete') =>
    normalizedRole === 'super_admin' || patientPermissions[action] === true || patientPermissions[action] === 1 || patientPermissions[action] === '1';
  const canAddPatient = normalizedRole !== 'patient' && hasPatientPermission('can_add');
  const canEditPatient = normalizedRole !== 'patient' && hasPatientPermission('can_edit');
  const canDeletePatient = normalizedRole !== 'patient' && hasPatientPermission('can_delete');
  // Booking from another patient's action menu belongs only to doctors.
  const canBookPatientAppointment = normalizedRole === 'doctor';

  const [showActionMenuModal, setShowActionMenuModal] = useState<boolean>(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const actionMenuTriggerRefs = React.useRef<Record<string, any>>({});
  const [showViewDetailsModal, setShowViewDetailsModal] = useState<boolean>(false);
  const [showEditPatientModal, setShowEditPatientModal] = useState<boolean>(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState<boolean>(false);
  const [showConsultationsModal, setShowConsultationsModal] = useState<boolean>(false);
  const [showPrescriptionsModal, setShowPrescriptionsModal] = useState<boolean>(false);
  const [showMedicalHistoryModal, setShowMedicalHistoryModal] = useState<boolean>(false);
  const [showBookAppointmentModal, setShowBookAppointmentModal] = useState<boolean>(false);

  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState<string>('10:00:00');
  const [bookingMode, setBookingMode] = useState<'in_person' | 'video'>('in_person');
  const [bookingFee, setBookingFee] = useState<string>('500');
  const [bookingReason, setBookingReason] = useState<string>('General Consultation');
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [bookingSubmitting, setBookingSubmitting] = useState<boolean>(false);

  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [consultationList, setConsultationList] = useState<any[]>([]);
  const [medicalHistoryData, setMedicalHistoryData] = useState<any>(null);
  const [prescriptionList, setPrescriptionList] = useState<any[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');
  const [historyRecordFilter, setHistoryRecordFilter] = useState<'all' | 'visits' | 'reports'>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState<'all' | '30-days' | '90-days' | 'this-year'>('all');
  const [consultSearchQuery, setConsultSearchQuery] = useState<string>('');

  const handleSelectPrescription = async (p: any) => {
    setSelectedPrescription(p);
    if (p && p.id) {
      const details = await fetchPrescriptionDetails(p.id);
      if (details) {
        setSelectedPrescription((prev: any) => ({ ...prev, ...details }));
      }
    }
  };

  const [editName, setEditName] = useState<string>('');
  const [editDob, setEditDob] = useState<string>('');
  const [editGender, setEditGender] = useState<'male' | 'female' | 'other'>('female');
  const [editBloodGroup, setEditBloodGroup] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editState, setEditState] = useState<string>('');
  const [editCity, setEditCity] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editEmergencyName, setEditEmergencyName] = useState<string>('');
  const [editEmergencyRelation, setEditEmergencyRelation] = useState<string>('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState<string>('');

  const [showGenderPicker, setShowGenderPicker] = useState<boolean>(false);
  const [showBloodPicker, setShowBloodPicker] = useState<boolean>(false);
  const [showStatusPicker, setShowStatusPicker] = useState<boolean>(false);
  const [showEditBloodPicker, setShowEditBloodPicker] = useState<boolean>(false);
  const [showColumnsModal, setShowColumnsModal] = useState<boolean>(false);
  const [columnsAnchorY, setColumnsAnchorY] = useState<number | undefined>(undefined);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_PATIENT_COLUMNS);
  const genderFieldRef = React.useRef<View>(null);
  const genderMenuRef = React.useRef<View>(null);
  const bloodFieldRef = React.useRef<View>(null);
  const bloodMenuRef = React.useRef<View>(null);
  const statusFieldRef = React.useRef<View>(null);
  const statusMenuRef = React.useRef<View>(null);
  const registrationDateFieldRef = React.useRef<View>(null);
  const registrationCalendarRef = React.useRef<View>(null);
  const dismissInlinePickerOnOutsideTap = useOutsideTapDismiss(React.useMemo(() => [
    { id: 'gender', open: showGenderPicker, refs: [genderFieldRef, genderMenuRef], dismiss: () => setShowGenderPicker(false) },
    { id: 'blood', open: showBloodPicker, refs: [bloodFieldRef, bloodMenuRef], dismiss: () => setShowBloodPicker(false) },
    { id: 'status', open: showStatusPicker, refs: [statusFieldRef, statusMenuRef], dismiss: () => setShowStatusPicker(false) },
    { id: 'registration-date', open: showRegistrationCalendar, refs: [registrationDateFieldRef, registrationCalendarRef], dismiss: () => setShowRegistrationCalendar(false) },
  ], [showGenderPicker, showBloodPicker, showStatusPicker, showRegistrationCalendar]));

  // Hide footer bottom bar whenever any modal or bottom sheet is open
  useEffect(() => {
    if (onToggleTabBar) {
      const isAnyModalOpen =
        showViewDetailsModal ||
        showEditPatientModal ||
        showConsultationsModal ||
        showPrescriptionsModal ||
        showMedicalHistoryModal ||
        showBookAppointmentModal ||
        showColumnsModal;
      onToggleTabBar(isAnyModalOpen);
    }
  }, [
    showViewDetailsModal,
    showEditPatientModal,
    showConsultationsModal,
    showPrescriptionsModal,
    showMedicalHistoryModal,
    showBookAppointmentModal,
    showColumnsModal,
    onToggleTabBar,
  ]);

  useEffect(() => {
    return () => {
      onToggleTabBar?.(false);
    };
  }, [onToggleTabBar]);

  const handleToggleColumn = (colId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  const handleResetFilters = () => {
    setActivePanel('filters');
    setSearchQuery('');
    setGenderFilter('All Genders');
    setBloodGroupFilter('All Blood Groups');
    setStatusFilter('All Status');
    setRegistrationDateFilter('');
    setShowRegistrationCalendar(false);
  };

  const handleStatPress = (panel: 'total' | 'active' | 'inactive' | 'today' | 'week') => {
    setActivePanel(panel);
    if (panel === 'total') {
      handleResetFilters();
      setActivePanel(panel);
    } else if (panel === 'active') {
      setStatusFilter('Active');
    } else if (panel === 'inactive') {
      setStatusFilter('Inactive');
    } else if (panel === 'today') {
      setRegistrationDateFilter(new Date().toISOString().split('T')[0]);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const code = (p as any).patient_code || `PT-${String(p.id).padStart(5, '0')}`;
    const matchesSearch =
      q === '' ||
      p.full_name.toLowerCase().includes(q) ||
      (p.phone && p.phone.includes(q)) ||
      code.toLowerCase().includes(q);

    const matchesGender =
      genderFilter === 'All Genders' ||
      (p.gender && p.gender.toLowerCase() === genderFilter.toLowerCase());

    const matchesBlood =
      bloodGroupFilter === 'All Blood Groups' ||
      (p.blood_group && p.blood_group === bloodGroupFilter);

    const isActive = p.is_active !== false && (p as any).is_active !== 0 && (p as any).is_active !== '0';
    const matchesStatus =
      statusFilter === 'All Status' ||
      (statusFilter === 'Active' ? isActive : !isActive);

    const registeredAt = String((p as any).registered_at || (p as any).created_at || '');
    const matchesRegistrationDate = !registrationDateFilter || registeredAt.startsWith(registrationDateFilter);

    return matchesSearch && matchesGender && matchesBlood && matchesStatus && matchesRegistrationDate;
  });

  const resetPatientForm = () => {
    setEditName('');
    setEditDob('');
    setEditGender('female');
    setEditBloodGroup('');
    setEditPhone('');
    setEditEmail('');
    setEditState('');
    setEditCity('');
    setEditAddress('');
    setEditEmergencyName('');
    setEditEmergencyRelation('');
    setEditEmergencyPhone('');
  };

  const openCreatePatient = () => {
    resetPatientForm();
    setSelectedPatient(null);
    setIsCreatingPatient(true);
    setShowEditPatientModal(true);
  };

  const handleOpenAction = async (
    actionType: 'details' | 'edit' | 'consultation' | 'prescription' | 'history' | 'book_appointment'
  ) => {
    setShowActionMenuModal(false);
    const targetPatient = selectedPatient || patients[0];
    if (!targetPatient) return;

    if (actionType === 'book_appointment') {
      if (!canBookPatientAppointment) return;
      const todayStr = new Date().toISOString().split('T')[0];
      setBookingDate(todayStr);
      setBookingTime('10:00:00');
      setBookingMode('in_person');
      setBookingFee('500');
      setBookingReason('General Consultation');
      setBookingNotes('');
      setShowBookAppointmentModal(true);
      return;
    }

    if (actionType === 'details') {
      setShowViewDetailsModal(true);
      setModalLoading(true);
      const detailed = await fetchPatientDetails(targetPatient.id);
      if (detailed) {
        setSelectedPatient(detailed);
      }
      setModalLoading(false);
    } else if (actionType === 'edit') {
      setIsCreatingPatient(false);
      setShowEditPatientModal(true);
      setModalLoading(true);
      const detailed = await fetchPatientDetails(targetPatient.id);
      const p = detailed || targetPatient;

      setEditName(p.full_name || '');
      setEditDob(p.date_of_birth || (p as any).dob || '');
      setEditGender((p.gender as any) || 'female');
      setEditBloodGroup(p.blood_group || '');
      setEditPhone(p.phone || '');
      setEditEmail(p.email || '');
      setEditState((p as any).state || '');
      setEditCity((p as any).city || '');
      setEditAddress(p.address || '');
      setEditEmergencyName((p as any).emergency_contact_name || (p as any).emergency_name || '');
      setEditEmergencyRelation((p as any).emergency_contact_relation || (p as any).emergency_relation || '');
      setEditEmergencyPhone(p.emergency_contact || '');
      setModalLoading(false);
    } else if (actionType === 'consultation') {
      setShowConsultationsModal(true);
      setModalLoading(true);
      setConsultSearchQuery('');
      const list = await fetchPatientConsultations(targetPatient.id);
      setConsultationList(list);
      setModalLoading(false);
    } else if (actionType === 'prescription') {
      setShowPrescriptionsModal(true);
      setModalLoading(true);
      const list = await fetchPatientPrescriptions(targetPatient.id);
      setPrescriptionList(list);
      if (list && list.length > 0) {
        setSelectedPrescription(list[0]);
        const details = await fetchPrescriptionDetails(list[0].id);
        if (details) {
          setSelectedPrescription((prev: any) => ({ ...prev, ...details }));
        }
      } else {
        setSelectedPrescription(null);
      }
      setModalLoading(false);
    } else if (actionType === 'history') {
      setShowMedicalHistoryModal(true);
      setModalLoading(true);
      setHistorySearchQuery('');
      setHistoryRecordFilter('all');
      setHistoryDateFilter('all');
      // Fetch both medical history and consultations in parallel for dynamic visit + lab data
      const [historyData, consultations] = await Promise.all([
        fetchPatientMedicalHistory(targetPatient.id).catch(() => null),
        fetchPatientConsultations(targetPatient.id).catch(() => []),
      ]);
      // Merge consultations into the visit list for dynamic backend data
      const mergedVisits = [
        ...(historyData?.visits || []),
        ...(consultations || []),
      ].filter((v: any, idx: number, arr: any[]) => {
        // Deduplicate by appointment_id or id
        const key = v.appointment_id || v.id;
        if (!key) return true;
        return arr.findIndex((x: any) => (x.appointment_id || x.id) === key) === idx;
      });
      const mergedData = historyData
        ? { ...historyData, visits: mergedVisits }
        : { visits: mergedVisits, labReports: [] };
      setMedicalHistoryData(mergedData);
      setModalLoading(false);
    }
  };

  const handleBookAppointmentSubmit = async () => {
    const targetPatient = selectedPatient || (patients || [])[0];
    if (!targetPatient) {
      Alert.alert('Error', 'No patient selected');
      return;
    }
    if (!bookingDate.trim()) {
      Alert.alert('Required', 'Please enter appointment date (YYYY-MM-DD)');
      return;
    }

    setBookingSubmitting(true);
    try {
      const docId = (user as any)?.id || (user as any)?.userId || (targetPatient as any)?.doctor_id || 1;
      const payload = {
        patient_id: targetPatient.id,
        doctor_id: docId,
        appointment_date: bookingDate.trim(),
        appointment_time: bookingTime.trim() || '10:00:00',
        consultation_mode: bookingMode,
        consultation_fee: Number(bookingFee || 500),
        reason: bookingReason.trim() || 'General Consultation',
        notes: bookingNotes.trim(),
      };

      const res = await bookAppointmentApi(token || '', payload as any);
      if (res.success) {
        Alert.alert(
          'Appointment Booked! 📅',
          `Successfully booked appointment for ${targetPatient.full_name} on ${bookingDate.trim()} at ${bookingTime.trim() || '10:00 AM'}.`
        );
        setShowBookAppointmentModal(false);
        if (refreshPatients) refreshPatients();
      } else {
        Alert.alert('Booking Failed', res.message || 'Could not book appointment');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to book appointment');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleSaveEditPatient = async () => {
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }
    if (!editPhone.trim() || !/^[6-9]\d{9}$/.test(editPhone.trim())) {
      Alert.alert('Validation Error', 'A valid 10-digit mobile number is required.');
      return;
    }

    const payload: any = {
      full_name: editName.trim(),
      date_of_birth: editDob || undefined,
      gender: editGender,
      blood_group: editBloodGroup === 'Select blood group' ? undefined : editBloodGroup,
      email: editEmail.trim() || undefined,
      state: editState.trim() || undefined,
      city: editCity.trim() || undefined,
      address: editAddress.trim() || undefined,
      emergency_contact_name: editEmergencyName.trim() || undefined,
      emergency_contact_relation: editEmergencyRelation.trim() || undefined,
    };

    if (editPhone.trim() && /^[6-9]\d{9}$/.test(editPhone.trim())) {
      payload.phone = editPhone.trim();
    }
    if (editEmergencyPhone.trim() && /^[6-9]\d{9}$/.test(editEmergencyPhone.trim())) {
      payload.emergency_contact = editEmergencyPhone.trim();
    }

    try {
      const result = isCreatingPatient
        ? await addPatient(payload as any)
        : selectedPatient
          ? await updatePatient(selectedPatient.id, payload as any)
          : null;
      if (!result?.success) {
        Alert.alert('Unable to save patient', result?.message || 'Please try again.');
        return;
      }
      Alert.alert('Success', isCreatingPatient ? 'Patient registered successfully!' : 'Patient information updated successfully!');
      setShowEditPatientModal(false);
      setIsCreatingPatient(false);
      refreshPatients();
    } catch (e: any) {
      Alert.alert('Unable to save patient', e.message || 'Please try again.');
    }
  };

  const handleDeletePatient = () => {
    if (!selectedPatient) return;
    Alert.alert(
      'Delete patient?',
      `This will permanently delete ${selectedPatient.full_name}'s patient record.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deletePatient(selectedPatient.id);
            if (result.success) {
              setShowActionMenuModal(false);
              setSelectedPatient(null);
              Alert.alert('Patient deleted', 'The patient record was removed.');
            } else {
              Alert.alert('Unable to delete patient', result.message || 'Please try again.');
            }
          },
        },
      ],
    );
  };

  const activeDisplayPatient = selectedPatient || patients[0];

  return (
    <View style={styles.container} onTouchStart={dismissInlinePickerOnOutsideTap}>
      <PatientHeader showLogo={false} onOpenDrawer={onOpenDrawer} onOpenNotifications={onOpenNotifications} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshPatients} colors={['#0d9488']} />}>
        {/* Title Row */}
        <View style={styles.headerBox}>
          <View style={styles.titleRow}>
            <UsersIcon color="#0f172a" size={24} />
            <Text style={styles.pageTitle}>Patient Management</Text>
            {canAddPatient ? (
              <TouchableOpacity style={styles.addPatientButton} onPress={openCreatePatient} activeOpacity={0.8}>
                <UserPlusIcon color="#ffffff" size={16} />
                <Text style={styles.addPatientButtonText}>Add</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.pageSub}>Manage patient records and medical history</Text>
        </View>

        {/* 2x2 Stats Grid (Exact match to screenshot) */}
        <View style={styles.statsGrid}>
          {/* Row 1 */}
          <View style={styles.statsRow}>
            {/* Card 1: Total Patients */}
            <TouchableOpacity activeOpacity={0.86} style={[styles.statCard, activePanel === 'total' && styles.surfaceActive]} onPress={() => handleStatPress('total')}>
              <View style={[styles.statIconBox, { backgroundColor: '#ecfdf5' }]}>
                <UsersIcon color="#0d9488" size={20} />
              </View>
              <View style={styles.statContentCol}>
                <Text style={styles.statNumber}>{stats.totalPatients}</Text>
                <Text style={styles.statLabel}>Total Patients</Text>
              </View>
            </TouchableOpacity>

            {/* Card 2: Active / Inactive */}
            <TouchableOpacity activeOpacity={0.86} style={[styles.statCard, (activePanel === 'active' || activePanel === 'inactive') && styles.surfaceActive]} onPress={() => handleStatPress('active')}>
              <View style={[styles.statIconBox, { backgroundColor: '#ecfdf5' }]}>
                <ActivityPulseIcon color="#10b981" size={20} />
              </View>
              <View style={styles.statSplitContent}>
                <TouchableOpacity style={styles.statSplitCol} onPress={() => handleStatPress('active')}>
                  <Text style={[styles.statNumber, { color: '#16a34a' }]}>{stats.activeCount}</Text>
                  <Text style={styles.statLabel}>Active</Text>
                </TouchableOpacity>
                <View style={styles.statSplitDivider} />
                <TouchableOpacity style={styles.statSplitCol} onPress={() => handleStatPress('inactive')}>
                  <Text style={[styles.statNumber, { color: '#475569' }]}>{stats.inactiveCount}</Text>
                  <Text style={styles.statLabel}>Inactive</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>

          {/* Row 2 */}
          <View style={styles.statsRow}>
            {/* Card 3: Today's Registration */}
            <TouchableOpacity activeOpacity={0.86} style={[styles.statCard, activePanel === 'today' && styles.surfaceActive]} onPress={() => handleStatPress('today')}>
              <View style={[styles.statIconBox, { backgroundColor: '#ecfdf5' }]}>
                <CalendarIcon color="#0d9488" size={20} />
              </View>
              <View style={styles.statContentCol}>
                <Text style={styles.statNumber}>{stats.todayCount}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>Today's Patient Registr...</Text>
              </View>
            </TouchableOpacity>

            {/* Card 4: New This Week */}
            <TouchableOpacity activeOpacity={0.86} style={[styles.statCard, activePanel === 'week' && styles.surfaceActive]} onPress={() => handleStatPress('week')}>
              <View style={[styles.statIconBox, { backgroundColor: '#fff7ed' }]}> 
                <UserRoundPlus color="#f59e0b" size={20} strokeWidth={2} />
              </View>
              <View style={styles.statContentCol}>
                <Text style={styles.statNumber}>{stats.newThisWeek}</Text>
                <Text style={styles.statLabel}>New This Week</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Card (Exact match to screenshot) */}
        <View style={[styles.filterCard, activePanel === 'filters' && styles.surfaceActive]} onTouchStart={() => setActivePanel('filters')}>
          {/* Row 1: Search */}
          <View style={styles.searchInputBox}>
            <SearchInputIcon size={16} color="#94a3b8" />
            <TextInput
              style={styles.searchTextInput}
              placeholder="Search by patient code, name, or phone..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setActivePanel('filters')}
            />
          </View>

          {/* Row 2: All Genders & All Blood Groups */}
          <View style={[styles.filterDropdownsRow, (showGenderPicker || showBloodPicker) && styles.filterDropdownsRowActive]}>
            <View ref={genderFieldRef} collapsable={false} style={[styles.inlineDropdownWrapper, showGenderPicker && styles.inlineDropdownWrapperActive]}>
              <TouchableOpacity activeOpacity={0.8} style={styles.filterDropdownBtn} onPress={() => { setShowGenderPicker((open) => !open); setShowBloodPicker(false); setShowStatusPicker(false); }}>
                <Text style={styles.filterDropdownText} numberOfLines={1}>{genderFilter}</Text>
                <ChevronDownIcon size={14} color="#94a3b8" />
              </TouchableOpacity>
              {showGenderPicker && (
                <View ref={genderMenuRef} collapsable={false} style={styles.inlineDropdownMenu}>
                  {['All Genders', 'Male', 'Female', 'Other'].map((gender) => {
                    const selected = genderFilter === gender;
                    return <TouchableOpacity key={gender} style={[styles.inlineDropdownOption, selected && styles.inlineDropdownOptionSelected]} onPress={() => { setGenderFilter(gender); setShowGenderPicker(false); }}>
                      <Text style={[styles.inlineDropdownOptionText, selected && styles.inlineDropdownOptionTextSelected]}>{selected ? '✓  ' : '    '}{gender}</Text>
                    </TouchableOpacity>;
                  })}
                </View>
              )}
            </View>

            <View ref={bloodFieldRef} collapsable={false} style={[styles.inlineDropdownWrapper, showBloodPicker && styles.inlineDropdownWrapperActive]}>
              <TouchableOpacity activeOpacity={0.8} style={styles.filterDropdownBtn} onPress={() => { setShowBloodPicker((open) => !open); setShowGenderPicker(false); setShowStatusPicker(false); }}>
                <Text style={styles.filterDropdownText} numberOfLines={1}>{bloodGroupFilter}</Text>
                <ChevronDownIcon size={14} color="#94a3b8" />
              </TouchableOpacity>
              {showBloodPicker && (
                <View ref={bloodMenuRef} collapsable={false} style={styles.inlineDropdownMenu}>
                  {['All Blood Groups', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'N/A'].map((bloodGroup) => {
                    const selected = bloodGroupFilter === bloodGroup;
                    return <TouchableOpacity key={bloodGroup} style={[styles.inlineDropdownOption, selected && styles.inlineDropdownOptionSelected]} onPress={() => { setBloodGroupFilter(bloodGroup); setShowBloodPicker(false); }}>
                      <Text style={[styles.inlineDropdownOptionText, selected && styles.inlineDropdownOptionTextSelected]}>{selected ? '✓  ' : '    '}{bloodGroup}</Text>
                    </TouchableOpacity>;
                  })}
                </View>
              )}
            </View>
          </View>

          {/* Row 3: All Status & Registration Date */}
          <View style={[styles.filterDropdownsRow, (showStatusPicker || showRegistrationCalendar) && styles.filterDropdownsRowActive]}>
            <View ref={statusFieldRef} collapsable={false} style={[styles.inlineDropdownWrapper, showStatusPicker && styles.inlineDropdownWrapperActive]}>
              <TouchableOpacity activeOpacity={0.8} style={styles.filterDropdownBtn} onPress={() => { setShowStatusPicker((open) => !open); setShowGenderPicker(false); setShowBloodPicker(false); }}>
                <Text style={styles.filterDropdownText} numberOfLines={1}>{statusFilter}</Text>
                <ChevronDownIcon size={14} color="#94a3b8" />
              </TouchableOpacity>
              {showStatusPicker && (
                <View ref={statusMenuRef} collapsable={false} style={styles.inlineDropdownMenu}>
                  {['All Status', 'Active', 'Inactive'].map((status) => {
                    const selected = statusFilter === status;
                    return <TouchableOpacity key={status} style={[styles.inlineDropdownOption, selected && styles.inlineDropdownOptionSelected]} onPress={() => { setStatusFilter(status); setShowStatusPicker(false); }}>
                      <Text style={[styles.inlineDropdownOptionText, selected && styles.inlineDropdownOptionTextSelected]}>{selected ? '✓  ' : '    '}{status}</Text>
                    </TouchableOpacity>;
                  })}
                </View>
              )}
            </View>

            <View ref={registrationDateFieldRef} collapsable={false} style={[styles.inlineDateWrapper, showRegistrationCalendar && styles.inlineDropdownWrapperActive, { flex: 1.2 }]}>
              <TouchableOpacity style={[styles.filterDropdownBtn, { justifyContent: 'flex-start', gap: 8 }]} activeOpacity={0.8} onPress={() => setShowRegistrationCalendar((open) => !open)}>
                <CalendarIcon size={15} color="#94a3b8" />
                <Text style={[styles.registrationDateInput, !registrationDateFilter && styles.registrationDatePlaceholder]}>{registrationDateFilter || 'Registration date'}</Text>
              </TouchableOpacity>
              {showRegistrationCalendar && (
                <View ref={registrationCalendarRef} collapsable={false} style={styles.inlineRegistrationCalendar}>
                  <InlineCalendarPicker value={registrationDateFilter} onSelect={setRegistrationDateFilter} onClose={() => setShowRegistrationCalendar(false)} />
                </View>
              )}
            </View>
          </View>

          {/* Row 4: Reset Filter & Columns */}
          <View style={styles.filterActionsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.filterResetBtn}
              onPress={handleResetFilters}>
              <FilterResetIcon size={15} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.columnsBtn}
              onPress={(event) => { setColumnsAnchorY(event.nativeEvent.pageY); setShowColumnsModal(true); }}>
              <ColumnsIcon size={15} color="#0f172a" />
              <Text style={styles.columnsBtnText}>Columns</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Patients Section */}
        <View style={[styles.patientsSection, activePanel === 'patients' && styles.surfaceActive]} onTouchStart={() => setActivePanel('patients')}>
          <View style={styles.sectionHeaderRow}>
            <UsersIcon color="#0f172a" size={20} />
            <Text style={styles.sectionTitleText}>Patients ({filteredPatients.length})</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 36 }} />
          ) : filteredPatients.length === 0 ? (
            <View style={styles.emptyCard}>
              <UsersIcon color="#94a3b8" size={40} />
              <Text style={styles.emptyTitle}>No Patients Found</Text>
              <Text style={styles.emptySub}>No patient records found matching your filters.</Text>
            </View>
          ) : (
            <View style={styles.patientsListContainer}>
              {filteredPatients.map((item, idx) => {
                const patientCode = (item as any).patient_code || `PT-${String(item.id).padStart(5, '0')}`;
                const regDate = formatDateShort(item.registered_at || (item as any).created_at);
                const isActive = item.is_active !== false && (item as any).is_active !== 0 && (item as any).is_active !== '0';

                const hasHeader =
                  selectedColumns.includes('full_name') ||
                  selectedColumns.includes('patient_code') ||
                  selectedColumns.includes('actions');

                return (
                  <View
                    key={item.id ? `pt-${item.id}-${idx}` : `pt-${idx}`}
                    style={[styles.patientCard, selectedPatient?.id === item.id && styles.patientCardSelected]}
                    onTouchStart={() => {
                      setSelectedPatient(item);
                      setActivePanel('patients');
                    }}>
                    {/* Top Row: Name + Code & 3-Dots Button */}
                    {hasHeader && (
                      <View style={styles.patientCardHeader}>
                        <View style={styles.patientNameCol}>
                          {selectedColumns.includes('full_name') && (
                            <Text style={styles.patientNameText}>{item.full_name}</Text>
                          )}
                          {selectedColumns.includes('patient_code') && (
                            <Text style={styles.patientCodeText}>{patientCode}</Text>
                          )}
                        </View>

                        {selectedColumns.includes('actions') && (
                          <TouchableOpacity
                            ref={(ref) => { actionMenuTriggerRefs.current[String(item.id)] = ref; }}
                            activeOpacity={0.7}
                            style={styles.moreActionBtn}
                            onPress={() => {
                              setSelectedPatient(item);
                              actionMenuTriggerRefs.current[String(item.id)]?.measureInWindow((x: number, y: number, width: number, height: number) => {
                                setActionMenuAnchor({ x, y, width, height });
                                setShowActionMenuModal(true);
                              });
                            }}>
                            <MoreVerticalIcon size={18} color="#0f172a" />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {/* Field Rows (Label left, Value right) */}
                    <View style={styles.patientFieldsList}>
                      {/* Email */}
                      {selectedColumns.includes('email') && (
                        <View style={styles.patientFieldRow}>
                          <Text style={styles.fieldLabel}>Email</Text>
                          <Text style={styles.fieldValue}>{item.email || '-'}</Text>
                        </View>
                      )}

                      {/* Phone */}
                      {selectedColumns.includes('phone') && (
                        <View style={styles.patientFieldRow}>
                          <Text style={styles.fieldLabel}>Phone</Text>
                          <Text style={styles.fieldValue}>{item.phone || '-'}</Text>
                        </View>
                      )}

                      {/* Gender */}
                      {selectedColumns.includes('gender') && (
                        <View style={styles.patientFieldRow}>
                          <Text style={styles.fieldLabel}>Gender</Text>
                          <Text style={styles.fieldValue}>
                            {item.gender ? item.gender.charAt(0).toUpperCase() + item.gender.slice(1) : '-'}
                          </Text>
                        </View>
                      )}

                      {/* Date of Birth */}
                      {selectedColumns.includes('dob') && (
                        <View style={styles.patientFieldRow}>
                          <Text style={styles.fieldLabel}>Date of Birth</Text>
                          <Text style={styles.fieldValue}>
                            {formatDateShort(item.date_of_birth || (item as any).dob)}
                          </Text>
                        </View>
                      )}

                      {/* Age */}
                      {selectedColumns.includes('age') && (
                        <View style={styles.patientFieldRow}>
                          <Text style={styles.fieldLabel}>Age</Text>
                          <Text style={styles.fieldValue}>
                            {(item as any).age ? String((item as any).age) : (calculateAge(item.date_of_birth || (item as any).dob) || '-')}
                          </Text>
                        </View>
                      )}

                      {/* Blood Group */}
                      {selectedColumns.includes('blood_group') && (
                        <View style={styles.patientFieldRow}>
                          <Text style={styles.fieldLabel}>Blood Group</Text>
                          <Text style={styles.fieldValue}>
                            {item.blood_group || (item as any).bloodGroup || (item as any).blood_type || '-'}
                          </Text>
                        </View>
                      )}

                      {/* Address */}
                      {selectedColumns.includes('address') && (
                        <View style={styles.patientFieldRow}>
                          <Text style={styles.fieldLabel}>Address</Text>
                          <Text style={styles.fieldValue} numberOfLines={2}>
                            {item.address ||
                              ((item as any).address_line1
                                ? `${(item as any).address_line1}${(item as any).address_line2 ? `, ${(item as any).address_line2}` : ''}`
                                : (item as any).street ||
                                  ([(item as any).city, (item as any).state].filter(Boolean).join(', ')) ||
                                  '-')}
                          </Text>
                        </View>
                      )}

                      {/* City */}
                      {selectedColumns.includes('city') && (
                        <View style={styles.patientFieldRow}>
                          <Text style={styles.fieldLabel}>City</Text>
                          <Text style={styles.fieldValue}>{(item as any).city || '-'}</Text>
                        </View>
                      )}

                      {/* State */}
                      {selectedColumns.includes('state') && (
                        <View style={styles.patientFieldRow}>
                          <Text style={styles.fieldLabel}>State</Text>
                          <Text style={styles.fieldValue}>{(item as any).state || '-'}</Text>
                        </View>
                      )}

                      {/* Emergency Contact */}
                      {selectedColumns.includes('emergency_contact') && (
                        <View style={styles.patientFieldRow}>
                          <Text style={styles.fieldLabel}>Emergency Contact</Text>
                          <Text style={styles.fieldValue}>
                            {item.emergency_contact || (item as any).emergency_phone || '-'}
                          </Text>
                        </View>
                      )}

                      {/* Emergency Contact Name */}
                      {selectedColumns.includes('emergency_name') && (
                        <View style={styles.patientFieldRow}>
                          <Text style={styles.fieldLabel}>Emergency Contact Name</Text>
                          <Text style={styles.fieldValue}>
                            {(item as any).emergency_contact_name || (item as any).emergency_name || '-'}
                          </Text>
                        </View>
                      )}

                      {/* Registered On */}
                      {selectedColumns.includes('registered_on') && (
                        <View style={styles.patientFieldRow}>
                          <Text style={styles.fieldLabel}>Registered On</Text>
                          <Text style={styles.fieldValue}>{regDate}</Text>
                        </View>
                      )}

                      {/* Status with clickable green toggle switch */}
                      {selectedColumns.includes('status') && (
                        <View style={styles.patientFieldRow}>
                          <Text style={styles.fieldLabel}>Status</Text>
                          <TouchableOpacity
                            activeOpacity={0.85}
                            style={[
                              styles.toggleSwitchTrack,
                              isActive ? styles.toggleSwitchTrackActive : styles.toggleSwitchTrackInactive,
                            ]}
                            disabled={!canEditPatient}
                            onPress={() => handleToggleStatus(item)}>
                            <View
                              style={[
                                styles.toggleSwitchThumb,
                                isActive ? styles.toggleSwitchThumbActive : styles.toggleSwitchThumbInactive,
                              ]}
                            />
                          </TouchableOpacity>
                        </View>
                      )}

                      {selectedColumns.length === 0 && (
                        <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', paddingVertical: 10 }}>
                          No columns selected. Tap "Columns" above to choose fields.
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Compact action popover anchored to the card's 3-dot button. */}
      <Modal visible={showActionMenuModal} transparent animationType="fade" onRequestClose={() => setShowActionMenuModal(false)}>
        <View style={styles.actionPopoverOverlay}>
          <Pressable style={styles.actionPopoverBackdrop} onPress={() => setShowActionMenuModal(false)} />
          <View style={[styles.actionPopover, {
            top: Math.min((actionMenuAnchor?.y || 0) + (actionMenuAnchor?.height || 36) + 4, Dimensions.get('window').height - 246),
            left: Math.max(8, (actionMenuAnchor?.x || 0) + (actionMenuAnchor?.width || 0) - 136),
          }]}>
            <Text style={styles.actionPopoverTitle}>Actions</Text>
            <TouchableOpacity style={styles.actionPopoverRow} onPress={() => handleOpenAction('details')}><Eye color="#334155" size={15} strokeWidth={1.9} /><Text style={styles.actionPopoverText}>View Details</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionPopoverRow} onPress={() => handleOpenAction('edit')}><SquarePen color="#334155" size={15} strokeWidth={1.9} /><Text style={styles.actionPopoverText}>Edit Patient</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionPopoverRow} onPress={() => handleOpenAction('consultation')}><Stethoscope color="#334155" size={15} strokeWidth={1.9} /><Text style={styles.actionPopoverText}>Consultation</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionPopoverRow} onPress={() => handleOpenAction('prescription')}><FileText color="#334155" size={15} strokeWidth={1.9} /><Text style={styles.actionPopoverText}>Prescription</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionPopoverRow} onPress={() => handleOpenAction('history')}><RotateCcw color="#334155" size={15} strokeWidth={1.9} /><Text style={styles.actionPopoverText}>Medical History</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Legacy action sheet is kept disabled; actions now use the anchored popup above. */}
      <Modal visible={false} transparent animationType="fade" onRequestClose={() => setShowActionMenuModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowActionMenuModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.pickerBottomSheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.actionMenuTitle}>Actions for {activeDisplayPatient?.full_name || 'Patient'}</Text>
              <TouchableOpacity style={styles.closeCircleBtn} onPress={() => setShowActionMenuModal(false)}>
                <Text style={styles.closeCircleText}>✕</Text>
              </TouchableOpacity>
            </View>

            {canBookPatientAppointment && (
            <TouchableOpacity
              style={[styles.actionOptionRow, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}
              onPress={() => handleOpenAction('book_appointment')}>
              <Text style={{ fontSize: 16 }}>📅</Text>
              <Text style={[styles.actionOptionText, { color: '#166534', fontWeight: '800' }]}>
                Book Appointment
              </Text>
            </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.actionOptionRow} onPress={() => handleOpenAction('details')}>
              <ViewDetailsIcon color="#334155" size={18} />
              <Text style={styles.actionOptionText}>View Details</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionOptionRow} onPress={() => handleOpenAction('edit')}>
              <EditPenIcon color="#334155" size={18} />
              <Text style={styles.actionOptionText}>Edit Patient</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionOptionRow} onPress={() => handleOpenAction('consultation')}>
              <StethoscopeIcon color="#334155" size={18} />
              <Text style={styles.actionOptionText}>Consultation</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionOptionRow, styles.actionOptionHighlight]} onPress={() => handleOpenAction('prescription')}>
              <PrescriptionIcon color="#0d9488" size={18} />
              <Text style={[styles.actionOptionText, { color: '#0d9488', fontWeight: '800' }]}>Prescription</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionOptionRow} onPress={() => handleOpenAction('history')}>
              <MedicalHistoryIcon color="#334155" size={18} />
              <Text style={styles.actionOptionText}>Medical History</Text>
            </TouchableOpacity>

            {canDeletePatient ? (
              <TouchableOpacity style={[styles.actionOptionRow, styles.deleteActionOption]} onPress={handleDeletePatient}>
                <Text style={styles.deleteActionIcon}>×</Text>
                <Text style={styles.deleteActionText}>Delete Patient</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.closeActionBtn} onPress={() => setShowActionMenuModal(false)}>
              <Text style={styles.closeActionBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* View Details Bottom Sheet Modal */}
      <Modal
        visible={showViewDetailsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowViewDetailsModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowViewDetailsModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.viewDetailsModalCard}>
            <View style={styles.viewDetailsHeader}>
              <View style={styles.viewDetailsTopRow}>
              <View style={styles.headerLeftRow}>
                <View style={styles.avatarBigCircle}>
                  <Text style={styles.avatarBigLetter}>
                    {(activeDisplayPatient?.full_name || 'P').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.headerTitleCol}>
                  <Text style={styles.viewDetailsName}>{activeDisplayPatient?.full_name || 'Patient'}</Text>
                  <Text style={styles.viewDetailsCode}>
                    {(activeDisplayPatient as any)?.patient_code ||
                      `PT-${String(activeDisplayPatient?.id || 1).padStart(5, '0')}`}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.viewDetailsCloseBtn} onPress={() => setShowViewDetailsModal(false)}>
                <X color="#0d9488" size={15} strokeWidth={2} />
              </TouchableOpacity>
              </View>

              <View style={styles.viewDetailsActionsRow}>
                <View style={styles.activePillBadge}>
                  <Text style={styles.activePillText}>
                    {activeDisplayPatient?.is_active !== false ? 'Active' : 'Inactive'}
                  </Text>
                </View>

                {canEditPatient ? (
                  <TouchableOpacity
                    style={styles.editInfoBtn}
                    onPress={() => {
                      setShowViewDetailsModal(false);
                      handleOpenAction('edit');
                    }}>
                    <Pencil color="#0f172a" size={20} strokeWidth={2.1} />
                    <Text style={styles.editInfoBtnText}>Edit Information</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {modalLoading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.viewDetailsBodyGrid}>
                <View style={styles.cardsGridTwoCol}>
                  {/* Card 1: Personal Details */}
                  <View style={styles.detailCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardHeaderIconBox}>
                        <UserRound color="#0d9488" size={23} strokeWidth={2} />
                      </View>
                      <Text style={styles.cardTitle}>Personal Details</Text>
                    </View>

                    <View style={styles.detailDataRow}>
                      <Text style={styles.dataLabel}>Full Name</Text>
                      <Text style={styles.dataValBold}>{activeDisplayPatient?.full_name || '-'}</Text>
                    </View>
                    <View style={styles.detailDataRow}>
                      <Text style={styles.dataLabel}>Date of Birth</Text>
                      <Text style={styles.dataValBold}>
                        {formatDateLong(activeDisplayPatient?.date_of_birth || (activeDisplayPatient as any)?.dob)}
                      </Text>
                    </View>
                    <View style={styles.detailDataRow}>
                      <Text style={styles.dataLabel}>Blood Group</Text>
                      <Text style={styles.dataValBold}>{activeDisplayPatient?.blood_group || '-'}</Text>
                    </View>
                  </View>

                  {/* Card 2: Contact Information (Highlighted with teal border) */}
                  <View style={styles.detailCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.cardHeaderIconBox, { backgroundColor: '#e6fffa' }]}>
                        <Phone color="#0d9488" size={23} strokeWidth={2} />
                      </View>
                      <Text style={styles.cardTitle}>Contact Information</Text>
                    </View>

                    <View style={styles.detailDataRow}>
                      <View style={styles.dataLabelIconRow}><Phone color="#38bdb3" size={17} /><Text style={styles.dataLabelIcon}>Phone</Text></View>
                      <Text style={styles.dataValBold}>{activeDisplayPatient?.phone || '-'}</Text>
                    </View>
                    <View style={styles.detailDataRow}>
                      <View style={styles.dataLabelIconRow}><Mail color="#38bdb3" size={17} /><Text style={styles.dataLabelIcon}>Email</Text></View>
                      <Text style={styles.dataValBold}>{activeDisplayPatient?.email || '-'}</Text>
                    </View>
                    <View style={styles.detailDataRow}>
                      <View style={styles.dataLabelIconRow}><MapPin color="#38bdb3" size={17} /><Text style={styles.dataLabelIcon}>Address</Text></View>
                      <Text style={styles.dataValBold}>{activeDisplayPatient?.address || '-'}</Text>
                    </View>
                    <View style={styles.detailDataRow}>
                      <View style={styles.dataLabelIconRow}><MapPin color="#38bdb3" size={17} /><Text style={styles.dataLabelIcon}>City</Text></View>
                      <Text style={styles.dataValBold}>{(activeDisplayPatient as any)?.city || '-'}</Text>
                    </View>
                    <View style={styles.detailDataRow}>
                      <View style={styles.dataLabelIconRow}><MapPin color="#38bdb3" size={17} /><Text style={styles.dataLabelIcon}>State</Text></View>
                      <Text style={styles.dataValBold}>{(activeDisplayPatient as any)?.state || '-'}</Text>
                    </View>
                  </View>

                  {/* Card 3: Visit Information */}
                  <View style={styles.detailCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.cardHeaderIconBox, { backgroundColor: '#e6fffa' }]}>
                        <CalendarDays color="#0d9488" size={23} strokeWidth={2} />
                      </View>
                      <Text style={styles.cardTitle}>Visit Information</Text>
                    </View>

                    <View style={styles.detailDataRow}>
                      <Text style={styles.dataLabel}>Registration Date</Text>
                      <Text style={styles.dataValBold}>
                        {formatDateShort(activeDisplayPatient?.registered_at || (activeDisplayPatient as any)?.created_at)}
                      </Text>
                    </View>
                    <View style={styles.detailDataRow}>
                      <Text style={styles.dataLabel}>Total Visits</Text>
                      <Text style={styles.dataValBold}>
                        {(activeDisplayPatient as any)?.total_visits ?? (activeDisplayPatient as any)?.billingSummary?.total_visits ?? 0}
                      </Text>
                    </View>
                  </View>

                  {/* Card 4: Emergency Contact */}
                  <View style={styles.detailCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.cardHeaderIconBox, { backgroundColor: '#e6fffa' }]}>
                        <ShieldCheck color="#0d9488" size={23} strokeWidth={2} />
                      </View>
                      <Text style={styles.cardTitle}>Emergency Contact</Text>
                    </View>

                    <View style={styles.detailDataRow}>
                      <View style={styles.dataLabelIconRow}><Phone color="#38bdb3" size={17} /><Text style={styles.dataLabelIcon}>Contact</Text></View>
                      <Text style={styles.dataValBold}>{activeDisplayPatient?.emergency_contact || '-'}</Text>
                    </View>
                  </View>
                </View>

              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Patient Bottom Sheet Modal */}
      <Modal
        visible={showEditPatientModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditPatientModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowEditPatientModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.editBottomSheetContainer}>
            <View style={styles.editSheetHeader}>
              <View style={styles.headerLeftRow}>
                <PatientUserIcon color="#0d9488" size={20} />
                <Text style={styles.editModalHeaderTitle}>{isCreatingPatient ? 'Add Patient' : 'Edit Patient'}</Text>
              </View>
              <TouchableOpacity style={styles.editSheetCloseBtn} onPress={() => setShowEditPatientModal(false)}>
                <X color="#475569" size={18} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editFormBodyScroll}>
              <View style={styles.formSectionHeader}>
                <PatientUserIcon color="#64748b" size={16} />
                <Text style={styles.formSectionTitle}>Personal Information</Text>
              </View>

              <View style={styles.formRowGrid}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabelReq}>Name <Text style={styles.reqAsterisk}>*</Text></Text>
                  <TextInput
                    style={[styles.textInput, styles.textInputActiveFocus]}
                    value={editName}
                    onChangeText={setEditName}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabelReq}>Date of Birth <Text style={styles.reqAsterisk}>*</Text></Text>
                  <View style={styles.inputWithIconRight}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={editDob}
                      onChangeText={setEditDob}
                      placeholder="YYYY-MM-DD"
                    />
                    <Text style={styles.innerRightIcon}>📅</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.formRowGrid, { marginTop: 10 }]}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabelReq}>Age</Text>
                  <TextInput
                    style={[styles.textInput, styles.readOnlyTextInput]}
                    value={calculateAge(editDob) || 'Not available'}
                    editable={false}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1.2 }]}>
                  <Text style={styles.inputLabelReq}>Gender <Text style={styles.reqAsterisk}>*</Text></Text>
                  <View style={styles.radioGroupRow}>
                    <TouchableOpacity style={styles.radioOption} onPress={() => setEditGender('male')}>
                      <View style={[styles.radioCircle, editGender === 'male' && styles.radioCircleActive]}>
                        {editGender === 'male' && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.radioText}>Male</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.radioOption} onPress={() => setEditGender('female')}>
                      <View style={[styles.radioCircle, editGender === 'female' && styles.radioCircleActive]}>
                        {editGender === 'female' && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.radioText}>Female</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.radioOption} onPress={() => setEditGender('other')}>
                      <View style={[styles.radioCircle, editGender === 'other' && styles.radioCircleActive]}>
                        {editGender === 'other' && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.radioText}>Other</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.editBloodDropdownWrapper, { flex: 1 }]}>
                  <Text style={styles.inputLabelReq}>Blood Group</Text>
                  <TouchableOpacity style={styles.dropdownPickerBtn} onPress={() => setShowEditBloodPicker((open) => !open)}>
                    <Text style={styles.dropdownPickerText}>{editBloodGroup || 'Select blood group'}</Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>
                  {showEditBloodPicker && (
                    <View style={styles.editBloodInlineMenu}>
                      {['Select blood group', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'N/A'].map((bloodGroup) => {
                        const selected = editBloodGroup === bloodGroup;
                        return <TouchableOpacity key={bloodGroup} style={[styles.inlineDropdownOption, selected && styles.inlineDropdownOptionSelected]} onPress={() => { setEditBloodGroup(bloodGroup); setShowEditBloodPicker(false); }}>
                          <Text style={[styles.inlineDropdownOptionText, selected && styles.inlineDropdownOptionTextSelected]}>{selected ? '✓  ' : '    '}{bloodGroup}</Text>
                        </TouchableOpacity>;
                      })}
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.sectionDividerLine} />

              <View style={styles.formSectionHeader}>
                <Text style={{ fontSize: 14 }}>📞</Text>
                <Text style={styles.formSectionTitle}>Contact Information</Text>
              </View>

              <View style={styles.formRowGrid}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabelReq}>Phone <Text style={styles.reqAsterisk}>*</Text></Text>
                  <TextInput
                    style={styles.textInput}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabelReq}>Email</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    keyboardType="email-address"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabelReq}>State <Text style={styles.reqAsterisk}>*</Text></Text>
                  <TextInput
                    style={styles.textInput}
                    value={editState}
                    onChangeText={setEditState}
                  />
                </View>
              </View>

              <View style={[styles.formRowGrid, { marginTop: 10 }]}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabelReq}>City <Text style={styles.reqAsterisk}>*</Text></Text>
                  <TextInput
                    style={styles.textInput}
                    value={editCity}
                    onChangeText={setEditCity}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { marginTop: 10 }]}>
                <Text style={styles.inputLabelReq}>Address</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={editAddress}
                  onChangeText={setEditAddress}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.sectionDividerLine} />

              <View style={styles.formSectionHeader}>
                <Text style={{ fontSize: 14 }}>🛡️</Text>
                <Text style={styles.formSectionTitle}>Emergency Contact</Text>
              </View>

              <View style={styles.formRowGrid}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabelReq}>Contact Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editEmergencyName}
                    onChangeText={setEditEmergencyName}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabelReq}>Relation</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editEmergencyRelation}
                    onChangeText={setEditEmergencyRelation}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabelReq}>Phone</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editEmergencyPhone}
                    onChangeText={setEditEmergencyPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.editModalFooter}>
              <TouchableOpacity style={styles.cancelGreyBtn} onPress={() => setShowEditPatientModal(false)}>
                <Text style={styles.cancelGreyBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.updateTealBtn} onPress={handleSaveEditPatient}>
                <Text style={styles.updateTealBtnText}>{isCreatingPatient ? 'Register Patient' : 'Update Patient'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Consultation History Bottom Sheet Modal */}
      <Modal
        visible={showConsultationsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConsultationsModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowConsultationsModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.consultModalCard}>
            {(() => {
              const filteredConsultations = (consultationList || []).filter((c: any) => {
                if (!consultSearchQuery.trim()) return true;
                const q = consultSearchQuery.toLowerCase();
                return (
                  (c.doctor_name && c.doctor_name.toLowerCase().includes(q)) ||
                  (c.reason && c.reason.toLowerCase().includes(q)) ||
                  (c.diagnosis && c.diagnosis.toLowerCase().includes(q)) ||
                  (c.specialization && c.specialization.toLowerCase().includes(q))
                );
              });

              return (
                <>
                  {/* Header Row (Light Teal #e6f4f1) */}
                  <View style={styles.consultHeaderLight}>
                    <View style={styles.headerLeftRow}>
                      <View style={styles.consultIconCircleTeal}>
                        <StethoscopeIcon color="#0d9488" size={20} />
                      </View>
                      <View style={styles.headerTitleCol}>
                        <Text style={styles.consultTitleDark}>Consultation History</Text>
                        <Text style={styles.consultSubDark}>
                          {activeDisplayPatient?.full_name || 'Patient'} ·{' '}
                          {(activeDisplayPatient as any)?.patient_code || `PT-${String(activeDisplayPatient?.id || 1).padStart(5, '0')}`}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity style={styles.closeCircleBtn} onPress={() => setShowConsultationsModal(false)}>
                      <Text style={styles.closeCircleText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {modalLoading ? (
                    <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
                  ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.sheetContentScroll, styles.recordScrollContent]}>
                      {/* Search & filters are only needed after visits are available. */}
                      {filteredConsultations.length > 0 ? <View style={styles.medSearchFilterRow}>
                        <View style={styles.medSearchInputBox}>
                          <Search color="#94a3b8" size={20} strokeWidth={2} style={{ marginRight: 8 }} />
                          <TextInput
                            style={styles.medSearchTextInput}
                            placeholder="Search doctor, reason, diagnosis..."
                            placeholderTextColor="#94a3b8"
                            value={consultSearchQuery}
                            onChangeText={setConsultSearchQuery}
                          />
                        </View>
                        <View style={styles.medFilterPillBtn}>
                          <Text style={styles.medFilterPillText}>All Status</Text>
                          <Text style={{ fontSize: 9, color: '#94a3b8', marginLeft: 4 }}>▼</Text>
                        </View>
                        <View style={styles.medFilterPillBtn}>
                          <Text style={styles.medFilterPillText}>All dates</Text>
                          <Text style={{ fontSize: 9, color: '#94a3b8', marginLeft: 4 }}>▼</Text>
                        </View>
                      </View> : null}

                      {filteredConsultations.length === 0 ? (
                        <View style={styles.modalEmptyFill}>
                          <View style={styles.referenceEmptyIcon}>
                            <StethoscopeIcon color="#0d9488" size={32} />
                          </View>
                          <Text style={styles.referenceEmptyTitle}>No consultations yet</Text>
                          <Text style={styles.referenceEmptySub}>Consultation history will appear here.</Text>
                        </View>
                      ) : (
                        <View style={{ gap: 14 }}>
                          {filteredConsultations.map((c: any, idx: number) => {
                            const dateStr = c.appointment_date ? formatDateLong(c.appointment_date) : '';
                            const timeStr = c.appointment_time || c.time_slot || '';
                            const feeVal = (c.consultation_fee !== undefined && c.consultation_fee !== null)
                              ? Number(c.consultation_fee).toFixed(2)
                              : (c.fee !== undefined && c.fee !== null)
                              ? Number(c.fee).toFixed(2)
                              : null;
                            const rawDocName = c.doctor_name || c.doctorName || '';
                            const docName = rawDocName ? (rawDocName.toLowerCase().startsWith('dr.') ? rawDocName : `Dr. ${rawDocName}`) : '';
                            const rawSpec = c.specialization || c.doctor_specialization || '';
                            const specName = rawSpec ? String(rawSpec).charAt(0).toUpperCase() + String(rawSpec).slice(1) : '';
                            const statusLabel = c.status ? String(c.status).charAt(0).toUpperCase() + String(c.status).slice(1) : '';
                            const hasHeader = docName || specName || statusLabel;

                            return (
                              <View key={c.id || c.appointment_id || idx} style={styles.consultCardFull}>
                                {/* Doctor Header Row */}
                                {hasHeader ? (
                                  <>
                                    <View style={styles.consultCardHeader}>
                                      <View style={styles.docAvatarSmallCircle}>
                                        <StethoscopeIcon color="#0d9488" size={18} />
                                      </View>
                                      <View style={styles.docHeaderCol}>
                                        {docName ? <Text style={styles.docNameTitle}>{docName}</Text> : null}
                                        {specName ? <Text style={styles.docSpecSub}>{specName}</Text> : null}
                                      </View>
                                      {statusLabel ? (
                                        <View style={styles.approvedBadgePill}>
                                          <Text style={styles.approvedBadgePillText}>● {statusLabel}</Text>
                                        </View>
                                      ) : null}
                                    </View>
                                    <View style={styles.cardDividerLine} />
                                  </>
                                ) : null}

                                {/* Date/Time & Fee 2-Column Grid */}
                                <View style={styles.consultGridTwoRow}>
                                  <View style={styles.consultBoxItem}>
                                    <View style={styles.boxLabelHeaderRow}>
                                      <Text style={{ fontSize: 11 }}>📅</Text>
                                      <Text style={styles.gridBoxLabel}>DATE & TIME</Text>
                                    </View>
                                    <Text style={styles.boxValDate}>{dateStr || '-'}</Text>
                                    {timeStr ? <Text style={styles.boxValTime}>{timeStr}</Text> : null}
                                  </View>

                                  <View style={[styles.consultBoxItem, styles.consultFeeBoxHighlight]}>
                                    <View style={styles.boxLabelHeaderRow}>
                                      <Text style={{ fontSize: 11 }}>💳</Text>
                                      <Text style={[styles.gridBoxLabel, { color: '#166534' }]}>CONSULTATION FEE</Text>
                                    </View>
                                    <Text style={styles.feeValText}>{feeVal !== null ? `₹${feeVal}` : '-'}</Text>
                                  </View>
                                </View>

                                {/* Reason Box */}
                                {c.reason ? (
                                  <View style={styles.reasonBoxItem}>
                                    <View style={styles.boxLabelHeaderRow}>
                                      <Text style={{ fontSize: 11 }}>🩺</Text>
                                      <Text style={styles.reasonLabelText}>REASON FOR VISIT</Text>
                                    </View>
                                    <Text style={styles.reasonValueText}>{c.reason}</Text>
                                  </View>
                                ) : null}

                                {/* Notes Box */}
                                {c.notes ? (
                                  <View style={styles.notesBoxItem}>
                                    <View style={styles.boxLabelHeaderRow}>
                                      <Text style={{ fontSize: 11 }}>📝</Text>
                                      <Text style={styles.notesLabelText}>DOCTOR NOTES</Text>
                                    </View>
                                    <Text style={styles.notesValueText}>{c.notes}</Text>
                                  </View>
                                ) : null}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </ScrollView>
                  )}

                  {/* Footer Row */}
                  <View style={styles.consultFooterLight}>
                    {filteredConsultations.length > 0 ? <Text style={styles.prescFooterSecText}>Showing {filteredConsultations.length} records</Text> : null}
                    <TouchableOpacity style={[styles.tealCloseBtn, filteredConsultations.length === 0 && styles.fullWidthCloseBtn]} onPress={() => setShowConsultationsModal(false)}>
                      <X color="#ffffff" size={15} strokeWidth={2.2} />
                      <Text style={styles.tealCloseBtnText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Prescription History Bottom Sheet Modal */}
      <Modal
        visible={showPrescriptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPrescriptionsModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowPrescriptionsModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.recordModalCard}>
            {/* Header Row */}
            <View style={styles.prescHeaderDark}>
              <View style={styles.headerLeftRow}>
                <View style={styles.prescIconCircle}>
                  <PrescriptionIcon color="#0d9488" size={20} />
                </View>
                <View style={styles.headerTitleCol}>
                  <Text style={styles.prescTitleDark}>Prescriptions</Text>
                  <Text style={styles.prescSubDark}>
                    {activeDisplayPatient?.full_name || 'Patient'} · {(activeDisplayPatient as any)?.patient_code || `PT-${String(activeDisplayPatient?.id || 1).padStart(5, '0')}`}
                  </Text>
                </View>
              </View>

              <View style={styles.headerRightActionsRow}>
                <View style={styles.recordsCountBadge}>
                  <Text style={styles.recordsCountLabel}>TOTAL RECORDS</Text>
                  <Text style={styles.recordsCountNum}>{prescriptionList.length}</Text>
                </View>

                <TouchableOpacity style={styles.closeCircleBtn} onPress={() => setShowPrescriptionsModal(false)}>
                  <Text style={styles.closeCircleText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.prescriptionTabs}>
              <View style={[styles.prescriptionTab, styles.prescriptionTabActive]}>
                <FileText color="#ffffff" size={14} strokeWidth={2} />
                <Text style={[styles.prescriptionTabText, styles.prescriptionTabTextActive]}>History</Text>
                <View style={styles.prescriptionTabCount}><Text style={styles.prescriptionTabCountText}>{prescriptionList.length}</Text></View>
              </View>
              <View style={styles.prescriptionTab}>
                <FileText color="#64748b" size={14} strokeWidth={2} />
                <Text style={styles.prescriptionTabText}>Details</Text>
              </View>
            </View>

            {modalLoading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
            ) : prescriptionList.length === 0 ? (
              <View style={styles.modalEmptyFill}>
                <View style={styles.referenceEmptyIcon}>
                  <PrescriptionIcon color="#94a3b8" size={28} />
                </View>
                <Text style={styles.referenceEmptyTitle}>No prescriptions found</Text>
                <Text style={styles.referenceEmptySub}>New prescriptions will appear here.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.sheetContentScroll, styles.recordScrollContent]}>
                {/* Section Subtitle */}
                <View style={styles.prescListHeaderRow}>
                  <View style={styles.rowAlignGap}>
                    <Text style={styles.prescSecTitle}>Prescription history</Text>
                    <View style={styles.miniCountPill}>
                      <Text style={styles.miniCountPillText}>{prescriptionList.length}</Text>
                    </View>
                  </View>
                  <Text style={styles.prescSecSub}>Select a record to view details</Text>
                </View>

                {/* Prescription Items Selector Scroll */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.prescCardsHorizScroll}>
                  {prescriptionList.map((p, idx) => {
                    const isSelected = selectedPrescription?.id === p.id;
                    const rxDate = p.created_at ? formatDateLong(p.created_at) : '30 Jul 2026';
                    return (
                      <TouchableOpacity
                        key={p.id || idx}
                        activeOpacity={0.8}
                        style={[styles.prescSelectCard, isSelected && styles.prescSelectCardActive]}
                        onPress={() => handleSelectPrescription(p)}>
                        <View style={styles.cardRxTopRow}>
                          <Text style={[styles.rxCardCode, isSelected && { color: '#0d9488' }]}>
                            📄 Rx #{p.id}
                          </Text>
                          <View style={styles.finalGreenBadge}>
                            <Text style={styles.finalGreenBadgeText}>{p.status || 'FINAL'}</Text>
                          </View>
                        </View>
                        <Text style={styles.rxCardDate}>📅 {rxDate}</Text>
                        <Text style={styles.rxCardDiag} numberOfLines={1}>
                          {p.diagnosis || p.symptoms || 'General Checkup'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Selected Prescription Detailed View */}
                {selectedPrescription && (
                  <View style={styles.selectedPrescContainer}>
                    {/* Doctor Card */}
                    <View style={styles.doctorInfoCard}>
                      <View style={styles.docAvatarCircleBig}>
                        <PatientUserIcon color="#0d9488" size={22} />
                      </View>

                      <View style={styles.docDetailsCol}>
                        <Text style={styles.prescribedByTag}>PRESCRIBED BY</Text>
                        <Text style={styles.docNameBig}>{selectedPrescription.doctor_name ? (selectedPrescription.doctor_name.toLowerCase().startsWith('dr.') ? selectedPrescription.doctor_name : `Dr. ${selectedPrescription.doctor_name}`) : 'Doctor'}</Text>
                        <Text style={styles.docTimeText}>
                          🕒 {selectedPrescription.created_at ? formatDateLong(selectedPrescription.created_at) : '-'}
                        </Text>
                      </View>

                      <View style={styles.docCardRightBadges}>
                        <View style={styles.rxBadgeTag}>
                          <Text style={styles.rxBadgeTagText}>RX #{selectedPrescription.id}</Text>
                        </View>
                        <View style={styles.finalGreenBadge}>
                          <Text style={styles.finalGreenBadgeText}>{selectedPrescription.status || 'FINAL'}</Text>
                        </View>
                        <View style={styles.followUpBadgePill}>
                          <Text style={styles.followUpBadgeText}>
                            📅 Follow-up: {selectedPrescription.follow_up_days || 5} days
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Diagnosis & Symptoms Grid */}
                    <View style={styles.diagSymptomGrid}>
                      <View style={styles.gridBoxItem}>
                        <View style={styles.boxLabelHeaderRow}>
                          <StethoscopeIcon color="#0d9488" size={14} />
                          <Text style={styles.gridBoxLabel}>DIAGNOSIS</Text>
                        </View>
                        <Text style={styles.gridBoxValueText}>
                          {selectedPrescription.diagnosis || 'rest'}
                        </Text>
                      </View>

                      <View style={styles.gridBoxItem}>
                        <View style={styles.boxLabelHeaderRow}>
                          <Text style={{ fontSize: 13 }}>💓</Text>
                          <Text style={styles.gridBoxLabel}>SYMPTOMS</Text>
                        </View>
                        <Text style={styles.gridBoxValueText}>
                          {selectedPrescription.symptoms || 'cough'}
                        </Text>
                      </View>
                    </View>

                    {/* Clinical Advice Card */}
                    <View style={styles.clinicalAdviceCard}>
                      <View style={styles.boxLabelHeaderRow}>
                        <Text style={{ fontSize: 14 }}>💡</Text>
                        <Text style={styles.gridBoxLabel}>CLINICAL ADVICE</Text>
                      </View>
                      <Text style={styles.adviceBodyText}>
                        {selectedPrescription.advice || 'Not recorded'}
                      </Text>
                    </View>

                    {/* Prescribed Medicines Box */}
                    <View style={styles.medicinesCardContainer}>
                      <View style={styles.cardHeaderWithBadgeRow}>
                        <View style={styles.titleWithIconRow}>
                          <View style={styles.iconCircleTealSmall}>
                            <PrescriptionIcon color="#0d9488" size={16} />
                          </View>
                          <View>
                            <Text style={styles.cardTitleText}>Prescribed medicines</Text>
                            <Text style={styles.cardSubText}>Dosage, frequency and duration</Text>
                          </View>
                        </View>
                        <View style={styles.countBadgeRound}>
                          <Text style={styles.countBadgeRoundText}>
                            {(selectedPrescription.items || []).length}
                          </Text>
                        </View>
                      </View>

                      {(selectedPrescription.items || []).length === 0 ? (
                        <View style={styles.emptyItemsBox}>
                          <Text style={styles.emptyItemsText}>No medicines recorded.</Text>
                        </View>
                      ) : (
                        <View style={styles.medsListStack}>
                          {(selectedPrescription.items || []).map((m: any, mIdx: number) => (
                            <View key={m.id || mIdx} style={styles.medItemRowCard}>
                              <Text style={styles.medNameText}>💊 {m.medicine_name}</Text>
                              <View style={styles.medSpecsRow}>
                                <Text style={styles.medSpecTag}>Dosage: {m.dosage || '1 tab'}</Text>
                                <Text style={styles.medSpecTag}>Freq: {m.frequency || '1-0-1'}</Text>
                                <Text style={styles.medSpecTag}>Duration: {m.duration || '5 days'}</Text>
                              </View>
                              {m.instruction ? (
                                <Text style={styles.medInstructionText}>Note: {m.instruction}</Text>
                              ) : null}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Prescribed Lab Tests Box */}
                    <View style={styles.medicinesCardContainer}>
                      <View style={styles.cardHeaderWithBadgeRow}>
                        <View style={styles.titleWithIconRow}>
                          <View style={styles.iconCircleTealSmall}>
                            <Text style={{ fontSize: 14 }}>🧪</Text>
                          </View>
                          <View>
                            <Text style={styles.cardTitleText}>Prescribed lab tests</Text>
                            <Text style={styles.cardSubText}>Required diagnostic tests</Text>
                          </View>
                        </View>
                        <View style={styles.countBadgeRound}>
                          <Text style={styles.countBadgeRoundText}>
                            {(selectedPrescription.tests || []).length}
                          </Text>
                        </View>
                      </View>

                      {(selectedPrescription.tests || []).length === 0 ? (
                        <View style={styles.emptyItemsBox}>
                          <Text style={styles.emptyItemsText}>No lab tests recorded.</Text>
                        </View>
                      ) : (
                        <View style={styles.medsListStack}>
                          {(selectedPrescription.tests || []).map((t: any, tIdx: number) => (
                            <View key={t.id || tIdx} style={styles.medItemRowCard}>
                              <Text style={styles.medNameText}>🧪 {t.test_name}</Text>
                              <View style={styles.medSpecsRow}>
                                <Text style={styles.medSpecTag}>Type: {t.test_type || 'General'}</Text>
                                <Text style={styles.medSpecTag}>Price: ₹{t.price || 0}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Footer */}
            <View style={styles.prescFooterRow}>
              <Text style={styles.prescFooterSecText}>Private patient information · Handle with care</Text>
              <TouchableOpacity style={styles.darkCloseBtn} onPress={() => setShowPrescriptionsModal(false)}>
                <Text style={styles.darkCloseBtnText}>✕ Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Medical History Bottom Sheet Modal */}
      <Modal
        visible={showMedicalHistoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMedicalHistoryModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowMedicalHistoryModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.bottomSheetContainer}>
            {(() => {
              const medPatient = medicalHistoryData?.patient || medicalHistoryData || activeDisplayPatient;
              const visitList = medicalHistoryData?.visits || (Array.isArray(medicalHistoryData) ? medicalHistoryData : []);
              const labReportList = medicalHistoryData?.labReports || medicalHistoryData?.lab_reports || [];
              const age = calculateAge(medPatient?.date_of_birth || medPatient?.dob || activeDisplayPatient?.date_of_birth);
              const patientCode = medPatient?.patient_code || (activeDisplayPatient as any)?.patient_code || `PT-${String(activeDisplayPatient?.id || 1).padStart(5, '0')}`;
              const emergencyFormatted = [
                medPatient?.emergency_contact_name || medPatient?.emergency_name,
                medPatient?.emergency_relation,
                medPatient?.emergency_contact || medPatient?.emergency_phone
              ].filter(Boolean).join(' · ') || (activeDisplayPatient?.emergency_contact ? `Contact · ${activeDisplayPatient.emergency_contact}` : 'Not recorded');

              const matchesHistoryDate = (dateValue?: string) => {
                if (historyDateFilter === 'all') return true;
                if (!dateValue) return false;
                const date = new Date(dateValue);
                if (Number.isNaN(date.getTime())) return false;
                const now = new Date();
                if (historyDateFilter === 'this-year') return date.getFullYear() === now.getFullYear();
                const days = historyDateFilter === '30-days' ? 30 : 90;
                const earliest = new Date(now);
                earliest.setDate(now.getDate() - days);
                return date >= earliest && date <= now;
              };

              const filteredVisits = (historyRecordFilter === 'reports' ? [] : visitList || []).filter((v: any) => {
                if (!historySearchQuery.trim()) return matchesHistoryDate(v.appointment_date || v.created_at);
                const q = historySearchQuery.toLowerCase();
                return (
                  (v.reason && v.reason.toLowerCase().includes(q)) ||
                  (v.diagnosis && v.diagnosis.toLowerCase().includes(q)) ||
                  (v.symptoms && v.symptoms.toLowerCase().includes(q)) ||
                  (v.doctor_name && v.doctor_name.toLowerCase().includes(q)) ||
                  (v.notes && v.notes.toLowerCase().includes(q)) ||
                  (v.advice && v.advice.toLowerCase().includes(q))
                ) && matchesHistoryDate(v.appointment_date || v.created_at);
              });

              const filteredLabReports = (historyRecordFilter === 'visits' ? [] : labReportList || []).filter((r: any) => {
                if (!historySearchQuery.trim()) return matchesHistoryDate(r.uploaded_at || r.created_at);
                const q = historySearchQuery.toLowerCase();
                return (
                  (r.test_name && r.test_name.toLowerCase().includes(q)) ||
                  (r.status && r.status.toLowerCase().includes(q)) ||
                  (r.doctor_name && r.doctor_name.toLowerCase().includes(q)) ||
                  (r.technician_name && r.technician_name.toLowerCase().includes(q)) ||
                  (r.remarks && r.remarks.toLowerCase().includes(q))
                ) && matchesHistoryDate(r.uploaded_at || r.created_at);
              });

              return (
                <>
                  {/* ── Dark header (matches web slate-950 bg) ── */}
                  <View style={mhStyles.header}>
                    <View style={mhStyles.headerLeft}>
                      <View style={mhStyles.headerIconBox}>
                        <HeartPulse color="#0f172a" size={26} strokeWidth={2.4} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={mhStyles.headerTitle}>Medical history</Text>
                        <View style={mhStyles.headerSubRow}>
                          <Text style={mhStyles.headerPatientName}>
                            {medPatient?.full_name || activeDisplayPatient?.full_name || 'Patient'}
                          </Text>
                          <View style={mhStyles.headerCodeBadge}>
                            <Text style={mhStyles.headerCodeBadgeText}>{patientCode}</Text>
                          </View>
                          <Text style={mhStyles.headerMeta}>
                            {medPatient?.gender || activeDisplayPatient?.gender || 'female'}
                            {age ? ` · ${age}` : ''}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity style={mhStyles.headerCloseBtn} onPress={() => setShowMedicalHistoryModal(false)}>
                      <X color="#ffffff" size={20} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>

                  {modalLoading ? (
                    <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
                  ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={mhStyles.scrollContent}>
                      {/* ── Search bar ── */}
                      <View style={mhStyles.searchBar}>
                        <Search color="#94a3b8" size={18} strokeWidth={2} />
                        <TextInput
                          style={mhStyles.searchInput}
                          placeholder="Search visits, diagnosis, medicines, lab"
                          placeholderTextColor="#94a3b8"
                          value={historySearchQuery}
                          onChangeText={setHistorySearchQuery}
                        />
                      </View>

                      {/* ── Filter pills row ── */}
                      <View style={mhStyles.filterRow}>
                        <TouchableOpacity
                          style={mhStyles.filterPill}
                          onPress={() => Alert.alert('History type', 'Choose records to show', [
                            { text: 'All history', onPress: () => setHistoryRecordFilter('all') },
                            { text: 'Visits only', onPress: () => setHistoryRecordFilter('visits') },
                            { text: 'Lab reports only', onPress: () => setHistoryRecordFilter('reports') },
                            { text: 'Cancel', style: 'cancel' },
                          ])}>
                          <Text style={mhStyles.filterPillText}>
                            {historyRecordFilter === 'all' ? 'All history' : historyRecordFilter === 'visits' ? 'Visits only' : 'Lab reports'}
                          </Text>
                          <ChevronDownIcon size={14} color="#94a3b8" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={mhStyles.filterPill}
                          onPress={() => Alert.alert('Date range', 'Choose a date range', [
                            { text: 'All dates', onPress: () => setHistoryDateFilter('all') },
                            { text: 'Last 30 days', onPress: () => setHistoryDateFilter('30-days') },
                            { text: 'Last 90 days', onPress: () => setHistoryDateFilter('90-days') },
                            { text: 'This year', onPress: () => setHistoryDateFilter('this-year') },
                            { text: 'Cancel', style: 'cancel' },
                          ])}>
                          <Text style={mhStyles.filterPillText}>
                            {historyDateFilter === 'all' ? 'All dates' : historyDateFilter === '30-days' ? 'Last 30 days' : historyDateFilter === '90-days' ? 'Last 90 days' : 'This year'}
                          </Text>
                          <ChevronDownIcon size={14} color="#94a3b8" />
                        </TouchableOpacity>
                      </View>

                      {/* ── Patient overview section ── */}
                      <View style={mhStyles.sectionHeader}>
                        <View style={mhStyles.sectionIconCircle}>
                          <HeartPulse color="#0d9488" size={18} strokeWidth={2.2} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={mhStyles.sectionTitle}>Patient overview</Text>
                          <Text style={mhStyles.sectionSub}>Important health and emergency information</Text>
                        </View>
                      </View>

                      {/* Overview info cards */}
                      <View style={mhStyles.infoCardsContainer}>
                        {/* Blood Group */}
                        <View style={mhStyles.infoCard}>
                          <View style={mhStyles.infoCardIconBox}>
                            <Droplets color="#94a3b8" size={20} strokeWidth={2} />
                          </View>
                          <View style={mhStyles.infoCardContent}>
                            <Text style={[mhStyles.infoCardLabel, { color: '#94a3b8' }]}>BLOOD GROUP</Text>
                            <Text style={mhStyles.infoCardValue}>
                              {medPatient?.blood_group || activeDisplayPatient?.blood_group || 'Not recorded'}
                            </Text>
                          </View>
                        </View>

                        {/* Allergies */}
                        <View style={mhStyles.infoCard}>
                          <View style={mhStyles.infoCardIconBox}>
                            <ShieldAlert color="#94a3b8" size={20} strokeWidth={2} />
                          </View>
                          <View style={mhStyles.infoCardContent}>
                            <Text style={[mhStyles.infoCardLabel, { color: '#94a3b8' }]}>ALLERGIES</Text>
                            <Text style={mhStyles.infoCardValue}>
                              {medPatient?.allergies || activeDisplayPatient?.allergies || 'None reported'}
                            </Text>
                          </View>
                        </View>

                        {/* Emergency Contact */}
                        <View style={[mhStyles.infoCard, mhStyles.emergencyInfoCard]}>
                          <View style={mhStyles.infoCardIconBox}>
                            <ContactRound color="#94a3b8" size={20} strokeWidth={2} />
                          </View>
                          <View style={mhStyles.infoCardContent}>
                            <Text style={[mhStyles.infoCardLabel, { color: '#94a3b8' }]}>EMERGENCY CONTACT</Text>
                            <Text style={mhStyles.infoCardValue} numberOfLines={2}>
                              {emergencyFormatted}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* ── Visit history section ── */}
                      {historyRecordFilter !== 'reports' && (
                        <>
                          <View style={mhStyles.sectionHeader}>
                            <View style={[mhStyles.sectionIconCircle, { backgroundColor: '#ccfbf1' }]}>
                              <StethoscopeIcon color="#0d9488" size={16} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={mhStyles.sectionTitle}>Visit history</Text>
                                <View style={mhStyles.sectionCountBadge}>
                                  <Text style={mhStyles.sectionCountBadgeText}>{filteredVisits.length}</Text>
                                </View>
                              </View>
                              <Text style={mhStyles.sectionSub}>Consultations, diagnoses and prescribed medicines</Text>
                            </View>
                          </View>

                          {filteredVisits.length === 0 ? (
                            <View style={mhStyles.emptyBox}>
                              <Search color="#cbd5e1" size={22} />
                              <Text style={mhStyles.emptyText}>No visit history found.</Text>
                            </View>
                          ) : (
                            <View style={{ gap: 10 }}>
                              {filteredVisits.map((v: any, vIdx: number) => {
                                const vDate = v.appointment_date
                                  ? `${v.appointment_date} ${v.appointment_time || ''}`.trim()
                                  : v.created_at ? formatDateLong(v.created_at) : '-';
                                return (
                                  <View key={v.appointment_id || v.id || vIdx} style={mhStyles.recordCard}>
                                    <View style={mhStyles.recordCardHeader}>
                                      <Text style={mhStyles.recordCardTitle} numberOfLines={1}>
                                        {v.reason || v.diagnosis || v.symptoms || 'Consultation'}
                                      </Text>
                                      <View style={mhStyles.statusBadgeGreen}>
                                        <Text style={mhStyles.statusBadgeGreenText}>
                                          {v.status ? String(v.status).toUpperCase() : 'RECORDED'}
                                        </Text>
                                      </View>
                                    </View>

                                    <View style={mhStyles.recordMetaRow}>
                                      <Text style={mhStyles.recordMetaText}>📅 {vDate}</Text>
                                      <Text style={mhStyles.recordMetaText}>🩺 {v.doctor_name || 'Not assigned'}</Text>
                                    </View>

                                    {v.notes || v.advice ? (
                                      <View style={mhStyles.noteBox}>
                                        <Text style={mhStyles.noteText}>💡 {v.advice || v.notes}</Text>
                                      </View>
                                    ) : null}

                                    {(v.medicines || []).length > 0 && (
                                      <View style={mhStyles.medChipsRow}>
                                        {(v.medicines || []).map((m: any, mIdx: number) => (
                                          <View key={mIdx} style={mhStyles.medChip}>
                                            <Text style={mhStyles.medChipText}>💊 {m.medicine_name} ({m.dosage || '1 tab'})</Text>
                                          </View>
                                        ))}
                                      </View>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </>
                      )}

                      {/* ── Lab reports section ── */}
                      {historyRecordFilter !== 'visits' && (
                        <>
                          <View style={[mhStyles.sectionHeader, { marginTop: 16 }]}>
                            <View style={[mhStyles.sectionIconCircle, { backgroundColor: '#fef3c7' }]}>
                              <FlaskConical color="#d97706" size={16} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={mhStyles.sectionTitle}>Lab reports</Text>
                                <View style={[mhStyles.sectionCountBadge, { backgroundColor: '#fef3c7' }]}>
                                  <Text style={[mhStyles.sectionCountBadgeText, { color: '#d97706' }]}>{filteredLabReports.length}</Text>
                                </View>
                              </View>
                              <Text style={mhStyles.sectionSub}>Test requests and diagnostic results</Text>
                            </View>
                          </View>

                          {filteredLabReports.length === 0 ? (
                            <View style={mhStyles.emptyBox}>
                              <Search color="#cbd5e1" size={22} />
                              <Text style={mhStyles.emptyText}>No lab reports found.</Text>
                            </View>
                          ) : (
                            <View style={{ gap: 10 }}>
                              {filteredLabReports.map((r: any, rIdx: number) => {
                                const reportDate = r.uploaded_at || r.created_at || r.ordered_date;
                                const formattedDate = reportDate ? formatDateLong(reportDate) : '-';
                                const isAbnormal = r.is_abnormal === 1 || r.is_abnormal === true;
                                return (
                                  <View key={r.lab_test_id || r.report_id || rIdx} style={mhStyles.recordCard}>
                                    <View style={mhStyles.recordCardHeader}>
                                      <Text style={mhStyles.recordCardTitle} numberOfLines={1}>
                                        {r.test_name || 'Lab Test'}
                                      </Text>
                                      <View style={[mhStyles.statusBadgeGreen, isAbnormal && { backgroundColor: '#fef2f2' }]}>
                                        <Text style={[mhStyles.statusBadgeGreenText, isAbnormal && { color: '#dc2626' }]}>
                                          {isAbnormal ? 'ABNORMAL' : (r.status ? String(r.status).toUpperCase() : 'ORDERED')}
                                        </Text>
                                      </View>
                                    </View>

                                    <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '500' }}>
                                      {[r.test_type, r.sample_type].filter(Boolean).join(' · ') || 'General diagnostic test'}
                                    </Text>

                                    <View style={mhStyles.recordMetaRow}>
                                      <Text style={mhStyles.recordMetaText}>📅 {formattedDate}</Text>
                                      <Text style={mhStyles.recordMetaText}>
                                        📋 Report {r.report_id ? `#${r.report_id}` : 'Pending'}
                                      </Text>
                                    </View>

                                    {r.remarks ? (
                                      <View style={mhStyles.noteBox}>
                                        <Text style={mhStyles.noteText}>📝 {r.remarks}</Text>
                                      </View>
                                    ) : null}
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </>
                      )}
                    </ScrollView>
                  )}

                  {/* ── Footer ── */}
                  <View style={mhStyles.footer}>
                    <Text style={mhStyles.footerPrivacy}>Private patient information</Text>
                    <TouchableOpacity style={mhStyles.footerCloseBtn} onPress={() => setShowMedicalHistoryModal(false)}>
                      <X color="#ffffff" size={16} strokeWidth={2} />
                      <Text style={mhStyles.footerCloseBtnText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Book Appointment Bottom Sheet Modal */}
      <Modal
        visible={canBookPatientAppointment && showBookAppointmentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBookAppointmentModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowBookAppointmentModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.bottomSheetContainer}>
            <View style={styles.consultHeaderLight}>
              <View style={styles.headerLeftRow}>
                <View style={styles.consultIconCircleTeal}>
                  <Text style={{ fontSize: 18 }}>📅</Text>
                </View>
                <View style={styles.headerTitleCol}>
                  <Text style={styles.consultTitleDark}>Book Appointment</Text>
                  <Text style={styles.consultSubDark}>
                    {activeDisplayPatient?.full_name || 'Patient'} ·{' '}
                    {(activeDisplayPatient as any)?.patient_code || `PT-${String(activeDisplayPatient?.id || 1).padStart(5, '0')}`}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.closeCircleBtn} onPress={() => setShowBookAppointmentModal(false)}>
                <Text style={styles.closeCircleText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14, gap: 14 }}>
              {/* Patient Info Summary Header */}
              <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' }}>
                  <PatientUserIcon color="#0d9488" size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>{activeDisplayPatient?.full_name}</Text>
                  <Text style={{ fontSize: 11, color: '#64748b' }}>📞 {activeDisplayPatient?.phone || 'No phone'} · {activeDisplayPatient?.gender || 'Patient'}</Text>
                </View>
              </View>

              {/* Date Input */}
              <View style={{ gap: 4 }}>
                <Text style={styles.gridBoxLabel}>📅 APPOINTMENT DATE (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.medSearchInputBox}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                  value={bookingDate}
                  onChangeText={setBookingDate}
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <TouchableOpacity
                    style={{ backgroundColor: '#e0f2fe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
                    onPress={() => setBookingDate(new Date().toISOString().split('T')[0])}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284c7' }}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
                    onPress={() => {
                      const tm = new Date();
                      tm.setDate(tm.getDate() + 1);
                      setBookingDate(tm.toISOString().split('T')[0]);
                    }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>Tomorrow</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
                    onPress={() => {
                      const d2 = new Date();
                      d2.setDate(d2.getDate() + 2);
                      setBookingDate(d2.toISOString().split('T')[0]);
                    }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>In 2 Days</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Time Slot Picker */}
              <View style={{ gap: 4 }}>
                <Text style={styles.gridBoxLabel}>🕒 SELECT TIME SLOT</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {['09:30:00', '10:00:00', '11:30:00', '14:00:00', '16:30:00', '18:00:00'].map((slot) => {
                    const isSelected = bookingTime === slot;
                    const displaySlot = slot.slice(0, 5);
                    return (
                      <TouchableOpacity
                        key={slot}
                        style={{
                          backgroundColor: isSelected ? '#0d9488' : '#f8fafc',
                          borderWidth: 1,
                          borderColor: isSelected ? '#0d9488' : '#cbd5e1',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                        }}
                        onPress={() => setBookingTime(slot)}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isSelected ? '#ffffff' : '#334155' }}>
                          {displaySlot}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Consultation Mode */}
              <View style={{ gap: 4 }}>
                <Text style={styles.gridBoxLabel}>🩺 CONSULTATION MODE</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: bookingMode === 'in_person' ? '#e6f4f1' : '#f8fafc',
                      borderWidth: 1.5,
                      borderColor: bookingMode === 'in_person' ? '#0d9488' : '#e2e8f0',
                      padding: 10,
                      borderRadius: 10,
                      alignItems: 'center',
                    }}
                    onPress={() => setBookingMode('in_person')}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: bookingMode === 'in_person' ? '#0d9488' : '#64748b' }}>
                      🏥 In-Person
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: bookingMode === 'video' ? '#e0f2fe' : '#f8fafc',
                      borderWidth: 1.5,
                      borderColor: bookingMode === 'video' ? '#0284c7' : '#e2e8f0',
                      padding: 10,
                      borderRadius: 10,
                      alignItems: 'center',
                    }}
                    onPress={() => setBookingMode('video')}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: bookingMode === 'video' ? '#0284c7' : '#64748b' }}>
                      📹 Video Call
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Consultation Fee */}
              <View style={{ gap: 4 }}>
                <Text style={styles.gridBoxLabel}>💳 CONSULTATION FEE (₹)</Text>
                <TextInput
                  style={styles.medSearchInputBox}
                  keyboardType="numeric"
                  placeholder="500"
                  placeholderTextColor="#94a3b8"
                  value={bookingFee}
                  onChangeText={setBookingFee}
                />
              </View>

              {/* Reason for Visit */}
              <View style={{ gap: 4 }}>
                <Text style={styles.gridBoxLabel}>📄 REASON FOR VISIT</Text>
                <TextInput
                  style={styles.medSearchInputBox}
                  placeholder="e.g. Toothache, Regular Checkup, Fever"
                  placeholderTextColor="#94a3b8"
                  value={bookingReason}
                  onChangeText={setBookingReason}
                />
              </View>

              {/* Notes */}
              <View style={{ gap: 4 }}>
                <Text style={styles.gridBoxLabel}>📝 ADDITIONAL NOTES (OPTIONAL)</Text>
                <TextInput
                  style={[styles.medSearchInputBox, { height: 60, textAlignVertical: 'top', paddingTop: 8 }]}
                  multiline
                  placeholder="Any special instructions or doctor notes..."
                  placeholderTextColor="#94a3b8"
                  value={bookingNotes}
                  onChangeText={setBookingNotes}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#0d9488',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  marginTop: 6,
                }}
                disabled={bookingSubmitting}
                onPress={handleBookAppointmentSubmit}>
                {bookingSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '800' }}>
                    📅 Confirm & Book Appointment
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Blood Group Picker Bottom Sheet Modal */}
      <Modal visible={false} transparent animationType="fade" onRequestClose={() => setShowEditBloodPicker(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowEditBloodPicker(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.pickerBottomSheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.pickerModalTitle}>Select Blood Group</Text>
              <TouchableOpacity style={styles.closeCircleBtn} onPress={() => setShowEditBloodPicker(false)}>
                <Text style={styles.closeCircleText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 4, paddingVertical: 10 }}>
              {['Select blood group', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'N/A'].map((bg) => (
                <TouchableOpacity
                  key={bg}
                  style={styles.pickerOptionRow}
                  onPress={() => {
                    setEditBloodGroup(bg);
                    setShowEditBloodPicker(false);
                  }}>
                  <Text style={[styles.pickerOptionText, editBloodGroup === bg && styles.pickerOptionSelected]}>{bg}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Gender Filter Picker Bottom Sheet Modal */}
      <Modal visible={false} transparent animationType="fade" onRequestClose={() => setShowGenderPicker(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowGenderPicker(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.pickerBottomSheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.pickerModalTitle}>Select Gender</Text>
              <TouchableOpacity style={styles.closeCircleBtn} onPress={() => setShowGenderPicker(false)}>
                <Text style={styles.closeCircleText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 4, paddingVertical: 10 }}>
              {['All Genders', 'Male', 'Female', 'Other'].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={styles.pickerOptionRow}
                  onPress={() => {
                    setGenderFilter(g);
                    setShowGenderPicker(false);
                  }}>
                  <Text style={[styles.pickerOptionText, genderFilter === g && styles.pickerOptionSelected]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Blood Group Filter Picker Bottom Sheet Modal */}
      <Modal visible={false} transparent animationType="fade" onRequestClose={() => setShowBloodPicker(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowBloodPicker(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.pickerBottomSheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.pickerModalTitle}>Select Blood Group</Text>
              <TouchableOpacity style={styles.closeCircleBtn} onPress={() => setShowBloodPicker(false)}>
                <Text style={styles.closeCircleText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 4, paddingVertical: 10 }}>
              {['All Blood Groups', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'N/A'].map((bg) => (
                <TouchableOpacity
                  key={bg}
                  style={styles.pickerOptionRow}
                  onPress={() => {
                    setBloodGroupFilter(bg);
                    setShowBloodPicker(false);
                  }}>
                  <Text style={[styles.pickerOptionText, bloodGroupFilter === bg && styles.pickerOptionSelected]}>{bg}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Filter Picker Bottom Sheet Modal */}
      <Modal visible={false} transparent animationType="fade" onRequestClose={() => setShowStatusPicker(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowStatusPicker(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.pickerBottomSheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.pickerModalTitle}>Select Status</Text>
              <TouchableOpacity style={styles.closeCircleBtn} onPress={() => setShowStatusPicker(false)}>
                <Text style={styles.closeCircleText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 4, paddingVertical: 10 }}>
              {['All Status', 'Active', 'Inactive'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.pickerOptionRow}
                  onPress={() => {
                    setStatusFilter(s);
                    setShowStatusPicker(false);
                  }}>
                  <Text style={[styles.pickerOptionText, statusFilter === s && styles.pickerOptionSelected]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Reusable Show/Hide Columns Modal */}
      <ColumnsModal
        visible={showColumnsModal}
        onClose={() => setShowColumnsModal(false)}
        columns={PATIENT_COLUMNS}
        selectedIds={selectedColumns}
        onToggle={handleToggleColumn}
        anchorY={columnsAnchorY}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },

  headerBox: { marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageTitle: { fontSize: 21, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  addPatientButton: { marginLeft: 'auto', backgroundColor: '#0d9488', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  addPatientButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  pageSub: { fontSize: 13, color: '#64748b', marginTop: 3 },

  /* 2x2 Stats Grid */
  statsGrid: { gap: 10, marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  surfaceActive: {
    borderColor: '#16d4c2',
    borderWidth: 2,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 7,
    elevation: 3,
  },
  statIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContentCol: {
    flex: 1,
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 1,
  },
  statSplitContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statSplitCol: {
    alignItems: 'flex-start',
  },
  statSplitDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 8,
  },

  /* Filter Card */
  filterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 10,
    marginBottom: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'visible',
    zIndex: 10,
  },
  searchInputBox: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0f172a',
    paddingVertical: 0,
  },
  filterDropdownsRow: {
    flexDirection: 'row',
    gap: 8,
    zIndex: 1,
  },
  filterDropdownsRowActive: { zIndex: 20, elevation: 20 },
  inlineDropdownWrapper: { flex: 1, position: 'relative' },
  inlineDropdownWrapperActive: { zIndex: 30, elevation: 30 },
  inlineDropdownMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 4,
    shadowColor: '#334155',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 12,
  },
  inlineDropdownOption: { minHeight: 28, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 7, marginHorizontal: 3 },
  inlineDropdownOptionSelected: { backgroundColor: '#dff7f4' },
  inlineDropdownOptionText: { color: '#334155', fontSize: 12, fontWeight: '500' },
  inlineDropdownOptionTextSelected: { color: '#0d9488', fontWeight: '700' },
  inlineDateWrapper: { position: 'relative', zIndex: 5 },
  inlineRegistrationCalendar: { position: 'absolute', top: 44, right: 0, width: 260, zIndex: 40, elevation: 20 },
  editBloodDropdownWrapper: { position: 'relative', zIndex: 20, elevation: 20 },
  editBloodInlineMenu: {
    position: 'absolute',
    top: 67,
    left: 0,
    right: 0,
    zIndex: 40,
    elevation: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 4,
    shadowColor: '#334155',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  filterDropdownBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterDropdownText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  registrationDateInput: { flex: 1, fontSize: 12, fontWeight: '600', color: '#334155', padding: 0 },
  registrationDatePlaceholder: { color: '#94a3b8' },
  filterActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  filterResetBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  columnsBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  columnsBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },

  /* Patients Section */
  patientsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 12,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  patientsListContainer: {
    gap: 12,
  },
  patientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 12,
  },
  patientCardSelected: {
    borderColor: '#16d4c2',
    borderWidth: 2,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  patientCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  patientNameCol: {
    gap: 2,
  },
  patientNameText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  patientCodeText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  moreActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dff7f4',
    marginTop: -3,
  },
  patientFieldsList: {
    gap: 8,
  },
  patientFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  toggleSwitchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchTrackActive: {
    backgroundColor: '#0d9488',
  },
  toggleSwitchTrackInactive: {
    backgroundColor: '#cbd5e1',
  },
  toggleSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleSwitchThumbActive: {
    alignSelf: 'flex-end',
  },
  toggleSwitchThumbInactive: {
    alignSelf: 'flex-start',
  },

  emptyCard: { alignItems: 'center', padding: 30 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  emptySub: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 99999, elevation: 99999 },
  modalOverlayDark: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 14, zIndex: 99999, elevation: 99999 },
  pickerModalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 320 },
  pickerModalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 14, textAlign: 'center' },
  pickerOptionRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerOptionText: { fontSize: 14, color: '#334155', fontWeight: '600', textAlign: 'center' },
  pickerOptionSelected: { color: '#0d9488', fontWeight: '800' },

  actionMenuCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 18, width: '100%', maxWidth: 300, gap: 4, zIndex: 100000, elevation: 100000 },
  actionPopoverOverlay: { flex: 1, backgroundColor: 'transparent' },
  actionPopoverBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  actionPopover: { position: 'absolute', width: 136, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingVertical: 5, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 20 },
  actionPopoverTitle: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 6, color: '#334155', fontSize: 12, fontWeight: '800' },
  actionPopoverRow: { minHeight: 31, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11 },
  actionPopoverText: { color: '#475569', fontSize: 12, fontWeight: '500' },
  actionMenuTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 10, textAlign: 'center' },
  actionOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#f8fafc', marginVertical: 2 },
  actionOptionHighlight: { backgroundColor: '#ccfbf1' },
  actionOptionText: { fontSize: 14, fontWeight: '700', color: '#334155' },
  deleteActionOption: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  deleteActionIcon: { width: 18, textAlign: 'center', color: '#dc2626', fontSize: 22, fontWeight: '700', lineHeight: 22 },
  deleteActionText: { color: '#dc2626', fontSize: 14, fontWeight: '800' },
  closeActionBtn: { backgroundColor: '#f1f5f9', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  closeActionBtnText: { fontSize: 13, fontWeight: '700', color: '#64748b' },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.72)', justifyContent: 'center', alignItems: 'center', padding: 10, zIndex: 99999, elevation: 99999 },
  viewDetailsOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.78)', justifyContent: 'center', alignItems: 'center', padding: 16, zIndex: 99999, elevation: 99999 },
  recordModalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.78)', justifyContent: 'center', alignItems: 'center', padding: 16, zIndex: 99999, elevation: 99999 },
  recordModalCard: { width: '100%', maxWidth: 420, height: '94%', maxHeight: '96%', backgroundColor: '#f8fafc', borderRadius: 12, overflow: 'hidden', elevation: 18 },
  bottomSheetContainer: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 10, paddingBottom: Platform.OS === 'ios' ? 24 : 10, height: '96%', maxHeight: '97%', width: '100%', maxWidth: 520, alignSelf: 'center', zIndex: 100000, elevation: 100000 },
  pickerBottomSheetContainer: { backgroundColor: '#ffffff', borderRadius: 20, paddingHorizontal: 20, paddingTop: 18, paddingBottom: Platform.OS === 'ios' ? 40 : 30, maxHeight: '80%', width: '100%', maxWidth: 440, alignSelf: 'center', zIndex: 100000, elevation: 100000 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerRightActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activePillBadge: { backgroundColor: '#d1fae5', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  activePillText: { color: '#059669', fontSize: 11, fontWeight: '700' },
  editInfoBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe4eb', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6, shadowColor: '#64748b', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  editInfoBtnText: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  closeCircleBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  closeCircleText: { fontSize: 14, color: '#475569', fontWeight: 'bold' },
  sheetContentScroll: { gap: 12, paddingBottom: 20 },
  recordScrollContent: { paddingHorizontal: 14, paddingBottom: 20 },
  cardsGridTwoCol: { gap: 12 },
  detailCard: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', paddingBottom: 4 },
  contactCardHighlight: { borderColor: '#2dd4bf', borderWidth: 1.5 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#effbf9', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  cardHeaderIconBox: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#dff8f3', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  detailDataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 9, marginHorizontal: 10, marginTop: 7, paddingHorizontal: 10, paddingVertical: 9, gap: 10 },
  dataLabel: { fontSize: 11, color: '#718096', fontWeight: '500', flex: 1 },
  dataLabelIcon: { fontSize: 11, color: '#718096', fontWeight: '500' },
  dataLabelIconRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  dataValBold: { fontSize: 11, fontWeight: '700', color: '#0f172a', flexShrink: 1, textAlign: 'right' },
  billingSummaryRowGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  billingSummaryItem: { flex: 1, gap: 2 },
  billingItemLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  billingItemValTeal: { fontSize: 13, fontWeight: '800', color: '#0d9488' },

  viewDetailsModalCard: { width: '100%', maxWidth: 420, height: '94%', backgroundColor: '#eef4f4', borderRadius: 12, overflow: 'hidden', maxHeight: '96%', elevation: 18 },
  viewDetailsHeader: { backgroundColor: '#e6f2f1', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#d5e5e4' },
  viewDetailsTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  viewDetailsActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  viewDetailsCloseBtn: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#0d9488', alignItems: 'center', justifyContent: 'center', marginTop: -2 },
  headerLeftRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarBigCircle: { width: 52, height: 52, borderRadius: 15, backgroundColor: '#ccefeb', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#b5e5df' },
  avatarBigLetter: { fontSize: 20, fontWeight: '800', color: '#0d9488' },
  headerTitleCol: {},
  viewDetailsName: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  viewDetailsCode: { fontSize: 12, color: '#718096', fontWeight: '500', marginTop: 3 },
  headerRightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeBadgePill: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  activeBadgePillText: { fontSize: 11, fontWeight: '800', color: '#16a34a' },
  editInfoSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ffffff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1' },
  editInfoSmallBtnText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  closeModalCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  closeModalCircleText: { fontSize: 14, fontWeight: 'bold', color: '#64748b' },

  viewDetailsBodyGrid: { padding: 10, gap: 12, paddingBottom: 20 },
  gridDetailsCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  cardHeaderIconText: { fontSize: 16 },
  cardHeaderTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  detailItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  itemLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  itemVal: { fontSize: 12, color: '#0f172a', fontWeight: '700' },

  editModalCard: { width: '100%', maxWidth: 480, backgroundColor: '#ffffff', borderRadius: 20, overflow: 'hidden', maxHeight: '90%' },
  editModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  editBottomSheetContainer: { width: '100%', maxWidth: 520, alignSelf: 'center', maxHeight: '92%', backgroundColor: '#ffffff', borderRadius: 14, overflow: 'hidden', borderTopWidth: 3, borderTopColor: '#0d9488' },
  editSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  editSheetCloseBtn: { padding: 6, marginRight: -4 },
  editModalHeaderTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  closeBtnText: { fontSize: 18, fontWeight: 'bold', color: '#64748b' },
  editFormBodyScroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20, gap: 14 },
  formSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, marginBottom: 4, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  formSectionTitle: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  formRowGrid: { gap: 14 },
  inputGroup: { gap: 6 },
  inputLabelReq: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  reqAsterisk: { color: '#ef4444', fontWeight: 'bold' },
  textInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#dbe4eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#0f172a' },
  readOnlyTextInput: { color: '#94a3b8', backgroundColor: '#f1f5f9' },
  textInputActiveFocus: { borderColor: '#0d9488', borderWidth: 1.8, backgroundColor: '#f8fafc' },
  multilineInput: { height: 70, textAlignVertical: 'top' },
  inputWithIconRight: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#dbe4eb', borderRadius: 10, paddingHorizontal: 12 },
  innerRightIcon: { fontSize: 14, marginLeft: 4 },
  radioGroupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5 },
  radioOption: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.8, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { borderColor: '#0d9488' },
  radioDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#0d9488' },
  radioText: { fontSize: 13, color: '#334155', fontWeight: '600' },
  dropdownPickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#dbe4eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  dropdownPickerText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  dropdownArrow: { fontSize: 10, color: '#94a3b8' },
  sectionDividerLine: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  editModalFooter: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#ffffff' },
  cancelGreyBtn: { flex: 1, alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#dbe4eb', borderRadius: 10, paddingVertical: 11 },
  cancelGreyBtnText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  updateTealBtn: { flex: 1, alignItems: 'center', backgroundColor: '#0d9488', borderRadius: 10, paddingVertical: 11 },
  updateTealBtnText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },

  consultModalCard: { width: '100%', maxWidth: 420, height: '94%', backgroundColor: '#f8fafc', borderRadius: 12, overflow: 'hidden', maxHeight: '96%' },
  consultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#073b3a', paddingHorizontal: 16, paddingVertical: 14 },
  consultIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0d9488', alignItems: 'center', justifyContent: 'center' },
  consultTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  consultSub: { fontSize: 12, color: '#99f6e4' },
  consultBody: { padding: 14, gap: 12 },
  consultItemCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  consultCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  docAvatarSmallCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  docHeaderCol: { flex: 1 },
  docNameTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  docSpecSub: { fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 1 },
  approvedBadgePill: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  approvedBadgePillText: { fontSize: 11, fontWeight: '700', color: '#15803d' },
  cardDividerLine: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 2 },
  consultGridTwoRow: { flexDirection: 'row', gap: 10 },
  consultBoxItem: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 10 },
  consultFeeBoxHighlight: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  reasonBoxItem: { backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderRadius: 12, padding: 10 },
  reasonLabelText: { fontSize: 10, fontWeight: '800', color: '#0369a1', letterSpacing: 0.5 },
  reasonValueText: { fontSize: 12, fontWeight: '600', color: '#0c4a6e', marginTop: 2 },
  notesBoxItem: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 12, padding: 10 },
  notesLabelText: { fontSize: 10, fontWeight: '800', color: '#c2410c', letterSpacing: 0.5 },
  notesValueText: { fontSize: 12, fontWeight: '600', color: '#7c2d12', marginTop: 2 },
  boxLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 2 },
  gridBoxLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.5 },
  boxVal: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  boxValDate: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  boxValTime: { fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 2 },
  feeValText: { fontSize: 16, fontWeight: '800', color: '#15803d', marginTop: 2 },
  consultFooter: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  tealCloseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0d9488', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  fullWidthCloseBtn: { flex: 1 },
  tealCloseBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },

  prescModalCard: { width: '100%', maxWidth: 420, height: '94%', backgroundColor: '#071624', borderRadius: 12, overflow: 'hidden', maxHeight: '96%' },
  prescHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  prescIconCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#22d3c5', alignItems: 'center', justifyContent: 'center' },
  prescTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  prescSub: { fontSize: 12, color: '#94a3b8' },
  prescBodySplit: { backgroundColor: '#ffffff', padding: 30, alignItems: 'center', justifyContent: 'center' },
  prescEmptyBox: { alignItems: 'center', padding: 20 },
  prescEmptyCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  prescEmptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  prescEmptySub: { fontSize: 12, color: '#64748b', textAlign: 'center' },
  prescFooterRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 10 },
  prescFooterSecText: { fontSize: 11, color: '#64748b' },
  darkCloseBtn: { backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  darkCloseBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  prescriptionTabs: { flexDirection: 'row', gap: 4, backgroundColor: '#ffffff', paddingHorizontal: 4, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  prescriptionTab: { flex: 1, minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 9 },
  prescriptionTabActive: { backgroundColor: '#0f172a' },
  prescriptionTabText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  prescriptionTabTextActive: { color: '#ffffff' },
  prescriptionTabCount: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0' },
  prescriptionTabCountText: { fontSize: 10, fontWeight: '800', color: '#334155' },

  historyModalCard: { width: '100%', maxWidth: 460, backgroundColor: '#ffffff', borderRadius: 20, overflow: 'hidden', maxHeight: '88%' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#071624', paddingHorizontal: 16, paddingVertical: 14 },
  historyIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0d9488', alignItems: 'center', justifyContent: 'center' },
  historyTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  historySub: { fontSize: 11, color: '#94a3b8' },
  historyHeaderBadges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadgeSquare: { backgroundColor: '#0f2942', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignItems: 'center' },
  badgeSquareLabel: { fontSize: 9, fontWeight: '800', color: '#2dd4bf' },
  badgeSquareVal: { fontSize: 12, fontWeight: '800', color: '#ffffff' },

  historyBody: { padding: 16 },
  historySecTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  historySecSub: { fontSize: 11, color: '#64748b', marginBottom: 10 },
  overviewGridThreeCol: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  overviewBox: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 8 },
  overviewBoxLabel: { fontSize: 9, fontWeight: '800', color: '#64748b', marginBottom: 2 },
  overviewBoxVal: { fontSize: 11, fontWeight: '800', color: '#0f172a' },

  visitHistoryCard: { backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#2dd4bf', borderRadius: 14, padding: 12, gap: 6 },
  visitHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  visitReasonTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  approvedPillSmall: { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  approvedPillSmallText: { fontSize: 10, fontWeight: '800', color: '#16a34a' },
  visitMetaText: { fontSize: 11, color: '#64748b' },
  visitNoteYellowBox: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 8, padding: 8, marginTop: 4 },
  visitNoteText: { fontSize: 11, color: '#c2410c', fontWeight: '700' },
  prescHeaderDark: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#071624', paddingHorizontal: 20, paddingVertical: 18, marginBottom: 12 },
  prescTitleDark: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  prescSubDark: { fontSize: 11, color: '#94a3b8' },
  recordsCountBadge: { backgroundColor: '#0f2942', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignItems: 'center' },
  recordsCountLabel: { fontSize: 8, fontWeight: '800', color: '#2dd4bf' },
  recordsCountNum: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  emptyPrescBody: { alignItems: 'center', padding: 40 },
  prescSheetScrollBody: { gap: 12, paddingBottom: 20 },
  prescListHeaderRow: { gap: 2, marginBottom: 4 },
  rowAlignGap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prescSecTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  miniCountPill: { backgroundColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  miniCountPillText: { fontSize: 11, fontWeight: '800', color: '#334155' },
  prescSecSub: { fontSize: 12, color: '#64748b' },
  prescCardsHorizScroll: { gap: 10, paddingVertical: 4 },
  prescSelectCard: { width: 170, backgroundColor: '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: '#cbd5e1', gap: 4 },
  prescSelectCardActive: { backgroundColor: '#f0fdf4', borderColor: '#2dd4bf', elevation: 3 },
  cardRxTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rxCardCode: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  finalGreenBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  finalGreenBadgeText: { fontSize: 9, fontWeight: '800', color: '#16a34a' },
  rxCardDate: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  rxCardDiag: { fontSize: 11, color: '#0d9488', fontWeight: '700' },

  selectedPrescContainer: { gap: 12, marginTop: 6 },
  doctorInfoCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', gap: 10 },
  docAvatarCircleBig: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' },
  docDetailsCol: { flex: 1 },
  prescribedByTag: { fontSize: 9, fontWeight: '800', color: '#64748b' },
  docNameBig: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  docTimeText: { fontSize: 11, color: '#64748b', marginTop: 2 },
  docCardRightBadges: { alignItems: 'flex-end', gap: 4 },
  rxBadgeTag: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  rxBadgeTagText: { fontSize: 10, fontWeight: '800', color: '#334155' },
  followUpBadgePill: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  followUpBadgeText: { fontSize: 10, fontWeight: '700', color: '#0284c7' },

  diagSymptomGrid: { flexDirection: 'row', gap: 10 },
  gridBoxItem: { flex: 1, backgroundColor: '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  boxLabelHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  gridBoxValueText: { fontSize: 14, fontWeight: '800', color: '#0f172a' },

  clinicalAdviceCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  adviceBodyText: { fontSize: 13, color: '#334155', fontWeight: '600' },

  medicinesCardContainer: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 10 },
  cardHeaderWithBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleWithIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconCircleTealSmall: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' },
  cardTitleText: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  cardSubText: { fontSize: 10, color: '#64748b' },
  countBadgeRound: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  countBadgeRoundText: { fontSize: 11, fontWeight: '800', color: '#334155' },
  emptyItemsBox: { paddingVertical: 14, alignItems: 'center' },
  emptyItemsText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  medsListStack: { gap: 8 },
  medItemRowCard: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#cbd5e1', gap: 4 },
  medNameText: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  medSpecsRow: { flexDirection: 'row', gap: 10 },
  medSpecTag: { fontSize: 11, color: '#475569', fontWeight: '600' },
  medInstructionText: { fontSize: 11, color: '#0d9488', fontWeight: '600' },
  prescModalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },

  historyIconCircleTeal: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0f2942', alignItems: 'center', justifyContent: 'center' },
  medicalHistoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#061a29', paddingHorizontal: 20, paddingVertical: 20, marginHorizontal: -18, marginTop: -18, marginBottom: 18 },
  medicalHistoryIconBox: { width: 68, height: 68, borderRadius: 22, backgroundColor: '#12d6c2', alignItems: 'center', justifyContent: 'center', shadowColor: '#12d6c2', shadowOpacity: 0.28, shadowRadius: 10, elevation: 5 },
  medicalHistoryTitle: { fontSize: 24, fontWeight: '800', color: '#ffffff', letterSpacing: -0.4 },
  medicalHistorySub: { fontSize: 14, color: '#cbd5e1', fontWeight: '500', marginTop: 5 },
  medicalHistoryCloseBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  medicalHistoryFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: -18, marginBottom: -18, marginTop: 12 },
  medicalHistoryPrivacy: { fontSize: 11, color: '#94a3b8' },
  medicalHistoryFooterClose: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#061a29', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 13 },
  medicalHistoryFooterCloseText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  medSearchFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 18 },
  medSearchInputBox: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe4eb', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  medSearchTextInput: { flex: 1, fontSize: 15, color: '#0f172a', padding: 0 },
  medFilterPillBtn: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe4eb', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13 },
  medFilterPillText: { fontSize: 14, fontWeight: '500', color: '#334155' },
  overviewSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, marginBottom: 14 },
  overviewCardsGridThree: { gap: 12, marginBottom: 24 },
  overviewSingleBoxCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#64748b', shadowOpacity: 0.08, shadowRadius: 7, elevation: 2, gap: 8 },
  overviewBoxIconHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBoxLightGrey: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  overviewBoxLabelTitle: { fontSize: 13, fontWeight: '500', color: '#94a3b8', letterSpacing: 0.3 },
  overviewBoxBigValText: { fontSize: 19, fontWeight: '600', color: '#0f172a', marginLeft: 78, marginTop: -34 },
  visitRowCardItem: { backgroundColor: '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', gap: 6 },
  visitCardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  visitCardReasonTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  approvedGreenBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  approvedGreenBadgeText: { fontSize: 10, fontWeight: '800', color: '#16a34a' },
  visitMetaFlexRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  visitMetaItemText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  visitNotesYellowCard: { backgroundColor: '#fff7ed', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#fed7aa', marginTop: 2 },
  visitNotesYellowText: { fontSize: 11, color: '#c2410c', fontWeight: '600' },
  visitMedsPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  visitMedChip: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  visitMedChipText: { fontSize: 11, color: '#16a34a', fontWeight: '700' },

  consultHeaderLight: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e6f4f1', paddingHorizontal: 12, paddingVertical: 12, marginBottom: 0, borderBottomWidth: 1, borderBottomColor: '#cfe8e4' },
  consultTitleDark: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  consultSubDark: { fontSize: 11, color: '#64748b', marginTop: 2 },
  consultIconCircleTeal: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#0d9488', alignItems: 'center', justifyContent: 'center' },
  modalEmptyFill: { flex: 1, minHeight: 330, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 28 },
  referenceEmptyIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#eef3f7', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  referenceEmptyTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', textAlign: 'center' },
  referenceEmptySub: { fontSize: 11, color: '#64748b', textAlign: 'center', marginTop: 5 },
  consultCardFull: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 10 },
  consultFooterLight: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 12, marginTop: 12 },
});

/* ── Medical History modal styles (matches web MedicalHistoryDialog) ── */
const mhStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: -10,
    marginTop: -10,
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#2dd4bf',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0d9488',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  headerSubRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  headerPatientName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerCodeBadge: {
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  headerCodeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#5eead4',
  },
  headerMeta: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  headerCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  scrollContent: {
    gap: 12,
    paddingBottom: 20,
  },

  /* Search bar */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    padding: 0,
  },

  /* Filter pills */
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterPill: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#334155',
  },

  /* Section headers */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 6,
    marginBottom: 8,
  },
  sectionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  sectionCountBadge: {
    backgroundColor: '#ccfbf1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
  },
  sectionCountBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d9488',
  },

  /* Patient overview info cards */
  infoCardsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 1,
  },
  emergencyInfoCard: { borderColor: '#55d8d0', borderWidth: 1.2 },
  infoCardIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  infoCardValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },

  /* Record cards (visits + lab reports) */
  recordCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  recordCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordCardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginRight: 8,
  },
  statusBadgeGreen: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeGreenText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16a34a',
  },
  recordMetaRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  recordMetaText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },

  noteBox: {
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginTop: 2,
  },
  noteText: {
    fontSize: 11,
    color: '#c2410c',
    fontWeight: '600',
  },

  medChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  medChip: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  medChipText: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '700',
  },

  /* Empty state */
  emptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
  },
  emptyText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginHorizontal: -10,
    marginBottom: -10,
    marginTop: 8,
  },
  footerPrivacy: {
    fontSize: 11,
    color: '#94a3b8',
    display: 'none',
  },
  footerCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#0f172a',
    borderRadius: 9,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  footerCloseBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default PatientsScreen;
