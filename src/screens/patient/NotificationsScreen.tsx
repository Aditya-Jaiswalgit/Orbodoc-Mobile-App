import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import { FloatingDropdown, FloatingDropdownOption } from '../../components/common/FloatingDropdown';
import { useNotifications } from '../../hooks/useNotifications';
import { useClinics } from '../../hooks/useClinics';
import { useAuthContext } from '../../context/AuthContext';
import { Bell, Check, CheckCircle2, ChevronDown, RefreshCw, Search, X } from 'lucide-react-native';

interface NotificationsScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
  onToggleTabBar?: (hide: boolean) => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
  onToggleTabBar,
}) => {
  const { user } = useAuthContext();
  const {
    notifications,
    unreadCount,
    subscriptions,
    loading,
    lastRefreshed,
    refreshNotifications,
    markRead,
    markAllRead,
    updateSubCategories,
  } = useNotifications();
  const { clinics } = useClinics();

  const [activeSegmentTab, setActiveSegmentTab] = useState<'history' | 'subscriptions'>('subscriptions');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [clinicFilter, setClinicFilter] = useState<string>('All Clinics');
  const [roleFilter, setRoleFilter] = useState<string>('All Roles');

  const [showManageModal, setShowManageModal] = useState<boolean>(false);
  const [activeDropdown, setActiveDropdown] = useState<'clinic' | 'subscriptionRole' | 'historyRole' | 'historyStatus' | null>(null);
  const [dropdownAnchor, setDropdownAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyRoleFilter, setHistoryRoleFilter] = useState('All Roles');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('All Status');
  const clinicPickerRef = React.useRef<View>(null);
  const subscriptionRolePickerRef = React.useRef<View>(null);
  const historyRolePickerRef = React.useRef<View>(null);
  const historyStatusPickerRef = React.useRef<View>(null);

  useEffect(() => {
    if (onToggleTabBar) {
      onToggleTabBar(showManageModal || activeDropdown !== null);
    }
  }, [showManageModal, activeDropdown, onToggleTabBar]);

  useEffect(() => {
    return () => {
      onToggleTabBar?.(false);
    };
  }, [onToggleTabBar]);

  const [selectedCatList, setSelectedCatList] = useState<string[]>([
    'User Registration',
    'User Update',
    'Password Change',
    'Appointment',
    'Billing',
  ]);

  const patientName = user?.fullName || user?.full_name || 'Patient';

  const toggleCategory = (cat: string) => {
    if (selectedCatList.includes(cat)) {
      setSelectedCatList(selectedCatList.filter((c) => c !== cat));
    } else {
      setSelectedCatList([...selectedCatList, cat]);
    }
  };

  const handleSaveSubscriptions = async () => {
    const result = await updateSubCategories(selectedCatList);
    if (!result?.success) {
      Alert.alert('Unable to save preferences', result?.message || 'Please try again.');
      return;
    }
    setShowManageModal(false);
    Alert.alert('Subscriptions Saved', 'Your notification preferences have been updated.');
  };

  const ownSubscriptions = subscriptions.filter((subscription) => {
    const sessionId = user?.userId || user?.id || user?.patient_id;
    return sessionId && String(subscription.user_id) === String(sessionId);
  });

  useEffect(() => {
    const categories = ownSubscriptions[0]?.categories;
    if (Array.isArray(categories) && categories.length > 0) {
      setSelectedCatList(categories);
    }
  }, [subscriptions]);

  const clinicOptions = [
    'All Clinics',
    ...Array.from(new Set([
      ...clinics.map((clinic) => clinic.name).filter(Boolean),
      ...ownSubscriptions.map((subscription) => subscription.clinic_name).filter(Boolean) as string[],
    ])),
  ];

  const filteredSubscriptions = ownSubscriptions.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const name = (s.user_name || '').toLowerCase();
    const role = (s.role || '').toLowerCase();

    const matchesSearch = q === '' || name.includes(q) || role.includes(q);
    const matchesRole = roleFilter === 'All Roles' || role.includes(roleFilter.toLowerCase());
    const matchesClinic = clinicFilter === 'All Clinics' || s.clinic_name === clinicFilter;

    return matchesSearch && matchesRole && matchesClinic;
  });

  const filteredNotifications = notifications.filter((notification) => {
    const role = (((notification as { role?: string }).role || 'Patient')).toLowerCase();
    const query = historySearchQuery.toLowerCase().trim();
    const title = (notification.title || '').toLowerCase();
    const message = (notification.message || '').toLowerCase();
    const status = notification.is_read ? 'Read' : 'Unread';

    return (
      (!query || title.includes(query) || message.includes(query)) &&
      (historyRoleFilter === 'All Roles' || role === historyRoleFilter.toLowerCase()) &&
      (historyStatusFilter === 'All Status' || status === historyStatusFilter)
    );
  });

  const openDropdown = (
    dropdown: NonNullable<typeof activeDropdown>,
    ref: React.RefObject<View | null>,
  ) => {
    ref.current?.measureInWindow((x, y, width, height) => {
      setDropdownAnchor({ x, y, width, height });
      setActiveDropdown(dropdown);
    });
  };

  const roleOptions: FloatingDropdownOption[] = ['All Roles', 'Staff', 'Patient'].map((label) => ({ id: label, label }));
  const dropdownOptions: FloatingDropdownOption[] = activeDropdown === 'clinic'
    ? clinicOptions.map((label) => ({ id: label, label }))
    : activeDropdown === 'historyStatus'
      ? ['All Status', 'Unread', 'Read'].map((label) => ({ id: label, label }))
      : roleOptions;
  const dropdownSelectedId = activeDropdown === 'clinic'
    ? clinicFilter
    : activeDropdown === 'subscriptionRole'
      ? roleFilter
      : activeDropdown === 'historyRole'
        ? historyRoleFilter
        : historyStatusFilter;

  const selectDropdownValue = (value: string) => {
    if (activeDropdown === 'clinic') setClinicFilter(value);
    if (activeDropdown === 'subscriptionRole') setRoleFilter(value);
    if (activeDropdown === 'historyRole') setHistoryRoleFilter(value);
    if (activeDropdown === 'historyStatus') setHistoryStatusFilter(value);
    setActiveDropdown(null);
  };

  return (
    <View style={styles.container}>
      <PatientHeader showLogo={false} onOpenDrawer={onOpenDrawer} onOpenNotifications={onOpenNotifications} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshNotifications} colors={['#0d9488']} />}>
        <View style={styles.headerBox}>
          <Text style={styles.pageTitle}>Notification Management</Text>
          <Text style={styles.pageSub}>Manage history, categories, templates and user subscriptions.</Text>

          <View style={styles.segmentTabBar}>
            <TouchableOpacity
              style={[styles.segmentBtn, activeSegmentTab === 'history' && styles.segmentBtnActive]}
              onPress={() => setActiveSegmentTab('history')}>
              <Text style={[styles.segmentBtnText, activeSegmentTab === 'history' && styles.segmentBtnTextActive]}>
                Notification History {unreadCount > 0 ? `(${unreadCount})` : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, activeSegmentTab === 'subscriptions' && styles.segmentBtnActive]}
              onPress={() => setActiveSegmentTab('subscriptions')}>
              <Text style={[styles.segmentBtnText, activeSegmentTab === 'subscriptions' && styles.segmentBtnTextActive]}>
                User Subscriptions
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.mainCardContainer}>
          <View style={styles.mainCardHeaderRow}>
            <View style={styles.titleCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Bell color="#0f172a" size={21} strokeWidth={2} />
                <Text style={styles.sectionHeaderTitle}>
                  {activeSegmentTab === 'subscriptions' ? 'User Subscriptions' : 'Notification History'}
                </Text>
              </View>
              <Text style={styles.sectionHeaderSub}>
                {activeSegmentTab === 'subscriptions'
                  ? 'Manage user notification preferences and subscriptions'
                  : 'Real-time alert logs and system messages'}
              </Text>
            </View>

            <View style={styles.refreshCol}>
              <TouchableOpacity style={styles.refreshBtn} onPress={refreshNotifications}>
                <RefreshCw color="#334155" size={15} strokeWidth={2} />
                <Text style={styles.refreshBtnText}>Refresh</Text>
              </TouchableOpacity>
              {lastRefreshed ? (
                <Text style={styles.lastRefreshedText}>Last refreshed: {lastRefreshed}</Text>
              ) : null}
            </View>
          </View>

          {activeSegmentTab === 'subscriptions' && (
            <View style={styles.searchFilterRow}>
              <View style={styles.searchInputWrapper}>
                <Search color="#64748b" size={16} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <View ref={clinicPickerRef} collapsable={false}>
                <TouchableOpacity style={[styles.pickerBtn, activeDropdown === 'clinic' && styles.pickerBtnActive]} onPress={() => openDropdown('clinic', clinicPickerRef)}>
                  <Text style={styles.pickerText} numberOfLines={1}>{clinicFilter}</Text>
                  <ChevronDown color="#94a3b8" size={16} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              <View ref={subscriptionRolePickerRef} collapsable={false}>
                <TouchableOpacity style={[styles.pickerBtn, activeDropdown === 'subscriptionRole' && styles.pickerBtnActive]} onPress={() => openDropdown('subscriptionRole', subscriptionRolePickerRef)}>
                  <Text style={styles.pickerText} numberOfLines={1}>{roleFilter}</Text>
                  <ChevronDown color="#94a3b8" size={16} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
          ) : activeSegmentTab === 'subscriptions' ? (
            <View style={styles.subscriptionList}>
              {filteredSubscriptions.length === 0 ? (
                <View style={styles.emptySubscriptions}>
                  <Text style={styles.emptySubscriptionsText}>No saved subscription preferences found.</Text>
                  <TouchableOpacity style={styles.manageBtn} onPress={() => setShowManageModal(true)}>
                    <Text style={styles.manageBtnText}>Set Preferences</Text>
                  </TouchableOpacity>
                </View>
              ) : filteredSubscriptions.map((sub, idx) => (
                <View key={`sub-${sub.user_id || idx}-${idx}`} style={styles.subscriptionUserCard}>
                  <View style={styles.subscriptionUserHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userNameText}>{sub.user_name || patientName}</Text>
                      <Text style={styles.userClinicText}>{sub.clinic_name || 'Clinic unavailable'}</Text>
                    </View>
                    <View style={styles.roleBadgePill}>
                      <Text style={styles.roleBadgeText}>{sub.role || 'Patient'}</Text>
                    </View>
                  </View>
                  <View style={styles.subscriptionDivider} />
                  <Text style={styles.subscriptionLabel}>CATEGORIES</Text>
                  <View style={styles.categoriesBlock}>
                    <Text style={styles.categoriesText}>
                      {(sub.categories || selectedCatList).join(', ')}
                    </Text>
                  </View>
                  <View style={styles.subscriptionBadgesRow}>
                    <View style={styles.darkBadgePill}>
                      <Text style={styles.darkBadgeText}>{sub.system_channels || 0} System</Text>
                    </View>
                    <View style={styles.bellBadgePill}>
                      <Bell color="#0d9488" size={12} strokeWidth={2} />
                      <Text style={styles.bellBadgeText}>{sub.bell_channels || 0} Active</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.manageBtn} onPress={() => setShowManageModal(true)}>
                    <Text style={styles.manageBtnText}>Manage Subscriptions</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.subscriptionFooterRow}>
                <Text style={styles.footerCountText}>Showing {filteredSubscriptions.length} user{filteredSubscriptions.length === 1 ? '' : 's'}</Text>
                <View style={styles.paginationControls}>
                  <TouchableOpacity style={styles.pageBtnDisabled}>
                    <Text style={styles.pageBtnTextDisabled}>Previous</Text>
                  </TouchableOpacity>
                  <Text style={styles.pageNumberText}>Page 1/1</Text>
                  <TouchableOpacity style={styles.pageBtnDisabled}>
                    <Text style={styles.pageBtnTextDisabled}>Next</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.historySection}>
              <View style={styles.unreadSummaryBar}>
                <Text style={styles.unreadSummaryText}>Unread: {unreadCount}</Text>
              </View>
              {notifications.length > 0 && unreadCount > 0 ? (
                <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
                  <CheckCircle2 color="#334155" size={15} strokeWidth={2} />
                  <Text style={styles.markAllBtnText}>Mark All Read</Text>
                </TouchableOpacity>
              ) : null}

              <View style={styles.searchFilterRow}>
                <View style={styles.searchInputWrapper}>
                  <Search color="#64748b" size={16} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search..."
                    placeholderTextColor="#94a3b8"
                    value={historySearchQuery}
                    onChangeText={setHistorySearchQuery}
                  />
                </View>
                <View ref={historyRolePickerRef} collapsable={false}>
                  <TouchableOpacity style={[styles.pickerBtn, activeDropdown === 'historyRole' && styles.pickerBtnActive]} onPress={() => openDropdown('historyRole', historyRolePickerRef)}>
                    <Text style={styles.pickerText} numberOfLines={1}>{historyRoleFilter}</Text>
                    <ChevronDown color="#94a3b8" size={16} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <View ref={historyStatusPickerRef} collapsable={false}>
                  <TouchableOpacity style={[styles.pickerBtn, activeDropdown === 'historyStatus' && styles.pickerBtnActive]} onPress={() => openDropdown('historyStatus', historyStatusPickerRef)}>
                    <Text style={styles.pickerText} numberOfLines={1}>{historyStatusFilter}</Text>
                    <ChevronDown color="#94a3b8" size={16} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>

              {filteredNotifications.length === 0 ? (
                <View style={styles.dottedEmptyCard}>
                  <Text style={styles.dottedEmptyText}>No notification history found</Text>
                </View>
              ) : (
                <View style={styles.notificationsList}>
                  {filteredNotifications.map((n, idx) => (
                    <View key={n.id ? `notif-${n.id}-${idx}` : `notif-${idx}`} style={[styles.notifCard, !n.is_read && styles.notifCardUnread]}>
                      <View style={styles.notifHeaderRow}>
                        <Text style={styles.notifTitle}>{n.title || 'Notification Alert'}</Text>
                        {!n.is_read ? <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>Unread</Text></View> : null}
                      </View>
                      <Text style={styles.notifTime}>
                        {n.created_at ? new Date(n.created_at).toLocaleString() : 'Just now'}
                      </Text>
                      <Text style={styles.notifMessage}>{n.message}</Text>
                      <View style={styles.notificationRecipientRow}>
                        <Text style={styles.recipientLabel}>To: </Text>
                        <Text style={styles.recipientName}>{patientName}</Text>
                        <View style={styles.notificationRolePill}><Text style={styles.notificationRoleText}>Patient</Text></View>
                      </View>

                      {!n.is_read ? (
                        <TouchableOpacity style={styles.markReadBtn} onPress={() => markRead(n.id)}>
                          <Text style={styles.markReadBtnText}>Mark as Read</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showManageModal} transparent animationType="slide" onRequestClose={() => setShowManageModal(false)}>
        <View style={styles.modalOverlayDark}>
          <View style={styles.manageModalCard}>
            <View style={styles.manageModalHeader}>
              <Text style={styles.manageModalTitle}>Notification Preferences</Text>
              <TouchableOpacity onPress={() => setShowManageModal(false)}>
                <X color="#64748b" size={19} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.manageModalBody}>
              <Text style={styles.manageSecSub}>Select which categories of notifications you would like to receive:</Text>

              {[
                'User Registration',
                'User Update',
                'Password Change',
                'Appointment',
                'Billing',
                'Prescription Alerts',
                'Lab Test Updates',
              ].map((cat) => {
                const isSelected = selectedCatList.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={styles.checkboxRow}
                    onPress={() => toggleCategory(cat)}>
                    <View style={[styles.checkboxBox, isSelected && styles.checkboxBoxActive]}>
                      {isSelected && <Check color="#ffffff" size={13} strokeWidth={3} />}
                    </View>
                    <Text style={styles.checkboxLabel}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.manageModalFooter}>
              <TouchableOpacity style={styles.cancelGreyBtn} onPress={() => setShowManageModal(false)}>
                <Text style={styles.cancelGreyBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveTealBtn} onPress={handleSaveSubscriptions}>
                <Text style={styles.saveTealBtnText}>Save Preferences</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FloatingDropdown
        visible={activeDropdown !== null}
        anchorX={dropdownAnchor?.x}
        anchorY={dropdownAnchor?.y}
        anchorWidth={dropdownAnchor?.width}
        anchorHeight={dropdownAnchor?.height}
        options={dropdownOptions}
        selectedId={dropdownSelectedId}
        searchPlaceholder={activeDropdown === 'clinic' ? 'Search clinic...' : 'Search options...'}
        showSearch={false}
        onClose={() => setActiveDropdown(null)}
        onSelect={selectDropdownValue}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 100 },

  headerBox: { marginBottom: 14 },
  pageTitle: { fontSize: 21, fontWeight: '800', color: '#0f172a', letterSpacing: -0.35 },
  pageSub: { fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 14 },

  segmentTabBar: { backgroundColor: '#dce5f0', borderRadius: 9, padding: 4, gap: 4 },
  segmentBtn: { minHeight: 29, paddingVertical: 6, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  segmentBtnActive: { backgroundColor: '#ffffff', elevation: 1, shadowColor: '#64748b', shadowOpacity: 0.12, shadowRadius: 3 },
  segmentBtnText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  segmentBtnTextActive: { color: '#0f172a', fontWeight: '800' },

  mainCardContainer: { backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, elevation: 1 },
  mainCardHeaderRow: { flexDirection: 'column', marginBottom: 12 },
  titleCol: { flex: 1 },
  sectionHeaderTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  sectionHeaderSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  refreshCol: { width: '100%', gap: 5, marginTop: 10 },
  refreshBtn: { minHeight: 37, width: '100%', flexDirection: 'row', gap: 7, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#dce4eb' },
  refreshBtnText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  lastRefreshedText: { fontSize: 10, color: '#94a3b8' },

  searchFilterRow: { gap: 10, marginBottom: 14 },
  searchInputWrapper: { height: 43, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 9, paddingHorizontal: 12 },
  searchIconText: { fontSize: 13, marginRight: 4 },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 12, color: '#0f172a' },
  pickerBtn: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8 },
  pickerBtnActive: { borderColor: '#0daca2', borderWidth: 1.5, backgroundColor: '#f3fffe' },
  pickerText: { fontSize: 13, fontWeight: '500', color: '#334155', flex: 1 },
  pickerArrow: { fontSize: 9, color: '#94a3b8', marginLeft: 2 },

  subscriptionsTableCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, overflow: 'hidden' },
  subscriptionList: { gap: 12 },
  subscriptionUserCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, backgroundColor: '#ffffff', elevation: 1 },
  subscriptionUserHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  subscriptionDivider: { height: 1, backgroundColor: '#edf2f7', marginVertical: 12 },
  subscriptionLabel: { color: '#64748b', fontSize: 10, fontWeight: '800', marginBottom: 6 },
  categoriesBlock: { minHeight: 38 },
  subscriptionBadgesRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  subscriptionFooterRow: { borderTopWidth: 1, borderTopColor: '#edf2f7', paddingTop: 12, gap: 10 },
  tableHeaderBar: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  colHeader: { fontSize: 11, fontWeight: '800', color: '#475569' },

  userTableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  emptySubscriptions: { alignItems: 'center', gap: 12, padding: 24 },
  emptySubscriptionsText: { color: '#64748b', fontSize: 13, textAlign: 'center' },
  colCell: {},
  userNameText: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  userClinicText: { fontSize: 12, color: '#64748b', marginTop: 4 },
  roleBadgePill: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  categoriesText: { fontSize: 12, lineHeight: 19, color: '#334155', fontWeight: '500' },
  darkBadgePill: { backgroundColor: '#0f172a', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  darkBadgeText: { fontSize: 10, fontWeight: '800', color: '#ffffff' },
  bellBadgePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ccfbf1', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  bellBadgeText: { fontSize: 10, fontWeight: '800', color: '#0d9488' },

  manageBtn: { minHeight: 39, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  manageBtnText: { fontSize: 12, fontWeight: '700', color: '#334155' },

  tableFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#ffffff' },
  footerCountText: { fontSize: 11, color: '#64748b' },
  paginationControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageBtnDisabled: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  pageBtnTextDisabled: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },
  pageNumberText: { fontSize: 11, fontWeight: '700', color: '#334155' },

  historySection: { gap: 10 },
  unreadSummaryBar: { height: 19, borderRadius: 10, backgroundColor: '#edf2f4', justifyContent: 'center', paddingHorizontal: 10 },
  unreadSummaryText: { fontSize: 10, color: '#334155', fontWeight: '700' },
  markAllBtn: { minHeight: 37, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9, borderWidth: 1, borderColor: '#e2e8f0' },
  markAllBtnText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  dottedEmptyCard: { borderWidth: 1.5, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 45, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  dottedEmptyText: { fontSize: 13, fontWeight: '600', color: '#64748b' },

  notificationsList: { gap: 10 },
  notifCard: { backgroundColor: '#ffffff', borderRadius: 10, padding: 13, borderWidth: 1, borderColor: '#e2e8f0', gap: 7 },
  notifCardUnread: { backgroundColor: '#effcfc', borderColor: '#8de9ea', borderWidth: 1 },
  notifHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  notifTime: { fontSize: 10, color: '#64748b' },
  notifMessage: { fontSize: 12, color: '#334155', lineHeight: 19 },
  unreadBadge: { borderWidth: 1, borderColor: '#d7e8eb', backgroundColor: '#ffffff', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 3 },
  unreadBadgeText: { fontSize: 10, fontWeight: '700', color: '#0d9488' },
  notificationRecipientRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  recipientLabel: { fontSize: 10, color: '#64748b' },
  recipientName: { fontSize: 10, color: '#0f172a', fontWeight: '700' },
  notificationRolePill: { marginLeft: 8, borderRadius: 9, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe5ec', paddingHorizontal: 8, paddingVertical: 3 },
  notificationRoleText: { fontSize: 9, color: '#475569', fontWeight: '700' },
  markReadBtn: { alignSelf: 'flex-end', backgroundColor: '#ffffff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1', marginTop: 4 },
  markReadBtnText: { fontSize: 11, fontWeight: '700', color: '#0d9488' },

  modalOverlayDark: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  manageModalCard: { width: '100%', maxWidth: 420, backgroundColor: '#ffffff', borderRadius: 20, overflow: 'hidden', maxHeight: '85%' },
  manageModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  manageModalTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  closeBtnText: { fontSize: 18, fontWeight: 'bold', color: '#64748b' },
  manageModalBody: { padding: 20, gap: 12 },
  manageSecSub: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  checkboxBox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.8, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  checkboxBoxActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  checkboxCheckText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  checkboxLabel: { fontSize: 13, fontWeight: '700', color: '#334155' },
  manageModalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#ffffff' },
  cancelGreyBtn: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  cancelGreyBtnText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  saveTealBtn: { backgroundColor: '#0d9488', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9 },
  saveTealBtnText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  pickerModalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 320 },
  pickerModalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 14, textAlign: 'center' },
  pickerOptionRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerOptionText: { fontSize: 14, color: '#334155', fontWeight: '600', textAlign: 'center' },
  pickerOptionSelected: { color: '#0d9488', fontWeight: '800' },
});

export default NotificationsScreen;
