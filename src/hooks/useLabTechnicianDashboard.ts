import { useCallback, useEffect, useRef, useState } from 'react';
import { getLabTestOrdersApi } from '../api/labApi';
import { useAuthContext } from '../context/AuthContext';

export type LabTrendPoint = { label: string; value: number };
export type LabTechnicianDashboardData = {
  pendingTests: number;
  completedToday: number;
  completedWeek: number;
  weeklyRevenue: number;
  dailyCompleted: LabTrendPoint[];
  dailyRevenue: LabTrendPoint[];
};

const emptyData: LabTechnicianDashboardData = {
  pendingTests: 0,
  completedToday: 0,
  completedWeek: 0,
  weeklyRevenue: 0,
  dailyCompleted: [],
  dailyRevenue: [],
};

const dateKey = (date: Date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

function getRows(payload: any) {
  const root = payload && typeof payload === 'object' ? payload : {};
  const nested = root.data && !Array.isArray(root.data) ? root.data : {};
  const rows = [root.data, root.tests, root.rows, nested.data, nested.tests]
    .find(Array.isArray) || [];
  return {
    rows: rows as Array<Record<string, any>>,
    total: Number(root.total ?? root.count ?? nested.total ?? nested.count ?? rows.length) || 0,
    limit: Number(root.limit ?? nested.limit ?? 100) || 100,
  };
}

function completionDate(test: Record<string, any>) {
  return String(test.report_uploaded_at || test.updated_at || test.created_at || '').slice(0, 10);
}

export function useLabTechnicianDashboard() {
  const { token, activeClinicId } = useAuthContext();
  const [data, setData] = useState<LabTechnicianDashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const sequence = useRef(0);

  const refresh = useCallback(async (manual = false) => {
    const requestId = ++sequence.current;
    if (!token || !activeClinicId) {
      setData(emptyData);
      setLoading(false);
      setRefreshing(false);
      setError(!token ? 'Sign in to view lab data.' : 'Select a clinic to view lab data.');
      return;
    }
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const today = new Date();
      const todayKey = dateKey(today);
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      const weekStartKey = dateKey(weekStart);
      const [pendingResponse, completedResponse] = await Promise.all([
        getLabTestOrdersApi(token, activeClinicId, 1, 1, 'pending'),
        getLabTestOrdersApi(token, activeClinicId, 1, 100, 'completed'),
      ]);
      if (!pendingResponse.success) throw new Error(pendingResponse.message || 'Could not load pending lab tests.');
      if (!completedResponse.success) throw new Error(completedResponse.message || 'Could not load completed lab tests.');

      const pendingPage = getRows(pendingResponse.data);
      const firstCompletedPage = getRows(completedResponse.data);
      const pageCount = Math.ceil(firstCompletedPage.total / firstCompletedPage.limit);
      const otherPages = pageCount > 1
        ? await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) =>
          getLabTestOrdersApi(token, activeClinicId, index + 2, 100, 'completed')))
        : [];
      const completed = [...firstCompletedPage.rows];
      otherPages.forEach(response => {
        if (response.success) completed.push(...getRows(response.data).rows);
      });
      const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today);
        date.setHours(0, 0, 0, 0);
        date.setDate(today.getDate() - (6 - index));
        return {
          key: dateKey(date),
          label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        };
      });
      const weekly = completed.filter(test => {
        const key = completionDate(test);
        return key && key >= weekStartKey && key <= todayKey;
      });
      if (requestId !== sequence.current) return;
      setData({
        pendingTests: pendingPage.total,
        completedToday: completed.filter(test => completionDate(test) === todayKey).length,
        completedWeek: weekly.length,
        weeklyRevenue: weekly.reduce((sum, test) => sum + (Number(test.price) || 0), 0),
        dailyCompleted: lastSevenDays.map(day => ({
          label: day.label,
          value: completed.filter(test => completionDate(test) === day.key).length,
        })),
        dailyRevenue: lastSevenDays.map(day => ({
          label: day.label,
          value: completed
            .filter(test => completionDate(test) === day.key)
            .reduce((sum, test) => sum + (Number(test.price) || 0), 0),
        })),
      });
    } catch (cause) {
      if (requestId === sequence.current) {
        setError(cause instanceof Error ? cause.message : 'Could not load lab dashboard data.');
      }
    } finally {
      if (requestId === sequence.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [activeClinicId, token]);

  useEffect(() => {
    refresh().catch(() => undefined);
    return () => { sequence.current += 1; };
  }, [refresh]);

  return { data, loading, refreshing, error, refresh: () => refresh(true) };
}
