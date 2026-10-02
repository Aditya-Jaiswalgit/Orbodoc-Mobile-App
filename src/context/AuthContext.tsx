import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
  updateStoredSession,
} from '../utils/authStorage';

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
  const [plan, setPlan] = useState<AuthResponseData['plan'] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);
  const [loginPermissions, setLoginPermissions] = useState<{ key: string; map: PermissionMap }>({ key: '', map: {} });

  const sessionRevision = useRef(0);
  const switching = useRef(false);

  // Sync token to API Fetch config whenever token changes
  useEffect(() => {
    setGlobalAuthToken(token);
  }, [token]);

  /**
   * On Initial App Launch:
   * Restore persisted authentication session from AsyncStorage.
   */
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const stored = await getStoredSession();
        if (stored && isMounted) {
          setToken(stored.token);
          setGlobalAuthToken(stored.token);
          setUser(stored.user);
          setUserType(stored.userType);
          setActiveClinicId(stored.activeClinicId);
          setAssignedClinics(stored.assignedClinics || []);
          setPlan(stored.plan ?? null);

          if (stored.permissionsKey && stored.permissionsMap) {
            setLoginPermissions({ key: stored.permissionsKey, map: stored.permissionsMap });
          }

          // Verify session in background and refresh profile/clinics
          try {
            const [profileRes, clinicsRes] = await Promise.all([
              fetchProfileApi(),
              fetchMyClinicsApi(),
            ]);

            if (!isMounted) return;

            if (profileRes.success && profileRes.data) {
              const profileData = profileRes.data.user || profileRes.data;
              const mergedUser = { ...stored.user, ...profileData };
              setUser(mergedUser);
              await updateStoredSession({ user: mergedUser });
            } else if (
              !profileRes.success &&
              (profileRes.message?.toLowerCase().includes('unauthorized') ||
                profileRes.message?.toLowerCase().includes('expired') ||
                profileRes.message?.toLowerCase().includes('invalid token'))
            ) {
              await clearStoredSession();
              if (isMounted) {
                setToken(null);
                setUser(null);
                setGlobalAuthToken(null);
              }
            }

            if (clinicsRes.success && clinicsRes.data) {
              const rawClinics = Array.isArray(clinicsRes.data)
                ? clinicsRes.data
                : clinicsRes.data.clinics || clinicsRes.data.data || [];
              if (rawClinics.length > 0) {
                const formattedClinics: UserClinic[] = rawClinics
                  .map((c: any) => ({
                    id: Number(c.id || c.clinic_id),
                    name: c.name || c.clinic_name || c.title || 'Unnamed clinic',
                    is_primary: c.is_primary ? 1 : 0,
                  }))
                  .filter((clinic: UserClinic) => Number.isFinite(clinic.id) && clinic.id > 0);
                setAssignedClinics(formattedClinics);
                await updateStoredSession({ assignedClinics: formattedClinics });
              }
            }
          } catch {
            // Keep restored offline session if network request fails
          }
        }
      } catch (err) {
        console.error('Session restoration failed:', err);
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Post-login Data Initialization Lifecycle:
   * 1. Store JWT token in memory & AsyncStorage
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
    setPlan(authData.plan ?? null);

    // Initial clinics from login response
    let clinics: UserClinic[] = userData?.clinics || [];
    setAssignedClinics(clinics);

    const initialClinicId =
      userData?.activeClinicId ||
      userData?.clinicId ||
      userData?.clinic_id ||
      (clinics.length > 0 ? clinics[0].id : null);

    const numericClinicId = initialClinicId ? Number(initialClinicId) : null;
    setActiveClinicId(numericClinicId);

    const permKey = [sessionToken, userData?.id, initialClinicId || null, userData?.role_id ?? userData?.roleId].join(':');
    const permMap = normalizePermissionMap(authData.permissions);
    setLoginPermissions({ key: permKey, map: permMap });

    if (sessionToken && userData) {
      // Save session immediately so app reopening retains login even if user closes app instantly
      await setStoredSession({
        token: sessionToken,
        user: userData,
        userType: type,
        activeClinicId: numericClinicId,
        assignedClinics: clinics,
        plan: authData.plan ?? null,
        permissionsKey: permKey,
        permissionsMap: permMap,
      });

      try {
        // Run Post-Login Initializations in background parallel
        const [profileRes, clinicsRes] = await Promise.all([
          fetchProfileApi(),
          fetchMyClinicsApi(),
        ]);

        if (revision !== sessionRevision.current) return;

        let latestUser = userData;
        let latestClinics = clinics;
        let latestClinicId = numericClinicId;

        // 1. Profile Data Update
        if (profileRes.success && profileRes.data) {
          const profileData = profileRes.data.user || profileRes.data;
          latestUser = { ...latestUser, ...profileData };
          setUser(latestUser);
        }

        // 2. Clinics List Update
        if (clinicsRes.success && clinicsRes.data) {
          const rawClinics = Array.isArray(clinicsRes.data)
            ? clinicsRes.data
            : clinicsRes.data.clinics || clinicsRes.data.data || [];
          if (rawClinics.length > 0) {
            latestClinics = rawClinics
              .map((c: any) => ({
                id: Number(c.id || c.clinic_id),
                name: c.name || c.clinic_name || c.title || 'Unnamed clinic',
                is_primary: c.is_primary ? 1 : 0,
              }))
              .filter((clinic: UserClinic) => Number.isFinite(clinic.id) && clinic.id > 0);
            setAssignedClinics(latestClinics);
            if (!latestClinicId && latestClinics.length > 0) {
              latestClinicId = latestClinics[0].id;
              setActiveClinicId(latestClinicId);
            }
          }
        }

        // Persist refreshed user and clinics to AsyncStorage
        await updateStoredSession({
          user: latestUser,
          assignedClinics: latestClinics,
          activeClinicId: latestClinicId,
        });
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
   * Calls POST /api/auth/switch-clinic and updates session state & storage
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
      setPlan(newAuthData?.plan ?? null);
      const newToken = newAuthData?.accessToken || newAuthData?.token || token;
      const nextUser = { ...user, ...newAuthData?.user, activeClinicId: clinicId, clinic_id: clinicId, clinicId };
      const permKey = [newToken, nextUser.id, clinicId, nextUser.role_id ?? nextUser.roleId].join(':');
      const permMap = normalizePermissionMap(newAuthData?.permissions);

      setLoginPermissions({ key: permKey, map: permMap });
      setGlobalAuthToken(newToken);
      setToken(newToken);
      setUser(nextUser);
      setActiveClinicId(clinicId);

      // Persist switched clinic to storage
      await updateStoredSession({
        token: newToken,
        user: nextUser,
        activeClinicId: clinicId,
        plan: newAuthData?.plan ?? null,
        permissionsKey: permKey,
        permissionsMap: permMap,
      });

      return true;
    } catch {
      return false;
    } finally {
      switching.current = false;
    }
  };

  const updateUserProfile = useCallback((profile: Partial<AuthUser> & Record<string, unknown>) => {
    setUser(previous => {
      if (!previous) return null;
      const updated = {
        ...previous,
        ...profile,
        fullName: profile.full_name ?? profile.fullName ?? previous.fullName,
      };
      updateStoredSession({ user: updated }).catch(() => {});
      return updated;
    });
  }, []);

  const updateClinicName = useCallback((id: number | string, name: string) => {
    setAssignedClinics(previous => {
      const updated = previous.map(clinic => (String(clinic.id) === String(id) ? { ...clinic, name } : clinic));
      updateStoredSession({ assignedClinics: updated }).catch(() => {});
      return updated;
    });
  }, []);

  const logout = () => {
    sessionRevision.current += 1;
    setIsLoading(false);
    setUser(null);
    setToken(null);
    setUserType(null);
    setActiveClinicId(null);
    setAssignedClinics([]);
    setPlan(null);
    setLoginPermissions({ key: '', map: {} });
    setGlobalAuthToken(null);
    clearStoredSession().catch(() => {});
  };

  const role = normalizeAppRole(user);
  const permissionRoleId = user?.role_id ?? user?.roleId;
  const permissionScope = [token, user?.id, activeClinicId, permissionRoleId].join(':');
  const fallbackPermissions = useMemo(() => {
    if (loginPermissions.map && Object.keys(loginPermissions.map).length > 0) {
      return loginPermissions.map;
    }
    return {};
  }, [loginPermissions.map]);

  const permissionResource = useRemoteData(permissionScope + ':access', async () => {
    try {
      const [response, objects] = await Promise.all([
        fetchPermissionMapByRoleApi(permissionRoleId!),
        fetchSystemObjectsApi().catch(() => null),
      ]);
      const fetchedData = response?.success && response?.data ? response.data : null;
      const map = fetchedData ? normalizePermissionMap(fetchedData, objects?.data ?? []) : {};
      if (Object.keys(map).length > 0) {
        return map;
      }
      return fallbackPermissions;
    } catch {
      return fallbackPermissions;
    }
  }, Boolean(token && userType === 'staff' && activeClinicId && permissionRoleId));

  const effectivePermissionsMap = useMemo(() => {
    const fetched = permissionResource.data;
    if (fetched && Object.keys(fetched).length > 0) {
      return { ...fallbackPermissions, ...fetched };
    }
    return fallbackPermissions;
  }, [permissionResource.data, fallbackPermissions]);

  const isMultiClinic = assignedClinics.length > 1 || !!user?.isMultiClinic;
  const isMultiPlan = String(plan?.plan_type ?? plan?.planType ?? '').trim().toLowerCase() === 'multi'
    || Number(plan?.max_clinics ?? plan?.maxClinics ?? 0) > 1;

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
        isMultiPlan,
        isAuthenticated: !!token && !!user,
        isLoading: isLoading || isBootstrapping,
        permissionsMap: effectivePermissionsMap,
        permissionsLoading: permissionResource.loading,
        permissionsError: permissionResource.error,
        refreshPermissions: permissionResource.refresh,
        saveAuthSession,
        switchClinic,
        logout,
        updateUserProfile,
        updateClinicName,
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
