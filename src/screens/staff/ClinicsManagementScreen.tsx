import { colors, radii, shadows, spacing, typography } from '../../theme/tokens';
// src/screens/staff/ClinicsManagementScreen.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Alert,
  Linking,
  Image,
  Modal,
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
import { LiquidBorderScrollView } from '../../components/common/LiquidBorderScrollView';
import {
  Building2,
  Search,
  ChevronDown,
  Columns,
  MoreVertical,
  Calendar as CalendarIcon,
  CalendarDays,
  Check,
  CheckCircle2,
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
  EyeOff,
  KeyRound,
  Edit2,
  UserPlus,
  Trash2,
  Clock,
  Camera,
  ChevronsUpDown,
} from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { LiquidBorderSurface } from '../../components/common/LiquidBorderSurface';
import { RefreshButton } from '../../components/common/RefreshButton';
import { Pagination } from '../../components/common/Pagination';
import { CustomCalendarPicker } from '../../components/common/CustomCalendarPicker';
import { ColumnSelectorModal } from '../../components/common/ColumnSelectorModal';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { useAuthContext } from '../../context/AuthContext';
import { useRemoteData } from '../../hooks/useRemoteData';
import { fetchUserRolesApi } from '../../api/roleManagementApi';
import { dashboardNumber, displayAmount } from '../../utils/dashboardValues';
import { RequestState } from '../../components/common/RequestState';
import { chooseAndUploadClinicLogo, profilePhotoUrl } from '../../api/profilePhotoApi';
import { resetStaffPasswordApi } from '../../api/userManagementApi';
import { apiFetch } from '../../api/apiConfig';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { notifyProfileUpdated } from '../../utils/profileEvents';
import { createTapGestureHandlers } from '../../utils/tapGestureHandlers';

interface Props {
  onOpenDrawer: () => void;
  onNavigateScreen?: (screen: string) => void;
  initialClinicId?: string;
}

export interface ClinicItem {
  id: string | number;
  name: string;
  code: string;
  logo_url?: string;
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
  logo_url?: string;
  subscription_plan?: string;
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
  subscription_plan: 'basic',
  name: '',
  email: '',
  phone: '',
  address: '',
  state: '',
  city: '',
  country: 'India',
  website: '',
  license_number: '',
  available_days: 'Mon,Tue,Wed,Thu,Fri',
  available_from: '12:30 AM',
  available_to: '02:30 AM',
};

export interface ClinicAdminItem {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address?: string;
  status: 'Active' | 'Inactive';
}

export type ClinicColumnKey =
  | 'name'
  | 'address'
  | 'contact'
  | 'created'
  | 'country'
  | 'website'
  | 'license_number'
  | 'available_days'
  | 'available_from'
  | 'available_to'
  | 'admins'
  | 'status'
  | 'actions';

