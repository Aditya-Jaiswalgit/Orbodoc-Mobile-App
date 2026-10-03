// src/screens/staff/billing/CreateTreatmentBillModal.tsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AlertCircle,
  ChevronDown,
  CreditCard,
  FileText,
  Plus,
  Receipt,
  Trash2,
  User,
  X,
} from 'lucide-react-native';
import { TreatmentBill, TreatmentBillItem } from '../../../types/clinicTypes';
import {
  createTreatmentBillApi,
  updateTreatmentBillApi,
} from '../../../api/billingApi';
import { fetchPatientsApi } from '../../../api/patientApi';
import { getAppointmentsApi } from '../../../api/appointmentApi';
import { getPrescriptionsApi, getPrescriptionByIdApi } from '../../../api/prescriptionApi';

export interface PatientOption {
  id: number | string;
  full_name: string;
  phone?: string;
  patient_code?: string;
}

export interface AppointmentOption {
  id: number | string;
  patient_id?: number | string;
  patient_name?: string;
  doctor_name?: string;
  appointment_date?: string;
  appointment_time?: string;
  status?: string;
}

export interface CreateTreatmentBillModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (message?: string) => void;
  editingBill?: TreatmentBill | null;
  activeClinicId?: number | string | null;
  token?: string | null;
}

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'card', label: 'Card' },
  { key: 'upi', label: 'UPI' },
  { key: 'cheque', label: 'Cheque' },
  { key: 'bank_transfer', label: 'Bank Transfer' },
];

const BILL_STATUSES = [
  { key: 'pending', label: 'Pending' },
  { key: 'partial', label: 'Partially Paid' },
  { key: 'paid', label: 'Paid' },
];

