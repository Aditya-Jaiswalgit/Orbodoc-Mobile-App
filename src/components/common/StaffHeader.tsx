import React, { useEffect, useState } from 'react';
import { AppModal } from './AppModal';
import { DashboardWelcomeCard } from './DashboardWelcomeCard';
import { Alert, Platform, Pressable, StatusBar, StyleSheet, Switch, Text as NativeText, TouchableOpacity, View } from 'react-native';
import { LiquidBorderScrollView } from './LiquidBorderScrollView';
import {
  ArrowRight,
  AlertCircle,
  Bell,
  Calendar,
  Check,
  CheckCircle,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Crown,
  FileText,
  Key,
  LogOut,
  Menu,
  Stethoscope,
  Trash2,
  User,
  UserPlus,
  Video,
  WalletCards,
  X,
} from 'lucide-react-native';
import { useAuthContext } from '../../context/AuthContext';
import { useStaffHeaderData } from '../../hooks/useStaffHeaderData';
import { dashboardNumber, displayAmount, displayDate } from '../../utils/dashboardValues';
import { navigateStaffScreen } from '../../utils/navigationEvents';
import { normalizeRoleName } from '../../utils/rolePermissions';
import { getMobileNotificationDestination } from '../../utils/notificationNavigation';
import { markNotificationAsRead } from '../../api/notificationApi';
import { getProviderWalletSummaryApi } from '../../api/providerWalletApi';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { getNotificationSocket } from '../../api/notificationSocket';
import { showErrorToast } from '../../utils/toast';
import type { InboxNotification } from '../../api/staffHeaderApi';
import { colors, radii, shadows, spacing, typography } from '../../theme/tokens';

const Text = (props: React.ComponentProps<typeof NativeText>) => (
  <NativeText maxFontSizeMultiplier={1.2} {...props} />
);

interface StaffHeaderProps {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  title?: string;
  onNavigate?: (path: string) => void;
  hideClinicBanner?: boolean;
}

