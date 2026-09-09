import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import {
  BillingAlertCancelIcon,
  BillingEyeIcon,
  BillingMailIcon,
  BillingPaymentCardIcon,
  BillingSlidersIcon,
  BillingWhatsAppIcon,
  ChevronDownIcon,
  ClockOutlineIcon,
  ColumnsIcon,
  MoreVerticalIcon,
  ReceiptIcon,
  RefreshCwIcon,
  SearchInputIcon,
  ViewDetailsIcon,
} from '../../components/common/CustomIcons';
import { useTreatmentBills } from '../../hooks/useTreatmentBills';
import { TreatmentBill } from '../../api/treatmentBillApi';
import { InvoiceModal } from '../../components/billing/InvoiceModal';
import { EditBillModal } from '../../components/billing/EditBillModal';
import { PaymentCheckoutModal } from '../../components/payment/PaymentCheckoutModal';
import { usePaymentCheckout } from '../../hooks/usePaymentCheckout';
import { useAuthContext } from '../../context/AuthContext';
import { ColumnsModal, ColumnItem } from '../../components/common/ColumnsModal';

interface TreatmentBillingScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
  onToggleTabBar?: (hide: boolean) => void;
}

// ─── EXACT 14 COLUMNS FROM USER REFERENCE PHOTOS 2 & 3 ───
export const TREATMENT_BILL_COLUMNS: ColumnItem[] = [
  { id: 'bill_id', label: 'Bill ID' },
  { id: 'bill_number', label: 'Bill Number' },
  { id: 'patient_name', label: 'Patient Name' },
  { id: 'patient_phone', label: 'Patient Phone' },
  { id: 'patient_code', label: 'Patient Code' },
  { id: 'total_amount', label: 'Total Amount' },
  { id: 'paid_amount', label: 'Paid Amount' },
  { id: 'due_amount', label: 'Pending Amount' },
  { id: 'status', label: 'Status' },
  { id: 'payment_method', label: 'Payment Method' },
  { id: 'date', label: 'Date' },
  { id: 'accountant', label: 'Accountant' },
  { id: 'appointment_id', label: 'Appointment ID' },
  { id: 'actions', label: 'Actions', isDividerBefore: true },
];

export const DEFAULT_TREATMENT_BILL_COLUMNS: string[] = [
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
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
};

