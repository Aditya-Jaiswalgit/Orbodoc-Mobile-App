// src/screens/staff/TreatmentBillingScreen.tsx
import { styles } from './styles/TreatmentBilling.styles';
import React, { useState, useEffect, useMemo } from 'react';
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
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  AlertCircle,
  Check,
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
  X,
} from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { Pagination } from '../../components/common/Pagination';
import { ColumnSelectorModal } from '../../components/common/ColumnSelectorModal';
import { useAuthContext } from '../../context/AuthContext';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { TreatmentBill } from '../../types/clinicTypes';
import {
  getTreatmentBillByIdApi,
  recordTreatmentBillPaymentApi,
  cancelTreatmentBillApi,
} from '../../api/billingApi';
import { BASE_URL } from '../../api/apiConfig';
import { CreateTreatmentBillModal } from './billing/CreateTreatmentBillModal';
import { useTreatmentBills } from '../../hooks/useTreatmentBills';
import { showErrorToast } from '../../utils/toast';
import {
  BillColumn,
  capitalize,
  DEFAULT_TREATMENT_BILL_COLUMNS,
  formatCurrency,
  formatDate,
  normalizeBillStatus,
  PAYMENT_METHODS,
  TREATMENT_BILL_COLUMNS as COLUMN_DEFINITIONS,
  TREATMENT_STATUS_OPTIONS as STATUS_OPTIONS,
} from './billing/treatmentBillingUtils';

