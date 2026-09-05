import { useCallback, useEffect, useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import {
  adjustMedicineStockApi,
  createMedicineApi,
  getLowStockMedicinesApi,
  getMedicinesApi,
  searchMedicinesApi,
} from '../api/medicineApi';
import { getPrescriptionsApi } from '../api/prescriptionApi';
import { Medicine } from '../types/clinicTypes';

export interface MedicineStats {
  total_medicines: number;
  in_stock_count: number;
  low_stock_count: number;
  stock_value: number;
}

const doctorAddedMedicinesMap: Record<number, Medicine[]> = {};

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
      const isDoc =
        String((user as any)?.roleName || (user as any)?.role_name || (user as any)?.role || '')
          .toLowerCase()
          .includes('doctor') ||
        Number((user as any)?.roleId || (user as any)?.role_id) === 3 ||
        Number((user as any)?.is_doctor) === 1 ||
        Boolean((user as any)?.specialization);
      const doctorId = user?.id || (user as any)?.userId;
      const clinicId = (user as any)?.clinic_id || (user as any)?.clinicId || (user as any)?.activeClinicId || 1;

      const res = await getMedicinesApi(token, clinicId);
      if (res.success && res.data) {
        const rawList: Medicine[] = Array.isArray(res.data)
          ? res.data
          : (res.data as any).medicines || (res.data as any).data || [];

        let scopedList: Medicine[] = [];

        if (isDoc && doctorId) {
          const prescribedNamesSet = new Set<string>();
          const prescribedIdsSet = new Set<number>();

          try {
            const rxRes = await getPrescriptionsApi(token);
            if (rxRes.success && rxRes.data) {
              const rxList = Array.isArray(rxRes.data)
                ? rxRes.data
                : (rxRes.data as any).prescriptions || (rxRes.data as any).data || [];

              rxList.forEach((rx: any) => {
                if (!rx.doctor_id || Number(rx.doctor_id) === Number(doctorId)) {
                  const items = Array.isArray(rx.items) ? rx.items : [];
                  items.forEach((item: any) => {
                    if (item.medicine_id) prescribedIdsSet.add(Number(item.medicine_id));
                    if (item.medicine_name) prescribedNamesSet.add(String(item.medicine_name).trim().toLowerCase());
                  });
                }
              });
            }
          } catch (rxErr) {}

          const docItems = rawList.filter((m: any) => {
            const mDocId = m.doctor_id || m.created_by || m.user_id || m.added_by;
            if (mDocId && Number(mDocId) === Number(doctorId)) return true;
            if (prescribedIdsSet.has(Number(m.id))) return true;
            if (m.name && prescribedNamesSet.has(String(m.name).trim().toLowerCase())) return true;
            return false;
          });

          const localMeds = doctorAddedMedicinesMap[doctorId] || [];
          const merged = [...docItems];
          localMeds.forEach((lm) => {
            if (!merged.some((c) => c.id === lm.id || c.name.toLowerCase() === lm.name.toLowerCase())) {
              merged.push(lm);
            }
          });

          // Show doctor's prescribed/added medicines if available, otherwise show available catalog so screen is never empty!
          scopedList = merged.length > 0 ? merged : rawList;
        } else {
          scopedList = rawList;
        }

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

        setMedicines(scopedList);

        setStats({
          total_medicines: scopedList.length,
          in_stock_count: inStockItems.length,
          low_stock_count: lowStockItems.length,
          stock_value: calculatedStockValue,
        });
      } else {
        setMedicines([]);
        setStats({
          total_medicines: 0,
          in_stock_count: 0,
          low_stock_count: 0,
          stock_value: 0,
        });
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
      const doctorId = user?.id || (user as any)?.userId;
      const res = await createMedicineApi(token, medicineData);

      const newMed: Medicine = {
        id: (res.data as any)?.id || Math.floor(Date.now() % 10000),
        name: medicineData.name || '',
        category: medicineData.category || 'General',
        unit_price: Number(medicineData.unit_price || medicineData.selling_price || 0),
        selling_price: Number(medicineData.selling_price || medicineData.unit_price || 0),
        stock_quantity: Number(medicineData.stock_quantity || 0),
        reorder_level: Number(medicineData.reorder_level || 10),
        is_active: true,
        ...res.data,
      };

      if (doctorId) {
        if (!doctorAddedMedicinesMap[doctorId]) {
          doctorAddedMedicinesMap[doctorId] = [];
        }
        doctorAddedMedicinesMap[doctorId].push(newMed);
      }

      await fetchMedicines();
      return { success: true, medicine: newMed };
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
