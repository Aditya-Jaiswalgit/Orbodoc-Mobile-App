export const permissionEnabled = (value: unknown): boolean =>
  value === true || value === 1 || (typeof value === 'string' && ['1', 'true', 'yes', 'y'].includes(value.trim().toLowerCase()));

export function normalizeRoleName(value: string): string {
  const name = value.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/_+/g, '_');
  const aliases: Record<string, string> = {
    admin: 'clinic_admin', clinicadmin: 'clinic_admin', superadmin: 'super_admin',
    reception: 'receptionist', accounts: 'accountant',
    lab: 'lab_technician', labtech: 'lab_technician', labtechnician: 'lab_technician',
  };
  return aliases[name] || name;
}

export const roleDisplayNames: Record<string, string> = {
  super_admin: 'Super Admin',
  clinic_admin: 'Clinic Admin',
  doctor: 'Doctor',
  receptionist: 'Receptionist',
  pharmacist: 'Pharmacist',
  lab_technician: 'Lab Technician',
  accountant: 'Accountant',
  patient: 'Patient',
  nurse: 'Nurse',
};

export const roleSectionLabels: Record<string, string> = {
  clinic_admin: 'Admin',
  doctor: 'Doctor',
  patient: 'Patient',
  receptionist: 'Receptionist',
  super_admin: 'Super Admin',
  pharmacist: 'Pharmacist',
  lab_technician: 'Lab',
  accountant: 'Accounts',
  nurse: 'Nurse',
};

export function getRoleDisplayName(role?: string | null): string {
  if (!role) return 'Staff';
  const normalized = normalizeRoleName(role);
  return roleDisplayNames[normalized] || role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getRoleSectionLabel(role?: string | null): string {
  if (!role) return 'STAFF';
  const normalized = normalizeRoleName(role);
  const label = roleSectionLabels[normalized] || getRoleDisplayName(role);
  return label.toUpperCase();
}

export function decodeJwtPayload(token: string | null | undefined): Record<string, any> | null {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    let buffer = 0;
    let bits = 0;
    for (let i = 0; i < padded.length; i++) {
      const char = padded.charAt(i);
      if (char === '=') break;
      const index = chars.indexOf(char);
      if (index === -1) continue;
      buffer = (buffer << 6) | index;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        output += String.fromCharCode((buffer >> bits) & 0xff);
      }
    }
    return JSON.parse(output);
  } catch {
    return null;
  }
}

export const ROLE_NAME_TO_DEFAULT_ID: Record<string, number> = {
  super_admin: 1,
  clinic_admin: 2,
  doctor: 3,
  receptionist: 4,
  pharmacist: 5,
  lab_technician: 6,
  accountant: 7,
  nurse: 8,
  patient: 9,
};

export function resolveRoleId(
  user: any,
  token?: string | null,
  fallbackRole?: string | null
): string | number | undefined {
  if (user?.role_id != null && String(user.role_id).trim()) return user.role_id;
  if (user?.roleId != null && String(user.roleId).trim()) return user.roleId;
  if (typeof user?.role === 'object' && user?.role?.id != null) return user.role.id;

  if (token) {
    const decoded = decodeJwtPayload(token);
    if (decoded?.roleId != null && String(decoded.roleId).trim()) return decoded.roleId;
    if (decoded?.role_id != null && String(decoded.role_id).trim()) return decoded.role_id;
  }

  const roleNameCandidate =
    (typeof user?.role === 'string' ? user.role : null) ||
    user?.roleName ||
    user?.role_name ||
    fallbackRole;

  if (roleNameCandidate) {
    const normalized = normalizeRoleName(String(roleNameCandidate));
    if (normalized && ROLE_NAME_TO_DEFAULT_ID[normalized] != null) {
      return ROLE_NAME_TO_DEFAULT_ID[normalized];
    }
  }

  return undefined;
}


export const normalizeObjectName = (value: string): string =>
  value.trim().toLowerCase().replace(/[\s_-]+/g, '_');

export const normalizeObjectKey = (value: string): string =>
  value.trim().toLowerCase().replace(/[\s_]+/g, ' ');

export const normalizeObjectNameToken = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/_+/g, '_');

export type PermissionAction = 'view' | 'add' | 'edit' | 'delete' | 'execute';
export type PermissionFlags = Record<PermissionAction, boolean>;
export type PermissionMap = Record<string, PermissionFlags>;

export function permissionFlags(row: any): PermissionFlags {
  return {
    view: permissionEnabled(row?.view ?? row?.can_view),
    add: permissionEnabled(row?.add ?? row?.can_add),
    edit: permissionEnabled(row?.edit ?? row?.can_edit),
    delete: permissionEnabled(row?.delete ?? row?.can_delete),
    execute: permissionEnabled(row?.execute ?? row?.can_execute),
  };
}

