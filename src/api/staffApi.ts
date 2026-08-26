import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { StaffMember } from '../types/clinicTypes';

export async function getStaffApi(token: string): Promise<ApiResponse<StaffMember[]>> {
  return apiFetch<StaffMember[]>('/staff', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getDoctorsApi(token: string): Promise<ApiResponse<StaffMember[]>> {
  return apiFetch<StaffMember[]>('/staff/doctors', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getStaffByIdApi(token: string, id: number): Promise<ApiResponse<StaffMember>> {
  return apiFetch<StaffMember>(`/staff/${id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createStaffApi(
  token: string,
  staffData: Partial<StaffMember> & { password?: string }
): Promise<ApiResponse<StaffMember>> {
  return apiFetch<StaffMember>('/staff', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(staffData),
  });
}

export async function updateStaffApi(
  token: string,
  id: number,
  staffData: Partial<StaffMember>
): Promise<ApiResponse<StaffMember>> {
  return apiFetch<StaffMember>(`/staff/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(staffData),
  });
}

export async function deleteStaffApi(token: string, id: number): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/staff/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
