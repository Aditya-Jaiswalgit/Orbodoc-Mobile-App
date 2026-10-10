import { useCallback, useRef, useState } from 'react';
import {
  getLabCatalogApi,
  getMasterLabTestsApi,
  LabCatalogQuery,
  MasterLabTestQuery,
  MobileMasterLabTest,
} from '../api/labApi';
import { LabCatalogRecord } from './useLabManagement';

type PageResult<T> = { data: T[]; total: number; page: number; limit: number };

const normalizePage = <T,>(value: unknown, fallbackLimit: number): PageResult<T> => {
  const root = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const nested = root.data && typeof root.data === 'object' && !Array.isArray(root.data)
    ? root.data as Record<string, unknown>
    : root;
  const rows = Array.isArray(nested.data)
    ? nested.data
    : Array.isArray(nested.items)
      ? nested.items
      : Array.isArray(value)
        ? value
        : [];
  return {
    data: rows as T[],
    total: Number(nested.total ?? rows.length) || 0,
    page: Number(nested.page ?? 1) || 1,
    limit: Number(nested.limit ?? fallbackLimit) || fallbackLimit,
  };
};

const formatRefreshTime = (date: Date) => {
  const day = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(date);
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', second: '2-digit',
  }).toLowerCase();
  return `${day}, ${time}`;
};

export function useLabInventory(token: string | null, clinicId: number | null) {
  const [catalogItems, setCatalogItems] = useState<LabCatalogRecord[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [masterTests, setMasterTests] = useState<MobileMasterLabTest[]>([]);
  const [masterTotal, setMasterTotal] = useState(0);
  const [masterLoading, setMasterLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState('');
  const [masterLastRefreshed, setMasterLastRefreshed] = useState('');
  const catalogRequest = useRef(0);
  const masterRequest = useRef(0);

  const loadCatalog = useCallback(async (query: LabCatalogQuery = {}) => {
    const request = ++catalogRequest.current;
    if (!token || !clinicId) {
      setCatalogItems([]);
      setCatalogTotal(0);
      setCatalogLoading(false);
      setLastRefreshed('');
      return;
    }
    setCatalogLoading(true);
    setError('');
    try {
      const response = await getLabCatalogApi(token, clinicId, query);
      if (!response.success) throw new Error(response.message || 'Could not load lab inventory');
      const page = normalizePage<LabCatalogRecord>(response.data, query.limit || 10);
      if (request !== catalogRequest.current) return;
      setCatalogItems(page.data);
      setCatalogTotal(page.total);
      setLastRefreshed(formatRefreshTime(new Date()));
    } catch (cause) {
      if (request !== catalogRequest.current) return;
      const message = cause instanceof Error ? cause.message : 'Could not load lab inventory';
      setError(message);
      throw cause;
    } finally {
      if (request === catalogRequest.current) setCatalogLoading(false);
    }
  }, [clinicId, token]);

  const loadMasterTests = useCallback(async (query: MasterLabTestQuery = {}) => {
    const request = ++masterRequest.current;
    if (!token || !clinicId) {
      setMasterTests([]);
      setMasterTotal(0);
      setMasterLoading(false);
      return;
    }
    setMasterLoading(true);
    try {
      const response = await getMasterLabTestsApi(token, clinicId, query);
      if (!response.success) throw new Error(response.message || 'Could not load master lab tests');
      const page = normalizePage<MobileMasterLabTest>(response.data, query.limit || 10);
      if (request !== masterRequest.current) return;
      setMasterTests(page.data);
      setMasterTotal(page.total);
      setMasterLastRefreshed(formatRefreshTime(new Date()));
    } catch (cause) {
      if (request === masterRequest.current) {
        setError(cause instanceof Error ? cause.message : 'Could not load master lab tests');
      }
      throw cause;
    } finally {
      if (request === masterRequest.current) setMasterLoading(false);
    }
  }, [clinicId, token]);

  return {
    catalogItems,
    catalogTotal,
    catalogLoading,
    masterTests,
    masterTotal,
    masterLoading,
    error,
    lastRefreshed,
    masterLastRefreshed,
    loadCatalog,
    loadMasterTests,
  };
}
