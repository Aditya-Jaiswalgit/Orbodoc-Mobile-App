import { apiFetch } from './apiConfig';

export interface ClinicPlan {
  id: number | string;
  name?: string;
  plan_name?: string | null;
  plan_type?: string | null;
  plan_status?: string | null;
  plan_price?: number | string | null;
  billing_cycle?: string | null;
  plan_started_at?: string | null;
  plan_ends_at?: string | null;
}

export interface InboxNotification {
  not_rec_id: number;
  title?: string;
  message: string;
  sent_at?: string;
  created_at?: string;
  entity_type?: string;
  not_cat_name?: string;
  is_read: number | boolean | string;
}

export const fetchHeaderInbox = (page = 1, limit = 20) => apiFetch<{ data: InboxNotification[]; total: number }>(`/notifications?page=${page}&limit=${limit}`);
export const fetchHeaderUnreadCount = () => apiFetch<{ count: number | string }>('/notifications/unread-count');
export const fetchClinicPlans = () => apiFetch<{ clinics: ClinicPlan[] }>('/clinics/my-clinics');
export const clearHeaderNotifications = () => apiFetch('/notifications/clear', { method: 'DELETE' });
export const updateVideoAvailability = (enabled: boolean) => apiFetch('/auth/profile', {
  method: 'PUT', body: JSON.stringify({ is_video_enabled: enabled ? 1 : 0 }),
});
