import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { Medicine } from '../types/clinicTypes';

export async function getMedicinesApi(token: string): Promise<ApiResponse<Medicine[]>> {
  return apiFetch<Medicine[]>('/medicines', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getLowStockMedicinesApi(token: string): Promise<ApiResponse<Medicine[]>> {
  return apiFetch<Medicine[]>('/medicines/low-stock', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function searchMedicinesApi(token: string, query: string): Promise<ApiResponse<Medicine[]>> {
  return apiFetch<Medicine[]>(`/medicines/search?q=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createMedicineApi(
  token: string,
  medicine: Partial<Medicine>
): Promise<ApiResponse<Medicine>> {
  return apiFetch<Medicine>('/medicines', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(medicine),
  });
}

export async function adjustMedicineStockApi(
  token: string,
  id: number,
  stockQuantity: number
): Promise<ApiResponse<Medicine>> {
  return apiFetch<Medicine>(`/medicines/${id}/stock`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ stock_quantity: stockQuantity }),
  });
}
