import {
  normalizeObjectName,
  normalizeObjectKey,
  objectNameAliases,
  PermissionAction,
  PermissionMap,
  normalizeRoleName,
} from '../utils/rolePermissions';

export const screenObjects: Record<string, string[]> = {
  clinics: ['clinics', 'clinic_management', 'clinic management'],
  staff: ['staff_users', 'user_management', 'user & role management', 'staff users'],
  role_permissions: ['staff_users', 'user_management', 'user & role management', 'staff users'],
  patients: ['patients', 'my_patients', 'my patients'],
  appointments: ['appointments', 'my_appointments', 'my appointments'],
  book_appointment: ['appointments', 'my_appointments', 'my appointments'],
  video_services: ['video service', 'video_service', 'video_services'],
  prescriptions: ['prescriptions', 'medicines'],
  pharmacy_inventory: ['medicines', 'pharmacy_inventory'],
  medicine_billing: ['medicine_bills', 'medicine billing', 'billing'],
  treatment_billing: ['treatment_bills', 'treatment billing', 'billing'],
  lab_management: ['Lab_profile', 'lab_profile', 'lab_management'],
  lab_tests: ['lab_tests', 'lab tests', 'lab_test', 'lab test'],
  lab_inventory: ['lab_tests', 'lab_catalog', 'lab tests', 'lab_test', 'lab test', 'lab_inventory', 'lab inventory'],
  lab_reports: ['lab_reports', 'lab reports', 'lab_report', 'lab report'],
  notifications: ['notifications'],
  wallet: ['dashboard'],
};

export function canUseStaffScreen(
  role: string,
  permissions: PermissionMap,
  screen: string,
  action: PermissionAction = 'view'
): boolean {
  if (normalizeRoleName(role) === 'super_admin') return true;
  if (['dashboard', 'profile', 'change_password'].includes(screen)) return true;
  if (!permissions || Object.keys(permissions).length === 0) return false;

  const targetObjects = screenObjects[screen] ?? [screen];
  const allCandidates = new Set<string>();

  for (const obj of targetObjects) {
    const raw = obj.toLowerCase().trim();
    allCandidates.add(raw);
    allCandidates.add(normalizeObjectName(raw));
    allCandidates.add(normalizeObjectKey(raw));
    allCandidates.add(raw.replace(/[^a-z0-9]+/g, ''));

    const aliases = objectNameAliases[raw] || objectNameAliases[normalizeObjectKey(raw)] || [];
    for (const alias of aliases) {
      const aliasRaw = alias.toLowerCase().trim();
      allCandidates.add(aliasRaw);
      allCandidates.add(normalizeObjectName(aliasRaw));
      allCandidates.add(normalizeObjectKey(aliasRaw));
      allCandidates.add(aliasRaw.replace(/[^a-z0-9]+/g, ''));
    }
  }

  for (const candidate of allCandidates) {
    if (permissions[candidate]?.[action] === true) {
      return true;
    }
  }

  return false;
}
