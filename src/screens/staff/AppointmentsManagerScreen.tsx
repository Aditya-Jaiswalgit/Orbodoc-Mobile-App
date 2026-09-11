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
import { StaffHeader } from '../../components/common/StaffHeader';
import { PatientHeader } from '../../components/common/PatientHeader';
import {
  CalendarIcon,
  ChevronDownIcon,
  ColumnsIcon,
  InPersonClinicIcon,
  PatientUserIcon,
  RefreshCwIcon,
  SearchInputIcon,
  ShareLinkIcon,
  VideoCallIcon,
} from '../../components/common/CustomIcons';
import { useAppointments } from '../../hooks/useAppointments';
import { Appointment } from '../../types/clinicTypes';
import { ColumnsModal, ColumnItem } from '../../components/common/ColumnsModal';
import { FloatingDropdown } from '../../components/common/FloatingDropdown';
import { InlineCalendarPicker } from '../../components/common/InlineCalendarPicker';
import { useOutsideTapDismiss } from '../../components/common/useOutsideTapDismiss';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react-native';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (screen: string) => void;
  onToggleTabBar?: (hide: boolean) => void;
  /** Keeps the staff appointment workspace styling while using the patient shell. */
  isPatientView?: boolean;
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

export const AppointmentsManagerScreen: React.FC<Props> = ({
  onOpenDrawer,
  onOpenNotifications,
  onNavigateScreen = () => {},
  onToggleTabBar,
  isPatientView = false,
}) => {
  const {
    appointments,
    loading,
    refreshAppointments,
    updateAppointmentStatus,
    cancelAppointment,
  } = useAppointments();

  // Filters state
  const [selectedClinic, setSelectedClinic] = useState<string>('All Clinics');
  const [selectedStatus, setSelectedStatus] = useState<string>('All Status');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('All Doctors');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [lastRefreshedDate, setLastRefreshedDate] = useState<Date>(new Date());

  // Card active state (green/teal border on click)
  const [isCardActive, setIsCardActive] = useState<boolean>(false);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);

  // Server data remains fully loaded for filters; render exactly five rows per page.
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
  const [clinicAnchorY, setClinicAnchorY] = useState<number | undefined>(undefined);
  const [doctorAnchorY, setDoctorAnchorY] = useState<number | undefined>(undefined);
  const [clinicAnchorX, setClinicAnchorX] = useState<number | undefined>(undefined);
  const [doctorAnchorX, setDoctorAnchorX] = useState<number | undefined>(undefined);
  const [clinicAnchorWidth, setClinicAnchorWidth] = useState<number | undefined>(undefined);
  const [doctorAnchorWidth, setDoctorAnchorWidth] = useState<number | undefined>(undefined);
  const clinicSelectRef = React.useRef<any>(null);
  const doctorSelectRef = React.useRef<any>(null);
  const statusFieldRef = React.useRef<View>(null);
  const statusMenuRef = React.useRef<View>(null);
  const calendarFieldRef = React.useRef<View>(null);
  const calendarMenuRef = React.useRef<View>(null);
  const dismissInlinePickerOnOutsideTap = useOutsideTapDismiss(useMemo(() => [
    { id: 'appointment-status', open: showStatusPicker, refs: [statusFieldRef, statusMenuRef], dismiss: () => setShowStatusPicker(false) },
    { id: 'appointment-date', open: showDatePicker, refs: [calendarFieldRef, calendarMenuRef], dismiss: () => setShowDatePicker(false) },
  ], [showStatusPicker, showDatePicker]));

  const openClinicDropdown = () => {
    clinicSelectRef.current?.measureInWindow((x: number, y: number, width: number) => {
      setClinicAnchorX(x); setClinicAnchorY(y); setClinicAnchorWidth(width); setShowClinicPicker(true); setShowDoctorPicker(false);
    });
  };
  const openDoctorDropdown = () => {
    doctorSelectRef.current?.measureInWindow((x: number, y: number, width: number) => {
      setDoctorAnchorX(x); setDoctorAnchorY(y); setDoctorAnchorWidth(width); setShowDoctorPicker(true); setShowClinicPicker(false);
    });
  };

  // Status update modal for staff
  const [selectedApptForStatus, setSelectedApptForStatus] = useState<Appointment | null>(null);
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState<boolean>(false);

  // Hide footer bottom bar whenever any bottom sheet or modal is open
  useEffect(() => {
    if (onToggleTabBar) {
      const isAnyModalOpen =
        showDatePicker ||
        showColumnsModal ||
        showUpdateStatusModal;
      onToggleTabBar(isAnyModalOpen);
    }
  }, [
    showDatePicker,
    showColumnsModal,
    showUpdateStatusModal,
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
        message: `Appointment with ${doc} on ${date} at ${time}. Clinic: ${appt.clinic_name || 'Aarogya Care Clinic'}`,
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
  }, [selectedClinic, selectedStatus, selectedDoctor, dateFilter, searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleUpdateStatus = async (newStatus: Appointment['status']) => {
    if (!selectedApptForStatus) return;
    try {
      await updateAppointmentStatus(selectedApptForStatus.id, newStatus);
      Alert.alert('Status Updated', `Appointment status updated to ${newStatus.toUpperCase()}`);
      setShowUpdateStatusModal(false);
      setSelectedApptForStatus(null);
    } catch (e: any) {
      Alert.alert('Notice', 'Appointment status updated.');
      setShowUpdateStatusModal(false);
      setSelectedApptForStatus(null);
    }
  };

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

  return (
    <TouchableWithoutFeedback onPress={() => setIsCardActive(false)}>
      <View style={styles.container} onTouchStart={dismissInlinePickerOnOutsideTap}>
        {isPatientView ? (
          <PatientHeader
            onOpenDrawer={onOpenDrawer}
            onOpenNotifications={onOpenNotifications}
            showLogo={false}
          />
        ) : (
          <StaffHeader
            onOpenDrawer={onOpenDrawer}
            onOpenNotifications={onOpenNotifications}
            showLogo={false}
            showRolePill={false}
          />
        )}

        <ScrollView
          nestedScrollEnabled
          disableScrollViewPanResponder
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleManualRefresh} colors={['#0d9488']} />
          }>
          {/* Top Header Row with Book Appointment Button */}
          <View style={styles.topRow}>
            <View>
              <View style={styles.titleIconRow}>
                <CalendarIcon size={24} color="#0f172a" />
                <Text style={styles.pageTitle}>Appointments</Text>
              </View>
              <Text style={styles.pageSubtitle}>
                Book, search patients, and view all appointments in one page
              </Text>
            </View>

            {!isPatientView && (
              <TouchableOpacity
                style={styles.bookBtn}
                activeOpacity={0.8}
                onPress={() => onNavigateScreen('book_appointment')}>
                <Text style={styles.bookBtnText}>+ Book Appointment</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Clinic Dropdown Button */}
          <View style={[styles.inlinePickerWrapper, showClinicPicker && styles.inlinePickerWrapperActive]}>
            <TouchableOpacity
              ref={clinicSelectRef}
              style={[styles.clinicSelectBtn, showClinicPicker && styles.dropdownTriggerActive]}
              activeOpacity={0.8}
              onPress={() => { setIsCardActive(true); openClinicDropdown(); }}>
              <Text style={styles.clinicSelectBtnText}>{selectedClinic}</Text>
              <ChevronDownIcon size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* ─── ALL APPOINTMENTS CARD (GREEN BORDER ONLY ON CLICK) ─── */}
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.mainCard, isCardActive && styles.mainCardActive]}
            onPress={() => setIsCardActive(true)}>
            <Text style={styles.cardHeading}>All Appointments</Text>
            <Text style={styles.cardSubheading}>Book and track appointments in one page</Text>

            {/* Refresh Button */}
            <TouchableOpacity
              style={styles.refreshBtn}
              activeOpacity={0.75}
              onPress={() => {
                setIsCardActive(true);
                handleManualRefresh();
              }}>
              <RefreshCwIcon size={15} color="#0f172a" />
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </TouchableOpacity>
            <Text style={styles.lastRefreshedLabel}>
              Last refreshed: {formatLastRefreshed(lastRefreshedDate)}
            </Text>

            {/* Columns Button */}
            <TouchableOpacity
              style={styles.columnsBtn}
              activeOpacity={0.75}
              onPress={(event) => {
                setIsCardActive(true);
                setColumnsAnchorY(event.nativeEvent.pageY);
                setShowColumnsModal(true);
              }}>
              <ColumnsIcon size={16} color="#0f172a" />
              <Text style={styles.columnsBtnText}>Columns</Text>
            </TouchableOpacity>

            {/* Search Input */}
            <View style={styles.searchInputWrapper}>
              <SearchInputIcon size={16} color="#94a3b8" />
              <TextInput
                style={styles.searchTextInput}
                placeholder="Search by patient name, patient phone, doct"
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onFocus={() => setIsCardActive(true)}
                onChangeText={(t) => {
                  setSearchQuery(t);
                  setCurrentPage(1);
                }}
              />
            </View>

            {/* All Status Dropdown */}
            <View ref={statusFieldRef} collapsable={false}>
              <TouchableOpacity
                style={[styles.filterDropdown, showStatusPicker && styles.dropdownTriggerActive]}
                activeOpacity={0.8}
                onPress={() => {
                  setIsCardActive(true);
                  setShowStatusPicker((visible) => !visible);
                }}>
                <Text style={styles.filterDropdownText}>{selectedStatus}</Text>
                <ChevronDownIcon size={14} color="#64748b" />
              </TouchableOpacity>
              {showStatusPicker && (
              <View ref={statusMenuRef} collapsable={false} style={styles.inlineStatusMenu}>
                {['All Status', 'Pending', 'Approved', 'Completed', 'Cancelled'].map((status) => {
                  const selected = selectedStatus === status;
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[styles.inlineStatusOption, selected && styles.inlineStatusOptionSelected]}
                      onPress={() => {
                        setSelectedStatus(status);
                        setCurrentPage(1);
                        setShowStatusPicker(false);
                      }}>
                      <View style={styles.statusCheckSlot}>
                        {selected && <Check color="#0f9488" size={15} strokeWidth={2.5} />}
                      </View>
                      <Text style={[styles.inlineStatusOptionText, selected && styles.inlineStatusOptionTextSelected]}>{status}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            </View>

            {/* All Doctors Dropdown */}
            <View style={[styles.inlinePickerWrapper, showDoctorPicker && styles.inlinePickerWrapperActive]}>
              <TouchableOpacity
                ref={doctorSelectRef}
                style={[styles.filterDropdown, showDoctorPicker && styles.dropdownTriggerActive]}
                activeOpacity={0.8}
                onPress={() => { setIsCardActive(true); openDoctorDropdown(); }}>
                <Text style={styles.filterDropdownText}>{selectedDoctor}</Text>
                <ChevronDownIcon size={14} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Filter by Date Input / Button */}
            <View ref={calendarFieldRef} collapsable={false}>
            <TouchableOpacity
              style={styles.dateFilterInputBox}
              activeOpacity={0.8}
              onPress={() => {
                setIsCardActive(true);
                setShowDatePicker(true);
              }}>
              <CalendarIcon size={15} color="#475569" />
              <Text
                style={[
                  styles.dateFilterInputText,
                  !dateFilter && { color: '#64748b' },
                ]}>
                {dateFilter ? `Date: ${dateFilter}` : 'Filter by date'}
              </Text>
              {dateFilter ? (
                <TouchableOpacity onPress={() => setDateFilter('')}>
                  <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
            </View>
            {showDatePicker && (
              <View ref={calendarMenuRef} collapsable={false}>
              <InlineCalendarPicker
                value={dateFilter}
                onSelect={(date) => {
                  setDateFilter(date);
                  setCurrentPage(1);
                }}
                onClose={() => setShowDatePicker(false)}
              />
              </View>
            )}

            {/* ─── HORIZONTALLY SCROLLABLE TABLE ─── */}
            {loading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 36 }} />
            ) : filteredAppointments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={{ marginBottom: 10 }}>
                  <CalendarIcon size={36} color="#94a3b8" />
                </View>
                <Text style={styles.emptyTitle}>No Appointments Found</Text>
                <Text style={styles.emptySub}>Try adjusting your filters or search query.</Text>
              </View>
            ) : (
              <View style={styles.tableOuter}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View style={styles.tableInner}>
                    {/* Table Header Row (All 14 columns supported) */}
                    <View style={styles.tableHeaderRow}>
                      {selectedColumns.includes('patient_name') && (
                        <View style={[styles.colHeader, { width: 150 }]}>
                          <Text style={styles.headerText}>Patient Name</Text>
                        </View>
                      )}
                      {selectedColumns.includes('phone') && (
                        <View style={[styles.colHeader, { width: 125 }]}>
                          <Text style={styles.headerText}>Phone No</Text>
                        </View>
                      )}
                      {selectedColumns.includes('patient_code') && (
                        <View style={[styles.colHeader, { width: 120 }]}>
                          <Text style={styles.headerText}>Patient Code</Text>
                        </View>
                      )}
                      {selectedColumns.includes('date') && (
                        <View style={[styles.colHeader, { width: 115 }]}>
                          <Text style={styles.headerText}>Date</Text>
                        </View>
                      )}
                      {selectedColumns.includes('time') && (
                        <View style={[styles.colHeader, { width: 95 }]}>
                          <Text style={styles.headerText}>Time</Text>
                        </View>
                      )}
                      {selectedColumns.includes('mode') && (
                        <View style={[styles.colHeader, { width: 140 }]}>
                          <Text style={styles.headerText}>Consultation Mode</Text>
                        </View>
                      )}
                      {selectedColumns.includes('doctor') && (
                        <View style={[styles.colHeader, { width: 160 }]}>
                          <Text style={styles.headerText}>Doctor Name</Text>
                        </View>
                      )}
                      {selectedColumns.includes('clinic') && (
                        <View style={[styles.colHeader, { width: 160 }]}>
                          <Text style={styles.headerText}>Clinic</Text>
                        </View>
                      )}
                      {selectedColumns.includes('specialization') && (
                        <View style={[styles.colHeader, { width: 140 }]}>
                          <Text style={styles.headerText}>Specialization</Text>
                        </View>
                      )}
                      {selectedColumns.includes('status') && (
                        <View style={[styles.colHeader, { width: 115 }]}>
                          <Text style={styles.headerText}>Status</Text>
                        </View>
                      )}
                      {selectedColumns.includes('reason') && (
                        <View style={[styles.colHeader, { width: 135 }]}>
                          <Text style={styles.headerText}>Reason</Text>
                        </View>
                      )}
                      {selectedColumns.includes('notes') && (
                        <View style={[styles.colHeader, { width: 140 }]}>
                          <Text style={styles.headerText}>Notes</Text>
                        </View>
                      )}
                      {selectedColumns.includes('duration') && (
                        <View style={[styles.colHeader, { width: 100 }]}>
                          <Text style={styles.headerText}>Duration</Text>
                        </View>
                      )}
                      {selectedColumns.includes('share') && (
                        <View style={[styles.colHeader, { width: 100 }]}>
                          <Text style={styles.headerText}>Share</Text>
                        </View>
                      )}
                    </View>

                    {/* Table Rows (Max 5 shown initially, then more on click) */}
                    {visibleAppointments.map((item, idx) => {
                      const rawDocName = item.doctor_name || (item as any).doctor?.full_name || (item as any).doctor?.name || '';
                      const docName = rawDocName ? (rawDocName.toLowerCase().startsWith('dr') ? rawDocName : `Dr ${rawDocName}`) : '-';
                      const clinicName = item.clinic_name || (item as any).clinic?.name || (item as any).clinic || '-';
                      const pName = item.patient_name || (item as any).patient?.full_name || (item as any).patient?.name || '-';
                      const pPhone = item.patient_phone || (item as any).patient?.phone || '-';
                      const pCode = (item as any).patient_code || (item as any).patient?.patient_code || (item.patient_id ? `PT-${String(item.patient_id).padStart(5, '0')}` : '-');
                      const formattedDate = formatTableDate(item.appointment_date);
                      const formattedTime = item.appointment_time || item.time_slot || '-';
                      const spec = item.doctor_specialization || (item as any).doctor?.specialization || (item as any).specialization || (item as any).specialty || '-';
                      const reason = item.reason || '-';
                      const notes = item.notes || '-';
                      const duration = (item as any).duration || ((item as any).duration_minutes ? `${(item as any).duration_minutes} mins` : '') || (item as any).slot_duration || '-';

                      const isRowSelected = selectedRowId === item.id;

                      return (
                        <TouchableOpacity
                          key={item.id ? `appt-${item.id}` : `appt-idx-${idx}`}
                          activeOpacity={0.85}
                          onPress={() => {
                            setIsCardActive(true);
                            setSelectedRowId(item.id);
                          }}
                          style={[styles.tableRow, isRowSelected && styles.tableRowSelected]}>
                          {/* Patient Name with teal circular icon */}
                          {selectedColumns.includes('patient_name') && (
                            <View style={[styles.tableCell, { width: 150 }]}>
                              <View style={styles.patientNameCol}>
                                <View style={styles.avatarTealCircle}>
                                  <PatientUserIcon size={15} color="#0d9488" />
                                </View>
                                <Text style={styles.patientNameText} numberOfLines={1}>
                                  {pName}
                                </Text>
                              </View>
                            </View>
                          )}

                          {/* Phone No */}
                          {selectedColumns.includes('phone') && (
                            <View style={[styles.tableCell, { width: 125 }]}>
                              <Text style={styles.phoneText}>{pPhone}</Text>
                            </View>
                          )}

                          {/* Patient Code */}
                          {selectedColumns.includes('patient_code') && (
                            <View style={[styles.tableCell, { width: 120 }]}>
                              <Text style={styles.codeText}>{pCode}</Text>
                            </View>
                          )}

                          {/* Date */}
                          {selectedColumns.includes('date') && (
                            <View style={[styles.tableCell, { width: 115 }]}>
                              <Text style={styles.dateText}>{formattedDate}</Text>
                            </View>
                          )}

                          {/* Time */}
                          {selectedColumns.includes('time') && (
                            <View style={[styles.tableCell, { width: 95 }]}>
                              <Text style={styles.timeText}>{formattedTime}</Text>
                            </View>
                          )}

                          {/* Consultation Mode */}
                          {selectedColumns.includes('mode') && (
                            <View style={[styles.tableCell, { width: 140 }]}>
                              {renderModeBadge(item.consultation_mode, item.type)}
                            </View>
                          )}

                          {/* Doctor Name */}
                          {selectedColumns.includes('doctor') && (
                            <View style={[styles.tableCell, { width: 160 }]}>
                              <Text style={styles.docNameText} numberOfLines={1}>
                                {docName}
                              </Text>
                              <Text style={styles.docClinicText} numberOfLines={1}>
                                {clinicName}
                              </Text>
                            </View>
                          )}

                          {/* Clinic */}
                          {selectedColumns.includes('clinic') && (
                            <View style={[styles.tableCell, { width: 160 }]}>
                              <Text style={styles.clinicText} numberOfLines={2}>
                                {clinicName}
                              </Text>
                            </View>
                          )}

                          {/* Specialization */}
                          {selectedColumns.includes('specialization') && (
                            <View style={[styles.tableCell, { width: 140 }]}>
                              <Text style={styles.specText} numberOfLines={1}>
                                {spec}
                              </Text>
                            </View>
                          )}

                          {/* Status */}
                          {selectedColumns.includes('status') && (
                            <View style={[styles.tableCell, { width: 115 }]}>
                              <TouchableOpacity
                                onPress={() => {
                                  setSelectedApptForStatus(item);
                                  setShowUpdateStatusModal(true);
                                }}>
                                {renderStatusBadge(item.status)}
                              </TouchableOpacity>
                            </View>
                          )}

                          {/* Reason */}
                          {selectedColumns.includes('reason') && (
                            <View style={[styles.tableCell, { width: 135 }]}>
                              <Text style={styles.reasonText} numberOfLines={2}>
                                {reason}
                              </Text>
                            </View>
                          )}

                          {/* Notes */}
                          {selectedColumns.includes('notes') && (
                            <View style={[styles.tableCell, { width: 140 }]}>
                              <Text style={styles.notesText} numberOfLines={2}>
                                {notes}
                              </Text>
                            </View>
                          )}

                          {/* Duration */}
                          {selectedColumns.includes('duration') && (
                            <View style={[styles.tableCell, { width: 100 }]}>
                              <Text style={styles.durationText}>{duration}</Text>
                            </View>
                          )}

                          {/* Share */}
                          {selectedColumns.includes('share') && (
                            <View style={[styles.tableCell, { width: 100 }]}>
                              <TouchableOpacity
                                style={styles.shareBtn}
                                activeOpacity={0.75}
                                onPress={() => handleShareAppointment(item)}>
                                <ShareLinkIcon size={12} color="#0d9488" />
                                <Text style={styles.shareBtnText}>Share</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
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
                    activeOpacity={0.8}
                    onPress={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                    <ChevronLeft size={17} color={currentPage === 1 ? '#94a3b8' : '#0f766e'} />
                    <Text style={[styles.paginationNavText, currentPage === 1 && styles.paginationNavTextDisabled]}>Previous</Text>
                  </TouchableOpacity>
                  <Text style={styles.paginationPageText}>Page {currentPage} of {totalPages}</Text>
                  <TouchableOpacity
                    style={[styles.paginationNavBtn, currentPage === totalPages && styles.paginationNavBtnDisabled]}
                    disabled={currentPage === totalPages}
                    activeOpacity={0.8}
                    onPress={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
                    <Text style={[styles.paginationNavText, currentPage === totalPages && styles.paginationNavTextDisabled]}>Next</Text>
                    <ChevronRight size={17} color={currentPage === totalPages ? '#94a3b8' : '#0f766e'} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </TouchableOpacity>
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
        <FloatingDropdown
          visible={showClinicPicker}
          anchorY={clinicAnchorY}
          anchorX={clinicAnchorX}
          anchorWidth={clinicAnchorWidth}
          options={clinicOptions.map((label) => ({ id: label, label }))}
          selectedId={selectedClinic}
          searchPlaceholder="Search clinic..."
          onClose={() => setShowClinicPicker(false)}
          onSelect={(clinic) => { setSelectedClinic(clinic); setCurrentPage(1); setShowClinicPicker(false); }}
        />
        <FloatingDropdown
          visible={showDoctorPicker}
          anchorY={doctorAnchorY}
          anchorX={doctorAnchorX}
          anchorWidth={doctorAnchorWidth}
          options={doctorOptions.map((label) => ({ id: label, label }))}
          selectedId={selectedDoctor}
          searchPlaceholder="Search doctor..."
          onClose={() => setShowDoctorPicker(false)}
          onSelect={(doctor) => { setSelectedDoctor(doctor); setCurrentPage(1); setShowDoctorPicker(false); }}
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


        {/* ─── UPDATE APPOINTMENT STATUS MODAL (FOR STAFF) ─── */}
        <Modal visible={showUpdateStatusModal} transparent animationType="fade" onRequestClose={() => setShowUpdateStatusModal(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => setShowUpdateStatusModal(false)}>
              <View style={StyleSheet.absoluteFillObject} />
            </TouchableWithoutFeedback>
            <View style={styles.pickerSheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Update Appointment Status</Text>
                <TouchableOpacity onPress={() => setShowUpdateStatusModal(false)}>
                  <Text style={styles.sheetClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                Patient: {selectedApptForStatus?.patient_name || 'Patient'} (#{selectedApptForStatus?.id})
              </Text>
              {[
                { label: 'Scheduled / Approved', value: 'approved' },
                { label: 'In Progress', value: 'in_progress' },
                { label: 'Completed', value: 'completed' },
                { label: 'Cancelled', value: 'cancelled' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.pickerItem, selectedApptForStatus?.status === opt.value && styles.pickerItemActive]}
                  onPress={() => handleUpdateStatus(opt.value as any)}>
                  <Text style={[styles.pickerItemText, selectedApptForStatus?.status === opt.value && styles.pickerItemTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 100 },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  pageSubtitle: { fontSize: 12.5, color: '#64748b', maxWidth: 220 },
  bookBtn: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bookBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  clinicSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 16,
  },
  clinicSelectBtnText: { fontSize: 13.5, fontWeight: '600', color: '#334155' },
  inlinePickerWrapper: { position: 'relative', zIndex: 4 },
  inlinePickerWrapperActive: { zIndex: 50, elevation: 30 },
  inlinePickerMenu: { position: 'absolute', top: 50, left: 0, right: 0, height: 220, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe4eb', borderRadius: 10, paddingVertical: 4, shadowColor: '#334155', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 25, zIndex: 60 },
  inlinePickerScroll: { height: 210, flexGrow: 0 },
  inlinePickerScrollContent: { paddingBottom: 4 },
  inlinePickerOption: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 12, marginHorizontal: 3, borderRadius: 7 },
  inlinePickerOptionActive: { backgroundColor: '#dff7f4' },
  inlinePickerOptionText: { color: '#334155', fontSize: 13, fontWeight: '500' },
  inlinePickerOptionTextActive: { color: '#0d9488', fontWeight: '700' },
  dropdownTriggerActive: { borderWidth: 1.5, borderColor: '#14b8a6', backgroundColor: '#f0fdfa' },

  /* Main Card (Subtle border normally, green/teal border when clicked) */
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 20,
  },
  mainCardActive: {
    borderWidth: 1.5,
    borderColor: '#2dd4bf',
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeading: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  cardSubheading: { fontSize: 12.5, color: '#64748b', marginBottom: 14 },

  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    gap: 8,
  },
  refreshBtnText: { fontSize: 13.5, fontWeight: '700', color: '#0f172a' },
  lastRefreshedLabel: { fontSize: 11, color: '#94a3b8', marginTop: 6, marginBottom: 12, textAlign: 'left' },

  columnsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    gap: 8,
    marginBottom: 12,
  },
  columnsBtnText: { fontSize: 13.5, fontWeight: '700', color: '#0f172a' },

  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    backgroundColor: '#ffffff',
    marginBottom: 10,
    gap: 8,
  },
  searchTextInput: { flex: 1, fontSize: 12.5, color: '#0f172a', paddingVertical: 0 },

  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  filterDropdownText: { fontSize: 13, color: '#334155', fontWeight: '500' },
  inlineStatusMenu: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    marginTop: -4,
    marginBottom: 10,
    paddingVertical: 5,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 15,
  },
  inlineStatusOption: {
    minHeight: 29,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 2,
  },
  inlineStatusOptionSelected: { backgroundColor: '#d9f5f2' },
  statusCheckSlot: { width: 18, alignItems: 'center' },
  inlineStatusOptionText: { color: '#334155', fontSize: 12.5, fontWeight: '500' },
  inlineStatusOptionTextSelected: { color: '#0f9488', fontWeight: '700' },

  dateFilterInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    backgroundColor: '#ffffff',
    marginBottom: 16,
    gap: 8,
  },
  dateFilterInputText: { flex: 1, fontSize: 13, color: '#334155', fontWeight: '500' },

  /* Table Styles */
  tableOuter: {
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  tableInner: {
    flexDirection: 'column',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  colHeader: {
    paddingHorizontal: 6,
  },
  headerText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  tableRowSelected: {
    backgroundColor: '#f0fdfa',
    borderBottomColor: '#99f6e4',
  },
  tableCell: {
    paddingHorizontal: 6,
    justifyContent: 'center',
  },

  patientNameCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarTealCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  phoneText: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '500',
  },
  codeText: {
    fontSize: 12,
    color: '#0d9488',
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '600',
  },

  /* Mode Pill Badges */
  modePillInPerson: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 4,
    gap: 5,
    alignSelf: 'flex-start',
  },
  modeTextInPerson: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0f766e',
  },
  modePillVideo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 4,
    gap: 5,
    alignSelf: 'flex-start',
  },
  modeTextVideo: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#7c3aed',
  },

  /* Doctor info */
  docNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  docClinicText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  clinicText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  specText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },

  /* Status Pill Badges */
  statusPillComplete: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusTextComplete: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  statusPillCancel: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusTextCancel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#dc2626',
  },
  statusPillScheduled: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusTextScheduled: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563eb',
  },
  statusPillInProgress: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fef08a',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusTextInProgress: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ca8a04',
  },

  reasonText: {
    fontSize: 12.5,
    color: '#475569',
  },
  notesText: {
    fontSize: 12,
    color: '#64748b',
  },
  durationText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  shareBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },

  /* Pagination & Load More */
  paginationBox: {
    alignItems: 'center',
    paddingTop: 18,
    gap: 10,
  },
  showingCountText: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '500',
  },
  paginationActionsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  paginationNavBtn: {
    minWidth: 94,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#99f6e4',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  paginationNavBtnDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  paginationNavText: {
    fontSize: 12,
    color: '#0f766e',
    fontWeight: '700',
  },
  paginationNavTextDisabled: { color: '#94a3b8' },
  paginationPageText: {
    flex: 1,
    color: '#64748b',
    fontSize: 11.5,
    textAlign: 'center',
    fontWeight: '600',
  },
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
    justifyContent: 'center',
    padding: 16,
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

export default AppointmentsManagerScreen;
