import { colors, radii, spacing, typography } from '../theme/tokens';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppModal } from '../components/common/AppModal';
import { Alert, BackHandler, Image, Platform, ScrollView, StatusBar, StyleSheet, Text, ToastAndroid, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Building2,
  CreditCard,
  Pill,
  TestTube,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ChevronUp,
  UserCog,
  UserPlus,
  UserCheck,
  Shield,
  Video,
} from 'lucide-react-native';
import { useAuthContext } from '../context/AuthContext';
import { profilePhotoUrl } from '../api/profilePhotoApi';

// Role Dashboards
import AccountantDashboardScreen from '../screens/dashboards/AccountantDashboardScreen';
import ClinicAdminDashboardScreen from '../screens/dashboards/ClinicAdminDashboardScreen';
import DoctorDashboardScreen from '../screens/dashboards/DoctorDashboardScreen';
import LabTechnicianDashboardScreen from '../screens/dashboards/LabTechnicianDashboardScreen';
import NurseDashboardScreen from '../screens/dashboards/NurseDashboardScreen';
import PharmacistDashboardScreen from '../screens/dashboards/PharmacistDashboardScreen';
import ReceptionistDashboardScreen from '../screens/dashboards/ReceptionistDashboardScreen';
import SuperAdminDashboardScreen from '../screens/dashboards/SuperAdminDashboardScreen';

// Feature Screens
import AppointmentsManagerScreen from '../screens/staff/AppointmentsManagerScreen';
import ClinicsManagementScreen from '../screens/staff/ClinicsManagementScreen';
import LabManagementScreen from '../screens/staff/LabManagementScreen';
import LabProfileManagementScreen from '../screens/staff/LabProfileManagementScreen';
import LabInventoryScreen from '../screens/staff/LabInventoryScreen';
import MedicineBillingScreen from '../screens/staff/MedicineBillingScreen';
import NotificationsCenterScreen from '../screens/staff/NotificationsCenterScreen';
import PatientsManagementScreen from '../screens/staff/PatientsManagementScreen';
import PharmacyInventoryScreen from '../screens/staff/PharmacyInventoryScreen';
import PrescriptionsScreen from '../screens/staff/PrescriptionsScreen';
import StaffManagementScreen from '../screens/staff/StaffManagementScreen';
import RolePermissionsScreen from '../screens/staff/RolePermissionsScreen';
import TreatmentBillingScreen from '../screens/staff/TreatmentBillingScreen';
import StaffVideoServicesScreen from '../screens/staff/StaffVideoServicesScreen';
import MyProfileScreen from '../screens/staff/MyProfileScreen';
import ChangePasswordScreen from '../screens/staff/ChangePasswordScreen';
import { ProviderWalletScreen } from '../screens/staff/ProviderWalletScreen';
import SubscriptionPlansScreen from '../screens/staff/SubscriptionPlansScreen';
import PendingDoctorApprovalsScreen from '../screens/staff/PendingDoctorApprovalsScreen';
import { useRemoteData } from '../hooks/useRemoteData';
import { fetchHeaderUnreadCount } from '../api/staffHeaderApi';
import { resolveStaffScreen, subscribeStaffNavigation } from '../utils/navigationEvents';
import { canUseStaffScreen } from './staffAccess';
import { StaffHeader } from '../components/common/StaffHeader';
import { getRoleDisplayName, getRoleSectionLabel, normalizeRoleName } from '../utils/rolePermissions';

export type StaffTabType =
  | 'dashboard'
  | 'clinics'
  | 'staff'
  | 'role_permissions'
  | 'patients'
  | 'appointments'
  | 'book_appointment'
  | 'video_services'
  | 'prescriptions'
  | 'pharmacy_inventory'
  | 'medicine_billing'
  | 'treatment_billing'
  | 'lab_management'
  | 'lab_tests'
  | 'lab_inventory'
  | 'lab_reports'
  | 'notifications'
  | 'profile'
  | 'wallet'
  | 'subscription_plans'
  | 'pending_doctor_approvals'
  | 'change_password';

interface MenuItemChild {
  id: StaffTabType;
  label: string;
  iconType?: 'create_user' | 'role_permissions';
}

interface MenuItem {
  id: StaffTabType | 'user_role_mgmt';
  label: string;
  badge?: number;
  isGroup?: boolean;
  children?: MenuItemChild[];
}

