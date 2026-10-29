import { colors, spacing } from '../../theme/tokens';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { styles } from './styles/NotificationsCenterScreen.styles';
// Exact Web Mobile Responsive Parity - Notifications Center
import { AppModal } from '../../components/common/AppModal';
import { LiquidBorderTouchable } from '../../components/common/LiquidBorderSurface';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LiquidBorderScrollView } from '../../components/common/LiquidBorderScrollView';
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Search,
  Trash2,
  X,
} from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { PatientHeader } from '../../components/common/PatientHeader';
import { RefreshButton } from '../../components/common/RefreshButton';
import { useAuthContext } from '../../context/AuthContext';
import {
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
  type NotificationCategoryItem,
  type NotificationClinicOption,
  type NotificationInboxItem,
  type NotificationLogItem,
  type NotificationSubscriptionItem,
  type UserRoleRecord,
} from '../../api/notificationApi';
import { getMobileNotificationDestination } from '../../utils/notificationNavigation';
import { navigateStaffScreen } from '../../utils/navigationEvents';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import { canUseStaffScreen } from '../../navigation/staffAccess';

interface Props {
  onOpenDrawer: () => void;
  onNavigateScreen?: (screen: string) => void;
  patientMode?: boolean;
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

const fetchSubscriptionsAcrossClinics = async (clinics: NotificationClinicOption[]) => {
  if (!clinics.length) {
    const result = await fetchNotificationSubscriptions();
    return result.success ? result.data?.subscriptions || [] : [];
  }
  const results = await Promise.allSettled(
    clinics.map(clinic => fetchNotificationSubscriptions({ clinicId: clinic.id })),
  );
  return results.flatMap(result =>
    result.status === 'fulfilled' && result.value.success
      ? result.value.data?.subscriptions || []
      : [],
  );
};

const fetchSubscriptionsForClinicFilter = async (
  clinicId: string,
  clinics: NotificationClinicOption[],
) => {
  if (clinicId !== 'all') {
    const result = await fetchNotificationSubscriptions({ clinicId });
    return result.success ? result.data?.subscriptions || [] : [];
  }
  return fetchSubscriptionsAcrossClinics(clinics);
};

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
  patientMode = false,
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
  const [subscriptionReloadKey, setSubscriptionReloadKey] = useState(0);
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
        const [catResult, logsResult] = await Promise.allSettled([
          fetchNotificationCategories(),
          fetchNotificationLogs(),
        ]);

