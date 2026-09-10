import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  BellNotificationIcon,
  BillingCardIcon,
  CalendarIcon,
  DashboardIcon,
  DrawerBellIcon,
  DrawerCreditCardIcon,
  DrawerLogoutIcon,
  DrawerUsersIcon,
  DrawerVideoIcon,
  LabTubeIcon,
  MedicinePillIcon,
  PatientUserIcon,
  ReceiptIcon,
  VideoCamIcon,
} from '../components/common/CustomIcons';
import { Menu, X } from 'lucide-react-native';
import { useAuthContext } from '../context/AuthContext';
import { getMobileMenuItems } from './mobileMenu';
import { useNotifications } from '../hooks/useNotifications';
import { PatientDashboardScreen } from '../screens/dashboards/PatientDashboardScreen';
import PatientAppointmentsManagerScreen from '../screens/patient/PatientAppointmentsManagerScreen';
import BookAppointmentScreen from '../screens/patient/BookAppointmentScreen';
import LabTestsScreen from '../screens/patient/LabTestsScreen';
import MedicineBillingScreen from '../screens/patient/MedicineBillingScreen';
import NotificationsScreen from '../screens/patient/NotificationsScreen';
import PatientsProfileScreen from '../screens/patient/PatientsProfileScreen';
import PatientsScreen from '../screens/patient/PatientsScreen';
import TreatmentBillingScreen from '../screens/patient/TreatmentBillingScreen';
import VideoServicesScreen from '../screens/patient/VideoServicesScreen';

export type PatientTabType =
  | 'dashboard'
  | 'book_appointment'
  | 'patients'
  | 'appointments'
  | 'treatment_billing'
  | 'medicine_billing'
  | 'video_services'
  | 'lab_tests'
  | 'notifications'
  | 'profile';

interface MenuItem {
  id: PatientTabType;
  label: string;
  badge?: number;
}

const renderDrawerIcon = (id: string, color: string, size: number = 20) => {
  switch (id) {
    case 'dashboard':
      return <DashboardIcon color={color} size={size} />;
    case 'book_appointment':
    case 'appointments':
      return <CalendarIcon color={color} size={size} />;
    case 'patients':
    case 'profile':
      return <DrawerUsersIcon color={color} size={size} />;
    case 'treatment_billing':
    case 'medicine_billing':
      return <DrawerCreditCardIcon color={color} size={size} />;
    case 'video_services':
      return <DrawerVideoIcon color={color} size={size} />;
    case 'lab_tests':
      return <LabTubeIcon color={color} size={size} />;
    case 'notifications':
      return <DrawerBellIcon color={color} size={size} />;
    default:
      return <DashboardIcon color={color} size={size} />;
  }
};

const renderTabVectorIcon = (tab: PatientTabType, color: string, size: number = 20) => {
  switch (tab) {
    case 'dashboard':
      return <DashboardIcon color={color} size={size} />;
    case 'book_appointment':
    case 'appointments':
      return <CalendarIcon color={color} size={size} />;
    case 'patients':
    case 'profile':
      return <PatientUserIcon color={color} size={size} />;
    case 'treatment_billing':
    case 'medicine_billing':
      return <ReceiptIcon color={color} size={size} strokeWidth={2} />;
    case 'video_services':
      return <VideoCamIcon color={color} size={size} />;
    case 'lab_tests':
      return <LabTubeIcon color={color} size={size} />;
    case 'notifications':
      return <BellNotificationIcon color={color} size={size} />;
    default:
      return <DashboardIcon color={color} size={size} />;
  }
};

