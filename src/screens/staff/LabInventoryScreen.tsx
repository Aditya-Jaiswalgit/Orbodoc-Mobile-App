import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  Columns3,
  CircleCheck,
  Edit,
  FileSpreadsheet,
  FlaskConical,
  IndianRupee,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  TestTube,
  TestTube2,
  Upload,
  X,
} from 'lucide-react-native';
import { AppModal } from '../../components/common/AppModal';
import { ColumnSelectorModal, ColumnOption } from '../../components/common/ColumnSelectorModal';
import { Pagination } from '../../components/common/Pagination';
import { StaffHeader } from '../../components/common/StaffHeader';
import {
  createLabCatalogItemApi,
  LabCatalogImportFile,
  mapMasterLabTestApi,
  MobileMasterLabTest,
  updateLabCatalogItemApi,
  uploadLabCatalogExcelApi,
} from '../../api/labApi';
import { useAuthContext } from '../../context/AuthContext';
import { useLabInventory } from '../../hooks/useLabInventory';
import { LabCatalogRecord } from '../../hooks/useLabManagement';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import { inventoryStyles as styles } from './styles/LabInventory.styles';

type Props = { onOpenDrawer: () => void };
type MappingFilter = 'all' | 'mapped' | 'unmapped';
type InventoryColumn = 'test_name' | 'test_code' | 'price' | 'discount_price' | 'home_collection_available' | 'is_available' | 'description' | 'actions';
type CatalogForm = {
  test_name: string;
  test_code: string;
  description: string;
  price: string;
  discount_price: string;
  home_collection_available: boolean;
  is_available: boolean;
  status: boolean;
};

const DEFAULT_FORM: CatalogForm = {
  test_name: '', test_code: '', description: '', price: '', discount_price: '',
  home_collection_available: false, is_available: true, status: true,
};
const PAGE_SIZES = [5, 10, 20, 50];
const IMPORT_COLUMNS = [
  'test_name', 'test_code', 'description', 'price', 'discount_price',
  'home_collection_available', 'is_available', 'status',
];
const COLUMNS: ColumnOption<InventoryColumn>[] = [
  { key: 'test_name', label: 'Test Name', defaultVisible: true },
  { key: 'test_code', label: 'Code', defaultVisible: true },
  { key: 'price', label: 'Price', defaultVisible: true },
  { key: 'discount_price', label: 'Discount Price', defaultVisible: true },
  { key: 'home_collection_available', label: 'Home Collection', defaultVisible: true },
  { key: 'is_available', label: 'Availability', defaultVisible: true },
  { key: 'description', label: 'Description', defaultVisible: true },
  { key: 'actions', label: 'Actions', defaultVisible: true },
];
const money = (value: unknown) => `₹${Number(value || 0).toFixed(2)}`;
const isOn = (value: unknown) => Number(value) === 1;

function StatCard({ label, value, icon, tint }: { label: string; value: number; icon: React.ReactNode; tint: string }) {
  return (
    <View style={styles.statCard}>
      <View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <View style={[styles.statIcon, { backgroundColor: tint }]}>{icon}</View>
    </View>
  );
}

function ChoiceRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <View style={styles.choiceField}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity style={styles.choiceButton} onPress={onPress}>
        <Text style={styles.choiceText}>{value}</Text>
        <ChevronDown size={15} color="#64748B" />
      </TouchableOpacity>
    </View>
  );
}

function MappingChoiceRow({ label, value, options, onSelect }: { label: string; value: string; options: string[]; onSelect: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.choiceField}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity style={styles.choiceButton} onPress={() => setOpen(current => !current)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text style={styles.choiceText}>{value}</Text>
        <ChevronDown size={15} color="#64748B" />
      </TouchableOpacity>
      {open ? <View style={styles.choiceOptions}>{options.map(option => <TouchableOpacity key={option} style={[styles.choiceOption, option === value && styles.choiceOptionActive]} onPress={() => { onSelect(option); setOpen(false); }}><Text style={styles.choiceText}>{option}</Text></TouchableOpacity>)}</View> : null}
    </View>
  );
}

