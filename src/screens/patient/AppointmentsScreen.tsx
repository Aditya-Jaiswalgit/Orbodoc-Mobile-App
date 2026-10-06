import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CalendarDays, Video } from 'lucide-react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
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

  const videoAppointments = useMemo(() => appointments.filter(item => String(item.consultation_mode).toLowerCase() === 'video'), [appointments]);
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
        <View style={styles.heading}><CalendarDays color="#0D9488" size={22} /><View style={{ flex: 1 }}><Text style={styles.title}>Appointments</Text><Text style={styles.subtitle}>Your upcoming and past visits</Text></View></View>
        {loading ? <ActivityIndicator color="#0D9488" style={{ marginTop: 28 }} /> : videoAppointments.length ? videoAppointments.map(item => {
          const callReady = Boolean(item.video_room_id) && !item.call_ended_at && !['cancelled', 'completed'].includes(String(item.status).toLowerCase());
          return <View key={item.id} style={styles.card}>
            <View style={styles.cardTitle}><Text style={styles.doctor}>{item.doctor_name || 'Doctor'}</Text><View style={styles.videoTag}><Video size={13} color="#0D9488" /><Text style={styles.videoText}>VIDEO</Text></View></View>
            <Text style={styles.meta}>{item.appointment_date} · {item.appointment_time || item.time_slot}</Text>
            {item.doctor_specialization ? <Text style={styles.meta}>{item.doctor_specialization}</Text> : null}
            <Text style={styles.status}>{String(item.status || '').replace('_', ' ').toUpperCase()}</Text>
            {callReady ? <TouchableOpacity style={styles.joinButton} onPress={() => joinCall(item)}><Video size={16} color="#FFF" /><Text style={styles.joinText}>Join Video Consultation</Text></TouchableOpacity> : <Text style={styles.waiting}>The doctor will start the call at your appointment time. Pull down to refresh.</Text>}
          </View>;
        }) : <View style={styles.empty}><Video size={34} color="#0D9488" /><Text style={styles.emptyTitle}>No Video Consultations</Text><Text style={styles.meta}>Video appointments will appear here after they are booked.</Text></View>}
        {appointments.some(item => String(item.consultation_mode).toLowerCase() !== 'video') ? <Text style={styles.note}>In-person appointments are listed in your clinic's appointment records.</Text> : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' }, content: { padding: 16, gap: 12, paddingBottom: 34 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }, title: { color: '#0F172A', fontSize: 20, fontWeight: '800' }, subtitle: { color: '#64748B', fontSize: 12, marginTop: 2 },
  card: { padding: 14, borderRadius: 14, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDE7EE', gap: 6 }, cardTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, doctor: { color: '#1E293B', fontSize: 15, fontWeight: '700' }, videoTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: '#E2F6F3' }, videoText: { color: '#0D9488', fontSize: 10, fontWeight: '800' }, meta: { color: '#64748B', fontSize: 12 }, status: { alignSelf: 'flex-start', marginTop: 2, color: '#0D9488', fontSize: 10, fontWeight: '800' },
  joinButton: { minHeight: 42, marginTop: 7, borderRadius: 9, backgroundColor: '#0D9488', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, joinText: { color: '#FFF', fontSize: 13, fontWeight: '700' }, waiting: { marginTop: 5, color: '#64748B', fontSize: 11, lineHeight: 16 },
  empty: { alignItems: 'center', padding: 28, gap: 10, borderRadius: 14, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' }, emptyTitle: { color: '#0F172A', fontWeight: '700', fontSize: 16 }, note: { color: '#64748B', fontSize: 11, textAlign: 'center', marginTop: 5 },
});

export default AppointmentsScreen;
