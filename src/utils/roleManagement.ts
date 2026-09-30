import type { RolePermissionItem, UserRoleItem } from '../api/roleManagementApi';
import { normalizeRoleName } from './rolePermissions';

// Keep the web catalog's order and precedence: the first API row for a
// normalized name wins, while its position comes from the reverse traversal.
export function buildRoleCatalog(rows: UserRoleItem[]): UserRoleItem[] {
  const catalog = new Map<string, UserRoleItem>();
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    catalog.set(normalizeRoleName(row.role_name), row);
  }
  return [...catalog.values()];
}

export function getManageableRoles(rows: UserRoleItem[], currentRole: string): UserRoleItem[] {
  if (normalizeRoleName(currentRole) !== 'clinic_admin') return rows;
  return rows.filter(row => !isProtectedAdminRole(row.role_name));
}

export function isProtectedAdminRole(role: string): boolean {
  return ['super_admin', 'clinic_admin'].includes(normalizeRoleName(role));
}

export function buildPermissionRoleOptions(
  rows: UserRoleItem[], currentRole: string, permissions: RolePermissionItem[], setupRoleId: string,
): UserRoleItem[] {
  const options = [...getManageableRoles(rows, currentRole)];
  const ids = new Set(options.map(row => String(row.id)));
  // Web includes otherwise hidden roles in the matrix only when they already
  // have permission rows. This does not make their user-role field editable.
  for (const permission of permissions) {
    const id = String(permission.role_id);
    const row = rows.find(role => String(role.id) === id);
    if (row && !ids.has(id)) { options.push(row); ids.add(id); }
  }
  const setupRole = rows.find(row => String(row.id) === setupRoleId);
  if (setupRole && !ids.has(setupRoleId)) options.unshift(setupRole);
  return options;
}
