import { useEffect, useRef, useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import {
  clearHeaderNotifications,
  fetchHeaderInbox,
  fetchHeaderUnreadCount,
} from '../api/staffHeaderApi';
import {
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from '../api/notificationApi';
import { ApiResponse } from '../types/auth';
import { dashboardNumber } from '../utils/dashboardValues';
import { useRemoteData } from './useRemoteData';
import { getNotificationSocket } from '../api/notificationSocket';
import type { SocketNotificationPayload } from '../api/notificationSocket';
import type { InboxNotification } from '../api/staffHeaderApi';

const listeners = new Set<(scope: string) => void>();

export function useNotificationInbox(page = 1, limit = 20) {
  const { user, userType, activeClinicId, token } = useAuthContext();
  const scope = `${user?.id}:${activeClinicId}:${token}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState<InboxNotification[]>([]);
  const resource = useRemoteData(
    `${scope}:notifications:${page}:${limit}`,
    async () => {
      const [inbox, unread] = await Promise.all([
        fetchHeaderInbox(page, limit),
        fetchHeaderUnreadCount(),
      ]);
      const count = unread.success ? dashboardNumber(unread.data?.count) : null;
      const total = dashboardNumber(inbox.data?.total);
      if (
        !inbox.success ||
        !Array.isArray(inbox.data?.data) ||
        count === null ||
        total === null
      )
        throw new Error('Invalid inbox');
      return { rows: inbox.data.data, count, total };
    },
  );
  const refreshRef = useRef(resource.refresh);
  refreshRef.current = resource.refresh;

  useEffect(() => {
    const listener = (changedScope: string) => {
      if (changedScope === scope) void refreshRef.current();
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [scope]);

  useEffect(() => {
    if (!token || !user?.id) return;
    let socket: ReturnType<typeof getNotificationSocket>;
    try {
      socket = getNotificationSocket();
    } catch {
      return;
    }
    const notificationUserType = userType === 'patient' ? 'patient' : 'staff';
    const join = () => socket.emit('join_room', { userType: notificationUserType, userId: String(user.id) });
    const onNotification = (payload: SocketNotificationPayload) => {
      if (scopeRef.current !== scope) return;
      const id = Number(payload?.id);
      if (Number.isFinite(id) && id > 0) {
        const now = payload.created_at || new Date().toISOString();
        const liveItem: InboxNotification = {
          not_rec_id: id,
          title: payload.not_cat_name || payload.title || 'Notification',
          message: payload.message || '',
          sent_at: now,
          created_at: now,
          entity_type: payload.entity_type || undefined,
          entity_id: payload.entity_id,
          not_cat_name: payload.not_cat_name || 'Notification',
          is_read: 0,
        };
        setLiveNotifications(previous => [
          liveItem,
          ...previous.filter(item => item.not_rec_id !== id),
        ]);
      }
    };
    if (socket.connected) join();
    else socket.on('connect', join);
    socket.on('notification', onNotification);
    return () => {
      socket.off('connect', join);
      socket.off('notification', onNotification);
    };
  }, [token, user?.id, userType, scope]);

  useEffect(() => {
    scopeRef.current = scope;
    busyRef.current = false;
    setBusy(false);
    setLiveNotifications([]);
    return () => {
      scopeRef.current = '';
    };
  }, [scope]);

  const mutate = async (action: () => Promise<ApiResponse<unknown>>) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await action();
      if (scopeRef.current !== scope || !result.success) return false;
      setLiveNotifications([]);
      listeners.forEach(listener => listener(scope));
      await resource.refresh();
      return true;
    } catch {
      return false;
    } finally {
      if (scopeRef.current === scope) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  };

  const baseNotifications = resource.data?.rows ?? [];
  const baseIds = new Set(baseNotifications.map(item => item.not_rec_id));
  const visibleLiveNotifications = liveNotifications.filter(item => !baseIds.has(item.not_rec_id));
  return {
    ...resource,
    notifications: [...visibleLiveNotifications, ...baseNotifications],
    unreadCount: resource.data?.count == null
      ? null
      : resource.data.count + visibleLiveNotifications.length,
    total: resource.data?.total ?? 0,
    busy,
    mutate,
    markAllRead: () => mutate(markAllNotificationsReadApi),
    clearAll: () => mutate(clearHeaderNotifications),
    markRead: (id: number) => mutate(() => markNotificationReadApi(id)),
  };
}
