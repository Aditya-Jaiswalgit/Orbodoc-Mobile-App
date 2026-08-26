import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PatientHeader } from '../../components/common/PatientHeader';
import { BellNotificationIcon, PatientUserIcon } from '../../components/common/CustomIcons';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuthContext } from '../../context/AuthContext';

interface NotificationsScreenProps {
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onOpenDrawer = () => {},
  onOpenNotifications = () => {},
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

  const [activeSegmentTab, setActiveSegmentTab] = useState<'history' | 'subscriptions'>('subscriptions');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [clinicFilter, setClinicFilter] = useState<string>('All Clinics');
  const [roleFilter, setRoleFilter] = useState<string>('All Roles');

  const [showManageModal, setShowManageModal] = useState<boolean>(false);
  const [showClinicPicker, setShowClinicPicker] = useState<boolean>(false);
  const [showRolePicker, setShowRolePicker] = useState<boolean>(false);

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

  const handleSaveSubscriptions = () => {
    updateSubCategories(selectedCatList);
    setShowManageModal(false);
    Alert.alert('Subscriptions Saved', 'Your notification preference settings have been updated.');
  };

  const filteredSubscriptions = subscriptions.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const name = (s.user_name || '').toLowerCase();
    const role = (s.role || '').toLowerCase();

    const matchesSearch = q === '' || name.includes(q) || role.includes(q);
    const matchesRole = roleFilter === 'All Roles' || role.includes(roleFilter.toLowerCase());

