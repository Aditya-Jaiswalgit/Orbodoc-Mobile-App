import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import {
  ChevronDownIcon,
  ClockOutlineIcon,
  ColumnsIcon,
  MedicinePillIcon,
  MoreVerticalIcon,
  ReceiptIcon,
  SearchInputIcon,
  ViewDetailsIcon,
} from '../../components/common/CustomIcons';
import { useMedicineBills } from '../../hooks/useMedicineBills';
import { useAuthContext } from '../../context/AuthContext';
import { MedicineBill } from '../../api/medicineBillApi';
import { PaymentCheckoutModal } from '../../components/payment/PaymentCheckoutModal';
import { usePaymentCheckout } from '../../hooks/usePaymentCheckout';
import { ColumnsModal, ColumnItem } from '../../components/common/ColumnsModal';

interface MedicineBillingScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
  onToggleTabBar?: (hide: boolean) => void;
}

export const MEDICINE_BILL_COLUMNS: ColumnItem[] = [
  { id: 'bill_id', label: 'Bill ID' },
  { id: 'bill_number', label: 'Bill Number' },
  { id: 'patient_name', label: 'Patient Name' },
  { id: 'patient_phone', label: 'Patient Phone' },
  { id: 'total_amount', label: 'Total Amount' },
  { id: 'paid_amount', label: 'Paid Amount' },
  { id: 'due_amount', label: 'Due Amount' },
  { id: 'status', label: 'Status' },
  { id: 'payment_method', label: 'Payment Method' },
  { id: 'date', label: 'Date' },
  { id: 'actions', label: 'Actions', isDividerBefore: true },
];

export const DEFAULT_MEDICINE_BILL_COLUMNS: string[] = [
  'bill_number',
  'patient_name',
  'patient_phone',
  'total_amount',
  'status',
  'payment_method',
  'date',
  'actions',
];

const formatCardDate = (dateStr?: string) => {
  if (!dateStr) return '03 Sept 2026';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    return String(d.getDate()).padStart(2, '0') + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  } catch {
    return dateStr;
  }
};

