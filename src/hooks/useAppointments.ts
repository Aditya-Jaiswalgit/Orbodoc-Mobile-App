import { useCallback, useEffect, useState } from 'react';
import {
  getAppointmentsApi,
  bookAppointmentApi,
  cancelAppointmentApi,
  updateAppointmentStatusApi,
  getAvailableSlotsApi,
} from '../api/appointmentApi';
import { useAuthContext } from '../context/AuthContext';
import { Appointment } from '../types/clinicTypes';

export const useAppointments = () => {
  const { token } = useAuthContext();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAppointmentsApi(token);
      if (res.success && res.data) {
        const list = Array.isArray(res.data)
          ? res.data
          : (res.data as any)?.appointments || (res.data as any)?.data || [];
        setAppointments(list);
      } else {
        setError(res.message || 'Failed to fetch appointments');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading appointments');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const bookAppointment = async (appointmentData: Partial<Appointment>) => {
    if (!token) throw new Error('Authentication required');
    const res = await bookAppointmentApi(token, appointmentData);
    if (res.success) {
      fetchAppointments();
    }
    return res;
  };

  const updateAppointmentStatus = async (
    appointmentId: number,
    status: Appointment['status']
  ) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status } : a))
    );

    if (!token) return { success: true };
    try {
      const res = await updateAppointmentStatusApi(token, appointmentId, status);
      if (res.success) {
        fetchAppointments();
      }
      return res;
    } catch (err: any) {
      return { success: true };
    }
  };

  const cancelAppointment = async (appointmentId: number) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status: 'cancelled' } : a))
    );

    if (!token) return { success: true };
    try {
      const res = await cancelAppointmentApi(token, appointmentId);
      if (res.success) {
        fetchAppointments();
      }
      return res;
    } catch (err: any) {
      return { success: true };
    }
  };

  const fetchAvailableSlots = async (doctorId: number, date: string) => {
    if (!token) return [];
    const res = await getAvailableSlotsApi(token, doctorId, date);
    return res.success && Array.isArray(res.data) ? res.data : [];
  };

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return {
    appointments,
    loading,
    error,
    refreshAppointments: fetchAppointments,
    bookAppointment,
    updateAppointmentStatus,
    cancelAppointment,
    fetchAvailableSlots,
  };
};

export default useAppointments;
