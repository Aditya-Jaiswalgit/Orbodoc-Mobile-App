import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CalendarDays, Check, ChevronDown, Clock3, Columns3, MoreVertical, Phone, Plus, RefreshCw, Search, Stethoscope, UserRound, X } from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { Pagination } from '../../components/common/Pagination';
import { ColumnOption, ColumnSelectorModal } from '../../components/common/ColumnSelectorModal';
import { CustomCalendarPicker } from '../../components/common/CustomCalendarPicker';
import { PatientAppointmentModal } from './patients/PatientAppointmentModal';
import { useAuthContext } from '../../context/AuthContext';
import { getAppointmentsApi, updateAppointmentStatusApi, cancelAppointmentApi, sendAppointmentReminderApi } from '../../api/appointmentApi';
import { fetchPatientsApi } from '../../api/patientApi';
import { Appointment, PatientModel } from '../../types/clinicTypes';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import { apiFetch } from '../../api/apiConfig';
import { VideoCallRoomScreen } from '../common/VideoCallRoomScreen';

interface Props { onOpenDrawer: () => void; onNavigateScreen?: (screen: string) => void }
type Filter = 'all' | Appointment['status'];
type Column = 'patient' | 'phone' | 'doctor' | 'date' | 'reason' | 'duration' | 'mode' | 'status';
type Picker = 'status' | 'doctor' | 'date' | null;
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const COLUMNS: ColumnOption<Column>[] = [
  { key: 'patient', label: 'Patient', defaultVisible: true }, { key: 'phone', label: 'Phone', defaultVisible: true },
  { key: 'doctor', label: 'Doctor', defaultVisible: true }, { key: 'date', label: 'Date and time', defaultVisible: true },
  { key: 'reason', label: 'Reason', defaultVisible: true }, { key: 'duration', label: 'Duration', defaultVisible: false },
  { key: 'mode', label: 'Consultation mode', defaultVisible: false }, { key: 'status', label: 'Status', defaultVisible: true },
];
const DEFAULT_COLUMNS = Object.fromEntries(COLUMNS.map(column => [column.key, column.defaultVisible])) as Record<Column, boolean>;
const extractRows = <T,>(value: unknown, key: string): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== 'object') return [];
  const data = value as Record<string, any>;
  if (Array.isArray(data.data)) return data.data as T[];
  if (Array.isArray(data[key])) return data[key] as T[];
  return [];
};
const dateOnly = (value?: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value.slice(0, 10) : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
};
const localDateOnly = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const prettyDate = (value?: string) => {
  if (!value) return 'Date not set';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const statusLabel = (status: string) => status.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const STATUS_OPTIONS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All Status' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }, { value: 'no_show', label: 'No Show' },
];

