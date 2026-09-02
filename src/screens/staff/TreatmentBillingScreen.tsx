import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { useTreatmentBilling } from '../../hooks/useTreatmentBilling';
import { TreatmentBill } from '../../api/treatmentBillApi';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
}

export const TreatmentBillingScreen: React.FC<Props> = ({ onOpenDrawer, onOpenNotifications }) => {
  const {
    bills,
    selectedBill,
    stats,
    loading,
    detailsLoading,
    refreshBills,
    fetchBillDetails,
    createBill,
    recordBillPayment,
  } = useTreatmentBilling();

  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [serviceName, setServiceName] = useState('Consultation Fee');
  const [amount, setAmount] = useState('800');

  const [targetBill, setTargetBill] = useState<TreatmentBill | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('upi');

  const handleCreateBill = async () => {
    if (!patientName.trim() || !amount.trim()) {
      Alert.alert('Validation Error', 'Patient name and charge amount are required.');
      return;
    }

    const price = parseFloat(amount);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive amount.');
      return;
    }

    const newBillPayload: Partial<TreatmentBill> = {
      patient_name: patientName.trim(),
      patient_phone: patientPhone.trim(),
      total_amount: price,
      paid_amount: price,
      status: 'paid',
      items: [
        {
          id: Date.now(),
          service_name: serviceName.trim() || 'General Consultation',
          quantity: 1,
          unit_price: price,
          total_price: price,
        },
      ],
    };

    const res = await createBill(newBillPayload);
    if (res.success) {
      setModalVisible(false);
      setPatientName('');
      setPatientPhone('');
      setServiceName('Consultation Fee');
      setAmount('800');
      Alert.alert('Success', 'Treatment Invoice created successfully in DB!');
    } else {
      Alert.alert('Error', res.message || 'Could not create bill');
    }
  };

  const handleOpenDetails = async (id: number) => {
    setDetailsModalVisible(true);
    await fetchBillDetails(id);
  };

  const handleOpenPayment = (bill: TreatmentBill) => {
    setTargetBill(bill);
    setPayAmount(String(bill.due_amount || bill.total_amount || 0));
    setPaymentModalVisible(true);
  };

  const handleRecordPayment = async () => {
    if (!targetBill) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Enter valid payment amount.');
      return;
    }

    const res = await recordBillPayment(targetBill.id, amt, payMethod);
    if (res.success) {
      setPaymentModalVisible(false);
      setTargetBill(null);
      Alert.alert('Success', 'Payment recorded successfully!');
    } else {
      Alert.alert('Error', res.message || 'Payment recording failed');
    }
  };

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Treatment Billing"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshBills} colors={['#0d9488']} />
        }>
        {/* Top Header & Actions */}
        <View style={styles.topRow}>
          <Text style={styles.pageTitle}>Treatment Invoices ({bills.length})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Create Bill</Text>
          </TouchableOpacity>
        </View>

        {/* 4 Live Metric Stat Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Invoices</Text>
            <Text style={styles.statVal}>{stats.total_bills}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Revenue</Text>
            <Text style={[styles.statVal, { color: '#166534' }]}>
              ₹{Number(stats.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Paid Invoices</Text>
            <Text style={[styles.statVal, { color: '#0d9488' }]}>{stats.paid_count}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pending / Due</Text>
            <Text style={[styles.statVal, { color: '#b45309' }]}>
              {stats.pending_count} (₹{Number(stats.total_due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })})
            </Text>
          </View>
        </View>

        {/* Bills List */}
        {loading && bills.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0d9488" />
            <Text style={styles.loadingText}>Fetching treatment bills from DB...</Text>
          </View>
        ) : bills.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Treatment Bills Found</Text>
            <Text style={styles.emptySub}>
              Create your first treatment bill to record patient procedures & payments.
            </Text>
          </View>
        ) : (
          <View style={styles.billList}>
            {bills.map((bill) => {
              const statusStr = String(bill.status || '').toLowerCase();
              const isPaid = statusStr === 'paid';
              const totalAmt = Number(bill.total_amount || 0);
              const paidAmt = Number(bill.paid_amount || (isPaid ? totalAmt : 0));
              const dueAmt = Number(bill.due_amount ?? (totalAmt - paidAmt));

              return (
                <View key={bill.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.billNo}>{bill.bill_number || `TB-${bill.id}`}</Text>
                      <Text style={styles.patientName}>{bill.patient_name || 'Patient'}</Text>
                      {bill.patient_phone ? (
                        <Text style={styles.phoneText}>📞 {bill.patient_phone}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.netAmount}>₹{totalAmt.toFixed(2)}</Text>
                  </View>

                  <Text style={styles.dateText}>
                    Date: {bill.created_at ? String(bill.created_at).split('T')[0] : 'N/A'}
                  </Text>

                  {Array.isArray(bill.items) && bill.items.length > 0 ? (
                    <View style={styles.itemsBox}>
                      {bill.items.map((it, idx) => (
                        <View key={idx} style={styles.itemRow}>
                          <Text style={styles.itemTitle}>{it.service_name}</Text>
                          <Text style={styles.itemPrice}>₹{Number(it.total_price || 0).toFixed(2)}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      style={[styles.statusBadge, isPaid ? styles.paidBg : styles.pendingBg]}
                      onPress={() => !isPaid && handleOpenPayment(bill)}>
                      <Text style={[styles.statusText, isPaid ? styles.paidText : styles.pendingText]}>
                        STATUS: {statusStr.toUpperCase()}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleOpenDetails(bill.id)}>
                      <Text style={styles.pdfLink}>📄 View Invoice Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Create Treatment Bill Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Treatment Invoice</Text>

            <Text style={styles.label}>Patient Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Sunita Sharma"
              placeholderTextColor="#94a3b8"
              value={patientName}
              onChangeText={setPatientName}
            />

            <Text style={styles.label}>Patient Mobile Number</Text>
            <TextInput
              style={styles.input}
              placeholder="9876543210"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={patientPhone}
              onChangeText={setPatientPhone}
            />

            <Text style={styles.label}>Service / Procedure Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Cardiology Consultation / ECG"
              placeholderTextColor="#94a3b8"
              value={serviceName}
              onChangeText={setServiceName}
            />

            <Text style={styles.label}>Charge Amount (₹) *</Text>
            <TextInput
              style={styles.input}
              placeholder="800"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateBill}>
                <Text style={styles.saveText}>Save & Create Invoice</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Record Payment Modal */}
      <Modal visible={paymentModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Record Bill Payment</Text>
            <Text style={styles.subInfo}>
              Bill #{targetBill?.bill_number} - {targetBill?.patient_name}
            </Text>

            <Text style={styles.label}>Payment Amount (₹) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={payAmount}
              onChangeText={setPayAmount}
            />

            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.methodRow}>
              {['upi', 'cash', 'card'].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[styles.methodBtn, payMethod === method && styles.methodBtnActive]}
                  onPress={() => setPayMethod(method)}>
                  <Text style={[styles.methodText, payMethod === method && styles.methodTextActive]}>
                    {method.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPaymentModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleRecordPayment}>
                <Text style={styles.saveText}>Confirm Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Invoice Details Modal */}
      <Modal visible={detailsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Invoice Receipt Details</Text>
            {detailsLoading ? (
              <ActivityIndicator size="small" color="#0d9488" />
            ) : selectedBill ? (
              <View style={styles.detailsBox}>
                <Text style={styles.detailLine}>
                  <Text style={styles.bold}>Invoice No:</Text> {selectedBill.bill_number}
                </Text>
                <Text style={styles.detailLine}>
                  <Text style={styles.bold}>Patient:</Text> {selectedBill.patient_name}
                </Text>
                <Text style={styles.detailLine}>
                  <Text style={styles.bold}>Total Amount:</Text> ₹{Number(selectedBill.total_amount || 0).toFixed(2)}
                </Text>
                <Text style={styles.detailLine}>
                  <Text style={styles.bold}>Paid Amount:</Text> ₹{Number(selectedBill.paid_amount || 0).toFixed(2)}
                </Text>
                <Text style={styles.detailLine}>
                  <Text style={styles.bold}>Status:</Text> {String(selectedBill.status).toUpperCase()}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity style={[styles.cancelBtn, { marginTop: 16 }]} onPress={() => setDetailsModalVisible(false)}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
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
  addBtn: { backgroundColor: '#0d9488', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  statVal: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  billList: { gap: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  billNo: { fontSize: 11, fontWeight: '800', color: '#0d9488' },
  patientName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  phoneText: { fontSize: 12, color: '#64748b', marginTop: 2 },
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
  loadingBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#64748b', fontWeight: '600' },
  emptyCard: { backgroundColor: '#ffffff', padding: 30, borderRadius: 16, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 },
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  subInfo: { fontSize: 13, color: '#64748b', marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  methodRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  methodBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, alignItems: 'center' },
  methodBtnActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  methodText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  methodTextActive: { color: '#ffffff' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center' },
  cancelText: { color: '#475569', fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: '#0d9488', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#ffffff', fontWeight: '800' },
  detailsBox: { gap: 6, marginVertical: 10 },
  detailLine: { fontSize: 14, color: '#334155' },
  bold: { fontWeight: '800', color: '#0f172a' },
});

export default TreatmentBillingScreen;

