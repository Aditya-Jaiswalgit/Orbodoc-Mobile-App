import React, { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TestTube2 } from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { useLabTests } from '../../hooks/useLabTests';

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
  const { labTests, activeCount, reportsCount, loading, error, refreshLabTests } = useLabTests();
  const pendingCount = useMemo(
    () => labTests.filter((test) => ['ordered', 'pending'].includes(String(test.status || '').toLowerCase())).length,
    [labTests],
  );
  const recentTests = useMemo(() => labTests.slice(0, 6), [labTests]);

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Pathology & Diagnostics Lab"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshLabTests} colors={['#0d9488']} />}>
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
            <Text style={styles.kpiVal}>{pendingCount}</Text>
            <Text style={styles.kpiLab}>Pending Orders</Text>
          </View>
          <View style={[styles.kpiBox, { backgroundColor: '#eff6ff' }]}>
            <Text style={styles.kpiVal}>{activeCount}</Text>
            <Text style={styles.kpiLab}>Samples Collected</Text>
          </View>
          <View style={[styles.kpiBox, { backgroundColor: '#faf5ff' }]}>
            <Text style={styles.kpiVal}>{reportsCount}</Text>
            <Text style={styles.kpiLab}>Reports Ready</Text>
          </View>
        </View>

        {/* Pending Tests List */}
        <Text style={styles.sectionTitle}>Recent Test Orders</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {loading && labTests.length === 0 ? (
          <ActivityIndicator color="#0d9488" size="large" style={{ marginVertical: 28 }} />
        ) : recentTests.length === 0 ? (
          <View style={styles.emptyState}>
            <TestTube2 color="#94a3b8" size={28} />
            <Text style={styles.emptyStateText}>No lab test orders yet.</Text>
          </View>
        ) : (
        <View style={styles.testList}>
          {recentTests.map((t) => (
            <View key={t.id} style={styles.testRow}>
              <View style={styles.testIconBox}>
                <Text style={styles.testIcon}>🧪</Text>
              </View>
              <View style={styles.testDetails}>
                <Text style={styles.patientName}>{t.patient_name || 'Patient'}</Text>
                <Text style={styles.testName}>{t.test_name || 'Diagnostic test'}</Text>
                <Text style={styles.docSub}>Ordered by: {t.doctor_name || 'Doctor'}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{String(t.status || 'pending').replace('_', ' ')}</Text>
              </View>
            </View>
          ))}
        </View>
        )}
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
  errorText: { color: '#b91c1c', fontSize: 12, marginBottom: 12 },
  emptyState: { alignItems: 'center', gap: 10, paddingVertical: 32, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyStateText: { color: '#64748b', fontSize: 13 },
});

export default LabTechnicianDashboardScreen;
