import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { StaffHeader } from '../../components/common/StaffHeader';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationSubscription } from '../../api/notificationApi';

interface Props {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
  onToggleTabBar?: (hide: boolean) => void;
}

export const NotificationsCenterScreen: React.FC<Props> = ({ onOpenDrawer = () => {}, onOpenNotifications, onToggleTabBar }) => {
  const {
    notifications,
    unreadCount,
    subscriptions,
    loading,
    refreshNotifications,
    markRead,
    markAllRead,
    broadcastNotification,
    updateSubCategories,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'history' | 'subscriptions'>('history');

  const [broadcastModalVisible, setBroadcastModalVisible] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  const [subModalVisible, setSubModalVisible] = useState(false);
  const [selectedSubUser, setSelectedSubUser] = useState<NotificationSubscription | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchSubQuery, setSearchSubQuery] = useState('');

  useEffect(() => {
    if (onToggleTabBar) {
      onToggleTabBar(subModalVisible || broadcastModalVisible);
    }
  }, [subModalVisible, broadcastModalVisible, onToggleTabBar]);

  const categoryDefinitions = [
    { name: 'User Registration', description: 'Notification for new user registration' },
    { name: 'User Update', description: 'Notification for user profile updates' },
    { name: 'Password Change', description: 'Notification when user changes password' },
    { name: 'Appointment', description: 'Notification for new appointment bookings & updates' },
    { name: 'Billing', description: 'Notification for invoice and payment transactions' },
  ];

  const handleMarkAllRead = async () => {
    await markAllRead();
    Alert.alert('Notifications', 'All notifications marked as read.');
  };

  const handleToggleRead = async (id: number) => {
    await markRead(id);
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      Alert.alert('Validation Error', 'Title and Message are required.');
      return;
    }

    const res = await broadcastNotification({
      title: broadcastTitle.trim(),
      message: broadcastMessage.trim(),
    });

    setBroadcastModalVisible(false);
    setBroadcastTitle('');
    setBroadcastMessage('');

    if (res.success) {
      Alert.alert('Broadcast Sent', res.message || 'Notification broadcasted to all clinic users!');
    } else {
      Alert.alert('Response', res.message || 'Notification broadcast sent!');
    }
  };

  const handleSaveSubscriptions = async () => {
    await updateSubCategories(selectedCategories);
    setSubModalVisible(false);
    Alert.alert('Success', 'Notification subscriptions updated successfully!');
  };

  const defaultSubscription: NotificationSubscription = {
    user_id: 1,
    user_name: 'Dr Verma',
    role: 'Staff',
    clinic_name: 'Aarogya Care Clinic',
    categories: ['User Registration', 'User Update', 'Password Change', 'Appointment', 'Billing'],
    system_channels: 5,
    bell_channels: 5,
  };

  const displayedSubscriptions: NotificationSubscription[] = (
    subscriptions && subscriptions.length > 0 ? subscriptions : [defaultSubscription]
  ).filter((sub) => {
    const q = searchSubQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (sub.user_name || '').toLowerCase().includes(q) ||
      (sub.role || '').toLowerCase().includes(q) ||
      (sub.clinic_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        onOpenNotifications={onOpenNotifications}
        title="Notifications Center"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshNotifications} colors={['#0d9488']} />
        }>
        {/* Top Tab Switcher */}
        <View style={styles.tabSwitchContainer}>
          <TouchableOpacity
            style={[styles.tabSwitchBtn, activeTab === 'history' && styles.tabSwitchBtnActive]}
            onPress={() => setActiveTab('history')}>
            <Text style={[styles.tabSwitchText, activeTab === 'history' && styles.tabSwitchTextActive]}>
              Notification History ({notifications.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabSwitchBtn, activeTab === 'subscriptions' && styles.tabSwitchBtnActive]}
            onPress={() => setActiveTab('subscriptions')}>
            <Text style={[styles.tabSwitchText, activeTab === 'subscriptions' && styles.tabSwitchTextActive]}>
              User Subscriptions ({displayedSubscriptions.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'subscriptions' ? (
          <View style={{ gap: 14 }}>
            {/* Header Title */}
            <View style={styles.subBannerCard}>
              <Text style={styles.subBannerTitle}>🔔 User Subscriptions</Text>
              <Text style={styles.subBannerSub}>Manage user notification preferences and subscriptions</Text>

              {/* Search Bar */}
              <TextInput
                style={styles.subSearchInput}
                placeholder="🔍 Search by user name, role, clinic..."
                placeholderTextColor="#94a3b8"
                value={searchSubQuery}
                onChangeText={setSearchSubQuery}
              />
            </View>

            {/* Subscription User List / Cards */}
            {displayedSubscriptions.map((sub, idx) => (
              <View key={sub.user_id || idx} style={styles.subUserCard}>
                <View style={styles.subUserHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subUserName}>{sub.user_name || 'Dr Verma'}</Text>
                    <Text style={styles.subUserClinic}>{sub.clinic_name || 'Aarogya Care Clinic'}</Text>
                  </View>

                  <View style={styles.subRoleBadge}>
                    <Text style={styles.subRoleText}>{(sub.role || 'Staff').toUpperCase()}</Text>
                  </View>
                </View>

                {/* Subscribed Categories List */}
                <Text style={styles.subSectionLabel}>SUBSCRIBED CATEGORIES</Text>
                <View style={styles.categoriesWrap}>
                  {(sub.categories || ['User Registration', 'User Update', 'Password Change', 'Appointment', 'Billing']).map((cat) => (
                    <View key={cat} style={styles.catChip}>
                      <Text style={styles.catChipText}>{cat}</Text>
                    </View>
                  ))}
                </View>

                {/* Active Channels & Manage Action Row */}
                <View style={styles.subFooterRow}>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <View style={styles.channelPillDark}>
                      <Text style={styles.channelPillDarkText}>{sub.system_channels || 5} System</Text>
                    </View>
                    <View style={styles.channelPillLight}>
                      <Text style={styles.channelPillLightText}>🔔 {sub.bell_channels || 5}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.manageSubBtn}
                    onPress={() => {
                      setSelectedSubUser(sub);
                      setSelectedCategories(sub.categories || ['User Registration', 'User Update', 'Password Change', 'Appointment', 'Billing']);
                      setSubModalVisible(true);
                    }}>
                    <Text style={styles.manageSubBtnText}>Manage Subscriptions</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <>
            {/* Actions Row */}
            <View style={styles.topRow}>
              <TouchableOpacity style={styles.readAllBtn} onPress={handleMarkAllRead}>
                <Text style={styles.readAllText}>✓ Mark All Read ({unreadCount})</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.broadcastBtn} onPress={() => setBroadcastModalVisible(true)}>
                <Text style={styles.broadcastText}>📢 Broadcast Message</Text>
              </TouchableOpacity>
            </View>

            {/* Loading Indicator */}
            {loading && notifications.length === 0 ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color="#0d9488" />
                <Text style={styles.loadingText}>Fetching live notifications...</Text>
              </View>
            ) : null}

            {/* Empty State */}
            {!loading && notifications.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>🔔</Text>
                <Text style={styles.emptyTitle}>No Notifications Yet</Text>
                <Text style={styles.emptySub}>
                  You are all caught up! System notifications and updates will appear here in real time.
                </Text>
              </View>
            ) : null}

            {/* Notifications List */}
            <View style={styles.list}>
              {notifications.map((n) => {
                const notifType = String(n.type || 'SYSTEM').toUpperCase();
                let dateStr = 'Just now';
                if (n.created_at) {
                  try {
                    const d = new Date(n.created_at);
                    if (!isNaN(d.getTime())) {
                      dateStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    } else {
                      dateStr = String(n.created_at);
                    }
                  } catch (e) {
                    dateStr = String(n.created_at);
                  }
                }

                return (
                  <TouchableOpacity
                    key={n.id}
                    style={[styles.card, !n.is_read && styles.unreadCard]}
                    onPress={() => handleToggleRead(n.id)}>
                    <View style={styles.cardHeader}>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>{notifType}</Text>
                      </View>
                      <Text style={styles.timeText}>{dateStr}</Text>
                    </View>

                    <Text style={styles.titleText}>{n.title}</Text>
                    <Text style={styles.msgText}>{n.message}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Broadcast Modal */}
      <Modal visible={broadcastModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Broadcast Announcement</Text>

            <Text style={styles.label}>Broadcast Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. OPD Timings Update"
              placeholderTextColor="#94a3b8"
              value={broadcastTitle}
              onChangeText={setBroadcastTitle}
            />

            <Text style={styles.label}>Message Content *</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              multiline={true}
              placeholder="Announcement details to broadcast..."
              placeholderTextColor="#94a3b8"
              value={broadcastMessage}
              onChangeText={setBroadcastMessage}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setBroadcastModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleBroadcast}>
                <Text style={styles.saveText}>Send Broadcast</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manage Subscriptions Slide-Up Bottom Sheet */}
      <Modal visible={subModalVisible} animationType="slide" transparent={true} onRequestClose={() => setSubModalVisible(false)}>
        <View style={styles.sheetModalBg}>
          <View style={styles.manageSubSheetCard}>
            <View style={styles.sheetDragHandle} />

            {/* Header */}
            <View style={styles.sheetHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>
                  Manage Subscriptions - {selectedSubUser?.user_name || 'Dr Verma'}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {selectedSubUser?.clinic_name || 'Aarogya Care Clinic'}  -  {selectedSubUser?.role || 'Staff'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSubModalVisible(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 20, color: '#64748b', fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
              {/* Category Table Box */}
              <View style={styles.subTableBox}>
                {/* Table Header */}
                <View style={styles.subTableHeader}>
                  <Text style={styles.subThLeft}>Message Category wise</Text>
                  <Text style={styles.subThRight}>System</Text>
                </View>

                {/* Rows */}
                {categoryDefinitions.map((catItem, idx) => {
                  const isEnabled = selectedCategories.includes(catItem.name);

                  return (
                    <View key={catItem.name} style={[styles.subTableRow, idx === categoryDefinitions.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={styles.subCatTitle}>{catItem.name}</Text>
                        <Text style={styles.subCatDesc}>{catItem.description}</Text>
                      </View>

                      <Switch
                        value={isEnabled}
                        onValueChange={() => {
                          if (isEnabled) {
                            setSelectedCategories(selectedCategories.filter((c) => c !== catItem.name));
                          } else {
                            setSelectedCategories([...selectedCategories, catItem.name]);
                          }
                        }}
                        trackColor={{ false: '#cbd5e1', true: '#0d9488' }}
                        thumbColor="#ffffff"
                      />
                    </View>
                  );
                })}
              </View>

              {/* Pagination Info */}
              <View style={styles.subPaginationRow}>
                <Text style={styles.subPaginationInfo}>
                  Showing 1-{categoryDefinitions.length} of {categoryDefinitions.length} messages
                </Text>
                <View style={styles.subPaginationControls}>
                  <TouchableOpacity style={styles.subPageNavBtnDisabled} disabled={true}>
                    <Text style={styles.subPageNavTextDisabled}>Previous</Text>
                  </TouchableOpacity>
                  <Text style={styles.subPageNumText}>Page 1 / 1</Text>
                  <TouchableOpacity style={styles.subPageNavBtnDisabled} disabled={true}>
                    <Text style={styles.subPageNavTextDisabled}>Next</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.sheetFooterRow}>
              <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setSubModalVisible(false)}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetUpdateBtn} onPress={handleSaveSubscriptions}>
                <Text style={styles.sheetUpdateText}>Update Subscription</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 80 },
  tabSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabSwitchBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabSwitchBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabSwitchText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  tabSwitchTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  subBannerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subBannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subBannerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 12,
  },
  subSearchInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  subUserCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subUserHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  subUserName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  subUserClinic: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  subRoleBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  subRoleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  subSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  catChip: {
    backgroundColor: '#f0fdfa',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f766e',
  },
  subFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  channelPillDark: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  channelPillDarkText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  channelPillLight: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  channelPillLightText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  manageSubBtn: {
    borderWidth: 1,
    borderColor: '#0d9488',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  manageSubBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0d9488',
  },
  modalSubTitleText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  checkboxRowSelected: {
    backgroundColor: '#f0fdfa',
    borderColor: '#ccfbf1',
  },
  checkboxIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  checkboxText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  checkboxTextSelected: {
    color: '#0d9488',
    fontWeight: '800',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  readAllBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  readAllText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  broadcastBtn: { backgroundColor: '#0d9488', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  broadcastText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  list: { gap: 10 },
  loadingCard: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#64748b', fontWeight: '600' },
  emptyCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  unreadCard: { borderWidth: 1.5, borderColor: '#0d9488', backgroundColor: '#f0fdf4' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  typeBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 10, fontWeight: '800', color: '#0f172a' },
  timeText: { fontSize: 11, color: '#94a3b8' },
  titleText: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  msgText: { fontSize: 13, color: '#475569', marginTop: 4, lineHeight: 18 },
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center' },
  cancelText: { color: '#475569', fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: '#0d9488', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#ffffff', fontWeight: '800' },
  sheetModalBg: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 0,
  },
  manageSubSheetCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  sheetDragHandle: {
    width: 44,
    height: 5,
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ccfbf1',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  subTableBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  subTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  subThLeft: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  subThRight: {
    width: 70,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  subTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  subCatTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  subCatDesc: {
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 16,
  },
  subPaginationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  subPaginationInfo: {
    fontSize: 12,
    color: '#64748b',
  },
  subPaginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subPageNavBtnDisabled: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subPageNavTextDisabled: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  subPageNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  sheetFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  sheetCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  sheetCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  sheetUpdateBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0f172a',
  },
  sheetUpdateText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});

export default NotificationsCenterScreen;
