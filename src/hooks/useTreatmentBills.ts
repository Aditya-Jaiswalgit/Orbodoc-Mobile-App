import { useCallback, useEffect, useRef, useState } from 'react';
import { getTreatmentBillsApi } from '../api/billingApi';
import { TreatmentBill } from '../types/clinicTypes';

type Params = {
  token: string | null;
  clinicId: number | string | null;
  canView: boolean;
  status: string;
  search: string;
  page: number;
  pageSize: number;
};
function normalizeBills(value: unknown) {
  if (Array.isArray(value))
    return { bills: value as TreatmentBill[], total: value.length };
  const payload = (value || {}) as Record<string, unknown>;
  const rows = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload.bills)
    ? payload.bills
    : [];
  return {
    bills: rows as TreatmentBill[],
    total: Number(payload.total) || rows.length,
  };
}

export function useTreatmentBills({
  token,
  clinicId,
  canView,
  status,
  search,
  page,
  pageSize,
}: Params) {
  const [bills, setBills] = useState<TreatmentBill[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState('');
  const sequence = useRef(0);

  const refresh = useCallback(
    async (pullToRefresh = false) => {
      const requestId = ++sequence.current;
      if (!token || !canView) {
        setBills([]);
        setTotal(0);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setError('');
      if (pullToRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await getTreatmentBillsApi(token, {
          clinic_id: clinicId,
          status,
          search,
          page,
          limit: pageSize,
        });
        if (requestId !== sequence.current) return;
        if (!response.success)
          throw new Error(
            response.message || 'Unable to load treatment bills.',
          );

        const result = normalizeBills(response.data);
        setBills(result.bills);
        setTotal(result.total);
        setLastRefreshed(
          new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        );
      } catch (cause) {
        if (requestId !== sequence.current) return;
        setBills([]);
        setTotal(0);
        setError(
          cause instanceof Error
            ? cause.message
            : 'Unable to load treatment bills.',
        );
      } finally {
        if (requestId === sequence.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [canView, clinicId, page, pageSize, search, status, token],
  );

  useEffect(() => {
    refresh();
    return () => {
      sequence.current += 1;
    };
  }, [refresh]);
  return { bills, total, loading, refreshing, error, lastRefreshed, refresh };
}
