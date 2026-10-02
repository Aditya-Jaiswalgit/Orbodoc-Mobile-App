import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { permissionEnabled, normalizeRoleName, ROLE_NAME_TO_DEFAULT_ID } from '../utils/rolePermissions';

export interface SystemObject {
  id: number | string;
  name: string;
  code: string;
  category?: string;
  description?: string;
}

export interface UserRoleItem {
  id: number | string;
  role_id?: number | string;
  role_name: string;
  clinic_id?: number | string | null;
  description?: string;
  name?: string;
  is_system?: boolean | number | string;
  user_count?: number;
  users_count?: number;
}

export interface RolePermissionItem {
  id?: number | string;
  role_id: number | string;
  sys_obj_id: number | string;
  can_view: number | boolean;
  can_add: number | boolean;
  can_edit: number | boolean;
  can_delete: number | boolean;
  can_execute?: number | boolean;
  clinic_id?: number | string;
}

export interface CreateRolePermissionPayload {
  role_id: string | number;
  sys_obj_id: string | number;
  can_view: number;
  can_add: number;
  can_edit: number;
  can_delete: number;
  can_execute?: number;
  clinic_id?: string | number;
  user_id?: string | number | null;
}

export interface UpdateRolePermissionPayload {
  can_view: number;
  can_add: number;
  can_edit: number;
  can_delete: number;
  can_execute?: number;
}

import { extractArrayData } from './userManagementApi';

/**
 * 1. Fetch System Modules List
 * Routes: /system_object/list -> /system_object -> /system-objects
 */
export async function fetchSystemObjectsApi(): Promise<ApiResponse<SystemObject[]>> {
  const res = await apiFetch<SystemObject[]>('/system_object/list');
  return { ...res, data: res.success ? extractArrayData(res) : undefined };
}

/**
 * 2. Create System Module
 * Route: POST /api/system_object/add
 */
