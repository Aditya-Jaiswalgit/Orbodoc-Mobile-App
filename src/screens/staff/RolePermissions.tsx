// src/screens/staff/RolePermissions.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import { ShieldCheck, Check, RefreshCw, Plus, Pencil, ChevronDown, X, Shield } from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import {
  fetchSystemObjectsApi,
  fetchUserRolesApi,
  fetchRolePermissionsApi,
  createRolePermissionApi,
  updateRolePermissionApi,
  createUserRoleApi,
  updateUserRoleApi,
  fetchPlanObjectIds,
  SystemObject,
  UserRoleItem,
  RolePermissionItem,
} from '../../api/roleManagementApi';
import { useRemoteData } from '../../hooks/useRemoteData';
import { useAuthContext } from '../../context/AuthContext';
import { apiFetch } from '../../api/apiConfig';
import { normalizeRoleName, permissionEnabled } from '../../utils/rolePermissions';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { extractArrayData, fetchAllUsersApi } from '../../api/userManagementApi';
import { buildRoleCatalog, buildPermissionRoleOptions, getManageableRoles } from '../../utils/roleManagement';

interface RolePermissionsProps {
  onOpenDrawer?: () => void;
  onNavigateScreen?: (screen: string) => void;
}

export interface ExtendedRoleItem extends UserRoleItem {
  type?: 'System' | 'Custom';
  sourceRoleName?: string;
  user_count?: number;
  description?: string;
}