export const StaffMainContainer = () => {
  const {
    user,
    token,
    role,
    activeClinicId,
    activeClinicName,
    assignedClinics,
    isMultiClinic,
    switchClinic,
    logout,
    permissionsMap = {},
    permissionsLoading,
    permissionsError,
    refreshPermissions,
  } = useAuthContext();

  const staffRole = role || 'staff';
  const normalizedStaffRole = normalizeRoleName(staffRole);
  const sidebarDisplayTitle = normalizedStaffRole === 'super_admin'
    ? 'Clinic Management'
    : normalizedStaffRole === 'doctor'
      ? String((user as any)?.full_name || (user as any)?.fullName || (user as any)?.name || 'Doctor').trim()
      : activeClinicName || 'Clinic';

  const currentClinic = assignedClinics.find(c => Number(c.id) === Number(activeClinicId))
    ?? (assignedClinics.length === 1 ? assignedClinics[0] : null);
  const currentClinicLogoUrl = currentClinic?.logo_url || currentClinic?.clinic_logo_url || '';

  useEffect(() => {
    setDrawerClinicLogoFailed(false);
  }, [currentClinicLogoUrl]);

  const activeEntityType = String(
    (currentClinic as any)?.entity_type ||
    (currentClinic as any)?.clinic_entity_type ||
    (user as any)?.entity_type ||
    (user as any)?.clinic_entity_type ||
    ''
  ).trim().toLowerCase();

  const isLabEntity = activeEntityType === 'lab';

  const canOpen = useCallback((screen: string) => {
    if (screen === 'lab_management') {
      const normalizedRole = normalizeRoleName(staffRole);
      // Lab management is strictly for standalone lab entities (or super_admin)
      if (normalizedRole !== 'super_admin' && !isLabEntity) {
        return false;
      }
    }
    return canUseStaffScreen(staffRole, permissionsMap, screen);
  }, [isLabEntity, permissionsMap, staffRole]);

  if (__DEV__) {
    console.debug('[PERMISSIONS DEBUG]', {
      role: staffRole,
      clinicId: activeClinicId,
      entityType: activeEntityType,
      isLabEntity,
      canLabTests: canOpen('lab_tests'),
      canLabInventory: canOpen('lab_inventory'),
      totalPermKeys: Object.keys(permissionsMap).length,
    });
  }

  const [activeTab, setActiveTab] = useState<StaffTabType>('dashboard');
  const [dashboardRouteFilters, setDashboardRouteFilters] = useState<Record<string, string>>({});
  const [dashboardFilterScreen, setDashboardFilterScreen] = useState<StaffTabType | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerClinicLogoFailed, setDrawerClinicLogoFailed] = useState(false);
  const unread = useRemoteData([user?.id, token, activeClinicId, 'drawer-unread'].join(':'), async () => {
    const result = await fetchHeaderUnreadCount();
    if (!result.success || result.data?.count == null || !Number.isFinite(Number(result.data.count))) throw new Error('Unable to load count');
    return Number(result.data.count);
  }, drawerOpen);
  const [clinicModalOpen, setClinicModalOpen] = useState(false);
  const [isSwitchingClinic, setIsSwitchingClinic] = useState(false);
  const [userRoleMgmtOpen, setUserRoleMgmtOpen] = useState(true);

  const navigateFromMenu = (screen: StaffTabType) => {
    setDashboardRouteFilters({});
    setDashboardFilterScreen(null);
    setActiveTab(screen);
    setDrawerOpen(false);
  };

  const navigateFromNotification = (path: string) => {
    const destination = new URL(path, 'https://staff.local');
    const target = resolveStaffScreen(destination.pathname) as StaffTabType;
    setDashboardRouteFilters(Object.fromEntries(destination.searchParams.entries()));
    setDashboardFilterScreen(target);
    setActiveTab(target);
    setDrawerOpen(false);
  };

  const navigateFromClinicDashboard = (path: string) => {
    const destination = new URL(path, 'https://staff.local');
    const target = resolveStaffScreen(destination.pathname) as StaffTabType;
    setDashboardRouteFilters(Object.fromEntries(destination.searchParams.entries()));
    setDashboardFilterScreen(target);
    setActiveTab(target);
  };

  useEffect(() => {
    const unsubscribe = subscribeStaffNavigation((screen) => {
      const destination = new URL(screen, 'https://staff.local');
      let clean = destination.pathname.trim();
      if (clean.startsWith('/')) clean = clean.slice(1);
      if (clean === 'change-password') clean = 'change_password';
      setDashboardRouteFilters(Object.fromEntries(destination.searchParams.entries()));
      setDashboardFilterScreen(clean as StaffTabType);
      setActiveTab(clean as StaffTabType);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (activeTab === 'lab_management' && !canOpen('lab_management')) {
      setActiveTab('dashboard');
    }
  }, [activeTab, canOpen]);

  // Android hardware back button handler
  const lastBackPressRef = useRef<number>(0);
  useEffect(() => {
    const onBackPress = () => {
      // 1. Close drawer if open
      if (drawerOpen) {
        setDrawerOpen(false);
        return true;
      }
      // 2. Close clinic modal if open
      if (clinicModalOpen) {
        setClinicModalOpen(false);
        return true;
      }
      // 3. If on any other tab than dashboard, navigate to dashboard
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        return true;
      }
      // 4. If already on dashboard, double-tap back to exit safely
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
  }, [drawerOpen, clinicModalOpen, activeTab]);

  const openDrawer = () => setDrawerOpen(true);
  const openNotifications = () => setActiveTab('notifications');

  const handleSelectClinic = async (clinicId: number) => {
    if (isSwitchingClinic) return;
    if (clinicId === activeClinicId) {
      setClinicModalOpen(false);
      return;
    }
    setIsSwitchingClinic(true);
    const success = await switchClinic(clinicId);
    setIsSwitchingClinic(false);
    if (success) setClinicModalOpen(false);
    else Alert.alert('Clinic switch failed', 'Your current clinic is unchanged. Please retry.');
  };

  // 1. Shared Clinical Navigation (Exact Web parity with roleNavigationConfig.ts sharedClinicNav)
  const sharedClinicNav: MenuItem[] = [
    { id: 'patients', label: 'Patients' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'video_services', label: 'Video Services' },
    { id: 'treatment_billing', label: 'Treatment Billing' },
    { id: 'medicine_billing', label: 'Medicine Billing' },
    { id: 'pharmacy_inventory', label: 'Medicines' },
    { id: 'lab_tests', label: 'Lab Tests' },
    { id: 'lab_inventory', label: 'Lab Inventory' },
    { id: 'lab_reports', label: 'Lab Reports' },
  ];

  const userRoleManagementGroup: MenuItem = {
    id: 'user_role_mgmt',
    label: 'User & Role Management',
    isGroup: true,
    children: [
      { id: 'staff', label: 'Create User', iconType: 'create_user' },
      { id: 'role_permissions', label: 'Role Permissions', iconType: 'role_permissions' },
    ],
  };

  // 2. Full Custom Role navigation catalog matching Web's customRoleNav (used for Nurse & all custom roles)
  const customRoleNavCatalog: MenuItem[] = [
    { id: 'clinics', label: 'Clinic Management' },
    { id: 'patients', label: 'Patients' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'book_appointment', label: 'Book Appointment' },
    { id: 'video_services', label: 'Video Services' },
    { id: 'treatment_billing', label: 'Treatment Billing' },
    { id: 'medicine_billing', label: 'Medicine Billing' },
    { id: 'pharmacy_inventory', label: 'Medicines' },
          { id: 'lab_management', label: 'Lab Management' },
    { id: 'lab_tests', label: 'Lab Tests' },
    { id: 'lab_inventory', label: 'Lab Inventory' },
    { id: 'lab_reports', label: 'Lab Reports' },
    { id: 'notifications', label: 'Notifications', badge: unread.data ?? undefined },
    userRoleManagementGroup,
  ];

  // 3. Exact Web Role Navigation Config (matching Web's roleNavigationConfig.ts)
  const getNavConfigForRole = (roleStr: string): MenuItem[] => {
    const normalized = normalizeRoleName(roleStr);
    switch (normalized) {
      case 'super_admin':
        return [
          { id: 'dashboard', label: 'Super Admin Dashboard' },
          { id: 'clinics', label: 'Clinic Management' },
          userRoleManagementGroup,
          { id: 'subscription_plans', label: 'Subscription Plans' },
          { id: 'pending_doctor_approvals', label: 'Pending Doctor Approvals' },
          ...sharedClinicNav,
          { id: 'book_appointment', label: 'Book Appointment' },
          { id: 'lab_management', label: 'Lab Management' },
          { id: 'notifications', label: 'Notifications', badge: unread.data ?? undefined },
        ];
      case 'clinic_admin':
        return [
          { id: 'dashboard', label: 'Admin Dashboard' },
          { id: 'clinics', label: 'Clinic Management' },
          ...sharedClinicNav,
          { id: 'notifications', label: 'Notifications', badge: unread.data ?? undefined },
          userRoleManagementGroup,
        ];
      case 'doctor':
        return [
          { id: 'dashboard', label: 'Doctor Dashboard' },
          ...sharedClinicNav,
          { id: 'notifications', label: 'Notifications', badge: unread.data ?? undefined },
        ];
      case 'receptionist':
        return [
          { id: 'dashboard', label: 'Reception Dashboard' },
          ...sharedClinicNav,
        ];
      case 'pharmacist':
        return [
          { id: 'dashboard', label: 'Pharmacist Dashboard' },
          { id: 'medicine_billing', label: 'Medicine Billing' },
          { id: 'pharmacy_inventory', label: 'Medicines' },
        ];
      case 'lab_technician':
        return [
          { id: 'dashboard', label: 'Lab Dashboard' },
          { id: 'lab_management', label: 'Lab Management' },
          { id: 'lab_tests', label: 'Lab Tests' },
          { id: 'lab_inventory', label: 'Lab Inventory' },
          { id: 'lab_reports', label: 'Lab Reports' },
          { id: 'treatment_billing', label: 'Treatment Billing' },
          { id: 'medicine_billing', label: 'Medicine Billing' },
          { id: 'patients', label: 'Patients' },
          { id: 'clinics', label: 'Clinic Management' },
          { id: 'notifications', label: 'Notifications', badge: unread.data ?? undefined },
        ];
      case 'accountant':
        return [
          { id: 'dashboard', label: 'Accounts Dashboard' },
          { id: 'treatment_billing', label: 'Treatment Billing' },
          { id: 'medicine_billing', label: 'Medicine Billing' },
          { id: 'pharmacy_inventory', label: 'Medicines' },
        ];
      case 'nurse':
        return [
          { id: 'dashboard', label: 'Nurse Dashboard' },
          ...customRoleNavCatalog,
        ];
      default:
        // Any custom created role
        return [
          {
            id: 'dashboard',
            label: `${getRoleDisplayName(staffRole)} Dashboard`,
          },
          ...customRoleNavCatalog,
        ];
    }
  };

  const roleBaseConfig = getNavConfigForRole(staffRole);

  // 4. Exact Web filterNavConfig: filter items strictly by permission
  const menuItems = roleBaseConfig.flatMap(item => {
    if (item.isGroup && item.children) {
      const visibleChildren = item.children.filter(child => canOpen(child.id));
      const canShowGroup = canOpen(item.id) || visibleChildren.length > 0;
      return canShowGroup && visibleChildren.length > 0
        ? [{ ...item, children: visibleChildren }]
        : [];
    }
    // Dashboard is always visible
    if (item.id === 'dashboard') return [item];
    return canOpen(item.id) ? [item] : [];
  });

  const renderActiveScreen = () => {
    const currentTab = String(activeTab).replace('/', '').replace('-', '_');
    if (!canOpen(currentTab)) {
      return <View style={{ flex: 1 }}>
        <StaffHeader title="Access" onOpenDrawer={openDrawer} />
        <View style={{ padding: spacing.xxl }}>
          <Text>{permissionsLoading ? 'Loading permissions…' : permissionsError ? 'Unable to load permissions.' : 'You do not have permission to open this screen.'}</Text>
          <TouchableOpacity onPress={refreshPermissions}><Text>Refresh permissions</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('dashboard')}><Text>Go to dashboard</Text></TouchableOpacity>
        </View>
      </View>;
    }

    if (currentTab === 'profile') {
      return <MyProfileScreen onOpenDrawer={openDrawer} onNavigateScreen={(scr) => setActiveTab(scr as any)} />;
    }
    if (currentTab === 'change_password') {
      return <ChangePasswordScreen onOpenDrawer={openDrawer} onNavigateScreen={(scr) => setActiveTab(scr as any)} />;
    }

    switch (activeTab) {
      case 'dashboard':
        switch (staffRole) {
          case 'super_admin':
            return <SuperAdminDashboardScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={(scr) => setActiveTab(scr as any)} />;
          case 'clinic_admin':
            return <ClinicAdminDashboardScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={navigateFromClinicDashboard} />;
          case 'doctor':
            return <DoctorDashboardScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={navigateFromClinicDashboard} />;
          case 'receptionist':
            return <ReceptionistDashboardScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={navigateFromClinicDashboard} />;
          case 'pharmacist':
            return <PharmacistDashboardScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={navigateFromClinicDashboard} />;
          case 'lab_technician':
            return <LabTechnicianDashboardScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={navigateFromClinicDashboard} />;
          case 'accountant':
            return <AccountantDashboardScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={navigateFromClinicDashboard} />;
          case 'nurse':
          default:
            return <NurseDashboardScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={(scr) => setActiveTab(scr as any)} />;
        }
      case 'clinics':
        return <ClinicsManagementScreen onOpenDrawer={openDrawer} onNavigateScreen={navigateFromClinicDashboard} initialClinicId={dashboardFilterScreen === 'clinics' ? dashboardRouteFilters.clinicId : undefined} />;
      case 'staff':
        return <StaffManagementScreen onOpenDrawer={openDrawer} onNavigateScreen={(scr) => setActiveTab(scr as StaffTabType)} initialUserId={dashboardFilterScreen === 'staff' ? dashboardRouteFilters.userId : undefined} />;
      case 'role_permissions':
        return <RolePermissionsScreen onOpenDrawer={openDrawer} onNavigateScreen={(scr) => setActiveTab(scr as StaffTabType)} />;
      case 'patients':
        return <PatientsManagementScreen onOpenDrawer={openDrawer} onNavigateScreen={(screen) => setActiveTab(screen as StaffTabType)} initialStatus={dashboardFilterScreen === 'patients' ? dashboardRouteFilters.status : undefined} initialPatientId={dashboardFilterScreen === 'patients' ? dashboardRouteFilters.patientId : undefined} />;
      case 'appointments':
        return <AppointmentsManagerScreen onOpenDrawer={openDrawer} onNavigateScreen={navigateFromClinicDashboard} initialFilters={dashboardFilterScreen === 'appointments' ? dashboardRouteFilters : {}} />;
      case 'book_appointment':
        return <AppointmentsManagerScreen onOpenDrawer={openDrawer} />;
      case 'video_services':
        return <StaffVideoServicesScreen onOpenDrawer={openDrawer} onNavigateScreen={(screen) => setActiveTab(screen as StaffTabType)} />;
      case 'prescriptions':
        return <PrescriptionsScreen onOpenDrawer={openDrawer} appointmentId={dashboardFilterScreen === 'prescriptions' ? dashboardRouteFilters.appointment_id : undefined} initialPatientId={dashboardFilterScreen === 'prescriptions' ? dashboardRouteFilters.patient_id : undefined} createForAppointment={dashboardFilterScreen === 'prescriptions' && dashboardRouteFilters.create === '1'} />;
      case 'pharmacy_inventory':
        return <PharmacyInventoryScreen onOpenDrawer={openDrawer} initialStock={dashboardFilterScreen === 'pharmacy_inventory' ? dashboardRouteFilters.stock : undefined} />;
      case 'medicine_billing':
        return <MedicineBillingScreen
          onOpenDrawer={openDrawer}
          initialBillId={dashboardFilterScreen === 'medicine_billing' ? dashboardRouteFilters.billId : undefined}
          initialDate={dashboardFilterScreen === 'medicine_billing' ? dashboardRouteFilters.date : undefined}
          initialDateFrom={dashboardFilterScreen === 'medicine_billing' ? dashboardRouteFilters.date_from : undefined}
          initialDateTo={dashboardFilterScreen === 'medicine_billing' ? dashboardRouteFilters.date_to : undefined}
        />;
      case 'treatment_billing':
        return <TreatmentBillingScreen
          onOpenDrawer={openDrawer}
          initialDate={dashboardFilterScreen === 'treatment_billing' ? dashboardRouteFilters.date : undefined}
          initialDateFrom={dashboardFilterScreen === 'treatment_billing' ? dashboardRouteFilters.date_from : undefined}
          initialDateTo={dashboardFilterScreen === 'treatment_billing' ? dashboardRouteFilters.date_to : undefined}
          initialStatus={dashboardFilterScreen === 'treatment_billing' ? dashboardRouteFilters.status : undefined}
          initialBillId={dashboardFilterScreen === 'treatment_billing' ? dashboardRouteFilters.billId : undefined}
        />;
      case 'lab_management':
        return <LabProfileManagementScreen onOpenDrawer={openDrawer} />;
      case 'lab_tests':
        return <LabManagementScreen
          onOpenDrawer={openDrawer}
          initialTab="orders"
          initialStatus={dashboardFilterScreen === 'lab_tests' ? dashboardRouteFilters.status : undefined}
          initialDate={dashboardFilterScreen === 'lab_tests' ? dashboardRouteFilters.date : undefined}
          initialDateFrom={dashboardFilterScreen === 'lab_tests' ? dashboardRouteFilters.date_from : undefined}
          initialDateTo={dashboardFilterScreen === 'lab_tests' ? dashboardRouteFilters.date_to : undefined}
          initialReportId={dashboardFilterScreen === 'lab_tests' ? dashboardRouteFilters.reportId : undefined}
        />;
      case 'lab_inventory':
        return <LabInventoryScreen onOpenDrawer={openDrawer} />;
      case 'lab_reports':
        return <LabManagementScreen onOpenDrawer={openDrawer} initialTab="reports" initialReportId={dashboardFilterScreen === 'lab_reports' ? dashboardRouteFilters.reportId : undefined} />;
      case 'notifications':
        return <NotificationsCenterScreen onOpenDrawer={openDrawer} onNavigateScreen={navigateFromNotification} />;
      case 'wallet':
        return <ProviderWalletScreen onOpenDrawer={openDrawer} />;
      case 'subscription_plans':
        return <SubscriptionPlansScreen onOpenDrawer={openDrawer} initialPlanId={dashboardFilterScreen === 'subscription_plans' ? dashboardRouteFilters.planId : undefined} />;
      case 'pending_doctor_approvals':
        return <PendingDoctorApprovalsScreen onOpenDrawer={openDrawer} />;
      case 'profile':
        return <MyProfileScreen onOpenDrawer={openDrawer} onNavigateScreen={(scr: string) => setActiveTab(scr as any)} />;
      case 'change_password':
        return <ChangePasswordScreen onOpenDrawer={openDrawer} onNavigateScreen={(scr: string) => setActiveTab(scr as any)} />;
      default:
        return <ClinicAdminDashboardScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={(scr: string) => setActiveTab(scr as any)} />;
    }
  };

  const renderTabVectorIcon = (tab: StaffTabType | 'user_role_mgmt', color: string, size: number = 20) => {
    switch (tab) {
      case 'dashboard':
        return <LayoutDashboard color={color} size={size} />;
      case 'book_appointment':
      case 'appointments':
        return <Calendar color={color} size={size} />;
      case 'clinics':
        return <Building2 color={color} size={size} />;
      case 'staff':
      case 'patients':
        return <Users color={color} size={size} />;
      case 'video_services':
        return <Video color={color} size={size} />;
      case 'subscription_plans':
        return <CreditCard color={color} size={size} />;
      case 'pending_doctor_approvals':
        return <UserCheck color={color} size={size} />;
      case 'user_role_mgmt':
        return <UserCog color={color} size={size} />;
      case 'treatment_billing':
      case 'medicine_billing':
        return <CreditCard color={color} size={size} />;
      case 'pharmacy_inventory':
      case 'prescriptions':
        return <Pill color={color} size={size} />;
      case 'lab_management':
        return <Building2 color={color} size={size} />;
      case 'lab_tests':
      case 'lab_inventory':
      case 'lab_reports':
        return <TestTube color={color} size={size} />;
      case 'notifications':
        return <Bell color={color} size={size} />;
      default:
        return <LayoutDashboard color={color} size={size} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenContainer}>{renderActiveScreen()}</View>

      {/* ─── SIDE DRAWER MODAL (DARK NAVY EXACT SCREENSHOT THEME) ─── */}
      <AppModal visible={drawerOpen} animationType="fade" transparent={true} statusBarTranslucent={Platform.OS === 'android'} onRequestClose={() => setDrawerOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setDrawerOpen(false)}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.drawerSheet}>
            <SafeAreaView style={styles.drawerSafeArea}>
              {/* ── 1. HEADER SECTION (Exact Screenshot) ── */}
              <View style={styles.drawerHeader}>
                <TouchableOpacity
                  style={styles.brandingContainer}
                  activeOpacity={isMultiClinic ? 0.7 : 1}
                  onPress={() => {
                    if (isMultiClinic) {
                      setClinicModalOpen(true);
                    }
                  }}>
                  <View style={styles.logoBadge}>
                    <Image
                      source={currentClinicLogoUrl && !drawerClinicLogoFailed
                        ? { uri: profilePhotoUrl(currentClinicLogoUrl) }
                        : require('../assets/images/logo.png')}
                      style={styles.clinicLogoImage}
                      resizeMode="contain"
                      onError={() => setDrawerClinicLogoFailed(true)}
                      accessibilityLabel={`${activeClinicName || 'Clinic'} logo`}
                    />
                  </View>
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.clinicTitle} numberOfLines={1}>
                      {sidebarDisplayTitle}
                    </Text>
                    <Text style={styles.roleSubtitle}>
                      {getRoleDisplayName(staffRole)} {isMultiClinic ? '▼' : ''}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuIconButton} onPress={() => setDrawerOpen(false)}>
                  <Menu color={colors.primary} size={18} />
                </TouchableOpacity>
              </View>

              {/* ── 2. SECTION TITLE ── */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {getRoleSectionLabel(staffRole)}
                </Text>
              </View>

              {/* ── 3. NAVIGATION MENU LIST ── */}
              <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
                <View style={styles.menuList}>
                  {menuItems.map((item, index) => {
                    const itemKey = item?.id ? `menu_${item.id}` : `menu_idx_${index}`;
                    if (item.isGroup && item.children) {
                      const isGroupActive = item.children.some((c) => c.id === activeTab);

                      return (
                        <View key={itemKey} style={styles.groupContainer}>
                          {/* Parent Group Header */}
                          <TouchableOpacity
                            activeOpacity={0.7}
                            style={[styles.menuItemRow, isGroupActive && styles.activeMenuItemRow]}
                            onPress={() => setUserRoleMgmtOpen(!userRoleMgmtOpen)}>
                            <View style={[styles.itemLeft, { minWidth: 0 }]}>
                              <View style={[styles.menuIconContainer, isGroupActive && styles.menuIconContainerActive]}>
                                <UserCog color={isGroupActive ? '#5EEAD4' : colors.primary} size={18} />
                              </View>
                              <Text
                                numberOfLines={2}
                                style={[styles.menuItemLabel, { flexShrink: 1 }, isGroupActive && styles.activeItemText]}>
                                {item.label}
                              </Text>
                            </View>
                            <View style={{ flexShrink: 0, marginLeft: spacing.sm }}>
                              {userRoleMgmtOpen ? (
                                <ChevronUp color={colors.subtle} size={16} />
                              ) : (
                                <ChevronDown color={colors.subtle} size={16} />
                              )}
                            </View>
                          </TouchableOpacity>

                          {/* Sub-items Tree */}
                          {userRoleMgmtOpen ? (
                            <View style={styles.subItemTreeContainer}>
                              <View style={styles.treeLine} />
                              <View style={styles.subItemsList}>
                                {item.children.map((child, cIdx) => {
                                  const childKey = child?.id ? `child_${child.id}` : `child_idx_${cIdx}`;
                                  const isChildActive = activeTab === child.id;
                                  return (
                                    <TouchableOpacity
                                      key={childKey}
                                      activeOpacity={0.7}
                                      style={[styles.subMenuItemRow, isChildActive && styles.activeSubMenuItemRow]}
                                      onPress={() => {
                                        navigateFromMenu(child.id);
                                      }}>
                                      <View style={[styles.subIconBadge, isChildActive && styles.subIconBadgeActive]}>
                                        {child.iconType === 'role_permissions' ? (
                                          <Shield color={isChildActive ? '#2DD4BF' : colors.primary} size={15} />
                                        ) : (
                                          <UserPlus color={isChildActive ? '#2DD4BF' : colors.primary} size={15} />
                                        )}
                                      </View>
                                      <Text style={[styles.subMenuItemLabel, isChildActive && styles.activeSubItemText]}>
                                        {child.label}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            </View>
                          ) : null}
                        </View>
                      );
                    }

                    const isActive = activeTab === item.id;
                    return (
                      <TouchableOpacity
                        key={itemKey}
                        activeOpacity={0.8}
                        style={[styles.menuItemRow, isActive && styles.activeMenuItemRow]}
                        onPress={() => {
                          navigateFromMenu(item.id as StaffTabType);
                        }}>
                        <View style={styles.itemLeft}>
                          <View style={[styles.menuIconContainer, isActive && styles.menuIconContainerActive]}>
                            {renderTabVectorIcon(item.id, isActive ? '#5EEAD4' : colors.primary, 18)}
                          </View>
                          <Text style={[styles.menuItemLabel, isActive && styles.activeItemText]}>
                            {item.label}
                          </Text>
                        </View>
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

              {/* ── 4. FOOTER / LOGOUT SECTION ── */}
              <View style={styles.footerSection}>
                <TouchableOpacity
                  style={styles.logoutButton}
                  activeOpacity={0.7}
                  onPress={() => {
                    setDrawerOpen(false);
                    logout();
                  }}>
                  <LogOut color={colors.primary} size={20} />
                  <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </AppModal>

      {/* ─── MULTI-CLINIC SELECTION MODAL ─── */}
      <AppModal visible={clinicModalOpen} animationType="slide" transparent={true} onRequestClose={() => setClinicModalOpen(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.clinicSelectBox}>
            <View style={styles.clinicModalHeader}>
              <Text style={styles.clinicModalTitle}>Select Active Clinic</Text>
              <TouchableOpacity onPress={() => setClinicModalOpen(false)} style={styles.closeBtn}>
                <X size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {assignedClinics.length > 0 ? (
                assignedClinics.map((clinic, index) => {
                  const isSelected = Number(clinic.id) === Number(activeClinicId);
                  const clinicKey = clinic?.id ? `clinic_${clinic.id}` : `clinic_idx_${index}`;
                  return (
                    <TouchableOpacity
                      key={clinicKey}
                      style={[styles.clinicOptionRow, isSelected && styles.clinicOptionRowSelected]}
                      onPress={() => handleSelectClinic(Number(clinic.id || index))}>
                      <Text style={[styles.clinicOptionText, isSelected && styles.clinicOptionTextSelected]}>
                        {clinic.name}
                      </Text>
                      {isSelected ? <Text style={styles.selectedCheck}>✓ Active</Text> : null}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={{ padding: spacing.lg }}>
                  <Text style={{ color: colors.muted }}>No assigned clinics found.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </AppModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  screenContainer: { flex: 1 },
  bottomTabBar: {
    flexDirection: 'row',
    height: 65,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    elevation: 10,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabItemCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  fabIcon: { color: colors.surface, fontSize: typography.size.title, fontWeight: 'bold' },
  fabLabel: { fontSize: typography.size.micro, color: colors.primary, fontWeight: typography.weight.bold, marginTop: 2 },
  tabIconWrapper: { position: 'relative' },
  tabLabel: { fontSize: typography.size.micro, fontWeight: typography.weight.semibold, color: colors.muted, marginTop: 2 },
  tabLabelActive: { color: colors.primary, fontWeight: typography.weight.extrabold },
  smallBadge: { position: 'absolute', top: -3, right: -6, backgroundColor: colors.destructive, borderRadius: radii.md, minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  smallBadgeText: { color: colors.surface, fontSize: 9, fontWeight: 'bold' },
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
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10, 15, 29, 0.6)' },
  drawerSheet: { width: '85%', maxWidth: 320, height: '100%', backgroundColor: '#0A0F1D', borderTopRightRadius: 16, borderBottomRightRadius: 16, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, elevation: 20 },
  drawerSafeArea: { flex: 1 },
  
  // Header (Exact Match)
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  brandingContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  logoBadge: { width: 48, height: 48, borderRadius: radii.lg, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md, overflow: 'hidden' },
  clinicLogoImage: { width: 40, height: 40 },
  headerTextContainer: { flex: 1 },
  clinicTitle: { color: colors.surface, fontSize: 15, fontWeight: typography.weight.bold },
  roleSubtitle: { color: colors.subtle, fontSize: typography.size.sm, marginTop: 2, textTransform: 'capitalize' },
  menuIconButton: { width: 36, height: 36, borderRadius: radii.md, borderWidth: 1, borderColor: colors.foreground, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  closeBtn: { padding: spacing.tiny },

  // Section Header
  sectionHeader: { marginBottom: 10, paddingLeft: spacing.xs },
  sectionTitle: { color: '#2DD4BF', fontSize: typography.size.sm, fontWeight: typography.weight.extrabold, letterSpacing: 1.5 },

  // ScrollArea & Menu List
  scrollArea: { flex: 1 },
  menuList: { gap: spacing.xs, marginBottom: spacing.xl },
  menuItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: radii.lg, marginBottom: spacing.xs },
  activeMenuItemRow: { backgroundColor: 'rgba(13, 148, 136, 0.15)', borderWidth: 1.5, borderColor: colors.primary },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuIconContainer: { width: 32, height: 32, borderRadius: radii.md, backgroundColor: 'rgba(15, 30, 46, 0.7)', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  menuIconContainerActive: { backgroundColor: colors.primary },
  menuItemLabel: { fontSize: typography.size.body, fontWeight: typography.weight.medium, color: colors.border },
  activeItemText: { color: colors.surface, fontWeight: typography.weight.bold },
  itemBadge: { backgroundColor: colors.primary, borderRadius: radii.md, paddingHorizontal: 7, paddingVertical: 2 },
  itemBadgeText: { color: colors.surface, fontSize: typography.size.xs, fontWeight: 'bold' },

  // Sub-items Tree (Exact Match)
  groupContainer: { marginBottom: spacing.xs },
  subItemTreeContainer: { flexDirection: 'row', paddingLeft: spacing.xxl, marginTop: spacing.xs, marginBottom: spacing.tiny },
  treeLine: { width: 1, backgroundColor: colors.foreground, marginRight: spacing.lg },
  subItemsList: { flex: 1 },
  subMenuItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: 10, borderRadius: radii.md, marginBottom: spacing.xs },
  activeSubMenuItemRow: { backgroundColor: 'rgba(13, 148, 136, 0.2)' },
  subIconBadge: { width: 28, height: 28, borderRadius: radii.md, backgroundColor: 'rgba(15, 23, 42, 0.8)', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  subIconBadgeActive: { backgroundColor: colors.primary },
  subMenuItemLabel: { color: colors.input, fontSize: typography.size.caption, fontWeight: typography.weight.medium },
  activeSubItemText: { color: '#2DD4BF', fontWeight: typography.weight.bold },

  // Footer Section (Exact Match)
  footerSection: { borderTopWidth: 1, borderTopColor: colors.foreground, paddingTop: 14, marginTop: spacing.tiny, marginBottom: spacing.xl },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827', borderRadius: radii.md, paddingVertical: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.foreground },
  logoutText: { color: colors.border, fontSize: typography.size.body, fontWeight: typography.weight.bold },

  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  clinicSelectBox: { width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: radii.xl, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 10 },
  clinicModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.secondary },
  clinicModalTitle: { fontSize: typography.size.subtitle, fontWeight: typography.weight.extrabold, color: colors.text },
  clinicOptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: 14, borderRadius: radii.md, marginBottom: spacing.tiny, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  clinicOptionRowSelected: { backgroundColor: '#f0fdf4', borderColor: colors.success },
  clinicOptionText: { fontSize: typography.size.body, fontWeight: typography.weight.semibold, color: colors.foreground },
  clinicOptionTextSelected: { fontWeight: typography.weight.extrabold, color: '#166534' },
  selectedCheck: { fontSize: typography.size.sm, fontWeight: typography.weight.extrabold, color: colors.success },
});

export default StaffMainContainer;
