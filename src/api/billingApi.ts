import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { MedicineBill, TreatmentBill } from '../types/clinicTypes';

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

export async function getTreatmentBillsApi(token: string): Promise<ApiResponse<TreatmentBill[]>> {
  return apiFetch<TreatmentBill[]>('/treatment-bills', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createTreatmentBillApi(
  token: string,
  billData: Partial<TreatmentBill>
): Promise<ApiResponse<TreatmentBill>> {
  return apiFetch<TreatmentBill>('/treatment-bills', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(billData),
  });
}

export async function recordTreatmentBillPaymentApi(
  token: string,
  id: number,
  paymentData: { payment_status: string; payment_mode: string }
): Promise<ApiResponse<TreatmentBill>> {
  return apiFetch<TreatmentBill>(`/treatment-bills/${id}/payment`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(paymentData),
  });
}
