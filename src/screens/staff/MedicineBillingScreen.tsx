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
import { useMedicineBills } from '../../hooks/useMedicineBills';
import { MedicineBill } from '../../api/medicineBillApi';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
}

export const MedicineBillingScreen: React.FC<Props> = ({ onOpenDrawer, onOpenNotifications }) => {
  const { bills, loading, refreshBills, fetchBillDetails, createBill, recordPayment } = useMedicineBills();

  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<MedicineBill | null>(null);

  const [patientName, setPatientName] = useState('');
  const [medicineName, setMedicineName] = useState('Paracetamol 650mg');
  const [quantity, setQuantity] = useState('10');
  const [price, setPrice] = useState('2.50');

  const handleCreateBill = async () => {
    if (!patientName.trim() || !medicineName.trim() || !quantity.trim() || !price.trim()) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }

    const qty = parseInt(quantity, 10);
    const unitPrice = parseFloat(price);
    if (isNaN(qty) || qty <= 0 || isNaN(unitPrice) || unitPrice <= 0) {
      Alert.alert('Validation Error', 'Enter valid quantity and price.');
      return;
    }

    const total = qty * unitPrice;
    const newBillPayload: Partial<MedicineBill> = {
      patient_name: patientName.trim(),
      subtotal: total,
      net_amount: total,
      total_amount: total,
      paid_amount: total,
      payment_status: 'paid',
      items: [
        {
          id: Date.now(),
          medicine_name: medicineName.trim(),
          quantity: qty,
          unit_price: unitPrice,
          total_price: total,
        },
      ],
    };

    try {
      const res = await createBill(newBillPayload);
      if (res.success) {
        setModalVisible(false);
        setPatientName('');
        setQuantity('10');
        setPrice('2.50');
        Alert.alert('Success', 'Medicine Invoice created successfully!');
      } else {
        Alert.alert('Error', res.message || 'Could not create bill');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Server error');
    }
  };

  const handleOpenDetails = async (id: number) => {
    setDetailsModalVisible(true);
    const detail = await fetchBillDetails(id);
    if (detail) {
      setSelectedBill(detail);
    }
  };

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Medicine Billing Desk"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshBills} colors={['#0d9488']} />
        }>
        <View style={styles.topRow}>
          <Text style={styles.pageTitle}>Pharmacy Invoices ({bills.length})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Create Bill</Text>
          </TouchableOpacity>
        </View>

        {loading && bills.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0d9488" />
            <Text style={styles.loadingText}>Loading pharmacy bills from DB...</Text>
          </View>
        ) : bills.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Medicine Invoices Found</Text>
            <Text style={styles.emptySub}>Create your first medicine bill for patient prescriptions.</Text>
          </View>
        ) : (
          <View style={styles.billList}>
            {bills.map((bill) => {
              const statusStr = String(bill.payment_status || bill.status || '').toLowerCase();
              const isPaid = statusStr === 'paid' || statusStr === 'settled' || statusStr === 'completed';
              const netAmt = Number(bill.net_amount || bill.total_amount || bill.subtotal || 0);

              return (
                <View key={bill.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.billNo}>{bill.bill_number || `MB-${bill.id}`}</Text>
                      <Text style={styles.patientName}>{bill.patient_name || 'Patient'}</Text>
                    </View>
                    <Text style={styles.netAmount}>₹{netAmt.toFixed(2)}</Text>
                  </View>

                  <Text style={styles.dateText}>
                    Date: {bill.created_at ? String(bill.created_at).split('T')[0] : (bill.bill_date || 'N/A')}
                  </Text>

                  {Array.isArray(bill.items) && bill.items.length > 0 ? (
                    <View style={styles.itemsBox}>
                      {bill.items.map((it: any, idx: number) => (
                        <View key={idx} style={styles.itemRow}>
                          <Text style={styles.itemTitle}>{it.medicine_name || it.name}</Text>
                          <Text style={styles.itemPrice}>₹{Number(it.total_price || it.price || 0).toFixed(2)}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <View style={[styles.statusBadge, isPaid ? styles.paidBg : styles.pendingBg]}>
                      <Text style={[styles.statusText, isPaid ? styles.paidText : styles.pendingText]}>
                        STATUS: {isPaid ? 'PAID' : 'PENDING'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleOpenDetails(bill.id)}>
                      <Text style={styles.pdfLink}>📄 View Receipt Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Create Medicine Bill Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Medicine Invoice</Text>

            <Text style={styles.label}>Patient Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Sunita Sharma"
              placeholderTextColor="#94a3b8"
              value={patientName}
              onChangeText={setPatientName}
            />

            <Text style={styles.label}>Medicine Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Paracetamol 650mg"
              placeholderTextColor="#94a3b8"
              value={medicineName}
              onChangeText={setMedicineName}
            />

            <View style={styles.rowTwo}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Quantity *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Unit Price (₹) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2.50"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateBill}>
                <Text style={styles.saveText}>Generate Bill</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Invoice Details Modal */}
      <Modal visible={detailsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Medicine Receipt Details</Text>
            {selectedBill ? (
              <View style={styles.detailsBox}>
                <Text style={styles.detailLine}>
                  <Text style={styles.bold}>Invoice No:</Text> {selectedBill.bill_number || `MB-${selectedBill.id}`}
                </Text>
                <Text style={styles.detailLine}>
                  <Text style={styles.bold}>Patient:</Text> {selectedBill.patient_name || 'Patient'}
                </Text>
                <Text style={styles.detailLine}>
                  <Text style={styles.bold}>Net Amount:</Text> ₹{Number(selectedBill.net_amount || selectedBill.total_amount || 0).toFixed(2)}
                </Text>
                <Text style={styles.detailLine}>
                  <Text style={styles.bold}>Payment Status:</Text> {String(selectedBill.payment_status || 'paid').toUpperCase()}
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
  loadingBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#64748b', fontWeight: '600' },
  emptyCard: { backgroundColor: '#ffffff', padding: 30, borderRadius: 16, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 },
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  rowTwo: { flexDirection: 'row', gap: 10 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center' },
  cancelText: { color: '#475569', fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: '#0d9488', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#ffffff', fontWeight: '800' },
  detailsBox: { gap: 6, marginVertical: 10 },
  detailLine: { fontSize: 14, color: '#334155' },
  bold: { fontWeight: '800', color: '#0f172a' },
});

export default MedicineBillingScreen;
