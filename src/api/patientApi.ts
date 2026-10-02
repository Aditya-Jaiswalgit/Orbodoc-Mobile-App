import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { PatientModel } from '../types/clinicTypes';

export interface PatientDashboardData {
  upcoming_appointments: any[];
  recent_lab_reports: any[];
  recent_bills: any[];
  walletBalance?: number;
  notificationsCount?: number;
}

export interface PatientStats {
  total_patients: number;
  active_patients: number;
  inactive_patients: number;
  today_visits: number;
  new_this_week: number;
}

export interface PatientListResponseData {
  total: number;
  page: number;
  limit: number;
  data: PatientModel[];
  stats?: PatientStats;
}

export interface FetchPatientsParams {
  clinic_id?: number | string | null;
  page?: number;
  limit?: number;
  search?: string;
  is_active?: number;
}

/**
 * Fetch Patients list with pagination, search, and status filters
 * Route: GET /api/patients
 */
export async function fetchPatientsApi(
  params: FetchPatientsParams = {},
  token?: string
): Promise<ApiResponse<PatientListResponseData>> {
  const queryParts: string[] = [];
  if (params.clinic_id !== undefined && params.clinic_id !== null && params.clinic_id !== 'all') {
    queryParts.push(`clinic_id=${encodeURIComponent(String(params.clinic_id))}`);
  }
  if (params.page) queryParts.push(`page=${encodeURIComponent(String(params.page))}`);
  if (params.limit) queryParts.push(`limit=${encodeURIComponent(String(params.limit))}`);
  if (params.search && params.search.trim()) {
    queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);
  }
  if (params.is_active !== undefined) {
    queryParts.push(`is_active=${encodeURIComponent(String(params.is_active))}`);
  }

  const query = queryParts.length ? `?${queryParts.join('&')}` : '';
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  return apiFetch<PatientListResponseData>(`/patients${query}`, {
    method: 'GET',
    headers,
  });
}

/**
 * Fetch single Patient details by ID
 * Route: GET /api/patients/:id
 */
export async function fetchPatientByIdApi(
  patientId: number | string,
  token?: string
): Promise<ApiResponse<{ patient: PatientModel }>> {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return apiFetch<{ patient: PatientModel }>(`/patients/${encodeURIComponent(String(patientId))}`, {
    method: 'GET',
    headers,
  });
}

/**
 * Register a new Patient
 * Route: POST /api/patients
 */
export async function createPatientApi(
  payload: Partial<PatientModel> & { clinic_id?: number | string; password?: string },
  token?: string
): Promise<ApiResponse<{ patient: PatientModel }>> {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return apiFetch<{ patient: PatientModel }>('/patients', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

/**
 * Update an existing Patient
 * Route: PUT /api/patients/:id
 */
export async function updatePatientApi(
  patientId: number | string,
  payload: Partial<PatientModel>,
  token?: string
): Promise<ApiResponse<{ patient: PatientModel }>> {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return apiFetch<{ patient: PatientModel }>(`/patients/${encodeURIComponent(String(patientId))}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
}

/**
 * Deactivate / Delete a Patient
 * Route: DELETE /api/patients/:id
 */
export async function deletePatientApi(
  patientId: number | string,
  token?: string
): Promise<ApiResponse<any>> {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return apiFetch<any>(`/patients/${encodeURIComponent(String(patientId))}`, {
    method: 'DELETE',
    headers,
  });
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
