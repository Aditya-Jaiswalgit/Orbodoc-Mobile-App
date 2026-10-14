import React, { useCallback, useEffect, useMemo, useState } from 'react';
// Exact Web Mobile Responsive Parity - Notifications Center
import { AppModal } from '../../components/common/AppModal';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Megaphone,
  Search,
  Trash2,
  X,
} from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { RefreshButton } from '../../components/common/RefreshButton';
import { useAuthContext } from '../../context/AuthContext';
import {
  broadcastNotification,
  clearMyNotifications,
  fetchMyClinicOptions,
  fetchMyNotifications,
  fetchNotificationCategories,
  fetchNotificationLogs,
  fetchNotificationSubscriptions,
  fetchUnreadCount,
  fetchUserRolesApi,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  updateNotificationSubscriptions,
  type BroadcastPayload,
  type NotificationCategoryItem,
  type NotificationClinicOption,
  type NotificationInboxItem,
  type NotificationLogItem,
  type NotificationSubscriptionItem,
  type UserRoleRecord,
} from '../../api/notificationApi';
import { getMobileNotificationDestination } from '../../utils/notificationNavigation';
import { navigateStaffScreen } from '../../utils/navigationEvents';
import { showSuccessToast } from '../../utils/toast';
import { canUseStaffScreen } from '../../navigation/staffAccess';

interface Props {
  onOpenDrawer: () => void;
  onNavigateScreen?: (screen: string) => void;
}

type TabKey = 'history' | 'category' | 'subscriptions';

interface SubscriptionUserGroup {
  key: string;
  userName: string;
  userType: string;
  clinicName: string;
  rows: NotificationSubscriptionItem[];
  activeCount: number;
}

interface SubscriptionCategoryGroup {
  categoryName: string;
  rows: Array<{
    item: NotificationSubscriptionItem;
    index: number;
  }>;
}

const SUBSCRIPTION_USERS_PAGE_SIZE = 5;
const SUBSCRIPTION_MESSAGES_PAGE_SIZE = 8;

const boolFromApi = (val: number | boolean | undefined | null) => val === 1 || val === true;

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const getSubscriptionRowKey = (item: NotificationSubscriptionItem, index: number) =>
  String(item.not_sub_id ?? `${item.user_type || 'user'}-${item.user_id ?? 'unknown'}-${item.not_cat_id}-${item.not_id ?? index}`);

const getSubscriptionMessage = (item: NotificationSubscriptionItem) =>
  String(item.message || '').trim() || String(item.description || '').trim() || '-';

