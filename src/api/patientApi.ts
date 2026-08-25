import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';

export interface PatientDashboardData {
  upcoming_appointments: any[];
  recent_lab_reports: any[];
  recent_bills: any[];
  walletBalance?: number;
  notificationsCount?: number;
}

/**
 * Fetch Patient Dashboard data
 * Route: GET /api/patients/dashboard
 */
export async function getPatientDashboardApi(
  token: string
): Promise<ApiResponse<PatientDashboardData>> {
  return apiFetch<PatientDashboardData>('/patients/dashboard', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
