import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { Medicine } from '../types/clinicTypes';

export interface MedicineListParams {
  clinic_id?: number | string | null;
  page?: number;
  limit?: number;
  search?: string;
  low_stock?: boolean;
  is_active?: number;
}

export interface MedicineListData {
  total?: number;
  page?: number;
  limit?: number;
  data?: Medicine[];
  medicines?: Medicine[];
  count?: number;
}

export interface MedicinePayload {
  clinic_id?: number | string;
  name: string;
  generic_name?: string;
  manufacturer?: string;
  category: string;
  form?: string;
  unit_price: number;
  stock_quantity: number;
  reorder_level: number;
  expiry_date?: string | null;
  batch_number?: string;
  hsn_code?: string;
  gst_percent?: number;
  is_active?: number | boolean;
}

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function getMedicinesApi(
  token: string,
  params: MedicineListParams = {},
): Promise<ApiResponse<MedicineListData>> {
  const query = new URLSearchParams();
  if (params.clinic_id != null) query.set('clinic_id', String(params.clinic_id));
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.low_stock) query.set('low_stock', 'true');
  if (params.is_active !== undefined) query.set('is_active', String(params.is_active));
  return apiFetch<MedicineListData>(`/medicines?${query.toString()}`, {
    method: 'GET', headers: authHeaders(token),
  });
}

export async function getLowStockMedicinesApi(
  token: string,
  clinicId?: number | string | null,
): Promise<ApiResponse<MedicineListData>> {
  const query = clinicId == null ? '' : `?clinic_id=${encodeURIComponent(String(clinicId))}`;
  return apiFetch<MedicineListData>(`/medicines/low-stock${query}`, {
    method: 'GET', headers: authHeaders(token),
  });
}

export async function searchMedicinesApi(token: string, query: string, clinicId?: number | string | null): Promise<ApiResponse<Medicine[]>> {
  const params = new URLSearchParams({ q: query });
  if (clinicId != null) params.set('clinic_id', String(clinicId));
  return apiFetch<Medicine[]>(`/medicines/search?${params.toString()}`, {
    method: 'GET', headers: authHeaders(token),
  });
}

export async function createMedicineApi(token: string, medicine: MedicinePayload): Promise<ApiResponse<{ medicine: Medicine }>> {
  return apiFetch<{ medicine: Medicine }>('/medicines', {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify(medicine),
  });
}

export async function updateMedicineApi(token: string, id: number, medicine: MedicinePayload): Promise<ApiResponse<{ medicine: Medicine }>> {
  return apiFetch<{ medicine: Medicine }>(`/medicines/${id}`, {
    method: 'PUT', headers: authHeaders(token), body: JSON.stringify(medicine),
  });
}

export async function adjustMedicineStockApi(
  token: string,
  id: number,
  quantity: number,
  type: 'add' | 'remove' = 'add',
): Promise<ApiResponse<{ medicine: Medicine }>> {
  return apiFetch<{ medicine: Medicine }>(`/medicines/${id}/stock`, {
    method: 'PATCH', headers: authHeaders(token),
    body: JSON.stringify({ quantity, type }),
  });
}

export async function deleteMedicineApi(token: string, id: number): Promise<ApiResponse<null>> {
  return apiFetch<null>(`/medicines/${id}`, {
    method: 'DELETE', headers: authHeaders(token),
  });
}

export async function uploadMedicinesExcelApi(
  token: string,
  clinicId: number | string,
  file: { uri: string; name: string; type: string },
): Promise<ApiResponse<Record<string, unknown>>> {
  const form = new FormData();
  form.append('clinic_id', String(clinicId));
  form.append('file', file as unknown as Blob);
  return apiFetch<Record<string, unknown>>('/medicines/upload-excel', {
    method: 'POST', headers: authHeaders(token), body: form,
  });
}

export async function getExistingMedicineBatchesApi(
  token: string,
  clinicId: number | string,
  batchNumbers: string[],
): Promise<ApiResponse<{ existingBatchNumbers: string[] }>> {
  return apiFetch<{ existingBatchNumbers: string[] }>('/medicines/import-preview', {
    method: 'POST', headers: authHeaders(token),
    body: JSON.stringify({ clinic_id: clinicId, batch_numbers: batchNumbers }),
  });
}