const prettifyRoleName = (name?: string) => {
  if (!name) return '-';
  return name
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

export const NotificationsCenterScreen: React.FC<Props> = ({
  onOpenDrawer,
  onNavigateScreen = navigateStaffScreen,
}) => {
  const { user, role, activeClinicId, permissionsMap = {} } = useAuthContext();
  const isSuperAdmin = role === 'super_admin';
  const isClinicAdmin = role === 'clinic_admin';
  const canManageNotificationAdmin = isSuperAdmin || isClinicAdmin;
  const currentUserId = user?.id;

  // Role Permissions Parity with Web
  const canEditNotifications = isSuperAdmin || canUseStaffScreen(role, permissionsMap, 'notifications', 'edit');
  const canDeleteNotifications = isSuperAdmin || canUseStaffScreen(role, permissionsMap, 'notifications', 'delete');

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabKey>('history');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Data states
  const [history, setHistory] = useState<NotificationInboxItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [categories, setCategories] = useState<NotificationCategoryItem[]>([]);
  const [roles, setRoles] = useState<UserRoleRecord[]>([]);
  const [clinicOptions, setClinicOptions] = useState<NotificationClinicOption[]>([]);
  const [subscriptions, setSubscriptions] = useState<NotificationSubscriptionItem[]>([]);
  const [logs, setLogs] = useState<NotificationLogItem[]>([]);

  // Filter states - History
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [historyRoleFilter, setHistoryRoleFilter] = useState('all');

  // Filter states - Subscriptions
  const [subscriptionSearch, setSubscriptionSearch] = useState('');
  const [subscriptionClinicFilter, setSubscriptionClinicFilter] = useState('all');
  const [subscriptionRoleFilter, setSubscriptionRoleFilter] = useState('all');
  const [subscriptionPage, setSubscriptionPage] = useState(1);

  // Subscriptions Modal
  const [selectedSubscriptionUserKey, setSelectedSubscriptionUserKey] = useState<string | null>(null);
  const [subscriptionDraft, setSubscriptionDraft] = useState<Record<string, boolean>>({});
  const [modalSubscriptionPage, setModalSubscriptionPage] = useState(1);

  // Filter states - Logs
  const [logRoleFilter, setLogRoleFilter] = useState('all');

  // Filter Picker Modals
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [clinicModalVisible, setClinicModalVisible] = useState(false);
  const [subRoleModalVisible, setSubRoleModalVisible] = useState(false);
  const [logRoleModalVisible, setLogRoleModalVisible] = useState(false);

  // Broadcast Modal
  const [broadcastModalVisible, setBroadcastModalVisible] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastCategory, setBroadcastCategory] = useState<number | null>(null);
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'staff' | 'patients'>('all');

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [clinicsResult, rolesResult, unreadResult, historyResult] = await Promise.allSettled([
        fetchMyClinicOptions(),
        fetchUserRolesApi(),
        fetchUnreadCount(),
        fetchMyNotifications(),
      ]);

      const nextClinicOptions = clinicsResult.status === 'fulfilled' ? clinicsResult.value : [];
      setClinicOptions(nextClinicOptions);

      if (rolesResult.status === 'fulfilled') {
        setRoles(rolesResult.value);
      }

      if (unreadResult.status === 'fulfilled' && unreadResult.value.success) {
        setUnreadCount(Number(unreadResult.value.data?.count || 0));
      }

      if (historyResult.status === 'fulfilled' && historyResult.value.success) {
        setHistory(historyResult.value.data?.data || []);
      }

      if (canManageNotificationAdmin) {
        const [catResult, logsResult, subResult] = await Promise.allSettled([
          fetchNotificationCategories(),
          fetchNotificationLogs(),
          fetchNotificationSubscriptions(),
        ]);

        if (catResult.status === 'fulfilled' && catResult.value.success) {
          setCategories(catResult.value.data?.categories || []);
        }
        if (logsResult.status === 'fulfilled' && logsResult.value.success) {
          setLogs(logsResult.value.data?.data || []);
        }
        if (subResult.status === 'fulfilled' && subResult.value.success) {
          setSubscriptions(subResult.value.data?.subscriptions || []);
        }
      } else {
        const subResult = await fetchNotificationSubscriptions().catch(() => null);
        if (subResult?.success) {
          setSubscriptions(subResult.data?.subscriptions || []);
        }
      }
    } catch {
      // quiet
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canManageNotificationAdmin]);

  useEffect(() => {
    void loadData();
  }, [loadData, activeClinicId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData();
  }, [loadData]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return history.filter(item => {
      const read = boolFromApi(item.is_read);
      const statusMatch =
        statusFilter === 'all' ||
        (statusFilter === 'read' && read) ||
        (statusFilter === 'unread' && !read);

      const itemRoleId = String(item.role_id ?? '').trim();
      const itemRoleName = String(item.role_name ?? '').trim().toLowerCase();
      const roleMatch =
        historyRoleFilter === 'all' ||
        itemRoleId === historyRoleFilter ||
        itemRoleName === historyRoleFilter.toLowerCase();

      const textMatch =
        !q ||
        item.message?.toLowerCase().includes(q) ||
        item.not_cat_name?.toLowerCase().includes(q) ||
        item.recipient_name?.toLowerCase().includes(q) ||
        item.role_name?.toLowerCase().includes(q);

      return statusMatch && roleMatch && textMatch;
    });
  }, [history, historyRoleFilter, searchText, statusFilter]);

  // Filtered Delivery Logs
  const filteredLogs = useMemo(() => {
    if (logRoleFilter === 'all') return logs;
    return logs.filter(item => {
      const logRoleId = String(item.role_id ?? '').trim();
      const logRoleName = String(item.role_name ?? '').trim().toLowerCase();
      return logRoleId === logRoleFilter || logRoleName === logRoleFilter.toLowerCase();
    });
  }, [logs, logRoleFilter]);

  // Grouped Subscriptions by User
  const subscriptionUsers = useMemo<SubscriptionUserGroup[]>(() => {
    const grouped = new Map<string, SubscriptionUserGroup>();
    subscriptions.forEach(item => {
      const key = `${item.user_type || 'user'}:${item.user_id ?? item.user_name ?? 'unknown'}:${item.clinic_id ?? item.clinic_name ?? 'clinic'}`;
      const existing = grouped.get(key);
      const rowActive = boolFromApi(item.is_subscribed) ? 1 : 0;

      if (existing) {
        existing.rows.push(item);
        existing.activeCount += rowActive;
        return;
      }

      grouped.set(key, {
        key,
        userName: item.user_name || `${item.user_type || 'User'} #${item.user_id ?? '-'}`,
        userType: item.user_type || '-',
        clinicName: item.clinic_name || '-',
        rows: [item],
        activeCount: rowActive,
      });
    });
    return Array.from(grouped.values());
  }, [subscriptions]);

  // Filtered Subscription Users
  const filteredSubscriptionUsers = useMemo(() => {
    const query = subscriptionSearch.trim().toLowerCase();
    return subscriptionUsers.filter(item => {
      const clinicMatch =
        subscriptionClinicFilter === 'all' ||
        item.rows.some(
          row => String(row.clinic_id ?? row.clinic_name ?? '').trim() === subscriptionClinicFilter,
        );

      const roleMatch =
        subscriptionRoleFilter === 'all' ||
        item.userType.toLowerCase() === subscriptionRoleFilter.toLowerCase();

      const textMatch =
        !query ||
        item.userName.toLowerCase().includes(query) ||
        item.clinicName.toLowerCase().includes(query) ||
        item.userType.toLowerCase().includes(query);

      return clinicMatch && roleMatch && textMatch;
    });
  }, [subscriptionClinicFilter, subscriptionRoleFilter, subscriptionSearch, subscriptionUsers]);

  // Pagination for Subscription Users
  const subscriptionTotalPages = Math.max(1, Math.ceil(filteredSubscriptionUsers.length / SUBSCRIPTION_USERS_PAGE_SIZE));
  const paginatedSubscriptionUsers = useMemo(() => {
    const start = (subscriptionPage - 1) * SUBSCRIPTION_USERS_PAGE_SIZE;
    return filteredSubscriptionUsers.slice(start, start + SUBSCRIPTION_USERS_PAGE_SIZE);
  }, [filteredSubscriptionUsers, subscriptionPage]);

  // Selected User for Subscriptions Modal
  const selectedSubscriptionUser = useMemo(
    () => subscriptionUsers.find(item => item.key === selectedSubscriptionUserKey) || null,
    [selectedSubscriptionUserKey, subscriptionUsers],
  );

  const selectedSubscriptionRows = useMemo(() => {
    if (!selectedSubscriptionUser) return [];
    return selectedSubscriptionUser.rows.map((item, index) => ({ item, index }));
  }, [selectedSubscriptionUser]);

  const modalSubscriptionTotalPages = Math.max(
    1,
    Math.ceil(selectedSubscriptionRows.length / SUBSCRIPTION_MESSAGES_PAGE_SIZE),
  );

  const paginatedSelectedSubscriptionRows = useMemo(() => {
    const start = (modalSubscriptionPage - 1) * SUBSCRIPTION_MESSAGES_PAGE_SIZE;
    return selectedSubscriptionRows.slice(start, start + SUBSCRIPTION_MESSAGES_PAGE_SIZE);
  }, [modalSubscriptionPage, selectedSubscriptionRows]);

  const selectedSubscriptionCategories = useMemo<SubscriptionCategoryGroup[]>(() => {
    if (!selectedSubscriptionUser) return [];
    const grouped = new Map<string, SubscriptionCategoryGroup>();
    paginatedSelectedSubscriptionRows.forEach(({ item, index }) => {
      const categoryName = item.not_cat_name || 'Uncategorized';
      const existing = grouped.get(categoryName);
      if (existing) {
        existing.rows.push({ item, index });
        return;
      }
      grouped.set(categoryName, { categoryName, rows: [{ item, index }] });
    });
    return Array.from(grouped.values());
  }, [paginatedSelectedSubscriptionRows, selectedSubscriptionUser]);

  // Actions
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
    const destination = getMobileNotificationDestination(item, { role, currentUserId });
    onNavigateScreen(destination);
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

  const openSubscriptionModal = (group: SubscriptionUserGroup) => {
    const draft = group.rows.reduce<Record<string, boolean>>((acc, item, index) => {
      acc[getSubscriptionRowKey(item, index)] = boolFromApi(item.is_subscribed);
      return acc;
    }, {});
    setSubscriptionDraft(draft);
    setModalSubscriptionPage(1);
    setSelectedSubscriptionUserKey(group.key);
  };

  const handleUpdateSubscriptionModal = async () => {
    if (!selectedSubscriptionUser) return;
    try {
      setSaving(true);
      const payload = selectedSubscriptionUser.rows.map((item, index) => ({
        not_sub_id: item.not_sub_id,
        user_type: item.user_type,
        user_id: item.user_id,
        not_cat_id: Number(item.not_cat_id),
        clinic_id: item.clinic_id,
        not_id: item.not_id,
        is_subscribed: (subscriptionDraft[getSubscriptionRowKey(item, index)] ? 1 : 0) as 0 | 1,
      }));

      await updateNotificationSubscriptions(payload);
      setSelectedSubscriptionUserKey(null);
      showSuccessToast('Updated', 'User subscriptions updated successfully.');
      void loadData();
    } catch {
      Alert.alert('Error', 'Failed to update subscriptions.');
    } finally {
      setSaving(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim() || !broadcastCategory || !activeClinicId) {
      Alert.alert('Missing Details', 'Please select a category and fill in title and message.');
      return;
    }
    try {
      setSaving(true);
      const payload: BroadcastPayload = {
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        not_cat_id: broadcastCategory,
        clinic_id: activeClinicId,
        target: broadcastTarget,
      };
      await broadcastNotification(payload);
      setBroadcastModalVisible(false);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastCategory(null);
      showSuccessToast('Announcement Sent', 'Broadcast notification dispatched.');
      void loadData();
    } catch {
      Alert.alert('Error', 'Broadcast failed. Please retry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} title="Notification Management" hideClinicBanner={true} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0d9488']} />}>
        {/* 1. Page Header (Exact Screenshot Match) */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Notification Management</Text>
          <Text style={styles.pageSubtitle}>
            Manage history, categories, templates and user subscriptions.
          </Text>
        </View>

        {/* 2. Tabs Vertical Pill Stack (Exact Screenshot Match) */}
        <View style={styles.tabsStack}>
          <TouchableOpacity
            style={[styles.tabItemBtn, activeTab === 'history' && styles.tabItemBtnActive]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('history')}>
            <Text style={[styles.tabItemText, activeTab === 'history' && styles.tabItemTextActive]}>
              Notification History
            </Text>
          </TouchableOpacity>

          {canManageNotificationAdmin && (
            <TouchableOpacity
              style={[styles.tabItemBtn, activeTab === 'category' && styles.tabItemBtnActive]}
              activeOpacity={0.8}
              onPress={() => setActiveTab('category')}>
              <Text style={[styles.tabItemText, activeTab === 'category' && styles.tabItemTextActive]}>
                Notification Category
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.tabItemBtn, activeTab === 'subscriptions' && styles.tabItemBtnActive]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('subscriptions')}>
            <Text style={[styles.tabItemText, activeTab === 'subscriptions' && styles.tabItemTextActive]}>
              User Subscriptions
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#0d9488" />
            <Text style={styles.loadingText}>Loading notification data...</Text>
          </View>
        ) : (
          <>
            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* TAB 1: NOTIFICATION HISTORY (EXACT SCREENSHOT REPLICA) */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {activeTab === 'history' && (
              <View style={styles.mainWhiteCard}>
                {/* Title */}
                <Text style={styles.cardHeaderTitle}>Notification History</Text>

                {/* Full-width Unread Strip (Exact Screenshot Match) */}
                <View style={styles.unreadStrip}>
                  <Text style={styles.unreadStripText}>Unread: {unreadCount}</Text>
                </View>

                {/* Buttons (Exact Web RBAC Match: Controlled by canEdit and canDelete) */}
                {canEditNotifications && (
                  <TouchableOpacity
                    style={styles.markAllReadButton}
                    activeOpacity={0.8}
                    disabled={saving || !unreadCount}
                    onPress={handleMarkAllRead}>
                    <CheckCircle2 size={18} color="#0f172a" style={{ marginRight: 8 }} />
                    <Text style={styles.markAllReadText}>Mark All Read</Text>
                  </TouchableOpacity>
                )}

                {canDeleteNotifications && (
                  <TouchableOpacity
                    style={[styles.clearHistoryButton, history.length === 0 && styles.disabledButton]}
                    activeOpacity={0.8}
                    disabled={saving || history.length === 0}
                    onPress={handleClearHistory}>
                    <Trash2 size={18} color="#dc2626" style={{ marginRight: 8 }} />
                    <Text style={styles.clearHistoryText}>Clear History</Text>
                  </TouchableOpacity>
                )}

                {/* Search Box (Exact Screenshot Match) */}
                <View style={styles.searchBox}>
                  <Search size={18} color="#94a3b8" style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search..."
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

                {/* All Roles Selector (Exact Screenshot Match) */}
                <TouchableOpacity
                  style={styles.selectTriggerBox}
                  activeOpacity={0.8}
                  onPress={() => setRoleModalVisible(true)}>
                  <Text style={styles.selectTriggerText} numberOfLines={1}>
                    {historyRoleFilter === 'all'
                      ? 'All Roles'
                      : roles.find(r => String(r.role_id) === historyRoleFilter)?.role_name || historyRoleFilter}
                  </Text>
                  <ChevronDown size={18} color="#64748b" />
                </TouchableOpacity>

                {/* All Status Selector (Exact Screenshot Match) */}
                <TouchableOpacity
                  style={[styles.selectTriggerBox, { marginBottom: 16 }]}
                  activeOpacity={0.8}
                  onPress={() => setStatusModalVisible(true)}>
                  <Text style={styles.selectTriggerText}>
                    {statusFilter === 'all' ? 'All Status' : statusFilter === 'read' ? 'Read' : 'Unread'}
                  </Text>
                  <ChevronDown size={18} color="#64748b" />
                </TouchableOpacity>

                {/* Notification Cards List (Exact Screenshot Card Match) */}
                <View style={styles.cardsList}>
                  {filteredHistory.map(item => {
                    const isRead = boolFromApi(item.is_read);
                    return (
                      <TouchableOpacity
                        key={`notif-${item.not_rec_id}`}
                        activeOpacity={0.8}
                        onPress={() => handleNotificationOpen(item)}
                        style={[
                          styles.notifCard,
                          isRead ? styles.notifCardRead : styles.notifCardUnread,
                        ]}>
                        {/* Top: Category Title & Date on Left, Badge on Right */}
                        <View style={styles.notifCardTopRow}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={styles.notifCardTitle}>
                              {item.not_cat_name || item.title || 'Notification'}
                            </Text>
                            <Text style={styles.notifCardDate}>
                              {formatDateTime(item.sent_at || item.created_at)}
                            </Text>
                          </View>
                          <View style={[styles.notifPillBadge, isRead && styles.notifPillBadgeRead]}>
                            <Text style={[styles.notifPillBadgeText, isRead && styles.notifPillBadgeReadText]}>
                              {isRead ? 'Read' : 'Unread'}
                            </Text>
                          </View>
                        </View>

                        {/* Message Body */}
                        <Text style={styles.notifCardMessage}>{item.message || '-'}</Text>

                        {/* Divider & Footer: To Name on Left, Role Pill adjacent */}
                        <View style={styles.notifCardFooterRow}>
                          <Text style={styles.notifToLabel}>
                            To: <Text style={styles.notifToName}>{item.recipient_name || '-'}</Text>
                          </Text>
                          <View style={styles.notifRolePill}>
                            <Text style={styles.notifRolePillText}>
                              {item.role_name ? prettifyRoleName(String(item.role_name)) : '-'}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {filteredHistory.length === 0 && (
                    <View style={styles.emptyCard}>
                      <Bell size={36} color="#cbd5e1" style={{ marginBottom: 10 }} />
                      <Text style={styles.emptyText}>No notifications found.</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* TAB 2: NOTIFICATION CATEGORY (EXACT SCREENSHOT REPLICA) */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {activeTab === 'category' && canManageNotificationAdmin && (
              <View style={styles.mainWhiteCard}>
                <Text style={styles.cardHeaderTitle}>Notification Categories</Text>

                <View style={styles.cardsList}>
                  {categories.map(cat => (
                    <View key={`cat-${cat.not_cat_id}`} style={styles.categoryCardBox}>
                      <Text style={styles.categoryLine}>
                        <Text style={styles.categoryLabel}>Category: </Text>
                        <Text style={styles.categoryValue}>{cat.not_cat_name || '-'}</Text>
                      </Text>
                      <Text style={[styles.categoryLine, { marginTop: 6 }]}>
                        <Text style={styles.categoryLabel}>Description: </Text>
                        <Text style={styles.categoryValue}>{cat.description || '-'}</Text>
                      </Text>
                    </View>
                  ))}

                  {categories.length === 0 && (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyText}>No notification categories available.</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* TAB 3: USER SUBSCRIPTIONS (EXACT SCREENSHOT REPLICA) */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {activeTab === 'subscriptions' && (
              <View style={{ gap: 16 }}>
                {/* Header Block (Exact Screenshot: Bell + Title, Subtitle, Full-Width Refresh) */}
                <View style={{ marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <Bell size={24} color="#0f172a" />
                    <Text style={styles.cardHeaderTitle}>User Subscriptions</Text>
                  </View>
                  <Text style={[styles.pageSubtitle, { marginTop: 0, marginBottom: 14 }]}>
                    Manage user notification preferences and subscriptions
                  </Text>
                  <RefreshButton onRefresh={loadData} loading={refreshing} />
                </View>

                <View style={styles.mainWhiteCard}>
                  {/* Search Box (Exact Screenshot Match) */}
                  <View style={styles.searchBox}>
                    <Search size={18} color="#94a3b8" style={{ marginRight: 10 }} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search by name..."
                      placeholderTextColor="#94a3b8"
                      value={subscriptionSearch}
                      onChangeText={setSubscriptionSearch}
                    />
                  </View>

                  {/* All Clinics Selector (Full Width, Exact Screenshot Match) */}
                  <TouchableOpacity
                    style={styles.selectTriggerBox}
                    activeOpacity={0.8}
                    onPress={() => setClinicModalVisible(true)}>
                    <Text style={styles.selectTriggerText} numberOfLines={1}>
                      {subscriptionClinicFilter === 'all'
                        ? 'All Clinics'
                        : clinicOptions.find(c => c.id === subscriptionClinicFilter)?.name || subscriptionClinicFilter}
                    </Text>
                    <ChevronDown size={18} color="#64748b" />
                  </TouchableOpacity>

                  {/* All Roles Selector (Full Width, Exact Screenshot Match) */}
                  <TouchableOpacity
                    style={[styles.selectTriggerBox, { marginBottom: 16 }]}
                    activeOpacity={0.8}
                    onPress={() => setSubRoleModalVisible(true)}>
                    <Text style={styles.selectTriggerText}>
                      {subscriptionRoleFilter === 'all'
                        ? 'All Roles'
                        : subscriptionRoleFilter === 'staff'
                          ? 'Staff'
                          : 'Patient'}
                    </Text>
                    <ChevronDown size={18} color="#64748b" />
                  </TouchableOpacity>

                  {/* Subscription Cards List */}
                  <View style={styles.cardsList}>
                    {paginatedSubscriptionUsers.map(item => (
                      <View key={`sub-user-${item.key}`} style={styles.subUserCardBox}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={styles.subUserName}>{item.userName}</Text>
                            <Text style={styles.subUserClinic}>{item.clinicName}</Text>
                          </View>
                          <View style={styles.notifRolePill}>
                            <Text style={styles.notifRolePillText}>{item.userType}</Text>
                          </View>
                        </View>

                        <View style={styles.subCardBodyBox}>
                          <Text style={styles.subCatLabel}>CATEGORIES</Text>
                          <Text style={styles.subCatText}>
                            {Array.from(new Set(item.rows.map(r => r.not_cat_name).filter(Boolean))).join(', ') || '-'}
                          </Text>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                            <View style={styles.systemPill}>
                              <Text style={styles.systemPillText}>{item.rows.length} System</Text>
                            </View>
                            <View style={styles.activePill}>
                              <Bell size={13} color="#047857" style={{ marginRight: 4 }} />
                              <Text style={styles.activePillText}>{item.activeCount} Active</Text>
                            </View>
                          </View>

                          <TouchableOpacity
                            style={styles.manageSubButton}
                            activeOpacity={0.8}
                            onPress={() => openSubscriptionModal(item)}>
                            <Text style={styles.manageSubButtonText}>Manage Subscriptions</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}

                    {filteredSubscriptionUsers.length === 0 && (
                      <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No subscriptions available.</Text>
                      </View>
                    )}
                  </View>

                  {/* Pagination Footer */}
                  {filteredSubscriptionUsers.length > 0 && (
                    <View style={styles.paginationRow}>
                      <Text style={styles.paginationLabel}>
                        Showing {(subscriptionPage - 1) * SUBSCRIPTION_USERS_PAGE_SIZE + 1}-
                        {Math.min(subscriptionPage * SUBSCRIPTION_USERS_PAGE_SIZE, filteredSubscriptionUsers.length)} of{' '}
                        {filteredSubscriptionUsers.length} users
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                          style={[styles.pageNavBtn, subscriptionPage <= 1 && styles.disabledButton]}
                          disabled={subscriptionPage <= 1}
                          onPress={() => setSubscriptionPage(p => Math.max(1, p - 1))}>
                          <Text style={styles.pageNavBtnText}>Previous</Text>
                        </TouchableOpacity>
                        <Text style={styles.pageNavText}>
                          {subscriptionPage} / {subscriptionTotalPages}
                        </Text>
                        <TouchableOpacity
                          style={[styles.pageNavBtn, subscriptionPage >= subscriptionTotalPages && styles.disabledButton]}
                          disabled={subscriptionPage >= subscriptionTotalPages}
                          onPress={() => setSubscriptionPage(p => Math.min(subscriptionTotalPages, p + 1))}>
                          <Text style={styles.pageNavBtnText}>Next</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>

                {/* Delivery Logs Card (Exact Screenshot Match) */}
                {canManageNotificationAdmin && (
                  <View style={[styles.mainWhiteCard, { marginTop: 16 }]}>
                    <Text style={styles.cardHeaderTitle}>Delivery Logs</Text>

                    {/* All Roles Selector (Full Width, Exact Screenshot Match) */}
                    <TouchableOpacity
                      style={[styles.selectTriggerBox, { marginBottom: 14 }]}
                      activeOpacity={0.8}
                      onPress={() => setLogRoleModalVisible(true)}>
                      <Text style={styles.selectTriggerText} numberOfLines={1}>
                        {logRoleFilter === 'all'
                          ? 'All Roles'
                          : roles.find(r => String(r.role_id) === logRoleFilter)?.role_name || logRoleFilter}
                      </Text>
                      <ChevronDown size={18} color="#64748b" />
                    </TouchableOpacity>

                    {/* Delivery Log Cards List (Exact Screenshot Match) */}
                    <View style={styles.cardsList}>
                      {filteredLogs.map(log => (
                        <View key={`log-${log.not_log_id}`} style={styles.deliveryLogCard}>
                          {/* Top: Role Name and Sent At on Left, Status Badge on Right */}
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text style={styles.subUserName}>
                                {log.role_name ? prettifyRoleName(String(log.role_name)) : log.user_type || 'Recipient'}
                              </Text>
                              <Text style={styles.notifCardDate}>{formatDateTime(log.sent_at)}</Text>
                            </View>
                            <View style={styles.notifRolePill}>
                              <Text style={styles.notifRolePillText}>{log.status || '-'}</Text>
                            </View>
                          </View>

                          {/* 2x2 Meta Grid (Exact Screenshot Match) */}
                          <View style={styles.logGridBox}>
                            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.logMetaLabel}>Role ID</Text>
                                <Text style={styles.logMetaVal}>{log.role_id ?? '-'}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.logMetaLabel}>User ID</Text>
                                <Text style={styles.logMetaVal}>{log.user_id || '-'}</Text>
                              </View>
                            </View>
                            <View style={{ flexDirection: 'row' }}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.logMetaLabel}>User Type</Text>
                                <Text style={styles.logMetaVal}>{log.user_type || '-'}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.logMetaLabel}>Channel</Text>
                                <Text style={styles.logMetaVal}>{log.channel || '-'}</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}

                      {filteredLogs.length === 0 && (
                        <View style={styles.emptyCard}>
                          <Text style={styles.emptyText}>No delivery logs found.</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: MANAGE USER SUBSCRIPTIONS */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <AppModal
        visible={Boolean(selectedSubscriptionUser)}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!saving) setSelectedSubscriptionUserKey(null);
        }}>
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            {selectedSubscriptionUser && (
              <>
                <View style={styles.dialogHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.dialogTitle}>
                      Manage Subscriptions - {selectedSubscriptionUser.userName}
                    </Text>
                    <Text style={styles.dialogSubtitle}>
                      {selectedSubscriptionUser.clinicName} • {selectedSubscriptionUser.userType}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedSubscriptionUserKey(null)}
                    style={{ padding: 4 }}>
                    <X size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 380, padding: 16 }}>
                  {selectedSubscriptionCategories.map(cat => (
                    <View key={`cat-sec-${cat.categoryName}`} style={styles.categoryGroupBox}>
                      <Text style={styles.categoryGroupTitle}>{cat.categoryName}</Text>
                      <View style={{ backgroundColor: '#ffffff' }}>
                        {cat.rows.map(({ item, index }) => {
                          const key = getSubscriptionRowKey(item, index);
                          return (
                            <View key={`row-${key}`} style={styles.toggleRow}>
                              <Text style={styles.toggleText}>{getSubscriptionMessage(item)}</Text>
                              <Switch
                                value={Boolean(subscriptionDraft[key])}
                                onValueChange={checked =>
                                  setSubscriptionDraft(prev => ({ ...prev, [key]: checked }))
                                }
                                trackColor={{ false: '#e2e8f0', true: '#0f172a' }}
                                thumbColor="#ffffff"
                              />
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {/* Sub Modal Pagination */}
                <View style={styles.dialogPaginationRow}>
                  <Text style={styles.paginationLabel}>
                    Showing {(modalSubscriptionPage - 1) * SUBSCRIPTION_MESSAGES_PAGE_SIZE + 1}-
                    {Math.min(
                      modalSubscriptionPage * SUBSCRIPTION_MESSAGES_PAGE_SIZE,
                      selectedSubscriptionRows.length,
                    )}{' '}
                    of {selectedSubscriptionRows.length} messages
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.pageNavBtn, modalSubscriptionPage <= 1 && styles.disabledButton]}
                      disabled={modalSubscriptionPage <= 1}
                      onPress={() => setModalSubscriptionPage(p => Math.max(1, p - 1))}>
                      <Text style={styles.pageNavBtnText}>Previous</Text>
                    </TouchableOpacity>
                    <Text style={styles.pageNavText}>
                      {modalSubscriptionPage} / {modalSubscriptionTotalPages}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.pageNavBtn,
                        modalSubscriptionPage >= modalSubscriptionTotalPages && styles.disabledButton,
                      ]}
                      disabled={modalSubscriptionPage >= modalSubscriptionTotalPages}
                      onPress={() => setModalSubscriptionPage(p => Math.min(modalSubscriptionTotalPages, p + 1))}>
                      <Text style={styles.pageNavBtnText}>Next</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.dialogFooter}>
                  <TouchableOpacity
                    style={styles.dialogCancelBtn}
                    disabled={saving}
                    onPress={() => setSelectedSubscriptionUserKey(null)}>
                    <Text style={styles.dialogCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dialogSaveBtn}
                    disabled={saving}
                    onPress={handleUpdateSubscriptionModal}>
                    {saving ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.dialogSaveBtnText}>Update Subscription</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </AppModal>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: BROADCAST ANNOUNCEMENT */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <AppModal
        visible={broadcastModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!saving) setBroadcastModalVisible(false);
        }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.dialogTitle}>Broadcast Announcement</Text>
                <Text style={styles.dialogSubtitle}>Send alert to all staff, patients, or everyone.</Text>
              </View>
              <TouchableOpacity onPress={() => setBroadcastModalVisible(false)} style={{ padding: 4 }}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              <Text style={styles.fieldLabel}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {categories.map(c => (
                  <TouchableOpacity
                    key={`b-cat-${c.not_cat_id}`}
                    style={[styles.categoryChip, broadcastCategory === c.not_cat_id && styles.categoryChipActive]}
                    onPress={() => setBroadcastCategory(c.not_cat_id)}>
                    <Text
                      style={[styles.categoryChipText, broadcastCategory === c.not_cat_id && styles.categoryChipTextActive]}>
                      {c.not_cat_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Recipients Target</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                {(['all', 'staff', 'patients'] as const).map(target => (
                  <TouchableOpacity
                    key={`target-${target}`}
                    style={[styles.targetChoiceBtn, broadcastTarget === target && styles.targetChoiceBtnActive]}
                    onPress={() => setBroadcastTarget(target)}>
                    <Text style={[styles.targetChoiceText, broadcastTarget === target && styles.targetChoiceTextActive]}>
                      {target.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Broadcast Title *</Text>
              <TextInput
                style={styles.dialogInput}
                placeholder="Announcement Title"
                placeholderTextColor="#94a3b8"
                value={broadcastTitle}
                onChangeText={setBroadcastTitle}
              />

              <Text style={styles.fieldLabel}>Message *</Text>
              <TextInput
                style={[styles.dialogInput, { height: 90, textAlignVertical: 'top' }]}
                placeholder="Type broadcast message here..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                value={broadcastMessage}
                onChangeText={setBroadcastMessage}
              />
            </ScrollView>

            <View style={styles.dialogFooter}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                disabled={saving}
                onPress={() => setBroadcastModalVisible(false)}>
                <Text style={styles.dialogCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogSaveBtn, (!broadcastCategory || !broadcastTitle.trim()) && styles.disabledButton]}
                disabled={saving || !broadcastCategory || !broadcastTitle.trim()}
                onPress={handleBroadcast}>
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.dialogSaveBtnText}>Send Broadcast</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </AppModal>

      {/* ─── Role Filter Picker Modal ─── */}
      <AppModal
        visible={roleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleModalVisible(false)}>
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setRoleModalVisible(false)}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerHeaderTitle}>Select Role</Text>
            <ScrollView style={{ maxHeight: 260 }}>
              <TouchableOpacity
                style={[styles.pickerItemRow, historyRoleFilter === 'all' && styles.pickerItemRowActive]}
                onPress={() => {
                  setHistoryRoleFilter('all');
                  setRoleModalVisible(false);
                }}>
                <Text style={styles.pickerItemText}>All Roles</Text>
              </TouchableOpacity>
              {roles.map(r => (
                <TouchableOpacity
                  key={`r-opt-${r.role_id}`}
                  style={[styles.pickerItemRow, historyRoleFilter === String(r.role_id) && styles.pickerItemRowActive]}
                  onPress={() => {
                    setHistoryRoleFilter(String(r.role_id));
                    setRoleModalVisible(false);
                  }}>
                  <Text style={styles.pickerItemText}>{r.role_name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </AppModal>

      {/* ─── Status Filter Picker Modal ─── */}
      <AppModal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}>
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setStatusModalVisible(false)}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerHeaderTitle}>Select Status</Text>
            {(['all', 'read', 'unread'] as const).map(s => (
              <TouchableOpacity
                key={`s-opt-${s}`}
                style={[styles.pickerItemRow, statusFilter === s && styles.pickerItemRowActive]}
                onPress={() => {
                  setStatusFilter(s);
                  setStatusModalVisible(false);
                }}>
                <Text style={styles.pickerItemText}>
                  {s === 'all' ? 'All Status' : s === 'read' ? 'Read' : 'Unread'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </AppModal>

      {/* ─── Clinic Filter Picker Modal ─── */}
      <AppModal
        visible={clinicModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setClinicModalVisible(false)}>
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setClinicModalVisible(false)}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerHeaderTitle}>Select Clinic</Text>
            <ScrollView style={{ maxHeight: 260 }}>
              <TouchableOpacity
                style={[styles.pickerItemRow, subscriptionClinicFilter === 'all' && styles.pickerItemRowActive]}
                onPress={() => {
                  setSubscriptionClinicFilter('all');
                  setClinicModalVisible(false);
                }}>
                <Text style={styles.pickerItemText}>All Clinics</Text>
              </TouchableOpacity>
              {clinicOptions.map(c => (
                <TouchableOpacity
                  key={`c-opt-${c.id}`}
                  style={[styles.pickerItemRow, subscriptionClinicFilter === c.id && styles.pickerItemRowActive]}
                  onPress={() => {
                    setSubscriptionClinicFilter(c.id);
                    setClinicModalVisible(false);
                  }}>
                  <Text style={styles.pickerItemText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </AppModal>

      {/* ─── Subscription Role Filter Picker Modal ─── */}
      <AppModal
        visible={subRoleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSubRoleModalVisible(false)}>
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setSubRoleModalVisible(false)}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerHeaderTitle}>Select Role</Text>
            {['all', 'staff', 'patient'].map(r => (
              <TouchableOpacity
                key={`sub-r-${r}`}
                style={[styles.pickerItemRow, subscriptionRoleFilter === r && styles.pickerItemRowActive]}
                onPress={() => {
                  setSubscriptionRoleFilter(r);
                  setSubRoleModalVisible(false);
                }}>
                <Text style={styles.pickerItemText}>
                  {r === 'all' ? 'All Roles' : r === 'staff' ? 'Staff' : 'Patient'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </AppModal>

      {/* ─── Log Role Filter Picker Modal ─── */}
      <AppModal
        visible={logRoleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogRoleModalVisible(false)}>
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setLogRoleModalVisible(false)}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerHeaderTitle}>Select Role</Text>
            <ScrollView style={{ maxHeight: 260 }}>
              <TouchableOpacity
                style={[styles.pickerItemRow, logRoleFilter === 'all' && styles.pickerItemRowActive]}
                onPress={() => {
                  setLogRoleFilter('all');
                  setLogRoleModalVisible(false);
                }}>
                <Text style={styles.pickerItemText}>All Roles</Text>
              </TouchableOpacity>
              {roles.map(r => (
                <TouchableOpacity
                  key={`log-r-${r.role_id}`}
                  style={[styles.pickerItemRow, logRoleFilter === String(r.role_id) && styles.pickerItemRowActive]}
                  onPress={() => {
                    setLogRoleFilter(String(r.role_id));
                    setLogRoleModalVisible(false);
                  }}>
                  <Text style={styles.pickerItemText}>{r.role_name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </AppModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },

  // 1. Page Header (Exact Screenshot)
  pageHeader: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 18,
  },

  // 2. Vertical Tabs Stack (Exact Screenshot)
  tabsStack: {
    backgroundColor: '#cbd5e1',
    borderRadius: 8,
    padding: 3,
    gap: 2,
    marginBottom: 16,
  },
  tabItemBtn: {
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  tabItemBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
  },
  tabItemTextActive: {
    color: '#0f172a',
    fontWeight: '600',
  },

  // 3. Main White Card Container (Exact Screenshot)
  mainWhiteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },

  // Full-width Unread Strip (Exact Screenshot)
  unreadStrip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  unreadStripText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },

  // Mark All Read Button (Exact Screenshot)
  markAllReadButton: {
    width: '100%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginBottom: 10,
  },
  markAllReadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },

  // Clear History Button (Exact Screenshot)
  clearHistoryButton: {
    width: '100%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    marginBottom: 14,
  },
  clearHistoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },

  broadcastBannerBtn: {
    width: '100%',
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    marginBottom: 14,
  },
  broadcastBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },

  // Search Box (Exact Screenshot)
  searchBox: {
    width: '100%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#0f172a',
  },

  // Select Triggers (Exact Screenshot)
  selectTriggerBox: {
    width: '100%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  selectTriggerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },

  // Notification Cards List
  cardsList: {
    gap: 12,
  },

  // Notification Card (Exact Screenshot: Cyan tint with border for unread)
  notifCard: {
    borderRadius: 16,
    padding: 16,
  },
  notifCardUnread: {
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#a5f3fc',
  },
  notifCardRead: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  notifCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  notifCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  notifCardDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
  },
  notifPillBadge: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  notifPillBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  notifPillBadgeRead: {
    backgroundColor: '#f1f5f9',
    borderColor: 'transparent',
  },
  notifPillBadgeReadText: {
    color: '#475569',
  },
  notifCardMessage: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
    marginTop: 12,
    marginBottom: 14,
  },

  notifCardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.9)',
  },
  notifToLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  notifToName: {
    fontWeight: '600',
    color: '#334155',
  },
  notifRolePill: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  notifRolePillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },

  // Loader & Empty States
  loaderBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
  emptyCard: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  disabledButton: {
    opacity: 0.5,
  },

  // Section Header Flex
  sectionHeaderFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  // Category Tab Styles (Exact Screenshot)
  categoryCardBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 10,
  },
  categoryLine: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  categoryLabel: {
    fontWeight: '700',
    color: '#1e293b',
  },
  categoryValue: {
    fontWeight: '400',
    color: '#334155',
  },

  // Subscriptions Tab Specifics (Exact Screenshot Match)
  subUserCardBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 12,
  },
  subUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  subUserClinic: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  subCardBodyBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  subCatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  subCatText: {
    fontSize: 14,
    color: '#334155',
    marginTop: 4,
    lineHeight: 20,
  },
  systemPill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  systemPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  activePillText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '600',
  },
  manageSubButton: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    backgroundColor: '#ffffff',
  },
  manageSubButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },

  // Pagination Row
  paginationRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  paginationLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  pageNavBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  pageNavBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  pageNavText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },

  // Delivery Logs Specifics (Exact Screenshot Match)
  deliveryLogCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 12,
  },
  logGridBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  logMetaLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  logMetaVal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 2,
  },

  // Modals Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialogCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  dialogSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  categoryGroupBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoryGroupTitle: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  toggleText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
    marginRight: 10,
  },
  dialogPaginationRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  dialogFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  dialogCancelBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  dialogCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  dialogSaveBtn: {
    flex: 1.4,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  dialogSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Broadcast Modal Components
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
    marginBottom: 4,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#0d9488',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  targetChoiceBtn: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  targetChoiceBtnActive: {
    borderColor: '#0d9488',
    backgroundColor: '#f0fdf4',
  },
  targetChoiceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  targetChoiceTextActive: {
    color: '#0d9488',
    fontWeight: '800',
  },
  dialogInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },

  // Filter Pickers
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    elevation: 10,
  },
  pickerHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  pickerItemRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerItemRowActive: {
    backgroundColor: '#f0fdf4',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
});

export default NotificationsCenterScreen;
