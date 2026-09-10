import type { AuthUser } from '../types/auth';

export type MobileMenuItem = {
  id: string;
  label: string;
  objectName?: string;
};

type PermissionMap = Record<string, Record<string, unknown>>;

const normalize = (value?: string | null) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const sharedClinicMenu: MobileMenuItem[] = [
  { id: 'patients', label: 'Patients', objectName: 'patients' },
  { id: 'appointments', label: 'Appointments', objectName: 'appointments' },
  { id: 'video_services', label: 'Video Services', objectName: 'video service' },
  { id: 'treatment_billing', label: 'Treatment Billing', objectName: 'treatment_bills' },
  { id: 'medicine_billing', label: 'Medicine Billing', objectName: 'medicine_bills' },
  { id: 'pharmacy_inventory', label: 'Medicines', objectName: 'medicines' },
  { id: 'lab_management', label: 'Lab Tests & Reports', objectName: 'lab_tests' },
  { id: 'lab_inventory', label: 'Lab Inventory', objectName: 'lab_tests' },
];

const menusByRole: Record<string, MobileMenuItem[]> = {
  clinic_admin: [
    { id: 'dashboard', label: 'Admin Dashboard' },
    { id: 'clinics', label: 'Clinic Management', objectName: 'clinics' },
    { id: 'staff', label: 'User & Role Management', objectName: 'staff_users' },
    ...sharedClinicMenu,
    { id: 'notifications', label: 'Notifications', objectName: 'notifications' },
    { id: 'audit_logs', label: 'Audit Logs', objectName: 'audit_logs' },
  ],
  doctor: [
    { id: 'dashboard', label: 'Doctor Dashboard' },
    ...sharedClinicMenu,
    { id: 'prescriptions', label: 'Prescriptions', objectName: 'prescriptions' },
    { id: 'notifications', label: 'Notifications', objectName: 'notifications' },
  ],
  receptionist: [
    { id: 'dashboard', label: 'Reception Dashboard' },
    { id: 'book_appointment', label: 'Book Appointment', objectName: 'appointments' },
    ...sharedClinicMenu,
    { id: 'notifications', label: 'Notifications', objectName: 'notifications' },
  ],
  pharmacist: [
    { id: 'dashboard', label: 'Pharmacist Dashboard' },
    { id: 'medicine_billing', label: 'Medicine Billing', objectName: 'medicine_bills' },
    { id: 'pharmacy_inventory', label: 'Medicines', objectName: 'medicines' },
    { id: 'notifications', label: 'Notifications', objectName: 'notifications' },
  ],
  lab_technician: [
    { id: 'dashboard', label: 'Lab Dashboard' },
    { id: 'lab_management', label: 'Lab Management', objectName: 'lab_profile' },
    { id: 'lab_inventory', label: 'Lab Inventory', objectName: 'lab_tests' },
    { id: 'patients', label: 'Patients', objectName: 'patients' },
    { id: 'treatment_billing', label: 'Treatment Billing', objectName: 'treatment_bills' },
    { id: 'medicine_billing', label: 'Medicine Billing', objectName: 'medicine_bills' },
    { id: 'notifications', label: 'Notifications', objectName: 'notifications' },
  ],
  accountant: [
    { id: 'dashboard', label: 'Accounts Dashboard' },
    { id: 'treatment_billing', label: 'Treatment Billing', objectName: 'treatment_bills' },
    { id: 'medicine_billing', label: 'Medicine Billing', objectName: 'medicine_bills' },
    { id: 'pharmacy_inventory', label: 'Medicines', objectName: 'medicines' },
    { id: 'notifications', label: 'Notifications', objectName: 'notifications' },
  ],
  nurse: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'patients', label: 'Patients', objectName: 'patients' },
    { id: 'appointments', label: 'Appointments', objectName: 'appointments' },
    { id: 'book_appointment', label: 'Book Appointment', objectName: 'appointments' },
    { id: 'treatment_billing', label: 'Treatment Billing', objectName: 'treatment_bills' },
    { id: 'medicine_billing', label: 'Medicine Billing', objectName: 'medicine_bills' },
    { id: 'lab_management', label: 'Lab Tests & Reports', objectName: 'lab_tests' },
    { id: 'notifications', label: 'Notifications', objectName: 'notifications' },
  ],
  patient: [
    { id: 'dashboard', label: 'Patient Dashboard' },
    { id: 'book_appointment', label: 'Book Appointment', objectName: 'appointments' },
    // Same label/order as the web role navigation. This opens the patient's
    // own profile, not another patient's data.
    { id: 'patients', label: 'Patients', objectName: 'patients' },
    { id: 'appointments', label: 'Appointments', objectName: 'appointments' },
    { id: 'treatment_billing', label: 'Treatment Billing', objectName: 'treatment_bills' },
    { id: 'medicine_billing', label: 'Medicine Billing', objectName: 'medicine_bills' },
    { id: 'video_services', label: 'Video Services', objectName: 'video service' },
    { id: 'lab_tests', label: 'Lab Tests', objectName: 'lab_tests' },
    { id: 'notifications', label: 'Notifications', objectName: 'notifications' },
  ],
};

const superAdminMenu: MobileMenuItem[] = [
  { id: 'dashboard', label: 'Super Admin Dashboard' },
  { id: 'clinics', label: 'Clinic Management', objectName: 'clinics' },
  { id: 'staff', label: 'User & Role Management', objectName: 'staff_users' },
  ...sharedClinicMenu,
  { id: 'prescriptions', label: 'Prescriptions', objectName: 'prescriptions' },
  { id: 'notifications', label: 'Notifications', objectName: 'notifications' },
  { id: 'audit_logs', label: 'Audit Logs', objectName: 'audit_logs' },
];

export const getMobileRole = (user: AuthUser | null): string => {
  const rawRole = normalize(user?.roleName || user?.role_name || user?.role);
  const roleId = Number(user?.roleId || user?.role_id || 0);
  if (roleId === 1 || rawRole === 'super_admin' || rawRole === 'superadmin') return 'super_admin';
  if (roleId === 2 || rawRole.includes('clinic_admin') || rawRole === 'admin') return 'clinic_admin';
  if (roleId === 3 || rawRole.includes('doctor') || rawRole.includes('physician')) return 'doctor';
  if (roleId === 4 || rawRole.includes('reception')) return 'receptionist';
  if (roleId === 5 || rawRole.includes('pharmacist')) return 'pharmacist';
  if (roleId === 6 || rawRole.includes('lab')) return 'lab_technician';
  if (roleId === 7 || rawRole.includes('account')) return 'accountant';
  if (roleId === 8 || rawRole.includes('nurse')) return 'nurse';
  return rawRole || 'clinic_admin';
};

const canAccessObject = (permissions: PermissionMap, objectName?: string) => {
  if (!objectName) return true;
  const entries = Object.entries(permissions || {});
  if (!entries.length) return true;
  const expected = normalize(objectName);
  const permission = entries.find(([name]) => normalize(name) === expected)?.[1];
  if (!permission) return false;
  return Object.values(permission).some((value) => value === true || value === 1 || value === '1');
};

export const getMobileMenuItems = (
  role: string,
  permissions: PermissionMap = {},
): MobileMenuItem[] => {
  const menu = role === 'super_admin'
    ? superAdminMenu
    : menusByRole[role] || menusByRole.clinic_admin;

  return menu.filter((item) =>
    role === 'super_admin' || canAccessObject(permissions, item.objectName),
  );
};
