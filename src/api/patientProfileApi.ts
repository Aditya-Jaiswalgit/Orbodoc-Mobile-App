import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';

export interface PatientProfileData {
  id?: number;
  full_name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role?: string;
  gender?: string;
  dob?: string;
  age?: string | number;
  blood_group?: string;
  allergies?: string;
  chronic_conditions?: string;
  medical_history?: string;
  current_medications?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  relation?: string;
  clinic_name?: string;
}

export async function getPatientProfileApi(
  token: string,
  patientId?: number
): Promise<ApiResponse<PatientProfileData>> {
  try {
    const res = await apiFetch<any>('/auth/profile', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (res.success && res.data) {
      const u = res.data.user || res.data;
      return {
        success: true,
        data: u,
      };
    }
  } catch (e) {}

  if (patientId) {
    try {
      const pRes = await apiFetch<any>(`/patients/${patientId}`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (pRes.success && pRes.data) {
        const u = pRes.data.patient || pRes.data.data || pRes.data;
        return {
          success: true,
          data: u,
        };
      }
      return pRes;
    } catch (e) {}
  }

  return { success: false, message: 'Failed to fetch patient profile' };
}

export async function updatePatientProfileApi(
  token: string,
  patientId: number,
  data: Partial<PatientProfileData>
): Promise<ApiResponse<PatientProfileData>> {
  const res = await apiFetch<PatientProfileData>(`/patients/${patientId}`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(data),
  });

  if (!res.success) {
    return apiFetch<PatientProfileData>('/auth/profile', {
      method: 'PUT',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(data),
    });
  }

  return res;
}
