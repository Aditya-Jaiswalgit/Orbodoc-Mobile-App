import { useCallback, useEffect, useState } from 'react';
import {
  getMedicineBillsApi,
  getMedicineBillByIdApi,
  createMedicineBillApi,
  updateMedicineBillApi,
  cancelMedicineBillApi,
  recordMedicinePaymentApi,
  MedicineBill,
} from '../api/medicineBillApi';
import { useAuthContext } from '../context/AuthContext';

export const useMedicineBills = () => {
  const { user, token: authContextToken } = useAuthContext();
  const token = authContextToken || (user as any)?.token || (user as any)?.accessToken || '';

  const [bills, setBills] = useState<MedicineBill[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getEffectiveClinicId = useCallback((): number => {
    const raw =
      (user as any)?.clinic_id ||
      (user as any)?.clinicId ||
      (user as any)?.activeClinicId ||
      ((user as any)?.clinics && (user as any).clinics[0]?.id) ||
      1;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }, [user]);

  const fetchBills = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const clinicId = getEffectiveClinicId();
      const query = `clinic_id=${clinicId}&limit=500`;
      const res = await getMedicineBillsApi(token, query);
      if (res.success && res.data) {
        let rawList: MedicineBill[] = [];
        if (Array.isArray(res.data)) {
          rawList = res.data;
        } else if (Array.isArray((res.data as any).data)) {
          rawList = (res.data as any).data;
        } else if (Array.isArray((res.data as any).medicine_bills)) {
          rawList = (res.data as any).medicine_bills;
        } else if (Array.isArray((res.data as any).bills)) {
          rawList = (res.data as any).bills;
        }
        setBills(rawList);
      } else {
        setError(res.message || 'Failed to fetch medicine bills');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading medicine bills');
    } finally {
      setLoading(false);
    }
  }, [token, getEffectiveClinicId]);

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
    const clinicId = getEffectiveClinicId();
    const payload = {
      ...data,
      clinic_id: data.clinic_id || clinicId,
    };
    const res = await createMedicineBillApi(token, payload);
    if (res.success) {
      await fetchBills();
    }
    return res;
  };

  const updateBill = async (id: number, data: Partial<MedicineBill>) => {
    if (!token) throw new Error('Authentication required');
    const clinicId = getEffectiveClinicId();
    const payload = {
      ...data,
      clinic_id: data.clinic_id || clinicId,
    };
    const res = await updateMedicineBillApi(token, id, payload);
    if (res.success) {
      await fetchBills();
    }
    return res;
  };

  const cancelBill = async (id: number, reason?: string) => {
    if (!token) throw new Error('Authentication required');
    const res = await cancelMedicineBillApi(token, id, reason);
    if (res.success) {
      await fetchBills();
    }
    return res;
  };

  const recordPayment = async (
    id: number,
    amountOrData: number | { amount: number; payment_method: string },
    method?: string
  ) => {
    if (!token) throw new Error('Authentication required');
    const paymentData =
      typeof amountOrData === 'object'
        ? amountOrData
        : { amount: amountOrData, payment_method: method || 'cash' };
    const res = await recordMedicinePaymentApi(token, id, paymentData);
    if (res.success) {
      await fetchBills();
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
    updateBill,
    cancelBill,
    recordPayment,
  };
};

export default useMedicineBills;
