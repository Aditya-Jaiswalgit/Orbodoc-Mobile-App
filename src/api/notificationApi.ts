import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { InboxNotification } from './staffHeaderApi';

/**
 * 1. Unread Notification Count
 * Route: GET /api/notifications/unread-count
 */
export async function getUnreadCountApi(): Promise<ApiResponse<{ count: number }>> {
  return apiFetch<{ count: number }>('/notifications/unread-count', {
    method: 'GET',
  });
}

/**
 * 2. Inbox Notifications List
 * Route: GET /api/notifications?is_read=0
 */
export async function getInboxNotificationsApi(
  isRead: number = 0
): Promise<ApiResponse<{ data: InboxNotification[]; total: number }>> {
  return apiFetch<{ data: InboxNotification[]; total: number }>(`/notifications?is_read=${isRead}`, {
    method: 'GET',
  });
}

/**
 * 3. Mark Notification as Read
 * Route: PATCH /api/notifications/{notificationId}/read
 */
export async function markNotificationReadApi(
  id: number | string
): Promise<ApiResponse<any>> {
  return apiFetch<any>(`/notifications/${encodeURIComponent(String(id))}/read`, {
    method: 'PATCH',
  });
}

/**
 * 4. Mark All Notifications as Read
 * Route: PATCH /api/notifications/mark-all-read
 */
export async function markAllNotificationsReadApi(): Promise<ApiResponse<any>> {
  return apiFetch<any>('/notifications/mark-all-read', {
    method: 'PATCH',
  });
}

/**
 * 5. Broadcast Notification
 * Route: POST /api/notifications/broadcast
 */
export async function broadcastNotificationApi(
  payload: { title: string; message: string; not_cat_id: number; clinic_id: number; target: 'all' | 'staff' | 'patients' }
): Promise<ApiResponse<any>> {
  return apiFetch<any>('/notifications/broadcast', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface NotificationCategory { not_cat_id: number; not_cat_name: string }
export const getNotificationCategoriesApi = () => apiFetch<{ categories: NotificationCategory[] }>('/notifications/categories');
