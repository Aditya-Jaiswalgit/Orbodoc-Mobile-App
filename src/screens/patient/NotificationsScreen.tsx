import { colors, radii, spacing, typography } from '../../theme/tokens';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Bell,
  Calendar,
  CheckCircle2,
  CreditCard,
  Search,
  TestTube,
  Trash2,
  Video,
  X,
} from 'lucide-react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import { PatientPageHeading } from '../../components/common/PatientPageHeading';
import { LiquidBorderTouchable } from '../../components/common/LiquidBorderSurface';
import { RefreshButton } from '../../components/common/RefreshButton';
import {
  clearMyNotifications,
  fetchMyNotifications,
  fetchUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationInboxItem,
} from '../../api/notificationApi';
import { getMobileNotificationDestination } from '../../utils/notificationNavigation';
import { showSuccessToast } from '../../utils/toast';
import { useAuthContext } from '../../context/AuthContext';
import { canUseStaffScreen } from '../../navigation/staffAccess';

interface NotificationsScreenProps {
  onOpenDrawer?: () => void;
  onNavigateScreen?: (screen: string) => void;
}

const boolFromApi = (val: number | boolean | undefined | null) => val === 1 || val === true;

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onOpenDrawer = () => {},
  onNavigateScreen = () => {},
}) => {
  const { role, permissionsMap = {} } = useAuthContext();
  const canClearNotifications = canUseStaffScreen(role || 'patient', permissionsMap, 'notifications', 'delete');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState<NotificationInboxItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');

  const loadData = useCallback(async () => {
    try {
      const [unreadRes, historyRes] = await Promise.allSettled([
        fetchUnreadCount(),
        fetchMyNotifications(),
      ]);

      if (unreadRes.status === 'fulfilled' && unreadRes.value.success) {
        setUnreadCount(Number(unreadRes.value.data?.count || 0));
      }

      if (historyRes.status === 'fulfilled' && historyRes.value.success) {
        setHistory(historyRes.value.data?.data || []);
      }
    } catch {
      // quiet
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData();
  }, [loadData]);

  const filteredHistory = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return history.filter(item => {
      const isRead = boolFromApi(item.is_read);
      const statusMatch =
        statusFilter === 'all' ||
        (statusFilter === 'read' && isRead) ||
        (statusFilter === 'unread' && !isRead);

      const textMatch =
        !q ||
        item.message?.toLowerCase().includes(q) ||
        item.not_cat_name?.toLowerCase().includes(q) ||
        item.title?.toLowerCase().includes(q);

      return statusMatch && textMatch;
    });
  }, [history, searchText, statusFilter]);

  const handleNotificationOpen = async (item: NotificationInboxItem) => {
    if (!boolFromApi(item.is_read)) {
      try {
        await markNotificationAsRead(item.not_rec_id);
        setHistory(prev =>
          prev.map(n => (n.not_rec_id === item.not_rec_id ? { ...n, is_read: 1 } : n)),
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {
        // quiet
      }
    }
    const dest = getMobileNotificationDestination(item, { role: 'patient', userType: 'patient' });
    onNavigateScreen(dest);
  };

  const handleMarkAllRead = async () => {
    try {
      setSaving(true);
      await markAllNotificationsAsRead();
      setHistory(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
      showSuccessToast('All Read', 'All notifications marked as read.');
    } catch {
      Alert.alert('Error', 'Failed to mark all as read.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearHistory = async () => {
    Alert.alert('Clear History', 'Are you sure you want to clear your notification history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          try {
            setSaving(true);
            await clearMyNotifications();
            setHistory([]);
            setUnreadCount(0);
            showSuccessToast('Cleared', 'Notification history cleared.');
          } catch {
            Alert.alert('Error', 'Failed to clear history.');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const renderIcon = (item: NotificationInboxItem) => {
    const text = `${item.entity_type || ''} ${item.not_cat_name || ''} ${item.title || ''} ${item.message || ''}`.toLowerCase();
    if (text.includes('appointment')) return <Calendar size={18} color="#0284c7" />;
    if (text.includes('bill') || text.includes('payment')) return <CreditCard size={18} color={colors.successDark} />;
    if (text.includes('lab') || text.includes('test') || text.includes('report')) return <TestTube size={18} color="#7c3aed" />;
    if (text.includes('video') || text.includes('call')) return <Video size={18} color="#ea580c" />;
    return <Bell size={18} color={colors.primary} />;
  };

  return (
    <View style={styles.container}>
      <PatientHeader onOpenDrawer={onOpenDrawer} unreadCount={unreadCount} />

      <FlatList
        data={loading ? [] : filteredHistory}
        keyExtractor={item => `p-notif-${item.not_rec_id}`}
        renderItem={({ item }) => {
          const isRead = boolFromApi(item.is_read);
          return (
            <LiquidBorderTouchable
              activeOpacity={0.8}
              onPress={() => handleNotificationOpen(item)}
              radius={12}
              style={[styles.card, isRead ? styles.cardRead : styles.cardUnread]}>
              <View style={styles.cardTop}>
                <View style={styles.iconCircle}>{renderIcon(item)}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.categoryName}>{item.not_cat_name || 'Notification'}</Text>
                  <Text style={styles.timeText}>{formatDateTime(item.sent_at || item.created_at)}</Text>
                </View>
                <View style={[styles.badgePill, isRead ? styles.badgeRead : styles.badgeUnread]}>
                  <Text style={[styles.badgePillText, isRead ? styles.badgeReadText : styles.badgeUnreadText]}>
                    {isRead ? 'Read' : 'New'}
                  </Text>
                </View>
              </View>
              <Text style={styles.msgText}>{item.message || '-'}</Text>
            </LiquidBorderTouchable>
          );
        }}
        ListHeaderComponent={<View style={styles.listHeader}>
        {/* Header Title with RefreshButton */}
        <PatientPageHeading
          title="Notifications"
          subtitle="Appointment reminders, billing alerts and other updates"
          icon={<Bell size={20} color={colors.primary} />}
          action={<RefreshButton onRefresh={loadData} loading={refreshing} />}
          compact
        />

        {/* Top Action Bar */}
        <View style={styles.cardHeader}>
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>Unread: {unreadCount}</Text>
          </View>
          <View style={styles.actionBtnRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              disabled={saving || !unreadCount}
              onPress={handleMarkAllRead}>
              <CheckCircle2 size={15} color={colors.primary} style={{ marginRight: 5 }} />
              <Text style={styles.actionBtnText}>Mark All Read</Text>
            </TouchableOpacity>

            {canClearNotifications ? <TouchableOpacity
              style={[styles.actionBtn, styles.clearBtn, history.length === 0 && styles.disabledBtn]}
              disabled={saving || history.length === 0}
              onPress={handleClearHistory}>
              <Trash2 size={15} color={colors.destructive} style={{ marginRight: 5 }} />
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity> : null}
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={16} color={colors.subtle} style={{ marginRight: spacing.sm }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notifications..."
            placeholderTextColor={colors.subtle}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <X size={16} color={colors.subtle} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Chips */}
        <View style={styles.filterChipRow}>
          {(['all', 'unread', 'read'] as const).map(tab => {
            const active = statusFilter === tab;
            return (
              <TouchableOpacity
                key={`tab-${tab}`}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setStatusFilter(tab)}>
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {tab === 'all' ? 'All' : tab === 'unread' ? 'Unread' : 'Read'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        </View>}
        ListEmptyComponent={loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Bell size={40} color={colors.input} style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>No notifications found</Text>
            <Text style={styles.emptySubtitle}>You are all caught up with your updates.</Text>
          </View>
        )}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: 28, gap: spacing.md },
  listHeader: { gap: spacing.md },

  headerBox: { marginBottom: 14 },
  headerBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: { fontFamily: typography.family, fontSize: typography.size.title, fontWeight: typography.weight.black, color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontFamily: typography.family, fontSize: typography.size.body, color: colors.muted, marginTop: spacing.xs },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  unreadBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unreadBadgeText: { fontFamily: typography.family, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.muted },
  actionBtnRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: spacing.tiny,
    borderRadius: radii.md,
  },
  actionBtnText: { fontFamily: typography.family, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.text },
  clearBtn: { borderColor: colors.destructiveSoft, backgroundColor: '#fff5f5' },
  clearBtnText: { fontFamily: typography.family, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.destructive },
  disabledBtn: { opacity: 0.5 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    marginBottom: 10,
  },
  searchInput: { fontFamily: typography.family, flex: 1, height: 40, fontSize: typography.size.caption, color: colors.text },

  filterChipRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: 14 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: spacing.tiny,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.input,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontFamily: typography.family, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.muted },
  filterChipTextActive: { color: colors.surface, fontWeight: typography.weight.extrabold },

  loaderBox: { paddingVertical: 40, alignItems: 'center' },
  loadingText: { fontFamily: typography.family, marginTop: 10, fontSize: typography.size.caption, color: colors.muted },

  list: { gap: 10 },
  card: {
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    shadowColor: colors.text,
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  cardRead: { backgroundColor: colors.surface, borderColor: colors.border },
  cardUnread: { backgroundColor: '#ecfeff', borderColor: '#a5f3fc' },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  categoryName: { fontFamily: typography.family, fontSize: typography.size.body, fontWeight: typography.weight.extrabold, color: colors.text },
  timeText: { fontFamily: typography.family, fontSize: typography.size.xs, color: colors.muted, marginTop: 1 },
  badgePill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.md },
  badgePillText: { fontFamily: typography.family, fontSize: typography.size.micro, fontWeight: typography.weight.bold, color: colors.muted },
  badgeRead: { backgroundColor: colors.secondary },
  badgeReadText: { fontFamily: typography.family, fontSize: typography.size.micro, fontWeight: typography.weight.bold, color: colors.muted },
  badgeUnread: { backgroundColor: colors.infoSoft, borderWidth: 1, borderColor: '#67e8f9' },
  badgeUnreadText: { fontFamily: typography.family, fontSize: typography.size.micro, fontWeight: typography.weight.extrabold, color: '#0e7490' },

  msgText: { fontFamily: typography.family, fontSize: typography.size.caption, color: colors.foreground, lineHeight: 18, marginTop: spacing.xs },

  emptyBox: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyTitle: { fontFamily: typography.family, fontSize: 15, fontWeight: typography.weight.extrabold, color: colors.text },
  emptySubtitle: { fontFamily: typography.family, fontSize: typography.size.sm, color: colors.muted, marginTop: spacing.xs },
});

export default NotificationsScreen;
