import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, NativeModules, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { Check, ChevronDown, Columns3, Edit2, MoreVertical, Package, Pill, Plus, Search, Trash2, TriangleAlert, Upload, X, IndianRupee } from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { Pagination } from '../../components/common/Pagination';
import { ColumnSelectorModal } from '../../components/common/ColumnSelectorModal';
import { CustomCalendarPicker } from '../../components/common/CustomCalendarPicker';
import { useAuthContext } from '../../context/AuthContext';
import { Medicine } from '../../types/clinicTypes';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { adjustMedicineStockApi, createMedicineApi, deleteMedicineApi, getExistingMedicineBatchesApi, getMedicinesApi, MedicinePayload, updateMedicineApi, uploadMedicinesExcelApi } from '../../api/medicineApi';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

interface Props { onOpenDrawer: () => void }
type FormState = {
  name: string; generic_name: string; manufacturer: string; category: string; form: string;
  unit_price: string; stock_quantity: string; reorder_level: string; expiry_date: string;
  batch_number: string; hsn_code: string; gst_percent: string;
};
type MenuState = { medicine: Medicine; top: number; left: number } | null;
type PickedFile = { uri: string; name: string; type: string };
type ImportPreview = { rows: Array<{ rowNumber: number; name: string; batch: string; valid: boolean; action: 'insert' | 'update' | 'skip'; issue?: string }>; total: number; inserts: number; updates: number; invalid: number; error?: string };
const COLUMN_OPTIONS = [
  { key: 'id', label: 'ID', defaultVisible: false }, { key: 'medicine', label: 'Medicine', defaultVisible: true },
  { key: 'generic', label: 'Generic', defaultVisible: false }, { key: 'manufacturer', label: 'Manufacturer', defaultVisible: false },
  { key: 'category', label: 'Category', defaultVisible: true }, { key: 'form', label: 'Form', defaultVisible: false },
  { key: 'unit_price', label: 'Unit Price', defaultVisible: true }, { key: 'stock_qty', label: 'Stock Qty', defaultVisible: true },
  { key: 'reorder_level', label: 'Reorder Level', defaultVisible: false }, { key: 'batch', label: 'Batch', defaultVisible: false },
  { key: 'expiry', label: 'Expiry', defaultVisible: true }, { key: 'gst', label: 'GST %', defaultVisible: false },
  { key: 'status', label: 'Status', defaultVisible: true }, { key: 'actions', label: 'Actions', defaultVisible: true },
] as const;
type MedicineColumnKey = typeof COLUMN_OPTIONS[number]['key'];
const DEFAULT_VISIBLE_COLUMNS = Object.fromEntries(COLUMN_OPTIONS.map(column => [column.key, column.defaultVisible])) as Record<MedicineColumnKey, boolean>;
const PAGE_SIZE = 10;
const EMPTY_FORM: FormState = {
  name: '', generic_name: '', manufacturer: '', category: '', form: '', unit_price: '',
  stock_quantity: '0', reorder_level: '10', expiry_date: '', batch_number: '', hsn_code: '', gst_percent: '0',
};

const numberOrZero = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const stockStatus = (medicine: Medicine) => medicine.stock_quantity <= 0 ? 'Out of Stock' : medicine.stock_quantity <= medicine.reorder_level ? 'Low Stock' : 'In Stock';
const formatExpiry = (value?: string | null) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};
const toForm = (medicine: Medicine): FormState => ({
  name: medicine.name || '', generic_name: medicine.generic_name || '', manufacturer: medicine.manufacturer || '',
  category: medicine.category || '', form: medicine.form || '', unit_price: String(medicine.unit_price ?? ''),
  stock_quantity: String(medicine.stock_quantity ?? 0), reorder_level: String(medicine.reorder_level ?? 10),
  expiry_date: String(medicine.expiry_date || '').split('T')[0], batch_number: medicine.batch_number || '',
  hsn_code: medicine.hsn_code || '', gst_percent: String(medicine.gst_percent ?? 0),
});

