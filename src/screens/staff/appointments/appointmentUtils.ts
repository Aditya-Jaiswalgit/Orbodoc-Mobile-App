import { ColumnOption } from '../../../components/common/ColumnSelectorModal';
import { Appointment } from '../../../types/clinicTypes';

export type AppointmentFilter = 'all' | Appointment['status'];
export type AppointmentColumn =
  | 'patient'
  | 'phone'
  | 'patientCode'
  | 'doctor'
  | 'date'
  | 'time'
  | 'clinic'
  | 'specialization'
  | 'reason'
  | 'notes'
  | 'duration'
  | 'mode'
  | 'status'
  | 'actions'
  | 'share';

export const PAGE_SIZE_OPTIONS = [10, 20, 50];
export const APPOINTMENT_COLUMNS: ColumnOption<AppointmentColumn>[] = [
  { key: 'patient', label: 'Patient', defaultVisible: true },
  { key: 'phone', label: 'Phone No', defaultVisible: true },
  { key: 'patientCode', label: 'Patient Code', defaultVisible: false },
  { key: 'doctor', label: 'Doctor', defaultVisible: true },
  { key: 'date', label: 'Date', defaultVisible: true },
  { key: 'time', label: 'Time', defaultVisible: true },
  { key: 'mode', label: 'Consultation Mode', defaultVisible: true },
  { key: 'clinic', label: 'Clinic', defaultVisible: false },
  { key: 'specialization', label: 'Specialization', defaultVisible: false },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'reason', label: 'Reason', defaultVisible: true },
  { key: 'notes', label: 'Notes', defaultVisible: false },
  { key: 'duration', label: 'Duration', defaultVisible: false },
  { key: 'actions', label: 'Actions', defaultVisible: true },
  { key: 'share', label: 'Share', defaultVisible: false },
];
export const DEFAULT_COLUMNS = Object.fromEntries(
  APPOINTMENT_COLUMNS.map(column => [column.key, column.defaultVisible]),
) as Record<AppointmentColumn, boolean>;

export function extractRows<T>(value: unknown, key: string): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== 'object') return [];
  const data = value as Record<string, unknown>;
  if (Array.isArray(data.data)) return data.data as T[];
  if (Array.isArray(data[key])) return data[key] as T[];
  return [];
}

export function dateOnly(value?: string): string {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value.slice(0, 10)
    : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(
        2,
        '0',
      )}-${String(parsed.getDate()).padStart(2, '0')}`;
}

export function localDateOnly(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

export function prettyDate(value?: string): string {
  if (!value) return 'Date not set';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

export function statusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

export const STATUS_OPTIONS: Array<{
  value: AppointmentFilter;
  label: string;
}> = [
  { value: 'all', label: 'All Status' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];
