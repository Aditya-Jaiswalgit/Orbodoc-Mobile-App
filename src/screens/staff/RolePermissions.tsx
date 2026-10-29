import { colors, radii, spacing, typography } from '../../theme/tokens';
// src/screens/staff/RolePermissions.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppModal } from '../../components/common/AppModal';
import { View, Text, TouchableOpacity, Switch, StyleSheet, ActivityIndicator, BackHandler, useWindowDimensions, TextInput, TouchableWithoutFeedback } from 'react-native';
import { LiquidBorderScrollView } from '../../components/common/LiquidBorderScrollView';
import { ShieldCheck, Check, Plus, Pencil, ChevronDown, X, Shield } from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { LiquidBorderSurface } from '../../components/common/LiquidBorderSurface';
import { useLiquidBorderScrollHandlers } from '../../components/common/LiquidBorderFocusContext';
import { RefreshButton } from '../../components/common/RefreshButton';
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
import { normalizeRoleName, permissionEnabled } from '../../utils/rolePermissions';
import { canUseStaffScreen } from '../../navigation/staffAccess';
import { fetchAllUsersApi } from '../../api/userManagementApi';
import { extractArrayData } from '../../utils/apiData';
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

const EMPTY_ROLE_PERMISSIONS: RolePermissionItem[] = [];

