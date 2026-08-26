import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { AuditLog } from '../types/clinicTypes';

export async function getAuditLogsApi(token: string): Promise<ApiResponse<AuditLog[]>> {
  return apiFetch<AuditLog[]>('/audit-logs', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function exportAuditLogsApi(token: string): Promise<ApiResponse<{ download_url: string }>> {
  return apiFetch<{ download_url: string }>('/audit-logs/export', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}
