import { Dispatch, MutableRefObject, SetStateAction, useState } from 'react';
import { Alert, NativeModules, Platform } from 'react-native';
import {
  adjustMedicineStockApi,
  createMedicineApi,
  deleteMedicineApi,
  getExistingMedicineBatchesApi,
  MedicinePayload,
  updateMedicineApi,
  uploadMedicinesExcelApi,
} from '../api/medicineApi';
import { Medicine } from '../types/clinicTypes';
import { showErrorToast, showSuccessToast } from '../utils/toast';
import {
  EMPTY_MEDICINE_FORM,
  medicineToForm,
  MedicineFormState,
  MedicineImportPreview,
  MedicineMenuState,
  PickedMedicineFile,
} from '../screens/staff/pharmacy/inventoryUtils';

export type MedicineActionAnchor = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

type Params = {
  token: string | null;
  clinicId: number | string | null;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  screenWidth: number;
  screenHeight: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  actionButtonRefs: MutableRefObject<
    Record<number, MedicineActionAnchor | null>
  >;
};

export function useMedicineInventoryActions({
  token,
  clinicId,
  canAdd,
  canEdit,
  canDelete,
  screenWidth,
  screenHeight,
  setCurrentPage,
  actionButtonRefs,
}: Params) {
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [menu, setMenu] = useState<MedicineMenuState>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(
    null,
  );
  const [form, setForm] = useState<MedicineFormState>(EMPTY_MEDICINE_FORM);
  const [stockVisible, setStockVisible] = useState(false);
  const [stockType, setStockType] = useState<'add' | 'remove'>('add');
  const [stockQuantity, setStockQuantity] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [importVisible, setImportVisible] = useState(false);
  const [pickedFile, setPickedMedicineFile] =
    useState<PickedMedicineFile | null>(null);
  const [importPreview, setMedicineImportPreview] =
    useState<MedicineImportPreview | null>(null);

  const setField = (key: keyof MedicineFormState, value: string) =>
    setForm(previous => ({ ...previous, [key]: value }));

  const openAdd = () => {
    if (!canAdd) return;
    setFormMode('add');
    setSelectedMedicine(null);
    setForm(EMPTY_MEDICINE_FORM);
    setFocusedField(null);
    setFormVisible(true);
  };
  const openEdit = (medicine: Medicine) => {
    if (!canEdit) return;
    setMenu(null);
    setSelectedMedicine(medicine);
    setForm(medicineToForm(medicine));
    setFormMode('edit');
    setFocusedField(null);
    setFormVisible(true);
  };
  const openStock = (medicine: Medicine) => {
    if (!canEdit) return;
    setMenu(null);
    setSelectedMedicine(medicine);
    setStockType('add');
    setStockQuantity('');
    setStockVisible(true);
  };

  const openMedicineMenu = (medicine: Medicine) => {
    const anchor = actionButtonRefs.current[medicine.id];
    anchor?.measureInWindow(
      (x: number, y: number, width: number, height: number) => {
        const menuWidth = Math.min(190, screenWidth - 24);
        const menuHeight = canEdit && canDelete ? 142 : 94;
        const left = Math.max(
          12,
          Math.min(x + width - menuWidth, screenWidth - menuWidth - 12),
        );
        const below = y + height + 4;
        const top =
          below + menuHeight <= screenHeight - 12
            ? below
            : Math.max(12, y - menuHeight - 4);
        setMenu({ medicine, top, left });
      },
    );
  };

  const buildPayload = (): MedicinePayload => ({
    ...(formMode === 'add' && clinicId ? { clinic_id: clinicId } : {}),
    name: form.name.trim(),
    generic_name: form.generic_name.trim(),
    manufacturer: form.manufacturer.trim(),
    category: form.category.trim(),
    form: form.form.trim(),
    unit_price: Number(form.unit_price),
    stock_quantity: Number(form.stock_quantity),
    reorder_level: Number(form.reorder_level),
    expiry_date: form.expiry_date.trim(),
    batch_number: form.batch_number.trim(),
    gst_percent: Number(form.gst_percent || 0),
  });

  const saveMedicine = async () => {
    if (!token) return;
    if ((formMode === 'add' && !canAdd) || (formMode === 'edit' && !canEdit))
      return;
    const required = [
      form.name,
      form.manufacturer,
      form.category,
      form.batch_number,
      form.expiry_date,
      form.unit_price,
      form.stock_quantity,
      form.reorder_level,
    ];
    const price = Number(form.unit_price);
    const gst = Number(form.gst_percent || 0);
    const stock = Number(form.stock_quantity);
    const reorderLevel = Number(form.reorder_level);
    if (
      required.some(value => !value.trim()) ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(stock) ||
      stock < 0 ||
      !Number.isFinite(reorderLevel) ||
      reorderLevel < 0 ||
      !Number.isFinite(gst) ||
      gst < 0 ||
      gst > 100
    ) {
      showErrorToast(
        'Check the medicine details',
        'Complete all required fields. Enter a price greater than zero and valid non-negative stock and reorder values. GST must be from 0 to 100.',
      );
      return;
    }
    if (form.expiry_date && Number.isNaN(Date.parse(form.expiry_date))) {
      showErrorToast(
        'Invalid expiry date',
        'Enter the date in YYYY-MM-DD format.',
      );
      return;
    }
    setSaving(true);
    const response =
      formMode === 'add'
        ? await createMedicineApi(token, buildPayload())
        : selectedMedicine
        ? await updateMedicineApi(token, selectedMedicine.id, buildPayload())
        : null;
    setSaving(false);
    if (!response?.success) {
      showErrorToast(
        'Could not save medicine',
        response?.message || 'Please try again.',
      );
      return;
    }
    setFormVisible(false);
    setRefreshKey(value => value + 1);
    showSuccessToast(
      formMode === 'add' ? 'Medicine added' : 'Medicine updated',
      `${form.name.trim()} was saved successfully.`,
    );
  };

  const saveStock = async () => {
    if (!token || !selectedMedicine || !canEdit) return;
    const quantity = Number(stockQuantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      showErrorToast(
        'Invalid quantity',
        'Enter a whole number greater than zero.',
      );
      return;
    }
    if (stockType === 'remove' && quantity > selectedMedicine.stock_quantity) {
      showErrorToast(
        'Insufficient stock',
        'The quantity to remove cannot exceed the available stock.',
      );
      return;
    }
    setSaving(true);
    const response = await adjustMedicineStockApi(
      token,
      selectedMedicine.id,
      quantity,
      stockType,
    );
    setSaving(false);
    if (!response.success) {
      showErrorToast('Stock update failed', response.message);
      return;
    }
    setStockVisible(false);
    setRefreshKey(value => value + 1);
    showSuccessToast(
      'Stock updated',
      `${selectedMedicine.name} stock was ${
        stockType === 'add' ? 'increased' : 'reduced'
      }.`,
    );
  };

  const confirmDelete = (medicine: Medicine) => {
    if (!canDelete) return;
    setMenu(null);
    Alert.alert(
      'Delete medicine?',
      `This will deactivate ${medicine.name} in the clinic inventory.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!token || !canDelete) return;
            const response = await deleteMedicineApi(token, medicine.id);
            if (!response.success) {
              showErrorToast('Delete failed', response.message);
              return;
            }
            setRefreshKey(value => value + 1);
            showSuccessToast(
              'Medicine deleted',
              `${medicine.name} was deactivated.`,
            );
          },
        },
      ],
    );
  };

  const chooseImportFile = async () => {
    if (!canAdd) return;
    if (Platform.OS !== 'android') {
      showErrorToast(
        'Import unavailable',
        'Medicine spreadsheet import is currently supported on Android only.',
      );
      return;
    }
    try {
      const file = await NativeModules.MedicineFilePicker?.pickExcel();
      if (!file) return;
      const extension = String(file.name).split('.').pop()?.toLowerCase();
      if (!['xlsx', 'csv'].includes(extension || '')) {
        showErrorToast(
          'Unsupported file',
          'Choose an .xlsx workbook or .csv file. Legacy .xls files are not supported on mobile.',
        );
        return;
      }
      const picked = {
        ...file,
        type:
          file.type === 'application/octet-stream'
            ? extension === 'csv'
              ? 'text/csv'
              : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : file.type,
      };
      setPickedMedicineFile(picked);
      setMedicineImportPreview(null);
      const matrix: string[][] =
        await NativeModules.MedicineFilePicker?.readSpreadsheet(file.uri);
      if (!Array.isArray(matrix) || matrix.length === 0)
        throw new Error('The spreadsheet does not contain any rows.');
      const requiredColumns = [
        'name',
        'generic_name',
        'manufacturer',
        'category',
        'unit_price',
        'stock_quantity',
        'reorder_level',
        'expiry_date',
        'batch_number',
      ];
      const headers = (matrix[0] || []).map(value =>
        String(value || '')
          .replace(/^\uFEFF/, '')
          .trim(),
      );
      const missing = requiredColumns.filter(
        column => !headers.includes(column),
      );
      const rows = matrix
        .slice(1)
        .map((cells, index) => {
          const values = Object.fromEntries(
            requiredColumns.map(column => [
              column,
              String(cells[headers.indexOf(column)] || '').trim(),
            ]),
          );
          const issue = !values.name
            ? 'Medicine name missing'
            : !values.batch_number
            ? 'Batch number missing'
            : undefined;
          return {
            rowNumber: index + 2,
            name: values.name,
            batch: values.batch_number,
            valid: !issue,
            action: issue ? ('skip' as const) : ('insert' as const),
            issue,
          };
        })
        .filter(row => row.name || row.batch);
      const preview: MedicineImportPreview = {
        rows,
        total: rows.length,
        inserts: rows.filter(row => row.valid).length,
        updates: 0,
        invalid: rows.filter(row => !row.valid).length,
      };
      if (missing.length)
        preview.error = `Missing required columns: ${missing.join(', ')}`;
      else if (!rows.length)
        preview.error = 'No medicine rows were found in this file.';
      else if (!preview.inserts)
        preview.error = 'Every row is missing a medicine name or batch number.';
      else if (clinicId && token) {
        const response = await getExistingMedicineBatchesApi(
          token,
          clinicId,
          rows.filter(row => row.valid).map(row => row.batch),
        );
        if (!response.success)
          throw new Error(
            response.message || 'Could not check existing batch numbers.',
          );
        const existing = new Set(
          (response.data?.existingBatchNumbers || []).map(value =>
            value.trim().toLowerCase(),
          ),
        );
        const seen = new Set<string>();
        preview.rows = rows.map(row => {
          if (!row.valid) return row;
          const key = row.batch.trim().toLowerCase();
          const action =
            existing.has(key) || seen.has(key)
              ? ('update' as const)
              : ('insert' as const);
          seen.add(key);
          return { ...row, action };
        });
        preview.inserts = preview.rows.filter(
          row => row.action === 'insert',
        ).length;
        preview.updates = preview.rows.filter(
          row => row.action === 'update',
        ).length;
      }
      setMedicineImportPreview(preview);
      if (preview.error)
        showErrorToast('Import file needs attention', preview.error);
    } catch (error: any) {
      showErrorToast(
        'File selection failed',
        error?.message || 'Could not select the inventory file.',
      );
    }
  };

  const uploadImport = async () => {
    if (
      !token ||
      !clinicId ||
      !pickedFile ||
      !importPreview ||
      importPreview.error ||
      importPreview.inserts + importPreview.updates === 0 ||
      !canAdd
    )
      return;
    setSaving(true);
    const response = await uploadMedicinesExcelApi(token, clinicId, pickedFile);
    setSaving(false);
    if (!response.success) {
      showErrorToast('Import failed', response.message);
      return;
    }
    setImportVisible(false);
    setPickedMedicineFile(null);
    setMedicineImportPreview(null);
    setCurrentPage(1);
    setRefreshKey(value => value + 1);
    showSuccessToast(
      'Import completed',
      response.message || 'Medicine inventory was imported.',
    );
  };
  return {
    saving,
    setSaving,
    refreshKey,
    setRefreshKey,
    menu,
    setMenu,
    formVisible,
    setFormVisible,
    formMode,
    setFormMode,
    selectedMedicine,
    setSelectedMedicine,
    form,
    setForm,
    stockVisible,
    setStockVisible,
    stockType,
    setStockType,
    stockQuantity,
    setStockQuantity,
    focusedField,
    setFocusedField,
    importVisible,
    setImportVisible,
    pickedFile,
    setPickedFile: setPickedMedicineFile,
    importPreview,
    setImportPreview: setMedicineImportPreview,
    setField,
    openAdd,
    openEdit,
    openStock,
    openMedicineMenu,
    saveMedicine,
    saveStock,
    confirmDelete,
    chooseImportFile,
    uploadImport,
  };
}
