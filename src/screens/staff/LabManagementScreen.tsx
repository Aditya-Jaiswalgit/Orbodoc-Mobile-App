import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { LabReport, LabTestOrder } from '../../types/clinicTypes';

interface Props {
  onOpenDrawer: () => void;
}

export const LabManagementScreen: React.FC<Props> = ({ onOpenDrawer }) => {
  const [testOrders, setTestOrders] = useState<LabTestOrder[]>([
    { id: 101, clinic_id: 1, patient_id: 1, patient_name: 'Sunita Sharma', doctor_name: 'Dr. Ramesh Sharma', test_name: 'Complete Blood Count (CBC)', category: 'Hematology', cost: 450, status: 'ordered', ordered_date: '2025-01-15' },
    { id: 102, clinic_id: 1, patient_id: 2, patient_name: 'Rahul Verma', doctor_name: 'Dr. Ramesh Sharma', test_name: 'Lipid Profile & HbA1c', category: 'Biochemistry', cost: 850, status: 'sample_collected', ordered_date: '2025-01-14' },
    { id: 103, clinic_id: 1, patient_id: 3, patient_name: 'Pooja Gupta', doctor_name: 'Dr. Ananya Roy', test_name: 'Thyroid Panel (T3, T4, TSH)', category: 'Endocrinology', cost: 700, status: 'completed', ordered_date: '2025-01-14' },
  ]);

  const [reports, setReports] = useState<LabReport[]>([
    { id: 1, clinic_id: 1, test_order_id: 103, patient_id: 3, patient_name: 'Pooja Gupta', test_name: 'Thyroid Panel (T3, T4, TSH)', technician_name: 'Kavita Singh', result_summary: 'TSH: 2.4 uIU/mL (Normal range: 0.4 - 4.2)', findings: 'All thyroid levels within physiological limits.', status: 'verified', file_name: 'Thyroid_Report_PoojaGupta.pdf', created_at: '2025-01-14' },
  ]);

  const [activeTab, setActiveTab] = useState<'orders' | 'reports'>('orders');

  // Modals State
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  // New Order Form
  const [patientName, setPatientName] = useState('');
  const [testName, setTestName] = useState('');
  const [cost, setCost] = useState('500');

  // New Report Form
  const [selectedOrder, setSelectedOrder] = useState<LabTestOrder | null>(null);
  const [resultSummary, setResultSummary] = useState('');
  const [findings, setFindings] = useState('');

  const updateTestStatus = (id: number, newStatus: LabTestOrder['status']) => {
    setTestOrders(prev =>
      prev.map(t => (t.id === id ? { ...t, status: newStatus } : t))
    );
    Alert.alert('Status Updated', `Test Order #${id} status changed to ${newStatus.toUpperCase()}`);
  };

  const handleOrderTest = () => {
    if (!patientName.trim() || !testName.trim()) {
      Alert.alert('Validation Error', 'Patient name and test name are required.');
      return;
    }

    const newOrder: LabTestOrder = {
      id: Date.now(),
      clinic_id: 1,
      patient_id: Date.now(),
      patient_name: patientName,
      doctor_name: 'Dr. Ramesh Sharma',
      test_name: testName,
      category: 'Diagnostics',
      cost: parseFloat(cost) || 500,
      status: 'ordered',
      ordered_date: new Date().toISOString().split('T')[0],
    };

    setTestOrders([newOrder, ...testOrders]);
    setOrderModalVisible(false);
    setPatientName('');
    setTestName('');
    Alert.alert('Lab Order Created', `Test order for ${testName} created successfully!`);
  };

  const handleUploadReport = () => {
    if (!selectedOrder || !resultSummary.trim()) {
      Alert.alert('Validation Error', 'Result summary is required.');
      return;
    }

    const newReport: LabReport = {
      id: Date.now(),
      clinic_id: 1,
      test_order_id: selectedOrder.id,
      patient_id: selectedOrder.patient_id,
      patient_name: selectedOrder.patient_name,
      test_name: selectedOrder.test_name,
      technician_name: 'Kavita Singh',
      result_summary: resultSummary,
      findings: findings || 'Normal laboratory findings.',
      status: 'verified',
      file_name: `${selectedOrder.test_name.replace(/ /g, '_')}_Report.pdf`,
      created_at: new Date().toISOString().split('T')[0],
    };

    setReports([newReport, ...reports]);
    updateTestStatus(selectedOrder.id, 'completed');
    setReportModalVisible(false);
    setSelectedOrder(null);
    setResultSummary('');
    setFindings('');
    Alert.alert('Report Uploaded', 'Lab report uploaded & notification dispatched to patient!');
  };

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Lab & Diagnostics Desk" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'orders' && styles.tabBtnActive]}
            onPress={() => setActiveTab('orders')}>
            <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
              🧪 Test Orders ({testOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'reports' && styles.tabBtnActive]}
            onPress={() => setActiveTab('reports')}>
            <Text style={[styles.tabText, activeTab === 'reports' && styles.tabTextActive]}>
              📄 Lab Reports ({reports.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'orders' ? (
          <>
            <View style={styles.topRow}>
              <Text style={styles.pageTitle}>Lab Test Orders Board</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => setOrderModalVisible(true)}>
                <Text style={styles.addBtnText}>+ Order Test</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.list}>
              {testOrders.map((t) => (
                <View key={t.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.orderId}>ORDER #{t.id}</Text>
                      <Text style={styles.testName}>{t.test_name}</Text>
                    </View>
                    <Text style={styles.costText}>₹{t.cost}</Text>
                  </View>

                  <Text style={styles.patientText}>Patient: <Text style={styles.boldVal}>{t.patient_name}</Text></Text>
                  <Text style={styles.metaText}>Category: {t.category} • Ordered: {t.ordered_date}</Text>

                  <View style={styles.statusRow}>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>STATUS: {t.status.replace('_', ' ').toUpperCase()}</Text>
                    </View>

                    {t.status === 'ordered' ? (
                      <TouchableOpacity style={styles.collectBtn} onPress={() => updateTestStatus(t.id, 'sample_collected')}>
                        <Text style={styles.collectText}>🩸 Collect Sample</Text>
                      </TouchableOpacity>
                    ) : t.status === 'sample_collected' ? (
                      <TouchableOpacity style={styles.uploadBtn} onPress={() => { setSelectedOrder(t); setReportModalVisible(true); }}>
                        <Text style={styles.uploadText}>📤 Upload Report</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.doneText}>✓ Report Published</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.pageTitle}>Uploaded Diagnostic Reports</Text>
            <View style={styles.list}>
              {reports.map((r) => (
                <View key={r.id} style={styles.card}>
                  <Text style={styles.orderId}>REPORT #{r.id}</Text>
                  <Text style={styles.testName}>{r.test_name}</Text>
                  <Text style={styles.patientText}>Patient: <Text style={styles.boldVal}>{r.patient_name}</Text></Text>
                  <Text style={styles.metaText}>Technician: {r.technician_name} • {r.created_at}</Text>

                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryTitle}>Result Summary:</Text>
                    <Text style={styles.summaryContent}>{r.result_summary}</Text>
                  </View>

                  <TouchableOpacity style={styles.fileBtn} onPress={() => Alert.alert('File Download', `Downloading ${r.file_name}`)}>
                    <Text style={styles.fileBtnText}>📎 Attachment: {r.file_name}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Order Test Modal */}
      <Modal visible={orderModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Order Lab Test</Text>

            <Text style={styles.label}>Patient Name *</Text>
            <TextInput style={styles.input} placeholder="Sunita Sharma" value={patientName} onChangeText={setPatientName} />

            <Text style={styles.label}>Diagnostic Test Name *</Text>
            <TextInput style={styles.input} placeholder="e.g. Complete Blood Count (CBC)" value={testName} onChangeText={setTestName} />

            <Text style={styles.label}>Test Cost (₹)</Text>
            <TextInput style={styles.input} placeholder="500" keyboardType="numeric" value={cost} onChangeText={setCost} />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setOrderModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleOrderTest}>
                <Text style={styles.saveText}>Create Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Upload Report Modal */}
      <Modal visible={reportModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Upload Lab Test Report</Text>
            {selectedOrder ? (
              <Text style={styles.orderSubTitle}>{selectedOrder.test_name} for {selectedOrder.patient_name}</Text>
            ) : null}

            <Text style={styles.label}>Result Summary *</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              multiline={true}
              placeholder="e.g. Hb: 13.5 g/dL, WBC: 7,200 /uL"
              value={resultSummary}
              onChangeText={setResultSummary}
            />

            <Text style={styles.label}>Clinical Findings & Interpretation</Text>
            <TextInput
              style={styles.input}
              placeholder="Normal physiological values observed."
              value={findings}
              onChangeText={setFindings}
            />

            <TouchableOpacity style={styles.attachBtn} onPress={() => Alert.alert('File Picker', 'Simulated PDF / Image report file selected.')}>
              <Text style={styles.attachText}>📎 Attach Report PDF / File</Text>
            </TouchableOpacity>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setReportModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleUploadReport}>
                <Text style={styles.saveText}>Publish Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 80 },
  tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 12, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#0d9488' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  tabTextActive: { color: '#ffffff', fontWeight: '800' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  addBtn: { backgroundColor: '#0d9488', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  list: { gap: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderId: { fontSize: 11, fontWeight: '800', color: '#0d9488' },
  testName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  costText: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  patientText: { fontSize: 13, color: '#334155', marginTop: 4 },
  boldVal: { fontWeight: '800', color: '#0f172a' },
  metaText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  statusBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800', color: '#334155' },
  collectBtn: { backgroundColor: '#0369a1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  collectText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  uploadBtn: { backgroundColor: '#0d9488', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  uploadText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  doneText: { color: '#166534', fontWeight: '800', fontSize: 12 },
  summaryBox: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginVertical: 8 },
  summaryTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  summaryContent: { fontSize: 12, color: '#334155', marginTop: 2 },
  fileBtn: { backgroundColor: '#e0f2fe', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, marginTop: 4 },
  fileBtnText: { color: '#0369a1', fontWeight: '800', fontSize: 12 },
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  orderSubTitle: { fontSize: 13, color: '#0d9488', fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  attachBtn: { marginTop: 12, paddingVertical: 10, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center' },
  attachText: { color: '#0f172a', fontWeight: '700', fontSize: 13 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center' },
  cancelText: { color: '#475569', fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: '#0d9488', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#ffffff', fontWeight: '800' },
});

export default LabManagementScreen;
