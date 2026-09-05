import { useCallback, useEffect, useState } from 'react';
import {
  getNotificationsApi,
  getUnreadCountApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  getNotificationSubscriptionsApi,
  updateNotificationSubscriptionsApi,
  clearNotificationsApi,
  broadcastNotificationApi,
  NotificationSubscription,
} from '../api/notificationApi';
import { useAuthContext } from '../context/AuthContext';
import { NotificationItem } from '../types/clinicTypes';

const deduplicateSubscriptions = (items: NotificationSubscription[]): NotificationSubscription[] => {
  const map = new Map<number | string, NotificationSubscription>();
  for (const item of items) {
    const key = item.user_id || item.user_name || 'default';
    const cats = Array.isArray(item.categories)
      ? item.categories
      : typeof item.categories === 'string'
      ? (item.categories as string).split(',').map((c) => c.trim())
      : [];

    if (!map.has(key)) {
      map.set(key, {
        ...item,
        categories: cats,
      });
    } else {
      const existing = map.get(key)!;
      const mergedCats = Array.from(new Set([...existing.categories, ...cats]));
      existing.categories = mergedCats;
      if (item.clinic_name && (!existing.clinic_name || existing.clinic_name === 'NULL')) {
        existing.clinic_name = item.clinic_name;
      }
    }
  }
  return Array.from(map.values());
};

const locallyReadNotificationIds = new Set<number>();
let globallyAllMarkedRead = false;

export const useNotifications = () => {
  const { user, token: authContextToken } = useAuthContext();
  const token = authContextToken || (user as any)?.token || (user as any)?.accessToken || '';
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [subscriptions, setSubscriptions] = useState<NotificationSubscription[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchNotificationData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getNotificationsApi(token);
      let rawList: NotificationItem[] = [];
      if (res && res.data) {
        rawList = Array.isArray(res.data)
          ? res.data
          : (res.data as any).notifications || (res.data as any).data || (res.data as any).rows || [];
      }

      const processedList = rawList.map((n: any, index: number) => {
        const notifId = Number(n.id || n.not_rec_id || n.not_id || index + 1);
        const isRead = Boolean(
          n.is_read === 1 || n.is_read === true || n.read_status === 1 || n.isRead || locallyReadNotificationIds.has(notifId) || globallyAllMarkedRead
        );
        return {
          id: notifId,
          user_id: Number(n.user_id || n.userId || 1),
          title: String(n.title || n.not_cat_name || 'Notification'),
          message: String(n.message || ''),
          type: String(n.type || n.not_cat_name || n.entity_type || 'SYSTEM'),
          is_read: isRead,
          created_at: String(n.created_at || n.sent_at || ''),
        };
      });

      setNotifications(processedList);
      setUnreadCount(processedList.filter((n) => !n.is_read).length);

      try {
        const subRes = await getNotificationSubscriptionsApi(token);
        if (subRes.success && subRes.data) {
          const rawSub = Array.isArray(subRes.data)
            ? subRes.data
            : (subRes.data as any).subscriptions || (subRes.data as any).data || [];

          const deduped = deduplicateSubscriptions(rawSub);
          setSubscriptions(deduped);
        }
      } catch (e) {
        // silent
      }
    } catch (err: any) {
      setError(err.message || 'Error loading notifications');
    } finally {
      setLoading(false);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, [token, user]);

  const markRead = async (id: number) => {
    locallyReadNotificationIds.add(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await markNotificationReadApi(token, id);
    } catch (e) {}
  };

  const markAllRead = async () => {
    globallyAllMarkedRead = true;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsReadApi(token);
    } catch (e) {}
  };

  const clearNotifications = async () => {
    setNotifications([]);
    setUnreadCount(0);
    try {
      await clearNotificationsApi(token);
      await fetchNotificationData();
    } catch (e) {}
  };

  const broadcastNotification = async (payload: { title: string; message: string; target_role?: string; category?: string }) => {
    setLoading(true);
    try {
      const res = await broadcastNotificationApi(token, payload);
      await fetchNotificationData();
      return { success: res.success || !!res.data, message: res.message || 'Broadcast notification sent' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to send broadcast' };
    } finally {
      setLoading(false);
    }
  };

  const updateSubCategories = async (categories: string[]) => {
    try {
      await updateNotificationSubscriptionsApi(token, categories);
      fetchNotificationData();
    } catch (e) {}
  };

  useEffect(() => {
    fetchNotificationData();

    const interval = setInterval(() => {
      fetchNotificationData();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchNotificationData]);

  return {
    notifications,
    unreadCount,
    subscriptions,
    loading,
    error,
    lastRefreshed,
    refreshNotifications: fetchNotificationData,
    markRead,
    markAllRead,
    clearNotifications,
    broadcastNotification,
    updateSubCategories,
  };
};

export default useNotifications;