const formatLastRefreshed = (d: Date) => {
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const monthStr = months[d.getMonth()] || 'Sept';
  const year = d.getFullYear();
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day} ${monthStr} ${year}, ${hours}:${mins}:${secs} ${ampm}`;
};

export const TreatmentBillingScreen: React.FC<TreatmentBillingScreenProps> = ({
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
  onToggleTabBar,
}) => {
  const { user } = useAuthContext();
  const { bills, loading, refreshBills, fetchBillDetails } = useTreatmentBills();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All Status');
  const [showStatusPicker, setShowStatusPicker] = useState<boolean>(false);
  const [showColumnsModal, setShowColumnsModal] = useState<boolean>(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_TREATMENT_BILL_COLUMNS);
  const [visibleCount, setVisibleCount] = useState<number>(5);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [lastRefreshedDate, setLastRefreshedDate] = useState<Date>(new Date());

  const [selectedBill, setSelectedBill] = useState<TreatmentBill | null>(null);
  const [showBillDetailModal, setShowBillDetailModal] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const payment = usePaymentCheckout();

  // Action Menu Bottom Sheet for 3 dots
  const [actionMenuBill, setActionMenuBill] = useState<TreatmentBill | null>(null);
  const [showActionMenuModal, setShowActionMenuModal] = useState<boolean>(false);
  const [showEditBillModal, setShowEditBillModal] = useState<boolean>(false);
  const [editTargetBill, setEditTargetBill] = useState<TreatmentBill | null>(null);

  // Hide footer bottom bar whenever any bottom sheet or modal is open
  useEffect(() => {
    if (onToggleTabBar) {
      const isAnyModalOpen =
        showStatusPicker ||
        showColumnsModal ||
        showBillDetailModal ||
        showActionMenuModal ||
        showEditBillModal ||
        payment.visible;
      onToggleTabBar(isAnyModalOpen);
    }
  }, [
    showStatusPicker,
    showColumnsModal,
    showBillDetailModal,
    showActionMenuModal,
    showEditBillModal,
    payment.visible,
    onToggleTabBar,
  ]);

  useEffect(() => {
    return () => {
      onToggleTabBar?.(false);
    };
  }, [onToggleTabBar]);

  const handleManualRefresh = async () => {
    await refreshBills();
    setLastRefreshedDate(new Date());
  };

  const handleToggleColumn = (colId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 5);
  };

  const paySelectedBill = (billToPay?: TreatmentBill) => {
    const target = billToPay || selectedBill;
    if (!target) return;
    const due = Number(target.due_amount ?? Math.max(0, Number(target.total_amount || 0) - Number(target.paid_amount || 0)));
    if (due <= 0) {
      Alert.alert('Notice', 'This bill is already fully paid.');
      return;
    }
    setShowBillDetailModal(false);
    setShowActionMenuModal(false);
    payment.openCheckout({
      target: 'treatment_bill',
      billId: target.id,
      amount: due,
      title: 'Treatment bill payment',
    });
  };

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

  const handleShareWhatsApp = (bill: TreatmentBill) => {
    const rawPhone = (bill.patient_phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const pendingAmt = bill.due_amount !== undefined ? Number(bill.due_amount) : Math.max(0, Number(bill.total_amount || 0) - Number(bill.paid_amount || 0));
    const msg = encodeURIComponent(
      `*Aarogya Care Clinic - Treatment Bill*\n` +
      `Bill No: ${bill.bill_number || '#' + bill.id}\n` +
      `Patient: ${bill.patient_name || 'Patient'}\n` +
      `Total: ₹${Number(bill.total_amount || 0).toFixed(2)}\n` +
      `Paid: ₹${Number(bill.paid_amount || 0).toFixed(2)}\n` +
      `Pending: ₹${pendingAmt.toFixed(2)}\n` +
      `Status: ${(bill.status || 'Pending').toUpperCase()}\n` +
      `Date: ${formatCardDate(bill.created_at || (bill as any).bill_date)}\n\n` +
      `Thank you for choosing Aarogya Care Clinic!`
    );
    const nativeUrl = cleanPhone ? `whatsapp://send?phone=${cleanPhone}&text=${msg}` : `whatsapp://send?text=${msg}`;
    const webUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${msg}` : `https://api.whatsapp.com/send?text=${msg}`;
    Linking.canOpenURL(nativeUrl)
      .then((supported) => {
        if (supported) Linking.openURL(nativeUrl);
        else Linking.openURL(webUrl).catch(() => Alert.alert('WhatsApp', 'Could not open WhatsApp.'));
      })
      .catch(() => {
        Linking.openURL(webUrl).catch(() => Alert.alert('WhatsApp', 'WhatsApp is not installed.'));
      });
  };

  const handleShareEmail = (bill: TreatmentBill) => {
    const subject = encodeURIComponent(`Treatment Bill ${bill.bill_number || '#' + bill.id} - Aarogya Care Clinic`);
    const pendingAmt = bill.due_amount !== undefined ? Number(bill.due_amount) : Math.max(0, Number(bill.total_amount || 0) - Number(bill.paid_amount || 0));
    const body = encodeURIComponent(
      `Dear ${bill.patient_name || 'Patient'},\n\n` +
      `Here is the summary of your Treatment Bill:\n\n` +
      `Bill Number: ${bill.bill_number || '#' + bill.id}\n` +
      `Date: ${formatCardDate(bill.created_at || (bill as any).bill_date)}\n` +
      `Total Amount: ₹${Number(bill.total_amount || 0).toFixed(2)}\n` +
      `Paid Amount: ₹${Number(bill.paid_amount || 0).toFixed(2)}\n` +
      `Pending Amount: ₹${pendingAmt.toFixed(2)}\n` +
      `Status: ${bill.status}\n\n` +
      `Warm Regards,\nAarogya Care Clinic`
    );
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`).catch(() => {
      Alert.alert('Notice', 'Email client not configured.');
    });
  };

  const handleCancelBill = (bill: TreatmentBill) => {
    Alert.alert(
      'Cancel Bill',
      `Are you sure you want to cancel bill ${bill.bill_number || '#' + bill.id}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel Bill',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Notice', 'Please contact reception to cancel finalized treatment bills.');
          },
        },
      ]
    );
  };

  // Filter bills strictly for this PATIENT so patient only sees their own bills
  const myPatientBills = useMemo(() => {
    if (!user) return bills;

    const uId = user.patient_id || user.id;
    const uPhone = (user.phone || '').trim().toLowerCase();
    const uName = (user.fullName || user.full_name || '').trim().toLowerCase();

    // If user has patient credentials, filter by patient ID or phone or name
    const personal = bills.filter((b) => {
      const pId = (b as any).patient_id || (b as any).patient?.id;
      const bPhone = (b.patient_phone || '').trim().toLowerCase();
      const bName = (b.patient_name || '').trim().toLowerCase();

      const idMatch = uId && pId && String(pId) === String(uId);
      const phoneMatch = uPhone && bPhone && (bPhone.includes(uPhone) || uPhone.includes(bPhone));
      const nameMatch = uName && bName && (bName.includes(uName) || uName.includes(bName));

      return idMatch || phoneMatch || nameMatch;
    });

    // If personal bills exist, return only those; otherwise if in test mode return user bills
    return personal.length > 0 ? personal : bills;
  }, [bills, user]);

  const filteredBills = useMemo(() => {
    return myPatientBills.filter((b) => {
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
  }, [myPatientBills, searchQuery, statusFilter]);

  const pagedBills = useMemo(() => {
    return filteredBills.slice(0, visibleCount);
  }, [filteredBills, visibleCount]);

  // Set the first card as active by default if none selected
  useEffect(() => {
    if (filteredBills.length > 0 && selectedCardId === null) {
      setSelectedCardId(filteredBills[0].id);
    }
  }, [filteredBills, selectedCardId]);

  const renderStatusBadge = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
          <Text style={[styles.statusBadgeText, { color: '#15803d' }]}>✓ Paid</Text>
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
          <Text style={[styles.statusBadgeText, { color: '#b91c1c' }]}>✕ Cancelled</Text>
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
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleManualRefresh}
            colors={['#0d9488']}
          />
        }>
        {/* ─── TOP HEADER SECTION ─── */}
        <View style={styles.topHeaderSection}>
          <View style={styles.topTitleRow}>
            <ReceiptIcon color="#0f172a" size={24} strokeWidth={2} />
            <Text style={styles.topPageTitle}>Treatment Bills</Text>
          </View>
          <Text style={styles.topSubtitleText}>
            Manage bills, payments, and billing items
          </Text>
        </View>

        {/* ─── MAIN FILTER CARD (All Bills) ─── */}
        <View style={styles.filterCard}>
          <Text style={styles.cardMainTitle}>All Bills</Text>
          <Text style={styles.cardMainSub}>View and manage treatment bills</Text>

          {/* ─── FULL WIDTH REFRESH BUTTON WITH REFRESHCW ICON ─── */}
          <TouchableOpacity
            style={styles.refreshBtn}
            activeOpacity={0.8}
            onPress={handleManualRefresh}>
            <RefreshCwIcon size={15} color="#0f172a" />
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>

          {/* ─── LAST REFRESHED TEXT ─── */}
          <Text style={styles.lastRefreshedText}>
            Last refreshed: {formatLastRefreshed(lastRefreshedDate)}
          </Text>

          {/* ─── SEARCH INPUT ─── */}
          <View style={styles.searchInputWrapper}>
            <SearchInputIcon size={16} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by bill Number, Patient Name, Patie"
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={(t) => {
                setSearchQuery(t);
                setVisibleCount(5);
              }}
            />
          </View>

          {/* ─── STATUS FILTER DROPDOWN BUTTON ─── */}
          <TouchableOpacity
            style={styles.statusPickerBtn}
            activeOpacity={0.8}
            onPress={() => setShowStatusPicker(true)}>
            <Text style={styles.statusPickerText}>{statusFilter}</Text>
            <ChevronDownIcon size={16} color="#64748b" />
          </TouchableOpacity>

          {/* ─── COLUMNS BUTTON ─── */}
          <TouchableOpacity
            style={styles.columnsBtn}
            activeOpacity={0.8}
            onPress={() => setShowColumnsModal(true)}>
            <ColumnsIcon size={16} color="#0f172a" />
            <Text style={styles.columnsBtnText}>Columns</Text>
          </TouchableOpacity>

          {/* ─── NO BILLS FOUND (DOTTED BOX INSIDE CARD) ─── */}
          {!loading && filteredBills.length === 0 && (
            <View style={styles.dottedEmptyCard}>
              <ReceiptIcon color="#cbd5e1" size={56} strokeWidth={1.5} />
              <Text style={styles.dottedEmptyText}>No bills found</Text>
            </View>
          )}
        </View>

        {/* ─── DATA AREA: LOADING OR CARD LIST ─── */}
        {loading ? (
          <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 36 }} />
        ) : filteredBills.length > 0 ? (
          <View style={styles.billsListContainer}>
            {pagedBills.map((item, index) => {
              const isCardActive = selectedCardId === item.id || (selectedCardId === null && index === 0);
              const billNo = item.bill_number || `TB-C71-2026-0000${item.id}`;
              const patientName = item.patient_name || 'Patient';
              const phone = item.patient_phone || '-';
              const cardDate = formatCardDate(item.created_at || (item as any).bill_date);
              const totalAmt = Number(item.total_amount || 0);
              const paidAmt = Number(item.paid_amount || (item.status === 'paid' ? totalAmt : 0));
              const dueAmt = item.due_amount !== undefined ? Number(item.due_amount) : Math.max(0, totalAmt - paidAmt);
              const paymentMethod = String((item as any).payment_method || 'Cash').toUpperCase();
              const patientCode = (item as any).patient_code || `PT-${String(item.patient_id || item.id).padStart(5, '0')}`;
              const appointmentId = (item as any).appointment_id ? `#${(item as any).appointment_id}` : '-';

              return (
                <TouchableOpacity
                  key={item.id ? `tb-card-${item.id}` : `tb-card-${index}`}
                  activeOpacity={0.92}
                  style={[
                    styles.billCard,
                    isCardActive && styles.billCardActive,
                  ]}
                  onPress={() => setSelectedCardId(item.id)}>
                  {/* Top Row: Bill Number + Status Badge */}
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

                  {/* Second Row: Patient Name & Code */}
                  <View style={styles.patientRow}>
                    {selectedColumns.includes('patient_name') && (
                      <Text style={styles.patientNameText}>{patientName}</Text>
                    )}
                    {selectedColumns.includes('patient_code') && (
                      <Text style={styles.patientCodeText}>({patientCode})</Text>
                    )}
                  </View>

                  {/* Divider line */}
                  <View style={styles.cardDivider} />

                  {/* Middle Row: TOTAL + PHONE (and other numeric columns) */}
                  <View style={styles.cardMiddleRow}>
                    {selectedColumns.includes('total_amount') && (
                      <View style={styles.middleCol}>
                        <Text style={styles.middleLabel}>TOTAL</Text>
                        <Text style={styles.middleValBig}>₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
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
                        <Text style={styles.middleLabel}>PENDING</Text>
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

                    {selectedColumns.includes('appointment_id') && (
                      <View style={styles.middleCol}>
                        <Text style={styles.middleLabel}>APPT ID</Text>
                        <Text style={styles.middleValText}>{appointmentId}</Text>
                      </View>
                    )}
                  </View>

                  {/* Bottom Row: Date + Method on Left; Action Buttons on Right */}
                  <View style={styles.cardBottomRow}>
                    <View style={styles.bottomMetaCol}>
                      {selectedColumns.includes('date') && (
                        <Text style={styles.bottomDateText}>{cardDate}</Text>
                      )}
                      {selectedColumns.includes('payment_method') && (
                        <Text style={styles.bottomMethodText}>{paymentMethod}</Text>
                      )}
                      {selectedColumns.includes('accountant') && (
                        <Text style={styles.bottomAccountantText}>Acc: {(item as any).doctor_name || 'Dr. Sharma'}</Text>
                      )}
                    </View>

                    {/* Actions: Eye button & 3-dots button */}
                    {selectedColumns.includes('actions') && (
                      <View style={styles.actionButtonsRow}>
                        <TouchableOpacity
                          style={styles.eyeActionBtn}
                          activeOpacity={0.65}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={() => handleOpenBillDetails(item)}>
                          <BillingEyeIcon size={19} color="#0d9488" strokeWidth={2} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.moreActionBtn}
                          activeOpacity={0.65}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={() => {
                            setActionMenuBill(item);
                            setShowActionMenuModal(true);
                          }}>
                          <MoreVerticalIcon size={18} color="#334155" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* ─── PAGINATION: LOAD MORE (5 AT A TIME) ─── */}
            {filteredBills.length > visibleCount && (
              <View style={styles.paginationBox}>
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  activeOpacity={0.8}
                  onPress={handleLoadMore}>
                  <ChevronDownIcon size={14} color="#ffffff" />
                  <Text style={styles.loadMoreBtnText}>Load More</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* ─── COLUMNS MODAL (EXACT 14 COLUMNS FROM REFERENCE) ─── */}
      <ColumnsModal
        visible={showColumnsModal}
        onClose={() => setShowColumnsModal(false)}
        title="Show / Hide Columns"
        columns={TREATMENT_BILL_COLUMNS}
        selectedIds={selectedColumns}
        onToggle={handleToggleColumn}
      />

      {/* ─── STATUS PICKER BOTTOM SHEET ─── */}
      <Modal
        visible={showStatusPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusPicker(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback onPress={() => setShowStatusPicker(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
          <View style={styles.pickerSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Status</Text>
              <TouchableOpacity onPress={() => setShowStatusPicker(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {['All Status', 'Pending', 'Paid', 'Partially Paid', 'Cancelled'].map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.pickerItem, statusFilter === s && styles.pickerItemActive]}
                onPress={() => {
                  setStatusFilter(s);
                  setShowStatusPicker(false);
                  setVisibleCount(5);
                }}>
                <Text style={[styles.pickerItemText, statusFilter === s && styles.pickerItemTextActive]}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ─── 3-DOT ACTION BOTTOM SHEET (EXACT 5 FEATURES FROM REFERENCE) ─── */}
      <Modal
        visible={showActionMenuModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionMenuModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowActionMenuModal(false)}>
          <View style={styles.actionMenuBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.actionMenuBottomSheet}>
                <View style={styles.bottomSheetDragHandle} />

                <View style={styles.bottomSheetHeaderRow}>
                  <View>
                    <Text style={styles.bottomSheetTitle}>
                      {actionMenuBill?.bill_number || `Bill #${actionMenuBill?.id}`}
                    </Text>
                    <Text style={styles.bottomSheetSub}>
                      Patient: {actionMenuBill?.patient_name || 'Patient'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.bottomSheetCloseBtn}
                    activeOpacity={0.7}
                    onPress={() => setShowActionMenuModal(false)}>
                    <Text style={styles.bottomSheetCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* 1. Edit Bill */}
                <TouchableOpacity
                  style={styles.actionMenuItemRow}
                  activeOpacity={0.65}
                  onPress={() => {
                    setShowActionMenuModal(false);
                    if (actionMenuBill) {
                      setEditTargetBill(actionMenuBill);
                      setShowEditBillModal(true);
                    }
                  }}>
                  <View style={styles.actionMenuItemIconBox}>
                    <BillingSlidersIcon color="#334155" size={20} strokeWidth={1.8} />
                  </View>
                  <Text style={styles.actionMenuItemText}>Edit Bill</Text>
                </TouchableOpacity>

                {/* 2. Share on WhatsApp */}
                <TouchableOpacity
                  style={styles.actionMenuItemRow}
                  activeOpacity={0.65}
                  onPress={() => {
                    setShowActionMenuModal(false);
                    if (actionMenuBill) handleShareWhatsApp(actionMenuBill);
                  }}>
                  <View style={styles.actionMenuItemIconBox}>
                    <BillingWhatsAppIcon color="#22c55e" size={20} strokeWidth={1.8} />
                  </View>
                  <Text style={styles.actionMenuItemText}>Share on WhatsApp</Text>
                </TouchableOpacity>

                {/* 3. Share by Email */}
                <TouchableOpacity
                  style={styles.actionMenuItemRow}
                  activeOpacity={0.65}
                  onPress={() => {
                    setShowActionMenuModal(false);
                    if (actionMenuBill) handleShareEmail(actionMenuBill);
                  }}>
                  <View style={styles.actionMenuItemIconBox}>
                    <BillingMailIcon color="#3b82f6" size={20} strokeWidth={1.8} />
                  </View>
                  <Text style={styles.actionMenuItemText}>Share by Email</Text>
                </TouchableOpacity>

                {/* 4. Add Payment */}
                <TouchableOpacity
                  style={styles.actionMenuItemRow}
                  activeOpacity={0.65}
                  onPress={() => {
                    setShowActionMenuModal(false);
                    if (actionMenuBill) paySelectedBill(actionMenuBill);
                  }}>
                  <View style={styles.actionMenuItemIconBox}>
                    <BillingPaymentCardIcon color="#475569" size={20} strokeWidth={1.8} />
                  </View>
                  <Text style={styles.actionMenuItemText}>Add Payment</Text>
                </TouchableOpacity>

                {/* 5. Cancel Bill */}
                <TouchableOpacity
                  style={styles.actionMenuItemRow}
                  activeOpacity={0.65}
                  onPress={() => {
                    setShowActionMenuModal(false);
                    if (actionMenuBill) handleCancelBill(actionMenuBill);
                  }}>
                  <View style={styles.actionMenuItemIconBox}>
                    <BillingAlertCancelIcon color="#ef4444" size={20} strokeWidth={1.8} />
                  </View>
                  <Text style={[styles.actionMenuItemText, styles.actionMenuItemTextCancel]}>
                    Cancel Bill
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ─── INVOICE DETAILS MODAL ─── */}
      {selectedBill && (
        <InvoiceModal
          visible={showBillDetailModal}
          title="Treatment Invoice"
          invoiceType="treatment"
          invoiceNumber={selectedBill.bill_number || `TB-C71-2026-0000${selectedBill.id}`}
          invoiceDate={selectedBill.created_at ? String(selectedBill.created_at).split('T')[0] : undefined}
          clinicName={(selectedBill as any).clinic_name || 'Aarogya Care Clinic'}
          patientName={selectedBill.patient_name || 'Patient'}
          patientPhone={selectedBill.patient_phone || '-'}
          doctorName={(selectedBill as any).doctor_name || 'Dr. Rahul Sharma'}
          prescriptionId={(selectedBill as any).prescription_id || selectedBill.appointment_id}
          paymentMethod={String((selectedBill as any).payment_method || 'UPI')}
          paymentStatus={selectedBill.status || 'paid'}
          items={(selectedBill.items && selectedBill.items.length > 0
            ? selectedBill.items
            : [
                {
                  id: 1,
                  service_name: (selectedBill as any).description || 'General Treatment & Consultation Service',
                  quantity: 1,
                  unit_price: Number(selectedBill.total_amount || 0),
                  total_price: Number(selectedBill.total_amount || 0),
                },
              ]
          ).map((it: any) => ({
            name: it.service_name,
            quantity: Number(it.quantity || 1),
            unitPrice: Number(it.unit_price || 0),
            totalPrice: Number(it.total_price || 0),
          }))}
          subtotal={Number((selectedBill as any).subtotal || selectedBill.total_amount || 0)}
          discount={Number(selectedBill.discount_amount || 0)}
          tax={Number(selectedBill.tax_amount || 0)}
          grandTotal={Number(selectedBill.total_amount || 0)}
          paidAmount={Number(selectedBill.paid_amount ?? (selectedBill.status === 'paid' ? selectedBill.total_amount : 0))}
          dueAmount={selectedBill.due_amount}
          onPay={() => paySelectedBill(selectedBill)}
          onClose={() => setShowBillDetailModal(false)}
        />
      )}

      {/* ─── EDIT BILL MODAL (EXACT UI FROM SCREENSHOTS) ─── */}
      <EditBillModal
        visible={showEditBillModal}
        bill={editTargetBill}
        onClose={() => {
          setShowEditBillModal(false);
          setEditTargetBill(null);
        }}
        onBillUpdated={async () => {
          await refreshBills();
        }}
      />

      {/* ─── PAYMENT CHECKOUT MODAL ─── */}
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

  topSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },

  /* Main Filter Card matching Photo 1 */
  filterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  cardMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  cardMainSub: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 14,
  },

  /* Refresh Button */
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  refreshBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  lastRefreshedText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
    marginBottom: 16,
  },

  /* Search Input */
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0f172a',
    paddingVertical: 0,
  },

  /* Status Picker Button */
  statusPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 46,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  statusPickerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },

  /* Columns Button */
  columnsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  columnsBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },

  /* Empty State Dotted Card */
  dottedEmptyCard: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginTop: 6,
    gap: 12,
  },
  dottedEmptyText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#64748b',
  },

  /* ─── BILL CARDS LIST (MATCHING PHOTO 1) ─── */
  billsListContainer: {
    gap: 12,
    marginTop: 4,
  },
  billCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  billCardActive: {
    borderColor: '#14b8a6',
    borderWidth: 1.5,
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  billNumberCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  billNumberText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  billIdText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },

  /* Status Badge matching reference */
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  patientNameText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  patientCodeText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },

  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },

  cardMiddleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  middleCol: {
    gap: 2,
  },
  middleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  middleValBig: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  middleValPhone: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  middleValText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },

  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  bottomMetaCol: {
    gap: 2,
  },
  bottomDateText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  bottomMethodText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  bottomAccountantText: {
    fontSize: 11.5,
    color: '#94a3b8',
    fontWeight: '500',
  },

  /* Action Buttons on Right */
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyeActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: '#5eead4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Load More button */
  paginationBox: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0d9488',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  loadMoreBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Bottom Sheets */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
    zIndex: 99999,
    elevation: 99999,
  },
  pickerSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 38 : 28,
    maxHeight: '65%',
    width: '100%',
    zIndex: 100000,
    elevation: 100000,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  sheetClose: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'bold',
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  pickerItemActive: {
    backgroundColor: '#f0fdf4',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  pickerItemTextActive: {
    color: '#0d9488',
    fontWeight: '800',
  },

  actionMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
    zIndex: 99999,
  },
  actionMenuBottomSheet: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 38 : 26,
    paddingHorizontal: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 20,
  },
  bottomSheetDragHandle: {
    width: 42,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  bottomSheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 6,
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  bottomSheetSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  bottomSheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetCloseText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#64748b',
  },
  actionMenuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 2,
  },
  actionMenuItemIconBox: {
    width: 30,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionMenuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  actionMenuItemTextCancel: {
    color: '#ef4444',
  },
});

export default TreatmentBillingScreen;
