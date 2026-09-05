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
} from '../components/common/CustomIcons';
import { useAuthContext } from '../context/AuthContext';

import AccountantDashboardScreen from '../screens/dashboards/AccountantDashboardScreen';
import ClinicAdminDashboardScreen from '../screens/dashboards/ClinicAdminDashboardScreen';
import DoctorDashboardScreen from '../screens/dashboards/DoctorDashboardScreen';
import LabTechnicianDashboardScreen from '../screens/dashboards/LabTechnicianDashboardScreen';
import NurseDashboardScreen from '../screens/dashboards/NurseDashboardScreen';
import PharmacistDashboardScreen from '../screens/dashboards/PharmacistDashboardScreen';
import ReceptionistDashboardScreen from '../screens/dashboards/ReceptionistDashboardScreen';
import SuperAdminDashboardScreen from '../screens/dashboards/SuperAdminDashboardScreen';

import AppointmentsManagerScreen from '../screens/staff/AppointmentsManagerScreen';
import AuditLogsScreen from '../screens/staff/AuditLogsScreen';
import BookAppointmentScreen from '../screens/patient/BookAppointmentScreen';
import ClinicsManagementScreen from '../screens/staff/ClinicsManagementScreen';
import LabInventoryScreen from '../screens/staff/LabInventoryScreen';
import LabManagementScreen from '../screens/staff/LabManagementScreen';
import MedicineBillingScreen from '../screens/staff/MedicineBillingScreen';
import NotificationsCenterScreen from '../screens/staff/NotificationsCenterScreen';
import PatientsManagementScreen from '../screens/staff/PatientsManagementScreen';
import PharmacyInventoryScreen from '../screens/staff/PharmacyInventoryScreen';
import PrescriptionsScreen from '../screens/staff/PrescriptionsScreen';
import StaffManagementScreen from '../screens/staff/StaffManagementScreen';
import TreatmentBillingScreen from '../screens/staff/TreatmentBillingScreen';
import VideoServicesScreen from '../screens/staff/VideoServicesScreen';

export type StaffTabType =
  | 'dashboard'
  | 'clinics'
  | 'staff'
  | 'patients'
  | 'appointments'
  | 'book_appointment'
  | 'video_services'
  | 'prescriptions'
  | 'pharmacy_inventory'
  | 'medicine_billing'
  | 'treatment_billing'
  | 'lab_management'
  | 'lab_inventory'
  | 'audit_logs'
  | 'notifications';

interface MenuItem {
  id: StaffTabType;
  label: string;
  badge?: number;
}

const resolveStaffRole = (user: any): string => {
  if (!user) return 'clinic_admin';

  const rawRole = String(
    user.roleName ||
    user.role_name ||
    user.role ||
    ''
  ).toLowerCase().trim();

  const isDocFlag =
    user.is_doctor === 1 ||
    user.is_doctor === '1' ||
    user.is_doctor === true ||
    user.isDoctor === true ||
    (user.fullName && user.fullName.trim().toLowerCase().startsWith('dr')) ||
    (user.full_name && user.full_name.trim().toLowerCase().startsWith('dr')) ||
    Boolean(user.specialization || user.qualification);

  const isAdminFlag =
    rawRole.includes('clinic_admin') ||
    rawRole.includes('clinicadmin') ||
    rawRole.includes('admin') ||
    rawRole.includes('owner');

  if (rawRole.includes('super_admin') || rawRole.includes('superadmin')) {
    return 'super_admin';
  }

  if (isAdminFlag && isDocFlag) {
    return 'admin_doctor';
  }

  if (rawRole.includes('doctor') || rawRole.includes('physician') || isDocFlag) {
    return 'doctor';
  }

  if (isAdminFlag) {
    return 'clinic_admin';
  }

  if (rawRole.includes('reception')) {
    return 'receptionist';
  }

  if (rawRole.includes('pharm')) {
    return 'pharmacist';
  }

  if (rawRole.includes('lab')) {
    return 'lab_technician';
  }

  if (rawRole.includes('account') || rawRole.includes('finance')) {
    return 'accountant';
  }

  if (rawRole.includes('nurse')) {
    return 'nurse';
  }

  return rawRole || 'clinic_admin';
};

