import { useCallback, useEffect, useState } from 'react';
import {
  createLabCatalogItemApi,
  getLabCatalogApi,
  getMasterLabTestsApi,
  LabCatalogItem,
  mapMasterLabTestApi,
  updateLabCatalogItemApi,
} from '../api/labApi';
import { useAuthContext } from '../context/AuthContext';

export function useLabInventory() {
  const { user, token: authContextToken } = useAuthContext();
  const token = authContextToken || (user as any)?.token || (user as any)?.accessToken || '';

  const [catalog, setCatalog] = useState<LabCatalogItem[]>([]);
  const [masterTests, setMasterTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const clinicId = getEffectiveClinicId();
      const res = await getLabCatalogApi(token, clinicId);
      if (res.success && res.data) {
        let rawList: LabCatalogItem[] = [];
        if (Array.isArray(res.data)) {
          rawList = res.data;
        } else if (Array.isArray((res.data as any).data)) {
          rawList = (res.data as any).data;
        } else if (Array.isArray((res.data as any).catalog)) {
          rawList = (res.data as any).catalog;
        } else if (Array.isArray((res as any).data?.data)) {
          rawList = (res as any).data.data;
        }
        setCatalog(rawList);
      } else {
        setError(res.message || 'Failed to load clinic lab inventory');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching clinic lab catalog');
    } finally {
      setLoading(false);
    }
  }, [token, getEffectiveClinicId]);

  const fetchMasterTests = useCallback(async () => {
    try {
      const clinicId = getEffectiveClinicId();
      const res = await getMasterLabTestsApi(token, clinicId);
      if (res.success && res.data) {
        let rawList: any[] = [];
        if (Array.isArray(res.data)) {
          rawList = res.data;
        } else if (Array.isArray((res.data as any).data)) {
          rawList = (res.data as any).data;
        } else if (Array.isArray((res.data as any).tests)) {
          rawList = (res.data as any).tests;
        }
        setMasterTests(rawList);
      }
    } catch (err) {
      // silent
    }
  }, [token, getEffectiveClinicId]);

  useEffect(() => {
    fetchCatalog();
    fetchMasterTests();
  }, [fetchCatalog, fetchMasterTests]);

  const addCatalogItem = async (itemData: Partial<LabCatalogItem>) => {
    setLoading(true);
    try {
      const clinicId = getEffectiveClinicId();
      const payload: any = {
        ...itemData,
        clinic_id: (itemData as any).clinic_id || clinicId,
      };
      const res = await createLabCatalogItemApi(token, payload);
      if (res.success || res.data) {
        const createdItem = (res.data as any)?.item || {
          id: Date.now(),
          ...payload,
        };
        setCatalog((prev) => {
          const exists = prev.some((p) => p.id === createdItem.id);
          if (exists) return prev.map((p) => (p.id === createdItem.id ? createdItem : p));
          return [createdItem, ...prev];
        });
        await fetchCatalog();
        return { success: true, message: 'Lab catalog test added successfully' };
      }
      return { success: false, message: res.message || 'Failed to add catalog item' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error adding catalog item' };
    } finally {
      setLoading(false);
    }
  };

  const mapMasterTest = async (mapData: {
    lab_test_id: number;
    price: number;
    discount_price?: number;
    home_collection_available?: number;
    is_available?: number;
    clinic_id?: number;
  }) => {
    setLoading(true);
    try {
      const clinicId = getEffectiveClinicId();
      const payload = {
        ...mapData,
        clinic_id: mapData.clinic_id || clinicId,
      };
      const res = await mapMasterLabTestApi(token, payload);
      if (res.success || res.data) {
        const mappedItem = (res.data as any)?.item;
        if (mappedItem) {
          setCatalog((prev) => {
            const exists = prev.some((p) => p.id === mappedItem.id);
            if (exists) return prev.map((p) => (p.id === mappedItem.id ? mappedItem : p));
            return [mappedItem, ...prev];
          });
        }
        await fetchCatalog();
        await fetchMasterTests();
        return { success: true, message: 'Master test mapped to clinic catalog' };
      }
      return { success: false, message: res.message || 'Failed to map test' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error mapping test' };
    } finally {
      setLoading(false);
    }
  };

  const updateCatalogItem = async (id: number, itemData: Partial<LabCatalogItem>) => {
    setLoading(true);
    try {
      const clinicId = getEffectiveClinicId();
      const payload: any = {
        ...itemData,
        clinic_id: (itemData as any).clinic_id || clinicId,
      };
      const res = await updateLabCatalogItemApi(token, id, payload);
      if (res.success || res.data) {
        const updatedItem = (res.data as any)?.item;
        if (updatedItem) {
          setCatalog((prev) => prev.map((p) => (p.id === id ? { ...p, ...updatedItem } : p)));
        }
        await fetchCatalog();
        return { success: true, message: 'Lab catalog test updated successfully' };
      }
      return { success: false, message: res.message || 'Failed to update catalog test' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error updating catalog test' };
    } finally {
      setLoading(false);
    }
  };

  // Compute 4 dynamic Stat Metrics
  const mappedCount = catalog.length;
  const availableCount = catalog.filter(
    (c) => c.is_available === 1 || c.is_available === true || (c.is_available as any) === '1'
  ).length;
  const homeCollectionCount = catalog.filter(
    (c) =>
      c.home_collection_available === 1 ||
      c.home_collection_available === true ||
      (c.home_collection_available as any) === '1'
  ).length;
  const discountedCount = catalog.filter((c) => Number(c.discount_price) > 0).length;

  return {
    catalog,
    masterTests,
    loading,
    error,
    stats: {
      mappedCount,
      availableCount,
      homeCollectionCount,
      discountedCount,
    },
    fetchCatalog,
    fetchMasterTests,
    addCatalogItem,
    mapMasterTest,
    updateCatalogItem,
  };
}
