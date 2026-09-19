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
  Shield,
  ShieldCheck,
} from 'lucide-react-native';
import { useAuthContext } from '../context/AuthContext';

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
import BookAppointmentScreen from '../screens/patient/BookAppointmentScreen';
import AppointmentsManagerScreen from '../screens/staff/AppointmentsManagerScreen';
import AuditLogsScreen from '../screens/staff/AuditLogsScreen';
import ClinicsManagementScreen from '../screens/staff/ClinicsManagementScreen';
import LabManagementScreen from '../screens/staff/LabManagementScreen';
import MedicineBillingScreen from '../screens/staff/MedicineBillingScreen';
import NotificationsCenterScreen from '../screens/staff/NotificationsCenterScreen';
import PatientsManagementScreen from '../screens/staff/PatientsManagementScreen';
import PharmacyInventoryScreen from '../screens/staff/PharmacyInventoryScreen';
import PrescriptionsScreen from '../screens/staff/PrescriptionsScreen';
import StaffManagementScreen from '../screens/staff/StaffManagementScreen';
import RolePermissionsScreen from '../screens/staff/RolePermissionsScreen';
import TreatmentBillingScreen from '../screens/staff/TreatmentBillingScreen';

export type StaffTabType =
  | 'dashboard'
  | 'clinics'
  | 'staff'
  | 'role_permissions'
  | 'patients'
  | 'appointments'
  | 'book_appointment'
  | 'prescriptions'
  | 'pharmacy_inventory'
  | 'medicine_billing'
  | 'treatment_billing'
  | 'lab_management'
  | 'audit_logs'
  | 'notifications';

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
    role,
    activeClinicId,
    activeClinicName,
    assignedClinics,
    isMultiClinic,
    switchClinic,
    logout,
    isLoading: isAuthLoading,
  } = useAuthContext();

  const staffRole = role || (user?.roleName || (user as any)?.role_name || (user as any)?.role || 'clinic_admin').toLowerCase();

  const [activeTab, setActiveTab] = useState<StaffTabType>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [clinicModalOpen, setClinicModalOpen] = useState(false);
  const [isSwitchingClinic, setIsSwitchingClinic] = useState(false);
  const [userRoleMgmtOpen, setUserRoleMgmtOpen] = useState(true);

  const staffName = user?.fullName || user?.full_name || 'Staff User';
  const initial = staffName.charAt(0).toUpperCase();

  const openDrawer = () => setDrawerOpen(true);
  const openNotifications = () => setActiveTab('notifications');

  const handleSelectClinic = async (clinicId: number) => {
    if (clinicId === activeClinicId) {
      setClinicModalOpen(false);
      return;
    }
    setIsSwitchingClinic(true);
    await switchClinic(clinicId);
    setIsSwitchingClinic(false);
    setClinicModalOpen(false);
  };

  // Check if User Management permission is granted or fallback for clinic_admin/super_admin
  const canSeeUserManagement =
    staffRole === 'super_admin' ||
    staffRole === 'clinic_admin' ||
    (user as any)?.permissions?.['staff_users'] === true ||
    (user as any)?.permissions?.['user_management'] === true ||
    true;

  // Define Menu items allowed for each role
  const getMenuItemsForRole = (roleStr: string): MenuItem[] => {
    switch (roleStr) {
      case 'super_admin':
        return [
          { id: 'dashboard', label: 'Super Admin Dashboard' },
          { id: 'clinics', label: 'Tenant Clinics' },
          { id: 'patients', label: 'Patients Directory' },
          {
            id: 'user_role_mgmt',
            label: 'User & Role Management',
            isGroup: true,
            children: [
              { id: 'staff', label: 'Create User', iconType: 'create_user' },
              { id: 'role_permissions', label: 'Role Permissions', iconType: 'role_permissions' },
            ],
          },
          { id: 'audit_logs', label: 'Audit Trail Logs' },
          { id: 'notifications', label: 'Notifications', badge: 3 },
        ];
      case 'clinic_admin':
        return [
          { id: 'dashboard', label: 'Admin Dashboard' },
          { id: 'clinics', label: 'Clinic Management' },
          { id: 'patients', label: 'Patients' },
          { id: 'appointments', label: 'Appointments' },
          { id: 'treatment_billing', label: 'Treatment Billing' },
          { id: 'medicine_billing', label: 'Medicine Billing' },
          { id: 'pharmacy_inventory', label: 'Medicines Stock' },
          { id: 'lab_management', label: 'Lab Tests' },
          { id: 'notifications', label: 'Notifications', badge: 3 },
          ...(canSeeUserManagement
            ? [
                {
                  id: 'user_role_mgmt' as const,
                  label: 'User & Role Management',
                  isGroup: true,
                  children: [
                    { id: 'staff' as const, label: 'Create User', iconType: 'create_user' as const },
                    { id: 'role_permissions' as const, label: 'Role Permissions', iconType: 'role_permissions' as const },
                  ],
                },
              ]
            : []),
        ];
      case 'doctor':
        return [
          { id: 'dashboard', label: 'Doctor Dashboard' },
          { id: 'appointments', label: 'Patient Consultations' },
          { id: 'prescriptions', label: 'Prescription Creator' },
          { id: 'patients', label: 'Patient Medical History' },
          { id: 'lab_management', label: 'Lab Reports' },
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
        return <ClinicsManagementScreen onOpenDrawer={openDrawer} />;
      case 'staff':
        return <StaffManagementScreen onOpenDrawer={openDrawer} />;
      case 'role_permissions':
        return <RolePermissionsScreen onOpenDrawer={openDrawer} />;
      case 'patients':
        return <PatientsManagementScreen onOpenDrawer={openDrawer} />;
      case 'appointments':
        return <AppointmentsManagerScreen onOpenDrawer={openDrawer} onNavigateScreen={(scr) => setActiveTab(scr as any)} />;
      case 'book_appointment':
        return <BookAppointmentScreen onOpenDrawer={openDrawer} />;
      case 'prescriptions':
        return <PrescriptionsScreen onOpenDrawer={openDrawer} />;
      case 'pharmacy_inventory':
        return <PharmacyInventoryScreen onOpenDrawer={openDrawer} />;
      case 'medicine_billing':
        return <MedicineBillingScreen onOpenDrawer={openDrawer} />;
      case 'treatment_billing':
        return <TreatmentBillingScreen onOpenDrawer={openDrawer} />;
      case 'lab_management':
        return <LabManagementScreen onOpenDrawer={openDrawer} />;
      case 'audit_logs':
        return <AuditLogsScreen onOpenDrawer={openDrawer} />;
      case 'notifications':
        return <NotificationsCenterScreen onOpenDrawer={openDrawer} />;
      default:
        return <ClinicAdminDashboardScreen onOpenDrawer={openDrawer} onOpenNotifications={openNotifications} onNavigateScreen={(scr) => setActiveTab(scr as any)} />;
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
      case 'user_role_mgmt':
        return <UserCog color={color} size={size} />;
      case 'treatment_billing':
      case 'medicine_billing':
        return <CreditCard color={color} size={size} />;
      case 'pharmacy_inventory':
      case 'prescriptions':
        return <Pill color={color} size={size} />;
      case 'lab_management':
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
      <Modal visible={drawerOpen} animationType="fade" transparent={true} onRequestClose={() => setDrawerOpen(false)}>
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
                    <Building2 color="#0D9488" size={22} />
                  </View>
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.clinicTitle} numberOfLines={1}>
                      {activeClinicName}
                    </Text>
                    <Text style={styles.roleSubtitle}>
                      {staffRole.replace('_', ' ')} {isMultiClinic ? '▼' : ''}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuIconButton} onPress={() => setDrawerOpen(false)}>
                  <Menu color="#14B8A6" size={18} />
                </TouchableOpacity>
              </View>

              {/* ── 2. SECTION TITLE ── */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>ADMIN</Text>
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
                            <View style={styles.itemLeft}>
                              <View style={[styles.menuIconContainer, isGroupActive && styles.menuIconContainerActive]}>
                                <UserCog color={isGroupActive ? '#5EEAD4' : '#14B8A6'} size={18} />
                              </View>
                              <Text style={[styles.menuItemLabel, isGroupActive && styles.activeItemText]}>
                                {item.label}
                              </Text>
                            </View>
                            {userRoleMgmtOpen ? (
                              <ChevronUp color="#94A3B8" size={16} />
                            ) : (
                              <ChevronDown color="#94A3B8" size={16} />
                            )}
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
                                        setActiveTab(child.id);
                                        setDrawerOpen(false);
                                      }}>
                                      <View style={[styles.subIconBadge, isChildActive && styles.subIconBadgeActive]}>
                                        {child.iconType === 'role_permissions' ? (
                                          <Shield color={isChildActive ? '#2DD4BF' : '#14B8A6'} size={15} />
                                        ) : (
                                          <UserPlus color={isChildActive ? '#2DD4BF' : '#14B8A6'} size={15} />
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
                          setActiveTab(item.id as StaffTabType);
                          setDrawerOpen(false);
                        }}>
                        <View style={styles.itemLeft}>
                          <View style={[styles.menuIconContainer, isActive && styles.menuIconContainerActive]}>
                            {renderTabVectorIcon(item.id, isActive ? '#5EEAD4' : '#14B8A6', 18)}
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
                  <LogOut color="#14B8A6" size={20} />
                  <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      {/* ─── MULTI-CLINIC SELECTION MODAL ─── */}
      <Modal visible={clinicModalOpen} animationType="slide" transparent={true} onRequestClose={() => setClinicModalOpen(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.clinicSelectBox}>
            <View style={styles.clinicModalHeader}>
              <Text style={styles.clinicModalTitle}>Select Active Clinic</Text>
              <TouchableOpacity onPress={() => setClinicModalOpen(false)} style={styles.closeBtn}>
                <X size={20} color="#64748b" />
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
                <View style={{ padding: 16 }}>
                  <Text style={{ color: '#64748b' }}>No assigned clinics found.</Text>
                </View>
              )}
            </ScrollView>
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
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 36) + 10 : 20,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10, 15, 29, 0.6)' },
  drawerSheet: { width: '85%', maxWidth: 320, height: '100%', backgroundColor: '#0A0F1D', borderTopRightRadius: 16, borderBottomRightRadius: 16, paddingHorizontal: 16, paddingTop: 16, elevation: 20 },
  drawerSafeArea: { flex: 1 },
  
  // Header (Exact Match)
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  brandingContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  logoBadge: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTextContainer: { flex: 1 },
  clinicTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  roleSubtitle: { color: '#94A3B8', fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  menuIconButton: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: '#1E293B', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' },
  closeBtn: { padding: 6 },

  // Section Header
  sectionHeader: { marginBottom: 10, paddingLeft: 4 },
  sectionTitle: { color: '#2DD4BF', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },

  // ScrollArea & Menu List
  scrollArea: { flex: 1 },
  menuList: { gap: 4, marginBottom: 20 },
  menuItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  activeMenuItemRow: { backgroundColor: 'rgba(13, 148, 136, 0.15)', borderWidth: 1.5, borderColor: '#0D9488' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuIconContainer: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(15, 30, 46, 0.7)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuIconContainerActive: { backgroundColor: '#0D9488' },
  menuItemLabel: { fontSize: 14, fontWeight: '500', color: '#E2E8F0' },
  activeItemText: { color: '#FFFFFF', fontWeight: '700' },
  itemBadge: { backgroundColor: '#0d9488', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  itemBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },

  // Sub-items Tree (Exact Match)
  groupContainer: { marginBottom: 4 },
  subItemTreeContainer: { flexDirection: 'row', paddingLeft: 24, marginTop: 4, marginBottom: 6 },
  treeLine: { width: 1, backgroundColor: '#1E293B', marginRight: 16 },
  subItemsList: { flex: 1 },
  subMenuItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, marginBottom: 4 },
  activeSubMenuItemRow: { backgroundColor: 'rgba(13, 148, 136, 0.2)' },
  subIconBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(15, 23, 42, 0.8)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  subIconBadgeActive: { backgroundColor: '#0D9488' },
  subMenuItemLabel: { color: '#CBD5E1', fontSize: 13, fontWeight: '500' },
  activeSubItemText: { color: '#2DD4BF', fontWeight: '700' },

  // Footer Section (Exact Match)
  footerSection: { borderTopWidth: 1, borderTopColor: '#1E293B', paddingTop: 14, marginTop: 6, marginBottom: 16 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 },
  logoutText: { color: '#E2E8F0', fontSize: 14, fontWeight: '600', marginLeft: 14 },

  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  clinicSelectBox: { width: '100%', maxWidth: 360, backgroundColor: '#ffffff', borderRadius: 16, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 10 },
  clinicModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  clinicModalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  clinicOptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, marginBottom: 6, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  clinicOptionRowSelected: { backgroundColor: '#f0fdf4', borderColor: '#16a34a' },
  clinicOptionText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  clinicOptionTextSelected: { fontWeight: '800', color: '#166534' },
  selectedCheck: { fontSize: 12, fontWeight: '800', color: '#16a34a' },
});

export default StaffMainContainer;


