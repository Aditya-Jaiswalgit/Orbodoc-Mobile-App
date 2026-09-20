import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';

export interface CreateClinicUserPayload {
  full_name: string;
  email: string;
  phone?: string;
  role?: string;
  clinic_id?: string | number;
  password?: string;
  status?: string;
  department?: string;
  specialization?: string;
  qualification?: string;
  consultation_fee?: number;
}

export interface UpdateClinicUserPayload {
  full_name?: string;
  phone?: string;
  role?: string;
  role_name?: string;
  status?: string;
  department?: string;
  specialization?: string;
  qualification?: string;
  address?: string;
}

export function extractArrayData(res: any): any[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.users)) return res.data.users;
  if (res.data && Array.isArray(res.data.roles)) return res.data.roles;
  if (res.data && Array.isArray(res.data.permissions)) return res.data.permissions;
  if (res.data && Array.isArray(res.data.objects)) return res.data.objects;
  if (res.data && Array.isArray(res.data.system_objects)) return res.data.system_objects;
  if (res.data && Array.isArray(res.data.staff)) return res.data.staff;
  if (res.data && Array.isArray(res.data.data)) return res.data.data;
  if (res.data && Array.isArray(res.data.result)) return res.data.result;
  if (Array.isArray(res.users)) return res.users;
  if (Array.isArray(res.roles)) return res.roles;
  if (Array.isArray(res.permissions)) return res.permissions;
  if (Array.isArray(res.objects)) return res.objects;
  if (Array.isArray(res.system_objects)) return res.system_objects;
  if (Array.isArray(res.staff)) return res.staff;
  if (Array.isArray(res.result)) return res.result;
  if (res.data && typeof res.data === 'object') {
    for (const key of Object.keys(res.data)) {
      if (Array.isArray(res.data[key])) return res.data[key];
    }
  }
  if (typeof res === 'object') {
    for (const key of Object.keys(res)) {
      if (key !== 'headers' && key !== 'config' && Array.isArray(res[key])) return res[key];
    }
  }
  return [];
}

/**
 * 🅰️ All Users List Fetching
 * Routes tried sequentially: /clinic-admin/users -> /staff -> /staff/list -> /users
 */
export async function fetchAllUsersApi(): Promise<ApiResponse<any[]>> {
  const res = await apiFetch<any[]>('/clinic-admin/users', { method: 'GET' });
  if (res.success) {
    const list = extractArrayData(res);
    if (list.length > 0) return { ...res, data: list };
  }

  const staffRes = await apiFetch<any[]>('/staff', { method: 'GET' });
  if (staffRes.success) {
    const list = extractArrayData(staffRes);
    if (list.length > 0) return { ...staffRes, data: list };
  }

  const staffListRes = await apiFetch<any[]>('/staff/list', { method: 'GET' });
  if (staffListRes.success) {
    const list = extractArrayData(staffListRes);
    if (list.length > 0) return { ...staffListRes, data: list };
  }

  const usersRes = await apiFetch<any[]>('/users', { method: 'GET' });
  if (usersRes.success) {
    const list = extractArrayData(usersRes);
    if (list.length > 0) return { ...usersRes, data: list };
  }

  return res;
}

/**
 * 🅱️ Specific Role User List Filtering
 */
export async function fetchUsersByRoleApi(
  role: string = 'all'
): Promise<ApiResponse<any[]>> {
  const cleanRole = role.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (!cleanRole || cleanRole === 'all' || cleanRole === 'all_roles') {
    return fetchAllUsersApi();
  }

  const res = await apiFetch<any[]>(`/clinic-admin/users/${cleanRole}`, { method: 'GET' });
  if (res.success) {
    const list = extractArrayData(res);
    if (list.length > 0) return { ...res, data: list };
  }

  const staffRoleRes = await apiFetch<any[]>(`/staff/role/${cleanRole}`, { method: 'GET' });
  if (staffRoleRes.success) {
    const list = extractArrayData(staffRoleRes);
    if (list.length > 0) return { ...staffRoleRes, data: list };
  }

  return fetchAllUsersApi();
}

/**
 * 2. Create New User
 * Route: POST /api/clinic-admin/users
 */
export async function createClinicUserApi(
  payload: CreateClinicUserPayload
): Promise<ApiResponse<any>> {
  return apiFetch<any>('/clinic-admin/users', {
    method: 'POST',
    body: JSON.stringify({
      full_name: payload.full_name.trim(),
      email: payload.email.trim(),
      phone: payload.phone || '9876543210',
      role: payload.role || 'doctor',
      clinic_id: payload.clinic_id ? String(payload.clinic_id) : '1',
      password: payload.password || 'Password123',
      status: payload.status || 'Active',
    }),
  });
}

/**
 * 3. Update User Details
 * Route: PUT /api/clinic-admin/users/:userId
 */
export async function updateClinicUserApi(
  userId: string | number,
  payload: UpdateClinicUserPayload
): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/clinic-admin/users/${encodeURIComponent(String(userId))}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * 4. Delete User
 * Route: DELETE /api/clinic-admin/users/:userId
 */
export async function deleteStaffApi(
  userId: string | number
): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/clinic-admin/users/${encodeURIComponent(String(userId))}`, {
    method: 'DELETE',
  });
}

/**
 * 5. Reset Password
 * Route: POST /api/clinic-admin/users/:userId/reset-password
 */
export async function resetStaffPasswordApi(
  userId: string | number,
  newPassword?: string
): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/clinic-admin/users/${encodeURIComponent(String(userId))}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password: newPassword || 'Password123' }),
  });
}
