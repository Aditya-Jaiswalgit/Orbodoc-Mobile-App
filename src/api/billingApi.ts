import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { MedicineBill, TreatmentBill } from '../types/clinicTypes';

// Medicine Bills
export async function getMedicineBillsApi(token: string): Promise<ApiResponse<MedicineBill[]>> {
  return apiFetch<MedicineBill[]>('/medicine-bills', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createMedicineBillApi(
  token: string,
  billData: Partial<MedicineBill>
): Promise<ApiResponse<MedicineBill>> {
  return apiFetch<MedicineBill>('/medicine-bills', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(billData),
  });
}

export async function recordMedicineBillPaymentApi(
  token: string,
  id: number,
  paymentData: { payment_status: string; payment_mode: string }
): Promise<ApiResponse<MedicineBill>> {
  return apiFetch<MedicineBill>(`/medicine-bills/${id}/payment`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(paymentData),
  });
}

export async function cancelMedicineBillApi(token: string, id: number): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/medicine-bills/${id}/cancel`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Treatment Bills
export interface FetchTreatmentBillsParams {
  clinic_id?: number | string | null;
  patient_id?: number | string | null;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  date?: string;
  date_from?: string;
  date_to?: string;
}

export interface TreatmentBillsResponseData {
  data: TreatmentBill[];
  total: number;
  page: number;
  limit: number;
}

export async function getTreatmentBillsApi(
  token: string,
  params: FetchTreatmentBillsParams = {}
): Promise<ApiResponse<TreatmentBillsResponseData | TreatmentBill[]>> {
  const queryParts: string[] = [];
  if (params.clinic_id !== undefined && params.clinic_id !== null && params.clinic_id !== 'all') {
    queryParts.push(`clinic_id=${encodeURIComponent(String(params.clinic_id))}`);
  }
  if (params.patient_id) queryParts.push(`patient_id=${encodeURIComponent(String(params.patient_id))}`);
  if (params.status && params.status !== 'all') queryParts.push(`status=${encodeURIComponent(params.status)}`);
  if (params.search && params.search.trim()) queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);
  if (params.page) queryParts.push(`page=${encodeURIComponent(String(params.page))}`);
  if (params.limit) queryParts.push(`limit=${encodeURIComponent(String(params.limit))}`);
  if (params.date) queryParts.push(`date=${encodeURIComponent(params.date)}`);
  if (params.date_from) queryParts.push(`date_from=${encodeURIComponent(params.date_from)}`);
  if (params.date_to) queryParts.push(`date_to=${encodeURIComponent(params.date_to)}`);

  const query = queryParts.length ? `?${queryParts.join('&')}` : '';
  return apiFetch<TreatmentBillsResponseData | TreatmentBill[]>(`/treatment-bills${query}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getTreatmentBillByIdApi(
  token: string,
  id: number | string
): Promise<ApiResponse<{ bill: TreatmentBill } | TreatmentBill>> {
  return apiFetch<{ bill: TreatmentBill } | TreatmentBill>(`/treatment-bills/${id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createTreatmentBillApi(
  token: string,
  billData: any
): Promise<ApiResponse<{ bill: TreatmentBill } | TreatmentBill>> {
  return apiFetch<{ bill: TreatmentBill } | TreatmentBill>('/treatment-bills', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(billData),
  });
}

export async function updateTreatmentBillApi(
  token: string,
  id: number | string,
  billData: any
): Promise<ApiResponse<{ bill: TreatmentBill } | TreatmentBill>> {
  return apiFetch<{ bill: TreatmentBill } | TreatmentBill>(`/treatment-bills/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(billData),
  });
}

export async function recordTreatmentBillPaymentApi(
  token: string,
  id: number | string,
  paymentData: { paid_amount: number; status?: string; payment_method?: string }
): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/treatment-bills/${id}/payment`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(paymentData),
  });
}

export async function cancelTreatmentBillApi(
  token: string,
  id: number | string,
  reason: string = 'Cancelled by user'
): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/treatment-bills/${id}/cancel`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason }),
  });
}
