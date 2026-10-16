import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    if (text.includes('patient') || text.includes('user')) return <User size={18} color="#059669" />;
    if (text.includes('report') || text.includes('lab')) return <FileText size={18} color="#7c3aed" />;
    if (text.includes('success') || text.includes('paid')) return <CheckCircle size={18} color="#0d9488" />;
    return <AlertCircle size={18} color="#d97706" />;
  };

  return <>
    <TouchableOpacity style={styles.bell} onPress={() => { setOpen(true); void load(); }} accessibilityLabel="Notifications">
      <Bell size={17} color="#334155" />
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
              {canEdit && unreadCount > 0 ? <TouchableOpacity style={styles.action} disabled={actionLoading !== null} onPress={() => void markAllRead()} accessibilityLabel="Mark all notifications as read">{actionLoading === 'read' ? <ActivityIndicator size="small" /> : <CheckCheck size={18} color="#475569" />}</TouchableOpacity> : null}
              {canDelete && items.length > 0 ? <TouchableOpacity style={styles.action} disabled={actionLoading !== null} onPress={() => void clearHistory()} accessibilityLabel="Clear notification history">{actionLoading === 'clear' ? <ActivityIndicator size="small" /> : <Trash2 size={18} color="#dc2626" />}</TouchableOpacity> : null}
              <TouchableOpacity style={styles.action} onPress={() => setOpen(false)} accessibilityLabel="Close notifications"><X size={18} color="#475569" /></TouchableOpacity>
            </View>
          </View>
          <ScrollView style={styles.list}>
            {busy && items.length === 0 ? <Text style={styles.empty}>Loading notifications...</Text> : loadFailed && items.length === 0 ? <Text style={styles.empty}>Unable to load notifications. Close and reopen to retry.</Text> : items.length === 0 ? <View style={styles.emptyState}><BellOff size={22} color="#94a3b8" /><Text style={styles.empty}>No notifications</Text><Text style={styles.emptyHint}>New updates will appear here.</Text></View> : items.map(item => (
              <TouchableOpacity key={item.not_rec_id} style={styles.item} onPress={() => void openItem(item)}>
                <View style={styles.icon}>{iconFor(item)}</View>
                <View style={styles.content}>
                  <View style={styles.titleRow}><Text numberOfLines={1} style={styles.itemTitle}>{item.not_cat_name || item.title || 'Notification'}</Text><View style={styles.unreadDot} /></View>
                  <Text numberOfLines={2} style={styles.message}>{item.message}</Text>
                  <Text style={styles.time}>{formatTime(item.created_at || item.sent_at)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.footer} onPress={() => { setOpen(false); onOpenAll(); }}>
            <Text style={styles.footerText}>View all notifications</Text><ArrowRight size={16} color="#0d9488" />
          </TouchableOpacity>
        </View>
      </View>
    </AppModal>
  </>;
};

const styles = StyleSheet.create({
  bell: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: -4, top: -3, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-start', alignItems: 'flex-end', padding: 16, paddingTop: 56 },
  card: { width: '100%', maxWidth: 420, maxHeight: '80%', backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  headerText: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#0f172a', fontSize: 17, fontWeight: '800' },
  count: { color: '#0f766e', fontSize: 11, fontWeight: '700' },
  subtitle: { marginTop: 3, color: '#64748b', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 4 },
  action: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  list: { marginTop: 12, maxHeight: 380 },
  emptyState: { minHeight: 190, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingVertical: 28, textAlign: 'center', color: '#64748b', fontSize: 13 },
  emptyHint: { marginTop: -20, color: '#64748b', fontSize: 11, textAlign: 'center' },
  item: { flexDirection: 'row', gap: 10, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  icon: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  itemTitle: { flex: 1, color: '#0f172a', fontSize: 13, fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#14b8a6' },
  message: { marginTop: 3, color: '#475569', fontSize: 12, lineHeight: 17 },
  time: { marginTop: 4, color: '#94a3b8', fontSize: 10 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 8, paddingTop: 12 },
  footerText: { color: '#0d9488', fontSize: 13, fontWeight: '700' },
});
