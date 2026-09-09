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
import { StaffHeader } from '../../components/common/StaffHeader';
import { useAuthContext } from '../../context/AuthContext';
import { useTreatmentBilling } from '../../hooks/useTreatmentBilling';
import { cancelTreatmentBillApi, TreatmentBill } from '../../api/treatmentBillApi';
import { getPatientsApi, getPatientPrescriptionsApi } from '../../api/patientApi';
import { InvoiceModal } from '../../components/billing/InvoiceModal';
import { EditBillModal } from '../../components/billing/EditBillModal';
import { ColumnsModal, ColumnItem } from '../../components/common/ColumnsModal';
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

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onToggleTabBar?: (hide: boolean) => void;
}

// ─── COLUMNS DEFINITION ───────────────────────────────────────────────────────
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

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const formatCardDate = (dateStr?: string) => {
  if (!dateStr) return '03 Sept 2026';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
    return String(d.getDate()).padStart(2,'0') + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  } catch { return dateStr; }
};

const formatLastRefreshed = (d: Date) => {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2,'0');
  const s = String(d.getSeconds()).padStart(2,'0');
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${h}:${m}:${s} ${ap}`;
};

export const TreatmentBillingScreen: React.FC<Props> = ({ onOpenDrawer, onOpenNotifications, onToggleTabBar }) => {
  const { user, token } = useAuthContext();

  // Detect if current user is a patient (hides Create Bill, filters bills to own)
  const isPatient = useMemo(() => {
    const role = (user as any)?.role || (user as any)?.user_type || '';
    return role === 'patient';
  }, [user]);

  const { bills, selectedBill, loading, refreshBills, fetchBillDetails, createBill, recordBillPayment } = useTreatmentBilling();

  // ── UI State ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_TREATMENT_BILL_COLUMNS);
  const [visibleCount, setVisibleCount] = useState(5);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [lastRefreshedDate, setLastRefreshedDate] = useState<Date>(new Date());

  // ── Detail / Action modals ───────────────────────────────────────────────────
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionMenuModal, setShowActionMenuModal] = useState(false);
  const [actionMenuBill, setActionMenuBill] = useState<TreatmentBill | null>(null);
  const [localSelectedBill, setLocalSelectedBill] = useState<TreatmentBill | null>(null);
  const [showEditBillModal, setShowEditBillModal] = useState(false);
  const [editTargetBill, setEditTargetBill] = useState<TreatmentBill | null>(null);

  // ── Record Payment modal ─────────────────────────────────────────────────────
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [targetBill, setTargetBill] = useState<TreatmentBill | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('upi');

  // ── Create Bill form ─────────────────────────────────────────────────────────
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientSuggestions, setPatientSuggestions] = useState<Array<any>>([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [patientPrescriptions, setPatientPrescriptions] = useState<Array<any>>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [appointmentIdStr, setAppointmentIdStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card'>('Cash');
  const [billStatus, setBillStatus] = useState<'pending' | 'paid' | 'partially_paid'>('pending');
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [description, setDescription] = useState('');
  const [consultantFees, setConsultantFees] = useState('799');
  const [paidAmountInput, setPaidAmountInput] = useState('0.00');
  const [serviceItems, setServiceItems] = useState<Array<{
    id: number; service_name: string; unit_price: number; quantity: number; discount_pct: number; total_price: number;
  }>>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceQty, setNewServiceQty] = useState('1');

  // Bill summary calculations
  const parsedConsultant = parseFloat(consultantFees) || 0;
  const itemsSubtotal = serviceItems.reduce((acc, it) => acc + it.total_price, 0);
  const calcSubtotal = parsedConsultant + itemsSubtotal;
  const calcDiscount = serviceItems.reduce((acc, it) => acc + (it.quantity * it.unit_price * (it.discount_pct || 0)) / 100, 0);
  const calcTax = 0;
  const calcTotal = Math.max(0, calcSubtotal - calcDiscount + calcTax);
  const calcPaid = parseFloat(paidAmountInput) || (billStatus === 'paid' ? calcTotal : 0);
  const calcPending = Math.max(0, calcTotal - calcPaid);

  // ── Tab bar hide logic ───────────────────────────────────────────────────────
  useEffect(() => {
    if (onToggleTabBar) {
      onToggleTabBar(
        showStatusPicker ||
        showColumnsModal ||
        showDetailModal ||
        showActionMenuModal ||
        createModalVisible ||
        paymentModalVisible ||
        showEditBillModal
      );
    }
  }, [
    showStatusPicker,
    showColumnsModal,
    showDetailModal,
    showActionMenuModal,
    createModalVisible,
    paymentModalVisible,
    showEditBillModal,
    onToggleTabBar,
  ]);

  useEffect(() => { return () => { onToggleTabBar?.(false); }; }, [onToggleTabBar]);

  // ── Filtering / pagination ───────────────────────────────────────────────────
  const displayBills = useMemo(() => {
    if (!isPatient || !user) return bills;
    const uId = (user as any).patient_id || user.id;
    const uPhone = ((user as any).phone || '').trim().toLowerCase();
    const uName = ((user as any).fullName || (user as any).full_name || '').trim().toLowerCase();
    const personal = bills.filter((b) => {
      const pId = (b as any).patient_id || (b as any).patient?.id;
      const bPhone = (b.patient_phone || '').trim().toLowerCase();
      const bName = (b.patient_name || '').trim().toLowerCase();
      const idMatch = uId && pId && String(pId) === String(uId);
      const phoneMatch = uPhone && bPhone && (bPhone.includes(uPhone) || uPhone.includes(bPhone));
      const nameMatch = uName && bName && (bName.includes(uName) || uName.includes(bName));
      return idMatch || phoneMatch || nameMatch;
    });
    return personal.length > 0 ? personal : bills;
  }, [bills, user, isPatient]);

  const filteredBills = useMemo(() => {
    return displayBills.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const billNo = (b.bill_number || `#${b.id}`).toLowerCase();
      const name = (b.patient_name || '').toLowerCase();
      const phone = (b.patient_phone || '').toLowerCase();
      const matchSearch = q === '' || billNo.includes(q) || name.includes(q) || phone.includes(q);
      const s = (b.status || (b as any).payment_status || '').toLowerCase();
      const matchStatus =
        statusFilter === 'All Status' ||
        (statusFilter === 'Pending' && (s === 'pending' || s === 'unpaid')) ||
        (statusFilter === 'Paid' && s === 'paid') ||
        (statusFilter === 'Partially Paid' && (s === 'partially_paid' || s === 'partial')) ||
        (statusFilter === 'Cancelled' && (s === 'cancelled' || s === 'canceled'));
      return matchSearch && matchStatus;
    });
  }, [displayBills, searchQuery, statusFilter]);

  const pagedBills = useMemo(() => filteredBills.slice(0, visibleCount), [filteredBills, visibleCount]);

  useEffect(() => {
    if (filteredBills.length > 0 && selectedCardId === null) setSelectedCardId(filteredBills[0].id);
  }, [filteredBills, selectedCardId]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleManualRefresh = async () => { await refreshBills(); setLastRefreshedDate(new Date()); };
  const handleToggleColumn = (colId: string) => {
    setSelectedColumns((prev) => prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]);
  };

  const handleOpenBillDetails = async (bill: TreatmentBill) => {
    setLocalSelectedBill(bill);
    setShowDetailModal(true);
    const full = await fetchBillDetails(bill.id);
    if (full) setLocalSelectedBill(full as any);
  };

  const handleOpenPayment = (bill: TreatmentBill) => {
    setTargetBill(bill);
    setPayAmount(String(bill.due_amount || bill.total_amount || 0));
    setPaymentModalVisible(true);
  };

  const handleRecordPayment = async () => {
    if (!targetBill) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) { Alert.alert('Validation Error', 'Enter a valid payment amount.'); return; }
    const res = await recordBillPayment(targetBill.id, amt, payMethod);
    if (res.success) { setPaymentModalVisible(false); setTargetBill(null); Alert.alert('Success', 'Payment recorded successfully!'); }
    else Alert.alert('Error', res.message || 'Payment recording failed');
  };

  const handleOpenEditBill = (bill: TreatmentBill) => {
    setEditTargetBill(bill);
    setShowEditBillModal(true);
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
      `Thank you for visiting Aarogya Care Clinic!`
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
      `Are you sure you want to cancel bill ${bill.bill_number || '#' + bill.id}? This action cannot be undone.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel Bill',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            try {
              const res = await cancelTreatmentBillApi(token, bill.id);
              if (res.success) {
                Alert.alert('Success', `Bill ${bill.bill_number || '#' + bill.id} has been cancelled.`);
                refreshBills();
              } else {
                Alert.alert('Error', res.message || 'Could not cancel bill.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to cancel bill.');
            }
          },
        },
      ]
    );
  };

  const handlePatientSearch = async (text: string) => {
    setPatientName(text);
    if (!token || text.trim().length < 1) { setPatientSuggestions([]); setShowPatientSuggestions(false); return; }
    setIsSearchingPatient(true); setShowPatientSuggestions(true);
    try {
      const res = await getPatientsApi(token, `search=${encodeURIComponent(text.trim())}`);
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data as any).patients || (res.data as any).data || [];
        setPatientSuggestions(list);
      } else setPatientSuggestions([]);
    } catch { setPatientSuggestions([]); } finally { setIsSearchingPatient(false); }
  };

  const handleSelectPatient = async (patient: any) => {
    setPatientName(`${patient.full_name || patient.name || 'Patient'} | ID: ${patient.id} | ${patient.phone || 'N/A'}`);
    setPatientPhone(patient.phone || ''); setSelectedPatient(patient); setShowPatientSuggestions(false); setConsultantFees('799');
    if (token && patient.id) {
      setLoadingPrescriptions(true);
      try {
        const res = await getPatientPrescriptionsApi(token, patient.id);
        if (res.success && res.data) {
          const rxList = Array.isArray(res.data) ? res.data : (res.data as any).prescriptions || (res.data as any).data || [];
          setPatientPrescriptions(rxList);
          if (rxList.length > 0 && rxList[0].appointment_id) setAppointmentIdStr(String(rxList[0].appointment_id));
          if (rxList.length > 0) { const fee = rxList[0].consultant_fee || rxList[0].fee || rxList[0].amount; if (fee) setConsultantFees(String(fee)); }
        } else setPatientPrescriptions([]);
      } catch { setPatientPrescriptions([]); } finally { setLoadingPrescriptions(false); }
    }
  };

  const handleAddServiceItem = () => {
    if (!newServiceName.trim()) { Alert.alert('Validation Error', 'Service name is required.'); return; }
    const p = parseFloat(newServicePrice) || 0; const q = parseInt(newServiceQty) || 1;
    setServiceItems((prev) => [...prev, { id: Date.now(), service_name: newServiceName.trim(), unit_price: p, quantity: q, discount_pct: 0, total_price: p * q }]);
    setNewServiceName(''); setNewServicePrice(''); setNewServiceQty('1');
  };

  const handleRemoveServiceItem = (id: number) => setServiceItems((prev) => prev.filter((it) => it.id !== id));

  const handleCreateBill = async () => {
    if (!patientName.trim()) { Alert.alert('Validation Error', 'Patient name is required.'); return; }
    let pId = selectedPatient?.id;
    if (!pId && patientName) { const match = patientName.match(/ID:\s*(\d+)/i); if (match) pId = parseInt(match[1]); }
    if (!pId) pId = 1;
    const feeVal = parseFloat(consultantFees) || 799;
    const finalSubtotal = calcSubtotal > 0 ? calcSubtotal : feeVal;
    const finalTotal = calcTotal > 0 ? calcTotal : finalSubtotal;
    const res = await createBill({
      patient_id: pId,
      patient_name: patientName.trim(),
      patient_phone: patientPhone.trim(),
      appointment_id: appointmentIdStr ? parseInt(appointmentIdStr) : undefined,
      payment_method: paymentMethod.toLowerCase(),
      status: billStatus as any,
      description: description.trim(),
      subtotal: finalSubtotal as any,
      discount_amount: calcDiscount,
      tax_amount: calcTax,
      total_amount: finalTotal,
      paid_amount: calcPaid,
      due_amount: calcPending,
      items: serviceItems.length > 0 ? serviceItems : [{ id: Date.now(), service_name: 'Consultation Fee', quantity: 1, unit_price: finalSubtotal, total_price: finalSubtotal }],
    });
    if (res.success) {
      setCreateModalVisible(false);
      setPatientName(''); setPatientPhone(''); setSelectedPatient(null); setPatientSuggestions([]);
      setPatientPrescriptions([]); setAppointmentIdStr(''); setDescription('');
      setConsultantFees('0'); setPaidAmountInput('0.00'); setServiceItems([]);
      Alert.alert('Success', 'Treatment Invoice created successfully!');
    } else Alert.alert('Error', res.message || 'Could not create bill');
  };

  // ── Status Badge ─────────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        showLogo={false}
        showRolePill={false}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={handleManualRefresh} colors={['#0d9488']} />}>

        {/* ─── TOP HEADER SECTION ─── */}
        <View style={styles.topHeaderSection}>
          <View style={styles.topTitleRow}>
            <ReceiptIcon color="#0f172a" size={24} strokeWidth={2} />
            <Text style={styles.topPageTitle}>Treatment Bills</Text>
          </View>
          <Text style={styles.topSubtitleText}>
            Manage bills, payments, and billing items
          </Text>

          {!isPatient && (
            <TouchableOpacity
              style={styles.headerCreateBillBtn}
              activeOpacity={0.85}
              onPress={() => setCreateModalVisible(true)}>
              <Text style={styles.createBillPlus}>+</Text>
              <Text style={styles.headerCreateBillBtnText}>Create Bill</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── MAIN FILTER CARD ─── */}
        <View style={[styles.filterCard, styles.filterCardTealBorder]}>
          <View style={styles.filterCardTitleRow}>
            <View>
              <Text style={styles.cardMainTitle}>All Bills</Text>
              <Text style={styles.cardMainSub}>View and manage treatment bills</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.refreshBtn} activeOpacity={0.8} onPress={handleManualRefresh}>
            <RefreshCwIcon size={15} color="#0f172a" />
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
          <Text style={styles.lastRefreshedText}>Last refreshed: {formatLastRefreshed(lastRefreshedDate)}</Text>

          <View style={styles.searchInputWrapper}>
            <SearchInputIcon size={16} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by bill Number, Patient Name, Patie"
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={(t) => { setSearchQuery(t); setVisibleCount(5); }}
            />
          </View>

          <TouchableOpacity style={styles.statusPickerBtn} activeOpacity={0.8} onPress={() => setShowStatusPicker(true)}>
            <Text style={styles.statusPickerText}>{statusFilter}</Text>
            <ChevronDownIcon size={16} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.columnsBtn} activeOpacity={0.8} onPress={() => setShowColumnsModal(true)}>
            <ColumnsIcon size={16} color="#0f172a" />
            <Text style={styles.columnsBtnText}>Columns</Text>
          </TouchableOpacity>

          {!loading && filteredBills.length === 0 && (
            <View style={styles.dottedEmptyCard}>
              <ReceiptIcon color="#cbd5e1" size={56} strokeWidth={1.5} />
              <Text style={styles.dottedEmptyText}>No bills found</Text>
            </View>
          )}
        </View>

        {/* ─── BILL LIST ─── */}
        {loading ? (
          <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 36 }} />
        ) : filteredBills.length > 0 ? (
          <View style={styles.billsListContainer}>
            {pagedBills.map((item, index) => {
              const isCardActive = selectedCardId === item.id || (selectedCardId === null && index === 0);
              const billNo = item.bill_number || `TB-C71-2026-0000${item.id}`;
              const pName = item.patient_name || 'Patient';
              const phone = item.patient_phone || '-';
              const cardDate = formatCardDate(item.created_at || (item as any).bill_date);
              const totalAmt = Number(item.total_amount || 0);
              const paidAmt = Number(item.paid_amount || (item.status === 'paid' ? totalAmt : 0));
              const dueAmt = item.due_amount !== undefined ? Number(item.due_amount) : Math.max(0, totalAmt - paidAmt);
              const pmMethod = item.payment_method
                ? String(item.payment_method).charAt(0).toUpperCase() + String(item.payment_method).slice(1).toLowerCase()
                : 'Cash';
              const patientCode = (item as any).patient_code || `PT-${String(item.patient_id || item.id).padStart(5, '0')}`;
              const appointmentId = (item as any).appointment_id ? `#${(item as any).appointment_id}` : '-';

              return (
                <TouchableOpacity
                  key={item.id ? `tb-card-${item.id}` : `tb-card-${index}`}
                  activeOpacity={0.92}
                  style={[styles.billCard, isCardActive && styles.billCardActive]}
                  onPress={() => setSelectedCardId(item.id)}>

                  <View style={styles.cardTopRow}>
                    <View style={styles.billNumberCol}>
                      {selectedColumns.includes('bill_number') && <Text style={styles.billNumberText}>{billNo}</Text>}
                      {selectedColumns.includes('bill_id') && <Text style={styles.billIdText}>ID: #{item.id}</Text>}
                    </View>
                    {selectedColumns.includes('status') && renderStatusBadge(item.status)}
                  </View>

                  <View style={styles.patientRow}>
                    {selectedColumns.includes('patient_name') && <Text style={styles.patientNameText}>{pName}</Text>}
                    {selectedColumns.includes('patient_code') && <Text style={styles.patientCodeText}>({patientCode})</Text>}
                  </View>

                  <View style={styles.cardDivider} />

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
                        <Text style={[styles.middleValBig, { color: '#16a34a' }]}>₹{paidAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                      </View>
                    )}
                    {selectedColumns.includes('due_amount') && (
                      <View style={styles.middleCol}>
                        <Text style={styles.middleLabel}>PENDING</Text>
                        <Text style={[styles.middleValBig, { color: dueAmt > 0 ? '#dc2626' : '#16a34a' }]}>₹{dueAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
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

                  <View style={styles.cardBottomRow}>
                    <View style={styles.bottomMetaCol}>
                      {selectedColumns.includes('date') && <Text style={styles.bottomDateText}>{cardDate}</Text>}
                      {selectedColumns.includes('payment_method') && <Text style={styles.bottomMethodText}>{pmMethod}</Text>}
                      {selectedColumns.includes('accountant') && <Text style={styles.bottomAccountantText}>Acc: {(item as any).doctor_name || 'Dr. Sharma'}</Text>}
                    </View>
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

            {filteredBills.length > visibleCount && (
              <View style={styles.paginationBox}>
                <TouchableOpacity style={styles.loadMoreBtn} activeOpacity={0.8} onPress={() => setVisibleCount((p) => p + 5)}>
                  <ChevronDownIcon size={14} color="#ffffff" />
                  <Text style={styles.loadMoreBtnText}>Load More</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* ─── COLUMNS MODAL ─── */}
      <ColumnsModal
        visible={showColumnsModal}
        onClose={() => setShowColumnsModal(false)}
        title="Show / Hide Columns"
        columns={TREATMENT_BILL_COLUMNS}
        selectedIds={selectedColumns}
        onToggle={handleToggleColumn}
      />

      {/* ─── STATUS PICKER ─── */}
      <Modal visible={showStatusPicker} transparent animationType="slide" onRequestClose={() => setShowStatusPicker(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback onPress={() => setShowStatusPicker(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
          <View style={styles.pickerSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Status</Text>
              <TouchableOpacity onPress={() => setShowStatusPicker(false)}><Text style={styles.sheetClose}>✕</Text></TouchableOpacity>
            </View>
            {['All Status', 'Pending', 'Paid', 'Partially Paid', 'Cancelled'].map((s) => (
              <TouchableOpacity key={s} style={[styles.pickerItem, statusFilter === s && styles.pickerItemActive]} onPress={() => { setStatusFilter(s); setShowStatusPicker(false); setVisibleCount(5); }}>
                <Text style={[styles.pickerItemText, statusFilter === s && styles.pickerItemTextActive]}>{s}</Text>
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
                    if (actionMenuBill) handleOpenEditBill(actionMenuBill);
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
                    if (actionMenuBill) handleOpenPayment(actionMenuBill);
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

      {/* ─── INVOICE DETAIL MODAL ─── */}
      {localSelectedBill && (
        <InvoiceModal
          visible={showDetailModal}
          title="Treatment Invoice"
          invoiceType="treatment"
          invoiceNumber={localSelectedBill.bill_number || `TB-C71-2026-0000${localSelectedBill.id}`}
          invoiceDate={localSelectedBill.created_at ? String(localSelectedBill.created_at).split('T')[0] : undefined}
          clinicName={(localSelectedBill as any).clinic_name || 'Aarogya Care Clinic'}
          patientName={localSelectedBill.patient_name || 'Patient'}
          patientPhone={localSelectedBill.patient_phone || '-'}
          doctorName={(localSelectedBill as any).doctor_name || user?.fullName || 'Dr. Rahul Sharma'}
          prescriptionId={(localSelectedBill as any).prescription_id || localSelectedBill.appointment_id}
          paymentMethod={String((localSelectedBill as any).payment_method || 'Cash')}
          paymentStatus={localSelectedBill.status || 'paid'}
          items={(localSelectedBill.items && localSelectedBill.items.length > 0
            ? localSelectedBill.items
            : [{ id: 1, service_name: (localSelectedBill as any).description || 'Consultation Fee', quantity: 1, unit_price: Number(localSelectedBill.total_amount || 0), total_price: Number(localSelectedBill.total_amount || 0) }]
          ).map((it: any) => ({ name: it.service_name, quantity: Number(it.quantity || 1), unitPrice: Number(it.unit_price || 0), totalPrice: Number(it.total_price || 0) }))}
          subtotal={Number((localSelectedBill as any).subtotal || localSelectedBill.total_amount || 0)}
          discount={Number(localSelectedBill.discount_amount || 0)}
          tax={Number(localSelectedBill.tax_amount || 0)}
          grandTotal={Number(localSelectedBill.total_amount || 0)}
          paidAmount={Number(localSelectedBill.paid_amount ?? (localSelectedBill.status === 'paid' ? localSelectedBill.total_amount : 0))}
          dueAmount={localSelectedBill.due_amount}
          preparedBy={(localSelectedBill as any).accountant_name || (localSelectedBill as any).doctor_name || user?.fullName || 'Dr. Rahul Sharma'}
          onClose={() => setShowDetailModal(false)}
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

      {/* ─── RECORD PAYMENT MODAL ─── */}
      <Modal visible={paymentModalVisible} animationType="fade" transparent>
        <View style={styles.centeredModalBg}>
          <View style={styles.centeredModalCard}>
            <Text style={styles.centeredModalTitle}>Record Bill Payment</Text>
            <Text style={styles.centeredModalSub}>Bill #{targetBill?.bill_number} — {targetBill?.patient_name}</Text>
            <Text style={styles.formLabel}>Payment Amount (₹) *</Text>
            <TextInput style={styles.formInput} keyboardType="numeric" value={payAmount} onChangeText={setPayAmount} />
            <Text style={styles.formLabel}>Payment Method</Text>
            <View style={styles.methodRow}>
              {['upi', 'cash', 'card'].map((m) => (
                <TouchableOpacity key={m} style={[styles.methodBtn, payMethod === m && styles.methodBtnActive]} onPress={() => setPayMethod(m)}>
                  <Text style={[styles.methodText, payMethod === m && styles.methodTextActive]}>{m.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPaymentModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleRecordPayment}>
                <Text style={styles.confirmBtnText}>Confirm Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── CREATE BILL MODAL (STAFF ONLY) ─── */}
      {!isPatient && (
        <Modal visible={createModalVisible} animationType="slide" transparent>
          <View style={styles.createModalBg}>
            <View style={styles.createModalCard}>
              <View style={styles.createModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.headerIconBox}>
                    <Text style={{ fontSize: 18, color: '#ffffff', fontWeight: '800' }}>$</Text>
                  </View>
                  <View>
                    <Text style={styles.createModalTitle}>Create New Bill</Text>
                    <Text style={styles.createModalSub}>Create a new treatment bill</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={styles.draftBadge}><Text style={styles.draftBadgeText}>Draft</Text></View>
                  <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                    <Text style={{ fontSize: 20, color: '#64748b', fontWeight: '700' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16 }}>
                {/* Section 1: Bill Information */}
                <View style={styles.formSectionBox}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionIcon}>📄</Text>
                    <View>
                      <Text style={styles.sectionTitle}>Bill Information</Text>
                      <Text style={styles.sectionSub}>Select the patient and their completed appointment.</Text>
                    </View>
                  </View>
                  <View style={{ gap: 12 }}>
                    <View style={{ width: '100%', zIndex: 10 }}>
                      <Text style={styles.formLabel}>Patient *</Text>
                      <TextInput
                        style={[styles.formInput, { borderColor: patientName ? '#0d9488' : '#cbd5e1' }]}
                        placeholder="Search by patient ID, name or mobile"
                        placeholderTextColor="#94a3b8"
                        value={patientName}
                        onChangeText={handlePatientSearch}
                        onFocus={() => { if (patientSuggestions.length > 0) setShowPatientSuggestions(true); }}
                      />
                      {showPatientSuggestions && (
                        <View style={styles.patientSuggestionsBox}>
                          {isSearchingPatient ? (
                            <View style={{ padding: 12, alignItems: 'center' }}>
                              <ActivityIndicator size="small" color="#0d9488" />
                              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Searching...</Text>
                            </View>
                          ) : patientSuggestions.length === 0 ? (
                            <View style={{ padding: 12, alignItems: 'center' }}>
                              <Text style={{ fontSize: 12, color: '#94a3b8' }}>No matching patient found</Text>
                            </View>
                          ) : (
                            patientSuggestions.map((pat) => (
                              <TouchableOpacity key={pat.id} style={styles.patientSuggestionItem} onPress={() => handleSelectPatient(pat)}>
                                <Text style={styles.patientSuggestionText}>
                                  <Text style={{ fontWeight: '800', color: '#0f172a' }}>{pat.full_name || pat.name}</Text>
                                  {'  |  '}
                                  <Text style={{ color: '#0d9488', fontWeight: '700' }}>ID: {pat.id}</Text>
                                  {'  |  '}
                                  <Text style={{ color: '#64748b' }}>{pat.phone || 'No Phone'}</Text>
                                </Text>
                              </TouchableOpacity>
                            ))
                          )}
                        </View>
                      )}
                    </View>
                    <View>
                      <Text style={styles.formLabel}>Appointment *</Text>
                      <TextInput style={styles.formInput} placeholder="Type date or appointment ID" placeholderTextColor="#94a3b8" value={appointmentIdStr} onChangeText={setAppointmentIdStr} />
                      <Text style={styles.helperText}>Only completed appointments are shown</Text>
                    </View>
                  </View>
                </View>

                {/* Section 2: Prescription History */}
                <View style={styles.formSectionBox}>
                  <View style={[styles.sectionHeaderRow, { justifyContent: 'space-between' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <Text style={styles.sectionIcon}>📋</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sectionTitle}>Prescription History</Text>
                        <Text style={styles.sectionSub}>{selectedPatient ? `History for ${selectedPatient.full_name || selectedPatient.name}` : 'Select patient to view history.'}</Text>
                      </View>
                    </View>
                    {selectedPatient && (
                      <View style={styles.recordsBadge}><Text style={styles.recordsBadgeText}>{patientPrescriptions.length} records</Text></View>
                    )}
                  </View>
                  {loadingPrescriptions ? (
                    <View style={{ padding: 16, alignItems: 'center' }}><ActivityIndicator size="small" color="#0d9488" /></View>
                  ) : !selectedPatient ? (
                    <View style={styles.emptyPrescriptionBox}><Text style={styles.emptyPrescriptionText}>Select patient to view prescription history.</Text></View>
                  ) : patientPrescriptions.length === 0 ? (
                    <View style={styles.emptyPrescriptionBox}><Text style={styles.emptyPrescriptionText}>No prescription history found.</Text></View>
                  ) : (
                    <View style={{ gap: 10, marginTop: 6 }}>
                      {patientPrescriptions.map((rx: any, idx: number) => (
                        <View key={rx.id || idx} style={styles.prescriptionCardItem}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0d9488' }}>Prescription #{rx.id || idx + 1}</Text>
                            <Text style={{ fontSize: 11, color: '#64748b' }}>{rx.created_at ? new Date(rx.created_at).toLocaleDateString() : 'N/A'}</Text>
                          </View>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>Appointment: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{rx.appointment_date || rx.date || 'N/A'}</Text></Text>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>Diagnosis: <Text style={{ fontWeight: '600', color: '#334155' }}>{rx.diagnosis || rx.notes || '-'}</Text></Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Section 3: Payment Details */}
                <View style={styles.formSectionBox}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionIcon}>💳</Text>
                    <View>
                      <Text style={styles.sectionTitle}>Payment Details</Text>
                      <Text style={styles.sectionSub}>Set the payment method, bill status and notes.</Text>
                    </View>
                  </View>
                  <View style={{ gap: 12 }}>
                    <View>
                      <Text style={styles.formLabel}>Payment Method</Text>
                      <TouchableOpacity style={styles.dropdownSelector} onPress={() => { setShowPaymentDropdown(!showPaymentDropdown); setShowStatusDropdown(false); }}>
                        <Text style={styles.dropdownSelectorText}>{paymentMethod}</Text>
                        <Text style={styles.dropdownArrow}>▾</Text>
                      </TouchableOpacity>
                      {showPaymentDropdown && (
                        <View style={styles.dropdownMenuBox}>
                          {['Cash', 'UPI', 'Card'].map((m) => (
                            <TouchableOpacity key={m} style={[styles.dropdownMenuItem, paymentMethod === m && styles.dropdownMenuItemActive]} onPress={() => { setPaymentMethod(m as any); setShowPaymentDropdown(false); }}>
                              <Text style={[styles.dropdownMenuText, paymentMethod === m && styles.dropdownMenuTextActive]}>{m}</Text>
                              {paymentMethod === m && <Text style={{ color: '#0d9488', fontWeight: '800' }}>✓</Text>}
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                    <View>
                      <Text style={styles.formLabel}>Status</Text>
                      <TouchableOpacity style={styles.dropdownSelector} onPress={() => { setShowStatusDropdown(!showStatusDropdown); setShowPaymentDropdown(false); }}>
                        <Text style={styles.dropdownSelectorText}>{billStatus === 'pending' ? 'Pending' : billStatus === 'paid' ? 'Paid' : 'Partially Paid'}</Text>
                        <Text style={styles.dropdownArrow}>▾</Text>
                      </TouchableOpacity>
                      {showStatusDropdown && (
                        <View style={styles.dropdownMenuBox}>
                          {[{ label: 'Pending', val: 'pending' }, { label: 'Paid', val: 'paid' }, { label: 'Partially Paid', val: 'partially_paid' }].map((st) => (
                            <TouchableOpacity key={st.val} style={[styles.dropdownMenuItem, billStatus === st.val && styles.dropdownMenuItemActive]} onPress={() => { setBillStatus(st.val as any); setShowStatusDropdown(false); }}>
                              <Text style={[styles.dropdownMenuText, billStatus === st.val && styles.dropdownMenuTextActive]}>{st.label}</Text>
                              {billStatus === st.val && <Text style={{ color: '#0d9488', fontWeight: '800' }}>✓</Text>}
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                    <View>
                      <Text style={styles.formLabel}>Description</Text>
                      <TextInput style={[styles.formInput, { height: 54, textAlignVertical: 'top' }]} placeholder="Bill description" placeholderTextColor="#94a3b8" multiline value={description} onChangeText={setDescription} />
                    </View>
                  </View>
                </View>

                {/* Section 4: Charges & Services */}
                <View style={styles.formSectionBox}>
                  <View style={[styles.sectionHeaderRow, { justifyContent: 'space-between' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <Text style={styles.sectionIcon}>💵</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sectionTitle}>Charges & Services</Text>
                        <Text style={styles.sectionSub}>Add a consultation fee or detailed service items.</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.addServiceBtnHeader} onPress={() => setShowAddServiceModal(!showAddServiceModal)}>
                      <Text style={styles.addServiceBtnHeaderText}>+ Add Service</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.gridTwoCol}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Consultant Fees</Text>
                      <TextInput style={styles.formInput} placeholder="799" placeholderTextColor="#94a3b8" keyboardType="numeric" value={consultantFees} onChangeText={setConsultantFees} />
                      <Text style={styles.helperText}>For simple billing without service items.</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Paid Amount</Text>
                      <TextInput style={[styles.formInput, { borderColor: '#0d9488' }]} placeholder="0.00" placeholderTextColor="#94a3b8" keyboardType="numeric" value={paidAmountInput} onChangeText={setPaidAmountInput} />
                    </View>
                  </View>
                  {showAddServiceModal && (
                    <View style={styles.serviceAdderBox}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a', marginBottom: 6 }}>Add Custom Service Item</Text>
                      <View style={styles.adderRow}>
                        <TextInput style={[styles.formInput, { flex: 2 }]} placeholder="Service Name" placeholderTextColor="#94a3b8" value={newServiceName} onChangeText={setNewServiceName} />
                        <TextInput style={[styles.formInput, { flex: 1 }]} placeholder="Rate (₹)" placeholderTextColor="#94a3b8" keyboardType="numeric" value={newServicePrice} onChangeText={setNewServicePrice} />
                        <TextInput style={[styles.formInput, { flex: 0.8 }]} placeholder="Qty" placeholderTextColor="#94a3b8" keyboardType="numeric" value={newServiceQty} onChangeText={setNewServiceQty} />
                      </View>
                      <TouchableOpacity style={styles.confirmAddServiceBtn} onPress={() => { handleAddServiceItem(); setShowAddServiceModal(false); }}>
                        <Text style={styles.confirmAddServiceBtnText}>Add Item</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {serviceItems.length === 0 ? (
                    <View style={styles.emptyItemsBox}><Text style={styles.emptyItemsText}>No service items added</Text></View>
                  ) : (
                    <View style={{ gap: 6, marginTop: 10 }}>
                      {serviceItems.map((item) => (
                        <View key={item.id} style={styles.serviceItemRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>{item.service_name}</Text>
                            <Text style={{ fontSize: 11, color: '#64748b' }}>Qty: {item.quantity} × ₹{item.unit_price.toFixed(2)}</Text>
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>₹{item.total_price.toFixed(2)}</Text>
                          <TouchableOpacity style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', justifyContent: 'center', alignItems: 'center', marginLeft: 8 }} onPress={() => handleRemoveServiceItem(item.id)}>
                            <Text style={{ fontSize: 13, color: '#ef4444' }}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Section 5: Bill Summary */}
                <View style={styles.formSectionBox}>
                  <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Bill Summary</Text>
                  <View style={styles.summaryGridBox}>
                    {[
                      { label: 'Subtotal', val: `₹${calcSubtotal.toFixed(2)}`, color: '#0f172a' },
                      { label: 'Discount', val: `-₹${calcDiscount.toFixed(2)}`, color: '#0f172a' },
                      { label: 'Tax', val: `+₹${calcTax.toFixed(2)}`, color: '#0f172a' },
                      { label: 'Total', val: `₹${calcTotal.toFixed(2)}`, color: '#0d9488' },
                      { label: 'Paid', val: `₹${calcPaid.toFixed(2)}`, color: '#166534' },
                      { label: 'Pending', val: `₹${calcPending.toFixed(2)}`, color: '#dc2626' },
                    ].map((row) => (
                      <View key={row.label} style={styles.summaryCell}>
                        <Text style={styles.summaryLabel}>{row.label}</Text>
                        <Text style={[styles.summaryVal, { color: row.color }]}>{row.val}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>

              <View style={styles.createModalFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748b' }}>AMOUNT DUE</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>₹{calcPending.toFixed(2)}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={styles.cancelBtnPill} onPress={() => setCreateModalVisible(false)}>
                    <Text style={styles.cancelBtnPillText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.createBillBtnPill} onPress={handleCreateBill}>
                    <Text style={styles.createBillBtnPillText}>Create Bill</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 100 },
  topSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 12 },

  topHeaderSection: { marginBottom: 16, marginTop: 4 },
  topTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topPageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  topSubtitleText: { fontSize: 13.5, color: '#64748b', marginTop: 4 },
  headerCreateBillBtn: {
    backgroundColor: '#169b91',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  createBillPlus: { color: '#ffffff', fontSize: 18, fontWeight: '700', lineHeight: 18 },
  headerCreateBillBtnText: { color: '#ffffff', fontSize: 13.5, fontWeight: '700' },

  filterCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 14 },
  filterCardTealBorder: { borderWidth: 1.5, borderColor: '#14b8a6' },
  filterCardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  cardMainTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  cardMainSub: { fontSize: 13, color: '#64748b' },
  createBillBtn: { backgroundColor: '#169b91', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  createBillBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },

  refreshBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff' },
  refreshBtnText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  lastRefreshedText: { fontSize: 11.5, color: '#64748b', marginTop: 8, marginBottom: 14 },

  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, marginBottom: 12, backgroundColor: '#ffffff' },
  searchInput: { flex: 1, fontSize: 13.5, color: '#0f172a', paddingVertical: 0 },

  statusPickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, marginBottom: 12, backgroundColor: '#ffffff' },
  statusPickerText: { fontSize: 14, fontWeight: '500', color: '#0f172a' },

  columnsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, backgroundColor: '#ffffff' },
  columnsBtnText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },

  dottedEmptyCard: { borderWidth: 1.5, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', marginTop: 6, gap: 12 },
  dottedEmptyText: { fontSize: 13.5, fontWeight: '500', color: '#64748b' },

  billsListContainer: { gap: 12, marginTop: 4 },
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
  patientCodeText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },

  cardDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },

  cardMiddleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  middleCol: { gap: 2 },
  middleLabel: { fontSize: 10.5, fontWeight: '700', color: '#64748b', letterSpacing: 0.5 },
  middleValBig: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  middleValPhone: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  middleValText: { fontSize: 13, fontWeight: '600', color: '#334155' },

  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  bottomMetaCol: { gap: 2 },
  bottomDateText: { fontSize: 12.5, color: '#64748b', fontWeight: '500' },
  bottomMethodText: { fontSize: 12.5, color: '#64748b', fontWeight: '500' },
  bottomAccountantText: { fontSize: 11.5, color: '#94a3b8', fontWeight: '500' },

  actionButtonsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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

  paginationBox: { marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  loadMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0d9488', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  loadMoreBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end', zIndex: 99999, elevation: 99999 },
  pickerSheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 38 : 28, maxHeight: '65%', zIndex: 100000, elevation: 100000 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  sheetClose: { fontSize: 16, color: '#64748b', fontWeight: 'bold' },
  pickerItem: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8, marginBottom: 4 },
  pickerItemActive: { backgroundColor: '#f0fdf4' },
  pickerItemText: { fontSize: 14, color: '#334155', fontWeight: '600' },
  pickerItemTextActive: { color: '#0d9488', fontWeight: '800' },

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

  centeredModalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  centeredModalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  centeredModalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  centeredModalSub: { fontSize: 13, color: '#64748b', marginBottom: 12 },

  formLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6, marginTop: 8 },
  formInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#fff' },

  methodRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  methodBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, alignItems: 'center' },
  methodBtnActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  methodText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  methodTextActive: { color: '#ffffff' },

  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: '#475569', fontWeight: '700' },
  confirmBtn: { flex: 1, backgroundColor: '#0d9488', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  confirmBtnText: { color: '#ffffff', fontWeight: '800' },

  createModalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)' },
  createModalCard: { flex: 1, backgroundColor: '#ffffff', marginTop: 48, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  createModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#0d9488', alignItems: 'center', justifyContent: 'center' },
  createModalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  createModalSub: { fontSize: 12, color: '#64748b' },
  draftBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  draftBadgeText: { fontSize: 11, fontWeight: '800', color: '#92400e' },

  formSectionBox: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionIcon: { fontSize: 18 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  sectionSub: { fontSize: 11, color: '#64748b' },
  helperText: { fontSize: 11, color: '#94a3b8', marginTop: 4 },

  patientSuggestionsBox: { position: 'absolute', top: 52, left: 0, right: 0, backgroundColor: '#ffffff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', zIndex: 999, elevation: 999, maxHeight: 200 },
  patientSuggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  patientSuggestionText: { fontSize: 12, color: '#334155' },

  recordsBadge: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  recordsBadgeText: { fontSize: 11, fontWeight: '700', color: '#0369a1' },

  emptyPrescriptionBox: { padding: 16, alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyPrescriptionText: { fontSize: 12, color: '#94a3b8' },
  prescriptionCardItem: { backgroundColor: '#ffffff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },

  dropdownSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  dropdownSelectorText: { fontSize: 14, color: '#0f172a', fontWeight: '500' },
  dropdownArrow: { fontSize: 14, color: '#64748b' },
  dropdownMenuBox: { backgroundColor: '#ffffff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 4, zIndex: 99 },
  dropdownMenuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8 },
  dropdownMenuItemActive: { backgroundColor: '#f0fdf4' },
  dropdownMenuText: { fontSize: 14, color: '#334155', fontWeight: '600' },
  dropdownMenuTextActive: { color: '#0d9488', fontWeight: '800' },

  gridTwoCol: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  serviceAdderBox: { backgroundColor: '#f1f5f9', borderRadius: 10, padding: 12, marginTop: 10 },
  adderRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  confirmAddServiceBtn: { backgroundColor: '#0d9488', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  confirmAddServiceBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  emptyItemsBox: { borderWidth: 1.5, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 10 },
  emptyItemsText: { fontSize: 12, color: '#94a3b8' },
  serviceItemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },

  summaryGridBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCell: { width: '48%', backgroundColor: '#ffffff', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  summaryVal: { fontSize: 16, fontWeight: '800', marginTop: 4 },

  createModalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#ffffff' },
  cancelBtnPill: { paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10 },
  cancelBtnPillText: { color: '#475569', fontWeight: '700', fontSize: 14 },
  createBillBtnPill: { backgroundColor: '#0d9488', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  createBillBtnPillText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },

  addServiceBtnHeader: { backgroundColor: '#f0fdf4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#99f6e4' },
  addServiceBtnHeaderText: { fontSize: 12, fontWeight: '700', color: '#0d9488' },
});

export default TreatmentBillingScreen;
