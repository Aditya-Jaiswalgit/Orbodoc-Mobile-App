import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPatientsApi, PatientStats } from '../api/patientApi';
import { PatientModel } from '../types/clinicTypes';

type Params = {
  token: string | null;
  clinicId: number | string | null;
  canView: boolean;
  page: number;
  pageSize: number;
  search: string;
  status: 'all' | 'active' | 'inactive';
};
const EMPTY_STATS: PatientStats = {
  total_patients: 0,
  active_patients: 0,
  inactive_patients: 0,
  today_visits: 0,
  new_this_week: 0,
};

export function usePatientDirectory({
  token,
  clinicId,
  canView,
  page,
  pageSize,
  search,
  status,
}: Params) {
  const [patients, setPatients] = useState<PatientModel[]>([]);
  const [stats, setStats] = useState<PatientStats>(EMPTY_STATS);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestSequence = useRef(0);
  const statsRequestSequence = useRef(0);

  const refresh = useCallback(
    async (pullToRefresh = false) => {
      const requestId = ++requestSequence.current;
      if (!canView || !token) {
        setPatients([]);
        setTotal(0);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setError('');
      if (pullToRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await fetchPatientsApi(
          {
            clinic_id: clinicId || undefined,
            page,
            limit: pageSize,
            search: search || undefined,
            is_active:
              status === 'all' ? undefined : status === 'active' ? 1 : 0,
          },
          token,
        );
        if (requestId !== requestSequence.current) return;
        if (!response.success || !response.data)
          throw new Error(response.message || 'Unable to fetch patients.');
        const rows = Array.isArray(response.data.data)
          ? response.data.data
          : [];
        setPatients(rows);
        setTotal(Number(response.data.total) || rows.length);
      } catch (cause) {
        if (requestId === requestSequence.current) {
          setPatients([]);
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to load patient records.',
          );
        }
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [canView, clinicId, page, pageSize, search, status, token],
  );

  const refreshStats = useCallback(async () => {
    const requestId = ++statsRequestSequence.current;
    if (!token || !canView) {
      setStats(EMPTY_STATS);
      return;
    }
    try {
      const response = await fetchPatientsApi(
        { clinic_id: clinicId || undefined, page: 1, limit: 1 },
        token,
      );
      if (requestId !== statsRequestSequence.current) return;
      if (!response.success || !response.data?.stats)
        throw new Error(response.message || 'Unable to load patient summary.');
      setStats(response.data.stats);
    } catch {
      if (requestId === statsRequestSequence.current) setStats(EMPTY_STATS);
    }
  }, [canView, clinicId, token]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);
  return {
    patients,
    stats,
    total,
    loading,
    refreshing,
    error,
    refresh,
    refreshStats,
  };
}
