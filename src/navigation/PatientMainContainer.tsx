import { colors, radii, spacing, typography } from '../theme/tokens';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AppModal } from '../components/common/AppModal';
import { Alert, BackHandler, Platform, ScrollView, StatusBar, StyleSheet, Text, ToastAndroid, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Users,
  CreditCard,
  Pill,
  Video,
  TestTube,
  Bell,
  X,
  LogOut,
} from 'lucide-react-native';
import { useAuthContext } from '../context/AuthContext';
import { PatientDashboardScreen } from '../screens/dashboards/PatientDashboardScreen';
import BookAppointmentScreen from '../screens/patient/BookAppointmentScreen';
import LabTestsScreen from '../screens/staff/LabManagementScreen';
import MedicineBillingScreen from '../screens/patient/MedicineBillingScreen';
import NotificationsCenterScreen from '../screens/staff/NotificationsCenterScreen';
import PatientsProfileScreen from '../screens/patient/PatientsProfileScreen';
import PatientsManagementScreen from '../screens/staff/PatientsManagementScreen';
import TreatmentBillingScreen from '../screens/patient/TreatmentBillingScreen';
import VideoServicesScreen from '../screens/patient/VideoServicesScreen';
import { canUseStaffScreen } from './staffAccess';
import { getNotificationSocket } from '../api/notificationSocket';
import { getAppointmentsApi } from '../api/appointmentApi';
import { fetchUnreadCount } from '../api/notificationApi';
import { Appointment } from '../types/clinicTypes';
import { VideoCallRoomScreen } from '../screens/common/VideoCallRoomScreen';
import { subscribePatientNavigation } from '../utils/patientNavigationEvents';
import ChangePasswordScreen from '../screens/staff/ChangePasswordScreen';
import AppointmentsManagerScreen from '../screens/staff/AppointmentsManagerScreen';

export type PatientTabType =
  | 'dashboard'
  | 'book_appointment'
  | 'patients'
  | 'profile'
  | 'appointments'
  | 'treatment_billing'
  | 'medicine_billing'
  | 'video_services'
  | 'lab_tests'
  | 'notifications'
  | 'change_password';

interface MenuItem {
  id: PatientTabType;
  label: string;
  badge?: number;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', label: 'Patient Dashboard' },
  { id: 'book_appointment', label: 'Book Appointment' },
  { id: 'patients', label: 'Patients' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'treatment_billing', label: 'Treatment Billing' },
  { id: 'medicine_billing', label: 'Medicine Billing' },
  { id: 'video_services', label: 'Video Services' },
  { id: 'lab_tests', label: 'Lab Tests' },
  { id: 'notifications', label: 'Notifications', badge: 4 },
];

const renderTabVectorIcon = (tab: PatientTabType, color: string, size: number = 20) => {
  switch (tab) {
    case 'dashboard':
      return <LayoutDashboard color={color} size={size} />;
    case 'book_appointment':
    case 'appointments':
      return <Calendar color={color} size={size} />;
    case 'patients':
      return <Users color={color} size={size} />;
    case 'treatment_billing':
      return <CreditCard color={color} size={size} />;
    case 'medicine_billing':
      return <Pill color={color} size={size} />;
    case 'video_services':
      return <Video color={color} size={size} />;
    case 'lab_tests':
      return <TestTube color={color} size={size} />;
    case 'notifications':
      return <Bell color={color} size={size} />;
    default:
      return <LayoutDashboard color={color} size={size} />;
  }
};

