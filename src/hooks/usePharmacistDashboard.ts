import { useCallback, useEffect, useRef, useState } from 'react';
import { getMedicineBillByIdApi, getMedicineBillsApi } from '../api/billingApi';
import { getDashboardKpiApi, getRevenueChartApi } from '../api/dashboardApi';
import { getLowStockMedicinesApi, getMedicinesApi } from '../api/medicineApi';
import { useAuthContext } from '../context/AuthContext';
import { Medicine } from '../types/clinicTypes';

export type PharmacistDashboardData = {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalMedicines: number;
  lowStockCount: number;
  lowStockMedicines: Medicine[];
  recentSales: Array<{ name: string; totalSold: number }>;
};

const emptyData: PharmacistDashboardData = {
  todayRevenue: 0,
  weekRevenue: 0,
  monthRevenue: 0,
  totalMedicines: 0,
  lowStockCount: 0,
  lowStockMedicines: [],
  recentSales: [],
};

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function unwrapRows<T>(value: unknown): { rows: T[]; total: number } {
  if (Array.isArray(value)) return { rows: value as T[], total: value.length };
  const root = (value || {}) as Record<string, any>;
  const nested = (root.data && !Array.isArray(root.data) ? root.data : {}) as Record<string, any>;
  const rows = [root.data, root.medicines, root.rows, root.bills, nested.data, nested.medicines, nested.bills]
    .find(Array.isArray) as T[] | undefined;
  return {
    rows: rows || [],
    total: Number(root.total ?? root.count ?? nested.total ?? nested.count ?? rows?.length ?? 0),
  };
}

function billRevenue(bill: Record<string, any>) {
  const status = String(bill.status || bill.payment_status || '').toLowerCase();
  if (status === 'cancelled' || status === 'canceled') return 0;
  return Number(bill.total_amount ?? bill.net_amount ?? 0) || 0;
}

export function usePharmacistDashboard() {
  const { token, activeClinicId } = useAuthContext();
  const [data, setData] = useState<PharmacistDashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestSequence = useRef(0);

  const refresh = useCallback(async (isRefresh = false) => {
    const requestId = ++requestSequence.current;
    if (!token || !activeClinicId) {
      setData(emptyData);
      setLoading(false);
      setRefreshing(false);
      setError(!token ? 'Sign in to view pharmacy data.' : 'Select a clinic to view pharmacy data.');
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    const today = new Date();
    const todayKey = dateKey(today);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const weekStartKey = dateKey(weekStart);
    const monthKey = todayKey.slice(0, 7);

    try {
      const [kpiResult, revenueResult, weekBillsResult, inventoryResult, lowStockResult, recentBillsResult] = await Promise.allSettled([
        getDashboardKpiApi(activeClinicId),
        getRevenueChartApi(activeClinicId, 1),
        getMedicineBillsApi(token, { clinic_id: activeClinicId, date_from: weekStartKey, date_to: todayKey, page: 1, limit: 100 }),
        getMedicinesApi(token, { clinic_id: activeClinicId, page: 1, limit: 1, is_active: 1 }),
        getLowStockMedicinesApi(token, activeClinicId),
        getMedicineBillsApi(token, { clinic_id: activeClinicId, page: 1, limit: 5 }),
      ]);

      const kpi = kpiResult.status === 'fulfilled' && kpiResult.value.success
        ? (kpiResult.value.data as any)?.stats || {}
        : {};
      const revenueRows = revenueResult.status === 'fulfilled' && revenueResult.value.success
        ? ((revenueResult.value.data as any)?.revenue || [])
        : [];
      const firstWeekPage = weekBillsResult.status === 'fulfilled' && weekBillsResult.value.success
        ? unwrapRows<Record<string, any>>(weekBillsResult.value.data)
        : { rows: [], total: 0 };
      const weekBills = [...firstWeekPage.rows];
      const weekPageCount = Math.ceil(firstWeekPage.total / 100);
      if (weekPageCount > 1) {
        const remainingPages = await Promise.allSettled(
          Array.from({ length: weekPageCount - 1 }, (_, index) =>
            getMedicineBillsApi(token, {
              clinic_id: activeClinicId,
              date_from: weekStartKey,
              date_to: todayKey,
              page: index + 2,
              limit: 100,
            }),
          ),
        );
        remainingPages.forEach(result => {
          if (result.status === 'fulfilled' && result.value.success) {
            weekBills.push(...unwrapRows<Record<string, any>>(result.value.data).rows);
          }
        });
      }
      const inventory = inventoryResult.status === 'fulfilled' && inventoryResult.value.success
        ? unwrapRows<Medicine>(inventoryResult.value.data)
        : { rows: [], total: 0 };
      const lowStock = lowStockResult.status === 'fulfilled' && lowStockResult.value.success
        ? unwrapRows<Medicine>(lowStockResult.value.data)
        : { rows: [], total: 0 };
      const recentBills = recentBillsResult.status === 'fulfilled' && recentBillsResult.value.success
        ? unwrapRows<Record<string, any>>(recentBillsResult.value.data).rows
        : [];

      const currentMonthRevenue = Array.isArray(revenueRows)
        ? revenueRows
          .filter((row: Record<string, any>) => row.type === 'medicine' && String(row.month || '').slice(0, 7) === monthKey)
          .reduce((sum: number, row: Record<string, any>) => sum + (Number(row.revenue) || 0), 0)
        : 0;
      const weekRevenue = weekBills.reduce((sum, bill) => sum + billRevenue(bill), 0);
      const recentBillDetails = await Promise.allSettled(
        recentBills.slice(0, 5).map(bill => getMedicineBillByIdApi(token, bill.id)),
      );
      const sales = new Map<string, number>();
      recentBillDetails.forEach(result => {
        if (result.status !== 'fulfilled' || !result.value.success) return;
        const payload = result.value.data as any;
        const bill = payload?.bill || payload;
        const items = Array.isArray(bill?.items) ? bill.items : [];
        items.forEach((item: Record<string, any>) => {
          const name = String(item.medicine_name || item.name || '').trim();
          if (name) sales.set(name, (sales.get(name) || 0) + (Number(item.quantity) || 0));
        });
      });

      if (requestId !== requestSequence.current) return;
      setData({
        todayRevenue: Number(kpi.medicine_revenue_today) || 0,
        weekRevenue,
        monthRevenue: currentMonthRevenue,
        totalMedicines: inventory.total,
        lowStockCount: Number(kpi.low_stock_medicines ?? lowStock.total) || 0,
        lowStockMedicines: lowStock.rows.slice(0, 5),
        recentSales: Array.from(sales, ([name, totalSold]) => ({ name, totalSold })).slice(0, 5),
      });

      const coreResults = [kpiResult, revenueResult, weekBillsResult, inventoryResult];
      const failedCoreCount = coreResults.filter(result =>
        result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success),
      ).length;
      if (failedCoreCount > 0) {
        setError('Some pharmacy dashboard data could not be loaded. Pull down to retry.');
      }
    } catch (cause) {
      if (requestId === requestSequence.current) {
        setError(cause instanceof Error ? cause.message : 'Pharmacy dashboard data could not be loaded.');
      }
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [activeClinicId, token]);

  useEffect(() => {
    refresh().catch(() => undefined);
    return () => { requestSequence.current += 1; };
  }, [refresh]);

  return { data, loading, refreshing, error, refresh: () => refresh(true) };
}
