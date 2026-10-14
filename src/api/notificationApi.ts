import { apiFetch } from './apiConfig';
import { ApiResponse } from '../types/auth';
import { InboxNotification } from './staffHeaderApi';

export interface NotificationInboxItem {
  not_rec_id: number;
  user_type?: string;
  user_id?: string | number;
  is_read: number | boolean;
  read_at?: string | null;
  not_id: number;
  title?: string;
  message: string;
  entity_type?: string | null;
  entity_id?: string | number | null;
  created_at?: string;
  sent_at?: string;
  not_cat_name?: string;
  category_description?: string;
  recipient_name?: string;
  role_id?: string | number | null;
  role_name?: string | null;
}

export interface NotificationInboxResponse {
  total: number;
  page: number;
  limit: number;
  data: NotificationInboxItem[];
}

export interface NotificationCategoryItem {
  not_cat_id: number;
  not_cat_name: string;
  description?: string;
}

export interface NotificationSubscriptionItem {
  not_sub_id?: number | null;
  user_type?: 'staff' | 'patient' | string | null;
  user_id?: number | string | null;
  user_name?: string | null;
  not_cat_id: number;
  clinic_id?: number | string | null;
  clinic_name?: string | null;
  not_id?: number | string | null;
  not_cat_name: string;
  description?: string;
  message?: string | null;
  notification_created_at?: string | null;
  is_subscribed: number | boolean;
}

export interface NotificationLogItem {
  not_log_id: number;
  not_id: number;
  role_id?: string | number | null;
  role_name?: string | null;
  user_type?: string;
  user_id?: string;
  channel?: string;
  status?: string;
  error_message?: string | null;
  retry_count?: number;
  sent_at?: string;
  message?: string;
}

export interface NotificationClinicOption {
  id: string;
  name: string;
}

export interface NotificationLogsResponse {
  total: number;
  page: number;
  limit: number;
  data: NotificationLogItem[];
}

export interface BroadcastPayload {
  clinic_id?: number;
  not_cat_id: number;
  title?: string;
  message: string;
  role_id?: number;
  target?: 'all' | 'staff' | 'patients' | 'patient';
  recipients?: Array<{ userType: 'staff' | 'patient'; userId: string | number }>;
}

export interface UserRoleRecord {
  role_id: number | string;
  role_name: string;
}

/**
 * 1. Fetch Inbox Notifications
 * Route: GET /api/notifications
 */
export async function fetchMyNotifications(params?: { is_read?: 0 | 1; page?: number; limit?: number }): Promise<ApiResponse<NotificationInboxResponse>> {
  const queryParams: string[] = [];
  if (typeof params?.is_read === 'number') queryParams.push(`is_read=${params.is_read}`);
  if (params?.page) queryParams.push(`page=${params.page}`);
  if (params?.limit) queryParams.push(`limit=${params.limit}`);
  const query = queryParams.length ? `?${queryParams.join('&')}` : '';
  return apiFetch<NotificationInboxResponse>(`/notifications${query}`, { method: 'GET' });
}

/**
 * 2. Unread Notification Count
 * Route: GET /api/notifications/unread-count
 */
export async function fetchUnreadCount(): Promise<ApiResponse<{ count: number }>> {
  return apiFetch<{ count: number }>('/notifications/unread-count', { method: 'GET' });
}

/**
 * 3. Mark Notification as Read
 * Route: PATCH /api/notifications/:id/read
 */
export async function markNotificationAsRead(receiverId: number | string): Promise<ApiResponse<unknown>> {
  return apiFetch<unknown>(`/notifications/${encodeURIComponent(String(receiverId))}/read`, {
    method: 'PATCH',
  });
}

/**
 * 4. Mark All Notifications as Read
 * Route: PATCH /api/notifications/mark-all-read
 */
export async function markAllNotificationsAsRead(): Promise<ApiResponse<{ markedCount: number }>> {
  return apiFetch<{ markedCount: number }>('/notifications/mark-all-read', {
    method: 'PATCH',
  });
}

/**
 * 5. Clear Notification History
 * Route: DELETE /api/notifications/clear
 */
