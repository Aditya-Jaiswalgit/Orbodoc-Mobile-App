import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';

export interface StartVideoCallResponse {
  videoRoomId: string;
  callStartedAt: string;
  message?: string;
  warning?: string | null;
}

export interface EndVideoCallResponse {
  message?: string;
  callEndedAt?: string;
  actualDurationSeconds?: number;
}

/**
 * Doctor starts the video call for an appointment.
 */
export async function startVideoCallApi(
  token: string,
  appointmentId: number,
  allowInsufficientBalance: boolean = false
): Promise<ApiResponse<StartVideoCallResponse>> {
  return apiFetch<StartVideoCallResponse>(`/appointments/${appointmentId}/start-call`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify({ allow_insufficient_balance: allowInsufficientBalance }),
  });
}

/**
 * Doctor or Staff ends the video call.
 */
export async function endVideoCallApi(
  token: string,
  appointmentId: number
): Promise<ApiResponse<EndVideoCallResponse>> {
  return apiFetch<EndVideoCallResponse>(`/appointments/${appointmentId}/end-call`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

/**
 * Patient or Doctor joins the video call room.
 */
export async function joinVideoCallApi(
  token: string,
  appointmentId: number
): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/video-services/join/${appointmentId}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
