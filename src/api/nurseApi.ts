import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';

export interface NurseDashboardData {
  vitalsRecordedToday?: number;
  pendingVitalsCount?: number;
  totalPatientsCount?: number;
  todayAppointmentsCount?: number;
  recentQueue?: Array<{
    id: number;
    patient_name: string;
    patient_age?: number;
    patient_gender?: string;
    doctor_name?: string;
    vitals_status?: string;
    vital_bp?: string;
    vital_pulse?: string;
    vital_temp?: string;
  }>;
}

export async function getNurseDashboardApi(token: string): Promise<ApiResponse<NurseDashboardData>> {
  return apiFetch<NurseDashboardData>('/dashboard/nurse', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updatePatientVitalsApi(
  token: string,
  patientId: number,
  vitalsData: {
    vital_bp?: string;
    vital_pulse?: string;
    vital_temp?: string;
    vital_weight?: string;
    symptoms?: string;
  }
): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/patients/${patientId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(vitalsData),
  });
}
