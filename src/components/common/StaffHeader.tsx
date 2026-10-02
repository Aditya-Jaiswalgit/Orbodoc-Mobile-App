import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowRight,
  Bell,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Crown,
  Key,
  LogOut,
  Menu,
  Stethoscope,
  Trash2,
  User,
  UserCheck,
  Video,
  X,
} from 'lucide-react-native';
import { useAuthContext } from '../../context/AuthContext';
import { useStaffHeaderData } from '../../hooks/useStaffHeaderData';
import { dashboardNumber, displayAmount, displayDate } from '../../utils/dashboardValues';
import { navigateStaffScreen } from '../../utils/navigationEvents';
import { normalizeRoleName } from '../../utils/rolePermissions';

interface StaffHeaderProps {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  title?: string;
  onNavigate?: (path: string) => void;
}

export const StaffHeader: React.FC<StaffHeaderProps> = ({
  onOpenDrawer,
  onOpenNotifications,
  onNavigate = navigateStaffScreen,
}) => {
  const {
    user,
    role,
    activeClinicId,
    activeClinicName,
    assignedClinics,
    switchClinic,
    logout,
  } = useAuthContext();

  const rawRole = role || user?.role || user?.roleName || user?.role_name || '';
  const normalizedRole = normalizeRoleName(rawRole);
  const isClinicAdmin = normalizedRole === 'clinic_admin';
  const isDoctor = normalizedRole === 'doctor';
  const isIndependentDoctor =
    isDoctor &&
    String((user as { doctor_type?: string } | null)?.doctor_type || '')
      .trim()
      .toLowerCase() === 'independent_doctor';
  const isProviderWalletUser = isClinicAdmin || isIndependentDoctor;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switchingClinic, setSwitchingClinic] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const {
    notifications: inbox, unreadCount, notificationsLoading, notificationsError, notificationBusy,
    refreshNotifications, markAllRead: handleMarkAllAsRead, clearAll: handleClearAllNotifications,
    plan, planLoading, planError, retryPlan,
    canManageVideoCalling, videoCallingEnabled, videoBusy, toggleVideo: handleToggleVideoCalling,
  } = useStaffHeaderData(notificationsModalOpen, planModalOpen, profileMenuOpen);
  const notifications = inbox.map(item => ({
    id: item.not_rec_id,
    title: item.title || item.not_cat_name || 'Notification',
    message: item.message,
    timestamp: displayDate(item.sent_at || item.created_at),
    type: item.entity_type,
    unread: Number(item.is_read) !== 1,
  }));

  const statusBarHeight = StatusBar.currentHeight || 36;
  const staffName = user?.fullName || user?.full_name || 'Account';
  const staffInitials = staffName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const clinicsList = assignedClinics;
  const currentClinicId = activeClinicId;
  const selectedClinicName =
    clinicsList.find(c => Number(c.id) === Number(currentClinicId))?.name ||
    activeClinicName || 'Clinic unavailable';

  const handleSelectClinic = async (clinicId: number) => {
    if (switchingClinic) return;
    setSwitchingClinic(true);
    const success = await switchClinic(clinicId);
    setSwitchingClinic(false);
    if (success) setDropdownOpen(false);
    else Alert.alert('Clinic switch failed', 'Your current clinic is unchanged. Please retry.');
  };

  return (
    <View style={styles.headerContainer}>
      <StatusBar barStyle="dark-content" />
      {Platform.OS === 'android' && (
        <View style={{ height: statusBarHeight, backgroundColor: '#FFFFFF' }} />
      )}

      {/* ── 1. TOP HEADER BAR ── */}
      <View style={styles.topHeaderBar}>
        <TouchableOpacity style={styles.iconSquareBtn} onPress={onOpenDrawer} activeOpacity={0.7}>
          <Menu size={18} color="#334155" />
        </TouchableOpacity>

        <View style={styles.headerRightGroup}>
          {/* Gold Crown Subscription Button (Web Parity: ONLY Clinic Admin) */}
          {isClinicAdmin && (
            <TouchableOpacity style={styles.crownCircleBtn} onPress={() => setPlanModalOpen(true)} activeOpacity={0.8}>
              <Crown size={16} color="#D97706" />
            </TouchableOpacity>
          )}

          {/* Wallet Icon Button (Web Parity: ONLY Clinic Admin or Independent Doctor) */}
          {isProviderWalletUser && (
            <TouchableOpacity style={styles.walletCircleBtn} onPress={() => onNavigate('/wallet')} activeOpacity={0.8}>
              <CreditCard size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Notification Bell Icon */}
          <TouchableOpacity
            style={styles.bellCircleBtn}
            onPress={() => {
              setDropdownOpen(false);
              setProfileMenuOpen(false);
              setNotificationsModalOpen(true);
            }}
            activeOpacity={0.8}>
            <Bell size={17} color="#334155" />
            {(unreadCount ?? 0) > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Avatar Dropdown Pill */}
          <TouchableOpacity
            style={styles.avatarPillBtn}
            onPress={() => {
              setDropdownOpen(false);
              setNotificationsModalOpen(false);
              setProfileMenuOpen(!profileMenuOpen);
            }}
            activeOpacity={0.8}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{staffInitials}</Text>
            </View>
            {profileMenuOpen ? (
              <ChevronUp size={14} color="#0D9488" />
            ) : (
              <ChevronDown size={14} color="#64748B" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 2. FLOATING PROFILE SETTINGS DROPDOWN MENU ── */}
      {profileMenuOpen && (
        <View style={styles.profileMenuCard}>
          <TouchableOpacity
            style={styles.profileMenuHeader}
            onPress={() => {
              setProfileMenuOpen(false);
              navigateStaffScreen('profile');
              onNavigate('profile');
            }}
            activeOpacity={0.7}>
            <Text style={styles.profileMenuName}>{staffName}</Text>
            <Text style={styles.profileMenuSub}>Profile settings</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {canManageVideoCalling && (
            <View style={styles.profileMenuItemRow}>
              <View style={styles.menuItemLeft}>
                <Video size={18} color="#0D9488" />
                <View>
                  <Text style={styles.menuItemTitle}>Video Calling</Text>
                  <Text style={styles.menuItemSub}>{videoCallingEnabled ? 'Enabled' : 'Disabled'}</Text>
                </View>
              </View>
              <Switch value={videoCallingEnabled} disabled={videoBusy} onValueChange={handleToggleVideoCalling} />
            </View>
          )}

          {/* My Profile */}
          <TouchableOpacity
            style={styles.profileMenuItemRowBtn}
            onPress={() => {
              setProfileMenuOpen(false);
              navigateStaffScreen('profile');
              onNavigate('profile');
            }}
            activeOpacity={0.7}>
            <User size={18} color="#0D9488" />
            <Text style={styles.menuItemTitle}>My Profile</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* Change Password */}
          <TouchableOpacity
            style={styles.profileMenuItemRowBtn}
            onPress={() => {
              setProfileMenuOpen(false);
              navigateStaffScreen('change_password');
              onNavigate('change_password');
            }}
            activeOpacity={0.7}>
            <Key size={18} color="#D97706" />
            <Text style={styles.menuItemTitle}>Change Password</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* My Plan (Web Parity: ONLY Clinic Admin) */}
          {isClinicAdmin && (
            <>
              <TouchableOpacity
                style={styles.profileMenuItemRowBtn}
                onPress={() => {
                  setProfileMenuOpen(false);
                  setPlanModalOpen(true);
                }}
                activeOpacity={0.7}>
                <Crown size={18} color="#D97706" />
                <Text style={styles.menuItemTitle}>My Plan</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
            </>
          )}

          {/* Logout */}
          <TouchableOpacity
            style={styles.profileMenuItemRowBtn}
            onPress={() => {
              setProfileMenuOpen(false);
              logout();
            }}
            activeOpacity={0.7}>
            <LogOut size={18} color="#EF4444" />
            <Text style={[styles.menuItemTitle, { color: '#EF4444' }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── 3. NOTIFICATIONS MODAL / DROPDOWN CARD (MATCHING USER SCREENSHOT) ── */}
      <Modal
        visible={notificationsModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setNotificationsModalOpen(false)}>
        <View style={styles.notifModalOverlay}>
          <TouchableOpacity
            style={styles.notifBackdropTouch}
            activeOpacity={1}
            onPress={() => setNotificationsModalOpen(false)}
          />
          <View style={styles.notifModalCard}>
            {/* Header Row */}
            <View style={styles.notifHeaderRow}>
              <View style={styles.notifHeaderLeft}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.notifTitle}>Notifications</Text>
                  {(unreadCount ?? 0) > 0 && (
                    <View style={styles.notifCountPill}>
                      <Text style={styles.notifCountText}>{unreadCount} new</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.notifSubTitle}>You have updates to review</Text>
              </View>

              {/* Action Icons Right */}
              <View style={styles.notifHeaderActions}>
                <TouchableOpacity
                  onPress={handleMarkAllAsRead}
                  disabled={notificationBusy || notificationsLoading}
                  activeOpacity={0.7}
                  style={styles.notifActionBtn}>
                  <CheckCheck size={18} color="#475569" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleClearAllNotifications}
                  disabled={notificationBusy || notificationsLoading}
                  activeOpacity={0.7}
                  style={styles.notifActionBtn}>
                  <Trash2 size={18} color="#475569" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setNotificationsModalOpen(false)}
                  activeOpacity={0.7}
                  style={styles.notifActionBtn}>
                  <X size={18} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Notifications List Body */}
            <ScrollView
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              scrollEventThrottle={16}
              decelerationRate="normal"
              style={{ maxHeight: 360, marginTop: 12 }}>
              {notificationsLoading ? (
                <Text style={styles.emptyNotifText}>Loading notifications...</Text>
              ) : notificationsError ? (
                <TouchableOpacity onPress={refreshNotifications}>
                  <Text style={styles.emptyNotifText}>Unable to load notifications. Tap to retry.</Text>
                </TouchableOpacity>
              ) : notifications.length === 0 ? (
                <View style={styles.emptyNotifBox}>
                  <Text style={styles.emptyNotifText}>No new notifications</Text>
                </View>
              ) : (
                notifications.map((item) => (
                  <View key={item.id} style={styles.notifItemCard}>
                    {/* Left Icon Square Box */}
                    <View style={styles.notifIconBox}>
                      {item.type === 'appointment' ? (
                        <Calendar size={18} color="#2563EB" />
                      ) : (
                        <UserCheck size={18} color="#0D9488" />
                      )}
                    </View>

                    {/* Content Col */}
                    <View style={styles.notifContentCol}>
                      <Text style={styles.notifItemTitle}>{item.title}</Text>
                      <Text style={styles.notifItemMsg}>{item.message}</Text>
                      <Text style={styles.notifItemTime}>{item.timestamp}</Text>
                    </View>

                    {/* Unread Indicator Dot Right */}
                    {item.unread && <View style={styles.unreadDot} />}
                  </View>
                ))
              )}
            </ScrollView>

            {/* Bottom Footer Link */}
            <TouchableOpacity
              style={styles.notifFooterBtn}
              onPress={() => {
                setNotificationsModalOpen(false);
                if (onOpenNotifications) onOpenNotifications();
                else onNavigate('/notifications');
              }}
              activeOpacity={0.8}>
              <Text style={styles.notifFooterText}>View all notifications</Text>
              <ArrowRight size={16} color="#0D9488" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── 4. CLINIC BANNER & DROPDOWN ── */}
      <View style={styles.clinicBannerSection}>
        <View style={styles.clinicTitleRow}>
          <View style={styles.stethoscopeBox}>
            <Stethoscope size={20} color="#FFFFFF" />
          </View>
          <View style={styles.clinicTitleWrap}>
            <Text style={styles.clinicTitleText}>{selectedClinicName}</Text>
            <View style={styles.titleUnderline} />
          </View>
        </View>

        {/* Clinic Selector Dropdown Card */}
        <TouchableOpacity
          style={styles.clinicDropdownCard}
          activeOpacity={0.8}
          onPress={() => {
            setProfileMenuOpen(false);
            setNotificationsModalOpen(false);
            setDropdownOpen(!dropdownOpen);
          }}>
          <Text style={styles.clinicDropdownText}>{selectedClinicName}</Text>
          {dropdownOpen ? (
            <ChevronUp size={18} color="#0D9488" />
          ) : (
            <ChevronDown size={18} color="#0D9488" />
          )}
        </TouchableOpacity>

        {/* Expandable Inline Dropdown List */}
        {dropdownOpen && (
          <View style={styles.dropdownExpandCard}>
            {clinicsList.length === 0 && <Text style={styles.dropdownItemText}>No clinics available</Text>}
            {clinicsList.map((clinic) => {
              const isSelected = Number(clinic.id) === currentClinicId;
              return (
                <TouchableOpacity
                  key={clinic.id}
                  disabled={switchingClinic}
                  style={[styles.dropdownItemRow, isSelected && styles.dropdownItemRowSelected]}
                  onPress={() => handleSelectClinic(Number(clinic.id))}>
                  <View style={styles.itemRowLeft}>
                    {isSelected && <Check size={16} color="#0D9488" style={{ marginRight: 8 }} />}
                    <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                      {clinic.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* ── 5. EXACT SUBSCRIPTION PLAN MODAL ── */}
      <Modal visible={planModalOpen} animationType="slide" transparent={true} onRequestClose={() => setPlanModalOpen(false)}>
        <View style={styles.planModalOverlay}>
          <View style={styles.planModalContent}>
            <View style={styles.planModalHeaderGlow} />

            <TouchableOpacity style={styles.planCloseBtn} onPress={() => setPlanModalOpen(false)} activeOpacity={0.8}>
              <X size={18} color="#0D9488" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              <View style={styles.planCrownBox}>
                <Crown size={24} color="#FFFFFF" />
              </View>

              <Text style={styles.planModalTitle}>My Subscription Plan</Text>
              <Text style={styles.planModalSubtitle}>
                {selectedClinicName} plan and billing information.
              </Text>

              {planLoading ? (
                <Text style={styles.planSubLabel}>Loading plan details...</Text>
              ) : planError ? (
                <TouchableOpacity onPress={retryPlan}>
                  <Text style={styles.planSubLabel}>Unable to load plan. Tap to retry.</Text>
                </TouchableOpacity>
              ) : !plan?.plan_name ? (
                <Text style={styles.planSubLabel}>No subscription plan assigned.</Text>
              ) : (<>
              <View style={styles.activePlanCard}>
                <View style={styles.planCardHeaderRow}>
                  <Text style={styles.planNameText}>{plan.plan_name}</Text>
                  <View style={styles.activePillTag}>
                    <Text style={styles.activePillText}>{plan.plan_status || '—'}</Text>
                  </View>
                </View>
                <Text style={styles.planSubLabel}>{plan.plan_type ? plan.plan_type + ' clinic plan' : 'Clinic subscription'}</Text>
              </View>

              {/* Subscription Details Container Box (2 Cards Per Row Layout) */}
              <View style={styles.detailsListBox}>
                <View style={styles.detailsGrid2Col}>
                  {/* 1. Billing Cycle */}
                  <View style={styles.detailItemHalf}>
                    <Text style={styles.detailLabel}>Billing Cycle</Text>
                    <Text style={styles.detailValue}>{plan.billing_cycle || '—'}</Text>
                  </View>

                  {/* 2. Plan Price */}
                  <View style={styles.detailItemHalf}>
                    <Text style={styles.detailLabel}>Plan Price</Text>
                    <Text style={styles.detailValue}>{displayAmount(dashboardNumber(plan.plan_price))}</Text>
                  </View>

                  {/* 3. Plan Start Date */}
                  <View style={styles.detailItemHalf}>
                    <Text style={styles.detailLabel}>Plan Start Date</Text>
                    <Text style={styles.detailValue}>{displayDate(plan.plan_started_at)}</Text>
                  </View>

                  {/* 4. Plan End Date */}
                  <View style={styles.detailItemHalf}>
                    <Text style={styles.detailLabel}>Plan End Date</Text>
                    <Text style={styles.detailValue}>{displayDate(plan.plan_ends_at)}</Text>
                  </View>

                  {/* 5. Renewal */}
                  <View style={styles.detailItemHalf}>
                    <Text style={styles.detailLabel}>Renewal</Text>
                    <Text style={styles.detailValue}>{plan.billing_cycle || '—'}</Text>
                  </View>
                </View>
              </View>

              {/* Bottom Notice Box */}
              <View style={styles.planNoticeBox}>
                <Calendar size={18} color="#0D9488" />
                <Text style={styles.planNoticeText}>
                  Plan dates are based on the active clinic subscription.
                </Text>
              </View>
              </>)}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    zIndex: 10,
    position: 'relative',
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconSquareBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crownCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  avatarPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 4,
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // Profile Dropdown Menu Card
  profileMenuCard: {
    position: 'absolute',
    top: 52,
    right: 16,
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    zIndex: 100,
  },
  profileMenuHeader: {
    paddingBottom: 4,
  },
  profileMenuName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  profileMenuSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  profileMenuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  menuItemSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  profileMenuItemRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 2,
  },

  // Notifications Modal / Dropdown Card (Matching User Screenshot)
  notifModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.40)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  notifBackdropTouch: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  notifModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    elevation: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    zIndex: 101,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 14,
  },
  notifHeaderLeft: {},
  notifTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  notifCountPill: {
    backgroundColor: '#E6FFFA',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  notifCountText: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '700',
  },
  notifSubTitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  notifHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifActionBtn: {
    padding: 4,
  },
  notifItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    position: 'relative',
    gap: 12,
  },
  notifIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifContentCol: {
    flex: 1,
  },
  notifItemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  notifItemMsg: {
    fontSize: 13,
    color: '#475569',
    marginTop: 3,
    lineHeight: 18,
  },
  notifItemTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0D9488',
    marginTop: 6,
  },
  emptyNotifBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyNotifText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  notifFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 8,
  },
  notifFooterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D9488',
  },

  // Clinic Banner & Dropdown
  clinicBannerSection: { paddingHorizontal: 16, paddingVertical: 12 },
  clinicTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  stethoscopeBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clinicTitleWrap: { position: 'relative' },
  clinicTitleText: { fontSize: 20, fontWeight: '700', color: '#0F766E' },
  titleUnderline: { height: 3, backgroundColor: '#2563EB', marginTop: 4, borderRadius: 2, width: '100%' },

  clinicDropdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#CCFBF1',
  },
  clinicDropdownText: { fontSize: 15, fontWeight: '700', color: '#0F172A' },

  // Inline Expandable Dropdown
  dropdownExpandCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  dropdownItemRowSelected: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  itemRowLeft: { flexDirection: 'row', alignItems: 'center' },
  dropdownItemText: { fontSize: 15, fontWeight: '600', color: '#334155' },
  dropdownItemTextSelected: { fontWeight: '700', color: '#0F766E' },

  // Exact Subscription Plan Modal
  planModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  planModalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  planModalHeaderGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: '#FFFBEB',
    opacity: 0.8,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  planCloseBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  planCrownBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 4,
    elevation: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  planModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  planModalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 20,
  },
  activePlanCard: {
    backgroundColor: '#FFFDF0',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  planCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  activePillTag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  planSubLabel: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '400',
  },

  detailsListBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
  },
  detailsGrid2Col: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  detailItemHalf: {
    width: '48%',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '400',
  },
  planNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 16,
    padding: 14,
  },
  planNoticeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F766E',
    flex: 1,
    lineHeight: 18,
  },
});

export default StaffHeader;
