import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';

export interface WalletBalanceData {
  wallet_id: number;
  balance: number;
}

export interface WalletTransactionItem {
  id: number;
  type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
}

export interface VideoAppointmentItem {
  id: number;
  appointment_date: string;
  appointment_time: string;
  doctor_name: string;
  specialization?: string;
  clinic_name?: string;
  status: string;
  consultation_mode: string;
  reason?: string;
  video_room_id?: string;
}

export async function getWalletBalanceApi(token: string): Promise<ApiResponse<WalletBalanceData>> {
  return apiFetch<WalletBalanceData>('/wallet/balance', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function getWalletTransactionsApi(token: string): Promise<ApiResponse<WalletTransactionItem[]>> {
  return apiFetch<WalletTransactionItem[]>('/wallet/transactions', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function getVideoAppointmentsApi(token: string): Promise<ApiResponse<VideoAppointmentItem[]>> {
  return apiFetch<VideoAppointmentItem[]>('/appointments?consultation_mode=video', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