export const PharmacyInventoryScreen: React.FC<Props> = ({ onOpenDrawer }) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const actionButtonRefs = useRef<Record<number, any>>({});
  const { token, activeClinicId, role, permissionsMap = {} } = useAuthContext();
  const canView = canUseStaffScreen(role, permissionsMap, 'pharmacy_inventory', 'view');
  const canAdd = canUseStaffScreen(role, permissionsMap, 'pharmacy_inventory', 'add');
  const canEdit = canUseStaffScreen(role, permissionsMap, 'pharmacy_inventory', 'edit');
  const canDelete = canUseStaffScreen(role, permissionsMap, 'pharmacy_inventory', 'delete');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All categories');
  const [selectedStatus, setSelectedStatus] = useState('All status');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [menu, setMenu] = useState<MenuState>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [stockVisible, setStockVisible] = useState(false);
  const [stockType, setStockType] = useState<'add' | 'remove'>('add');
  const [stockQuantity, setStockQuantity] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [importVisible, setImportVisible] = useState(false);
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [columnsVisible, setColumnsVisible] = useState(false);
  const [openFilter, setOpenFilter] = useState<'category' | 'status' | null>(null);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, activeClinicId]);

  const loadMedicines = useCallback(async () => {
    if (!token || !canView) { setMedicines([]); setTotalItems(0); setLoading(false); return; }
    setLoading(true);
    setLoadError('');
    try {
      const response = await getMedicinesApi(token, {
        clinic_id: activeClinicId, page: currentPage, limit: pageSize,
        search: debouncedSearch, low_stock: false, is_active: 1,
      });
      if (!response.success) {
        setLoadError(response.message || 'Unable to load the medicine inventory.');
        showErrorToast('Could not load medicines', response.message);
        return;
      }
      const payload: any = response.data;
      const rows: Medicine[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data) ? payload.data
          : Array.isArray(payload?.medicines) ? payload.medicines
            : Array.isArray(payload?.rows) ? payload.rows
              : Array.isArray(payload?.data?.data) ? payload.data.data
                : Array.isArray(payload?.data?.medicines) ? payload.data.medicines : [];
      setMedicines(rows);
      setTotalItems(Number(payload?.total ?? payload?.count ?? payload?.data?.total ?? payload?.data?.count ?? rows.length));
    } catch (error: any) {
      const message = error?.message || 'Unable to load the medicine inventory.';
      setLoadError(message);
      showErrorToast('Could not load medicines', message);
    } finally {
      setLoading(false);
    }
  }, [activeClinicId, canView, currentPage, debouncedSearch, pageSize, refreshKey, token]);

  useEffect(() => { void loadMedicines(); }, [loadMedicines]);

  const lowStockCount = useMemo(() => medicines.filter(medicine => medicine.stock_quantity <= medicine.reorder_level).length, [medicines]);
  const categories = useMemo(() => Array.from(new Set(medicines.map(medicine => medicine.category).filter(Boolean))), [medicines]);
  const visibleMedicines = useMemo(() => medicines.filter(medicine =>
    (selectedCategory === 'All categories' || medicine.category === selectedCategory) &&
    (selectedStatus === 'All status' || stockStatus(medicine) === selectedStatus),
  ), [medicines, selectedCategory, selectedStatus]);
  const inStockCount = useMemo(() => medicines.filter(medicine => stockStatus(medicine) === 'In Stock').length, [medicines]);
  const inventoryValue = useMemo(() => medicines.reduce((total, medicine) => total + numberOrZero(medicine.unit_price) * numberOrZero(medicine.stock_quantity), 0), [medicines]);
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const setField = (key: keyof FormState, value: string) => setForm(previous => ({ ...previous, [key]: value }));

  const openAdd = () => {
    if (!canAdd) return;
    setFormMode('add'); setSelectedMedicine(null); setForm(EMPTY_FORM); setFocusedField(null); setFormVisible(true);
  };
  const openEdit = (medicine: Medicine) => {
    if (!canEdit) return;
    setMenu(null); setSelectedMedicine(medicine); setForm(toForm(medicine)); setFormMode('edit'); setFocusedField(null); setFormVisible(true);
  };
  const openStock = (medicine: Medicine) => {
    if (!canEdit) return;
    setMenu(null); setSelectedMedicine(medicine); setStockType('add'); setStockQuantity(''); setStockVisible(true);
  };

  const openMedicineMenu = (medicine: Medicine) => {
    const anchor = actionButtonRefs.current[medicine.id];
    anchor?.measureInWindow((x: number, y: number, width: number, height: number) => {
      const menuWidth = Math.min(190, screenWidth - 24);
      const menuHeight = canEdit && canDelete ? 142 : 94;
      const left = Math.max(12, Math.min(x + width - menuWidth, screenWidth - menuWidth - 12));
      const below = y + height + 4;
      const top = below + menuHeight <= screenHeight - 12 ? below : Math.max(12, y - menuHeight - 4);
      setMenu({ medicine, top, left });
    });
  };

  const buildPayload = (): MedicinePayload => ({
    ...(formMode === 'add' && activeClinicId ? { clinic_id: activeClinicId } : {}),
    name: form.name.trim(), generic_name: form.generic_name.trim(), manufacturer: form.manufacturer.trim(),
    category: form.category.trim(), form: form.form.trim(), unit_price: Number(form.unit_price),
    stock_quantity: Number(form.stock_quantity), reorder_level: Number(form.reorder_level),
    expiry_date: form.expiry_date.trim(), batch_number: form.batch_number.trim(),
    gst_percent: Number(form.gst_percent || 0),
  });

  const saveMedicine = async () => {
    if (!token) return;
    if (formMode === 'add' && !canAdd || formMode === 'edit' && !canEdit) return;
    const required = [form.name, form.manufacturer, form.category, form.batch_number, form.expiry_date, form.unit_price, form.stock_quantity, form.reorder_level];
    const price = Number(form.unit_price);
    const gst = Number(form.gst_percent || 0);
    const stock = Number(form.stock_quantity);
    const reorderLevel = Number(form.reorder_level);
    if (required.some(value => !value.trim()) || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < 0 || !Number.isFinite(reorderLevel) || reorderLevel < 0 || !Number.isFinite(gst) || gst < 0 || gst > 100) {
      showErrorToast('Check the medicine details', 'Complete all required fields. Enter a price greater than zero and valid non-negative stock and reorder values. GST must be from 0 to 100.'); return;
    }
    if (form.expiry_date && Number.isNaN(Date.parse(form.expiry_date))) { showErrorToast('Invalid expiry date', 'Enter the date in YYYY-MM-DD format.'); return; }
    setSaving(true);
    const response = formMode === 'add'
      ? await createMedicineApi(token, buildPayload())
      : selectedMedicine ? await updateMedicineApi(token, selectedMedicine.id, buildPayload()) : null;
    setSaving(false);
    if (!response?.success) { showErrorToast('Could not save medicine', response?.message || 'Please try again.'); return; }
    setFormVisible(false); setRefreshKey(value => value + 1);
    showSuccessToast(formMode === 'add' ? 'Medicine added' : 'Medicine updated', `${form.name.trim()} was saved successfully.`);
  };

  const saveStock = async () => {
    if (!token || !selectedMedicine || !canEdit) return;
    const quantity = Number(stockQuantity);
    if (!Number.isInteger(quantity) || quantity <= 0) { showErrorToast('Invalid quantity', 'Enter a whole number greater than zero.'); return; }
    if (stockType === 'remove' && quantity > selectedMedicine.stock_quantity) { showErrorToast('Insufficient stock', 'The quantity to remove cannot exceed the available stock.'); return; }
    setSaving(true);
    const response = await adjustMedicineStockApi(token, selectedMedicine.id, quantity, stockType);
    setSaving(false);
    if (!response.success) { showErrorToast('Stock update failed', response.message); return; }
    setStockVisible(false); setRefreshKey(value => value + 1);
    showSuccessToast('Stock updated', `${selectedMedicine.name} stock was ${stockType === 'add' ? 'increased' : 'reduced'}.`);
  };

  const confirmDelete = (medicine: Medicine) => {
    if (!canDelete) return;
    setMenu(null);
    Alert.alert('Delete medicine?', `This will deactivate ${medicine.name} in the clinic inventory.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (!token || !canDelete) return;
        const response = await deleteMedicineApi(token, medicine.id);
        if (!response.success) { showErrorToast('Delete failed', response.message); return; }
        setRefreshKey(value => value + 1); showSuccessToast('Medicine deleted', `${medicine.name} was deactivated.`);
      } },
    ]);
  };

  const chooseImportFile = async () => {
    if (!canAdd) return;
    if (Platform.OS !== 'android') {
      showErrorToast('Import unavailable', 'Medicine spreadsheet import is currently supported on Android only.');
      return;
    }
    try {
      const file = await NativeModules.MedicineFilePicker?.pickExcel();
      if (!file) return;
      const extension = String(file.name).split('.').pop()?.toLowerCase();
      if (!['xlsx', 'csv'].includes(extension || '')) {
        showErrorToast('Unsupported file', 'Choose an .xlsx workbook or .csv file. Legacy .xls files are not supported on mobile.'); return;
      }
      const picked = { ...file, type: file.type === 'application/octet-stream' ? (extension === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') : file.type };
      setPickedFile(picked);
      setImportPreview(null);
      const matrix: string[][] = await NativeModules.MedicineFilePicker?.readSpreadsheet(file.uri);
      if (!Array.isArray(matrix) || matrix.length === 0) throw new Error('The spreadsheet does not contain any rows.');
      const requiredColumns = ['name', 'generic_name', 'manufacturer', 'category', 'unit_price', 'stock_quantity', 'reorder_level', 'expiry_date', 'batch_number'];
      const headers = (matrix[0] || []).map(value => String(value || '').replace(/^\uFEFF/, '').trim());
      const missing = requiredColumns.filter(column => !headers.includes(column));
      const rows = matrix.slice(1).map((cells, index) => {
        const values = Object.fromEntries(requiredColumns.map(column => [column, String(cells[headers.indexOf(column)] || '').trim()]));
        const issue = !values.name ? 'Medicine name missing' : !values.batch_number ? 'Batch number missing' : undefined;
        return { rowNumber: index + 2, name: values.name, batch: values.batch_number, valid: !issue, action: issue ? 'skip' as const : 'insert' as const, issue };
      }).filter(row => row.name || row.batch);
      const preview: ImportPreview = { rows, total: rows.length, inserts: rows.filter(row => row.valid).length, updates: 0, invalid: rows.filter(row => !row.valid).length };
      if (missing.length) preview.error = `Missing required columns: ${missing.join(', ')}`;
      else if (!rows.length) preview.error = 'No medicine rows were found in this file.';
      else if (!preview.inserts) preview.error = 'Every row is missing a medicine name or batch number.';
      else if (activeClinicId && token) {
        const response = await getExistingMedicineBatchesApi(token, activeClinicId, rows.filter(row => row.valid).map(row => row.batch));
        if (!response.success) throw new Error(response.message || 'Could not check existing batch numbers.');
        const existing = new Set((response.data?.existingBatchNumbers || []).map(value => value.trim().toLowerCase()));
        const seen = new Set<string>();
        preview.rows = rows.map(row => {
          if (!row.valid) return row;
          const key = row.batch.trim().toLowerCase();
          const action = existing.has(key) || seen.has(key) ? 'update' as const : 'insert' as const;
          seen.add(key);
          return { ...row, action };
        });
        preview.inserts = preview.rows.filter(row => row.action === 'insert').length;
        preview.updates = preview.rows.filter(row => row.action === 'update').length;
      }
      setImportPreview(preview);
      if (preview.error) showErrorToast('Import file needs attention', preview.error);
    } catch (error: any) { showErrorToast('File selection failed', error?.message || 'Could not select the inventory file.'); }
  };

  const uploadImport = async () => {
    if (!token || !activeClinicId || !pickedFile || !importPreview || importPreview.error || importPreview.inserts + importPreview.updates === 0 || !canAdd) return;
    setSaving(true);
    const response = await uploadMedicinesExcelApi(token, activeClinicId, pickedFile);
    setSaving(false);
    if (!response.success) { showErrorToast('Import failed', response.message); return; }
    setImportVisible(false); setPickedFile(null); setImportPreview(null); setCurrentPage(1); setRefreshKey(value => value + 1);
    showSuccessToast('Import completed', response.message || 'Medicine inventory was imported.');
  };

  const updateField = (key: keyof FormState, label: string, keyboardType: 'default' | 'decimal-pad' | 'numeric' = 'default', placeholder = '') => (
    <View style={[styles.field, styles.medicineField]} key={key}>
      <Text style={[styles.label, styles.medicineFieldLabel]}>{label.replace(' *', '')}{label.endsWith(' *') ? <Text style={styles.requiredStar}> *</Text> : null}</Text>
      <TextInput
        style={[styles.input, styles.medicineFormInput, focusedField === key && styles.focusedInput]} value={form[key]} onChangeText={value => setField(key, value)}
        placeholder={placeholder || label} placeholderTextColor="#94A3B8" keyboardType={keyboardType}
        autoCapitalize={key === 'name' || key === 'generic_name' || key === 'manufacturer' ? 'words' : 'none'}
        onFocus={() => setFocusedField(key)} onBlur={() => setFocusedField(null)}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Medicine Inventory" />
      {!canView ? <View style={styles.permissionBox}><Pill size={28} color="#0D9488" /><Text style={styles.emptyTitle}>Medicine inventory access required</Text><Text style={styles.muted}>Your role does not have permission to view medicines.</Text></View> : <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.pageHeading}>
          <View style={styles.headingIcon}><Pill size={19} color="#0D9488" /></View>
          <View style={styles.headingText}><Text style={styles.pageTitle}>Medicine Inventory</Text><Text style={styles.muted}>{totalItems} medicines in this clinic</Text></View>
        </View>
        {canAdd ? <View style={styles.actionRow}><TouchableOpacity accessibilityLabel="Import medicines" style={styles.patientStyleSecondaryButton} onPress={() => { setPickedFile(null); setImportPreview(null); setImportVisible(true); }}><Upload size={16} color="#0F172A" /><Text style={styles.patientStyleSecondaryText}>Import</Text></TouchableOpacity><TouchableOpacity accessibilityLabel="Add medicine" style={styles.patientStylePrimaryButton} onPress={openAdd}><Plus size={16} color="#FFFFFF" /><Text style={styles.patientStylePrimaryText}>Add Medicine</Text></TouchableOpacity></View> : null}

        <View style={styles.statsGrid}>
          <StatCard icon={<Pill size={16} color="#0D9488" />} label="Total Medicines" value={String(totalItems)} tone="teal" />
          <StatCard icon={<Package size={16} color="#16A34A" />} label="In Stock" value={String(inStockCount)} tone="green" />
          <StatCard icon={<TriangleAlert size={16} color="#D97706" />} label="Low Stock" value={String(lowStockCount)} tone="amber" />
          <StatCard icon={<IndianRupee size={16} color="#2563EB" />} label="Stock Value" value={`\u20B9${inventoryValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} tone="blue" />
        </View>

        <View style={styles.searchBox}><Search size={17} color="#64748B" /><TextInput value={search} onChangeText={setSearch} placeholder="Search medicines, batch, category..." placeholderTextColor="#94A3B8" style={styles.searchInput} returnKeyType="search" />{search ? <TouchableOpacity onPress={() => setSearch('')}><X size={16} color="#64748B" /></TouchableOpacity> : null}</View>
        <View style={styles.filtersCard}>
          <View style={styles.filterSelectRow}>
            <View style={[styles.filterSelectWrap, openFilter === 'category' && styles.filterSelectWrapTop]}>
              <TouchableOpacity style={styles.filterSelect} onPress={() => setOpenFilter(openFilter === 'category' ? null : 'category')}><Text numberOfLines={1} style={styles.filterSelectText}>{selectedCategory === 'All categories' ? 'All Categories' : selectedCategory}</Text><ChevronDown size={16} color="#64748B" /></TouchableOpacity>
              {openFilter === 'category' ? <ScrollView style={styles.filterPopover} nestedScrollEnabled keyboardShouldPersistTaps="handled">{['All categories', ...categories].map(option => <TouchableOpacity key={option} style={styles.filterOption} onPress={() => { setSelectedCategory(option); setOpenFilter(null); }}><Text style={styles.filterOptionText}>{option === 'All categories' ? 'All Categories' : option}</Text>{selectedCategory === option ? <Check size={15} color="#0D9488" /> : null}</TouchableOpacity>)}</ScrollView> : null}
            </View>
            <View style={[styles.filterSelectWrap, openFilter === 'status' && styles.filterSelectWrapTop]}>
              <TouchableOpacity style={styles.filterSelect} onPress={() => setOpenFilter(openFilter === 'status' ? null : 'status')}><Text numberOfLines={1} style={styles.filterSelectText}>{selectedStatus === 'All status' ? 'All Status' : selectedStatus}</Text><ChevronDown size={16} color="#64748B" /></TouchableOpacity>
              {openFilter === 'status' ? <View style={styles.filterPopover}>{['All status', 'In Stock', 'Low Stock', 'Out of Stock'].map(option => <TouchableOpacity key={option} style={styles.filterOption} onPress={() => { setSelectedStatus(option); setOpenFilter(null); }}><Text style={styles.filterOptionText}>{option === 'All status' ? 'All Status' : option}</Text>{selectedStatus === option ? <Check size={15} color="#0D9488" /> : null}</TouchableOpacity>)}</View> : null}
            </View>
          </View>
          <TouchableOpacity style={styles.columnsButton} onPress={() => setColumnsVisible(true)}><Columns3 size={16} color="#1E293B" /><Text style={styles.columnsButtonText}>Columns</Text></TouchableOpacity>
        </View>

        <View style={styles.listHeader}><Pill size={17} color="#0F172A" /><Text style={styles.listTitle}>All Medicines ({visibleMedicines.length})</Text></View>
        {loading ? <View style={styles.loading}><ActivityIndicator size="large" color="#0D9488" /><Text style={styles.muted}>Loading medicines...</Text></View> : visibleMedicines.length === 0 ? <View style={styles.empty}><Package size={28} color="#94A3B8" /><Text style={styles.emptyTitle}>{loadError ? 'Inventory could not be loaded' : 'No medicines found'}</Text><Text style={styles.muted}>{loadError || (debouncedSearch || selectedCategory !== 'All categories' || selectedStatus !== 'All status' ? 'Try changing your search or filters.' : 'Add a medicine to start managing stock.')}</Text></View> : <View style={styles.cards}>
          {visibleMedicines.map(medicine => {
            const status = stockStatus(medicine);
            const statusStyle = status === 'In Stock' ? styles.inStock : status === 'Low Stock' ? styles.lowStock : styles.outStock;
            return <View key={medicine.id} style={styles.card}>
              <View style={styles.cardTop}><View style={styles.medicineIcon}><Pill size={17} color="#0D9488" /></View><View style={styles.cardTitleBlock}>
                {visibleColumns.medicine ? <Text style={styles.medicineName} numberOfLines={2}>{medicine.name}</Text> : null}
                {visibleColumns.id ? <Text style={styles.medicineForm}>ID: {medicine.id}</Text> : null}
                {(visibleColumns.generic || visibleColumns.category) ? <Text style={styles.medicineForm}>{[visibleColumns.generic ? medicine.generic_name : null, visibleColumns.category ? medicine.category : null].filter(Boolean).join(' · ') || 'Medicine details'}</Text> : null}
              </View>
                {visibleColumns.actions && (canEdit || canDelete) ? <View ref={node => { actionButtonRefs.current[medicine.id] = node; }} collapsable={false}><TouchableOpacity accessibilityLabel={`Actions for ${medicine.name}`} style={styles.moreButton} onPress={() => openMedicineMenu(medicine)}><MoreVertical size={18} color="#334155" /></TouchableOpacity></View> : null}
              </View>
              <View style={styles.detailGrid}>
                {visibleColumns.unit_price ? <InfoTile label="Price" value={`Rs ${numberOrZero(medicine.unit_price).toFixed(2)}`} /> : null}
                {visibleColumns.stock_qty ? <InfoTile label="Stock" value={String(medicine.stock_quantity ?? 0)} /> : null}
                {visibleColumns.expiry ? <InfoTile label="Expiry" value={formatExpiry(medicine.expiry_date)} /> : null}
                {visibleColumns.status ? <View style={styles.infoTile}><Text style={styles.infoLabel}>Status</Text><View style={[styles.statusPill, statusStyle]}><Text style={[styles.statusText, status === 'Low Stock' ? styles.lowStatusText : null]}>{status}</Text></View></View> : null}
                {visibleColumns.manufacturer ? <InfoTile label="Manufacturer" value={medicine.manufacturer || '—'} /> : null}
                {visibleColumns.form ? <InfoTile label="Form" value={medicine.form || '—'} /> : null}
                {visibleColumns.reorder_level ? <InfoTile label="Reorder Level" value={String(medicine.reorder_level ?? 0)} /> : null}
                {visibleColumns.batch ? <InfoTile label="Batch" value={medicine.batch_number || '—'} /> : null}
                {visibleColumns.gst ? <InfoTile label="GST %" value={`${numberOrZero(medicine.gst_percent)}%`} /> : null}
              </View>
            </View>;
          })}
        </View>}
        {totalItems > 0 ? <Pagination currentPage={currentPage} totalPages={pageCount} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} /> : null}
      </ScrollView>}


      <ColumnSelectorModal
        visible={columnsVisible}
        onClose={() => setColumnsVisible(false)}
        columns={[...COLUMN_OPTIONS]}
        visibleColumns={visibleColumns}
        onToggleColumn={key => setVisibleColumns(current => ({ ...current, [key]: !current[key] }))}
        onReset={() => setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)}
        title="Show / Hide Columns"
        subtitle="Toggle columns to show or hide in the list"
      />

      <Modal visible={Boolean(menu)} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <View style={styles.actionMenuOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(null)} />
          <View style={[styles.actionMenuCard, { top: menu?.top ?? 12, left: menu?.left ?? 12 }]}>
            {canEdit ? <MenuAction highlighted icon={<Edit2 size={16} color="#0D9488" />} label="Edit" onPress={() => menu && openEdit(menu.medicine)} /> : null}
            {canEdit ? <MenuAction icon={<Package size={16} color="#334155" />} label="Update Stock" onPress={() => menu && openStock(menu.medicine)} /> : null}
            {canEdit && canDelete ? <View style={styles.menuDivider} /> : null}
            {canDelete ? <MenuAction icon={<Trash2 size={16} color="#EF4444" />} label="Delete" destructive onPress={() => menu && confirmDelete(menu.medicine)} /> : null}
          </View>
        </View>
      </Modal>

      <FormModal visible={formVisible} variant="medicine" title={formMode === 'add' ? 'Add New Medicine' : 'Edit Medicine'} subtitle={formMode === 'add' ? 'Enter medicine details manually' : 'Update medicine details'} saving={saving} onClose={() => setFormVisible(false)} onSave={saveMedicine} saveLabel={formMode === 'add' ? 'Add Medicine' : 'Update Medicine'}>
        {updateField('name', 'Medicine Name *', 'default', 'e.g., Paracetamol 500mg')}
        {updateField('generic_name', 'Generic Name', 'default', 'e.g., Paracetamol')}
        {updateField('manufacturer', 'Manufacturer *', 'default', 'e.g., Sun Pharma')}
        {updateField('category', 'Category *', 'default', 'e.g., Analgesic')}
        {updateField('form', 'Form', 'default', 'e.g., Tablet, Capsule')}
        {updateField('batch_number', 'Batch Number *', 'default', 'e.g., BTH001')}
        <View style={[styles.field, styles.medicineField]}><Text style={[styles.label, styles.medicineFieldLabel]}>Expiry Date<Text style={styles.requiredStar}> *</Text></Text><CustomCalendarPicker selectedDate={form.expiry_date ? new Date(`${form.expiry_date}T00:00:00`) : undefined} placeholder="Select expiry date" fromYear={new Date().getFullYear() - 10} toYear={new Date().getFullYear() + 30} triggerStyle={[styles.dateTrigger, styles.medicineFormInput, focusedField === 'expiry_date' && styles.focusedInput]} triggerTextStyle={[styles.dateTriggerText, styles.medicineDateTriggerText]} iconColor="#718096" onOpen={() => setFocusedField('expiry_date')} onDateChange={date => { setField('expiry_date', `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`); setFocusedField(null); }} /></View>
        {updateField('unit_price', 'Unit Price *', 'decimal-pad', '0.00')}
        {updateField('stock_quantity', 'Stock Quantity *', 'numeric', '0')}
        {updateField('reorder_level', 'Reorder Level *', 'numeric', '10')}
        {updateField('gst_percent', 'GST Percent', 'decimal-pad', '12')}
        {formMode === 'edit' ? <Text style={styles.formHint}>For stock changes, use â€œUpdate Stockâ€ so the adjustment is recorded separately.</Text> : null}
      </FormModal>

      <FormModal visible={stockVisible} variant="stock" title="Update Stock" subtitle={selectedMedicine ? `Current stock: ${selectedMedicine.stock_quantity} units` : ''} saving={saving} onClose={() => setStockVisible(false)} onSave={saveStock} saveLabel="Update Stock">
        <View style={styles.stockOptions}>
          <TouchableOpacity style={[styles.stockOption, stockType === 'add' && styles.stockOptionActive]} onPress={() => setStockType('add')}><Plus size={17} color={stockType === 'add' ? '#FFFFFF' : '#334155'} /><Text style={[styles.stockOptionText, stockType === 'add' && styles.stockOptionTextActive]}>Add Stock</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.stockOption, stockType === 'remove' && styles.stockOptionActive]} onPress={() => setStockType('remove')}><Package size={16} color={stockType === 'remove' ? '#FFFFFF' : '#334155'} /><Text style={[styles.stockOptionText, stockType === 'remove' && styles.stockOptionTextActive]}>Remove Stock</Text></TouchableOpacity>
        </View>
        <View style={styles.stockQuantityField}><Text style={styles.stockQuantityLabel}>Quantity</Text><TextInput value={stockQuantity} onChangeText={setStockQuantity} style={[styles.input, styles.stockQuantityInput, focusedField === 'stockQuantity' && styles.focusedInput]} keyboardType="numeric" placeholder="Enter quantity" placeholderTextColor="#718096" onFocus={() => setFocusedField('stockQuantity')} onBlur={() => setFocusedField(null)} /></View>
      </FormModal>

      <FormModal visible={importVisible} title="Import Medicines" saving={saving} disableSave={!pickedFile || !importPreview || Boolean(importPreview.error)} onClose={() => { setImportVisible(false); setPickedFile(null); setImportPreview(null); }} onSave={uploadImport} saveLabel="Import file">
        <Text style={styles.formHint}>Select an .xlsx workbook or CSV. The first worksheet is checked for required columns and existing batch numbers before upload.</Text>
        <TouchableOpacity style={styles.filePicker} onPress={() => void chooseImportFile()}><Upload size={18} color="#0D9488" /><Text style={styles.filePickerText}>{pickedFile ? 'Choose a different file' : 'Choose Excel or CSV file'}</Text></TouchableOpacity>
        {pickedFile ? <View style={styles.selectedFile}><Package size={16} color="#0D9488" /><View style={styles.fileCopy}><Text style={styles.fileName} numberOfLines={1}>{pickedFile.name}</Text><Text style={styles.formHint}>{importPreview ? `${importPreview.inserts} new · ${importPreview.updates} update · ${importPreview.invalid} skipped` : 'Reading and validating file…'}</Text></View><TouchableOpacity accessibilityLabel="Remove selected file" onPress={() => { setPickedFile(null); setImportPreview(null); }}><X size={16} color="#64748B" /></TouchableOpacity></View> : null}
        {importPreview?.error ? <Text style={styles.importError}>{importPreview.error}</Text> : null}
        {importPreview && !importPreview.error ? <View style={styles.importPreviewBox}><Text style={styles.fileName}>Preview · {importPreview.total} rows</Text><ScrollView nestedScrollEnabled style={{ maxHeight: 170 }}>{importPreview.rows.slice(0, 30).map(row => <View key={row.rowNumber} style={styles.importPreviewRow}><Text style={styles.formHint}>Row {row.rowNumber}: {row.name || row.batch}</Text><Text style={styles.formHint}>{row.action}</Text></View>)}</ScrollView></View> : null}
        <Text style={styles.formHint}>Required columns: name, generic_name, manufacturer, category, unit_price, stock_quantity, reorder_level, expiry_date and batch_number.</Text>
      </FormModal>
    </View>
  );
};

