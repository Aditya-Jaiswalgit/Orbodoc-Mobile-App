// src/screens/staff/UserManagement.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  RefreshControl,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  UserPlus,
  RefreshCw,
  Columns,
  Search,
  Eye,
  EyeOff,
  Edit2,
  X,
  Mail,
  Phone,
  Clock,
  Building,
  Stethoscope,
  GraduationCap,
  Award,
  Calendar,
  IndianRupee,
  MapPin,
  Lock,
  ChevronDown,
} from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { Pagination } from '../../components/common/Pagination';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import {
  fetchAllUsersApi,
  createClinicUserApi,
  updateClinicUserApi,
  resetStaffPasswordApi,
} from '../../api/userManagementApi';
import { fetchUserRolesApi } from '../../api/roleManagementApi';
import { apiFetch } from '../../api/apiConfig';
import { useRemoteData } from '../../hooks/useRemoteData';
import { useAuthContext } from '../../context/AuthContext';

export interface UserItem {
  id: string;
  role_id?: number;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  clinic_name: string;
  role: string;
  is_doctor: boolean;
  status: 'Active' | 'Inactive';
  created_at: string;
  department?: string;
  specialization?: string;
  qualification?: string;
  registration_number?: string;
  experience?: string;
  consultation_fee?: string;
  available_days?: string;
  address?: string;
}

interface UserManagementProps {
  onOpenDrawer?: () => void;
  onNavigateScreen?: (screen: string) => void;
}

function extractArrayData(res: any): any[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.clinics)) return res.data.clinics;
  if (res.data && Array.isArray(res.data.users)) return res.data.users;
  if (res.data && Array.isArray(res.data.data)) return res.data.data;
  if (res.data && Array.isArray(res.data.staff)) return res.data.staff;
  if (res.data && Array.isArray(res.data.result)) return res.data.result;
  if (Array.isArray(res.users)) return res.users;
  if (Array.isArray(res.staff)) return res.staff;
  if (Array.isArray(res.result)) return res.result;
  return [];
}

