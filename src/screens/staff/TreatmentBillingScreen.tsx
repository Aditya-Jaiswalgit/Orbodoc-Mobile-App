import React, { useState } from 'react';
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
  View,
} from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { useAuthContext } from '../../context/AuthContext';
import { useTreatmentBilling } from '../../hooks/useTreatmentBilling';
import { TreatmentBill } from '../../api/treatmentBillApi';
import { LOCAL_BASE_URLS, PRIMARY_BASE_URL } from '../../api/apiConfig';
import { getPatientsApi, getPatientPrescriptionsApi } from '../../api/patientApi';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
}

export const TreatmentBillingScreen: React.FC<Props> = ({ onOpenDrawer, onOpenNotifications }) => {
  const { user, token } = useAuthContext();
  const {
    bills,
    selectedBill,
    stats,
    loading,
    detailsLoading,
    refreshBills,
    fetchBillDetails,
    createBill,
    recordBillPayment,
  } = useTreatmentBilling();

  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientSuggestions, setPatientSuggestions] = useState<Array<any>>([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [patientPrescriptions, setPatientPrescriptions] = useState<Array<any>>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);

  const handlePatientSearchTextChange = async (text: string) => {
    setPatientName(text);
    if (!token || text.trim().length < 1) {
      setPatientSuggestions([]);
      setShowPatientSuggestions(false);
      return;
    }

    setIsSearchingPatient(true);
    setShowPatientSuggestions(true);
    try {
      const res = await getPatientsApi(token, `search=${encodeURIComponent(text.trim())}`);
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data as any).patients || (res.data as any).data || [];
        setPatientSuggestions(list);
      } else {
        setPatientSuggestions([]);
      }
    } catch (e) {
      setPatientSuggestions([]);
    } finally {
      setIsSearchingPatient(false);
    }
  };

  const handleSelectPatient = async (patient: any) => {
    const displayName = `${patient.full_name || patient.name || 'Patient'} | ID: ${patient.id} | ${patient.phone || 'N/A'}`;
    setPatientName(displayName);
    setPatientPhone(patient.phone || '');
    setSelectedPatient(patient);
    setShowPatientSuggestions(false);
    setConsultantFees('799');

    if (token && patient.id) {
      setLoadingPrescriptions(true);
      try {
        const res = await getPatientPrescriptionsApi(token, patient.id);
        if (res.success && res.data) {
          const rxList = Array.isArray(res.data) ? res.data : (res.data as any).prescriptions || (res.data as any).data || [];
          setPatientPrescriptions(rxList);
          if (rxList.length > 0 && rxList[0].appointment_id) {
            setAppointmentIdStr(String(rxList[0].appointment_id));
          }
          if (rxList.length > 0) {
            const fee = rxList[0].consultant_fee || rxList[0].fee || rxList[0].amount || rxList[0].consultation_fee;
            if (fee) setConsultantFees(String(fee));
          }
        } else {
          setPatientPrescriptions([]);
        }
      } catch (e) {
        setPatientPrescriptions([]);
      } finally {
        setLoadingPrescriptions(false);
      }
    }
  };
  const [appointmentIdStr, setAppointmentIdStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card'>('Cash');
  const [billStatus, setBillStatus] = useState<'pending' | 'paid' | 'partially_paid'>('pending');
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [description, setDescription] = useState('');

  const [consultantFees, setConsultantFees] = useState('799');
  const [paidAmountInput, setPaidAmountInput] = useState('0.00');
  const [serviceItems, setServiceItems] = useState<
    Array<{
      id: number;
      service_name: string;
      unit_price: number;
      quantity: number;
      discount_pct: number;
      total_price: number;
    }>
  >([]);

  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceQty, setNewServiceQty] = useState('1');

  const [targetBill, setTargetBill] = useState<TreatmentBill | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('upi');

  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  // Calculations for Bill Summary
  const parsedConsultant = parseFloat(consultantFees) || 0;
  const itemsSubtotal = serviceItems.reduce((acc, item) => acc + item.total_price, 0);
  const calcSubtotal = parsedConsultant + itemsSubtotal;
  const calcDiscount = serviceItems.reduce(
    (acc, item) => acc + (item.quantity * item.unit_price * (item.discount_pct || 0)) / 100,
    0
  );
  const calcTax = 0;
  const calcTotal = Math.max(0, calcSubtotal - calcDiscount + calcTax);
  const calcPaid = parseFloat(paidAmountInput) || (billStatus === 'paid' ? calcTotal : 0);
  const calcPending = Math.max(0, calcTotal - calcPaid);

  const handleAddServiceItem = () => {
    if (!newServiceName.trim()) {
      Alert.alert('Validation Error', 'Service name is required.');
      return;
    }
    const p = parseFloat(newServicePrice) || 0;
    const q = parseInt(newServiceQty) || 1;
    const tot = p * q;

    setServiceItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        service_name: newServiceName.trim(),
        unit_price: p,
        quantity: q,
        discount_pct: 0,
        total_price: tot,
      },
    ]);
    setNewServiceName('');
    setNewServicePrice('');
    setNewServiceQty('1');
  };

  const handleRemoveServiceItem = (id: number) => {
    setServiceItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleCreateBill = async () => {
    if (!patientName.trim()) {
      Alert.alert('Validation Error', 'Patient name is required.');
      return;
    }

    // Extract patient_id from selectedPatient or patientName string
    let pId = selectedPatient?.id;
    if (!pId && patientName) {
      const match = patientName.match(/ID:\s*(\d+)/i);
      if (match) {
        pId = parseInt(match[1]);
      }
    }
    if (!pId) {
      pId = 1;
    }

    const feeVal = parseFloat(consultantFees) || 799;
    const finalSubtotal = calcSubtotal > 0 ? calcSubtotal : feeVal;
    const finalTotal = calcTotal > 0 ? calcTotal : finalSubtotal;
    const finalPaid = calcPaid;
    const finalDue = calcPending;

    const newBillPayload: Partial<TreatmentBill> = {
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
      paid_amount: finalPaid,
      due_amount: finalDue,
      items:
        serviceItems.length > 0
          ? serviceItems
          : [
              {
                id: Date.now(),
                service_name: 'Consultation Fee',
                quantity: 1,
                unit_price: finalSubtotal,
                total_price: finalSubtotal,
              },
            ],
    };

    const res = await createBill(newBillPayload);
    if (res.success) {
      setModalVisible(false);
      setPatientName('');
      setPatientPhone('');
      setSelectedPatient(null);
      setPatientSuggestions([]);
      setPatientPrescriptions([]);
      setAppointmentIdStr('');
      setDescription('');
      setConsultantFees('0');
      setPaidAmountInput('0.00');
      setServiceItems([]);
      Alert.alert('Success', 'Treatment Invoice created successfully in DB!');
    } else {
      Alert.alert('Error', res.message || 'Could not create bill');
    }
  };

  const handleDownloadPdf = async (billId: number) => {
    if (!token) {
      setPrintModalVisible(true);
      return;
    }

    setPdfDownloading(true);

    try {
      const targetUrls = [PRIMARY_BASE_URL, ...LOCAL_BASE_URLS];
      let pdfBlob: any = null;

      for (const baseUrl of targetUrls) {
        try {
          const url = `${baseUrl}/treatment-bills/${billId}/pdf`;
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/pdf',
            },
          });

          if (response.ok) {
            pdfBlob = await response.blob();
            break;
          }
        } catch (e) {
          // try next URL fallback
        }
      }

      if (pdfBlob && Platform.OS === 'web' && typeof window !== 'undefined') {
        const blobUrl = window.URL.createObjectURL(pdfBlob);
        window.open(blobUrl, '_blank');
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `Treatment-Invoice-${billId}.pdf`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          try {
            document.body.removeChild(a);
          } catch (e) {}
        }, 1000);
      } else {
        // Mobile native: Open full printable receipt sheet
        setPrintModalVisible(true);
      }
    } catch (err) {
      setPrintModalVisible(true);
    } finally {
      setPdfDownloading(false);
    }
  };

  const handlePrintReceipt = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    } else {
      setPrintModalVisible(true);
    }
  };

  const handleOpenDetails = async (id: number) => {
    setDetailsModalVisible(true);
    await fetchBillDetails(id);
  };

  const handleOpenPayment = (bill: TreatmentBill) => {
    setTargetBill(bill);
    setPayAmount(String(bill.due_amount || bill.total_amount || 0));
    setPaymentModalVisible(true);
  };

  const handleRecordPayment = async () => {
    if (!targetBill) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Enter valid payment amount.');
      return;
    }

    const res = await recordBillPayment(targetBill.id, amt, payMethod);
    if (res.success) {
      setPaymentModalVisible(false);
      setTargetBill(null);
      Alert.alert('Success', 'Payment recorded successfully!');
    } else {
      Alert.alert('Error', res.message || 'Payment recording failed');
    }
  };

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Treatment Billing"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshBills} colors={['#0d9488']} />
        }>
        {/* Top Header & Actions */}
        <View style={styles.topRow}>
          <Text style={styles.pageTitle}>Treatment Invoices ({bills.length})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Create Bill</Text>
          </TouchableOpacity>
        </View>

        {/* Bills List */}
        {loading && bills.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0d9488" />
            <Text style={styles.loadingText}>Fetching treatment bills from DB...</Text>
          </View>
        ) : bills.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Treatment Bills Found</Text>
            <Text style={styles.emptySub}>
              Create your first treatment bill to record patient procedures & payments.
            </Text>
          </View>
        ) : (
          <View style={styles.billList}>
            {bills.map((bill) => {
              const statusStr = String(bill.status || '').toLowerCase();
              const isPaid = statusStr === 'paid';
              const totalAmt = Number(bill.total_amount || 0);
              const paidAmt = Number(bill.paid_amount || (isPaid ? totalAmt : 0));

              return (
                <View key={bill.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.billNo}>{bill.bill_number || `TB-C71-2026-0000${bill.id}`}</Text>
                      <Text style={styles.patientName}>{bill.patient_name || 'Patient'}</Text>
                      {bill.patient_phone ? (
                        <Text style={styles.phoneText}>📞 {bill.patient_phone}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.netAmount}>₹{totalAmt.toFixed(2)}</Text>
                  </View>

                  <Text style={styles.dateText}>
                    Date: {bill.created_at ? String(bill.created_at).split('T')[0] : 'N/A'}
                  </Text>

                  {Array.isArray(bill.items) && bill.items.length > 0 ? (
                    <View style={styles.itemsBox}>
                      {bill.items.map((it, idx) => (
                        <View key={idx} style={styles.itemRow}>
                          <Text style={styles.itemTitle}>{it.service_name}</Text>
                          <Text style={styles.itemPrice}>₹{Number(it.total_price || 0).toFixed(2)}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      style={[styles.statusBadge, isPaid ? styles.paidBg : styles.pendingBg]}
                      onPress={() => !isPaid && handleOpenPayment(bill)}>
                      <Text style={[styles.statusText, isPaid ? styles.paidText : styles.pendingText]}>
                        STATUS: {statusStr.toUpperCase()}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleOpenDetails(bill.id)}>
                      <Text style={styles.pdfLink}>📄 View Invoice Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Create Treatment Bill Modal (Matching Web Portal Design) */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.createModalCard}>
            {/* Header Row */}
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
                <View style={styles.draftBadge}>
                  <Text style={styles.draftBadgeText}>Draft</Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
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
                      onChangeText={handlePatientSearchTextChange}
                      onFocus={() => {
                        if (patientSuggestions.length > 0) setShowPatientSuggestions(true);
                      }}
                    />

                    {/* Patient Auto-Suggest Dropdown */}
                    {showPatientSuggestions && (
                      <View style={styles.patientSuggestionsBox}>
                        {isSearchingPatient ? (
                          <View style={{ padding: 12, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color="#0d9488" />
                            <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Searching patient database...</Text>
                          </View>
                        ) : patientSuggestions.length === 0 ? (
                          <View style={{ padding: 12, alignItems: 'center' }}>
                            <Text style={{ fontSize: 12, color: '#94a3b8' }}>No matching patient found</Text>
                          </View>
                        ) : (
                          patientSuggestions.map((pat) => (
                            <TouchableOpacity
                              key={pat.id}
                              style={styles.patientSuggestionItem}
                              onPress={() => handleSelectPatient(pat)}>
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

                  <View style={{ width: '100%' }}>
                    <Text style={styles.formLabel}>Appointment *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Type date or appointment ID"
                      placeholderTextColor="#94a3b8"
                      value={appointmentIdStr}
                      onChangeText={setAppointmentIdStr}
                    />
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
                      <Text style={styles.sectionSub}>
                        {selectedPatient
                          ? `Prescription history for ${selectedPatient.full_name || selectedPatient.name}`
                          : 'Select patient to view prescription history.'}
                      </Text>
                    </View>
                  </View>

                  {selectedPatient && (
                    <View style={styles.recordsBadge}>
                      <Text style={styles.recordsBadgeText}>{patientPrescriptions.length} records</Text>
                    </View>
                  )}
                </View>

                {/* Prescription List Container */}
                {loadingPrescriptions ? (
                  <View style={{ padding: 16, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#0d9488" />
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Loading prescription history...</Text>
                  </View>
                ) : !selectedPatient ? (
                  <View style={styles.emptyPrescriptionBox}>
                    <Text style={styles.emptyPrescriptionText}>Select patient to view prescription history.</Text>
                  </View>
                ) : patientPrescriptions.length === 0 ? (
                  <View style={styles.emptyPrescriptionBox}>
                    <Text style={styles.emptyPrescriptionText}>No prescription history found for this patient.</Text>
                  </View>
                ) : (
                  <View style={{ gap: 10, marginTop: 6 }}>
                    {patientPrescriptions.map((rx: any, idx: number) => (
                      <View key={rx.id || idx} style={styles.prescriptionCardItem}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0d9488' }}>
                            Prescription #{rx.id || rx.prescription_number || idx + 1}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>
                            Prescribed On: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{rx.created_at ? new Date(rx.created_at).toLocaleDateString() : 'N/A'}</Text>
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                          Appointment Date: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{rx.appointment_date || rx.date || 'N/A'}</Text>
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                          Appointment ID: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{rx.appointment_id || 'N/A'}</Text>
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                          Diagnosis: <Text style={{ fontWeight: '600', color: '#334155' }}>{rx.diagnosis || rx.notes || '-'}</Text>
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748b' }}>
                          Advice: <Text style={{ fontWeight: '600', color: '#334155' }}>{rx.advice || '-'}</Text>
                        </Text>
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
                  {/* Payment Method Dropdown */}
                  <View style={{ width: '100%' }}>
                    <Text style={styles.formLabel}>Payment Method</Text>
                    <TouchableOpacity
                      style={styles.dropdownSelector}
                      onPress={() => {
                        setShowPaymentDropdown(!showPaymentDropdown);
                        setShowStatusDropdown(false);
                      }}>
                      <Text style={styles.dropdownSelectorText}>{paymentMethod}</Text>
                      <Text style={styles.dropdownArrow}>▾</Text>
                    </TouchableOpacity>

                    {showPaymentDropdown && (
                      <View style={styles.dropdownMenuBox}>
                        {['Cash', 'UPI', 'Card'].map((method) => (
                          <TouchableOpacity
                            key={method}
                            style={[styles.dropdownMenuItem, paymentMethod === method && styles.dropdownMenuItemActive]}
                            onPress={() => {
                              setPaymentMethod(method as any);
                              setShowPaymentDropdown(false);
                            }}>
                            <Text style={[styles.dropdownMenuText, paymentMethod === method && styles.dropdownMenuTextActive]}>
                              {method}
                            </Text>
                            {paymentMethod === method && <Text style={{ color: '#0d9488', fontWeight: '800' }}>✓</Text>}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Status Dropdown */}
                  <View style={{ width: '100%' }}>
                    <Text style={styles.formLabel}>Status</Text>
                    <TouchableOpacity
                      style={styles.dropdownSelector}
                      onPress={() => {
                        setShowStatusDropdown(!showStatusDropdown);
                        setShowPaymentDropdown(false);
                      }}>
                      <Text style={styles.dropdownSelectorText}>
                        {billStatus === 'pending' ? 'Pending' : billStatus === 'paid' ? 'Paid' : 'Partially Paid'}
                      </Text>
                      <Text style={styles.dropdownArrow}>▾</Text>
                    </TouchableOpacity>

                    {showStatusDropdown && (
                      <View style={styles.dropdownMenuBox}>
                        {[
                          { label: 'Pending', val: 'pending' },
                          { label: 'Paid', val: 'paid' },
                          { label: 'Partially Paid', val: 'partially_paid' },
                        ].map((st) => (
                          <TouchableOpacity
                            key={st.val}
                            style={[styles.dropdownMenuItem, billStatus === st.val && styles.dropdownMenuItemActive]}
                            onPress={() => {
                              setBillStatus(st.val as any);
                              setShowStatusDropdown(false);
                            }}>
                            <Text style={[styles.dropdownMenuText, billStatus === st.val && styles.dropdownMenuTextActive]}>
                              {st.label}
                            </Text>
                            {billStatus === st.val && <Text style={{ color: '#0d9488', fontWeight: '800' }}>✓</Text>}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                <View style={{ marginTop: 10 }}>
                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    style={[styles.formInput, { height: 54, textAlignVertical: 'top' }]}
                    placeholder="Bill description"
                    placeholderTextColor="#94a3b8"
                    multiline={true}
                    value={description}
                    onChangeText={setDescription}
                  />
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

                  <TouchableOpacity
                    style={styles.addServiceBtnHeader}
                    onPress={() => setShowAddServiceModal(!showAddServiceModal)}>
                    <Text style={styles.addServiceBtnHeaderText}>+ Add Service</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.gridTwoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Consultant Fees</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="799"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={consultantFees}
                      onChangeText={setConsultantFees}
                    />
                    <Text style={styles.helperText}>Use this for simple treatment billing without adding service items.</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Paid Amount</Text>
                    <TextInput
                      style={[styles.formInput, { borderColor: '#0d9488' }]}
                      placeholder="0.00"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={paidAmountInput}
                      onChangeText={setPaidAmountInput}
                    />
                  </View>
                </View>

                {/* Service Adder Inline Box */}
                {showAddServiceModal && (
                  <View style={styles.serviceAdderBox}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a', marginBottom: 6 }}>
                      Add Custom Service Item
                    </Text>
                    <View style={styles.adderRow}>
                      <TextInput
                        style={[styles.formInput, { flex: 2 }]}
                        placeholder="Service Name (e.g. ECG / Blood Test)"
                        placeholderTextColor="#94a3b8"
                        value={newServiceName}
                        onChangeText={setNewServiceName}
                      />
                      <TextInput
                        style={[styles.formInput, { flex: 1 }]}
                        placeholder="Rate (₹)"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        value={newServicePrice}
                        onChangeText={setNewServicePrice}
                      />
                      <TextInput
                        style={[styles.formInput, { flex: 0.8 }]}
                        placeholder="Qty"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        value={newServiceQty}
                        onChangeText={setNewServiceQty}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.confirmAddServiceBtn}
                      onPress={() => {
                        handleAddServiceItem();
                        setShowAddServiceModal(false);
                      }}>
                      <Text style={styles.confirmAddServiceBtnText}>Add Item</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Service Items List / Dashed Empty Box */}
                {serviceItems.length === 0 ? (
                  <View style={styles.emptyItemsBox}>
                    <Text style={styles.emptyItemsText}>No service items added</Text>
                  </View>
                ) : (
                  <View style={{ gap: 6, marginTop: 10 }}>
                    {serviceItems.map((item) => (
                      <View key={item.id} style={styles.serviceItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>{item.service_name}</Text>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>
                            Qty: {item.quantity} × ₹{item.unit_price.toFixed(2)}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
                          ₹{item.total_price.toFixed(2)}
                        </Text>
                        <TouchableOpacity
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            backgroundColor: '#fef2f2',
                            borderWidth: 1,
                            borderColor: '#fecaca',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginLeft: 8,
                          }}
                          onPress={() => handleRemoveServiceItem(item.id)}>
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
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryVal}>₹{calcSubtotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>Discount</Text>
                    <Text style={styles.summaryVal}>-₹{calcDiscount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>Tax</Text>
                    <Text style={styles.summaryVal}>+₹{calcTax.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>Total</Text>
                    <Text style={[styles.summaryVal, { color: '#0d9488', fontWeight: '800' }]}>
                      ₹{calcTotal.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>Paid</Text>
                    <Text style={[styles.summaryVal, { color: '#166534', fontWeight: '800' }]}>
                      ₹{calcPaid.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>Pending</Text>
                    <Text style={[styles.summaryVal, { color: '#dc2626', fontWeight: '800' }]}>
                      ₹{calcPending.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Footer Action Bar */}
            <View style={styles.createModalFooter}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748b' }}>AMOUNT DUE</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>
                  ₹{calcPending.toFixed(2)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={styles.cancelBtnPill} onPress={() => setModalVisible(false)}>
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

      {/* Record Payment Modal */}
      <Modal visible={paymentModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Record Bill Payment</Text>
            <Text style={styles.subInfo}>
              Bill #{targetBill?.bill_number} - {targetBill?.patient_name}
            </Text>

            <Text style={styles.label}>Payment Amount (₹) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={payAmount}
              onChangeText={setPayAmount}
            />

            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.methodRow}>
              {['upi', 'cash', 'card'].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[styles.methodBtn, payMethod === method && styles.methodBtnActive]}
                  onPress={() => setPayMethod(method)}>
                  <Text style={[styles.methodText, payMethod === method && styles.methodTextActive]}>
                    {method.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPaymentModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleRecordPayment}>
                <Text style={styles.saveText}>Confirm Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Invoice Details / Web Receipt Modal */}
      <Modal visible={detailsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.receiptContainer}>
            {detailsLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0d9488" />
                <Text style={{ marginTop: 10, color: '#64748b', fontWeight: '600' }}>
                  Loading Invoice Details...
                </Text>
              </View>
            ) : selectedBill ? (() => {
              const normStatus = String(selectedBill.status || '').toLowerCase();
              const isPaid = normStatus === 'paid' || normStatus === 'completed';
              const isPartial = normStatus === 'partial' || normStatus === 'partially_paid';

              const billNum = selectedBill.bill_number || (selectedBill.id ? `TB-C71-2026-0000${selectedBill.id}` : 'TB-C71-2026');
              const patientName = selectedBill.patient_name || 'Patient';
              const patientPhone = selectedBill.patient_phone || (selectedBill as any).phone || 'N/A';
              const doctorName = (selectedBill as any).doctor_name || user?.fullName || 'Dr Verma';

              const totalAmt = Number(selectedBill.total_amount || (selectedBill as any).subtotal || 0);
              const paidAmt = Number(selectedBill.paid_amount ?? (isPaid ? totalAmt : 0));
              const dueAmt = isPaid ? 0 : Number(selectedBill.due_amount ?? Math.max(0, totalAmt - paidAmt));
              const subtotalAmt = Number((selectedBill as any).subtotal || totalAmt);
              const discountAmt = Number(selectedBill.discount_amount || 0);
              const taxAmt = Number(selectedBill.tax_amount || 0);

              const paymentMethod = String((selectedBill as any).payment_method || 'Cash').toUpperCase();
              const createdDateStr = selectedBill.created_at ? String(selectedBill.created_at).split('T')[0] : 'N/A';
              const apptDateStr = (selectedBill as any).appointment_date
                ? String((selectedBill as any).appointment_date).split('T')[0]
                : createdDateStr;

              const itemsList = Array.isArray(selectedBill.items) && selectedBill.items.length > 0
                ? selectedBill.items
                : [
                    {
                      id: 1,
                      service_name: (selectedBill as any).description || 'Consultant Fees',
                      quantity: 1,
                      unit_price: totalAmt,
                      total_price: totalAmt,
                    },
                  ];

              return (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
                  {/* Header Row */}
                  <View style={styles.receiptHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clinicTitle}>
                        {(selectedBill as any).clinic_name || 'Aarogya Care Clinic'}
                      </Text>
                      <Text style={styles.clinicSubtitle}>PATIENT CARE & TREATMENT SERVICES</Text>
                      <Text style={styles.clinicMeta}>
                        {(selectedBill as any).clinic_address || '102, Shree Heights, AB Road, 43, 3'}
                      </Text>
                      <Text style={styles.clinicMeta}>
                        {(selectedBill as any).clinic_phone || '9876543210'} | {(selectedBill as any).clinic_email || 'contact@aarogyacare.com'}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.invoiceBadgeTitle}>TREATMENT INVOICE</Text>
                      <Text style={styles.invoiceNumberText}>{billNum}</Text>
                      <Text style={styles.invoiceDateText}>Issued {createdDateStr}</Text>
                    </View>
                  </View>

                  {/* Accent Teal Divider Bar */}
                  <View style={styles.tealDivider} />

                  {/* Bill To & Doctor Row */}
                  <View style={styles.infoMetaGrid}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoMetaHeader}>BILL TO</Text>
                      <Text style={styles.patientNameVal}>{patientName}</Text>
                      <Text style={styles.infoMetaSub}>Phone: {patientPhone}</Text>
                    </View>

                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={styles.infoMetaHeader}>DOCTOR & APPOINTMENT</Text>
                      <Text style={styles.doctorNameVal}>{doctorName}</Text>
                      <Text style={styles.infoMetaSub}>Appointment: {apptDateStr}</Text>
                    </View>
                  </View>

                  {/* Payment Method & Status Banner */}
                  <View style={styles.paymentBannerRow}>
                    <Text style={styles.paymentMethodText}>
                      Payment Method: <Text style={{ fontWeight: '800' }}>{paymentMethod}</Text>
                    </Text>

                    <View
                      style={[
                        styles.statusBadgePill,
                        isPaid ? styles.paidPillBg : isPartial ? styles.partiallyPaidPillBg : styles.pendingPillBg,
                      ]}>
                      <Text
                        style={[
                          styles.statusBadgePillText,
                          isPaid ? styles.paidPillText : isPartial ? styles.partiallyPaidPillText : styles.pendingPillText,
                        ]}>
                        {isPaid ? '✓ Paid' : isPartial ? '🕒 Partially Paid' : '⚠️ Pending'}
                      </Text>
                    </View>
                  </View>

                  {/* Treatment & Service Items Table */}
                  <Text style={styles.itemsTableSectionTitle}>TREATMENT & SERVICE ITEMS</Text>
                  <View style={styles.itemsTableContainer}>
                    {/* Table Header Row */}
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.thCell, { width: 24 }]}>#</Text>
                      <Text style={[styles.thCell, { flex: 2 }]}>Item</Text>
                      <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>Qty</Text>
                      <Text style={[styles.thCell, { flex: 1.2, textAlign: 'right' }]}>Rate</Text>
                      <Text style={[styles.thCell, { flex: 0.9, textAlign: 'right' }]}>Disc.</Text>
                      <Text style={[styles.thCell, { flex: 1.2, textAlign: 'right' }]}>Total</Text>
                    </View>

                    {/* Table Body Rows */}
                    {itemsList.map((item: any, idx: number) => {
                      const q = Number(item.quantity || 1);
                      const r = Number(item.unit_price || item.total_price || 0);
                      const tot = Number(item.total_price || q * r || 0);
                      return (
                        <View key={idx} style={styles.tableBodyRow}>
                          <Text style={[styles.tdCell, { width: 24, color: '#94a3b8' }]}>{idx + 1}</Text>
                          <Text style={[styles.tdCell, { flex: 2, fontWeight: '700', color: '#0f172a' }]}>
                            {item.service_name}
                          </Text>
                          <Text style={[styles.tdCell, { flex: 0.8, textAlign: 'center' }]}>{q}</Text>
                          <Text style={[styles.tdCell, { flex: 1.2, textAlign: 'right' }]}>₹{r.toFixed(2)}</Text>
                          <Text style={[styles.tdCell, { flex: 0.9, textAlign: 'right' }]}>{item.discount_pct || 0}%</Text>
                          <Text style={[styles.tdCell, { flex: 1.2, textAlign: 'right', fontWeight: '800' }]}>
                            ₹{tot.toFixed(2)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Breakdown & Footer Notes */}
                  <View style={styles.breakdownRow}>
                    {/* Notes Side */}
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.notesTitle}>NOTES</Text>
                      <Text style={styles.notesText}>Thank you for choosing us for your care.</Text>
                      <Text style={styles.preparedByText}>
                        Prepared by: <Text style={{ fontWeight: '700' }}>{(selectedBill as any).accountant_name || doctorName}</Text>
                      </Text>
                    </View>

                    {/* Calculations Side */}
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={styles.calcLine}>
                        <Text style={styles.calcLabel}>Subtotal</Text>
                        <Text style={styles.calcVal}>₹{subtotalAmt.toFixed(2)}</Text>
                      </View>
                      <View style={styles.calcLine}>
                        <Text style={styles.calcLabel}>Discount</Text>
                        <Text style={styles.calcVal}>-₹{discountAmt.toFixed(2)}</Text>
                      </View>
                      <View style={styles.calcLine}>
                        <Text style={styles.calcLabel}>Tax</Text>
                        <Text style={styles.calcVal}>+₹{taxAmt.toFixed(2)}</Text>
                      </View>
                      <View style={[styles.calcLine, { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6, marginTop: 4 }]}>
                        <Text style={[styles.calcLabel, { fontWeight: '800', color: '#0f172a', fontSize: 15 }]}>Total</Text>
                        <Text style={[styles.calcVal, { fontWeight: '800', color: '#0f172a', fontSize: 16 }]}>
                          ₹{totalAmt.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.calcLine}>
                        <Text style={[styles.calcLabel, { color: '#166534', fontWeight: '700' }]}>Amount Paid</Text>
                        <Text style={[styles.calcVal, { color: '#166534', fontWeight: '800' }]}>
                          ₹{paidAmt.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.calcLine}>
                        <Text style={[styles.calcLabel, { color: '#991b1b', fontWeight: '700' }]}>Balance Due</Text>
                        <Text style={[styles.calcVal, { color: '#991b1b', fontWeight: '800' }]}>
                          ₹{dueAmt.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* System Generated Footer Banner */}
                  <View style={styles.systemFooterBanner}>
                    <Text style={styles.systemFooterText}>
                      This is a system-generated treatment invoice. Thank you for your visit.
                    </Text>
                  </View>

                  {/* Receipt Action Buttons Row: Download PDF, Print, Close */}
                  <View style={styles.receiptActionBtnRow}>
                    <TouchableOpacity
                      style={styles.downloadReceiptBtn}
                      disabled={pdfDownloading}
                      onPress={() => handleDownloadPdf(selectedBill.id)}>
                      {pdfDownloading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.downloadReceiptBtnText}>📥 Download PDF</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.printReceiptBtn}
                      onPress={handlePrintReceipt}>
                      <Text style={styles.printReceiptBtnText}>🖨 Print</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.closeReceiptBtn}
                      onPress={() => setDetailsModalVisible(false)}>
                      <Text style={styles.closeReceiptBtnText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              );
            })() : null}
          </View>
        </View>
      </Modal>

      {/* Full Screen Printable Invoice Sheet Modal (Mobile & Tablet) */}
      <Modal visible={printModalVisible} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          {/* Top Bar for Print Sheet */}
          <View style={styles.printHeaderBar}>
            <TouchableOpacity style={styles.backBtnPill} onPress={() => setPrintModalVisible(false)}>
              <Text style={styles.backBtnPillText}>‹ Back</Text>
            </TouchableOpacity>

            <Text style={styles.printHeaderTitle}>Treatment Invoice Sheet</Text>

            <TouchableOpacity style={styles.triggerPrintBtn} onPress={handlePrintReceipt}>
              <Text style={styles.triggerPrintBtnText}>🖨 Print / Save</Text>
            </TouchableOpacity>
          </View>

          {/* Render Full Invoice Paper */}
          {selectedBill ? (() => {
            const normStatus = String(selectedBill.status || '').toLowerCase();
            const isPaid = normStatus === 'paid' || normStatus === 'completed';
            const isPartial = normStatus === 'partial' || normStatus === 'partially_paid';

            const billNum = selectedBill.bill_number || (selectedBill.id ? `TB-C71-2026-0000${selectedBill.id}` : 'TB-C71-2026');
            const patientName = selectedBill.patient_name || 'Patient';
            const patientPhone = selectedBill.patient_phone || (selectedBill as any).phone || 'N/A';
            const doctorName = (selectedBill as any).doctor_name || user?.fullName || 'Dr Verma';

            const totalAmt = Number(selectedBill.total_amount || (selectedBill as any).subtotal || 0);
            const paidAmt = Number(selectedBill.paid_amount ?? (isPaid ? totalAmt : 0));
            const dueAmt = isPaid ? 0 : Number(selectedBill.due_amount ?? Math.max(0, totalAmt - paidAmt));
            const subtotalAmt = Number((selectedBill as any).subtotal || totalAmt);
            const discountAmt = Number(selectedBill.discount_amount || 0);
            const taxAmt = Number(selectedBill.tax_amount || 0);

            const paymentMethod = String((selectedBill as any).payment_method || 'Cash').toUpperCase();
            const createdDateStr = selectedBill.created_at ? String(selectedBill.created_at).split('T')[0] : 'N/A';
            const apptDateStr = (selectedBill as any).appointment_date
              ? String((selectedBill as any).appointment_date).split('T')[0]
              : createdDateStr;

            const itemsList = Array.isArray(selectedBill.items) && selectedBill.items.length > 0
              ? selectedBill.items
              : [
                  {
                    id: 1,
                    service_name: (selectedBill as any).description || 'Consultant Fees',
                    quantity: 1,
                    unit_price: totalAmt,
                    total_price: totalAmt,
                  },
                ];

            return (
              <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
                <View style={styles.a4PaperContainer}>
                  {/* Header Row */}
                  <View style={styles.receiptHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clinicTitle}>
                        {(selectedBill as any).clinic_name || 'Aarogya Care Clinic'}
                      </Text>
                      <Text style={styles.clinicSubtitle}>PATIENT CARE & TREATMENT SERVICES</Text>
                      <Text style={styles.clinicMeta}>
                        {(selectedBill as any).clinic_address || '102, Shree Heights, AB Road, 43, 3'}
                      </Text>
                      <Text style={styles.clinicMeta}>
                        {(selectedBill as any).clinic_phone || '9876543210'} | {(selectedBill as any).clinic_email || 'contact@aarogyacare.com'}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.invoiceBadgeTitle}>TREATMENT INVOICE</Text>
                      <Text style={styles.invoiceNumberText}>{billNum}</Text>
                      <Text style={styles.invoiceDateText}>Issued {createdDateStr}</Text>
                    </View>
                  </View>

                  {/* Accent Teal Divider Bar */}
                  <View style={styles.tealDivider} />

                  {/* Bill To & Doctor Row */}
                  <View style={styles.infoMetaGrid}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoMetaHeader}>BILL TO</Text>
                      <Text style={styles.patientNameVal}>{patientName}</Text>
                      <Text style={styles.infoMetaSub}>Phone: {patientPhone}</Text>
                    </View>

                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={styles.infoMetaHeader}>DOCTOR & APPOINTMENT</Text>
                      <Text style={styles.doctorNameVal}>{doctorName}</Text>
                      <Text style={styles.infoMetaSub}>Appointment: {apptDateStr}</Text>
                    </View>
                  </View>

                  {/* Payment Method & Status Banner */}
                  <View style={styles.paymentBannerRow}>
                    <Text style={styles.paymentMethodText}>
                      Payment Method: <Text style={{ fontWeight: '800' }}>{paymentMethod}</Text>
                    </Text>

                    <View
                      style={[
                        styles.statusBadgePill,
                        isPaid ? styles.paidPillBg : isPartial ? styles.partiallyPaidPillBg : styles.pendingPillBg,
                      ]}>
                      <Text
                        style={[
                          styles.statusBadgePillText,
                          isPaid ? styles.paidPillText : isPartial ? styles.partiallyPaidPillText : styles.pendingPillText,
                        ]}>
                        {isPaid ? '✓ Paid' : isPartial ? '🕒 Partially Paid' : '⚠️ Pending'}
                      </Text>
                    </View>
                  </View>

                  {/* Treatment & Service Items Table */}
                  <Text style={styles.itemsTableSectionTitle}>TREATMENT & SERVICE ITEMS</Text>
                  <View style={styles.itemsTableContainer}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.thCell, { width: 24 }]}>#</Text>
                      <Text style={[styles.thCell, { flex: 2 }]}>Item</Text>
                      <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>Qty</Text>
                      <Text style={[styles.thCell, { flex: 1.2, textAlign: 'right' }]}>Rate</Text>
                      <Text style={[styles.thCell, { flex: 0.9, textAlign: 'right' }]}>Disc.</Text>
                      <Text style={[styles.thCell, { flex: 1.2, textAlign: 'right' }]}>Total</Text>
                    </View>

                    {itemsList.map((item: any, idx: number) => {
                      const q = Number(item.quantity || 1);
                      const r = Number(item.unit_price || item.total_price || 0);
                      const tot = Number(item.total_price || q * r || 0);
                      return (
                        <View key={idx} style={styles.tableBodyRow}>
                          <Text style={[styles.tdCell, { width: 24, color: '#94a3b8' }]}>{idx + 1}</Text>
                          <Text style={[styles.tdCell, { flex: 2, fontWeight: '700', color: '#0f172a' }]}>
                            {item.service_name}
                          </Text>
                          <Text style={[styles.tdCell, { flex: 0.8, textAlign: 'center' }]}>{q}</Text>
                          <Text style={[styles.tdCell, { flex: 1.2, textAlign: 'right' }]}>₹{r.toFixed(2)}</Text>
                          <Text style={[styles.tdCell, { flex: 0.9, textAlign: 'right' }]}>{item.discount_pct || 0}%</Text>
                          <Text style={[styles.tdCell, { flex: 1.2, textAlign: 'right', fontWeight: '800' }]}>
                            ₹{tot.toFixed(2)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Breakdown & Footer Notes */}
                  <View style={styles.breakdownRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.notesTitle}>NOTES</Text>
                      <Text style={styles.notesText}>Thank you for choosing us for your care.</Text>
                      <Text style={styles.preparedByText}>
                        Prepared by: <Text style={{ fontWeight: '700' }}>{(selectedBill as any).accountant_name || doctorName}</Text>
                      </Text>
                    </View>

                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={styles.calcLine}>
                        <Text style={styles.calcLabel}>Subtotal</Text>
                        <Text style={styles.calcVal}>₹{subtotalAmt.toFixed(2)}</Text>
                      </View>
                      <View style={styles.calcLine}>
                        <Text style={styles.calcLabel}>Discount</Text>
                        <Text style={styles.calcVal}>-₹{discountAmt.toFixed(2)}</Text>
                      </View>
                      <View style={styles.calcLine}>
                        <Text style={styles.calcLabel}>Tax</Text>
                        <Text style={styles.calcVal}>+₹{taxAmt.toFixed(2)}</Text>
                      </View>
                      <View style={[styles.calcLine, { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6, marginTop: 4 }]}>
                        <Text style={[styles.calcLabel, { fontWeight: '800', color: '#0f172a', fontSize: 15 }]}>Total</Text>
                        <Text style={[styles.calcVal, { fontWeight: '800', color: '#0f172a', fontSize: 16 }]}>
                          ₹{totalAmt.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.calcLine}>
                        <Text style={[styles.calcLabel, { color: '#166534', fontWeight: '700' }]}>Amount Paid</Text>
                        <Text style={[styles.calcVal, { color: '#166534', fontWeight: '800' }]}>
                          ₹{paidAmt.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.calcLine}>
                        <Text style={[styles.calcLabel, { color: '#991b1b', fontWeight: '700' }]}>Balance Due</Text>
                        <Text style={[styles.calcVal, { color: '#991b1b', fontWeight: '800' }]}>
                          ₹{dueAmt.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Footer */}
                  <View style={styles.systemFooterBanner}>
                    <Text style={styles.systemFooterText}>
                      This is a system-generated treatment invoice. Thank you for your visit.
                    </Text>
                  </View>
                </View>
              </ScrollView>
            );
          })() : null}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 80 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  addBtn: { backgroundColor: '#0d9488', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  statVal: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  billList: { gap: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  billNo: { fontSize: 11, fontWeight: '800', color: '#0d9488' },
  patientName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  phoneText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  netAmount: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  dateText: { fontSize: 12, color: '#94a3b8', marginVertical: 4 },
  itemsBox: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 10, marginVertical: 6, gap: 4 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemTitle: { fontSize: 13, color: '#334155', fontWeight: '600' },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '800' },
  paidBg: { backgroundColor: '#dcfce7' },
  paidText: { color: '#166534', fontSize: 11, fontWeight: '800' },
  pendingBg: { backgroundColor: '#fef3c7' },
  pendingText: { color: '#92400e', fontSize: 11, fontWeight: '800' },
  pdfLink: { fontSize: 12, color: '#0369a1', fontWeight: '700' },
  loadingBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#64748b', fontWeight: '600' },
  emptyCard: { backgroundColor: '#ffffff', padding: 30, borderRadius: 16, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 },
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  subInfo: { fontSize: 13, color: '#64748b', marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  methodRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  methodBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, alignItems: 'center' },
  methodBtnActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  methodText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  methodTextActive: { color: '#ffffff' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center' },
  cancelText: { color: '#475569', fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: '#0d9488', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#ffffff', fontWeight: '800' },
  receiptContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    maxHeight: '92%',
    width: '96%',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  receiptHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clinicTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  clinicSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0d9488',
    marginTop: 2,
  },
  clinicMeta: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  invoiceBadgeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0d9488',
  },
  invoiceNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  invoiceDateText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  tealDivider: {
    height: 2,
    backgroundColor: '#0d9488',
    marginVertical: 12,
    borderRadius: 1,
  },
  infoMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoMetaHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 2,
  },
  patientNameVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  doctorNameVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  infoMetaSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  paymentBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e6fffa',
    borderWidth: 1,
    borderColor: '#99f6e4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 14,
  },
  paymentMethodText: {
    fontSize: 12,
    color: '#0f172a',
  },
  statusBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  paidPillBg: { backgroundColor: '#dcfce7' },
  paidPillText: { color: '#166534', fontSize: 10, fontWeight: '800' },
  partiallyPaidPillBg: { backgroundColor: '#dbeafe' },
  partiallyPaidPillText: { color: '#1e40af', fontSize: 10, fontWeight: '800' },
  pendingPillBg: { backgroundColor: '#fef3c7' },
  pendingPillText: { color: '#92400e', fontSize: 10, fontWeight: '800' },
  itemsTableSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 6,
  },
  itemsTableContainer: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 14,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  thCell: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  tableBodyRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  tdCell: {
    fontSize: 11,
    color: '#475569',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 8,
  },
  preparedByText: {
    fontSize: 11,
    color: '#475569',
  },
  calcLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  calcVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  systemFooterBanner: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    marginBottom: 14,
  },
  systemFooterText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },
  receiptActionBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  downloadReceiptBtn: {
    flex: 1.2,
    backgroundColor: '#0d9488',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  downloadReceiptBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  printReceiptBtn: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  printReceiptBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  closeReceiptBtn: {
    flex: 0.8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  invoiceBadgeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0d9488',
  },
  invoiceNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  invoiceDateText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  tealDivider: {
    height: 2,
    backgroundColor: '#0d9488',
    marginVertical: 12,
    borderRadius: 1,
  },
  infoMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoMetaHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 2,
  },
  patientNameVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  doctorNameVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  infoMetaSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  paymentBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e6fffa',
    borderWidth: 1,
    borderColor: '#99f6e4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 14,
  },
  paymentMethodText: {
    fontSize: 12,
    color: '#0f172a',
  },
  statusBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  paidPillBg: { backgroundColor: '#dcfce7' },
  paidPillText: { color: '#166534', fontSize: 10, fontWeight: '800' },
  partiallyPaidPillBg: { backgroundColor: '#dbeafe' },
  partiallyPaidPillText: { color: '#1e40af', fontSize: 10, fontWeight: '800' },
  pendingPillBg: { backgroundColor: '#fef3c7' },
  pendingPillText: { color: '#92400e', fontSize: 10, fontWeight: '800' },
  itemsTableSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 6,
  },
  itemsTableContainer: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 14,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  thCell: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  tableBodyRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  tdCell: {
    fontSize: 11,
    color: '#475569',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 8,
  },
  preparedByText: {
    fontSize: 11,
    color: '#475569',
  },
  calcLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  calcVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  systemFooterBanner: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    marginBottom: 14,
  },
  systemFooterText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },
  receiptActionBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  downloadReceiptBtn: {
    flex: 1.2,
    backgroundColor: '#0d9488',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  downloadReceiptBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  printReceiptBtn: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  printReceiptBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  closeReceiptBtn: {
    flex: 0.8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeReceiptBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  printHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  backBtnPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backBtnPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  printHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  triggerPrintBtn: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  triggerPrintBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  a4PaperContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  createModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    maxHeight: '94%',
    width: '98%',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  createModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  createModalSub: {
    fontSize: 11,
    color: '#64748b',
  },
  draftBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  draftBadgeText: {
    color: '#b45309',
    fontSize: 11,
    fontWeight: '700',
  },
  addServiceBtnHeader: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  addServiceBtnHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  serviceAdderBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  confirmAddServiceBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmAddServiceBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  patientSuggestionsBox: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#0d9488',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    maxHeight: 200,
  },
  patientSuggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  patientSuggestionText: {
    fontSize: 12,
  },
  recordsBadge: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recordsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  emptyPrescriptionBox: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginTop: 6,
  },
  emptyPrescriptionText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  prescriptionCardItem: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  formSectionBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  gridTwoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  helperText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 14,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  chipBtnActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  dropdownSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  dropdownSelectorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  dropdownArrow: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '800',
  },
  dropdownMenuBox: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownMenuItemActive: {
    backgroundColor: '#e6fffa',
  },
  dropdownMenuText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  dropdownMenuTextActive: {
    color: '#0d9488',
    fontWeight: '800',
  },
  addServiceBtn: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addServiceBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  adderRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  emptyItemsBox: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#f8fafc',
  },
  emptyItemsText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  serviceItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryGridBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryCell: {
    width: '33.33%',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 3,
  },
  createModalFooter: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  cancelBtnPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  cancelBtnPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  createBillBtnPill: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0d9488',
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  createBillBtnPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});

export default TreatmentBillingScreen;
