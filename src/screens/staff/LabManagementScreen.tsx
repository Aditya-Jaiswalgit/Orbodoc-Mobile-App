import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  NativeModules,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronDown,
  Download,
  Eye,
  FileText,
  FlaskConical,
  Plus,
  Pencil,
  RefreshCw,
  Search,
  Stethoscope,
  TestTube2,
  Trash2,
  X,
  UsersRound,
  Activity,
  ClipboardCheck,
} from 'lucide-react-native';
import { AppModal } from '../../components/common/AppModal';
import { StaffHeader } from '../../components/common/StaffHeader';
import { Pagination } from '../../components/common/Pagination';
import {
  createLabCatalogItemApi,
  getMasterLabTestsApi,
  mapMasterLabTestApi,
  updateLabReportApi,
  updateLabTestApi,
  updateLabCatalogItemApi,
  updateLabTestStatusApi,
  uploadLabReportApi,
} from '../../api/labApi';
import { BASE_URL } from '../../api/apiConfig';
import { useAuthContext } from '../../context/AuthContext';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import {
  LabReportRecord,
  LabTestRecord,
  useLabManagement,
} from '../../hooks/useLabManagement';
import { styles } from './styles/LabManagement.styles';

type Tab = 'orders' | 'reports' | 'inventory';
type ReportRow = {
  parameter: string;
  value: string;
  unit: string;
  reference_range: string;
};
type MasterTest = {
  id: number;
  test_name: string;
  test_code?: string | null;
  description?: string | null;
  is_mapped_for_clinic?: number;
};
const emptyRow = (): ReportRow => ({
  parameter: '',
  value: '',
  unit: '',
  reference_range: '',
});
const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'sample_collected', label: 'Sample Collected' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];
const normalizeStatus = (status?: string) =>
  String(status || 'pending')
    .toLowerCase()
    .replace(/\s+/g, '_');
const statusColor = (status?: string) => {
  switch (normalizeStatus(status)) {
    case 'completed':
      return '#047857';
    case 'sample_collected':
    case 'processing':
      return '#1d4ed8';
    case 'cancelled':
      return '#b91c1c';
    default:
      return '#b45309';
  }
};
const displayDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
};
const money = (value?: string | number | null) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
const reportRowsFrom = (value: unknown): ReportRow[] => {
  let data = value;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return [emptyRow()];
    }
  }
  const rows =
    data && typeof data === 'object' ? (data as { rows?: unknown }).rows : null;
  if (!Array.isArray(rows) || rows.length === 0) return [emptyRow()];
  return rows.map(row => {
    const item = row as Partial<ReportRow>;
    return {
      parameter: String(item.parameter || ''),
      value: String(item.value || ''),
      unit: String(item.unit || ''),
      reference_range: String(item.reference_range || ''),
    };
  });
};

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildPatientLabReportHtml = (
  clinicName: string,
  patientName: string,
  patientReports: LabReportRecord[],
  patientTests: LabTestRecord[],
) => {
  const reportsByTest = new Map(patientReports.map(report => [Number(report.lab_test_id), report]));
  const doctors = Array.from(new Set(patientTests.map(test => String(test.doctor_name || '').trim()).filter(Boolean)));
  const rows = patientTests.flatMap(test => {
    const report = reportsByTest.get(Number(test.id));
    const safeTestName = escapeHtml(test.test_name || `Test #${test.id}`);
    const price = Number(test.price ?? report?.price ?? 0).toFixed(2);
    if (!report) return [`<tr><td>${safeTestName}</td><td class="muted">Awaiting report</td><td>-</td><td>-</td><td>-</td><td><span class="status-pill pending">Pending</span></td><td class="right">Rs ${price}</td></tr>`];
    const abnormal = Number(report.is_abnormal) === 1;
    const reportRows = reportRowsFrom(report.report_data).filter(row => row.parameter || row.value || row.unit || row.reference_range);
    if (!reportRows.length) return [`<tr><td>${safeTestName}</td><td>-</td><td>-</td><td>-</td><td>-</td><td><span class="status-pill ${abnormal ? 'abnormal' : 'normal'}">${abnormal ? 'Abnormal' : 'Normal'}</span></td><td class="right">Rs ${price}</td></tr>`];
    return reportRows.map((row, index) => `<tr><td>${index === 0 ? safeTestName : ''}</td><td>${escapeHtml(row.parameter || '-')}</td><td>${escapeHtml(row.value || '-')}</td><td>${escapeHtml(row.unit || '-')}</td><td>${escapeHtml(row.reference_range || '-')}</td><td>${index === 0 ? `<span class="status-pill ${abnormal ? 'abnormal' : 'normal'}">${abnormal ? 'Abnormal' : 'Normal'}</span>` : ''}</td><td class="right">${index === 0 ? `Rs ${price}` : ''}</td></tr>`);
  });
  const total = patientTests.reduce((sum, test) => sum + Number(test.price || 0), 0);
  const remarks = patientTests.map(test => {
    const value = reportsByTest.get(Number(test.id))?.remarks;
    return value ? `<li><b>${escapeHtml(test.test_name)}:</b> ${escapeHtml(value)}</li>` : '';
  }).filter(Boolean).join('');
  const rowsHtml = rows.length ? rows.join('') : '<tr><td colspan="7" style="text-align:center">No tests available</td></tr>';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(clinicName)} - Lab Report - ${escapeHtml(patientName)}</title><style>
    body{font-family:Arial,sans-serif;margin:18px;color:hsl(215 25% 15%);background:hsl(210 40% 98%)}.page{width:100%;max-width:896px;margin:0 auto;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,.08);background:#fff;box-sizing:border-box}.report-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;border-bottom:2px solid hsl(174 62% 40%);padding:22px 24px;background:#fff}.brand{display:flex;min-width:0;align-items:center;gap:12px}.brand-mark{width:48px;height:48px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:hsl(174 50% 92%);color:hsl(174 62% 30%);font-size:24px;font-weight:700}.brand h1,.report-meta h2{margin:0}.brand h1{font-size:24px;line-height:1.2}.brand p,.report-meta p{margin:5px 0 0;font-size:12px;color:hsl(215 15% 45%)}.report-meta{flex:0 0 auto;text-align:right}.report-meta .kind{color:hsl(174 62% 30%);font-size:12px;font-weight:700;text-transform:uppercase}.muted{color:hsl(215 15% 50%)}.info{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #e2e8f0}.info-card{padding:18px 24px;border-right:1px solid #e2e8f0}.info-card:last-child{border-right:0}.info-card p{margin:5px 0;font-size:13px}.tbl-wrap{padding:18px 24px;overflow-x:auto}.report-results{width:100%;border-collapse:collapse;margin-bottom:12px}.report-results th{background:#020617;border:1px solid #020617;color:#fff;text-align:left;padding:12px 10px;font-size:12px}.report-results td{border:1px solid hsl(214 25% 90%);padding:12px 10px;font-size:12px;vertical-align:top}.report-results tbody tr:nth-child(odd) td{background:#f8fafc}.report-results tbody tr:last-child td{background:#f0fdfa}.right{text-align:right}.status-pill{display:inline-block;border-radius:999px;padding:4px 10px;font-size:11px;font-weight:700;white-space:nowrap}.status-pill.normal{background:#d1fae5;color:#047857}.status-pill.abnormal{background:#fee2e2;color:#b91c1c}.status-pill.pending{border:1px solid #fcd34d;background:#fffbeb;color:#b45309}.report-summary{display:grid;grid-template-columns:1fr 1fr;gap:24px;border-top:1px solid #e2e8f0;margin:0 24px;padding:18px 0}.report-summary h3{margin:0 0 8px;color:#64748b;font-size:11px;text-transform:uppercase}.report-summary p{margin:0;color:#334155;font-size:13px}.report-summary .status{text-align:right}.report-note{padding:14px 18px;text-align:center;color:hsl(215 15% 50%);font-size:11px;border-top:1px solid hsl(214 25% 90%);background:#f8fafc}@page{size:A4 portrait;margin:10mm}@media print{html,body{margin:0;padding:0;background:#fff}.page{max-width:none;border:1px solid #e2e8f0;box-shadow:none}.report-results th{background:#020617!important;color:#fff!important}.report-results tbody tr:last-child td{background:#f0fdfa!important}.status-pill.normal{background:#d1fae5!important;color:#047857!important}.status-pill.abnormal{background:#fee2e2!important;color:#b91c1c!important}.status-pill.pending{background:#fffbeb!important;color:#b45309!important}}@media(max-width:640px){.report-heading,.info,.report-summary{display:block}.report-meta,.report-summary .status{margin-top:16px;text-align:left}.report-results{min-width:760px}}
  </style></head><body><div class="page"><div class="report-heading"><div class="brand"><div class="brand-mark">+</div><div><h1>${escapeHtml(clinicName || 'Clinic')}</h1><p>Diagnostic &amp; Laboratory Services</p></div></div><div class="report-meta"><p class="kind">Lab Diagnostic Report</p><p>Issued ${escapeHtml(new Date().toLocaleString())}</p></div></div><div class="info"><div class="info-card"><p class="muted"><b>PATIENT DETAILS</b></p><p><b>${escapeHtml(patientName || '-')}</b></p></div><div class="info-card"><p class="muted"><b>DOCTOR &amp; STATUS</b></p><p><b>${escapeHtml(doctors.length ? doctors.join(', ') : '-')}</b></p><p>${patientReports.length} of ${patientTests.length} reports ready</p></div></div><div class="tbl-wrap"><p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase">Test Results</p><table class="report-results"><thead><tr><th>Test</th><th>Parameter</th><th>Result</th><th>Unit</th><th>Reference</th><th>Status</th><th class="right">Price</th></tr></thead><tbody>${rowsHtml}<tr><td colspan="6" class="right"><b>Total</b></td><td class="right"><b>Rs ${total.toFixed(2)}</b></td></tr></tbody></table></div><div class="report-summary"><div><h3>Remarks</h3><p>${remarks ? `<ul>${remarks}</ul>` : 'Report results are pending.'}</p></div><div class="status"><h3>Report Status</h3><p><b>${patientReports.length === patientTests.length && patientTests.length > 0 ? 'Complete' : 'In progress'}</b></p></div></div><div class="report-note">This is a system-generated diagnostic report.</div></div></body></html>`;
};

