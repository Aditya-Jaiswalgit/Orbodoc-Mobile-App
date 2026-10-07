// src/screens/staff/TreatmentBillingScreen.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  NativeModules,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  AlertCircle,
  Building,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Columns,
  CreditCard,
  Download,
  Eye,
  FileText,
  IndianRupee,
  Mail,
  MessageCircle,
  MoreVertical,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  User,
  X,
} from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { Pagination } from '../../components/common/Pagination';
import { ColumnSelectorModal, ColumnOption } from '../../components/common/ColumnSelectorModal';
import { useAuthContext } from '../../context/AuthContext';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { TreatmentBill, TreatmentBillItem } from '../../types/clinicTypes';
import {
  getTreatmentBillsApi,
  getTreatmentBillByIdApi,
  createTreatmentBillApi,
  updateTreatmentBillApi,
  recordTreatmentBillPaymentApi,
  cancelTreatmentBillApi,
} from '../../api/billingApi';
import { fetchPatientsApi } from '../../api/patientApi';
import { getAppointmentsApi } from '../../api/appointmentApi';
import { getPrescriptionsApi, getPrescriptionByIdApi } from '../../api/prescriptionApi';
import { BASE_URL } from '../../api/apiConfig';
import { CreateTreatmentBillModal } from './billing/CreateTreatmentBillModal';

interface Props {
  onOpenDrawer: () => void;
  onNavigateScreen?: (screen: string) => void;
}

interface PatientOption {
  id: string | number;
  full_name: string;
  phone?: string | null;
  patient_code?: string | null;
}

interface AppointmentOption {
  id: string | number;
  patient_id?: string | number;
  patient_name?: string;
  doctor_name?: string;
  appointment_date?: string;
  appointment_time?: string;
  status?: string;
}

const STATUS_OPTIONS = [
  { key: 'all', label: 'All Status' },
  { key: 'pending', label: 'Pending' },
  { key: 'partial', label: 'Partially Paid' },
  { key: 'paid', label: 'Paid' },
  { key: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'upi', label: 'UPI' },
  { key: 'card', label: 'Card' },
  { key: 'net_banking', label: 'Net Banking' },
  { key: 'cheque', label: 'Cheque' },
];

type BillColumn =
  | 'bill_number'
  | 'patient_name'
  | 'phone'
  | 'patient_code'
  | 'total_amount'
  | 'paid_amount'
  | 'pending_amount'
  | 'status'
  | 'payment_method'
  | 'created_at'
  | 'doctor_name'
  | 'appointment_id';

const COLUMN_DEFINITIONS: Array<ColumnOption<BillColumn>> = [
  { key: 'bill_number', label: 'Bill Number', defaultVisible: true },
  { key: 'patient_name', label: 'Patient Name', defaultVisible: true },
  { key: 'phone', label: 'Patient Phone', defaultVisible: true },
  { key: 'total_amount', label: 'Total Amount', defaultVisible: true },
  { key: 'paid_amount', label: 'Paid Amount', defaultVisible: false },
  { key: 'pending_amount', label: 'Balance Due', defaultVisible: false },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'payment_method', label: 'Payment Method', defaultVisible: true },
  { key: 'created_at', label: 'Date', defaultVisible: true },
  { key: 'patient_code', label: 'Patient Code', defaultVisible: false },
  { key: 'doctor_name', label: 'Doctor', defaultVisible: false },
  { key: 'appointment_id', label: 'Appointment ID', defaultVisible: false },
];

const DEFAULT_VISIBLE_COLUMNS: Record<BillColumn, boolean> = {
  bill_number: true,
  patient_name: true,
  phone: true,
  patient_code: false,
  total_amount: true,
  paid_amount: false,
  pending_amount: false,
  status: true,
  payment_method: true,
  created_at: true,
  doctor_name: false,
  appointment_id: false,
};

// Helper formatters
const formatCurrency = (amount: number | string | undefined): string => {
  const val = Number(amount) || 0;
  return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const formatTime = (date: Date): string => {
  try {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  } catch {
    return '';
  }
};

const capitalize = (str: string): string => {
  if (!str) return '—';
  if (str.toLowerCase() === 'upi') return 'Upi';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const normalizeBillStatus = (bill: TreatmentBill): 'paid' | 'partial' | 'pending' | 'cancelled' => {
  const s = String(bill.status || bill.payment_status || '').toLowerCase().trim();
  if (s === 'paid') return 'paid';
  if (s === 'partial' || s === 'partially_paid') return 'partial';
  if (s === 'cancelled') return 'cancelled';
  return 'pending';
};

const calculateItemTotal = (qty: number, price: number, discountPct: number, taxPct: number): number => {
  const base = Math.max(0, qty) * Math.max(0, price);
  const discAmount = (base * Math.min(100, Math.max(0, discountPct))) / 100;
  const taxable = base - discAmount;
  const taxAmount = (taxable * Math.max(0, taxPct)) / 100;
  return Math.round((taxable + taxAmount) * 100) / 100;
};

const calculateBillTotals = (items: TreatmentBillItem[]) => {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  items.forEach((item) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || 0;
    const disc = Number(item.discount_pct) || 0;
    const tax = Number(item.tax_pct) || 0;

    const base = qty * price;
    const itemDisc = (base * Math.min(100, Math.max(0, disc))) / 100;
    const taxable = base - itemDisc;
    const itemTax = (taxable * Math.max(0, tax)) / 100;

    subtotal += base;
    totalDiscount += itemDisc;
    totalTax += itemTax;
  });

  const total = Math.max(0, subtotal - totalDiscount + totalTax);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount_amount: Math.round(totalDiscount * 100) / 100,
    tax_amount: Math.round(totalTax * 100) / 100,
    total_amount: Math.round(total * 100) / 100,
  };
};

