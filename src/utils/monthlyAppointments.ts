import type { DashboardAppointmentChartRow } from '../api/dashboardApi';

export interface DailyAppointmentTotals {
  date: string;
  approved: number;
  completed: number;
  cancelled: number;
}

// Match the web dashboard: monthly KPIs come from date/status chart rows,
// while /dashboard stats describe today only.
export function buildMonthlyAppointments(
  rows: DashboardAppointmentChartRow[],
  now: Date = new Date(),
) {
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const daily = new Map<string, DailyAppointmentTotals>();
  let appointments = 0;
  let completed = 0;
  let cancelled = 0;

  rows.forEach(row => {
    const date = String(row.appointment_date || '').slice(0, 10);
    if (!date.startsWith(`${monthKey}-`)) {
      return;
    }

    const count = Number(row.count);
    if (!Number.isFinite(count) || count < 0) {
      return;
    }

    appointments += count;
    const status = String(row.status || '').trim().toLowerCase();
    const totals = daily.get(date) || { date, approved: 0, completed: 0, cancelled: 0 };

    if (status === 'approved') {
      totals.approved += count;
    } else if (status === 'complete' || status === 'completed') {
      completed += count;
      totals.completed += count;
    } else if (['cancel', 'cancelled', 'canceled'].includes(status)) {
      cancelled += count;
      totals.cancelled += count;
    }

    daily.set(date, totals);
  });

  return {
    appointments,
    completed,
    cancelled,
    daily: Array.from(daily.values()).sort((a, b) => a.date.localeCompare(b.date)),
  };
}
