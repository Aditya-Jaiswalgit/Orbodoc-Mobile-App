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
import { useLabTests } from '../../hooks/useLabTests';
import { LabReport, LabTestOrder } from '../../types/clinicTypes';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
}

export const LabManagementScreen: React.FC<Props> = ({ onOpenDrawer, onOpenNotifications }) => {
  const {
    testOrders,
    reports,
    stats,
    loading,
    refreshLabData,
    createOrder,
    editOrder,
    updateStatus,
    uploadReport,
    editReport,
    getReportForTest,
  } = useLabTests();

  const [activeTab, setActiveTab] = useState<'orders' | 'reports'>('orders');
  const [searchQuery, setSearchQuery] = useState('');

  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<LabTestOrder | null>(null);
  const [selectedReport, setSelectedReport] = useState<LabReport | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [testName, setTestName] = useState('');
  const [category, setCategory] = useState('Biochemistry');
  const [cost, setCost] = useState('230');

  const [editTestName, setEditTestName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editStatus, setEditStatus] = useState('ordered');

  const [resultSummary, setResultSummary] = useState('');
  const [findings, setFindings] = useState('');
  const [remarks, setRemarks] = useState('');

  const filteredOrders = (testOrders || []).filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const tName = String(t.test_name || '').toLowerCase();
    const pName = String(t.patient_name || '').toLowerCase();
    const cName = String(t.category || '').toLowerCase();
    const doc = String(t.doctor_name || '').toLowerCase();
    return tName.includes(q) || pName.includes(q) || cName.includes(q) || doc.includes(q);
  });

  const filteredReports = (reports || []).filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const tName = String(r.test_name || '').toLowerCase();
    const pName = String(r.patient_name || '').toLowerCase();
    const sText = String(r.result_summary || '').toLowerCase();
    return tName.includes(q) || pName.includes(q) || sText.includes(q);
  });

  const handleOpenView = async (order: LabTestOrder) => {
    setSelectedOrder(order);
    setSelectedReport(null);
    setViewModalVisible(true);
    setViewLoading(true);

    try {
      const matchedLocal = reports.find(
        (r) => Number(r.lab_test_id || r.test_order_id) === Number(order.id)
      );
      if (matchedLocal) {
        setSelectedReport(matchedLocal);
      } else {
        const fetched = await getReportForTest(order.id);
        if (fetched) setSelectedReport(fetched);
      }
    } catch (e) {
    } finally {
      setViewLoading(false);
    }
  };

  const handleOpenEdit = (order: LabTestOrder) => {
    setSelectedOrder(order);
    setEditTestName(order.test_name || '');
    setEditCategory(order.category || 'Diagnostics');
    setEditCost(String(order.cost || order.price || '230'));
    setEditStatus(order.status || 'ordered');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedOrder) return;
    if (!editTestName.trim()) {
      Alert.alert('Validation Error', 'Test name is required.');
      return;
    }

    const res = await editOrder(selectedOrder.id, {
      test_name: editTestName.trim(),
      category: editCategory.trim() || 'Diagnostics',
      price: parseFloat(editCost) || 0,
      cost: parseFloat(editCost) || 0,
      status: editStatus,
    });

    if (res.success) {
      setEditModalVisible(false);
      Alert.alert('Success', `Lab order #${selectedOrder.id} updated successfully!`);
    } else {
      Alert.alert('Error', res.message || 'Failed to update lab order');
    }
  };

  const handleCreateOrder = async () => {
    if (!patientName.trim() || !testName.trim()) {
      Alert.alert('Validation Error', 'Patient name and diagnostic test name are required.');
      return;
    }

    const res = await createOrder({
      patient_id: parseInt(patientId, 10) || 1,
      patient_name: patientName.trim(),
      test_name: testName.trim(),
      category: category.trim() || 'Diagnostics',
      cost: parseFloat(cost) || 230,
      price: parseFloat(cost) || 230,
      status: 'ordered',
      urgency: 'routine',
    });

    if (res.success) {
      setOrderModalVisible(false);
      setPatientName('');
      setPatientId('');
      setTestName('');
      setCost('230');
      Alert.alert('Success', `Lab order for ${testName} created successfully in DB!`);
    } else {
      Alert.alert('Error', res.message || 'Failed to create lab test order');
    }
  };

  const handleOpenReportView = (report: LabReport) => {
    setSelectedReport(report);
    const matchedOrder = testOrders.find(
      (t) => Number(t.id) === Number(report.lab_test_id || report.test_order_id)
    );
    setSelectedOrder(matchedOrder || null);
    setViewModalVisible(true);
    setViewLoading(false);
  };

  const handleOpenReportEdit = (report: LabReport) => {
    setSelectedReport(report);
    const matchedOrder = testOrders.find(
      (t) => Number(t.id) === Number(report.lab_test_id || report.test_order_id)
    );
    setSelectedOrder(matchedOrder || null);
    setResultSummary(report.result_summary || '');
    setFindings(report.findings || '');
    setRemarks(report.remarks || '');
    setReportModalVisible(true);
  };

  const handleUploadReport = async () => {
    if (!resultSummary.trim()) {
      Alert.alert('Validation Error', 'Result summary is required.');
      return;
    }

    if (selectedReport && selectedReport.id) {
      const res = await editReport(selectedReport.id, {
        result_summary: resultSummary.trim(),
        findings: findings.trim() || 'Normal physiological parameters.',
        remarks: remarks.trim() || 'Verified by clinical lab team.',
      });

      if (res.success) {
        setReportModalVisible(false);
        setSelectedReport(null);
        setSelectedOrder(null);
        setResultSummary('');
        setFindings('');
        setRemarks('');
        Alert.alert('Success', `Lab report #${selectedReport.id} updated successfully in DB!`);
      } else {
        Alert.alert('Error', res.message || 'Failed to update lab report');
      }
    } else if (selectedOrder) {
      const res = await uploadReport({
        lab_test_id: selectedOrder.id,
        patient_id: selectedOrder.patient_id,
        patient_name: selectedOrder.patient_name,
        test_name: selectedOrder.test_name,
        result_summary: resultSummary.trim(),
        findings: findings.trim() || 'Normal physiological parameters.',
        remarks: remarks.trim() || 'Verified by clinical lab team.',
        status: 'verified',
      });

      if (res.success) {
        setReportModalVisible(false);
        setSelectedOrder(null);
        setSelectedReport(null);
        setResultSummary('');
        setFindings('');
        setRemarks('');
        Alert.alert('Success', 'Lab report published & updated in database!');
      } else {
        Alert.alert('Error', res.message || 'Failed to upload lab report');
      }
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'P';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 1).toUpperCase();
  };

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Lab & Diagnostics Desk"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshLabData} colors={['#0d9488']} />
        }>
        <View style={styles.topBanner}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.pageTitle}>Diagnostics & Lab Desk</Text>
              <Text style={styles.pageSub}>Manage live lab orders, status & reports</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setOrderModalVisible(true)}>
              <Text style={styles.addBtnText}>+ Order Test</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statIcon}>🧪</Text>
              <Text style={styles.statVal}>{stats.totalOrders}</Text>
            </View>
            <Text style={styles.statLabel}>Total Tests</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statIcon}>⏳</Text>
              <Text style={[styles.statVal, { color: '#b45309' }]}>{stats.pendingOrders}</Text>
            </View>
            <Text style={styles.statLabel}>Pending / Active</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statIcon}>✅</Text>
              <Text style={[styles.statVal, { color: '#166534' }]}>{stats.completedOrders}</Text>
            </View>
            <Text style={styles.statLabel}>Completed</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statIcon}>📄</Text>
              <Text style={[styles.statVal, { color: '#0d9488' }]}>{stats.totalReports}</Text>
            </View>
            <Text style={styles.statLabel}>Lab Reports</Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'orders' && styles.tabBtnActive]}
            onPress={() => setActiveTab('orders')}>
            <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
              🧪 Test Orders ({filteredOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'reports' && styles.tabBtnActive]}
            onPress={() => setActiveTab('reports')}>
            <Text style={[styles.tabText, activeTab === 'reports' && styles.tabTextActive]}>
              📄 Lab Reports ({filteredReports.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search patient, test, doctor..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* List Content */}
        {activeTab === 'orders' ? (
          <>
            <Text style={styles.sectionHeader}>Active Diagnostic Orders ({filteredOrders.length})</Text>

            {loading && testOrders.length === 0 ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#0d9488" />
                <Text style={styles.loadingText}>Loading live lab orders from DB...</Text>
              </View>
            ) : filteredOrders.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Lab Orders Found</Text>
                <Text style={styles.emptySub}>Tap "+ Order Test" to create a new lab diagnostic order.</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {filteredOrders.map((t) => {
                  const isDone = String(t.status || '').toLowerCase() === 'completed';
                  const hasReport = isDone || Boolean(t.report_ready);

                  return (
                    <View key={t.id} style={styles.card}>
                      {/* Top Row: Patient ID & Avatar & Doctor */}
                      <View style={styles.cardTopRow}>
                        <View style={styles.patientPillBox}>
                          <View style={styles.idCircle}>
                            <Text style={styles.idText}>{t.patient_id || t.id}</Text>
                          </View>
                          <View style={styles.avatarCircle}>
                            <Text style={styles.avatarText}>{getInitials(t.patient_name)}</Text>
                          </View>
                          <Text style={styles.patientNameText}>{t.patient_name || `Patient #${t.patient_id}`}</Text>
                        </View>

                        <View style={styles.rightHeaderBox}>
                          <Text style={styles.doctorLabel}>{t.doctor_name || 'Dr. Verma'}</Text>
                          <View
                            style={[
                              styles.statusBadge,
                              isDone ? styles.statusBadgeCompleted : styles.statusBadgeOrdered,
                            ]}>
                            <Text
                              style={[
                                styles.statusBadgeText,
                                isDone ? styles.statusTextCompleted : styles.statusTextOrdered,
                              ]}>
                              {String(t.status || 'ordered').toLowerCase()}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Middle Row: Test Details Chip */}
                      <View style={styles.testChipContainer}>
                        <View style={styles.testChipHeader}>
                          <Text style={styles.testChipTitle}>
                            #{t.id} - {t.test_name}
                          </Text>
                          <View style={styles.pricePill}>
                            <Text style={styles.pricePillText}>₹{Number(t.price || t.cost || 230).toFixed(2)}</Text>
                          </View>
                          <View
                            style={[
                              styles.reportBadge,
                              hasReport ? styles.reportBadgeReady : styles.reportBadgeNone,
                            ]}>
                            <Text
                              style={[
                                styles.reportBadgeText,
                                hasReport ? styles.reportTextReady : styles.reportTextNone,
                              ]}>
                              {hasReport ? 'Report Ready' : 'No Report'}
                            </Text>
                          </View>
                        </View>

                        {/* Chip Action Buttons: Edit / + Add */}
                        <View style={styles.chipActionsRow}>
                          <TouchableOpacity style={styles.chipActionBtn} onPress={() => handleOpenEdit(t)}>
                            <Text style={styles.chipActionBtnText}>✏️ Edit</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.chipActionBtn, { backgroundColor: hasReport ? '#f0fdfa' : '#f0fdf4' }]}
                            onPress={() => {
                              setSelectedOrder(t);
                              setReportModalVisible(true);
                            }}>
                            <Text style={[styles.chipActionBtnText, { color: '#0d9488' }]}>
                              {hasReport ? '✏️ Edit Report' : '+ Add Report'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Bottom Row: Total Price & View Button */}
                      <View style={styles.bottomRow}>
                        <View>
                          <Text style={styles.totalPriceLabel}>TOTAL PRICE</Text>
                          <Text style={styles.totalPriceVal}>Rs {Number(t.price || t.cost || 230).toFixed(2)}</Text>
                        </View>

                        <View style={styles.actionGroup}>
                          <Text style={styles.readyCounterText}>{hasReport ? '1 ready' : '0 ready'}</Text>
                          <TouchableOpacity style={styles.viewBtn} onPress={() => handleOpenView(t)}>
                            <Text style={styles.viewBtnText}>👁️ View</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionHeader}>Verified Diagnostic Reports ({filteredReports.length})</Text>

            {loading && reports.length === 0 ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#0d9488" />
                <Text style={styles.loadingText}>Fetching lab reports from DB...</Text>
              </View>
            ) : filteredReports.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Published Reports</Text>
                <Text style={styles.emptySub}>Published lab test reports will appear here.</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {filteredReports.map((r) => (
                  <View key={r.id} style={styles.card}>
                    <View style={styles.cardTopRow}>
                      <View style={styles.patientPillBox}>
                        <View style={styles.idCircle}>
                          <Text style={styles.idText}>{r.patient_id || r.id}</Text>
                        </View>
                        <Text style={styles.patientNameText}>{r.patient_name || `Patient #${r.patient_id}`}</Text>
                      </View>
                      <View style={[styles.statusBadge, styles.statusBadgeCompleted]}>
                        <Text style={[styles.statusBadgeText, styles.statusTextCompleted]}>verified</Text>
                      </View>
                    </View>

                    <Text style={styles.testNameLarge}>{r.test_name}</Text>
                    <Text style={styles.metaSubText}>
                      Technician: {r.technician_name || 'Lab Staff'} •{' '}
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : 'Verified'}
                    </Text>

                    <View style={styles.summaryContainer}>
                      <Text style={styles.summaryHeading}>Result Summary:</Text>
                      <Text style={styles.summaryBody}>{r.result_summary}</Text>
                    </View>

                    {r.findings ? (
                      <View style={styles.findingsContainer}>
                        <Text style={styles.summaryHeading}>Clinical Findings:</Text>
                        <Text style={styles.summaryBody}>{r.findings}</Text>
                      </View>
                    ) : null}

                    <View style={styles.bottomRow}>
                      <TouchableOpacity
                        style={styles.chipActionBtn}
                        onPress={() => handleOpenReportEdit(r)}>
                        <Text style={styles.chipActionBtnText}>✏️ Edit Report</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.viewBtn}
                        onPress={() => handleOpenReportView(r)}>
                        <Text style={styles.viewBtnText}>👁️ View Details</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={viewModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Diagnostic Order & Report Details</Text>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {/* Order Details */}
              <View style={styles.viewMetaBox}>
                <Text style={styles.viewLabel}>PATIENT</Text>
                <Text style={styles.viewVal}>
                  {selectedOrder?.patient_name || selectedReport?.patient_name || 'Patient'} (ID #{selectedOrder?.patient_id || selectedReport?.patient_id || 'N/A'})
                </Text>

                <Text style={styles.viewLabel}>TEST NAME</Text>
                <Text style={styles.viewVal}>
                  #{selectedOrder?.id || selectedReport?.lab_test_id || selectedReport?.id} - {selectedOrder?.test_name || selectedReport?.test_name}
                </Text>

                <Text style={styles.viewLabel}>CATEGORY & DOCTOR</Text>
                <Text style={styles.viewVal}>
                  {selectedOrder?.category || 'Diagnostics'} • {selectedOrder?.doctor_name || 'Dr. Verma'}
                </Text>

                {selectedOrder?.price || selectedOrder?.cost ? (
                  <>
                    <Text style={styles.viewLabel}>TOTAL PRICE</Text>
                    <Text style={[styles.viewVal, { color: '#0d9488', fontWeight: '800' }]}>
                      ₹{Number(selectedOrder.price || selectedOrder.cost).toFixed(2)}
                    </Text>
                  </>
                ) : null}

                <Text style={styles.viewLabel}>ORDER STATUS</Text>
                <Text style={styles.viewVal}>
                  {String(selectedOrder?.status || (selectedReport ? 'completed' : 'ordered')).toUpperCase()}
                </Text>
              </View>

              {/* Report Section */}
              <Text style={[styles.modalSubTitle, { marginTop: 14 }]}>Published Lab Report</Text>
              {viewLoading ? (
                <ActivityIndicator size="small" color="#0d9488" style={{ marginVertical: 10 }} />
              ) : selectedReport ? (
                <View style={styles.reportDetailsBox}>
                  <Text style={styles.reportItemLabel}>Result Summary / Readings:</Text>
                  <Text style={styles.reportItemVal}>{selectedReport.result_summary}</Text>

                  {selectedReport.findings ? (
                    <>
                      <Text style={[styles.reportItemLabel, { marginTop: 6 }]}>Clinical Findings:</Text>
                      <Text style={styles.reportItemVal}>{selectedReport.findings}</Text>
                    </>
                  ) : null}

                  {selectedReport.remarks ? (
                    <>
                      <Text style={[styles.reportItemLabel, { marginTop: 6 }]}>Technician Remarks:</Text>
                      <Text style={styles.reportItemVal}>{selectedReport.remarks}</Text>
                    </>
                  ) : null}

                  <Text style={[styles.reportItemLabel, { marginTop: 6 }]}>Technician & Verification:</Text>
                  <Text style={styles.reportItemVal}>
                    {selectedReport.technician_name || 'Lab Specialist'} •{' '}
                    {selectedReport.created_at ? new Date(selectedReport.created_at).toLocaleDateString('en-GB') : 'Verified'}
                  </Text>

                  <Text style={[styles.reportItemLabel, { marginTop: 6 }]}>Report Status:</Text>
                  <Text style={[styles.reportItemVal, { color: '#166534', fontWeight: '800' }]}>
                    VERIFIED & PUBLISHED
                  </Text>
                </View>
              ) : (
                <View style={styles.noReportBox}>
                  <Text style={styles.noReportText}>No lab report published yet for this test order.</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setViewModalVisible(false);
                  setSelectedReport(null);
                }}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>

              {selectedReport ? (
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={() => {
                    setViewModalVisible(false);
                    handleOpenReportEdit(selectedReport);
                  }}>
                  <Text style={styles.saveText}>✏️ Edit Report</Text>
                </TouchableOpacity>
              ) : selectedOrder && String(selectedOrder.status).toLowerCase() !== 'completed' ? (
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={() => {
                    setViewModalVisible(false);
                    setReportModalVisible(true);
                  }}>
                  <Text style={styles.saveText}>+ Upload Report</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Lab Test Order</Text>
            {selectedOrder ? (
              <Text style={styles.orderSubTitle}>Order #{selectedOrder.id} for {selectedOrder.patient_name}</Text>
            ) : null}

            <Text style={styles.label}>Test Name *</Text>
            <TextInput
              style={styles.input}
              value={editTestName}
              onChangeText={setEditTestName}
              placeholder="Complete Blood Count"
            />

            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.input}
              value={editCategory}
              onChangeText={setEditCategory}
              placeholder="Biochemistry / Hematology"
            />

            <Text style={styles.label}>Test Price (₹)</Text>
            <TextInput
              style={styles.input}
              value={editCost}
              onChangeText={setEditCost}
              keyboardType="numeric"
              placeholder="230"
            />

            <Text style={styles.label}>Status</Text>
            <View style={styles.statusOptionsRow}>
              {(['ordered', 'sample_collected', 'completed', 'cancelled'] as const).map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.statusOptBtn, editStatus === st && styles.statusOptBtnActive]}
                  onPress={() => setEditStatus(st)}>
                  <Text style={[styles.statusOptText, editStatus === st && styles.statusOptTextActive]}>
                    {st.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={styles.saveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={orderModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Order Diagnostic Lab Test</Text>

            <Text style={styles.label}>Patient Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Sunita Sharma"
              placeholderTextColor="#94a3b8"
              value={patientName}
              onChangeText={setPatientName}
            />

            <Text style={styles.label}>Diagnostic Test Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Complete Blood Count"
              placeholderTextColor="#94a3b8"
              value={testName}
              onChangeText={setTestName}
            />

            <Text style={styles.label}>Test Category</Text>
            <TextInput
              style={styles.input}
              placeholder="Hematology / Biochemistry"
              placeholderTextColor="#94a3b8"
              value={category}
              onChangeText={setCategory}
            />

            <Text style={styles.label}>Test Price (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="230"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={cost}
              onChangeText={setCost}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setOrderModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateOrder}>
                <Text style={styles.saveText}>Create Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={reportModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Publish Diagnostic Report</Text>
            {selectedOrder ? (
              <Text style={styles.orderSubTitle}>
                {selectedOrder.test_name} for {selectedOrder.patient_name}
              </Text>
            ) : null}

            <Text style={styles.label}>Result Summary *</Text>
            <TextInput
              style={[styles.input, { height: 60 }]}
              multiline={true}
              placeholder="e.g. Hb: 13.5 g/dL, Platelets: 2.5 Lakhs"
              placeholderTextColor="#94a3b8"
              value={resultSummary}
              onChangeText={setResultSummary}
            />

            <Text style={styles.label}>Clinical Findings</Text>
            <TextInput
              style={styles.input}
              placeholder="Normal physiological parameters."
              placeholderTextColor="#94a3b8"
              value={findings}
              onChangeText={setFindings}
            />

            <Text style={styles.label}>Remarks</Text>
            <TextInput
              style={styles.input}
              placeholder="Verified by clinical laboratory."
              placeholderTextColor="#94a3b8"
              value={remarks}
              onChangeText={setRemarks}
            />

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
  topBanner: { marginBottom: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  pageSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  addBtn: { backgroundColor: '#0d9488', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statIcon: { fontSize: 18 },
  statVal: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 6 },
  tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 12, padding: 4, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#0d9488' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  tabTextActive: { color: '#ffffff', fontWeight: '800' },
  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 14,
  },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  list: { gap: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  patientPillBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  idCircle: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  idText: { fontSize: 12, fontWeight: '800', color: '#2563eb' },
  avatarCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  patientNameText: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  rightHeaderBox: { alignItems: 'flex-end', gap: 4 },
  doctorLabel: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeOrdered: { backgroundColor: '#f1f5f9' },
  statusBadgeCompleted: { backgroundColor: '#dcfce7' },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  statusTextOrdered: { color: '#475569' },
  statusTextCompleted: { color: '#166534' },
  testChipContainer: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 10, marginVertical: 6 },
  testChipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  testChipTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', flex: 1 },
  pricePill: { backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#a7f3d0' },
  pricePillText: { fontSize: 11, fontWeight: '800', color: '#059669' },
  reportBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  reportBadgeReady: { backgroundColor: '#dcfce7' },
  reportBadgeNone: { backgroundColor: '#fef3c7' },
  reportBadgeText: { fontSize: 10, fontWeight: '800' },
  reportTextReady: { color: '#166534' },
  reportTextNone: { color: '#b45309' },
  chipActionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chipActionBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  chipActionBtnText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  totalPriceLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8' },
  totalPriceVal: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginTop: 1 },
  actionGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  readyCounterText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  viewBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  viewBtnText: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  testNameLarge: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  metaSubText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  summaryContainer: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginVertical: 6 },
  findingsContainer: { backgroundColor: '#f0fdfa', padding: 10, borderRadius: 8, marginBottom: 6 },
  summaryHeading: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  summaryBody: { fontSize: 12, color: '#334155', marginTop: 2 },
  fullReportBtn: { backgroundColor: '#e0f2fe', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, marginTop: 4, alignItems: 'center' },
  fullReportBtnText: { color: '#0369a1', fontWeight: '800', fontSize: 12 },
  loadingBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#64748b', fontWeight: '600' },
  emptyCard: { backgroundColor: '#ffffff', padding: 30, borderRadius: 16, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 },
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  modalSubTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  orderSubTitle: { fontSize: 13, color: '#0d9488', fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  statusOptionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  statusOptBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  statusOptBtnActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  statusOptText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  statusOptTextActive: { color: '#ffffff', fontWeight: '800' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center' },
  cancelText: { color: '#475569', fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: '#0d9488', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#ffffff', fontWeight: '800' },
  viewMetaBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, gap: 4 },
  viewLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', marginTop: 4 },
  viewVal: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  reportDetailsBox: { backgroundColor: '#f0fdfa', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ccfbf1' },
  reportItemLabel: { fontSize: 11, fontWeight: '800', color: '#0f766e' },
  reportItemVal: { fontSize: 12, color: '#334155', marginTop: 2 },
  noReportBox: { backgroundColor: '#fef3c7', padding: 12, borderRadius: 10 },
  noReportText: { fontSize: 12, color: '#92400e', fontWeight: '600' },
});

export default LabManagementScreen;