export const StaffHeader: React.FC<StaffHeaderProps> = ({
  onOpenDrawer,
  onOpenNotifications,
  title,
  onNavigate = navigateStaffScreen,
  hideClinicBanner = false,
}) => {
  const {
    user,
    role,
    activeClinicId,
    activeClinicName,
    assignedClinics,
    permissionsMap = {},
    switchClinic,
    logout,
  } = useAuthContext();

  const legacyRoleName = (user as (typeof user & { role_name?: string }) | null)?.role_name;
  const rawRole = role || user?.role || user?.roleName || legacyRoleName || '';
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
  const [videoToast, setVideoToast] = useState<{ title: string; message: string } | null>(null);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [providerWalletBalance, setProviderWalletBalance] = useState<number | null>(null);
  const {
    notifications: inbox, unreadCount, notificationsLoading, notificationsError, notificationBusy,
    refreshNotifications, markAllRead: handleMarkAllAsRead, clearAll: handleClearAllNotifications,
    plan, planLoading, planError, retryPlan,
    canManageVideoCalling, videoCallingEnabled, videoBusy, toggleVideo: handleToggleVideoCalling,
  } = useStaffHeaderData(notificationsModalOpen, planModalOpen, profileMenuOpen);
  const notifications = inbox.map(item => ({
    id: item.not_rec_id,
    title: item.not_cat_name || item.title || 'Notification',
    message: item.message,
    timestamp: displayDate(item.sent_at || item.created_at),
    type: item.entity_type,
    unread: Number(item.is_read) !== 1,
  }));
  const notificationBadgeLabel = Number(unreadCount || 0) > 99 ? '99+' : String(unreadCount || 0);
  const renderNotificationIcon = (item: InboxNotification) => {
    const text = `${item.not_cat_name || ''} ${item.message || ''}`.toLowerCase();
    if (text.includes('appointment')) return <Calendar size={18} color="#2563eb" />;
    if (text.includes('patient') || text.includes('user')) return <UserPlus size={18} color={colors.successDark} />;
    if (text.includes('report') || text.includes('lab')) return <FileText size={18} color="#7c3aed" />;
    if (text.includes('success') || text.includes('paid')) return <CheckCircle size={18} color={colors.primary} />;
    return <AlertCircle size={18} color={colors.warning} />;
  };
  const canEditNotifications = canUseStaffScreen(role || '', permissionsMap, 'notifications', 'edit');
  const canDeleteNotifications = canUseStaffScreen(role || '', permissionsMap, 'notifications', 'delete');

  useEffect(() => {
    let active = true;
    if (!isProviderWalletUser) {
      setProviderWalletBalance(null);
      return () => { active = false; };
    }
    getProviderWalletSummaryApi(activeClinicId).then(result => {
      if (active && result.success) {
        setProviderWalletBalance(Number(result.data?.wallet?.available_balance || 0));
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [activeClinicId, isProviderWalletUser]);

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

  useEffect(() => {
    if (!videoToast) return;
    const timeout = setTimeout(() => setVideoToast(null), 3500);
    return () => clearTimeout(timeout);
  }, [videoToast]);

  const handleVideoCallingToggle = async (enabled: boolean) => {
    const succeeded = await handleToggleVideoCalling(enabled);
    if (succeeded) {
      setVideoToast({
        title: enabled ? 'Video calling enabled' : 'Video calling disabled',
        message: enabled
          ? 'Patients can now book video consultations with you.'
          : 'Patients can no longer book video consultations with you.',
      });
    }
  };

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
        <View style={{ height: statusBarHeight, backgroundColor: colors.surface }} />
      )}

      {/* ── 1. TOP HEADER BAR ── */}
      <View style={styles.topHeaderBar}>
        <TouchableOpacity style={styles.iconSquareBtn} onPress={onOpenDrawer} activeOpacity={0.7}>
          <Menu size={18} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.headerRightGroup}>
          {/* Gold Crown Subscription Button (Web Parity: ONLY Clinic Admin) */}
          {isClinicAdmin && (
            <TouchableOpacity style={styles.crownCircleBtn} onPress={() => setPlanModalOpen(true)} activeOpacity={0.8}>
              <Crown size={16} color={colors.warning} />
            </TouchableOpacity>
          )}

          {/* Wallet Icon Button (Web Parity: ONLY Clinic Admin or Independent Doctor) */}
          {isProviderWalletUser && (
            <TouchableOpacity
              style={styles.walletCircleBtn}
              onPress={() => onNavigate('/wallet')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Open provider wallet${providerWalletBalance === null ? '' : `, available balance ${displayAmount(providerWalletBalance)}`}`}
            >
              <View style={styles.walletHeaderIconWrap}>
                <WalletCards size={16} color={colors.surface} strokeWidth={2.2} />
              </View>
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
            <Bell size={17} color={colors.foreground} />
            {(unreadCount ?? 0) > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{notificationBadgeLabel}</Text>
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
              <ChevronUp size={14} color={colors.primary} />
            ) : (
              <ChevronDown size={14} color={colors.muted} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 2. FLOATING PROFILE SETTINGS DROPDOWN MENU ── */}
      <AppModal
        visible={profileMenuOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setProfileMenuOpen(false)}>
        <View style={styles.profileMenuOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setProfileMenuOpen(false)}
            accessibilityLabel="Close profile menu"
          />
          {videoToast ? (
            <View style={[styles.videoToastCard, { top: statusBarHeight + 8 }]}>
              <View style={styles.videoToastAccent} />
              <View style={styles.videoToastContent}>
                <Text allowFontScaling={false} style={styles.videoToastTitle}>{videoToast.title}</Text>
                <Text allowFontScaling={false} style={styles.videoToastMessage}>{videoToast.message}</Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Dismiss notification"
                onPress={() => setVideoToast(null)}
                style={styles.videoToastClose}>
                <X size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
          ) : null}
        <View style={[styles.profileMenuCard, { top: statusBarHeight + 52 }]}>
          <TouchableOpacity
            style={styles.profileMenuHeader}
            onPress={() => {
              setProfileMenuOpen(false);
              navigateStaffScreen('profile');
              onNavigate('profile');
            }}
            activeOpacity={0.7}>
            <Text allowFontScaling={false} numberOfLines={1} style={styles.profileMenuName}>{staffName}</Text>
            <Text allowFontScaling={false} style={styles.profileMenuSub}>Profile settings</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {canManageVideoCalling && (
            <>
              <View style={styles.profileMenuItemRow}>
                <View style={styles.menuItemLeft}>
                  <Video size={16} color={colors.primary} />
                  <View>
                    <Text allowFontScaling={false} style={styles.menuItemTitle}>Video Calling</Text>
                    <Text allowFontScaling={false} style={styles.menuItemSub}>{videoCallingEnabled ? 'Enabled' : 'Disabled'}</Text>
                  </View>
                </View>
                <Switch
                  value={videoCallingEnabled}
                  disabled={videoBusy}
                  onValueChange={handleVideoCallingToggle}
                  style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                />
              </View>
              <View style={styles.menuDivider} />
            </>
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
            <User size={16} color={colors.primary} />
            <Text allowFontScaling={false} style={styles.menuItemTitle}>My Profile</Text>
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
            <Key size={16} color={colors.warning} />
            <Text allowFontScaling={false} style={styles.menuItemTitle}>Change Password</Text>
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
                <Crown size={16} color={colors.warning} />
                <Text allowFontScaling={false} style={styles.menuItemTitle}>My Plan</Text>
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
            <LogOut size={16} color={colors.destructive} />
            <Text allowFontScaling={false} style={[styles.menuItemTitle, { color: colors.destructive }]}>Logout</Text>
          </TouchableOpacity>
        </View>
        </View>
      </AppModal>

      {/* ── 3. NOTIFICATIONS MODAL / DROPDOWN CARD (MATCHING USER SCREENSHOT) ── */}
      <AppModal
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text style={styles.notifTitle}>Notifications</Text>
                  {(unreadCount ?? 0) > 0 && (
                    <View style={styles.notifCountPill}>
                      <Text style={styles.notifCountText}>{unreadCount} new</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.notifSubTitle}>{Number(unreadCount || 0) > 0 ? 'You have updates to review' : 'You are all caught up'}</Text>
              </View>

              {/* Action Icons Right */}
              <View style={styles.notifHeaderActions}>
                {canEditNotifications && Number(unreadCount || 0) > 0 ? (
                  <TouchableOpacity
                    onPress={handleMarkAllAsRead}
                    disabled={notificationBusy || notificationsLoading}
                    activeOpacity={0.7}
                    style={styles.notifActionBtn}
                    accessibilityLabel="Mark all notifications as read">
                    <CheckCheck size={18} color={colors.muted} />
                  </TouchableOpacity>
                ) : null}
                {canDeleteNotifications && notifications.length > 0 ? (
                  <TouchableOpacity
                    onPress={handleClearAllNotifications}
                    disabled={notificationBusy || notificationsLoading}
                    activeOpacity={0.7}
                    style={styles.notifActionBtn}
                    accessibilityLabel="Clear notification history">
                    <Trash2 size={18} color={colors.destructive} />
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  onPress={() => setNotificationsModalOpen(false)}
                  activeOpacity={0.7}
                  style={styles.notifActionBtn}>
                  <X size={18} color={colors.muted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Notifications List Body */}
            <LiquidBorderScrollView
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              scrollEventThrottle={16}
              decelerationRate="normal"
              style={{ maxHeight: 360, marginTop: spacing.md }}>
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
                  <TouchableOpacity
                    key={item.id}
                    style={styles.notifItemCard}
                    activeOpacity={0.7}
                    onPress={async () => {
                      if (item.unread && canEditNotifications) {
                        try {
                          const result = await markNotificationAsRead(item.id);
                          if (!result.success) throw new Error(result.message);
                          try {
                            getNotificationSocket().emit('mark_as_read', { id: item.id });
                          } catch {
                            // The REST update has already succeeded.
                          }
                          refreshNotifications();
                        } catch (error) {
                          showErrorToast('Failed to mark notification', error instanceof Error ? error.message : 'Please try again.');
                        }
                      }
                      setNotificationsModalOpen(false);
                      const orig = inbox.find(n => n.not_rec_id === item.id);
                      const dest = getMobileNotificationDestination(
                        {
                          entity_type: orig?.entity_type,
                          entity_id: orig?.entity_id,
                          not_cat_name: orig?.not_cat_name,
                          title: orig?.title,
                          message: orig?.message,
                        },
                        { role, currentUserId: user?.id },
                      );
                      onNavigate(dest);
                    }}>
                    {/* Left Icon Square Box */}
                    <View style={styles.notifIconBox}>
                      {renderNotificationIcon(inbox.find(notification => notification.not_rec_id === item.id) || { not_rec_id: item.id, message: item.message, is_read: item.unread ? 0 : 1 })}
                    </View>

                    {/* Content Col */}
                    <View style={styles.notifContentCol}>
                      <Text style={styles.notifItemTitle}>{item.title}</Text>
                      <Text style={styles.notifItemMsg}>{item.message}</Text>
                      <Text style={styles.notifItemTime}>{item.timestamp}</Text>
                    </View>

                    {/* Unread Indicator Dot Right */}
                    {item.unread && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                ))
              )}
            </LiquidBorderScrollView>

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
              <ArrowRight size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </AppModal>

      {/* ── 4. CLINIC BANNER & DROPDOWN ── */}
      {!hideClinicBanner && <View style={styles.clinicBannerSection}>
        <View style={styles.clinicTitleRow}>
          <View style={styles.stethoscopeBox}>
            <Stethoscope size={20} color={colors.surface} />
          </View>
          <View style={styles.clinicTitleWrap}>
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.clinicTitleText}>{selectedClinicName}</Text>
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
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.clinicDropdownText}>{selectedClinicName}</Text>
          {dropdownOpen ? (
            <ChevronUp size={18} color={colors.primary} />
          ) : (
            <ChevronDown size={18} color={colors.primary} />
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
                    {isSelected && <Check size={16} color={colors.primary} style={{ marginRight: spacing.sm }} />}
                    <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                      {clinic.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>}

      {title?.toLowerCase().includes('dashboard') && <DashboardWelcomeCard />}

      {/* ── 5. EXACT SUBSCRIPTION PLAN MODAL ── */}
      <AppModal visible={planModalOpen} animationType="slide" transparent={true} onRequestClose={() => setPlanModalOpen(false)}>
        <View style={styles.planModalOverlay}>
          <View style={styles.planModalContent}>
            <View style={styles.planModalHeaderGlow} />

            <TouchableOpacity style={styles.planCloseBtn} onPress={() => setPlanModalOpen(false)} activeOpacity={0.8}>
              <X size={18} color={colors.primary} />
            </TouchableOpacity>

            <LiquidBorderScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              <View style={styles.planCrownBox}>
                <Crown size={24} color={colors.surface} />
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
                <Calendar size={18} color={colors.primary} />
                <Text style={styles.planNoticeText}>
                  Plan dates are based on the active clinic subscription.
                </Text>
              </View>
              </>)}
            </LiquidBorderScrollView>
          </View>
        </View>
      </AppModal>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.card,
    zIndex: 10,
    position: 'relative',
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconSquareBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  crownCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: '#FCD34D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletCircleBtn: {
    width: 54,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: colors.mintBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletHeaderIconWrap: { width: 32, height: 32, borderRadius: radii.xl, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.destructive,
    borderRadius: 9,
    minWidth: 19,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: { fontFamily: typography.family, color: colors.surface, fontSize: 9, fontWeight: typography.weight.bold },
  avatarPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.tiny,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontFamily: typography.family, color: colors.surface, fontSize: typography.size.sm, fontWeight: typography.weight.bold },

  // Profile Dropdown Menu Card
  profileMenuOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  videoToastCard: {
    position: 'absolute',
    left: '4%',
    right: '4%',
    zIndex: 200,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    elevation: 16,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },
  videoToastAccent: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: colors.successDark,
  },
  videoToastContent: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
  },
  videoToastTitle: {
    fontFamily: typography.family, color: colors.foreground,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  videoToastMessage: {
    fontFamily: typography.family, marginTop: 3,
    color: colors.muted,
    fontSize: typography.size.sm,
  },
  videoToastClose: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  profileMenuCard: {
    position: 'absolute',
    right: 16,
    width: 256,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 12,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    zIndex: 100,
  },
  profileMenuHeader: {
    paddingBottom: spacing.xs,
  },
  profileMenuName: {
    fontFamily: typography.family, fontSize: typography.size.body,
    fontWeight: typography.weight.extrabold,
    color: colors.text,
  },
  profileMenuSub: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    color: colors.muted,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.secondary,
    marginVertical: spacing.tiny,
  },
  profileMenuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuItemTitle: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    color: colors.foreground,
  },
  menuItemSub: {
    fontFamily: typography.family, fontSize: typography.size.xs,
    color: colors.muted,
    marginTop: 1,
  },
  profileMenuItemRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 34,
    paddingVertical: 3,
  },

  // Notifications Modal / Dropdown Card (Matching User Screenshot)
  notifModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.40)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: spacing.lg,
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
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.xl,
    elevation: 16,
    shadowColor: colors.text,
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
    borderBottomColor: colors.secondary,
    paddingBottom: 14,
  },
  notifHeaderLeft: {},
  notifTitle: {
    fontFamily: typography.family, fontSize: typography.size.title,
    fontWeight: typography.weight.extrabold,
    color: colors.text,
  },
  notifCountPill: {
    backgroundColor: colors.mint,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.mintBorder,
  },
  notifCountText: {
    fontFamily: typography.family, color: colors.primaryDark,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  notifSubTitle: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  notifHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifActionBtn: {
    padding: spacing.xs,
  },
  notifItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    position: 'relative',
    gap: spacing.md,
  },
  notifIconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifContentCol: {
    flex: 1,
  },
  notifItemTitle: {
    fontFamily: typography.family, fontSize: 15,
    fontWeight: typography.weight.extrabold,
    color: colors.text,
  },
  notifItemMsg: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    color: colors.muted,
    marginTop: 3,
    lineHeight: 18,
  },
  notifItemTime: {
    fontFamily: typography.family, fontSize: typography.size.xs,
    color: colors.subtle,
    marginTop: spacing.tiny,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: spacing.tiny,
  },
  emptyNotifBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyNotifText: {
    fontFamily: typography.family, color: colors.subtle,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  notifFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.secondary,
    marginTop: spacing.sm,
  },
  notifFooterText: {
    fontFamily: typography.family, fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },

  // Clinic Banner & Dropdown
  clinicBannerSection: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  clinicTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: 10 },
  stethoscopeBox: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clinicTitleWrap: { position: 'relative', flex: 1, minWidth: 0 },
  clinicTitleText: { fontFamily: typography.family, fontSize: typography.size.title, fontWeight: typography.weight.bold, color: colors.primaryDark, flexShrink: 1 },
  titleUnderline: { height: 3, backgroundColor: colors.primary, marginTop: spacing.xs, borderRadius: 2, width: '100%' },

  clinicDropdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: colors.mintBorder,
  },
  clinicDropdownText: { fontFamily: typography.family, fontSize: 15, fontWeight: typography.weight.bold, color: colors.text, flex: 1, flexShrink: 1, marginRight: 10 },

  // Inline Expandable Dropdown
  dropdownExpandCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 4,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    borderRadius: radii.lg,
    marginBottom: spacing.xs,
  },
  dropdownItemRowSelected: {
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: colors.mintBorder,
  },
  itemRowLeft: { flexDirection: 'row', alignItems: 'center' },
  dropdownItemText: { fontFamily: typography.family, fontSize: 15, fontWeight: typography.weight.semibold, color: colors.foreground },
  dropdownItemTextSelected: { fontWeight: typography.weight.bold, color: colors.primaryDark },

  // Exact Subscription Plan Modal
  planModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  planModalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    position: 'relative',
    overflow: 'hidden',
    elevation: 12,
    shadowColor: colors.text,
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
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.mintBorder,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  planCrownBox: {
    width: 48,
    height: 48,
    borderRadius: radii.xl,
    backgroundColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
    elevation: 4,
    shadowColor: colors.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  planModalTitle: {
    fontFamily: typography.family, fontSize: typography.size.display,
    fontWeight: typography.weight.extrabold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  planModalSubtitle: {
    fontFamily: typography.family, fontSize: typography.size.body,
    color: colors.muted,
    marginTop: spacing.tiny,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  activePlanCard: {
    backgroundColor: '#FFFDF0',
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
  },
  planCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planNameText: {
    fontFamily: typography.family, fontSize: typography.size.heading,
    fontWeight: typography.weight.extrabold,
    color: colors.text,
  },
  activePillTag: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.lg,
  },
  activePillText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.successDark,
  },
  planSubLabel: {
    fontFamily: typography.family, fontSize: typography.size.body,
    color: colors.muted,
    marginTop: spacing.tiny,
    fontWeight: typography.weight.regular,
  },

  detailsListBox: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.secondary,
    marginBottom: spacing.lg,
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
    fontFamily: typography.family, fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.foreground,
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: typography.family, fontSize: typography.size.body,
    color: colors.muted,
    fontWeight: typography.weight.regular,
  },
  planNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: colors.mintBorder,
    borderRadius: radii.xl,
    padding: 14,
  },
  planNoticeText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.primaryDark,
    flex: 1,
    lineHeight: 18,
  },
});

export default StaffHeader;
