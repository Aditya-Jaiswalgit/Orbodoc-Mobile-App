import { useCallback, useEffect, useState } from 'react';
import {
  getWalletBalanceApi,
  getWalletTransactionsApi,
  getVideoAppointmentsApi,
  VideoAppointmentItem,
  WalletTransactionItem,
} from '../api/videoServicesApi';
import { useAuthContext } from '../context/AuthContext';

export const useVideoServices = () => {
  const { token } = useAuthContext();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [videoAppointments, setVideoAppointments] = useState<VideoAppointmentItem[]>([]);
  const [transactions, setTransactions] = useState<WalletTransactionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isVideoMode = (item: any): boolean => {
    const mode = String(item.consultation_mode || item.type || item.mode || 'video').toLowerCase();
    return (
      mode === 'video' ||
      mode === 'video_call' ||
      mode === 'video call' ||
      mode === 'online' ||
      mode === '' // default if unspecified in video endpoint
    );
  };

  const fetchVideoServicesData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Wallet Balance
      try {
        const balRes = await getWalletBalanceApi(token);
        if (balRes.success && balRes.data) {
          setWalletBalance(Number(balRes.data.balance || 0));
        }
      } catch (e) {}

      // 2. Fetch Video Appointments
      try {
        const apptRes = await getVideoAppointmentsApi(token);
        if (apptRes.success && apptRes.data) {
          const rawList = Array.isArray(apptRes.data)
            ? apptRes.data
            : (apptRes.data as any).appointments || (apptRes.data as any).data || [];

          // Strictly filter only video call appointments
          const videoOnly = rawList.filter(isVideoMode);
          setVideoAppointments(videoOnly);
        }
      } catch (e) {}

      // 3. Fetch Wallet Transactions
      try {
        const txRes = await getWalletTransactionsApi(token);
        if (txRes.success && txRes.data) {
          const rawTx = Array.isArray(txRes.data)
            ? txRes.data
            : (txRes.data as any).transactions || (txRes.data as any).data || [];
          setTransactions(rawTx);
        }
      } catch (e) {}
    } catch (err: any) {
      setError(err.message || 'Error loading video services');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchVideoServicesData();
  }, [fetchVideoServicesData]);

  const activeCalls = videoAppointments.filter(
    (a) =>
      a.status &&
      !['complete', 'completed', 'cancel', 'cancelled'].includes(String(a.status).toLowerCase())
  );

  const completedCalls = videoAppointments.filter(
    (a) =>
      a.status &&
      ['complete', 'completed'].includes(String(a.status).toLowerCase())
  );

  return {
    walletBalance,
    videoAppointments,
    activeCalls,
    completedCalls,
    transactions,
    loading,
    error,
    refreshVideoServices: fetchVideoServicesData,
  };
};

export default useVideoServices;
