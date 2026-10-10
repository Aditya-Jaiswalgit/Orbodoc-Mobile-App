import { apiFetch, BASE_URL } from './apiConfig';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { Platform } from 'react-native';
import { ApiResponse } from '../types/auth';
import { Appointment } from '../types/clinicTypes';

export interface VideoCallBill {
  id: number;
  appointment_id: number;
  clinic_id?: number;
  patient_id?: number;
  doctor_id?: number;
  patient_name?: string;
  patient_phone?: string;
  patient_code?: string;
  doctor_name?: string;
  doctor_type?: string;
  specialization?: string;
  appointment_date?: string;
  appointment_time?: string;
  gross_amount?: number;
  total_minutes?: number;
  duration_minutes?: number;
  actual_duration_seconds?: number;
  rate_per_minute?: number;
  commission_percent?: number;
  commission_amount?: number;
  doctor_payout_amount?: number;
  payment_source?: string;
  payment_status?: string;
  refunded_amount?: number;
  settled_at?: string | null;
  created_at?: string;
  clinic_name?: string;
  clinic_address?: string;
  clinic_city?: string;
  clinic_state?: string;
  clinic_postal_code?: string;
  clinic_phone?: string;
  clinic_email?: string;
  clinic_logo_url?: string;
};

export interface VideoPaymentSession {
  appointment_id: number;
  billing_model?: 'fixed_fee' | 'per_minute';
  payment_method?: string;
  quoted_amount?: number;
  status?: string;
  final_amount?: number;
  refunded_amount?: number;
}

export interface VideoPaymentQuote {
  billing_model: 'fixed_fee' | 'per_minute';
  doctor_type: string;
  consultation_fee: number;
  rate_per_minute: number;
  reserve_minutes: number;
  reserve_amount: number;
  quoted_amount: number;
  grace_seconds: number;
}

export interface VideoQuoteResponse {
  appointment: Appointment;
  session: VideoPaymentSession | null;
  wallet: { wallet_id: number; balance: number };
  quote: VideoPaymentQuote;
}

export interface MarketplaceVideoDoctor {
  id: number;
  full_name?: string;
  name?: string;
  specialization?: string;
  department?: string;
  clinic_id?: number;
  clinic_name?: string;
  consultation_fee?: number;
  is_video_enabled?: number | boolean;
  doctor_type?: string;
  avg_rating?: number;
  experience_years?: number;
}

function queryString(params: Record<string, string | number | null | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return query.size ? `?${query.toString()}` : '';
}

