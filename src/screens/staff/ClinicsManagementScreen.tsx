// src/screens/staff/ClinicsManagementScreen.tsx
import { styles } from './styles/ClinicsManagement.styles';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
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
  Check,
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
import { Pagination } from '../../components/common/Pagination';
import { CustomCalendarPicker } from '../../components/common/CustomCalendarPicker';
import { ColumnSelectorModal } from '../../components/common/ColumnSelectorModal';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { useAuthContext } from '../../context/AuthContext';
import { useRemoteData } from '../../hooks/useRemoteData';
import { fetchUserRolesApi } from '../../api/roleManagementApi';
import { dashboardNumber, displayAmount } from '../../utils/dashboardValues';
import {
  chooseAndUploadClinicLogo,
  profilePhotoUrl,
} from '../../api/profilePhotoApi';
import {
  createClinicUserApi,
  deactivateStaffApi,
  resetStaffPasswordApi,
  updateClinicUserApi,
} from '../../api/userManagementApi';
import {
  createClinicApi,
  getClinicAdminNetworkApi,
  getClinicCitiesApi,
  getClinicDetailsApi,
  getClinicLocationsApi,
  getClinicPerformanceApi,
  getMyClinicsApi,
  updateClinicApi,
} from '../../api/clinicApi';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { notifyProfileUpdated } from '../../utils/profileEvents';
import {
  CLINIC_COLUMN_OPTIONS as clinicColumnOptions,
  ClinicAdminItem,
  ClinicColumnKey,
  ClinicFormState,
  ClinicItem,
  DEFAULT_CLINIC_FORM,
} from './clinics/clinicTypes';
export { checkIsMultiClinicPlan } from './clinics/clinicUtils';
export type {
  ClinicAdminItem,
  ClinicColumnKey,
  ClinicFormState,
  ClinicItem,
} from './clinics/clinicTypes';

