import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { NotificationItem } from '../types/clinicTypes';

export interface NotificationSubscription {
  user_id: number;
  user_name: string;
  role: string;
  clinic_name?: string;
  categories: string[];
  system_channels: number;
  bell_channels: number;
}

export async function getNotificationsApi(token: string): Promise<ApiResponse<NotificationItem[]>> {
  return apiFetch<NotificationItem[]>('/notifications', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getUnreadCountApi(token: string): Promise<ApiResponse<{ unread_count: number }>> {
  return apiFetch<{ unread_count: number }>('/notifications/unread-count', {
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

export async function getNotificationSubscriptionsApi(token: string): Promise<ApiResponse<NotificationSubscription[]>> {
  return apiFetch<NotificationSubscription[]>('/notifications/subscriptions', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateNotificationSubscriptionsApi(
  token: string,
  categories: string[]
): Promise<ApiResponse<any>> {
  return apiFetch<any>('/notifications/subscriptions', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ categories }),
  });
}
