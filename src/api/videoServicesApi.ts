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
  patient_id?: number;
  patient_name?: string;
  patient_phone?: string;
  patient_code?: string;
  doctor_id?: number;
  doctor_name: string;
  doctor_phone?: string;
  specialization?: string;
  clinic_name?: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  consultation_mode: string;
  reason?: string;
  video_room_id?: string;
  meeting_link?: string;
}

export interface VideoServicesStats {
  today_video_appointments: number;
  waiting_to_call: number;
  video_revenue_collected: number;
  pending_payment_count: number;
}

export interface VideoConsultancyHistoryItem {
  id: number;
  patient_name: string;
  doctor_name: string;
  date: string;
  duration?: string;
  diagnosis?: string;
  prescription_id?: number;
  status: string;
}

export interface VideoBillingItem {
  id: number;
  bill_number?: string;
  patient_name: string;
  doctor_name: string;
  amount: number;
  payment_status: 'paid' | 'pending';
  date: string;
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

export async function getVideoAppointmentsApi(
  token: string,
  doctorId?: number | string,
  patientId?: number | string
): Promise<ApiResponse<VideoAppointmentItem[]>> {
  let query = 'consultation_mode=video';
  if (doctorId) query += `&doctor_id=${doctorId}`;
  if (patientId) query += `&patient_id=${patientId}`;
  return apiFetch<VideoAppointmentItem[]>(`/appointments?${query}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function getVideoServicesStatsApi(token: string): Promise<ApiResponse<VideoServicesStats>> {
  return apiFetch<VideoServicesStats>('/video-services/stats', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function getVideoConsultancyHistoryApi(token: string): Promise<ApiResponse<VideoConsultancyHistoryItem[]>> {
  return apiFetch<VideoConsultancyHistoryItem[]>('/video-services/history', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function getVideoBillingApi(
  token: string,
  doctorId?: number,
  clinicId?: number
): Promise<ApiResponse<any>> {
  if (doctorId || clinicId) {
    try {
      const queryParams = new URLSearchParams();
      if (doctorId) queryParams.append('doctor_id', String(doctorId));
      if (clinicId) queryParams.append('clinic_id', String(clinicId));
      const res = await apiFetch<any>(`/video-call-billing?${queryParams.toString()}`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.items || []);
      if (res.success && list.length > 0) {
        return res;
      }
    } catch (e) {}
  }

  try {
    const res = await apiFetch<any>('/video-call-billing', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.success && res.data) {
      return res;
    }
  } catch (e) {}

  return apiFetch<any>('/video-services/billing', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function joinVideoCallApi(token: string, appointmentId: number): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/video-services/join/${appointmentId}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
