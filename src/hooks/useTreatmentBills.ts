import { useCallback, useEffect, useState } from 'react';
import {
  getTreatmentBillsApi,
  getTreatmentBillByIdApi,
  createTreatmentBillApi,
  recordPaymentApi,
  TreatmentBill,
} from '../api/treatmentBillApi';
import { useAuthContext } from '../context/AuthContext';

export const useTreatmentBills = () => {
  const { token } = useAuthContext();
  const [bills, setBills] = useState<TreatmentBill[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchBills = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getTreatmentBillsApi(token);
      if (res.success && res.data) {
        const rawList = Array.isArray(res.data)
          ? res.data
          : (res.data as any).treatment_bills || (res.data as any).bills || (res.data as any).data || [];
        setBills(rawList);
      } else {
        setError(res.message || 'Failed to fetch treatment bills');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading treatment bills');
    } finally {
      setLoading(false);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, [token]);

  const fetchBillDetails = async (id: number) => {
    if (!token) return null;
    try {
      const res = await getTreatmentBillByIdApi(token, id);
      if (res.success && res.data) {
        return (res.data as any).treatment_bill || (res.data as any).bill || res.data;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const createBill = async (data: Partial<TreatmentBill>) => {
    if (!token) throw new Error('Authentication required');
    const res = await createTreatmentBillApi(token, data);
    if (res.success) {
      fetchBills();
    }
    return res;
  };

  const recordPayment = async (id: number, amount: number, method: string) => {
    if (!token) throw new Error('Authentication required');
    const res = await recordPaymentApi(token, id, { amount, payment_method: method });
    if (res.success) {
      fetchBills();
    }
    return res;
  };

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  return {
    bills,
    loading,
    error,
    lastRefreshed,
    refreshBills: fetchBills,
    fetchBillDetails,
    createBill,
    recordPayment,
  };
};

export default useTreatmentBills;
