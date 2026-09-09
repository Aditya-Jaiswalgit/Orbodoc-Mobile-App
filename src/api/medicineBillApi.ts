import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';

export interface MedicineBillItem {
  id: number;
  medicine_id?: number;
  medicine_name: string;
  batch_number?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface MedicineBill {
  id: number;
  bill_number: string;
  clinic_id: number;
  clinic_name?: string;
  patient_id: number;
  patient_name: string;
  patient_phone?: string;
  patient_code?: string;
  subtotal?: number;
  total_amount: number;
  net_amount?: number;
  discount_amount?: number;
  tax_amount?: number;
  paid_amount: number;
  due_amount?: number;
  payment_method?: string;
  payment_status?: string;
  status: 'paid' | 'unpaid' | 'partially_paid' | 'partial' | 'cancelled' | string;
  pharmacist_name?: string;
  notes?: string;
  created_at: string;
  items?: MedicineBillItem[];
}

export async function getMedicineBillsApi(
  token: string,
  queryParams?: string
): Promise<ApiResponse<MedicineBill[]>> {
  const query = queryParams ? `?${queryParams}` : '';
  return apiFetch<MedicineBill[]>(`/medicine-bills${query}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function getMedicineBillByIdApi(
  token: string,
  id: number
): Promise<ApiResponse<MedicineBill>> {
  return apiFetch<MedicineBill>(`/medicine-bills/${id}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function createMedicineBillApi(
  token: string,
  data: Partial<MedicineBill>
): Promise<ApiResponse<MedicineBill>> {
  return apiFetch<MedicineBill>('/medicine-bills', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(data),
  });
}

export async function updateMedicineBillApi(
  token: string,
  id: number,
  data: Partial<MedicineBill>
): Promise<ApiResponse<MedicineBill>> {
  return apiFetch<MedicineBill>(`/medicine-bills/${id}`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(data),
  });
}

export async function cancelMedicineBillApi(
  token: string,
  id: number,
  reason?: string
): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/medicine-bills/${id}/cancel`, {
    method: 'PATCH',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify({ reason }),
  });
}

export async function recordMedicinePaymentApi(
  token: string,
  id: number,
  paymentData: { amount: number; payment_method: string }
): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/medicine-bills/${id}/payment`, {
    method: 'PATCH',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(paymentData),
  });
}

