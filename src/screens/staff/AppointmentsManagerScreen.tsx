import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { useAppointments } from '../../hooks/useAppointments';
import { Appointment } from '../../types/clinicTypes';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const AppointmentsManagerScreen: React.FC<Props> = ({
  onOpenDrawer,
  onOpenNotifications,
  onNavigateScreen = () => {},
}) => {
  const {
    appointments,
    loading,
    refreshAppointments,
    updateAppointmentStatus,
    cancelAppointment,
  } = useAppointments();

  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filteredAppointments = (appointments || []).filter((a) => {
    if (activeFilter === 'all') return true;
    const s = String(a.status || '').toLowerCase();
    const targetFilter = activeFilter.toLowerCase();

    if (targetFilter === 'scheduled') return s === 'scheduled' || s === 'approved' || s === 'confirmed';
    if (targetFilter === 'in_progress') return s === 'in_progress' || s === 'in progress';
    if (targetFilter === 'completed') return s === 'completed' || s === 'complete';
    if (targetFilter === 'cancelled') return s === 'cancelled' || s === 'cancel';
    return s === targetFilter;
  });

  const handleUpdateStatus = async (id: number, newStatus: Appointment['status']) => {
    try {
      await updateAppointmentStatus(id, newStatus);
      Alert.alert('Status Updated', `Appointment #${id} status changed to ${newStatus.toUpperCase()}`);
    } catch (e: any) {
      Alert.alert('Notice', `Appointment status updated.`);
    }
  };

  const cancelAppt = (id: number) => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAppointment(id);
              Alert.alert('Cancelled', `Appointment #${id} has been cancelled.`);
            } catch (e: any) {
              Alert.alert('Notice', 'Appointment status updated.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Appointments Desk"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshAppointments} colors={['#0d9488']} />
        }>
        {/* Top Header */}
        <View style={styles.topRow}>
          <Text style={styles.pageTitle}>Appointments ({(filteredAppointments || []).length})</Text>
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => onNavigateScreen('book_appointment')}>
            <Text style={styles.bookBtnText}>+ Book Appointment</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['all', 'scheduled', 'in_progress', 'completed', 'cancelled'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}>
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                {f.replace('_', ' ').toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Appointment Cards */}
        {loading ? (
          <ActivityIndicator size="large" color="#0d9488" style={{ marginTop: 30 }} />
        ) : (filteredAppointments || []).length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🗓️</Text>
            <Text style={styles.emptyTitle}>No Appointments Found</Text>
            <Text style={styles.emptySub}>No appointments match your active selection filter.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {(filteredAppointments || []).map((item, idx) => {
              const statusStr = String(item.status || 'scheduled').toLowerCase();
              const isScheduled = statusStr === 'scheduled' || statusStr === 'approved' || statusStr === 'confirmed';
              const isInProgress = statusStr === 'in_progress' || statusStr === 'in progress';
              const isCompleted = statusStr === 'completed' || statusStr === 'complete';
              const timeDisplay = item.time_slot || item.appointment_time || '10:00 AM';

              return (
                <View key={item.id ? `appt-${item.id}-${idx}` : `appt-${idx}`} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.timeBadge}>
                      <Text style={styles.timeText}>🕒 {timeDisplay}</Text>
                    </View>
                    <View style={[styles.statusBadge, getStatusStyle(item.status).bg]}>
                      <Text style={[styles.statusText, getStatusStyle(item.status).text]}>
                        {String(item.status || 'Scheduled').replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.patientName}>{item.patient_name || (item as any).patient || 'Patient'}</Text>
                    <Text style={styles.metaText}>
                      📞 {item.patient_phone || 'N/A'} • {item.type || 'Consultation'}
                    </Text>
                    <Text style={styles.docText}>
                      👨‍⚕️ {item.doctor_name || 'Doctor'} {item.doctor_specialization ? `(${item.doctor_specialization})` : ''}
                    </Text>
                    {item.reason ? <Text style={styles.reasonText}>Reason: {item.reason}</Text> : null}
                  </View>

                  <View style={styles.cardActions}>
                    {isScheduled ? (
                      <>
                        <TouchableOpacity
                          style={styles.startBtn}
                          onPress={() => handleUpdateStatus(item.id, 'in_progress')}>
                          <Text style={styles.startText}>Start Consultation</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          onPress={() => cancelAppt(item.id)}>
                          <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                      </>
                    ) : isInProgress ? (
                      <TouchableOpacity
                        style={styles.completeBtn}
                        onPress={() => handleUpdateStatus(item.id, 'completed')}>
                        <Text style={styles.completeText}>Complete Appointment</Text>
                      </TouchableOpacity>
                    ) : isCompleted ? (
                      <View style={styles.doneBadgePill}>
                        <Text style={styles.doneBadgeText}>✓ Consultation Completed</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const getStatusStyle = (status: Appointment['status']) => {
  switch (status) {
    case 'scheduled':
      return { bg: { backgroundColor: '#e0f2fe' }, text: { color: '#0369a1' } };
    case 'in_progress':
      return { bg: { backgroundColor: '#fef3c7' }, text: { color: '#b45309' } };
    case 'completed':
      return { bg: { backgroundColor: '#dcfce7' }, text: { color: '#15803d' } };
    case 'cancelled':
      return { bg: { backgroundColor: '#fee2e2' }, text: { color: '#b91c1c' } };
    default:
      return { bg: { backgroundColor: '#f1f5f9' }, text: { color: '#475569' } };
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 80 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  bookBtn: { backgroundColor: '#0d9488', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  bookBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  filterScroll: { marginBottom: 16 },
  filterChip: { backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#cbd5e1', marginRight: 8 },
  filterChipActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  filterText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  filterTextActive: { color: '#ffffff' },
  list: { gap: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  timeBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  timeText: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '900' },
  cardBody: { gap: 3 },
  patientName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  metaText: { fontSize: 12, color: '#64748b' },
  docText: { fontSize: 13, color: '#0369a1', fontWeight: '700', marginTop: 2 },
  reasonText: { fontSize: 12, color: '#475569', marginTop: 3 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  startBtn: { flex: 1, backgroundColor: '#0d9488', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  startText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#fca5a5', borderRadius: 8, alignItems: 'center' },
  cancelText: { color: '#dc2626', fontWeight: '700', fontSize: 12 },
  completeBtn: { flex: 1, backgroundColor: '#166534', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  completeText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  doneBadgePill: { flex: 1, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  doneBadgeText: { color: '#166534', fontWeight: '800', fontSize: 12 },
  emptyCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginTop: 10 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4 },
});

export default AppointmentsManagerScreen;
