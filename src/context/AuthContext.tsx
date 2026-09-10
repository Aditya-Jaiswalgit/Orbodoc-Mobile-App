import React, { createContext, useContext, useState } from 'react';
import { AuthResponseData, AuthUser, UserRoleType } from '../types/auth';
import { apiFetch } from '../api/apiConfig';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  userType: UserRoleType | null;
  permissions: Record<string, Record<string, unknown>>;
  plan: Record<string, any> | null;
  activeClinicId: number | null;
  isAuthenticated: boolean;
  saveAuthSession: (data: AuthResponseData, userType: UserRoleType) => void;
  switchClinic: (clinicId: number) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userType, setUserType] = useState<UserRoleType | null>(null);
  const [permissions, setPermissions] = useState<Record<string, Record<string, unknown>>>({});
  const [plan, setPlan] = useState<Record<string, any> | null>(null);
  const [activeClinicId, setActiveClinicId] = useState<number | null>(null);

  const saveAuthSession = (authData: AuthResponseData, type: UserRoleType) => {
    const sessionToken = authData.accessToken || authData.token || null;
    const nextUser = authData.user;
    const nextClinicId = Number(
      authData.activeClinicId ??
      nextUser.activeClinicId ??
      nextUser.clinicId ??
      nextUser.clinic_id ??
      0,
    ) || null;
    setToken(sessionToken);
    setUser(nextUser);
    setUserType(type);
    setPermissions(authData.permissions || {});
    setPlan(authData.plan || null);
    setActiveClinicId(nextClinicId);
  };

  const switchClinic = async (clinicId: number) => {
    if (!token) return { success: false, message: 'Authentication required.' };
    const result = await apiFetch<{ token?: string; activeClinicId?: number }>('/auth/switch-clinic', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ clinicId }),
    });

    if (!result.success) return result;
    const nextToken = result.data?.token || token;
    const nextClinic = user?.clinics?.find((clinic) => Number(clinic.id) === Number(clinicId));
    setToken(nextToken);
    setActiveClinicId(clinicId);
    setUser((current) => current ? {
      ...current,
      activeClinicId: clinicId,
      clinicId,
      clinic_id: clinicId,
      clinicName: nextClinic?.name || current.clinicName,
      clinic_name: nextClinic?.name || current.clinic_name,
      clinicLogo: nextClinic?.logo_url || nextClinic?.logo || nextClinic?.clinic_logo_url || current.clinicLogo,
    } : current);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setUserType(null);
    setPermissions({});
    setPlan(null);
    setActiveClinicId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        userType,
        permissions,
        plan,
        activeClinicId,
        isAuthenticated: !!token && !!user,
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
