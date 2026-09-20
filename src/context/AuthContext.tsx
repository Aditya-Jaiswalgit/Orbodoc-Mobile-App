import React, { createContext, useContext, useEffect, useState } from 'react';
import { setGlobalAuthToken } from '../api/apiConfig';
import {
  fetchMyClinicsApi,
  fetchProfileApi,
  fetchRolePermissionsByRoleIdApi,
  switchClinicApi,
} from '../api/authApi';
import {
  AuthContextType,
  AuthResponseData,
  AuthUser,
  UserClinic,
  UserRoleType,
} from '../types/auth';

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
  ).toLowerCase().trim();

  if (rawRole.includes('super')) return 'super_admin';
  if (rawRole.includes('admin')) return 'clinic_admin';
  if (rawRole.includes('doc')) return 'doctor';
  if (rawRole.includes('recept')) return 'receptionist';
  if (rawRole.includes('pharm')) return 'pharmacist';
  if (rawRole.includes('lab')) return 'lab_technician';
  if (rawRole.includes('account')) return 'accountant';
  if (rawRole.includes('nurse')) return 'nurse';
  if (rawRole.includes('patient')) return 'patient';

  // Fallback by role_id if numeric
  const roleId = user.roleId || user.role_id;
  if (roleId === 1) return 'super_admin';
  if (roleId === 2) return 'clinic_admin';
  if (roleId === 3) return 'doctor';
  if (roleId === 4) return 'receptionist';
  if (roleId === 5) return 'pharmacist';
  if (roleId === 6) return 'lab_technician';
  if (roleId === 7) return 'accountant';
  if (roleId === 8) return 'nurse';
  if (roleId === 9) return 'patient';

  return rawRole || 'clinic_admin';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userType, setUserType] = useState<UserRoleType | null>(null);
  const [activeClinicId, setActiveClinicId] = useState<number | null>(null);
  const [assignedClinics, setAssignedClinics] = useState<UserClinic[]>([]);
  const [permissionsMap, setPermissionsMap] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync token to API Fetch config whenever token changes
  useEffect(() => {
    setGlobalAuthToken(token);
  }, [token]);

  /**
   * Post-login Data Initialization Lifecycle:
   * 1. Store JWT token in memory
   * 2. Execute GET /api/auth/profile
   * 3. Execute GET /api/clinics/my-clinics
   * 4. Execute GET /api/role_per/permission/{roleId}
   */
  const saveAuthSession = async (authData: AuthResponseData, type: UserRoleType) => {
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

    if (sessionToken) {
      try {
        // Run Post-Login Initializations in background parallel
        const roleId = userData?.roleId || userData?.role_id || 2;
        const [profileRes, clinicsRes, permissionsRes] = await Promise.all([
          fetchProfileApi(),
          fetchMyClinicsApi(),
          fetchRolePermissionsByRoleIdApi(roleId),
        ]);

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
            const formattedClinics: UserClinic[] = rawClinics.map((c: any, i: number) => ({
              id: Number(c.id || c.clinic_id || i + 1),
              name: c.name || c.clinic_name || c.title || 'Aarogya Clinic',
              is_primary: c.is_primary ? 1 : 0,
            }));
            setAssignedClinics(formattedClinics);
            if (!activeClinicId && formattedClinics.length > 0) {
              setActiveClinicId(formattedClinics[0].id);
            }
          }
        }

        // 3. Role Permissions Update
        if (permissionsRes.success && permissionsRes.data) {
          const perms = Array.isArray(permissionsRes.data)
            ? permissionsRes.data
            : permissionsRes.data.permissions || permissionsRes.data.data || [];
          setPermissionsMap(perms);
        }
      } catch (err) {
        console.log('Post-login initialization background sync completed with fallbacks.');
      } finally {
        setIsLoading(false);
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
    try {
      setIsLoading(true);
      const response = await switchClinicApi(clinicId);

      if (response.success) {
        const newAuthData = response.data;
        const newToken = newAuthData?.accessToken || newAuthData?.token || token;
        
        if (newToken) {
          setToken(newToken);
          setGlobalAuthToken(newToken);
        }

        if (newAuthData?.user) {
          setUser(prev => ({
            ...prev,
            ...newAuthData.user,
            activeClinicId: clinicId,
            clinic_id: clinicId,
            clinicId: clinicId,
          }));
        } else if (user) {
          setUser({
            ...user,
            activeClinicId: clinicId,
            clinic_id: clinicId,
            clinicId: clinicId,
          });
        }

        setActiveClinicId(clinicId);
        setIsLoading(false);
        return true;
      } else {
        setActiveClinicId(clinicId);
        if (user) {
          setUser({
            ...user,
            activeClinicId: clinicId,
            clinic_id: clinicId,
            clinicId: clinicId,
          });
        }
        setIsLoading(false);
        return true;
      }
    } catch (err) {
      console.error('Failed to switch clinic:', err);
      setActiveClinicId(clinicId);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setUserType(null);
    setActiveClinicId(null);
    setAssignedClinics([]);
    setPermissionsMap([]);
    setGlobalAuthToken(null);
  };

  const role = normalizeAppRole(user);
  const isMultiClinic = assignedClinics.length > 1 || !!user?.isMultiClinic;

  const currentClinicObj = assignedClinics.find(c => Number(c.id) === Number(activeClinicId));
  const activeClinicName = currentClinicObj?.name || 'Aarogya Care Clinic';

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
        permissionsMap,
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

