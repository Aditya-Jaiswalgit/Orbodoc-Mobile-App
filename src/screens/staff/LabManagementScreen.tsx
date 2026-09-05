import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useLabTests } from '../../hooks/useLabTests';
import { LabReport, LabTestOrder } from '../../types/clinicTypes';

export interface ReportParameterItem {
  id: number;
  parameter: string;
  result: string;
  unit: string;
  reference_range: string;
}

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onToggleTabBar?: (hide: boolean) => void;
}

export const LabManagementScreen: React.FC<Props> = ({ onOpenDrawer, onOpenNotifications, onToggleTabBar }) => {
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
  const [printModalVisible, setPrintModalVisible] = useState(false);

  useEffect(() => {
    if (onToggleTabBar) {
      onToggleTabBar(
        orderModalVisible ||
        reportModalVisible ||
        viewModalVisible ||
        editModalVisible ||
        printModalVisible
      );
    }
  }, [
    orderModalVisible,
    reportModalVisible,
    viewModalVisible,
    editModalVisible,
    printModalVisible,
    onToggleTabBar,
  ]);

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

  const [editPrice, setEditPrice] = useState('230');
  const [isAbnormal, setIsAbnormal] = useState<'No' | 'Yes'>('No');
  const [reportRemarks, setReportRemarks] = useState('Sample adequate. Values are within normal range.');
  const [reportParameters, setReportParameters] = useState<ReportParameterItem[]>([
    { id: 1, parameter: 'RBC', result: '11.2', unit: 'mg', reference_range: '12-18' },
  ]);

  const handleAddParameter = () => {
    setReportParameters((prev) => [
      ...prev,
      { id: Date.now(), parameter: '', result: '', unit: '', reference_range: '' },
    ]);
  };

  const handleRemoveParameter = (id: number) => {
    setReportParameters((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdateParameter = (id: number, field: keyof ReportParameterItem, val: string) => {
    setReportParameters((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

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

  const handleOpenReportEdit = async (item: any) => {
    let reportObj: LabReport | null = null;
    let orderObj: LabTestOrder | null = null;

    if (item.lab_test_id || item.test_order_id) {
      reportObj = item;
      orderObj = testOrders.find((t) => Number(t.id) === Number(item.lab_test_id || item.test_order_id)) || null;
    } else {
      orderObj = item;
      reportObj = reports.find((r) => Number(r.lab_test_id || r.test_order_id) === Number(item.id)) || null;
    }

    setSelectedReport(reportObj);
    setSelectedOrder(orderObj);

    setEditPrice(String(orderObj?.price || orderObj?.cost || (reportObj as any)?.price || '230'));
    setIsAbnormal((reportObj as any)?.is_abnormal ? 'Yes' : 'No');
    setReportRemarks(reportObj?.remarks || reportObj?.result_summary || 'Sample adequate. Values are within normal range.');

    let params: ReportParameterItem[] = [];
    if ((reportObj as any)?.parameters) {
      try {
        params = typeof (reportObj as any).parameters === 'string'
          ? JSON.parse((reportObj as any).parameters)
          : (reportObj as any).parameters;
      } catch (e) {}
    } else if (reportObj?.report_data) {
      try {
        params = typeof reportObj.report_data === 'string'
          ? JSON.parse(reportObj.report_data)
          : reportObj.report_data;
      } catch (e) {}
    }

    if (Array.isArray(params) && params.length > 0) {
      setReportParameters(params);
    } else {
      setReportParameters([
        { id: Date.now(), parameter: 'RBC', result: '11.2', unit: 'mg', reference_range: '12-18' }
      ]);
    }

    setReportModalVisible(true);
  };

  const handleUploadReport = async () => {
    const summaryText = reportParameters
      .filter((p) => p.parameter.trim())
      .map((p) => `${p.parameter}: ${p.result} ${p.unit} (Ref: ${p.reference_range})`)
      .join('\n');

    const reportPayload = {
      price: parseFloat(editPrice) || 230,
      cost: parseFloat(editPrice) || 230,
      is_abnormal: isAbnormal === 'Yes',
      parameters: JSON.stringify(reportParameters),
      report_data: reportParameters,
      result_summary: summaryText || 'RBC: 11.2 mg (Ref: 12-18)',
      findings: findings || 'Normal physiological parameters.',
      remarks: reportRemarks.trim() || 'Sample adequate. Values are within normal range.',
      reference_range: reportParameters[0]?.reference_range || '12-18',
      status: 'verified',
    };

    let targetReportId = selectedReport?.id;
    if (!targetReportId && selectedOrder?.id) {
      const existing = reports.find((r) => Number(r.lab_test_id) === Number(selectedOrder?.id));
      if (existing) targetReportId = existing.id;
    }

    if (targetReportId) {
      const res = await editReport(targetReportId, reportPayload);
      if (res.success) {
        setReportModalVisible(false);
        setSelectedReport(null);
        setSelectedOrder(null);
        Alert.alert('Success', 'Lab report updated successfully!');
      } else {
        Alert.alert('Error', res.message || 'Failed to update lab report');
      }
    } else if (selectedOrder) {
      const res = await uploadReport({
        lab_test_id: selectedOrder.id,
        patient_id: selectedOrder.patient_id,
        patient_name: selectedOrder.patient_name,
        test_name: selectedOrder.test_name,
        ...reportPayload,
      });

      if (res.success) {
        setReportModalVisible(false);
        setSelectedOrder(null);
        setSelectedReport(null);
        Alert.alert('Success', 'Lab report published & updated in database!');
      } else {
        Alert.alert('Error', res.message || 'Failed to upload lab report');
      }
    } else {
      Alert.alert('Error', 'No test order or report selected');
    }
  };

  const parsedViewParameters = React.useMemo(() => {
    let params: ReportParameterItem[] = [];
    if ((selectedReport as any)?.parameters) {
      try {
        params = typeof (selectedReport as any).parameters === 'string'
          ? JSON.parse((selectedReport as any).parameters)
          : (selectedReport as any).parameters;
      } catch (e) {}
    } else if (selectedReport?.report_data) {
      try {
        params = typeof selectedReport.report_data === 'string'
          ? JSON.parse(selectedReport.report_data)
          : selectedReport.report_data;
      } catch (e) {}
    }

    if (Array.isArray(params) && params.length > 0) {
      return params.map((p) => ({
        ...p,
        status: (selectedReport as any)?.is_abnormal ? 'Abnormal' : 'Normal',
      }));
    }

    return [
      {
        id: 1,
        parameter: selectedReport ? 'RBC' : 'Awaiting report',
        result: selectedReport ? '11.2' : '-',
        unit: selectedReport ? 'mg' : '-',
        reference_range: selectedReport ? '12-18' : '-',
        status: selectedReport ? ((selectedReport as any)?.is_abnormal ? 'Abnormal' : 'Normal') : 'Pending',
      },
    ];
  }, [selectedReport, selectedOrder]);

  const generateReportHtml = () => {
    const pName = selectedOrder?.patient_name || selectedReport?.patient_name || 'Patient';
    const pId = selectedOrder?.patient_id || selectedReport?.patient_id || 'N/A';
    const pPhone = (selectedOrder as any)?.patient_phone || (selectedReport as any)?.patient_phone || '9876543210';
    const docName = selectedOrder?.doctor_name || 'Dr. Rahul Sharma, Dr Verma';
    const testName = selectedOrder?.test_name || selectedReport?.test_name || 'Complete Blood Count';
    const price = Number(selectedOrder?.price || selectedOrder?.cost || selectedReport?.price || 230).toFixed(2);
    const dateStr = new Date().toLocaleDateString('en-US');
    const timeStr = new Date().toLocaleTimeString('en-US');

    const rowsHtml = parsedViewParameters.map((item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-weight: 700; color: #0f172a;">${testName}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 1px;">${item.parameter || 'RBC'}</div>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${item.result || '-'} ${item.unit || ''}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #475569;">${item.reference_range || '-'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
          <span style="background-color: ${item.status === 'Abnormal' ? '#fef2f2' : item.status === 'Pending' ? '#fef3c7' : '#f0fdf4'}; color: ${item.status === 'Abnormal' ? '#ef4444' : item.status === 'Pending' ? '#b45309' : '#166534'}; padding: 4px 10px; border-radius: 12px; font-weight: 800; font-size: 11px;">
            ${item.status}
          </span>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 800; text-align: right;">Rs ${price}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Lab Report - ${pName}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; background: #fff; }
          .report-container { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 20px; }
          .clinic-title { font-size: 22px; font-weight: 800; color: #0d9488; }
          .clinic-sub { font-size: 11px; color: #64748b; font-weight: 700; letter-spacing: 0.5px; }
          .clinic-address { font-size: 11px; color: #64748b; margin-top: 4px; }
          .badge { font-size: 13px; font-weight: 800; color: #0d9488; letter-spacing: 0.5px; }
          .issued { font-size: 11px; color: #64748b; margin-top: 2px; }
          .grid { display: flex; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px; overflow: hidden; background: #fafafa; }
          .grid-col { flex: 1; padding: 14px; }
          .grid-col:first-child { border-right: 1px solid #e2e8f0; }
          .label { font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 4px; letter-spacing: 0.5px; }
          .val { font-size: 16px; font-weight: 800; color: #0f172a; }
          .val-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #0f172a; color: #ffffff; text-align: left; padding: 12px 10px; font-size: 12px; font-weight: 700; }
          .total-row { background-color: #f0fdfa; font-weight: 800; }
          .remarks-box { margin-top: 20px; padding: 14px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px solid #cbd5e1; }
          @media print {
            body { padding: 0; }
            .report-container { border: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="header">
            <div>
              <div class="clinic-title">Aarogya Care Clinic</div>
              <div class="clinic-sub">DIAGNOSTIC & LABORATORY SERVICES</div>
              <div class="clinic-address">102, Shree Heights, AB Road • Contact: 9876543210</div>
            </div>
            <div style="text-align: right;">
              <div class="badge">LAB DIAGNOSTIC REPORT</div>
              <div class="issued">Issued ${dateStr}, ${timeStr}</div>
            </div>
          </div>

          <div class="grid">
            <div class="grid-col">
              <div class="label">PATIENT DETAILS</div>
              <div class="val">${pName}</div>
              <div class="val-sub">ID: #${pId} • Phone: ${pPhone}</div>
            </div>
            <div class="grid-col">
              <div class="label">REFERRING DOCTOR & CLINIC</div>
              <div class="val">${docName}</div>
              <div class="val-sub">Aarogya Care Diagnostics Unit</div>
            </div>
          </div>

          <div style="font-size: 13px; font-weight: 800; margin-bottom: 8px; color: #334155; letter-spacing: 0.5px;">DIAGNOSTIC TEST READINGS & PARAMETERS</div>
          <table>
            <thead>
              <tr>
                <th style="width: 35%;">Test & Parameter</th>
                <th style="width: 20%;">Result</th>
                <th style="width: 20%;">Ref. Range</th>
                <th style="width: 15%;">Status</th>
                <th style="width: 10%; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="4" style="padding: 12px; font-size: 13px;">Total Diagnostic Charges</td>
                <td style="padding: 12px; text-align: right; font-size: 13px;">Rs ${price}</td>
              </tr>
            </tfoot>
          </table>

          <div class="remarks-box">
            <div style="font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 4px;">CLINICAL FINDINGS & REMARKS</div>
            <div style="font-size: 12px; font-weight: 600; color: #0f172a;">${selectedReport?.remarks || selectedReport?.result_summary || 'Sample adequate. Values are within normal physiological range.'}</div>
          </div>

          <div class="signatures">
            <div>
              <div style="font-size: 12px; font-weight: 800; color: #0f172a;">${selectedReport?.technician_name || 'Lab Technician Specialist'}</div>
              <div style="font-size: 10px; color: #64748b;">Verified & Digitally Signed</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 12px; font-weight: 800; color: #0f172a;">${selectedOrder?.doctor_name || 'Dr. Rahul Sharma'}</div>
              <div style="font-size: 10px; color: #64748b;">Consultant Pathologist</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const triggerPrintWindow = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const htmlContent = generateReportHtml();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 300);
      }
    } else {
      Alert.alert('Printing Report', 'Sending report PDF to printer / download.');
    }
  };

  const handleDownloadReportPdf = () => {
    setPrintModalVisible(true);
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

                        {/* Single Edit Action Button (Opens Edit Lab Report Modal) */}
                        <View style={styles.chipActionsRow}>
                          <TouchableOpacity
                            style={[styles.chipActionBtn, { backgroundColor: '#f0fdfa' }]}
                            onPress={() => handleOpenReportEdit(t)}>
                            <Text style={[styles.chipActionBtnText, { color: '#0d9488' }]}>
                              ✏️ Edit
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

      <Modal visible={viewModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.overviewModalCard}>
            <View style={styles.sheetDragHandle} />
            {/* Header */}
            <View style={styles.overviewHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={styles.overviewHeaderIconBox}>
                  <Text style={{ fontSize: 14 }}>🧪</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.overviewTitle} numberOfLines={1}>Lab Report Overview</Text>
                  <Text style={styles.overviewSubTitle} numberOfLines={1}>
                    {selectedOrder?.patient_name || selectedReport?.patient_name || 'Patient'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => setViewModalVisible(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: '#64748b', fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 12 }}>
              {/* Printable A4 Paper Container */}
              <View style={styles.reportPaperBox}>
                {/* Header row: Clinic Name & Report Type */}
                <View style={styles.reportPaperHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <View style={styles.clinicLogoBox}>
                      <Text style={{ fontSize: 16 }}>🧪</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clinicTitleText}>Aarogya Care Clinic</Text>
                      <Text style={styles.clinicSubText}>DIAGNOSTIC & LABORATORY SERVICES</Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.reportBadgeTypeTitle}>LAB DIAGNOSTIC REPORT</Text>
                    <Text style={styles.issuedDateText}>
                      Issued {new Date().toLocaleDateString('en-US')}
                    </Text>
                  </View>
                </View>

                {/* Meta Grid: Patient Details & Doctor Status */}
                <View style={styles.metaGridContainer}>
                  <View style={[styles.metaGridCol, { borderRightWidth: 1, borderRightColor: '#e2e8f0' }]}>
                    <Text style={styles.metaColLabel}>PATIENT DETAILS</Text>
                    <Text style={styles.metaColVal}>
                      {selectedOrder?.patient_name || selectedReport?.patient_name || 'Patient'}
                    </Text>
                  </View>

                  <View style={styles.metaGridCol}>
                    <Text style={styles.metaColLabel}>DOCTOR & STATUS</Text>
                    <Text style={styles.metaColVal}>
                      {selectedOrder?.doctor_name || 'Dr. Rahul Sharma, Dr Verma'}
                    </Text>
                    <Text style={styles.metaColSub}>
                      {selectedReport ? '1 of 1 reports ready' : '0 of 1 reports ready'}
                    </Text>
                  </View>
                </View>

                {/* TEST RESULTS Section */}
                <Text style={styles.testResultsHeading}>TEST RESULTS</Text>

                {/* Table Container with Horizontal Scroll */}
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
                  <View style={[styles.resultsTableBox, { minWidth: 620 }]}>
                    {/* Dark Header */}
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.tableHeadCell, { width: 140 }]}>Test Name</Text>
                      <Text style={[styles.tableHeadCell, { width: 110 }]}>Parameter</Text>
                      <Text style={[styles.tableHeadCell, { width: 75 }]}>Result</Text>
                      <Text style={[styles.tableHeadCell, { width: 55 }]}>Unit</Text>
                      <Text style={[styles.tableHeadCell, { width: 90 }]}>Reference</Text>
                      <Text style={[styles.tableHeadCell, { width: 80 }]}>Status</Text>
                      <Text style={[styles.tableHeadCell, { width: 70, textAlign: 'right' }]}>Price</Text>
                    </View>

                    {/* Table Rows (Dynamic from Report Parameters or Fallback) */}
                    {parsedViewParameters.map((paramItem, idx) => (
                      <View key={idx} style={styles.tableBodyRow}>
                        <Text style={[styles.tableBodyCellBold, { width: 140 }]}>
                          {selectedOrder?.test_name || selectedReport?.test_name || 'Complete Blood Count'}
                        </Text>
                        <Text style={[styles.tableBodyCellSub, { width: 110 }]}>
                          {paramItem.parameter || 'Awaiting report'}
                        </Text>
                        <Text style={[styles.tableBodyCell, { width: 75 }]}>
                          {paramItem.result || '-'}
                        </Text>
                        <Text style={[styles.tableBodyCell, { width: 55 }]}>
                          {paramItem.unit || '-'}
                        </Text>
                        <Text style={[styles.tableBodyCell, { width: 90 }]}>
                          {paramItem.reference_range || '-'}
                        </Text>
                        <View style={{ width: 80 }}>
                          <View
                            style={[
                              styles.statusPillBadge,
                              paramItem.status === 'Abnormal'
                                ? styles.statusPillAbnormal
                                : paramItem.status === 'Pending'
                                ? styles.statusPillPending
                                : styles.statusPillNormal,
                            ]}>
                            <Text
                              style={[
                                styles.statusPillText,
                                paramItem.status === 'Abnormal'
                                  ? styles.statusTextAbnormal
                                  : paramItem.status === 'Pending'
                                  ? styles.statusTextPending
                                  : styles.statusTextNormal,
                              ]}>
                              {paramItem.status}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.tableBodyCellBold, { width: 70, textAlign: 'right' }]}>
                          Rs {Number(selectedOrder?.price || selectedOrder?.cost || selectedReport?.price || 230).toFixed(2)}
                        </Text>
                      </View>
                    ))}

                    {/* Total Footer Row */}
                    <View style={styles.tableFooterRow}>
                      <Text style={styles.tableFooterTotalLabel}>Total</Text>
                      <Text style={styles.tableFooterTotalVal}>
                        Rs {Number(selectedOrder?.price || selectedOrder?.cost || selectedReport?.price || 230).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              </View>
            </ScrollView>

            {/* Footer Action Buttons: Close & Download Report */}
            <View style={styles.overviewFooterRow}>
              <TouchableOpacity style={styles.downloadPillBtn} onPress={() => setViewModalVisible(false)}>
                <Text style={styles.downloadPillText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.updateReportPillBtn} onPress={handleDownloadReportPdf}>
                <Text style={styles.updateReportPillText}>📥 Download Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full Printable A4 Lab Report Sheet */}
      <Modal visible={printModalVisible} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          {/* Header Bar */}
          <View style={styles.printHeaderBar}>
            <TouchableOpacity style={styles.backBtnPill} onPress={() => setPrintModalVisible(false)}>
              <Text style={styles.backBtnPillText}>← Back</Text>
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 6 }}>
              <Text style={styles.printHeaderTitle} numberOfLines={1}>
                Report #{selectedOrder?.id || selectedReport?.lab_test_id || '19'}
              </Text>
            </View>

            <TouchableOpacity style={styles.triggerPrintBtn} onPress={triggerPrintWindow}>
              <Text style={styles.triggerPrintBtnText}>🖨️ Print Report</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
            <View style={styles.printablePaperCard}>
              {/* Report Header */}
              <View style={styles.reportPaperHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <View style={styles.clinicLogoBox}>
                    <Text style={{ fontSize: 20 }}>🧪</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clinicTitleText}>Aarogya Care Clinic</Text>
                    <Text style={styles.clinicSubText}>DIAGNOSTIC & LABORATORY SERVICES</Text>
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      102, Shree Heights, AB Road • Contact: 9876543210
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                  <Text style={styles.reportBadgeTypeTitle}>
                    LAB DIAGNOSTIC REPORT #{selectedOrder?.id || selectedReport?.lab_test_id || '19'}
                  </Text>
                  <Text style={styles.issuedDateText}>
                    Issued {new Date().toLocaleDateString('en-US')}
                  </Text>
                </View>
              </View>

              {/* Meta Grid */}
              <View style={styles.metaGridContainer}>
                <View style={[styles.metaGridCol, { borderRightWidth: 1, borderRightColor: '#e2e8f0' }]}>
                  <Text style={styles.metaColLabel}>PATIENT DETAILS</Text>
                  <Text style={styles.metaColVal}>
                    {selectedOrder?.patient_name || selectedReport?.patient_name || 'Patient'}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                    ID: #{selectedOrder?.patient_id || selectedReport?.patient_id || 'N/A'} • Phone: {(selectedOrder as any)?.patient_phone || (selectedReport as any)?.patient_phone || '9876543210'}
                  </Text>
                </View>

                <View style={styles.metaGridCol}>
                  <Text style={styles.metaColLabel}>REFERRING DOCTOR & CLINIC</Text>
                  <Text style={styles.metaColVal}>
                    {selectedOrder?.doctor_name || 'Dr. Rahul Sharma, Dr Verma'}
                  </Text>
                  <Text style={styles.metaColSub}>Aarogya Care Diagnostics Unit</Text>
                </View>
              </View>

              {/* Test Results Section */}
              <Text style={[styles.testResultsHeading, { fontSize: 13, marginTop: 6, marginBottom: 8 }]}>
                DIAGNOSTIC TEST READINGS & PARAMETERS
              </Text>

              {/* Fluid Responsive Table */}
              <View style={styles.resultsTableBox}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeadCell, { flex: 2.2 }]}>Test & Parameter</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1.1 }]}>Result</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1 }]}>Ref. Range</Text>
                  <Text style={[styles.tableHeadCell, { flex: 0.9 }]}>Status</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1, textAlign: 'right' }]}>Price</Text>
                </View>

                {parsedViewParameters.map((paramItem, idx) => (
                  <View key={idx} style={styles.tableBodyRow}>
                    <View style={{ flex: 2.2 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>
                        {selectedOrder?.test_name || selectedReport?.test_name || 'Complete Blood Count'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                        {paramItem.parameter || 'RBC'} {paramItem.unit ? `(${paramItem.unit})` : ''}
                      </Text>
                    </View>

                    <Text style={[styles.tableBodyCell, { flex: 1.1, fontWeight: '700' }]}>
                      {paramItem.result || '-'} {paramItem.unit || ''}
                    </Text>

                    <Text style={[styles.tableBodyCell, { flex: 1 }]}>
                      {paramItem.reference_range || '-'}
                    </Text>

                    <View style={{ flex: 0.9 }}>
                      <View
                        style={[
                          styles.statusPillBadge,
                          paramItem.status === 'Abnormal'
                            ? styles.statusPillAbnormal
                            : paramItem.status === 'Pending'
                            ? styles.statusPillPending
                            : styles.statusPillNormal,
                        ]}>
                        <Text
                          style={[
                            styles.statusPillText,
                            paramItem.status === 'Abnormal'
                              ? styles.statusTextAbnormal
                              : paramItem.status === 'Pending'
                              ? styles.statusTextPending
                              : styles.statusTextNormal,
                          ]}>
                          {paramItem.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.tableBodyCellBold, { flex: 1, textAlign: 'right' }]}>
                      Rs {Number(selectedOrder?.price || selectedOrder?.cost || selectedReport?.price || 230).toFixed(2)}
                    </Text>
                  </View>
                ))}

                <View style={styles.tableFooterRow}>
                  <Text style={styles.tableFooterTotalLabel}>Total Diagnostic Charges</Text>
                  <Text style={styles.tableFooterTotalVal}>
                    Rs {Number(selectedOrder?.price || selectedOrder?.cost || selectedReport?.price || 230).toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Technician Remarks */}
              <View style={{ marginTop: 14, padding: 12, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b', marginBottom: 4 }}>
                  CLINICAL FINDINGS & REMARKS
                </Text>
                <Text style={{ fontSize: 12, color: '#0f172a', fontWeight: '600' }}>
                  {selectedReport?.remarks || selectedReport?.result_summary || 'Sample adequate. Values are within normal physiological range.'}
                </Text>
              </View>

              {/* Signatures */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#cbd5e1' }}>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0f172a' }}>
                    {selectedReport?.technician_name || 'Lab Technician Specialist'}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#64748b' }}>Verified & Digitally Signed</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0f172a' }}>
                    {selectedOrder?.doctor_name || 'Dr. Rahul Sharma'}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#64748b' }}>Consultant Pathologist</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.sheetDragHandle} />
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
            <View style={styles.sheetDragHandle} />
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
          <View style={styles.editReportModalCard}>
            <View style={styles.sheetDragHandle} />
            {/* Header */}
            <View style={styles.editReportHeader}>
              <View>
                <Text style={styles.editReportTitle}>Edit Lab Report</Text>
                <Text style={styles.editReportSubTitle}>Update report data for this test.</Text>
              </View>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <Text style={{ fontSize: 20, color: '#64748b', fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14 }}>
              {/* Top Row: Test Price * & Abnormal Dropdown */}
              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>Test Price *</Text>
                  <TextInput
                    style={styles.formInputBox}
                    value={editPrice}
                    onChangeText={setEditPrice}
                    keyboardType="numeric"
                    placeholder="230"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>Abnormal</Text>
                  <TouchableOpacity
                    style={styles.dropdownSelectorBox}
                    onPress={() => setIsAbnormal(isAbnormal === 'No' ? 'Yes' : 'No')}>
                    <Text style={styles.dropdownSelectorText}>{isAbnormal}</Text>
                    <Text style={styles.dropdownArrowIcon}>▾</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Report Parameters * Section */}
              <View style={styles.parametersSectionBox}>
                <View style={styles.parametersHeaderRow}>
                  <Text style={styles.parametersTitleText}>Report Parameters *</Text>
                  <TouchableOpacity style={styles.addParamBtn} onPress={handleAddParameter}>
                    <Text style={styles.addParamBtnText}>+ Add Parameter</Text>
                  </TouchableOpacity>
                </View>

                {/* Dynamic Parameters List */}
                {reportParameters.map((param, index) => (
                  <View key={param.id || index} style={styles.paramCardRow}>
                    <View style={styles.paramColField}>
                      <Text style={styles.paramSubLabel}>Parameter *</Text>
                      <TextInput
                        style={styles.paramInput}
                        value={param.parameter}
                        onChangeText={(txt) => handleUpdateParameter(param.id, 'parameter', txt)}
                        placeholder="RBC"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>

                    <View style={styles.paramColField}>
                      <Text style={styles.paramSubLabel}>Result *</Text>
                      <TextInput
                        style={styles.paramInput}
                        value={param.result}
                        onChangeText={(txt) => handleUpdateParameter(param.id, 'result', txt)}
                        placeholder="11.2"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>

                    <View style={styles.paramColField}>
                      <Text style={styles.paramSubLabel}>Unit</Text>
                      <TextInput
                        style={styles.paramInput}
                        value={param.unit}
                        onChangeText={(txt) => handleUpdateParameter(param.id, 'unit', txt)}
                        placeholder="mg"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>

                    <View style={styles.paramColField}>
                      <Text style={styles.paramSubLabel}>Reference Range</Text>
                      <TextInput
                        style={styles.paramInput}
                        value={param.reference_range}
                        onChangeText={(txt) => handleUpdateParameter(param.id, 'reference_range', txt)}
                        placeholder="12-18"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.deleteParamBtn}
                      onPress={() => handleRemoveParameter(param.id)}>
                      <Text style={styles.deleteParamIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Remarks */}
              <View>
                <Text style={styles.formFieldLabel}>Remarks</Text>
                <TextInput
                  style={[styles.formInputBox, { height: 70, textAlignVertical: 'top' }]}
                  multiline={true}
                  value={reportRemarks}
                  onChangeText={setReportRemarks}
                  placeholder="e.g. Sample adequate. Values are within normal range."
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.editReportFooter}>
              <TouchableOpacity style={styles.cancelPillBtn} onPress={() => setReportModalVisible(false)}>
                <Text style={styles.cancelPillText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.updateReportPillBtn} onPress={handleUploadReport}>
                <Text style={styles.updateReportPillText}>Update Report</Text>
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
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 0,
  },
  sheetDragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  modalCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '92%',
    padding: 20,
    overflow: 'hidden',
  },
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
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
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
  editReportModalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '94%',
    width: '100%',
    overflow: 'hidden',
  },
  editReportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  editReportTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  editReportSubTitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  formInputBox: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  dropdownSelectorBox: {
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
  dropdownArrowIcon: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '800',
  },
  parametersSectionBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  parametersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  parametersTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  addParamBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  addParamBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  paramCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paramColField: {
    flex: 1,
  },
  paramSubLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 3,
  },
  paramInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  deleteParamBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    marginTop: 14,
  },
  deleteParamIcon: {
    fontSize: 14,
    color: '#ef4444',
  },
  editReportFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 26 : 18,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  cancelPillBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  cancelPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  updateReportPillBtn: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#0d9488',
  },
  updateReportPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  overviewModalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '94%',
    width: '100%',
    overflow: 'hidden',
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  overviewHeaderIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  overviewSubTitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  reportPaperBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    elevation: 2,
  },
  reportPaperHeader: {
    flexDirection: 'column',
    borderBottomWidth: 2,
    borderBottomColor: '#0d9488',
    paddingBottom: 12,
    marginBottom: 16,
  },
  clinicLogoBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#ccfbf1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clinicTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0d9488',
  },
  clinicSubText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  reportBadgeTypeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0d9488',
    letterSpacing: 0.5,
  },
  issuedDateText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  metaGridContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  metaGridCol: {
    flex: 1,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  metaColLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  metaColVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  metaColSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  testResultsHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  resultsTableBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tableHeadCell: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  tableBodyRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableBodyCellBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  tableBodyCellSub: {
    fontSize: 12,
    color: '#64748b',
  },
  tableBodyCell: {
    fontSize: 12,
    color: '#334155',
  },
  statusPillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusPillAbnormal: {
    backgroundColor: '#fef2f2',
  },
  statusPillPending: {
    backgroundColor: '#fef3c7',
  },
  statusPillNormal: {
    backgroundColor: '#f0fdf4',
  },
  statusTextAbnormal: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextPending: {
    color: '#b45309',
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextNormal: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '800',
  },
  tableFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  tableFooterTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  tableFooterTotalVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  overviewFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  downloadPillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  downloadPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  printHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 52 : (Platform.OS === 'android' ? 40 : 16),
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 4,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  backBtnPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 7,
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
    textAlign: 'center',
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
    borderColor: '#e2e8f0',
  },
});

export default LabManagementScreen;
