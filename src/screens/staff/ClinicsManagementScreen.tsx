// src/screens/staff/ClinicsManagementScreen.tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
  Switch,
  ActivityIndicator,
} from 'react-native';
import {
  Building,
  RefreshCw,
  Search,
  ChevronDown,
  Columns,
  MoreVertical,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  IndianRupee,
  Users,
  ClipboardList,
  Pill,
  MapPin,
  Mail,
  Phone,
  Plus,
  X,
  Eye,
  Edit2,
  UserPlus,
  Trash2,
  Globe,
  Award,
  Clock,
  Camera,
  ChevronsUpDown,
} from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { Pagination } from '../../components/common/Pagination';
import { CustomCalendarPicker } from '../../components/common/CustomCalendarPicker';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { useAuthContext } from '../../context/AuthContext';
import { fetchProfileApi } from '../../api/authApi';
import { apiFetch } from '../../api/apiConfig';

interface Props {
  onOpenDrawer: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export interface ClinicItem {
  id: string | number;
  name: string;
  code: string;
  address: string;
  email: string;
  phone: string;
  admins_count: number;
  status: 'Active' | 'Inactive';
  doctors_count?: number;
  patients_count?: number;
  subscription_plan?: string;
  city?: string;
  state?: string;
  country?: string;
  created_at?: string;
  website?: string;
  license_number?: string;
  available_days?: string;
  available_from?: string;
  available_to?: string;
}

export interface ClinicFormState {
  id?: string | number;
  name: string;
  email: string;
  phone: string;
  address: string;
  state: string;
  city: string;
  country: string;
  website: string;
  license_number: string;
  available_days: string;
  available_from: string;
  available_to: string;
}

const DEFAULT_CLINIC_FORM: ClinicFormState = {
  name: '',
  email: '',
  phone: '',
  address: '',
  state: 'Arunachal Pradesh',
  city: 'Bomdila',
  country: 'India',
  website: 'https://clinic.example.com',
  license_number: 'L123',
  available_days: 'Mon,Tue,Wed,Thu,Fri',
  available_from: '12:30 AM',
  available_to: '02:30 AM',
};

export interface ClinicAdminItem {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: 'Active' | 'Inactive';
}

const DEFAULT_CLINIC_ADMINS: ClinicAdminItem[] = [
  { id: '1', full_name: 'Dr. Rahul Sharma', email: 'rahul.sharma@aarogyacare.com', phone: '9898989898', status: 'Active' },
  { id: '2', full_name: 'Dr. Ritesh Agrawal', email: 'ritesh@gmail.com', phone: '8745896580', status: 'Active' },
  { id: '3', full_name: 'Harsha yadav', email: 'yadavharsha00@gmail.com', phone: '9898979662', status: 'Active' },
  { id: '4', full_name: 'VERSHA yadav', email: 'yadavharsha23@gmail.com', phone: '9898979643', status: 'Active' },
];

const INITIAL_CLINICS: ClinicItem[] = [
  {
    id: '1',
    name: 'Aarogya Care Clinic',
    code: 'CLN-001',
    address: '102, Shree Heights, AB Road',
    email: 'contact@aarogyacare.com',
    phone: '9876543210',
    admins_count: 4,
    status: 'Active',
    doctors_count: 12,
    patients_count: 16,
    subscription_plan: 'Enterprise',
    city: 'Bomdila',
    state: 'Arunachal Pradesh',
    country: 'India',
    created_at: 'Jul 29, 2026',
    website: '—',
    license_number: 'L123',
    available_days: 'Mon,Tue,Wed,Thu,Fri',
    available_from: '00:30',
    available_to: '02:30',
  },
];

export function checkIsMultiClinicPlan(planData: any, userData: any, assignedClinics?: any[]): boolean {
  if (planData) {
    if (planData.is_multiclinic !== undefined) return Boolean(planData.is_multiclinic);
    if (planData.isMultiClinic !== undefined) return Boolean(planData.isMultiClinic);
    if (planData.allow_multiple_clinics !== undefined) return Boolean(planData.allow_multiple_clinics);
    if (planData.allowMultipleClinics !== undefined) return Boolean(planData.allowMultipleClinics);
    if (planData.max_clinics !== undefined && Number(planData.max_clinics) > 1) return true;
    if (planData.maxClinics !== undefined && Number(planData.maxClinics) > 1) return true;
  }

  if (userData) {
    if (userData.is_multiclinic !== undefined) return Boolean(userData.is_multiclinic);
    if (userData.isMultiClinic !== undefined) return Boolean(userData.isMultiClinic);
    if (userData.allow_multiple_clinics !== undefined) return Boolean(userData.allow_multiple_clinics);
    if (userData.max_clinics !== undefined && Number(userData.max_clinics) > 1) return true;

    const rawPlan = String(
      userData.plan_type ||
      userData.plan_name ||
      userData.subscription_plan ||
      userData.plan ||
      (typeof userData.plan === 'object' ? userData.plan?.name || userData.plan?.type : '') ||
      ''
    ).toLowerCase();

    if (rawPlan.includes('multi') || rawPlan.includes('enterprise') || rawPlan.includes('pro') || rawPlan.includes('unlimited') || rawPlan.includes('chain')) {
      return true;
    }
    if (rawPlan.includes('single') || rawPlan.includes('free') || rawPlan.includes('basic') || rawPlan.includes('starter') || rawPlan.includes('individual')) {
      return false;
    }
  }

  if (assignedClinics && assignedClinics.length > 1) {
    return true;
  }

  return false;
}

export const ClinicsManagementScreen: React.FC<Props> = ({ onOpenDrawer, onNavigateScreen }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { token, user, assignedClinics } = useAuthContext();
  const [isMultiClinicPlan, setIsMultiClinicPlan] = useState<boolean>(false);

  const fetchAndCheckUserPlan = useCallback(async () => {
    try {
      let planData: any = null;
      let userData: any = user;

      // 1. Fetch Profile API
      const profileRes = await fetchProfileApi().catch(() => null);
      if (profileRes && profileRes.success && profileRes.data) {
        userData = profileRes.data.user || profileRes.data;
        planData = userData.plan || userData.subscription || userData.plan_details;
      }

      // 2. Fetch Subscription Plan API endpoint if available
      const subRes = await apiFetch<any>('/subscription/my-plan').catch(() => null);
      if (subRes && subRes.success && subRes.data) {
        planData = subRes.data;
      }

      const isMulti = checkIsMultiClinicPlan(planData, userData, assignedClinics);
      setIsMultiClinicPlan(isMulti);
    } catch (err) {
      console.log('Error checking plan API:', err);
      setIsMultiClinicPlan(checkIsMultiClinicPlan(null, user, assignedClinics));
    }
  }, [token, user, assignedClinics]);

  React.useEffect(() => {
    fetchAndCheckUserPlan();
  }, [fetchAndCheckUserPlan]);

  const [clinics, setClinics] = useState<ClinicItem[]>(INITIAL_CLINICS);
  const [selectedClinicFilter, setSelectedClinicFilter] = useState<string>('Aarogya Care Clinic');
  const [selectedPerformanceDate, setSelectedPerformanceDate] = useState<Date>(new Date(2026, 8, 20));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('Active');
  const [showStatusDropdown, setShowStatusDropdown] = useState<boolean>(false);
  const [showClinicSelectDropdown, setShowClinicSelectDropdown] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('20 Sept 2026, 2:02:03 pm');

  // Pagination & Filtering
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const filteredClinics = useMemo(() => {
    return clinics.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.phone.includes(searchQuery) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        selectedStatusFilter === 'All' || item.status === selectedStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clinics, searchQuery, selectedStatusFilter]);

  const totalPages = Math.ceil(filteredClinics.length / pageSize) || 1;

  const paginatedClinics = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClinics.slice(start, start + pageSize);
  }, [filteredClinics, currentPage, pageSize]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const now = new Date();
      setLastRefreshed(`${now.getDate()} Sept ${now.getFullYear()}, ${now.toLocaleTimeString()}`);
      setIsRefreshing(false);
      showSuccessToast('Refreshed', 'Dashboard refreshed successfully.');
    }, 400);
  };

  const handleToggleClinicStatus = (id: string | number) => {
    const targetClinic = clinics.find((c) => String(c.id) === String(id));
    if (!targetClinic) return;

    const isCurrentlyActive = targetClinic.status === 'Active';
    const actionText = isCurrentlyActive ? 'deactivate' : 'activate';
    const message = `Are you sure you want to ${actionText} clinic "${targetClinic.name}"?`;

    const executeToggle = () => {
      setClinics((prev) =>
        prev.map((c) =>
          String(c.id) === String(id)
            ? { ...c, status: isCurrentlyActive ? 'Inactive' : 'Active' }
            : c
        )
      );
      showSuccessToast(
        'Status Updated',
        `Clinic "${targetClinic.name}" ${isCurrentlyActive ? 'deactivated' : 'activated'} successfully.`
      );
    };

    const globalObj: any = typeof globalThis !== 'undefined' ? globalThis : {};
    if (globalObj.window && typeof globalObj.window.confirm === 'function') {
      if (globalObj.window.confirm(message)) {
        executeToggle();
      }
    } else {
      Alert.alert(
        'Confirm Action',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'OK', onPress: executeToggle },
        ],
        { cancelable: true }
      );
    }
  };

  // Popover Actions Menu State
  const [activeActionMenuClinicId, setActiveActionMenuClinicId] = useState<string | number | null>(null);

  // View Clinic Details Modal State (Screenshot 3)
  const [viewClinicModal, setViewClinicModal] = useState<ClinicItem | null>(null);

  // View Clinic Admins Modal State (Screenshot 4)
  const [viewAdminsModal, setViewAdminsModal] = useState<ClinicItem | null>(null);
  const [adminsList, setAdminsList] = useState<ClinicAdminItem[]>(DEFAULT_CLINIC_ADMINS);

  // Add Clinic Admin Modal State (Screenshot 5)
  const [addAdminModalClinic, setAddAdminModalClinic] = useState<ClinicItem | null>(null);
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAddress, setAdminAddress] = useState('');
  const [addAdminSaving, setAddAdminSaving] = useState(false);

  // Admin Handlers
  const handleCreateClinicAdmin = () => {
    if (!adminFullName.trim() || !adminEmail.trim() || !adminPhone.trim() || !adminPassword.trim()) {
      showErrorToast('Validation Error', 'Full Name, Email, Phone, and Password are required.');
      return;
    }

    setAddAdminSaving(true);
    setTimeout(() => {
      const newAdmin: ClinicAdminItem = {
        id: String(Date.now()),
        full_name: adminFullName.trim(),
        email: adminEmail.trim(),
        phone: adminPhone.trim(),
        status: 'Active',
      };

      setAdminsList((prev) => [newAdmin, ...prev]);
      setAddAdminSaving(false);
      setAddAdminModalClinic(null);
      setAdminFullName('');
      setAdminEmail('');
      setAdminPhone('');
      setAdminPassword('');
      setAdminAddress('');
      showSuccessToast('Admin Created', `Clinic admin ${newAdmin.full_name} created successfully!`);
    }, 400);
  };

  const handleDeleteClinicAdmin = (adminId: string) => {
    setAdminsList((prev) => prev.filter((a) => a.id !== adminId));
    showSuccessToast('Admin Removed', 'Clinic administrator removed successfully.');
  };

  const handleToggleClinicAdminStatus = (adminId: string) => {
    setAdminsList((prev) =>
      prev.map((a) => (a.id === adminId ? { ...a, status: a.status === 'Active' ? 'Inactive' : 'Active' } : a))
    );
    showSuccessToast('Status Updated', 'Clinic administrator status updated.');
  };

  // Register / Edit Clinic Modal State (Screenshots 1 & 2 Match)
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClinicId, setEditingClinicId] = useState<string | number | null>(null);
  const [clinicForm, setClinicForm] = useState<ClinicFormState>(DEFAULT_CLINIC_FORM);
  const [showFormStateDropdown, setShowFormStateDropdown] = useState(false);
  const [showFormCityDropdown, setShowFormCityDropdown] = useState(false);
  const [showFormCountryDropdown, setShowFormCountryDropdown] = useState(false);
  const [clinicSaving, setClinicSaving] = useState(false);

  const handleOpenAddClinicModal = () => {
    setEditingClinicId(null);
    setClinicForm({ ...DEFAULT_CLINIC_FORM });
    setModalVisible(true);
  };

  const handleOpenEditClinicModal = (item: ClinicItem) => {
    setEditingClinicId(item.id);
    setClinicForm({
      name: item.name,
      email: item.email,
      phone: item.phone,
      address: item.address,
      state: item.state || 'Arunachal Pradesh',
      city: item.city || 'Bomdila',
      country: item.country || 'India',
      website: item.website || 'https://clinic.example.com',
      license_number: item.license_number || 'L123',
      available_days: item.available_days || 'Mon,Tue,Wed,Thu,Fri',
      available_from: item.available_from || '12:30 AM',
      available_to: item.available_to || '02:30 AM',
    });
    setModalVisible(true);
  };

  const handleSaveClinic = () => {
    if (!clinicForm.name.trim() || !clinicForm.email.trim() || !clinicForm.phone.trim() || !clinicForm.address.trim()) {
      showErrorToast('Validation Error', 'Clinic Name, Email address, Phone number, and Address are required.');
      return;
    }

    setClinicSaving(true);
    setTimeout(() => {
      if (editingClinicId) {
        setClinics((prev) =>
          prev.map((c) =>
            String(c.id) === String(editingClinicId)
              ? {
                  ...c,
                  name: clinicForm.name.trim(),
                  email: clinicForm.email.trim(),
                  phone: clinicForm.phone.trim(),
                  address: clinicForm.address.trim(),
                  state: clinicForm.state,
                  city: clinicForm.city,
                  country: clinicForm.country,
                  website: clinicForm.website,
                  license_number: clinicForm.license_number,
                  available_days: clinicForm.available_days,
                  available_from: clinicForm.available_from,
                  available_to: clinicForm.available_to,
                }
              : c
          )
        );
        showSuccessToast('Clinic Updated', `Clinic ${clinicForm.name} updated successfully!`);
      } else {
        const created: ClinicItem = {
          id: String(Date.now()),
          name: clinicForm.name.trim(),
          code: `CLN-00${clinics.length + 1}`,
          address: clinicForm.address.trim(),
          email: clinicForm.email.trim(),
          phone: clinicForm.phone.trim(),
          admins_count: 1,
          status: 'Active',
          doctors_count: 1,
          patients_count: 0,
          state: clinicForm.state,
          city: clinicForm.city,
          country: clinicForm.country,
          website: clinicForm.website,
          license_number: clinicForm.license_number,
          available_days: clinicForm.available_days,
          available_from: clinicForm.available_from,
          available_to: clinicForm.available_to,
        };
        setClinics([created, ...clinics]);
        showSuccessToast('Clinic Registered', `Clinic ${created.name} registered successfully!`);
      }

      setClinicSaving(false);
      setModalVisible(false);
    }, 400);
  };


  const totalClinicsCount = clinics.length;
  const activeClinicsCount = clinics.filter((c) => c.status === 'Active').length;
  const inactiveClinicsCount = clinics.filter((c) => c.status === 'Inactive').length;
  const totalAdminsCount = clinics.reduce((acc, c) => acc + c.admins_count, 0);

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        title="Clinic Management"
        onNavigate={(path) => {
          if (onNavigateScreen) {
            const cleanPath = path.replace('/', '').replace('-', '_');
            onNavigateScreen(cleanPath);
          }
        }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        decelerationRate="normal">
        {/* ── TOP BANNER HEADER ──────────────────────────────────────────────── */}
        <View style={[styles.bannerRow, isMobile && styles.bannerRowMobile]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={styles.buildingIconBox}>
              <Building color="#0D9488" size={24} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.bannerTitle}>Clinic Management</Text>
              <Text style={styles.bannerSubtitle}>
                Manage all clinics and their administrators
              </Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.upgradeLinkBtn, isMobile && { marginTop: 8 }]}>
            <Text style={styles.upgradeLinkText}>
              Multiple clinics ke liye <Text style={styles.upgradeLinkHighlight}>plan upgrade karo</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── TOP MAIN CONTAINER CARD (DAILY PERFORMANCE & SNAPSHOT) ────────── */}
        <View style={styles.topCardBorder}>
          {/* Controls Bar: Clinic Dropdown, Performance Date, Refresh Button */}
          <View style={[styles.controlsRow, isMobile && styles.controlsRowMobile]}>
            {/* Clinic Dropdown */}
            <View style={{ flex: 1, minWidth: 200, zIndex: 30 }}>
              <Text style={styles.controlLabel}>CLINIC</Text>
              <TouchableOpacity
                style={styles.controlSelectBtn}
                onPress={() => setShowClinicSelectDropdown(!showClinicSelectDropdown)}
              >
                <Text style={styles.controlSelectBtnText} numberOfLines={1}>
                  {selectedClinicFilter}
                </Text>
                <ChevronDown color="#64748B" size={16} />
              </TouchableOpacity>

              {showClinicSelectDropdown && (
                <View style={styles.controlDropdownMenu}>
                  {clinics.map((c) => (
                    <TouchableOpacity
                      key={String(c.id)}
                      style={styles.controlDropdownItem}
                      onPress={() => {
                        setSelectedClinicFilter(c.name);
                        setShowClinicSelectDropdown(false);
                      }}
                    >
                      <Text style={styles.controlDropdownItemText}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Performance Date with Integrated CustomCalendarPicker */}
            <View style={{ flex: 1.5, minWidth: 240, zIndex: 40 }}>
              <Text style={styles.controlLabel}>Performance Date</Text>
              <CustomCalendarPicker
                selectedDate={selectedPerformanceDate}
                onDateChange={(d) => setSelectedPerformanceDate(d)}
              />
            </View>

            {/* Refresh Dashboard Button & Timestamp */}
            <View style={[styles.refreshCol, isMobile && { alignItems: 'flex-start', marginTop: 10 }]}>
              <TouchableOpacity style={styles.refreshDashBtn} onPress={handleRefresh}>
                <RefreshCw color="#334155" size={14} style={{ marginRight: 6 }} />
                <Text style={styles.refreshDashBtnText}>Refresh dashboard</Text>
              </TouchableOpacity>
              <Text style={styles.lastRefreshedText}>Last refreshed: {lastRefreshed}</Text>
            </View>
          </View>

          {/* SECTION 1: Daily Performance */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Daily Performance</Text>
            <Text style={styles.sectionSubtitle}>
              Results for {selectedPerformanceDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>

          <View style={[styles.kpiGrid4, isMobile && styles.kpiGridMobile]}>
            {/* Appointments */}
            <View style={[styles.kpiCard, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop]}>
              <View style={{ flex: 1, paddingRight: isMobile ? 4 : 0 }}>
                <Text style={[styles.kpiLabel, isMobile && { fontSize: 11 }]} numberOfLines={1}>Appointments</Text>
                <Text style={[styles.kpiValue, isMobile && { fontSize: 17 }]}>0</Text>
                <Text style={[styles.kpiSub, isMobile && { fontSize: 10 }]} numberOfLines={1}>Scheduled on date</Text>
              </View>
              <View style={[styles.kpiIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: '#E6F4F1' }]}>
                <CalendarIcon color="#0D9488" size={isMobile ? 15 : 18} />
              </View>
            </View>

            {/* Completed */}
            <View style={[styles.kpiCard, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop]}>
              <View style={{ flex: 1, paddingRight: isMobile ? 4 : 0 }}>
                <Text style={[styles.kpiLabel, isMobile && { fontSize: 11 }]} numberOfLines={1}>Completed</Text>
                <Text style={[styles.kpiValue, isMobile && { fontSize: 17 }]}>0</Text>
                <Text style={[styles.kpiSub, isMobile && { fontSize: 10 }]} numberOfLines={1}>Visits completed</Text>
              </View>
              <View style={[styles.kpiIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: '#DCFCE7' }]}>
                <CheckCircle color="#166534" size={isMobile ? 15 : 18} />
              </View>
            </View>

            {/* Cancelled */}
            <View style={[styles.kpiCard, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop]}>
              <View style={{ flex: 1, paddingRight: isMobile ? 4 : 0 }}>
                <Text style={[styles.kpiLabel, isMobile && { fontSize: 11 }]} numberOfLines={1}>Cancelled</Text>
                <Text style={[styles.kpiValue, isMobile && { fontSize: 17 }]}>0</Text>
                <Text style={[styles.kpiSub, isMobile && { fontSize: 10 }]} numberOfLines={1}>Appointments cancelled</Text>
              </View>
              <View style={[styles.kpiIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: '#FEE2E2' }]}>
                <XCircle color="#991B1B" size={isMobile ? 15 : 18} />
              </View>
            </View>

            {/* Total Revenue */}
            <View style={[styles.kpiCard, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop]}>
              <View style={{ flex: 1, paddingRight: isMobile ? 4 : 0 }}>
                <Text style={[styles.kpiLabel, isMobile && { fontSize: 11 }]} numberOfLines={1}>Total Revenue</Text>
                <Text style={[styles.kpiValue, isMobile && { fontSize: 17 }]}>₹0.00</Text>
                <Text style={[styles.kpiSub, isMobile && { fontSize: 10 }]} numberOfLines={1}>Treatment + medicine</Text>
              </View>
              <View style={[styles.kpiIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: '#F3E8FF' }]}>
                <IndianRupee color="#7E22CE" size={isMobile ? 15 : 18} />
              </View>
            </View>
          </View>

          {/* SECTION 2: Live Operational Snapshot */}
          <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
            <Text style={styles.sectionTitle}>Live Operational Snapshot</Text>
            <Text style={styles.sectionSubtitle}>
              Current clinic health, independent of the selected date.
            </Text>
          </View>

          <View style={[styles.kpiGrid3, isMobile && styles.kpiGridMobile]}>
            {/* Active Patients */}
            <View style={[styles.kpiCardSnapshot, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop3]}>
              <View style={[styles.kpiIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: '#E6F4F1' }]}>
                <Users color="#0D9488" size={isMobile ? 15 : 18} />
              </View>
              <View style={{ flex: 1, marginLeft: isMobile ? 6 : 12 }}>
                <Text style={[styles.snapshotValue, isMobile && { fontSize: 16 }]}>16</Text>
                <Text style={[styles.snapshotLabel, isMobile && { fontSize: 11 }]} numberOfLines={1}>Active Patients</Text>
              </View>
            </View>

            {/* Pending Lab Tests */}
            <View style={[styles.kpiCardSnapshot, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop3]}>
              <View style={[styles.kpiIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: '#FFEDD5' }]}>
                <ClipboardList color="#C2410C" size={isMobile ? 15 : 18} />
              </View>
              <View style={{ flex: 1, marginLeft: isMobile ? 6 : 12 }}>
                <Text style={[styles.snapshotValue, isMobile && { fontSize: 16 }]}>0</Text>
                <Text style={[styles.snapshotLabel, isMobile && { fontSize: 11 }]} numberOfLines={1}>Pending Lab Tests</Text>
              </View>
            </View>

            {/* Low Stock Medicines */}
            <View style={[styles.kpiCardSnapshot, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop3]}>
              <View style={[styles.kpiIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: '#FFEDD5' }]}>
                <Pill color="#C2410C" size={isMobile ? 15 : 18} />
              </View>
              <View style={{ flex: 1, marginLeft: isMobile ? 6 : 12 }}>
                <Text style={[styles.snapshotValue, isMobile && { fontSize: 16 }]}>1</Text>
                <Text style={[styles.snapshotLabel, isMobile && { fontSize: 11 }]} numberOfLines={1}>Low Stock Medicines</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── MIDDLE ROW: 4 OVERVIEW METRIC CARDS ────────────────────────────── */}
        <View style={[styles.metricGrid4, isMobile && styles.kpiGridMobile]}>
          <View style={[styles.metricCard, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop]}>
            <View style={[styles.metricIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: '#CCFBF1' }]}>
              <Building color="#0D9488" size={isMobile ? 16 : 20} />
            </View>
            <View style={{ flex: 1, marginLeft: isMobile ? 6 : 12 }}>
              <Text style={[styles.metricValue, isMobile && { fontSize: 16 }]}>{totalClinicsCount}</Text>
              <Text style={[styles.metricLabel, isMobile && { fontSize: 11 }]} numberOfLines={1}>Total Clinics</Text>
            </View>
          </View>

          <View style={[styles.metricCard, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop]}>
            <View style={[styles.metricIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: '#DCFCE7' }]}>
              <Building color="#166534" size={isMobile ? 16 : 20} />
            </View>
            <View style={{ flex: 1, marginLeft: isMobile ? 6 : 12 }}>
              <Text style={[styles.metricValue, isMobile && { fontSize: 16 }]}>{activeClinicsCount}</Text>
              <Text style={[styles.metricLabel, isMobile && { fontSize: 11 }]} numberOfLines={1}>Active Clinics</Text>
            </View>
          </View>

          <View style={[styles.metricCard, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop]}>
            <View style={[styles.metricIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: '#FFEDD5' }]}>
              <Users color="#C2410C" size={isMobile ? 16 : 20} />
            </View>
            <View style={{ flex: 1, marginLeft: isMobile ? 6 : 12 }}>
              <Text style={[styles.metricValue, isMobile && { fontSize: 16 }]}>{totalAdminsCount}</Text>
              <Text style={[styles.metricLabel, isMobile && { fontSize: 11 }]} numberOfLines={1}>Total Admins</Text>
            </View>
          </View>

          <View style={[styles.metricCard, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop]}>
            <View style={[styles.metricIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: '#FEE2E2' }]}>
              <Building color="#991B1B" size={isMobile ? 16 : 20} />
            </View>
            <View style={{ flex: 1, marginLeft: isMobile ? 6 : 12 }}>
              <Text style={[styles.metricValue, isMobile && { fontSize: 16 }]}>{inactiveClinicsCount}</Text>
              <Text style={[styles.metricLabel, isMobile && { fontSize: 11 }]} numberOfLines={1}>Inactive Clinics</Text>
            </View>
          </View>
        </View>

        {/* ── SEARCH & STATUS FILTER BAR ────────────────────────────────────── */}
        <View style={[styles.searchFilterRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={styles.searchBar}>
            <Search color="#94A3B8" size={16} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search clinics by name, email, phone or address..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={{ position: 'relative', zIndex: 20 }}>
            <TouchableOpacity
              style={styles.statusTriggerBtn}
              onPress={() => setShowStatusDropdown(!showStatusDropdown)}
            >
              <Text style={styles.statusTriggerBtnText}>{selectedStatusFilter}</Text>
              <ChevronDown color="#64748B" size={16} />
            </TouchableOpacity>

            {showStatusDropdown && (
              <View style={styles.statusDropdownMenu}>
                {['All Status', 'Active', 'Inactive'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={styles.statusDropdownItem}
                    onPress={() => {
                      setSelectedStatusFilter(s);
                      setShowStatusDropdown(false);
                    }}
                  >
                    <Text style={styles.statusDropdownItemText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── CLINIC TABLE / LIST CARD ───────────────────────────────────────── */}
        <View style={styles.tableCardContainer}>
          <View style={styles.tableHeaderBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Building color="#0F172A" size={18} style={{ marginRight: 8 }} />
              <Text style={styles.tableTitleText}>Clinic ({filteredClinics.length})</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.columnsBtn}>
                <Columns color="#334155" size={14} style={{ marginRight: 6 }} />
                <Text style={styles.columnsBtnText}>Columns</Text>
              </TouchableOpacity>
              {isMultiClinicPlan && (
                <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                  <Plus color="#FFFFFF" size={14} style={{ marginRight: 4 }} />
                  <Text style={styles.addBtnText}>Add Clinic</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* TABLE CONTENT */}
          {isMobile ? (
            /* Mobile Card View */
            <View style={{ padding: 12, gap: 10 }}>
              {paginatedClinics.map((item) => (
                <View key={String(item.id)} style={styles.mobileClinicCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <View style={styles.clinicLogoSquare}>
                      <Building color="#0D9488" size={20} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.clinicTitleText}>{item.name}</Text>
                      <Text style={styles.codeText}>{item.code}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusPillBadge,
                        item.status === 'Active' ? styles.statusActiveBg : styles.statusInactiveBg,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          item.status === 'Active' ? styles.statusActiveText : styles.statusInactiveText,
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={{ padding: 6, marginLeft: 4 }}
                      onPress={() =>
                        setActiveActionMenuClinicId(
                          activeActionMenuClinicId === item.id ? null : item.id
                        )
                      }>
                      <MoreVertical color="#64748B" size={16} />
                    </TouchableOpacity>
                  </View>

                  {activeActionMenuClinicId === item.id && (
                    <View style={[styles.actionPopoverMenu, { position: 'relative', top: 0, right: 0, width: '100%', marginBottom: 8 }]}>
                      <TouchableOpacity
                        style={styles.popoverItem}
                        onPress={() => {
                          setActiveActionMenuClinicId(null);
                          setViewClinicModal(item);
                        }}>
                        <Eye size={15} color="#334155" style={{ marginRight: 8 }} />
                        <Text style={styles.popoverItemText}>View Clinic</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.popoverItem}
                        onPress={() => {
                          setActiveActionMenuClinicId(null);
                          setViewAdminsModal(item);
                        }}>
                        <Users size={15} color="#334155" style={{ marginRight: 8 }} />
                        <Text style={styles.popoverItemText}>View Admins</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.popoverItem}
                        onPress={() => {
                          setActiveActionMenuClinicId(null);
                          handleOpenEditClinicModal(item);
                        }}>
                        <Edit2 size={15} color="#334155" style={{ marginRight: 8 }} />
                        <Text style={styles.popoverItemText}>Edit Clinic</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.popoverItem}
                        onPress={() => {
                          setActiveActionMenuClinicId(null);
                          setAddAdminModalClinic(item);
                        }}>
                        <UserPlus size={15} color="#334155" style={{ marginRight: 8 }} />
                        <Text style={styles.popoverItemText}>Add Admin</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.popoverItem, { borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}
                        onPress={() => {
                          setActiveActionMenuClinicId(null);
                          handleToggleClinicStatus(item.id);
                        }}>
                        <Trash2 size={15} color={item.status === 'Active' ? '#DC2626' : '#16A34A'} style={{ marginRight: 8 }} />
                        <Text style={[styles.popoverItemText, { color: item.status === 'Active' ? '#DC2626' : '#16A34A' }]}>
                          {item.status === 'Active' ? 'Deactivate Clinic' : 'Activate Clinic'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.mobileMetaRow}>
                    <Text style={styles.metaText}>📍 {item.address}</Text>
                    <Text style={styles.metaText}>✉️ {item.email}</Text>
                    <Text style={styles.metaText}>📞 {item.phone}</Text>
                    <Text style={styles.metaText}>👥 {item.admins_count} Admins</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            /* Desktop / Wide Screen Table View */
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              nestedScrollEnabled={true}
              scrollEventThrottle={16}
              decelerationRate="normal">
              <View style={{ minWidth: 800 }}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.thCell, { flex: 2 }]}>Clinic Name</Text>
                  <Text style={[styles.thCell, { flex: 2.5 }]}>Address</Text>
                  <Text style={[styles.thCell, { flex: 2.5 }]}>Contact</Text>
                  <Text style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>Admins</Text>
                  <Text style={[styles.thCell, { flex: 1.5, textAlign: 'center' }]}>Status</Text>
                  <Text style={[styles.thCell, { flex: 1, textAlign: 'right' }]}>Actions</Text>
                </View>

                {paginatedClinics.map((item) => (
                  <View key={String(item.id)} style={styles.tableBodyRow}>
                    {/* Clinic Name */}
                    <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={styles.clinicLogoSquare}>
                        <Building color="#0D9488" size={18} />
                      </View>
                      <Text style={styles.clinicTitleText} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>

                    {/* Address */}
                    <View style={{ flex: 2.5, flexDirection: 'row', alignItems: 'center' }}>
                      <MapPin color="#94A3B8" size={14} style={{ marginRight: 4 }} />
                      <Text style={styles.tdText} numberOfLines={1}>
                        {item.address}
                      </Text>
                    </View>

                    {/* Contact */}
                    <View style={{ flex: 2.5 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Mail color="#94A3B8" size={12} style={{ marginRight: 4 }} />
                        <Text style={styles.tdText} numberOfLines={1}>
                          {item.email}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Phone color="#94A3B8" size={12} style={{ marginRight: 4 }} />
                        <Text style={styles.tdText}>{item.phone}</Text>
                      </View>
                    </View>

                    {/* Admins Count */}
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Users color="#64748B" size={14} style={{ marginRight: 4 }} />
                        <Text style={styles.tdText}>{item.admins_count}</Text>
                      </View>
                    </View>

                    {/* Status & Toggle Switch */}
                    <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <View
                        style={[
                          styles.statusPillBadge,
                          item.status === 'Active' ? styles.statusActiveBg : styles.statusInactiveBg,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            item.status === 'Active' ? styles.statusActiveText : styles.statusInactiveText,
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>

                      <Switch
                        value={item.status === 'Active'}
                        onValueChange={() => handleToggleClinicStatus(item.id)}
                        trackColor={{ false: '#E2E8F0', true: '#99F6E4' }}
                        thumbColor={item.status === 'Active' ? '#0D9488' : '#F1F5F9'}
                      />
                    </View>

                    {/* Actions Menu Popover */}
                    <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }}>
                      <TouchableOpacity
                        style={{ padding: 6 }}
                        onPress={() =>
                          setActiveActionMenuClinicId(
                            activeActionMenuClinicId === item.id ? null : item.id
                          )
                        }>
                        <MoreVertical color="#64748B" size={16} />
                      </TouchableOpacity>

                      {activeActionMenuClinicId === item.id && (
                        <View style={styles.actionPopoverMenu}>
                          {/* 1. View Clinic */}
                          <TouchableOpacity
                            style={styles.popoverItem}
                            onPress={() => {
                              setActiveActionMenuClinicId(null);
                              setViewClinicModal(item);
                            }}>
                            <Eye size={15} color="#334155" style={{ marginRight: 8 }} />
                            <Text style={styles.popoverItemText}>View Clinic</Text>
                          </TouchableOpacity>

                          {/* 2. View Admins */}
                          <TouchableOpacity
                            style={styles.popoverItem}
                            onPress={() => {
                              setActiveActionMenuClinicId(null);
                              setViewAdminsModal(item);
                            }}>
                            <Users size={15} color="#334155" style={{ marginRight: 8 }} />
                            <Text style={styles.popoverItemText}>View Admins</Text>
                          </TouchableOpacity>

                          {/* 3. Edit Clinic */}
                          <TouchableOpacity
                            style={styles.popoverItem}
                            onPress={() => {
                              setActiveActionMenuClinicId(null);
                              handleOpenEditClinicModal(item);
                            }}>
                            <Edit2 size={15} color="#334155" style={{ marginRight: 8 }} />
                            <Text style={styles.popoverItemText}>Edit Clinic</Text>
                          </TouchableOpacity>

                          {/* 4. Add Admin */}
                          <TouchableOpacity
                            style={styles.popoverItem}
                            onPress={() => {
                              setActiveActionMenuClinicId(null);
                              setAddAdminModalClinic(item);
                            }}>
                            <UserPlus size={15} color="#334155" style={{ marginRight: 8 }} />
                            <Text style={styles.popoverItemText}>Add Admin</Text>
                          </TouchableOpacity>

                          {/* 5. Deactivate Clinic / Activate Clinic */}
                          <TouchableOpacity
                            style={[styles.popoverItem, { borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 2 }]}
                            onPress={() => {
                              setActiveActionMenuClinicId(null);
                              handleToggleClinicStatus(item.id);
                            }}>
                            <Trash2 size={15} color={item.status === 'Active' ? '#DC2626' : '#16A34A'} style={{ marginRight: 8 }} />
                            <Text style={[styles.popoverItemText, { color: item.status === 'Active' ? '#DC2626' : '#16A34A' }]}>
                              {item.status === 'Active' ? 'Deactivate Clinic' : 'Activate Clinic'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredClinics.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </View>
      </ScrollView>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* ✏️ ADD & EDIT CLINIC MODAL (EXACT UPLOADED SCREENSHOTS MATCH)               */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback>
              <View style={[styles.editClinicModalCard, isMobile && { width: '96%', maxHeight: '92%' }]}>
                {/* Header */}
                <View style={styles.editClinicModalHeader}>
                  <View style={styles.editHeaderIconBox}>
                    {editingClinicId ? <Edit2 color="#0F172A" size={18} /> : <Plus color="#0F172A" size={18} />}
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.editClinicModalTitle}>
                      {editingClinicId ? `Edit Clinic: ${clinicForm.name}` : 'Register New Clinic'}
                    </Text>
                    <Text style={styles.editClinicModalSubtitle}>
                      {editingClinicId ? 'Update clinic information.' : 'Register a new clinic into the system.'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Form Body */}
                <ScrollView
                  style={{ padding: 18 }}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  decelerationRate="normal">
                  {/* Clinic Logo Upload Box */}
                  <View style={styles.clinicLogoUploadBox}>
                    <Text style={styles.logoBoxLabel}>Clinic Logo</Text>
                    <View style={styles.cameraIconCircleBadge}>
                      <Camera size={22} color="#64748B" />
                      <View style={styles.smallCloseBadge}>
                        <X size={10} color="#64748B" />
                      </View>
                    </View>
                    <TouchableOpacity style={{ marginTop: 4 }}>
                      <Text style={styles.changeLogoLink}>Change logo</Text>
                    </TouchableOpacity>
                    <Text style={styles.logoHelperText}>PNG/JPG only, max 2MB</Text>
                  </View>

                  {/* Row 1: Clinic Name & Email */}
                  <View style={[styles.grid2ColRow, isMobile && { flexDirection: 'column', gap: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>
                        Clinic Name <Text style={{ color: '#EF4444' }}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="Aarogya Care Clinic"
                        placeholderTextColor="#94A3B8"
                        value={clinicForm.name}
                        onChangeText={(v) => setClinicForm({ ...clinicForm, name: v })}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>
                        Email Address <Text style={{ color: '#EF4444' }}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="contact@aarogyacare.com"
                        placeholderTextColor="#94A3B8"
                        keyboardType="email-address"
                        value={clinicForm.email}
                        onChangeText={(v) => setClinicForm({ ...clinicForm, email: v })}
                      />
                    </View>
                  </View>

                  {/* Row 2: Phone & Address */}
                  <View style={[styles.grid2ColRow, { marginTop: 10 }, isMobile && { flexDirection: 'column', gap: 0, marginTop: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>
                        Phone Number <Text style={{ color: '#EF4444' }}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="9876543210"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        value={clinicForm.phone}
                        onChangeText={(v) => setClinicForm({ ...clinicForm, phone: v })}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>
                        Address <Text style={{ color: '#EF4444' }}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="102, Shree Heights, AB Road"
                        placeholderTextColor="#94A3B8"
                        value={clinicForm.address}
                        onChangeText={(v) => setClinicForm({ ...clinicForm, address: v })}
                      />
                    </View>
                  </View>

                  {/* Row 3: State & City Dropdowns */}
                  <View style={[styles.grid2ColRow, { marginTop: 10 }, isMobile && { flexDirection: 'column', gap: 0, marginTop: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>
                        State <Text style={{ color: '#EF4444' }}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.formDropdownSelectTrigger}
                        onPress={() => setShowFormStateDropdown(!showFormStateDropdown)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <MapPin size={14} color="#64748B" style={{ marginRight: 6 }} />
                          <Text style={styles.formDropdownText}>{clinicForm.state}</Text>
                        </View>
                        <ChevronDown size={16} color="#64748B" />
                      </TouchableOpacity>

                      {showFormStateDropdown && (
                        <View style={styles.formDropdownList}>
                          {['Arunachal Pradesh', 'Delhi', 'Maharashtra', 'Karnataka', 'Madhya Pradesh'].map((st) => (
                            <TouchableOpacity
                              key={st}
                              style={styles.formDropdownListItem}
                              onPress={() => {
                                setClinicForm({ ...clinicForm, state: st });
                                setShowFormStateDropdown(false);
                              }}>
                              <Text style={styles.formDropdownItemText}>{st}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>
                        City <Text style={{ color: '#EF4444' }}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.formDropdownSelectTrigger}
                        onPress={() => setShowFormCityDropdown(!showFormCityDropdown)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <MapPin size={14} color="#64748B" style={{ marginRight: 6 }} />
                          <Text style={styles.formDropdownText}>{clinicForm.city}</Text>
                        </View>
                        <ChevronDown size={16} color="#64748B" />
                      </TouchableOpacity>

                      {showFormCityDropdown && (
                        <View style={styles.formDropdownList}>
                          {['Bomdila', 'Itanagar', 'Mumbai', 'New Delhi', 'Bengaluru', 'Indore'].map((ct) => (
                            <TouchableOpacity
                              key={ct}
                              style={styles.formDropdownListItem}
                              onPress={() => {
                                setClinicForm({ ...clinicForm, city: ct });
                                setShowFormCityDropdown(false);
                              }}>
                              <Text style={styles.formDropdownItemText}>{ct}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Row 4: Country & Website */}
                  <View style={[styles.grid2ColRow, { marginTop: 10 }, isMobile && { flexDirection: 'column', gap: 0, marginTop: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>
                        Country <Text style={{ color: '#EF4444' }}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.formDropdownSelectTrigger}
                        onPress={() => setShowFormCountryDropdown(!showFormCountryDropdown)}>
                        <Text style={styles.formDropdownText}>{clinicForm.country}</Text>
                        <ChevronDown size={16} color="#64748B" />
                      </TouchableOpacity>

                      {showFormCountryDropdown && (
                        <View style={styles.formDropdownList}>
                          {['India', 'United States', 'United Kingdom', 'UAE'].map((cn) => (
                            <TouchableOpacity
                              key={cn}
                              style={styles.formDropdownListItem}
                              onPress={() => {
                                setClinicForm({ ...clinicForm, country: cn });
                                setShowFormCountryDropdown(false);
                              }}>
                              <Text style={styles.formDropdownItemText}>{cn}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>Website</Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="https://clinic.example.com"
                        placeholderTextColor="#94A3B8"
                        value={clinicForm.website}
                        onChangeText={(v) => setClinicForm({ ...clinicForm, website: v })}
                      />
                    </View>
                  </View>

                  {/* Row 5: License Number & Available Days */}
                  <View style={[styles.grid2ColRow, { marginTop: 10 }, isMobile && { flexDirection: 'column', gap: 0, marginTop: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>License Number</Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="L123"
                        placeholderTextColor="#94A3B8"
                        value={clinicForm.license_number}
                        onChangeText={(v) => setClinicForm({ ...clinicForm, license_number: v })}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>Available Days</Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="Mon,Tue,Wed,Thu,Fri"
                        placeholderTextColor="#94A3B8"
                        value={clinicForm.available_days}
                        onChangeText={(v) => setClinicForm({ ...clinicForm, available_days: v })}
                      />
                    </View>
                  </View>

                  {/* Row 6: Available From & Available To */}
                  <View style={[styles.grid2ColRow, { marginTop: 10 }, isMobile && { flexDirection: 'column', gap: 0, marginTop: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>Available From</Text>
                      <View style={styles.formInputBoxWithIcon}>
                        <Clock size={14} color="#64748B" style={{ marginRight: 6 }} />
                        <TextInput
                          style={styles.formInputBoxBare}
                          placeholder="12:30 AM"
                          placeholderTextColor="#94A3B8"
                          value={clinicForm.available_from}
                          onChangeText={(v) => setClinicForm({ ...clinicForm, available_from: v })}
                        />
                        <ChevronsUpDown size={14} color="#64748B" />
                      </View>
                      <Text style={styles.apiTimeHelperText}>API time: 00:30:00 (24-hour format)</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>Available To</Text>
                      <View style={styles.formInputBoxWithIcon}>
                        <Clock size={14} color="#64748B" style={{ marginRight: 6 }} />
                        <TextInput
                          style={styles.formInputBoxBare}
                          placeholder="02:30 AM"
                          placeholderTextColor="#94A3B8"
                          value={clinicForm.available_to}
                          onChangeText={(v) => setClinicForm({ ...clinicForm, available_to: v })}
                        />
                        <ChevronsUpDown size={14} color="#64748B" />
                      </View>
                      <Text style={styles.apiTimeHelperText}>API time: 02:30:00 (24-hour format)</Text>
                    </View>
                  </View>
                </ScrollView>

                {/* Footer Buttons */}
                <View style={styles.addAdminFooterRow}>
                  <TouchableOpacity
                    style={styles.addAdminCancelBtn}
                    onPress={() => setModalVisible(false)}>
                    <Text style={styles.addAdminCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.addAdminSubmitBtn}
                    onPress={handleSaveClinic}
                    disabled={clinicSaving}>
                    {clinicSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        {editingClinicId ? (
                          <Edit2 size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                        ) : (
                          <Plus size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                        )}
                        <Text style={styles.addAdminSubmitText}>
                          {editingClinicId ? 'Update Clinic' : 'Register Clinic'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 👁️ VIEW CLINIC DETAILS MODAL (EXACT SCREENSHOT 3 MATCH)                   */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <Modal visible={!!viewClinicModal} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setViewClinicModal(null)}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback>
              <View style={[styles.viewClinicCard, isMobile && { width: '96%', maxHeight: '92%' }]}>
                {/* Header Banner */}
                <View style={styles.viewClinicHeader}>
                  <View style={styles.clinicLogoSquareLarge}>
                    <Building color="#0D9488" size={24} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.viewClinicTitle}>{viewClinicModal?.name}</Text>
                    <Text style={styles.viewClinicSubtitle}>
                      {viewClinicModal?.city || 'Bomdila'} • {viewClinicModal?.country || 'India'}
                    </Text>
                    <View style={styles.viewClinicStatusTag}>
                      <Text style={styles.viewClinicStatusText}>{viewClinicModal?.status}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setViewClinicModal(null)} style={{ padding: 4 }}>
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={{ padding: 16 }}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  decelerationRate="normal">
                  {/* Contact & Identity Section */}
                  <View style={styles.viewSectionCard}>
                    <View style={styles.sectionHeaderTitleRow}>
                      <Mail size={15} color="#0D9488" style={{ marginRight: 6 }} />
                      <Text style={styles.viewSectionCardTitle}>Contact & Identity</Text>
                    </View>
                    <View style={[styles.grid2ColRow, isMobile && { flexDirection: 'column', gap: 10 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>Email Address</Text>
                        <Text style={styles.infoBoxVal}>{viewClinicModal?.email}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>Phone Number</Text>
                        <Text style={styles.infoBoxVal}>{viewClinicModal?.phone}</Text>
                      </View>
                    </View>

                    <View style={[styles.grid2ColRow, { marginTop: 12 }, isMobile && { flexDirection: 'column', gap: 10, marginTop: 10 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>Website</Text>
                        <Text style={styles.infoBoxVal}>{viewClinicModal?.website || '—'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>License Number</Text>
                        <Text style={styles.infoBoxVal}>{viewClinicModal?.license_number || 'L123'}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Location Section */}
                  <View style={[styles.viewSectionCard, { marginTop: 14 }]}>
                    <View style={styles.sectionHeaderTitleRow}>
                      <MapPin size={15} color="#0D9488" style={{ marginRight: 6 }} />
                      <Text style={styles.viewSectionCardTitle}>Location</Text>
                    </View>
                    <View style={[styles.grid2ColRow, isMobile && { flexDirection: 'column', gap: 10 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>Address</Text>
                        <Text style={styles.infoBoxVal}>{viewClinicModal?.address}</Text>
                      </View>
                    </View>

                    <View style={[styles.grid2ColRow, { marginTop: 12 }, isMobile && { flexDirection: 'column', gap: 10, marginTop: 10 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>City</Text>
                        <Text style={styles.infoBoxVal}>{viewClinicModal?.city || 'Bomdila'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>State</Text>
                        <Text style={styles.infoBoxVal}>{viewClinicModal?.state || 'Arunachal Pradesh'}</Text>
                      </View>
                    </View>

                    <View style={[styles.grid2ColRow, { marginTop: 12 }, isMobile && { flexDirection: 'column', gap: 10, marginTop: 10 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>Country</Text>
                        <Text style={styles.infoBoxVal}>{viewClinicModal?.country || 'India'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>Created</Text>
                        <Text style={styles.infoBoxVal}>{viewClinicModal?.created_at || 'Jul 29, 2026'}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Availability Section */}
                  <View style={[styles.viewSectionCard, styles.availabilityBgCard, { marginTop: 14, marginBottom: 10 }]}>
                    <View style={styles.sectionHeaderTitleRow}>
                      <CalendarIcon size={15} color="#0D9488" style={{ marginRight: 6 }} />
                      <Text style={styles.viewSectionCardTitle}>Availability</Text>
                    </View>
                    <View style={[styles.grid3ColRow, isMobile && { flexDirection: 'column', gap: 10 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>Available Days</Text>
                        <Text style={styles.infoBoxVal}>{viewClinicModal?.available_days || 'Mon,Tue,Wed,Thu,Fri'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>Available From</Text>
                        <Text style={styles.infoBoxVal}>{viewClinicModal?.available_from || '00:30'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>Available To</Text>
                        <Text style={styles.infoBoxVal}>{viewClinicModal?.available_to || '02:30'}</Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                {/* Footer */}
                <View style={styles.viewClinicFooter}>
                  <TouchableOpacity style={styles.viewClinicCloseBtn} onPress={() => setViewClinicModal(null)}>
                    <Text style={styles.viewClinicCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 👥 VIEW CLINIC ADMINS MODAL (EXACT SCREENSHOT 4 MATCH)                     */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <Modal visible={!!viewAdminsModal} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setViewAdminsModal(null)}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback>
              <View style={[styles.viewAdminsCard, isMobile && { width: '96%', maxHeight: '92%' }]}>
                {/* Header */}
                <View style={styles.viewAdminsHeader}>
                  <View style={styles.tealIconBoxSquare}>
                    <Users color="#FFFFFF" size={20} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.viewAdminsTitle}>
                      Clinic Admins — <Text style={{ color: '#0D9488' }}>{viewAdminsModal?.name}</Text>
                    </Text>
                    <Text style={styles.viewAdminsSubtitle}>
                      Manage administrators for this clinic
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setViewAdminsModal(null)}>
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Sub-bar with Add New Admin button */}
                <View style={styles.viewAdminsSubHeaderRow}>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity
                    style={styles.addNewAdminBtn}
                    onPress={() => {
                      const c = viewAdminsModal;
                      setViewAdminsModal(null);
                      setAddAdminModalClinic(c);
                    }}>
                    <Plus color="#FFFFFF" size={14} style={{ marginRight: 4 }} />
                    <Text style={styles.addNewAdminBtnText}>Add New Admin</Text>
                  </TouchableOpacity>
                </View>

                {/* Admins Table Container */}
                <ScrollView
                  style={{ paddingHorizontal: 16, paddingBottom: 16 }}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  decelerationRate="normal">
                  {isMobile ? (
                    /* Mobile Card View (No Data Overlap) */
                    <View style={{ gap: 10 }}>
                      {adminsList.map((admin) => (
                        <View key={admin.id} style={styles.mobileAdminCardItem}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                              <View style={styles.adminAvatarCircle}>
                                <Users size={14} color="#0D9488" />
                              </View>
                              <Text style={styles.adminNameText}>{admin.full_name}</Text>
                            </View>
                            <TouchableOpacity
                              style={[
                                styles.adminStatusPill,
                                admin.status === 'Active' ? styles.statusActiveBg : styles.statusInactiveBg,
                              ]}
                              onPress={() => handleToggleClinicAdminStatus(admin.id)}>
                              <Text
                                style={[
                                  styles.adminStatusText,
                                  admin.status === 'Active' ? styles.statusActiveText : styles.statusInactiveText,
                                ]}>
                                {admin.status}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          <View style={{ marginTop: 8, gap: 4 }}>
                            <Text style={styles.adminTdText}>✉️ {admin.email}</Text>
                            <Text style={styles.adminTdText}>📞 {admin.phone}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    /* Desktop Table View (No Delete Button) */
                    <View style={styles.adminsTableContainer}>
                      <View style={styles.adminsTableHeaderRow}>
                        <Text style={[styles.adminsTh, { flex: 2.2 }]}>Name</Text>
                        <Text style={[styles.adminsTh, { flex: 2.5 }]}>Email</Text>
                        <Text style={[styles.adminsTh, { flex: 1.8 }]}>Phone</Text>
                        <Text style={[styles.adminsTh, { flex: 1.2, textAlign: 'center' }]}>Status</Text>
                        <Text style={[styles.adminsTh, { flex: 1, textAlign: 'right' }]}>Actions</Text>
                      </View>

                      {adminsList.map((admin) => (
                        <View key={admin.id} style={styles.adminsTableBodyRow}>
                          {/* Name + Avatar */}
                          <View style={{ flex: 2.2, flexDirection: 'row', alignItems: 'center' }}>
                            <View style={styles.adminAvatarCircle}>
                              <Users size={14} color="#0D9488" />
                            </View>
                            <Text style={styles.adminNameText} numberOfLines={1}>
                              {admin.full_name}
                            </Text>
                          </View>

                          {/* Email */}
                          <Text style={[styles.adminTdText, { flex: 2.5 }]} numberOfLines={1}>
                            {admin.email}
                          </Text>

                          {/* Phone */}
                          <Text style={[styles.adminTdText, { flex: 1.8 }]}>{admin.phone}</Text>

                          {/* Status */}
                          <View style={{ flex: 1.2, alignItems: 'center' }}>
                            <TouchableOpacity
                              style={[
                                styles.adminStatusPill,
                                admin.status === 'Active' ? styles.statusActiveBg : styles.statusInactiveBg,
                              ]}
                              onPress={() => handleToggleClinicAdminStatus(admin.id)}>
                              <Text
                                style={[
                                  styles.adminStatusText,
                                  admin.status === 'Active' ? styles.statusActiveText : styles.statusInactiveText,
                                ]}>
                                {admin.status}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {/* Actions (Delete Button Removed) */}
                          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end' }}>
                            <TouchableOpacity
                              onPress={() => {
                                showSuccessToast('Edit Admin', `Editing ${admin.full_name}`);
                              }}>
                              <Edit2 size={15} color="#334155" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 👤+ ADD CLINIC ADMIN MODAL (EXACT SCREENSHOT 5 MATCH)                      */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <Modal visible={!!addAdminModalClinic} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setAddAdminModalClinic(null)}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback>
              <View style={[styles.addAdminCard, isMobile && { width: '96%', maxHeight: '92%' }]}>
                {/* Header */}
                <View style={styles.addAdminHeader}>
                  <View style={styles.userPlusIconBox}>
                    <UserPlus color="#0D9488" size={20} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.addAdminTitle}>
                      Add Clinic Admin for {addAdminModalClinic?.name}
                    </Text>
                    <Text style={styles.addAdminSubtitle}>
                      Create a new clinic administrator account. They will have full access to manage this clinic.
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setAddAdminModalClinic(null)}>
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Form Body */}
                <ScrollView
                  style={{ padding: 18 }}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  decelerationRate="normal">
                  <Text style={styles.formGroupHeader}>Admin Information</Text>

                  <View style={[styles.grid2ColRow, isMobile && { flexDirection: 'column', gap: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>
                        Full Name <Text style={{ color: '#EF4444' }}>*</Text>
                      </Text>
                      <TextInput
                        style={[styles.formInputBox, styles.formInputFocused]}
                        placeholder="Enter full name"
                        placeholderTextColor="#94A3B8"
                        value={adminFullName}
                        onChangeText={setAdminFullName}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>
                        Email Address <Text style={{ color: '#EF4444' }}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="admin@clinic.com"
                        placeholderTextColor="#94A3B8"
                        keyboardType="email-address"
                        value={adminEmail}
                        onChangeText={setAdminEmail}
                      />
                    </View>
                  </View>

                  <View style={[styles.grid2ColRow, { marginTop: 10 }, isMobile && { flexDirection: 'column', gap: 0, marginTop: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>
                        Phone Number <Text style={{ color: '#EF4444' }}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="9876543210"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        value={adminPhone}
                        onChangeText={setAdminPhone}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>
                        Password <Text style={{ color: '#EF4444' }}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="Enter secure password"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry
                        value={adminPassword}
                        onChangeText={setAdminPassword}
                      />
                    </View>
                  </View>

                  <Text style={styles.formLabelText}>Address</Text>
                  <TextInput
                    style={[styles.formInputBox, { height: 60, textAlignVertical: 'top' }]}
                    placeholder="Enter clinic admin's address (optional)"
                    placeholderTextColor="#94A3B8"
                    multiline
                    value={adminAddress}
                    onChangeText={setAdminAddress}
                  />

                  {/* Assigned Clinic Card */}
                  <View style={styles.assignedClinicCard}>
                    <Text style={styles.assignedClinicHeaderLabel}>Assigned Clinic</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Building size={16} color="#0D9488" style={{ marginRight: 6 }} />
                      <Text style={styles.assignedClinicName}>{addAdminModalClinic?.name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                      <MapPin size={14} color="#64748B" style={{ marginRight: 6 }} />
                      <Text style={styles.assignedClinicAddress}>{addAdminModalClinic?.address}</Text>
                    </View>
                  </View>
                </ScrollView>

                {/* Footer Buttons */}
                <View style={styles.addAdminFooterRow}>
                  <TouchableOpacity
                    style={styles.addAdminCancelBtn}
                    onPress={() => setAddAdminModalClinic(null)}>
                    <Text style={styles.addAdminCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.addAdminSubmitBtn}
                    onPress={handleCreateClinicAdmin}
                    disabled={addAdminSaving}>
                    {addAdminSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <UserPlus size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.addAdminSubmitText}>Create Clinic Admin</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 14, paddingBottom: 60 },

  // Top Banner
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  bannerRowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  buildingIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  bannerSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },

  upgradeLinkBtn: { paddingVertical: 4 },
  upgradeLinkText: { color: '#64748B', fontSize: 13, fontWeight: '500' },
  upgradeLinkHighlight: { color: '#0D9488', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },

  // Top Container Card
  topCardBorder: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
    elevation: 1,
  },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  controlsRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  controlLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4, textTransform: 'uppercase' },

  controlSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  controlSelectBtnText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },

  controlDropdownMenu: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 4,
    elevation: 6,
    zIndex: 99,
  },
  controlDropdownItem: { paddingHorizontal: 12, paddingVertical: 8 },
  controlDropdownItemText: { fontSize: 13, color: '#334155' },

  refreshCol: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  refreshDashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshDashBtnText: { color: '#334155', fontSize: 13, fontWeight: '600' },
  lastRefreshedText: { fontSize: 11, color: '#94A3B8', marginTop: 4 },

  sectionHeaderRow: { marginTop: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  sectionSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },

  // KPI Grid 4
  kpiGrid4: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  kpiGrid3: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  kpiGridMobile: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  kpiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  kpiCardDesktop: { width: '23.8%' },
  kpiCardDesktop3: { width: '32%' },
  kpiCardMobile: { width: '48.5%', padding: 10 },

  kpiLabel: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  kpiValue: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  kpiSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

  kpiIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  kpiCardSnapshot: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
  },
  snapshotValue: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  snapshotLabel: { fontSize: 12, color: '#64748B', marginTop: 1, fontWeight: '600' },

  // Middle Metric Grid 4
  metricGrid4: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  metricIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  metricLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },

  // Search and Filter Bar
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A' },

  statusTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 42,
    minWidth: 120,
  },
  statusTriggerBtnText: { fontSize: 13, color: '#334155', fontWeight: '600' },
  statusDropdownMenu: {
    position: 'absolute',
    top: 46,
    right: 0,
    minWidth: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 4,
    elevation: 6,
    zIndex: 99,
  },
  statusDropdownItem: { paddingHorizontal: 12, paddingVertical: 8 },
  statusDropdownItemText: { fontSize: 13, color: '#334155' },

  // Table Card
  tableCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 20,
  },
  tableHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableTitleText: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  columnsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  columnsBtnText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },

  // Table Structure
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thCell: { fontSize: 12, fontWeight: '700', color: '#64748B' },

  tableBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  clinicLogoSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  clinicTitleText: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  codeText: { fontSize: 11, color: '#64748B', marginTop: 1 },
  tdText: { fontSize: 12, color: '#334155' },

  statusPillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusActiveBg: { backgroundColor: '#DCFCE7' },
  statusInactiveBg: { backgroundColor: '#FEE2E2' },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  statusActiveText: { color: '#166534' },
  statusInactiveText: { color: '#991B1B' },

  // Mobile Cards
  mobileClinicCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
  },
  mobileMetaRow: { gap: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  metaText: { fontSize: 12, color: '#475569' },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', maxWidth: 440, alignSelf: 'center', width: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  label: { fontSize: 12, fontWeight: '600', color: '#334155', marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#0F172A' },
  modalBtnRow: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', justifyContent: 'flex-end' },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8 },
  cancelText: { color: '#475569', fontWeight: '600', fontSize: 13 },
  saveBtn: { backgroundColor: '#0D9488', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  saveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  // Action Popover Menu (Screenshot 2 Match)
  actionPopoverMenu: {
    position: 'absolute',
    top: 32,
    right: 0,
    width: 175,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 6,
    paddingHorizontal: 4,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    zIndex: 999,
  },
  popoverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  popoverItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },

  // View Clinic Modal Styles (Screenshot 3 Match)
  viewClinicCard: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    alignSelf: 'center',
  },
  viewClinicHeader: {
    backgroundColor: '#ECFDF5',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  clinicLogoSquareLarge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewClinicTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  viewClinicSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  viewClinicStatusTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  viewClinicStatusText: { fontSize: 11, fontWeight: '700', color: '#166534' },

  viewSectionCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
  },
  availabilityBgCard: {
    backgroundColor: '#F0FDFA',
    borderColor: '#CCFBF1',
  },
  sectionHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  viewSectionCardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  grid2ColRow: { flexDirection: 'row', gap: 16 },
  grid3ColRow: { flexDirection: 'row', gap: 12 },
  infoBoxLabel: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  infoBoxVal: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginTop: 3 },

  viewClinicFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
  },
  viewClinicCloseBtn: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 8,
  },
  viewClinicCloseBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  // View Admins Modal Styles (Screenshot 4 Match)
  viewAdminsCard: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    alignSelf: 'center',
  },
  viewAdminsHeader: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tealIconBoxSquare: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAdminsTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  viewAdminsSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  viewAdminsSubHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addNewAdminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addNewAdminBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  adminsTableContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  adminsTableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  adminsTh: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  adminsTableBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  adminAvatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  adminNameText: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  adminTdText: { fontSize: 12, color: '#475569' },
  adminStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  adminStatusText: { fontSize: 11, fontWeight: '700' },

  // Add Admin Modal Styles (Screenshot 5 Match)
  addAdminCard: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    alignSelf: 'center',
  },
  addAdminHeader: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  userPlusIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAdminTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  addAdminSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 16 },
  formGroupHeader: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  formLabelText: { fontSize: 12, fontWeight: '600', color: '#334155', marginTop: 10, marginBottom: 4 },
  formInputBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  formInputFocused: {
    borderColor: '#0D9488',
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },

  assignedClinicCard: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    marginBottom: 6,
  },
  assignedClinicHeaderLabel: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  assignedClinicName: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  assignedClinicAddress: { fontSize: 12, color: '#64748B' },

  addAdminFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  addAdminCancelBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  addAdminCancelText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  addAdminSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  addAdminSubmitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  // Edit / Add Clinic Modal Specific Styles
  editClinicModalCard: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    alignSelf: 'center',
  },
  clinicLogoUploadBox: {
    alignSelf: 'center',
    width: 220,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 12,
  },
  cameraIconCircleBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  smallCloseBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  formDropdownSelectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#F8FAFC',
  },
  formDropdownText: {
    fontSize: 13,
    color: '#0F172A',
  },
  formDropdownList: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 150,
    elevation: 3,
    zIndex: 99,
  },
  formDropdownListItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  formDropdownItemText: {
    fontSize: 13,
    color: '#334155',
  },
  formInputBoxWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFC',
  },
  formInputBoxBare: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  editClinicModalHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  editHeaderIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editClinicModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  editClinicModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  logoBoxLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  changeLogoLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0D9488',
  },
  logoHelperText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  apiTimeHelperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  mobileAdminCardItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
});

export default ClinicsManagementScreen;