export const AppointmentsManagerScreen: React.FC<Props> = ({ onOpenDrawer, onNavigateScreen }) => {
  const { token, role, user, permissionsMap = {}, activeClinicId, activeClinicName, assignedClinics = [], switchClinic } = useAuthContext();
  const canView = canUseStaffScreen(role, permissionsMap, 'appointments', 'view');
  const canAdd = canUseStaffScreen(role, permissionsMap, 'appointments', 'add');
  const canEdit = canUseStaffScreen(role, permissionsMap, 'appointments', 'edit');
  const canDelete = canUseStaffScreen(role, permissionsMap, 'appointments', 'delete');
  const canExecute = canUseStaffScreen(role, permissionsMap, 'appointments', 'execute');
  const canExecuteVideo = canUseStaffScreen(role, permissionsMap, 'video_services', 'execute');
  const canViewPatients = canUseStaffScreen(role, permissionsMap, 'patients', 'view');
  const canAddPrescription = canUseStaffScreen(role, permissionsMap, 'prescriptions', 'add');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<PatientModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [picker, setPicker] = useState<Picker>(null);
  const [columnsVisible, setColumnsVisible] = useState(false);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [lastRefreshed, setLastRefreshed] = useState('');
  const [activeMenu, setActiveMenu] = useState<Appointment | null>(null);
  const [viewTarget, setViewTarget] = useState<Appointment | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [patientPickerVisible, setPatientPickerVisible] = useState(false);
  const [clinicPickerVisible, setClinicPickerVisible] = useState(false);
  const [bookingPatient, setBookingPatient] = useState<PatientModel | null>(null);
  const [activeVideoCall, setActiveVideoCall] = useState<{ appointment: Appointment; roomId: string } | null>(null);
  const [startingCallId, setStartingCallId] = useState<number | null>(null);

  const loadAppointments = useCallback(async () => {
    if (!token || !canView) { setAppointments([]); return; }
    setLoading(true);
    try {
      const response = await getAppointmentsApi(token, activeClinicId ? `clinic_id=${encodeURIComponent(String(activeClinicId))}` : undefined);
      if (!response.success) throw new Error(response.message || 'Unable to load appointments.');
      setAppointments(extractRows<Appointment>(response.data, 'appointments'));
      setLastRefreshed(new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }));
    } catch (error: any) {
      showErrorToast('Appointments', error?.message || 'Unable to load appointments.');
      setAppointments([]);
    } finally { setLoading(false); }
  }, [activeClinicId, canView, token]);
  useEffect(() => { void loadAppointments(); }, [loadAppointments]);

  const openBooking = async () => {
    if (!canAdd) return;
    if (!canViewPatients) { showErrorToast('Permission denied', 'Patient read permission is required to choose a patient.'); return; }
    if (!token) return;
    try {
      const response = await fetchPatientsApi({ clinic_id: activeClinicId || undefined, page: 1, limit: 100 }, token);
      if (!response.success) throw new Error(response.message || 'Unable to load patients.');
      setPatients(extractRows<PatientModel>(response.data, 'patients'));
      setPatientPickerVisible(true);
    } catch (error: any) { showErrorToast('Patients', error?.message || 'Unable to load patients.'); }
  };

  const updateStatus = async (appointment: Appointment, status: Appointment['status']) => {
    if (!canEdit || !token) return;
    try {
      const response = await updateAppointmentStatusApi(token, appointment.id, status);
      if (!response.success) throw new Error(response.message || 'Unable to update appointment.');
      showSuccessToast('Appointment updated', `Status changed to ${statusLabel(status)}.`);
      setActiveMenu(null);
      await loadAppointments();
    } catch (error: any) { showErrorToast('Update failed', error?.message || 'Unable to update appointment.'); }
  };
  const cancelAppointment = (appointment: Appointment) => {
    if (!canDelete || !token) return;
    setActiveMenu(null);
    Alert.alert('Cancel Appointment', `Cancel the appointment for ${appointment.patient_name}?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Appointment', style: 'destructive', onPress: async () => {
        try {
          const response = await cancelAppointmentApi(token, appointment.id);
          if (!response.success) throw new Error(response.message || 'Unable to cancel appointment.');
          showSuccessToast('Appointment cancelled', `${appointment.patient_name}'s appointment was cancelled.`);
          await loadAppointments();
        } catch (error: any) { showErrorToast('Cancel failed', error?.message || 'Unable to cancel appointment.'); }
      } },
    ]);
  };
  const deleteAppointment = (appointment: Appointment) => {
    if (!canDelete || !token) return;
    setActiveMenu(null);
    Alert.alert('Delete Appointment', 'Permanently delete this appointment?', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const response = await apiFetch(`/appointments/${appointment.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
          if (!response.success) throw new Error(response.message || 'Unable to delete appointment.');
          showSuccessToast('Appointment deleted', 'The appointment was removed.');
          await loadAppointments();
        } catch (error: any) { showErrorToast('Delete failed', error?.message || 'Unable to delete appointment.'); }
      } },
    ]);
  };
  const saveReschedule = async () => {
    if (!token || !canEdit || !rescheduleTarget || !rescheduleDate || !rescheduleTime) { showErrorToast('Reschedule', 'Choose a date and enter an appointment time.'); return; }
    try {
      const response = await apiFetch(`/appointments/${rescheduleTarget.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ appointment_date: rescheduleDate, appointment_time: rescheduleTime }) });
      if (!response.success) throw new Error(response.message || 'Unable to reschedule appointment.');
      setRescheduleTarget(null);
      showSuccessToast('Appointment rescheduled', 'New appointment date and time have been saved.');
      await loadAppointments();
    } catch (error: any) { showErrorToast('Reschedule failed', error?.message || 'Unable to reschedule appointment.'); }
  };
  const sendReminder = async (appointment: Appointment) => {
    if (!canExecute || !token) return;
    try {
      const response = await sendAppointmentReminderApi(token, appointment.id);
      if (!response.success) throw new Error(response.message || 'Unable to send reminder.');
      showSuccessToast('Reminder sent', `Reminder sent for ${appointment.patient_name}.`);
      setActiveMenu(null);
    } catch (error: any) { showErrorToast('Reminder failed', error?.message || 'Unable to send reminder.'); }
  };
  const startVideoCall = async (appointment: Appointment, allowInsufficientBalance = false) => {
    if (!canExecuteVideo || !token || startingCallId) return;
    setStartingCallId(appointment.id);
    try {
      const response = await apiFetch<{ videoRoomId?: string; warning?: string }>(`/appointments/${appointment.id}/start-call`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(allowInsufficientBalance ? { allow_insufficient_balance: true } : {}) });
      if (!response.success && response.error === 'HTTP_402') {
        Alert.alert('Wallet balance is low', 'Start this call with payment marked pending?', [
          { text: 'Cancel', style: 'cancel' }, { text: 'Continue', onPress: () => { void startVideoCall(appointment, true); } },
        ]);
        return;
      }
      if (!response.success) throw new Error(response.message || 'Unable to start video consultation.');
      const roomId = String(response.data?.videoRoomId || appointment.video_room_id || '').trim();
      if (!roomId) throw new Error('The server did not return a video room. Please refresh and try again.');
      setActiveMenu(null);
      setActiveVideoCall({ appointment, roomId });
      void loadAppointments();
    } catch (error: any) { showErrorToast('Video call', error?.message || 'Unable to start video consultation.'); }
    finally { setStartingCallId(null); }
  };
  const callPatient = async (appointment: Appointment) => {
    if (!appointment.patient_phone) { showErrorToast('Call patient', 'No phone number is available.'); return; }
    try { await Linking.openURL(`tel:${appointment.patient_phone.replace(/[^\d+]/g, '')}`); setActiveMenu(null); }
    catch { showErrorToast('Call patient', 'Unable to open the phone dialer.'); }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const today = localDateOnly(new Date());
    return appointments.filter(item => {
      const searchable = [item.patient_name, item.patient_phone, item.doctor_name, item.doctor_specialization, item.reason].some(value => String(value || '').toLowerCase().includes(query));
      const statusMatch = filter === 'all' || item.status === filter;
      const doctorMatch = doctorFilter === 'all' || item.doctor_name === doctorFilter;
      const date = dateOnly(item.appointment_date);
      const dateMatch = dateFilter === 'all' || (dateFilter === 'today' && date === today) || (dateFilter === 'upcoming' && date >= today) || (dateFilter === 'past' && date < today) || (dateFilter === 'custom' && (!fromDate || date >= fromDate) && (!toDate || date <= toDate));
      return searchable && statusMatch && doctorMatch && dateMatch;
    });
  }, [appointments, dateFilter, doctorFilter, filter, fromDate, search, toDate]);
  const doctors = useMemo(() => [...new Set(appointments.map(item => item.doctor_name).filter(Boolean))].sort(), [appointments]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const openReschedule = (appointment: Appointment) => { setActiveMenu(null); setRescheduleTarget(appointment); setRescheduleDate(dateOnly(appointment.appointment_date)); setRescheduleTime(appointment.appointment_time || appointment.time_slot || ''); };
  const menuAction = (label: string, action: () => void, icon: React.ReactNode, color = '#334155') => <TouchableOpacity key={label} style={styles.menuItem} onPress={action}><View style={styles.menuIcon}>{icon}</View><Text style={[styles.menuText, { color }]}>{label}</Text></TouchableOpacity>;

  return (
    <View style={styles.container}>
      {activeVideoCall && token && user ? <VideoCallRoomScreen appointment={activeVideoCall.appointment} roomId={activeVideoCall.roomId} callerRole="doctor" userId={user.id} token={token} onClose={() => { setActiveVideoCall(null); void loadAppointments(); }} /> : null}
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Appointments" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headingRow}><View style={styles.headingCopy}><Text style={styles.pageTitle}>Appointments</Text><Text style={styles.subtitle}>Book, search patients, and view all appointments in one page</Text></View>{canAdd ? <TouchableOpacity style={styles.bookBtn} onPress={() => void openBooking()}><Plus size={17} color="#FFF"/><Text style={styles.bookBtnText}>Book</Text></TouchableOpacity> : null}</View>
        <TouchableOpacity style={styles.clinicPill} activeOpacity={assignedClinics.length > 1 ? 0.7 : 1} onPress={() => { if (assignedClinics.length > 1) setClinicPickerVisible(true); }}><Text style={styles.clinicText}>{activeClinicName || 'All Clinics'}</Text>{assignedClinics.length > 1 ? <ChevronDown size={16} color="#0D9488"/> : null}</TouchableOpacity>
        <View style={styles.listPanel}>
          <View style={styles.panelHeading}><View style={styles.flex}><Text style={styles.panelTitle}>All Appointments ({filtered.length})</Text><Text style={styles.subtitle}>Book and track appointments in one page</Text></View><TouchableOpacity style={styles.iconAction} onPress={() => void loadAppointments()} disabled={loading}><RefreshCw size={16} color="#334155"/><Text style={styles.actionText}>Refresh</Text></TouchableOpacity></View>
          {lastRefreshed ? <Text style={styles.refreshed}>Last refreshed: {lastRefreshed}</Text> : null}
          <TouchableOpacity style={styles.columnsButton} onPress={() => setColumnsVisible(true)}><Columns3 size={15} color="#334155"/><Text style={styles.actionText}>Columns</Text></TouchableOpacity>
          <View style={styles.searchBox}><Search size={17} color="#64748B"/><TextInput value={search} onChangeText={value => { setSearch(value); setCurrentPage(1); }} placeholder="Search by patient name, phone, doctor, or reason..." placeholderTextColor="#94A3B8" style={styles.searchInput}/>{search ? <TouchableOpacity onPress={() => setSearch('')}><X size={16} color="#64748B"/></TouchableOpacity> : null}</View>
          <View style={styles.filterRow}>
            <TouchableOpacity style={styles.filterSelect} onPress={() => setPicker('status')}><Text numberOfLines={1} style={styles.selectText}>{STATUS_OPTIONS.find(option => option.value === filter)?.label}</Text><ChevronDown size={15} color="#64748B"/></TouchableOpacity>
            <TouchableOpacity style={styles.filterSelect} onPress={() => setPicker('doctor')}><Text numberOfLines={1} style={styles.selectText}>{doctorFilter === 'all' ? 'All Doctors' : doctorFilter}</Text><ChevronDown size={15} color="#64748B"/></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.filterSelect} onPress={() => setPicker('date')}><CalendarDays size={15} color="#64748B"/><Text numberOfLines={1} style={[styles.selectText, styles.dateSelectText]}>{dateFilter === 'custom' && (fromDate || toDate) ? `${fromDate ? prettyDate(fromDate) : 'Any'} – ${toDate ? prettyDate(toDate) : 'Any'}` : ({ all: 'Filter by date', today: 'Today', upcoming: 'Upcoming', past: 'Past', custom: 'Choose date range' } as Record<string, string>)[dateFilter]}</Text><ChevronDown size={15} color="#64748B"/></TouchableOpacity>
          {dateFilter === 'custom' ? <View style={styles.dateRangeRow}><CustomCalendarPicker selectedDate={fromDate ? new Date(`${fromDate}T00:00:00`) : undefined} placeholder="From date" triggerStyle={styles.rangeDateTrigger} triggerTextStyle={styles.rangeDateText} onDateChange={date => { setFromDate(localDateOnly(date)); setCurrentPage(1); }}/><CustomCalendarPicker selectedDate={toDate ? new Date(`${toDate}T00:00:00`) : undefined} placeholder="To date" triggerStyle={styles.rangeDateTrigger} triggerTextStyle={styles.rangeDateText} onDateChange={date => { setToDate(localDateOnly(date)); setCurrentPage(1); }}/></View> : null}
        </View>
        {loading ? <ActivityIndicator color="#0D9488" style={{ marginTop: 26 }} /> : pageRows.length ? pageRows.map(item => {
          const statusTone = item.status === 'completed' ? styles.statusComplete : item.status === 'cancelled' || item.status === 'no_show' ? styles.statusCancelled : item.status === 'in_progress' ? styles.statusProgress : styles.statusScheduled;
          return <View key={item.id} style={styles.card}>
            <View style={styles.cardTop}><View style={styles.patientMark}><UserRound size={18} color="#0D9488"/></View><View style={styles.patientBlock}>{columns.patient ? <Text style={styles.patientName}>{item.patient_name || 'Patient'}</Text> : null}{columns.phone && item.patient_phone ? <Text style={styles.metaText}>{item.patient_phone}</Text> : null}</View>{columns.status ? <View style={[styles.statusBadge, statusTone]}><Text style={styles.statusText}>{statusLabel(item.status)}</Text></View> : null}<TouchableOpacity style={styles.moreButton} onPress={() => setActiveMenu(item)} accessibilityLabel="Appointment actions"><MoreVertical size={19} color="#334155"/></TouchableOpacity></View>
            <View style={styles.cardDetails}>
              {columns.date ? <View style={styles.detailRow}><CalendarDays size={15} color="#0D9488"/><Text style={styles.detailText}>{prettyDate(item.appointment_date)} · {item.appointment_time || item.time_slot || 'Time not set'}</Text></View> : null}
              {columns.doctor ? <View style={styles.detailRow}><Stethoscope size={15} color="#0D9488"/><Text style={styles.detailText}>{item.doctor_name || 'Doctor'}{item.doctor_specialization ? ` · ${item.doctor_specialization}` : ''}</Text></View> : null}
              {columns.reason && item.reason ? <View style={styles.detailRow}><Text style={styles.reasonLabel}>Reason</Text><Text numberOfLines={2} style={styles.detailText}>{item.reason}</Text></View> : null}
              {columns.duration && item.duration_minutes ? <View style={styles.detailRow}><Clock3 size={15} color="#64748B"/><Text style={styles.detailText}>{item.duration_minutes} minutes</Text></View> : null}
              {columns.mode && item.consultation_mode ? <Text style={styles.modeText}>{item.consultation_mode === 'video' ? 'Video Consultation' : 'In Person'}</Text> : null}
            </View>
            {String(item.consultation_mode).toLowerCase() === 'video' && canExecuteVideo && item.status === 'scheduled' ? <TouchableOpacity disabled={startingCallId === item.id} style={styles.callButton} onPress={() => void startVideoCall(item)}><Phone size={15} color="#FFF"/><Text style={styles.callButtonText}>{startingCallId === item.id ? 'Starting call…' : 'Start Video Call'}</Text></TouchableOpacity> : null}
          </View>;
        }) : <View style={styles.empty}><CalendarDays size={30} color="#94A3B8"/><Text style={styles.emptyText}>{canView ? 'No appointments found.' : 'You do not have permission to view appointments.'}</Text></View>}
        {filtered.length > 0 ? <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}/> : null}
      </ScrollView>

      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}><TouchableOpacity activeOpacity={1} style={styles.backdrop} onPress={() => setPicker(null)}><View style={styles.optionPanel}><View style={styles.optionHeader}><Text style={styles.optionTitle}>{picker === 'status' ? 'Appointment Status' : picker === 'doctor' ? 'Select Doctor' : 'Filter by date'}</Text><TouchableOpacity onPress={() => setPicker(null)}><X size={18} color="#64748B"/></TouchableOpacity></View><ScrollView style={{ maxHeight: 330 }}>
        {picker === 'status' ? STATUS_OPTIONS.map(option => <TouchableOpacity key={option.value} style={styles.optionRow} onPress={() => { setFilter(option.value); setCurrentPage(1); setPicker(null); }}><Text style={styles.optionText}>{option.label}</Text>{filter === option.value ? <Check size={17} color="#0D9488"/> : null}</TouchableOpacity>) : null}
        {picker === 'doctor' ? <><TouchableOpacity style={styles.optionRow} onPress={() => { setDoctorFilter('all'); setCurrentPage(1); setPicker(null); }}><Text style={styles.optionText}>All Doctors</Text>{doctorFilter === 'all' ? <Check size={17} color="#0D9488"/> : null}</TouchableOpacity>{doctors.map(doctor => <TouchableOpacity key={doctor} style={styles.optionRow} onPress={() => { setDoctorFilter(doctor); setCurrentPage(1); setPicker(null); }}><Text style={styles.optionText}>{doctor}</Text>{doctorFilter === doctor ? <Check size={17} color="#0D9488"/> : null}</TouchableOpacity>)}</> : null}
        {picker === 'date' ? (['all', 'today', 'upcoming', 'past', 'custom'] as const).map(option => <TouchableOpacity key={option} style={styles.optionRow} onPress={() => { setDateFilter(option); setCurrentPage(1); setPicker(null); }}><Text style={styles.optionText}>{({ all: 'All Dates', today: 'Today', upcoming: 'Upcoming', past: 'Past', custom: 'Choose Date' })[option]}</Text>{dateFilter === option ? <Check size={17} color="#0D9488"/> : null}</TouchableOpacity>) : null}
      </ScrollView></View></TouchableOpacity></Modal>
      <ColumnSelectorModal visible={columnsVisible} onClose={() => setColumnsVisible(false)} columns={COLUMNS} visibleColumns={columns} onToggleColumn={key => setColumns(previous => ({ ...previous, [key]: !previous[key] }))} onReset={() => setColumns(DEFAULT_COLUMNS)} title="Appointment columns" subtitle="Choose the details shown on appointment cards"/>
      <Modal visible={Boolean(activeMenu)} transparent animationType="fade" onRequestClose={() => setActiveMenu(null)}><TouchableOpacity activeOpacity={1} style={styles.backdrop} onPress={() => setActiveMenu(null)}><View style={styles.menuPanel}><View style={styles.optionHeader}><Text style={styles.optionTitle}>Appointment Actions</Text><TouchableOpacity onPress={() => setActiveMenu(null)}><X size={18} color="#64748B"/></TouchableOpacity></View>{activeMenu ? <>
        {menuAction('View Details', () => { setViewTarget(activeMenu); setActiveMenu(null); }, <UserRound size={16} color="#334155"/>)}
        {canEdit && ['scheduled', 'in_progress'].includes(activeMenu.status) ? menuAction('Reschedule', () => openReschedule(activeMenu), <CalendarDays size={16} color="#334155"/>) : null}
        {canEdit && activeMenu.status === 'scheduled' && String(activeMenu.consultation_mode).toLowerCase() !== 'video' ? menuAction('Mark In Progress', () => { void updateStatus(activeMenu, 'in_progress'); }, <Clock3 size={16} color="#334155"/>) : null}
        {canEdit && activeMenu.status === 'in_progress' ? menuAction('Mark Completed', () => { void updateStatus(activeMenu, 'completed'); }, <Check size={16} color="#059669"/>, '#047857') : null}
        {canDelete && !['cancelled', 'completed', 'no_show'].includes(activeMenu.status) ? menuAction('Cancel Appointment', () => cancelAppointment(activeMenu), <X size={16} color="#DC2626"/>, '#DC2626') : null}
        {activeMenu.patient_phone ? menuAction('Call Patient', () => { void callPatient(activeMenu); }, <Phone size={16} color="#334155"/>) : null}
        {canExecute ? menuAction('Send Reminder', () => { void sendReminder(activeMenu); }, <RefreshCw size={16} color="#334155"/>) : null}
        {canAddPrescription ? menuAction('Add Prescription', () => { setActiveMenu(null); onNavigateScreen?.('prescriptions'); }, <Plus size={16} color="#0D9488"/>, '#0F766E') : null}
        {canDelete && ['cancelled', 'completed', 'no_show'].includes(activeMenu.status) ? menuAction('Delete Permanently', () => deleteAppointment(activeMenu), <X size={16} color="#DC2626"/>, '#DC2626') : null}
      </> : null}</View></TouchableOpacity></Modal>
      <Modal visible={Boolean(viewTarget)} transparent animationType="fade" onRequestClose={() => setViewTarget(null)}><View style={styles.backdrop}><View style={styles.reschedulePanel}><View style={styles.optionHeader}><Text style={styles.optionTitle}>Appointment Details</Text><TouchableOpacity onPress={() => setViewTarget(null)}><X size={18} color="#64748B"/></TouchableOpacity></View>{viewTarget ? <View style={styles.detailsContent}><Text style={styles.detailsName}>{viewTarget.patient_name || 'Patient'}</Text><Text style={styles.detailText}>{viewTarget.patient_phone || 'No phone number'}</Text><Text style={styles.detailText}>Doctor: {viewTarget.doctor_name || '—'}{viewTarget.doctor_specialization ? ` · ${viewTarget.doctor_specialization}` : ''}</Text><Text style={styles.detailText}>Date: {prettyDate(viewTarget.appointment_date)} · {viewTarget.appointment_time || viewTarget.time_slot || 'Time not set'}</Text><Text style={styles.detailText}>Status: {statusLabel(viewTarget.status)}</Text><Text style={styles.detailText}>Mode: {viewTarget.consultation_mode === 'video' ? 'Video Consultation' : 'In Person'}</Text><Text style={styles.detailText}>Reason: {viewTarget.reason || '—'}</Text><Text style={styles.detailText}>Notes: {viewTarget.notes || '—'}</Text></View> : null}<TouchableOpacity style={styles.cancelButton} onPress={() => setViewTarget(null)}><Text style={styles.cancelText}>Close</Text></TouchableOpacity></View></View></Modal>
      <Modal visible={Boolean(rescheduleTarget)} transparent animationType="fade" onRequestClose={() => setRescheduleTarget(null)}><View style={styles.backdrop}><View style={styles.reschedulePanel}><View style={styles.optionHeader}><Text style={styles.optionTitle}>Reschedule Appointment</Text><TouchableOpacity onPress={() => setRescheduleTarget(null)}><X size={18} color="#64748B"/></TouchableOpacity></View><Text style={styles.fieldLabel}>Appointment date</Text><TextInput style={styles.input} placeholder="YYYY-MM-DD" value={rescheduleDate} onChangeText={setRescheduleDate}/><Text style={styles.fieldLabel}>Appointment time</Text><TextInput style={styles.input} placeholder="e.g. 10:30 AM" value={rescheduleTime} onChangeText={setRescheduleTime}/><TouchableOpacity style={styles.primaryButton} onPress={() => void saveReschedule()}><Text style={styles.primaryText}>Save Changes</Text></TouchableOpacity><TouchableOpacity style={styles.cancelButton} onPress={() => setRescheduleTarget(null)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity></View></View></Modal>
      <Modal visible={patientPickerVisible} transparent animationType="fade" onRequestClose={() => setPatientPickerVisible(false)}><View style={styles.backdrop}><View style={styles.patientPicker}><View style={styles.optionHeader}><Text style={styles.optionTitle}>Select Patient</Text><TouchableOpacity onPress={() => setPatientPickerVisible(false)}><X size={18} color="#64748B"/></TouchableOpacity></View><ScrollView>{patients.map(patient => <TouchableOpacity key={patient.id} style={styles.optionRow} onPress={() => { setPatientPickerVisible(false); setBookingPatient(patient); }}><View><Text style={styles.optionText}>{patient.full_name}</Text><Text style={styles.metaText}>{patient.patient_code || `Patient ID: ${patient.id}`} · {patient.phone || 'No phone'}</Text></View></TouchableOpacity>)}</ScrollView></View></View></Modal>
      <Modal visible={clinicPickerVisible} transparent animationType="fade" onRequestClose={() => setClinicPickerVisible(false)}><TouchableOpacity activeOpacity={1} style={styles.backdrop} onPress={() => setClinicPickerVisible(false)}><View style={styles.optionPanel}><View style={styles.optionHeader}><Text style={styles.optionTitle}>Select Clinic</Text><TouchableOpacity onPress={() => setClinicPickerVisible(false)}><X size={18} color="#64748B"/></TouchableOpacity></View><ScrollView>{assignedClinics.map(clinic => <TouchableOpacity key={clinic.id} style={styles.optionRow} onPress={async () => { setClinicPickerVisible(false); const changed = await switchClinic(Number(clinic.id)); if (!changed) showErrorToast('Clinic', 'Unable to switch clinic.'); }}><Text style={styles.optionText}>{clinic.name}</Text>{Number(clinic.id) === Number(activeClinicId) ? <Check size={17} color="#0D9488"/> : null}</TouchableOpacity>)}</ScrollView></View></TouchableOpacity></Modal>
      <PatientAppointmentModal visible={Boolean(bookingPatient)} patient={bookingPatient} clinicId={activeClinicId} token={token} onClose={() => setBookingPatient(null)} onBooked={() => { setBookingPatient(null); void loadAppointments(); }}/>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' }, content: { padding: 14, paddingBottom: 88, gap: 12 }, flex: { flex: 1, minWidth: 0 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, headingCopy: { flex: 1 }, pageTitle: { color: '#0F172A', fontSize: 20, fontWeight: '800' }, subtitle: { color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 3 },
  bookBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#0D9488', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 }, bookBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 }, clinicPill: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 12, borderRadius: 11, borderWidth: 1, borderColor: '#BFEDE8', backgroundColor: '#F5FFFE' }, clinicText: { color: '#334155', fontSize: 13, fontWeight: '600' },
  listPanel: { padding: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, gap: 10 }, panelHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, panelTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' }, iconAction: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', borderRadius: 9 }, actionText: { fontSize: 12, fontWeight: '700', color: '#334155' }, refreshed: { color: '#64748B', fontSize: 10 }, columnsButton: { minHeight: 38, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, borderRadius: 9, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  searchBox: { height: 42, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#FFF' }, searchInput: { flex: 1, minWidth: 0, paddingVertical: 0, color: '#0F172A', fontSize: 12 }, filterRow: { flexDirection: 'row', gap: 8 }, filterSelect: { flex: 1, minHeight: 40, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }, selectText: { flex: 1, color: '#334155', fontSize: 12 }, dateSelectText: { marginLeft: 2 }, dateRangeRow: { flexDirection: 'row', gap: 8 }, rangeDateTrigger: { flex: 1, minHeight: 40, paddingHorizontal: 8 }, rangeDateText: { fontSize: 11 },
  card: { padding: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDE5EC', borderRadius: 14, shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 9 }, patientMark: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#CCFBF1', backgroundColor: '#F0FDFA' }, patientBlock: { flex: 1, minWidth: 0 }, patientName: { color: '#0F172A', fontSize: 14, fontWeight: '800' }, metaText: { color: '#64748B', fontSize: 11, marginTop: 3 }, statusBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20 }, statusScheduled: { backgroundColor: '#E0F2FE' }, statusProgress: { backgroundColor: '#FEF3C7' }, statusComplete: { backgroundColor: '#D1FAE5' }, statusCancelled: { backgroundColor: '#FEE2E2' }, statusText: { color: '#0369A1', fontSize: 9, fontWeight: '800' }, moreButton: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  cardDetails: { marginTop: 10, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 8 }, detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, detailText: { flex: 1, color: '#475569', fontSize: 12, lineHeight: 17 }, reasonLabel: { width: 50, color: '#64748B', fontSize: 11, fontWeight: '700' }, modeText: { color: '#0F766E', fontSize: 11, fontWeight: '700' }, callButton: { minHeight: 39, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 9, backgroundColor: '#0D9488' }, callButtonText: { color: '#FFF', fontSize: 12, fontWeight: '800' }, empty: { alignItems: 'center', paddingVertical: 30, gap: 8 }, emptyText: { color: '#64748B', textAlign: 'center', fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.40)', justifyContent: 'center', padding: 20 }, optionPanel: { width: '100%', maxWidth: 380, alignSelf: 'center', backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, elevation: 12 }, menuPanel: { width: '100%', maxWidth: 340, alignSelf: 'center', backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, elevation: 12 }, optionHeader: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginBottom: 4 }, optionTitle: { color: '#0F172A', fontSize: 15, fontWeight: '800' }, optionRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }, optionText: { color: '#334155', fontSize: 13, fontWeight: '600' }, menuItem: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }, menuIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#F8FAFC' }, menuText: { fontSize: 13, fontWeight: '600' },
  reschedulePanel: { width: '100%', maxWidth: 380, alignSelf: 'center', padding: 16, borderRadius: 15, backgroundColor: '#FFF' }, detailsContent: { gap: 10, paddingVertical: 12 }, detailsName: { color: '#0F172A', fontSize: 16, fontWeight: '800' }, fieldLabel: { marginTop: 11, marginBottom: 5, color: '#475569', fontSize: 12, fontWeight: '700' }, input: { height: 43, paddingHorizontal: 11, borderRadius: 9, borderWidth: 1, borderColor: '#DCE4EC', color: '#0F172A' }, primaryButton: { marginTop: 17, minHeight: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#0D9488' }, primaryText: { color: '#FFF', fontWeight: '800' }, cancelButton: { marginTop: 8, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: '#E2E8F0' }, cancelText: { color: '#334155', fontWeight: '700' }, patientPicker: { maxHeight: '80%', padding: 14, backgroundColor: '#FFF', borderRadius: 14 },
});

export default AppointmentsManagerScreen;
