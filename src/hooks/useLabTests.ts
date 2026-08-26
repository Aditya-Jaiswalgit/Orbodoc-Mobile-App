import { useCallback, useEffect, useState } from 'react';
import {
  getLabTestOrdersApi,
  getLabReportsApi,
} from '../api/labApi';
import { useAuthContext } from '../context/AuthContext';

export interface LabTestItem {
  id: number;
  patient_id: number;
  patient_name?: string;
  patient_phone?: string;
  patient_code?: string;
  doctor_name?: string;
  test_name?: string;
  tests_count?: number;
  total_price?: number;
  status?: string;
  created_at?: string;
}

export const useLabTests = () => {
  const { token } = useAuthContext();
  const [labTests, setLabTests] = useState<LabTestItem[]>([]);
  const [reportsCount, setReportsCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchLabData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getLabTestOrdersApi(token);
      if (res.success && res.data) {
        const rawList = Array.isArray(res.data)
          ? res.data
          : (res.data as any).tests || (res.data as any).data || [];
        setLabTests(rawList);
      }

      try {
        const repRes = await getLabReportsApi(token);
        if (repRes.success && repRes.data) {
          const rawRep = Array.isArray(repRes.data)
            ? repRes.data
            : (repRes.data as any).reports || (repRes.data as any).data || [];
          setReportsCount(rawRep.length);
        }
      } catch (e) {}
    } catch (err: any) {
      setError(err.message || 'Error loading lab tests');
    } finally {
      setLoading(false);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, [token]);

  useEffect(() => {
    fetchLabData();
  }, [fetchLabData]);

  const activeCount = labTests.filter(
    (t) => t.status && !['complete', 'completed', 'cancelled'].includes(t.status.toLowerCase())
  ).length;

  const uniquePatientsCount = new Set(labTests.map((t) => t.patient_id)).size;

  return {
    labTests,
    patientsCount: uniquePatientsCount,
    activeCount,
    reportsCount,
    loading,
    error,
    lastRefreshed,
    refreshLabTests: fetchLabData,
  };
};

export default useLabTests;
