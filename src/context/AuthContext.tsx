import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { setGlobalAuthToken } from '../api/apiConfig';
import {
  fetchMyClinicsApi,
  fetchProfileApi,
  switchClinicApi,
} from '../api/authApi';
import {
  AuthContextType,
  AuthResponseData,
  AuthUser,
  UserClinic,
  UserRoleType,
} from '../types/auth';
import { useRemoteData } from '../hooks/useRemoteData';
import { fetchPermissionMapByRoleApi, fetchSystemObjectsApi } from '../api/roleManagementApi';
import { normalizePermissionMap, normalizeRoleName, PermissionMap } from '../utils/rolePermissions';

/**
 * Normalizes backend role names/IDs into standardized client role strings
 */
export function normalizeAppRole(user: AuthUser | null): string {
  if (!user) return 'patient';
  const rawRole = (
    user.role ||
    user.roleName ||
    (user as any).role_name ||
    (user as any).user_role ||
    ''
  );
  const normalizedRole = normalizeRoleName(rawRole);

  if (normalizedRole) return normalizedRole;

  // Fallback by role_id if numeric
  const roleId = Number(user.roleId || user.role_id);
  if (roleId === 1) return 'super_admin';
  if (roleId === 2) return 'clinic_admin';
  if (roleId === 3) return 'doctor';
  if (roleId === 4) return 'receptionist';
  if (roleId === 5) return 'pharmacist';
  if (roleId === 6) return 'lab_technician';
  if (roleId === 7) return 'accountant';
  if (roleId === 8) return 'nurse';
  if (roleId === 9) return 'patient';

  return 'staff';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userType, setUserType] = useState<UserRoleType | null>(null);
  const [activeClinicId, setActiveClinicId] = useState<number | null>(null);
  const [assignedClinics, setAssignedClinics] = useState<UserClinic[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loginPermissions, setLoginPermissions] = useState<{ key: string; map: PermissionMap }>({ key: '', map: {} });

  const sessionRevision = useRef(0);
  const switching = useRef(false);

  // Sync token to API Fetch config whenever token changes
  useEffect(() => {
    setGlobalAuthToken(token);
  }, [token]);

  /**
   * Post-login Data Initialization Lifecycle:
   * 1. Store JWT token in memory
   * 2. Execute GET /api/auth/profile
   * 3. Execute GET /api/clinics/my-clinics
   * Permissions are loaded separately for the current clinic and role.
   */
  const saveAuthSession = async (authData: AuthResponseData, type: UserRoleType) => {
    const revision = ++sessionRevision.current;
    setIsLoading(true);
    const sessionToken = authData.accessToken || authData.token || null;
    let userData = authData.user;

    setToken(sessionToken);
    setGlobalAuthToken(sessionToken);
    setUser(userData);
    setUserType(type);

    // Initial clinics from login response
    let clinics: UserClinic[] = userData?.clinics || [];
    setAssignedClinics(clinics);

    const initialClinicId =
      userData?.activeClinicId ||
      userData?.clinicId ||
      userData?.clinic_id ||
      (clinics.length > 0 ? clinics[0].id : null);

    setActiveClinicId(initialClinicId ? Number(initialClinicId) : null);
    setLoginPermissions({
      key: [sessionToken, userData?.id, initialClinicId || null, userData?.role_id ?? userData?.roleId].join(':'),
      map: normalizePermissionMap(authData.permissions),
    });

    if (sessionToken) {
      try {
        // Run Post-Login Initializations in background parallel
        const [profileRes, clinicsRes] = await Promise.all([
          fetchProfileApi(),
          fetchMyClinicsApi(),
        ]);

        if (revision !== sessionRevision.current) return;

        // 1. Profile Data Update
        if (profileRes.success && profileRes.data) {
          const profileData = profileRes.data.user || profileRes.data;
          userData = { ...userData, ...profileData };
          setUser(userData);
        }

        // 2. Clinics List Update
        if (clinicsRes.success && clinicsRes.data) {
          const rawClinics = Array.isArray(clinicsRes.data)
            ? clinicsRes.data
            : clinicsRes.data.clinics || clinicsRes.data.data || [];
          if (rawClinics.length > 0) {
            const formattedClinics: UserClinic[] = rawClinics.map((c: any) => ({
              id: Number(c.id || c.clinic_id),
              name: c.name || c.clinic_name || c.title || 'Unnamed clinic',
              is_primary: c.is_primary ? 1 : 0,
            })).filter((clinic: UserClinic) => Number.isFinite(clinic.id) && clinic.id > 0);
            setAssignedClinics(formattedClinics);
            if (!initialClinicId && formattedClinics.length > 0) {
              setActiveClinicId(formattedClinics[0].id);
            }
          }
        }
      } catch {
        // Keep the authenticated session when an optional profile fetch fails.
      } finally {
        if (revision === sessionRevision.current) setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  /**
   * Switch Active Clinic (Multi-Clinic User)
   * Calls POST /api/auth/switch-clinic and updates session state
   */
  const switchClinic = async (clinicId: number): Promise<boolean> => {
    if (!token || !user || !Number.isInteger(clinicId) || clinicId <= 0 || switching.current) return false;
    if (clinicId === activeClinicId) return true;
    switching.current = true;
    const revision = sessionRevision.current;
    try {
      const response = await switchClinicApi(clinicId);
      if (!response.success || revision !== sessionRevision.current) return false;
      const newAuthData = response.data;
      const newToken = newAuthData?.accessToken || newAuthData?.token || token;
      const nextUser = { ...user, ...newAuthData?.user };
      setLoginPermissions({
        key: [newToken, nextUser.id, clinicId, nextUser.role_id ?? nextUser.roleId].join(':'),
        map: normalizePermissionMap(newAuthData?.permissions),
      });
      setGlobalAuthToken(newToken);
      setToken(newToken);
      setUser(previous => previous ? ({
        ...previous, ...newAuthData?.user,
        activeClinicId: clinicId, clinic_id: clinicId, clinicId,
      }) : null);
      setActiveClinicId(clinicId);
      return true;
    } catch {
      return false;
    } finally {
      switching.current = false;
    }
  };

  const logout = () => {
    sessionRevision.current += 1;
    setIsLoading(false);
    setUser(null);
    setToken(null);
    setUserType(null);
    setActiveClinicId(null);
    setAssignedClinics([]);
    setLoginPermissions({ key: '', map: {} });
    setGlobalAuthToken(null);
  };

  const role = normalizeAppRole(user);
  const permissionRoleId = user?.role_id ?? user?.roleId;
  const permissionScope = [token, user?.id, activeClinicId, permissionRoleId].join(':');
  const fallbackPermissions = loginPermissions.key === permissionScope ? loginPermissions.map : {};
  const permissionResource = useRemoteData(permissionScope + ':access', async () => {
    const [response, objects] = await Promise.all([
      fetchPermissionMapByRoleApi(permissionRoleId!),
      fetchSystemObjectsApi().catch(() => null),
    ]);
    if (!response.success || !response.data) throw new Error(response.message);
    const map = normalizePermissionMap(response.data, objects?.data ?? []);
    return Object.keys(map).length ? map : fallbackPermissions;
  }, Boolean(token && userType === 'staff' && activeClinicId && permissionRoleId));
  const isMultiClinic = assignedClinics.length > 1 || !!user?.isMultiClinic;

  const currentClinicObj = assignedClinics.find(c => Number(c.id) === Number(activeClinicId));
  const activeClinicName = currentClinicObj?.name || '';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        userType,
        role,
        activeClinicId,
        activeClinicName,
        assignedClinics,
        isMultiClinic,
        isAuthenticated: !!token && !!user,
        isLoading,
        permissionsMap: permissionResource.data ?? fallbackPermissions,
        permissionsLoading: permissionResource.loading,
        permissionsError: permissionResource.error,
        refreshPermissions: permissionResource.refresh,
        saveAuthSession,
        switchClinic,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
