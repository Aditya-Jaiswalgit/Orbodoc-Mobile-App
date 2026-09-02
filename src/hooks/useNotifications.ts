import { useCallback, useEffect, useState } from 'react';
import {
  getNotificationsApi,
  getUnreadCountApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  getNotificationSubscriptionsApi,
  updateNotificationSubscriptionsApi,
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
  const { token, user } = useAuthContext();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [subscriptions, setSubscriptions] = useState<NotificationSubscription[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchNotificationData = useCallback(async () => {
    if (!token) return;
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

      const processedList = rawList.map((n) => {
        const isRead = Boolean(
          n.is_read || locallyReadNotificationIds.has(n.id) || globallyAllMarkedRead
        );
        return { ...n, is_read: isRead };
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
          setSubscriptions(deduped.length > 0 ? deduped : [
            {
              user_id: Number(user?.userId || user?.id || 1),
              user_name: user?.fullName || user?.full_name || 'Patient',
              role: 'Patient',
              clinic_name: user?.clinicName || user?.clinic_name || 'Clinic',
              categories: [
                'User Registration',
                'User Update',
                'Password Change',
                'Appointment',
                'Billing',
              ],
              system_channels: 15,
              bell_channels: 15,
            },
          ]);
        } else {
          setSubscriptions([
            {
              user_id: Number(user?.userId || user?.id || 1),
              user_name: user?.fullName || user?.full_name || 'Patient',
              role: 'Patient',
              clinic_name: user?.clinicName || user?.clinic_name || 'Clinic',
              categories: [
                'User Registration',
                'User Update',
                'Password Change',
                'Appointment',
                'Billing',
              ],
              system_channels: 15,
              bell_channels: 15,
            },
          ]);
        }
      } catch (e) {
        setSubscriptions([
          {
            user_id: Number(user?.userId || user?.id || 1),
            user_name: user?.fullName || user?.full_name || 'Patient',
            role: 'Patient',
            clinic_name: user?.clinicName || user?.clinic_name || 'Clinic',
            categories: [
              'User Registration',
              'User Update',
              'Password Change',
              'Appointment',
              'Billing',
            ],
            system_channels: 15,
            bell_channels: 15,
          },
        ]);
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
    if (!token) return;
    try {
      await markNotificationReadApi(token, id);
    } catch (e) {}
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    globallyAllMarkedRead = true;
    if (!token) return;
    try {
      await markAllNotificationsReadApi(token);
    } catch (e) {}
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const updateSubCategories = async (categories: string[]) => {
    if (!token) return;
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
    updateSubCategories,
  };
};

export default useNotifications;
