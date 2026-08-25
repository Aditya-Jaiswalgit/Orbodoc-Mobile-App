import { useCallback, useEffect, useState } from 'react';
import { getPatientDashboardApi, PatientDashboardData } from '../api/patientApi';

export const usePatientDashboard = (token: string | null) => {
  const [dashboardData, setDashboardData] = useState<PatientDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const res = await getPatientDashboardApi(token);
      if (res.success && res.data) {
        setDashboardData(res.data);
      } else {
        setError(res.message || 'Failed to load dashboard data');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  return {
    dashboardData,
    loading,
    refreshing,
    error,
    onRefresh,
    refetch: fetchDashboard,
  };
};