function InfoTile({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoTile}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue} numberOfLines={2}>{value}</Text></View>;
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'teal' | 'green' | 'amber' | 'blue' }) {
  return <View style={styles.statCard}><View style={[styles.statIcon, tone === 'teal' ? styles.statTeal : tone === 'green' ? styles.statGreen : tone === 'amber' ? styles.statAmber : styles.statBlue]}>{icon}</View><View style={styles.statCopy}><Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View></View>;
}

function MenuAction({ icon, label, onPress, destructive = false, highlighted = false }: { icon: React.ReactNode; label: string; onPress: () => void; destructive?: boolean; highlighted?: boolean }) {
  return <TouchableOpacity style={[styles.menuAction, highlighted && styles.menuActionHighlighted]} onPress={onPress}>{icon}<Text style={[styles.menuActionText, destructive && styles.destructiveText, highlighted && styles.menuActionTextHighlighted]}>{label}</Text></TouchableOpacity>;
}

function FormModal({ visible, variant, title, subtitle, saving, disableSave = false, onClose, onSave, children, saveLabel = 'Save Medicine' }: { visible: boolean; variant?: 'medicine' | 'stock'; title: string; subtitle?: string; saving: boolean; disableSave?: boolean; onClose: () => void; onSave: () => void; children: React.ReactNode; saveLabel?: string }) {
  const isMedicine = variant === 'medicine';
  const isStock = variant === 'stock';
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={isMedicine ? styles.medicineModalBackdrop : isStock ? styles.stockModalBackdrop : styles.modalBackdrop}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={isMedicine ? styles.medicineModalShell : isStock ? styles.stockModalShell : styles.modalShell}>
      <View style={[styles.modalCard, isMedicine && styles.medicineModalCard, isStock && styles.stockModalCard]}>
        <View style={isMedicine ? styles.medicineModalHeader : isStock ? styles.stockModalHeader : styles.modalHeader}>
          {isStock ? <View style={styles.stockHeaderCopy}><Text style={styles.modalTitle}>{title}</Text>{subtitle ? <Text style={styles.stockModalSubtitle}>{subtitle}</Text> : null}</View> : <View style={styles.modalHeading}><View style={[styles.modalIcon, isMedicine && styles.medicineModalIcon]}><Pill size={18} color={isMedicine ? '#FFFFFF' : '#0D9488'} /></View><View style={styles.modalHeaderCopy}><Text style={[styles.modalTitle, isMedicine && styles.medicineModalTitle]}>{title}</Text>{subtitle ? <Text style={styles.medicineModalSubtitle}>{subtitle}</Text> : null}</View></View>}
          <TouchableOpacity accessibilityLabel="Close dialog" onPress={onClose} style={isStock ? styles.stockCloseButton : styles.closeButton}><X size={18} color="#475569" /></TouchableOpacity>
        </View>
        <ScrollView style={isMedicine ? styles.medicineFormScroll : isStock ? styles.stockFormScroll : styles.formScroll} contentContainerStyle={isMedicine ? styles.medicineFormContent : isStock ? styles.stockFormContent : styles.formContent} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        {isStock ? <View style={styles.stockModalFooter}><TouchableOpacity disabled={saving || disableSave} style={[styles.stockSaveButton, (saving || disableSave) && styles.disabledButton]} onPress={onSave}>{saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}<Text style={styles.saveText}>{saving ? 'Updating...' : saveLabel}</Text></TouchableOpacity><TouchableOpacity style={styles.stockCancelButton} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity></View> : <View style={styles.modalFooter}><TouchableOpacity style={styles.cancelButton} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={saving || disableSave} style={[styles.saveButton, (saving || disableSave) && styles.disabledButton]} onPress={onSave}>{saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}<Text style={styles.saveText}>{saving ? 'Saving...' : saveLabel}</Text></TouchableOpacity></View>}
      </View>
    </KeyboardAvoidingView></View>
  </Modal>;
}

