import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';

export interface SystemObject {
  id: number | string;
  name: string;
  code: string;
  category?: string;
  description?: string;
}

export interface UserRoleItem {
  id: number | string;
  role_name: string;
  clinic_id?: number | string;
  description?: string;
  name?: string;
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
  clinic_id?: string | number;
}

export interface UpdateRolePermissionPayload {
  can_view: number;
  can_add: number;
  can_edit: number;
  can_delete: number;
}

import { extractArrayData } from './userManagementApi';

/**
 * 1. Fetch System Modules List
 * Routes: /system_object/list -> /system_object -> /system-objects
 */
export async function fetchSystemObjectsApi(): Promise<ApiResponse<SystemObject[]>> {
  const res = await apiFetch<SystemObject[]>('/system_object/list');
  if (res.success) {
    const list = extractArrayData(res);
    if (list.length > 0) return { ...res, data: list };
  }

  const fallback1 = await apiFetch<SystemObject[]>('/system_object');
  if (fallback1.success) {
    const list = extractArrayData(fallback1);
    if (list.length > 0) return { ...fallback1, data: list };
  }

  const fallback2 = await apiFetch<SystemObject[]>('/system-objects');
  if (fallback2.success) {
    const list = extractArrayData(fallback2);
    if (list.length > 0) return { ...fallback2, data: list };
  }

  return res;
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
export async function fetchUserRolesApi(
  clinicId?: string | number | null
): Promise<ApiResponse<UserRoleItem[]>> {
  const query = clinicId ? `?clinic_id=${clinicId}` : '';
  const res = await apiFetch<UserRoleItem[]>(`/user_role/list${query}`);
  if (res.success) {
    const list = extractArrayData(res);
    if (list.length > 0) return { ...res, data: list };
  }

  const fallback1 = await apiFetch<UserRoleItem[]>(`/user_role${query}`);
  if (fallback1.success) {
    const list = extractArrayData(fallback1);
    if (list.length > 0) return { ...fallback1, data: list };
  }

  const fallback2 = await apiFetch<UserRoleItem[]>('/roles');
  if (fallback2.success) {
    const list = extractArrayData(fallback2);
    if (list.length > 0) return { ...fallback2, data: list };
  }

  return res;
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
export async function fetchRolePermissionsApi(
  clinicId?: string | number
): Promise<ApiResponse<RolePermissionItem[]>> {
  const query = clinicId ? `?clinic_id=${clinicId}` : '';
  const res = await apiFetch<RolePermissionItem[]>(`/role_per/list${query}`);
  if (res.success) {
    const list = extractArrayData(res);
    if (list.length > 0) return { ...res, data: list };
  }

  const fallback1 = await apiFetch<RolePermissionItem[]>(`/role_per/permission${query}`);
  if (fallback1.success) {
    const list = extractArrayData(fallback1);
    if (list.length > 0) return { ...fallback1, data: list };
  }

  return res;
}

/**
 * 7. Get Permissions by Role ID
 * Route: GET /api/role_per/permission/{roleId}
 */
export async function fetchPermissionMapByRoleApi(
  roleId: string | number
): Promise<ApiResponse<Record<string, any>>> {
  return apiFetch<Record<string, any>>(`/role_per/permission/${encodeURIComponent(String(roleId))}`);
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
      role_id: String(payload.role_id),
      sys_obj_id: String(payload.sys_obj_id),
      can_view: payload.can_view ? 1 : 0,
      can_add: payload.can_add ? 1 : 0,
      can_edit: payload.can_edit ? 1 : 0,
      can_delete: payload.can_delete ? 1 : 0,
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
    }),
  });
}
