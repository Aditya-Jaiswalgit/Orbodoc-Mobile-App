import { useCallback, useEffect, useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import {
  createTreatmentBillApi,
  getTreatmentBillByIdApi,
  getTreatmentBillsApi,
  recordPaymentApi,
  TreatmentBill,
} from '../api/treatmentBillApi';

export interface TreatmentBillingStats {
  total_bills: number;
  total_revenue: number;
  paid_count: number;
  pending_count: number;
  total_due: number;
}

export const useTreatmentBilling = () => {
  const { token } = useAuthContext();
  const [bills, setBills] = useState<TreatmentBill[]>([]);
  const [selectedBill, setSelectedBill] = useState<TreatmentBill | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TreatmentBillingStats>({
    total_bills: 0,
    total_revenue: 0,
    paid_count: 0,
    pending_count: 0,
    total_due: 0,
  });

  const fetchTreatmentBills = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getTreatmentBillsApi(token);
      if (res.success && res.data) {
        const rawList = Array.isArray(res.data)
          ? res.data
          : (res.data as any).bills || (res.data as any).data || [];

        setBills(rawList);

        const totalRevenue = rawList.reduce((sum, b) => {
          const paid = Number(b.paid_amount ?? (String(b.status).toLowerCase() === 'paid' ? b.total_amount : 0));
          return sum + (isNaN(paid) ? 0 : paid);
        }, 0);

        const totalDue = rawList.reduce((sum, b) => {
          const due = Number(b.due_amount ?? (['unpaid', 'pending', 'partially_paid'].includes(String(b.status).toLowerCase()) ? b.total_amount : 0));
          return sum + (isNaN(due) ? 0 : due);
        }, 0);

        const paidCount = rawList.filter((b) => String(b.status).toLowerCase() === 'paid').length;
        const pendingCount = rawList.filter((b) =>
          ['unpaid', 'pending', 'partially_paid'].includes(String(b.status).toLowerCase())
        ).length;

        setStats({
          total_bills: rawList.length,
          total_revenue: totalRevenue,
          paid_count: paidCount,
          pending_count: pendingCount,
          total_due: totalDue,
        });
      } else {
        setBills([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load treatment bills');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchBillDetails = async (id: number) => {
    if (!token) return null;
    setDetailsLoading(true);
    try {
      const res = await getTreatmentBillByIdApi(token, id);
      if (res.success && res.data) {
        const billObj = (res.data as any).bill || (res.data as any).data || res.data;
        setSelectedBill(billObj);
        return billObj;
      }
      return null;
    } catch (err: any) {
      return null;
    } finally {
      setDetailsLoading(false);
    }
  };

  const createBill = async (billData: Partial<TreatmentBill>) => {
    if (!token) return { success: false, message: 'Authentication required' };
    setLoading(true);
    try {
      const res = await createTreatmentBillApi(token, billData);
      if (res.success) {
        await fetchTreatmentBills();
        return { success: true, bill: res.data };
      }
      return { success: false, message: res.message || 'Failed to create bill' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Server error' };
    } finally {
      setLoading(false);
    }
  };

  const recordBillPayment = async (id: number, amount: number, paymentMethod: string) => {
    if (!token) return { success: false, message: 'Authentication required' };
    setLoading(true);
    try {
      const res = await recordPaymentApi(token, id, { amount, payment_method: paymentMethod });
      if (res.success) {
        await fetchTreatmentBills();
        return { success: true };
      }
      return { success: false, message: res.message || 'Payment recording failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Server error' };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreatmentBills();
  }, [fetchTreatmentBills]);

  return {
    bills,
    selectedBill,
    stats,
    loading,
    detailsLoading,
    error,
    refreshBills: fetchTreatmentBills,
    fetchBillDetails,
    createBill,
    recordBillPayment,
  };
};

export default useTreatmentBilling;
