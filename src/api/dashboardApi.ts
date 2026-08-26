import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { ClinicDashboardStats, SuperAdminStats } from '../types/clinicTypes';

export async function getDashboardKpiApi(token: string): Promise<ApiResponse<ClinicDashboardStats>> {
  return apiFetch<ClinicDashboardStats>('/dashboard', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getRevenueSummaryApi(
  token: string,
  period: 'day' | 'week' | 'month' | 'year' = 'month'
): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/dashboard/revenue?period=${period}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getSuperAdminDashboardApi(token: string): Promise<ApiResponse<SuperAdminStats>> {
  return apiFetch<SuperAdminStats>('/dashboard/super-admin', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}
