import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { usePrescriptions } from '../../hooks/usePrescriptions';
import { usePatients } from '../../hooks/usePatients';
import { useAppointments } from '../../hooks/useAppointments';
import { useAuthContext } from '../../context/AuthContext';
import { Prescription, PrescriptionItem, PatientModel, Appointment } from '../../types/clinicTypes';
import { generatePrescriptionHtml, printOrDownloadPdf } from '../../utils/pdfGenerator';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
}

export const PrescriptionsScreen: React.FC<Props> = ({ onOpenDrawer, onOpenNotifications }) => {
  const { user } = useAuthContext();
  const { prescriptions, loading, refreshing, onRefresh, addPrescription } = usePrescriptions();
  const { patients } = usePatients();
  const { appointments, bookAppointment } = useAppointments();

  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [patientPickerVisible, setPatientPickerVisible] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  const [selectedPatient, setSelectedPatient] = useState<PatientModel | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [bp, setBp] = useState('');
  const [pulse, setPulse] = useState('');
  const [temp, setTemp] = useState('');
  const [weight, setWeight] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [items, setItems] = useState<PrescriptionItem[]>([
    { medicine_name: 'Paracetamol 650mg', dosage: '650mg', frequency: '1-0-1 (After meals)', duration: '5 days', quantity: 10 },
  ]);

  const filteredPrescriptions = (prescriptions || []).filter((rx) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (rx.patient_name || '').toLowerCase().includes(q) ||
      (rx.diagnosis || '').toLowerCase().includes(q) ||
      String(rx.id).includes(q) ||
      (rx.doctor_name || '').toLowerCase().includes(q)
    );
  });

  const handleSelectPatient = (patient: PatientModel) => {
    setSelectedPatient(patient);
    setPatientPickerVisible(false);

    // Look for an existing appointment for this patient
    const foundAppt = appointments.find(
      (a) => Number(a.patient_id) === Number(patient.id) && a.status !== 'cancelled'
    );
    setSelectedAppointment(foundAppt || null);
  };

  const addLineItem = () => {
    setItems([
      ...items,
      { medicine_name: '', dosage: '500mg', frequency: '1-0-1 (After meals)', duration: '5 days', quantity: 10 },
    ]);
  };

  const updateItemField = (index: number, field: keyof PrescriptionItem, val: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = val;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCreatePrescription = async () => {
    if (!selectedPatient) {
      Alert.alert('Validation Error', 'Please select a patient for the prescription.');
      return;
    }

    if (!diagnosis.trim()) {
      Alert.alert('Validation Error', 'Diagnosis is required.');
      return;
    }

    const validItems = items.filter((i) => i.medicine_name && i.medicine_name.trim() !== '');
    if (validItems.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one medicine item with a name.');
      return;
    }

    setSubmitting(true);
    try {
      let appointmentId = selectedAppointment?.id;

      // If no existing appointment was found for this patient, create an active consultation appointment today
      if (!appointmentId) {
        const todayStr = new Date().toISOString().split('T')[0];
        const doctorId = user?.userId || user?.id || 1;
        const apptRes = await bookAppointment({
          patient_id: selectedPatient.id,
          doctor_id: Number(doctorId),
          appointment_date: todayStr,
          appointment_time: '10:00',
          consultation_mode: 'in_person',
          status: 'approved',
          reason: 'Direct Prescription Consultation',
        });

        if (apptRes.success && apptRes.data) {
          appointmentId = (apptRes.data as any).id || (apptRes.data as any).insertId;
        }
      }

      const payload: Partial<Prescription> = {
        clinic_id: Number(user?.clinicId || user?.clinic_id || 1),
        patient_id: selectedPatient.id,
        appointment_id: appointmentId || 1,
        doctor_id: Number(user?.userId || user?.id || 1),
        patient_name: selectedPatient.full_name,
        patient_age: Number(selectedPatient.age || 30),
        patient_gender: selectedPatient.gender || 'General',
        diagnosis: diagnosis.trim(),
        symptoms: symptoms.trim() || 'General Consultation',
        vital_bp: bp || '120/80',
        vital_pulse: pulse || '72 bpm',
        vital_temp: temp || '98.6 F',
        vital_weight: weight || '65 kg',
        items: validItems,
      };

      const res = await addPrescription(payload);

      if (res.success) {
        setModalVisible(false);
        setSelectedPatient(null);
        setSelectedAppointment(null);
        setDiagnosis('');
        setSymptoms('');
        setBp('');
        setPulse('');
        setTemp('');
        setWeight('');
        setItems([
          { medicine_name: 'Paracetamol 650mg', dosage: '650mg', frequency: '1-0-1 (After meals)', duration: '5 days', quantity: 10 },
        ]);
        Alert.alert('Prescription Saved', 'Prescription saved to database successfully!');
      } else {
        const errMsg = typeof res.message === 'string' ? res.message : 'Failed to save prescription';
        Alert.alert('Error Saving Prescription', errMsg);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Prescription Manager"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0d9488']} />
        }>
        {/* Top Header */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.pageTitle}>Prescriptions ({filteredPrescriptions.length})</Text>
            <Text style={styles.pageSub}>Manage & Issuing Electronic Health Prescriptions</Text>
          </View>
          <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.createBtnText}>+ Write Rx</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by patient, diagnosis, or Rx ID..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0d9488" style={{ marginTop: 30 }} />
        ) : filteredPrescriptions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>💊</Text>
            <Text style={styles.emptyTitle}>No Prescriptions Found</Text>
            <Text style={styles.emptySub}>No prescription records in database matching your filter.</Text>
          </View>
        ) : (
          <View style={styles.rxList}>
            {filteredPrescriptions.map((rx) => (
              <View key={rx.id} style={styles.rxCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.rxId}>RX #{rx.id}</Text>
                    <Text style={styles.patientName}>{rx.patient_name || 'Patient'}</Text>
                  </View>
                  <Text style={styles.dateText}>{rx.created_at ? new Date(rx.created_at).toLocaleDateString() : ''}</Text>
                </View>

                <Text style={styles.diagText}>Diagnosis: <Text style={styles.diagValue}>{rx.diagnosis || 'General'}</Text></Text>
                <Text style={styles.docText}>Prescribed by: {rx.doctor_name || user?.fullName || 'Doctor'}</Text>

                {/* Vitals Summary Row */}
                <View style={styles.vitalsRow}>
                  {rx.vital_bp ? <View style={styles.vitalBadge}><Text style={styles.vitalText}>BP: {rx.vital_bp}</Text></View> : null}
                  {rx.vital_pulse ? <View style={styles.vitalBadge}><Text style={styles.vitalText}>Pulse: {rx.vital_pulse}</Text></View> : null}
                  {rx.vital_weight ? <View style={styles.vitalBadge}><Text style={styles.vitalText}>Weight: {rx.vital_weight}</Text></View> : null}
                </View>

                {/* Items Summary */}
                <View style={styles.itemList}>
                  {(rx.items || []).length === 0 ? (
                    <Text style={styles.noMedText}>No specific items listed.</Text>
                  ) : (
                    (rx.items || []).map((it, idx) => (
                      <View key={idx} style={styles.itemRow}>
                        <Text style={styles.medBullet}>💊 {it.medicine_name}</Text>
                        <Text style={styles.dosageText}>{it.frequency || ''} • {it.duration || ''}</Text>
                      </View>
                    ))
                  )}
                </View>

                <TouchableOpacity
                  style={styles.printBtn}
                  onPress={() => {
                    setSelectedPrescription(rx);
                    setViewModalVisible(true);
                  }}>
                  <Text style={styles.printBtnText}>📄 View & Print PDF</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Write Prescription Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Write New Prescription</Text>

              {/* Patient Selector */}
              <Text style={styles.label}>Select Patient *</Text>
              <TouchableOpacity
                style={styles.pickerSelectBtn}
                onPress={() => setPatientPickerVisible(true)}>
                <Text style={selectedPatient ? styles.pickerSelectTextActive : styles.pickerSelectTextPlaceholder}>
                  {selectedPatient
                    ? `👤 ${selectedPatient.full_name} (${(selectedPatient as any).patient_code || `PT-${selectedPatient.id}`})`
                    : 'Select Patient from Directory...'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              {selectedPatient ? (
                <View style={styles.patientMetaBadge}>
                  <Text style={styles.patientMetaText}>
                    Gender: {selectedPatient.gender || 'General'} | Phone: {selectedPatient.phone}
                  </Text>
                  {selectedAppointment ? (
                    <Text style={styles.apptLinkedText}>✓ Linked to Appointment #{selectedAppointment.id}</Text>
                  ) : (
                    <Text style={styles.apptAutoText}>ℹ️ Will auto-link a consultation appointment</Text>
                  )}
                </View>
              ) : null}

              <Text style={styles.label}>Diagnosis *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Acute Pharyngitis & Fever"
                value={diagnosis}
                onChangeText={setDiagnosis}
              />

              <Text style={styles.label}>Symptoms / Clinical Notes</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Cough, sore throat, elevated temperature"
                value={symptoms}
                onChangeText={setSymptoms}
              />

              {/* Vitals Section */}
              <Text style={styles.sectionHeader}>Patient Vitals</Text>
              <View style={styles.vitalGrid}>
                <TextInput style={styles.vitalInput} placeholder="BP (120/80)" value={bp} onChangeText={setBp} />
                <TextInput style={styles.vitalInput} placeholder="Pulse (72 bpm)" value={pulse} onChangeText={setPulse} />
                <TextInput style={styles.vitalInput} placeholder="Temp (98.6 F)" value={temp} onChangeText={setTemp} />
                <TextInput style={styles.vitalInput} placeholder="Weight (65 kg)" value={weight} onChangeText={setWeight} />
              </View>

              {/* Line Items */}
              <View style={styles.itemSectionHeader}>
                <Text style={styles.sectionHeader}>Medicines & Dosage</Text>
                <TouchableOpacity onPress={addLineItem}>
                  <Text style={styles.addItemText}>+ Add Medicine</Text>
                </TouchableOpacity>
              </View>

              {items.map((item, index) => (
                <View key={index} style={styles.lineItemBox}>
                  <View style={styles.lineItemHeader}>
                    <Text style={styles.itemNum}>Medicine #{index + 1}</Text>
                    {items.length > 1 ? (
                      <TouchableOpacity onPress={() => removeItem(index)}>
                        <Text style={styles.removeText}>✕</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Medicine Name (e.g. Paracetamol 650mg)"
                    value={item.medicine_name}
                    onChangeText={(val) => updateItemField(index, 'medicine_name', val)}
                  />
                  <View style={styles.rowTwo}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Frequency (1-0-1)"
                      value={item.frequency}
                      onChangeText={(val) => updateItemField(index, 'frequency', val)}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Duration (5 days)"
                      value={item.duration}
                      onChangeText={(val) => updateItemField(index, 'duration', val)}
                    />
                  </View>
                </View>
              ))}

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                  disabled={submitting}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleCreatePrescription}
                  disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.saveText}>Save Prescription</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Patient Selection Modal */}
      <Modal visible={patientPickerVisible} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.pickerModalCard}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Patient</Text>
              <TouchableOpacity onPress={() => setPatientPickerVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 350 }}>
              {(patients || []).length === 0 ? (
                <Text style={{ padding: 16, color: '#64748b', textAlign: 'center' }}>No patients found in directory.</Text>
              ) : (
                (patients || []).map((pt) => (
                  <TouchableOpacity
                    key={pt.id}
                    style={styles.patientOptionRow}
                    onPress={() => handleSelectPatient(pt)}>
                    <View style={styles.avatarCircleSmall}>
                      <Text style={styles.avatarLetterSmall}>{(pt.full_name || 'P').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ptOptionName}>{pt.full_name}</Text>
                      <Text style={styles.ptOptionSub}>
                        {(pt as any).patient_code || `PT-${pt.id}`} • 📞 {pt.phone}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View Prescription Preview Modal */}
      <Modal visible={viewModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>🏥 Arogya Super Specialty Clinic</Text>
              <TouchableOpacity onPress={() => setViewModalVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedPrescription ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.previewRxNo}>PRESCRIPTION ID #{selectedPrescription.id}</Text>
                <Text style={styles.previewDoc}>{selectedPrescription.doctor_name || user?.fullName || 'Doctor'}</Text>
                <Text style={styles.previewPatient}>
                  Patient: {selectedPrescription.patient_name} ({selectedPrescription.patient_age || 30} yrs • {selectedPrescription.patient_gender || 'General'})
                </Text>
                <Text style={styles.previewDate}>Date: {selectedPrescription.created_at ? new Date(selectedPrescription.created_at).toLocaleDateString() : ''}</Text>

                <View style={styles.divider} />
                <Text style={styles.previewDiag}>Diagnosis: {selectedPrescription.diagnosis}</Text>
                {selectedPrescription.symptoms ? (
                  <Text style={styles.previewSymptoms}>Symptoms: {selectedPrescription.symptoms}</Text>
                ) : null}

                {/* Vitals Summary */}
                <View style={styles.vitalsRow}>
                  {selectedPrescription.vital_bp ? <View style={styles.vitalBadge}><Text style={styles.vitalText}>BP: {selectedPrescription.vital_bp}</Text></View> : null}
                  {selectedPrescription.vital_pulse ? <View style={styles.vitalBadge}><Text style={styles.vitalText}>Pulse: {selectedPrescription.vital_pulse}</Text></View> : null}
                  {selectedPrescription.vital_temp ? <View style={styles.vitalBadge}><Text style={styles.vitalText}>Temp: {selectedPrescription.vital_temp}</Text></View> : null}
                  {selectedPrescription.vital_weight ? <View style={styles.vitalBadge}><Text style={styles.vitalText}>Weight: {selectedPrescription.vital_weight}</Text></View> : null}
                </View>

                <View style={styles.divider} />

                <Text style={styles.rxHeaderLabel}>Rx Medicines:</Text>
                {(selectedPrescription.items || []).length === 0 ? (
                  <Text style={{ color: '#64748b', fontSize: 13 }}>No medicines listed for this prescription.</Text>
                ) : (
                  (selectedPrescription.items || []).map((m, i) => (
                    <View key={i} style={styles.rxLine}>
                      <Text style={styles.rxMedName}>{i + 1}. {m.medicine_name}</Text>
                      <Text style={styles.rxMedMeta}>Dosage: {m.dosage || 'Standard'} | {m.frequency || 'Daily'} for {m.duration || 'As directed'}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            ) : null}

            <TouchableOpacity
              style={styles.downloadPdfBtn}
              onPress={() => {
                if (selectedPrescription) {
                  const html = generatePrescriptionHtml({
                    rxNumber: `RX-${selectedPrescription.id}`,
                    patientName: selectedPrescription.patient_name || 'Patient',
                    patientAge: selectedPrescription.patient_age || 30,
                    patientGender: selectedPrescription.patient_gender || 'Male',
                    patientPhone: selectedPrescription.patient_phone || '',
                    doctorName: selectedPrescription.doctor_name || 'Dr. Sharma',
                    doctorSpecialization: selectedPrescription.doctor_specialization || 'General Physician',
                    date: selectedPrescription.created_at ? new Date(selectedPrescription.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
                    diagnosis: selectedPrescription.diagnosis,
                    symptoms: selectedPrescription.symptoms,
                    advice: selectedPrescription.advice,
                    medicines: selectedPrescription.items || [],
                  });
                  printOrDownloadPdf(html, `Prescription_${selectedPrescription.patient_name}`);
                }
              }}>
              <Text style={styles.downloadPdfText}>📥 Print / Download PDF</Text>
            </TouchableOpacity>
          </View>
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
  pageSub: { fontSize: 12, color: '#64748b', marginTop: 1 },
  createBtn: { backgroundColor: '#0d9488', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  createBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14 },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a' },
  clearText: { color: '#94a3b8', fontSize: 14, fontWeight: 'bold' },
  emptyCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginTop: 20 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4 },
  rxList: { gap: 14 },
  rxCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rxId: { fontSize: 11, fontWeight: '800', color: '#0d9488' },
  patientName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  dateText: { fontSize: 12, color: '#94a3b8' },
  diagText: { fontSize: 13, color: '#475569', marginVertical: 4 },
  diagValue: { fontWeight: '800', color: '#0f172a' },
  docText: { fontSize: 12, color: '#64748b' },
  vitalsRow: { flexDirection: 'row', gap: 6, marginVertical: 8, flexWrap: 'wrap' },
  vitalBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  vitalText: { fontSize: 11, color: '#334155', fontWeight: '700' },
  itemList: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginVertical: 6, gap: 4 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  medBullet: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  dosageText: { fontSize: 11, color: '#64748b' },
  noMedText: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  printBtn: { marginTop: 8, paddingVertical: 8, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 8, alignItems: 'center' },
  printBtnText: { color: '#166534', fontWeight: '800', fontSize: 12 },
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center' },
  modalScroll: { padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  pickerSelectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#f8fafc' },
  pickerSelectTextPlaceholder: { fontSize: 14, color: '#94a3b8' },
  pickerSelectTextActive: { fontSize: 14, color: '#0f172a', fontWeight: '700' },
  dropdownArrow: { fontSize: 12, color: '#64748b' },
  patientMetaBadge: { backgroundColor: '#f0fdf4', padding: 8, borderRadius: 8, marginTop: 6, borderWidth: 1, borderColor: '#bbf7d0' },
  patientMetaText: { fontSize: 11, color: '#166534', fontWeight: '700' },
  apptLinkedText: { fontSize: 11, color: '#0d9488', fontWeight: '800', marginTop: 2 },
  apptAutoText: { fontSize: 11, color: '#d97706', fontWeight: '700', marginTop: 2 },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginTop: 12, marginBottom: 6 },
  vitalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vitalInput: { width: '48%', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: '#0f172a' },
  itemSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  addItemText: { color: '#0d9488', fontWeight: '800', fontSize: 13 },
  lineItemBox: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginVertical: 6, gap: 6 },
  lineItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemNum: { fontSize: 12, fontWeight: '800', color: '#475569' },
  removeText: { color: '#ef4444', fontWeight: '900', fontSize: 16 },
  rowTwo: { flexDirection: 'row', gap: 6 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center' },
  cancelText: { color: '#475569', fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: '#0d9488', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#ffffff', fontWeight: '800' },
  pickerModalCard: { backgroundColor: '#ffffff', margin: 20, borderRadius: 16, padding: 16, maxHeight: '70%' },
  pickerModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 8 },
  pickerModalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  patientOptionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc', gap: 10 },
  avatarCircleSmall: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#0d9488', alignItems: 'center', justifyContent: 'center' },
  avatarLetterSmall: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  ptOptionName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  ptOptionSub: { fontSize: 11, color: '#64748b', marginTop: 1 },
  previewCard: { backgroundColor: '#ffffff', margin: 20, borderRadius: 16, padding: 20, maxHeight: '80%' },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  previewTitle: { fontSize: 16, fontWeight: '900', color: '#0d9488' },
  closeText: { fontSize: 18, color: '#94a3b8', fontWeight: 'bold' },
  previewRxNo: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  previewDoc: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  previewPatient: { fontSize: 13, color: '#334155', marginTop: 2 },
  previewDate: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 10 },
  previewDiag: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  previewSymptoms: { fontSize: 12, color: '#475569', marginTop: 2 },
  rxHeaderLabel: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  rxLine: { backgroundColor: '#f8fafc', padding: 8, borderRadius: 8, marginBottom: 6 },
  rxMedName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  rxMedMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  downloadPdfBtn: { backgroundColor: '#0d9488', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  downloadPdfText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
});

export default PrescriptionsScreen;
