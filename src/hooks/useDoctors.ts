import { useCallback, useEffect, useState } from 'react';
import { getDoctorsByClinicApi } from '../api/doctorApi';
import { useAuthContext } from '../context/AuthContext';
import { StaffMember } from '../types/clinicTypes';

export const useDoctors = (clinicId?: number) => {
  const { token } = useAuthContext();
  const [doctors, setDoctors] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDoctors = useCallback(async () => {
    if (!clinicId) {
      setDoctors([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getDoctorsByClinicApi(token || '', clinicId);
      if (res.success && Array.isArray(res.data)) {
        setDoctors(res.data);
      } else {
        setDoctors([]);
        setError(res.message || 'Failed to fetch doctors from backend');
      }
    } catch (err: any) {
      setDoctors([]);
      setError(err.message || 'Error fetching doctors from backend');
    } finally {
      setLoading(false);
    }
  }, [token, clinicId]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  return {
    doctors,
    loading,
    error,
    refreshDoctors: fetchDoctors,
  };
};

export default useDoctors;
