import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { Appointment } from '../../types/clinicTypes';

interface Props {
  onOpenDrawer: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const AppointmentsManagerScreen: React.FC<Props> = ({
  onOpenDrawer,
  onNavigateScreen = () => {},
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([
    { id: 1, clinic_id: 1, patient_id: 1, doctor_id: 1, patient_name: 'Sunita Sharma', patient_phone: '9876543210', doctor_name: 'Dr. Ramesh Sharma', doctor_specialization: 'Cardiology', appointment_date: '2025-01-15', time_slot: '10:00 AM', type: 'consultation', status: 'in_progress', reason: 'Chest pain evaluation' },
    { id: 2, clinic_id: 1, patient_id: 2, doctor_id: 1, patient_name: 'Rahul Verma', patient_phone: '9811223344', doctor_name: 'Dr. Ramesh Sharma', doctor_specialization: 'Cardiology', appointment_date: '2025-01-15', time_slot: '10:30 AM', type: 'follow_up', status: 'scheduled', reason: 'BP medication review' },
    { id: 3, clinic_id: 1, patient_id: 3, doctor_id: 2, patient_name: 'Pooja Gupta', patient_phone: '9900112233', doctor_name: 'Dr. Ananya Roy', doctor_specialization: 'Pediatrics', appointment_date: '2025-01-15', time_slot: '11:00 AM', type: 'emergency', status: 'scheduled', reason: 'High fever' },
    { id: 4, clinic_id: 1, patient_id: 4, doctor_id: 1, patient_name: 'Vikram Singh', patient_phone: '9711002233', doctor_name: 'Dr. Ramesh Sharma', doctor_specialization: 'Cardiology', appointment_date: '2025-01-15', time_slot: '11:30 AM', type: 'consultation', status: 'scheduled', reason: 'ECG review' },
    { id: 5, clinic_id: 1, patient_id: 5, doctor_id: 2, patient_name: 'Amit Kumar', patient_phone: '9822334455', doctor_name: 'Dr. Ananya Roy', doctor_specialization: 'Pediatrics', appointment_date: '2025-01-15', time_slot: '09:30 AM', type: 'consultation', status: 'completed', reason: 'Routine checkup' },
  ]);

  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filteredAppointments = activeFilter === 'all'
    ? appointments
    : appointments.filter(a => a.status === activeFilter);

  const updateStatus = (id: number, newStatus: Appointment['status']) => {
    setAppointments(prev =>
      prev.map(a => (a.id === id ? { ...a, status: newStatus } : a))
    );
    Alert.alert('Status Updated', `Appointment #${id} status changed to ${newStatus.toUpperCase()}`);
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
          onPress: () => updateStatus(id, 'cancelled'),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Appointments Desk" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.topRow}>
          <Text style={styles.pageTitle}>Appointments ({filteredAppointments.length})</Text>
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => onNavigateScreen('book_appointment')}>
            <Text style={styles.bookBtnText}>+ Book Appointment</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['all', 'scheduled', 'in_progress', 'completed', 'cancelled'].map(f => (
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
        <View style={styles.list}>
          {filteredAppointments.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.timeBadge}>
                  <Text style={styles.timeText}>🕒 {item.time_slot}</Text>
                </View>
                <View style={[styles.statusBadge, getStatusStyle(item.status).bg]}>
                  <Text style={[styles.statusText, getStatusStyle(item.status).text]}>
                    {item.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.patientName}>{item.patient_name}</Text>
                <Text style={styles.metaText}>📞 {item.patient_phone} • {item.type}</Text>
                <Text style={styles.docText}>👨‍⚕️ {item.doctor_name} ({item.doctor_specialization})</Text>
                <Text style={styles.reasonText}>Reason: {item.reason}</Text>
              </View>

              <View style={styles.cardActions}>
                {item.status === 'scheduled' ? (
                  <>
                    <TouchableOpacity
                      style={styles.startBtn}
                      onPress={() => updateStatus(item.id, 'in_progress')}>
                      <Text style={styles.startText}>Start Consultation</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => cancelAppt(item.id)}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                ) : item.status === 'in_progress' ? (
                  <TouchableOpacity
                    style={styles.completeBtn}
                    onPress={() => updateStatus(item.id, 'completed')}>
                    <Text style={styles.completeText}>Complete Appointment</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))}
        </View>
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
});

export default AppointmentsManagerScreen;
