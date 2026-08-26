import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const NurseDashboardScreen: React.FC<Props> = ({
  onOpenDrawer,
  onOpenNotifications,
  onNavigateScreen = () => {},
}) => {
  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Nursing Station"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.heroCard}>
          <Text style={styles.heroBadge}>NURSING STATION & VITALS LOG</Text>
          <Text style={styles.heroTitle}>Patient Care & Vitals Desk</Text>
          <Text style={styles.heroSub}>Log patient blood pressure, pulse, temperature, and weight prior to doctor consultation.</Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.vitalsBtn}
          onPress={() => onNavigateScreen('patients')}>
          <Text style={styles.vitalsBtnIcon}>🩺</Text>
          <Text style={styles.vitalsBtnText}>Patient Vitals Check-in</Text>
        </TouchableOpacity>

        {/* Station KPIs */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiBox, { backgroundColor: '#f0fdf4' }]}>
            <Text style={styles.kpiNum}>12</Text>
            <Text style={styles.kpiText}>Vitals Recorded</Text>
          </View>
          <View style={[styles.kpiBox, { backgroundColor: '#fff7ed' }]}>
            <Text style={styles.kpiNum}>4</Text>
            <Text style={styles.kpiText}>Pending Vitals</Text>
          </View>
        </View>

        {/* Active Patients Queue */}
        <Text style={styles.sectionTitle}>Patients Waiting for Vitals Check</Text>
        <View style={styles.patientList}>
          {[
            { id: 1, name: 'Sunita Sharma', age: 34, gender: 'Female', doctor: 'Dr. Ramesh Sharma', status: 'Vitals Done (BP: 120/80)' },
            { id: 2, name: 'Rahul Verma', age: 45, gender: 'Male', doctor: 'Dr. Ramesh Sharma', status: 'Pending Vitals' },
            { id: 3, name: 'Pooja Gupta', age: 29, gender: 'Female', doctor: 'Dr. Ananya Roy', status: 'Pending Vitals' },
          ].map((p) => (
            <View key={p.id} style={styles.patientRow}>
              <View style={styles.nurseAvatar}>
                <Text style={styles.nurseAvatarText}>🩺</Text>
              </View>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{p.name}</Text>
                <Text style={styles.patientSub}>{p.age} yrs • {p.gender} • Assigned to {p.doctor}</Text>
                <Text style={styles.vitalsStatus}>{p.status}</Text>
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
  heroCard: { backgroundColor: '#be123c', borderRadius: 16, padding: 18, marginBottom: 16 },
  heroBadge: { color: '#fecdd3', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginVertical: 4 },
  heroSub: { color: '#ffe4e6', fontSize: 12 },
  vitalsBtn: { backgroundColor: '#0d9488', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  vitalsBtnIcon: { fontSize: 18 },
  vitalsBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  kpiBox: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  kpiNum: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  kpiText: { fontSize: 11, color: '#64748b', fontWeight: '700', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  patientList: { gap: 10 },
  patientRow: { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  nurseAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ffe4e6', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  nurseAvatarText: { fontSize: 18 },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  patientSub: { fontSize: 12, color: '#64748b', marginTop: 1 },
  vitalsStatus: { fontSize: 11, fontWeight: '800', color: '#0d9488', marginTop: 3 },
});

export default NurseDashboardScreen;
