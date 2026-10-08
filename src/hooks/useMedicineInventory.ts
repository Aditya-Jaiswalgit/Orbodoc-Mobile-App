import { useCallback, useEffect, useRef, useState } from 'react';
import { getMedicinesApi } from '../api/medicineApi';
import { Medicine } from '../types/clinicTypes';

type Params = {
  token: string | null;
  clinicId: number | string | null;
  canView: boolean;
  page: number;
  pageSize: number;
  search: string;
  refreshKey?: number;
};
type InventoryResult = { medicines: Medicine[]; total: number };

function normalizeInventory(data: unknown): InventoryResult {
  if (Array.isArray(data))
    return { medicines: data as Medicine[], total: data.length };
  const root = (data || {}) as Record<string, unknown>;
  const nested = (root.data || {}) as Record<string, unknown>;
  const rows = [
    root.data,
    root.medicines,
    root.rows,
    nested.data,
    nested.medicines,
  ].find(Array.isArray) as Medicine[] | undefined;
  const medicines = rows || [];
  return {
    medicines,
    total: Number(
      root.total ??
        root.count ??
        nested.total ??
        nested.count ??
        medicines.length,
    ),
  };
}

export function useMedicineInventory({
  token,
  clinicId,
  canView,
  page,
  pageSize,
  search,
  refreshKey = 0,
}: Params) {
  const [data, setData] = useState<InventoryResult>({
    medicines: [],
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestSequence = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestSequence.current;
    if (!token || !canView) {
      setData({ medicines: [], total: 0 });
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await getMedicinesApi(token, {
        clinic_id: clinicId,
        page,
        limit: pageSize,
        search,
        low_stock: false,
        is_active: 1,
      });
      if (requestId !== requestSequence.current) return;
      if (!response.success)
        throw new Error(
          response.message || 'Unable to load the medicine inventory.',
        );
      setData(normalizeInventory(response.data));
    } catch (cause) {
      if (requestId !== requestSequence.current) return;
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to load the medicine inventory.',
      );
      setData({ medicines: [], total: 0 });
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [canView, clinicId, page, pageSize, search, token]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);
  return { ...data, loading, error, refresh };
}