        if (catResult.status === 'fulfilled' && catResult.value.success) {
          setCategories(catResult.value.data?.categories || []);
        }
        if (logsResult.status === 'fulfilled' && logsResult.value.success) {
          setLogs(logsResult.value.data?.data || []);
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

  useEffect(() => {
    let active = true;
    fetchSubscriptionsForClinicFilter(subscriptionClinicFilter, clinicOptions)
      .then(rows => { if (active) setSubscriptions(rows); })
      .catch(() => { if (active) setSubscriptions([]); });
    return () => { active = false; };
  }, [clinicOptions, subscriptionClinicFilter, subscriptionReloadKey]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSubscriptionReloadKey(value => value + 1);
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
    if (!boolFromApi(item.is_read) && canEditNotifications) {
      try {
        const response = await markNotificationAsRead(item.not_rec_id);
        if (!response.success) throw new Error(response.message);
        setHistory(prev => prev.map(n => (n.not_rec_id === item.not_rec_id ? { ...n, is_read: 1 } : n)));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        showErrorToast('Failed to mark notification', error instanceof Error ? error.message : 'Please try again.');
      }
    }
    const destination = getMobileNotificationDestination(item, { role, currentUserId });
    onNavigateScreen(destination);
  };

  const handleMarkAllRead = async () => {
    try {
      setSaving(true);
      const response = await markAllNotificationsAsRead();
      if (!response.success) throw new Error(response.message);
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
            const response = await clearMyNotifications();
            if (!response.success) throw new Error(response.message);
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

      const response = await updateNotificationSubscriptions(payload);
      if (!response.success) throw new Error(response.message);
      setSelectedSubscriptionUserKey(null);
      showSuccessToast('Updated', 'User subscriptions updated successfully.');
      setSubscriptionReloadKey(value => value + 1);
    } catch {
      Alert.alert('Error', 'Failed to update subscriptions.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {patientMode
        ? <PatientHeader onOpenDrawer={onOpenDrawer} unreadCount={unreadCount} />
        : <StaffHeader onOpenDrawer={onOpenDrawer} title="Notification Management" hideClinicBanner={true} />}

      <FlatList
        data={activeTab === 'history' && !loading ? filteredHistory : []}
        keyExtractor={item => `notif-${item.not_rec_id}`}
        renderItem={({ item }) => {
          const isRead = boolFromApi(item.is_read);
          return (
            <LiquidBorderTouchable
              activeOpacity={0.8}
              onPress={() => handleNotificationOpen(item)}
              radius={16}
              style={[styles.notifCard, isRead ? styles.notifCardRead : styles.notifCardUnread]}>
              <View style={styles.notifCardTopRow}>
                <View style={{ flex: 1, paddingRight: spacing.sm }}>
                  <Text style={styles.notifCardTitle}>{item.not_cat_name || item.title || 'Notification'}</Text>
                  <Text style={styles.notifCardDate}>{formatDateTime(item.sent_at || item.created_at)}</Text>
                </View>
                <View style={[styles.notifPillBadge, isRead && styles.notifPillBadgeRead]}>
                  <Text style={[styles.notifPillBadgeText, isRead && styles.notifPillBadgeReadText]}>
                    {isRead ? 'Read' : 'Unread'}
                  </Text>
                </View>
              </View>
              <Text style={styles.notifCardMessage}>{item.message || '-'}</Text>
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
            </LiquidBorderTouchable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.notifListSeparator} />}
        ListHeaderComponent={<View>
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
            <ActivityIndicator size="large" color={colors.primary} />
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
                <TouchableOpacity
                    style={styles.markAllReadButton}
                    activeOpacity={0.8}
                    disabled={saving || !unreadCount}
                    onPress={handleMarkAllRead}>
                    <CheckCircle2 size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                    <Text style={styles.markAllReadText}>Mark All Read</Text>
                </TouchableOpacity>

                {canDeleteNotifications && (
                  <TouchableOpacity
                    style={[styles.clearHistoryButton, history.length === 0 && styles.disabledButton]}
                    activeOpacity={0.8}
                    disabled={saving || history.length === 0}
                    onPress={handleClearHistory}>
                    <Trash2 size={18} color={colors.destructive} style={{ marginRight: spacing.sm }} />
                    <Text style={styles.clearHistoryText}>Clear History</Text>
                  </TouchableOpacity>
                )}

                {/* Search Box (Exact Screenshot Match) */}
                <View style={styles.searchBox}>
                  <Search size={18} color={colors.subtle} style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search..."
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
                  <ChevronDown size={18} color={colors.muted} />
                </TouchableOpacity>

                {/* All Status Selector (Exact Screenshot Match) */}
                <TouchableOpacity
                  style={[styles.selectTriggerBox, { marginBottom: spacing.lg }]}
                  activeOpacity={0.8}
                  onPress={() => setStatusModalVisible(true)}>
                  <Text style={styles.selectTriggerText}>
                    {statusFilter === 'all' ? 'All Status' : statusFilter === 'read' ? 'Read' : 'Unread'}
                  </Text>
                  <ChevronDown size={18} color={colors.muted} />
                </TouchableOpacity>

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
                      <Text style={[styles.categoryLine, { marginTop: spacing.tiny }]}>
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
              <View style={{ gap: spacing.lg }}>
                {/* Header Block (Exact Screenshot: Bell + Title, Subtitle, Full-Width Refresh) */}
                <View style={{ marginBottom: spacing.xs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.xs }}>
                    <Bell size={24} color={colors.text} />
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
                    <Search size={18} color={colors.subtle} style={{ marginRight: 10 }} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search by name..."
                      placeholderTextColor={colors.subtle}
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
                    <ChevronDown size={18} color={colors.muted} />
                  </TouchableOpacity>

                  {/* All Roles Selector (Full Width, Exact Screenshot Match) */}
                  <TouchableOpacity
                    style={[styles.selectTriggerBox, { marginBottom: spacing.lg }]}
                    activeOpacity={0.8}
                    onPress={() => setSubRoleModalVisible(true)}>
                    <Text style={styles.selectTriggerText}>
                      {subscriptionRoleFilter === 'all'
                        ? 'All Roles'
                        : subscriptionRoleFilter === 'staff'
                          ? 'Staff'
                          : 'Patient'}
                    </Text>
                    <ChevronDown size={18} color={colors.muted} />
                  </TouchableOpacity>

                  {/* Subscription Cards List */}
                  <View style={styles.cardsList}>
                    {paginatedSubscriptionUsers.map(item => (
                      <View key={`sub-user-${item.key}`} style={styles.subUserCardBox}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1, paddingRight: spacing.sm }}>
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

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 10 }}>
                            <View style={styles.systemPill}>
                              <Text style={styles.systemPillText}>{item.rows.length} System</Text>
                            </View>
                            <View style={styles.activePill}>
                              <Bell size={13} color="#047857" style={{ marginRight: spacing.xs }} />
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
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
                  <View style={[styles.mainWhiteCard, { marginTop: spacing.lg }]}>
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
                      <ChevronDown size={18} color={colors.muted} />
                    </TouchableOpacity>

                    {/* Delivery Log Cards List (Exact Screenshot Match) */}
                    <View style={styles.cardsList}>
                      {filteredLogs.map(log => (
                        <View key={`log-${log.not_log_id}`} style={styles.deliveryLogCard}>
                          {/* Top: Role Name and Sent At on Left, Status Badge on Right */}
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ flex: 1, paddingRight: spacing.sm }}>
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
                            <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
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
        </View>}
        ListEmptyComponent={loading || activeTab !== 'history' ? undefined : (
          <View style={styles.emptyCard}>
            <Bell size={36} color={colors.input} style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>No notifications found.</Text>
          </View>
        )}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
      />

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
                  <View style={{ flex: 1, paddingRight: spacing.sm }}>
                    <Text style={styles.dialogTitle}>
                      Manage Subscriptions - {selectedSubscriptionUser.userName}
                    </Text>
                    <Text style={styles.dialogSubtitle}>
                      {selectedSubscriptionUser.clinicName} • {selectedSubscriptionUser.userType}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedSubscriptionUserKey(null)}
                    style={{ padding: spacing.xs }}>
                    <X size={20} color={colors.muted} />
                  </TouchableOpacity>
                </View>

                <LiquidBorderScrollView style={{ maxHeight: 380, padding: spacing.lg }}>
                  {selectedSubscriptionCategories.map(cat => (
                    <View key={`cat-sec-${cat.categoryName}`} style={styles.categoryGroupBox}>
                      <Text style={styles.categoryGroupTitle}>{cat.categoryName}</Text>
                      <View style={{ backgroundColor: colors.surface }}>
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
                                trackColor={{ false: colors.border, true: colors.primary }}
                                thumbColor={colors.surface}
                              />
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </LiquidBorderScrollView>

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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
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
                      <ActivityIndicator size="small" color={colors.surface} />
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
            <LiquidBorderScrollView style={{ maxHeight: 260 }}>
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
            </LiquidBorderScrollView>
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
            <LiquidBorderScrollView style={{ maxHeight: 260 }}>
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
            </LiquidBorderScrollView>
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
            <LiquidBorderScrollView style={{ maxHeight: 260 }}>
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
            </LiquidBorderScrollView>
          </View>
        </TouchableOpacity>
      </AppModal>
    </View>
  );
};



export default NotificationsCenterScreen;
