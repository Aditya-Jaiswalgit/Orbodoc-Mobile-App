import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Download,
  FileText,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  UserRound,
  X,
} from 'lucide-react-native';
import { AppModal } from '../../components/common/AppModal';
import { StaffHeader } from '../../components/common/StaffHeader';
import { Pagination } from '../../components/common/Pagination';
import { useAuthContext } from '../../context/AuthContext';
import { fetchPatientsApi } from '../../api/patientApi';
import { getMedicinesApi } from '../../api/medicineApi';
import {
  createPrescriptionApi,
  deletePrescriptionItemApi,
  downloadPrescriptionPdfApi,
  getPrescriptionByIdApi,
  getPrescriptionsApi,
  updatePrescriptionApi,
} from '../../api/prescriptionApi';
import { Prescription, PrescriptionItem, PatientModel, Medicine } from '../../types/clinicTypes';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

interface Props {
  onOpenDrawer: () => void;
  appointmentId?: string;
}

interface PrescriptionTest {
  id?: number | string;
  test_name: string;
  test_type?: string;
  priority?: string;
  instructions?: string;
  price?: number;
}

interface PrescriptionFormState {
  patient_id: string;
  appointment_id: string;
  symptoms: string;
  diagnosis: string;
  advice: string;
  follow_up_days: string;
  items: PrescriptionItem[];
  tests: PrescriptionTest[];
}

const emptyMedicine = (): PrescriptionItem => ({
  medicine_name: '', dosage: '', frequency: '', duration: '', quantity: 1, instructions: '',
});
const emptyTest = (): PrescriptionTest => ({
  test_name: '', test_type: 'General', priority: 'routine', instructions: '', price: 0,
});
const emptyForm = (appointmentId = ''): PrescriptionFormState => ({
  patient_id: '', appointment_id: appointmentId, symptoms: '', diagnosis: '', advice: '',
  follow_up_days: '', items: [emptyMedicine()], tests: [],
});

const rowsFrom = <T,>(response: any, keys: string[] = []): T[] => {
  const root = response?.data;
  if (Array.isArray(root)) return root as T[];
  for (const key of keys) {
    if (Array.isArray(root?.[key])) return root[key] as T[];
  }
  if (Array.isArray(root?.data)) return root.data as T[];
  if (Array.isArray(root?.prescriptions?.data)) return root.prescriptions.data as T[];
  return [];
};

const prescriptionFrom = (response: any): Prescription | null => {
  const value = response?.data?.prescription || response?.data;
  return value && typeof value === 'object' ? value as Prescription : null;
};