export async function createSystemObjectApi(payload: {
  name: string;
  code: string;
}): Promise<ApiResponse<SystemObject>> {
  return apiFetch<SystemObject>('/system_object/add', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * 3. Fetch Roles List (Clinic Scoped or Global)
 * Routes: /user_role/list?clinic_id={clinicId} -> /user_role -> /roles
 */
export async function fetchUserRolesApi(clinicId?: string | number | null): Promise<ApiResponse<UserRoleItem[]>> {
  const query = clinicId == null || !String(clinicId).trim() ? '' : '?clinic_id=' + encodeURIComponent(String(clinicId).trim());
  const res = await apiFetch<UserRoleItem[]>('/user_role/list' + query);
  return { ...res, data: res.success ? extractArrayData(res).map(row => ({
    ...row,
    id: String(row.role_id ?? row.id ?? '').trim(),
    role_id: String(row.role_id ?? row.id ?? '').trim(),
    role_name: String(row.role_name ?? row.role ?? row.name ?? '').trim(),
    is_system: permissionEnabled(row.is_system),
  })).filter(row => row.id && row.role_name) : undefined };
}

/**
 * 4. Create Custom Role
 * Route: POST /api/user_role/add
 */
export async function createUserRoleApi(payload: {
  role_name: string;
  clinic_id?: string | number;
}): Promise<ApiResponse<UserRoleItem>> {
  return apiFetch<UserRoleItem>('/user_role/add', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * 5. Update Custom Role
 * Route: PUT /api/user_role/update/{roleId}
 */
export async function updateUserRoleApi(
  roleId: string | number,
  role_name: string
): Promise<ApiResponse<UserRoleItem>> {
  return apiFetch<UserRoleItem>(`/user_role/update/${encodeURIComponent(String(roleId))}`, {
    method: 'PUT',
    body: JSON.stringify({ role_name }),
  });
}

/**
 * 6. Fetch Permissions Matrix Data
 * Routes: /role_per/list?clinic_id={clinicId} -> /role_per/permission
 */
export async function fetchRolePermissionsApi(clinicId?: string | number): Promise<ApiResponse<RolePermissionItem[]>> {
  if (!clinicId) return { success: false, message: 'Select a clinic to manage permissions.' };
  const res = await apiFetch<RolePermissionItem[]>('/role_per/list?clinic_id=' + encodeURIComponent(String(clinicId)));
  return { ...res, data: res.success ? extractArrayData(res).map(row => ({
    ...row, id: row.permission_id ?? row.id,
    can_view: Number(permissionEnabled(row.can_view ?? row.view)),
    can_add: Number(permissionEnabled(row.can_add ?? row.add)),
    can_edit: Number(permissionEnabled(row.can_edit ?? row.edit)),
    can_delete: Number(permissionEnabled(row.can_delete ?? row.delete)),
    can_execute: Number(permissionEnabled(row.can_execute ?? row.execute)),
  })) : undefined };
}

export async function fetchPlanObjectIds(clinicId: string | number): Promise<Set<string>> {
  const response = await apiFetch<any>('/clinics/' + encodeURIComponent(String(clinicId)));
  if (!response.success || !response.data) throw new Error('Unable to load clinic plan');
  const clinic = response.data.clinic ?? response.data.data?.clinic ?? response.data.data ?? response.data;
  if (!clinic.plan_id) return new Set();
  const features = await apiFetch<any>('/planFeatures/');
  if (!features.success) throw new Error('Unable to load plan features');
  return new Set(extractArrayData(features)
    .filter(row => String(row.plan_id) === String(clinic.plan_id) && permissionEnabled(row.is_enabled))
    .map(row => String(row.sys_obj_id)));
}

/**
 * 7. Get Permissions by Role ID
 * Comprehensive resolver: Queries /role_per/permission/{roleId} AND merges with
 * the live clinic matrix from /role_per/list?clinic_id={clinicId} so that permissions
 * updated by Admin in the web portal are immediately reflected.
 */
export async function fetchPermissionMapByRoleApi(
  roleId: string | number,
  clinicId?: string | number | null,
  roleNameHint?: string | null
): Promise<ApiResponse<Record<string, any>>> {
  const mergedMap: Record<string, any> = {};
  let anySuccess = false;

  // 1. Direct call to /role_per/permission/:roleId
  try {
    const direct = await apiFetch<Record<string, any>>(`/role_per/permission/${encodeURIComponent(String(roleId))}`);
    if (direct.success && direct.data && typeof direct.data === 'object' && !Array.isArray(direct.data)) {
      anySuccess = true;
      for (const [key, val] of Object.entries(direct.data)) {
        if (val && typeof val === 'object') {
          mergedMap[key] = {
            view: permissionEnabled((val as any).view ?? (val as any).can_view),
            add: permissionEnabled((val as any).add ?? (val as any).can_add),
            edit: permissionEnabled((val as any).edit ?? (val as any).can_edit),
            delete: permissionEnabled((val as any).delete ?? (val as any).can_delete),
            execute: permissionEnabled((val as any).execute ?? (val as any).can_execute),
          };
        }
      }
    }
  } catch {
    // continue to clinic list
  }

  // 2. Fetch /role_per/list?clinic_id= to get the live clinic permissions matrix
  if (clinicId) {
    try {
      const [listRes, rolesRes] = await Promise.all([
        apiFetch<any[]>(`/role_per/list?clinic_id=${encodeURIComponent(String(clinicId))}`),
        apiFetch<any[]>(`/user_role/list?clinic_id=${encodeURIComponent(String(clinicId))}`).catch(() => null),
      ]);

      if (listRes.success) {
        anySuccess = true;
        const listData = Array.isArray(listRes.data)
          ? listRes.data
          : Array.isArray((listRes.data as any)?.data)
          ? (listRes.data as any).data
          : [];

        // Collect all role IDs associated with this role
        const targetRoleIds = new Set<string>();
        targetRoleIds.add(String(roleId).trim());

        const normalizedHint = roleNameHint ? normalizeRoleName(roleNameHint) : '';
        if (normalizedHint && ROLE_NAME_TO_DEFAULT_ID[normalizedHint] != null) {
          targetRoleIds.add(String(ROLE_NAME_TO_DEFAULT_ID[normalizedHint]));
        }

        // Check if /user_role/list has matching roles for this role name
        if (rolesRes?.success && rolesRes?.data) {
          const roleList = extractArrayData(rolesRes);
          for (const r of roleList) {
            const rName = normalizeRoleName(String(r.role_name ?? r.role ?? r.name ?? ''));
            const rId = String(r.role_id ?? r.id ?? '').trim();
            if (rId && (rId === String(roleId).trim() || (normalizedHint && rName === normalizedHint))) {
              targetRoleIds.add(rId);
            }
          }
        }

        // listData contains all matrix rows. Merge flags for matching role
        for (const item of listData) {
          const itemRoleId = String(item.role_id ?? '').trim();
          const itemRoleName = normalizeRoleName(String(item.role_name ?? item.role ?? ''));

          const matchesRole =
            targetRoleIds.has(itemRoleId) ||
            (normalizedHint && itemRoleName === normalizedHint);

          if (matchesRole) {
            const objName = item.object_name || item.system_object_name || item.display_name;
            if (objName) {
              const current = mergedMap[objName] || {
                view: false,
                add: false,
                edit: false,
                delete: false,
                execute: false,
              };

              mergedMap[objName] = {
                view: current.view || permissionEnabled(item.can_view ?? item.view),
                add: current.add || permissionEnabled(item.can_add ?? item.add),
                edit: current.edit || permissionEnabled(item.can_edit ?? item.edit),
                delete: current.delete || permissionEnabled(item.can_delete ?? item.delete),
                execute: current.execute || permissionEnabled(item.can_execute ?? item.execute),
              };
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  if (anySuccess || Object.keys(mergedMap).length > 0) {
    return {
      success: true,
      message: 'Permissions resolved',
      data: mergedMap,
    };
  }

  return {
    success: false,
    message: 'Unable to load permissions',
  };
}

/**
 * 8. Add Role Permission
 * Route: POST /api/role_per/add
 */
export async function createRolePermissionApi(
  payload: CreateRolePermissionPayload
): Promise<ApiResponse<RolePermissionItem>> {
  return apiFetch<RolePermissionItem>('/role_per/add', {
    method: 'POST',
    body: JSON.stringify({
      clinic_id: payload.clinic_id,
      user_id: payload.user_id == null ? null : Number(payload.user_id),
      role_id: String(payload.role_id),
      sys_obj_id: String(payload.sys_obj_id),
      can_view: payload.can_view ? 1 : 0,
      can_add: payload.can_add ? 1 : 0,
      can_edit: payload.can_edit ? 1 : 0,
      can_delete: payload.can_delete ? 1 : 0,
      can_execute: payload.can_execute ? 1 : 0,
    }),
  });
}

/**
 * 9. Update Role Permission Status
 * Route: PUT /api/role_per/update/{permissionId}
 */
export async function updateRolePermissionApi(
  permissionId: string | number,
  payload: UpdateRolePermissionPayload
): Promise<ApiResponse<RolePermissionItem>> {
  return apiFetch<RolePermissionItem>(`/role_per/update/${encodeURIComponent(String(permissionId))}`, {
    method: 'PUT',
    body: JSON.stringify({
      can_view: payload.can_view ? 1 : 0,
      can_add: payload.can_add ? 1 : 0,
      can_edit: payload.can_edit ? 1 : 0,
      can_delete: payload.can_delete ? 1 : 0,
      can_execute: payload.can_execute ? 1 : 0,
    }),
  });
}
