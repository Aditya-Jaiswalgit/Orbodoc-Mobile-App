import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { NotificationItem } from '../types/clinicTypes';

/**
 * 1. Unread Notification Count
 * Route: GET /api/notifications/unread-count
 */
export async function getUnreadCountApi(): Promise<ApiResponse<{ unreadCount: number }>> {
  return apiFetch<{ unreadCount: number }>('/notifications/unread-count', {
    method: 'GET',
  });
}

/**
 * 2. Inbox Notifications List
 * Route: GET /api/notifications?is_read=0
 */
export async function getInboxNotificationsApi(
  isRead: number = 0
): Promise<ApiResponse<NotificationItem[]>> {
  return apiFetch<NotificationItem[]>(`/notifications?is_read=${isRead}`, {
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
  payload: { title: string; message: string; target_role?: string }
): Promise<ApiResponse<any>> {
  return apiFetch<any>('/notifications/broadcast', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