export default function LabInventoryScreen({ onOpenDrawer }: Props) {
  const {
    token, role, activeClinicId, activeClinicName,
    permissionsMap = {},
  } = useAuthContext();
  const canView = canUseStaffScreen(role, permissionsMap, 'lab_inventory', 'view') ||
    canUseStaffScreen(role, permissionsMap, 'lab_tests', 'view');
  const canAdd = canUseStaffScreen(role, permissionsMap, 'lab_inventory', 'add') ||
    canUseStaffScreen(role, permissionsMap, 'lab_tests', 'add');
  const canEdit = canUseStaffScreen(role, permissionsMap, 'lab_inventory', 'edit') ||
    canUseStaffScreen(role, permissionsMap, 'lab_tests', 'edit');

  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPageSize, setCatalogPageSize] = useState(5);
  const [catalogSearchInput, setCatalogSearchInput] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<InventoryColumn, boolean>>({
    test_name: true, test_code: true, price: true, discount_price: true,
    home_collection_available: true, is_available: true, description: true, actions: true,
  });

  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<LabCatalogRecord | null>(null);
  const [catalogForm, setCatalogForm] = useState<CatalogForm>(DEFAULT_FORM);
  const [masterModalOpen, setMasterModalOpen] = useState(false);
  const [masterSearchInput, setMasterSearchInput] = useState('');
  const [masterSearch, setMasterSearch] = useState('');
  const [masterFilter, setMasterFilter] = useState<MappingFilter>('all');
  const [masterFilterOpen, setMasterFilterOpen] = useState(false);
  const [masterPage, setMasterPage] = useState(1);
  const [masterPageSize, setMasterPageSize] = useState(5);
  const [selectedMasterTest, setSelectedMasterTest] = useState<MobileMasterLabTest | null>(null);
  const [mappingForm, setMappingForm] = useState({
    price: '', discount_price: '', home_collection_available: false, is_available: true,
  });
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<LabCatalogImportFile | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const {
    catalogItems, catalogTotal, catalogLoading, masterTests, masterTotal,
    masterLoading, error, lastRefreshed, masterLastRefreshed, loadCatalog, loadMasterTests,
  } = useLabInventory(token, activeClinicId);
  const clinicName = activeClinicName || 'Selected Clinic';

  const refreshCatalog = useCallback(() => loadCatalog({
    page: catalogPage, limit: catalogPageSize, search: catalogSearch, forceRefresh: true,
  }), [catalogPage, catalogPageSize, catalogSearch, loadCatalog]);

  useEffect(() => {
    if (!canView) return;
    loadCatalog({ page: catalogPage, limit: catalogPageSize, search: catalogSearch }).catch(() => undefined);
  }, [canView, catalogPage, catalogPageSize, catalogSearch, loadCatalog]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextSearch = catalogSearchInput.trim();
      if (nextSearch !== catalogSearch) {
        setCatalogPage(1);
        setCatalogSearch(nextSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [catalogSearchInput, catalogSearch]);

  useEffect(() => {
    if (masterModalOpen) {
      loadMasterTests({
        page: masterPage,
        limit: masterPageSize,
        search: masterSearch,
        mapped: masterFilter,
      }).catch(() => undefined);
    }
  }, [loadMasterTests, masterFilter, masterModalOpen, masterPage, masterPageSize, masterSearch]);

  useEffect(() => {
    if (!masterModalOpen || selectedMasterTest) return;
    const timer = setTimeout(() => {
      const nextSearch = masterSearchInput.trim();
      if (nextSearch !== masterSearch) {
        setMasterPage(1);
        setMasterSearch(nextSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [masterModalOpen, masterSearchInput, masterSearch, selectedMasterTest]);

  const catalogStats = useMemo(() => ({
    mapped: catalogTotal,
    available: catalogItems.filter(item => isOn(item.is_available)).length,
    homeCollection: catalogItems.filter(item => isOn(item.home_collection_available)).length,
    discounted: catalogItems.filter(item => Number(item.discount_price || 0) > 0).length,
  }), [catalogItems, catalogTotal]);

  const catalogPages = Math.max(1, Math.ceil(catalogTotal / catalogPageSize));
  const masterPages = Math.max(1, Math.ceil(masterTotal / masterPageSize));

  const submitCatalogSearch = () => {
    setCatalogPage(1);
    setCatalogSearch(catalogSearchInput.trim());
  };

  const openCatalogForm = (item?: LabCatalogRecord) => {
    setSelectedCatalogItem(item || null);
    setCatalogForm(item ? {
      test_name: item.test_name || '',
      test_code: item.test_code || '',
      description: item.description || '',
      price: String(item.price ?? ''),
      discount_price: String(item.discount_price ?? ''),
      home_collection_available: isOn(item.home_collection_available),
      is_available: isOn(item.is_available),
      status: isOn(item.master_status),
    } : DEFAULT_FORM);
    setCatalogModalOpen(true);
  };

  const saveCatalog = async () => {
    if (!token || !activeClinicId) return;
    const price = Number(catalogForm.price);
    if (!catalogForm.test_name.trim()) {
      showErrorToast('Test name required', 'Enter a test name.');
      return;
    }
    if (!catalogForm.price.trim() || !Number.isFinite(price) || price < 0) {
      showErrorToast('Valid price required', 'Enter a valid, non-negative test price.');
      return;
    }
    const discount = Number(catalogForm.discount_price || 0);
    if (!Number.isFinite(discount) || discount < 0) {
      showErrorToast('Invalid discount', 'Discount price must be zero or greater.');
      return;
    }
    setSaving(true);
    const payload = {
      clinic_id: activeClinicId,
      test_name: catalogForm.test_name.trim(),
      test_code: catalogForm.test_code.trim() || null,
      description: catalogForm.description.trim() || null,
      price,
      discount_price: discount,
      home_collection_available: Number(catalogForm.home_collection_available),
      is_available: Number(catalogForm.is_available),
      status: Number(catalogForm.status),
    };
    try {
      const response = selectedCatalogItem
        ? await updateLabCatalogItemApi(token, selectedCatalogItem.id, payload)
        : await createLabCatalogItemApi(token, payload);
      if (!response.success) throw new Error(response.message || 'Could not save lab inventory item');
      showSuccessToast(
        selectedCatalogItem ? 'Lab inventory item updated' : 'Custom lab test added',
        `${payload.test_name} saved in ${clinicName}.`,
      );
      setCatalogModalOpen(false);
      await loadCatalog({ page: catalogPage, limit: catalogPageSize, search: catalogSearch, forceRefresh: true });
    } catch (cause) {
      showErrorToast('Inventory save failed', cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openMasterTests = () => {
    setMasterPage(1);
    setMasterSearchInput('');
    setMasterSearch('');
    setMasterFilter('all');
    setSelectedMasterTest(null);
    setMasterModalOpen(true);
  };

  const openCustomFromMaster = () => {
    const prefilledName = masterSearchInput.trim();
    setMasterModalOpen(false);
    setSelectedMasterTest(null);
    setSelectedCatalogItem(null);
    setCatalogForm({ ...DEFAULT_FORM, test_name: prefilledName });
    setCatalogModalOpen(true);
  };

  const selectMasterTest = (test: MobileMasterLabTest) => {
    setSelectedMasterTest(test);
    setMappingForm({
      price: test.clinic_price == null ? '' : String(test.clinic_price),
      discount_price: test.clinic_discount_price == null ? '' : String(test.clinic_discount_price),
      home_collection_available: isOn(test.clinic_home_collection_available),
      is_available: test.clinic_is_available == null ? true : isOn(test.clinic_is_available),
    });
  };

  const saveMapping = async () => {
    if (!token || !activeClinicId || !selectedMasterTest) return;
    const price = Number(mappingForm.price);
    const discount = Number(mappingForm.discount_price || 0);
    if (!mappingForm.price.trim() || !Number.isFinite(price) || price < 0) {
      showErrorToast('Test price required', 'Enter a valid clinic price.');
      return;
    }
    if (!Number.isFinite(discount) || discount < 0) {
      showErrorToast('Invalid discount', 'Discount price must be zero or greater.');
      return;
    }
    setSaving(true);
    try {
      const response = await mapMasterLabTestApi(token, {
        clinic_id: activeClinicId,
        lab_test_id: selectedMasterTest.id,
        price,
        discount_price: discount,
        home_collection_available: Number(mappingForm.home_collection_available),
        is_available: Number(mappingForm.is_available),
      });
      if (!response.success) throw new Error(response.message || 'Could not map master test');
      const action = (response.data as { action?: string } | undefined)?.action;
      const mapped = action ? action === 'updated' : isOn(selectedMasterTest.is_mapped_for_clinic);
      showSuccessToast(
        mapped ? 'Clinic mapping updated' : 'Master test mapped',
        `${selectedMasterTest.test_name} saved for ${clinicName}.`,
      );
      setSelectedMasterTest(null);
      await Promise.all([
        loadCatalog({ page: catalogPage, limit: catalogPageSize, search: catalogSearch, forceRefresh: true }),
        loadMasterTests({ page: masterPage, limit: masterPageSize, search: masterSearch, mapped: masterFilter, forceRefresh: true }),
      ]);
    } catch (cause) {
      showErrorToast('Could not save mapping', cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectImportFile = async () => {
    if (!canAdd) return;
    const picker = Platform.OS === 'ios'
      ? NativeModules.LabInventoryFilePicker
      : NativeModules.MedicineFilePicker;
    if (!picker?.pickExcel) {
      showErrorToast('Import unavailable', 'The system file picker is not available in this app build.');
      return;
    }
    try {
      const picked = await picker.pickExcel() as LabCatalogImportFile | null;
      if (!picked) return;
      const extension = picked.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls'].includes(extension || '')) {
        showErrorToast('Unsupported file', 'Choose an .xlsx or .xls workbook.');
        return;
      }
      if (typeof picked.size === 'number' && picked.size > 5 * 1024 * 1024) {
        showErrorToast('File too large', 'Lab inventory Excel files must be 5 MB or smaller.');
        return;
      }
      setImportFile({
        ...picked,
        type: picked.type === 'application/octet-stream'
          ? extension === 'xls'
            ? 'application/vnd.ms-excel'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : picked.type,
      });
    } catch (cause) {
      showErrorToast('File selection failed', cause instanceof Error ? cause.message : 'Could not select the Excel file.');
    }
  };

  const uploadImport = async () => {
    if (!token || !activeClinicId || !importFile) {
      showErrorToast('Choose a file', 'Select an Excel workbook to import.');
      return;
    }
    setImporting(true);
    try {
      const response = await uploadLabCatalogExcelApi(token, activeClinicId, importFile);
      if (!response.success) throw new Error(response.message || 'Failed to import lab inventory');
      const inserted = Number(response.data?.inserted || 0);
      const skipped = Number(response.data?.skipped || 0);
      setImportModalOpen(false);
      setImportFile(null);
      setCatalogPage(1);
      await loadCatalog({ page: 1, limit: catalogPageSize, search: catalogSearch, forceRefresh: true });
      showSuccessToast(
        'Lab inventory imported',
        `${inserted} test(s) imported${skipped ? `; ${skipped} row(s) skipped` : ''}.`,
      );
      if (skipped > 0) {
        const firstReason = response.data?.skippedData?.[0]?.reason;
        if (firstReason) showErrorToast('Some rows were skipped', firstReason);
      }
    } catch (cause) {
      showErrorToast('Import failed', cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const toggleColumn = (key: InventoryColumn) => setVisibleColumns(current => ({ ...current, [key]: !current[key] }));

  if (!canView) {
    return (
      <View style={styles.root}>
        <StaffHeader onOpenDrawer={onOpenDrawer} title="Lab Inventory" />
        <View style={styles.empty}>
          <FlaskConical size={28} color="#94A3B8" />
          <Text style={styles.emptyTitle}>You do not have permission to view lab inventory.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Lab Inventory" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={catalogLoading} onRefresh={() => { refreshCatalog().catch(cause => showErrorToast('Refresh failed', cause instanceof Error ? cause.message : undefined)); }} />}
      >
        <View style={styles.heading}>
          <View style={styles.headingIcon}><TestTube size={24} color="#0D9488" /></View>
          <View style={styles.headingText}>
            <Text style={styles.title}>Lab Inventory</Text>
            <Text style={styles.subtitle}>Search master tests, set Test Price, and manage lab availability</Text>
          </View>
        </View>
        <View style={styles.statsGrid}>
          <StatCard label="Mapped Tests" value={catalogStats.mapped} icon={<TestTube2 size={20} color="#0D9488" />} tint="#E8F7F5" />
          <StatCard label="Available Today" value={catalogStats.available} icon={<CircleCheck size={18} color="#0D9488" />} tint="#E8F7F5" />
          <StatCard label="Home Collection" value={catalogStats.homeCollection} icon={<ShieldCheck size={18} color="#0D9488" />} tint="#E8F7F5" />
          <StatCard label="Discounted" value={catalogStats.discounted} icon={<IndianRupee size={18} color="#0D9488" />} tint="#E8F7F5" />
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <Text style={styles.panelTitle}>Clinic Lab Inventory</Text>
            <Text style={styles.panelSub}>Search the master catalog, map tests to {clinicName}, and maintain clinic pricing.</Text>
          </View>
          <TouchableOpacity style={[styles.refreshButton, styles.panelControl]} disabled={catalogLoading} onPress={() => { refreshCatalog().catch(cause => showErrorToast('Refresh failed', cause instanceof Error ? cause.message : undefined)); }}>
            {catalogLoading ? <ActivityIndicator size="small" color="#0F766E" /> : <RefreshCw size={15} color="#334155" />}
            <Text style={styles.refreshText}>{catalogLoading ? 'Refreshing' : 'Refresh'}</Text>
          </TouchableOpacity>
          {!!lastRefreshed && <Text style={[styles.refreshed, styles.panelControl]}>Last refreshed: {lastRefreshed}</Text>}
          {canAdd ? (
            <View style={styles.toolbar}>
              <TouchableOpacity style={styles.primaryButtonFull} onPress={openMasterTests}>
                <Search size={15} color="#fff" /><Text style={styles.primaryButtonText}>Add From Master</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButtonFull} onPress={() => { setImportFile(null); setImportModalOpen(true); }}>
                <Upload size={15} color="#0F766E" /><Text style={styles.secondaryButtonText}>Import Excel</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.fieldInset}>
            <View style={styles.searchBox}>
              <Search size={16} color="#64748B" />
              <TextInput
                value={catalogSearchInput}
                onChangeText={setCatalogSearchInput}
                onSubmitEditing={submitCatalogSearch}
                returnKeyType="search"
                placeholder="Search test name, code, or price"
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
              />
              {!!catalogSearchInput && <TouchableOpacity onPress={() => { setCatalogSearchInput(''); setCatalogSearch(''); setCatalogPage(1); }}><X size={16} color="#64748B" /></TouchableOpacity>}
            </View>
          </View>
          <TouchableOpacity style={[styles.columnsButton, styles.panelControl]} onPress={() => setColumnModalOpen(true)} accessibilityLabel="Choose visible inventory fields">
            <Columns3 size={16} color="#334155" /><Text style={styles.refreshText}>Columns</Text>
          </TouchableOpacity>
          {error ? <View style={[styles.errorBox, styles.errorInset]}><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={() => { refreshCatalog().catch(() => undefined); }}><Text style={styles.retry}>Retry</Text></TouchableOpacity></View> : null}
          {catalogLoading && catalogItems.length === 0 ? <ActivityIndicator style={styles.loadingInset} color="#0F766E" /> : null}
          {!catalogLoading && !error && catalogItems.length === 0 ? (
            <View style={styles.empty}>
              <FlaskConical size={28} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No clinic lab mappings found</Text>
              <Text style={styles.emptyText}>Add tests from the master catalog or create a custom clinic test.</Text>
            </View>
          ) : null}
          <View style={styles.cardList}>
            {catalogItems.map(item => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.flexFillMinWidth}>
                    {visibleColumns.test_name ? <Text style={styles.cardName}>{item.test_name}</Text> : null}
                    {visibleColumns.test_code ? <Text style={styles.cardCode}>{item.test_code || 'No code'}</Text> : null}
                  </View>
                  {visibleColumns.is_available ? <View style={[styles.badge, isOn(item.is_available) ? styles.badgeActive : styles.badgeMuted]}><Text style={[styles.badgeText, isOn(item.is_available) ? styles.badgeActiveText : styles.badgeMutedText]}>{isOn(item.is_available) ? 'Active' : 'Inactive'}</Text></View> : null}
                </View>
                <View style={styles.detailGrid}>
                  {visibleColumns.price ? <View style={styles.detailCell}><Text style={styles.detailLabel}>Test Price</Text><Text style={styles.detailValue}>{money(item.price)}</Text></View> : null}
                  {visibleColumns.discount_price ? <View style={styles.detailCell}><Text style={styles.detailLabel}>Discount Price</Text><Text style={styles.detailValue}>{money(item.discount_price)}</Text></View> : null}
                </View>
                {visibleColumns.home_collection_available ? <View style={[styles.homeCollectionBadge, !isOn(item.home_collection_available) && styles.badgeMuted]}><Text style={[styles.homeCollectionText, !isOn(item.home_collection_available) && styles.badgeMutedText]}>Home collection: {isOn(item.home_collection_available) ? 'Yes' : 'No'}</Text></View> : null}
                {visibleColumns.description ? <Text style={styles.description}>{item.description || 'No description'}</Text> : null}
                {visibleColumns.actions && canEdit ? <TouchableOpacity style={styles.editButton} onPress={() => openCatalogForm(item)}><Edit size={16} color="#334155" /><Text style={styles.editText}>Edit test</Text></TouchableOpacity> : null}
              </View>
            ))}
          </View>
          {catalogTotal > 5 ? <Pagination currentPage={Math.min(catalogPage, catalogPages)} totalPages={catalogPages} totalItems={catalogTotal} pageSize={catalogPageSize} itemLabel="inventory items" pageSizeOptions={PAGE_SIZES} onPageChange={setCatalogPage} onPageSizeChange={size => { setCatalogPageSize(size); setCatalogPage(1); }} /> : null}
        </View>
      </ScrollView>

      <ColumnSelectorModal
        visible={columnModalOpen}
        onClose={() => setColumnModalOpen(false)}
        columns={COLUMNS}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumn}
        onReset={() => setVisibleColumns({ test_name: true, test_code: true, price: true, discount_price: true, home_collection_available: true, is_available: true, description: true, actions: true })}
        title="Inventory fields"
        subtitle="Choose which details to show on each test card"
      />

      <AppModal visible={masterModalOpen} transparent animationType="slide" onRequestClose={() => { setMasterModalOpen(false); setSelectedMasterTest(null); }}>
        <View style={styles.masterModalBackdrop}>
          <View style={styles.masterModalCard}>
            <View style={styles.masterModalHeader}>
              <View style={styles.masterHeaderTop}>
                <View style={styles.masterHeaderIcon}><TestTube2 size={19} color="#fff" /></View>
                <View style={styles.masterHeaderText}>
                  <Text style={styles.masterModalTitle}>Add clinic lab tests</Text>
                  <Text style={styles.masterModalSubtitle}>Map a master test to {clinicName}, or create a clinic-only custom test.</Text>
                </View>
                <TouchableOpacity style={styles.closeIconButton} accessibilityLabel="Close master tests" onPress={() => { setSelectedMasterTest(null); setMasterModalOpen(false); }}><X size={18} color="#64748B" /></TouchableOpacity>
              </View>
              {canAdd ? (
                <TouchableOpacity style={styles.createCustomButton} onPress={openCustomFromMaster}><Plus size={16} color="#0F766E" /><Text style={styles.createCustomText}>Create custom test</Text></TouchableOpacity>
              ) : null}
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator style={styles.masterModalScroll} contentContainerStyle={styles.masterModalScrollContent}>
                <View style={styles.masterControls}>
                  <View style={styles.masterSearchBox}><Search size={15} color="#64748B" /><TextInput value={masterSearchInput} onChangeText={value => { setMasterSearchInput(value); setMasterPage(1); }} onSubmitEditing={() => { setMasterPage(1); setMasterSearch(masterSearchInput.trim()); }} placeholder="Search by test name, code or description" style={styles.searchInput} />
                    {!!masterSearchInput && <TouchableOpacity onPress={() => { setMasterSearchInput(''); setMasterSearch(''); setMasterPage(1); }}><X size={16} color="#64748B" /></TouchableOpacity>}
                  </View>
                  <TouchableOpacity style={styles.filterSelect} onPress={() => setMasterFilterOpen(open => !open)}>
                    <Text style={styles.filterSelectText}>{masterFilter === 'all' ? 'All master tests' : masterFilter === 'mapped' ? 'Already mapped' : 'Ready to map'}</Text><ChevronDown size={15} color="#64748B" />
                  </TouchableOpacity>
                  {masterFilterOpen ? <View style={styles.filterOptions}>{(['all', 'unmapped', 'mapped'] as MappingFilter[]).map(filter => <TouchableOpacity key={filter} style={[styles.filterOption, masterFilter === filter && styles.filterOptionActive]} onPress={() => { setMasterFilter(filter); setMasterPage(1); setMasterFilterOpen(false); }}><Text style={styles.filterOptionText}>{filter === 'all' ? 'All master tests' : filter === 'unmapped' ? 'Ready to map' : 'Already mapped'}</Text></TouchableOpacity>)}</View> : null}
                  <TouchableOpacity style={styles.masterRefreshButton} disabled={masterLoading} onPress={() => { loadMasterTests({ page: masterPage, limit: masterPageSize, search: masterSearch, mapped: masterFilter, forceRefresh: true }).catch(cause => showErrorToast('Refresh failed', cause instanceof Error ? cause.message : undefined)); }}>
                    {masterLoading ? <ActivityIndicator size="small" color="#0F766E" /> : <RefreshCw size={15} color="#334155" />}<Text style={styles.refreshText}>{masterLoading ? 'Refreshing' : 'Refresh'}</Text>
                  </TouchableOpacity>
                  {!!masterLastRefreshed && <Text style={styles.masterRefreshTime}>Last refreshed: {masterLastRefreshed}</Text>}
                  <View style={styles.masterSummary}>
                    <Text style={styles.masterCount}><Text style={styles.masterCountStrong}>{masterTotal}</Text> tests found</Text>
                    <View style={styles.masterSummaryBadges}>
                      <View style={[styles.badge, styles.badgeOutline]}><Text style={styles.badgeOutlineText}>{masterTests.filter(test => !isOn(test.is_mapped_for_clinic)).length} ready to map</Text></View>
                      <View style={[styles.badge, styles.badgeTeal]}><Text style={styles.badgeTealText}>{masterTests.filter(test => isOn(test.is_mapped_for_clinic)).length} mapped</Text></View>
                    </View>
                  </View>
                </View>
                {!!error && <Text style={[styles.errorText, styles.masterErrorInset]}>{error}</Text>}
                {masterLoading ? <ActivityIndicator style={styles.masterLoadingInset} color="#0F766E" /> : (
                  <View style={styles.masterCardList}>
                    {masterTests.map(test => <View key={test.id} style={[styles.masterCard, isOn(test.is_mapped_for_clinic) && styles.masterCardMapped]}>
                      <View style={styles.cardTop}><View style={styles.flexFill}><Text style={styles.cardName}>{test.test_name}</Text><Text style={styles.cardCode}>{test.test_code || 'No code'}</Text></View><View style={[styles.badge, isOn(test.status) ? styles.badgeActive : styles.badgeMuted]}><Text style={[styles.badgeText, isOn(test.status) ? styles.badgeActiveText : styles.badgeMutedText]}>{isOn(test.status) ? 'Active' : 'Inactive'}</Text></View></View>
                      {!!test.description && <Text style={styles.description}>{test.description}</Text>}
                      <View style={styles.masterBadges}><View style={[styles.badge, isOn(test.is_mapped_for_clinic) ? styles.badgeTeal : styles.badgeOutline]}><Text style={isOn(test.is_mapped_for_clinic) ? styles.badgeTealText : styles.badgeOutlineText}>{isOn(test.is_mapped_for_clinic) ? 'Mapped' : 'Ready to map'}</Text></View>{test.clinic_price != null && <View style={[styles.badge, styles.badgeMuted]}><Text style={styles.badgeMutedText}>{money(test.clinic_price)}</Text></View>}</View>
                      {canAdd && <TouchableOpacity style={[styles.masterAction, isOn(test.is_mapped_for_clinic) ? styles.masterActionMapped : styles.masterActionReady]} onPress={() => selectMasterTest(test)}><Text style={[styles.masterActionText, !isOn(test.is_mapped_for_clinic) && styles.masterActionReadyText]}>{isOn(test.is_mapped_for_clinic) ? 'Edit mapping' : 'Map test'}</Text></TouchableOpacity>}
                    </View>)}
                    {!masterTests.length && <View style={styles.empty}><FlaskConical size={27} color="#94A3B8" /><Text style={styles.emptyTitle}>No matching master test found</Text><Text style={styles.emptyText}>Try another search or add a custom clinic test.</Text>{canAdd && <TouchableOpacity style={styles.masterAction} onPress={openCustomFromMaster}><Text style={styles.masterActionText}>{masterSearchInput.trim() ? `Create “${masterSearchInput.trim()}” as custom test` : 'Create custom test'}</Text></TouchableOpacity>}</View>}
                  </View>
                )}
                {masterTotal > 5 && <Pagination currentPage={Math.min(masterPage, masterPages)} totalPages={masterPages} totalItems={masterTotal} pageSize={masterPageSize} itemLabel="master tests" pageSizeOptions={PAGE_SIZES} onPageChange={setMasterPage} onPageSizeChange={size => { setMasterPageSize(size); setMasterPage(1); }} />}
            </ScrollView>
            <View style={styles.masterModalFooter}><TouchableOpacity style={styles.masterFooterClose} onPress={() => { setSelectedMasterTest(null); setMasterModalOpen(false); }}><Text style={styles.modalActionText}>Close</Text></TouchableOpacity></View>
          </View>
        </View>
      </AppModal>

      <AppModal
        visible={Boolean(selectedMasterTest)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMasterTest(null)}
      >
        <View style={styles.mappingModalBackdrop}>
          <View style={styles.mappingModalCard}>
            <View style={styles.mappingModalHeader}>
              <View style={styles.masterHeaderIcon}><TestTube2 size={19} color="#fff" /></View>
              <View style={styles.mappingHeaderText}>
                <Text style={styles.mappingModalTitle}>{selectedMasterTest && isOn(selectedMasterTest.is_mapped_for_clinic) ? 'Update clinic mapping' : 'Map master test'}</Text>
                <Text style={styles.mappingModalSubtitle}>Set price and availability for {clinicName}.</Text>
              </View>
              <TouchableOpacity style={styles.closeIconButton} accessibilityLabel="Close clinic mapping" onPress={() => setSelectedMasterTest(null)}><X size={18} color="#64748B" /></TouchableOpacity>
            </View>
            {selectedMasterTest ? <ScrollView keyboardShouldPersistTaps="handled" style={styles.mappingModalScroll} contentContainerStyle={styles.mappingModalBody}>
              <View style={styles.mappingTestCard}>
                <Text style={styles.cardName}>{selectedMasterTest.test_name}</Text>
                <Text style={styles.cardCode}>{selectedMasterTest.test_code || 'No code'} · {selectedMasterTest.description || 'No description'}</Text>
                <View style={styles.masterBadges}>
                  <View style={[styles.badge, isOn(selectedMasterTest.is_mapped_for_clinic) ? styles.badgeTeal : styles.badgeOutline]}><Text style={isOn(selectedMasterTest.is_mapped_for_clinic) ? styles.badgeTealText : styles.badgeOutlineText}>{isOn(selectedMasterTest.is_mapped_for_clinic) ? 'Already mapped' : 'New mapping'}</Text></View>
                  {selectedMasterTest.clinic_price != null ? <View style={[styles.badge, styles.badgeMuted]}><Text style={styles.badgeMutedText}>Existing {money(selectedMasterTest.clinic_price)}</Text></View> : null}
                </View>
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Test Price <Text style={styles.requiredMark}>*</Text></Text>
                <TextInput style={styles.input} value={mappingForm.price} onChangeText={price => setMappingForm(current => ({ ...current, price }))} keyboardType="decimal-pad" placeholder="0.00" />
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Discount Price</Text>
                <TextInput style={styles.input} value={mappingForm.discount_price} onChangeText={discount_price => setMappingForm(current => ({ ...current, discount_price }))} keyboardType="decimal-pad" placeholder="0.00" />
              </View>
              <MappingChoiceRow label="Home Collection" value={mappingForm.home_collection_available ? 'Available' : 'Not available'} options={['Available', 'Not available']} onSelect={value => setMappingForm(current => ({ ...current, home_collection_available: value === 'Available' }))} />
              <MappingChoiceRow label="Clinic Availability" value={mappingForm.is_available ? 'Available' : 'Unavailable'} options={['Available', 'Unavailable']} onSelect={value => setMappingForm(current => ({ ...current, is_available: value === 'Available' }))} />
            </ScrollView> : null}
            <View style={styles.mappingModalFooter}>
              <TouchableOpacity style={styles.mappingCancelButton} disabled={saving} onPress={() => setSelectedMasterTest(null)}><Text style={styles.modalActionText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.mappingSaveButton} disabled={saving || !canAdd || !selectedMasterTest} onPress={() => { saveMapping(); }}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalActionPrimaryText}>{selectedMasterTest && isOn(selectedMasterTest.is_mapped_for_clinic) ? 'Update Mapping' : 'Save Mapping'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </AppModal>

      <AppModal visible={catalogModalOpen} transparent animationType="slide" onRequestClose={() => setCatalogModalOpen(false)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <View style={styles.customModalHeader}>
            <TouchableOpacity style={styles.customCloseIcon} accessibilityLabel="Close custom lab test form" onPress={() => setCatalogModalOpen(false)}><X size={18} color="#64748B" /></TouchableOpacity>
            <Text style={styles.customModalTitle}>{selectedCatalogItem ? 'Edit Clinic Lab Test' : 'Create Custom Lab Test'}</Text>
            <Text style={styles.customModalSubtitle}>Use this only when a test is not available in the master catalog.</Text>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalBody}>
            <View style={styles.formField}><Text style={styles.inputLabel}>Test Name <Text style={styles.requiredMark}>*</Text></Text><TextInput style={styles.input} value={catalogForm.test_name} onChangeText={test_name => setCatalogForm(current => ({ ...current, test_name }))} placeholder="e.g. Complete Blood Count" /></View>
            <View style={styles.formField}><Text style={styles.inputLabel}>Code</Text><TextInput style={styles.input} value={catalogForm.test_code} onChangeText={test_code => setCatalogForm(current => ({ ...current, test_code }))} placeholder="e.g. CBC001" /></View>
            <View style={styles.formField}><Text style={styles.inputLabel}>Test Price <Text style={styles.requiredMark}>*</Text></Text><TextInput style={styles.input} value={catalogForm.price} onChangeText={price => setCatalogForm(current => ({ ...current, price }))} keyboardType="decimal-pad" placeholder="0.00" /></View>
            <View style={styles.formField}><Text style={styles.inputLabel}>Discount Price</Text><TextInput style={styles.input} value={catalogForm.discount_price} onChangeText={discount_price => setCatalogForm(current => ({ ...current, discount_price }))} keyboardType="decimal-pad" placeholder="0.00" /></View>
            <ChoiceRow label="Home Collection" value={catalogForm.home_collection_available ? 'Yes' : 'No'} onPress={() => setCatalogForm(current => ({ ...current, home_collection_available: !current.home_collection_available }))} />
            <ChoiceRow label="Available" value={catalogForm.is_available ? 'Available' : 'Unavailable'} onPress={() => setCatalogForm(current => ({ ...current, is_available: !current.is_available }))} />
            <ChoiceRow label="Master Status" value={catalogForm.status ? 'Active' : 'Inactive'} onPress={() => setCatalogForm(current => ({ ...current, status: !current.status }))} />
            <View style={styles.formField}><Text style={styles.inputLabel}>Description</Text><TextInput style={[styles.input, styles.textArea]} value={catalogForm.description} onChangeText={description => setCatalogForm(current => ({ ...current, description }))} multiline placeholder="Short test description" /></View>
          </ScrollView>
          <View style={styles.modalActions}><TouchableOpacity style={styles.modalAction} disabled={saving} onPress={() => setCatalogModalOpen(false)}><Text style={styles.modalActionText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.modalAction, styles.modalActionPrimary]} disabled={saving} onPress={() => { saveCatalog(); }}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalActionPrimaryText}>{selectedCatalogItem ? 'Update Item' : 'Save Custom Test'}</Text>}</TouchableOpacity></View>
        </View></View>
      </AppModal>

      <AppModal visible={importModalOpen} transparent animationType="slide" onRequestClose={() => setImportModalOpen(false)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Import Clinic Lab Inventory</Text><Text style={styles.modalSubtitle}>Upload an Excel workbook with one header row. Invalid rows are skipped and reported.</Text></View>
          <View style={styles.modalBody}>
            <View style={styles.fileBox}>
              <Text style={styles.inputLabel}>Upload file · one worksheet, header row required</Text>
              <Text style={styles.fileName}>{importFile?.name || 'No file selected'}</Text>
            </View>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => { selectImportFile(); }}><FileSpreadsheet size={16} color="#0F766E" /><Text style={styles.secondaryButtonText}>{importFile ? 'Change Excel file' : 'Choose Excel file'}</Text></TouchableOpacity>
            <Text style={styles.description}>Accepted: .xlsx and .xls · up to 5 MB</Text>
            <Text style={styles.inputLabel}>Required format · keep these exact headers in row 1</Text>
            <View style={styles.filterRow}>{IMPORT_COLUMNS.map(column => <View key={column} style={[styles.badge, styles.badgeMuted]}><Text style={styles.badgeMutedText}>{column}</Text></View>)}</View>
            <Text style={styles.description}>Invalid rows are skipped; import success reports the skipped count and first reason.</Text>
          </View>
          <View style={styles.modalActions}><TouchableOpacity style={styles.modalAction} disabled={importing} onPress={() => { setImportModalOpen(false); setImportFile(null); }}><Text style={styles.modalActionText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.modalAction, styles.modalActionPrimary]} disabled={importing || !importFile} onPress={() => { uploadImport(); }}>{importing ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalActionPrimaryText}>Import File</Text>}</TouchableOpacity></View>
        </View></View>
      </AppModal>
    </View>
  );
}
