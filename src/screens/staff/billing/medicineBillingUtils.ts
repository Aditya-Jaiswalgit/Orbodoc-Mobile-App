import { ColumnOption } from '../../../components/common/ColumnSelectorModal';

export type MedicineBillLine = {
  medicine_id: number;
  medicine_name: string;
  batch_number?: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  tax_pct: number;
  total_price: number;
};

export type MedicineBill = {
  id: number;
  clinic_id: number;
  patient_id: number;
  patient_name?: string;
  patient_code?: string;
  patient_phone?: string;
  pharmacist_name?: string;
  bill_number?: string;
  prescription_id?: number;
  doctor_name?: string;
  appointment_id?: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_method?: string;
  status: string;
  notes?: string;
  created_at?: string;
  items?: MedicineBillLine[];
};

export type MedicineBillColumn =
  | 'bill_number'
  | 'patient_name'
  | 'phone'
  | 'patient_code'
  | 'total_amount'
  | 'paid_amount'
  | 'pending_amount'
  | 'status'
  | 'payment_method'
  | 'created_at'
  | 'doctor_name'
  | 'appointment_id';

export const PAGE_SIZE = 10;
export const MEDICINE_BILL_COLUMNS: ColumnOption<MedicineBillColumn>[] = [
  { key: 'bill_number', label: 'Bill Number', defaultVisible: true },
  { key: 'patient_name', label: 'Patient Name', defaultVisible: true },
  { key: 'phone', label: 'Patient Phone', defaultVisible: true },
  { key: 'patient_code', label: 'Patient Code', defaultVisible: false },
  { key: 'total_amount', label: 'Total Amount', defaultVisible: true },
  { key: 'paid_amount', label: 'Paid Amount', defaultVisible: false },
  { key: 'pending_amount', label: 'Balance Due', defaultVisible: false },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'payment_method', label: 'Payment Method', defaultVisible: true },
  { key: 'created_at', label: 'Date', defaultVisible: true },
  { key: 'doctor_name', label: 'Doctor', defaultVisible: false },
  { key: 'appointment_id', label: 'Appointment ID', defaultVisible: false },
];
export const DEFAULT_MEDICINE_BILL_COLUMNS = Object.fromEntries(
  MEDICINE_BILL_COLUMNS.map(column => [column.key, column.defaultVisible]),
) as Record<MedicineBillColumn, boolean>;
export const BILL_STATUS_OPTIONS = [
  'all',
  'pending',
  'partial',
  'paid',
  'cancelled',
];

export function formatMedicineBillMoney(value: unknown): string {
  return `\u20B9${(Number(value) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function medicineBillStatus(bill: MedicineBill): string {
  const status = String(bill.status || 'pending').toLowerCase();
  return status === 'partially_paid' ? 'partial' : status;
}

export function medicineBillLineTotal(line: MedicineBillLine): number {
  const base =
    Math.max(0, Number(line.quantity) || 0) *
    Math.max(0, Number(line.unit_price) || 0);
  const discounted =
    base *
    (1 - Math.min(100, Math.max(0, Number(line.discount_pct) || 0)) / 100);
  return (
    Math.round(
      discounted * (1 + Math.max(0, Number(line.tax_pct) || 0) / 100) * 100,
    ) / 100
  );
}

export function formatMedicineBillDate(value?: string): string {
  if (!value) return '\u2014';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '\u2014';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function unwrapList<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== 'object') return [];
  const data = value as Record<string, unknown>;
  const candidates = [data.data, data.patients, data.medicines];
  return (candidates.find(Array.isArray) as T[] | undefined) ?? [];
}
