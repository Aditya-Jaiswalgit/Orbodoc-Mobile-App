import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const LabTechnicianDashboardScreen: React.FC<Props> = ({
  onOpenDrawer,
  onOpenNotifications,
  onNavigateScreen = () => {},
}) => {
  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Pathology & Diagnostics Lab"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.heroCard}>
          <Text style={styles.heroBadge}>LAB DIAGNOSTICS CONTROL</Text>
          <Text style={styles.heroTitle}>Test Orders & Sample Tracker</Text>
          <Text style={styles.heroSub}>Track sample collection, generate lab reports and attach files.</Text>
        </View>

        {/* Action Launcher */}
        <TouchableOpacity
          style={styles.labActionBtn}
          onPress={() => onNavigateScreen('lab_management')}>
          <Text style={styles.labBtnIcon}>🧪</Text>
          <Text style={styles.labBtnText}>Open Lab Test Orders Board</Text>
        </TouchableOpacity>

        {/* KPIs */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiBox, { backgroundColor: '#f0fdf4' }]}>
            <Text style={styles.kpiVal}>14</Text>
            <Text style={styles.kpiLab}>Pending Orders</Text>
          </View>
          <View style={[styles.kpiBox, { backgroundColor: '#eff6ff' }]}>
            <Text style={styles.kpiVal}>6</Text>
            <Text style={styles.kpiLab}>Samples Collected</Text>
          </View>
          <View style={[styles.kpiBox, { backgroundColor: '#faf5ff' }]}>
            <Text style={styles.kpiVal}>8</Text>
            <Text style={styles.kpiLab}>Reports Ready</Text>
          </View>
        </View>

        {/* Pending Tests List */}
        <Text style={styles.sectionTitle}>Recent Test Orders</Text>
        <View style={styles.testList}>
          {[
            { id: 101, patient: 'Sunita Sharma', test: 'Complete Blood Count (CBC)', doctor: 'Dr. Ramesh Sharma', status: 'ordered' },
            { id: 102, patient: 'Rahul Verma', test: 'Lipid Profile & HbA1c', doctor: 'Dr. Ananya Roy', status: 'sample_collected' },
            { id: 103, patient: 'Pooja Gupta', test: 'Thyroid Function (T3/T4/TSH)', doctor: 'Dr. Vikram Patel', status: 'completed' },
          ].map((t) => (
            <View key={t.id} style={styles.testRow}>
              <View style={styles.testIconBox}>
                <Text style={styles.testIcon}>🧪</Text>
              </View>
              <View style={styles.testDetails}>
                <Text style={styles.patientName}>{t.patient}</Text>
                <Text style={styles.testName}>{t.test}</Text>
                <Text style={styles.docSub}>Ordered by: {t.doctor}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{t.status.replace('_', ' ')}</Text>
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
  heroCard: { backgroundColor: '#0369a1', borderRadius: 16, padding: 18, marginBottom: 16 },
  heroBadge: { color: '#bae6fd', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginVertical: 4 },
  heroSub: { color: '#e0f2fe', fontSize: 12 },
  labActionBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  labBtnIcon: { fontSize: 18 },
  labBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  kpiGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  kpiBox: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  kpiVal: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  kpiLab: { fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  testList: { gap: 10 },
  testRow: { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  testIconBox: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  testIcon: { fontSize: 18 },
  testDetails: { flex: 1 },
  patientName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  testName: { fontSize: 12, color: '#0369a1', fontWeight: '700', marginTop: 1 },
  docSub: { fontSize: 11, color: '#64748b', marginTop: 1 },
  statusBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#334155', fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
});

export default LabTechnicianDashboardScreen;
