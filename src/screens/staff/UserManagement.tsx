import { colors, spacing, typography } from '../../theme/tokens';
// src/screens/staff/UserManagement.tsx
import { styles } from './styles/UserManagement.styles';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AppModal } from '../../components/common/AppModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useLiquidBorderScrollHandlers } from '../../components/common/LiquidBorderFocusContext';
import { View, Text, TextInput, TouchableOpacity, Platform, StatusBar, ActivityIndicator, useWindowDimensions, RefreshControl, TouchableWithoutFeedback, KeyboardAvoidingView, Keyboard, Switch } from 'react-native';
import { LiquidBorderScrollView } from '../../components/common/LiquidBorderScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  UserPlus,
  Columns3,
  Search,
  Eye,
  EyeOff,
  Edit2,
  X,
  Lock,
  ChevronDown,
} from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { Pagination } from '../../components/common/Pagination';
import { ColumnSelectorModal, ColumnOption } from '../../components/common/ColumnSelectorModal';
import { RefreshButton } from '../../components/common/RefreshButton';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import {
  fetchAllUsersApi,
  fetchStaffByIdApi,
  createClinicUserApi,
  updateClinicUserApi,
  resetStaffPasswordApi,
  deactivateStaffApi,
} from '../../api/userManagementApi';
import { extractArrayData } from '../../utils/apiData';
import { fetchUserRolesApi } from '../../api/roleManagementApi';
import { apiFetch } from '../../api/apiConfig';
import { useRemoteData } from '../../hooks/useRemoteData';
import { useAuthContext } from '../../context/AuthContext';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { normalizeRoleName } from '../../utils/rolePermissions';
import { buildRoleCatalog, getManageableRoles, isProtectedAdminRole } from '../../utils/roleManagement';
import { formatCreatedAt, formatRoleTitle, mapStaffApiRecord, normalizeAssignedClinic, normalizeClinicOption } from './users/userManagementTypes';
import { ResetPasswordModal } from './users/ResetPasswordModal';
import { UserDetailsModal } from './users/UserDetailsModal';
import { LiquidBorderSurface } from '../../components/common/LiquidBorderSurface';
import type { ClinicOption, StaffApiRecord, UserItem } from './users/userManagementTypes';

export type { UserItem } from './users/userManagementTypes';

interface UserManagementProps {
  onOpenDrawer?: () => void;
  onNavigateScreen?: (screen: string) => void;
  initialUserId?: string;
}

const userColumns = {
  user_id: 'User ID', full_name: 'User', clinic_name: 'Clinic', email: 'Email',
  role: 'Role', phone: 'Phone', is_doctor: 'Doctor', status: 'Status', actions: 'Actions',
  address: 'Address', department: 'Department', specialization: 'Specialization', created_at: 'Created at',
} as const;
type UserColumn = keyof typeof userColumns;
const defaultColumns = Object.fromEntries(Object.keys(userColumns).map(key =>
  [key, !['address', 'department', 'specialization', 'created_at'].includes(key)])) as Record<UserColumn, boolean>;

