import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import { BillingCardIcon } from '../../components/common/CustomIcons';
import { useTreatmentBills } from '../../hooks/useTreatmentBills';
import { TreatmentBill } from '../../api/treatmentBillApi';

interface TreatmentBillingScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
}

export const TreatmentBillingScreen: React.FC<TreatmentBillingScreenProps> = ({
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
}) => {
  const { bills, loading, lastRefreshed, refreshBills, fetchBillDetails } = useTreatmentBills();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All Status');
  const [showStatusPicker, setShowStatusPicker] = useState<boolean>(false);

  const [selectedBill, setSelectedBill] = useState<TreatmentBill | null>(null);
  const [showBillDetailModal, setShowBillDetailModal] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const filteredBills = bills.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    const billNo = (b.bill_number || `#${b.id}`).toLowerCase();
    const name = (b.patient_name || '').toLowerCase();
    const phone = (b.patient_phone || '').toLowerCase();

    const matchesSearch =
      q === '' || billNo.includes(q) || name.includes(q) || phone.includes(q);

    const s = (b.status || (b as any).payment_status || '').toLowerCase();
    const matchesStatus =
      statusFilter === 'All Status' ||
      (statusFilter === 'Pending' && (s === 'pending' || s === 'unpaid')) ||
      (statusFilter === 'Paid' && s === 'paid') ||
      (statusFilter === 'Partially Paid' && (s === 'partially_paid' || s === 'partial')) ||
      (statusFilter === 'Cancelled' && (s === 'cancelled' || s === 'canceled'));

    return matchesSearch && matchesStatus;
  });

  const handleOpenBillDetails = async (bill: TreatmentBill) => {
    setSelectedBill(bill);
    setShowBillDetailModal(true);
    setDetailLoading(true);
    const full = await fetchBillDetails(bill.id);
    if (full) {
      setSelectedBill(full);
    }
    setDetailLoading(false);
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid') return { bg: '#dcfce7', text: '#15803d', label: 'Paid' };
    if (s === 'partially_paid' || s === 'partial') return { bg: '#ffedd5', text: '#c2410c', label: 'Partially Paid' };
    if (s === 'pending' || s === 'unpaid') return { bg: '#fef3c7', text: '#d97706', label: 'Pending' };
    if (s === 'cancelled' || s === 'canceled') return { bg: '#fee2e2', text: '#b91c1c', label: 'Cancelled' };
    return { bg: '#f1f5f9', text: '#475569', label: status || 'Pending' };
  };

  return (
    <View style={styles.container}>
      <PatientHeader onOpenDrawer={onOpenDrawer} onOpenNotifications={onOpenNotifications} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBox}>
          <View style={styles.titleRow}>
            <BillingCardIcon color="#0d9488" size={24} />
            <Text style={styles.pageTitle}>Treatment Bills</Text>
          </View>
          <Text style={styles.pageSub}>Manage bills, payments, and billing items</Text>
        </View>

        <View style={styles.mainCard}>
          <View style={styles.cardHeaderTopRow}>
            <View style={styles.cardTitleCol}>
              <Text style={styles.cardMainTitle}>All Bills</Text>
              <Text style={styles.cardMainSub}>View and manage treatment bills</Text>
            </View>

            <View style={styles.refreshCol}>
              <TouchableOpacity style={styles.refreshBtn} onPress={refreshBills}>
                <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
              </TouchableOpacity>
              {lastRefreshed ? (
                <Text style={styles.lastRefreshedText}>
                  Last refreshed: {lastRefreshed}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.searchFilterRow}>
            <View style={[styles.searchInputWrapper, styles.searchInputActiveFocus]}>
              <Text style={styles.searchIconText}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by bill Number, Patient Name, Patient Phone..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <TouchableOpacity style={styles.statusPickerBtn} onPress={() => setShowStatusPicker(true)}>
              <Text style={styles.statusPickerText}>{statusFilter}</Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
          ) : filteredBills.length === 0 ? (
            <View style={styles.dottedEmptyCard}>
              <Text style={styles.dottedEmptyText}>No bills found</Text>
            </View>
          ) : (
            <View style={styles.billsList}>
              {filteredBills.map((item, idx) => {
                const badge = getStatusBadgeStyle(item.status);
                const billNo = item.bill_number || `TB-${String(item.id).padStart(5, '0')}`;

                return (
                  <View key={item.id ? `tbill-${item.id}-${idx}` : `tbill-${idx}`} style={styles.billRowCard}>
                    <View style={styles.billRowHeader}>
                      <View style={styles.billNoBadge}>
                        <Text style={styles.billNoBadgeText}>{billNo}</Text>
                      </View>
                      <View style={[styles.statusBadgePill, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
                      </View>
                    </View>

                    <View style={styles.billInfoCol}>
                      <Text style={styles.patientNameText}>{item.patient_name || 'Patient'}</Text>
                      {item.patient_phone ? <Text style={styles.patientPhoneText}>📞 {item.patient_phone}</Text> : null}

                      <View style={styles.amountGridRow}>
                        <View style={styles.amountBox}>
                          <Text style={styles.amountBoxLabel}>TOTAL</Text>
                          <Text style={styles.amountBoxVal}>₹{item.total_amount || 0}.00</Text>
                        </View>
                        <View style={styles.amountBox}>
                          <Text style={styles.amountBoxLabel}>PAID</Text>
                          <Text style={[styles.amountBoxVal, { color: '#16a34a' }]}>₹{item.paid_amount || 0}.00</Text>
                        </View>
                        <View style={styles.amountBox}>
                          <Text style={styles.amountBoxLabel}>DUE</Text>
                          <Text style={[styles.amountBoxVal, { color: '#dc2626' }]}>
                            ₹{item.due_amount !== undefined ? item.due_amount : Math.max(0, (item.total_amount || 0) - (item.paid_amount || 0))}.00
                          </Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity style={styles.viewBillBtn} onPress={() => handleOpenBillDetails(item)}>
                      <Text style={styles.viewBillBtnText}>👁️ View Bill Details</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showBillDetailModal} transparent animationType="slide" onRequestClose={() => setShowBillDetailModal(false)}>
        <View style={styles.modalOverlayDark}>
          <View style={styles.invoiceModalCard}>
            <View style={styles.invoiceHeader}>
              <View style={styles.headerLeftRow}>
                <BillingCardIcon color="#ffffff" size={20} />
                <Text style={styles.invoiceTitle}>Treatment Bill {selectedBill?.bill_number || `#${selectedBill?.id}`}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBillDetailModal(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.invoiceBody}>
                <View style={styles.invoiceMetaCard}>
                  <Text style={styles.patientMetaName}>{selectedBill?.patient_name || 'Patient'}</Text>
                  <Text style={styles.patientMetaPhone}>Phone: {selectedBill?.patient_phone || '-'}</Text>
                  <Text style={styles.patientMetaPhone}>Date: {selectedBill?.created_at ? new Date(selectedBill.created_at).toLocaleDateString() : '-'}</Text>
                </View>

                <Text style={styles.lineItemsTitle}>Line Items & Services</Text>

                {!selectedBill?.items || selectedBill.items.length === 0 ? (
                  <View style={styles.noItemsBox}>
                    <Text style={styles.noItemsText}>General Treatment & Consultation Service</Text>
                    <Text style={styles.noItemsPrice}>₹{selectedBill?.total_amount || 0}.00</Text>
                  </View>
                ) : (
                  selectedBill.items.map((item, idx) => (
                    <View key={idx} style={styles.lineItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceName}>{item.service_name}</Text>
                        <Text style={styles.serviceSub}>Qty: {item.quantity} × ₹{item.unit_price}</Text>
                      </View>
                      <Text style={styles.serviceTotal}>₹{item.total_price}.00</Text>
                    </View>
                  ))
                )}

                <View style={styles.invoiceSummaryBox}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Billed Amount:</Text>
                    <Text style={styles.summaryVal}>₹{selectedBill?.total_amount || 0}.00</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Amount Paid:</Text>
                    <Text style={[styles.summaryVal, { color: '#16a34a' }]}>₹{selectedBill?.paid_amount || 0}.00</Text>
                  </View>
                  <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingTop: 6, marginTop: 4 }]}>
                    <Text style={[styles.summaryLabel, { fontWeight: '800' }]}>Balance Due:</Text>
                    <Text style={[styles.summaryVal, { color: '#dc2626', fontWeight: '800' }]}>
                      ₹{selectedBill?.due_amount !== undefined ? selectedBill.due_amount : Math.max(0, (selectedBill?.total_amount || 0) - (selectedBill?.paid_amount || 0))}.00
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}

            <View style={styles.invoiceFooter}>
              <TouchableOpacity style={styles.closeInvoiceBtn} onPress={() => setShowBillDetailModal(false)}>
                <Text style={styles.closeInvoiceBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showStatusPicker} transparent animationType="fade" onRequestClose={() => setShowStatusPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStatusPicker(false)}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Filter by Status</Text>
            {['All Status', 'Pending', 'Paid', 'Partially Paid', 'Cancelled'].map((s) => {
              const isSelected = statusFilter === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.pickerOptionRow, isSelected && styles.pickerOptionRowSelected]}
                  onPress={() => {
                    setStatusFilter(s);
                    setShowStatusPicker(false);
                  }}>
                  <View style={styles.pickerOptionLeftRow}>
                    {isSelected && <Text style={styles.checkmarkIcon}>✓ </Text>}
                    <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionSelectedText]}>
                      {s}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },

  headerBox: { marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  pageSub: { fontSize: 13, color: '#64748b', marginTop: 2 },

  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardHeaderTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  cardTitleCol: { flex: 1 },
  cardMainTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  cardMainSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  refreshCol: { alignItems: 'flex-end', gap: 4 },
  refreshBtn: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#cbd5e1' },
  refreshBtnText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  lastRefreshedText: { fontSize: 10, color: '#94a3b8' },

  searchFilterRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.8,
    borderColor: '#0d9488',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchInputActiveFocus: { backgroundColor: '#ffffff' },
  searchIconText: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 12, color: '#0f172a' },
  statusPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minWidth: 110,
  },
  statusPickerText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  pickerArrow: { fontSize: 9, color: '#94a3b8', marginLeft: 4 },

  dottedEmptyCard: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 45,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginVertical: 10,
  },
  dottedEmptyText: { fontSize: 14, fontWeight: '600', color: '#64748b' },

  billsList: { gap: 12 },
  billRowCard: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  billRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billNoBadge: { backgroundColor: '#e2e8f0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  billNoBadgeText: { fontSize: 11, fontWeight: '800', color: '#334155' },
  statusBadgePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },

  billInfoCol: { gap: 4 },
  patientNameText: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  patientPhoneText: { fontSize: 12, color: '#0d9488', fontWeight: '700' },
  amountGridRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  amountBox: { flex: 1, backgroundColor: '#ffffff', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  amountBoxLabel: { fontSize: 9, fontWeight: '800', color: '#64748b', marginBottom: 2 },
  amountBoxVal: { fontSize: 12, fontWeight: '800', color: '#0f172a' },

  viewBillBtn: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 4 },
  viewBillBtnText: { fontSize: 12, fontWeight: '700', color: '#0d9488' },

  modalOverlayDark: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 14 },
  invoiceModalCard: { width: '100%', maxWidth: 440, backgroundColor: '#ffffff', borderRadius: 20, overflow: 'hidden', maxHeight: '85%' },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#073b3a', paddingHorizontal: 16, paddingVertical: 14 },
  headerLeftRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  invoiceTitle: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  closeBtnText: { fontSize: 18, fontWeight: 'bold', color: '#94a3b8' },

  invoiceBody: { padding: 16, gap: 12 },
  invoiceMetaCard: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', gap: 2 },
  patientMetaName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  patientMetaPhone: { fontSize: 12, color: '#64748b' },
  lineItemsTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  noItemsBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 12, borderRadius: 10 },
  noItemsText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  noItemsPrice: { fontSize: 12, color: '#0f172a', fontWeight: '800' },
  lineItemRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 6 },
  serviceName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  serviceSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  serviceTotal: { fontSize: 13, fontWeight: '800', color: '#0d9488' },

  invoiceSummaryBox: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, padding: 12, gap: 6, marginTop: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 12, color: '#475569', fontWeight: '600' },
  summaryVal: { fontSize: 12, color: '#0f172a', fontWeight: '700' },

  invoiceFooter: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  closeInvoiceBtn: { backgroundColor: '#0d9488', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  closeInvoiceBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  pickerModalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, width: '100%', maxWidth: 300, elevation: 8, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
  pickerModalTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 10, textAlign: 'center' },
  pickerOptionRow: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginVertical: 2 },
  pickerOptionRowSelected: { backgroundColor: '#e6fffa' },
  pickerOptionLeftRow: { flexDirection: 'row', alignItems: 'center' },
  checkmarkIcon: { fontSize: 13, fontWeight: '800', color: '#0d9488', marginRight: 6 },
  pickerOptionText: { fontSize: 14, color: '#334155', fontWeight: '600' },
  pickerOptionSelectedText: { color: '#0d9488', fontWeight: '800' },
});

export default TreatmentBillingScreen;