function formatRoleTitle(value: string): string {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function UserManagement({ onOpenDrawer, onNavigateScreen }: UserManagementProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { token, user, activeClinicId, activeClinicName, assignedClinics } = useAuthContext();

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

  // Reset Password Modal State (Matching Screenshot)
  const [resetPasswordModalUser, setResetPasswordModalUser] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);

  // Edit Form Fields State
  const [editForm, setEditForm] = useState<UserItem | null>(null);
  const [showEditRoleDropdown, setShowEditRoleDropdown] = useState(false);
  const [showEditStatusDropdown, setShowEditStatusDropdown] = useState(false);

  // Create Form State
  const [createFullName, setCreateFullName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createRole, setCreateRole] = useState('Billing Staff');
  const [showCreateRoleDropdown, setShowCreateRoleDropdown] = useState(false);
  const [createClinic, setCreateClinic] = useState(contextClinics[0] || '');

  const formatStaffUser = useCallback((staff: any): UserItem => {
    const rawRole = (
      staff.role ||
      staff.role_name ||
      staff.user_role ||
      staff.roleName ||
      ''
    ).toString();

    const formattedRole = formatRoleTitle(rawRole);

    const isDoc =
      Number(staff.is_doctor) === 1 ||
      rawRole.toLowerCase().includes('doc') ||
      !!staff.specialization ||
      !!staff.qualification;

    const clinic =
      staff.clinic_name ||
      staff.clinicName ||
      staff.clinic?.name ||
      activeClinicName ||
      '';

    return {
      id: String(staff.id || staff.user_id),
      role_id: Number(staff.role_id),
      user_id: String(staff.user_id || staff.id),
      full_name: staff.full_name || staff.name || staff.first_name || 'User Account',
      email: staff.email || '',
      phone: staff.phone || staff.mobile || '',
      clinic_name: clinic,
      role: formattedRole,
      is_doctor: isDoc,
      status: Number(staff.is_active) === 0 || staff.status === 'Inactive' ? 'Inactive' : 'Active',
      created_at: staff.created_at || staff.createdAt || '',
      department: staff.department || '',
      specialization: staff.specialization || '',
      qualification: staff.qualification || '',
      registration_number: staff.registration_number || '',
      experience: staff.experience_years != null ? String(staff.experience_years) : '',
      consultation_fee: staff.consultation_fee ? String(staff.consultation_fee) : '0.00',
      available_days: staff.available_days || '',
      address: staff.address || '',
    };
  }, [activeClinicName]);

  const scope = [user?.id, token, activeClinicId].join(':');
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
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
    setCreateUserModalOpen(false); setSelectedClinicFilter('All Clinics');
    setCreateClinic(activeClinicName || '');
    return () => { scopeRef.current = ''; };
  }, [scope, activeClinicName]);
  const metadata = useRemoteData(scope + ':staff-options', async () => {
    const [roles, clinics] = await Promise.all([
      fetchUserRolesApi(activeClinicId), apiFetch<any>('/clinics/my-clinics'),
    ]);
    if (!roles.success || !clinics.success) throw new Error('Unable to load user options');
    return { roles: extractArrayData(roles), clinics: extractArrayData(clinics) };
  }, Boolean(token));
  const roleRows = (metadata.data?.roles ?? []).filter(r => {
    const name = String(r.role_name || r.name).toLowerCase().replace(/ /g, '_');
    return name !== 'patient' && (name !== 'super_admin' || Number(user?.roleId || user?.role_id) === 1);
  });
  const clinicRows = metadata.data?.clinics ?? assignedClinics;
  const dbRolesList = Array.from(new Set<string>(roleRows.map(r => formatRoleTitle(r.role_name || r.name))));
  const dbClinicsList = Array.from(new Set<string>([...contextClinics, ...clinicRows.map(c => c.name || c.clinic_name).filter(Boolean)]));
  useEffect(() => {
    if (dbRolesList.length && !dbRolesList.includes(createRole)) setCreateRole(dbRolesList[0]);
  }, [dbRolesList, createRole]);
  const getRoleId = (name: string) => {
    const role = roleRows.find(r => formatRoleTitle(r.role_name || r.name) === name);
    return Number(role?.role_id || role?.id);
  };
  const filterClinicId = selectedClinicFilter === 'All Clinics' ? undefined
    : Number(clinicRows.find(c => (c.name || c.clinic_name) === selectedClinicFilter)?.id);
  const query = {
    page: currentPage, limit: pageSize, search: debouncedSearch, clinic_id: filterClinicId,
    role_id: selectedRoleFilter === 'All Roles' ? undefined : getRoleId(selectedRoleFilter),
    is_active: selectedStatusFilter === 'All Status' ? 'all' as const : selectedStatusFilter === 'Active' ? 1 as const : 0 as const,
  };
  const resource = useRemoteData(scope + ':staff:' + JSON.stringify(query), async () => {
    if (selectedRoleFilter !== 'All Roles' && !query.role_id) throw new Error('Select an available role');
    if (selectedClinicFilter !== 'All Clinics' && !filterClinicId) throw new Error('Select an available clinic');
    const result = await fetchAllUsersApi(query);
    if (!result.success || !Array.isArray(result.data?.data)) throw new Error(result.message);
    return { users: result.data.data.map(formatStaffUser), total: Number(result.data.total), refreshed: new Date().toLocaleString() };
  }, Boolean(token) && Boolean(metadata.data) && !metadata.error);
  const loading = resource.loading || metadata.loading;
  const loadError = resource.error || metadata.error;
  const users = loadError ? [] : resource.data?.users ?? [];
  const filteredUsers = users;
  const paginatedUsers = users;
  const totalUsers = loadError ? 0 : resource.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
  const lastRefreshed = resource.data?.refreshed ?? '';
  useEffect(() => {
    if (!loading && !loadError && currentPage > totalPages) setCurrentPage(totalPages);
  }, [loading, loadError, currentPage, totalPages]);
  const loadUsersFromApi = resource.refresh;
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await Promise.all([metadata.refresh(), resource.refresh()]); }
    finally { setIsRefreshing(false); }
  };
  const mutate = async (action: () => Promise<{ success: boolean; message?: string }>, onSuccess: () => void) => {
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
      if (scopeRef.current === scope) showErrorToast('Unable to save', error instanceof Error ? error.message : 'Please retry.');
    } finally {
      busyRef.current = false;
      if (scopeRef.current === scope) setIsRefreshing(false);
    }
  };

  // Edit User Handler
  const handleOpenEdit = (user: UserItem) => {
    setEditForm({ ...user });
    setEditUserModal(user);
  };

  const handleSaveEdit = async () => {
    if (!editForm) return;
    const roleId = editForm.role === editUserModal?.role ? editForm.role_id : getRoleId(editForm.role);
    if (!editForm.full_name.trim() || !/^[6-9]\d{9}$/.test(editForm.phone) || !roleId || (editForm.experience && (!Number.isFinite(Number(editForm.experience)) || Number(editForm.experience) < 0))) {
      showErrorToast('Validation Error', 'Enter a name, valid 10-digit mobile number and an available role.');
      return;
    }
    await mutate(() => updateClinicUserApi(editForm.id, {
      full_name: editForm.full_name.trim(), phone: editForm.phone, role_id: roleId,
      department: editForm.department, specialization: editForm.specialization,
      qualification: editForm.qualification, address: editForm.address,
      experience_years: editForm.experience ? Number(editForm.experience) : 0,
    }), () => {
      showSuccessToast('User Updated', 'User updated successfully.');
      setEditUserModal(null); setEditForm(null);
    });
  };
  const handleToggleUserStatus = async () => {
    if (!editForm) return;
    const status = editForm.status === 'Active' ? 'Inactive' : 'Active';
    await mutate(() => updateClinicUserApi(editForm.id, { is_active: status === 'Active' ? 1 : 0 }), () => {
      setEditForm({ ...editForm, status });
      showSuccessToast('Status Updated', 'User is now ' + status + '.');
    });
  };

  // Open Reset Password Modal
  const handleOpenResetPasswordModal = () => {
    if (!editForm) return;
    setResetPasswordModalUser(editForm);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPass(false);
    setShowConfirmPass(false);
  };

  const handleConfirmResetPassword = async () => {
    if (!resetPasswordModalUser) return;
    if (!newPassword || newPassword.length < 8) {
      showErrorToast('Validation Error', 'Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showErrorToast('Validation Error', 'Passwords do not match.');
      return;
    }

    if (resetSaving || busyRef.current) return;
    setResetSaving(true);
    try {
      await mutate(() => resetStaffPasswordApi(resetPasswordModalUser.id, newPassword), () => {
        showSuccessToast('Password Reset', 'Password reset successfully.');
        setResetPasswordModalUser(null); setNewPassword(''); setConfirmPassword('');
      });
    } finally { setResetSaving(false); }
  };
  const handleCreateUser = async () => {
    const roleId = getRoleId(createRole);
    const clinicId = Number(clinicRows.find(c => (c.name || c.clinic_name) === createClinic)?.id
      || (createClinic === activeClinicName ? activeClinicId : 0));
    if (!createFullName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createEmail.trim())
        || !/^[6-9]\d{9}$/.test(createPhone.trim()) || !roleId || !clinicId) {
      showErrorToast('Validation Error', 'Enter a name, valid email, 10-digit mobile number, role and clinic.');
      return;
    }
    await mutate(() => createClinicUserApi({
      full_name: createFullName.trim(), email: createEmail.trim(), phone: createPhone.trim(),
      role_id: roleId, clinic_id: clinicId,
    }), () => {
      showSuccessToast('User Created', 'User created. Use password reset to set their password.');
      setCreateUserModalOpen(false);
      setCreateFullName(''); setCreateEmail(''); setCreatePhone('');
    });
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

      <ScrollView
        style={styles.mainScrollView}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        decelerationRate="normal"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#0D9488']} />
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
              <Text style={styles.timestampText}>
                Last refreshed: {lastRefreshed || 'Just now'}
              </Text>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={[styles.topButtonsRow, isMobile && { flexWrap: 'wrap' }]}>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={handleRefresh}
              disabled={isRefreshing}>
              {isRefreshing ? (
                <ActivityIndicator size="small" color="#0D9488" style={{ marginRight: 6 }} />
              ) : (
                <RefreshCw size={14} color="#0D9488" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.outlineBtnText}>Refresh Users</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.outlineBtn}>
              <Columns size={14} color="#334155" style={{ marginRight: 6 }} />
              <Text style={[styles.outlineBtnText, { color: '#334155' }]}>Columns</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tealCreateBtn}
              onPress={() => setCreateUserModalOpen(true)}>
              <UserPlus size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.tealCreateBtnText}>Create User</Text>
            </TouchableOpacity>
          </View>

          {/*   SEARCH AND FILTERS ROW  */}
          <View style={[styles.filtersRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={styles.searchBar}>
              <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Global Search"
                placeholderTextColor="#94A3B8"
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
                <ChevronDown size={14} color="#64748B" />
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
                <ChevronDown size={14} color="#64748B" />
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
                <ChevronDown size={14} color="#64748B" />
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
              <ActivityIndicator size="large" color="#0D9488" />
              <Text style={styles.loadingText}>Loading users from database...</Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{loadError ? 'Unable to load users. Please use Refresh Users to retry.' : 'No users found in database.'}</Text>
            </View>
          ) : isMobile ? (
            /* Responsive Mobile Card View */
            <View style={{ gap: 10, marginVertical: 8 }}>
              {paginatedUsers.map((item) => {
                const nameParts = (item.full_name || 'U').trim().split(/\s+/);
                const initials = nameParts
                  .map((n) => n.charAt(0))
                  .join('')
                  .substring(0, 2)
                  .toUpperCase() || 'U';

                return (
                  <View key={item.id} style={styles.mobileUserCard}>
                    <View style={styles.mobileCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={styles.circleAvatar}>
                          <Text style={styles.circleAvatarText}>{initials}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.userNameText} numberOfLines={1}>
                            {item.full_name}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#64748B' }}>ID: #{item.user_id}</Text>
                        </View>
                      </View>

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
                    </View>

                    <View style={styles.mobileCardMeta}>
                      <Text style={styles.mobileMetaText}>🏢 {item.clinic_name}</Text>
                      <Text style={styles.mobileMetaText}>✉️ {item.email}</Text>
                      <Text style={styles.mobileMetaText}>📞 {item.phone}</Text>
                    </View>

                    <View style={styles.mobileCardFooter}>
                      <View style={styles.rolePillBadge}>
                        <Text style={styles.rolePillText}>{item.role}</Text>
                      </View>

                      {/* Action Buttons (Eye & Edit only - No Delete User) */}
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={() => setViewUserModal(item)}>
                          <Eye size={16} color="#334155" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={() => handleOpenEdit(item)}>
                          <Edit2 size={15} color="#334155" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            /* Tablet / Desktop Table View */
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              nestedScrollEnabled={true}
              scrollEventThrottle={16}
              decelerationRate="normal"
              contentContainerStyle={{ minWidth: 800 }}>
              <View style={styles.tableContainer}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.thText, { width: 70 }]}>User ID</Text>
                  <Text style={[styles.thText, { width: 160 }]}>User</Text>
                  <Text style={[styles.thText, { width: 160 }]}>Clinic</Text>
                  <Text style={[styles.thText, { width: 170 }]}>Email</Text>
                  <Text style={[styles.thText, { width: 130 }]}>Role</Text>
                  <Text style={[styles.thText, { width: 120 }]}>Phone</Text>
                  <Text style={[styles.thText, { width: 70 }]}>Doctor</Text>
                  <Text style={[styles.thText, { width: 80 }]}>Status</Text>
                  <Text style={[styles.thText, { width: 60, textAlign: 'right' }]}>Actions</Text>
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
                      <Text style={[styles.tdText, { width: 70, fontWeight: '600' }]}>
                        {item.user_id}
                      </Text>

                      <View style={[styles.userCell, { width: 160 }]}>
                        <View style={styles.circleAvatar}>
                          <Text style={styles.circleAvatarText}>{initials}</Text>
                        </View>
                        <Text style={styles.userNameText} numberOfLines={1}>
                          {item.full_name}
                        </Text>
                      </View>

                      <Text style={[styles.tdText, { width: 160 }]} numberOfLines={1}>
                        {item.clinic_name}
                      </Text>

                      <Text style={[styles.tdText, { width: 170 }]} numberOfLines={1}>
                        {item.email}
                      </Text>

                      <View style={{ width: 130 }}>
                        <View style={styles.rolePillBadge}>
                          <Text style={styles.rolePillText}>{item.role}</Text>
                        </View>
                      </View>

                      <Text style={[styles.tdText, { width: 120 }]}>{item.phone}</Text>

                      <Text style={[styles.tdText, { width: 70 }]}>
                        {item.is_doctor ? 'Yes' : 'No'}
                      </Text>

                      <View style={{ width: 80 }}>
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
                      </View>

                      {/* Action Buttons (Eye & Edit only) */}
                      <View style={[styles.actionsCell, { width: 60, flexDirection: 'row', gap: 6 }]}>
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={() => setViewUserModal(item)}>
                          <Eye size={16} color="#334155" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={() => handleOpenEdit(item)}>
                          <Edit2 size={15} color="#334155" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
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
      </ScrollView>

      {/*  VIEW USER DETAILS MODAL                                                  */}

      <Modal visible={!!viewUserModal} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setViewUserModal(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.viewModalCard, isMobile && styles.viewModalCardMobile]}>
                <View style={[styles.viewModalHeader, isMobile && { padding: 12 }]}>
                  <View style={styles.viewAvatarCircle}>
                    <Text style={styles.viewAvatarText}>
                      {(viewUserModal?.full_name || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.viewModalName, isMobile && { fontSize: 16 }]} numberOfLines={1}>
                      {viewUserModal?.full_name}
                    </Text>
                    <Text style={[styles.viewModalEmail, isMobile && { fontSize: 12 }]} numberOfLines={1}>
                      {viewUserModal?.email}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <View style={styles.viewRoleBadge}>
                        <Text style={styles.viewRoleBadgeText}>{viewUserModal?.role}</Text>
                      </View>
                      <View
                        style={[
                          styles.viewActiveBadge,
                          viewUserModal?.status === 'Inactive' && { backgroundColor: '#EF4444' },
                        ]}
                      >
                        <Text style={styles.viewActiveBadgeText}>{viewUserModal?.status}</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setViewUserModal(null)}
                    style={styles.closeHeaderBtn}>
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ padding: isMobile ? 12 : 16 }} showsVerticalScrollIndicator={false}>
                  <View style={styles.viewSectionCard}>
                    <Text style={styles.viewSectionTitle}>Account information</Text>
                    <View style={[styles.viewGrid2Col, isMobile && { flexDirection: 'column', gap: 8 }]}>
                      <View style={styles.viewInfoBox}>
                        <View style={styles.viewInfoLabelRow}>
                          <Mail size={14} color="#0D9488" style={{ marginRight: 6 }} />
                          <Text style={styles.viewInfoLabel}>Email address</Text>
                        </View>
                        <Text style={styles.viewInfoVal}>{viewUserModal?.email}</Text>
                      </View>

                      <View style={styles.viewInfoBox}>
                        <View style={styles.viewInfoLabelRow}>
                          <Phone size={14} color="#0D9488" style={{ marginRight: 6 }} />
                          <Text style={styles.viewInfoLabel}>Phone number</Text>
                        </View>
                        <Text style={styles.viewInfoVal}>{viewUserModal?.phone}</Text>
                      </View>
                    </View>

                    <View style={[styles.viewInfoBox, { marginTop: 10 }]}>
                      <View style={styles.viewInfoLabelRow}>
                        <Clock size={14} color="#0D9488" style={{ marginRight: 6 }} />
                        <Text style={styles.viewInfoLabel}>Created at</Text>
                      </View>
                      <Text style={styles.viewInfoVal}>{viewUserModal?.created_at}</Text>
                    </View>
                  </View>

                  <View style={[styles.viewSectionCard, { marginTop: 14 }]}>
                    <Text style={styles.viewSectionTitle}>Professional details</Text>
                    <View style={[styles.viewGrid3Col, isMobile && { flexDirection: 'column', gap: 8 }]}>
                      <View style={styles.viewInfoBoxSmall}>
                        <View style={styles.viewInfoLabelRow}>
                          <Building size={13} color="#0D9488" style={{ marginRight: 4 }} />
                          <Text style={styles.viewInfoLabel}>Department</Text>
                        </View>
                        <Text style={styles.viewInfoValSmall}>
                          {viewUserModal?.department || '—'}
                        </Text>
                      </View>

                      <View style={styles.viewInfoBoxSmall}>
                        <View style={styles.viewInfoLabelRow}>
                          <Stethoscope size={13} color="#0D9488" style={{ marginRight: 4 }} />
                          <Text style={styles.viewInfoLabel}>Specialization</Text>
                        </View>
                        <Text style={styles.viewInfoValSmall}>
                          {viewUserModal?.specialization || '—'}
                        </Text>
                      </View>

                      <View style={styles.viewInfoBoxSmall}>
                        <View style={styles.viewInfoLabelRow}>
                          <GraduationCap size={13} color="#0D9488" style={{ marginRight: 4 }} />
                          <Text style={styles.viewInfoLabel}>Qualification</Text>
                        </View>
                        <Text style={styles.viewInfoValSmall}>
                          {viewUserModal?.qualification || '—'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.viewGrid3Col, { marginTop: 10 }, isMobile && { flexDirection: 'column', gap: 8, marginTop: 8 }]}>
                      <View style={styles.viewInfoBoxSmall}>
                        <View style={styles.viewInfoLabelRow}>
                          <Award size={13} color="#0D9488" style={{ marginRight: 4 }} />
                          <Text style={styles.viewInfoLabel}>Registration number</Text>
                        </View>
                        <Text style={styles.viewInfoValSmall}>
                          {viewUserModal?.registration_number || '—'}
                        </Text>
                      </View>

                      <View style={styles.viewInfoBoxSmall}>
                        <View style={styles.viewInfoLabelRow}>
                          <Clock size={13} color="#0D9488" style={{ marginRight: 4 }} />
                          <Text style={styles.viewInfoLabel}>Experience</Text>
                        </View>
                        <Text style={styles.viewInfoValSmall}>
                          {viewUserModal?.experience || '—'}
                        </Text>
                      </View>

                      <View style={styles.viewInfoBoxSmall}>
                        <View style={styles.viewInfoLabelRow}>
                          <IndianRupee size={13} color="#0D9488" style={{ marginRight: 4 }} />
                          <Text style={styles.viewInfoLabel}>Consultation fee</Text>
                        </View>
                        <Text style={styles.viewInfoValSmall}>
                          ₹{viewUserModal?.consultation_fee || '0.00'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.viewInfoBox, { marginTop: 10 }]}>
                      <View style={styles.viewInfoLabelRow}>
                        <Calendar size={13} color="#0D9488" style={{ marginRight: 6 }} />
                        <Text style={styles.viewInfoLabel}>Available days</Text>
                      </View>
                      <Text style={styles.viewInfoVal}>
                        {viewUserModal?.available_days || '—'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.viewSectionCard, { marginTop: 14, marginBottom: 10 }]}>
                    <View style={styles.viewInfoLabelRow}>
                      <MapPin size={14} color="#0D9488" style={{ marginRight: 6 }} />
                      <Text style={styles.viewInfoLabel}>Address</Text>
                    </View>
                    <Text style={[styles.viewInfoVal, { marginTop: 4 }]}>
                      {viewUserModal?.address || 'No address provided'}
                    </Text>
                  </View>
                </ScrollView>

                <View style={[styles.viewModalFooter, isMobile && styles.viewModalFooterMobile]}>
                  <TouchableOpacity
                    style={[styles.modalCloseFooterBtn, isMobile && { width: '100%', alignItems: 'center' }]}
                    onPress={() => setViewUserModal(null)}>
                    <Text style={styles.modalCloseFooterBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/*  EDIT USER MODAL (MOBILE RESPONSIVE + DYNAMIC ACTIVATE / DEACTIVATE)       */}
      <Modal visible={!!editUserModal} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setEditUserModal(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.editModalCard, isMobile && styles.editModalCardMobile]}>
                <View style={styles.editModalHeader}>
                  <View style={styles.editAvatarIconBox}>
                    <Edit2 size={18} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.editModalTitle}>Edit User</Text>
                    <Text style={styles.editModalSubtitle}>
                      Update profile and professional details.
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setEditUserModal(null)}>
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {editForm && (
                  <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
                    <View style={styles.editSectionCard}>
                      <Text style={styles.editSectionTitle}>Basic information</Text>
                      <Text style={styles.editSectionSub}>Identity and account details</Text>

                      <Text style={styles.formLabel}>
                        Full name <Text style={{ color: '#EF4444' }}>*</Text>
                      </Text>
                      <TextInput
                        style={[styles.formInput, styles.formInputFocused]}
                        value={editForm.full_name}
                        onChangeText={(v) => setEditForm({ ...editForm, full_name: v })}
                      />

                      <Text style={styles.formLabel}>
                        Email address <Text style={{ color: '#EF4444' }}>*</Text>
                      </Text>
                      <View style={styles.disabledInputRow}>
                        <TextInput
                          style={styles.disabledInput}
                          value={editForm.email}
                          editable={false}
                        />
                        <Lock size={15} color="#94A3B8" />
                      </View>
                      <Text style={styles.helperText}>Contact an administrator to change email.</Text>

                      <Text style={styles.formLabel}>
                        Phone number <Text style={{ color: '#EF4444' }}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInput}
                        value={editForm.phone}
                        keyboardType="phone-pad"
                        onChangeText={(v) => setEditForm({ ...editForm, phone: v })}
                      />

                      <Text style={styles.formLabel}>
                        Role <Text style={{ color: '#EF4444' }}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.selectInputTrigger}
                        onPress={() => setShowEditRoleDropdown(!showEditRoleDropdown)}>
                        <Text style={styles.selectInputText}>{editForm.role}</Text>
                        <ChevronDown size={16} color="#64748B" />
                      </TouchableOpacity>

                      {showEditRoleDropdown && (
                        <View style={styles.editDropdownList}>
                          {dbRolesList.map((r) => {
                            const isSelected = editForm.role === r;
                            return (
                              <TouchableOpacity
                                key={r}
                                style={[
                                  styles.editDropdownItem,
                                  isSelected && styles.editDropdownItemActive,
                                ]}
                                onPress={() => {
                                  setEditForm({ ...editForm, role: r });
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
                        Status <Text style={{ color: '#EF4444' }}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.selectInputTrigger}
                        onPress={() => setShowEditStatusDropdown(!showEditStatusDropdown)}>
                        <Text style={styles.selectInputText}>{editForm.status}</Text>
                        <ChevronDown size={16} color="#64748B" />
                      </TouchableOpacity>

                      {showEditStatusDropdown && (
                        <View style={styles.editDropdownList}>
                          {['Active', 'Inactive'].map((s) => (
                            <TouchableOpacity
                              key={s}
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
                          <TextInput
                            style={styles.formInput}
                            placeholder="e.g. Cardiology"
                            placeholderTextColor="#94A3B8"
                            value={editForm.department || ''}
                            onChangeText={(v) => setEditForm({ ...editForm, department: v })}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.formLabel}>Specialization</Text>
                          <TextInput
                            style={styles.formInput}
                            placeholder="e.g. General Medicine"
                            placeholderTextColor="#94A3B8"
                            value={editForm.specialization || ''}
                            onChangeText={(v) => setEditForm({ ...editForm, specialization: v })}
                          />
                        </View>
                      </View>

                      <View style={[styles.formGrid2Col, { marginTop: 10 }, isMobile && { flexDirection: 'column', gap: 0, marginTop: 0 }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.formLabel}>Qualification</Text>
                          <TextInput
                            style={styles.formInput}
                            placeholder="e.g. MBBS, MD"
                            placeholderTextColor="#94A3B8"
                            value={editForm.qualification || ''}
                            onChangeText={(v) => setEditForm({ ...editForm, qualification: v })}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.formLabel}>Experience (years)</Text>
                          <TextInput
                            style={styles.formInput}
                            placeholder="e.g. 5"
                            placeholderTextColor="#94A3B8"
                            keyboardType="numeric"
                            value={editForm.experience || ''}
                            onChangeText={(v) => setEditForm({ ...editForm, experience: v })}
                          />
                        </View>
                      </View>

                      <Text style={styles.formLabel}>Address</Text>
                      <TextInput
                        style={[styles.formInput, { height: 70, textAlignVertical: 'top' }]}
                        placeholder="Enter complete address"
                        placeholderTextColor="#94A3B8"
                        multiline
                        value={editForm.address || ''}
                        onChangeText={(v) => setEditForm({ ...editForm, address: v })}
                      />
                    </View>
                  </ScrollView>
                )}

                {/* Footer with Activate / Deactivate Toggle Button */}
                <View style={[styles.editModalFooter, isMobile && styles.editModalFooterMobile]}>
                  {/* Dynamic Status Toggle Button: "Deactivate User" if Active, "Activate User" if Inactive */}
                  <TouchableOpacity
                    style={[
                      styles.deactivateBtn,
                      editForm?.status === 'Inactive' && styles.activateBtnBg,
                    ]}
                    onPress={handleToggleUserStatus}>
                    <Text style={styles.deactivateBtnText}>
                      {editForm?.status === 'Inactive' ? 'Activate User' : 'Deactivate User'}
                    </Text>
                  </TouchableOpacity>

                  <View style={[styles.footerRightButtonsRow, isMobile && styles.footerRightButtonsRowMobile]}>
                    <TouchableOpacity
                      style={styles.modalSecondaryBtn}
                      onPress={handleOpenResetPasswordModal}>
                      <Text style={styles.modalSecondaryBtnText}>Reset Password</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalSecondaryBtn}
                      onPress={() => setEditUserModal(null)}>
                      <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.tealSaveBtn} onPress={handleSaveEdit} disabled={isRefreshing}>
                      <Text style={styles.tealSaveBtnText}>Update User</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/*  RESET PASSWORD MODAL (EXACT MATCH TO UPLOADED SCREENSHOT)               */}

      <Modal visible={!!resetPasswordModalUser} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setResetPasswordModalUser(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.resetPasswordCard}>
                {/* Header with rounded teal Lock icon and light cyan background */}
                <View style={styles.resetPasswordHeader}>
                  <View style={styles.resetLockIconBox}>
                    <Lock size={22} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.resetTitle}>Reset Password</Text>
                    <Text style={styles.resetSubtitle}>
                      Set a secure temporary password for {resetPasswordModalUser?.full_name || 'User'}.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setResetPasswordModalUser(null)}
                    style={{ padding: 4 }}
                  >
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Form Fields */}
                <View style={styles.resetFormBody}>
                  {/* New Password */}
                  <Text style={styles.resetFieldLabel}>
                    New password <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <View style={styles.passwordInputContainerActive}>
                    <TextInput
                      style={styles.passwordInputText}
                      placeholder="Enter at least 8 characters"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showNewPass}
                      value={newPassword}
                      onChangeText={setNewPassword}
                    />
                    <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)} style={{ padding: 6 }}>
                      {showNewPass ? (
                        <EyeOff size={18} color="#64748B" />
                      ) : (
                        <Eye size={18} color="#64748B" />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Confirm Password */}
                  <Text style={[styles.resetFieldLabel, { marginTop: 14 }]}>
                    Confirm password <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordInputText}
                      placeholder="Re-enter the new password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showConfirmPass}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPass(!showConfirmPass)} style={{ padding: 6 }}>
                      {showConfirmPass ? (
                        <EyeOff size={18} color="#64748B" />
                      ) : (
                        <Eye size={18} color="#64748B" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Footer Actions */}
                <View style={styles.resetFooterRow}>
                  <TouchableOpacity
                    style={styles.resetCancelBtn}
                    onPress={() => setResetPasswordModalUser(null)}
                  >
                    <Text style={styles.resetCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resetSubmitBtn}
                    onPress={handleConfirmResetPassword}
                    disabled={resetSaving}
                  >
                    {resetSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Lock size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.resetSubmitBtnText}>Reset Password</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/*  CREATE USER MODAL                                                       */}
      
      <Modal visible={createUserModalOpen} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setCreateUserModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.editModalCard, isMobile && styles.editModalCardMobile]}>
                <View style={styles.editModalHeader}>
                  <View style={styles.editAvatarIconBox}>
                    <UserPlus size={18} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.editModalTitle}>Create User</Text>
                    <Text style={styles.editModalSubtitle}>
                      Fill in details below to create a new user account.
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setCreateUserModalOpen(false)}>
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ padding: 16 }}>
                  <Text style={styles.formLabel}>
                    Full name <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. John Doe"
                    placeholderTextColor="#94A3B8"
                    value={createFullName}
                    onChangeText={setCreateFullName}
                  />

                  <Text style={styles.formLabel}>
                    Email address <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="john@gmail.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    value={createEmail}
                    onChangeText={setCreateEmail}
                  />

                  <Text style={styles.formLabel}>Phone number</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="7213123212"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={createPhone}
                    onChangeText={setCreatePhone}
                  />

                  <Text style={styles.formLabel}>
                    Role <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.selectInputTrigger}
                    onPress={() => setShowCreateRoleDropdown(!showCreateRoleDropdown)}>
                    <Text style={styles.selectInputText}>{createRole}</Text>
                    <ChevronDown size={16} color="#64748B" />
                  </TouchableOpacity>

                  {showCreateRoleDropdown && (
                    <View style={styles.editDropdownList}>
                      {dbRolesList.map((r) => {
                        const isSelected = createRole === r;
                        return (
                          <TouchableOpacity
                            key={r}
                            style={[
                              styles.editDropdownItem,
                              isSelected && styles.editDropdownItemActive,
                            ]}
                            onPress={() => {
                              setCreateRole(r);
                              setShowCreateRoleDropdown(false);
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
                </ScrollView>

                <View style={styles.editModalFooter}>
                  <TouchableOpacity
                    style={styles.modalSecondaryBtn}
                    onPress={() => setCreateUserModalOpen(false)}>
                    <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.tealSaveBtn} onPress={handleCreateUser} disabled={isRefreshing}>
                    <Text style={styles.tealSaveBtnText}>Create User</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  mainScrollView: { flex: 1, padding: 12 },

  outerHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  outerTitle: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  outerSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },

  mainCardBorder: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 16,
    marginBottom: 30,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  cardSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  timestampText: { fontSize: 11, color: '#94A3B8', marginTop: 6 },

  topButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  outlineBtnText: { fontSize: 13, fontWeight: '600', color: '#0D9488' },
  tealCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tealCreateBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },

  filtersRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBar: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A' },
  dropdownsWrapper: {
    flex: 3,
    flexDirection: 'row',
    gap: 6,
  },
  dropdownTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 40,
  },
  dropdownTriggerText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  dropdownMenuBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 6,
    marginTop: 4,
    elevation: 4,
  },
  dropdownMenuItem: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6 },
  dropdownMenuItemText: { fontSize: 13, color: '#334155' },
  dropdownMenuItemTextActive: { color: '#0D9488', fontWeight: '700' },

  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 13,
  },

  tableContainer: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
  },
  thText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  tableBodyRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  tdText: { fontSize: 13, color: '#334155' },
  userCell: { flexDirection: 'row', alignItems: 'center' },
  circleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  circleAvatarText: { fontSize: 11, fontWeight: '700', color: '#0D9488' },
  userNameText: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  rolePillBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  rolePillText: { fontSize: 11, fontWeight: '600', color: '#334155' },
  statusPillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusActiveBg: { backgroundColor: '#DCFCE7' },
  statusInactiveBg: { backgroundColor: '#FEE2E2' },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  statusActiveText: { color: '#166534' },
  statusInactiveText: { color: '#991B1B' },
  actionsCell: { alignItems: 'flex-end', justifyContent: 'center' },
  actionIconBtn: { padding: 4 },

  emptyBox: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 13 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },

  viewModalCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
  },
  viewModalCardMobile: {
    maxWidth: '96%',
    maxHeight: '92%',
    borderRadius: 14,
  },
  viewModalHeader: {
    backgroundColor: '#ECFDF5',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  viewAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAvatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  viewModalName: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  viewModalEmail: { fontSize: 13, color: '#64748B', marginTop: 1 },
  viewRoleBadge: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  viewRoleBadgeText: { fontSize: 11, fontWeight: '600', color: '#0D9488' },
  viewActiveBadge: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  viewActiveBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  closeHeaderBtn: { padding: 4 },

  viewSectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
  },
  viewSectionTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 10 },
  viewGrid2Col: { flexDirection: 'row', gap: 10 },
  viewGrid3Col: { flexDirection: 'row', gap: 8 },
  viewInfoBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
  },
  viewInfoBoxSmall: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 8,
  },
  viewInfoLabelRow: { flexDirection: 'row', alignItems: 'center' },
  viewInfoLabel: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  viewInfoVal: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginTop: 4 },
  viewInfoValSmall: { fontSize: 12, fontWeight: '700', color: '#0F172A', marginTop: 4 },
  viewModalFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'flex-end',
    backgroundColor: '#F8FAFC',
  },
  viewModalFooterMobile: {
    padding: 12,
    alignItems: 'stretch',
  },
  modalCloseFooterBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalCloseFooterBtnText: { fontSize: 13, fontWeight: '600', color: '#334155' },

  // Edit Modal Styling
  editModalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
  },
  editModalCardMobile: {
    maxWidth: '96%',
    maxHeight: '92%',
    borderRadius: 14,
  },
  editModalHeader: {
    backgroundColor: '#ECFDF5',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  editAvatarIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editModalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  editModalSubtitle: { fontSize: 12, color: '#64748B', marginTop: 1 },

  editSectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
  },
  editSectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  editSectionSub: { fontSize: 12, color: '#64748B', marginBottom: 12 },

  formLabel: { fontSize: 12, fontWeight: '600', color: '#334155', marginTop: 10, marginBottom: 4 },
  formInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  formInputFocused: {
    borderColor: '#0D9488',
    borderWidth: 1.5,
    backgroundColor: '#F0FDFA',
  },
  disabledInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    paddingRight: 10,
  },
  disabledInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#64748B' },
  helperText: { fontSize: 11, color: '#64748B', marginTop: 3 },

  selectInputTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  selectInputText: { fontSize: 13, color: '#0F172A', fontWeight: '500' },
  editDropdownList: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
    padding: 4,
    elevation: 3,
  },
  editDropdownItem: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6 },
  editDropdownItemActive: { backgroundColor: '#E6F4F1' },
  editDropdownItemText: { fontSize: 13, color: '#334155' },
  editDropdownItemTextActive: { color: '#0D9488', fontWeight: '700' },

  formGrid2Col: { flexDirection: 'row', gap: 10 },

  editModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  editModalFooterMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },

  // Dynamic Status Button: Red for Deactivate, Green for Activate
  deactivateBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activateBtnBg: {
    backgroundColor: '#16A34A', // Green for Activate User
  },
  deactivateBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  footerRightButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerRightButtonsRowMobile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },

  modalSecondaryBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryBtnText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  tealSaveBtn: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tealSaveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  // Reset Password Modal Styling (Exact Match to Screenshot)
  resetPasswordCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  resetPasswordHeader: {
    backgroundColor: '#F0FDFA', // Light cyan background header
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E6F4F1',
  },
  resetLockIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  resetSubtitle: { fontSize: 13, color: '#64748B', marginTop: 3 },

  resetFormBody: { padding: 18 },
  resetFieldLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },

  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    height: 46,
  },
  passwordInputContainerActive: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0D9488',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 46,
  },
  passwordInputText: { flex: 1, fontSize: 14, color: '#0F172A' },

  resetFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  resetCancelBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetCancelBtnText: { color: '#334155', fontSize: 14, fontWeight: '600' },
  resetSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetSubmitBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  mobileUserCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
    elevation: 1,
  },
  mobileCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileCardMeta: {
    gap: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  mobileMetaText: {
    fontSize: 12,
    color: '#475569',
  },
  mobileCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
});

export default UserManagement;
