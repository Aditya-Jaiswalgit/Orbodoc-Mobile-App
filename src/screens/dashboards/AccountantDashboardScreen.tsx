import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const AccountantDashboardScreen: React.FC<Props> = ({
  onOpenDrawer,
  onOpenNotifications,
  onNavigateScreen = () => {},
}) => {
  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Finance & Billing Desk"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroBadge}>FINANCIAL MANAGEMENT</Text>
          <Text style={styles.heroTitle}>Revenue & Invoice Control</Text>
          <Text style={styles.heroSub}>Consolidated billing overview across treatment procedures and pharmacy.</Text>
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.treatBtn}
            onPress={() => onNavigateScreen('treatment_billing')}>
            <Text style={styles.btnIcon}>💳</Text>
            <Text style={styles.treatBtnText}>Treatment Bills</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.medBtn}
            onPress={() => onNavigateScreen('medicine_billing')}>
            <Text style={styles.btnIcon}>🧾</Text>
            <Text style={styles.medBtnText}>Medicine Bills</Text>
          </TouchableOpacity>
        </View>

        {/* Financial Metrics */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiBox, { backgroundColor: '#f0fdf4' }]}>
            <Text style={styles.kpiVal}>₹48,500</Text>
            <Text style={styles.kpiLab}>Today's Total Collected</Text>
          </View>
          <View style={[styles.kpiBox, { backgroundColor: '#fff7ed' }]}>
            <Text style={styles.kpiVal}>₹6,200</Text>
            <Text style={styles.kpiLab}>Pending Invoices</Text>
          </View>
        </View>

        {/* Recent Invoices Table */}
        <Text style={styles.sectionTitle}>Recent Invoices</Text>
        <View style={styles.billList}>
          {[
            { id: 'INV-2025-001', patient: 'Sunita Sharma', amount: '₹1,500', type: 'Treatment', status: 'paid' },
            { id: 'INV-2025-002', patient: 'Rahul Verma', amount: '₹450', type: 'Medicine', status: 'paid' },
            { id: 'INV-2025-003', patient: 'Pooja Gupta', amount: '₹2,800', type: 'Treatment', status: 'pending' },
          ].map((b) => (
            <View key={b.id} style={styles.billRow}>
              <View style={styles.billDetails}>
                <Text style={styles.billId}>{b.id}</Text>
                <Text style={styles.patientName}>{b.patient} • {b.type}</Text>
              </View>
              <View style={styles.amountCol}>
                <Text style={styles.amountText}>{b.amount}</Text>
                <View style={[styles.statusBadge, b.status === 'paid' ? styles.paidBg : styles.pendingBg]}>
                  <Text style={[styles.statusText, b.status === 'paid' ? styles.paidText : styles.pendingText]}>
                    {b.status.toUpperCase()}
                  </Text>
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
  heroCard: { backgroundColor: '#0f766e', borderRadius: 16, padding: 18, marginBottom: 16 },
  heroBadge: { color: '#99f6e4', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginVertical: 4 },
  heroSub: { color: '#ccfbf1', fontSize: 12 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  treatBtn: { flex: 1, backgroundColor: '#0d9488', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnIcon: { fontSize: 18 },
  treatBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  medBtn: { flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  medBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 13 },
  kpiGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  kpiBox: { flex: 1, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  kpiVal: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  kpiLab: { fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  billList: { gap: 10 },
  billRow: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0' },
  billDetails: { flex: 1 },
  billId: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  patientName: { fontSize: 12, color: '#64748b', marginTop: 2 },
  amountCol: { alignItems: 'flex-end' },
  amountText: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: '800' },
  paidBg: { backgroundColor: '#dcfce7' },
  paidText: { color: '#166534', fontSize: 10, fontWeight: '800' },
  pendingBg: { backgroundColor: '#fef3c7' },
  pendingText: { color: '#92400e', fontSize: 10, fontWeight: '800' },
});

export default AccountantDashboardScreen;
