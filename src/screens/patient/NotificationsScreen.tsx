import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  Search,
  TestTube,
  Trash2,
  Video,
  X,
} from 'lucide-react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
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
    if (text.includes('bill') || text.includes('payment')) return <CreditCard size={18} color="#059669" />;
    if (text.includes('lab') || text.includes('test') || text.includes('report')) return <TestTube size={18} color="#7c3aed" />;
    if (text.includes('video') || text.includes('call')) return <Video size={18} color="#ea580c" />;
    return <Bell size={18} color="#0d9488" />;
  };

  return (
    <View style={styles.container}>
      <PatientHeader onOpenDrawer={onOpenDrawer} unreadCount={unreadCount} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0d9488']} />}>
        {/* Header Title with RefreshButton */}
        <View style={styles.headerBoxRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>View all updates, appointment reminders & billing alerts</Text>
          </View>
          <RefreshButton onRefresh={loadData} loading={refreshing} />
        </View>

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
              <CheckCircle2 size={15} color="#0d9488" style={{ marginRight: 5 }} />
              <Text style={styles.actionBtnText}>Mark All Read</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.clearBtn, history.length === 0 && styles.disabledBtn]}
              disabled={saving || history.length === 0}
              onPress={handleClearHistory}>
              <Trash2 size={15} color="#dc2626" style={{ marginRight: 5 }} />
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={16} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notifications..."
            placeholderTextColor="#94a3b8"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <X size={16} color="#94a3b8" />
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

        {/* Notification List */}
        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#0d9488" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredHistory.map(item => {
              const isRead = boolFromApi(item.is_read);
              return (
                <TouchableOpacity
                  key={`p-notif-${item.not_rec_id}`}
                  activeOpacity={0.8}
                  onPress={() => handleNotificationOpen(item)}
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
                </TouchableOpacity>
              );
            })}

            {filteredHistory.length === 0 && (
              <View style={styles.emptyBox}>
                <Bell size={40} color="#cbd5e1" style={{ marginBottom: 10 }} />
                <Text style={styles.emptyTitle}>No notifications found</Text>
                <Text style={styles.emptySubtitle}>You are all caught up with your updates.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 16, paddingBottom: 100 },

  headerBox: { marginBottom: 14 },
  headerBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  unreadBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  unreadBadgeText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  actionBtnRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  clearBtn: { borderColor: '#fecaca', backgroundColor: '#fff5f5' },
  clearBtnText: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
  disabledBtn: { opacity: 0.5 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: { flex: 1, height: 40, fontSize: 13, color: '#0f172a' },

  filterChipRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  filterChipActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  filterChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterChipTextActive: { color: '#ffffff', fontWeight: '800' },

  loaderBox: { paddingVertical: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 13, color: '#64748b' },

  list: { gap: 10 },
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  cardRead: { backgroundColor: '#ffffff', borderColor: '#e2e8f0' },
  cardUnread: { backgroundColor: '#ecfeff', borderColor: '#a5f3fc' },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  categoryName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  timeText: { fontSize: 11, color: '#64748b', marginTop: 1 },
  badgePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeRead: { backgroundColor: '#f1f5f9' },
  badgeReadText: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  badgeUnread: { backgroundColor: '#cffafe', borderWidth: 1, borderColor: '#67e8f9' },
  badgeUnreadText: { fontSize: 10, fontWeight: '800', color: '#0e7490' },

  msgText: { fontSize: 13, color: '#334155', lineHeight: 18, marginTop: 4 },

  emptyBox: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  emptySubtitle: { fontSize: 12, color: '#64748b', marginTop: 4 },
});

export default NotificationsScreen;