export const objectNameAliases: Record<string, string[]> = {
  'super admin dashboard': ['super_admin_dashboard', 'dashboard', 'admin_dashboard'],
  'admin dashboard': ['admin_dashboard', 'dashboard'],
  'doctor dashboard': ['dashboard_doctor', 'dashboard', 'admin_dashboard'],
  'reception dashboard': ['dashboard_receptionist', 'dashboard', 'admin_dashboard'],
  'pharmacist dashboard': ['dashboard_pharmacist', 'dashboard', 'admin_dashboard'],
  'lab dashboard': ['dashboard_lab', 'dashboard', 'admin_dashboard'],
  'accounts dashboard': ['dashboard_accountant', 'dashboard', 'admin_dashboard'],
  'patient dashboard': ['dashboard_patient', 'dashboard', 'admin_dashboard'],
  'user & role management': ['staff_users', 'user_management'],
  'clinic management': ['clinics', 'clinic_management'],
  'clinic dashboard': ['dashboard', 'clinics', 'clinic_management'],
  appointments: ['appointments', 'my_appointments'],
  'video service': ['video service', 'video_service', 'video_services'],
  'video services': ['video service', 'video_service', 'video_services'],
  billing: ['treatment_bills', 'medicine_bills'],
  'treatment billing': ['treatment_bills'],
  'medicine billing': ['medicine_bills'],
  'lab tests': ['lab_tests'],
  'lab management': ['Lab_profile', 'lab_profile'],
  'lab profile': ['Lab_profile', 'lab_profile'],
  'lab reports': ['lab_reports'],
  notifications: ['notifications'],
  'audit logs': ['audit_logs'],
  patients: ['patients', 'my_patients'],
  doctors: ['staff_users'],
  'my patients': ['my_patients', 'patients'],
  'my appointments': ['appointments'],
  medicines: ['medicines', 'pharmacy_inventory'],
  'pharmacy inventory': ['medicines'],
  invoices: ['medicine_bills', 'treatment_bills'],
  payments: ['treatment_bills', 'medicine_bills'],
  history: ['treatment_bills', 'medicine_bills'],
  'clinic profile': ['clinic_management', 'clinics'],
  'my profile': ['my_profile', 'staff_users'],
  'change password': ['my_profile', 'staff_users'],
};

// Access uses the same role -> object flag map as the web client. The clinic
// list endpoint is for editing the matrix, not resolving login access.
export function normalizePermissionMap(value: unknown, objects: any[] = []): PermissionMap {
  const record = value as any;
  const source = record?.permissions ?? record?.data ?? record;
  const result: PermissionMap = {};
  if (!source || typeof source !== 'object' || Array.isArray(source)) return result;

  const setEntry = (key: string, flags: PermissionFlags) => {
    if (!key) return;
    const cleanKey = key.trim().toLowerCase();
    const underscoreKey = cleanKey.replace(/[\s_-]+/g, '_');
    const spaceKey = cleanKey.replace(/[\s_]+/g, ' ');
    const noSpaceKey = cleanKey.replace(/[^a-z0-9]+/g, '');

    result[underscoreKey] = flags;
    result[spaceKey] = flags;
    result[noSpaceKey] = flags;

    // Also populate known aliases
    const aliases = objectNameAliases[spaceKey] || objectNameAliases[underscoreKey] || [];
    for (const alias of aliases) {
      const aliasUnder = alias.toLowerCase().replace(/[\s_-]+/g, '_');
      const aliasSpace = alias.toLowerCase().replace(/[\s_]+/g, ' ');
      result[aliasUnder] = flags;
      result[aliasSpace] = flags;
    }
  };

  for (const [name, flags] of Object.entries(source)) {
    if (flags && typeof flags === 'object' && !Array.isArray(flags)) {
      setEntry(name, permissionFlags(flags));
    }
  }

  for (const object of objects) {
    const name = String(object.object_name || '').trim();
    const display = String(object.display_name || object.system_object_name || '').trim();
    const existing = result[normalizeObjectName(name)] || result[normalizeObjectKey(name)];
    if (existing) {
      if (display) setEntry(display, existing);
    } else {
      const displayFlags = result[normalizeObjectName(display)] || result[normalizeObjectKey(display)];
      if (displayFlags && name) setEntry(name, displayFlags);
    }
  }

  return result;
}

export function buildPermissionMap(rows: any[], roleId: string | number, clinicId: string | number): PermissionMap {
  const result: PermissionMap = {};
  // List is newest first. Keep the latest row when old duplicate rows exist.
  for (const row of rows) {
    if (String(row.role_id) !== String(roleId) || String(row.clinic_id) !== String(clinicId)) continue;
    const name = normalizeObjectName(String(row.object_name || ''));
    if (name && !result[name]) result[name] = permissionFlags(row);
  }
  return result;
}