export const PatientMainContainer = () => {
  const [activeTab, setActiveTab] = useState<PatientTabType>('dashboard');
  const [notificationRouteFilters, setNotificationRouteFilters] = useState<Record<string, string>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { user, token, userType, logout, role, permissionsMap = {} } = useAuthContext();
  const [activeVideoCall, setActiveVideoCall] = useState<{ appointment: Appointment; roomId: string } | null>(null);
  const handledIncomingCallRef = useRef('');

  const canPatientOpen = useCallback((tabId: PatientTabType) => {
    if (tabId === 'dashboard' || tabId === 'profile' || tabId === 'change_password') return true;
    // Match the web sidebar: show a tab only when its role has view access.
    return canUseStaffScreen(role || 'patient', permissionsMap, tabId, 'view');
  }, [permissionsMap, role]);

  useEffect(() => {
    if (activeTab !== 'dashboard' && activeTab !== 'profile' && activeTab !== 'change_password' && !canPatientOpen(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, canPatientOpen]);

  useEffect(() => {
    let mounted = true;
    const loadUnread = async () => {
      try {
        const res = await fetchUnreadCount();
        if (mounted && res.success && res.data?.count != null) {
          setUnreadCount(Number(res.data.count));
        }
      } catch {
        // quiet
      }
    };
    void loadUnread();
    return () => {
      mounted = false;
    };
  }, [activeTab, drawerOpen]);

  useEffect(() => subscribePatientNavigation(route => {
    const destination = new URL(route, 'https://patient.local');
    const screen = destination.pathname.replace(/^\//, '');
    setNotificationRouteFilters(Object.fromEntries(destination.searchParams.entries()));
    if (screen === 'wallet') setActiveTab('video_services');
    else if (screen === 'profile' || screen === 'change_password' || screen === 'dashboard') {
      setActiveTab(screen);
    } else if (canPatientOpen(screen as PatientTabType)) {
      setActiveTab(screen as PatientTabType);
    }
    setDrawerOpen(false);
  }), [canPatientOpen]);

  const visibleMenuItems = useMemo(() => {
    return MENU_ITEMS.filter(item => canPatientOpen(item.id)).map(item => {
      if (item.id === 'notifications') {
        return { ...item, badge: unreadCount > 0 ? unreadCount : undefined };
      }
      return item;
    });
  }, [canPatientOpen, unreadCount]);

  const patientName = user?.fullName || user?.full_name || 'bulbul';

  useEffect(() => {
    if (!token || !user?.id || userType !== 'patient') return;
    let mounted = true;
    const socket = getNotificationSocket();
    const joinNotifications = () => {
      socket.emit('register-user', { userType: 'patient', userId: String(user.id) });
      socket.emit('join_room', { userType: 'patient', userId: String(user.id) });
    };
    const refreshUnread = () => {
      fetchUnreadCount().then(response => {
        if (mounted && response.success && response.data?.count != null) {
          setUnreadCount(Number(response.data.count));
        }
      }).catch(() => undefined);
    };
    socket.on('connect', joinNotifications);
    socket.on('notification', refreshUnread);
    if (socket.connected) joinNotifications();
    const onIncomingCall = (call: { appointment_id?: number | string; video_room_id?: string; doctor_id?: number; patient_id?: number; caller_name?: string; caller_role?: string }) => {
      if (call.caller_role !== 'doctor' || !call.appointment_id || !call.video_room_id) return;
      const appointmentKey = String(call.appointment_id);
      if (handledIncomingCallRef.current === appointmentKey) return;
      handledIncomingCallRef.current = appointmentKey;
      Alert.alert('Incoming Video Consultation', `${call.caller_name || 'Your doctor'} is calling.`, [
        { text: 'Decline', style: 'cancel', onPress: () => { socket.emit('call-rejected', { appointment_id: call.appointment_id, doctor_id: call.doctor_id, patient_id: call.patient_id, caller_role: 'patient' }); handledIncomingCallRef.current = ''; } },
        { text: 'Join', onPress: () => {
          getAppointmentsApi(token, 'page=1&limit=200').then(response => {
            const data = response.data as any;
            const rows: Appointment[] = Array.isArray(data) ? data : Array.isArray(data?.appointments) ? data.appointments : Array.isArray(data?.data) ? data.data : [];
            const appointment = rows.find(row => String(row.id) === String(call.appointment_id));
            if (!response.success || !appointment) {
              Alert.alert('Appointment unavailable', 'Refresh your appointments and try joining again.');
              return;
            }
            socket.emit('call-accepted', { appointment_id: call.appointment_id, video_room_id: call.video_room_id, doctor_id: call.doctor_id, patient_id: call.patient_id, caller_role: 'doctor' });
            setActiveVideoCall({ appointment: { ...appointment, video_room_id: call.video_room_id }, roomId: call.video_room_id! });
          }).catch(() => Alert.alert('Unable to join', 'Please try again from Appointments.'));
        } },
      ]);
    };
    socket.on('incoming-call', onIncomingCall);
    return () => {
      mounted = false;
      socket.off('connect', joinNotifications);
      socket.off('notification', refreshUnread);
      socket.off('incoming-call', onIncomingCall);
    };
  }, [token, user?.id, userType]);

  const openDrawer = () => setDrawerOpen(true);
  const openNotifications = () => {
    if (canPatientOpen('notifications')) setActiveTab('notifications');
  };

  // Android hardware back button handler
  const lastBackPressRef = useRef<number>(0);
  useEffect(() => {
    const onBackPress = () => {
      // 1. Close drawer if open
      if (drawerOpen) {
        setDrawerOpen(false);
        return true;
      }
      // 2. If on any other tab than dashboard, navigate to dashboard
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        return true;
      }
      // 3. Double tap to exit safely on dashboard
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        BackHandler.exitApp();
        return true;
      }
      lastBackPressRef.current = now;
      if (Platform.OS === 'android') {
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      }
      return true;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, [drawerOpen, activeTab]);

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <PatientDashboardScreen
            onOpenDrawer={openDrawer}
            onOpenNotifications={openNotifications}
            onBookAppointment={() => { if (canPatientOpen('book_appointment')) setActiveTab('book_appointment'); }}
            onOpenAppointments={() => { if (canPatientOpen('appointments')) setActiveTab('appointments'); }}
            onOpenLabReports={() => { if (canPatientOpen('lab_tests')) setActiveTab('lab_tests'); }}
            onOpenBilling={() => {
              if (canPatientOpen('treatment_billing')) setActiveTab('treatment_billing');
              else if (canPatientOpen('medicine_billing')) setActiveTab('medicine_billing');
            }}
          />
        );
      case 'book_appointment':
        return <BookAppointmentScreen onOpenDrawer={openDrawer} onViewAppointments={() => setActiveTab('appointments')} />;
      case 'patients':
        return <PatientsManagementScreen patientMode onOpenDrawer={openDrawer} initialPatientId={notificationRouteFilters.patientId} />;
      case 'profile':
        return <PatientsProfileScreen patientMode onOpenDrawer={openDrawer} onNavigateScreen={screen => setActiveTab(screen as PatientTabType)} />;
      case 'appointments':
        return <AppointmentsManagerScreen patientMode onOpenDrawer={openDrawer} initialFilters={notificationRouteFilters} />;
      case 'treatment_billing':
        return <TreatmentBillingScreen initialBillId={notificationRouteFilters.billId} onOpenDrawer={openDrawer} />;
      case 'medicine_billing':
        return <MedicineBillingScreen initialBillId={notificationRouteFilters.billId} onOpenDrawer={openDrawer} />;
      case 'video_services':
        return (
          <VideoServicesScreen
            onOpenDrawer={openDrawer}
            onJoinCall={appointment => {
              const roomId = String(appointment.video_room_id || '').trim();
              if (!roomId) {
                Alert.alert('Call unavailable', 'This appointment does not have a video room yet. Ask your doctor to start the call.');
                return;
              }
              setActiveVideoCall({ appointment, roomId });
            }}
          />
        );
      case 'lab_tests':
        return <LabTestsScreen patientMode initialTab="orders" initialReportId={notificationRouteFilters.reportId} onOpenDrawer={openDrawer} />;
      case 'notifications':
        return (
          <NotificationsCenterScreen
            patientMode
            onOpenDrawer={openDrawer}
            onNavigateScreen={route => {
              const destination = new URL(route, 'https://patient.local');
              setNotificationRouteFilters(Object.fromEntries(destination.searchParams.entries()));
              setActiveTab(destination.pathname.replace(/^\//, '') as PatientTabType);
            }}
          />
        );
      case 'change_password':
        return <ChangePasswordScreen patientMode onOpenDrawer={openDrawer} onNavigateScreen={screen => setActiveTab(screen as PatientTabType)} />;
      default:
        return (
          <PatientDashboardScreen
            onOpenDrawer={openDrawer}
            onOpenNotifications={openNotifications}
            onBookAppointment={() => { if (canPatientOpen('book_appointment')) setActiveTab('book_appointment'); }}
            onOpenAppointments={() => { if (canPatientOpen('appointments')) setActiveTab('appointments'); }}
            onOpenLabReports={() => { if (canPatientOpen('lab_tests')) setActiveTab('lab_tests'); }}
            onOpenBilling={() => {
              if (canPatientOpen('treatment_billing')) setActiveTab('treatment_billing');
              else if (canPatientOpen('medicine_billing')) setActiveTab('medicine_billing');
            }}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {activeVideoCall && token && user ? <VideoCallRoomScreen appointment={activeVideoCall.appointment} roomId={activeVideoCall.roomId} callerRole="patient" userId={user.id} token={token} onClose={() => setActiveVideoCall(null)} /> : null}
      {/* Dynamic Screen Content */}
      <View style={styles.screenContainer}>{renderActiveScreen()}</View>

      {/* ─── SIDE DRAWER MENU MODAL (DARK NAVY THEME) ─── */}
      <AppModal
        visible={drawerOpen}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={Platform.OS === 'android'}
        onRequestClose={() => setDrawerOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setDrawerOpen(false)}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.drawerSheet}>
            <SafeAreaView style={styles.drawerSafeArea}>
                <View style={styles.drawerHeader}>
                  <View style={styles.brandingContainer}>
                    <View style={styles.logoBadge}><Building2 color={colors.primary} size={22} /></View>
                    <View style={styles.patientNameCol}>
                      <Text style={styles.patientNameText} numberOfLines={1}>{patientName}</Text>
                      <Text style={styles.patientSubText}>Patient Account</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setDrawerOpen(false)}
                    style={styles.closeBtn} accessibilityLabel="Close navigation">
                    <X size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>PATIENT PORTAL</Text></View>
                <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
                  <View style={styles.menuList}>
                  {visibleMenuItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.8}
                        style={[
                          styles.menuItemRow,
                          isActive && styles.menuItemRowActive,
                        ]}
                        onPress={() => {
                          setActiveTab(item.id);
                          setDrawerOpen(false);
                        }}>
                        <View
                          style={[
                            styles.menuIconContainer,
                            isActive && styles.menuIconContainerActive,
                          ]}>
                          {renderTabVectorIcon(
                            item.id,
                            isActive ? colors.surface : colors.primary,
                            19
                          )}
                        </View>

                        <Text
                          style={[
                            styles.menuItemLabel,
                            isActive && styles.menuItemLabelActive,
                          ]}>
                          {item.label}
                        </Text>

                        {item.badge ? (
                          <View style={styles.itemBadge}>
                            <Text style={styles.itemBadgeText}>{item.badge}</Text>
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                  </View>
                </ScrollView>

                <View style={styles.footerSection}>
                  <TouchableOpacity
                    style={styles.logoutBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      setDrawerOpen(false);
                      logout();
                    }}>
                    <LogOut size={19} color={colors.primary} />
                    <Text style={styles.logoutBtnText}>Logout</Text>
                  </TouchableOpacity>
                </View>
            </SafeAreaView>
          </View>
        </View>
      </AppModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContainer: {
    flex: 1,
  },
  floatingMenuBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 36) + 10 : 50,
    left: 16,
    zIndex: 99,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingMenuIcon: {
    color: colors.surface,
    fontSize: typography.size.lg,
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'absolute',
    // A translucent Android modal fills the screen, so offset the drawer by the
    // status bar height. This keeps the header below system icons on edge-to-edge devices.
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 20,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  drawerSheet: {
    width: '82%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: '#0A0F1D',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 20,
  },
  drawerSafeArea: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
    paddingHorizontal: spacing.xs,
  },
  brandingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 42,
    height: 42,
    borderRadius: radii.lg,
    backgroundColor: '#102A35',
    borderWidth: 1,
    borderColor: '#164E52',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    paddingHorizontal: spacing.sm,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.foreground,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.extrabold,
    color: colors.subtle,
    letterSpacing: 1.15,
  },
  closeBtn: {
    padding: spacing.tiny,
  },
  closeBtnText: {
    color: colors.subtle,
    fontSize: typography.size.lg,
    fontWeight: 'bold',
  },
  patientNameCol: {
    flex: 1,
  },
  patientNameText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: typography.weight.bold,
  },
  patientSubText: {
    color: colors.subtle,
    fontSize: typography.size.xs,
  },
  menuList: {
    gap: 5,
    marginBottom: spacing.md,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: radii.md,
  },
  menuItemRowActive: {
    backgroundColor: '#122B36',
    borderWidth: 1,
    borderColor: '#164E52',
  },
  menuIconContainer: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuIconContainerActive: {
    backgroundColor: colors.primary,
  },
  menuItemEmoji: {
    fontSize: typography.size.subtitle,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.input,
  },
  menuItemLabelActive: {
    color: colors.surface,
    fontWeight: typography.weight.extrabold,
  },
  itemBadge: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  itemBadgeText: {
    color: colors.surface,
    fontSize: typography.size.xs,
    fontWeight: 'bold',
  },
  footerSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.foreground,
    marginBottom: spacing.xl,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.foreground,
  },
  logoutBtnIcon: {
    fontSize: typography.size.subtitle,
  },
  logoutBtnText: {
    color: colors.border,
    fontWeight: typography.weight.bold,
    fontSize: typography.size.body,
  },
});

export default PatientMainContainer;
