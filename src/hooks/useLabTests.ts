import { useCallback, useEffect, useState } from 'react';
import {
  createLabTestOrderApi,
  getLabReportByTestIdApi,
  getLabReportsApi,
  getLabTestOrdersApi,
  updateLabReportApi,
  updateLabTestOrderApi,
  updateLabTestStatusApi,
  uploadLabReportApi,
} from '../api/labApi';
import { useAuthContext } from '../context/AuthContext';
import { LabReport, LabTestOrder } from '../types/clinicTypes';

export interface LabStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalReports: number;
  patientsCount: number;
}

export const useLabTests = () => {
  const { token, user } = useAuthContext();
  const [testOrders, setTestOrders] = useState<LabTestOrder[]>([]);
  const [reports, setReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchLabData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const clinicId = (user as any)?.clinic_id || (user as any)?.clinicId || (user as any)?.activeClinicId;
      const doctorId = user?.id || (user as any)?.userId;

      const ordersRes = await getLabTestOrdersApi(token, { clinic_id: clinicId, doctor_id: doctorId });
      if (ordersRes.success && ordersRes.data) {
        const rawOrders = Array.isArray(ordersRes.data)
          ? ordersRes.data
          : (ordersRes.data as any).tests || (ordersRes.data as any).data || [];
        setTestOrders(rawOrders);
      } else {
        setTestOrders([]);
      }

      try {
        const reportsRes = await getLabReportsApi(token, { clinic_id: clinicId, doctor_id: doctorId });
        if (reportsRes.success && reportsRes.data) {
          const rawReports = Array.isArray(reportsRes.data)
            ? reportsRes.data
            : (reportsRes.data as any).reports || (reportsRes.data as any).data || [];
          setReports(rawReports);
        } else {
          setReports([]);
        }
      } catch (repErr) {
        setReports([]);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading lab diagnostic data');
    } finally {
      setLoading(false);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, [token, user]);

  useEffect(() => {
    fetchLabData();
  }, [fetchLabData]);

  const createOrder = async (orderData: Partial<LabTestOrder>) => {
    if (!token) return { success: false, message: 'Authentication required' };
    setLoading(true);
    try {
      const clinicId = (user as any)?.clinic_id || (user as any)?.clinicId || 1;
      const res = await createLabTestOrderApi(token, {
        ...orderData,
        clinic_id: orderData.clinic_id || clinicId,
      });
      if (res.success) {
        await fetchLabData();
        return { success: true, test: res.data?.test };
      }
      return { success: false, message: res.message || 'Failed to create lab order' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Server error' };
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, newStatus: string) => {
    if (!token) return { success: false, message: 'Authentication required' };
    try {
      const res = await updateLabTestStatusApi(token, id, newStatus);
      if (res.success) {
        await fetchLabData();
        return { success: true };
      }
      return { success: false, message: res.message || 'Failed to update test status' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Server error' };
    }
  };

  const uploadReport = async (reportData: Partial<LabReport>) => {
    if (!token) return { success: false, message: 'Authentication required' };
    setLoading(true);
    try {
      const res = await uploadLabReportApi(token, reportData);
      if (res.success) {
        await fetchLabData();
        return { success: true, report: res.data?.report };
      }
      return { success: false, message: res.message || 'Failed to upload report' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Server error' };
    } finally {
      setLoading(false);
    }
  };

  const editOrder = async (id: number, testData: Partial<LabTestOrder>) => {
    if (!token) return { success: false, message: 'Authentication required' };
    setLoading(true);
    try {
      const res = await updateLabTestOrderApi(token, id, testData);
      if (res.success) {
        await fetchLabData();
        return { success: true };
      }
      return { success: false, message: res.message || 'Failed to update test order' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Server error' };
    } finally {
      setLoading(false);
    }
  };

  const editReport = async (id: number, reportData: Partial<LabReport>) => {
    if (!token) return { success: false, message: 'Authentication required' };
    setLoading(true);
    try {
      const res = await updateLabReportApi(token, id, reportData);
      if (res.success) {
        await fetchLabData();
        return { success: true };
      }
      return { success: false, message: res.message || 'Failed to update lab report' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Server error' };
    } finally {
      setLoading(false);
    }
  };

  const getReportForTest = async (testId: number) => {
    if (!token) return null;
    try {
      const res = await getLabReportByTestIdApi(token, testId);
      if (res.success && res.data) {
        return res.data.report || null;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const pendingCount = testOrders.filter((t) =>
    ['ordered', 'sample_collected', 'in_progress', 'pending'].includes(String(t.status || '').toLowerCase())
  ).length;

  const completedCount = testOrders.filter((t) =>
    ['completed', 'verified', 'done'].includes(String(t.status || '').toLowerCase())
  ).length;

  const uniquePatients = new Set(testOrders.map((t) => t.patient_id).filter(Boolean)).size;

  const stats: LabStats = {
    totalOrders: testOrders.length,
    pendingOrders: pendingCount,
    completedOrders: completedCount,
    totalReports: reports.length,
    patientsCount: uniquePatients,
  };

  return {
    testOrders,
    labTests: testOrders,
    reports,
    stats,
    patientsCount: uniquePatients,
    activeCount: pendingCount,
    reportsCount: reports.length,
    loading,
    error,
    lastRefreshed,
    refreshLabData: fetchLabData,
    refreshLabTests: fetchLabData,
    createOrder,
    editOrder,
    updateStatus,
    uploadReport,
    editReport,
    getReportForTest,
  };
};

export default useLabTests;