function formatRoleTitle(value: string): string {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function RolePermissions({ onOpenDrawer, onNavigateScreen }: RolePermissionsProps) {
  const borderScrollHandlers = useLiquidBorderScrollHandlers();
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;

  const { token, user, role: currentRole, activeClinicId, refreshPermissions, permissionsMap = {} } = useAuthContext();
  const canView = canUseStaffScreen(currentRole, permissionsMap, 'role_permissions');
  const canAddRole = canView && canUseStaffScreen(currentRole, permissionsMap, 'role_permissions', 'add');
  const canEditRole = canView && canUseStaffScreen(currentRole, permissionsMap, 'role_permissions', 'edit');
  const normalizedRole = normalizeRoleName(currentRole);
  const managedClinicId = activeClinicId;

  const [activeTab, setActiveTab] = useState<'roles' | 'permissions'>('roles');
  const [selectedRole, setSelectedRole] = useState<string | number>('');
  const [showRoleDropdown, setShowRoleDropdown] = useState<boolean>(false);
  const screenRef = useRef<React.ComponentRef<typeof View>>(null);
  const rolePickerRef = useRef<React.ComponentRef<typeof View>>(null);
  const [roleMenuPosition, setRoleMenuPosition] = useState<{
    left: number; top?: number; bottom?: number; width: number; maxHeight: number;
  } | null>(null);
  const roleMenuRequest = useRef(0);
  const closeRoleDropdown = () => {
    roleMenuRequest.current += 1;
    setShowRoleDropdown(false);
  };
  useEffect(() => {
    roleMenuRequest.current += 1;
    setShowRoleDropdown(false);
  }, [width, height]);
  useEffect(() => {
    if (!showRoleDropdown) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      roleMenuRequest.current += 1;
      setShowRoleDropdown(false);
      return true;
    });
    return () => subscription.remove();
  }, [showRoleDropdown]);

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
    return { roles, allRoles: roleCatalog, objects, permissions: (permsRes.data || []).filter(p => p.clinic_id == null || String(p.clinic_id) === String(managedClinicId)) };
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
  const permissionsMatrix = resource.data?.permissions ?? EMPTY_ROLE_PERMISSIONS;
  const permissionRoles = useMemo(() => buildPermissionRoleOptions(
    resource.data?.allRoles ?? [], currentRole, resource.data?.permissions ?? [], customRoleSetupId,
  ).map(row => ({ ...row, role_name: formatRoleTitle(row.role_name) })), [resource.data, currentRole, customRoleSetupId]);
  const loading = resource.loading;
  const loadRoleDataFromApi = async () => { await Promise.allSettled([resource.refresh(), counts.refresh(), refreshPermissions?.()]); };
  useEffect(() => {
    scopeRef.current = scope;
    roleMenuRequest.current += 1;
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
  const permissionsByRoleObject = useMemo(() => {
    const index = new Map<string, RolePermissionItem>();
    permissionsMatrix.forEach(permission => {
      const key = `${permission.role_id}:${permission.sys_obj_id}`;
      // Keep the same first-match behavior as Array.find when legacy data has duplicates.
      if (!index.has(key)) index.set(key, permission);
    });
    return index;
  }, [permissionsMatrix]);
  const hasUnsavedPermissionChanges = Boolean(
    selectedRole && systemObjects.length && (
      String(selectedRole) === customRoleSetupId ||
      Object.keys(drafts).some(key => key.startsWith(`${selectedRole}:`))
    ),
  );
  const canSavePermissionChanges = Boolean(
    canEditRole && !saving && !loading && !resource.error && selectedRole &&
    systemObjects.length && hasUnsavedPermissionChanges,
  );
  const permissionRow = (objectId: string | number) =>
    drafts[permissionKey(objectId)] ||
    permissionsByRoleObject.get(`${selectedRole}:${objectId}`);
  const fields = { create: 'can_add', read: 'can_view', update: 'can_edit', delete: 'can_delete', execute: 'can_execute' } as const;
  const getPermission = (objectId: string | number, key: keyof typeof fields) => Number(permissionRow(objectId)?.[fields[key]]) === 1;
  const togglePermission = (objectId: string | number, key: keyof typeof fields) => {
    if (!canEditRole || saving || loading || resource.error || !permissionRoles.some(r => String(r.id) === String(selectedRole))) return;
    const row = permissionRow(objectId) || {
      role_id: selectedRole, sys_obj_id: objectId, clinic_id: managedClinicId!,
      can_add: 0, can_view: 0, can_edit: 0, can_delete: 0, can_execute: 0,
    };
    const nextRow = { ...row, [fields[key]]: getPermission(objectId, key) ? 0 : 1 };
    const savedRow = permissionsMatrix.find(p =>
      String(p.role_id) === String(selectedRole) && String(p.sys_obj_id) === String(objectId));
    const permissionFields = Object.values(fields);
    const matchesSaved = permissionFields.every(field =>
      Number(nextRow[field] || 0) === Number(savedRow?.[field] || 0));
    const draftKey = permissionKey(objectId);
    setDrafts(previous => {
      const next = { ...previous };
      if (matchesSaved) delete next[draftKey];
      else next[draftKey] = nextRow;
      return next;
    });
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
        // Older clinics can have duplicate rows. Keep all copies consistent so
        // both the matrix and the login permission map resolve the same flags.
        const existing = permissionsMatrix.filter(p => String(p.role_id) === String(row.role_id) && String(p.sys_obj_id) === String(row.sys_obj_id));
        const ids = [...new Set(existing.map(p => p.id).filter(id => id != null))];
        if (!ids.length && row.id != null) ids.push(row.id);
        if (ids.length) {
          for (const id of ids) {
            if (scopeRef.current !== scope || !editAccessRef.current) return;
            const result = await updateRolePermissionApi(id!, flags);
            if (!result.success) throw new Error(result.message);
          }
        } else {
          const result = await createRolePermissionApi({ ...flags, role_id: row.role_id, sys_obj_id: row.sys_obj_id, clinic_id: managedClinicId, user_id: user?.id });
          if (!result.success) throw new Error(result.message);
        }
        if (scopeRef.current !== scope) return;
        setDrafts(previous => { const next = { ...previous }; delete next[key]; return next; });
      }
      showSuccessToast('Role Permission Saved', 'Permissions saved successfully.');
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
  const toggleRoleDropdown = () => {
    if (showRoleDropdown) { closeRoleDropdown(); return; }
    if (saving || loading || resource.error) return;
    const request = ++roleMenuRequest.current;
    // Window measurements include the current page scroll offset. Subtract the
    // screen origin so status bars and the app header don't shift the menu.
    rolePickerRef.current?.measureInWindow((x, y) => {
      screenRef.current?.measureInWindow((screenX, screenY, screenWidth, screenHeight) => {
        if (request !== roleMenuRequest.current || scopeRef.current !== scope || screenWidth <= 16 || screenHeight <= 16) return;
        const menuWidth = Math.min(200, screenWidth - 16);
        const anchorTop = y - screenY;
        const belowTop = anchorTop + 48;
        const belowSpace = screenHeight - belowTop - 8;
        const aboveSpace = anchorTop - 6 - 8;
        const opensAbove = belowSpace < 100 && aboveSpace > belowSpace;
        setRoleMenuPosition({
          left: Math.max(8, Math.min(x - screenX, screenWidth - menuWidth - 8)),
          width: menuWidth,
          maxHeight: Math.max(0, Math.min(294, opensAbove ? aboveSpace : belowSpace)),
          ...(opensAbove ? { bottom: screenHeight - anchorTop + 6 } : { top: belowTop }),
        });
        setShowRoleDropdown(true);
      });
    });
  };

  if (!canView) return <View style={styles.container}><Text>You do not have permission to view roles and permissions.</Text></View>;

  return (
    <View ref={screenRef} collapsable={false} testID="role-permissions-screen" style={styles.container}>
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

      <LiquidBorderScrollView
        {...borderScrollHandlers}
        testID="role-permissions-page"
        style={styles.body}
        scrollEnabled={!showRoleDropdown}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        decelerationRate="normal">
        {/* ── TOP HEADER SECTION ────────────────────────────────────────────── */}
        <View style={[styles.topBannerHeader, isMobile && styles.topBannerHeaderMobile]}>
          <View style={!isMobile ? { flex: 1 } : { width: '100%' }}>
            <Text style={styles.headerTitle}>Roles & Permissions</Text>
            <Text style={styles.headerSubtitle}>
              Manage roles, permissions, and access control configuration.
            </Text>
          </View>
          <View style={[styles.refreshContainer, isMobile && styles.refreshContainerMobile]}>
            <RefreshButton
              onRefresh={loadRoleDataFromApi}
              loading={saving || roleFormSaving || loading}
              label="Refresh"
              refreshingLabel="Refreshing..."
            />
          </View>
        </View>

        {(!managedClinicId || !!resource.error) && (
          <View style={{ marginBottom: spacing.md }}>
            {!managedClinicId && (
              <Text style={{ color: colors.muted, textAlign: 'center', marginVertical: spacing.xs }}>
                Select a clinic from the header to manage roles and permissions.
              </Text>
            )}
            {!!resource.error && (
              <Text accessibilityRole="alert" style={{ color: colors.destructive, textAlign: 'center', marginVertical: spacing.xs }}>
                Unable to load roles and permissions. Use Refresh to retry.
              </Text>
            )}
          </View>
        )}

        {/* ── MAIN CARD CONTAINER WITH TEAL BORDER ────────────────────────── */}
        <LiquidBorderSurface style={styles.tealBorderCard} radius={12}>
          {/* Inner Card Header */}
          <View style={{ marginBottom: spacing.lg }}>
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
                  <Plus color={colors.surface} size={16} style={{ marginRight: spacing.xs }} />
                  <Text style={styles.addRoleButtonText}>Add Role</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading role list...</Text>
                </View>
              ) : (
                <View style={[styles.rolesGrid, isMobile && styles.rolesGridMobile]}>
                  {roles.map((role) => {
                    const isCustom = role.type === 'Custom';
                    return (
                      <LiquidBorderSurface
                        key={String(role.id)}
                        radius={8}
                        style={[styles.roleCard, isMobile ? styles.roleCardMobile : styles.roleCardDesktop]}
                      >
                        <View style={{ flex: 1, paddingRight: spacing.sm }}>
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
                            <Pencil color={colors.muted} size={16} />
                          </TouchableOpacity>
                        </View>
                      </LiquidBorderSurface>
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
                <View ref={rolePickerRef} collapsable={false} testID="permission-role-anchor" style={styles.rolePickerContainer}>
                  <TouchableOpacity
                    style={styles.roleDropdownSelector}
                    accessibilityLabel="Select permission role"
                    accessibilityState={{ expanded: showRoleDropdown }}
                    disabled={saving || loading || !!resource.error}
                    onPress={toggleRoleDropdown}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.roleDropdownSelectorText}>
                      {selectedRoleObject ? selectedRoleObject.role_name : 'Select role'}
                    </Text>
                    <ChevronDown color={colors.muted} size={18} />
                  </TouchableOpacity>
                </View>

                {/* Save Changes Button */}
                <TouchableOpacity
                  style={[styles.saveChangesButton, !canSavePermissionChanges && styles.saveChangesButtonDisabled]}
                  onPress={handleSavePermissions}
                  disabled={!canEditRole || saving || loading || !!resource.error || !selectedRole || !systemObjects.length || !hasUnsavedPermissionChanges}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <Shield color={colors.surface} size={16} style={{ marginRight: spacing.tiny }} />
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
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading permissions matrix...</Text>
                </View>
              ) : isMobile ? (
                /* MOBILE VIEW: Per Object Permissions Card */
                <View style={{ marginTop: spacing.md }}>
                  {systemObjects.map((obj) => (
                    <LiquidBorderSurface key={String(obj.id)} style={styles.mobilePermCard} radius={8}>
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
                                trackColor={{ false: colors.border, true: colors.mintBorder }}
                                thumbColor={val ? colors.primary : colors.secondary}
                              />
                            </View>
                          );
                        })}
                      </View>
                    </LiquidBorderSurface>
                  ))}
                </View>
              ) : (
                /* DESKTOP / WIDE SCREEN VIEW: Full Matrix Table */
                <LiquidBorderScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  style={{ marginTop: spacing.lg }}
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
                                trackColor={{ false: colors.border, true: colors.mintBorder }}
                                thumbColor={val ? colors.primary : colors.secondary}
                              />
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </LiquidBorderScrollView>
              )}
            </View>
          )}
        </LiquidBorderSurface>
      </LiquidBorderScrollView>

      {/* Separate from the page scroll so the overlay receives native swipe gestures. */}
      {showRoleDropdown && roleMenuPosition && (
        <View testID="permission-role-overlay" style={styles.roleMenuLayer}>
          <TouchableOpacity accessibilityLabel="Close permission role list" activeOpacity={1}
            style={StyleSheet.absoluteFill} onPress={closeRoleDropdown} />
          <View testID="permission-role-menu" style={[styles.dropdownMenuCard, roleMenuPosition]}>
            <LiquidBorderScrollView
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
                      closeRoleDropdown();
                    }}
                  >
                    {isSelected ? (
                      <Check color={colors.primary} size={16} style={{ marginRight: spacing.sm }} />
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
            </LiquidBorderScrollView>
          </View>
        </View>
      )}

      {/* ── ADD / EDIT ROLE MODAL (EXACT MATCH TO UPLOADED SCREENSHOTS) ───── */}
      <AppModal visible={isAddRoleModalOpen} transparent animationType="fade" onRequestClose={() => { if (!roleFormSaving) setIsAddRoleModalOpen(false); }}>
        <TouchableWithoutFeedback onPress={() => { if (!roleFormSaving) setIsAddRoleModalOpen(false); }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.roleModalCard}>
                {/* Header Row */}
                <View style={styles.roleModalHeader}>
                  <View style={styles.roleIconBox}>
                    <ShieldCheck color={colors.surface} size={24} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.roleModalTitle}>
                      {editingRole ? 'Edit Role' : 'Create Role'}
                    </Text>
                    <Text style={styles.roleModalSubtitle}>
                      {editingRole ? 'Update the role name.' : 'Add a new user role.'}
                    </Text>
                  </View>
                  <TouchableOpacity disabled={roleFormSaving} onPress={() => setIsAddRoleModalOpen(false)} style={{ padding: spacing.xs }}>
                    <X color={colors.muted} size={18} />
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
                      placeholderTextColor={colors.subtle}
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
                      <ActivityIndicator size="small" color={colors.surface} />
                    ) : (
                      <Text style={styles.roleSaveBtnText}>Save Role</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  roleFormError: { fontFamily: typography.family, color: colors.destructiveDark, fontSize: typography.size.sm, marginTop: spacing.tiny },
  container: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  // Top Banner
  topBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  topBannerHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  headerTitle: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.heading, fontWeight: typography.weight.bold },
  headerSubtitle: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.caption, marginTop: spacing.xs },

  refreshContainer: { alignItems: 'flex-end' },
  refreshContainerMobile: {
    width: '100%',
    alignItems: 'stretch',
    marginTop: 0,
  },
  refreshDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.md,
  },
  refreshButtonText: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.caption, fontWeight: typography.weight.semibold },
  // Main Card with Teal Border
  tealBorderCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    elevation: 2,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  innerCardTitle: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  innerCardSubtitle: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.sm, marginTop: 2 },

  // Segmented Tab Bar
  segmentedTabBar: {
    flexDirection: 'row',
    backgroundColor: colors.secondary,
    borderRadius: radii.md,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  segmentTabActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentTabText: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.body, fontWeight: typography.weight.semibold },
  segmentTabTextActive: { color: colors.text, fontWeight: typography.weight.bold },

  // Roles Tab Layout
  rolesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitleText: { fontFamily: typography.family, color: colors.text, fontSize: 15, fontWeight: typography.weight.bold },
  addRoleButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  addRoleButtonText: { fontFamily: typography.family, color: colors.surface, fontSize: typography.size.caption, fontWeight: typography.weight.semibold },

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
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  roleCardDesktop: {
    width: '49%',
  },
  roleCardMobile: {
    width: '100%',
  },
  roleCardName: { fontFamily: typography.family, color: colors.text, fontSize: 15, fontWeight: typography.weight.bold },
  roleCardId: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.sm, marginTop: 2 },
  roleCardDesc: { fontFamily: typography.family, color: colors.subtle, fontSize: typography.size.xs, marginTop: spacing.xs },

  roleCardRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badgeTag: {
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radii.lg,
  },
  badgeSystem: { backgroundColor: colors.successSoft },
  badgeCustom: { backgroundColor: '#E0F2FE' },
  badgeTagText: { fontFamily: typography.family, fontSize: typography.size.xs, fontWeight: typography.weight.bold },
  badgeSystemText: { color: '#15803D' },
  badgeCustomText: { color: '#0369A1' },

  usersCountPill: {
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radii.lg,
  },
  usersCountText: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.xs, fontWeight: typography.weight.semibold },

  editIconTouch: {
    padding: spacing.tiny,
    borderRadius: radii.sm,
  },

  // Permissions Tab Controls
  permControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    zIndex: 10,
  },
  permControlsBarMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  rolePickerContainer: { zIndex: 100 },
  roleMenuLayer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 1000 },
  roleOptionsScroll: { maxHeight: 280, flexShrink: 1 },
  roleDropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    minWidth: 160,
  },
  roleDropdownSelectorText: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.body, fontWeight: typography.weight.semibold },

  // Same floating card as before, positioned relative to the screen root.
  dropdownMenuCard: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    paddingVertical: spacing.tiny,
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
  dropdownMenuText: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.body, flexShrink: 1 },
  dropdownMenuTextActive: { color: colors.primary, fontWeight: typography.weight.bold },

  saveChangesButton: {
    backgroundColor: '#20A69A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  saveChangesButtonDisabled: { backgroundColor: '#93D4CE' },
  saveChangesButtonText: { fontFamily: typography.family, color: colors.surface, fontSize: typography.size.body, fontWeight: typography.weight.bold },

  // Matrix Desktop View
  matrixHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderRadius: radii.sm,
  },
  matrixHeaderCell: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.sm, fontWeight: typography.weight.bold, paddingHorizontal: spacing.sm },
  matrixHeaderCellCenter: {
    fontFamily: typography.family, flex: 1,
    color: colors.muted,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
  },

  matrixDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  matrixObjName: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.body, fontWeight: typography.weight.bold },
  matrixObjSub: { fontFamily: typography.family, color: colors.subtle, fontSize: typography.size.xs, marginTop: 2 },
  matrixSwitchCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Mobile Perm Card
  mobilePermCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: spacing.md,
  },
  mobileSwitchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  mobileSwitchBox: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.tiny,
  },
  mobileSwitchLabel: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.xs, fontWeight: typography.weight.semibold, marginBottom: spacing.xs },

  loadingBox: { padding: 40, alignItems: 'center' },
  loadingText: { fontFamily: typography.family, marginTop: 10, color: colors.muted, fontSize: typography.size.caption },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },

  // Role Modal Styling (Exact Match to Screenshots)
  roleModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  roleModalHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  roleIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleModalTitle: { fontFamily: typography.family, fontSize: typography.size.title, fontWeight: typography.weight.bold, color: colors.text },
  roleModalSubtitle: { fontFamily: typography.family, fontSize: typography.size.caption, color: colors.muted, marginTop: 2 },

  roleModalBody: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  roleInputContainerActive: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
  },
  roleInputText: {
    fontFamily: typography.family, fontSize: 15,
    color: colors.text,
    fontWeight: typography.weight.medium,
  },

  roleModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.secondary,
    backgroundColor: colors.surface,
  },
  roleCancelBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  roleCancelBtnText: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.body, fontWeight: typography.weight.semibold },
  roleSaveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  roleSaveBtnText: { fontFamily: typography.family, color: colors.surface, fontSize: typography.size.body, fontWeight: typography.weight.bold },
});

export default RolePermissions;
