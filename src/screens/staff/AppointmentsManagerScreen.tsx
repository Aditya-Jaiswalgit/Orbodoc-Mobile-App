import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { Pagination } from '../../components/common/Pagination';
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
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const extractRows = <T,>(value: unknown, key: string): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== 'object') return [];
  const data = value as Record<string, any>;
  if (Array.isArray(data.data)) return data.data as T[];
  if (Array.isArray(data[key])) return data[key] as T[];
  return [];
};

export const AppointmentsManagerScreen: React.FC<Props> = ({ onOpenDrawer }) => {
  const { token, role, user, permissionsMap = {}, activeClinicId } = useAuthContext();
  const canView = canUseStaffScreen(role, permissionsMap, 'appointments', 'view');
  const canAdd = canUseStaffScreen(role, permissionsMap, 'appointments', 'add');
  const canEdit = canUseStaffScreen(role, permissionsMap, 'appointments', 'edit');
  const canDelete = canUseStaffScreen(role, permissionsMap, 'appointments', 'delete');
  const canExecute = canUseStaffScreen(role, permissionsMap, 'appointments', 'execute');
  const canExecuteVideo = canUseStaffScreen(role, permissionsMap, 'video_services', 'execute');
  const canViewPatients = canUseStaffScreen(role, permissionsMap, 'patients', 'view');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<PatientModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [patientPickerVisible, setPatientPickerVisible] = useState(false);
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
    } catch (error: any) {
      showErrorToast('Appointments', error?.message || 'Unable to load appointments.');
      setAppointments([]);
    } finally { setLoading(false); }
  }, [activeClinicId, canView, token]);

  useEffect(() => { void loadAppointments(); }, [loadAppointments]);

  const openBooking = async () => {
    if (!canAdd) return;
    if (!canViewPatients) {
      showErrorToast('Permission denied', 'Patient read permission is required to choose a patient.');
      return;
    }
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
      showSuccessToast('Appointment updated', `Status changed to ${status.replace('_', ' ')}.`);
      await loadAppointments();
    } catch (error: any) { showErrorToast('Update failed', error?.message || 'Unable to update appointment.'); }
  };

  const cancelAppointment = (appointment: Appointment) => {
    if (!canDelete || !token) return;
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

  const sendReminder = async (appointment: Appointment) => {
    if (!canExecute || !token) return;
    try {
      const response = await sendAppointmentReminderApi(token, appointment.id);
      if (!response.success) throw new Error(response.message || 'Unable to send reminder.');
      showSuccessToast('Reminder sent', `Reminder sent for ${appointment.patient_name}.`);
    } catch (error: any) { showErrorToast('Reminder failed', error?.message || 'Unable to send reminder.'); }
  };

  const startVideoCall = async (appointment: Appointment, allowInsufficientBalance = false) => {
    if (!canExecuteVideo || !token || startingCallId) return;
    setStartingCallId(appointment.id);
    try {
      const response = await apiFetch<{ videoRoomId?: string; warning?: string }>(`/appointments/${appointment.id}/start-call`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(allowInsufficientBalance ? { allow_insufficient_balance: true } : {}),
      });
      if (!response.success && response.error === 'HTTP_402') {
        Alert.alert('Wallet balance is low', 'Start this call with payment marked pending?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => { void startVideoCall(appointment, true); } },
        ]);
        return;
      }
      if (!response.success) throw new Error(response.message || 'Unable to start video consultation.');
      const roomId = String(response.data?.videoRoomId || appointment.video_room_id || '').trim();
      if (!roomId) throw new Error('The server did not return a video room. Please refresh and try again.');
      setActiveVideoCall({ appointment, roomId });
      void loadAppointments();
    } catch (error: any) {
      showErrorToast('Video call', error?.message || 'Unable to start video consultation.');
    } finally { setStartingCallId(null); }
  };

  const filtered = useMemo(() => filter === 'all' ? appointments : appointments.filter(item => item.status === filter), [appointments, filter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <View style={styles.container}>
      {activeVideoCall && token && user ? <VideoCallRoomScreen appointment={activeVideoCall.appointment} roomId={activeVideoCall.roomId} callerRole="doctor" userId={user.id} token={token} onClose={() => { setActiveVideoCall(null); void loadAppointments(); }} /> : null}
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Appointments Desk" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.pageTitle}>Appointments ({filtered.length})</Text>
          {canAdd ? <TouchableOpacity style={styles.bookBtn} onPress={() => void openBooking()}><Text style={styles.bookBtnText}>+ Book Appointment</Text></TouchableOpacity> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(['all', 'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'] as Filter[]).map(value => (
            <TouchableOpacity key={value} style={[styles.filterChip, filter === value && styles.filterChipActive]} onPress={() => { setFilter(value); setCurrentPage(1); }}>
              <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{value.replace('_', ' ').toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {loading ? <ActivityIndicator color="#0D9488" style={{ marginTop: 28 }} /> : pageRows.length ? pageRows.map(item => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.patientName}>{item.patient_name}</Text>
              <Text style={[styles.statusBadge, styles.statusText]}>{item.status.replace('_', ' ').toUpperCase()}</Text>
            </View>
            <Text style={styles.metaText}>{item.appointment_date} · {item.appointment_time || item.time_slot}</Text>
            <Text style={styles.docText}>{item.doctor_name}{item.doctor_specialization ? ` · ${item.doctor_specialization}` : ''}</Text>
            {item.patient_phone ? <Text style={styles.metaText}>{item.patient_phone}</Text> : null}
            {item.reason ? <Text style={styles.reasonText}>Reason: {item.reason}</Text> : null}
            {(canEdit || canDelete || canExecute || canExecuteVideo) && !['cancelled', 'completed'].includes(item.status) ? <View style={styles.cardActions}>
              {String(item.consultation_mode).toLowerCase() === 'video' && canExecuteVideo && item.status === 'scheduled' ? <TouchableOpacity disabled={startingCallId === item.id} style={styles.startBtn} onPress={() => void startVideoCall(item)}><Text style={styles.startText}>{startingCallId === item.id ? 'Starting…' : 'Start Video Call'}</Text></TouchableOpacity> : null}
              {canEdit && item.status === 'scheduled' && String(item.consultation_mode).toLowerCase() !== 'video' ? <TouchableOpacity style={styles.startBtn} onPress={() => void updateStatus(item, 'in_progress')}><Text style={styles.startText}>Start</Text></TouchableOpacity> : null}
              {canEdit && item.status === 'in_progress' ? <TouchableOpacity style={styles.startBtn} onPress={() => void updateStatus(item, 'completed')}><Text style={styles.startText}>Complete</Text></TouchableOpacity> : null}
              {canExecute ? <TouchableOpacity style={styles.secondaryBtn} onPress={() => void sendReminder(item)}><Text style={styles.secondaryText}>Send Reminder</Text></TouchableOpacity> : null}
              {canDelete && item.status !== 'in_progress' ? <TouchableOpacity style={styles.cancelBtn} onPress={() => cancelAppointment(item)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity> : null}
            </View> : null}
          </View>
        )) : <Text style={styles.emptyText}>{canView ? 'No appointments found.' : 'You do not have permission to view appointments.'}</Text>}
        {filtered.length ? <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} /> : null}
      </ScrollView>
      <Modal visible={patientPickerVisible} transparent animationType="fade" onRequestClose={() => setPatientPickerVisible(false)}>
        <View style={styles.pickerBackdrop}><View style={styles.pickerCard}>
          <Text style={styles.pickerTitle}>Select Patient</Text>
          <ScrollView>{patients.map(patient => <TouchableOpacity key={patient.id} style={styles.patientOption} onPress={() => { setPatientPickerVisible(false); setBookingPatient(patient); }}><Text style={styles.patientName}>{patient.full_name}</Text><Text style={styles.metaText}>{patient.patient_code || `Patient ID: ${patient.id}`} · {patient.phone || 'No phone'}</Text></TouchableOpacity>)}</ScrollView>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPatientPickerVisible(false)}><Text style={styles.secondaryText}>Close</Text></TouchableOpacity>
        </View></View>
      </Modal>
      <PatientAppointmentModal visible={Boolean(bookingPatient)} patient={bookingPatient} clinicId={activeClinicId} token={token} onClose={() => setBookingPatient(null)} onBooked={() => { setBookingPatient(null); void loadAppointments(); }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' }, content: { padding: 16, paddingBottom: 80, gap: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, pageTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  bookBtn: { backgroundColor: '#0D9488', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9 }, bookBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  filterScroll: { maxHeight: 40 }, filterChip: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#CBD5E1', marginRight: 8 }, filterChipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' }, filterText: { fontSize: 10, fontWeight: '800', color: '#475569' }, filterTextActive: { color: '#FFF' },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }, cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }, patientName: { fontSize: 15, fontWeight: '800', color: '#0F172A' }, statusBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 }, statusText: { fontSize: 10, fontWeight: '800', color: '#0369A1', overflow: 'hidden' }, metaText: { fontSize: 12, color: '#64748B', marginTop: 3 }, docText: { fontSize: 13, color: '#0D9488', fontWeight: '700', marginTop: 4 }, reasonText: { fontSize: 12, color: '#475569', marginTop: 5 },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' }, startBtn: { backgroundColor: '#0D9488', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 }, startText: { color: '#FFF', fontWeight: '800', fontSize: 12 }, secondaryBtn: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, alignItems: 'center' }, secondaryText: { color: '#334155', fontWeight: '700', fontSize: 12 }, cancelBtn: { borderWidth: 1, borderColor: '#FCA5A5', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 }, cancelText: { color: '#DC2626', fontWeight: '700', fontSize: 12 }, emptyText: { color: '#64748B', textAlign: 'center', paddingVertical: 32 },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 20 }, pickerCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, maxHeight: '80%', gap: 10 }, pickerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' }, patientOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
});

export default AppointmentsManagerScreen;
