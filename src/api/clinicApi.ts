import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { Clinic } from '../types/clinicTypes';

export async function getClinicsApi(
  token: string,
): Promise<ApiResponse<Clinic[]>> {
  return apiFetch<Clinic[]>('/clinics', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getClinicByIdApi(
  token: string,
  id: number,
): Promise<ApiResponse<Clinic>> {
  return apiFetch<Clinic>(`/clinics/${id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createClinicApi(
  token: string,
  clinicData: Record<string, unknown>,
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
  clinicData: Record<string, unknown>,
): Promise<ApiResponse<Clinic>> {
  return apiFetch<Clinic>(`/clinics/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(clinicData),
  });
}

export async function deleteClinicApi(
  token: string,
  id: number,
): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/clinics/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getMyClinicsApi(signal?: AbortSignal) {
  return apiFetch<{ clinics: Array<Record<string, any>> }>(
    '/clinics/my-clinics',
    { signal },
  );
}

export function getClinicAdminNetworkApi(
  clinicId: string | number,
  signal?: AbortSignal,
) {
  return apiFetch<{ data: Array<Record<string, any>> }>(
    `/staff/clinic/${encodeURIComponent(String(clinicId))}/admin-network`,
    { signal },
  );
}

export function getClinicPerformanceApi(
  clinicId: string | number,
  date: string,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({ clinic_id: String(clinicId), date });
  return apiFetch<{ stats: Record<string, unknown> }>(
    `/dashboard?${query.toString()}`,
    { signal },
  );
}

export function getClinicLocationsApi(signal?: AbortSignal) {
  return Promise.all([
    apiFetch<any[]>('/location/states', { signal }),
    apiFetch<any[]>('/location/countries', { signal }),
  ]);
}

export function getClinicCitiesApi(
  stateId: string | number,
  signal?: AbortSignal,
) {
  return apiFetch<any[]>(
    `/location/cities/${encodeURIComponent(String(stateId))}`,
    { signal },
  );
}

export function getClinicDetailsApi(id: string | number) {
  return apiFetch<{ clinic?: Record<string, any> }>(
    `/clinics/${encodeURIComponent(String(id))}`,
  );
}