export const StaffMainContainer = () => {
  const { user, logout } = useAuthContext();
  const staffRole = resolveStaffRole(user);

  const [activeTab, setActiveTab] = useState<StaffTabType>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hideBottomBar, setHideBottomBar] = useState(false);

  const staffName = user?.fullName || user?.full_name || 'Staff User';
  const initial = staffName.charAt(0).toUpperCase();

  const openDrawer = () => setDrawerOpen(true);
  const openNotifications = () => setActiveTab('notifications');

  const getMenuItemsForRole = (role: string): MenuItem[] => {
    switch (role) {
      case 'super_admin':
        return [
          { id: 'dashboard', label: 'Super Admin Dashboard' },
          { id: 'clinics', label: 'Tenant Clinics' },
          { id: 'staff', label: 'Staff Management' },
          { id: 'patients', label: 'Patients Directory' },
          { id: 'audit_logs', label: 'Audit Trail Logs' },
          { id: 'notifications', label: 'Notifications', badge: 3 },
        ];
      case 'admin_doctor':
        return [
          { id: 'dashboard', label: 'Doctor Workspace' },
          { id: 'appointments', label: 'Patient Consultations' },
          { id: 'prescriptions', label: 'Prescription Creator' },
          { id: 'staff', label: 'Manage Staff' },
          { id: 'patients', label: 'Patients Directory' },
          { id: 'treatment_billing', label: 'Treatment Billing' },
          { id: 'medicine_billing', label: 'Medicine Billing' },
          { id: 'pharmacy_inventory', label: 'Pharmacy Inventory' },
          { id: 'lab_management', label: 'Lab Reports' },
          { id: 'audit_logs', label: 'Audit Trail' },
          { id: 'notifications', label: 'Notifications', badge: 3 },
        ];
      case 'clinic_admin':
        return [
          { id: 'dashboard', label: 'Clinic Dashboard' },
          { id: 'staff', label: 'Manage Staff' },
          { id: 'patients', label: 'Patients Directory' },
          { id: 'appointments', label: 'Appointments Desk' },
          { id: 'treatment_billing', label: 'Treatment Billing' },
          { id: 'medicine_billing', label: 'Medicine Billing' },
          { id: 'pharmacy_inventory', label: 'Pharmacy Inventory' },
          { id: 'audit_logs', label: 'Audit Trail' },
          { id: 'notifications', label: 'Notifications', badge: 3 },
        ];
      case 'doctor':
        return [
          { id: 'dashboard', label: 'Doctor Dashboard' },
          { id: 'patients', label: 'Patients' },
          { id: 'appointments', label: 'Appointments' },
          { id: 'video_services', label: 'Video Services' },
          { id: 'treatment_billing', label: 'Treatment Billing' },
          { id: 'pharmacy_inventory', label: 'Medicines' },
          { id: 'prescriptions', label: 'Prescriptions (Rx)' },
          { id: 'lab_management', label: 'Lab Tests' },
          { id: 'lab_inventory', label: 'Lab Inventory' },
          { id: 'notifications', label: 'Notifications', badge: 3 },
        ];
      case 'receptionist':
        return [
          { id: 'dashboard', label: 'Reception Dashboard' },
          { id: 'book_appointment', label: 'Book Appointment' },
          { id: 'appointments', label: 'Appointment Queue' },
          { id: 'patients', label: 'Patient Registration' },
          { id: 'notifications', label: 'Notifications', badge: 3 },
        ];
      case 'pharmacist':
        return [
          { id: 'dashboard', label: 'Pharmacy Hub' },
          { id: 'pharmacy_inventory', label: 'Medicine Stock' },
          { id: 'medicine_billing', label: 'Medicine Bills' },
          { id: 'notifications', label: 'Notifications', badge: 3 },
        ];
      case 'lab_technician':
        return [
          { id: 'dashboard', label: 'Lab Hub' },
          { id: 'lab_management', label: 'Lab Test Board' },
          { id: 'notifications', label: 'Notifications', badge: 3 },
        ];
      case 'accountant':
        return [
          { id: 'dashboard', label: 'Finance Hub' },
          { id: 'treatment_billing', label: 'Treatment Bills' },
          { id: 'medicine_billing', label: 'Medicine Bills' },
          { id: 'notifications', label: 'Notifications', badge: 3 },
        ];
      case 'nurse':
        return [
          { id: 'dashboard', label: 'Nurse Station' },
          { id: 'patients', label: 'Vitals Check-in' },
          { id: 'appointments', label: 'Appointments Queue' },
          { id: 'notifications', label: 'Notifications', badge: 3 },
        ];
      default:
        return [
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'patients', label: 'Patients' },
          { id: 'appointments', label: 'Appointments' },
          { id: 'notifications', label: 'Notifications', badge: 3 },
        ];
    }
  };

  const menuItems = getMenuItemsForRole(staffRole);

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        switch (staffRole) {
          case 'super_admin':
            return <SuperAdminDashboardScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={(scr) => setActiveTab(scr as any)} />;
          case 'clinic_admin':
            return <ClinicAdminDashboardScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={(scr) => setActiveTab(scr as any)} />;
          case 'admin_doctor':
          case 'doctor':
            return <DoctorDashboardScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={(scr) => setActiveTab(scr as any)} />;
          case 'receptionist':
            return <ReceptionistDashboardScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={(scr) => setActiveTab(scr as any)} />;
          case 'pharmacist':
            return <PharmacistDashboardScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={(scr) => setActiveTab(scr as any)} />;
          case 'lab_technician':
            return <LabTechnicianDashboardScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={(scr) => setActiveTab(scr as any)} />;
          case 'accountant':
            return <AccountantDashboardScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={(scr) => setActiveTab(scr as any)} />;
          case 'nurse':
            return <NurseDashboardScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={(scr) => setActiveTab(scr as any)} />;
          default:
            return <ClinicAdminDashboardScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={(scr) => setActiveTab(scr as any)} />;
        }
      case 'clinics':
        return <ClinicsManagementScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} />;
      case 'staff':
        return <StaffManagementScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} />;
      case 'patients':
        return <PatientsManagementScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} />;
      case 'appointments':
        return <AppointmentsManagerScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={(scr) => setActiveTab(scr as any)} />;
      case 'book_appointment':
        return <BookAppointmentScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} />;
      case 'video_services':
        return <VideoServicesScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={(scr) => setActiveTab(scr as any)} />;
      case 'prescriptions':
        return <PrescriptionsScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} />;
      case 'pharmacy_inventory':
        return <PharmacyInventoryScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} />;
      case 'medicine_billing':
        return <MedicineBillingScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} />;
      case 'treatment_billing':
        return <TreatmentBillingScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} />;
      case 'lab_management':
        return <LabManagementScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onToggleTabBar={setHideBottomBar} />;
      case 'lab_inventory':
        return <LabInventoryScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onToggleTabBar={setHideBottomBar} />;
      case 'audit_logs':
        return <AuditLogsScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} />;
      case 'notifications':
        return <NotificationsCenterScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onToggleTabBar={setHideBottomBar} />;
      default:
        return <ClinicAdminDashboardScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={(scr) => setActiveTab(scr as any)} />;
    }
  };

  const renderTabVectorIcon = (tab: StaffTabType, color: string, size: number = 20) => {
    switch (tab) {
      case 'dashboard':
        return <DashboardIcon color={color} size={size} />;
      case 'book_appointment':
      case 'appointments':
      case 'video_services':
        return <CalendarIcon color={color} size={size} />;
      case 'clinics':
      case 'staff':
      case 'patients':
        return <PatientUserIcon color={color} size={size} />;
      case 'treatment_billing':
      case 'medicine_billing':
        return <BillingCardIcon color={color} size={size} />;
      case 'pharmacy_inventory':
      case 'prescriptions':
        return <MedicinePillIcon color={color} size={size} />;
      case 'lab_management':
      case 'lab_inventory':
        return <LabTubeIcon color={color} size={size} />;
      case 'notifications':
        return <BellNotificationIcon color={color} size={size} />;
      default:
        return <DashboardIcon color={color} size={size} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenContainer}>{renderActiveScreen()}</View>

      {/* ─── STAFF BOTTOM TAB BAR ─── */}
      {!hideBottomBar && (
        <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('dashboard')}>
          <View style={styles.tabIconWrapper}>
            {renderTabVectorIcon('dashboard', activeTab === 'dashboard' ? '#0d9488' : '#94a3b8', 21)}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'dashboard' && styles.tabLabelActive]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            if (staffRole === 'doctor') setActiveTab('prescriptions');
            else if (staffRole === 'pharmacist') setActiveTab('pharmacy_inventory');
            else if (staffRole === 'lab_technician') setActiveTab('lab_management');
            else if (staffRole === 'receptionist') setActiveTab('book_appointment');
            else setActiveTab('appointments');
          }}>
          <View style={styles.tabIconWrapper}>
            {renderTabVectorIcon('appointments', (activeTab === 'appointments' || activeTab === 'prescriptions' || activeTab === 'pharmacy_inventory' || activeTab === 'lab_management') ? '#0d9488' : '#94a3b8', 21)}
          </View>
          <Text style={[styles.tabLabel, (activeTab === 'appointments' || activeTab === 'prescriptions' || activeTab === 'pharmacy_inventory' || activeTab === 'lab_management') && styles.tabLabelActive]}>
            {staffRole === 'doctor' ? 'Rx' : staffRole === 'pharmacist' ? 'Stock' : staffRole === 'lab_technician' ? 'Lab' : 'Appts'}
          </Text>
        </TouchableOpacity>

        {/* FAB Menu Button */}
        <TouchableOpacity style={styles.tabItemCenter} onPress={() => setDrawerOpen(true)}>
          <View style={styles.centerFab}>
            <Text style={styles.fabIcon}>☰</Text>
          </View>
          <Text style={styles.fabLabel}>Menu</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            if (staffRole === 'pharmacist' || staffRole === 'accountant') setActiveTab('medicine_billing');
            else setActiveTab('treatment_billing');
          }}>
          <View style={styles.tabIconWrapper}>
            {renderTabVectorIcon('treatment_billing', (activeTab === 'treatment_billing' || activeTab === 'medicine_billing') ? '#0d9488' : '#94a3b8', 21)}
          </View>
          <Text style={[styles.tabLabel, (activeTab === 'treatment_billing' || activeTab === 'medicine_billing') && styles.tabLabelActive]}>
            Billing
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('notifications')}>
          <View style={styles.tabIconWrapper}>
            {renderTabVectorIcon('notifications', activeTab === 'notifications' ? '#0d9488' : '#94a3b8', 21)}
            <View style={styles.smallBadge}>
              <Text style={styles.smallBadgeText}>3</Text>
            </View>
          </View>
          <Text style={[styles.tabLabel, activeTab === 'notifications' && styles.tabLabelActive]}>
            Alerts
          </Text>
        </TouchableOpacity>
      </View>
      )}

      {/* ─── SIDE DRAWER MODAL (DARK NAVY THEME) ─── */}
      <Modal visible={drawerOpen} animationType="fade" transparent={true} onRequestClose={() => setDrawerOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setDrawerOpen(false)}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.drawerSheet}>
            <SafeAreaView style={styles.drawerSafeArea}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.drawerHeader}>
                  <Text style={styles.categoryTitle}>{staffRole.replace('_', ' ').toUpperCase()}</Text>
                  <TouchableOpacity onPress={() => setDrawerOpen(false)} style={styles.closeBtn}>
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Staff User Box */}
                <View style={styles.staffInfoCard}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarLetter}>{initial}</Text>
                  </View>
                  <View style={styles.staffNameCol}>
                    <Text style={styles.staffNameText} numberOfLines={1}>{staffName}</Text>
                    <Text style={styles.staffSubText}>Arogya Clinic • {staffRole.replace('_', ' ')}</Text>
                  </View>
                </View>

                {/* Role Specific Menu List */}
                <View style={styles.menuList}>
                  {menuItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.8}
                        style={[styles.menuItemRow, isActive && styles.menuItemRowActive]}
                        onPress={() => {
                          setActiveTab(item.id);
                          setDrawerOpen(false);
                        }}>
                        <View style={[styles.menuIconContainer, isActive && styles.menuIconContainerActive]}>
                          {renderTabVectorIcon(item.id, isActive ? '#ffffff' : '#14b8a6', 19)}
                        </View>
                        <Text style={[styles.menuItemLabel, isActive && styles.menuItemLabelActive]}>
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
                  <Text style={styles.logoutBtnText}>Logout Staff Account</Text>
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  screenContainer: { flex: 1 },
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
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabItemCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  fabIcon: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  fabLabel: { fontSize: 10, color: '#0d9488', fontWeight: '700', marginTop: 2 },
  tabIconWrapper: { position: 'relative' },
  tabLabel: { fontSize: 10, fontWeight: '600', color: '#64748b', marginTop: 2 },
  tabLabelActive: { color: '#0d9488', fontWeight: '800' },
  smallBadge: { position: 'absolute', top: -3, right: -6, backgroundColor: '#ef4444', borderRadius: 8, minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  smallBadgeText: { color: '#ffffff', fontSize: 9, fontWeight: 'bold' },
  modalOverlay: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 36) + 56 : 90,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)' },
  drawerSheet: { width: '82%', maxWidth: 320, height: '100%', backgroundColor: '#071624', borderTopRightRadius: 16, borderBottomRightRadius: 16, paddingHorizontal: 16, paddingTop: 16, elevation: 20 },
  drawerSafeArea: { flex: 1 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, paddingHorizontal: 4 },
  categoryTitle: { fontSize: 11, fontWeight: '900', color: '#14b8a6', letterSpacing: 1.5 },
  closeBtn: { padding: 6 },
  closeBtnText: { color: '#94a3b8', fontSize: 18, fontWeight: 'bold' },
  staffInfoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f2942', borderRadius: 14, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: '#1e3a5f' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0d9488', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarLetter: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  staffNameCol: { flex: 1 },
  staffNameText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  staffSubText: { color: '#94a3b8', fontSize: 11, marginTop: 1, textTransform: 'capitalize' },
  menuList: { gap: 6, marginBottom: 24 },
  menuItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12 },
  menuItemRowActive: { backgroundColor: '#0f2f4a', borderWidth: 1, borderColor: '#0d9488' },
  menuIconContainer: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#0f2338', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuIconContainerActive: { backgroundColor: '#0d9488' },
  menuItemLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#94a3b8' },
  menuItemLabelActive: { color: '#ffffff', fontWeight: '800' },
  itemBadge: { backgroundColor: '#0d9488', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  itemBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e293b', borderRadius: 12, paddingVertical: 13, marginTop: 10, marginBottom: 30, gap: 8, borderWidth: 1, borderColor: '#334155' },
  logoutBtnIcon: { fontSize: 16 },
  logoutBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
});

export default StaffMainContainer;
