import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { Clinic } from '../types/clinicTypes';

export async function getClinicsApi(token: string): Promise<ApiResponse<Clinic[]>> {
  return apiFetch<Clinic[]>('/clinics', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getClinicByIdApi(token: string, id: number): Promise<ApiResponse<Clinic>> {
  return apiFetch<Clinic>(`/clinics/${id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createClinicApi(
  token: string,
  clinicData: Partial<Clinic>
): Promise<ApiResponse<Clinic>> {
  return apiFetch<Clinic>('/clinics', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(clinicData),
  });
}

export async function updateClinicApi(
  token: string,
  id: number,
  clinicData: Partial<Clinic>
): Promise<ApiResponse<Clinic>> {
  return apiFetch<Clinic>(`/clinics/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(clinicData),
  });
}

export async function deleteClinicApi(token: string, id: number): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/clinics/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
