import { ColumnOption } from '../../../components/common/ColumnSelectorModal';
import { TreatmentBill } from '../../../types/clinicTypes';

export const TREATMENT_STATUS_OPTIONS = [
  { key: 'all', label: 'All Status' },
  { key: 'pending', label: 'Pending' },
  { key: 'partial', label: 'Partially Paid' },
  { key: 'paid', label: 'Paid' },
  { key: 'cancelled', label: 'Cancelled' },
];

export const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'upi', label: 'UPI' },
  { key: 'card', label: 'Card' },
  { key: 'net_banking', label: 'Net Banking' },
  { key: 'cheque', label: 'Cheque' },
];

export type BillColumn =
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

export const TREATMENT_BILL_COLUMNS: Array<ColumnOption<BillColumn>> = [
  { key: 'bill_number', label: 'Bill Number', defaultVisible: true },
  { key: 'patient_name', label: 'Patient Name', defaultVisible: true },
  { key: 'phone', label: 'Patient Phone', defaultVisible: true },
  { key: 'total_amount', label: 'Total Amount', defaultVisible: true },
  { key: 'paid_amount', label: 'Paid Amount', defaultVisible: false },
  { key: 'pending_amount', label: 'Balance Due', defaultVisible: false },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'payment_method', label: 'Payment Method', defaultVisible: true },
  { key: 'created_at', label: 'Date', defaultVisible: true },
  { key: 'patient_code', label: 'Patient Code', defaultVisible: false },
  { key: 'doctor_name', label: 'Doctor', defaultVisible: false },
  { key: 'appointment_id', label: 'Appointment ID', defaultVisible: false },
];

export const DEFAULT_TREATMENT_BILL_COLUMNS: Record<BillColumn, boolean> = {
  bill_number: true,
  patient_name: true,
  phone: true,
  patient_code: false,
  total_amount: true,
  paid_amount: false,
  pending_amount: false,
  status: true,
  payment_method: true,
  created_at: true,
  doctor_name: false,
  appointment_id: false,
};

export function formatCurrency(amount: number | string | undefined): string {
  const value = Number(amount) || 0;
  return `\u20B9${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '\u2014';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function capitalize(value: string): string {
  if (!value) return '\u2014';
  if (value.toLowerCase() === 'upi') return 'Upi';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function normalizeBillStatus(
  bill: TreatmentBill,
): 'paid' | 'partial' | 'pending' | 'cancelled' {
  const status = String(bill.status || bill.payment_status || '')
    .toLowerCase()
    .trim();
  if (status === 'paid') return 'paid';
  if (status === 'partial' || status === 'partially_paid') return 'partial';
  if (status === 'cancelled') return 'cancelled';
  return 'pending';
}
