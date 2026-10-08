import { useCallback, useEffect, useRef, useState } from 'react';
import { getMedicineBillsApi } from '../api/billingApi';

type Params = {
  token: string | null;
  clinicId: number | string | null;
  canView: boolean;
  search: string;
  status: string;
  date?: string;
  page: number;
  pageSize: number;
};
function extractRows<T>(value: unknown): { rows: T[]; total: number } {
  if (Array.isArray(value)) return { rows: value as T[], total: value.length };
  const root = (value || {}) as Record<string, unknown>;
  const nested = (root.data || {}) as Record<string, unknown>;
  const rows = [root.data, root.bills, nested.data, nested.bills].find(
    Array.isArray,
  ) as T[] | undefined;
  return {
    rows: rows || [],
    total: Number(
      root.total ??
        root.count ??
        nested.total ??
        nested.count ??
        rows?.length ??
        0,
    ),
  };
}

export function useMedicineBills<T>(params: Params) {
  const [bills, setBills] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState('');
  const sequence = useRef(0);
  const { token, clinicId, canView, search, status, date, page, pageSize } =
    params;

  const refresh = useCallback(async () => {
    const requestId = ++sequence.current;
    if (!token || !canView) {
      setBills([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await getMedicineBillsApi(token, {
        clinic_id: clinicId,
        search,
        status,
        date,
        page,
        limit: pageSize,
      });
      if (requestId !== sequence.current) return;
      if (!response.success)
        throw new Error(response.message || 'Unable to load medicine bills.');

      const result = extractRows<T>(response.data);
      setBills(result.rows);
      setTotal(result.total);
      setLastRefreshed(
        new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
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
          : 'Unable to load medicine bills.',
      );
    } finally {
      if (requestId === sequence.current) setLoading(false);
    }
  }, [canView, clinicId, date, page, pageSize, search, status, token]);

  useEffect(() => {
    refresh();
    return () => {
      sequence.current += 1;
    };
  }, [refresh]);
  return { bills, total, loading, error, lastRefreshed, refresh };
}
