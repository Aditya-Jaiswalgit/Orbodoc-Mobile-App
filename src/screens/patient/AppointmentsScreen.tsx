import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CalendarDays, Search, Video, X } from 'lucide-react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import { PatientPageHeading } from '../../components/common/PatientPageHeading';
import { getAppointmentsApi } from '../../api/appointmentApi';
import { useAuthContext } from '../../context/AuthContext';
import { Appointment } from '../../types/clinicTypes';
import { VideoCallRoomScreen } from '../common/VideoCallRoomScreen';
import { showErrorToast } from '../../utils/toast';

interface AppointmentsScreenProps { onOpenDrawer?: () => void }
const extractAppointments = (value: unknown): Appointment[] => {
  if (Array.isArray(value)) return value as Appointment[];
  if (value && typeof value === 'object') {
    const data = value as Record<string, any>;
    if (Array.isArray(data.appointments)) return data.appointments;
    if (Array.isArray(data.data)) return data.data;
  }
  return [];
};

export const AppointmentsScreen: React.FC<AppointmentsScreenProps> = ({ onOpenDrawer = () => {} }) => {
  const { token, user } = useAuthContext();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeCall, setActiveCall] = useState<{ appointment: Appointment; roomId: string } | null>(null);

  const loadAppointments = useCallback(async (pull = false) => {
    if (!token) { setAppointments([]); setLoading(false); return; }
    pull ? setRefreshing(true) : setLoading(true);
    try {
      const response = await getAppointmentsApi(token, 'page=1&limit=200');
      if (!response.success) throw new Error(response.message || 'Unable to load appointments.');
      setAppointments(extractAppointments(response.data).sort((a, b) =>
        new Date(`${b.appointment_date}T${b.appointment_time || '00:00:00'}`).getTime() - new Date(`${a.appointment_date}T${a.appointment_time || '00:00:00'}`).getTime(),
      ));
    } catch (error: any) {
      showErrorToast('Appointments', error?.message || 'Unable to load appointments.');
      setAppointments([]);
    } finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { void loadAppointments(); }, [loadAppointments]);

  const sortedAppointments = useMemo(() => [...appointments].sort((a, b) =>
    new Date(`${b.appointment_date}T${b.appointment_time || '00:00:00'}`).getTime() - new Date(`${a.appointment_date}T${a.appointment_time || '00:00:00'}`).getTime(),
  ), [appointments]);
  const filteredAppointments = useMemo(() => sortedAppointments.filter(item => {
    const status = String(item.status || '').trim().toLowerCase().replace(/\s+/g, '_');
    const statusMatches = statusFilter === 'all' ||
      (statusFilter === 'approved' && ['approved', 'scheduled', 'confirmed', 'pending'].includes(status)) ||
      (statusFilter === 'complete' && ['complete', 'completed'].includes(status)) ||
      (statusFilter === 'cancel' && ['cancel', 'cancelled', 'canceled'].includes(status));
    const query = search.trim().toLowerCase();
    const searchMatches = !query || [item.doctor_name, item.doctor_specialization, item.specialization, item.clinic_name, item.reason]
      .some(value => String(value || '').toLowerCase().includes(query));
    return statusMatches && searchMatches;
  }), [search, sortedAppointments, statusFilter]);
  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return appointments.filter(item => new Date(item.appointment_date).toDateString() === today).length;
  }, [appointments]);
  const joinCall = (appointment: Appointment) => {
    const roomId = String(appointment.video_room_id || '').trim();
    if (!roomId) {
      showErrorToast('Call not ready', 'Ask your doctor to start the video call, then refresh this page.');
      return;
    }
    setActiveCall({ appointment, roomId });
  };

  return (
    <View style={styles.container}>
      {activeCall && token && user ? <VideoCallRoomScreen appointment={activeCall.appointment} roomId={activeCall.roomId} callerRole="patient" userId={user.id} token={token} onClose={() => { setActiveCall(null); void loadAppointments(); }} /> : null}
      <PatientHeader onOpenDrawer={onOpenDrawer} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadAppointments(true)} tintColor="#0D9488" />}>
        <PatientPageHeading title="Appointments" subtitle="Your upcoming and past visits" icon={<CalendarDays color="#0D9488" size={21} />} />
        <View style={styles.summaryRow}><View style={styles.summaryCard}><Text style={styles.summaryNumber}>{appointments.length}</Text><Text style={styles.summaryLabel}>All appointments</Text></View><View style={styles.summaryCard}><Text style={styles.summaryNumber}>{todayCount}</Text><Text style={styles.summaryLabel}>Today's visits</Text></View></View>
        <View style={styles.searchBox}><Search size={17} color="#64748B" /><TextInput value={search} onChangeText={setSearch} placeholder="Search doctor, clinic or reason" placeholderTextColor="#94A3B8" style={styles.searchInput} />{search ? <TouchableOpacity onPress={() => setSearch('')}><X size={17} color="#64748B" /></TouchableOpacity> : null}</View>
        <View style={styles.filters}>{[['all', 'All'], ['approved', 'Approved'], ['complete', 'Complete'], ['cancel', 'Cancelled']].map(([value, label]) => <TouchableOpacity key={value} onPress={() => setStatusFilter(value)} style={[styles.filterChip, statusFilter === value && styles.filterChipActive]}><Text style={[styles.filterText, statusFilter === value && styles.filterTextActive]}>{label}</Text></TouchableOpacity>)}</View>
        {loading ? <ActivityIndicator color="#0D9488" style={{ marginTop: 28 }} /> : filteredAppointments.length ? filteredAppointments.map(item => {
          const isVideo = String(item.consultation_mode).toLowerCase() === 'video';
          const callReady = Boolean(item.video_room_id) && !item.call_ended_at && !['cancelled', 'completed'].includes(String(item.status).toLowerCase());
          return <View key={item.id} style={styles.card}>
            <View style={styles.cardTitle}><Text style={styles.doctor}>{item.doctor_name || 'Doctor'}</Text><View style={styles.videoTag}>{isVideo ? <Video size={13} color="#0D9488" /> : <CalendarDays size={13} color="#0D9488" />}<Text style={styles.videoText}>{isVideo ? 'VIDEO' : 'IN PERSON'}</Text></View></View>
            <Text style={styles.meta}>{item.appointment_date} · {item.appointment_time || item.time_slot}</Text>
            {item.doctor_specialization ? <Text style={styles.meta}>{item.doctor_specialization}</Text> : null}
            {item.clinic_name ? <Text style={styles.meta}>{item.clinic_name}</Text> : null}
            {item.reason ? <Text style={styles.meta}>Reason: {item.reason}</Text> : null}
            <Text style={styles.status}>{String(item.status || '').replace('_', ' ').toUpperCase()}</Text>
            {isVideo ? (callReady ? <TouchableOpacity style={styles.joinButton} onPress={() => joinCall(item)}><Video size={16} color="#FFF" /><Text style={styles.joinText}>Join Video Consultation</Text></TouchableOpacity> : <Text style={styles.waiting}>The doctor will start the call at your appointment time. Pull down to refresh.</Text>) : null}
          </View>;
        }) : <View style={styles.empty}><CalendarDays size={34} color="#0D9488" /><Text style={styles.emptyTitle}>No Appointments</Text><Text style={styles.meta}>{search || statusFilter !== 'all' ? 'No appointments match these filters.' : 'Your upcoming and past visits will appear here.'}</Text></View>}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' }, content: { padding: 16, gap: 12, paddingBottom: 34 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }, title: { color: '#0F172A', fontSize: 20, fontWeight: '800' }, subtitle: { color: '#64748B', fontSize: 12, marginTop: 2 },
  bookButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 11, backgroundColor: '#0D9488' }, bookText: { color: '#fff', fontSize: 13, fontWeight: '800' }, summaryRow: { flexDirection: 'row', gap: 10 }, summaryCard: { flex: 1, padding: 13, borderRadius: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDE7EE' }, summaryNumber: { color: '#0F172A', fontSize: 20, fontWeight: '800' }, summaryLabel: { color: '#64748B', fontSize: 11, marginTop: 3 }, searchBox: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDE7EE', borderRadius: 11 }, searchInput: { flex: 1, color: '#0F172A', fontSize: 13 }, filters: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' }, filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: '#DDE7EE', backgroundColor: '#fff' }, filterChipActive: { borderColor: '#0D9488', backgroundColor: '#0D9488' }, filterText: { color: '#475569', fontSize: 11, fontWeight: '700' }, filterTextActive: { color: '#fff' },
  card: { padding: 14, borderRadius: 14, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDE7EE', gap: 6 }, cardTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, doctor: { color: '#1E293B', fontSize: 15, fontWeight: '700' }, videoTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: '#E2F6F3' }, videoText: { color: '#0D9488', fontSize: 10, fontWeight: '800' }, meta: { color: '#64748B', fontSize: 12 }, status: { alignSelf: 'flex-start', marginTop: 2, color: '#0D9488', fontSize: 10, fontWeight: '800' },
  joinButton: { minHeight: 42, marginTop: 7, borderRadius: 9, backgroundColor: '#0D9488', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, joinText: { color: '#FFF', fontSize: 13, fontWeight: '700' }, waiting: { marginTop: 5, color: '#64748B', fontSize: 11, lineHeight: 16 },
  empty: { alignItems: 'center', padding: 28, gap: 10, borderRadius: 14, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' }, emptyTitle: { color: '#0F172A', fontWeight: '700', fontSize: 16 }, note: { color: '#64748B', fontSize: 11, textAlign: 'center', marginTop: 5 },
});

export default AppointmentsScreen;
