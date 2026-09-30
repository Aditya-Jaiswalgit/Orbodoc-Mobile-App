import { normalizeObjectName, PermissionAction, PermissionMap } from '../utils/rolePermissions';

const screenObjects: Record<string, string[]> = {
  clinics: ['clinics', 'clinic_management'],
  staff: ['staff_users', 'user_management'],
  role_permissions: ['staff_users', 'user_management'],
  patients: ['patients', 'my_patients'],
  appointments: ['appointments'],
  book_appointment: ['appointments'],
  prescriptions: ['prescriptions'],
  pharmacy_inventory: ['medicines'],
  medicine_billing: ['medicine_bills'],
  treatment_billing: ['treatment_bills'],
  lab_management: ['lab_tests', 'lab_reports', 'lab_profile'],
  audit_logs: ['audit_logs'],
  notifications: ['notifications'],
  wallet: ['dashboard'],
};

export function canUseStaffScreen(role: string, permissions: PermissionMap, screen: string, action: PermissionAction = 'view'): boolean {
  if (role === 'super_admin') return true;
  if (['dashboard', 'profile', 'change_password'].includes(screen)) return true;
  const requiredAction = screen === 'book_appointment' ? 'add' : action;
  return (screenObjects[screen] ?? []).some(object => permissions[normalizeObjectName(object)]?.[requiredAction] === true);
}