export const clinicColumnOptions: Array<{
  key: ClinicColumnKey;
  label: string;
  defaultVisible: boolean;
}> = [
  { key: 'name', label: 'Clinic Name', defaultVisible: true },
  { key: 'address', label: 'Address', defaultVisible: true },
  { key: 'contact', label: 'Contact', defaultVisible: true },
  { key: 'created', label: 'Created', defaultVisible: false },
  { key: 'country', label: 'Country', defaultVisible: false },
  { key: 'website', label: 'Website', defaultVisible: false },
  { key: 'license_number', label: 'License Number', defaultVisible: false },
  { key: 'available_days', label: 'Available Days', defaultVisible: false },
  { key: 'available_from', label: 'Available From', defaultVisible: false },
  { key: 'available_to', label: 'Available To', defaultVisible: false },
  { key: 'admins', label: 'Admins', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'actions', label: 'Actions', defaultVisible: true },
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

export const ClinicsManagementScreen: React.FC<Props> = ({ onOpenDrawer, onNavigateScreen, initialClinicId }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { token, user, activeClinicId, activeClinicName, isMultiClinic, isMultiPlan, role, permissionsMap = {}, updateClinicName, switchClinic } = useAuthContext();
  const canView = canUseStaffScreen(role, permissionsMap, 'clinics');
  // Match web Clinic Management: use the explicit add permission independently
  // of the view permission, then apply the multi-clinic plan gate at the action.
  const canAdd = canUseStaffScreen(role, permissionsMap, 'clinics', 'add');
  const canEdit = canView && canUseStaffScreen(role, permissionsMap, 'clinics', 'edit');
  const canDelete = canView && canUseStaffScreen(role, permissionsMap, 'clinics', 'delete');
  const canViewAdmins = canUseStaffScreen(role, permissionsMap, 'staff');
  const canAddAdmin = canViewAdmins && canUseStaffScreen(role, permissionsMap, 'staff', 'add');
  const canEditAdmin = canViewAdmins && canUseStaffScreen(role, permissionsMap, 'staff', 'edit');
  const canDeleteAdmin = canViewAdmins && canUseStaffScreen(role, permissionsMap, 'staff', 'delete');
  const scope = [token, user?.id, activeClinicId, canView, canAdd, canEdit, canDelete, canViewAdmins, canAddAdmin, canEditAdmin, canDeleteAdmin].join(':');
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const busyRef = useRef(false);
  useEffect(() => { scopeRef.current = scope; return () => { scopeRef.current = ''; }; }, [scope]);

  const resource = useRemoteData(scope + ':clinics', async (signal) => {
    const response = await apiFetch<{ clinics: any[] }>('/clinics/my-clinics', { signal });
    if (!response.success || !Array.isArray(response.data?.clinics)) throw new Error(response.message);
    return { rows: response.data.clinics.map(c => ({ ...c, id: c.id, name: c.name || '',
      code: c.code || '', email: c.email || '', phone: c.phone || '', address: c.address || '',
      admins_count: c.admins_count, status: Number(c.is_active) === 1 ? 'Active' : 'Inactive',
    } as ClinicItem)), refreshed: new Date().toLocaleString() };
  }, Boolean(token && canView));
  const clinics = useMemo(() => resource.data?.rows ?? [], [resource.data]);
  const adminCounts = useRemoteData(scope + ':admin-counts:' + clinics.map(c => c.id).join(','), async (signal) => {
    const results = await Promise.all(clinics.map(async clinic => {
      const response = await apiFetch<{ data: Array<{ id: number | string }> }>(
        '/staff/clinic/' + encodeURIComponent(String(clinic.id)) + '/admin-network', { signal },
      );
      if (!response.success || !Array.isArray(response.data?.data)) throw new Error(response.message);
      return { clinicId: String(clinic.id), ids: [...new Set(response.data.data.map(admin => String(admin.id)))] };
    }));
    return { byClinic: Object.fromEntries(results.map(row => [row.clinicId, row.ids.length])),
      total: new Set(results.flatMap(row => row.ids)).size };
  }, Boolean(token && canView && canViewAdmins && clinics.length));
  const isMultiClinicPlan = role === 'super_admin' || Boolean(isMultiPlan || isMultiClinic);
  const [selectedClinicFilter, setSelectedClinicFilter] = useState<string>(activeClinicName || '');
  useEffect(() => {
    if (!initialClinicId) return;
    const initialClinic = clinics.find(clinic => String(clinic.id) === String(initialClinicId));
    if (initialClinic) setSelectedClinicFilter(initialClinic.name);
  }, [clinics, initialClinicId]);
  const [selectedPerformanceDate, setSelectedPerformanceDate] = useState<Date>(new Date());
  const [activeDashboardCard, setActiveDashboardCard] = useState<string | null>(null);
  const [activeClinicParent, setActiveClinicParent] = useState<'dashboard' | 'filters' | 'clinics' | null>(null);
  const dashboardParentTapHandlers = useMemo(
    () => createTapGestureHandlers(() => {
      setSearchFocused(false);
      setShowStatusDropdown(false);
      setActiveClinicParent('dashboard');
    }),
    [],
  );
  const filtersParentTapHandlers = useMemo(
    () => createTapGestureHandlers(() => {
      setActiveDashboardCard(null);
      setActiveClinicParent('filters');
    }),
    [],
  );
  const clinicsParentTapHandlers = useMemo(
    () => createTapGestureHandlers(() => {
      setSearchFocused(false);
      setShowStatusDropdown(false);
      setActiveDashboardCard(null);
      setActiveClinicParent('clinics');
    }),
    [],
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('Active');
  const [showStatusDropdown, setShowStatusDropdown] = useState<boolean>(false);
  const [showClinicSelectDropdown, setShowClinicSelectDropdown] = useState<boolean>(false);

  // Show / Hide Columns state
  const [showColumnsModal, setShowColumnsModal] = useState<boolean>(false);
  const [visibleClinicColumns, setVisibleClinicColumns] = useState<Record<ClinicColumnKey, boolean>>(() =>
    Object.fromEntries(clinicColumnOptions.map((c) => [c.key, c.defaultVisible])) as Record<ClinicColumnKey, boolean>
  );

  const toggleClinicColumn = (key: ClinicColumnKey) => {
    setVisibleClinicColumns((prev) => {
      const isCurrentlyVisible = prev[key];
      const visibleCount = Object.values(prev).filter(Boolean).length;
      if (isCurrentlyVisible && visibleCount <= 1) {
        showErrorToast('At least one column must remain visible');
        return prev;
      }
      return {
        ...prev,
        [key]: !isCurrentlyVisible,
      };
    });
  };

  const resetClinicColumns = () => {
    setVisibleClinicColumns(
      Object.fromEntries(clinicColumnOptions.map((c) => [c.key, c.defaultVisible])) as Record<ClinicColumnKey, boolean>
    );
  };

  const tableMinWidth = useMemo(() => {
    let w = 0;
    if (visibleClinicColumns.name) w += 220;
    if (visibleClinicColumns.address) w += 200;
    if (visibleClinicColumns.contact) w += 200;
    if (visibleClinicColumns.created) w += 130;
    if (visibleClinicColumns.country) w += 110;
    if (visibleClinicColumns.website) w += 160;
    if (visibleClinicColumns.license_number) w += 150;
    if (visibleClinicColumns.available_days) w += 150;
    if (visibleClinicColumns.available_from) w += 120;
    if (visibleClinicColumns.available_to) w += 120;
    if (visibleClinicColumns.admins) w += 90;
    if (visibleClinicColumns.status) w += 140;
    if (visibleClinicColumns.actions) w += 80;
    return Math.max(width - 40, w);
  }, [visibleClinicColumns, width]);

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
        selectedStatusFilter === 'All Status' || item.status === selectedStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clinics, searchQuery, selectedStatusFilter]);

  const totalPages = Math.ceil(filteredClinics.length / pageSize) || 1;

  const paginatedClinics = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClinics.slice(start, start + pageSize);
  }, [filteredClinics, currentPage, pageSize]);

  const selectedClinicId = clinics.find(c => c.name === selectedClinicFilter)?.id || activeClinicId;
  const selectedDate = [selectedPerformanceDate.getFullYear(), String(selectedPerformanceDate.getMonth() + 1).padStart(2, '0'), String(selectedPerformanceDate.getDate()).padStart(2, '0')].join('-');
  const performance = useRemoteData(scope + ':performance:' + selectedClinicId + ':' + selectedDate, async (signal) => {
    if (!selectedClinicId) throw new Error('Select a clinic');
    const result = await apiFetch<{ stats: Record<string, unknown> }>('/dashboard?clinic_id=' + selectedClinicId + '&date=' + selectedDate, { signal });
    if (!result.success || !result.data?.stats) throw new Error(result.message);
    return result.data.stats;
  }, Boolean(token && canView && selectedClinicId));
  useEffect(() => { if (performance.error) showErrorToast('Performance unavailable', 'Please use Refresh to retry.'); }, [performance.error]);
  const metric = (key: string) => dashboardNumber(performance.data?.[key]);
  const treatment = metric('treatment_revenue_today'), medicine = metric('medicine_revenue_today');
  const dailyRevenue = treatment !== null && medicine !== null ? treatment + medicine : null;
  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedStatusFilter, pageSize, scope]);
  useEffect(() => { setSelectedClinicFilter(activeClinicName || ''); }, [activeClinicName]);
  const mutate = async (action: () => Promise<{ success: boolean; message?: string }>, done: () => void) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const result = await action();
      if (scopeRef.current !== scope) return;
      if (!result.success) throw new Error(result.message);
      done(); await Promise.all([resource.refresh(), adminCounts.refresh()]);
    } catch (error) {
      if (scopeRef.current === scope) showErrorToast('Unable to save', error instanceof Error ? error.message : 'Please retry.');
    } finally { busyRef.current = false; }
  };

  const handleToggleClinicStatus = (id: string | number) => {
    const targetClinic = clinics.find((c) => String(c.id) === String(id));
    if (!targetClinic || (targetClinic.status === 'Active' ? !canDelete : !canEdit)) return;

    const isCurrentlyActive = targetClinic.status === 'Active';
    const actionText = isCurrentlyActive ? 'deactivate' : 'activate';
    const message = `Are you sure you want to ${actionText} clinic "${targetClinic.name}"?`;

    const executeToggle = () => mutate(() => apiFetch('/clinics/' + id, {
      method: 'PUT', body: JSON.stringify({ is_active: isCurrentlyActive ? 0 : 1 }),
    }), () => showSuccessToast('Status Updated', 'Clinic status updated successfully.'));

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
  const admins = useRemoteData(scope + ':admins:' + viewAdminsModal?.id, async (signal) => {
    const result = await apiFetch<{ data: any[] }>('/staff/clinic/' + viewAdminsModal!.id + '/admin-network', { signal });
    if (!result.success || !Array.isArray(result.data?.data)) throw new Error(result.message);
    return result.data.data.map(a => ({ ...a, id: String(a.id), address: a.address || '', status: Number(a.is_active) === 1 ? 'Active' : 'Inactive' } as ClinicAdminItem));
  }, Boolean(viewAdminsModal && canViewAdmins));
  const adminsList = admins.data ?? [];
  useEffect(() => { if (admins.error) showErrorToast('Unable to load administrators', 'Close and reopen to retry.'); }, [admins.error]);

  // Add Clinic Admin Modal State (Screenshot 5)
  const [addAdminModalClinic, setAddAdminModalClinic] = useState<ClinicItem | null>(null);
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAddress, setAdminAddress] = useState('');
  const [addAdminSaving, setAddAdminSaving] = useState(false);

  // Admin Handlers
  const handleCreateClinicAdmin = async () => {
    if (!canAddAdmin || addAdminSaving || !addAdminModalClinic || busyRef.current) return;
    if (!adminFullName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim()) || !/^[6-9]\d{9}$/.test(adminPhone) || adminPassword.length < 8) {
      showErrorToast('Validation Error', 'Enter valid name, email, mobile and a password of at least 8 characters.'); return;
    }
    setAddAdminSaving(true);
    try {
      await mutate(async () => {
        const roles = await fetchUserRolesApi(addAdminModalClinic.id);
        if (!roles.success) return roles;
        const role = roles.data?.find((r: any) => String(r.role_name).toLowerCase().replace(/ /g, '_') === 'clinic_admin') as any;
        if (!role) return { success: false, message: 'Clinic Admin role is unavailable.' };
        return apiFetch('/staff', { method: 'POST', body: JSON.stringify({ full_name: adminFullName.trim(),
          email: adminEmail.trim(), phone: adminPhone, password: adminPassword, address: adminAddress,
          clinic_id: addAdminModalClinic.id, role_id: role.role_id || role.id }) });
      }, () => {
        setAddAdminModalClinic(null); setAdminFullName(''); setAdminEmail(''); setAdminPhone(''); setAdminPassword(''); setAdminAddress('');
        showSuccessToast('Admin Created', 'Clinic administrator created successfully.');
      });
    } finally { if (scopeRef.current === scope) setAddAdminSaving(false); }
  };
  const handleToggleClinicAdminStatus = (id: string) => {
    const admin = adminsList.find(a => a.id === id);
    if (!admin || !canEditAdmin || (admin.status === 'Active' && !canDeleteAdmin)) return;
    void mutate(() => apiFetch('/staff/' + id, { method: 'PUT', body: JSON.stringify({ is_active: admin.status === 'Active' ? 0 : 1 }) }),
      () => { void admins.refresh(); showSuccessToast('Status Updated', 'Administrator status updated.'); });
  };

  // Edit Clinic Admin State
  const [editingClinicAdmin, setEditingClinicAdmin] = useState<ClinicAdminItem | null>(null);
  const [editAdminFullName, setEditAdminFullName] = useState('');
  const [editAdminPhone, setEditAdminPhone] = useState('');
  const [editAdminAddress, setEditAdminAddress] = useState('');
  const [editAdminIsActive, setEditAdminIsActive] = useState(true);
  const [showEditAdminStatusDropdown, setShowEditAdminStatusDropdown] = useState(false);
  const [editAdminSaving, setEditAdminSaving] = useState(false);
  const adminDetail = useRemoteData(scope + ':admin-detail:' + editingClinicAdmin?.id, async signal => {
    const result = await apiFetch<any>('/staff/' + editingClinicAdmin!.id, { signal });
    if (!result.success || !result.data) throw new Error(result.message);
    return result.data.staff || result.data;
  }, Boolean(editingClinicAdmin && canEditAdmin));
  useEffect(() => {
    if (!adminDetail.data) return;
    setEditAdminFullName(adminDetail.data.full_name || ''); setEditAdminPhone(adminDetail.data.phone || '');
    setEditAdminAddress(adminDetail.data.address || ''); setEditAdminIsActive(Number(adminDetail.data.is_active) === 1);
  }, [adminDetail.data]);

  // Reset Password State
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetPasswordSaving, setResetPasswordSaving] = useState(false);
  const [resetPasswordErrors, setResetPasswordErrors] = useState<{ password?: string; confirm?: string }>({});

  const handleOpenEditClinicAdmin = (admin: ClinicAdminItem) => {
    if (!canEditAdmin) return;
    setEditingClinicAdmin(admin);
    setEditAdminFullName(admin.full_name || '');
    setEditAdminPhone(admin.phone || '');
    setEditAdminAddress(admin.address || '');
    setEditAdminIsActive(admin.status === 'Active');
    setShowEditAdminStatusDropdown(false);
  };

  const handleSaveEditClinicAdmin = async () => {
    if (!editingClinicAdmin || editAdminSaving || busyRef.current || !canEditAdmin || !adminDetail.data || adminDetail.loading || adminDetail.error) return;
    if (!editAdminFullName.trim() || !/^[6-9]\d{9}$/.test(editAdminPhone.trim())) {
      showErrorToast('Validation Error', 'Enter valid full name and 10-digit mobile number.');
      return;
    }
    setEditAdminSaving(true);
    try {
      await mutate(
        () =>
          apiFetch('/staff/' + editingClinicAdmin.id, {
            method: 'PUT',
            body: JSON.stringify({
              full_name: editAdminFullName.trim(),
              phone: editAdminPhone.trim(),
              address: editAdminAddress.trim(),
              is_active: editAdminIsActive ? 1 : 0,
            }),
          }),
        () => {
          setEditingClinicAdmin(null);
          void admins.refresh();
          showSuccessToast('Success', 'Clinic admin updated successfully.');
        }
      );
    } finally {
      if (scopeRef.current === scope) setEditAdminSaving(false);
    }
  };

  const handleOpenResetPassword = () => {
    if (!editingClinicAdmin) return;
    setNewPasswordVal('');
    setConfirmPasswordVal('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setResetPasswordErrors({});
    setIsResetPasswordOpen(true);
  };

  const handleExecuteResetPassword = async () => {
    if (!editingClinicAdmin || resetPasswordSaving || busyRef.current) return;
    const errors: { password?: string; confirm?: string } = {};
    if (!newPasswordVal.trim()) {
      errors.password = 'New password is required.';
    } else if (newPasswordVal.length < 8) {
      errors.password = 'Password must contain at least 8 characters.';
    }

    if (!confirmPasswordVal.trim()) {
      errors.confirm = 'Please confirm the new password.';
    } else if (confirmPasswordVal !== newPasswordVal) {
      errors.confirm = 'Passwords do not match.';
    }

    setResetPasswordErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setResetPasswordSaving(true);
    try {
      await mutate(
        () => resetStaffPasswordApi(editingClinicAdmin.id, newPasswordVal),
        () => {
          setIsResetPasswordOpen(false);
          setNewPasswordVal('');
          setConfirmPasswordVal('');
          setResetPasswordErrors({});
          showSuccessToast('Success', `Password reset successfully for ${editingClinicAdmin.full_name}.`);
        }
      );
    } finally {
      if (scopeRef.current === scope) setResetPasswordSaving(false);
    }
  };

  const handleDeleteClinicAdmin = (admin: ClinicAdminItem) => {
    if (!canDeleteAdmin || busyRef.current) return;
    const message = `Are you sure you want to delete clinic admin "${admin.full_name}"? This action cannot be undone.`;
    const executeDelete = () =>
      mutate(
        () => apiFetch('/staff/' + admin.id, { method: 'DELETE' }),
        () => {
          void admins.refresh();
          void adminCounts.refresh();
          showSuccessToast('Success', `Clinic admin "${admin.full_name}" deleted successfully.`);
        }
      );

    const globalObj: any = typeof globalThis !== 'undefined' ? globalThis : {};
    if (globalObj.window && typeof globalObj.window.confirm === 'function') {
      if (globalObj.window.confirm(message)) {
        void executeDelete();
      }
    } else {
      Alert.alert(
        'Confirm Deletion',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => void executeDelete() },
        ],
        { cancelable: true }
      );
    }
  };

  // Register / Edit Clinic Modal State (Screenshots 1 & 2 Match)
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClinicId, setEditingClinicId] = useState<string | number | null>(null);
  const [clinicForm, setClinicForm] = useState<ClinicFormState>(DEFAULT_CLINIC_FORM);
  const [showFormStateDropdown, setShowFormStateDropdown] = useState(false);
  const [showFormCityDropdown, setShowFormCityDropdown] = useState(false);
  const [showFormCountryDropdown, setShowFormCountryDropdown] = useState(false);
  const [clinicSaving, setClinicSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const logoEditor = useRef(0);
  useEffect(() => { logoEditor.current += 1; setLogoUploading(false); }, [modalVisible, editingClinicId, scope]);
  useEffect(() => { setLogoFailed(false); }, [clinicForm.logo_url]);
  const handleChooseLogo = async () => {
    if (busyRef.current || (editingClinicId ? !canEdit : !canAdd || !isMultiClinicPlan)) return;
    const revision = logoEditor.current;
    const current = () => scopeRef.current === scope && logoEditor.current === revision;
    busyRef.current = true; setLogoUploading(true);
    try {
      const url = await chooseAndUploadClinicLogo(current);
      if (url && current()) setClinicForm(form => ({ ...form, logo_url: url }));
    } catch (error) {
      if (current()) showErrorToast('Unable to upload logo', error instanceof Error ? error.message : 'Please retry.');
    } finally { busyRef.current = false; if (current()) setLogoUploading(false); }
  };
  const locations = useRemoteData(scope + ':clinic-locations', async (signal) => {
    const [states, countries] = await Promise.all([
      apiFetch<any[]>('/location/states', { signal }), apiFetch<any[]>('/location/countries', { signal }),
    ]);
    if (!states.success || !countries.success || !Array.isArray(states.data) || !Array.isArray(countries.data)) throw new Error('Unable to load locations');
    return { states: states.data, countries: countries.data };
  }, Boolean(token && canView));
  const cities = useRemoteData(scope + ':clinic-cities:' + clinicForm.state, async (signal) => {
    const result = await apiFetch<any[]>('/location/cities/' + encodeURIComponent(clinicForm.state), { signal });
    if (!result.success || !Array.isArray(result.data)) throw new Error('Unable to load cities');
    return result.data;
  }, modalVisible && Boolean(Number(clinicForm.state)));
  const stateOptions = useMemo(() => locations.data?.states ?? [], [locations.data]);
  const cityOptions = useMemo(() => cities.data ?? [], [cities.data]);
  useEffect(() => {
    if (locations.error || cities.error) showErrorToast('Locations unavailable', 'Close and reopen the form to retry.');
  }, [locations.error, cities.error]);
  const stateLabel = stateOptions.find(row => String(row.id) === String(clinicForm.state))?.state_name || clinicForm.state || 'Select state';
  const cityLabel = cityOptions.find(row => String(row.id) === String(clinicForm.city))?.city_name || clinicForm.city || 'Select city';

  const formatClinicDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatClinicTime = (val?: string) => {
    if (!val) return '—';
    const clean = String(val).trim();
    if (clean.length >= 5 && /^\d{2}:\d{2}/.test(clean)) {
      return clean.slice(0, 5);
    }
    return clean;
  };

  const resolvedViewClinicState = useMemo(() => {
    if (!viewClinicModal?.state) return '';
    const st = String(viewClinicModal.state);
    if (/^\d+$/.test(st)) {
      const found = stateOptions.find(s => String(s.id) === st);
      return found ? found.state_name : '';
    }
    return st;
  }, [viewClinicModal?.state, stateOptions]);

  const resolvedViewClinicCity = useMemo(() => {
    if (!viewClinicModal?.city) return '';
    const ct = String(viewClinicModal.city);
    if (/^\d+$/.test(ct)) {
      const found = cityOptions.find(c => String(c.id) === ct);
      return found ? found.city_name : '';
    }
    return ct;
  }, [viewClinicModal?.city, cityOptions]);

  const handleOpenViewClinicModal = async (clinic: ClinicItem) => {
    setActiveActionMenuClinicId(null);
    const immediateState = stateOptions.find(s => String(s.id) === String(clinic.state))?.state_name;
    setViewClinicModal({
      ...clinic,
      state: immediateState || clinic.state,
    });

    try {
      const response = await apiFetch<{ clinic?: any }>(`/clinics/${encodeURIComponent(String(clinic.id))}`);
      if (response.success && response.data) {
        const detailed = (response.data as any).clinic || response.data;
        if (detailed && typeof detailed === 'object') {
          setViewClinicModal(prev => {
            if (!prev || String(prev.id) !== String(clinic.id)) return prev;
            return {
              ...prev,
              ...detailed,
              city: detailed.city || prev.city,
              state: detailed.state || prev.state,
              country: detailed.country || prev.country || 'India',
              created_at: detailed.created_at || prev.created_at,
              available_days: detailed.available_days || prev.available_days,
              available_from: detailed.available_from || prev.available_from,
              available_to: detailed.available_to || prev.available_to,
              website: detailed.website || prev.website,
              license_number: detailed.license_number || prev.license_number,
            };
          });
        }
      }
    } catch {
      // Keep initial clinic modal on network error
    }
  };

  useEffect(() => {
    setViewClinicModal(null); setViewAdminsModal(null); setAddAdminModalClinic(null); setModalVisible(false); setEditingClinicAdmin(null);
    setAdminPassword(''); setClinicSaving(false); setAddAdminSaving(false);
  }, [scope]);

  const handleOpenAddClinicModal = () => {
    if (!canAdd || !isMultiClinicPlan) return;
    setEditingClinicId(null);
    setClinicForm({ ...DEFAULT_CLINIC_FORM });
    setModalVisible(true);
  };

  const handleOpenEditClinicModal = (item: ClinicItem) => {
    if (!canEdit) return;
    setEditingClinicId(item.id);
    setClinicForm({
      logo_url: item.logo_url || '',
      name: item.name,
      email: item.email,
      phone: item.phone,
      address: item.address,
      state: String(item.state || ''),
      city: String(item.city || ''),
      country: item.country || 'India',
      website: item.website || '',
      license_number: item.license_number || '',
      available_days: item.available_days || 'Mon,Tue,Wed,Thu,Fri',
      available_from: item.available_from || '12:30 AM',
      available_to: item.available_to || '02:30 AM',
    });
    setModalVisible(true);
  };

  const handleSaveClinic = async () => {
    if (clinicSaving || busyRef.current || (editingClinicId ? !canEdit : !canAdd || !isMultiClinicPlan)) return;
    const selectedCity = cityOptions.find(option => String(option.id) === String(clinicForm.city));
    const clinicAddress = editingClinicId ? clinicForm.address.trim() : String(selectedCity?.city_name || '').trim();
    if (!clinicForm.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clinicForm.email.trim()) || !/^\d{10}$/.test(clinicForm.phone.trim()) || (editingClinicId && !clinicAddress)) {
      showErrorToast('Validation Error', editingClinicId ? 'Enter clinic name, valid email, phone and address.' : 'Enter clinic name, valid email and phone.'); return;
    }
    if (clinicForm.name.trim().length < 2 || clinicForm.name.length > 255 || (editingClinicId && (clinicAddress.length < 5 || clinicAddress.length > 500 || !clinicForm.country.trim() || clinicForm.website.length > 255 || clinicForm.license_number.length > 100 || clinicForm.available_days.length > 50))) {
      showErrorToast('Validation Error', 'Check clinic name (2–255), address (5–500), country and optional field lengths.'); return;
    }
    if (clinicForm.website.trim() && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(clinicForm.website.trim())) { showErrorToast('Validation Error', 'Enter a valid website URL starting with http:// or https://.'); return; }
    setClinicSaving(true);
    try {
      if (!Number(clinicForm.state) || !Number(clinicForm.city)) {
        showErrorToast('Validation Error', 'Select a state and city.'); return;
      }
      const toTime = (value: string) => {
        const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
        if (!match) return null;
        let hours = Number(match[1]);
        if (match[3] && (hours < 1 || hours > 12)) return null;
        if (match[3]) hours = hours % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
        return hours <= 23 && Number(match[2]) <= 59 ? String(hours).padStart(2, '0') + ':' + match[2] + ':00' : null;
      };
      if ((clinicForm.available_from && !toTime(clinicForm.available_from)) || (clinicForm.available_to && !toTime(clinicForm.available_to)) || (clinicForm.available_from && clinicForm.available_to && toTime(clinicForm.available_from)! >= toTime(clinicForm.available_to)!)) {
        showErrorToast('Validation Error', 'Select a valid opening time before the closing time.'); return;
      }
      const form = clinicForm;
      const payload = { ...form, address: clinicAddress || form.address, state: Number(form.state), city: Number(form.city),
        available_from: toTime(form.available_from), available_to: toTime(form.available_to) };
      await mutate(() => apiFetch('/clinics' + (editingClinicId ? '/' + editingClinicId : ''), {
        method: editingClinicId ? 'PUT' : 'POST', body: JSON.stringify(payload),
      }), () => { if (editingClinicId) updateClinicName?.(editingClinicId, form.name.trim()); setModalVisible(false); notifyProfileUpdated(); showSuccessToast('Clinic Saved', 'Clinic saved successfully.'); });
    } finally { if (scopeRef.current === scope) setClinicSaving(false); }
  };

  const totalClinicsCount = resource.data ? clinics.length : '\u2014';
  const activeClinicsCount = resource.data ? clinics.filter(c => c.status === 'Active').length : '\u2014';
  const inactiveClinicsCount = resource.data ? clinics.filter(c => c.status === 'Inactive').length : '\u2014';
  const totalAdminsCount = adminCounts.data?.total ?? (resource.data && !clinics.length ? 0 : '\u2014');

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        title="Clinic Management"
        onNavigate={(path) => {
          onNavigateScreen?.(path);
        }}
      />

      <LiquidBorderScrollView
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
              <Building2 color={colors.primary} size={24} />
            </View>
            <View style={{ marginLeft: spacing.md }}>
              <Text style={styles.bannerTitle}>Clinic Management</Text>
              <Text style={styles.bannerSubtitle}>
                Manage all clinics and their administrators
              </Text>
            </View>
          </View>

          {!isMultiClinicPlan && role === 'clinic_admin' ? <TouchableOpacity onPress={() => { void Linking.openURL('https://orbodoc.com/register/plan').catch(() => showErrorToast('Unable to open plans', 'Please try again.')); }} style={[styles.upgradeLinkBtn, isMobile && { marginTop: spacing.sm }]}>
            <Text style={styles.upgradeLinkText}>
              Multiple clinics ke liye <Text style={styles.upgradeLinkHighlight}>plan upgrade karo</Text>
            </Text>
          </TouchableOpacity> : null}
        </View>

        {isMultiClinicPlan && canAdd ? (
          <TouchableOpacity
            style={styles.createClinicButton}
            onPress={handleOpenAddClinicModal}
            activeOpacity={0.8}>
            <Plus color={colors.surface} size={16} />
            <Text style={styles.createClinicButtonText}>Create Clinic</Text>
          </TouchableOpacity>
        ) : null}

        {/* ── TOP MAIN CONTAINER CARD (DAILY PERFORMANCE & SNAPSHOT) ────────── */}
        <View {...dashboardParentTapHandlers} style={[styles.topCardBorder, activeClinicParent === 'dashboard' && styles.topCardBorderActive]}>
          {/* Controls Bar: Clinic Dropdown, Performance Date, Refresh Button */}
          <View style={[styles.controlsRow, styles.controlsRowWebHeader, isMobile && styles.controlsRowMobile]}>
            {/* Clinic Dropdown */}
            <View style={{ flex: 1, minWidth: 200, zIndex: showClinicSelectDropdown ? 60 : 30, elevation: showClinicSelectDropdown ? 12 : 0 }}>
              <Text style={styles.controlLabel}>CLINIC</Text>
              <TouchableOpacity
                style={styles.controlSelectBtn}
                onPress={() => setShowClinicSelectDropdown(!showClinicSelectDropdown)}
              >
                <Text style={styles.controlSelectBtnText} numberOfLines={1}>
                  {selectedClinicFilter}
                </Text>
                <ChevronDown color={colors.muted} size={16} />
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
                        void switchClinic(Number(c.id));
                      }}
                    >
                      <Text style={styles.controlDropdownItemText}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Performance Date with Integrated CustomCalendarPicker */}
            <View style={{ flex: 1.5, minWidth: 240, zIndex: 20 }}>
              <Text style={styles.performanceDateLabel}>Performance Date</Text>
              <CustomCalendarPicker
                selectedDate={selectedPerformanceDate}
                onDateChange={(d) => setSelectedPerformanceDate(d)}
                maximumDate={new Date()}
                icon={CalendarDays}
                iconColor={colors.primary}
                formatTriggerDate={date => date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
                triggerStyle={styles.performanceDateTrigger}
                triggerTextStyle={styles.performanceDateText}
              />
            </View>

            <RefreshButton
              onRefresh={() => performance.refresh()}
              loading={performance.loading}
              disabled={!selectedClinicId}
              label="Refresh dashboard"
              style={isMobile ? styles.refreshColMobile : styles.refreshCol}
              buttonStyle={styles.webRefreshButton}
            />
          </View>

          <View style={styles.dashboardBody}>
          {/* SECTION 1: Daily Performance */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Daily Performance</Text>
            <Text style={styles.sectionSubtitle}>
              Results for {selectedPerformanceDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>

          <View style={[styles.kpiGrid4, isMobile && styles.kpiGridMobile]}>
            {/* Appointments */}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open appointments for selected date" activeOpacity={0.82} onPressIn={() => { setActiveDashboardCard('appointments'); setActiveClinicParent('dashboard'); }} onPress={() => onNavigateScreen?.(`/appointments?clinic_id=${encodeURIComponent(String(selectedClinicId || ''))}&date=${selectedDate}`)} style={[styles.kpiCard, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop, activeDashboardCard === 'appointments' && styles.kpiCardActive]}>
              <View style={{ flex: 1, paddingRight: isMobile ? 4 : 0 }}>
                <Text style={[styles.kpiLabel, isMobile && { fontFamily: typography.family, fontSize: typography.size.xs }]} numberOfLines={1}>Appointments</Text>
                <Text style={[styles.kpiValue, isMobile && { fontFamily: typography.family, fontSize: 17 }]}>{metric('appointments_today') ?? '\u2014'}</Text>
                <Text style={[styles.kpiSub, isMobile && { fontFamily: typography.family, fontSize: typography.size.micro }]} numberOfLines={2}>Scheduled on date</Text>
              </View>
              <View style={[styles.kpiIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: colors.mint }]}>
                <CalendarDays color={colors.primary} size={isMobile ? 15 : 18} />
              </View>
            </TouchableOpacity>

            {/* Completed */}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open completed appointments for selected date" activeOpacity={0.82} onPressIn={() => { setActiveDashboardCard('completed'); setActiveClinicParent('dashboard'); }} onPress={() => onNavigateScreen?.(`/appointments?clinic_id=${encodeURIComponent(String(selectedClinicId || ''))}&date=${selectedDate}&status=complete`)} style={[styles.kpiCard, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop, activeDashboardCard === 'completed' && styles.kpiCardActive]}>
              <View style={{ flex: 1, paddingRight: isMobile ? 4 : 0 }}>
                <Text style={[styles.kpiLabel, isMobile && { fontFamily: typography.family, fontSize: typography.size.xs }]} numberOfLines={1}>Completed</Text>
                <Text style={[styles.kpiValue, isMobile && { fontFamily: typography.family, fontSize: 17 }]}>{metric('completed_today') ?? '\u2014'}</Text>
                <Text style={[styles.kpiSub, isMobile && { fontFamily: typography.family, fontSize: typography.size.micro }]} numberOfLines={2}>Visits completed</Text>
              </View>
              <View style={[styles.kpiIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: colors.successSoft }]}>
                <CheckCircle2 color="#166534" size={isMobile ? 15 : 18} />
              </View>
            </TouchableOpacity>

            {/* Cancelled */}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open cancelled appointments for selected date" activeOpacity={0.82} onPressIn={() => { setActiveDashboardCard('cancelled'); setActiveClinicParent('dashboard'); }} onPress={() => onNavigateScreen?.(`/appointments?clinic_id=${encodeURIComponent(String(selectedClinicId || ''))}&date=${selectedDate}&status=cancel`)} style={[styles.kpiCard, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop, activeDashboardCard === 'cancelled' && styles.kpiCardActive]}>
              <View style={{ flex: 1, paddingRight: isMobile ? 4 : 0 }}>
                <Text style={[styles.kpiLabel, isMobile && { fontFamily: typography.family, fontSize: typography.size.xs }]} numberOfLines={1}>Cancelled</Text>
                <Text style={[styles.kpiValue, isMobile && { fontFamily: typography.family, fontSize: 17 }]}>{metric('cancelled_today') ?? '\u2014'}</Text>
                <Text style={[styles.kpiSub, isMobile && { fontFamily: typography.family, fontSize: typography.size.micro }]} numberOfLines={2}>Appointments cancelled</Text>
              </View>
              <View style={[styles.kpiIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: '#FEE2E2' }]}>
                <XCircle color={colors.destructiveDark} size={isMobile ? 15 : 18} />
              </View>
            </TouchableOpacity>

            {/* Total Revenue */}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open treatment billing for selected date" activeOpacity={0.82} onPressIn={() => { setActiveDashboardCard('revenue'); setActiveClinicParent('dashboard'); }} onPress={() => onNavigateScreen?.(`/billing/treatment?clinic_id=${encodeURIComponent(String(selectedClinicId || ''))}&date=${selectedDate}`)} style={[styles.kpiCard, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop, activeDashboardCard === 'revenue' && styles.kpiCardActive]}>
              <View style={{ flex: 1, paddingRight: isMobile ? 4 : 0 }}>
                <Text style={[styles.kpiLabel, isMobile && { fontFamily: typography.family, fontSize: typography.size.xs }]} numberOfLines={1}>Total Revenue</Text>
                <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={[styles.kpiValue, isMobile && { fontFamily: typography.family, fontSize: 17 }]}>{displayAmount(dailyRevenue)}</Text>
                <Text style={[styles.kpiSub, isMobile && { fontFamily: typography.family, fontSize: typography.size.micro }]} numberOfLines={2}>Treatment + medicine</Text>
              </View>
              <View style={[styles.kpiIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: '#F3E8FF' }]}>
                <IndianRupee color="#7E22CE" size={isMobile ? 15 : 18} />
              </View>
            </TouchableOpacity>
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
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open active patients" activeOpacity={0.82} onPressIn={() => { setActiveDashboardCard('patients'); setActiveClinicParent('dashboard'); }} onPress={() => onNavigateScreen?.(`/patients?clinic_id=${encodeURIComponent(String(selectedClinicId || ''))}&status=active`)} style={[styles.kpiCardSnapshot, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop3, activeDashboardCard === 'patients' && styles.kpiCardActive]}>
              <View style={[styles.kpiIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: colors.mint }]}>
                <Users color={colors.primary} size={isMobile ? 15 : 18} />
              </View>
              <View style={{ flex: 1, marginLeft: isMobile ? 6 : 12 }}>
                <Text style={[styles.snapshotValue, isMobile && { fontFamily: typography.family, fontSize: typography.size.subtitle }]}>{metric('total_active_patients') ?? '\u2014'}</Text>
                <Text style={[styles.snapshotLabel, isMobile && { fontFamily: typography.family, fontSize: typography.size.xs }]} numberOfLines={1}>Active Patients</Text>
              </View>
            </TouchableOpacity>

            {/* Pending Lab Tests */}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open pending lab tests" activeOpacity={0.82} onPressIn={() => { setActiveDashboardCard('lab-tests'); setActiveClinicParent('dashboard'); }} onPress={() => onNavigateScreen?.(`/lab/tests?clinic_id=${encodeURIComponent(String(selectedClinicId || ''))}&status=pending`)} style={[styles.kpiCardSnapshot, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop3, activeDashboardCard === 'lab-tests' && styles.kpiCardActive]}>
              <View style={[styles.kpiIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: '#FFEDD5' }]}>
                <ClipboardList color="#C2410C" size={isMobile ? 15 : 18} />
              </View>
              <View style={{ flex: 1, marginLeft: isMobile ? 6 : 12 }}>
                <Text style={[styles.snapshotValue, isMobile && { fontFamily: typography.family, fontSize: typography.size.subtitle }]}>{metric('pending_lab_tests') ?? '\u2014'}</Text>
                <Text style={[styles.snapshotLabel, isMobile && { fontFamily: typography.family, fontSize: typography.size.xs }]} numberOfLines={2}>Pending Lab Tests</Text>
              </View>
            </TouchableOpacity>

            {/* Low Stock Medicines */}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open low stock medicines" activeOpacity={0.82} onPressIn={() => { setActiveDashboardCard('medicines'); setActiveClinicParent('dashboard'); }} onPress={() => onNavigateScreen?.(`/medicines?clinic_id=${encodeURIComponent(String(selectedClinicId || ''))}&stock=low`)} style={[styles.kpiCardSnapshot, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop3, activeDashboardCard === 'medicines' && styles.kpiCardActive]}>
              <View style={[styles.kpiIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: '#FFEDD5' }]}>
                <Pill color="#C2410C" size={isMobile ? 15 : 18} />
              </View>
              <View style={{ flex: 1, marginLeft: isMobile ? 6 : 12 }}>
                <Text style={[styles.snapshotValue, isMobile && { fontFamily: typography.family, fontSize: typography.size.subtitle }]}>{metric('low_stock_medicines') ?? '\u2014'}</Text>
                <Text style={[styles.snapshotLabel, isMobile && { fontFamily: typography.family, fontSize: typography.size.xs }]} numberOfLines={2}>Low Stock Medicines</Text>
              </View>
            </TouchableOpacity>
          </View>
          </View>
        </View>

        {/* ── MIDDLE ROW: 4 OVERVIEW METRIC CARDS ────────────────────────────── */}
        <View style={[styles.metricGrid4, isMobile && styles.kpiGridMobile]}>
          <View style={[styles.metricCard, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop]}>
            <View style={[styles.metricIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: colors.mintBorder }]}>
              <Building2 color={colors.primary} size={isMobile ? 16 : 20} />
            </View>
            <View style={{ flex: 1, marginLeft: isMobile ? 6 : 12 }}>
              <Text style={[styles.metricValue, isMobile && { fontFamily: typography.family, fontSize: typography.size.subtitle }]}>{totalClinicsCount}</Text>
              <Text style={[styles.metricLabel, isMobile && { fontFamily: typography.family, fontSize: typography.size.xs }]} numberOfLines={2}>Total Clinics</Text>
            </View>
          </View>

          <View style={[styles.metricCard, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop]}>
            <View style={[styles.metricIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: colors.successSoft }]}>
              <Building2 color="#166534" size={isMobile ? 16 : 20} />
            </View>
            <View style={{ flex: 1, marginLeft: isMobile ? 6 : 12 }}>
              <Text style={[styles.metricValue, isMobile && { fontFamily: typography.family, fontSize: typography.size.subtitle }]}>{activeClinicsCount}</Text>
              <Text style={[styles.metricLabel, isMobile && { fontFamily: typography.family, fontSize: typography.size.xs }]} numberOfLines={2}>Active Clinics</Text>
            </View>
          </View>

          <View style={[styles.metricCard, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop]}>
            <View style={[styles.metricIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: '#FFEDD5' }]}>
              <Users color="#C2410C" size={isMobile ? 16 : 20} />
            </View>
            <View style={{ flex: 1, marginLeft: isMobile ? 6 : 12 }}>
              <Text style={[styles.metricValue, isMobile && { fontFamily: typography.family, fontSize: typography.size.subtitle }]}>{totalAdminsCount}</Text>
              <Text style={[styles.metricLabel, isMobile && { fontFamily: typography.family, fontSize: typography.size.xs }]} numberOfLines={2}>Total Admins</Text>
            </View>
          </View>

          <View style={[styles.metricCard, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop]}>
            <View style={[styles.metricIconBox, isMobile && { width: 32, height: 32 }, { backgroundColor: '#FEE2E2' }]}>
              <Building2 color={colors.destructiveDark} size={isMobile ? 16 : 20} />
            </View>
            <View style={{ flex: 1, marginLeft: isMobile ? 6 : 12 }}>
              <Text style={[styles.metricValue, isMobile && { fontFamily: typography.family, fontSize: typography.size.subtitle }]}>{inactiveClinicsCount}</Text>
              <Text style={[styles.metricLabel, isMobile && { fontFamily: typography.family, fontSize: typography.size.xs }]} numberOfLines={2}>Inactive Clinics</Text>
            </View>
          </View>
        </View>

        {/* ── SEARCH & STATUS FILTER BAR ────────────────────────────────────── */}
        <View {...filtersParentTapHandlers} style={[styles.searchFilterParent, (activeClinicParent === 'filters' || searchFocused || showStatusDropdown) && styles.searchFilterParentActive]}>
        <View style={[styles.searchFilterRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
            <Search color={colors.subtle} size={16} style={{ marginRight: spacing.sm }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search clinics by name, email, phone or address..."
              placeholderTextColor={colors.subtle}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => {
                setSearchFocused(true);
                setActiveDashboardCard(null);
                setActiveClinicParent('filters');
              }}
              onBlur={() => setSearchFocused(false)}
            />
          </View>

          <View style={[{ position: 'relative', zIndex: 20 }, isMobile && { width: '100%' }]}>
            <TouchableOpacity
              style={[styles.statusTriggerBtn, showStatusDropdown && styles.kpiCardActive, isMobile && { width: '100%' }]}
              onPress={() => {
                setSearchFocused(false);
                setShowStatusDropdown(!showStatusDropdown);
              }}
            >
              <Text style={styles.statusTriggerBtnText}>{selectedStatusFilter}</Text>
              <ChevronDown color={colors.muted} size={16} />
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
                      setSearchFocused(false);
                    }}
                  >
                    <Text style={styles.statusDropdownItemText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
        </View>

        {/* ── CLINIC TABLE / LIST CARD ───────────────────────────────────────── */}
        <View {...clinicsParentTapHandlers} style={[styles.tableCardContainer, activeClinicParent === 'clinics' && styles.searchFilterParentActive]}>
          <View style={styles.tableHeaderBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Building2 color={colors.text} size={18} style={{ marginRight: spacing.sm }} />
              <Text style={styles.tableTitleText}>Clinic ({filteredClinics.length})</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity
                style={styles.columnsBtn}
                onPress={() => setShowColumnsModal(true)}
                activeOpacity={0.7}
              >
                <Columns color={colors.foreground} size={14} style={{ marginRight: spacing.tiny }} />
                <Text style={styles.columnsBtnText}>Columns</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* TABLE CONTENT */}
          {isMobile ? (
            /* Mobile Card View */
            <View style={{ padding: spacing.md, gap: 10 }}>
              {paginatedClinics.map((item) => (
                <TouchableOpacity
                  key={String(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${item.name}`}
                  activeOpacity={0.92}
                  onPress={() => handleOpenViewClinicModal(item)}>
                <LiquidBorderSurface style={styles.mobileClinicCard} radius={14}>
                  {/* Card Header: Clinic Name, Status, Actions */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                    {visibleClinicColumns.name && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
                        <View style={styles.clinicLogoSquare}>
                          {item.logo_url ? (
                            <Image
                              source={{ uri: profilePhotoUrl(item.logo_url) }}
                              style={styles.clinicListLogoImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <Building2 color={colors.primary} size={20} />
                          )}
                        </View>
                        <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.clinicTitleText}>{item.name}</Text>
                          {item.code ? <Text style={styles.codeText}>{item.code}</Text> : null}
                        </View>
                      </View>
                    )}
                    {!visibleClinicColumns.name && <View style={{ flex: 1 }} />}

                    {visibleClinicColumns.status && (
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
                    )}

                    {visibleClinicColumns.actions && (
                      <TouchableOpacity
                        style={{ padding: spacing.tiny, marginLeft: spacing.xs }}
                        onPress={() =>
                          setActiveActionMenuClinicId(
                            activeActionMenuClinicId === item.id ? null : item.id
                          )
                        }>
                        <MoreVertical color={colors.muted} size={16} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {activeActionMenuClinicId === item.id && (
                    <View style={[styles.actionPopoverMenu, { position: 'relative', top: 0, right: 0, width: '100%', marginBottom: spacing.sm }]}>
                      <TouchableOpacity
                        style={styles.popoverItem}
                        onPress={() => {
                          handleOpenViewClinicModal(item);
                        }}>
                        <Eye size={15} color={colors.foreground} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.popoverItemText}>View Clinic</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.popoverItem} disabled={!canViewAdmins}
                        onPress={() => {
                          setActiveActionMenuClinicId(null);
                          if (canViewAdmins) setViewAdminsModal(item);
                        }}>
                        <Users size={15} color={colors.foreground} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.popoverItemText}>View Admins</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.popoverItem} disabled={!canEdit}
                        onPress={() => {
                          setActiveActionMenuClinicId(null);
                          handleOpenEditClinicModal(item);
                        }}>
                        <Edit2 size={15} color={colors.foreground} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.popoverItemText}>Edit Clinic</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.popoverItem} disabled={!canAddAdmin}
                        onPress={() => {
                          setActiveActionMenuClinicId(null);
                          if (canAddAdmin) setAddAdminModalClinic(item);
                        }}>
                        <UserPlus size={15} color={colors.foreground} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.popoverItemText}>Add Admin</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.popoverItem, { borderTopWidth: 1, borderTopColor: colors.secondary }]}
                        onPress={() => {
                          setActiveActionMenuClinicId(null);
                          handleToggleClinicStatus(item.id);
                        }}>
                        <Trash2 size={15} color={item.status === 'Active' ? colors.destructive : colors.success} style={{ marginRight: spacing.sm }} />
                        <Text style={[styles.popoverItemText, { color: item.status === 'Active' ? colors.destructive : colors.success }]}>
                          {item.status === 'Active' ? 'Deactivate Clinic' : 'Activate Clinic'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Meta items */}
                  <View style={styles.mobileMetaRow}>
                    {visibleClinicColumns.address && (
                      <View style={styles.clinicMetaItem}>
                        <MapPin size={14} color={colors.muted} />
                        <Text style={styles.metaText}>{item.address || '—'}</Text>
                      </View>
                    )}
                    {visibleClinicColumns.contact && (
                      <>
                        {item.email ? (
                          <View style={styles.clinicMetaItem}>
                            <Mail size={14} color={colors.muted} />
                            <Text style={styles.metaText}>{item.email}</Text>
                          </View>
                        ) : null}
                        {item.phone ? (
                          <View style={styles.clinicMetaItem}>
                            <Phone size={14} color={colors.muted} />
                            <Text style={styles.metaText}>{item.phone}</Text>
                          </View>
                        ) : null}
                      </>
                    )}
                    {visibleClinicColumns.created && (
                      <Text style={styles.metaText}>
                        📅 Created: {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                      </Text>
                    )}
                    {visibleClinicColumns.country && (
                      <Text style={styles.metaText}>🌐 Country: {item.country || '—'}</Text>
                    )}
                    {visibleClinicColumns.website && (
                      <Text style={styles.metaText}>🔗 Website: {item.website || '—'}</Text>
                    )}
                    {visibleClinicColumns.license_number && (
                      <Text style={styles.metaText}>📋 License: {item.license_number || '—'}</Text>
                    )}
                    {visibleClinicColumns.available_days && (
                      <Text style={styles.metaText}>🗓️ Days: {item.available_days || '—'}</Text>
                    )}
                    {visibleClinicColumns.available_from && (
                      <Text style={styles.metaText}>
                        ⏰ From: {item.available_from ? String(item.available_from).slice(0, 5) : '—'}
                      </Text>
                    )}
                    {visibleClinicColumns.available_to && (
                      <Text style={styles.metaText}>
                        ⏰ To: {item.available_to ? String(item.available_to).slice(0, 5) : '—'}
                      </Text>
                    )}
                    {visibleClinicColumns.admins && (
                      <View style={styles.clinicMetaItem}>
                        <Users size={14} color="#0284C7" />
                        <Text style={styles.metaText}>{adminCounts.data?.byClinic[String(item.id)] ?? item.admins_count ?? '\u2014'} Admins</Text>
                      </View>
                    )}
                  </View>
                </LiquidBorderSurface>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            /* Desktop / Wide Screen Table View */
            <LiquidBorderScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              nestedScrollEnabled={true}
              scrollEventThrottle={16}
              decelerationRate="normal">
              <View style={{ minWidth: tableMinWidth }}>
                <View style={styles.tableHeaderRow}>
                  {visibleClinicColumns.name && <Text style={[styles.thCell, { width: 220 }]}>Clinic Name</Text>}
                  {visibleClinicColumns.address && <Text style={[styles.thCell, { width: 200 }]}>Address</Text>}
                  {visibleClinicColumns.contact && <Text style={[styles.thCell, { width: 200 }]}>Contact</Text>}
                  {visibleClinicColumns.created && <Text style={[styles.thCell, { width: 130 }]}>Created</Text>}
                  {visibleClinicColumns.country && <Text style={[styles.thCell, { width: 110 }]}>Country</Text>}
                  {visibleClinicColumns.website && <Text style={[styles.thCell, { width: 160 }]}>Website</Text>}
                  {visibleClinicColumns.license_number && <Text style={[styles.thCell, { width: 150 }]}>License Number</Text>}
                  {visibleClinicColumns.available_days && <Text style={[styles.thCell, { width: 150 }]}>Available Days</Text>}
                  {visibleClinicColumns.available_from && <Text style={[styles.thCell, { width: 120 }]}>Available From</Text>}
                  {visibleClinicColumns.available_to && <Text style={[styles.thCell, { width: 120 }]}>Available To</Text>}
                  {visibleClinicColumns.admins && <Text style={[styles.thCell, { width: 90, textAlign: 'center' }]}>Admins</Text>}
                  {visibleClinicColumns.status && <Text style={[styles.thCell, { width: 140, textAlign: 'center' }]}>Status</Text>}
                  {visibleClinicColumns.actions && <Text style={[styles.thCell, { width: 80, textAlign: 'right' }]}>Actions</Text>}
                </View>

                {paginatedClinics.map((item) => (
                  <View key={String(item.id)} style={styles.tableBodyRow}>
                    {/* Clinic Name */}
                    {visibleClinicColumns.name && (
                      <View style={{ width: 220, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={styles.clinicLogoSquare}>
                          <Building2 color={colors.primary} size={18} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.clinicTitleText} numberOfLines={1}>
                            {item.name}
                          </Text>
                          {item.code ? <Text style={styles.codeText}>{item.code}</Text> : null}
                        </View>
                      </View>
                    )}

                    {/* Address */}
                    {visibleClinicColumns.address && (
                      <View style={{ width: 200, flexDirection: 'row', alignItems: 'center' }}>
                        <MapPin color={colors.subtle} size={14} style={{ marginRight: spacing.xs }} />
                        <Text style={styles.tdText} numberOfLines={1}>
                          {item.address || '—'}
                        </Text>
                      </View>
                    )}

                    {/* Contact */}
                    {visibleClinicColumns.contact && (
                      <View style={{ width: 200 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Mail color={colors.subtle} size={12} style={{ marginRight: spacing.xs }} />
                          <Text style={styles.tdText} numberOfLines={1}>
                            {item.email || '—'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          <Phone color={colors.subtle} size={12} style={{ marginRight: spacing.xs }} />
                          <Text style={styles.tdText}>{item.phone || '—'}</Text>
                        </View>
                      </View>
                    )}

                    {/* Created */}
                    {visibleClinicColumns.created && (
                      <View style={{ width: 130, justifyContent: 'center' }}>
                        <Text style={styles.tdText}>
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                        </Text>
                      </View>
                    )}

                    {/* Country */}
                    {visibleClinicColumns.country && (
                      <View style={{ width: 110, justifyContent: 'center' }}>
                        <Text style={styles.tdText}>{item.country || '—'}</Text>
                      </View>
                    )}

                    {/* Website */}
                    {visibleClinicColumns.website && (
                      <View style={{ width: 160, justifyContent: 'center' }}>
                        <Text style={styles.tdText} numberOfLines={1}>
                          {item.website || '—'}
                        </Text>
                      </View>
                    )}

                    {/* License Number */}
                    {visibleClinicColumns.license_number && (
                      <View style={{ width: 150, justifyContent: 'center' }}>
                        <Text style={styles.tdText} numberOfLines={1}>
                          {item.license_number || '—'}
                        </Text>
                      </View>
                    )}

                    {/* Available Days */}
                    {visibleClinicColumns.available_days && (
                      <View style={{ width: 150, justifyContent: 'center' }}>
                        <Text style={styles.tdText} numberOfLines={1}>
                          {item.available_days || '—'}
                        </Text>
                      </View>
                    )}

                    {/* Available From */}
                    {visibleClinicColumns.available_from && (
                      <View style={{ width: 120, justifyContent: 'center' }}>
                        <Text style={styles.tdText}>
                          {item.available_from ? String(item.available_from).slice(0, 5) : '—'}
                        </Text>
                      </View>
                    )}

                    {/* Available To */}
                    {visibleClinicColumns.available_to && (
                      <View style={{ width: 120, justifyContent: 'center' }}>
                        <Text style={styles.tdText}>
                          {item.available_to ? String(item.available_to).slice(0, 5) : '—'}
                        </Text>
                      </View>
                    )}

                    {/* Admins Count */}
                    {visibleClinicColumns.admins && (
                      <View style={{ width: 90, alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Users color={colors.muted} size={14} style={{ marginRight: spacing.xs }} />
                          <Text style={styles.tdText}>{adminCounts.data?.byClinic[String(item.id)] ?? item.admins_count ?? '\u2014'}</Text>
                        </View>
                      </View>
                    )}

                    {/* Status & Toggle Switch */}
                    {visibleClinicColumns.status && (
                      <View style={{ width: 140, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.tiny }}>
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
                          trackColor={{ false: colors.border, true: colors.mintBorder }}
                          thumbColor={item.status === 'Active' ? colors.primary : colors.secondary}
                        />
                      </View>
                    )}

                    {/* Actions Menu Popover */}
                    {visibleClinicColumns.actions && (
                      <View style={{ width: 80, alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }}>
                        <TouchableOpacity
                          style={{ padding: spacing.tiny }}
                          onPress={() =>
                            setActiveActionMenuClinicId(
                              activeActionMenuClinicId === item.id ? null : item.id
                            )
                          }>
                          <MoreVertical color={colors.muted} size={16} />
                        </TouchableOpacity>

                        {activeActionMenuClinicId === item.id && (
                          <View style={styles.actionPopoverMenu}>
                            {/* 1. View Clinic */}
                            <TouchableOpacity
                              style={styles.popoverItem}
                              onPress={() => {
                                handleOpenViewClinicModal(item);
                              }}>
                              <Eye size={15} color={colors.foreground} style={{ marginRight: spacing.sm }} />
                              <Text style={styles.popoverItemText}>View Clinic</Text>
                            </TouchableOpacity>

                            {/* 2. View Admins */}
                            <TouchableOpacity
                              style={styles.popoverItem} disabled={!canViewAdmins}
                              onPress={() => {
                                setActiveActionMenuClinicId(null);
                                if (canViewAdmins) setViewAdminsModal(item);
                              }}>
                              <Users size={15} color={colors.foreground} style={{ marginRight: spacing.sm }} />
                              <Text style={styles.popoverItemText}>View Admins</Text>
                            </TouchableOpacity>

                            {/* 3. Edit Clinic */}
                            <TouchableOpacity
                              style={styles.popoverItem} disabled={!canEdit}
                              onPress={() => {
                                setActiveActionMenuClinicId(null);
                                handleOpenEditClinicModal(item);
                              }}>
                              <Edit2 size={15} color={colors.foreground} style={{ marginRight: spacing.sm }} />
                              <Text style={styles.popoverItemText}>Edit Clinic</Text>
                            </TouchableOpacity>

                            {/* 4. Add Admin */}
                            <TouchableOpacity
                              style={styles.popoverItem} disabled={!canAddAdmin}
                              onPress={() => {
                                setActiveActionMenuClinicId(null);
                                if (canAddAdmin) setAddAdminModalClinic(item);
                              }}>
                              <UserPlus size={15} color={colors.foreground} style={{ marginRight: spacing.sm }} />
                              <Text style={styles.popoverItemText}>Add Admin</Text>
                            </TouchableOpacity>

                            {/* 5. Deactivate Clinic / Activate Clinic */}
                            <TouchableOpacity
                              style={[styles.popoverItem, { borderTopWidth: 1, borderTopColor: colors.secondary, marginTop: 2 }]}
                              onPress={() => {
                                setActiveActionMenuClinicId(null);
                                handleToggleClinicStatus(item.id);
                              }}>
                              <Trash2 size={15} color={item.status === 'Active' ? colors.destructive : colors.success} style={{ marginRight: spacing.sm }} />
                              <Text style={[styles.popoverItemText, { color: item.status === 'Active' ? colors.destructive : colors.success }]}>
                                {item.status === 'Active' ? 'Deactivate Clinic' : 'Activate Clinic'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </LiquidBorderScrollView>
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
      </LiquidBorderScrollView>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 👁️ SHOW / HIDE COLUMNS MODAL (REUSABLE COMPONENT)                          */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <ColumnSelectorModal
        visible={showColumnsModal}
        onClose={() => setShowColumnsModal(false)}
        columns={clinicColumnOptions}
        visibleColumns={visibleClinicColumns}
        onToggleColumn={toggleClinicColumn}
        onReset={resetClinicColumns}
      />

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
                    {editingClinicId ? <Edit2 color={colors.text} size={18} /> : <Plus color={colors.text} size={18} />}
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
                    <X size={18} color={colors.muted} />
                  </TouchableOpacity>
                </View>

                {/* Form Body */}
                <LiquidBorderScrollView
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
                      {clinicForm.logo_url && !logoFailed ? <Image source={{ uri: profilePhotoUrl(clinicForm.logo_url) }} onError={() => setLogoFailed(true)} style={{ width: '100%', height: '100%', borderRadius: 100 }} /> : <Camera size={22} color={colors.muted} />}
                      <TouchableOpacity style={styles.smallCloseBadge} disabled={logoUploading || clinicSaving} onPress={() => setClinicForm(form => ({ ...form, logo_url: '' }))}>
                        <X size={10} color={colors.muted} />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={{ marginTop: spacing.xs }} disabled={logoUploading || clinicSaving} onPress={handleChooseLogo}>
                      <Text style={styles.changeLogoLink}>Change logo</Text>
                    </TouchableOpacity>
                    <Text style={styles.logoHelperText}>PNG/JPG only, max 2MB</Text>
                  </View>

                  {/* Row 1: Clinic Name & Email */}
                  <View style={[styles.grid2ColRow, isMobile && { flexDirection: 'column', gap: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>
                        Clinic Name <Text style={{ color: colors.destructive }}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="Aarogya Care Clinic"
                        placeholderTextColor={colors.subtle}
                        value={clinicForm.name}
                        onChangeText={(v) => setClinicForm({ ...clinicForm, name: v })}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>
                        Email Address <Text style={{ color: colors.destructive }}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="contact@aarogyacare.com"
                        placeholderTextColor={colors.subtle}
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
                        Phone Number <Text style={{ color: colors.destructive }}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="9876543210"
                        placeholderTextColor={colors.subtle}
                        keyboardType="phone-pad"
                        value={clinicForm.phone}
                        onChangeText={(v) => setClinicForm({ ...clinicForm, phone: v })}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>
                        Address <Text style={{ color: colors.destructive }}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="102, Shree Heights, AB Road"
                        placeholderTextColor={colors.subtle}
                        value={clinicForm.address}
                        onChangeText={(v) => setClinicForm({ ...clinicForm, address: v })}
                      />
                    </View>
                  </View>

                  {/* Row 3: State & City Dropdowns */}
                  <View style={[styles.grid2ColRow, { marginTop: 10 }, isMobile && { flexDirection: 'column', gap: 0, marginTop: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>
                        State <Text style={{ color: colors.destructive }}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.formDropdownSelectTrigger}
                        onPress={() => setShowFormStateDropdown(!showFormStateDropdown)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <MapPin size={14} color={colors.muted} style={{ marginRight: spacing.tiny }} />
                          <Text style={styles.formDropdownText}>{stateLabel}</Text>
                        </View>
                        <ChevronDown size={16} color={colors.muted} />
                      </TouchableOpacity>

                      {showFormStateDropdown && (
                        <View style={styles.formDropdownList}>
                          {stateOptions.map((st) => (
                            <TouchableOpacity
                              key={st.id}
                              style={styles.formDropdownListItem}
                              onPress={() => {
                                setClinicForm({ ...clinicForm, state: String(st.id), city: '' });
                                setShowFormStateDropdown(false);
                              }}>
                              <Text style={styles.formDropdownItemText}>{st.state_name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>
                        City <Text style={{ color: colors.destructive }}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.formDropdownSelectTrigger}
                        onPress={() => setShowFormCityDropdown(!showFormCityDropdown)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <MapPin size={14} color={colors.muted} style={{ marginRight: spacing.tiny }} />
                          <Text style={styles.formDropdownText}>{cityLabel}</Text>
                        </View>
                        <ChevronDown size={16} color={colors.muted} />
                      </TouchableOpacity>

                      {showFormCityDropdown && (
                        <View style={styles.formDropdownList}>
                          {cityOptions.map((ct) => (
                            <TouchableOpacity
                              key={ct.id}
                              style={styles.formDropdownListItem}
                              onPress={() => {
                                setClinicForm({ ...clinicForm, city: String(ct.id) });
                                setShowFormCityDropdown(false);
                              }}>
                              <Text style={styles.formDropdownItemText}>{ct.city_name}</Text>
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
                        Country <Text style={{ color: colors.destructive }}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.formDropdownSelectTrigger}
                        onPress={() => setShowFormCountryDropdown(!showFormCountryDropdown)}>
                        <Text style={styles.formDropdownText}>{clinicForm.country}</Text>
                        <ChevronDown size={16} color={colors.muted} />
                      </TouchableOpacity>

                      {showFormCountryDropdown && (
                        <View style={styles.formDropdownList}>
                          {(locations.data?.countries ?? []).map(row => row.country_name).map((cn: string) => (
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
                        placeholderTextColor={colors.subtle}
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
                        placeholderTextColor={colors.subtle}
                        value={clinicForm.license_number}
                        onChangeText={(v) => setClinicForm({ ...clinicForm, license_number: v })}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>Available Days</Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="Mon,Tue,Wed,Thu,Fri"
                        placeholderTextColor={colors.subtle}
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
                        <Clock size={14} color={colors.muted} style={{ marginRight: spacing.tiny }} />
                        <TextInput
                          style={styles.formInputBoxBare}
                          placeholder="12:30 AM"
                          placeholderTextColor={colors.subtle}
                          value={clinicForm.available_from}
                          onChangeText={(v) => setClinicForm({ ...clinicForm, available_from: v })}
                        />
                        <ChevronsUpDown size={14} color={colors.muted} />
                      </View>
                      <Text style={styles.apiTimeHelperText}>API time: 00:30:00 (24-hour format)</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>Available To</Text>
                      <View style={styles.formInputBoxWithIcon}>
                        <Clock size={14} color={colors.muted} style={{ marginRight: spacing.tiny }} />
                        <TextInput
                          style={styles.formInputBoxBare}
                          placeholder="02:30 AM"
                          placeholderTextColor={colors.subtle}
                          value={clinicForm.available_to}
                          onChangeText={(v) => setClinicForm({ ...clinicForm, available_to: v })}
                        />
                        <ChevronsUpDown size={14} color={colors.muted} />
                      </View>
                      <Text style={styles.apiTimeHelperText}>API time: 02:30:00 (24-hour format)</Text>
                    </View>
                  </View>
                </LiquidBorderScrollView>

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
                    disabled={logoUploading || clinicSaving || (editingClinicId ? !canEdit : !canAdd || !isMultiClinicPlan)}>
                    {clinicSaving ? (
                      <ActivityIndicator size="small" color={colors.surface} />
                    ) : (
                      <>
                        {editingClinicId ? (
                          <Edit2 size={15} color={colors.surface} style={{ marginRight: spacing.tiny }} />
                        ) : (
                          <Plus size={15} color={colors.surface} style={{ marginRight: spacing.tiny }} />
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
                    {viewClinicModal?.logo_url ? (
                      <Image
                        source={{ uri: profilePhotoUrl(viewClinicModal.logo_url) }}
                        style={styles.viewClinicLogoImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Building2 color={colors.muted} size={24} />
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={styles.viewClinicTitle}>{viewClinicModal?.name}</Text>
                    <Text style={styles.viewClinicSubtitle}>
                      {resolvedViewClinicCity || viewClinicModal?.city ? `${resolvedViewClinicCity || viewClinicModal?.city} • ` : ''}{viewClinicModal?.country || 'India'}
                    </Text>
                    <View style={styles.viewClinicStatusTag}>
                      <Text style={styles.viewClinicStatusText}>{viewClinicModal?.status}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setViewClinicModal(null)} style={{ padding: spacing.xs }}>
                    <X size={18} color={colors.muted} />
                  </TouchableOpacity>
                </View>

                <LiquidBorderScrollView
                  style={{ padding: spacing.lg }}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  decelerationRate="normal">
                  {/* Contact & Identity Section */}
                  <View style={styles.viewSectionCard}>
                    <View style={styles.sectionHeaderTitleRow}>
                      <Mail size={15} color={colors.primary} style={{ marginRight: spacing.tiny }} />
                      <Text style={styles.viewSectionCardTitle}>Contact & Identity</Text>
                    </View>
                    <View style={[styles.grid2ColRow, isMobile && { flexDirection: 'column', gap: 10 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>Email Address</Text>
                        <Text style={styles.infoBoxVal}>{viewClinicModal?.email || '—'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>Phone Number</Text>
                        <Text style={styles.infoBoxVal}>{viewClinicModal?.phone || '—'}</Text>
                      </View>
                    </View>

                    <View style={[styles.grid2ColRow, { marginTop: spacing.md }, isMobile && { flexDirection: 'column', gap: 10, marginTop: 10 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>Website</Text>
                        <Text style={styles.infoBoxVal}>{viewClinicModal?.website || '—'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>License Number</Text>
                        <Text style={styles.infoBoxVal}>{viewClinicModal?.license_number || '—'}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Location Section */}
                  <View style={[styles.viewSectionCard, { marginTop: 14 }]}>
                    <View style={styles.sectionHeaderTitleRow}>
                      <MapPin size={15} color={colors.primary} style={{ marginRight: spacing.tiny }} />
                      <Text style={styles.viewSectionCardTitle}>Location</Text>
                    </View>
                    <View style={[styles.grid2ColRow, isMobile && { flexDirection: 'column', gap: 10 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>Address</Text>
                        <Text style={styles.infoBoxVal}>{viewClinicModal?.address || '—'}</Text>
                      </View>
                    </View>

                    <View style={[styles.grid2ColRow, { marginTop: spacing.md }, isMobile && { flexDirection: 'column', gap: 10, marginTop: 10 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>City</Text>
                        <Text style={styles.infoBoxVal}>{resolvedViewClinicCity || viewClinicModal?.city || '—'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>State</Text>
                        <Text style={styles.infoBoxVal}>{resolvedViewClinicState || viewClinicModal?.state || '—'}</Text>
                      </View>
                    </View>

                    <View style={[styles.grid2ColRow, { marginTop: spacing.md }, isMobile && { flexDirection: 'column', gap: 10, marginTop: 10 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>Country</Text>
                        <Text style={styles.infoBoxVal}>{viewClinicModal?.country || 'India'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>Created</Text>
                        <Text style={styles.infoBoxVal}>{formatClinicDate(viewClinicModal?.created_at)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Availability Section */}
                  <View style={[styles.viewSectionCard, styles.availabilityBgCard, { marginTop: 14, marginBottom: 10 }]}>
                    <View style={styles.sectionHeaderTitleRow}>
                      <CalendarIcon size={15} color={colors.primary} style={{ marginRight: spacing.tiny }} />
                      <Text style={styles.viewSectionCardTitle}>Availability</Text>
                    </View>
                    <View style={[styles.grid3ColRow, isMobile && { flexDirection: 'column', gap: 10 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>Available Days</Text>
                        <Text style={styles.infoBoxVal}>{viewClinicModal?.available_days || '—'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>Available From</Text>
                        <Text style={styles.infoBoxVal}>{formatClinicTime(viewClinicModal?.available_from)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoBoxLabel}>Available To</Text>
                        <Text style={styles.infoBoxVal}>{formatClinicTime(viewClinicModal?.available_to)}</Text>
                      </View>
                    </View>
                  </View>
                </LiquidBorderScrollView>

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
                    <Users color={colors.surface} size={20} />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={styles.viewAdminsTitle}>
                      Clinic Admins — <Text style={{ color: colors.primary }}>{viewAdminsModal?.name}</Text>
                    </Text>
                    <Text style={styles.viewAdminsSubtitle}>
                      Manage administrators for this clinic
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setViewAdminsModal(null)}>
                    <X size={18} color={colors.muted} />
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
                      if (canAddAdmin) setAddAdminModalClinic(c);
                    }}>
                    <Plus color={colors.surface} size={14} style={{ marginRight: spacing.xs }} />
                    <Text style={styles.addNewAdminBtnText}>Add New Admin</Text>
                  </TouchableOpacity>
                </View>

                {/* Admins Table Container */}
                <LiquidBorderScrollView
                  style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  decelerationRate="normal">
                  {admins.loading ? (
                    <View style={{ paddingVertical: 36, alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={{ fontFamily: typography.family, marginTop: spacing.sm, fontSize: typography.size.sm, color: colors.muted }}>Loading administrators...</Text>
                    </View>
                  ) : adminsList.length === 0 ? (
                    <View style={{ paddingVertical: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', borderRadius: radii.lg, backgroundColor: colors.surface, marginVertical: spacing.sm }}>
                      <Users size={32} color={colors.subtle} />
                      <Text style={{ fontFamily: typography.family, marginTop: spacing.sm, fontSize: typography.size.caption, color: colors.muted, fontWeight: typography.weight.medium }}>
                        No clinic admins found for this clinic
                      </Text>
                    </View>
                  ) : isMobile ? (
                    /* Mobile Card View (No Data Overlap) */
                    <View style={{ gap: 10 }}>
                      {adminsList.map((admin) => (
                        <View key={admin.id} style={styles.mobileAdminCardItem}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                              <View style={styles.adminAvatarCircle}>
                                <Users size={14} color={colors.primary} />
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

                          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                            <Text style={styles.adminTdText}>✉️ {admin.email}</Text>
                            <Text style={styles.adminTdText}>📞 {admin.phone}</Text>
                          </View>

                          {/* Action Buttons: Edit & Delete */}
                          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.secondary, flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }}>
                            {canEditAdmin && (
                              <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.tiny, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}
                                onPress={() => handleOpenEditClinicAdmin(admin)}>
                                <Edit2 size={13} color={colors.primary} style={{ marginRight: 5 }} />
                                <Text style={{ fontFamily: typography.family, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.text }}>Edit</Text>
                              </TouchableOpacity>
                            )}
                            {canDeleteAdmin && (
                              <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.tiny, borderRadius: radii.sm, borderWidth: 1, borderColor: '#FEE2E2', backgroundColor: colors.destructiveSoft }}
                                onPress={() => handleDeleteClinicAdmin(admin)}>
                                <Trash2 size={13} color={colors.destructive} style={{ marginRight: 5 }} />
                                <Text style={{ fontFamily: typography.family, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.destructive }}>Delete</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    /* Desktop Table View */
                    <View style={styles.adminsTableContainer}>
                      <View style={styles.adminsTableHeaderRow}>
                        <Text style={[styles.adminsTh, { flex: 2.2 }]}>Name</Text>
                        <Text style={[styles.adminsTh, { flex: 2.5 }]}>Email</Text>
                        <Text style={[styles.adminsTh, { flex: 1.8 }]}>Phone</Text>
                        <Text style={[styles.adminsTh, { flex: 1.2, textAlign: 'center' }]}>Status</Text>
                        <Text style={[styles.adminsTh, { flex: 1.4, textAlign: 'right' }]}>Actions</Text>
                      </View>

                      {adminsList.map((admin) => (
                        <View key={admin.id} style={styles.adminsTableBodyRow}>
                          {/* Name + Avatar */}
                          <View style={{ flex: 2.2, flexDirection: 'row', alignItems: 'center' }}>
                            <View style={styles.adminAvatarCircle}>
                              <Users size={14} color={colors.primary} />
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

                          {/* Actions: Edit & Delete */}
                          <View style={{ flex: 1.4, flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md }}>
                            {canEditAdmin && (
                              <TouchableOpacity onPress={() => handleOpenEditClinicAdmin(admin)}>
                                <Edit2 size={15} color={colors.primary} />
                              </TouchableOpacity>
                            )}
                            {canDeleteAdmin && (
                              <TouchableOpacity onPress={() => handleDeleteClinicAdmin(admin)}>
                                <Trash2 size={15} color={colors.destructive} />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </LiquidBorderScrollView>
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
                    <UserPlus color={colors.primary} size={20} />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={styles.addAdminTitle}>
                      Add Clinic Admin for {addAdminModalClinic?.name}
                    </Text>
                    <Text style={styles.addAdminSubtitle}>
                      Create a new clinic administrator account. They will have full access to manage this clinic.
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setAddAdminModalClinic(null)}>
                    <X size={18} color={colors.muted} />
                  </TouchableOpacity>
                </View>

                {/* Form Body */}
                <LiquidBorderScrollView
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
                        Full Name <Text style={{ color: colors.destructive }}>*</Text>
                      </Text>
                      <TextInput
                        style={[styles.formInputBox, styles.formInputFocused]}
                        placeholder="Enter full name"
                        placeholderTextColor={colors.subtle}
                        value={adminFullName}
                        onChangeText={setAdminFullName}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>
                        Email Address <Text style={{ color: colors.destructive }}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="admin@clinic.com"
                        placeholderTextColor={colors.subtle}
                        keyboardType="email-address"
                        value={adminEmail}
                        onChangeText={setAdminEmail}
                      />
                    </View>
                  </View>

                  <View style={[styles.grid2ColRow, { marginTop: 10 }, isMobile && { flexDirection: 'column', gap: 0, marginTop: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>
                        Phone Number <Text style={{ color: colors.destructive }}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="9876543210"
                        placeholderTextColor={colors.subtle}
                        keyboardType="phone-pad"
                        value={adminPhone}
                        onChangeText={setAdminPhone}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabelText}>
                        Password <Text style={{ color: colors.destructive }}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="Enter secure password"
                        placeholderTextColor={colors.subtle}
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
                    placeholderTextColor={colors.subtle}
                    multiline
                    value={adminAddress}
                    onChangeText={setAdminAddress}
                  />

                  {/* Assigned Clinic Card */}
                  <View style={styles.assignedClinicCard}>
                    <Text style={styles.assignedClinicHeaderLabel}>Assigned Clinic</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
                      <Building2 size={16} color={colors.primary} style={{ marginRight: spacing.tiny }} />
                      <Text style={styles.assignedClinicName}>{addAdminModalClinic?.name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                      <MapPin size={14} color={colors.muted} style={{ marginRight: spacing.tiny }} />
                      <Text style={styles.assignedClinicAddress}>{addAdminModalClinic?.address}</Text>
                    </View>
                  </View>
                </LiquidBorderScrollView>

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
                    disabled={addAdminSaving || !canAddAdmin}>
                    {addAdminSaving ? (
                      <ActivityIndicator size="small" color={colors.surface} />
                    ) : (
                      <>
                        <UserPlus size={15} color={colors.surface} style={{ marginRight: spacing.tiny }} />
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

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* ✏️ EDIT CLINIC ADMIN MODAL                                                */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <Modal visible={!!editingClinicAdmin} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => { setShowEditAdminStatusDropdown(false); setEditingClinicAdmin(null); }}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback onPress={() => setShowEditAdminStatusDropdown(false)}>
              <View style={[styles.addAdminCard, isMobile && { width: '96%', maxHeight: '92%' }]}>
                {/* Header */}
                <View style={styles.addAdminHeader}>
                  <View style={styles.userPlusIconBox}>
                    <Edit2 color={colors.primary} size={20} />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={styles.addAdminTitle}>
                      Edit Clinic Admin
                    </Text>
                    <Text style={styles.addAdminSubtitle}>
                      Update clinic administrator information
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => { setShowEditAdminStatusDropdown(false); setEditingClinicAdmin(null); }}>
                    <X size={18} color={colors.muted} />
                  </TouchableOpacity>
                </View>

                {/* Form Fields */}
                <LiquidBorderScrollView
                  style={{ padding: spacing.lg }}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled">
                  <Text style={styles.formLabelText}>
                    Full Name <Text style={{ color: colors.destructive }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.formInputBox, styles.formInputFocused]}
                    placeholder="Enter full name"
                    placeholderTextColor={colors.subtle}
                    value={editAdminFullName}
                    onChangeText={setEditAdminFullName}
                  />

                  <Text style={[styles.formLabelText, { marginTop: 10 }]}>
                    Phone Number <Text style={{ color: colors.destructive }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.formInputBox}
                    placeholder="9876543210"
                    placeholderTextColor={colors.subtle}
                    keyboardType="phone-pad"
                    value={editAdminPhone}
                    onChangeText={setEditAdminPhone}
                  />

                  <Text style={[styles.formLabelText, { marginTop: 10 }]}>Address</Text>
                  <TextInput
                    style={[styles.formInputBox, { height: 60, textAlignVertical: 'top' }]}
                    placeholder="Enter clinic admin's address (optional)"
                    placeholderTextColor={colors.subtle}
                    multiline
                    value={editAdminAddress}
                    onChangeText={setEditAdminAddress}
                  />

                  <Text style={[styles.formLabelText, { marginTop: 10 }]}>Email Address</Text>
                  <TextInput
                    style={[styles.formInputBox, { backgroundColor: colors.secondary, color: colors.muted }]}
                    value={editingClinicAdmin?.email}
                    editable={false}
                  />

                  {/* Active Status Card */}
                  <View style={styles.adminStatusCard}>
                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                      <Text style={styles.adminStatusCardTitle}>Active Status</Text>
                      <Text style={styles.adminStatusCardSubtitle}>Enable or disable this admin's access</Text>
                    </View>
                    <View style={{ position: 'relative' }}>
                      <TouchableOpacity
                        style={styles.adminStatusDropdownBtn}
                        onPress={() => setShowEditAdminStatusDropdown(!showEditAdminStatusDropdown)}>
                        <Text style={styles.adminStatusDropdownText}>
                          {editAdminIsActive ? 'Active' : 'Inactive'}
                        </Text>
                        <ChevronDown size={14} color={colors.muted} style={{ marginLeft: spacing.tiny }} />
                      </TouchableOpacity>

                      {showEditAdminStatusDropdown && (
                        <View style={styles.adminStatusDropdownMenu}>
                          <TouchableOpacity
                            style={[styles.adminStatusDropdownOption, editAdminIsActive && styles.adminStatusDropdownOptionSelected]}
                            onPress={() => {
                              setEditAdminIsActive(true);
                              setShowEditAdminStatusDropdown(false);
                            }}>
                            <Text style={[styles.adminStatusOptionText, editAdminIsActive && styles.adminStatusOptionTextActive]}>
                              Active
                            </Text>
                            {editAdminIsActive && <Check size={14} color={colors.primary} />}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.adminStatusDropdownOption, !editAdminIsActive && styles.adminStatusDropdownOptionSelected]}
                            onPress={() => {
                              setEditAdminIsActive(false);
                              setShowEditAdminStatusDropdown(false);
                            }}>
                            <Text style={[styles.adminStatusOptionText, !editAdminIsActive && styles.adminStatusOptionTextActive]}>
                              Inactive
                            </Text>
                            {!editAdminIsActive && <Check size={14} color={colors.primary} />}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Reset Password Card */}
                  <View style={styles.adminResetPasswordCard}>
                    <Text style={styles.adminResetPasswordTitle}>Reset Password</Text>
                    <Text style={styles.adminResetPasswordSubtitle}>
                      Set a secure temporary password for this clinic admin.
                    </Text>
                    <TouchableOpacity
                      style={styles.adminResetPasswordBtn}
                      onPress={handleOpenResetPassword}>
                      <KeyRound size={16} color={colors.primary} style={{ marginRight: spacing.tiny }} />
                      <Text style={styles.adminResetPasswordBtnText}>Reset Password</Text>
                    </TouchableOpacity>
                  </View>
                </LiquidBorderScrollView>

                {/* Footer */}
                <View style={styles.addAdminFooterRow}>
                  <TouchableOpacity
                    style={styles.addAdminCancelBtn}
                    onPress={() => { setShowEditAdminStatusDropdown(false); setEditingClinicAdmin(null); }}>
                    <Text style={styles.addAdminCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.addAdminSubmitBtn}
                    onPress={handleSaveEditClinicAdmin}
                    disabled={editAdminSaving || !canEditAdmin || adminDetail.loading || Boolean(adminDetail.error) || !adminDetail.data}>
                    {editAdminSaving ? (
                      <ActivityIndicator size="small" color={colors.surface} />
                    ) : (
                      <>
                        <Edit2 size={15} color={colors.surface} style={{ marginRight: spacing.tiny }} />
                        <Text style={styles.addAdminSubmitText}>Update Admin</Text>
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
      {/* 🔑 RESET PASSWORD MODAL                                                    */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <Modal visible={isResetPasswordOpen} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setIsResetPasswordOpen(false)}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback>
              <View style={[styles.addAdminCard, isMobile && { width: '96%', maxHeight: '92%' }]}>
                {/* Header */}
                <View style={styles.addAdminHeader}>
                  <View style={styles.userPlusIconBox}>
                    <KeyRound color={colors.primary} size={20} />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={styles.addAdminTitle}>Reset Password</Text>
                    <Text style={styles.addAdminSubtitle}>
                      Set a secure temporary password for {editingClinicAdmin?.full_name || 'this clinic admin'}.
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsResetPasswordOpen(false)}>
                    <X size={18} color={colors.muted} />
                  </TouchableOpacity>
                </View>

                {/* Body */}
                <View style={{ padding: spacing.lg }}>
                  <Text style={styles.formLabelText}>
                    New password <Text style={{ color: colors.destructive }}>*</Text>
                  </Text>
                  <View style={[styles.passwordInputContainer, !!resetPasswordErrors.password && styles.invalidInputBox]}>
                    <TextInput
                      style={styles.passwordInputField}
                      placeholder="Enter at least 8 characters"
                      placeholderTextColor={colors.subtle}
                      secureTextEntry={!showNewPassword}
                      value={newPasswordVal}
                      onChangeText={(val) => {
                        setNewPasswordVal(val);
                        setResetPasswordErrors((prev) => ({
                          ...prev,
                          password: '',
                          confirm: confirmPasswordVal && confirmPasswordVal !== val ? 'Passwords do not match.' : '',
                        }));
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={styles.passwordEyeBtn}>
                      {showNewPassword ? <EyeOff size={16} color={colors.muted} /> : <Eye size={16} color={colors.muted} />}
                    </TouchableOpacity>
                  </View>
                  {!!resetPasswordErrors.password && (
                    <Text style={styles.fieldErrorText}>{resetPasswordErrors.password}</Text>
                  )}

                  <Text style={[styles.formLabelText, { marginTop: spacing.md }]}>
                    Confirm password <Text style={{ color: colors.destructive }}>*</Text>
                  </Text>
                  <View style={[styles.passwordInputContainer, !!resetPasswordErrors.confirm && styles.invalidInputBox]}>
                    <TextInput
                      style={styles.passwordInputField}
                      placeholder="Re-enter the new password"
                      placeholderTextColor={colors.subtle}
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPasswordVal}
                      onChangeText={(val) => {
                        setConfirmPasswordVal(val);
                        setResetPasswordErrors((prev) => ({ ...prev, confirm: '' }));
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.passwordEyeBtn}>
                      {showConfirmPassword ? <EyeOff size={16} color={colors.muted} /> : <Eye size={16} color={colors.muted} />}
                    </TouchableOpacity>
                  </View>
                  {!!resetPasswordErrors.confirm && (
                    <Text style={styles.fieldErrorText}>{resetPasswordErrors.confirm}</Text>
                  )}
                </View>

                {/* Footer */}
                <View style={styles.addAdminFooterRow}>
                  <TouchableOpacity
                    style={styles.addAdminCancelBtn}
                    onPress={() => setIsResetPasswordOpen(false)}
                    disabled={resetPasswordSaving}>
                    <Text style={styles.addAdminCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.addAdminSubmitBtn}
                    onPress={handleExecuteResetPassword}
                    disabled={resetPasswordSaving}>
                    {resetPasswordSaving ? (
                      <ActivityIndicator size="small" color={colors.surface} />
                    ) : (
                      <>
                        <KeyRound size={15} color={colors.surface} style={{ marginRight: spacing.tiny }} />
                        <Text style={styles.addAdminSubmitText}>Reset Password</Text>
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
  container: { flex: 1, backgroundColor: colors.background },
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
    borderRadius: radii.lg,
    backgroundColor: colors.mintBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: { fontFamily: typography.family, fontSize: typography.size.heading, fontWeight: typography.weight.bold, color: colors.text },
  bannerSubtitle: { fontFamily: typography.family, fontSize: typography.size.caption, color: colors.muted, marginTop: 2 },

  upgradeLinkBtn: { paddingVertical: spacing.xs },
  upgradeLinkText: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.caption, fontWeight: typography.weight.medium },
  upgradeLinkHighlight: { fontFamily: typography.family, color: colors.primary, fontSize: typography.size.caption, fontWeight: typography.weight.semibold, textDecorationLine: 'underline' },

  // Top Container Card
  topCardBorder: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  topCardBorderActive: {
    borderColor: '#7DD3C7',
    borderWidth: 1.5,
    shadowOpacity: 0.2,
  },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  controlsRowWebHeader: {
    backgroundColor: '#E2F7F5',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  dashboardBody: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  controlsRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  controlLabel: { fontFamily: typography.family, fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.muted, marginBottom: spacing.xs, textTransform: 'uppercase' },
  performanceDateLabel: { fontFamily: typography.family, fontSize: typography.size.body, fontWeight: typography.weight.semibold, color: colors.text, marginBottom: spacing.tiny },
  performanceDateTrigger: { height: 44, minHeight: 44, borderRadius: radii.sm, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: spacing.md, paddingVertical: 0 },
  performanceDateText: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.body, fontWeight: typography.weight.medium },

  controlSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  controlSelectBtnText: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.body, fontWeight: typography.weight.semibold },

  controlDropdownMenu: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    elevation: 16,
    zIndex: 99,
  },
  controlDropdownItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  controlDropdownItemText: { fontFamily: typography.family, fontSize: typography.size.caption, color: colors.foreground },

  refreshCol: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  refreshColMobile: { width: '100%', alignItems: 'stretch', marginTop: spacing.xs },
  webRefreshButton: { height: 44, borderRadius: radii.sm, borderColor: colors.border, backgroundColor: colors.background },

  sectionHeaderRow: { marginTop: 14, marginBottom: spacing.md },
  sectionTitle: { fontFamily: typography.family, fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.text },
  sectionSubtitle: { fontFamily: typography.family, fontSize: typography.size.sm, color: colors.muted, marginTop: 2 },

  // KPI Grid 4
  kpiGrid4: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  kpiGrid3: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  kpiGridMobile: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  kpiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 10,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  kpiCardDesktop: { width: '23.8%' },
  kpiCardDesktop3: { width: '32%' },
  kpiCardMobile: { width: '48%', minWidth: 0, padding: 10 },
  kpiCardActive: { borderColor: colors.primary, borderWidth: 2 },

  kpiLabel: { fontFamily: typography.family, fontSize: typography.size.caption, fontWeight: typography.weight.semibold, color: colors.muted },
  kpiValue: { fontFamily: typography.family, fontSize: typography.size.title, fontWeight: typography.weight.extrabold, color: colors.text, marginTop: 2 },
  kpiSub: { fontFamily: typography.family, fontSize: typography.size.xs, color: colors.subtle, marginTop: 2 },

  kpiIconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  kpiCardSnapshot: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 10,
    backgroundColor: colors.background,
    ...shadows.card,
  },
  snapshotValue: { fontFamily: typography.family, fontSize: typography.size.lg, fontWeight: typography.weight.extrabold, color: colors.text },
  snapshotLabel: { fontFamily: typography.family, fontSize: typography.size.sm, color: colors.muted, marginTop: 1, fontWeight: typography.weight.semibold },

  // Middle Metric Grid 4
  metricGrid4: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 10,
  },
  metricIconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: { fontFamily: typography.family, fontSize: typography.size.lg, fontWeight: typography.weight.extrabold, color: colors.text },
  metricLabel: { fontFamily: typography.family, fontSize: typography.size.sm, color: colors.muted, fontWeight: typography.weight.semibold },

  // Search and Filter Bar
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  searchFilterParent: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  searchFilterParentActive: {
    borderColor: '#7DD3C7',
    borderWidth: 1.5,
    shadowOpacity: 0.2,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 42,
  },
  searchBarFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  searchInput: { fontFamily: typography.family, flex: 1, fontSize: typography.size.caption, color: colors.text },

  statusTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    height: 42,
    minWidth: 120,
  },
  statusTriggerBtnText: { fontFamily: typography.family, fontSize: typography.size.caption, color: colors.foreground, fontWeight: typography.weight.semibold },
  statusDropdownMenu: {
    position: 'absolute',
    top: 46,
    right: 0,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    elevation: 6,
    zIndex: 99,
  },
  statusDropdownItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  statusDropdownItemText: { fontFamily: typography.family, fontSize: typography.size.caption, color: colors.foreground },

  // Table Card
  tableCardContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  tableHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  tableTitleText: { fontFamily: typography.family, fontSize: typography.size.subtitle, fontWeight: typography.weight.bold, color: colors.text },
  columnsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.tiny,
    backgroundColor: colors.surface,
  },
  columnsBtnText: { fontFamily: typography.family, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.foreground },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    minHeight: 39,
    paddingHorizontal: 11,
    borderRadius: 9,
  },
  addBtnText: { fontFamily: typography.family, color: colors.surface, fontWeight: typography.weight.extrabold, fontSize: typography.size.sm },
  createClinicButton: {
    width: '100%',
    minHeight: 39,
    paddingHorizontal: 11,
    borderRadius: 9,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginBottom: spacing.xs,
  },
  createClinicButtonText: { fontFamily: typography.family, color: colors.surface, fontSize: typography.size.sm, fontWeight: typography.weight.extrabold },

  // Table Structure
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  thCell: { fontFamily: typography.family, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.muted },

  tableBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },

  clinicLogoSquare: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  clinicListLogoImage: { width: '100%', height: '100%' },
  clinicTitleText: { fontFamily: typography.family, fontSize: typography.size.caption, fontWeight: typography.weight.bold, color: colors.text },
  codeText: { fontFamily: typography.family, fontSize: typography.size.xs, color: colors.muted, marginTop: 1 },
  tdText: { fontFamily: typography.family, fontSize: typography.size.sm, color: colors.foreground },

  statusPillBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.md,
  },
  statusActiveBg: { backgroundColor: colors.successSoft },
  statusInactiveBg: { backgroundColor: '#FEE2E2' },
  statusPillText: { fontFamily: typography.family, fontSize: typography.size.xs, fontWeight: typography.weight.bold },
  statusActiveText: { color: '#166534' },
  statusInactiveText: { color: colors.destructiveDark },

  // Mobile Cards
  mobileClinicCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    minWidth: 0,
    ...shadows.card,
  },
  mobileMetaRow: { gap: spacing.xs, paddingTop: spacing.tiny, borderTopWidth: 1, borderTopColor: colors.secondary, minWidth: 0 },
  clinicMetaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.tiny, minWidth: 0 },
  metaText: { fontFamily: typography.family, fontSize: typography.size.sm, color: colors.muted, flexShrink: 1, minWidth: 0 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', padding: spacing.xl },
  modalCard: { backgroundColor: colors.surface, borderRadius: radii.xl, overflow: 'hidden', maxWidth: 440, alignSelf: 'center', width: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.secondary },
  modalTitle: { fontFamily: typography.family, fontSize: typography.size.title, fontWeight: typography.weight.bold, color: colors.text },
  label: { fontFamily: typography.family, fontSize: typography.size.body, fontWeight: typography.weight.semibold, color: colors.foreground, marginTop: 10, marginBottom: spacing.xs },
  input: { fontFamily: typography.family, borderWidth: 1, borderColor: colors.input, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: typography.size.caption, color: colors.text },
  modalBtnRow: { flexDirection: 'row', gap: 10, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.secondary, justifyContent: 'flex-end' },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: 10, borderWidth: 1, borderColor: colors.input, borderRadius: radii.md },
  cancelText: { fontFamily: typography.family, color: colors.muted, fontWeight: typography.weight.semibold, fontSize: typography.size.caption },
  saveBtn: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: radii.md },
  saveText: { fontFamily: typography.family, color: colors.surface, fontWeight: typography.weight.bold, fontSize: typography.size.caption },

  // Action Popover Menu (Screenshot 2 Match)
  actionPopoverMenu: {
    position: 'absolute',
    top: 32,
    right: 0,
    width: 175,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.tiny,
    paddingHorizontal: spacing.xs,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  popoverItemText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.foreground,
  },

  // View Clinic Modal Styles (Screenshot 3 Match)
  viewClinicCard: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    overflow: 'hidden',
    elevation: 10,
    alignSelf: 'center',
  },
  viewClinicHeader: {
    backgroundColor: '#ECFDF5',
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  clinicLogoSquareLarge: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.mintBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 3,
  },
  viewClinicLogoImage: { width: '100%', height: '100%', padding: spacing.xs },
  viewClinicTitle: { fontFamily: typography.family, fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.text },
  viewClinicSubtitle: { fontFamily: typography.family, fontSize: typography.size.sm, color: colors.muted, marginTop: 2 },
  viewClinicStatusTag: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.md,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  viewClinicStatusText: { fontFamily: typography.family, fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: '#166534' },

  viewSectionCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 14,
  },
  availabilityBgCard: {
    backgroundColor: colors.mint,
    borderColor: colors.mintBorder,
  },
  sectionHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  viewSectionCardTitle: { fontFamily: typography.family, fontSize: typography.size.body, fontWeight: typography.weight.bold, color: colors.text },
  grid2ColRow: { flexDirection: 'row', gap: spacing.lg },
  grid3ColRow: { flexDirection: 'row', gap: spacing.md },
  infoBoxLabel: { fontFamily: typography.family, fontSize: typography.size.xs, color: colors.muted, fontWeight: typography.weight.medium },
  infoBoxVal: { fontFamily: typography.family, fontSize: typography.size.caption, fontWeight: typography.weight.bold, color: colors.text, marginTop: 3 },

  viewClinicFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
  },
  viewClinicCloseBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: radii.md,
  },
  viewClinicCloseBtnText: { fontFamily: typography.family, color: colors.surface, fontWeight: typography.weight.bold, fontSize: typography.size.caption },

  // View Admins Modal Styles (Screenshot 4 Match)
  viewAdminsCard: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    overflow: 'hidden',
    elevation: 10,
    alignSelf: 'center',
  },
  viewAdminsHeader: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  tealIconBoxSquare: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAdminsTitle: { fontFamily: typography.family, fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.text },
  viewAdminsSubtitle: { fontFamily: typography.family, fontSize: typography.size.sm, color: colors.muted, marginTop: 2 },
  viewAdminsSubHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  addNewAdminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  addNewAdminBtnText: { fontFamily: typography.family, color: colors.surface, fontWeight: typography.weight.bold, fontSize: typography.size.caption },

  adminsTableContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  adminsTableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  adminsTh: { fontFamily: typography.family, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.muted },
  adminsTableBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  adminAvatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  adminNameText: { fontFamily: typography.family, fontSize: typography.size.caption, fontWeight: typography.weight.semibold, color: colors.text },
  adminTdText: { fontFamily: typography.family, fontSize: typography.size.sm, color: colors.muted },
  adminStatusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.md,
  },
  adminStatusText: { fontFamily: typography.family, fontSize: typography.size.xs, fontWeight: typography.weight.bold },

  // Add Admin Modal Styles (Screenshot 5 Match)
  addAdminCard: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    overflow: 'hidden',
    elevation: 10,
    alignSelf: 'center',
  },
  addAdminHeader: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  userPlusIconBox: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAdminTitle: { fontFamily: typography.family, fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.text },
  addAdminSubtitle: { fontFamily: typography.family, fontSize: typography.size.sm, color: colors.muted, marginTop: 2, lineHeight: 16 },
  formGroupHeader: { fontFamily: typography.family, fontSize: typography.size.body, fontWeight: typography.weight.bold, color: colors.text, marginBottom: spacing.md },
  formLabelText: { fontFamily: typography.family, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.foreground, marginTop: 10, marginBottom: spacing.xs },
  formInputBox: {
    fontFamily: typography.family, borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    fontSize: typography.size.caption,
    color: colors.text,
    backgroundColor: colors.background,
  },
  formInputFocused: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },

  assignedClinicCard: {
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: colors.mintBorder,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: 14,
    marginBottom: spacing.tiny,
  },
  assignedClinicHeaderLabel: { fontFamily: typography.family, fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.muted },
  assignedClinicName: { fontFamily: typography.family, fontSize: typography.size.caption, fontWeight: typography.weight.bold, color: colors.text },
  assignedClinicAddress: { fontFamily: typography.family, fontSize: typography.size.sm, color: colors.muted },

  addAdminFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.secondary,
    backgroundColor: colors.surface,
  },
  addAdminCancelBtn: {
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radii.md,
  },
  addAdminCancelText: { fontFamily: typography.family, fontSize: typography.size.caption, fontWeight: typography.weight.semibold, color: colors.foreground },
  addAdminSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radii.md,
  },
  addAdminSubmitText: { fontFamily: typography.family, color: colors.surface, fontWeight: typography.weight.bold, fontSize: typography.size.caption },

  // Edit / Add Clinic Modal Specific Styles
  editClinicModalCard: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    overflow: 'hidden',
    elevation: 10,
    alignSelf: 'center',
  },
  clinicLogoUploadBox: {
    alignSelf: 'center',
    width: 220,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  cameraIconCircleBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.input,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: colors.surface,
  },
  smallCloseBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.secondary,
    borderRadius: radii.md,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.input,
  },
  formDropdownSelectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    backgroundColor: colors.background,
  },
  formDropdownText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    color: colors.text,
  },
  formDropdownList: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    marginTop: spacing.xs,
    maxHeight: 150,
    elevation: 3,
    zIndex: 99,
  },
  formDropdownListItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  formDropdownItemText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    color: colors.foreground,
  },
  formInputBoxWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    backgroundColor: colors.background,
  },
  formInputBoxBare: {
    fontFamily: typography.family, flex: 1,
    paddingVertical: spacing.sm,
    fontSize: typography.size.caption,
    color: colors.text,
  },
  editClinicModalHeader: {
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
    backgroundColor: colors.surface,
  },
  editHeaderIconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editClinicModalTitle: {
    fontFamily: typography.family, fontSize: typography.size.subtitle,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  editClinicModalSubtitle: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    color: colors.muted,
    marginTop: 2,
  },
  logoBoxLabel: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  changeLogoLink: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  logoHelperText: {
    fontFamily: typography.family, fontSize: typography.size.xs,
    color: colors.subtle,
    marginTop: spacing.xs,
  },
  apiTimeHelperText: {
    fontFamily: typography.family, fontSize: typography.size.xs,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  mobileAdminCardItem: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  // Active Status in Edit Admin Modal
  adminStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    marginTop: 14,
    backgroundColor: colors.surface,
  },
  adminStatusCardTitle: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  adminStatusCardSubtitle: {
    fontFamily: typography.family, fontSize: typography.size.xs,
    color: colors.muted,
    marginTop: 2,
  },
  adminStatusDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    minWidth: 96,
  },
  adminStatusDropdownText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  adminStatusDropdownMenu: {
    position: 'absolute',
    top: 36,
    right: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    elevation: 6,
    zIndex: 999,
    minWidth: 110,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  adminStatusDropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  adminStatusDropdownOptionSelected: {
    backgroundColor: colors.mint,
  },
  adminStatusOptionText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    color: colors.foreground,
  },
  adminStatusOptionTextActive: {
    color: colors.primary,
    fontWeight: typography.weight.semibold,
  },

  // Reset Password Card in Edit Admin Modal
  adminResetPasswordCard: {
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: colors.mintBorder,
    borderRadius: radii.lg,
    padding: 14,
    marginTop: 14,
  },
  adminResetPasswordTitle: {
    fontFamily: typography.family, fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  adminResetPasswordSubtitle: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    color: colors.muted,
    marginTop: 3,
    marginBottom: spacing.md,
  },
  adminResetPasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.mintBorder,
    borderRadius: radii.md,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  adminResetPasswordBtnText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },

  // Password Input Field with Eye Icon
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    marginTop: spacing.xs,
  },
  passwordInputField: {
    fontFamily: typography.family, flex: 1,
    paddingVertical: 9,
    fontSize: typography.size.caption,
    color: colors.text,
  },
  passwordEyeBtn: {
    padding: spacing.tiny,
  },
  invalidInputBox: {
    borderColor: colors.destructive,
    borderWidth: 1.5,
  },
  fieldErrorText: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    color: colors.destructive,
    marginTop: spacing.xs,
    fontWeight: typography.weight.medium,
  },
});

export default ClinicsManagementScreen;
