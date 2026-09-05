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
import { MedicineBill, MedicineBillItem } from '../../api/medicineBillApi';
import { generateInvoiceHtml, printOrDownloadPdf } from '../../utils/pdfGenerator';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
}

export const MedicineBillingScreen: React.FC<Props> = ({ onOpenDrawer, onOpenNotifications }) => {
  const { bills, loading, refreshBills, fetchBillDetails, createBill, recordPayment } = useMedicineBills();

  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<MedicineBill | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'pending'>('all');

  // Form State for Multi-Item Bill Creation
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [doctorName, setDoctorName] = useState('Dr. Sharma');
  const [discountAmount, setDiscountAmount] = useState('0');

  // Items list in new bill
  const [billItems, setBillItems] = useState<Array<{ name: string; qty: number; price: number }>>([
    { name: 'Paracetamol 650mg', qty: 10, price: 2.5 },
  ]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedQty, setNewMedQty] = useState('1');
  const [newMedPrice, setNewMedPrice] = useState('10');

  // Record Payment State
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<'cash' | 'upi' | 'card' | 'online'>('cash');
  const [paySubmitting, setPaySubmitting] = useState(false);

  const handleAddItem = () => {
    if (!newMedName.trim() || !newMedQty.trim() || !newMedPrice.trim()) {
      Alert.alert('Validation Error', 'Enter medicine name, quantity and price.');
      return;
    }
    const q = parseInt(newMedQty, 10);
    const p = parseFloat(newMedPrice);
    if (isNaN(q) || q <= 0 || isNaN(p) || p <= 0) {
      Alert.alert('Validation Error', 'Enter valid quantity and price.');
      return;
    }
    setBillItems((prev) => [...prev, { name: newMedName.trim(), qty: q, price: p }]);
    setNewMedName('');
    setNewMedQty('1');
    setNewMedPrice('10');
  };

  const handleRemoveItem = (index: number) => {
    setBillItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const calculateSubtotal = () => {
    return billItems.reduce((sum, item) => sum + item.qty * item.price, 0);
  };

  const calculateGrandTotal = () => {
    const sub = calculateSubtotal();
    const disc = parseFloat(discountAmount) || 0;
    return Math.max(0, sub - disc);
  };

  const handleCreateBill = async () => {
    if (!patientName.trim()) {
      Alert.alert('Validation Error', 'Patient Name is required.');
      return;
    }
    if (billItems.length === 0) {
      Alert.alert('Validation Error', 'Add at least one medicine item to the invoice.');
      return;
    }

    const subtotal = calculateSubtotal();
    const disc = parseFloat(discountAmount) || 0;
    const grandTotal = Math.max(0, subtotal - disc);

    const formattedItems: MedicineBillItem[] = billItems.map((it, idx) => ({
      id: Date.now() + idx,
      medicine_name: it.name,
      quantity: it.qty,
      unit_price: it.price,
      total_price: it.qty * it.price,
    }));

    const newBillPayload: Partial<MedicineBill> = {
      patient_name: patientName.trim(),
      patient_phone: patientPhone.trim() || undefined,
      clinic_name: 'Aarogya Care Pharmacy',
      total_amount: grandTotal,
      subtotal: subtotal,
      net_amount: grandTotal,
      discount_amount: disc,
      paid_amount: grandTotal,
      due_amount: 0,
      payment_status: 'paid',
      status: 'paid',
      items: formattedItems,
    };

    try {
      const res = await createBill(newBillPayload);
      if (res.success) {
        setModalVisible(false);
        setPatientName('');
        setPatientPhone('');
        setDiscountAmount('0');
        setBillItems([{ name: 'Paracetamol 650mg', qty: 10, price: 2.5 }]);
        Alert.alert('Success ✅', 'Medicine Invoice created & API saved successfully!');
      } else {
        Alert.alert('Error', res.message || 'Could not create bill');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Server error creating bill');
    }
  };

  const handleOpenDetails = async (id: number) => {
    setDetailsModalVisible(true);
    const detail = await fetchBillDetails(id);
    if (detail) {
      setSelectedBill(detail);
    }
  };

  const handleOpenPaymentModal = (bill: MedicineBill) => {
    setSelectedBill(bill);
    const net = Number(bill.net_amount || bill.total_amount || 0);
    const paid = Number(bill.paid_amount || 0);
    const due = Math.max(0, net - paid);
    setPayAmount(String(due > 0 ? due : net));
    setPaymentModalVisible(true);
  };

  const handleRecordPaymentSubmit = async () => {
    if (!selectedBill) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Enter a valid payment amount.');
      return;
    }

    setPaySubmitting(true);
    try {
      const res = await recordPayment(selectedBill.id, {
        amount: amt,
        payment_method: payMode,
      });

      if (res.success) {
        setPaymentModalVisible(false);
        refreshBills();
        Alert.alert('Payment Recorded ✅', `₹${amt} payment recorded for invoice #${selectedBill.bill_number || selectedBill.id}`);
      } else {
        Alert.alert('Error', res.message || 'Failed to record payment');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Server connection error');
    } finally {
      setPaySubmitting(false);
    }
  };

  const filteredBills = bills.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      b.patient_name?.toLowerCase().includes(q) ||
      b.bill_number?.toLowerCase().includes(q) ||
      String(b.id).includes(q);

    const st = String(b.payment_status || b.status || '').toLowerCase();
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'paid' && (st === 'paid' || st === 'settled')) ||
      (statusFilter === 'partial' && (st === 'partially_paid' || st === 'partial')) ||
      (statusFilter === 'pending' && (st === 'pending' || st === 'unpaid'));

    return matchesSearch && matchesStatus;
  });

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
        {/* Header Title Row */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.pageTitle}>Pharmacy Invoices ({bills.length})</Text>
            <Text style={styles.pageSub}>Generate itemized medicine bills & track payment status.</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Create Bill</Text>
          </TouchableOpacity>
        </View>

        {/* Search & Status Filter Bar */}
        <View style={styles.filterBarCard}>
          <View style={styles.searchInputContainer}>
            <Text style={{ fontSize: 14 }}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Patient Name or Bill No..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.statusPillsRow}>
            {(['all', 'paid', 'partial', 'pending'] as const).map((st) => {
              const isActive = statusFilter === st;
              const label =
                st === 'all'
                  ? 'All Invoices'
                  : st === 'paid'
                  ? 'Paid'
                  : st === 'partial'
                  ? 'Partially Paid'
                  : 'Pending';
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                  onPress={() => setStatusFilter(st)}>
                  <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Bills List Rendering */}
        {loading && bills.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0d9488" />
            <Text style={styles.loadingText}>Fetching pharmacy invoices from backend API...</Text>
          </View>
        ) : filteredBills.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Matching Invoices Found</Text>
            <Text style={styles.emptySub}>Try adjusting your search query or filter settings.</Text>
          </View>
        ) : (
          <View style={styles.billList}>
            {filteredBills.map((bill) => {
              const statusStr = String(bill.payment_status || bill.status || '').toLowerCase();
              const isPaid = statusStr === 'paid' || statusStr === 'settled' || statusStr === 'completed';
              const isPartial = statusStr === 'partially_paid' || statusStr === 'partial';
              const netAmt = Number(bill.net_amount || bill.total_amount || bill.subtotal || 0);
              const paidAmt = Number(bill.paid_amount || (isPaid ? netAmt : 0));
              const dueAmt = Math.max(0, netAmt - paidAmt);

              return (
                <View key={bill.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.billNo}>{bill.bill_number || `MB-${bill.id}`}</Text>
                        <View
                          style={[
                            styles.statusBadgePill,
                            isPaid ? styles.paidBg : isPartial ? styles.partialBg : styles.pendingBg,
                          ]}>
                          <Text
                            style={[
                              styles.statusText,
                              isPaid ? styles.paidText : isPartial ? styles.partialText : styles.pendingText,
                            ]}>
                            {isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'PENDING'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.patientName}>{bill.patient_name || 'Patient'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.netAmount}>₹{netAmt.toFixed(2)}</Text>
                      {dueAmt > 0 ? (
                        <Text style={styles.dueText}>Due: ₹{dueAmt.toFixed(2)}</Text>
                      ) : (
                        <Text style={styles.settledText}>✓ Fully Settled</Text>
                      )}
                    </View>
                  </View>

                  <Text style={styles.dateText}>
                    📅 Date: {bill.created_at ? String(bill.created_at).split('T')[0] : 'N/A'}
                  </Text>

                  {/* Itemized Services Preview */}
                  {Array.isArray(bill.items) && bill.items.length > 0 ? (
                    <View style={styles.itemsBox}>
                      <Text style={styles.itemsBoxTitle}>ITEMIZED MEDICINES ({bill.items.length}):</Text>
                      {bill.items.map((it: any, idx: number) => (
                        <View key={idx} style={styles.itemRow}>
                          <Text style={styles.itemTitle}>
                            💊 {it.medicine_name || it.name} × {it.quantity || 1}
                          </Text>
                          <Text style={styles.itemPrice}>
                            ₹{Number(it.total_price || (it.unit_price || 0) * (it.quantity || 1)).toFixed(2)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {/* Card Actions Footer */}
                  <View style={styles.cardFooter}>
                    <TouchableOpacity style={styles.detailsBtn} onPress={() => handleOpenDetails(bill.id)}>
                      <Text style={styles.detailsBtnText}>📄 View Invoice Details</Text>
                    </TouchableOpacity>

                    {!isPaid && (
                      <TouchableOpacity style={styles.recordPayBtn} onPress={() => handleOpenPaymentModal(bill)}>
                        <Text style={styles.recordPayBtnText}>💳 Record Payment</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* CREATE MULTI-ITEM MEDICINE BILL MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCardWide}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>New Itemized Medicine Invoice</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 10 }}>
              <View style={styles.formRowTwo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Patient Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Patient Name"
                    placeholderTextColor="#94a3b8"
                    value={patientName}
                    onChangeText={setPatientName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Mobile Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+91 98765 43210"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    value={patientPhone}
                    onChangeText={setPatientPhone}
                  />
                </View>
              </View>

              {/* Itemized Medicine Rows List */}
              <Text style={styles.sectionHeading}>Itemized Prescribed Medicines</Text>
              <View style={styles.itemsTableCard}>
                {billItems.map((item, idx) => (
                  <View key={idx} style={styles.itemTableRow}>
                    <Text style={styles.itemTableTitle}>{item.name}</Text>
                    <Text style={styles.itemTableQty}>Qty: {item.qty}</Text>
                    <Text style={styles.itemTablePrice}>₹{item.price.toFixed(2)}/unit</Text>
                    <Text style={styles.itemTableTotal}>₹{(item.qty * item.price).toFixed(2)}</Text>
                    <TouchableOpacity onPress={() => handleRemoveItem(idx)}>
                      <Text style={styles.removeItemText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Add New Item Inputs */}
              <View style={styles.addItemInputRow}>
                <TextInput
                  style={[styles.input, { flex: 2 }]}
                  placeholder="Medicine Name"
                  placeholderTextColor="#94a3b8"
                  value={newMedName}
                  onChangeText={setNewMedName}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Qty"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={newMedQty}
                  onChangeText={setNewMedQty}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Price ₹"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={newMedPrice}
                  onChangeText={setNewMedPrice}
                />
                <TouchableOpacity style={styles.addItemBtn} onPress={handleAddItem}>
                  <Text style={styles.addItemBtnText}>+ Add</Text>
                </TouchableOpacity>
              </View>

              {/* Discount & Totals */}
              <View style={styles.totalsBoxCard}>
                <View style={styles.totalRowLine}>
                  <Text style={styles.totalRowLabel}>Subtotal:</Text>
                  <Text style={styles.totalRowVal}>₹{calculateSubtotal().toFixed(2)}</Text>
                </View>
                <View style={styles.totalRowLine}>
                  <Text style={styles.totalRowLabel}>Discount Amount (₹):</Text>
                  <TextInput
                    style={styles.discountInput}
                    keyboardType="numeric"
                    value={discountAmount}
                    onChangeText={setDiscountAmount}
                  />
                </View>
                <View style={[styles.totalRowLine, { borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingTop: 6, marginTop: 4 }]}>
                  <Text style={[styles.totalRowLabel, { fontWeight: '800' }]}>Grand Payable Total:</Text>
                  <Text style={styles.grandTotalVal}>₹{calculateGrandTotal().toFixed(2)}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.primarySaveBtn} onPress={handleCreateBill}>
                <Text style={styles.primarySaveBtnText}>🧾 Generate & Issue Bill (Hit API)</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* RECORD PAYMENT MODAL */}
      <Modal visible={paymentModalVisible} animationType="slide" transparent={true} onRequestClose={() => setPaymentModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Record Bill Payment</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedBill ? (
              <View style={{ gap: 12 }}>
                <View style={styles.payInfoBox}>
                  <Text style={styles.payInfoText}>
                    Invoice #{selectedBill.bill_number || selectedBill.id} · {selectedBill.patient_name}
                  </Text>
                  <Text style={styles.payInfoAmount}>Total: ₹{Number(selectedBill.net_amount || selectedBill.total_amount || 0).toFixed(2)}</Text>
                </View>

                <Text style={styles.label}>Payment Amount (₹) *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={payAmount}
                  onChangeText={setPayAmount}
                  placeholder="Enter amount paid"
                />

                <Text style={styles.label}>Payment Mode *</Text>
                <View style={styles.payModesGrid}>
                  {(['cash', 'upi', 'card', 'online'] as const).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.payModeCard, payMode === m && styles.payModeCardActive]}
                      onPress={() => setPayMode(m)}>
                      <Text style={styles.payModeText}>{m.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.primarySaveBtn} onPress={handleRecordPaymentSubmit} disabled={paySubmitting}>
                  {paySubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primarySaveBtnText}>Confirm & Save Payment (Hit API)</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* INVOICE DETAILS PRINTABLE MODAL */}
      <Modal visible={detailsModalVisible} animationType="slide" transparent={true} onRequestClose={() => setDetailsModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCardWide}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Medicine Invoice Receipt</Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedBill ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                {/* Invoice Receipt Header */}
                <View style={styles.receiptPrintHeader}>
                  <View>
                    <Text style={styles.clinicTitleText}>{selectedBill.clinic_name || 'Aarogya Care Pharmacy'}</Text>
                    <Text style={styles.receiptSubtitleText}>Invoice #{selectedBill.bill_number || `MB-${selectedBill.id}`}</Text>
                  </View>
                  <View style={[styles.statusBadgePill, selectedBill.payment_status === 'paid' ? styles.paidBg : styles.pendingBg]}>
                    <Text style={[styles.statusText, selectedBill.payment_status === 'paid' ? styles.paidText : styles.pendingText]}>
                      {String(selectedBill.payment_status || 'PAID').toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Patient Details */}
                <View style={styles.receiptPatientInfoCard}>
                  <Text style={styles.infoLine}>👤 <Text style={styles.bold}>Patient Name:</Text> {selectedBill.patient_name}</Text>
                  <Text style={styles.infoLine}>📞 <Text style={styles.bold}>Mobile:</Text> {selectedBill.patient_phone || 'N/A'}</Text>
                  <Text style={styles.infoLine}>📅 <Text style={styles.bold}>Invoice Date:</Text> {selectedBill.created_at ? String(selectedBill.created_at).split('T')[0] : 'N/A'}</Text>
                </View>

                {/* Itemized Table */}
                <Text style={styles.sectionHeading}>Prescribed Medicine Items</Text>
                <View style={styles.itemsTableCard}>
                  {Array.isArray(selectedBill.items) && selectedBill.items.length > 0 ? (
                    selectedBill.items.map((it, idx) => (
                      <View key={idx} style={styles.itemTableRow}>
                        <Text style={[styles.itemTableTitle, { flex: 2 }]}>{it.medicine_name}</Text>
                        <Text style={styles.itemTableQty}>Qty: {it.quantity}</Text>
                        <Text style={styles.itemTablePrice}>₹{Number(it.unit_price || 0).toFixed(2)}</Text>
                        <Text style={styles.itemTableTotal}>₹{Number(it.total_price || 0).toFixed(2)}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ color: '#64748b', fontSize: 12 }}>No itemized records available.</Text>
                  )}
                </View>

                {/* Summary Table */}
                <View style={styles.totalsBoxCard}>
                  <View style={styles.totalRowLine}>
                    <Text style={styles.totalRowLabel}>Subtotal:</Text>
                    <Text style={styles.totalRowVal}>₹{Number(selectedBill.subtotal || selectedBill.total_amount || 0).toFixed(2)}</Text>
                  </View>
                  <View style={styles.totalRowLine}>
                    <Text style={styles.totalRowLabel}>Discount:</Text>
                    <Text style={styles.totalRowVal}>₹{Number(selectedBill.discount_amount || 0).toFixed(2)}</Text>
                  </View>
                  <View style={[styles.totalRowLine, { borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingTop: 6, marginTop: 4 }]}>
                    <Text style={[styles.totalRowLabel, { fontWeight: '800' }]}>Grand Total Paid:</Text>
                    <Text style={styles.grandTotalVal}>₹{Number(selectedBill.net_amount || selectedBill.total_amount || 0).toFixed(2)}</Text>
                  </View>
                </View>

                {/* PDF Print Action Button */}
                <TouchableOpacity
                  style={{ backgroundColor: '#0d9488', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10 }}
                  onPress={() => {
                    const netAmt = Number(selectedBill.net_amount || selectedBill.total_amount || 0);
                    const paidAmt = Number(selectedBill.paid_amount || netAmt);
                    const dueAmt = Math.max(0, netAmt - paidAmt);
                    const html = generateInvoiceHtml({
                      invoiceNumber: selectedBill.bill_number || `MB-${selectedBill.id}`,
                      invoiceDate: selectedBill.created_at ? String(selectedBill.created_at).split('T')[0] : new Date().toLocaleDateString(),
                      clinicName: selectedBill.clinic_name || 'Aarogya Care Pharmacy',
                      patientName: selectedBill.patient_name || 'Patient',
                      patientPhone: selectedBill.patient_phone || '',
                      paymentStatus: selectedBill.payment_status || 'paid',
                      items: (selectedBill.items || []).map((it) => ({
                        name: it.medicine_name,
                        qty: it.quantity,
                        unitPrice: Number(it.unit_price || 0),
                        totalPrice: Number(it.total_price || 0),
                      })),
                      subtotal: Number(selectedBill.subtotal || netAmt),
                      discount: Number(selectedBill.discount_amount || 0),
                      tax: 0,
                      grandTotal: netAmt,
                      paidAmount: paidAmt,
                      dueAmount: dueAmt,
                    });
                    printOrDownloadPdf(html, `Invoice_${selectedBill.bill_number || selectedBill.id}`);
                  }}>
                  <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '800' }}>📥 Print / Download Invoice PDF</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 90 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  pageSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  addBtn: { backgroundColor: '#0d9488', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },

  filterBarCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 10 },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: '#cbd5e1' },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 13, color: '#0f172a' },
  statusPillsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterPill: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  filterPillActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  filterPillText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  filterPillTextActive: { color: '#ffffff' },

  billList: { gap: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  billNo: { fontSize: 12, fontWeight: '800', color: '#0d9488' },
  patientName: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  netAmount: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  dueText: { fontSize: 11, fontWeight: '700', color: '#dc2626', marginTop: 2 },
  settledText: { fontSize: 11, fontWeight: '700', color: '#16a34a', marginTop: 2 },
  dateText: { fontSize: 12, color: '#64748b' },

  itemsBox: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#f1f5f9', gap: 4 },
  itemsBoxTitle: { fontSize: 10, fontWeight: '800', color: '#64748b', marginBottom: 2 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontSize: 12, color: '#334155', fontWeight: '600' },
  itemPrice: { fontSize: 12, fontWeight: '700', color: '#0f172a' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  detailsBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  detailsBtnText: { fontSize: 12, fontWeight: '700', color: '#0369a1' },
  recordPayBtn: { backgroundColor: '#2dd4bf', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  recordPayBtnText: { fontSize: 12, fontWeight: '800', color: '#0f172a' },

  statusBadgePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '900' },
  paidBg: { backgroundColor: '#dcfce7' },
  paidText: { color: '#166534' },
  partialBg: { backgroundColor: '#ffedd5' },
  partialText: { color: '#c2410c' },
  pendingBg: { backgroundColor: '#fef3c7' },
  pendingText: { color: '#92400e' },

  loadingBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#64748b', fontWeight: '600' },
  emptyCard: { backgroundColor: '#ffffff', padding: 30, borderRadius: 16, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 },

  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  modalCardWide: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, maxHeight: '90%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },

  label: { fontSize: 12, fontWeight: '700', color: '#334155', marginTop: 6, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#0f172a', backgroundColor: '#ffffff' },
  formRowTwo: { flexDirection: 'row', gap: 10 },
  sectionHeading: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 8 },

  itemsTableCard: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#e2e8f0', gap: 6 },
  itemTableRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  itemTableTitle: { flex: 1, fontSize: 12, fontWeight: '700', color: '#0f172a' },
  itemTableQty: { fontSize: 11, color: '#64748b' },
  itemTablePrice: { fontSize: 11, color: '#64748b' },
  itemTableTotal: { fontSize: 12, fontWeight: '800', color: '#0d9488' },
  removeItemText: { fontSize: 14 },

  addItemInputRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  addItemBtn: { backgroundColor: '#0d9488', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8 },
  addItemBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },

  totalsBoxCard: { backgroundColor: '#f1f5f9', borderRadius: 10, padding: 12, gap: 6, marginTop: 6 },
  totalRowLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalRowLabel: { fontSize: 12, color: '#475569', fontWeight: '600' },
  totalRowVal: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  discountInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, width: 80, textAlign: 'right', fontSize: 13, fontWeight: '700', color: '#0f172a', backgroundColor: '#ffffff' },
  grandTotalVal: { fontSize: 16, fontWeight: '900', color: '#0d9488' },

  primarySaveBtn: { backgroundColor: '#0d9488', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  primarySaveBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },

  payInfoBox: { backgroundColor: '#e0f2fe', padding: 12, borderRadius: 10 },
  payInfoText: { fontSize: 13, fontWeight: '800', color: '#0369a1' },
  payInfoAmount: { fontSize: 15, fontWeight: '900', color: '#075985', marginTop: 2 },
  payModesGrid: { flexDirection: 'row', gap: 6 },
  payModeCard: { flex: 1, backgroundColor: '#f8fafc', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center' },
  payModeCardActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  payModeText: { fontSize: 11, fontWeight: '800', color: '#0f172a' },

  receiptPrintHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 10 },
  clinicTitleText: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  receiptSubtitleText: { fontSize: 12, color: '#64748b' },
  receiptPatientInfoCard: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, gap: 4 },
  infoLine: { fontSize: 12, color: '#475569' },
  bold: { fontWeight: '800', color: '#0f172a' },
});

export default MedicineBillingScreen;
