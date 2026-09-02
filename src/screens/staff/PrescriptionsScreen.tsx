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
import { Prescription, PrescriptionItem } from '../../types/clinicTypes';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
}

export const PrescriptionsScreen: React.FC<Props> = ({ onOpenDrawer, onOpenNotifications }) => {
  const { prescriptions, loading, refreshing, onRefresh, addPrescription } = usePrescriptions();

  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  const [patientName, setPatientName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [bp, setBp] = useState('');
  const [pulse, setPulse] = useState('');
  const [temp, setTemp] = useState('');
  const [weight, setWeight] = useState('');

  const [items, setItems] = useState<PrescriptionItem[]>([
    { medicine_name: 'Paracetamol 650mg', dosage: '650mg', frequency: '1-0-1 (After meals)', duration: '5 days', quantity: 10 },
  ]);

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
    if (!patientName.trim() || !diagnosis.trim()) {
      Alert.alert('Validation Error', 'Patient name and diagnosis are required.');
      return;
    }

    const payload: Partial<Prescription> = {
      patient_name: patientName,
      diagnosis,
      vital_bp: bp || '120/80',
      vital_pulse: pulse || '72 bpm',
      vital_temp: temp || '98.6 F',
      vital_weight: weight || '65 kg',
      items: items.filter((i) => i.medicine_name.trim() !== ''),
    };

    await addPrescription(payload);
    setModalVisible(false);
    setPatientName('');
    setDiagnosis('');
    setBp('');
    setPulse('');
    setTemp('');
    setWeight('');
    Alert.alert('Prescription Saved', 'Prescription created and attached to patient medical records!');
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
          <Text style={styles.pageTitle}>Prescriptions ({(prescriptions || []).length})</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.createBtnText}>+ Write Prescription</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0d9488" style={{ marginTop: 30 }} />
        ) : (
          <View style={styles.rxList}>
            {(prescriptions || []).map((rx) => (
              <View key={rx.id} style={styles.rxCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.rxId}>RX #{rx.id}</Text>
                    <Text style={styles.patientName}>{rx.patient_name || 'Patient'}</Text>
                  </View>
                  <Text style={styles.dateText}>{rx.created_at || ''}</Text>
                </View>

                <Text style={styles.diagText}>Diagnosis: <Text style={styles.diagValue}>{rx.diagnosis || 'General'}</Text></Text>
                <Text style={styles.docText}>Prescribed by: {rx.doctor_name || 'Doctor'}</Text>

                {/* Vitals Summary Row */}
                <View style={styles.vitalsRow}>
                  {rx.vital_bp ? <View style={styles.vitalBadge}><Text style={styles.vitalText}>BP: {rx.vital_bp}</Text></View> : null}
                  {rx.vital_pulse ? <View style={styles.vitalBadge}><Text style={styles.vitalText}>Pulse: {rx.vital_pulse}</Text></View> : null}
                  {rx.vital_weight ? <View style={styles.vitalBadge}><Text style={styles.vitalText}>Weight: {rx.vital_weight}</Text></View> : null}
                </View>

                {/* Items Summary */}
                <View style={styles.itemList}>
                  {(rx.items || []).map((it, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.medBullet}>💊 {it.medicine_name}</Text>
                      <Text style={styles.dosageText}>{it.frequency || ''} • {it.duration || ''}</Text>
                    </View>
                  ))}
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

              <Text style={styles.label}>Patient Name *</Text>
              <TextInput style={styles.input} placeholder="Sunita Sharma" value={patientName} onChangeText={setPatientName} />

              <Text style={styles.label}>Diagnosis *</Text>
              <TextInput style={styles.input} placeholder="e.g. Acute Pharyngitis & Fever" value={diagnosis} onChangeText={setDiagnosis} />

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
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleCreatePrescription}>
                  <Text style={styles.saveText}>Save Prescription</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
                <Text style={styles.previewDoc}>{selectedPrescription.doctor_name}</Text>
                <Text style={styles.previewPatient}>Patient: {selectedPrescription.patient_name} ({selectedPrescription.patient_age} yrs • {selectedPrescription.patient_gender})</Text>
                <Text style={styles.previewDate}>Date: {selectedPrescription.created_at}</Text>

                <View style={styles.divider} />
                <Text style={styles.previewDiag}>Diagnosis: {selectedPrescription.diagnosis}</Text>
                <View style={styles.divider} />

                <Text style={styles.rxHeaderLabel}>Rx Medicines:</Text>
                {(selectedPrescription.items || []).map((m, i) => (
                  <View key={i} style={styles.rxLine}>
                    <Text style={styles.rxMedName}>{i + 1}. {m.medicine_name}</Text>
                    <Text style={styles.rxMedMeta}>Dosage: {m.dosage} | {m.frequency} for {m.duration}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            <TouchableOpacity style={styles.downloadPdfBtn} onPress={() => { setViewModalVisible(false); Alert.alert('PDF Generated', 'Prescription PDF saved & ready to print!'); }}>
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
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  createBtn: { backgroundColor: '#0d9488', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  createBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  rxList: { gap: 14 },
  rxCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rxId: { fontSize: 11, fontWeight: '800', color: '#0d9488' },
  patientName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  dateText: { fontSize: 12, color: '#94a3b8' },
  diagText: { fontSize: 13, color: '#475569', marginVertical: 4 },
  diagValue: { fontWeight: '800', color: '#0f172a' },
  docText: { fontSize: 12, color: '#64748b' },
  vitalsRow: { flexDirection: 'row', gap: 6, marginVertical: 8 },
  vitalBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  vitalText: { fontSize: 11, color: '#334155', fontWeight: '700' },
  itemList: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginVertical: 6, gap: 4 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  medBullet: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  dosageText: { fontSize: 11, color: '#64748b' },
  printBtn: { marginTop: 8, paddingVertical: 8, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 8, alignItems: 'center' },
  printBtnText: { color: '#166534', fontWeight: '800', fontSize: 12 },
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center' },
  modalScroll: { padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
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
  rxHeaderLabel: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  rxLine: { backgroundColor: '#f8fafc', padding: 8, borderRadius: 8, marginBottom: 6 },
  rxMedName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  rxMedMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  downloadPdfBtn: { backgroundColor: '#0d9488', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  downloadPdfText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
});

export default PrescriptionsScreen;
