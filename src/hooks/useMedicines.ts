import { useCallback, useEffect, useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import {
  adjustMedicineStockApi,
  createMedicineApi,
  getLowStockMedicinesApi,
  getMedicinesApi,
  searchMedicinesApi,
} from '../api/medicineApi';
import { Medicine } from '../types/clinicTypes';

export interface MedicineStats {
  total_medicines: number;
  in_stock_count: number;
  low_stock_count: number;
  stock_value: number;
}

export const useMedicines = () => {
  const { token, user } = useAuthContext();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MedicineStats>({
    total_medicines: 0,
    in_stock_count: 0,
    low_stock_count: 0,
    stock_value: 0,
  });

  const fetchMedicines = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const doctorId = user?.id || (user as any)?.userId;
      const clinicId = (user as any)?.clinic_id || (user as any)?.clinicId || (user as any)?.activeClinicId || 1;
      const res = await getMedicinesApi(token, clinicId, doctorId);
      if (res.success && res.data) {
        let rawList: Medicine[] = Array.isArray(res.data)
          ? res.data
          : (res.data as any).medicines || (res.data as any).data || [];

        const totalCatalogCount = Number((res.data as any).total || rawList.length || 0);

        const scopedList = (clinicId && rawList.some((m: any) => m.clinic_id))
          ? rawList.filter((m: any) => Number(m.clinic_id) === Number(clinicId))
          : rawList;

        const inStockItems = scopedList.filter((m) => Number(m.stock_quantity || m.quantity || 0) > 0);

        const lowStockItems = inStockItems.filter((m) => {
          const qty = Number(m.stock_quantity || m.quantity || 0);
          const minQty = Number(m.reorder_level || m.min_stock_alert || m.min_stock || 10);
          return qty > 0 && qty <= minQty;
        });

        const calculatedStockValue = inStockItems.reduce((sum, m) => {
          const qty = Number(m.stock_quantity || m.quantity || 0);
          const price = Number(m.unit_price || m.selling_price || m.price || 0);
          return sum + qty * price;
        }, 0);

        setMedicines(inStockItems);

        setStats({
          total_medicines: totalCatalogCount > 0 ? totalCatalogCount : scopedList.length,
          in_stock_count: inStockItems.length,
          low_stock_count: lowStockItems.length,
          stock_value: calculatedStockValue,
        });
      } else {
        setMedicines([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch medicines inventory');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  const searchMedicines = async (query: string) => {
    if (!token) return;
    if (!query.trim()) {
      fetchMedicines();
      return;
    }
    setLoading(true);
    try {
      const res = await searchMedicinesApi(token, query);
      if (res.success && res.data) {
        const list = Array.isArray(res.data)
          ? res.data
          : (res.data as any).medicines || (res.data as any).data || [];
        setMedicines(list);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const addMedicine = async (medicineData: Partial<Medicine>) => {
    if (!token) return { success: false, message: 'Authentication required' };
    setLoading(true);
    try {
      const res = await createMedicineApi(token, medicineData);
      if (res.success) {
        await fetchMedicines();
        return { success: true, medicine: res.data };
      }
      return { success: false, message: res.message || 'Failed to add medicine' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Server error' };
    } finally {
      setLoading(false);
    }
  };

  const updateStock = async (id: number, stockQuantity: number) => {
    if (!token) return { success: false, message: 'Authentication required' };
    setLoading(true);
    try {
      const res = await adjustMedicineStockApi(token, id, stockQuantity);
      if (res.success) {
        await fetchMedicines();
        return { success: true };
      }
      return { success: false, message: res.message || 'Failed to update stock' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Server error' };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  return {
    medicines,
    stats,
    loading,
    error,
    refreshMedicines: fetchMedicines,
    searchMedicines,
    addMedicine,
    updateStock,
  };
};

export default useMedicines;