interface Props {
  onOpenDrawer: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export const ClinicsManagementScreen: React.FC<Props> = ({
  onOpenDrawer,
  onNavigateScreen,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const {
    token,
    user,
    activeClinicId,
    activeClinicName,
    isMultiPlan,
    role,
    permissionsMap = {},
    updateClinicName,
  } = useAuthContext();
  const canView = canUseStaffScreen(role, permissionsMap, 'clinics');
  const canAdd =
    canView && canUseStaffScreen(role, permissionsMap, 'clinics', 'add');
  const canEdit =
    canView && canUseStaffScreen(role, permissionsMap, 'clinics', 'edit');
  const canDelete =
    canView && canUseStaffScreen(role, permissionsMap, 'clinics', 'delete');
  const canViewAdmins = canUseStaffScreen(role, permissionsMap, 'staff');
  const canAddAdmin =
    canViewAdmins && canUseStaffScreen(role, permissionsMap, 'staff', 'add');
  const canEditAdmin =
    canViewAdmins && canUseStaffScreen(role, permissionsMap, 'staff', 'edit');
  const canDeleteAdmin =
    canViewAdmins && canUseStaffScreen(role, permissionsMap, 'staff', 'delete');
  const canExecuteAdmin =
    canViewAdmins &&
    canUseStaffScreen(role, permissionsMap, 'staff', 'execute');
  const scope = [
    token,
    user?.id,
    activeClinicId,
    canView,
    canAdd,
    canEdit,
    canDelete,
    canViewAdmins,
    canAddAdmin,
    canEditAdmin,
    canDeleteAdmin,
    canExecuteAdmin,
  ].join(':');
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const busyRef = useRef(false);
  useEffect(() => {
    scopeRef.current = scope;
    return () => {
      scopeRef.current = '';
    };
  }, [scope]);

  const resource = useRemoteData(
    scope + ':clinics',
    async signal => {
      const response = await getMyClinicsApi(signal);
      if (!response.success || !Array.isArray(response.data?.clinics))
        throw new Error(response.message);
      return {
        rows: response.data.clinics.map(
          c =>
            ({
              ...c,
              id: c.id,
              name: c.name || '',
              code: c.code || '',
              email: c.email || '',
              phone: c.phone || '',
              address: c.address || '',
              admins_count: c.admins_count,
              status: Number(c.is_active) === 1 ? 'Active' : 'Inactive',
            } as ClinicItem),
        ),
        refreshed: new Date().toLocaleString(),
      };
    },
    Boolean(token && canView),
  );
  const clinics = useMemo(() => resource.data?.rows ?? [], [resource.data]);
  const adminCounts = useRemoteData(
    scope + ':admin-counts:' + clinics.map(c => c.id).join(','),
    async signal => {
      const results = await Promise.all(
        clinics.map(async clinic => {
          const response = await getClinicAdminNetworkApi(clinic.id, signal);
          if (!response.success || !Array.isArray(response.data?.data))
            throw new Error(response.message);
          return {
            clinicId: String(clinic.id),
            ids: [
              ...new Set(response.data.data.map(admin => String(admin.id))),
            ],
          };
        }),
      );
      return {
        byClinic: Object.fromEntries(
          results.map(row => [row.clinicId, row.ids.length]),
        ),
        total: new Set(results.flatMap(row => row.ids)).size,
      };
    },
    Boolean(token && canView && canViewAdmins && clinics.length),
  );
  const isMultiClinicPlan = role === 'super_admin' || Boolean(isMultiPlan);
  const lastRefreshed = resource.error
    ? 'Unable to load. Please refresh.'
    : resource.data?.refreshed || 'Loading...';
  const [selectedClinicFilter, setSelectedClinicFilter] = useState<string>(
    activeClinicName || '',
  );
  const [selectedPerformanceDate, setSelectedPerformanceDate] = useState<Date>(
    new Date(),
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] =
    useState<string>('Active');
  const [showStatusDropdown, setShowStatusDropdown] = useState<boolean>(false);
  const [showClinicSelectDropdown, setShowClinicSelectDropdown] =
    useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Show / Hide Columns state
  const [showColumnsModal, setShowColumnsModal] = useState<boolean>(false);
  const [visibleClinicColumns, setVisibleClinicColumns] = useState<
    Record<ClinicColumnKey, boolean>
  >(
    () =>
      Object.fromEntries(
        clinicColumnOptions.map(c => [c.key, c.defaultVisible]),
      ) as Record<ClinicColumnKey, boolean>,
  );

  const toggleClinicColumn = (key: ClinicColumnKey) => {
    setVisibleClinicColumns(prev => {
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
      Object.fromEntries(
        clinicColumnOptions.map(c => [c.key, c.defaultVisible]),
      ) as Record<ClinicColumnKey, boolean>,
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
    return clinics.filter(item => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.phone.includes(searchQuery) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        selectedStatusFilter === 'All Status' ||
        item.status === selectedStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clinics, searchQuery, selectedStatusFilter]);

  const totalPages = Math.ceil(filteredClinics.length / pageSize) || 1;

  const paginatedClinics = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClinics.slice(start, start + pageSize);
  }, [filteredClinics, currentPage, pageSize]);

  const selectedClinicId =
    clinics.find(c => c.name === selectedClinicFilter)?.id || activeClinicId;
  const selectedDate = [
    selectedPerformanceDate.getFullYear(),
    String(selectedPerformanceDate.getMonth() + 1).padStart(2, '0'),
    String(selectedPerformanceDate.getDate()).padStart(2, '0'),
  ].join('-');
  const performance = useRemoteData(
    scope + ':performance:' + selectedClinicId + ':' + selectedDate,
    async signal => {
      if (!selectedClinicId) throw new Error('Select a clinic');
      const result = await getClinicPerformanceApi(
        selectedClinicId,
        selectedDate,
        signal,
      );
      if (!result.success || !result.data?.stats)
        throw new Error(result.message);
      return result.data.stats;
    },
    Boolean(token && canView && selectedClinicId),
  );
  useEffect(() => {
    if (performance.error)
      showErrorToast('Performance unavailable', 'Please use Refresh to retry.');
  }, [performance.error]);
  const metric = (key: string) => dashboardNumber(performance.data?.[key]);
  const treatment = metric('treatment_revenue_today'),
    medicine = metric('medicine_revenue_today');
  const dailyRevenue =
    treatment !== null && medicine !== null ? treatment + medicine : null;
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatusFilter, pageSize, scope]);
  useEffect(() => {
    setSelectedClinicFilter(activeClinicName || '');
  }, [activeClinicName]);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        resource.refresh(),
        performance.refresh(),
        adminCounts.refresh(),
      ]);
    } finally {
      if (scopeRef.current === scope) setIsRefreshing(false);
    }
  };
  const mutate = async (
    action: () => Promise<{ success: boolean; message?: string }>,
    done: () => void,
  ) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const result = await action();
      if (scopeRef.current !== scope) return;
      if (!result.success) throw new Error(result.message);
      done();
      await Promise.all([resource.refresh(), adminCounts.refresh()]);
    } catch (error) {
      if (scopeRef.current === scope)
        showErrorToast(
          'Unable to save',
          error instanceof Error ? error.message : 'Please retry.',
        );
    } finally {
      busyRef.current = false;
    }
  };

  const handleToggleClinicStatus = (id: string | number) => {
    const targetClinic = clinics.find(c => String(c.id) === String(id));
    if (
      !targetClinic ||
      (targetClinic.status === 'Active' ? !canDelete : !canEdit)
    )
      return;

    const isCurrentlyActive = targetClinic.status === 'Active';
    const actionText = isCurrentlyActive ? 'deactivate' : 'activate';
    const message = `Are you sure you want to ${actionText} clinic "${targetClinic.name}"?`;

    const executeToggle = () =>
      mutate(
        () =>
          updateClinicApi(token!, Number(id), {
            is_active: isCurrentlyActive ? 0 : 1,
          }),
        () =>
          showSuccessToast(
            'Status Updated',
            'Clinic status updated successfully.',
          ),
      );

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
        { cancelable: true },
      );
    }
  };

  // Popover Actions Menu State
  const [activeActionMenuClinicId, setActiveActionMenuClinicId] = useState<
    string | number | null
  >(null);

  // View Clinic Details Modal State (Screenshot 3)
  const [viewClinicModal, setViewClinicModal] = useState<ClinicItem | null>(
    null,
  );

  // View Clinic Admins Modal State (Screenshot 4)
  const [viewAdminsModal, setViewAdminsModal] = useState<ClinicItem | null>(
    null,
  );
  const admins = useRemoteData(
    scope + ':admins:' + viewAdminsModal?.id,
    async signal => {
      const result = await getClinicAdminNetworkApi(
        viewAdminsModal!.id,
        signal,
      );
      if (!result.success || !Array.isArray(result.data?.data))
        throw new Error(result.message);
      return result.data.data.map(
        a =>
          ({
            ...a,
            id: String(a.id),
            address: a.address || '',
            status: Number(a.is_active) === 1 ? 'Active' : 'Inactive',
          } as ClinicAdminItem),
      );
    },
    Boolean(viewAdminsModal && canViewAdmins),
  );
  const adminsList = admins.data ?? [];
  useEffect(() => {
    if (admins.error)
      showErrorToast(
        'Unable to load administrators',
        'Close and reopen to retry.',
      );
  }, [admins.error]);

  // Add Clinic Admin Modal State (Screenshot 5)
  const [addAdminModalClinic, setAddAdminModalClinic] =
    useState<ClinicItem | null>(null);
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAddress, setAdminAddress] = useState('');
  const [addAdminSaving, setAddAdminSaving] = useState(false);

  // Admin Handlers
  const handleCreateClinicAdmin = async () => {
    if (
      !canAddAdmin ||
      addAdminSaving ||
      !addAdminModalClinic ||
      busyRef.current
    )
      return;
    if (
      !adminFullName.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim()) ||
      !/^[6-9]\d{9}$/.test(adminPhone) ||
      adminPassword.length < 8
    ) {
      showErrorToast(
        'Validation Error',
        'Enter valid name, email, mobile and a password of at least 8 characters.',
      );
      return;
    }
    setAddAdminSaving(true);
    try {
      await mutate(
        async () => {
          const roles = await fetchUserRolesApi(addAdminModalClinic.id);
          if (!roles.success) return roles;
          const clinicAdminRole = roles.data?.find(
            (r: any) =>
              String(r.role_name).toLowerCase().replace(/ /g, '_') ===
              'clinic_admin',
          ) as any;
          if (!clinicAdminRole)
            return {
              success: false,
              message: 'Clinic Admin role is unavailable.',
            };
          return createClinicUserApi({
            full_name: adminFullName.trim(),
            email: adminEmail.trim(),
            phone: adminPhone,
            password: adminPassword,
            address: adminAddress,
            clinic_id: Number(addAdminModalClinic.id),
            role_id: clinicAdminRole.role_id || clinicAdminRole.id,
          });
        },
        () => {
          setAddAdminModalClinic(null);
          setAdminFullName('');
          setAdminEmail('');
          setAdminPhone('');
          setAdminPassword('');
          setAdminAddress('');
          showSuccessToast(
            'Admin Created',
            'Clinic administrator created successfully.',
          );
        },
      );
    } finally {
      if (scopeRef.current === scope) setAddAdminSaving(false);
    }
  };
  const handleToggleClinicAdminStatus = (id: string) => {
    const admin = adminsList.find(a => a.id === id);
    if (
      !admin ||
      !canEditAdmin ||
      (admin.status === 'Active' && !canDeleteAdmin)
    )
      return;
    mutate(
      () =>
        updateClinicUserApi(id, {
          is_active: admin.status === 'Active' ? 0 : 1,
        }),
      () => {
        admins.refresh();
        showSuccessToast('Status Updated', 'Administrator status updated.');
      },
    );
  };

  // Edit Clinic Admin State
  const [editingClinicAdmin, setEditingClinicAdmin] =
    useState<ClinicAdminItem | null>(null);
  const [editAdminFullName, setEditAdminFullName] = useState('');
  const [editAdminPhone, setEditAdminPhone] = useState('');
  const [editAdminAddress, setEditAdminAddress] = useState('');
  const [editAdminIsActive, setEditAdminIsActive] = useState(true);
  const [showEditAdminStatusDropdown, setShowEditAdminStatusDropdown] =
    useState(false);
  const [editAdminSaving, setEditAdminSaving] = useState(false);

  // Reset Password State
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetPasswordSaving, setResetPasswordSaving] = useState(false);
  const [resetPasswordErrors, setResetPasswordErrors] = useState<{
    password?: string;
    confirm?: string;
  }>({});

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
    if (
      !editingClinicAdmin ||
      editAdminSaving ||
      busyRef.current ||
      !canEditAdmin
    )
      return;
    if (
      !editAdminFullName.trim() ||
      !/^[6-9]\d{9}$/.test(editAdminPhone.trim())
    ) {
      showErrorToast(
        'Validation Error',
        'Enter valid full name and 10-digit mobile number.',
      );
      return;
    }
    setEditAdminSaving(true);
    try {
      await mutate(
        () =>
          updateClinicUserApi(editingClinicAdmin.id, {
            full_name: editAdminFullName.trim(),
            phone: editAdminPhone.trim(),
            address: editAdminAddress.trim(),
            is_active: editAdminIsActive ? 1 : 0,
          }),
        () => {
          setEditingClinicAdmin(null);
          admins.refresh();
          showSuccessToast('Success', 'Clinic admin updated successfully.');
        },
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
    if (!canExecuteAdmin) return;
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
        () =>
          resetStaffPasswordApi(editingClinicAdmin.id, newPasswordVal.trim()),
        () => {
          setIsResetPasswordOpen(false);
          setNewPasswordVal('');
          setConfirmPasswordVal('');
          setResetPasswordErrors({});
          showSuccessToast(
            'Success',
            `Password reset successfully for ${editingClinicAdmin.full_name}.`,
          );
        },
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
        () => deactivateStaffApi(admin.id),
        () => {
          admins.refresh();
          adminCounts.refresh();
          showSuccessToast(
            'Success',
            `Clinic admin "${admin.full_name}" deleted successfully.`,
          );
        },
      );

    const globalObj: any = typeof globalThis !== 'undefined' ? globalThis : {};
    if (globalObj.window && typeof globalObj.window.confirm === 'function') {
      if (globalObj.window.confirm(message)) {
        executeDelete();
      }
    } else {
      Alert.alert(
        'Confirm Deletion',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => executeDelete(),
          },
        ],
        { cancelable: true },
      );
    }
  };

  // Register / Edit Clinic Modal State (Screenshots 1 & 2 Match)
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClinicId, setEditingClinicId] = useState<
    string | number | null
  >(null);
  const [clinicForm, setClinicForm] =
    useState<ClinicFormState>(DEFAULT_CLINIC_FORM);
  const [showFormStateDropdown, setShowFormStateDropdown] = useState(false);
  const [showFormCityDropdown, setShowFormCityDropdown] = useState(false);
  const [showFormCountryDropdown, setShowFormCountryDropdown] = useState(false);
  const [clinicSaving, setClinicSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const logoEditor = useRef(0);
  useEffect(() => {
    logoEditor.current += 1;
    setLogoUploading(false);
  }, [modalVisible, editingClinicId, scope]);
  useEffect(() => {
    setLogoFailed(false);
  }, [clinicForm.logo_url]);
  const handleChooseLogo = async () => {
    if (
      busyRef.current ||
      (editingClinicId ? !canEdit : !canAdd || !isMultiClinicPlan)
    )
      return;
    const revision = logoEditor.current;
    const current = () =>
      scopeRef.current === scope && logoEditor.current === revision;
    busyRef.current = true;
    setLogoUploading(true);
    try {
      const url = await chooseAndUploadClinicLogo(current);
      if (url && current()) setClinicForm(form => ({ ...form, logo_url: url }));
    } catch (error) {
      if (current())
        showErrorToast(
          'Unable to upload logo',
          error instanceof Error ? error.message : 'Please retry.',
        );
    } finally {
      busyRef.current = false;
      if (current()) setLogoUploading(false);
    }
  };
  const locations = useRemoteData(
    scope + ':clinic-locations',
    async signal => {
      const [states, countries] = await getClinicLocationsApi(signal);
      if (
        !states.success ||
        !countries.success ||
        !Array.isArray(states.data) ||
        !Array.isArray(countries.data)
      )
        throw new Error('Unable to load locations');
      return { states: states.data, countries: countries.data };
    },
    Boolean(token && canView),
  );
  const cities = useRemoteData(
    scope + ':clinic-cities:' + clinicForm.state,
    async signal => {
      const result = await getClinicCitiesApi(clinicForm.state, signal);
      if (!result.success || !Array.isArray(result.data))
        throw new Error('Unable to load cities');
      return result.data;
    },
    modalVisible && Boolean(Number(clinicForm.state)),
  );
  const stateOptions = useMemo(
    () => locations.data?.states ?? [],
    [locations.data],
  );
  const cityOptions = useMemo(() => cities.data ?? [], [cities.data]);
  useEffect(() => {
    if (locations.error || cities.error)
      showErrorToast(
        'Locations unavailable',
        'Close and reopen the form to retry.',
      );
  }, [locations.error, cities.error]);
  const stateLabel =
    stateOptions.find(row => String(row.id) === String(clinicForm.state))
      ?.state_name ||
    clinicForm.state ||
    'Select state';
  const cityLabel =
    cityOptions.find(row => String(row.id) === String(clinicForm.city))
      ?.city_name ||
    clinicForm.city ||
    'Select city';

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
    const immediateState = stateOptions.find(
      s => String(s.id) === String(clinic.state),
    )?.state_name;
    setViewClinicModal({
      ...clinic,
      state: immediateState || clinic.state,
    });

    try {
      const response = await getClinicDetailsApi(clinic.id);
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
    setViewClinicModal(null);
    setViewAdminsModal(null);
    setAddAdminModalClinic(null);
    setModalVisible(false);
    setEditingClinicAdmin(null);
    setAdminPassword('');
    setIsRefreshing(false);
    setClinicSaving(false);
    setAddAdminSaving(false);
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
    if (
      clinicSaving ||
      busyRef.current ||
      (editingClinicId ? !canEdit : !canAdd || !isMultiClinicPlan)
    )
      return;
    if (
      !clinicForm.name.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clinicForm.email.trim()) ||
      !/^\d{10}$/.test(clinicForm.phone.trim()) ||
      !clinicForm.address.trim()
    ) {
      showErrorToast(
        'Validation Error',
        'Enter clinic name, valid email, phone and address.',
      );
      return;
    }
    setClinicSaving(true);
    try {
      if (!Number(clinicForm.state) || !Number(clinicForm.city)) {
        showErrorToast('Validation Error', 'Select a state and city.');
        return;
      }
      const toTime = (value: string) => {
        const match = value
          .trim()
          .match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
        if (!match) return null;
        let hours = Number(match[1]);
        if (match[3])
          hours = (hours % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
        return hours <= 23 && Number(match[2]) <= 59
          ? String(hours).padStart(2, '0') + ':' + match[2] + ':00'
          : null;
      };
      if (
        !toTime(clinicForm.available_from) ||
        !toTime(clinicForm.available_to) ||
        toTime(clinicForm.available_from)! >= toTime(clinicForm.available_to)!
      ) {
        showErrorToast(
          'Validation Error',
          'Select a valid opening time before the closing time.',
        );
        return;
      }
      const form = clinicForm;
      const payload = {
        ...form,
        state: Number(form.state),
        city: Number(form.city),
        available_from: toTime(form.available_from),
        available_to: toTime(form.available_to),
      };
      const clinicData = { ...payload };
      delete clinicData.id;
      await mutate(
        () =>
          editingClinicId
            ? updateClinicApi(token!, Number(editingClinicId), clinicData)
            : createClinicApi(token!, clinicData),
        () => {
          if (editingClinicId)
            updateClinicName?.(editingClinicId, form.name.trim());
          setModalVisible(false);
          notifyProfileUpdated();
          showSuccessToast('Clinic Saved', 'Clinic saved successfully.');
        },
      );
    } finally {
      if (scopeRef.current === scope) setClinicSaving(false);
    }
  };

  const totalClinicsCount = resource.data ? clinics.length : '\u2014';
  const activeClinicsCount = resource.data
    ? clinics.filter(c => c.status === 'Active').length
    : '\u2014';
  const inactiveClinicsCount = resource.data
    ? clinics.filter(c => c.status === 'Inactive').length
    : '\u2014';
  const totalAdminsCount =
    adminCounts.data?.total ??
    (resource.data && !clinics.length ? 0 : '\u2014');

  return (
    <View style={styles.container}>
      <StaffHeader
        onOpenDrawer={onOpenDrawer}
        title="Clinic Management"
        onNavigate={path => {
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
        decelerationRate="normal"
      >
        {/* â”€â”€ TOP BANNER HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <View style={[styles.bannerRow, isMobile && styles.bannerRowMobile]}>
          <View style={styles.extractedInline1}>
            <View style={styles.buildingIconBox}>
              <Building color="#0D9488" size={24} />
            </View>
            <View style={styles.extractedInline2}>
              <Text style={styles.bannerTitle}>Clinic Management</Text>
              <Text style={styles.bannerSubtitle}>
                Manage all clinics and their administrators
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.upgradeLinkBtn, isMobile && styles.extractedInline3]}
          >
            <Text style={styles.upgradeLinkText}>
              Multiple clinics ke liye{' '}
              <Text style={styles.upgradeLinkHighlight}>plan upgrade karo</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* â”€â”€ TOP MAIN CONTAINER CARD (DAILY PERFORMANCE & SNAPSHOT) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <View style={styles.topCardBorder}>
          {/* Controls Bar: Clinic Dropdown, Performance Date, Refresh Button */}
          <View
            style={[styles.controlsRow, isMobile && styles.controlsRowMobile]}
          >
            {/* Clinic Dropdown */}
            <View style={styles.extractedInline4}>
              <Text style={styles.controlLabel}>CLINIC</Text>
              <TouchableOpacity
                style={styles.controlSelectBtn}
                onPress={() =>
                  setShowClinicSelectDropdown(!showClinicSelectDropdown)
                }
              >
                <Text style={styles.controlSelectBtnText} numberOfLines={1}>
                  {selectedClinicFilter}
                </Text>
                <ChevronDown color="#64748B" size={16} />
              </TouchableOpacity>

              {showClinicSelectDropdown && (
                <View style={styles.controlDropdownMenu}>
                  {clinics.map(c => (
                    <TouchableOpacity
                      key={String(c.id)}
                      style={styles.controlDropdownItem}
                      onPress={() => {
                        setSelectedClinicFilter(c.name);
                        setShowClinicSelectDropdown(false);
                      }}
                    >
                      <Text style={styles.controlDropdownItemText}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Performance Date with Integrated CustomCalendarPicker */}
            <View style={styles.extractedInline5}>
              <Text style={styles.controlLabel}>Performance Date</Text>
              <CustomCalendarPicker
                selectedDate={selectedPerformanceDate}
                onDateChange={d => setSelectedPerformanceDate(d)}
              />
            </View>

            {/* Refresh Dashboard Button & Timestamp */}
            <View
              style={[styles.refreshCol, isMobile && styles.extractedInline6]}
            >
              <TouchableOpacity
                style={styles.refreshDashBtn}
                onPress={handleRefresh}
                disabled={
                  isRefreshing || resource.loading || performance.loading
                }
              >
                <RefreshCw
                  color="#334155"
                  size={14}
                  style={styles.extractedInline7}
                />
                <Text style={styles.refreshDashBtnText}>Refresh dashboard</Text>
              </TouchableOpacity>
              <Text style={styles.lastRefreshedText}>
                Last refreshed: {lastRefreshed}
              </Text>
            </View>
          </View>

          {/* SECTION 1: Daily Performance */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Daily Performance</Text>
            <Text style={styles.sectionSubtitle}>
              Results for{' '}
              {selectedPerformanceDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>

          <View style={[styles.kpiGrid4, isMobile && styles.kpiGridMobile]}>
            {/* Appointments */}
            <View
              style={[
                styles.kpiCard,
                isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop,
              ]}
            >
              <View
                style={[
                  styles.statsValueCell,
                  isMobile && styles.statsValueCellMobile,
                ]}
              >
                <Text
                  style={[styles.kpiLabel, isMobile && styles.extractedInline8]}
                  numberOfLines={1}
                >
                  Appointments
                </Text>
                <Text
                  style={[styles.kpiValue, isMobile && styles.extractedInline9]}
                >
                  {metric('appointments_today') ?? '\u2014'}
                </Text>
                <Text
                  style={[styles.kpiSub, isMobile && styles.extractedInline10]}
                  numberOfLines={1}
                >
                  Scheduled on date
                </Text>
              </View>
              <View
                style={[
                  styles.kpiIconBox,
                  isMobile && styles.extractedInline11,
                  styles.extractedInline12,
                ]}
              >
                <CalendarIcon color="#0D9488" size={isMobile ? 15 : 18} />
              </View>
            </View>

            {/* Completed */}
            <View
              style={[
                styles.kpiCard,
                isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop,
              ]}
            >
              <View
                style={[
                  styles.statsValueCell,
                  isMobile && styles.statsValueCellMobile,
                ]}
              >
                <Text
                  style={[styles.kpiLabel, isMobile && styles.extractedInline8]}
                  numberOfLines={1}
                >
                  Completed
                </Text>
                <Text
                  style={[styles.kpiValue, isMobile && styles.extractedInline9]}
                >
                  {metric('completed_today') ?? '\u2014'}
                </Text>
                <Text
                  style={[styles.kpiSub, isMobile && styles.extractedInline10]}
                  numberOfLines={1}
                >
                  Visits completed
                </Text>
              </View>
              <View
                style={[
                  styles.kpiIconBox,
                  isMobile && styles.extractedInline11,
                  styles.extractedInline13,
                ]}
              >
                <CheckCircle color="#166534" size={isMobile ? 15 : 18} />
              </View>
            </View>

            {/* Cancelled */}
            <View
              style={[
                styles.kpiCard,
                isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop,
              ]}
            >
              <View
                style={[
                  styles.statsValueCell,
                  isMobile && styles.statsValueCellMobile,
                ]}
              >
                <Text
                  style={[styles.kpiLabel, isMobile && styles.extractedInline8]}
                  numberOfLines={1}
                >
                  Cancelled
                </Text>
                <Text
                  style={[styles.kpiValue, isMobile && styles.extractedInline9]}
                >
                  {metric('cancelled_today') ?? '\u2014'}
                </Text>
                <Text
                  style={[styles.kpiSub, isMobile && styles.extractedInline10]}
                  numberOfLines={1}
                >
                  Appointments cancelled
                </Text>
              </View>
              <View
                style={[
                  styles.kpiIconBox,
                  isMobile && styles.extractedInline11,
                  styles.extractedInline14,
                ]}
              >
                <XCircle color="#991B1B" size={isMobile ? 15 : 18} />
              </View>
            </View>

            {/* Total Revenue */}
            <View
              style={[
                styles.kpiCard,
                isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop,
              ]}
            >
              <View
                style={[
                  styles.statsValueCell,
                  isMobile && styles.statsValueCellMobile,
                ]}
              >
                <Text
                  style={[styles.kpiLabel, isMobile && styles.extractedInline8]}
                  numberOfLines={1}
                >
                  Total Revenue
                </Text>
                <Text
                  style={[styles.kpiValue, isMobile && styles.extractedInline9]}
                >
                  {displayAmount(dailyRevenue)}
                </Text>
                <Text
                  style={[styles.kpiSub, isMobile && styles.extractedInline10]}
                  numberOfLines={1}
                >
                  Treatment + medicine
                </Text>
              </View>
              <View
                style={[
                  styles.kpiIconBox,
                  isMobile && styles.extractedInline11,
                  styles.extractedInline15,
                ]}
              >
                <IndianRupee color="#7E22CE" size={isMobile ? 15 : 18} />
              </View>
            </View>
          </View>

          {/* SECTION 2: Live Operational Snapshot */}
          <View style={[styles.sectionHeaderRow, styles.extractedInline16]}>
            <Text style={styles.sectionTitle}>Live Operational Snapshot</Text>
            <Text style={styles.sectionSubtitle}>
              Current clinic health, independent of the selected date.
            </Text>
          </View>

          <View style={[styles.kpiGrid3, isMobile && styles.kpiGridMobile]}>
            {/* Active Patients */}
            <View
              style={[
                styles.kpiCardSnapshot,
                isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop3,
              ]}
            >
              <View
                style={[
                  styles.kpiIconBox,
                  isMobile && styles.extractedInline11,
                  styles.extractedInline12,
                ]}
              >
                <Users color="#0D9488" size={isMobile ? 15 : 18} />
              </View>
              <View
                style={[
                  styles.detailsValueCell,
                  isMobile && styles.detailsValueCellMobile,
                ]}
              >
                <Text
                  style={[
                    styles.snapshotValue,
                    isMobile && styles.extractedInline17,
                  ]}
                >
                  {metric('total_active_patients') ?? '\u2014'}
                </Text>
                <Text
                  style={[
                    styles.snapshotLabel,
                    isMobile && styles.extractedInline8,
                  ]}
                  numberOfLines={1}
                >
                  Active Patients
                </Text>
              </View>
            </View>

            {/* Pending Lab Tests */}
            <View
              style={[
                styles.kpiCardSnapshot,
                isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop3,
              ]}
            >
              <View
                style={[
                  styles.kpiIconBox,
                  isMobile && styles.extractedInline11,
                  styles.extractedInline18,
                ]}
              >
                <ClipboardList color="#C2410C" size={isMobile ? 15 : 18} />
              </View>
              <View
                style={[
                  styles.detailsValueCell,
                  isMobile && styles.detailsValueCellMobile,
                ]}
              >
                <Text
                  style={[
                    styles.snapshotValue,
                    isMobile && styles.extractedInline17,
                  ]}
                >
                  {metric('pending_lab_tests') ?? '\u2014'}
                </Text>
                <Text
                  style={[
                    styles.snapshotLabel,
                    isMobile && styles.extractedInline8,
                  ]}
                  numberOfLines={1}
                >
                  Pending Lab Tests
                </Text>
              </View>
            </View>

            {/* Low Stock Medicines */}
            <View
              style={[
                styles.kpiCardSnapshot,
                isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop3,
              ]}
            >
              <View
                style={[
                  styles.kpiIconBox,
                  isMobile && styles.extractedInline11,
                  styles.extractedInline18,
                ]}
              >
                <Pill color="#C2410C" size={isMobile ? 15 : 18} />
              </View>
              <View
                style={[
                  styles.detailsValueCell,
                  isMobile && styles.detailsValueCellMobile,
                ]}
              >
                <Text
                  style={[
                    styles.snapshotValue,
                    isMobile && styles.extractedInline17,
                  ]}
                >
                  {metric('low_stock_medicines') ?? '\u2014'}
                </Text>
                <Text
                  style={[
                    styles.snapshotLabel,
                    isMobile && styles.extractedInline8,
                  ]}
                  numberOfLines={1}
                >
                  Low Stock Medicines
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* â”€â”€ MIDDLE ROW: 4 OVERVIEW METRIC CARDS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <View style={[styles.metricGrid4, isMobile && styles.kpiGridMobile]}>
          <View
            style={[
              styles.metricCard,
              isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop,
            ]}
          >
            <View
              style={[
                styles.metricIconBox,
                isMobile && styles.extractedInline11,
                styles.extractedInline19,
              ]}
            >
              <Building color="#0D9488" size={isMobile ? 16 : 20} />
            </View>
            <View
              style={[
                styles.detailsValueCell,
                isMobile && styles.detailsValueCellMobile,
              ]}
            >
              <Text
                style={[
                  styles.metricValue,
                  isMobile && styles.extractedInline17,
                ]}
              >
                {totalClinicsCount}
              </Text>
              <Text
                style={[
                  styles.metricLabel,
                  isMobile && styles.extractedInline8,
                ]}
                numberOfLines={1}
              >
                Total Clinics
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.metricCard,
              isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop,
            ]}
          >
            <View
              style={[
                styles.metricIconBox,
                isMobile && styles.extractedInline11,
                styles.extractedInline13,
              ]}
            >
              <Building color="#166534" size={isMobile ? 16 : 20} />
            </View>
            <View
              style={[
                styles.detailsValueCell,
                isMobile && styles.detailsValueCellMobile,
              ]}
            >
              <Text
                style={[
                  styles.metricValue,
                  isMobile && styles.extractedInline17,
                ]}
              >
                {activeClinicsCount}
              </Text>
              <Text
                style={[
                  styles.metricLabel,
                  isMobile && styles.extractedInline8,
                ]}
                numberOfLines={1}
              >
                Active Clinics
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.metricCard,
              isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop,
            ]}
          >
            <View
              style={[
                styles.metricIconBox,
                isMobile && styles.extractedInline11,
                styles.extractedInline18,
              ]}
            >
              <Users color="#C2410C" size={isMobile ? 16 : 20} />
            </View>
            <View
              style={[
                styles.detailsValueCell,
                isMobile && styles.detailsValueCellMobile,
              ]}
            >
              <Text
                style={[
                  styles.metricValue,
                  isMobile && styles.extractedInline17,
                ]}
              >
                {totalAdminsCount}
              </Text>
              <Text
                style={[
                  styles.metricLabel,
                  isMobile && styles.extractedInline8,
                ]}
                numberOfLines={1}
              >
                Total Admins
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.metricCard,
              isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop,
            ]}
          >
            <View
              style={[
                styles.metricIconBox,
                isMobile && styles.extractedInline11,
                styles.extractedInline14,
              ]}
            >
              <Building color="#991B1B" size={isMobile ? 16 : 20} />
            </View>
            <View
              style={[
                styles.detailsValueCell,
                isMobile && styles.detailsValueCellMobile,
              ]}
            >
              <Text
                style={[
                  styles.metricValue,
                  isMobile && styles.extractedInline17,
                ]}
              >
                {inactiveClinicsCount}
              </Text>
              <Text
                style={[
                  styles.metricLabel,
                  isMobile && styles.extractedInline8,
                ]}
                numberOfLines={1}
              >
                Inactive Clinics
              </Text>
            </View>
          </View>
        </View>

        {/* â”€â”€ SEARCH & STATUS FILTER BAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <View
          style={[styles.searchFilterRow, isMobile && styles.extractedInline20]}
        >
          <View style={styles.searchBar}>
            <Search
              color="#94A3B8"
              size={16}
              style={styles.extractedInline21}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search clinics by name, email, phone or address..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.extractedInline22}>
            <TouchableOpacity
              style={styles.statusTriggerBtn}
              onPress={() => setShowStatusDropdown(!showStatusDropdown)}
            >
              <Text style={styles.statusTriggerBtnText}>
                {selectedStatusFilter}
              </Text>
              <ChevronDown color="#64748B" size={16} />
            </TouchableOpacity>

            {showStatusDropdown && (
              <View style={styles.statusDropdownMenu}>
                {['All Status', 'Active', 'Inactive'].map(s => (
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

        {/* â”€â”€ CLINIC TABLE / LIST CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <View style={styles.tableCardContainer}>
          <View style={styles.tableHeaderBar}>
            <View style={styles.extractedInline23}>
              <Building
                color="#0F172A"
                size={18}
                style={styles.extractedInline21}
              />
              <Text style={styles.tableTitleText}>
                Clinic ({filteredClinics.length})
              </Text>
            </View>
            <View style={styles.extractedInline24}>
              <TouchableOpacity
                style={styles.columnsBtn}
                onPress={() => setShowColumnsModal(true)}
                activeOpacity={0.7}
              >
                <Columns
                  color="#334155"
                  size={14}
                  style={styles.extractedInline7}
                />
                <Text style={styles.columnsBtnText}>Columns</Text>
              </TouchableOpacity>
              {isMultiClinicPlan && (
                <TouchableOpacity
                  style={styles.addBtn}
                  disabled={!canAdd}
                  onPress={handleOpenAddClinicModal}
                >
                  <Plus
                    color="#FFFFFF"
                    size={14}
                    style={styles.extractedInline25}
                  />
                  <Text style={styles.addBtnText}>Add Clinic</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* TABLE CONTENT */}
          {isMobile ? (
            /* Mobile Card View */
            <View style={styles.extractedInline26}>
              {paginatedClinics.map(item => (
                <View key={String(item.id)} style={styles.mobileClinicCard}>
                  {/* Card Header: Clinic Name, Status, Actions */}
                  <View style={styles.extractedInline27}>
                    {visibleClinicColumns.name && (
                      <View style={styles.extractedInline28}>
                        <View style={styles.clinicLogoSquare}>
                          <Building color="#0D9488" size={20} />
                        </View>
                        <View style={styles.extractedInline29}>
                          <Text style={styles.clinicTitleText}>
                            {item.name}
                          </Text>
                          {item.code ? (
                            <Text style={styles.codeText}>{item.code}</Text>
                          ) : null}
                        </View>
                      </View>
                    )}
                    {!visibleClinicColumns.name && (
                      <View style={styles.extractedInline30} />
                    )}

                    {visibleClinicColumns.status && (
                      <View
                        style={[
                          styles.statusPillBadge,
                          item.status === 'Active'
                            ? styles.statusActiveBg
                            : styles.statusInactiveBg,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            item.status === 'Active'
                              ? styles.statusActiveText
                              : styles.statusInactiveText,
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                    )}

                    {visibleClinicColumns.actions && (
                      <TouchableOpacity
                        style={styles.extractedInline31}
                        onPress={() =>
                          setActiveActionMenuClinicId(
                            activeActionMenuClinicId === item.id
                              ? null
                              : item.id,
                          )
                        }
                      >
                        <MoreVertical color="#64748B" size={16} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {activeActionMenuClinicId === item.id && (
                    <View
                      style={[
                        styles.actionPopoverMenu,
                        styles.extractedInline32,
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.popoverItem}
                        onPress={() => {
                          handleOpenViewClinicModal(item);
                        }}
                      >
                        <Eye
                          size={15}
                          color="#334155"
                          style={styles.extractedInline21}
                        />
                        <Text style={styles.popoverItemText}>View Clinic</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.popoverItem}
                        disabled={!canViewAdmins}
                        onPress={() => {
                          setActiveActionMenuClinicId(null);
                          if (canViewAdmins) setViewAdminsModal(item);
                        }}
                      >
                        <Users
                          size={15}
                          color="#334155"
                          style={styles.extractedInline21}
                        />
                        <Text style={styles.popoverItemText}>View Admins</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.popoverItem}
                        disabled={!canEdit}
                        onPress={() => {
                          setActiveActionMenuClinicId(null);
                          handleOpenEditClinicModal(item);
                        }}
                      >
                        <Edit2
                          size={15}
                          color="#334155"
                          style={styles.extractedInline21}
                        />
                        <Text style={styles.popoverItemText}>Edit Clinic</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.popoverItem}
                        disabled={!canAddAdmin}
                        onPress={() => {
                          setActiveActionMenuClinicId(null);
                          if (canAddAdmin) setAddAdminModalClinic(item);
                        }}
                      >
                        <UserPlus
                          size={15}
                          color="#334155"
                          style={styles.extractedInline21}
                        />
                        <Text style={styles.popoverItemText}>Add Admin</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.popoverItem, styles.extractedInline33]}
                        onPress={() => {
                          setActiveActionMenuClinicId(null);
                          handleToggleClinicStatus(item.id);
                        }}
                      >
                        <Trash2
                          size={15}
                          color={
                            item.status === 'Active' ? '#DC2626' : '#16A34A'
                          }
                          style={styles.extractedInline21}
                        />
                        <Text
                          style={[
                            styles.popoverItemText,
                            item.status === 'Active'
                              ? styles.activeActionText
                              : styles.inactiveActionText,
                          ]}
                        >
                          {item.status === 'Active'
                            ? 'Deactivate Clinic'
                            : 'Activate Clinic'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Meta items */}
                  <View style={styles.mobileMetaRow}>
                    {visibleClinicColumns.address && (
                      <View style={styles.mobileMetaItem}>
                        <MapPin size={14} color="#64748B" />
                        <Text style={styles.metaText}>
                          {item.address || '—'}
                        </Text>
                      </View>
                    )}
                    {visibleClinicColumns.contact && (
                      <>
                        {item.email ? (
                          <View style={styles.mobileMetaItem}>
                            <Mail size={14} color="#64748B" />
                            <Text style={styles.metaText}>{item.email}</Text>
                          </View>
                        ) : null}
                        {item.phone ? (
                          <View style={styles.mobileMetaItem}>
                            <Phone size={14} color="#64748B" />
                            <Text style={styles.metaText}>{item.phone}</Text>
                          </View>
                        ) : null}
                      </>
                    )}
                    {visibleClinicColumns.created && (
                      <View style={styles.mobileMetaItem}>
                        <CalendarIcon size={14} color="#64748B" />
                        <Text style={styles.metaText}>
                          Created:{' '}
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString()
                            : '—'}
                        </Text>
                      </View>
                    )}
                    {visibleClinicColumns.country && (
                      <Text style={styles.metaText}>
                        Country: {item.country || '—'}
                      </Text>
                    )}
                    {visibleClinicColumns.website && (
                      <Text style={styles.metaText}>
                        Website: {item.website || '—'}
                      </Text>
                    )}
                    {visibleClinicColumns.license_number && (
                      <Text style={styles.metaText}>
                        License: {item.license_number || '—'}
                      </Text>
                    )}
                    {visibleClinicColumns.available_days && (
                      <Text style={styles.metaText}>
                        Days: {item.available_days || '—'}
                      </Text>
                    )}
                    {visibleClinicColumns.available_from && (
                      <Text style={styles.metaText}>
                        From:{' '}
                        {item.available_from
                          ? String(item.available_from).slice(0, 5)
                          : '—'}
                      </Text>
                    )}
                    {visibleClinicColumns.available_to && (
                      <Text style={styles.metaText}>
                        To:{' '}
                        {item.available_to
                          ? String(item.available_to).slice(0, 5)
                          : '—'}
                      </Text>
                    )}
                    {visibleClinicColumns.admins && (
                      <View style={styles.mobileMetaItem}>
                        <Users size={14} color="#64748B" />
                        <Text style={styles.metaText}>
                          {adminCounts.data?.byClinic[String(item.id)] ??
                            item.admins_count ??
                            '—'}{' '}
                          Admins
                        </Text>
                      </View>
                    )}
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
              decelerationRate="normal"
            >
              <View style={{ minWidth: tableMinWidth }}>
                <View style={styles.tableHeaderRow}>
                  {visibleClinicColumns.name && (
                    <Text style={[styles.thCell, styles.extractedInline34]}>
                      Clinic Name
                    </Text>
                  )}
                  {visibleClinicColumns.address && (
                    <Text style={[styles.thCell, styles.extractedInline35]}>
                      Address
                    </Text>
                  )}
                  {visibleClinicColumns.contact && (
                    <Text style={[styles.thCell, styles.extractedInline35]}>
                      Contact
                    </Text>
                  )}
                  {visibleClinicColumns.created && (
                    <Text style={[styles.thCell, styles.extractedInline36]}>
                      Created
                    </Text>
                  )}
                  {visibleClinicColumns.country && (
                    <Text style={[styles.thCell, styles.extractedInline37]}>
                      Country
                    </Text>
                  )}
                  {visibleClinicColumns.website && (
                    <Text style={[styles.thCell, styles.extractedInline38]}>
                      Website
                    </Text>
                  )}
                  {visibleClinicColumns.license_number && (
                    <Text style={[styles.thCell, styles.extractedInline39]}>
                      License Number
                    </Text>
                  )}
                  {visibleClinicColumns.available_days && (
                    <Text style={[styles.thCell, styles.extractedInline39]}>
                      Available Days
                    </Text>
                  )}
                  {visibleClinicColumns.available_from && (
                    <Text style={[styles.thCell, styles.extractedInline40]}>
                      Available From
                    </Text>
                  )}
                  {visibleClinicColumns.available_to && (
                    <Text style={[styles.thCell, styles.extractedInline40]}>
                      Available To
                    </Text>
                  )}
                  {visibleClinicColumns.admins && (
                    <Text style={[styles.thCell, styles.extractedInline41]}>
                      Admins
                    </Text>
                  )}
                  {visibleClinicColumns.status && (
                    <Text style={[styles.thCell, styles.extractedInline42]}>
                      Status
                    </Text>
                  )}
                  {visibleClinicColumns.actions && (
                    <Text style={[styles.thCell, styles.extractedInline43]}>
                      Actions
                    </Text>
                  )}
                </View>

                {paginatedClinics.map(item => (
                  <View key={String(item.id)} style={styles.tableBodyRow}>
                    {/* Clinic Name */}
                    {visibleClinicColumns.name && (
                      <View style={styles.extractedInline44}>
                        <View style={styles.clinicLogoSquare}>
                          <Building color="#0D9488" size={18} />
                        </View>
                        <View style={styles.extractedInline30}>
                          <Text
                            style={styles.clinicTitleText}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          {item.code ? (
                            <Text style={styles.codeText}>{item.code}</Text>
                          ) : null}
                        </View>
                      </View>
                    )}

                    {/* Address */}
                    {visibleClinicColumns.address && (
                      <View style={styles.extractedInline45}>
                        <MapPin
                          color="#94A3B8"
                          size={14}
                          style={styles.extractedInline25}
                        />
                        <Text style={styles.tdText} numberOfLines={1}>
                          {item.address || '—'}
                        </Text>
                      </View>
                    )}

                    {/* Contact */}
                    {visibleClinicColumns.contact && (
                      <View style={styles.extractedInline35}>
                        <View style={styles.extractedInline23}>
                          <Mail
                            color="#94A3B8"
                            size={12}
                            style={styles.extractedInline25}
                          />
                          <Text style={styles.tdText} numberOfLines={1}>
                            {item.email || '—'}
                          </Text>
                        </View>
                        <View style={styles.extractedInline46}>
                          <Phone
                            color="#94A3B8"
                            size={12}
                            style={styles.extractedInline25}
                          />
                          <Text style={styles.tdText}>{item.phone || '—'}</Text>
                        </View>
                      </View>
                    )}

                    {/* Created */}
                    {visibleClinicColumns.created && (
                      <View style={styles.extractedInline47}>
                        <Text style={styles.tdText}>
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString()
                            : '—'}
                        </Text>
                      </View>
                    )}

                    {/* Country */}
                    {visibleClinicColumns.country && (
                      <View style={styles.extractedInline48}>
                        <Text style={styles.tdText}>{item.country || '—'}</Text>
                      </View>
                    )}

                    {/* Website */}
                    {visibleClinicColumns.website && (
                      <View style={styles.extractedInline49}>
                        <Text style={styles.tdText} numberOfLines={1}>
                          {item.website || '—'}
                        </Text>
                      </View>
                    )}

                    {/* License Number */}
                    {visibleClinicColumns.license_number && (
                      <View style={styles.extractedInline50}>
                        <Text style={styles.tdText} numberOfLines={1}>
                          {item.license_number || '—'}
                        </Text>
                      </View>
                    )}

                    {/* Available Days */}
                    {visibleClinicColumns.available_days && (
                      <View style={styles.extractedInline50}>
                        <Text style={styles.tdText} numberOfLines={1}>
                          {item.available_days || '—'}
                        </Text>
                      </View>
                    )}

                    {/* Available From */}
                    {visibleClinicColumns.available_from && (
                      <View style={styles.extractedInline51}>
                        <Text style={styles.tdText}>
                          {item.available_from
                            ? String(item.available_from).slice(0, 5)
                            : '—'}
                        </Text>
                      </View>
                    )}

                    {/* Available To */}
                    {visibleClinicColumns.available_to && (
                      <View style={styles.extractedInline51}>
                        <Text style={styles.tdText}>
                          {item.available_to
                            ? String(item.available_to).slice(0, 5)
                            : '—'}
                        </Text>
                      </View>
                    )}

                    {/* Admins Count */}
                    {visibleClinicColumns.admins && (
                      <View style={styles.extractedInline52}>
                        <View style={styles.extractedInline23}>
                          <Users
                            color="#64748B"
                            size={14}
                            style={styles.extractedInline25}
                          />
                          <Text style={styles.tdText}>
                            {adminCounts.data?.byClinic[String(item.id)] ??
                              item.admins_count ??
                              '\u2014'}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Status & Toggle Switch */}
                    {visibleClinicColumns.status && (
                      <View style={styles.extractedInline53}>
                        <View
                          style={[
                            styles.statusPillBadge,
                            item.status === 'Active'
                              ? styles.statusActiveBg
                              : styles.statusInactiveBg,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              item.status === 'Active'
                                ? styles.statusActiveText
                                : styles.statusInactiveText,
                            ]}
                          >
                            {item.status}
                          </Text>
                        </View>

                        <Switch
                          value={item.status === 'Active'}
                          onValueChange={() =>
                            handleToggleClinicStatus(item.id)
                          }
                          trackColor={{ false: '#E2E8F0', true: '#99F6E4' }}
                          thumbColor={
                            item.status === 'Active' ? '#0D9488' : '#F1F5F9'
                          }
                        />
                      </View>
                    )}

                    {/* Actions Menu Popover */}
                    {visibleClinicColumns.actions && (
                      <View style={styles.extractedInline54}>
                        <TouchableOpacity
                          style={styles.extractedInline55}
                          onPress={() =>
                            setActiveActionMenuClinicId(
                              activeActionMenuClinicId === item.id
                                ? null
                                : item.id,
                            )
                          }
                        >
                          <MoreVertical color="#64748B" size={16} />
                        </TouchableOpacity>

                        {activeActionMenuClinicId === item.id && (
                          <View style={styles.actionPopoverMenu}>
                            {/* 1. View Clinic */}
                            <TouchableOpacity
                              style={styles.popoverItem}
                              onPress={() => {
                                handleOpenViewClinicModal(item);
                              }}
                            >
                              <Eye
                                size={15}
                                color="#334155"
                                style={styles.extractedInline21}
                              />
                              <Text style={styles.popoverItemText}>
                                View Clinic
                              </Text>
                            </TouchableOpacity>

                            {/* 2. View Admins */}
                            <TouchableOpacity
                              style={styles.popoverItem}
                              disabled={!canViewAdmins}
                              onPress={() => {
                                setActiveActionMenuClinicId(null);
                                if (canViewAdmins) setViewAdminsModal(item);
                              }}
                            >
                              <Users
                                size={15}
                                color="#334155"
                                style={styles.extractedInline21}
                              />
                              <Text style={styles.popoverItemText}>
                                View Admins
                              </Text>
                            </TouchableOpacity>

                            {/* 3. Edit Clinic */}
                            <TouchableOpacity
                              style={styles.popoverItem}
                              disabled={!canEdit}
                              onPress={() => {
                                setActiveActionMenuClinicId(null);
                                handleOpenEditClinicModal(item);
                              }}
                            >
                              <Edit2
                                size={15}
                                color="#334155"
                                style={styles.extractedInline21}
                              />
                              <Text style={styles.popoverItemText}>
                                Edit Clinic
                              </Text>
                            </TouchableOpacity>

                            {/* 4. Add Admin */}
                            <TouchableOpacity
                              style={styles.popoverItem}
                              disabled={!canAddAdmin}
                              onPress={() => {
                                setActiveActionMenuClinicId(null);
                                if (canAddAdmin) setAddAdminModalClinic(item);
                              }}
                            >
                              <UserPlus
                                size={15}
                                color="#334155"
                                style={styles.extractedInline21}
                              />
                              <Text style={styles.popoverItemText}>
                                Add Admin
                              </Text>
                            </TouchableOpacity>

                            {/* 5. Deactivate Clinic / Activate Clinic */}
                            <TouchableOpacity
                              style={[
                                styles.popoverItem,
                                styles.extractedInline56,
                              ]}
                              onPress={() => {
                                setActiveActionMenuClinicId(null);
                                handleToggleClinicStatus(item.id);
                              }}
                            >
                              <Trash2
                                size={15}
                                color={
                                  item.status === 'Active'
                                    ? '#DC2626'
                                    : '#16A34A'
                                }
                                style={styles.extractedInline21}
                              />
                              <Text
                                style={[
                                  styles.popoverItemText,
                                  item.status === 'Active'
                                    ? styles.activeActionText
                                    : styles.inactiveActionText,
                                ]}
                              >
                                {item.status === 'Active'
                                  ? 'Deactivate Clinic'
                                  : 'Activate Clinic'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}
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
            onPageChange={page => setCurrentPage(page)}
            onPageSizeChange={size => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </View>
      </ScrollView>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* ðŸ‘ï¸ SHOW / HIDE COLUMNS MODAL (REUSABLE COMPONENT)                          */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <ColumnSelectorModal
        visible={showColumnsModal}
        onClose={() => setShowColumnsModal(false)}
        columns={clinicColumnOptions}
        visibleColumns={visibleClinicColumns}
        onToggleColumn={toggleClinicColumn}
        onReset={resetClinicColumns}
      />

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* âœï¸ ADD & EDIT CLINIC MODAL (EXACT UPLOADED SCREENSHOTS MATCH)               */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal visible={modalVisible} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.editClinicModalCard,
                  isMobile && styles.extractedInline57,
                ]}
              >
                {/* Header */}
                <View style={styles.editClinicModalHeader}>
                  <View style={styles.editHeaderIconBox}>
                    {editingClinicId ? (
                      <Edit2 color="#0F172A" size={18} />
                    ) : (
                      <Plus color="#0F172A" size={18} />
                    )}
                  </View>
                  <View style={styles.extractedInline29}>
                    <Text style={styles.editClinicModalTitle}>
                      {editingClinicId
                        ? `Edit Clinic: ${clinicForm.name}`
                        : 'Register New Clinic'}
                    </Text>
                    <Text style={styles.editClinicModalSubtitle}>
                      {editingClinicId
                        ? 'Update clinic information.'
                        : 'Register a new clinic into the system.'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Form Body */}
                <ScrollView
                  style={styles.extractedInline58}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  decelerationRate="normal"
                >
                  {/* Clinic Logo Upload Box */}
                  <View style={styles.clinicLogoUploadBox}>
                    <Text style={styles.logoBoxLabel}>Clinic Logo</Text>
                    <View style={styles.cameraIconCircleBadge}>
                      {clinicForm.logo_url && !logoFailed ? (
                        <Image
                          source={{ uri: profilePhotoUrl(clinicForm.logo_url) }}
                          onError={() => setLogoFailed(true)}
                          style={styles.extractedInline59}
                        />
                      ) : (
                        <Camera size={22} color="#64748B" />
                      )}
                      <TouchableOpacity
                        style={styles.smallCloseBadge}
                        disabled={logoUploading || clinicSaving}
                        onPress={() =>
                          setClinicForm(form => ({ ...form, logo_url: '' }))
                        }
                      >
                        <X size={10} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={styles.extractedInline60}
                      disabled={logoUploading || clinicSaving}
                      onPress={handleChooseLogo}
                    >
                      <Text style={styles.changeLogoLink}>Change logo</Text>
                    </TouchableOpacity>
                    <Text style={styles.logoHelperText}>
                      PNG/JPG only, max 2MB
                    </Text>
                  </View>

                  {/* Row 1: Clinic Name & Email */}
                  <View
                    style={[
                      styles.grid2ColRow,
                      isMobile && styles.extractedInline61,
                    ]}
                  >
                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>
                        Clinic Name{' '}
                        <Text style={styles.extractedInline62}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="Aarogya Care Clinic"
                        placeholderTextColor="#94A3B8"
                        value={clinicForm.name}
                        onChangeText={v =>
                          setClinicForm({ ...clinicForm, name: v })
                        }
                      />
                    </View>

                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>
                        Email Address{' '}
                        <Text style={styles.extractedInline62}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="contact@aarogyacare.com"
                        placeholderTextColor="#94A3B8"
                        keyboardType="email-address"
                        value={clinicForm.email}
                        onChangeText={v =>
                          setClinicForm({ ...clinicForm, email: v })
                        }
                      />
                    </View>
                  </View>

                  {/* Row 2: Phone & Address */}
                  <View
                    style={[
                      styles.grid2ColRow,
                      styles.extractedInline63,
                      isMobile && styles.extractedInline64,
                    ]}
                  >
                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>
                        Phone Number{' '}
                        <Text style={styles.extractedInline62}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="9876543210"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        value={clinicForm.phone}
                        onChangeText={v =>
                          setClinicForm({ ...clinicForm, phone: v })
                        }
                      />
                    </View>

                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>
                        Address <Text style={styles.extractedInline62}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="102, Shree Heights, AB Road"
                        placeholderTextColor="#94A3B8"
                        value={clinicForm.address}
                        onChangeText={v =>
                          setClinicForm({ ...clinicForm, address: v })
                        }
                      />
                    </View>
                  </View>

                  {/* Row 3: State & City Dropdowns */}
                  <View
                    style={[
                      styles.grid2ColRow,
                      styles.extractedInline63,
                      isMobile && styles.extractedInline64,
                    ]}
                  >
                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>
                        State <Text style={styles.extractedInline62}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.formDropdownSelectTrigger}
                        onPress={() =>
                          setShowFormStateDropdown(!showFormStateDropdown)
                        }
                      >
                        <View style={styles.extractedInline23}>
                          <MapPin
                            size={14}
                            color="#64748B"
                            style={styles.extractedInline7}
                          />
                          <Text style={styles.formDropdownText}>
                            {stateLabel}
                          </Text>
                        </View>
                        <ChevronDown size={16} color="#64748B" />
                      </TouchableOpacity>

                      {showFormStateDropdown && (
                        <View style={styles.formDropdownList}>
                          {stateOptions.map(st => (
                            <TouchableOpacity
                              key={st.id}
                              style={styles.formDropdownListItem}
                              onPress={() => {
                                setClinicForm({
                                  ...clinicForm,
                                  state: String(st.id),
                                  city: '',
                                });
                                setShowFormStateDropdown(false);
                              }}
                            >
                              <Text style={styles.formDropdownItemText}>
                                {st.state_name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>
                        City <Text style={styles.extractedInline62}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.formDropdownSelectTrigger}
                        onPress={() =>
                          setShowFormCityDropdown(!showFormCityDropdown)
                        }
                      >
                        <View style={styles.extractedInline23}>
                          <MapPin
                            size={14}
                            color="#64748B"
                            style={styles.extractedInline7}
                          />
                          <Text style={styles.formDropdownText}>
                            {cityLabel}
                          </Text>
                        </View>
                        <ChevronDown size={16} color="#64748B" />
                      </TouchableOpacity>

                      {showFormCityDropdown && (
                        <View style={styles.formDropdownList}>
                          {cityOptions.map(ct => (
                            <TouchableOpacity
                              key={ct.id}
                              style={styles.formDropdownListItem}
                              onPress={() => {
                                setClinicForm({
                                  ...clinicForm,
                                  city: String(ct.id),
                                });
                                setShowFormCityDropdown(false);
                              }}
                            >
                              <Text style={styles.formDropdownItemText}>
                                {ct.city_name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Row 4: Country & Website */}
                  <View
                    style={[
                      styles.grid2ColRow,
                      styles.extractedInline63,
                      isMobile && styles.extractedInline64,
                    ]}
                  >
                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>
                        Country <Text style={styles.extractedInline62}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.formDropdownSelectTrigger}
                        onPress={() =>
                          setShowFormCountryDropdown(!showFormCountryDropdown)
                        }
                      >
                        <Text style={styles.formDropdownText}>
                          {clinicForm.country}
                        </Text>
                        <ChevronDown size={16} color="#64748B" />
                      </TouchableOpacity>

                      {showFormCountryDropdown && (
                        <View style={styles.formDropdownList}>
                          {[
                            'India',
                            'United States',
                            'United Kingdom',
                            'UAE',
                          ].map(cn => (
                            <TouchableOpacity
                              key={cn}
                              style={styles.formDropdownListItem}
                              onPress={() => {
                                setClinicForm({ ...clinicForm, country: cn });
                                setShowFormCountryDropdown(false);
                              }}
                            >
                              <Text style={styles.formDropdownItemText}>
                                {cn}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>Website</Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="https://clinic.example.com"
                        placeholderTextColor="#94A3B8"
                        value={clinicForm.website}
                        onChangeText={v =>
                          setClinicForm({ ...clinicForm, website: v })
                        }
                      />
                    </View>
                  </View>

                  {/* Row 5: License Number & Available Days */}
                  <View
                    style={[
                      styles.grid2ColRow,
                      styles.extractedInline63,
                      isMobile && styles.extractedInline64,
                    ]}
                  >
                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>License Number</Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="L123"
                        placeholderTextColor="#94A3B8"
                        value={clinicForm.license_number}
                        onChangeText={v =>
                          setClinicForm({ ...clinicForm, license_number: v })
                        }
                      />
                    </View>

                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>Available Days</Text>
                      <TextInput
                        style={styles.formInputBox}
                        placeholder="Mon,Tue,Wed,Thu,Fri"
                        placeholderTextColor="#94A3B8"
                        value={clinicForm.available_days}
                        onChangeText={v =>
                          setClinicForm({ ...clinicForm, available_days: v })
                        }
                      />
                    </View>
                  </View>

                  {/* Row 6: Available From & Available To */}
                  <View
                    style={[
                      styles.grid2ColRow,
                      styles.extractedInline63,
                      isMobile && styles.extractedInline64,
                    ]}
                  >
                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>Available From</Text>
                      <View style={styles.formInputBoxWithIcon}>
                        <Clock
                          size={14}
                          color="#64748B"
                          style={styles.extractedInline7}
                        />
                        <TextInput
                          style={styles.formInputBoxBare}
                          placeholder="12:30 AM"
                          placeholderTextColor="#94A3B8"
                          value={clinicForm.available_from}
                          onChangeText={v =>
                            setClinicForm({ ...clinicForm, available_from: v })
                          }
                        />
                        <ChevronsUpDown size={14} color="#64748B" />
                      </View>
                      <Text style={styles.apiTimeHelperText}>
                        API time: 00:30:00 (24-hour format)
                      </Text>
                    </View>

                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>Available To</Text>
                      <View style={styles.formInputBoxWithIcon}>
                        <Clock
                          size={14}
                          color="#64748B"
                          style={styles.extractedInline7}
                        />
                        <TextInput
                          style={styles.formInputBoxBare}
                          placeholder="02:30 AM"
                          placeholderTextColor="#94A3B8"
                          value={clinicForm.available_to}
                          onChangeText={v =>
                            setClinicForm({ ...clinicForm, available_to: v })
                          }
                        />
                        <ChevronsUpDown size={14} color="#64748B" />
                      </View>
                      <Text style={styles.apiTimeHelperText}>
                        API time: 02:30:00 (24-hour format)
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                {/* Footer Buttons */}
                <View style={styles.addAdminFooterRow}>
                  <TouchableOpacity
                    style={styles.addAdminCancelBtn}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.addAdminCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.addAdminSubmitBtn}
                    onPress={handleSaveClinic}
                    disabled={
                      logoUploading ||
                      clinicSaving ||
                      (editingClinicId
                        ? !canEdit
                        : !canAdd || !isMultiClinicPlan)
                    }
                  >
                    {clinicSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        {editingClinicId ? (
                          <Edit2
                            size={15}
                            color="#FFFFFF"
                            style={styles.extractedInline7}
                          />
                        ) : (
                          <Plus
                            size={15}
                            color="#FFFFFF"
                            style={styles.extractedInline7}
                          />
                        )}
                        <Text style={styles.addAdminSubmitText}>
                          {editingClinicId
                            ? 'Update Clinic'
                            : 'Register Clinic'}
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

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* ðŸ‘ï¸ VIEW CLINIC DETAILS MODAL (EXACT SCREENSHOT 3 MATCH)                   */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal visible={!!viewClinicModal} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setViewClinicModal(null)}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.viewClinicCard,
                  isMobile && styles.extractedInline57,
                ]}
              >
                {/* Header Banner */}
                <View style={styles.viewClinicHeader}>
                  <View style={styles.clinicLogoSquareLarge}>
                    <Building color="#0D9488" size={24} />
                  </View>
                  <View style={styles.extractedInline65}>
                    <Text style={styles.viewClinicTitle}>
                      {viewClinicModal?.name}
                    </Text>
                    <Text style={styles.viewClinicSubtitle}>
                      {resolvedViewClinicCity || viewClinicModal?.city
                        ? `${
                            resolvedViewClinicCity || viewClinicModal?.city
                          } â€¢ `
                        : ''}
                      {viewClinicModal?.country || 'India'}
                    </Text>
                    <View style={styles.viewClinicStatusTag}>
                      <Text style={styles.viewClinicStatusText}>
                        {viewClinicModal?.status}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setViewClinicModal(null)}
                    style={styles.extractedInline66}
                  >
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.extractedInline67}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  decelerationRate="normal"
                >
                  {/* Contact & Identity Section */}
                  <View style={styles.viewSectionCard}>
                    <View style={styles.sectionHeaderTitleRow}>
                      <Mail
                        size={15}
                        color="#0D9488"
                        style={styles.extractedInline7}
                      />
                      <Text style={styles.viewSectionCardTitle}>
                        Contact & Identity
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.grid2ColRow,
                        isMobile && styles.extractedInline68,
                      ]}
                    >
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>Email Address</Text>
                        <Text style={styles.infoBoxVal}>
                          {viewClinicModal?.email || '—'}
                        </Text>
                      </View>
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>Phone Number</Text>
                        <Text style={styles.infoBoxVal}>
                          {viewClinicModal?.phone || '—'}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.grid2ColRow,
                        styles.extractedInline69,
                        isMobile && styles.extractedInline70,
                      ]}
                    >
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>Website</Text>
                        <Text style={styles.infoBoxVal}>
                          {viewClinicModal?.website || '—'}
                        </Text>
                      </View>
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>License Number</Text>
                        <Text style={styles.infoBoxVal}>
                          {viewClinicModal?.license_number || '—'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Location Section */}
                  <View
                    style={[styles.viewSectionCard, styles.extractedInline71]}
                  >
                    <View style={styles.sectionHeaderTitleRow}>
                      <MapPin
                        size={15}
                        color="#0D9488"
                        style={styles.extractedInline7}
                      />
                      <Text style={styles.viewSectionCardTitle}>Location</Text>
                    </View>
                    <View
                      style={[
                        styles.grid2ColRow,
                        isMobile && styles.extractedInline68,
                      ]}
                    >
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>Address</Text>
                        <Text style={styles.infoBoxVal}>
                          {viewClinicModal?.address || '—'}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.grid2ColRow,
                        styles.extractedInline69,
                        isMobile && styles.extractedInline70,
                      ]}
                    >
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>City</Text>
                        <Text style={styles.infoBoxVal}>
                          {resolvedViewClinicCity ||
                            viewClinicModal?.city ||
                            '—'}
                        </Text>
                      </View>
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>State</Text>
                        <Text style={styles.infoBoxVal}>
                          {resolvedViewClinicState ||
                            viewClinicModal?.state ||
                            '—'}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.grid2ColRow,
                        styles.extractedInline69,
                        isMobile && styles.extractedInline70,
                      ]}
                    >
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>Country</Text>
                        <Text style={styles.infoBoxVal}>
                          {viewClinicModal?.country || 'India'}
                        </Text>
                      </View>
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>Created</Text>
                        <Text style={styles.infoBoxVal}>
                          {formatClinicDate(viewClinicModal?.created_at)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Availability Section */}
                  <View
                    style={[
                      styles.viewSectionCard,
                      styles.availabilityBgCard,
                      styles.extractedInline72,
                    ]}
                  >
                    <View style={styles.sectionHeaderTitleRow}>
                      <CalendarIcon
                        size={15}
                        color="#0D9488"
                        style={styles.extractedInline7}
                      />
                      <Text style={styles.viewSectionCardTitle}>
                        Availability
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.grid3ColRow,
                        isMobile && styles.extractedInline68,
                      ]}
                    >
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>Available Days</Text>
                        <Text style={styles.infoBoxVal}>
                          {viewClinicModal?.available_days || '—'}
                        </Text>
                      </View>
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>Available From</Text>
                        <Text style={styles.infoBoxVal}>
                          {formatClinicTime(viewClinicModal?.available_from)}
                        </Text>
                      </View>
                      <View style={styles.extractedInline30}>
                        <Text style={styles.infoBoxLabel}>Available To</Text>
                        <Text style={styles.infoBoxVal}>
                          {formatClinicTime(viewClinicModal?.available_to)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                {/* Footer */}
                <View style={styles.viewClinicFooter}>
                  <TouchableOpacity
                    style={styles.viewClinicCloseBtn}
                    onPress={() => setViewClinicModal(null)}
                  >
                    <Text style={styles.viewClinicCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* ðŸ‘¥ VIEW CLINIC ADMINS MODAL (EXACT SCREENSHOT 4 MATCH)                     */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal visible={!!viewAdminsModal} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setViewAdminsModal(null)}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.viewAdminsCard,
                  isMobile && styles.extractedInline57,
                ]}
              >
                {/* Header */}
                <View style={styles.viewAdminsHeader}>
                  <View style={styles.tealIconBoxSquare}>
                    <Users color="#FFFFFF" size={20} />
                  </View>
                  <View style={styles.extractedInline65}>
                    <Text style={styles.viewAdminsTitle}>
                      Clinic Admins —{' '}
                      <Text style={styles.extractedInline73}>
                        {viewAdminsModal?.name}
                      </Text>
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
                  <View style={styles.extractedInline30} />
                  <TouchableOpacity
                    style={styles.addNewAdminBtn}
                    onPress={() => {
                      const c = viewAdminsModal;
                      setViewAdminsModal(null);
                      if (canAddAdmin) setAddAdminModalClinic(c);
                    }}
                  >
                    <Plus
                      color="#FFFFFF"
                      size={14}
                      style={styles.extractedInline25}
                    />
                    <Text style={styles.addNewAdminBtnText}>Add New Admin</Text>
                  </TouchableOpacity>
                </View>

                {/* Admins Table Container */}
                <ScrollView
                  style={styles.extractedInline74}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  decelerationRate="normal"
                >
                  {admins.loading ? (
                    <View style={styles.extractedInline75}>
                      <ActivityIndicator size="small" color="#0D9488" />
                      <Text style={styles.extractedInline76}>
                        Loading administrators...
                      </Text>
                    </View>
                  ) : adminsList.length === 0 ? (
                    <View style={styles.extractedInline77}>
                      <Users size={32} color="#94A3B8" />
                      <Text style={styles.extractedInline78}>
                        No clinic admins found for this clinic
                      </Text>
                    </View>
                  ) : isMobile ? (
                    /* Mobile Card View (No Data Overlap) */
                    <View style={styles.extractedInline79}>
                      {adminsList.map(admin => (
                        <View key={admin.id} style={styles.mobileAdminCardItem}>
                          <View style={styles.extractedInline80}>
                            <View style={styles.extractedInline81}>
                              <View style={styles.adminAvatarCircle}>
                                <Users size={14} color="#0D9488" />
                              </View>
                              <Text style={styles.adminNameText}>
                                {admin.full_name}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={[
                                styles.adminStatusPill,
                                admin.status === 'Active'
                                  ? styles.statusActiveBg
                                  : styles.statusInactiveBg,
                              ]}
                              onPress={() =>
                                handleToggleClinicAdminStatus(admin.id)
                              }
                            >
                              <Text
                                style={[
                                  styles.adminStatusText,
                                  admin.status === 'Active'
                                    ? styles.statusActiveText
                                    : styles.statusInactiveText,
                                ]}
                              >
                                {admin.status}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          <View style={styles.extractedInline82}>
                            <Text style={styles.adminTdText}>
                              Email: {admin.email}
                            </Text>
                            <Text style={styles.adminTdText}>
                              Phone: {admin.phone}
                            </Text>
                          </View>

                          {/* Action Buttons: Edit & Delete */}
                          <View style={styles.extractedInline83}>
                            {canEditAdmin && (
                              <TouchableOpacity
                                style={styles.extractedInline84}
                                onPress={() => handleOpenEditClinicAdmin(admin)}
                              >
                                <Edit2
                                  size={13}
                                  color="#0D9488"
                                  style={styles.extractedInline85}
                                />
                                <Text style={styles.extractedInline86}>
                                  Edit
                                </Text>
                              </TouchableOpacity>
                            )}
                            {canDeleteAdmin && (
                              <TouchableOpacity
                                style={styles.extractedInline87}
                                onPress={() => handleDeleteClinicAdmin(admin)}
                              >
                                <Trash2
                                  size={13}
                                  color="#DC2626"
                                  style={styles.extractedInline85}
                                />
                                <Text style={styles.extractedInline88}>
                                  Delete
                                </Text>
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
                        <Text
                          style={[styles.adminsTh, styles.extractedInline89]}
                        >
                          Name
                        </Text>
                        <Text
                          style={[styles.adminsTh, styles.extractedInline90]}
                        >
                          Email
                        </Text>
                        <Text
                          style={[styles.adminsTh, styles.extractedInline91]}
                        >
                          Phone
                        </Text>
                        <Text
                          style={[styles.adminsTh, styles.extractedInline92]}
                        >
                          Status
                        </Text>
                        <Text
                          style={[styles.adminsTh, styles.extractedInline93]}
                        >
                          Actions
                        </Text>
                      </View>

                      {adminsList.map(admin => (
                        <View key={admin.id} style={styles.adminsTableBodyRow}>
                          {/* Name + Avatar */}
                          <View style={styles.extractedInline94}>
                            <View style={styles.adminAvatarCircle}>
                              <Users size={14} color="#0D9488" />
                            </View>
                            <Text
                              style={styles.adminNameText}
                              numberOfLines={1}
                            >
                              {admin.full_name}
                            </Text>
                          </View>

                          {/* Email */}
                          <Text
                            style={[
                              styles.adminTdText,
                              styles.extractedInline90,
                            ]}
                            numberOfLines={1}
                          >
                            {admin.email}
                          </Text>

                          {/* Phone */}
                          <Text
                            style={[
                              styles.adminTdText,
                              styles.extractedInline91,
                            ]}
                          >
                            {admin.phone}
                          </Text>

                          {/* Status */}
                          <View style={styles.extractedInline95}>
                            <TouchableOpacity
                              style={[
                                styles.adminStatusPill,
                                admin.status === 'Active'
                                  ? styles.statusActiveBg
                                  : styles.statusInactiveBg,
                              ]}
                              onPress={() =>
                                handleToggleClinicAdminStatus(admin.id)
                              }
                            >
                              <Text
                                style={[
                                  styles.adminStatusText,
                                  admin.status === 'Active'
                                    ? styles.statusActiveText
                                    : styles.statusInactiveText,
                                ]}
                              >
                                {admin.status}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {/* Actions: Edit & Delete */}
                          <View style={styles.extractedInline96}>
                            {canEditAdmin && (
                              <TouchableOpacity
                                onPress={() => handleOpenEditClinicAdmin(admin)}
                              >
                                <Edit2 size={15} color="#0D9488" />
                              </TouchableOpacity>
                            )}
                            {canDeleteAdmin && (
                              <TouchableOpacity
                                onPress={() => handleDeleteClinicAdmin(admin)}
                              >
                                <Trash2 size={15} color="#DC2626" />
                              </TouchableOpacity>
                            )}
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

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* ðŸ‘¤+ ADD CLINIC ADMIN MODAL (EXACT SCREENSHOT 5 MATCH)                      */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal visible={!!addAdminModalClinic} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setAddAdminModalClinic(null)}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.addAdminCard,
                  isMobile && styles.extractedInline57,
                ]}
              >
                {/* Header */}
                <View style={styles.addAdminHeader}>
                  <View style={styles.userPlusIconBox}>
                    <UserPlus color="#0D9488" size={20} />
                  </View>
                  <View style={styles.extractedInline65}>
                    <Text style={styles.addAdminTitle}>
                      Add Clinic Admin for {addAdminModalClinic?.name}
                    </Text>
                    <Text style={styles.addAdminSubtitle}>
                      Create a new clinic administrator account. They will have
                      full access to manage this clinic.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setAddAdminModalClinic(null)}
                  >
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Form Body */}
                <ScrollView
                  style={styles.extractedInline58}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  decelerationRate="normal"
                >
                  <Text style={styles.formGroupHeader}>Admin Information</Text>

                  <View
                    style={[
                      styles.grid2ColRow,
                      isMobile && styles.extractedInline61,
                    ]}
                  >
                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>
                        Full Name{' '}
                        <Text style={styles.extractedInline62}>*</Text>
                      </Text>
                      <TextInput
                        style={[styles.formInputBox, styles.formInputFocused]}
                        placeholder="Enter full name"
                        placeholderTextColor="#94A3B8"
                        value={adminFullName}
                        onChangeText={setAdminFullName}
                      />
                    </View>

                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>
                        Email Address{' '}
                        <Text style={styles.extractedInline62}>*</Text>
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

                  <View
                    style={[
                      styles.grid2ColRow,
                      styles.extractedInline63,
                      isMobile && styles.extractedInline64,
                    ]}
                  >
                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>
                        Phone Number{' '}
                        <Text style={styles.extractedInline62}>*</Text>
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

                    <View style={styles.extractedInline30}>
                      <Text style={styles.formLabelText}>
                        Password <Text style={styles.extractedInline62}>*</Text>
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
                    style={[styles.formInputBox, styles.extractedInline97]}
                    placeholder="Enter clinic admin's address (optional)"
                    placeholderTextColor="#94A3B8"
                    multiline
                    value={adminAddress}
                    onChangeText={setAdminAddress}
                  />

                  {/* Assigned Clinic Card */}
                  <View style={styles.assignedClinicCard}>
                    <Text style={styles.assignedClinicHeaderLabel}>
                      Assigned Clinic
                    </Text>
                    <View style={styles.extractedInline98}>
                      <Building
                        size={16}
                        color="#0D9488"
                        style={styles.extractedInline7}
                      />
                      <Text style={styles.assignedClinicName}>
                        {addAdminModalClinic?.name}
                      </Text>
                    </View>
                    <View style={styles.extractedInline99}>
                      <MapPin
                        size={14}
                        color="#64748B"
                        style={styles.extractedInline7}
                      />
                      <Text style={styles.assignedClinicAddress}>
                        {addAdminModalClinic?.address}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                {/* Footer Buttons */}
                <View style={styles.addAdminFooterRow}>
                  <TouchableOpacity
                    style={styles.addAdminCancelBtn}
                    onPress={() => setAddAdminModalClinic(null)}
                  >
                    <Text style={styles.addAdminCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.addAdminSubmitBtn}
                    onPress={handleCreateClinicAdmin}
                    disabled={addAdminSaving || !canAddAdmin}
                  >
                    {addAdminSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <UserPlus
                          size={15}
                          color="#FFFFFF"
                          style={styles.extractedInline7}
                        />
                        <Text style={styles.addAdminSubmitText}>
                          Create Clinic Admin
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

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* âœï¸ EDIT CLINIC ADMIN MODAL                                                */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal visible={!!editingClinicAdmin} animationType="fade" transparent>
        <TouchableWithoutFeedback
          onPress={() => {
            setShowEditAdminStatusDropdown(false);
            setEditingClinicAdmin(null);
          }}
        >
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback
              onPress={() => setShowEditAdminStatusDropdown(false)}
            >
              <View
                style={[
                  styles.addAdminCard,
                  isMobile && styles.extractedInline57,
                ]}
              >
                {/* Header */}
                <View style={styles.addAdminHeader}>
                  <View style={styles.userPlusIconBox}>
                    <Edit2 color="#0D9488" size={20} />
                  </View>
                  <View style={styles.extractedInline65}>
                    <Text style={styles.addAdminTitle}>Edit Clinic Admin</Text>
                    <Text style={styles.addAdminSubtitle}>
                      Update clinic administrator information
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowEditAdminStatusDropdown(false);
                      setEditingClinicAdmin(null);
                    }}
                  >
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Form Fields */}
                <ScrollView
                  style={styles.extractedInline67}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.formLabelText}>
                    Full Name <Text style={styles.extractedInline62}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.formInputBox, styles.formInputFocused]}
                    placeholder="Enter full name"
                    placeholderTextColor="#94A3B8"
                    value={editAdminFullName}
                    onChangeText={setEditAdminFullName}
                  />

                  <Text
                    style={[styles.formLabelText, styles.extractedInline63]}
                  >
                    Phone Number <Text style={styles.extractedInline62}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.formInputBox}
                    placeholder="9876543210"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={editAdminPhone}
                    onChangeText={setEditAdminPhone}
                  />

                  <Text
                    style={[styles.formLabelText, styles.extractedInline63]}
                  >
                    Address
                  </Text>
                  <TextInput
                    style={[styles.formInputBox, styles.extractedInline97]}
                    placeholder="Enter clinic admin's address (optional)"
                    placeholderTextColor="#94A3B8"
                    multiline
                    value={editAdminAddress}
                    onChangeText={setEditAdminAddress}
                  />

                  <Text
                    style={[styles.formLabelText, styles.extractedInline63]}
                  >
                    Email Address
                  </Text>
                  <TextInput
                    style={[styles.formInputBox, styles.extractedInline100]}
                    value={editingClinicAdmin?.email}
                    editable={false}
                  />

                  {/* Active Status Card */}
                  <View style={styles.adminStatusCard}>
                    <View style={styles.extractedInline101}>
                      <Text style={styles.adminStatusCardTitle}>
                        Active Status
                      </Text>
                      <Text style={styles.adminStatusCardSubtitle}>
                        Enable or disable this admin's access
                      </Text>
                    </View>
                    <View style={styles.extractedInline102}>
                      <TouchableOpacity
                        style={styles.adminStatusDropdownBtn}
                        onPress={() =>
                          setShowEditAdminStatusDropdown(
                            !showEditAdminStatusDropdown,
                          )
                        }
                      >
                        <Text style={styles.adminStatusDropdownText}>
                          {editAdminIsActive ? 'Active' : 'Inactive'}
                        </Text>
                        <ChevronDown
                          size={14}
                          color="#64748B"
                          style={styles.extractedInline103}
                        />
                      </TouchableOpacity>

                      {showEditAdminStatusDropdown && (
                        <View style={styles.adminStatusDropdownMenu}>
                          <TouchableOpacity
                            style={[
                              styles.adminStatusDropdownOption,
                              editAdminIsActive &&
                                styles.adminStatusDropdownOptionSelected,
                            ]}
                            onPress={() => {
                              setEditAdminIsActive(true);
                              setShowEditAdminStatusDropdown(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.adminStatusOptionText,
                                editAdminIsActive &&
                                  styles.adminStatusOptionTextActive,
                              ]}
                            >
                              Active
                            </Text>
                            {editAdminIsActive && (
                              <Check size={14} color="#0D9488" />
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.adminStatusDropdownOption,
                              !editAdminIsActive &&
                                styles.adminStatusDropdownOptionSelected,
                            ]}
                            onPress={() => {
                              setEditAdminIsActive(false);
                              setShowEditAdminStatusDropdown(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.adminStatusOptionText,
                                !editAdminIsActive &&
                                  styles.adminStatusOptionTextActive,
                              ]}
                            >
                              Inactive
                            </Text>
                            {!editAdminIsActive && (
                              <Check size={14} color="#0D9488" />
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Reset Password Card */}
                  <View style={styles.adminResetPasswordCard}>
                    <Text style={styles.adminResetPasswordTitle}>
                      Reset Password
                    </Text>
                    <Text style={styles.adminResetPasswordSubtitle}>
                      Set a secure temporary password for this clinic admin.
                    </Text>
                    {canExecuteAdmin ? (
                      <TouchableOpacity
                        style={styles.adminResetPasswordBtn}
                        onPress={handleOpenResetPassword}
                      >
                        <KeyRound
                          size={16}
                          color="#0D9488"
                          style={styles.extractedInline7}
                        />
                        <Text style={styles.adminResetPasswordBtnText}>
                          Reset Password
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </ScrollView>

                {/* Footer */}
                <View style={styles.addAdminFooterRow}>
                  <TouchableOpacity
                    style={styles.addAdminCancelBtn}
                    onPress={() => {
                      setShowEditAdminStatusDropdown(false);
                      setEditingClinicAdmin(null);
                    }}
                  >
                    <Text style={styles.addAdminCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.addAdminSubmitBtn}
                    onPress={handleSaveEditClinicAdmin}
                    disabled={editAdminSaving || !canEditAdmin}
                  >
                    {editAdminSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Edit2
                          size={15}
                          color="#FFFFFF"
                          style={styles.extractedInline7}
                        />
                        <Text style={styles.addAdminSubmitText}>
                          Update Admin
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

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* ðŸ”‘ RESET PASSWORD MODAL                                                    */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal visible={isResetPasswordOpen} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setIsResetPasswordOpen(false)}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.addAdminCard,
                  isMobile && styles.extractedInline57,
                ]}
              >
                {/* Header */}
                <View style={styles.addAdminHeader}>
                  <View style={styles.userPlusIconBox}>
                    <KeyRound color="#0D9488" size={20} />
                  </View>
                  <View style={styles.extractedInline65}>
                    <Text style={styles.addAdminTitle}>Reset Password</Text>
                    <Text style={styles.addAdminSubtitle}>
                      Set a secure temporary password for{' '}
                      {editingClinicAdmin?.full_name || 'this clinic admin'}.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsResetPasswordOpen(false)}
                  >
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Body */}
                <View style={styles.extractedInline67}>
                  <Text style={styles.formLabelText}>
                    New password <Text style={styles.extractedInline62}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.passwordInputContainer,
                      !!resetPasswordErrors.password && styles.invalidInputBox,
                    ]}
                  >
                    <TextInput
                      style={styles.passwordInputField}
                      placeholder="Enter at least 8 characters"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showNewPassword}
                      value={newPasswordVal}
                      onChangeText={val => {
                        setNewPasswordVal(val);
                        setResetPasswordErrors(prev => ({
                          ...prev,
                          password: '',
                          confirm:
                            confirmPasswordVal && confirmPasswordVal !== val
                              ? 'Passwords do not match.'
                              : '',
                        }));
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={styles.passwordEyeBtn}
                    >
                      {showNewPassword ? (
                        <EyeOff size={16} color="#64748B" />
                      ) : (
                        <Eye size={16} color="#64748B" />
                      )}
                    </TouchableOpacity>
                  </View>
                  {!!resetPasswordErrors.password && (
                    <Text style={styles.fieldErrorText}>
                      {resetPasswordErrors.password}
                    </Text>
                  )}

                  <Text
                    style={[styles.formLabelText, styles.extractedInline69]}
                  >
                    Confirm password{' '}
                    <Text style={styles.extractedInline62}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.passwordInputContainer,
                      !!resetPasswordErrors.confirm && styles.invalidInputBox,
                    ]}
                  >
                    <TextInput
                      style={styles.passwordInputField}
                      placeholder="Re-enter the new password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPasswordVal}
                      onChangeText={val => {
                        setConfirmPasswordVal(val);
                        setResetPasswordErrors(prev => ({
                          ...prev,
                          confirm: '',
                        }));
                      }}
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      style={styles.passwordEyeBtn}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={16} color="#64748B" />
                      ) : (
                        <Eye size={16} color="#64748B" />
                      )}
                    </TouchableOpacity>
                  </View>
                  {!!resetPasswordErrors.confirm && (
                    <Text style={styles.fieldErrorText}>
                      {resetPasswordErrors.confirm}
                    </Text>
                  )}
                </View>

                {/* Footer */}
                <View style={styles.addAdminFooterRow}>
                  <TouchableOpacity
                    style={styles.addAdminCancelBtn}
                    onPress={() => setIsResetPasswordOpen(false)}
                    disabled={resetPasswordSaving || !canExecuteAdmin}
                  >
                    <Text style={styles.addAdminCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.addAdminSubmitBtn}
                    onPress={handleExecuteResetPassword}
                    disabled={resetPasswordSaving}
                  >
                    {resetPasswordSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <KeyRound
                          size={15}
                          color="#FFFFFF"
                          style={styles.extractedInline7}
                        />
                        <Text style={styles.addAdminSubmitText}>
                          Reset Password
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
    </View>
  );
};

export default ClinicsManagementScreen;