export const getVideoAppointmentsApi = (token: string, clinicId?: number | string | null) =>
  apiFetch<{ data?: Appointment[]; appointments?: Appointment[] } | Appointment[]>(
    `/appointments${queryString({ page: 1, limit: 200, clinic_id: clinicId })}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

export const getVideoBillsApi = (token: string, clinicId?: number | string | null) =>
  apiFetch<{ data?: VideoCallBill[]; total?: number } | VideoCallBill[]>(
    `/video-call-billing${queryString({ page: 1, limit: 200, clinic_id: clinicId })}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

export const getVideoBillApi = (token: string, billId: number) =>
  apiFetch<{ bill: VideoCallBill }>(`/video-call-billing/${billId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const refundVideoBillApi = (token: string, billId: number) =>
  apiFetch<{ bill: VideoCallBill; refund_amount?: number }>(`/video-call-billing/${billId}/refund`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

export const startVideoCallApi = (
  token: string,
  appointmentId: number,
  allowInsufficientBalance = false,
) => apiFetch<{ videoRoomId?: string; warning?: string }>(
  `/appointments/${appointmentId}/start-call`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(allowInsufficientBalance ? { allow_insufficient_balance: true } : {}),
  },
);

export const getPatientWalletBalanceApi = (token: string) =>
  apiFetch<{ balance: number }>('/wallet/balance', {
    headers: { Authorization: `Bearer ${token}` },
  });

export interface WalletRechargeOrder {
  key_id: string;
  order_id: string;
  amount: number;
  currency: string;
  display_amount: number;
}

export const createWalletRechargeOrderApi = (token: string, amount: number) =>
  apiFetch<WalletRechargeOrder>('/wallet/recharge/create-order', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount }),
  });

export const verifyWalletRechargeApi = (
  token: string,
  payment: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
) => apiFetch<{ balance: number }>('/wallet/recharge/verify', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify(payment),
});

export const getVideoPaymentSessionsApi = (token: string, appointmentIds: number[]) => {
  if (!appointmentIds.length) {
    return Promise.resolve({ success: true, message: 'No video appointments', data: { data: [] } } as ApiResponse<{ data: VideoPaymentSession[] }>);
  }
  return apiFetch<{ data?: VideoPaymentSession[] } | VideoPaymentSession[]>(
    `/video-payments${queryString({ appointment_ids: appointmentIds.join(',') })}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
};

export const getVideoPaymentQuoteApi = (token: string, appointmentId: number) =>
  apiFetch<VideoQuoteResponse>(`/video-payments/quote${queryString({ appointment_id: appointmentId })}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const confirmVideoPaymentApi = (
  token: string,
  appointmentId: number,
  paymentMethod: 'wallet' | 'upi' | 'card' | 'net_banking',
  paymentGatewayRef?: string,
) => apiFetch<{ session: VideoPaymentSession; quote: VideoPaymentQuote }>('/video-payments/confirm', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    appointment_id: appointmentId,
    payment_method: paymentMethod,
    payment_gateway_ref: paymentGatewayRef || undefined,
  }),
});

export async function downloadVideoBillPdfApi(token: string, billId: number) {
  const endpoint = `${BASE_URL}/video-call-billing/${billId}/pdf`;
  if (Platform.OS === 'android') {
    const result = await ReactNativeBlobUtil.config({
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        title: `video-consultation-bill-${billId}.pdf`,
        description: 'Video consultation bill',
        mime: 'application/pdf',
        mediaScannable: true,
        path: `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/video-consultation-bill-${billId}.pdf`,
      },
    }).fetch('GET', endpoint, { Authorization: `Bearer ${token}` });
    if (result.info().status < 200 || result.info().status >= 300) {
      throw new Error('Unable to download video consultation bill.');
    }
    return;
  }

  const filePath = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/video-consultation-bill-${billId}.pdf`;
  const result = await ReactNativeBlobUtil.config({ path: filePath, fileCache: false })
    .fetch('GET', endpoint, { Authorization: `Bearer ${token}` });
  if (result.info().status < 200 || result.info().status >= 300) {
    throw new Error('Unable to download video consultation bill.');
  }
}

export const getMarketplaceVideoDoctorsApi = () =>
  apiFetch<MarketplaceVideoDoctor[]>('/doctors/marketplace?limit=50');

export const getMarketplaceVideoSlotsApi = (doctorId: number, date: string) =>
  apiFetch<{ slots?: Array<string | { time?: string; available?: boolean; is_available?: boolean }> }>(
    `/doctors/marketplace/slots${queryString({ doctor_id: doctorId, date })}`,
  );

export const getVideoPricingPreviewApi = (
  token: string,
  doctorId: number,
  patientId: number,
  clinicId?: number | string | null,
) => apiFetch<{ pricing?: { consultation_fee?: number; wallet_balance?: number; required_amount?: number; has_sufficient_balance?: boolean } }>(
  `/appointments/video-pricing-preview${queryString({ doctor_id: doctorId, patient_id: patientId, clinic_id: clinicId, consultation_mode: 'video' })}`,
  { headers: { Authorization: `Bearer ${token}` } },
);

export const bookMarketplaceVideoAppointmentApi = (payload: {
  doctor_id: number;
  full_name: string;
  phone: string;
  appointment_date: string;
  appointment_time: string;
  consultation_mode: 'video';
  reason?: string;
}) => apiFetch<{ appointment?: Appointment; video_room_id?: string; login_credentials?: { password?: string } }>(
  '/doctors/marketplace/book-consultation',
  { method: 'POST', body: JSON.stringify(payload) },
);
