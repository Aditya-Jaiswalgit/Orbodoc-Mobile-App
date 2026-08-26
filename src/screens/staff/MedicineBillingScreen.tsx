import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { MedicineBill, MedicineBillItem } from '../../types/clinicTypes';

interface Props {
  onOpenDrawer: () => void;
}

export const MedicineBillingScreen: React.FC<Props> = ({ onOpenDrawer }) => {
  const [bills, setBills] = useState<MedicineBill[]>([
    {
      id: 1,
      clinic_id: 1,
      patient_id: 1,
      patient_name: 'Sunita Sharma',
      bill_number: 'MB-2025-001',
      bill_date: '2025-01-15',
      subtotal: 120,
      discount_amount: 10,
      tax_amount: 14.4,
      net_amount: 124.4,
      payment_status: 'paid',
      payment_mode: 'upi',
      items: [
        { medicine_id: 1, medicine_name: 'Paracetamol 650mg', quantity: 10, unit_price: 2.5, discount_pct: 0, tax_pct: 12, total_price: 28 },
        { medicine_id: 2, medicine_name: 'Amoxicillin 500mg', quantity: 10, unit_price: 8.5, discount_pct: 10, tax_pct: 12, total_price: 96.4 },
      ],
    },
    {
      id: 2,
      clinic_id: 1,
      patient_id: 2,
      patient_name: 'Rahul Verma',
      bill_number: 'MB-2025-002',
      bill_date: '2025-01-14',
      subtotal: 300,
      discount_amount: 0,
      tax_amount: 36,
      net_amount: 336,
      payment_status: 'pending',
      items: [
        { medicine_id: 4, medicine_name: 'Pantoprazole 40mg', quantity: 30, unit_price: 5.0, discount_pct: 0, tax_pct: 12, total_price: 336 },
      ],
    },
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [items, setItems] = useState<MedicineBillItem[]>([
    { medicine_id: 1, medicine_name: 'Paracetamol 650mg', quantity: 10, unit_price: 2.5, discount_pct: 0, tax_pct: 12, total_price: 28.0 },
  ]);

  const calcNet = () => {
    const sub = items.reduce((acc, i) => acc + i.quantity * i.unit_price, 0);
    const tax = sub * 0.12;
    return sub + tax;
  };

  const handleCreateBill = () => {
    if (!patientName.trim()) {
      Alert.alert('Validation Error', 'Please enter patient name.');
      return;
    }

    const net = calcNet();
    const newBill: MedicineBill = {
      id: Date.now(),
      clinic_id: 1,
      patient_id: Date.now(),
      patient_name: patientName,
      bill_number: `MB-2025-00${bills.length + 1}`,
      bill_date: new Date().toISOString().split('T')[0],
      subtotal: net / 1.12,
      discount_amount: 0,
      tax_amount: net * 0.12,
      net_amount: net,
      payment_status: 'paid',
      payment_mode: 'cash',
      items,
    };

    setBills([newBill, ...bills]);
    setModalVisible(false);
    setPatientName('');
    Alert.alert('Bill Generated', `Invoice ${newBill.bill_number} generated & stock deducted successfully!`);
  };

  const togglePayment = (id: number) => {
    setBills(prev =>
      prev.map(b => (b.id === id ? { ...b, payment_status: b.payment_status === 'paid' ? 'pending' : 'paid' } : b))
    );
  };

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Medicine Billing Desk" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Text style={styles.pageTitle}>Pharmacy Bills ({bills.length})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Create Medicine Bill</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.billList}>
          {bills.map((bill) => (
            <View key={bill.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.billNo}>{bill.bill_number}</Text>
                  <Text style={styles.patientName}>{bill.patient_name}</Text>
                </View>
                <Text style={styles.netAmount}>₹{bill.net_amount.toFixed(2)}</Text>
              </View>

              <Text style={styles.dateText}>Date: {bill.bill_date}</Text>

              <View style={styles.itemsBox}>
                {bill.items.map((it, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemTitle}>{it.medicine_name} x {it.quantity}</Text>
                    <Text style={styles.itemPrice}>₹{(it.quantity * it.unit_price).toFixed(2)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={[styles.statusBadge, bill.payment_status === 'paid' ? styles.paidBg : styles.pendingBg]}
                  onPress={() => togglePayment(bill.id)}>
                  <Text style={[styles.statusText, bill.payment_status === 'paid' ? styles.paidText : styles.pendingText]}>
                    STATUS: {bill.payment_status.toUpperCase()}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.pdfLink}>📄 View PDF Invoice</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Create Bill Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Medicine Invoice</Text>

            <Text style={styles.label}>Patient Name *</Text>
            <TextInput style={styles.input} placeholder="Sunita Sharma" value={patientName} onChangeText={setPatientName} />

            <Text style={styles.sectionHeader}>Billing Items</Text>
            <View style={styles.itemsBox}>
              <Text style={styles.itemTitle}>Paracetamol 650mg (Qty: 10) — ₹25.00</Text>
              <Text style={styles.itemTitle}>GST (12% Tax): ₹3.00</Text>
              <Text style={styles.totalPreview}>Total Amount: ₹28.00</Text>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateBill}>
                <Text style={styles.saveText}>Generate & Collect</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 80 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  addBtn: { backgroundColor: '#0d9488', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  billList: { gap: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  billNo: { fontSize: 11, fontWeight: '800', color: '#0d9488' },
  patientName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  netAmount: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  dateText: { fontSize: 12, color: '#94a3b8', marginVertical: 4 },
  itemsBox: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 10, marginVertical: 6, gap: 4 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemTitle: { fontSize: 13, color: '#334155', fontWeight: '600' },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  totalPreview: { fontSize: 14, fontWeight: '800', color: '#0d9488', marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '800' },
  paidBg: { backgroundColor: '#dcfce7' },
  paidText: { color: '#166534', fontSize: 11, fontWeight: '800' },
  pendingBg: { backgroundColor: '#fef3c7' },
  pendingText: { color: '#92400e', fontSize: 11, fontWeight: '800' },
  pdfLink: { fontSize: 12, color: '#0369a1', fontWeight: '700' },
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginTop: 12, marginBottom: 4 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center' },
  cancelText: { color: '#475569', fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: '#0d9488', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#ffffff', fontWeight: '800' },
});

export default MedicineBillingScreen;
