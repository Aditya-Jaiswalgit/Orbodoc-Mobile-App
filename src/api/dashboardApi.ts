import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { ClinicDashboardStats, SuperAdminStats } from '../types/clinicTypes';

export interface DashboardAppointmentChartRow {
  appointment_date: string;
  status: string;
  count: number | string;
}

export interface DashboardAppointmentChartData {
  appointmentStats: DashboardAppointmentChartRow[];
}

/**
 * 1. Overview Metrics KPI
 * Route: GET /api/dashboard?clinic_id={clinicId}
 */
export async function getDashboardKpiApi(
  clinicId?: number | string,
  signal?: AbortSignal
): Promise<ApiResponse<ClinicDashboardStats>> {
  const query = clinicId ? `?clinic_id=${encodeURIComponent(String(clinicId))}` : '';
  return apiFetch<ClinicDashboardStats>(`/dashboard${query}`, {
    method: 'GET', signal,
  });
}

/**
 * 2. Daily Appointment Status Bar Chart Data
 * Route: GET /api/dashboard/appointments/chart?clinic_id={clinicId}
 */
export async function getAppointmentChartApi(
  clinicId?: number | string,
  signal?: AbortSignal
): Promise<ApiResponse<DashboardAppointmentChartData>> {
  const query = clinicId ? `?clinic_id=${encodeURIComponent(String(clinicId))}` : '';
  return apiFetch<DashboardAppointmentChartData>(`/dashboard/appointments/chart${query}`, {
    method: 'GET', signal,
  });
}

/**
 * 3. Revenue Mix Chart Data (Treatment vs Medicine Revenue)
 * Route: GET /api/dashboard/revenue?clinic_id={clinicId}&months=1
 */
export async function getRevenueChartApi(
  clinicId?: number | string,
  months: number = 1,
  signal?: AbortSignal
): Promise<ApiResponse<any>> {
  const cParam = clinicId ? `clinic_id=${encodeURIComponent(String(clinicId))}&` : '';
  return apiFetch<any>(`/dashboard/revenue?${cParam}months=${months}`, {
    method: 'GET', signal,
  });
}

/**
 * 4. Super Admin System-Wide Global Dashboard
 * Route: GET /api/dashboard/super-admin
 */
export async function getSuperAdminDashboardApi(signal?: AbortSignal): Promise<ApiResponse<SuperAdminStats>> {
  return apiFetch<SuperAdminStats>('/dashboard/super-admin', {
    method: 'GET', signal,
  });
}
