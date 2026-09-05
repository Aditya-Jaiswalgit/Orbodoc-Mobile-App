import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { AuditLog } from '../types/clinicTypes';

export interface AuditLogsQueryParams {
  page?: number;
  limit?: number;
  action?: string;
  table?: string;
  user_id?: number | string;
  from?: string;
  to?: string;
  search?: string;
}

export interface AuditLogsResponse {
  total: number;
  page: number;
  limit: number;
  data: AuditLog[];
}

export async function getAuditLogsApi(
  token: string,
  params?: AuditLogsQueryParams
): Promise<ApiResponse<AuditLogsResponse | AuditLog[]>> {
  const queryParts: string[] = [];
  if (params?.page) queryParts.push(`page=${params.page}`);
  if (params?.limit) queryParts.push(`limit=${params.limit}`);
  if (params?.action) queryParts.push(`action=${encodeURIComponent(params.action)}`);
  if (params?.table) queryParts.push(`table=${encodeURIComponent(params.table)}`);
  if (params?.user_id) queryParts.push(`user_id=${params.user_id}`);
  if (params?.from) queryParts.push(`from=${encodeURIComponent(params.from)}`);
  if (params?.to) queryParts.push(`to=${encodeURIComponent(params.to)}`);
  if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);

  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

  return apiFetch<AuditLogsResponse | AuditLog[]>(`/audit-logs${queryString}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function exportAuditLogsApi(
  token: string
): Promise<ApiResponse<{ download_url?: string; message?: string }>> {
  return apiFetch<{ download_url?: string; message?: string }>('/audit-logs/export', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
