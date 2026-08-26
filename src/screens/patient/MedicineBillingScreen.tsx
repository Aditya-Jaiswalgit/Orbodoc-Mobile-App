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
import { MedicinePillIcon, PrescriptionIcon } from '../../components/common/CustomIcons';
import { useMedicineBills } from '../../hooks/useMedicineBills';
import { MedicineBill } from '../../api/medicineBillApi';

interface MedicineBillingScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
}

export const MedicineBillingScreen: React.FC<MedicineBillingScreenProps> = ({
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
}) => {
  const { bills, loading, refreshBills, fetchBillDetails } = useMedicineBills();
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedBill, setSelectedBill] = useState<MedicineBill | null>(null);
  const [showBillDetailModal, setShowBillDetailModal] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const filteredBills = bills.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    const billNo = (b.bill_number || `#${b.id}`).toLowerCase();
    const name = (b.patient_name || '').toLowerCase();
    const phone = (b.patient_phone || '').toLowerCase();

    return q === '' || billNo.includes(q) || name.includes(q) || phone.includes(q);
  });

  const handleOpenBillDetails = async (bill: MedicineBill) => {
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
    if (s === 'unpaid') return { bg: '#fee2e2', text: '#b91c1c', label: 'Unpaid' };
    return { bg: '#f1f5f9', text: '#475569', label: status || 'Pending' };
  };

  return (
    <View style={styles.container}>
      <PatientHeader onOpenDrawer={onOpenDrawer} onOpenNotifications={onOpenNotifications} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBox}>
          <View style={styles.titleRow}>
            <MedicinePillIcon color="#0d9488" size={24} />
            <Text style={styles.pageTitle}>Medicine Bills</Text>
          </View>
          <Text style={styles.pageSub}>Manage medicine bills and payments</Text>
        </View>

        <View style={styles.searchCard}>
          <View style={styles.searchRowGrid}>
            <View style={styles.searchInputWrapper}>
              <Text style={styles.searchIconText}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by patient ID, name, or mobile..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <TouchableOpacity style={styles.searchBtn} onPress={refreshBills}>
              <Text style={styles.searchBtnText}>🔍 Search</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.mainCardContainer}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderTitle}>💲 All Bills ({filteredBills.length})</Text>
            <TouchableOpacity style={styles.refreshIconBtn} onPress={refreshBills}>
              <Text style={styles.refreshIconBtnText}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
          ) : filteredBills.length === 0 ? (
            <View style={styles.emptyMedicineBox}>
              <View style={styles.emptyReceiptIconFrame}>
                <PrescriptionIcon color="#94a3b8" size={36} />
              </View>
              <Text style={styles.emptyMedicineText}>No medicine bills found</Text>
            </View>
          ) : (
            <View style={styles.billsList}>
              {filteredBills.map((item, idx) => {
                const badge = getStatusBadgeStyle(item.status);
                const billNo = item.bill_number || `MB-${String(item.id).padStart(5, '0')}`;

                return (
                  <View key={item.id ? `mbill-${item.id}-${idx}` : `mbill-${idx}`} style={styles.billRowCard}>
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
                      <Text style={styles.viewBillBtnText}>👁️ View Medicine Invoice</Text>
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
                <MedicinePillIcon color="#ffffff" size={20} />
                <Text style={styles.invoiceTitle}>Medicine Invoice {selectedBill?.bill_number || `#${selectedBill?.id}`}</Text>
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

                <Text style={styles.lineItemsTitle}>Prescribed Medicines & Items</Text>

                {!selectedBill?.items || selectedBill.items.length === 0 ? (
                  <View style={styles.noItemsBox}>
                    <Text style={styles.noItemsText}>Pharmacy Medicine Purchase</Text>
                    <Text style={styles.noItemsPrice}>₹{selectedBill?.total_amount || 0}.00</Text>
                  </View>
                ) : (
                  selectedBill.items.map((item, idx) => (
                    <View key={idx} style={styles.lineItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceName}>💊 {item.medicine_name}</Text>
                        <Text style={styles.serviceSub}>Batch: {item.batch_number || 'B101'} | Qty: {item.quantity} × ₹{item.unit_price}</Text>
                      </View>
                      <Text style={styles.serviceTotal}>₹{item.total_price}.00</Text>
                    </View>
                  ))
                )}

                <View style={styles.invoiceSummaryBox}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Amount:</Text>
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

  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  searchRowGrid: { flexDirection: 'row', gap: 8 },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchIconText: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 12, color: '#0f172a' },
  searchBtn: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  searchBtnText: { fontSize: 12, fontWeight: '700', color: '#334155' },

  mainCardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardHeaderTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  refreshIconBtn: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  refreshIconBtnText: { fontSize: 12, fontWeight: '700', color: '#0d9488' },

  emptyMedicineBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyReceiptIconFrame: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyMedicineText: { fontSize: 14, fontWeight: '600', color: '#64748b' },

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
});

export default MedicineBillingScreen;