export async function clearMyNotifications(): Promise<ApiResponse<{ clearedCount: number }>> {
  return apiFetch<{ clearedCount: number }>('/notifications/clear', {
    method: 'DELETE',
  });
}

/**
 * 6. Fetch Subscriptions
 * Route: GET /api/notifications/subscriptions
 */
export async function fetchNotificationSubscriptions(params?: { clinicId?: string | number }): Promise<ApiResponse<{ subscriptions: NotificationSubscriptionItem[] }>> {
  const clinicId = String(params?.clinicId ?? '').trim();
  const query = clinicId ? `?clinic_id=${encodeURIComponent(clinicId)}` : '';
  return apiFetch<{ subscriptions: NotificationSubscriptionItem[] }>(`/notifications/subscriptions${query}`, {
    method: 'GET',
  });
}

/**
 * 7. Update Subscriptions
 * Route: PUT /api/notifications/subscriptions
 */
export async function updateNotificationSubscriptions(
  subscriptions: Array<{
    not_sub_id?: number | null;
    user_type?: string | null;
    user_id?: number | string | null;
    not_cat_id: number;
    clinic_id?: number | string | null;
    not_id?: number | string | null;
    is_subscribed: 0 | 1;
  }>,
): Promise<ApiResponse<unknown>> {
  return apiFetch<unknown>('/notifications/subscriptions', {
    method: 'PUT',
    body: JSON.stringify({ subscriptions }),
  });
}

/**
 * 8. Fetch Categories
 * Route: GET /api/notifications/categories
 */
export async function fetchNotificationCategories(): Promise<ApiResponse<{ categories: NotificationCategoryItem[] }>> {
  return apiFetch<{ categories: NotificationCategoryItem[] }>('/notifications/categories', {
    method: 'GET',
  });
}

/**
 * 9. Broadcast Notification
 * Route: POST /api/notifications/broadcast
 */
export async function broadcastNotification(payload: BroadcastPayload): Promise<ApiResponse<unknown>> {
  return apiFetch<unknown>('/notifications/broadcast', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * 10. Fetch Delivery Logs
 * Route: GET /api/notifications/logs
 */
export async function fetchNotificationLogs(): Promise<ApiResponse<NotificationLogsResponse>> {
  return apiFetch<NotificationLogsResponse>('/notifications/logs', {
    method: 'GET',
  });
}

/**
 * 11. Fetch Clinic Options
 * Route: GET /api/clinics/my-clinics
 */
export async function fetchMyClinicOptions(): Promise<NotificationClinicOption[]> {
  try {
    const res = await apiFetch<any>('/clinics/my-clinics', { method: 'GET' });
    const payload = res.data;
    const source = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.clinics)
        ? payload.clinics
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

    return source
      .map((clinic: any) => {
        const id = String(clinic.id ?? clinic.clinic_id ?? '').trim();
        const name = String(clinic.name ?? clinic.clinic_name ?? 'Unnamed Clinic').trim();
        return { id, name };
      })
      .filter((c: NotificationClinicOption) => c.id);
  } catch {
    return [];
  }
}

/**
 * 12. Fetch Roles (for filter)
 * Route: GET /api/user_role
 */
export async function fetchUserRolesApi(): Promise<UserRoleRecord[]> {
  try {
    const res = await apiFetch<any>('/user_role', { method: 'GET' });
    const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
    return list.map((r: any) => ({
      role_id: r.id ?? r.role_id,
      role_name: r.role_name ?? r.name ?? String(r.id),
    }));
  } catch {
    return [];
  }
}

// ── Backward-compatible Aliases ──────────────────────────────
export const getUnreadCountApi = fetchUnreadCount;
export const getInboxNotificationsApi = (isRead = 0) =>
  fetchMyNotifications({ is_read: isRead as 0 | 1 }).then(res => ({
    ...res,
    data: {
      data: (res.data?.data || []) as unknown as InboxNotification[],
      total: res.data?.total || 0,
    },
  }));
export const markNotificationReadApi = markNotificationAsRead;
export const markAllNotificationsReadApi = markAllNotificationsAsRead;
export const broadcastNotificationApi = broadcastNotification;
export type NotificationCategory = NotificationCategoryItem;
export const getNotificationCategoriesApi = fetchNotificationCategories;
