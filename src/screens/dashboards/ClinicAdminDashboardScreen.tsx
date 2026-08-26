import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const ClinicAdminDashboardScreen: React.FC<Props> = ({
  onOpenDrawer,
  onOpenNotifications,
  onNavigateScreen = () => {},
}) => {
  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Clinic Admin Workspace"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Clinic Info Header */}
        <View style={styles.clinicBanner}>
          <Text style={styles.clinicCode}>CLINIC ID #101</Text>
          <Text style={styles.clinicTitle}>Arogya Super Specialty Clinic</Text>
          <Text style={styles.clinicSubtitle}>Multi-specialty OPD, Pharmacy & Diagnostics</Text>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <TouchableOpacity
            style={[styles.kpiCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}
            onPress={() => onNavigateScreen('appointments')}>
            <Text style={styles.kpiIcon}>📅</Text>
            <Text style={styles.kpiValue}>32</Text>
            <Text style={styles.kpiLabel}>Today's Appointments</Text>
            <Text style={styles.kpiSub}>24 Scheduled • 8 Completed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}
            onPress={() => onNavigateScreen('staff')}>
            <Text style={styles.kpiIcon}>👨‍⚕️</Text>
            <Text style={styles.kpiValue}>12</Text>
            <Text style={styles.kpiLabel}>Active Staff</Text>
            <Text style={styles.kpiSub}>6 Doctors on duty</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCard, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}
            onPress={() => onNavigateScreen('treatment_billing')}>
            <Text style={styles.kpiIcon}>💳</Text>
            <Text style={styles.kpiValue}>₹48,500</Text>
            <Text style={styles.kpiLabel}>Today's Billing</Text>
            <Text style={styles.kpiSub}>Treatment & Pharmacy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCard, { backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }]}
            onPress={() => onNavigateScreen('pharmacy_inventory')}>
            <Text style={styles.kpiIcon}>💊</Text>
            <Text style={styles.kpiValue}>5</Text>
            <Text style={styles.kpiLabel}>Low Stock Alert</Text>
            <Text style={styles.kpiSub}>Action required</Text>
          </TouchableOpacity>
        </View>

        {/* Operations Quick Access */}
        <Text style={styles.sectionTitle}>Management Controls</Text>
        <View style={styles.gridNav}>
          <TouchableOpacity style={styles.navTile} onPress={() => onNavigateScreen('staff')}>
            <Text style={styles.tileIcon}>👨‍⚕️</Text>
            <Text style={styles.tileLabel}>Manage Staff</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navTile} onPress={() => onNavigateScreen('patients')}>
            <Text style={styles.tileIcon}>👥</Text>
            <Text style={styles.tileLabel}>Patients Directory</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navTile} onPress={() => onNavigateScreen('treatment_billing')}>
            <Text style={styles.tileIcon}>💰</Text>
            <Text style={styles.tileLabel}>Billing Desk</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navTile} onPress={() => onNavigateScreen('audit_logs')}>
            <Text style={styles.tileIcon}>📋</Text>
            <Text style={styles.tileLabel}>Audit Trail</Text>
          </TouchableOpacity>
        </View>

        {/* Live Doctor Schedules */}
        <Text style={styles.sectionTitle}>Doctors On Duty Today</Text>
        <View style={styles.doctorList}>
          {[
            { id: 1, name: 'Dr. Ramesh Sharma', spec: 'Cardiology', appts: 8, status: 'In Consultation' },
            { id: 2, name: 'Dr. Ananya Roy', spec: 'Pediatrics', appts: 12, status: 'Available' },
            { id: 3, name: 'Dr. Vikram Patel', spec: 'Orthopedics', appts: 6, status: 'Break' },
          ].map((d) => (
            <View key={d.id} style={styles.doctorRow}>
              <View style={styles.docAvatar}>
                <Text style={styles.docAvatarText}>{d.name.split(' ')[1]?.[0] || 'D'}</Text>
              </View>
              <View style={styles.docDetails}>
                <Text style={styles.docName}>{d.name}</Text>
                <Text style={styles.docSpec}>{d.spec} • {d.appts} appointments</Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{d.status}</Text>
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
  clinicBanner: {
    backgroundColor: '#0d9488',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  clinicCode: { color: '#99f6e4', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  clinicTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  clinicSubtitle: { color: '#ccfbf1', fontSize: 12 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  kpiCard: { width: '48%', borderRadius: 14, padding: 14, borderWidth: 1 },
  kpiIcon: { fontSize: 22, marginBottom: 6 },
  kpiValue: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  kpiLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 2 },
  kpiSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  gridNav: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  navTile: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  tileIcon: { fontSize: 20 },
  tileLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  doctorList: { gap: 10 },
  doctorRow: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  docAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  docAvatarText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  docDetails: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  docSpec: { fontSize: 12, color: '#64748b' },
  statusPill: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { color: '#166534', fontSize: 11, fontWeight: '700' },
});

export default ClinicAdminDashboardScreen;