    return matchesSearch && matchesRole;
  });

  return (
    <View style={styles.container}>
      <PatientHeader onOpenDrawer={onOpenDrawer} onOpenNotifications={onOpenNotifications} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
                <BellNotificationIcon color="#0f172a" size={20} />
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
                <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
              </TouchableOpacity>
              {lastRefreshed ? (
                <Text style={styles.lastRefreshedText}>Last refreshed: {lastRefreshed}</Text>
              ) : null}
            </View>
          </View>

          {activeSegmentTab === 'subscriptions' && (
            <View style={styles.searchFilterRow}>
              <View style={styles.searchInputWrapper}>
                <Text style={styles.searchIconText}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowClinicPicker(true)}>
                <Text style={styles.pickerText} numberOfLines={1}>{clinicFilter}</Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowRolePicker(true)}>
                <Text style={styles.pickerText} numberOfLines={1}>{roleFilter}</Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#0d9488" style={{ marginVertical: 40 }} />
          ) : activeSegmentTab === 'subscriptions' ? (
            <View style={styles.subscriptionsTableCard}>
              <View style={styles.tableHeaderBar}>
                <Text style={[styles.colHeader, { flex: 1.2 }]}>User</Text>
                <Text style={[styles.colHeader, { flex: 0.8 }]}>Role</Text>
                <Text style={[styles.colHeader, { flex: 1.8 }]}>Categories</Text>
                <Text style={[styles.colHeader, { flex: 1.2 }]}>Active Channels</Text>
                <Text style={[styles.colHeader, { flex: 1.2 }]}>Actions</Text>
              </View>

              {filteredSubscriptions.map((sub, idx) => (
                <View key={`sub-${sub.user_id || idx}-${idx}`} style={styles.userTableRow}>
                  <View style={[styles.colCell, { flex: 1.2 }]}>
                    <Text style={styles.userNameText}>{sub.user_name || patientName}</Text>
                    <Text style={styles.userClinicText}>{sub.clinic_name || "Dr Agrawal's healthcare clinic"}</Text>
                  </View>

                  <View style={[styles.colCell, { flex: 0.8 }]}>
                    <View style={styles.roleBadgePill}>
                      <Text style={styles.roleBadgeText}>{sub.role || 'Patient'}</Text>
                    </View>
                  </View>

                  <View style={[styles.colCell, { flex: 1.8 }]}>
                    <Text style={styles.categoriesText}>
                      {(sub.categories || selectedCatList).join(', ')}
                    </Text>
                  </View>

                  <View style={[styles.colCell, { flex: 1.2, flexDirection: 'row', gap: 4, alignItems: 'center' }]}>
                    <View style={styles.darkBadgePill}>
                      <Text style={styles.darkBadgeText}>{sub.system_channels || 15} System</Text>
                    </View>
                    <View style={styles.bellBadgePill}>
                      <BellNotificationIcon color="#0d9488" size={12} />
                      <Text style={styles.bellBadgeText}>{sub.bell_channels || 15}</Text>
                    </View>
                  </View>

                  <View style={[styles.colCell, { flex: 1.2 }]}>
                    <TouchableOpacity style={styles.manageBtn} onPress={() => setShowManageModal(true)}>
                      <Text style={styles.manageBtnText}>Manage Subscriptions</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={styles.tableFooterRow}>
                <Text style={styles.footerCountText}>Showing 1-1 of 1 users</Text>
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
              {notifications.length > 0 && unreadCount > 0 ? (
                <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
                  <Text style={styles.markAllBtnText}>✓ Mark All as Read</Text>
                </TouchableOpacity>
              ) : null}

              {notifications.length === 0 ? (
                <View style={styles.dottedEmptyCard}>
                  <Text style={styles.dottedEmptyText}>No notification history found</Text>
                </View>
              ) : (
                <View style={styles.notificationsList}>
                  {notifications.map((n, idx) => (
                    <View key={n.id ? `notif-${n.id}-${idx}` : `notif-${idx}`} style={[styles.notifCard, !n.is_read && styles.notifCardUnread]}>
                      <View style={styles.notifHeaderRow}>
                        <Text style={styles.notifTitle}>{n.title || 'Notification Alert'}</Text>
                        <Text style={styles.notifTime}>
                          {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </Text>
                      </View>
                      <Text style={styles.notifMessage}>{n.message}</Text>

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
                <Text style={styles.closeBtnText}>✕</Text>
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
                      {isSelected && <Text style={styles.checkboxCheckText}>✓</Text>}
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

      <Modal visible={showClinicPicker} transparent animationType="fade" onRequestClose={() => setShowClinicPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowClinicPicker(false)}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Select Clinic</Text>
            {['All Clinics', "Dr Agrawal's healthcare clinic"].map((c) => (
              <TouchableOpacity
                key={c}
                style={styles.pickerOptionRow}
                onPress={() => {
                  setClinicFilter(c);
                  setShowClinicPicker(false);
                }}>
                <Text style={[styles.pickerOptionText, clinicFilter === c && styles.pickerOptionSelected]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showRolePicker} transparent animationType="fade" onRequestClose={() => setShowRolePicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRolePicker(false)}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Select Role</Text>
            {['All Roles', 'Patient', 'Staff', 'Doctor', 'Admin'].map((r) => (
              <TouchableOpacity
                key={r}
                style={styles.pickerOptionRow}
                onPress={() => {
                  setRoleFilter(r);
                  setShowRolePicker(false);
                }}>
                <Text style={[styles.pickerOptionText, roleFilter === r && styles.pickerOptionSelected]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },

  headerBox: { marginBottom: 14 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  pageSub: { fontSize: 13, color: '#64748b', marginTop: 2, marginBottom: 12 },

  segmentTabBar: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4, gap: 4 },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#ffffff', elevation: 1 },
  segmentBtnText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  segmentBtnTextActive: { color: '#0f172a', fontWeight: '800' },

  mainCardContainer: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1.5, borderColor: '#a7f3d0', padding: 16, elevation: 2 },
  mainCardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  titleCol: { flex: 1 },
  sectionHeaderTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  sectionHeaderSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  refreshCol: { alignItems: 'flex-end', gap: 4 },
  refreshBtn: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#cbd5e1' },
  refreshBtnText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  lastRefreshedText: { fontSize: 10, color: '#94a3b8' },

  searchFilterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  searchInputWrapper: { flex: 1.5, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 10 },
  searchIconText: { fontSize: 13, marginRight: 4 },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 12, color: '#0f172a' },
  pickerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 8 },
  pickerText: { fontSize: 11, fontWeight: '700', color: '#334155', flex: 1 },
  pickerArrow: { fontSize: 9, color: '#94a3b8', marginLeft: 2 },

  subscriptionsTableCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, overflow: 'hidden' },
  tableHeaderBar: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  colHeader: { fontSize: 11, fontWeight: '800', color: '#475569' },

  userTableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  colCell: {},
  userNameText: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  userClinicText: { fontSize: 11, color: '#64748b' },
  roleBadgePill: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  categoriesText: { fontSize: 11, color: '#334155', fontWeight: '600' },
  darkBadgePill: { backgroundColor: '#0f172a', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  darkBadgeText: { fontSize: 10, fontWeight: '800', color: '#ffffff' },
  bellBadgePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ccfbf1', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  bellBadgeText: { fontSize: 10, fontWeight: '800', color: '#0d9488' },

  manageBtn: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center' },
  manageBtnText: { fontSize: 11, fontWeight: '700', color: '#334155' },

  tableFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#ffffff' },
  footerCountText: { fontSize: 11, color: '#64748b' },
  paginationControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageBtnDisabled: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  pageBtnTextDisabled: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },
  pageNumberText: { fontSize: 11, fontWeight: '700', color: '#334155' },

  historySection: { gap: 10 },
  markAllBtn: { alignSelf: 'flex-end', backgroundColor: '#f0fdf4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  markAllBtnText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
  dottedEmptyCard: { borderWidth: 1.5, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 45, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  dottedEmptyText: { fontSize: 13, fontWeight: '600', color: '#64748b' },

  notificationsList: { gap: 10 },
  notifCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  notifCardUnread: { backgroundColor: '#f0fdf4', borderColor: '#86efac', borderWidth: 1.5 },
  notifHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  notifTime: { fontSize: 11, color: '#64748b' },
  notifMessage: { fontSize: 12, color: '#334155' },
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
