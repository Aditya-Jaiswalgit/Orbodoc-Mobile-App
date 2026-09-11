import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import {
  BuildingClinicIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  ClinicVerifiedIcon,
  ColumnsIcon,
  FilterResetIcon,
  InPersonClinicIcon,
  MapPinIcon,
  PatientUserIcon,
  RefreshCwIcon,
  SearchInputIcon,
  ShareLinkIcon,
  SparklesIcon,
  StethoscopeIcon,
  VideoCallIcon,
} from '../../components/common/CustomIcons';
import { useAppointments } from '../../hooks/useAppointments';
import { Appointment } from '../../types/clinicTypes';
import { ColumnsModal, ColumnItem } from '../../components/common/ColumnsModal';
import { useOutsideTapDismiss } from '../../components/common/useOutsideTapDismiss';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react-native';

interface AppointmentsScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
  onToggleTabBar?: (hide: boolean) => void;
}

export const APPOINTMENT_COLUMNS: ColumnItem[] = [
  { id: 'patient_name', label: 'Patient Name' },
  { id: 'phone', label: 'Phone No' },
  { id: 'patient_code', label: 'Patient Code' },
  { id: 'date', label: 'Date' },
  { id: 'time', label: 'Time' },
  { id: 'mode', label: 'Consultation Mode' },
  { id: 'doctor', label: 'Doctor Name' },
  { id: 'clinic', label: 'Clinic' },
  { id: 'specialization', label: 'Specialization' },
  { id: 'status', label: 'Status' },
  { id: 'reason', label: 'Reason' },
  { id: 'notes', label: 'Notes' },
  { id: 'duration', label: 'Duration' },
  { id: 'share', label: 'Share' },
];

export const DEFAULT_APPOINTMENT_COLUMNS: string[] = [
  'patient_name',
  'phone',
  'date',
  'time',
  'mode',
  'doctor',
  'status',
  'reason',
];

