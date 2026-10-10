import { apiFetch, BASE_URL } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { Prescription, PrescriptionItem } from '../types/clinicTypes';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { Platform } from 'react-native';

export interface GetPrescriptionsParams {
  patient_id?: number | string;
  clinic_id?: number | string;
  appointment_id?: number | string;
  doctor_id?: number | string;
  search?: string;
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
    if (paramsOrPatientId.doctor_id) q.append('doctor_id', String(paramsOrPatientId.doctor_id));
    if (paramsOrPatientId.search?.trim()) q.append('search', paramsOrPatientId.search.trim());
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
  prescriptionData: Partial<Prescription> & Record<string, unknown>
): Promise<ApiResponse<Prescription>> {
  return apiFetch<Prescription>('/prescriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(prescriptionData),
  });
}

export async function updatePrescriptionApi(
  token: string,
  id: number,
  prescriptionData: Partial<Prescription> & Record<string, unknown>,
): Promise<ApiResponse<Prescription>> {
  return apiFetch<Prescription>(`/prescriptions/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(prescriptionData),
  });
}

export async function downloadPrescriptionPdfApi(token: string, id: number) {
  const endpoint = `${BASE_URL}/prescriptions/${id}/pdf`;
  const filename = `prescription-${id}.pdf`;
  const path = Platform.OS === 'android'
    ? `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${filename}`
    : `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${filename}`;
  const result = await ReactNativeBlobUtil.config({
    ...(Platform.OS === 'android'
      ? { addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          title: filename,
          description: 'Prescription PDF',
          mime: 'application/pdf',
          mediaScannable: true,
          path,
        } }
      : { path, fileCache: false }),
  }).fetch('GET', endpoint, { Authorization: `Bearer ${token}` });
  if (result.info().status < 200 || result.info().status >= 300) {
    throw new Error('Unable to download prescription PDF.');
  }
  return result.path();
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
