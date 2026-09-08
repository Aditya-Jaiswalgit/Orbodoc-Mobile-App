import { useCallback, useEffect, useState } from 'react';
import { getNurseDashboardApi, updatePatientVitalsApi, NurseDashboardData } from '../api/nurseApi';
import { getAppointmentsApi } from '../api/appointmentApi';
import { getPatientsApi } from '../api/patientApi';
import { useAuthContext } from '../context/AuthContext';

export interface NurseModuleCard {
  id: string;
  title: string;
  subtitle: string;
  screenKey: string;
  iconName: string;
}

export const NURSE_MODULE_CARDS: NurseModuleCard[] = [
  {
    id: 'patients',
    title: 'Patients',
    subtitle: 'Open patients module',
    screenKey: 'patients',
    iconName: '👥',
  },
  {
    id: 'appointments',
    title: 'Appointments',
    subtitle: 'Open appointments module',
    screenKey: 'appointments',
    iconName: '📅',
  },
  {
    id: 'treatment_billing',
    title: 'Treatment Billing',
    subtitle: 'Open treatment billing module',
    screenKey: 'treatment_billing',
    iconName: '💳',
  },
  {
    id: 'medicine_billing',
    title: 'Medicine Billing',
    subtitle: 'Open medicine billing module',
    screenKey: 'medicine_billing',
    iconName: '🧾',
  },
  {
    id: 'lab_tests',
    title: 'Lab Tests',
    subtitle: 'Open lab tests module',
    screenKey: 'lab_management',
    iconName: '🧪',
  },
  {
    id: 'lab_inventory',
    title: 'Lab Inventory',
    subtitle: 'Open lab inventory module',
    screenKey: 'lab_inventory',
    iconName: '🔬',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Open notifications module',
    screenKey: 'notifications',
    iconName: '🔔',
  },
  {
    id: 'book_appointment',
    title: 'Book Appointment',
    subtitle: 'Open book appointment module',
    screenKey: 'book_appointment',
    iconName: '📆',
  },
];

export const useNurseDashboard = () => {
  const { token, user } = useAuthContext();
  const [data, setData] = useState<NurseDashboardData>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNurseDashboard = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const res = await getNurseDashboardApi(token);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        // Fallback fetch from general appointments & patients
        const apptsRes = await getAppointmentsApi(token, 'status=scheduled');
        const appts = Array.isArray(apptsRes.data)
          ? apptsRes.data
          : (apptsRes.data as any)?.appointments || [];

        const patientsRes = await getPatientsApi(token);
        const patients = Array.isArray(patientsRes.data)
          ? patientsRes.data
          : (patientsRes.data as any)?.patients || [];

        setData({
          vitalsRecordedToday: Math.max(0, patients.length - appts.length),
          pendingVitalsCount: appts.length,
          totalPatientsCount: patients.length,
          todayAppointmentsCount: appts.length,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load nurse workspace');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNurseDashboard();
  }, [fetchNurseDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNurseDashboard();
  };

  const recordVitals = async (
    patientId: number,
    vitals: {
      vital_bp?: string;
      vital_pulse?: string;
      vital_temp?: string;
      vital_weight?: string;
      symptoms?: string;
    }
  ) => {
    if (!token) return { success: false, message: 'Authentication required' };
    try {
      const res = await updatePatientVitalsApi(token, patientId, vitals);
      if (res.success) {
        await fetchNurseDashboard();
      }
      return res;
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to record vitals' };
    }
  };

  return {
    data,
    modules: NURSE_MODULE_CARDS,
    loading,
    refreshing,
    error,
    onRefresh,
    recordVitals,
    refetch: fetchNurseDashboard,
  };
};

export default useNurseDashboard;
