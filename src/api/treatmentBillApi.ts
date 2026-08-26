import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';

export interface TreatmentBillItem {
  id: number;
  service_name: string;
  service_code?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface TreatmentBill {
  id: number;
  bill_number: string;
  clinic_id: number;
  clinic_name?: string;
  patient_id: number;
  patient_name: string;
  patient_phone?: string;
  total_amount: number;
  discount_amount?: number;
  tax_amount?: number;
  paid_amount: number;
  due_amount?: number;
  status: 'paid' | 'unpaid' | 'partially_paid' | 'cancelled';
  created_at: string;
  items?: TreatmentBillItem[];
}

export async function getTreatmentBillsApi(
  token: string,
  queryParams?: string
): Promise<ApiResponse<TreatmentBill[]>> {
  const query = queryParams ? `?${queryParams}` : '';
  return apiFetch<TreatmentBill[]>(`/treatment-bills${query}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function getTreatmentBillByIdApi(
  token: string,
  id: number
): Promise<ApiResponse<TreatmentBill>> {
  return apiFetch<TreatmentBill>(`/treatment-bills/${id}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function createTreatmentBillApi(
  token: string,
  data: Partial<TreatmentBill>
): Promise<ApiResponse<TreatmentBill>> {
  return apiFetch<TreatmentBill>('/treatment-bills', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(data),
  });
}

export async function recordPaymentApi(
  token: string,
  id: number,
  paymentData: { amount: number; payment_method: string }
): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/treatment-bills/${id}/payment`, {
    method: 'PATCH',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(paymentData),
  });
}