export function UserManagement({ onOpenDrawer, onNavigateScreen, initialUserId }: UserManagementProps) {
  const borderScrollHandlers = useLiquidBorderScrollHandlers();
  const { width, fontScale } = useWindowDimensions();
  const isMobile = width < 768;

  const { token, user, role, permissionsMap = {}, activeClinicId, activeClinicName, assignedClinics, isMultiPlan } = useAuthContext();
  const canView = canUseStaffScreen(role, permissionsMap, 'staff');
  const canCreate = canView && canUseStaffScreen(role, permissionsMap, 'staff', 'add');
  const canEdit = canView && canUseStaffScreen(role, permissionsMap, 'staff', 'edit');
  const canDelete = canView && canUseStaffScreen(role, permissionsMap, 'staff', 'delete');
  const isSuperAdmin = normalizeRoleName(role) === 'super_admin';
  const canChooseCreateClinic = isSuperAdmin || (normalizeRoleName(role) === 'clinic_admin' && isMultiPlan);
  const [visibleColumns, setVisibleColumns] = useState(() => ({ ...defaultColumns, is_doctor: !isMobile }));
  const [showColumns, setShowColumns] = useState(false);

  const userColumnOptions: Array<ColumnOption<UserColumn>> = useMemo(
    () =>
      (Object.keys(userColumns) as UserColumn[]).map((key) => ({
        key,
        label: userColumns[key],
        defaultVisible: defaultColumns[key],
      })),
    []
  );

  const toggleUserColumn = useCallback((key: UserColumn) => {
    setVisibleColumns((prev) => {
      const isCurrentlyVisible = prev[key];
      const count = Object.values(prev).filter(Boolean).length;
      if (isCurrentlyVisible && count <= 1) {
        showErrorToast('At least one column must remain visible');
        return prev;
      }
      return { ...prev, [key]: !isCurrentlyVisible };
    });
  }, []);

  const resetUserColumns = useCallback(() => {
    setVisibleColumns({ ...defaultColumns, is_doctor: !isMobile });
  }, [isMobile]);

  const contextClinics = useMemo(() => {
    const list: string[] = [];
    if (activeClinicName) list.push(activeClinicName);
    if (assignedClinics && assignedClinics.length > 0) {
      assignedClinics.forEach((c) => {
        if (c.name && !list.includes(c.name)) list.push(c.name);
      });
    }
    return list;
  }, [activeClinicName, assignedClinics]);

  const [searchQuery, setSearchQuery] = useState('');
  const notificationUserOpenedRef = useRef('');
  useEffect(() => {
    if (initialUserId) setSearchQuery(initialUserId);
  }, [initialUserId]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All Roles');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All Status');
  const [selectedClinicFilter, setSelectedClinicFilter] = useState('All Clinics');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRoleFilter, selectedStatusFilter, selectedClinicFilter, activeClinicId, pageSize]);

  // Dropdown States
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showClinicDropdown, setShowClinicDropdown] = useState(false);

  // Modals
  const [viewUserModal, setViewUserModal] = useState<UserItem | null>(null);
  const [editUserModal, setEditUserModal] = useState<UserItem | null>(null);
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [deactivateConfirmVisible, setDeactivateConfirmVisible] = useState(false);
  const [deactivatingUser, setDeactivatingUser] = useState(false);

  // Reset Password Modal State (Matching Screenshot)
  const [resetPasswordModalUser, setResetPasswordModalUser] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);
  const [resetErrors, setResetErrors] = useState<{ password?: string; confirm?: string }>({});
  const [resetError, setResetError] = useState('');

  // Edit Form Fields State
  const [editForm, setEditForm] = useState<UserItem | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof UserItem, string>>>({});
  const [editSaveError, setEditSaveError] = useState('');
  const [detailsRetry, setDetailsRetry] = useState(0);
  const [showEditRoleDropdown, setShowEditRoleDropdown] = useState(false);
  const [showEditStatusDropdown, setShowEditStatusDropdown] = useState(false);

  // Create Form State
  const [createFullName, setCreateFullName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createError, setCreateError] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createDetails, setCreateDetails] = useState({
    department: '', specialization: '', qualification: '', registration_number: '',
    experience_years: '', consultation_fee: '', available_days: '', address: '',
  });
  const [createRole, setCreateRole] = useState('');
  const [createClinicId, setCreateClinicId] = useState<number | null>(activeClinicId);
  const [showCreateClinicDropdown, setShowCreateClinicDropdown] = useState(false);
  const [showCreateRoleDropdown, setShowCreateRoleDropdown] = useState(false);
  const resetCreateForm = useCallback(() => {
    setCreateFullName(''); setCreateEmail(''); setCreatePhone(''); setCreatePassword('');
    setCreateError('');
    setShowCreatePassword(false); setShowCreateRoleDropdown(false);
    setCreateRole('');
    setCreateClinicId(activeClinicId); setShowCreateClinicDropdown(false);
    setCreateDetails({ department: '', specialization: '', qualification: '', registration_number: '',
      experience_years: '', consultation_fee: '', available_days: '', address: '' });
  }, [activeClinicId]);
  const closeCreateForm = () => {
    if (busyRef.current) return;
    setCreateUserModalOpen(false);
    resetCreateForm();
  };

  const formatStaffUser = useCallback(
    (staff: StaffApiRecord): UserItem => mapStaffApiRecord(staff, activeClinicName),
    [activeClinicName],
  );

  const scope = [user?.id, token, activeClinicId, role, canView].join(':');
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const viewUserId = viewUserModal?.id;
  const editUserId = editUserModal?.id;
  const accessRef = useRef({ canEdit, canDelete, editUserId });
  accessRef.current = { canEdit, canDelete, editUserId };
  useEffect(() => {
    const id = viewUserId || editUserId;
    if (!id) return;
    let cancelled = false;
    setDetailsLoading(true);
    setDetailsError('');
    const loadDetails = async () => {
      try {
        const result = await fetchStaffByIdApi(id);
        if (cancelled || scopeRef.current !== scope) return;
        if (!result.success || !result.data?.staff) {
          throw new Error(result.message || 'Please retry.');
        }
        const details = formatStaffUser(result.data.staff);
        if (viewUserId) setViewUserModal(details);
        else { setEditForm(details); setEditUserModal(details); }
      } catch {
        if (!cancelled && scopeRef.current === scope) {
          setDetailsError('Unable to load user details. Please retry.');
        }
      } finally {
        if (!cancelled && scopeRef.current === scope) setDetailsLoading(false);
      }
    };
    void loadDetails();
    return () => { cancelled = true; };
  }, [viewUserId, editUserId, scope, formatStaffUser, detailsRetry]);
  const busyRef = useRef(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  useEffect(() => {
    scopeRef.current = scope;
    setViewUserModal(null); setEditUserModal(null); setEditForm(null); setResetPasswordModalUser(null);
    setIsRefreshing(false); setResetSaving(false); setNewPassword(''); setConfirmPassword('');
    setResetErrors({}); setResetError(''); setEditErrors({}); setEditSaveError('');
    setCreateUserModalOpen(false); setSelectedClinicFilter('All Clinics');
    setShowColumns(false); setShowEditRoleDropdown(false); setShowEditStatusDropdown(false);
    resetCreateForm();
    return () => { scopeRef.current = ''; };
  }, [scope, activeClinicName, resetCreateForm]);
  const metadata = useRemoteData(scope + ':staff-options:' + canChooseCreateClinic, async () => {
    const [roles, clinics] = await Promise.all([
      fetchUserRolesApi(activeClinicId),
      canChooseCreateClinic ? apiFetch<unknown>('/clinics/my-clinics')
        : Promise.resolve({ success: true, data: assignedClinics ?? [] }),
    ]);
    if (!roles.success) throw new Error('Unable to load user options');
    return { roles: buildRoleCatalog(roles.data ?? []),
      clinics: (clinics.success ? extractArrayData<Record<string, unknown>>(clinics) : assignedClinics ?? [])
        .map(normalizeClinicOption),
      clinicsError: !clinics.success };
  }, Boolean(token && canView));
  const roleRows = getManageableRoles(metadata.data?.roles ?? [], role).filter(r => normalizeRoleName(r.role_name) !== 'patient');
  const clinicRows: ClinicOption[] = metadata.data?.clinics ?? (assignedClinics ?? []).map(normalizeAssignedClinic);
  const dbRolesList = Array.from(new Set<string>(roleRows.map(r => formatRoleTitle(r.role_name || r.name || ''))));
  const dbClinicsList = Array.from(new Set<string>([
    ...contextClinics,
    ...clinicRows.map(c => c.name || c.clinic_name).filter((name): name is string => Boolean(name)),
  ]));
  const createRoles = useRemoteData(scope + ':create-roles:' + createClinicId, async () => {
    const result = await fetchUserRolesApi(createClinicId);
    if (!result.success) throw new Error(result.message);
    return getManageableRoles(buildRoleCatalog(result.data ?? []), role).filter(r => normalizeRoleName(r.role_name) !== 'patient');
  }, Boolean(token && canCreate && createUserModalOpen && createClinicId));
  const selectedCreateRole = createRoles.data?.find(r => String(r.role_id ?? r.id) === createRole);
  const createRoleName = normalizeRoleName(selectedCreateRole?.role_name || '');
  const isDoctorCreateRole = createRoleName === 'doctor';
  const isNurseCreateRole = createRoleName === 'nurse';
  const createClinicOptions = clinicRows.map(c => ({
    id: Number(c.id ?? c.clinic_id), name: c.name || c.clinic_name,
  }));
  const protectedEditRole = isProtectedAdminRole(editUserModal?.role || '');
  const hasDoctorEditProfile = normalizeRoleName(editForm?.role || '') === 'doctor' || !!editForm?.is_doctor;
  const isNurseEditRole = normalizeRoleName(editForm?.role || '') === 'nurse';
  const editRolesClinicId = editForm?.clinic_id ?? editUserModal?.clinic_id ?? activeClinicId;
  const editRoles = useRemoteData(scope + ':edit-roles:' + editRolesClinicId, async () => {
    const response = await fetchUserRolesApi(editRolesClinicId);
    if (!response.success) throw new Error(response.message);
    return getManageableRoles(buildRoleCatalog(response.data ?? []), role);
  }, Boolean(token && canEdit && editUserModal && !protectedEditRole));
  const editRoleNames = Array.from(new Set((editRoles.data ?? []).map(r => formatRoleTitle(r.role_name || r.name || ''))));
  const getRoleId = (name: string) => {
    const role = roleRows.find(r => formatRoleTitle(r.role_name || r.name || '') === name);
    return Number(role?.role_id || role?.id);
  };
  const filterClinicId = selectedClinicFilter === 'All Clinics' ? undefined
    : Number(clinicRows.find(c => (c.name || c.clinic_name) === selectedClinicFilter)?.id);
  const query = {
    page: currentPage, limit: pageSize, search: debouncedSearch, clinic_id: filterClinicId ?? (isProtectedAdminRole(role) ? undefined : activeClinicId ?? undefined),
    role_id: selectedRoleFilter === 'All Roles' ? undefined : getRoleId(selectedRoleFilter),
    is_active: selectedStatusFilter === 'All Status' ? 'all' as const : selectedStatusFilter === 'Active' ? 1 as const : 0 as const,
  };
  const resource = useRemoteData(scope + ':staff:' + JSON.stringify(query) + ':address:' + visibleColumns.address, async () => {
    if (selectedRoleFilter !== 'All Roles' && !query.role_id) throw new Error('Select an available role');
    if (selectedClinicFilter !== 'All Clinics' && !filterClinicId) throw new Error('Select an available clinic');
    const result = await fetchAllUsersApi(query);
    if (!result.success || !Array.isArray(result.data?.data)) throw new Error(result.message);
    const rows = visibleColumns.address ? await Promise.all(result.data.data.map(async staff => {
      const details = await fetchStaffByIdApi(staff.id ?? staff.user_id);
      if (!details.success || !details.data?.staff) throw new Error('Unable to load user addresses');
      return { ...staff, ...details.data.staff };
    })) : result.data.data;
    return { users: rows.map(formatStaffUser), total: Number(result.data.total) };
  }, Boolean(token && canView) && Boolean(metadata.data) && !metadata.error);
  const loading = resource.loading || metadata.loading;
  const loadError = resource.error || metadata.error;
  const users = useMemo(() => loadError ? [] : resource.data?.users ?? [], [loadError, resource.data]);
  useEffect(() => {
    if (!initialUserId || loading) return;
    const match = users.find(item => String(item.id) === String(initialUserId) || String(item.user_id) === String(initialUserId));
    if (!match || notificationUserOpenedRef.current === String(initialUserId)) return;
    notificationUserOpenedRef.current = String(initialUserId);
    setDetailsLoading(true);
    setDetailsError('');
    setViewUserModal(match);
  }, [initialUserId, loading, users]);
  const filteredUsers = users;
  const paginatedUsers = users;
  const totalUsers = loadError ? 0 : resource.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
  useEffect(() => {
    if (!loading && !loadError && currentPage > totalPages) setCurrentPage(totalPages);
  }, [loading, loadError, currentPage, totalPages]);
  const loadUsersFromApi = resource.refresh;
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await Promise.all([metadata.refresh(), resource.refresh()]); }
    finally { setIsRefreshing(false); }
  };
  const mutate = async (
    action: () => Promise<{ success: boolean; message?: string }>,
    onSuccess: () => void,
    onError?: (message: string) => void,
  ) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsRefreshing(true);
    try {
      const result = await action();
      if (scopeRef.current !== scope) return;
      if (!result.success) throw new Error(result.message || 'Please retry.');
      onSuccess();
      await loadUsersFromApi();
    } catch (error) {
      if (scopeRef.current === scope) {
        const message = error instanceof Error ? error.message : 'Please retry.';
        onError?.(message);
        showErrorToast('Unable to save', message);
      }
    } finally {
      busyRef.current = false;
      if (scopeRef.current === scope) setIsRefreshing(false);
    }
  };

  // Edit User Handler
  const handleOpenView = (user: UserItem) => {
    if (!canView) return;
    setDetailsLoading(true);
    setDetailsError('');
    setViewUserModal(user);
  };

  const handleOpenEdit = (user: UserItem) => {
    if (!canEdit) return;
    setDetailsLoading(true);
    setDetailsError('');
    setEditForm(null);
    setEditErrors({}); setEditSaveError('');
    setEditUserModal(user);
    setShowEditRoleDropdown(false); setShowEditStatusDropdown(false);
  };

  const handleSaveEdit = async (forceActive = false) => {
    if (!canEdit || !editForm || detailsLoading || detailsError) return;
    const selectedEditRole = editRoles.data?.find(r => normalizeRoleName(r.role_name || r.name || '') === normalizeRoleName(editForm.role));
    const roleId = protectedEditRole || editForm.role === editUserModal?.role ? editUserModal?.role_id : Number(selectedEditRole?.role_id ?? selectedEditRole?.id);
    if (busyRef.current) return;
    const errors: Partial<Record<keyof UserItem, string>> = {};
    if (!editForm.full_name.trim()) errors.full_name = 'Full name is required';
    if (!editForm.email.trim()) errors.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) errors.email = 'Enter a valid email address';
    if (!editForm.phone.trim()) errors.phone = 'Phone number is required';
    else if (!/^[6-9]\d{9}$/.test(editForm.phone.trim())) errors.phone = 'Mobile number must be 10 digits and start with 6, 7, 8, or 9';
    if (!roleId) errors.role = 'Select an available role';
    if (hasDoctorEditProfile) {
      const required = { department: 'Department', specialization: 'Specialization', qualification: 'Qualification',
        registration_number: 'Registration number', experience: 'Experience', consultation_fee: 'Consultation fee' } as const;
      for (const field of Object.keys(required) as (keyof typeof required)[]) {
        if (!editForm[field]?.trim()) errors[field] = required[field] + ' is required';
      }
      if (!editForm.available_days?.trim()) errors.available_days = 'Available days are required';
    }
    if (editForm.experience?.trim() && (!Number.isFinite(Number(editForm.experience)) || Number(editForm.experience) < 0)) errors.experience = 'Experience must be 0 or greater';
    if (hasDoctorEditProfile && editForm.consultation_fee?.trim() && (!Number.isFinite(Number(editForm.consultation_fee)) || Number(editForm.consultation_fee) < 0)) errors.consultation_fee = 'Consultation fee must be 0 or greater';
    setEditErrors(errors); setEditSaveError('');
    if (Object.keys(errors).length) {
      showErrorToast('Validation Error', 'Please correct the highlighted fields'); return;
    }
    await mutate(() => updateClinicUserApi(editForm.id, {
      full_name: editForm.full_name.trim(), phone: editForm.phone.trim(), role_id: roleId,
      department: editForm.department?.trim() || null, specialization: editForm.specialization?.trim() || null,
      qualification: editForm.qualification?.trim() || null, address: editForm.address?.trim() || null,
      experience_years: editForm.experience?.trim() ? Number(editForm.experience) : null,
      registration_number: hasDoctorEditProfile || isNurseEditRole ? editForm.registration_number?.trim() || null : null,
      consultation_fee: hasDoctorEditProfile ? Number(editForm.consultation_fee) : 0,
      available_days: hasDoctorEditProfile ? editForm.available_days?.trim() || null : null,
      is_doctor: hasDoctorEditProfile ? 1 : 0,
      is_active: forceActive || editForm.status === 'Active' ? 1 : 0,
    }), () => {
      showSuccessToast('User Updated', 'User updated successfully.');
      setEditUserModal(null); setEditForm(null);
    }, setEditSaveError);
  };
  const handleToggleUserStatus = async () => {
    if (!canEdit || !editForm || detailsLoading || detailsError || busyRef.current) return;
    if (editUserModal?.status === 'Inactive') {
      // Activation uses the same validated update as the web form.
      await handleSaveEdit(true);
      return;
    }
    if (!canDelete) return;

    setDeactivateConfirmVisible(true);
  };

  const handleConfirmDeactivate = async () => {
    if (busyRef.current || !canDelete || !editForm) return;
    const target = editForm.id;
    if (scopeRef.current !== scope || !accessRef.current.canDelete || !accessRef.current.canEdit || accessRef.current.editUserId !== target) return;
    setDeactivatingUser(true);
    await mutate(() => deactivateStaffApi(target), () => {
      showSuccessToast('Status Updated', 'User deactivated successfully.');
      setDeactivateConfirmVisible(false);
      setEditUserModal(null);
      setEditForm(null);
    }, setEditSaveError);
    setDeactivatingUser(false);
  };

  const closeEditForm = () => {
    if (busyRef.current) return;
    setDeactivateConfirmVisible(false);
    setEditUserModal(null); setEditForm(null); setEditSaveError(''); setEditErrors({});
  };
  const closeResetPassword = () => {
    if (busyRef.current) return;
    setResetPasswordModalUser(null); setResetErrors({}); setResetError('');
    setNewPassword(''); setConfirmPassword('');
  };

  // Open Reset Password Modal
  const handleOpenResetPasswordModal = () => {
    if (!canEdit || !editForm || detailsLoading || detailsError) return;
    if (busyRef.current) return;
    setResetErrors({}); setResetError('');
    setResetPasswordModalUser(editForm);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPass(false);
    setShowConfirmPass(false);
  };

  const handleConfirmResetPassword = async () => {
    if (!canEdit || !resetPasswordModalUser) return;
    if (resetSaving || busyRef.current) return;
    const errors: { password?: string; confirm?: string } = {};
    if (!newPassword) errors.password = 'New password is required';
    else if (newPassword.length < 8) errors.password = 'Password must be at least 8 characters';
    if (!confirmPassword) errors.confirm = 'Confirm password is required';
    else if (newPassword !== confirmPassword) errors.confirm = 'Passwords do not match';
    setResetErrors(errors); setResetError('');
    if (Object.keys(errors).length) return;

    setResetSaving(true);
    try {
      await mutate(() => resetStaffPasswordApi(resetPasswordModalUser.id, newPassword), () => {
        showSuccessToast('Password Reset', 'Password reset successfully.');
        setResetPasswordModalUser(null); setNewPassword(''); setConfirmPassword('');
        setResetErrors({});
      }, setResetError);
    } finally { if (scopeRef.current === scope) setResetSaving(false); }
  };
  const handleCreateUser = async () => {
    if (!canCreate) return;
    Keyboard.dismiss();
    setCreateError('');
    const validationError = (message: string) => {
      setCreateError(message);
      showErrorToast('Validation Error', message);
    };
    if (busyRef.current) {
      setCreateError('A save is already in progress. Please wait.');
      return;
    }
    if (createRoles.loading) {
      setCreateError('Roles are still loading. Please try again in a moment.');
      return;
    }
    if (createRoles.error) {
      setCreateError('Unable to load roles. Tap Retry roles and try again.');
      return;
    }
    const roleId = selectedCreateRole ? Number(createRole) : 0;
    const clinicId = Number(canChooseCreateClinic ? createClinicId : activeClinicId);
    if (!Number.isInteger(clinicId) || clinicId <= 0) {
      validationError('Select an active clinic from the app header before creating a user.');
      return;
    }
    if (canChooseCreateClinic && !createClinicOptions.some(c => c.id === clinicId)) {
      validationError('Select an available clinic.'); return;
    }
    if (!createFullName.trim()) {
      validationError('Full name is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createEmail.trim())) {
      validationError('Enter a valid email address.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(createPhone.trim())) {
      validationError('Phone number must have 10 digits and start with 6, 7, 8 or 9.');
      return;
    }
    if (!Number.isInteger(roleId) || roleId <= 0) {
      validationError('Select an available role.');
      return;
    }
    if (!createPassword.trim() || createPassword.length < 8) {
      validationError('Password must be at least 8 characters long.');
      return;
    }
    if (createDetails.experience_years.trim() && (!Number.isFinite(Number(createDetails.experience_years)) || Number(createDetails.experience_years) < 0)) {
      validationError('Experience must be 0 or greater.');
      return;
    }
    if (isDoctorCreateRole && createDetails.consultation_fee.trim() && (!Number.isFinite(Number(createDetails.consultation_fee)) || Number(createDetails.consultation_fee) < 0)) {
      validationError('Consultation fee must be 0 or greater.');
      return;
    }
    await mutate(() => createClinicUserApi({
      full_name: createFullName.trim(), email: createEmail.trim(), phone: createPhone.trim(),
      role_id: roleId, clinic_id: clinicId,
      password: createPassword,
      department: createDetails.department.trim() || null,
      specialization: createDetails.specialization.trim() || null,
      qualification: createDetails.qualification.trim() || null,
      address: createDetails.address.trim() || null,
      registration_number: isDoctorCreateRole || isNurseCreateRole ? createDetails.registration_number.trim() || null : null,
      experience_years: createDetails.experience_years.trim() ? Number(createDetails.experience_years) : null,
      consultation_fee: isDoctorCreateRole && createDetails.consultation_fee.trim() ? Number(createDetails.consultation_fee) : 0,
      available_days: isDoctorCreateRole ? createDetails.available_days.trim() || null : null,
      is_doctor: isDoctorCreateRole ? 1 : 0,
    }), () => {
      showSuccessToast('User Created', 'User created successfully.');
      setCreateUserModalOpen(false);
      resetCreateForm();
    }, setCreateError);
  };

  return (
    <SafeAreaView
      style={styles.container}
      // StaffHeader already provides the Android status bar spacing.
      edges={Platform.OS === 'android' && onOpenDrawer
        ? ['left', 'right', 'bottom']
        : ['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      {onOpenDrawer && (
        <StaffHeader
          onOpenDrawer={onOpenDrawer}
          title="User Management"
          onNavigate={(path) => {
            if (onNavigateScreen) {
              const cleanPath = path.replace('/', '').replace('-', '_');
              onNavigateScreen(cleanPath);
            }
          }}
        />
      )}

      <LiquidBorderScrollView
        {...borderScrollHandlers}
        style={styles.mainScrollView}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        decelerationRate="normal"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }>
        {/* --- PAGE HEADER BANNER --- */}
        <View style={styles.outerHeaderCard}>
          <Text style={styles.outerTitle}>Create User</Text>
          <Text style={styles.outerSubtitle}>
            Search, create, and manage users with role-based controls.
          </Text>
        </View>

        {/* --- MAIN CONTENT CONTAINER --- */}
        <View style={styles.mainCardBorder}>
          {/* Card Top Action Row */}
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>User Management</Text>
              <Text style={styles.cardSubtitle}>
                Search, filter, and manage user access with role-based controls.
              </Text>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.topButtonsRow}>
            <View style={styles.topButtonCol}>
              <RefreshButton
                onRefresh={handleRefresh}
                loading={isRefreshing}
                label="Refresh"
                refreshingLabel="Refreshing..."
                size="sm"
                timestampOnSecondLine
              />
            </View>

            <View style={styles.topButtonCol}>
              <TouchableOpacity
                style={styles.outlineBtn}
                onPress={() => setShowColumns(true)}
                accessibilityLabel="Choose user columns"
              >
                <Columns3 size={14} color={colors.text} style={{ marginRight: spacing.tiny }} />
                <Text style={styles.outlineBtnText}>Columns</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.topButtonCol}>
              <TouchableOpacity
                style={styles.tealCreateBtn}
                disabled={!canCreate}
                onPress={() => {
                  if (!canCreate) return;
                  resetCreateForm();
                  setCreateUserModalOpen(true);
                }}
              >
                <UserPlus size={15} color={colors.surface} style={{ marginRight: spacing.tiny }} />
                <Text style={styles.tealCreateBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/*   SEARCH AND FILTERS ROW  */}
          <View style={[styles.filtersRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={styles.searchBar}>
              <Search size={16} color={colors.subtle} style={{ marginRight: spacing.sm }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Global Search"
                placeholderTextColor={colors.subtle}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View style={styles.dropdownsWrapper}>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => {
                  setShowStatusDropdown(false);
                  setShowClinicDropdown(false);
                  setShowRoleDropdown(!showRoleDropdown);
                }}>
                <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                  {selectedRoleFilter}
                </Text>
                <ChevronDown size={14} color={colors.muted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => {
                  setShowRoleDropdown(false);
                  setShowClinicDropdown(false);
                  setShowStatusDropdown(!showStatusDropdown);
                }}>
                <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                  {selectedStatusFilter}
                </Text>
                <ChevronDown size={14} color={colors.muted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => {
                  setShowRoleDropdown(false);
                  setShowStatusDropdown(false);
                  setShowClinicDropdown(!showClinicDropdown);
                }}>
                <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                  {selectedClinicFilter}
                </Text>
                <ChevronDown size={14} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Dropdown Options Pickers */}
          {showRoleDropdown && (
            <View style={styles.dropdownMenuBox}>
              {['All Roles', ...dbRolesList].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={styles.dropdownMenuItem}
                  onPress={() => {
                    setSelectedRoleFilter(r);
                    setShowRoleDropdown(false);
                  }}>
                  <Text
                    style={[
                      styles.dropdownMenuItemText,
                      selectedRoleFilter === r && styles.dropdownMenuItemTextActive,
                    ]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showStatusDropdown && (
            <View style={styles.dropdownMenuBox}>
              {['All Status', 'Active', 'Inactive'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.dropdownMenuItem}
                  onPress={() => {
                    setSelectedStatusFilter(s);
                    setShowStatusDropdown(false);
                  }}>
                  <Text
                    style={[
                      styles.dropdownMenuItemText,
                      selectedStatusFilter === s && styles.dropdownMenuItemTextActive,
                    ]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showClinicDropdown && (
            <View style={styles.dropdownMenuBox}>
              {['All Clinics', ...dbClinicsList].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={styles.dropdownMenuItem}
                  onPress={() => {
                    setSelectedClinicFilter(c);
                    setShowClinicDropdown(false);
                  }}>
                  <Text
                    style={[
                      styles.dropdownMenuItemText,
                      selectedClinicFilter === c && styles.dropdownMenuItemTextActive,
                    ]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* --- RESPONSIVE LIST / TABLE VIEW --- */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading users from database...</Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{loadError ? 'Unable to load users. Please use Refresh Users to retry.' : 'No users found in database.'}</Text>
            </View>
          ) : isMobile ? (
            /* Responsive Mobile Card View */
            <View style={{ gap: 10, marginVertical: spacing.sm }}>
              {paginatedUsers.map((item) => {
                return (
                  <LiquidBorderSurface key={item.id} style={styles.mobileUserCard} radius={12}>
                    <View style={styles.mobileCardHeader}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        {visibleColumns.full_name && <Text style={styles.userNameText} numberOfLines={1}>
                          {item.full_name}
                        </Text>}
                        {visibleColumns.email && <Text style={styles.mobileEmailText} numberOfLines={1}>{item.email}</Text>}
                      </View>

                      {visibleColumns.status && <View
                        style={[
                          styles.statusPillBadge,
                          item.status === 'Active'
                            ? styles.statusActiveBg
                            : styles.statusInactiveBg,
                        ]}>
                        <Text
                          style={[
                            styles.statusPillText,
                            item.status === 'Active'
                              ? styles.statusActiveText
                              : styles.statusInactiveText,
                          ]}>
                          {item.status}
                        </Text>
                      </View>}
                    </View>

                    <View style={styles.mobileCardMeta}>
                      {visibleColumns.role && <Text style={styles.mobileMetaText}>Role: {item.role}</Text>}
                      {visibleColumns.clinic_name && <Text style={styles.mobileMetaText}>Clinic: {item.clinic_name || '-'}</Text>}
                    </View>

                    <View style={styles.mobileCardFooter}>
                      <View />

                      {/* Action Buttons (Eye & Edit only - No Delete User) */}
                      {visibleColumns.actions && <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={() => handleOpenView(item)}>
                          <Eye size={16} color={colors.foreground} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          disabled={!canEdit}
                          accessibilityLabel={'Edit user ' + item.full_name}
                          onPress={() => handleOpenEdit(item)}>
                          <Edit2 size={15} color={colors.foreground} />
                        </TouchableOpacity>
                      </View>}
                    </View>
                  </LiquidBorderSurface>
                );
              })}
            </View>
          ) : (
            /* Tablet / Desktop Table View */
            <LiquidBorderScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              nestedScrollEnabled={true}
              scrollEventThrottle={16}
              decelerationRate="normal"
              contentContainerStyle={{ minWidth: 800 }}>
              <View style={styles.tableContainer}>
                <View style={styles.tableHeaderRow}>
                  {visibleColumns.user_id && <Text style={[styles.thText, { width: 70 }]}>User ID</Text>}
                  {visibleColumns.full_name && <Text style={[styles.thText, { width: 160 }]}>User</Text>}
                  {visibleColumns.clinic_name && <Text style={[styles.thText, { width: 160 }]}>Clinic</Text>}
                  {visibleColumns.email && <Text style={[styles.thText, { width: 170 }]}>Email</Text>}
                  {visibleColumns.role && <Text style={[styles.thText, { width: 130 }]}>Role</Text>}
                  {visibleColumns.phone && <Text style={[styles.thText, { width: 120 }]}>Phone</Text>}
                  {visibleColumns.is_doctor && <Text style={[styles.thText, { width: 70 }]}>Doctor</Text>}
                  {(['address', 'department', 'specialization', 'created_at'] as const).filter(key => visibleColumns[key]).map(key => (
                    <Text key={key} style={[styles.thText, { width: 160 }]}>{userColumns[key]}</Text>
                  ))}
                  {visibleColumns.status && <Text style={[styles.thText, { width: 80 }]}>Status</Text>}
                  {visibleColumns.actions && <Text style={[styles.thText, { width: 60, textAlign: 'right' }]}>Actions</Text>}
                </View>

                {paginatedUsers.map((item) => {
                  const nameParts = (item.full_name || 'U').trim().split(/\s+/);
                  const initials = nameParts
                    .map((n) => n.charAt(0))
                    .join('')
                    .substring(0, 2)
                    .toUpperCase() || 'U';

                  return (
                    <View key={item.id} style={styles.tableBodyRow}>
                      {visibleColumns.user_id && <Text style={[styles.tdText, { width: 70, fontWeight: typography.weight.semibold }]}>
                        {item.user_id}
                      </Text>}

                      {visibleColumns.full_name && <View style={[styles.userCell, { width: 160 }]}>
                        <View style={styles.circleAvatar}>
                          <Text style={styles.circleAvatarText}>{initials}</Text>
                        </View>
                        <Text style={styles.userNameText} numberOfLines={1}>
                          {item.full_name}
                        </Text>
                      </View>}

                      {visibleColumns.clinic_name && <Text style={[styles.tdText, { width: 160 }]} numberOfLines={1}>
                        {item.clinic_name}
                      </Text>}

                      {visibleColumns.email && <Text style={[styles.tdText, { width: 170 }]} numberOfLines={1}>
                        {item.email}
                      </Text>}

                      {visibleColumns.role && <View style={{ width: 130 }}>
                        <View style={styles.rolePillBadge}>
                          <Text style={styles.rolePillText}>{item.role}</Text>
                        </View>
                      </View>}

                      {visibleColumns.phone && <Text style={[styles.tdText, { width: 120 }]}>{item.phone}</Text>}

                      {visibleColumns.is_doctor && <Text style={[styles.tdText, { width: 70 }]}>
                        {item.is_doctor ? 'Yes' : 'No'}
                      </Text>}

                      {(['address', 'department', 'specialization', 'created_at'] as const).filter(key => visibleColumns[key]).map(key => (
                        <Text key={key} style={[styles.tdText, { width: 160 }]}>{key === 'created_at' ? formatCreatedAt(item.created_at) : item[key] || '\u2014'}</Text>
                      ))}
                      {visibleColumns.status && <View style={{ width: 80 }}>
                        <View
                          style={[
                            styles.statusPillBadge,
                            item.status === 'Active'
                              ? styles.statusActiveBg
                              : styles.statusInactiveBg,
                          ]}>
                          <Text
                            style={[
                              styles.statusPillText,
                              item.status === 'Active'
                                ? styles.statusActiveText
                                : styles.statusInactiveText,
                            ]}>
                            {item.status}
                          </Text>
                        </View>
                      </View>}

                      {/* Action Buttons (Eye & Edit only) */}
                      {visibleColumns.actions && <View style={[styles.actionsCell, { width: 60, flexDirection: 'row', gap: spacing.tiny }]}>
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={() => handleOpenView(item)}>
                          <Eye size={16} color={colors.foreground} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          disabled={!canEdit}
                          accessibilityLabel={'Edit user ' + item.full_name}
                          onPress={() => handleOpenEdit(item)}>
                          <Edit2 size={15} color={colors.foreground} />
                        </TouchableOpacity>
                      </View>}
                    </View>
                  );
                })}
              </View>
            </LiquidBorderScrollView>
          )}

          {/* Pagination Component */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalUsers}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </View>
      </LiquidBorderScrollView>

      {/*  SHOW / HIDE COLUMNS MODAL (REUSABLE COMPONENT)                           */}
      <ColumnSelectorModal
        visible={showColumns}
        onClose={() => setShowColumns(false)}
        columns={userColumnOptions}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleUserColumn}
        onReset={resetUserColumns}
      />

      {/*  VIEW USER DETAILS MODAL                                                  */}

      <UserDetailsModal
        user={viewUserModal}
        isMobile={isMobile}
        addressLoading={detailsLoading}
        addressError={detailsError}
        onClose={() => setViewUserModal(null)}
        onRetryAddress={() => setDetailsRetry(value => value + 1)}
      />

      {/*  EDIT USER MODAL (MOBILE RESPONSIVE + DYNAMIC ACTIVATE / DEACTIVATE)       */}
      <AppModal visible={!!editUserModal} animationType="fade" transparent onRequestClose={closeEditForm}>
        <TouchableWithoutFeedback onPress={closeEditForm}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.editModalCard, isMobile && styles.editModalCardMobile]}>
                <View style={styles.editModalHeader}>
                  <View style={styles.editAvatarIconBox}>
                    <Edit2 size={18} color={colors.surface} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.editModalTitle}>Edit User</Text>
                    <Text style={styles.editModalSubtitle}>
                      Update profile and professional details.
                    </Text>
                  </View>
                  <TouchableOpacity onPress={closeEditForm}>
                    <X size={18} color={colors.muted} />
                  </TouchableOpacity>
                </View>

                {detailsLoading && <ActivityIndicator accessibilityLabel="Loading user details" />}
                {!!detailsError && (
                  <View style={{ padding: spacing.lg }}>
                    <Text accessibilityRole="alert">{detailsError}</Text>
                    <TouchableOpacity onPress={() => setDetailsRetry(value => value + 1)}>
                      <Text>Retry</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {editForm && (
                  <LiquidBorderScrollView style={{ padding: spacing.lg }} showsVerticalScrollIndicator={false}>
                    <View style={styles.editSectionCard}>
                      <Text style={styles.editSectionTitle}>Basic information</Text>
                      <Text style={styles.editSectionSub}>Identity and account details</Text>

                      <Text style={styles.formLabel}>
                        Full name <Text style={{ color: colors.destructive }}>*</Text>
                      </Text>
                      <TextInput aria-invalid={!!editErrors.full_name}
                        style={[styles.formInput, styles.formInputFocused, !!editErrors.full_name && styles.invalidInput]}
                        accessibilityLabel="Edit full name"
                        value={editForm.full_name}
                        onChangeText={v => { setEditForm({ ...editForm, full_name: v }); setEditErrors(previous => ({ ...previous, full_name: '' })); }}
                      />
                          {!!editErrors.full_name && <Text accessibilityRole="alert" style={styles.fieldError}>{editErrors.full_name}</Text>}

                      <Text style={styles.formLabel}>
                        Email address <Text style={{ color: colors.destructive }}>*</Text>
                      </Text>
                      <View style={[styles.disabledInputRow, !!editErrors.email && styles.invalidInput]}>
                        <TextInput
                          style={styles.disabledInput}
                          value={editForm.email}
                          editable={false}
                        />
                        <Lock size={15} color={colors.subtle} />
                      </View>
                      <Text style={styles.helperText}>Contact an administrator to change email.</Text>
                      {!!editErrors.email && <Text accessibilityRole="alert" style={styles.fieldError}>{editErrors.email}</Text>}

                      <Text style={styles.formLabel}>
                        Phone number <Text style={{ color: colors.destructive }}>*</Text>
                      </Text>
                      <TextInput aria-invalid={!!editErrors.phone}
                        style={[styles.formInput, !!editErrors.phone && styles.invalidInput]}
                        accessibilityLabel="Edit phone"
                        value={editForm.phone}
                        keyboardType="phone-pad"
                        onChangeText={v => { let digits = v.replace(/\D/g, ''); if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2); setEditForm({ ...editForm, phone: digits.slice(0, 10) }); setEditErrors(previous => ({ ...previous, phone: '' })); }}
                      />
                          {!!editErrors.phone && <Text accessibilityRole="alert" style={styles.fieldError}>{editErrors.phone}</Text>}

                      <Text style={styles.formLabel}>
                        Role <Text style={{ color: colors.destructive }}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={[styles.selectInputTrigger, !!editErrors.role && styles.invalidInput]}
                        accessibilityLabel="Edit role"
                        disabled={protectedEditRole || !canEdit || isRefreshing || editRoles.loading || !!editRoles.error}
                        onPress={() => { if (!protectedEditRole && canEdit) setShowEditRoleDropdown(!showEditRoleDropdown); }}>
                        <Text style={styles.selectInputText}>{editForm.role}</Text>
                        <ChevronDown size={16} color={colors.muted} />
                      </TouchableOpacity>

                      {protectedEditRole && <Text style={styles.helperText}>Admin role cannot be changed.</Text>}
                      {!!editErrors.role && <Text accessibilityRole="alert" style={styles.fieldError}>{editErrors.role}</Text>}
                      {!!editRoles.error && <TouchableOpacity onPress={editRoles.refresh}><Text style={styles.formLabel}>Unable to load roles. Tap to retry.</Text></TouchableOpacity>}
                      {showEditRoleDropdown && !protectedEditRole && (
                        <View style={styles.editDropdownList}>
                          {editRoleNames.map((r) => {
                            const isSelected = editForm.role === r;
                            return (
                              <TouchableOpacity
                                key={r}
                                accessibilityLabel={'Edit role ' + r}
                                style={[
                                  styles.editDropdownItem,
                                  isSelected && styles.editDropdownItemActive,
                                ]}
                                onPress={() => {
                                  setEditForm({ ...editForm, role: r });
                                  setEditErrors(previous => ({ ...previous, role: '' }));
                                  setShowEditRoleDropdown(false);
                                }}>
                                <Text
                                  style={[
                                    styles.editDropdownItemText,
                                    isSelected && styles.editDropdownItemTextActive,
                                  ]}>
                                  {isSelected ? '✓  ' : '    '}{r}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}

                      <Text style={styles.formLabel}>
                        Status <Text style={{ color: colors.destructive }}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.selectInputTrigger}
                        accessibilityLabel="Edit status"
                        onPress={() => setShowEditStatusDropdown(!showEditStatusDropdown)}>
                        <Text style={styles.selectInputText}>{editForm.status}</Text>
                        <ChevronDown size={16} color={colors.muted} />
                      </TouchableOpacity>

                      {showEditStatusDropdown && (
                        <View style={styles.editDropdownList}>
                          {['Active', 'Inactive'].map((s) => (
                            <TouchableOpacity
                              key={s}
                              accessibilityLabel={'Edit status ' + s}
                              style={styles.editDropdownItem}
                              onPress={() => {
                                setEditForm({ ...editForm, status: s as 'Active' | 'Inactive' });
                                setShowEditStatusDropdown(false);
                              }}>
                              <Text
                                style={[
                                  styles.editDropdownItemText,
                                  editForm.status === s && styles.editDropdownItemTextActive,
                                ]}>
                                {s}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Professional Details Section (Responsive Column Stack on Mobile) */}
                    <View style={[styles.editSectionCard, { marginTop: 14, marginBottom: 10 }]}>
                      <Text style={styles.editSectionTitle}>Professional details</Text>
                      <Text style={styles.editSectionSub}>Workplace & qualification details</Text>

                      <View style={[styles.formGrid2Col, isMobile && { flexDirection: 'column', gap: 0 }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.formLabel}>Department</Text>
                          <TextInput aria-invalid={!!editErrors.department}
                            style={[styles.formInput, !!editErrors.department && styles.invalidInput]}
                            placeholder="e.g. Cardiology"
                            placeholderTextColor={colors.subtle}
                            value={editForm.department || ''}
                            accessibilityLabel="Edit department"
                            onChangeText={v => { setEditForm({ ...editForm, department: v }); setEditErrors(previous => ({ ...previous, department: '' })); }}
                          />
                          {!!editErrors.department && <Text accessibilityRole="alert" style={styles.fieldError}>{editErrors.department}</Text>}
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.formLabel}>Specialization</Text>
                          <TextInput aria-invalid={!!editErrors.specialization}
                            style={[styles.formInput, !!editErrors.specialization && styles.invalidInput]}
                            placeholder="e.g. General Medicine"
                            placeholderTextColor={colors.subtle}
                            value={editForm.specialization || ''}
                            accessibilityLabel="Edit specialization"
                            onChangeText={v => { setEditForm({ ...editForm, specialization: v }); setEditErrors(previous => ({ ...previous, specialization: '' })); }}
                          />
                          {!!editErrors.specialization && <Text accessibilityRole="alert" style={styles.fieldError}>{editErrors.specialization}</Text>}
                        </View>
                      </View>

                      <View style={[styles.formGrid2Col, { marginTop: 10 }, isMobile && { flexDirection: 'column', gap: 0, marginTop: 0 }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.formLabel}>Qualification</Text>
                          <TextInput aria-invalid={!!editErrors.qualification}
                            style={[styles.formInput, !!editErrors.qualification && styles.invalidInput]}
                            placeholder="e.g. MBBS, MD"
                            placeholderTextColor={colors.subtle}
                            value={editForm.qualification || ''}
                            accessibilityLabel="Edit qualification"
                            onChangeText={v => { setEditForm({ ...editForm, qualification: v }); setEditErrors(previous => ({ ...previous, qualification: '' })); }}
                          />
                          {!!editErrors.qualification && <Text accessibilityRole="alert" style={styles.fieldError}>{editErrors.qualification}</Text>}
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.formLabel}>Experience (years)</Text>
                          <TextInput aria-invalid={!!editErrors.experience}
                            style={[styles.formInput, !!editErrors.experience && styles.invalidInput]}
                            placeholder="e.g. 5"
                            placeholderTextColor={colors.subtle}
                            keyboardType="numeric"
                            value={editForm.experience || ''}
                            accessibilityLabel="Edit experience"
                            onChangeText={v => { setEditForm({ ...editForm, experience: v }); setEditErrors(previous => ({ ...previous, experience: '' })); }}
                          />
                          {!!editErrors.experience && <Text accessibilityRole="alert" style={styles.fieldError}>{editErrors.experience}</Text>}
                        </View>
                      </View>

                      {protectedEditRole && (
                        <View style={styles.viewInfoLabelRow}>
                          <Text style={styles.formLabel}>Make this user a doctor</Text>
                          <Switch accessibilityLabel="Make this user a doctor" value={editForm.is_doctor}
                            disabled={!canEdit || isRefreshing}
                            onValueChange={value => { if (!canEdit || busyRef.current) return; setEditErrors({}); setEditForm({ ...editForm, is_doctor: value,
                              ...(value ? {} : { department: '', specialization: '', qualification: '', registration_number: '', experience: '', consultation_fee: '', available_days: '' }) }); }}
                            trackColor={{ false: colors.border, true: colors.mintBorder }} thumbColor={editForm.is_doctor ? colors.primary : colors.secondary} />
                        </View>
                      )}
                      {(hasDoctorEditProfile || isNurseEditRole) && <>
                        <Text style={styles.formLabel}>Registration number</Text>
                        <TextInput aria-invalid={!!editErrors.registration_number} style={[styles.formInput, !!editErrors.registration_number && styles.invalidInput]} accessibilityLabel="Edit registration number"
                          placeholder="Professional registration number" placeholderTextColor={colors.subtle}
                          value={editForm.registration_number || ''} editable={canEdit && !isRefreshing}
                          onChangeText={value => { setEditForm({ ...editForm, registration_number: value }); setEditErrors(previous => ({ ...previous, registration_number: '' })); }} />
                          {!!editErrors.registration_number && <Text accessibilityRole="alert" style={styles.fieldError}>{editErrors.registration_number}</Text>}
                      </>}
                      {hasDoctorEditProfile && <>
                        <View style={[styles.formGrid2Col, isMobile && { flexDirection: 'column', gap: 0 }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.formLabel}>Consultation fee</Text>
                            <TextInput aria-invalid={!!editErrors.consultation_fee} style={[styles.formInput, !!editErrors.consultation_fee && styles.invalidInput]} accessibilityLabel="Edit consultation fee" keyboardType="decimal-pad"
                              placeholder="e.g. 500" placeholderTextColor={colors.subtle}
                              value={editForm.consultation_fee || ''} editable={canEdit && !isRefreshing}
                              onChangeText={value => { setEditForm({ ...editForm, consultation_fee: value }); setEditErrors(previous => ({ ...previous, consultation_fee: '' })); }} />
                          {!!editErrors.consultation_fee && <Text accessibilityRole="alert" style={styles.fieldError}>{editErrors.consultation_fee}</Text>}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.formLabel}>Available days</Text>
                            <TextInput aria-invalid={!!editErrors.available_days} style={[styles.formInput, !!editErrors.available_days && styles.invalidInput]} accessibilityLabel="Edit available days"
                              placeholder="e.g. Mon, Tue, Fri" placeholderTextColor={colors.subtle}
                              value={editForm.available_days || ''} editable={canEdit && !isRefreshing}
                              onChangeText={value => { setEditForm({ ...editForm, available_days: value }); setEditErrors(previous => ({ ...previous, available_days: '' })); }} />
                          {!!editErrors.available_days && <Text accessibilityRole="alert" style={styles.fieldError}>{editErrors.available_days}</Text>}
                          </View>
                        </View>
                      </>}
                      <Text style={styles.formLabel}>Address</Text>
                      <TextInput
                        style={[styles.formInput, { height: 70, textAlignVertical: 'top' }]}
                        placeholder="Enter complete address"
                        placeholderTextColor={colors.subtle}
                        multiline
                        value={editForm.address || ''}
                        accessibilityLabel="Edit address"
                        onChangeText={(v) => setEditForm({ ...editForm, address: v })}
                      />
                    </View>
                  </LiquidBorderScrollView>
                )}

                {!!editSaveError && <Text accessibilityRole="alert" style={styles.fieldError}>{editSaveError}</Text>}
                <View testID="edit-user-actions" style={[styles.editModalFooter, isMobile && styles.editModalFooterMobile]}>
                  {(isMobile ? ['update', 'cancel', 'reset', 'status'] : ['status', 'reset', 'cancel', 'update']).map(action => {
                    const inactive = editUserModal?.status === 'Inactive';
                    const label = action === 'update' ? 'Update User' : action === 'cancel' ? 'Cancel'
                      : action === 'reset' ? 'Reset Password' : inactive ? 'Activate User' : 'Deactivate User';
                    const disabled = isRefreshing || resetSaving || (action !== 'cancel' && (!canEdit || detailsLoading || !!detailsError || !editForm))
                      || (action === 'status' && !inactive && !canDelete);
                    return (
                      <TouchableOpacity key={action} accessibilityLabel={label} accessibilityRole="button"
                        disabled={disabled}
                        style={[action === 'status' ? styles.deactivateBtn : action === 'update' ? styles.tealSaveBtn : styles.modalSecondaryBtn,
                          action === 'status' && inactive && styles.activateBtnBg, styles.editActionButton,
                          isMobile && styles.editActionButtonMobile,
                          isMobile && (width < 340 || fontScale > 1.3) && styles.editActionButtonStacked,
                          disabled && styles.disabledAction]}
                        onPress={() => {
                          if (disabled || busyRef.current) return;
                          if (action === 'update') void handleSaveEdit();
                          else if (action === 'cancel') closeEditForm();
                          else if (action === 'reset') handleOpenResetPasswordModal();
                          else void handleToggleUserStatus();
                        }}>
                        <Text style={[action === 'status' ? styles.deactivateBtnText : action === 'update' ? styles.tealSaveBtnText : styles.modalSecondaryBtnText,
                          styles.editActionText]}>{isRefreshing && action === 'update' ? 'Saving...' : label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </AppModal>

      {/*  RESET PASSWORD MODAL (EXACT MATCH TO UPLOADED SCREENSHOT)               */}

      <ResetPasswordModal
        visible={!!resetPasswordModalUser}
        userName={resetPasswordModalUser?.full_name}
        canEdit={canEdit}
        saving={resetSaving}
        password={newPassword}
        confirmPassword={confirmPassword}
        showPassword={showNewPass}
        showConfirmPassword={showConfirmPass}
        errors={resetErrors}
        errorMessage={resetError}
        onDismiss={closeResetPassword}
        onPasswordChange={value => {
          setNewPassword(value);
          setResetError('');
          setResetErrors(previous => ({
            ...previous,
            password: '',
            confirm: confirmPassword && confirmPassword !== value ? 'Passwords do not match' : '',
          }));
        }}
        onConfirmPasswordChange={value => {
          setConfirmPassword(value);
          setResetError('');
          setResetErrors(previous => ({ ...previous, confirm: '' }));
        }}
        onPasswordVisibilityChange={() => setShowNewPass(value => !value)}
        onConfirmVisibilityChange={() => setShowConfirmPass(value => !value)}
        onSubmit={handleConfirmResetPassword}
      />

      {/*  DEACTIVATE CONFIRMATION DIALOG (WEB-STYLED REUSABLE POPUP)            */}
      <ConfirmDialog
        visible={deactivateConfirmVisible}
        title="Deactivate User"
        message="Are you sure you want to deactivate this user? They will no longer be able to log in or access the clinic system."
        detail={editForm ? `${editForm.full_name} (${editForm.email || 'No email'})` : undefined}
        confirmText="Deactivate User"
        cancelText="Cancel"
        variant="danger"
        loading={deactivatingUser || isRefreshing}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => {
          if (!deactivatingUser) setDeactivateConfirmVisible(false);
        }}
        confirmAccessibilityLabel="Confirm deactivate user"
        cancelAccessibilityLabel="Cancel deactivation"
      />

      {/*  CREATE USER MODAL                                                       */}
      
      <AppModal visible={createUserModalOpen} animationType="fade" transparent onRequestClose={closeCreateForm}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableWithoutFeedback onPress={closeCreateForm}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.editModalCard, isMobile && styles.editModalCardMobile]}>
                <View style={styles.editModalHeader}>
                  <View style={styles.editAvatarIconBox}>
                    <UserPlus size={18} color={colors.surface} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.editModalTitle}>Create User</Text>
                    <Text style={styles.editModalSubtitle}>
                      Fill in details below to create a new user account.
                    </Text>
                  </View>
                  <TouchableOpacity onPress={closeCreateForm} disabled={isRefreshing} accessibilityLabel="Close create user">
                    <X size={18} color={colors.muted} />
                  </TouchableOpacity>
                </View>

                <LiquidBorderScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
                  {canChooseCreateClinic && <>
                    <Text style={styles.formLabel}>Clinic <Text style={{ color: colors.destructive }}>*</Text></Text>
                    {metadata.data?.clinicsError && <TouchableOpacity onPress={metadata.refresh}>
                      <Text accessibilityRole="alert" style={styles.fieldError}>Unable to refresh clinics. Showing assigned clinics. Tap to retry.</Text>
                    </TouchableOpacity>}
                    <TouchableOpacity style={styles.selectInputTrigger} accessibilityLabel="Select user clinic"
                      disabled={isRefreshing || !canCreate} onPress={() => setShowCreateClinicDropdown(value => !value)}>
                      <Text style={styles.selectInputText}>{createClinicOptions.find(c => c.id === createClinicId)?.name || 'Select clinic'}</Text>
                      <ChevronDown size={16} color={colors.muted} />
                    </TouchableOpacity>
                    {showCreateClinicDropdown && <View style={styles.editDropdownList}>
                      {createClinicOptions.map(clinic => <TouchableOpacity key={clinic.id} style={styles.editDropdownItem}
                        accessibilityLabel={'Create user in ' + clinic.name} onPress={() => {
                          setCreateClinicId(clinic.id); setCreateRole(''); setShowCreateRoleDropdown(false); setShowCreateClinicDropdown(false);
                        }}><Text style={styles.editDropdownItemText}>{clinic.name}</Text></TouchableOpacity>)}
                    </View>}
                  </>}
                  <Text style={styles.formLabel}>
                    Full name <Text style={{ color: colors.destructive }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. John Doe"
                    placeholderTextColor={colors.subtle}
                    value={createFullName}
                    onChangeText={setCreateFullName}
                    accessibilityLabel="Full name"
                    editable={!isRefreshing}
                  />

                  <Text style={styles.formLabel}>
                    Email address <Text style={{ color: colors.destructive }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="john@gmail.com"
                    placeholderTextColor={colors.subtle}
                    keyboardType="email-address"
                    value={createEmail}
                    onChangeText={setCreateEmail}
                    accessibilityLabel="Email address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isRefreshing}
                  />

                  <Text style={styles.formLabel}>
                    Temporary password <Text style={{ color: colors.destructive }}>*</Text>
                  </Text>
                  <View style={[styles.formInput, { flexDirection: 'row', alignItems: 'center' }]}>
                    <TextInput
                      style={{ fontFamily: typography.family, flex: 1, padding: 0, color: colors.text, fontSize: typography.size.caption }}
                      accessibilityLabel="Temporary password"
                      placeholder="Minimum 8 characters"
                      placeholderTextColor={colors.subtle}
                      value={createPassword}
                      onChangeText={setCreatePassword}
                      secureTextEntry={!showCreatePassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="new-password"
                      editable={!isRefreshing}
                    />
                    <TouchableOpacity accessibilityLabel={showCreatePassword ? 'Hide password' : 'Show password'}
                      onPress={() => setShowCreatePassword(!showCreatePassword)} hitSlop={10}>
                      {showCreatePassword ? <EyeOff size={18} color={colors.muted} /> : <Eye size={18} color={colors.muted} />}
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.formLabel}>Phone number <Text style={{ color: colors.destructive }}>*</Text></Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="7213123212"
                    placeholderTextColor={colors.subtle}
                    keyboardType="phone-pad"
                    value={createPhone}
                    accessibilityLabel="Phone number"
                    editable={!isRefreshing}
                    onChangeText={value => {
                      let digits = value.replace(/\D/g, '');
                      if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
                      setCreatePhone(digits.slice(0, 10));
                    }}
                  />

                  <Text style={styles.formLabel}>
                    Role <Text style={{ color: colors.destructive }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.selectInputTrigger}
                    accessibilityLabel="Select role"
                    disabled={!canCreate || isRefreshing || createRoles.loading || !createClinicId || Boolean(createRoles.error)}
                    onPress={() => setShowCreateRoleDropdown(!showCreateRoleDropdown)}>
                    <Text style={styles.selectInputText}>{createRoles.loading ? 'Loading roles...' : selectedCreateRole ? formatRoleTitle(selectedCreateRole.role_name || selectedCreateRole.name || '') : 'Select role'}</Text>
                    <ChevronDown size={16} color={colors.muted} />
                  </TouchableOpacity>
                  {createRoles.error && (
                    <TouchableOpacity onPress={() => createRoles.refresh()}>
                      <Text style={styles.formLabel}>Unable to load roles. Tap to retry.</Text>
                    </TouchableOpacity>
                  )}

                  {showCreateRoleDropdown && (
                    <View style={styles.editDropdownList}>
                      {(createRoles.data ?? []).map((r) => {
                        const roleId = String(r.role_id ?? r.id);
                        const roleName = formatRoleTitle(r.role_name || r.name || '');
                        const isSelected = createRole === roleId;
                        return (
                          <TouchableOpacity
                            key={roleId}
                            accessibilityLabel={'Select role ' + roleName}
                            style={[
                              styles.editDropdownItem,
                              isSelected && styles.editDropdownItemActive,
                            ]}
                            onPress={() => {
                              setCreateRole(roleId);
                              setShowCreateRoleDropdown(false);
                            }}>
                            <Text
                              style={[
                                styles.editDropdownItemText,
                                isSelected && styles.editDropdownItemTextActive,
                              ]}>
                              {isSelected ? '✓  ' : '    '}{roleName}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  <Text style={[styles.editSectionTitle, { marginTop: spacing.xl }]}>Professional details</Text>
                  <Text style={styles.editSectionSub}>Optional information can be added now or later.</Text>
                  {([
                    { key: 'department', label: 'Department', placeholder: 'e.g. Cardiology' },
                    { key: 'specialization', label: 'Specialization', placeholder: 'e.g. General Medicine' },
                    { key: 'qualification', label: 'Qualification', placeholder: 'e.g. MBBS, MD' },
                    { key: 'registration_number', label: 'Registration number', placeholder: 'Professional registration number', visible: isDoctorCreateRole || isNurseCreateRole },
                    { key: 'experience_years', label: 'Experience (years)', placeholder: 'e.g. 5', numeric: true },
                    { key: 'consultation_fee', label: 'Consultation fee', placeholder: 'e.g. 500', numeric: true, visible: isDoctorCreateRole },
                    { key: 'available_days', label: 'Available days', placeholder: 'e.g. Mon, Tue, Fri', visible: isDoctorCreateRole },
                    { key: 'address', label: 'Address', placeholder: 'Enter complete address', multiline: true },
                  ] as const).map(field => {
                    if ('visible' in field && !field.visible) return null;
                    const multiline = 'multiline' in field && field.multiline;
                    return (
                      <View key={field.key}>
                        <Text style={styles.formLabel}>{field.label}</Text>
                        <TextInput
                          accessibilityLabel={field.label}
                          style={[styles.formInput, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
                          placeholder={field.placeholder}
                          placeholderTextColor={colors.subtle}
                          value={createDetails[field.key]}
                          onChangeText={value => setCreateDetails(previous => ({ ...previous, [field.key]: value }))}
                          keyboardType={'numeric' in field && field.numeric ? 'decimal-pad' : 'default'}
                          multiline={multiline}
                          editable={!isRefreshing}
                        />
                      </View>
                    );
                  })}
                </LiquidBorderScrollView>

                <View style={[styles.editModalFooter, { flexWrap: 'wrap' }]}>
                  {!!createError && (
                    <View style={styles.createErrorBox}>
                      <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.createErrorText}>{createError}</Text>
                      {createRoles.error && (
                        <TouchableOpacity accessibilityLabel="Retry roles" onPress={() => createRoles.refresh()}>
                          <Text style={[styles.createErrorText, { fontWeight: typography.weight.bold, marginTop: spacing.tiny }]}>Retry roles</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.modalSecondaryBtn}
                    onPress={closeCreateForm} disabled={isRefreshing}>
                    <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.tealSaveBtn} onPress={handleCreateUser}
                    accessibilityLabel="Submit create user"
                    accessibilityState={{ disabled: !canCreate || isRefreshing, busy: isRefreshing }}
                    disabled={!canCreate || isRefreshing}>
                    {isRefreshing && <ActivityIndicator size="small" color={colors.surface} style={{ marginRight: spacing.tiny }} />}
                    <Text style={styles.tealSaveBtnText}>{isRefreshing ? 'Creating...' : 'Create User'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </AppModal>
    </SafeAreaView>
  );
}



export default UserManagement;
