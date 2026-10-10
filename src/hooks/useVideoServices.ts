import { useCallback, useEffect, useMemo, useState } from 'react';
import { Appointment } from '../types/clinicTypes';
import {
  confirmVideoPaymentApi,
  getPatientWalletBalanceApi,
  getVideoAppointmentsApi,
  getVideoBillsApi,
  getVideoPaymentSessionsApi,
  VideoCallBill,
  VideoPaymentSession,
} from '../api/videoServicesApi';

function rowsFrom<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && Array.isArray((value as any).data)) return (value as any).data as T[];
  if (value && typeof value === 'object' && Array.isArray((value as any).appointments)) return (value as any).appointments as T[];
  return [];
}

export function useVideoServices(token: string | null, clinicId?: number | string | null, patientMode = false) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bills, setBills] = useState<VideoCallBill[]>([]);
  const [sessions, setSessions] = useState<Record<string, VideoPaymentSession>>({});
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const refresh = useCallback(async (isRefresh = false) => {
    if (!token) { setLoading(false); return; }
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const appointmentResult = await getVideoAppointmentsApi(token, patientMode ? undefined : clinicId);
      if (!appointmentResult.success) throw new Error(appointmentResult.message || 'Unable to load video appointments.');
      const videoRows = rowsFrom<Appointment>(appointmentResult.data)
        .filter(item => String(item.consultation_mode || '').toLowerCase() === 'video')
        .sort((a, b) => new Date(`${b.appointment_date}T${b.appointment_time || '00:00:00'}`).getTime() - new Date(`${a.appointment_date}T${a.appointment_time || '00:00:00'}`).getTime());
      setAppointments(videoRows);

      const results = await Promise.all([
        patientMode ? getPatientWalletBalanceApi(token) : Promise.resolve(null),
        patientMode
          ? getVideoPaymentSessionsApi(token, videoRows.map(item => Number(item.id)))
          : getVideoBillsApi(token, clinicId),
      ]);
      const walletResult = results[0];
      if (walletResult) {
        if (walletResult.success) setWalletBalance(Number(walletResult.data?.balance || 0));
        else throw new Error(walletResult.message || 'Unable to load wallet balance.');
      }
      const secondResult = results[1];
      if (secondResult && !secondResult.success) throw new Error(secondResult.message || 'Unable to load video service records.');
      if (patientMode) {
        const sessionRows = rowsFrom<VideoPaymentSession>((secondResult as any)?.data);
        setSessions(Object.fromEntries(sessionRows.map(item => [String(item.appointment_id), item])));
      } else {
        setBills(rowsFrom<VideoCallBill>((secondResult as any)?.data));
      }
      setLastRefreshed(new Date());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load video services.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clinicId, patientMode, token]);

  useEffect(() => { refresh().catch(() => undefined); }, [refresh]);

  const videoAppointments = useMemo(() => appointments, [appointments]);
  const confirmPayment = useCallback(async (appointmentId: number, method: 'wallet' | 'upi' | 'card' | 'net_banking', reference?: string) => {
    if (!token) return { success: false, message: 'Please sign in again.' };
    const result = await confirmVideoPaymentApi(token, appointmentId, method, reference);
    if (result.success) await refresh(true);
    return result;
  }, [refresh, token]);

  return { appointments: videoAppointments, bills, sessions, walletBalance, loading, refreshing, error, lastRefreshed, refresh: () => refresh(true), confirmPayment, setWalletBalance };
}
