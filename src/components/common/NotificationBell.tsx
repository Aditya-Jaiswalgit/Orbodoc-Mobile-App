import { colors, radii, spacing, typography } from '../../theme/tokens';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LiquidBorderScrollView } from './LiquidBorderScrollView';
import { AlertCircle, ArrowRight, Bell, BellOff, Calendar, CheckCheck, CheckCircle, FileText, Trash2, User, X } from 'lucide-react-native';
import { AppModal } from './AppModal';
import { fetchMyNotifications, fetchUnreadCount, markAllNotificationsAsRead, markNotificationAsRead, clearMyNotifications, NotificationInboxItem } from '../../api/notificationApi';
import { getNotificationSocket, type SocketNotificationPayload } from '../../api/notificationSocket';
import { useAuthContext } from '../../context/AuthContext';
import { getMobileNotificationDestination } from '../../utils/notificationNavigation';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

interface NotificationBellProps {
  onOpenAll: () => void;
  onNavigate: (screen: string) => void;
}

const isUnread = (value: NotificationInboxItem['is_read']) => value !== 1 && value !== true;

const formatTime = (value?: string | null) => {
  if (!value) return 'Now';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Now' : date.toLocaleString();
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ onOpenAll, onNavigate }) => {
  const { user, role, userType, permissionsMap = {} } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationInboxItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionLoading, setActionLoading] = useState<'read' | 'clear' | null>(null);
  const [badgeCount, setBadgeCount] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const canEdit = canUseStaffScreen(role || '', permissionsMap, 'notifications', 'edit');
  const canDelete = canUseStaffScreen(role || '', permissionsMap, 'notifications', 'delete');
  const unreadCount = badgeCount;

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await fetchUnreadCount();
      if (response.success && response.data?.count != null) setBadgeCount(Number(response.data.count));
    } catch { /* retain the most recent badge count */ }
  }, []);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setBusy(true);
    setLoadFailed(false);
    try {
      const response = await fetchMyNotifications({ is_read: 0, limit: 20 });
      if (!response.success) throw new Error(response.message || 'Failed to load notifications');
      const rows = response.data?.data || [];
      setItems(rows);
      await loadUnreadCount();
    } catch (error) {
      setLoadFailed(true);
      showErrorToast('Notifications unavailable', error instanceof Error ? error.message : 'Failed to load notifications');
    } finally {
      setBusy(false);
    }
  }, [user?.id, loadUnreadCount]);

  useEffect(() => { void loadUnreadCount(); }, [loadUnreadCount, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let socket: ReturnType<typeof getNotificationSocket>;
    try { socket = getNotificationSocket(); } catch { return; }
    const receive = (payload: SocketNotificationPayload) => {
      const id = Number(payload?.id);
      if (userType === 'patient' && Number.isFinite(id) && id > 0) {
        const createdAt = payload.created_at || new Date().toISOString();
        const liveItem: NotificationInboxItem = {
          not_rec_id: id,
          not_id: Number(payload.not_id || id),
          title: payload.not_cat_name || payload.title || 'Notification',
          message: payload.message || '',
          not_cat_name: payload.not_cat_name || 'Notification',
          entity_type: payload.entity_type || undefined,
          entity_id: payload.entity_id,
          created_at: createdAt,
          sent_at: createdAt,
          is_read: 0,
        };
        setItems(previous => [liveItem, ...previous.filter(item => item.not_rec_id !== id)]);
      }
      void loadUnreadCount();
    };
    socket.on('notification', receive);
    return () => {
      socket.off('notification', receive);
    };
  }, [user?.id, userType, load, loadUnreadCount]);

  const markAllRead = async () => {
    setActionLoading('read');
    try {
      const response = await markAllNotificationsAsRead();
      if (!response.success) throw new Error(response.message);
      setItems([]);
      setBadgeCount(0);
      showSuccessToast('All notifications marked as read', 'Your notifications are up to date.');
    } catch (error) {
      showErrorToast('Unable to mark notifications', error instanceof Error ? error.message : 'Please try again.');
    } finally { setActionLoading(null); }
  };

  const clearHistory = async () => {
    setActionLoading('clear');
    try {
      const response = await clearMyNotifications();
      if (!response.success) throw new Error(response.message);
      setItems([]);
      setBadgeCount(0);
      showSuccessToast('Notification history cleared', 'Your notification history has been cleared.');
    } catch (error) {
      showErrorToast('Unable to clear notifications', error instanceof Error ? error.message : 'Please try again.');
    } finally { setActionLoading(null); }
  };

  const openItem = async (item: NotificationInboxItem) => {
    if (isUnread(item.is_read) && canEdit) {
      try {
        const response = await markNotificationAsRead(item.not_rec_id);
        if (!response.success) throw new Error(response.message);
        try { getNotificationSocket().emit('mark_as_read', { id: item.not_rec_id }); } catch { /* REST already succeeded */ }
        setItems(previous => previous.filter(row => row.not_rec_id !== item.not_rec_id));
        setBadgeCount(count => Math.max(0, count - 1));
      } catch (error) {
        showErrorToast('Failed to mark notification', error instanceof Error ? error.message : 'Please try again.');
      }
    }
    setOpen(false);
    onNavigate(getMobileNotificationDestination(item, { role, currentUserId: user?.id, userType: userType || undefined }));
  };

  const iconFor = (item: NotificationInboxItem) => {
    const text = `${item.not_cat_name || ''} ${item.title || ''} ${item.message || ''}`.toLowerCase();
    if (text.includes('appointment')) return <Calendar size={18} color="#2563eb" />;
    if (text.includes('patient') || text.includes('user')) return <User size={18} color={colors.successDark} />;
    if (text.includes('report') || text.includes('lab')) return <FileText size={18} color="#7c3aed" />;
    if (text.includes('success') || text.includes('paid')) return <CheckCircle size={18} color={colors.primary} />;
    return <AlertCircle size={18} color={colors.warning} />;
  };

  return <>
    <TouchableOpacity style={styles.bell} onPress={() => { setOpen(true); void load(); }} accessibilityLabel="Notifications">
      <Bell size={17} color={colors.foreground} />
      {unreadCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View> : null}
    </TouchableOpacity>
    <AppModal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close notifications" />
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <View style={styles.titleRow}><Text style={styles.title}>Notifications</Text>{unreadCount > 0 ? <Text style={styles.count}>{unreadCount} new</Text> : null}</View>
              <Text style={styles.subtitle}>{unreadCount > 0 ? 'You have updates to review' : 'You are all caught up'}</Text>
            </View>
            <View style={styles.actions}>
              {canEdit && unreadCount > 0 ? <TouchableOpacity style={styles.action} disabled={actionLoading !== null} onPress={() => void markAllRead()} accessibilityLabel="Mark all notifications as read">{actionLoading === 'read' ? <ActivityIndicator size="small" /> : <CheckCheck size={18} color={colors.muted} />}</TouchableOpacity> : null}
              {canDelete && items.length > 0 ? <TouchableOpacity style={styles.action} disabled={actionLoading !== null} onPress={() => void clearHistory()} accessibilityLabel="Clear notification history">{actionLoading === 'clear' ? <ActivityIndicator size="small" /> : <Trash2 size={18} color={colors.destructive} />}</TouchableOpacity> : null}
              <TouchableOpacity style={styles.action} onPress={() => setOpen(false)} accessibilityLabel="Close notifications"><X size={18} color={colors.muted} /></TouchableOpacity>
            </View>
          </View>
          <LiquidBorderScrollView style={styles.list}>
            {busy && items.length === 0 ? <Text style={styles.empty}>Loading notifications...</Text> : loadFailed && items.length === 0 ? <Text style={styles.empty}>Unable to load notifications. Close and reopen to retry.</Text> : items.length === 0 ? <View style={styles.emptyState}><BellOff size={22} color={colors.subtle} /><Text style={styles.empty}>No notifications</Text><Text style={styles.emptyHint}>New updates will appear here.</Text></View> : items.map(item => (
              <TouchableOpacity key={item.not_rec_id} style={styles.item} onPress={() => void openItem(item)}>
                <View style={styles.icon}>{iconFor(item)}</View>
                <View style={styles.content}>
                  <View style={styles.titleRow}><Text numberOfLines={1} style={styles.itemTitle}>{item.not_cat_name || item.title || 'Notification'}</Text><View style={styles.unreadDot} /></View>
                  <Text numberOfLines={2} style={styles.message}>{item.message}</Text>
                  <Text style={styles.time}>{formatTime(item.created_at || item.sent_at)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </LiquidBorderScrollView>
          <TouchableOpacity style={styles.footer} onPress={() => { setOpen(false); onOpenAll(); }}>
            <Text style={styles.footerText}>View all notifications</Text><ArrowRight size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </AppModal>
  </>;
};

const styles = StyleSheet.create({
  bell: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: -4, top: -3, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: spacing.xs, backgroundColor: colors.destructive, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: typography.family, color: colors.surface, fontSize: 9, fontWeight: typography.weight.extrabold },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-start', alignItems: 'flex-end', padding: spacing.lg, paddingTop: 56 },
  card: { width: '100%', maxWidth: 420, maxHeight: '80%', backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, elevation: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  headerText: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.title, fontWeight: typography.weight.extrabold },
  count: { fontFamily: typography.family, color: colors.primaryDark, fontSize: typography.size.xs, fontWeight: typography.weight.bold },
  subtitle: { fontFamily: typography.family, marginTop: 3, color: colors.muted, fontSize: typography.size.body },
  actions: { flexDirection: 'row', gap: spacing.xs },
  action: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  list: { marginTop: spacing.md, maxHeight: 380 },
  emptyState: { minHeight: 190, alignItems: 'center', justifyContent: 'center' },
  empty: { fontFamily: typography.family, paddingVertical: 28, textAlign: 'center', color: colors.muted, fontSize: typography.size.caption },
  emptyHint: { fontFamily: typography.family, marginTop: -20, color: colors.muted, fontSize: typography.size.xs, textAlign: 'center' },
  item: { flexDirection: 'row', gap: 10, paddingVertical: spacing.md, paddingHorizontal: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.secondary },
  icon: { width: 34, height: 34, borderRadius: radii.md, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  itemTitle: { fontFamily: typography.family, flex: 1, color: colors.text, fontSize: typography.size.caption, fontWeight: typography.weight.bold },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  message: { fontFamily: typography.family, marginTop: 3, color: colors.muted, fontSize: typography.size.sm, lineHeight: 17 },
  time: { fontFamily: typography.family, marginTop: spacing.xs, color: colors.subtle, fontSize: typography.size.micro },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.tiny, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.md },
  footerText: { fontFamily: typography.family, color: colors.primary, fontSize: typography.size.caption, fontWeight: typography.weight.bold },
});
