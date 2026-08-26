import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const ReceptionistDashboardScreen: React.FC<Props> = ({
  onOpenDrawer,
  onOpenNotifications,
  onNavigateScreen = () => {},
}) => {
  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Reception Front Desk"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerSub}>RECEPTION & APPOINTMENTS DESK</Text>
          <Text style={styles.bannerTitle}>OPD Patient Flow Management</Text>
          <Text style={styles.bannerDesc}>Quick patient check-in, doctor slot bookings, and registration.</Text>
        </View>

        {/* Primary Action Buttons */}
        <View style={styles.primaryActionsRow}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => onNavigateScreen('book_appointment')}>
            <Text style={styles.primaryBtnIcon}>📅</Text>
            <Text style={styles.primaryBtnText}>Book Appointment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => onNavigateScreen('patients')}>
            <Text style={styles.secondaryBtnIcon}>👤</Text>
            <Text style={styles.secondaryBtnText}>New Patient</Text>
          </TouchableOpacity>
        </View>

        {/* Front Desk KPIs */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiBox, { backgroundColor: '#f0fdf4' }]}>
            <Text style={styles.kpiVal}>32</Text>
            <Text style={styles.kpiLab}>Booked Today</Text>
          </View>
          <View style={[styles.kpiBox, { backgroundColor: '#eff6ff' }]}>
            <Text style={styles.kpiVal}>18</Text>
            <Text style={styles.kpiLab}>Checked-In</Text>
          </View>
          <View style={[styles.kpiBox, { backgroundColor: '#fff7ed' }]}>
            <Text style={styles.kpiVal}>4</Text>
            <Text style={styles.kpiLab}>Waiting Room</Text>
          </View>
        </View>

        {/* Waiting Room Queue */}
        <Text style={styles.sectionTitle}>Current OPD Waiting Queue</Text>
        <View style={styles.queueList}>
          {[
            { token: 'T-101', patient: 'Sunita Sharma', doc: 'Dr. Ramesh Sharma', status: 'In Consultation', wait: '0 min' },
            { token: 'T-102', patient: 'Rahul Verma', doc: 'Dr. Ramesh Sharma', status: 'Next In Line', wait: '10 min' },
            { token: 'T-103', patient: 'Pooja Gupta', doc: 'Dr. Ananya Roy', status: 'Checked In', wait: '20 min' },
          ].map((q) => (
            <View key={q.token} style={styles.queueRow}>
              <View style={styles.tokenBadge}>
                <Text style={styles.tokenText}>{q.token}</Text>
              </View>
              <View style={styles.queueDetails}>
                <Text style={styles.patientName}>{q.patient}</Text>
                <Text style={styles.docName}>{q.doc}</Text>
              </View>
              <View style={styles.statusCol}>
                <Text style={styles.queueStatus}>{q.status}</Text>
                <Text style={styles.waitTime}>Est wait: {q.wait}</Text>
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
  bannerCard: { backgroundColor: '#0284c7', borderRadius: 16, padding: 18, marginBottom: 16 },
  bannerSub: { color: '#e0f2fe', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  bannerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginVertical: 4 },
  bannerDesc: { color: '#bae6fd', fontSize: 12 },
  primaryActionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#0d9488',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnIcon: { fontSize: 18 },
  primaryBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnIcon: { fontSize: 18 },
  secondaryBtnText: { color: '#0f172a', fontSize: 14, fontWeight: '800' },
  kpiGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  kpiBox: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  kpiVal: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  kpiLab: { fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  queueList: { gap: 10 },
  queueRow: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tokenBadge: { backgroundColor: '#0f172a', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, marginRight: 10 },
  tokenText: { color: '#38bdf8', fontSize: 12, fontWeight: '900' },
  queueDetails: { flex: 1 },
  patientName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  docName: { fontSize: 12, color: '#64748b' },
  statusCol: { alignItems: 'flex-end' },
  queueStatus: { fontSize: 12, fontWeight: '800', color: '#0d9488' },
  waitTime: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
});

export default ReceptionistDashboardScreen;
