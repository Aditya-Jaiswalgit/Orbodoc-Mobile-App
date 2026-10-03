import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { Prescription, PrescriptionItem } from '../types/clinicTypes';

export interface GetPrescriptionsParams {
  patient_id?: number | string;
  clinic_id?: number | string;
  appointment_id?: number | string;
  limit?: number;
  page?: number;
}

export async function getPrescriptionsApi(
  token: string,
  paramsOrPatientId?: number | GetPrescriptionsParams
): Promise<ApiResponse<any>> {
  let query = '';
  if (typeof paramsOrPatientId === 'number' || typeof paramsOrPatientId === 'string') {
    query = `?patient_id=${paramsOrPatientId}`;
  } else if (paramsOrPatientId && typeof paramsOrPatientId === 'object') {
    const q = new URLSearchParams();
    if (paramsOrPatientId.patient_id) q.append('patient_id', String(paramsOrPatientId.patient_id));
    if (paramsOrPatientId.clinic_id) q.append('clinic_id', String(paramsOrPatientId.clinic_id));
    if (paramsOrPatientId.appointment_id) q.append('appointment_id', String(paramsOrPatientId.appointment_id));
    if (paramsOrPatientId.limit) q.append('limit', String(paramsOrPatientId.limit));
    if (paramsOrPatientId.page) q.append('page', String(paramsOrPatientId.page));
    const str = q.toString();
    query = str ? `?${str}` : '';
  }
  return apiFetch<any>(`/prescriptions${query}`, {
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
