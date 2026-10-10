import { AppModal } from '../../components/common/AppModal';
import { styles } from './styles/MedicineBilling.styles';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, NativeModules, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock,
  Columns,
  CreditCard,
  Download,
  Eye,
  FileText,
  MoreVertical,
  Pill,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { AppToastOverlay, AppToastNotice } from '../../components/common/AppToast';
import { Pagination } from '../../components/common/Pagination';
import { ColumnSelectorModal } from '../../components/common/ColumnSelectorModal';
import { CustomCalendarPicker } from '../../components/common/CustomCalendarPicker';
import { useAuthContext } from '../../context/AuthContext';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { fetchPatientsApi } from '../../api/patientApi';
import { searchMedicinesApi } from '../../api/medicineApi';
import { getPrescriptionByIdApi, getPrescriptionsApi } from '../../api/prescriptionApi';
import { getAppointmentsApi } from '../../api/appointmentApi';
import {
  cancelMedicineBillApi,
  getMedicineBillByIdApi,
  recordMedicineBillPaymentApi,
  createMedicineBillApi,
  updateMedicineBillApi,
} from '../../api/billingApi';
import { BASE_URL } from '../../api/apiConfig';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import { PatientModel, Medicine } from '../../types/clinicTypes';
import { useMedicineBills } from '../../hooks/useMedicineBills';
import {
  BILL_STATUS_OPTIONS as STATUS_OPTIONS,
  DEFAULT_MEDICINE_BILL_COLUMNS as DEFAULT_COLUMNS,
  formatMedicineBillDate as dateLabel,
  formatMedicineBillMoney as money,
  medicineBillLineTotal as lineTotal,
  medicineBillStatus as statusOf,
  MEDICINE_BILL_COLUMNS as COLUMNS,
  MedicineBill as Bill,
  MedicineBillLine as BillLine,
  PAGE_SIZE,
  unwrapList,
} from './billing/medicineBillingUtils';
import {
  BillMetric,
  Info,
  ModalHeader,
} from './billing/MedicineBillingComponents';

interface Props {
  onOpenDrawer: () => void;
}

const PRESCRIPTION_PAGE_SIZE = 5;
interface Props {
  onOpenDrawer: () => void;
}

