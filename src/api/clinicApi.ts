import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { Clinic } from '../types/clinicTypes';

export async function getClinicsApi(token: string): Promise<ApiResponse<Clinic[]>> {
  try {
    const res = await apiFetch<any>('/clinics', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (res.success && res.data) {
      const list = Array.isArray(res.data)
        ? res.data
        : (res.data.clinics || res.data.data || res.data.providers || []);
      if (list.length > 0) {
        return { success: true, message: 'Success', data: list };
      }
    }
  } catch (e) {}

  try {
    const publicRes = await apiFetch<any>('/public/providers?category=clinic', {
      method: 'GET',
    });

    if (publicRes.success && publicRes.data) {
      const rawProviders = Array.isArray(publicRes.data)
        ? publicRes.data
        : (publicRes.data.providers || publicRes.data.data || []);

      const mapped: Clinic[] = rawProviders.map((p: any) => ({
        id: p.id || p.source_id,
        name: p.name,
        city: p.city || 'Indore',
        state: p.state || 'Madhya Pradesh',
        address: p.address || `${p.city || 'Indore'}, ${p.state || 'Madhya Pradesh'}`,
        phone: p.phone || '0731-2541234',
        email: p.email || 'info@clinic.com',
        status: 'active',
        doctors_count: p.doctors ? p.doctors.length : 1,
      }));

      if (mapped.length > 0) {
        return { success: true, message: 'Success', data: mapped };
      }
    }
  } catch (e) {}

  return { success: false, message: 'No clinics returned from backend API', data: [] };
}

export async function getClinicByIdApi(token: string, id: number): Promise<ApiResponse<Clinic>> {
  return apiFetch<Clinic>(`/clinics/${id}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
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
