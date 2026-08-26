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
import { AuditLog } from '../../types/clinicTypes';

interface Props {
  onOpenDrawer: () => void;
}

export const AuditLogsScreen: React.FC<Props> = ({ onOpenDrawer }) => {
  const [logs] = useState<AuditLog[]>([
    { id: 1, clinic_id: 1, user_id: 1, user_type: 'staff', user_name: 'Dr. Ramesh Sharma', user_role: 'doctor', action: 'CREATE_PRESCRIPTION', table_name: 'prescriptions', record_id: 101, details: 'Prescribed Amlodipine 5mg to patient #1', created_at: '2025-01-15 10:24 AM' },
    { id: 2, clinic_id: 1, user_id: 4, user_type: 'staff', user_name: 'Suresh Kumar', user_role: 'pharmacist', action: 'CREATE_MEDICINE_BILL', table_name: 'medicine_bills', record_id: 1, details: 'Generated bill MB-2025-001 & deducted stock', created_at: '2025-01-15 10:45 AM' },
    { id: 3, clinic_id: 1, user_id: 3, user_type: 'staff', user_name: 'Priya Nair', user_role: 'receptionist', action: 'BOOK_APPOINTMENT', table_name: 'appointments', record_id: 4, details: 'Booked slot for patient Vikram Singh', created_at: '2025-01-15 09:15 AM' },
    { id: 4, clinic_id: 1, user_id: 2, user_type: 'staff', user_name: 'Dr. Ananya Roy', user_role: 'doctor', action: 'UPDATE_APPOINTMENT_STATUS', table_name: 'appointments', record_id: 5, details: 'Marked appointment completed', created_at: '2025-01-15 09:50 AM' },
  ]);

  const handleExportLogs = () => {
    Alert.alert('Audit Logs Export', 'Audit trail exported successfully in encrypted CSV / JSON format.');
  };

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Immutable Audit Trail" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerBadge}>SECURITY & COMPLIANCE</Text>
          <Text style={styles.bannerTitle}>Immutable Audit Trail</Text>
          <Text style={styles.bannerSub}>Complete log of all sensitive user actions, billing events, and medical updates.</Text>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportLogs}>
            <Text style={styles.exportBtnText}>📥 Export Audit Logs</Text>
          </TouchableOpacity>
        </View>

        {/* Log Entries List */}
        <Text style={styles.sectionTitle}>Recent Trail Entries ({logs.length})</Text>
        <View style={styles.logList}>
          {logs.map((log) => (
            <View key={log.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.actionTag}>{log.action}</Text>
                <Text style={styles.dateText}>{log.created_at}</Text>
              </View>

              <Text style={styles.userName}>{log.user_name} <Text style={styles.roleText}>({log.user_role})</Text></Text>
              <Text style={styles.detailsText}>{log.details}</Text>

              <View style={styles.metaRow}>
                <View style={styles.tableBadge}>
                  <Text style={styles.tableText}>Table: {log.table_name}</Text>
                </View>
                <View style={styles.tableBadge}>
                  <Text style={styles.tableText}>Record ID: #{log.record_id}</Text>
                </View>
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
  banner: { backgroundColor: '#0f172a', borderRadius: 16, padding: 18, marginBottom: 20 },
  bannerBadge: { color: '#38bdf8', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  bannerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginVertical: 4 },
  bannerSub: { color: '#94a3b8', fontSize: 12, lineHeight: 16 },
  exportBtn: { backgroundColor: '#0d9488', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 14 },
  exportBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  logList: { gap: 10 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  actionTag: { fontSize: 11, fontWeight: '900', color: '#0d9488', letterSpacing: 0.5 },
  dateText: { fontSize: 11, color: '#94a3b8' },
  userName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  roleText: { color: '#64748b', fontWeight: '600', fontSize: 12 },
  detailsText: { fontSize: 13, color: '#334155', marginVertical: 4 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tableBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tableText: { fontSize: 10, fontWeight: '700', color: '#475569' },
});

export default AuditLogsScreen;
