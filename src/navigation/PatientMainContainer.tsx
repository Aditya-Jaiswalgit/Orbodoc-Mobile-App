import React, { useState } from 'react';
import {
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
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
  LabTubeIcon,
  MedicinePillIcon,
  PatientUserIcon,
  VideoCamIcon,
} from '../components/common/CustomIcons';
import { useAuthContext } from '../context/AuthContext';
import { PatientDashboardScreen } from '../screens/dashboards/PatientDashboardScreen';
import AppointmentsScreen from '../screens/patient/AppointmentsScreen';
import BookAppointmentScreen from '../screens/patient/BookAppointmentScreen';
import LabTestsScreen from '../screens/patient/LabTestsScreen';
import MedicineBillingScreen from '../screens/patient/MedicineBillingScreen';
import NotificationsScreen from '../screens/patient/NotificationsScreen';
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
  | 'notifications';

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
      return <DashboardIcon color={color} size={size} />;
    case 'book_appointment':
    case 'appointments':
      return <CalendarIcon color={color} size={size} />;
    case 'patients':
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

  const patientName = user?.fullName || user?.full_name || 'Patient';
  const initial = patientName.charAt(0).toUpperCase();

  const openDrawer = () => setDrawerOpen(true);
  const openNotifications = () => setActiveTab('notifications');

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <PatientDashboardScreen
            onOpenDrawer={openDrawer}
            onOpenNotifications={openNotifications}
          />
        );
      case 'book_appointment':
        return <BookAppointmentScreen onOpenDrawer={openDrawer} />;
      case 'patients':
        return <PatientsScreen onOpenDrawer={openDrawer} />;
      case 'appointments':
        return <AppointmentsScreen onOpenDrawer={openDrawer} />;
      case 'treatment_billing':
        return <TreatmentBillingScreen onOpenDrawer={openDrawer} />;
      case 'medicine_billing':
        return <MedicineBillingScreen onOpenDrawer={openDrawer} />;
      case 'video_services':
        return <VideoServicesScreen onOpenDrawer={openDrawer} />;
      case 'lab_tests':
        return <LabTestsScreen onOpenDrawer={openDrawer} />;
      case 'notifications':
        return <NotificationsScreen onOpenDrawer={openDrawer} />;
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
            <View style={styles.smallBadge}>
              <Text style={styles.smallBadgeText}>4</Text>
            </View>
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

      {/* Side Drawer Menu Modal */}
      <Modal
        visible={drawerOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDrawerOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setDrawerOpen(false)}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.drawerSheet}>
            <SafeAreaView style={styles.drawerSafeArea}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header Category Tag */}
                <View style={styles.drawerHeader}>
                  <Text style={styles.categoryTitle}>PATIENT</Text>
                  <TouchableOpacity
                    onPress={() => setDrawerOpen(false)}
                    style={styles.closeBtn}>
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Patient Info Box */}
                <View style={styles.patientInfoCard}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarLetter}>{initial}</Text>
                  </View>
                  <View style={styles.patientNameCol}>
                    <Text style={styles.patientNameText}>{patientName}</Text>
                    <Text style={styles.patientSubText}>Patient Account</Text>
                  </View>
                </View>

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
                          {renderTabVectorIcon(
                            item.id,
                            isActive ? '#ffffff' : '#14b8a6',
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

                {/* Logout Button */}
                <TouchableOpacity
                  style={styles.logoutBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    setDrawerOpen(false);
                    logout();
                  }}>
                  <Text style={styles.logoutBtnIcon}>🚪</Text>
                  <Text style={styles.logoutBtnText}>Logout Account</Text>
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
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
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  fabIcon: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  fabLabel: {
    fontSize: 10,
    color: '#0d9488',
    fontWeight: '700',
    marginTop: 2,
  },
  tabIconWrapper: {
    position: 'relative',
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#0d9488',
    fontWeight: '800',
  },
  smallBadge: {
    position: 'absolute',
    top: -3,
    right: -6,
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
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 36) + 56 : 90,
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
    backgroundColor: '#071624',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 20,
  },
  drawerSafeArea: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#14b8a6',
    letterSpacing: 1.5,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  patientInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f2942',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  patientNameCol: {
    flex: 1,
  },
  patientNameText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  patientSubText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  menuList: {
    gap: 6,
    marginBottom: 24,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  menuItemRowActive: {
    backgroundColor: '#0f2f4a',
    borderWidth: 1,
    borderColor: '#0d9488',
  },
  menuIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#0f2338',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuIconContainerActive: {
    backgroundColor: '#0d9488',
  },
  menuItemEmoji: {
    fontSize: 16,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  menuItemLabelActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  itemBadge: {
    backgroundColor: '#0d9488',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  itemBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 10,
    marginBottom: 30,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logoutBtnIcon: {
    fontSize: 16,
  },
  logoutBtnText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default PatientMainContainer;