const styles = StyleSheet.create({
  menuActionHighlighted: { backgroundColor: '#DDF5F2' }, menuActionTextHighlighted: { color: '#0F766E', fontWeight: '600' },
  stockModalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: 'rgba(15,23,42,0.5)' }, stockModalShell: { width: '100%', maxWidth: 380, maxHeight: '90%' }, stockModalCard: { borderRadius: 14 }, stockModalHeader: { minHeight: 78, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 48, borderBottomWidth: 0 }, stockHeaderCopy: { alignItems: 'center', gap: 5 }, stockModalSubtitle: { color: '#718096', fontSize: 12 }, stockCloseButton: { position: 'absolute', top: 8, right: 9, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }, stockFormScroll: { flexShrink: 1, maxHeight: 350 }, stockFormContent: { gap: 22, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 22 }, stockOptions: { flexDirection: 'row', gap: 14 }, stockOption: { flex: 1, minWidth: 0, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 11, backgroundColor: '#F8FAFC' }, stockOptionActive: { borderColor: '#26A69A', backgroundColor: '#26A69A' }, stockOptionText: { color: '#1E293B', fontSize: 12, fontWeight: '600' }, stockOptionTextActive: { color: '#FFFFFF', fontWeight: '700' }, stockQuantityField: { gap: 8 }, stockQuantityLabel: { color: '#1E293B', fontSize: 12, fontWeight: '500' }, stockQuantityInput: { minHeight: 46, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#FFFFFF', fontSize: 14 }, stockModalFooter: { gap: 8, paddingHorizontal: 22, paddingTop: 4, paddingBottom: 18 }, stockSaveButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, backgroundColor: '#26A69A' }, stockCancelButton: { minHeight: 39, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC' },
  actionMenuOverlay: { flex: 1 }, actionMenuCard: { position: 'absolute', width: 190, padding: 4, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#FFFFFF', elevation: 12, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 10 }, menuDivider: { height: 1, marginVertical: 3, backgroundColor: '#F1F5F9' },
  medicineModalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18, backgroundColor: 'rgba(15,23,42,0.62)' }, medicineModalShell: { width: '100%', maxWidth: 430, maxHeight: '88%' },
  medicineModalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  medicineField: { gap: 7, marginBottom: 3 }, medicineFieldLabel: { color: '#334155', fontSize: 13, fontWeight: '600' }, requiredStar: { color: '#EF4444', fontWeight: '700' }, medicineFormInput: { minHeight: 48, paddingHorizontal: 12, borderRadius: 11, backgroundColor: '#FFFFFF', fontSize: 14 }, medicineDateTriggerText: { fontSize: 14, color: '#718096' }, medicineModalCard: { maxHeight: '100%' }, medicineModalHeader: { minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, borderBottomWidth: 1, borderColor: '#E2E8F0' }, medicineModalIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#0D9488' }, modalHeaderCopy: { gap: 3 }, medicineModalSubtitle: { color: '#718096', fontSize: 12 }, medicineFormScroll: { flexShrink: 1, maxHeight: 650 }, medicineFormContent: { gap: 15, padding: 15, paddingBottom: 18 },
  columnsWrap: { position: 'relative', zIndex: 2 }, columnsPopover: { position: 'absolute', top: 43, right: 0, width: 235, maxHeight: 360, padding: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#FFFFFF', elevation: 12, zIndex: 40 }, columnsPopoverTitle: { paddingHorizontal: 8, paddingVertical: 7, color: '#64748B', fontSize: 10, fontWeight: '800' }, columnOption: { minHeight: 37, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 8 }, columnsReset: { minHeight: 35, justifyContent: 'center', paddingHorizontal: 8, borderTopWidth: 1, borderColor: '#E2E8F0' }, columnsResetText: { color: '#0F766E', fontSize: 10, fontWeight: '700' }, filterSelectWrap: { flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }, filterSelectWrapTop: { zIndex: 20 }, filterPopover: { position: 'absolute', top: 43, left: 0, right: 0, maxHeight: 230, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#FFFFFF', elevation: 10, zIndex: 30 }, filterOption: { minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 11, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }, filterOptionText: { flex: 1, color: '#334155', fontSize: 11 }, actionRow: { flexDirection: 'row', gap: 8 }, patientStylePrimaryButton: { flex: 1, minHeight: 39, paddingHorizontal: 11, borderRadius: 9, backgroundColor: '#26A69A', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }, patientStylePrimaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' }, patientStyleSecondaryButton: { flex: 1, minHeight: 39, paddingHorizontal: 11, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 9, backgroundColor: '#F8FAFC', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, patientStyleSecondaryText: { color: '#1E293B', fontSize: 12, fontWeight: '600' }, filtersCard: { gap: 10, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 13, backgroundColor: '#FFFFFF' }, filterSelectRow: { flexDirection: 'row', gap: 8 }, filterSelect: { flex: 1, minWidth: 0, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC' }, filterSelectText: { flex: 1, color: '#1E293B', fontSize: 11 }, columnsButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC' }, columnsButtonText: { color: '#1E293B', fontSize: 11, fontWeight: '700' }, columnCheck: { width: 19, height: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 5 }, columnCheckActive: { borderColor: '#0D9488', backgroundColor: '#0D9488' }, columnsDone: { minHeight: 39, alignItems: 'center', justifyContent: 'center', marginTop: 5, borderRadius: 10, backgroundColor: '#0D9488' }, columnsDoneText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  container: { flex: 1, backgroundColor: '#F8FAFC' }, content: { padding: 14, paddingBottom: 90, gap: 12 },
  pageHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 }, headingIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#CCFBF1' }, headingText: { flex: 1 }, pageTitle: { color: '#0F172A', fontSize: 18, fontWeight: '800' }, muted: { color: '#64748B', fontSize: 11 }, headerActions: { flexDirection: 'row', gap: 6 }, importButton: { minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 9, borderWidth: 1, borderColor: '#99F6E4', borderRadius: 11, backgroundColor: '#F0FDFA' }, importButtonText: { color: '#0F766E', fontSize: 10, fontWeight: '800' }, addButton: { minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 11, backgroundColor: '#0D9488' }, addButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, statCard: { width: '48%', minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, backgroundColor: '#FFFFFF' }, statIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 11 }, statTeal: { backgroundColor: '#CCFBF1' }, statGreen: { backgroundColor: '#DCFCE7' }, statAmber: { backgroundColor: '#FEF3C7' }, statBlue: { backgroundColor: '#DBEAFE' }, statCopy: { flex: 1, minWidth: 0 }, statValue: { color: '#1E293B', fontSize: 14, fontWeight: '800' }, statLabel: { marginTop: 3, color: '#64748B', fontSize: 9 },
  searchBox: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 13, backgroundColor: '#FFFFFF' }, searchInput: { flex: 1, paddingVertical: 8, color: '#1E293B', fontSize: 12 }, filterLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, lowStockToggle: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20, backgroundColor: '#FFFFFF' }, lowStockToggleActive: { borderColor: '#FCD34D', backgroundColor: '#FFFBEB' }, lowStockText: { color: '#475569', fontSize: 10, fontWeight: '700' }, lowStockTextActive: { color: '#B45309' }, countBadge: { minWidth: 19, height: 19, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#F1F5F9' }, countText: { color: '#475569', fontSize: 9, fontWeight: '800' }, pageHint: { color: '#94A3B8', fontSize: 10 }, chipRow: { flexDirection: 'row', gap: 6, paddingVertical: 1 }, filterChip: { minHeight: 29, justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, backgroundColor: '#FFFFFF' }, filterChipActive: { borderColor: '#99F6E4', backgroundColor: '#CCFBF1' }, filterChipText: { color: '#475569', fontSize: 9, fontWeight: '600' }, filterChipTextActive: { color: '#0F766E', fontWeight: '800' },
  listHeader: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 3, borderBottomWidth: 1, borderColor: '#E2E8F0' }, listTitle: { color: '#1E293B', fontSize: 14, fontWeight: '800' }, cards: { gap: 10 }, card: { padding: 13, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 15, backgroundColor: '#FFFFFF', elevation: 1 }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 11 }, medicineIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#F0FDFA' }, cardTitleBlock: { flex: 1, minWidth: 0 }, medicineName: { color: '#1E293B', fontSize: 13, fontWeight: '800' }, medicineForm: { marginTop: 3, color: '#64748B', fontSize: 10 }, moreButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#F8FAFC' }, detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, infoTile: { width: '48%', minHeight: 58, justifyContent: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 11, backgroundColor: '#F8FAFC' }, infoLabel: { color: '#64748B', fontSize: 8, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }, infoValue: { color: '#1E293B', fontSize: 11, fontWeight: '700' }, statusPill: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 }, inStock: { backgroundColor: '#DCFCE7' }, lowStock: { backgroundColor: '#FEF3C7' }, outStock: { backgroundColor: '#FEE2E2' }, statusText: { color: '#15803D', fontSize: 9, fontWeight: '800' }, lowStatusText: { color: '#B45309' }, batchLine: { marginTop: 9, color: '#64748B', fontSize: 9 },
  loading: { minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 10 }, empty: { minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 15, backgroundColor: '#FFFFFF' }, emptyTitle: { color: '#1E293B', fontSize: 13, fontWeight: '800' }, permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 9, padding: 24 }, filePicker: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderWidth: 1, borderStyle: 'dashed', borderColor: '#5EEAD4', borderRadius: 12, backgroundColor: '#F0FDFA' }, filePickerText: { color: '#0F766E', fontSize: 11, fontWeight: '800' }, selectedFile: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, borderWidth: 1, borderColor: '#CCFBF1', borderRadius: 11, backgroundColor: '#F0FDFA' }, fileCopy: { flex: 1 }, fileName: { color: '#1E293B', fontSize: 10, fontWeight: '800' },
  menuBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, backgroundColor: 'rgba(15,23,42,0.32)' }, menuCard: { width: '100%', maxWidth: 300, padding: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 15, backgroundColor: '#FFFFFF', elevation: 12 }, menuTitle: { paddingHorizontal: 10, paddingVertical: 8, color: '#64748B', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }, menuAction: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, borderRadius: 10 }, menuActionText: { color: '#334155', fontSize: 12, fontWeight: '600' }, destructiveText: { color: '#EF4444' },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 12, backgroundColor: 'rgba(15,23,42,0.62)' }, modalShell: { width: '100%', maxWidth: 520, maxHeight: '94%' }, modalCard: { overflow: 'hidden', borderTopWidth: 3, borderTopColor: '#14B8A6', borderRadius: 17, backgroundColor: '#FFFFFF', elevation: 20 }, modalHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, borderBottomWidth: 1, borderColor: '#E2E8F0' }, modalHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 }, modalIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#CCFBF1' }, modalTitle: { color: '#1E293B', fontSize: 15, fontWeight: '800' }, closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }, formScroll: { flexGrow: 0, maxHeight: 590 }, formContent: { gap: 8, padding: 14, paddingBottom: 18 }, formSection: { marginBottom: 2, paddingBottom: 8, borderBottomWidth: 1, borderColor: '#E2E8F0', color: '#64748B', fontSize: 11, fontWeight: '800' }, field: { flex: 1, minWidth: 120, gap: 4 }, label: { marginBottom: 4, color: '#334155', fontSize: 10, fontWeight: '700' }, input: { minHeight: 40, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC', color: '#1E293B', fontSize: 11 }, focusedInput: { borderWidth: 2, borderColor: '#14B8A6' }, dateTrigger: { minHeight: 40, justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC' }, dateTriggerText: { color: '#334155', fontSize: 10 }, twoColumns: { flexDirection: 'row', gap: 9 }, formHint: { color: '#64748B', fontSize: 9, lineHeight: 14 }, modalFooter: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, paddingVertical: 9, borderTopWidth: 1, borderColor: '#E2E8F0' }, cancelButton: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC' }, cancelText: { color: '#334155', fontSize: 11, fontWeight: '700' }, saveButton: { flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 10, backgroundColor: '#0D9488' }, saveText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' }, disabledButton: { opacity: 0.65 }, stockSummary: { gap: 5, padding: 11, borderRadius: 11, backgroundColor: '#F0FDFA' }, stockMedicineName: { color: '#0F172A', fontSize: 12, fontWeight: '800' }, segmentRow: { gap: 8 }, segment: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 11, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#FFFFFF' }, segmentActive: { borderColor: '#5EEAD4', backgroundColor: '#F0FDFA' }, segmentText: { color: '#475569', fontSize: 11 }, segmentTextActive: { color: '#0F766E', fontWeight: '800' }, importError: { padding: 10, borderRadius: 9, backgroundColor: '#FEF2F2', color: '#B91C1C', fontSize: 11 }, importPreviewBox: { gap: 8, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC' }, importPreviewRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTopWidth: 1, borderColor: '#E2E8F0' },
});

export default PharmacyInventoryScreen;
