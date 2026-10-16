import { normalizeRoleName } from '../../../utils/rolePermissions';
import type { StaffRecord } from '../../../api/userManagementApi';
import type { UserClinic } from '../../../types/auth';

export interface UserItem {
  id: string;
  role_id?: number;
  clinic_id?: number;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  clinic_name: string;
  role: string;
  is_doctor: boolean;
  status: 'Active' | 'Inactive';
  created_at: string;
  department?: string;
  specialization?: string;
  qualification?: string;
  registration_number?: string;
  experience?: string;
  consultation_fee?: string;
  available_days?: string;
  address?: string;
}

export type StaffApiRecord = StaffRecord;

export interface ClinicOption {
  id?: string | number;
  clinic_id?: string | number;
  name?: string;
  clinic_name?: string;
}

export function normalizeClinicOption(value: unknown): ClinicOption {
  const record = value !== null && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
  const id = record.id;
  const clinicId = record.clinic_id;
  return {
    id: typeof id === 'string' || typeof id === 'number' ? id : undefined,
    clinic_id: typeof clinicId === 'string' || typeof clinicId === 'number' ? clinicId : undefined,
    name: typeof record.name === 'string' ? record.name : undefined,
    clinic_name: typeof record.clinic_name === 'string' ? record.clinic_name : undefined,
  };
}

export function normalizeAssignedClinic(clinic: UserClinic): ClinicOption {
  return { id: clinic.id, name: clinic.name };
}

const firstText = (...values: unknown[]): string => {
  const value = values.find(item => item !== undefined && item !== null && String(item).trim() !== '');
  return value === undefined ? '' : String(value);
};

export function formatRoleTitle(value: string): string {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
}

export function formatCreatedAt(value?: string): string {
  if (!value) return '\u2014';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '\u2014';
  return date.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function mapStaffApiRecord(staff: StaffApiRecord, activeClinicName = ''): UserItem {
  const rawRole = firstText(staff.role, staff.role_name, staff.user_role, staff.roleName);
  const nestedClinic = staff.clinic !== null && typeof staff.clinic === 'object'
    ? staff.clinic as Record<string, unknown>
    : undefined;
  const clinicName = firstText(staff.clinic_name, staff.clinicName, nestedClinic?.name, activeClinicName);
  const id = firstText(staff.id, staff.user_id);
  const roleId = Number(staff.role_id);
  const clinicId = staff.clinic_id == null ? undefined : Number(staff.clinic_id);
  const isInactive = Number(staff.is_active) === 0 || staff.status === 'Inactive';

  return {
    id,
    role_id: Number.isFinite(roleId) ? roleId : undefined,
    clinic_id: clinicId != null && Number.isFinite(clinicId) ? clinicId : undefined,
    user_id: firstText(staff.user_id, staff.id),
    full_name: firstText(staff.full_name, staff.name, staff.first_name) || 'User Account',
    email: firstText(staff.email),
    phone: firstText(staff.phone, staff.mobile),
    clinic_name: clinicName,
    role: formatRoleTitle(rawRole),
    is_doctor: Number(staff.is_doctor) === 1 || normalizeRoleName(rawRole) === 'doctor',
    status: isInactive ? 'Inactive' : 'Active',
    created_at: firstText(staff.created_at, staff.createdAt),
    department: firstText(staff.department),
    specialization: firstText(staff.specialization),
    qualification: firstText(staff.qualification),
    registration_number: firstText(staff.registration_number),
    experience: staff.experience_years == null ? '' : String(staff.experience_years),
    consultation_fee: staff.consultation_fee ? String(staff.consultation_fee) : '0.00',
    available_days: firstText(staff.available_days),
    address: firstText(staff.address),
  };
}
