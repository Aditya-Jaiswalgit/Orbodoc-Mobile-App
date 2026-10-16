import { AppModal } from '../../components/common/AppModal';
import { styles } from './styles/AppointmentsManager.styles';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Linking, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Columns3,
  Download,
  Mail,
  MessageCircle,
  MoreVertical,
  Phone,
  Printer,
  Receipt,
  Search,
  Stethoscope,
  UserRound,
  Video,
  X,
} from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { PatientHeader } from '../../components/common/PatientHeader';
import { Pagination } from '../../components/common/Pagination';
import { ColumnSelectorModal } from '../../components/common/ColumnSelectorModal';
import { RefreshButton } from '../../components/common/RefreshButton';
import { CustomCalendarPicker } from '../../components/common/CustomCalendarPicker';
import { PatientAppointmentModal } from './patients/PatientAppointmentModal';
import { useAuthContext } from '../../context/AuthContext';
import { Appointment, PatientModel } from '../../types/clinicTypes';
import { fetchPatientsApi } from '../../api/patientApi';
import { downloadPrescriptionPdfApi } from '../../api/prescriptionApi';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import { useAppointmentActions } from '../../hooks/useAppointmentActions';
import { VideoCallRoomScreen } from '../common/VideoCallRoomScreen';
import { useAppointmentsData } from '../../hooks/useAppointmentsData';
import {
  AppointmentFilter as Filter,
  dateOnly,
  DEFAULT_COLUMNS,
  extractRows,
  localDateOnly,
  PAGE_SIZE_OPTIONS,
  prettyDate,
  statusLabel,
  STATUS_OPTIONS,
  APPOINTMENT_COLUMNS as COLUMNS,
} from './appointments/appointmentUtils';

interface Props {
  onOpenDrawer: () => void;
  onNavigateScreen?: (screen: string) => void;
  initialFilters?: Record<string, string>;
  patientMode?: boolean;
}
type Picker = 'status' | 'doctor' | null;