const formatTableDate = (dateStr?: string) => {
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

const formatLastRefreshed = (d: Date) => {
  const day = d.getDate();
  const months = ['Sept', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const monthStr = months[d.getMonth()] || 'Sept';
  const year = d.getFullYear();
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day} ${monthStr} ${year}, ${hours}:${mins}:${secs} ${ampm}`;
};

export const AppointmentsScreen: React.FC<AppointmentsScreenProps> = ({
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
  onToggleTabBar,
}) => {
  const { appointments, loading, refreshAppointments } = useAppointments();

  // Filters state
  const [selectedClinic, setSelectedClinic] = useState<string>('All Clinics');
  const [selectedStatus, setSelectedStatus] = useState<string>('All Status');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('All Doctors');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [lastRefreshedDate, setLastRefreshedDate] = useState<Date>(new Date());
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'scheduled' | 'completed'>('all');

  // Counts for hero segment buttons
  const scheduledCount = useMemo(() => {
    return (appointments || []).filter((a) => {
      const s = String(a.status || '').toLowerCase();
      return s === 'scheduled' || s === 'approved' || s === 'confirmed';
    }).length;
  }, [appointments]);

  const completedCount = useMemo(() => {
    return (appointments || []).filter((a) => {
      const s = String(a.status || '').toLowerCase();
      return s === 'complete' || s === 'completed';
    }).length;
  }, [appointments]);

  const handleResetFilters = () => {
    setSelectedClinic('All Clinics');
    setSelectedStatus('All Status');
    setSelectedDoctor('All Doctors');
    setSearchQuery('');
    setDateFilter('');
    setActiveTabFilter('all');
    setCurrentPage(1);
  };

  // Card active state (green/teal border on click)
  const [isCardActive, setIsCardActive] = useState<boolean>(false);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);

  // Render exactly five API appointments per page after all filters are applied.
  const APPOINTMENTS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Column management modal
  const [showColumnsModal, setShowColumnsModal] = useState<boolean>(false);
  const [columnsAnchorY, setColumnsAnchorY] = useState<number | undefined>(undefined);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_APPOINTMENT_COLUMNS);

  // Picker modals
  const [showClinicPicker, setShowClinicPicker] = useState<boolean>(false);
  const [showStatusPicker, setShowStatusPicker] = useState<boolean>(false);
  const [showDoctorPicker, setShowDoctorPicker] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [clinicSearch, setClinicSearch] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const clinicFieldRef = React.useRef<View>(null);
  const clinicMenuRef = React.useRef<View>(null);
  const statusFieldRef = React.useRef<View>(null);
  const statusMenuRef = React.useRef<View>(null);
  const doctorFieldRef = React.useRef<View>(null);
  const doctorMenuRef = React.useRef<View>(null);
  const dismissInlinePickerOnOutsideTap = useOutsideTapDismiss(useMemo(() => [
    { id: 'clinic', open: showClinicPicker, refs: [clinicFieldRef, clinicMenuRef], dismiss: () => setShowClinicPicker(false) },
    { id: 'status', open: showStatusPicker, refs: [statusFieldRef, statusMenuRef], dismiss: () => setShowStatusPicker(false) },
    { id: 'doctor', open: showDoctorPicker, refs: [doctorFieldRef, doctorMenuRef], dismiss: () => setShowDoctorPicker(false) },
  ], [showClinicPicker, showStatusPicker, showDoctorPicker]));

  // Hide footer bottom bar whenever any bottom sheet or modal is open
  useEffect(() => {
    if (onToggleTabBar) {
      const isAnyModalOpen =
        showDatePicker ||
        showColumnsModal;
      onToggleTabBar(isAnyModalOpen);
    }
  }, [
    showDatePicker,
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

  const handleManualRefresh = async () => {
    await refreshAppointments();
    setLastRefreshedDate(new Date());
  };

  const handleShareAppointment = async (appt: Appointment) => {
    try {
      const doc = appt.doctor_name || 'Doctor';
      const date = formatTableDate(appt.appointment_date);
      const time = appt.appointment_time || appt.time_slot || '10:00 AM';
      await Share.share({
        message: `Appointment with ${doc} on ${date} at ${time}. Clinic: ${appt.clinic_name || 'Clinic unavailable'}`,
        title: 'Appointment Details',
      });
    } catch (e) {
      // ignore
    }
  };

  // Distinct doctors & clinics from backend appointments
  const doctorOptions = useMemo(() => {
    const docs = new Set<string>();
    appointments.forEach((a) => {
      const d = a.doctor_name || (a as any).doctor?.full_name;
      if (d) docs.add(d);
    });
    return ['All Doctors', ...Array.from(docs)];
  }, [appointments]);

  const clinicOptions = useMemo(() => {
    const cls = new Set<string>();
    appointments.forEach((a) => {
      const c = a.clinic_name || (a as any).clinic?.name;
      if (c) cls.add(c);
    });
    return ['All Clinics', ...Array.from(cls)];
  }, [appointments]);
  const visibleClinicOptions = clinicOptions.filter((option) => option.toLowerCase().includes(clinicSearch.trim().toLowerCase()));
  const visibleDoctorOptions = doctorOptions.filter((option) => option.toLowerCase().includes(doctorSearch.trim().toLowerCase()));

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return (appointments || []).filter((a) => {
      // Clinic filter
      if (selectedClinic !== 'All Clinics') {
        const cName = a.clinic_name || (a as any).clinic?.name || '';
        if (cName.toLowerCase() !== selectedClinic.toLowerCase()) return false;
      }

      // Status filter
      if (selectedStatus !== 'All Status') {
        const s = String(a.status || '').toLowerCase();
        const target = selectedStatus.toLowerCase();
        if (target === 'complete' || target === 'completed') {
          if (s !== 'complete' && s !== 'completed') return false;
        } else if (target === 'cancel' || target === 'cancelled') {
          if (s !== 'cancel' && s !== 'cancelled') return false;
        } else if (target === 'scheduled' || target === 'approved') {
          if (s !== 'scheduled' && s !== 'approved' && s !== 'confirmed') return false;
        } else if (target === 'in progress' || target === 'in_progress') {
          if (s !== 'in_progress' && s !== 'in progress') return false;
        } else if (s !== target) {
          return false;
        }
      }

      // Doctor filter
      if (selectedDoctor !== 'All Doctors') {
        const dName = a.doctor_name || (a as any).doctor?.full_name || '';
        if (!dName.toLowerCase().includes(selectedDoctor.toLowerCase())) return false;
      }

      // Date filter
      if (dateFilter.trim()) {
        const apptDate = a.appointment_date || '';
        if (!apptDate.includes(dateFilter.trim())) return false;
      }

      // Search query (patient name, patient phone, doctor name, patient code, etc.)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pName = String(a.patient_name || (a as any).patient || '').toLowerCase();
        const pPhone = String(a.patient_phone || '').toLowerCase();
        const pCode = String((a as any).patient_code || (a as any).patient?.patient_code || '').toLowerCase();
        const docName = String(a.doctor_name || (a as any).doctor?.full_name || '').toLowerCase();
        const r = String(a.reason || '').toLowerCase();
        if (!pName.includes(q) && !pPhone.includes(q) && !docName.includes(q) && !r.includes(q) && !pCode.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, selectedClinic, selectedStatus, selectedDoctor, dateFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / APPOINTMENTS_PER_PAGE));
  const firstAppointmentIndex = (currentPage - 1) * APPOINTMENTS_PER_PAGE;
  const visibleAppointments = filteredAppointments.slice(
    firstAppointmentIndex,
    firstAppointmentIndex + APPOINTMENTS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClinic, selectedStatus, selectedDoctor, dateFilter, searchQuery, activeTabFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const renderStatusBadge = (status?: string) => {
    const s = String(status || '').toLowerCase();
    if (s === 'complete' || s === 'completed') {
      return (
        <View style={styles.statusPillComplete}>
          <Text style={styles.statusTextComplete}>Complete</Text>
        </View>
      );
    }
    if (s === 'cancel' || s === 'cancelled') {
      return (
        <View style={styles.statusPillCancel}>
          <Text style={styles.statusTextCancel}>Cancel</Text>
        </View>
      );
    }
    if (s === 'in_progress' || s === 'in progress') {
      return (
        <View style={styles.statusPillInProgress}>
          <Text style={styles.statusTextInProgress}>In Progress</Text>
        </View>
      );
    }
    return (
      <View style={styles.statusPillScheduled}>
        <Text style={styles.statusTextScheduled}>
          {s === 'approved' ? 'Approved' : 'Scheduled'}
        </Text>
      </View>
    );
  };

  const renderModeBadge = (mode?: string, type?: string) => {
    const m = String(mode || type || '').toLowerCase();
    const isVideo = m.includes('video') || m.includes('tele');
    if (isVideo) {
      return (
        <View style={styles.modePillVideo}>
          <VideoCallIcon size={14} color="#7c3aed" />
          <Text style={styles.modeTextVideo}>Video Call</Text>
        </View>
      );
    }
    return (
      <View style={styles.modePillInPerson}>
        <InPersonClinicIcon size={14} color="#0f766e" />
        <Text style={styles.modeTextInPerson}>In Person</Text>
      </View>
    );
  };

  const tableColumns = [
    { id: 'patient_name', label: 'Patient Name', width: 150 },
    { id: 'phone', label: 'Phone No', width: 125 },
    { id: 'patient_code', label: 'Patient Code', width: 120 },
    { id: 'date', label: 'Date', width: 115 },
    { id: 'time', label: 'Time', width: 100 },
    { id: 'mode', label: 'Consultation Mode', width: 145 },
    { id: 'doctor', label: 'Doctor Name', width: 155 },
    { id: 'clinic', label: 'Clinic', width: 150 },
    { id: 'specialization', label: 'Specialization', width: 135 },
    { id: 'status', label: 'Status', width: 115 },
    { id: 'reason', label: 'Reason', width: 145 },
    { id: 'notes', label: 'Notes', width: 145 },
    { id: 'duration', label: 'Duration', width: 105 },
    { id: 'share', label: 'Share', width: 105 },
  ];

  const renderAppointmentTableCell = (item: Appointment, columnId: string) => {
    const patientName = item.patient_name || (item as any).patient?.full_name || '-';
    const patientPhone = item.patient_phone || (item as any).patient?.phone || '-';
    const patientCode = (item as any).patient_code || (item as any).patient?.patient_code || (item.patient_id ? `PT-${String(item.patient_id).padStart(5, '0')}` : '-');
    const doctorNameRaw = item.doctor_name || (item as any).doctor?.full_name || '-';
    const doctorName = doctorNameRaw !== '-' && !String(doctorNameRaw).toLowerCase().startsWith('dr') ? `Dr ${doctorNameRaw}` : doctorNameRaw;
    const clinicName = item.clinic_name || (item as any).clinic?.name || '-';
    const specialization = item.doctor_specialization || (item as any).doctor?.specialization || '-';
    switch (columnId) {
      case 'patient_name':
        return <View style={styles.tablePatientCell}><View style={styles.tableAvatar}><PatientUserIcon size={15} color="#0d9488" /></View><Text style={styles.tablePatientText} numberOfLines={1}>{patientName}</Text></View>;
      case 'phone': return <Text style={styles.tableMutedText}>{patientPhone}</Text>;
      case 'patient_code': return <Text style={styles.tableCodeText}>{patientCode}</Text>;
      case 'date': return <Text style={styles.tableValueText}>{formatTableDate(item.appointment_date)}</Text>;
      case 'time': return <Text style={styles.tableValueText}>{item.appointment_time || item.time_slot || '-'}</Text>;
      case 'mode': return renderModeBadge(item.consultation_mode, item.type);
      case 'doctor': return <View><Text style={styles.tableValueText} numberOfLines={1}>{doctorName}</Text><Text style={styles.tableClinicSubText} numberOfLines={1}>{clinicName}</Text></View>;
      case 'clinic': return <Text style={styles.tableValueText} numberOfLines={2}>{clinicName}</Text>;
      case 'specialization': return <Text style={styles.tableMutedText} numberOfLines={1}>{specialization}</Text>;
      case 'status': return renderStatusBadge(item.status);
      case 'reason': return <Text style={styles.tableValueText} numberOfLines={2}>{item.reason || '-'}</Text>;
      case 'notes': return <Text style={styles.tableMutedText} numberOfLines={2}>{item.notes || '-'}</Text>;
      case 'duration': return <Text style={styles.tableValueText}>{(item as any).duration_minutes ? `${(item as any).duration_minutes} mins` : (item as any).duration || '-'}</Text>;
      case 'share': return <TouchableOpacity style={styles.tableShareBtn} onPress={() => handleShareAppointment(item)}><ShareLinkIcon size={12} color="#0d9488" /><Text style={styles.tableShareText}>Share</Text></TouchableOpacity>;
      default: return null;
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => setIsCardActive(false)}>
      <View style={styles.container} onTouchStart={dismissInlinePickerOnOutsideTap}>
        {/* ─── HEADER: HAMBURGER ON LEFT (NO LOGO), NOTIFICATION & AVATAR ON RIGHT ─── */}
        <PatientHeader
          showLogo={false}
          showRolePill={false}
          onOpenDrawer={onOpenDrawer}
          onOpenNotifications={onOpenNotifications}
        />

        <ScrollView
          nestedScrollEnabled
          disableScrollViewPanResponder
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleManualRefresh} colors={['#0d9488']} />
          }>
          {/* ─── TOP DARK PINE / TEAL HERO BANNER (MATCHING REFERENCE) ─── */}
          <View style={styles.heroBanner}>
            {/* Top Pill Badge */}
            <View style={styles.heroBadgePill}>
              <SparklesIcon size={12} color="#ffffff" />
              <Text style={styles.heroBadgeText}>APPOINTMENTS DESK</Text>
            </View>

            {/* Title Row with Stethoscope Icon Badge */}
            <View style={styles.heroTitleRow}>
              <View style={styles.heroIconBadge}>
                <StethoscopeIcon size={22} color="#ffffff" strokeWidth={2.2} />
              </View>
              <Text style={styles.heroTitle}>Appointments</Text>
            </View>

            {/* Subtitle */}
            <Text style={styles.heroSubtitle}>
              Search, track and manage all your clinic appointments in one place.
            </Text>

            {/* Quick Status Segment Capsule */}
            <View style={styles.wizardCapsule}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.wizardStepBtn, activeTabFilter === 'all' && styles.wizardStepBtnActive]}
                onPress={() => {
                  setActiveTabFilter('all');
                  setSelectedStatus('All Status');
                }}>
                <Text style={[styles.wizardStepText, activeTabFilter === 'all' && styles.wizardStepTextActive]}>
                  All ({appointments.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.wizardStepBtn, activeTabFilter === 'scheduled' && styles.wizardStepBtnActive]}
                onPress={() => {
                  setActiveTabFilter('scheduled');
                  setSelectedStatus('Scheduled');
                }}>
                <Text style={[styles.wizardStepText, activeTabFilter === 'scheduled' && styles.wizardStepTextActive]}>
                  Scheduled ({scheduledCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.wizardStepBtn, activeTabFilter === 'completed' && styles.wizardStepBtnActive]}
                onPress={() => {
                  setActiveTabFilter('completed');
                  setSelectedStatus('Complete');
                }}>
                <Text style={[styles.wizardStepText, activeTabFilter === 'completed' && styles.wizardStepTextActive]}>
                  Completed ({completedCount})
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── MAIN WHITE CARD: FILTERS & APPOINTMENTS ─── */}
          <View style={styles.mainCard}>
            {/* Header: Teal Circle + Title + Subtitle */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderIconCircle}>
                <CalendarIcon size={20} color="#ffffff" strokeWidth={2.2} />
              </View>
              <View style={styles.cardHeaderTextCol}>
                <Text style={styles.cardHeaderTitle}>Find care & appointments</Text>
                <Text style={styles.cardHeaderSubtitle}>Filter by clinic, doctor, status or date</Text>
              </View>
            </View>

            {/* Badges Row: Count Pill + Reset Filter Button */}
            <View style={styles.badgeAndActionRow}>
              <View style={styles.clinicsFoundBadge}>
                <Text style={styles.clinicsFoundText}>{filteredAppointments.length} appointments found</Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.filterResetBtn}
                onPress={handleResetFilters}>
                <FilterResetIcon size={14} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Filter Inputs Section */}
            <View style={styles.filtersSection}>
              {/* CLINIC */}
              <View ref={clinicFieldRef} collapsable={false} style={[styles.filterFieldGroup, styles.inlineFilterWrapper, showClinicPicker && styles.inlineFilterWrapperActive]}>
                <Text style={styles.filterFieldLabel}>CLINIC</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.filterSelectBox}
                  onPress={() => { setClinicSearch(''); setShowClinicPicker((open) => !open); setShowStatusPicker(false); setShowDoctorPicker(false); }}>
                  <Text style={styles.filterSelectBoxText} numberOfLines={1}>
                    {selectedClinic}
                  </Text>
                  <ChevronsUpDownIcon size={14} color="#94a3b8" />
                </TouchableOpacity>
                {showClinicPicker && (
                  <View ref={clinicMenuRef} collapsable={false} style={styles.inlineFilterMenu}>
                    <View style={styles.inlineFilterSearch}><Search size={15} color="#94a3b8" /><TextInput value={clinicSearch} onChangeText={setClinicSearch} placeholder="Search clinic..." placeholderTextColor="#94a3b8" style={styles.inlineFilterSearchInput} /></View>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" style={styles.inlineFilterOptions} contentContainerStyle={styles.inlineFilterOptionsContent}>
                      {visibleClinicOptions.map((clinic) => <TouchableOpacity key={clinic} style={[styles.inlineFilterOption, selectedClinic === clinic && styles.inlineFilterOptionActive]} onPress={() => { setSelectedClinic(clinic); setCurrentPage(1); setShowClinicPicker(false); }}><Text style={[styles.inlineFilterOptionText, selectedClinic === clinic && styles.inlineFilterOptionTextActive]}>{selectedClinic === clinic ? '✓  ' : '    '}{clinic}</Text></TouchableOpacity>)}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* STATUS */}
              <View ref={statusFieldRef} collapsable={false} style={[styles.filterFieldGroup, styles.inlineFilterWrapper, showStatusPicker && styles.inlineFilterWrapperActive]}>
                <Text style={styles.filterFieldLabel}>STATUS</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.filterSelectBox}
                  onPress={() => { setShowStatusPicker((open) => !open); setShowClinicPicker(false); setShowDoctorPicker(false); }}>
                  <Text style={styles.filterSelectBoxText} numberOfLines={1}>
                    {selectedStatus}
                  </Text>
                  <ChevronsUpDownIcon size={14} color="#94a3b8" />
                </TouchableOpacity>
                {showStatusPicker && (
                  <View ref={statusMenuRef} collapsable={false} style={styles.inlineFilterMenu}>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" style={styles.inlineFilterOptions} contentContainerStyle={styles.inlineFilterOptionsContent}>
                      {['All Status', 'Scheduled', 'In Progress', 'Complete', 'Cancel'].map((status) => <TouchableOpacity key={status} style={[styles.inlineFilterOption, selectedStatus === status && styles.inlineFilterOptionActive]} onPress={() => { setSelectedStatus(status); setCurrentPage(1); setShowStatusPicker(false); }}><Text style={[styles.inlineFilterOptionText, selectedStatus === status && styles.inlineFilterOptionTextActive]}>{selectedStatus === status ? '✓  ' : '    '}{status}</Text></TouchableOpacity>)}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* DOCTOR */}
              <View ref={doctorFieldRef} collapsable={false} style={[styles.filterFieldGroup, styles.inlineFilterWrapper, showDoctorPicker && styles.inlineFilterWrapperActive]}>
                <Text style={styles.filterFieldLabel}>DOCTOR</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.filterSelectBox}
                  onPress={() => { setDoctorSearch(''); setShowDoctorPicker((open) => !open); setShowClinicPicker(false); setShowStatusPicker(false); }}>
                  <Text style={styles.filterSelectBoxText} numberOfLines={1}>
                    {selectedDoctor}
                  </Text>
                  <ChevronsUpDownIcon size={14} color="#94a3b8" />
                </TouchableOpacity>
                {showDoctorPicker && (
                  <View ref={doctorMenuRef} collapsable={false} style={styles.inlineFilterMenu}>
                    <View style={styles.inlineFilterSearch}><Search size={15} color="#94a3b8" /><TextInput value={doctorSearch} onChangeText={setDoctorSearch} placeholder="Search doctor..." placeholderTextColor="#94a3b8" style={styles.inlineFilterSearchInput} /></View>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" style={styles.inlineFilterOptions} contentContainerStyle={styles.inlineFilterOptionsContent}>
                      {visibleDoctorOptions.map((doctor) => <TouchableOpacity key={doctor} style={[styles.inlineFilterOption, selectedDoctor === doctor && styles.inlineFilterOptionActive]} onPress={() => { setSelectedDoctor(doctor); setCurrentPage(1); setShowDoctorPicker(false); }}><Text style={[styles.inlineFilterOptionText, selectedDoctor === doctor && styles.inlineFilterOptionTextActive]}>{selectedDoctor === doctor ? '✓  ' : '    '}{doctor}</Text></TouchableOpacity>)}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* APPOINTMENT SEARCH */}
              <View style={styles.filterFieldGroup}>
                <Text style={styles.filterFieldLabel}>SEARCH</Text>
                <View style={styles.searchInputBox}>
                  <SearchInputIcon size={15} color="#94a3b8" />
                  <TextInput
                    style={styles.searchTextInput}
                    placeholder="Search by patient, doctor, reason.."
                    placeholderTextColor="#94a3b8"
                    value={searchQuery}
                    onChangeText={(t) => {
                      setSearchQuery(t);
                      setCurrentPage(1);
                    }}
                  />
                </View>
              </View>

              {/* DATE FILTER */}
              <View style={styles.filterFieldGroup}>
                <Text style={styles.filterFieldLabel}>DATE FILTER</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.filterSelectBox}
                  onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.filterSelectBoxText} numberOfLines={1}>
                    {dateFilter ? `Date: ${dateFilter}` : 'All Dates'}
                  </Text>
                  <CalendarIcon size={15} color="#0d9488" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Actions Row: Refresh + Columns */}
            <View style={styles.actionBtnsRow}>
              <TouchableOpacity
                style={styles.refreshMintBtn}
                activeOpacity={0.8}
                onPress={handleManualRefresh}>
                <RefreshCwIcon size={15} color="#0d9488" />
                <Text style={styles.refreshMintBtnText}>Refresh</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.columnsBtn}
                activeOpacity={0.8}
                onPress={(event) => { setColumnsAnchorY(event.nativeEvent.pageY); setShowColumnsModal(true); }}>
                <ColumnsIcon size={15} color="#0f172a" />
                <Text style={styles.columnsBtnText}>Columns</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.lastRefreshedLabel}>
              Last refreshed: {formatLastRefreshed(lastRefreshedDate)}
            </Text>

            {/* Divider */}
            <View style={styles.cardDivider} />

            {/* Section Header: Step Circle "1" + "Appointments List" + Count Badge */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionStepBadge}>
                <Text style={styles.sectionStepBadgeText}>1</Text>
              </View>
              <Text style={styles.sectionHeadingText}>Appointments list</Text>
              <View style={styles.countBadgePill}>
                <Text style={styles.countBadgePillText}>{filteredAppointments.length}</Text>
              </View>
            </View>

            {/* ─── APPOINTMENT CARDS LIST (MATCHING EXACT REFERENCE) ─── */}
            {loading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 36 }} />
            ) : filteredAppointments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <CalendarIcon size={30} color="#94a3b8" />
                </View>
                <Text style={styles.emptyTitle}>No Appointments Found</Text>
                <Text style={styles.emptySub}>Try adjusting your filters or search query.</Text>
              </View>
            ) : (
              <>
                <View style={styles.tableOuter}>
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View>
                      <View style={styles.tableHeaderRow}>
                        {tableColumns.filter((column) => selectedColumns.includes(column.id)).map((column) => (
                          <View key={column.id} style={[styles.tableColumnHeader, { width: column.width }]}>
                            <Text style={styles.tableHeaderText}>{column.label}</Text>
                          </View>
                        ))}
                      </View>
                      {visibleAppointments.map((item, index) => (
                        <TouchableOpacity
                          key={item.id ? `patient-table-${item.id}` : `patient-table-${index}`}
                          activeOpacity={0.85}
                          onPress={() => setSelectedRowId(item.id)}
                          style={[styles.tableDataRow, selectedRowId === item.id && styles.tableDataRowSelected]}>
                          {tableColumns.filter((column) => selectedColumns.includes(column.id)).map((column) => (
                            <View key={column.id} style={[styles.tableDataCell, { width: column.width }]}>
                              {renderAppointmentTableCell(item, column.id)}
                            </View>
                          ))}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                <View style={[styles.apptsListContainer, styles.hiddenAppointmentCards]}>
                {visibleAppointments.map((item, idx) => {
                  const rawDocName = item.doctor_name || (item as any).doctor?.full_name || (item as any).doctor?.name || '';
                  const docName = rawDocName ? (rawDocName.toLowerCase().startsWith('dr') ? rawDocName : `Dr ${rawDocName}`) : 'Doctor';
                  const clinicName = item.clinic_name || (item as any).clinic?.name || (item as any).clinic || 'Clinic';
                  const pName = item.patient_name || (item as any).patient?.full_name || (item as any).patient?.name || 'Patient';
                  const pPhone = item.patient_phone || (item as any).patient?.phone || '-';
                  const pCode = (item as any).patient_code || (item as any).patient?.patient_code || (item.patient_id ? `PT-${String(item.patient_id).padStart(5, '0')}` : '-');
                  const formattedDate = formatTableDate(item.appointment_date);
                  const formattedTime = item.appointment_time || item.time_slot || '10:00 AM';
                  const isRowSelected = selectedRowId === item.id;
                  const isVideo = String(item.consultation_mode || item.type || '').toLowerCase().includes('video');

                  return (
                    <TouchableOpacity
                      key={item.id ? `appt-${item.id}` : `appt-idx-${idx}`}
                      activeOpacity={0.88}
                      onPress={() => setSelectedRowId(item.id)}
                      style={[styles.apptItemCard, isRowSelected && styles.apptItemCardSelected]}>
                      {/* Left Building/Stethoscope Icon Box */}
                      <View style={styles.buildingIconBox}>
                        {isVideo ? (
                          <VideoCallIcon size={22} color="#7c3aed" />
                        ) : (
                          <BuildingClinicIcon size={22} color="#64748b" />
                        )}
                      </View>

                      {/* Right Info Column */}
                      <View style={styles.apptInfoCol}>
                        {/* Doctor Name + Verified Badge + Status */}
                        <View style={styles.docTitleRow}>
                          <Text style={styles.docTitleText} numberOfLines={1}>
                            {docName}
                          </Text>
                          <ClinicVerifiedIcon size={14} color="#0d9488" />
                          <View style={{ marginLeft: 'auto' }}>
                            {renderStatusBadge(item.status)}
                          </View>
                        </View>

                        {/* Location / Clinic Row */}
                        <View style={styles.clinicLocationRow}>
                          <MapPinIcon size={12} color="#64748b" />
                          <Text style={styles.clinicLocationText} numberOfLines={1}>
                            {clinicName}
                          </Text>
                        </View>

                        {/* Mode & Date/Time Row */}
                        <View style={styles.modeAndDateRow}>
                          {renderModeBadge(item.consultation_mode, item.type)}
                          <Text style={styles.dateTimeText}>
                            📅 {formattedDate} • {formattedTime}
                          </Text>
                        </View>

                        {/* Patient & Code */}
                        <View style={styles.patientInfoRow}>
                          <Text style={styles.patientCodeText} numberOfLines={1}>
                            👤 {pName} ({pCode}) • 📞 {pPhone}
                          </Text>
                        </View>

                        {/* Share Action Button */}
                        <View style={styles.cardActionsRow}>
                          <TouchableOpacity
                            style={styles.shareActionBtn}
                            activeOpacity={0.8}
                            onPress={() => handleShareAppointment(item)}>
                            <ShareLinkIcon size={12} color="#0d9488" />
                            <Text style={styles.shareActionBtnText}>Share Details</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                </View>
              </>
            )}

            {/* ─── PAGINATION: LOAD MORE (5 AT A TIME) ─── */}
            {filteredAppointments.length > 0 && (
              <View style={styles.paginationBox}>
                <Text style={styles.showingCountText}>
                  Showing {firstAppointmentIndex + 1} to {Math.min(firstAppointmentIndex + APPOINTMENTS_PER_PAGE, filteredAppointments.length)} of {filteredAppointments.length} appointments
                </Text>
                <View style={styles.paginationActionsRow}>
                  <TouchableOpacity
                    style={[styles.paginationNavBtn, currentPage === 1 && styles.paginationNavBtnDisabled]}
                    disabled={currentPage === 1}
                    onPress={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                    <ChevronLeft size={17} color={currentPage === 1 ? '#94a3b8' : '#0f766e'} />
                    <Text style={[styles.paginationNavText, currentPage === 1 && styles.paginationNavTextDisabled]}>Previous</Text>
                  </TouchableOpacity>
                  <Text style={styles.paginationPageText}>Page {currentPage} of {totalPages}</Text>
                  <TouchableOpacity
                    style={[styles.paginationNavBtn, currentPage === totalPages && styles.paginationNavBtnDisabled]}
                    disabled={currentPage === totalPages}
                    onPress={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
                    <Text style={[styles.paginationNavText, currentPage === totalPages && styles.paginationNavTextDisabled]}>Next</Text>
                    <ChevronRight size={17} color={currentPage === totalPages ? '#94a3b8' : '#0f766e'} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* ─── REUSABLE COLUMNS MODAL (EXACT 14 COLUMNS FROM REFERENCE) ─── */}
        <ColumnsModal
          visible={showColumnsModal}
          anchorY={columnsAnchorY}
          onClose={() => setShowColumnsModal(false)}
          columns={APPOINTMENT_COLUMNS}
          selectedIds={selectedColumns}
          onToggle={handleToggleColumn}
        />

        {/* ─── CLINIC PICKER BOTTOM SHEET ─── */}
        <Modal visible={false} transparent animationType="fade" onRequestClose={() => setShowClinicPicker(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => setShowClinicPicker(false)}>
              <View style={StyleSheet.absoluteFillObject} />
            </TouchableWithoutFeedback>
            <View style={styles.pickerSheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Select Clinic</Text>
                <TouchableOpacity onPress={() => setShowClinicPicker(false)}>
                  <Text style={styles.sheetClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 300 }}>
                {clinicOptions.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.pickerItem, selectedClinic === c && styles.pickerItemActive]}
                    onPress={() => {
                      setSelectedClinic(c);
                      setShowClinicPicker(false);
                      setCurrentPage(1);
                    }}>
                    <Text style={[styles.pickerItemText, selectedClinic === c && styles.pickerItemTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ─── STATUS PICKER BOTTOM SHEET ─── */}
        <Modal visible={false} transparent animationType="fade" onRequestClose={() => setShowStatusPicker(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => setShowStatusPicker(false)}>
              <View style={StyleSheet.absoluteFillObject} />
            </TouchableWithoutFeedback>
            <View style={styles.pickerSheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Select Status</Text>
                <TouchableOpacity onPress={() => setShowStatusPicker(false)}>
                  <Text style={styles.sheetClose}>✕</Text>
                </TouchableOpacity>
              </View>
              {['All Status', 'Scheduled', 'In Progress', 'Complete', 'Cancel'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pickerItem, selectedStatus === s && styles.pickerItemActive]}
                  onPress={() => {
                    setSelectedStatus(s);
                    setShowStatusPicker(false);
                    setCurrentPage(1);
                  }}>
                  <Text style={[styles.pickerItemText, selectedStatus === s && styles.pickerItemTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* ─── DOCTOR PICKER BOTTOM SHEET ─── */}
        <Modal visible={false} transparent animationType="fade" onRequestClose={() => setShowDoctorPicker(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => setShowDoctorPicker(false)}>
              <View style={StyleSheet.absoluteFillObject} />
            </TouchableWithoutFeedback>
            <View style={styles.pickerSheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Select Doctor</Text>
                <TouchableOpacity onPress={() => setShowDoctorPicker(false)}>
                  <Text style={styles.sheetClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 300 }}>
                {doctorOptions.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.pickerItem, selectedDoctor === d && styles.pickerItemActive]}
                    onPress={() => {
                      setSelectedDoctor(d);
                      setShowDoctorPicker(false);
                      setCurrentPage(1);
                    }}>
                    <Text style={[styles.pickerItemText, selectedDoctor === d && styles.pickerItemTextActive]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ─── DATE FILTER MODAL ─── */}
        <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
              <View style={StyleSheet.absoluteFillObject} />
            </TouchableWithoutFeedback>
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>Filter by Date</Text>
              <Text style={styles.dialogSub}>Enter appointment date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.dialogInput}
                placeholder="e.g. 2026-09-08"
                placeholderTextColor="#94a3b8"
                value={dateFilter}
                onChangeText={setDateFilter}
              />
              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={styles.dialogClearBtn}
                  onPress={() => {
                    setDateFilter('');
                    setShowDatePicker(false);
                    setCurrentPage(1);
                  }}>
                  <Text style={styles.dialogClearBtnText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dialogApplyBtn}
                  onPress={() => {
                    setShowDatePicker(false);
                    setCurrentPage(1);
                  }}>
                  <Text style={styles.dialogApplyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 110,
  },

  /* ─── Hero Banner ─── */
  heroBanner: {
    backgroundColor: '#074c50',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#074c50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  heroBadgePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 14,
  },
  heroBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  heroIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.82)',
    marginBottom: 18,
  },

  /* Quick Status Segment Capsule */
  wizardCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 28,
    padding: 4,
  },
  wizardStepBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 24,
  },
  wizardStepBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  wizardStepText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  wizardStepTextActive: {
    color: '#074c50',
    fontWeight: '800',
  },

  /* ─── Main White Card ─── */
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  mainCardActive: {
    borderColor: '#0d9488',
    borderWidth: 1.5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cardHeaderIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0d766e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTextCol: {
    flex: 1,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardHeaderSubtitle: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 1,
  },

  /* Badges Row */
  badgeAndActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  clinicsFoundBadge: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  clinicsFoundText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  filterResetBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Filters Section */
  filtersSection: {
    gap: 10,
  },
  filterFieldGroup: {
    gap: 4,
  },
  inlineFilterWrapper: { position: 'relative', zIndex: 2 },
  inlineFilterWrapperActive: { zIndex: 40, elevation: 30 },
  inlineFilterMenu: { position: 'absolute', top: 67, left: 0, right: 0, height: 262, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe4eb', borderRadius: 10, paddingVertical: 4, zIndex: 60, shadowColor: '#334155', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 25 },
  inlineFilterSearch: { height: 39, marginHorizontal: 7, marginTop: 4, marginBottom: 5, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#ffffff' },
  inlineFilterSearchInput: { flex: 1, height: '100%', color: '#334155', fontSize: 12.5, paddingVertical: 0 },
  inlineFilterOptions: { height: 205, flexGrow: 0 },
  inlineFilterOptionsContent: { paddingBottom: 4 },
  inlineFilterOption: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 12, marginHorizontal: 3, borderRadius: 7 },
  inlineFilterOptionActive: { backgroundColor: '#dff7f4' },
  inlineFilterOptionText: { color: '#334155', fontSize: 13, fontWeight: '500' },
  inlineFilterOptionTextActive: { color: '#0d9488', fontWeight: '700' },
  filterFieldLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0d9488',
    letterSpacing: 0.5,
  },
  filterSelectBox: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterSelectBoxText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
    marginRight: 6,
  },
  searchInputBox: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
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

  /* Action Buttons */
  actionBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  refreshMintBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ccfbf1',
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  refreshMintBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0d9488',
  },
  columnsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  columnsBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  lastRefreshedLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'left',
  },

  /* Divider */
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },

  /* Section Title */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionStepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sectionStepBadgeText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0d9488',
  },
  sectionHeadingText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  countBadgePill: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },

  /* Appointments Cards List */
  apptsListContainer: {
    gap: 10,
  },
  apptItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 13,
    gap: 12,
  },
  apptItemCardSelected: {
    borderColor: '#0d9488',
    backgroundColor: '#f0fdfa',
    borderWidth: 1.6,
  },
  buildingIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  apptInfoCol: {
    flex: 1,
    gap: 4,
  },
  docTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  docTitleText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
    maxWidth: '55%',
  },
  clinicLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clinicLocationText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  modeAndDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 3,
  },
  dateTimeText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  patientCodeText: {
    fontSize: 11.5,
    color: '#64748b',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 6,
  },
  shareActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  shareActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0d9488',
  },

  /* Mode Pills */
  modePillInPerson: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  modeTextInPerson: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f766e',
  },
  modePillVideo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  modeTextVideo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },

  /* Status Pills */
  statusPillComplete: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusTextComplete: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  statusPillCancel: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusTextCancel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
  statusPillScheduled: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusTextScheduled: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  statusPillInProgress: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fef08a',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusTextInProgress: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ca8a04',
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },

  /* Pagination */
  paginationBox: {
    alignItems: 'center',
    paddingTop: 18,
    gap: 10,
  },
  showingCountText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  tableOuter: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingVertical: 12, paddingHorizontal: 8 },
  tableColumnHeader: { paddingHorizontal: 6, justifyContent: 'center' },
  tableHeaderText: { fontSize: 12.5, color: '#334155', fontWeight: '700' },
  tableDataRow: { flexDirection: 'row', minHeight: 92, paddingVertical: 13, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#ffffff', alignItems: 'center' },
  tableDataRowSelected: { backgroundColor: '#f0fdfa', borderBottomColor: '#99f6e4' },
  tableDataCell: { paddingHorizontal: 6, justifyContent: 'center' },
  tablePatientCell: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tableAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#e6fffa', alignItems: 'center', justifyContent: 'center' },
  tablePatientText: { flex: 1, fontSize: 13, color: '#0f172a', fontWeight: '700' },
  tableValueText: { fontSize: 12.5, color: '#0f172a', fontWeight: '600' },
  tableMutedText: { fontSize: 12.5, color: '#64748b', fontWeight: '500' },
  tableCodeText: { fontSize: 12, color: '#0d9488', fontWeight: '700' },
  tableClinicSubText: { fontSize: 11, color: '#64748b', marginTop: 3 },
  tableShareBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  tableShareText: { color: '#0d9488', fontSize: 11, fontWeight: '700' },
  hiddenAppointmentCards: { display: 'none' },
  paginationActionsRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  paginationNavBtn: { minWidth: 94, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#99f6e4', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9 },
  paginationNavBtnDisabled: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  paginationNavText: { fontSize: 12, color: '#0f766e', fontWeight: '700' },
  paginationNavTextDisabled: { color: '#94a3b8' },
  paginationPageText: { flex: 1, fontSize: 11.5, color: '#64748b', fontWeight: '600', textAlign: 'center' },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d9488',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 22,
    gap: 8,
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  loadMoreBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
  },

  /* Bottom Sheets & Dialogs */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
    zIndex: 99999,
    elevation: 99999,
  },
  pickerSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 38 : 28,
    maxHeight: '60%',
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    zIndex: 100000,
    elevation: 100000,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  sheetClose: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'bold',
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  pickerItemActive: {
    backgroundColor: '#f0fdf4',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  pickerItemTextActive: {
    color: '#0d9488',
    fontWeight: '800',
  },
  dialogCard: {
    margin: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 380,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  dialogSub: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 14,
  },
  dialogInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  dialogClearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dialogClearBtnText: {
    color: '#64748b',
    fontWeight: '700',
  },
  dialogApplyBtn: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dialogApplyBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

export default AppointmentsScreen;
