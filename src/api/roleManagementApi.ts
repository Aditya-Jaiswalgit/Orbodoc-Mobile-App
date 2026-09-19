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
}

export interface RolePermissionItem {
  id: number | string;
  role_id: number | string;
  sys_obj_id: number | string;
  sys_obj_name?: string;
  can_view: number | boolean;
  can_add: number | boolean;
  can_edit: number | boolean;
  can_delete: number | boolean;
  can_execute: number | boolean;
  clinic_id?: number | string;
}

export interface CreateRolePermissionPayload {
  role_id: string | number;
  sys_obj_id: string | number;
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  execute?: boolean;
  clinic_id?: string | number;
}

/**
 * 1. System Objects (Menu Items / Modules) List
 * Route: GET /api/system_object/list
 */
export async function fetchSystemObjectsApi(): Promise<ApiResponse<SystemObject[]>> {
  return apiFetch<SystemObject[]>('/system_object/list');
}

/**
 * 2. Fetch User Roles List (Clinic Scoped or Global)
 * Route: GET /api/user_role/list?clinic_id=:id
 */
export async function fetchUserRolesApi(
  clinicId?: string | number | null
): Promise<ApiResponse<UserRoleItem[]>> {
  const query = clinicId ? `?clinic_id=${clinicId}` : '';
  return apiFetch<UserRoleItem[]>(`/user_role/list${query}`);
}

/**
 * 3. Create New Custom Role
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
 * 4. Fetch Role Permissions Matrix
 * Route: GET /api/role_per/list?clinic_id=:id
 */
export async function fetchRolePermissionsApi(
  clinicId?: string | number
): Promise<ApiResponse<RolePermissionItem[]>> {
  const query = clinicId ? `?clinic_id=${clinicId}` : '';
  return apiFetch<RolePermissionItem[]>(`/role_per/list${query}`);
}

/**
 * 5. Create / Save Permission for Role & System Object
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
      can_view: payload.view ? 1 : 0,
      can_add: payload.add ? 1 : 0,
      can_edit: payload.edit ? 1 : 0,
      can_delete: payload.delete ? 1 : 0,
      can_execute: payload.execute ? 1 : 0,
      clinic_id: payload.clinic_id ? Number(payload.clinic_id) : null,
    }),
  });
}

/**
 * 6. Update Permission Matrix Row
 * Route: PUT /api/role_per/update/:permissionId
 */
export async function updateRolePermissionApi(
  permissionId: string | number,
  payload: {
    view?: boolean;
    add?: boolean;
    edit?: boolean;
    delete?: boolean;
    execute?: boolean;
  }
): Promise<ApiResponse<RolePermissionItem>> {
  return apiFetch<RolePermissionItem>(`/role_per/update/${permissionId}`, {
    method: 'PUT',
    body: JSON.stringify({
      can_view: payload.view ? 1 : 0,
      can_add: payload.add ? 1 : 0,
      can_edit: payload.edit ? 1 : 0,
      can_delete: payload.delete ? 1 : 0,
      can_execute: payload.execute ? 1 : 0,
    }),
  });
}

/**
 * 7. Get Permission Map by Role ID
 * Route: GET /api/role_per/permission/:roleId
 */
export async function fetchPermissionMapByRoleApi(
  roleId: string | number
): Promise<ApiResponse<Record<string, any>>> {
  return apiFetch<Record<string, any>>(`/role_per/permission/${roleId}`);
}
