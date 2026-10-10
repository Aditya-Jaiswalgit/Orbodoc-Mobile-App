import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { MedicineBill, TreatmentBill } from '../types/clinicTypes';

// Medicine Bills
export interface FetchMedicineBillsParams {
  clinic_id?: number | string | null;
  search?: string;
  status?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface MedicineBillsResponseData {
  data: Array<MedicineBill & Record<string, any>>;
  total: number;
  page: number;
  limit: number;
}

export interface MedicineBillCreatePayload {
  clinic_id: number | string;
  patient_id: number;
  pharmacist_id?: number;
  prescription_id?: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_method: string;
  status: string;
  notes?: string;
  items: Array<{
    medicine_id: number | null;
    medicine_name: string;
    batch_number?: string;
    quantity: number;
    unit_price: number;
    discount_pct: number;
    tax_pct: number;
    total_price: number;
  }>;
}

export async function getMedicineBillsApi(token: string, params: FetchMedicineBillsParams = {}): Promise<ApiResponse<MedicineBillsResponseData | MedicineBill[]>> {
  const query = new URLSearchParams();
  if (params.clinic_id != null) query.set('clinic_id', String(params.clinic_id));
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.date) query.set('date', params.date);
  if (params.date_from) query.set('date_from', params.date_from);
  if (params.date_to) query.set('date_to', params.date_to);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  return apiFetch<MedicineBillsResponseData | MedicineBill[]>(`/medicine-bills${query.size ? `?${query.toString()}` : ''}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getMedicineBillByIdApi(token: string, id: number | string): Promise<ApiResponse<{ bill: MedicineBill } | MedicineBill>> {
  return apiFetch<{ bill: MedicineBill } | MedicineBill>(`/medicine-bills/${id}`, {
    method: 'GET', headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createMedicineBillApi(
  token: string,
  billData: MedicineBillCreatePayload
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
  paymentData: { paid_amount: number; status?: string }
): Promise<ApiResponse<MedicineBill>> {
  return apiFetch<MedicineBill>(`/medicine-bills/${id}/payment`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(paymentData),
  });
}

export interface MedicineBillUpdatePayload {
  discount_amount?: number;
  tax_amount?: number;
  paid_amount?: number;
  payment_method?: string;
  status?: string;
  notes?: string;
}

export async function updateMedicineBillApi(token: string, id: number, data: MedicineBillUpdatePayload): Promise<ApiResponse<{ bill: MedicineBill } | MedicineBill>> {
  return apiFetch<{ bill: MedicineBill } | MedicineBill>(`/medicine-bills/${id}`, {
    method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(data),
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
