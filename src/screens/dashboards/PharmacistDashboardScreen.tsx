import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const PharmacistDashboardScreen: React.FC<Props> = ({
  onOpenDrawer,
  onOpenNotifications,
  onNavigateScreen = () => {},
}) => {
  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Pharmacy Hub"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.heroCard}>
          <Text style={styles.heroBadge}>PHARMACY & MEDICINE DISPENSARY</Text>
          <Text style={styles.heroTitle}>Inventory & Stock Control</Text>
          <Text style={styles.heroSub}>Automated stock deduction on billing with instant reorder triggers.</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.billBtn}
            onPress={() => onNavigateScreen('medicine_billing')}>
            <Text style={styles.btnIcon}>🧾</Text>
            <Text style={styles.billBtnText}>Generate Medicine Bill</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.invBtn}
            onPress={() => onNavigateScreen('pharmacy_inventory')}>
            <Text style={styles.btnIcon}>💊</Text>
            <Text style={styles.invBtnText}>Manage Stock</Text>
          </TouchableOpacity>
        </View>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
            <Text style={styles.kpiVal}>5</Text>
            <Text style={styles.kpiLabel}>Low Stock Items</Text>
            <Text style={styles.kpiSub}>Below reorder level</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <Text style={styles.kpiVal}>₹18,450</Text>
            <Text style={styles.kpiLabel}>Today's Medicine Sales</Text>
            <Text style={styles.kpiSub}>26 Invoices issued</Text>
          </View>
        </View>

        {/* Low Stock Warning Banner */}
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>⚠️ Urgent Low Stock Alert</Text>
          <Text style={styles.warningText}>5 medicines are currently below reorder thresholds. Replenish immediately to avoid prescription fulfillment delays.</Text>
        </View>

        {/* Low Stock Items List */}
        <Text style={styles.sectionTitle}>Low Stock Items List</Text>
        <View style={styles.stockList}>
          {[
            { id: 1, name: 'Paracetamol 650mg', category: 'Analgesics', stock: 15, reorder: 50 },
            { id: 2, name: 'Amoxicillin 500mg', category: 'Antibiotics', stock: 8, reorder: 30 },
            { id: 3, name: 'Cetirizine 10mg', category: 'Antihistamines', stock: 12, reorder: 40 },
          ].map((m) => (
            <View key={m.id} style={styles.stockRow}>
              <View style={styles.stockIcon}>
                <Text style={styles.pillEmoji}>💊</Text>
              </View>
              <View style={styles.stockInfo}>
                <Text style={styles.stockName}>{m.name}</Text>
                <Text style={styles.stockCat}>{m.category} • Reorder level: {m.reorder}</Text>
              </View>
              <View style={styles.qtyBadge}>
                <Text style={styles.qtyText}>{m.stock} left</Text>
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
  heroCard: { backgroundColor: '#701a75', borderRadius: 16, padding: 18, marginBottom: 16 },
  heroBadge: { color: '#f5d0fe', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginVertical: 4 },
  heroSub: { color: '#f0abfc', fontSize: 12 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  billBtn: { flex: 1, backgroundColor: '#0d9488', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnIcon: { fontSize: 18 },
  billBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  invBtn: { flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  invBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 13 },
  kpiGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  kpiCard: { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1 },
  kpiVal: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  kpiLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 2 },
  kpiSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  warningBox: { backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3', borderRadius: 12, padding: 14, marginBottom: 20 },
  warningTitle: { color: '#9f1239', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  warningText: { color: '#be123c', fontSize: 12, lineHeight: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  stockList: { gap: 10 },
  stockRow: { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  stockIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fae8ff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  pillEmoji: { fontSize: 18 },
  stockInfo: { flex: 1 },
  stockName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  stockCat: { fontSize: 12, color: '#64748b', marginTop: 1 },
  qtyBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  qtyText: { color: '#991b1b', fontSize: 12, fontWeight: '800' },
});

export default PharmacistDashboardScreen;