export const AppointmentsManagerScreen: React.FC<Props> = ({
  onOpenDrawer,
  onNavigateScreen,
  initialFilters = {},
  patientMode = false,
}) => {
  const {
    token,
    role,
    user,
    permissionsMap = {},
    activeClinicId,
  } = useAuthContext();
  const canView = (patientMode && Object.keys(permissionsMap || {}).length === 0) || canUseStaffScreen(
    role,
    permissionsMap,
    'appointments',
    'view',
  );
  const canAdd = !patientMode && canUseStaffScreen(role, permissionsMap, 'appointments', 'add');
  const canEdit = !patientMode && canUseStaffScreen(
    role,
    permissionsMap,
    'appointments',
    'edit',
  );
  const canDelete = !patientMode && canUseStaffScreen(
    role,
    permissionsMap,
    'appointments',
    'delete',
  );
  const canExecute = !patientMode && canUseStaffScreen(
    role,
    permissionsMap,
    'appointments',
    'execute',
  );
  const canExecuteVideo = !patientMode && canUseStaffScreen(
    role,
    permissionsMap,
    'video_services',
    'execute',
  );
  const canViewPatients = !patientMode && canUseStaffScreen(
    role,
    permissionsMap,
    'patients',
    'view',
  );
  const canAddPrescription = !patientMode && canUseStaffScreen(
    role,
    permissionsMap,
    'prescriptions',
    'add',
  );
  const canEditPrescription = !patientMode && canUseStaffScreen(
    role,
    permissionsMap,
    'prescriptions',
    'edit',
  );
  const canViewPrescription = !patientMode && canUseStaffScreen(
    role,
    permissionsMap,
    'prescriptions',
    'view',
  );
  const canManageAppointmentActions =
    canEdit ||
    canDelete ||
    canAddPrescription ||
    canEditPrescription ||
    canViewPrescription;
  const canStartAppointmentCall =
    canExecuteVideo || canManageAppointmentActions;
  const [filter, setFilter] = useState<Filter>(() => {
    const status = String(initialFilters.status || '').toLowerCase();
    if (status === 'pending') return 'pending';
    if (status === 'complete' || status === 'completed') return 'completed';
    if (status === 'cancel' || status === 'cancelled' || status === 'canceled') return 'cancelled';
    return 'all';
  });
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(
    initialFilters.date || initialFilters.date_from || initialFilters.date_to ? 'custom' : 'all',
  );
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState(initialFilters.date_from || initialFilters.date || '');
  const [toDate, setToDate] = useState(initialFilters.date_to || initialFilters.date || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [picker, setPicker] = useState<Picker>(null);
  const [columnsVisible, setColumnsVisible] = useState(false);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [activeMenu, setActiveMenu] = useState<Appointment | null>(null);
  const [viewTarget, setViewTarget] = useState<Appointment | null>(null);
  const notificationAppointmentId = initialFilters.appointmentId;
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(
    null,
  );
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [bookingPatient, setBookingPatient] = useState<PatientModel | null>(
    null,
  );
  const [prescriptionActionId, setPrescriptionActionId] = useState<number | null>(null);

  const {
    appointments,
    loading,
    error: appointmentsError,
    refresh: loadAppointments,
  } = useAppointmentsData(
    token,
    patientMode ? null : activeClinicId,
    canView,
    initialFilters,
  );
  useEffect(() => {
    if (!notificationAppointmentId || loading) return;
    const target = appointments.find(row => String(row.id) === String(notificationAppointmentId));
    if (target) setViewTarget(target);
  }, [appointments, loading, notificationAppointmentId]);
  useEffect(() => {
    if (appointmentsError) showErrorToast('Appointments', appointmentsError);
  }, [appointmentsError]);
  const closeActionMenu = useCallback(() => setActiveMenu(null), []);
  const {
    activeVideoCall,
    cancelAppointment,
    patientPickerVisible,
    patients,
    saveReschedule,
    setActiveVideoCall,
    setPatientPickerVisible,
    startingCallId,
    startVideoCall,
    updateStatus,
  } = useAppointmentActions({
    token,
    clinicId: activeClinicId,
    canAdd,
    canViewPatients,
    canEdit,
    canDelete,
    canExecute,
    canExecuteVideo: canStartAppointmentCall,
    loadAppointments,
    closeActionMenu,
    rescheduleTarget,
    rescheduleDate,
    rescheduleTime,
    clearRescheduleTarget: () => setRescheduleTarget(null),
  });

  const getPatientContact = async (appointment: Appointment) => {
    const cached = patients.find(patient => Number(patient.id) === Number(appointment.patient_id));
    if (cached?.phone || cached?.email) return cached;
    if (!token) return cached;
    const response = await fetchPatientsApi({
      clinic_id: activeClinicId || undefined,
      search: appointment.patient_phone || appointment.patient_name,
      page: 1,
      limit: 50,
    }, token);
    if (!response.success) throw new Error(response.message || 'Could not load patient contact details.');
    return extractRows<PatientModel>(response.data, 'patients')
      .find(patient => Number(patient.id) === Number(appointment.patient_id)) || cached;
  };

  const sharePrescriptionWhatsApp = async (appointment: Appointment) => {
    if (!appointment.prescription_id) return;
    try {
      const patient = await getPatientContact(appointment);
      const phone = String(patient?.phone || appointment.patient_phone || '').replace(/\D/g, '');
      if (!phone) throw new Error('Patient phone number not found.');
      const name = String(appointment.patient_name || 'Patient').trim();
      const message = `Hello ${name}, your prescription (#${appointment.prescription_id}) is ready at our clinic.`;
      await Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
    } catch (error) {
      showErrorToast('WhatsApp', error instanceof Error ? error.message : 'Could not open WhatsApp.');
    }
  };

  const sharePrescriptionEmail = async (appointment: Appointment) => {
    if (!appointment.prescription_id) return;
    try {
      const patient = await getPatientContact(appointment);
      const email = String(patient?.email || '').trim();
      if (!email) throw new Error('Patient email not found.');
      const subject = `Prescription #${appointment.prescription_id}`;
      const body = `Hello ${appointment.patient_name || 'Patient'},\n\nYour prescription (ID: ${appointment.prescription_id}) has been prepared.\nPlease contact the clinic for details.\n\nRegards`;
      await Linking.openURL(`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    } catch (error) {
      showErrorToast('Email', error instanceof Error ? error.message : 'Could not open email.');
    }
  };

  const handlePrescriptionPdf = async (appointment: Appointment, openForPrint = false) => {
    if (!token || !appointment.prescription_id) return;
    setPrescriptionActionId(appointment.id);
    try {
      const filePath = await downloadPrescriptionPdfApi(token, Number(appointment.prescription_id));
      if (openForPrint) {
        if (Platform.OS === 'android') {
          await ReactNativeBlobUtil.android.actionViewIntent(filePath, 'application/pdf', 'Open or print prescription');
        } else {
          await ReactNativeBlobUtil.ios.openDocument(filePath);
        }
      } else {
        showSuccessToast('Prescription PDF downloaded', `Prescription #${appointment.prescription_id} is ready.`);
      }
    } catch (error) {
      showErrorToast(openForPrint ? 'Prescription' : 'PDF download failed', error instanceof Error ? error.message : 'Could not open prescription PDF.');
    } finally {
      setPrescriptionActionId(null);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const today = localDateOnly(new Date());
    return appointments.filter(item => {
      const searchable = [
        item.patient_name,
        item.patient_phone,
        item.doctor_name,
        item.doctor_specialization,
        item.reason,
      ].some(value =>
        String(value || '')
          .toLowerCase()
          .includes(query),
      );
      const itemStatus = String(item.status || '').toLowerCase();
      const statusMatch =
        filter === 'all' ||
        itemStatus === filter ||
        (filter === 'pending' && itemStatus === 'pending') ||
        (filter === 'completed' && ['completed', 'complete'].includes(itemStatus)) ||
        (filter === 'cancelled' && ['cancelled', 'cancel'].includes(itemStatus)) ||
        (filter === 'scheduled' && ['scheduled', 'approved'].includes(itemStatus));
      const doctorMatch =
        doctorFilter === 'all' || item.doctor_name === doctorFilter;
      const date = dateOnly(item.appointment_date);
      const dateMatch =
        dateFilter === 'all' ||
        (dateFilter === 'today' && date === today) ||
        (dateFilter === 'upcoming' && date >= today) ||
        (dateFilter === 'past' && date < today) ||
        (dateFilter === 'custom' &&
          (!fromDate || date >= fromDate) &&
          (!toDate || date <= toDate));
      return searchable && statusMatch && doctorMatch && dateMatch;
    });
  }, [
    appointments,
    dateFilter,
    doctorFilter,
    filter,
    fromDate,
    search,
    toDate,
  ]);
  const doctors = useMemo(
    () =>
      [
        ...new Set(appointments.map(item => item.doctor_name).filter(Boolean)),
      ].sort(),
    [appointments],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const menuAction = (
    label: string,
    action: () => void,
    icon?: React.ReactNode,
    color = '#334155',
  ) => (
    <TouchableOpacity key={label} style={styles.menuItem} activeOpacity={0.65} onPress={action}>
      {icon ? <View style={styles.menuIconSlot}>{icon}</View> : null}
      <Text style={[styles.menuText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {activeVideoCall && token && user ? (
        <VideoCallRoomScreen
          appointment={activeVideoCall.appointment}
          roomId={activeVideoCall.roomId}
          callerRole={patientMode ? 'patient' : 'doctor'}
          userId={user.id}
          token={token}
          onClose={() => {
            setActiveVideoCall(null);
            loadAppointments();
          }}
        />
      ) : null}
      {patientMode ? <PatientHeader onOpenDrawer={onOpenDrawer} /> : <StaffHeader onOpenDrawer={onOpenDrawer} title="Appointments" />}
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.pageBanner}>
          <View style={styles.pageIconBox}>
            <CalendarDays size={23} color="#0D9488" />
          </View>
          <View style={styles.headingCopy}>
            <Text style={styles.pageTitle}>Appointments</Text>
            <Text style={styles.subtitle}>
              {patientMode ? 'View your upcoming and past appointments' : 'Book, search patients, and view all appointments in one page'}
            </Text>
          </View>
        </View>
        <View style={styles.listPanel}>
          <View style={styles.panelHeading}>
            <Text style={styles.panelTitle}>All Appointments</Text>
            <Text style={styles.subtitle}>
              Book and track appointments in one page
            </Text>
          </View>

          <RefreshButton
            onRefresh={() => loadAppointments()}
            loading={loading}
            label="Refresh"
            refreshingLabel="Refreshing..."
          />

          <TouchableOpacity
            style={styles.columnsButton}
            onPress={() => setColumnsVisible(true)}
          >
            <Columns3 size={15} color="#0F172A" />
            <Text style={styles.columnsButtonText}>Columns</Text>
          </TouchableOpacity>
          <View style={styles.searchBox}>
            <Search size={17} color="#64748B" />
            <TextInput
              value={search}
              onChangeText={value => {
                setSearch(value);
                setCurrentPage(1);
              }}
              placeholder="Search by patient name, phone, doctor, or reason..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={styles.filterSelect}
              onPress={() => setPicker(picker === 'status' ? null : 'status')}
            >
              <Text numberOfLines={1} style={styles.selectText}>
                {STATUS_OPTIONS.find(option => option.value === filter)?.label}
              </Text>
              <ChevronDown size={15} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterSelect}
              onPress={() => setPicker(picker === 'doctor' ? null : 'doctor')}
            >
              <Text numberOfLines={1} style={styles.selectText}>
                {doctorFilter === 'all' ? 'All Doctors' : doctorFilter}
              </Text>
              <ChevronDown size={15} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.dateFilterRow}>
            <View style={styles.calendarPickerFlex}>
              <CustomCalendarPicker
                key={dateFilter === 'all' ? 'appointments-date-empty' : 'appointments-date-selected'}
                selectedDate={fromDate ? new Date(`${fromDate}T00:00:00`) : undefined}
                placeholder="Filter by date"
                triggerStyle={styles.calendarFilterTrigger}
                triggerTextStyle={styles.calendarFilterText}
                iconColor="#64748B"
                onOpen={() => setPicker(null)}
                onDateChange={date => {
                  const selected = localDateOnly(date);
                  setFromDate(selected);
                  setToDate(selected);
                  setDateFilter('custom');
                  setCurrentPage(1);
                }}
              />
            </View>
            {dateFilter !== 'all' ? (
              <TouchableOpacity
                style={styles.clearDateFilter}
                onPress={() => {
                  setFromDate('');
                  setToDate('');
                  setDateFilter('all');
                  setCurrentPage(1);
                }}
                accessibilityRole="button"
                accessibilityLabel="Clear date filter"
              >
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            ) : null}
          </View>
          {picker === 'status' ? (
            <View style={styles.inlineOptions}>
              <ScrollView nestedScrollEnabled>
                {STATUS_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.inlineOptionRow}
                    onPress={() => {
                      setFilter(option.value);
                      setCurrentPage(1);
                      setPicker(null);
                    }}
                  >
                    <Text style={styles.optionText}>{option.label}</Text>
                    {filter === option.value ? <Check size={17} color="#0D9488" /> : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}
          {picker === 'doctor' ? (
            <View style={styles.inlineOptions}>
              <ScrollView nestedScrollEnabled>
                {[{ label: 'All Doctors', value: 'all' }, ...doctors.map(doctor => ({ label: doctor, value: doctor }))].map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.inlineOptionRow}
                    onPress={() => {
                      setDoctorFilter(option.value);
                      setCurrentPage(1);
                      setPicker(null);
                    }}
                  >
                    <Text style={styles.optionText}>{option.label}</Text>
                    {doctorFilter === option.value ? <Check size={17} color="#0D9488" /> : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
        {loading ? (
          <ActivityIndicator color="#0D9488" style={styles.extractedInline1} />
        ) : pageRows.length ? (
          pageRows.map(item => {
            const isVideoAppointment = String(item.consultation_mode || '')
              .trim()
              .toLowerCase()
              .includes('video');
            const statusTone =
              item.status === 'cancelled' || item.status === 'no_show'
                ? styles.statusCancelled
                : ['scheduled', 'in_progress', 'completed'].includes(item.status)
                ? styles.statusActive
                : styles.statusScheduled;
            const statusTextTone =
              item.status === 'cancelled' || item.status === 'no_show'
                ? styles.statusTextCancelled
                : ['scheduled', 'in_progress', 'completed'].includes(item.status)
                ? styles.statusTextActive
                : null;
            const isCancelled = ['cancelled', 'cancel', 'canceled'].includes(
              String(item.status).toLowerCase(),
            );
            const isCompleted = ['completed', 'complete'].includes(
              String(item.status).toLowerCase(),
            );
            const hasPrescription = Boolean(item.prescription_id);
            const canShowActions =
              (canManageAppointmentActions && !isCancelled) ||
              (canStartAppointmentCall && !isCancelled && isVideoAppointment);
            return (
              <View
                key={item.id}
                style={[styles.card, activeMenu?.id === item.id && styles.cardMenuOpen]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.patientMark}>
                    <UserRound size={18} color="#0D9488" />
                  </View>
                  <View style={styles.patientBlock}>
                    {columns.patient ? (
                      <Text style={styles.patientName}>
                        {item.patient_name || 'Patient'}
                      </Text>
                    ) : null}
                    {columns.patientCode ? <Text style={styles.metaText}>{item.patient_code || '-'}</Text> : null}
                    {columns.phone ? <Text style={styles.metaText}>{item.patient_phone || '-'}</Text> : null}
                  </View>
                  {columns.status ? (
                    <View style={[styles.statusBadge, statusTone]}>
                      <Text style={[styles.statusText, statusTextTone]}>
                        {statusLabel(item.status)}
                      </Text>
                    </View>
                  ) : null}
                  {columns.actions && canShowActions ? <TouchableOpacity
                    style={styles.moreButton}
                    onPress={() => setActiveMenu(activeMenu?.id === item.id ? null : item)}
                    accessibilityLabel="Appointment actions"
                  >
                    <MoreVertical size={19} color="#334155" />
                  </TouchableOpacity> : null}
                </View>
                {activeMenu?.id === item.id ? (
                  <View style={styles.appointmentMenu}>
                    {canEdit && !isCancelled && !isCompleted
                      ? menuAction(
                          'Mark Completed',
                          () => {
                            void updateStatus(item, 'completed');
                          },
                        )
                      : null}
                    {canDelete && !isCancelled && !isCompleted
                      ? menuAction(
                          'Cancel Appointment',
                          () => cancelAppointment(item),
                        )
                      : null}
                    {canManageAppointmentActions && !isCancelled && isVideoAppointment
                      ? menuAction(
                          'Call',
                          () => {
                            void startVideoCall(item);
                          },
                          <Video size={15} color="#334155" />,
                        )
                      : null}
                    {!hasPrescription && canAddPrescription && !isCancelled && !isCompleted
                      ? menuAction(
                          'Add Prescription',
                          () => {
                            setActiveMenu(null);
                            onNavigateScreen?.(`/prescriptions?appointment_id=${item.id}&patient_id=${item.patient_id}&create=1`);
                          },
                          <Receipt size={15} color="#334155" />,
                        )
                      : null}
                    {(hasPrescription || isCompleted) && (canEditPrescription || canAddPrescription) && !isCancelled
                      ? menuAction(
                          'Update Prescription',
                          () => {
                            setActiveMenu(null);
                            onNavigateScreen?.(`/prescriptions?appointment_id=${item.id}&patient_id=${item.patient_id}${hasPrescription ? '' : '&create=1'}`);
                          },
                          <Receipt size={15} color="#334155" />,
                        )
                      : null}
                    {hasPrescription && canViewPrescription ? <>
                      {menuAction(prescriptionActionId === item.id ? 'Preparing PDF...' : 'Print Prescription', () => void handlePrescriptionPdf(item, true), prescriptionActionId === item.id ? <ActivityIndicator size="small" color="#334155" /> : <Printer size={15} color="#334155" />)}
                      {menuAction('Download PDF', () => void handlePrescriptionPdf(item), <Download size={15} color="#334155" />)}
                    </> : null}
                  </View>
                ) : null}
                <View style={styles.cardDetails}>
                  {columns.date ? (
                    <View style={styles.detailRow}>
                      <CalendarDays size={15} color="#0D9488" />
                      <Text style={styles.detailText}>
                        {prettyDate(item.appointment_date)}
                      </Text>
                    </View>
                  ) : null}
                  {columns.doctor ? (
                    <View style={styles.detailRow}>
                      <Stethoscope size={15} color="#0D9488" />
                      <Text style={styles.detailText}>
                        {item.doctor_name || 'Doctor'}
                        {item.doctor_specialization
                          ? ` · ${item.doctor_specialization}`
                          : ''}
                      </Text>
                    </View>
                  ) : null}
                  {columns.clinic ? <View style={styles.detailRow}><Text style={styles.reasonLabel}>Clinic</Text><Text style={styles.detailText}>{item.clinic_name || '—'}</Text></View> : null}
                  {columns.specialization ? <View style={styles.detailRow}><Text style={styles.reasonLabel}>Specialty</Text><Text style={styles.detailText}>{item.specialization || item.doctor_specialization || '—'}</Text></View> : null}
                  {columns.reason ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.reasonLabel}>Reason</Text>
                      <Text numberOfLines={2} style={styles.detailText}>
                        {item.reason || '—'}
                      </Text>
                    </View>
                  ) : null}
                  {columns.notes ? <View style={styles.detailRow}><Text style={styles.reasonLabel}>Notes</Text><Text numberOfLines={2} style={styles.detailText}>{item.notes || '—'}</Text></View> : null}
                  {columns.time ? <View style={styles.detailRow}><Clock3 size={15} color="#64748B" /><Text style={styles.detailText}>{item.appointment_time || item.time_slot || 'Time not set'}</Text></View> : null}
                  {columns.duration ? (
                    <View style={styles.detailRow}>
                      <Clock3 size={15} color="#64748B" />
                      <Text style={styles.detailText}>
                        {item.duration_minutes || 30} minutes
                      </Text>
                    </View>
                  ) : null}
                  {columns.mode ? (
                    <Text style={styles.modeText}>
                      {isVideoAppointment
                        ? 'Video Consultation'
                        : 'In Person'}
                    </Text>
                  ) : null}
                  {columns.share && canViewPrescription ? <View style={styles.prescriptionShareRow}>
                    {hasPrescription ? <>
                      <TouchableOpacity style={styles.prescriptionShareButton} onPress={() => void sharePrescriptionWhatsApp(item)}>
                        <MessageCircle size={15} color="#15803d" /><Text style={styles.prescriptionShareText}>WhatsApp</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.prescriptionShareButton} onPress={() => void sharePrescriptionEmail(item)}>
                        <Mail size={15} color="#2563eb" /><Text style={styles.prescriptionShareText}>Email</Text>
                      </TouchableOpacity>
                    </> : <Text style={styles.metaText}>No prescription to share</Text>}
                  </View> : null}
                </View>
                {isVideoAppointment &&
                canStartAppointmentCall &&
                item.status === 'scheduled' ? (
                  <TouchableOpacity
                    disabled={startingCallId === item.id}
                    style={styles.callButton}
                    onPress={() => startVideoCall(item)}
                  >
                    <Phone size={15} color="#FFF" />
                    <Text style={styles.callButtonText}>
                      {startingCallId === item.id ? 'Starting call...' : 'Start Video Call'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {patientMode && isVideoAppointment && !isCancelled && !isCompleted && item.video_room_id ? (
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => setActiveVideoCall({ appointment: item, roomId: String(item.video_room_id) })}
                  >
                    <Video size={15} color="#FFF" />
                    <Text style={styles.callButtonText}>Join Video Consultation</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })
        ) : (
          <View style={styles.empty}>
            <CalendarDays size={30} color="#94A3B8" />
            <Text style={styles.emptyText}>
              {canView
                ? 'No appointments found.'
                : 'You do not have permission to view appointments.'}
            </Text>
          </View>
        )}
        {filtered.length > 0 ? (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setCurrentPage}
            onPageSizeChange={size => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        ) : null}
      </ScrollView>

      <ColumnSelectorModal
        visible={columnsVisible}
        onClose={() => setColumnsVisible(false)}
        columns={COLUMNS}
        visibleColumns={columns}
        onToggleColumn={key =>
          setColumns(previous => ({ ...previous, [key]: !previous[key] }))
        }
        onReset={() => setColumns(DEFAULT_COLUMNS)}
        title="Appointment columns"
        subtitle="Choose the details shown on appointment cards"
      />

      <AppModal
        visible={Boolean(viewTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setViewTarget(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.reschedulePanel}>
            <View style={styles.optionHeader}>
              <Text style={styles.optionTitle}>Appointment Details</Text>
              <TouchableOpacity onPress={() => setViewTarget(null)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            {viewTarget ? (
              <View style={styles.detailsContent}>
                <Text style={styles.detailsName}>{viewTarget.patient_name || 'Patient'}</Text>
                <Text style={styles.detailText}>{viewTarget.patient_phone || 'No phone number'}</Text>
                <Text style={styles.detailText}>
                  Doctor: {viewTarget.doctor_name || '-'}
                  {viewTarget.doctor_specialization ? ` · ${viewTarget.doctor_specialization}` : ''}
                </Text>
                <Text style={styles.detailText}>
                  Date: {prettyDate(viewTarget.appointment_date)} · {viewTarget.appointment_time || viewTarget.time_slot || 'Time not set'}
                </Text>
                <Text style={styles.detailText}>Status: {statusLabel(viewTarget.status)}</Text>
                <Text style={styles.detailText}>
                  Mode: {String(viewTarget.consultation_mode || '').toLowerCase().includes('video') ? 'Video Consultation' : 'In Person'}
                </Text>
                <Text style={styles.detailText}>Reason: {viewTarget.reason || '-'}</Text>
                <Text style={styles.detailText}>Notes: {viewTarget.notes || '-'}</Text>
              </View>
            ) : null}
            <TouchableOpacity style={styles.cancelButton} onPress={() => setViewTarget(null)}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppModal>
      <AppModal
        visible={Boolean(rescheduleTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setRescheduleTarget(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.reschedulePanel}>
            <View style={styles.optionHeader}>
              <Text style={styles.optionTitle}>Reschedule Appointment</Text>
              <TouchableOpacity onPress={() => setRescheduleTarget(null)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Appointment date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={rescheduleDate}
              onChangeText={setRescheduleDate}
            />
            <Text style={styles.fieldLabel}>Appointment time</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10:30 AM"
              value={rescheduleTime}
              onChangeText={setRescheduleTime}
            />
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => saveReschedule()}
            >
              <Text style={styles.primaryText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setRescheduleTarget(null)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppModal>
      <AppModal
        visible={patientPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPatientPickerVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.patientPicker}>
            <View style={styles.optionHeader}>
              <Text style={styles.optionTitle}>Select Patient</Text>
              <TouchableOpacity onPress={() => setPatientPickerVisible(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {patients.map(patient => (
                <TouchableOpacity
                  key={patient.id}
                  style={styles.optionRow}
                  onPress={() => {
                    setPatientPickerVisible(false);
                    setBookingPatient(patient);
                  }}
                >
                  <View>
                    <Text style={styles.optionText}>{patient.full_name}</Text>
                    <Text style={styles.metaText}>
                      {patient.patient_code || `Patient ID: ${patient.id}`} ·{' '}
                      {patient.phone || 'No phone'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </AppModal>
      <PatientAppointmentModal
        visible={Boolean(bookingPatient)}
        patient={bookingPatient}
        clinicId={activeClinicId}
        token={token}
        onClose={() => setBookingPatient(null)}
        onBooked={() => {
          setBookingPatient(null);
          loadAppointments();
        }}
      />
    </View>
  );
};

export default AppointmentsManagerScreen;
