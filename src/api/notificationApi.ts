import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { NotificationItem } from '../types/clinicTypes';

export async function getNotificationsApi(token: string): Promise<ApiResponse<NotificationItem[]>> {
  return apiFetch<NotificationItem[]>('/notifications', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function markNotificationReadApi(token: string, id: number): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/notifications/${id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function markAllNotificationsReadApi(token: string): Promise<ApiResponse<any>> {
  return apiFetch<any>('/notifications/mark-all-read', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function broadcastNotificationApi(
  token: string,
  payload: { title: string; message: string; target_role?: string }
): Promise<ApiResponse<any>> {
  return apiFetch<any>('/notifications/broadcast', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}
