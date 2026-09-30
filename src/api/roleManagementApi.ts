import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { permissionEnabled } from '../utils/rolePermissions';

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
