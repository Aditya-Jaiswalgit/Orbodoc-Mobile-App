import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useAuthContext } from '../context/AuthContext';
import { fetchProfileApi } from '../api/authApi';
import {
  fetchClinicPlans, updateVideoAvailability, type ClinicPlan,
} from '../api/staffHeaderApi';
import { useNotificationInbox } from './useNotificationInbox';

export function useStaffHeaderData(notificationsOpen: boolean, planOpen: boolean, _profileOpen: boolean) {
  const { user, token, activeClinicId } = useAuthContext();
  const scope = `${user?.id}:${activeClinicId}:${token}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const inbox = useNotificationInbox();
  const [plan, setPlan] = useState<ClinicPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(false);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [planRetry, setPlanRetry] = useState(0);

  useEffect(() => {
    scopeRef.current = scope;
    return () => { scopeRef.current = ''; };
  }, [scope]);

  const previousNotificationsOpen = useRef(notificationsOpen);
  useEffect(() => {
    if (notificationsOpen && !previousNotificationsOpen.current) void inbox.refresh();
    previousNotificationsOpen.current = notificationsOpen;
  }, [notificationsOpen, inbox.refresh]);

  useEffect(() => {
    let current = true;
    setPlan(null);
    setPlanError(false);
    setPlanLoading(false);
    if (!planOpen) return;
    if (!activeClinicId) {
      setPlanError(true);
      return;
    }
    setPlanLoading(true);
    fetchClinicPlans().then(result => {
      if (!current) return;
      if (!result.success || !Array.isArray(result.data?.clinics)) {
        setPlanError(true);
        return;
      }
      setPlan(result.data.clinics.find(clinic => Number(clinic.id) === Number(activeClinicId)) ?? null);
    }).catch(() => { if (current) setPlanError(true); })
      .finally(() => { if (current) setPlanLoading(false); });
    return () => { current = false; };
  }, [scope, activeClinicId, planOpen, planRetry]);

  useEffect(() => {
    let current = true;
    setProfile(null);
    setVideoBusy(false);
    fetchProfileApi().then(result => {
      if (current && result.success && result.data) setProfile(result.data.user || result.data);
    }).catch(() => { if (current) setProfile(null); });
    return () => { current = false; };
  }, [scope]);

  const changeNotifications = async (clear: boolean) => {
    const success = await (clear ? inbox.clearAll() : inbox.markAllRead());
    if (!success && scopeRef.current === scope) Alert.alert('Unable to update notifications', 'Please try again.');
  };

  const canManageVideoCalling = String(profile?.role_name || profile?.roleName || '').toLowerCase() === 'doctor' || Number(profile?.is_doctor) === 1;
  const videoCallingEnabled = Number(profile?.is_video_enabled) === 1;
  const toggleVideo = async (enabled: boolean) => {
    if (videoBusy || !canManageVideoCalling) return;
    setVideoBusy(true);
    try {
      const result = await updateVideoAvailability(enabled);
      if (scopeRef.current !== scope) return;
      if (!result.success) throw new Error(result.message);
      setProfile(previous => ({ ...previous, is_video_enabled: enabled ? 1 : 0 }));
    } catch {
      if (scopeRef.current === scope) Alert.alert('Unable to update video calling', 'Please try again.');
    } finally {
      if (scopeRef.current === scope) setVideoBusy(false);
    }
  };

  return {
    notifications: inbox.notifications, unreadCount: inbox.unreadCount, notificationsLoading: inbox.loading,
    notificationsError: Boolean(inbox.error), notificationBusy: inbox.busy,
    refreshNotifications: inbox.refresh, markAllRead: () => changeNotifications(false), clearAll: () => changeNotifications(true),
    plan, planLoading, planError, retryPlan: () => setPlanRetry(value => value + 1),
    canManageVideoCalling, videoCallingEnabled, videoBusy, toggleVideo,
  };
}