export const PatientMainContainer = () => {
  const [activeTab, setActiveTab] = useState<PatientTabType>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, logout, permissions } = useAuthContext();
  const { unreadCount } = useNotifications();

  const patientName = user?.fullName || user?.full_name || 'Patient';

  const menuItems = useMemo(
    () => getMobileMenuItems('patient', permissions) as MenuItem[],
    [permissions],
  );

  const [hideBottomBar, setHideBottomBar] = useState<boolean>(false);

  const openDrawer = () => setDrawerOpen(true);
  const openNotifications = () => setActiveTab('notifications');
  const openProfile = () => setActiveTab('profile');

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <PatientDashboardScreen
            onOpenDrawer={openDrawer}
            onOpenNotifications={openNotifications}
            onNavigateProfile={openProfile}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
          />
        );
      case 'book_appointment':
        return <BookAppointmentScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onToggleTabBar={setHideBottomBar} />;
      case 'patients':
        return <PatientsScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onToggleTabBar={setHideBottomBar} />;
      case 'appointments':
        return (
          <PatientAppointmentsManagerScreen
            onOpenDrawer={openDrawer}
            onOpenNotifications={openNotifications}
            onToggleTabBar={setHideBottomBar}
            onNavigateScreen={(screen) => setActiveTab(screen as PatientTabType)}
          />
        );
      case 'treatment_billing':
        return <TreatmentBillingScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onToggleTabBar={setHideBottomBar} />;
      case 'medicine_billing':
        return <MedicineBillingScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onToggleTabBar={setHideBottomBar} />;
      case 'video_services':
        return <VideoServicesScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onToggleTabBar={setHideBottomBar} />;
      case 'lab_tests':
        return <LabTestsScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onToggleTabBar={setHideBottomBar} />;
      case 'notifications':
        return <NotificationsScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onToggleTabBar={setHideBottomBar} />;
      case 'profile':
        return <PatientsProfileScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onToggleTabBar={setHideBottomBar} />;
      default:
        return (
          <PatientDashboardScreen
            onOpenDrawer={openDrawer}
            onOpenNotifications={openNotifications}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Dynamic Screen Content */}
      <View style={styles.screenContainer}>{renderActiveScreen()}</View>

      {/* Bottom Tab Bar */}
      {!hideBottomBar && !drawerOpen && (
        <View style={styles.bottomTabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('dashboard')}>
            <View style={styles.tabIconWrapper}>
              {renderTabVectorIcon('dashboard', activeTab === 'dashboard' ? '#0d9488' : '#94a3b8', 21)}
            </View>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'dashboard' && styles.tabLabelActive,
              ]}>
              Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('book_appointment')}>
            <View style={styles.tabIconWrapper}>
              {renderTabVectorIcon('book_appointment', activeTab === 'book_appointment' ? '#0d9488' : '#94a3b8', 21)}
            </View>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'book_appointment' && styles.tabLabelActive,
              ]}>
              Book
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItemCenter}
            onPress={() => setDrawerOpen(true)}>
            <View style={styles.centerFab}>
              <Menu color="#ffffff" size={23} strokeWidth={2.7} />
            </View>
            <Text style={styles.fabLabel}>Menu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('treatment_billing')}>
            <View style={styles.tabIconWrapper}>
              {renderTabVectorIcon(
                'treatment_billing',
                activeTab === 'treatment_billing' || activeTab === 'medicine_billing' ? '#0d9488' : '#94a3b8',
                21
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                (activeTab === 'treatment_billing' || activeTab === 'medicine_billing') && styles.tabLabelActive,
              ]}>
              Billing
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('notifications')}>
            <View style={styles.tabIconWrapper}>
              {renderTabVectorIcon('notifications', activeTab === 'notifications' ? '#0d9488' : '#94a3b8', 21)}
              {unreadCount > 0 && (
                <View style={styles.smallBadge}>
                  <Text style={styles.smallBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'notifications' && styles.tabLabelActive,
              ]}>
              Alerts
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Side Drawer Menu Modal */}
      <Modal
        visible={drawerOpen}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setDrawerOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setDrawerOpen(false)}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.drawerSheet}>
            <View style={styles.drawerInner}>
              <View style={styles.drawerTopSection}>
                {/* Top Profile + Close Row */}
                <View style={styles.drawerTopHeaderRow}>
                  <View style={styles.logoSquircle}>
                    <Image
                      source={require('../assets/images/logo.png')}
                      style={styles.logoImage}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.userCol}>
                    <Text style={styles.userNameText} numberOfLines={1}>
                      {patientName}
                    </Text>
                    <Text style={styles.userRoleText}>Patient</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setDrawerOpen(false)}
                    style={styles.darkCloseBtn}
                    activeOpacity={0.7}>
                    <X color="#20e3d3" size={19} strokeWidth={2.25} />
                  </TouchableOpacity>
                </View>

                {/* Uppercase Category Label */}
                <Text style={styles.categoryTitleText}>PATIENT</Text>

                {/* Navigation Menu Links */}
                <View style={styles.menuList}>
                  {menuItems.map((item) => {
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
                          {renderDrawerIcon(item.id, '#20d8cb', 17)}
                        </View>

                        <Text
                          style={[
                            styles.menuItemLabel,
                            isActive && styles.menuItemLabelActive,
                          ]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Logout Item Row pinned at bottom */}
              <TouchableOpacity
                style={styles.drawerLogoutRow}
                activeOpacity={0.7}
                onPress={() => {
                  setDrawerOpen(false);
                  logout();
                }}>
                <View style={styles.logoutIconContainer}>
                  <DrawerLogoutIcon color="#20d8cb" size={17} />
                </View>
                <Text style={styles.drawerLogoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingMenuIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomTabBar: {
    flexDirection: 'row',
    height: 65,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    elevation: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  fabIcon: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  fabLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  tabIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabEmoji: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#0d9488',
    fontWeight: '700',
  },
  smallBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  smallBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  drawerSheet: {
    width: '70%',
    maxWidth: 255,
    height: '100%',
    backgroundColor: '#071827',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 16,
    paddingBottom: Platform.OS === 'android' ? 12 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 25,
  },
  drawerInner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  drawerTopSection: {
    flex: 1,
  },
  drawerTopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 0,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.13)',
  },
  logoSquircle: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    overflow: 'hidden',
    padding: 3,
  },
  logoImage: {
    width: 36,
    height: 36,
  },
  userCol: {
    flex: 1,
    justifyContent: 'center',
  },
  userNameText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0,
  },
  userRoleText: {
    color: '#aab8c6',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  darkCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#0a2738',
    borderWidth: 1,
    borderColor: '#174153',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkCloseBtnText: {
    color: '#2dd4bf',
    fontSize: 17,
    fontWeight: 'bold',
  },
  categoryTitleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2dd4bf',
    letterSpacing: 1.4,
    marginTop: 2,
    marginBottom: 9,
    paddingHorizontal: 8,
  },
  menuList: {
    gap: 2,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 7,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 1,
  },
  menuItemRowActive: {
    backgroundColor: 'rgba(7, 93, 104, 0.46)',
    borderColor: 'rgba(24, 202, 190, 0.48)',
    borderLeftWidth: 3,
    borderLeftColor: '#14d9ca',
  },
  menuIconContainer: {
    width: 27,
    height: 27,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
    backgroundColor: '#082b3a',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.08)',
    shadowColor: '#2dd4bf',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.38,
    shadowRadius: 6,
    elevation: 4,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 9px rgba(20, 235, 216, 0.28)' } as any) : {}),
  },
  menuIconContainerActive: {
    backgroundColor: 'rgba(10, 129, 135, 0.47)',
    shadowColor: '#2dd4bf',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.72,
    shadowRadius: 8,
    elevation: 6,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 12px rgba(20, 235, 216, 0.48)' } as any) : {}),
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#c9d5df',
  },
  menuItemLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  drawerLogoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 7,
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.12)',
  },
  logoutIconContainer: {
    width: 27,
    height: 27,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#082b3a',
    borderWidth: 0,
    shadowColor: '#2dd4bf',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.38,
    shadowRadius: 6,
    elevation: 4,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 9px rgba(20, 235, 216, 0.28)' } as any) : {}),
  },
  drawerLogoutText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default PatientMainContainer;
