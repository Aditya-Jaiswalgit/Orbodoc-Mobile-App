import { useCallback, useEffect, useState } from 'react';
import {
  getLabCatalogApi,
  getLabReportsApi,
  getLabTestOrdersApi,
} from '../api/labApi';

export interface LabTestRecord {
  id: number;
  clinic_id: number;
  patient_id: number;
  patient_name?: string;
  doctor_id?: number | null;
  doctor_name?: string | null;
  appointment_id?: number | null;
  test_name: string;
  test_code?: string | null;
  test_type?: string | null;
  urgency?: string | null;
  sample_type?: string | null;
  status: string;
  sample_collected_at?: string | null;
  expected_at?: string | null;
  price?: number | string | null;
  created_at?: string;
  report_ready?: number;
  report_uploaded_at?: string | null;
}

export interface LabReportRecord {
  id: number;
  lab_test_id: number;
  lab_technician_id?: number | null;
  technician_name?: string | null;
  test_name?: string | null;
  patient_id?: number | null;
  patient_name?: string | null;
  report_file_url?: string | null;
  report_data?: unknown;
  remarks?: string | null;
  reference_range?: string | null;
  is_abnormal?: number;
  uploaded_at?: string;
  price?: number | string | null;
}

export interface LabCatalogRecord {
  id: number;
  clinic_id: number;
  lab_test_id: number;
  test_name: string;
  test_code?: string | null;
  description?: string | null;
  price: number;
  discount_price?: number;
  home_collection_available?: number;
  is_available?: number;
  master_status?: number;
}

const listFrom = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  for (const key of ['data', 'tests', 'reports', 'items']) {
    const result = record[key];
    if (Array.isArray(result)) return result as T[];
    if (result && typeof result === 'object') {
      const nested = listFrom<T>(result);
      if (nested.length) return nested;
    }
  }
  return [];
};

const totalFrom = (value: unknown, count: number) => {
  if (!value || typeof value !== 'object') return count;
  const record = value as Record<string, unknown>;
  const nested =
    record.data && typeof record.data === 'object'
      ? (record.data as Record<string, unknown>)
      : record;
  return Number(nested.total || count);
};

async function fetchAllPages<T>(
  fetchPage: (page: number) => ReturnType<typeof getLabTestOrdersApi>,
  initial: unknown,
): Promise<T[]> {
  const first = listFrom<T>(initial);
  const total = totalFrom(initial, first.length);
  const pages = Math.ceil(total / 100);
  if (pages <= 1) return first;
  const results = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) => fetchPage(index + 2)),
  );
  return [...first, ...results.flatMap(response => listFrom<T>(response.data))];
}

export function useLabManagement(
  token: string | null,
  clinicId: number | null,
) {
  const [tests, setTests] = useState<LabTestRecord[]>([]);
  const [reports, setReports] = useState<LabReportRecord[]>([]);
  const [catalog, setCatalog] = useState<LabCatalogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState('');

  const refresh = useCallback(async () => {
    if (!token || !clinicId) {
      setTests([]);
      setReports([]);
      setCatalog([]);
      setError('');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    setError('');
    try {
      const [testResponse, reportResponse, catalogResponse] = await Promise.all(
        [
          getLabTestOrdersApi(token, clinicId, 1),
          getLabReportsApi(token, clinicId, 1),
          getLabCatalogApi(token, clinicId, { page: 1, limit: 100 }),
        ],
      );
      if (!testResponse.success)
        throw new Error(testResponse.message || 'Could not load lab tests');
      if (!reportResponse.success)
        throw new Error(reportResponse.message || 'Could not load lab reports');
      if (!catalogResponse.success)
        throw new Error(
          catalogResponse.message || 'Could not load lab inventory',
        );
      const [allTests, allReports, allCatalog] = await Promise.all([
        fetchAllPages<LabTestRecord>(
          page => getLabTestOrdersApi(token, clinicId, page),
          testResponse.data,
        ),
        fetchAllPages<LabReportRecord>(
          page => getLabReportsApi(token, clinicId, page),
          reportResponse.data,
        ),
        fetchAllPages<LabCatalogRecord>(
          page => getLabCatalogApi(token, clinicId, { page, limit: 100 }),
          catalogResponse.data,
        ),
      ]);
      setTests(allTests);
      setReports(allReports);
      setCatalog(allCatalog);
      const refreshedAt = new Date();
      const date = new Intl.DateTimeFormat('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      }).format(refreshedAt);
      const time = refreshedAt.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', second: '2-digit',
      }).toLowerCase();
      setLastRefreshed(`${date}, ${time}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not load lab data',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clinicId, token]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  return {
    tests,
    reports,
    catalog,
    loading,
    refreshing,
    error,
    lastRefreshed,
    refresh,
    setError,
  };
}