interface Props {
  onOpenDrawer: () => void;
  initialTab?: 'orders' | 'reports';
  initialStatus?: string;
}

export const LabManagementScreen: React.FC<Props> = ({
  onOpenDrawer,
  initialTab = 'orders',
  initialStatus,
}) => {
  const {
    token,
    user,
    role,
    activeClinicId,
    activeClinicName,
    assignedClinics,
    permissionsMap = {},
  } = useAuthContext();
  const { tests, reports, catalog, loading, refreshing, error, lastRefreshed, refresh } =
    useLabManagement(token, activeClinicId);
  const [tab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusTest, setStatusTest] = useState<LabTestRecord | null>(null);
  const [reportTest, setReportTest] = useState<LabTestRecord | null>(null);
  const [reportToEdit, setReportToEdit] = useState<LabReportRecord | null>(
    null,
  );
  const [reportPrice, setReportPrice] = useState('');
  const [abnormalPickerOpen, setAbnormalPickerOpen] = useState(false);
  const [selectedPatientGroup, setSelectedPatientGroup] = useState<{
    patientId: string;
    patientName: string;
    tests: LabTestRecord[];
  } | null>(null);
  const [catalogEditorOpen, setCatalogEditorOpen] = useState(false);
  const [masterPickerOpen, setMasterPickerOpen] = useState(false);
  const [masterTests, setMasterTests] = useState<MasterTest[]>([]);
  const [masterSearch, setMasterSearch] = useState('');
  const [selectedMasterTest, setSelectedMasterTest] =
    useState<MasterTest | null>(null);
  const [masterMapping, setMasterMapping] = useState({
    price: '',
    discount_price: '',
  });
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<
    (typeof catalog)[number] | null
  >(null);
  const [catalogForm, setCatalogForm] = useState({
    test_name: '',
    test_code: '',
    description: '',
    price: '',
    discount_price: '',
  });
  const [homeCollectionAvailable, setHomeCollectionAvailable] = useState(false);
  const [testAvailable, setTestAvailable] = useState(true);
  const [statusValue, setStatusValue] = useState('pending');
  const [reportRows, setReportRows] = useState<ReportRow[]>([emptyRow()]);
  const [remarks, setRemarks] = useState('');
  const [referenceRange, setReferenceRange] = useState('');
  const [abnormal, setAbnormal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [loadingMasterTests, setLoadingMasterTests] = useState(false);
  const [busyStatusId, setBusyStatusId] = useState<number | null>(null);
  const canView = canUseStaffScreen(role, permissionsMap, 'lab_tests', 'view');
  const canUpdate = canUseStaffScreen(
    role,
    permissionsMap,
    'lab_tests',
    'edit',
  );
  const canCreateReport =
    canUseStaffScreen(role, permissionsMap, 'lab_reports', 'add') ||
    canUseStaffScreen(role, permissionsMap, 'lab_tests', 'add');
  const canEditReport =
    canUseStaffScreen(role, permissionsMap, 'lab_reports', 'edit') ||
    canUseStaffScreen(role, permissionsMap, 'lab_tests', 'edit');
  const canAddInventory =
    canUseStaffScreen(role, permissionsMap, 'lab_inventory', 'add') ||
    canUseStaffScreen(role, permissionsMap, 'lab_tests', 'add');
  const canEditInventory =
    canUseStaffScreen(role, permissionsMap, 'lab_inventory', 'edit') ||
    canUseStaffScreen(role, permissionsMap, 'lab_tests', 'edit');
  const canManageInventory = canAddInventory || canEditInventory;
  const clinicName =
    assignedClinics.find(clinic => clinic.id === activeClinicId)?.name ||
    activeClinicName ||
    'Selected Clinic';

  const getClinicPrice = (test: Pick<LabTestRecord, 'test_name' | 'test_code' | 'price'>) => {
    const normalizedName = String(test.test_name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const normalizedCode = String(test.test_code || '').trim().toLowerCase();
    const item = (normalizedCode ? catalog.find(entry => String(entry.test_code || '').trim().toLowerCase() === normalizedCode) : undefined) ||
      catalog.find(entry => String(entry.test_name || '').trim().toLowerCase().replace(/\s+/g, ' ') === normalizedName);
    const catalogPrice = Number(item?.price);
    return item && Number.isFinite(catalogPrice) ? catalogPrice : Number(test.price || 0);
  };
  const filteredTests = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tests.filter(
      test =>
        (initialStatus !== 'pending' || normalizeStatus(test.status) === 'pending') &&
        (!needle ||
        [
          test.id,
          test.patient_id,
          test.patient_name,
          test.doctor_name,
          test.test_name,
          test.test_code,
          test.status,
        ].some(value =>
          String(value || '')
            .toLowerCase()
            .includes(needle),
        )),
    );
  }, [initialStatus, query, tests]);
  const groupedTests = useMemo(() => {
    const groups = new Map<
      string,
      { patientId: string; patientName: string; tests: LabTestRecord[] }
    >();
    filteredTests.forEach(test => {
      const patientId = String(test.patient_id || 'unknown');
      const group = groups.get(patientId) || {
        patientId,
        patientName: test.patient_name || `Patient #${patientId}`,
        tests: [],
      };
      group.tests.push(test);
      groups.set(patientId, group);
    });
    return Array.from(groups.values()).map(group => ({
      ...group,
      tests: [...group.tests].sort((a, b) => b.id - a.id),
    }));
  }, [filteredTests]);
  const filteredReports = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return reports.filter(
      report =>
        !needle ||
        [
          report.id,
          report.lab_test_id,
          report.patient_name,
          report.test_name,
          report.technician_name,
          report.remarks,
        ].some(value =>
          String(value || '')
            .toLowerCase()
            .includes(needle),
        ),
    );
  }, [query, reports]);
  const filteredCatalog = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalog.filter(
      item =>
        !needle ||
        [item.test_name, item.test_code, item.description].some(value =>
          String(value || '')
            .toLowerCase()
            .includes(needle),
        ),
    );
  }, [catalog, query]);
  // Keep the dashboard definition in sync with web: completed tests remain active until cancelled.
  const activeCount = tests.filter(
    test => normalizeStatus(test.status) !== 'cancelled',
  ).length;
  // Count report coverage per lab order, not duplicate report rows for the same order.
  const testIds = new Set(tests.map(test => Number(test.id)));
  const readyCount = new Set(
    reports
      .map(report => Number(report.lab_test_id))
      .filter(testId => Number.isFinite(testId) && testId > 0 && testIds.has(testId)),
  ).size;
  const pageItems =
    tab === 'orders'
      ? groupedTests
      : tab === 'reports'
      ? filteredReports
      : filteredCatalog;
  const pageCount = Math.max(1, Math.ceil(pageItems.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = pageItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const openReportEditor = (test: LabTestRecord, report?: LabReportRecord) => {
    setReportTest(test);
    setReportToEdit(report || null);
    setReportPrice(String(getClinicPrice(test)));
    setAbnormalPickerOpen(false);
    setReportRows(report ? reportRowsFrom(report.report_data) : [emptyRow()]);
    setRemarks(report?.remarks || '');
    setReferenceRange(report?.reference_range || '');
    setAbnormal(Number(report?.is_abnormal || 0) === 1);
  };

  const openCatalogEditor = (item?: (typeof catalog)[number]) => {
    setSelectedCatalogItem(item || null);
    setCatalogForm({
      test_name: item?.test_name || '',
      test_code: item?.test_code || '',
      description: item?.description || '',
      price: item ? String(item.price || 0) : '',
      discount_price: item ? String(item.discount_price || 0) : '',
    });
    setHomeCollectionAvailable(
      Number(item?.home_collection_available || 0) === 1,
    );
    setTestAvailable(Number(item?.is_available ?? 1) === 1);
    setCatalogEditorOpen(true);
  };

  const saveCatalogItem = async () => {
    if (!token || !activeClinicId) return;
    if (
      !catalogForm.test_name.trim() ||
      !catalogForm.price ||
      Number(catalogForm.price) < 0
    ) {
      showErrorToast(
        'Test details required',
        'Enter a test name and valid price.',
      );
      return;
    }
    setSavingCatalog(true);
    const payload = {
      clinic_id: activeClinicId,
      test_name: catalogForm.test_name.trim(),
      test_code: catalogForm.test_code.trim() || null,
      description: catalogForm.description.trim() || null,
      price: Number(catalogForm.price),
      discount_price: Number(catalogForm.discount_price || 0),
      home_collection_available: Number(homeCollectionAvailable),
      is_available: Number(testAvailable),
    };
    try {
      const result = selectedCatalogItem
        ? await updateLabCatalogItemApi(token, selectedCatalogItem.id, payload)
        : await createLabCatalogItemApi(token, payload);
      if (!result.success)
        throw new Error(result.message || 'Could not save clinic test');
      showSuccessToast(
        selectedCatalogItem ? 'Test updated' : 'Test added',
        `${payload.test_name} saved in clinic inventory.`,
      );
      setCatalogEditorOpen(false);
      await refresh();
    } catch (cause) {
      showErrorToast(
        'Inventory save failed',
        cause instanceof Error ? cause.message : 'Please try again.',
      );
    } finally {
      setSavingCatalog(false);
    }
  };

  const openMasterTests = async () => {
    if (!token || !activeClinicId) return;
    setMasterPickerOpen(true);
    setLoadingMasterTests(true);
    try {
      const response = await getMasterLabTestsApi(token, activeClinicId);
      if (!response.success)
        throw new Error(response.message || 'Could not load master tests');
      const data = response.data as
        | { data?: MasterTest[] }
        | MasterTest[]
        | undefined;
      setMasterTests(
        Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [],
      );
    } catch (cause) {
      showErrorToast(
        'Master tests unavailable',
        cause instanceof Error ? cause.message : 'Please try again.',
      );
    } finally {
      setLoadingMasterTests(false);
    }
  };

  const saveMasterMapping = async () => {
    if (!token || !activeClinicId || !selectedMasterTest) return;
    if (!masterMapping.price || Number(masterMapping.price) < 0) {
      showErrorToast(
        'Price required',
        'Enter a valid clinic price for this test.',
      );
      return;
    }
    setSavingCatalog(true);
    try {
      const response = await mapMasterLabTestApi(token, {
        clinic_id: activeClinicId,
        lab_test_id: selectedMasterTest.id,
        price: Number(masterMapping.price),
        discount_price: Number(masterMapping.discount_price || 0),
        home_collection_available: Number(homeCollectionAvailable),
        is_available: Number(testAvailable),
      });
      if (!response.success)
        throw new Error(
          response.message || 'Could not add master test to clinic',
        );
      showSuccessToast(
        'Clinic test added',
        `${selectedMasterTest.test_name} is now in clinic inventory.`,
      );
      setMasterPickerOpen(false);
      setSelectedMasterTest(null);
      await refresh();
    } catch (cause) {
      showErrorToast(
        'Could not map test',
        cause instanceof Error ? cause.message : 'Please try again.',
      );
    } finally {
      setSavingCatalog(false);
    }
  };

  const saveStatus = async () => {
    if (!statusTest || !token) return;
    setBusyStatusId(statusTest.id);
    try {
      const now = new Date().toISOString();
      const timestamps =
        statusValue === 'sample_collected'
          ? { sample_collected_at: now }
          : statusValue === 'completed'
          ? { report_ready_at: now }
          : {};
      const result = await updateLabTestStatusApi(
        token,
        statusTest.id,
        statusValue,
        timestamps,
      );
      if (!result.success)
        throw new Error(result.message || 'Status update failed');
      showSuccessToast(
        'Status updated',
        `${statusTest.test_name}: ${statusValue.replace(/_/g, ' ')}`,
      );
      setStatusTest(null);
      await refresh();
    } catch (cause) {
      showErrorToast(
        'Status update failed',
        cause instanceof Error ? cause.message : 'Please try again.',
      );
    } finally {
      setBusyStatusId(null);
    }
  };

  const saveReport = async () => {
    if (!reportTest || !token) return;
    if (!reportPrice.trim() || !Number.isFinite(Number(reportPrice)) || Number(reportPrice) < 0) {
      showErrorToast('Test price required', 'Enter a valid test price.');
      return;
    }
    const validRows = reportRows.filter(
      row => row.parameter.trim() || row.value.trim(),
    );
    if (
      !validRows.length ||
      validRows.some(row => !row.parameter.trim() || !row.value.trim())
    ) {
      showErrorToast(
        'Report details required',
        'Enter both a parameter and result value for each report row.',
      );
      return;
    }
    setSaving(true);
    const payload = {
      report_data: { rows: validRows },
      remarks: remarks.trim() || undefined,
      reference_range: referenceRange.trim() || undefined,
      is_abnormal: abnormal ? 1 : 0,
    };
    try {
      const priceResult = await updateLabTestApi(token, reportTest.id, {
        price: Number(reportPrice),
      });
      if (!priceResult.success)
        throw new Error(priceResult.message || 'Could not update test price');
      const result = reportToEdit
        ? await updateLabReportApi(token, reportToEdit.id, payload)
        : await uploadLabReportApi(token, {
            lab_test_id: reportTest.id,
            lab_technician_id: user?.id,
            ...payload,
          });
      if (!result.success)
        throw new Error(result.message || 'Could not save report');
      showSuccessToast(
        reportToEdit ? 'Report updated' : 'Report added',
        `Report for ${reportTest.test_name} saved successfully.`,
      );
      setReportTest(null);
      setReportToEdit(null);
      await refresh();
    } catch (cause) {
      showErrorToast(
        'Report save failed',
        cause instanceof Error ? cause.message : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const openReportFile = async (url?: string | null) => {
    if (!url) {
      showErrorToast('File unavailable', 'This report has no uploaded file.');
      return;
    }
    try {
      const uri = /^(https?:\/\/|file:)/i.test(url)
        ? url
        : `${BASE_URL.replace(/\/api\/?$/, '')}/${url.replace(/^\/+/, '')}`;
      await Linking.openURL(uri);
    } catch {
      showErrorToast(
        'Could not open file',
        'Try again or open this report from a browser.',
      );
    }
  };

  const downloadPatientReport = async () => {
    if (!selectedPatientGroup) return;
    if (Platform.OS !== 'android' || !NativeModules.BillPdfDownload?.downloadHtmlAsPdf) {
      showErrorToast('PDF download unavailable', 'Lab report PDF download is currently available on Android.');
      return;
    }
    const group = selectedPatientGroup;
    const patientReports = reports.filter(report => group.tests.some(test => Number(test.id) === Number(report.lab_test_id)));
    const pricedTests = group.tests.map(test => ({ ...test, price: getClinicPrice(test) }));
    const html = buildPatientLabReportHtml(clinicName, group.patientName, patientReports, pricedTests);
    const fileName = `patient-${String(group.patientId).replace(/[^a-zA-Z0-9_-]/g, '_')}-lab-report.pdf`;
    setDownloadingReport(true);
    try {
      await NativeModules.BillPdfDownload.downloadHtmlAsPdf(html, fileName);
      showSuccessToast('PDF downloaded', `${fileName} is saved in Downloads.`);
    } catch (cause) {
      showErrorToast('Download failed', cause instanceof Error ? cause.message : 'Could not create the report PDF.');
    } finally {
      setDownloadingReport(false);
    }
  };

  const renderReportCard = (report: LabReportRecord) => {
    const rows = reportRowsFrom(report.report_data).filter(
      row => row.parameter || row.value,
    );
    return (
      <View key={report.id} style={styles.reportCard}>
        <View style={styles.cardHeading}>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>
              {report.test_name || `Lab Test #${report.lab_test_id}`}
            </Text>
            <Text style={styles.cardMeta}>
              Report #{report.id} · Test #{report.lab_test_id}
            </Text>
          </View>
          {Number(report.is_abnormal) === 1 ? (
            <View style={styles.abnormalBadge}>
              <Text style={styles.abnormalText}>Abnormal</Text>
            </View>
          ) : (
            <View style={styles.readyBadge}>
              <Text style={styles.readyText}>Report ready</Text>
            </View>
          )}
        </View>
        <Text style={styles.patientLabel}>
          {report.patient_name || 'Patient'} · {displayDate(report.uploaded_at)}
        </Text>
        {rows.map((row, index) => (
          <View key={`${report.id}-${index}`} style={styles.resultRow}>
            <Text style={styles.resultParameter}>{row.parameter}</Text>
            <Text style={styles.resultValue}>
              {row.value}
              {row.unit ? ` ${row.unit}` : ''}
            </Text>
            {!!row.reference_range && (
              <Text style={styles.resultReference}>
                Range: {row.reference_range}
              </Text>
            )}
          </View>
        ))}
        {!!report.remarks && (
          <Text style={styles.reportRemarks}>{report.remarks}</Text>
        )}
        {report.report_file_url ? (
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={() => openReportFile(report.report_file_url)}
          >
            <Download size={16} color="#0f766e" />
            <Text style={styles.downloadText}>Open report file</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Lab Tests" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <View style={styles.pageHeading}>
          <View style={styles.headingIcon}>
            <TestTube2 size={23} color="#0D9488" />
          </View>
          <View style={styles.flex}>
            <Text style={styles.pageTitle}>Lab Tests</Text>
            <Text style={styles.pageSubtitle}>
              Manage clinic tests and diagnostic reports
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          disabled={refreshing}
          onPress={refresh}
        >
          {refreshing ? <ActivityIndicator size="small" color="#0f766e" /> : <RefreshCw size={16} color="#0f172a" />}
          <Text style={styles.refreshButtonText}>{refreshing ? 'Refreshing' : 'Refresh'}</Text>
        </TouchableOpacity>
        {lastRefreshed ? (
          <Text style={styles.lastRefreshedText}>Last refreshed: {lastRefreshed}</Text>
        ) : null}

        <View style={styles.searchPanel}>
          <View style={styles.searchBox}>
            <Search size={17} color="#64748b" />
            <TextInput
              value={query}
              onChangeText={value => { setQuery(value); setPage(1); }}
              placeholder="Search patient ID, name, or mobile"
              placeholderTextColor="#71839d"
              style={styles.searchInput}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity style={styles.searchButton} onPress={() => setPage(1)}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
          <View style={styles.clinicDataNote}>
            <View style={styles.onlineDot} />
            <Text style={styles.clinicDataText}>Showing data for </Text>
            <Text style={styles.clinicDataName} numberOfLines={1}>{clinicName}</Text>
          </View>
        </View>

        <View style={styles.labResultsPanel}>
        <View style={styles.labSummary}>
          <View style={styles.summaryHeading}>
            <View style={styles.summaryIcon}><TestTube2 size={21} color="#fff" /></View>
            <View style={styles.flex}>
              <View style={styles.summaryTitleRow}>
                <Text style={styles.summaryTitle}>Lab Tests</Text>
                <View style={styles.summaryCount}><Text style={styles.summaryCountText}>{tests.length}</Text></View>
              </View>
              <Text style={styles.summarySubtitle}>Patient-wise diagnostic orders and report progress</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
          <Stat
            icon={<UsersRound size={15} color="#2563eb" />}
            label="Patients"
            value={groupedTests.length}
          />
          <Stat
            icon={<Activity size={15} color="#059669" />}
            label="Active"
            value={activeCount}
          />
          <Stat
            icon={<ClipboardCheck size={15} color="#d97706" />}
            label="Reports"
            value={readyCount}
          />
          </View>
        </View>
        <View style={styles.listDivider}>
          <View style={styles.dividerTeal} />
          <View style={styles.dividerBlue} />
          <View style={styles.dividerOrange} />
        </View>

        {tab === 'inventory' && canManageInventory ? (
          <View style={styles.inventoryActions}>
            {canAddInventory ? (
              <>
                <TouchableOpacity
                  style={styles.addInventoryButton}
                  onPress={() => openCatalogEditor()}
                >
                  <Plus size={16} color="#fff" />
                  <Text style={styles.addInventoryText}>Add Custom Test</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.masterButton}
                  onPress={() => openMasterTests()}
                >
                  <FlaskConical size={16} color="#0f766e" />
                  <Text style={styles.secondaryText}>Browse Master Tests</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={refresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {loading ? (
          <ActivityIndicator
            style={styles.loading}
            size="large"
            color="#0f766e"
          />
        ) : null}
        {!canView ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              You do not have permission to view lab tests.
            </Text>
          </View>
        ) : null}
        {!loading &&
          !error &&
          canView &&
          tab === 'orders' &&
          visibleItems.map(rawGroup => {
            const group = rawGroup as {
              patientId: string;
              patientName: string;
              tests: LabTestRecord[];
            };
            const groupTotal = group.tests.reduce(
              (sum, test) => sum + getClinicPrice(test),
              0,
            );
            return (
              <View key={group.patientId} style={styles.patientCard}>
                <View style={styles.patientHeader}>
                  <View style={styles.patientAvatar}><Text style={styles.patientAvatarText}>{(group.patientName || 'P').slice(0, 1).toUpperCase()}</Text></View>
                  <View style={styles.flex}>
                    <Text style={styles.patientName}>{group.patientName}</Text>
                    <Text style={styles.cardMeta}>
                      ID {group.patientId} · {group.tests.length} test
                    </Text>
                  </View>
                  <Text style={styles.totalPrice}>{money(groupTotal)}</Text>
                </View>
                {group.tests.map(test => {
                  const report = reports.find(
                    item => Number(item.lab_test_id) === Number(test.id),
                  );
                  return (
                    <View key={test.id} style={styles.testCard}>
                      <View style={styles.patientDoctorRow}>
                        <Text style={styles.patientDoctor} numberOfLines={1}>{test.doctor_name || 'Doctor not assigned'}</Text>
                        <View style={[styles.statusBadge, { borderColor: `${statusColor(test.status)}25`, backgroundColor: `${statusColor(test.status)}12` }]}>
                          <Text style={[styles.statusText, { color: statusColor(test.status) }]}>{normalizeStatus(test.status).replace(/_/g, ' ')}</Text>
                        </View>
                      </View>
                      <View style={styles.testSummaryBox}>
                        <Text style={styles.cardTitle} numberOfLines={2}>#{test.id} · {test.test_name}</Text>
                        <View style={styles.testSummaryActions}>
                          <Text style={styles.pricePill}>{money(test.price)}</Text>
                          <View style={report ? styles.readyBadge : styles.pendingBadge}>
                            <Text style={report ? styles.readyText : styles.pendingText}>{report ? 'Report Ready' : 'Report Pending'}</Text>
                          </View>
                          {report && canEditReport ? <TouchableOpacity style={styles.editReportAction} accessibilityLabel="Edit report" onPress={() => openReportEditor(test, report)}><View style={styles.reportCheckCircle} /><Pencil size={15} color="#0f172a" /><Text style={styles.editReportText}>Edit</Text></TouchableOpacity> : !report && canCreateReport ? <TouchableOpacity style={styles.editReportAction} accessibilityLabel="Add report" onPress={() => openReportEditor(test)}><Pencil size={15} color="#0f172a" /><Text style={styles.editReportText}>Edit</Text></TouchableOpacity> : null}
                        </View>
                      </View>
                      {selectedPatientGroup?.patientId === group.patientId ? <>
                      <View style={styles.cardHeading}>
                        <View style={styles.flex}>
                          <Text style={styles.cardTitle}>{test.test_name}</Text>
                          <Text style={styles.cardMeta}>
                            Order #{test.id} · {displayDate(test.created_at)}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              borderColor: `${statusColor(test.status)}45`,
                              backgroundColor: `${statusColor(test.status)}12`,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              { color: statusColor(test.status) },
                            ]}
                          >
                            {normalizeStatus(test.status).replace(/_/g, ' ')}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.testDetails}>
                        <Detail
                          icon={<Stethoscope size={15} color="#0f766e" />}
                          label="Doctor"
                          value={test.doctor_name || '—'}
                        />
                        <Detail
                          icon={<TestTube2 size={15} color="#0f766e" />}
                          label="Type"
                          value={
                            test.test_type ||
                            test.test_code ||
                            'Diagnostic test'
                          }
                        />
                        <Detail
                          icon={<FileText size={15} color="#0f766e" />}
                          label="Report"
                          value={report ? 'Ready' : 'Pending'}
                        />
                        <Detail
                          icon={null}
                          label="Price"
                          value={money(test.price)}
                        />
                      </View>
                      <View style={styles.actions}>
                        {canUpdate ? (
                          <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => {
                              setStatusTest(test);
                              setStatusValue(normalizeStatus(test.status));
                            }}
                          >
                            <RefreshCw size={15} color="#0f766e" />
                            <Text style={styles.secondaryText}>
                              Update Status
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                        {report && canEditReport ? (
                          <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => openReportEditor(test, report)}
                          >
                            <FileText size={15} color="#0f766e" />
                            <Text style={styles.secondaryText}>
                              Edit Report
                            </Text>
                          </TouchableOpacity>
                        ) : !report && canCreateReport ? (
                          <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => openReportEditor(test)}
                          >
                            <Plus size={15} color="#0f766e" />
                            <Text style={styles.secondaryText}>Add Report</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      </> : null}
                    </View>
                  );
                })}
                <View style={styles.patientFooter}>
                  <TouchableOpacity style={styles.viewButton} onPress={() => setSelectedPatientGroup(group)}>
                    <Eye size={15} color="#334155" />
                    <Text style={styles.viewButtonText}>View</Text>
                  </TouchableOpacity>
                  <Text style={styles.readyCountText}>{group.tests.filter(test => reports.some(item => Number(item.lab_test_id) === Number(test.id))).length} ready</Text>
                </View>
              </View>
            );
          })}
        {!loading &&
          !error &&
          canView &&
          tab === 'reports' &&
          visibleItems.map(report =>
            renderReportCard(report as LabReportRecord),
          )}
        {!loading &&
          !error &&
          canView &&
          tab === 'inventory' &&
          visibleItems.map(rawItem => {
            const item = rawItem as (typeof catalog)[number];
            const available = Number(item.is_available) === 1;
            return (
              <View key={item.id} style={styles.reportCard}>
                <View style={styles.cardHeading}>
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle}>{item.test_name}</Text>
                    <Text style={styles.cardMeta}>
                      {item.test_code || 'Custom clinic test'} ·{' '}
                      {item.description || 'No description'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.readyBadge,
                      !available && styles.abnormalBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.readyText,
                        !available && styles.abnormalText,
                      ]}
                    >
                      {available ? 'Available' : 'Hidden'}
                    </Text>
                  </View>
                </View>
                <View style={styles.testDetails}>
                  <Detail icon={null} label="Price" value={money(item.price)} />
                  <Detail
                    icon={null}
                    label="Discount price"
                    value={money(item.discount_price)}
                  />
                  <Detail
                    icon={null}
                    label="Home collection"
                    value={
                      Number(item.home_collection_available) === 1
                        ? 'Available'
                        : 'Not available'
                    }
                  />
                </View>
                {canEditInventory ? (
                  <TouchableOpacity
                    style={[styles.secondaryButton, styles.inventoryEditButton]}
                    onPress={() => openCatalogEditor(item)}
                  >
                    <FileText size={15} color="#0f766e" />
                    <Text style={styles.secondaryText}>Edit Test</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        {!loading && !error && canView && pageItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <TestTube2 size={28} color="#94a3b8" />
            <Text style={styles.emptyText}>
              {tab === 'orders'
                ? 'No lab tests found for this clinic.'
                : tab === 'reports'
                ? 'No lab reports have been uploaded yet.'
                : 'No clinic tests are configured yet.'}
            </Text>
          </View>
        ) : null}
        {canView && pageItems.length > 0 ? (
          <Pagination
            currentPage={currentPage}
            totalPages={pageCount}
            totalItems={pageItems.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={size => {
              setPageSize(size);
              setPage(1);
            }}
          />
        ) : null}
        </View>
      </ScrollView>

      <AppModal
        visible={masterPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setMasterPickerOpen(false);
          setSelectedMasterTest(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>
                {selectedMasterTest
                  ? 'Add Master Test to Clinic'
                  : 'Master Lab Tests'}
              </Text>
              {selectedMasterTest ? (
                <>
                  <Text style={styles.modalSubtitle}>
                    {selectedMasterTest.test_name}
                    {selectedMasterTest.test_code
                      ? ` · ${selectedMasterTest.test_code}`
                      : ''}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Clinic price *"
                    keyboardType="decimal-pad"
                    value={masterMapping.price}
                    onChangeText={value =>
                      setMasterMapping(current => ({
                        ...current,
                        price: value,
                      }))
                    }
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Discount price"
                    keyboardType="decimal-pad"
                    value={masterMapping.discount_price}
                    onChangeText={value =>
                      setMasterMapping(current => ({
                        ...current,
                        discount_price: value,
                      }))
                    }
                  />
                  <ToggleRow
                    label="Home collection available"
                    value={homeCollectionAvailable}
                    onPress={() => setHomeCollectionAvailable(value => !value)}
                  />
                  <ToggleRow
                    label="Available for booking"
                    value={testAvailable}
                    onPress={() => setTestAvailable(value => !value)}
                  />
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setSelectedMasterTest(null)}
                    >
                      <Text style={styles.cancelText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      disabled={savingCatalog}
                      onPress={() => saveMasterMapping()}
                    >
                      {savingCatalog ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.primaryText}>Add to Clinic</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Search master tests"
                    value={masterSearch}
                    onChangeText={setMasterSearch}
                  />
                  {loadingMasterTests ? (
                    <ActivityIndicator style={styles.loading} color="#0f766e" />
                  ) : (
                    masterTests
                      .filter(
                        item =>
                          !masterSearch.trim() ||
                          `${item.test_name} ${item.test_code || ''}`
                            .toLowerCase()
                            .includes(masterSearch.trim().toLowerCase()),
                      )
                      .map(item => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.masterTestOption}
                          onPress={() => {
                            setSelectedMasterTest(item);
                            setMasterMapping({ price: '', discount_price: '' });
                            setHomeCollectionAvailable(false);
                            setTestAvailable(true);
                          }}
                        >
                          <View style={styles.flex}>
                            <Text style={styles.cardTitle}>
                              {item.test_name}
                            </Text>
                            <Text style={styles.cardMeta}>
                              {item.test_code ||
                                item.description ||
                                'Standard lab test'}
                            </Text>
                          </View>
                          <Plus size={17} color="#0f766e" />
                        </TouchableOpacity>
                      ))
                  )}
                  {!loadingMasterTests && masterTests.length === 0 ? (
                    <Text style={styles.emptyText}>No master tests found.</Text>
                  ) : null}
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setMasterPickerOpen(false)}
                  >
                    <Text style={styles.cancelText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </AppModal>

      <AppModal
        visible={catalogEditorOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCatalogEditorOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>
                {selectedCatalogItem ? 'Edit Clinic Test' : 'Add Clinic Test'}
              </Text>
              <Text style={styles.modalSubtitle}>
                Set the clinic price and collection options.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Test name *"
                value={catalogForm.test_name}
                onChangeText={value =>
                  setCatalogForm(current => ({ ...current, test_name: value }))
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Test code"
                value={catalogForm.test_code}
                onChangeText={value =>
                  setCatalogForm(current => ({ ...current, test_code: value }))
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Description"
                value={catalogForm.description}
                onChangeText={value =>
                  setCatalogForm(current => ({
                    ...current,
                    description: value,
                  }))
                }
                multiline
              />
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="Price *"
                  keyboardType="decimal-pad"
                  value={catalogForm.price}
                  onChangeText={value =>
                    setCatalogForm(current => ({ ...current, price: value }))
                  }
                />
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="Discount price"
                  keyboardType="decimal-pad"
                  value={catalogForm.discount_price}
                  onChangeText={value =>
                    setCatalogForm(current => ({
                      ...current,
                      discount_price: value,
                    }))
                  }
                />
              </View>
              <ToggleRow
                label="Home collection available"
                value={homeCollectionAvailable}
                onPress={() => setHomeCollectionAvailable(value => !value)}
              />
              <ToggleRow
                label="Available for booking"
                value={testAvailable}
                onPress={() => setTestAvailable(value => !value)}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setCatalogEditorOpen(false)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryButton}
                  disabled={savingCatalog}
                  onPress={() => saveCatalogItem()}
                >
                  {savingCatalog ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryText}>Save Test</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </AppModal>

      <AppModal
        visible={Boolean(statusTest)}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusTest(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Update Test Status</Text>
            <Text style={styles.modalSubtitle}>{statusTest?.test_name}</Text>
            <View style={styles.optionList}>
              {statusOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusOption,
                    statusValue === option.value && styles.statusOptionActive,
                  ]}
                  onPress={() => setStatusValue(option.value)}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      statusValue === option.value &&
                        styles.statusOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setStatusTest(null)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                disabled={busyStatusId === statusTest?.id}
                onPress={() => saveStatus()}
              >
                {busyStatusId === statusTest?.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryText}>Save Status</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </AppModal>

      <AppModal
        visible={Boolean(reportTest)}
        transparent
        animationType="slide"
        onRequestClose={() => setReportTest(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.reportModal}>
            <TouchableOpacity style={styles.reportCloseButton} onPress={() => setReportTest(null)} accessibilityLabel="Close report editor">
              <X size={17} color="#64748b" />
            </TouchableOpacity>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, styles.reportModalTitle]}>
                {reportToEdit ? 'Edit Lab Report' : 'Add Lab Report'}
              </Text>
              <Text style={styles.modalSubtitle}>
                Update report data for this test.
              </Text>
              <Text style={styles.fieldLabel}>Test Price <Text style={styles.requiredMark}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={reportPrice}
                onChangeText={setReportPrice}
                placeholder="e.g. 250"
                keyboardType="decimal-pad"
              />
              <Text style={[styles.fieldLabel, styles.formFieldSpacing]}>Abnormal</Text>
              <TouchableOpacity style={styles.selectField} onPress={() => setAbnormalPickerOpen(open => !open)}>
                <Text style={styles.selectFieldText}>{abnormal ? 'Yes' : 'No'}</Text>
                <ChevronDown size={17} color="#94a3b8" />
              </TouchableOpacity>
              {abnormalPickerOpen ? (
                <View style={styles.selectOptions}>
                  {[false, true].map(value => (
                    <TouchableOpacity key={String(value)} style={styles.selectOption} onPress={() => { setAbnormal(value); setAbnormalPickerOpen(false); }}>
                      <Text style={styles.selectFieldText}>{value ? 'Yes' : 'No'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
              <Text style={[styles.fieldLabel, styles.formFieldSpacing]}>Report Parameters <Text style={styles.requiredMark}>*</Text></Text>
              <TouchableOpacity
                style={styles.addParameterButton}
                onPress={() => setReportRows(current => [...current, emptyRow()])}
              >
                <Plus size={15} color="#0f172a" />
                <Text style={styles.addParameterText}>Add Parameter</Text>
              </TouchableOpacity>
              {reportRows.map((row, index) => (
                <View key={`row-${index}`} style={styles.parameterBlock}>
                  <View style={styles.parameterHeading}>
                    <Text style={styles.parameterTitle}>
                      Parameter <Text style={styles.requiredMark}>*</Text>
                    </Text>
                    {reportRows.length > 1 ? (
                      <TouchableOpacity
                        onPress={() =>
                          setReportRows(current =>
                            current.filter((_, rowIndex) => rowIndex !== index),
                          )
                        }
                      >
                        <Trash2 size={16} color="#0f172a" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Parameter name"
                    value={row.parameter}
                    onChangeText={value =>
                      setReportRows(current =>
                        current.map((item, rowIndex) =>
                          rowIndex === index
                            ? { ...item, parameter: value }
                            : item,
                        ),
                      )
                    }
                  />
                  <Text style={[styles.fieldLabel, styles.formFieldSpacing]}>Result <Text style={styles.requiredMark}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Result value"
                    value={row.value}
                    onChangeText={value => setReportRows(current => current.map((item, rowIndex) => rowIndex === index ? { ...item, value } : item))}
                  />
                  <Text style={[styles.fieldLabel, styles.formFieldSpacing]}>Unit</Text>
                    <TextInput
                    style={styles.input}
                    placeholder="Unit"
                    value={row.unit}
                    onChangeText={value => setReportRows(current => current.map((item, rowIndex) => rowIndex === index ? { ...item, unit: value } : item))}
                  />
                  <Text style={[styles.fieldLabel, styles.formFieldSpacing]}>Reference Range</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Reference range"
                    value={row.reference_range}
                    onChangeText={value =>
                      setReportRows(current =>
                        current.map((item, rowIndex) =>
                          rowIndex === index
                            ? { ...item, reference_range: value }
                            : item,
                        ),
                      )
                    }
                  />
                </View>
              ))}
              <Text style={[styles.fieldLabel, styles.formFieldSpacing]}>Remarks</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="Remarks"
                value={remarks}
                onChangeText={setRemarks}
                multiline
              />
              <View style={styles.reportFormActions}>
                <TouchableOpacity
                  style={styles.reportSubmitButton}
                  disabled={saving}
                  onPress={() => saveReport()}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryText}>
                      {reportToEdit ? 'Update Report' : 'Save Report'}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.reportCancelButton}
                  onPress={() => setReportTest(null)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </AppModal>

      <AppModal
        visible={Boolean(selectedPatientGroup)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPatientGroup(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.patientReportModal}>
            <View style={styles.patientReportHeader}>
              <View style={styles.patientReportIcon}><TestTube2 size={21} color="#fff" /></View>
              <View style={styles.flex}>
                <Text style={styles.patientReportTitle}>Lab Report Overview</Text>
                <Text style={styles.patientReportSubtitle}>{selectedPatientGroup?.patientName || 'Patient lab tests'}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedPatientGroup(null)} accessibilityLabel="Close lab report">
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            {selectedPatientGroup ? (
              <ScrollView style={styles.patientReportBody} contentContainerStyle={styles.patientReportContent}>
                <View style={styles.reportPaper}>
                  <View style={styles.reportPaperHeader}>
                    <View style={styles.patientReportIcon}><TestTube2 size={20} color="#0f766e" /></View>
                    <View style={styles.flex}>
                      <Text style={styles.reportClinicName}>{clinicName}</Text>
                      <Text style={styles.reportClinicCaption}>DIAGNOSTIC & LABORATORY SERVICES</Text>
                    </View>
                    <Text style={styles.reportIssued}>Lab Diagnostic Report</Text>
                  </View>
                  <View style={styles.patientDetailsBlock}>
                    <View style={styles.flex}>
                      <Text style={styles.reportOverline}>Patient Details</Text>
                      <Text style={styles.reportPatientName}>{selectedPatientGroup.patientName}</Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.reportOverline}>Doctor & Status</Text>
                      <Text style={styles.reportDoctor}>{Array.from(new Set(selectedPatientGroup.tests.map(test => test.doctor_name || '—'))).join(', ')}</Text>
                      <Text style={styles.reportMeta}>{selectedPatientGroup.tests.filter(test => reports.some(report => Number(report.lab_test_id) === Number(test.id))).length} of {selectedPatientGroup.tests.length} reports ready</Text>
                    </View>
                  </View>
                  <Text style={styles.reportSectionTitle}>Test Results</Text>
                  <View style={styles.reportTableFrame}>
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                      <View>
                        <View style={styles.reportTableHeader}>
                          {[
                            { label: 'Test', columnStyle: styles.reportColTest },
                            { label: 'Parameter', columnStyle: styles.reportColParameter },
                            { label: 'Result', columnStyle: styles.reportColResult },
                            { label: 'Unit', columnStyle: styles.reportColUnit },
                            { label: 'Reference', columnStyle: styles.reportColReference },
                            { label: 'Status', columnStyle: styles.reportColStatus },
                            { label: 'Price', columnStyle: styles.reportColPrice },
                          ].map(column => (
                            <Text key={column.label} style={[styles.reportTableHeadCell, column.columnStyle]}>{column.label}</Text>
                          ))}
                        </View>
                        {selectedPatientGroup.tests.flatMap(test => {
                          const report = reports.find(item => Number(item.lab_test_id) === Number(test.id));
                          const existingRows = report ? reportRowsFrom(report.report_data).filter(row => row.parameter || row.value || row.unit || row.reference_range) : [];
                          const displayRows = existingRows.length ? existingRows : [{ parameter: report ? '—' : 'Awaiting report', value: '—', unit: '—', reference_range: '—' }];
                          return displayRows.map((row, index) => (
                            <View key={`${test.id}-${index}`} style={styles.reportTableRow}>
                              <Text style={[styles.reportTableCell, styles.reportTableTest, styles.reportColTest]}>{index === 0 ? test.test_name : ''}</Text>
                              <Text style={[styles.reportTableCell, styles.reportColParameter]}>{row.parameter || '—'}</Text>
                              <Text style={[styles.reportTableCell, styles.reportTableResult, styles.reportColResult]}>{row.value || '—'}</Text>
                              <Text style={[styles.reportTableCell, styles.reportColUnit]}>{row.unit || '—'}</Text>
                              <Text style={[styles.reportTableCell, styles.reportColReference]}>{row.reference_range || '—'}</Text>
                              <View style={[styles.reportTableCell, styles.reportColStatus]}>
                                {index === 0 ? <View style={[styles.reportStatusBadge, report ? (Number(report.is_abnormal) ? styles.reportAbnormal : styles.reportNormal) : styles.reportPending]}><Text style={styles.reportStatusText}>{report ? (Number(report.is_abnormal) ? 'Abnormal' : 'Normal') : 'Pending'}</Text></View> : null}
                              </View>
                              <Text style={[styles.reportTableCell, styles.reportTablePrice, styles.reportColPrice]}>{index === 0 ? `Rs ${getClinicPrice(test).toFixed(2)}` : ''}</Text>
                            </View>
                          ));
                        })}
                        <View style={[styles.reportTableRow, styles.reportTableTotal]}>
                          <Text style={[styles.reportTableCell, styles.reportTableTotalLabel, styles.reportTableTotalLabelWidth]}>Total</Text>
                          <Text style={[styles.reportTableCell, styles.reportTablePrice, styles.reportColPrice]}>Rs {selectedPatientGroup.tests.reduce((sum, test) => sum + getClinicPrice(test), 0).toFixed(2)}</Text>
                        </View>
                      </View>
                    </ScrollView>
                  </View>
                  <View style={styles.reportRemarksBlock}>
                    <Text style={styles.reportOverline}>Remarks</Text>
                    <Text style={styles.reportMeta}>{selectedPatientGroup.tests.map(test => reports.find(report => Number(report.lab_test_id) === Number(test.id))?.remarks).filter(Boolean).join(' · ') || 'Report results are pending.'}</Text>
                    <Text style={[styles.reportOverline, styles.formFieldSpacing]}>Report Status</Text>
                    <Text style={styles.reportDoctor}>{selectedPatientGroup.tests.length > 0 && selectedPatientGroup.tests.every(test => reports.some(report => Number(report.lab_test_id) === Number(test.id))) ? 'Complete' : 'In progress'}</Text>
                  </View>
                  <Text style={styles.reportFooter}>This is a system-generated diagnostic report.</Text>
                </View>
              </ScrollView>
            ) : null}
            <View style={styles.patientReportFooter}>
              <TouchableOpacity style={[styles.reportCancelButton, styles.patientReportAction]} onPress={() => setSelectedPatientGroup(null)}><Text style={styles.cancelText}>Close</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.reportSubmitButton, styles.patientReportAction]} disabled={downloadingReport} onPress={() => downloadPatientReport()}>
                {downloadingReport ? <ActivityIndicator size="small" color="#fff" /> : <Download size={16} color="#fff" />}
                <Text style={styles.primaryText}>{downloadingReport ? 'Preparing PDF…' : 'Download Report'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </AppModal>
    </View>
  );
};

const Stat = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) => (
  <View style={styles.statCard}>
    <View style={styles.statIcon}>{icon}</View>
    <View style={styles.statCopy}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  </View>
);

const Detail = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode | null;
  label: string;
  value: string;
}) => (
  <View style={styles.detailRow}>
    {icon}
    <View style={styles.flex}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

const ToggleRow = ({
  label,
  value,
  onPress,
}: {
  label: string;
  value: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.abnormalToggle} onPress={onPress}>
    <View style={[styles.checkbox, value && styles.checkboxActive]} />
    <Text style={styles.secondaryText}>{label}</Text>
  </TouchableOpacity>
);

export default LabManagementScreen;