interface Props {
  onOpenDrawer: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const TreatmentBillingScreen: React.FC<Props> = ({
  onOpenDrawer,
  onNavigateScreen,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const {
    token,
    role,
    permissionsMap = {},
    activeClinicId,
    activeClinicName,
  } = useAuthContext();

  // Permission Checks (Unified with RBAC)
  const canView = canUseStaffScreen(
    role,
    permissionsMap,
    'treatment_billing',
    'view',
  );
  const canAdd = canUseStaffScreen(
    role,
    permissionsMap,
    'treatment_billing',
    'add',
  );
  const canEdit = canUseStaffScreen(
    role,
    permissionsMap,
    'treatment_billing',
    'edit',
  );
  const canDelete = canUseStaffScreen(
    role,
    permissionsMap,
    'treatment_billing',
    'delete',
  );
  const canExecute = canUseStaffScreen(
    role,
    permissionsMap,
    'treatment_billing',
    'execute',
  );

  // List State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Column Selector State
  const [visibleColumns, setVisibleColumns] = useState<
    Record<BillColumn, boolean>
  >(DEFAULT_TREATMENT_BILL_COLUMNS);
  const [showColumnModal, setShowColumnModal] = useState(false);

  // 3-Dots Action Menu State
  const [actionMenuBill, setActionMenuBill] = useState<TreatmentBill | null>(
    null,
  );
  const [actionMenuPosition, setActionMenuPosition] = useState<{
    top: number;
    right: number;
  }>({ top: 120, right: 16 });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const {
    bills,
    total: totalItems,
    loading,
    refreshing,
    error: billsError,
    lastRefreshed,
    refresh: loadBills,
  } = useTreatmentBills({
    token,
    clinicId: activeClinicId,
    canView,
    status: statusFilter,
    search: debouncedSearch,
    page: currentPage,
    pageSize,
  });
  useEffect(() => {
    if (billsError)
      showErrorToast('Could not load treatment bills', billsError);
  }, [billsError]);

  // Modal States
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [viewInvoiceModalVisible, setViewInvoiceModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<TreatmentBill | null>(null);
  const [billDetailsLoading, setBillDetailsLoading] = useState(false);

  // Form State for Create / Edit Bill Modal
  const [editingBillForModal, setEditingBillForModal] =
    useState<TreatmentBill | null>(null);

  // Form State for Record Payment Modal
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');
  const [paymentMethodSelect, setPaymentMethodSelect] =
    useState<string>('cash');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Compute Overview KPI Metrics from bills
  const billingStats = useMemo(() => {
    let totalCollected = 0;
    let totalDue = 0;
    let paidCount = 0;
    let partialCount = 0;
    let pendingCount = 0;

    bills.forEach(b => {
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
          setSelectedBill(prev => ({
            ...prev,
            ...detail,
            items: Array.isArray(detail.items)
              ? detail.items
              : prev?.items || [],
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
      Alert.alert(
        'Permission Denied',
        'You do not have permission to record payments.',
      );
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
      Alert.alert(
        'Validation Error',
        'Please enter a valid payment amount greater than 0.',
      );
      return;
    }

    const currentPaid = Number(selectedBill.paid_amount) || 0;
    const total = Number(selectedBill.total_amount) || 0;
    const remainingDue = Math.max(0, total - currentPaid);

    if (amount > remainingDue + 0.01) {
      Alert.alert(
        'Validation Error',
        `Payment amount (?${amount}) cannot exceed remaining due (?${remainingDue.toFixed(
          2,
        )}).`,
      );
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await recordTreatmentBillPaymentApi(token, selectedBill.id, {
        paid_amount: amount,
        payment_method: paymentMethodSelect,
      });

      if (res.success) {
        Alert.alert(
          'Payment Recorded',
          `Payment of ?${amount.toFixed(2)} successfully recorded.`,
        );
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
      Alert.alert(
        'Permission Denied',
        'You do not have permission to cancel bills.',
      );
      return;
    }

    Alert.alert(
      'Cancel Bill',
      `Are you sure you want to cancel Invoice #${
        bill.bill_number || bill.id
      }? This action cannot be undone.`,
      [
        { text: 'No, Keep Bill', style: 'cancel' },
        {
          text: 'Yes, Cancel Bill',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            try {
              const res = await cancelTreatmentBillApi(
                token,
                bill.id,
                'Cancelled via Mobile App',
              );
              if (res.success) {
                Alert.alert(
                  'Bill Cancelled',
                  `Invoice #${bill.bill_number || bill.id} has been cancelled.`,
                );
                loadBills();
              } else {
                Alert.alert('Error', res.message || 'Failed to cancel bill.');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to cancel bill.');
            }
          },
        },
      ],
    );
  };

  // Download the protected PDF using the active authenticated session.
  const handleDownloadPDF = async (bill: TreatmentBill) => {
    if (Platform.OS !== 'android') {
      Alert.alert(
        'Not Available',
        'PDF download is currently available on Android.',
      );
      return;
    }
    if (!token) {
      Alert.alert(
        'Sign In Required',
        'Please sign in again to download this invoice.',
      );
      return;
    }
    try {
      const billNumber = String(bill.bill_number || bill.id).replace(
        /[^a-zA-Z0-9_-]/g,
        '_',
      );
      const fileName = `treatment-bill-${billNumber}.pdf`;
      await NativeModules.BillPdfDownload.downloadPdf(
        `${BASE_URL}/treatment-bills/${bill.id}/pdf`,
        token,
        fileName,
      );
      Alert.alert(
        'Download Started',
        `${fileName} is downloading to your Downloads folder.`,
      );
    } catch (error: any) {
      Alert.alert(
        'Download Failed',
        error?.message || 'Could not download the invoice PDF.',
      );
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
  const currentStatusLabel =
    STATUS_OPTIONS.find(s => s.key === statusFilter)?.label || 'All Status';

  // Pill styling helper
  const getStatusBadgeStyle = (
    status: 'paid' | 'partial' | 'pending' | 'cancelled',
  ) => {
    switch (status) {
      case 'paid':
        return {
          bg: { backgroundColor: '#DCFCE7' },
          text: { color: '#166534' },
          icon: (
            <CheckCircle2
              size={12}
              color="#166534"
              style={styles.extractedInline1}
            />
          ),
        };
      case 'partial':
        return {
          bg: { backgroundColor: '#DBEAFE' },
          text: { color: '#1E40AF' },
          icon: (
            <Clock size={12} color="#1E40AF" style={styles.extractedInline1} />
          ),
        };
      case 'pending':
        return {
          bg: { backgroundColor: '#FEF3C7' },
          text: { color: '#92400E' },
          icon: (
            <Clock size={12} color="#92400E" style={styles.extractedInline1} />
          ),
        };
      case 'cancelled':
        return {
          bg: { backgroundColor: '#FEE2E2' },
          text: { color: '#991B1B' },
          icon: (
            <AlertCircle
              size={12}
              color="#991B1B"
              style={styles.extractedInline1}
            />
          ),
        };
    }
  };

  const handleOpenActionMenu = (bill: TreatmentBill, event: any) => {
    const pageY =
      event?.nativeEvent?.pageY ?? event?.nativeEvent?.clientY ?? 300;
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
        onNavigate={path => {
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
        }
      >
        {/* -- TOP BANNER HEADER (Matches ClinicsManagementScreen & Web) ---------- */}
        <View style={styles.bannerRow}>
          <View style={styles.bannerTitleBlock}>
            <View style={styles.iconBox}>
              <Receipt color="#0D9488" size={24} />
            </View>
            <View style={styles.extractedInline2}>
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
              activeOpacity={0.85}
            >
              <Plus
                color="#FFFFFF"
                size={15}
                strokeWidth={2.5}
                style={styles.extractedInline1}
              />
              <Text style={styles.addBtnText}>Create Bill</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* -- 4 OVERVIEW METRIC CARDS (Exact match with ClinicsManagementScreen) -- */}
        <View style={[styles.metricGrid4, isMobile && styles.metricGridMobile]}>
          {/* Card 1: Total Bills */}
          <View
            style={[
              styles.metricCard,
              isMobile ? styles.metricCardMobile : styles.metricCardDesktop,
            ]}
          >
            <View style={[styles.metricIconBox, styles.extractedInline3]}>
              <Receipt color="#0D9488" size={isMobile ? 16 : 20} />
            </View>
            <View
              style={[
                styles.metricValueCell,
                isMobile
                  ? styles.metricValueCellMobile
                  : styles.metricValueCellDesktop,
              ]}
            >
              <Text
                style={[
                  styles.metricValue,
                  isMobile && styles.extractedInline4,
                ]}
              >
                {billingStats.totalCount}
              </Text>
              <Text
                style={[
                  styles.metricLabel,
                  isMobile && styles.extractedInline5,
                ]}
                numberOfLines={1}
              >
                Total Bills
              </Text>
            </View>
          </View>

          {/* Card 2: Total Collected */}
          <View
            style={[
              styles.metricCard,
              isMobile ? styles.metricCardMobile : styles.metricCardDesktop,
            ]}
          >
            <View style={[styles.metricIconBox, styles.extractedInline6]}>
              <IndianRupee color="#166534" size={isMobile ? 16 : 20} />
            </View>
            <View
              style={[
                styles.metricValueCell,
                isMobile
                  ? styles.metricValueCellMobile
                  : styles.metricValueCellDesktop,
              ]}
            >
              <Text
                style={[
                  styles.metricValue,
                  isMobile && styles.extractedInline4,
                ]}
                numberOfLines={1}
              >
                {formatCurrency(billingStats.totalCollected)}
              </Text>
              <Text
                style={[
                  styles.metricLabel,
                  isMobile && styles.extractedInline5,
                ]}
                numberOfLines={1}
              >
                Total Collected
              </Text>
            </View>
          </View>

          {/* Card 3: Partially Paid */}
          <View
            style={[
              styles.metricCard,
              isMobile ? styles.metricCardMobile : styles.metricCardDesktop,
            ]}
          >
            <View style={[styles.metricIconBox, styles.extractedInline7]}>
              <Clock color="#1E40AF" size={isMobile ? 16 : 20} />
            </View>
            <View
              style={[
                styles.metricValueCell,
                isMobile
                  ? styles.metricValueCellMobile
                  : styles.metricValueCellDesktop,
              ]}
            >
              <Text
                style={[
                  styles.metricValue,
                  isMobile && styles.extractedInline4,
                ]}
              >
                {billingStats.partialCount}
              </Text>
              <Text
                style={[
                  styles.metricLabel,
                  isMobile && styles.extractedInline5,
                ]}
                numberOfLines={1}
              >
                Partially Paid
              </Text>
            </View>
          </View>

          {/* Card 4: Outstanding Due */}
          <View
            style={[
              styles.metricCard,
              isMobile ? styles.metricCardMobile : styles.metricCardDesktop,
            ]}
          >
            <View style={[styles.metricIconBox, styles.extractedInline8]}>
              <AlertCircle color="#92400E" size={isMobile ? 16 : 20} />
            </View>
            <View
              style={[
                styles.metricValueCell,
                isMobile
                  ? styles.metricValueCellMobile
                  : styles.metricValueCellDesktop,
              ]}
            >
              <Text
                style={[
                  styles.metricValue,
                  billingStats.totalDue > 0
                    ? styles.dueAmountDanger
                    : styles.dueAmountNormal,
                  isMobile && styles.extractedInline4,
                ]}
                numberOfLines={1}
              >
                {formatCurrency(billingStats.totalDue)}
              </Text>
              <Text
                style={[
                  styles.metricLabel,
                  isMobile && styles.extractedInline5,
                ]}
                numberOfLines={1}
              >
                Outstanding Due
              </Text>
            </View>
          </View>
        </View>

        {/* -- SEARCH & STATUS FILTER BAR (Matches ClinicsManagementScreen) ----- */}
        <View
          style={[styles.searchFilterRow, isMobile && styles.extractedInline9]}
        >
          <View style={styles.searchBar}>
            <Search
              color="#94A3B8"
              size={16}
              style={styles.extractedInline10}
            />
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

          <View style={styles.extractedInline11}>
            <TouchableOpacity
              style={styles.statusTriggerBtn}
              onPress={() => setShowStatusDropdown(!showStatusDropdown)}
              activeOpacity={0.7}
            >
              <Text style={styles.statusTriggerBtnText}>
                {currentStatusLabel}
              </Text>
              <ChevronDown color="#64748B" size={16} />
            </TouchableOpacity>

            {showStatusDropdown && (
              <View style={styles.statusDropdownMenu}>
                {STATUS_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={styles.statusDropdownItem}
                    onPress={() => {
                      setStatusFilter(opt.key);
                      setShowStatusDropdown(false);
                      setCurrentPage(1);
                    }}
                  >
                    <Text
                      style={[
                        styles.statusDropdownItemText,
                        statusFilter === opt.key && styles.extractedInline12,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* -- BILLS TABLE / LIST CARD CONTAINER -------------------------------- */}
        <View style={styles.tableCardContainer}>
          {/* Card Header Bar */}
          <View style={styles.tableHeaderBar}>
            <View style={styles.tableHeaderLeft}>
              <View style={styles.extractedInline13}>
                <Receipt
                  color="#0F172A"
                  size={17}
                  style={styles.extractedInline14}
                />
                <Text style={styles.tableTitleText}>
                  All Bills ({totalItems || bills.length})
                </Text>
              </View>
              <Text style={styles.tableSubtitleText}>
                View and manage treatment bills
              </Text>
            </View>

            <View style={styles.tableHeaderActions}>
              {/* Refresh Button */}
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={() => loadBills()}
                disabled={loading}
                activeOpacity={0.7}
              >
                <RefreshCw
                  color="#334155"
                  size={13}
                  style={styles.extractedInline1}
                />
                <Text style={styles.refreshBtnText}>Refresh</Text>
              </TouchableOpacity>

              {/* Columns Selector Button */}
              <TouchableOpacity
                style={styles.columnsBtn}
                onPress={() => setShowColumnModal(true)}
                activeOpacity={0.7}
              >
                <Columns
                  color="#334155"
                  size={13}
                  style={styles.extractedInline1}
                />
                <Text style={styles.columnsBtnText}>Columns</Text>
              </TouchableOpacity>
            </View>
          </View>

          {Boolean(lastRefreshed) && (
            <View style={styles.lastRefreshedBar}>
              <Text style={styles.lastRefreshedLabel}>
                Last refreshed: {lastRefreshed}
              </Text>
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
            /* -- MOBILE CARD VIEW (Exact layout as shown in user's Screenshot 2) -- */
            <View style={styles.extractedInline15}>
              {bills.map(bill => {
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
                            {bill.bill_number ||
                              `TB-C71-2026-${String(bill.id).padStart(5, '0')}`}
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
                            {status === 'partial'
                              ? 'Partially Paid'
                              : capitalize(status)}
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
                          <Text
                            style={styles.gridColValPhone}
                            numberOfLines={1}
                          >
                            {bill.patient_phone || bill.phone || '—'}
                          </Text>
                        </View>
                      )}

                      {visibleColumns.paid_amount && (
                        <View style={styles.gridCol}>
                          <Text style={styles.gridColLabel}>PAID</Text>
                          <Text
                            style={[
                              styles.gridColVal,
                              styles.extractedInline16,
                            ]}
                            numberOfLines={1}
                          >
                            {formatCurrency(paidAmount)}
                          </Text>
                        </View>
                      )}

                      {visibleColumns.pending_amount && (
                        <View style={styles.gridCol}>
                          <Text style={styles.gridColLabel}>DUE</Text>
                          <Text
                            style={[
                              styles.gridColVal,
                              styles.extractedInline17,
                            ]}
                            numberOfLines={1}
                          >
                            {formatCurrency(pendingAmount)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Bottom Row: Date & Payment Method | [ ??? ] [ ? ] Action Buttons */}
                    <View style={styles.cardBottomRow}>
                      <View style={styles.metaBottomBlock}>
                        {visibleColumns.created_at && (
                          <Text style={styles.metaDateText}>
                            {formatDate(bill.created_at || bill.bill_date)}
                          </Text>
                        )}
                        {visibleColumns.payment_method && (
                          <Text style={styles.metaPaymentText}>
                            {capitalize(
                              bill.payment_method ||
                                bill.payment_mode ||
                                'Payment not recorded',
                            )}
                          </Text>
                        )}
                      </View>

                      {/* Right Action Buttons (Teal Eye + Gray 3-Dots) */}
                      <View style={styles.actionsBlock}>
                        <TouchableOpacity
                          style={styles.eyeActionBtn}
                          onPress={() => handleViewInvoice(bill)}
                          activeOpacity={0.7}
                        >
                          <Eye size={16} color="#0D9488" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.moreActionBtn}
                          onPress={e => handleOpenActionMenu(bill, e)}
                          activeOpacity={0.7}
                        >
                          <MoreVertical size={16} color="#475569" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            /* -- DESKTOP / WIDE SCREEN HORIZONTAL TABLE VIEW -------------------- */
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              nestedScrollEnabled={true}
              scrollEventThrottle={16}
              decelerationRate="normal"
            >
              <View style={{ minWidth: tableMinWidth }}>
                <View style={styles.tableHeaderRow}>
                  {visibleColumns.bill_number && (
                    <Text style={[styles.thCell, styles.extractedInline18]}>
                      Bill Number
                    </Text>
                  )}
                  {visibleColumns.patient_name && (
                    <Text style={[styles.thCell, styles.extractedInline18]}>
                      Patient Name
                    </Text>
                  )}
                  {visibleColumns.phone && (
                    <Text style={[styles.thCell, styles.extractedInline19]}>
                      Phone
                    </Text>
                  )}
                  {visibleColumns.patient_code && (
                    <Text style={[styles.thCell, styles.extractedInline20]}>
                      Code
                    </Text>
                  )}
                  {visibleColumns.total_amount && (
                    <Text style={[styles.thCell, styles.extractedInline21]}>
                      Total Amount
                    </Text>
                  )}
                  {visibleColumns.paid_amount && (
                    <Text style={[styles.thCell, styles.extractedInline20]}>
                      Paid
                    </Text>
                  )}
                  {visibleColumns.pending_amount && (
                    <Text style={[styles.thCell, styles.extractedInline20]}>
                      Due
                    </Text>
                  )}
                  {visibleColumns.status && (
                    <Text style={[styles.thCell, styles.extractedInline22]}>
                      Status
                    </Text>
                  )}
                  {visibleColumns.payment_method && (
                    <Text style={[styles.thCell, styles.extractedInline20]}>
                      Method
                    </Text>
                  )}
                  {visibleColumns.created_at && (
                    <Text style={[styles.thCell, styles.extractedInline20]}>
                      Date
                    </Text>
                  )}
                  <Text style={[styles.thCell, styles.extractedInline23]}>
                    Actions
                  </Text>
                </View>

                {bills.map(bill => {
                  const status = normalizeBillStatus(bill);
                  const badge = getStatusBadgeStyle(status);
                  const totalAmount = Number(bill.total_amount) || 0;
                  const paidAmount = Number(bill.paid_amount) || 0;
                  const pendingAmount = totalAmount - paidAmount;

                  return (
                    <View key={String(bill.id)} style={styles.tableBodyRow}>
                      {visibleColumns.bill_number && (
                        <View style={styles.extractedInline24}>
                          <Text
                            style={styles.billNumberTableText}
                            numberOfLines={1}
                          >
                            {bill.bill_number ||
                              `TB-C71-2026-${String(bill.id).padStart(5, '0')}`}
                          </Text>
                        </View>
                      )}

                      {visibleColumns.patient_name && (
                        <View style={styles.extractedInline24}>
                          <Text
                            style={styles.patientNameTableText}
                            numberOfLines={1}
                          >
                            {bill.patient_name || 'Patient'}
                          </Text>
                        </View>
                      )}

                      {visibleColumns.phone && (
                        <View style={styles.extractedInline25}>
                          <Text style={styles.tdText}>
                            {bill.patient_phone || bill.phone || '—'}
                          </Text>
                        </View>
                      )}

                      {visibleColumns.patient_code && (
                        <View style={styles.extractedInline26}>
                          <Text style={styles.tdText}>
                            {bill.patient_code || '—'}
                          </Text>
                        </View>
                      )}

                      {visibleColumns.total_amount && (
                        <View style={styles.extractedInline27}>
                          <Text
                            style={[styles.tdText, styles.extractedInline28]}
                          >
                            {formatCurrency(totalAmount)}
                          </Text>
                        </View>
                      )}

                      {visibleColumns.paid_amount && (
                        <View style={styles.extractedInline26}>
                          <Text
                            style={[styles.tdText, styles.extractedInline29]}
                          >
                            {formatCurrency(paidAmount)}
                          </Text>
                        </View>
                      )}

                      {visibleColumns.pending_amount && (
                        <View style={styles.extractedInline26}>
                          <Text
                            style={[
                              styles.tdText,
                              pendingAmount > 0
                                ? styles.pendingAmountDanger
                                : styles.pendingAmountNormal,
                            ]}
                          >
                            {formatCurrency(pendingAmount)}
                          </Text>
                        </View>
                      )}

                      {visibleColumns.status && (
                        <View style={styles.extractedInline30}>
                          <View style={[styles.statusPillBadge, badge.bg]}>
                            {badge.icon}
                            <Text style={[styles.statusPillText, badge.text]}>
                              {status === 'partial'
                                ? 'Partially Paid'
                                : capitalize(status)}
                            </Text>
                          </View>
                        </View>
                      )}

                      {visibleColumns.payment_method && (
                        <View style={styles.extractedInline26}>
                          <Text style={styles.tdText}>
                            {capitalize(
                              bill.payment_method || bill.payment_mode || '—',
                            )}
                          </Text>
                        </View>
                      )}

                      {visibleColumns.created_at && (
                        <View style={styles.extractedInline26}>
                          <Text style={styles.tdText}>
                            {formatDate(bill.created_at || bill.bill_date)}
                          </Text>
                        </View>
                      )}

                      <View style={styles.extractedInline31}>
                        <TouchableOpacity
                          style={styles.eyeActionBtn}
                          onPress={() => handleViewInvoice(bill)}
                          activeOpacity={0.7}
                        >
                          <Eye size={15} color="#0D9488" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.moreActionBtn}
                          onPress={e => handleOpenActionMenu(bill, e)}
                          activeOpacity={0.7}
                        >
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
                onPageChange={page => setCurrentPage(page)}
                onPageSizeChange={size => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* -- 3-DOTS ACTION POPUP MENU (Exact match with Web Screenshot 1) ---------- */}
      <Modal
        visible={Boolean(actionMenuBill)}
        animationType="fade"
        transparent
        onRequestClose={() => setActionMenuBill(null)}
      >
        <TouchableWithoutFeedback onPress={() => setActionMenuBill(null)}>
          <View style={styles.actionMenuOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.actionMenuCard,
                  {
                    top: actionMenuPosition.top,
                    right: actionMenuPosition.right,
                  },
                ]}
              >
                {/* 1. Edit Bill */}
                {canEdit && actionMenuBill?.status !== 'cancelled' && (
                  <TouchableOpacity
                    style={styles.actionMenuItem}
                    onPress={() => {
                      const b = actionMenuBill;
                      setActionMenuBill(null);
                      if (b) handleOpenEditModal(b);
                    }}
                  >
                    <Settings2
                      size={16}
                      color="#0F172A"
                      style={styles.actionMenuIcon}
                    />
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
                  }}
                >
                  <MessageCircle
                    size={16}
                    color="#16A34A"
                    style={styles.actionMenuIcon}
                  />
                  <Text style={styles.actionMenuText}>Share on WhatsApp</Text>
                </TouchableOpacity>

                {/* 3. Share by Email */}
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={() => {
                    const b = actionMenuBill;
                    setActionMenuBill(null);
                    if (b) shareBillByEmail(b);
                  }}
                >
                  <Mail
                    size={16}
                    color="#2563EB"
                    style={styles.actionMenuIcon}
                  />
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
                      }}
                    >
                      <CreditCard
                        size={16}
                        color="#0F172A"
                        style={styles.actionMenuIcon}
                      />
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
                    }}
                  >
                    <AlertCircle
                      size={16}
                      color="#DC2626"
                      style={styles.actionMenuIcon}
                    />
                    <Text style={styles.actionMenuTextCancel}>Cancel Bill</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* -- COLUMNS SELECTOR MODAL ---------------------------------------------- */}
      <ColumnSelectorModal
        visible={showColumnModal}
        onClose={() => setShowColumnModal(false)}
        columns={COLUMN_DEFINITIONS}
        visibleColumns={visibleColumns}
        onToggleColumn={key =>
          setVisibleColumns(prev => ({
            ...prev,
            [key]: !prev[key],
          }))
        }
        onReset={() => setVisibleColumns(DEFAULT_TREATMENT_BILL_COLUMNS)}
        title="Customize Columns"
        subtitle="Select which columns to display in the bills list"
      />

      {/* -- CREATE / EDIT BILL MODAL (Modularized Web-Parity Component) -- */}
      <CreateTreatmentBillModal
        visible={createModalVisible}
        onClose={() => {
          setCreateModalVisible(false);
          setEditingBillForModal(null);
        }}
        onSuccess={msg => {
          loadBills();
          if (msg) Alert.alert('Success', msg);
        }}
        editingBill={editingBillForModal}
        activeClinicId={activeClinicId}
        token={token}
      />

      {/* -- INVOICE / RECEIPT MODAL ------------------------------------------- */}
      <Modal
        visible={viewInvoiceModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setViewInvoiceModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContainer, styles.extractedInline32]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {selectedBill?.bill_number || `Invoice #${selectedBill?.id}`}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Official Medical / Dental Treatment Invoice
                </Text>
              </View>
              <View style={styles.receiptHeaderRight}>
                <TouchableOpacity
                  onPress={() => setViewInvoiceModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            {billDetailsLoading ? (
              <View style={styles.extractedInline33}>
                <ActivityIndicator size="large" color="#0D9488" />
                <Text style={styles.extractedInline34}>
                  Loading invoice details...
                </Text>
              </View>
            ) : selectedBill ? (
              <ScrollView contentContainerStyle={styles.invoiceReceiptContent}>
                <View style={styles.invoiceTopRow}>
                  <View style={styles.extractedInline35}>
                    <Text style={styles.clinicBrandingName}>
                      {selectedBill.clinic_name || activeClinicName || 'Clinic'}
                    </Text>
                    <Text style={styles.clinicBrandingContact}>
                      PATIENT CARE & TREATMENT SERVICES
                    </Text>
                    {[
                      selectedBill.clinic_address,
                      selectedBill.clinic_phone,
                      selectedBill.clinic_email,
                    ]
                      .filter(Boolean)
                      .map((value, index) => (
                        <Text key={index} style={styles.clinicBrandingAddress}>
                          {value}
                        </Text>
                      ))}
                  </View>
                  <View style={styles.extractedInline36}>
                    <Text style={styles.invoiceType}>TREATMENT INVOICE</Text>
                    <Text style={styles.metaBillNo}>
                      {selectedBill.bill_number || `TB-${selectedBill.id}`}
                    </Text>
                    <Text style={styles.metaSub}>
                      Issued{' '}
                      {formatDate(
                        selectedBill.created_at || selectedBill.bill_date,
                      )}
                    </Text>
                  </View>
                </View>

                {/* Patient & Invoice Meta */}
                <View style={styles.receiptMetaGrid}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaHeader}>BILL TO</Text>
                    <Text style={styles.metaPatientName}>
                      {selectedBill.patient_name || 'Patient'}
                    </Text>
                    {selectedBill.patient_phone ? (
                      <Text style={styles.metaSub}>
                        ?? {selectedBill.patient_phone}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.metaCol, styles.extractedInline36]}>
                    <Text style={styles.metaHeader}>DOCTOR & APPOINTMENT</Text>
                    <Text style={styles.metaPatientName}>
                      {selectedBill.doctor_name
                        ? `Dr. ${selectedBill.doctor_name}`
                        : '—'}
                    </Text>
                    <Text style={styles.metaSub}>
                      Appointment:{' '}
                      {selectedBill.appointment_date
                        ? `${formatDate(selectedBill.appointment_date)}${
                            selectedBill.appointment_time
                              ? `, ${selectedBill.appointment_time}`
                              : ''
                          }`
                        : '—'}
                    </Text>
                  </View>
                </View>

                <View style={styles.paymentStatusBanner}>
                  <Text style={styles.paymentStatusText}>
                    Payment Method:{' '}
                    <Text style={styles.extractedInline37}>
                      {capitalize(
                        selectedBill.payment_method ||
                          selectedBill.payment_mode ||
                          'Cash',
                      )}
                    </Text>
                  </Text>
                  <Text
                    style={[
                      styles.paymentStatusLabel,
                      normalizeBillStatus(selectedBill) === 'paid'
                        ? styles.paidLabel
                        : styles.dueLabel,
                    ]}
                  >
                    {normalizeBillStatus(selectedBill).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.invoiceSectionTitle}>
                  TREATMENT & SERVICE ITEMS
                </Text>

                {/* Itemized Table */}
                <View style={styles.receiptTableContainer}>
                  <View style={styles.receiptTableHeader}>
                    <Text style={[styles.receiptTh, styles.extractedInline38]}>
                      #
                    </Text>
                    <Text style={[styles.receiptTh, styles.extractedInline39]}>
                      Item
                    </Text>
                    <Text style={[styles.receiptTh, styles.extractedInline40]}>
                      Qty
                    </Text>
                    <Text style={[styles.receiptTh, styles.extractedInline41]}>
                      Rate
                    </Text>
                    <Text style={[styles.receiptTh, styles.extractedInline42]}>
                      Disc.
                    </Text>
                    <Text style={[styles.receiptTh, styles.extractedInline41]}>
                      Total
                    </Text>
                  </View>

                  {(selectedBill.items || []).length > 0 ? (
                    selectedBill.items.map((item, idx) => (
                      <View key={idx} style={styles.receiptTableRow}>
                        <Text
                          style={[styles.receiptTd, styles.extractedInline38]}
                        >
                          {idx + 1}
                        </Text>
                        <View style={styles.extractedInline39}>
                          <Text style={styles.receiptItemTitle}>
                            {item.service_name}
                          </Text>
                          {item.service_code ? (
                            <Text style={styles.receiptItemCode}>
                              #{item.service_code}
                            </Text>
                          ) : null}
                        </View>
                        <Text
                          style={[styles.receiptTd, styles.extractedInline40]}
                        >
                          {item.quantity}
                        </Text>
                        <Text
                          style={[styles.receiptTd, styles.extractedInline43]}
                        >
                          ?{Number(item.unit_price || 0).toFixed(2)}
                        </Text>
                        <Text
                          style={[styles.receiptTd, styles.extractedInline42]}
                        >
                          {Number(item.discount_pct || 0)}%
                        </Text>
                        <Text
                          style={[
                            styles.receiptTdTotal,
                            styles.extractedInline41,
                          ]}
                        >
                          ?{Number(item.total_price || 0).toFixed(2)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.receiptTableRow}>
                      <Text
                        style={[styles.receiptTd, styles.extractedInline38]}
                      >
                        1
                      </Text>
                      <View style={styles.extractedInline39}>
                        <Text style={styles.receiptItemTitle}>
                          Treatment Consultation & Services
                        </Text>
                      </View>
                      <Text
                        style={[styles.receiptTd, styles.extractedInline40]}
                      >
                        1
                      </Text>
                      <Text
                        style={[styles.receiptTd, styles.extractedInline41]}
                      >
                        {formatCurrency(selectedBill.total_amount)}
                      </Text>
                      <Text
                        style={[styles.receiptTd, styles.extractedInline42]}
                      >
                        0%
                      </Text>
                      <Text
                        style={[
                          styles.receiptTdTotal,
                          styles.extractedInline41,
                        ]}
                      >
                        {formatCurrency(selectedBill.total_amount)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Receipt Summary Card */}
                <View style={styles.invoiceSummaryLayout}>
                  <View style={styles.invoiceNotes}>
                    <Text style={styles.metaHeader}>NOTES</Text>
                    <Text style={styles.clinicBrandingAddress}>
                      Thank you for choosing us for your care.
                    </Text>
                  </View>
                  <View style={styles.receiptSummaryCard}>
                    <View style={styles.receiptSummaryRow}>
                      <Text style={styles.receiptSumLabel}>Subtotal</Text>
                      <Text style={styles.receiptSumVal}>
                        {formatCurrency(
                          selectedBill.subtotal || selectedBill.total_amount,
                        )}
                      </Text>
                    </View>
                    <View style={styles.receiptSummaryRow}>
                      <Text style={styles.receiptSumLabel}>Discount</Text>
                      <Text
                        style={[styles.receiptSumVal, styles.extractedInline44]}
                      >
                        - {formatCurrency(selectedBill.discount_amount)}
                      </Text>
                    </View>
                    <View style={styles.receiptSummaryRow}>
                      <Text style={styles.receiptSumLabel}>Tax</Text>
                      <Text style={styles.receiptSumVal}>
                        + {formatCurrency(selectedBill.tax_amount)}
                      </Text>
                    </View>
                    <View
                      style={[styles.receiptSummaryRow, styles.receiptGrandRow]}
                    >
                      <Text style={styles.receiptGrandLabel}>Total</Text>
                      <Text style={styles.receiptGrandVal}>
                        {formatCurrency(selectedBill.total_amount || 0)}
                      </Text>
                    </View>
                    <View style={styles.receiptSummaryRow}>
                      <Text style={styles.receiptSumLabel}>Amount Paid</Text>
                      <Text
                        style={[styles.receiptSumVal, styles.extractedInline16]}
                      >
                        {formatCurrency(selectedBill.paid_amount || 0)}
                      </Text>
                    </View>
                    <View style={styles.receiptSummaryRow}>
                      <Text
                        style={[
                          styles.receiptSumLabel,
                          styles.extractedInline45,
                        ]}
                      >
                        Balance Due
                      </Text>
                      <Text
                        style={[styles.receiptSumVal, styles.extractedInline17]}
                      >
                        {formatCurrency(
                          Math.max(
                            0,
                            Number(selectedBill.total_amount || 0) -
                              Number(selectedBill.paid_amount || 0),
                          ),
                        )}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Status Stamp */}
                <View style={styles.stampRow}>
                  {normalizeBillStatus(selectedBill) === 'paid' && (
                    <View
                      style={[styles.receiptStamp, styles.receiptStampPaid]}
                    >
                      <Text
                        style={[
                          styles.receiptStampText,
                          styles.extractedInline16,
                        ]}
                      >
                        ? FULLY PAID
                      </Text>
                    </View>
                  )}
                  {normalizeBillStatus(selectedBill) === 'partial' && (
                    <View
                      style={[styles.receiptStamp, styles.receiptStampPartial]}
                    >
                      <Text
                        style={[
                          styles.receiptStampText,
                          styles.extractedInline46,
                        ]}
                      >
                        PARTIALLY PAID
                      </Text>
                    </View>
                  )}
                  {normalizeBillStatus(selectedBill) === 'pending' && (
                    <View
                      style={[styles.receiptStamp, styles.receiptStampPending]}
                    >
                      <Text
                        style={[
                          styles.receiptStampText,
                          styles.extractedInline47,
                        ]}
                      >
                        PAYMENT PENDING
                      </Text>
                    </View>
                  )}
                  {normalizeBillStatus(selectedBill) === 'cancelled' && (
                    <View
                      style={[
                        styles.receiptStamp,
                        styles.receiptStampCancelled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.receiptStampText,
                          styles.extractedInline48,
                        ]}
                      >
                        CANCELLED
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.invoicePdfFooter}>
                  <Text style={styles.invoiceFooterNote}>
                    This is a system-generated treatment invoice. Thank you for
                    your visit.
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.invoiceDownloadButton}
                    onPress={() => handleDownloadPDF(selectedBill)}
                  >
                    <Download size={18} color="#FFFFFF" />
                    <Text style={styles.invoiceDownloadButtonText}>
                      Download PDF
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* -- RECORD PAYMENT MODAL ---------------------------------------------- */}
      <Modal
        visible={paymentModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalContainer, styles.extractedInline49]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Record Payment</Text>
                <Text style={styles.modalSubtitle}>
                  Invoice #{selectedBill?.bill_number || selectedBill?.id} —{' '}
                  {selectedBill?.patient_name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPaymentModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.paymentModalScroll}>
              <View style={styles.paymentMetaBox}>
                <View style={styles.paymentMetaRow}>
                  <Text style={styles.paymentMetaLabel}>
                    Total Invoice Amount
                  </Text>
                  <Text style={styles.paymentMetaValue}>
                    {formatCurrency(selectedBill?.total_amount || 0)}
                  </Text>
                </View>
                <View style={styles.paymentMetaRow}>
                  <Text style={styles.paymentMetaLabel}>Already Paid</Text>
                  <Text
                    style={[styles.paymentMetaValue, styles.extractedInline16]}
                  >
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
                          Number(selectedBill?.paid_amount || 0),
                      ),
                    )}
                  </Text>
                </View>
              </View>

              <Text style={styles.subFieldLabel}>Payment Method</Text>
              <View style={styles.methodsRow}>
                {PAYMENT_METHODS.map(m => (
                  <TouchableOpacity
                    key={m.key}
                    style={[
                      styles.methodChip,
                      paymentMethodSelect === m.key &&
                        styles.methodChipSelected,
                    ]}
                    onPress={() => setPaymentMethodSelect(m.key)}
                  >
                    <Text
                      style={[
                        styles.methodChipText,
                        paymentMethodSelect === m.key &&
                          styles.methodChipTextSelected,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.subFieldLabel}>
                Payment Amount to Collect (?) *
              </Text>
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
                disabled={submittingPayment}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSubmitPayment}
                disabled={submittingPayment}
              >
                {submittingPayment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={18} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>
                      Confirm & Collect
                    </Text>
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

export default TreatmentBillingScreen;
