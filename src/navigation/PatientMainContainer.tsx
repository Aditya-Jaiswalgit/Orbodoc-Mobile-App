import React, { useState } from 'react';
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
  DrawerCalendarIcon,
  DrawerCreditCardIcon,
  DrawerFlaskIcon,
  DrawerGridIcon,
  DrawerLogoutIcon,
  DrawerUsersIcon,
  DrawerVideoIcon,
  LabTubeIcon,
  MedicinePillIcon,
  PatientUserIcon,
  VideoCamIcon,
} from '../components/common/CustomIcons';
import { useAuthContext } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { PatientDashboardScreen } from '../screens/dashboards/PatientDashboardScreen';
import AppointmentsScreen from '../screens/patient/AppointmentsScreen';
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
      return <DrawerGridIcon color={color} size={size} />;
    case 'book_appointment':
    case 'appointments':
      return <DrawerCalendarIcon color={color} size={size} />;
    case 'patients':
    case 'profile':
      return <DrawerUsersIcon color={color} size={size} />;
    case 'treatment_billing':
    case 'medicine_billing':
      return <DrawerCreditCardIcon color={color} size={size} />;
    case 'video_services':
      return <DrawerVideoIcon color={color} size={size} />;
    case 'lab_tests':
      return <DrawerFlaskIcon color={color} size={size} />;
    case 'notifications':
      return <DrawerBellIcon color={color} size={size} />;
    default:
      return <DrawerGridIcon color={color} size={size} />;
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
      return <BillingCardIcon color={color} size={size} />;
    case 'medicine_billing':
      return <MedicinePillIcon color={color} size={size} />;
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
  const { user, logout } = useAuthContext();
  const { unreadCount } = useNotifications();

  const patientName = user?.fullName || user?.full_name || 'bulbul';

  const MENU_ITEMS: MenuItem[] = [
    { id: 'dashboard', label: 'Patient Dashboard' },
    { id: 'book_appointment', label: 'Book Appointment' },
    { id: 'patients', label: 'Patients' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'treatment_billing', label: 'Treatment Billing' },
    { id: 'medicine_billing', label: 'Medicine Billing' },
    { id: 'video_services', label: 'Video Services' },
    { id: 'lab_tests', label: 'Lab Tests' },
    { id: 'notifications', label: 'Notifications' },
  ];

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
        return <BookAppointmentScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} />;
      case 'patients':
        return <PatientsScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} />;
      case 'appointments':
        return <AppointmentsScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} />;
      case 'treatment_billing':
        return <TreatmentBillingScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} />;
      case 'medicine_billing':
        return <MedicineBillingScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} />;
      case 'video_services':
        return <VideoServicesScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} />;
      case 'lab_tests':
        return <LabTestsScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} />;
      case 'notifications':
        return <NotificationsScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} />;
      case 'profile':
        return <PatientsProfileScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} />;
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
      {!drawerOpen && (
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
              <Text style={styles.fabIcon}>☰</Text>
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
                    <Text style={styles.darkCloseBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Uppercase Category Label */}
                <Text style={styles.categoryTitleText}>PATIENT</Text>

                {/* Navigation Menu Links */}
                <View style={styles.menuList}>
                  {MENU_ITEMS.map((item) => {
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
                          {renderDrawerIcon(
                            item.id,
                            isActive ? '#ffffff' : '#2dd4bf',
                            20
                          )}
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
                <DrawerLogoutIcon color="#2dd4bf" size={22} />
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
    width: '75%',
    maxWidth: 300,
    height: '100%',
    backgroundColor: '#071624',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 50,
    paddingBottom: Platform.OS === 'android' ? 24 : 36,
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
    marginBottom: 16,
    marginTop: 4,
  },
  logoSquircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
    padding: 3,
  },
  logoImage: {
    width: 38,
    height: 38,
  },
  userCol: {
    flex: 1,
    justifyContent: 'center',
  },
  userNameText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  userRoleText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  darkCloseBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#0c273e',
    borderWidth: 1,
    borderColor: '#193b58',
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
    letterSpacing: 1.5,
    marginTop: 14,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  menuList: {
    gap: 2,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: 2,
  },
  menuItemRowActive: {
    backgroundColor: 'rgba(13, 148, 136, 0.14)',
    borderColor: '#0d9488',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  menuIconContainerActive: {
    backgroundColor: '#0d9488',
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  menuItemLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  drawerLogoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 12,
  },
  drawerLogoutText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default PatientMainContainer;
