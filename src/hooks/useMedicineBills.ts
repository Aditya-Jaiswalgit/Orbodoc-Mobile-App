import { useCallback, useEffect, useState } from 'react';
import {
  getMedicineBillsApi,
  getMedicineBillByIdApi,
  createMedicineBillApi,
  recordMedicinePaymentApi,
  MedicineBill,
} from '../api/medicineBillApi';
import { useAuthContext } from '../context/AuthContext';

export const useMedicineBills = () => {
  const { token } = useAuthContext();
  const [bills, setBills] = useState<MedicineBill[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBills = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getMedicineBillsApi(token);
      if (res.success && res.data) {
        const rawList = Array.isArray(res.data)
          ? res.data
          : (res.data as any).medicine_bills || (res.data as any).bills || (res.data as any).data || [];
        setBills(rawList);
      } else {
        setError(res.message || 'Failed to fetch medicine bills');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading medicine bills');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchBillDetails = async (id: number) => {
    if (!token) return null;
    try {
      const res = await getMedicineBillByIdApi(token, id);
      if (res.success && res.data) {
        return (res.data as any).medicine_bill || (res.data as any).bill || res.data;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const createBill = async (data: Partial<MedicineBill>) => {
    if (!token) throw new Error('Authentication required');
    const res = await createMedicineBillApi(token, data);
    if (res.success) {
      fetchBills();
    }
    return res;
  };

  const recordPayment = async (id: number, amount: number, method: string) => {
    if (!token) throw new Error('Authentication required');
    const res = await recordMedicinePaymentApi(token, id, { amount, payment_method: method });
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
    refreshBills: fetchBills,
    fetchBillDetails,
    createBill,
    recordPayment,
  };
};

export default useMedicineBills;