export const TreatmentBillingScreen: React.FC<Props> = ({ onOpenDrawer, onNavigateScreen }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { token, user, role, permissionsMap = {}, activeClinicId, activeClinicName, assignedClinics = [] } = useAuthContext();

  // Permission Checks (Unified with RBAC)
  const canView = canUseStaffScreen(role, permissionsMap, 'treatment_billing', 'view');
  const canAdd = canUseStaffScreen(role, permissionsMap, 'treatment_billing', 'add');
  const canEdit = canUseStaffScreen(role, permissionsMap, 'treatment_billing', 'edit');
  const canDelete = canUseStaffScreen(role, permissionsMap, 'treatment_billing', 'delete');
  const canExecute = canUseStaffScreen(role, permissionsMap, 'treatment_billing', 'execute');

  // List State
  const [bills, setBills] = useState<TreatmentBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showClinicDropdown, setShowClinicDropdown] = useState(false);
  const [selectedClinicName, setSelectedClinicName] = useState(activeClinicName || 'Aarogya Care Clinic');

  // Column Selector State
  const [visibleColumns, setVisibleColumns] = useState<Record<BillColumn, boolean>>(DEFAULT_VISIBLE_COLUMNS);
  const [showColumnModal, setShowColumnModal] = useState(false);

  // 3-Dots Action Menu State
  const [actionMenuBill, setActionMenuBill] = useState<TreatmentBill | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{ top: number; right: number }>({ top: 120, right: 16 });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Modal States
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [viewInvoiceModalVisible, setViewInvoiceModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<TreatmentBill | null>(null);
  const [billDetailsLoading, setBillDetailsLoading] = useState(false);

  // Form State for Create / Edit Bill Modal
  const [editingBillForModal, setEditingBillForModal] = useState<TreatmentBill | null>(null);

  // Form State for Record Payment Modal
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');
  const [paymentMethodSelect, setPaymentMethodSelect] = useState<string>('cash');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch Treatment Bills from Backend
  const loadBills = useCallback(
    async (isPullRefresh = false) => {
      if (!token) return;
      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await getTreatmentBillsApi(token, {
          clinic_id: activeClinicId,
          status: statusFilter,
          search: debouncedSearch,
          page: currentPage,
          limit: pageSize,
        });

        if (res.success && res.data) {
          const raw = res.data;
          const list: TreatmentBill[] = Array.isArray(raw)
            ? raw
            : Array.isArray((raw as any)?.data)
            ? (raw as any).data
            : Array.isArray((raw as any)?.bills)
            ? (raw as any).bills
            : [];
          setBills(list);
          const total = (raw as any)?.total ?? (res as any)?.total ?? list.length;
          setTotalItems(total);
          setLastRefreshed(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        } else {
          setBills([]);
          setTotalItems(0);
        }
      } catch (err) {
        console.warn('Failed to load treatment bills:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, activeClinicId, statusFilter, debouncedSearch, currentPage, pageSize]
  );

  useEffect(() => {
    if (canView) {
      loadBills();
    }
  }, [canView, loadBills]);

  // Compute Overview KPI Metrics from bills
  const billingStats = useMemo(() => {
    let totalCollected = 0;
    let totalDue = 0;
    let paidCount = 0;
    let partialCount = 0;
    let pendingCount = 0;

    bills.forEach((b) => {
      const tot = Number(b.total_amount) || 0;
      const pd = Number(b.paid_amount) || 0;
      const due = Math.max(0, tot - pd);
      totalCollected += pd;
      totalDue += due;

      const st = normalizeBillStatus(b);
      if (st === 'paid') paidCount++;
      else if (st === 'partial') partialCount++;
      else if (st === 'pending') pendingCount++;
    });

    return {
      totalCollected,
      totalDue,
      paidCount,
      partialCount,
      pendingCount,
      totalCount: totalItems || bills.length,
    };
  }, [bills, totalItems]);

  // Table Min Width calculation for Desktop view
  const tableMinWidth = useMemo(() => {
    let w = 0;
    if (visibleColumns.bill_number) w += 180;
    if (visibleColumns.patient_name) w += 180;
    if (visibleColumns.phone) w += 140;
    if (visibleColumns.patient_code) w += 120;
    if (visibleColumns.total_amount) w += 130;
    if (visibleColumns.paid_amount) w += 120;
    if (visibleColumns.pending_amount) w += 120;
    if (visibleColumns.status) w += 140;
    if (visibleColumns.payment_method) w += 120;
    if (visibleColumns.created_at) w += 120;
    if (visibleColumns.doctor_name) w += 140;
    if (visibleColumns.appointment_id) w += 120;
    w += 90; // actions
    return Math.max(width - 40, w);
  }, [visibleColumns, width]);





  // Open Create Bill Modal
  const handleOpenCreateModal = () => {
    setEditingBillForModal(null);
    setCreateModalVisible(true);
  };

  // Open Edit Bill Modal
  const handleOpenEditModal = (bill: TreatmentBill) => {
    setEditingBillForModal(bill);
    setCreateModalVisible(true);
  };

  // View Bill Invoice Details
  const handleViewInvoice = async (bill: TreatmentBill) => {
    setSelectedBill(bill);
    setViewInvoiceModalVisible(true);
    setBillDetailsLoading(true);

    try {
      if (token && bill.id) {
        const res = await getTreatmentBillByIdApi(token, bill.id);
        if (res.success && res.data) {
          const detail = (res.data as any).bill || res.data;
          setSelectedBill((prev) => ({
            ...prev,
            ...detail,
            items: Array.isArray(detail.items) ? detail.items : prev?.items || [],
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to load bill detail:', err);
    } finally {
      setBillDetailsLoading(false);
    }
  };

  // Open Record Payment Modal
  const handleOpenRecordPayment = (bill: TreatmentBill) => {
    if (!canExecute) {
      Alert.alert('Permission Denied', 'You do not have permission to record payments.');
      return;
    }
    const currentPaid = Number(bill.paid_amount) || 0;
    const total = Number(bill.total_amount) || 0;
    const balance = Math.max(0, total - currentPaid);

    setSelectedBill(bill);
    setPaymentAmountInput(balance.toFixed(2));
    setPaymentMethodSelect(bill.payment_method || bill.payment_mode || 'cash');
    setPaymentModalVisible(true);
  };

  // Submit Payment Record
  const handleSubmitPayment = async () => {
    if (!token || !selectedBill) return;
    const amount = parseFloat(paymentAmountInput);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid payment amount greater than 0.');
      return;
    }

    const currentPaid = Number(selectedBill.paid_amount) || 0;
    const total = Number(selectedBill.total_amount) || 0;
    const remainingDue = Math.max(0, total - currentPaid);

    if (amount > remainingDue + 0.01) {
      Alert.alert('Validation Error', `Payment amount (₹${amount}) cannot exceed remaining due (₹${remainingDue.toFixed(2)}).`);
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await recordTreatmentBillPaymentApi(token, selectedBill.id, {
        paid_amount: amount,
        payment_method: paymentMethodSelect,
      });

      if (res.success) {
        Alert.alert('Payment Recorded', `Payment of ₹${amount.toFixed(2)} successfully recorded.`);
        setPaymentModalVisible(false);
        loadBills();
      } else {
        Alert.alert('Error', res.message || 'Failed to record payment.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to record payment.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Cancel Bill with Confirmation
  const handleCancelBill = (bill: TreatmentBill) => {
    if (!canDelete) {
      Alert.alert('Permission Denied', 'You do not have permission to cancel bills.');
      return;
    }

    Alert.alert(
      'Cancel Bill',
      `Are you sure you want to cancel Invoice #${bill.bill_number || bill.id}? This action cannot be undone.`,
      [
        { text: 'No, Keep Bill', style: 'cancel' },
        {
          text: 'Yes, Cancel Bill',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            try {
              const res = await cancelTreatmentBillApi(token, bill.id, 'Cancelled via Mobile App');
              if (res.success) {
                Alert.alert('Bill Cancelled', `Invoice #${bill.bill_number || bill.id} has been cancelled.`);
                loadBills();
              } else {
                Alert.alert('Error', res.message || 'Failed to cancel bill.');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to cancel bill.');
            }
          },
        },
      ]
    );
  };

  // Download the protected PDF using the active authenticated session.
  const handleDownloadPDF = async (bill: TreatmentBill) => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Available', 'PDF download is currently available on Android.');
      return;
    }
    if (!token) {
      Alert.alert('Sign In Required', 'Please sign in again to download this invoice.');
      return;
    }
    try {
      const billNumber = String(bill.bill_number || bill.id).replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `treatment-bill-${billNumber}.pdf`;
      await NativeModules.BillPdfDownload.downloadPdf(
        `${BASE_URL}/treatment-bills/${bill.id}/pdf`, token, fileName,
      );
      Alert.alert('Download Started', `${fileName} is downloading to your Downloads folder.`);
    } catch (error: any) {
      Alert.alert('Download Failed', error?.message || 'Could not download the invoice PDF.');
    }
  };

  // Share Representation
  const getBillShareText = (bill: TreatmentBill) => {
    const billId = String(bill.id || '');
    const amount = formatCurrency(bill.total_amount || 0);
    const paid = formatCurrency(bill.paid_amount || 0);
    const date = formatDate(bill.created_at || bill.bill_date);
    const patient = bill.patient_name || 'Patient';
    const downloadUrl = `${BASE_URL}/treatment-bills/${billId}/pdf`;
    return `Treatment Bill\nBill ID: #${billId}\nPatient: ${patient}\nDate: ${date}\nTotal: ${amount}\nPaid: ${paid}\nDownload PDF: ${downloadUrl}`;
  };

  // WhatsApp Share
  const shareBillOnWhatsApp = (bill: TreatmentBill) => {
    const message = encodeURIComponent(getBillShareText(bill));
    Linking.openURL(`https://wa.me/?text=${message}`).catch(() => {
      Alert.alert('WhatsApp Not Installed', 'Could not launch WhatsApp.');
    });
  };

  // Email Share
  const shareBillByEmail = (bill: TreatmentBill) => {
    const billId = String(bill.id || '');
    const subject = encodeURIComponent(`Treatment Bill #${billId}`);
    const body = encodeURIComponent(getBillShareText(bill));
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`).catch(() => {
      Alert.alert('Email App Error', 'Could not open Email app.');
    });
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentStatusLabel = STATUS_OPTIONS.find((s) => s.key === statusFilter)?.label || 'All Status';

  // Pill styling helper
  const getStatusBadgeStyle = (status: 'paid' | 'partial' | 'pending' | 'cancelled') => {
    switch (status) {
      case 'paid':
        return {
          bg: { backgroundColor: '#DCFCE7' },
          text: { color: '#166534' },
          icon: <CheckCircle2 size={12} color="#166534" style={{ marginRight: 4 }} />,
        };
      case 'partial':
        return {
          bg: { backgroundColor: '#DBEAFE' },
          text: { color: '#1E40AF' },
          icon: <Clock size={12} color="#1E40AF" style={{ marginRight: 4 }} />,
        };
      case 'pending':
        return {
          bg: { backgroundColor: '#FEF3C7' },
          text: { color: '#92400E' },
          icon: <Clock size={12} color="#92400E" style={{ marginRight: 4 }} />,
        };
      case 'cancelled':
        return {
          bg: { backgroundColor: '#FEE2E2' },
          text: { color: '#991B1B' },
          icon: <AlertCircle size={12} color="#991B1B" style={{ marginRight: 4 }} />,
        };
    }
  };

  const handleOpenActionMenu = (bill: TreatmentBill, event: any) => {
    const pageY = event?.nativeEvent?.pageY ?? event?.nativeEvent?.clientY ?? 300;
    const pageX = event?.nativeEvent?.pageX ?? event?.nativeEvent?.clientX;
    const menuHeight = 215;

    // Position menu directly above the 3-dots button (matching web popup), or below if near top
    let top = pageY > menuHeight + 50 ? pageY - menuHeight - 8 : pageY + 12;
    if (top < 10) top = 10;

    let right = 16;
    if (pageX && width >= 768) {
      right = Math.max(16, width - pageX - 24);
    }

    setActionMenuPosition({ top, right });
    setActionMenuBill(bill);
  };

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        title="Treatment Billing"
        onNavigate={(path) => {
          if (onNavigateScreen) {
            const cleanPath = path.replace('/', '').replace('-', '_');
            onNavigateScreen(cleanPath);
          }
        }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadBills(true)}
            colors={['#0D9488']}
          />
        }>
        {/* ── TOP BANNER HEADER (Matches ClinicsManagementScreen & Web) ────────── */}
        <View style={styles.bannerRow}>
          <View style={styles.bannerTitleBlock}>
            <View style={styles.iconBox}>
              <Receipt color="#0D9488" size={24} />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.bannerTitle}>Treatment Bills</Text>
              <Text style={styles.bannerSubtitle}>
                Manage bills, payments, and billing items
              </Text>
            </View>
          </View>

          {canAdd && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={handleOpenCreateModal}
              activeOpacity={0.85}>
              <Plus color="#FFFFFF" size={15} strokeWidth={2.5} style={{ marginRight: 4 }} />
              <Text style={styles.addBtnText}>Create Bill</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── 4 OVERVIEW METRIC CARDS (Exact match with ClinicsManagementScreen) ── */}
        <View style={[styles.metricGrid4, isMobile && styles.metricGridMobile]}>
          {/* Card 1: Total Bills */}
          <View style={[styles.metricCard, isMobile ? styles.metricCardMobile : styles.metricCardDesktop]}>
            <View style={[styles.metricIconBox, { backgroundColor: '#CCFBF1' }]}>
              <Receipt color="#0D9488" size={isMobile ? 16 : 20} />
            </View>
            <View style={{ flex: 1, marginLeft: isMobile ? 8 : 12 }}>
              <Text style={[styles.metricValue, isMobile && { fontSize: 16 }]}>{billingStats.totalCount}</Text>
              <Text style={[styles.metricLabel, isMobile && { fontSize: 11 }]} numberOfLines={1}>Total Bills</Text>
            </View>
          </View>

          {/* Card 2: Total Collected */}
          <View style={[styles.metricCard, isMobile ? styles.metricCardMobile : styles.metricCardDesktop]}>
            <View style={[styles.metricIconBox, { backgroundColor: '#DCFCE7' }]}>
              <IndianRupee color="#166534" size={isMobile ? 16 : 20} />
            </View>
            <View style={{ flex: 1, marginLeft: isMobile ? 8 : 12 }}>
              <Text style={[styles.metricValue, isMobile && { fontSize: 16 }]} numberOfLines={1}>
                {formatCurrency(billingStats.totalCollected)}
              </Text>
              <Text style={[styles.metricLabel, isMobile && { fontSize: 11 }]} numberOfLines={1}>Total Collected</Text>
            </View>
          </View>

          {/* Card 3: Partially Paid */}
          <View style={[styles.metricCard, isMobile ? styles.metricCardMobile : styles.metricCardDesktop]}>
            <View style={[styles.metricIconBox, { backgroundColor: '#DBEAFE' }]}>
              <Clock color="#1E40AF" size={isMobile ? 16 : 20} />
            </View>
            <View style={{ flex: 1, marginLeft: isMobile ? 8 : 12 }}>
              <Text style={[styles.metricValue, isMobile && { fontSize: 16 }]}>{billingStats.partialCount}</Text>
              <Text style={[styles.metricLabel, isMobile && { fontSize: 11 }]} numberOfLines={1}>Partially Paid</Text>
            </View>
          </View>

          {/* Card 4: Outstanding Due */}
          <View style={[styles.metricCard, isMobile ? styles.metricCardMobile : styles.metricCardDesktop]}>
            <View style={[styles.metricIconBox, { backgroundColor: '#FEF3C7' }]}>
              <AlertCircle color="#92400E" size={isMobile ? 16 : 20} />
            </View>
            <View style={{ flex: 1, marginLeft: isMobile ? 8 : 12 }}>
              <Text style={[styles.metricValue, { color: billingStats.totalDue > 0 ? '#DC2626' : '#0F172A' }, isMobile && { fontSize: 16 }]} numberOfLines={1}>
                {formatCurrency(billingStats.totalDue)}
              </Text>
              <Text style={[styles.metricLabel, isMobile && { fontSize: 11 }]} numberOfLines={1}>Outstanding Due</Text>
            </View>
          </View>
        </View>

        {/* ── SEARCH & STATUS FILTER BAR (Matches ClinicsManagementScreen) ───── */}
        <View style={[styles.searchFilterRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={styles.searchBar}>
            <Search color="#94A3B8" size={16} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by bill Number, Patient Name, Patient Phone..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X color="#94A3B8" size={16} />
              </TouchableOpacity>
            )}
          </View>

          <View style={{ position: 'relative', zIndex: 20 }}>
            <TouchableOpacity
              style={styles.statusTriggerBtn}
              onPress={() => setShowStatusDropdown(!showStatusDropdown)}
              activeOpacity={0.7}>
              <Text style={styles.statusTriggerBtnText}>{currentStatusLabel}</Text>
              <ChevronDown color="#64748B" size={16} />
            </TouchableOpacity>

            {showStatusDropdown && (
              <View style={styles.statusDropdownMenu}>
                {STATUS_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={styles.statusDropdownItem}
                    onPress={() => {
                      setStatusFilter(opt.key);
                      setShowStatusDropdown(false);
                      setCurrentPage(1);
                    }}>
                    <Text
                      style={[
                        styles.statusDropdownItemText,
                        statusFilter === opt.key && { color: '#0D9488', fontWeight: '700' },
                      ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── BILLS TABLE / LIST CARD CONTAINER ──────────────────────────────── */}
        <View style={styles.tableCardContainer}>
          {/* Card Header Bar */}
          <View style={styles.tableHeaderBar}>
            <View style={styles.tableHeaderLeft}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Receipt color="#0F172A" size={17} style={{ marginRight: 6 }} />
                <Text style={styles.tableTitleText}>All Bills ({totalItems || bills.length})</Text>
              </View>
              <Text style={styles.tableSubtitleText}>View and manage treatment bills</Text>
            </View>

            <View style={styles.tableHeaderActions}>
              {/* Refresh Button */}
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={() => loadBills()}
                disabled={loading}
                activeOpacity={0.7}>
                <RefreshCw color="#334155" size={13} style={{ marginRight: 4 }} />
                <Text style={styles.refreshBtnText}>Refresh</Text>
              </TouchableOpacity>

              {/* Columns Selector Button */}
              <TouchableOpacity
                style={styles.columnsBtn}
                onPress={() => setShowColumnModal(true)}
                activeOpacity={0.7}>
                <Columns color="#334155" size={13} style={{ marginRight: 4 }} />
                <Text style={styles.columnsBtnText}>Columns</Text>
              </TouchableOpacity>
            </View>
          </View>

          {Boolean(lastRefreshed) && (
            <View style={styles.lastRefreshedBar}>
              <Text style={styles.lastRefreshedLabel}>Last refreshed: {lastRefreshed}</Text>
            </View>
          )}

          {/* TABLE / CARD CONTENT */}
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0D9488" />
              <Text style={styles.loadingText}>Loading bills...</Text>
            </View>
          ) : bills.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FileText size={42} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No bills found</Text>
              <Text style={styles.emptySubtitle}>
                {debouncedSearch
                  ? `No bills match "${debouncedSearch}".`
                  : 'There are no bills under this status.'}
              </Text>
            </View>
          ) : isMobile ? (
            /* ── MOBILE CARD VIEW (Exact layout as shown in user's Screenshot 2) ── */
            <View style={{ padding: 12, gap: 12 }}>
              {bills.map((bill) => {
                const status = normalizeBillStatus(bill);
                const badge = getStatusBadgeStyle(status);
                const totalAmount = Number(bill.total_amount) || 0;
                const paidAmount = Number(bill.paid_amount) || 0;
                const pendingAmount = totalAmount - paidAmount;

                return (
                  <View key={String(bill.id)} style={styles.mobileBillCard}>
                    {/* Top Row: Bill Number & Patient Name | Status Badge */}
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.billNumberBlock}>
                        {visibleColumns.bill_number && (
                          <Text style={styles.billNumberText}>
                            {bill.bill_number || `TB-C71-2026-${String(bill.id).padStart(5, '0')}`}
                          </Text>
                        )}
                        {visibleColumns.patient_name && (
                          <Text style={styles.patientNameText}>
                            {bill.patient_name || 'Patient'}
                          </Text>
                        )}
                      </View>

                      {/* Status Pill Badge with Icon */}
                      {visibleColumns.status && (
                        <View style={[styles.statusPillBadge, badge.bg]}>
                          {badge.icon}
                          <Text style={[styles.statusPillText, badge.text]}>
                            {status === 'partial' ? 'Partially Paid' : capitalize(status)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Middle Row: TOTAL & PHONE (Exact match with screenshot 2) */}
                    <View style={styles.cardGridRow}>
                      {visibleColumns.total_amount && (
                        <View style={styles.gridCol}>
                          <Text style={styles.gridColLabel}>TOTAL</Text>
                          <Text style={styles.gridColVal} numberOfLines={1}>
                            {formatCurrency(totalAmount)}
                          </Text>
                        </View>
                      )}

                      {visibleColumns.phone && (
                        <View style={styles.gridCol}>
                          <Text style={styles.gridColLabel}>PHONE</Text>
                          <Text style={styles.gridColValPhone} numberOfLines={1}>
                            {bill.patient_phone || bill.phone || '—'}
                          </Text>
                        </View>
                      )}

                      {visibleColumns.paid_amount && (
                        <View style={styles.gridCol}>
                          <Text style={styles.gridColLabel}>PAID</Text>
                          <Text style={[styles.gridColVal, { color: '#166534' }]} numberOfLines={1}>
                            {formatCurrency(paidAmount)}
                          </Text>
                        </View>
                      )}

                      {visibleColumns.pending_amount && (
                        <View style={styles.gridCol}>
                          <Text style={styles.gridColLabel}>DUE</Text>
                          <Text style={[styles.gridColVal, { color: '#DC2626' }]} numberOfLines={1}>
                            {formatCurrency(pendingAmount)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Bottom Row: Date & Payment Method | [ 👁️ ] [ ⋮ ] Action Buttons */}
                    <View style={styles.cardBottomRow}>
                      <View style={styles.metaBottomBlock}>
                        {visibleColumns.created_at && (
                          <Text style={styles.metaDateText}>
                            {formatDate(bill.created_at || bill.bill_date)}
                          </Text>
                        )}
                        {visibleColumns.payment_method && (
                          <Text style={styles.metaPaymentText}>
                            {capitalize(bill.payment_method || bill.payment_mode || 'Payment not recorded')}
                          </Text>
                        )}
                      </View>

                      {/* Right Action Buttons (Teal Eye + Gray 3-Dots) */}
                      <View style={styles.actionsBlock}>
                        <TouchableOpacity
                          style={styles.eyeActionBtn}
                          onPress={() => handleViewInvoice(bill)}
                          activeOpacity={0.7}>
                          <Eye size={16} color="#0D9488" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.moreActionBtn}
                          onPress={(e) => handleOpenActionMenu(bill, e)}
                          activeOpacity={0.7}>
                          <MoreVertical size={16} color="#475569" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            /* ── DESKTOP / WIDE SCREEN HORIZONTAL TABLE VIEW ──────────────────── */
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              nestedScrollEnabled={true}
              scrollEventThrottle={16}
              decelerationRate="normal">
              <View style={{ minWidth: tableMinWidth }}>
                <View style={styles.tableHeaderRow}>
                  {visibleColumns.bill_number && <Text style={[styles.thCell, { width: 180 }]}>Bill Number</Text>}
                  {visibleColumns.patient_name && <Text style={[styles.thCell, { width: 180 }]}>Patient Name</Text>}
                  {visibleColumns.phone && <Text style={[styles.thCell, { width: 140 }]}>Phone</Text>}
                  {visibleColumns.patient_code && <Text style={[styles.thCell, { width: 120 }]}>Code</Text>}
                  {visibleColumns.total_amount && <Text style={[styles.thCell, { width: 130 }]}>Total Amount</Text>}
                  {visibleColumns.paid_amount && <Text style={[styles.thCell, { width: 120 }]}>Paid</Text>}
                  {visibleColumns.pending_amount && <Text style={[styles.thCell, { width: 120 }]}>Due</Text>}
                  {visibleColumns.status && <Text style={[styles.thCell, { width: 140, textAlign: 'center' }]}>Status</Text>}
                  {visibleColumns.payment_method && <Text style={[styles.thCell, { width: 120 }]}>Method</Text>}
                  {visibleColumns.created_at && <Text style={[styles.thCell, { width: 120 }]}>Date</Text>}
                  <Text style={[styles.thCell, { width: 90, textAlign: 'right' }]}>Actions</Text>
                </View>

                {bills.map((bill) => {
                  const status = normalizeBillStatus(bill);
                  const badge = getStatusBadgeStyle(status);
                  const totalAmount = Number(bill.total_amount) || 0;
                  const paidAmount = Number(bill.paid_amount) || 0;
                  const pendingAmount = totalAmount - paidAmount;

                  return (
                    <View key={String(bill.id)} style={styles.tableBodyRow}>
                      {visibleColumns.bill_number && (
                        <View style={{ width: 180, justifyContent: 'center' }}>
                          <Text style={styles.billNumberTableText} numberOfLines={1}>
                            {bill.bill_number || `TB-C71-2026-${String(bill.id).padStart(5, '0')}`}
                          </Text>
                        </View>
                      )}

                      {visibleColumns.patient_name && (
                        <View style={{ width: 180, justifyContent: 'center' }}>
                          <Text style={styles.patientNameTableText} numberOfLines={1}>
                            {bill.patient_name || 'Patient'}
                          </Text>
                        </View>
                      )}

                      {visibleColumns.phone && (
                        <View style={{ width: 140, justifyContent: 'center' }}>
                          <Text style={styles.tdText}>{bill.patient_phone || bill.phone || '—'}</Text>
                        </View>
                      )}

                      {visibleColumns.patient_code && (
                        <View style={{ width: 120, justifyContent: 'center' }}>
                          <Text style={styles.tdText}>{bill.patient_code || '—'}</Text>
                        </View>
                      )}

                      {visibleColumns.total_amount && (
                        <View style={{ width: 130, justifyContent: 'center' }}>
                          <Text style={[styles.tdText, { fontWeight: '700' }]}>{formatCurrency(totalAmount)}</Text>
                        </View>
                      )}

                      {visibleColumns.paid_amount && (
                        <View style={{ width: 120, justifyContent: 'center' }}>
                          <Text style={[styles.tdText, { color: '#166534', fontWeight: '600' }]}>
                            {formatCurrency(paidAmount)}
                          </Text>
                        </View>
                      )}

                      {visibleColumns.pending_amount && (
                        <View style={{ width: 120, justifyContent: 'center' }}>
                          <Text style={[styles.tdText, { color: pendingAmount > 0 ? '#DC2626' : '#64748B', fontWeight: '600' }]}>
                            {formatCurrency(pendingAmount)}
                          </Text>
                        </View>
                      )}

                      {visibleColumns.status && (
                        <View style={{ width: 140, alignItems: 'center', justifyContent: 'center' }}>
                          <View style={[styles.statusPillBadge, badge.bg]}>
                            {badge.icon}
                            <Text style={[styles.statusPillText, badge.text]}>
                              {status === 'partial' ? 'Partially Paid' : capitalize(status)}
                            </Text>
                          </View>
                        </View>
                      )}

                      {visibleColumns.payment_method && (
                        <View style={{ width: 120, justifyContent: 'center' }}>
                          <Text style={styles.tdText}>{capitalize(bill.payment_method || bill.payment_mode || '—')}</Text>
                        </View>
                      )}

                      {visibleColumns.created_at && (
                        <View style={{ width: 120, justifyContent: 'center' }}>
                          <Text style={styles.tdText}>{formatDate(bill.created_at || bill.bill_date)}</Text>
                        </View>
                      )}

                      <View style={{ width: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <TouchableOpacity
                          style={styles.eyeActionBtn}
                          onPress={() => handleViewInvoice(bill)}
                          activeOpacity={0.7}>
                          <Eye size={15} color="#0D9488" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.moreActionBtn}
                          onPress={(e) => handleOpenActionMenu(bill, e)}
                          activeOpacity={0.7}>
                          <MoreVertical size={15} color="#475569" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Pagination Controls */}
          {bills.length > 0 && (
            <View style={styles.paginationWrapper}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── 3-DOTS ACTION POPUP MENU (Exact match with Web Screenshot 1) ────────── */}
      <Modal
        visible={Boolean(actionMenuBill)}
        animationType="fade"
        transparent
        onRequestClose={() => setActionMenuBill(null)}>
        <TouchableWithoutFeedback onPress={() => setActionMenuBill(null)}>
          <View style={styles.actionMenuOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.actionMenuCard,
                  { top: actionMenuPosition.top, right: actionMenuPosition.right },
                ]}>
                {/* 1. Edit Bill */}
                {canEdit && actionMenuBill?.status !== 'cancelled' && (
                  <TouchableOpacity
                    style={styles.actionMenuItem}
                    onPress={() => {
                      const b = actionMenuBill;
                      setActionMenuBill(null);
                      if (b) handleOpenEditModal(b);
                    }}>
                    <Settings2 size={16} color="#0F172A" style={styles.actionMenuIcon} />
                    <Text style={styles.actionMenuText}>Edit Bill</Text>
                  </TouchableOpacity>
                )}

                {/* 2. Share on WhatsApp */}
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={() => {
                    const b = actionMenuBill;
                    setActionMenuBill(null);
                    if (b) shareBillOnWhatsApp(b);
                  }}>
                  <MessageCircle size={16} color="#16A34A" style={styles.actionMenuIcon} />
                  <Text style={styles.actionMenuText}>Share on WhatsApp</Text>
                </TouchableOpacity>

                {/* 3. Share by Email */}
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={() => {
                    const b = actionMenuBill;
                    setActionMenuBill(null);
                    if (b) shareBillByEmail(b);
                  }}>
                  <Mail size={16} color="#2563EB" style={styles.actionMenuIcon} />
                  <Text style={styles.actionMenuText}>Share by Email</Text>
                </TouchableOpacity>

                {/* 4. Add Payment */}
                {canExecute &&
                  actionMenuBill &&
                  normalizeBillStatus(actionMenuBill) !== 'paid' &&
                  normalizeBillStatus(actionMenuBill) !== 'cancelled' && (
                    <TouchableOpacity
                      style={styles.actionMenuItem}
                      onPress={() => {
                        const b = actionMenuBill;
                        setActionMenuBill(null);
                        if (b) handleOpenRecordPayment(b);
                      }}>
                      <CreditCard size={16} color="#0F172A" style={styles.actionMenuIcon} />
                      <Text style={styles.actionMenuText}>Add Payment</Text>
                    </TouchableOpacity>
                  )}

                {/* 5. Cancel Bill */}
                {canDelete && actionMenuBill?.status !== 'cancelled' && (
                  <TouchableOpacity
                    style={[styles.actionMenuItem, styles.actionMenuItemCancel]}
                    onPress={() => {
                      const b = actionMenuBill;
                      setActionMenuBill(null);
                      if (b) handleCancelBill(b);
                    }}>
                    <AlertCircle size={16} color="#DC2626" style={styles.actionMenuIcon} />
                    <Text style={styles.actionMenuTextCancel}>Cancel Bill</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── COLUMNS SELECTOR MODAL ────────────────────────────────────────────── */}
      <ColumnSelectorModal
        visible={showColumnModal}
        onClose={() => setShowColumnModal(false)}
        columns={COLUMN_DEFINITIONS}
        visibleColumns={visibleColumns}
        onToggleColumn={(key) =>
          setVisibleColumns((prev) => ({
            ...prev,
            [key]: !prev[key],
          }))
        }
        onReset={() => setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)}
        title="Customize Columns"
        subtitle="Select which columns to display in the bills list"
      />

      {/* ── CREATE / EDIT BILL MODAL (Modularized Web-Parity Component) ── */}
      <CreateTreatmentBillModal
        visible={createModalVisible}
        onClose={() => {
          setCreateModalVisible(false);
          setEditingBillForModal(null);
        }}
        onSuccess={(msg) => {
          loadBills();
          if (msg) Alert.alert('Success', msg);
        }}
        editingBill={editingBillForModal}
        activeClinicId={activeClinicId}
        token={token}
      />

      {/* ── INVOICE / RECEIPT MODAL ─────────────────────────────────────────── */}
      <Modal
        visible={viewInvoiceModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setViewInvoiceModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContainer, { maxHeight: '94%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {selectedBill?.bill_number || `Invoice #${selectedBill?.id}`}
                </Text>
                <Text style={styles.modalSubtitle}>Official Medical / Dental Treatment Invoice</Text>
              </View>
              <View style={styles.receiptHeaderRight}>
                <TouchableOpacity
                  onPress={() => setViewInvoiceModalVisible(false)}
                  style={styles.modalCloseBtn}>
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            {billDetailsLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0D9488" />
                <Text style={{ marginTop: 8, color: '#64748B' }}>Loading invoice details...</Text>
              </View>
            ) : selectedBill ? (
              <ScrollView contentContainerStyle={styles.invoiceReceiptContent}>
                <View style={styles.invoiceTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clinicBrandingName}>{selectedBill.clinic_name || activeClinicName || 'Clinic'}</Text>
                    <Text style={styles.clinicBrandingContact}>PATIENT CARE & TREATMENT SERVICES</Text>
                    {[selectedBill.clinic_address, selectedBill.clinic_phone, selectedBill.clinic_email]
                      .filter(Boolean).map((value, index) => <Text key={index} style={styles.clinicBrandingAddress}>{value}</Text>)}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.invoiceType}>TREATMENT INVOICE</Text>
                    <Text style={styles.metaBillNo}>{selectedBill.bill_number || `TB-${selectedBill.id}`}</Text>
                    <Text style={styles.metaSub}>Issued {formatDate(selectedBill.created_at || selectedBill.bill_date)}</Text>
                  </View>
                </View>

                {/* Patient & Invoice Meta */}
                <View style={styles.receiptMetaGrid}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaHeader}>BILL TO</Text>
                    <Text style={styles.metaPatientName}>{selectedBill.patient_name || 'Patient'}</Text>
                    {selectedBill.patient_phone ? (
                      <Text style={styles.metaSub}>📞 {selectedBill.patient_phone}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.metaCol, { alignItems: 'flex-end' }]}>
                    <Text style={styles.metaHeader}>DOCTOR & APPOINTMENT</Text>
                    <Text style={styles.metaPatientName}>{selectedBill.doctor_name ? `Dr. ${selectedBill.doctor_name}` : '—'}</Text>
                    <Text style={styles.metaSub}>Appointment: {selectedBill.appointment_date ? `${formatDate(selectedBill.appointment_date)}${selectedBill.appointment_time ? `, ${selectedBill.appointment_time}` : ''}` : '—'}</Text>
                  </View>
                </View>

                <View style={styles.paymentStatusBanner}>
                  <Text style={styles.paymentStatusText}>Payment Method: <Text style={{ fontWeight: '800' }}>{capitalize(selectedBill.payment_method || selectedBill.payment_mode || 'Cash')}</Text></Text>
                  <Text style={[styles.paymentStatusLabel, normalizeBillStatus(selectedBill) === 'paid' ? styles.paidLabel : styles.dueLabel]}>{normalizeBillStatus(selectedBill).toUpperCase()}</Text>
                </View>
                <Text style={styles.invoiceSectionTitle}>TREATMENT & SERVICE ITEMS</Text>

                {/* Itemized Table */}
                <View style={styles.receiptTableContainer}>
                  <View style={styles.receiptTableHeader}>
                    <Text style={[styles.receiptTh, { flex: 0.3 }]}>#</Text>
                    <Text style={[styles.receiptTh, { flex: 1.8 }]}>Item</Text>
                    <Text style={[styles.receiptTh, { flex: 0.45, textAlign: 'center' }]}>Qty</Text>
                    <Text style={[styles.receiptTh, { flex: 0.9, textAlign: 'right' }]}>Rate</Text>
                    <Text style={[styles.receiptTh, { flex: 0.5, textAlign: 'right' }]}>Disc.</Text>
                    <Text style={[styles.receiptTh, { flex: 0.9, textAlign: 'right' }]}>Total</Text>
                  </View>

                  {(selectedBill.items || []).length > 0 ? (
                    selectedBill.items.map((item, idx) => (
                      <View key={idx} style={styles.receiptTableRow}>
                        <Text style={[styles.receiptTd, { flex: 0.3 }]}>{idx + 1}</Text>
                        <View style={{ flex: 1.8 }}>
                          <Text style={styles.receiptItemTitle}>{item.service_name}</Text>
                          {item.service_code ? (
                            <Text style={styles.receiptItemCode}>#{item.service_code}</Text>
                          ) : null}
                        </View>
                        <Text style={[styles.receiptTd, { flex: 0.45, textAlign: 'center' }]}>
                          {item.quantity}
                        </Text>
                        <Text style={[styles.receiptTd, { flex: 1, textAlign: 'right' }]}>
                          ₹{Number(item.unit_price || 0).toFixed(2)}
                        </Text>
                        <Text style={[styles.receiptTd, { flex: 0.5, textAlign: 'right' }]}>{Number(item.discount_pct || 0)}%</Text>
                        <Text style={[styles.receiptTdTotal, { flex: 0.9, textAlign: 'right' }]}>
                          ₹{Number(item.total_price || 0).toFixed(2)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.receiptTableRow}>
                      <Text style={[styles.receiptTd, { flex: 0.3 }]}>1</Text>
                      <View style={{ flex: 1.8 }}>
                        <Text style={styles.receiptItemTitle}>Treatment Consultation & Services</Text>
                      </View>
                      <Text style={[styles.receiptTd, { flex: 0.45, textAlign: 'center' }]}>1</Text>
                      <Text style={[styles.receiptTd, { flex: 0.9, textAlign: 'right' }]}>
                        {formatCurrency(selectedBill.total_amount)}
                      </Text>
                      <Text style={[styles.receiptTd, { flex: 0.5, textAlign: 'right' }]}>0%</Text>
                      <Text style={[styles.receiptTdTotal, { flex: 0.9, textAlign: 'right' }]}>
                        {formatCurrency(selectedBill.total_amount)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Receipt Summary Card */}
                <View style={styles.invoiceSummaryLayout}>
                  <View style={styles.invoiceNotes}>
                    <Text style={styles.metaHeader}>NOTES</Text>
                    <Text style={styles.clinicBrandingAddress}>Thank you for choosing us for your care.</Text>
                  </View>
                  <View style={styles.receiptSummaryCard}>
                    <View style={styles.receiptSummaryRow}>
                      <Text style={styles.receiptSumLabel}>Subtotal</Text>
                      <Text style={styles.receiptSumVal}>
                        {formatCurrency(selectedBill.subtotal || selectedBill.total_amount)}
                      </Text>
                    </View>
                    <View style={styles.receiptSummaryRow}>
                      <Text style={styles.receiptSumLabel}>Discount</Text>
                      <Text style={[styles.receiptSumVal, { color: '#16A34A' }]}>
                        - {formatCurrency(selectedBill.discount_amount)}
                      </Text>
                    </View>
                    <View style={styles.receiptSummaryRow}>
                      <Text style={styles.receiptSumLabel}>Tax</Text>
                      <Text style={styles.receiptSumVal}>+ {formatCurrency(selectedBill.tax_amount)}</Text>
                    </View>
                    <View style={[styles.receiptSummaryRow, styles.receiptGrandRow]}>
                      <Text style={styles.receiptGrandLabel}>Total</Text>
                      <Text style={styles.receiptGrandVal}>
                        {formatCurrency(selectedBill.total_amount || 0)}
                      </Text>
                    </View>
                    <View style={styles.receiptSummaryRow}>
                      <Text style={styles.receiptSumLabel}>Amount Paid</Text>
                      <Text style={[styles.receiptSumVal, { color: '#166534' }]}>
                        {formatCurrency(selectedBill.paid_amount || 0)}
                      </Text>
                    </View>
                    <View style={styles.receiptSummaryRow}>
                      <Text style={[styles.receiptSumLabel, { color: '#DC2626', fontWeight: '800' }]}>Balance Due</Text>
                      <Text style={[styles.receiptSumVal, { color: '#DC2626' }]}>
                        {formatCurrency(
                          Math.max(
                            0,
                            Number(selectedBill.total_amount || 0) -
                              Number(selectedBill.paid_amount || 0)
                          )
                        )}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Status Stamp */}
                <View style={styles.stampRow}>
                  {normalizeBillStatus(selectedBill) === 'paid' && (
                    <View style={[styles.receiptStamp, styles.receiptStampPaid]}>
                      <Text style={[styles.receiptStampText, { color: '#166534' }]}>✓ FULLY PAID</Text>
                    </View>
                  )}
                  {normalizeBillStatus(selectedBill) === 'partial' && (
                    <View style={[styles.receiptStamp, styles.receiptStampPartial]}>
                      <Text style={[styles.receiptStampText, { color: '#1E40AF' }]}>PARTIALLY PAID</Text>
                    </View>
                  )}
                  {normalizeBillStatus(selectedBill) === 'pending' && (
                    <View style={[styles.receiptStamp, styles.receiptStampPending]}>
                      <Text style={[styles.receiptStampText, { color: '#92400E' }]}>PAYMENT PENDING</Text>
                    </View>
                  )}
                  {normalizeBillStatus(selectedBill) === 'cancelled' && (
                    <View style={[styles.receiptStamp, styles.receiptStampCancelled]}>
                      <Text style={[styles.receiptStampText, { color: '#991B1B' }]}>CANCELLED</Text>
                    </View>
                  )}
                </View>
                <View style={styles.invoicePdfFooter}>
                  <Text style={styles.invoiceFooterNote}>This is a system-generated treatment invoice. Thank you for your visit.</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.invoiceDownloadButton}
                    onPress={() => handleDownloadPDF(selectedBill)}>
                    <Download size={18} color="#FFFFFF" />
                    <Text style={styles.invoiceDownloadButtonText}>Download PDF</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ── RECORD PAYMENT MODAL ────────────────────────────────────────────── */}
      <Modal
        visible={paymentModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setPaymentModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}>
          <View style={[styles.modalContainer, { maxHeight: '60%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Record Payment</Text>
                <Text style={styles.modalSubtitle}>
                  Invoice #{selectedBill?.bill_number || selectedBill?.id} • {selectedBill?.patient_name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPaymentModalVisible(false)}
                style={styles.modalCloseBtn}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.paymentModalScroll}>
              <View style={styles.paymentMetaBox}>
                <View style={styles.paymentMetaRow}>
                  <Text style={styles.paymentMetaLabel}>Total Invoice Amount</Text>
                  <Text style={styles.paymentMetaValue}>
                    {formatCurrency(selectedBill?.total_amount || 0)}
                  </Text>
                </View>
                <View style={styles.paymentMetaRow}>
                  <Text style={styles.paymentMetaLabel}>Already Paid</Text>
                  <Text style={[styles.paymentMetaValue, { color: '#166534' }]}>
                    {formatCurrency(selectedBill?.paid_amount || 0)}
                  </Text>
                </View>
                <View style={[styles.paymentMetaRow, styles.paymentDueRow]}>
                  <Text style={styles.paymentDueLabel}>Balance Due</Text>
                  <Text style={styles.paymentDueValue}>
                    {formatCurrency(
                      Math.max(
                        0,
                        Number(selectedBill?.total_amount || 0) -
                          Number(selectedBill?.paid_amount || 0)
                      )
                    )}
                  </Text>
                </View>
              </View>

              <Text style={styles.subFieldLabel}>Payment Method</Text>
              <View style={styles.methodsRow}>
                {PAYMENT_METHODS.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[
                      styles.methodChip,
                      paymentMethodSelect === m.key && styles.methodChipSelected,
                    ]}
                    onPress={() => setPaymentMethodSelect(m.key)}>
                    <Text
                      style={[
                        styles.methodChipText,
                        paymentMethodSelect === m.key && styles.methodChipTextSelected,
                      ]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.subFieldLabel}>Payment Amount to Collect (₹) *</Text>
              <TextInput
                style={styles.paidInputField}
                keyboardType="numeric"
                value={paymentAmountInput}
                onChangeText={setPaymentAmountInput}
                placeholder="0.00"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPaymentModalVisible(false)}
                disabled={submittingPayment}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSubmitPayment}
                disabled={submittingPayment}>
                {submittingPayment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={18} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Confirm & Collect</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },

  // Top Page Banner Header (Matches ClinicsManagementScreen & Web)
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  bannerTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // 4 Overview Metric Cards (Exact match with ClinicsManagementScreen)
  metricGrid4: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  metricGridMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  metricCardDesktop: {
    width: '23.8%',
  },
  metricCardMobile: {
    width: '48.5%',
    padding: 10,
  },
  metricIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },

  // Search and Filter Bar (Matches ClinicsManagementScreen)
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },

  statusTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 42,
    minWidth: 130,
  },
  statusTriggerBtnText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  statusDropdownMenu: {
    position: 'absolute',
    top: 46,
    right: 0,
    minWidth: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    zIndex: 99,
  },
  statusDropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  statusDropdownItemText: {
    fontSize: 13,
    color: '#334155',
  },

  // Table Card Container
  tableCardContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 20,
  },
  tableHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexWrap: 'wrap',
    gap: 8,
  },
  tableHeaderLeft: {
    flex: 1,
    minWidth: 140,
  },
  tableHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tableTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  tableSubtitleText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  columnsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  columnsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  lastRefreshedBar: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  lastRefreshedLabel: {
    fontSize: 10,
    color: '#94A3B8',
  },

  // Loading & Empty States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },

  // Single Mobile Bill Card (Exact match with screenshot 2)
  mobileBillCard: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  billNumberBlock: {
    flex: 1,
  },
  billNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  patientNameText: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },

  // Status Pill Badge (Matches screenshot 2)
  statusPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Card Middle Row: TOTAL & PHONE
  cardGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    paddingVertical: 10,
    marginVertical: 10,
  },
  gridCol: {
    flex: 1,
  },
  gridColLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridColVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  gridColValPhone: {
    fontSize: 13,
    color: '#0F172A',
    marginTop: 2,
  },

  // Card Bottom Row: Date, Payment mode, [Eye] [⋮]
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  metaBottomBlock: {
    flex: 1,
  },
  metaDateText: {
    fontSize: 12,
    color: '#64748B',
  },
  metaPaymentText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  actionsBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyeActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Desktop Table Structure
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tableBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  billNumberTableText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  patientNameTableText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  tdText: {
    fontSize: 12,
    color: '#334155',
  },

  // 3-Dots Action Menu Overlay (Screenshot 1 parity - anchored above 3-dots)
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  actionMenuCard: {
    position: 'absolute',
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  actionMenuIcon: {
    marginRight: 10,
  },
  actionMenuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  actionMenuItemCancel: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 2,
  },
  actionMenuTextCancel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },

  paginationWrapper: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  // Modals Styling (Web-style Centered Dialog Modals, NOT bottom sheets)
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 620,
    maxHeight: '90%',
    paddingBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    padding: 18,
    gap: 16,
  },
  formSection: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  selectedPatientBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 8,
    padding: 10,
  },
  patientSelectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedPatientName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  selectedPatientSub: {
    fontSize: 12,
    color: '#0F766E',
    marginTop: 1,
  },
  clearPatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  clearPatientBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  patientSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    height: 42,
    gap: 8,
  },
  patientSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  suggestionsContainer: {
    maxHeight: 160,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
  },
  suggestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  suggestionPhone: {
    fontSize: 11,
    color: '#64748B',
  },
  apptChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  apptChipSelected: {
    backgroundColor: '#F0FDFA',
    borderColor: '#0D9488',
  },
  apptChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  apptChipTextSelected: {
    color: '#0D9488',
    fontWeight: '800',
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  addItemBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  itemRowCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 8,
  },
  itemCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serviceNameInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#0F172A',
  },
  deleteRowBtn: {
    padding: 4,
  },
  itemCardInputs: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  inputCol: {
    flex: 1,
  },
  inputColTotal: {
    flex: 1.2,
    alignItems: 'flex-end',
  },
  inputColLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 2,
  },
  numericInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 5,
    fontSize: 12,
    color: '#0F172A',
    textAlign: 'center',
  },
  itemTotalDisplay: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 6,
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#475569',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    paddingTop: 8,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  grandTotalValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0D9488',
  },
  subFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  methodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  methodChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  methodChipSelected: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  methodChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  methodChipTextSelected: {
    color: '#FFFFFF',
  },
  paymentInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  paidInputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  quickPayBtnCol: {
    flexDirection: 'row',
    gap: 6,
  },
  quickPayBtn: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
  },
  quickPayBtnText: {
    color: '#0D9488',
    fontWeight: '800',
    fontSize: 12,
  },
  statusPreviewBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  statusPreviewLabel: {
    fontSize: 12,
    color: '#475569',
  },
  statusPreviewBalance: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
  },
  noteInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  modalSubmitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0D9488',
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  // Receipt Modal Styles
  receiptHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  invoiceReceiptContent: {
    padding: 16,
    gap: 14,
  },
  invoiceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#0D9488',
  },
  invoiceType: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0D9488',
    textAlign: 'right',
  },
  invoiceSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 2,
  },
  paymentStatusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 8,
    padding: 12,
  },
  paymentStatusText: { fontSize: 12, color: '#0F172A' },
  paymentStatusLabel: { fontSize: 11, fontWeight: '800' },
  paidLabel: { color: '#16A34A' },
  dueLabel: { color: '#B45309' },
  invoiceSummaryLayout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  invoiceNotes: { flex: 1, gap: 8, paddingTop: 4 },
  invoicePdfFooter: { alignItems: 'center', gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#CBD5E1' },
  invoiceFooterNote: { fontSize: 10, color: '#64748B', textAlign: 'center' },
  invoiceDownloadButton: {
    minHeight: 48,
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#0D9488',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  invoiceDownloadButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  clinicBrandingName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  clinicBrandingAddress: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  clinicBrandingContact: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  receiptMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaCol: {
    flex: 1,
  },
  metaHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  metaPatientName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 2,
  },
  metaBillNo: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D9488',
    marginVertical: 2,
  },
  metaSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  receiptTableContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  receiptTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  receiptTh: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  receiptTableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  receiptItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  receiptItemCode: {
    fontSize: 10,
    color: '#94A3B8',
  },
  receiptTd: {
    fontSize: 12,
    color: '#475569',
  },
  receiptTdTotal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  receiptSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  receiptSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  receiptSumLabel: {
    fontSize: 12,
    color: '#475569',
  },
  receiptSumVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  receiptGrandRow: {
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    paddingTop: 6,
    marginTop: 2,
  },
  receiptGrandLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  receiptGrandVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0D9488',
  },
  stampRow: {
    alignItems: 'center',
    marginVertical: 6,
  },
  receiptStamp: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  receiptStampText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  receiptStampPaid: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  receiptStampPartial: {
    backgroundColor: '#DBEAFE',
    borderColor: '#1E40AF',
  },
  receiptStampPending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#92400E',
  },
  receiptStampCancelled: {
    backgroundColor: '#FEE2E2',
    borderColor: '#991B1B',
  },

  // Record Payment Modal
  paymentModalScroll: {
    padding: 18,
    gap: 10,
  },
  paymentMetaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 6,
  },
  paymentMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentMetaLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  paymentMetaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  paymentDueRow: {
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    paddingTop: 6,
    marginTop: 2,
  },
  paymentDueLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EA580C',
  },
  paymentDueValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#EA580C',
  },

  // ── WEB CREATE BILL MODAL STYLES (Screenshot 1, 2, 3 parity) ────────────
  webCreateModalContainer: {
    maxWidth: 500,
    width: '100%',
    maxHeight: '94%',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingBottom: 0,
  },
  webModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  webHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  webHeaderIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  webModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  webModalCloseBtn: {
    padding: 6,
    borderRadius: 8,
  },
  webModalScroll: {
    padding: 16,
    paddingBottom: 20,
  },
  webFormSection: {
    gap: 4,
  },
  webSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  webSectionIconBox: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  webSectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  webSectionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  webFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  webSearchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0D9488',
    borderRadius: 9,
    paddingHorizontal: 12,
  },
  webSearchInputField: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  webSelectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  webSelectValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    flex: 1,
    marginRight: 6,
  },
  webHelperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 5,
  },
  webDropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  webDropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  webDropdownItemSelected: {
    backgroundColor: '#F0FDFA',
  },
  webDropdownItemText: {
    fontSize: 13,
    color: '#334155',
  },
  webTextarea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  webAddServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 8,
    gap: 6,
  },
  webAddServiceBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  webInputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  webEmptyServiceBox: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  webEmptyServiceText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  webSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  webSummaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  webSummaryValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  webModalFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  webAmountDueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  webAmountDueLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  webAmountDueValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  webFooterBtnsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  webCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  webCreateBillBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webCreateBillBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  webInlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  webInlineErrorText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '500',
  },
  rxBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rxBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  rxNoticeText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  rxCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  rxCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },
  rxCardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 4,
  },
  rxCardMetaText: {
    fontSize: 11,
    color: '#64748B',
  },
  rxCardMetaBold: {
    fontWeight: '600',
    color: '#334155',
  },
  rxDetailText: {
    fontSize: 12,
    color: '#334155',
    marginTop: 3,
  },
  rxPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  rxPill: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rxPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  serviceFormBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  serviceFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serviceFormTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  serviceFormInputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  serviceFormInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: '#0F172A',
  },
  serviceFormGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  serviceAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    borderRadius: 6,
    paddingVertical: 9,
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 6,
  },
  serviceAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  itemsListTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  addedItemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
  },
  addedItemCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addedItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  addedItemSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  addedItemDeleteBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  addedItemGrid: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  addedItemGridCol: {
    flex: 1,
  },
  addedItemColLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  addedItemColVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
    marginTop: 2,
  },
  addedItemColTotal: {
    fontSize: 13,
    color: '#0D9488',
    fontWeight: '700',
    marginTop: 2,
  },
});

export default TreatmentBillingScreen;
