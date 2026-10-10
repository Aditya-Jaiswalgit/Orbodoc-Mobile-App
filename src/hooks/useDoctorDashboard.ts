import { useAuthContext } from '../context/AuthContext';
import { getDashboardKpiApi } from '../api/dashboardApi';
import { getProviderWalletSummaryApi } from '../api/providerWalletApi';
import { useRemoteData } from './useRemoteData';

export interface DoctorDashboardData {
  todayAppointments: number;
  upcomingAppointments: number;
  pendingRequests: number;
  totalVisits: number;
  walletBalance: number;
  isIndependentDoctor: boolean;
}

const safeNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export function useDoctorDashboard() {
  const { token, activeClinicId, user } = useAuthContext();
  const isIndependentDoctor =
    String((user as any)?.doctor_type || '').trim().toLowerCase() ===
    'independent_doctor';

  const resource = useRemoteData(
    `${token}:${activeClinicId || ''}:${isIndependentDoctor}:doctor-dashboard`,
    async signal => {
      const [dashboard, wallet] = await Promise.all([
        getDashboardKpiApi(undefined, signal),
        isIndependentDoctor
          ? getProviderWalletSummaryApi(undefined, signal)
          : Promise.resolve(null),
      ]);
      if (!dashboard.success) {
        throw new Error(dashboard.message || 'Unable to load doctor dashboard.');
      }

      const stats = (dashboard.data as any)?.stats || dashboard.data || {};
      if (wallet && !wallet.success) {
        throw new Error(wallet.message || 'Unable to load doctor wallet.');
      }

      return {
        todayAppointments: safeNumber(stats.appointments_today),
        // Keep the same role-dashboard mapping as web's fetchRoleDashboard("doctor").
        upcomingAppointments: 0,
        pendingRequests: safeNumber(stats.pending_lab_tests),
        totalVisits: safeNumber(stats.completed_today),
        walletBalance: safeNumber((wallet?.data as any)?.wallet?.available_balance),
        isIndependentDoctor,
      } satisfies DoctorDashboardData;
    },
    Boolean(token),
  );

  return {
    ...resource,
    data: resource.data,
    user,
  };
}