const displayDate = (value?: string) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const PrescriptionsScreen: React.FC<Props> = ({ onOpenDrawer, appointmentId }) => {
  const { token, user, activeClinicId } = useAuthContext();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<PatientModel[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [query, setQuery] = useState('');
  const [patientQuery, setPatientQuery] = useState('');
  const [medicineQuery, setMedicineQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PrescriptionFormState>(() => emptyForm(appointmentId));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async (pull = false) => {
    if (!token) { setLoading(false); return; }
    pull ? setRefreshing(true) : setLoading(true);
    try {
      const [rxResponse, patientResponse, medicineResponse] = await Promise.all([
        getPrescriptionsApi(token, { clinic_id: activeClinicId || undefined, search: query.trim() || undefined, limit: 100, page: 1 }),
        fetchPatientsApi({ clinic_id: activeClinicId, page: 1, limit: 100 }, token),
        getMedicinesApi(token, { clinic_id: activeClinicId, page: 1, limit: 100, is_active: 1 }),
      ]);
      if (!rxResponse.success) throw new Error(rxResponse.message || 'Could not load prescriptions.');
      const rxRows = rowsFrom<Prescription>(rxResponse, ['prescriptions']);
      setPrescriptions(rxRows);
      if (patientResponse.success) setPatients(rowsFrom<PatientModel>(patientResponse, ['patients']));
      if (medicineResponse.success) setMedicines(rowsFrom<Medicine>(medicineResponse, ['medicines']));
    } catch (error) {
      showErrorToast('Prescriptions', error instanceof Error ? error.message : 'Could not load prescriptions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeClinicId, query, token]);

  useEffect(() => { void load(); }, [load]);

  const selectedPatient = patients.find(patient => String(patient.id) === form.patient_id);
  const visiblePatients = useMemo(() => {
    const needle = patientQuery.trim().toLowerCase();
    return patients.filter(patient => !needle || `${patient.full_name} ${patient.phone} ${patient.patient_code || ''}`.toLowerCase().includes(needle)).slice(0, 8);
  }, [patients, patientQuery]);
  const visibleMedicines = useMemo(() => {
    const needle = medicineQuery.trim().toLowerCase();
    return medicines.filter(medicine => !needle || `${medicine.name} ${medicine.generic_name || ''}`.toLowerCase().includes(needle)).slice(0, 8);
  }, [medicines, medicineQuery]);
  const totalPages = Math.max(1, Math.ceil(prescriptions.length / pageSize));
  const pageRows = prescriptions.slice((page - 1) * pageSize, page * pageSize);

  const openCreate = () => {
    setEditingId(null);
    setSelected(null);
    setForm(emptyForm(appointmentId));
    setPatientQuery('');
    setMedicineQuery('');
    setFormOpen(true);
  };

  const openEdit = useCallback(async (prescription: Prescription) => {
    if (!token) return;
    try {
      const response = await getPrescriptionByIdApi(token, Number(prescription.id));
      if (!response.success) throw new Error(response.message || 'Could not open prescription.');
      const detail = prescriptionFrom(response) || prescription;
      setSelected(detail);
      setEditingId(Number(detail.id));
      setForm({
        patient_id: String(detail.patient_id || ''),
        appointment_id: String(detail.appointment_id || ''),
        symptoms: detail.symptoms || '',
        diagnosis: detail.diagnosis || '',
        advice: (detail as any).advice || detail.notes || '',
        follow_up_days: String((detail as any).follow_up_days || ''),
        items: Array.isArray(detail.items) && detail.items.length ? detail.items.map(item => ({ ...item, instructions: item.instructions || (item as any).instruction || '' })) : [emptyMedicine()],
        tests: Array.isArray((detail as any).tests) ? (detail as any).tests.map((test: any) => ({ ...test, instructions: test.instructions || test.description || '' })) : [],
      });
      setFormOpen(true);
    } catch (error) {
      showErrorToast('Prescription', error instanceof Error ? error.message : 'Could not open prescription.');
    }
  }, [token]);

  useEffect(() => {
    if (!appointmentId || !token) return;
    let active = true;
    void getPrescriptionsApi(token, { appointment_id: appointmentId, limit: 50, page: 1 })
      .then(response => {
        if (!active || !response.success) return;
        const existing = rowsFrom<Prescription>(response, ['prescriptions'])
          .find(item => String(item.appointment_id) === String(appointmentId));
        if (existing) void openEdit(existing);
      })
      .catch(error => {
        if (active) showErrorToast('Prescription', error instanceof Error ? error.message : 'Could not load appointment prescription.');
      });
    return () => { active = false; };
  }, [appointmentId, openEdit, token]);

  const savePrescription = async () => {
    if (!token) return;
    if (!form.patient_id) { showErrorToast('Select patient', 'Choose a patient before saving the prescription.'); return; }
    if (!form.diagnosis.trim()) { showErrorToast('Diagnosis required', 'Enter the diagnosis before saving.'); return; }
    const payload: Record<string, unknown> = {
      clinic_id: activeClinicId || undefined,
      doctor_id: user?.id,
      patient_id: Number(form.patient_id),
      appointment_id: form.appointment_id ? Number(form.appointment_id) : undefined,
      symptoms: form.symptoms.trim(),
      diagnosis: form.diagnosis.trim(),
      advice: form.advice.trim(),
      follow_up_days: Number(form.follow_up_days) || 0,
      items: form.items.filter(item => item.medicine_name.trim()).map(item => ({
        ...(item.id ? { id: item.id } : {}),
        medicine_id: item.medicine_id || undefined,
        medicine_name: item.medicine_name.trim(),
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        quantity: Number(item.quantity) || 1,
        instruction: item.instructions || '',
      })),
      tests: form.tests.filter(test => test.test_name.trim()).map(test => ({
        ...(test.id ? { id: test.id } : {}),
        test_name: test.test_name.trim(),
        test_type: test.test_type || 'General',
        urgency: test.priority || 'routine',
        description: test.instructions || '',
        price: Number(test.price) || 0,
      })),
    };
    setSaving(true);
    try {
      const response = editingId
        ? await updatePrescriptionApi(token, editingId, payload)
        : await createPrescriptionApi(token, payload);
      if (!response.success) throw new Error(response.message || 'Could not save prescription.');
      const saved = prescriptionFrom(response);
      setFormOpen(false);
      showSuccessToast(editingId ? 'Prescription updated' : 'Prescription created');
      await load(true);
      if (saved) setSelected(saved);
    } catch (error) {
      showErrorToast('Prescription', error instanceof Error ? error.message : 'Could not save prescription.');
    } finally {
      setSaving(false);
    }
  };

  const openDetails = async (prescription: Prescription) => {
    if (!token) return;
    try {
      const response = await getPrescriptionByIdApi(token, Number(prescription.id));
      if (!response.success) throw new Error(response.message || 'Could not load prescription details.');
      setSelected(prescriptionFrom(response) || prescription);
      setDetailsOpen(true);
    } catch (error) {
      showErrorToast('Prescription', error instanceof Error ? error.message : 'Could not load prescription details.');
    }
  };

  const downloadPdf = async (prescription: Prescription) => {
    if (!token) return;
    setDownloadingId(Number(prescription.id));
    try {
      const path = await downloadPrescriptionPdfApi(token, Number(prescription.id));
      showSuccessToast('PDF downloaded', `Prescription #${prescription.id} is ready.`);
      if (path && path.startsWith('/')) {
        // The Android Download Manager handles public downloads; iOS files remain shareable.
        if (path.includes('Documents')) await Share.share({ title: 'Prescription PDF', url: `file://${path}` });
      }
    } catch (error) {
      showErrorToast('PDF download failed', error instanceof Error ? error.message : 'Could not download prescription PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const deleteMedicineItem = (prescription: Prescription, item: PrescriptionItem) => {
    if (!token || !item.id) return;
    Alert.alert('Remove medicine', 'Remove this medicine from the prescription?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const response = await deletePrescriptionItemApi(token, Number(prescription.id), Number(item.id));
        if (!response.success) { showErrorToast('Prescription', response.message || 'Could not remove medicine.'); return; }
        showSuccessToast('Medicine removed');
        await openDetails(prescription);
        await load(true);
      } },
    ]);
  };

  const updateMedicine = (index: number, patch: Partial<PrescriptionItem>) => setForm(current => ({
    ...current,
    items: current.items.map((item, rowIndex) => rowIndex === index ? { ...item, ...patch } : item),
  }));
  const updateTest = (index: number, patch: Partial<PrescriptionTest>) => setForm(current => ({
    ...current,
    tests: current.tests.map((test, rowIndex) => rowIndex === index ? { ...test, ...patch } : test),
  }));

  return (
    <View style={styles.screen}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Prescriptions" />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#0d9488" colors={['#0d9488']} />}>
        <View style={styles.pageHeading}>
          <View style={styles.headingIcon}><FileText size={22} color="#0d9488" /></View>
          <View style={styles.headingText}><Text style={styles.title}>Prescriptions</Text><Text style={styles.subtitle}>Write, review, and manage patient prescriptions.</Text></View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeading}><View><Text style={styles.panelTitle}>Prescription History</Text><Text style={styles.muted}>Search and select a record to view its details.</Text></View><TouchableOpacity style={styles.primaryButton} onPress={openCreate}><Plus size={17} color="#fff" /><Text style={styles.primaryButtonText}>Write</Text></TouchableOpacity></View>
          <View style={styles.searchBox}><Search size={18} color="#64748b" /><TextInput style={styles.searchInput} placeholder="Search patient, phone, or prescription" value={query} onChangeText={value => { setQuery(value); setPage(1); }} placeholderTextColor="#94a3b8" /></View>
          {loading && prescriptions.length === 0 ? <ActivityIndicator style={styles.loader} color="#0d9488" /> : null}
          {!loading && prescriptions.length === 0 ? <View style={styles.emptyState}><FileText size={28} color="#94a3b8" /><Text style={styles.emptyTitle}>No prescriptions found</Text><Text style={styles.muted}>Create a prescription to get started.</Text></View> : null}
          <View style={styles.list}>
            {pageRows.map(rx => (
              <TouchableOpacity key={rx.id} style={[styles.historyCard, selected?.id === rx.id && styles.historyCardSelected]} onPress={() => void openDetails(rx)}>
                <View style={styles.historyTop}><View style={styles.patientAvatar}><Text style={styles.avatarText}>{(rx.patient_name || 'P').slice(0, 1).toUpperCase()}</Text></View><View style={styles.patientDetails}><Text style={styles.patientName}>{rx.patient_name || `Patient #${rx.patient_id}`}</Text><Text style={styles.muted}>Prescription #{rx.id} · {displayDate(rx.created_at)}</Text></View><Text style={styles.statusPill}>{String((rx as any).status || 'Final')}</Text></View>
                <Text style={styles.diagnosis} numberOfLines={2}>{rx.diagnosis || 'Diagnosis not entered'}</Text>
                <View style={styles.cardFooter}><Text style={styles.muted}>{(rx.items || []).length} medicine(s) · {Array.isArray((rx as any).tests) ? (rx as any).tests.length : 0} test(s)</Text><View style={styles.inlineActions}><TouchableOpacity onPress={() => void openEdit(rx)}><Text style={styles.actionLink}>Edit</Text></TouchableOpacity><TouchableOpacity onPress={() => void downloadPdf(rx)} disabled={downloadingId === rx.id}><Download size={16} color="#0d9488" /></TouchableOpacity></View></View>
              </TouchableOpacity>
            ))}
          </View>
          {prescriptions.length > 0 ? <Pagination currentPage={page} totalPages={totalPages} totalItems={prescriptions.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} /> : null}
        </View>
      </ScrollView>

      <AppModal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <View style={styles.modalBackdrop}><View style={styles.formModal}>
          <View style={styles.modalHeader}><View style={styles.modalTitleGroup}><View style={styles.modalIcon}><Stethoscope size={19} color="#0d9488" /></View><View><Text style={styles.modalTitle}>{editingId ? 'Edit Prescription' : 'Write Prescription'}</Text><Text style={styles.muted}>Enter consultation details and treatment.</Text></View></View><TouchableOpacity onPress={() => setFormOpen(false)}><X size={21} color="#64748b" /></TouchableOpacity></View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
            <Text style={styles.fieldLabel}>Patient <Text style={styles.required}>*</Text></Text>
            {selectedPatient ? <TouchableOpacity style={styles.selectedPatient} onPress={() => { setForm(current => ({ ...current, patient_id: '' })); setPatientQuery(''); }}><UserRound size={18} color="#0d9488" /><View style={styles.patientDetails}><Text style={styles.patientName}>{selectedPatient.full_name}</Text><Text style={styles.muted}>{selectedPatient.patient_code || `ID ${selectedPatient.id}`} · {selectedPatient.phone}</Text></View><X size={17} color="#64748b" /></TouchableOpacity> : <>
              <TextInput style={styles.input} value={patientQuery} onChangeText={setPatientQuery} placeholder="Search patient by name or mobile" placeholderTextColor="#94a3b8" />
              {visiblePatients.map(patient => <TouchableOpacity key={patient.id} style={styles.dropdownRow} onPress={() => { setForm(current => ({ ...current, patient_id: String(patient.id) })); setPatientQuery(patient.full_name); }}><UserRound size={15} color="#64748b" /><Text style={styles.dropdownText}>{patient.full_name} · {patient.phone}</Text></TouchableOpacity>)}
            </>}
            <Text style={styles.fieldLabel}>Symptoms</Text><TextInput style={[styles.input, styles.multiline]} value={form.symptoms} onChangeText={symptoms => setForm(current => ({ ...current, symptoms }))} placeholder="Symptoms / chief complaint" multiline placeholderTextColor="#94a3b8" />
            <Text style={styles.fieldLabel}>Diagnosis <Text style={styles.required}>*</Text></Text><TextInput style={styles.input} value={form.diagnosis} onChangeText={diagnosis => setForm(current => ({ ...current, diagnosis }))} placeholder="Enter diagnosis" placeholderTextColor="#94a3b8" />
            <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Medicines</Text><TouchableOpacity style={styles.outlineSmall} onPress={() => setForm(current => ({ ...current, items: [...current.items, emptyMedicine()] }))}><Plus size={15} color="#0d9488" /><Text style={styles.outlineSmallText}>Add medicine</Text></TouchableOpacity></View>
            <TextInput style={styles.input} value={medicineQuery} onChangeText={setMedicineQuery} placeholder="Search clinic medicines" placeholderTextColor="#94a3b8" />
            {medicineQuery.trim() ? visibleMedicines.map(medicine => <TouchableOpacity key={medicine.id} style={styles.dropdownRow} onPress={() => {
              const emptyIndex = form.items.findIndex(item => !item.medicine_name.trim());
              if (emptyIndex < 0) setForm(current => ({ ...current, items: [...current.items, { ...emptyMedicine(), medicine_id: medicine.id, medicine_name: medicine.name }] }));
              else updateMedicine(emptyIndex, { medicine_id: medicine.id, medicine_name: medicine.name });
              setMedicineQuery('');
            }}><Plus size={15} color="#0d9488" /><Text style={styles.dropdownText}>{medicine.name}{medicine.generic_name ? ` · ${medicine.generic_name}` : ''}</Text></TouchableOpacity>) : null}
            {form.items.map((item, index) => <View key={item.id || `medicine-${index}`} style={styles.lineCard}>
              <View style={styles.lineHeading}><Text style={styles.lineTitle}>Medicine {index + 1}</Text>{form.items.length > 1 ? <TouchableOpacity onPress={() => setForm(current => ({ ...current, items: current.items.filter((_, i) => i !== index) }))}><Trash2 size={16} color="#dc2626" /></TouchableOpacity> : null}</View>
              <TextInput style={styles.input} value={item.medicine_name} onChangeText={medicine_name => updateMedicine(index, { medicine_name, medicine_id: undefined })} placeholder="Medicine name" placeholderTextColor="#94a3b8" />
              <View style={styles.twoColumns}><TextInput style={[styles.input, styles.columnInput]} value={item.dosage} onChangeText={dosage => updateMedicine(index, { dosage })} placeholder="Dosage" placeholderTextColor="#94a3b8" /><TextInput style={[styles.input, styles.columnInput]} value={item.frequency} onChangeText={frequency => updateMedicine(index, { frequency })} placeholder="Frequency" placeholderTextColor="#94a3b8" /></View>
              <View style={styles.twoColumns}><TextInput style={[styles.input, styles.columnInput]} value={item.duration} onChangeText={duration => updateMedicine(index, { duration })} placeholder="Duration" placeholderTextColor="#94a3b8" /><TextInput style={[styles.input, styles.columnInput]} keyboardType="number-pad" value={String(item.quantity || '')} onChangeText={value => updateMedicine(index, { quantity: Number(value) || 0 })} placeholder="Quantity" placeholderTextColor="#94a3b8" /></View>
              <TextInput style={styles.input} value={item.instructions || ''} onChangeText={instructions => updateMedicine(index, { instructions })} placeholder="Instructions" placeholderTextColor="#94a3b8" />
            </View>)}
            <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Lab Tests</Text><TouchableOpacity style={styles.outlineSmall} onPress={() => setForm(current => ({ ...current, tests: [...current.tests, emptyTest()] }))}><Plus size={15} color="#0d9488" /><Text style={styles.outlineSmallText}>Add test</Text></TouchableOpacity></View>
            {form.tests.map((test, index) => <View key={test.id || `test-${index}`} style={styles.lineCard}>
              <View style={styles.lineHeading}><Text style={styles.lineTitle}>Test {index + 1}</Text><TouchableOpacity onPress={() => setForm(current => ({ ...current, tests: current.tests.filter((_, i) => i !== index) }))}><Trash2 size={16} color="#dc2626" /></TouchableOpacity></View>
              <TextInput style={styles.input} value={test.test_name} onChangeText={test_name => updateTest(index, { test_name })} placeholder="Test name" placeholderTextColor="#94a3b8" />
              <View style={styles.twoColumns}><TextInput style={[styles.input, styles.columnInput]} value={test.test_type || ''} onChangeText={test_type => updateTest(index, { test_type })} placeholder="Test type" placeholderTextColor="#94a3b8" /><TextInput style={[styles.input, styles.columnInput]} value={test.priority || ''} onChangeText={priority => updateTest(index, { priority })} placeholder="Priority" placeholderTextColor="#94a3b8" /></View>
              <TextInput style={styles.input} value={test.instructions || ''} onChangeText={instructions => updateTest(index, { instructions })} placeholder="Instructions" placeholderTextColor="#94a3b8" />
            </View>)}
            <Text style={styles.fieldLabel}>Advice</Text><TextInput style={[styles.input, styles.multiline]} value={form.advice} onChangeText={advice => setForm(current => ({ ...current, advice }))} placeholder="Patient advice" multiline placeholderTextColor="#94a3b8" />
            <Text style={styles.fieldLabel}>Follow-up after (days)</Text><TextInput style={styles.input} keyboardType="number-pad" value={form.follow_up_days} onChangeText={follow_up_days => setForm(current => ({ ...current, follow_up_days }))} placeholder="e.g. 7" placeholderTextColor="#94a3b8" />
          </ScrollView>
          <View style={styles.modalFooter}><TouchableOpacity style={styles.cancelButton} disabled={saving} onPress={() => setFormOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.primaryButton, saving && styles.disabledButton]} disabled={saving} onPress={() => void savePrescription()}>{saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>{editingId ? 'Update Prescription' : 'Save Prescription'}</Text>}</TouchableOpacity></View>
        </View></View>
      </AppModal>

      <AppModal visible={detailsOpen} animationType="fade" transparent onRequestClose={() => setDetailsOpen(false)}>
        <View style={styles.modalBackdrop}><View style={styles.detailsModal}>
          <View style={styles.modalHeader}><View><Text style={styles.modalTitle}>Prescription Details</Text><Text style={styles.muted}>#{selected?.id} · {displayDate(selected?.created_at)}</Text></View><TouchableOpacity onPress={() => setDetailsOpen(false)}><X size={21} color="#64748b" /></TouchableOpacity></View>
          {selected ? <ScrollView contentContainerStyle={styles.detailsContent}>
            <View style={styles.detailsPatient}><UserRound size={20} color="#0d9488" /><View style={styles.patientDetails}><Text style={styles.patientName}>{selected.patient_name}</Text><Text style={styles.muted}>Patient ID {selected.patient_id} · {selected.doctor_name}</Text></View></View>
            <Detail label="Symptoms" value={(selected as any).symptoms} /><Detail label="Diagnosis" value={selected.diagnosis} /><Detail label="Advice" value={(selected as any).advice || selected.notes} />
            <Text style={styles.sectionTitle}>Medicines</Text>
            {(selected.items || []).map((item, index) => <View style={styles.detailLine} key={item.id || index}><View style={styles.patientDetails}><Text style={styles.lineTitle}>{item.medicine_name}</Text><Text style={styles.muted}>{item.dosage} · {item.frequency} · {item.duration}</Text>{item.instructions ? <Text style={styles.muted}>{item.instructions}</Text> : null}</View>{item.id ? <TouchableOpacity onPress={() => deleteMedicineItem(selected, item)}><Trash2 size={16} color="#dc2626" /></TouchableOpacity> : null}</View>)}
            <Text style={styles.sectionTitle}>Lab Tests</Text>
            {(selected as any).tests?.length ? (selected as any).tests.map((test: any, index: number) => <View style={styles.detailLine} key={test.id || index}><Text style={styles.lineTitle}>{test.test_name}</Text><Text style={styles.muted}>{test.test_type || 'General'} · {test.urgency || test.priority || 'routine'}</Text></View>) : <Text style={styles.muted}>No lab tests attached.</Text>}
          </ScrollView> : null}
          <View style={styles.modalFooter}><TouchableOpacity style={styles.cancelButton} onPress={() => selected && void openEdit(selected)}><Text style={styles.cancelText}>Edit</Text></TouchableOpacity><TouchableOpacity style={styles.primaryButton} disabled={!selected || downloadingId === selected?.id} onPress={() => selected && void downloadPdf(selected)}>{downloadingId === selected?.id ? <ActivityIndicator size="small" color="#fff" /> : <><Download size={16} color="#fff" /><Text style={styles.primaryButtonText}>Download PDF</Text></>}</TouchableOpacity></View>
        </View></View>
      </AppModal>
    </View>
  );
};

const Detail = ({ label, value }: { label: string; value?: string }) => value ? <View style={styles.detailBlock}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View> : null;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' }, content: { padding: 16, paddingBottom: 40, gap: 16 },
  pageHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 }, headingIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' }, headingText: { flex: 1 }, title: { color: '#0f172a', fontSize: 22, fontWeight: '800' }, subtitle: { color: '#64748b', fontSize: 13, marginTop: 3 },
  panel: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, gap: 13 }, panelHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, panelTitle: { color: '#0f172a', fontSize: 18, fontWeight: '700' }, muted: { color: '#64748b', fontSize: 12, lineHeight: 18 }, searchBox: { minHeight: 44, borderWidth: 1, borderColor: '#dbe3ec', borderRadius: 10, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc' }, searchInput: { flex: 1, color: '#0f172a', fontSize: 13, paddingVertical: 8 }, primaryButton: { minHeight: 42, paddingHorizontal: 14, borderRadius: 9, backgroundColor: '#0d9488', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  loader: { marginVertical: 24 }, emptyState: { alignItems: 'center', gap: 7, padding: 25 }, emptyTitle: { color: '#334155', fontSize: 15, fontWeight: '700' }, list: { gap: 10 }, historyCard: { padding: 12, borderRadius: 11, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', gap: 10 }, historyCardSelected: { borderColor: '#5eead4', backgroundColor: '#f0fdfa' }, historyTop: { flexDirection: 'row', alignItems: 'center', gap: 9 }, patientAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#0f766e', fontWeight: '800' }, patientDetails: { flex: 1, gap: 2 }, patientName: { color: '#0f172a', fontWeight: '700', fontSize: 14 }, statusPill: { overflow: 'hidden', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#dcfce7', color: '#15803d', borderRadius: 20, fontSize: 10, fontWeight: '700' }, diagnosis: { color: '#334155', fontSize: 13 }, cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 9 }, inlineActions: { flexDirection: 'row', alignItems: 'center', gap: 14 }, actionLink: { color: '#0d9488', fontSize: 12, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.58)', justifyContent: 'center', padding: 12 }, formModal: { maxHeight: '94%', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' }, detailsModal: { maxHeight: '88%', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#f0fdfa' }, modalTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }, modalIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' }, modalTitle: { color: '#0f172a', fontSize: 17, fontWeight: '700' }, formContent: { padding: 16, gap: 9 }, detailsContent: { padding: 16, gap: 12 }, modalFooter: { flexDirection: 'row', gap: 9, padding: 12, borderTopWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' }, cancelButton: { minHeight: 42, flex: 1, borderRadius: 9, borderWidth: 1, borderColor: '#dbe3ec', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }, cancelText: { color: '#334155', fontWeight: '700', fontSize: 13 }, disabledButton: { opacity: 0.6 },
  fieldLabel: { color: '#334155', fontSize: 12, fontWeight: '700', marginTop: 5 }, required: { color: '#dc2626' }, input: { minHeight: 42, borderWidth: 1, borderColor: '#dbe3ec', borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8, color: '#0f172a', backgroundColor: '#fff', fontSize: 13 }, multiline: { minHeight: 76, textAlignVertical: 'top' }, selectedPatient: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#99f6e4', borderRadius: 10, padding: 10, backgroundColor: '#f0fdfa' }, dropdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' }, dropdownText: { color: '#334155', fontSize: 12, flex: 1 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }, sectionTitle: { color: '#0f172a', fontSize: 15, fontWeight: '700' }, outlineSmall: { minHeight: 34, borderRadius: 8, borderWidth: 1, borderColor: '#99f6e4', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 9 }, outlineSmallText: { color: '#0f766e', fontWeight: '700', fontSize: 11 }, lineCard: { padding: 10, gap: 8, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }, lineHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, lineTitle: { color: '#1e293b', fontWeight: '700', fontSize: 13 }, twoColumns: { flexDirection: 'row', gap: 8 }, columnInput: { flex: 1, minWidth: 0 },
  detailsPatient: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#f0fdfa', borderRadius: 10 }, detailBlock: { paddingVertical: 5 }, detailLabel: { color: '#64748b', fontSize: 11, fontWeight: '700' }, detailValue: { color: '#0f172a', fontSize: 13, marginTop: 3 }, detailLine: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 9, backgroundColor: '#fff' },
});

export default PrescriptionsScreen;
