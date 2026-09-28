import { useEffect, useRef, useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { clearHeaderNotifications, fetchHeaderInbox, fetchHeaderUnreadCount } from '../api/staffHeaderApi';
import { markAllNotificationsReadApi, markNotificationReadApi } from '../api/notificationApi';
import { ApiResponse } from '../types/auth';
import { dashboardNumber } from '../utils/dashboardValues';
import { useRemoteData } from './useRemoteData';

const listeners = new Set<(scope: string) => void>();

export function useNotificationInbox(page = 1, limit = 20) {
  const { user, activeClinicId, token } = useAuthContext();
  const scope = `${user?.id}:${activeClinicId}:${token}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const resource = useRemoteData(`${scope}:notifications:${page}:${limit}`, async () => {
    const [inbox, unread] = await Promise.all([fetchHeaderInbox(page, limit), fetchHeaderUnreadCount()]);
    const count = unread.success ? dashboardNumber(unread.data?.count) : null;
    const total = dashboardNumber(inbox.data?.total);
    if (!inbox.success || !Array.isArray(inbox.data?.data) || count === null || total === null) throw new Error('Invalid inbox');
    return { rows: inbox.data.data, count, total };
  });

  useEffect(() => {
    const listener = (changedScope: string) => { if (changedScope === scope) void resource.refresh(); };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, [scope, resource.refresh]);

  useEffect(() => {
    scopeRef.current = scope;
    busyRef.current = false;
    setBusy(false);
    return () => { scopeRef.current = ''; };
  }, [scope]);

  const mutate = async (action: () => Promise<ApiResponse<unknown>>) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await action();
      if (scopeRef.current !== scope || !result.success) return false;
      listeners.forEach(listener => listener(scope));
      await resource.refresh();
      return true;
    } catch { return false; }
    finally {
      if (scopeRef.current === scope) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  };

  return {
    ...resource, notifications: resource.data?.rows ?? [], unreadCount: resource.data?.count ?? null,
    total: resource.data?.total ?? 0, busy, mutate,
    markAllRead: () => mutate(markAllNotificationsReadApi),
    clearAll: () => mutate(clearHeaderNotifications),
    markRead: (id: number) => mutate(() => markNotificationReadApi(id)),
  };
}