export const CreateTreatmentBillModal: React.FC<CreateTreatmentBillModalProps> = ({
  visible,
  onClose,
  onSuccess,
  editingBill,
  activeClinicId,
  token,
}) => {
  // Form State
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientSuggestions, setPatientSuggestions] = useState<PatientOption[]>([]);
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
  const [patientSearching, setPatientSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);

  const [appointmentOptions, setAppointmentOptions] = useState<AppointmentOption[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentOption | null>(null);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [showApptDropdown, setShowApptDropdown] = useState(false);

  // Prescription History
  const [prescriptionHistory, setPrescriptionHistory] = useState<any[]>([]);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);

  // Payment Details
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const [status, setStatus] = useState('pending');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [description, setDescription] = useState('');

  // Charges & Services
  const [consultantFee, setConsultantFee] = useState('0');
  const [paidAmount, setPaidAmount] = useState('');
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [items, setItems] = useState<TreatmentBillItem[]>([]);

  // New Item Input
  const [itemInput, setItemInput] = useState({
    service_name: '',
    service_code: '',
    quantity: 1,
    unit_price: 0,
    discount_pct: 0,
    tax_pct: 0,
  });

  // Validation Errors
  const [formErrors, setFormErrors] = useState<{
    patient_id?: string;
    appointment_id?: string;
    amount?: string;
  }>({});

  const [submitting, setSubmitting] = useState(false);

  // Reset or Init Form
  const resetForm = useCallback(() => {
    setPatientSearchTerm('');
    setPatientSuggestions([]);
    setShowPatientSuggestions(false);
    setSelectedPatient(null);
    setAppointmentOptions([]);
    setSelectedAppointment(null);
    setPrescriptionHistory([]);
    setPaymentMethod('cash');
    setStatus('pending');
    setDescription('');
    setConsultantFee('0');
    setPaidAmount('');
    setShowServiceForm(false);
    setItems([]);
    setItemInput({
      service_name: '',
      service_code: '',
      quantity: 1,
      unit_price: 0,
      discount_pct: 0,
      tax_pct: 0,
    });
    setFormErrors({});
    setShowMethodDropdown(false);
    setShowStatusDropdown(false);
    setShowApptDropdown(false);
  }, []);

  // Initialize Edit Mode or Fresh Create
  useEffect(() => {
    if (!visible) {
      resetForm();
      return;
    }

    if (editingBill) {
      // Edit Mode
      setSelectedPatient({
        id: editingBill.patient_id,
        full_name: editingBill.patient_name || 'Patient',
        phone: editingBill.patient_phone || editingBill.phone,
        patient_code: editingBill.patient_code,
      });
      setPatientSearchTerm(editingBill.patient_name || '');
      setSelectedAppointment(editingBill.appointment_id ? { id: editingBill.appointment_id } : null);

      const rawItems = editingBill.items || [];
      const isSingleDocFee =
        rawItems.length === 1 &&
        (rawItems[0].service_name?.toLowerCase().includes('consult') ||
          rawItems[0].service_code === 'DOC_FEES');

      if (isSingleDocFee) {
        setConsultantFee(String(rawItems[0].unit_price || 0));
        setItems([]);
      } else {
        setConsultantFee('0');
        setItems(
          rawItems.map((it) => ({
            service_name: it.service_name || '',
            service_code: it.service_code || '',
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unit_price) || 0,
            discount_pct: Number(it.discount_pct) || 0,
            tax_pct: Number(it.tax_pct) || 0,
            total_price: Number(it.total_price) || 0,
          }))
        );
      }

      setPaidAmount(String(editingBill.paid_amount || ''));
      setPaymentMethod(editingBill.payment_method || editingBill.payment_mode || 'cash');
      const st = String(editingBill.status || 'pending').toLowerCase();
      setStatus(st === 'paid' ? 'paid' : st === 'partial' || st === 'partially_paid' ? 'partial' : 'pending');
      setDescription(editingBill.description || '');
    } else {
      resetForm();
      // Pre-load recent patients for instant suggestion
      if (token) {
        fetchPatientsApi({ clinic_id: activeClinicId, limit: 10 }, token)
          .then((res) => {
            if (res.success && res.data) {
              const list = Array.isArray(res.data.data)
                ? res.data.data
                : Array.isArray((res.data as any).patients)
                ? (res.data as any).patients
                : Array.isArray(res.data)
                ? res.data
                : [];
              setPatientSuggestions(
                list.map((p: any) => ({
                  id: p.id,
                  full_name: p.full_name || p.name || 'Unnamed Patient',
                  phone: p.phone,
                  patient_code: p.patient_code || p.code,
                }))
              );
            }
          })
          .catch(() => {});
      }
    }
  }, [visible, editingBill, activeClinicId, token, resetForm]);

  // Search Patients dynamically
  useEffect(() => {
    if (!visible || selectedPatient) {
      return;
    }
    const term = patientSearchTerm.trim();
    if (!term) {
      return;
    }

    const timer = setTimeout(async () => {
      if (!token) return;
      setPatientSearching(true);
      try {
        const res = await fetchPatientsApi(
          {
            clinic_id: activeClinicId,
            search: term,
            limit: 10,
          },
          token
        );
        if (res.success && res.data) {
          const list = Array.isArray(res.data.data)
            ? res.data.data
            : Array.isArray((res.data as any).patients)
            ? (res.data as any).patients
            : Array.isArray(res.data)
            ? res.data
            : [];
          setPatientSuggestions(
            list.map((p: any) => ({
              id: p.id,
              full_name: p.full_name || p.name || 'Unnamed Patient',
              phone: p.phone,
              patient_code: p.patient_code || p.code,
            }))
          );
        } else {
          setPatientSuggestions([]);
        }
      } catch {
        setPatientSuggestions([]);
      } finally {
        setPatientSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [patientSearchTerm, visible, selectedPatient, token, activeClinicId]);

  // Load Completed Appointments & Prescriptions when Patient or Appointment changes
  useEffect(() => {
    if (!visible || !selectedPatient || !token) {
      setAppointmentOptions([]);
      setPrescriptionHistory([]);
      return;
    }

    let isCancelled = false;

    const loadData = async () => {
      // 1. Fetch Completed Appointments for Patient
      setAppointmentsLoading(true);
      try {
        const query = `clinic_id=${activeClinicId}&patient_id=${selectedPatient.id}&limit=100`;
        const res = await getAppointmentsApi(token, query);
        if (!isCancelled && res.success && res.data) {
          const rawAppts: any[] = Array.isArray(res.data)
            ? res.data
            : Array.isArray((res.data as any)?.data)
            ? (res.data as any).data
            : [];

          const completedAppts = rawAppts.filter((a: any) => {
            const s = String(a.status || '').toLowerCase().trim();
            return s === 'complete' || s === 'completed';
          });

          const list = (completedAppts.length > 0 ? completedAppts : rawAppts).map((a: any) => ({
            id: a.id,
            patient_id: a.patient_id,
            patient_name: a.patient_name,
            doctor_name: a.doctor_name,
            appointment_date: a.appointment_date,
            appointment_time: a.appointment_time,
            status: a.status,
          }));

          setAppointmentOptions(list);
        }
      } catch {
        if (!isCancelled) setAppointmentOptions([]);
      } finally {
        if (!isCancelled) setAppointmentsLoading(false);
      }

      // 2. Fetch Prescription History (Web Parity)
      setPrescriptionLoading(true);
      try {
        const rxRes = await getPrescriptionsApi(token, {
          patient_id: selectedPatient.id,
          clinic_id: activeClinicId,
          appointment_id: selectedAppointment?.id,
          limit: 20,
        });

        if (!isCancelled && rxRes.success && rxRes.data) {
          const rawRows: any[] = Array.isArray(rxRes.data)
            ? rxRes.data
            : Array.isArray((rxRes.data as any)?.data)
            ? (rxRes.data as any).data
            : [];

          const detailedList = await Promise.all(
            rawRows.map(async (rx: any) => {
              try {
                const detail = await getPrescriptionByIdApi(token, rx.id);
                if (detail.success && detail.data) {
                  const p = (detail.data as any)?.prescription || detail.data;
                  return {
                    ...rx,
                    ...p,
                    appointment_id: p?.appointment_id ?? rx.appointment_id,
                    appointment_date: p?.appointment_date ?? rx.appointment_date,
                    appointment_time: p?.appointment_time ?? rx.appointment_time,
                    consultation_fee: Number(p?.consultation_fee ?? rx.consultation_fee) || 0,
                    diagnosis: p?.diagnosis ?? rx.diagnosis ?? '',
                    advice: p?.advice ?? rx.advice ?? '',
                    items: Array.isArray(p?.items) ? p.items : (Array.isArray(rx?.items) ? rx.items : []),
                  };
                }
              } catch {}
              return rx;
            })
          );

          if (!isCancelled) {
            setPrescriptionHistory(detailedList);

            // Web Parity: Auto-suggest consultant fee from recent prescription or strictly 0 if none
            if (items.length === 0) {
              const suggested = detailedList.find((item: any) => Number(item.consultation_fee) > 0);
              const nextFee = suggested ? Number(suggested.consultation_fee) || 0 : 0;
              setConsultantFee(String(nextFee));
            }
          }
        } else if (!isCancelled) {
          setPrescriptionHistory([]);
          if (items.length === 0) {
            setConsultantFee('0');
          }
        }
      } catch {
        if (!isCancelled) {
          setPrescriptionHistory([]);
          if (items.length === 0) {
            setConsultantFee('0');
          }
        }
      } finally {
        if (!isCancelled) setPrescriptionLoading(false);
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [selectedPatient, selectedAppointment?.id, visible, token, activeClinicId]);

  // Totals Calculation
  const formTotals = useMemo(() => {
    if (items.length > 0) {
      let sub = 0;
      let discTotal = 0;
      let taxTotal = 0;
      let finalTotal = 0;

      items.forEach((it) => {
        const qty = Number(it.quantity) || 1;
        const price = Number(it.unit_price) || 0;
        const disc = Number(it.discount_pct) || 0;
        const tax = Number(it.tax_pct) || 0;

        const base = qty * price;
        const discAmt = (base * disc) / 100;
        const taxable = base - discAmt;
        const taxAmt = (taxable * tax) / 100;
        const total = taxable + taxAmt;

        sub += base;
        discTotal += discAmt;
        taxTotal += taxAmt;
        finalTotal += total;
      });

      return {
        subtotal: Math.round(sub * 100) / 100,
        discount_amount: Math.round(discTotal * 100) / 100,
        tax_amount: Math.round(taxTotal * 100) / 100,
        total_amount: Math.round(finalTotal * 100) / 100,
      };
    }

    const fee = Math.max(0, parseFloat(consultantFee) || 0);
    return {
      subtotal: fee,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: fee,
    };
  }, [consultantFee, items]);

  const pendingAmount = useMemo(() => {
    const paid = Math.max(0, parseFloat(paidAmount) || 0);
    return Math.max(0, Math.round((formTotals.total_amount - paid) * 100) / 100);
  }, [formTotals.total_amount, paidAmount]);

  // Handle Paid Amount change
  const handlePaidAmountChange = (raw: string) => {
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      setPaidAmount(raw);
      const num = parseFloat(raw) || 0;
      if (formTotals.total_amount > 0) {
        if (num >= formTotals.total_amount) {
          setStatus('paid');
        } else if (num > 0) {
          setStatus('partial');
        } else {
          setStatus('pending');
        }
      }
    }
  };

  // Add Item via Form
  const handleAddBillItem = () => {
    if (!itemInput.service_name.trim()) {
      Alert.alert('Validation Error', 'Please enter a service name.');
      return;
    }
    const qty = Math.max(1, Number(itemInput.quantity) || 1);
    const price = Math.max(0, Number(itemInput.unit_price) || 0);
    const disc = Math.min(100, Math.max(0, Number(itemInput.discount_pct) || 0));
    const tax = Math.max(0, Number(itemInput.tax_pct) || 0);

    const base = qty * price;
    const discAmount = (base * disc) / 100;
    const taxable = base - discAmount;
    const taxAmount = (taxable * tax) / 100;
    const total_price = Math.round((taxable + taxAmount) * 100) / 100;

    const newItem: TreatmentBillItem = {
      service_name: itemInput.service_name.trim(),
      service_code: itemInput.service_code.trim() || undefined,
      quantity: qty,
      unit_price: price,
      discount_pct: disc,
      tax_pct: tax,
      total_price,
    };

    setItems((prev) => [...prev, newItem]);
    setItemInput({
      service_name: '',
      service_code: '',
      quantity: 1,
      unit_price: 0,
      discount_pct: 0,
      tax_pct: 0,
    });
    setShowServiceForm(false);
    if (formErrors.amount) {
      setFormErrors((prev) => ({ ...prev, amount: undefined }));
    }
  };

  const handleRemoveBillItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Select patient handler
  const handleSelectPatient = (p: PatientOption) => {
    setSelectedPatient(p);
    setPatientSearchTerm(`${p.full_name} | ID: ${p.id} | ${p.phone || '-'}`);
    setShowPatientSuggestions(false);
    setSelectedAppointment(null);
    setPrescriptionHistory([]);
    if (items.length === 0) {
      setConsultantFee('0');
    }
    setPaidAmount('');
    if (formErrors.patient_id) {
      setFormErrors((prev) => ({ ...prev, patient_id: undefined }));
    }
  };

  // Clear patient handler
  const handleClearPatient = () => {
    setSelectedPatient(null);
    setPatientSearchTerm('');
    setShowPatientSuggestions(false);
    setSelectedAppointment(null);
    setAppointmentOptions([]);
    setPrescriptionHistory([]);
    if (items.length === 0) {
      setConsultantFee('0');
    }
  };

  // Submit Bill
  const handleSubmitBill = async () => {
    if (!token) return;

    const fallbackFee = Math.max(0, parseFloat(consultantFee) || 0);
    const hasAmount =
      items.length > 0 ? items.some((it) => Number(it.total_price) > 0) : fallbackFee > 0;

    const nextErrors: { patient_id?: string; appointment_id?: string; amount?: string } = {};

    if (!selectedPatient) {
      nextErrors.patient_id = 'Please select a patient.';
    }
    if (!selectedAppointment) {
      nextErrors.appointment_id = 'Please select a completed appointment.';
    }
    if (!hasAmount) {
      nextErrors.amount = 'Enter a consultant fee or add a service item with an amount.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }
    setFormErrors({});

    const normalizedItems: TreatmentBillItem[] =
      items.length > 0
        ? items
        : [
            {
              service_name: 'Consultant Fees',
              service_code: 'DOC_FEES',
              quantity: 1,
              unit_price: fallbackFee,
              discount_pct: 0,
              tax_pct: 0,
              total_price: fallbackFee,
            },
          ];

    const normalizedSubtotal = items.length > 0 ? formTotals.subtotal : fallbackFee;
    const normalizedTotal = items.length > 0 ? formTotals.total_amount : fallbackFee;
    const paidNum = Math.max(0, parseFloat(paidAmount) || 0);

    setSubmitting(true);

    try {
      const payload = {
        clinic_id: activeClinicId,
        patient_id: selectedPatient?.id,
        phone: selectedPatient?.phone || '',
        appointment_id: selectedAppointment ? selectedAppointment.id : 0,
        items: normalizedItems.map((item) => ({
          service_name: item.service_name.trim(),
          service_code: item.service_code ? item.service_code.trim() : null,
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          discount_pct: Number(item.discount_pct) || 0,
          tax_pct: Number(item.tax_pct) || 0,
          total_price: Number(item.total_price) || 0,
        })),
        subtotal: normalizedSubtotal,
        discount_amount: items.length > 0 ? formTotals.discount_amount : 0,
        tax_amount: items.length > 0 ? formTotals.tax_amount : 0,
        total_amount: normalizedTotal,
        paid_amount: paidNum,
        payment_method: paymentMethod,
        status,
        description: description.trim(),
      };

      if (editingBill) {
        const res = await updateTreatmentBillApi(token, editingBill.id, payload);
        if (res.success) {
          onSuccess('Treatment bill updated successfully');
          onClose();
        } else {
          Alert.alert('Error', res.message || 'Failed to update treatment bill');
        }
      } else {
        const res = await createTreatmentBillApi(token, payload);
        if (res.success) {
          onSuccess('Treatment bill created successfully');
          onClose();
        } else {
          Alert.alert('Error', res.message || 'Failed to create treatment bill');
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save treatment bill');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amt: number) =>
    `₹${Number(amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.sectionIconBox, { backgroundColor: '#0D9488', width: 34, height: 34, borderRadius: 8 }]}>
                <Receipt size={18} color="#FFFFFF" />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.modalTitle}>
                  {editingBill ? 'Edit Treatment Bill' : 'Create New Bill'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {editingBill
                    ? 'Update charges, payment details or services'
                    : 'Create a new treatment bill'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {!editingBill && (
                <View style={styles.draftBadge}>
                  <Text style={styles.draftBadgeText}>Draft</Text>
                </View>
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Body Content */}
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={{ paddingBottom: 28 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {/* SECTION 1: Bill Information */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <FileText size={16} color="#0D9488" />
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.sectionTitle}>Bill Information</Text>
                  <Text style={styles.sectionSubtitle}>
                    Select the patient and their completed appointment.
                  </Text>
                </View>
              </View>

              {/* Patient Selection (Matches Web Input Style) */}
              <View style={{ marginTop: 12 }}>
                <Text style={styles.fieldLabel}>
                  Patient <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>

                <View>
                  <View
                    style={[
                      styles.searchInputWrapper,
                      formErrors.patient_id && { borderColor: '#EF4444' },
                    ]}>
                    <TextInput
                      style={styles.searchInputField}
                      placeholder="Search by patient ID, name or mobile"
                      placeholderTextColor="#94A3B8"
                      value={patientSearchTerm}
                      onFocus={() => {
                        setShowPatientSuggestions(true);
                      }}
                      onChangeText={(t) => {
                        setPatientSearchTerm(t);
                        setShowPatientSuggestions(true);
                        if (selectedPatient) {
                          setSelectedPatient(null);
                        }
                        if (formErrors.patient_id) {
                          setFormErrors((prev) => ({ ...prev, patient_id: undefined }));
                        }
                      }}
                    />
                    {patientSearching ? (
                      <ActivityIndicator size="small" color="#0D9488" style={{ marginRight: 6 }} />
                    ) : selectedPatient || patientSearchTerm ? (
                      <TouchableOpacity
                        onPress={handleClearPatient}
                        style={{ padding: 6 }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <X size={16} color="#64748B" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Suggestions Dropdown (Web Parity) */}
                  {showPatientSuggestions && !selectedPatient && (
                    <View style={styles.suggestionsContainer}>
                      {patientSuggestions.length === 0 && !patientSearching && patientSearchTerm.trim() ? (
                        <View style={{ padding: 12 }}>
                          <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>
                            No patient found
                          </Text>
                        </View>
                      ) : (
                        patientSuggestions.map((p) => (
                          <TouchableOpacity
                            key={p.id}
                            style={styles.suggestionRow}
                            onPress={() => handleSelectPatient(p)}>
                            <Text style={styles.suggestionName}>{p.full_name}</Text>
                            <Text style={styles.suggestionPhone}>
                              ID: {p.id} | Mobile: {p.phone || '-'}
                              {p.patient_code ? ` | ${p.patient_code}` : ''}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}
                </View>

                {formErrors.patient_id && (
                  <View style={styles.inlineError}>
                    <AlertCircle size={14} color="#EF4444" />
                    <Text style={styles.inlineErrorText}>{formErrors.patient_id}</Text>
                  </View>
                )}
              </View>

              {/* Appointment Selection (Matches Web Input Style) */}
              <View style={{ marginTop: 12 }}>
                <Text style={styles.fieldLabel}>
                  Appointment <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.selectBox,
                    !selectedPatient && { opacity: 0.6, backgroundColor: '#F8FAFC' },
                    formErrors.appointment_id && { borderColor: '#EF4444' },
                  ]}
                  disabled={!selectedPatient}
                  onPress={() => setShowApptDropdown((prev) => !prev)}>
                  <Text
                    style={[styles.selectValue, !selectedAppointment && { color: '#94A3B8' }]}
                    numberOfLines={1}>
                    {selectedAppointment
                      ? `${formatDate(selectedAppointment.appointment_date)}${
                          selectedAppointment.appointment_time
                            ? ` at ${selectedAppointment.appointment_time}`
                            : ''
                        } | Appt ID: ${selectedAppointment.id}`
                      : 'Type date or appointment ID'}
                  </Text>
                  {selectedAppointment ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedAppointment(null);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <X size={15} color="#64748B" />
                    </TouchableOpacity>
                  ) : (
                    <ChevronDown size={16} color="#64748B" />
                  )}
                </TouchableOpacity>
                <Text style={styles.helperText}>Only completed appointments are shown</Text>

                {formErrors.appointment_id && (
                  <View style={styles.inlineError}>
                    <AlertCircle size={14} color="#EF4444" />
                    <Text style={styles.inlineErrorText}>{formErrors.appointment_id}</Text>
                  </View>
                )}

                {/* Dropdown Options */}
                {showApptDropdown && (
                  <View style={styles.dropdownMenu}>
                    {appointmentsLoading ? (
                      <View style={{ padding: 12, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#0D9488" />
                      </View>
                    ) : appointmentOptions.length > 0 ? (
                      appointmentOptions.map((a) => (
                        <TouchableOpacity
                          key={a.id}
                          style={[
                            styles.dropdownItem,
                            selectedAppointment?.id === a.id && styles.dropdownItemSelected,
                          ]}
                          onPress={() => {
                            setSelectedAppointment(selectedAppointment?.id === a.id ? null : a);
                            setShowApptDropdown(false);
                            if (formErrors.appointment_id) {
                              setFormErrors((prev) => ({ ...prev, appointment_id: undefined }));
                            }
                          }}>
                          <Text
                            style={[
                              styles.dropdownItemText,
                              selectedAppointment?.id === a.id && { color: '#0D9488', fontWeight: '700' },
                            ]}>
                            #{a.id} • {formatDate(a.appointment_date)} ({a.appointment_time || 'General'})
                            {a.doctor_name ? ` • Dr. ${a.doctor_name}` : ''}
                          </Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={{ padding: 12 }}>
                        <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center' }}>
                          No completed appointments found for this patient
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* SECTION 2: Prescription History (Web Parity) */}
            <View style={styles.sectionDivider} />
            <View style={styles.formSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <FileText size={16} color="#0D9488" />
                </View>
                <View style={{ marginLeft: 10, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.sectionTitle}>Prescription History</Text>
                  {selectedPatient && (
                    <View style={styles.rxBadge}>
                      <Text style={styles.rxBadgeText}>
                        {prescriptionHistory.length} {prescriptionHistory.length === 1 ? 'record' : 'records'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {!selectedPatient && (
                <Text style={styles.rxNoticeText}>Select patient to view prescription history.</Text>
              )}

              {selectedPatient && prescriptionLoading && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
                  <ActivityIndicator size="small" color="#0D9488" />
                  <Text style={styles.rxNoticeText}>Loading prescription history...</Text>
                </View>
              )}

              {selectedPatient && !prescriptionLoading && prescriptionHistory.length === 0 && (
                <Text style={styles.rxNoticeText}>No prescription history found for this patient.</Text>
              )}

              {selectedPatient &&
                !prescriptionLoading &&
                prescriptionHistory.map((rx: any) => (
                  <View key={rx.id} style={styles.rxCard}>
                    <Text style={styles.rxCardTitle}>Prescription #{rx.id}</Text>
                    <View style={styles.rxCardMetaRow}>
                      <Text style={styles.rxCardMetaText}>
                        Appointment Date:{' '}
                        <Text style={styles.rxCardMetaBold}>
                          {formatDate(rx.appointment_date || rx.created_at)}
                          {rx.appointment_time ? ` at ${rx.appointment_time}` : ''}
                        </Text>
                      </Text>
                      <Text style={styles.rxCardMetaText}>
                        Prescribed On:{' '}
                        <Text style={styles.rxCardMetaBold}>{formatDate(rx.created_at)}</Text>
                      </Text>
                    </View>
                    <Text style={styles.rxDetailText}>Appointment ID: {rx.appointment_id || '-'}</Text>
                    <Text style={styles.rxDetailText}>Diagnosis: {rx.diagnosis || '-'}</Text>
                    <Text style={styles.rxDetailText}>Advice: {rx.advice || '-'}</Text>
                    <Text style={[styles.rxDetailText, { fontWeight: '700', marginTop: 6 }]}>Medicines:</Text>
                    {rx.items && rx.items.length > 0 ? (
                      <View style={styles.rxPillsRow}>
                        {rx.items.map((med: any, mIdx: number) => {
                          const tone =
                            mIdx % 4 === 0
                              ? { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' }
                              : mIdx % 4 === 1
                              ? { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' }
                              : mIdx % 4 === 2
                              ? { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' }
                              : { bg: '#FFE4E6', text: '#9F1239', border: '#FECDD3' };
                          return (
                            <View
                              key={mIdx}
                              style={[styles.rxPill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                              <Text style={[styles.rxPillText, { color: tone.text }]}>
                                {med.medicine_name || med.name}
                                {med.dosage ? ` (${med.dosage})` : ''}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={styles.rxNoticeText}>-</Text>
                    )}
                  </View>
                ))}
            </View>

            {/* SECTION 3: Payment Details */}
            <View style={styles.sectionDivider} />
            <View style={styles.formSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <CreditCard size={16} color="#2563EB" />
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.sectionTitle}>Payment Details</Text>
                  <Text style={styles.sectionSubtitle}>
                    Set the payment method, bill status and notes.
                  </Text>
                </View>
              </View>

              {/* Payment Method */}
              <View style={{ marginTop: 12 }}>
                <Text style={styles.fieldLabel}>Payment Method</Text>
                <TouchableOpacity
                  style={styles.selectBox}
                  onPress={() => setShowMethodDropdown((prev) => !prev)}>
                  <Text style={styles.selectValue}>
                    {PAYMENT_METHODS.find((m) => m.key === paymentMethod)?.label || 'Cash'}
                  </Text>
                  <ChevronDown size={16} color="#64748B" />
                </TouchableOpacity>

                {showMethodDropdown && (
                  <View style={styles.dropdownMenu}>
                    {PAYMENT_METHODS.map((m) => (
                      <TouchableOpacity
                        key={m.key}
                        style={[
                          styles.dropdownItem,
                          paymentMethod === m.key && styles.dropdownItemSelected,
                        ]}
                        onPress={() => {
                          setPaymentMethod(m.key);
                          setShowMethodDropdown(false);
                        }}>
                        <Text
                          style={[
                            styles.dropdownItemText,
                            paymentMethod === m.key && { color: '#0D9488', fontWeight: '700' },
                          ]}>
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Status */}
              <View style={{ marginTop: 12 }}>
                <Text style={styles.fieldLabel}>Status</Text>
                <TouchableOpacity
                  style={styles.selectBox}
                  onPress={() => setShowStatusDropdown((prev) => !prev)}>
                  <Text style={styles.selectValue}>
                    {status === 'paid' ? 'Paid' : status === 'partial' ? 'Partially Paid' : 'Pending'}
                  </Text>
                  <ChevronDown size={16} color="#64748B" />
                </TouchableOpacity>

                {showStatusDropdown && (
                  <View style={styles.dropdownMenu}>
                    {BILL_STATUSES.map((s) => (
                      <TouchableOpacity
                        key={s.key}
                        style={[
                          styles.dropdownItem,
                          status === s.key && styles.dropdownItemSelected,
                        ]}
                        onPress={() => {
                          setStatus(s.key);
                          setShowStatusDropdown(false);
                        }}>
                        <Text
                          style={[
                            styles.dropdownItemText,
                            status === s.key && { color: '#0D9488', fontWeight: '700' },
                          ]}>
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Description */}
              <View style={{ marginTop: 12 }}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={styles.textarea}
                  placeholder="Bill description"
                  placeholderTextColor="#94A3B8"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            {/* SECTION 4: Charges & Services */}
            <View style={styles.sectionDivider} />
            <View style={styles.formSection}>
              <View style={[styles.sectionHeaderRow, { justifyContent: 'space-between' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[styles.sectionIconBox, { backgroundColor: '#ECFDF5' }]}>
                    <Receipt size={16} color="#0D9488" />
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.sectionTitle}>Charges & Services</Text>
                    <Text style={styles.sectionSubtitle}>
                      Add a consultation fee or detailed service items.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.addServiceBtn}
                  onPress={() => setShowServiceForm((prev) => !prev)}
                  activeOpacity={0.8}>
                  {showServiceForm ? (
                    <X size={15} color="#0F172A" strokeWidth={2.5} />
                  ) : (
                    <Plus size={15} color="#0F172A" strokeWidth={2.5} />
                  )}
                  <Text style={styles.addServiceBtnText}>
                    {showServiceForm ? 'Close Form' : 'Add Service'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Consultant Fees */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.fieldLabel}>Consultant Fees</Text>
                <TextInput
                  style={[
                    styles.inputField,
                    items.length > 0 && { backgroundColor: '#F1F5F9', color: '#64748B' },
                    Boolean(formErrors.amount) && { borderColor: '#EF4444' },
                  ]}
                  keyboardType="numeric"
                  editable={items.length === 0}
                  value={items.length > 0 ? String(formTotals.subtotal) : consultantFee}
                  onChangeText={(val) => {
                    if (items.length > 0) return;
                    setConsultantFee(val);
                    if (parseFloat(val) > 0 && formErrors.amount) {
                      setFormErrors((prev) => ({ ...prev, amount: undefined }));
                    }
                  }}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                />
                {formErrors.amount && (
                  <View style={styles.inlineError}>
                    <AlertCircle size={14} color="#EF4444" />
                    <Text style={styles.inlineErrorText}>{formErrors.amount}</Text>
                  </View>
                )}
                <Text style={styles.helperText}>
                  Use this for simple treatment billing without adding service items.
                </Text>
              </View>

              {/* Paid Amount */}
              <View style={{ marginTop: 12 }}>
                <Text style={styles.fieldLabel}>Paid Amount</Text>
                <TextInput
                  style={styles.inputField}
                  keyboardType="numeric"
                  value={paidAmount}
                  onChangeText={handlePaidAmountChange}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* New Service Item Form Modal / Box (When toggled) */}
              {showServiceForm && (
                <View style={styles.serviceFormBox}>
                  <View style={styles.serviceFormHeader}>
                    <Plus size={15} color="#0F766E" strokeWidth={2.5} />
                    <Text style={styles.serviceFormTitle}>New Service Item</Text>
                  </View>

                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.serviceFormInputLabel}>Service Name</Text>
                    <TextInput
                      style={styles.serviceFormInput}
                      placeholder="e.g., OPD Consultation"
                      placeholderTextColor="#94A3B8"
                      value={itemInput.service_name}
                      onChangeText={(t) => setItemInput((prev) => ({ ...prev, service_name: t }))}
                    />
                  </View>

                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.serviceFormInputLabel}>Service Code</Text>
                    <TextInput
                      style={styles.serviceFormInput}
                      placeholder="e.g., CONS001"
                      placeholderTextColor="#94A3B8"
                      value={itemInput.service_code}
                      onChangeText={(t) => setItemInput((prev) => ({ ...prev, service_code: t }))}
                    />
                  </View>

                  <View style={styles.serviceFormGrid}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceFormInputLabel}>Qty</Text>
                      <TextInput
                        style={styles.serviceFormInput}
                        keyboardType="numeric"
                        value={String(itemInput.quantity)}
                        onChangeText={(t) =>
                          setItemInput((prev) => ({ ...prev, quantity: parseInt(t, 10) || 1 }))
                        }
                      />
                    </View>
                    <View style={{ flex: 1.2 }}>
                      <Text style={styles.serviceFormInputLabel}>Unit Price (₹)</Text>
                      <TextInput
                        style={styles.serviceFormInput}
                        keyboardType="numeric"
                        value={String(itemInput.unit_price)}
                        onChangeText={(t) =>
                          setItemInput((prev) => ({ ...prev, unit_price: parseFloat(t) || 0 }))
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceFormInputLabel}>Disc %</Text>
                      <TextInput
                        style={styles.serviceFormInput}
                        keyboardType="numeric"
                        value={String(itemInput.discount_pct)}
                        onChangeText={(t) =>
                          setItemInput((prev) => ({ ...prev, discount_pct: parseFloat(t) || 0 }))
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceFormInputLabel}>Tax %</Text>
                      <TextInput
                        style={styles.serviceFormInput}
                        keyboardType="numeric"
                        value={String(itemInput.tax_pct)}
                        onChangeText={(t) =>
                          setItemInput((prev) => ({ ...prev, tax_pct: parseFloat(t) || 0 }))
                        }
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.serviceAddBtn}
                    onPress={handleAddBillItem}
                    activeOpacity={0.8}>
                    <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.serviceAddBtnText}>Add Item</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Items List Header & Cards (Exact Web Match) */}
              {items.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.itemsListTitle}>Items ({items.length})</Text>
                  <View style={{ gap: 8, marginTop: 8 }}>
                    {items.map((item, idx) => (
                      <View key={idx} style={styles.addedItemCard}>
                        <View style={styles.addedItemCardHeader}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.addedItemTitle} numberOfLines={1}>
                              {item.service_name}
                            </Text>
                            <Text style={styles.addedItemSubtitle}>
                              {item.service_code || 'No service code'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleRemoveBillItem(idx)}
                            style={styles.addedItemDeleteBtn}>
                            <Trash2 size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.addedItemGrid}>
                          <View style={styles.addedItemGridCol}>
                            <Text style={styles.addedItemColLabel}>Qty</Text>
                            <Text style={styles.addedItemColVal}>{item.quantity}</Text>
                          </View>
                          <View style={styles.addedItemGridCol}>
                            <Text style={styles.addedItemColLabel}>Rate</Text>
                            <Text style={styles.addedItemColVal}>
                              {formatCurrency(item.unit_price)}
                            </Text>
                          </View>
                          <View style={[styles.addedItemGridCol, { alignItems: 'flex-end' }]}>
                            <Text style={styles.addedItemColLabel}>Total</Text>
                            <Text style={styles.addedItemColTotal}>
                              {formatCurrency(item.total_price)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {items.length === 0 && (
                <View style={styles.emptyServiceBox}>
                  <Text style={styles.emptyServiceText}>No service items added</Text>
                </View>
              )}
            </View>

            {/* SECTION 5: Bill Summary */}
            <View style={styles.sectionDivider} />
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Bill Summary</Text>
              <View style={styles.summaryCard}>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  {/* Left Column */}
                  <View style={{ flex: 1, gap: 12 }}>
                    <View>
                      <Text style={styles.summaryLabel}>Subtotal</Text>
                      <Text style={styles.summaryValue}>{formatCurrency(formTotals.subtotal)}</Text>
                    </View>
                    <View>
                      <Text style={styles.summaryLabel}>Tax</Text>
                      <Text style={styles.summaryValue}>+₹{formTotals.tax_amount.toFixed(2)}</Text>
                    </View>
                    <View>
                      <Text style={styles.summaryLabel}>Paid</Text>
                      <Text style={[styles.summaryValue, { color: '#0D9488' }]}>
                        {formatCurrency(Number(paidAmount) || 0)}
                      </Text>
                    </View>
                  </View>

                  {/* Right Column */}
                  <View style={{ flex: 1, gap: 12 }}>
                    <View>
                      <Text style={styles.summaryLabel}>Discount</Text>
                      <Text style={styles.summaryValue}>-₹{formTotals.discount_amount.toFixed(2)}</Text>
                    </View>
                    <View>
                      <Text style={styles.summaryLabel}>Total</Text>
                      <Text style={[styles.summaryValue, { color: '#0D9488' }]}>
                        {formatCurrency(formTotals.total_amount)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.summaryLabel}>Pending</Text>
                      <Text style={[styles.summaryValue, { color: pendingAmount > 0 ? '#DC2626' : '#64748B' }]}>
                        {formatCurrency(pendingAmount)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Sticky Footer */}
          <View style={styles.modalFooter}>
            <View style={styles.amountDueRow}>
              <Text style={styles.amountDueLabel}>AMOUNT DUE</Text>
              <Text style={styles.amountDueValue}>{formatCurrency(pendingAmount)}</Text>
            </View>

            <View style={styles.footerBtnsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={submitting}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createBillBtn}
                onPress={handleSubmitBill}
                disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.createBillBtnText}>
                    {editingBill ? 'Update Bill' : 'Create Bill'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 580,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  draftBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  draftBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  formSection: {
    marginBottom: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIconBox: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0D9488',
    borderRadius: 9,
    paddingHorizontal: 12,
  },
  searchInputField: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  selectedPatientBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  patientAvatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPatientName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  selectedPatientSub: {
    fontSize: 11,
    color: '#0D9488',
    marginTop: 2,
    fontWeight: '500',
  },
  clearPatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    gap: 4,
  },
  clearPatientBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  suggestionPhone: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  selectBox: {
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
  selectValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    flex: 1,
    marginRight: 6,
  },
  helperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 5,
  },
  dropdownMenu: {
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
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dropdownItemSelected: {
    backgroundColor: '#F0FDFA',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#334155',
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  inlineErrorText: {
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
  textarea: {
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
  addServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  addServiceBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  inputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
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
  emptyServiceBox: {
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
  emptyServiceText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  amountDueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountDueLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  amountDueValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  footerBtnsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  createBillBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBillBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