export const MedicineBillingScreen: React.FC<MedicineBillingScreenProps> = ({
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
  onToggleTabBar,
}) => {
  const { user } = useAuthContext();
  const { bills, loading, refreshBills, fetchBillDetails } = useMedicineBills();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_MEDICINE_BILL_COLUMNS);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);

  const [selectedBill, setSelectedBill] = useState<MedicineBill | null>(null);
  const [showBillDetailModal, setShowBillDetailModal] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const payment = usePaymentCheckout();

  useEffect(() => {
    if (onToggleTabBar) {
      onToggleTabBar(showBillDetailModal || payment.visible || showColumnsModal);
    }
  }, [showBillDetailModal, payment.visible, showColumnsModal, onToggleTabBar]);

  useEffect(() => {
    return () => {
      onToggleTabBar?.(false);
    };
  }, [onToggleTabBar]);

  const paySelectedBill = () => {
    if (!selectedBill) return;
    const due = Number(
      selectedBill.due_amount ??
        Math.max(0, Number(selectedBill.total_amount || 0) - Number(selectedBill.paid_amount || 0))
    );
    if (due <= 0) return;
    setShowBillDetailModal(false);
    payment.openCheckout({
      target: 'medicine_bill',
      billId: selectedBill.id,
      amount: due,
      title: 'Medicine bill payment',
    });
  };

  const myBills = bills.filter((b) => {
    const userId = user?.patient_id || user?.id || user?.userId;
    const userPhone = String(user?.phone || '').replace(/\D/g, '');
    const userName = String(user?.fullName || user?.full_name || '').trim().toLowerCase();
    const billPatientId = (b as any).patient_id || (b as any).patient?.id;
    const billPhone = String(b.patient_phone || (b as any).patient?.phone || '').replace(/\D/g, '');
    const billName = String(b.patient_name || (b as any).patient?.full_name || '').trim().toLowerCase();

    return Boolean(
      (userId && billPatientId && String(userId) === String(billPatientId)) ||
      (userPhone && billPhone && userPhone === billPhone) ||
      (userName && billName && (userName === billName || userName.includes(billName) || billName.includes(userName)))
    );
  });

  const filteredBills = myBills.filter((b) => {
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

  const handleToggleColumn = (colId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  const renderStatusBadge = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
          <Text style={[styles.statusBadgeText, { color: '#15803d' }]}>Paid</Text>
        </View>
      );
    }
    if (s === 'partially_paid' || s === 'partial') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#e0e7ff' }]}>
          <ClockOutlineIcon color="#3b82f6" size={12} strokeWidth={2.2} />
          <Text style={[styles.statusBadgeText, { color: '#3b82f6' }]}>Partially Paid</Text>
        </View>
      );
    }
    if (s === 'pending' || s === 'unpaid') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#fef3c7' }]}>
          <ClockOutlineIcon color="#b45309" size={12} strokeWidth={2.2} />
          <Text style={[styles.statusBadgeText, { color: '#b45309' }]}>Pending</Text>
        </View>
      );
    }
    if (s === 'cancelled' || s === 'canceled') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#fee2e2' }]}>
          <Text style={[styles.statusBadgeText, { color: '#b91c1c' }]}>Cancelled</Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusBadge, { backgroundColor: '#f1f5f9' }]}>
        <Text style={[styles.statusBadgeText, { color: '#475569' }]}>{status || 'Pending'}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <PatientHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        showLogo={false}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshBills} colors={['#0d9488']} />}>
        {/* ─── TOP HEADER SECTION ─── */}
        <View style={styles.topHeaderSection}>
          <View style={styles.topTitleRow}>
            <ReceiptIcon color="#0f172a" size={24} strokeWidth={2} />
            <Text style={styles.topPageTitle}>Medicine Bills</Text>
          </View>
          <Text style={styles.topSubtitleText}>Manage medicine bills and payments</Text>
        </View>

        {/* ─── CARD 1: SEARCH CARD ─── */}
        <View style={styles.searchCard}>
          <View style={styles.searchInputWrapper}>
            <SearchInputIcon size={16} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by patient ID, name, or mobile..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <TouchableOpacity style={styles.searchBtn} activeOpacity={0.8} onPress={refreshBills}>
            <SearchInputIcon size={16} color="#0f172a" />
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* ─── CARD 2: ALL BILLS CARD ─── */}
        <View style={styles.mainCardContainer}>
          <View style={styles.allBillsTitleRow}>
            <ReceiptIcon color="#0f172a" size={18} strokeWidth={2} />
            <Text style={styles.allBillsTitle}>All Bills ({filteredBills.length})</Text>
          </View>

          <TouchableOpacity
            style={styles.columnsBtn}
            activeOpacity={0.8}
            onPress={() => setShowColumnsModal(true)}>
            <ColumnsIcon size={16} color="#0f172a" />
            <Text style={styles.columnsBtnText}>Columns</Text>
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 48 }} />
          ) : filteredBills.length === 0 ? (
            <View style={styles.emptyMedicineBox}>
              <ReceiptIcon color="#cbd5e1" size={56} strokeWidth={1.5} />
              <Text style={styles.emptyMedicineText}>No medicine bills found</Text>
            </View>
          ) : (
            <View style={styles.billsList}>
              {filteredBills.map((item, idx) => {
                const isCardActive = selectedCardId === item.id || (selectedCardId === null && idx === 0);
                const billNo = item.bill_number || `MB-${String(item.id).padStart(5, '0')}`;
                const pName = item.patient_name || 'Patient';
                const phone = item.patient_phone || '-';
                const cardDate = formatCardDate(item.created_at || (item as any).bill_date);
                const totalAmt = Number(item.total_amount || item.net_amount || 0);
                const paidAmt = Number(item.paid_amount || (item.status === 'paid' ? totalAmt : 0));
                const dueAmt = item.due_amount !== undefined ? Number(item.due_amount) : Math.max(0, totalAmt - paidAmt);
                const pmMethod = (item as any).payment_method
                  ? String((item as any).payment_method).charAt(0).toUpperCase() + String((item as any).payment_method).slice(1).toLowerCase()
                  : 'Cash';

                return (
                  <TouchableOpacity
                    key={item.id ? `mb-${item.id}` : `mb-${idx}`}
                    activeOpacity={0.92}
                    style={[styles.billCard, isCardActive && styles.billCardActive]}
                    onPress={() => setSelectedCardId(item.id)}>

                    <View style={styles.cardTopRow}>
                      <View style={styles.billNumberCol}>
                        {selectedColumns.includes('bill_number') && (
                          <Text style={styles.billNumberText}>{billNo}</Text>
                        )}
                        {selectedColumns.includes('bill_id') && (
                          <Text style={styles.billIdText}>ID: #{item.id}</Text>
                        )}
                      </View>
                      {selectedColumns.includes('status') && renderStatusBadge(item.status)}
                    </View>

                    <View style={styles.patientRow}>
                      {selectedColumns.includes('patient_name') && (
                        <Text style={styles.patientNameText}>{pName}</Text>
                      )}
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.cardMiddleRow}>
                      {selectedColumns.includes('total_amount') && (
                        <View style={styles.middleCol}>
                          <Text style={styles.middleLabel}>TOTAL</Text>
                          <Text style={styles.middleValBig}>
                            ₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        </View>
                      )}
                      {selectedColumns.includes('paid_amount') && (
                        <View style={styles.middleCol}>
                          <Text style={styles.middleLabel}>PAID</Text>
                          <Text style={[styles.middleValBig, { color: '#16a34a' }]}>
                            ₹{paidAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        </View>
                      )}
                      {selectedColumns.includes('due_amount') && (
                        <View style={styles.middleCol}>
                          <Text style={styles.middleLabel}>DUE</Text>
                          <Text style={[styles.middleValBig, { color: dueAmt > 0 ? '#dc2626' : '#16a34a' }]}>
                            ₹{dueAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        </View>
                      )}
                      {selectedColumns.includes('patient_phone') && (
                        <View style={styles.middleCol}>
                          <Text style={styles.middleLabel}>PHONE</Text>
                          <Text style={styles.middleValPhone}>{phone}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.cardBottomRow}>
                      <View style={styles.bottomMetaCol}>
                        {selectedColumns.includes('date') && <Text style={styles.bottomDateText}>{cardDate}</Text>}
                        {selectedColumns.includes('payment_method') && <Text style={styles.bottomMethodText}>{pmMethod}</Text>}
                      </View>

                      {selectedColumns.includes('actions') && (
                        <View style={styles.actionButtonsRow}>
                          <TouchableOpacity
                            style={styles.eyeActionBtn}
                            activeOpacity={0.75}
                            onPress={() => handleOpenBillDetails(item)}>
                            <ViewDetailsIcon size={18} color="#0d9488" strokeWidth={2} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.moreActionBtn}
                            activeOpacity={0.75}
                            onPress={() => handleOpenBillDetails(item)}>
                            <MoreVerticalIcon size={18} color="#475569" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ─── COLUMNS MODAL ─── */}
      <ColumnsModal
        visible={showColumnsModal}
        onClose={() => setShowColumnsModal(false)}
        title="Show / Hide Columns"
        columns={MEDICINE_BILL_COLUMNS}
        selectedIds={selectedColumns}
        onToggle={handleToggleColumn}
      />

      {/* ─── BILL DETAILS MODAL ─── */}
      <Modal
        visible={showBillDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBillDetailModal(false)}>
        <View style={styles.modalOverlayDark}>
          <View style={styles.invoiceModalCard}>
            <View style={styles.invoiceHeader}>
              <View style={styles.headerLeftRow}>
                <ReceiptIcon color="#ffffff" size={20} />
                <Text style={styles.invoiceTitle}>
                  Medicine Invoice {selectedBill?.bill_number || `#${selectedBill?.id}`}
                </Text>
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
                  <Text style={styles.patientMetaPhone}>
                    Date: {selectedBill?.created_at ? new Date(selectedBill.created_at).toLocaleDateString() : '-'}
                  </Text>
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
                        <Text style={styles.serviceSub}>
                          Batch: {item.batch_number || 'B101'} | Qty: {item.quantity} × ₹{item.unit_price}
                        </Text>
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
                    <Text style={[styles.summaryVal, { color: '#16a34a' }]}>
                      ₹{selectedBill?.paid_amount || 0}.00
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.summaryRow,
                      { borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingTop: 6, marginTop: 4 },
                    ]}>
                    <Text style={[styles.summaryLabel, { fontWeight: '800' }]}>Balance Due:</Text>
                    <Text style={[styles.summaryVal, { color: '#dc2626', fontWeight: '800' }]}>
                      ₹
                      {selectedBill?.due_amount !== undefined
                        ? selectedBill.due_amount
                        : Math.max(0, (selectedBill?.total_amount || 0) - (selectedBill?.paid_amount || 0))}
                      .00
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}

            <View style={styles.invoiceFooter}>
              {Number(
                selectedBill?.due_amount ??
                  Math.max(0, Number(selectedBill?.total_amount || 0) - Number(selectedBill?.paid_amount || 0))
              ) > 0 ? (
                <TouchableOpacity style={styles.payInvoiceBtn} onPress={paySelectedBill}>
                  <Text style={styles.closeInvoiceBtnText}>Pay with Razorpay</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.closeInvoiceBtn} onPress={() => setShowBillDetailModal(false)}>
                <Text style={styles.closeInvoiceBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PaymentCheckoutModal
        visible={payment.visible}
        amount={payment.amount}
        title={payment.title}
        step={payment.step}
        loading={payment.loading}
        error={payment.error}
        newBalance={payment.newBalance}
        orderDetails={payment.orderDetails}
        onSetAmount={payment.setAmount}
        onStartPayment={payment.startPayment}
        onConfirmPayment={(response) => payment.confirmPayment(response, refreshBills)}
        onClose={payment.closeCheckout}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 100 },

  topHeaderSection: { marginBottom: 16, marginTop: 4 },
  topTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topPageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  topSubtitleText: { fontSize: 13.5, color: '#64748b', marginTop: 4 },

  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 13.5, color: '#0f172a', paddingVertical: 0 },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  searchBtnText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },

  mainCardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  allBillsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  allBillsTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },

  columnsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  columnsBtnText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },

  emptyMedicineBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56 },
  emptyMedicineText: { fontSize: 14, fontWeight: '500', color: '#64748b', marginTop: 14 },

  billsList: { gap: 12, marginTop: 16 },
  billCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  billCardActive: { borderColor: '#14b8a6', borderWidth: 1.5 },

  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  billNumberCol: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  billNumberText: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  billIdText: { fontSize: 12, color: '#64748b', fontWeight: '600' },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 11.5, fontWeight: '700' },

  patientRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  patientNameText: { fontSize: 13.5, color: '#64748b', fontWeight: '500' },

  cardDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },

  cardMiddleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  middleCol: { gap: 2 },
  middleLabel: { fontSize: 10.5, fontWeight: '700', color: '#64748b', letterSpacing: 0.5 },
  middleValBig: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  middleValPhone: { fontSize: 14, fontWeight: '700', color: '#0f172a' },

  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  bottomMetaCol: { gap: 2 },
  bottomDateText: { fontSize: 12.5, color: '#64748b', fontWeight: '500' },
  bottomMethodText: { fontSize: 12.5, color: '#64748b', fontWeight: '500' },

  actionButtonsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeActionBtn: { width: 38, height: 38, borderRadius: 8, backgroundColor: '#f0fdfa', borderWidth: 1, borderColor: '#99f6e4', alignItems: 'center', justifyContent: 'center' },
  moreActionBtn: { width: 38, height: 38, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },

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

  invoiceFooter: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff', flexDirection: 'row', justifyContent: 'flex-end', gap: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  payInvoiceBtn: { backgroundColor: '#0d9488', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  closeInvoiceBtn: { backgroundColor: '#0d9488', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  closeInvoiceBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
});

export default MedicineBillingScreen;
