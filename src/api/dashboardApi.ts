import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { ClinicDashboardStats, SuperAdminStats } from '../types/clinicTypes';

/**
 * 1. Overview Metrics KPI
 * Route: GET /api/dashboard?clinic_id={clinicId}
 */
export async function getDashboardKpiApi(
  clinicId?: number | string
): Promise<ApiResponse<ClinicDashboardStats>> {
  const query = clinicId ? `?clinic_id=${encodeURIComponent(String(clinicId))}` : '';
  return apiFetch<ClinicDashboardStats>(`/dashboard${query}`, {
    method: 'GET',
  });
}

/**
 * 2. Daily Appointment Status Bar Chart Data
 * Route: GET /api/dashboard/appointments/chart?clinic_id={clinicId}
 */
export async function getAppointmentChartApi(
  clinicId?: number | string
): Promise<ApiResponse<any>> {
  const query = clinicId ? `?clinic_id=${encodeURIComponent(String(clinicId))}` : '';
  return apiFetch<any>(`/dashboard/appointments/chart${query}`, {
    method: 'GET',
  });
}

/**
 * 3. Revenue Mix Chart Data (Treatment vs Medicine Revenue)
 * Route: GET /api/dashboard/revenue?clinic_id={clinicId}&months=1
 */
export async function getRevenueChartApi(
  clinicId?: number | string,
  months: number = 1
): Promise<ApiResponse<any>> {
  const cParam = clinicId ? `clinic_id=${encodeURIComponent(String(clinicId))}&` : '';
  return apiFetch<any>(`/dashboard/revenue?${cParam}months=${months}`, {
    method: 'GET',
  });
}

/**
 * 4. Super Admin System-Wide Global Dashboard
 * Route: GET /api/dashboard/super-admin
 */
export async function getSuperAdminDashboardApi(): Promise<ApiResponse<SuperAdminStats>> {
  return apiFetch<SuperAdminStats>('/dashboard/super-admin', {
    method: 'GET',
  });
}
