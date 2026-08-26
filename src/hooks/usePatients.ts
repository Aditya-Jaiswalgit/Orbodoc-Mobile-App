import { useCallback, useEffect, useState } from 'react';
import {
  getPatientsApi,
  getPatientsDashboardStatsApi,
  createPatientApi,
  getPatientByIdApi,
  updatePatientApi,
  getPatientConsultationsApi,
  getPatientMedicalHistoryApi,
  getPatientPrescriptionsApi,
} from '../api/patientApi';
import { useAuthContext } from '../context/AuthContext';
import { PatientModel } from '../types/clinicTypes';

export interface PatientDashboardStats {
  totalPatients: number;
  activeCount: number;
  inactiveCount: number;
  todayCount: number;
  newThisWeek: number;
}

export const usePatients = () => {
  const { token } = useAuthContext();
  const [patients, setPatients] = useState<PatientModel[]>([]);
  const [stats, setStats] = useState<PatientDashboardStats>({
    totalPatients: 0,
    activeCount: 0,
    inactiveCount: 0,
    todayCount: 0,
    newThisWeek: 0,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      let rawList: PatientModel[] = [];
      const res = await getPatientsApi(token);
      if (res.success && res.data) {
        rawList = Array.isArray(res.data)
          ? res.data
          : (res.data as any).patients || (res.data as any).data || [];
        setPatients(rawList);
      }

      try {
        const statsRes = await getPatientsDashboardStatsApi(token);
        if (statsRes.success && statsRes.data) {
          const s = statsRes.data;
          setStats({
            totalPatients: Number(s.total_patients || s.total || rawList.length || 0),
            activeCount: Number(s.active_patients || s.active || rawList.length || 0),
            inactiveCount: Number(s.inactive_patients || s.inactive || 0),
            todayCount: Number(s.today_registered || s.today || 0),
            newThisWeek: Number(s.new_this_week || s.newThisWeek || 0),
          });
        }
      } catch (e) {}
    } catch (err: any) {
      setError(err.message || 'Error loading patient records');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const addPatient = async (patientData: Partial<PatientModel>) => {
    if (!token) throw new Error('Authentication required');
    const res = await createPatientApi(token, patientData);
    if (res.success) {
      fetchPatients();
    }
    return res;
  };

  const fetchPatientDetails = async (patientId: number) => {
    if (!token) return null;
    try {
      const res = await getPatientByIdApi(token, patientId);
      if (res.success && res.data) {
        return (res.data as any).patient || res.data;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const updatePatient = async (patientId: number, data: Partial<PatientModel>) => {
    if (!token) throw new Error('Authentication required');
    const res = await updatePatientApi(token, patientId, data);
    if (res.success) {
      fetchPatients();
    }
    return res;
  };

  const fetchPatientConsultations = async (patientId: number) => {
    if (!token) return [];
    try {
      const res = await getPatientConsultationsApi(token, patientId);
      if (res.success && res.data) {
        return Array.isArray(res.data)
          ? res.data
          : (res.data as any).consultations || (res.data as any).data || [];
      }
      return [];
    } catch (e) {
      return [];
    }
  };

  const fetchPatientMedicalHistory = async (patientId: number) => {
    if (!token) return null;
    try {
      const res = await getPatientMedicalHistoryApi(token, patientId);
      return res.success && res.data ? res.data : null;
    } catch (e) {
      return null;
    }
  };

  const fetchPatientPrescriptions = async (patientId: number) => {
    if (!token) return [];
    try {
      const res = await getPatientPrescriptionsApi(token, patientId);
      if (res.success && res.data) {
        return Array.isArray(res.data)
          ? res.data
          : (res.data as any).prescriptions || (res.data as any).data || [];
      }
      return [];
    } catch (e) {
      return [];
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return {
    patients,
    stats,
    loading,
    error,
    refreshPatients: fetchPatients,
    addPatient,
    fetchPatientDetails,
    updatePatient,
    fetchPatientConsultations,
    fetchPatientMedicalHistory,
    fetchPatientPrescriptions,
  };
};

export default usePatients;
