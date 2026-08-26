import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { Prescription, PrescriptionItem } from '../types/clinicTypes';

export async function getPrescriptionsApi(token: string, patientId?: number): Promise<ApiResponse<Prescription[]>> {
  const query = patientId ? `?patient_id=${patientId}` : '';
  return apiFetch<Prescription[]>(`/prescriptions${query}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getPrescriptionByIdApi(token: string, id: number): Promise<ApiResponse<Prescription>> {
  return apiFetch<Prescription>(`/prescriptions/${id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createPrescriptionApi(
  token: string,
  prescriptionData: Partial<Prescription>
): Promise<ApiResponse<Prescription>> {
  return apiFetch<Prescription>('/prescriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(prescriptionData),
  });
}

export async function addPrescriptionItemApi(
  token: string,
  prescriptionId: number,
  item: PrescriptionItem
): Promise<ApiResponse<PrescriptionItem>> {
  return apiFetch<PrescriptionItem>(`/prescriptions/${prescriptionId}/items`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(item),
  });
}

export async function deletePrescriptionItemApi(
  token: string,
  prescriptionId: number,
  itemId: number
): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/prescriptions/${prescriptionId}/items/${itemId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