export const MedicineBillingScreen: React.FC<Props> = ({ onOpenDrawer }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const {
    token,
    activeClinicId,
    activeClinicName,
    role,
    user,
    permissionsMap = {},
  } = useAuthContext();
  const canView = canUseStaffScreen(
    role,
    permissionsMap,
    'medicine_billing',
    'view',
  );
  const canAdd = canUseStaffScreen(
    role,
    permissionsMap,
    'medicine_billing',
    'add',
  );
  const canEdit = canUseStaffScreen(
    role,
    permissionsMap,
    'medicine_billing',
    'edit',
  );
  const canDelete = canUseStaffScreen(
    role,
    permissionsMap,
    'medicine_billing',
    'delete',
  );
  const canExecute = canUseStaffScreen(
    role,
    permissionsMap,
    'medicine_billing',
    'execute',
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [statusOpen, setStatusOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [columnsVisible, setColumnsVisible] = useState(false);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [actionMenuBill, setActionMenuBill] = useState<Bill | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [formEditBill, setFormEditBill] = useState<Bill | null>(null);
  const [pendingBillToast, setPendingBillToast] = useState<{ title: string; message: string } | null>(null);
  const [visibleBillingToast, setVisibleBillingToast] = useState<AppToastNotice | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<PatientModel[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientModel | null>(
    null,
  );
  const [medicineSearch, setMedicineSearch] = useState('');
  const [medicineResults, setMedicineResults] = useState<Medicine[]>([]);
  const [items, setItems] = useState<BillLine[]>([]);
  const [activeMedicineRow, setActiveMedicineRow] = useState<number | null>(null);
  const createFormScrollRef = useRef<React.ElementRef<typeof ScrollView> | null>(null);
  const medicineItemsSectionY = useRef(0);
  const [prescriptionId, setPrescriptionId] = useState('');
  const [prescriptionOptions, setPrescriptionOptions] = useState<any[]>([]);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [prescriptionPage, setPrescriptionPage] = useState(1);
  const [prescriptionTotal, setPrescriptionTotal] = useState(0);
  const [appliedPrescriptionId, setAppliedPrescriptionId] = useState<number | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [prescriptionAppointmentFilterId, setPrescriptionAppointmentFilterId] = useState('');
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [medicineSearchOpen, setMedicineSearchOpen] = useState(false);
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(false);
  const [statusOptionsOpen, setStatusOptionsOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [subtotalInput, setSubtotalInput] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('0');
  const [totalAmountInput, setTotalAmountInput] = useState('0');
  const [paid, setPaid] = useState('0');
  const [billStatus, setBillStatus] = useState('pending');
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

  const showBillingToast = (notice: AppToastNotice) => {
    setVisibleBillingToast(notice);
    setTimeout(() => {
      setVisibleBillingToast(current => current === notice ? null : current);
    }, 3500);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  const {
    bills,
    total,
    loading,
    error: billsError,
    lastRefreshed,
    refresh: loadBills,
  } = useMedicineBills<Bill>({
    token,
    clinicId: activeClinicId,
    canView,
    search: debouncedSearch,
    status,
    date: dateFilter || undefined,
    page,
    pageSize,
  });
  useEffect(() => {
    if (billsError) showErrorToast('Could not load bills', billsError);
  }, [billsError]);
  useEffect(() => {
    setPage(1);
  }, [activeClinicId, debouncedSearch, status, dateFilter]);

  useEffect(() => {
    if (!token || !activeClinicId || !patientSearch.trim() || selectedPatient) {
      setPatients([]);
      return;
    }
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        const response = await fetchPatientsApi(
          {
            clinic_id: activeClinicId,
            search: patientSearch.trim(),
            page: 1,
            limit: 8,
            is_active: 1,
          },
          token,
        );
        if (alive && response.success)
          setPatients(unwrapList<PatientModel>(response.data));
      } catch {
        if (alive) setPatients([]);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [activeClinicId, patientSearch, selectedPatient, token]);

  useEffect(() => {
    if (!token || !selectedPatient || !activeClinicId) {
      setPrescriptionOptions([]);
      setPrescriptionTotal(0);
      setPrescriptionLoading(false);
      return;
    }
    let alive = true;
    setPrescriptionLoading(true);
    getPrescriptionsApi(token, {
      patient_id: selectedPatient.id,
      clinic_id: activeClinicId,
      appointment_id: prescriptionAppointmentFilterId || undefined,
      page: prescriptionPage,
      limit: PRESCRIPTION_PAGE_SIZE,
    })
      .then(async response => {
        if (alive && response.success) {
          const responseData: any = response.data;
          const rows = unwrapList<any>(responseData?.prescriptions ?? responseData);
          if (alive) setPrescriptionTotal(Number(responseData?.total ?? responseData?.data?.total ?? rows.length));
          const detailed = await Promise.all(rows.map(async row => {
            try {
              const detail = await getPrescriptionByIdApi(token, Number(row.id));
              const prescription: any = (detail.data as any)?.prescription ?? detail.data;
              if (!detail.success || !prescription) return row;
              const priceByMedicine = new Map<string, number>();
              (row.medicines || []).forEach((medicine: any) => {
                const key = medicine.medicine_id != null ? `id:${medicine.medicine_id}` : `name:${String(medicine.medicine_name || '').toLowerCase()}`;
                priceByMedicine.set(key, Number(medicine.unit_price || 0));
              });
              return {
                ...prescription,
                appointment_id: prescription.appointment_id ?? row.appointment_id,
                appointment_date: prescription.appointment_date ?? row.appointment_date,
                appointment_time: prescription.appointment_time ?? row.appointment_time,
                items: (prescription.items || []).map((item: any) => {
                  const byId = item.medicine_id != null ? priceByMedicine.get(`id:${item.medicine_id}`) : undefined;
                  const byName = priceByMedicine.get(`name:${String(item.medicine_name || '').toLowerCase()}`);
                  return { ...item, unit_price: Number(byId ?? byName ?? item.unit_price ?? 0) };
                }),
              };
            } catch { return row; }
          }));
          if (alive) setPrescriptionOptions(detailed);
        }
      })
      .catch(() => {
        if (alive) {
          setPrescriptionOptions([]);
          setPrescriptionTotal(0);
        }
      })
      .finally(() => { if (alive) setPrescriptionLoading(false); });
    return () => {
      alive = false;
    };
  }, [activeClinicId, prescriptionAppointmentFilterId, prescriptionPage, selectedPatient, token]);

  useEffect(() => {
    if (!token || !selectedPatient || !activeClinicId) {
      setAppointments([]);
      return;
    }
    let alive = true;
    const query = new URLSearchParams({
      patient_id: String(selectedPatient.id), status: 'complete', limit: '100', page: '1',
      clinic_id: String(activeClinicId),
    });
    getAppointmentsApi(token, query.toString())
      .then(response => {
        if (alive && response.success) setAppointments(unwrapList<any>(response.data));
      })
      .catch(() => { if (alive) setAppointments([]); });
    return () => { alive = false; };
  }, [activeClinicId, selectedPatient, token]);

  useEffect(() => {
    if (!token || !medicineSearch.trim()) {
      setMedicineResults([]);
      return;
    }
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        const response = await searchMedicinesApi(
          token,
          medicineSearch.trim(),
          activeClinicId,
        );
        if (alive && response.success)
          setMedicineResults(unwrapList<Medicine>(response.data));
      } catch {
        if (alive) setMedicineResults([]);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [activeClinicId, medicineSearch, token]);

  const totals = useMemo(() => ({
    subtotal: Math.max(0, Number(subtotalInput) || 0),
    discountAmount: Math.max(0, Number(discount) || 0),
    taxAmount: Math.max(0, Number(tax) || 0),
    totalAmount: Math.max(0, Number(totalAmountInput) || 0),
  }), [discount, subtotalInput, tax, totalAmountInput]);
  const filteredAppointments = useMemo(() => {
    if (selectedAppointment && String(selectedAppointment.id) &&
      appointmentSearch.includes(`Appt ID: ${selectedAppointment.id}`)) {
      return appointments.filter(appointment => String(appointment.id) === String(selectedAppointment.id));
    }
    const query = appointmentSearch.trim().toLowerCase().replace(/\s*\|\s*appt id:.*$/, '');
    if (!query) return appointments;
    return appointments.filter(appointment =>
      `${appointment.id} ${appointment.appointment_date || ''} ${appointment.appointment_time || ''}`
        .toLowerCase().includes(query),
    );
  }, [appointmentSearch, appointments, selectedAppointment]);
  const prescriptionTotalPages = Math.max(1, Math.ceil(prescriptionTotal / PRESCRIPTION_PAGE_SIZE));

  useEffect(() => {
    const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
    const total = Math.max(0, subtotal - (Number(discount) || 0) + (Number(tax) || 0));
    setSubtotalInput(String(subtotal));
    setTotalAmountInput(String(total));
  }, [discount, items, tax]);

  const resetForm = () => {
    setFormEditBill(null);
    setSelectedPatient(null);
    setPatientSearch('');
    setPatients([]);
    setMedicineSearch('');
    setMedicineResults([]);
    setItems([]);
    setPrescriptionId('');
    setPrescriptionOptions([]);
    setPrescriptionLoading(false);
    setPrescriptionPage(1);
    setPrescriptionTotal(0);
    setAppliedPrescriptionId(null);
    setAppointments([]);
    setSelectedAppointment(null);
    setPrescriptionAppointmentFilterId('');
    setAppointmentOpen(false);
    setAppointmentSearch('');
    setPrescriptionPage(1);
    setMedicineSearchOpen(false);
    setActiveMedicineRow(null);
    setPaymentMethodOpen(false);
    setStatusOptionsOpen(false);
    setPaymentMethod('cash');
    setSubtotalInput('0');
    setDiscount('0');
    setTax('0');
    setTotalAmountInput('0');
    setPaid('0');
    setBillStatus('pending');
    setNotes('');
  };
  const closeBillForm = () => {
    setFormVisible(false);
    resetForm();
  };
  const resetPatientDependencies = () => {
    setSelectedPatient(null);
    setPrescriptionId('');
    setPrescriptionOptions([]);
    setPrescriptionPage(1);
    setPrescriptionTotal(0);
    setItems([]);
    setMedicineSearch('');
    setMedicineResults([]);
    setMedicineSearchOpen(false);
    setActiveMedicineRow(null);
    setAppliedPrescriptionId(null);
    setAppointments([]);
    setSelectedAppointment(null);
    setPrescriptionAppointmentFilterId('');
    setAppointmentOpen(false);
    setAppointmentSearch('');
  };
  const formatAppointmentInput = (appointment: any) => {
    const dateTime = [appointment?.appointment_date || '-', appointment?.appointment_time]
      .filter(Boolean)
      .join(' ');
    return `${dateTime} | Appt ID: ${appointment?.id}`;
  };
  const applyPrescription = async (prescription: any) => {
    const prescriptionItems = Array.isArray(prescription?.items) ? prescription.items : [];
    const resolvedItems: BillLine[] = await Promise.all(prescriptionItems.map(async (item: any) => {
      const quantity = Number(item.quantity || 0);
      let unitPrice = Number(item.unit_price || 0);
      if (!unitPrice && item.medicine_id) {
        try {
          const response = await fetch(`${BASE_URL}/medicines/${encodeURIComponent(String(item.medicine_id))}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const result = await response.json();
            const medicine = result?.data?.medicine ?? result?.data;
            unitPrice = Number(medicine?.unit_price || medicine?.selling_price || 0);
          }
        } catch { /* retain zero when the price lookup is unavailable */ }
      }
      return {
        medicine_id: Number(item.medicine_id || 0),
        medicine_name: String(item.medicine_name || ''),
        quantity,
        unit_price: unitPrice,
        discount_pct: 0,
        tax_pct: 0,
        total_price: quantity * unitPrice,
      };
    }));
    const mapped = resolvedItems.filter(
      item => Boolean(item.medicine_name) && item.quantity > 0,
    );
    setPrescriptionId(String(prescription.id));
    setItems(mapped);
    setAppliedPrescriptionId(Number(prescription.id));
    if (prescription.appointment_id) {
      const linkedAppointment = appointments.find(
        appointment => String(appointment.id) === String(prescription.appointment_id),
      );
      const prescriptionAppointment = linkedAppointment || {
        id: prescription.appointment_id,
        appointment_date: prescription.appointment_date,
        appointment_time: prescription.appointment_time,
        patient_id: selectedPatient?.id,
        status: 'complete',
      };
      if (!linkedAppointment) setAppointments(previous => [prescriptionAppointment, ...previous]);
      setSelectedAppointment(prescriptionAppointment);
      setAppointmentSearch(formatAppointmentInput({
        id: prescription.appointment_id,
        appointment_date: prescription.appointment_date,
        appointment_time: prescription.appointment_time,
      }));
    }
    showSuccessToast('Prescription applied', `${mapped.length} medicine(s) added to the bill.`);
  };

  useEffect(() => {
    if (prescriptionLoading || !selectedPatient || prescriptionOptions.length === 0 || items.length > 0 || appliedPrescriptionId !== null) return;
    const first = prescriptionOptions[0];
    if (first) {
      void applyPrescription(first).catch(error => {
        showErrorToast('Could not apply prescription', error?.message || 'Please select the medicines manually.');
      });
    }
  }, [prescriptionLoading, selectedPatient, prescriptionOptions, items.length, appliedPrescriptionId]);
  const openCreate = () => {
    resetForm();
    setFormVisible(true);
  };
  const openEditForm = async (bill: Bill) => {
    if (!token) return;
    setActionMenuBill(null);
    setSaving(true);
    try {
      const response = await getMedicineBillByIdApi(token, bill.id);
      if (!response.success) {
        showErrorToast('Could not open bill', response.message);
        return;
      }
      const result: any = response.data;
      const details: any = result?.bill || result || bill;
      const patientDetails = details.patient || {};
      const patientId = Number(details.patient_id || bill.patient_id);
      const patient: PatientModel = {
        ...patientDetails,
        id: patientId,
        clinic_id: Number(details.clinic_id || activeClinicId || 0),
        full_name: String(patientDetails.full_name || details.patient_name || bill.patient_name || ''),
        phone: String(patientDetails.phone || details.patient_phone || bill.patient_phone || ''),
        gender: patientDetails.gender || 'other',
      };
      setFormEditBill(details as Bill);
      setSelectedPatient(patient);
      setPatientSearch(patient.full_name);
      setPatients([]);
      setPrescriptionId(String(details.prescription_id || ''));
      setItems((Array.isArray(details.items) ? details.items : []).map((item: any) => ({
        medicine_id: Number(item.medicine_id || 0),
        medicine_name: String(item.medicine_name || item.name || ''),
        batch_number: item.batch_number,
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.unit_price || 0),
        discount_pct: Number(item.discount_pct || 0),
        tax_pct: Number(item.tax_pct || 0),
        total_price: Number(item.total_price || 0),
      })));
      setSubtotalInput(String(Number(details.subtotal || 0)));
      setDiscount(String(Number(details.discount_amount || 0)));
      setTax(String(Number(details.tax_amount || 0)));
      setTotalAmountInput(String(Number(details.total_amount || 0)));
      setPaid(String(Number(details.paid_amount || 0)));
      setPaymentMethod(String(details.payment_method || 'cash').toLowerCase());
      setBillStatus(statusOf(details as Bill));
      setNotes(String(details.notes || ''));
      setMedicineSearch('');
      setMedicineResults([]);
      setMedicineSearchOpen(false);
      setFormVisible(true);
    } catch (error: any) {
      showErrorToast('Could not open bill', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };
  const addMedicineRow = () => {
    const rowIndex = items.length;
    setItems(prev => [...prev, {
      medicine_id: 0,
      medicine_name: '',
      quantity: 1,
      unit_price: 0,
      discount_pct: 0,
      tax_pct: 0,
      total_price: 0,
    }]);
    setActiveMedicineRow(rowIndex);
    setMedicineSearchOpen(true);
    setMedicineSearch('');
    setMedicineResults([]);
    requestAnimationFrame(() => {
      createFormScrollRef.current?.scrollTo({ y: medicineItemsSectionY.current, animated: true });
    });
  };
  const selectMedicineForRow = (rowIndex: number, medicine: Medicine) => {
    setItems(prev => prev.map((line, index) => {
      if (index !== rowIndex) return line;
      const next = {
        ...line,
        medicine_id: medicine.id,
        medicine_name: medicine.name,
        batch_number: medicine.batch_number,
        unit_price: Number(medicine.unit_price || medicine.selling_price || 0),
      };
      return { ...next, total_price: lineTotal(next) };
    }));
    setMedicineSearch(medicine.name);
    setMedicineResults([]);
    setMedicineSearchOpen(false);
    setActiveMedicineRow(null);
  };
  const updateLine = (
    rowIndex: number,
    field: 'medicine_name' | 'quantity' | 'unit_price',
    value: string,
  ) => {
    const number = Math.max(0, Number(value) || 0);
    setItems(prev => prev.map((line, index) => {
      if (index !== rowIndex) return line;
      const fieldValue = field === 'medicine_name'
        ? value
        : field === 'quantity'
          ? Math.floor(number)
          : number;
      const next = { ...line, [field]: fieldValue };
      return { ...next, total_price: lineTotal(next) };
    }));
  };

  const createBill = async () => {
    if (!token || !selectedPatient || !activeClinicId) {
      showErrorToast(
        'Bill details required',
        'Choose a patient before creating the bill.',
      );
      return;
    }
    if (!formEditBill && items.some(item => !item.medicine_name.trim() || item.quantity <= 0)) {
      showErrorToast('Medicine details required', 'Choose a medicine and enter a quantity for every item.');
      return;
    }
    if (totals.totalAmount <= 0) {
      showErrorToast('Invalid bill total', 'Total amount must be greater than zero.');
      return;
    }
    const paidAmount = Number(paid) || 0;
    if (paidAmount < 0 || paidAmount > totals.totalAmount) {
      showErrorToast(
        'Invalid payment',
        'Paid amount must be between zero and the bill total.',
      );
      return;
    }
    setSaving(true);
    try {
      const response = formEditBill
        ? await updateMedicineBillApi(token, formEditBill.id, {
            discount_amount: totals.discountAmount,
            tax_amount: totals.taxAmount,
            paid_amount: paidAmount,
            payment_method: paymentMethod,
            status: billStatus,
          })
        : await createMedicineBillApi(token, {
        clinic_id: activeClinicId,
        patient_id: Number(selectedPatient.id),
        pharmacist_id: Number(user?.id) || undefined,
        prescription_id: prescriptionId ? Number(prescriptionId) : undefined,
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        tax_amount: totals.taxAmount,
        total_amount: totals.totalAmount,
        paid_amount: paidAmount,
        payment_method: paymentMethod,
        status: billStatus,
        notes,
        items: items.length > 0 ? items.map(item => ({
          ...item,
          medicine_id: item.medicine_id || null,
          total_price: lineTotal(item),
        })) : [{
          medicine_id: null,
          medicine_name: 'Consultation',
          quantity: 1,
          unit_price: totals.totalAmount,
          discount_pct: 0,
          tax_pct: 0,
          total_price: totals.totalAmount,
        }],
      });
      if (!response.success) {
        showErrorToast('Bill creation failed', response.message);
        return;
      }
      const wasEditing = Boolean(formEditBill);
      const toast = {
        title: wasEditing ? 'Bill Updated! 🎉' : 'Bill Created! 🎉',
        message: wasEditing
          ? 'Medicine bill updated successfully.'
          : response.message || 'Medicine bill created successfully.',
      };
      setPendingBillToast(toast);
      // A toast rendered by the app root is hidden behind Android's native
      // Modal window. Wait until the modal has completed its close animation.
      if (Platform.OS === 'android') {
        setTimeout(() => {
          showBillingToast(toast);
          setPendingBillToast(current => current === toast ? null : current);
        }, 1400);
      }
      setFormVisible(false);
      resetForm();
      void loadBills();
    } catch (error: any) {
      showErrorToast('Bill creation failed', error?.message);
    } finally {
      setSaving(false);
    }
  };

  const openView = async (bill: Bill) => {
    if (!token) return;
    setSaving(true);
    try {
      const response = await getMedicineBillByIdApi(token, bill.id);
      if (!response.success) {
        showErrorToast('Could not open bill', response.message);
        return;
      }
      const data: any = response.data;
      setViewedBill(data?.bill || data);
      setViewVisible(true);
    } catch (error: any) {
      showErrorToast('Could not open bill', error?.message);
    } finally {
      setSaving(false);
    }
  };
  const downloadPdf = async (bill: Bill) => {
    if (
      Platform.OS !== 'android' ||
      !NativeModules.BillPdfDownload?.downloadPdf ||
      !token
    ) {
      showErrorToast(
        'Download unavailable',
        'Bill PDF download is available on Android.',
      );
      return;
    }
    try {
      const name = `medicine-bill-${String(bill.bill_number || bill.id).replace(
        /[^a-zA-Z0-9_-]/g,
        '_',
      )}.pdf`;
      await NativeModules.BillPdfDownload.downloadPdf(
        `${BASE_URL}/medicine-bills/${bill.id}/pdf`,
        token,
        name,
      );
      showSuccessToast(
        'Download started',
        `${name} is being saved to Downloads.`,
      );
    } catch (error: any) {
      showErrorToast('Download failed', error?.message);
    }
  };
  const cancelBill = (bill: Bill) => {
    Alert.alert(
      'Cancel medicine bill?',
      `Cancel ${bill.bill_number || `#${bill.id}`}?`,
      [
        { text: 'Keep bill', style: 'cancel' },
        {
          text: 'Cancel bill',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            setSaving(true);
            try {
              const response = await cancelMedicineBillApi(token, bill.id);
              if (!response.success) {
                showErrorToast('Cancel failed', response.message);
                return;
              }
              showSuccessToast('Bill cancelled', response.message);
              loadBills();
            } catch (error: any) {
              showErrorToast('Cancel failed', error?.message);
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };
  const recordPayment = async () => {
    if (!token || !paymentBill) return;
    const amount = Number(paymentInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      showErrorToast(
        'Invalid amount',
        'Enter a payment amount greater than zero.',
      );
      return;
    }
    const newPaid = Number(paymentBill.paid_amount || 0) + amount;
    if (newPaid > Number(paymentBill.total_amount)) {
      showErrorToast(
        'Invalid amount',
        'Payment cannot exceed the balance due.',
      );
      return;
    }
    setSaving(true);
    try {
      const response = await recordMedicineBillPaymentApi(
        token,
        paymentBill.id,
        {
          paid_amount: newPaid,
          status: newPaid >= paymentBill.total_amount ? 'paid' : 'partial',
        },
      );
      if (!response.success) {
        showErrorToast('Payment failed', response.message);
        return;
      }
      setPaymentBill(null);
      setPaymentInput('');
      showSuccessToast('Payment recorded', response.message);
      loadBills();
    } catch (error: any) {
      showErrorToast('Payment failed', error?.message);
    } finally {
      setSaving(false);
    }
  };
  const saveEdit = async () => {
    if (!token || !editBill) return;
    const nextDiscount = Number(editDiscount);
    const nextTax = Number(editTax);
    const nextPaid = Number(editPaid);
    if (
      !Number.isFinite(nextDiscount) ||
      nextDiscount < 0 ||
      !Number.isFinite(nextTax) ||
      nextTax < 0 ||
      !Number.isFinite(nextPaid) ||
      nextPaid < 0
    ) {
      showErrorToast(
        'Invalid bill details',
        'Enter valid non-negative discount, tax and paid amounts.',
      );
      return;
    }
    setSaving(true);
    try {
      const response = await updateMedicineBillApi(token, editBill.id, {
        discount_amount: nextDiscount,
        tax_amount: nextTax,
        paid_amount: nextPaid,
        payment_method: editMethod,
        status:
          nextPaid >= Number(editBill.total_amount)
            ? 'paid'
            : nextPaid > 0
            ? 'partial'
            : 'pending',
      } as any);
      if (!response.success) {
        showErrorToast('Update failed', response.message);
        return;
      }
      const toast = { title: 'Bill Updated! 🎉', message: 'Medicine bill updated successfully.' };
      setPendingBillToast(toast);
      if (Platform.OS === 'android') {
        setTimeout(() => {
          showBillingToast(toast);
          setPendingBillToast(current => current === toast ? null : current);
        }, 1400);
      }
      setEditBill(null);
      void loadBills();
    } catch (error: any) {
      showErrorToast('Update failed', error?.message);
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const setFilterStatus = (value: string) => {
    setStatus(value);
    setStatusOpen(false);
  };
  const renderField = (
    label: string,
    value: string,
    setValue: (value: string) => void,
    placeholder: string,
    keyboardType: 'default' | 'numeric' | 'decimal-pad' = 'default',
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        style={styles.input}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Medicine Billing" />
      {!canView ? (
        <View style={styles.center}>
          <FileText size={30} color="#0D9488" />
          <Text style={styles.title}>Medicine billing access required</Text>
          <Text style={styles.muted}>
            Your role does not have permission to view medicine bills.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.bannerRow, isMobile && styles.billingBannerMobile]}>
            <View style={styles.bannerTitleBlock}>
              <View style={[styles.iconBox, isMobile && styles.pageIconMobile]}>
                <Receipt color="#0D9488" size={24} />
              </View>
              <View style={styles.bannerCopy}>
                <Text style={[styles.bannerTitle, isMobile && styles.bannerTitleMobile]}>Medicine Bills</Text>
                <Text style={styles.bannerSubtitle}>Manage medicine bills and payments</Text>
              </View>
            </View>
            {canAdd && !isMobile ? (
              <TouchableOpacity
                style={styles.createBillButton}
                onPress={openCreate}
              >
                <Plus size={18} color="#fff" strokeWidth={2.5} />
                <Text style={styles.createBillText}>Create Bill</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {canAdd && isMobile ? (
            <TouchableOpacity style={styles.createBillButtonMobile} onPress={openCreate}>
              <Plus size={16} color="#fff" strokeWidth={2.5} />
              <Text style={styles.createBillText}>Create Bill</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.filters}>
            <View style={styles.searchBox}>
              <Search size={18} color="#64748B" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by patient ID, name, or mobile..."
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
              />
              {search.length > 0 && (
                <TouchableOpacity
                  accessibilityLabel="Clear search"
                  onPress={() => setSearch('')}
                >
                  <X size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.searchSubmitButton}
              onPress={() => {
                setPage(1);
                setDebouncedSearch(search.trim());
              }}
            >
              <Search size={15} color="#334155" />
              <Text style={styles.searchSubmitText}>Search</Text>
            </TouchableOpacity>
            {!isMobile && <View style={styles.statusWrap}>
              <TouchableOpacity
                style={styles.statusButton}
                onPress={() => setStatusOpen(v => !v)}
              >
                <Text style={styles.statusButtonText}>
                  {status === 'all' ? 'All Status' : status.replace('_', ' ')}
                </Text>
                <ChevronDown size={18} color="#64748B" />
              </TouchableOpacity>
              {statusOpen ? (
                <View style={styles.statusMenu}>
                  {STATUS_OPTIONS.map(option => (
                    <TouchableOpacity
                      key={option}
                      style={styles.option}
                      onPress={() => setFilterStatus(option)}
                    >
                      <Text style={styles.optionText}>
                        {option === 'all'
                          ? 'All Status'
                          : option.replace('_', ' ')}
                      </Text>
                      {status === option ? (
                        <Check size={15} color="#0D9488" />
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>}
            {!isMobile && <View style={styles.dateFilter}>
              <View style={styles.datePickerFlex}>
                <CustomCalendarPicker
                  selectedDate={
                    dateFilter ? new Date(`${dateFilter}T00:00:00`) : undefined
                  }
                  placeholder="All dates"
                  triggerStyle={styles.dateTrigger}
                  triggerTextStyle={styles.dateTriggerText}
                  iconColor="#64748B"
                  onDateChange={date => {
                    setDateFilter(
                      `${date.getFullYear()}-${String(
                        date.getMonth() + 1,
                      ).padStart(2, '0')}-${String(date.getDate()).padStart(
                        2,
                        '0',
                      )}`,
                    );
                    setPage(1);
                  }}
                />
              </View>
              {dateFilter ? (
                <TouchableOpacity
                  accessibilityLabel="Clear date filter"
                  onPress={() => setDateFilter('')}
                >
                  <X size={16} color="#64748B" />
                </TouchableOpacity>
              ) : null}
            </View>}
          </View>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color="#0D9488" />
              <Text style={styles.muted}>Loading bills...</Text>
            </View>
          ) : bills.length === 0 ? (
            <View style={styles.empty}>
              <FileText size={28} color="#94A3B8" />
              <Text style={styles.title}>No medicine bills found</Text>
              <Text style={styles.muted}>
                Change filters or create a new bill.
              </Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              <View style={[styles.listHeader, isMobile && styles.listHeaderMobile]}>
                <View style={[styles.flex, styles.extractedInline1]}>
                  <View style={styles.listTitleRow}>
                    <Receipt size={18} color="#0F172A" />
                    <Text style={styles.listTitle}>
                      All Bills ({total || bills.length})
                    </Text>
                  </View>
                  {!isMobile && <Text style={styles.listSubtitle}>View and manage medicine bills</Text>}
                </View>
                <View style={[styles.listHeaderActions, isMobile && styles.listHeaderActionsMobile]}>
                  {!isMobile && <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => loadBills()}
                    disabled={loading}
                  >
                    <RefreshCw size={14} color="#334155" />
                    <Text style={styles.headerButtonText}>Refresh</Text>
                  </TouchableOpacity>}
                  <TouchableOpacity
                    style={[styles.headerButton, isMobile && styles.headerButtonMobile]}
                    onPress={() => setColumnsVisible(true)}
                  >
                    <Columns size={14} color="#334155" />
                    <Text style={styles.headerButtonText}>Columns</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {lastRefreshed && !isMobile ? (
                <View style={styles.lastRefreshed}>
                  <Text style={styles.lastRefreshedText}>
                    Last refreshed: {lastRefreshed}
                  </Text>
                </View>
              ) : null}
              <View style={styles.billList}>
                {bills.map(bill => {
                  const billStatus = statusOf(bill);
                  const balance = Math.max(
                    0,
                    Number(bill.total_amount || 0) -
                      Number(bill.paid_amount || 0),
                  );
                  const statusColor =
                    billStatus === 'paid'
                      ? '#047857'
                      : billStatus === 'partial'
                      ? '#1D4ED8'
                      : billStatus === 'cancelled'
                      ? '#B91C1C'
                      : '#92400E';
                  return (
                    <View key={bill.id} style={styles.billCard}>
                      <View style={styles.cardHeader}>
                        <View style={styles.flex}>
                          {columns.bill_number ? (
                            <Text style={styles.billNo}>
                              {bill.bill_number || `#${bill.id}`}
                            </Text>
                          ) : null}
                          {columns.patient_name ? (
                            <Text style={styles.patientName}>
                              {bill.patient_name || 'Patient'}
                            </Text>
                          ) : null}
                          {columns.patient_code && bill.patient_code ? (
                            <Text style={styles.metaText}>
                              {bill.patient_code}
                            </Text>
                          ) : null}
                        </View>
                        {columns.status ? (
                          <View
                            style={[
                              styles.status,
                              billStatus === 'paid'
                                ? styles.paid
                                : billStatus === 'partial'
                                ? styles.partial
                                : billStatus === 'cancelled'
                                ? styles.cancelled
                                : styles.pending,
                            ]}
                          >
                            {billStatus === 'paid' ? (
                              <Check size={13} color={statusColor} />
                            ) : billStatus === 'cancelled' ? (
                              <AlertCircle size={13} color={statusColor} />
                            ) : (
                              <Clock size={13} color={statusColor} />
                            )}
                            <Text
                              style={[
                                styles.statusText,
                                { color: statusColor },
                              ]}
                            >
                              {billStatus.toLowerCase()}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.cardGrid}>
                        {columns.total_amount ? (
                          <BillMetric
                            label="Total"
                            value={money(bill.total_amount)}
                          />
                        ) : null}
                        {columns.phone && bill.patient_phone ? (
                          <BillMetric
                            label="Phone"
                            value={bill.patient_phone}
                          />
                        ) : null}
                        {columns.paid_amount ? (
                          <BillMetric
                            label="Paid"
                            value={money(bill.paid_amount)}
                            valueColor="#166534"
                          />
                        ) : null}
                        {columns.pending_amount ? (
                          <BillMetric
                            label="Due"
                            value={money(balance)}
                            valueColor="#DC2626"
                          />
                        ) : null}
                      </View>
                      <View style={styles.cardBottom}>
                        <View style={styles.cardMeta}>
                          {columns.created_at ? (
                            <Text style={styles.bottomMeta}>
                              {dateLabel(bill.created_at)}
                            </Text>
                          ) : null}
                          {columns.payment_method ? (
                            <Text style={styles.bottomMeta}>
                              {bill.payment_method || 'Payment not recorded'}
                            </Text>
                          ) : null}
                          {columns.doctor_name && bill.doctor_name ? (
                            <Text style={styles.bottomMeta}>
                              Dr. {bill.doctor_name}
                            </Text>
                          ) : null}
                          {columns.appointment_id && bill.appointment_id ? (
                            <Text style={styles.bottomMeta}>
                              Appointment #{bill.appointment_id}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.cardActions}>
                          <TouchableOpacity
                            style={styles.viewAction}
                            onPress={() => openView(bill)}
                          >
                            <Eye size={17} color="#0D9488" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.moreAction}
                            onPress={() =>
                              setActionMenuBill(current =>
                                current?.id === bill.id ? null : bill,
                              )
                            }
                          >
                            <MoreVertical size={17} color="#475569" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {actionMenuBill?.id === bill.id ? (
                        <View style={styles.actionMenu}>
                          {canExecute &&
                          billStatus !== 'paid' &&
                          billStatus !== 'cancelled' ? (
                            <TouchableOpacity
                              style={styles.menuAction}
                              onPress={() => {
                                setActionMenuBill(null);
                                setPaymentBill(bill);
                                setPaymentInput(balance.toFixed(2));
                              }}
                            >
                              <Check size={15} color="#0F766E" />
                              <Text style={styles.menuActionText}>
                                Record payment
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                          {canEdit && billStatus !== 'cancelled' ? (
                            <TouchableOpacity
                              style={styles.menuAction}
                              onPress={() => void openEditForm(bill)}
                            >
                              <MoreVertical size={15} color="#334155" />
                              <Text style={styles.menuActionText}>
                                Edit bill
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                          {canDelete && billStatus !== 'cancelled' ? (
                            <TouchableOpacity
                              style={styles.menuAction}
                              onPress={() => {
                                setActionMenuBill(null);
                                cancelBill(bill);
                              }}
                            >
                              <Trash2 size={15} color="#DC2626" />
                              <Text
                                style={[styles.menuActionText, styles.danger]}
                              >
                                Cancel bill
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                          <TouchableOpacity
                            style={styles.menuAction}
                            onPress={() => {
                              setActionMenuBill(null);
                              downloadPdf(bill);
                            }}
                          >
                            <Download size={15} color="#334155" />
                            <Text style={styles.menuActionText}>
                              Download PDF
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          )}
          {total > 0 ? (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={size => {
                setPageSize(size);
                setPage(1);
              }}
            />
          ) : null}
        </ScrollView>
      )}

      <ColumnSelectorModal
        visible={columnsVisible}
        onClose={() => setColumnsVisible(false)}
        columns={COLUMNS}
        visibleColumns={columns}
        onToggleColumn={key => setColumns(v => ({ ...v, [key]: !v[key] }))}
        onReset={() => setColumns(DEFAULT_COLUMNS)}
        title="Bill columns"
        subtitle="Choose the details shown on bill cards"
      />

      <AppModal
        visible={formVisible}
        transparent
        animationType="slide"
        onRequestClose={closeBillForm}
        onDismiss={() => {
          if (pendingBillToast) {
            showBillingToast(pendingBillToast);
            setPendingBillToast(null);
          }
        }}
      >
        <KeyboardAvoidingView
          style={styles.createModalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.createModalShell}>
            <View style={styles.createModalCard}>
              <View style={styles.createModalHeader}>
                <View style={styles.createHeaderIcon}><Pill size={20} color="#FFFFFF" /></View>
                <View style={styles.flex}>
                  <Text style={styles.modalTitle}>{formEditBill ? 'Edit Medicine Bill' : 'Create Medicine Bill'}</Text>
                  <Text numberOfLines={1} style={styles.muted}>{formEditBill ? 'Update bill details' : 'Enter bill details to create a new medicine bill'}</Text>
                </View>
                <TouchableOpacity onPress={closeBillForm} style={styles.close}>
                  <X size={18} color="#64748B" />
                </TouchableOpacity>
              </View>
              <ScrollView
                ref={createFormScrollRef}
                style={styles.createModalScroll}
                contentContainerStyle={styles.createModalContent}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.createSection}>
                  <View style={styles.createSectionHeader}>
                    <View style={styles.createSectionIcon}><UserRound size={15} color="#0D9488" /></View>
                    <View>
                      <Text style={styles.createSectionTitle}>Bill Information</Text>
                      <Text style={styles.createSectionSubtitle}>Select the patient and an optional completed appointment.</Text>
                    </View>
                  </View>
                  <View style={styles.field}>
                  <Text style={styles.createLabel}>Patient <Text style={styles.required}>*</Text></Text>
                  <View style={styles.createInputWrap}>
                    <UserRound size={15} color="#64748B" style={styles.inputLeadingIcon} />
                    <TextInput
                      value={patientSearch}
                      onChangeText={value => {
                        if (selectedPatient) resetPatientDependencies();
                        setPatientSearch(value);
                      }}
                      placeholder="Search patient by ID, name, or mobile..."
                      placeholderTextColor="#94A3B8"
                      style={[styles.input, styles.createInputWithIcon, patientSearch.length > 0 && styles.inputWithClear]}
                    />
                    {patientSearch.length > 0 ? <TouchableOpacity style={styles.inputClear} onPress={() => {
                      resetPatientDependencies();
                      setPatientSearch('');
                    }}><X size={15} color="#64748B" /></TouchableOpacity> : null}
                  </View>
                  {selectedPatient ? (
                    <Text style={styles.selectedPatientSummary}>
                      Selected: {selectedPatient.full_name || (selectedPatient as any).name || 'Patient'} (ID: {selectedPatient.id}){selectedPatient.phone ? ` (${selectedPatient.phone})` : ''}
                    </Text>
                  ) : null}
                  {patients.map(patient => (
                    <TouchableOpacity
                      key={patient.id}
                      style={styles.suggestion}
                      onPress={() => {
                        setSelectedPatient(patient);
                        setPatientSearch(`${patient.full_name || (patient as any).name || ''}${patient.phone ? ` (${patient.phone})` : ''}`);
                        setPrescriptionId('');
                        setPrescriptionOptions([]);
                        setItems([]);
                        setAppliedPrescriptionId(null);
                        setSelectedAppointment(null);
                        setPrescriptionAppointmentFilterId('');
                        setPrescriptionPage(1);
                        setAppointmentSearch('');
                        setPatients([]);
                      }}
                    >
                      <Text style={styles.optionText}>{patient.full_name}</Text>
                      <Text style={styles.muted}>
                        {patient.patient_code || ''} \u00B7{' '}
                        {patient.phone || ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  </View>
                  <View style={styles.field}>
                  <Text style={styles.createLabel}>Appointment <Text style={styles.createOptional}>(Optional)</Text></Text>
                  <View style={styles.createInputWrap}>
                    <TextInput
                      value={appointmentSearch}
                      onFocus={() => { if (selectedPatient) setAppointmentOpen(true); }}
                      onChangeText={value => {
                        setAppointmentSearch(value);
                        setSelectedAppointment(null);
                        if (!value.trim()) {
                          setPrescriptionAppointmentFilterId('');
                          setPrescriptionPage(1);
                        }
                        setAppointmentOpen(Boolean(selectedPatient));
                      }}
                      editable={Boolean(selectedPatient)}
                      placeholder="Type date or appointment ID"
                      placeholderTextColor="#94A3B8"
                      style={styles.input}
                    />
                    {appointmentSearch ? <TouchableOpacity style={styles.inputClear} onPress={() => {
                      setAppointmentSearch('');
                      setSelectedAppointment(null);
                      setPrescriptionAppointmentFilterId('');
                      setPrescriptionPage(1);
                      setAppointmentOpen(Boolean(selectedPatient));
                    }}><X size={15} color="#64748B" /></TouchableOpacity> : null}
                  </View>
                  {appointmentOpen ? (
                    <View style={styles.createSuggestions}>
                      {filteredAppointments.length === 0 ? (
                        <Text style={[styles.muted, { padding: 10 }]}>No completed appointment found.</Text>
                      ) : filteredAppointments.map(appointment => (
                        <TouchableOpacity key={appointment.id} style={styles.createSuggestion} onPress={() => {
                          setSelectedAppointment(appointment);
                          setAppointmentSearch(formatAppointmentInput(appointment));
                          setAppointmentOpen(false);
                          setPrescriptionAppointmentFilterId(String(appointment.id));
                          setPrescriptionPage(1);
                        }}>
                          <Text style={styles.createSuggestionTitle}>Appointment #{appointment.id}</Text>
                          <Text style={styles.createSectionSubtitle}>{appointment.appointment_date || ''} {appointment.appointment_time || ''}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                  <Text style={styles.createSectionSubtitle}>Only completed appointments are shown</Text>
                  </View>
                </View>
                <View style={styles.createSectionTint}>
                  <View style={styles.lineHeader}>
                    <View style={styles.createSectionHeaderCompact}>
                      <FileText size={15} color="#0D9488" />
                      <Text style={styles.createSectionTitle}>Prescription History</Text>
                    </View>
                    {prescriptionTotal > 0 ? <Text style={styles.prescriptionCountBadge}>{prescriptionTotal} {prescriptionTotal === 1 ? 'record' : 'records'}</Text> : null}
                  </View>
                  {!selectedPatient ? <Text style={styles.createSectionSubtitleIndented}>Select patient to view prescription history.</Text> : null}
                  {prescriptionLoading ? <ActivityIndicator color="#0D9488" /> : null}
                  {selectedPatient && !prescriptionLoading && prescriptionOptions.length === 0 ? (
                    <Text style={styles.muted}>No prescription history found.</Text>
                  ) : null}
                  {prescriptionOptions.map(rx => (
                    <View key={rx.id} style={styles.lineCard}>
                      <View style={styles.lineHeader}>
                        <Text style={styles.optionText}>Prescription #{rx.id}</Text>
                        <TouchableOpacity style={styles.methodButton} onPress={() => {
                          void applyPrescription(rx).catch(error => {
                            showErrorToast('Could not apply prescription', error?.message || 'Please try again.');
                          });
                        }}>
                          <Text style={styles.optionText}>{String(prescriptionId) === String(rx.id) ? 'Applied' : 'Use Prescription'}</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.prescriptionMeta}>Appointment Date: <Text style={styles.prescriptionMetaValue}>{rx.appointment_date ? dateLabel(rx.appointment_date) : '-'}{rx.appointment_time ? ` at ${rx.appointment_time}` : ''}</Text></Text>
                      <Text style={styles.prescriptionMeta}>Prescribed On: <Text style={styles.prescriptionMetaValue}>{rx.created_at ? dateLabel(rx.created_at) : '-'}</Text></Text>
                      <Text style={styles.prescriptionMeta}>Appointment ID: <Text style={styles.prescriptionMetaValue}>{rx.appointment_id ?? '-'}</Text></Text>
                      <Text style={styles.prescriptionBodyText}>Diagnosis: {rx.diagnosis || '-'}</Text>
                      <Text style={styles.prescriptionBodyText}>Advice: {rx.advice || '-'}</Text>
                      <Text style={styles.prescriptionMeta}>Medicines:</Text>
                      {Array.isArray(rx.items) && rx.items.length > 0 ? rx.items.map((item: any, index: number) => (
                        <View key={`${rx.id}-${index}`} style={[styles.prescriptionMedicineItem, !item.medicine_id && styles.prescriptionCustomMedicine]}>
                          <Text style={styles.prescriptionMedicineName}>{item.medicine_name || 'Medicine'}</Text>
                          {!item.medicine_id ? <Text style={styles.prescriptionCustomText}>Custom medicine - Not available on our medical store</Text> : null}
                          <Text style={styles.prescriptionMeta}>Dosage: {item.dosage || '-'} | Frequency: {item.frequency || '-'} | Duration: {item.duration || '-'}</Text>
                          <Text style={styles.prescriptionMeta}>Quantity: {item.quantity ?? '-'} | Instruction: {item.instruction || item.instructions || '-'}</Text>
                        </View>
                      )) : <Text style={styles.prescriptionBodyText}>-</Text>}
                    </View>
                  ))}
                  {prescriptionTotal > PRESCRIPTION_PAGE_SIZE ? (
                    <View style={styles.prescriptionPagination}>
                      <Text style={styles.prescriptionMeta}>
                        Showing {(prescriptionPage - 1) * PRESCRIPTION_PAGE_SIZE + 1}-{Math.min(prescriptionPage * PRESCRIPTION_PAGE_SIZE, prescriptionTotal)} of {prescriptionTotal} prescriptions
                      </Text>
                      <View style={styles.prescriptionPageControls}>
                        <TouchableOpacity
                          disabled={prescriptionPage <= 1 || prescriptionLoading}
                          style={[styles.prescriptionPageButton, (prescriptionPage <= 1 || prescriptionLoading) && styles.prescriptionPageDisabled]}
                          onPress={() => setPrescriptionPage(value => Math.max(1, value - 1))}
                        ><Text style={styles.prescriptionPageText}>Previous</Text></TouchableOpacity>
                        <Text style={styles.prescriptionMeta}>{prescriptionPage} / {prescriptionTotalPages}</Text>
                        <TouchableOpacity
                          disabled={prescriptionPage >= prescriptionTotalPages || prescriptionLoading}
                          style={[styles.prescriptionPageButton, (prescriptionPage >= prescriptionTotalPages || prescriptionLoading) && styles.prescriptionPageDisabled]}
                          onPress={() => setPrescriptionPage(value => Math.min(prescriptionTotalPages, value + 1))}
                        ><Text style={styles.prescriptionPageText}>Next</Text></TouchableOpacity>
                      </View>
                    </View>
                  ) : null}
                </View>
                <View
                  style={styles.createSection}
                  onLayout={event => { medicineItemsSectionY.current = event.nativeEvent.layout.y; }}
                >
                  <View style={styles.createSectionHeader}>
                    <View style={styles.createSectionIcon}><Pill size={15} color="#0D9488" /></View>
                    <View style={styles.flex}>
                      <Text style={styles.createSectionTitle}>Medicine Bill Items</Text>
                      <Text style={styles.createSectionSubtitle}>Add medicines manually or apply a prescription.</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.addMedicineButton} onPress={addMedicineRow}>
                    <Plus size={16} color="#0F172A" />
                    <Text style={styles.addMedicineText}>Add Medicine</Text>
                  </TouchableOpacity>
                  {items.length === 0 ? (
                    <View style={styles.emptyMedicineBox}><Text style={styles.createSectionSubtitle}>No medicines added</Text></View>
                  ) : null}
                {items.map((item, index) => (
                  <View key={`${item.medicine_id}-${item.medicine_name}-${index}`} style={styles.lineCard}>
                    <View style={styles.lineField}>
                      <Text style={styles.createLabel}>Medicine</Text>
                      <TextInput
                        value={item.medicine_name}
                        onFocus={() => {
                          setActiveMedicineRow(index);
                          setMedicineSearch(item.medicine_name);
                          setMedicineSearchOpen(true);
                        }}
                        onChangeText={value => {
                          setActiveMedicineRow(index);
                          setMedicineSearch(value);
                          setMedicineSearchOpen(true);
                          updateLine(index, 'medicine_name', value);
                        }}
                        placeholder="Search medicine by name or ID"
                        style={styles.input}
                      />
                      {medicineSearchOpen && activeMedicineRow === index && medicineResults.length > 0 ? (
                        <View style={styles.createSuggestions}>
                          {medicineResults.map(medicine => (
                            <TouchableOpacity
                              key={medicine.id}
                              style={styles.createSuggestion}
                              onPress={() => selectMedicineForRow(index, medicine)}
                            >
                              <Text style={styles.createSuggestionTitle}>{medicine.name}</Text>
                              <Text style={styles.createSectionSubtitle}>
                                Stock {medicine.stock_quantity} · {money(medicine.selling_price || medicine.unit_price)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.lineInputs}>
                      <View style={[styles.lineField, styles.lineInput]}>
                        <Text style={styles.createLabel}>Qty</Text>
                        <TextInput
                          value={item.quantity > 0 ? String(item.quantity) : ''}
                          onChangeText={value => updateLine(index, 'quantity', value)}
                          keyboardType="numeric"
                          style={styles.input}
                        />
                      </View>
                      <View style={[styles.lineField, styles.lineInput]}>
                        <Text style={styles.createLabel}>Price</Text>
                        <TextInput
                          value={String(item.unit_price)}
                          onChangeText={value => updateLine(index, 'unit_price', value)}
                          keyboardType="decimal-pad"
                          style={styles.input}
                        />
                      </View>
                    </View>
                    <View style={styles.lineTotalField}>
                      <Text style={styles.createLabel}>Total</Text>
                      <Text style={styles.lineTotalValue}>{money(lineTotal(item))}</Text>
                    </View>
                    <View style={styles.lineRemoveRow}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${item.medicine_name}`}
                        onPress={() => setItems(prev => prev.filter((_, lineIndex) => lineIndex !== index))}
                        style={styles.lineRemoveButton}
                      >
                        <X size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                </View>
                <View style={styles.createSectionTint}>
                  <View style={styles.createSectionHeader}>
                    <View style={styles.createSectionIconBlue}><CreditCard size={15} color="#2563EB" /></View>
                    <View>
                      <Text style={styles.createSectionTitle}>Amount &amp; Payment</Text>
                      <Text style={styles.createSectionSubtitle}>Review totals and record the payment details.</Text>
                    </View>
                  </View>
                {renderField('Subtotal (\u20B9)', subtotalInput, setSubtotalInput, '0', 'decimal-pad')}
                {renderField(
                  'Discount Amount (\u20B9)',
                  discount,
                  setDiscount,
                  '0',
                  'decimal-pad',
                )}
                {renderField('Tax Amount (\u20B9)', tax, setTax, '0', 'decimal-pad')}
                {renderField('Total Amount * (\u20B9)', totalAmountInput, setTotalAmountInput, '0', 'decimal-pad')}
                {renderField(
                  'Paid amount (\u20B9)',
                  paid,
                  setPaid,
                  '0',
                  'decimal-pad',
                )}
                <View style={styles.field}>
                  <Text style={styles.createLabel}>Payment Method</Text>
                  <TouchableOpacity style={styles.createSelect} onPress={() => setPaymentMethodOpen(value => !value)}>
                    <Text style={styles.createSelectText}>{paymentMethod === 'net_banking' ? 'Net Banking' : paymentMethod[0].toUpperCase() + paymentMethod.slice(1)}</Text>
                    <ChevronDown size={15} color="#94A3B8" />
                  </TouchableOpacity>
                  {paymentMethodOpen ? <View style={styles.createSelectOptions}>
                    {['cash', 'card', 'upi', 'online'].map(method => (
                      <TouchableOpacity key={method} style={styles.createSelectOption} onPress={() => {
                        setPaymentMethod(method);
                        setPaymentMethodOpen(false);
                      }}><Text style={styles.createSelectText}>{method[0].toUpperCase() + method.slice(1)}</Text></TouchableOpacity>
                    ))}
                  </View> : null}
                </View>
                <View style={styles.field}>
                  <Text style={styles.createLabel}>Status</Text>
                  <TouchableOpacity style={styles.createSelect} onPress={() => setStatusOptionsOpen(value => !value)}>
                    <Text style={styles.createSelectText}>{billStatus[0].toUpperCase() + billStatus.slice(1)}</Text>
                    <ChevronDown size={15} color="#94A3B8" />
                  </TouchableOpacity>
                  {statusOptionsOpen ? <View style={styles.createSelectOptions}>
                    {['pending', 'partial', 'paid'].map(value => (
                      <TouchableOpacity key={value} style={styles.createSelectOption} onPress={() => {
                        setBillStatus(value);
                        setStatusOptionsOpen(false);
                      }}><Text style={styles.createSelectText}>{value[0].toUpperCase() + value.slice(1)}</Text></TouchableOpacity>
                    ))}
                  </View> : null}
                </View>
                {renderField('Notes', notes, setNotes, 'Optional notes')}
                </View>
              </ScrollView>
              <View style={styles.createModalFooter}>
                <View style={styles.amountDueRow}>
                  <Text style={styles.amountDueLabel}>AMOUNT DUE</Text>
                  <Text style={styles.amountDueValue}>{money(Math.max(0, totals.totalAmount - (Number(paid) || 0)))}</Text>
                </View>
                <View style={styles.createFooterButtons}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={closeBillForm}
                >
                  <Text style={styles.secondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={saving}
                  style={[styles.primaryButton, styles.createFooterPrimary, saving && styles.disabled]}
                  onPress={() => createBill()}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : null}
                  <Text style={styles.primaryText}>{formEditBill ? 'Update Bill' : 'Create Bill'}</Text>
                </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </AppModal>

      <AppModal
        visible={viewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewVisible(false)}
      >
        <View style={[styles.modalBackdrop, isMobile && styles.invoiceModalBackdrop]}>
          <View style={[styles.modalCard, styles.invoiceModalCard, isMobile && styles.invoiceModalCardMobile]}>
            <View style={styles.invoiceHeader}>
              <View style={styles.invoiceHeaderIcon}>
                <Receipt size={19} color="#FFFFFF" />
              </View>
              <View style={styles.invoiceHeaderCopy}>
                <Text style={styles.invoiceHeaderTitle}>Medicine Invoice</Text>
                <Text style={styles.invoiceHeaderSubtitle}>
                  {viewedBill?.bill_number || `MB-${viewedBill?.id || ''}`}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close invoice"
                onPress={() => setViewVisible(false)}
                style={styles.invoiceCloseIcon}
              >
                <X size={19} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.invoiceBodyScroll}
              contentContainerStyle={styles.invoiceBodyScrollContent}
            >
              {viewedBill ? (
                <View style={styles.invoiceDocument}>
                  <View style={styles.invoiceDocumentContent}>
                    <View style={styles.invoiceTopRow}>
                      <View style={styles.invoiceClinicBlock}>
                        <Text style={styles.invoiceClinicName}>
                          {(viewedBill as any).clinic_name || activeClinicName || 'Clinic'}
                        </Text>
                        <Text style={styles.invoiceClinicTagline}>
                          PATIENT CARE & MEDICINE SERVICES
                        </Text>
                        {(viewedBill as any).clinic_address ? (
                          <Text style={styles.invoiceClinicContact}>
                            {(viewedBill as any).clinic_address}
                          </Text>
                        ) : null}
                        {[(viewedBill as any).clinic_phone, (viewedBill as any).clinic_email]
                          .filter(Boolean).length > 0 ? (
                          <Text style={styles.invoiceClinicContact}>
                            {[(viewedBill as any).clinic_phone, (viewedBill as any).clinic_email]
                              .filter(Boolean).join(' | ')}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.invoiceBillMeta}>
                        <Text style={styles.invoiceType}>MEDICINE INVOICE</Text>
                        <Text style={styles.invoiceBillNumber}>
                          {viewedBill.bill_number || `MB-${viewedBill.id}`}
                        </Text>
                        <Text style={styles.invoiceMetaText}>
                          Issued {dateLabel(viewedBill.created_at)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.invoicePatientSection}>
                      <View style={styles.invoiceMetaColumn}>
                        <Text style={styles.invoiceSectionLabel}>BILL TO</Text>
                        <Text style={styles.invoicePatientName}>
                          {viewedBill.patient_name || 'Patient'}
                        </Text>
                        {viewedBill.patient_phone ? (
                          <Text style={styles.invoiceMetaText}>
                            Phone: {viewedBill.patient_phone}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.invoiceMetaColumn}>
                        <Text style={styles.invoiceSectionLabel}>DOCTOR & APPOINTMENT</Text>
                        <Text style={styles.invoicePatientName}>
                          {viewedBill.doctor_name ? `Dr. ${viewedBill.doctor_name}` : '—'}
                        </Text>
                        {viewedBill.appointment_id ? (
                          <Text style={styles.invoiceMetaText}>
                            Appointment ID: {viewedBill.appointment_id}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.invoicePaymentBanner}>
                      <Text style={styles.invoicePaymentText}>
                        Payment Method: <Text style={styles.invoiceStrong}>
                          {(viewedBill.payment_method || 'Cash').replace(/^./, value => value.toUpperCase())}
                        </Text>
                      </Text>
                      <View style={[
                        styles.invoiceStatusPill,
                        statusOf(viewedBill) === 'paid' ? styles.invoicePaidPill : styles.invoiceDuePill,
                      ]}>
                        <Text style={styles.invoiceStatusText}>{statusOf(viewedBill).toUpperCase()}</Text>
                      </View>
                    </View>

                    <Text style={styles.invoiceSectionTitle}>MEDICINE ITEMS</Text>
                    {(viewedBill.items || []).map((item, index) => (
                      <View key={index} style={styles.invoiceItemCard}>
                        <View style={styles.invoiceItemTop}>
                          <Text style={styles.invoiceItemName}>{item.medicine_name}</Text>
                          <Text style={styles.invoiceItemTotal}>{money(item.total_price)}</Text>
                        </View>
                        {item.batch_number ? (
                          <Text style={styles.invoiceItemCode}>Batch: {item.batch_number}</Text>
                        ) : null}
                        <View style={styles.invoiceItemMeta}>
                          <View style={styles.invoiceMetaColumn}>
                            <Text style={styles.invoiceItemCode}>Qty</Text>
                            <Text style={styles.invoiceItemValue}>{item.quantity}</Text>
                          </View>
                          <View style={styles.invoiceMetaColumn}>
                            <Text style={styles.invoiceItemCode}>Rate</Text>
                            <Text style={styles.invoiceItemValue}>{money(item.unit_price)}</Text>
                          </View>
                          <View style={styles.invoiceMetaColumn}>
                            <Text style={styles.invoiceItemCode}>Discount</Text>
                            <Text style={styles.invoiceItemValue}>{Number(item.discount_pct || 0)}%</Text>
                          </View>
                        </View>
                      </View>
                    ))}

                    <View style={styles.invoiceSummary}>
                      <Text style={styles.invoiceSectionLabel}>NOTES</Text>
                      <Text style={styles.invoiceMetaText}>
                        {viewedBill.notes || 'Thank you for choosing us for your care.'}
                      </Text>
                      <Text style={styles.invoicePreparedBy}>
                        Prepared by: <Text style={styles.invoiceStrong}>
                          {viewedBill.pharmacist_name || 'Clinic billing team'}
                        </Text>
                      </Text>
                      <View style={styles.invoiceTotals}>
                        <View style={styles.invoiceTotalRow}><Text style={styles.invoiceTotalLabel}>Subtotal</Text><Text style={styles.invoiceTotalValue}>{money(viewedBill.subtotal)}</Text></View>
                        <View style={styles.invoiceTotalRow}><Text style={styles.invoiceTotalLabel}>Discount</Text><Text style={styles.invoiceTotalValue}>-{money(viewedBill.discount_amount)}</Text></View>
                        <View style={styles.invoiceTotalRow}><Text style={styles.invoiceTotalLabel}>Tax</Text><Text style={styles.invoiceTotalValue}>+{money(viewedBill.tax_amount)}</Text></View>
                        <View style={[styles.invoiceTotalRow, styles.invoiceGrandTotal]}><Text style={styles.invoiceGrandLabel}>Total</Text><Text style={styles.invoiceGrandValue}>{money(viewedBill.total_amount)}</Text></View>
                        <View style={styles.invoiceTotalRow}><Text style={styles.invoicePaidLabel}>Amount Paid</Text><Text style={styles.invoicePaidValue}>{money(viewedBill.paid_amount)}</Text></View>
                        <View style={styles.invoiceTotalRow}><Text style={styles.invoiceBalanceLabel}>Balance Due</Text><Text style={styles.invoiceBalanceValue}>{money(Math.max(0, Number(viewedBill.total_amount) - Number(viewedBill.paid_amount)))}</Text></View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.invoiceDocumentFooter}>
                    <Text style={styles.invoiceFooterNote}>
                      This is a system-generated medicine invoice. Thank you for your visit.
                    </Text>
                  </View>
                </View>
              ) : null}
            </ScrollView>
            <View style={styles.invoiceActionFooter}>
              <View style={styles.invoiceActionButtonsRow}>
              <TouchableOpacity
                style={[styles.invoiceCloseAction, styles.invoiceActionButton]}
                onPress={() => setViewVisible(false)}
              >
                <X size={16} color="#334155" />
                <Text style={styles.invoiceCloseActionText}>Close</Text>
              </TouchableOpacity>
              {viewedBill ? (
                <TouchableOpacity
                  style={[styles.invoiceDownloadButton, styles.invoiceActionButton]}
                  onPress={() => downloadPdf(viewedBill)}
                >
                  <Download size={17} color="#FFFFFF" />
                  <Text style={styles.invoiceDownloadButtonText}>Download PDF</Text>
                </TouchableOpacity>
              ) : null}
              </View>
            </View>
          </View>
        </View>
      </AppModal>

      <AppModal
        visible={Boolean(paymentBill)}
        transparent
        animationType="fade"
        onRequestClose={() => setPaymentBill(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ModalHeader
              title="Record Payment"
              onClose={() => setPaymentBill(null)}
            />
            <View style={styles.modalContent}>
              {paymentBill ? (
                <Text style={styles.muted}>
                  Balance due:{' '}
                  {money(
                    Number(paymentBill.total_amount) -
                      Number(paymentBill.paid_amount),
                  )}
                </Text>
              ) : null}
              {renderField(
                'Payment amount (\u20B9)',
                paymentInput,
                setPaymentInput,
                'Enter amount',
                'decimal-pad',
              )}
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setPaymentBill(null)}
              >
                <Text style={styles.secondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={saving}
                style={styles.primaryButton}
                onPress={() => recordPayment()}
              >
                <Text style={styles.primaryText}>Save Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </AppModal>

      <AppModal
        visible={Boolean(editBill)}
        transparent
        animationType="fade"
        onRequestClose={() => setEditBill(null)}
        onDismiss={() => {
          if (pendingBillToast) {
            showBillingToast(pendingBillToast);
            setPendingBillToast(null);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ModalHeader title="Edit Bill" onClose={() => setEditBill(null)} />
            <View style={styles.modalContent}>
              {renderField(
                'Discount amount (\u20B9)',
                editDiscount,
                setEditDiscount,
                '0',
                'decimal-pad',
              )}
              {renderField(
                'Tax amount (\u20B9)',
                editTax,
                setEditTax,
                '0',
                'decimal-pad',
              )}
              {renderField(
                'Paid amount (\u20B9)',
                editPaid,
                setEditPaid,
                '0',
                'decimal-pad',
              )}
              <Text style={styles.label}>Payment method</Text>
              <View style={styles.filterRow}>
                {['cash', 'upi', 'card', 'net_banking'].map(method => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.methodButton,
                      editMethod === method && styles.methodActive,
                    ]}
                    onPress={() => setEditMethod(method)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        editMethod === method && styles.methodActiveText,
                      ]}
                    >
                      {method.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setEditBill(null)}
              >
                <Text style={styles.secondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={saving}
                style={styles.primaryButton}
                onPress={() => saveEdit()}
              >
                <Text style={styles.primaryText}>Update Bill</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </AppModal>
      <AppToastOverlay
        notice={visibleBillingToast}
        onDismiss={() => setVisibleBillingToast(null)}
      />
    </View>
  );
};

export default MedicineBillingScreen;