function formatRoleTitle(value: string): string {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function RolePermissions({ onOpenDrawer, onNavigateScreen }: RolePermissionsProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { token, user, role: currentRole, activeClinicId, assignedClinics = [], isMultiPlan, refreshPermissions, permissionsMap = {} } = useAuthContext();
  const canView = canUseStaffScreen(currentRole, permissionsMap, 'role_permissions');
  const canAddRole = canView && canUseStaffScreen(currentRole, permissionsMap, 'role_permissions', 'add');
  const canEditRole = canView && canUseStaffScreen(currentRole, permissionsMap, 'role_permissions', 'edit');
  const normalizedRole = normalizeRoleName(currentRole);
  const canChooseClinic = normalizedRole === 'super_admin' || (normalizedRole === 'clinic_admin' && isMultiPlan);
  const [managedClinicId, setManagedClinicId] = useState<number | null>(activeClinicId);
  const [showClinicDropdown, setShowClinicDropdown] = useState(false);
  useEffect(() => { setManagedClinicId(activeClinicId); }, [activeClinicId]);
  const clinics = useRemoteData([token, user?.id, 'role-clinics'].join(':'), async () => {
    const response = await apiFetch<any>('/clinics/my-clinics');
    if (!response.success) throw new Error(response.message);
    return extractArrayData(response).map(c => ({ id: Number(c.id ?? c.clinic_id), name: c.name ?? c.clinic_name }));
  }, Boolean(token && canView && canChooseClinic));
  const clinicOptions = canChooseClinic ? clinics.data ?? assignedClinics : assignedClinics;
  useEffect(() => {
    if (canChooseClinic && !managedClinicId && clinicOptions.length) setManagedClinicId(clinicOptions[0].id);
  }, [managedClinicId, clinicOptions, canChooseClinic]);

  const [activeTab, setActiveTab] = useState<'roles' | 'permissions'>('roles');
  const [selectedRole, setSelectedRole] = useState<string | number>('');
  const [showRoleDropdown, setShowRoleDropdown] = useState<boolean>(false);

  const [saving, setSaving] = useState<boolean>(false);

  // Modal States
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState<boolean>(false);
  const [editingRole, setEditingRole] = useState<ExtendedRoleItem | null>(null);
  const [roleFormName, setRoleFormName] = useState<string>('');
  const [roleFormError, setRoleFormError] = useState('');
  const [roleFormSaving, setRoleFormSaving] = useState<boolean>(false);
  const [customRoleSetupId, setCustomRoleSetupId] = useState<string>('');

  const scope = [token, activeClinicId, managedClinicId, user?.id, normalizedRole, canView].join(':');
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const busyRef = useRef(false);
  const editAccessRef = useRef(canEditRole);
  editAccessRef.current = canEditRole;
  const [drafts, setDrafts] = useState<Record<string, RolePermissionItem>>({});
  const resource = useRemoteData(scope + ':role-management', async () => {
    if (!managedClinicId) throw new Error('Select a clinic');
    const [rolesRes, objectsRes, permsRes, planObjectIds] = await Promise.all([
      fetchUserRolesApi(managedClinicId), fetchSystemObjectsApi(), fetchRolePermissionsApi(managedClinicId), fetchPlanObjectIds(managedClinicId),
    ]);
    if (!rolesRes.success || !objectsRes.success || !permsRes.success) throw new Error('Unable to load permissions');
    const roleCatalog = buildRoleCatalog(rolesRes.data ?? []);
    const roles: ExtendedRoleItem[] = getManageableRoles(roleCatalog, currentRole).map(r => ({
      ...r, sourceRoleName: r.role_name, role_name: formatRoleTitle(r.role_name),
      type: permissionEnabled(r.is_system) ? 'System' : 'Custom',
      user_count: r.user_count ?? r.users_count,
    }));
    const objectCatalog = new Map<string, any>();
    for (const object of [...extractArrayData(objectsRes), ...(permsRes.data || [])]) {
      const id = String(object.sys_obj_id ?? object.id);
      if (!objectCatalog.has(id)) objectCatalog.set(id, object);
    }
    const objects: (SystemObject & { subtext?: string })[] = [...objectCatalog.values()]
      .filter(o => planObjectIds.has(String(o.sys_obj_id ?? o.id))).map(o => ({
      id: o.sys_obj_id ?? o.id, name: o.display_name || o.system_object_name || o.object_name || o.name,
      code: o.module || o.object_name, subtext: o.module || o.object_name,
    }));
    return { roles, allRoles: roleCatalog, objects, permissions: (permsRes.data || []).filter(p => p.clinic_id == null || String(p.clinic_id) === String(managedClinicId)), refreshed: new Date().toLocaleString() };
  }, Boolean(token && canView && managedClinicId));
  const roles = useMemo(() => resource.data?.roles ?? [], [resource.data]);
  const counts = useRemoteData(scope + ':role-counts:' + roles.map(r => r.id).join(','), async () => {
    const entries = await Promise.all(roles.map(async r => {
      try {
        const response = await fetchAllUsersApi({ clinic_id: managedClinicId!, role_id: Number(r.id), page: 1, limit: 1, is_active: 'all' });
        if (!response.success || !Number.isFinite(Number(response.data?.total))) throw new Error('Count unavailable');
        return [String(r.id), Number(response.data!.total)] as const;
      } catch { return [String(r.id), null] as const; }
    }));
    return Object.fromEntries(entries);
  }, Boolean(token && canView && managedClinicId && roles.length && activeTab === 'roles'));
  const systemObjects = resource.data?.objects ?? [];
  const permissionsMatrix = resource.data?.permissions ?? [];
  const permissionRoles = useMemo(() => buildPermissionRoleOptions(
    resource.data?.allRoles ?? [], currentRole, resource.data?.permissions ?? [], customRoleSetupId,
  ).map(row => ({ ...row, role_name: formatRoleTitle(row.role_name) })), [resource.data, currentRole, customRoleSetupId]);
  const loading = resource.loading;
  const lastRefreshed = resource.error ? 'Unable to load. Please refresh.' : resource.data?.refreshed || 'Loading...';
  const loadRoleDataFromApi = async () => { await Promise.allSettled([clinics.refresh(), resource.refresh(), counts.refresh(), refreshPermissions?.()]); };
  useEffect(() => {
    scopeRef.current = scope;
    setDrafts({}); setSelectedRole(''); setIsAddRoleModalOpen(false); setSaving(false);
    setRoleFormSaving(false); setEditingRole(null); setShowRoleDropdown(false); setCustomRoleSetupId('');
    return () => { scopeRef.current = ''; };
  }, [scope]);
  useEffect(() => {
    if (resource.error) showErrorToast('Unable to load roles', 'Please use Refresh to retry.');
  }, [resource.error]);
  useEffect(() => {
    if (!loading && !permissionRoles.some(r => String(r.id) === String(selectedRole))) setSelectedRole(permissionRoles[0]?.id ?? '');
  }, [permissionRoles, selectedRole, loading]);
  const permissionKey = (objectId: string | number) => selectedRole + ':' + objectId;
  const permissionRow = (objectId: string | number) => drafts[permissionKey(objectId)] || permissionsMatrix.find(p =>
    String(p.role_id) === String(selectedRole) && String(p.sys_obj_id) === String(objectId));
  const fields = { create: 'can_add', read: 'can_view', update: 'can_edit', delete: 'can_delete', execute: 'can_execute' } as const;
  const getPermission = (objectId: string | number, key: keyof typeof fields) => Number(permissionRow(objectId)?.[fields[key]]) === 1;
  const togglePermission = (objectId: string | number, key: keyof typeof fields) => {
    if (!canEditRole || saving || loading || resource.error || !permissionRoles.some(r => String(r.id) === String(selectedRole))) return;
    const row = permissionRow(objectId) || {
      role_id: selectedRole, sys_obj_id: objectId, clinic_id: managedClinicId!,
      can_add: 0, can_view: 0, can_edit: 0, can_delete: 0, can_execute: 0,
    };
    setDrafts(previous => ({ ...previous, [permissionKey(objectId)]: { ...row, [fields[key]]: getPermission(objectId, key) ? 0 : 1 } }));
  };
  const handleSavePermissions = async () => {
    if (!canEditRole || busyRef.current || loading || resource.error || !managedClinicId || !permissionRoles.some(r => String(r.id) === String(selectedRole))) return;
    const entries: [string, RolePermissionItem][] = systemObjects.flatMap(object => {
      const key = permissionKey(object.id);
      const row = drafts[key];
      if (row) return [[key, row]];
      if (String(selectedRole) === customRoleSetupId && !permissionRow(object.id)) return [[key, {
        role_id: selectedRole, sys_obj_id: object.id, clinic_id: managedClinicId,
        can_view: 0, can_add: 0, can_edit: 0, can_delete: 0, can_execute: 0,
      }]];
      return [];
    });
    if (!entries.length) { showSuccessToast('Permissions', 'No unsaved changes.'); return; }
    busyRef.current = true; setSaving(true);
    try {
      for (const [key, row] of entries) {
        if (scopeRef.current !== scope || !editAccessRef.current) return;
        const flags = { can_view: Number(row.can_view), can_add: Number(row.can_add),
          can_edit: Number(row.can_edit), can_delete: Number(row.can_delete), can_execute: Number(row.can_execute || 0) };
        const existing = permissionsMatrix.find(p => String(p.role_id) === String(row.role_id) && String(p.sys_obj_id) === String(row.sys_obj_id));
        const id = existing?.id ?? row.id;
        const result = id ? await updateRolePermissionApi(id, flags)
          : await createRolePermissionApi({ ...flags, role_id: row.role_id, sys_obj_id: row.sys_obj_id, clinic_id: managedClinicId, user_id: user?.id });
        if (!result.success) throw new Error(result.message);
        if (scopeRef.current !== scope) return;
        setDrafts(previous => { const next = { ...previous }; delete next[key]; return next; });
      }
      showSuccessToast('Matrix Saved', 'Role permissions saved successfully.');
      setCustomRoleSetupId('');
    } catch (error) {
      if (scopeRef.current === scope) showErrorToast('Unable to save', error instanceof Error ? error.message : 'Please retry. Unsaved changes are kept.');
    } finally {
      if (scopeRef.current === scope) {
        await Promise.allSettled([resource.refresh(), refreshPermissions?.()]);
        if (scopeRef.current === scope) setSaving(false);
      }
      busyRef.current = false;
    }
  };

  const handleOpenAddRole = () => {
    if (!canAddRole || busyRef.current) return;
    setEditingRole(null);
    setRoleFormName(''); setRoleFormError('');
    setIsAddRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: ExtendedRoleItem) => {
    if (!canEditRole || busyRef.current || !roles.some(r => String(r.id) === String(role.id))) return;
    setEditingRole(role); setRoleFormError('');
    setRoleFormName(role.sourceRoleName ?? role.role_name);
    setIsAddRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (editingRole ? !canEditRole || !roles.some(r => String(r.id) === String(editingRole.id)) : !canAddRole) return;
    if (busyRef.current || !managedClinicId || loading || resource.error) return;
    if (!roleFormName.trim()) { setRoleFormError('Role name is required'); showErrorToast('Validation Error', 'Please enter a role name.'); return; }
    if (resource.data?.allRoles.some(r => normalizeRoleName(r.role_name || r.name || '') === normalizeRoleName(roleFormName) && String(r.role_id ?? r.id) !== String(editingRole?.id))) {
      setRoleFormError('Role already exists.'); showErrorToast('Validation Error', 'Role already exists.'); return;
    }
    busyRef.current = true; setRoleFormSaving(true); setRoleFormError('');
    try {
      const result = editingRole ? await updateUserRoleApi(editingRole.id, roleFormName.trim())
        : await createUserRoleApi({ role_name: roleFormName.trim(), clinic_id: managedClinicId });
      if (scopeRef.current !== scope) return;
      if (!result.success) throw new Error(result.message);
      setIsAddRoleModalOpen(false);
      showSuccessToast('Role Saved', 'Role saved successfully.');
      await resource.refresh();
      if (scopeRef.current === scope && !editingRole) {
        const created = result.data as any;
        const id = created?.role_id ?? created?.id;
        if (id != null) {
          setSelectedRole(id); setCustomRoleSetupId(String(id)); setActiveTab('permissions');
        }
      }
    } catch (error) {
      if (scopeRef.current === scope) {
        const message = error instanceof Error ? error.message : 'Please retry.';
        setRoleFormError(message); showErrorToast('Unable to save role', message);
      }
    } finally { busyRef.current = false; if (scopeRef.current === scope) setRoleFormSaving(false); }
  };

  const selectedRoleObject = permissionRoles.find((r) => String(r.id) === String(selectedRole));

  if (!canView) return <View style={styles.container}><Text>You do not have permission to view roles and permissions.</Text></View>;

  return (
    <View style={styles.container}>
      {onOpenDrawer && (
        <StaffHeader
          onOpenDrawer={onOpenDrawer}
          title="Roles & Permissions"
          onNavigate={(path) => {
            if (onNavigateScreen) {
              const cleanPath = path.replace('/', '').replace('-', '_');
              onNavigateScreen(cleanPath);
            }
          }}
        />
      )}

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        decelerationRate="normal">
        {/* ── TOP HEADER SECTION ────────────────────────────────────────────── */}
        <View style={[styles.topBannerHeader, isMobile && styles.topBannerHeaderMobile]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Roles & Permissions</Text>
            <Text style={styles.headerSubtitle}>
              Manage roles, permissions, and access control configuration.
            </Text>
          </View>
          <View style={[styles.refreshContainer, isMobile && { marginTop: 10 }]}>
            <TouchableOpacity style={styles.refreshDataButton} onPress={loadRoleDataFromApi} disabled={saving || roleFormSaving || loading}>
              <RefreshCw color="#334155" size={14} style={{ marginRight: 6 }} />
              <Text style={styles.refreshButtonText}>Refresh Data</Text>
            </TouchableOpacity>
            <Text style={styles.lastRefreshedText}>Last refreshed: {lastRefreshed}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 12 }}>
          <TouchableOpacity accessibilityLabel="Select permission clinic" style={styles.roleDropdownSelector}
            disabled={!canChooseClinic || clinics.loading || saving || roleFormSaving || !clinicOptions.length}
            onPress={() => { if (canChooseClinic && !busyRef.current) setShowClinicDropdown(value => !value); }}>
            <Text>{clinicOptions.find(c => Number(c.id) === managedClinicId)?.name || (managedClinicId ? `Clinic ${managedClinicId}` : 'Select clinic')}</Text>
            <ChevronDown size={18} color="#64748B" />
          </TouchableOpacity>
          {canChooseClinic && showClinicDropdown && clinicOptions.map(clinic => (
            <TouchableOpacity key={clinic.id} accessibilityLabel={`Manage clinic ${clinic.name}`}
              style={styles.dropdownMenuItem} onPress={() => { setManagedClinicId(Number(clinic.id)); setShowClinicDropdown(false); }}>
              <Text>{clinic.name}</Text>
            </TouchableOpacity>
          ))}
          {!!clinics.error && <TouchableOpacity onPress={clinics.refresh}><Text>Unable to load clinics. Tap to retry.</Text></TouchableOpacity>}
          {!managedClinicId && <Text>Select a clinic to manage roles and permissions.</Text>}
          {!!resource.error && <Text accessibilityRole="alert">Unable to load roles and permissions. Use Refresh Data to retry.</Text>}
        </View>

        {/* ── MAIN CARD CONTAINER WITH TEAL BORDER ────────────────────────── */}
        <View style={styles.tealBorderCard}>
          {/* Inner Card Header */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.innerCardTitle}>Roles & Permissions</Text>
            <Text style={styles.innerCardSubtitle}>
              Manage role definitions, permission settings, and access controls.
            </Text>
          </View>

          {/* ── SEGMENTED TAB BAR ───────────────────────────────────────── */}
          <View style={styles.segmentedTabBar}>
            <TouchableOpacity
              style={[styles.segmentTab, activeTab === 'roles' && styles.segmentTabActive]}
              onPress={() => setActiveTab('roles')}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentTabText, activeTab === 'roles' && styles.segmentTabTextActive]}>
                Roles
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentTab, activeTab === 'permissions' && styles.segmentTabActive]}
              onPress={() => setActiveTab('permissions')}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentTabText, activeTab === 'permissions' && styles.segmentTabTextActive]}>
                Permissions
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── TAB 1: ROLES ────────────────────────────────────────────── */}
          {activeTab === 'roles' && (
            <View>
              {/* Roles Header */}
              <View style={styles.rolesHeaderRow}>
                <Text style={styles.sectionTitleText}>User Role List</Text>
                <TouchableOpacity style={styles.addRoleButton} onPress={handleOpenAddRole} disabled={!canAddRole || loading || saving || !!resource.error || !managedClinicId}>
                  <Plus color="#FFFFFF" size={16} style={{ marginRight: 4 }} />
                  <Text style={styles.addRoleButtonText}>Add Role</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#0D9488" />
                  <Text style={styles.loadingText}>Loading role list...</Text>
                </View>
              ) : (
                <View style={[styles.rolesGrid, isMobile && styles.rolesGridMobile]}>
                  {roles.map((role) => {
                    const isCustom = role.type === 'Custom';
                    return (
                      <View
                        key={String(role.id)}
                        style={[styles.roleCard, isMobile ? styles.roleCardMobile : styles.roleCardDesktop]}
                      >
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.roleCardName}>{role.role_name}</Text>
                          <Text style={styles.roleCardId}>Role ID: {role.id}</Text>
                          {!!role.description && (
                            <Text style={styles.roleCardDesc} numberOfLines={2}>
                              {role.description}
                            </Text>
                          )}
                        </View>

                        <View style={styles.roleCardRightCol}>
                          <View
                            style={[
                              styles.badgeTag,
                              isCustom ? styles.badgeCustom : styles.badgeSystem,
                            ]}
                          >
                            <Text
                              style={[
                                styles.badgeTagText,
                                isCustom ? styles.badgeCustomText : styles.badgeSystemText,
                              ]}
                            >
                              {isCustom ? 'Custom' : 'System'}
                            </Text>
                          </View>

                          <View style={styles.usersCountPill}>
                            <Text style={styles.usersCountText}>{counts.loading ? 'Loading users…' : counts.data?.[String(role.id)] != null ? `${counts.data[String(role.id)]} users` : 'User count unavailable'}</Text>
                          </View>

                          <TouchableOpacity
                            style={styles.editIconTouch}
                            accessibilityLabel={`Edit role ${role.role_name}`}
                            disabled={!canEditRole || saving || roleFormSaving}
                            onPress={() => handleOpenEditRole(role)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Pencil color="#475569" size={16} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* ── TAB 2: PERMISSIONS ──────────────────────────────────────── */}
          {activeTab === 'permissions' && (
            <View>
              <Text style={styles.sectionTitleText}>Role Permissions Matrix</Text>

              {/* Dropdown Selector Bar & Save Button */}
              <View style={[styles.permControlsBar, isMobile && styles.permControlsBarMobile]}>
                {/* Role Selector Trigger Dropdown */}
                <View style={styles.rolePickerContainer}>
                  <TouchableOpacity
                    style={styles.roleDropdownSelector}
                    accessibilityLabel="Select permission role"
                    accessibilityState={{ expanded: showRoleDropdown }}
                    disabled={saving || loading || !!resource.error}
                    onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.roleDropdownSelectorText}>
                      {selectedRoleObject ? selectedRoleObject.role_name : 'Select role'}
                    </Text>
                    <ChevronDown color="#64748B" size={18} />
                  </TouchableOpacity>

                  {/* Keep the list inside its parent's native touch bounds on Android. */}
                  {showRoleDropdown && (
                    <View style={styles.dropdownMenuCard}>
                      <ScrollView
                        testID="permission-role-options"
                        style={styles.roleOptionsScroll}
                        nestedScrollEnabled
                        showsVerticalScrollIndicator
                        persistentScrollbar
                        keyboardShouldPersistTaps="handled">
                        {permissionRoles.map((r) => {
                          const isSelected = String(r.id) === String(selectedRole);
                          return (
                            <TouchableOpacity
                              key={String(r.id)}
                              accessibilityLabel={`Manage role ${r.role_name}`}
                              accessibilityRole="button"
                              accessibilityState={{ selected: isSelected }}
                              style={[
                                styles.dropdownMenuItem,
                                isSelected && styles.dropdownMenuItemActive,
                              ]}
                              onPress={() => {
                                setSelectedRole(r.id);
                                setShowRoleDropdown(false);
                              }}
                            >
                              {isSelected ? (
                                <Check color="#0D9488" size={16} style={{ marginRight: 8 }} />
                              ) : (
                                <View style={{ width: 24 }} />
                              )}
                              <Text
                                style={[
                                  styles.dropdownMenuText,
                                  isSelected && styles.dropdownMenuTextActive,
                                ]}
                              >
                                {r.role_name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Save Changes Button */}
                <TouchableOpacity
                  style={styles.saveChangesButton}
                  onPress={handleSavePermissions}
                  disabled={!canEditRole || saving || loading || !!resource.error || !selectedRole || !systemObjects.length}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Shield color="#FFFFFF" size={16} style={{ marginRight: 6 }} />
                  )}
                  <Text style={styles.saveChangesButtonText}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Text>
                </TouchableOpacity>
              </View>
              {String(selectedRole) === customRoleSetupId && <Text>Choose permissions for the new role, then save. Unselected permissions stay off.</Text>}
              {!loading && !resource.error && !systemObjects.length && <Text>No modules are enabled in this clinic's plan.</Text>}

              {/* MATRIX TABLE / LIST VIEW */}
              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#0D9488" />
                  <Text style={styles.loadingText}>Loading permissions matrix...</Text>
                </View>
              ) : isMobile ? (
                /* MOBILE VIEW: Per Object Permissions Card */
                <View style={{ marginTop: 12 }}>
                  {systemObjects.map((obj) => (
                    <View key={String(obj.id)} style={styles.mobilePermCard}>
                      <View style={{ marginBottom: 10 }}>
                        <Text style={styles.matrixObjName}>{obj.name}</Text>
                        {!!obj.subtext && <Text style={styles.matrixObjSub}>{obj.subtext}</Text>}
                      </View>

                      <View style={styles.mobileSwitchGrid}>
                        {(['create', 'read', 'update', 'delete', 'execute'] as const).map((key) => {
                          const val = getPermission(obj.id, key);
                          const label = key.charAt(0).toUpperCase() + key.slice(1);
                          return (
                            <View key={key} style={styles.mobileSwitchBox}>
                              <Text style={styles.mobileSwitchLabel}>{label}</Text>
                              <Switch
                                accessibilityLabel={`${obj.name} ${key}`}
                                disabled={!canEditRole || saving || loading || Boolean(resource.error) || !selectedRole}
                                value={val}
                                onValueChange={() => togglePermission(obj.id, key)}
                                trackColor={{ false: '#E2E8F0', true: '#99F6E4' }}
                                thumbColor={val ? '#0D9488' : '#F1F5F9'}
                              />
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                /* DESKTOP / WIDE SCREEN VIEW: Full Matrix Table */
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  style={{ marginTop: 16 }}
                  nestedScrollEnabled={true}
                  scrollEventThrottle={16}
                  decelerationRate="normal">
                  <View style={{ minWidth: 700 }}>
                    {/* Header Row */}
                    <View style={styles.matrixHeaderRow}>
                      <Text style={[styles.matrixHeaderCell, { flex: 2.5 }]}>System Object</Text>
                      <Text style={styles.matrixHeaderCellCenter}>Create</Text>
                      <Text style={styles.matrixHeaderCellCenter}>Read</Text>
                      <Text style={styles.matrixHeaderCellCenter}>Update</Text>
                      <Text style={styles.matrixHeaderCellCenter}>Delete</Text>
                      <Text style={styles.matrixHeaderCellCenter}>Execute</Text>
                    </View>

                    {/* Matrix Rows */}
                    {systemObjects.map((obj) => (
                      <View key={String(obj.id)} style={styles.matrixDataRow}>
                        <View style={{ flex: 2.5, justifyContent: 'center' }}>
                          <Text style={styles.matrixObjName}>{obj.name}</Text>
                          {!!obj.subtext && <Text style={styles.matrixObjSub}>{obj.subtext}</Text>}
                        </View>

                        {(['create', 'read', 'update', 'delete', 'execute'] as const).map((key) => {
                          const val = getPermission(obj.id, key);
                          return (
                            <View key={key} style={styles.matrixSwitchCell}>
                              <Switch
                                accessibilityLabel={`${obj.name} ${key}`}
                                disabled={!canEditRole || saving || loading || Boolean(resource.error) || !selectedRole}
                                value={val}
                                onValueChange={() => togglePermission(obj.id, key)}
                                trackColor={{ false: '#E2E8F0', true: '#99F6E4' }}
                                thumbColor={val ? '#0D9488' : '#F1F5F9'}
                              />
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── ADD / EDIT ROLE MODAL (EXACT MATCH TO UPLOADED SCREENSHOTS) ───── */}
      <Modal visible={isAddRoleModalOpen} transparent animationType="fade" onRequestClose={() => { if (!roleFormSaving) setIsAddRoleModalOpen(false); }}>
        <TouchableWithoutFeedback onPress={() => { if (!roleFormSaving) setIsAddRoleModalOpen(false); }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.roleModalCard}>
                {/* Header Row */}
                <View style={styles.roleModalHeader}>
                  <View style={styles.roleIconBox}>
                    <ShieldCheck color="#FFFFFF" size={24} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.roleModalTitle}>
                      {editingRole ? 'Edit Role' : 'Create Role'}
                    </Text>
                    <Text style={styles.roleModalSubtitle}>
                      {editingRole ? 'Update the role name.' : 'Add a new user role.'}
                    </Text>
                  </View>
                  <TouchableOpacity disabled={roleFormSaving} onPress={() => setIsAddRoleModalOpen(false)} style={{ padding: 4 }}>
                    <X color="#64748B" size={18} />
                  </TouchableOpacity>
                </View>

                {/* Form Body */}
                <View style={styles.roleModalBody}>
                  <View style={styles.roleInputContainerActive}>
                    <TextInput
                      style={styles.roleInputText}
                      placeholder="Role name"
                      accessibilityLabel="Role name"
                      editable={!roleFormSaving}
                      placeholderTextColor="#94A3B8"
                      value={roleFormName}
                      onChangeText={value => { setRoleFormName(value); setRoleFormError(''); }}
                      autoFocus
                    />
                  </View>
                  {!!roleFormError && <Text accessibilityRole="alert" style={styles.roleFormError}>{roleFormError}</Text>}
                </View>

                {/* Modal Footer Actions */}
                <View style={styles.roleModalFooter}>
                  <TouchableOpacity
                    style={styles.roleCancelBtn}
                    disabled={roleFormSaving}
                    onPress={() => setIsAddRoleModalOpen(false)}
                  >
                    <Text style={styles.roleCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.roleSaveBtn}
                    onPress={handleSaveRole}
                    disabled={roleFormSaving || (editingRole ? !canEditRole : !canAddRole) || loading || !!resource.error}
                  >
                    {roleFormSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.roleSaveBtnText}>Save Role</Text>
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
}

const styles = StyleSheet.create({
  roleFormError: { color: '#B91C1C', fontSize: 12, marginTop: 6 },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  // Top Banner
  topBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  topBannerHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  headerTitle: { color: '#0F172A', fontSize: 22, fontWeight: '700' },
  headerSubtitle: { color: '#64748B', fontSize: 13, marginTop: 4 },

  refreshContainer: { alignItems: 'flex-end' },
  refreshDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  refreshButtonText: { color: '#334155', fontSize: 13, fontWeight: '600' },
  lastRefreshedText: { color: '#94A3B8', fontSize: 11, marginTop: 4 },

  // Main Card with Teal Border
  tealBorderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#0D9488',
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  innerCardTitle: { color: '#0F172A', fontSize: 18, fontWeight: '700' },
  innerCardSubtitle: { color: '#64748B', fontSize: 12, marginTop: 2 },

  // Segmented Tab Bar
  segmentedTabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentTabText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
  segmentTabTextActive: { color: '#0F172A', fontWeight: '700' },

  // Roles Tab Layout
  rolesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleText: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
  addRoleButton: {
    backgroundColor: '#0D9488',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addRoleButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  rolesGridMobile: {
    flexDirection: 'column',
  },
  roleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  roleCardDesktop: {
    width: '49%',
  },
  roleCardMobile: {
    width: '100%',
  },
  roleCardName: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
  roleCardId: { color: '#64748B', fontSize: 12, marginTop: 2 },
  roleCardDesc: { color: '#94A3B8', fontSize: 11, marginTop: 4 },

  roleCardRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeSystem: { backgroundColor: '#DCFCE7' },
  badgeCustom: { backgroundColor: '#E0F2FE' },
  badgeTagText: { fontSize: 11, fontWeight: '700' },
  badgeSystemText: { color: '#15803D' },
  badgeCustomText: { color: '#0369A1' },

  usersCountPill: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  usersCountText: { color: '#334155', fontSize: 11, fontWeight: '600' },

  editIconTouch: {
    padding: 6,
    borderRadius: 6,
  },

  // Permissions Tab Controls
  permControlsBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 12,
    marginBottom: 16,
    zIndex: 10,
  },
  permControlsBarMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  rolePickerContainer: { flexShrink: 1, minWidth: 160 },
  roleOptionsScroll: { maxHeight: 280, flexShrink: 1 },
  roleDropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    minWidth: 160,
  },
  roleDropdownSelectorText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },

  // In-flow layout lets the entire list receive touches, not just the trigger.
  dropdownMenuCard: {
    marginTop: 6,
    maxHeight: 292,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    paddingVertical: 6,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownMenuItemActive: {
    backgroundColor: '#E6F4F1',
  },
  dropdownMenuText: { color: '#334155', fontSize: 14, flexShrink: 1 },
  dropdownMenuTextActive: { color: '#0D9488', fontWeight: '700' },

  saveChangesButton: {
    backgroundColor: '#64C2B4', // Soft teal button color from screenshot 2 & 3
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveChangesButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Matrix Desktop View
  matrixHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
  },
  matrixHeaderCell: { color: '#64748B', fontSize: 12, fontWeight: '700', paddingHorizontal: 8 },
  matrixHeaderCellCenter: {
    flex: 1,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  matrixDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 12,
    alignItems: 'center',
  },
  matrixObjName: { color: '#0F172A', fontSize: 14, fontWeight: '700' },
  matrixObjSub: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  matrixSwitchCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Mobile Perm Card
  mobilePermCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  mobileSwitchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  mobileSwitchBox: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  mobileSwitchLabel: { color: '#64748B', fontSize: 11, fontWeight: '600', marginBottom: 4 },

  loadingBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#64748B', fontSize: 13 },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // Role Modal Styling (Exact Match to Screenshots)
  roleModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  roleModalHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  roleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleModalTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  roleModalSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },

  roleModalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  roleInputContainerActive: {
    borderWidth: 1.5,
    borderColor: '#0D9488',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
  },
  roleInputText: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },

  roleModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  roleCancelBtn: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
  },
  roleCancelBtnText: { color: '#334155', fontSize: 14, fontWeight: '600' },
  roleSaveBtn: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
  },
  roleSaveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});

export default RolePermissions;
