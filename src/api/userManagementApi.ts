import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import type { ApiRecord } from '../utils/apiData';

export { extractArrayData } from '../utils/apiData';
export interface StaffPayload {
  full_name?: string; email?: string; phone?: string; clinic_id?: number;
  role_id?: number; is_active?: number; department?: string | null; specialization?: string | null;
  qualification?: string | null; experience_years?: number | null; address?: string | null;
  registration_number?: string | null; consultation_fee?: number; available_days?: string | null;
  is_doctor?: number;
  password?: string;
}
export type StaffRecord = ApiRecord & { id?: string | number; user_id?: string | number };
export type StaffListRecord = StaffRecord & { id: string };
export interface StaffPage { data: StaffListRecord[]; total: number; page: number; limit: number }
export interface StaffQuery {
  page: number; limit: number; clinic_id?: number; role_id?: number;
  is_active?: 0 | 1 | 'all'; search?: string;
}

function fetchStaffPage(query: StaffQuery): Promise<ApiResponse<StaffPage>> {
  const params = Object.entries(query).filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => key + '=' + encodeURIComponent(String(value))).join('&');
  return apiFetch<StaffPage>('/staff?' + params);
}
export function createClinicUserApi(payload: StaffPayload): Promise<ApiResponse<{ staff: StaffRecord }>> {
  return apiFetch('/staff', { method: 'POST', body: JSON.stringify(payload) });
}
export function fetchStaffByIdApi(id: string | number): Promise<ApiResponse<{ staff: StaffRecord }>> {
  return apiFetch('/staff/' + encodeURIComponent(String(id)));
}
export function updateClinicUserApi(id: string | number, payload: StaffPayload): Promise<ApiResponse<{ staff: StaffRecord }>> {
  return apiFetch('/staff/' + encodeURIComponent(String(id)), { method: 'PUT', body: JSON.stringify(payload) });
}
export function resetStaffPasswordApi(id: string | number, newPassword: string): Promise<ApiResponse<unknown>> {
  return apiFetch('/staff/' + encodeURIComponent(String(id)) + '/reset-password', {
    method: 'POST', body: JSON.stringify({ newPassword }),
  });
}

// The web action deactivates (soft deletes) a user through this endpoint.
export function deactivateStaffApi(id: string | number): Promise<ApiResponse<unknown>> {
  return apiFetch('/staff/' + encodeURIComponent(String(id)), { method: 'DELETE' });
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
