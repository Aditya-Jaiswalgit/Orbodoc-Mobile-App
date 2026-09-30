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

export const normalizeObjectName = (value: string): string =>
  value.trim().toLowerCase().replace(/[\s_-]+/g, '_');

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

// Access uses the same role -> object flag map as the web client. The clinic
// list endpoint is for editing the matrix, not resolving login access.
export function normalizePermissionMap(value: unknown, objects: any[] = []): PermissionMap {
  const record = value as any;
  const source = record?.permissions ?? record?.data ?? record;
  const result: PermissionMap = {};
  if (!source || typeof source !== 'object' || Array.isArray(source)) return result;
  for (const [name, flags] of Object.entries(source)) {
    if (flags && typeof flags === 'object' && !Array.isArray(flags)) {
      result[normalizeObjectName(name)] = permissionFlags(flags);
    }
  }
  for (const object of objects) {
    const name = normalizeObjectName(String(object.object_name || ''));
    const display = normalizeObjectName(String(object.display_name || object.system_object_name || ''));
    if (display && result[name] && !result[display]) result[display] = result[name];
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
