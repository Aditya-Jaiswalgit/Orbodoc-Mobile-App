import { useAuthContext } from '../context/AuthContext';
import {
  getAppointmentChartApi,
  getDashboardKpiApi,
  getRevenueChartApi,
} from '../api/dashboardApi';
import { getProviderWalletSummaryApi } from '../api/providerWalletApi';
import { dashboardNumber, monthlyRevenue } from '../utils/dashboardValues';
import { buildMonthlyAppointments } from '../utils/monthlyAppointments';
import { useRemoteData } from './useRemoteData';

export function useClinicDashboard() {
  const { user, token, activeClinicId } = useAuthContext();
  const clinicId =
    activeClinicId ?? user?.activeClinicId ?? user?.clinicId ?? user?.clinic_id;
  const resource = useRemoteData(
    `${user?.id}:${token}:${clinicId}:dashboard`,
    async signal => {
      if (!clinicId) throw new Error('No clinic selected');
      const results = await Promise.allSettled([
        getDashboardKpiApi(clinicId, signal),
        getAppointmentChartApi(clinicId, signal),
        getRevenueChartApi(clinicId, 1, signal),
        getProviderWalletSummaryApi(clinicId, signal),
      ]);
      const [kpi, chart, revenue, wallet] = results.map(result =>
        result.status === 'fulfilled'
          ? result.value
          : { success: false, data: undefined },
      );
      const values: Record<string, number | null> = {};
      const stats = kpi.success ? (kpi.data as any)?.stats : null;
      values.activePatients = dashboardNumber(stats?.total_active_patients);
      values.lowStockMedicines = dashboardNumber(stats?.low_stock_medicines);
      values.pendingLabTests = dashboardNumber(stats?.pending_lab_tests);
      const chartRows = (chart.data as any)?.appointmentStats;
      const appointments =
        chart.success && Array.isArray(chartRows)
          ? buildMonthlyAppointments(chartRows)
          : null;
      const revenueRows = (revenue.data as any)?.revenue;
      if (revenue.success && Array.isArray(revenueRows)) {
        try {
          Object.assign(values, monthlyRevenue(revenueRows));
        } catch {
          /* Keep invalid amounts unavailable. */
        }
      }
      values.walletBalance = wallet.success
        ? dashboardNumber((wallet.data as any)?.wallet?.available_balance)
        : null;
      const failed =
        !appointments ||
        values.revenueThisMonth == null ||
        Object.values(values).some(value => value === null);
      return { values, appointments, failed };
    },
  );
  return {
    ...resource,
    values: resource.data?.values ?? {},
    appointments: resource.data?.appointments ?? null,
    error:
      resource.error ||
      (resource.data?.failed
        ? 'Some dashboard data could not be loaded. Please retry.'
        : null),
  };
}
