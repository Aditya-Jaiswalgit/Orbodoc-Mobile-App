import { PatientModel } from '../../../types/clinicTypes';
import { ColumnOption } from '../../../components/common/ColumnSelectorModal';

export type PatientColumn =
  | 'patientCode'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'gender'
  | 'dateOfBirth'
  | 'age'
  | 'bloodGroup'
  | 'address'
  | 'city'
  | 'state'
  | 'emergencyContact'
  | 'emergencyContactName'
  | 'registrationDate'
  | 'status'
  | 'actions';

export const PAGE_SIZE_OPTIONS = [10, 20, 50];

export const PATIENT_COLUMN_OPTIONS: ColumnOption<PatientColumn>[] = [
  { key: 'patientCode', label: 'Patient Code', defaultVisible: true },
  { key: 'fullName', label: 'Full Name', defaultVisible: true },
  { key: 'email', label: 'Email', defaultVisible: false },
  { key: 'phone', label: 'Phone', defaultVisible: true },
  { key: 'gender', label: 'Gender', defaultVisible: true },
  { key: 'dateOfBirth', label: 'Date of Birth', defaultVisible: false },
  { key: 'age', label: 'Age', defaultVisible: false },
  { key: 'bloodGroup', label: 'Blood Group', defaultVisible: true },
  { key: 'address', label: 'Address', defaultVisible: false },
  { key: 'city', label: 'City', defaultVisible: false },
  { key: 'state', label: 'State', defaultVisible: false },
  {
    key: 'emergencyContact',
    label: 'Emergency Contact',
    defaultVisible: false,
  },
  {
    key: 'emergencyContactName',
    label: 'Emergency Contact Name',
    defaultVisible: false,
  },
  { key: 'registrationDate', label: 'Registration Date', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'actions', label: 'Actions', defaultVisible: true },
];

export const DEFAULT_PATIENT_COLUMNS = Object.fromEntries(
  PATIENT_COLUMN_OPTIONS.map(column => [
    column.key,
    column.defaultVisible ?? true,
  ]),
) as Record<PatientColumn, boolean>;

export function extractPatient(data: unknown): PatientModel | null {
  if (!data || typeof data !== 'object') return null;
  const payload = data as Record<string, unknown>;
  const candidate = payload.patient ?? (Array.isArray(data) ? data[0] : data);
  return candidate && typeof candidate === 'object'
    ? (candidate as PatientModel)
    : null;
}

export function calculateAge(dob: string): number | undefined {
  if (!dob) return undefined;
  const date = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  if (
    now.getMonth() < date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 ? age : undefined;
}

export function formatPatientDate(value?: string | null): string {
  if (!value) return '\u2014';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
}

export function toFilterDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
}
