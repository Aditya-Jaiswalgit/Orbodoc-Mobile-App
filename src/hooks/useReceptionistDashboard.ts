import { useAuthContext } from '../context/AuthContext';
import { getDashboardKpiApi } from '../api/dashboardApi';
import { useRemoteData } from './useRemoteData';

export interface ReceptionistDashboardData {
  totalPatients: number;
  todayAppointments: number;
  upcomingAppointments: number;
  pendingApprovals: number;
}

const safeNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export function useReceptionistDashboard() {
  const { token, activeClinicId, user } = useAuthContext();
  const resource = useRemoteData(
    `${token}:${activeClinicId || ''}:reception-dashboard`,
    async signal => {
      const response = await getDashboardKpiApi(undefined, signal);
      if (!response.success) throw new Error(response.message || 'Unable to load receptionist dashboard.');
      const stats = (response.data as any)?.stats || response.data || {};
      // Match fetchRoleDashboard("receptionist") on web.
      return {
        totalPatients: safeNumber(stats.total_active_patients),
        todayAppointments: safeNumber(stats.appointments_today),
        upcomingAppointments: 0,
        pendingApprovals: safeNumber(stats.pending_lab_tests),
      } satisfies ReceptionistDashboardData;
    },
    Boolean(token),
  );

  return { ...resource, user };
}
