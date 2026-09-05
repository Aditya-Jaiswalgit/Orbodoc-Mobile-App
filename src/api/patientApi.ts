import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { PatientModel } from '../types/clinicTypes';

export async function getPatientsApi(token: string, queryParams?: string): Promise<ApiResponse<PatientModel[]>> {
  const query = queryParams ? `?${queryParams}` : '';
  return apiFetch<PatientModel[]>(`/patients${query}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export interface PatientDashboardData {
  upcoming_appointments?: Array<{
    id?: number;
    doctor_name?: string;
    specialization?: string;
    appointment_date?: string;
    appointment_time?: string;
    clinic_name?: string;
  }>;
  recent_lab_reports?: Array<any>;
  recent_bills?: Array<any>;
  [key: string]: any;
}

export async function getPatientsDashboardStatsApi(token: string): Promise<ApiResponse<any>> {
  return apiFetch<any>('/patients/dashboard', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function getPatientDashboardApi(token: string): Promise<ApiResponse<PatientDashboardData>> {
  return apiFetch<PatientDashboardData>('/patients/dashboard', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function getPatientByIdApi(token: string, id: number): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/patients/${id}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function updatePatientApi(
  token: string,
  id: number,
  data: Partial<PatientModel>
): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/patients/${id}`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(data),
  });
}

export async function getPatientBillingSummaryApi(token: string, id: number): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/patients/${id}/billing-summary`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function getPatientConsultationsApi(token: string, id: number): Promise<ApiResponse<any[]>> {
  return apiFetch<any[]>(`/patients/${id}/consultations`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function getPatientMedicalHistoryApi(token: string, id: number): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/patients/${id}/medical-history`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function getPatientPrescriptionsApi(token: string, id: number): Promise<ApiResponse<any[]>> {
  return apiFetch<any[]>(`/prescriptions?patient_id=${id}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function createPatientApi(
  token: string,
  patientData: Partial<PatientModel>
): Promise<ApiResponse<PatientModel>> {
  return apiFetch<PatientModel>('/patients', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(patientData),
  });
}
