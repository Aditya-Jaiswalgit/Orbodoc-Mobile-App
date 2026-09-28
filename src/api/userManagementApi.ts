import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';

export interface StaffPayload {
  full_name?: string; email?: string; phone?: string; clinic_id?: number;
  role_id?: number; is_active?: number; department?: string; specialization?: string;
  qualification?: string; experience_years?: number; address?: string;
  password?: string;
}
export interface StaffPage { data: any[]; total: number; page: number; limit: number }
export interface StaffQuery {
  page: number; limit: number; clinic_id?: number; role_id?: number;
  is_active?: 0 | 1 | 'all'; search?: string;
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


function fetchStaffPage(query: StaffQuery): Promise<ApiResponse<StaffPage>> {
  const params = Object.entries(query).filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => key + '=' + encodeURIComponent(String(value))).join('&');
  return apiFetch<StaffPage>('/staff?' + params);
}
export function createClinicUserApi(payload: StaffPayload): Promise<ApiResponse<{ staff: any }>> {
  return apiFetch('/staff', { method: 'POST', body: JSON.stringify(payload) });
}
export function updateClinicUserApi(id: string | number, payload: StaffPayload): Promise<ApiResponse<{ staff: any }>> {
  return apiFetch('/staff/' + encodeURIComponent(String(id)), { method: 'PUT', body: JSON.stringify(payload) });
}
export function resetStaffPasswordApi(id: string | number, newPassword: string): Promise<ApiResponse<unknown>> {
  return apiFetch('/staff/' + encodeURIComponent(String(id)) + '/reset-password', {
    method: 'POST', body: JSON.stringify({ newPassword }),
  });
}

// The existing backend accepts only status 0 or 1. Compose a bounded page
// (active users first, then inactive) without sending unsupported 'all'.
export async function fetchAllUsersApi(query: StaffQuery): Promise<ApiResponse<StaffPage>> {
  if (query.is_active !== 'all') return fetchStaffPage(query);
  const offset = (query.page - 1) * query.limit;
  const [active, inactive] = await Promise.all([
    fetchStaffPage({ ...query, is_active: 1 }),
    fetchStaffPage({ ...query, is_active: 0, page: 1 }),
  ]);
  if (!active.success || !inactive.success) return !active.success ? active : inactive;
  if (!active.data || !inactive.data) return { success: false, message: 'Invalid users response' };
  const totalActive = Number(active.data.total);
  const total = totalActive + Number(inactive.data.total);
  const rows = [...active.data.data];
  const remaining = query.limit - rows.length;
  if (remaining > 0 && offset + rows.length < total) {
    const inactiveOffset = Math.max(0, offset - totalActive);
    const page = Math.floor(inactiveOffset / query.limit) + 1;
    const skip = inactiveOffset % query.limit;
    const first = page === 1 ? inactive : await fetchStaffPage({ ...query, is_active: 0, page });
    if (!first.success || !first.data) return first;
    rows.push(...first.data.data.slice(skip, skip + remaining));
    if (rows.length < query.limit && offset + rows.length < total) {
      const second = await fetchStaffPage({ ...query, is_active: 0, page: page + 1 });
      if (!second.success || !second.data) return second;
      rows.push(...second.data.data.slice(0, query.limit - rows.length));
    }
  }
  return { success: true, message: 'Success', data: { data: rows, total, page: query.page, limit: query.limit } };
}
