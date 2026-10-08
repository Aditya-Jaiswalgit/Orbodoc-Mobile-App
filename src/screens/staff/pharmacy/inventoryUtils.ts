import { ColumnOption } from '../../../components/common/ColumnSelectorModal';
import { Medicine } from '../../../types/clinicTypes';

export type MedicineFormState = {
  name: string;
  generic_name: string;
  manufacturer: string;
  category: string;
  form: string;
  unit_price: string;
  stock_quantity: string;
  reorder_level: string;
  expiry_date: string;
  batch_number: string;
  hsn_code: string;
  gst_percent: string;
};
export type MedicineMenuState = {
  medicine: Medicine;
  top: number;
  left: number;
} | null;
export type PickedMedicineFile = { uri: string; name: string; type: string };
export type MedicineImportPreview = {
  rows: Array<{
    rowNumber: number;
    name: string;
    batch: string;
    valid: boolean;
    action: 'insert' | 'update' | 'skip';
    issue?: string;
  }>;
  total: number;
  inserts: number;
  updates: number;
  invalid: number;
  error?: string;
};

export const INVENTORY_COLUMN_OPTIONS: ReadonlyArray<ColumnOption<string>> = [
  { key: 'id', label: 'ID', defaultVisible: false },
  { key: 'medicine', label: 'Medicine', defaultVisible: true },
  { key: 'generic', label: 'Generic', defaultVisible: false },
  { key: 'manufacturer', label: 'Manufacturer', defaultVisible: false },
  { key: 'category', label: 'Category', defaultVisible: true },
  { key: 'form', label: 'Form', defaultVisible: false },
  { key: 'unit_price', label: 'Unit Price', defaultVisible: true },
  { key: 'stock_qty', label: 'Stock Qty', defaultVisible: true },
  { key: 'reorder_level', label: 'Reorder Level', defaultVisible: false },
  { key: 'batch', label: 'Batch', defaultVisible: false },
  { key: 'expiry', label: 'Expiry', defaultVisible: true },
  { key: 'gst', label: 'GST %', defaultVisible: false },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'actions', label: 'Actions', defaultVisible: true },
];
export type MedicineColumnKey =
  (typeof INVENTORY_COLUMN_OPTIONS)[number]['key'];
export const DEFAULT_INVENTORY_COLUMNS = Object.fromEntries(
  INVENTORY_COLUMN_OPTIONS.map(column => [column.key, column.defaultVisible]),
) as Record<MedicineColumnKey, boolean>;
export const INVENTORY_PAGE_SIZE = 10;
export const EMPTY_MEDICINE_FORM: MedicineFormState = {
  name: '',
  generic_name: '',
  manufacturer: '',
  category: '',
  form: '',
  unit_price: '',
  stock_quantity: '0',
  reorder_level: '10',
  expiry_date: '',
  batch_number: '',
  hsn_code: '',
  gst_percent: '0',
};

export function numberOrZero(value: unknown): number {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export function medicineStockStatus(
  medicine: Medicine,
): 'Out of Stock' | 'Low Stock' | 'In Stock' {
  if (medicine.stock_quantity <= 0) return 'Out of Stock';
  return medicine.stock_quantity <= medicine.reorder_level
    ? 'Low Stock'
    : 'In Stock';
}

export function formatExpiryDate(value?: string | null): string {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(date);
}

export function medicineToForm(medicine: Medicine): MedicineFormState {
  return {
    name: medicine.name || '',
    generic_name: medicine.generic_name || '',
    manufacturer: medicine.manufacturer || '',
    category: medicine.category || '',
    form: medicine.form || '',
    unit_price: String(medicine.unit_price ?? ''),
    stock_quantity: String(medicine.stock_quantity ?? 0),
    reorder_level: String(medicine.reorder_level ?? 10),
    expiry_date: String(medicine.expiry_date || '').split('T')[0],
    batch_number: medicine.batch_number || '',
    hsn_code: medicine.hsn_code || '',
    gst_percent: String(medicine.gst_percent ?? 0),
  };
}
