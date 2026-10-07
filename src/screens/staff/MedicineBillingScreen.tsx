import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, NativeModules, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { AlertCircle, Check, ChevronDown, Clock, Columns, Download, Eye, FileText, IndianRupee, MoreVertical, Plus, Receipt, RefreshCw, Search, Trash2, X } from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { Pagination } from '../../components/common/Pagination';
import { ColumnSelectorModal, ColumnOption } from '../../components/common/ColumnSelectorModal';
import { CustomCalendarPicker } from '../../components/common/CustomCalendarPicker';
import { useAuthContext } from '../../context/AuthContext';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { fetchPatientsApi } from '../../api/patientApi';
import { searchMedicinesApi } from '../../api/medicineApi';
import { getPrescriptionsApi } from '../../api/prescriptionApi';
import {
  cancelMedicineBillApi, getMedicineBillByIdApi, getMedicineBillsApi,
  recordMedicineBillPaymentApi, createMedicineBillApi, updateMedicineBillApi,
} from '../../api/billingApi';
import { BASE_URL } from '../../api/apiConfig';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import { PatientModel, Medicine } from '../../types/clinicTypes';

interface Props { onOpenDrawer: () => void }
type BillLine = {
  medicine_id: number; medicine_name: string; batch_number?: string; quantity: number;
  unit_price: number; discount_pct: number; tax_pct: number; total_price: number;
};
type Bill = {
  id: number; clinic_id: number; patient_id: number; patient_name?: string; patient_code?: string;
  patient_phone?: string; pharmacist_name?: string; bill_number?: string; prescription_id?: number;
  doctor_name?: string; appointment_id?: number;
  subtotal: number; discount_amount: number; tax_amount: number; total_amount: number;
  paid_amount: number; payment_method?: string; status: string; notes?: string;
  created_at?: string; items?: BillLine[];
};
type MedicineColumn = 'bill_number' | 'patient_name' | 'phone' | 'patient_code' | 'total_amount' | 'paid_amount' | 'pending_amount' | 'status' | 'payment_method' | 'created_at' | 'doctor_name' | 'appointment_id';
const PAGE_SIZE = 10;
const COLUMNS: ColumnOption<MedicineColumn>[] = [
  { key: 'bill_number', label: 'Bill Number', defaultVisible: true },
  { key: 'patient_name', label: 'Patient Name', defaultVisible: true },
  { key: 'phone', label: 'Patient Phone', defaultVisible: true },
  { key: 'patient_code', label: 'Patient Code', defaultVisible: false },
  { key: 'total_amount', label: 'Total Amount', defaultVisible: true },
  { key: 'paid_amount', label: 'Paid Amount', defaultVisible: false },
  { key: 'pending_amount', label: 'Balance Due', defaultVisible: false },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'payment_method', label: 'Payment Method', defaultVisible: true },
  { key: 'created_at', label: 'Date', defaultVisible: true },
  { key: 'doctor_name', label: 'Doctor', defaultVisible: false },
  { key: 'appointment_id', label: 'Appointment ID', defaultVisible: false },
];
const DEFAULT_COLUMNS = Object.fromEntries(COLUMNS.map(c => [c.key, c.defaultVisible])) as Record<MedicineColumn, boolean>;
const STATUS_OPTIONS = ['all', 'pending', 'partial', 'paid', 'cancelled'];
const money = (value: unknown) => `\u20B9${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const statusOf = (bill: Bill) => String(bill.status || 'pending').toLowerCase() === 'partially_paid' ? 'partial' : String(bill.status || 'pending').toLowerCase();
const lineTotal = (line: BillLine) => {
  const base = Math.max(0, Number(line.quantity) || 0) * Math.max(0, Number(line.unit_price) || 0);
  const discounted = base * (1 - Math.min(100, Math.max(0, Number(line.discount_pct) || 0)) / 100);
  return Math.round((discounted * (1 + Math.max(0, Number(line.tax_pct) || 0) / 100)) * 100) / 100;
};
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014';
const unwrapList = (data: any): any[] => Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.patients) ? data.patients : Array.isArray(data?.medicines) ? data.medicines : [];

export const MedicineBillingScreen: React.FC<Props> = ({ onOpenDrawer }) => {
  const { token, activeClinicId, role, user, permissionsMap = {} } = useAuthContext();
  const canView = canUseStaffScreen(role, permissionsMap, 'medicine_billing', 'view');
  const canAdd = canUseStaffScreen(role, permissionsMap, 'medicine_billing', 'add');
  const canEdit = canUseStaffScreen(role, permissionsMap, 'medicine_billing', 'edit');
  const canDelete = canUseStaffScreen(role, permissionsMap, 'medicine_billing', 'delete');
  const canExecute = canUseStaffScreen(role, permissionsMap, 'medicine_billing', 'execute');
  const [bills, setBills] = useState<Bill[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [statusOpen, setStatusOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [columnsVisible, setColumnsVisible] = useState(false);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [lastRefreshed, setLastRefreshed] = useState('');
  const [actionMenuBill, setActionMenuBill] = useState<Bill | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<PatientModel[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientModel | null>(null);
  const [medicineSearch, setMedicineSearch] = useState('');
  const [medicineResults, setMedicineResults] = useState<Medicine[]>([]);
  const [items, setItems] = useState<BillLine[]>([]);
  const [prescriptionId, setPrescriptionId] = useState('');
  const [prescriptionOptions, setPrescriptionOptions] = useState<any[]>([]);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState('0');
  const [paid, setPaid] = useState('0');
  const [notes, setNotes] = useState('');
  const [viewedBill, setViewedBill] = useState<Bill | null>(null);
  const [viewVisible, setViewVisible] = useState(false);
  const [paymentBill, setPaymentBill] = useState<Bill | null>(null);
  const [paymentInput, setPaymentInput] = useState('');
  const [editBill, setEditBill] = useState<Bill | null>(null);
  const [editDiscount, setEditDiscount] = useState('');
  const [editTax, setEditTax] = useState('');
  const [editPaid, setEditPaid] = useState('');
  const [editMethod, setEditMethod] = useState('cash');

  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350); return () => clearTimeout(timer); }, [search]);
  const loadBills = useCallback(async () => {
    if (!token || !canView) { setBills([]); setTotal(0); return; }
    setLoading(true);
    try {
      const response = await getMedicineBillsApi(token, { clinic_id: activeClinicId, search: debouncedSearch, status, date: dateFilter || undefined, page, limit: pageSize });
      if (!response.success) { showErrorToast('Could not load bills', response.message); return; }
      const payload: any = response.data;
      const rows = unwrapList(payload?.data ?? payload);
      setBills(rows);
      setTotal(Number(payload?.total ?? payload?.count ?? rows.length));
      setLastRefreshed(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }));
    } catch (error: any) { showErrorToast('Could not load bills', error?.message); }
    finally { setLoading(false); }
  }, [activeClinicId, canView, debouncedSearch, dateFilter, page, pageSize, status, token]);
  useEffect(() => { void loadBills(); }, [loadBills]);
  useEffect(() => { setPage(1); }, [activeClinicId, debouncedSearch, status, dateFilter]);

  useEffect(() => {
    if (!token || !activeClinicId || !patientSearch.trim() || selectedPatient) { setPatients([]); return; }
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        const response = await fetchPatientsApi({ clinic_id: activeClinicId, search: patientSearch.trim(), page: 1, limit: 8, is_active: 1 }, token);
        if (alive && response.success) setPatients(unwrapList(response.data));
      } catch { if (alive) setPatients([]); }
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [activeClinicId, patientSearch, selectedPatient, token]);

  useEffect(() => {
    if (!token || !selectedPatient || !activeClinicId) { setPrescriptionOptions([]); return; }
    let alive = true;
    void getPrescriptionsApi(token, { patient_id: selectedPatient.id, clinic_id: activeClinicId, page: 1, limit: 100 })
      .then(response => { if (alive && response.success) setPrescriptionOptions(unwrapList(response.data?.prescriptions ?? response.data)); })
      .catch(() => { if (alive) setPrescriptionOptions([]); });
    return () => { alive = false; };
  }, [activeClinicId, selectedPatient, token]);

  useEffect(() => {
    if (!token || !medicineSearch.trim()) { setMedicineResults([]); return; }
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        const response = await searchMedicinesApi(token, medicineSearch.trim(), activeClinicId);
        if (alive && response.success) setMedicineResults(unwrapList(response.data));
      } catch { if (alive) setMedicineResults([]); }
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [activeClinicId, medicineSearch, token]);

  const totals = useMemo(() => {
    let subtotal = 0, discountAmount = 0, taxAmount = 0;
    items.forEach(item => {
      const base = item.quantity * item.unit_price;
      const disc = base * Math.min(100, Math.max(0, item.discount_pct)) / 100;
      subtotal += base; discountAmount += disc; taxAmount += (base - disc) * item.tax_pct / 100;
    });
    const overallDiscount = Math.max(0, Number(discount) || 0);
    const totalAmount = Math.max(0, subtotal - discountAmount - overallDiscount + taxAmount);
    return { subtotal, discountAmount: discountAmount + overallDiscount, taxAmount, totalAmount };
  }, [discount, items]);

  const resetForm = () => { setSelectedPatient(null); setPatientSearch(''); setPatients([]); setMedicineSearch(''); setMedicineResults([]); setItems([]); setPrescriptionId(''); setPrescriptionOpen(false); setPrescriptionOptions([]); setPaymentMethod('cash'); setDiscount('0'); setPaid('0'); setNotes(''); };
  const openCreate = () => { resetForm(); setFormVisible(true); };
  const addMedicine = (medicine: Medicine) => {
    setItems(prev => {
      const existing = prev.find(item => item.medicine_id === medicine.id);
      if (existing) return prev.map(item => item.medicine_id === medicine.id ? { ...item, quantity: item.quantity + 1, total_price: lineTotal({ ...item, quantity: item.quantity + 1 }) } : item);
      const next: BillLine = { medicine_id: medicine.id, medicine_name: medicine.name, batch_number: medicine.batch_number, quantity: 1, unit_price: Number(medicine.selling_price || medicine.unit_price || 0), discount_pct: 0, tax_pct: Number(medicine.gst_percent || 0), total_price: 0 };
      next.total_price = lineTotal(next); return [...prev, next];
    });
    setMedicineSearch(''); setMedicineResults([]);
  };
  const updateLine = (id: number, field: 'quantity' | 'discount_pct', value: string) => {
    const number = Math.max(0, Number(value) || 0);
    setItems(prev => prev.map(line => {
      if (line.medicine_id !== id) return line;
      const next = { ...line, [field]: field === 'quantity' ? Math.floor(number) : Math.min(100, number) };
      return { ...next, total_price: lineTotal(next) };
    }).filter(line => line.quantity > 0));
  };

  const createBill = async () => {
    if (!token || !selectedPatient || items.length === 0 || !activeClinicId) { showErrorToast('Bill details required', 'Choose a patient and add at least one medicine.'); return; }
    const paidAmount = Number(paid) || 0;
    if (paidAmount < 0 || paidAmount > totals.totalAmount) { showErrorToast('Invalid payment', 'Paid amount must be between zero and the bill total.'); return; }
    setSaving(true);
    try {
      const response = await createMedicineBillApi(token, {
        clinic_id: activeClinicId, patient_id: Number(selectedPatient.id),
        pharmacist_id: Number(user?.id) || undefined,
        prescription_id: prescriptionId ? Number(prescriptionId) : undefined,
        subtotal: totals.subtotal, discount_amount: totals.discountAmount, tax_amount: totals.taxAmount,
        total_amount: totals.totalAmount, paid_amount: paidAmount, payment_method: paymentMethod,
        status: paidAmount >= totals.totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'pending', notes,
        items: items.map(item => ({ ...item, total_price: lineTotal(item) })),
      });
      if (!response.success) { showErrorToast('Bill creation failed', response.message); return; }
      setFormVisible(false); resetForm(); showSuccessToast('Bill created', response.message); void loadBills();
    } catch (error: any) { showErrorToast('Bill creation failed', error?.message); }
    finally { setSaving(false); }
  };

  const openView = async (bill: Bill) => {
    if (!token) return;
    setSaving(true);
    try {
      const response = await getMedicineBillByIdApi(token, bill.id);
      if (!response.success) { showErrorToast('Could not open bill', response.message); return; }
      const data: any = response.data;
      setViewedBill(data?.bill || data); setViewVisible(true);
    } catch (error: any) { showErrorToast('Could not open bill', error?.message); }
    finally { setSaving(false); }
  };
  const downloadPdf = async (bill: Bill) => {
    if (Platform.OS !== 'android' || !NativeModules.BillPdfDownload?.downloadPdf || !token) { showErrorToast('Download unavailable', 'Bill PDF download is available on Android.'); return; }
    try {
      const name = `medicine-bill-${String(bill.bill_number || bill.id).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      await NativeModules.BillPdfDownload.downloadPdf(`${BASE_URL}/medicine-bills/${bill.id}/pdf`, token, name);
      showSuccessToast('Download started', `${name} is being saved to Downloads.`);
    } catch (error: any) { showErrorToast('Download failed', error?.message); }
  };
  const cancelBill = (bill: Bill) => {
    Alert.alert('Cancel medicine bill?', `Cancel ${bill.bill_number || `#${bill.id}`}?`, [
      { text: 'Keep bill', style: 'cancel' },
      { text: 'Cancel bill', style: 'destructive', onPress: async () => {
        if (!token) return;
        setSaving(true);
        try { const response = await cancelMedicineBillApi(token, bill.id); if (!response.success) { showErrorToast('Cancel failed', response.message); return; } showSuccessToast('Bill cancelled', response.message); void loadBills(); }
        catch (error: any) { showErrorToast('Cancel failed', error?.message); }
        finally { setSaving(false); }
      } },
    ]);
  };
  const recordPayment = async () => {
    if (!token || !paymentBill) return;
    const amount = Number(paymentInput);
    if (!Number.isFinite(amount) || amount <= 0) { showErrorToast('Invalid amount', 'Enter a payment amount greater than zero.'); return; }
    const newPaid = Number(paymentBill.paid_amount || 0) + amount;
    if (newPaid > Number(paymentBill.total_amount)) { showErrorToast('Invalid amount', 'Payment cannot exceed the balance due.'); return; }
    setSaving(true);
    try {
      const response = await recordMedicineBillPaymentApi(token, paymentBill.id, { paid_amount: newPaid, status: newPaid >= paymentBill.total_amount ? 'paid' : 'partial' });
      if (!response.success) { showErrorToast('Payment failed', response.message); return; }
      setPaymentBill(null); setPaymentInput(''); showSuccessToast('Payment recorded', response.message); void loadBills();
    } catch (error: any) { showErrorToast('Payment failed', error?.message); }
    finally { setSaving(false); }
  };
  const saveEdit = async () => {
    if (!token || !editBill) return;
    const nextDiscount = Number(editDiscount);
    const nextTax = Number(editTax);
    const nextPaid = Number(editPaid);
    if (!Number.isFinite(nextDiscount) || nextDiscount < 0 || !Number.isFinite(nextTax) || nextTax < 0 || !Number.isFinite(nextPaid) || nextPaid < 0) { showErrorToast('Invalid bill details', 'Enter valid non-negative discount, tax and paid amounts.'); return; }
    setSaving(true);
    try {
      const response = await updateMedicineBillApi(token, editBill.id, { discount_amount: nextDiscount, tax_amount: nextTax, paid_amount: nextPaid, payment_method: editMethod, status: nextPaid >= Number(editBill.total_amount) ? 'paid' : nextPaid > 0 ? 'partial' : 'pending' } as any);
      if (!response.success) { showErrorToast('Update failed', response.message); return; }
      setEditBill(null); showSuccessToast('Bill updated', response.message); void loadBills();
    } catch (error: any) { showErrorToast('Update failed', error?.message); }
    finally { setSaving(false); }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const billingStats = useMemo(() => bills.reduce((stats, bill) => {
    const amount = Number(bill.total_amount) || 0;
    const paidAmount = Number(bill.paid_amount) || 0;
    stats.collected += paidAmount;
    stats.due += Math.max(0, amount - paidAmount);
    if (statusOf(bill) === 'partial') stats.partial += 1;
    return stats;
  }, { collected: 0, due: 0, partial: 0 }), [bills]);
  const setFilterStatus = (value: string) => { setStatus(value); setStatusOpen(false); };
  const renderField = (label: string, value: string, setValue: (value: string) => void, placeholder: string, keyboardType: 'default' | 'numeric' | 'decimal-pad' = 'default') => (
    <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={setValue} placeholder={placeholder} placeholderTextColor="#94A3B8" keyboardType={keyboardType} style={styles.input} /></View>
  );

  return <View style={styles.container}>
    <StaffHeader onOpenDrawer={onOpenDrawer} title="Medicine Billing" />
    {!canView ? <View style={styles.center}><FileText size={30} color="#0D9488" /><Text style={styles.title}>Medicine billing access required</Text><Text style={styles.muted}>Your role does not have permission to view medicine bills.</Text></View> : <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.bannerRow}><View style={styles.bannerTitleBlock}><View style={styles.iconBox}><Receipt color="#0D9488" size={24} /></View><View style={styles.bannerCopy}><Text style={styles.bannerTitle}>Medicine Bills</Text><Text style={styles.bannerSubtitle}>Manage bills, payments, and billing items</Text></View></View>{canAdd ? <TouchableOpacity style={styles.createBillButton} onPress={openCreate}><Plus size={18} color="#fff" strokeWidth={2.5} /><Text style={styles.createBillText}>Create Bill</Text></TouchableOpacity> : null}</View>
      <View style={styles.metricGrid}>
        <MetricCard icon={<Receipt color="#0D9488" size={20} />} iconColor="#CCFBF1" value={String(total || bills.length)} label="Total Bills" />
        <MetricCard icon={<IndianRupee color="#166534" size={20} />} iconColor="#DCFCE7" value={money(billingStats.collected)} label="Total Collected" />
        <MetricCard icon={<Clock color="#1E40AF" size={20} />} iconColor="#DBEAFE" value={String(billingStats.partial)} label="Partially Paid" />
        <MetricCard icon={<AlertCircle color="#92400E" size={20} />} iconColor="#FEF3C7" value={money(billingStats.due)} label="Outstanding Due" danger={billingStats.due > 0} />
      </View>
      <View style={styles.filters}>
        <View style={styles.searchBox}><Search size={18} color="#64748B" /><TextInput value={search} onChangeText={setSearch} placeholder="Search bill, patient, or phone..." placeholderTextColor="#94A3B8" style={styles.searchInput} /><TouchableOpacity accessibilityLabel="Clear search" onPress={() => setSearch('')}><X size={16} color="#94A3B8" /></TouchableOpacity></View>
        <View style={styles.statusWrap}><TouchableOpacity style={styles.statusButton} onPress={() => setStatusOpen(v => !v)}><Text style={styles.statusButtonText}>{status === 'all' ? 'All Status' : status.replace('_', ' ')}</Text><ChevronDown size={18} color="#64748B" /></TouchableOpacity>{statusOpen ? <View style={styles.statusMenu}>{STATUS_OPTIONS.map(option => <TouchableOpacity key={option} style={styles.option} onPress={() => setFilterStatus(option)}><Text style={styles.optionText}>{option === 'all' ? 'All Status' : option.replace('_', ' ')}</Text>{status === option ? <Check size={15} color="#0D9488" /> : null}</TouchableOpacity>)}</View> : null}</View>
        <View style={styles.dateFilter}><View style={styles.datePickerFlex}><CustomCalendarPicker selectedDate={dateFilter ? new Date(`${dateFilter}T00:00:00`) : undefined} placeholder="All dates" triggerStyle={styles.dateTrigger} triggerTextStyle={styles.dateTriggerText} iconColor="#64748B" onDateChange={date => { setDateFilter(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`); setPage(1); }} /></View>{dateFilter ? <TouchableOpacity accessibilityLabel="Clear date filter" onPress={() => setDateFilter('')}><X size={16} color="#64748B" /></TouchableOpacity> : null}</View>
        </View>
      {loading ? <View style={styles.center}><ActivityIndicator color="#0D9488" /><Text style={styles.muted}>Loading bills...</Text></View> : bills.length === 0 ? <View style={styles.empty}><FileText size={28} color="#94A3B8" /><Text style={styles.title}>No medicine bills found</Text><Text style={styles.muted}>Change filters or create a new bill.</Text></View> : <View style={styles.listCard}>
        <View style={styles.listHeader}><View style={[styles.flex, { minWidth: 140 }]}><View style={styles.listTitleRow}><Receipt size={18} color="#0F172A" /><Text style={styles.listTitle}>All Bills ({total || bills.length})</Text></View><Text style={styles.listSubtitle}>View and manage medicine bills</Text></View><View style={styles.listHeaderActions}><TouchableOpacity style={styles.headerButton} onPress={() => void loadBills()} disabled={loading}><RefreshCw size={14} color="#334155" /><Text style={styles.headerButtonText}>Refresh</Text></TouchableOpacity><TouchableOpacity style={styles.headerButton} onPress={() => setColumnsVisible(true)}><Columns size={14} color="#334155" /><Text style={styles.headerButtonText}>Columns</Text></TouchableOpacity></View></View>
        {lastRefreshed ? <View style={styles.lastRefreshed}><Text style={styles.lastRefreshedText}>Last refreshed: {lastRefreshed}</Text></View> : null}
        <View style={styles.billList}>
        {bills.map(bill => {
        const billStatus = statusOf(bill);
        const balance = Math.max(0, Number(bill.total_amount || 0) - Number(bill.paid_amount || 0));
        const statusColor = billStatus === 'paid' ? '#047857' : billStatus === 'partial' ? '#1D4ED8' : billStatus === 'cancelled' ? '#B91C1C' : '#92400E';
        return <View key={bill.id} style={styles.billCard}>
          <View style={styles.cardHeader}><View style={styles.flex}>{columns.bill_number ? <Text style={styles.billNo}>{bill.bill_number || `#${bill.id}`}</Text> : null}{columns.patient_name ? <Text style={styles.patientName}>{bill.patient_name || 'Patient'}</Text> : null}{columns.patient_code && bill.patient_code ? <Text style={styles.metaText}>{bill.patient_code}</Text> : null}</View>{columns.status ? <View style={[styles.status, billStatus === 'paid' ? styles.paid : billStatus === 'partial' ? styles.partial : billStatus === 'cancelled' ? styles.cancelled : styles.pending]}>{billStatus === 'paid' ? <Check size={13} color={statusColor} /> : billStatus === 'cancelled' ? <AlertCircle size={13} color={statusColor} /> : <Clock size={13} color={statusColor} />}<Text style={[styles.statusText, { color: statusColor }]}>{billStatus === 'partial' ? 'Partially Paid' : billStatus[0].toUpperCase() + billStatus.slice(1)}</Text></View> : null}</View>
          <View style={styles.cardGrid}>{columns.total_amount ? <BillMetric label="Total" value={money(bill.total_amount)} /> : null}{columns.phone && bill.patient_phone ? <BillMetric label="Phone" value={bill.patient_phone} /> : null}{columns.paid_amount ? <BillMetric label="Paid" value={money(bill.paid_amount)} valueColor="#166534" /> : null}{columns.pending_amount ? <BillMetric label="Due" value={money(balance)} valueColor="#DC2626" /> : null}</View>
          <View style={styles.cardBottom}><View style={styles.cardMeta}>{columns.created_at ? <Text style={styles.bottomMeta}>{dateLabel(bill.created_at)}</Text> : null}{columns.payment_method ? <Text style={styles.bottomMeta}>{bill.payment_method || 'Payment not recorded'}</Text> : null}{columns.doctor_name && bill.doctor_name ? <Text style={styles.bottomMeta}>Dr. {bill.doctor_name}</Text> : null}{columns.appointment_id && bill.appointment_id ? <Text style={styles.bottomMeta}>Appointment #{bill.appointment_id}</Text> : null}</View><View style={styles.cardActions}><TouchableOpacity style={styles.viewAction} onPress={() => void openView(bill)}><Eye size={17} color="#0D9488" /></TouchableOpacity><TouchableOpacity style={styles.moreAction} onPress={() => setActionMenuBill(current => current?.id === bill.id ? null : bill)}><MoreVertical size={17} color="#475569" /></TouchableOpacity></View></View>
          {actionMenuBill?.id === bill.id ? <View style={styles.actionMenu}>{canExecute && billStatus !== 'paid' && billStatus !== 'cancelled' ? <TouchableOpacity style={styles.menuAction} onPress={() => { setActionMenuBill(null); setPaymentBill(bill); setPaymentInput(balance.toFixed(2)); }}><Check size={15} color="#0F766E" /><Text style={styles.menuActionText}>Record payment</Text></TouchableOpacity> : null}{canEdit && billStatus !== 'cancelled' ? <TouchableOpacity style={styles.menuAction} onPress={() => { setActionMenuBill(null); setEditBill(bill); setEditDiscount(String(bill.discount_amount || 0)); setEditTax(String(bill.tax_amount || 0)); setEditPaid(String(bill.paid_amount || 0)); setEditMethod(bill.payment_method || 'cash'); }}><MoreVertical size={15} color="#334155" /><Text style={styles.menuActionText}>Edit bill</Text></TouchableOpacity> : null}{canDelete && billStatus !== 'cancelled' ? <TouchableOpacity style={styles.menuAction} onPress={() => { setActionMenuBill(null); cancelBill(bill); }}><Trash2 size={15} color="#DC2626" /><Text style={[styles.menuActionText, styles.danger]}>Cancel bill</Text></TouchableOpacity> : null}<TouchableOpacity style={styles.menuAction} onPress={() => { setActionMenuBill(null); void downloadPdf(bill); }}><Download size={15} color="#334155" /><Text style={styles.menuActionText}>Download PDF</Text></TouchableOpacity></View> : null}
        </View>;
        })}
        </View>
      </View>}
      {total > 0 ? <Pagination currentPage={page} totalPages={totalPages} totalItems={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} /> : null}
    </ScrollView>}

    <ColumnSelectorModal visible={columnsVisible} onClose={() => setColumnsVisible(false)} columns={COLUMNS} visibleColumns={columns} onToggleColumn={key => setColumns(v => ({ ...v, [key]: !v[key] }))} onReset={() => setColumns(DEFAULT_COLUMNS)} title="Bill columns" subtitle="Choose the details shown on bill cards" />

    <Modal visible={formVisible} transparent animationType="slide" onRequestClose={() => setFormVisible(false)}><View style={styles.modalBackdrop}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalShell}><View style={styles.modalCard}><ModalHeader title="Create Medicine Bill" onClose={() => setFormVisible(false)} /><ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
      <View style={styles.field}><Text style={styles.label}>Patient *</Text>{selectedPatient ? <TouchableOpacity style={styles.selectedPatient} onPress={() => { setSelectedPatient(null); setPrescriptionId(''); setPatientSearch(''); }}><View style={styles.flex}><Text style={styles.patientName}>{selectedPatient.full_name}</Text><Text style={styles.muted}>{selectedPatient.patient_code || ''} {selectedPatient.phone || ''}</Text></View><X size={16} color="#64748B" /></TouchableOpacity> : <TextInput value={patientSearch} onChangeText={setPatientSearch} placeholder="Search patient by name, code or phone" style={styles.input} />}{patients.map(patient => <TouchableOpacity key={patient.id} style={styles.suggestion} onPress={() => { setSelectedPatient(patient); setPrescriptionId(''); setPatients([]); }}><Text style={styles.optionText}>{patient.full_name}</Text><Text style={styles.muted}>{patient.patient_code || ''} \u00B7 {patient.phone || ''}</Text></TouchableOpacity>)}</View>
      <View style={styles.field}><Text style={styles.label}>Prescription (optional)</Text><TouchableOpacity style={styles.filterButton} onPress={() => setPrescriptionOpen(value => !value)}><Text numberOfLines={1} style={styles.filterText}>{prescriptionId ? `Prescription #${prescriptionId}` : selectedPatient ? 'Link a prescription' : 'Choose a patient first'}</Text><ChevronDown size={15} color="#64748B" /></TouchableOpacity>{prescriptionOpen ? <View style={styles.inlineOptions}><TouchableOpacity style={styles.option} onPress={() => { setPrescriptionId(''); setPrescriptionOpen(false); }}><Text style={styles.optionText}>No prescription</Text></TouchableOpacity>{prescriptionOptions.map(rx => <TouchableOpacity key={rx.id} style={styles.option} onPress={() => { setPrescriptionId(String(rx.id)); setPrescriptionOpen(false); }}><Text style={styles.optionText}>#{rx.id} \u00B7 {rx.diagnosis || rx.created_at || 'Prescription'}</Text></TouchableOpacity>)}</View> : null}</View>
      <View style={styles.field}><Text style={styles.label}>Add medicine *</Text><TextInput value={medicineSearch} onChangeText={setMedicineSearch} placeholder="Search medicine name" style={styles.input} />{medicineResults.map(medicine => <TouchableOpacity key={medicine.id} style={styles.suggestion} onPress={() => addMedicine(medicine)}><Text style={styles.optionText}>{medicine.name}</Text><Text style={styles.muted}>Stock {medicine.stock_quantity} \u00B7 {money(medicine.selling_price || medicine.unit_price)}</Text></TouchableOpacity>)}</View>
      {items.map(item => <View key={item.medicine_id} style={styles.lineCard}><View style={styles.lineHeader}><Text style={styles.optionText}>{item.medicine_name}</Text><TouchableOpacity onPress={() => setItems(prev => prev.filter(line => line.medicine_id !== item.medicine_id))}><X size={16} color="#DC2626" /></TouchableOpacity></View><View style={styles.lineInputs}><TextInput value={String(item.quantity)} onChangeText={value => updateLine(item.medicine_id, 'quantity', value)} keyboardType="numeric" style={[styles.input, styles.lineInput]} placeholder="Qty" /><TextInput value={String(item.discount_pct)} onChangeText={value => updateLine(item.medicine_id, 'discount_pct', value)} keyboardType="decimal-pad" style={[styles.input, styles.lineInput]} placeholder="Discount %" /><Text style={styles.amount}>{money(lineTotal(item))}</Text></View></View>)}
      {renderField('Bill discount (\u20B9)', discount, setDiscount, '0', 'decimal-pad')}
      <View style={styles.field}><Text style={styles.label}>Payment method</Text><View style={styles.filterRow}>{['cash', 'upi', 'card', 'net_banking'].map(method => <TouchableOpacity key={method} style={[styles.methodButton, paymentMethod === method && styles.methodActive]} onPress={() => setPaymentMethod(method)}><Text style={[styles.optionText, paymentMethod === method && styles.methodActiveText]}>{method.replace('_', ' ')}</Text></TouchableOpacity>)}</View></View>
      {renderField('Paid amount (\u20B9)', paid, setPaid, '0', 'decimal-pad')}
      {renderField('Notes', notes, setNotes, 'Optional notes')}
      <View style={styles.totalsBox}><Info label="Subtotal" value={money(totals.subtotal)} /><Info label="Item discount" value={money(totals.discountAmount)} /><Info label="Tax" value={money(totals.taxAmount)} /><Info label="Bill total" value={money(totals.totalAmount)} bold /></View>
    </ScrollView><View style={styles.modalFooter}><TouchableOpacity style={styles.secondaryButton} onPress={() => setFormVisible(false)}><Text style={styles.secondaryText}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={saving} style={[styles.primaryButton, saving && styles.disabled]} onPress={() => void createBill()}>{saving ? <ActivityIndicator color="#fff" size="small" /> : null}<Text style={styles.primaryText}>Create Bill</Text></TouchableOpacity></View></View></KeyboardAvoidingView></View></Modal>

    <Modal visible={viewVisible} transparent animationType="fade" onRequestClose={() => setViewVisible(false)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><ModalHeader title="Medicine Bill Details" onClose={() => setViewVisible(false)} /><ScrollView contentContainerStyle={styles.modalContent}>{viewedBill ? <><Text style={styles.billNo}>{viewedBill.bill_number || `#${viewedBill.id}`}</Text><Text style={styles.patientName}>{viewedBill.patient_name || 'Patient'} \u00B7 {viewedBill.patient_code || ''}</Text><Text style={styles.muted}>{dateLabel(viewedBill.created_at)} \u00B7 {statusOf(viewedBill).toUpperCase()}</Text>{(viewedBill.items || []).map((item, index) => <View key={index} style={styles.detailRow}><Text style={styles.optionText}>{item.medicine_name} \u00D7 {item.quantity}</Text><Text style={styles.optionText}>{money(item.total_price)}</Text></View>)}<View style={styles.totalsBox}><Info label="Subtotal" value={money(viewedBill.subtotal)} /><Info label="Discount" value={money(viewedBill.discount_amount)} /><Info label="Tax" value={money(viewedBill.tax_amount)} /><Info label="Total" value={money(viewedBill.total_amount)} bold /><Info label="Paid" value={money(viewedBill.paid_amount)} /><Info label="Balance" value={money(Number(viewedBill.total_amount) - Number(viewedBill.paid_amount))} bold /></View></> : null}</ScrollView><View style={styles.modalFooter}><TouchableOpacity style={styles.secondaryButton} onPress={() => setViewVisible(false)}><Text style={styles.secondaryText}>Close</Text></TouchableOpacity>{viewedBill ? <TouchableOpacity style={styles.primaryButton} onPress={() => void downloadPdf(viewedBill)}><Download size={15} color="#fff" /><Text style={styles.primaryText}>Download PDF</Text></TouchableOpacity> : null}</View></View></View></Modal>

    <Modal visible={Boolean(paymentBill)} transparent animationType="fade" onRequestClose={() => setPaymentBill(null)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><ModalHeader title="Record Payment" onClose={() => setPaymentBill(null)} /><View style={styles.modalContent}>{paymentBill ? <Text style={styles.muted}>Balance due: {money(Number(paymentBill.total_amount) - Number(paymentBill.paid_amount))}</Text> : null}{renderField('Payment amount (\u20B9)', paymentInput, setPaymentInput, 'Enter amount', 'decimal-pad')}</View><View style={styles.modalFooter}><TouchableOpacity style={styles.secondaryButton} onPress={() => setPaymentBill(null)}><Text style={styles.secondaryText}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={saving} style={styles.primaryButton} onPress={() => void recordPayment()}><Text style={styles.primaryText}>Save Payment</Text></TouchableOpacity></View></View></View></Modal>

    <Modal visible={Boolean(editBill)} transparent animationType="fade" onRequestClose={() => setEditBill(null)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><ModalHeader title="Edit Bill" onClose={() => setEditBill(null)} /><View style={styles.modalContent}>{renderField('Discount amount (\u20B9)', editDiscount, setEditDiscount, '0', 'decimal-pad')}{renderField('Tax amount (\u20B9)', editTax, setEditTax, '0', 'decimal-pad')}{renderField('Paid amount (\u20B9)', editPaid, setEditPaid, '0', 'decimal-pad')}<Text style={styles.label}>Payment method</Text><View style={styles.filterRow}>{['cash', 'upi', 'card', 'net_banking'].map(method => <TouchableOpacity key={method} style={[styles.methodButton, editMethod === method && styles.methodActive]} onPress={() => setEditMethod(method)}><Text style={[styles.optionText, editMethod === method && styles.methodActiveText]}>{method.replace('_', ' ')}</Text></TouchableOpacity>)}</View></View><View style={styles.modalFooter}><TouchableOpacity style={styles.secondaryButton} onPress={() => setEditBill(null)}><Text style={styles.secondaryText}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={saving} style={styles.primaryButton} onPress={() => void saveEdit()}><Text style={styles.primaryText}>Update Bill</Text></TouchableOpacity></View></View></View></Modal>
  </View>;
};

function MetricCard({ icon, iconColor, value, label, danger = false }: { icon: React.ReactNode; iconColor: string; value: string; label: string; danger?: boolean }) { return <View style={styles.metricCard}><View style={[styles.metricIcon, { backgroundColor: iconColor }]}>{icon}</View><View style={styles.metricCopy}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.metricNumber, danger && { color: '#DC2626' }]}>{value}</Text><Text numberOfLines={1} style={styles.metricCaption}>{label}</Text></View></View>; }
function BillMetric({ label, value, valueColor = '#0F172A' }: { label: string; value: string; valueColor?: string }) { return <View style={styles.gridMetric}><Text style={styles.metricLabel}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.metricValue, { color: valueColor }]}>{value}</Text></View>; }
function Info({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) { return <View style={styles.info}><Text style={styles.muted}>{label}</Text><Text style={[styles.optionText, bold && styles.bold]}>{value}</Text></View>; }
function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) { return <View style={styles.modalHeader}><View style={styles.flex}><Text style={styles.modalTitle}>{title}</Text></View><TouchableOpacity onPress={onClose} style={styles.close}><X size={18} color="#475569" /></TouchableOpacity></View>; }

const styles = StyleSheet.create({
  bannerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, gap: 10 },
  bannerTitleBlock: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  bannerCopy: { marginLeft: 12, flex: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#E6F4F1', alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  bannerSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  createBillButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D9488', paddingHorizontal: 12, minHeight: 40, borderRadius: 8, justifyContent: 'center', gap: 4 },
  createBillText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 4 },
  metricCard: { width: '48.5%', minHeight: 74, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 10, marginBottom: 10 },
  metricIcon: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricCopy: { flex: 1, minWidth: 0, marginLeft: 9 },
  metricNumber: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  metricCaption: { fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 1 },
  statusWrap: { position: 'relative', zIndex: 15 },
  statusButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 14 },
  statusButtonText: { fontSize: 14, color: '#334155', fontWeight: '600', textTransform: 'capitalize' },
  statusMenu: { position: 'absolute', top: 47, left: 0, right: 0, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 9, elevation: 8, zIndex: 20 },
  datePickerFlex: { flex: 1, minWidth: 0 },
  listTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  listSubtitle: { fontSize: 12, color: '#64748B', marginTop: 3 },
  listHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerButton: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 9, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#FFFFFF' },
  headerButtonText: { color: '#334155', fontSize: 11, fontWeight: '700' },
  lastRefreshed: { paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'flex-end' },
  lastRefreshedText: { color: '#94A3B8', fontSize: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F1F5F9', paddingVertical: 10, marginVertical: 10, rowGap: 10 },
  gridCol: { width: '50%', paddingRight: 7 },
  gridLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', letterSpacing: 0.5 },
  gridValue: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 3 },
  gridPhone: { fontSize: 14, color: '#0F172A', marginTop: 3 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardMeta: { flex: 1 },
  bottomMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  viewAction: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#99F6E4', backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center' },
  moreAction: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  actionMenu: { position: 'absolute', right: 6, bottom: 48, minWidth: 170, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 9, elevation: 10, zIndex: 20, overflow: 'hidden' },
  menuAction: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 11, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuActionText: { color: '#334155', fontSize: 12, fontWeight: '600' },
  partial: { backgroundColor: '#DBEAFE' },
  listCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', marginBottom: 20 },
  listHeader: { minHeight: 62, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  listTitle: { color: '#0F172A', fontSize: 16, fontWeight: '700' },
  refreshButton: { minHeight: 32, paddingHorizontal: 10, justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 7, backgroundColor: '#FFFFFF' },
  refreshText: { color: '#334155', fontSize: 11, fontWeight: '700' },
  billList: { padding: 12, gap: 12 },
  gridMetric: { flex: 1, minWidth: 105 },
  metricLabel: { color: '#64748B', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  metricValue: { color: '#0F172A', fontSize: 13, fontWeight: '700', marginTop: 3 },
  container: { flex: 1, backgroundColor: '#F8FAFC' }, content: { padding: 16, paddingBottom: 90, gap: 12 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 10 }, flex: { flex: 1, minWidth: 0 }, title: { color: '#0F172A', fontSize: 17, fontWeight: '800' }, muted: { color: '#64748B', fontSize: 11 }, primaryButton: { minHeight: 40, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#0D9488', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, primaryText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' }, secondaryButton: { minHeight: 40, flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: '#334155', fontSize: 12, fontWeight: '700' }, filters: { width: '100%', gap: 10, padding: 0, borderWidth: 0, backgroundColor: 'transparent' }, searchBox: { width: '100%', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#FFFFFF' }, searchInput: { flex: 1, color: '#1E293B', fontSize: 12, paddingVertical: 7 }, filterRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 }, filterWrap: { flex: 1, minWidth: 120, position: 'relative', zIndex: 4 }, filterButton: { minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC' }, filterText: { color: '#334155', fontSize: 11, textTransform: 'capitalize' }, inlineOptions: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#FFFFFF' }, popover: { position: 'absolute', top: 43, left: 0, right: 0, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, elevation: 8 }, option: { minHeight: 37, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }, optionText: { color: '#1E293B', fontSize: 12 }, columnsButton: { minHeight: 39, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10 }, columnsText: { color: '#334155', fontWeight: '700', fontSize: 11 }, dateFilter: { width: '100%', flex: 0, minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 5 }, dateTrigger: { flex: 1, minHeight: 39, justifyContent: 'center', paddingHorizontal: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC' }, dateTriggerText: { color: '#334155', fontSize: 11 }, billCard: { position: 'relative', padding: 14, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#FFFFFF', gap: 9 }, billNo: { color: '#0F172A', fontSize: 14, fontWeight: '700' }, patientName: { marginTop: 2, color: '#475569', fontSize: 13 }, amount: { color: '#0F172A', fontSize: 15, fontWeight: '800' }, metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, metaText: { color: '#64748B', fontSize: 10 }, billStats: { flexDirection: 'row', alignItems: 'center', gap: 8 }, status: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 14 }, paid: { backgroundColor: '#DCFCE7' }, pending: { backgroundColor: '#FEF3C7' }, cancelled: { backgroundColor: '#FEE2E2' }, statusText: { color: '#334155', fontSize: 10, fontWeight: '700' }, itemPreview: { padding: 9, gap: 4, borderRadius: 9, backgroundColor: '#F8FAFC' }, itemText: { color: '#334155', fontSize: 11 }, actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 2 }, action: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#FFFFFF' }, actionText: { color: '#334155', fontSize: 10, fontWeight: '700' }, danger: { color: '#DC2626' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 9, padding: 24 }, empty: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, backgroundColor: '#FFFFFF' }, modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 14, backgroundColor: 'rgba(15,23,42,0.58)' }, modalShell: { width: '100%', maxWidth: 520, maxHeight: '94%' }, modalCard: { maxHeight: '100%', overflow: 'hidden', borderTopWidth: 3, borderTopColor: '#14B8A6', borderRadius: 16, backgroundColor: '#FFFFFF' }, modalHeader: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: 1, borderColor: '#E2E8F0' }, modalTitle: { color: '#1E293B', fontSize: 15, fontWeight: '800' }, close: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }, modalScroll: { flexShrink: 1, maxHeight: 600 }, modalContent: { gap: 12, padding: 14 }, modalFooter: { flexDirection: 'row', gap: 9, padding: 12, borderTopWidth: 1, borderColor: '#E2E8F0' }, field: { gap: 5 }, label: { color: '#334155', fontSize: 11, fontWeight: '700' }, input: { minHeight: 41, paddingHorizontal: 10, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, backgroundColor: '#FFFFFF', color: '#1E293B', fontSize: 12 }, selectedPatient: { minHeight: 51, flexDirection: 'row', alignItems: 'center', padding: 9, borderRadius: 10, backgroundColor: '#F0FDFA' }, suggestion: { padding: 9, borderBottomWidth: 1, borderColor: '#E2E8F0' }, lineCard: { gap: 8, padding: 9, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10 }, lineHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, lineInputs: { flexDirection: 'row', alignItems: 'center', gap: 7 }, lineInput: { flex: 1 }, methodButton: { minHeight: 34, paddingHorizontal: 10, justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 9 }, methodActive: { borderColor: '#0D9488', backgroundColor: '#CCFBF1' }, methodActiveText: { color: '#0F766E', fontWeight: '800' }, totalsBox: { gap: 9, padding: 11, borderRadius: 10, backgroundColor: '#F8FAFC' }, info: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, bold: { fontWeight: '800' }, detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderColor: '#E2E8F0' }, disabled: { opacity: 0.65 },
});

export default MedicineBillingScreen;



