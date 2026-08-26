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
import { TreatmentBill } from '../../types/clinicTypes';

interface Props {
  onOpenDrawer: () => void;
}

export const TreatmentBillingScreen: React.FC<Props> = ({ onOpenDrawer }) => {
  const [bills, setBills] = useState<TreatmentBill[]>([
    {
      id: 1,
      clinic_id: 1,
      patient_id: 1,
      patient_name: 'Sunita Sharma',
      bill_number: 'TB-2025-001',
      bill_date: '2025-01-15',
      subtotal: 1500,
      discount_amount: 100,
      tax_amount: 252,
      net_amount: 1652,
      payment_status: 'paid',
      payment_mode: 'card',
      items: [
        { service_name: 'Cardiology Specialist Consultation', quantity: 1, unit_price: 800, discount_pct: 0, tax_pct: 18, total_price: 944 },
        { service_name: '12-Lead ECG Procedure', quantity: 1, unit_price: 700, discount_pct: 10, tax_pct: 18, total_price: 708 },
      ],
    },
    {
      id: 2,
      clinic_id: 1,
      patient_id: 2,
      patient_name: 'Rahul Verma',
      bill_number: 'TB-2025-002',
      bill_date: '2025-01-14',
      subtotal: 600,
      discount_amount: 0,
      tax_amount: 108,
      net_amount: 708,
      payment_status: 'pending',
      items: [
        { service_name: 'OPD Consultation Fee', quantity: 1, unit_price: 600, discount_pct: 0, tax_pct: 18, total_price: 708 },
      ],
    },
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [serviceName, setServiceName] = useState('Consultation Fee');
  const [amount, setAmount] = useState('800');

  const handleCreateBill = () => {
    if (!patientName.trim() || !amount.trim()) {
      Alert.alert('Validation Error', 'Patient name and charge amount are required.');
      return;
    }

    const price = parseFloat(amount);
    const tax = price * 0.18;
    const net = price + tax;

    const newBill: TreatmentBill = {
      id: Date.now(),
      clinic_id: 1,
      patient_id: Date.now(),
      patient_name: patientName,
      bill_number: `TB-2025-00${bills.length + 1}`,
      bill_date: new Date().toISOString().split('T')[0],
      subtotal: price,
      discount_amount: 0,
      tax_amount: tax,
      net_amount: net,
      payment_status: 'paid',
      payment_mode: 'upi',
      items: [
        { service_name: serviceName, quantity: 1, unit_price: price, discount_pct: 0, tax_pct: 18, total_price: net },
      ],
    };

    setBills([newBill, ...bills]);
    setModalVisible(false);
    setPatientName('');
    setAmount('800');
    Alert.alert('Bill Created', `Treatment Invoice ${newBill.bill_number} generated!`);
  };

  const togglePaymentStatus = (id: number) => {
    setBills(prev =>
      prev.map(b => (b.id === id ? { ...b, payment_status: b.payment_status === 'paid' ? 'pending' : 'paid' } : b))
    );
  };

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Treatment Billing Desk" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Text style={styles.pageTitle}>Treatment Invoices ({bills.length})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Create Treatment Bill</Text>
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
                    <Text style={styles.itemTitle}>{it.service_name}</Text>
                    <Text style={styles.itemPrice}>₹{it.total_price.toFixed(2)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={[styles.statusBadge, bill.payment_status === 'paid' ? styles.paidBg : styles.pendingBg]}
                  onPress={() => togglePaymentStatus(bill.id)}>
                  <Text style={[styles.statusText, bill.payment_status === 'paid' ? styles.paidText : styles.pendingText]}>
                    STATUS: {bill.payment_status.toUpperCase()}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.pdfLink}>📄 Print Invoice Receipt</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Create Treatment Bill Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Treatment Invoice</Text>

            <Text style={styles.label}>Patient Name *</Text>
            <TextInput style={styles.input} placeholder="Sunita Sharma" value={patientName} onChangeText={setPatientName} />

            <Text style={styles.label}>Service / Procedure Name *</Text>
            <TextInput style={styles.input} placeholder="Cardiology Consultation / ECG" value={serviceName} onChangeText={setServiceName} />

            <Text style={styles.label}>Base Charge Amount (₹) *</Text>
            <TextInput style={styles.input} placeholder="800" keyboardType="numeric" value={amount} onChangeText={setAmount} />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateBill}>
                <Text style={styles.saveText}>Save & Collect</Text>
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
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center' },
  cancelText: { color: '#475569', fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: '#0d9488', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#ffffff', fontWeight: '800' },
});

export default TreatmentBillingScreen;
