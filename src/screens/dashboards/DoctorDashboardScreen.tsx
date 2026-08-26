import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { useAuthContext } from '../../context/AuthContext';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const DoctorDashboardScreen: React.FC<Props> = ({
  onOpenDrawer,
  onOpenNotifications,
  onNavigateScreen = () => {},
}) => {
  const { user } = useAuthContext();
  const doctorName = user?.fullName || user?.full_name || 'Dr. Ramesh Sharma';

  const [appointments, setAppointments] = useState([
    { id: 1, patient: 'Sunita Sharma', age: 34, gender: 'Female', time: '10:00 AM', type: 'Consultation', status: 'in_progress', reason: 'Chest pain & hypertension checkup' },
    { id: 2, patient: 'Rahul Verma', age: 45, gender: 'Male', time: '10:30 AM', type: 'Follow Up', status: 'scheduled', reason: 'Blood pressure review' },
    { id: 3, patient: 'Pooja Gupta', age: 29, gender: 'Female', time: '11:00 AM', type: 'Emergency', status: 'scheduled', reason: 'Acute migraine' },
    { id: 4, patient: 'Vikram Singh', age: 52, gender: 'Male', time: '11:30 AM', type: 'Consultation', status: 'scheduled', reason: 'ECG report evaluation' },
    { id: 5, patient: 'Amit Kumar', age: 38, gender: 'Male', time: '09:30 AM', type: 'Consultation', status: 'completed', reason: 'Routine health checkup' },
  ]);

  const markStatus = (id: number, newStatus: string) => {
    setAppointments(prev =>
      prev.map(a => (a.id === id ? { ...a, status: newStatus as any } : a))
    );
  };

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Doctor Workspace"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroGreeting}>Welcome back,</Text>
          <Text style={styles.heroName}>{doctorName}</Text>
          <Text style={styles.heroSub}>Cardiology & General Medicine Specialist</Text>
        </View>

        {/* Quick KPI Stats */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiBox, { backgroundColor: '#f0fdf4' }]}>
            <Text style={styles.kpiNum}>5</Text>
            <Text style={styles.kpiText}>Today's Queue</Text>
          </View>
          <View style={[styles.kpiBox, { backgroundColor: '#eff6ff' }]}>
            <Text style={styles.kpiNum}>1</Text>
            <Text style={styles.kpiText}>In Progress</Text>
          </View>
          <View style={[styles.kpiBox, { backgroundColor: '#faf5ff' }]}>
            <Text style={styles.kpiNum}>1</Text>
            <Text style={styles.kpiText}>Completed</Text>
          </View>
        </View>

        {/* Quick Action Button */}
        <TouchableOpacity
          style={styles.rxBtn}
          activeOpacity={0.8}
          onPress={() => onNavigateScreen('prescriptions')}>
          <Text style={styles.rxBtnIcon}>💊</Text>
          <Text style={styles.rxBtnText}>Create New Prescription</Text>
        </TouchableOpacity>

        {/* Appointments Queue */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Patients Schedule</Text>
          <TouchableOpacity onPress={() => onNavigateScreen('appointments')}>
            <Text style={styles.viewAllText}>View Calendar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.apptList}>
          {appointments.map((item) => (
            <View key={item.id} style={styles.apptCard}>
              <View style={styles.timeCol}>
                <Text style={styles.timeText}>{item.time}</Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{item.type}</Text>
                </View>
              </View>

              <View style={styles.patientCol}>
                <Text style={styles.patientName}>{item.patient}</Text>
                <Text style={styles.patientSub}>{item.age} yrs • {item.gender}</Text>
                <Text style={styles.reasonText}>Reason: {item.reason}</Text>
              </View>

              <View style={styles.actionCol}>
                {item.status === 'in_progress' ? (
                  <TouchableOpacity
                    style={styles.inProgressBtn}
                    onPress={() => onNavigateScreen('prescriptions')}>
                    <Text style={styles.inProgressText}>✍️ Write Rx</Text>
                  </TouchableOpacity>
                ) : item.status === 'scheduled' ? (
                  <TouchableOpacity
                    style={styles.startBtn}
                    onPress={() => markStatus(item.id, 'in_progress')}>
                    <Text style={styles.startText}>▶ Start</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedText}>✓ Done</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 80 },
  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  heroGreeting: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  heroName: { color: '#ffffff', fontSize: 22, fontWeight: '800', marginVertical: 2 },
  heroSub: { color: '#14b8a6', fontSize: 13, fontWeight: '600' },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  kpiBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiNum: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  kpiText: { fontSize: 11, color: '#64748b', fontWeight: '700', marginTop: 2 },
  rxBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    elevation: 3,
  },
  rxBtnIcon: { fontSize: 18 },
  rxBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  viewAllText: { fontSize: 13, color: '#0d9488', fontWeight: '700' },
  apptList: { gap: 12 },
  apptCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timeCol: { width: 75, borderRightWidth: 1, borderRightColor: '#f1f5f9', paddingRight: 8 },
  timeText: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  typeBadge: { backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 2, marginTop: 4 },
  typeText: { fontSize: 9, fontWeight: '700', color: '#475569' },
  patientCol: { flex: 1, paddingHorizontal: 10 },
  patientName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  patientSub: { fontSize: 11, color: '#64748b', marginTop: 1 },
  reasonText: { fontSize: 11, color: '#0d9488', marginTop: 4, fontWeight: '600' },
  actionCol: { alignItems: 'flex-end' },
  startBtn: { backgroundColor: '#0d9488', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  startText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  inProgressBtn: { backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  inProgressText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  completedBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  completedText: { color: '#166534', fontSize: 12, fontWeight: '800' },
});

export default DoctorDashboardScreen;
