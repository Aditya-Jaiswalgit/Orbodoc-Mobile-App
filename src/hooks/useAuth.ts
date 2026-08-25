import { useState } from 'react';
import { loginPatientApi, loginStaffApi } from '../api/authApi';
import { useAuthContext } from '../context/AuthContext';
import {
  AuthResponseData,
  PatientLoginPayload,
  StaffLoginPayload,
} from '../types/auth';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { saveAuthSession, user, token, userType, isAuthenticated, logout } =
    useAuthContext();

  const clearError = () => setError(null);

  const loginStaff = async (
    payload: StaffLoginPayload
  ): Promise<AuthResponseData | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await loginStaffApi(payload);

      if (response.success && response.data) {
        saveAuthSession(response.data, 'staff');
        return response.data;
      } else {
        const errorMsg = response.message || response.error || 'Login failed';
        setError(errorMsg);
        return null;
      }
    } catch (err: any) {
      const errorMsg = err.message || 'An unexpected error occurred';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loginPatient = async (
    payload: PatientLoginPayload
  ): Promise<AuthResponseData | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await loginPatientApi(payload);

      if (response.success && response.data) {
        saveAuthSession(response.data, 'patient');
        return response.data;
      } else {
        const errorMsg = response.message || response.error || 'Login failed';
        setError(errorMsg);
        return null;
      }
    } catch (err: any) {
      const errorMsg = err.message || 'An unexpected error occurred';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    clearError,
    loginStaff,
    loginPatient,
    user,
    token,
    userType,
    isAuthenticated,
    logout,
  };
};
