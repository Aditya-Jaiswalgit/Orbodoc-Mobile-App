import { useCallback, useEffect, useRef, useState } from 'react';
import { getDashboardKpiApi } from '../api/dashboardApi';
import { getMedicineBillsApi, getTreatmentBillsApi } from '../api/billingApi';
import { useAuthContext } from '../context/AuthContext';

export type AccountantDashboardData = {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  billsGenerated: number;
  pendingPayments: number;
  treatmentRevenue: number;
  medicineRevenue: number;
};

const emptyData: AccountantDashboardData = {
  todayRevenue: 0, weekRevenue: 0, monthRevenue: 0, billsGenerated: 0,
  pendingPayments: 0, treatmentRevenue: 0, medicineRevenue: 0,
};
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function extractPage(payload: unknown) {
  if (Array.isArray(payload)) return { rows: payload as Array<Record<string, any>>, total: payload.length };
  const root = (payload || {}) as Record<string, any>;
  const nested = root.data && !Array.isArray(root.data) ? root.data : {};
  const rows = [root.data, root.bills, nested.data, nested.bills].find(Array.isArray) || [];
  return { rows: rows as Array<Record<string, any>>, total: Number(root.total ?? root.count ?? nested.total ?? nested.count ?? rows.length) || 0 };
}

function paidBillRevenue(bill: Record<string, any>, medicine: boolean) {
  const status = String(bill.status || bill.payment_status || '').toLowerCase();
  if (!['paid', 'partial', 'partially_paid'].includes(status)) return 0;
  return Number(bill.total_amount ?? bill.net_amount ?? (medicine ? bill.subtotal : 0)) || 0;
}

async function fetchAllMonthBills(token: string, clinicId: string | number, dateFrom: string, dateTo: string, medicine: boolean) {
  const fetchPage = (page: number) => medicine
    ? getMedicineBillsApi(token, { clinic_id: clinicId, date_from: dateFrom, date_to: dateTo, page, limit: 100 })
    : getTreatmentBillsApi(token, { clinic_id: clinicId, date_from: dateFrom, date_to: dateTo, page, limit: 100 });
  const firstResponse = await fetchPage(1);
  if (!firstResponse.success) throw new Error(firstResponse.message || 'Could not load billing data.');
  const first = extractPage(firstResponse.data);
  const pageCount = Math.ceil(first.total / 100);
  if (pageCount <= 1) return first.rows;
  const otherPages = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => fetchPage(index + 2)));
  return [...first.rows, ...otherPages.flatMap(response => response.success ? extractPage(response.data).rows : [])];
}

async function fetchTotal(token: string, clinicId: string | number, medicine: boolean, status?: string) {
  const response = medicine
    ? await getMedicineBillsApi(token, { clinic_id: clinicId, status, page: 1, limit: 1 })
    : await getTreatmentBillsApi(token, { clinic_id: clinicId, status, page: 1, limit: 1 });
  if (!response.success) throw new Error(response.message || 'Could not load billing totals.');
  return extractPage(response.data).total;
}

export function useAccountantDashboard() {
  const { token, activeClinicId } = useAuthContext();
  const [data, setData] = useState<AccountantDashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const sequence = useRef(0);

  const refresh = useCallback(async (manual = false) => {
    const requestId = ++sequence.current;
    if (!token || !activeClinicId) {
      setData(emptyData); setLoading(false); setRefreshing(false);
      setError(!token ? 'Sign in to view accounts data.' : 'Select a clinic to view accounts data.');
      return;
    }
    if (manual) setRefreshing(true); else setLoading(true);
    setError('');
    const today = new Date();
    const todayKey = dateKey(today);
    const monthStart = dateKey(new Date(today.getFullYear(), today.getMonth(), 1));
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const weekStartKey = dateKey(weekStart);
    try {
      const [dashboardResponse, treatmentBills, medicineBills, treatmentTotal, medicineTotal, treatmentPending, treatmentPartial, medicinePending, medicinePartial] = await Promise.all([
        getDashboardKpiApi(activeClinicId),
        fetchAllMonthBills(token, activeClinicId, monthStart, todayKey, false),
        fetchAllMonthBills(token, activeClinicId, monthStart, todayKey, true),
        fetchTotal(token, activeClinicId, false), fetchTotal(token, activeClinicId, true),
        fetchTotal(token, activeClinicId, false, 'pending'), fetchTotal(token, activeClinicId, false, 'partial'),
        fetchTotal(token, activeClinicId, true, 'pending'), fetchTotal(token, activeClinicId, true, 'partial'),
      ]);
      if (!dashboardResponse.success) throw new Error(dashboardResponse.message || 'Could not load dashboard revenue.');
      const stats = (dashboardResponse.data as any)?.stats || dashboardResponse.data || {};
      const revenueForRange = (bills: Array<Record<string, any>>, medicine: boolean, from: string) => bills.reduce((sum, bill) => {
        const created = String(bill.bill_date || bill.created_at || '').slice(0, 10);
        return created >= from && created <= todayKey ? sum + paidBillRevenue(bill, medicine) : sum;
      }, 0);
      if (requestId !== sequence.current) return;
      const treatmentRevenue = Number(stats.treatment_revenue_today) || 0;
      const medicineRevenue = Number(stats.medicine_revenue_today) || 0;
      setData({
        todayRevenue: treatmentRevenue + medicineRevenue,
        weekRevenue: revenueForRange(treatmentBills, false, weekStartKey) + revenueForRange(medicineBills, true, weekStartKey),
        monthRevenue: revenueForRange(treatmentBills, false, monthStart) + revenueForRange(medicineBills, true, monthStart),
        billsGenerated: treatmentTotal + medicineTotal,
        pendingPayments: treatmentPending + treatmentPartial + medicinePending + medicinePartial,
        treatmentRevenue,
        medicineRevenue,
      });
    } catch (cause) {
      if (requestId === sequence.current) setError(cause instanceof Error ? cause.message : 'Could not load accounts dashboard data.');
    } finally {
      if (requestId === sequence.current) { setLoading(false); setRefreshing(false); }
    }
  }, [activeClinicId, token]);

  useEffect(() => {
    refresh().catch(() => undefined);
    return () => { sequence.current += 1; };
  }, [refresh]);
  return { data, loading, refreshing, error, refresh: () => refresh(true) };
}
