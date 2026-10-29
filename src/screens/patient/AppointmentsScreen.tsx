import { colors, radii, spacing, typography } from '../../theme/tokens';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CalendarDays, Search, Video, X } from 'lucide-react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import { PatientPageHeading } from '../../components/common/PatientPageHeading';
import { LiquidBorderSurface } from '../../components/common/LiquidBorderSurface';
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

  const filteredAppointments = useMemo(() => appointments.filter(item => {
    const status = String(item.status || '').trim().toLowerCase().replace(/\s+/g, '_');
    const statusMatches = statusFilter === 'all' ||
      (statusFilter === 'approved' && ['approved', 'scheduled', 'confirmed', 'pending'].includes(status)) ||
      (statusFilter === 'complete' && ['complete', 'completed'].includes(status)) ||
      (statusFilter === 'cancel' && ['cancel', 'cancelled', 'canceled'].includes(status));
    const query = search.trim().toLowerCase();
    const searchMatches = !query || [item.doctor_name, item.doctor_specialization, item.specialization, item.clinic_name, item.reason]
      .some(value => String(value || '').toLowerCase().includes(query));
    return statusMatches && searchMatches;
  }), [appointments, search, statusFilter]);
  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return appointments.filter(item => new Date(item.appointment_date).toDateString() === today).length;
  }, [appointments]);
  const joinCall = useCallback((appointment: Appointment) => {
    const roomId = String(appointment.video_room_id || '').trim();
    if (!roomId) {
      showErrorToast('Call not ready', 'Ask your doctor to start the video call, then refresh this page.');
      return;
    }
    setActiveCall({ appointment, roomId });
  }, []);

  const renderAppointment = useCallback(({ item }: { item: Appointment }) => {
    const isVideo = String(item.consultation_mode).toLowerCase() === 'video';
    const callReady = Boolean(item.video_room_id) && !item.call_ended_at && !['cancelled', 'completed'].includes(String(item.status).toLowerCase());
    return <LiquidBorderSurface style={styles.card} radius={16}>
      <View style={styles.cardTitle}><Text style={styles.doctor}>{item.doctor_name || 'Doctor'}</Text><View style={styles.videoTag}>{isVideo ? <Video size={13} color={colors.primary} /> : <CalendarDays size={13} color={colors.primary} />}<Text style={styles.videoText}>{isVideo ? 'VIDEO' : 'IN PERSON'}</Text></View></View>
      <Text style={styles.meta}>{item.appointment_date} · {item.appointment_time || item.time_slot}</Text>
      {item.doctor_specialization ? <Text style={styles.meta}>{item.doctor_specialization}</Text> : null}
      {item.clinic_name ? <Text style={styles.meta}>{item.clinic_name}</Text> : null}
      {item.reason ? <Text style={styles.meta}>Reason: {item.reason}</Text> : null}
      <Text style={styles.status}>{String(item.status || '').replace('_', ' ').toUpperCase()}</Text>
      {isVideo ? (callReady ? <TouchableOpacity style={styles.joinButton} onPress={() => joinCall(item)}><Video size={16} color={colors.surface} /><Text style={styles.joinText}>Join Video Consultation</Text></TouchableOpacity> : <Text style={styles.waiting}>The doctor will start the call at your appointment time. Pull down to refresh.</Text>) : null}
    </LiquidBorderSurface>;
  }, [joinCall]);

  const listHeader = useMemo(() => <View style={{ gap: spacing.md }}>
    <PatientPageHeading title="Appointments" subtitle="Your upcoming and past visits" icon={<CalendarDays color={colors.primary} size={21} />} />
    <View style={styles.summaryRow}><LiquidBorderSurface style={styles.summaryCard} radius={12}><Text style={styles.summaryNumber}>{appointments.length}</Text><Text style={styles.summaryLabel}>All appointments</Text></LiquidBorderSurface><LiquidBorderSurface style={styles.summaryCard} radius={12}><Text style={styles.summaryNumber}>{todayCount}</Text><Text style={styles.summaryLabel}>Today's visits</Text></LiquidBorderSurface></View>
    <View style={styles.searchBox}><Search size={17} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Search doctor, clinic or reason" placeholderTextColor={colors.subtle} style={styles.searchInput} />{search ? <TouchableOpacity onPress={() => setSearch('')}><X size={17} color={colors.muted} /></TouchableOpacity> : null}</View>
    <View style={styles.filters}>{[['all', 'All'], ['approved', 'Approved'], ['complete', 'Complete'], ['cancel', 'Cancelled']].map(([value, label]) => <TouchableOpacity key={value} onPress={() => setStatusFilter(value)} style={[styles.filterChip, statusFilter === value && styles.filterChipActive]}><Text style={[styles.filterText, statusFilter === value && styles.filterTextActive]}>{label}</Text></TouchableOpacity>)}</View>
  </View>, [appointments.length, search, statusFilter, todayCount]);

  const emptyState = useMemo(() => loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 28 }} /> : <View style={styles.empty}><CalendarDays size={34} color={colors.primary} /><Text style={styles.emptyTitle}>No Appointments</Text><Text style={styles.meta}>{search || statusFilter !== 'all' ? 'No appointments match these filters.' : 'Your upcoming and past visits will appear here.'}</Text></View>, [loading, search, statusFilter]);

  return (
    <View style={styles.container}>
      {activeCall && token && user ? <VideoCallRoomScreen appointment={activeCall.appointment} roomId={activeCall.roomId} callerRole="patient" userId={user.id} token={token} onClose={() => { setActiveCall(null); void loadAppointments(); }} /> : null}
      <PatientHeader onOpenDrawer={onOpenDrawer} />
      <FlatList
        data={loading ? [] : filteredAppointments}
        keyExtractor={item => String(item.id)}
        renderItem={renderAppointment}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyState}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadAppointments(true)} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 34 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.xs }, title: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.title, fontWeight: typography.weight.extrabold }, subtitle: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.body, marginTop: 2 },
  bookButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: 11, backgroundColor: colors.primary }, bookText: { fontFamily: typography.family, color: colors.surface, fontSize: typography.size.caption, fontWeight: typography.weight.extrabold }, summaryRow: { flexDirection: 'row', gap: 10 }, summaryCard: { flex: 1, padding: 13, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#DDE7EE' }, summaryNumber: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.title, fontWeight: typography.weight.extrabold }, summaryLabel: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.xs, marginTop: 3 }, searchBox: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#DDE7EE', borderRadius: 11 }, searchInput: { fontFamily: typography.family, flex: 1, color: colors.text, fontSize: typography.size.caption }, filters: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' }, filterChip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: '#DDE7EE', backgroundColor: colors.surface }, filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primary }, filterText: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.xs, fontWeight: typography.weight.bold }, filterTextActive: { color: colors.surface },
  card: { padding: 14, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#DDE7EE', gap: spacing.tiny }, cardTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, doctor: { fontFamily: typography.family, color: colors.foreground, fontSize: 15, fontWeight: typography.weight.bold }, videoTag: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 20, backgroundColor: '#E2F6F3' }, videoText: { fontFamily: typography.family, color: colors.primary, fontSize: typography.size.micro, fontWeight: typography.weight.extrabold }, meta: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.sm }, status: { fontFamily: typography.family, alignSelf: 'flex-start', marginTop: 2, color: colors.primary, fontSize: typography.size.micro, fontWeight: typography.weight.extrabold },
  joinButton: { minHeight: 42, marginTop: 7, borderRadius: 9, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }, joinText: { fontFamily: typography.family, color: colors.surface, fontSize: typography.size.caption, fontWeight: typography.weight.bold }, waiting: { fontFamily: typography.family, marginTop: 5, color: colors.muted, fontSize: typography.size.xs, lineHeight: 16 },
  empty: { alignItems: 'center', padding: 28, gap: 10, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, emptyTitle: { fontFamily: typography.family, color: colors.text, fontWeight: typography.weight.bold, fontSize: typography.size.subtitle }, note: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.xs, textAlign: 'center', marginTop: 5 },
});

export default AppointmentsScreen;
